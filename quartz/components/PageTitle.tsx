import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = (props: QuartzComponentProps) => {
  const { fileData, cfg, displayClass } = props
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <a href={baseDir}>{title}</a>
    </h2>
  )
}

const pageTitleCss = `
.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  font-family: var(--titleFont);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-title > a {
  font-weight: 700;
}
`
PageTitle.css = pageTitleCss

export default (() => PageTitle) satisfies QuartzComponentConstructor
