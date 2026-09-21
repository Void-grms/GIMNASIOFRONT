'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, fechaCorta } from '@/lib/api';
import { NOMBRE_GRUPO } from '@/components/MapaCuerpo';
import { Esqueleto } from '@/components/Esqueleto';

const LETRA = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIA = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const ZONAS = ['pecho', 'espalda', 'hombro', 'brazo', 'core', 'pierna', 'gluteo', 'cardio'];

/** Divisiones clasicas para arrancar el plan con un toque. */
const PLANTILLAS: { nombre: string; dias: Record<number, [string, string[]]> }[] = [
  {
    nombre: 'Full body · 3 dias',
    dias: {
      1: ['Cuerpo completo', ['pecho', 'espalda', 'pierna', 'hombro', 'core']],
      3: ['Cuerpo completo', ['pecho', 'espalda', 'pierna', 'hombro', 'core']],
      5: ['Cuerpo completo', ['pecho', 'espalda', 'pierna', 'hombro', 'core']],
    },
  },
  {
    nombre: 'Torso / Pierna · 4 dias',
    dias: {
      1: ['Torso', ['pecho', 'espalda', 'hombro', 'brazo']],
      2: ['Pierna', ['pierna', 'gluteo', 'core']],
      4: ['Torso', ['pecho', 'espalda', 'hombro', 'brazo']],
      5: ['Pierna', ['pierna', 'gluteo', 'core']],
    },
  },
  {
    nombre: 'Empuje / Jalon / Pierna · 6 dias',
    dias: {
      1: ['Empuje', ['pecho', 'hombro', 'brazo']],
      2: ['Jalon', ['espalda', 'brazo']],
      3: ['Pierna', ['pierna', 'gluteo', 'core']],
      4: ['Empuje', ['pecho', 'hombro', 'brazo']],
      5: ['Jalon', ['espalda', 'brazo']],
      6: ['Pierna', ['pierna', 'gluteo', 'core']],
    },
  },
  {
    nombre: 'Un musculo por dia · 5 dias',
    dias: {
      1: ['Pecho', ['pecho']],
      2: ['Espalda', ['espalda']],
      3: ['Pierna', ['pierna', 'gluteo']],
      4: ['Hombro y abdomen', ['hombro', 'core']],
      5: ['Brazos', ['brazo']],
    },
  },
];

const sumarDiasTexto = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * La semana del socio de lunes a domingo, como la vista semanal de Hevy: que
 * dias entreno, que zonas, cuantas series por zona y como va contra la semana
 * pasada. Abajo, su plan semanal (que zona toca cada dia), que se usa para
 * preseleccionar las zonas al entrar.
 */
export function SemanaEntreno() {
  const [semana, setSemana] = useState<any>(null);
  const [desde, setDesde] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async (d: string | null) => {
    try {
      setSemana(await api(`/portal/week${d ? `?desde=${d}` : ''}`, { sesion: 'socio' }));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar(desde);
  }, [desde, cargar]);

  useEffect(() => {
    if (semana) setAbierto(semana.dias.find((d: any) => d.esHoy)?.diaSemana ?? null);
  }, [semana]);

  if (error) return <p className="aviso-mal">{error}</p>;
  if (!semana) return <Esqueleto filas={2} />;

  const dia = semana.dias.find((d: any) => d.diaSemana === abierto);
  const maxSeries = Math.max(10, ...Object.values(semana.seriesPorGrupo as Record<string, number>));
  const delta = (a: number, b: number) =>
    b === 0 ? null : Math.round(((a - b) / b) * 100);

  return (
    <div className="space-y-5">
      <section className="tarjeta space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Semana anterior"
            className="boton-suave h-9 min-h-0 w-9 px-0"
            onClick={() => setDesde(sumarDiasTexto(semana.desde, -7))}
          >
            ‹
          </button>
          <div className="text-center">
            <p className="font-bold">{semana.esActual ? 'Esta semana' : 'Semana'}</p>
            <p className="text-xs text-zinc-500">
              {fechaCorta(semana.desde)} — {fechaCorta(semana.hasta)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Semana siguiente"
            className="boton-suave h-9 min-h-0 w-9 px-0 disabled:opacity-30"
            disabled={semana.esActual}
            onClick={() => setDesde(sumarDiasTexto(semana.desde, 7))}
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {semana.dias.map((d: any) => {
            const entreno = d.series > 0 || d.fueAlGym;
            return (
              <button
                key={d.fecha}
                type="button"
                onClick={() => setAbierto(d.diaSemana)}
                aria-pressed={abierto === d.diaSemana}
                className={`flex min-h-[4.75rem] flex-col items-center justify-start gap-1 rounded-xl border px-0.5 py-2 transition ${
                  abierto === d.diaSemana ? 'border-acento/60 bg-acento/[0.08]' : 'border-borde'
                } ${d.futuro ? 'opacity-50' : ''}`}
              >
                <span className={`text-[11px] font-bold ${d.esHoy ? 'text-acento' : 'text-zinc-500'}`}>{LETRA[d.diaSemana]}</span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold cifra ${
                    entreno ? 'bg-acento text-black' : d.esHoy ? 'border border-acento text-acento' : 'text-zinc-400'
                  }`}
                >
                  {Number(d.fecha.slice(8))}
                </span>
                <span className="line-clamp-2 px-0.5 text-center text-[9.5px] leading-tight text-zinc-400">
                  {d.grupos.length
                    ? d.grupos.map((g: string) => (NOMBRE_GRUPO[g] ?? g).slice(0, 5)).join(' ')
                    : d.plan?.grupos?.length
                    ? <span className="text-zinc-600">{d.plan.titulo || 'plan'}</span>
                    : ''}
                </span>
              </button>
            );
          })}
        </div>

        {dia && (
          <div className="rounded-xl bg-black/30 p-3 text-sm">
            <p className="font-semibold">
              {DIA[dia.diaSemana]} {Number(dia.fecha.slice(8))}
              {dia.fueAlGym && <span className="ml-2 text-xs font-normal text-vigente">vino al gym</span>}
            </p>
            {dia.plan?.grupos?.length > 0 && (
              <p className="text-xs text-zinc-500">
                Tu plan: {dia.plan.titulo || dia.plan.grupos.map((g: string) => NOMBRE_GRUPO[g] ?? g).join(', ')}
              </p>
            )}
            {dia.ejercicios.length ? (
              <ul className="mt-2 space-y-1">
                {dia.ejercicios.map((e: any) => (
                  <li key={e.nombre} className="flex justify-between gap-3">
                    <span className="text-zinc-200">{e.nombre}</span>
                    <span className="shrink-0 text-zinc-500 cifra">{e.series} series</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-zinc-500">
                {dia.futuro ? 'Todavia no llega.' : dia.fueAlGym ? 'Vino, pero no anoto ejercicios.' : 'Sin entrenamiento.'}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        {[
          ['Dias', semana.total.dias, semana.anterior.dias, ''],
          ['Series', semana.total.series, semana.anterior.series, ''],
          ['Volumen', semana.total.volumen, semana.anterior.volumen, ' kg'],
        ].map(([titulo, valor, previo, unidad]: any) => {
          const d = delta(valor, previo);
          return (
            <div key={titulo} className="tarjeta p-3 text-center">
              <p className="text-2xl font-black tracking-tight cifra">
                {valor >= 10000 ? `${Math.round(valor / 1000)}k` : valor}
                <span className="text-xs font-semibold text-zinc-500">{unidad}</span>
              </p>
              <p className="text-xs text-zinc-500">{titulo}</p>
              {d !== null && (
                <p className={`mt-0.5 text-[11px] font-semibold cifra ${d >= 0 ? 'text-vigente' : 'text-porvencer'}`}>
                  {d >= 0 ? '▲' : '▼'} {Math.abs(d)}% vs anterior
                </p>
              )}
            </div>
          );
        })}
      </section>

      <section className="tarjeta space-y-3">
        <div>
          <h2 className="font-semibold">Series por zona</h2>
          <p className="text-xs text-zinc-500">
            Como guia general, unas 10 series por zona a la semana es una buena base para progresar.
          </p>
        </div>
        {Object.keys(semana.seriesPorGrupo).length === 0 ? (
          <p className="text-sm text-zinc-500">Todavia no hay series anotadas esta semana.</p>
        ) : (
          <ul className="space-y-2">
            {ZONAS.filter((z) => semana.seriesPorGrupo[z]).concat(
              Object.keys(semana.seriesPorGrupo).filter((z) => !ZONAS.includes(z)),
            ).map((z) => {
              const n = semana.seriesPorGrupo[z];
              return (
                <li key={z} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-sm">
                  <span className="truncate text-zinc-300">{NOMBRE_GRUPO[z] ?? z}</span>
                  <span className="relative h-2.5 overflow-hidden rounded-full bg-black/50">
                    <span className={`absolute inset-y-0 left-0 rounded-full ${n >= 10 ? 'bg-acento' : 'bg-zinc-400'}`} style={{ width: `${(n / maxSeries) * 100}%` }} />
                    <span className="absolute inset-y-0 w-px bg-white/30" style={{ left: `${(10 / maxSeries) * 100}%` }} />
                  </span>
                  <span className="text-right font-bold cifra">{n}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PlanSemanal onGuardado={() => cargar(desde)} />
    </div>
  );
}

/** Que zona toca cada dia. Se usa para preseleccionar las zonas al llegar. */
function PlanSemanal({ onGuardado }: { onGuardado: () => void }) {
  const [plan, setPlan] = useState<any[] | null>(null);
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/portal/week-plan', { sesion: 'socio' }).then(setPlan).catch((e) => setError(e.message));
  }, []);

  if (!plan) return null;

  const cambiar = (dia: number, cambios: any) =>
    setPlan(plan.map((d) => (d.diaSemana === dia ? { ...d, ...cambios } : d)));

  function aplicar(p: (typeof PLANTILLAS)[number]) {
    setPlan(
      plan!.map((d) => {
        const t = p.dias[d.diaSemana];
        return { ...d, titulo: t ? t[0] : '', grupos: t ? [...t[1]] : [] };
      }),
    );
  }

  async function guardar() {
    setError('');
    try {
      setPlan(await api('/portal/week-plan', { metodo: 'PUT', sesion: 'socio', cuerpo: { dias: plan } }));
      setEditando(false);
      setAviso('Plan guardado. Al llegar al gym se marcan solas las zonas del dia.');
      onGuardado();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const vacio = plan.every((d) => !d.grupos.length);

  return (
    <section className="tarjeta space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Mi plan semanal</h2>
          <p className="text-xs text-zinc-500">Que entrenas cada dia. Es tuyo: cambialo cuando quieras.</p>
        </div>
        {!editando && (
          <button className="boton-suave shrink-0 py-2" onClick={() => setEditando(true)}>
            {vacio ? 'Armar' : 'Editar'}
          </button>
        )}
      </div>
      {aviso && <p className="aviso-ok">{aviso}</p>}
      {error && <p className="aviso-mal">{error}</p>}

      {!editando ? (
        vacio ? (
          <p className="text-sm text-zinc-500">
            Todavia no armaste tu semana. Elige una division clasica (full body, torso/pierna…) o arma la tuya.
          </p>
        ) : (
          <ul className="divide-y divide-borde text-sm">
            {plan.map((d) => (
              <li key={d.diaSemana} className="flex items-center justify-between gap-3 py-2">
                <span className="w-20 shrink-0 font-semibold text-zinc-300">{DIA[d.diaSemana]}</span>
                <span className={`min-w-0 flex-1 truncate text-right ${d.grupos.length ? 'text-zinc-200' : 'text-zinc-600'}`}>
                  {d.grupos.length
                    ? `${d.titulo ? d.titulo + ' · ' : ''}${d.grupos.map((g: string) => NOMBRE_GRUPO[g] ?? g).join(', ')}`
                    : 'Descanso'}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          <div>
            <p className="etiqueta">Empezar desde una division clasica</p>
            <div className="flex flex-wrap gap-1.5">
              {PLANTILLAS.map((p) => (
                <button key={p.nombre} type="button" className="rounded-lg border border-borde px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-acento hover:text-acento" onClick={() => aplicar(p)}>
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>
          {plan.map((d) => (
            <div key={d.diaSemana} className="space-y-2 rounded-xl border border-borde p-3">
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-sm font-bold">{DIA[d.diaSemana]}</span>
                <input
                  className="campo py-1.5 text-sm"
                  maxLength={40}
                  placeholder={d.grupos.length ? 'Nombre (opcional)' : 'Descanso'}
                  value={d.titulo}
                  onChange={(e) => cambiar(d.diaSemana, { titulo: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ZONAS.map((g) => {
                  const activo = d.grupos.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={activo}
                      onClick={() =>
                        cambiar(d.diaSemana, { grupos: activo ? d.grupos.filter((x: string) => x !== g) : [...d.grupos, g] })
                      }
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                        activo ? 'border-acento/50 bg-acento/15 text-acento' : 'border-borde text-zinc-500'
                      }`}
                    >
                      {NOMBRE_GRUPO[g] ?? g}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <button className="boton-suave" onClick={() => setEditando(false)}>
              Cancelar
            </button>
            <button className="boton flex-1" onClick={guardar}>
              Guardar plan
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
