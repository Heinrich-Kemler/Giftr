"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/gift", label: "Send gift" },
]

export default function Navbar(): JSX.Element {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="Giftr home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-primary.svg" alt="Giftr" className="h-7 w-auto" />
        </Link>

        <div className="flex items-center gap-3 text-sm sm:gap-6">
          {NAV_LINKS.map((link) => {
            const active = link.href.startsWith("/") && !link.href.includes("#") && pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "font-semibold text-brand"
                    : "font-medium text-ink-soft transition-colors hover:text-ink"
                }
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/raffle/create"
            className="rounded-lg bg-brand-accent px-4 py-2 font-medium text-white transition-colors hover:bg-brand-accent/90"
          >
            Start a raffle
          </Link>
        </div>
      </nav>
    </header>
  )
}
