// SERVER-SIDE ONLY health check route. Reports connectivity for Supabase,
// Bitrefill and the presence of an OpenAI key. Each check is isolated so one
// failure never crashes the others, and the route always returns 200.

import { NextResponse } from "next/server"
import { config } from "@/lib/config"
import { getServiceClient } from "@/lib/supabase"
import { testConnection } from "@/lib/bitrefill"
import { jsonResponse } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface HealthChecks {
  supabase: boolean
  bitrefill: boolean
  openai: boolean
}

interface HealthResponse {
  ok: boolean
  checks?: HealthChecks
}

async function checkSupabase(): Promise<boolean> {
  try {
    const supabase = getServiceClient()
    const { error } = await supabase.from("raffles").select("id").limit(1)
    return !error
  } catch {
    return false
  }
}

async function checkBitrefill(): Promise<boolean> {
  // In mock mode the demo flow runs entirely through synthetic createOrder and
  // never touches the real Bitrefill API. Treat it as healthy so /api/health is
  // honest in the recommended demo config (BITREFILL_MOCK=true, no keys) and
  // never reaches for real Bitrefill env/network.
  if (config.bitrefillMock) {
    return true
  }
  try {
    const result = await testConnection()
    return result.ok
  } catch {
    return false
  }
}

function checkOpenai(): boolean {
  try {
    const key = process.env.OPENAI_API_KEY
    return typeof key === "string" && key.length > 0
  } catch {
    return false
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [supabase, bitrefill] = await Promise.all([checkSupabase(), checkBitrefill()])
  const openai = checkOpenai()
  const ok = supabase && bitrefill

  return jsonResponse({
    ok,
    ...(config.healthDetails ? { checks: { supabase, bitrefill, openai } } : {}),
  })
}
