import React from "react"

type CardProps = {
  children: React.ReactNode
  className?: string
  interactive?: boolean
}

export default function Card({
  children,
  className = "",
  interactive = false,
}: CardProps): JSX.Element {
  const interactiveClass = interactive ? "transition-shadow hover:shadow-card-hover" : ""
  return (
    <div
      className={`rounded-xl border border-line bg-white p-6 shadow-card ${interactiveClass} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
