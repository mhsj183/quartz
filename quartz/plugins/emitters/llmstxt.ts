import { FullSlug, simplifySlug } from "../../util/path"
import { isSeoIndexableSlug, siteOrigin } from "../../util/seo"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { getDate } from "../../components/Date"

/**
 * Emits llms.txt and llms-full.txt at site root.
 *
 * llms.txt  – concise site overview + article index for LLM discovery
 * llms-full.txt – same header, plus full plain-text body of every article
 *
 * Spec reference: https://llmstxt.org/
 */
export const LlmsTxt: QuartzEmitterPlugin = () => ({
  name: "LlmsTxt",
  async *emit(ctx, content) {
    const cfg = ctx.cfg.configuration
    const origin = siteOrigin(cfg)

    // Collect indexable articles, sorted by date descending
    const articles: {
      title: string
      url: string
      description: string
      date: Date | undefined
      tags: string[]
      text: string
    }[] = []

    for (const [_tree, file] of content) {
      const slug = file.data.slug!
      if (!isSeoIndexableSlug(slug) || slug === "index") continue
      // Skip folder index pages
      if (slug.endsWith("/index")) continue

      const fm = file.data.frontmatter
      const date = getDate(cfg, file.data)
      const simpleSlug = simplifySlug(slug as FullSlug)

      articles.push({
        title: fm?.title ?? slug,
        url: `${origin}/${encodeURI(simpleSlug)}`,
        description: fm?.description ?? file.data.description?.trim() ?? "",
        date: date ?? undefined,
        tags: fm?.tags ?? [],
        text: file.data.text ?? "",
      })
    }

    // Sort newest first
    articles.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return b.date.getTime() - a.date.getTime()
    })

    // --- llms.txt (concise) ---
    const lines: string[] = [
      `# ${cfg.pageTitle}`,
      "",
      "> 原创内容，记录对 AI 产品、Agentic-first 和产品实践的长期思考。",
      "",
      `- Website: ${origin}`,
      `- Language: zh-CN`,
      `- RSS: ${origin}/index.xml`,
      `- Sitemap: ${origin}/sitemap.xml`,
      "",
      "## Articles",
      "",
    ]

    for (const a of articles) {
      const datePart = a.date ? ` (${a.date.toISOString().slice(0, 10)})` : ""
      lines.push(`- [${a.title}](${a.url})${datePart}`)
      if (a.description) {
        lines.push(`  ${a.description}`)
      }
    }

    lines.push("")

    yield write({
      ctx,
      slug: "llms" as FullSlug,
      ext: ".txt",
      content: lines.join("\n"),
    })

    // --- llms-full.txt (with full text) ---
    const fullLines: string[] = [
      ...lines.slice(0, lines.indexOf("## Articles")),
      "## Articles (full text)",
      "",
    ]

    for (const a of articles) {
      const datePart = a.date ? ` (${a.date.toISOString().slice(0, 10)})` : ""
      fullLines.push(`### ${a.title}${datePart}`)
      fullLines.push("")
      fullLines.push(`URL: ${a.url}`)
      if (a.tags.length > 0) {
        fullLines.push(`Tags: ${a.tags.join(", ")}`)
      }
      if (a.description) {
        fullLines.push(`Description: ${a.description}`)
      }
      fullLines.push("")
      fullLines.push(a.text)
      fullLines.push("")
      fullLines.push("---")
      fullLines.push("")
    }

    yield write({
      ctx,
      slug: "llms-full" as FullSlug,
      ext: ".txt",
      content: fullLines.join("\n"),
    })
  },
  async *partialEmit() {},
})
