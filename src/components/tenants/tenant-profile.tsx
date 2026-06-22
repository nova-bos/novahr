"use client";

import {
  Banknote,
  Building2,
  CalendarDays,
  FileText,
  Globe,
  Hash,
  MapPin,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { payFrequencyOptions } from "@/lib/config/leave";
import { formatCurrency, formatCurrencyCompact, formatOrdinal } from "@/lib/format";
import { useCurrentTenant, useDepartments, useEmployees, usePayrollConfig } from "@/lib/store/hooks";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function TenantProfile() {
  const tenant = useCurrentTenant();
  const departments = useDepartments();
  const employees = useEmployees();
  const config = usePayrollConfig();
  const frequency = payFrequencyOptions.find((f) => f.value === tenant.payFrequency);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoRow icon={Building2} label="Legal name" value={tenant.legalName} />
              <InfoRow icon={Globe} label="Industry" value={tenant.industry} />
              <InfoRow icon={Hash} label="Registration number" value={tenant.registrationNumber} />
              <InfoRow icon={FileText} label="VAT number" value={tenant.vatNumber} />
              <InfoRow icon={CalendarDays} label="Founded" value={tenant.founded} />
              <InfoRow icon={MapPin} label="Registered address" value={tenant.address} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoRow icon={Banknote} label="Banking partner" value={tenant.bankName} />
              <InfoRow icon={User} label="Primary contact" value={tenant.primaryContact} />
              <InfoRow
                icon={CalendarDays}
                label="Pay frequency"
                value={frequency?.label ?? tenant.payFrequency}
              />
              <InfoRow
                icon={CalendarDays}
                label="Pay day"
                value={`${formatOrdinal(tenant.payDay)} of the month`}
              />
            </div>
            <Separator className="my-5" />
            <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Statutory registration
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoRow icon={Hash} label="PAYE reference" value={config.payeReferenceNumber} />
              <InfoRow icon={Hash} label="UIF reference" value={config.uifReferenceNumber} />
              <InfoRow icon={Hash} label="SDL reference" value={config.sdlReferenceNumber} />
              <InfoRow icon={CalendarDays} label="Tax year" value={config.taxYear} />
            </div>
            <Separator className="my-5" />
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-transparent bg-success/10 font-medium text-success"
              >
                UIF contributions enabled
              </Badge>
              {config.sdlEnabled && (
                <Badge
                  variant="outline"
                  className="border-transparent bg-success/10 font-medium text-success"
                >
                  SDL levy enabled
                </Badge>
              )}
              <Badge variant="outline" className="border-transparent bg-muted font-medium">
                {config.defaultPensionPct}% default pension contribution
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/70">
              {departments.map((dept) => {
                const headcount = employees.filter(
                  (e) => e.department === dept.name && e.status !== "terminated"
                ).length;
                return (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{dept.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {headcount} {headcount === 1 ? "person" : "people"}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatCurrencyCompact(dept.budget)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
