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
      className={`w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black ${className}`.trim()}
      {...rest}
    />
  )
})

export default Input
