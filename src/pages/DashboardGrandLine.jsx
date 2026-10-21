// Fondo del dashboard con overlay para elementos interactivos.
import fondoDashboard from "../images/inicio.jpg";

export const IMG_W = 2576;
export const IMG_H = 1438;

export const estilos = {
  // Botones transparentes sobre la imagen base.
  boton:
    "h-full w-full rounded-full bg-transparent text-transparent transition " +
    "hover:bg-orange-300/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd36a]",
};

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

export default function DashboardGrandLine({ children }) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#140b05]">
      {/* Fondo difuminado para ambientar la vista. */}
      <img
        src={fondoDashboard}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 select-none object-cover blur-2xl brightness-[0.6]"
      />

      {/* Capa principal con la imagen y los hijos encima. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: `min(100vw, calc(100vh * ${IMG_W} / ${IMG_H}))`,
          height: `min(100vh, calc(100vw * ${IMG_H} / ${IMG_W}))`,
          // 1em = 1% del ancho de la imagen -> los textos escalan junto con ella
          fontSize: `min(1vw, calc(1vh * ${IMG_W} / ${IMG_H}))`,
        }}
      >
        <img
          src={fondoDashboard}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
          style={{
            // Bordes que se funden con el fondo difuminado
            WebkitMaskImage:
              "linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), " +
              "linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)",
            WebkitMaskComposite: "source-in",
            maskImage:
              "linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), " +
              "linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)",
            maskComposite: "intersect",
          }}
        />
        {children}
      </div>
    </div>
  );
}
