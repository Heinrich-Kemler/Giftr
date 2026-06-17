"use client"

import React from "react"
import Spinner from "@/components/ui/Spinner"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline"
  loading?: boolean
  fullWidth?: boolean
}

export default function Button({
  variant = "primary",
  loading = false,
  fullWidth = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps): JSX.Element {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg py-3 px-6 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
  const variantClasses =
    variant === "outline"
      ? "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
      : "bg-black text-white hover:bg-gray-700"
  const widthClass = fullWidth ? "w-full" : ""

  return (
    <button
      type={type}
      className={`${base} ${variantClasses} ${widthClass} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : null}
      {children}
    </button>
  )
}
