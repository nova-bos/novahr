"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { formatCurrencyCompact, formatMonthShort } from "@/lib/format";

const chartConfig = {
  totalNet: { label: "Net pay", color: "var(--chart-2)" },
  totalPaye: { label: "PAYE", color: "var(--chart-1)" },
  totalUif: { label: "UIF", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function PayrollCompositionChart() {
  const runs = usePayrollRuns();
  const completed = runs.filter((r) => r.status === "completed");

  const data = completed.map((run) => ({
    period: formatMonthShort(run.period),
    totalNet: Math.round(run.totalNet),
    totalPaye: Math.round(run.totalPaye),
    totalUif: Math.round(run.totalUif),
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Payroll cost composition</CardTitle>
        <CardDescription>
          Net pay, PAYE and UIF across the last {data.length} months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={(value) => formatCurrencyCompact(Number(value))}
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
            <Bar dataKey="totalNet" stackId="a" fill="var(--color-totalNet)" radius={[0, 0, 4, 4]} />
            <Bar dataKey="totalPaye" stackId="a" fill="var(--color-totalPaye)" />
            <Bar dataKey="totalUif" stackId="a" fill="var(--color-totalUif)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
