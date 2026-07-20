"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant, useEmployees } from "@/lib/store/hooks";
import { buildEmployeeFromForm } from "@/lib/employees/form-builder";
import { StepCompensation } from "./step-compensation";
import { StepPersonal } from "./step-personal";
import { StepRole } from "./step-role";
import { StepReview } from "./step-review";
import { emptyForm, isStepValid, validateStep, STEPS, type StepId } from "./types";
import type { FieldErrors } from "@/lib/schemas/employee";
import { WizardStepper } from "./wizard-stepper";

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
      toast.success("Employee added", {
        description: `${employee.firstName} ${employee.lastName} has been added to ${tenant.name} and onboarding has started.`,
      });
      router.push(`/employees/${employee.id}`);
    } catch {
      setCreating(false);
      toast.error("Couldn't add employee", {
        description: "Please try again.",
      });
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
          <Button type="button" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="animate-spin" /> : <UserPlus />}
            {creating ? "Creating employee…" : "Create employee"}
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
