// Evento global para refrescar la lista de pacientes tras cambios.

export const PATIENTS_CHANGED = 'heartmed:patients-changed';

export function notifyPatientsChanged() {
  window.dispatchEvent(new Event(PATIENTS_CHANGED));
}
