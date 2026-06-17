"use client"

import React from "react"
import Card from "@/components/ui/Card"

type GiftResultProps = {
  productName: string
  recipientEmail: string
  onReset?: () => void
}

export default function GiftResult({
  productName,
  recipientEmail,
  onReset,
}: GiftResultProps): JSX.Element {
  return (
    <Card className="text-center">
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-emerald-600"
            role="img"
            aria-label="Success"
          >
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-semibold text-[#111111]">Gift sent.</h2>

        <p className="mt-2 text-base font-medium text-[#111111]">{productName}</p>

        <p className="mt-1 text-sm text-gray-500">
          Delivered to {recipientEmail}.
        </p>

        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="mt-6 text-sm font-medium text-gray-500 underline-offset-4 hover:text-[#111111] hover:underline focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            Send another gift
          </button>
        ) : null}
      </div>
    </Card>
  )
}
