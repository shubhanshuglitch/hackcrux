import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchUsers } from '../api/userApi.js';
import { fetchPatients } from '../api/patientApi.js';
import { fetchTasks } from '../api/taskApi.js';

const REFRESH_INTERVAL_MS = 8000;

function normalizeName(value) {
    if (!value) return '';
    return String(value)
        .toLowerCase()
        .replace(/\b(dr|mr|mrs|ms)\.?\s+/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getTaskAssignee(task) {
    return task?.assignedTo || task?.assignee || task?.assignedUser || '';
}

function formatAge(patient) {
    return patient?.age ? `${patient.age}y` : 'Age N/A';
}

function formatPriority(priority) {
    if (!priority) return 'UNKNOWN';
    return String(priority).toUpperCase();
}

function StaffMemberCard({ user, patients, tasks }) {
    const pendingTasks = tasks.filter(task => !task.completed);

    return (
        <article className="staff-assign-card">
            <header className="staff-assign-card-header">
                <div>
                    <h4>{user.fullName || user.username}</h4>
                    <p>{user.department || 'Emergency Department'}</p>
                </div>
                <div className="staff-assign-card-counts">
                    <span>{patients.length} patients</span>
                    <span>{pendingTasks.length} open tasks</span>
                </div>
            </header>

            <div className="staff-assign-block">
                <div className="staff-assign-block-title">Assigned Patients</div>
                {patients.length === 0 ? (
                    <div className="staff-assign-empty">No patients assigned right now.</div>
                ) : (
                    <div className="staff-assign-chip-list">
                        {patients.map(patient => (
                            <div className="staff-patient-chip" key={patient.id}>
                                <strong>{patient.name || 'Unknown'}</strong>
                                <span>{formatAge(patient)} • {formatPriority(patient.priority)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="staff-assign-block">
                <div className="staff-assign-block-title">Assigned Tasks</div>
                {tasks.length === 0 ? (
                    <div className="staff-assign-empty">No tasks mapped to this staff member.</div>
                ) : (
                    <div className="staff-assign-task-list">
                        {tasks.map(task => (
                            <div className={`staff-task-row ${task.completed ? 'done' : 'pending'}`} key={task.id}>
                                <span className="staff-task-title">{task.title}</span>
                                <span className="staff-task-meta">{task.priority || 'normal'}{task.completed ? ' • done' : ''}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}

export default function StaffManagementDirectory() {
    const [users, setUsers] = useState([]);
    const [patients, setPatients] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDirectory = useCallback(async () => {
        try {
            const [staffData, patientData, taskData] = await Promise.all([
                fetchUsers(true),
                fetchPatients(),
                fetchTasks().catch(() => []),
            ]);
            setUsers(Array.isArray(staffData) ? staffData : []);
            setPatients(Array.isArray(patientData) ? patientData : []);
            setTasks(Array.isArray(taskData) ? taskData : []);
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to load staff assignment directory.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDirectory();
        const interval = setInterval(loadDirectory, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadDirectory]);

    const doctors = useMemo(() => users.filter(user => user.role === 'DOCTOR'), [users]);
    const nurses = useMemo(() => users.filter(user => user.role === 'NURSE'), [users]);

    const mapPatientsForUser = useCallback((user, role) => {
        const candidateNames = [normalizeName(user.fullName), normalizeName(user.username)].filter(Boolean);
        return patients.filter(patient => {
            const assigned = role === 'DOCTOR'
                ? normalizeName(patient.assignedDoctorName)
                : normalizeName(patient.assignedNurseName);
            if (!assigned) return false;
            return candidateNames.some(name => name === assigned || assigned.includes(name) || name.includes(assigned));
        });
    }, [patients]);

    const mapTasksForUser = useCallback((user) => {
        const candidateNames = [normalizeName(user.fullName), normalizeName(user.username)].filter(Boolean);
        return tasks.filter(task => {
            const taskAssignee = normalizeName(getTaskAssignee(task));
            if (!taskAssignee) return false;
            return candidateNames.some(name => name === taskAssignee || taskAssignee.includes(name) || name.includes(taskAssignee));
        });
    }, [tasks]);

    const unassignedTasks = useMemo(() => tasks.filter(task => !getTaskAssignee(task)), [tasks]);

    return (
        <section className="staff-assignment-shell">
            <div className="staff-assignment-hero">
                <div>
                    <div className="staff-assignment-kicker">Operations View</div>
                    <h2>Staff Management Directory</h2>
                    <p>Track which patients and tasks are assigned to doctors and nurses in real time.</p>
                </div>
                <button className="staff-assignment-refresh" onClick={loadDirectory}>Refresh</button>
            </div>

            {loading ? <div className="staff-assignment-state">Loading staff assignments...</div> : null}
            {error ? <div className="staff-assignment-state error">{error}</div> : null}

            {!loading && !error && (
                <>
                    <div className="staff-assignment-section">
                        <div className="staff-assignment-section-header">
                            <h3>Doctors</h3>
                            <span>{doctors.length} staff</span>
                        </div>
                        {doctors.length === 0 ? (
                            <div className="staff-assignment-state">No doctors found.</div>
                        ) : (
                            <div className="staff-assignment-grid">
                                {doctors.map(doctor => (
                                    <StaffMemberCard
                                        key={doctor.id}
                                        user={doctor}
                                        patients={mapPatientsForUser(doctor, 'DOCTOR')}
                                        tasks={mapTasksForUser(doctor)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="staff-assignment-section">
                        <div className="staff-assignment-section-header">
                            <h3>Nurses</h3>
                            <span>{nurses.length} staff</span>
                        </div>
                        {nurses.length === 0 ? (
                            <div className="staff-assignment-state">No nurses found.</div>
                        ) : (
                            <div className="staff-assignment-grid">
                                {nurses.map(nurse => (
                                    <StaffMemberCard
                                        key={nurse.id}
                                        user={nurse}
                                        patients={mapPatientsForUser(nurse, 'NURSE')}
                                        tasks={mapTasksForUser(nurse)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="staff-assignment-section">
                        <div className="staff-assignment-section-header">
                            <h3>Unassigned Tasks</h3>
                            <span>{unassignedTasks.length} tasks</span>
                        </div>
                        {unassignedTasks.length === 0 ? (
                            <div className="staff-assignment-state">No unassigned tasks.</div>
                        ) : (
                            <div className="staff-assignment-task-pool">
                                {unassignedTasks.map(task => (
                                    <div className={`staff-task-row ${task.completed ? 'done' : 'pending'}`} key={task.id}>
                                        <span className="staff-task-title">{task.title}</span>
                                        <span className="staff-task-meta">{task.priority || 'normal'}{task.completed ? ' • done' : ''}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}