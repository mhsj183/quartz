import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { formatDateMMDDCommaYYYY, getFrontmatterPublishedDate } from "./Date"
import style from "./styles/source-link.scss"

const externalIcon = (
  <svg
    aria-hidden="true"
    class="external-icon"
    style="max-width:0.8em;max-height:0.8em"
    viewBox="0 0 512 512"
  >
    <path d="M320 0H288V64h32 82.7L201.4 265.4 178.7 288 224 333.3l22.6-22.6L448 109.3V192v32h64V192 32 0H480 320zM32 32H0V64 480v32H32 456h32V480 352 320H424v32 96H64V96h96 32V32H160 32z" />
  </svg>
)

const SOURCE_KEYS = ["sourceUrl", "源地址", "source", "source_url"]

const SourceLink: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = (fileData.frontmatter ?? {}) as Record<string, unknown>
  let url: string | null = null
  for (const key of SOURCE_KEYS) {
    const val = fm[key]
    if (typeof val === "string" && val.trim()) {
      url = val.trim()
      break
    }
  }

  const publishedDate = getFrontmatterPublishedDate(fm)
  if (!url && !publishedDate) {
    return null
  }

  return (
    <div class="source-link">
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" class="external">
          阅读原文
          {externalIcon}
        </a>
      )}
      {publishedDate && (
        <span class="source-link__published">
          First published on {formatDateMMDDCommaYYYY(publishedDate)}
        </span>
      )}
    </div>
  )
}

SourceLink.css = style

export default (() => SourceLink) satisfies QuartzComponentConstructor
