// POST /api/raffle/[id]/enter
// Records a participant entry for a raffle. Rejects entries when the raffle has
// ended and enforces a single entry per email via the unique constraint.

import { NextResponse } from "next/server"
import { z } from "zod"
import { getServiceClient } from "@/lib/supabase"
import {
  checkRateLimit,
  getClientIp,
  isValidUuid,
  jsonResponse,
  normalizeEmail,
} from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const enterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
})

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!isValidUuid(params.id)) {
    return jsonResponse({ error: "not found" }, { status: 404 })
  }

  const rateLimit = checkRateLimit({
    key: `raffle-enter:${params.id}:${getClientIp(req)}`,
    limit: 30,
  })
  if (!rateLimit.ok) {
    return jsonResponse(
      { error: "Too many entries from this network. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = enterSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid request" }, { status: 400 })
  }

  const { name } = parsed.data
  const email = normalizeEmail(parsed.data.email)
  const supabase = getServiceClient()

  const { data: raffle, error: raffleError } = await supabase
    .from("raffles")
    .select("id, status, end_at")
    .eq("id", params.id)
    .maybeSingle()

  if (raffleError || raffle === null) {
    return jsonResponse({ error: "not found" }, { status: 404 })
  }

  const endAt = raffle.end_at as string | null
  const hasEnded = endAt !== null && Date.now() > new Date(endAt).getTime()
  if (raffle.status !== "active" || hasEnded) {
    return jsonResponse({ error: "This giveaway has ended" }, { status: 400 })
  }

  const { error: insertError } = await supabase.from("raffle_entries").insert({
    raffle_id: params.id,
    name,
    email,
  })

  if (insertError) {
    if (insertError.code === "23505") {
      return jsonResponse(
        { error: "You have already entered this giveaway" },
        { status: 409 },
      )
    }
    return jsonResponse({ error: "Failed to enter giveaway" }, { status: 500 })
  }

  return jsonResponse({ success: true })
}
