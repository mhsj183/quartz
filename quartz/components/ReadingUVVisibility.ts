export function shouldShowReadingUVForSlug(slug: string | undefined) {
  if (!slug || slug === "index" || slug === "404") {
    return false
  }

  if (slug.startsWith("tags/") || slug.endsWith("/index")) {
    return false
  }

  return true
}
