const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api/cropgpt';
const AUTH_TOKEN_KEY = 'sagrivision-auth-token';

async function request(path, options = {}, parseJson = true) {
  let response;
  try {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('SAgriVision backend unavailable. Please try again.');
  }

  let data = null;
  if (parseJson) {
    const raw = await response.text();
    try { data = raw ? JSON.parse(raw) : null; } catch { /* handled below */ }
  }
  if (!response.ok) {
    throw new Error(data?.detail || `Request failed with HTTP ${response.status}.`);
  }
  return { data, response };
}

export async function sendChat(payload) {
  const { data } = await request('/chat', { method: 'POST', body: JSON.stringify(payload) });
  if (!data || typeof data.answer !== 'string' || typeof data.conversation_id !== 'string') {
    throw new Error('The backend returned an unexpected chat response.');
  }
  return {
    ...data,
    topic: typeof data.topic === 'string' ? data.topic : 'general',
    relevance: typeof data.relevance === 'number' ? data.relevance : null,
    sources: Array.isArray(data.sources) ? data.sources.filter(Boolean).map((source) => ({
      name: typeof source.name === 'string' ? source.name : 'Local reference',
      url: typeof source.url === 'string' ? source.url : null,
      verification: typeof source.verification === 'string' ? source.verification : 'needs_verification',
    })) : [],
  };
}

export async function downloadReport(payload) {
  const { response } = await request('/reports/pdf', { method: 'POST', body: JSON.stringify(payload) }, false);
  return response.blob();
}
