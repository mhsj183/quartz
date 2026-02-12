const TOC_OVERLAY_ID = "toc-overlay"
const TOC_OVERLAY_BACKDROP_ID = "toc-overlay-backdrop"
const IMAGE_PREVIEW_OVERLAY_ID = "image-preview-overlay"
// 与 base.scss 中 $desktop 一致：低于此宽度时右侧目录区域被隐藏，点击按钮显示右侧浮层
const TOC_VISIBLE_BREAKPOINT = 1200
const FLOATING_TOC_SAFE_GAP = 30
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
  const hrBoundary = document.querySelector("#quartz-body > .center > hr") as HTMLElement | null
  const footerBoundary = document.querySelector("#quartz-body > footer") as HTMLElement | null
  const boundaryTop = Math.min(
    hrBoundary?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
    footerBoundary?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
  )
  const baseBottom = getFloatingTocBaseBottomPx()
  const safeBottom =
    Number.isFinite(boundaryTop) && boundaryTop < window.innerHeight
      ? Math.max(baseBottom, window.innerHeight - boundaryTop + FLOATING_TOC_SAFE_GAP)
      : baseBottom
  setFloatingTocBottomPx(safeBottom)
}

function scheduleFloatingTocSafeInsetUpdate() {
  if (floatingTocSafeInsetRafId != null) return
  floatingTocSafeInsetRafId = requestAnimationFrame(() => {
    floatingTocSafeInsetRafId = null
    updateFloatingTocSafeInset()
  })
}

// 右下角浮层按钮：点击切换整个大纲组件的显示/隐藏（大屏）或打开右侧目录浮层（小屏）
function syncTocToggleButtonState() {
  const toc = document.querySelector(".toc") as HTMLElement | null
  const floatingBtn = document.querySelector("#floating-toc-wrap .floating-toc-btn") as HTMLElement | null
  if (toc && floatingBtn) {
    const isOverlay = isTocOverlayMode()
    const isHidden = toc.classList.contains("toc-hidden")
    const overlayOpen = document.getElementById(TOC_OVERLAY_ID)?.classList.contains("open") ?? false
    floatingBtn.classList.toggle("toc-collapsed", isOverlay ? !overlayOpen : isHidden)
  }
  syncBodyTocState()
  updateFloatingTocVisibility()
}

function syncBodyTocState() {
  const toc = document.querySelector(".toc") as HTMLElement | null
  if (isTocOverlayMode()) {
    // 浮层模式下不参与桌面三栏重排，避免滚动状态下误触发布局抖动
    document.body.classList.remove("toc-panel-hidden")
    return
  }
  const isHidden = toc?.classList.contains("toc-hidden") ?? false
  document.body.classList.toggle("toc-panel-hidden", isHidden)
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
  return window.matchMedia(`(max-width: ${TOC_VISIBLE_BREAKPOINT}px)`).matches
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
    clone.classList.remove("toc-hidden", "desktop-only")
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
    updateImagePreviewPanelLayout(overlay as HTMLElement, previewImage.naturalWidth, previewImage.naturalHeight)
  }
  previewImage.src = sourceImage.currentSrc || sourceImage.src
  previewImage.alt = sourceImage.alt || ""
  updateImagePreviewPanelLayout(overlay as HTMLElement, sourceImage.naturalWidth, sourceImage.naturalHeight)
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
    btn.setAttribute("aria-label", "显示目录")
    btn.setAttribute("title", "显示目录")
    btn.innerHTML = `<svg class="icon-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="translate(-1.8, -1.8) scale(1.15, 1.2)"><path d="M8.9891247,2.5 C10.1384702,2.5 11.2209868,2.96705384 12.0049645,3.76669482 C12.7883914,2.96705384 13.8709081,2.5 15.0202536,2.5 L18.7549359,2.5 C19.1691495,2.5 19.5049359,2.83578644 19.5049359,3.25 L19.5046891,4.004 L21.2546891,4.00457396 C21.6343849,4.00457396 21.9481801,4.28672784 21.9978425,4.6528034 L22.0046891,4.75457396 L22.0046891,20.25 C22.0046891,20.6296958 21.7225353,20.943491 21.3564597,20.9931534 L21.2546891,21 L2.75468914,21 C2.37499337,21 2.06119817,20.7178461 2.01153575,20.3517706 L2.00468914,20.25 L2.00468914,4.75457396 C2.00468914,4.37487819 2.28684302,4.061083 2.65291858,4.01142057 L2.75468914,4.00457396 L4.50368914,4.004 L4.50444233,3.25 C4.50444233,2.87030423 4.78659621,2.55650904 5.15267177,2.50684662 L5.25444233,2.5 L8.9891247,2.5 Z M4.50368914,5.504 L3.50468914,5.504 L3.50468914,19.5 L10.9478955,19.4998273 C10.4513189,18.9207296 9.73864328,18.5588115 8.96709342,18.5065584 L8.77307039,18.5 L5.25444233,18.5 C4.87474657,18.5 4.56095137,18.2178461 4.51128895,17.8517706 L4.50444233,17.75 L4.50368914,5.504 Z M19.5049359,17.75 C19.5049359,18.1642136 19.1691495,18.5 18.7549359,18.5 L15.2363079,18.5 C14.3910149,18.5 13.5994408,18.8724714 13.0614828,19.4998273 L20.5046891,19.5 L20.5046891,5.504 L19.5046891,5.504 L19.5049359,17.75 Z M18.0059359,3.999 L15.0202536,4 L14.8259077,4.00692283 C13.9889509,4.06666544 13.2254227,4.50975805 12.7549359,5.212 L12.7549359,17.777 L12.7782651,17.7601316 C13.4923805,17.2719483 14.3447024,17 15.2363079,17 L18.0059359,16.999 L18.0056891,4.798 L18.0033792,4.75457396 L18.0056891,4.71 L18.0059359,3.999 Z M8.9891247,4 L6.00368914,3.999 L6.00599909,4.75457396 L6.00599909,4.75457396 L6.00368914,4.783 L6.00368914,16.999 L8.77307039,17 C9.57551536,17 10.3461406,17.2202781 11.0128313,17.6202194 L11.2536891,17.776 L11.2536891,5.211 C10.8200889,4.56369974 10.1361548,4.13636104 9.37521067,4.02745763 L9.18347055,4.00692283 L8.9891247,4 Z"/></g></svg>`
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (isTocOverlayMode()) {
        toggleTocOverlay()
      } else {
        const t = document.querySelector(".toc") as HTMLElement | null
        if (t) {
          t.classList.toggle("toc-hidden")
          requestAnimationFrame(syncTocToggleButtonState)
        }
      }
    })
    wrap.appendChild(btn)
    document.body.appendChild(wrap)
    window.addCleanup(() => wrap?.remove())
  }

  if (!removeFloatingTocSafeInsetListeners) {
    const onReflow = () => scheduleFloatingTocSafeInsetUpdate()
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
  const toc = document.querySelector(".toc") as HTMLElement | null
  if (toc) {
    // 目录区域不可见时（小屏/平板），默认收起目录，使右下角按钮为灰色（非高亮）
    const tocAreaVisible = window.matchMedia(`(min-width: ${TOC_VISIBLE_BREAKPOINT}px)`).matches
    if (tocAreaVisible) {
      toc.classList.remove("toc-hidden")
    } else {
      toc.classList.add("toc-hidden")
    }
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
