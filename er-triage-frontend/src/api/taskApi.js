import { getAuthHeaders } from './authApi.js';
import { API_BASE } from './config.js';

export async function fetchTasks() {
  const response = await fetch(`${API_BASE}/tasks`, { headers: { ...getAuthHeaders() } });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function createTask(title, priority = 'normal', assignedTo = null) {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ title, priority, assignedTo }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function completeTask(id) {
  const response = await fetch(`${API_BASE}/tasks/${id}/complete`, {
    method: 'PUT',
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function deleteTask(id) {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
}
