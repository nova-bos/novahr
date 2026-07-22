"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant, useEmployees } from "@/lib/store/hooks";
import { buildEmployeeFromForm } from "@/lib/employees/form-builder";
import { createInviteAction } from "@/lib/invites/actions";
import { StepCompensation } from "./step-compensation";
import { StepPersonal } from "./step-personal";
import { StepRole } from "./step-role";
import { StepReview } from "./step-review";
import { emptyForm, isStepValid, validateStep, STEPS, type StepId } from "./types";
import type { FieldErrors } from "@/lib/schemas/employee";
import { WizardStepper } from "./wizard-stepper";
import type { Employee } from "@/lib/types";
import type { UserRole } from "@/lib/auth/types";

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "employee", label: "Employee", description: "Self-service: own profile, payslips and leave" },
  { value: "manager", label: "Manager", description: "Team visibility and leave approvals" },
  { value: "hr", label: "HR Administrator", description: "Full access including payroll and settings" },
  { value: "exco", label: "Executive", description: "Read-only dashboards, reports and compliance" },
];

function InvitePrompt({
  employee,
  onDone,
}: {
  employee: Employee;
  onDone: (employeeId: string) => void;
}) {
  const [role, setRole] = React.useState<UserRole>("employee");
  const [inviting, setInviting] = React.useState(false);
  const [invited, setInvited] = React.useState(false);

  async function handleInvite() {
    setInviting(true);
    try {
      const result = await createInviteAction({
        email: employee.email,
        name: `${employee.firstName} ${employee.lastName}`,
        role,
        employeeId: employee.id,
      });
      if (result.error) {
        toast.error("Invite failed", { description: result.error });
      } else {
        setInvited(true);
        toast.success("Invitation sent", {
          description: result.emailSent
            ? `An email has been sent to ${employee.email}.`
            : `Invitation created. Share the link from Settings if email is unavailable.`,
        });
      }
    } catch {
      toast.error("Invite failed", { description: "Please try again from Settings." });
    } finally {
      setInviting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-success/10">
          <Check className="size-5 text-success" />
        </div>
        <CardTitle className="mt-2">
          {employee.firstName} has been added
        </CardTitle>
        <CardDescription>
          Send them an invitation to access NovaHR, or skip and do it later from Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!invited ? (
          <>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium">{employee.firstName} {employee.lastName}</p>
              <p className="text-muted-foreground">{employee.email}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Access level</p>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col items-start">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onDone(employee.id)}>
                Skip for now
              </Button>
              <Button onClick={() => void handleInvite()} disabled={inviting}>
                {inviting ? (
                  <><Loader2 className="size-4 animate-spin" /> Sending invite...</>
                ) : (
                  <><Mail className="size-4" /> Send invite</>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Invitation sent to <span className="font-medium text-foreground">{employee.email}</span>.
              They will receive a link to set their password and activate their account.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => onDone(employee.id)}>
                Go to profile
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const tenant = useCurrentTenant();
  const employees = useEmployees();
  const { addEmployee } = useApp();

  const [stepIndex, setStepIndex] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<StepId>>(new Set());
  const [form, setForm] = React.useState(() =>
    emptyForm({ location: tenant.city, bank: tenant.bankName })
  );
  const [stepErrors, setStepErrors] = React.useState<FieldErrors>({});
  const [creating, setCreating] = React.useState(false);
  const [createdEmployee, setCreatedEmployee] = React.useState<Employee | null>(null);

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const canAdvance = isStepValid(currentStep.id, form);

  function goNext() {
    const errors = validateStep(currentStep.id, form);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors({});
    setCompletedSteps((prev) => new Set(prev).add(currentStep.id));
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    const draft = buildEmployeeFromForm(form, tenant, employees.length + 1);
    try {
      const employee = await addEmployee(draft);
      setCreatedEmployee(employee);
    } catch {
      setCreating(false);
      toast.error("Couldn't add employee", { description: "Please try again." });
    }
  }

  function renderStep() {
    switch (currentStep.id) {
      case "personal":
        return <StepPersonal form={form} setForm={setForm} errors={stepErrors} />;
      case "role":
        return <StepRole form={form} setForm={setForm} errors={stepErrors} />;
      case "compensation":
        return <StepCompensation form={form} setForm={setForm} errors={stepErrors} />;
      case "review":
        return <StepReview form={form} />;
    }
  }

  if (createdEmployee) {
    return (
      <InvitePrompt
        employee={createdEmployee}
        onDone={(id) => router.push(`/employees/${id}`)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <WizardStepper currentStep={currentStep.id} completedSteps={completedSteps} />
        </CardContent>
      </Card>

      {renderStep()}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0}>
          <ArrowLeft />
          Back
        </Button>
        {isLastStep ? (
          <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
            {creating ? <Loader2 className="animate-spin" /> : <UserPlus />}
            {creating ? "Creating employee..." : "Create employee"}
          </Button>
        ) : (
          <Button type="button" onClick={goNext} disabled={!canAdvance}>
            Continue
            <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
