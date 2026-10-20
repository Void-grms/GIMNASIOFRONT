'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta, sesionActual } from '@/lib/api';
import { SelectorEjercicio } from '@/components/entreno/SelectorEjercicio';
import { NotaEjercicio } from '@/components/entreno/NotaEjercicio';
import { EncabezadoPortal } from '@/components/portal/EncabezadoPortal';
import { usePortalEntreno } from '@/components/portal/PortalEntrenoProvider';

function RelojSesion({ inicio }: { inicio: string }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((ahora - new Date(inicio).getTime()) / 1000));
  return <span className="text-4xl font-black tabular-nums tracking-tight">{Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ''}{String(Math.floor(s / 60) % 60).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</span>;
}
export default function EntrenarPortal() {
  const c = usePortalEntreno(); const { draft, datos } = c;
  const [ultima, setUltima] = useState<any>(null); const [confirmar, setConfirmar] = useState(false);
  const socio = sesionActual('socio')?.sub;
  const seleccionado = draft?.ejercicios.find((e) => e.exerciseId === draft.elegido);
  useEffect(() => {
    if (!seleccionado) { setUltima(null); return; }
    let vigente = true; setUltima(null);
    api(`/portal/exercises/${seleccionado.exerciseId}/last`, { sesion: 'socio' }).then((r) => { if (vigente && sesionActual('socio')?.sub === socio) { setUltima(r); c.rellenarUltima(seleccionado.exerciseId, r.series ?? []); } }).catch(() => {});
    return () => { vigente = false; };
  }, [seleccionado?.exerciseId, socio, c.rellenarUltima]);
  const guardadas = draft?.ejercicios.flatMap((e) => e.series).filter((s) => s.estado === 'guardada').length ?? 0;
  const pendientes = draft?.ejercicios.flatMap((e) => e.series).filter((s) => s.estado !== 'guardada').length ?? 0;
  const esCardio = seleccionado?.grupo === 'cardio';
  return <main className={`mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9 ${draft?.finDescanso ? 'pb-32' : ''}`}>
    <EncabezadoPortal titulo="Entrenar" descripcion="Anota una serie, descansa y continúa. Tu sesión se conserva al cambiar de sección." accion={<Link href="/portal/rutina" className="boton-suave">Mis rutinas</Link>} />
    {c.error && <p className="aviso-mal" role="alert">{c.error}</p>}
    {!c.almacenamiento && <p className="aviso-ojo" role="alert">Este navegador no permite guardar el borrador. Mantén esta página abierta hasta confirmar tus series.</p>}
    {!draft ? <section className="tarjeta mx-auto max-w-xl space-y-5 py-8">
      {c.resumen ? <><p className="rotulo text-vigente">Entrenamiento finalizado</p><h2 className="text-2xl font-black">{c.resumen.titulo}</h2><div className="grid grid-cols-3 gap-3 border-y border-borde py-5 text-center">{[[c.resumen.series, 'Series'], [c.resumen.ejercicios, 'Ejercicios'], [Math.round(c.resumen.duracionSegundos / 60), 'Minutos']].map(([v, t]) => <div key={t}><p className="text-3xl font-black tabular-nums">{v}</p><p className="mt-1 text-xs text-secundario">{t}</p></div>)}</div><p className="text-sm text-secundario">Tus series están guardadas en tu cuenta. Si te vas del gimnasio, marca tu salida desde la credencial.</p><div className="grid gap-2 sm:grid-cols-2"><Link className="boton" href="/portal/progreso">Ver mi progreso</Link><Link className="boton-suave" href="/portal/mi">Ir a mi credencial</Link></div></> : <><p className="rotulo">Listo para empezar</p><h2 className="text-2xl font-black">Tu próxima serie empieza aquí</h2><p className="text-sm leading-relaxed text-secundario">Inicia una sesión libre o elige una rutina para tener tus ejercicios en orden.</p><button className="boton-grande w-full" disabled={c.ocupado || !c.listo} onClick={() => c.iniciar('Entrenamiento libre')}>{c.ocupado ? 'Iniciando…' : 'Iniciar sesión libre'}</button><Link className="boton-suave w-full" href="/portal/rutina">Elegir una rutina</Link></>}
    </section> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Ejercicios de esta sesión">{draft.ejercicios.map((e) => <button key={e.exerciseId} aria-pressed={draft.elegido === e.exerciseId} onClick={() => c.seleccionar(e.exerciseId)} className={`min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-semibold ${draft.elegido === e.exerciseId ? 'border-acento/60 bg-acento/10 text-acentoTexto' : 'border-borde bg-superficie text-secundario'}`}>{e.nombre}<span className="ml-2 text-xs tabular-nums">{e.series.filter((s) => s.estado === 'guardada').length}/{e.series.length}</span></button>)}</div>
        {seleccionado ? <section className="rounded-3xl border border-borde bg-superficie p-4 sm:p-6" aria-labelledby="ejercicio-activo">
          <p className="rotulo">Libreta de entrenamiento</p><h2 id="ejercicio-activo" className="mt-2 text-3xl font-black tracking-tight">{seleccionado.nombre}</h2>{seleccionado.objetivo && <p className="mt-2 text-sm text-secundario">Objetivo de tu rutina: {seleccionado.objetivo}</p>}
          <div className="my-5 rounded-xl border border-borde bg-neutral/[0.03] p-3 text-sm text-secundario">{ultima?.dia ? <><span>Última vez · {fechaCorta(ultima.dia)}</span><p className="mt-1 font-semibold text-tinta">{ultima.series.map((s: any) => esCardio ? `${s.duracionMinutos ?? s.repeticiones} min · nivel ${s.nivel ?? s.pesoKg}` : `${s.pesoKg} kg × ${s.repeticiones}`).join(' / ')}</p></> : ultima ? 'Todavía no tienes una carga anterior para este ejercicio.' : 'Consultando tu última sesión…'}</div>
          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 px-0.5 text-xs font-semibold text-secundario"><span>#</span><span>{esCardio ? 'Minutos' : 'Peso · kg'}</span><span>{esCardio ? 'Nivel' : 'Reps'}</span><span className="sr-only">Completar</span></div>
          <ol className="divide-y divide-borde">{seleccionado.series.map((s, i) => {
            const campos: ('a' | 'b')[] = esCardio ? ['a', 'b'] : ['b', 'a'];
            return <li key={s.operationId} className="py-3.5"><div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2"><span className="text-center text-lg font-bold tabular-nums text-tenue">{i + 1}</span>{campos.map((campo) => <input key={campo} type="number" inputMode={campo === 'a' && !esCardio ? 'numeric' : 'decimal'} step={campo === 'a' && !esCardio ? 1 : .5} min={campo === 'a' ? esCardio ? .5 : 1 : 0} aria-label={`Serie ${i + 1}: ${esCardio ? campo === 'a' ? 'minutos' : 'nivel' : campo === 'a' ? 'repeticiones' : 'peso en kilogramos'}`} className={`campo h-14 min-w-0 px-1 text-center text-2xl font-bold tabular-nums ${s.estado === 'guardada' ? 'border-vigente/30 bg-vigente/5' : ''}`} value={s[campo]} disabled={s.estado === 'guardada' || c.ocupado || !!s.enviado || s.borrarPendiente} onChange={(ev) => c.cambiarSerie(seleccionado.exerciseId, s.operationId, campo, ev.target.value)} />)}<button disabled={c.ocupado || s.borrarPendiente} aria-label={s.estado === 'guardada' ? `Corregir serie ${i + 1}` : `${s.estado === 'error' ? 'Reintentar' : 'Guardar'} serie ${i + 1}`} className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl font-bold ${s.estado === 'guardada' ? 'border-vigente/40 bg-vigente/10 text-vigente' : 'border-acento bg-acento text-black'}`} onClick={() => s.estado === 'guardada' ? c.editarSerie(seleccionado.exerciseId, s.operationId) : c.guardarSerie(seleccionado.exerciseId, s.operationId)}>{s.estado === 'guardada' ? '✓' : s.estado === 'error' ? '↻' : '✓'}</button></div><div className="mt-1 flex flex-wrap items-center justify-between gap-1 pl-8"><span className={`text-[11px] ${s.estado === 'guardada' ? 'text-vigente' : s.estado === 'error' ? 'text-vencido' : 'text-tenue'}`}>{s.estado === 'guardada' ? 'Guardada en tu cuenta · toca ✓ para corregir' : s.estado === 'error' ? 'Falta confirmación de guardado' : s.estado === 'editando' ? 'Corrección guardada en este dispositivo' : 'Borrador en este dispositivo'}</span><button className="min-h-11 px-1 text-xs text-secundario underline underline-offset-2" disabled={c.ocupado} onClick={() => c.quitarSerie(seleccionado.exerciseId, s.operationId)}>{s.borrarPendiente ? 'Reintentar deshacer' : s.serverId ? 'Deshacer' : 'Quitar'}</button></div>{s.error && <p className="mt-1 text-xs leading-relaxed text-vencido" role="alert">{s.error}</p>}</li>;
          })}</ol>
          <button className="boton-suave mt-2 w-full" disabled={seleccionado.series.length >= 30 || c.ocupado} onClick={() => c.agregarSerie(seleccionado.exerciseId)}>+ Añadir serie</button>
          {ultima && <div className="mt-5 border-t border-borde pt-4"><NotaEjercicio exerciseId={seleccionado.exerciseId} nota={ultima.nota || ''} onGuardada={(nota) => setUltima({ ...ultima, nota })} /></div>}
        </section> : <div className="tarjeta py-8 text-center"><h2 className="text-xl font-bold">Elige tu primer ejercicio</h2><p className="mt-2 text-sm text-secundario">Usa el buscador para añadirlo a esta sesión.</p></div>}
        <div className="tarjeta"><SelectorEjercicio ejercicios={datos.ejercicios} recientes={datos.recientes.map((e: any) => e.id)} zonas={[]} valor="" etiqueta="Añadir ejercicio" onElegir={(e) => c.agregar(e)} onCambioCatalogo={c.recargar} /></div>
      </div>
      <aside className="space-y-5">
        <section className="tarjeta space-y-4"><p className="rotulo">Sesión en curso</p><h2 className="text-xl font-bold">{draft.titulo}</h2><RelojSesion inicio={draft.startedAt} /><div className="grid grid-cols-2 gap-3 border-y border-borde py-4"><div><p className="text-2xl font-black tabular-nums">{guardadas}</p><p className="text-xs text-secundario">Series guardadas</p></div><div><p className="text-2xl font-black tabular-nums">{draft.ejercicios.length}</p><p className="text-xs text-secundario">Ejercicios</p></div></div><p className="text-xs leading-relaxed text-secundario">{pendientes ? `${pendientes} series aún son borradores en este dispositivo. Pulsa ✓ en cada una para guardarlas en tu cuenta.` : 'Todas las series de esta sesión están guardadas en tu cuenta.'}</p>{c.aviso && <p className="text-xs text-vigente" role="status">{c.aviso}</p>}
          {!confirmar ? <button className="boton w-full" disabled={c.ocupado} onClick={() => setConfirmar(true)}>Finalizar entrenamiento</button> : <div className="space-y-3 rounded-xl border border-porvencer/40 p-3"><p className="text-sm font-semibold">¿Finalizar esta sesión?</p><p className="text-xs leading-relaxed text-secundario">{pendientes ? `Se conservarán ${guardadas} series guardadas; las series que no completaste quedarán sin registrar.` : 'Tus series seguirán disponibles en Progreso.'} Esto no marca tu salida del gimnasio.</p><button className="boton w-full" disabled={c.ocupado} onClick={async () => { if (await c.finalizar()) setConfirmar(false); }}>{c.ocupado ? 'Finalizando…' : 'Confirmar y finalizar'}</button><button className="boton-suave w-full" disabled={c.ocupado} onClick={() => setConfirmar(false)}>Seguir entrenando</button></div>}
        </section>
        <section className="tarjeta space-y-3"><h2 className="font-bold">Descanso entre series</h2><p className="text-xs leading-relaxed text-secundario">Empieza al confirmar una serie. Puedes cambiar de sección sin perder el tiempo restante.</p><div className="grid grid-cols-4 gap-1.5">{[60, 90, 120, 180].map((s) => <button key={s} aria-pressed={draft.descanso === s} className={`min-h-11 rounded-lg border text-xs font-bold tabular-nums ${draft.descanso === s ? 'border-acento/50 bg-acento/10 text-acentoTexto' : 'border-borde text-secundario'}`} onClick={() => c.descanso(s)}>{s < 120 ? `${s} s` : `${s / 60} min`}</button>)}</div><button className="boton-suave w-full" onClick={() => c.ajustarDescanso('iniciar')}>Iniciar descanso</button></section>
      </aside>
    </div>}
  </main>;
}


