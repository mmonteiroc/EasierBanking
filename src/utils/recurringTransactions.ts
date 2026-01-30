import type { Transaction } from '../types/banking';
import { differenceInDays, parseISO, getDate, lastDayOfMonth, addMonths } from 'date-fns';
import type { ManualRecurringRule } from '../types/recurringRules';

export interface RecurringTransaction {
    description: string;
    category: string;
    amount: number;
    frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
    intervalDays: number;
    lastCharged: string;
    occurrences: number;
    transactionIds: string[];
    isExclude?: boolean;
    ruleId?: string;
}

export interface SubscriptionItem extends RecurringTransaction {
    monthlyEquivalent: number;
}

/**
 * Detects recurring patterns in transactions by analyzing:
 * - Similar descriptions (fuzzy matching)
 * - Regular intervals between transactions
 * - Supports variable amounts (e.g., salary with varying amounts)
 * - Filters out stale recurrences (not seen in 2x their interval)
 * - Incorporates manual recurring rules
 */
export function detectRecurringTransactions(
    transactions: Transaction[],
    minOccurrences: number = 3,
    manualRules: ManualRecurringRule[] = []
): RecurringTransaction[] {
    // 1. Detect manual rules first
    const manualResults = detectManualRecurringTransactions(transactions, manualRules);

    // Get all transaction IDs already covered by manual results to avoid double-counting
    const matchedIds = new Set(manualResults.flatMap(m => m.transactionIds));

    // 2. Perform automatic detection on remaining transactions
    const remainingTransactions = transactions.filter(t => !matchedIds.has(t.id));

    // Sort transactions by date
    const sorted = [...remainingTransactions].sort((a, b) =>
        new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
    );

    // Group by similar description only (to support variable amounts)
    const descriptionGroups = new Map<string, Transaction[]>();

    sorted.forEach(transaction => {
        const normalizedDesc = normalizeDescription(transaction.description);

        if (!descriptionGroups.has(normalizedDesc)) {
            descriptionGroups.set(normalizedDesc, []);
        }
        descriptionGroups.get(normalizedDesc)!.push(transaction);
    });

    const recurring: RecurringTransaction[] = [];
    const now = new Date();

    // Analyze each group for recurring patterns
    descriptionGroups.forEach((txns) => {
        if (txns.length < minOccurrences) return;

        // Calculate intervals between consecutive transactions
        const intervals: number[] = [];
        for (let i = 1; i < txns.length; i++) {
            const days = differenceInDays(
                parseISO(txns[i].tradeDate),
                parseISO(txns[i - 1].tradeDate)
            );
            intervals.push(days);
        }

        // Check if intervals are consistent (within 20% variance)
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.map(i => Math.abs(i - avgInterval) / avgInterval);
        const isConsistent = variance.every(v => v < 0.2); // 20% tolerance

        if (isConsistent && avgInterval > 0) {
            const frequency = determineFrequency(avgInterval);
            const lastTransaction = txns[txns.length - 1];

            // Check if this recurrence is stale (hasn't appeared in 2x its interval)
            const daysSinceLastOccurrence = differenceInDays(now, parseISO(lastTransaction.tradeDate));
            const isStale = daysSinceLastOccurrence > (avgInterval * 2);

            // Skip stale recurrences
            if (isStale) {
                return;
            }

            // Calculate average amount for variable-amount recurrences
            // Use only the last 12 months (or available occurrences) for more accurate projections
            const maxOccurrencesForAverage = 12;
            const recentTransactions = txns.slice(-maxOccurrencesForAverage);
            const amounts = txns.map(t => t.amount);
            const recentAmounts = recentTransactions.map(t => t.amount);

            const avgAmount = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length;
            const amountVariance = Math.max(...amounts) - Math.min(...amounts);
            const hasVariableAmount = amountVariance > (avgAmount * 0.1); // More than 10% variance

            recurring.push({
                description: lastTransaction.description,
                category: lastTransaction.category,
                amount: hasVariableAmount ? avgAmount : lastTransaction.amount,
                frequency,
                intervalDays: Math.round(avgInterval),
                lastCharged: lastTransaction.tradeDate,
                occurrences: txns.length,
                transactionIds: txns.map(t => t.id)
            });
        }
    });

    // Merge manual and automatic results
    // We favor manual rules by placing them first
    // Filter out manual rules that are just exclusions
    const activeManualResults = manualResults.filter(m => !m.isExclude);
    return [...activeManualResults, ...recurring].sort((a, b) => b.amount - a.amount);
}

/**
 * Detects recurring transactions based on manual rules
 */
export function detectManualRecurringTransactions(
    transactions: Transaction[],
    rules: ManualRecurringRule[]
): RecurringTransaction[] {
    const results: RecurringTransaction[] = [];

    rules.filter(r => r.enabled).forEach(rule => {
        // Filter transactions matching the rule
        const matched = transactions.filter(t => {
            // Type check - ensure the rule type matches the transactions we're analyzing
            if (t.type !== rule.type) return false;

            // Description check
            const tDesc = normalizeDescription(t.description);
            const pDesc = normalizeDescription(rule.descriptionPattern);
            if (!tDesc.includes(pDesc) && !t.description.toLowerCase().includes(rule.descriptionPattern.toLowerCase())) {
                return false;
            }

            // Category check
            if (rule.category && t.category !== rule.category) return false;

            // Day range check
            if (rule.dayRangeStart || rule.dayRangeEnd) {
                const day = getDate(parseISO(t.tradeDate));
                if (rule.dayRangeStart && day < rule.dayRangeStart) return false;
                if (rule.dayRangeEnd && day > rule.dayRangeEnd) return false;
            }

            // Amount check
            if (rule.expectedAmount && rule.amountTolerance !== undefined) {
                const diff = Math.abs(t.amount - rule.expectedAmount);
                if (diff > (rule.expectedAmount * rule.amountTolerance)) return false;
            }

            return true;
        });

        if (matched.length === 0) {
            // Case 1: No matches
            // We only add this to the results if the rule's type matches the current transaction context
            // and we have enough info to project (expectedAmount OR intervalDays)
            const transactionsHaveType = transactions.length > 0 ? transactions[0].type === rule.type : true;
            if (transactionsHaveType && (rule.expectedAmount || rule.descriptionPattern)) {
                results.push({
                    description: `Manual: ${rule.descriptionPattern}`,
                    category: rule.category || 'Uncategorized',
                    amount: rule.expectedAmount || 0,
                    frequency: rule.intervalDays ? determineFrequency(rule.intervalDays) : 'monthly',
                    intervalDays: rule.intervalDays || 30,
                    lastCharged: new Date().toISOString(),
                    occurrences: 0,
                    transactionIds: [],
                    ruleId: rule.id
                });
            }
            return;
        }

        // At least 1 match found
        // Sort by date
        matched.sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime());

        const lastTransaction = matched[matched.length - 1];

        // If it's an exclusion, we just return the transaction IDs to be blocked
        // and a special flag so it doesn't show up in results
        if (rule.isExclude) {
            results.push({
                description: `Excluded: ${rule.descriptionPattern}`,
                category: lastTransaction.category,
                amount: 0,
                frequency: 'monthly', // placeholder
                intervalDays: 0,
                lastCharged: lastTransaction.tradeDate,
                occurrences: matched.length,
                transactionIds: matched.map(t => t.id),
                isExclude: true,
                ruleId: rule.id
            });
            return;
        }

        // Calculate average interval
        const intervals: number[] = [];
        for (let i = 1; i < matched.length; i++) {
            intervals.push(differenceInDays(parseISO(matched[i].tradeDate), parseISO(matched[i - 1].tradeDate)));
        }
        const avgInterval = rule.intervalDays || (intervals.length > 0 ? (intervals.reduce((a, b) => a + b, 0) / intervals.length) : 30);

        // Calculate amount to use
        const amounts = matched.map(t => t.amount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

        results.push({
            description: `Manual: ${rule.descriptionPattern}`,
            category: rule.category || lastTransaction.category,
            amount: rule.useAverage ? avgAmount : (rule.expectedAmount || lastTransaction.amount),
            frequency: determineFrequency(avgInterval),
            intervalDays: Math.round(avgInterval),
            lastCharged: lastTransaction.tradeDate,
            occurrences: matched.length,
            transactionIds: matched.map(t => t.id),
            ruleId: rule.id
        });
    });

    return results;
}

/**
 * Filters recurring transactions to identify subscriptions
 * (excludes fixed housing costs like rent/mortgage)
 */
export function identifySubscriptions(
    recurringTransactions: RecurringTransaction[]
): SubscriptionItem[] {
    const housingKeywords = ['rent', 'mortgage', 'miete', 'hypothek', 'lease'];

    return recurringTransactions
        .filter(rt => {
            const desc = rt.description.toLowerCase();
            return !housingKeywords.some(keyword => desc.includes(keyword));
        })
        .map(rt => ({
            ...rt,
            monthlyEquivalent: calculateMonthlyEquivalent(rt.amount, rt.frequency)
        }));
}

/**
 * Calculates the monthly burn rate for all subscriptions
 */
export function calculateSubscriptionBurnRate(subscriptions: SubscriptionItem[]): number {
    return subscriptions.reduce((total, sub) => total + sub.monthlyEquivalent, 0);
}

/**
 * Normalizes description for comparison
 */
function normalizeDescription(description: string): string {
    return description
        .toLowerCase()
        .replace(/\d+/g, '') // Remove numbers
        .replace(/[^\w\s]/g, '') // Remove special chars
        .trim()
        .substring(0, 30); // Take first 30 chars for comparison
}

/**
 * Determines frequency based on average interval in days
 */
function determineFrequency(avgDays: number): RecurringTransaction['frequency'] {
    if (avgDays <= 9) return 'weekly';
    if (avgDays <= 16) return 'bi-weekly';
    if (avgDays <= 35) return 'monthly';
    if (avgDays <= 100) return 'quarterly';
    return 'yearly';
}

/**
 * Converts any frequency to monthly equivalent amount
 */
function calculateMonthlyEquivalent(amount: number, frequency: RecurringTransaction['frequency']): number {
    const multipliers = {
        'weekly': 4.33,
        'bi-weekly': 2.17,
        'monthly': 1,
        'quarterly': 0.33,
        'yearly': 0.083
    };
    return amount * multipliers[frequency];
}

/**
 * Projects future balance based on recurring income and expenses
 */
export interface LiquidityForecast {
    date: string;
    projectedBalance: number;
    event?: {
        type: 'income' | 'expense';
        description: string;
        amount: number;
    };
}

export function projectLiquidity(
    currentBalance: number,
    recurringIncomes: RecurringTransaction[],
    recurringExpenses: RecurringTransaction[],
    daysToProject: number = 90,
    startDate: Date = new Date()
): LiquidityForecast[] {
    const forecast: LiquidityForecast[] = [];
    let balance = currentBalance;

    // Create events for each day (normalized dates yyyy-mm-dd)
    const events = new Map<string, { type: 'income' | 'expense'; description: string; amount: number }[]>();

    // Helper to get normalized date key
    const getDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Project recurring incomes
    recurringIncomes.forEach(income => {
        if (income.ruleId) {
            // Manual rules: project at the end of each month
            let nextDate = lastDayOfMonth(startDate);
            // If the last day of current month is in the past, move to next
            if (nextDate < startDate) {
                nextDate = lastDayOfMonth(addMonths(nextDate, 1));
            }

            while (differenceInDays(nextDate, startDate) <= daysToProject) {
                const dateKey = getDateKey(nextDate);
                if (!events.has(dateKey)) events.set(dateKey, []);
                events.get(dateKey)!.push({
                    type: 'income',
                    description: income.description,
                    amount: income.amount
                });

                // Move to the last day of the next month
                nextDate = lastDayOfMonth(addMonths(nextDate, 1));
            }
        } else {
            // Automatic rules: use interval projection
            const lastDate = parseISO(income.lastCharged);
            let nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + income.intervalDays);

            while (differenceInDays(nextDate, startDate) <= daysToProject) {
                if (nextDate >= startDate) {
                    const dateKey = getDateKey(nextDate);
                    if (!events.has(dateKey)) events.set(dateKey, []);
                    events.get(dateKey)!.push({
                        type: 'income',
                        description: income.description,
                        amount: income.amount
                    });
                }
                nextDate.setDate(nextDate.getDate() + income.intervalDays);
            }
        }
    });

    // Project recurring expenses
    recurringExpenses.forEach(expense => {
        if (expense.ruleId) {
            // Manual rules: project at the end of each month
            let nextDate = lastDayOfMonth(startDate);
            // If the last day of current month is in the past, move to next
            if (nextDate < startDate) {
                nextDate = lastDayOfMonth(addMonths(nextDate, 1));
            }

            while (differenceInDays(nextDate, startDate) <= daysToProject) {
                const dateKey = getDateKey(nextDate);
                if (!events.has(dateKey)) events.set(dateKey, []);
                events.get(dateKey)!.push({
                    type: 'expense',
                    description: expense.description,
                    amount: expense.amount
                });

                // Move to the last day of the next month
                nextDate = lastDayOfMonth(addMonths(nextDate, 1));
            }
        } else {
            // Automatic rules: use interval projection
            const lastDate = parseISO(expense.lastCharged);
            let nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + expense.intervalDays);

            while (differenceInDays(nextDate, startDate) <= daysToProject) {
                if (nextDate >= startDate) {
                    const dateKey = getDateKey(nextDate);
                    if (!events.has(dateKey)) events.set(dateKey, []);
                    events.get(dateKey)!.push({
                        type: 'expense',
                        description: expense.description,
                        amount: expense.amount
                    });
                }
                nextDate.setDate(nextDate.getDate() + expense.intervalDays);
            }
        }
    });

    // Build forecast day by day
    for (let day = 0; day <= daysToProject; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);
        const dateKey = getDateKey(currentDate);

        const dayEvents = events.get(dateKey) || [];

        // Apply all events for this day
        dayEvents.forEach(event => {
            if (event.type === 'income') {
                balance += event.amount;
            } else {
                balance -= event.amount;
            }
        });

        // Record the forecast point
        forecast.push({
            date: dateKey,
            projectedBalance: balance,
            event: dayEvents.length > 0 ? dayEvents[0] : undefined // Show primary event
        });
    }

    return forecast;
}

/**
 * Finds the lowest projected balance point in the forecast
 */
export function findLowestLiquidityPoint(forecast: LiquidityForecast[]): LiquidityForecast | null {
    if (forecast.length === 0) return null;
    return forecast.reduce((lowest, current) =>
        current.projectedBalance < lowest.projectedBalance ? current : lowest
    );
}
