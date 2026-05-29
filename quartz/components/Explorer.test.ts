import test, { describe } from "node:test"
import assert from "node:assert"
import { readFileSync } from "node:fs"
import { sortExplorerNodes } from "./ExplorerSort"
import { FileTrieNode } from "../util/fileTrie"

type ExplorerTestData = {
  slug: string
  title: string
  filePath: string
  publishedDate?: string
}

describe("Explorer default sort", () => {
  test("sorts files by publishedDate descending before title", () => {
    const older = new FileTrieNode<ExplorerTestData>(["essays", "older"], {
      slug: "essays/older",
      title: "A older title",
      filePath: "essays/older.md",
      publishedDate: "2025-01-01T00:00:00.000Z",
    })
    const newer = new FileTrieNode<ExplorerTestData>(["essays", "newer"], {
      slug: "essays/newer",
      title: "Z newer title",
      filePath: "essays/newer.md",
      publishedDate: "2025-12-01T00:00:00.000Z",
    })

    assert.ok(sortExplorerNodes(newer, older) < 0)
    assert.ok(sortExplorerNodes(older, newer) > 0)
  })

  test("keeps folders before files", () => {
    const folder = new FileTrieNode<ExplorerTestData>(["essays"])
    folder.isFolder = true
    const file = new FileTrieNode<ExplorerTestData>(["essays", "article"], {
      slug: "essays/article",
      title: "Article",
      filePath: "essays/article.md",
      publishedDate: "2025-12-01T00:00:00.000Z",
    })

    assert.ok(sortExplorerNodes(folder, file) < 0)
    assert.ok(sortExplorerNodes(file, folder) > 0)
  })
})

describe("Explorer layout defaults", () => {
  test("opens all folders on page load instead of restoring collapsed state", () => {
    const layout = readFileSync("quartz.layout.ts", "utf8")
    const openWithoutSavedState =
      /Component\.Explorer\(\{\s*folderDefaultState:\s*"open",\s*useSavedState:\s*false,?\s*\}\)/g

    assert.strictEqual([...layout.matchAll(openWithoutSavedState)].length, 2)
  })
})
