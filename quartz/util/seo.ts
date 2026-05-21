import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { FullSlug, SimpleSlug, joinSegments, simplifySlug } from "./path"

const ORIGINAL_CONTENT_PREFIX = "essays/"
const SITE_AUTHOR = "mhsj"

export function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? "example.com").replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

export function siteOrigin(cfg: GlobalConfiguration): string {
  return `https://${normalizeBaseUrl(cfg.baseUrl)}`
}

export function absoluteUrl(cfg: GlobalConfiguration, slug: FullSlug | SimpleSlug): string {
  const base = normalizeBaseUrl(cfg.baseUrl)
  const simpleSlug = simplifySlug(slug as FullSlug)

  if (simpleSlug === "/") {
    return `https://${base}/`
  }

  return `https://${joinSegments(base, encodeURI(simpleSlug))}`
}

export function isSeoIndexableSlug(slug: FullSlug | string | undefined): boolean {
  return slug === "index" || slug?.startsWith(ORIGINAL_CONTENT_PREFIX) === true
}

export function shouldNoindexPage(fileData: QuartzPluginData): boolean {
  const slug = fileData.slug as FullSlug | undefined
  return slug === "404" || !isSeoIndexableSlug(slug)
}

export function openGraphType(fileData: QuartzPluginData): "article" | "website" {
  const slug = fileData.slug as FullSlug | undefined
  return slug && slug !== "index" && isSeoIndexableSlug(slug) && fileData.filePath
    ? "article"
    : "website"
}

function coerceDate(value: unknown): Date | undefined {
  if (value == null) return undefined

  const date =
    value instanceof globalThis.Date
      ? value
      : typeof value === "number"
        ? new globalThis.Date(value)
        : typeof value === "string" && value.trim()
          ? new globalThis.Date(value.trim())
          : undefined

  return date && !Number.isNaN(date.getTime()) ? date : undefined
}

/**
 * Extract article dates from frontmatter / file metadata.
 * Exported so Head.tsx can reuse the same logic for OG article:* tags.
 */
export function extractArticleDates(fileData: QuartzPluginData): {
  published: Date | undefined
  modified: Date | undefined
} {
  const dates = fileData.dates as
    | Partial<Record<"created" | "modified" | "published", Date>>
    | undefined
  const fm = fileData.frontmatter

  const published =
    coerceDate(fm?.published) ??
    coerceDate(fm?.["发布日期"]) ??
    coerceDate(dates?.published) ??
    coerceDate(dates?.created) ??
    coerceDate(dates?.modified)

  const modified =
    coerceDate(fm?.modified) ??
    coerceDate(fm?.["更新日期"]) ??
    coerceDate(dates?.modified) ??
    published

  return { published, modified }
}

export function buildJsonLd(
  cfg: GlobalConfiguration,
  fileData: QuartzPluginData,
  title: string,
  description: string,
  canonicalUrl: string,
  ogImageUrl?: string,
): object | object[] | undefined {
  const slug = fileData.slug as FullSlug | undefined
  const origin = siteOrigin(cfg)

  if (slug === "index") {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: cfg.pageTitle,
      url: canonicalUrl,
      description,
    }
  }

  if (!slug || !isSeoIndexableSlug(slug) || !fileData.filePath) {
    return undefined
  }

  const { published, modified } = extractArticleDates(fileData)
  const frontmatter = fileData.frontmatter
  const author =
    typeof frontmatter?.author === "string" && frontmatter.author.trim()
      ? frontmatter.author.trim()
      : SITE_AUTHOR

  // GEO-enhanced structured data
  const tags: string[] = Array.isArray(frontmatter?.tags) ? frontmatter.tags : []
  const wordCount =
    typeof fileData.text === "string" ? fileData.text.split(/\s+/).length : undefined

  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: canonicalUrl,
    inLanguage: cfg.locale ?? "zh-CN",
    datePublished: published?.toISOString(),
    dateModified: modified?.toISOString(),
    author: {
      "@type": "Person",
      name: author,
      url: `${origin}/`,
    },
    publisher: {
      "@type": "Organization",
      name: cfg.pageTitle,
      url: `${origin}/`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    isAccessibleForFree: true,
  }

  if (ogImageUrl) {
    article.image = {
      "@type": "ImageObject",
      url: ogImageUrl,
      width: 1200,
      height: 630,
    }
  }

  if (tags.length > 0) {
    article.keywords = tags.join(", ")
    article.about = tags.map((tag) => ({
      "@type": "Thing",
      name: tag,
    }))
  }

  if (wordCount && wordCount > 0) {
    article.wordCount = wordCount
  }

  // BreadcrumbList — helps AI engines understand site hierarchy
  const segments = slug.split("/")
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: cfg.pageTitle,
      item: `${origin}/`,
    },
  ]
  if (segments.length > 1) {
    // e.g. essays/some-article → add "此山之石" as mid-level
    const folderSlug = segments[0]
    const folderLabels: Record<string, string> = {
      essays: "此山之石",
      "reading-notes": "读书笔记",
    }
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: folderLabels[folderSlug] ?? folderSlug,
      item: `${origin}/${encodeURI(folderSlug)}/`,
    })
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: title,
      item: canonicalUrl,
    })
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: title,
      item: canonicalUrl,
    })
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  }

  return [article, breadcrumb]
}

export function jsonLdScriptContent(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
