import React from "react"
import GiftFlow from "@/components/GiftFlow"

export default function GiftPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111111]">Send a Gift</h1>
        <p className="mt-2 text-sm text-gray-500">
          Describe the recipient and we will pick and deliver the perfect gift card.
        </p>
      </div>
      <GiftFlow />
    </main>
  )
}
