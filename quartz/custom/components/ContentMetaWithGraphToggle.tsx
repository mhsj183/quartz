import { concatenateResources } from "../../util/resources"
import { getArticleMetaDate, formatDateMonthDayYear } from "../../components/Date"
import ReaderMode from "../../components/ReaderMode"
import readingTime from "reading-time"
import {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../components/types"
import { classNames } from "../../util/lang"
import { JSX } from "preact"
import contentMetaStyle from "../../components/styles/contentMeta.scss"

const ReaderModeComponent = ReaderMode()

const ContentMetaWithGraphToggle: QuartzComponent = (props: QuartzComponentProps) => {
  const { cfg, fileData, displayClass } = props
  const text = fileData.text
  if (!text) return null

  const segments: (string | JSX.Element)[] = []
  const date = getArticleMetaDate(cfg, fileData)
  if (date) {
    segments.push(<time datetime={date.toISOString()}>Posted {formatDateMonthDayYear(date)}</time>)
  }
  const { minutes } = readingTime(text)
  const displayedTime = `${Math.ceil(minutes)} min read`
  if (segments.length > 0) segments.push(" · ")
  segments.push(<span>{displayedTime}</span>)

  return <p class={classNames(displayClass, "content-meta")}>{segments}</p>
}

ContentMetaWithGraphToggle.css = concatenateResources(contentMetaStyle, ReaderModeComponent.css)
ContentMetaWithGraphToggle.beforeDOMLoaded = ReaderModeComponent.beforeDOMLoaded

export default (() => ContentMetaWithGraphToggle) satisfies QuartzComponentConstructor
