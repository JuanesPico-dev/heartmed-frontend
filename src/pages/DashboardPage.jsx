// src/pages/DashboardPage.jsx
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useDashboardStats from '../hooks/useDashboardStats';
import DashboardGrandLine, { Zona, estilos } from './DashboardGrandLine';

// ⚠️ Ruta de la pantalla de registro de pacientes (la está haciendo otra persona).
// Cuando exista, cambia solo este valor por la ruta real definida en App.jsx.
const RUTA_REGISTRO_PACIENTE = '/pacientes/registro';

// Número con brillo neón; `valor` null = todavía sin dato
function Cifra({ valor, color, brillo }) {
  const texto = valor ?? '—';
  const esLargo = String(texto).length > 5; // "ONLINE" / "OFFLINE" necesitan letra más chica

  return (
    <span
      className="font-bold leading-none tabular-nums"
      style={{
        fontSize: esLargo ? '3.1em' : '4.6em',
        color,
        textShadow: `0 0 0.2em ${brillo}, 0 0 0.5em ${brillo}`,
      }}
    >
      {texto}
    </span>
  );
}

const centrado = 'flex items-center justify-center';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const stats = useDashboardStats({ enabled: Boolean(user) });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleVolverLogin = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <DashboardGrandLine>
      {/* "Bienvenido," ya está dibujado: el nombre va justo a continuación */}
      <Zona x={1462} y={258} w={430} h={90} className="flex items-center">
        <span
          className="truncate font-semibold"
          style={{ fontSize: '3.1em', color: '#e9c7a0' }}
          title={user.name || user.email}
        >
          {user.name || user.email || 'usuario'}
        </span>
      </Zona>

      {/* Pacientes activos (azul) */}
      <Zona x={890} y={455} w={350} h={120} className={centrado}>
        <Cifra valor={stats.activos} color="#8fdcff" brillo="rgba(70,170,255,0.8)" />
      </Zona>

      {/* Pacientes críticos (rojo) */}
      <Zona x={1550} y={455} w={350} h={120} className={centrado}>
        <Cifra valor={stats.criticos} color="#ff8a7a" brillo="rgba(255,70,50,0.8)" />
      </Zona>

      {/* Inventario general (ámbar) */}
      <Zona x={890} y={755} w={350} h={120} className={centrado}>
        <Cifra
          valor={stats.inventario != null ? `${stats.inventario}%` : null}
          color="#ffd978"
          brillo="rgba(255,170,40,0.8)"
        />
      </Zona>

      {/* Sistema up-time (verde): entre la brújula y el pulso dibujado */}
      <Zona x={1530} y={755} w={290} h={120} className={centrado}>
        <Cifra valor={stats.uptime} color="#7dffa0" brillo="rgba(60,230,110,0.8)" />
      </Zona>

      {/* Aviso si el backend no responde */}
      {stats.error && (
        <Zona x={680} y={982} w={1240} h={30} className={centrado}>
          <p className="text-[1.05em] font-semibold text-red-300" role="status">
            {stats.error}
          </p>
        </Zona>
      )}

      {/* Botones invisibles sobre los dibujados */}
      <Zona x={1010} y={1060} w={580} h={120}>
        <button type="button" className={estilos.boton} onClick={handleVolverLogin}>
          Volver al login
        </button>
      </Zona>

      <Zona x={990} y={1205} w={620} h={135}>
        <button
          type="button"
          className={estilos.boton}
          onClick={() => navigate(RUTA_REGISTRO_PACIENTE)}
        >
          Registrar paciente
        </button>
      </Zona>
    </DashboardGrandLine>
  );
}
