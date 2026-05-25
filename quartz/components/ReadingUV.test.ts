import assert from "node:assert"
import test, { describe } from "node:test"
import { getLocalReadingUVCount, isLocalReadingUVHost } from "./ReadingUVLocal"
import { shouldShowReadingUVForSlug } from "./ReadingUVVisibility"

describe("ReadingUV visibility", () => {
  test("shows on normal article pages", () => {
    assert.strictEqual(shouldShowReadingUVForSlug("essays/agentic-asset-loop"), true)
  })

  test("hides on home, tag, error, and index pages", () => {
    assert.strictEqual(shouldShowReadingUVForSlug("index"), false)
    assert.strictEqual(shouldShowReadingUVForSlug("404"), false)
    assert.strictEqual(shouldShowReadingUVForSlug("tags/Agent-First"), false)
    assert.strictEqual(shouldShowReadingUVForSlug("essays/index"), false)
  })
})

describe("ReadingUV local preview fallback", () => {
  test("uses fake data on local preview hosts", () => {
    assert.strictEqual(isLocalReadingUVHost("localhost"), true)
    assert.strictEqual(isLocalReadingUVHost("127.0.0.1"), true)
    assert.strictEqual(isLocalReadingUVHost("mhsj.me"), false)
  })

  test("returns a stable fake read count for local previews", () => {
    assert.strictEqual(getLocalReadingUVCount(), 1)
  })
})
