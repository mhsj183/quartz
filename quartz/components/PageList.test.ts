import test, { describe } from "node:test"
import assert from "node:assert"
import { byDateAndAlphabeticalFolderFirst } from "./PageList"
import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"

const cfg = {
  defaultDateType: "modified",
  locale: "en-US",
} as GlobalConfiguration

describe("byDateAndAlphabeticalFolderFirst", () => {
  test("sorts articles by frontmatter 发布日期 descending before configured date type", () => {
    const olderPublishedNewerModified = {
      slug: "notes/older-published" as QuartzPluginData["slug"],
      frontmatter: {
        title: "Older published",
        发布日期: "2025-01-01",
      },
      dates: {
        created: new Date("2025-01-01T00:00:00.000Z"),
        modified: new Date("2026-01-01T00:00:00.000Z"),
        published: new Date("2025-01-01T00:00:00.000Z"),
      },
    } as QuartzPluginData

    const newerPublishedOlderModified = {
      slug: "notes/newer-published" as QuartzPluginData["slug"],
      frontmatter: {
        title: "Newer published",
        发布日期: "2025-12-01",
      },
      dates: {
        created: new Date("2025-12-01T00:00:00.000Z"),
        modified: new Date("2025-02-01T00:00:00.000Z"),
        published: new Date("2025-12-01T00:00:00.000Z"),
      },
    } as QuartzPluginData

    const sorted = [olderPublishedNewerModified, newerPublishedOlderModified].sort(
      byDateAndAlphabeticalFolderFirst(cfg),
    )

    assert.deepStrictEqual(
      sorted.map((page) => page.frontmatter?.title),
      ["Newer published", "Older published"],
    )
  })

  test("places articles without frontmatter 发布日期 after articles with one", () => {
    const withoutPublishedDate = {
      slug: "notes/without-published-date" as QuartzPluginData["slug"],
      frontmatter: {
        title: "Without published date",
      },
      dates: {
        created: new Date("2026-01-01T00:00:00.000Z"),
        modified: new Date("2026-01-01T00:00:00.000Z"),
        published: new Date("2026-01-01T00:00:00.000Z"),
      },
    } as QuartzPluginData

    const withPublishedDate = {
      slug: "notes/with-published-date" as QuartzPluginData["slug"],
      frontmatter: {
        title: "With published date",
        发布日期: "2025-01-01",
      },
      dates: {
        created: new Date("2025-01-01T00:00:00.000Z"),
        modified: new Date("2025-01-01T00:00:00.000Z"),
        published: new Date("2025-01-01T00:00:00.000Z"),
      },
    } as QuartzPluginData

    const sorted = [withoutPublishedDate, withPublishedDate].sort(
      byDateAndAlphabeticalFolderFirst(cfg),
    )

    assert.deepStrictEqual(
      sorted.map((page) => page.frontmatter?.title),
      ["With published date", "Without published date"],
    )
  })
})
