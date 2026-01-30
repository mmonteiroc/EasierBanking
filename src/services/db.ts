import { type BankStatement, type Transaction } from '../types/banking';

const DB_NAME = 'BankingViewerDB';
const DB_VERSION = 1;
const STORE_NAME = 'monthlyData';

export interface MonthlyData {
    id: string; // sessionId_YYYY-MM
    sessionId: string;
    month: string; // YYYY-MM
    statements: BankStatement[];
    lastUpdated: number;
}

class DatabaseService {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('sessionId', 'sessionId', { unique: false });
                }
            };
        });
    }

    async saveStatements(sessionId: string, newStatements: BankStatement[]): Promise<void> {
        if (!this.db) await this.init();

        // Group transactions by month

        // Helper to get YYYY-MM from date string
        const getMonth = (dateStr: string) => dateStr.substring(0, 7);

        // We need to be careful. The input assumes the user uploads a FILE.
        // That file might contain multiple months? Usually bank statements are monthly.
        // But CSVs can be anything.
        // Strategy:
        // 1. We will NOT split the statements themselves arbitrarily if they are objects.
        // 2. BUT the requirement says "if I re-import data from a month which already exists, it replaces the whole data for that month".
        // This implies we need to organize data BY MONTH in the DB.

        // Let's iterate all transactions in the new statements and group them.
        // Then we construct "Synthetic" statements for storage?
        // Or do we just store the statements as blobs associated with a month?

        // Better approach:
        // Extract all transactions. Group by Month.
        // For each Month, create a MonthlyData record.
        // Store it.

        const allTransactions = newStatements.flatMap(s => s.transactions);
        const transactionsByMonth = new Map<string, Transaction[]>();

        allTransactions.forEach(t => {
            const month = getMonth(t.tradeDate);
            const existing = transactionsByMonth.get(month) || [];
            existing.push(t);
            transactionsByMonth.set(month, existing);
        });

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            // Function to construct a statement object from transactions for storage
            // We lose the original "id" of the statement file, but that's acceptable for this aggregation model.
            const createSyntheticStatement = (month: string, txs: Transaction[]): BankStatement => ({
                id: `synthetic-${sessionId}-${month}`,
                accountNumber: 'AGGREGATED',
                iban: 'AGGREGATED',
                periodFrom: `${month}-01`,
                periodTo: `${month}-31`, // Approx
                openingBalance: 0, // We can't really track this easily across random CSVs without more logic
                closingBalance: 0,
                transactions: txs
            });

            transactionsByMonth.forEach((txs, month) => {
                const id = `${sessionId}_${month}`;
                const record: MonthlyData = {
                    id,
                    sessionId,
                    month,
                    statements: [createSyntheticStatement(month, txs)],
                    lastUpdated: Date.now()
                };
                store.put(record);
            });
        });
    }

    async loadSessionData(sessionId: string): Promise<BankStatement[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => {
                const records = request.result as MonthlyData[];
                // Flatten all statements from all months
                const allStatements = records.flatMap(r => r.statements);
                resolve(allStatements);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async deleteSessionData(sessionId: string): Promise<void> {
        if (!this.db) await this.init();

        // Delete all records for this session
        // IDB doesn't support "delete where index = x" directly easily without cursor.
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('sessionId');
            const request = index.openKeyCursor(IDBKeyRange.only(sessionId));

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

export const dbService = new DatabaseService();
