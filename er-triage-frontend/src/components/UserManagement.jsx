import React, { useState, useEffect } from 'react';
import { fetchUsers, deleteUser } from '../api/userApi.js';

const ROLE_ICONS = { ADMIN: '👑', DOCTOR: '🩺', NURSE: '💉', RECEPTIONIST: '📋' };
const ROLES = ['ALL', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this staff member?')) return;
        try {
            await deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) { console.error('Failed to delete:', err); }
    };

    const filtered = filter === 'ALL' ? users : users.filter(u => u.role === filter);
    const doctors = users.filter(u => u.role === 'DOCTOR').length;
    const nurses = users.filter(u => u.role === 'NURSE').length;

    return (
        <div className="user-management">
            <div className="user-mgmt-header">
                <div>
                    <div className="user-mgmt-title">👥 Staff Directory</div>
                    <div className="user-mgmt-subtitle">Manage hospital staff, doctors, nurses, and support personnel</div>
                </div>
                <div className="user-mgmt-stats">
                    <div className="user-mgmt-stat">
                        <div className="user-mgmt-stat-value">{users.length}</div>
                        <div className="user-mgmt-stat-label">Total Staff</div>
                    </div>
                    <div className="user-mgmt-stat">
                        <div className="user-mgmt-stat-value">{doctors}</div>
                        <div className="user-mgmt-stat-label">Doctors</div>
                    </div>
                    <div className="user-mgmt-stat">
                        <div className="user-mgmt-stat-value">{nurses}</div>
                        <div className="user-mgmt-stat-label">Nurses</div>
                    </div>
                </div>
            </div>

            <div className="user-filters">
                {ROLES.map(role => (
                    <button key={role} className={`filter-btn ${filter === role ? 'active' : ''}`}
                        onClick={() => setFilter(role)}>
                        {role === 'ALL' ? '🏥 All' : `${ROLE_ICONS[role]} ${role}`}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="users-empty"><div className="users-empty-icon">⏳</div>Loading staff...</div>
            ) : filtered.length === 0 ? (
                <div className="users-empty"><div className="users-empty-icon">👤</div>No staff members found</div>
            ) : (
                <div className="user-grid">
                    {filtered.map(user => (
                        <div key={user.id} className="user-card">
                            <div className="user-card-header">
                                <div className="user-avatar">{ROLE_ICONS[user.role] || '👤'}</div>
                                <div className="user-card-info">
                                    <div className="user-card-name">{user.fullName}</div>
                                    <div className="user-card-email">{user.email}</div>
                                </div>
                            </div>
                            <div className="user-card-details">
                                <span className={`user-detail-chip role-${user.role}`}>{user.role}</span>
                                {user.department && <span className="user-detail-chip">{user.department}</span>}
                                <span className="user-detail-chip">{user.active ? '🟢 Active' : '🔴 Inactive'}</span>
                            </div>
                            <div className="user-card-actions">
                                <button className="user-delete-btn" onClick={() => handleDelete(user.id)}>🗑 Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
