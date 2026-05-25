import test, { describe } from "node:test"
import assert from "node:assert"
import { getFrontmatterPublishedDate, getArticleMetaDate } from "./Date"
import { GlobalConfiguration } from "../cfg"

const modifiedDateCfg = { defaultDateType: "modified" } as GlobalConfiguration

describe("getFrontmatterPublishedDate", () => {
  test("uses the md 发布日期 frontmatter field first", () => {
    const date = getFrontmatterPublishedDate({
      发布日期: new Date("2025-12-17T00:00:00.000Z"),
      published: new Date("2026-05-21T00:00:00.000Z"),
    })

    assert.strictEqual(date?.toISOString(), "2025-12-17T00:00:00.000Z")
  })

  test("supports string published frontmatter aliases", () => {
    const date = getFrontmatterPublishedDate({ published: "2026-05-21" })

    assert.strictEqual(date?.toISOString(), "2026-05-21T00:00:00.000Z")
  })

  test("does not invent a date when frontmatter has no publish date", () => {
    assert.strictEqual(getFrontmatterPublishedDate({ title: "No date" }), undefined)
  })
})

describe("getArticleMetaDate", () => {
  test("uses frontmatter 发布日期 before the configured modified date", () => {
    const date = getArticleMetaDate(modifiedDateCfg, {
      frontmatter: {
        title: "Published date wins",
        发布日期: "2026-05-21",
      },
      dates: {
        created: new Date("2026-05-20T00:00:00.000Z"),
        modified: new Date("2026-05-26T00:00:00.000Z"),
        published: new Date("2026-05-26T00:00:00.000Z"),
      },
    })

    assert.strictEqual(date?.toISOString(), "2026-05-21T00:00:00.000Z")
  })

  test("falls back to the configured date when no frontmatter publish date exists", () => {
    const date = getArticleMetaDate(modifiedDateCfg, {
      frontmatter: {
        title: "No publish date",
      },
      dates: {
        created: new Date("2026-05-20T00:00:00.000Z"),
        modified: new Date("2026-05-26T00:00:00.000Z"),
        published: new Date("2026-05-20T00:00:00.000Z"),
      },
    })

    assert.strictEqual(date?.toISOString(), "2026-05-26T00:00:00.000Z")
  })
})
