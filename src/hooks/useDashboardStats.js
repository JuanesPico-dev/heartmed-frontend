// src/hooks/useDashboardStats.js
//
// Pide al backend los números del dashboard y los mantiene al día:
//   - al abrir el dashboard
//   - cada `intervalMs` (por defecto 30 s)
//   - cuando la pestaña vuelve a tener foco
//   - cuando alguien llama notifyPatientsChanged() (ej. tras registrar un paciente)

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkApiHealth, checkServerHealth, getInventory, getPatients } from '../services/api';
import { PATIENTS_CHANGED } from '../services/patientEvents';

/* ----------------------------------------------------------------
   REGLAS DE NEGOCIO: ajústalas a los campos reales de tu backend.
---------------------------------------------------------------- */

// El backend puede devolver [..] o { pacientes: [..] } / { data: [..] } / { items: [..] }
function aLista(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.pacientes ?? payload?.data ?? payload?.items ?? [];
}

// Paciente activo = no dado de alta / no inactivo
function esActivo(p) {
  if (p?.activo === false) return false;
  return !/alta|inactivo|egres/i.test(String(p?.estado ?? ''));
}

// Paciente crítico = su estado / prioridad / gravedad dice "crítico"
function esCritico(p) {
  const valor = p?.estado ?? p?.prioridad ?? p?.gravedad ?? '';
  return /cr[ií]tic/i.test(String(valor));
}

// Inventario general (%). Acepta:
//   - un número            -> 94
//   - { porcentaje: 94 }
//   - una lista de insumos -> % de insumos con cantidad >= stock_minimo
function calcularInventario(payload) {
  if (typeof payload === 'number') return payload;
  if (typeof payload?.porcentaje === 'number') return payload.porcentaje;

  const items = Array.isArray(payload) ? payload : payload?.items ?? payload?.data;
  if (!Array.isArray(items) || items.length === 0) return null;

  const bien = items.filter((i) => Number(i.cantidad) >= Number(i.stock_minimo ?? 0)).length;
  return Math.round((bien / items.length) * 100);
}

// Up-time: usa el % que mande /health (uptime_percent) o, si no hay, ONLINE / OFFLINE
function calcularUptime(health) {
  const n = health?.uptime_percent ?? health?.uptimePercent;
  if (typeof n === 'number') return `${n.toFixed(1)}%`;
  return health?.status === 'ok' ? 'ONLINE' : 'OFFLINE';
}

/* ---------------------------------------------------------------- */

const INICIAL = {
  activos: null,
  criticos: null,
  inventario: null,
  uptime: null,
  loading: true,
  error: '',
};

export default function useDashboardStats({ intervalMs = 30000, enabled = true } = {}) {
  const [stats, setStats] = useState(INICIAL);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const [pac, inv, hea] = await Promise.allSettled([
      getPatients(),
      getInventory(),
      checkServerHealth().catch(() => checkApiHealth()),
    ]);

    if (!mounted.current) return;

    setStats((prev) => {
      const next = { ...prev, loading: false, error: '' };

      if (pac.status === 'fulfilled') {
        const lista = aLista(pac.value);
        next.activos = lista.filter(esActivo).length;
        next.criticos = lista.filter(esCritico).length;
      } else {
        // Se conservan los últimos números conocidos y se avisa
        next.error = 'Sin conexión con el backend · mostrando los últimos datos';
      }

      // Si aún no existe el endpoint de inventario, queda en "—" sin molestar
      if (inv.status === 'fulfilled') next.inventario = calcularInventario(inv.value);

      next.uptime = hea.status === 'fulfilled' ? calcularUptime(hea.value) : 'OFFLINE';

      return next;
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return undefined;

    load();

    const id = setInterval(load, intervalMs);
    const recargar = () => load();
    const alVolver = () => {
      if (document.visibilityState === 'visible') load();
    };

    window.addEventListener(PATIENTS_CHANGED, recargar);
    window.addEventListener('focus', recargar);
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      mounted.current = false;
      clearInterval(id);
      window.removeEventListener(PATIENTS_CHANGED, recargar);
      window.removeEventListener('focus', recargar);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [enabled, intervalMs, load]);

  return { ...stats, refresh: load };
}
