// src/services/patientEvents.js
//
// Aviso global "la lista de pacientes cambió".
// El Dashboard escucha este evento y vuelve a pedir los números al instante.
//
// Quien haga el registro de pacientes solo tiene que agregar UNA línea
// cuando el backend responda OK al crear/editar/eliminar un paciente:
//
//   import { notifyPatientsChanged } from '../services/patientEvents';
//   ...
//   await createPatient(datos);
//   notifyPatientsChanged();

export const PATIENTS_CHANGED = 'heartmed:patients-changed';

export function notifyPatientsChanged() {
  window.dispatchEvent(new Event(PATIENTS_CHANGED));
}
