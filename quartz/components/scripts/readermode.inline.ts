const TOC_OVERLAY_ID = "toc-overlay"
const TOC_OVERLAY_BACKDROP_ID = "toc-overlay-backdrop"
const IMAGE_PREVIEW_OVERLAY_ID = "image-preview-overlay"
// 与 base.scss 中 $desktop 一致：低于此宽度时右侧目录区域被隐藏，点击按钮显示右侧浮层
const TOC_VISIBLE_BREAKPOINT = 1200
const FLOATING_TOC_SAFE_GAP = 30
// 按钮高度（对应 readermode.scss 中的 2.75rem = 44px）
const FLOATING_TOC_BTN_HEIGHT_PX = 44
const FLOATING_TOC_BASE_BOTTOM_CSS_VAR = "--floating-toc-base-bottom"
const FLOATING_TOC_BOTTOM_CSS_VAR = "--floating-toc-bottom"
let removeOverlayOutsideCloseHandler: (() => void) | null = null
let removeOverlayEscapeHandler: (() => void) | null = null
let removeFloatingTocSafeInsetListeners: (() => void) | null = null
let floatingTocBaseBottomPx: number | null = null
let floatingTocSafeInsetRafId: number | null = null
let removeImagePreviewClickHandler: (() => void) | null = null
let removeImagePreviewEscapeHandler: (() => void) | null = null

function getFloatingTocBaseBottomPx(): number {
  if (floatingTocBaseBottomPx != null) return floatingTocBaseBottomPx
  const rootStyles = getComputedStyle(document.documentElement)
  const baseCssVar = rootStyles.getPropertyValue(FLOATING_TOC_BASE_BOTTOM_CSS_VAR).trim()
  const fallbackCssVar = rootStyles.getPropertyValue(FLOATING_TOC_BOTTOM_CSS_VAR).trim()
  const parsed = Number.parseFloat(baseCssVar || fallbackCssVar)
  floatingTocBaseBottomPx = Number.isFinite(parsed) ? parsed : 63
  return floatingTocBaseBottomPx
}

function setFloatingTocBottomPx(bottomPx: number) {
  document.documentElement.style.setProperty(FLOATING_TOC_BOTTOM_CSS_VAR, `${bottomPx}px`)
}

function resetFloatingTocBottomToBase() {
  setFloatingTocBottomPx(getFloatingTocBaseBottomPx())
}

function updateFloatingTocSafeInset() {
  const wrap = document.getElementById("floating-toc-wrap")
  if (!wrap) return
  // 优先以正文区域的分割线（.center 直接子元素 hr）为上升边界，
  // 让按钮在分割线进入视口前就开始上移，保持在正文内部；
  // 若无此元素则回退到站点 footer
  const footerBoundary =
    (document.querySelector(".center > hr") as HTMLElement | null) ??
    (document.querySelector("#quartz-body > footer") as HTMLElement | null)
  const baseBottom = getFloatingTocBaseBottomPx()
  // 只有当页面已完全滚动到底部（无法继续向下滚动）时，才将按钮推到分割线上方；
  // 滚动过程中始终保持在右下角，避免中途跳位
  const scrollRemaining =
    document.documentElement.scrollHeight - window.innerHeight - window.scrollY
  const isAtBottom = scrollRemaining <= 1
  let safeBottom = baseBottom
  if (isAtBottom && footerBoundary) {
    const boundaryDistFromBottom = window.innerHeight - footerBoundary.getBoundingClientRect().top
    if (boundaryDistFromBottom > baseBottom + FLOATING_TOC_BTN_HEIGHT_PX) {
      safeBottom = Math.max(baseBottom, boundaryDistFromBottom + FLOATING_TOC_SAFE_GAP)
    }
  }
  setFloatingTocBottomPx(safeBottom)
}

function scheduleFloatingTocSafeInsetUpdate() {
  if (floatingTocSafeInsetRafId != null) return
  floatingTocSafeInsetRafId = requestAnimationFrame(() => {
    floatingTocSafeInsetRafId = null
    updateFloatingTocSafeInset()
  })
}

// 右下角浮层按钮：点击切换整个右边栏（大屏）或打开右侧目录浮层（小屏）
function syncTocToggleButtonState() {
  const rightSidebar = document.querySelector(".sidebar.right") as HTMLElement | null
  const floatingBtn = document.querySelector(
    "#floating-toc-wrap .floating-toc-btn",
  ) as HTMLElement | null
  if (rightSidebar && floatingBtn) {
    const isOverlay = isTocOverlayMode()
    const isHidden = rightSidebar.classList.contains("right-sidebar-collapsed")
    const overlayOpen = document.getElementById(TOC_OVERLAY_ID)?.classList.contains("open") ?? false
    floatingBtn.classList.toggle("toc-collapsed", isOverlay ? !overlayOpen : isHidden)
    floatingBtn.setAttribute("aria-label", isHidden ? "展开右边栏" : "收起右边栏")
    floatingBtn.setAttribute("title", isHidden ? "展开右边栏" : "收起右边栏")
  }
  syncBodyTocState()
  updateFloatingTocVisibility()
}

function syncBodyTocState() {
  const rightSidebar = document.querySelector(".sidebar.right") as HTMLElement | null
  if (isTocOverlayMode()) {
    // 浮层模式下不参与桌面三栏重排，避免滚动状态下误触发布局抖动
    document.body.classList.remove("right-sidebar-collapsed")
    return
  }
  const isHidden = rightSidebar?.classList.contains("right-sidebar-collapsed") ?? false
  document.body.classList.toggle("right-sidebar-collapsed", isHidden)
}

function updateFloatingTocVisibility() {
  const wrap = document.getElementById("floating-toc-wrap")
  if (!wrap) return
  const toc = document.querySelector(".toc") as HTMLElement | null
  const show = !!toc
  wrap.classList.toggle("visible", show)
  scheduleFloatingTocSafeInsetUpdate()
}

function isTocOverlayMode(): boolean {
  return window.innerWidth < TOC_VISIBLE_BREAKPOINT
}

function closeTocOverlay() {
  const overlay = document.getElementById(TOC_OVERLAY_ID)
  const backdrop = document.getElementById(TOC_OVERLAY_BACKDROP_ID)
  if (overlay) overlay.classList.remove("open")
  if (backdrop) backdrop.classList.remove("open")
  if (removeOverlayOutsideCloseHandler) {
    removeOverlayOutsideCloseHandler()
    removeOverlayOutsideCloseHandler = null
  }
  if (removeOverlayEscapeHandler) {
    removeOverlayEscapeHandler()
    removeOverlayEscapeHandler = null
  }
  requestAnimationFrame(syncTocToggleButtonState)
}

function openTocOverlay() {
  const toc = document.querySelector(".toc") as HTMLElement | null
  if (!toc) return

  let overlay = document.getElementById(TOC_OVERLAY_ID)
  let backdrop = document.getElementById(TOC_OVERLAY_BACKDROP_ID)

  if (!backdrop) {
    backdrop = document.createElement("div")
    backdrop.id = TOC_OVERLAY_BACKDROP_ID
    backdrop.setAttribute("aria-hidden", "true")
    backdrop.addEventListener("click", closeTocOverlay)
    document.body.appendChild(backdrop)
    window.addCleanup(() => backdrop?.remove())
  }

  if (!overlay) {
    overlay = document.createElement("div")
    overlay.id = TOC_OVERLAY_ID
    overlay.setAttribute("role", "dialog")
    overlay.setAttribute("aria-label", "目录")

    const panel = document.createElement("div")
    panel.className = "toc-overlay-panel"

    overlay.appendChild(panel)
    document.body.appendChild(overlay)
    window.addCleanup(() => overlay?.remove())
  }

  const panel = overlay.querySelector(".toc-overlay-panel") as HTMLElement
  if (panel) {
    panel.innerHTML = ""
    const clone = toc.cloneNode(true) as HTMLElement
    clone.classList.remove("desktop-only")
    clone.classList.add("toc-overlay-clone")
    const header = clone.querySelector(".toc-header")
    const content = clone.querySelector(".toc-content")
    if (header) header.classList.remove("collapsed")
    if (content) content.classList.remove("collapsed")
    panel.appendChild(clone)
    if (panel.dataset.wheelBound !== "true") {
      panel.addEventListener(
        "wheel",
        (e) => {
          // 限制滚轮只作用于当前目录浮层，避免滚动链传播到页面其他区域
          e.stopPropagation()
        },
        { passive: true },
      )
      panel.dataset.wheelBound = "true"
    }
  }

  backdrop.classList.add("open")
  overlay.classList.add("open")
  if (removeOverlayOutsideCloseHandler) {
    removeOverlayOutsideCloseHandler()
    removeOverlayOutsideCloseHandler = null
  }
  const onDocumentClick = (e: MouseEvent) => {
    const target = e.target as Node | null
    if (!target) return
    const inOverlay = overlay?.contains(target) ?? false
    const inFloatingBtn =
      (target as HTMLElement)?.closest?.("#floating-toc-wrap .floating-toc-btn") !== null
    if (!inOverlay && !inFloatingBtn) closeTocOverlay()
  }
  document.addEventListener("click", onDocumentClick, true)
  removeOverlayOutsideCloseHandler = () =>
    document.removeEventListener("click", onDocumentClick, true)

  if (removeOverlayEscapeHandler) {
    removeOverlayEscapeHandler()
    removeOverlayEscapeHandler = null
  }
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeTocOverlay()
  }
  document.addEventListener("keydown", onKeydown)
  removeOverlayEscapeHandler = () => document.removeEventListener("keydown", onKeydown)
  requestAnimationFrame(syncTocToggleButtonState)
}

function toggleTocOverlay() {
  const overlay = document.getElementById(TOC_OVERLAY_ID)
  const isOpen = overlay?.classList.contains("open") ?? false
  if (isOpen) closeTocOverlay()
  else openTocOverlay()
}

function closeImagePreviewOverlay() {
  const overlay = document.getElementById(IMAGE_PREVIEW_OVERLAY_ID)
  if (overlay) overlay.classList.remove("open")
}

function updateImagePreviewPanelLayout(overlay: HTMLElement, width: number, height: number) {
  const panel = overlay.querySelector(".image-preview-panel") as HTMLElement | null
  if (!panel) return

  panel.removeAttribute("data-orientation")
  panel.removeAttribute("data-small-image")
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    panel.style.removeProperty("--preview-image-ratio")
    return
  }

  const ratio = width / height
  const orientation = ratio > 1.15 ? "landscape" : ratio < 0.87 ? "portrait" : "square"
  panel.dataset.orientation = orientation
  panel.style.setProperty("--preview-image-ratio", ratio.toFixed(4))

  if (width <= 960 && height <= 960) {
    panel.setAttribute("data-small-image", "true")
  }
}

function openImagePreviewOverlay(sourceImage: HTMLImageElement) {
  let overlay = document.getElementById(IMAGE_PREVIEW_OVERLAY_ID)
  if (!overlay) {
    overlay = document.createElement("div")
    overlay.id = IMAGE_PREVIEW_OVERLAY_ID
    overlay.setAttribute("role", "dialog")
    overlay.setAttribute("aria-label", "图片预览")
    overlay.innerHTML = `
      <div class="image-preview-backdrop" aria-hidden="true"></div>
      <div class="image-preview-panel" role="document">
        <img class="image-preview-content" alt="" />
      </div>
    `
    document.body.appendChild(overlay)
    window.addCleanup(() => overlay?.remove())
  }

  const previewImage = overlay.querySelector(".image-preview-content") as HTMLImageElement | null
  if (!previewImage) return

  previewImage.onload = () => {
    updateImagePreviewPanelLayout(
      overlay as HTMLElement,
      previewImage.naturalWidth,
      previewImage.naturalHeight,
    )
  }
  previewImage.src = sourceImage.currentSrc || sourceImage.src
  previewImage.alt = sourceImage.alt || ""
  updateImagePreviewPanelLayout(
    overlay as HTMLElement,
    sourceImage.naturalWidth,
    sourceImage.naturalHeight,
  )
  overlay.classList.add("open")
}

function setupNoteImagePreview() {
  if (removeImagePreviewClickHandler) {
    removeImagePreviewClickHandler()
    removeImagePreviewClickHandler = null
  }
  if (removeImagePreviewEscapeHandler) {
    removeImagePreviewEscapeHandler()
    removeImagePreviewEscapeHandler = null
  }

  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return

    const clickedImage = target.closest(
      "#quartz-body .center article.popover-hint img",
    ) as HTMLImageElement | null
    if (clickedImage) {
      e.preventDefault()
      e.stopPropagation()
      openImagePreviewOverlay(clickedImage)
      return
    }

    const clickedOverlay = target.closest(`#${IMAGE_PREVIEW_OVERLAY_ID}`) as HTMLElement | null
    if (!clickedOverlay) return
    const clickedPanel = target.closest(".image-preview-panel")
    if (!clickedPanel) closeImagePreviewOverlay()
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeImagePreviewOverlay()
  }

  document.addEventListener("click", onClick, true)
  document.addEventListener("keydown", onKeydown)
  removeImagePreviewClickHandler = () => document.removeEventListener("click", onClick, true)
  removeImagePreviewEscapeHandler = () => document.removeEventListener("keydown", onKeydown)

  window.addCleanup(() => {
    removeImagePreviewClickHandler?.()
    removeImagePreviewEscapeHandler?.()
    removeImagePreviewClickHandler = null
    removeImagePreviewEscapeHandler = null
    closeImagePreviewOverlay()
  })
}

function setupFloatingTocButton() {
  const toc = document.querySelector(".toc") as HTMLElement | null
  if (!toc) {
    document.getElementById("floating-toc-wrap")?.remove()
    if (removeFloatingTocSafeInsetListeners) {
      removeFloatingTocSafeInsetListeners()
      removeFloatingTocSafeInsetListeners = null
    }
    return
  }

  let wrap = document.getElementById("floating-toc-wrap")
  if (!wrap) {
    wrap = document.createElement("div")
    wrap.id = "floating-toc-wrap"
    wrap.setAttribute("aria-hidden", "true")
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "floating-toc-btn"
    btn.setAttribute("aria-label", "收起右边栏")
    btn.setAttribute("title", "收起右边栏")
    btn.innerHTML = `<svg class="icon-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path class="arrow-collapse" d="m7 9 3 3-3 3"/><path class="arrow-expand" d="m10 9-3 3 3 3"/></svg>`
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (isTocOverlayMode()) {
        toggleTocOverlay()
      } else {
        const sidebar = document.querySelector(".sidebar.right") as HTMLElement | null
        if (sidebar) {
          sidebar.classList.toggle("right-sidebar-collapsed")
          requestAnimationFrame(syncTocToggleButtonState)
        }
      }
    })
    wrap.appendChild(btn)
    document.body.appendChild(wrap)
    window.addCleanup(() => wrap?.remove())
  }

  if (!removeFloatingTocSafeInsetListeners) {
    const onReflow = (event?: Event) => {
      scheduleFloatingTocSafeInsetUpdate()
      if (event?.type !== "resize") return

      const nextToc = document.querySelector(".toc") as HTMLElement | null
      const nextRightSidebar = document.querySelector(".sidebar.right") as HTMLElement | null
      if (nextToc && nextRightSidebar && isTocOverlayMode()) {
        nextRightSidebar.classList.remove("right-sidebar-collapsed")
      }
      if (!isTocOverlayMode()) closeTocOverlay()
      syncTocToggleButtonState()
    }
    window.addEventListener("scroll", onReflow, { passive: true })
    window.addEventListener("resize", onReflow)
    removeFloatingTocSafeInsetListeners = () => {
      window.removeEventListener("scroll", onReflow)
      window.removeEventListener("resize", onReflow)
      if (floatingTocSafeInsetRafId != null) {
        cancelAnimationFrame(floatingTocSafeInsetRafId)
        floatingTocSafeInsetRafId = null
      }
    }
    window.addCleanup(() => removeFloatingTocSafeInsetListeners?.())
  }

  updateFloatingTocVisibility()
  syncTocToggleButtonState()
}

function setupTocToggle() {
  const rightSidebar = document.querySelector(".sidebar.right") as HTMLElement | null
  if (rightSidebar && isTocOverlayMode()) {
    rightSidebar.classList.remove("right-sidebar-collapsed")
  }
  syncTocToggleButtonState()
  setupFloatingTocButton()
}

document.addEventListener("nav", () => {
  closeTocOverlay()
  resetFloatingTocBottomToBase()
  setupTocToggle()
  setupNoteImagePreview()
  // 切页后等待新页面布局稳定，再做安全 inset 计算，减少按钮/浮层跳位
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scheduleFloatingTocSafeInsetUpdate()
    })
  })
})

// 首屏加载时也根据视口设置目录默认状态（SPA 的 nav 可能在本文本执行前已触发）
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupTocToggle()
    setupNoteImagePreview()
  })
} else {
  setupTocToggle()
  setupNoteImagePreview()
}
