import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEPS, type StepId } from "./types";

export function WizardStepper({
  currentStep,
  completedSteps,
}: {
  currentStep: StepId;
  completedSteps: Set<StepId>;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {STEPS.map((step, index) => {
        const isComplete = completedSteps.has(step.id);
        const isCurrent = step.id === currentStep;
        const isLast = index === STEPS.length - 1;

        return (
          <li key={step.id} className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-0">
            <div className="flex items-center sm:w-full">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isComplete && !isCurrent && "border-primary/30 bg-primary/10 text-primary",
                  !isCurrent && !isComplete && "border-border text-muted-foreground"
                )}
              >
                {isComplete && !isCurrent ? <Check className="size-4" /> : index + 1}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "ml-3 hidden h-px flex-1 sm:ml-4 sm:block",
                    index < currentIndex ? "bg-primary/30" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="mt-0 sm:mt-3">
              <p
                className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
