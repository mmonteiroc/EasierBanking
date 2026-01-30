import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { calculateSafeToSpend } from '../../utils/safeToSpend';
import { type Transaction } from '../../types/banking';
import { type ManualRecurringRule } from '../../types/recurringRules';
import { Calendar, ShieldCheck, Wallet } from 'lucide-react';
import './DailyPlanning.css';

interface DailyPlanningProps {
    transactions: Transaction[];
    currentBalance: number;
    manualRules?: ManualRecurringRule[];
}

export const DailyPlanning: React.FC<DailyPlanningProps> = ({
    transactions,
    currentBalance,
    manualRules = []
}) => {
    const data = useMemo(() =>
        calculateSafeToSpend(currentBalance, transactions, manualRules, 500)
        , [currentBalance, transactions, manualRules]);

    const chartData = [
        { name: 'Safe to Spend', value: data.safeToSpend, color: '#10b981' },
        { name: 'Reserved for Bills', value: data.reservedForBills, color: '#6366f1' },
        { name: 'Buffer', value: data.buffer, color: '#fbbf24' }
    ];

    return (
        <div className="daily-planning-container">
            <div className="safe-to-spend-card">
                <div className="card-header">
                    <Wallet className="header-icon" />
                    <h3>Safe-to-Spend</h3>
                </div>

                <div className="safe-to-spend-visual">
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="chart-center-text">
                            <span className="currency">CHF</span>
                            <span className="amount">{data.safeToSpend.toFixed(0)}</span>
                            <span className="label">Available Now</span>
                        </div>
                    </div>
                </div>

                <div className="safe-to-spend-stats">
                    <div className="stat-row highlight">
                        <div className="stat-info">
                            <Calendar size={18} />
                            <span>Next Payday in</span>
                        </div>
                        <span className="stat-value">{data.daysUntilPayday} days</span>
                    </div>
                    <div className="stat-row">
                        <div className="stat-info">
                            <ShieldCheck size={18} />
                            <span>Reserved for bills</span>
                        </div>
                        <span className="stat-value">CHF {data.reservedForBills.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="planning-details">
                <div className="detail-card">
                    <h4>Burn-Aware Strategy</h4>
                    <p>
                        Your Safe-to-Spend balance is calculated by subtracting all predicted bills
                        until your next payday, plus a <strong>CHF {data.buffer} safety buffer</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
};
