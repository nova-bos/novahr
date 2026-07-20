"use client";

import * as React from "react";
import { Pie, PieChart, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { useDepartments, useEmployees } from "@/lib/store/hooks";

export function DepartmentBreakdown() {
  const departments = useDepartments();
  const employees = useEmployees();

  const data = React.useMemo(() => {
    const deptRows = departments
      .map((dept) => ({
        id: dept.id,
        name: dept.name,
        color: dept.color,
        value: employees.filter((e) => e.department === dept.name && e.status !== "terminated").length,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    const unassigned = employees.filter((e) => !e.department && e.status !== "terminated").length;
    if (unassigned > 0) {
      deptRows.push({ id: "unassigned", name: "Unassigned", color: "#94a3b8", value: unassigned });
    }
    return deptRows;
  }, [departments, employees]);

  const chartConfig = React.useMemo(() => {
    return data.reduce<ChartConfig>((config, dept) => {
      config[dept.id] = { label: dept.name, color: dept.color };
      return config;
    }, {});
  }, [data]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department breakdown</CardTitle>
        <CardDescription>Headcount across {data.length} departments</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <ChartContainer config={chartConfig} className="aspect-square h-48 w-full">
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0];
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-2 tabular-nums text-muted-foreground">
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
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2">
          {data.map((dept) => (
            <div key={dept.id} className="flex items-center gap-2 text-xs">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: dept.color }}
              />
              <span className="truncate text-muted-foreground">{dept.name}</span>
              <span className="ml-auto font-medium tabular-nums">
                {Math.round((dept.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
