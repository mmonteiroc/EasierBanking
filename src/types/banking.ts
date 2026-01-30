export interface Transaction {
    id: string; // Unique ID (generated or from transaction no)
    tradeDate: string; // "Trade date"
    bookingDate: string; // "Booking date"
    valueDate: string; // "Value date"
    description: string; // Combined Description1 + Description2 + Description3
    amount: number; // Derived from Debit or Credit
    type: 'DEBIT' | 'CREDIT';
    balance: number;
    category: string; // Inferred or default
}

export interface BankStatement {
    id: string;
    accountNumber: string;
    iban: string;
    periodFrom: string;
    periodTo: string;
    openingBalance: number;
    closingBalance: number;
    transactions: Transaction[];
}

export interface CategoryRule {
    id: string;
    pattern: string; // Description to match (includes check)
    category: string;
}

export interface CategoryOverride {
    transactionId: string;
    category: string;
}

export interface DashboardData {
    statements: BankStatement[];
    allTransactions: Transaction[];
    totalIncome: number;
    totalExpense: number;
    netChange: number;
    expenseByCategory: { name: string; value: number }[];
}
