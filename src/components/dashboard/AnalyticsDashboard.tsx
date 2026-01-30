import React from 'react';
import { type BankStatement, type Transaction } from '../../types/banking';
import { TransactionTable } from './TransactionTable';
import { ExpenseChart } from './ExpenseChart';
import { DailyActivityChart } from './DailyActivityChart';
import { DateRangePicker } from './DateRangePicker';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
    statements: BankStatement[];
    onCategoryUpdate?: (transaction: Transaction, newCategory: string, applyToSimilar: boolean, isInvestment: boolean) => void;
    investmentCategories?: string[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    statements,
    onCategoryUpdate,
    investmentCategories = []
}) => {
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');

    const availableRange = React.useMemo(() => {
        if (statements.length === 0) return { min: '', max: '' };
        const allDates = statements.flatMap(s => s.transactions.map(t => t.tradeDate));
        if (allDates.length === 0) return { min: '', max: '' };
        const sorted = [...allDates].sort();
        return { min: sorted[0], max: sorted[sorted.length - 1] };
    }, [statements]);

    // Initialize dates if not set
    React.useEffect(() => {
        if (availableRange.min && !startDate) {
            setStartDate(availableRange.min);
        }
        if (availableRange.max && !endDate) {
            setEndDate(availableRange.max);
        }
    }, [availableRange]);

    const allTransactions = React.useMemo(() => {
        return statements.flatMap(s => s.transactions)
            .filter(t => {
                if (!startDate && !endDate) return true;
                const date = t.tradeDate;
                if (startDate && date < startDate) return false;
                if (endDate && date > endDate) return false;
                return true;
            })
            .sort((a, b) => {
                return new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime();
            });
    }, [statements, startDate, endDate]);

    const stats = React.useMemo(() => {
        let income = 0;
        let expense = 0;
        let investments = 0;

        allTransactions.forEach(t => {
            if (t.type === 'CREDIT') {
                income += t.amount;
            } else {
                if (investmentCategories.includes(t.category)) {
                    investments += t.amount;
                } else {
                    expense += t.amount;
                }
            }
        });
        return { income, expense, investments, net: income - expense - investments };
    }, [allTransactions, investmentCategories]);

    const dailyStats = React.useMemo(() => {
        const statsMap = new Map<string, { expense: number, investment: number, income: number, balance: number }>();

        // Process in chronological order for balance and cumulative investment tracking
        const chronological = [...allTransactions].sort((a, b) =>
            new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
        );

        chronological.forEach(t => {
            const current = statsMap.get(t.tradeDate) || { expense: 0, investment: 0, income: 0, balance: 0 };

            if (t.type === 'DEBIT') {
                if (investmentCategories.includes(t.category)) {
                    current.investment += t.amount;
                } else {
                    current.expense += t.amount;
                }
            } else if (t.type === 'CREDIT') {
                current.income += t.amount;
            }

            // Balance is raw from bank
            current.balance = t.balance;

            statsMap.set(t.tradeDate, current);
        });

        return Array.from(statsMap.entries()).map(([date, val]) => ({
            date,
            expense: val.expense,
            investment: val.investment,
            income: val.income,
            balance: val.balance
        }));
    }, [allTransactions, investmentCategories]);

    return (
        <div className="analytics-dashboard">
            <div className="dashboard-filters">
                <div className="filters-label">
                    <h2>Insights</h2>
                    <p>{allTransactions.length} transactions in range</p>
                </div>
                <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onReset={() => {
                        setStartDate(availableRange.min);
                        setEndDate(availableRange.max);
                    }}
                    minDate={availableRange.min}
                    maxDate={availableRange.max}
                />
            </div>

            <div className="dashboard-summary-section">
                <div className="expense-chart-wrapper">
                    <ExpenseChart transactions={allTransactions} />
                </div>
                <div className="stats-summary-card">
                    <h3>Financial Summary</h3>
                    <div className="summary-row">
                        <div className="summary-item">
                            <span className="label">Total Income</span>
                            <span className="value text-success">+ {stats.income.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Total Expenses</span>
                            <span className="value text-danger">- {stats.expense.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="summary-divider" />
                    <div className="summary-row highlight">
                        <div className="summary-item">
                            <span className="label">Net Change</span>
                            <span className="value net-value">
                                <span className={stats.net >= 0 ? 'text-success' : 'text-danger'}>
                                    {stats.net >= 0 ? '+' : ''}{stats.net.toFixed(2)}
                                </span>
                            </span>
                        </div>
                    </div>
                    {stats.investments > 0 && (
                        <div className="investment-note">
                            <span className="label">Investments (excluded from exp)</span>
                            <span className="value text-warning">{stats.investments.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="chart-full-width">
                <DailyActivityChart data={dailyStats} />
            </div>

            <div className="transactions-section">
                <h3>Detailed Transactions</h3>
                <TransactionTable
                    transactions={allTransactions}
                    onCategoryUpdate={onCategoryUpdate}
                    isInvestmentCategory={(cat) => investmentCategories?.includes(cat) || false}
                />
            </div>
        </div>
    );
};
