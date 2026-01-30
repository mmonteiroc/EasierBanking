import Papa from 'papaparse';
import { type BankStatement, type Transaction } from '../types/banking';
// Removed unused uuid import

const generateId = () => Math.random().toString(36).substring(2, 9);

export const parseBankCSV = (file: File): Promise<BankStatement> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            complete: (results) => {
                try {
                    const lines = results.data as string[][];

                    // 1. Extract Metadata from the first ~8 lines
                    // The format is "Key;Value;"
                    const getMeta = (keyStartsWith: string): string => {
                        const line = lines.find(l => l[0]?.startsWith(keyStartsWith));
                        return line ? line[1] : '';
                    };

                    const accountNumber = getMeta('Account number');
                    const iban = getMeta('IBAN');
                    const from = getMeta('From');
                    const until = getMeta('Until');
                    const openingBal = parseFloat(getMeta('Opening balance')?.replace(/'/g, '') || '0');
                    const closingBal = parseFloat(getMeta('Closing balance')?.replace(/'/g, '') || '0');

                    // 2. Find the start of the transaction table
                    const headerRowIndex = lines.findIndex(l => l[0] === 'Trade date');
                    if (headerRowIndex === -1) {
                        throw new Error('Transaction table header not found');
                    }

                    // 3. Parse Transactions
                    const transactions: Transaction[] = [];

                    // "Trade date";"Trade time";"Booking date";"Value date";"Currency";"Debit";"Credit";"Individual amount";"Balance";"Transaction no.";"Description1";"Description2";"Description3";"Footnotes";
                    // Indices based on the user provided header list (assuming order):
                    // 0: Trade date, 5: Debit, 6: Credit, 10: Desc1, 11: Desc2, 12: Desc3

                    for (let i = headerRowIndex + 1; i < lines.length; i++) {
                        const row = lines[i];
                        if (!row || row.length < 5) continue; // Skip empty rows

                        const debitStr = row[5]?.replace(/'/g, '') || '0';
                        const creditStr = row[6]?.replace(/'/g, '') || '0';

                        const debit = parseFloat(debitStr) || 0;
                        const credit = parseFloat(creditStr) || 0;

                        if (debit === 0 && credit === 0) continue; // Skip empty transaction rows

                        const amount = Math.abs(credit > 0 ? credit : debit);
                        const type = credit > 0 ? 'CREDIT' : 'DEBIT';

                        // Build Description
                        const description = [row[10], row[11], row[12]].filter(Boolean).join(' ').trim() || 'Unknown Transaction';

                        transactions.push({
                            id: generateId(),
                            tradeDate: row[0],
                            bookingDate: row[2],
                            valueDate: row[3],
                            description,
                            amount,
                            type,
                            balance: parseFloat(row[8]?.replace(/'/g, '') || '0'),
                            category: inferCategory(description)
                        });
                    }

                    resolve({
                        id: generateId(),
                        accountNumber,
                        iban,
                        periodFrom: from,
                        periodTo: until,
                        openingBalance: openingBal,
                        closingBalance: closingBal,
                        transactions
                    });

                } catch (err) {
                    reject(err);
                }
            },
            error: (err) => reject(err),
            skipEmptyLines: true,
            delimiter: ';', // Important based on the user prompt
        });
    });
};

const inferCategory = (desc: string): string => {
    const d = desc.toLowerCase();
    if (d.includes('netflix') || d.includes('spotify') || d.includes('subscription')) return 'Subscriptions';
    if (d.includes('uber') || d.includes('lyft') || d.includes('transport') || d.includes('sbb')) return 'Transport';
    if (d.includes('migros') || d.includes('coop') || d.includes('denner') || d.includes('aldi')) return 'Groceries';
    if (d.includes('restaurant') || d.includes('bar') || d.includes('cafe')) return 'Dining';
    if (d.includes('salary') || d.includes('payroll')) return 'Income';
    return 'General';
};
