import { ESPALDA, FRENTE, type Musculo } from './siluetasCuerpo';

/**
 * Zonas que el socio elige al llegar. `grupo` es el mismo valor que guarda el
 * catalogo de ejercicios, asi que elegir una zona filtra los ejercicios sin
 * ninguna tabla intermedia.
 */
export type Zona = {
  grupo: string;
  nombre: string;
  musculos: Musculo[];
  vista: 'frente' | 'espalda' | 'ambas';
};

export const SECCIONES: { titulo: string; zonas: Zona[] }[] = [
  {
    titulo: 'Torso',
    zonas: [
      { grupo: 'pecho', nombre: 'Pecho', musculos: ['chest'], vista: 'frente' },
      { grupo: 'espalda', nombre: 'Espalda', musculos: ['upper-back', 'lower-back', 'trapezius'], vista: 'espalda' },
      { grupo: 'core', nombre: 'Abdomen', musculos: ['abs', 'obliques'], vista: 'frente' },
    ],
  },
  {
    titulo: 'Brazos y hombros',
    zonas: [
      { grupo: 'hombro', nombre: 'Hombros', musculos: ['front-deltoids', 'back-deltoids'], vista: 'ambas' },
      { grupo: 'brazo', nombre: 'Brazos', musculos: ['biceps', 'triceps', 'forearm'], vista: 'ambas' },
    ],
  },
  {
    titulo: 'Tren inferior',
    zonas: [
      { grupo: 'gluteo', nombre: 'Gluteos', musculos: ['gluteal'], vista: 'espalda' },
      {
        grupo: 'pierna',
        nombre: 'Piernas',
        musculos: ['quadriceps', 'hamstring', 'calves', 'adductor', 'abductors', 'left-soleus', 'right-soleus'],
        vista: 'ambas',
      },
    ],
  },
];

export const ZONA_CARDIO = { grupo: 'cardio', nombre: 'Cardio' };

export const NOMBRE_GRUPO: Record<string, string> = {
  ...Object.fromEntries(SECCIONES.flatMap((s) => s.zonas).map((z) => [z.grupo, z.nombre])),
  cardio: 'Cardio',
  otros: 'Otros',
  general: 'General',
};

function Silueta({
  piezas,
  resaltar,
  activo,
}: {
  piezas: typeof FRENTE;
  resaltar: Set<Musculo>;
  activo: boolean;
}) {
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto" aria-hidden="true">
      {piezas.map((pieza) =>
        pieza.puntos.map((puntos, i) => (
          <polygon
            key={`${pieza.musculo}-${i}`}
            points={puntos}
            className={`transition-colors duration-300 ${
              resaltar.has(pieza.musculo)
                ? activo
                  ? 'fill-acento'
                  : 'fill-acento/70'
                : 'fill-zinc-700/70'
            }`}
          />
        )),
      )}
    </svg>
  );
}

/** Figura humana con los musculos de la zona pintados. */
export function MapaCuerpo({
  musculos,
  vista = 'ambas',
  activo = false,
  className = 'h-28',
}: {
  musculos: Musculo[];
  vista?: 'frente' | 'espalda' | 'ambas';
  activo?: boolean;
  className?: string;
}) {
  const resaltar = new Set(musculos);
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {vista !== 'espalda' && <Silueta piezas={FRENTE} resaltar={resaltar} activo={activo} />}
      {vista !== 'frente' && <Silueta piezas={ESPALDA} resaltar={resaltar} activo={activo} />}
    </div>
  );
}

/** Icono de cardio: la silueta no dice nada util para correr en la cinta. */
export function IconoCardio({ activo = false }: { activo?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-12 w-12 transition-colors ${activo ? 'text-acento' : 'text-zinc-500'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4z" />
      <path d="M3 12h4l2-3 3 6 2-3h7" />
    </svg>
  );
}
