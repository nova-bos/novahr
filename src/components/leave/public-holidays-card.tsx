"use client";

import * as React from "react";
import { CalendarDays, Plus, Repeat, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { publicHolidaysForYear, SA_PUBLIC_HOLIDAYS } from "@/lib/leave/business-days";
import { formatDate } from "@/lib/format";
import { useCustomHolidays } from "@/lib/store/hooks";
import { useApp } from "@/lib/store/app-provider";
import { useAuth } from "@/lib/auth/auth-provider";

const YEARS = Array.from(new Set(SA_PUBLIC_HOLIDAYS.map((h) => Number(h.date.slice(0, 4)))));

function dayOfWeek(isoDate: string): string {
  return new Intl.DateTimeFormat("en-ZA", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`)
  );
}

function CustomHolidayManager() {
  const { addCustomHoliday, deleteCustomHoliday } = useApp();
  const customHolidays = useCustomHolidays();
  const [name, setName] = React.useState("");
  const [date, setDate] = React.useState("");
  const [recurring, setRecurring] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const todayIso = new Date().toISOString().slice(0, 10);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !date) { setError("Name and date are required."); return; }
    setSaving(true);
    try {
      await addCustomHoliday({ name: name.trim(), date, recurring });
      setName("");
      setDate("");
      setRecurring(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holiday.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteCustomHoliday(id);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Company holidays</h3>
        <p className="text-xs text-muted-foreground">
          Add religious, cultural, or any other non-working days specific to your organisation. These appear on all leave calendars and are excluded from leave day counts.
        </p>
      </div>

      {customHolidays.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[460px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Holiday</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customHolidays.map((h) => {
                const displayDate = h.recurring
                  ? `${new Date().getFullYear()}-${h.date.slice(5)}`
                  : h.date;
                const past = !h.recurring && h.date < todayIso;
                return (
                  <TableRow key={h.id} className={past ? "opacity-60" : undefined}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {h.name}
                        {h.recurring && (
                          <Repeat className="size-3 text-muted-foreground" aria-label="Recurring annually" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{h.recurring ? h.date.slice(5) : formatDate(h.date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {dayOfWeek(displayDate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-10 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={deleting === h.id}
                        onClick={() => handleDelete(h.id)}
                        aria-label={`Remove ${h.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="holiday-name" className="text-xs">Holiday name</Label>
            <Input
              id="holiday-name"
              placeholder="e.g. Eid al-Fitr"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holiday-date" className="text-xs">Date</Label>
            <DatePicker
              id="holiday-date"
              value={date}
              onValueChange={setDate}
              placeholder="Select date"
              className="h-9 text-sm"
              captionLayout="dropdown"
              fromYear={new Date().getFullYear() - 1}
              toYear={new Date().getFullYear() + 5}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="holiday-recurring"
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          <Label htmlFor="holiday-recurring" className="text-xs cursor-pointer">
            Repeats every year on the same date
          </Label>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={saving}>
          <Plus className="size-3.5 mr-1" />
          {saving ? "Adding..." : "Add holiday"}
        </Button>
      </form>
    </div>
  );
}

export function PublicHolidaysCard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(YEARS.includes(currentYear) ? currentYear : YEARS[0]);
  const holidays = publicHolidaysForYear(year);
  const todayIso = new Date().toISOString().slice(0, 10);
  const { user } = useAuth();
  const isHr = user?.role === "hr";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              South African public holidays
            </CardTitle>
            <CardDescription>
              Official non-working public holidays under the Public Holidays Act. These days are
              excluded automatically when leave requests are counted.
            </CardDescription>
          </div>
          <div className="flex gap-1.5">
            {YEARS.map((y) => (
              <Button
                key={y}
                type="button"
                size="sm"
                variant={y === year ? "default" : "outline"}
                onClick={() => setYear(y)}
              >
                {y}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[480px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Holiday</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday) => {
                const past = holiday.date < todayIso;
                return (
                  <TableRow key={holiday.date} className={past ? "opacity-60" : undefined}>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>{formatDate(holiday.date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {dayOfWeek(holiday.date)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          When a public holiday falls on a Sunday, the following Monday is also a public holiday.
          An employee required to work on a public holiday must be paid at least double the normal
          daily wage (BCEA section 18).
        </p>

        {isHr && <CustomHolidayManager />}
      </CardContent>
    </Card>
  );
}
