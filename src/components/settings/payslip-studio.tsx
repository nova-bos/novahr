"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlignCenter, AlignLeft, AlignRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, OptionalTag } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentTenant } from "@/lib/store/hooks";
import {
  getPayslipSettingsAction,
  updatePayslipSettingsAction,
} from "@/lib/settings/actions";
import { cn } from "@/lib/utils";

type LogoAlignment = "left" | "center" | "right";

const TEMPLATES = [
  { id: "classic", name: "Classic", description: "Monochrome ledger. Labelled identity grid and hairline tables with a ruled net-pay line. Print-first and formal." },
  { id: "modern", name: "Modern", description: "Accent header band with a Gross / Deductions / Net summary strip and earnings and deductions side by side." },
  { id: "corporate", name: "Corporate", description: "Statutory statement. Registration and PAYE, UIF and SDL references, employer contributions and leave balances." },
  { id: "branded", name: "Branded", description: "Bold accent hero with a large net-pay statement front and centre. Designed for a polished, on-brand feel." },
] as const;

const ACCENT_PRESETS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#00A8E8", label: "Blue" },
  { value: "#0891b2", label: "Teal" },
  { value: "#16a34a", label: "Green" },
  { value: "#ea580c", label: "Orange" },
  { value: "#dc2626", label: "Red" },
  { value: "#9333ea", label: "Purple" },
  { value: "#0f172a", label: "Slate" },
];

const ALIGNMENTS: { value: LogoAlignment; label: string; icon: typeof AlignLeft }[] = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Centre", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface StudioState {
  template: string;
  accentColor: string;
  logoUrl: string | null;
  logoAlignment: LogoAlignment;
  companyName: string;
  footerNote: string;
  showBanking: boolean;
  showYtd: boolean;
}

// Sample figures used only for the on-screen preview.
const SAMPLE = {
  employee: "Thandi Nkosi",
  title: "Software Engineer",
  department: "Engineering",
  empNo: "EMP001",
  period: "June 2026",
  payDate: "25 Jun 2026",
  earnings: [
    { label: "Basic salary", amount: "R32,500.00", ytd: "R97,500.00" },
    { label: "Travel allowance", amount: "R2,000.00", ytd: "R6,000.00" },
  ],
  gross: "R34,500.00",
  grossYtd: "R103,500.00",
  deductions: [
    { label: "PAYE", amount: "R6,245.00", ytd: "R18,735.00" },
    { label: "UIF", amount: "R177.12", ytd: "R531.36" },
  ],
  totalDeductions: "R6,422.12",
  totalDeductionsYtd: "R19,266.36",
  netPay: "R28,077.88",
};

const alignClass: Record<LogoAlignment, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

function BrandBlock({ state, light }: { state: StudioState; light?: boolean }) {
  const name = state.companyName.trim() || "NovaHR";
  return (
    <div className={cn("flex flex-col", alignClass[state.logoAlignment])}>
      {state.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={state.logoUrl} alt="" className="h-6 object-contain mb-1" />
      ) : null}
      <p className={cn("font-bold leading-tight text-sm", light && "text-white")}>{name}</p>
      <p className={cn("text-[8px]", light ? "text-white/80" : "text-neutral-500")}>Employee payslip</p>
    </div>
  );
}

function MiniTable({
  title, rows, total, showYtd, accent, bordered, dense,
}: {
  title: string;
  rows: { label: string; amount: string; ytd: string }[];
  total: { label: string; amount: string; ytd: string };
  showYtd: boolean;
  accent: string;
  bordered?: boolean;
  dense?: boolean;
}) {
  const textCls = dense ? "text-[6px]" : "text-[8px]";
  const amt = cn("flex-[4] text-right tabular-nums whitespace-nowrap", textCls);
  const desc = cn("flex-[5] truncate", textCls);
  return (
    <div className="mb-3">
      <p className="text-[7px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>{title}</p>
      <div className={cn("flex gap-1.5 px-2 py-1 text-[6px] font-bold uppercase tracking-wide text-neutral-500", bordered && "border border-neutral-300")} style={{ backgroundColor: `${accent}12` }}>
        <span className="flex-[5]">Description</span>
        <span className="flex-[4] text-right whitespace-nowrap">{showYtd ? "Month" : "Amount"}</span>
        {showYtd ? <span className="flex-[4] text-right whitespace-nowrap">YTD</span> : null}
      </div>
      {rows.map((r) => (
        <div key={r.label} className={cn("flex gap-1.5 px-2 py-1 text-neutral-700 border-b border-neutral-100", bordered && "border-x border-neutral-200")}>
          <span className={desc}>{r.label}</span>
          <span className={amt}>{r.amount}</span>
          {showYtd ? <span className={cn(amt, "text-neutral-400")}>{r.ytd}</span> : null}
        </div>
      ))}
      <div className="flex gap-1.5 px-2 py-1 font-bold text-neutral-900" style={{ backgroundColor: `${accent}12` }}>
        <span className={cn("flex-[5]", textCls)}>{total.label}</span>
        <span className={amt}>{total.amount}</span>
        {showYtd ? <span className={amt}>{total.ytd}</span> : null}
      </div>
    </div>
  );
}

function PayslipPreview({ state }: { state: StudioState }) {
  const accent = HEX_RE.test(state.accentColor) ? state.accentColor : "#6366f1";
  const name = state.companyName.trim() || "NovaHR";
  const showYtd = state.showYtd;

  const earn = { title: "Earnings", rows: SAMPLE.earnings, total: { label: "Gross pay", amount: SAMPLE.gross, ytd: SAMPLE.grossYtd }, showYtd, accent };
  const ded = { title: "Deductions", rows: SAMPLE.deductions.map((d) => ({ ...d, amount: `-${d.amount}`, ytd: `-${d.ytd}` })), total: { label: "Total deductions", amount: `-${SAMPLE.totalDeductions}`, ytd: `-${SAMPLE.totalDeductionsYtd}` }, showYtd, accent };

  const shell = "rounded-lg border border-border bg-white text-neutral-900 shadow-sm overflow-hidden aspect-[210/297] flex flex-col";

  // ── CLASSIC ──
  if (state.template === "classic") {
    return (
      <div className={shell} aria-label="Classic payslip preview">
        <div className="px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <BrandBlock state={state} />
            <div className="border border-neutral-900 p-2 text-[7px] min-w-[92px] space-y-0.5">
              <div className="flex justify-between gap-2"><span className="text-neutral-500">Payslip</span><span className="font-bold whitespace-nowrap">2026-06</span></div>
              <div className="flex justify-between gap-2"><span className="text-neutral-500">Period</span><span className="font-bold whitespace-nowrap">{SAMPLE.period}</span></div>
              <div className="flex justify-between gap-2"><span className="text-neutral-500">Pay date</span><span className="font-bold whitespace-nowrap">{SAMPLE.payDate}</span></div>
            </div>
          </div>
          <div className="border-b-2 border-neutral-900 mt-3 mb-4" />
          <div className="flex flex-wrap gap-y-2.5 mb-4">
            {[["Employee", SAMPLE.employee], ["Employee number", SAMPLE.empNo], ["Job title", SAMPLE.title], ["Department", SAMPLE.department]].map(([l, v]) => (
              <div key={l} className="w-1/2 pr-2"><p className="text-[6px] uppercase tracking-wide text-neutral-400">{l}</p><p className="text-[8px] font-bold truncate">{v}</p></div>
            ))}
          </div>
          <MiniTable {...earn} accent="#333333" />
          <MiniTable {...ded} accent="#333333" />
          <div className="flex items-center justify-between border-y-2 border-neutral-900 py-2 mt-1">
            <span className="text-[9px] font-bold uppercase tracking-wide">Net pay</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>{SAMPLE.netPay}</span>
          </div>
        </div>
        <p className="mt-auto px-5 pb-3 text-center text-[6px] text-neutral-400 border-t border-neutral-200 pt-2">{name} · Computer-generated payslip · NovaHR</p>
      </div>
    );
  }

  // ── MODERN ──
  if (state.template === "modern") {
    return (
      <div className={shell} aria-label="Modern payslip preview">
        <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ backgroundColor: accent }}>
          <BrandBlock state={state} light />
          <div className="text-right text-[7px] text-white/80 shrink-0">
            <p className="uppercase tracking-wide">Pay period</p>
            <p className="font-bold text-white text-[8px] whitespace-nowrap">{SAMPLE.period}</p>
          </div>
        </div>
        <div className="px-5 py-4 flex-1">
          <p className="text-[10px] font-bold">{SAMPLE.employee}</p>
          <p className="text-[8px] text-neutral-500 mb-3 truncate">{SAMPLE.title} · {SAMPLE.department} · {SAMPLE.empNo}</p>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 rounded-md p-2" style={{ backgroundColor: `${accent}12` }}><p className="text-[6px] uppercase text-neutral-500">Gross</p><p className="text-[8px] font-bold tabular-nums whitespace-nowrap mt-0.5">{SAMPLE.gross}</p></div>
            <div className="flex-1 rounded-md p-2" style={{ backgroundColor: `${accent}12` }}><p className="text-[6px] uppercase text-neutral-500">Deductions</p><p className="text-[8px] font-bold tabular-nums whitespace-nowrap mt-0.5">-{SAMPLE.totalDeductions}</p></div>
            <div className="flex-1 rounded-md p-2 text-white" style={{ backgroundColor: accent }}><p className="text-[6px] uppercase text-white/80">Net</p><p className="text-[8px] font-bold tabular-nums whitespace-nowrap mt-0.5">{SAMPLE.netPay}</p></div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><MiniTable {...earn} dense /></div>
            <div className="flex-1"><MiniTable {...ded} dense /></div>
          </div>
          <div className="flex items-center justify-between rounded-md px-3 py-2.5 text-white mt-3" style={{ backgroundColor: accent }}>
            <div><span className="text-[9px] font-bold">Net pay</span><p className="text-[6px] text-white/80">Paid {SAMPLE.payDate}</p></div>
            <span className="text-sm font-bold tabular-nums">{SAMPLE.netPay}</span>
          </div>
        </div>
        <p className="px-5 pb-3 text-center text-[6px] text-neutral-400 pt-2">{name} · NovaHR</p>
      </div>
    );
  }

  // ── CORPORATE ──
  if (state.template === "corporate") {
    return (
      <div className={shell} aria-label="Corporate payslip preview">
        <div className="px-5 py-3 flex items-start justify-between gap-3 bg-neutral-100" style={{ borderBottom: `2px solid ${accent}` }}>
          <div className={cn("flex flex-col min-w-0", alignClass[state.logoAlignment])}>
            {state.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.logoUrl} alt="" className="h-5 object-contain mb-1" />
            ) : null}
            <p className="text-[11px] font-bold truncate">{name}</p>
            <p className="text-[6px] text-neutral-500 mt-0.5">Registration: 2019/123456/07</p>
            <p className="text-[6px] text-neutral-500">PAYE: 7990112345 · UIF: U123456 · SDL: L123456</p>
          </div>
          <div className="text-right text-[6px] text-neutral-500 shrink-0 space-y-0.5">
            <div><p className="uppercase">Payslip</p><p className="font-bold text-neutral-900 text-[7px] whitespace-nowrap">2026-06</p></div>
            <div><p className="uppercase">Period</p><p className="font-bold text-neutral-900 text-[7px] whitespace-nowrap">{SAMPLE.period}</p></div>
            <div><p className="uppercase">Frequency</p><p className="font-bold text-neutral-900 text-[7px]">Monthly</p></div>
          </div>
        </div>
        <div className="px-5 py-3 flex-1">
          <div className="flex flex-wrap gap-y-1.5 border border-neutral-300 rounded p-2 mb-3">
            {[["Employee", SAMPLE.employee], ["Employee no.", SAMPLE.empNo], ["ID", "******1234"], ["Tax no", "0123456789"], ["Job title", SAMPLE.title], ["Department", SAMPLE.department]].map(([l, v]) => (
              <div key={l} className="w-1/3 pr-1.5"><p className="text-[5px] uppercase text-neutral-400">{l}</p><p className="text-[7px] font-bold truncate">{v}</p></div>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><MiniTable {...earn} accent="#555555" bordered dense /></div>
            <div className="flex-1"><MiniTable {...ded} accent="#555555" bordered dense /></div>
          </div>
          <div className="flex items-center justify-between border rounded px-3 py-2 my-3" style={{ borderColor: accent }}>
            <div><span className="text-[9px] font-bold">Net pay</span><p className="text-[6px] text-neutral-500">Amount paid into bank account</p></div>
            <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>{SAMPLE.netPay}</span>
          </div>
          <div className="flex gap-2">
            {[["Annual leave", "15"], ["Sick leave", "8"], ["Family", "3"]].map(([l, v]) => (
              <div key={l} className="flex-1 border border-neutral-300 rounded p-1.5"><p className="text-[5px] uppercase text-neutral-400">{l} left</p><p className="text-[9px] font-bold mt-0.5">{v} <span className="text-[5px] text-neutral-400">days</span></p></div>
            ))}
          </div>
        </div>
        <p className="px-5 pb-3 text-center text-[5px] text-neutral-400 border-t border-neutral-200 pt-2">{name} · Statutory deductions per the Income Tax and UIF Acts · NovaHR</p>
      </div>
    );
  }

  // ── BRANDED ──
  return (
    <div className={shell} aria-label="Branded payslip preview">
      <div className={cn("px-5 py-6 flex flex-col", alignClass[state.logoAlignment])} style={{ backgroundColor: accent }}>
        {state.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.logoUrl} alt="" className="h-7 object-contain mb-2" />
        ) : null}
        <p className="text-base font-bold text-white">{name}</p>
        <p className="text-[8px] uppercase tracking-widest text-white/80 mt-1">Payslip · {SAMPLE.period}</p>
      </div>
      <div className="px-5 py-5 flex-1">
        <div className="text-center mb-5">
          <p className="text-[8px] text-neutral-500">Net pay for</p>
          <p className="text-[10px] font-bold">{SAMPLE.employee}</p>
          <p className="text-lg font-bold mt-1.5 tabular-nums" style={{ color: accent }}>{SAMPLE.netPay}</p>
          <p className="text-[7px] text-neutral-500 mt-1">{SAMPLE.title} · Paid {SAMPLE.payDate}</p>
        </div>
        <div className="flex justify-center gap-5 mb-5">
          {[["Payslip", "2026-06"], ["Employee no.", SAMPLE.empNo], ["Gross", SAMPLE.gross]].map(([l, v]) => (
            <div key={l} className="text-center"><p className="text-[5px] uppercase text-neutral-400">{l}</p><p className="text-[8px] font-bold tabular-nums whitespace-nowrap mt-0.5">{v}</p></div>
          ))}
        </div>
        <div className="h-0.5 w-8 rounded mx-auto mb-5" style={{ backgroundColor: accent }} />
        {[earn, ded].map((t) => (
          <div key={t.title} className="mb-4">
            <div className="flex items-center mb-1.5"><span className="w-0.5 h-2.5 rounded mr-1.5" style={{ backgroundColor: accent }} /><span className="text-[8px] font-bold uppercase tracking-wide">{t.title}</span></div>
            {t.rows.map((r) => (
              <div key={r.label} className="flex gap-2 py-1 border-b border-neutral-100 text-[8px]"><span className="flex-[5] text-neutral-700 truncate">{r.label}</span><span className="flex-[4] text-right tabular-nums whitespace-nowrap">{r.amount}</span>{showYtd ? <span className="flex-[4] text-right text-[7px] text-neutral-400 tabular-nums whitespace-nowrap">{r.ytd}</span> : null}</div>
            ))}
            <div className="flex gap-2 py-1 text-[8px] font-bold"><span className="flex-[5]">{t.total.label}</span><span className="flex-[4] text-right tabular-nums whitespace-nowrap">{t.total.amount}</span>{showYtd ? <span className="flex-[4] text-right text-[7px] text-neutral-400 tabular-nums whitespace-nowrap">{t.total.ytd}</span> : null}</div>
          </div>
        ))}
      </div>
      <p className="px-5 pb-3 text-center text-[6px] pt-2" style={{ color: accent }}>{name} · NovaHR</p>
    </div>
  );
}

const STUDIO_DEFAULTS = {
  template: "classic",
  accentColor: "#6366f1",
  logoAlignment: "left" as LogoAlignment,
  footerNote: "",
  showBanking: false,
  showYtd: true,
};

export function PayslipStudio() {
  const tenant = useCurrentTenant();
  const [state, setState] = React.useState<StudioState | null>(null);
  const [customHex, setCustomHex] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getPayslipSettingsAction(tenant.id).then((s) => {
      if (cancelled) return;
      setState({
        template: s.template,
        accentColor: s.accentColor,
        logoUrl: s.logoUrl,
        logoAlignment: s.logoAlignment,
        companyName: s.companyName ?? tenant.name,
        footerNote: s.footerNote ?? "",
        showBanking: s.showBanking,
        showYtd: s.showYtd,
      });
      setCustomHex(s.accentColor);
    });
    return () => {
      cancelled = true;
    };
  }, [tenant.id]);

  function patch(update: Partial<StudioState>) {
    setState((s) => (s ? { ...s, ...update } : s));
  }

  function handleReset() {
    patch({
      template: STUDIO_DEFAULTS.template,
      accentColor: STUDIO_DEFAULTS.accentColor,
      logoAlignment: STUDIO_DEFAULTS.logoAlignment,
      footerNote: STUDIO_DEFAULTS.footerNote,
      showBanking: STUDIO_DEFAULTS.showBanking,
      showYtd: STUDIO_DEFAULTS.showYtd,
    });
    setCustomHex(STUDIO_DEFAULTS.accentColor);
  }

  async function handleSave() {
    if (!state) return;
    if (!HEX_RE.test(state.accentColor)) {
      toast.error("Accent colour must be a valid hex value", { description: "Use the format #4F46E5." });
      return;
    }
    setSaving(true);
    const result = await updatePayslipSettingsAction(tenant.id, {
      template: state.template,
      accentColor: state.accentColor,
      logoAlignment: state.logoAlignment,
      companyName: state.companyName.trim() || null,
      footerNote: state.footerNote.trim() || null,
      showBanking: state.showBanking,
      showYtd: state.showYtd,
    });
    setSaving(false);
    if (result.success) toast.success("Payslip branding saved", { description: "New payslips will use this design." });
    else toast.error("Could not save payslip branding", { description: result.error });
  }

  if (!state) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>Loading payslip branding...</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
          <Skeleton className="aspect-[210/297] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payslips</CardTitle>
        <CardDescription>
          Control how generated payslip PDFs look: template, accent colour, logo placement and branding. The preview updates as you make changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {/* Template */}
          <fieldset>
            <legend className="text-sm font-medium mb-2">Template</legend>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payslip template">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={state.template === t.id}
                  onClick={() => patch({ template: t.id })}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    state.template === t.id
                      ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Accent colour */}
          <fieldset>
            <legend className="text-sm font-medium mb-2">Accent colour</legend>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={`${c.label} accent colour`}
                  aria-pressed={state.accentColor.toLowerCase() === c.value}
                  onClick={() => {
                    patch({ accentColor: c.value });
                    setCustomHex(c.value);
                  }}
                  className="size-8 rounded-full border border-black/10 flex items-center justify-center transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ backgroundColor: c.value }}
                >
                  {state.accentColor.toLowerCase() === c.value ? (
                    <Check className="size-4 text-white" />
                  ) : null}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="color"
                  value={HEX_RE.test(state.accentColor) ? state.accentColor : "#6366f1"}
                  onChange={(e) => {
                    patch({ accentColor: e.target.value });
                    setCustomHex(e.target.value);
                  }}
                  className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  aria-label="Custom accent colour picker"
                />
                <Input
                  value={customHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    if (HEX_RE.test(e.target.value)) patch({ accentColor: e.target.value });
                  }}
                  placeholder="e.g. #4F46E5"
                  className="w-28 font-mono text-sm"
                  aria-label="Accent colour hex value"
                  aria-invalid={customHex.length > 0 && !HEX_RE.test(customHex)}
                />
              </div>
            </div>
            {customHex.length > 0 && !HEX_RE.test(customHex) ? (
              <p className="text-xs text-destructive mt-1.5">Enter a 6-digit hex colour, for example #4F46E5.</p>
            ) : null}
          </fieldset>

          {/* Logo alignment */}
          <fieldset>
            <legend className="text-sm font-medium mb-2">Logo and header alignment</legend>
            <div className="inline-flex rounded-lg border border-border p-1" role="radiogroup" aria-label="Logo alignment">
              {ALIGNMENTS.map((a) => {
                const Icon = a.icon;
                const active = state.logoAlignment === a.value;
                return (
                  <button
                    key={a.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => patch({ logoAlignment: a.value })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" />
                    {a.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Positions the logo and company name in the payslip header. Branded uses centre by default.
            </p>
          </fieldset>

          {/* Branding text */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payslip-company-name">Company name on payslips</Label>
              <Input
                id="payslip-company-name"
                value={state.companyName}
                onChange={(e) => patch({ companyName: e.target.value })}
                placeholder="e.g. Nova Technologies (Pty) Ltd"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payslip-footer-note">Footer note <OptionalTag /></Label>
              <Input
                id="payslip-footer-note"
                value={state.footerNote}
                onChange={(e) => patch({ footerNote: e.target.value })}
                placeholder="e.g. Queries: payroll@company.co.za"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Show year-to-date figures</p>
                <p className="text-xs text-muted-foreground">Adds a real YTD column summing each employee&apos;s pay for the current tax year.</p>
              </div>
              <Switch
                checked={state.showYtd}
                onCheckedChange={(v) => patch({ showYtd: v })}
                aria-label="Show year-to-date figures"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Show employee banking details</p>
                <p className="text-xs text-muted-foreground">Includes the employee bank name and masked account number.</p>
              </div>
              <Switch
                checked={state.showBanking}
                onCheckedChange={(v) => patch({ showBanking: v })}
                aria-label="Show employee banking details"
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <p className="text-sm font-medium mb-2">Live preview</p>
          <PayslipPreview state={state} />
          <p className="text-xs text-muted-foreground mt-2">
            Preview uses sample figures. Generated PDFs use each employee&apos;s actual pay data.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border">
        <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
          Reset to defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : null}
          {saving ? "Saving..." : "Save payslip branding"}
        </Button>
      </CardFooter>
    </Card>
  );
}
