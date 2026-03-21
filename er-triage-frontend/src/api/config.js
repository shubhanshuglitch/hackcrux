const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'https://er-triage-backend.onrender.com/api';

export const API_BASE = rawApiBase.replace(/\/$/, '');
