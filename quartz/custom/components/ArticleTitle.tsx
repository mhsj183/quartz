import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../../components/types"
import { classNames } from "../../util/lang"

function TitleIcon({ slug }: { slug?: string }) {
  const isTagPage = slug?.startsWith("tags/") ?? false
  const isFolderPage = !isTagPage && (slug?.endsWith("/index") ?? false)

  if (!isTagPage && !isFolderPage) return null

  if (isTagPage) {
    return (
      <span class="article-title-icon" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          focusable="false"
          aria-hidden="true"
        >
          <path d="M20 12.5L11.5 21L3 12.5V4h8.5L20 12.5z" />
          <circle cx="8" cy="8" r="1.25" />
        </svg>
      </span>
    )
  }

  return (
    <span class="article-title-icon" aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        focusable="false"
        aria-hidden="true"
      >
        <path d="M3.5 6.5h6l2 2h9v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6.5z" />
        <path d="M3.5 10h17" />
      </svg>
    </span>
  )
}

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  if (title) {
    return (
      <h1 class={classNames(displayClass, "article-title")}>
        <TitleIcon slug={fileData.slug} />
        <span class="article-title-text">{title}</span>
      </h1>
    )
  } else {
    return null
  }
}

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
