import React, { useState, useEffect, useCallback } from 'react';
import { fetchPatients, retriagePatient } from '../api/patientApi.js';
import PatientCard from './PatientCard.jsx';
import ReTriageModal from './ReTriageModal.jsx';

const POLL_INTERVAL_MS = 4000;

const COLUMNS = [
    {
        key: 'RED', icon: '🔴', title: 'Critical', desc: 'Immediate action required',
        headerClass: 'col-header-red', titleClass: 'col-title-red', badgeClass: 'badge-red',
        emptyIcon: '✅', emptyText: 'No critical patients'
    },
    {
        key: 'YELLOW', icon: '🟡', title: 'Urgent', desc: 'Monitor closely',
        headerClass: 'col-header-yellow', titleClass: 'col-title-yellow', badgeClass: 'badge-yellow',
        emptyIcon: '👍', emptyText: 'No urgent patients'
    },
    {
        key: 'GREEN', icon: '🟢', title: 'Standard', desc: 'Safe to wait',
        headerClass: 'col-header-green', titleClass: 'col-title-green', badgeClass: 'badge-green',
        emptyIcon: '🏥', emptyText: 'No standard patients'
    },
];

export default function KanbanBoard({ newPatient, onPatientsChange }) {
    const [patients, setPatients] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [nowTs, setNowTs] = useState(Date.now());
    const [retriageModal, setReTriageModal] = useState(null);

    const loadPatients = useCallback(async () => {
        try {
            const data = await fetchPatients();
            setPatients(data);
            setLastUpdated(new Date());
            if (onPatientsChange) onPatientsChange(data);
        } catch (err) { console.warn('Polling error:', err.message); }
    }, [onPatientsChange]);

    useEffect(() => {
        loadPatients();
        const interval = setInterval(loadPatients, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadPatients]);

    useEffect(() => {
        const clock = setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(clock);
    }, []);

    useEffect(() => {
        if (newPatient) {
            setPatients(prev => {
                if (prev.find(p => p.id === newPatient.id)) return prev;
                return [newPatient, ...prev];
            });
        }
    }, [newPatient]);

    const handleDismiss = (id) => setPatients(prev => prev.filter(p => p.id !== id));
    const handleRetriage = (patient) => setReTriageModal(patient);
    const handleReTriageSubmit = async (id, symptoms, vitals) => {
        await retriagePatient(id, symptoms, vitals);
        await loadPatients();
    };

    const formatUpdated = () => {
        if (!lastUpdated) return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="board-section">
            <div className="board-header">
                <div>
                    <div className="board-title-row">
                        <span className="board-title-icon" aria-hidden="true">🏥</span>
                        <div className="board-title">Live Triage Dashboard</div>
                    </div>
                    <div className="board-subtitle">Real-time patient priority queue — auto-refreshes every 4 seconds</div>
                </div>
                <div className="refresh-indicator">
                    <span className="refresh-icon" aria-hidden="true">⏱</span>
                    <span className="refresh-status-text">
                        <strong>Last updated:</strong>
                        <span className="refresh-time">{formatUpdated()}</span>
                    </span>
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
                                        <PatientCard key={patient.id} patient={patient} nowTs={nowTs}
                                            onDismiss={handleDismiss} onRetriage={handleRetriage} />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {retriageModal && (
                <ReTriageModal patient={retriageModal}
                    onClose={() => setReTriageModal(null)}
                    onRetriage={handleReTriageSubmit} />
            )}
        </div>
    );
}
