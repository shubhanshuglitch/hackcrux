import React, { useCallback, useEffect, useState } from 'react';
import { fetchRecycleBinPatients, restorePatientFromRecycleBin } from '../api/patientApi.js';
import PatientTimeline from './PatientTimeline.jsx';

function formatDateTime(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatRetention(purgeAt) {
    if (!purgeAt) return 'Retention unavailable';

    const msRemaining = new Date(purgeAt).getTime() - Date.now();
    if (Number.isNaN(msRemaining)) return 'Retention unavailable';
    if (msRemaining <= 0) return 'Queued for purge';

    const totalHours = Math.ceil(msRemaining / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days <= 0) return `${hours}h left`;
    if (hours === 0) return `${days}d left`;
    return `${days}d ${hours}h left`;
}

export default function RecycleBin({ onPatientRestored }) {
    const [archivedPatients, setArchivedPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [restoringId, setRestoringId] = useState(null);

    const loadArchivedPatients = useCallback(async ({ silent = false } = {}) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await fetchRecycleBinPatients();
            setArchivedPatients(Array.isArray(data) ? data : []);
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to load recycle bin');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadArchivedPatients();
    }, [loadArchivedPatients]);

    const handleRestore = async (entry) => {
        if (!entry?.id) return;

        try {
            setRestoringId(entry.id);
            const restoredPatient = await restorePatientFromRecycleBin(entry.id);
            setArchivedPatients((prev) => prev.filter((item) => item.id !== entry.id));
            if (onPatientRestored) onPatientRestored(restoredPatient);
        } catch (err) {
            setError(err.message || 'Failed to restore patient');
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <section className="recycle-bin-shell">
            <div className="recycle-bin-hero">
                <div>
                    <div className="recycle-bin-kicker">Recovery Window</div>
                    <h2 className="recycle-bin-title">Recycle Bin</h2>
                    <p className="recycle-bin-subtitle">
                        Deleted patients stay recoverable for 10 days before the backup is purged automatically.
                    </p>
                </div>
                <div className="recycle-bin-hero-actions">
                    <div className="recycle-bin-stat-card">
                        <span className="recycle-bin-stat-value">{archivedPatients.length}</span>
                        <span className="recycle-bin-stat-label">Archived Patients</span>
                    </div>
                    <button className="recycle-bin-refresh-btn" onClick={() => loadArchivedPatients({ silent: true })}>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && <div className="recycle-bin-banner error">{error}</div>}

            {loading ? (
                <div className="recycle-bin-empty-state">Loading archived patients...</div>
            ) : archivedPatients.length === 0 ? (
                <div className="recycle-bin-empty-state recycle-bin-empty-clean">
                    <div className="recycle-bin-empty-icon">♻️</div>
                    <div className="recycle-bin-empty-title">Recycle bin is empty</div>
                    <p>No deleted patients are waiting inside the recovery window.</p>
                </div>
            ) : (
                <div className="recycle-bin-grid">
                    {archivedPatients.map((entry) => {
                        const patient = entry.patient || {};
                        return (
                            <article key={entry.id} className="recycle-bin-card">
                                <div className="recycle-bin-card-top">
                                    <div>
                                        <div className="recycle-bin-patient-name">{patient.name || 'Unknown Patient'}</div>
                                        <div className="recycle-bin-patient-meta">
                                            <span>ID: {patient.id || entry.id}</span>
                                            {patient.priority && <span>Priority: {patient.priority}</span>}
                                            {Number.isFinite(patient.age) && <span>Age: {patient.age}</span>}
                                        </div>
                                    </div>
                                    <span className="recycle-bin-retention-pill">{formatRetention(entry.purgeAt)}</span>
                                </div>

                                <div className="recycle-bin-card-body">
                                    <div className="recycle-bin-detail-grid">
                                        <div className="recycle-bin-detail-block">
                                            <span className="recycle-bin-detail-label">Deleted</span>
                                            <span>{formatDateTime(entry.deletedAt)}</span>
                                        </div>
                                        <div className="recycle-bin-detail-block">
                                            <span className="recycle-bin-detail-label">Permanent Purge</span>
                                            <span>{formatDateTime(entry.purgeAt)}</span>
                                        </div>
                                    </div>

                                    <div className="recycle-bin-symptoms">
                                        <span className="recycle-bin-detail-label">Chief Complaint</span>
                                        <p>{patient.symptoms || 'No symptoms recorded.'}</p>
                                    </div>

                                    {patient.vitals && patient.vitals !== 'Not recorded' && (
                                        <div className="recycle-bin-vitals">
                                            <span className="recycle-bin-detail-label">Vitals</span>
                                            <p>{patient.vitals}</p>
                                        </div>
                                    )}

                                    <PatientTimeline events={entry.timeline || []} />
                                </div>

                                <div className="recycle-bin-card-actions">
                                    <button
                                        className="recycle-bin-restore-btn"
                                        onClick={() => handleRestore(entry)}
                                        disabled={restoringId === entry.id}
                                    >
                                        {restoringId === entry.id ? 'Restoring...' : 'Restore to Active Queue'}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}