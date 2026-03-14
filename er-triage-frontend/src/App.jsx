import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header.jsx';
import VoiceCapture from './components/VoiceCapture.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import TaskManager from './components/TaskManager.jsx';
import UserManagement from './components/UserManagement.jsx';
import Analytics from './components/Analytics.jsx';
import RecycleBin from './components/RecycleBin.jsx';
import ResourceAllocation from './components/ResourceAllocation.jsx';
import Login from './components/Login.jsx';
import { fetchRecycleBinPatients } from './api/patientApi.js';
import { getStoredToken, getStoredUser, clearAuth } from './api/authApi.js';

const RECYCLE_BIN_ACCESS_ROLES = ['ADMIN', 'DOCTOR', 'SUPERVISOR'];

function canAccessRecycleBin(user) {
    return RECYCLE_BIN_ACCESS_ROLES.includes(user?.role);
}

export default function App() {
    const [user, setUser] = useState(getStoredUser);
    const [isAuthenticated, setIsAuthenticated] = useState(!!getStoredToken());
    const [patients, setPatients] = useState([]);
    const [newPatient, setNewPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('triage');
    const [targetPatientId, setTargetPatientId] = useState(null);
    const [recycleBinCount, setRecycleBinCount] = useState(0);
    const shellRef = useRef(null);
    const frameRef = useRef(null);
    const recycleBinAllowed = canAccessRecycleBin(user);

    const handleLogin = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    };

    const handleSignOut = () => {
        clearAuth();
        setUser(null);
        setIsAuthenticated(false);
        setRecycleBinCount(0);
        setActiveTab('triage');
    };

    const handlePatientAdded = (patient) => {
        setNewPatient(patient);
        setTimeout(() => setNewPatient(null), 100);
    };

    const handlePatientRestored = useCallback((patient) => {
        if (!patient?.id) return;
        setNewPatient(patient);
        setTargetPatientId(patient.id);
        setActiveTab('triage');
        setTimeout(() => setNewPatient(null), 100);
    }, []);

    const refreshRecycleBinCount = useCallback(async () => {
        if (!recycleBinAllowed || !getStoredToken()) {
            setRecycleBinCount(0);
            return;
        }

        try {
            const archivedPatients = await fetchRecycleBinPatients();
            setRecycleBinCount(Array.isArray(archivedPatients) ? archivedPatients.length : 0);
        } catch {
            setRecycleBinCount(0);
        }
    }, [recycleBinAllowed]);

    const handlePatientArchived = useCallback(() => {
        setRecycleBinCount(prev => prev + 1);
    }, []);

    const handleRecycleBinCountChange = useCallback((count) => {
        setRecycleBinCount(Math.max(0, count));
    }, []);

    const handlePatientsChange = useCallback((updatedList) => {
        setPatients(updatedList);
    }, []);

    useEffect(() => {
        return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    }, []);

    useEffect(() => {
        if (!recycleBinAllowed) {
            setRecycleBinCount(0);
            if (activeTab === 'recycle') {
                setActiveTab('triage');
            }
            return;
        }

        refreshRecycleBinCount();
        const interval = setInterval(refreshRecycleBinCount, 30000);
        return () => clearInterval(interval);
    }, [activeTab, recycleBinAllowed, refreshRecycleBinCount]);

    const handlePatientSearchSelect = (patientId) => {
        setTargetPatientId(patientId);
        setActiveTab('triage');
    };

    const handleTargetPatientScrolled = () => {
        setTargetPatientId(null);
    };

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

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="app-shell" ref={shellRef} onMouseMove={handlePointerMove}>
            <div className="ambient-particles" aria-hidden="true">
                <span className="particle p1"></span>
                <span className="particle p2"></span>
                <span className="particle p3"></span>
                <span className="particle p4"></span>
                <span className="particle p5"></span>
            </div>
            <Header 
                patients={patients} 
                user={user} 
                onSignOut={handleSignOut} 
                onPatientSearchSelect={handlePatientSearchSelect}
            />
            <main className={`main-layout ${activeTab === 'triage' ? 'triage-layout' : ''}`}>
                <div className="tab-navigation">
                    <button className={`tab-btn ${activeTab === 'triage' ? 'active' : ''}`}
                        onClick={() => setActiveTab('triage')}>🩺 Patient Triage</button>
                    {recycleBinAllowed && (
                        <button className={`tab-btn ${activeTab === 'recycle' ? 'active' : ''}`}
                            onClick={() => setActiveTab('recycle')}>
                            <span>♻️ Recycle Bin</span>
                            <span className="tab-badge">{recycleBinCount}</span>
                        </button>
                    )}
                    <button className={`tab-btn ${activeTab === 'resource' ? 'active' : ''}`}
                        onClick={() => setActiveTab('resource')}>🏥 Resource Allocation</button>
                    <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}>👥 Staff Directory</button>
                    <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}>📊 Analytics</button>
                </div>
                {activeTab === 'triage' ? (
                    <>
                        <VoiceCapture onPatientAdded={handlePatientAdded} />
                        <div className="content-wrapper">
                            <div className="left-section">
                                <KanbanBoard 
                                    newPatient={newPatient} 
                                    onPatientsChange={handlePatientsChange}
                                    highlightPatientId={targetPatientId}
                                    onHighlighted={handleTargetPatientScrolled}
                                    currentUser={user}
                                    onPatientArchived={handlePatientArchived}
                                />
                            </div>
                            <div className="right-section">
                                <TaskManager />
                            </div>
                        </div>
                    </>
                ) : activeTab === 'users' ? (
                    <UserManagement />
                ) : activeTab === 'recycle' ? (
                    <RecycleBin onPatientRestored={handlePatientRestored} onCountChange={handleRecycleBinCountChange} />
                ) : activeTab === 'resource' ? (
                    <ResourceAllocation />
                ) : activeTab === 'analytics' ? (
                    <Analytics />
                ) : null}
            </main>
        </div>
    );
}
