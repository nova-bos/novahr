"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { isWeekend, SA_PUBLIC_HOLIDAYS } from "@/lib/leave/business-days";
import { useCustomHolidays } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";
import type { CustomHoliday, DaySelection } from "@/lib/types";

export interface BookedDate {
  status: "approved" | "pending";
  label: string;
}

interface LeaveDayPickerProps {
  value: DaySelection[];
  onChange: (selections: DaySelection[]) => void;
  bookedDates?: Map<string, BookedDate>;
}

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function buildCells(year: number, month: number): (string | null)[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Mon=0 ... Sun=6
  const startDow = (firstDay.getUTCDay() + 6) % 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${mm}-${dd}`);
  }
  return cells;
}

function buildHolidayMap(
  year: number,
  customHolidays: CustomHoliday[]
): Map<string, { name: string; custom: boolean }> {
  const map = new Map<string, { name: string; custom: boolean }>();
  for (const h of SA_PUBLIC_HOLIDAYS) {
    const y = parseInt(h.date.slice(0, 4), 10);
    if (y === year || y === year + 1) {
      map.set(h.date, { name: h.name, custom: false });
    }
  }
  for (const h of customHolidays) {
    const y = parseInt(h.date.slice(0, 4), 10);
    const monthDay = h.date.slice(5);
    const effectiveDate = h.recurring ? `${year}-${monthDay}` : h.date;
    if (h.recurring || y === year || y === year + 1) {
      if (!map.has(effectiveDate)) {
        map.set(effectiveDate, { name: h.name, custom: true });
      }
    }
  }
  return map;
}

export function LeaveDayPicker({ value, onChange, bookedDates }: LeaveDayPickerProps) {
  const today = todayIso();
  const [viewYear, setViewYear] = React.useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = React.useState(() => new Date().getMonth());
  const customHolidays = useCustomHolidays();

  const selectedMap = new Map(value.map((d) => [d.date, d.type]));
  const holidayMap = buildHolidayMap(viewYear, customHolidays);
  const cells = buildCells(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function toggleDay(date: string) {
    if (selectedMap.has(date)) {
      onChange(value.filter((d) => d.date !== date));
    } else {
      onChange(
        [...value, { date, type: "full" as const }].sort((a, b) =>
          a.date.localeCompare(b.date)
        )
      );
    }
  }

  function setSelectionType(date: string, type: "full" | "partial") {
    onChange(value.map((d) => (d.date === date ? { ...d, type } : d)));
  }

  function removeDay(date: string) {
    onChange(value.filter((d) => d.date !== date));
  }

  const totalDays = value.reduce((sum, d) => sum + (d.type === "full" ? 1 : 0.5), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-sm font-medium">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className={cn(
                "py-1.5 text-center text-[10px] font-medium",
                d === "Sat" || d === "Sun"
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground"
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const weekend = isWeekend(date);
            const holidayEntry = holidayMap.get(date);
            const bookedEntry = bookedDates?.get(date);
            const disabled = weekend || !!holidayEntry || !!bookedEntry;
            const selected = selectedMap.has(date);
            const isToday = date === today;
            const isCustomHoliday = holidayEntry?.custom ?? false;
            const title = bookedEntry
              ? `${bookedEntry.label} (${bookedEntry.status})`
              : holidayEntry?.name;

            return (
              <button
                key={date}
                type="button"
                disabled={disabled}
                onClick={() => toggleDay(date)}
                title={title}
                aria-label={`${date}${selected ? " (selected)" : ""}${title ? ` - ${title}` : ""}`}
                aria-pressed={selected}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center text-xs transition-colors relative select-none",
                  disabled
                    ? bookedEntry
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-not-allowed opacity-30"
                    : selected
                    ? "bg-primary text-primary-foreground font-medium cursor-pointer"
                    : "hover:bg-muted cursor-pointer",
                  isToday && !selected && "font-semibold ring-1 ring-inset ring-primary/40 rounded-sm"
                )}
              >
                <span>{date.slice(8)}</span>
                {holidayEntry && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 size-1 rounded-full opacity-70",
                      isCustomHoliday ? "bg-warning" : "bg-current"
                    )}
                  />
                )}
                {bookedEntry && !holidayEntry && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 size-1 rounded-full",
                      bookedEntry.status === "approved" ? "bg-success" : "bg-info"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {(() => {
        const hasApproved = bookedDates && [...bookedDates.values()].some((v) => v.status === "approved");
        const hasPending = bookedDates && [...bookedDates.values()].some((v) => v.status === "pending");
        return (
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex size-3 rounded-sm bg-primary opacity-90" />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex size-3 rounded-sm ring-1 ring-inset ring-primary/40" />
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex size-1.5 rounded-full bg-muted-foreground/60" />
              Public holiday
            </span>
            {customHolidays.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-1.5 rounded-full bg-warning" />
                Company holiday
              </span>
            )}
            {hasApproved && (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-1.5 rounded-full bg-success" />
                Approved leave
              </span>
            )}
            {hasPending && (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-1.5 rounded-full bg-info" />
                Pending leave
              </span>
            )}
          </div>
        );
      })()}

      {/* Selected days list */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {value.length} {value.length === 1 ? "day" : "days"} selected
            {totalDays !== value.length && (
              <span className="ml-1 text-foreground">
                ({totalDays} {totalDays === 1 ? "day" : "days"} total)
              </span>
            )}
          </p>
          <div className="space-y-1">
            {value.map((sel) => (
              <div
                key={sel.date}
                className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
              >
                <span className="flex-1 text-xs text-foreground">{formatDayLabel(sel.date)}</span>
                <div className="flex items-center gap-0.5 rounded-md border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelectionType(sel.date, "full")}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-medium transition-colors",
                      sel.type === "full"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Full
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectionType(sel.date, "partial")}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-medium transition-colors",
                      sel.type === "partial"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Half
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeDay(sel.date)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={`Remove ${sel.date}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
