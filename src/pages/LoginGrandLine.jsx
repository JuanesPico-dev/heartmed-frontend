// Fondo del login con capas transparentes para inputs y botones.
import fondoLogin from "../images/login.jpg";
const IMG_W = 1580;
const IMG_H = 893;

export const estilos = {
  input:
    "h-full w-full rounded-md border-0 bg-[#2a190b] px-[3%] text-[#fbe9c0] " +
    "placeholder-[#a58a5a] outline-none focus:ring-2 focus:ring-[#ffd36a]",
  select:
    "h-full w-full appearance-none rounded-md border-0 bg-[#2a190b] px-[3%] text-[#fbe9c0] " +
    "outline-none focus:ring-2 focus:ring-[#ffd36a]",
  // Botón transparente sobre la imagen base.
  boton:
    "h-full w-full rounded-full bg-transparent text-transparent transition " +
    "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a] " +
    "disabled:cursor-wait disabled:bg-black/30",
  error: "text-center font-semibold text-red-300",
  enlace: "block h-full w-full text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd36a]",
};

// Posiciona un elemento sobre la imagen usando coordenadas en px.
export function Zona({ x, y, w, h, className = "", children }) {
  return (
    <div
      className={`absolute ${className}`}
      style={{
        left: `${(x / IMG_W) * 100}%`,
        top: `${(y / IMG_H) * 100}%`,
        width: `${(w / IMG_W) * 100}%`,
        height: `${(h / IMG_H) * 100}%`,
      }}
    >
      {children}
    </div>
  );
}

export default function LoginGrandLine({ children }) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#1a1008]">
      {/* Imagen de fondo con alineación lateral. */}
      <div
        className="absolute right-0 top-0"
        style={{
          width: `max(100vw, calc(100vh * ${IMG_W} / ${IMG_H}))`,
          height: `max(100vh, calc(100vw * ${IMG_H} / ${IMG_W}))`,
          fontSize: `max(1.05vw, calc(1.05vh * ${IMG_W} / ${IMG_H}))`,
        }}
      >
        <img
          src={fondoLogin}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
        />
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   EJEMPLO DE USO. Los nombres que empiezan por TU_ son de relleno:
   en tu archivo real deja los tuyos (estados, funciones, name, etc.).

import LoginGrandLine, { Zona, estilos } from "./LoginGrandLine";

<LoginGrandLine>
  <form onSubmit={TU_FUNCION_DE_ENVIO} className="contents">

    <Zona x={1188} y={428} w={285} h={34}>
      <input className={estilos.input} type="email" aria-label="Correo"
             value={TU_ESTADO_CORREO} onChange={TU_ONCHANGE_CORREO} />
    </Zona>

    <Zona x={1188} y={510} w={255} h={34}>
      <input className={estilos.input} type="password" aria-label="Contraseña"
             value={TU_ESTADO_CLAVE} onChange={TU_ONCHANGE_CLAVE} />
    </Zona>

    <Zona x={1188} y={592} w={285} h={34}>
      <select className={estilos.select} aria-label="División médica">
        <option>Select</option>
      </select>
      <span className="pointer-events-none absolute right-[3%] top-1/2 -translate-y-1/2 text-[#e0b060]">▾</span>
    </Zona>

    <Zona x={1112} y={652} w={378} h={82}>
      <button type="submit" className={estilos.boton}>ENTER THE MEDICAL BAY</button>
    </Zona>

    {TU_MENSAJE_DE_ERROR && (
      <Zona x={1105} y={737} w={385} h={18} className="flex items-center justify-center">
        <p className={estilos.error}>{TU_MENSAJE_DE_ERROR}</p>
      </Zona>
    )}

    <Zona x={1355} y={762} w={130} h={24}>
      <a href="#" className={estilos.enlace}>RECOVER KEY</a>
    </Zona>
  </form>
</LoginGrandLine>
---------------------------------------------------------------- */
