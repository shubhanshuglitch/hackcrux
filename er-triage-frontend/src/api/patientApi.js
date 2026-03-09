import { getAuthHeaders } from './authApi.js';

const API_BASE = 'http://localhost:8081/api';

export async function submitPatient(rawInput) {
  const response = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ rawInput }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function fetchPatients() {
  const response = await fetch(`${API_BASE}/patients`, { headers: { ...getAuthHeaders() } });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function searchPatients(query) {
  const response = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(query)}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function dismissPatient(id) {
  const response = await fetch(`${API_BASE}/patients/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
}

export async function retriagePatient(id, symptoms, vitals) {
  const response = await fetch(`${API_BASE}/patients/${id}/retriage`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ symptoms, vitals }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function dischargePatient(id, notes, performedBy) {
  const response = await fetch(`${API_BASE}/patients/${id}/discharge`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ notes, performedBy }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function handoffPatient(id, toDepartment, notes, performedBy) {
  const response = await fetch(`${API_BASE}/patients/${id}/handoff`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ toDepartment, notes, performedBy }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}
