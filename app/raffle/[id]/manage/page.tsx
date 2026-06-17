import RaffleManage from "@/components/RaffleManage"

export default function RaffleManagePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { token?: string }
}): JSX.Element {
  const token = typeof searchParams.token === "string" ? searchParams.token : ""

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <RaffleManage raffleId={params.id} manageToken={token} />
    </div>
  )
}
