'use client';

import { useMemo, useRef, useState } from 'react';

type Punto = { etiqueta: string; valor: number };

const ANCHO = 640;
const ALTO = 220;
const M = { arriba: 16, derecha: 18, abajo: 26, izquierda: 46 };

/**
 * Serie temporal de una sola medida: el peso que levanta o el peso corporal.
 *
 * Una sola serie, asi que no lleva leyenda — el titulo dice que es. El ultimo
 * punto va etiquetado y el resto se lee al pasar el cursor, en vez de llenar el
 * grafico de numeros.
 */
export function GraficoLinea({
  puntos,
  unidad = 'kg',
  color = '#d7ff3e',
  titulo,
}: {
  puntos: Punto[];
  unidad?: string;
  color?: string;
  titulo?: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState<number | null>(null);

  const escala = useMemo(() => {
    if (puntos.length === 0) return null;
    const valores = puntos.map((p) => p.valor);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    // Un margen del 8% evita que la linea toque los bordes y que una serie
    // plana quede pegada al eje.
    const margen = Math.max((max - min) * 0.08, max === min ? Math.max(max * 0.05, 1) : 0);
    const inferior = Math.max(0, min - margen);
    const superior = max + margen;

    const x = (i: number) =>
      puntos.length === 1
        ? M.izquierda + (ANCHO - M.izquierda - M.derecha) / 2
        : M.izquierda + (i / (puntos.length - 1)) * (ANCHO - M.izquierda - M.derecha);
    const y = (v: number) =>
      ALTO - M.abajo - ((v - inferior) / (superior - inferior || 1)) * (ALTO - M.arriba - M.abajo);

    return { x, y, inferior, superior };
  }, [puntos]);

  if (!escala) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-600">
        Todavia no hay datos para mostrar.
      </div>
    );
  }

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${escala.x(i)} ${escala.y(p.valor)}`).join(' ');
  const referencias = [escala.superior, (escala.superior + escala.inferior) / 2, escala.inferior];
  const ultimo = puntos[puntos.length - 1];

  return (
    <div ref={contenedor} className="relative">
      {titulo && <p className="mb-1 text-sm text-zinc-400">{titulo}</p>}

      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full"
        role="img"
        aria-label={titulo || 'Evolucion en el tiempo'}
        onMouseLeave={() => setActivo(null)}
        onMouseMove={(e) => {
          const caja = e.currentTarget.getBoundingClientRect();
          const relativo = ((e.clientX - caja.left) / caja.width) * ANCHO;
          const util = ANCHO - M.izquierda - M.derecha;
          const i = Math.round(((relativo - M.izquierda) / util) * (puntos.length - 1));
          setActivo(Math.min(puntos.length - 1, Math.max(0, i)));
        }}
      >
        {/* Rejilla discreta: esta para poder leer, no para mirarse. */}
        {referencias.map((v, i) => (
          <g key={i}>
            <line
              x1={M.izquierda}
              x2={ANCHO - M.derecha}
              y1={escala.y(v)}
              y2={escala.y(v)}
              stroke="#26262b"
              strokeWidth={1}
            />
            <text x={M.izquierda - 8} y={escala.y(v) + 4} textAnchor="end" fontSize="11" fill="#71717a">
              {Math.round(v * 10) / 10}
            </text>
          </g>
        ))}

        {puntos.length > 1 && (
          <path d={linea} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {puntos.map((p, i) => (
          <circle
            key={i}
            cx={escala.x(i)}
            cy={escala.y(p.valor)}
            r={activo === i ? 6 : 4}
            fill={color}
            stroke="#141417"
            strokeWidth={2}
          />
        ))}

        {activo !== null && (
          <line
            x1={escala.x(activo)}
            x2={escala.x(activo)}
            y1={M.arriba}
            y2={ALTO - M.abajo}
            stroke="#3f3f46"
            strokeWidth={1}
          />
        )}

        {/* El primero y el ultimo dan la referencia temporal sin amontonar. */}
        <text x={M.izquierda} y={ALTO - 8} fontSize="11" fill="#71717a">
          {puntos[0].etiqueta}
        </text>
        {puntos.length > 1 && (
          <text x={ANCHO - M.derecha} y={ALTO - 8} fontSize="11" fill="#71717a" textAnchor="end">
            {ultimo.etiqueta}
          </text>
        )}
      </svg>

      {activo !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-borde bg-fondo px-3 py-2 text-sm shadow-lg"
          style={{ left: `${(escala.x(activo) / ANCHO) * 100}%`, top: 0 }}
        >
          <p className="font-semibold">
            {puntos[activo].valor} {unidad}
          </p>
          <p className="text-zinc-500">{puntos[activo].etiqueta}</p>
        </div>
      )}
    </div>
  );
}
