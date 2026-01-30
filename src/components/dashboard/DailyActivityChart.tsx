import React from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import './DailyActivityChart.css';

interface DailyActivityData {
    date: string;
    expense: number;
    investment: number;
    income: number;
    balance: number;
    balanceTrend?: number;
}

interface DailyActivityChartProps {
    data: DailyActivityData[];
}

export const DailyActivityChart: React.FC<DailyActivityChartProps> = ({ data }) => {
    // Sort data and calculate trend line
    const chartData = React.useMemo(() => {
        // 1. Sort by date
        const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 2. Calculate Linear Regression for Balance
        const n = sorted.length;
        if (n < 2) return sorted;

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        sorted.forEach((item, index) => {
            const x = index;
            const y = item.balance;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return sorted.map((item, index) => ({
            ...item,
            balanceTrend: slope * index + intercept
        }));
    }, [data]);

    const [hiddenSeries, setHiddenSeries] = React.useState<string[]>([]);

    const handleLegendClick = (e: any) => {
        const { dataKey } = e;
        setHiddenSeries(prev =>
            prev.includes(dataKey)
                ? prev.filter(key => key !== dataKey)
                : [...prev, dataKey]
        );
    };

    return (
        <div className="activity-chart-container">
            <h3>Daily Activity & Balance</h3>
            <div className="activity-chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'Amount (CHF)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1a1d2d',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                            formatter={(value: number | undefined) => [value ? `CHF ${value.toFixed(2)}` : '', '']}
                        />
                        <Legend onClick={handleLegendClick} wrapperStyle={{ cursor: 'pointer' }} />
                        <Bar
                            hide={hiddenSeries.includes('income')}
                            yAxisId="left"
                            dataKey="income"
                            name="Income (Credit)"
                            fill="#22c55e"
                            barSize={20}
                            radius={[4, 4, 0, 0]}
                            opacity={0.9}
                        />
                        <Bar
                            hide={hiddenSeries.includes('expense')}
                            yAxisId="left"
                            dataKey="expense"
                            name="Expenses (Debit)"
                            fill="#ef4444"
                            stackId="a"
                            barSize={20}
                            opacity={0.8}
                        />
                        <Bar
                            hide={hiddenSeries.includes('investment')}
                            yAxisId="left"
                            dataKey="investment"
                            name="Investments"
                            fill="#fbbf24"
                            stackId="a"
                            barSize={20}
                            opacity={0.9}
                            radius={[4, 4, 0, 0]}
                        />
                        <Line
                            hide={hiddenSeries.includes('balance')}
                            yAxisId="left"
                            type="monotone"
                            dataKey="balance"
                            name="Account Balance"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={false}
                        />
                        <Line
                            hide={hiddenSeries.includes('balanceTrend')}
                            yAxisId="left"
                            type="linear"
                            dataKey="balanceTrend"
                            name="Balance Trend"
                            stroke="#a5b4fc"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
