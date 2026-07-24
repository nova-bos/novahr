"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, OptionalTag } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlan } from "@/lib/plan/use-plan";
import { useAuth } from "@/lib/auth/auth-provider";
import { useTenantId } from "@/lib/store/hooks";
import {
  getPayrollProfileAction,
  upsertPayrollProfileAction,
  type PayrollProfileResult,
} from "@/lib/pay-profiles/actions";

interface PayrollProfileSectionProps {
  employeeId: string;
}

export function PayrollProfileSection({ employeeId }: PayrollProfileSectionProps) {
  const { can } = usePlan();
  const { user } = useAuth();
  // The payroll profile (tax, UIF, medical aid, retirement fund) is HR-managed
  // data; the server action requires the HR role. `can("payrollProfiles")` only
  // checks the plan capability, so a non-HR user on a capable plan would pass it
  // and then trigger a "Not authorized" throw. Gate on the role too.
  const canView = user?.role === "hr" && can("payrollProfiles");
  const tenantId = useTenantId();
  const [profile, setProfile] = React.useState<PayrollProfileResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [isSaving, startSaveTransition] = React.useTransition();

  const [formTaxNumber, setFormTaxNumber] = React.useState("");
  const [formUifNumber, setFormUifNumber] = React.useState("");
  const [formMedicalAidScheme, setFormMedicalAidScheme] = React.useState("");
  const [formMedicalAidNumber, setFormMedicalAidNumber] = React.useState("");
  const [formMedicalAidDependants, setFormMedicalAidDependants] = React.useState("0");
  const [formRetirementFundName, setFormRetirementFundName] = React.useState("");
  const [formRetirementFundNumber, setFormRetirementFundNumber] = React.useState("");
  const [formNotes, setFormNotes] = React.useState("");

  React.useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    if (!tenantId) return;
    getPayrollProfileAction(tenantId, employeeId).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [tenantId, employeeId, canView]);

  function openEdit() {
    setFormTaxNumber(profile?.taxNumber ?? "");
    setFormUifNumber(profile?.uifNumber ?? "");
    setFormMedicalAidScheme(profile?.medicalAidScheme ?? "");
    setFormMedicalAidNumber(profile?.medicalAidNumber ?? "");
    setFormMedicalAidDependants(String(profile?.medicalAidDependants ?? 0));
    setFormRetirementFundName(profile?.retirementFundName ?? "");
    setFormRetirementFundNumber(profile?.retirementFundNumber ?? "");
    setFormNotes(profile?.notes ?? "");
    setEditOpen(true);
  }

  function handleSave() {
    startSaveTransition(async () => {
      const result = await upsertPayrollProfileAction(tenantId, employeeId, {
        taxNumber: formTaxNumber || undefined,
        uifNumber: formUifNumber || undefined,
        medicalAidScheme: formMedicalAidScheme || undefined,
        medicalAidNumber: formMedicalAidNumber || undefined,
        medicalAidDependants: parseInt(formMedicalAidDependants) || 0,
        retirementFundName: formRetirementFundName || undefined,
        retirementFundNumber: formRetirementFundNumber || undefined,
        notes: formNotes || undefined,
      });

      if (!result.success) {
        toast.error("Could not save profile", { description: result.error });
        return;
      }

      const updated = await getPayrollProfileAction(tenantId, employeeId);
      setProfile(updated);
      setEditOpen(false);
      toast.success("Payroll profile saved");
    });
  }

  if (!canView) return null;
  if (loading) return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-muted-foreground" />
            Payroll profile
          </CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={openEdit} aria-label="Edit payroll profile">
            <Pencil className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {!profile ? (
            <button
              type="button"
              onClick={openEdit}
              className="w-full rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Set up payroll profile
            </button>
          ) : (
            <dl className="grid gap-2 text-sm">
              {profile.taxNumber ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax number</dt>
                  <dd className="font-medium tabular-nums">{profile.taxNumber}</dd>
                </div>
              ) : null}
              {profile.uifNumber ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">UIF number</dt>
                  <dd className="font-medium tabular-nums">{profile.uifNumber}</dd>
                </div>
              ) : null}
              {profile.medicalAidScheme ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Medical aid</dt>
                  <dd className="font-medium">{profile.medicalAidScheme}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Medical dependants</dt>
                <dd className="font-medium tabular-nums">{profile.medicalAidDependants}</dd>
              </div>
              {profile.retirementFundName ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Retirement fund</dt>
                  <dd className="font-medium">{profile.retirementFundName}</dd>
                </div>
              ) : null}
              {profile.notes ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="text-foreground/80">{profile.notes}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit payroll profile</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pp-taxNumber">Tax number <OptionalTag /></Label>
                <Input
                  id="pp-taxNumber"
                  value={formTaxNumber}
                  onChange={(e) => setFormTaxNumber(e.target.value)}
                  placeholder="e.g. 9001015111089"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-uifNumber">UIF number <OptionalTag /></Label>
                <Input
                  id="pp-uifNumber"
                  value={formUifNumber}
                  onChange={(e) => setFormUifNumber(e.target.value)}
                  placeholder="e.g. U123456789"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pp-medicalAidScheme">Medical aid scheme <OptionalTag /></Label>
                <Input
                  id="pp-medicalAidScheme"
                  value={formMedicalAidScheme}
                  onChange={(e) => setFormMedicalAidScheme(e.target.value)}
                  placeholder="e.g. Discovery"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-medicalAidNumber">Medical aid number <OptionalTag /></Label>
                <Input
                  id="pp-medicalAidNumber"
                  value={formMedicalAidNumber}
                  onChange={(e) => setFormMedicalAidNumber(e.target.value)}
                  placeholder="e.g. MED12345678"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pp-medicalAidDependants">Number of dependants <OptionalTag /></Label>
              <Input
                id="pp-medicalAidDependants"
                type="number"
                min={0}
                value={formMedicalAidDependants}
                onChange={(e) => setFormMedicalAidDependants(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pp-retirementFundName">Retirement fund name <OptionalTag /></Label>
                <Input
                  id="pp-retirementFundName"
                  value={formRetirementFundName}
                  onChange={(e) => setFormRetirementFundName(e.target.value)}
                  placeholder="e.g. Allan Gray Retirement"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-retirementFundNumber">Fund number <OptionalTag /></Label>
                <Input
                  id="pp-retirementFundNumber"
                  value={formRetirementFundNumber}
                  onChange={(e) => setFormRetirementFundNumber(e.target.value)}
                  placeholder="e.g. PF-2026-0042"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pp-notes">Notes <OptionalTag /></Label>
              <Textarea
                id="pp-notes"
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes"
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
