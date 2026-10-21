const HEARTMED_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:18080';

// Ajusta estos endpoints si el backend usa otros nombres.
export const ENDPOINTS = {
  pacientes: '/api/pacientes',
  inventario: '/api/inventario',
  movimientos: '/api/movimientos',
};

function buildApiUrl(path) {
  return `${HEARTMED_API_BASE_URL.replace(/\/$/, '')}${path}`;
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    mode: 'cors',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const rawText = await response.text();
  let payload = {};

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const message = typeof payload === 'object'
      ? payload.message || payload.error || 'Error de conexión con HeartMed'
      : payload || 'Error de conexión con HeartMed';

    throw new Error(message);
  }

  return payload;
}

export async function checkServerHealth() {
  return requestJson(buildApiUrl('/health'));
}

export async function checkApiHealth() {
  return requestJson(buildApiUrl('/api/health'));
}

export async function loginUser(credentials) {
  if (!credentials || !credentials.email || !credentials.password) {
    throw new Error('Debes introducir un email y una contraseña válidos.');
  }

  return requestJson(buildApiUrl('/login'), {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function getPatients() {
  return requestJson(buildApiUrl(ENDPOINTS.pacientes), { headers: authHeaders() });
}

// Body usa los nombres reales del backend.
export async function createPatient(datos) {
  return requestJson(buildApiUrl(ENDPOINTS.pacientes), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos),
  });
}

export async function updatePatient(idPaciente, datos) {
  return requestJson(buildApiUrl(`${ENDPOINTS.pacientes}/${idPaciente}`), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(datos),
  });
}

export async function getMovements(limite = 25) {
  return requestJson(buildApiUrl(`${ENDPOINTS.movimientos}?limite=${limite}`), {
    headers: authHeaders(),
  });
}

// Datos del movimiento: lote, tipo, cantidad y motivo.
export async function createMovement(datos) {
  return requestJson(buildApiUrl(ENDPOINTS.movimientos), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos),
  });
}

export async function getInventory() {
  return requestJson(buildApiUrl(ENDPOINTS.inventario), { headers: authHeaders() });
}
