import React, { useState, useCallback } from 'react';
import Header from './components/Header.jsx';
import VoiceCapture from './components/VoiceCapture.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';

export default function App() {
    const [patients, setPatients] = useState([]);
    const [newPatient, setNewPatient] = useState(null);

    const handlePatientAdded = (patient) => {
        setNewPatient(patient);
        // Reset after a tick so KanbanBoard can pick up new instances
        setTimeout(() => setNewPatient(null), 100);
    };

    const handlePatientsChange = useCallback((updatedList) => {
        setPatients(updatedList);
    }, []);

    return (
        <>
            <Header patients={patients} />
            <main className="main-layout">
                <VoiceCapture onPatientAdded={handlePatientAdded} />
                <KanbanBoard newPatient={newPatient} onPatientsChange={handlePatientsChange} />
            </main>
        </>
    );
}
