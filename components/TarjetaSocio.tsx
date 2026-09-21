'use client';

// La regla no cambia: el color decide antes que el texto. Lo que cambia es
// como se lee a un metro de distancia — franja de color a la izquierda, foto
// mas grande, nombre en peso 900, y una barra inferior que consume los 8
// segundos que la tarjeta se queda en pantalla, para que recepcion sepa
// cuanto le falta antes del siguiente socio.

import { fechaCorta, urlArchivo } from '@/lib/api';

const COLORES: Record<
  string,
  { franja: string; borde: string; texto: string; fondo: string; degradado: string; etiqueta: string }
> = {
  vigente: {
    franja: 'bg-vigente',
    borde: 'border-vigente/40',
    texto: 'text-vigente',
    fondo: 'bg-vigente/[0.14]',
    degradado: 'bg-[linear-gradient(120deg,rgba(34,197,94,.1),#121215_58%)]',
    etiqueta: 'Puede pasar',
  },
  por_vencer: {
    franja: 'bg-porvencer',
    borde: 'border-porvencer/40',
    texto: 'text-porvencer',
    fondo: 'bg-porvencer/[0.14]',
    degradado: 'bg-[linear-gradient(120deg,rgba(251,146,60,.1),#121215_58%)]',
    etiqueta: 'Por vencer',
  },
  vencido: {
    franja: 'bg-vencido',
    borde: 'border-vencido/40',
    texto: 'text-vencido',
    fondo: 'bg-vencido/[0.14]',
    degradado: 'bg-[linear-gradient(120deg,rgba(239,68,68,.1),#121215_58%)]',
    etiqueta: 'Vencida',
  },
  sin_membresia: {
    franja: 'bg-vencido',
    borde: 'border-vencido/40',
    texto: 'text-vencido',
    fondo: 'bg-vencido/[0.14]',
    degradado: 'bg-[linear-gradient(120deg,rgba(239,68,68,.1),#121215_58%)]',
    etiqueta: 'Sin membresia',
  },
};

export function TarjetaSocio({
  socio,
  resultado,
  tipo,
  motivo,
  compacta = false,
  /** Segundos que la tarjeta permanece visible; dibuja la barra de tiempo. */
  segundos,
}: {
  socio: any;
  resultado?: 'permitido' | 'denegado' | 'repetido';
  tipo?: 'entrada' | 'salida';
  motivo?: string;
  compacta?: boolean;
  segundos?: number;
}) {
  if (!socio) {
    return (
      <div className="franja-vencido animate-entrar rounded-2xl border border-vencido/40 bg-vencido/[0.08] p-6">
        <p className="text-2xl font-black tracking-tight text-vencido">Codigo no reconocido</p>
        <p className="mt-1.5 text-sm text-zinc-300">{motivo}</p>
      </div>
    );
  }

  const estilo = COLORES[socio.estado] ?? COLORES.sin_membresia;
  const denegado = resultado === 'denegado';
  const marco = denegado ? COLORES.vencido : estilo;
  const foto = urlArchivo(socio.fotoUrl);

  return (
    <div
      className={`animate-entrar relative flex gap-5 overflow-hidden rounded-[20px] border p-[22px] ${marco.borde} ${marco.degradado}`}
    >
      <span className={`absolute bottom-0 left-0 top-0 w-1 ${marco.franja}`} />

      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-borde bg-black/45 ${
          compacta ? 'h-14 w-14' : 'h-[124px] w-[124px]'
        }`}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={socio.nombreCompleto} className="h-full w-full object-cover" />
        ) : (
          <span className={`font-black text-zinc-700 ${compacta ? 'text-lg' : 'text-4xl'}`}>
            {socio.nombres?.[0]}
            {socio.apellidos?.[0]}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-[11px]">
          <p
            className={`font-black leading-[1.05] tracking-[-0.03em] ${
              compacta ? 'text-lg' : 'text-3xl'
            }`}
          >
            {socio.nombreCompleto}
          </p>
          {tipo && !denegado && (
            <span
              className={`rounded-[9px] px-[11px] py-[5px] text-[13px] font-extrabold tracking-[0.06em] ${
                tipo === 'entrada' ? 'bg-vigente/20 text-vigente' : 'bg-white/10 text-zinc-300'
              }`}
            >
              {tipo === 'entrada' ? 'ENTRA' : 'SALE'}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-sm text-zinc-400 cifra">
          DNI {socio.dni}
          {socio.plan ? ` · ${socio.plan}` : ''}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className={`rounded-[9px] px-3 py-1.5 text-[13.5px] font-bold ${marco.fondo} ${marco.texto}`}>
            {denegado ? 'No puede pasar' : estilo.etiqueta}
          </span>
          {socio.diasRestantes !== null && socio.diasRestantes !== undefined && (
            <span className="text-[13.5px] text-zinc-300 cifra">
              {socio.diasRestantes >= 0
                ? `Quedan ${socio.diasRestantes} dia(s) · vence ${fechaCorta(socio.vence)}`
                : `Vencio hace ${Math.abs(socio.diasRestantes)} dia(s)`}
            </span>
          )}
          {socio.dentro && !tipo && (
            <span className="rounded-[9px] bg-white/10 px-2.5 py-1 text-[13.5px] text-zinc-300">
              Esta dentro
            </span>
          )}
        </div>

        {motivo && <p className="mt-2.5 text-sm text-zinc-300">{motivo}</p>}
      </div>

      {segundos ? (
        <span
          className={`absolute bottom-0 left-0 h-[3px] w-full origin-left ${marco.franja}`}
          style={{ animation: `crecer ${segundos}s linear reverse both` }}
        />
      ) : null}
    </div>
  );
}
