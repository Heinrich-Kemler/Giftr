"use client"

import React, { useCallback, useEffect, useState } from "react"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import Input from "@/components/ui/Input"
import Label from "@/components/ui/Label"
import Spinner from "@/components/ui/Spinner"

type RaffleEntryProps = {
  raffleId: string
}

// Public winner shape included by GET /api/raffle/<id> once the raffle is drawn.
type PublicWinner = {
  name: string
  email: string
  productName: string
}

// Shape returned by GET /api/raffle/<id>.
type RaffleDetail = {
  id: string
  title: string
  occasion: string
  budgetCents: number
  numWinners: number
  endAt: string | null
  status: string
  entryCount: number
  winners?: PublicWinner[]
}

type LoadState = "loading" | "loaded" | "not-found" | "error"
type SubmitState = "idle" | "submitting" | "success" | "already-entered"

function formatEuros(cents: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

function hasEnded(detail: RaffleDetail): boolean {
  if (detail.status === "drawn" || detail.status === "closed") return true
  if (detail.endAt) {
    const end = new Date(detail.endAt).getTime()
    if (!Number.isNaN(end) && end <= Date.now()) return true
  }
  return false
}

export default function RaffleEntry({ raffleId }: RaffleEntryProps): JSX.Element {
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [detail, setDetail] = useState<RaffleDetail | null>(null)

  const [name, setName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [submitError, setSubmitError] = useState<string>("")

  const loadRaffle = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/raffle/${raffleId}`, { cache: "no-store" })
      if (res.status === 404) {
        setLoadState("not-found")
        return
      }
      if (!res.ok) {
        setLoadState("error")
        return
      }
      const data = (await res.json()) as RaffleDetail
      setDetail(data)
      setLoadState("loaded")
    } catch {
      setLoadState("error")
    }
  }, [raffleId])

  useEffect(() => {
    void loadRaffle()
  }, [loadRaffle])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (submitState === "submitting") return
      setSubmitState("submitting")
      setSubmitError("")
      try {
        const res = await fetch(`/api/raffle/${raffleId}/enter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim() }),
        })
        if (res.ok) {
          setSubmitState("success")
          setDetail((prev) =>
            prev ? { ...prev, entryCount: prev.entryCount + 1 } : prev,
          )
          return
        }
        if (res.status === 409) {
          setSubmitState("already-entered")
          return
        }
        if (res.status === 400) {
          setDetail((prev) => (prev ? { ...prev, status: "closed" } : prev))
          setSubmitState("idle")
          return
        }
        let message = "Something went wrong. Please try again."
        try {
          const body = (await res.json()) as { error?: string }
          if (body && typeof body.error === "string" && body.error) {
            message = body.error
          }
        } catch {
          // keep default message
        }
        setSubmitError(message)
        setSubmitState("idle")
      } catch {
        setSubmitError("Network error. Please try again.")
        setSubmitState("idle")
      }
    },
    [email, name, raffleId, submitState],
  )

  if (loadState === "loading") {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Spinner size={28} />
      </div>
    )
  }

  if (loadState === "not-found") {
    return (
      <Card>
        <h1 className="text-xl font-semibold text-[#111111]">Giveaway not found</h1>
        <p className="mt-2 text-gray-500">
          We could not find this giveaway. Please check the link and try again.
        </p>
      </Card>
    )
  }

  if (loadState === "error" || !detail) {
    return (
      <Card>
        <h1 className="text-xl font-semibold text-[#111111]">
          Unable to load giveaway
        </h1>
        <p className="mt-2 text-gray-500">
          Something went wrong while loading this giveaway. Please refresh the
          page.
        </p>
      </Card>
    )
  }

  const ended = hasEnded(detail)

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
          {detail.occasion}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111111]">
          {detail.title}
        </h1>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Gift per winner
            </dt>
            <dd className="mt-1 text-lg font-medium text-[#111111]">
              {formatEuros(detail.budgetCents)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Winners
            </dt>
            <dd className="mt-1 text-lg font-medium text-[#111111]">
              {detail.numWinners}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Entries
            </dt>
            <dd className="mt-1 text-lg font-medium text-[#111111]">
              {detail.entryCount}
            </dd>
          </div>
        </dl>
      </Card>

      {ended && detail.winners && detail.winners.length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-[#111111]">Winners</h2>
          <p className="mt-1 text-gray-500">
            This giveaway has ended. Congratulations to the winners below.
          </p>
          <ul className="mt-5 divide-y divide-gray-200">
            {detail.winners.map((winner, index) => (
              <li
                key={`${winner.email}-${index}`}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#111111]">{winner.name}</p>
                  <p className="truncate text-sm text-gray-500">{winner.email}</p>
                </div>
                <p className="shrink-0 text-sm font-medium text-[#111111]">
                  {winner.productName}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : ended ? (
        <Card>
          <h2 className="text-lg font-semibold text-[#111111]">
            This giveaway has ended
          </h2>
          <p className="mt-2 text-gray-500">
            Entries are now closed. Thank you for your interest.
          </p>
        </Card>
      ) : submitState === "success" ? (
        <Card>
          <h2 className="text-lg font-semibold text-emerald-600">You&apos;re in.</h2>
          <p className="mt-2 text-gray-500">
            Your entry has been recorded. If you win, we will email you a gift.
          </p>
        </Card>
      ) : submitState === "already-entered" ? (
        <Card>
          <h2 className="text-lg font-semibold text-[#111111]">
            You have already entered this giveaway
          </h2>
          <p className="mt-2 text-gray-500">
            Only one entry per person is allowed. Good luck.
          </p>
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-[#111111]">Enter the giveaway</h2>
          <p className="mt-1 text-gray-500">
            Add your details below for a chance to win.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="entry-name">Name</Label>
              <Input
                id="entry-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-email">Email</Label>
              <Input
                id="entry-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {submitError ? (
              <p className="text-sm text-red-600">{submitError}</p>
            ) : null}

            <Button
              type="submit"
              fullWidth
              loading={submitState === "submitting"}
              disabled={submitState === "submitting"}
            >
              Enter giveaway
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
