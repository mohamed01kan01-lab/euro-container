"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

interface RevenueChartProps {
    data: { date: string; revenue: number }[];
    currency: string;
}

const chartConfig = {
    revenue: {
        label: "Revenus",
        color: "var(--color-primary)",
    },
} satisfies ChartConfig;

export function RevenueChart({ data, currency }: RevenueChartProps) {
    if (data.every((d) => d.revenue === 0)) {
        return (
            <p className="text-sm text-muted-foreground py-8 text-center">
                Aucun revenu sur les 7 derniers jours.
            </p>
        );
    }

    const formatted = data.map((d) => ({
        ...d,
        label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(new Date(d.date)),
    }));

    return (
        <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(v: number) =>
                        new Intl.NumberFormat("fr-FR", {
                            notation: "compact",
                            currency,
                            style: "currency",
                            maximumFractionDigits: 0,
                        }).format(v)
                    }
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            formatter={(value) =>
                                new Intl.NumberFormat("fr-FR", {
                                    style: "currency",
                                    currency,
                                    maximumFractionDigits: 0,
                                }).format(Number(value))
                            }
                        />
                    }
                />
                <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                />
            </LineChart>
        </ChartContainer>
    );
}
