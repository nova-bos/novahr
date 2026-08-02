"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { ExportButton } from "@/components/ui/export-button";
import { useAuth } from "@/lib/auth/auth-provider";
import { getCurrentTaxYear } from "@/lib/compliance/utils";
import { getEmploymentEquityReportAction, getEquityFormsAction } from "@/lib/compliance/equity-actions";
import type { EquityReport as EquityReportData } from "@/lib/compliance/employment-equity";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function EquityReport() {
  const { user } = useAuth();
  const [data, setData] = React.useState<EquityReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);

  async function downloadEeaPdf() {
    if (!user?.tenantId) return;
    setDownloadingPdf(true);
    try {
      const [{ pdf }, { EquityFormsDocument }, { forms, companyName }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/compliance/equity-pdf"),
        getEquityFormsAction(user.tenantId),
      ]);
      const blob = await pdf(<EquityFormsDocument forms={forms} companyName={companyName} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `eea2-eea4-${forms.asAt}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Could not generate the EEA2/EEA4 PDF", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDownloadingPdf(false);
    }
  }

  React.useEffect(() => {
    if (!user?.tenantId) return;
    let active = true;
    setLoading(true);
    getEmploymentEquityReportAction(user.tenantId)
      .then((d) => active && setData(d))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.tenantId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No data.</p>;

  const report = data;
  const fileYear = getCurrentTaxYear().replace("/", "-");

  function buildEea2Export() {
    return {
      headers: ["Occupational level", "Male", "Female", "Foreign", "Disability", "Total", "Avg pay", "Median pay"],
      rows: report.byLevel.map((r) => [
        r.label,
        r.male,
        r.female,
        r.foreign,
        r.disability,
        r.total,
        r.avgGross.toFixed(2),
        r.medianGross.toFixed(2),
      ]),
    };
  }

  function buildEea4Export() {
    return {
      headers: ["Race group", "Male", "Female", "Total", "Avg pay"],
      rows: report.byRace.map((r) => [r.label, r.male, r.female, r.total, r.avgGross.toFixed(2)]),
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Employment Equity</h2>
        <Button variant="outline" size="sm" onClick={downloadEeaPdf} disabled={downloadingPdf}>
          <FileText className="size-4" />
          {downloadingPdf ? "Generating..." : "Download EEA2 / EEA4 PDF"}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Headcount (active)" value={data.headcount} />
        <Stat label="People with disabilities" value={data.disabilityCount} />
        <Stat label="Foreign nationals" value={data.foreignCount} />
        <Stat label="Equity data complete" value={`${data.dataCompletePct}%`} />
      </div>

      {data.dataCompletePct < 100 && (
        <p className="text-xs text-muted-foreground">
          {data.unspecifiedCount} employee(s) are missing race, gender or occupational level.
          Complete their Equity details on each profile for an accurate EEA2/EEA4.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">EEA2: workforce profile by occupational level</CardTitle>
          <CardDescription>Headcount and remuneration by level.</CardDescription>
          {data.byLevel.length > 0 && (
            <CardAction>
              <ExportButton build={buildEea2Export} filename={`eea2-${fileYear}`} sheetName="EEA2" />
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[640px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Occupational level</TableHead>
                <TableHead className="text-right">Male</TableHead>
                <TableHead className="text-right">Female</TableHead>
                <TableHead className="text-right">Foreign</TableHead>
                <TableHead className="text-right">Disability</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Avg pay</TableHead>
                <TableHead className="text-right">Median pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byLevel.map((r) => (
                <TableRow key={r.level}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.male}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.female}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.foreign}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.disability}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.avgGross)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.medianGross)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">EEA4: profile and average remuneration by race group</CardTitle>
          <CardDescription>Headcount by race and gender, with average remuneration to surface differentials.</CardDescription>
          {data.byRace.length > 0 && (
            <CardAction>
              <ExportButton build={buildEea4Export} filename={`eea4-${fileYear}`} sheetName="EEA4" />
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[520px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Race group</TableHead>
                <TableHead className="text-right">Male</TableHead>
                <TableHead className="text-right">Female</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Avg pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byRace.map((r) => (
                <TableRow key={r.race}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.male}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.female}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.avgGross)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
