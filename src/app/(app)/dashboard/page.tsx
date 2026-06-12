"use client";

import { useAuth } from "@/lib/auth/auth-provider";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { ExcoDashboard } from "@/components/dashboard/exco-dashboard";
import { HRDashboard } from "@/components/dashboard/hr-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case "manager":
      return <ManagerDashboard />;
    case "employee":
      return <EmployeeDashboard />;
    case "exco":
      return <ExcoDashboard />;
    case "hr":
    default:
      return <HRDashboard />;
  }
}
