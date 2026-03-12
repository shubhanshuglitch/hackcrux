import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPatients, retriagePatient, updatePatientPriority } from '../api/patientApi.js';
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
    const [dragOverCol, setDragOverCol] = useState(null);

    const dragPatientId = useRef(null);
    // Tracks priority overrides that have been dropped but not yet confirmed
    // by the server. Prevents the 4-second poll from snapping the card back
    // while the PUT /priority request is still in flight.
    const pendingPriorityRef = useRef({});

    const loadPatients = useCallback(async () => {
        try {
            const data = await fetchPatients();
            // Re-apply any pending local overrides so a poll arriving before
            // the server has saved the move doesn't revert the card.
            const merged = data.map(p =>
                pendingPriorityRef.current[p.id] !== undefined
                    ? { ...p, priority: pendingPriorityRef.current[p.id] }
                    : p
            );
            setPatients(merged);
            setLastUpdated(new Date());
            if (onPatientsChange) onPatientsChange(merged);
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

    // ── Drag handlers ────────────────────────────────────────────────────────
    const handleDragStart = useCallback((patientId) => {
        dragPatientId.current = patientId;
    }, []);

    const handleDragOver = useCallback((e, colKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colKey);
    }, []);

    const handleDragLeave = useCallback((e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOverCol(null);
        }
    }, []);

    const handleDrop = useCallback(async (e, colKey) => {
        e.preventDefault();
        setDragOverCol(null);

        const id = dragPatientId.current;
        if (!id) return;
        dragPatientId.current = null;

        // Find current patient — skip if already in this column
        setPatients(prev => {
            const patient = prev.find(p => p.id === id);
            if (!patient || patient.priority === colKey) return prev;

            const oldPriority = patient.priority;

            // 1. Move card immediately in local state
            const updated = prev.map(p => p.id === id ? { ...p, priority: colKey } : p);

            // 2. Record pending override to survive the next poll
            pendingPriorityRef.current[id] = colKey;

            // 3. Persist to server asynchronously
            updatePatientPriority(id, colKey)
                .catch((err) => {
                    console.error('Failed to update priority on server:', err);
                    // Roll back on failure
                    setPatients(prev2 => prev2.map(p =>
                        p.id === id ? { ...p, priority: oldPriority } : p
                    ));
                })
                .finally(() => {
                    // Remove pending override — future polls now read from server
                    delete pendingPriorityRef.current[id];
                });

            return updated;
        });
    }, []);

    const handleDragEnd = useCallback(() => {
        setDragOverCol(null);
        dragPatientId.current = null;
    }, []);
    // ────────────────────────────────────────────────────────────────────────

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
                    // Derived directly from state — badge count always stays correct
                    const colPatients = patients.filter(p => p.priority === col.key);
                    return (
                        <div
                            key={col.key}
                            className={`kanban-col${dragOverCol === col.key ? ' drag-over' : ''}`}
                            id={`col-${col.key.toLowerCase()}`}
                            onDragOver={(e) => handleDragOver(e, col.key)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.key)}
                        >
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
                                            nowTs={nowTs}
                                            onDismiss={handleDismiss}
                                            onRetriage={handleRetriage}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                        />
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