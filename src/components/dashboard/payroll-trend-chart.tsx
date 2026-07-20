"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { usePayrollRuns } from "@/lib/store/hooks";
import { formatAxisCurrency, formatCurrencyCompact, formatMonthShort } from "@/lib/format";

const chartConfig: ChartConfig = {
  totalGross: {
    label: "Gross pay",
    color: "var(--chart-1)",
  },
  totalNet: {
    label: "Net pay",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PayrollTrendChart() {
  const runs = usePayrollRuns();
  const completed = runs.filter((r) => r.status === "completed");

  const data = completed.map((run) => ({
    period: formatMonthShort(run.period),
    totalGross: Math.round(run.totalGross),
    totalNet: Math.round(run.totalNet),
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Payroll trend</CardTitle>
        <CardDescription>Gross vs. net pay over the last {data.length} months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="fillGross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-totalGross)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-totalGross)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-totalNet)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-totalNet)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={60}
              tickFormatter={(value) => formatAxisCurrency(Number(value))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrencyCompact(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Area
              dataKey="totalNet"
              type="monotone"
              fill="url(#fillNet)"
              stroke="var(--color-totalNet)"
              strokeWidth={2}
            />
            <Area
              dataKey="totalGross"
              type="monotone"
              fill="url(#fillGross)"
              stroke="var(--color-totalGross)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
