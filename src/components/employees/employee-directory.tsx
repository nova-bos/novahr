"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScopedEmployees } from "@/lib/auth/scope";
import { employmentTypeLabel, formatCurrencyCompact, getInitials } from "@/lib/format";
import { StatusBadge } from "./status-badge";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "probation", label: "Onboarding" },
  { value: "terminated", label: "Terminated" },
];

export function EmployeeDirectory() {
  const employees = useScopedEmployees();
  const router = useRouter();

  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("all");
  const [status, setStatus] = React.useState("active");
  const [showTerminated, setShowTerminated] = React.useState(false);

  const departments = React.useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort(),
    [employees]
  );

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees
      .filter((e) => {
        if (!showTerminated && e.status === "terminated") return false;
        return true;
      })
      .filter((e) => (department === "all" ? true : e.department === department))
      .filter((e) => (status === "all" ? true : e.status === status))
      .filter((e) => {
        if (!query) return true;
        const haystack = `${e.firstName} ${e.lastName} ${e.jobTitle} ${e.email}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [employees, department, status, search, showTerminated]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, role or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-1 gap-2 sm:flex-none">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="flex-1 sm:w-44 sm:flex-none">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="flex-1 sm:w-40 sm:flex-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter((o) => o.value !== "terminated").map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTerminated}
              onChange={(e) => {
                setShowTerminated(e.target.checked);
                if (e.target.checked && status !== "all" && status !== "terminated") {
                  setStatus("all");
                }
              }}
              className="size-4 rounded border-border"
            />
            Show terminated
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No employees found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[700px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Annual salary</TableHead>
                <TableHead className="w-32">Onboarding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/employees/${employee.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        {employee.photoUrl ? (
                          <AvatarImage src={employee.photoUrl} alt={`${employee.firstName} ${employee.lastName}`} />
                        ) : null}
                        <AvatarFallback
                          className="text-white"
                          style={{ backgroundColor: employee.avatarColor }}
                        >
                          {getInitials(employee.firstName, employee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">
                          {employee.firstName} {employee.lastName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {employee.jobTitle}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{employee.department}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={employee.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {employmentTypeLabel(employee.employmentType)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{employee.location}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm tabular-nums">
                      {formatCurrencyCompact(employee.salary.annualGross)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {employee.onboarding ? (
                      <div className="flex items-center gap-2">
                        <Progress value={employee.onboarding.progress} className="h-1.5 w-16" />
                        <span className="text-xs text-muted-foreground">
                          {employee.onboarding.progress}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
