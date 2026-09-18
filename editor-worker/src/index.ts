interface Env {
  SESSIONS: KVNamespace;
  SITE_ORIGINS: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REPOSITORY_ID: string;
  OWNER_GITHUB_ID: string;
  SESSION_ENCRYPTION_KEY: string;
  SAVES_WORKER_URL: string;
  SAVES_READ_TOKEN: string;
  SAVES_WRITE_TOKEN: string;
}

interface EditorSession {
  accessToken: string;
  refreshToken?: string;
  accessExpiresAt?: number;
  refreshExpiresAt?: number;
  login: string;
  avatarUrl: string;
}

interface OAuthState {
  state: string;
  returnTo: string;
  verifier: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

interface GitHubContent {
  type: string;
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
}

interface GitHubTree {
  truncated: boolean;
  tree: Array<{ path: string; type: string }>;
}

interface UpdateFileBody {
  path?: unknown;
  sha?: unknown;
  content?: unknown;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_CONTENT_BYTES = 1_000_000;
const GITHUB_API_VERSION = '2022-11-28';

function allowedOrigins(env: Env): string[] {
  return env.SITE_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function requestOrigin(request: Request): string {
  return request.headers.get('Origin') ?? '';
}

function isAllowedOrigin(request: Request, env: Env): boolean {
  return allowedOrigins(env).includes(requestOrigin(request));
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = requestOrigin(request);
  if (!allowedOrigins(env).includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(request: Request, env: Env, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

function randomToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function encryptionKey(env: Env): Promise<CryptoKey> {
  const key = base64UrlDecode(env.SESSION_ENCRYPTION_KEY.trim());
  if (key.byteLength !== 32) throw new Error('SESSION_ENCRYPTION_KEY must contain 32 bytes.');
  return crypto.subtle.importKey('raw', asArrayBuffer(key), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function seal(env: Env, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(env),
    encoder.encode(JSON.stringify(value)),
  );
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

async function open<T>(env: Env, value: string | null): Promise<T | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asArrayBuffer(base64UrlDecode(parts[1])) },
      await encryptionKey(env),
      asArrayBuffer(base64UrlDecode(parts[2])),
    );
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch {
    return null;
  }
}

function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    cookies.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  return cookies;
}

function sessionId(request: Request): string | null {
  const authorization = request.headers.get('Authorization') ?? '';
  const match = authorization.match(/^Session ([A-Za-z0-9_-]{40,})$/);
  return match?.[1] ?? null;
}

function validReturnTo(raw: string | null, env: Env): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return allowedOrigins(env).includes(url.origin) ? url.toString() : null;
  } catch {
    return null;
  }
}

function validContentPath(path: string): boolean {
  if (path.length > 220 || !path.startsWith('content/') || !path.endsWith('.md')) return false;
  const segments = path.slice('content/'.length, -'.md'.length).split('/');
  return segments.every((segment) => /^(?:_index|[a-z0-9][a-z0-9_-]*)$/.test(segment));
}

function encodedPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function utf8ToBase64(value: string): string {
  const bytes = encoder.encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToUtf8(value: string): string {
  const compact = value.replace(/\s/g, '');
  const binary = atob(compact);
  return decoder.decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function github<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'swappysh-site-editor',
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    const status = response.status === 401 ? 401
      : response.status === 404 ? 404
      : response.status === 409 || response.status === 422 ? 409
      : 502;
    throw new HttpError(status, data.message ?? 'GitHub rejected the request.');
  }
  return data as T;
}

async function savesApi<T>(
  env: Env,
  path: string,
  init: RequestInit = {},
  write = false,
): Promise<T> {
  const response = await fetch(`${env.SAVES_WORKER_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${write ? env.SAVES_WRITE_TOKEN : env.SAVES_READ_TOKEN}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    const status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw new HttpError(status, data.error ?? 'The saves service rejected the request.');
  }
  return data as T;
}

async function exchangeToken(
  env: Env,
  parameters: Record<string, string>,
): Promise<GitHubTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    ...parameters,
  });
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const token = await response.json() as GitHubTokenResponse;
  if (!response.ok || !token.access_token) {
    console.error(JSON.stringify({
      event: 'github_token_exchange_failed',
      status: response.status,
      code: token.error ?? 'missing_access_token',
    }));
    throw new HttpError(401, token.error_description ?? token.error ?? 'GitHub sign-in failed.');
  }
  return token;
}

function sessionFromToken(token: GitHubTokenResponse, user: GitHubUser): EditorSession {
  const now = Date.now();
  return {
    accessToken: token.access_token!,
    refreshToken: token.refresh_token,
    accessExpiresAt: token.expires_in ? now + token.expires_in * 1000 : undefined,
    refreshExpiresAt: token.refresh_token_expires_in
      ? now + token.refresh_token_expires_in * 1000
      : undefined,
    login: user.login,
    avatarUrl: user.avatar_url,
  };
}

async function writeSession(env: Env, id: string, session: EditorSession): Promise<void> {
  await env.SESSIONS.put(`session:${id}`, await seal(env, session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

async function authenticatedSession(
  request: Request,
  env: Env,
): Promise<{ id: string; value: EditorSession } | null> {
  const id = sessionId(request);
  if (!id) return null;
  const session = await open<EditorSession>(env, await env.SESSIONS.get(`session:${id}`));
  if (!session) return null;

  if (session.accessExpiresAt && session.accessExpiresAt < Date.now() + 5 * 60 * 1000) {
    if (!session.refreshToken || (session.refreshExpiresAt && session.refreshExpiresAt <= Date.now())) {
      await env.SESSIONS.delete(`session:${id}`);
      return null;
    }
    try {
      const refreshed = await exchangeToken(env, {
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      });
      session.accessToken = refreshed.access_token!;
      session.refreshToken = refreshed.refresh_token ?? session.refreshToken;
      session.accessExpiresAt = refreshed.expires_in
        ? Date.now() + refreshed.expires_in * 1000
        : undefined;
      session.refreshExpiresAt = refreshed.refresh_token_expires_in
        ? Date.now() + refreshed.refresh_token_expires_in * 1000
        : session.refreshExpiresAt;
      await writeSession(env, id, session);
    } catch {
      await env.SESSIONS.delete(`session:${id}`);
      return null;
    }
  }
  return { id, value: session };
}

async function startAuthentication(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const returnTo = validReturnTo(url.searchParams.get('return_to'), env);
  if (!returnTo) return new Response('Invalid return URL.', { status: 400 });

  const state = randomToken();
  const verifier = randomToken(48);
  const challenge = base64UrlEncode(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
  const oauthState: OAuthState = { state, returnTo, verifier };
  const oauthCookie = await seal(env, oauthState);

  const authorization = new URL('https://github.com/login/oauth/authorize');
  authorization.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorization.searchParams.set('redirect_uri', `${url.origin}/auth/callback`);
  authorization.searchParams.set('state', state);
  authorization.searchParams.set('code_challenge', challenge);
  authorization.searchParams.set('code_challenge_method', 'S256');

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorization.toString(),
      'Set-Cookie': `editor_oauth=${oauthCookie}; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=600`,
      'Cache-Control': 'no-store',
    },
  });
}

async function finishAuthentication(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  const oauthCookie = parseCookies(request).get('editor_oauth') ?? '';
  const stored = await open<OAuthState>(env, oauthCookie);

  if (!state || !code || state !== stored?.state) {
    return new Response('The sign-in request expired. Start again from the site.', { status: 400 });
  }

  const returnTo = new URL(stored.returnTo);
  try {
    const token = await exchangeToken(env, {
      code,
      code_verifier: stored.verifier,
      redirect_uri: `${url.origin}/auth/callback`,
      repository_id: env.GITHUB_REPOSITORY_ID,
    });
    const user = await github<GitHubUser>('https://api.github.com/user', token.access_token!);
    if (String(user.id) !== env.OWNER_GITHUB_ID) throw new HttpError(403, 'This key does not open the editor.');

    const id = randomToken(48);
    await writeSession(env, id, sessionFromToken(token, user));
    returnTo.searchParams.set('edit', '1');
    returnTo.hash = new URLSearchParams({ editor_session: id }).toString();
  } catch (error) {
    const reason = error instanceof HttpError
      ? `http_${error.status}`
      : error instanceof Error
        ? error.name
        : 'unknown';
    console.error(JSON.stringify({ event: 'oauth_callback_failed', reason }));
    returnTo.searchParams.set('edit_error', 'access_denied');
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: returnTo.toString(),
      'Set-Cookie': 'editor_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=0',
      'Cache-Control': 'no-store',
    },
  });
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  if (!isAllowedOrigin(request, env)) return json(request, env, { error: 'Origin not allowed.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });

  const url = new URL(request.url);
  const authenticated = await authenticatedSession(request, env);
  if (url.pathname === '/api/session' && request.method === 'GET') {
    return json(request, env, authenticated
      ? { authenticated: true, login: authenticated.value.login, avatarUrl: authenticated.value.avatarUrl }
      : { authenticated: false });
  }
  if (!authenticated) return json(request, env, { error: 'Your editor session has expired.' }, 401);

  if (url.pathname === '/api/logout' && request.method === 'POST') {
    await env.SESSIONS.delete(`session:${authenticated.id}`);
    return json(request, env, { locked: true });
  }

  if (url.pathname === '/api/saves/tags' && request.method === 'GET') {
    return json(request, env, await savesApi<{ tags: string[] }>(env, '/api/tags'));
  }

  if (url.pathname === '/api/saves/tags' && request.method === 'POST') {
    const body = await request.text();
    return json(request, env, await savesApi<{ tag: string }>(
      env,
      '/api/tags',
      { method: 'POST', body },
      true,
    ), 201);
  }

  const saveItemMatch = url.pathname.match(/^\/api\/saves\/item\/([a-zA-Z0-9]+)$/);
  if (saveItemMatch && request.method === 'PATCH') {
    const body = await request.text();
    return json(request, env, await savesApi<unknown>(
      env,
      `/api/item/${saveItemMatch[1]}`,
      { method: 'PATCH', body },
      true,
    ));
  }

  if (url.pathname === '/api/files' && request.method === 'GET') {
    const tree = await github<GitHubTree>(
      `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/git/trees/${encodeURIComponent(env.GITHUB_BRANCH)}?recursive=1`,
      authenticated.value.accessToken,
    );
    if (tree.truncated) throw new HttpError(502, 'GitHub returned an incomplete content list.');
    const files = tree.tree
      .filter((entry) => entry.type === 'blob' && validContentPath(entry.path))
      .map((entry) => entry.path)
      .sort();
    return json(request, env, { files });
  }

  if (url.pathname === '/api/file' && request.method === 'GET') {
    const path = url.searchParams.get('path') ?? '';
    if (!validContentPath(path)) throw new HttpError(400, 'That content path is not editable.');
    const file = await github<GitHubContent>(
      `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${encodedPath(path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
      authenticated.value.accessToken,
    );
    if (file.type !== 'file' || file.encoding !== 'base64' || !file.content) {
      throw new HttpError(404, 'Content file not found.');
    }
    return json(request, env, { path: file.path, sha: file.sha, content: base64ToUtf8(file.content) });
  }

  if (url.pathname === '/api/file' && request.method === 'PUT') {
    let body: UpdateFileBody;
    try {
      body = await request.json() as UpdateFileBody;
    } catch {
      throw new HttpError(400, 'Invalid JSON body.');
    }
    if (typeof body.path !== 'string' || !validContentPath(body.path)) {
      throw new HttpError(400, 'That content path is not editable.');
    }
    if (typeof body.content !== 'string' || encoder.encode(body.content).byteLength > MAX_CONTENT_BYTES) {
      throw new HttpError(400, 'Content must be a Markdown file smaller than 1 MB.');
    }
    if (body.sha !== undefined && typeof body.sha !== 'string') {
      throw new HttpError(400, 'Invalid file revision.');
    }

    const name = body.path.split('/').pop()!.replace(/\.md$/, '');
    const payload: Record<string, string> = {
      message: `${body.sha ? 'docs(content): update' : 'docs(content): create'} ${name}`,
      branch: env.GITHUB_BRANCH,
      content: utf8ToBase64(body.content),
    };
    if (body.sha) payload.sha = body.sha;

    const updated = await github<{ content: { sha: string }; commit: { sha: string; html_url: string } }>(
      `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${encodedPath(body.path)}`,
      authenticated.value.accessToken,
      { method: 'PUT', body: JSON.stringify(payload) },
    );
    return json(request, env, {
      path: body.path,
      sha: updated.content.sha,
      commit: updated.commit.sha,
      commitUrl: updated.commit.html_url,
    });
  }

  return json(request, env, { error: 'Not found.' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/auth/start' && request.method === 'GET') {
        return await startAuthentication(request, env);
      }
      if (url.pathname === '/auth/callback' && request.method === 'GET') {
        return await finishAuthentication(request, env);
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env);
      return new Response('Not found.', { status: 404 });
    } catch (error) {
      if (error instanceof HttpError) return json(request, env, { error: error.message }, error.status);
      return json(request, env, { error: 'Unexpected editor error.' }, 500);
    }
  },
};
