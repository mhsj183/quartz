import { FullSlug } from "../../util/path"
import { siteOrigin } from "../../util/seo"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"

export const RobotsTxt: QuartzEmitterPlugin = () => ({
  name: "RobotsTxt",
  async *emit(ctx) {
    const origin = siteOrigin(ctx.cfg.configuration)
    yield write({
      ctx,
      slug: "robots" as FullSlug,
      ext: ".txt",
      content: `User-agent: *
Allow: /

# AI search-engine crawlers – explicit allow for GEO
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Bytespider
Allow: /

User-agent: Meta-ExternalAgent
Allow: /

User-agent: Amazonbot
Allow: /

Sitemap: ${origin}/sitemap.xml
`,
    })
  },
  async *partialEmit() {},
})
