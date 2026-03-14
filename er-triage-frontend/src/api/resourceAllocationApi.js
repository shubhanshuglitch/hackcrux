import { getAuthHeaders } from './authApi.js';
import { API_BASE } from './config.js';

async function parseResponse(response) {
  if (response.ok) {
    return response.json();
  }

  let errorMessage = `Server error: ${response.status}`;
  try {
    const payload = await response.json();
    if (payload?.error) {
      errorMessage = payload.error;
    }
  } catch {
    // Ignore JSON parse failures and fall back to status-based error.
  }
  throw new Error(errorMessage);
}

export async function fetchResourceZones() {
  const response = await fetch(`${API_BASE}/resource-allocation/zones`, {
    headers: { ...getAuthHeaders() },
  });
  return parseResponse(response);
}

export async function createResourceZone(payload) {
  const response = await fetch(`${API_BASE}/resource-allocation/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function createResourceRoom(payload) {
  const response = await fetch(`${API_BASE}/resource-allocation/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}