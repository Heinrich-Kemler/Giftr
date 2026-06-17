// GET /api/raffle/[id]
// Returns a public-facing view of a raffle including its entry count. Never
// exposes individual entries or organizer-only fields.

import { NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface PublicWinner {
  name: string
  email: string
  productName: string
}

// Mask an email for public display, keeping the first character and the domain
// (e.g. 'alice@gmail.com' becomes 'a***@gmail.com').
function maskEmail(email: string): string {
  const atIndex = email.indexOf("@")
  if (atIndex <= 0) {
    return email
  }
  return email.slice(0, 1) + "***" + email.slice(atIndex)
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  void req

  const supabase = getServiceClient()

  const { data: raffle, error } = await supabase
    .from("raffles")
    .select("id, title, occasion, budget_cents, num_winners, end_at, status")
    .eq("id", params.id)
    .maybeSingle()

  if (error || raffle === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { count } = await supabase
    .from("raffle_entries")
    .select("id", { count: "exact", head: true })
    .eq("raffle_id", params.id)

  // Once the raffle has been drawn, expose a public winners list (masked
  // emails, no gift codes) so entrants can see the results.
  let winners: PublicWinner[] | undefined
  if (raffle.status === "drawn") {
    const { data: giftRows } = await supabase
      .from("gifts")
      .select("recipient_name, recipient_email, bitrefill_product_name, created_at")
      .eq("raffle_id", params.id)
      .order("created_at", { ascending: true })

    winners = (giftRows ?? []).map((row) => ({
      name: (row.recipient_name as string | null) ?? "Winner",
      email: maskEmail((row.recipient_email as string | null) ?? ""),
      productName: (row.bitrefill_product_name as string | null) ?? "Gift card",
    }))
  }

  return NextResponse.json({
    id: raffle.id as string,
    title: raffle.title as string,
    occasion: raffle.occasion as string,
    budgetCents: raffle.budget_cents as number,
    numWinners: raffle.num_winners as number,
    endAt: (raffle.end_at as string | null) ?? null,
    status: raffle.status as string,
    entryCount: count ?? 0,
    ...(winners ? { winners } : {}),
  })
}
