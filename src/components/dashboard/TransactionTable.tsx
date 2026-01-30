import React, { useState, useMemo } from 'react';
import { type Transaction } from '../../types/banking';
import { CategoryEditModal } from './CategoryEditModal';
import { Edit2, Search, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import './TransactionTable.css';

interface TransactionTableProps {
    transactions: Transaction[];
    onCategoryUpdate?: (transaction: Transaction, newCategory: string, applyToSimilar: boolean, isInvestment: boolean) => void;
    isInvestmentCategory?: (category: string) => boolean;
}

const ITEMS_PER_PAGE = 100;

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, onCategoryUpdate, isInvestmentCategory }) => {
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isBulkEditing, setIsBulkEditing] = useState(false);

    const filteredTransactions = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return transactions.filter(tx =>
            tx.description.toLowerCase().includes(lowerSearch) ||
            tx.category.toLowerCase().includes(lowerSearch) ||
            tx.amount.toString().includes(lowerSearch)
        );
    }, [transactions, searchTerm]);

    // Reset to page 1 when search term changes
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    const allPageRowsSelected = paginatedTransactions.length > 0 &&
        paginatedTransactions.every(tx => selectedRows.has(tx.id));

    const handleEditClick = (tx: Transaction) => {
        if (onCategoryUpdate) {
            setEditingTx(tx);
        }
    };

    const handleSave = (newCategory: string, applyToSimilar: boolean, isInvestment: boolean) => {
        if (isBulkEditing && onCategoryUpdate && selectedRows.size > 0) {
            // Apply to all selected rows
            const selectedTransactions = transactions.filter(tx => selectedRows.has(tx.id));
            selectedTransactions.forEach(tx => {
                onCategoryUpdate(tx, newCategory, false, isInvestment);
            });
            setSelectedRows(new Set());
            setIsBulkEditing(false);
        } else if (editingTx && onCategoryUpdate) {
            onCategoryUpdate(editingTx, newCategory, applyToSimilar, isInvestment);
            setEditingTx(null);
        }
    };

    const handleRowSelect = (txId: string) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(txId)) {
            newSelected.delete(txId);
        } else {
            newSelected.add(txId);
        }
        setSelectedRows(newSelected);
    };

    const handleSelectAll = () => {
        if (allPageRowsSelected) {
            // Deselect all on current page
            const newSelected = new Set(selectedRows);
            paginatedTransactions.forEach(tx => newSelected.delete(tx.id));
            setSelectedRows(newSelected);
        } else {
            // Select all on current page
            const newSelected = new Set(selectedRows);
            paginatedTransactions.forEach(tx => newSelected.add(tx.id));
            setSelectedRows(newSelected);
        }
    };

    const handleBulkCategoryUpdate = () => {
        if (selectedRows.size > 0) {
            setIsBulkEditing(true);
        }
    };

    return (
        <div className="table-container">
            <div className="table-controls">
                <div className="search-container">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {onCategoryUpdate && (
                    <div className="selection-controls">
                        <button
                            className="select-all-btn"
                            onClick={handleSelectAll}
                            disabled={paginatedTransactions.length === 0}
                        >
                            {allPageRowsSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            {allPageRowsSelected ? 'Deselect All' : 'Select All'}
                        </button>
                        {selectedRows.size > 0 && (
                            <button
                                className="bulk-action-btn"
                                onClick={handleBulkCategoryUpdate}
                            >
                                <Edit2 size={16} />
                                Apply Category to {selectedRows.size} Selected
                            </button>
                        )}
                    </div>
                )}
            </div>

            <table className="transaction-table">
                <thead>
                    <tr>
                        {onCategoryUpdate && <th className="checkbox-column"></th>}
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedTransactions.map((tx) => (
                        <tr
                            key={tx.id}
                            className={selectedRows.has(tx.id) ? 'selected-row' : ''}
                        >
                            {onCategoryUpdate && (
                                <td className="checkbox-cell">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.has(tx.id)}
                                        onChange={() => handleRowSelect(tx.id)}
                                        className="row-checkbox"
                                    />
                                </td>
                            )}
                            <td className="date-cell">{tx.tradeDate}</td>
                            <td className="desc-cell" title={tx.description}>{tx.description}</td>
                            <td>
                                <button
                                    className={`category-tag ${onCategoryUpdate ? 'editable' : ''} ${isInvestmentCategory?.(tx.category) ? 'investment' : ''}`}
                                    onClick={() => handleEditClick(tx)}
                                    title={onCategoryUpdate ? "Click to edit category" : ""}
                                >
                                    {tx.category}
                                    {onCategoryUpdate && <Edit2 size={12} className="edit-icon" />}
                                </button>
                            </td>
                            <td className={`text-right amount-cell ${tx.type === 'DEBIT' ? 'negative' : 'positive'}`}>
                                {tx.type === 'DEBIT' ? '-' : '+'}{tx.amount.toFixed(2)}
                            </td>
                            <td className="text-right balance-cell">{tx.balance.toFixed(2)}</td>
                        </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                        <tr>
                            <td colSpan={onCategoryUpdate ? 6 : 5} className="no-results">
                                No transactions found matching "{searchTerm}"
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {filteredTransactions.length > 0 && totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={18} />
                        Previous
                    </button>

                    <div className="pagination-info">
                        <span className="page-numbers">
                            Page {currentPage} of {totalPages}
                        </span>
                        <span className="item-count">
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                        </span>
                    </div>

                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {(editingTx || isBulkEditing) && (
                <CategoryEditModal
                    isOpen={true}
                    onClose={() => {
                        setEditingTx(null);
                        setIsBulkEditing(false);
                    }}
                    currentCategory={editingTx?.category || ''}
                    isInvestment={editingTx ? isInvestmentCategory?.(editingTx.category) : false}
                    transactionDescription={
                        isBulkEditing
                            ? `${selectedRows.size} selected transactions`
                            : editingTx?.description || ''
                    }
                    onSave={handleSave}
                    isBulkEdit={isBulkEditing}
                />
            )}
        </div>
    );
};
