import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header.jsx';
import VoiceCapture from './components/VoiceCapture.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import TaskManager from './components/TaskManager.jsx';
import UserManagement from './components/UserManagement.jsx';

export default function App() {
    const [patients, setPatients] = useState([]);
    const [newPatient, setNewPatient] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('triage');
    const shellRef = useRef(null);
    const frameRef = useRef(null);

    const handlePatientAdded = (patient) => {
        setNewPatient(patient);
        setTimeout(() => setNewPatient(null), 100);
    };

    const handlePatientsChange = useCallback((updatedList) => {
        setPatients(updatedList);
    }, []);

    const handleAddTask = (task) => {
        setTasks(prev => [{ id: Date.now(), ...task, completed: false }, ...prev]);
    };

    const handleCompleteTask = (taskId) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
    };

    const handleDeleteTask = (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    useEffect(() => {
        return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    }, []);

    const handlePointerMove = useCallback((event) => {
        if (!shellRef.current) return;
        const rect = shellRef.current.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => {
            if (!shellRef.current) return;
            shellRef.current.style.setProperty('--pointer-x', `${Math.max(0, Math.min(100, x))}%`);
            shellRef.current.style.setProperty('--pointer-y', `${Math.max(0, Math.min(100, y))}%`);
        });
    }, []);

    return (
        <div className="app-shell" ref={shellRef} onMouseMove={handlePointerMove}>
            <div className="ambient-particles" aria-hidden="true">
                <span className="particle p1"></span>
                <span className="particle p2"></span>
                <span className="particle p3"></span>
                <span className="particle p4"></span>
                <span className="particle p5"></span>
            </div>
            <Header patients={patients} />
            <div className="tab-navigation">
                <button className={`tab-btn ${activeTab === 'triage' ? 'active' : ''}`}
                    onClick={() => setActiveTab('triage')}>🏥 Patient Triage</button>
                <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}>👥 Staff Directory</button>
            </div>
            <main className="main-layout">
                {activeTab === 'triage' ? (
                    <>
                        <VoiceCapture onPatientAdded={handlePatientAdded} />
                        <div className="content-wrapper">
                            <div className="left-section">
                                <KanbanBoard newPatient={newPatient} onPatientsChange={handlePatientsChange} />
                            </div>
                            <div className="right-section">
                                <TaskManager
                                    tasks={tasks}
                                    onAddTask={handleAddTask}
                                    onCompleteTask={handleCompleteTask}
                                    onDeleteTask={handleDeleteTask}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <UserManagement />
                )}
            </main>
        </div>
    );
}
