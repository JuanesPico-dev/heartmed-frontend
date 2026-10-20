// src/services/patientsLocal.js
//
// Persistencia TEMPORAL de pacientes en el navegador (localStorage).
// Existe solo porque el backend todavía no se puede tocar.
//
// ── Cuando el backend esté listo ─────────────────────────────────────────
// 1) En src/services/api.js agrega:
//
//      export async function createPatient(datos) {
//        return requestJson(buildApiUrl(ENDPOINTS.pacientes), {
//          method: 'POST',
//          headers: authHeaders(),
//          body: JSON.stringify(datos),
//        });
//      }
//
// 2) En RegistroPacientePage.jsx cambia el import de `registrarPaciente`
//    por `createPatient` y, tras guardar, llama a `notifyPatientsChanged()`
//    (de patientEvents.js) para que el Dashboard refresque sus números.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'heartmed:pacientes-locales';
const LATENCIA_SIMULADA_MS = 600;

export function listarPacientesLocales() {
  try {
    const lista = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function guardarLista(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

// Simula un POST al backend: espera un poco y guarda en localStorage
export async function registrarPaciente(datos) {
  await new Promise((resolve) => setTimeout(resolve, LATENCIA_SIMULADA_MS));

  const nuevo = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...datos,
    creadoEn: new Date().toISOString(),
  };

  guardarLista([nuevo, ...listarPacientesLocales()]);
  return nuevo;
}

// Simula un PUT al backend: actualiza el paciente y conserva id y fecha de creación
export async function actualizarPaciente(id, datos) {
  await new Promise((resolve) => setTimeout(resolve, LATENCIA_SIMULADA_MS));

  const lista = listarPacientesLocales();
  const existente = lista.find((p) => p.id === id);
  if (!existente) throw new Error('El paciente ya no existe.');

  const actualizado = { ...existente, ...datos, id, actualizadoEn: new Date().toISOString() };
  guardarLista(lista.map((p) => (p.id === id ? actualizado : p)));
  return actualizado;
}

export function eliminarPacienteLocal(id) {
  guardarLista(listarPacientesLocales().filter((p) => p.id !== id));
}
