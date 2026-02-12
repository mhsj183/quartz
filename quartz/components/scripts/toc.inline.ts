let activeTocSlug: string | null = null

function setActiveTocEntry(slug: string | null) {
  if (activeTocSlug === slug) return

  document
    .querySelectorAll<HTMLAnchorElement>(".toc a.in-view")
    .forEach((tocEntryElement) => tocEntryElement.classList.remove("in-view"))

  if (slug) {
    document
      .querySelectorAll<HTMLAnchorElement>(`.toc a[data-for="${slug}"]`)
      .forEach((tocEntryElement) => tocEntryElement.classList.add("in-view"))
  }

  activeTocSlug = slug
}

function updateActiveTocEntry() {
  const headers = [...document.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")]
  if (headers.length === 0) {
    setActiveTocEntry(null)
    return
  }

  // 以视口顶部下方少量偏移作为“当前位置”
  const activationOffset = 120
  const thresholdY = activationOffset
  let activeHeader = headers[0]

  for (const header of headers) {
    if (header.getBoundingClientRect().top <= thresholdY) {
      activeHeader = header
    } else {
      break
    }
  }

  setActiveTocEntry(activeHeader.id || null)
}

function toggleToc(this: HTMLElement) {
  this.classList.toggle("collapsed")
  this.setAttribute(
    "aria-expanded",
    this.getAttribute("aria-expanded") === "true" ? "false" : "true",
  )
  const content = this.nextElementSibling as HTMLElement | undefined
  if (!content) return
  content.classList.toggle("collapsed")
}

function setupToc() {
  for (const toc of document.getElementsByClassName("toc")) {
    const button = toc.querySelector(".toc-header")
    const content = toc.querySelector(".toc-content")
    if (!button || !content) return
    button.addEventListener("click", toggleToc)
    window.addCleanup(() => button.removeEventListener("click", toggleToc))
  }
}

document.addEventListener("nav", () => {
  setupToc()

  let rafId: number | null = null
  const onScrollOrResize = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      updateActiveTocEntry()
    })
  }

  window.addEventListener("scroll", onScrollOrResize, { passive: true })
  window.addEventListener("resize", onScrollOrResize)
  window.addCleanup(() => {
    window.removeEventListener("scroll", onScrollOrResize)
    window.removeEventListener("resize", onScrollOrResize)
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  updateActiveTocEntry()
})
