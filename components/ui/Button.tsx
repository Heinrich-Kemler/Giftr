"use client"

import React from "react"
import Spinner from "@/components/ui/Spinner"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "outline" | "ghost"
  loading?: boolean
  fullWidth?: boolean
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  // teal — trust / actions
  primary: "bg-brand text-white hover:bg-brand/90",
  // tangerine — primary CTAs / energy
  accent: "bg-brand-accent text-white hover:bg-brand-accent/90",
  outline: "border border-line bg-white text-ink hover:bg-surface-subtle",
  ghost: "bg-transparent text-ink hover:bg-surface-subtle",
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
    "inline-flex items-center justify-center gap-2 rounded-lg py-3 px-6 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
  const widthClass = fullWidth ? "w-full" : ""

  return (
    <button
      type={type}
      className={`${base} ${VARIANTS[variant]} ${widthClass} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : null}
      {children}
    </button>
  )
}
