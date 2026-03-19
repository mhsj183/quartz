import { Options, ZhipuMessagePart, ZhipuRequestPayload, ZhipuResponse } from "./types"
import { clampTextByChars } from "./utils"

let hasWarnedMissingKey = false
let hasWarnedInvalidEndpoint = false

export function warnMissingKey(): void {
  if (!hasWarnedMissingKey) {
    console.warn("[ZhipuSummary] skipped: missing ZHIPU_API_KEY")
    hasWarnedMissingKey = true
  }
}

export function warnInvalidEndpoint(endpoint: string): void {
  if (!hasWarnedInvalidEndpoint) {
    console.warn(`[ZhipuSummary] skipped: endpoint is not Zhipu (${endpoint})`)
    hasWarnedInvalidEndpoint = true
  }
}

export async function callZhipuSummary(
  opts: Options,
  title: string,
  text: string,
  imageUrls: string[],
): Promise<string> {
  const prompt = [
    "请根据以下笔记内容输出总结。",
    `要求：1) 输出不超过${opts.maxSummaryChars}字；2) 使用中文；3) 语言精炼、表达清晰；4) 只输出摘要正文，不要前缀、标题或解释。`,
    `标题：${title}`,
    `正文：${clampTextByChars(text, opts.maxInputChars)}`,
  ].join("\n")

  const variants: ZhipuRequestPayload[] = []

  // 优先尝试携带图片的多模态请求
  if (imageUrls.length > 0) {
    const messageParts: ZhipuMessagePart[] = [{ type: "text", text: prompt }]
    for (const url of imageUrls) {
      messageParts.push({ type: "image_url", image_url: { url } })
    }
    variants.push({
      model: opts.model,
      messages: [{ role: "user", content: messageParts }],
      temperature: 0.3,
    })
  }

  // 兼容部分模型/网关仅接受单文本消息的场景
  variants.push(
    {
      model: opts.model,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      temperature: 0.3,
    },
    {
      model: opts.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    },
  )

  let lastErr: unknown = null
  for (const payload of variants) {
    try {
      return await callZhipuOnce(opts, payload)
    } catch (err) {
      lastErr = err
      // 参数错误时尝试下一个兼容 payload，其他错误直接抛出交给上层重试
      if (err instanceof Error && err.message.includes("HTTP 400")) {
        continue
      }
      throw err
    }
  }

  throw lastErr ?? new Error("All Zhipu payload variants failed")
}

async function callZhipuOnce(opts: Options, payload: ZhipuRequestPayload): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.requestTimeoutMs)

  try {
    const response = await fetch(opts.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(`HTTP ${response.status}: ${body}`)
    }

    const data = (await response.json()) as ZhipuResponse
    const content = data.choices?.[0]?.message?.content
    if (typeof content === "string") return content
    if (Array.isArray(content)) {
      const textPart = content.find((part) => part.type === "text" && typeof part.text === "string")
      if (textPart?.text) return textPart.text
    }
    throw new Error("Model response has no text content")
  } finally {
    clearTimeout(timeout)
  }
}
