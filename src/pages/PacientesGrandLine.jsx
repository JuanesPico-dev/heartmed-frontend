// src/pages/PacientesGrandLine.jsx
// Fondo de la pantalla de pacientes (tabla vacía del diseño) + <Zona> para
// poner el formulario y los datos reales encima.
// Misma técnica que DashboardGrandLine: imagen "contain" (nunca se recorta)
// sobre una copia difuminada de sí misma.
//
// ⚠️ Guarda la última imagen del diseño como  src/images/pacientes.jpg
//    (debe medir 2576 x 1438, igual que la del dashboard; si cambia, ajusta IMG_W/IMG_H
//    en DashboardGrandLine.jsx, de donde se importan).
import fondoPacientes from '../images/pacientes.jpg';
import { IMG_W, IMG_H, Zona } from './DashboardGrandLine';

export { Zona };

export default function PacientesGrandLine({ children }) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#140b05]">
      <img
        src={fondoPacientes}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 select-none object-cover blur-2xl brightness-[0.6]"
      />

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
          src={fondoPacientes}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), ' +
              'linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)',
            WebkitMaskComposite: 'source-in',
            maskImage:
              'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent), ' +
              'linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)',
            maskComposite: 'intersect',
          }}
        />
        {children}
      </div>
    </div>
  );
}
