"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Search,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@novabos.co.za";
const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL ?? "sales@novabos.co.za";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "27765036486";
const WHATSAPP_DISPLAY = "076 503 6486";

type Faq = { q: string; a: string; keywords: string };

const FAQS: Faq[] = [
  {
    q: "How do employees get access to NovaHR?",
    a: "Invite them from Settings, then Users, one at a time or in bulk from the employee list. Each person gets a secure link, sets a password, and sees only their own payslips, leave and profile.",
    keywords: "invite access login employee self service user onboard",
  },
  {
    q: "How do I run my first payroll?",
    a: "Open Payroll, start a run for the period, add any variable pay, then approve, complete and publish payslips. The full step-by-step is in the Help Centre under Running payroll.",
    keywords: "payroll run first start pay period publish payslip",
  },
  {
    q: "When can employees see their payslips?",
    a: "As soon as you publish the run. Employees download their own payslips and tax certificates from their account, no need to email them.",
    keywords: "payslip publish employee download self service certificate",
  },
  {
    q: "How are PAYE, UIF and SDL calculated?",
    a: "Automatically, using SARS-validated tax tables. NovaHR handles annualised PAYE with rebates and age thresholds, the medical-aid credit, pension and RA caps, UIF and SDL.",
    keywords: "paye uif sdl tax calculation sars rebate medical pension",
  },
  {
    q: "Which SARS and Labour returns are included?",
    a: "EMP201, EMP501, IRP5 and IT3(a) certificates, ETI, the UIF declaration, COIDA Return of Earnings, and Employment Equity (EEA2 and EEA4). All included, no add-ons.",
    keywords: "emp201 emp501 irp5 it3a eti uif coida employment equity eea statutory return filing",
  },
  {
    q: "How do I import many employees at once?",
    a: "Go to Employees, then Import. Download the CSV template, fill in one row per employee, and upload. NovaHR validates every row before anything is created.",
    keywords: "bulk import csv employees upload template onboard many",
  },
  {
    q: "How does leave work?",
    a: "NovaHR follows the BCEA and is configurable per company: entitlements, accrual or upfront, carryover and sick-note rules. Employees request leave, managers approve, and balances update automatically.",
    keywords: "leave bcea annual sick family approve balance policy accrual",
  },
  {
    q: "Can I customise how payslips look?",
    a: "Yes. Go to Settings, then Appearance, then Payslips to choose a template, accent colour, logo and footer note, with a live preview.",
    keywords: "payslip template branding logo colour appearance customise",
  },
  {
    q: "What does NovaHR cost?",
    a: `R349 per month plus R30 per employee, with every feature included and a free trial. Teams above 150 employees are custom. Billing questions? Email ${SALES_EMAIL}.`,
    keywords: "price pricing cost billing plan subscription trial how much",
  },
  {
    q: "Is my payroll data secure?",
    a: "Yes. Each company's data is isolated, sensitive fields are encrypted, payslip PDFs mask ID and account numbers, and you can turn on two-factor sign-in.",
    keywords: "security popia privacy encrypted data protection two factor",
  },
  {
    q: "Why did my Netcash key test fail?",
    a: "Check that you copied the full service key from the Netcash portal (Account profile, then NetConnector), that the service is active, and that the right environment (Live or Testing) is selected under Settings, then Payroll, then Netcash.",
    keywords: "netcash key invalid failed test service bank eft",
  },
];

function SupportRow({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  external,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
}) {
  const inner = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      {external ? <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  const className =
    "flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2.5 transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={className}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function FaqItem({ faq, forceOpen }: { faq: Faq; forceOpen: boolean }) {
  const [open, setOpen] = React.useState(false);
  const expanded = open || forceOpen;
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none"
      >
        <span className="flex-1 text-sm font-medium">{faq.q}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded ? (
        <p className="pb-3 pr-7 text-[13px] leading-relaxed text-muted-foreground">{faq.a}</p>
      ) : null}
    </div>
  );
}

export function SupportHub() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const q = query.trim().toLowerCase();
  const faqs = q
    ? FAQS.filter((f) => `${f.q} ${f.a} ${f.keywords}`.toLowerCase().includes(q))
    : FAQS;

  async function copyDiagnostics() {
    const lines = [
      `NovaHR diagnostics`,
      `Version: ${APP_VERSION}`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Role: ${user?.role ?? "unknown"}`,
      `Tenant: ${user?.tenantId ?? "unknown"}`,
      `Browser: ${navigator.userAgent}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Diagnostic information copied", {
        description: "Paste it into your support message.",
      });
    } catch {
      toast.error("Could not copy diagnostics", {
        description: "Copy the details manually from your browser.",
      });
    }
  }

  const mailto = (to: string, subject: string) =>
    `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      `\n\n---\nNovaHR ${APP_VERSION} · ${user?.role ?? ""} · ${user?.tenantId ?? ""}`
    )}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 text-muted-foreground">
          <HelpCircle className="size-[18px]" />
          <span className="sr-only">Help and support</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-1">
          <SheetTitle>Help &amp; support</SheetTitle>
          <SheetDescription>Guides, answers, and ways to reach us.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-7 px-4 pb-8 pt-2">
          {/* Help centre */}
          <div className="flex flex-col gap-1.5">
            <SupportRow
              icon={BookOpen}
              title="Browse the Help Centre"
              description="Every feature, explained step by step with screenshots"
              href="/help/index.html"
              external
            />
            <SupportRow
              icon={FileText}
              title="Download the user manual"
              description="The complete NovaHR guide as a PDF"
              href="/help/NovaHR-User-Manual.pdf"
              external
            />
          </div>

          {/* FAQs */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Frequently asked questions
            </p>
            <div className="relative mb-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions"
                className="pl-9"
                aria-label="Search frequently asked questions"
              />
            </div>
            <div className="rounded-lg border border-border px-3">
              {faqs.length > 0 ? (
                faqs.map((f) => <FaqItem key={f.q} faq={f} forceOpen={q.length > 0} />)
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  No questions match your search. Reach us below and we will help.
                </p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contact us
            </p>
            <div className="flex flex-col gap-1">
              <SupportRow
                icon={MessageCircle}
                title="WhatsApp us"
                description={`Chat on ${WHATSAPP_DISPLAY} (messages only)`}
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I need help with NovaHR")}`}
                external
              />
              <SupportRow
                icon={Mail}
                title="Sales &amp; general enquiries"
                description={`Pricing, billing and questions · ${SALES_EMAIL}`}
                href={mailto(SALES_EMAIL, "NovaHR enquiry")}
              />
              <SupportRow
                icon={Wrench}
                title="Technical support"
                description={`A problem with the app · ${SUPPORT_EMAIL}`}
                href={mailto(SUPPORT_EMAIL, "NovaHR support request")}
              />
              <SupportRow
                icon={ClipboardCopy}
                title="Copy diagnostic information"
                description="Version and session details to speed up support"
                onClick={copyDiagnostics}
              />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">NovaHR v{APP_VERSION}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
