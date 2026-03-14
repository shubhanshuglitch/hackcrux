import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { completeTask, fetchTasks } from '../api/taskApi.js';

const ASSIGNED_TASK_ROLES = ['DOCTOR', 'NURSE'];

function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

function getAssignee(task) {
    return task?.assignedTo || task?.assignee || task?.assignedUser || '';
}

function belongsToUser(task, user) {
    const assignee = normalize(getAssignee(task));
    if (!assignee) return false;
    const username = normalize(user?.username);
    const fullName = normalize(user?.fullName);
    return assignee === username || assignee === fullName;
}

function formatTime(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleString();
}

export default function AssignedTasksTab({ user }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const canAccess = ASSIGNED_TASK_ROLES.includes(user?.role);

    const loadTasks = useCallback(async () => {
        if (!canAccess) {
            setTasks([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const allTasks = await fetchTasks();
            setTasks(Array.isArray(allTasks) ? allTasks : []);
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to load assigned tasks.');
        } finally {
            setLoading(false);
        }
    }, [canAccess]);

    useEffect(() => {
        loadTasks();
        const interval = setInterval(loadTasks, 6000);
        return () => clearInterval(interval);
    }, [loadTasks]);

    const myTasks = useMemo(() => tasks.filter(task => belongsToUser(task, user)), [tasks, user]);
    const pendingTasks = useMemo(() => myTasks.filter(task => !task.completed), [myTasks]);

    const markDone = async (taskId) => {
        try {
            await completeTask(taskId);
            setTasks(prev => prev.map(task => task.id === taskId ? { ...task, completed: true } : task));
        } catch (err) {
            setError(err.message || 'Failed to complete task.');
        }
    };

    if (!canAccess) {
        return <div className="assigned-task-state error">Only doctors and nurses can access assigned tasks.</div>;
    }

    return (
        <section className="assigned-task-shell">
            <div className="assigned-task-hero">
                <div>
                    <div className="assigned-task-kicker">Focused Worklist</div>
                    <h2>My Assigned Tasks</h2>
                    <p>Showing only tasks assigned to {user?.fullName || user?.username || 'you'}.</p>
                </div>
                <button className="assigned-task-refresh" onClick={loadTasks}>Refresh</button>
            </div>

            {loading ? <div className="assigned-task-state">Loading your tasks...</div> : null}
            {error ? <div className="assigned-task-state error">{error}</div> : null}

            {!loading && !error && (
                <>
                    <div className="assigned-task-stats">
                        <div><strong>{myTasks.length}</strong><span>Total assigned</span></div>
                        <div><strong>{pendingTasks.length}</strong><span>Pending</span></div>
                    </div>

                    {myTasks.length === 0 ? (
                        <div className="assigned-task-state">No tasks are assigned to you yet.</div>
                    ) : (
                        <div className="assigned-task-list">
                            {myTasks.map(task => (
                                <div key={task.id} className={`assigned-task-item ${task.completed ? 'done' : 'pending'}`}>
                                    <div>
                                        <div className="assigned-task-title">{task.title}</div>
                                        <div className="assigned-task-meta">{task.priority || 'normal'} • {formatTime(task.createdAt)}</div>
                                    </div>
                                    {!task.completed ? (
                                        <button className="assigned-task-complete" onClick={() => markDone(task.id)}>Mark Done</button>
                                    ) : (
                                        <span className="assigned-task-completed-label">Completed</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}