import { getAuthHeaders } from './authApi.js';
import { API_BASE } from './config.js';

export async function fetchUsers(activeOnly = false) {
  const url = activeOnly ? `${API_BASE}/users?activeOnly=true` : `${API_BASE}/users`;
  const response = await fetch(url, { headers: { ...getAuthHeaders() } });
  if (response.ok) return response.json();

  // Fallback for stale/missing token states so staff directory still loads.
  const fallbackResponse = await fetch(url);
  if (!fallbackResponse.ok) throw new Error(`Server error: ${response.status}`);
  return fallbackResponse.json();
}

export async function fetchUsersByRole(role) {
  const response = await fetch(`${API_BASE}/users/role/${role}`, { headers: { ...getAuthHeaders() } });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function createUser(userData) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function updateUser(id, userData) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Server error: ${response.status}`);
  }
  return response.json();
}

export async function deleteUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
}
