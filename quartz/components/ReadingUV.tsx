import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { shouldShowReadingUVForSlug } from "./ReadingUVVisibility"
import style from "./styles/readingUV.scss"
// @ts-ignore
import script from "./scripts/readinguv.inline"

const ReadingUV: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
  if (!shouldShowReadingUVForSlug(fileData.slug)) {
    return null
  }

  return (
    <div class={classNames(displayClass, "reading-uv")} data-reading-uv>
      <span class="reading-uv__value" data-reading-uv-value>
        ...
      </span>
      <span class="reading-uv__label" data-reading-uv-label>
        Reads
      </span>
    </div>
  )
}

ReadingUV.css = style
ReadingUV.afterDOMLoaded = script

export default (() => ReadingUV) satisfies QuartzComponentConstructor
