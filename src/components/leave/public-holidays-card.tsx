"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const YEARS = Array.from(new Set(SA_PUBLIC_HOLIDAYS.map((h) => Number(h.date.slice(0, 4)))));

function dayOfWeek(isoDate: string): string {
  return new Intl.DateTimeFormat("en-ZA", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`)
  );
}

export function PublicHolidaysCard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(YEARS.includes(currentYear) ? currentYear : YEARS[0]);
  const holidays = publicHolidaysForYear(year);
  const todayIso = new Date().toISOString().slice(0, 10);

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
      <CardContent>
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
        <p className="mt-3 text-xs text-muted-foreground">
          When a public holiday falls on a Sunday, the following Monday is also a public holiday.
          An employee required to work on a public holiday must be paid at least double the normal
          daily wage (BCEA section 18).
        </p>
      </CardContent>
    </Card>
  );
}
