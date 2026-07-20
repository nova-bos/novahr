"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
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

const TEMPLATES = [
  { id: "classic", name: "Classic", description: "Clean black-and-white layout with a bold header line." },
  { id: "modern", name: "Modern", description: "Coloured header band with accent-tinted table rows." },
  { id: "corporate", name: "Corporate", description: "Formal two-column header with PAYE reference and strong borders." },
  { id: "branded", name: "Branded", description: "Large accent header with centred logo and company name." },
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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;


interface StudioState {
  template: string;
  accentColor: string;
  logoUrl: string | null;
  companyName: string;
  footerNote: string;
  showBanking: boolean;
  showYtd: boolean;
}

// Sample figures used only for the on-screen preview.
const SAMPLE = {
  employee: "Thandi Nkosi",
  meta: "Software Engineer · Engineering · EMP001",
  period: "June 2026",
  earnings: [
    { label: "Basic salary", amount: "R32 500.00" },
    { label: "Travel allowance", amount: "R2 000.00" },
  ],
  gross: "R34 500.00",
  deductions: [
    { label: "PAYE", amount: "-R6 245.00" },
    { label: "UIF", amount: "-R177.12" },
  ],
  totalDeductions: "-R6 422.12",
  netPay: "R28 077.88",
};

function PreviewTable({ title, rows, total, headBg }: {
  title: string;
  rows: { label: string; amount: string }[];
  total: { label: string; amount: string };
  headBg: string;
}) {
  return (
    <div className="mb-3">
      <p className="text-[8px] font-bold uppercase tracking-wide text-neutral-500 mb-1">{title}</p>
      <div className="flex justify-between px-1.5 py-0.5 text-[8px] font-bold text-neutral-600" style={{ backgroundColor: headBg }}>
        <span>Description</span>
        <span>Amount</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between px-1.5 py-1 text-[9px] text-neutral-700 border-b border-neutral-200">
          <span>{r.label}</span>
          <span>{r.amount}</span>
        </div>
      ))}
      <div className="flex justify-between px-1.5 py-1 text-[9px] font-bold text-neutral-900" style={{ backgroundColor: headBg }}>
        <span>{total.label}</span>
        <span>{total.amount}</span>
      </div>
    </div>
  );
}

// On-screen approximation of src/lib/payroll/pdf.tsx. Layout and colour
// decisions here mirror the four PDF templates so what the user sees is
// what the generated document will look like.
function PayslipPreview({ state }: { state: StudioState }) {
  const accent = HEX_RE.test(state.accentColor) ? state.accentColor : "#6366f1";
  const name = state.companyName.trim() || "NovaHR";
  const tint = `${accent}18`;
  const isBandHeader = state.template === "modern" || state.template === "branded";

  const headBg = state.template === "modern" ? tint : "#f0f0f0";

  return (
    <div className="rounded-lg border border-border bg-white text-neutral-900 shadow-sm overflow-hidden aspect-[210/260] flex flex-col" aria-label="Payslip preview">
      {/* Header */}
      {isBandHeader ? (
        <div
          className={cn("px-5 py-4 text-white", state.template === "branded" && "text-center")}
          style={{ backgroundColor: accent }}
        >
          <div className={cn("flex items-start justify-between", state.template === "branded" && "flex-col items-center gap-1")}>
            <div className={state.template === "branded" ? "text-center" : ""}>
              {state.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.logoUrl} alt="" className={cn("h-6 object-contain mb-1", state.template === "branded" && "mx-auto")} />
              ) : null}
              <p className={cn("font-bold leading-tight", state.template === "branded" ? "text-base" : "text-sm")}>{name}</p>
              <p className="text-[8px] text-white/80">Employee payslip</p>
            </div>
            {state.template === "modern" ? (
              <div className="text-right text-[8px] text-white/80">
                <p className="uppercase tracking-wide">Pay period</p>
                <p className="font-bold text-white text-[9px]">{SAMPLE.period}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "px-5 py-3 flex items-start justify-between",
            state.template === "corporate" ? "bg-neutral-100 border-b border-neutral-300" : "border-b-2 border-neutral-900"
          )}
        >
          <div>
            {state.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.logoUrl} alt="" className="h-6 object-contain mb-1" />
            ) : null}
            <p className="text-sm font-bold leading-tight">{name}</p>
            <p className="text-[8px] text-neutral-500">Employee payslip</p>
          </div>
          <div className="text-right text-[8px] text-neutral-500">
            <p className="uppercase tracking-wide">Pay period</p>
            <p className="font-bold text-neutral-900 text-[9px]">{SAMPLE.period}</p>
          </div>
        </div>
      )}

      <div className="px-5 py-3 flex-1">
        {/* Employee box */}
        <div className={cn("rounded bg-neutral-100 px-2.5 py-1.5 mb-3", state.template === "branded" && "text-center")}>
          <p className="text-[10px] font-bold">{SAMPLE.employee}</p>
          <p className="text-[8px] text-neutral-500">{SAMPLE.meta}</p>
        </div>

        <PreviewTable
          title="Earnings"
          rows={SAMPLE.earnings}
          total={{ label: "Gross pay", amount: SAMPLE.gross }}
          headBg={headBg}
        />
        <PreviewTable
          title="Deductions"
          rows={SAMPLE.deductions}
          total={{ label: "Total deductions", amount: SAMPLE.totalDeductions }}
          headBg={headBg}
        />

        {/* Net pay band */}
        {isBandHeader ? (
          <div className="flex items-center justify-between rounded px-3 py-2 text-white" style={{ backgroundColor: accent }}>
            <span className="text-[9px] font-bold">Net pay</span>
            <span className="text-sm font-bold">{SAMPLE.netPay}</span>
          </div>
        ) : (
          <div
            className="flex items-center justify-between rounded px-3 py-2"
            style={{ backgroundColor: tint, border: state.template === "corporate" ? `1px solid ${accent}` : undefined }}
          >
            <span className="text-[9px] font-bold">Net pay</span>
            <span className="text-sm font-bold" style={{ color: accent }}>{SAMPLE.netPay}</span>
          </div>
        )}

        {state.showBanking ? (
          <div className="mt-3">
            <p className="text-[8px] font-bold uppercase tracking-wide text-neutral-500 mb-1">Banking details</p>
            <div className="flex justify-between px-1.5 py-1 text-[9px] text-neutral-700 border-b border-neutral-200">
              <span>Bank</span><span>First National Bank</span>
            </div>
            <div className="flex justify-between px-1.5 py-1 text-[9px] text-neutral-700 border-b border-neutral-200">
              <span>Account number</span><span>****6789</span>
            </div>
          </div>
        ) : null}
      </div>

      <p className="px-5 pb-2 text-center text-[7px] text-neutral-400 border-t border-neutral-200 pt-1.5 mx-5">
        {name}
        {state.footerNote.trim() ? ` · ${state.footerNote.trim()}` : ""} · Generated by NovaHR
      </p>
    </div>
  );
}

const STUDIO_DEFAULTS = {
  template: "classic",
  accentColor: "#6366f1",
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
          <Skeleton className="aspect-[210/260] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payslips</CardTitle>
        <CardDescription>
          Control how generated payslip PDFs look: template, accent colour, logo and branding. The preview updates as you make changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1fr_minmax(260px,340px)]">
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
                <p className="text-sm font-medium">Show year-to-date column</p>
                <p className="text-xs text-muted-foreground">Adds a YTD column to earnings and deductions tables.</p>
              </div>
              <Switch
                checked={state.showYtd}
                onCheckedChange={(v) => patch({ showYtd: v })}
                aria-label="Show year-to-date column"
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
