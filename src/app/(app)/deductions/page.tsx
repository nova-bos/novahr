"use client";

import * as React from "react";
import { toast } from "sonner";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, OptionalTag } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { PlanGate } from "@/components/layout/plan-gate";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { useTenantId } from "@/lib/store/hooks";
import {
  getEarningTypesAction,
  getDeductionTypesAction,
  createEarningTypeAction,
  updateEarningTypeAction,
  toggleEarningTypeAction,
  deleteEarningTypeAction,
  createDeductionTypeAction,
  updateDeductionTypeAction,
  toggleDeductionTypeAction,
  deleteDeductionTypeAction,
  ensureDefaultEarningTypes,
  ensureDefaultDeductionTypes,
  type EarningTypeRow,
  type DeductionTypeRow,
} from "@/lib/deductions/actions";
import type { EarningCategory, DeductionCategory } from "@prisma/client";

// ---- Statutory info cards ----
const STATUTORY_INFO = [
  {
    key: "paye",
    title: "PAYE",
    subtitle: "Pay As You Earn",
    description:
      "Income tax withheld by the employer on behalf of the employee and remitted monthly to SARS via EMP201.",
    rate: "Per SARS tax tables",
  },
  {
    key: "uif",
    title: "UIF",
    subtitle: "Unemployment Insurance Fund",
    description:
      "Employee and employer each contribute 1% of remuneration (capped at R17 712/month) to the UIF Commissioner.",
    rate: "1% employee + 1% employer",
  },
  {
    key: "sdl",
    title: "SDL",
    subtitle: "Skills Development Levy",
    description:
      "Employers with an annual payroll above R500 000 pay 1% of the monthly leviable amount to SARS via EMP201.",
    rate: "1% of leviable amount",
  },
] as const;

const EARNING_CATEGORY_OPTIONS: Array<{ value: EarningCategory; label: string }> = [
  { value: "basic_salary", label: "Basic Salary" },
  { value: "overtime", label: "Overtime" },
  { value: "bonus", label: "Bonus" },
  { value: "commission", label: "Commission" },
  { value: "travel_allowance", label: "Travel Allowance" },
  { value: "housing_allowance", label: "Housing Allowance" },
  { value: "other_allowance", label: "Other Allowance" },
];

const DEDUCTION_CATEGORY_OPTIONS: Array<{ value: DeductionCategory; label: string }> = [
  { value: "medical_aid", label: "Medical Aid" },
  { value: "retirement_fund", label: "Retirement Fund" },
  { value: "garnishee", label: "Garnishee" },
  { value: "loan_repayment", label: "Loan Repayment" },
  { value: "other", label: "Other" },
];

function earningCategoryLabel(cat: EarningCategory): string {
  return EARNING_CATEGORY_OPTIONS.find((o) => o.value === cat)?.label ?? cat;
}

function deductionCategoryLabel(cat: DeductionCategory): string {
  const all: Array<{ value: DeductionCategory; label: string }> = [
    { value: "paye", label: "PAYE" },
    { value: "uif", label: "UIF" },
    ...DEDUCTION_CATEGORY_OPTIONS,
  ];
  return all.find((o) => o.value === cat)?.label ?? cat;
}

// ---- Earning type dialog ----
interface EarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: EarningTypeRow;
  onSaved: () => void;
  tenantId: string;
}

function EarningTypeDialog({ open, onOpenChange, initial, onSaved, tenantId }: EarningDialogProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [category, setCategory] = React.useState<EarningCategory>(
    initial?.category ?? "other_allowance"
  );
  const [isTaxable, setIsTaxable] = React.useState(initial?.isTaxable ?? true);
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [isSaving, startSaveTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCategory(initial?.category ?? "other_allowance");
      setIsTaxable(initial?.isTaxable ?? true);
      setDescription(initial?.description ?? "");
    }
  }, [open, initial]);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startSaveTransition(async () => {
      const result = initial
        ? await updateEarningTypeAction(tenantId, initial.id, { name, category, isTaxable, description: description || undefined })
        : await createEarningTypeAction(tenantId, { name, category, isTaxable, description: description || undefined });

      if ("error" in result && result.error) {
        toast.error("Could not save", { description: result.error });
        return;
      }
      toast.success(initial ? "Earning type updated" : "Earning type created");
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit earning type" : "Add earning type"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="et-name">Name</Label>
            <Input
              id="et-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. Car Allowance"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EarningCategory)} disabled={isSaving}>
              <SelectTrigger id="et-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EARNING_CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="et-taxable"
              checked={isTaxable}
              onCheckedChange={(v) => setIsTaxable(Boolean(v))}
              disabled={isSaving}
            />
            <Label htmlFor="et-taxable" className="cursor-pointer">Taxable earning</Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-desc">Description <OptionalTag /></Label>
            <Textarea
              id="et-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Deduction type dialog ----
interface DeductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DeductionTypeRow;
  onSaved: () => void;
  tenantId: string;
}

function DeductionTypeDialog({ open, onOpenChange, initial, onSaved, tenantId }: DeductionDialogProps) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [category, setCategory] = React.useState<DeductionCategory>(
    initial?.category ?? "other"
  );
  const [isEmployer, setIsEmployer] = React.useState(initial?.isEmployer ?? false);
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [isSaving, startSaveTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCategory(initial?.category ?? "other");
      setIsEmployer(initial?.isEmployer ?? false);
      setDescription(initial?.description ?? "");
    }
  }, [open, initial]);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startSaveTransition(async () => {
      const result = initial
        ? await updateDeductionTypeAction(tenantId, initial.id, { name, category, isEmployer, description: description || undefined })
        : await createDeductionTypeAction(tenantId, { name, category, isEmployer, isStatutory: false, description: description || undefined });

      if ("error" in result && result.error) {
        toast.error("Could not save", { description: result.error });
        return;
      }
      toast.success(initial ? "Deduction type updated" : "Deduction type created");
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit deduction type" : "Add deduction type"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="dt-name">Name</Label>
            <Input
              id="dt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. Staff Loan Repayment"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dt-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DeductionCategory)} disabled={isSaving}>
              <SelectTrigger id="dt-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEDUCTION_CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="dt-employer"
              checked={isEmployer}
              onCheckedChange={(v) => setIsEmployer(Boolean(v))}
              disabled={isSaving}
            />
            <Label htmlFor="dt-employer" className="cursor-pointer">Employer-side deduction</Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dt-desc">Description <OptionalTag /></Label>
            <Textarea
              id="dt-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main page ----
export default function DeductionsPage() {
  const allowed = useRoleGuard(["hr", "exco"]);
  const tenantId = useTenantId();

  const [earningTypes, setEarningTypes] = React.useState<EarningTypeRow[]>([]);
  const [deductionTypes, setDeductionTypes] = React.useState<DeductionTypeRow[]>([]);
  const [loadingEarnings, setLoadingEarnings] = React.useState(true);
  const [loadingDeductions, setLoadingDeductions] = React.useState(true);

  const [earningDialogOpen, setEarningDialogOpen] = React.useState(false);
  const [editingEarning, setEditingEarning] = React.useState<EarningTypeRow | undefined>(undefined);
  const [deductionDialogOpen, setDeductionDialogOpen] = React.useState(false);
  const [editingDeduction, setEditingDeduction] = React.useState<DeductionTypeRow | undefined>(undefined);

  const [, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!allowed || !tenantId) return;
    ensureDefaultEarningTypes(tenantId).then(() =>
      getEarningTypesAction(tenantId).then((rows) => {
        setEarningTypes(rows);
        setLoadingEarnings(false);
      })
    );
    ensureDefaultDeductionTypes(tenantId).then(() =>
      getDeductionTypesAction(tenantId).then((rows) => {
        setDeductionTypes(rows);
        setLoadingDeductions(false);
      })
    );
  }, [allowed, tenantId]);

  function refreshEarnings() {
    getEarningTypesAction(tenantId).then(setEarningTypes);
  }

  function refreshDeductions() {
    getDeductionTypesAction(tenantId).then(setDeductionTypes);
  }

  function handleToggleEarning(id: string, isActive: boolean) {
    setEarningTypes((prev) => prev.map((e) => (e.id === id ? { ...e, isActive } : e)));
    startTransition(async () => {
      const result = await toggleEarningTypeAction(tenantId, id, isActive);
      if (!result.success) {
        toast.error("Could not update", { description: result.error });
        setEarningTypes((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: !isActive } : e)));
      }
    });
  }

  function handleDeleteEarning(id: string) {
    startTransition(async () => {
      const result = await deleteEarningTypeAction(tenantId, id);
      if (!result.success) {
        toast.error("Could not delete", { description: result.error });
        return;
      }
      setEarningTypes((prev) => prev.filter((e) => e.id !== id));
      toast.success("Earning type deleted");
    });
  }

  function handleToggleDeduction(id: string, isActive: boolean) {
    setDeductionTypes((prev) => prev.map((d) => (d.id === id ? { ...d, isActive } : d)));
    startTransition(async () => {
      const result = await toggleDeductionTypeAction(tenantId, id, isActive);
      if (!result.success) {
        toast.error("Could not update", { description: result.error });
        setDeductionTypes((prev) => prev.map((d) => (d.id === id ? { ...d, isActive: !isActive } : d)));
      }
    });
  }

  function handleDeleteDeduction(id: string) {
    startTransition(async () => {
      const result = await deleteDeductionTypeAction(tenantId, id);
      if (!result.success) {
        toast.error("Could not delete", { description: result.error });
        return;
      }
      setDeductionTypes((prev) => prev.filter((d) => d.id !== id));
      toast.success("Deduction type deleted");
    });
  }

  if (!allowed) return null;

  return (
    <PlanGate feature="deductionTypes">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Earnings and Deductions"
          description="Configure earning types and deduction types for payroll."
        />

        <Tabs defaultValue="statutory">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex min-w-max w-full">
              <TabsTrigger value="statutory">Statutory</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
            </TabsList>
          </div>

          {/* Statutory tab */}
          <TabsContent value="statutory" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {STATUTORY_INFO.map((info) => (
                <Card key={info.key}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Lock className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{info.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{info.subtitle}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                    <div className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {info.rate}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Earnings tab */}
          <TabsContent value="earnings" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Earning types</CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingEarning(undefined);
                    setEarningDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 size-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {loadingEarnings ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : earningTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No earning types found. Click Add to create your first earning type.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table className="min-w-[480px] w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Taxable</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {earningTypes.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {earningCategoryLabel(row.category)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.isTaxable ? "Yes" : "No"}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={row.isActive}
                                onCheckedChange={(v) => handleToggleEarning(row.id, v)}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    setEditingEarning(row);
                                    setEarningDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteEarning(row.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deductions tab */}
          <TabsContent value="deductions" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Deduction types</CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingDeduction(undefined);
                    setDeductionDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 size-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {loadingDeductions ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : deductionTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deduction types configured.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table className="min-w-[520px] w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Employer</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deductionTypes.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {row.isStatutory ? (
                                  <Lock className="size-3.5 text-muted-foreground shrink-0" />
                                ) : null}
                                <span className="font-medium">{row.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {deductionCategoryLabel(row.category)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.isEmployer ? "Yes" : "No"}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={row.isActive}
                                onCheckedChange={(v) => handleToggleDeduction(row.id, v)}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end">
                                {!row.isStatutory ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => {
                                        setEditingDeduction(row);
                                        setDeductionDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="size-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteDeduction(row.id)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <EarningTypeDialog
          open={earningDialogOpen}
          onOpenChange={setEarningDialogOpen}
          initial={editingEarning}
          onSaved={refreshEarnings}
          tenantId={tenantId}
        />
        <DeductionTypeDialog
          open={deductionDialogOpen}
          onOpenChange={setDeductionDialogOpen}
          initial={editingDeduction}
          onSaved={refreshDeductions}
          tenantId={tenantId}
        />
      </div>
    </PlanGate>
  );
}

