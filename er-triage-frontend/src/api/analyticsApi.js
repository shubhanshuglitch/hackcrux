import { getAuthHeaders } from './authApi.js';

const API_BASE = 'http://localhost:8081/api';

export async function fetchAnalytics() {
  const response = await fetch(`${API_BASE}/analytics`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return response.json();
}

export async function exportPatientsCsv() {
  const response = await fetch(`${API_BASE}/patients/export/csv`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'patients_export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
