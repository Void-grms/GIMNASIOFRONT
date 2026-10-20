'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fechaCorta } from '@/lib/api';
import { NOMBRE_GRUPO } from '@/components/MapaCuerpo';
import { Esqueleto } from '@/components/Esqueleto';
import { EncabezadoPortal } from '@/components/portal/EncabezadoPortal';
import { usePortalEntreno } from '@/components/portal/PortalEntrenoProvider';

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
  async function comenzar() { if (await iniciar(titulo, lista)) router.push('/portal/entrenar'); }
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
    <EncabezadoPortal titulo={p?.nombres ? `Hoy, ${p.nombres.split(' ')[0]}` : 'Hoy'} descripcion="Un buen entrenamiento empieza con el siguiente paso." accion={<span className="text-xs capitalize text-secundario">{new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' })}</span>} />
    {error && <div className="aviso-mal flex flex-wrap items-center justify-between gap-2"><p>{error}</p><button className="min-h-11 font-semibold underline" onClick={() => recargar()}>Reintentar</button></div>}
    {cargando && !p ? <Esqueleto filas={3} /> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <section className="rounded-3xl border border-borde bg-superficie p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="rotulo">{draft ? 'Tu sesión sigue aquí' : rutina ? 'Rutina de tu entrenador' : 'Tu entrenamiento de hoy'}</p><Link href="/portal/rutina" className="min-h-11 py-3 text-xs font-semibold text-acentoTexto underline underline-offset-4">Ver mis rutinas</Link></div>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{draft?.titulo || titulo}</h2>
          <p className="mt-3 text-sm text-secundario">{draft ? `${completadas} series guardadas. Continúa por donde te quedaste.` : lista.length ? `${lista.length} ejercicios · registra cada serie y descansa entre ellas.` : 'Elige tus ejercicios y registra cada serie. También puedes cargar una plantilla o seguir tu plan semanal.'}</p>
          {(draft?.ejercicios.length || lista.length) > 0 && <ol className="my-5 divide-y divide-borde">{(draft ? draft.ejercicios : lista).slice(0, 5).map((e: any, i: number) => <li key={e.exerciseId} className="flex items-center gap-3 py-3.5"><span className="w-5 shrink-0 text-xs tabular-nums text-tenue">{String(i + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 text-sm font-semibold">{e.nombre}</span><span className="text-xs tabular-nums text-secundario">{Array.isArray(e.series) ? `${e.series.filter((s: any) => s.estado === 'guardada').length}/${e.series.length}` : `${e.series} × ${e.repeticiones}`}</span></li>)}</ol>}
          <button className="boton-grande mt-5 w-full justify-between" disabled={ocupado} onClick={comenzar}>{ocupado ? 'Preparando tu sesión…' : draft ? 'Continuar entrenamiento' : 'Iniciar entrenamiento'}<span aria-hidden="true">→</span></button>
          <p className="mt-3 text-xs leading-relaxed text-tenue">Iniciar o finalizar un entrenamiento no registra entradas ni salidas del gimnasio.</p>
        </section>
        <section className="tarjeta"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="rotulo">Tu plan semanal</p><h2 className="mt-1 font-bold">Haz espacio para entrenar</h2></div><Link href="/portal/rutina#semana" className="min-h-11 py-3 text-sm font-semibold text-acentoTexto">Organizar →</Link></div><div className="mt-4 grid grid-cols-7 gap-1.5">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((letra, i) => { const d = datos.plan.find((x: any) => x.diaSemana === i + 1); return <div key={i} className={`flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border text-xs ${n === i + 1 ? 'border-acento/60 bg-acento/10' : 'border-borde'}`}><span className="font-semibold text-secundario">{letra}</span><span className={d?.grupos?.length ? 'text-acentoTexto' : 'text-tenue'} aria-label={d?.grupos?.length ? d.titulo || 'Día de entrenamiento planificado' : 'Sin entrenamiento planificado'}>{d?.grupos?.length ? '●' : '—'}</span></div>; })}</div><p className="mt-3 text-xs text-tenue">Los puntos muestran los días de tu plan; tus asistencias están en la credencial.</p></section>
      </div>
      <div className="space-y-5">
        <section className="tarjeta space-y-4"><p className="rotulo">Tu membresía</p><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-xl font-bold">{p?.plan || 'Sin membresía'}</h2><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${p?.estado === 'vigente' ? 'border-vigente/40 text-vigente' : p?.estado === 'por_vencer' ? 'border-porvencer/40 text-porvencer' : 'border-vencido/40 text-vencido'}`}>{p?.estado === 'vigente' ? 'Vigente' : p?.estado === 'por_vencer' ? 'Por vencer' : 'Revisar en recepción'}</span></div>{p?.vence && <p className="text-sm text-secundario">Vence el {fechaCorta(p.vence)}</p>}{p?.limiteAsistencias != null && <div className="border-t border-borde pt-4"><p className="text-4xl font-black tabular-nums">{p.asistenciasRestantes ?? Math.max(0, p.limiteAsistencias - (p.asistenciasUsadas ?? 0))}<span className="text-base font-medium text-secundario"> / {p.limiteAsistencias}</span></p><p className="mt-1 text-xs text-secundario">Asistencias disponibles durante esta membresía.</p></div>}<Link href="/portal/mi" className="boton-suave w-full">Mostrar mi credencial</Link><Link href="/portal/renovar" className="flex min-h-11 items-center justify-center text-sm font-semibold text-acentoTexto">Ver opciones para renovar →</Link></section>
        <section className="tarjeta"><p className="rotulo">Mira tu avance</p><h2 className="mt-2 text-xl font-bold">Cada serie cuenta</h2><p className="mt-2 text-sm leading-relaxed text-secundario">Consulta tus cargas anteriores, el historial y tu peso corporal en un espacio propio.</p><Link href="/portal/progreso" className="mt-3 flex min-h-11 items-center text-sm font-semibold text-acentoTexto">Ver mi progreso →</Link></section>
      </div>
    </div>}
  </main>;
}

