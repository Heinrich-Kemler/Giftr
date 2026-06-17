// SERVER-SIDE ONLY route handler for creating a direct (personal) gift.
// Orchestrates product search, AI selection, Bitrefill order, persistence and
// email delivery. All external SDK clients are created lazily inside the
// libraries they live in, so importing this route never requires env vars.

import { NextResponse } from "next/server"
import { z } from "zod"
import { searchProducts, createOrder } from "@/lib/bitrefill"
import { selectGift } from "@/lib/ai"
import { sendGiftEmail } from "@/lib/email"
import { getServiceClient } from "@/lib/supabase"
import type { GiftResult } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const giftSchema = z.object({
  description: z.string().min(10),
  recipientName: z.string().min(1),
  recipientEmail: z.string().email(),
  budgetEuros: z.number().min(5).max(200),
})

export async function POST(request: Request): Promise<NextResponse<GiftResult>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = giftSchema.safeParse(body)
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? "Invalid request"
    return NextResponse.json({ success: false, error }, { status: 400 })
  }

  const { description, recipientName, recipientEmail, budgetEuros } = parsed.data
  const supabase = getServiceClient()

  let giftId: string | null = null

  try {
    const availableProducts = await searchProducts({
      query: description,
      country: "DE",
      currency: "EUR",
    })

    const selection = await selectGift({
      description,
      budget: budgetEuros,
      availableProducts,
    })

    // Server-side guard: the AI selection is only validated for field TYPES,
    // not value bounds. Enforce that the amount is within budget and is a real
    // denomination of the chosen product, snapping it if the model drifted.
    const product = availableProducts.find((p) => p.id === selection.productId)
    if (product === undefined) {
      throw new Error(`AI selected unknown product id "${selection.productId}"`)
    }
    const affordable = product.denominations.filter((d) => d <= budgetEuros)
    if (affordable.length === 0) {
      throw new Error("No denomination within budget")
    }
    const amount =
      selection.amount <= budgetEuros && product.denominations.includes(selection.amount)
        ? selection.amount
        : Math.max(...affordable)

    const insertResult = await supabase
      .from("gifts")
      .insert({
        occasion: description,
        budget_cents: budgetEuros * 100,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        bitrefill_product_id: selection.productId,
        bitrefill_product_name: selection.productName,
        status: "pending",
      })
      .select("id")
      .single()

    if (insertResult.error || insertResult.data === null) {
      throw new Error(insertResult.error?.message ?? "Failed to create gift record")
    }

    giftId = insertResult.data.id as string

    const order = await createOrder({
      productId: selection.productId,
      valueInCents: amount * 100,
      email: recipientEmail,
    })

    // Guard against a 2xx Bitrefill response whose shape createOrder did not
    // recognize: it defaults orderId/giftCode to "" rather than throwing, which
    // would otherwise "succeed" with a blank, unusable gift code.
    if (!order.giftCode || order.orderId === "") {
      throw new Error(
        `Bitrefill order returned no gift code (orderId="${order.orderId}"). Could not extract a usable code from the order response.`
      )
    }

    const purchaseUpdate = await supabase
      .from("gifts")
      .update({
        status: "purchased",
        bitrefill_order_id: order.orderId,
        gift_code: order.giftCode,
      })
      .eq("id", giftId)

    if (purchaseUpdate.error) {
      throw new Error(purchaseUpdate.error.message)
    }

    try {
      const emailResult = await sendGiftEmail({
        recipientName,
        recipientEmail,
        occasion: description,
        productName: selection.productName,
        giftCode: order.giftCode,
      })
      if (!emailResult.success) {
        console.error("[gift] sendGiftEmail failed (non-fatal):", emailResult.error)
      }
    } catch (emailError: unknown) {
      const message = emailError instanceof Error ? emailError.message : String(emailError)
      console.error("[gift] sendGiftEmail threw (non-fatal):", message)
    }

    await supabase.from("gifts").update({ status: "delivered" }).eq("id", giftId)

    return NextResponse.json({
      success: true,
      giftId,
      productName: selection.productName,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create gift"
    if (giftId !== null) {
      await supabase
        .from("gifts")
        .update({ status: "failed", error_message: message })
        .eq("id", giftId)
    }
    return NextResponse.json({ success: false, error: message })
  }
}
