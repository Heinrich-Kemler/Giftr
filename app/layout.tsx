import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Navbar from "@/components/Navbar"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Giftr",
  description: "Send the right gift, every time.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-white text-[#111111]`}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
