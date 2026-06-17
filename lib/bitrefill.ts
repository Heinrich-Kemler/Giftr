// SERVER-SIDE ONLY - never import in a client component.
// All Bitrefill HTTP calls live in this file.
//
// Live (non-mock) integration uses the Bitrefill REST API:
//   Base:    https://api.bitrefill.com/v2
//   Auth:    Authorization: Bearer <BITREFILL_API_KEY>
//   Header:  a real User-Agent is required (Cloudflare returns 403 without one)
// Flow:      GET /products/search -> POST /invoices -> poll the order until
//            orders[0].status === "delivered" && redemption_available, then read
//            redemption_info. We deliberately trust the per-order status, not the
//            top-level invoice rollups, which can lag for balance payments.
// Test products: `test-gift-card-code` (crypto, denoms 10/20/30/50/100) and
//            `delos-syldavia` (payment_method "balance"). See AGENTS.md sec 7.
// The hosted eCommerce MCP (https://api.bitrefill.com/mcp/<KEY>) is an
// alternative transport; this client uses REST for deterministic server control.
//
// Set BITREFILL_MOCK=true to bypass every network call and return deterministic
// demo data (no real purchase, no credentials required).

import { config } from "./config"
import type { BitrefillOrderResult, BitrefillProduct, BitrefillRedemption } from "./types"

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

// How long to keep polling a freshly created order for delivery, and how often.
// Test products deliver immediately, so this usually resolves on the first read.
const POLL_ATTEMPTS = 6
const POLL_DELAY_MS = 1200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Bearer auth header from the configured API key.
function authHeader(): string {
  return "Bearer " + config.bitrefillKey
}

// Fetch with a hard 10s timeout via AbortController. Sends auth, JSON and a real
// User-Agent on every call.
async function fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    return await fetch(config.bitrefillBase + path, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader(),
        "User-Agent": config.bitrefillUserAgent,
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
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return undefined
}

// Coerce an unknown value to a finite number.
function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

// Pull denominations out of a product's `packages` array and/or `range` object.
function readDenominations(record: Record<string, unknown>): number[] {
  const out: number[] = []
  const rawDenoms = record["denominations"]
  if (Array.isArray(rawDenoms)) {
    for (const entry of rawDenoms) {
      const num = toNumber(entry)
      if (num !== undefined) out.push(num)
    }
  }
  const packages = record["packages"]
  if (Array.isArray(packages)) {
    for (const pkg of packages) {
      const pkgRecord = asRecord(pkg)
      if (pkgRecord) {
        const value = toNumber(pkgRecord["value"]) ?? toNumber(pkgRecord["amount"])
        if (value !== undefined) out.push(value)
      }
    }
  }
  if (out.length === 0) {
    const range = asRecord(record["range"])
    if (range) {
      const min = toNumber(range["min"])
      const max = toNumber(range["max"])
      if (min !== undefined) out.push(min)
      if (max !== undefined && max !== min) out.push(max)
    }
  }
  return out
}

// Map an unknown JSON value to a BitrefillProduct defensively.
function toProduct(raw: unknown): BitrefillProduct | null {
  const record = asRecord(raw)
  if (record === null) return null

  const id = readString(record, "id") ?? readString(record, "slug")
  if (id === undefined) return null

  const slug = readString(record, "slug") ?? id
  const name = readString(record, "name") ?? slug
  const type = readString(record, "type") ?? "giftcard"
  const countryCode =
    readString(record, "countryCode") ??
    readString(record, "country_code") ??
    readString(record, "country") ??
    "DE"
  const currency = readString(record, "currency") ?? "EUR"
  const description = readString(record, "description")

  const product: BitrefillProduct = {
    id,
    name,
    slug,
    type,
    countryCode,
    currency,
    denominations: readDenominations(record),
  }
  if (description !== undefined) {
    product.description = description
  }
  return product
}

// Extract an array of product-like entries from an unknown response shape.
function extractProductArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  const record = asRecord(payload)
  if (record) {
    const candidates = [record["data"], record["products"], record["results"], record["items"]]
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate
    }
  }
  return []
}

// Filter the fallback catalogue by a case-insensitive name/type match.
// If nothing matches, return the entire catalogue so search is never empty.
function filterFallback(query: string): BitrefillProduct[] {
  const needle = query.trim().toLowerCase()
  if (needle === "") return [...FALLBACK_PRODUCTS]
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
    params.set("q", query)
    if (country !== undefined) params.set("country", country)
    if (currency !== undefined) params.set("currency", currency)
    const res = await fetchWithTimeout(`/products/search?${params.toString()}`, { method: "GET" })
    await ensureOk(res)
    const payload: unknown = await res.json()
    const products = extractProductArray(payload)
      .map(toProduct)
      .filter((product): product is BitrefillProduct => product !== null)
    return products.length === 0 ? filterFallback(query) : products
  } catch {
    return filterFallback(query)
  }
}

// Fetch a single product by id.
export async function getProduct(id: string): Promise<BitrefillProduct> {
  const res = await fetchWithTimeout(`/products/${encodeURIComponent(id)}`, { method: "GET" })
  await ensureOk(res)
  const payload: unknown = await res.json()
  const record = asRecord(payload)
  const source = record && "data" in record ? record["data"] : payload
  const product = toProduct(source)
  if (product === null) {
    throw new Error(`Bitrefill product not found or malformed: ${id}`)
  }
  return product
}

// ---- order / invoice parsing -------------------------------------------------

interface ParsedOrder {
  id: string
  status: string
  redemptionAvailable: boolean
  redemption?: BitrefillRedemption
}

// Pull redemption details out of a redemption_info object, tolerating the many
// field-name variants Bitrefill uses across products.
function parseRedemption(raw: unknown): BitrefillRedemption | undefined {
  const record = asRecord(raw)
  if (record === null) return undefined
  const redemption: BitrefillRedemption = {}
  const code = readString(record, "code") ?? readString(record, "pinCode") ?? readString(record, "pin_code")
  const pin = readString(record, "pin")
  const link =
    readString(record, "redemptionLink") ??
    readString(record, "redemption_link") ??
    readString(record, "access_link") ??
    readString(record, "link") ??
    readString(record, "url")
  const barcode = readString(record, "barcode") ?? readString(record, "barcodeFormat")
  const instructions = readString(record, "instructions")
  if (code !== undefined) redemption.code = code
  if (pin !== undefined) redemption.pin = pin
  if (link !== undefined) redemption.link = link
  if (barcode !== undefined) redemption.barcode = barcode
  if (instructions !== undefined) redemption.instructions = instructions
  return Object.keys(redemption).length > 0 ? redemption : undefined
}

function parseOrder(raw: unknown): ParsedOrder | null {
  const record = asRecord(raw)
  if (record === null) return null
  const id = readString(record, "id") ?? readString(record, "order_id") ?? readString(record, "orderId") ?? ""
  const status = readString(record, "status") ?? "pending"
  const redemptionAvailable = record["redemption_available"] === true || record["redemptionAvailable"] === true
  const redemption = parseRedemption(record["redemption_info"] ?? record["redemptionInfo"])
  return { id, status, redemptionAvailable, redemption }
}

// Find the first order in an invoice/order response of any shape.
function extractFirstOrder(payload: unknown): ParsedOrder | null {
  const record = asRecord(payload)
  const source = record && "data" in record ? asRecord(record["data"]) ?? record : record
  if (source === null) return parseOrder(payload)
  const orders = source["orders"]
  if (Array.isArray(orders) && orders.length > 0) {
    return parseOrder(orders[0])
  }
  // The payload may itself be a single order (e.g. GET /orders/{id}).
  return parseOrder(source)
}

function extractInvoiceId(payload: unknown): string | undefined {
  const record = asRecord(payload)
  const source = record && "data" in record ? asRecord(record["data"]) ?? record : record
  if (source === null) return undefined
  return readString(source, "id") ?? readString(source, "invoice_id") ?? readString(source, "invoiceId")
}

function redemptionCode(order: ParsedOrder): string {
  return order.redemption?.code ?? order.redemption?.pin ?? order.redemption?.link ?? ""
}

// Re-read an order (by order id, falling back to the invoice) and return it.
async function fetchOrderState(orderId: string, invoiceId: string | undefined): Promise<ParsedOrder | null> {
  if (orderId !== "") {
    try {
      const res = await fetchWithTimeout(`/orders/${encodeURIComponent(orderId)}`, { method: "GET" })
      if (res.ok) {
        return extractFirstOrder(await res.json())
      }
    } catch {
      // fall through to invoice lookup
    }
  }
  if (invoiceId !== undefined && invoiceId !== "") {
    try {
      const res = await fetchWithTimeout(`/invoices/${encodeURIComponent(invoiceId)}`, { method: "GET" })
      if (res.ok) {
        return extractFirstOrder(await res.json())
      }
    } catch {
      // give up; caller treats as not-yet-delivered
    }
  }
  return null
}

// ---- create order ------------------------------------------------------------

// Create an order for a gift card and (in live mode) poll until it is delivered.
// In mock mode, returns a synthetic delivered order with no API call.
export async function createOrder({
  productId,
  valueInCents,
  email,
}: {
  productId: string
  valueInCents: number
  email: string
}): Promise<BitrefillOrderResult> {
  if (config.bitrefillMock) {
    const code = "GIFTR-DEMO-" + Math.random().toString(36).slice(2, 6).toUpperCase()
    return {
      orderId: "mock-" + Date.now(),
      giftCode: code,
      status: "completed",
      redemption: { code, instructions: "Demo redemption code (mock mode; no real purchase)." },
    }
  }

  const value = valueInCents / 100
  const paymentMethod = config.bitrefillPaymentMethod
  const isBalance = paymentMethod === "balance"

  const body: Record<string, unknown> = {
    products: [
      {
        product_id: productId,
        // Many products (incl. the test slugs) key the denomination by package_id.
        package_id: String(value),
        value,
        quantity: 1,
      },
    ],
    payment_method: paymentMethod,
    email,
    ...(isBalance
      ? { balance_currency: config.bitrefillBalanceCurrency, auto_pay: true }
      : { return_payment_link: true }),
  }

  const res = await fetchWithTimeout("/invoices", {
    method: "POST",
    body: JSON.stringify(body),
  })
  await ensureOk(res)
  const payload: unknown = await res.json()

  const invoiceId = extractInvoiceId(payload)
  let order = extractFirstOrder(payload)
  const orderId = order?.id ?? ""

  // Poll until the per-order status reports delivery (or we give up). We trust
  // orders[0].status, not the top-level invoice rollups, per Bitrefill guidance.
  let attempts = 0
  while (
    (order === null || order.status !== "delivered" || !order.redemptionAvailable) &&
    attempts < POLL_ATTEMPTS
  ) {
    await sleep(POLL_DELAY_MS)
    const next = await fetchOrderState(order?.id ?? orderId, invoiceId)
    if (next !== null) {
      order = next
      if (order.status === "delivered" && order.redemptionAvailable) break
    }
    attempts += 1
  }

  if (order === null) {
    throw new Error("Bitrefill invoice created but no order was returned")
  }

  const result: BitrefillOrderResult = {
    orderId: order.id !== "" ? order.id : orderId,
    giftCode: redemptionCode(order),
    status: order.status,
  }
  if (order.redemption !== undefined) {
    result.redemption = order.redemption
  }
  return result
}

// Lightweight connectivity check against the Bitrefill API.
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  // Mock mode is healthy by definition: the app never calls the real API.
  if (config.bitrefillMock) {
    return { ok: true }
  }
  try {
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

// Read the Bitrefill account balance. Useful for confirming a balance debit
// after a live purchase. Returns null when unavailable.
export async function getAccountBalance(): Promise<{ balance: number; currency: string } | null> {
  if (config.bitrefillMock) {
    return { balance: 0, currency: config.bitrefillBalanceCurrency }
  }
  try {
    const res = await fetchWithTimeout("/accounts/balance", { method: "GET" })
    if (!res.ok) return null
    const record = asRecord(await res.json())
    const source = record && "data" in record ? asRecord(record["data"]) ?? record : record
    if (source === null) return null
    const balance = toNumber(source["balance"])
    const currency = readString(source, "currency") ?? config.bitrefillBalanceCurrency
    return balance === undefined ? null : { balance, currency }
  } catch {
    return null
  }
}
