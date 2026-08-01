"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "@/components/ui/export-button";
import { formatCurrency } from "@/lib/format";
import { getCurrentTaxYear } from "@/lib/compliance/utils";
import { getCoidaReturnAction, type CoidaReturn } from "@/lib/compliance/coida-actions";

function taxYearOptions(): string[] {
  const current = getCurrentTaxYear();
  const start = Number(current.split("/")[0]);
  return [0, 1, 2].map((back) => `${start - back}/${start - back + 1}`);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function CoidaPanel({ tenantId }: { tenantId: string }) {
  const [taxYear, setTaxYear] = useState(getCurrentTaxYear());
  const [data, setData] = useState<CoidaReturn | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCoidaReturnAction(tenantId, taxYear)
      .then((result) => {
        if (active) setData(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, taxYear]);

  function buildExport() {
    return {
      headers: ["Employee no.", "Employee", "Actual earnings (ZAR)", "Assessable earnings (ZAR)"],
      rows: (data?.rows ?? []).map((r) => [
        r.employeeNumber,
        r.name,
        r.actualEarnings.toFixed(2),
        r.assessableEarnings.toFixed(2),
      ]),
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-muted-foreground" />
          COIDA Return of Earnings (W.As.8)
        </CardTitle>
        <CardDescription>
          Annual earnings per employee, capped at the assessable-earnings ceiling for the
          assessment year. Submit to the Compensation Fund by the annual deadline.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Select value={taxYear} onValueChange={setTaxYear}>
            <SelectTrigger className="w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taxYearOptions().map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportButton
            build={buildExport}
            filename={`coida-return-${taxYear.replace("/", "-")}`}
            sheetName="COIDA"
            disabled={!data || data.rows.length === 0}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading COIDA data...</p>
        ) : !data || data.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No payroll data for {taxYear}. Complete a pay run to populate this return.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Employees" value={String(data.employeeCount)} />
              <Stat label="Average employed" value={data.averageEmployees.toFixed(1)} />
              <Stat label="Total actual earnings" value={formatCurrency(data.totalActualEarnings)} />
              <Stat
                label="Total assessable earnings"
                value={formatCurrency(data.totalAssessableEarnings)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Assessable earnings are capped at {formatCurrency(data.ceiling)} per employee for{" "}
              {taxYear}.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Actual earnings</TableHead>
                    <TableHead className="text-right">Assessable earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell>
                        <span className="font-medium">{row.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.employeeNumber}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.actualEarnings)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.assessableEarnings)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
