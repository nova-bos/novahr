import { Calendar, CheckCircle2, Circle, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useApp } from "@/lib/store/app-provider";
import type { Employee } from "@/lib/types";

export function ProfileOnboarding({ employee }: { employee: Employee }) {
  const { toggleOnboardingStep } = useApp();
  const onboarding = employee.onboarding;

  if (!onboarding) return null;

  const completedSteps = onboarding.steps.filter((step) => step.complete).length;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedSteps} of {onboarding.steps.length} steps complete
            </span>
            <span className="font-semibold">{onboarding.progress}%</span>
          </div>
          <Progress value={onboarding.progress} className="mt-3" />

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Calendar className="size-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Onboarding start date</p>
                <p className="text-sm font-medium">{formatDate(onboarding.startDate)}</p>
              </div>
            </div>
            {onboarding.buddy ? (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <UserCheck className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Onboarding buddy</p>
                  <p className="text-sm font-medium">{onboarding.buddy}</p>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {onboarding.steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleOnboardingStep(employee.id, step.id)}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60"
              >
                {step.complete ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    step.complete && "text-muted-foreground line-through"
                  )}
                >
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
