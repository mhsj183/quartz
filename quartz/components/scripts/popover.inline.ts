import { computePosition, flip, inline, shift } from "@floating-ui/dom"
import { normalizeRelativeURLs } from "../../util/path"
import { fetchCanonical } from "./util"

const p = new DOMParser()
let activeAnchor: HTMLAnchorElement | null = null

async function mouseEnterHandler(this: HTMLAnchorElement, e: MouseEvent) {
  const link = (activeAnchor = this)
  if (link.dataset.noPopover === "true") {
    return
  }

  const { clientX, clientY } = e
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

const POPOVER_OPEN_DELAY_MS = 1200 // 悬停 1.2s 后显示预览浮窗

document.addEventListener("nav", () => {
  // 正文内部链接绑定预览浮窗（排除目录 TOC），悬停 1.5s 后显示
  const internalLinks = document.querySelectorAll<HTMLAnchorElement>("a.internal")
  const bodyLinks = [...internalLinks].filter((el) => !el.closest(".toc"))
  for (const link of bodyLinks) {
    let bodyPopoverTimer: ReturnType<typeof setTimeout> | null = null
    const onBodyMouseEnter = (e: MouseEvent) => {
      if (bodyPopoverTimer !== null) clearTimeout(bodyPopoverTimer)
      bodyPopoverTimer = setTimeout(() => {
        bodyPopoverTimer = null
        mouseEnterHandler.call(link, e)
      }, POPOVER_OPEN_DELAY_MS)
    }
    const onBodyMouseLeave = () => {
      if (bodyPopoverTimer !== null) {
        clearTimeout(bodyPopoverTimer)
        bodyPopoverTimer = null
      }
      clearActivePopover()
    }
    link.addEventListener("mouseenter", onBodyMouseEnter)
    link.addEventListener("mouseleave", onBodyMouseLeave)
    window.addCleanup(() => {
      link.removeEventListener("mouseenter", onBodyMouseEnter)
      link.removeEventListener("mouseleave", onBodyMouseLeave)
      if (bodyPopoverTimer !== null) clearTimeout(bodyPopoverTimer)
    })
  }

  // 左侧探索区域：延迟一帧后绑定事件委托（确保 explorer 已渲染），悬停 1.5s 后显示预览浮窗
  const setupExplorerPopover = () => {
    const explorerRoot = document.querySelector<HTMLElement>(".explorer")
    if (!explorerRoot) return
    let explorerPopoverTimer: ReturnType<typeof setTimeout> | null = null
    let explorerPopoverLink: HTMLAnchorElement | null = null
    const onExplorerMouseOver = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest?.(
        ".explorer a[href]",
      ) as HTMLAnchorElement | null
      if (!link || !isExplorerLinkValid(link)) return
      if (link === explorerPopoverLink) return
      if (explorerPopoverTimer !== null) clearTimeout(explorerPopoverTimer)
      explorerPopoverLink = link
      explorerPopoverTimer = setTimeout(() => {
        explorerPopoverTimer = null
        explorerPopoverLink = null
        mouseEnterHandler.call(link, e)
      }, POPOVER_OPEN_DELAY_MS)
    }
    const onExplorerMouseOut = (e: MouseEvent) => {
      const related = (e.relatedTarget as HTMLElement)?.closest?.(".explorer a[href]")
      if (explorerPopoverLink && (!related || !explorerPopoverLink.contains(related as Node))) {
        if (explorerPopoverTimer !== null) {
          clearTimeout(explorerPopoverTimer)
          explorerPopoverTimer = null
        }
        explorerPopoverLink = null
      }
      if (!related) {
        clearActivePopover()
      }
    }
    explorerRoot.addEventListener("mouseover", onExplorerMouseOver)
    explorerRoot.addEventListener("mouseout", onExplorerMouseOut)
    window.addCleanup(() => {
      explorerRoot.removeEventListener("mouseover", onExplorerMouseOver)
      explorerRoot.removeEventListener("mouseout", onExplorerMouseOut)
      if (explorerPopoverTimer !== null) clearTimeout(explorerPopoverTimer)
    })
  }
  setTimeout(setupExplorerPopover, 0)
})
