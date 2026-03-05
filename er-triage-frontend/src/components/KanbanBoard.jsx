import React, { useState, useEffect, useCallback } from 'react';
import { fetchPatients } from '../api/patientApi.js';
import PatientCard from './PatientCard.jsx';

const POLL_INTERVAL_MS = 4000;

const COLUMNS = [
    {
        key: 'RED',
        icon: '🔴',
        title: 'Critical',
        desc: 'Immediate action required',
        headerClass: 'col-header-red',
        titleClass: 'col-title-red',
        badgeClass: 'badge-red',
        emptyIcon: '✅',
        emptyText: 'No critical patients',
    },
    {
        key: 'YELLOW',
        icon: '🟡',
        title: 'Urgent',
        desc: 'Monitor closely',
        headerClass: 'col-header-yellow',
        titleClass: 'col-title-yellow',
        badgeClass: 'badge-yellow',
        emptyIcon: '👍',
        emptyText: 'No urgent patients',
    },
    {
        key: 'GREEN',
        icon: '🟢',
        title: 'Standard',
        desc: 'Safe to wait',
        headerClass: 'col-header-green',
        titleClass: 'col-title-green',
        badgeClass: 'badge-green',
        emptyIcon: '🏥',
        emptyText: 'No standard patients',
    },
];

export default function KanbanBoard({ newPatient, onPatientsChange }) {
    const [patients, setPatients] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadPatients = useCallback(async () => {
        try {
            const data = await fetchPatients();
            setPatients(data);
            setLastUpdated(new Date());
            if (onPatientsChange) onPatientsChange(data);
        } catch (err) {
            // Silently fail on polling errors (backend might not be up yet)
            console.warn('Polling error:', err.message);
        }
    }, [onPatientsChange]);

    // Initial load + polling
    useEffect(() => {
        loadPatients();
        const interval = setInterval(loadPatients, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadPatients]);

    // When a new patient is submitted from VoiceCapture, add immediately
    useEffect(() => {
        if (newPatient) {
            setPatients(prev => {
                const exists = prev.find(p => p.id === newPatient.id);
                if (exists) return prev;
                return [newPatient, ...prev];
            });
        }
    }, [newPatient]);

    const handleDismiss = (id) => {
        setPatients(prev => prev.filter(p => p.id !== id));
    };

    const formatUpdated = () => {
        if (!lastUpdated) return 'Loading...';
        return lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="board-section">
            <div className="board-header">
                <div>
                    <div className="board-title">Live Triage Dashboard</div>
                    <div className="board-subtitle">Real-time patient priority queue — auto-refreshes every 4 seconds</div>
                </div>
                <div className="refresh-indicator">
                    <div className="refresh-dot" style={{ animation: 'pulse-ring 2s ease-out infinite' }}></div>
                    Last updated: {formatUpdated()}
                </div>
            </div>

            <div className="kanban-grid">
                {COLUMNS.map(col => {
                    const colPatients = patients.filter(p => p.priority === col.key);
                    return (
                        <div key={col.key} className="kanban-col" id={`col-${col.key.toLowerCase()}`}>
                            <div className={`col-header ${col.headerClass}`}>
                                <span className="col-icon">{col.icon}</span>
                                <div className="col-info">
                                    <div className={`col-title ${col.titleClass}`}>{col.title}</div>
                                    <div className="col-desc">{col.desc}</div>
                                </div>
                                <div className={`col-badge ${col.badgeClass}`}>{colPatients.length}</div>
                            </div>

                            <div className="col-body">
                                {colPatients.length === 0 ? (
                                    <div className="col-empty">
                                        <div className="col-empty-icon">{col.emptyIcon}</div>
                                        {col.emptyText}
                                    </div>
                                ) : (
                                    colPatients.map(patient => (
                                        <PatientCard
                                            key={patient.id}
                                            patient={patient}
                                            onDismiss={handleDismiss}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
