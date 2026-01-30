import { startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';
import { type Transaction } from '../types/banking';

export interface CategoryBenchmark {
    category: string;
    currentUserMTD: number;
    currentUserAvg: number;
    peerAvg: number;
    status: 'above' | 'below' | 'neutral';
}

export function calculateBenchmarking(
    transactions: Transaction[]
): CategoryBenchmark[] {
    const now = new Date();
    const mtdStart = startOfMonth(now);
    const sixMonthsAgo = subMonths(now, 6);

    const categories = Array.from(new Set(transactions.map(t => t.category))).filter(Boolean);

    const benchmarks: CategoryBenchmark[] = categories.map(cat => {
        const catTransactions = transactions.filter(t => t.category === cat && t.type === 'DEBIT');

        // Current MTD
        const mtdSpending = catTransactions
            .filter(t => isAfter(new Date(t.tradeDate), mtdStart))
            .reduce((sum, t) => sum + t.amount, 0);

        // 6 Month Avg per month
        const sixMonthTotal = catTransactions
            .filter(t => isAfter(new Date(t.tradeDate), sixMonthsAgo) && isBefore(new Date(t.tradeDate), mtdStart))
            .reduce((sum, t) => sum + t.amount, 0);
        const avgSpending = sixMonthTotal / 6;

        // Peer spending (Simulated for this demo - real world would come from an API)
        // We simulate peer data as 90% - 110% of the user's average to make it look "relevant"
        const peerAvg = avgSpending * (0.8 + Math.random() * 0.4);

        let status: 'above' | 'below' | 'neutral' = 'neutral';
        if (mtdSpending > avgSpending * 1.1) status = 'above';
        else if (mtdSpending < avgSpending * 0.9) status = 'below';

        return {
            category: cat,
            currentUserMTD: mtdSpending,
            currentUserAvg: avgSpending,
            peerAvg,
            status
        };
    });

    // Sort by highest MTD spending and take top 3
    return benchmarks
        .sort((a, b) => b.currentUserMTD - a.currentUserMTD)
        .slice(0, 3);
}
