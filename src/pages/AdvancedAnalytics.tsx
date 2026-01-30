import React, { useMemo, useState } from 'react';
import { type Transaction } from '../types/banking';
import { SubscriptionAudit } from '../components/dashboard/SubscriptionAudit';
import { LiquidityForecast } from '../components/dashboard/LiquidityForecast';
import { DailyPlanning } from '../components/dashboard/DailyPlanning';
import { MarketInsights } from '../components/dashboard/MarketInsights';
import { MultiSelectDropdown } from '../components/common/MultiSelectDropdown';
import type { ManualRecurringRule } from '../types/recurringRules';
import './AdvancedAnalytics.css';

interface AdvancedAnalyticsProps {
    transactions: Transaction[];
    currentBalance: number;
    recurringRules?: ManualRecurringRule[];
    onAddRecurringRule?: (rule: Omit<ManualRecurringRule, 'id' | 'createdAt' | 'enabled'>) => void;
    onRemoveRecurringRule?: (id: string) => void;
    onToggleRecurringRule?: (id: string) => void;
}

type AnalyticsTab = 'subscriptions' | 'liquidity' | 'daily-planning' | 'market-insights';

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
    transactions,
    currentBalance,
    recurringRules = [],
    onAddRecurringRule,
    onRemoveRecurringRule,
    onToggleRecurringRule
}) => {
    // Tab state
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('subscriptions');

    // Extract all unique categories from transactions
    const allCategories = useMemo(() => {
        const categories = new Set<string>();
        transactions.forEach(t => {
            if (t.category) {
                categories.add(t.category);
            }
        });
        return Array.from(categories).sort();
    }, [transactions]);

    // State for selected categories (empty means all categories)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    return (
        <div className="advanced-analytics-page">
            <div className="page-header">
                <h1>Advanced Analytics</h1>
                <p className="page-description">
                    Deep insights into your recurring transactions and future liquidity
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="analytics-tabs">
                <button
                    className={`tab-button ${activeTab === 'subscriptions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('subscriptions')}
                >
                    <span className="tab-icon">📊</span>
                    <span className="tab-label">Subscription Audit</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'liquidity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('liquidity')}
                >
                    <span className="tab-icon">💰</span>
                    <span className="tab-label">Liquidity Forecast</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'daily-planning' ? 'active' : ''}`}
                    onClick={() => setActiveTab('daily-planning')}
                >
                    <span className="tab-icon">📅</span>
                    <span className="tab-label">Daily Planning</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'market-insights' ? 'active' : ''}`}
                    onClick={() => setActiveTab('market-insights')}
                >
                    <span className="tab-icon">💡</span>
                    <span className="tab-label">Market Insights</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="analytics-content">
                {activeTab === 'subscriptions' && (
                    <div className="subscription-audit-section">
                        <div className="section-controls">
                            <MultiSelectDropdown
                                options={allCategories}
                                selectedOptions={selectedCategories}
                                onChange={setSelectedCategories}
                                placeholder="All categories"
                                label="Filter by Categories"
                            />
                        </div>
                        <SubscriptionAudit
                            transactions={transactions}
                            selectedCategories={selectedCategories.length > 0 ? selectedCategories : undefined}
                        />
                    </div>
                )}

                {activeTab === 'liquidity' && (
                    <LiquidityForecast
                        transactions={transactions}
                        currentBalance={currentBalance}
                        manualRules={recurringRules}
                        onAddRule={onAddRecurringRule}
                        onRemoveRule={onRemoveRecurringRule}
                        onToggleRule={onToggleRecurringRule}
                    />
                )}
                {activeTab === 'daily-planning' && (
                    <DailyPlanning
                        transactions={transactions}
                        currentBalance={currentBalance}
                        manualRules={recurringRules}
                    />
                )}
                {activeTab === 'market-insights' && (
                    <MarketInsights
                        transactions={transactions}
                    />
                )}
            </div>
        </div>
    );
};
