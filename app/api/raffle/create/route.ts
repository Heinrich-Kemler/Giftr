// POST /api/raffle/create
// Creates a new raffle and returns its id plus the manage and entry URLs.

import { NextResponse } from "next/server"
import { z } from "zod"
import { getServiceClient } from "@/lib/supabase"
import {
  checkRateLimit,
  generateSecretToken,
  getClientIp,
  hashSecretToken,
  jsonResponse,
  normalizeEmail,
} from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  occasion: z.string().trim().min(1).max(300),
  budgetEuros: z.number().min(1).max(500),
  numWinners: z.number().int().min(1).max(100),
  endAt: z.string().max(80).optional(),
  creatorEmail: z.string().email(),
})

export async function POST(req: Request): Promise<NextResponse> {
  const rateLimit = checkRateLimit({
    key: `raffle-create:${getClientIp(req)}`,
    limit: 20,
  })
  if (!rateLimit.ok) {
    return jsonResponse(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid request" }, { status: 400 })
  }

  const { title, occasion, budgetEuros, numWinners, endAt, creatorEmail } = parsed.data
  const manageToken = generateSecretToken()

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from("raffles")
    .insert({
      title,
      occasion,
      budget_cents: Math.round(budgetEuros * 100),
      num_winners: numWinners,
      end_at: endAt ?? null,
      creator_email: normalizeEmail(creatorEmail),
      manage_token_hash: hashSecretToken(manageToken),
      status: "active",
    })
    .select("id")
    .single()

  if (error || data === null) {
    return jsonResponse({ error: "Failed to create raffle" }, { status: 500 })
  }

  const raffleId = data.id as string

  return jsonResponse({
    raffleId,
    manageUrl: "/raffle/" + raffleId + "/manage?token=" + encodeURIComponent(manageToken),
    entryUrl: "/raffle/" + raffleId,
  })
}
