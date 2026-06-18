import { Mail, Phone, MessageCircle } from "lucide-react"

const CONTACTS = [
  {
    icon: Mail,
    label: "Email us",
    value: "hello@novahr.co.za",
    href: "mailto:hello@novahr.co.za",
  },
  {
    icon: Phone,
    label: "Call us",
    value: "+27 11 123 4567",
    href: "tel:+27111234567",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+27 60 000 0000",
    href: "https://wa.me/27600000000",
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
            key={href}
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
