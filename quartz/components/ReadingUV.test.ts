import assert from "node:assert"
import test, { describe } from "node:test"
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
