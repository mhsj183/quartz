import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"
import { CustomOgImagesEmitterName } from "../plugins/emitters/ogImage"
import {
  absoluteUrl,
  buildJsonLd,
  extractArticleDates,
  jsonLdScriptContent,
  openGraphType,
  shouldNoindexPage,
  siteOrigin,
} from "../util/seo"

export default (() => {
  const Head: QuartzComponent = ({
    cfg,
    fileData,
    externalResources,
    ctx,
  }: QuartzComponentProps) => {
    const titleSuffix = cfg.pageTitleSuffix ?? ""
    const pageTitle = fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title
    const title = pageTitle + titleSuffix
    const description =
      fileData.frontmatter?.socialDescription ??
      fileData.frontmatter?.description ??
      unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

    const { css, js, additionalHead } = externalResources

    const url = new URL(absoluteUrl(cfg, "index" as FullSlug))
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")

    // Url of current page
    const socialUrl =
      fileData.slug === "404"
        ? absoluteUrl(cfg, "404" as FullSlug)
        : absoluteUrl(cfg, fileData.slug!)
    const canonicalUrl = socialUrl

    const usesCustomOgImage = ctx.cfg.plugins.emitters.some(
      (e) => e.name === CustomOgImagesEmitterName,
    )
    const ogImageDefaultPath = `${siteOrigin(cfg)}/static/og-image.png`

    // Resolve the OG image URL so we can pass it to JSON-LD as well
    const ogImageResolvedPath = usesCustomOgImage
      ? absoluteUrl(cfg, `${fileData.slug!}-og-image` as FullSlug) + ".webp"
      : ogImageDefaultPath

    const jsonLd = buildJsonLd(
      cfg,
      fileData,
      pageTitle,
      description,
      canonicalUrl,
      ogImageResolvedPath,
    )

    // Article dates for OG article:* meta tags
    const isArticle = openGraphType(fileData) === "article"
    const { published, modified } = isArticle
      ? extractArticleDates(fileData)
      : { published: undefined, modified: undefined }
    const tags: string[] = isArticle
      ? Array.isArray(fileData.frontmatter?.tags)
        ? fileData.frontmatter.tags
        : []
      : []

    // Locale for og:locale (convert "zh-CN" → "zh_CN")
    const ogLocale = (cfg.locale ?? "zh-CN").replace("-", "_")

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            <link
              rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Caveat:wght@300;400;500;600&display=swap"
              data-persist="font-caveat"
            />
            {cfg.theme.typography.title && (
              <link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />
            )}
          </>
        )}
        {/* 手写体 Caveat：在未启用 cdnCaching 时也加载，保证日期/阅读时间字体正确 */}
        {!cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link
              rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Caveat:wght@300;400;500;600&display=swap"
              data-persist="font-caveat"
            />
          </>
        )}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <link rel="canonical" href={canonicalUrl} />
        {shouldNoindexPage(fileData) && <meta name="robots" content="noindex,follow" />}
        <meta property="og:site_name" content={cfg.pageTitle}></meta>
        <meta property="og:title" content={title} />
        <meta property="og:type" content={openGraphType(fileData)} />
        <meta property="og:locale" content={ogLocale} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta property="og:description" content={description} />
        <meta property="og:image:alt" content={description} />

        {/* OG article meta – publication / modification dates, author, tags */}
        {isArticle && published && (
          <meta property="article:published_time" content={published.toISOString()} />
        )}
        {isArticle && modified && (
          <meta property="article:modified_time" content={modified.toISOString()} />
        )}
        {isArticle && <meta property="article:author" content={`${siteOrigin(cfg)}/`} />}
        {tags.map((tag) => (
          <meta property="article:tag" content={tag} />
        ))}

        {!usesCustomOgImage && (
          <>
            <meta property="og:image" content={ogImageDefaultPath} />
            <meta property="og:image:url" content={ogImageDefaultPath} />
            <meta name="twitter:image" content={ogImageDefaultPath} />
            <meta
              property="og:image:type"
              content={`image/${(getFileExtension(ogImageDefaultPath) ?? "png").replace(/^\./, "")}`}
            />
          </>
        )}

        {cfg.baseUrl && (
          <>
            <meta property="twitter:domain" content={new URL(siteOrigin(cfg)).hostname}></meta>
            <meta property="og:url" content={socialUrl}></meta>
            <meta property="twitter:url" content={socialUrl}></meta>
          </>
        )}

        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />
        {jsonLd &&
          (Array.isArray(jsonLd) ? (
            jsonLd.map((item) => (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(item) }}
              />
            ))
          ) : (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(jsonLd) }}
            />
          ))}

        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => {
          if (typeof resource === "function") {
            return resource(fileData)
          } else {
            return resource
          }
        })}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
