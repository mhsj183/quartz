import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  betweenContentAndHr: [
    Component.ConditionalRender({
      component: Component.SourceLink(),
      condition: (page) => {
        const slug = page.fileData?.slug ?? ""
        if (slug.endsWith("/index") || slug.startsWith("tags/")) return false
        const fm = (page.fileData?.frontmatter ?? {}) as Record<string, unknown>
        const hasSource =
          (typeof fm["源地址"] === "string" && !!fm["源地址"]?.trim()) ||
          (typeof fm.sourceUrl === "string" && !!(fm.sourceUrl as string)?.trim()) ||
          (typeof fm.source === "string" && !!(fm.source as string)?.trim()) ||
          (typeof fm.source_url === "string" && !!(fm.source_url as string)?.trim())
        return !!hasSource
      },
    }),
  ],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/mhsj183",
      WeChat: "#wechat",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer({ folderDefaultState: "open" }),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({ folderDefaultState: "open" }),
  ],
  right: [],
}
