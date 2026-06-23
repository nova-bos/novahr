import { Mail, Phone, MessageCircle } from "lucide-react"

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "27600000000"

const CONTACTS = [
  {
    icon: Mail,
    label: "Email us",
    value: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@novahr.co.za",
    href: `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@novahr.co.za"}`,
  },
  {
    icon: Phone,
    label: "Call us",
    value: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+27 11 123 4567",
    href: `tel:${(process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+27111234567").replace(/\s/g, "")}`,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: `+${SUPPORT_WHATSAPP.slice(0, 2)} ${SUPPORT_WHATSAPP.slice(2, 4)} ${SUPPORT_WHATSAPP.slice(4, 7)} ${SUPPORT_WHATSAPP.slice(7)}`,
    href: `https://wa.me/${SUPPORT_WHATSAPP}`,
  },
]

export function ContactSection() {
  return (
    <section id="contact">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Get in touch
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Have questions about NovaHR? Our team is happy to help.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {CONTACTS.map(({ icon: Icon, label, value, href }) => (
          <div
            key={label}
            className="bg-card border rounded-xl p-6 flex flex-col items-center text-center gap-4"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {value}
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
