"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayrollRunDetail } from "@/components/payroll/payroll-run-detail";
import { usePayrollRun } from "@/lib/store/hooks";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

export default function PayrollRunPage() {
  const { id } = useParams<{ id: string }>();
  const run = usePayrollRun(id);
  const allowed = useRoleGuard(["hr"], "/payroll");

  if (!allowed) return null;

  if (!run) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileX className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Payroll run not found</h2>
          <p className="text-sm text-muted-foreground">
            This run may have been removed or belongs to another workspace.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/payroll">
            <ArrowLeft />
            Back to payroll
          </Link>
        </Button>
      </div>
    );
  }

  return <PayrollRunDetail run={run} />;
}
