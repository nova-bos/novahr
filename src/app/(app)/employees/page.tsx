"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmployeeDirectory } from "@/components/employees/employee-directory";
import { EmployeeStats } from "@/components/employees/employee-stats";
import { useAuth } from "@/lib/auth/auth-provider";

const TITLES: Record<string, { title: string; description: string }> = {
  manager: {
    title: "My Team",
    description: "View your direct reports' profiles and onboarding progress.",
  },
  exco: {
    title: "Employees",
    description: "A view across every employee in the organisation.",
  },
  hr: {
    title: "Employees",
    description: "Manage your team's profiles, roles and onboarding progress.",
  },
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user?.role === "employee" && user.employeeId) {
      router.replace(`/employees/${user.employeeId}`);
    }
  }, [user, router]);

  if (!user || user.role === "employee") return null;

  const copy = TITLES[user.role] ?? TITLES.hr;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.title} description={copy.description}>
        {user.role === "hr" && (
          <Button asChild>
            <Link href="/employees/new">
              <UserPlus />
              Add employee
            </Link>
          </Button>
        )}
      </PageHeader>
      <EmployeeStats />
      <EmployeeDirectory />
    </div>
  );
}
