// POST /api/raffle/create
// Creates a new raffle and returns its id plus the manage and entry URLs.

import { NextResponse } from "next/server"
import { z } from "zod"
import { getServiceClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const createSchema = z.object({
  title: z.string().min(1),
  occasion: z.string().min(1),
  budgetEuros: z.number().min(1),
  numWinners: z.number().int().min(1),
  endAt: z.string().optional(),
  creatorEmail: z.string().email(),
})

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { title, occasion, budgetEuros, numWinners, endAt, creatorEmail } = parsed.data

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("raffles")
    .insert({
      title,
      occasion,
      budget_cents: Math.round(budgetEuros * 100),
      num_winners: numWinners,
      end_at: endAt ?? null,
      creator_email: creatorEmail,
      status: "active",
    })
    .select("id")
    .single()

  if (error || data === null) {
    return NextResponse.json({ error: "Failed to create raffle" }, { status: 500 })
  }

  const raffleId = data.id as string

  return NextResponse.json({
    raffleId,
    manageUrl: "/raffle/" + raffleId + "/manage",
    entryUrl: "/raffle/" + raffleId,
  })
}
