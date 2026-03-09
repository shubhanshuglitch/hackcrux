import React, { useState } from 'react';
import { dismissPatient, dischargePatient, handoffPatient } from '../api/patientApi.js';
import PatientTimeline from './PatientTimeline.jsx';
import PatientDetailModal from './PatientDetailModal.jsx';

const SLA_MS = { RED: 5 * 60 * 1000, YELLOW: 15 * 60 * 1000, GREEN: 45 * 60 * 1000 };

function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function clamp(num, min, max) { return Math.min(max, Math.max(min, num)); }
function parseBp(text) { const m = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/); return m ? { systolic: Number(m[1]), diastolic: Number(m[2]) } : null; }
function parseHeartRate(text) { const m = text.match(/(?:heart rate|hr|pulse)\s*[:=]?\s*(\d{2,3})/i); return m ? Number(m[1]) : null; }
function parseSpo2(text) { const m = text.match(/(?:spo2|oxygen(?:\s+saturation)?)\s*[:=]?\s*(\d{2,3})\s*%?/i); return m ? Number(m[1]) : null; }
function formatDuration(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

function buildTriageExplanation(patient) {
    const combined = `${patient.symptoms || ''} ${patient.vitals || ''} ${patient.rawInput || ''}`.toLowerCase();
    const reasons = [];
    if (/chest pain|shortness of breath|breathing difficulty|unconscious|seizure|stroke|heavy bleeding|fainting/.test(combined))
        reasons.push('High-risk emergency symptoms detected from intake narrative.');
    const bp = parseBp(combined);
    if (bp) {
        if (bp.systolic < 90 || bp.diastolic < 60) reasons.push(`Low blood pressure (${bp.systolic}/${bp.diastolic}) suggests hemodynamic instability.`);
        else if (bp.systolic > 180 || bp.diastolic > 120) reasons.push(`Severely elevated blood pressure (${bp.systolic}/${bp.diastolic}) indicates urgent cardiovascular risk.`);
    }
    const hr = parseHeartRate(combined);
    if (hr && (hr > 120 || hr < 45)) reasons.push(`Heart rate outside normal range (${hr} bpm) increased urgency.`);
    const spo2 = parseSpo2(combined);
    if (spo2 && spo2 < 92) reasons.push(`Low oxygen saturation (${spo2}%) raised triage severity.`);
    if (!reasons.length) {
        if (patient.priority === 'RED') reasons.push('Priority elevated due to critical phrasing and risk markers.');
        else if (patient.priority === 'YELLOW') reasons.push('Moderate-risk signs detected; requires close monitoring.');
        else reasons.push('No immediate high-risk markers found; case appears stable.');
    }
    if (!patient.vitals || patient.vitals === 'Not recorded') reasons.push('Vitals incomplete; confirm BP, HR, SpO2.');
    const hasVitals = !!patient.vitals && patient.vitals !== 'Not recorded';
    let confidence = 0.56 + (hasVitals ? 0.15 : 0) + (patient.symptoms ? 0.1 : 0) + Math.min(reasons.length, 3) * 0.06;
    if (patient.priority === 'RED' && /chest pain|unconscious|stroke|seizure/.test(combined)) confidence += 0.05;
    return { reasons: reasons.slice(0, 3), confidence: clamp(confidence, 0.55, 0.96), needsReview: !hasVitals || confidence < 0.72 };
}

function getSlaStatus(patient, nowTs) {
    const intake = patient.timestamp ? new Date(patient.timestamp).getTime() : nowTs;
    const remaining = (SLA_MS[patient.priority] || SLA_MS.GREEN) - Math.max(0, nowTs - intake);
    const breach = remaining < 0;
    return {
        breach, warning: !breach && remaining < (SLA_MS[patient.priority] || SLA_MS.GREEN) * 0.2,
        label: breach ? `Overdue by ${formatDuration(Math.abs(remaining))}` : `${formatDuration(remaining)} left`
    };
}

export default function PatientCard({ patient, onDismiss, onRetriage, nowTs = Date.now() }) {
    const [showActions, setShowActions] = useState(false);
    const [actionType, setActionType] = useState(null); // 'discharge' or 'handoff'
    const [actionNotes, setActionNotes] = useState('');
    const [actionDept, setActionDept] = useState('ICU');
    const [showDetail, setShowDetail] = useState(false);

    const handleDismiss = async () => {
        try { await dismissPatient(patient.id); if (onDismiss) onDismiss(patient.id); }
        catch (err) { console.error('Failed to dismiss:', err); }
    };

    const handleDischarge = async () => {
        try {
            await dischargePatient(patient.id, actionNotes || 'Patient discharged', 'Staff');
            if (onDismiss) onDismiss(patient.id);
        } catch (err) { console.error('Failed to discharge:', err); }
    };

    const handleHandoff = async () => {
        try {
            await handoffPatient(patient.id, actionDept, actionNotes, 'Staff');
            setActionType(null);
            setShowActions(false);
            setActionNotes('');
        } catch (err) { console.error('Failed to handoff:', err); }
    };

    const priorityInfo = {
        RED: { emoji: '🔴', label: 'CRITICAL', icon: '⚠️' },
        YELLOW: { emoji: '🟡', label: 'URGENT', icon: '⏱️' },
        GREEN: { emoji: '🟢', label: 'STANDARD', icon: '✓' }
    }[patient.priority] || { emoji: '◯', label: patient.priority, icon: '?' };
    const explanation = buildTriageExplanation(patient);
    const sla = getSlaStatus(patient, nowTs);
    const confidencePct = Math.round(explanation.confidence * 100);

    return (
        <div className={`patient-card priority-${patient.priority}${sla.breach ? ' sla-breached' : sla.warning ? ' sla-warning' : ''}`} id={`patient-${patient.id}`}>
            <div className="card-header">
                <div className="card-header-left">
                    <div className="card-patient-name" onClick={() => setShowDetail(true)} style={{ cursor: 'pointer' }} title="Click for details">{patient.name || 'Unknown Patient'}</div>
                    <div className="card-meta-info">
                        {patient.age && <span className="card-age">Age: {patient.age}</span>}
                        <span className="card-id">ID: {patient.id}</span>
                    </div>
                </div>
                <div className="card-header-actions">
                    {onRetriage && <button className="card-retriage" onClick={() => onRetriage(patient)} title="Re-triage">🔄</button>}
                    <button className="card-dismiss" onClick={handleDismiss} title="Dismiss" id={`dismiss-${patient.id}`}>✕</button>
                </div>
            </div>

            <div className={`sla-chip${sla.breach ? ' breached' : sla.warning ? ' warning' : ''}`}>
                <span className="sla-dot"></span><span className="sla-label">SLA</span><span className="sla-time">{sla.label}</span>
            </div>

            <div className="card-divider"></div>

            {patient.symptoms && (
                <div className="card-field">
                    <div className="card-field-header"><span className="card-field-icon">🩺</span><div className="card-field-label">Chief Complaint</div></div>
                    <div className="card-field-value">{patient.symptoms}</div>
                </div>
            )}

            {patient.vitals && patient.vitals !== 'Not recorded' && (
                <div className="card-field">
                    <div className="card-field-header"><span className="card-field-icon">❤️</span><div className="card-field-label">Vitals</div></div>
                    <div className="card-field-value vitals-display">{patient.vitals}</div>
                </div>
            )}

            <div className="card-explain">
                <div className="card-explain-title">AI Triage Rationale</div>
                <ul className="card-explain-list">
                    {explanation.reasons.map((reason, idx) => (<li key={`${patient.id}-reason-${idx}`}>{reason}</li>))}
                </ul>
                <div className="card-confidence-row"><span>Confidence</span><span>{confidencePct}%</span></div>
                <div className="confidence-track" role="progressbar" aria-valuenow={confidencePct}>
                    <div className="confidence-fill" style={{ width: `${confidencePct}%` }}></div>
                </div>
                {explanation.needsReview && <div className="review-flag">Manual review recommended</div>}
            </div>

            {patient.timeline && patient.timeline.length > 0 && <PatientTimeline events={patient.timeline} />}

            {/* Discharge / Handoff Actions */}
            <div className="card-workflow-actions">
                {!actionType ? (
                    <div className="workflow-btn-row">
                        <button className="workflow-btn discharge-btn" onClick={() => setActionType('discharge')}>
                            🏠 Discharge
                        </button>
                        <button className="workflow-btn handoff-btn" onClick={() => setActionType('handoff')}>
                            🔀 Handoff
                        </button>
                    </div>
                ) : actionType === 'discharge' ? (
                    <div className="workflow-form">
                        <div className="workflow-form-title">🏠 Discharge Patient</div>
                        <input className="workflow-input" value={actionNotes}
                            onChange={e => setActionNotes(e.target.value)}
                            placeholder="Discharge notes (optional)" />
                        <div className="workflow-form-actions">
                            <button className="workflow-cancel" onClick={() => setActionType(null)}>Cancel</button>
                            <button className="workflow-confirm discharge" onClick={handleDischarge}>Confirm Discharge</button>
                        </div>
                    </div>
                ) : (
                    <div className="workflow-form">
                        <div className="workflow-form-title">🔀 Handoff Patient</div>
                        <select className="workflow-input" value={actionDept} onChange={e => setActionDept(e.target.value)}>
                            <option value="ICU">ICU</option>
                            <option value="Surgery">Surgery</option>
                            <option value="Cardiology">Cardiology</option>
                            <option value="Radiology">Radiology</option>
                            <option value="Neurology">Neurology</option>
                            <option value="Pediatrics">Pediatrics</option>
                        </select>
                        <input className="workflow-input" value={actionNotes}
                            onChange={e => setActionNotes(e.target.value)}
                            placeholder="Handoff notes (optional)" />
                        <div className="workflow-form-actions">
                            <button className="workflow-cancel" onClick={() => setActionType(null)}>Cancel</button>
                            <button className="workflow-confirm handoff" onClick={handleHandoff}>Confirm Handoff</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="card-footer">
                <div className="card-timestamp"><span className="timestamp-icon">🕐</span>{formatTime(patient.timestamp)}</div>
                <div className={`card-priority-badge priority-${patient.priority}`}>
                    <span className="badge-icon">{priorityInfo.icon}</span>{priorityInfo.label}
                </div>
            </div>

            {showDetail && <PatientDetailModal patient={patient} onClose={() => setShowDetail(false)} />}
        </div>
    );
}
