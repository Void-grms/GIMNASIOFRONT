'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fechaCorta } from '@/lib/api';
import { NOMBRE_GRUPO } from '@/components/MapaCuerpo';
import { Esqueleto } from '@/components/Esqueleto';
import { EncabezadoPortal } from '@/components/portal/EncabezadoPortal';
import { usePortalEntreno } from '@/components/portal/PortalEntrenoProvider';
import styles from './hoy.module.css';

function Icono({ d, size = 18 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}
const FLECHA = 'M5 12h14m-5-5 5 5-5 5';

export default function HoyPortal() {
  const { datos, cargando, draft, iniciar, ocupado, error, recargar } = usePortalEntreno();
  const router = useRouter();
  const n = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Lima' })) + 1;
  const plan = datos.plan.find((d: any) => d.diaSemana === n);
  const rutina = datos.rutina?.estado === 'activa' ? datos.rutina.hoy : null;
  const titulo = rutina?.titulo || plan?.titulo || (plan?.grupos?.length ? plan.grupos.map((g: string) => NOMBRE_GRUPO[g] ?? g).join(' · ') : 'Entrena a tu ritmo');
  const lista = rutina?.ejercicios ?? [];
  const p = datos.panel;
  const completadas = draft?.ejercicios.flatMap((e) => e.series).filter((s) => s.estado === 'guardada').length ?? 0;
  const restantes = p?.limiteAsistencias != null ? p.asistenciasRestantes ?? Math.max(0, p.limiteAsistencias - (p.asistenciasUsadas ?? 0)) : null;
  const dias = p?.diasRestantes;
  async function comenzar() { if (await iniciar(titulo, lista)) router.push('/portal/entrenar'); }

  return <main className="mx-auto max-w-6xl space-y-7 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
    <EncabezadoPortal titulo={p?.nombres ? `Hoy, ${p.nombres.split(' ')[0]}` : 'Hoy'} descripcion="Tu entrenamiento, tu plan y lo que viene después." accion={<span className={styles.date}><Icono d="M7 3v4m10-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /><span className="first-letter:uppercase">{new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' })}</span></span>} />
    {error && <div className="aviso-mal flex flex-wrap items-center justify-between gap-2"><p role="alert">{error}</p><button className="min-h-11 font-semibold underline" onClick={() => recargar()}>Reintentar</button></div>}
    {cargando && !p ? <Esqueleto filas={3} /> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        <section className={styles.workout}>
          <div className={styles.workoutTop}><span className={styles.workoutIcon}><Icono size={25} d="M3 9v6M21 9v6M6.5 6.5v11M17.5 6.5v11M6.5 12h11" /></span><Link href="/portal/rutina" className={styles.routineLink}>Ver mis rutinas <Icono d="m9 5 7 7-7 7" size={14} /></Link></div>
          <p className={styles.workoutLabel}>{draft ? 'Tu sesión sigue aquí' : rutina ? 'Rutina de tu entrenador' : 'Tu entrenamiento de hoy'}</p>
          <h2 className={styles.workoutTitle}>{draft?.titulo || titulo}</h2>
          <p className={styles.workoutDescription}>{draft ? `${completadas} series guardadas. Continúa por donde te quedaste.` : lista.length ? `${lista.length} ejercicios · registra cada serie y descansa entre ellas.` : 'Elige tus ejercicios y registra cada serie. Puedes seguir tu plan semanal o cargar una de tus rutinas.'}</p>
          {(draft?.ejercicios.length || lista.length) > 0 && <ol className="mt-5 divide-y divide-borde border-y border-borde">{(draft ? draft.ejercicios : lista).slice(0, 5).map((e: any, i: number) => <li key={e.exerciseId} className="flex items-center gap-3 py-3.5"><span className="w-5 shrink-0 text-xs tabular-nums text-tenue">{String(i + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 text-sm font-semibold">{e.nombre}</span><span className="shrink-0 text-xs tabular-nums text-secundario">{Array.isArray(e.series) ? `${e.series.filter((s: any) => s.estado === 'guardada').length}/${e.series.length}` : `${e.series} × ${e.repeticiones}`}</span></li>)}</ol>}
          <button className={`boton ${styles.start}`} disabled={ocupado} onClick={comenzar}>{ocupado ? 'Preparando tu sesión…' : draft ? 'Continuar entrenamiento' : 'Iniciar entrenamiento'}<Icono d={FLECHA} /></button>
          <p className={styles.note}><Icono d="M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" size={14} />Iniciar o finalizar un entrenamiento no registra entradas ni salidas del gimnasio.</p>
        </section>
        <section className="tarjeta"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="rotulo">Tu plan semanal</p><h2 className="mt-1.5 text-base font-bold tracking-tight">Haz espacio para entrenar</h2></div><Link href="/portal/rutina#semana" className="flex min-h-11 items-center gap-2 text-xs font-semibold text-acentoTexto">Organizar <Icono d={FLECHA} size={15} /></Link></div>
          <div className={styles.week}>{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((letra, i) => { const d = datos.plan.find((x: any) => x.diaSemana === i + 1); return <div key={letra} aria-current={n === i + 1 ? 'date' : undefined} className={`${styles.day} ${n === i + 1 ? styles.today : ''}`}><span>{letra}</span><span className={d?.grupos?.length ? styles.planned : ''} aria-label={d?.grupos?.length ? d.titulo || 'Día de entrenamiento planificado' : 'Sin entrenamiento planificado'}>{d?.grupos?.length ? <Icono size={12} d="m5 12 4 4L19 6" /> : '—'}</span></div>; })}</div>
          <p className="mt-4 text-xs leading-relaxed text-tenue">Tu planificación de la semana. Consulta tus asistencias en la credencial.</p>
        </section>
      </div>
      <div className="min-w-0 space-y-5">
        <section className={styles.membership}>
          <div className={styles.membershipHeader}><p className="rotulo">Tu membresía</p><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${p?.estado === 'vigente' ? 'bg-vigente/10 text-vigente' : p?.estado === 'por_vencer' ? 'bg-porvencer/10 text-porvencer' : 'bg-vencido/10 text-vencido'}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{p?.estado === 'vigente' ? 'Vigente' : p?.estado === 'por_vencer' ? 'Por vencer' : 'Revisar en recepción'}</span></div>
          <div className={styles.membershipBody}><h2 className="text-[22px] font-bold tracking-tight">{p?.plan || 'Sin membresía'}</h2>{p?.vence && <p className="mt-2 text-xs text-secundario">Vence el {fechaCorta(p.vence)}</p>}
            {restantes !== null ? <div className={styles.remaining}><p className="text-[42px] font-extrabold leading-none tracking-tight tabular-nums">{restantes}<span className="ml-1 text-base font-medium text-tenue">/ {p.limiteAsistencias}</span></p><p className="mt-2 text-xs text-secundario">Asistencias disponibles</p><div className={styles.meter} role="meter" aria-label="Asistencias disponibles" aria-valuemin={0} aria-valuemax={p.limiteAsistencias} aria-valuenow={Math.max(0, Math.min(p.limiteAsistencias, restantes))}><span style={{ width: `${p.limiteAsistencias > 0 ? Math.max(0, Math.min(100, restantes / p.limiteAsistencias * 100)) : 0}%` }} /></div></div> : typeof dias === 'number' && dias >= 0 ? <div className={styles.remaining}><p className={dias === 0 ? 'text-xl font-bold text-porvencer' : 'text-[42px] font-extrabold leading-none tracking-tight tabular-nums'}>{dias === 0 ? 'Vence hoy' : <>{dias}<span className="ml-2 text-sm font-medium text-tenue">{dias === 1 ? 'día para vencer' : 'días para vencer'}</span></>}</p></div> : null}
            <Link href="/portal/mi" className="boton-suave mt-6 w-full text-sm"><Icono d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v6h-6v-2" />Mostrar mi credencial</Link>
            <Link href="/portal/renovar" className="mt-1 flex min-h-11 items-center justify-center text-xs font-semibold text-acentoTexto">Ver opciones para renovar <span aria-hidden="true" className="ml-2">→</span></Link>
          </div>
        </section>
        <section className="tarjeta"><p className="rotulo">Mira tu avance</p><h2 className="mt-2.5 text-lg font-bold tracking-tight">Cada serie cuenta</h2><p className="mt-2 text-sm leading-relaxed text-secundario">Tus cargas anteriores, tu historial y tu peso corporal, en un mismo lugar.</p><Link href="/portal/progreso" className={styles.progressLink}>Ver mi progreso <Icono d={FLECHA} /></Link></section>
      </div>
    </div>}
  </main>;
}
