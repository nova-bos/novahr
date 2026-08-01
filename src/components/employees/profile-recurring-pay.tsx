"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Repeat, Trash2 } from "lucide-react";
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
import { useAuth } from "@/lib/auth/auth-provider";
import { formatCurrency } from "@/lib/format";
import { RECURRING_COMPONENTS } from "@/lib/payroll/variable-pay";
import type { Employee } from "@/lib/types";
import {
  listRecurringInputsAction,
  createRecurringInputAction,
  deleteRecurringInputAction,
  type RecurringInputDto,
} from "@/lib/payroll/recurring-input-actions";

export function ProfileRecurringPay({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const canManage = user?.role === "hr";
  const [rows, setRows] = React.useState<RecurringInputDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [componentType, setComponentType] = React.useState(RECURRING_COMPONENTS[0]?.type ?? "commission");
  const [label, setLabel] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [saving, startSave] = React.useTransition();

  React.useEffect(() => {
    listRecurringInputsAction(employee.id)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [employee.id]);

  function add() {
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    startSave(async () => {
      try {
        const row = await createRecurringInputAction({
          employeeId: employee.id,
          componentType,
          label: label || undefined,
          amount: value,
        });
        setRows((prev) => [...prev, row]);
        setLabel("");
        setAmount("");
        toast.success("Recurring component added.");
      } catch (err) {
        toast.error("Could not add component", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  async function remove(id: string) {
    try {
      await deleteRecurringInputAction(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("Could not remove component.");
    }
  }

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Repeat className="size-4 text-muted-foreground" />
          Recurring pay components
        </CardTitle>
        <CardDescription>
          Fixed monthly earnings or deductions (e.g. a permanent commission or allowance). Apply
          them to a pay run from the variable-pay panel with one click.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_9rem_auto]">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={componentType} onValueChange={setComponentType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRING_COMPONENTS.map((c) => (
                  <SelectItem key={c.type} value={c.type}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label (optional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sales commission" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount (R)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={add} disabled={saving}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring components set up.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.label}</span>
                  <Badge variant="secondary">{formatCurrency(r.amount)}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
