"use client"

import React, { useEffect, useState } from "react"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Label from "@/components/ui/Label"
import Card from "@/components/ui/Card"
import Spinner from "@/components/ui/Spinner"
import GiftResult from "@/components/GiftResult"
import type { GiftResult as GiftResultType } from "@/lib/types"

type Step = 1 | 2 | 3

const LOADING_MESSAGES: readonly string[] = [
  "Searching Bitrefill catalog...",
  "Selecting the best match...",
  "Processing purchase...",
  "Sending gift...",
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

function isValidBudget(budget: string): boolean {
  if (budget.trim() === "") return false
  const value = Number(budget)
  return Number.isFinite(value) && value >= 5 && value <= 200
}

export default function GiftFlow(): JSX.Element {
  const [step, setStep] = useState<Step>(1)
  const [description, setDescription] = useState<string>("")
  const [recipientName, setRecipientName] = useState<string>("")
  const [recipientEmail, setRecipientEmail] = useState<string>("")
  const [budget, setBudget] = useState<string>("")

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ productName: string; recipientEmail: string } | null>(
    null,
  )

  const [loadingIndex, setLoadingIndex] = useState<number>(0)

  useEffect(() => {
    if (!isLoading) {
      setLoadingIndex(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isLoading])

  const step1Valid = description.trim().length >= 10
  const step2Valid =
    recipientName.trim().length > 0 && isValidEmail(recipientEmail) && isValidBudget(budget)

  function handleReset(): void {
    setStep(1)
    setDescription("")
    setRecipientName("")
    setRecipientEmail("")
    setBudget("")
    setIsLoading(false)
    setError(null)
    setResult(null)
    setLoadingIndex(0)
  }

  async function handleSubmit(): Promise<void> {
    if (isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim(),
          budgetEuros: Number(budget),
        }),
      })

      const data: GiftResultType = await response.json()

      if (data.success && data.productName) {
        setResult({
          productName: data.productName,
          recipientEmail: recipientEmail.trim(),
        })
      } else {
        setError(data.error ?? "Something went wrong. Please try again.")
      }
    } catch {
      setError("Could not reach the server. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (result) {
    return (
      <GiftResult
        productName={result.productName}
        recipientEmail={result.recipientEmail}
        onReset={handleReset}
      />
    )
  }

  if (isLoading) {
    return (
      <Card>
        <div className="flex flex-col items-center py-6 text-center">
          <Spinner size={32} className="text-[#111111]" />
          <p className="mt-4 text-sm text-gray-500" aria-live="polite">
            {LOADING_MESSAGES[loadingIndex]}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${
              n <= step ? "bg-black" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <Card>
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="description">Who is this for?</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="My friend just landed a new job in Tokyo, budget is 30 euros"
                className="mt-2 min-h-32 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="mt-2 text-sm text-gray-500">
                Describe the recipient and the occasion. The more detail, the better the match.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => setStep(2)}
                disabled={!step1Valid}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="recipientName">Recipient name</Label>
              <Input
                id="recipientName"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="recipientEmail">Recipient email</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="jane@example.com"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="budget">Budget (euros)</Label>
              <Input
                id="budget"
                type="number"
                min={5}
                max={200}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="30"
                className="mt-2"
              />
              <p className="mt-2 text-sm text-gray-500">Between 5 and 200 euros.</p>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep(3)}
                disabled={!step2Valid}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-[#111111]">Review your gift</h2>

            <dl className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  Description
                </dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[#111111]">
                  {description.trim()}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  Recipient
                </dt>
                <dd className="mt-1 text-sm text-[#111111]">{recipientName.trim()}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  Email
                </dt>
                <dd className="mt-1 break-words text-sm text-[#111111]">
                  {recipientEmail.trim()}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  Budget
                </dt>
                <dd className="mt-1 text-sm text-[#111111]">{Number(budget)} euros</dd>
              </div>
            </dl>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  className="mt-2 text-sm font-medium text-red-600 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                >
                  Try again
                </button>
              </div>
            ) : null}

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => void handleSubmit()}>
                Send Gift
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
