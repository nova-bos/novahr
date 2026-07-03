"use client";

import * as React from "react";
import { AlertCircle, RefreshCw, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { useTenantId } from "@/lib/store/hooks";
import { getPayrollSettingsAction } from "@/lib/settings/actions";
import { getNetcashAccountSummaryAction } from "@/lib/payroll/netcash-summary-actions";

interface AccountSummary {
  balance: number | null;
  lineLimit: number | null;
  batchLimit: number | null;
  environment: string;
  error?: string;
}

export function NetcashPanel() {
  const tenantId = useTenantId();
  const [hasKey, setHasKey] = React.useState(false);
  const [summary, setSummary] = React.useState<AccountSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    getPayrollSettingsAction(tenantId).then((s) => {
      setHasKey(s.hasSalaryKey || s.hasAccountServicesKey);
      setChecked(true);
    });
  }, [tenantId]);

  async function refresh() {
    setLoading(true);
    const result = await getNetcashAccountSummaryAction(tenantId);
    setSummary(result);
    setLoading(false);
  }

  if (!checked || !hasKey) return null;

  const isUat = summary?.environment === "uat";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Netcash account</CardTitle>
            {summary && (
              <Badge
                variant="outline"
                className={isUat ? "border-amber-300 text-amber-700 bg-amber-50 text-[10px]" : "text-[10px]"}
              >
                {isUat ? "Testing (UAT)" : "Live"}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            {summary ? "Refresh" : "Load"}
          </Button>
        </div>
      </CardHeader>

      {summary && (
        <CardContent className="pt-0">
          {summary.error ? (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {summary.error}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Balance</p>
                <p className="font-semibold tabular-nums">
                  {summary.balance !== null ? formatCurrency(summary.balance) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Per payment</p>
                <p className="font-semibold tabular-nums">
                  {summary.lineLimit !== null ? formatCurrency(summary.lineLimit) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Batch limit</p>
                <p className="font-semibold tabular-nums">
                  {summary.batchLimit !== null ? formatCurrency(summary.batchLimit) : "N/A"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
