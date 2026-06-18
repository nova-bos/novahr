"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { useLeaveRequests } from "@/lib/store/hooks";
import { leaveTypeLabel } from "@/lib/format";
import type { LeaveType } from "@/lib/types";

const TYPE_COLORS: Record<LeaveType, string> = {
  annual: "var(--chart-1)",
  sick: "var(--chart-2)",
  family: "var(--chart-3)",
  unpaid: "var(--chart-4)",
};

const TYPES: LeaveType[] = ["annual", "sick", "family", "unpaid"];

export function LeaveUsageChart() {
  const requests = useLeaveRequests();
  const approved = requests.filter((r) => r.status === "approved");

  const data = React.useMemo(() => {
    return TYPES.map((type) => ({
      id: type,
      name: leaveTypeLabel(type).replace(" leave", "").replace(" responsibility", ""),
      color: TYPE_COLORS[type],
      value: approved.filter((r) => r.type === type).reduce((sum, r) => sum + r.days, 0),
    }));
  }, [approved]);

  const chartConfig = React.useMemo(() => {
    return data.reduce<ChartConfig>((config, item) => {
      config[item.id] = { label: item.name, color: item.color };
      return config;
    }, {});
  }, [data]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Approved leave days by type</CardTitle>
        <CardDescription>Total days taken across the team</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
          <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0];
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <span className="font-medium">{item.payload.name}</span>
                    <span className="ml-2 tabular-nums text-muted-foreground">
                      {item.value} {Number(item.value) === 1 ? "day" : "days"}
                    </span>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
