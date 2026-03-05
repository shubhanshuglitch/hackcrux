import React from 'react';

export default function Header({ patients }) {
    const redCount = patients.filter(p => p.priority === 'RED').length;
    const yellowCount = patients.filter(p => p.priority === 'YELLOW').length;
    const greenCount = patients.filter(p => p.priority === 'GREEN').length;

    return (
        <header className="header">
            <div className="header-brand">
                <div className="header-logo">🏥</div>
                <div>
                    <div className="header-title">TriageAI</div>
                    <div className="header-subtitle">Emergency Room Intelligence System</div>
                </div>
            </div>

            <div className="header-stats">
                <div className="header-stat">
                    <div className="header-stat-value stat-red">{redCount}</div>
                    <div className="header-stat-label">Critical</div>
                </div>
                <div className="header-stat">
                    <div className="header-stat-value stat-yellow">{yellowCount}</div>
                    <div className="header-stat-label">Urgent</div>
                </div>
                <div className="header-stat">
                    <div className="header-stat-value stat-green">{greenCount}</div>
                    <div className="header-stat-label">Standard</div>
                </div>
            </div>

            <div className="header-status">
                <div className="status-dot"></div>
                AI System Online
            </div>
        </header>
    );
}
