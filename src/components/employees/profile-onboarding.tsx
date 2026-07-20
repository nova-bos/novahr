import * as React from "react";
import { toast } from "sonner";
import { Calendar, CheckCircle2, Circle, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useApp } from "@/lib/store/app-provider";
import type { Employee } from "@/lib/types";

export function ProfileOnboarding({ employee, onGraduate }: { employee: Employee; onGraduate?: () => void }) {
  const { toggleOnboardingStep } = useApp();
  const onboarding = employee.onboarding;
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const [optimisticComplete, setOptimisticComplete] = React.useState<Map<string, boolean>>(new Map());

  if (!onboarding) return null;

  function isComplete(stepId: string, serverValue: boolean) {
    if (optimisticComplete.has(stepId)) return optimisticComplete.get(stepId)!;
    return serverValue;
  }

  const completedSteps = onboarding.steps.filter((step) => isComplete(step.id, step.complete)).length;
  const progress = Math.round((completedSteps / onboarding.steps.length) * 100);

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
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="mt-3" />

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
            {onboarding.steps.map((step) => {
              const complete = isComplete(step.id, step.complete);
              const isPending = pending.has(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (isPending) return;
                    const next = !complete;
                    setPending((p) => new Set(p).add(step.id));
                    const nextMap = new Map(optimisticComplete).set(step.id, next);
                    setOptimisticComplete(nextMap);
                    const allDone = onboarding.steps.every((s) =>
                      s.id === step.id ? next : (nextMap.get(s.id) ?? s.complete)
                    );
                    if (allDone && employee.status !== "active") onGraduate?.();
                    toggleOnboardingStep(employee.id, step.id)
                      .then(() => {
                        setOptimisticComplete((m) => {
                          const n = new Map(m);
                          n.delete(step.id);
                          return n;
                        });
                      })
                      .catch(() => {
                        setOptimisticComplete((m) => {
                          const n = new Map(m);
                          n.delete(step.id);
                          return n;
                        });
                        toast.error("Couldn't update onboarding step", {
                          description: "Please try again.",
                        });
                      })
                      .finally(() => {
                        setPending((p) => {
                          const n = new Set(p);
                          n.delete(step.id);
                          return n;
                        });
                      });
                  }}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60"
                >
                  {complete ? (
                    <CheckCircle2 className="size-5 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      complete && "text-muted-foreground line-through"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
