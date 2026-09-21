'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { NOMBRE_GRUPO } from '@/components/MapaCuerpo';
import { SelectorEjercicio } from './SelectorEjercicio';

type Item = { exerciseId: string; nombre?: string; grupo?: string; series: number; repeticiones: string; nota?: string };

/**
 * Plantillas de sesion del socio ("Mi dia de pecho"). Cargar una deja la
 * sesion en curso: una lista con los ejercicios en orden, que se van
 * tachando a medida que se anotan. Tocar uno lo pone en el formulario con
 * sus series y repeticiones.
 */
export function Plantillas({
  plantillas,
  activa,
  hechosHoy,
  hayAnotadoHoy,
  ejercicios,
  recientes,
  onCargar,
  onCerrar,
  onUsar,
  onCambio,
  onCambioCatalogo,
}: {
  plantillas: any[];
  activa: any | null;
  /** ids de ejercicios con series anotadas hoy */
  hechosHoy: Set<string>;
  hayAnotadoHoy: boolean;
  ejercicios: any[];
  recientes: string[];
  onCargar: (plantilla: any) => void;
  onCerrar: () => void;
  onUsar: (item: Item) => void;
  onCambio: () => void;
  onCambioCatalogo: () => void;
}) {
  const [editando, setEditando] = useState<any>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  async function guardarHoy() {
    const nombre = window.prompt('¿Como se llama esta sesion?', 'Mi dia de ');
    if (!nombre?.trim()) return;
    setError('');
    try {
      await api('/portal/templates/from-day', { metodo: 'POST', sesion: 'socio', cuerpo: { nombre: nombre.trim() } });
      setAviso(`Guardada "${nombre.trim()}". La proxima vez la cargas con un toque.`);
      onCambio();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const hechos = activa ? activa.items.filter((i: Item) => hechosHoy.has(i.exerciseId)).length : 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="rotulo">Mis plantillas</h2>
        <button
          type="button"
          className="text-xs font-semibold text-acento hover:underline"
          onClick={() => setEditando({ nombre: '', items: [] })}
        >
          + Nueva
        </button>
      </div>
      {aviso && <p className="aviso-ok">{aviso}</p>}
      {error && <p className="aviso-mal">{error}</p>}

      {activa ? (
        <div className="tarjeta-acento space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="rotulo">Sesion en curso</p>
              <p className="truncate text-xl font-black tracking-tight">{activa.nombre}</p>
            </div>
            <span className="shrink-0 text-sm font-bold cifra">
              {hechos}/{activa.items.length}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
            <div className="h-full rounded-full bg-acento transition-all" style={{ width: `${(hechos / Math.max(1, activa.items.length)) * 100}%` }} />
          </div>
          <ul className="divide-y divide-borde rounded-xl border border-borde">
            {activa.items.map((i: Item) => {
              const hecho = hechosHoy.has(i.exerciseId);
              return (
                <li key={i.exerciseId}>
                  <button
                    type="button"
                    onClick={() => onUsar(i)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04]"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
                        hecho ? 'border-vigente bg-vigente text-black' : 'border-bordeFuerte text-transparent'
                      }`}
                      aria-label={hecho ? 'Hecho' : 'Pendiente'}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${hecho ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{i.nombre}</span>
                      {i.nota && <span className="block truncate text-xs text-zinc-500">📝 {i.nota}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500 cifra">
                      {i.series} × {i.repeticiones}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {hechos === activa.items.length && activa.items.length > 0 && (
            <p className="text-center text-sm font-bold text-vigente">¡Sesion completa! 💪</p>
          )}
          <div className="flex gap-2">
            <button type="button" className="boton-suave flex-1 py-2 text-sm" onClick={() => setEditando(activa)}>
              Editar plantilla
            </button>
            <button type="button" className="boton-suave flex-1 py-2 text-sm" onClick={onCerrar}>
              Cerrar sesion
            </button>
          </div>
        </div>
      ) : plantillas.length ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {plantillas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onCargar(p)}
              className="w-40 shrink-0 rounded-2xl border border-borde bg-superficie p-3 text-left transition hover:border-acento/50"
            >
              <span className="block truncate font-bold">{p.nombre}</span>
              <span className="block truncate text-xs text-zinc-500">
                {p.items.length} ejercicios · {p.grupos.map((g: string) => NOMBRE_GRUPO[g] ?? g).join(', ')}
              </span>
              <span className="mt-2 block text-xs font-semibold text-acento">Cargar ›</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-borde px-4 py-3 text-sm text-zinc-500">
          Guarda tus sesiones (por ejemplo &quot;Mi dia de pecho&quot;) y cargalas enteras con un toque.
        </p>
      )}

      {hayAnotadoHoy && !activa && (
        <button type="button" className="boton-suave w-full py-2 text-sm" onClick={guardarHoy}>
          Guardar lo de hoy como plantilla
        </button>
      )}

      {editando && (
        <EditorPlantilla
          inicial={editando}
          ejercicios={ejercicios}
          recientes={recientes}
          onCerrar={() => setEditando(null)}
          onGuardado={(msg) => {
            setEditando(null);
            setAviso(msg);
            onCambio();
          }}
          onCambioCatalogo={onCambioCatalogo}
        />
      )}
    </section>
  );
}

function EditorPlantilla({
  inicial,
  ejercicios,
  recientes,
  onCerrar,
  onGuardado,
  onCambioCatalogo,
}: {
  inicial: any;
  ejercicios: any[];
  recientes: string[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
  onCambioCatalogo: () => void;
}) {
  const [nombre, setNombre] = useState(inicial.nombre || '');
  const [items, setItems] = useState<Item[]>(
    (inicial.items || []).map((i: Item) => ({ exerciseId: i.exerciseId, series: i.series, repeticiones: i.repeticiones })),
  );
  const [error, setError] = useState('');

  const nombreDe = (id: string) => ejercicios.find((e) => e.id === id)?.nombre ?? 'Ejercicio';
  const cambiar = (k: number, cambios: Partial<Item>) => setItems(items.map((x, j) => (j === k ? { ...x, ...cambios } : x)));
  const mover = (k: number, d: number) => {
    const n = [...items];
    const [x] = n.splice(k, 1);
    n.splice(k + d, 0, x);
    setItems(n);
  };

  async function guardar() {
    setError('');
    try {
      const cuerpo = { nombre, items };
      if (inicial.id) await api(`/portal/templates/${inicial.id}`, { metodo: 'PUT', sesion: 'socio', cuerpo });
      else await api('/portal/templates', { metodo: 'POST', sesion: 'socio', cuerpo });
      onGuardado(`Plantilla "${nombre.trim()}" guardada.`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar la plantilla "${inicial.nombre}"? Tus series anotadas no se tocan.`)) return;
    try {
      await api(`/portal/templates/${inicial.id}`, { metodo: 'DELETE', sesion: 'socio' });
      onGuardado('Plantilla borrada.');
    } catch (e: any) {
      setError(e.message);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Editar plantilla">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/70" onClick={onCerrar} />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92vh] max-w-md animate-subir flex-col rounded-t-3xl border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between border-b border-borde p-4">
          <h2 className="text-lg font-black">{inicial.id ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
          <button className="text-sm text-zinc-500 hover:text-white" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <label className="etiqueta" htmlFor="nombre-plantilla">Nombre</label>
            <input
              id="nombre-plantilla"
              className="campo"
              maxLength={40}
              placeholder="Mi dia de pecho"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="etiqueta">Ejercicios ({items.length})</p>
            {items.length === 0 && <p className="text-sm text-zinc-500">Agrega los ejercicios en el orden en que los haces.</p>}
            {items.map((i, k) => (
              <div key={`${i.exerciseId}-${k}`} className="space-y-2 rounded-xl border border-borde p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center text-sm font-bold text-zinc-500 cifra">{k + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nombreDe(i.exerciseId)}</span>
                  <button type="button" aria-label="Subir" disabled={k === 0} className="px-1.5 text-zinc-500 disabled:opacity-20" onClick={() => mover(k, -1)}>↑</button>
                  <button type="button" aria-label="Bajar" disabled={k === items.length - 1} className="px-1.5 text-zinc-500 disabled:opacity-20" onClick={() => mover(k, 1)}>↓</button>
                  <button type="button" aria-label="Quitar" className="px-1.5 text-zinc-500 hover:text-vencido" onClick={() => setItems(items.filter((_, j) => j !== k))}>✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-7">
                  <label className="text-xs text-zinc-500">
                    Series
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="campo mt-1 px-3 py-1.5 text-sm"
                      value={i.series}
                      onChange={(e) => cambiar(k, { series: Number(e.target.value) })}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Reps
                    <input
                      className="campo mt-1 px-3 py-1.5 text-sm"
                      maxLength={20}
                      placeholder="8-12"
                      value={i.repeticiones}
                      onChange={(e) => cambiar(k, { repeticiones: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            ))}
            <SelectorEjercicio
              ejercicios={ejercicios}
              recientes={recientes}
              zonas={[]}
              valor=""
              etiqueta="Agregar ejercicio"
              onElegir={(e) => setItems([...items, { exerciseId: e.id, series: 3, repeticiones: '10' }])}
              onCambioCatalogo={onCambioCatalogo}
            />
          </div>
          {error && <p className="aviso-mal">{error}</p>}
        </div>
        <div className="flex gap-2 border-t border-borde p-4">
          {inicial.id && (
            <button type="button" className="boton-riesgo py-2" onClick={borrar}>
              Borrar
            </button>
          )}
          <button type="button" className="boton flex-1" disabled={!nombre.trim() || !items.length} onClick={guardar}>
            Guardar plantilla
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
