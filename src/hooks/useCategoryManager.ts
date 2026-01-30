import { useState, useEffect, useCallback } from 'react';
import { type Transaction, type CategoryRule, type CategoryOverride } from '../types/banking';

export const useCategoryManager = () => {
    const [rules, setRules] = useState<CategoryRule[]>(() => {
        const saved = localStorage.getItem('categoryRules');
        return saved ? JSON.parse(saved) : [];
    });

    const [overrides, setOverrides] = useState<CategoryOverride[]>(() => {
        const saved = localStorage.getItem('categoryOverrides');
        return saved ? JSON.parse(saved) : [];
    });

    const [investmentCategories, setInvestmentCategories] = useState<string[]>(() => {
        const saved = localStorage.getItem('investmentCategories');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('categoryRules', JSON.stringify(rules));
    }, [rules]);

    useEffect(() => {
        localStorage.setItem('categoryOverrides', JSON.stringify(overrides));
    }, [overrides]);

    useEffect(() => {
        localStorage.setItem('investmentCategories', JSON.stringify(investmentCategories));
    }, [investmentCategories]);

    const addRule = useCallback((pattern: string, category: string) => {
        setRules(prev => {
            // Remove existing rule for same pattern if exists to update it
            const filtered = prev.filter(r => r.pattern.toLowerCase() !== pattern.toLowerCase());
            return [...filtered, { id: Math.random().toString(36).substr(2, 9), pattern, category }];
        });
    }, []);

    const addOverride = useCallback((transactionId: string, category: string) => {
        setOverrides(prev => {
            const filtered = prev.filter(o => o.transactionId !== transactionId);
            return [...filtered, { transactionId, category }];
        });
    }, []);

    const toggleInvestmentCategory = useCallback((category: string, isInvestment: boolean) => {
        setInvestmentCategories(prev => {
            if (isInvestment) {
                return [...new Set([...prev, category])];
            } else {
                return prev.filter(c => c !== category);
            }
        });
    }, []);

    const getEffectiveCategory = useCallback((transaction: Transaction): string => {
        // 1. Check for specific override (Exception)
        const override = overrides.find(o => o.transactionId === transaction.id);
        if (override) return override.category;

        // 2. Check for rule match
        const rule = rules.find(r => transaction.description.toLowerCase().includes(r.pattern.toLowerCase()));
        if (rule) return rule.category;

        // 3. Fallback to original/inferred
        return transaction.category;
    }, [rules, overrides]);

    const reclassifyTransactions = useCallback((transactions: Transaction[]): Transaction[] => {
        return transactions.map(tx => ({
            ...tx,
            category: getEffectiveCategory(tx)
        }));
    }, [getEffectiveCategory]);

    const removeRule = useCallback((id: string) => {
        setRules(prev => prev.filter(r => r.id !== id));
    }, []);

    return {
        rules,
        overrides,
        investmentCategories,
        addRule,
        removeRule,
        addOverride,
        toggleInvestmentCategory,
        getEffectiveCategory,
        reclassifyTransactions
    };
};
