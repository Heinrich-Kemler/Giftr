// POST /api/raffle/[id]/enter
// Records a participant entry for a raffle. Rejects entries when the raffle has
// ended and enforces a single entry per email via the unique constraint.

import { NextResponse } from "next/server"
import { z } from "zod"
import { getServiceClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const enterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

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

  const parsed = enterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { name, email } = parsed.data
  const supabase = getServiceClient()

  const { data: raffle, error: raffleError } = await supabase
    .from("raffles")
    .select("id, status, end_at")
    .eq("id", params.id)
    .maybeSingle()

  if (raffleError || raffle === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const endAt = raffle.end_at as string | null
  const hasEnded = endAt !== null && Date.now() > new Date(endAt).getTime()
  if (raffle.status !== "active" || hasEnded) {
    return NextResponse.json({ error: "This giveaway has ended" }, { status: 400 })
  }

  const { error: insertError } = await supabase.from("raffle_entries").insert({
    raffle_id: params.id,
    name,
    email,
  })

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "You have already entered this giveaway" },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: "Failed to enter giveaway" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
