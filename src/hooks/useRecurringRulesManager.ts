import { useState, useEffect, useCallback } from 'react';
import type { ManualRecurringRule } from '../types/recurringRules';

const STORAGE_KEY_PREFIX = 'recurring_rules_';

export const useRecurringRulesManager = (sessionId: string | undefined) => {
    const [rules, setRules] = useState<ManualRecurringRule[]>([]);

    // Load rules when sessionId changes
    useEffect(() => {
        if (!sessionId) {
            setRules([]);
            return;
        }

        const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
        if (saved) {
            try {
                setRules(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse recurring rules', e);
                setRules([]);
            }
        } else {
            setRules([]);
        }
    }, [sessionId]);

    // Save rules when they change
    useEffect(() => {
        if (!sessionId) return;
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(rules));
    }, [rules, sessionId]);

    const addRule = useCallback((rule: Omit<ManualRecurringRule, 'id' | 'createdAt' | 'enabled'>) => {
        const newRule: ManualRecurringRule = {
            ...rule,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            enabled: true
        };
        setRules(prev => [...prev, newRule]);
    }, []);

    const updateRule = useCallback((id: string, updates: Partial<ManualRecurringRule>) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    }, []);

    const removeRule = useCallback((id: string) => {
        setRules(prev => prev.filter(r => r.id !== id));
    }, []);

    const toggleRule = useCallback((id: string) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    }, []);

    return {
        rules,
        addRule,
        updateRule,
        removeRule,
        toggleRule
    };
};
