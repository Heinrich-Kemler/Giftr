"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import Input from "@/components/ui/Input"
import Label from "@/components/ui/Label"
import Spinner from "@/components/ui/Spinner"

type RaffleManageProps = {
  raffleId: string
  manageToken: string
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
}

// A winner returned by POST /api/raffle/<id>/draw (email is masked server-side).
type Winner = {
  name: string
  email: string
  productName: string
}

type Stage = "gate" | "dashboard"

const DRAW_MESSAGES: readonly string[] = [
  "Selecting winners...",
  "Choosing gifts...",
  "Purchasing gift cards...",
  "Emailing winners...",
]

function formatEuros(cents: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

export default function RaffleManage({ raffleId, manageToken }: RaffleManageProps): JSX.Element {
  const [stage, setStage] = useState<Stage>("gate")
  const [creatorEmail, setCreatorEmail] = useState<string>("")

  const [detail, setDetail] = useState<RaffleDetail | null>(null)
  const [gateLoading, setGateLoading] = useState<boolean>(false)
  const [gateError, setGateError] = useState<string>("")

  const [confirmOpen, setConfirmOpen] = useState<boolean>(false)
  const [drawing, setDrawing] = useState<boolean>(false)
  const [drawMessageIndex, setDrawMessageIndex] = useState<number>(0)
  const [drawError, setDrawError] = useState<string>("")
  const [winners, setWinners] = useState<Winner[] | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rotate the status messages while a draw is in progress.
  useEffect(() => {
    if (drawing) {
      setDrawMessageIndex(0)
      intervalRef.current = setInterval(() => {
        setDrawMessageIndex((prev) => (prev + 1) % DRAW_MESSAGES.length)
      }, 2000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [drawing])

  const handleGateSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (gateLoading) return
      if (manageToken === "") {
        setGateError("This private manage link is missing its access token.")
        return
      }
      setGateLoading(true)
      setGateError("")
      try {
        const res = await fetch(`/api/raffle/${raffleId}`, { cache: "no-store" })
        if (res.status === 404) {
          setGateError("We could not find this giveaway. Check the link and try again.")
          setGateLoading(false)
          return
        }
        if (!res.ok) {
          setGateError("Unable to load the dashboard. Please try again.")
          setGateLoading(false)
          return
        }
        const data = (await res.json()) as RaffleDetail
        setDetail(data)
        setStage("dashboard")
      } catch {
        setGateError("Network error. Please try again.")
      } finally {
        setGateLoading(false)
      }
    },
    [gateLoading, manageToken, raffleId],
  )

  const handleConfirmDraw = useCallback(async (): Promise<void> => {
    if (drawing) return
    setConfirmOpen(false)
    setDrawing(true)
    setDrawError("")
    try {
      const res = await fetch(`/api/raffle/${raffleId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorEmail: creatorEmail.trim(), manageToken }),
      })
      if (res.ok) {
        const data = (await res.json()) as { winners: Winner[] }
        setWinners(Array.isArray(data.winners) ? data.winners : [])
        setDetail((prev) => (prev ? { ...prev, status: "drawn" } : prev))
        setDrawing(false)
        return
      }
      if (res.status === 403) {
        setDrawError("That private manage link or creator email is not authorized.")
        setDrawing(false)
        return
      }
      if (res.status === 400) {
        setDrawError("This giveaway has already been drawn.")
        setDrawing(false)
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
      setDrawError(message)
      setDrawing(false)
    } catch {
      setDrawError("Network error. Please try again.")
      setDrawing(false)
    }
  }, [creatorEmail, drawing, manageToken, raffleId])

  if (stage === "gate") {
    return (
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
          Organizer access
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111111]">
          Manage giveaway
        </h1>
        <p className="mt-2 text-gray-500">
          Enter the email you used to create this giveaway. The private manage
          link is also required to draw winners.
        </p>
        <form onSubmit={handleGateSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="creator-email">Creator email</Label>
            <Input
              id="creator-email"
              name="creatorEmail"
              type="email"
              autoComplete="email"
              required
              value={creatorEmail}
              onChange={(e) => setCreatorEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {gateError ? <p className="text-sm text-red-600">{gateError}</p> : null}

          <Button type="submit" fullWidth loading={gateLoading} disabled={gateLoading}>
            View dashboard
          </Button>
        </form>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {detail ? (
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
      ) : null}

      {winners ? (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-emerald-600">
              Winners selected
            </h2>
            <p className="mt-1 text-gray-500">
              Gifts have been purchased and emailed to the winners below.
            </p>
          </Card>
          {winners.length === 0 ? (
            <Card>
              <p className="text-gray-500">No winners were selected.</p>
            </Card>
          ) : (
            <ul className="space-y-4">
              {winners.map((winner, index) => (
                <li key={`${winner.email}-${index}`}>
                  <Card>
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-medium text-[#111111]">
                        {winner.name}
                      </span>
                      <span className="text-sm text-gray-500">{winner.email}</span>
                      <span className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                        Gift
                      </span>
                      <span className="text-sm text-[#111111]">
                        {winner.productName}
                      </span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-[#111111]">Draw winners</h2>
          <p className="mt-1 text-gray-500">
            When you are ready, draw {detail ? detail.numWinners : ""} winner
            {detail && detail.numWinners === 1 ? "" : "s"}. This purchases and
            emails gifts and cannot be undone.
          </p>

          {drawing ? (
            <div className="mt-6 flex items-center gap-3 text-gray-500">
              <Spinner size={20} />
              <span aria-live="polite">{DRAW_MESSAGES[drawMessageIndex]}</span>
            </div>
          ) : (
            <div className="mt-6">
              {drawError ? (
                <p className="mb-4 text-sm text-red-600">{drawError}</p>
              ) : null}
              <Button type="button" onClick={() => setConfirmOpen(true)}>
                Trigger Draw
              </Button>
            </div>
          )}
        </Card>
      )}

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-draw-title"
        >
          <div className="w-full max-w-md">
            <Card>
              <h2
                id="confirm-draw-title"
                className="text-lg font-semibold text-[#111111]"
              >
                Draw {detail ? detail.numWinners : ""} winner
                {detail && detail.numWinners === 1 ? "" : "s"} now?
              </h2>
              <p className="mt-2 text-gray-500">
                This will purchase and email gifts and cannot be undone.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleConfirmDraw}>
                  Confirm
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
