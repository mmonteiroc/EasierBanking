import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateBenchmarking } from '../../utils/benchmarking';
import { type Transaction } from '../../types/banking';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import './MarketInsights.css';

interface MarketInsightsProps {
    transactions: Transaction[];
}

export const MarketInsights: React.FC<MarketInsightsProps> = ({
    transactions
}) => {
    const benchmarks = useMemo(() => calculateBenchmarking(transactions), [transactions]);

    const chartData = benchmarks.map(b => ({
        category: b.category,
        'MTD Spending': b.currentUserMTD,
        'Personal Avg': b.currentUserAvg,
        'Market Peer': b.peerAvg
    }));

    return (
        <div className="market-insights-container">
            <div className="insights-header">
                <h3>Behavioral Benchmarking</h3>
                <p>Compare your current monthly spending against your history and peer averages.</p>
            </div>

            <div className="benchmarking-charts">
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="category" tick={{ fill: '#a1a1aa' }} />
                        <YAxis tick={{ fill: '#a1a1aa' }} />
                        <Tooltip
                            contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="MTD Spending" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Personal Avg" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Market Peer" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="benchmarking-status">
                {benchmarks.map((b, i) => (
                    <div key={i} className={`status-indicator-card ${b.status}`}>
                        <div className="status-icon">
                            {b.status === 'above' && <TrendingUp className="critical" />}
                            {b.status === 'below' && <TrendingDown className="success" />}
                            {b.status === 'neutral' && <Minus className="neutral" />}
                        </div>
                        <div className="status-info">
                            <span className="category-name">{b.category}</span>
                            <span className="status-message">
                                {b.status === 'above' && 'Scaling up: 10%+ above average'}
                                {b.status === 'below' && 'Optimization: 10%+ below average'}
                                {b.status === 'neutral' && 'Stable: Near normal levels'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="benchmarking-footer">
                <Info size={16} />
                <span>Market Peer data is calculated based on anonymized cohorts with similar income profiles.</span>
            </div>
        </div>
    );
};
