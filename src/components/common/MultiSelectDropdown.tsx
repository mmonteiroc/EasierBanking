import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import './MultiSelectDropdown.css';

interface MultiSelectDropdownProps {
    options: string[];
    selectedOptions: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    label?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    options,
    selectedOptions,
    onChange,
    placeholder = 'Select options...',
    label
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selectedOptions.includes(option)) {
            onChange(selectedOptions.filter(o => o !== option));
        } else {
            onChange([...selectedOptions, option]);
        }
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    const selectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([...options]);
    };

    return (
        <div className="multi-select-container" ref={dropdownRef}>
            {label && <label className="multi-select-label">{label}</label>}
            <div
                className={`multi-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="multi-select-value">
                    {selectedOptions.length === 0 ? (
                        <span className="placeholder">{placeholder}</span>
                    ) : selectedOptions.length === options.length ? (
                        <span className="selected-text">All categories selected</span>
                    ) : (
                        <div className="selected-tags">
                            {selectedOptions.slice(0, 3).map(option => (
                                <span key={option} className="selected-tag">
                                    {option}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOption(option);
                                        }}
                                        className="tag-remove"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            {selectedOptions.length > 3 && (
                                <span className="more-count">+{selectedOptions.length - 3} more</span>
                            )}
                        </div>
                    )}
                </div>
                <ChevronDown size={18} className={`chevron ${isOpen ? 'rotate' : ''}`} />
            </div>

            {isOpen && (
                <div className="multi-select-dropdown">
                    <div className="dropdown-actions">
                        <button onClick={selectAll} className="action-btn">
                            Select All
                        </button>
                        <button onClick={clearAll} className="action-btn">
                            Clear All
                        </button>
                    </div>
                    <div className="dropdown-options">
                        {options.map(option => {
                            const isSelected = selectedOptions.includes(option);
                            return (
                                <div
                                    key={option}
                                    className={`dropdown-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleOption(option)}
                                >
                                    <div className="option-checkbox">
                                        {isSelected && <Check size={14} />}
                                    </div>
                                    <span className="option-label">{option}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
