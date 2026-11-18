// Use same-origin /api paths. Vite proxies these in development and vercel.json
// forwards them to the deployed backend in production, avoiding browser CORS.
// Set VITE_API_BASE_URL only when intentionally calling an API without the proxy.
const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getAnonymousUserId() {
  let id = localStorage.getItem('campusconnect_user_uuid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('campusconnect_user_uuid', id);
  }
  return id;
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    const message = typeof data === 'object' && data ? data.detail || data.message || data.error : data;
    const error = new Error(message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  events: () => request('/api/events'),
  event: (id) => request(`/api/events/${encodeURIComponent(id)}`),
  // The backend contract uses user_id (the DB column name) for guest lookup.
  myRegistrations: () => request(`/api/me/registrations?user_id=${encodeURIComponent(getAnonymousUserId())}`),
  attendees: (id) => request(`/api/events/${encodeURIComponent(id)}/registrations`),
  register: (eventId) => request('/api/registrations', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId, user_id: getAnonymousUserId(), timestamp: new Date().toISOString() }),
  }),
};

export function listFrom(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['events', 'registrations', 'attendees', 'data', 'results', 'items']) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}
