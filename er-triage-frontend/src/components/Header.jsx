import React, { useState, useRef, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { searchPatients } from '../api/patientApi.js';
import { fetchAnalytics } from '../api/analyticsApi.js';
import { API_BASE } from '../api/config.js';

export default function Header({ patients, user, onSignOut, onPatientSearchSelect }) {
    const redCount = patients.filter(p => p.priority === 'RED').length;
    const amberCount = patients.filter(p => p.priority === 'YELLOW').length;
    const greenCount = patients.filter(p => p.priority === 'GREEN').length;
    const total = patients.length;

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchInputRef = useRef(null);
    const searchModalRef = useRef(null);
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
        if (!showSearch) return;

        const handleClickOutside = (event) => {
            if (searchModalRef.current && !searchModalRef.current.contains(event.target)) {
                setShowSearch(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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

    // WebSocket Connection for Real-Time Tasks
    useEffect(() => {
        if (!user || (!user.username && !user.fullName)) return;
        const currentUsername = user.username || user.fullName;

        // Convert http/https to ws/wss
        const wsProtocol = API_BASE.startsWith('https') ? 'wss:' : 'ws:';
        const wsHost = API_BASE.replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}//${wsHost.replace(/\/api$/, '')}/ws`;

        const stompClient = new Client({
            brokerURL: wsUrl,
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('Connected to WebSocket for Task Notifications');
                stompClient.subscribe(`/topic/tasks/${currentUsername}`, (message) => {
                    if (message.body) {
                        const newTask = JSON.parse(message.body);
                        const newEvent = {
                            type: 'NEW_TASK_ASSIGNED',
                            description: `New task assigned to you: ${newTask.title}`,
                            timestamp: new Date().toISOString()
                        };
                        setNotifications(prev => [newEvent, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
            }
        });

        stompClient.activate();

        return () => {
            if (stompClient.active) {
                stompClient.deactivate();
            }
        };
    }, [user]);

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
        } else if (onPatientSearchSelect) {
            onPatientSearchSelect(patientId);
        }
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const priorityColors = { RED: '#ef4444', YELLOW: '#f59e0b', GREEN: '#10b981' };

    const HospitalMark = () => (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="hospital-mark-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#d8f3f6" />
                    <stop offset="100%" stopColor="#a8dbe2" />
                </linearGradient>
            </defs>
            <rect x="3" y="2.6" width="18" height="18.8" rx="5" fill="url(#hospital-mark-grad)" opacity="0.32" />
            <path d="M12 5.8v10.6M6.7 11.1h10.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5.2 7.1a7.6 7.6 0 0 0 0 9.8M18.8 7.1a7.6 7.6 0 0 1 0 9.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        </svg>
    );

    return (
        <header className="header-new">
            <div className="header-left">
                <div className="header-logo-badge">
                    <span className="logo-icon"><HospitalMark /></span>
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
                    <span className="btn-icon">🔍</span>
                    Find Patient
                </button>
                <button className="header-btn notif-btn" onClick={handleOpenNotifications}>
                    <span className="btn-icon">🔔</span>
                    {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>
                <button className="header-btn signout-btn" onClick={onSignOut}>
                    <span className="btn-icon">→</span>
                    Sign Out{user ? ` (${user.username || user.fullName || ''})` : ''}
                </button>
            </div>

            {showSearch && (
                <div className="search-overlay">
                    <div className="search-modal" ref={searchModalRef}>
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
