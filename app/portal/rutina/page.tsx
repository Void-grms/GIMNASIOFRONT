'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EncabezadoPortal } from '@/components/portal/EncabezadoPortal';
import { usePortalEntreno } from '@/components/portal/PortalEntrenoProvider';
import { RutinaGuiada } from '@/components/portal/ConfiguracionEntreno';
import { Plantillas } from '@/components/entreno/Plantillas';
import { SemanaEntreno } from '@/components/entreno/SemanaEntreno';

export default function RutinasPortal() {
  const c = usePortalEntreno(); const { datos } = c; const router = useRouter();
  const [tab, setTab] = useState<'plantillas' | 'semana'>('plantillas');
  useEffect(() => { if (window.location.hash === '#semana') setTab('semana'); }, []);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const hechos = new Set<string>(datos.historial.find(d => d.dia === hoy)?.ejercicios.map((e: any) => e.exerciseId) ?? []);
  async function usar(e: any) {
    if (!(await c.iniciar('Entrenamiento libre'))) return;
    const catalogo = datos.ejercicios.find(x => x.id === (e.exerciseId ?? e.id));
    if (catalogo) c.agregar(catalogo, e);
    router.push('/portal/entrenar');
  }
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
    <EncabezadoPortal titulo="Mis rutinas" descripcion="Organiza tus rutinas guardadas y tu plan semanal. Para registrar las series de hoy, ve a Entrenar." accion={<Link href="/portal/entrenar" className="boton-suave">{c.draft ? 'Volver a mi entrenamiento' : 'Ir a Entrenar'}</Link>} />
    {c.error && <p className="aviso-mal" role="alert">{c.error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borde bg-superficie px-4 py-3"><p className="max-w-lg text-sm leading-relaxed text-secundario"><strong className="font-semibold text-tinta">¿Quieres elegir zonas del cuerpo?</strong> Las encontrarás en Entrenar → Añadir ejercicio.</p><Link href="/portal/entrenar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-acentoTexto">Elegir qué entrenar <span aria-hidden="true">→</span></Link></div>
    {datos.rutina && <RutinaGuiada rutina={datos.rutina} onCambio={() => c.recargar()} onUsar={usar} />}
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-borde bg-superficie p-1" aria-label="Opciones de rutina">{[['plantillas', 'Rutinas guardadas'], ['semana', 'Mi semana']].map(([valor, texto]) => <button key={valor} className={`min-h-11 rounded-lg px-2 text-xs font-semibold sm:text-sm ${tab === valor ? 'bg-acento text-black' : 'text-secundario'}`} aria-pressed={tab === valor} onClick={() => setTab(valor as typeof tab)}>{texto}</button>)}</div>
    {tab === 'plantillas' ? <div className="tarjeta"><Plantillas plantillas={datos.plantillas} activa={null} hechosHoy={hechos} hayAnotadoHoy={hechos.size > 0} ejercicios={datos.ejercicios} recientes={datos.recientes.map(e => e.id)} onCargar={async p => { if (!(await c.iniciar(p.nombre, p.items))) return; if (c.draft) for (const item of p.items) { const e = datos.ejercicios.find(x => x.id === item.exerciseId); if (e) c.agregar(e, item); } router.push('/portal/entrenar'); }} onCerrar={() => {}} onUsar={usar} onCambio={c.recargar} onCambioCatalogo={c.recargar} /></div> : <section id="semana"><SemanaEntreno /></section>}
  </main>;
}
