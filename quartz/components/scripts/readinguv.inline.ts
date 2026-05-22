const VISITOR_ID_KEY = "mhsj-reading-uv-visitor-id"
const API_PATH = "/api/views"

function createVisitorId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function getVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY)
    if (existing) {
      return existing
    }

    const next = createVisitorId()
    localStorage.setItem(VISITOR_ID_KEY, next)
    return next
  } catch {
    return createVisitorId()
  }
}

function getCurrentArticlePath() {
  const counter = document.querySelector("[data-reading-uv]") as HTMLElement | null
  if (!counter) {
    return undefined
  }

  const path = location.pathname
  if (!path || !path.startsWith("/") || path.startsWith(API_PATH)) {
    return undefined
  }

  return path
}

function setCounterText(text: string) {
  const value = document.querySelector("[data-reading-uv-value]") as HTMLElement | null
  if (value) {
    value.textContent = text
  }
}

function hideCounter() {
  const counter = document.querySelector("[data-reading-uv]") as HTMLElement | null
  if (counter) {
    counter.hidden = true
  }
}

async function updateReadingUV() {
  const path = getCurrentArticlePath()
  if (!path) {
    hideCounter()
    return
  }

  setCounterText("...")

  try {
    const response = await fetch(API_PATH, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        path,
        vid: getVisitorId(),
      }),
    })

    if (!response.ok) {
      hideCounter()
      return
    }

    const payload = (await response.json()) as { uv?: unknown }
    if (typeof payload.uv !== "number") {
      hideCounter()
      return
    }

    setCounterText(String(payload.uv))
  } catch {
    hideCounter()
  }
}

document.addEventListener("nav", updateReadingUV)
