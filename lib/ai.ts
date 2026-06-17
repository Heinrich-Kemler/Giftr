// SERVER-SIDE ONLY - never import in a client component.
// AI-powered gift selection using OpenAI. The OpenAI client is instantiated
// lazily inside selectGift so that 'npm run build' works with no env vars set.
// When OPENAI_API_KEY is not configured the function falls back to a
// deterministic selection (demo mode) so the personal-gift and raffle-draw
// flows still complete end-to-end without any network call.

import OpenAI from "openai"
import { config } from "./config"
import type { AIGiftSelection, BitrefillProduct } from "./types"

const SYSTEM_PROMPT =
  "You are a gifting agent. Given a description of the recipient and occasion, and a list of available Bitrefill products, select the single most appropriate product and denomination. Return JSON only: { productId, productName, amount, reasoning }"

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Deterministic, no-network selection used when no OpenAI key is configured
// (demo mode). Picks the first product that has denominations and the largest
// denomination within budget (falling back to the smallest if none qualify),
// so the gift/raffle flows always produce a valid, in-budget AIGiftSelection.
function deterministicSelectGift(
  budget: number,
  availableProducts: BitrefillProduct[],
): AIGiftSelection {
  const product = availableProducts.find((p) => p.denominations.length > 0) ?? availableProducts[0]
  const denominations = product.denominations.length > 0 ? product.denominations : [budget]
  const affordable = denominations.filter((d) => d <= budget)
  const amount = affordable.length > 0 ? Math.max(...affordable) : Math.min(...denominations)
  return {
    productId: product.id,
    productName: product.name,
    amount,
    reasoning: "Demo mode: deterministic selection (no OpenAI key configured).",
  }
}

function isValidSelection(value: unknown): value is AIGiftSelection {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.productId === "string" &&
    typeof candidate.productName === "string" &&
    typeof candidate.amount === "number" &&
    Number.isFinite(candidate.amount) &&
    candidate.amount > 0 &&
    typeof candidate.reasoning === "string"
  )
}

async function attemptSelectGift(params: {
  description: string
  budget: number
  availableProducts: BitrefillProduct[]
}): Promise<AIGiftSelection> {
  const { description, budget, availableProducts } = params

  const client = new OpenAI({ apiKey: config.openaiKey })

  const productList = availableProducts.map((product) => ({
    id: product.id,
    name: product.name,
    type: product.type,
    denominations: product.denominations,
  }))

  const userMessage = [
    `Recipient description and occasion: ${description}`,
    `Budget (euros): ${budget}`,
    "Available Bitrefill products:",
    JSON.stringify(productList),
    "The selected amount must be less than or equal to the budget and must be one of the chosen product's denominations.",
  ].join("\n")

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("OpenAI returned an empty response")
  }

  const parsed: unknown = JSON.parse(content)

  if (typeof parsed === "object" && parsed !== null) {
    const candidate = parsed as Record<string, unknown>
    if (candidate.amount !== undefined) {
      candidate.amount = Number(candidate.amount)
    }
  }

  if (!isValidSelection(parsed)) {
    throw new Error("OpenAI response failed validation")
  }

  return {
    productId: parsed.productId,
    productName: parsed.productName,
    amount: Number(parsed.amount),
    reasoning: parsed.reasoning,
  }
}

export async function selectGift({
  description,
  budget,
  availableProducts,
}: {
  description: string
  budget: number
  availableProducts: BitrefillProduct[]
}): Promise<AIGiftSelection> {
  if (availableProducts.length === 0) {
    throw new Error("No products available to select from")
  }

  // Demo mode: no OpenAI key configured -> deterministic selection, no network.
  if (config.openaiKey === "") {
    return deterministicSelectGift(budget, availableProducts)
  }

  let lastError: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await attemptSelectGift({ description, budget, availableProducts })
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS - 1) {
        await delay(RETRY_DELAY_MS)
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to select a gift")
}
