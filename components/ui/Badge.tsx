import React from "react"

// Status pill following the Giftr brand status language:
// success = Delivered / Payment confirmed; pending = Polling delivery / In progress;
// error = Redemption failed / Needs attention; info = Searching / Intent received;
// neutral = Scheduled / Not started.
type BadgeVariant = "success" | "pending" | "error" | "info" | "neutral"

type BadgeProps = {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
  className?: string
}

const VARIANTS: Record<BadgeVariant, string> = {
  success: "bg-success/15 text-green-700",
  pending: "bg-pending/15 text-amber-700",
  error: "bg-error/15 text-red-700",
  info: "bg-brand/15 text-teal-700",
  neutral: "bg-slate-100 text-slate-600",
}

export default function Badge({
  variant = "neutral",
  children,
  dot = true,
  className = "",
}: BadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANTS[variant]} ${className}`.trim()}
    >
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}
