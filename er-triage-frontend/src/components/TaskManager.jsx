import React, { useState, useEffect, useCallback } from 'react';
import { fetchTasks, createTask, completeTask, deleteTask } from '../api/taskApi.js';

const PRIORITY_BADGES = { high: '🔴', normal: '🟡', low: '🟢' };

export default function TaskManager() {
    const [tasks, setTasks] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('normal');

    const loadTasks = useCallback(async () => {
        try {
            const data = await fetchTasks();
            setTasks(data);
        } catch (err) { console.error('Failed to load tasks:', err); }
    }, []);

    useEffect(() => { loadTasks(); }, [loadTasks]);

    const pending = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    const handleAdd = async () => {
        if (!title.trim()) return;
        try {
            const task = await createTask(title.trim(), priority);
            setTasks(prev => [task, ...prev]);
            setTitle('');
            setExpanded(false);
        } catch (err) { console.error('Failed to create task:', err); }
    };

    const handleComplete = async (taskId) => {
        try {
            await completeTask(taskId);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
        } catch (err) { console.error('Failed to complete task:', err); }
    };

    const handleDelete = async (taskId) => {
        try {
            await deleteTask(taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) { console.error('Failed to delete task:', err); }
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div className="task-manager-container">
            <div className="task-panel">
                <div className="task-header">
                    <div className="task-title-section">
                        <span className="task-icon">📋</span>
                        <div>
                            <div className="task-title">Task Manager</div>
                            <div className="task-subtitle">Track team assignments</div>
                        </div>
                    </div>
                    <button className={`task-expand-btn ${expanded ? 'expanded' : ''}`}
                        onClick={() => setExpanded(!expanded)}>
                        {expanded ? '−' : '+'}
                    </button>
                </div>

                {expanded && (
                    <div className="task-input-section">
                        <input className="task-input" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="Enter task description..." onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                        <select className="task-priority-select" value={priority} onChange={e => setPriority(e.target.value)}>
                            <option value="high">🔴 High Priority</option>
                            <option value="normal">🟡 Normal Priority</option>
                            <option value="low">🟢 Low Priority</option>
                        </select>
                        <button className="task-add-btn" onClick={handleAdd} disabled={!title.trim()}>
                            <span className="task-add-icon">➕</span> Add Task
                        </button>
                    </div>
                )}

                <div className="task-stats">
                    <div className="task-stat">
                        <div className="stat-label">Pending</div>
                        <div className="stat-value pending">{pending.length}</div>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="task-stat">
                        <div className="stat-label">Completed</div>
                        <div className="stat-value completed">{completedTasks.length}</div>
                    </div>
                </div>

                <div className="task-list">
                    {tasks.length === 0 ? (
                        <div className="task-empty">
                            <div className="empty-icon">📝</div>
                            <p>No tasks yet</p>
                            <div className="empty-hint">Click + to add a task</div>
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className={`task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`}>
                                <div className="task-item-header">
                                    <input type="checkbox" className="task-checkbox"
                                        checked={task.completed} onChange={() => handleComplete(task.id)} />
                                    <span className="task-priority-badge">{PRIORITY_BADGES[task.priority]}</span>
                                    <div className="task-item-content">
                                        <div className="task-item-title">{task.title}</div>
                                        <div className="task-item-time">{formatTime(task.createdAt)}</div>
                                    </div>
                                </div>
                                <button className="task-delete-btn" onClick={() => handleDelete(task.id)}>✕</button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
