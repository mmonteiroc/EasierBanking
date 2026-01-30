import React, { useState } from 'react';
import { type ManualRecurringRule } from '../../types/recurringRules';
import { Button } from '../ui/Button';
import './ManualRecurringRuleModal.css';

interface ManualRecurringRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: Omit<ManualRecurringRule, 'id' | 'createdAt' | 'enabled'>) => void;
    initialData?: Partial<ManualRecurringRule>;
}

export const ManualRecurringRuleModal: React.FC<ManualRecurringRuleModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const [pattern, setPattern] = useState(initialData?.descriptionPattern || '');
    const [type, setType] = useState<'CREDIT' | 'DEBIT'>(initialData?.type || 'DEBIT');
    const [dayStart, setDayStart] = useState<number | ''>(initialData?.dayRangeStart || '');
    const [dayEnd, setDayEnd] = useState<number | ''>(initialData?.dayRangeEnd || '');
    const [expectedAmount, setExpectedAmount] = useState<number | ''>(initialData?.expectedAmount || '');
    const [tolerance, setTolerance] = useState<number>(initialData?.amountTolerance || 0.1);
    const [useAverage, setUseAverage] = useState(initialData?.useAverage ?? true);
    const [isExclude, setIsExclude] = useState(initialData?.isExclude ?? false);
    const [category, setCategory] = useState(initialData?.category || '');
    const [notes, setNotes] = useState(initialData?.notes || '');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            descriptionPattern: pattern,
            type,
            dayRangeStart: dayStart === '' ? undefined : Number(dayStart),
            dayRangeEnd: dayEnd === '' ? undefined : Number(dayEnd),
            expectedAmount: expectedAmount === '' ? undefined : Number(expectedAmount),
            amountTolerance: tolerance,
            useAverage: isExclude ? false : useAverage,
            isExclude,
            category: category || undefined,
            notes: notes || undefined
        });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{initialData?.id ? 'Edit Recurring Rule' : 'New Recurring Rule'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="rule-form">
                    <div className="form-group">
                        <label>Description Pattern (matches transaction description)</label>
                        <input
                            type="text"
                            value={pattern}
                            onChange={e => setPattern(e.target.value)}
                            placeholder="e.g. Salary, Netflix, GF Name"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Transaction Type</label>
                            <select value={type} onChange={e => setType(e.target.value as 'CREDIT' | 'DEBIT')}>
                                <option value="DEBIT">Expense (Debit)</option>
                                <option value="CREDIT">Income (Credit)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Category (Optional)</label>
                            <input
                                type="text"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                placeholder="e.g. Salary, Utilities"
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Timing Constraint (Optional)</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Day of Month (Start)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={dayStart}
                                    onChange={e => setDayStart(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="e.g. 1"
                                />
                            </div>
                            <div className="form-group">
                                <label>Day of Month (End)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={dayEnd}
                                    onChange={e => setDayEnd(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="e.g. 10"
                                />
                            </div>
                        </div>
                        <p className="field-hint">Leave blank to match any day of the month.</p>
                    </div>

                    <div className="form-section">
                        <h4>Amount Constraint (Optional)</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Expected Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={expectedAmount}
                                    onChange={e => setExpectedAmount(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="e.g. 500"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tolerance (%)</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    value={tolerance * 100}
                                    onChange={e => setTolerance(Number(e.target.value) / 100)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={useAverage}
                                onChange={e => setUseAverage(e.target.checked)}
                                disabled={isExclude}
                            />
                            <span className="checkbox-text">
                                Use average of matched transactions
                                <span className="checkbox-hint">If disabled, uses the "Expected Amount" instead.</span>
                            </span>
                        </label>
                    </div>

                    <div className="form-group checkbox-group exclusion-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={isExclude}
                                onChange={e => setIsExclude(e.target.checked)}
                            />
                            <span className="checkbox-text">
                                <span className="critical-text">Exclude from detection</span>
                                <span className="checkbox-hint">If enabled, these transactions will never be considered recurring.</span>
                            </span>
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Why is this recurring?"
                            rows={2}
                        />
                    </div>

                    <div className="modal-actions">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Rule</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
