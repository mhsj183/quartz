import { Root as HtmlRoot } from "hast"
import { QuartzTransformerPlugin } from "../../../../plugins/types"
import { Options } from "./types"
import { normalizeSummary, isZhipuEndpoint, shouldSkipNote, extractImageUrls } from "./utils"
import { createSummarySignature, readSummaryCache, writeSummaryCache } from "./cache"
import { checkCircuit, openCircuit, shouldOpenCircuit } from "./circuit-breaker"
import { callZhipuSummary, warnMissingKey, warnInvalidEndpoint } from "./api"

const defaultOptions: Options = {
  enabled: process.env.ZHIPU_SUMMARY_ENABLED === "true",
  apiKey: process.env.ZHIPU_API_KEY,
  model: process.env.ZHIPU_MODEL ?? "glm-4v-flash",
  endpoint: process.env.ZHIPU_API_ENDPOINT ?? "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  maxImages: 3,
  maxSummaryChars: 50,
  maxInputChars: 12000,
  requestTimeoutMs: 20000,
  retries: 2,
  skipIndexPages: true,
}

let hasWarnedDisabled = false

export const ZhipuSummary: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }

  return {
    name: "ZhipuSummary",
    htmlPlugins(ctx) {
      return [
        () => {
          return async (tree: HtmlRoot, file) => {
            if (!opts.enabled) {
              if (!hasWarnedDisabled) {
                console.log("[ZhipuSummary] disabled by ZHIPU_SUMMARY_ENABLED")
                hasWarnedDisabled = true
              }
              return
            }

            if (checkCircuit()) return

            const slug = file.data.slug
            if (shouldSkipNote(slug, opts.skipIndexPages)) return
            if (!slug) return

            const endpoint = opts.endpoint.trim()
            if (!isZhipuEndpoint(endpoint)) {
              warnInvalidEndpoint(endpoint)
              return
            }

            const apiKey = opts.apiKey?.trim()
            if (!apiKey) {
              warnMissingKey()
              return
            }

            const title = file.data.frontmatter?.title?.toString().trim() ?? ""
            const text = file.data.text?.trim() ?? ""
            if (!title || !text) return

            const baseUrl = ctx.cfg.configuration.baseUrl || "http://localhost"
            const imageUrls = extractImageUrls(tree, baseUrl, slug, opts.maxImages)
            const requestOpts = { ...opts, apiKey, endpoint }
            const signature = createSummarySignature(requestOpts, title, text, imageUrls)
            const cachedSummary = await readSummaryCache(slug, signature, opts.maxSummaryChars)
            if (cachedSummary) {
              file.data.aiSummary = cachedSummary
              return
            }

            let attempt = 0
            while (attempt <= opts.retries) {
              try {
                const rawSummary = await callZhipuSummary(requestOpts, title, text, imageUrls)
                const summary = normalizeSummary(rawSummary, opts.maxSummaryChars)
                if (summary) {
                  file.data.aiSummary = summary
                  await writeSummaryCache(slug, signature, summary).catch((err) => {
                    console.warn(
                      `[ZhipuSummary] cache write failed for ${slug}: ${
                        err instanceof Error ? err.message : String(err)
                      }`,
                    )
                  })
                }
                return
              } catch (err) {
                if (shouldOpenCircuit(err)) {
                  openCircuit()
                }
                attempt += 1
                if (attempt > opts.retries) {
                  console.warn(
                    `[ZhipuSummary] failed for ${slug}: ${
                      err instanceof Error ? err.message : String(err)
                    }`,
                  )
                  return
                }
              }
            }
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    aiSummary?: string
  }
}
