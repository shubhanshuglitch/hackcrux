import React, { useState } from 'react';

export default function PatientDetailModal({ patient, onClose }) {
    if (!patient) return null;

    const priorityColors = { RED: '#ef4444', YELLOW: '#f59e0b', GREEN: '#10b981' };
    const priorityLabels = { RED: 'CRITICAL', YELLOW: 'URGENT', GREEN: 'STANDARD' };

    return (
        <div className="detail-overlay" onClick={onClose}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
                <div className="detail-modal-header">
                    <div>
                        <h2 className="detail-patient-name">{patient.name || 'Unknown Patient'}</h2>
                        <div className="detail-patient-meta">
                            {patient.age && <span>Age: {patient.age}</span>}
                            <span>ID: #{patient.id}</span>
                            <span style={{ color: priorityColors[patient.priority] || '#6b7c95', fontWeight: 800 }}>
                                ● {priorityLabels[patient.priority] || patient.priority}
                            </span>
                        </div>
                    </div>
                    <button className="detail-close" onClick={onClose}>✕</button>
                </div>

                <div className="detail-body">
                    <div className="detail-section">
                        <h3>🩺 Chief Complaint</h3>
                        <p>{patient.symptoms || 'No symptoms recorded'}</p>
                    </div>

                    <div className="detail-section">
                        <h3>❤️ Vitals</h3>
                        <p>{patient.vitals && patient.vitals !== 'Not recorded' ? patient.vitals : 'Not recorded'}</p>
                    </div>

                    {patient.rawInput && (
                        <div className="detail-section">
                            <h3>🎤 Raw Intake Input</h3>
                            <p className="detail-raw-input">{patient.rawInput}</p>
                        </div>
                    )}

                    <div className="detail-section">
                        <h3>📝 Intake Timestamp</h3>
                        <p>{patient.timestamp ? new Date(patient.timestamp).toLocaleString() : 'Unknown'}</p>
                    </div>

                    {patient.timeline && patient.timeline.length > 0 && (
                        <div className="detail-section">
                            <h3>📋 Event Timeline</h3>
                            <div className="detail-timeline">
                                {patient.timeline.map((event, i) => (
                                    <div key={i} className="detail-timeline-item">
                                        <div className="detail-timeline-dot" />
                                        <div className="detail-timeline-content">
                                            <div className="detail-timeline-type">{event.eventType?.replace('_', ' ') || event.type}</div>
                                            <div className="detail-timeline-desc">{event.description || '—'}</div>
                                            <div className="detail-timeline-meta">
                                                {event.performedBy && <span>By: {event.performedBy}</span>}
                                                <span>{event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
