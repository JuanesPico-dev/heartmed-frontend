// src/pages/RegistroPacientePage.jsx
// Pantalla "Admitir nuevo paciente" (solo front, sin backend por ahora).
//
// El formulario se coloca justo debajo de las cabeceras dibujadas en la imagen
// (EXPEDIENTE / AFILIACIÓN / SANGRE / RECOMPENSA / ESTADO / ACCIONES), así cada
// campo queda alineado con su columna. Debajo se listan los pacientes guardados
// en este equipo, con buscador y paginación.
import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PacientesGrandLine, { Zona } from './PacientesGrandLine';
import {
  actualizarPaciente,
  eliminarPacienteLocal,
  listarPacientesLocales,
  registrarPaciente,
} from '../services/patientsLocal';

// Ruta del dashboard (a donde vuelve el botón "Atrás")
const RUTA_DASHBOARD = '/dashboard';

// Color del panel de la imagen, usado para tapar textos dibujados que cambian
// (subtítulo y contador). Si se nota una costura, ajusta este valor.
const FONDO_PANEL = '#222838';
const PAGE_SIZE = 5;

const AFILIACIONES = [
  { value: 'pirata', label: 'Pirata' },
  { value: 'marina', label: 'Marina' },
  { value: 'revolucionario', label: 'Revolucionario' },
  { value: 'civil', label: 'Civil' },
];

const SANGRES = ['F', 'S', 'X', 'XF'];

const ESTADOS = [
  { value: 'critico', label: 'Crítico', color: '#ff6b5b' },
  { value: 'recuperacion', label: 'En recuperación', color: '#ffa733' },
  { value: 'estable', label: 'Estable', color: '#4dff88' },
  { value: 'tratando', label: 'Tratando', color: '#4aa8ff' },
  { value: 'inspeccion', label: 'Inspección', color: '#ffe14d' },
];

const FORM_VACIO = {
  alias: '',
  afiliacion: '',
  sangre: '',
  recompensa: '',
  estado: '',
  tripulacion: '',
  notas: '',
};

const ERRORES_VACIOS = Object.fromEntries(Object.keys(FORM_VACIO).map((k) => [k, '']));

const etiquetaDe = (lista, value) => lista.find((i) => i.value === value)?.label ?? value;
const estadoDe = (value) => ESTADOS.find((e) => e.value === value);

const formatBerries = (digitos) => (digitos ? Number(digitos).toLocaleString('es-CO') : '');

// Devuelve un mensaje por campo ('' = sin error)
function validar(form) {
  const errores = { ...ERRORES_VACIOS };

  if (form.alias.trim().length < 2) errores.alias = 'Mínimo 2 caracteres.';
  if (!form.afiliacion) errores.afiliacion = 'Elige una.';
  if (!form.sangre) errores.sangre = 'Elige tipo.';
  if (!form.recompensa) errores.recompensa = 'Ingresa un monto (0 si no tiene).';
  if (!form.estado) errores.estado = 'Elige estado.';
  if (form.afiliacion !== 'civil' && !form.tripulacion.trim()) {
    errores.tripulacion = 'Indica la tripulación (o elige Civil).';
  }
  if (form.notas.length > 200) errores.notas = 'Máximo 200 caracteres.';

  return errores;
}

const hayErrores = (errores) => Object.values(errores).some(Boolean);

// ---- estilos ----
const claseInput =
  'h-full w-full rounded-md border border-[#b07a3a]/50 bg-[#141a26] px-[3%] text-[1.15em] ' +
  'text-[#fbe9c0] placeholder-[#7d7560] outline-none [color-scheme:dark] ' +
  'focus:ring-2 focus:ring-[#ffd36a]';
const claseInvalido = ' !ring-2 !ring-red-400';

function Err({ x, y, w, children }) {
  if (!children) return null;
  return (
    <Zona x={x} y={y} w={w} h={28} className="flex items-center">
      <p className="truncate text-[0.9em] font-semibold text-red-300" role="alert">
        {children}
      </p>
    </Zona>
  );
}

function Etiqueta({ x, y, w, children }) {
  return (
    <Zona x={x} y={y} w={w} h={28} className="flex items-end">
      <span className="text-[1em] font-semibold uppercase tracking-wider text-[#e0b060]">
        {children}
      </span>
    </Zona>
  );
}

// Select con flecha propia (la nativa desentona con el diseño)
function Selector({ x, y, w, h, className, children, ...props }) {
  return (
    <Zona x={x} y={y} w={w} h={h}>
      <select className={`${className} appearance-none pr-[18%]`} {...props}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-[8%] top-1/2 -translate-y-1/2 text-[1em] text-[#e0b060]">
        ▾
      </span>
    </Zona>
  );
}

export default function RegistroPacientePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const aliasRef = useRef(null);

  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState(ERRORES_VACIOS);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [pacientes, setPacientes] = useState(listarPacientesLocales);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [editandoId, setEditandoId] = useState(null); // id del paciente en edición (null = alta nueva)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) =>
      [p.alias, p.tripulacion, p.recompensa, etiquetaDe(AFILIACIONES, p.afiliacion)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [pacientes, busqueda]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * PAGE_SIZE;
  const visibles = filtrados.slice(inicio, inicio + PAGE_SIZE);
  const desde = filtrados.length ? inicio + 1 : 0;
  const hasta = inicio + visibles.length;

  const handleChange = (event) => {
    const { name } = event.target;
    let { value } = event.target;
    if (name === 'recompensa') value = value.replace(/\D/g, '').slice(0, 12);

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: '' }));
    setMensaje(null);
  };

  const limpiar = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setErrores(ERRORES_VACIOS);
    setMensaje(null);
    aliasRef.current?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMensaje(null);

    const nuevos = validar(form);
    setErrores(nuevos);
    if (hayErrores(nuevos)) return;

    setGuardando(true);
    try {
      // 🔌 Cuando haya backend: reemplazar por createPatient(...) y llamar
      //    a notifyPatientsChanged() (ver services/patientsLocal.js)
      const datos = {
        alias: form.alias.trim(),
        afiliacion: form.afiliacion,
        sangre: form.sangre,
        recompensa: form.recompensa,
        estado: form.estado,
        tripulacion: form.tripulacion.trim(),
        notas: form.notas.trim(),
      };

      if (editandoId) {
        // 🔌 Cuando haya backend: updatePatient(editandoId, datos)
        const actualizado = await actualizarPaciente(editandoId, datos);
        setMensaje({ tipo: 'ok', texto: `✔ ${actualizado.alias} actualizado` });
      } else {
        const creado = await registrarPaciente(datos);
        setPagina(1);
        setBusqueda('');
        setMensaje({ tipo: 'ok', texto: `✔ ${creado.alias} admitido (guardado en este equipo)` });
      }

      setPacientes(listarPacientesLocales());
      setEditandoId(null);
      setForm(FORM_VACIO);
      aliasRef.current?.focus();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'No se pudo registrar al paciente.' });
    } finally {
      setGuardando(false);
    }
  };

  // Carga el paciente en el formulario para modificarlo
  const handleEditar = (p) => {
    setForm({
      alias: p.alias,
      afiliacion: p.afiliacion,
      sangre: p.sangre,
      recompensa: p.recompensa,
      estado: p.estado,
      tripulacion: p.tripulacion || '',
      notas: p.notas || '',
    });
    setErrores(ERRORES_VACIOS);
    setMensaje(null);
    setEditandoId(p.id);
    aliasRef.current?.focus();
  };

  const handleEliminar = (id) => {
    if (editandoId === id) limpiar();
    eliminarPacienteLocal(id);
    setPacientes(listarPacientesLocales());
  };

  const campo = (name) => claseInput + (errores[name] ? claseInvalido : '');

  return (
    <PacientesGrandLine>
      {/* ── Botón "Atrás": esquina superior izquierda de la pantalla ── */}
      <Zona x={100} y={16} w={190} h={50}>
        <button
          type="button"
          onClick={() => navigate(RUTA_DASHBOARD)}
          aria-label="Volver al dashboard"
          className="flex h-full w-full items-center justify-center gap-[0.4em] rounded-lg border border-[#b07a3a]/70 bg-[#1b1208]/80 text-[1.2em] font-bold uppercase tracking-wide text-[#f2c48a] backdrop-blur-sm transition hover:bg-[#2d1b0e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
        >
          <span aria-hidden="true">←</span> Atrás
        </button>
      </Zona>

      <form onSubmit={handleSubmit} noValidate className="contents">
        {/* ── Subtítulo (tapa "VISTA PRINCIPAL..." y muestra título / resultado) ── */}
        <Zona x={462} y={304} w={1180} h={58} className="flex items-center">
          <div
            className="absolute inset-0 rounded"
            style={{ background: FONDO_PANEL }}
            aria-hidden="true"
          />
          <p
            className="relative z-10 truncate text-[1.5em] font-semibold uppercase leading-none"
            style={{
              color:
                mensaje?.tipo === 'ok' ? '#7dffa0' : mensaje?.tipo === 'error' ? '#ff8a7a' : '#f2c48a',
            }}
            role={mensaje ? 'status' : undefined}
          >
            {mensaje ? mensaje.texto : editandoId ? 'Editando paciente' : 'Admitir nuevo paciente'}
          </p>
        </Zona>

        {/* ── Cancelar edición (solo visible mientras se edita) ── */}
        {editandoId && (
          <Zona x={1440} y={308} w={200} h={50}>
            <button
              type="button"
              onClick={limpiar}
              className="h-full w-full rounded-lg border border-[#b07a3a]/60 bg-[#141a26] text-[1.05em] font-semibold uppercase tracking-wide text-[#e9c7a0] transition hover:bg-[#1c2536] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
            >
              ✕ Cancelar
            </button>
          </Zona>
        )}

        {/* ── Botón dibujado "ADMITIR NUEVO PACIENTE" -> limpia el formulario ── */}
        <Zona x={2092} y={98} w={440} h={84}>
          <button
            type="button"
            onClick={limpiar}
            aria-label="Admitir nuevo paciente (limpiar formulario)"
            className="h-full w-full rounded-lg bg-transparent text-transparent transition hover:bg-orange-300/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
          >
            Admitir nuevo paciente
          </button>
        </Zona>

        {/* ── Buscador (filtra la lista de abajo) ── */}
        <Zona x={1245} y={163} w={368} h={48}>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar alias, tripulación…"
            aria-label="Buscar pacientes guardados"
            className="h-full w-full rounded-md border-0 bg-[#2d1b0e] px-[3%] text-[1.05em] text-[#fbe9c0] placeholder-[#a58a5a] outline-none focus:ring-2 focus:ring-[#ffd36a]"
          />
        </Zona>

        {/* ── Fila 1: campos bajo cada cabecera de columna ── */}
        <Zona x={185} y={480} w={355} h={54}>
          <input
            ref={aliasRef}
            className={campo('alias')}
            name="alias"
            placeholder="Alias del paciente"
            aria-label="Alias del paciente"
            aria-invalid={Boolean(errores.alias)}
            maxLength={60}
            autoComplete="off"
            value={form.alias}
            onChange={handleChange}
          />
        </Zona>
        <Selector
          x={550}
          y={480}
          w={205}
          h={54}
          className={campo('afiliacion')}
          name="afiliacion"
          aria-label="Afiliación"
          aria-invalid={Boolean(errores.afiliacion)}
          value={form.afiliacion}
          onChange={handleChange}
        >
          <option value="">Elegir</option>
          {AFILIACIONES.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </Selector>
        <Selector
          x={765}
          y={480}
          w={150}
          h={54}
          className={campo('sangre')}
          name="sangre"
          aria-label="Tipo de sangre"
          aria-invalid={Boolean(errores.sangre)}
          value={form.sangre}
          onChange={handleChange}
        >
          <option value="">Tipo</option>
          {SANGRES.map((s) => (
            <option key={s} value={s}>Type {s}</option>
          ))}
        </Selector>
        <Zona x={927} y={480} w={263} h={54}>
          <input
            className={campo('recompensa')}
            name="recompensa"
            inputMode="numeric"
            placeholder="฿ 0"
            aria-label="Recompensa en berries"
            aria-invalid={Boolean(errores.recompensa)}
            autoComplete="off"
            value={formatBerries(form.recompensa)}
            onChange={handleChange}
          />
        </Zona>
        <Selector
          x={1200}
          y={480}
          w={175}
          h={54}
          className={campo('estado')}
          name="estado"
          aria-label="Estado"
          aria-invalid={Boolean(errores.estado)}
          value={form.estado}
          onChange={handleChange}
        >
          <option value="">Estado</option>
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </Selector>
        <Zona x={1385} y={480} w={252} h={54}>
          <button
            type="submit"
            disabled={guardando}
            className="h-full w-full rounded-lg border border-[#ffd36a]/70 bg-gradient-to-b from-[#e8a93c] to-[#a8611a] text-[1.3em] font-bold uppercase tracking-wide text-[#2a1507] shadow-[0_0_1.2em_rgba(255,170,40,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-wait disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Guardar'}
          </button>
        </Zona>

        <Err x={185} y={536} w={355}>{errores.alias}</Err>
        <Err x={550} y={536} w={205}>{errores.afiliacion}</Err>
        <Err x={765} y={536} w={150}>{errores.sangre}</Err>
        <Err x={927} y={536} w={263}>{errores.recompensa}</Err>
        <Err x={1200} y={536} w={175}>{errores.estado}</Err>

        {/* ── Fila 2: tripulación y notas ── */}
        <Etiqueta x={185} y={566} w={355}>Tripulación</Etiqueta>
        <Etiqueta x={550} y={566} w={1087}>Notas clínicas (opcional)</Etiqueta>

        <Zona x={185} y={598} w={355} h={54}>
          <input
            className={campo('tripulacion')}
            name="tripulacion"
            placeholder="Ej. Sombrero de Paja"
            aria-label="Tripulación"
            aria-invalid={Boolean(errores.tripulacion)}
            maxLength={60}
            autoComplete="off"
            value={form.tripulacion}
            onChange={handleChange}
          />
        </Zona>
        <Zona x={550} y={598} w={1087} h={54}>
          <input
            className={campo('notas')}
            name="notas"
            placeholder="Heridas, alergias, observaciones…"
            aria-label="Notas clínicas"
            aria-invalid={Boolean(errores.notas)}
            maxLength={200}
            autoComplete="off"
            value={form.notas}
            onChange={handleChange}
          />
        </Zona>

        <Err x={185} y={654} w={355}>{errores.tripulacion}</Err>
        <Err x={550} y={654} w={1087}>{errores.notas}</Err>
      </form>

      {/* ── Lista de pacientes guardados (mismas columnas que las cabeceras) ── */}
      <Zona x={185} y={692} w={1452} h={500}>
        {visibles.length === 0 ? (
          <p className="flex h-full items-center justify-center text-[1.3em] text-[#a58a5a]">
            {pacientes.length === 0
              ? 'Aún no hay pacientes registrados en este equipo.'
              : 'Ningún paciente coincide con la búsqueda.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-[0.5em]">
            {visibles.map((p) => {
              const estado = estadoDe(p.estado);
              return (
                <li
                  key={p.id}
                  className={`grid h-[3.1em] items-center rounded-lg border px-[0.8em] ${
                    p.id === editandoId
                      ? 'border-[#ffd36a] bg-[#2a2314]/90'
                      : 'border-[#b07a3a]/40 bg-[#141a26]/85'
                  }`}
                  style={{ gridTemplateColumns: '355fr 205fr 150fr 263fr 175fr 252fr', columnGap: '0.5em' }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[1.3em] font-bold uppercase leading-tight text-[#f2c48a]">{p.alias}</p>
                    <p className="truncate text-[0.85em] uppercase leading-tight text-[#a58a5a]">
                      {p.tripulacion || 'Sin tripulación'}
                    </p>
                  </div>
                  <span className="truncate text-[1.15em] text-[#fbe9c0]">{etiquetaDe(AFILIACIONES, p.afiliacion)}</span>
                  <span className="text-[1.15em] text-[#fbe9c0]">Type {p.sangre}</span>
                  <span className="truncate text-[1.15em] tabular-nums text-[#fbe9c0]">฿ {formatBerries(p.recompensa)}</span>
                  {/* El badge puede ocupar parte de la columna de acciones (no se parte en dos líneas) */}
                  <span
                    className="justify-self-start whitespace-nowrap rounded-full border px-[0.6em] py-[0.1em] text-[0.85em] font-bold uppercase"
                    style={{ color: estado?.color, borderColor: estado?.color, boxShadow: `0 0 0.6em ${estado?.color}55` }}
                  >
                    {estado?.label ?? p.estado}
                  </span>
                  <div className="flex justify-self-end gap-[0.4em]">
                    <button
                      type="button"
                      onClick={() => handleEditar(p)}
                      aria-label={`Editar ${p.alias}`}
                      title="Editar"
                      className="rounded-md border border-[#b07a3a]/50 bg-[#2a2314] px-[0.6em] py-[0.25em] text-[1.05em] transition hover:bg-[#40341a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(p.id)}
                      aria-label={`Eliminar ${p.alias}`}
                      title="Eliminar"
                      className="rounded-md border border-[#b07a3a]/50 bg-[#3a1d12] px-[0.6em] py-[0.25em] text-[1.05em] transition hover:bg-[#5a2a18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Zona>

      {/* ── Contador (tapa "Mostrando 0-0 de 0 Registros") ── */}
      <Zona x={245} y={1240} w={700} h={62} className="flex items-center">
        <div className="absolute inset-0" style={{ background: FONDO_PANEL }} aria-hidden="true" />
        <p className="relative z-10 whitespace-nowrap text-[1.35em] text-[#e6c9a0]" role="status">
          Mostrando {desde}-{hasta} de {filtrados.length} Registros
        </p>
      </Zona>

      {/* ── Botones de paginación dibujados (invisibles encima) ── */}
      {[
        { x: 1325, etiqueta: 'Primera página', ir: () => setPagina(1), off: paginaActual === 1 },
        { x: 1397, etiqueta: 'Página anterior', ir: () => setPagina(paginaActual - 1), off: paginaActual === 1 },
        { x: 1468, etiqueta: 'Página siguiente', ir: () => setPagina(paginaActual + 1), off: paginaActual === totalPaginas },
      ].map((b) => (
        <Zona key={b.etiqueta} x={b.x} y={1243} w={58} h={54}>
          <button
            type="button"
            onClick={b.ir}
            disabled={b.off}
            aria-label={b.etiqueta}
            className="h-full w-full rounded-md bg-transparent text-transparent transition hover:bg-orange-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a] disabled:cursor-not-allowed"
          >
            {b.etiqueta}
          </button>
        </Zona>
      ))}
    </PacientesGrandLine>
  );
}
