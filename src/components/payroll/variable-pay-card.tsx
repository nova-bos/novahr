"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Download, Upload, SlidersHorizontal, Repeat } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { useEmployees } from "@/lib/store/hooks";
import { calculateMonthlyPayroll } from "@/lib/payroll/calculator";
import type { PayrollInputValue } from "@/lib/payroll/calculator";
import { COMPONENT_DEFINITIONS, MANUAL_COMPONENTS, COMPONENT_BY_TYPE, resolveInputAmount, toInputValue } from "@/lib/payroll/variable-pay";
import {
  addVariablePayInputAction,
  applyVariablePayCsvAction,
  listVariablePayInputsAction,
  removeVariablePayInputAction,
  type VariablePayInputDto,
} from "@/lib/payroll/variable-pay-actions";
import { applyRecurringInputsToRunAction } from "@/lib/payroll/recurring-input-actions";
import { toCSV, downloadCSV } from "@/lib/export/csv";
import { formatCurrency } from "@/lib/format";
import type { Employee, PayrollRun } from "@/lib/types";

interface Props {
  run: PayrollRun;
}

// Component types eligible for the round-trip template (one column each).
const TEMPLATE_COLUMNS = COMPONENT_DEFINITIONS.map((d) => d.type);

export function VariablePayCard({ run }: Props) {
  const employees = useEmployees();
  const eligible = React.useMemo(
    () => employees.filter((e) => e.status !== "terminated" && e.startDate <= run.payDate),
    [employees, run.payDate]
  );

  const [inputs, setInputs] = React.useState<VariablePayInputDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [employeeId, setEmployeeId] = React.useState("");
  const [componentType, setComponentType] = React.useState("overtime");
  const [amount, setAmount] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [isAdding, startAdd] = React.useTransition();
  const [isUploading, startUpload] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const isClosed = run.status === "completed" || run.status === "awaiting_approval";
  const [applyingRecurring, setApplyingRecurring] = React.useState(false);

  async function handleApplyRecurring() {
    setApplyingRecurring(true);
    try {
      const { added } = await applyRecurringInputsToRunAction(run.id);
      const fresh = await listVariablePayInputsAction(run.id);
      setInputs(fresh);
      toast.success(
        added > 0
          ? `${added} recurring component${added === 1 ? "" : "s"} added.`
          : "No new recurring components to add."
      );
    } catch (err) {
      toast.error("Could not apply recurring components", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setApplyingRecurring(false);
    }
  }

  React.useEffect(() => {
    let active = true;
    listVariablePayInputsAction(run.id)
      .then((rows) => {
        if (active) setInputs(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [run.id]);

  const def = COMPONENT_BY_TYPE.get(componentType);
  const isHours = def?.kind === "hours";

  const employeeById = React.useMemo(() => new Map(eligible.map((e) => [e.id, e])), [eligible]);

  // Live preview: recompute the selected employee's gross/PAYE/net with the
  // employee's existing inputs plus the row being drafted.
  const previewValues = React.useMemo<PayrollInputValue[]>(() => {
    const existing = inputs
      .filter((i) => i.employeeId === employeeId)
      .map((i) => toInputValue(i));
    if (def) {
      const draftAmount = resolveInputAmount(componentType, {
        amount: Number(amount) || 0,
        quantity: Number(quantity) || 0,
        rate: Number(rate) || 0,
      });
      if (draftAmount > 0) {
        existing.push({
          componentType,
          label: def.label,
          amount: draftAmount,
          taxTreatment: def.taxTreatment,
          quantity: isHours ? Number(quantity) || 0 : undefined,
          rate: isHours ? Number(rate) || 0 : undefined,
        });
      }
    }
    return existing;
  }, [inputs, employeeId, def, componentType, amount, quantity, rate, isHours]);

  const preview = React.useMemo(() => {
    const emp = employeeById.get(employeeId);
    if (!emp) return null;
    const base = calculateMonthlyPayroll(emp);
    const withInputs = calculateMonthlyPayroll(emp, { inputs: previewValues });
    return { base, withInputs };
  }, [employeeById, employeeId, previewValues]);

  function resetForm() {
    setAmount("");
    setQuantity("");
    setRate("");
  }

  function handleAdd() {
    if (!employeeId) {
      toast.error("Select an employee first.");
      return;
    }
    const resolved = resolveInputAmount(componentType, {
      amount: Number(amount) || 0,
      quantity: Number(quantity) || 0,
      rate: Number(rate) || 0,
    });
    if (!(resolved > 0)) {
      toast.error(isHours ? "Enter hours and a rate." : "Enter an amount greater than zero.");
      return;
    }
    startAdd(async () => {
      try {
        const created = await addVariablePayInputAction({
          runId: run.id,
          employeeId,
          componentType,
          quantity: isHours ? Number(quantity) || 0 : null,
          rate: isHours ? Number(rate) || 0 : null,
          amount: isHours ? null : Number(amount) || 0,
        });
        setInputs((prev) => [...prev, created]);
        resetForm();
        toast.success("Adjustment added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add adjustment.");
      }
    });
  }

  function handleRemove(id: string) {
    const snapshot = inputs;
    setInputs((prev) => prev.filter((i) => i.id !== id));
    removeVariablePayInputAction(id).catch((err) => {
      setInputs(snapshot);
      toast.error(err instanceof Error ? err.message : "Could not remove adjustment.");
    });
  }

  function handleDownloadTemplate() {
    // One row per eligible employee, pre-filled number + name, a column per
    // component. A short key row precedes the header for HR guidance.
    const headers = ["employeeNumber", "name", ...TEMPLATE_COLUMNS];
    const keyRow: (string | number)[] = [
      "KEY",
      "hours x rate columns: overtime, overtime_double, sunday_time, public_holiday_time, night_shift. Others: enter a rand amount.",
      ...TEMPLATE_COLUMNS.map(() => ""),
    ];
    const rows: (string | number)[][] = [
      keyRow,
      ...eligible.map((e) => [e.employeeNumber, `${e.firstName} ${e.lastName}`, ...TEMPLATE_COLUMNS.map(() => "")]),
    ];
    const csv = toCSV(headers, rows);
    downloadCSV(csv, `variable-pay-${run.period}`);
  }

  function parseCsv(text: string): { employeeNumber: string; componentType: string; amount: number }[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) return [];
    const header = splitCsvLine(lines[0]);
    const colIndex = new Map(header.map((h, i) => [h.trim(), i]));
    const numIdx = colIndex.get("employeeNumber");
    if (numIdx == null) throw new Error("Missing employeeNumber column.");
    const out: { employeeNumber: string; componentType: string; amount: number }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitCsvLine(lines[i]);
      const employeeNumber = (cells[numIdx] ?? "").trim();
      if (!employeeNumber || employeeNumber.toUpperCase() === "KEY") continue;
      for (const type of TEMPLATE_COLUMNS) {
        const idx = colIndex.get(type);
        if (idx == null) continue;
        const raw = (cells[idx] ?? "").trim();
        if (raw === "") continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) continue;
        // For hours-based columns the template value is treated as the final
        // rand amount for that line (HR enters the computed amount). Explicit
        // amount keeps the round-trip download == upload shape.
        out.push({ employeeNumber, componentType: type, amount: value });
      }
    }
    return out;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      let parsed: { employeeNumber: string; componentType: string; amount: number }[];
      try {
        parsed = parseCsv(text);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not read file.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (parsed.length === 0) {
        toast.error("No values found in the file.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      startUpload(async () => {
        try {
          const result = await applyVariablePayCsvAction(
            run.id,
            parsed.map((p) => ({ employeeNumber: p.employeeNumber, componentType: p.componentType, amount: p.amount }))
          );
          const fresh = await listVariablePayInputsAction(run.id);
          setInputs(fresh);
          if (result.errors.length > 0) {
            toast.warning(`Applied ${result.applied}. ${result.errors.length} row(s) skipped.`, {
              description: result.errors.slice(0, 3).map((er) => `Row ${er.row}: ${er.message}`).join(" "),
            });
          } else {
            toast.success(`Applied ${result.applied} adjustment(s) from the file.`);
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not apply the file.");
        } finally {
          if (fileRef.current) fileRef.current.value = "";
        }
      });
    });
  }

  const totalVariable = inputs.reduce((s, i) => s + i.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          Adjustments and variable pay
        </CardTitle>
        <CardDescription>
          Add overtime, commission, allowances, bonuses and once-off deductions for this run. These
          apply when you finalise. {formatCurrency(totalVariable)} captured so far.
        </CardDescription>
        {!isClosed ? (
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={applyingRecurring}
              onClick={handleApplyRecurring}
            >
              {applyingRecurring ? <Loader2 className="size-4 animate-spin" /> : <Repeat className="size-4" />}
              Add recurring components
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {!isClosed ? (
          <div className="rounded-xl border border-border/70 p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligible.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Component</Label>
                <Select
                  value={componentType}
                  onValueChange={(v) => {
                    setComponentType(v);
                    resetForm();
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_COMPONENTS.map((d) => (
                      <SelectItem key={d.type} value={d.type}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isHours ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min={0}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rate (R / hour)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label>Amount (R)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
            {def ? <p className="text-xs text-muted-foreground">{def.hint}</p> : null}

            {preview ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <PreviewCell label="Gross" before={preview.base.grossPay} after={preview.withInputs.grossPay} />
                <PreviewCell label="PAYE" before={preview.base.paye} after={preview.withInputs.paye} />
                <PreviewCell label="Net pay" before={preview.base.netPay} after={preview.withInputs.netPay} />
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={handleDownloadTemplate} type="button">
                <Download />
                Download inputs template
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
                Upload batch
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />
              <Button onClick={handleAdd} disabled={isAdding} type="button">
                {isAdding ? <Loader2 className="animate-spin" /> : <Plus />}
                Add adjustment
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This run is closed. Adjustments can no longer be changed.
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading adjustments...</p>
        ) : inputs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No adjustments captured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Component</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inputs.map((i) => {
                const emp = employeeById.get(i.employeeId) as Employee | undefined;
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      {emp ? `${emp.firstName} ${emp.lastName}` : i.employeeId}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {i.label}
                        {i.taxTreatment === "annual_payment" ? (
                          <Badge variant="secondary">Annual payment</Badge>
                        ) : null}
                        {i.quantity != null && i.rate != null ? (
                          <span className="text-xs text-muted-foreground">
                            {i.quantity}h x {formatCurrency(i.rate)}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(i.amount)}</TableCell>
                    <TableCell>
                      {!isClosed ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(i.id)}
                          aria-label="Remove adjustment"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewCell({ label, before, after }: { label: string; before: number; after: number }) {
  const changed = Math.abs(after - before) > 0.005;
  return (
    <div className="min-w-0 rounded-lg border border-border/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-base font-semibold tabular-nums">{formatCurrency(after)}</p>
      {changed ? (
        <p className="text-xs text-muted-foreground">was {formatCurrency(before)}</p>
      ) : null}
    </div>
  );
}

/** Minimal CSV line splitter that honours double-quoted cells. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
