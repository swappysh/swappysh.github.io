interface SaveItem {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  source: string;
  type: 'tweet' | 'video' | 'article' | 'other';
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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

      const id = generateId();
      const type = inferType(body.url);
      const item: SaveItem = {
        id,
        url: body.url,
        title: body.title,
        excerpt: type === 'tweet' ? await fetchTweetExcerpt(body.url) : '',
        source: body.source ?? 'shortcut',
        type,
        created_at: body.timestamp ?? new Date().toISOString(),
      };

      // Note: read-modify-write on index:all is safe with a single writer (iPhone)
      await env.saves.put(`item:${id}`, JSON.stringify(item));

      const raw = await env.saves.get('index:all');
      const index: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      index.unshift(id);
      await env.saves.put('index:all', JSON.stringify(index));

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
      const toBackfill = items.filter((i) => i.type === 'tweet' && !i.excerpt);
      if (toBackfill.length > 0) ctx.waitUntil(backfillExcerpts(toBackfill, env));
      return json(response, 200, cors);
    }

    // DELETE /api/item/:id
    const deleteMatch = url.pathname.match(/^\/api\/item\/([a-zA-Z0-9]+)$/);
    if (request.method === 'DELETE' && deleteMatch) {
      if (token !== env.WRITE_SECRET) return unauthorized(cors);

      const id = deleteMatch[1];
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
