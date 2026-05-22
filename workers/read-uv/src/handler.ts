export interface D1Result {
  success?: boolean
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike
  run(): Promise<D1Result>
  first<T = Record<string, unknown>>(): Promise<T | null>
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike
}

export interface ReadUvEnv {
  READ_UV_DB: D1DatabaseLike
  VISITOR_SALT: string
  ALLOWED_HOST?: string
}

type ViewsPayload = {
  path?: unknown
  vid?: unknown
}

const API_PATH = "/api/views"
const DEFAULT_ALLOWED_HOST = "mhsj.me"
const MAX_PATH_LENGTH = 512
const MAX_VISITOR_ID_LENGTH = 256
const BOT_UA_PATTERN = /bot|crawler|spider|preview|facebookexternalhit|slackbot|twitterbot/i

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
}

function withCorsHeaders(headers: HeadersInit = {}) {
  return {
    ...jsonHeaders,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    ...headers,
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders(),
  })
}

function isAllowedRequest(request: Request, allowedHost: string) {
  const requestUrl = new URL(request.url)
  if (requestUrl.hostname !== allowedHost) {
    return false
  }

  const origin = request.headers.get("origin")
  if (!origin) {
    return true
  }

  try {
    return new URL(origin).hostname === allowedHost
  } catch {
    return false
  }
}

export function validateArticlePath(path: unknown): string | undefined {
  if (typeof path !== "string") {
    return undefined
  }

  const trimmed = path.trim()
  if (
    !trimmed.startsWith("/") ||
    trimmed.length === 0 ||
    trimmed.length > MAX_PATH_LENGTH ||
    trimmed.startsWith(API_PATH)
  ) {
    return undefined
  }

  return trimmed
}

function validateVisitorId(visitorId: unknown): string | undefined {
  if (typeof visitorId !== "string") {
    return undefined
  }

  const trimmed = visitorId.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_VISITOR_ID_LENGTH) {
    return undefined
  }

  return trimmed
}

function isBotRequest(request: Request) {
  return BOT_UA_PATTERN.test(request.headers.get("user-agent") ?? "")
}

async function hashVisitor(salt: string, path: string, visitorId: string) {
  const data = new TextEncoder().encode(`${salt}:${path}:${visitorId}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function countVisitors(env: ReadUvEnv, path: string) {
  const row = await env.READ_UV_DB.prepare("SELECT COUNT(*) AS uv FROM article_uv WHERE path = ?")
    .bind(path)
    .first<{ uv: number }>()

  return Number(row?.uv ?? 0)
}

async function recordVisitor(env: ReadUvEnv, path: string, visitorId: string) {
  const visitorHash = await hashVisitor(env.VISITOR_SALT, path, visitorId)
  await env.READ_UV_DB.prepare(
    "INSERT OR IGNORE INTO article_uv (path, visitor_hash) VALUES (?, ?)",
  )
    .bind(path, visitorHash)
    .run()
}

async function readPostPayload(request: Request): Promise<ViewsPayload | undefined> {
  try {
    const payload = (await request.json()) as ViewsPayload
    return payload && typeof payload === "object" ? payload : undefined
  } catch {
    return undefined
  }
}

export async function handleViewsRequest(request: Request, env: ReadUvEnv): Promise<Response> {
  const url = new URL(request.url)
  const allowedHost = env.ALLOWED_HOST ?? DEFAULT_ALLOWED_HOST

  if (url.pathname !== API_PATH) {
    return jsonResponse({ error: "not_found" }, 404)
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withCorsHeaders(),
    })
  }

  if (!isAllowedRequest(request, allowedHost)) {
    return jsonResponse({ error: "forbidden" }, 403)
  }

  if (request.method === "GET") {
    const path = validateArticlePath(url.searchParams.get("path"))
    if (!path) {
      return jsonResponse({ error: "invalid_path" }, 400)
    }

    return jsonResponse({ path, uv: await countVisitors(env, path) })
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  const payload = await readPostPayload(request)
  const path = validateArticlePath(payload?.path)
  if (!path) {
    return jsonResponse({ error: "invalid_path" }, 400)
  }

  if (!isBotRequest(request)) {
    const visitorId = validateVisitorId(payload?.vid)
    if (!visitorId) {
      return jsonResponse({ error: "invalid_visitor" }, 400)
    }

    await recordVisitor(env, path, visitorId)
  }

  return jsonResponse({ path, uv: await countVisitors(env, path) })
}
