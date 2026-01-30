import { useState, useEffect } from 'react';

const STORAGE_KEY_SESSIONS = 'banking_viewer_sessions';
const STORAGE_KEY_ACTIVE = 'banking_viewer_active_session';

export interface Session {
    id: string;
    name: string;
    createdAt: number;
}

export function useSession() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from storage on mount
    useEffect(() => {
        const storedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
        const storedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);

        if (storedSessions) {
            const parsed = JSON.parse(storedSessions);
            setSessions(parsed);

            if (storedActive) {
                const found = parsed.find((s: Session) => s.id === storedActive);
                if (found) setActiveSession(found);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save to storage whenever changes occur
    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
        if (activeSession) {
            localStorage.setItem(STORAGE_KEY_ACTIVE, activeSession.id);
        } else {
            localStorage.removeItem(STORAGE_KEY_ACTIVE);
        }
    }, [sessions, activeSession, isInitialized]);

    const createSession = (name: string) => {
        const newSession: Session = {
            id: crypto.randomUUID(),
            name,
            createdAt: Date.now()
        };
        setSessions(prev => [...prev, newSession]);
        setActiveSession(newSession);
        return newSession;
    };

    const switchSession = (sessionId: string) => {
        if (!sessionId) {
            setActiveSession(null);
            return;
        }
        const found = sessions.find(s => s.id === sessionId);
        if (found) setActiveSession(found);
    };

    const removeSession = (sessionId: string) => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSession?.id === sessionId) {
            setActiveSession(null);
        }
    };

    return {
        sessions,
        activeSession,
        createSession,
        switchSession,
        removeSession,
        isInitialized
    };
}
