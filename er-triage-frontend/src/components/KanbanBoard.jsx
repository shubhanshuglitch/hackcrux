import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fetchPatients, retriagePatient, updatePatientPriority, dismissPatient } from '../api/patientApi.js';
import PatientCard from './PatientCard.jsx';
import ReTriageModal from './ReTriageModal.jsx';
import Toast from './Toast.jsx';

const POLL_INTERVAL_MS = 4000;
// ── NEW: localStorage key for persisting collapse state ──────────────────────
const COLLAPSE_STORAGE_KEY = 'triage_collapsed_cards';
// ────────────────────────────────────────────────────────────────────────────

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

// ── NEW: helpers to read/write collapse state from localStorage ──────────────
function loadCollapsedCards() {
    try {
        const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

    function getCollapsedValue(state, patientId) {
        if (Object.prototype.hasOwnProperty.call(state, patientId)) {
            return !!state[patientId];
        }
        return true;
    }

function saveCollapsedCards(state) {
    try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // localStorage unavailable — silently ignore
    }
}
// ────────────────────────────────────────────────────────────────────────────

export default function KanbanBoard({ newPatient, onPatientsChange, highlightPatientId, onHighlighted, currentUser, onPatientArchived }) {
    const [patients, setPatients] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [nowTs, setNowTs] = useState(Date.now());
    const [retriageModal, setReTriageModal] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleting, setDeleting] = useState(false);
    
    // ── NEW: toast notification state ────────────────────────────────────────
    const [toast, setToast] = useState(null);
    // ────────────────────────────────────────────────────────────────────────
    
    // ── NEW: track recently discharged patients to prevent them from reappearing ───
    const recentlyDischargedRef = useRef(new Set());
    // ────────────────────────────────────────────────────────────────────────

    // ── NEW: initialise from localStorage so state survives navigation ───────
    const [collapsedCards, setCollapsedCards] = useState(loadCollapsedCards);
    // ────────────────────────────────────────────────────────────────────────

    // ── NEW: persist to localStorage whenever collapsedCards changes ─────────
    useEffect(() => {
        saveCollapsedCards(collapsedCards);
    }, [collapsedCards]);
    // ────────────────────────────────────────────────────────────────────────

    const handleToggleCollapse = useCallback((patientId) => {
        setCollapsedCards(prev => {
            const next = { ...prev, [patientId]: !getCollapsedValue(prev, patientId) };
            return next;
        });
    }, []);

    const dragPatientId = useRef(null);
    const pendingPriorityRef = useRef({});

    const loadPatients = useCallback(async () => {
        try {
            const data = await fetchPatients();
            const merged = data
                .filter(p => !recentlyDischargedRef.current.has(p.id)) // ── FIX: exclude recently discharged ──
                .map(p =>
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

    useEffect(() => {
        if (highlightPatientId && patients.length > 0) {
            const el = document.getElementById(`patient-${highlightPatientId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight-pulse');
                setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
                if (onHighlighted) onHighlighted();
            }
        }
    }, [highlightPatientId, patients, onHighlighted]);

    const removePatientFromBoard = useCallback((id) => {
        setPatients(prev => prev.filter(p => p.id !== id));
        setCollapsedCards(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    // ── NEW: handle patient discharge ────────────────────────────────────────
    const handleDischarge = useCallback((patientId) => {
        removePatientFromBoard(patientId);
        
        // ── FIX: Add to recently discharged to prevent polling from re-adding ──
        recentlyDischargedRef.current.add(patientId);
        // Remove from recently discharged after 5 seconds (after toast disappears)
        setTimeout(() => {
            recentlyDischargedRef.current.delete(patientId);
        }, 5000);
        // ────────────────────────────────────────────────────────────────────────
        
        setToast({
            message: '✅ Patient successfully discharged!',
            type: 'success',
            duration: 3000,
        });
    }, [removePatientFromBoard]);
    // ────────────────────────────────────────────────────────────────────────

    const handleArchiveRequest = useCallback((patient) => {
        setDeleteCandidate(patient);
        setDeleteReason('');
        setDeleteError('');
    }, []);

    const handleDismiss = async () => {
        if (!deleteCandidate?.id) return;
        if (!deleteReason.trim()) {
            setDeleteError('Delete reason is required.');
            return;
        }

        try {
            setDeleting(true);
            await dismissPatient(
                deleteCandidate.id,
                deleteReason.trim(),
                currentUser?.fullName || currentUser?.username || 'Staff'
            );
            removePatientFromBoard(deleteCandidate.id);
            setDeleteCandidate(null);
            setDeleteReason('');
            setDeleteError('');
            if (onPatientArchived) onPatientArchived();
        } catch (err) {
            console.error('Failed to dismiss patient:', err);
            setDeleteError(err.message || 'Failed to archive patient');
        } finally {
            setDeleting(false);
        }
    };

    const handleRetriage = (patient) => setReTriageModal(patient);

    const handleReTriageSubmit = async (id, symptoms, vitals) => {
    const updated = await retriagePatient(id, symptoms, vitals);
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
                                            nowTs={nowTs}
                                            onArchive={handleArchiveRequest}
                                            onDismiss={removePatientFromBoard}
                                            onRetriage={handleRetriage}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            collapsed={getCollapsedValue(collapsedCards, patient.id)}
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
                    onRetriage={handleReTriageSubmit}
                    currentUser={currentUser}
                    onDischarge={handleDischarge} />
            )}

            {deleteCandidate && createPortal(
                <div className="staff-form-overlay" onClick={() => !deleting && setDeleteCandidate(null)}>
                    <div className="delete-confirm-modal patient-delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="staff-form-header delete-header">
                            <h3>Archive Patient Record</h3>
                            <button className="staff-form-close" onClick={() => !deleting && setDeleteCandidate(null)}>✕</button>
                        </div>
                        <div className="delete-confirm-body">
                            <p>
                                Move <strong>{deleteCandidate.name || 'Unknown Patient'}</strong> to the recycle bin?
                            </p>
                            <p className="delete-note">The record stays recoverable for 10 days before permanent purge.</p>
                            <div className="patient-delete-form-field">
                                <label htmlFor="patient-delete-reason" className="recycle-bin-detail-label">Delete Reason</label>
                                <textarea
                                    id="patient-delete-reason"
                                    className="workflow-input patient-delete-textarea"
                                    value={deleteReason}
                                    onChange={(e) => {
                                        setDeleteReason(e.target.value);
                                        if (deleteError) setDeleteError('');
                                    }}
                                    placeholder="Why is this patient being removed from the active queue?"
                                    rows={4}
                                    disabled={deleting}
                                />
                            </div>
                            {deleteError && <div className="form-error">⚠️ {deleteError}</div>}
                        </div>
                        <div className="delete-confirm-actions">
                            <button className="form-cancel-btn" onClick={() => !deleting && setDeleteCandidate(null)}>Cancel</button>
                            <button className="user-delete-btn danger" onClick={handleDismiss} disabled={deleting}>
                                {deleting ? 'Archiving...' : 'Move to Recycle Bin'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {/* ── NEW: toast notification ──────────────────────────────────── */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => setToast(null)}
                />
            )}
            {/* ─────────────────────────────────────────────────────────────── */}
        </div>
    );
}