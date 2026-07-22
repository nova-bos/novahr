"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentTenant } from "@/lib/store/hooks";
import { getActivityLogAction } from "@/lib/settings/audit-actions";
import type { ActivityItem } from "@/lib/types";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 50;

const TYPE_LABELS: Record<string, string> = {
  hire: "Hire",
  onboarding: "Onboarding",
  leave_request: "Leave request",
  leave_approved: "Leave approved",
  leave_rejected: "Leave rejected",
  leave_cancelled: "Leave cancelled",
  payroll_run: "Payroll run",
  promotion: "Promotion",
  document: "Document",
  termination: "Termination",
};

const TYPE_COLORS: Record<string, string> = {
  hire: "bg-success/10 text-success",
  onboarding: "bg-primary/10 text-primary",
  leave_request: "bg-warning/10 text-warning",
  leave_approved: "bg-success/10 text-success",
  leave_rejected: "bg-destructive/10 text-destructive",
  leave_cancelled: "bg-muted text-muted-foreground",
  payroll_run: "bg-info/10 text-info",
  promotion: "bg-primary/10 text-primary",
  document: "bg-muted text-muted-foreground",
  termination: "bg-destructive/10 text-destructive",
};

export function AuditLog() {
  const tenant = useCurrentTenant();
  const [items, setItems] = React.useState<ActivityItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    getActivityLogAction({
      tenantId: tenant.id,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenant.id, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          Audit log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardList className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Timestamp</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Actor</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Event</th>
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground">
                        {formatDate(item.timestamp)}
                      </td>
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                        {item.actor}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={TYPE_COLORS[item.type] ?? "bg-muted text-muted-foreground"}
                        >
                          {TYPE_LABELS[item.type] ?? item.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {item.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-4 pt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
