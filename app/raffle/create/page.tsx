import RaffleCreate from "@/components/RaffleCreate"

export default function RaffleCreatePage(): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">
        Create a Giveaway
      </h1>
      <p className="mt-3 text-gray-500">
        Set up a giveaway, share the entry link with participants, and draw
        winners when you are ready. Each winner gets a gift chosen to fit the
        occasion.
      </p>
      <div className="mt-10">
        <RaffleCreate />
      </div>
    </div>
  )
}
