const API_BASE = 'http://localhost:8081/api';

export async function submitPatient(rawInput) {
  const response = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawInput }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function fetchPatients() {
  const response = await fetch(`${API_BASE}/patients`);
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function dismissPatient(id) {
  const response = await fetch(`${API_BASE}/patients/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
}

export async function retriagePatient(id, symptoms, vitals) {
  const response = await fetch(`${API_BASE}/patients/${id}/retriage`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms, vitals }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}
