'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { NOMBRE_GRUPO } from '@/components/MapaCuerpo';

export const ZONAS_EJERCICIO = ['pecho', 'espalda', 'hombro', 'brazo', 'core', 'pierna', 'gluteo', 'cardio', 'otros'];

/** Para buscar sin que importen tildes ni mayusculas: "extension" encuentra "Extensión". */
const normal = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/**
 * Elegir el ejercicio a anotar. Como en Hevy o Strong: buscador, filtro por
 * zona, los que el socio usa mas arriba, y si no esta en la lista, lo crea
 * ahi mismo con su nombre y su zona. Los que crea son solo suyos.
 */
export function SelectorEjercicio({
  ejercicios,
  recientes,
  zonas,
  valor,
  onElegir,
  onCambioCatalogo,
}: {
  ejercicios: any[];
  /** ids de los ejercicios que el socio ya anoto, del mas reciente al mas viejo */
  recientes: string[];
  zonas: string[];
  valor: string;
  onElegir: (ejercicio: any) => void;
  /** Se creo o se borro un ejercicio propio: hay que recargar el catalogo. */
  onCambioCatalogo: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<string>('');
  const [creando, setCreando] = useState(false);
  const [zonaNueva, setZonaNueva] = useState('otros');
  const [error, setError] = useState('');
  const buscador = useRef<HTMLInputElement>(null);

  const elegido = ejercicios.find((e) => e.id === valor);

  useEffect(() => {
    if (!abierto) return;
    setTexto('');
    setCreando(false);
    setError('');
    setFiltro(zonas.length === 1 ? zonas[0] : '');
    setZonaNueva(zonas[0] || 'otros');
    setTimeout(() => buscador.current?.focus(), 50);
  }, [abierto, zonas]);

  const q = normal(texto);
  const filtrados = useMemo(() => {
    let lista = ejercicios;
    if (filtro) lista = lista.filter((e) => e.grupo === filtro);
    else if (zonas.length && !q) lista = lista.filter((e) => zonas.includes(e.grupo));
    if (q) lista = lista.filter((e) => normal(e.nombre).includes(q));
    return lista;
  }, [ejercicios, filtro, zonas, q]);

  const recientesVisibles = useMemo(
    () =>
      q || filtro
        ? []
        : recientes
            .map((id) => ejercicios.find((e) => e.id === id))
            .filter((e) => e && (!zonas.length || zonas.includes(e.grupo)))
            .slice(0, 5),
    [recientes, ejercicios, zonas, q, filtro],
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, any[]>();
    for (const e of filtrados) mapa.set(e.grupo, [...(mapa.get(e.grupo) || []), e]);
    return Array.from(mapa.entries());
  }, [filtrados]);

  const existeExacto = ejercicios.some((e) => normal(e.nombre) === q);

  function elegir(e: any) {
    onElegir(e);
    setAbierto(false);
  }

  async function crear() {
    setError('');
    try {
      const e: any = await api('/portal/exercises', {
        metodo: 'POST',
        sesion: 'socio',
        cuerpo: { nombre: texto.trim(), grupo: zonaNueva },
      });
      onCambioCatalogo();
      elegir(e);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function borrar(e: any) {
    if (!window.confirm(`¿Quitar "${e.nombre}" de tus ejercicios? Lo que ya anotaste no se borra.`)) return;
    try {
      await api(`/portal/exercises/${e.id}`, { metodo: 'DELETE', sesion: 'socio' });
      onCambioCatalogo();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const fila = (e: any) => (
    <li key={e.id} className="flex items-center">
      <button
        type="button"
        onClick={() => elegir(e)}
        className={`flex min-h-12 flex-1 items-center justify-between gap-3 px-4 text-left text-[15px] hover:bg-white/[0.05] ${
          e.id === valor ? 'text-acento' : 'text-zinc-100'
        }`}
      >
        <span className="min-w-0 truncate">{e.nombre}</span>
        {e.propio && <span className="shrink-0 rounded-md bg-acento/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-acento">tuyo</span>}
      </button>
      {e.propio && (
        <button
          type="button"
          aria-label={`Quitar ${e.nombre}`}
          onClick={() => borrar(e)}
          className="px-3 text-zinc-600 hover:text-vencido"
        >
          ✕
        </button>
      )}
    </li>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-borde bg-black/40 px-4 py-3 text-left transition hover:border-bordeFuerte"
      >
        <span className="min-w-0">
          <span className="block truncate text-base font-bold">{elegido?.nombre ?? 'Elegir ejercicio'}</span>
          {elegido && (
            <span className="block text-xs text-zinc-500">
              {NOMBRE_GRUPO[elegido.grupo] ?? elegido.grupo}
              {elegido.propio ? ' · creado por ti' : ''}
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold text-acento">Cambiar</span>
      </button>

      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Elegir ejercicio">
            <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/70" onClick={() => setAbierto(false)} />
            <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] max-w-md animate-subir flex-col rounded-t-3xl border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]">
              <div className="space-y-3 border-b border-borde p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black">Elige el ejercicio</h2>
                  <button className="text-sm text-zinc-500 hover:text-white" onClick={() => setAbierto(false)}>
                    Cerrar
                  </button>
                </div>
                <input
                  ref={buscador}
                  className="campo py-2.5"
                  placeholder="Buscar o escribir uno nuevo…"
                  value={texto}
                  onChange={(e) => {
                    setTexto(e.target.value);
                    setCreando(false);
                  }}
                />
                <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
                  {['', ...ZONAS_EJERCICIO].map((g) => (
                    <button
                      key={g || 'todas'}
                      type="button"
                      onClick={() => setFiltro(g)}
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                        filtro === g ? 'border-acento bg-acento text-black' : 'border-borde text-zinc-400'
                      }`}
                    >
                      {g ? NOMBRE_GRUPO[g] ?? g : zonas.length ? 'De hoy' : 'Todas'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {q.length >= 3 && !existeExacto && (
                  <div className="border-b border-borde bg-acento/[0.06] p-4">
                    {!creando ? (
                      <button type="button" className="w-full text-left" onClick={() => setCreando(true)}>
                        <span className="block font-bold text-acento">+ Crear «{texto.trim()}»</span>
                        <span className="block text-xs text-zinc-500">No esta en la lista: agregalo a tus ejercicios.</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm">
                          ¿Que zona trabaja <span className="font-bold">«{texto.trim()}»</span>?
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ZONAS_EJERCICIO.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setZonaNueva(g)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                                zonaNueva === g ? 'border-acento bg-acento/15 text-acento' : 'border-borde text-zinc-400'
                              }`}
                            >
                              {NOMBRE_GRUPO[g] ?? g}
                            </button>
                          ))}
                        </div>
                        <button className="boton w-full py-2.5" onClick={crear}>
                          Crear y usar
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {error && <p className="aviso-mal m-4">{error}</p>}

                {recientesVisibles.length > 0 && (
                  <>
                    <p className="rotulo px-4 pb-1 pt-3">Recientes</p>
                    <ul className="divide-y divide-borde">{recientesVisibles.map(fila)}</ul>
                  </>
                )}
                {grupos.map(([g, lista]) => (
                  <div key={g}>
                    <p className="rotulo sticky top-0 bg-superficie px-4 pb-1 pt-3">{NOMBRE_GRUPO[g] ?? g}</p>
                    <ul className="divide-y divide-borde">{lista.map(fila)}</ul>
                  </div>
                ))}
                {grupos.length === 0 && q.length < 3 && (
                  <p className="p-6 text-center text-sm text-zinc-500">Escribe el nombre para buscarlo o crearlo.</p>
                )}
                {zonas.length > 0 && !filtro && !q && (
                  <button type="button" className="w-full p-4 text-sm text-zinc-500 underline" onClick={() => buscador.current?.focus()}>
                    ¿No esta? Escribe su nombre arriba para crearlo
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
