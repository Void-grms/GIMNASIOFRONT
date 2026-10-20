'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta } from '@/lib/api';
import { EncabezadoPortal } from '@/components/portal/EncabezadoPortal';
import { PesoCorporal } from '@/components/portal/PesoCorporal';
import { SemanaEntreno } from '@/components/entreno/SemanaEntreno';
import { GraficoLinea } from '@/components/GraficoLinea';
import { Esqueleto } from '@/components/Esqueleto';

export default function ProgresoPortal() {
  const [vista, setVista] = useState<'cargas' | 'semana' | 'peso'>('cargas');
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9"><EncabezadoPortal titulo="Mi progreso" descripcion="Tu historial y tus marcas, en un espacio para ver lo que vas construyendo." accion={<Link href="/portal/entrenar" className="boton-suave">Volver a entrenar</Link>} /><div className="grid grid-cols-3 gap-1 rounded-xl border border-borde bg-superficie p-1" aria-label="Vistas de progreso">{[['cargas', 'Cargas e historial'], ['semana', 'Mi semana'], ['peso', 'Mi peso']].map(([valor, texto]) => <button key={valor} aria-pressed={vista === valor} className={`min-h-11 rounded-lg px-1 text-xs font-semibold sm:text-sm ${vista === valor ? 'bg-acento text-black' : 'text-secundario'}`} onClick={() => setVista(valor as typeof vista)}>{texto}</button>)}</div>{vista === 'cargas' ? <CargasHistorial /> : vista === 'semana' ? <SemanaEntreno /> : <PesoCorporal />}</main>;
}
function CargasHistorial() {
  const [ejercicios, setEjercicios] = useState<any[]>([]); const [elegido, setElegido] = useState('');
  const [semanas, setSemanas] = useState(8); const [progreso, setProgreso] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]); const [pagina, setPagina] = useState(1); const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true); const [cargandoGrafico, setCargandoGrafico] = useState(false); const [cargandoMas, setCargandoMas] = useState(false); const [error, setError] = useState('');
  const cargarInicial = useCallback(async () => {
    setError(''); setCargando(true);
    try { const [e, h]: any = await Promise.all([api('/portal/my-exercises', { sesion: 'socio' }), api('/portal/workouts?pagina=1&limite=10', { sesion: 'socio' })]); setEjercicios(e); setElegido((v) => v || e[0]?.id || ''); setHistorial(h); setPagina(1); setHayMas(h.length === 10); }
    catch (e: any) { setError(e.message); } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargarInicial(); }, [cargarInicial]);
  useEffect(() => {
    if (!elegido) return;
    let vigente = true; setCargandoGrafico(true); setProgreso(null);
    api(`/portal/progress/${elegido}?semanas=${semanas}`, { sesion: 'socio' }).then((r) => { if (vigente) setProgreso(r); }).catch((e) => { if (vigente) setError(e.message); }).finally(() => { if (vigente) setCargandoGrafico(false); });
    return () => { vigente = false; };
  }, [elegido, semanas]);
  async function mas() { setCargandoMas(true); setError(''); try { const h: any = await api(`/portal/workouts?pagina=${pagina + 1}&limite=10`, { sesion: 'socio' }); setHistorial((anterior) => [...anterior, ...h.filter((d: any) => !anterior.some((x) => x.dia === d.dia))]); setPagina(pagina + 1); setHayMas(h.length === 10); } catch (e: any) { setError(e.message); } finally { setCargandoMas(false); } }
  const cardio = progreso?.tipo === 'cardio' || ejercicios.find((e) => e.id === elegido)?.grupo === 'cardio';
  return <div className="space-y-5">{error && <div className="aviso-mal"><p role="alert">{error}</p><button className="min-h-11 underline" onClick={cargarInicial}>Actualizar datos</button></div>}{cargando ? <Esqueleto filas={3} /> : <>
    <section className="tarjeta space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Tu evolución</h2><p className="mt-1 text-sm text-secundario">{cardio ? 'Duración de cardio por día, en minutos.' : 'La mayor carga registrada por día, en kilogramos.'}</p></div><div className="flex flex-wrap gap-2"><label className="min-w-0 text-xs text-secundario">Ejercicio<select className="campo mt-1 max-w-full py-2 text-sm sm:max-w-60" value={elegido} onChange={(e) => setElegido(e.target.value)} aria-label="Ejercicio para ver progreso">{ejercicios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label><label className="text-xs text-secundario">Periodo<select className="campo mt-1 py-2 text-sm" value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>{[4, 8, 12].map((n) => <option key={n} value={n}>{n} semanas</option>)}</select></label></div></div>
      {cargandoGrafico ? <Esqueleto filas={2} /> : progreso?.puntos?.length ? <><div className="flex flex-wrap items-baseline gap-3 border-b border-borde pb-4"><strong className="text-4xl font-black tabular-nums tracking-tight">{cardio ? Math.max(...progreso.puntos.map((p: any) => p.minutos ?? 0)) : progreso.mejorMarca}<span className="ml-1 text-base font-medium text-secundario">{cardio ? 'min' : 'kg'}</span></strong><span className="text-sm text-secundario">{cardio ? 'Mayor duración diaria en este periodo' : 'Mayor carga en este periodo'}</span></div><GraficoLinea color="rgb(var(--color-acento-texto))" titulo={cardio ? 'Minutos de cardio por día' : 'Mejor carga por día'} unidad={cardio ? 'min' : 'kg'} puntos={progreso.puntos.map((p: any) => ({ etiqueta: fechaCorta(p.dia), valor: cardio ? p.minutos ?? 0 : p.mejorPeso }))} /><p className="text-xs text-tenue">Las cargas de fuerza y los minutos de cardio se muestran por separado.</p></> : <div className="rounded-xl border border-dashed border-borde px-4 py-8 text-center"><p className="font-semibold">{ejercicios.length ? 'Sin series en este periodo' : 'Tu primera serie abre el camino'}</p><p className="mt-2 text-sm text-secundario">Guarda tus entrenamientos para consultar aquí tus cargas e historial.</p><Link href="/portal/entrenar" className="mt-3 inline-flex min-h-11 items-center font-semibold text-acentoTexto">Ir a Entrenar →</Link></div>}
    </section>
    <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Historial de entrenamiento</h2><button className="min-h-11 px-2 text-sm font-semibold text-acentoTexto" onClick={cargarInicial}>Actualizar</button></div>{!historial.length ? <p className="tarjeta text-sm text-secundario">Todavía no hay entrenamientos registrados en tu cuenta.</p> : historial.map((d) => <details key={d.dia} className="group rounded-2xl border border-borde bg-superficie"><summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 p-4"><span><strong className="block">{fechaCorta(d.dia)}</strong><span className="mt-1 block text-xs text-secundario">{d.ejercicios.reduce((n: number, e: any) => n + e.series.length, 0)} series · {Math.round(d.volumen || 0)} kg de volumen de fuerza</span></span><span className="text-secundario transition-transform group-open:rotate-180" aria-hidden="true">⌄</span></summary><ul className="divide-y divide-borde border-t border-borde px-4">{d.ejercicios.map((e: any) => <li key={e.exerciseId} className="py-4"><p className="font-semibold">{e.ejercicio}</p><div className="mt-2 flex flex-wrap gap-2">{e.series.map((s: any) => <span key={s.id} className="rounded-lg border border-borde bg-neutral/[0.03] px-2.5 py-2 text-xs tabular-nums text-secundario">{s.tipo === 'cardio' || e.grupo === 'cardio' ? `${s.duracionMinutos ?? s.repeticiones} min · nivel ${s.nivel ?? s.pesoKg}` : `${s.pesoKg} kg × ${s.repeticiones} reps`}</span>)}</div></li>)}</ul></details>)}{hayMas && <button className="boton-suave w-full" disabled={cargandoMas} onClick={mas}>{cargandoMas ? 'Cargando…' : 'Ver entrenamientos anteriores'}</button>}</section>
  </>}</div>;
}
