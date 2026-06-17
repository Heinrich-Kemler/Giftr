// SERVER-SIDE ONLY route exposing the Bitrefill product search to the client.
// Always returns a BitrefillProduct[] with status 200; on any error it returns
// an empty array rather than surfacing a 500.

import { NextResponse } from "next/server"
import { searchProducts } from "@/lib/bitrefill"
import type { BitrefillProduct } from "@/lib/types"
import { jsonResponse } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request): Promise<NextResponse<BitrefillProduct[]>> {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") ?? "").slice(0, 120)
    const country = searchParams.get("country")?.slice(0, 2).toUpperCase()
    const currency = searchParams.get("currency")?.slice(0, 3).toUpperCase()

    const products = await searchProducts({ query, country, currency })
    return jsonResponse(products)
  } catch {
    return jsonResponse([])
  }
}
