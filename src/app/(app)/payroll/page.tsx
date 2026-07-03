"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PayrollStats } from "@/components/payroll/payroll-stats";
import { CurrentRunCard } from "@/components/payroll/current-run-card";
import { PayrollHistory } from "@/components/payroll/payroll-history";
import { MyPayslips } from "@/components/payroll/my-payslips";
import { NetcashPanel } from "@/components/payroll/netcash-panel";
import { useAuth } from "@/lib/auth/auth-provider";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

export default function PayrollPage() {
  const allowed = useRoleGuard(["hr", "employee"]);
  const { user } = useAuth();

  if (!allowed) return null;

  if (user?.role === "employee") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="My Payslips" description="View and download your past payslips." />
        <MyPayslips />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll"
        description="Review pay runs, track totals and publish payslips to your team."
      />
      <PayrollStats />
      <NetcashPanel />
      <CurrentRunCard />
      <PayrollHistory />
    </div>
  );
}
