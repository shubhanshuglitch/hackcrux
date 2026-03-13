import React, { useState, useRef, useEffect } from 'react';
import { searchPatients } from '../api/patientApi.js';
import { fetchAnalytics } from '../api/analyticsApi.js';
import BrandMark from './BrandMark.jsx';

export default function Header({ patients, user, onSignOut }) {
    const redCount = patients.filter(p => p.priority === 'RED').length;
    const amberCount = patients.filter(p => p.priority === 'YELLOW').length;
    const greenCount = patients.filter(p => p.priority === 'GREEN').length;
    const total = patients.length;

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchInputRef = useRef(null);
    const debounceRef = useRef(null);

    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const lastSeenRef = useRef(0);

    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showSearch]);

    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const data = await fetchAnalytics();
                const events = data.recentEvents || [];
                setNotifications(events);
                const newCount = events.filter((_, i) => i < events.length - lastSeenRef.current).length;
                if (lastSeenRef.current === 0) {
                    lastSeenRef.current = events.length;
                    setUnreadCount(0);
                } else {
                    setUnreadCount(Math.max(0, events.length - lastSeenRef.current));
                }
            } catch (err) { /* ignore polling errors */ }
        };
        loadNotifications();
        const interval = setInterval(loadNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleOpenNotifications = () => {
        setShowNotifications(!showNotifications);
        if (!showNotifications) {
            setUnreadCount(0);
            lastSeenRef.current = notifications.length;
        }
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) { setSearchResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await searchPatients(query);
                setSearchResults(results);
            } catch (err) { console.error('Search failed:', err); }
            finally { setSearching(false); }
        }, 300);
    };

    const scrollToPatient = (patientId) => {
        const el = document.getElementById(`patient-${patientId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-pulse');
            setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
        }
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const priorityColors = { RED: '#ef4444', YELLOW: '#f59e0b', GREEN: '#10b981' };

    const SearchIcon = () => (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    const BellIcon = () => (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="notif-bell-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffe066" />
                    <stop offset="100%" stopColor="#ffb703" />
                </linearGradient>
            </defs>
            <path d="M12 4.4a4.2 4.2 0 0 1 4.2 4.2v2.15a4.8 4.8 0 0 0 1.36 3.35l.95.99H5.47l.95-.99a4.8 4.8 0 0 0 1.36-3.35V8.6A4.2 4.2 0 0 1 12 4.4Z" fill="url(#notif-bell-grad)" stroke="#b46900" strokeWidth="1.15" strokeLinejoin="round" />
            <path d="M10 18a2 2 0 0 0 4 0" fill="none" stroke="#b46900" strokeWidth="1.45" strokeLinecap="round" />
            <circle cx="15.7" cy="7.1" r="1.35" fill="#ff4d6d" />
        </svg>
    );

    const SignOutIcon = () => (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M13 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );

    return (
        <header className="header-new">
            <div className="header-left">
                <div className="header-logo-badge">
                    <span className="logo-icon"><BrandMark size={62} /></span>
                </div>
                <div className="header-title-wrap">
                    <h1 className="header-title-main">ER TRIAGE SPRINT</h1>
                    <span className="header-tag-chip"><span className="header-live-dot"></span>Clinical Command Center</span>
                </div>
            </div>

            <div className="header-center">
                <div className="queue-stats-card">
                    <div className="queue-stat-group">
                        <span className="queue-total">{total}</span>
                        <span className="queue-total-label">ACTIVE QUEUE</span>
                        <span className="stat-divider"></span>
                    </div>
                    <div className="queue-stats">
                        <span className="stat-dot critical">●</span>
                        <span className="stat-label">{redCount} RED</span>
                        <span className="stat-dot warning">●</span>
                        <span className="stat-label">{amberCount} AMBER</span>
                        <span className="stat-dot success">●</span>
                        <span className="stat-label">{greenCount} GREEN</span>
                    </div>
                </div>
            </div>

            <div className="header-right">
                <button className="header-btn find-btn" onClick={() => setShowSearch(!showSearch)}>
                    <span className="btn-icon"><SearchIcon /></span>
                    Find Patient
                </button>
                <button className="header-btn notif-btn" onClick={handleOpenNotifications}>
                    <span className="btn-icon"><BellIcon /></span>
                    {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>
                <button className="header-btn signout-btn" onClick={onSignOut}>
                    <span className="btn-icon"><SignOutIcon /></span>
                    Sign Out{user ? ` (${user.username || user.fullName || ''})` : ''}
                </button>
            </div>

            {showSearch && (
                <div className="search-overlay" onClick={() => setShowSearch(false)}>
                    <div className="search-modal" onClick={e => e.stopPropagation()}>
                        <div className="search-input-wrapper">
                            <span className="search-icon">🔍</span>
                            <input ref={searchInputRef} className="search-input" type="text"
                                placeholder="Search by name or symptoms..."
                                value={searchQuery} onChange={e => handleSearch(e.target.value)} />
                            {searchQuery && (
                                <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>✕</button>
                            )}
                        </div>
                        <div className="search-results">
                            {searching ? (
                                <div className="search-status">Searching...</div>
                            ) : searchResults.length === 0 && searchQuery ? (
                                <div className="search-status">No patients found</div>
                            ) : (
                                searchResults.map(p => (
                                    <div key={p.id} className="search-result-item" onClick={() => scrollToPatient(p.id)}>
                                        <span className="search-result-priority"
                                            style={{ color: priorityColors[p.priority] || '#6b7c95' }}>●</span>
                                        <div className="search-result-info">
                                            <div className="search-result-name">{p.name || 'Unknown'}</div>
                                            <div className="search-result-detail">
                                                {p.symptoms ? p.symptoms.substring(0, 60) : 'No symptoms'} — {p.priority}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showNotifications && (
                <div className="notif-overlay" onClick={() => setShowNotifications(false)}>
                    <div className="notif-panel" onClick={e => e.stopPropagation()}>
                        <div className="notif-header">
                            <h3>Notifications</h3>
                            <button className="notif-close" onClick={() => setShowNotifications(false)}>✕</button>
                        </div>
                        <div className="notif-list">
                            {notifications.length === 0 ? (
                                <div className="notif-empty">No recent activity</div>
                            ) : notifications.map((ev, i) => (
                                <div key={i} className="notif-item">
                                    <span className="notif-type-badge">{ev.type.replace('_', ' ')}</span>
                                    <div className="notif-content">
                                        <div className="notif-desc">{ev.description || 'Event recorded'}</div>
                                        <div className="notif-meta">
                                            {ev.performedBy && <span>{ev.performedBy}</span>}
                                            <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
