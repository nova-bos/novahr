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
import { useDepartments, useEmployees } from "@/lib/store/hooks";

export function HeadcountChart() {
  const departments = useDepartments();
  const employees = useEmployees();

  const data = React.useMemo(() => {
    return departments
      .map((dept) => ({
        id: dept.id,
        name: dept.name,
        color: dept.color,
        value: employees.filter((e) => e.department === dept.name && e.status !== "terminated")
          .length,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [departments, employees]);

  const chartConfig = React.useMemo(() => {
    return data.reduce<ChartConfig>((config, dept) => {
      config[dept.id] = { label: dept.name, color: dept.color };
      return config;
    }, {});
  }, [data]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Headcount by department</CardTitle>
        <CardDescription>Active and probation employees per department</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24, top: 8 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={140}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0];
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <span className="font-medium">{item.payload.name}</span>
                    <span className="ml-2 tabular-nums text-muted-foreground">
                      {item.value} {Number(item.value) === 1 ? "person" : "people"}
                    </span>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
