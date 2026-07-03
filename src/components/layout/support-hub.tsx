"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bug,
  CalendarRange,
  ClipboardCopy,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Mail,
  MessageCircle,
  Search,
  Users,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@novahr.co.za";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "27600000000";

interface GuideEntry {
  id: string;
  title: string;
  icon: React.ElementType;
  keywords: string;
  steps: string[];
}

const GUIDES: GuideEntry[] = [
  {
    id: "payroll",
    title: "Payroll guide",
    icon: Wallet,
    keywords: "payroll run payslip netcash submit salary paye uif sdl publish finalize",
    steps: [
      "Open Payroll and review the current run's pay date, eligible employees and projected totals.",
      "Select Start payroll run, then review each employee's calculated payslip.",
      "Finalize and publish payslips. Employees are notified automatically.",
      "Use Submit payroll to Netcash to upload the salary batch for payment.",
      "Track past runs and download payslips or bank files under Payroll history.",
    ],
  },
  {
    id: "leave",
    title: "Leave guide",
    icon: CalendarRange,
    keywords: "leave annual sick request approve balance policy holiday family responsibility",
    steps: [
      "Employees request leave from the Leave page. Balances and public holidays are applied automatically.",
      "Managers and HR approve or decline requests from the approvals queue.",
      "Balances update immediately after approval, using each policy's accrual rules.",
      "Configure leave policies under Settings, then Leave policies.",
    ],
  },
  {
    id: "employees",
    title: "Employee management guide",
    icon: Users,
    keywords: "employee onboarding add new hire terminate profile banking documents invite",
    steps: [
      "Add a new employee from Employees, then Add employee. The wizard collects personal, role, and pay details.",
      "Bank details are validated so salary payments do not bounce.",
      "Invite employees to self-service from Settings, then Users.",
      "Terminate an employee from their profile. Records are retained for compliance.",
    ],
  },
];

const FAQS: { q: string; a: string; keywords: string }[] = [
  {
    q: "Why did my Netcash key test fail?",
    a: "Check that you copied the full service key from the Netcash portal (Account profile, then NetConnector), that the service is active on your Netcash account, and that the right environment (Live or Testing) is selected under Settings, then Payroll, then Netcash integration.",
    keywords: "netcash key invalid failed test service",
  },
  {
    q: "When should I load a salary batch?",
    a: "For DatedSalaries, load the batch by 12:59 on the business day before the pay date. Real-time instructions process the same day.",
    keywords: "netcash batch cutoff time load salary dated",
  },
  {
    q: "How do I change how payslips look?",
    a: "Go to Settings, then Appearance, then Payslips. You can pick a template, accent colour, logo, and footer note, and see a live preview.",
    keywords: "payslip template colour logo branding appearance customise",
  },
  {
    q: "How do employees get access to NovaHR?",
    a: "HR can send an invitation from Settings, then Users. The employee sets a password and sees only their own payslips, leave and profile.",
    keywords: "invite user access login employee self service",
  },
  {
    q: "Is my payroll data secure?",
    a: "Yes. Each company's data is isolated per tenant, service keys are encrypted at rest, and payslip PDFs mask ID and account numbers.",
    keywords: "security popia privacy encrypted data",
  },
];

function SupportRow({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  badge,
  disabled,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {badge ? (
            <Badge variant="outline" className="text-[10px]">
              {badge}
            </Badge>
          ) : null}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      {href ? <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" /> : null}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors",
    disabled
      ? "opacity-60 cursor-default"
      : "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  );

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {inner}
    </button>
  );
}

function GuideSection({ guide, forceOpen }: { guide: GuideEntry; forceOpen: boolean }) {
  const [open, setOpen] = React.useState(false);
  const expanded = open || forceOpen;
  const Icon = guide.icon;
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="size-4 text-primary" />
        <span className="flex-1 text-sm font-medium">{guide.title}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <ol className="list-decimal space-y-1.5 border-t border-border px-3 py-3 pl-8 text-xs text-muted-foreground">
          {guide.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function SupportHub() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const q = query.trim().toLowerCase();
  const matchedGuides = q
    ? GUIDES.filter((g) => `${g.title} ${g.keywords}`.toLowerCase().includes(q))
    : GUIDES;
  const matchedFaqs = q
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
      toast.error("Could not copy diagnostics", { description: "Copy the details manually from your browser." });
    }
  }

  const mailto = (subject: string) =>
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
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
        <SheetHeader className="pb-2">
          <SheetTitle>Help &amp; Support</SheetTitle>
          <SheetDescription>
            Guides, answers and ways to reach the NovaHR team.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides and FAQs"
              className="pl-9"
              aria-label="Search documentation"
            />
          </div>

          {/* Guides */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Help centre
            </p>
            <div className="flex flex-col gap-2">
              {matchedGuides.map((g) => (
                <GuideSection key={g.id} guide={g} forceOpen={q.length > 0} />
              ))}
              {matchedGuides.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No guides match your search.</p>
              ) : null}
            </div>
          </div>

          {/* FAQs */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Frequently asked questions
            </p>
            <div className="flex flex-col gap-3">
              {matchedFaqs.map((f) => (
                <div key={f.q}>
                  <p className="text-sm font-medium">{f.q}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.a}</p>
                </div>
              ))}
              {matchedFaqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No answers match your search.</p>
              ) : null}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contact us
            </p>
            <div className="flex flex-col gap-1">
              <SupportRow
                icon={Mail}
                title="Email support"
                description={SUPPORT_EMAIL}
                href={mailto("NovaHR support request")}
              />
              <SupportRow
                icon={MessageCircle}
                title="WhatsApp support"
                description="Chat with us during business hours"
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I need help with NovaHR")}`}
              />
              <SupportRow
                icon={Bug}
                title="Report a bug"
                description="Something broken? Tell us what happened"
                href={mailto("NovaHR bug report")}
              />
              <SupportRow
                icon={Lightbulb}
                title="Request a feature"
                description="Suggest an improvement to NovaHR"
                href={mailto("NovaHR feature request")}
              />
              <SupportRow
                icon={MessageCircle}
                title="Live chat"
                description="In-app chat support"
                badge="Coming soon"
                disabled
              />
              <SupportRow
                icon={ClipboardCopy}
                title="Copy diagnostic information"
                description="Version, browser and session details for support"
                onClick={copyDiagnostics}
              />
            </div>
          </div>

          {/* Status */}
          <div className="rounded-lg border border-border px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 font-medium">
                <span className="size-2 rounded-full bg-success" aria-hidden />
                All systems operational
              </span>
              <span className="text-muted-foreground">NovaHR v{APP_VERSION}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
