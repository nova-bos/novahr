"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeProfile } from "@/components/employees/employee-profile";
import { useEmployee } from "@/lib/store/hooks";
import { useScopedEmployees } from "@/lib/auth/scope";

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const employee = useEmployee(id);
  const scopedEmployees = useScopedEmployees();
  const inScope = scopedEmployees.some((e) => e.id === id);

  if (!employee || !inScope) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserX className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Employee not found</h2>
          <p className="text-sm text-muted-foreground">
            This employee may have been removed or you don&apos;t have access to view this profile.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft />
            Back to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return <EmployeeProfile employee={employee} />;
}
