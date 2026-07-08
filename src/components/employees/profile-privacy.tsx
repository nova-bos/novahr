"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Employee } from "@/lib/types";
import { eraseEmployeePersonalData, exportEmployeeData } from "@/lib/employees/popia";

export function ProfilePrivacy({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const canErase = user?.role === "hr" && employee.status !== "terminated";
  const [exporting, setExporting] = React.useState(false);
  const [erasing, setErasing] = React.useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportEmployeeData(employee.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${employee.employeeNumber}-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data export downloaded");
    } catch {
      toast.error("Could not export the data");
    } finally {
      setExporting(false);
    }
  }

  async function handleErase() {
    const ok = window.confirm(
      "Permanently erase this employee's personal data? Name, contact, ID, tax, bank and equity details will be redacted. Payroll records are retained for the legal retention period. This cannot be undone."
    );
    if (!ok) return;
    setErasing(true);
    try {
      const res = await eraseEmployeePersonalData(employee.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Personal data erased. Reloading...");
      setTimeout(() => window.location.reload(), 1200);
    } finally {
      setErasing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data and privacy (POPIA)</CardTitle>
        <CardDescription>
          Export everything held on this employee, or erase their personal data on request.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Export data</p>
            <p className="text-xs text-muted-foreground">
              Download a full copy of this employee's records as JSON (POPIA access request).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? "Preparing..." : "Export data"}
          </Button>
        </div>

        {canErase && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4">
            <div>
              <p className="text-sm font-medium text-destructive">Erase personal data</p>
              <p className="text-xs text-muted-foreground">
                Redacts identifying details. Payroll records are retained for the statutory period.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleErase} disabled={erasing}>
              {erasing ? "Erasing..." : "Erase"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
