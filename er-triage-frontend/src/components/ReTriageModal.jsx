import React, { useState } from 'react';

export default function ReTriageModal({ patient, onClose, onRetriage }) {
    const [symptoms, setSymptoms] = useState(patient.symptoms || '');
    const [vitals, setVitals] = useState(patient.vitals || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            await onRetriage(patient.id, symptoms, vitals);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="retriage-overlay" onClick={onClose}>
            <div className="retriage-modal" onClick={e => e.stopPropagation()}>
                <h3>🔄 Re-Triage: {patient.name || `Patient #${patient.id}`}</h3>

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

                {error && <div className="status-message status-error"><span className="status-icon">❌</span>{error}</div>}

                <div className="retriage-actions">
                    <button className="retriage-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="retriage-submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Re-triaging...' : '🧠 Re-Triage Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
