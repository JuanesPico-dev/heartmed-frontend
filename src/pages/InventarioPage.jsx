// src/pages/InventarioPage.jsx
// Pañol de la enfermería: existencias del Polar Tang y libro de movimientos.
//
// A diferencia del dashboard y de pacientes, esta pantalla no se apoya en una
// imagen con cabeceras dibujadas: la ilustración de fondo queda difuminada como
// ambiente y el panel se construye con CSS. Se reutilizan los colores de las
// otras pantallas (latón, ámbar y azul acero) para que no parezca otra app.
//
// El dato que manda es cuánto hay frente a cuánto debería haber, así que cada
// insumo se muestra con un medidor de nivel con una muesca en su umbral mínimo,
// en vez de con una cifra suelta.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMovement, getInventory, getMovements } from '../services/api';
import fondo from '../images/inicio.jpg';

const RUTA_DASHBOARD = '/dashboard';

// Un lote que vence dentro de este plazo se señala: hay tiempo de consumirlo
// antes de tener que darlo de baja.
const DIAS_AVISO_VENCIMIENTO = 90;

const TIPOS = [
  { value: 'ENTRADA', label: 'Entrada', signo: '+', color: '#7dffa0' },
  { value: 'CONSUMO', label: 'Consumo', signo: '−', color: '#4aa8ff' },
  { value: 'BAJA', label: 'Baja', signo: '−', color: '#ff8a7a' },
];

const tipoDe = (valor) => TIPOS.find((t) => t.value === valor);

const FORM_VACIO = { id_lote: '', tipo_movimiento: 'ENTRADA', cantidad: '', motivo: '' };

const numero = (valor) => Number(valor ?? 0).toLocaleString('es-CO');

// "2026-10-20 23:07:18" -> "20/10 23:07". Se parte la cadena en vez de usar
// Date: el backend ya la envía en la hora local del barco y construir un Date
// la movería de huso.
function formatFechaHora(texto) {
  if (!texto || texto.length < 16) return texto ?? '';
  const [fecha, hora] = texto.split(' ');
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes} ${hora.slice(0, 5)}`;
}

// Días que faltan para una fecha YYYY-MM-DD (negativo si ya pasó)
function diasHasta(fechaIso) {
  if (!fechaIso) return null;
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  if (!anio || !mes || !dia) return null;

  const objetivo = Date.UTC(anio, mes - 1, dia);
  const hoy = new Date();
  const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo - hoyUtc) / 86400000);
}

function avisoVencimiento(fechaIso) {
  const dias = diasHasta(fechaIso);
  if (dias === null) return null;
  if (dias < 0) return { texto: 'Vencido', color: '#ff6b5b' };
  if (dias === 0) return { texto: 'Vence hoy', color: '#ff6b5b' };
  if (dias <= DIAS_AVISO_VENCIMIENTO) return { texto: `Vence en ${dias} días`, color: '#ffa733' };
  return null;
}

// Medidor de nivel: la barra llena es lo que hay y la muesca marca el umbral
// mínimo. La escala deja aire por encima del umbral para que la muesca no
// quede pegada al borde cuando el stock está justo.
function Medidor({ cantidad, umbral, bajoMinimo }) {
  const tope = Math.max(cantidad, Math.ceil(umbral * 1.5), 1);
  const porcentaje = Math.min(100, (cantidad / tope) * 100);
  const porcentajeUmbral = Math.min(100, (umbral / tope) * 100);
  const color = bajoMinimo ? '#ff6b5b' : '#7dffa0';

  return (
    <div
      className="relative h-3 w-full overflow-hidden rounded-sm border border-[#b07a3a]/50 bg-[#0d1119]"
      role="img"
      aria-label={`${cantidad} de un mínimo de ${umbral}`}
    >
      <div
        className="h-full transition-[width] duration-500"
        style={{ width: `${porcentaje}%`, background: color, boxShadow: `0 0 10px ${color}66` }}
      />
      {umbral > 0 && (
        <div
          className="absolute inset-y-0 w-[2px] bg-[#ffd36a]"
          style={{ left: `${porcentajeUmbral}%` }}
          title={`Mínimo: ${umbral}`}
        />
      )}
    </div>
  );
}

function Insumo({ item }) {
  return (
    <li className="border-b border-[#b07a3a]/25 px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold text-[#f2c48a]">{item.nombre}</h3>
        <p className="tabular-nums text-sm text-[#cbb391]">
          <span
            className={`text-lg font-bold ${item.bajo_minimo ? 'text-[#ff8a7a]' : 'text-[#fbe9c0]'}`}
          >
            {numero(item.cantidad_total_disponible)}
          </span>
          <span className="mx-1 text-[#8a7a60]">/</span>
          <span>mínimo {numero(item.umbral_minimo)}</span>
          <span className="ml-2 text-xs uppercase tracking-wide text-[#a58a5a]">
            {item.unidad_medida}
          </span>
        </p>
      </div>

      <div className="mt-2">
        <Medidor
          cantidad={Number(item.cantidad_total_disponible ?? 0)}
          umbral={Number(item.umbral_minimo ?? 0)}
          bajoMinimo={Boolean(item.bajo_minimo)}
        />
      </div>

      {item.bajo_minimo && (
        <p className="mt-2 text-sm font-semibold text-[#ff8a7a]">
          Hay que reponer: faltan{' '}
          {numero(Number(item.umbral_minimo) - Number(item.cantidad_total_disponible))} para llegar
          al mínimo.
        </p>
      )}

      <ul className="mt-3 space-y-1">
        {(item.lotes ?? []).map((lote) => {
          const aviso = avisoVencimiento(lote.fecha_vencimiento);
          return (
            <li
              key={lote.id_lote}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm text-[#b9a383]"
            >
              <span className="font-mono text-[#e0b060]">{lote.num_lote}</span>
              <span className="tabular-nums text-[#fbe9c0]">{numero(lote.cantidad)}</span>
              <span className="truncate">{lote.ubicacion}</span>
              <span className="tabular-nums text-[#8a7a60]">{lote.fecha_vencimiento}</span>
              {aviso && (
                <span className="font-semibold" style={{ color: aviso.color }}>
                  {aviso.texto}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function Movimiento({ movimiento }) {
  const tipo = tipoDe(movimiento.tipo_movimiento);
  return (
    <li className="border-b border-[#b07a3a]/20 py-2 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-[#f2c48a]">
          <span className="tabular-nums font-bold" style={{ color: tipo?.color }}>
            {tipo?.signo}
            {numero(movimiento.cantidad)}
          </span>{' '}
          {movimiento.nombre_medicamento}
        </p>
        <p className="shrink-0 tabular-nums text-xs text-[#8a7a60]">
          {formatFechaHora(movimiento.fecha_movimiento)}
        </p>
      </div>
      <p className="truncate text-xs text-[#a58a5a]">
        <span className="font-mono">{movimiento.num_lote}</span> · {movimiento.nombre_usuario}
        {movimiento.motivo ? ` · ${movimiento.motivo}` : ''}
        {movimiento.id_tratamiento ? ` · tratamiento ${movimiento.id_tratamiento}` : ''}
      </p>
    </li>
  );
}

const claseCampo =
  'h-10 w-full rounded-md border border-[#b07a3a]/50 bg-[#0f141d] px-3 text-sm text-[#fbe9c0] ' +
  'placeholder-[#7d7560] outline-none [color-scheme:dark] focus:ring-2 focus:ring-[#ffd36a]';
const claseEtiqueta = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#e0b060]';

export default function InventarioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inventario, setInventario] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [inv, movs] = await Promise.all([getInventory(), getMovements(25)]);
      setInventario(inv);
      setMovimientos(movs?.movimientos ?? []);
      setErrorCarga('');
    } catch (error) {
      setErrorCarga(error.message || 'No se pudo cargar el inventario.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Los lotes de todos los insumos, para el desplegable del formulario
  const lotes = useMemo(() => {
    const items = inventario?.items ?? [];
    return items.flatMap((item) =>
      (item.lotes ?? []).map((lote) => ({
        id_lote: lote.id_lote,
        etiqueta: `${item.nombre} · ${lote.num_lote} (${numero(lote.cantidad)} ${item.unidad_medida})`,
      })),
    );
  }, [inventario]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (event) => {
    const { name } = event.target;
    let { value } = event.target;
    if (name === 'cantidad') value = value.replace(/\D/g, '').slice(0, 9);

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: '' }));
    setAviso(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Las mismas reglas que aplica el backend, comprobadas antes de salir a la
    // red para que el error aparezca junto al campo que lo causa.
    const nuevos = {};
    if (!form.id_lote) nuevos.id_lote = 'Elige el lote.';
    if (!form.cantidad || Number(form.cantidad) <= 0) nuevos.cantidad = 'Mayor que cero.';
    if (form.tipo_movimiento !== 'ENTRADA' && !form.motivo.trim()) {
      nuevos.motivo = 'Toda salida necesita un motivo.';
    }
    if (form.motivo.length > 300) nuevos.motivo = 'Máximo 300 caracteres.';

    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setGuardando(true);
    setAviso(null);
    try {
      const respuesta = await createMovement({
        id_lote: Number(form.id_lote),
        tipo_movimiento: form.tipo_movimiento,
        cantidad: Number(form.cantidad),
        motivo: form.motivo.trim(),
      });

      const stock = respuesta?.stock;
      setAviso({
        tipo: 'ok',
        texto: stock
          ? `${stock.nombre_medicamento}: quedan ${numero(stock.cantidad_total_disponible)} en total.`
          : 'Movimiento registrado.',
      });
      setForm({ ...FORM_VACIO, tipo_movimiento: form.tipo_movimiento });
      await cargar();
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message || 'No se pudo registrar el movimiento.' });
    } finally {
      setGuardando(false);
    }
  };

  const items = inventario?.items ?? [];
  const bajoMinimo = inventario?.bajo_minimo ?? 0;
  const total = inventario?.total ?? 0;

  return (
    <div className="relative min-h-screen w-full bg-[#140b05]">
      <img
        src={fondo}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none fixed inset-0 h-full w-full select-none object-cover blur-[6px] brightness-[0.45]"
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(RUTA_DASHBOARD)}
              className="rounded-lg border border-[#b07a3a]/70 bg-[#1b1208]/80 px-3 py-2 text-sm font-bold uppercase tracking-wide text-[#f2c48a] transition hover:bg-[#2d1b0e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]"
            >
              <span aria-hidden="true">←</span> Atrás
            </button>
            <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-[#f2c48a] sm:text-2xl">
              Pañol de la enfermería
            </h1>
          </div>

          {/* El titular útil no es el porcentaje, es cuántos insumos hay que
              reponer. El porcentaje queda como dato de apoyo. */}
          {!cargando && !errorCarga && (
            <p className="text-sm text-[#cbb391]" role="status">
              {bajoMinimo === 0 ? (
                <span className="font-semibold text-[#7dffa0]">
                  Los {total} insumos tienen stock suficiente
                </span>
              ) : (
                <span className="font-semibold text-[#ff8a7a]">
                  {bajoMinimo} de {total} insumos por debajo del mínimo
                </span>
              )}
              {inventario?.porcentaje != null && (
                <span className="ml-2 tabular-nums text-[#8a7a60]">
                  disponibilidad {inventario.porcentaje}%
                </span>
              )}
            </p>
          )}
        </header>

        {errorCarga && (
          <p
            className="rounded-lg border border-red-400/50 bg-[#2a1115]/90 px-4 py-3 text-sm font-semibold text-red-300"
            role="alert"
          >
            {errorCarga}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* ── Existencias ── */}
          <section
            aria-labelledby="titulo-existencias"
            className="rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm"
          >
            <h2
              id="titulo-existencias"
              className="border-b border-[#b07a3a]/40 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#e0b060]"
            >
              Existencias
            </h2>

            {cargando ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]" role="status">
                Cargando existencias…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#a58a5a]">
                No hay insumos registrados. Añádelos en la base de datos para verlos aquí.
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <Insumo key={item.id_medicamento} item={item} />
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-5">
            {/* ── Registrar movimiento ── */}
            <section
              aria-labelledby="titulo-movimiento"
              className="rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm"
            >
              <h2
                id="titulo-movimiento"
                className="border-b border-[#b07a3a]/40 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#e0b060]"
              >
                Registrar movimiento
              </h2>

              <form onSubmit={handleSubmit} noValidate className="space-y-3 p-4">
                <div>
                  <label htmlFor="mov-lote" className={claseEtiqueta}>
                    Lote
                  </label>
                  <select
                    id="mov-lote"
                    name="id_lote"
                    className={claseCampo}
                    value={form.id_lote}
                    onChange={handleChange}
                    aria-invalid={Boolean(errores.id_lote)}
                  >
                    <option value="">Elige el lote</option>
                    {lotes.map((lote) => (
                      <option key={lote.id_lote} value={lote.id_lote}>
                        {lote.etiqueta}
                      </option>
                    ))}
                  </select>
                  {errores.id_lote && (
                    <p className="mt-1 text-xs font-semibold text-red-300">{errores.id_lote}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="mov-tipo" className={claseEtiqueta}>
                      Tipo
                    </label>
                    <select
                      id="mov-tipo"
                      name="tipo_movimiento"
                      className={claseCampo}
                      value={form.tipo_movimiento}
                      onChange={handleChange}
                    >
                      {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="mov-cantidad" className={claseEtiqueta}>
                      Cantidad
                    </label>
                    <input
                      id="mov-cantidad"
                      name="cantidad"
                      inputMode="numeric"
                      className={claseCampo}
                      placeholder="0"
                      value={form.cantidad}
                      onChange={handleChange}
                      aria-invalid={Boolean(errores.cantidad)}
                    />
                    {errores.cantidad && (
                      <p className="mt-1 text-xs font-semibold text-red-300">{errores.cantidad}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="mov-motivo" className={claseEtiqueta}>
                    Motivo {form.tipo_movimiento === 'ENTRADA' && '(opcional)'}
                  </label>
                  <input
                    id="mov-motivo"
                    name="motivo"
                    className={claseCampo}
                    maxLength={300}
                    placeholder={
                      form.tipo_movimiento === 'ENTRADA'
                        ? 'Compra, donación, traslado…'
                        : 'Por qué sale del pañol'
                    }
                    value={form.motivo}
                    onChange={handleChange}
                    aria-invalid={Boolean(errores.motivo)}
                  />
                  {errores.motivo && (
                    <p className="mt-1 text-xs font-semibold text-red-300">{errores.motivo}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={guardando}
                  className="h-10 w-full rounded-lg border border-[#ffd36a]/70 bg-gradient-to-b from-[#e8a93c] to-[#a8611a] text-sm font-bold uppercase tracking-wide text-[#2a1507] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] disabled:cursor-wait disabled:opacity-60"
                >
                  {guardando ? 'Registrando…' : 'Registrar movimiento'}
                </button>

                {aviso && (
                  <p
                    className="text-sm font-semibold"
                    style={{ color: aviso.tipo === 'ok' ? '#7dffa0' : '#ff8a7a' }}
                    role={aviso.tipo === 'error' ? 'alert' : 'status'}
                  >
                    {aviso.texto}
                  </p>
                )}

                <p className="text-xs leading-relaxed text-[#8a7a60]">
                  Los movimientos no se editan ni se borran: para corregir uno se registra el
                  contrario. Queda firmado con tu cuenta.
                </p>
              </form>
            </section>

            {/* ── Historial ── */}
            <section
              aria-labelledby="titulo-historial"
              className="rounded-xl border border-[#b07a3a]/60 bg-[#141a26]/90 shadow-[0_0_2em_rgba(0,0,0,0.6)] backdrop-blur-sm"
            >
              <h2
                id="titulo-historial"
                className="border-b border-[#b07a3a]/40 px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#e0b060]"
              >
                Últimos movimientos
              </h2>

              <div className="max-h-[26rem] overflow-y-auto px-4">
                {cargando ? (
                  <p className="py-8 text-center text-sm text-[#a58a5a]" role="status">
                    Cargando movimientos…
                  </p>
                ) : movimientos.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#a58a5a]">
                    Todavía no hay movimientos. El primero que registres aparecerá aquí.
                  </p>
                ) : (
                  <ul>
                    {movimientos.map((m) => (
                      <Movimiento key={m.id_movimiento} movimiento={m} />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
