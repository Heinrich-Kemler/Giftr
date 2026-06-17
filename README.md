# Giftr

Giftr turns a budget and a short description into a real gift card, delivered by
email. It supports two flows:

- **Personal Gift** - describe a recipient and a budget, let the AI pick a
  suitable gift card, purchase it, and email it directly to one person.
- **Community Raffle** - create a raffle for an occasion, let people enter with
  their name and email, then draw one or more winners. Each winner is
  automatically sent a gift card.

## Tech stack

- **Next.js 14** (App Router) with **TypeScript** in strict mode
- **React 18**
- **Tailwind CSS** for styling (flat design, no gradients)
- **Supabase** (Postgres) for data storage
- **OpenAI** for AI gift selection
- **Bitrefill** for purchasing gift cards
- **Resend** for sending email
- **Zod** for input validation

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and fill in your values:

   ```bash
   cp .env.local.example .env.local
   ```

3. Run the database migrations in order. Open your Supabase project, go to the
   SQL editor, and run the contents of `supabase/migrations/001_initial.sql`
   then `supabase/migrations/002_security_hardening.sql` (or apply them with the
   Supabase CLI). This creates the `raffles`, `raffle_entries`, and `gifts`
   tables, enables RLS, and blocks browser anon-role table reads/writes.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only). |
| `OPENAI_API_KEY` | No | OpenAI key for AI gift selection. Unset uses a deterministic demo selection. |
| `RESEND_API_KEY` | No | Resend key for sending email. Unset logs emails to console. |
| `LOG_DEMO_GIFT_CODES` | No | Local-only opt-in to log full mock gift codes when Resend is unset. Defaults to redacted logs. |
| `RESEND_FROM_EMAIL` | No | Verified from address for outgoing email. |
| `BITREFILL_API_KEY` | No (unless live) | Bitrefill API key. Not needed when `BITREFILL_MOCK=true`. |
| `BITREFILL_API_SECRET` | No (unless live) | Bitrefill API secret. Not needed when `BITREFILL_MOCK=true`. |
| `BITREFILL_API_BASE` | No | Bitrefill API base URL. Defaults to the v2 endpoint. |
| `BITREFILL_PAYMENT_METHOD` | No | Live Bitrefill payment method. Defaults to `balance`. |
| `BITREFILL_BALANCE_CURRENCY` | No | Balance sub-account currency for account-balance checkout. Defaults to `EUR`. |
| `BITREFILL_USER_AGENT` | No | User-Agent sent to Bitrefill. Defaults to this GitHub repo URL. |
| `BITREFILL_MOCK` | No | Set to `true` to bypass real Bitrefill calls. |
| `NEXT_PUBLIC_BASE_URL` | No | Base URL used to build absolute links. |
| `HEALTH_DETAILS` | No | Include service-level `/api/health` details. Defaults to off in production. |

## Mock / demo mode

Giftr is designed to run safely without spending real money or sending real
email, which is ideal for local development and live demos.

- **`BITREFILL_MOCK=true`** bypasses every real Bitrefill API call. No real gift
  cards are purchased and no charges are made. Instead, the app returns
  deterministic mock product data, order ids, and gift codes so the full flow
  can be exercised end to end.
- **`OPENAI_API_KEY` unset** puts AI gift selection into demo mode. Instead of
  calling GPT-4o, the app makes a deterministic in-budget selection (no network
  call) so the flow still completes. Set a real key to have the model choose.
- **`RESEND_API_KEY` unset** puts email into demo mode. Instead of delivering a
  message, the app logs redacted metadata to the server console. Full mock gift
  code logging requires `LOG_DEMO_GIFT_CODES=true` and is disabled in production.

For a fully offline, no-cost demo, set `BITREFILL_MOCK=true` and leave both
`OPENAI_API_KEY` and `RESEND_API_KEY` unset. In this configuration the entire
gift and raffle flow runs end-to-end with no spend and no real email. Only
Supabase is strictly required, for data storage. For a more private demo, keep
`LOG_DEMO_GIFT_CODES=false` and use real Resend email delivery. For a more impressive live
demo, provide a real `OPENAI_API_KEY` (so GPT-4o genuinely picks each gift) and
a real `RESEND_API_KEY` (so judges receive actual emails) while keeping
`BITREFILL_MOCK=true` so no real gift cards are purchased.

## Privacy and security notes

- Keep `.env.local` and all real API keys out of git. Only `NEXT_PUBLIC_*`
  values are browser-visible; service role, OpenAI, Resend, and Bitrefill keys
  must remain server-side.
- The public raffle link is safe to share. The manage link contains a random
  access token and should be treated as private.
- Supabase RLS is enabled and anon/authenticated table privileges are revoked.
  All reads/writes go through server-side API routes using the service role.
- Gift codes are never returned by public raffle APIs and are redacted from
  local demo logs unless explicitly opted in with `LOG_DEMO_GIFT_CODES=true`.
- `/api/health` returns only `{ "ok": boolean }` in production unless
  `HEALTH_DETAILS=true` is set. Optional OpenAI fallback mode does not make
  health fail.

## Demo walkthrough

1. **Setup (before presenting):** Run `cp .env.local.example .env.local`. Fill in the three required Supabase variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and apply both files in `supabase/migrations/` in order. Set `BITREFILL_MOCK=true` so no real gift cards are purchased. For the most convincing demo also add a real `OPENAI_API_KEY` (GPT-4o picks each gift) and `RESEND_API_KEY` (winners receive real emails); leaving either blank falls back to deterministic selection / redacted console-logged email metadata so the flow still completes. Run `npm run dev`, then hit `http://localhost:3000/api/health` to confirm `ok: true` before opening `http://localhost:3000`.
2. **Personal Gift demo:** Go to `/gift`. Enter a recipient description, the recipient name, their email, and a budget, then submit. Show the agent loop: it searches Bitrefill for matching gift cards, the AI selects one within budget, it places the (mock) order, and emails the code (logged to the server console in demo mode). Land on the result page showing the chosen gift and delivery status.
3. **Community Raffle demo:** Go to `/raffle/create`, create a raffle, and copy the share link. Open the entry page and add a couple of entries (name + email). From the manage page, run the draw for N winners. Show that each winner gets an AI-selected gift purchased and emailed, plus the creator summary of winners.
4. **Talking points:** Autonomous agent loop (search -> select -> buy -> deliver) with no human in the middle; Bitrefill gift-card integration; OpenAI gpt-4o for selection; mock/demo mode so the entire flow runs safely on stage with no spend and no real email.
