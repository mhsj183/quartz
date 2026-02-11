import { concatenateResources } from "../util/resources"
import { getDate, formatDateMMDDYYYY } from "./Date"
import ReaderMode from "./ReaderMode"
import readingTime from "reading-time"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { JSX } from "preact"
import contentMetaStyle from "./styles/contentMeta.scss"

const ReaderModeComponent = ReaderMode()

const ContentMetaWithGraphToggle: QuartzComponent = (props: QuartzComponentProps) => {
  const { cfg, fileData, displayClass } = props
  const text = fileData.text
  if (!text) return null

  const segments: (string | JSX.Element)[] = []
  const date = fileData.dates ? getDate(cfg, fileData) : undefined
  if (date) {
    segments.push(<time datetime={date.toISOString()}>{formatDateMMDDYYYY(date)}</time>)
  }
  const { minutes } = readingTime(text)
  const displayedTime = `${Math.ceil(minutes)} min read`
  if (segments.length > 0) segments.push(", ")
  segments.push(<span>{displayedTime}</span>)
  const hasToc = !!(fileData.toc && fileData.toc.length > 0)
  if (hasToc) segments.push(<ReaderModeComponent {...props} />)

  return (
    <p class={classNames(displayClass, "content-meta")}>
      {segments}
    </p>
  )
}

ContentMetaWithGraphToggle.css = concatenateResources(contentMetaStyle, ReaderModeComponent.css)
ContentMetaWithGraphToggle.beforeDOMLoaded = ReaderModeComponent.beforeDOMLoaded

export default (() => ContentMetaWithGraphToggle) satisfies QuartzComponentConstructor
