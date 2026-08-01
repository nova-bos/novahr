"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Parse a "YYYY-MM-DD" string into a local Date (no timezone drift). */
function parseISODate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Format a Date back to a "YYYY-MM-DD" string using local calendar parts. */
function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface DatePickerProps {
  /** Value as a "YYYY-MM-DD" string, or "" when unset. */
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /**
   * "dropdown" shows month + year select menus, which is far friendlier for
   * dates a long way from today (date of birth, qualification years).
   */
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
  /** Bound the selectable range (inclusive), used mainly for the year dropdown. */
  fromYear?: number;
  toYear?: number;
  /** Block dates after today (date of birth, start dates that cannot be future). */
  disableFuture?: boolean;
  /** Block dates strictly after this "YYYY-MM-DD". */
  disableAfter?: string;
  /** Block dates strictly before this "YYYY-MM-DD". */
  disableBefore?: string;
}

/**
 * A calendar-popover date picker used across the app in place of the native
 * <input type="date">, so every single-date field matches the leave picker's
 * look and feel. Values are plain "YYYY-MM-DD" strings to slot into existing
 * form state without conversion.
 */
export function DatePicker({
  value,
  onValueChange,
  id,
  placeholder = "Select date",
  disabled,
  className,
  captionLayout = "label",
  fromYear,
  toYear,
  disableFuture,
  disableAfter,
  disableBefore,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseISODate(value);

  const disabledMatchers: Matcher[] = [];
  if (disableFuture) disabledMatchers.push({ after: new Date() });
  const after = parseISODate(disableAfter);
  if (after) disabledMatchers.push({ after });
  const before = parseISODate(disableBefore);
  if (before) disabledMatchers.push({ before });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          data-empty={!selected}
          className={cn(
            "w-full justify-start gap-2 font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          {selected ? formatDate(selected) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout={captionLayout}
          startMonth={fromYear ? new Date(fromYear, 0) : undefined}
          endMonth={toYear ? new Date(toYear, 11) : undefined}
          disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
          autoFocus
          onSelect={(date) => {
            onValueChange(date ? toISODate(date) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
