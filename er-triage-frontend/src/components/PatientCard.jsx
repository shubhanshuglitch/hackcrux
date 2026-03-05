import React from 'react';
import { dismissPatient } from '../api/patientApi.js';

function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function PatientCard({ patient, onDismiss }) {
    const handleDismiss = async () => {
        try {
            await dismissPatient(patient.id);
            if (onDismiss) onDismiss(patient.id);
        } catch (err) {
            console.error('Failed to dismiss patient:', err);
        }
    };

    const priorityLabel = {
        RED: '🔴 Critical',
        YELLOW: '🟡 Urgent',
        GREEN: '🟢 Standard',
    }[patient.priority] || patient.priority;

    return (
        <div className={`patient-card priority-${patient.priority}`} id={`patient-${patient.id}`}>
            <div className="card-header">
                <div>
                    <div className="card-patient-name">{patient.name || 'Unknown Patient'}</div>
                    <div className="card-age">{patient.age ? `Age: ${patient.age}` : 'Age: N/A'}</div>
                </div>
                <button
                    className="card-dismiss"
                    onClick={handleDismiss}
                    title="Dismiss patient"
                    id={`dismiss-${patient.id}`}
                >
                    ✕
                </button>
            </div>

            {patient.symptoms && (
                <div className="card-field">
                    <div className="card-field-label">Symptoms</div>
                    <div className="card-field-value">{patient.symptoms}</div>
                </div>
            )}

            {patient.vitals && patient.vitals !== 'Not recorded' && (
                <div className="card-field">
                    <div className="card-field-label">Vitals</div>
                    <div className="card-field-value">{patient.vitals}</div>
                </div>
            )}

            <div className="card-footer">
                <div className="card-timestamp">{formatTime(patient.timestamp)}</div>
                <div className={`card-priority-badge badge-priority-${patient.priority}`}>
                    {priorityLabel}
                </div>
            </div>
        </div>
    );
}
