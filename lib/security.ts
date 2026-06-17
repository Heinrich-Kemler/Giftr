// Shared security/privacy helpers for API routes.

import crypto from "node:crypto"
import { NextResponse } from "next/server"

const RATE_LIMIT_WINDOW_MS = 60_000
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email)
  const atIndex = normalized.indexOf("@")
  if (atIndex <= 0) {
    return "***"
  }
  return normalized.slice(0, 1) + "***" + normalized.slice(atIndex)
}

export function generateSecretToken(): string {
  return crypto.randomBytes(32).toString("base64url")
}

export function hashSecretToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex")
}

export function safeCompareHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex")
  const right = Buffer.from(b, "hex")
  if (left.length !== right.length || left.length === 0) {
    return false
  }
  return crypto.timingSafeEqual(left, right)
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function securityHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  }
}

export function jsonResponse<T>(body: T, init: ResponseInit = {}): NextResponse<T> {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...securityHeaders(),
      ...(init.headers ?? {}),
    },
  })
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor !== null && forwardedFor.trim() !== "") {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown"
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}

export function checkRateLimit({
  key,
  limit,
}: {
  key: string
  limit: number
}): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now()
  const existing = rateLimitBuckets.get(key)
  if (existing === undefined || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { ok: true }
  }

  existing.count += 1
  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  return { ok: true }
}
