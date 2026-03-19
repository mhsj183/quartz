import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { Options, CachedSummary } from "./types"
import { normalizeSummary } from "./utils"

export const CACHE_VERSION = 1
export const SUMMARY_CACHE_ROOT = path.join(process.cwd(), ".quartz-cache", "zhipu-summary")

export function getCacheFilePath(slug: string): string {
  const slugHash = createHash("sha256").update(slug).digest("hex")
  return path.join(SUMMARY_CACHE_ROOT, `${slugHash}.json`)
}

export function createSummarySignature(
  opts: Options,
  title: string,
  text: string,
  imageUrls: string[],
): string {
  const signaturePayload = JSON.stringify({
    model: opts.model,
    endpoint: opts.endpoint,
    maxSummaryChars: opts.maxSummaryChars,
    maxInputChars: opts.maxInputChars,
    title,
    text,
    imageUrls,
  })
  return createHash("sha256").update(signaturePayload).digest("hex")
}

export async function readSummaryCache(
  slug: string,
  signature: string,
  maxSummaryChars: number,
): Promise<string | null> {
  const cachePath = getCacheFilePath(slug)
  try {
    const raw = await readFile(cachePath, "utf8")
    const parsed = JSON.parse(raw) as Partial<CachedSummary>
    if (
      parsed.version !== CACHE_VERSION ||
      parsed.slug !== slug ||
      parsed.signature !== signature ||
      typeof parsed.summary !== "string"
    ) {
      return null
    }
    return normalizeSummary(parsed.summary, maxSummaryChars)
  } catch {
    return null
  }
}

export async function writeSummaryCache(slug: string, signature: string, summary: string): Promise<void> {
  const cachePath = getCacheFilePath(slug)
  const payload: CachedSummary = {
    version: CACHE_VERSION,
    slug,
    signature,
    summary,
    updatedAt: new Date().toISOString(),
  }
  await mkdir(path.dirname(cachePath), { recursive: true })
  await writeFile(cachePath, JSON.stringify(payload), "utf8")
}
