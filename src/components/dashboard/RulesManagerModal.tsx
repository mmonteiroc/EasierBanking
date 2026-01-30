import React, { useState } from 'react';
import { type CategoryRule } from '../../types/banking';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';
import './RulesManagerModal.css';

interface RulesManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    rules: CategoryRule[];
    onAddRule: (pattern: string, category: string, isInvestment: boolean) => void;
    onRemoveRule: (id: string) => void;
}

const COMMON_CATEGORIES = [
    'Groceries', 'Transport', 'Dining', 'Subscriptions', 'Income', 'General',
    'Health', 'Shopping', 'Utilities', 'Entertainment', 'Transfer', 'Housing',
    'Investments', 'Savings'
];

export const RulesManagerModal: React.FC<RulesManagerModalProps> = ({
    isOpen,
    onClose,
    rules,
    onAddRule,
    onRemoveRule
}) => {
    const [newPattern, setNewPattern] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [isInvestment, setIsInvestment] = useState(false);

    if (!isOpen) return null;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPattern && newCategory) {
            onAddRule(newPattern, newCategory, isInvestment);
            setNewPattern('');
            setNewCategory('');
            setIsInvestment(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content rules-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Manage Category Rules</h3>
                    <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
                </div>

                <p className="modal-desc">
                    Rules automatically categorize transactions where the description contains the pattern text.
                </p>

                <form onSubmit={handleAdd} className="add-rule-form">
                    <div className="rule-inputs-stacked">
                        <div className="rule-row">
                            <input
                                type="text"
                                placeholder="Description contains..."
                                value={newPattern}
                                onChange={e => setNewPattern(e.target.value)}
                                className="category-input"
                            />
                            <input
                                type="text"
                                placeholder="Category"
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                list="rule-categories-list"
                                className="category-input"
                            />
                        </div>
                        <div className="rule-options">
                            <label className="checkbox-label-sm">
                                <input
                                    type="checkbox"
                                    checked={isInvestment}
                                    onChange={e => setIsInvestment(e.target.checked)}
                                />
                                <span>Is Investment?</span>
                            </label>
                        </div>
                        <datalist id="rule-categories-list">
                            {COMMON_CATEGORIES.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <Button type="submit" size="sm" disabled={!newPattern || !newCategory}>
                        <Plus size={16} /> Add Rule
                    </Button>
                </form>

                <div className="rules-list">
                    {rules.length === 0 ? (
                        <div className="empty-rules">No rules defined yet.</div>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="rule-item">
                                <div className="rule-info">
                                    <span className="rule-pattern">"{rule.pattern}"</span>
                                    <span className="rule-arrow">→</span>
                                    <span className="rule-category">{rule.category}</span>
                                </div>
                                <button
                                    className="delete-rule-btn"
                                    onClick={() => onRemoveRule(rule.id)}
                                    title="Remove Rule"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
