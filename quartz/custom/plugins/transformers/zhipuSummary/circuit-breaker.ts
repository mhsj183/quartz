let isCircuitOpen = false
let hasWarnedCircuitOpen = false

export function shouldOpenCircuit(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return (
    err.message.includes("HTTP 401") ||
    err.message.includes("HTTP 429") ||
    err.message.includes('"code":"1113"')
  )
}

/** Returns true if the circuit is open and the caller should skip processing. */
export function checkCircuit(): boolean {
  if (isCircuitOpen) {
    if (!hasWarnedCircuitOpen) {
      console.warn("[ZhipuSummary] circuit open: skipping remaining notes in this build")
      hasWarnedCircuitOpen = true
    }
    return true
  }
  return false
}

export function openCircuit(): void {
  isCircuitOpen = true
}
