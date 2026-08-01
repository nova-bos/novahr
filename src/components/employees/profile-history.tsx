"use client";

import * as React from "react";
import { ArrowUpRight, Building2, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { Employee } from "@/lib/types";
import {
  getEmployeeHistoryAction,
  type EmployeeHistoryEvent,
} from "@/lib/employees/history-actions";

function EventIcon({ field }: { field: string }) {
  if (field === "Job title") return <ArrowUpRight className="size-4 text-primary" />;
  if (field === "Branch") return <Building2 className="size-4 text-muted-foreground" />;
  return <GitBranch className="size-4 text-muted-foreground" />;
}

export function ProfileHistory({ employee }: { employee: Employee }) {
  const [events, setEvents] = React.useState<EmployeeHistoryEvent[] | null>(null);

  React.useEffect(() => {
    getEmployeeHistoryAction(employee.id)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [employee.id]);

  // Render nothing until loaded, and nothing when there is no history, to keep
  // the overview tab uncluttered for employees who have never changed role.
  if (!events || events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employment history</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40">
                <EventIcon field={event.field} />
              </div>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{event.field} </span>
                  {event.type === "promotion" ? "changed" : "transferred"} from{" "}
                  <span className="text-muted-foreground">{event.oldValue || "unset"}</span> to{" "}
                  <span className="font-medium">{event.newValue || "unset"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.effectiveDate)} · {event.changedBy}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
