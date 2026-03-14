import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import VoiceCapture from './components/VoiceCapture.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import TaskManager from './components/TaskManager.jsx';
import AssignedTasksTab from './components/AssignedTasksTab.jsx';
import UserManagement from './components/UserManagement.jsx';
import StaffManagementDirectory from './components/StaffManagementDirectory.jsx';
import Analytics from './components/Analytics.jsx';
import RecycleBin from './components/RecycleBin.jsx';
import ResourceAllocation from './components/ResourceAllocation.jsx';
import Login from './components/Login.jsx';
import { fetchRecycleBinPatients } from './api/patientApi.js';
import { getStoredToken, getStoredUser, clearAuth } from './api/authApi.js';

const RECYCLE_BIN_ACCESS_ROLES = ['ADMIN', 'DOCTOR', 'SUPERVISOR'];
const ASSIGNED_TASK_ACCESS_ROLES = ['ADMIN', 'DOCTOR', 'NURSE'];
const RESOURCE_ALLOCATION_ACCESS_ROLES = ['ADMIN', 'SUPERVISOR', 'NURSE', 'RECEPTIONIST'];
const STAFF_DIRECTORY_ACCESS_ROLES = ['ADMIN', 'SUPERVISOR'];
const STAFF_MANAGEMENT_ACCESS_ROLES = ['ADMIN', 'SUPERVISOR'];

function canAccessRecycleBin(user) {
    return RECYCLE_BIN_ACCESS_ROLES.includes(user?.role);
}

function canAccessAssignedTasks(user) {
    return ASSIGNED_TASK_ACCESS_ROLES.includes(user?.role);
}

function canAccessResourceAllocation(user) {
    return RESOURCE_ALLOCATION_ACCESS_ROLES.includes(user?.role);
}

function canAccessStaffDirectory(user) {
    return STAFF_DIRECTORY_ACCESS_ROLES.includes(user?.role);
}

function canAccessStaffManagement(user) {
    return STAFF_MANAGEMENT_ACCESS_ROLES.includes(user?.role);
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
    const assignedTasksAllowed = canAccessAssignedTasks(user);
    const resourceAllowed = canAccessResourceAllocation(user);
    const staffDirectoryAllowed = canAccessStaffDirectory(user);
    const staffMgmtAllowed = canAccessStaffManagement(user);

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
        }
        if (!assignedTasksAllowed && activeTab === 'assignedTasks') {
            setActiveTab('triage');
        }
        if (!resourceAllowed && activeTab === 'resource') {
            setActiveTab('triage');
        }
        if (!staffDirectoryAllowed && activeTab === 'users') {
            setActiveTab('triage');
        }
        if (!staffMgmtAllowed && activeTab === 'staffMgmt') {
            setActiveTab('triage');
        }

        if (recycleBinAllowed) {
            refreshRecycleBinCount();
            const interval = setInterval(refreshRecycleBinCount, 30000);
            return () => clearInterval(interval);
        }
    }, [activeTab, recycleBinAllowed, assignedTasksAllowed, resourceAllowed, staffDirectoryAllowed, staffMgmtAllowed, refreshRecycleBinCount]);

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
                    
                    <button className={`tab-btn ${activeTab === 'resource' ? 'active' : ''}`}
                        onClick={() => setActiveTab('resource')}>🏥 Resource Allocation</button>
                    <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}>👥 Staff Directory</button>
                    <button className={`tab-btn ${activeTab === 'staffMgmt' ? 'active' : ''}`}
                        onClick={() => setActiveTab('staffMgmt')}>🧾 Staff Management Directory</button>
                    {assignedTasksAllowed && (
                        <button className={`tab-btn ${activeTab === 'assignedTasks' ? 'active' : ''}`}
                            onClick={() => setActiveTab('assignedTasks')}>✅ My Worklist</button>
                    )}
                    <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}>📊 Analytics</button>
                        {recycleBinAllowed && (
                        <button className={`tab-btn ${activeTab === 'recycle' ? 'active' : ''}`}
                            onClick={() => setActiveTab('recycle')}>
                            <span>♻️ </span>
                            <span className="tab-badge">{recycleBinCount}</span>
                        </button>
                    )}
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
                    <UserManagement currentUser={user} />
                ) : activeTab === 'recycle' ? (
                    <RecycleBin onPatientRestored={handlePatientRestored} onCountChange={handleRecycleBinCountChange} />
                ) : activeTab === 'resource' ? (
                    <ResourceAllocation />
                ) : activeTab === 'staffMgmt' ? (
                    <StaffManagementDirectory />
                ) : activeTab === 'assignedTasks' ? (
                    <AssignedTasksTab user={user} />
                ) : activeTab === 'analytics' ? (
                    <Analytics />
                ) : null}
            </main>
            <Footer onTabChange={setActiveTab} />
        </div>
    );
}
