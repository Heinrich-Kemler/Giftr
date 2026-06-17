// SERVER-SIDE ONLY - never import in a client component.
// Centralised access to environment variables. Values are read lazily via
// getters so that missing required variables only throw when actually used,
// keeping 'npm run build' working with no env vars set.
//
// Supabase is always required (the app cannot store data without it), so those
// getters throw via requireEnv. OpenAI and Bitrefill credentials are returned
// as optional strings ("" when unset): this lets the app degrade gracefully in
// demo/mock mode (deterministic gift selection when no OpenAI key; mock orders
// when BITREFILL_MOCK=true) instead of crashing the way it would on a thrown
// "Missing required environment variable" error.

function requireEnv(key: string): string {
  const value = process.env[key]
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const config = {
  get supabaseUrl(): string {
    return requireEnv("NEXT_PUBLIC_SUPABASE_URL")
  },
  get supabaseAnonKey(): string {
    return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  },
  get supabaseServiceKey(): string {
    return requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  },
  get openaiKey(): string {
    return process.env.OPENAI_API_KEY ?? ""
  },
  get resendKey(): string {
    return process.env.RESEND_API_KEY ?? ""
  },
  get resendFrom(): string {
    return process.env.RESEND_FROM_EMAIL ?? "giftr@example.com"
  },
  get bitrefillKey(): string {
    return process.env.BITREFILL_API_KEY ?? ""
  },
  get bitrefillSecret(): string {
    return process.env.BITREFILL_API_SECRET ?? ""
  },
  get bitrefillBase(): string {
    return process.env.BITREFILL_API_BASE ?? "https://api.bitrefill.com/v2"
  },
  get bitrefillMock(): boolean {
    return process.env.BITREFILL_MOCK === "true"
  },
  // Payment method for live (non-mock) Bitrefill orders. "balance" pays from
  // account credits (requires balanceCurrency); a crypto method like
  // "usdc_base" returns a payment link instead.
  get bitrefillPaymentMethod(): string {
    return process.env.BITREFILL_PAYMENT_METHOD ?? "balance"
  },
  get bitrefillBalanceCurrency(): string {
    return process.env.BITREFILL_BALANCE_CURRENCY ?? "EUR"
  },
  // Bitrefill is fronted by Cloudflare, which returns 403 without a real
  // User-Agent header, so every request sends one.
  get bitrefillUserAgent(): string {
    return process.env.BITREFILL_USER_AGENT ?? "Giftr/1.0 (+https://github.com/Heinrich-Kemler/Giftr)"
  },
  get baseUrl(): string {
    return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  },
}
