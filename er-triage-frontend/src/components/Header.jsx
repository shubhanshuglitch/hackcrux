import React from 'react';

export default function Header({ patients }) {
    const redCount = patients.filter(p => p.priority === 'RED').length;
    const yellowCount = patients.filter(p => p.priority === 'YELLOW').length;
    const greenCount = patients.filter(p => p.priority === 'GREEN').length;
    const total = patients.length;

    return (
        <header className="header">
            <div className="header-brand">
                <div className="header-logo-container">
                    <span className="header-logo">🏥</span>
                </div>
                <div className="header-brand-text">
                    <div className="header-title">TriageAI</div>
                    <div className="header-subtitle">Emergency Room Intelligence System</div>
                </div>
            </div>

            <div className="header-stats">
                <div className="header-stat stat-critical">
                    <div className="header-stat-value">{redCount}</div>
                    <div className="header-stat-label">Critical</div>
                </div>
                <div className="header-stat stat-urgent">
                    <div className="header-stat-value">{yellowCount}</div>
                    <div className="header-stat-label">Urgent</div>
                </div>
                <div className="header-stat stat-standard">
                    <div className="header-stat-value">{greenCount}</div>
                    <div className="header-stat-label">Standard</div>
                </div>
                <div className="header-stat stat-total">
                    <div className="header-stat-value">{total}</div>
                    <div className="header-stat-label">Total</div>
                </div>
            </div>

            <div className="header-status">
                <div className="status-indicator">
                    <div className="status-pulse"></div>
                </div>
                AI System Online
            </div>
        </header>
    );
}
