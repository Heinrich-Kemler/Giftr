"use client"

import React, { useState } from "react"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import Input from "@/components/ui/Input"
import Label from "@/components/ui/Label"

type CreateSuccess = {
  raffleId: string
  manageUrl: string
  entryUrl: string
}

type ShareLinkProps = {
  label: string
  description: string
  url: string
}

function ShareLink({ label, description, url }: ShareLinkProps): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false)

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-[#F9FAFB] p-4">
      <Label>{label}</Label>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="block min-w-0 flex-1 truncate rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#111111]">
          {url}
        </code>
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  )
}

export default function RaffleCreate(): JSX.Element {
  const [title, setTitle] = useState<string>("")
  const [occasion, setOccasion] = useState<string>("")
  const [budgetEuros, setBudgetEuros] = useState<string>("")
  const [numWinners, setNumWinners] = useState<string>("1")
  const [endAt, setEndAt] = useState<string>("")
  const [creatorEmail, setCreatorEmail] = useState<string>("")

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [result, setResult] = useState<CreateSuccess | null>(null)

  function resetForm(): void {
    setTitle("")
    setOccasion("")
    setBudgetEuros("")
    setNumWinners("1")
    setEndAt("")
    setCreatorEmail("")
    setError("")
    setResult(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (loading) {
      return
    }
    setError("")

    const trimmedTitle = title.trim()
    const trimmedOccasion = occasion.trim()
    const trimmedEmail = creatorEmail.trim()
    const budgetValue = Number(budgetEuros)
    const winnersValue = Number(numWinners)

    if (!trimmedTitle || !trimmedOccasion || !trimmedEmail) {
      setError("Please fill in the title, occasion, and your email.")
      return
    }
    if (!Number.isFinite(budgetValue) || budgetValue < 1) {
      setError("Budget per winner must be at least 1 euro.")
      return
    }
    if (!Number.isInteger(winnersValue) || winnersValue < 1) {
      setError("Number of winners must be a whole number of at least 1.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/raffle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          occasion: trimmedOccasion,
          budgetEuros: budgetValue,
          numWinners: winnersValue,
          endAt: endAt || undefined,
          creatorEmail: trimmedEmail,
        }),
      })

      if (!response.ok) {
        setError("Something went wrong creating your giveaway. Please try again.")
        return
      }

      const data = (await response.json()) as CreateSuccess
      if (!data.raffleId || !data.entryUrl || !data.manageUrl) {
        setError("Something went wrong creating your giveaway. Please try again.")
        return
      }
      setResult(data)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const entryLink = `${origin}${result.entryUrl}`
    const manageLink = `${origin}${result.manageUrl}`

    return (
      <Card>
        <h2 className="text-xl font-semibold tracking-tight text-[#111111]">
          Your giveaway is live
        </h2>
        <p className="mt-2 text-gray-500">
          Share the entry link with participants. Keep the manage link private;
          it contains the access token for drawing winners.
        </p>

        <div className="mt-6 space-y-4">
          <ShareLink
            label="Entry link (public)"
            description="Share this with participants so they can enter the giveaway."
            url={entryLink}
          />
          <ShareLink
            label="Manage link (private)"
            description="Keep this to yourself. Use it to draw winners when the giveaway ends."
            url={manageLink}
          />
        </div>

        <div className="mt-6">
          <Button type="button" variant="outline" onClick={resetForm}>
            Create another
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="raffle-title">Title</Label>
          <Input
            id="raffle-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Summer Community Giveaway"
            autoComplete="off"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="raffle-occasion">Occasion or theme</Label>
          <Input
            id="raffle-occasion"
            name="occasion"
            type="text"
            value={occasion}
            onChange={(event) => setOccasion(event.target.value)}
            placeholder="Holiday celebration"
            autoComplete="off"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="raffle-budget">Budget per winner (euros)</Label>
            <Input
              id="raffle-budget"
              name="budgetEuros"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              step={1}
              value={budgetEuros}
              onChange={(event) => setBudgetEuros(event.target.value)}
              placeholder="25"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="raffle-winners">Number of winners</Label>
            <Input
              id="raffle-winners"
              name="numWinners"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              step={1}
              value={numWinners}
              onChange={(event) => setNumWinners(event.target.value)}
              placeholder="1"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="raffle-end">End date (optional)</Label>
          <Input
            id="raffle-end"
            name="endAt"
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="raffle-email">Your email</Label>
          <Input
            id="raffle-email"
            name="creatorEmail"
            type="email"
            value={creatorEmail}
            onChange={(event) => setCreatorEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={loading} fullWidth>
          {loading ? "Creating" : "Create giveaway"}
        </Button>
      </form>
    </Card>
  )
}
