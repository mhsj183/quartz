// TOC 切换按钮：点击时切换右侧目录大纲的展开/收起状态
function syncTocToggleButtonState() {
  const tocHeader = document.querySelector(".toc .toc-header") as HTMLElement | null
  const toggleBtn = document.querySelector(".toc-toggle[data-has-toc='true']") as HTMLElement | null
  if (tocHeader && toggleBtn) {
    const isCollapsed = tocHeader.classList.contains("collapsed")
    toggleBtn.classList.toggle("toc-collapsed", isCollapsed)
  }
}

function setupTocToggle() {
  // 点击 toc-toggle 按钮：触发 toc-header 点击以切换目录
  document.querySelectorAll(".toc-toggle[data-has-toc='true']").forEach((btn) => {
    const toggleBtn = btn as HTMLButtonElement
    const handleClick = (e: Event) => {
      e.preventDefault()
      const tocHeader = document.querySelector(".toc .toc-header") as HTMLElement | null
      if (tocHeader) {
        tocHeader.click()
        requestAnimationFrame(syncTocToggleButtonState)
      }
    }
    toggleBtn.addEventListener("click", handleClick)
    window.addCleanup(() => toggleBtn.removeEventListener("click", handleClick))
  })

  // 监听 toc-header 直接点击，同步按钮状态
  const tocHeader = document.querySelector(".toc .toc-header")
  if (tocHeader) {
    const syncOnTocClick = () => requestAnimationFrame(syncTocToggleButtonState)
    tocHeader.addEventListener("click", syncOnTocClick)
    window.addCleanup(() => tocHeader.removeEventListener("click", syncOnTocClick))
  }
}

document.addEventListener("nav", () => {
  setupTocToggle()
})
