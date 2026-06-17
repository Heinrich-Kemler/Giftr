// SERVER-SIDE ONLY - never import in a client component.
// Transactional email helpers for Giftr. The Resend client is instantiated
// lazily inside a helper so that 'npm run build' works with no env vars set.
// When RESEND_API_KEY is not configured the email contents are logged to the
// console instead of being sent, which keeps local development friction-free.

import { Resend } from "resend"
import { config } from "@/lib/config"

export interface EmailResult {
  success: boolean
  logged?: boolean
  error?: string
}

interface RaffleWinnerRow {
  name: string
  email: string
  productName: string
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf("@")
  if (atIndex <= 0) {
    return email
  }
  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex)
  const visible = local.slice(0, 1)
  return `${visible}${"*".repeat(Math.max(local.length - 1, 1))}${domain}`
}

function wrapDocument(innerHtml: string): string {
  return [
    `<div style="margin:0;padding:0;background-color:#f9fafb;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;">`,
    `<tr><td align="center" style="padding:24px 12px;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">`,
    `<tr><td style="padding:32px;font-family:${FONT_STACK};color:#111827;font-size:16px;line-height:1.5;">`,
    innerHtml,
    `</td></tr>`,
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</div>`,
  ].join("")
}

function giftCodeBlock(giftCode: string): string {
  return [
    `<div style="margin:24px 0;">`,
    `<code style="display:block;background-color:#f3f4f6;color:#111827;`,
    `padding:16px;border-radius:6px;font-family:'SFMono-Regular',Consolas,`,
    `'Liberation Mono',Menlo,monospace;font-size:16px;letter-spacing:2px;`,
    `word-break:break-all;">`,
    escapeHtml(giftCode),
    `</code>`,
    `</div>`,
  ].join("")
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:22px;font-weight:600;color:#111827;">${escapeHtml(text)}</h1>`
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:16px;line-height:1.5;color:#374151;">${html}</p>`
}

function getResend(): Resend {
  return new Resend(config.resendKey)
}

async function deliver(
  to: string,
  subject: string,
  html: string,
  logSummary: () => void,
): Promise<EmailResult> {
  if (config.resendKey === "") {
    logSummary()
    return { success: true, logged: true }
  }
  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: config.resendFrom,
      to,
      subject,
      html,
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown email error"
    return { success: false, error: message }
  }
}

export async function sendGiftEmail({
  recipientName,
  recipientEmail,
  occasion,
  productName,
  giftCode,
}: {
  recipientName: string
  recipientEmail: string
  occasion: string
  productName: string
  giftCode: string
}): Promise<EmailResult> {
  const subject = `You have received a gift: ${productName}`
  const html = wrapDocument(
    [
      heading(`A gift for you, ${escapeHtml(recipientName)}`),
      paragraph(
        `Someone sent you a gift to celebrate <strong>${escapeHtml(occasion)}</strong>.`,
      ),
      paragraph(
        `Your gift is a <strong>${escapeHtml(productName)}</strong>. Use the code below to redeem it.`,
      ),
      giftCodeBlock(giftCode),
      paragraph(`Enjoy your gift.`),
    ].join(""),
  )

  return deliver(recipientEmail, subject, html, () => {
    console.log(
      [
        "[email] sendGiftEmail (logged, Resend not configured)",
        `  to: ${recipientEmail}`,
        `  subject: ${subject}`,
        `  occasion: ${occasion}`,
        `  product: ${productName}`,
        `  giftCode: ${giftCode}`,
      ].join("\n"),
    )
  })
}

export async function sendRaffleWinnerEmail({
  name,
  email,
  raffleTitle,
  productName,
  giftCode,
}: {
  name: string
  email: string
  raffleTitle: string
  productName: string
  giftCode: string
}): Promise<EmailResult> {
  const subject = `You won the raffle: ${raffleTitle}`
  const html = wrapDocument(
    [
      heading(`Congratulations, ${escapeHtml(name)}`),
      paragraph(
        `You are a winner of the raffle <strong>${escapeHtml(raffleTitle)}</strong>.`,
      ),
      paragraph(
        `Your prize is a <strong>${escapeHtml(productName)}</strong>. Use the code below to redeem it.`,
      ),
      giftCodeBlock(giftCode),
      paragraph(`Thank you for taking part.`),
    ].join(""),
  )

  return deliver(email, subject, html, () => {
    console.log(
      [
        "[email] sendRaffleWinnerEmail (logged, Resend not configured)",
        `  to: ${email}`,
        `  subject: ${subject}`,
        `  raffle: ${raffleTitle}`,
        `  product: ${productName}`,
        `  giftCode: ${giftCode}`,
      ].join("\n"),
    )
  })
}

export async function sendRaffleCreatorSummary({
  creatorEmail,
  raffleTitle,
  winners,
}: {
  creatorEmail: string
  raffleTitle: string
  winners: RaffleWinnerRow[]
}): Promise<EmailResult> {
  const subject = `Raffle results: ${raffleTitle}`

  const rows = winners
    .map((winner) => {
      return [
        `<tr>`,
        `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:${FONT_STACK};font-size:14px;color:#111827;">${escapeHtml(winner.name)}</td>`,
        `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:${FONT_STACK};font-size:14px;color:#374151;">${escapeHtml(maskEmail(winner.email))}</td>`,
        `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:${FONT_STACK};font-size:14px;color:#374151;">${escapeHtml(winner.productName)}</td>`,
        `</tr>`,
      ].join("")
    })
    .join("")

  const table = [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;">`,
    `<tr>`,
    `<th align="left" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;background-color:#f3f4f6;font-family:${FONT_STACK};font-size:13px;font-weight:600;color:#374151;">Name</th>`,
    `<th align="left" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;background-color:#f3f4f6;font-family:${FONT_STACK};font-size:13px;font-weight:600;color:#374151;">Email</th>`,
    `<th align="left" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;background-color:#f3f4f6;font-family:${FONT_STACK};font-size:13px;font-weight:600;color:#374151;">Product</th>`,
    `</tr>`,
    rows,
    `</table>`,
  ].join("")

  const winnerCount = winners.length
  const html = wrapDocument(
    [
      heading(`Raffle results`),
      paragraph(
        `Your raffle <strong>${escapeHtml(raffleTitle)}</strong> has ${winnerCount} ${winnerCount === 1 ? "winner" : "winners"}.`,
      ),
      paragraph(`Winners have been notified directly with their gift codes.`),
      table,
    ].join(""),
  )

  return deliver(creatorEmail, subject, html, () => {
    console.log(
      [
        "[email] sendRaffleCreatorSummary (logged, Resend not configured)",
        `  to: ${creatorEmail}`,
        `  subject: ${subject}`,
        `  raffle: ${raffleTitle}`,
        `  winners: ${winnerCount}`,
      ].join("\n"),
    )
  })
}
