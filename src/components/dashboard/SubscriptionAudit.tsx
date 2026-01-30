import React from 'react';
import type { Transaction } from '../../types/banking';
import { detectRecurringTransactions, identifySubscriptions, calculateSubscriptionBurnRate } from '../../utils/recurringTransactions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './SubscriptionAudit.css';

interface SubscriptionAuditProps {
    transactions: Transaction[];
    selectedCategories?: string[];
}

export const SubscriptionAudit: React.FC<SubscriptionAuditProps> = ({ transactions, selectedCategories }) => {
    const subscriptionData = React.useMemo(() => {
        // Filter only debit transactions
        const debits = transactions.filter(t => t.type === 'DEBIT');

        // Detect recurring patterns
        const recurring = detectRecurringTransactions(debits, 2); // Min 2 occurrences

        // Filter out housing costs to get subscriptions
        const subscriptions = identifySubscriptions(recurring);

        // Filter by selected categories if provided
        if (selectedCategories && selectedCategories.length > 0) {
            return subscriptions.filter(sub => selectedCategories.includes(sub.category));
        }

        return subscriptions;
    }, [transactions, selectedCategories]);

    const monthlyBurnRate = React.useMemo(() => {
        return calculateSubscriptionBurnRate(subscriptionData);
    }, [subscriptionData]);

    const chartData = React.useMemo(() => {
        return subscriptionData.map(sub => ({
            name: sub.description.length > 25 ? sub.description.substring(0, 25) + '...' : sub.description,
            fullName: sub.description,
            amount: sub.monthlyEquivalent,
            frequency: sub.frequency,
            lastCharged: sub.lastCharged,
            occurrences: sub.occurrences
        }));
    }, [subscriptionData]);

    const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981'];

    const formatFrequency = (freq: string) => {
        const labels: Record<string, string> = {
            'weekly': 'Weekly',
            'bi-weekly': 'Bi-weekly',
            'monthly': 'Monthly',
            'quarterly': 'Quarterly',
            'yearly': 'Yearly'
        };
        return labels[freq] || freq;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="subscription-audit-container">
            <div className="subscription-header">
                <h3>Subscription Audit</h3>
                <div className="burn-rate-badge">
                    <span className="burn-rate-label">Monthly Burn Rate</span>
                    <span className="burn-rate-value">CHF {monthlyBurnRate.toFixed(2)}</span>
                </div>
            </div>

            {subscriptionData.length === 0 ? (
                <div className="no-subscriptions">
                    <p>No recurring subscriptions detected.</p>
                    <p className="hint">Transactions need at least 2 occurrences to be identified as recurring.</p>
                </div>
            ) : (
                <>
                    <div className="chart-section">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    label={{ value: 'Monthly Equivalent (CHF)', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fill: '#e5e7eb', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={140}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1a1d2d',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                    formatter={(value?: number | string, _name?: string, props?: any) => {
                                        const { payload } = props || {};
                                        const displayValue = typeof value === 'number' ? value : 0;
                                        return [
                                            <div key="tooltip-content" style={{ padding: '4px 0' }}>
                                                <div style={{ fontWeight: 600, marginBottom: '8px' }}>{payload?.fullName}</div>
                                                <div style={{ color: '#fbbf24' }}>CHF {displayValue.toFixed(2)}/month</div>
                                                <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '4px' }}>
                                                    {formatFrequency(payload?.frequency)} • {payload?.occurrences} payments
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                                                    Last: {formatDate(payload?.lastCharged)}
                                                </div>
                                            </div>,
                                            ''
                                        ];
                                    }}
                                />
                                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                                    {chartData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="subscription-list">
                        <h4>Subscription Details</h4>
                        <div className="subscription-items">
                            {subscriptionData.map((sub, index) => (
                                <div key={index} className="subscription-item">
                                    <div className="subscription-info">
                                        <div className="subscription-name">{sub.description}</div>
                                        <div className="subscription-meta">
                                            <span className="frequency-tag">{formatFrequency(sub.frequency)}</span>
                                            <span className="occurrences">{sub.occurrences} payments</span>
                                            <span className="last-charged">Last: {formatDate(sub.lastCharged)}</span>
                                        </div>
                                    </div>
                                    <div className="subscription-cost">
                                        <div className="monthly-cost">CHF {sub.monthlyEquivalent.toFixed(2)}/mo</div>
                                        <div className="actual-cost">({sub.amount.toFixed(2)} {sub.frequency})</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
