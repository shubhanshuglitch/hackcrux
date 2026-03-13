import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPatients, retriagePatient, updatePatientPriority, dismissPatient } from '../api/patientApi.js';
import PatientCard from './PatientCard.jsx';
import ReTriageModal from './ReTriageModal.jsx';
import { clearAuth } from '../api/authApi.js';

const POLL_INTERVAL_MS = 4000;
const COLLAPSE_STORAGE_KEY = 'triage_collapsed_cards';

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

function loadCollapsedCards() {
    try {
        const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function saveCollapsedCards(state) {
    try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(state));
    } catch {}
}

export default function KanbanBoard({ newPatient, onPatientsChange }) {
    const [patients, setPatients] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [nowTs, setNowTs] = useState(Date.now());
    const [retriageModal, setReTriageModal] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const [collapsedCards, setCollapsedCards] = useState(loadCollapsedCards);

    // ── NEW: delete confirmation modal state ─────────────────────────────────
    const [deleteConfirm, setDeleteConfirm] = useState(null); // stores patient id
    // ────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        saveCollapsedCards(collapsedCards);
    }, [collapsedCards]);

    const handleToggleCollapse = useCallback((patientId) => {
        setCollapsedCards(prev => {
            const next = { ...prev, [patientId]: !prev[patientId] };
            return next;
        });
    }, []);

    const dragPatientId = useRef(null);
    const pendingPriorityRef = useRef({});

    const loadPatients = useCallback(async () => {
        try {
            const data = await fetchPatients();
            const merged = data.map(p =>
                pendingPriorityRef.current[p.id] !== undefined
                    ? { ...p, priority: pendingPriorityRef.current[p.id] }
                    : p
            );
            setPatients(merged);
            setLastUpdated(new Date());
            if (onPatientsChange) onPatientsChange(data);
        } catch (err) {
            console.warn('Polling error:', err.message);
            if (err.message?.includes('401')) {
                clearAuth();
                window.location.reload();
            }
        }
    }, [onPatientsChange]);

    useEffect(() => {
        loadPatients();
        const interval = setInterval(loadPatients, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadPatients]);

    useEffect(() => {
        if (newPatient) {
            setPatients(prev => {
                if (prev.find(p => p.id === newPatient.id)) return prev;
                return [newPatient, ...prev];
            });
        }
    }, [newPatient]);

    // ── CHANGED: onDismiss now opens the modal instead of deleting immediately
    const handleDismiss = (id) => {
        setDeleteConfirm(id);
    };

    // ── NEW: called when user confirms deletion in the modal ─────────────────
    const confirmDelete = async () => {
        const id = deleteConfirm;
        setDeleteConfirm(null);
        try {
            await dismissPatient(id);
        } catch (err) {
            console.error('Failed to delete patient:', err);
        }
        setPatients(prev => prev.filter(p => p.id !== id));
        setCollapsedCards(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };
    // ────────────────────────────────────────────────────────────────────────

    const handleRetriage = (patient) => setReTriageModal(patient);
    const handleReTriageSubmit = async (id, symptoms, vitals) => {
        const updated = await retriagePatient(id, symptoms, vitals);
        setPatients(prev => {
            const next = prev.map(p => (p.id === id ? updated : p));
            if (onPatientsChange) onPatientsChange(next);
            return next;
        });
        await loadPatients();
        return updated;
    };

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

        setPatients(prev => {
            const patient = prev.find(p => p.id === id);
            if (!patient || patient.priority === colKey) return prev;

            const oldPriority = patient.priority;
            const updated = prev.map(p => p.id === id ? { ...p, priority: colKey } : p);

            pendingPriorityRef.current[id] = colKey;

            updatePatientPriority(id, colKey)
                .catch((err) => {
                    console.error('Failed to update priority on server:', err);
                    setPatients(prev2 => prev2.map(p =>
                        p.id === id ? { ...p, priority: oldPriority } : p
                    ));
                })
                .finally(() => {
                    delete pendingPriorityRef.current[id];
                });

            return updated;
        });
    }, []);

    const handleDragEnd = useCallback(() => {
        setDragOverCol(null);
        dragPatientId.current = null;
    }, []);

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
                                            onDismiss={handleDismiss}
                                            onRetriage={handleRetriage}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            collapsed={!!collapsedCards[patient.id]}
                                            onToggleCollapse={handleToggleCollapse}
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

            {/* ── NEW: Delete confirmation modal ───────────────────────────── */}
            {deleteConfirm && (
                <div className="retriage-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <span className="delete-modal-icon">🗑️</span>
                            <h3>Delete Patient</h3>
                        </div>
                        <p className="delete-modal-text">
                            Are you sure you want to delete this patient? This action cannot be undone.
                        </p>
                        <div className="delete-modal-actions">
                            <button className="retriage-cancel" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                            </button>
                            <button className="delete-confirm-btn" onClick={confirmDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ────────────────────────────────────────────────────────────── */}
        </div>
    );
}