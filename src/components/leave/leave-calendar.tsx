"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useScopedEmployees, useScopedLeaveRequests } from "@/lib/auth/scope";
import { useCustomHolidays } from "@/lib/store/hooks";
import { SA_PUBLIC_HOLIDAYS } from "@/lib/leave/business-days";
import { getInitials, leaveTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CustomHoliday, Employee, LeaveRequest, LeaveType } from "@/lib/types";

// Colour per leave type. No shared helper exists yet, so the calendar owns this
// palette. Values are plain hex so they can be applied through inline styles.
const LEAVE_TYPE_COLOR: Record<LeaveType, string> = {
  annual: "#00A8E8",
  sick: "#dc2626",
  family: "#16a34a",
  unpaid: "#64748b",
  maternity: "#db2777",
  parental: "#9333ea",
  adoption: "#0891b2",
  commissioning: "#ca8a04",
  study: "#ea580c",
};

// Monday first, matching a South African working week.
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MAX_VISIBLE_PER_DAY = 3;

type DayEntry = {
  request: LeaveRequest;
  employee: Employee;
};

/** Parse a "YYYY-MM-DD" string into a local Date, avoiding timezone drift. */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Days since the Unix epoch for a local date, for cheap inclusive comparisons. */
function toDayNumber(date: Date): number {
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() /
      86_400_000
  );
}

/** Index of the weekday with Monday as 0 through Sunday as 6. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function LeaveChip({ entry }: { entry: DayEntry }) {
  const color = LEAVE_TYPE_COLOR[entry.request.type];
  const approved = entry.request.status === "approved";
  const name = `${entry.employee.firstName} ${entry.employee.lastName}`;
  const label = `${name}, ${leaveTypeLabel(entry.request.type)}, ${
    approved ? "approved" : "pending"
  }`;

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "flex items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight",
        approved ? "text-white" : "border-dashed bg-transparent"
      )}
      style={
        approved
          ? { backgroundColor: color, borderColor: color }
          : { color, borderColor: color }
      }
    >
      <span className="truncate">
        {getInitials(entry.employee.firstName, entry.employee.lastName)}
        <span className="hidden sm:inline"> {entry.employee.firstName}</span>
      </span>
    </span>
  );
}

function DayCell({
  date,
  inMonth,
  isToday,
  entries,
  holiday,
}: {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  entries: DayEntry[];
  holiday?: { name: string; custom: boolean };
}) {
  const visible = entries.slice(0, MAX_VISIBLE_PER_DAY);
  const overflow = entries.slice(MAX_VISIBLE_PER_DAY);

  return (
    <div
      className={cn(
        "flex min-h-24 flex-col gap-1 border-t border-l border-border p-1.5",
        !inMonth && "bg-muted/40",
        holiday && "bg-muted/20"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
            inMonth ? "text-foreground" : "text-muted-foreground/60",
            isToday && "bg-primary text-primary-foreground"
          )}
        >
          {date.getDate()}
        </span>
        {holiday && (
          <span
            title={holiday.name}
            className={cn(
              "truncate text-[9px] leading-tight",
              holiday.custom ? "text-amber-600" : "text-muted-foreground"
            )}
          >
            {holiday.name}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {visible.map((entry) => (
          <LeaveChip key={entry.request.id} entry={entry} />
        ))}
        {overflow.length > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-muted"
              >
                +{overflow.length} more
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56">
              <p className="text-xs font-medium text-muted-foreground">
                On leave this day
              </p>
              <div className="flex flex-col gap-1.5">
                {entries.map((entry) => (
                  <div
                    key={entry.request.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        "size-2.5 shrink-0 rounded-full border",
                        entry.request.status === "approved"
                          ? ""
                          : "border-dashed bg-transparent"
                      )}
                      style={
                        entry.request.status === "approved"
                          ? {
                              backgroundColor: LEAVE_TYPE_COLOR[entry.request.type],
                              borderColor: LEAVE_TYPE_COLOR[entry.request.type],
                            }
                          : { borderColor: LEAVE_TYPE_COLOR[entry.request.type] }
                      }
                    />
                    <span className="truncate font-medium">
                      {entry.employee.firstName} {entry.employee.lastName}
                    </span>
                    <span className="ml-auto shrink-0 text-muted-foreground">
                      {entry.request.status === "approved" ? "Approved" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}

function buildCalendarHolidayMap(
  year: number,
  customHolidays: CustomHoliday[]
): Map<string, { name: string; custom: boolean }> {
  const map = new Map<string, { name: string; custom: boolean }>();
  for (const h of SA_PUBLIC_HOLIDAYS) {
    const y = parseInt(h.date.slice(0, 4), 10);
    if (y === year) map.set(h.date, { name: h.name, custom: false });
  }
  for (const h of customHolidays) {
    const y = parseInt(h.date.slice(0, 4), 10);
    const effectiveDate = h.recurring ? `${year}-${h.date.slice(5)}` : h.date;
    if (h.recurring || y === year) {
      if (!map.has(effectiveDate)) {
        map.set(effectiveDate, { name: h.name, custom: true });
      }
    }
  }
  return map;
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LeaveCalendar() {
  const requests = useScopedLeaveRequests();
  const employees = useScopedEmployees();
  const customHolidays = useCustomHolidays();

  const today = React.useMemo(() => new Date(), []);
  const [cursor, setCursor] = React.useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const employeeById = React.useMemo(() => {
    const map = new Map<string, Employee>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  // Only approved and pending requests are shown; rejected and cancelled are ignored.
  const visibleRequests = React.useMemo(
    () =>
      requests.filter(
        (r) => r.status === "approved" || r.status === "pending"
      ),
    [requests]
  );

  // Build the six-week grid starting on the Monday on or before the first of the month.
  const gridDays = React.useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - mondayIndex(firstOfMonth));
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [cursor]);

  // Map each day number to the entries on leave that day.
  const entriesByDay = React.useMemo(() => {
    const map = new Map<number, DayEntry[]>();
    for (const request of visibleRequests) {
      const employee = employeeById.get(request.employeeId);
      if (!employee) continue;
      const startNum = toDayNumber(parseDateOnly(request.startDate));
      const endNum = toDayNumber(parseDateOnly(request.endDate));
      for (let d = startNum; d <= endNum; d++) {
        const list = map.get(d) ?? [];
        list.push({ request, employee });
        map.set(d, list);
      }
    }
    // Approved first, then alphabetical, for a stable, readable order.
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.request.status !== b.request.status) {
          return a.request.status === "approved" ? -1 : 1;
        }
        return a.employee.firstName.localeCompare(b.employee.firstName);
      });
    }
    return map;
  }, [visibleRequests, employeeById]);

  const holidayMap = React.useMemo(
    () => buildCalendarHolidayMap(cursor.getFullYear(), customHolidays),
    [cursor, customHolidays]
  );

  const monthHasLeave = React.useMemo(() => {
    return gridDays.some((date) => {
      if (date.getMonth() !== cursor.getMonth()) return false;
      return (entriesByDay.get(toDayNumber(date))?.length ?? 0) > 0;
    });
  }, [gridDays, entriesByDay, cursor]);

  const heading = new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  }).format(cursor);

  const usedTypes = React.useMemo(() => {
    const types = new Set<LeaveType>();
    for (const r of visibleRequests) types.add(r.type);
    return (Object.keys(LEAVE_TYPE_COLOR) as LeaveType[]).filter((t) =>
      types.has(t)
    );
  }, [visibleRequests]);

  function goToPrevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function goToNextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function goToToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{heading}</h2>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToPrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-r border-b border-border">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="border-t border-l border-border bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
              {gridDays.map((date) => (
                <DayCell
                  key={date.toISOString()}
                  date={date}
                  inMonth={date.getMonth() === cursor.getMonth()}
                  isToday={isSameDay(date, today)}
                  entries={entriesByDay.get(toDayNumber(date)) ?? []}
                  holiday={holidayMap.get(toIsoDate(date))}
                />
              ))}
            </div>
          </div>
        </div>

        {!monthHasLeave ? (
          <p className="text-center text-sm text-muted-foreground">
            No one in your team is on leave in {heading}.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          {usedTypes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {usedTypes.map((type) => (
                <div key={type} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: LEAVE_TYPE_COLOR[type] }}
                  />
                  <span className="text-muted-foreground">
                    {leaveTypeLabel(type)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-foreground" />
              <span className="text-muted-foreground">Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full border border-dashed border-foreground bg-transparent" />
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-muted-foreground/20 ring-1 ring-muted-foreground/30" />
              <span className="text-muted-foreground">Public holiday</span>
            </div>
            {customHolidays.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-amber-500/10 ring-1 ring-amber-500/40" />
                <span className="text-muted-foreground">Company holiday</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
