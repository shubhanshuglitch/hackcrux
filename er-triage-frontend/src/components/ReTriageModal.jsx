import React, { useState } from 'react';
import { dismissPatient } from '../api/patientApi.js';

export default function ReTriageModal({ patient, onClose, onRetriage, currentUser, onDischarge }) {
    const [symptoms, setSymptoms] = useState(patient.symptoms || '');
    const [vitals, setVitals] = useState(patient.vitals || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [discharging, setDischarging] = useState(false);

    // ── NEW: detect if patient is ready for discharge ──────────────────────
    const isReadyForDischarge = (symp, vit) => {
        const text = `${symp} ${vit}`.toLowerCase();
        const stableKeywords = ['all stable', 'all clear', 'stable', 'ready for discharge', 'can discharge', 'fit for discharge'];
        return stableKeywords.some(keyword => text.includes(keyword));
    };
    // ────────────────────────────────────────────────────────────────────────

    const getSituationSummary = (oldPriority, newPriority) => {
        if (oldPriority === newPriority) {
            if (newPriority === 'RED') return 'Patient remains CRITICAL. Immediate intervention is still required.';
            if (newPriority === 'YELLOW') return 'Patient remains URGENT. Continue close monitoring and reassessment.';
            return 'Patient remains STABLE. Standard observation remains appropriate.';
        }
        if (oldPriority === 'RED' && (newPriority === 'YELLOW' || newPriority === 'GREEN')) {
            return 'Condition appears improved from critical risk. Continue active monitoring.';
        }
        if (oldPriority === 'YELLOW' && newPriority === 'GREEN') {
            return 'Condition has improved. Patient can move to standard queue.';
        }
        if ((oldPriority === 'GREEN' || oldPriority === 'YELLOW') && newPriority === 'RED') {
            return 'Condition worsened to CRITICAL. Escalate care immediately.';
        }
        if (oldPriority === 'GREEN' && newPriority === 'YELLOW') {
            return 'Condition worsened to URGENT. Increase observation frequency.';
        }
        return `Priority updated from ${oldPriority} to ${newPriority}.`;
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const updated = await onRetriage(patient.id, symptoms, vitals);
            const oldPriority = patient.priority || 'GREEN';
            const newPriority = updated?.priority || oldPriority;

            setResult({
                updated,
                oldPriority,
                newPriority,
                situation: getSituationSummary(oldPriority, newPriority),
            });
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    // ── NEW: handle discharge ────────────────────────────────────────────────
    const handleDischarge = async () => {
        setDischarging(true);
        setError(null);
        try {
            const performedBy = currentUser?.fullName || currentUser?.username || 'Staff';
            const deleteReason = `Patient discharged. Symptoms: ${symptoms}. Vitals: ${vitals}`;
            await dismissPatient(patient.id, deleteReason, performedBy);
            if (onDischarge) {
                onDischarge(patient.id);
            }
            onClose();
        } catch (err) {
            console.error('Discharge failed:', err);
            setError(err.message || 'Failed to discharge patient');
        } finally {
            setDischarging(false);
        }
    };
    // ────────────────────────────────────────────────────────────────────────

    const priorityClass = result
        ? `priority-${result.newPriority || 'GREEN'}`
        : `priority-${patient.priority || 'GREEN'}`;

    return (
        <div className="retriage-overlay" onClick={onClose}>
            <div className="retriage-modal" onClick={e => e.stopPropagation()}>
                <h3>🔄 Re-Triage: {patient.name || `Patient #${patient.id}`}</h3>

                <div className="retriage-preview-grid">
                    <div className="retriage-preview-card">
                        <div className="retriage-preview-title">Current Details</div>
                        <div className="retriage-preview-row"><strong>Priority:</strong> {patient.priority || 'GREEN'}</div>
                        <div className="retriage-preview-row"><strong>Symptoms:</strong> {patient.symptoms || 'Not recorded'}</div>
                        <div className="retriage-preview-row"><strong>Vitals:</strong> {patient.vitals || 'Not recorded'}</div>
                    </div>
                </div>

                <label>
                    Updated Symptoms
                    <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)}
                        rows={3} placeholder="Describe current symptoms..." />
                </label>

                <label>
                    Updated Vitals
                    <input type="text" value={vitals} onChange={e => setVitals(e.target.value)}
                        placeholder="e.g. BP 120/80, HR 72, SpO2 98%" />
                </label>

                {result && (
                    <div className={`retriage-result ${priorityClass}`}>
                        <div className="retriage-result-title">Updated Triage Result</div>
                        <div className="retriage-priority-shift">
    <span style={{
        color: result.oldPriority === 'RED' ? '#ff4d4d' : result.oldPriority === 'YELLOW' ? '#ffc107' : '#00e676'
    }}>{result.oldPriority}</span>
    <span className="shift-arrow" style={{ color: '#aaa' }}>→</span>
    <span style={{
        color: result.newPriority === 'RED' ? '#ff4d4d' : result.newPriority === 'YELLOW' ? '#ffc107' : '#00e676'
    }}>{result.newPriority}</span>
</div>
                        <div className="retriage-result-row"><strong>Updated Symptoms:</strong> {result.updated?.symptoms || symptoms || 'Not recorded'}</div>
                        <div className="retriage-result-row"><strong>Updated Vitals:</strong> {result.updated?.vitals || vitals || 'Not recorded'}</div>
                        <div className="retriage-situation">{result.situation}</div>
                        
                        {/* ── NEW: show discharge banner if stable ────────────────── */}
                        {isReadyForDischarge(symptoms, vitals) && (
                            <div className="discharge-banner">
                                <span className="discharge-icon">🏥</span>
                                <span className="discharge-text">Patient is ready for discharge!</span>
                            </div>
                        )}
                        {/* ──────────────────────────────────────────────────────── */}
                    </div>
                )}

                {error && <div className="status-message status-error"><span className="status-icon">❌</span>{error}</div>}

                <div className="retriage-actions">
                    <button className="retriage-cancel" onClick={onClose} disabled={loading || discharging}>Cancel</button>
                    {result ? (
                        <>
                            {/* ── NEW: show discharge button if stable ──────────────-- */}
                            {isReadyForDischarge(symptoms, vitals) ? (
                                <button 
                                    className="retriage-submit discharge-btn" 
                                    onClick={handleDischarge} 
                                    disabled={discharging}
                                >
                                    {discharging ? 'Discharging...' : '🏥 Discharge Patient'}
                                </button>
                            ) : (
                                <button className="retriage-submit" onClick={onClose}>Done</button>
                            )}
                            {/* ──────────────────────────────────────────────────── */}
                        </>
                    ) : (
                        <button className="retriage-submit" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Re-triaging...' : '🧠 Re-Triage Now'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
