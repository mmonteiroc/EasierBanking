import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { type Transaction } from '../../types/banking';
import './ExpenseChart.css';

interface ExpenseChartProps {
    transactions: Transaction[];
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions }) => {
    // Aggregate expenses by category
    const data = React.useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'DEBIT');
        const categoryMap = new Map<string, number>();

        expenses.forEach(t => {
            const current = categoryMap.get(t.category) || 0;
            categoryMap.set(t.category, current + t.amount);
        });

        return Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6', '#a1a1aa'];

    const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);

    return (
        <div className="chart-container">
            <h3>Expenses by Category</h3>
            <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number | undefined) => [`CHF ${(value || 0).toFixed(2)}`, 'Amount']}
                            contentStyle={{ backgroundColor: '#1a1d2d', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                            onMouseEnter={(e: any) => setHoveredCategory(e.value)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            formatter={(value, entry: any) => {
                                const { payload } = entry;
                                const isHovered = value === hoveredCategory;
                                return (
                                    <span style={{
                                        color: isHovered ? '#fff' : '#e5e7eb',
                                        marginLeft: '8px',
                                        fontWeight: isHovered ? 600 : 400,
                                        transition: 'all 0.2s'
                                    }}>
                                        {value}
                                        {isHovered && <span style={{ color: '#fbbf24', marginLeft: '4px' }}>(CHF {payload.value.toFixed(2)})</span>}
                                    </span>
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
