"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/store/app-provider";
import { useCurrentTenant, useEmployees } from "@/lib/store/hooks";
import { buildEmployeeFromForm } from "./build-employee";
import { StepCompensation } from "./step-compensation";
import { StepPersonal } from "./step-personal";
import { StepRole } from "./step-role";
import { StepReview } from "./step-review";
import { emptyForm, isStepValid, STEPS, type StepId } from "./types";
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

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const canAdvance = isStepValid(currentStep.id, form);

  function goNext() {
    if (!canAdvance) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep.id));
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleCreate() {
    const draft = buildEmployeeFromForm(form, tenant, employees.length + 1);
    try {
      const employee = await addEmployee(draft);
      toast.success("Employee added", {
        description: `${employee.firstName} ${employee.lastName} has been added to ${tenant.name} and onboarding has started.`,
      });
      router.push(`/employees/${employee.id}`);
    } catch {
      toast.error("Couldn't add employee", {
        description: "Please try again.",
      });
    }
  }

  function renderStep() {
    switch (currentStep.id) {
      case "personal":
        return <StepPersonal form={form} setForm={setForm} />;
      case "role":
        return <StepRole form={form} setForm={setForm} />;
      case "compensation":
        return <StepCompensation form={form} setForm={setForm} />;
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
          <Button type="button" onClick={handleCreate}>
            <UserPlus />
            Create employee
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
