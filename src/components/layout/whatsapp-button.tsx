"use client"

import Link from "next/link"
import { Phone } from "lucide-react"

// TODO: replace with your support WhatsApp number (format: country code + number, no +)
const WHATSAPP_NUMBER = "27600000000"
const WHATSAPP_MESSAGE = "Hi, I need help with NovaHR"

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact support on WhatsApp"
      className="fixed bottom-6 right-5 z-50 md:hidden flex size-14 items-center justify-center rounded-full bg-background border-2 border-[#25D366] text-[#25D366] shadow-lg transition-all hover:bg-[#25D366]/10 hover:shadow-xl"
    >
      <Phone className="size-6" />
    </Link>
  )
}
