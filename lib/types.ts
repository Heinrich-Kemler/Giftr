// Shared domain types for Giftr.
// These types are safe to import from both server and client components.

export type BitrefillProduct = { id: string; name: string; slug: string; type: string; countryCode: string; currency: string; denominations: number[]; description?: string }
export type AIGiftSelection = { productId: string; productName: string; amount: number; reasoning: string }

// Redemption details extracted from a delivered Bitrefill order. Different
// products expose different fields, so all are optional.
export type BitrefillRedemption = {
  code?: string
  pin?: string
  link?: string
  barcode?: string
  instructions?: string
}

// Result of creating (and, in live mode, polling to delivery) a Bitrefill order.
export type BitrefillOrderResult = {
  orderId: string
  giftCode: string
  status: string
  redemption?: BitrefillRedemption
}
export type GiftRequest = { description: string; recipientName: string; recipientEmail: string; budgetEuros: number }
export type GiftResult = { success: boolean; giftId?: string; productName?: string; error?: string }
export type RaffleCreateInput = { title: string; occasion: string; budgetEuros: number; numWinners: number; endAt?: string; creatorEmail: string }

// Status of a raffle. 'active' accepts entries, 'drawn' has selected winners,
// 'closed' no longer accepts entries and has finished processing.
export type RaffleStatus = "active" | "drawn" | "closed"

// A raffle row as stored in the database (snake_case columns mapped to camelCase).
export type Raffle = {
  id: string
  title: string
  occasion: string
  budgetCents: number
  numWinners: number
  endAt: string | null
  creatorEmail: string
  status: RaffleStatus
  createdAt: string
}

// A public-facing view of a raffle, safe to expose to participants. It omits
// organizer-only fields such as the creator email.
export type RafflePublic = {
  id: string
  title: string
  occasion: string
  numWinners: number
  endAt: string | null
  status: RaffleStatus
  entryCount: number
}

// A winner selected during a raffle draw.
export type DrawWinner = {
  entryId: string
  name: string
  email: string
}
