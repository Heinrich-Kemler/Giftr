// SERVER-SIDE ONLY - never import in a client component.
// All Bitrefill HTTP calls live in this file. Endpoints are marked with a
// '// TODO: verify endpoint' comment since exact shapes are confirmed on the day.

import { config } from "./config"
import type { BitrefillProduct } from "./types"

// Fallback catalogue used when the live API is unavailable or returns nothing.
// Keeps search/getProduct usable in demos and offline builds.
export const FALLBACK_PRODUCTS: BitrefillProduct[] = [
  {
    id: "amazon-de",
    name: "Amazon Germany",
    slug: "amazon-de",
    type: "giftcard",
    countryCode: "DE",
    currency: "EUR",
    denominations: [5, 10, 15, 25, 50, 100],
    description: "Amazon.de gift card redeemable for millions of products.",
  },
  {
    id: "netflix-de",
    name: "Netflix Germany",
    slug: "netflix-de",
    type: "giftcard",
    countryCode: "DE",
    currency: "EUR",
    denominations: [5, 10, 15, 25, 50, 100],
    description: "Netflix gift card for streaming films and series.",
  },
  {
    id: "spotify-de",
    name: "Spotify Germany",
    slug: "spotify-de",
    type: "giftcard",
    countryCode: "DE",
    currency: "EUR",
    denominations: [5, 10, 15, 25, 50, 100],
    description: "Spotify gift card for ad-free music streaming.",
  },
  {
    id: "steam-de",
    name: "Steam Germany",
    slug: "steam-de",
    type: "giftcard",
    countryCode: "DE",
    currency: "EUR",
    denominations: [5, 10, 15, 25, 50, 100],
    description: "Steam wallet code for games and in-game content.",
  },
  {
    id: "google-play-de",
    name: "Google Play Germany",
    slug: "google-play-de",
    type: "giftcard",
    countryCode: "DE",
    currency: "EUR",
    denominations: [5, 10, 15, 25, 50, 100],
    description: "Google Play gift card for apps, games and media.",
  },
]

// HTTP Basic auth header from the configured key/secret pair.
function authHeader(): string {
  const raw = config.bitrefillKey + ":" + config.bitrefillSecret
  return "Basic " + Buffer.from(raw).toString("base64")
}

// Fetch with a hard 10s timeout via AbortController.
async function fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    return await fetch(config.bitrefillBase + path, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
        ...(init.headers ?? {}),
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

// Throw on any non-2xx response, including the status code and body text.
async function ensureOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Bitrefill request failed: ${res.status} ${body}`)
  }
}

// Read a string field from an unknown record without using implicit any.
function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === "string" ? value : undefined
}

// Read a number field from an unknown record, coercing numeric strings.
function readNumber(record: Record<string, unknown>, value: unknown): number | undefined {
  void record
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

// Map an unknown JSON value to a BitrefillProduct defensively.
function toProduct(raw: unknown): BitrefillProduct | null {
  if (raw === null || typeof raw !== "object") {
    return null
  }
  const record = raw as Record<string, unknown>

  const id = readString(record, "id") ?? readString(record, "slug")
  if (id === undefined) {
    return null
  }

  const slug = readString(record, "slug") ?? id
  const name = readString(record, "name") ?? slug
  const type = readString(record, "type") ?? "giftcard"
  const countryCode =
    readString(record, "countryCode") ?? readString(record, "country_code") ?? readString(record, "country") ?? "DE"
  const currency = readString(record, "currency") ?? "EUR"
  const description = readString(record, "description")

  const denominations: number[] = []
  const rawDenominations = record["denominations"]
  if (Array.isArray(rawDenominations)) {
    for (const entry of rawDenominations) {
      const num = readNumber(record, entry)
      if (num !== undefined) {
        denominations.push(num)
      }
    }
  }

  const product: BitrefillProduct = {
    id,
    name,
    slug,
    type,
    countryCode,
    currency,
    denominations,
  }
  if (description !== undefined) {
    product.description = description
  }
  return product
}

// Extract an array of product-like entries from an unknown response shape.
function extractProductArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload !== null && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    const candidates = [record["data"], record["products"], record["results"], record["items"]]
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
      }
    }
  }
  return []
}

// Filter the fallback catalogue by a case-insensitive name/type match.
// If nothing matches, return the entire catalogue so search is never empty.
function filterFallback(query: string): BitrefillProduct[] {
  const needle = query.trim().toLowerCase()
  if (needle === "") {
    return [...FALLBACK_PRODUCTS]
  }
  const matches = FALLBACK_PRODUCTS.filter(
    (product) => product.name.toLowerCase().includes(needle) || product.type.toLowerCase().includes(needle),
  )
  return matches.length > 0 ? matches : [...FALLBACK_PRODUCTS]
}

// Search the Bitrefill catalogue. Falls back to the local catalogue when the
// API call fails or returns an empty list, so this never resolves to [].
export async function searchProducts({
  query,
  country,
  currency,
}: {
  query: string
  country?: string
  currency?: string
}): Promise<BitrefillProduct[]> {
  try {
    const params = new URLSearchParams()
    params.set("query", query)
    if (country !== undefined) {
      params.set("country", country)
    }
    if (currency !== undefined) {
      params.set("currency", currency)
    }
    // TODO: verify endpoint
    const res = await fetchWithTimeout(`/products?${params.toString()}`, { method: "GET" })
    await ensureOk(res)
    const payload: unknown = await res.json()
    const products = extractProductArray(payload)
      .map(toProduct)
      .filter((product): product is BitrefillProduct => product !== null)
    if (products.length === 0) {
      return filterFallback(query)
    }
    return products
  } catch {
    return filterFallback(query)
  }
}

// Fetch a single product by id.
export async function getProduct(id: string): Promise<BitrefillProduct> {
  // TODO: verify endpoint
  const res = await fetchWithTimeout(`/products/${encodeURIComponent(id)}`, { method: "GET" })
  await ensureOk(res)
  const payload: unknown = await res.json()
  const source =
    payload !== null && typeof payload === "object" && "data" in (payload as Record<string, unknown>)
      ? (payload as Record<string, unknown>)["data"]
      : payload
  const product = toProduct(source)
  if (product === null) {
    throw new Error(`Bitrefill product not found or malformed: ${id}`)
  }
  return product
}

// Create an order for a gift card. When mock mode is enabled, returns a
// synthetic order without making any API call.
export async function createOrder({
  productId,
  valueInCents,
  email,
}: {
  productId: string
  valueInCents: number
  email: string
}): Promise<{ orderId: string; giftCode: string; status: string }> {
  if (config.bitrefillMock) {
    return {
      orderId: "mock-" + Date.now(),
      giftCode: "GIFTR-DEMO-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      status: "completed",
    }
  }

  // TODO: verify endpoint
  const res = await fetchWithTimeout("/orders", {
    method: "POST",
    body: JSON.stringify({
      product_id: productId,
      value: valueInCents / 100,
      currency: "EUR",
      email,
    }),
  })
  await ensureOk(res)
  const payload: unknown = await res.json()
  const source =
    payload !== null && typeof payload === "object" && "data" in (payload as Record<string, unknown>)
      ? ((payload as Record<string, unknown>)["data"] as unknown)
      : payload
  const record =
    source !== null && typeof source === "object" ? (source as Record<string, unknown>) : ({} as Record<string, unknown>)

  const orderId = readString(record, "id") ?? readString(record, "orderId") ?? readString(record, "order_id") ?? ""
  const giftCode =
    readString(record, "giftCode") ??
    readString(record, "gift_code") ??
    readString(record, "code") ??
    readString(record, "pinCode") ??
    readString(record, "pin_code") ??
    ""
  const status = readString(record, "status") ?? "pending"

  return { orderId, giftCode, status }
}

// Lightweight connectivity check against the Bitrefill API.
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  if (config.bitrefillMock) {
    return { ok: true }
  }
  try {
    // TODO: verify endpoint
    const res = await fetchWithTimeout("/ping", { method: "GET" })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { ok: false, error: `${res.status} ${body}` }
    }
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}
