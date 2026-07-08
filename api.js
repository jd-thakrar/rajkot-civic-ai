import { getIdToken } from './auth.js';

export async function authHeaders(extra = {}) {
  const token = await getIdToken();
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(url, options = {}) {
  const headers = await authHeaders({
    'Content-Type': 'application/json',
    ...(options.headers || {})
  });

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const fullUrl = url.startsWith('/api') ? `${API_BASE}${url}` : url;
  return fetch(fullUrl, { ...options, headers });
}
