let activeTocSlug: string | null = null
const TOC_SCROLL_TOP_OFFSET = 20

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

function decodeHashSlug(hash: string): string | null {
  if (!hash || hash === "#") return null
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return hash.slice(1)
  }
}

function updateActiveTocEntry() {
  const headers = [
    ...document.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"),
  ]
  if (headers.length === 0) {
    setActiveTocEntry(null)
    return
  }

  const hashSlug = decodeHashSlug(window.location.hash)
  if (hashSlug) {
    const selectedHeader = headers.find((header) => header.id === hashSlug)
    if (selectedHeader) {
      const rect = selectedHeader.getBoundingClientRect()
      const headerVisible = rect.bottom > 0 && rect.top < window.innerHeight
      const nearPageBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      if (headerVisible || nearPageBottom) {
        setActiveTocEntry(hashSlug)
        return
      }
    }
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

function onTocEntryClick(event: MouseEvent) {
  const tocEntry = event.currentTarget as HTMLAnchorElement | null
  if (!tocEntry) return
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const slug = tocEntry.dataset.for ?? decodeHashSlug(tocEntry.hash)
  if (!slug) return

  const targetHeader = document.getElementById(slug)
  if (!targetHeader) return

  event.preventDefault()
  event.stopPropagation()

  setActiveTocEntry(slug)
  const targetTop =
    targetHeader.getBoundingClientRect().top + window.scrollY - TOC_SCROLL_TOP_OFFSET
  window.scrollTo({ top: Math.max(0, targetTop) })

  const href = tocEntry.getAttribute("href")
  if (href) {
    history.pushState({}, "", href)
  }
}

function setupToc() {
  for (const toc of document.getElementsByClassName("toc")) {
    const tocEntries = toc.querySelectorAll<HTMLAnchorElement>(
      'a.internal[data-for], a.internal[href^="#"]',
    )
    tocEntries.forEach((tocEntry) => {
      tocEntry.addEventListener("click", onTocEntryClick)
    })
    window.addCleanup(() => {
      tocEntries.forEach((tocEntry) => {
        tocEntry.removeEventListener("click", onTocEntryClick)
      })
    })
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
