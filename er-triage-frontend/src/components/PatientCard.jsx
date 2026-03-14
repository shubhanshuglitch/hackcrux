import { dismissPatient, handoffPatient } from '../api/patientApi.js';
import PatientTimeline from './PatientTimeline.jsx';
import PatientDetailModal from './PatientDetailModal.jsx';

import heartRateIcon from '../assets/heart-rate.png';
import retriageIcon from '../assets/arrow-counterclockwise-12-filled_.png';
import collapseIcon from '../assets/arrow-bottom_.png';
import React, { useState, useEffect } from 'react';

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

function PatientCard({ patient, onArchive, onDismiss, onRetriage, onDragStart, onDragEnd, collapsed, onToggleCollapse }) {

    const [nowTs, setNowTs] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [actionType, setActionType] = useState(null);
    const [actionNotes, setActionNotes] = useState('');
    const [actionDept, setActionDept] = useState('ICU');
    const [showDetail, setShowDetail] = useState(false);
    const [discharging, setDischarging] = useState(false);
    const [actionError, setActionError] = useState('');

    const handleDischarge = async () => {
        if (!actionNotes.trim()) {
            setActionError('Discharge notes are required');
            return;
        }
        setDischarging(true);
        setActionError('');
        try {
            const deleteReason = actionNotes.trim();
            await dismissPatient(patient.id, deleteReason, 'Staff');
            setActionType(null);
            setActionNotes('');
            if (onDismiss) onDismiss(patient.id); // Remove from board
        } catch (err) { 
            console.error('Failed to discharge:', err);
            setActionError(`Error: ${err.message || 'Failed to discharge patient'}`);
        } finally {
            setDischarging(false);
        }
    };

    const handleHandoff = async () => {
        setDischarging(true);
        setActionError('');
        try {
            await handoffPatient(patient.id, actionDept, actionNotes, 'Staff');
            setActionType(null);
            setActionNotes('');
        } catch (err) { 
            console.error('Failed to handoff:', err);
            setActionError(`Error: ${err.message || 'Failed to handoff patient'}`);
        } finally {
            setDischarging(false);
        }
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
        <div
            className={`patient-card priority-${patient.priority}${sla.breach ? ' sla-breached' : sla.warning ? ' sla-warning' : ''}${collapsed ? ' is-collapsed' : ''}`}
            id={`patient-${patient.id}`}
            draggable="true"
            onClick={() => {
                if (collapsed) onToggleCollapse(patient.id);
            }}
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', patient.id);
                if (onDragStart) onDragStart(patient.id);
            }}
            onDragEnd={() => { if (onDragEnd) onDragEnd(); }}
        >
            <div className="card-header">
                <div className="card-header-left">
                    <div
                        className="card-patient-name"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (collapsed) {
                                onToggleCollapse(patient.id);
                                return;
                            }
                            setShowDetail(true);
                        }}
                        style={{ cursor: 'pointer' }}
                        title={collapsed ? 'Click to expand card' : 'Click for details'}
                    >
                        {patient.name || 'Unknown Patient'}
                    </div>
                    <div className="card-meta-info">
                        {patient.age && <span className="card-age">Age: {patient.age}</span>}
                        <span className="card-id">ID: {patient.id}</span>
                    </div>
                    {(patient.assignedCareZone || patient.assignedRoom || patient.assignedNurseName) && (
                        <div className="card-resource-strip">
                            <span className="card-resource-chip">Zone: {patient.assignedCareZone || 'Pending'}</span>
                            <span className="card-resource-chip">Room: {patient.assignedRoom || 'Pending'}</span>
                            <span className="card-resource-chip">Nurse: {patient.assignedNurseName || 'Pending'}</span>
                        </div>
                    )}
                </div>
                <div className="card-header-actions">
                    <button
                        className="card-retriage"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse(patient.id);
                        }}
                        title={collapsed ? 'Expand card' : 'Collapse card'}
                    >
                        <img
                            src={collapseIcon}
                            alt={collapsed ? 'Expand' : 'Collapse'}
                            style={{
                                width: '1em',
                                height: '1em',
                                display: 'block',
                                transform: collapsed ? 'none' : 'rotate(180deg)',
                                transition: 'transform 0.2s ease',
                            }}
                        />
                    </button>
                    {onRetriage && (
                        <button
                            className="card-retriage"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRetriage(patient);
                            }}
                            title="Re-triage"
                        >
                            <img
                                src={retriageIcon}
                                alt="Re-triage"
                                style={{ width: '1em', height: '1em', display: 'block' }}
                            />
                        </button>
                    )}
                    {/* Dismiss button — triggers modal in KanbanBoard, not inline */}
                    <button
                        className="card-dismiss"
                        onClick={(e) => {
                            e.stopPropagation();
                            onArchive(patient);
                        }}
                        title="Dismiss"
                        id={`dismiss-${patient.id}`}
                    >✕</button>
                </div>
            </div>

            {collapsed && (
                <>
                    {patient.symptoms && (
                        <div className="card-field">
                            <div className="card-field-header">
                                <span className="card-field-icon">🩺</span>
                                <div className="card-field-label">Chief Complaint</div>
                            </div>
                            <div className="card-field-value">{patient.symptoms}</div>
                        </div>
                    )}
                    <div className="card-footer">
                        <div className="card-timestamp">
                            <span className="timestamp-icon">🕐</span>{formatTime(patient.timestamp)}
                        </div>
                    </div>
                </>
            )}

            {!collapsed && (
                <>
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
                            <div className="card-field-header">
                                <span className="card-field-icon">
                                    <img
                                        src={heartRateIcon}
                                        alt="Vitals"
                                        style={{ width: '1em', height: '1em', display: 'block' }}
                                    />
                                </span>
                                <div className="card-field-label">Vitals</div>
                            </div>
                            <div className="card-field-value vitals-display">{patient.vitals}</div>
                        </div>
                    )}

                    {(patient.assignedRoom || patient.assignedDoctorName || patient.assignedNurseName) && (
                        <div className="card-field">
                            <div className="card-field-header">
                                <span className="card-field-icon">🧩</span>
                                <div className="card-field-label">Live Resource Allocation</div>
                            </div>
                            <div className="card-field-value">
                                <div><strong>Zone:</strong> {patient.assignedCareZone || 'Pending'}</div>
                                <div><strong>Room:</strong> {patient.assignedRoom || 'Pending'}</div>
                                <div><strong>Doctor:</strong> {patient.assignedDoctorName || 'Unassigned'}</div>
                                <div><strong>Nurse:</strong> {patient.assignedNurseName || 'Pending'}</div>
                                <div><strong>Support:</strong> {patient.assignedSupportStaff || 'General support'}</div>
                                {Array.isArray(patient.assignedEquipment) && patient.assignedEquipment.length > 0 && (
                                    <div><strong>Equipment:</strong> {patient.assignedEquipment.join(', ')}</div>
                                )}
                            </div>
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
                                    onChange={e => {
                                        setActionNotes(e.target.value);
                                        if (actionError) setActionError('');
                                    }}
                                    placeholder="Discharge notes (required)" 
                                    disabled={discharging} />
                                {actionError && <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>⚠️ {actionError}</div>}
                                <div className="workflow-form-actions">
                                    <button className="workflow-cancel" onClick={() => {
                                        setActionType(null);
                                        setActionError('');
                                    }} disabled={discharging}>Cancel</button>
                                    <button className="workflow-confirm discharge" onClick={handleDischarge} disabled={discharging || !actionNotes.trim()}>
                                        {discharging ? 'Discharging...' : 'Confirm Discharge'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="workflow-form">
                                <div className="workflow-form-title">🔀 Handoff Patient</div>
                                <select className="workflow-input" value={actionDept} onChange={e => {
                                    setActionDept(e.target.value);
                                    if (actionError) setActionError('');
                                }} disabled={discharging}>
                                    <option value="ICU">ICU</option>
                                    <option value="Surgery">Surgery</option>
                                    <option value="Cardiology">Cardiology</option>
                                    <option value="Radiology">Radiology</option>
                                    <option value="Neurology">Neurology</option>
                                    <option value="Pediatrics">Pediatrics</option>
                                </select>
                                <input className="workflow-input" value={actionNotes}
                                    onChange={e => {
                                        setActionNotes(e.target.value);
                                        if (actionError) setActionError('');
                                    }}
                                    placeholder="Handoff notes (optional)" 
                                    disabled={discharging} />
                                {actionError && <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>⚠️ {actionError}</div>}
                                <div className="workflow-form-actions">
                                    <button className="workflow-cancel" onClick={() => {
                                        setActionType(null);
                                        setActionError('');
                                    }} disabled={discharging}>Cancel</button>
                                    <button className="workflow-confirm handoff" onClick={handleHandoff} disabled={discharging}>
                                        {discharging ? 'Processing...' : 'Confirm Handoff'}
                                    </button>
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
                </>
            )}

            {showDetail && <PatientDetailModal patient={patient} onClose={() => setShowDetail(false)} />}
        </div>
    );
}

export default React.memo(PatientCard);