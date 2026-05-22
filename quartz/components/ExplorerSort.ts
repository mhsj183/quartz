import { FileTrieNode } from "../util/fileTrie"

type ExplorerSortableData = {
  slug: string
  title: string
  filePath: string
  publishedDate?: string
}

export function sortExplorerNodes<T extends ExplorerSortableData>(
  a: FileTrieNode<T>,
  b: FileTrieNode<T>,
): number {
  if (a.isFolder !== b.isFolder) {
    return a.isFolder ? -1 : 1
  }

  if (!a.isFolder && !b.isFolder) {
    const aDate = a.data?.publishedDate ? new Date(a.data.publishedDate).getTime() : undefined
    const bDate = b.data?.publishedDate ? new Date(b.data.publishedDate).getTime() : undefined

    if (aDate && bDate) {
      return bDate - aDate
    } else if (aDate && !bDate) {
      return -1
    } else if (!aDate && bDate) {
      return 1
    }
  }

  return a.displayName.localeCompare(b.displayName, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}
