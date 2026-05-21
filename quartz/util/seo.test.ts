import assert from "node:assert"
import test, { describe } from "node:test"
import { GlobalConfiguration } from "../cfg"
import { FilePath, FullSlug } from "./path"
import {
  absoluteUrl,
  isSeoIndexableSlug,
  normalizeBaseUrl,
  openGraphType,
  shouldNoindexPage,
} from "./seo"

const cfg = {
  baseUrl: "https://mhsj.me/",
} as GlobalConfiguration

describe("seo helpers", () => {
  test("normalizes baseUrl before composing absolute URLs", () => {
    assert.strictEqual(normalizeBaseUrl(cfg.baseUrl), "mhsj.me")
    assert.strictEqual(absoluteUrl(cfg, "index" as FullSlug), "https://mhsj.me/")
    assert.strictEqual(
      absoluteUrl(cfg, "essays/01 Agentic Asset Loop" as FullSlug),
      "https://mhsj.me/essays/01%20Agentic%20Asset%20Loop",
    )
  })

  test("indexes only home and original content slugs", () => {
    assert(isSeoIndexableSlug("index"))
    assert(isSeoIndexableSlug("essays/01-Agentic-Asset-Loop"))
    assert(!isSeoIndexableSlug("reading-notes/About-Cursor-Docs"))
    assert(!isSeoIndexableSlug("tags/Agent-First"))
  })

  test("marks non-indexable pages as noindex", () => {
    assert(!shouldNoindexPage({ slug: "index" as FullSlug }))
    assert(!shouldNoindexPage({ slug: "essays/01-Agentic-Asset-Loop" as FullSlug }))
    assert(shouldNoindexPage({ slug: "reading-notes/About-Cursor-Docs" as FullSlug }))
    assert(shouldNoindexPage({ slug: "404" as FullSlug }))
  })

  test("uses article og type only for original content pages", () => {
    assert.strictEqual(openGraphType({ slug: "index" as FullSlug }), "website")
    assert.strictEqual(
      openGraphType({
        slug: "essays/01-Agentic-Asset-Loop" as FullSlug,
        filePath: "content/essays/01-Agentic-Asset-Loop.md" as FilePath,
      }),
      "article",
    )
    assert.strictEqual(
      openGraphType({
        slug: "reading-notes/About-Cursor-Docs" as FullSlug,
        filePath: "content/reading-notes/About Cursor Docs.md" as FilePath,
      }),
      "website",
    )
  })
})
