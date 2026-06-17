"use client"

import { useParams } from "next/navigation"
import RaffleEntry from "@/components/RaffleEntry"

export default function RaffleEntryPage(): JSX.Element {
  const params = useParams<{ id: string }>()
  const id = typeof params.id === "string" ? params.id : ""

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <RaffleEntry raffleId={id} />
    </div>
  )
}
