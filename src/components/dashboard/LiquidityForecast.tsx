import React from 'react';
import type { Transaction } from '../../types/banking';
import {
    detectRecurringTransactions,
    projectLiquidity,
    findLowestLiquidityPoint
} from '../../utils/recurringTransactions';
import { debugRecurringDetection } from '../../utils/debugRecurring';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceDot
} from 'recharts';
import { MultiSelectDropdown } from '../common/MultiSelectDropdown';
import { Bug, ChevronDown, ChevronUp, Plus, Trash2, Power, Settings2 } from 'lucide-react';
import type { ManualRecurringRule } from '../../types/recurringRules';
import { ManualRecurringRuleModal } from './ManualRecurringRuleModal';
import './LiquidityForecast.css';

interface LiquidityForecastProps {
    transactions: Transaction[];
    currentBalance: number;
    manualRules?: ManualRecurringRule[];
    onAddRule?: (rule: Omit<ManualRecurringRule, 'id' | 'createdAt' | 'enabled'>) => void;
    onRemoveRule?: (id: string) => void;
    onToggleRule?: (id: string) => void;
}

export const LiquidityForecast: React.FC<LiquidityForecastProps> = ({
    transactions,
    currentBalance,
    manualRules = [],
    onAddRule,
    onRemoveRule,
    onToggleRule
}) => {
    const [forecastDays, setForecastDays] = React.useState<30 | 60 | 90>(90);
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
    const [showDebugModal, setShowDebugModal] = React.useState(false);
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
    const [isRuleModalOpen, setIsRuleModalOpen] = React.useState(false);
    const [ruleInitialData, setRuleInitialData] = React.useState<Partial<ManualRecurringRule> | undefined>(undefined);

    // Extract all unique categories from transactions
    const allCategories = React.useMemo(() => {
        const categories = new Set<string>();
        transactions.forEach(t => {
            if (t.category) {
                categories.add(t.category);
            }
        });
        return Array.from(categories).sort();
    }, [transactions]);

    const { forecastData, recurringIncomes, recurringExpenses } = React.useMemo(() => {
        // Filter transactions by selected categories (if any)
        const filteredTransactions = selectedCategories.length > 0
            ? transactions.filter(t => t.category && selectedCategories.includes(t.category))
            : transactions;

        // Separate incomes and expenses
        const credits = filteredTransactions.filter(t => t.type === 'CREDIT');
        const debits = filteredTransactions.filter(t => t.type === 'DEBIT');

        // Detect recurring patterns
        const recurringIncomes = detectRecurringTransactions(credits, 2, manualRules);
        const recurringExpenses = detectRecurringTransactions(debits, 2, manualRules);

        // Project liquidity
        const forecast = projectLiquidity(
            currentBalance,
            recurringIncomes,
            recurringExpenses,
            forecastDays
        );

        return {
            forecastData: forecast,
            recurringIncomes,
            recurringExpenses
        };
    }, [transactions, currentBalance, forecastDays, selectedCategories, manualRules]);

    const lowestPoint = React.useMemo(() => {
        return findLowestLiquidityPoint(forecastData);
    }, [forecastData]);

    const chartData = React.useMemo(() => {
        // Sample data for better chart performance (show every 3rd day for 90-day view)
        const sampleRate = forecastDays === 90 ? 3 : forecastDays === 60 ? 2 : 1;
        return forecastData.filter((_, index) => index % sampleRate === 0).map(item => ({
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: item.date,
            balance: item.projectedBalance,
            event: item.event
        }));
    }, [forecastData, forecastDays]);

    const stats = React.useMemo(() => {
        if (forecastData.length === 0) return { start: 0, end: 0, change: 0, lowest: 0 };

        const start = forecastData[0].projectedBalance;
        const end = forecastData[forecastData.length - 1].projectedBalance;
        const change = end - start;
        const lowest = lowestPoint?.projectedBalance || start;

        return { start, end, change, lowest };
    }, [forecastData, lowestPoint]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload[0]) return null;

        const data = payload[0].payload;

        return (
            <div className="liquidity-tooltip">
                <div className="tooltip-date">{formatDate(data.fullDate)}</div>
                <div className="tooltip-balance">
                    <span className="label">Projected Balance:</span>
                    <span className={`value ${data.balance < 0 ? 'negative' : 'positive'}`}>
                        CHF {data.balance.toFixed(2)}
                    </span>
                </div>
                {data.event && (
                    <div className="tooltip-event">
                        <div className={`event-badge ${data.event.type}`}>
                            {data.event.type === 'income' ? '↑' : '↓'} {data.event.type}
                        </div>
                        <div className="event-description">{data.event.description}</div>
                        <div className="event-amount">
                            CHF {data.event.amount.toFixed(2)}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="liquidity-forecast-container">
            <div className="forecast-header">
                <h3>Liquidity Forecast</h3>
                <div className="forecast-controls">
                    <button
                        className={forecastDays === 30 ? 'active' : ''}
                        onClick={() => setForecastDays(30)}
                    >
                        30 Days
                    </button>
                    <button
                        className={forecastDays === 60 ? 'active' : ''}
                        onClick={() => setForecastDays(60)}
                    >
                        60 Days
                    </button>
                    <button
                        className={forecastDays === 90 ? 'active' : ''}
                        onClick={() => setForecastDays(90)}
                    >
                        90 Days
                    </button>
                </div>
            </div>

            {/* Category Filter */}
            <div className="forecast-filter-section">
                <MultiSelectDropdown
                    options={allCategories}
                    selectedOptions={selectedCategories}
                    onChange={setSelectedCategories}
                    placeholder="All categories"
                    label="Filter by Categories"
                />
            </div>

            {/* Recurring Transactions Summary */}
            {(recurringIncomes.length > 0 || recurringExpenses.length > 0) && (
                <div className="recurring-summary">
                    <div className="summary-header">
                        <h4>Recurring Transactions Considered</h4>
                        <span className="summary-count">
                            {recurringIncomes.length + recurringExpenses.length} patterns detected
                        </span>
                    </div>
                    <div className="summary-categories">
                        {recurringIncomes.length > 0 && (
                            <div className="category-group income-group">
                                <div className="group-label">
                                    <span className="group-icon">↑</span>
                                    <span>Recurring Incomes ({recurringIncomes.length})</span>
                                </div>
                                <div className="recurring-list">
                                    {recurringIncomes.map((rt, idx) => (
                                        <div key={idx} className="recurring-item income">
                                            <div className="item-info">
                                                <span className="item-description">{rt.description}</span>
                                                <span className="item-meta">
                                                    {rt.frequency} • CHF {rt.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            {!rt.ruleId && (
                                                <button
                                                    className="item-exclude"
                                                    onClick={() => {
                                                        setRuleInitialData({
                                                            descriptionPattern: rt.description,
                                                            type: 'CREDIT',
                                                            category: rt.category,
                                                            isExclude: true,
                                                            useAverage: false
                                                        });
                                                        setIsRuleModalOpen(true);
                                                    }}
                                                    title="Exclude from forecast"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            {rt.ruleId && <span className="item-badge">Manual</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {recurringExpenses.length > 0 && (
                            <div className="category-group expense-group">
                                <div className="group-label">
                                    <span className="group-icon">↓</span>
                                    <span>Recurring Expenses ({recurringExpenses.length})</span>
                                </div>
                                <div className="recurring-list">
                                    {recurringExpenses.map((rt, idx) => (
                                        <div key={idx} className="recurring-item expense">
                                            <div className="item-info">
                                                <span className="item-description">{rt.description}</span>
                                                <span className="item-meta">
                                                    {rt.frequency} • CHF {rt.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            {!rt.ruleId && (
                                                <button
                                                    className="item-exclude"
                                                    onClick={() => {
                                                        setRuleInitialData({
                                                            descriptionPattern: rt.description,
                                                            type: 'DEBIT',
                                                            category: rt.category,
                                                            isExclude: true,
                                                            useAverage: false
                                                        });
                                                        setIsRuleModalOpen(true);
                                                    }}
                                                    title="Exclude from forecast"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            {rt.ruleId && <span className="item-badge">Manual</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manual Rules Section */}
            {manualRules.length > 0 && (
                <div className="manual-rules-section">
                    <div className="section-header">
                        <h4><Settings2 size={16} /> Active Manual Rules</h4>
                    </div>
                    <div className="rules-grid">
                        {manualRules.map(rule => {
                            const effectiveResult = [...recurringIncomes, ...recurringExpenses].find(r => r.ruleId === rule.id);

                            return (
                                <div key={rule.id} className={`rule-card ${!rule.enabled ? 'disabled' : ''}`}>
                                    <div className="rule-card-header">
                                        <span className="rule-pattern">{rule.descriptionPattern}</span>
                                        <div className="rule-actions">
                                            <button
                                                className="rule-action toggle"
                                                onClick={() => onToggleRule?.(rule.id)}
                                                title={rule.enabled ? 'Disable' : 'Enable'}
                                            >
                                                <Power size={14} />
                                            </button>
                                            <button
                                                className="rule-action delete"
                                                onClick={() => onRemoveRule?.(rule.id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="rule-card-details">
                                        <div className="detail-item">
                                            <span className="detail-label">Type:</span>
                                            <span className={`detail-value ${rule.type === 'CREDIT' ? 'income' : 'expense'}`}>
                                                {rule.type === 'CREDIT' ? 'Income' : 'Expense'}
                                            </span>
                                        </div>
                                        {rule.isExclude ? (
                                            <div className="detail-item">
                                                <span className="detail-label">Status:</span>
                                                <span className="detail-value critical">Excluded</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="detail-item">
                                                    <span className="detail-label">Rule:</span>
                                                    <span className="detail-value">
                                                        {rule.expectedAmount ? `CHF ${rule.expectedAmount.toFixed(2)}` : 'Any amount'}
                                                        {rule.useAverage ? ' (Avg)' : ''}
                                                    </span>
                                                </div>
                                                {effectiveResult && (
                                                    <div className="detail-item effective">
                                                        <span className="detail-label">Effective:</span>
                                                        <span className="detail-value highlight">
                                                            CHF {effectiveResult.amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {(rule.dayRangeStart || rule.dayRangeEnd) && (
                                            <div className="detail-item">
                                                <span className="detail-label">Days:</span>
                                                <span className="detail-value">
                                                    {rule.dayRangeStart || 1} to {rule.dayRangeEnd || 31}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="forecast-stats">
                <div className="stat-card">
                    <span className="stat-label">Current Balance</span>
                    <span className="stat-value current">CHF {stats.start.toFixed(2)}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Projected ({forecastDays}d)</span>
                    <span className={`stat-value ${stats.change >= 0 ? 'positive' : 'negative'}`}>
                        CHF {stats.end.toFixed(2)}
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Net Change</span>
                    <span className={`stat-value ${stats.change >= 0 ? 'positive' : 'negative'}`}>
                        {stats.change >= 0 ? '+' : ''}CHF {stats.change.toFixed(2)}
                    </span>
                </div>
                <div className="stat-card warning">
                    <span className="stat-label">Lowest Point</span>
                    <span className={`stat-value ${stats.lowest < 0 ? 'critical' : 'warning-value'}`}>
                        CHF {stats.lowest.toFixed(2)}
                    </span>
                    {lowestPoint && (
                        <span className="stat-hint">on {formatDate(lowestPoint.date)}</span>
                    )}
                </div>
            </div>

            <div className="chart-section">
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#a1a1aa', fontSize: 11 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'Balance (CHF)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                            y={0}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            label={{ value: 'Zero Balance', fill: '#ef4444', fontSize: 12 }}
                        />
                        {lowestPoint && (
                            <ReferenceDot
                                x={new Date(lowestPoint.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                y={lowestPoint.projectedBalance}
                                r={6}
                                fill="#fbbf24"
                                stroke="#fff"
                                strokeWidth={2}
                            />
                        )}
                        <Area
                            type="stepAfter"
                            dataKey="balance"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fill="url(#balanceGradient)"
                            dot={false}
                            activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="forecast-note">
                <p>
                    <strong>Note:</strong> This forecast is based on recurring transactions only.
                    One-off expenses and discretionary spending are excluded to show your baseline financial health.
                    The forecast automatically handles variable amounts (like salaries) by averaging them, and excludes
                    recurring transactions that haven't appeared in over 2x their expected interval.
                </p>
            </div>

            {/* Debug Button */}
            <div className="forecast-debug-section">
                <button
                    className="debug-button"
                    onClick={() => setShowDebugModal(true)}
                >
                    <Bug size={16} />
                    Debug Recurring Detection
                </button>
            </div>

            {/* Debug Modal */}
            {showDebugModal && (() => {
                const filteredTransactions = selectedCategories.length > 0
                    ? transactions.filter(t => t.category && selectedCategories.includes(t.category))
                    : transactions;

                const credits = filteredTransactions.filter(t => t.type === 'CREDIT');
                const debits = filteredTransactions.filter(t => t.type === 'DEBIT');

                const incomeDebug = debugRecurringDetection(credits, 2);
                const expenseDebug = debugRecurringDetection(debits, 2);

                const toggleGroup = (groupId: string) => {
                    const newExpanded = new Set(expandedGroups);
                    if (newExpanded.has(groupId)) {
                        newExpanded.delete(groupId);
                    } else {
                        newExpanded.add(groupId);
                    }
                    setExpandedGroups(newExpanded);
                };

                return (
                    <div className="debug-modal-overlay" onClick={() => setShowDebugModal(false)}>
                        <div className="debug-modal-content" onClick={e => e.stopPropagation()}>
                            <div className="debug-modal-header">
                                <h3><Bug size={20} /> Recurring Transaction Debug</h3>
                                <button
                                    className="debug-modal-close"
                                    onClick={() => setShowDebugModal(false)}
                                >
                                    ×
                                </button>
                            </div>

                            <div className="debug-modal-body">
                                <div className="debug-info">
                                    <p><strong>Detection Criteria:</strong></p>
                                    <ul>
                                        <li>Minimum occurrences: 2</li>
                                        <li>Interval consistency: Within 20% variance</li>
                                        <li>Staleness threshold: 2x the average interval</li>
                                    </ul>
                                </div>

                                {/* Income Groups */}
                                <div className="debug-section">
                                    <h4 className="debug-section-title income">
                                        Income Transactions ({incomeDebug.length} groups)
                                    </h4>
                                    {incomeDebug.map((group, idx) => {
                                        const groupId = `income-${idx}`;
                                        const isExpanded = expandedGroups.has(groupId);
                                        const isDetected = group.reason.startsWith('✓');

                                        return (
                                            <div key={groupId} className={`debug-group ${isDetected ? 'detected' : 'not-detected'}`}>
                                                <div className="debug-group-header" onClick={() => toggleGroup(groupId)}>
                                                    <div className="debug-group-info">
                                                        <span className="debug-group-name">{group.originalDescription}</span>
                                                        <span className="debug-group-count">{group.count} occurrences</span>
                                                    </div>
                                                    <div className="debug-group-status">
                                                        <span className={`debug-status ${isDetected ? 'success' : 'warning'}`}>
                                                            {group.reason}
                                                        </span>
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="debug-group-details">
                                                        <div className="debug-group-actions">
                                                            <button
                                                                className="action-button add-rule-button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRuleInitialData({
                                                                        descriptionPattern: group.originalDescription,
                                                                        type: group.transactions[0].type,
                                                                        category: group.transactions[0].category,
                                                                        expectedAmount: group.transactions[group.transactions.length - 1].amount,
                                                                        useAverage: true
                                                                    });
                                                                    setIsRuleModalOpen(true);
                                                                }}
                                                            >
                                                                <Plus size={14} /> Add as Recurring Rule
                                                            </button>
                                                            <button
                                                                className="action-button exclude-button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRuleInitialData({
                                                                        descriptionPattern: group.originalDescription,
                                                                        type: group.transactions[0].type,
                                                                        category: group.transactions[0].category,
                                                                        isExclude: true,
                                                                        useAverage: false
                                                                    });
                                                                    setIsRuleModalOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 size={14} /> Exclude
                                                            </button>
                                                        </div>
                                                        <div className="debug-metrics">
                                                            <div className="debug-metric">
                                                                <span className="metric-label">Average Interval:</span>
                                                                <span className="metric-value">{group.avgInterval.toFixed(1)} days</span>
                                                            </div>
                                                            <div className="debug-metric">
                                                                <span className="metric-label">Days Since Last:</span>
                                                                <span className="metric-value">{group.daysSinceLastOccurrence} days</span>
                                                            </div>
                                                            <div className="debug-metric">
                                                                <span className="metric-label">Intervals:</span>
                                                                <span className="metric-value">{group.intervals.join(', ')} days</span>
                                                            </div>
                                                            {group.variance.length > 0 && (
                                                                <div className="debug-metric">
                                                                    <span className="metric-label">Variance:</span>
                                                                    <span className="metric-value">
                                                                        {group.variance.map(v => (v * 100).toFixed(1) + '%').join(', ')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="debug-transactions">
                                                            <strong>Transactions:</strong>
                                                            {group.transactions.map((tx, txIdx) => (
                                                                <div key={txIdx} className="debug-transaction">
                                                                    <span className="tx-date">{tx.tradeDate}</span>
                                                                    <span className="tx-amount">+{tx.amount.toFixed(2)}</span>
                                                                    <span className="tx-category">{tx.category}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Expense Groups */}
                                <div className="debug-section">
                                    <h4 className="debug-section-title expense">
                                        Expense Transactions ({expenseDebug.length} groups)
                                    </h4>
                                    {expenseDebug.map((group, idx) => {
                                        const groupId = `expense-${idx}`;
                                        const isExpanded = expandedGroups.has(groupId);
                                        const isDetected = group.reason.startsWith('✓');

                                        return (
                                            <div key={groupId} className={`debug-group ${isDetected ? 'detected' : 'not-detected'}`}>
                                                <div className="debug-group-header" onClick={() => toggleGroup(groupId)}>
                                                    <div className="debug-group-info">
                                                        <span className="debug-group-name">{group.originalDescription}</span>
                                                        <span className="debug-group-count">{group.count} occurrences</span>
                                                    </div>
                                                    <div className="debug-group-status">
                                                        <span className={`debug-status ${isDetected ? 'success' : 'warning'}`}>
                                                            {group.reason}
                                                        </span>
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="debug-group-details">
                                                        <div className="debug-group-actions">
                                                            <button
                                                                className="action-button add-rule-button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRuleInitialData({
                                                                        descriptionPattern: group.originalDescription,
                                                                        type: group.transactions[0].type,
                                                                        category: group.transactions[0].category,
                                                                        expectedAmount: group.transactions[group.transactions.length - 1].amount,
                                                                        useAverage: true
                                                                    });
                                                                    setIsRuleModalOpen(true);
                                                                }}
                                                            >
                                                                <Plus size={14} /> Add as Recurring Rule
                                                            </button>
                                                            <button
                                                                className="action-button exclude-button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRuleInitialData({
                                                                        descriptionPattern: group.originalDescription,
                                                                        type: group.transactions[0].type,
                                                                        category: group.transactions[0].category,
                                                                        isExclude: true,
                                                                        useAverage: false
                                                                    });
                                                                    setIsRuleModalOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 size={14} /> Exclude
                                                            </button>
                                                        </div>
                                                        <div className="debug-metrics">
                                                            <div className="debug-metric">
                                                                <span className="metric-label">Average Interval:</span>
                                                                <span className="metric-value">{group.avgInterval.toFixed(1)} days</span>
                                                            </div>
                                                            <div className="debug-metric">
                                                                <span className="metric-label">Days Since Last:</span>
                                                                <span className="metric-value">{group.daysSinceLastOccurrence} days</span>
                                                            </div>
                                                            <div className="debug-metric">
                                                                <span className="metric-label">Intervals:</span>
                                                                <span className="metric-value">{group.intervals.join(', ')} days</span>
                                                            </div>
                                                            {group.variance.length > 0 && (
                                                                <div className="debug-metric">
                                                                    <span className="metric-label">Variance:</span>
                                                                    <span className="metric-value">
                                                                        {group.variance.map(v => (v * 100).toFixed(1) + '%').join(', ')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="debug-transactions">
                                                            <strong>Transactions:</strong>
                                                            {group.transactions.map((tx, txIdx) => (
                                                                <div key={txIdx} className="debug-transaction">
                                                                    <span className="tx-date">{tx.tradeDate}</span>
                                                                    <span className="tx-amount">-{tx.amount.toFixed(2)}</span>
                                                                    <span className="tx-category">{tx.category}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <ManualRecurringRuleModal
                isOpen={isRuleModalOpen}
                onClose={() => {
                    setIsRuleModalOpen(false);
                    setRuleInitialData(undefined);
                }}
                onSave={(rule) => {
                    onAddRule?.(rule);
                    setIsRuleModalOpen(false);
                    setRuleInitialData(undefined);
                    // Also close the debug modal to show the update
                    setShowDebugModal(false);
                }}
                initialData={ruleInitialData}
            />
        </div>
    );
};
