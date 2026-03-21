import { API_BASE } from './config.js';

const AUTH_API_BASE = `${API_BASE}/auth`;

/**
 * Fetch with timeout and automatic retry for cold-start resilience.
 * Render free tier can take 30-60s to wake up, so we retry on network failures.
 */
async function resilientFetch(url, options = {}, { retries = 2, timeoutMs = 30000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        if (err.name === 'AbortError') {
          throw new Error('Server is taking too long to respond. It may be starting up — please try again in 30 seconds.');
        }
        throw new Error('Unable to reach the server. Please check your connection or try again shortly.');
      }

      // Wait before retrying (increasing delay: 3s, 6s)
      await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
    }
  }
}

export async function login(username, password) {
  const response = await resilientFetch(`${AUTH_API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function register(userData) {
  const response = await resilientFetch(`${AUTH_API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function fetchCurrentUser(token) {
  const response = await resilientFetch(`${AUTH_API_BASE}/me`, {
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
