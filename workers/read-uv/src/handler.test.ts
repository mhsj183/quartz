import assert from "node:assert"
import test, { describe } from "node:test"
import { handleViewsRequest, ReadUvEnv } from "./handler"

class FakeD1Statement {
  private values: unknown[] = []

  constructor(
    private readonly db: FakeD1Database,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values
    return this
  }

  async run() {
    if (!this.query.startsWith("INSERT OR IGNORE INTO article_uv")) {
      throw new Error(`Unexpected run query: ${this.query}`)
    }

    const [path, visitorHash] = this.values as [string, string]
    this.db.record(path, visitorHash)
    return { success: true }
  }

  async first<T = Record<string, unknown>>() {
    if (!this.query.startsWith("SELECT COUNT(*) AS uv FROM article_uv")) {
      throw new Error(`Unexpected first query: ${this.query}`)
    }

    const [path] = this.values as [string]
    return { uv: this.db.count(path) } as T
  }
}

class FakeD1Database {
  private readonly rows = new Map<string, Set<string>>()

  prepare(query: string) {
    return new FakeD1Statement(this, query)
  }

  record(path: string, visitorHash: string) {
    const visitors = this.rows.get(path) ?? new Set<string>()
    visitors.add(visitorHash)
    this.rows.set(path, visitors)
  }

  count(path: string) {
    return this.rows.get(path)?.size ?? 0
  }
}

function makeEnv(): ReadUvEnv {
  return {
    READ_UV_DB: new FakeD1Database(),
    VISITOR_SALT: "test-salt",
    ALLOWED_HOST: "mhsj.me",
  }
}

function request(method: string, init?: { path?: string; vid?: string; userAgent?: string }) {
  const url = init?.path
    ? `https://mhsj.me/api/views?path=${encodeURIComponent(init.path)}`
    : "https://mhsj.me/api/views"

  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      "user-agent": init?.userAgent ?? "Mozilla/5.0",
      origin: "https://mhsj.me",
    },
    body:
      method === "POST"
        ? JSON.stringify({ path: init?.path ?? "/essays/demo", vid: init?.vid ?? "visitor-1" })
        : undefined,
  })
}

async function responseJson(response: Response) {
  return (await response.json()) as { path?: string; uv?: number; error?: string }
}

describe("read UV Worker handler", () => {
  test("counts the same visitor only once per article path", async () => {
    const env = makeEnv()

    const first = await handleViewsRequest(request("POST"), env)
    const second = await handleViewsRequest(request("POST"), env)

    assert.strictEqual(first.status, 200)
    assert.strictEqual(second.status, 200)
    assert.deepStrictEqual(await responseJson(first), { path: "/essays/demo", uv: 1 })
    assert.deepStrictEqual(await responseJson(second), { path: "/essays/demo", uv: 1 })
  })

  test("counts a new browser visitor for the same article", async () => {
    const env = makeEnv()

    await handleViewsRequest(request("POST", { vid: "visitor-1" }), env)
    const response = await handleViewsRequest(request("POST", { vid: "visitor-2" }), env)

    assert.deepStrictEqual(await responseJson(response), { path: "/essays/demo", uv: 2 })
  })

  test("reads UV without writing on GET", async () => {
    const env = makeEnv()

    await handleViewsRequest(request("POST", { path: "/essays/demo", vid: "visitor-1" }), env)
    const response = await handleViewsRequest(request("GET", { path: "/essays/demo" }), env)

    assert.deepStrictEqual(await responseJson(response), { path: "/essays/demo", uv: 1 })
  })

  test("rejects invalid paths", async () => {
    const env = makeEnv()

    const response = await handleViewsRequest(request("POST", { path: "/api/views" }), env)

    assert.strictEqual(response.status, 400)
    assert.strictEqual((await responseJson(response)).error, "invalid_path")
  })

  test("does not increment obvious bot requests", async () => {
    const env = makeEnv()

    await handleViewsRequest(request("POST", { vid: "human" }), env)
    const response = await handleViewsRequest(
      request("POST", { vid: "bot", userAgent: "Googlebot/2.1" }),
      env,
    )

    assert.deepStrictEqual(await responseJson(response), { path: "/essays/demo", uv: 1 })
  })
})
