import React, { useState } from 'react';
import { login, register, storeAuth } from '../api/authApi.js';

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'DOCTOR',
    department: 'Emergency',
    specialization: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        const data = await register({
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          specialization: formData.role === 'DOCTOR' ? formData.specialization : null
        });
        storeAuth(data.token, data.user);
        onLogin(data.user);
      } else {
        const data = await login(formData.username, formData.password);
        storeAuth(data.token, data.user);
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏥</div>
          <h1>ER TRIAGE SPRINT</h1>
          <p>Emergency Room Intelligence System</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {isSignup && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="fullName" placeholder="Dr. Jane Doe"
                value={formData.fullName} onChange={handleChange} required={isSignup} />
            </div>
          )}

          <div className="form-group">
            <label>Username</label>
            <input type="text" name="username" placeholder="jdoe"
              value={formData.username} onChange={handleChange} required />
          </div>

          {isSignup && (
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" placeholder="doctor@hospital.com"
                value={formData.email} onChange={handleChange} required={isSignup} />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="••••••••"
              value={formData.password} onChange={handleChange} required />
          </div>

          {isSignup && (
            <>
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select name="department" value={formData.department} onChange={handleChange}>
                  <option value="Emergency">Emergency</option>
                  <option value="ICU">ICU</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
              </div>
              {formData.role === 'DOCTOR' && (
                <div className="form-group">
                  <label>Specialization</label>
                  <select name="specialization" value={formData.specialization} onChange={handleChange}>
                    <option value="">— Select Specialization —</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Pulmonologist">Pulmonologist</option>
                    <option value="Neurologist">Neurologist</option>
                    <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                    <option value="Gastroenterologist">Gastroenterologist</option>
                    <option value="General Surgeon">General Surgeon</option>
                    <option value="Endocrinologist">Endocrinologist</option>
                    <option value="Allergist">Allergist</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="General Physician">General Physician</option>
                  </select>
                </div>
              )}
            </>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button type="button" className="toggle-btn"
              onClick={() => { setIsSignup(!isSignup); setError(''); }}>
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="demo-users">
          <p className="demo-label">Demo Credentials:</p>
          <small>Username: <strong>dr.smith</strong> — Password: <strong>password123</strong></small>
        </div>
      </div>
    </div>
  );
}
