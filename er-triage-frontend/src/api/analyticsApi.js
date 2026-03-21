import { getAuthHeaders } from './authApi.js';
import { API_BASE } from './config.js';

function computeFallbackAnalytics(patients) {
  const list = Array.isArray(patients) ? patients : [];
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const priorityBreakdown = list.reduce((acc, p) => {
    const key = p?.priority;
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const ages = list.map((p) => p?.age).filter((age) => Number.isFinite(age));
  const averageAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

  const patientsToday = list.filter((p) => {
    if (!p?.timestamp) return false;
    const ts = new Date(p.timestamp);
    return Number.isFinite(ts.getTime()) && ts >= startOfDay;
  }).length;

  return {
    totalPatients: list.length,
    totalEvents: 0,
    priorityBreakdown,
    eventBreakdown: {},
    discharges: 0,
    handoffs: 0,
    patientsToday,
    averageAge,
    recentEvents: [],
  };
}

export async function fetchAnalytics() {
  const headers = { ...getAuthHeaders() };
  const response = await fetch(`${API_BASE}/analytics`, { headers });

  if (response.ok) {
    return response.json();
  }

  // Fallback keeps Analytics page usable if backend analytics aggregation fails.
  const patientsResponse = await fetch(`${API_BASE}/patients`, { headers });
  if (!patientsResponse.ok) throw new Error(`Server error: ${response.status}`);
  const patients = await patientsResponse.json();
  return computeFallbackAnalytics(patients);
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
