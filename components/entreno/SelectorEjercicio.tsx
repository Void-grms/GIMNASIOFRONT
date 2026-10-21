'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { NOMBRE_GRUPO } from '@/components/MapaCuerpo';
import { ZonasParaEjercicio } from './ZonasParaEjercicio';
import styles from './SelectorEjercicio.module.css';

export const ZONAS_EJERCICIO = ['pecho', 'espalda', 'hombro', 'brazo', 'core', 'pierna', 'gluteo', 'cardio', 'otros'];
const normal = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
const grupoVisual = (grupo: string) => ZONAS_EJERCICIO.includes(grupo) ? grupo : 'otros';

/** Primero se elige una zona del cuerpo; después, un ejercicio de esa zona. */
export function SelectorEjercicio({ ejercicios, recientes, zonas, valor, onElegir, onCambioCatalogo, etiqueta }: {
  ejercicios: any[];
  recientes: string[];
  zonas: string[];
  valor: string;
  onElegir: (ejercicio: any) => void;
  onCambioCatalogo: () => void;
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<'zonas' | 'lista'>('zonas');
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState('');
  const [creando, setCreando] = useState(false);
  const [zonaNueva, setZonaNueva] = useState('otros');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const contenido = useRef<HTMLDivElement>(null);
  const volver = useRef<HTMLButtonElement>(null);
  const apertura = useRef<HTMLElement | null>(null);
  const elegido = ejercicios.find(e => e.id === valor);

  function abrir() {
    apertura.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTexto(''); setCreando(false); setError('');
    setFiltro(zonas.length === 1 ? grupoVisual(zonas[0]) : '');
    setZonaNueva(zonas[0] ? grupoVisual(zonas[0]) : 'otros');
    setVista(zonas.length === 1 ? 'lista' : 'zonas');
    setAbierto(true);
  }
  function cerrar() { if (!ocupado) setAbierto(false); }

  useEffect(() => {
    if (!abierto) return;
    const modal = dialogo.current;
    if (modal && !modal.open) modal.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      modal?.close();
      document.body.style.overflow = anterior;
      apertura.current?.focus({ preventScroll: true });
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    contenido.current?.scrollTo({ top: 0 });
    if (vista === 'lista') volver.current?.focus({ preventScroll: true });
  }, [vista, filtro, abierto]);

  const q = normal(texto);
  const cantidades = useMemo(() => ejercicios.reduce<Record<string, number>>((total, e) => {
    const grupo = grupoVisual(e.grupo); total[grupo] = (total[grupo] || 0) + 1; return total;
  }, {}), [ejercicios]);
  const filtrados = useMemo(() => ejercicios.filter(e => (!filtro || grupoVisual(e.grupo) === filtro) && (!q || normal(e.nombre).includes(q))), [ejercicios, filtro, q]);
  const recientesVisibles = useMemo(() => q || filtro ? [] : recientes.map(id => ejercicios.find(e => e.id === id)).filter(Boolean).slice(0, 5), [recientes, ejercicios, q, filtro]);
  const grupos = useMemo(() => {
    const mapa = new Map<string, any[]>();
    for (const e of filtrados) { const grupo = grupoVisual(e.grupo); mapa.set(grupo, [...(mapa.get(grupo) || []), e]); }
    return Array.from(mapa.entries());
  }, [filtrados]);
  const existeExacto = ejercicios.some(e => normal(e.nombre) === q);

  function elegirZona(grupo: string) { setFiltro(grupo); setZonaNueva(grupo); setTexto(''); setCreando(false); setError(''); setVista('lista'); }
  function elegir(e: any) { onElegir(e); setAbierto(false); }
  function verTodos(buscar = false) {
    setFiltro(''); setVista('lista'); setCreando(false);
    if (buscar) requestAnimationFrame(() => buscador.current?.focus());
  }
  async function crear() {
    if (ocupado) return;
    setError(''); setOcupado(true);
    try {
      const e = await api('/portal/exercises', { metodo: 'POST', sesion: 'socio', cuerpo: { nombre: texto.trim(), grupo: zonaNueva } });
      onCambioCatalogo(); elegir(e);
    } catch (err: any) { setError(err.message); }
    finally { setOcupado(false); }
  }
  async function borrar(e: any) {
    if (ocupado || !window.confirm(`¿Quitar "${e.nombre}" de tus ejercicios? Lo que ya anotaste no se borra.`)) return;
    setError(''); setOcupado(true);
    try { await api(`/portal/exercises/${e.id}`, { metodo: 'DELETE', sesion: 'socio' }); onCambioCatalogo(); }
    catch (err: any) { setError(err.message); }
    finally { setOcupado(false); }
  }
  const fila = (e: any) => <li key={e.id} className="flex min-w-0 items-center">
    <button type="button" disabled={ocupado} onClick={() => elegir(e)} className={`flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-neutral/5 ${e.id === valor ? 'text-acentoTexto' : 'text-tinta'}`}>
      <span className="min-w-0 break-words">{e.nombre}</span>{e.propio && <span className="shrink-0 rounded-md bg-acento/15 px-1.5 py-1 text-[10px] font-bold uppercase text-acentoTexto">tuyo</span>}
    </button>
    {e.propio && <button type="button" disabled={ocupado} aria-label={`Quitar ${e.nombre}`} onClick={() => borrar(e)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-tenue hover:bg-vencido/10 hover:text-vencido"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>}
  </li>;

  return <>
    {etiqueta ? <button type="button" onClick={abrir} className="min-h-12 w-full rounded-xl border border-dashed border-bordeFuerte px-4 py-3 text-sm font-semibold text-acentoTexto hover:border-acento">+ {etiqueta}</button> : <button type="button" onClick={abrir} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-borde bg-fondo/70 px-4 py-3 text-left transition hover:border-bordeFuerte"><span className="min-w-0"><span className="block break-words text-base font-bold">{elegido?.nombre ?? 'Elegir ejercicio por zona'}</span>{elegido && <span className="block text-xs text-tenue">{NOMBRE_GRUPO[elegido.grupo] ?? elegido.grupo}{elegido.propio ? ' · creado por ti' : ''}</span>}</span><span className="shrink-0 text-sm font-semibold text-acentoTexto">{elegido ? 'Cambiar' : 'Elegir'}</span></button>}
    {abierto && createPortal(<dialog ref={dialogo} aria-label="Elegir ejercicio" onCancel={e => { e.preventDefault(); cerrar(); }} onClick={e => { if (e.target === e.currentTarget) cerrar(); }} className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none border-0 bg-transparent p-0 text-tinta backdrop:bg-black/70">
      <div className={styles.panel}>
        <header className="shrink-0 border-b border-borde px-4 pb-4 pt-3 sm:px-5">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[.1em]"><span className={vista === 'zonas' ? 'text-acentoTexto' : 'text-tenue'}>1. Zona del cuerpo</span><span aria-hidden="true" className="text-tenue">/</span><span className={vista === 'lista' ? 'text-acentoTexto' : 'text-tenue'}>2. Ejercicio</span></p><button type="button" disabled={ocupado} onClick={cerrar} aria-label="Cerrar selector de ejercicios" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-borde text-secundario hover:bg-neutral/5"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div>
          <h2 className="text-xl font-extrabold tracking-tight">{vista === 'zonas' ? '¿Qué quieres entrenar?' : filtro ? `Ejercicios de ${NOMBRE_GRUPO[filtro] ?? filtro}` : 'Busca tu ejercicio'}</h2>
          {vista === 'zonas' ? <p className="mt-1.5 text-sm leading-relaxed text-secundario">Elige una zona del cuerpo para ver sus ejercicios.</p> : <div className="mt-2 space-y-3"><button type="button" ref={volver} onClick={() => { setVista('zonas'); setTexto(''); setCreando(false); }} className="flex min-h-11 items-center gap-2 text-xs font-semibold text-acentoTexto"><span aria-hidden="true">←</span>Cambiar zona del cuerpo</button><label className="block"><span className="sr-only">Buscar ejercicio{filtro ? ` en ${NOMBRE_GRUPO[filtro]}` : ''}</span><input ref={buscador} className="campo py-2.5" placeholder="Buscar o escribir uno nuevo…" value={texto} onChange={e => { setTexto(e.target.value); setCreando(false); }} /></label>{filtro && <button type="button" onClick={() => verTodos(true)} className="min-h-11 text-xs font-semibold text-secundario underline underline-offset-4">Buscar en todas las zonas</button>}</div>}
        </header>
        <div ref={contenido} className={`${styles.content} min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]`}>
          {vista === 'zonas' ? <div className="p-4 sm:p-5"><ZonasParaEjercicio onElegir={elegirZona} cantidades={cantidades} /><button type="button" onClick={() => verTodos(true)} className="boton-suave mt-5 w-full text-sm">Prefiero buscar por nombre</button>{recientes.length > 0 && <button type="button" onClick={() => verTodos()} className="mt-1 min-h-11 w-full text-xs font-semibold text-secundario">Ver todos y mis ejercicios recientes</button>}</div> : <>
            {q.length >= 3 && !existeExacto && <div className="border-b border-borde bg-acento/5 p-4">{!creando ? <button type="button" className="min-h-12 w-full break-words text-left" onClick={() => setCreando(true)}><span className="block font-bold text-acentoTexto">+ Crear «{texto.trim()}»</span><span className="mt-1 block text-xs leading-relaxed text-secundario">Añádelo a tu catálogo personal de ejercicios.</span></button> : <div className="space-y-3"><p className="break-words text-sm">¿Qué zona trabaja <strong>«{texto.trim()}»</strong>?</p><div className="flex flex-wrap gap-2">{ZONAS_EJERCICIO.map(g => <button key={g} type="button" disabled={ocupado} onClick={() => setZonaNueva(g)} aria-pressed={zonaNueva === g} className={`min-h-11 rounded-lg border px-3 text-xs font-semibold ${zonaNueva === g ? 'border-acento bg-acento/15 text-acentoTexto' : 'border-borde text-secundario'}`}>{NOMBRE_GRUPO[g] ?? g}</button>)}</div><button type="button" className="boton w-full" disabled={ocupado} onClick={crear}>{ocupado ? 'Creando ejercicio…' : 'Crear y usar'}</button></div>}</div>}
            {error && <p role="alert" className="aviso-mal m-4">{error}</p>}
            <p className="sr-only" role="status">{filtrados.length} ejercicios disponibles{filtro ? ` en ${NOMBRE_GRUPO[filtro]}` : ''}.</p>
            {recientesVisibles.length > 0 && <section><h3 className="rotulo px-4 pb-2 pt-4">Tus ejercicios recientes</h3><ul className="divide-y divide-borde">{recientesVisibles.map(fila)}</ul></section>}
            {grupos.map(([g, lista]) => <section key={g}><h3 className="rotulo sticky top-0 border-b border-borde bg-superficie px-4 py-3">{NOMBRE_GRUPO[g] ?? g}</h3><ul className="divide-y divide-borde">{lista.map(fila)}</ul></section>)}
            {grupos.length === 0 && <div className="px-5 py-8 text-center"><p className="font-semibold">{q ? 'No encontramos ese ejercicio en esta selección.' : 'Aún no hay ejercicios en esta zona.'}</p><p className="mt-2 text-sm leading-relaxed text-secundario">{q.length >= 3 && !existeExacto ? 'Puedes crearlo para usarlo en tus entrenamientos.' : 'Busca por nombre o cambia de zona para continuar.'}</p>{filtro && <button type="button" onClick={() => verTodos(true)} className="mt-2 min-h-11 text-sm font-semibold text-acentoTexto">Buscar en todas las zonas</button>}</div>}
          </>}
        </div>
      </div>
    </dialog>, document.body)}
  </>;
}
