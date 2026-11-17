// Drop this into the frontend (e.g. js/api.js) and include it with <script src="js/api.js"></script>
// It wraps fetch() so every page talks to the backend the same way.
const API_BASE = 'http://localhost:5000/api'; // change to your deployed backend URL later

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(API_BASE + path, {
    method,
    credentials: 'include', // REQUIRED so the session cookie is sent/received
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success === false) {
    const err = new Error((json && json.error && json.error.message) || 'Request failed');
    err.code = json && json.error && json.error.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

/* Examples
  await api('/auth/login',  { method: 'POST', body: { email, password } });
  const me = await api('/auth/me');

  // Create request: map existing HTML ids to the standard API field names
  await api('/requests', { method: 'POST', body: {
    pickupLocation: document.getElementById('fromLocation').value,
    dropLocation:   document.getElementById('toLocation').value,
    reward:         Number(document.getElementById('reward').value),
    deadline:       new Date(document.getElementById('deadline').value).toISOString(),
    companyName:    document.getElementById('companyName').value,
    agentName:      document.getElementById('agentName').value,
    agentMobile:    document.getElementById('agentMobile').value,
    pickupOtp:      document.getElementById('pickupOtp').value,
    itemDescription:document.getElementById('itemDescription').value,
  }});

  const available = await api('/requests');            // or '/requests?urgent=true'
  await api(`/requests/${id}/accept`, { method: 'PATCH' });
  await api(`/requests/${id}/status`, { method: 'PATCH', body: { status: 'picked_up' } });
  const msgs = await api(`/requests/${id}/messages`);
  await api(`/requests/${id}/messages`, { method: 'POST', body: { text: 'On my way' } });
*/
