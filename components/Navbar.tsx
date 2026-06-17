import Link from "next/link"

export default function Navbar(): JSX.Element {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-[#111111]"
        >
          Giftr
        </Link>
        <div className="flex items-center gap-3 text-sm sm:gap-6">
          <Link
            href="/gift"
            className="font-medium text-gray-500 transition-colors hover:text-[#111111]"
          >
            Send a Gift
          </Link>
          <Link
            href="/raffle/create"
            className="font-medium text-gray-500 transition-colors hover:text-[#111111]"
          >
            Create a Giveaway
          </Link>
        </div>
      </nav>
    </header>
  )
}
