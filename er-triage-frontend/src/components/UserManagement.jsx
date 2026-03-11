import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fetchUsers, createUser, updateUser, deleteUser } from '../api/userApi.js';

const ROLE_ICONS = { ADMIN: '👑', DOCTOR: '🩺', NURSE: '💉', RECEPTIONIST: '📋' };
const ROLES = ['ALL', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];
const DEPARTMENTS = ['Emergency Medicine', 'Emergency Department', 'Administration', 'Front Desk', 'ICU', 'Surgery'];

const emptyForm = { username: '', fullName: '', email: '', role: 'DOCTOR', department: 'Emergency Medicine', active: true };

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState(null);

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoadError('');
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
            setLoadError('Failed to load staff directory. Please refresh.');
        } finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        try {
            await deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            setDeleteCandidate(null);
        } catch (err) { console.error('Failed to delete:', err); }
    };

    const openAddForm = () => {
        setEditingUser(null);
        setFormData({ ...emptyForm });
        setFormError('');
        setShowAddForm(true);
    };

    const openEditForm = (user) => {
        setShowAddForm(false);
        setFormData({
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            department: user.department || 'Emergency Medicine',
            active: user.active !== false,
        });
        setFormError('');
        setEditingUser(user);
    };

    const closeForm = () => {
        setShowAddForm(false);
        setEditingUser(null);
        setFormError('');
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const validateForm = () => {
        if (!formData.fullName.trim()) return 'Full name is required';
        if (!formData.email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
        if (!editingUser && !formData.username.trim()) return 'Username is required';
        if (!editingUser && formData.username.length < 3) return 'Username must be at least 3 characters';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const error = validateForm();
        if (error) { setFormError(error); return; }

        setSaving(true);
        setFormError('');
        try {
            if (editingUser) {
                const updated = await updateUser(editingUser.id, formData);
                setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u));
            } else {
                const created = await createUser(formData);
                setUsers(prev => [...prev, created]);
            }
            closeForm();
        } catch (err) {
            setFormError(err.message || 'Failed to save');
        } finally { setSaving(false); }
    };

    const filtered = filter === 'ALL' ? users : users.filter(u => u.role === filter);
    const doctors = users.filter(u => u.role === 'DOCTOR').length;
    const nurses = users.filter(u => u.role === 'NURSE').length;

    const isFormOpen = showAddForm || editingUser;
    const portalTarget = typeof document !== 'undefined' ? document.body : null;

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

            <div className="user-toolbar">
                <div className="user-filters">
                    {ROLES.map(role => (
                        <button key={role} className={`filter-btn ${filter === role ? 'active' : ''}`}
                            onClick={() => setFilter(role)}>
                            {role === 'ALL' ? '🏥 All' : `${ROLE_ICONS[role]} ${role}`}
                        </button>
                    ))}
                </div>
                <button className="add-staff-btn" onClick={openAddForm}>
                    <span>➕</span> Add Staff
                </button>
            </div>

            {/* Add / Edit Form */}
            {isFormOpen && portalTarget && createPortal(
                <div className="staff-form-overlay" onClick={closeForm}>
                    <div className="staff-form-modal" onClick={e => e.stopPropagation()}>
                        <div className="staff-form-header">
                            <h3>{editingUser ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'}</h3>
                            <button className="staff-form-close" onClick={closeForm}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="staff-form">
                            {!editingUser && (
                                <div className="form-group">
                                    <label>Username</label>
                                    <input type="text" name="username" value={formData.username}
                                        onChange={handleChange} placeholder="e.g. dr.jones" autoFocus />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" name="fullName" value={formData.fullName}
                                    onChange={handleChange} placeholder="e.g. Dr. Amy Jones"
                                    autoFocus={!!editingUser} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email}
                                    onChange={handleChange} placeholder="e.g. amy.jones@hospital.com" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Role</label>
                                    <select name="role" value={formData.role} onChange={handleChange}>
                                        <option value="DOCTOR">🩺 Doctor</option>
                                        <option value="NURSE">💉 Nurse</option>
                                        <option value="ADMIN">👑 Admin</option>
                                        <option value="RECEPTIONIST">📋 Receptionist</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Department</label>
                                    <select name="department" value={formData.department} onChange={handleChange}>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            {editingUser && (
                                <div className="form-group checkbox-group">
                                    <label>
                                        <input type="checkbox" name="active" checked={formData.active}
                                            onChange={handleChange} />
                                        Active
                                    </label>
                                </div>
                            )}
                            {formError && <div className="form-error">⚠️ {formError}</div>}
                            <div className="form-actions">
                                <button type="button" className="form-cancel-btn" onClick={closeForm}>Cancel</button>
                                <button type="submit" className="form-submit-btn" disabled={saving}>
                                    {saving ? 'Saving...' : (editingUser ? 'Update Staff' : 'Add Staff')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                portalTarget,
            )}

            {loading ? (
                <div className="users-empty"><div className="users-empty-icon">⏳</div>Loading staff...</div>
            ) : loadError ? (
                <div className="users-empty"><div className="users-empty-icon">⚠️</div>{loadError}</div>
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
                                <button className="user-edit-btn" onClick={() => openEditForm(user)}>✏️ Edit</button>
                                <button className="user-delete-btn" onClick={() => setDeleteCandidate(user)}>🗑 Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {deleteCandidate && portalTarget && createPortal(
                <div className="staff-form-overlay" onClick={() => setDeleteCandidate(null)}>
                    <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="staff-form-header delete-header">
                            <h3>Confirm Staff Removal</h3>
                            <button className="staff-form-close" onClick={() => setDeleteCandidate(null)}>✕</button>
                        </div>
                        <div className="delete-confirm-body">
                            <p>
                                Remove <strong>{deleteCandidate.fullName}</strong> from Staff Directory?
                            </p>
                            <p className="delete-note">This action cannot be undone.</p>
                        </div>
                        <div className="delete-confirm-actions">
                            <button className="form-cancel-btn" onClick={() => setDeleteCandidate(null)}>Cancel</button>
                            <button className="user-delete-btn danger" onClick={() => handleDelete(deleteCandidate.id)}>Remove</button>
                        </div>
                    </div>
                </div>,
                portalTarget,
            )}
        </div>
    );
}
