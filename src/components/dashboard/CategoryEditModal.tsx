import React, { useState } from 'react';
import { Button } from '../ui/Button';
import './CategoryEditModal.css';

interface CategoryEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCategory: string;
    isInvestment?: boolean;
    transactionDescription: string;
    onSave: (newCategory: string, applyToSimilar: boolean, isInvestment: boolean) => void;
    isBulkEdit?: boolean;
}

const COMMON_CATEGORIES = [
    'Groceries', 'Transport', 'Dining', 'Subscriptions', 'Income', 'General',
    'Health', 'Shopping', 'Utilities', 'Entertainment', 'Transfer', 'Housing',
    'Investments', 'Savings'
];

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
    isOpen,
    onClose,
    currentCategory,
    isInvestment = false,
    transactionDescription,
    onSave,
    isBulkEdit = false
}) => {
    const [category, setCategory] = useState(currentCategory);
    const [applyToSimilar, setApplyToSimilar] = useState(false);
    const [isInvestmentState, setIsInvestmentState] = useState(isInvestment);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(category, applyToSimilar, isInvestmentState);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>{isBulkEdit ? 'Bulk Edit Category' : 'Edit Category'}</h3>
                <p className="modal-desc">
                    {isBulkEdit ? (
                        <>Applying to: <strong>{transactionDescription}</strong></>
                    ) : (
                        <>For transaction: <strong>{transactionDescription}</strong></>
                    )}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Category</label>
                        <input
                            type="text"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            list="categories-list"
                            className="category-input"
                            autoFocus
                        />
                        <datalist id="categories-list">
                            {COMMON_CATEGORIES.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>

                    {!isBulkEdit && (
                        <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={applyToSimilar}
                                    onChange={e => setApplyToSimilar(e.target.checked)}
                                />
                                <span className="checkbox-text">
                                    Apply to all similar transactions?
                                    <span className="checkbox-hint">Creates a rule for "{transactionDescription}"</span>
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={isInvestmentState}
                                onChange={e => setIsInvestmentState(e.target.checked)}
                            />
                            <span className="checkbox-text">
                                Treat as Investment?
                                <span className="checkbox-hint">Gold color, excluded from expense charts, added to balance.</span>
                            </span>
                        </label>
                    </div>

                    <div className="modal-actions">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

