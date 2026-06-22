"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatPeriod } from "@/lib/compliance/utils";
import { markComplianceSubmittedAction } from "@/lib/compliance/actions";
import { ComplianceStatusBadge } from "./compliance-status-badge";
import type { ComplianceRecordRow } from "@/lib/compliance/actions";

const TYPE_LABELS: Record<string, string> = {
  paye_return: "PAYE Return",
  uif_return: "UIF Return",
  sdl_return: "SDL Return",
  emp201: "EMP201",
  emp501: "EMP501",
};

interface ComplianceRecordsTableProps {
  records: ComplianceRecordRow[];
  onRecordUpdated: (updated: ComplianceRecordRow) => void;
}

export function ComplianceRecordsTable({ records, onRecordUpdated }: ComplianceRecordsTableProps) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  async function handleSubmit(record: ComplianceRecordRow) {
    const ref = window.prompt("Enter submission reference number:");
    if (!ref) return;
    setSubmittingId(record.id);
    try {
      const updated = await markComplianceSubmittedAction(record.tenantId, record.id, ref);
      onRecordUpdated(updated);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance records</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <ShieldCheck className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No compliance records for this year.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table className="min-w-[700px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {formatPeriod(record.period)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {TYPE_LABELS[record.type] ?? record.type}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(record.totalAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.dueDate ? formatDate(record.dueDate) : "-"}
                    </TableCell>
                    <TableCell>
                      <ComplianceStatusBadge
                        status={record.status}
                        dueDate={record.dueDate}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {record.reference ?? "-"}
                    </TableCell>
                    <TableCell>
                      {record.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmit(record)}
                          disabled={submittingId === record.id}
                        >
                          {submittingId === record.id ? "Saving..." : "Submit"}
                        </Button>
                      )}
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
