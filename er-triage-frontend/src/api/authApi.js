import { API_BASE } from './config.js';

const AUTH_API_BASE = `${API_BASE}/auth`;

export async function login(username, password) {
  const response = await fetch(`${AUTH_API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function register(userData) {
  const response = await fetch(`${AUTH_API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function fetchCurrentUser(token) {
  const response = await fetch(`${AUTH_API_BASE}/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Not authenticated');
  return response.json();
}

export function getStoredToken() {
  return localStorage.getItem('er_triage_token');
}

export function getStoredUser() {
  const raw = localStorage.getItem('er_triage_user');
  return raw ? JSON.parse(raw) : null;
}

export function storeAuth(token, user) {
  localStorage.setItem('er_triage_token', token);
  localStorage.setItem('er_triage_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('er_triage_token');
  localStorage.removeItem('er_triage_user');
}

export function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
