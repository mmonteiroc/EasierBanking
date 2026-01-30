import React, { type ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, User, LogOut, Trash2, Upload, Settings } from 'lucide-react';
import './Layout.css';

interface LayoutProps {
    children: ReactNode;
    showNavigation?: boolean;
    activeSession?: { name: string } | null;
    onSwitchProfile?: () => void;
    onEraseData?: () => void;
    onImportFiles?: () => void;
    onManageRules?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
    children,
    showNavigation = false,
    activeSession,
    onSwitchProfile,
    onEraseData,
    onImportFiles,
    onManageRules
}) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const isAdvancedAnalytics = location.pathname === '/advanced-analytics';

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-logo">
                    <div className="logo-icon"></div>
                    <h1>BankingViewer</h1>
                </div>

                {/* Navigation Menu */}
                {showNavigation && (
                    <nav className="header-navigation">
                        <Link
                            to="/"
                            className={`nav-link ${!isAdvancedAnalytics ? 'active' : ''}`}
                        >
                            <TrendingUp size={18} />
                            Dashboard
                        </Link>
                        <Link
                            to="/advanced-analytics"
                            className={`nav-link ${isAdvancedAnalytics ? 'active' : ''}`}
                        >
                            <TrendingUp size={18} />
                            Advanced Analytics
                        </Link>
                    </nav>
                )}

                <div className="header-actions">
                    {/* Manage Rules Button */}
                    {activeSession && onManageRules && (
                        <button
                            className="header-action-button"
                            onClick={onManageRules}
                            aria-label="Manage Rules"
                        >
                            <Settings size={18} />
                            <span className="action-label">Manage Rules</span>
                        </button>
                    )}

                    {activeSession && (
                        <div className="user-menu-container" ref={menuRef}>
                            <button
                                className="user-avatar"
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                aria-label="User menu"
                            >
                                <User size={20} />
                            </button>

                            {showUserMenu && (
                                <div className="user-dropdown">
                                    <div className="user-dropdown-header">
                                        <div className="user-initials">
                                            {getInitials(activeSession.name)}
                                        </div>
                                        <div className="user-info">
                                            <div className="user-name">{activeSession.name}</div>
                                            <div className="user-label">Active Profile</div>
                                        </div>
                                    </div>
                                    <div className="user-dropdown-divider"></div>
                                    {onImportFiles && (
                                        <button
                                            className="user-dropdown-item"
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                onImportFiles();
                                            }}
                                        >
                                            <Upload size={16} />
                                            Import Files
                                        </button>
                                    )}
                                    <button
                                        className="user-dropdown-item"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            onSwitchProfile?.();
                                        }}
                                    >
                                        <LogOut size={16} />
                                        Switch Profile
                                    </button>
                                    <button
                                        className="user-dropdown-item danger"
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to erase all data for "${activeSession.name}"? This action cannot be undone.`)) {
                                                setShowUserMenu(false);
                                                onEraseData?.();
                                            }
                                        }}
                                    >
                                        <Trash2 size={16} />
                                        Erase Data
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {!activeSession && (
                        <div className="user-avatar">
                            <User size={20} />
                        </div>
                    )}
                </div>
            </header>
            <main className="app-main">
                {children}
            </main>
        </div>
    );
};
