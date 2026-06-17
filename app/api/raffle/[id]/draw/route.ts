// POST /api/raffle/[id]/draw
// Draws winners for a raffle, purchases a gift for each winner sequentially,
// records gifts, emails winners, and emails the creator a summary. A failure to
// purchase for one winner is recorded and does not abort the overall draw.

import { NextResponse } from "next/server"
import { z } from "zod"
import { getServiceClient } from "@/lib/supabase"
import { searchProducts, createOrder } from "@/lib/bitrefill"
import { selectGift } from "@/lib/ai"
import { sendRaffleWinnerEmail, sendRaffleCreatorSummary } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const drawSchema = z.object({
  creatorEmail: z.string().email(),
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

// Mask an email address, keeping the first character of the local part and the
// full domain, e.g. 'alice@gmail.com' becomes 'a***@gmail.com'.
function maskEmail(email: string): string {
  const atIndex = email.indexOf("@")
  if (atIndex <= 0) {
    return email
  }
  const first = email.slice(0, 1)
  const domain = email.slice(atIndex)
  return first + "***" + domain
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = drawSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { creatorEmail } = parsed.data
  const supabase = getServiceClient()

  const { data: raffle, error: raffleError } = await supabase
    .from("raffles")
    .select("id, title, occasion, budget_cents, num_winners, creator_email, status")
    .eq("id", params.id)
    .maybeSingle()

  if (raffleError || raffle === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  if (creatorEmail !== raffle.creator_email) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }

  if (raffle.status !== "active") {
    return NextResponse.json({ error: "Already drawn" }, { status: 400 })
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
    return NextResponse.json({ error: "Failed to load entries" }, { status: 500 })
  }

  const entries: RaffleEntry[] = (entryRows ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
  }))

  // Fisher-Yates shuffle.
  for (let i = entries.length - 1; i >= 1; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
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
        "[draw] purchase failed for winner " + winner.email + ": " + message,
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

  return NextResponse.json({ winners: resultWinners })
}
