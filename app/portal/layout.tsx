'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { leerToken, sesionActual } from '@/lib/api';
import { SelectorTema } from '@/components/tema/SelectorTema';
import { PortalEntrenoProvider } from '@/components/portal/PortalEntrenoProvider';
import { DescansoPortal } from '@/components/portal/DescansoPortal';

const NAV = [
  { href: '/portal/hoy', texto: 'Hoy', icono: 'm3 10 9-7 9 7v10H3ZM9 20v-7h6v7' },
  { href: '/portal/entrenar', texto: 'Entrenar', icono: 'M3 9v6M21 9v6M6.5 6.5v11M17.5 6.5v11M6.5 12h11' },
  { href: '/portal/progreso', texto: 'Progreso', icono: 'M4 4v16h16M8 15l4-5 4 2 4-7' },
  { href: '/portal/mi', texto: 'Credencial', icono: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v6h-6v-2' },
  { href: '/portal/mas', texto: 'Más', icono: 'M5 12h.01M12 12h.01M19 12h.01' },
];
const SECUNDARIAS = ['/portal/perfil', '/portal/tienda', '/portal/ranking', '/portal/renovar', '/portal/rutina'];
function Marca() { return <span className="flex items-center gap-2.5"><span className="flex h-10 w-9 -skew-x-12 items-center justify-center bg-acento text-2xl font-black text-black" aria-hidden="true">F</span><span className="text-xl font-black leading-none tracking-tighter">FORCES<span className="mt-1.5 block text-[9px] font-semibold tracking-[.2em] text-secundario">PORTAL DEL SOCIO</span></span></span>; }
export default function PortalLayout({ children }: { children: ReactNode }) {
  const ruta = usePathname(); const router = useRouter();
  const publica = ruta === '/portal' || ruta === '/portal/activar' || ruta === '/portal/bienvenida';
  const [estado, setEstado] = useState<'cargando' | 'pendiente' | 'activo'>('cargando');
  useEffect(() => {
    if (publica) { setEstado('cargando'); return; }
    if (!leerToken('socio')) { router.replace('/portal'); return; }
    const pendiente = sesionActual('socio')?.debeCambiarPin === true;
    setEstado(pendiente ? 'pendiente' : 'activo');
    if (pendiente && ruta !== '/portal/perfil') router.replace('/portal/perfil?cambiar=1');
  }, [ruta, publica, router]);
  if (publica) return <>{children}</>;
  if (estado === 'cargando' || (estado === 'pendiente' && ruta !== '/portal/perfil')) return <main className="flex min-h-screen items-center justify-center px-4"><p role="status" className="text-sm text-secundario">Comprobando tu acceso…</p></main>;
  if (estado === 'pendiente') return <><div className="apariencia-global print:hidden"><SelectorTema compacto /></div>{children}</>;
  const activa = (href: string) => ruta === href || ruta.startsWith(href + '/') || (href === '/portal/mas' && SECUNDARIAS.some((p) => ruta.startsWith(p)));
  const links = (movil: boolean) => NAV.map((p) => <Link key={p.href} href={p.href} aria-current={activa(p.href) ? 'page' : undefined} className={`${movil ? 'flex min-h-[4.5rem] min-w-0 flex-col justify-center gap-1 px-0.5 text-[10px]' : 'flex min-h-[3.5rem] gap-3 px-4 text-sm'} items-center rounded-xl font-semibold transition-colors ${activa(p.href) ? movil ? 'bg-acento/10 text-acentoTexto' : 'bg-acento text-black' : 'text-secundario hover:bg-neutral/5 hover:text-tinta'}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.texto === 'Más' ? 5 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={p.icono} /></svg><span>{p.texto}</span></Link>);
  return <PortalEntrenoProvider><div className="min-h-screen bg-fondo text-tinta lg:pl-60">
    <a href="#contenido-portal" className="sr-only z-50 bg-acento p-3 text-black focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Ir al contenido</a>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-borde bg-fondo px-5 py-8 lg:flex" aria-label="Portal del socio"><Link href="/portal/hoy" aria-label="Forces Gym, ir a Hoy"><Marca /></Link><nav className="mt-12 grid gap-2" aria-label="Secciones del portal">{links(false)}</nav><div className="mt-auto space-y-4 border-t border-borde pt-5"><p className="text-sm font-semibold">{sesionActual('socio')?.nombre || 'Mi portal'}</p><p className="text-xs leading-relaxed text-secundario">Tu entrenamiento,<br />serie por serie.</p><SelectorTema compacto /></div></aside>
    <header className="sticky top-0 z-20 flex min-h-[5rem] items-center justify-between gap-3 border-b border-borde bg-fondo/95 px-4 py-3 backdrop-blur lg:px-8"><Link href="/portal/hoy" className="lg:hidden" aria-label="Forces Gym, ir a Hoy"><Marca /></Link><p className="hidden text-sm text-secundario lg:block">Portal del socio <span className="px-3 text-tenue">/</span> Forces Gym</p><div className="lg:hidden"><SelectorTema compacto className="portal-tema-movil" /></div><Link className="hidden min-h-11 items-center gap-2 text-sm text-secundario hover:text-tinta lg:flex" href="/portal/mi">Mostrar mi credencial <span aria-hidden="true">↗</span></Link></header>
    <div id="contenido-portal" className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12" tabIndex={-1}>{children}</div>
    <nav aria-label="Secciones del portal, móvil" className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-superficie/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-5">{links(true)}</div></nav><DescansoPortal />
  </div></PortalEntrenoProvider>;
}
