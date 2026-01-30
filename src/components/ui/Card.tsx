import React, { type ReactNode } from 'react';
import './Card.css';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
    return (
        <div className={`glass-card ${className}`}>
            {title && <h3 className="card-title">{title}</h3>}
            {children}
        </div>
    );
};
