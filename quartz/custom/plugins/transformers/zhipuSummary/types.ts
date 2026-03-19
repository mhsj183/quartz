export interface Options {
  enabled: boolean
  apiKey?: string
  model: string
  endpoint: string
  maxImages: number
  maxSummaryChars: number
  maxInputChars: number
  requestTimeoutMs: number
  retries: number
  skipIndexPages: boolean
}

export type CachedSummary = {
  version: number
  slug: string
  signature: string
  summary: string
  updatedAt: string
}

export type ZhipuMessagePart = {
  type: "text" | "image_url"
  text?: string
  image_url?: { url: string }
}

export type ZhipuRequestPayload = {
  model: string
  messages: Array<{
    role: "user"
    content: string | ZhipuMessagePart[]
  }>
  temperature: number
}

export type ZhipuResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}
