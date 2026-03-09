import React, { useState, useEffect } from 'react';
import { fetchAnalytics, exportPatientsCsv } from '../api/analyticsApi.js';

export default function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const stats = await fetchAnalytics();
            setData(stats);
            setError('');
        } catch (err) {
            setError('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAnalytics(); }, []);

    if (loading) return <div className="analytics-loading">Loading analytics...</div>;
    if (error) return <div className="analytics-error">{error}</div>;
    if (!data) return null;

    const priorityColors = { RED: '#ef4444', YELLOW: '#f59e0b', GREEN: '#10b981' };
    const priorityBreakdown = data.priorityBreakdown || {};
    const eventBreakdown = data.eventBreakdown || {};
    const total = data.totalPatients || 0;

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <h2>📊 ER Analytics Dashboard</h2>
                <div className="analytics-actions">
                    <button className="analytics-refresh" onClick={() => exportPatientsCsv().catch(console.error)}>
                        📥 Export CSV
                    </button>
                    <button className="analytics-refresh" onClick={loadAnalytics}>↻ Refresh</button>
                </div>
            </div>

            <div className="analytics-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-value">{data.totalPatients}</div>
                    <div className="kpi-label">Total Patients</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-value">{data.patientsToday}</div>
                    <div className="kpi-label">Today's Intake</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-value">{data.discharges}</div>
                    <div className="kpi-label">Discharges</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-value">{data.handoffs}</div>
                    <div className="kpi-label">Handoffs</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-value">{data.averageAge || '—'}</div>
                    <div className="kpi-label">Avg. Age</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-value">{data.totalEvents}</div>
                    <div className="kpi-label">Total Events</div>
                </div>
            </div>

            <div className="analytics-charts-row">
                <div className="analytics-chart-card">
                    <h3>Priority Distribution</h3>
                    {total === 0 ? (
                        <div className="chart-empty">No patients yet</div>
                    ) : (
                        <div className="priority-bars">
                            {['RED', 'YELLOW', 'GREEN'].map(level => {
                                const count = priorityBreakdown[level] || 0;
                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                return (
                                    <div key={level} className="priority-bar-row">
                                        <span className="bar-label" style={{ color: priorityColors[level] }}>
                                            ● {level}
                                        </span>
                                        <div className="bar-track">
                                            <div className="bar-fill"
                                                style={{ width: `${pct}%`, background: priorityColors[level] }} />
                                        </div>
                                        <span className="bar-value">{count} ({pct}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="analytics-chart-card">
                    <h3>Event Types</h3>
                    {Object.keys(eventBreakdown).length === 0 ? (
                        <div className="chart-empty">No events recorded</div>
                    ) : (
                        <div className="event-list">
                            {Object.entries(eventBreakdown).map(([type, count]) => (
                                <div key={type} className="event-type-row">
                                    <span className="event-type-name">{type.replace('_', ' ')}</span>
                                    <span className="event-type-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="analytics-chart-card full-width">
                <h3>Recent Activity</h3>
                {(data.recentEvents || []).length === 0 ? (
                    <div className="chart-empty">No recent activity</div>
                ) : (
                    <div className="recent-events-list">
                        {data.recentEvents.map((ev, i) => (
                            <div key={i} className="recent-event-row">
                                <span className="event-badge">{ev.type.replace('_', ' ')}</span>
                                <span className="event-desc">{ev.description || '—'}</span>
                                <span className="event-by">{ev.performedBy || 'system'}</span>
                                <span className="event-time">
                                    {new Date(ev.timestamp).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
