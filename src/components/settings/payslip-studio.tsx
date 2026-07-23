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
import { SAMPLE_EMPLOYEE, SAMPLE_PAYSLIP, SAMPLE_YTD } from "./payslip-sample";
import { cn } from "@/lib/utils";

type LogoAlignment = "left" | "center" | "right";

const TEMPLATES = [
  { id: "classic", name: "Classic", description: "Monochrome ledger. Labelled identity grid and hairline tables with a ruled net-pay line. Print-first and formal." },
  { id: "modern", name: "Modern", description: "Accent header band with a Gross / Deductions / Net summary strip and earnings and deductions side by side." },
  { id: "corporate", name: "Corporate", description: "Statutory statement. Registration and PAYE, UIF and SDL references, employer contributions, benefits, closing balances and leave." },
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

/**
 * Live preview that renders the real PayslipDocument to a PDF and shows it in an
 * iframe, so the preview is exactly what downloads — every template and every
 * section (employer contributions, benefits, closing balances, PAYE note, leave
 * balances) included. Re-renders, debounced, whenever the design changes.
 */
function PayslipLivePreview({
  state,
  logoDataUrl,
}: {
  state: StudioState;
  logoDataUrl: string | null;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [rendering, setRendering] = React.useState(true);

  const accent = HEX_RE.test(state.accentColor) ? state.accentColor : "#6366f1";
  const companyName = state.companyName.trim() || "NovaHR";
  const footerNote = state.footerNote.trim() || undefined;
  const { template, logoAlignment, showBanking, showYtd } = state;

  React.useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const [{ pdf }, { PayslipDocument }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/lib/payroll/pdf"),
        ]);
        const blob = await pdf(
          <PayslipDocument
            employee={SAMPLE_EMPLOYEE}
            payslip={SAMPLE_PAYSLIP}
            companyName={companyName}
            logoUrl={logoDataUrl ?? undefined}
            logoAlignment={logoAlignment}
            accentColor={accent}
            template={template}
            footerNote={footerNote}
            showBanking={showBanking}
            showYtd={showYtd}
            companyAddress="12 Rivonia Road, Sandton, Johannesburg, 2196"
            companyRegistration="2019/123456/07"
            payeReference="7990112345"
            uifReference="U123456789"
            sdlReference="L123456789"
            ytd={showYtd ? SAMPLE_YTD : undefined}
          />
        ).toBlob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
        setRendering(false);
      } catch {
        if (!cancelled) setRendering(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [template, accent, logoAlignment, showBanking, showYtd, companyName, footerNote, logoDataUrl]);

  return (
    <div className="relative aspect-[210/297] overflow-hidden rounded-lg border border-border bg-neutral-100">
      {url ? (
        <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="Payslip preview" className="h-full w-full" />
      ) : null}
      {rendering ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100/60">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}
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
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(null);
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
      setLogoDataUrl(s.logoDataUrl);
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
    if (result.success) toast.success("Payslip branding saved", { description: "New and downloaded payslips will use this design." });
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
          Control how generated payslip PDFs look: template, accent colour, logo placement and branding. The preview is the real payslip and updates as you make changes.
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
            {!logoDataUrl ? (
              <p className="text-xs text-muted-foreground mt-1.5">
                No logo uploaded yet. Upload one under Company branding and it will appear here and on downloaded payslips.
              </p>
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
          <PayslipLivePreview state={state} logoDataUrl={logoDataUrl} />
          <p className="text-xs text-muted-foreground mt-2">
            The exact PDF that downloads, with sample figures. Real payslips use each employee&apos;s actual pay data.
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
