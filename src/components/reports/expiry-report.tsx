"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FileWarning, GraduationCap } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "@/components/ui/export-button";
import { formatDate } from "@/lib/format";
import {
  getExpiringQualificationsAction,
  getExpiringDocumentsAction,
} from "@/lib/employees/qualification-alerts";

interface Row {
  key: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  kind: "Qualification" | "Document";
  category: string;
  name: string;
  expiresAt: string;
  daysUntilExpiry: number;
}

function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) return <Badge variant="destructive">Expired</Badge>;
  if (days <= 30)
    return (
      <Badge variant="secondary" className="bg-warning/15 text-warning">
        {days}d left
      </Badge>
    );
  return <Badge variant="secondary">{days}d left</Badge>;
}

export function ExpiryReport() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let active = true;
    // Look 90 days ahead so HR sees what is coming up, not only imminent items.
    Promise.all([getExpiringQualificationsAction(90), getExpiringDocumentsAction(90)])
      .then(([quals, docs]) => {
        if (!active) return;
        const merged: Row[] = [
          ...quals.map((q) => ({
            key: `q-${q.qualificationId}`,
            employeeId: q.employeeId,
            employeeName: q.employeeName,
            employeeNumber: q.employeeNumber,
            kind: "Qualification" as const,
            category: q.type,
            name: q.name,
            expiresAt: q.expiresAt,
            daysUntilExpiry: q.daysUntilExpiry,
          })),
          ...docs.map((d) => ({
            key: `d-${d.documentId}`,
            employeeId: d.employeeId,
            employeeName: d.employeeName,
            employeeNumber: d.employeeNumber,
            kind: "Document" as const,
            category: d.category,
            name: d.name,
            expiresAt: d.expiresAt,
            daysUntilExpiry: d.daysUntilExpiry,
          })),
        ].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        setRows(merged);
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const list = rows ?? [];
    return {
      expired: list.filter((r) => r.daysUntilExpiry < 0).length,
      soon: list.filter((r) => r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 30).length,
      total: list.length,
    };
  }, [rows]);

  function buildExport() {
    return {
      headers: ["Employee no.", "Employee", "Type", "Category", "Item", "Expires", "Days left"],
      rows: (rows ?? []).map((r) => [
        r.employeeNumber,
        r.employeeName,
        r.kind,
        r.category,
        r.name,
        r.expiresAt,
        r.daysUntilExpiry,
      ]),
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-muted-foreground" />
          Expiring documents and qualifications
        </CardTitle>
        <CardDescription>
          Company-wide view of documents and qualifications expiring within 90 days, or already
          expired. {counts.expired} expired, {counts.soon} due within 30 days.
        </CardDescription>
        <CardAction>
          <ExportButton
            build={buildExport}
            filename={`expiries-${new Date().toISOString().slice(0, 10)}`}
            sheetName="Expiries"
            disabled={!rows || rows.length === 0}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading expiries...</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing is expiring in the next 90 days.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.key}
                    className="cursor-pointer"
                    onClick={() => router.push(`/employees/${row.employeeId}`)}
                  >
                    <TableCell>
                      <span className="font-medium">{row.employeeName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{row.employeeNumber}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.kind === "Qualification" ? (
                          <GraduationCap className="size-4 text-muted-foreground" />
                        ) : (
                          <FileWarning className="size-4 text-muted-foreground" />
                        )}
                        <span>{row.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {row.category.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      <ExpiryBadge days={row.daysUntilExpiry} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
