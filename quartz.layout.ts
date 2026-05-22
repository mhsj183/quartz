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
        return true
      },
    }),
  ],
  afterBody: [
    Component.ConditionalRender({
      component: Component.ReadingUV(),
      condition: (page) => {
        const slug = page.fileData?.slug ?? ""
        if (
          slug === "index" ||
          slug === "404" ||
          slug.endsWith("/index") ||
          slug.startsWith("tags/")
        ) {
          return false
        }
        return true
      },
    }),
  ],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/mhsj183",
      WeChat: "#wechat",
      Email: "mailto:fyajiao@gmail.com",
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
    Component.ContentMetaWithGraphToggle(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        { Component: Component.Search(), grow: true },
        { Component: Component.Darkmode(), grow: false, shrink: false },
      ],
      gap: "0.85rem",
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
        { Component: Component.Search(), grow: true },
        { Component: Component.Darkmode(), grow: false, shrink: false },
      ],
      gap: "0.85rem",
    }),
    Component.Explorer({ folderDefaultState: "open" }),
  ],
  right: [],
}
