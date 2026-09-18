interface SaveItem {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  source: string;
  type: 'tweet' | 'video' | 'article' | 'other';
  tags?: string[];
  created_at: string;
}

interface Env {
  saves: KVNamespace;
  WRITE_SECRET: string;
  READ_SECRET: string;
  ENVIRONMENT: string;
}

interface SaveBody {
  url: string;
  title: string;
  source?: string;
  timestamp?: string;
  tags?: unknown;
}

interface UpdateSaveBody {
  title?: string;
  excerpt?: string;
  tags?: unknown;
}

interface ListResponse {
  items: SaveItem[];
  total: number;
  limit: number;
  offset: number;
}

function inferType(url: string): SaveItem['type'] {
  try {
    const { hostname } = new URL(url);
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'tweet';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'video';
    return 'article';
  } catch {
    return 'other';
  }
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };
}

function json(data: unknown, status = 200, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function unauthorized(cors: Record<string, string>): Response {
  return json({ error: 'Unauthorized' }, 401, cors);
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

function normalizeTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const tag = value.trim().toLowerCase().replace(/^#+/, '').trim().replace(/\s+/g, ' ');
  if (!tag || tag.length > 40 || /[,\u0000-\u001f\u007f]/.test(tag)) return null;
  return tag;
}

function normalizeTags(values: unknown): string[] | null {
  if (!Array.isArray(values)) return null;
  const tags: string[] = [];
  for (const value of values) {
    const tag = normalizeTag(value);
    if (tag === null) return null;
    tags.push(tag);
  }
  const unique = [...new Set(tags)];
  return unique.length <= 20 ? unique : null;
}

async function addTagsToIndex(env: Env, tags: string[]): Promise<void> {
  if (tags.length === 0) return;
  const raw = await env.saves.get('index:tags');
  const existing = raw ? (JSON.parse(raw) as string[]) : [];
  const next = [...new Set([...existing, ...tags])].sort();
  await env.saves.put('index:tags', JSON.stringify(next));
}

async function urlHash(url: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchTweetExcerpt(tweetUrl: string): Promise<string> {
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`,
    );
    if (!res.ok) return '';
    const data = (await res.json()) as { html?: string };
    if (!data.html) return '';
    const match = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (!match) return '';
    return match[1]
      .replace(/<a[^>]*href="https?:\/\/t\.co\/[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

async function backfillExcerpts(items: SaveItem[], env: Env): Promise<void> {
  for (const item of items) {
    const excerpt = await fetchTweetExcerpt(item.url);
    await env.saves.put(`item:${item.id}`, JSON.stringify({ ...item, excerpt: excerpt || ' ' }));
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim();

    // POST /api/save
    if (request.method === 'POST' && url.pathname === '/api/save') {
      if (token !== env.WRITE_SECRET) return unauthorized(cors);

      let body: SaveBody;
      try {
        body = (await request.json()) as SaveBody;
      } catch {
        return json({ error: 'Invalid JSON' }, 400, cors);
      }

      if (!body.url || !body.title) {
        return json({ error: 'url and title are required' }, 400, cors);
      }

      const tags = body.tags === undefined ? [] : normalizeTags(body.tags);
      if (tags === null) {
        return json({ error: 'tags must be an array of valid tag names' }, 400, cors);
      }

      const hash = await urlHash(body.url);
      const existingId = await env.saves.get(`url-idx:${hash}`);
      if (existingId) return json({ error: 'Already saved', id: existingId }, 409, cors);

      const id = generateId();
      const type = inferType(body.url);
      const item: SaveItem = {
        id,
        url: body.url,
        title: body.title,
        excerpt: type === 'tweet' ? await fetchTweetExcerpt(body.url) : '',
        source: body.source ?? 'shortcut',
        type,
        tags,
        created_at: body.timestamp ?? new Date().toISOString(),
      };

      // Note: read-modify-write on index:all is safe with a single writer (iPhone)
      await env.saves.put(`item:${id}`, JSON.stringify(item));
      await env.saves.put(`url-idx:${hash}`, id);

      const raw = await env.saves.get('index:all');
      const index: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      index.unshift(id);
      await env.saves.put('index:all', JSON.stringify(index));
      await addTagsToIndex(env, tags);

      return json(item, 201, cors);
    }

    // GET /api/list
    if (request.method === 'GET' && url.pathname === '/api/list') {
      if (token !== env.READ_SECRET) return unauthorized(cors);

      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 200);
      const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

      const raw = await env.saves.get('index:all');
      const index: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      const page = index.slice(offset, offset + limit);

      const items = (
        await Promise.all(page.map((id) => env.saves.get(`item:${id}`, 'json')))
      ).filter((item): item is SaveItem => item !== null);

      const response: ListResponse = { items, total: index.length, limit, offset };
      const toBackfill = items.filter((i) => i.type === 'tweet' && !i.excerpt.trim());
      if (toBackfill.length > 0) ctx.waitUntil(backfillExcerpts(toBackfill, env));
      return json(response, 200, cors);
    }

    // GET /api/tags
    if (request.method === 'GET' && url.pathname === '/api/tags') {
      if (token !== env.READ_SECRET && token !== env.WRITE_SECRET) return unauthorized(cors);
      const raw = await env.saves.get('index:tags');
      const tags: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      return json({ tags }, 200, cors);
    }

    // POST /api/tags
    if (request.method === 'POST' && url.pathname === '/api/tags') {
      if (token !== env.WRITE_SECRET) return unauthorized(cors);
      let body: { name?: unknown };
      try {
        body = (await request.json()) as { name?: unknown };
      } catch {
        return json({ error: 'Invalid JSON' }, 400, cors);
      }
      const tag = normalizeTag(body.name);
      if (!tag) return json({ error: 'name must be a valid tag' }, 400, cors);
      await addTagsToIndex(env, [tag]);
      return json({ tag }, 201, cors);
    }

    // PATCH /api/item/:id
    const itemMatch = url.pathname.match(/^\/api\/item\/([a-zA-Z0-9]+)$/);
    if (request.method === 'PATCH' && itemMatch) {
      if (token !== env.WRITE_SECRET) return unauthorized(cors);

      let body: UpdateSaveBody;
      try {
        body = (await request.json()) as UpdateSaveBody;
      } catch {
        return json({ error: 'Invalid JSON' }, 400, cors);
      }

      const hasTitle = 'title' in body;
      const hasExcerpt = 'excerpt' in body;
      const hasTags = 'tags' in body;
      if (!hasTitle && !hasExcerpt && !hasTags) {
        return json({ error: 'title, excerpt, or tags is required' }, 400, cors);
      }

      if ((hasTitle && typeof body.title !== 'string') || (hasExcerpt && typeof body.excerpt !== 'string')) {
        return json({ error: 'title and excerpt must be strings' }, 400, cors);
      }
      const tags = hasTags ? normalizeTags(body.tags) : null;
      if (hasTags && tags === null) {
        return json({ error: 'tags must be an array of valid tag names' }, 400, cors);
      }

      const id = itemMatch[1];
      const existing = await env.saves.get(`item:${id}`, 'json') as SaveItem | null;
      if (!existing) return json({ error: 'Not found' }, 404, cors);

      const newTitle = typeof body.title === 'string' ? body.title.trim() : existing.title;
      if (!newTitle) {
        return json({ error: 'title cannot be empty' }, 400, cors);
      }

      const item: SaveItem = {
        ...existing,
        title: newTitle,
      };
      if (typeof body.excerpt === 'string') item.excerpt = body.excerpt;
      if (tags !== null) item.tags = tags;

      await env.saves.put(`item:${id}`, JSON.stringify(item));
      if (tags) await addTagsToIndex(env, tags);
      return json(item, 200, cors);
    }

    // DELETE /api/item/:id
    if (request.method === 'DELETE' && itemMatch) {
      if (token !== env.WRITE_SECRET) return unauthorized(cors);

      const id = itemMatch[1];
      const itemRaw = await env.saves.get(`item:${id}`, 'json') as SaveItem | null;
      if (itemRaw) {
        const hash = await urlHash(itemRaw.url);
        await env.saves.delete(`url-idx:${hash}`);
      }
      await env.saves.delete(`item:${id}`);

      const raw = await env.saves.get('index:all');
      if (raw) {
        const index: string[] = JSON.parse(raw) as string[];
        await env.saves.put('index:all', JSON.stringify(index.filter((i) => i !== id)));
      }

      return json({ deleted: id }, 200, cors);
    }

    return json({ error: 'Not found' }, 404, cors);
  },
};
