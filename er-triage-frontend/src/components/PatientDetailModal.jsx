import React from 'react';
import { createPortal } from 'react-dom';

export default function PatientDetailModal({ patient, onClose }) {
    if (!patient) return null;
    return createPortal(
        <div className="detail-overlay" onClick={onClose}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>

                <div className="detail-modal-header">
                    <h2 className="detail-patient-name">{patient.name || 'Unknown Patient'}</h2>
                    <button className="detail-close" onClick={onClose}>✕</button>
                </div>
                <div className="detail-body">

                    <div className="detail-section">
                        <strong>Age:</strong> {patient.age || 'N/A'}
                    </div>
                    <div className="detail-section">
                        <strong>ID:</strong> {patient.id}
                    </div>
                    <div className="detail-section">
                        <strong>Priority:</strong> {patient.priority}
                    </div>
                    <div className="detail-section">
                        <strong>Symptoms:</strong> {patient.symptoms || 'No symptoms recorded'}
                    </div>
                    <div className="detail-section">
                        <strong>Vitals:</strong> {patient.vitals || 'Not recorded'}
                    </div>
                    <div className="detail-section">
                        <strong>Intake Timestamp:</strong> {patient.timestamp ? new Date(patient.timestamp).toLocaleString() : 'Unknown'}
                    </div>
                    <div className="detail-section">
                        <strong>Care Zone:</strong> {patient.assignedCareZone || 'Pending'}
                    </div>
                    <div className="detail-section">
                        <strong>Assigned Room:</strong> {patient.assignedRoom || 'Pending'}
                    </div>
                    <div className="detail-section">
                        <strong>Assigned Doctor:</strong> {patient.assignedDoctorName || 'Unassigned'}
                    </div>
                    <div className="detail-section">
                        <strong>Assigned Nurse:</strong> {patient.assignedNurseName || 'Pending'}
                    </div>
                    <div className="detail-section">
                        <strong>Support Team:</strong> {patient.assignedSupportStaff || 'General support'}
                    </div>
                    <div className="detail-section">
                        <strong>Equipment:</strong> {Array.isArray(patient.assignedEquipment) && patient.assignedEquipment.length > 0
                            ? patient.assignedEquipment.join(', ')
                            : 'Standard triage kit'}
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}
