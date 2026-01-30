import { differenceInDays, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { type Transaction } from '../types/banking';
import { detectRecurringTransactions } from './recurringTransactions';
import { type ManualRecurringRule } from '../types/recurringRules';

export interface SafeToSpendDetails {
    safeToSpend: number;
    reservedForBills: number;
    daysUntilPayday: number;
    nextPayday: string;
    buffer: number;
    totalBalance: number;
}

export function calculateSafeToSpend(
    currentBalance: number,
    transactions: Transaction[],
    manualRules: ManualRecurringRule[] = [],
    buffer: number = 500
): SafeToSpendDetails {
    const now = new Date();

    // 1. Detect recurring patterns
    const recurringIncomes = detectRecurringTransactions(
        transactions.filter(t => t.type === 'CREDIT'),
        2,
        manualRules
    );
    const recurringExpenses = detectRecurringTransactions(
        transactions.filter(t => t.type === 'DEBIT'),
        2,
        manualRules
    );

    // 2. Find next payday
    // We assume the largest recurring income is the primary payday
    const mainPayday = recurringIncomes.sort((a, b) => b.amount - a.amount)[0];

    let nextPaydayDate = addDays(now, 30); // Default fallback
    if (mainPayday) {
        const lastPayday = parseISO(mainPayday.lastCharged);
        nextPaydayDate = new Date(lastPayday);
        while (isBefore(nextPaydayDate, now)) {
            nextPaydayDate = addDays(nextPaydayDate, mainPayday.intervalDays);
        }
    }

    // 3. Calculate reserved amount (expenses until next payday)
    let reservedForBills = 0;
    recurringExpenses.forEach(expense => {
        const lastDate = parseISO(expense.lastCharged);
        let nextOccurrence = new Date(lastDate);

        // Find the next occurrence after 'now'
        while (isBefore(nextOccurrence, now)) {
            nextOccurrence = addDays(nextOccurrence, expense.intervalDays);
        }

        // If it falls before or on payday, we must reserve for it
        if (!isAfter(nextOccurrence, nextPaydayDate)) {
            reservedForBills += expense.amount;
        }
    });

    const safeToSpend = Math.max(0, currentBalance - reservedForBills - buffer);
    const daysUntilPayday = differenceInDays(nextPaydayDate, now);

    return {
        safeToSpend,
        reservedForBills,
        daysUntilPayday: Math.max(0, daysUntilPayday),
        nextPayday: nextPaydayDate.toISOString(),
        buffer,
        totalBalance: currentBalance
    };
}
