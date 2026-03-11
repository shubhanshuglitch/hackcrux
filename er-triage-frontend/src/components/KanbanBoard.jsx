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
    // ── NEW: track in-flight priority updates so the poll doesn't overwrite them
    // Map of { [patientId]: newPriority } for moves not yet confirmed by server
    const pendingPriorityRef = useRef({});
    // ────────────────────────────────────────────────────────────────────────

    const loadPatients = useCallback(async () => {
        try {
            const data = await fetchPatients();

            // ── NEW: re-apply any pending local priority overrides so a poll
            // arriving before the server has saved the move doesn't snap the
            // card back to the old column ────────────────────────────────────
            const merged = data.map(p => {
                if (pendingPriorityRef.current[p.id] !== undefined) {
                    return { ...p, priority: pendingPriorityRef.current[p.id] };
                }
                return p;
            });
            // ────────────────────────────────────────────────────────────────

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

        // Find the patient's current priority — skip if dropped onto same column
        const patient = patients.find(p => p.id === id);
        if (!patient || patient.priority === colKey) return;

        // 1. Update local state immediately so the card moves visually at once
        setPatients(prev => prev.map(p =>
            p.id === id ? { ...p, priority: colKey } : p
        ));

        // 2. Record this as a pending override so the next poll doesn't revert it
        pendingPriorityRef.current[id] = colKey;

        // 3. Persist to server
        try {
            await updatePatientPriority(id, colKey);
        } catch (err) {
            console.error('Failed to update priority on server:', err);
            // Roll back the local move if the server call failed
            setPatients(prev => prev.map(p =>
                p.id === id ? { ...p, priority: patient.priority } : p
            ));
        } finally {
            // 4. Once the server has saved it (or we've rolled back), remove the
            //    pending override — future polls will read the correct value
            delete pendingPriorityRef.current[id];
        }
    }, [patients]);

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
                    // colPatients is derived directly from state — count badge is always correct
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
                                {/* Badge count is always derived from filtered state — updates automatically */}
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
}0