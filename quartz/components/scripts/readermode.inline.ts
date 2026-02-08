const STORAGE_KEY = "quartz-graph-visible"

function getGraphVisible(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === null ? true : v === "true"
  } catch {
    return true
  }
}

function setGraphVisible(visible: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(visible))
  } catch {
    /* ignore */
  }
}

function applyGraphVisibility(visible: boolean) {
  const graph = document.getElementById("graph-section")
  const buttons = document.getElementsByClassName("graph-toggle")
  if (graph) {
    graph.style.display = visible ? "" : "none"
  }
  for (const btn of buttons) {
    if (visible) {
      btn.classList.remove("graph-hidden")
      btn.setAttribute("aria-label", "收起关系图谱")
    } else {
      btn.classList.add("graph-hidden")
      btn.setAttribute("aria-label", "展开关系图谱")
    }
  }
}

document.addEventListener("nav", () => {
  const visible = getGraphVisible()
  applyGraphVisibility(visible)

  const toggleGraph = () => {
    const nextVisible = !getGraphVisible()
    setGraphVisible(nextVisible)
    applyGraphVisibility(nextVisible)
  }

  for (const btn of document.getElementsByClassName("graph-toggle")) {
    btn.addEventListener("click", toggleGraph)
    window.addCleanup(() => btn.removeEventListener("click", toggleGraph))
  }
})
