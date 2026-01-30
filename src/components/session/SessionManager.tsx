import React, { useState } from 'react';
import { type Session } from '../../hooks/useSession';
import { Button } from '../ui/Button';
import { Plus, User, Trash2 } from 'lucide-react';
import './SessionManager.css';

interface SessionManagerProps {
    sessions: Session[];
    activeSession: Session | null;
    onCreateSession: (name: string) => void;
    onSwitchSession: (id: string) => void;
    onRemoveSession: (id: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
    sessions,
    activeSession,
    onCreateSession,
    onSwitchSession,
    onRemoveSession
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim()) {
            onCreateSession(newName.trim());
            setNewName('');
            setIsCreating(false);
        }
    };

    // If no sessions exist, force creation mode
    if (sessions.length === 0 && !isCreating) {
        setIsCreating(true);
    }

    return (
        <div className="session-manager-container">
            <div className="session-card">
                <h2>Select Profile</h2>
                <p className="subtitle">Choose a workspace to load your banking data.</p>

                <div className="sessions-list">
                    {sessions.map(session => (
                        <div key={session.id} className={`session-item ${activeSession?.id === session.id ? 'active' : ''}`}>
                            <button
                                className="session-select-btn"
                                onClick={() => onSwitchSession(session.id)}
                            >
                                <User size={20} />
                                <span>{session.name}</span>
                            </button>
                            <button
                                className="session-delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete session "${session.name}" and all its data?`)) {
                                        onRemoveSession(session.id);
                                    }
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {isCreating ? (
                    <form onSubmit={handleCreate} className="create-session-form">
                        <input
                            type="text"
                            placeholder="Enter profile name (e.g. Personal)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="session-input"
                            autoFocus
                        />
                        <div className="form-actions">
                            {sessions.length > 0 && (
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                            )}
                            <Button type="submit" disabled={!newName.trim()}>Create Profile</Button>
                        </div>
                    </form>
                ) : (
                    <button className="create-session-btn" onClick={() => setIsCreating(true)}>
                        <Plus size={20} />
                        Create New Profile
                    </button>
                )}
            </div>
        </div>
    );
};
