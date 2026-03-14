import React, { useState, useRef, useEffect, useCallback } from 'react';
import { login, register, storeAuth } from '../api/authApi.js';
import BrandMark from './BrandMark.jsx';

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

  // Mouse tracking for interactive bubble
  const containerRef = useRef(null);
  const interactiveBubbleRef = useRef(null);
  const rafRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const container = containerRef.current;
    const bubble = interactiveBubbleRef.current;
    if (!container || !bubble) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      bubble.style.transform = `translate(${dx}px, ${dy}px)`;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

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
    <div className="login-container" ref={containerRef}>
      {/* Animated Bubble Background */}
      <div className="bubble-bg" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" style={{position:'absolute',width:0,height:0}}>
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>
        <div className="bubble-layer">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
          <div className="bubble bubble-4"></div>
          <div className="bubble bubble-5"></div>
          <div className="bubble bubble-6"></div>
          <div className="bubble bubble-interactive" ref={interactiveBubbleRef}></div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><BrandMark size={76} /></div>
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
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
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
                  <option value="Gynecology">Gynecology</option>
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
                    <option value="Gynecologist">Gynecologist</option>
                  </select>
                </div>
              )}
            </>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login-auth-footer">
          <p>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button type="button" className="toggle-btn"
              onClick={() => { setIsSignup(!isSignup); setError(''); }}>
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

      </div>

    </div>
  );
}
