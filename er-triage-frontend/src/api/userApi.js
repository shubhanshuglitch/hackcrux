const API_BASE = 'http://localhost:8081/api';

export async function fetchUsers(activeOnly = false) {
  const url = activeOnly ? `${API_BASE}/users?activeOnly=true` : `${API_BASE}/users`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function fetchUsersByRole(role) {
  const response = await fetch(`${API_BASE}/users/role/${role}`);
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function createUser(userData) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function deleteUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
}
