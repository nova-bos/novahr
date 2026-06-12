"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { useEmployees } from "@/lib/store/hooks";
import { employmentTypeLabel } from "@/lib/format";
import type { EmploymentType } from "@/lib/types";

const TYPE_COLORS: Record<EmploymentType, string> = {
  full_time: "var(--chart-1)",
  part_time: "var(--chart-2)",
  contract: "var(--chart-3)",
};

export function EmploymentMixChart() {
  const employees = useEmployees();
  const active = employees.filter((e) => e.status !== "terminated");

  const data = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const employee of active) {
      counts[employee.employmentType] = (counts[employee.employmentType] ?? 0) + 1;
    }
    return (Object.keys(counts) as EmploymentType[])
      .map((type) => ({
        id: type,
        name: employmentTypeLabel(type),
        color: TYPE_COLORS[type],
        value: counts[type],
      }))
      .sort((a, b) => b.value - a.value);
  }, [active]);

  const chartConfig = React.useMemo(() => {
    return data.reduce<ChartConfig>((config, item) => {
      config[item.id] = { label: item.name, color: item.color };
      return config;
    }, {});
  }, [data]);

  const total = active.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employment mix</CardTitle>
        <CardDescription>{total} active employees</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <ChartContainer config={chartConfig} className="aspect-square h-48 w-full">
          <PieChart>
            <ChartTooltip
              content={({ active: tooltipActive, payload }) => {
                if (!tooltipActive || !payload?.length) return null;
                const item = payload[0];
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-2 font-mono tabular-nums text-muted-foreground">
                      {item.value} {Number(item.value) === 1 ? "person" : "people"}
                    </span>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={72}
              strokeWidth={3}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} stroke="var(--card)" />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="grid w-full grid-cols-1 gap-2">
          {data.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
              <span className="truncate text-muted-foreground">{item.name}</span>
              <span className="ml-auto font-mono font-medium tabular-nums">
                {item.value} · {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
