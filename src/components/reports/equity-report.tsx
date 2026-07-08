"use client";

import * as React from "react";
import { Download } from "lucide-react";
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
import { toCSV, downloadCSV } from "@/lib/export/csv";
import { useAuth } from "@/lib/auth/auth-provider";
import { getCurrentTaxYear } from "@/lib/compliance/utils";
import { getEmploymentEquityReportAction } from "@/lib/compliance/equity-actions";
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

  function handleExportEea2() {
    const csv = toCSV(
      ["Occupational level", "Male", "Female", "Foreign", "Disability", "Total", "Avg pay", "Median pay"],
      report.byLevel.map((r) => [
        r.label,
        r.male,
        r.female,
        r.foreign,
        r.disability,
        r.total,
        r.avgGross.toFixed(2),
        r.medianGross.toFixed(2),
      ])
    );
    downloadCSV(csv, `eea2-${fileYear}`);
  }

  function handleExportEea4() {
    const csv = toCSV(
      ["Race group", "Male", "Female", "Total", "Avg pay"],
      report.byRace.map((r) => [r.label, r.male, r.female, r.total, r.avgGross.toFixed(2)])
    );
    downloadCSV(csv, `eea4-${fileYear}`);
  }

  return (
    <div className="flex flex-col gap-6">
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
              <Button variant="outline" size="sm" onClick={handleExportEea2}>
                <Download className="size-4" />
                Export CSV
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Table>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">EEA4: profile and average remuneration by race group</CardTitle>
          <CardDescription>Headcount by race and gender, with average remuneration to surface differentials.</CardDescription>
          {data.byRace.length > 0 && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={handleExportEea4}>
                <Download className="size-4" />
                Export CSV
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Table>
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
        </CardContent>
      </Card>
    </div>
  );
}
