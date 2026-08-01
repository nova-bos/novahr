"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveBranches, useEmployees, usePayrollRuns } from "@/lib/store/hooks";
import type { Employee, PayrollRun } from "@/lib/types";

// "all" = whole company, "none" = head office (no branch), otherwise a branch id.
type BranchFilter = string;

const ReportsBranchContext = React.createContext<BranchFilter>("all");

export function ReportsBranchProvider({ children }: { children: React.ReactNode }) {
  const branches = useActiveBranches();
  const [branch, setBranch] = React.useState<BranchFilter>("all");

  return (
    <ReportsBranchContext.Provider value={branch}>
      {branches.length > 0 ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Branch</span>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-52" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              <SelectItem value="none">Head office</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {children}
    </ReportsBranchContext.Provider>
  );
}

function matchesBranch(entityBranchId: string | undefined, filter: BranchFilter): boolean {
  if (filter === "all") return true;
  if (filter === "none") return !entityBranchId;
  return entityBranchId === filter;
}

/** Employees filtered by the reports branch selection. */
export function useReportEmployees(): Employee[] {
  const filter = React.useContext(ReportsBranchContext);
  const employees = useEmployees();
  return React.useMemo(
    () => employees.filter((e) => matchesBranch(e.branchId, filter)),
    [employees, filter]
  );
}

/** Payroll runs filtered by the reports branch selection. */
export function useReportRuns(): PayrollRun[] {
  const filter = React.useContext(ReportsBranchContext);
  const runs = usePayrollRuns();
  return React.useMemo(() => runs.filter((r) => matchesBranch(r.branchId, filter)), [runs, filter]);
}
