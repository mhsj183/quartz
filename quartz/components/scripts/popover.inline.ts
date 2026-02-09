import { computePosition, flip, inline, shift } from "@floating-ui/dom"
import { normalizeRelativeURLs } from "../../util/path"
import { fetchCanonical } from "./util"

const p = new DOMParser()
let activeAnchor: HTMLAnchorElement | null = null

async function mouseEnterHandler(
  this: HTMLAnchorElement,
  { clientX, clientY }: { clientX: number; clientY: number },
) {
  const link = (activeAnchor = this)
  if (link.dataset.noPopover === "true") {
    return
  }

  const isExplorerLink = link.closest(".explorer") !== null
  const POPOVER_MIN_LEFT_PX = 100

  async function setPosition(popoverElement: HTMLElement) {
    const { x, y } = await computePosition(link, popoverElement, {
      strategy: "fixed",
      middleware: [inline({ x: clientX, y: clientY }), shift(), flip()],
    })
    // 左侧探索区域浮窗最左保持 100px，便于鼠标移到列表上下；整体浮窗左移 10px
    const baseX = isExplorerLink ? Math.max(POPOVER_MIN_LEFT_PX, x) : x
    const finalX = baseX - 10
    Object.assign(popoverElement.style, {
      transform: `translate(${finalX.toFixed()}px, ${y.toFixed()}px)`,
    })
  }

  function showPopover(popoverElement: HTMLElement) {
    clearActivePopover()
    popoverElement.classList.add("active-popover")
    setPosition(popoverElement as HTMLElement)

    if (hash !== "") {
      const targetAnchor = `#popover-internal-${hash.slice(1)}`
      const heading = popoverInner.querySelector(targetAnchor) as HTMLElement | null
      if (heading) {
        // leave ~12px of buffer when scrolling to a heading
        popoverInner.scroll({ top: heading.offsetTop - 12, behavior: "instant" })
      }
    }
  }

  const targetUrl = new URL(link.href)
  const hash = decodeURIComponent(targetUrl.hash)
  targetUrl.hash = ""
  targetUrl.search = ""
  const popoverId = `popover-${link.pathname}`
  const prevPopoverElement = document.getElementById(popoverId)

  // dont refetch if there's already a popover
  if (!!document.getElementById(popoverId)) {
    showPopover(prevPopoverElement as HTMLElement)
    return
  }

  const response = await fetchCanonical(targetUrl).catch((err) => {
    console.error(err)
  })

  if (!response) return
  const [contentType] = response.headers.get("Content-Type")!.split(";")
  const [contentTypeCategory, typeInfo] = contentType.split("/")

  const popoverElement = document.createElement("div")
  popoverElement.id = popoverId
  popoverElement.classList.add("popover")
  const popoverInner = document.createElement("div")
  popoverInner.classList.add("popover-inner")
  popoverInner.dataset.contentType = contentType ?? undefined
  popoverElement.appendChild(popoverInner)

  switch (contentTypeCategory) {
    case "image":
      const img = document.createElement("img")
      img.src = targetUrl.toString()
      img.alt = targetUrl.pathname

      popoverInner.appendChild(img)
      break
    case "application":
      switch (typeInfo) {
        case "pdf":
          const pdf = document.createElement("iframe")
          pdf.src = targetUrl.toString()
          popoverInner.appendChild(pdf)
          break
        default:
          break
      }
      break
    default:
      const contents = await response.text()
      const html = p.parseFromString(contents, "text/html")
      normalizeRelativeURLs(html, targetUrl)
      // prepend all IDs inside popovers to prevent duplicates
      html.querySelectorAll("[id]").forEach((el) => {
        const targetID = `popover-internal-${el.id}`
        el.id = targetID
      })
      const elts = [...html.getElementsByClassName("popover-hint")]
      if (elts.length === 0) return

      elts.forEach((elt) => popoverInner.appendChild(elt))
  }

  if (!!document.getElementById(popoverId)) {
    return
  }

  document.body.appendChild(popoverElement)
  if (activeAnchor !== this) {
    return
  }

  showPopover(popoverElement)
}

function clearActivePopover() {
  activeAnchor = null
  const allPopoverElements = document.querySelectorAll(".popover")
  allPopoverElements.forEach((popoverElement) => popoverElement.classList.remove("active-popover"))
}

function isExplorerLinkValid(a: HTMLAnchorElement): boolean {
  const href = a.getAttribute("href")
  return !!(href && href !== "#" && !href.startsWith("#"))
}

document.addEventListener("nav", () => {
  // 正文内部链接绑定预览浮窗（排除目录 TOC）
  const internalLinks = document.querySelectorAll("a.internal")
  const bodyLinks = [...internalLinks].filter((el) => !(el as HTMLElement).closest(".toc"))
  for (const link of bodyLinks) {
    link.addEventListener("mouseenter", mouseEnterHandler)
    link.addEventListener("mouseleave", clearActivePopover)
    window.addCleanup(() => {
      link.removeEventListener("mouseenter", mouseEnterHandler)
      link.removeEventListener("mouseleave", clearActivePopover)
    })
  }

  // 左侧探索区域：延迟一帧后绑定事件委托（确保 explorer 已渲染），任意链接悬停触发浮窗
  const setupExplorerPopover = () => {
    const explorerRoot = document.querySelector(".explorer")
    if (!explorerRoot) return
    const onExplorerMouseOver = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest?.(".explorer a[href]") as
        | HTMLAnchorElement
        | null
      if (link && isExplorerLinkValid(link)) {
        mouseEnterHandler.call(link, e)
      }
    }
    const onExplorerMouseOut = (e: MouseEvent) => {
      const related = (e.relatedTarget as HTMLElement)?.closest?.(".explorer a[href]")
      if (!related) {
        clearActivePopover()
      }
    }
    explorerRoot.addEventListener("mouseover", onExplorerMouseOver)
    explorerRoot.addEventListener("mouseout", onExplorerMouseOut)
    window.addCleanup(() => {
      explorerRoot.removeEventListener("mouseover", onExplorerMouseOver)
      explorerRoot.removeEventListener("mouseout", onExplorerMouseOut)
    })
  }
  setTimeout(setupExplorerPopover, 0)
})
