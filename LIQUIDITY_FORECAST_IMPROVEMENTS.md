# Liquidity Forecast Improvements

## Overview
Enhanced the Liquidity Forecast feature to better handle real-world recurring transaction patterns.

## Changes Made

### 1. **Stale Recurrence Filtering**
- **Problem**: Recurring expenses that have stopped (e.g., a monthly subscription you cancelled) were still being projected into the future.
- **Solution**: The system now checks if a recurring transaction hasn't appeared in **2x its expected interval**. If so, it's considered "stale" and excluded from future projections.
- **Example**: If you had a monthly subscription (30-day interval) and the last charge was 65 days ago, it won't be projected forward.

### 2. **Variable Amount Support**
- **Problem**: Recurring transactions with varying amounts (like salaries, freelance income, or variable utility bills) weren't being detected because the system required exact amount matching.
- **Solution**: 
  - Transactions are now grouped by **description only**, not by description + amount
  - The system calculates the **average amount** for recurring transactions with variable amounts
  - Uses this average for future projections
  - Detects variable amounts when the variance is more than 10% of the average
- **Example**: Your monthly salary from "Acme Corp" varies between CHF 4,800 and CHF 5,200. The system will:
  - Recognize this as a monthly recurring income
  - Use the average (CHF 5,000) for forecasting
  - Project this income monthly into the future

## Technical Details

### Modified Files
1. **`src/utils/recurringTransactions.ts`**
   - Updated `detectRecurringTransactions()` function
   - Changed grouping logic from `description + amount` to `description only`
   - Added staleness check using `2x interval` threshold
   - Added average amount calculation for variable-amount recurrences

2. **`src/components/dashboard/LiquidityForecast.tsx`**
   - Updated the informational note to explain these new features to users

### Key Algorithm Changes

**Before:**
```typescript
// Grouped by: normalized_description + rounded_amount
const key = `${normalizedDesc}|${amountKey}`;
```

**After:**
```typescript
// Grouped by: normalized_description only
const key = normalizedDesc;

// Later, calculate average for variable amounts
const amounts = txns.map(t => t.amount);
const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
const hasVariableAmount = amountVariance > (avgAmount * 0.1);
```

**Staleness Check:**
```typescript
const daysSinceLastOccurrence = differenceInDays(now, parseISO(lastTransaction.tradeDate));
const isStale = daysSinceLastOccurrence > (avgInterval * 2);

if (isStale) {
    return; // Skip this recurrence
}
```

## Benefits

1. **More Accurate Forecasts**: Excludes outdated recurring transactions that are no longer active
2. **Better Income Tracking**: Properly handles variable salaries and freelance income
3. **Flexible Expense Tracking**: Recognizes utility bills and other expenses that vary month-to-month
4. **Cleaner Projections**: Automatically removes cancelled subscriptions and one-time recurring charges

## Examples

### Example 1: Variable Salary
**Transactions:**
- Jan 31: "Salary - Acme Corp" → CHF 4,850
- Feb 28: "Salary - Acme Corp" → CHF 5,100
- Mar 31: "Salary - Acme Corp" → CHF 4,920

**Result:** Detected as monthly recurring income with average amount of CHF 4,957

### Example 2: Cancelled Subscription
**Transactions:**
- Nov 15: "Netflix Subscription" → CHF 15.90
- Dec 15: "Netflix Subscription" → CHF 15.90
- Jan 15: "Netflix Subscription" → CHF 15.90
- (Last charge: Jan 15, today: May 1)

**Result:** Not included in forecast (90 days since last charge > 60 days threshold for monthly subscription)

### Example 3: Active Monthly Expense
**Transactions:**
- Dec 1: "Gym Membership" → CHF 49.00
- Jan 1: "Gym Membership" → CHF 49.00
- Feb 1: "Gym Membership" → CHF 49.00
- (Last charge: Feb 1, today: Feb 20)

**Result:** Included in forecast (19 days since last charge < 60 days threshold)
