"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatPeriod } from "@/lib/compliance/utils";
import { markComplianceSubmittedAction } from "@/lib/compliance/actions";
import { ComplianceStatusBadge } from "./compliance-status-badge";
import type { ComplianceRecordRow } from "@/lib/compliance/actions";

interface OverviewCardProps {
  title: string;
  record: ComplianceRecordRow | null;
  period: string;
  onSubmitted: (updated: ComplianceRecordRow) => void;
}

function OverviewCard({ title, record, period, onSubmitted }: OverviewCardProps) {
  const { user } = useAuth();
  const isHR = user?.role === "hr";
  const [loading, setLoading] = useState(false);

  async function handleMarkSubmitted() {
    if (!record) return;
    const ref = window.prompt("Enter submission reference number:");
    if (!ref) return;
    setLoading(true);
    try {
      const updated = await markComplianceSubmittedAction(record.tenantId, record.id, ref);
      onSubmitted(updated);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {record ? (
          <>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrency(record.totalAmount)}
            </p>
            <div className="flex items-center gap-2">
              <ComplianceStatusBadge status={record.status} dueDate={record.dueDate} />
              {record.dueDate && (
                <span className="text-xs text-muted-foreground">
                  Due {formatDate(record.dueDate)}
                </span>
              )}
            </div>
            {record.reference && (
              <p className="text-xs text-muted-foreground">Ref: {record.reference}</p>
            )}
            {isHR && record.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkSubmitted}
                disabled={loading}
              >
                {loading ? "Saving..." : "Mark Submitted"}
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
              {formatCurrency(0)}
            </p>
            <p className="text-xs text-muted-foreground">
              No record for {formatPeriod(period)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ComplianceOverviewCardsProps {
  paye: ComplianceRecordRow | null;
  uif: ComplianceRecordRow | null;
  sdl: ComplianceRecordRow | null;
  period: string;
  onRecordUpdated: (updated: ComplianceRecordRow) => void;
}

export function ComplianceOverviewCards({
  paye,
  uif,
  sdl,
  period,
  onRecordUpdated,
}: ComplianceOverviewCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <OverviewCard
        title="PAYE Tax"
        record={paye}
        period={period}
        onSubmitted={onRecordUpdated}
      />
      <OverviewCard
        title="UIF Return"
        record={uif}
        period={period}
        onSubmitted={onRecordUpdated}
      />
      <OverviewCard
        title="SDL Return"
        record={sdl}
        period={period}
        onSubmitted={onRecordUpdated}
      />
    </div>
  );
}
