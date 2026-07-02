"use client";

import * as React from "react";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactFormAction } from "@/lib/marketing/contact-action";

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "27600000000";

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
];

export function ContactSection() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ success?: boolean; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    const res = await submitContactFormAction({ name, email, company, message });
    setResult(res);
    setSubmitting(false);
    if (res.success) {
      setName("");
      setEmail("");
      setCompany("");
      setMessage("");
    }
  }

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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-10">
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

      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8">
        <h3 className="text-lg font-semibold mb-6">Send us a message</h3>
        {result?.success ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Message sent. We will get back to you within one business day.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-company">Company (optional)</Label>
              <Input
                id="contact-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={submitting}
                placeholder="Your company name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={submitting}
                placeholder="How can we help?"
              />
            </div>
            {result?.error ? (
              <p className="text-sm text-destructive">{result.error}</p>
            ) : null}
            <Button type="submit" disabled={submitting} className="self-end">
              {submitting ? "Sending..." : "Send message"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
