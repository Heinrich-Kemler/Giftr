import Link from "next/link"
import Card from "@/components/ui/Card"

export default function HomePage(): JSX.Element {
  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
      <section className="max-w-3xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
          Gifting, Automated
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#111111] sm:text-5xl">
          Send the right gift, every time.
        </h1>
        <p className="mt-6 text-lg text-gray-500">
          Describe the person and a budget. Giftr uses AI to pick the perfect
          gift, buys it, and delivers a redeemable code instantly via the
          Bitrefill API. No browsing, no guessing, no shipping delays.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/gift"
            className="inline-flex items-center justify-center rounded-lg bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            Send a Gift
          </Link>
          <Link
            href="/raffle/create"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            Create a Giveaway
          </Link>
        </div>
      </section>

      <section className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
            Personal Gift
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#111111]">
            One person, one perfect gift
          </h2>
          <p className="mt-3 text-gray-500">
            Describe someone and set a budget. The AI finds a fitting gift, buys
            it, and emails the redeemable code straight to their inbox. You stay
            in control of the spend.
          </p>
        </Card>

        <Card>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
            Community Raffle
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#111111]">
            Run a giveaway, reward every winner
          </h2>
          <p className="mt-3 text-gray-500">
            Launch a giveaway and let people enter. When you draw, the AI picks a
            gift that fits each winner and sends it automatically. Perfect for
            communities and events.
          </p>
        </Card>
      </section>

      <footer className="mt-24 border-t border-gray-200 pt-8">
        <p className="text-sm text-gray-400">
          Built with Bitrefill API &middot; Berlin 2026
        </p>
      </footer>
    </div>
  )
}
