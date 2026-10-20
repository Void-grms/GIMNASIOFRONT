'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { iniciales, leerToken, sesionActual } from '@/lib/api';
import { SelectorTema } from '@/components/tema/SelectorTema';
import { PortalEntrenoProvider } from '@/components/portal/PortalEntrenoProvider';
import { DescansoPortal } from '@/components/portal/DescansoPortal';
import styles from './portal.module.css';

const NAV = [
  { href: '/portal/hoy', texto: 'Hoy', icono: 'm3 10 9-7 9 7v10H3ZM9 20v-7h6v7' },
  { href: '/portal/entrenar', texto: 'Entrenar', icono: 'M3 9v6M21 9v6M6.5 6.5v11M17.5 6.5v11M6.5 12h11' },
  { href: '/portal/progreso', texto: 'Progreso', icono: 'M4 4v16h16M8 15l4-5 4 2 4-7' },
  { href: '/portal/mi', texto: 'Credencial', icono: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v6h-6v-2' },
  { href: '/portal/mas', texto: 'Más', icono: 'M5 12h.01M12 12h.01M19 12h.01' },
];
const SECUNDARIAS = ['/portal/perfil', '/portal/tienda', '/portal/ranking', '/portal/renovar', '/portal/rutina'];
const TITULOS: Record<string, string> = {
  '/portal/perfil': 'Mi perfil', '/portal/tienda': 'Tienda', '/portal/ranking': 'Retos y ranking',
  '/portal/renovar': 'Renovar membresía', '/portal/rutina': 'Mis rutinas',
};
function Marca() {
  return <span className={styles.brand}><span className={styles.mark} aria-hidden="true">F</span><span>FORCES<span className={styles.brandCaption}>PORTAL DEL SOCIO</span></span></span>;
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const router = useRouter();
  const publica = ruta === '/portal' || ruta === '/portal/activar' || ruta === '/portal/bienvenida';
  const [estado, setEstado] = useState<'cargando' | 'pendiente' | 'activo'>('cargando');
  const [nombre, setNombre] = useState('');
  useEffect(() => {
    if (publica) { setEstado('cargando'); return; }
    if (!leerToken('socio')) { router.replace('/portal'); return; }
    const sesion = sesionActual('socio');
    const pendiente = sesion?.debeCambiarPin === true;
    setNombre(sesion?.nombre || 'Mi cuenta');
    setEstado(pendiente ? 'pendiente' : 'activo');
    if (pendiente && ruta !== '/portal/perfil') router.replace('/portal/perfil?cambiar=1');
  }, [ruta, publica, router]);
  if (publica) return <>{children}</>;
  if (estado === 'cargando' || (estado === 'pendiente' && ruta !== '/portal/perfil')) return <main className="flex min-h-screen items-center justify-center px-4"><p role="status" className="text-sm text-secundario">Comprobando tu acceso…</p></main>;
  if (estado === 'pendiente') return <><div className="apariencia-global print:hidden"><SelectorTema compacto /></div>{children}</>;

  const activa = (href: string) => ruta === href || ruta.startsWith(href + '/') || (href === '/portal/mas' && SECUNDARIAS.some((p) => ruta.startsWith(p)));
  const seccion = TITULOS[ruta] || NAV.find(p => activa(p.href))?.texto || 'Mi portal';
  const links = (movil: boolean) => NAV.map((p) => <Link key={p.href} href={p.href} aria-current={activa(p.href) ? 'page' : undefined} className={`${movil ? styles.mobileLink : styles.navLink} ${activa(p.href) ? styles.active : ''}`}>
    <span className={styles.navIcon}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.texto === 'Más' ? 4 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={p.icono} /></svg></span><span>{p.texto}</span>
  </Link>);
  return <PortalEntrenoProvider><div className={styles.shell}>
    <a href="#contenido-portal" className="sr-only z-50 bg-acento p-3 text-black focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Ir al contenido</a>
    <aside className={styles.sidebar} aria-label="Portal del socio">
      <Link href="/portal/hoy" aria-label="Forces Gym, ir a Hoy"><Marca /></Link>
      <p className={styles.navLabel}>Mi entrenamiento</p>
      <nav className={styles.nav} aria-label="Secciones del portal">{links(false)}</nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.appearance}><SelectorTema compacto /></div>
        <Link href="/portal/perfil" className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">{iniciales(nombre)}</span>
          <span><strong>{nombre}</strong><small>Mi perfil y acceso</small></span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </Link>
      </div>
    </aside>
    <header className={styles.topbar}>
      <Link href="/portal/hoy" className={styles.mobileBrand} aria-label="Forces Gym, ir a Hoy"><Marca /></Link>
      <p className={styles.breadcrumb}>Mi espacio <span aria-hidden="true">/</span> <strong>{seccion}</strong></p>
      <div className={styles.mobileTheme}><SelectorTema compacto className="portal-tema-movil" /></div>
      <Link className={styles.credential} href="/portal/mi"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v6h-6v-2" /></svg>Mostrar mi credencial</Link>
    </header>
    <div id="contenido-portal" className={styles.content} tabIndex={-1}>{children}</div>
    <nav aria-label="Secciones del portal, móvil" className={styles.mobileNav}><div>{links(true)}</div></nav>
    <DescansoPortal />
  </div></PortalEntrenoProvider>;
}
