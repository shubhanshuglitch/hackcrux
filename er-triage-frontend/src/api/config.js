const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

export const API_BASE = rawApiBase.replace(/\/$/, '');
