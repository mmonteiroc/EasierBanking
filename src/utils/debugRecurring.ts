import type { Transaction } from '../types/banking';
import { differenceInDays, parseISO } from 'date-fns';

interface DebugGroup {
    normalizedDescription: string;
    originalDescription: string;
    transactions: Transaction[];
    count: number;
    intervals: number[];
    avgInterval: number;
    variance: number[];
    isConsistent: boolean;
    daysSinceLastOccurrence: number;
    isStale: boolean;
    reason: string;
}

/**
 * Debug function to analyze why transactions are or aren't detected as recurring
 */
export function debugRecurringDetection(
    transactions: Transaction[],
    minOccurrences: number = 3
): DebugGroup[] {
    const sorted = [...transactions].sort((a, b) =>
        new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
    );

    const descriptionGroups = new Map<string, Transaction[]>();

    sorted.forEach(transaction => {
        const normalizedDesc = normalizeDescription(transaction.description);

        if (!descriptionGroups.has(normalizedDesc)) {
            descriptionGroups.set(normalizedDesc, []);
        }
        descriptionGroups.get(normalizedDesc)!.push(transaction);
    });

    const debugResults: DebugGroup[] = [];
    const now = new Date();

    descriptionGroups.forEach((txns, normalizedDesc) => {
        // Calculate intervals
        const intervals: number[] = [];
        for (let i = 1; i < txns.length; i++) {
            const days = differenceInDays(
                parseISO(txns[i].tradeDate),
                parseISO(txns[i - 1].tradeDate)
            );
            intervals.push(days);
        }

        const avgInterval = intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;

        const variance = intervals.map(i => Math.abs(i - avgInterval) / avgInterval);
        const isConsistent = variance.every(v => v < 0.2);

        const lastTransaction = txns[txns.length - 1];
        const daysSinceLastOccurrence = differenceInDays(now, parseISO(lastTransaction.tradeDate));
        const isStale = daysSinceLastOccurrence > (avgInterval * 2);

        let reason = '';
        if (txns.length < minOccurrences) {
            reason = `Not enough occurrences (${txns.length} < ${minOccurrences})`;
        } else if (!isConsistent) {
            reason = `Intervals not consistent (variance: ${variance.map(v => (v * 100).toFixed(1) + '%').join(', ')})`;
        } else if (isStale) {
            reason = `Stale - last occurrence ${daysSinceLastOccurrence} days ago (threshold: ${Math.round(avgInterval * 2)} days)`;
        } else {
            reason = '✓ Detected as recurring';
        }

        debugResults.push({
            normalizedDescription: normalizedDesc,
            originalDescription: txns[0].description,
            transactions: txns,
            count: txns.length,
            intervals,
            avgInterval,
            variance,
            isConsistent,
            daysSinceLastOccurrence,
            isStale,
            reason
        });
    });

    // Sort by count descending
    return debugResults.sort((a, b) => b.count - a.count);
}

function normalizeDescription(description: string): string {
    return description
        .toLowerCase()
        .replace(/\d+/g, '') // Remove numbers
        .replace(/[^\w\s]/g, '') // Remove special chars
        .trim()
        .substring(0, 30); // Take first 30 chars for comparison
}
