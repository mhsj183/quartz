import { getDate, formatDateMMDDYYYY } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import readingTime from "reading-time"
import { classNames } from "../util/lang"
import { JSX } from "preact"
import style from "./styles/contentMeta.scss"

interface ContentMetaOptions {
  showReadingTime: boolean
  showComma: boolean
}

const defaultOptions: ContentMetaOptions = {
  showReadingTime: true,
  showComma: false, // 使用竖线分隔，不用逗号
}

export default ((opts?: Partial<ContentMetaOptions>) => {
  const options: ContentMetaOptions = { ...defaultOptions, ...opts }

  function ContentMetadata({ cfg, fileData, displayClass }: QuartzComponentProps) {
    const text = fileData.text

    if (text) {
      const segments: (string | JSX.Element)[] = []
      const date = fileData.dates ? getDate(cfg, fileData) : undefined

      if (date) {
        segments.push(
          <time datetime={date.toISOString()}>{formatDateMMDDYYYY(date)}</time>,
        )
      }

      if (options.showReadingTime) {
        const { minutes } = readingTime(text)
        const displayedTime = `${Math.ceil(minutes)} min read`
        if (segments.length > 0) segments.push(", ")
        segments.push(<span>{displayedTime}</span>)
      }

      return (
        <p class={classNames(displayClass, "content-meta")}>{segments}</p>
      )
    } else {
      return null
    }
  }

  ContentMetadata.css = style

  return ContentMetadata
}) satisfies QuartzComponentConstructor
