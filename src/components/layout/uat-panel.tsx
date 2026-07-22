"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Copy, FlaskConical, X } from "lucide-react";
import { toast } from "sonner";
import { tenants } from "@/demo/tenants";
import { getEmployeesByTenant } from "@/demo/employees";
import { demoUsers } from "@/lib/auth/demo-users";
import { cn } from "@/lib/utils";

const SHOW = process.env.NEXT_PUBLIC_APP_ENV !== "production";

const ROLE_COLOR: Record<string, string> = {
  hr: "bg-primary/15 text-primary",
  manager: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  employee: "bg-muted text-muted-foreground",
  exco: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

const ROLE_LABEL: Record<string, string> = {
  hr: "HR Admin",
  manager: "Manager",
  employee: "Employee",
  exco: "Executive",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-success/15 text-success",
  probation: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  on_leave: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  terminated: "bg-destructive/15 text-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  probation: "Probation",
  on_leave: "On leave",
  terminated: "Terminated",
};

function ageFromId(idNumber: string): number | null {
  if (!idNumber || idNumber.length < 6) return null;
  const yy = parseInt(idNumber.slice(0, 2), 10);
  const mm = parseInt(idNumber.slice(2, 4), 10);
  const dd = parseInt(idNumber.slice(4, 6), 10);
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  const currentYY = new Date().getFullYear() % 100;
  const century = yy > currentYY ? 1900 : 2000;
  const birth = new Date(century + yy, mm - 1, dd);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

function formatSalary(n: number): string {
  if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  return `R${(n / 1_000).toFixed(0)}k`;
}

function tenure(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 12) return `${months}mo`;
  const yrs = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${yrs}yr` : `${yrs}yr ${rem}mo`;
}

function copy(text: string, label: string) {
  void navigator.clipboard.writeText(text).then(() =>
    toast.success(`${label} copied`)
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 text-xs font-semibold">{title}</span>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground">{subtitle}</span>
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function UATPanel() {
  if (!SHOW) return null;

  const [open, setOpen] = React.useState(false);

  const employeesByTenant = React.useMemo(
    () => tenants.map((t) => ({ tenant: t, employees: getEmployeesByTenant(t.id) })),
    []
  );

  // Build a map from employeeId -> portal role for quick lookup
  const portalRoleByEmployeeId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const u of demoUsers) {
      if (u.employeeId) map.set(u.employeeId, u.role);
    }
    return map;
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full",
          "bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg",
          "hover:bg-primary/90 transition-colors",
          open && "hidden"
        )}
        aria-label="Open UAT reference panel"
      >
        <FlaskConical className="size-3.5" />
        UAT
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[95vw] flex-col",
          "border-l border-border bg-background shadow-2xl",
          "transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <FlaskConical className="size-4 text-primary" />
          <span className="flex-1 text-sm font-semibold">UAT Reference</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto">

          {/* Login credentials */}
          <Section title="Login credentials" subtitle={`${demoUsers.length} accounts`} defaultOpen>
            <div className="flex flex-col gap-1.5 pt-1">
              {demoUsers.map((u) => (
                <div
                  key={u.id}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: u.avatarColor }}
                    >
                      {u.initials}
                    </div>
                    <span className="flex-1 text-xs font-medium">{u.name}</span>
                    <Badge className={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-0.5 pl-8">
                    <div className="flex items-center gap-1.5">
                      <span className="w-14 shrink-0 text-[10px] text-muted-foreground">Email</span>
                      <span className="flex-1 truncate font-mono text-[10px]">{u.email}</span>
                      <button
                        type="button"
                        onClick={() => copy(u.email, "Email")}
                        className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                      >
                        <Copy className="size-2.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-14 shrink-0 text-[10px] text-muted-foreground">Password</span>
                      <span className="flex-1 font-mono text-[10px]">{u.password}</span>
                      <button
                        type="button"
                        onClick={() => copy(u.password, "Password")}
                        className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                      >
                        <Copy className="size-2.5" />
                      </button>
                    </div>
                    {u.employeeId && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-14 shrink-0 text-[10px] text-muted-foreground">Linked to</span>
                        <span className="text-[10px] text-muted-foreground">{u.employeeId}</span>
                      </div>
                    )}
                    {u.tenantId && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-14 shrink-0 text-[10px] text-muted-foreground">Tenant</span>
                        <span className="text-[10px] text-muted-foreground">{u.tenantId}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Per-tenant employee lists */}
          {employeesByTenant.map(({ tenant, employees }) => (
            <Section
              key={tenant.id}
              title={tenant.name}
              subtitle={`${employees.length} employees · ${tenant.city}`}
              defaultOpen={tenant.id === "novatech"}
            >
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border mt-1 overflow-hidden">
                {employees.map((emp) => {
                  const age = ageFromId(emp.idNumber ?? "");
                  const portalRole = portalRoleByEmployeeId.get(emp.id);
                  const status = emp.status ?? "active";
                  return (
                    <div key={emp.id} className="flex gap-2 px-2.5 py-2">
                      {/* Avatar */}
                      <div
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: emp.avatarColor }}
                      >
                        {emp.initials}
                      </div>

                      {/* Main info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="text-xs font-semibold">
                            {emp.firstName} {emp.lastName}
                          </span>
                          {age !== null && (
                            <span className="text-[10px] text-muted-foreground">{age}y</span>
                          )}
                          <Badge className={STATUS_STYLE[status]}>
                            {STATUS_LABEL[status] ?? status}
                          </Badge>
                          {portalRole && (
                            <Badge className={ROLE_COLOR[portalRole]}>
                              {ROLE_LABEL[portalRole]}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {emp.jobTitle}
                          {emp.department ? ` · ${emp.department}` : ""}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span className="font-mono">
                            {formatSalary(emp.salary.annualGross)}/yr
                          </span>
                          <span>{tenure(emp.startDate)} tenure</span>
                          <button
                            type="button"
                            className="flex items-center gap-0.5 hover:text-foreground"
                            onClick={() => copy(emp.email ?? "", "Email")}
                          >
                            <span className="truncate max-w-[160px]">{emp.email}</span>
                            <Copy className="size-2" />
                          </button>
                        </div>
                      </div>

                      {/* Salary call-out on right */}
                      <div className="shrink-0 text-right">
                        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                          {emp.employeeNumber}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tenant metadata */}
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
                <span><span className="font-medium text-foreground">Industry:</span> {tenant.industry}</span>
                <span><span className="font-medium text-foreground">Pay day:</span> {tenant.payDay}th</span>
                <span><span className="font-medium text-foreground">Bank:</span> {tenant.bankName}</span>
                <span><span className="font-medium text-foreground">Founded:</span> {tenant.founded}</span>
                <span className="col-span-2"><span className="font-medium text-foreground">Address:</span> {tenant.address}</span>
              </div>
            </Section>
          ))}
        </div>
      </div>
    </>
  );
}
