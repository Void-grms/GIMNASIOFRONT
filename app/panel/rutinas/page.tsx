'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fechaCorta } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';
import { NOMBRE_GRUPO, SECCIONES } from '@/components/MapaCuerpo';

const DIAS = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const GRUPOS = [...SECCIONES.flatMap((s) => s.zonas.map((z) => z.grupo)), 'cardio'];

/**
 * Rutinas guiadas. Casi todos los socios entrenan a su manera: esto es para
 * los que recien empiezan y la piden desde el portal (o se la ofrece el
 * entrenador). Se asigna una plantilla por unas semanas y termina sola.
 */
export default function Rutinas() {
  const [plantillas, setPlantillas] = useState<any[] | null>(null);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [editando, setEditando] = useState<any>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [p, a]: any = await Promise.all([api('/routines'), api('/routine-assignments')]);
    setPlantillas(p);
    setAsignaciones(a);
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
    api('/portal/exercises').then(setEjercicios).catch(() => setEjercicios([]));
  }, [cargar]);

  const solicitudes = asignaciones.filter((a) => a.estado === 'solicitada');
  const activas = asignaciones.filter((a) => a.estado === 'activa');

  if (!plantillas) return error ? <p className="aviso-mal">{error}</p> : <Esqueleto />;

  return (
    <div className="space-y-8">
      {aviso && <p className="aviso-ok">{aviso}</p>}
      {error && <p className="aviso-mal">{error}</p>}

      <section className="space-y-3">
        <h2 className="rotulo">
          Pedidas desde el portal
          {solicitudes.length > 0 && <span className="ml-2 text-acento">{solicitudes.length}</span>}
        </h2>
        {solicitudes.length === 0 && (
          <div className="tarjeta text-sm text-zinc-500">
            Cuando un socio nuevo pida una rutina desde su celular, aparece aqui.
          </div>
        )}
        {solicitudes.map((a) => (
          <Asignar
            key={a.id}
            asignacion={a}
            plantillas={plantillas}
            onListo={(m) => {
              setAviso(m);
              cargar();
            }}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="rotulo">Asignar a un socio</h2>
        <Asignar
          plantillas={plantillas}
          onListo={(m) => {
            setAviso(m);
            cargar();
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="rotulo">
          Rutinas en curso <span className="ml-1 text-zinc-400">{activas.length}</span>
        </h2>
        <div className="tarjeta p-0">
          <ul className="divide-y divide-borde">
            {activas.length === 0 && <li className="p-4 text-sm text-zinc-500">Nadie tiene rutina guiada ahora.</li>}
            {activas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.socio.nombreCompleto}</p>
                  <p className="text-sm text-zinc-500">
                    {a.rutina?.nombre} · hasta {fechaCorta(a.hasta?.slice(0, 10))}
                  </p>
                </div>
                <button
                  className="boton-suave py-2"
                  onClick={async () => {
                    if (!window.confirm(`¿Terminar la rutina de ${a.socio.nombreCompleto}?`)) return;
                    await api(`/routine-assignments/${a.id}/end`, { metodo: 'POST' });
                    cargar();
                  }}
                >
                  Terminar
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="rotulo">Plantillas</h2>
          <button
            className="boton-suave py-2"
            onClick={() => setEditando({ nombre: '', descripcion: '', dias: [{ diaSemana: 1, titulo: '', grupos: [], ejercicios: [] }] })}
          >
            Nueva plantilla
          </button>
        </div>

        {editando && (
          <EditorPlantilla
            inicial={editando}
            ejercicios={ejercicios}
            onCancelar={() => setEditando(null)}
            onGuardado={() => {
              setEditando(null);
              setAviso('Plantilla guardada.');
              cargar();
            }}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {plantillas.map((p) => (
            <div key={p.id} className="tarjeta space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{p.nombre}</p>
                  {p.descripcion && <p className="text-sm text-zinc-500">{p.descripcion}</p>}
                </div>
                <span className="shrink-0 text-xs text-zinc-500">{p.activos} en curso</span>
              </div>
              <ul className="space-y-2 text-sm">
                {p.dias.map((d: any) => (
                  <li key={d.diaSemana}>
                    <span className="font-semibold text-acento">{d.nombreDia}:</span> {d.titulo}
                    <span className="block text-xs text-zinc-500">
                      {d.ejercicios.map((e: any) => `${e.nombre} ${e.series}×${e.repeticiones}`).join(' · ') || 'Sin ejercicios'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button className="boton-suave flex-1 py-2" onClick={() => setEditando(p)}>
                  Editar
                </button>
                <button
                  className="boton-suave py-2 text-zinc-500"
                  onClick={async () => {
                    if (!window.confirm(`¿Archivar "${p.nombre}"? Las rutinas en curso siguen hasta su fecha.`)) return;
                    await api(`/routines/${p.id}/archive`, { metodo: 'POST' });
                    cargar();
                  }}
                >
                  Archivar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Asignar una plantilla: a una solicitud del portal, o a un socio por DNI. */
function Asignar({
  asignacion,
  plantillas,
  onListo,
}: {
  asignacion?: any;
  plantillas: any[];
  onListo: (mensaje: string) => void;
}) {
  const [dni, setDni] = useState('');
  const [routineId, setRoutineId] = useState(plantillas[0]?.id || '');
  const [semanas, setSemanas] = useState(4);
  const [error, setError] = useState('');

  async function asignar() {
    setError('');
    try {
      let memberId = asignacion?.socio.id;
      let nombre = asignacion?.socio.nombreCompleto;
      if (!memberId) {
        const encontrados: any = await api(`/members?q=${dni}`);
        const socio = encontrados.find((s: any) => s.dni === dni);
        if (!socio) throw new Error(`Sin socio con DNI ${dni}`);
        memberId = socio.id;
        nombre = socio.nombreCompleto;
      }
      await api('/routine-assignments', { metodo: 'POST', cuerpo: { memberId, routineId, semanas } });
      setDni('');
      onListo(`Rutina asignada a ${nombre} por ${semanas} semana(s).`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className={`space-y-3 ${asignacion ? 'tarjeta-acento' : 'tarjeta'}`}>
      {asignacion && (
        <div>
          <p className="font-bold">{asignacion.socio.nombreCompleto}</p>
          <p className="text-sm text-zinc-500">
            Pidio el {fechaCorta(asignacion.desde)} · inscrito el {fechaCorta(asignacion.socio.inscrito)}
          </p>
          {asignacion.nota && <p className="mt-1 text-sm italic text-zinc-300">“{asignacion.nota}”</p>}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_7rem_auto] sm:items-end">
        {!asignacion && (
          <div>
            <label className="etiqueta">DNI</label>
            <input
              className="campo"
              inputMode="numeric"
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        )}
        <div className={asignacion ? 'sm:col-span-2' : ''}>
          <label className="etiqueta">Plantilla</label>
          <select className="campo" value={routineId} onChange={(e) => setRoutineId(e.target.value)}>
            {plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta">Semanas</label>
          <input
            type="number"
            min={1}
            max={12}
            className="campo"
            value={semanas}
            onChange={(e) => setSemanas(Number(e.target.value))}
          />
        </div>
        <button className="boton" disabled={!routineId || (!asignacion && dni.length !== 8)} onClick={asignar}>
          Asignar
        </button>
      </div>
      {error && <p className="aviso-mal">{error}</p>}
    </div>
  );
}

function EditorPlantilla({
  inicial,
  ejercicios,
  onCancelar,
  onGuardado,
}: {
  inicial: any;
  ejercicios: any[];
  onCancelar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(inicial.nombre || '');
  const [descripcion, setDescripcion] = useState(inicial.descripcion || '');
  const [dias, setDias] = useState<any[]>(
    inicial.dias.map((d: any) => ({
      diaSemana: d.diaSemana,
      titulo: d.titulo,
      grupos: [...(d.grupos || [])],
      ejercicios: d.ejercicios.map((e: any) => ({ exerciseId: e.exerciseId, series: e.series, repeticiones: e.repeticiones })),
    })),
  );
  const [error, setError] = useState('');

  const porId = useMemo(() => new Map(ejercicios.map((e) => [e.id, e])), [ejercicios]);
  const cambiarDia = (i: number, cambios: any) => setDias(dias.map((d, j) => (i === j ? { ...d, ...cambios } : d)));
  const libres = (actual?: number) =>
    [1, 2, 3, 4, 5, 6, 7].filter((n) => n === actual || !dias.some((d) => d.diaSemana === n));

  async function guardar() {
    setError('');
    try {
      await api('/routines', {
        metodo: 'POST',
        cuerpo: {
          ...(inicial.id ? { id: inicial.id } : {}),
          nombre,
          ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
          dias: [...dias].sort((a, b) => a.diaSemana - b.diaSemana),
        },
      });
      onGuardado();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="tarjeta-acento space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="etiqueta">Nombre</label>
          <input className="campo" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta">Descripcion (opcional)</label>
          <input className="campo" maxLength={300} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
      </div>

      {dias.map((d, i) => {
        const sugeridos = d.grupos.length ? ejercicios.filter((e) => d.grupos.includes(e.grupo)) : ejercicios;
        return (
          <div key={i} className="space-y-3 rounded-2xl border border-borde bg-black/30 p-4">
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
              <div>
                <label className="etiqueta">Dia</label>
                <select
                  className="campo"
                  value={d.diaSemana}
                  onChange={(e) => cambiarDia(i, { diaSemana: Number(e.target.value) })}
                >
                  {libres(d.diaSemana).map((n) => (
                    <option key={n} value={n}>
                      {DIAS[n]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta">Titulo</label>
                <input
                  className="campo"
                  maxLength={60}
                  placeholder="Pecho y triceps"
                  value={d.titulo}
                  onChange={(e) => cambiarDia(i, { titulo: e.target.value })}
                />
              </div>
              {dias.length > 1 && (
                <button className="boton-suave" onClick={() => setDias(dias.filter((_, j) => j !== i))}>
                  Quitar dia
                </button>
              )}
            </div>

            <div>
              <p className="etiqueta">Zonas (se preseleccionan en el celular del socio)</p>
              <div className="flex flex-wrap gap-1.5">
                {GRUPOS.map((g) => {
                  const activo = d.grupos.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={activo}
                      onClick={() =>
                        cambiarDia(i, { grupos: activo ? d.grupos.filter((x: string) => x !== g) : [...d.grupos, g] })
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        activo ? 'border-acento/50 bg-acento/15 text-acento' : 'border-borde text-zinc-400'
                      }`}
                    >
                      {NOMBRE_GRUPO[g] ?? g}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="etiqueta">Ejercicios</p>
              {d.ejercicios.map((e: any, k: number) => (
                <div key={k} className="grid grid-cols-[1fr_4rem_5rem_auto] items-center gap-2">
                  <span className="truncate text-sm">{porId.get(e.exerciseId)?.nombre ?? 'Ejercicio'}</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    aria-label="Series"
                    className="campo px-2 py-2 text-sm"
                    value={e.series}
                    onChange={(ev) =>
                      cambiarDia(i, {
                        ejercicios: d.ejercicios.map((x: any, j: number) => (j === k ? { ...x, series: Number(ev.target.value) } : x)),
                      })
                    }
                  />
                  <input
                    aria-label="Repeticiones"
                    className="campo px-2 py-2 text-sm"
                    maxLength={20}
                    value={e.repeticiones}
                    onChange={(ev) =>
                      cambiarDia(i, {
                        ejercicios: d.ejercicios.map((x: any, j: number) => (j === k ? { ...x, repeticiones: ev.target.value } : x)),
                      })
                    }
                  />
                  <button
                    className="px-2 text-zinc-500 hover:text-vencido"
                    aria-label="Quitar ejercicio"
                    onClick={() => cambiarDia(i, { ejercicios: d.ejercicios.filter((_: any, j: number) => j !== k) })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <select
                className="campo text-sm"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  cambiarDia(i, { ejercicios: [...d.ejercicios, { exerciseId: e.target.value, series: 3, repeticiones: '10-12' }] });
                }}
              >
                <option value="">+ Agregar ejercicio…</option>
                {sugeridos
                  .filter((x) => !d.ejercicios.some((y: any) => y.exerciseId === x.id))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre} ({NOMBRE_GRUPO[x.grupo] ?? x.grupo})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-zinc-600">Columnas: series · repeticiones (p. ej. 10-12).</p>
            </div>
          </div>
        );
      })}

      {dias.length < 7 && (
        <button
          className="boton-suave w-full"
          onClick={() => setDias([...dias, { diaSemana: libres()[0], titulo: '', grupos: [], ejercicios: [] }])}
        >
          Agregar dia
        </button>
      )}

      {error && <p className="aviso-mal">{error}</p>}
      <div className="flex gap-2">
        <button className="boton-suave" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="boton flex-1" onClick={guardar}>
          Guardar plantilla
        </button>
      </div>
    </div>
  );
}
