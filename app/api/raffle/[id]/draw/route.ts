// POST /api/raffle/[id]/draw
// Draws winners for a raffle, purchases a gift for each winner sequentially,
// records gifts, emails winners, and emails the creator a summary. A failure to
// purchase for one winner is recorded and does not abort the overall draw.

import { NextResponse } from "next/server"
import { randomInt } from "node:crypto"
import { z } from "zod"
import { getServiceClient } from "@/lib/supabase"
import { searchProducts, createOrder } from "@/lib/bitrefill"
import { selectGift } from "@/lib/ai"
import { sendRaffleWinnerEmail, sendRaffleCreatorSummary } from "@/lib/email"
import {
  checkRateLimit,
  getClientIp,
  hashSecretToken,
  isValidUuid,
  jsonResponse,
  maskEmail,
  normalizeEmail,
  safeCompareHash,
} from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const drawSchema = z.object({
  creatorEmail: z.string().email(),
  manageToken: z.string().min(32),
})

interface RaffleEntry {
  id: string
  name: string
  email: string
}

interface CreatorSummaryWinner {
  name: string
  email: string
  productName: string
}

interface DrawResultWinner {
  name: string
  email: string
  productName: string
}

// Pause execution for the given number of milliseconds.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!isValidUuid(params.id)) {
    return jsonResponse({ error: "not found" }, { status: 404 })
  }

  const rateLimit = checkRateLimit({
    key: `raffle-draw:${params.id}:${getClientIp(req)}`,
    limit: 10,
  })
  if (!rateLimit.ok) {
    return jsonResponse(
      { error: "Too many draw attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = drawSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid request" }, { status: 400 })
  }

  const creatorEmail = normalizeEmail(parsed.data.creatorEmail)
  const submittedTokenHash = hashSecretToken(parsed.data.manageToken)
  const supabase = getServiceClient()

  const { data: raffle, error: raffleError } = await supabase
    .from("raffles")
    .select("id, title, occasion, budget_cents, num_winners, creator_email, manage_token_hash, status")
    .eq("id", params.id)
    .maybeSingle()

  if (raffleError || raffle === null) {
    return jsonResponse({ error: "not found" }, { status: 404 })
  }

  const storedTokenHash = raffle.manage_token_hash as string | null
  if (
    creatorEmail !== normalizeEmail(raffle.creator_email as string) ||
    storedTokenHash === null ||
    !safeCompareHash(submittedTokenHash, storedTokenHash)
  ) {
    return jsonResponse({ error: "Not authorized" }, { status: 403 })
  }

  if (raffle.status !== "active") {
    return jsonResponse({ error: "Already drawn" }, { status: 400 })
  }

  const occasion = raffle.occasion as string
  const budgetCents = raffle.budget_cents as number
  const numWinners = raffle.num_winners as number
  const raffleTitle = raffle.title as string
  const raffleCreatorEmail = raffle.creator_email as string

  const { data: entryRows, error: entriesError } = await supabase
    .from("raffle_entries")
    .select("id, name, email")
    .eq("raffle_id", params.id)

  if (entriesError) {
    return jsonResponse({ error: "Failed to load entries" }, { status: 500 })
  }

  const entries: RaffleEntry[] = (entryRows ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
  }))

  // Fisher-Yates shuffle.
  for (let i = entries.length - 1; i >= 1; i -= 1) {
    const j = randomInt(0, i + 1)
    const tmp = entries[i]
    entries[i] = entries[j]
    entries[j] = tmp
  }

  const winners = entries.slice(0, numWinners)

  const resultWinners: DrawResultWinner[] = []
  const successfulWinners: CreatorSummaryWinner[] = []

  for (let index = 0; index < winners.length; index += 1) {
    if (index > 0) {
      await sleep(500)
    }

    const winner = winners[index]

    try {
      const availableProducts = await searchProducts({
        query: occasion,
        country: "DE",
        currency: "EUR",
      })

      const selection = await selectGift({
        description: occasion + " gift for " + winner.name,
        budget: budgetCents / 100,
        availableProducts,
      })

      const order = await createOrder({
        productId: selection.productId,
        valueInCents: Math.round(selection.amount * 100),
        email: winner.email,
      })

      if (!order.giftCode || order.orderId === "") {
        throw new Error("Bitrefill order returned no redeemable gift code")
      }

      const { error: giftError } = await supabase.from("gifts").insert({
        raffle_id: params.id,
        entry_id: winner.id,
        occasion,
        budget_cents: budgetCents,
        recipient_name: winner.name,
        recipient_email: winner.email,
        bitrefill_product_id: selection.productId,
        bitrefill_product_name: selection.productName,
        bitrefill_order_id: order.orderId,
        gift_code: order.giftCode,
        status: "delivered",
      })

      if (giftError) {
        throw new Error(giftError.message)
      }

      await sendRaffleWinnerEmail({
        name: winner.name,
        email: winner.email,
        raffleTitle,
        productName: selection.productName,
        giftCode: order.giftCode,
      })

      resultWinners.push({
        name: winner.name,
        email: maskEmail(winner.email),
        productName: selection.productName,
      })
      successfulWinners.push({
        name: winner.name,
        email: winner.email,
        productName: selection.productName,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.log(
        "[draw] purchase failed for winner " + maskEmail(winner.email) + ": " + message,
      )

      await supabase.from("gifts").insert({
        raffle_id: params.id,
        entry_id: winner.id,
        occasion,
        budget_cents: budgetCents,
        recipient_name: winner.name,
        recipient_email: winner.email,
        status: "failed",
        error_message: message,
      })

      resultWinners.push({
        name: winner.name,
        email: maskEmail(winner.email),
        productName: "Delivery failed",
      })
    }
  }

  await supabase.from("raffles").update({ status: "drawn" }).eq("id", params.id)

  await sendRaffleCreatorSummary({
    creatorEmail: raffleCreatorEmail,
    raffleTitle,
    winners: successfulWinners,
  })

  return jsonResponse({ winners: resultWinners })
}
