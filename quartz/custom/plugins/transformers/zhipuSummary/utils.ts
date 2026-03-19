import { Root as HtmlRoot, Element } from "hast"
import { visit } from "unist-util-visit"

export function clampTextByChars(input: string, maxChars: number): string {
  const chars = Array.from(input.trim())
  if (chars.length <= maxChars) return input.trim()
  return `${chars.slice(0, maxChars).join("")}...`
}

export function normalizeSummary(input: string, maxChars: number): string {
  const compact = input.replace(/\s+/g, " ").trim()
  return clampTextByChars(compact, maxChars)
}

export function isZhipuEndpoint(endpoint: string): boolean {
  try {
    const host = new URL(endpoint).hostname.toLowerCase()
    return host === "open.bigmodel.cn" || host.endsWith(".bigmodel.cn")
  } catch {
    return false
  }
}

export function shouldSkipNote(slug: string | undefined, skipIndexPages: boolean): boolean {
  if (!slug) return true
  if (skipIndexPages && (slug === "index" || slug.endsWith("/index"))) return true
  if (slug.startsWith("tags/")) return true
  return false
}

export function toAbsoluteImageUrl(baseUrl: string, slug: string | undefined, src: string): string | null {
  if (!src || src.startsWith("data:")) return null

  try {
    if (/^https?:\/\//i.test(src)) return src
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
    const pageBase = slug ? new URL(`${slug}/`, normalizedBase) : new URL(normalizedBase)
    return new URL(src, pageBase).toString()
  } catch {
    return null
  }
}

export function extractImageUrls(
  tree: HtmlRoot,
  baseUrl: string,
  slug: string | undefined,
  maxImages: number,
): string[] {
  const images: string[] = []
  visit(tree, "element", (node: Element) => {
    if (images.length >= maxImages) return
    if (node.tagName !== "img") return

    const rawSrc = node.properties?.src
    if (typeof rawSrc !== "string") return
    const absolute = toAbsoluteImageUrl(baseUrl, slug, rawSrc)
    if (!absolute) return
    images.push(absolute)
  })
  return images
}
