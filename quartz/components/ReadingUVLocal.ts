const LOCAL_READING_UV_COUNT = 1

export function isLocalReadingUVHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

export function getLocalReadingUVCount() {
  return LOCAL_READING_UV_COUNT
}
