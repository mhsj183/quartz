import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../../components/types"
import { classNames } from "../../util/lang"
import style from "../styles/ai-summary.scss"

const AISummary: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const summary = fileData.aiSummary?.trim()
  if (!summary) return null

  return (
    <p class={classNames(displayClass, "ai-summary")} data-ai-summary="true">
      {summary}
    </p>
  )
}

AISummary.css = style

export default (() => AISummary) satisfies QuartzComponentConstructor
