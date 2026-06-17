# Giftr Living Agents Document

Last updated: 2026-06-17

## 1. Purpose

This file is the coordination source of truth for Codex, Claude, and the human
demo operator during the hackathon. Every agent should update it before handing
off work.

## 2. Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Overall | App built and reviewed; demo-ready in mock mode | See "Scope note" below re: the real-purchase submission requirement. |
| Build prompt | Executed | App built from the provided build spec (Personal Gift + Community Raffle). |
| Source files | Present | All spec files exist under `app/`, `components/`, `lib/`, `supabase/`. |
| Git | Published | Public repo: `https://github.com/Heinrich-Kemler/Giftr` (`main`). |
| Build validation | Passing | `npm run build` exits 0 with no env vars (13 routes); `npx tsc --noEmit` clean. |
| Dev validation | Passing | `npm run dev` starts clean (Ready in ~9s, no errors). |
| Demo readiness | Ready (mock) | Runs end-to-end in mock mode; needs a Supabase project + migration for storage. |

**Scope note:** The live (non-mock) Bitrefill flow is now implemented in
`lib/bitrefill.ts`: Bearer auth + real User-Agent against `api.bitrefill.com/v2`,
`POST /invoices` with `payment_method`/`balance_currency`/`auto_pay`, polling the
order until `orders[0].status === "delivered"` && `redemption_available`, then
reading `redemption_info`. It is build- and mock-verified but NOT yet verified
against the live API (no credentials/test credits in this environment). That
final live verification is tracked as T05/I01.

## 3. Source State Observed

- Config: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs` present
- `README.md`, `.env.local.example`: present and complete
- `supabase/migrations/001_initial.sql`: present (raffles, raffle_entries, gifts)
- Pages: `/`, `/gift`, `/raffle/create`, `/raffle/[id]` (entry + public results), `/raffle/[id]/manage`
- API routes: `/api/gift`, `/api/health`, `/api/bitrefill/search`, `/api/raffle/create`, `/api/raffle/[id]`, `/api/raffle/[id]/enter`, `/api/raffle/[id]/draw`
- `/api/health`: live, returns `{ ok, checks: { supabase, bitrefill, openai } }`

## 4. Task Queue

| ID | Owner | Task | Status | Notes |
| --- | --- | --- | --- | --- |
| T00 | Codex | Create living `AGENTS.md` | done | |
| T01 | Codex/Claude | Build app from the build spec | done | All spec files present and building. |
| T02 | Claude | Review app, confirm build/dev start clean | done | 10-dimension review + adversarial verify; 9 issues fixed. |
| T03 | Claude | Complete demo QA checklist | done | Mock mode exercised live. |
| T04 | Claude | Write Demo Script section | done | See Section 12. |
| T05 | Human/Claude | Real autonomous Bitrefill purchase (non-mock) with delivery polling + redemption info | code complete; pending live verification | Live REST flow implemented in `lib/bitrefill.ts`; needs real creds/test credits to verify end-to-end. |
| T06 | Human | Ask Bitrefill mentor for test credits | open | Required for the `balance` checkout demo path. |
| T07 | Human/Claude | Public GitHub URL + <=4 minute video | partial | Public repo ready; video still required for submission. |

## 5. Validation Checklist

### Build

- [x] `npm run build` passes (exit 0, no env vars required)
- [x] `npm run dev` starts clean (no errors in log)
- [x] `npx tsc --noEmit` passes (zero type errors)
- [x] No emoji anywhere in the codebase (verified by Unicode-range grep)

### Demo

- [x] `README.md` complete (setup, env table, mock mode, demo walkthrough)
- [x] `.env.local.example` complete and commented
- [x] `BITREFILL_MOCK=true` tested (health reports `bitrefill: true`; search returns fallback catalogue with no creds)
- [~] `/api/health` returns `ok: true` — always a structured 200; `ok: true` requires Supabase + OpenAI configured. No Supabase project was available in the build sandbox, so `supabase`/`openai` read `false` here. With the recommended demo env it returns `ok: true`.

### Hackathon Submission (from Section 7 research)

- [ ] Autonomous Bitrefill purchase demonstrated end-to-end (real, not only mock) — T05
- [x] Agent searches, buys, pays, polls delivery, and reads redemption info — implemented in `lib/bitrefill.ts` (live path); pending live verification (T05)
- [ ] Bitrefill MCP or REST integration documented; MCP preferred — REST shape implemented against `https://api.bitrefill.com/v2`; endpoint paths still unverified; MCP not wired
- [x] Landing page / app interface explains the project and links to the flows
- [x] Public GitHub URL ready — `https://github.com/Heinrich-Kemler/Giftr`
- [ ] Video demo recorded, 4 minutes maximum — T07
- [ ] Real Bitrefill test path verified, not only local mock mode — T05

### Bitrefill Integration Safety (from Section 7 research)

- [x] `payment_method="balance"` uses `balance_currency`, such as `EUR` — implemented in live REST order body; live endpoint still unverified
- [x] Polling checks `orders[0].status === "delivered"` and `orders[0].redemption_available === true` — implemented in `createOrder`
- [x] Code does not wait only on top-level invoice status — reads per-order status, ignores invoice rollups
- [x] `invoice_id` and `order_id` are kept distinct — `extractInvoiceId` vs per-order `id` in `createOrder`
- [x] Custom HTTP clients send a real `User-Agent` header
- [x] A failure path produces a clean user-visible error (structured `{success:false,error}`, gift row marked `failed`)

## 6. Validation Notes

- `npm run build`: PASS. Exit 0 with no `.env.local`. All 13 routes compiled.
- `npx tsc --noEmit`: PASS. Zero errors.
- `npm run dev`: PASS. Booted on a test port, served `/`, `/gift`, `/raffle/create` (all 200); clean log.
- `BITREFILL_MOCK=true`: PASS. `GET /api/health` -> `bitrefill: true` (mock short-circuit, no `/ping`); `GET /api/bitrefill/search?q=amazon` -> Amazon fallback product, no creds needed.
- DB-backed flows (gift purchase, raffle entry/draw, public results) verified by code review + type-check + build. Require a live Supabase project with the migration applied to exercise end-to-end (no Supabase instance in the build sandbox).

## 7. Hackathon And Bitrefill Research

### Challenge Definition

The Bitrefill hackathon asks for a build where an AI agent searches, buys, and
pays for real products on Bitrefill by itself. The demo should make the agent
loop visible, not feel like a plain gift-card form. Giftr should show: intent
received, product search/selection, purchase, payment, delivery polling, and
redemption info.

### Judging And Submission

Judging is based on three averaged scores: use of the Bitrefill tech stack,
following the requirements, and innovation. Submission requirements: working
autonomous purchase, landing page or app interface, video demo link (4 minutes
maximum), public GitHub URL. The event page lists a submission deadline of
18:00 — confirm the exact local deadline with organizers.

### Recommended Technical Path

Use Bitrefill eCommerce MCP if possible. Hosted endpoint:

```text
https://api.bitrefill.com/mcp/<YOUR_KEY>
```

MCP exposes the core flow: `search-products`, `get-product-details`,
`buy-products`, `get-invoice-by-id`, and order updates. REST is acceptable when
the app needs custom programmatic control, but MCP is the fastest path and is
explicitly recommended by the hackathon page. NOTE: the current code uses a
REST shape against `https://api.bitrefill.com/v2`. Endpoint paths in
`lib/bitrefill.ts` are marked `// TODO: verify endpoint` and must be confirmed
(or switched to MCP) for live.

### Test Paths

Path A, crypto test product:

- Product: `test-gift-card-code`
- Payment method: crypto such as `usdc_base`
- Request `return_payment_link: true`; do not pay the returned link — the test product delivers anyway
- Skip `get-product-details` for `test-gift-card-*` slugs; denominations are `10`, `20`, `30`, `50`, `100`

Path B, test credits / account balance:

- Ask a Bitrefill mentor to provision test credits for the account email
- Product: `delos-syldavia`
- Use `payment_method: "balance"`, include `balance_currency` such as `EUR`
- Start with the smallest denomination, such as `0.01`
- Best path to prove autonomous account-balance checkout

### Polling Rule That Matters

Treat a purchase as delivered when the order itself is delivered:

```text
orders[0].status === "delivered"
orders[0].redemption_available === true
```

Do not block the demo waiting on top-level `invoice_status` or
`orders_delivery_status`; for balance purchases those rollups can lag. Read
redemption data from `orders[0].redemption_info`, and handle `pin`, links,
barcode fields, and instructions rather than assuming a simple code.

### Demo Positioning

The community raffle is the strongest story: an agent receives winners, chooses
or confirms a Bitrefill reward, buys each gift sequentially, confirms delivery,
and sends redemption info. Keep email failure non-fatal because the purchase and
redemption result are the source of truth.

### Sources

- Stadium program: `https://stadium.joinwebzero.com/programs/bitrefill-2026`
- Bitrefill MCP docs: `https://docs.bitrefill.com/docs/ecommerce-mcp`
- Bitrefill quickstart: `https://docs.bitrefill.com/docs/quickstart-2`
- Bitrefill testing guide: `https://github.com/sacha-l/bitrefill-gift-card-concierge/blob/master/TESTING.md`
- Bitrefill rate limits: `https://docs.bitrefill.com/docs/rate-limits`

## 8. Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| hackathon | Winners processed sequentially, 500ms delay | Avoid Bitrefill sandbox rate limits |
| hackathon | Email failure is non-fatal | Gift purchased; do not block the flow |
| hackathon | Creator auth = email match only | Hackathon MVP |
| hackathon | `BITREFILL_MOCK=true` for safe testing | Avoid real purchases during dev |
| hackathon | Real test purchase required for submission confidence | Judging requires an autonomous Bitrefill purchase, not only mock |
| hackathon | Prefer MCP unless blocked | Hackathon page recommends Bitrefill eCommerce MCP |
| hackathon | Poll per-order delivery state | Balance purchases can leave invoice rollups stale |
| 2026-06-17 | OpenAI/Bitrefill creds optional in config (return "" when unset) | Degrade to deterministic demo selection / mock orders instead of crashing on missing-env throw |
| 2026-06-17 | `selectGift` has a deterministic no-key fallback | Personal-gift + raffle-draw complete fully offline for a bulletproof demo |
| 2026-06-17 | `testConnection()` short-circuits ok in mock mode | `/api/health` reads honestly during a mock demo |
| 2026-06-17 | Server-side budget/denomination + empty-code guards in `/api/gift` | Validate the LLM choice for bounds, not just types; never deliver a blank code |
| 2026-06-17 | Public winners list on `/raffle/[id]` after draw (masked, no codes) | Realize the "public results page" from the product spec; demo finale |

## 9. Known Issues

Severity: `high` breaks demo, `medium` degrades demo, `low` is cosmetic. Add
issues here, not as TODO comments in code.

| ID | Severity | Description | Status | Assigned |
| --- | --- | --- | --- | --- |
| I01 | medium | Bitrefill live (non-mock) endpoint paths/shapes implemented from the published REST docs (`GET /products/search`, `POST /invoices`, `GET /orders/{id}`, `GET /ping`) but not yet verified against the live API with real credentials. Fully mitigated for the demo by `BITREFILL_MOCK=true`. | open | Human |
| I02 | high | Build prompt missing | resolved | App built from provided spec. |
| I03 | high | No app source files / `package.json` | resolved | All source present and building. |
| I04 | medium | Test credits may not be provisioned for the Bitrefill account | open | Human |
| I05 | high | Real autonomous Bitrefill purchase with delivery polling + redemption info is now implemented (live REST in `lib/bitrefill.ts`); remaining work is to verify it end-to-end against the live API with real creds/test credits | code complete; pending live verification | Human/Claude |
| I06 | low | Confirm exact local submission deadline with organizers | open | Human |
| I07 | low | Creator auth is email-match only (by design, hackathon MVP) | open by design | n/a |
| I08 | low | `lib/bitrefill.ts` `fetchWithTimeout` sets no `User-Agent` header (matters for live REST) | resolved | Added `BITREFILL_USER_AGENT` and send it on Bitrefill requests. |

## 10. Handoff Protocol

**Codex to Claude handoff:**

1. Update Current Status (Overall -> "Build complete").
2. Mark T01 done in Task Queue.
3. Add discovered issues to Known Issues.
4. Write a one-paragraph Handoff Note summarising what Claude needs to know.

**Claude to Human handoff:**

1. Update Current Status (Overall -> "Demo ready").
2. Mark all checklist items with pass/fail.
3. Write the Demo Script section.

## 11. Handoff Note

The app is built from the build spec, put through a 10-dimension review with
adversarial verification (9 confirmed issues fixed), and re-verified green
(`tsc` + `npm run build` exit 0, `npm run dev` clean, zero emoji). It builds
with no env vars and runs end-to-end in mock mode at runtime. To run for real,
provide a **Supabase project** (URL + anon + service role) and apply
`supabase/migrations/001_initial.sql`. For the demo set `BITREFILL_MOCK=true`
(no real cards bought); add a real `OPENAI_API_KEY` (GPT-4o picks gifts) and
`RESEND_API_KEY` + verified `RESEND_FROM_EMAIL` (judges get real emails). If
either AI/email key is omitted the flow still completes (deterministic selection
/ console-logged email).

IMPORTANT GAP FOR SUBMISSION: per Section 7, the hackathon wants a real
(non-mock) autonomous purchase with delivery polling and redemption info,
preferably via the Bitrefill eCommerce MCP. The current build implements the
simpler spec'd REST flow (mock-first, REST endpoint paths unverified, no polling/redemption).
Closing that — switching `lib/bitrefill.ts` to MCP or confirmed REST endpoints, adding
order-status polling on `orders[0].status === "delivered"` /
`redemption_available`, surfacing `redemption_info`, and running Test Path A or
B — is the remaining work to be submission-grade (tracked as T05/I05). It needs
real creds/test credits and was out of scope of the build/review prompts.

## 12. Demo Script

### Setup (before presenting)

1. Create `.env.local` from `.env.local.example`. Set:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (a real Supabase project).
   - `BITREFILL_MOCK=true` (no real purchases for the safe demo).
   - `OPENAI_API_KEY` (real, so GPT-4o picks each gift live).
   - `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (real + verified sender, so judges get real emails).
   - `NEXT_PUBLIC_BASE_URL` = the URL you present from (LAN IP or tunnel) so phones can reach the raffle link.
2. Apply the migration: run `supabase/migrations/001_initial.sql` in the Supabase SQL editor.
3. `npm install` then `npm run dev`.
4. Open `http://<base-url>/api/health` and confirm `{"ok":true,...}` BEFORE going on stage. If `ok` is false, the failing check names the service to fix (supabase / bitrefill / openai).
5. Have a second device ready and the audience primed to enter the raffle.

### Personal Gift demo (about 2 minutes)

1. Open `/gift`. One line: "Giftr turns a sentence and a budget into a real, delivered gift."
2. Step 1 - paste a natural-language request, e.g. "My friend just landed a new job in Tokyo, budget is 30 euros." Continue.
3. Step 2 - recipient name + an email you control (a judge's, if offered), budget 30. Continue.
4. Step 3 - read the review summary aloud, then click Send Gift.
5. As the rotating status plays (Searching Bitrefill catalog / Selecting the best match / Processing purchase / Sending gift), narrate the autonomous loop: search Bitrefill, GPT-4o selects the most fitting card within budget, place the order, email the code.
6. Land on the success screen ("Gift sent.", product, delivered-to). With a real email, open the inbox and show the code email arriving live.

### Community Raffle demo (about 3 minutes, with judges entering)

1. Open `/raffle/create`. Create a giveaway: title ("Berlin Hackathon Giveaway"), occasion ("Celebrating builders"), budget per winner (15), winners (2), creator email (yours). Submit.
2. On the success screen, copy the public entry link and share it (URL or QR on screen). Note the manage link is private.
3. Invite the room to open the entry link and enter name + email. Watch the entry count climb. (One entry per email - a second attempt shows "already entered".)
4. Open the private manage link (`/raffle/[id]/manage`). Enter your creator email to unlock the dashboard.
5. Click Trigger Draw, confirm in the modal. As the rotating messages play (Selecting winners / Choosing gifts / Purchasing gift cards / Emailing winners), narrate: fair Fisher-Yates shuffle, each winner gets an AI-picked gift bought and emailed, creator gets a summary.
6. Show the winners list (names + masked emails + the gift each won). With real email, winners show the email on their phones.
7. Finale: have everyone refresh the public entry link - it now shows the public Winners results (masked emails, no codes). Entrants see if they won, live.

### Talking points

- Autonomous agent loop end to end: search -> select (GPT-4o) -> buy (Bitrefill) -> deliver (email), no human in the middle.
- Two flows from one engine: one-to-one personal gift and one-to-many community raffle.
- Built on the Bitrefill gift-card API; safe `BITREFILL_MOCK=true` means the whole flow runs on stage with zero spend.
- Graceful degradation: no OpenAI key -> deterministic selection; no Resend key -> emails logged. The demo cannot hard-fail on a missing key.
- Production hygiene: TypeScript strict, Zod-validated inputs, structured errors, non-fatal email, sequential rate-limited purchasing, masked emails in public views.
- (If asked about going live) Roadmap: swap the Bitrefill client to the eCommerce MCP, poll per-order delivery, and surface redemption info — see AGENTS.md Section 7.

## 13. Run Order On Hackathon Day

1. Ensure `.env.local` is set (Supabase real, `BITREFILL_MOCK=true`, OpenAI + Resend real).
2. Apply the SQL migration to Supabase.
3. `npm install` && `npm run dev`.
4. Hit `/api/health`, confirm `ok: true`, then go on stage.
