export interface ManualRecurringRule {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    descriptionPattern: string; // Pattern to match (e.g., "girlfriend name", "salary")
    category?: string; // Optional category filter

    // Timing constraints
    dayRangeStart?: number; // Day of month (1-31), optional
    dayRangeEnd?: number; // Day of month (1-31), optional
    intervalDays?: number; // Expected interval in days (e.g., 30 for monthly)

    // Amount constraints
    expectedAmount?: number; // Expected amount
    amountTolerance?: number; // Tolerance as percentage (e.g., 0.1 for 10%)

    // Behavior
    useAverage: boolean; // Use average of matched transactions
    enabled: boolean;
    isExclude?: boolean; // If true, these transactions should NOT be considered recurring

    // Metadata
    createdAt: string;
    notes?: string;
}

export interface RecurringRuleMatch {
    rule: ManualRecurringRule;
    matchedTransactionIds: string[];
    averageAmount: number;
    averageInterval: number;
    lastOccurrence: string;
}
