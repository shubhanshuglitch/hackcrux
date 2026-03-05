const API_BASE = 'http://localhost:8081/api';

/**
 * POST /api/patients
 * Sends raw voice transcript to backend for AI triage processing
 */
export async function submitPatient(rawInput) {
  const response = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawInput }),
  });
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
  return response.json();
}

/**
 * GET /api/patients
 * Fetches all patients sorted by priority (RED → YELLOW → GREEN)
 */
export async function fetchPatients() {
  const response = await fetch(`${API_BASE}/patients`);
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
  return response.json();
}

/**
 * DELETE /api/patients/:id
 * Dismisses a patient card from the dashboard
 */
export async function dismissPatient(id) {
  const response = await fetch(`${API_BASE}/patients/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
}
