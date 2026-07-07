"use client";

import * as React from "react";
import { toast } from "sonner";
import { Landmark, Scale, Ban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Employee } from "@/lib/types";
import {
  cancelEmployeeDeduction,
  createEmployeeDeduction,
  listEmployeeDeductions,
  type EmployeeDeductionRow,
} from "@/lib/employees/deductions";

const KIND_LABELS: Record<string, string> = {
  loan: "Loan",
  garnishee: "Garnishee",
  other: "Other",
};

function StatusBadge({ status }: { status: EmployeeDeductionRow["status"] }) {
  if (status === "settled") return <Badge variant="secondary">Settled</Badge>;
  if (status === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  return <Badge>Active</Badge>;
}

export function ProfileDeductions({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const canManage = user?.role === "hr";

  const [rows, setRows] = React.useState<EmployeeDeductionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [kind, setKind] = React.useState("loan");
  const [description, setDescription] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [originalAmount, setOriginalAmount] = React.useState("");
  const [monthlyAmount, setMonthlyAmount] = React.useState("");

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    listEmployeeDeductions(employee.id)
      .then((d) => active && setRows(d))
      .catch(() => active && toast.error("Could not load deductions"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [employee.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createEmployeeDeduction({
        employeeId: employee.id,
        kind,
        description,
        reference: reference || undefined,
        originalAmount: Number(originalAmount),
        monthlyAmount: Number(monthlyAmount),
      });
      if (res.error || !res.deduction) {
        toast.error(res.error ?? "Could not add the deduction");
        return;
      }
      setRows((prev) => [res.deduction!, ...prev]);
      setDescription("");
      setReference("");
      setOriginalAmount("");
      setMonthlyAmount("");
      toast.success("Deduction added");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(row: EmployeeDeductionRow) {
    if (!window.confirm(`Cancel "${row.description}"? It will stop being recovered.`)) return;
    const res = await cancelEmployeeDeduction(row.id);
    if (res.error || !res.deduction) {
      toast.error(res.error ?? "Could not cancel");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? res.deduction! : r)));
    toast.success("Deduction cancelled");
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add loan or garnishee</CardTitle>
            <CardDescription>
              Recovered from net pay each payroll run until the balance reaches zero.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ded-kind">Type</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger id="ded-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(KIND_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ded-desc">Description</Label>
                <Input
                  id="ded-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Salary advance"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ded-total">Total amount (R)</Label>
                <Input
                  id="ded-total"
                  type="number"
                  min="0"
                  step="0.01"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ded-monthly">Monthly amount (R)</Label>
                <Input
                  id="ded-monthly"
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="ded-ref">Reference (optional, e.g. court order number)</Label>
                <Input
                  id="ded-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add deduction"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loans and garnishees</CardTitle>
          <CardDescription>Outstanding balances recovered through payroll.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No loans or garnishees on record.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/60">
              {rows.map((row) => {
                const Icon = row.kind === "garnishee" ? Scale : Landmark;
                const progress =
                  row.originalAmount > 0
                    ? Math.round(((row.originalAmount - row.balance) / row.originalAmount) * 100)
                    : 0;
                return (
                  <li key={row.id} className="flex items-center gap-3 py-3">
                    <Icon className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{row.description}</span>
                        <Badge variant="outline">{KIND_LABELS[row.kind] ?? row.kind}</Badge>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        Balance {formatCurrency(row.balance)} of {formatCurrency(row.originalAmount)}
                        {" · "}
                        {formatCurrency(row.monthlyAmount)}/month ({progress}% recovered)
                        {row.reference ? ` · Ref ${row.reference}` : ""}
                        {row.settledAt ? ` · Settled ${formatDate(row.settledAt)}` : ""}
                      </p>
                    </div>
                    {canManage && row.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleCancel(row)}
                      >
                        <Ban />
                        <span className="sr-only">Cancel</span>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
