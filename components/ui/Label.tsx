import React from "react"

type LabelProps = {
  children: React.ReactNode
  htmlFor?: string
  className?: string
}

export default function Label({ children, htmlFor, className = "" }: LabelProps): JSX.Element {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500 ${className}`.trim()}
    >
      {children}
    </label>
  )
}
