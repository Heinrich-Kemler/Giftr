"use client"

import React, { forwardRef } from "react"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...rest },
  ref,
): JSX.Element {
  return (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-line bg-white px-4 py-3 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand ${className}`.trim()}
      {...rest}
    />
  )
})

export default Input
