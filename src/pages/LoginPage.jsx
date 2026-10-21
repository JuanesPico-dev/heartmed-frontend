import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkApiHealth, checkServerHealth, loginUser } from '../services/api';
import LoginGrandLine, { Zona, estilos } from './LoginGrandLine';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Devuelve un mensaje por campo ('' = sin error)
function validar({ email, password }) {
  const errores = { email: '', password: '' };

  if (!email.trim()) {
    errores.email = 'Ingresa tu correo.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errores.email = 'El correo no tiene un formato válido.';
  }

  if (!password.trim()) {
    errores.password = 'Ingresa tu contraseña.';
  }

  return errores;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  // Decorativo: el backend todavía no recibe la división médica
  const [division, setDivision] = useState('');
  const [apiStatus, setApiStatus] = useState({
    state: 'checking',
    message: 'Verificando servicio HeartMed...',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [loginFailed, setLoginFailed] = useState(false); // el backend rechazó las credenciales

  useEffect(() => {
    let mounted = true;

    const verifyHealth = async () => {
      try {
        const health = await checkServerHealth();

        if (mounted) {
          const isHealthy = health?.status === 'ok';
          setApiStatus({
            state: isHealthy ? 'online' : 'offline',
            message: isHealthy ? 'API activa en /health' : 'El servicio responde pero no está en estado OK.',
          });
        }
      } catch (serverError) {
        try {
          const apiHealth = await checkApiHealth();

          if (mounted) {
            const isHealthy = apiHealth?.status === 'ok';
            setApiStatus({
              state: isHealthy ? 'online' : 'offline',
              message: isHealthy ? 'API activa en /api/health' : 'La API responde pero no está en estado OK.',
            });
          }
        } catch (apiError) {
          if (mounted) {
            setApiStatus({
              state: 'offline',
              message: 'Sin conexión con HeartMed. Revisa que el backend esté activo (puerto 18080) y el CORS.',
            });
          }
        }
      }
    };

    verifyHealth();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setLoginFailed(false);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoginFailed(false);

    const errores = validar(form);
    setFieldErrors(errores);
    if (errores.email || errores.password) return;

    if (apiStatus.state !== 'online') {
      setError('La API de HeartMed no está disponible. Revisa que el backend esté levantado.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await loginUser({
        email: form.email.trim(),
        password: form.password.trim(),
      });

      if (!response?.success) {
        setLoginFailed(true);
        throw new Error(response?.message || 'Correo o contraseña incorrectos.');
      }

      const userData = {
        email: response.email || form.email,
        name: (response.email || form.email).split('@')[0],
        rol: response.rol || 'usuario',
      };

      if (response?.token) {
        localStorage.setItem('token', response.token);
      }

      login(userData);
      navigate('/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Un solo mensaje bajo el botón: error de login o API caída
  const mensaje = error || (apiStatus.state === 'offline' ? apiStatus.message : '');

  return (
    <LoginGrandLine>
      <form onSubmit={handleSubmit} noValidate className="contents">
        {/* Chief Medical Officer / ID  ->  email */}
        <Zona x={1188} y={428} w={285} h={34}>
          <input
            className={`${estilos.input} ${fieldErrors.email || loginFailed ? 'ring-2 ring-red-400' : ''}`}
            type="email"
            name="email"
            aria-label="Email"
            aria-invalid={Boolean(fieldErrors.email || loginFailed)}
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
          />
        </Zona>
        {fieldErrors.email && (
          <Zona x={1188} y={464} w={285} h={18} className="flex items-center">
            <p className="text-[0.7em] font-semibold leading-tight text-red-300" role="alert">
              {fieldErrors.email}
            </p>
          </Zona>
        )}

        {/* Security Encryption / Pass  ->  password (w más corto para dejar ver el candado) */}
        <Zona x={1188} y={510} w={255} h={34}>
          <input
            className={`${estilos.input} ${fieldErrors.password || loginFailed ? 'ring-2 ring-red-400' : ''}`}
            type="password"
            name="password"
            aria-label="Contraseña"
            aria-invalid={Boolean(fieldErrors.password || loginFailed)}
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
          />
        </Zona>
        {fieldErrors.password && (
          <Zona x={1188} y={546} w={285} h={18} className="flex items-center">
            <p className="text-[0.7em] font-semibold leading-tight text-red-300" role="alert">
              {fieldErrors.password}
            </p>
          </Zona>
        )}

        {/* Medical Division  ->  decorativo por ahora */}
        <Zona x={1188} y={592} w={285} h={34}>
          <select
            className={estilos.select}
            aria-label="División médica"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          >
            <option value="">Select</option>
            <option value="cardiologia">Cardiología</option>
            <option value="cirugia">Cirugía</option>
            <option value="emergencias">Emergencias</option>
            <option value="pediatria">Pediatría</option>
          </select>
          <span className="pointer-events-none absolute right-[3%] top-1/2 -translate-y-1/2 text-[#e0b060]">▾</span>
        </Zona>

        {/* Botón invisible sobre el dibujo "ENTER THE MEDICAL BAY" */}
        <Zona x={1112} y={652} w={378} h={82}>
          <button
            type="submit"
            className={estilos.boton}
            disabled={isSubmitting || apiStatus.state !== 'online'}
            aria-label={isSubmitting ? 'Iniciando sesión' : 'Entrar'}
          >
            {isSubmitting ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </Zona>

        {/* Mensajes de error / estado de la API */}
        {mensaje && (
          <Zona x={1090} y={736} w={420} h={22} className="flex items-center justify-center">
            <p className={`${estilos.error} text-[0.7em] leading-tight`} role="alert">
              {mensaje}
            </p>
          </Zona>
        )}

        {/* Recover key (aún sin ruta) */}
        <Zona x={1355} y={762} w={130} h={24}>
          <a href="#" onClick={(e) => e.preventDefault()} className={estilos.enlace}>
            Recuperar clave
          </a>
        </Zona>
      </form>
    </LoginGrandLine>
  );
}
