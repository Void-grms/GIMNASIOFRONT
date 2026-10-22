'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SelectorTema } from '@/components/tema/SelectorTema';
import s from './Panel.module.css';
import { cerrarSesion, iniciales, leerToken, sesionActual } from '@/lib/api';
import { RecuperacionMembresia } from '@/components/OperacionMembresia';

type Item = { href: string; texto: string; icono: ReactNode; insignia?: number; soloAdmin?: boolean };

const I = ({ d }: { d: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0" aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: 'Operación',
    items: [
      { href: '/panel/recepcion', texto: 'Recepción', icono: <I d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v5H4zM14 15h3v3h-3zM19 19h1.5v1.5H19z" /> },
      { href: '/panel/escaner', texto: 'Escáner', icono: <I d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3M7 12h10" /> },
      { href: '/panel/socios', texto: 'Socios', icono: <I d="M9 4.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8zM2.5 20a6.5 6.5 0 0 1 13 0M16.5 5.2a3.4 3.4 0 0 1 0 5.6M18 20c0-2.1-.7-3.6-1.6-4.6" /> },
      { href: '/panel/rutinas', texto: 'Rutinas', icono: <I d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" /> },
      { href: '/panel/invitados', texto: 'Invitados', icono: <I d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8zM19 8v6M22 11h-6" /> },
    ],
  },
  {
    titulo: 'Ventas y cobros',
    items: [
      { href: '/panel/caja', texto: 'Caja', icono: <I d="M4.9 6h14.2A2.4 2.4 0 0 1 21.5 8.4v8.2A2.4 2.4 0 0 1 19.1 19H4.9a2.4 2.4 0 0 1-2.4-2.4V8.4A2.4 2.4 0 0 1 4.9 6zM2.5 10.5h19M6 15h4" /> },
      { href: '/panel/productos', texto: 'Productos', icono: <I d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5zM3 8.5 12 13l9-4.5M12 13v7" /> },
      { href: '/panel/comprobantes', texto: 'Comprobantes', icono: <I d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5" /> },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { href: '/panel/membresias', texto: 'Membresías', soloAdmin: true, icono: <I d="M4 5h16v14H4zM4 9h16M8 13h3M8 16h7" /> },
      { href: '/panel/facturacion', texto: 'Facturación SUNAT', soloAdmin: true, icono: <I d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" /> },
      { href: '/panel/avisos', texto: 'Avisos', icono: <I d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 20a2 2 0 0 0 3.4 0" /> },
      { href: '/panel/reclamaciones', texto: 'Reclamos', icono: <I d="M21 12a8.5 8.5 0 0 1-12.2 7.6L3 21l1.4-5.8A8.5 8.5 0 1 1 21 12z" /> },
      { href: '/panel', texto: 'Resumen', icono: <I d="M3 20h18M6 20v-7M11 20V7M16 20v-4M21 20V4" /> },
      { href: '/panel/ajustes', texto: 'Ajustes', icono: <I d="M12 8.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4zM19.4 15a1.7 1.7 0 0 0 .3 1.9 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.9 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0 .3 1.9 2 2 0 1 1 0 4z" /> },
    ],
  },
];

export default function PanelLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const seccion = GRUPOS.flatMap((grupo) => grupo.items)
    .filter((item) => ruta === item.href || (item.href !== '/panel' && ruta.startsWith(item.href + '/')))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const titulo = seccion?.texto ?? 'Panel';
  const [listo, setListo] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [usuario, setUsuario] = useState<{ nombre?: string; rol?: string } | null>(null);
  const dialogo = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const encabezado = useRef<HTMLElement>(null);
  const barraMovil = useRef<HTMLElement>(null);
  const gruposVisibles = GRUPOS.map((grupo) => ({ ...grupo, items: grupo.items.filter((item) => !item.soloAdmin || usuario?.rol === 'admin') }));
  const accesosRapidos = [GRUPOS[0].items[0], GRUPOS[0].items[1], GRUPOS[0].items[2], GRUPOS[1].items[0]];
  const masActivo = !accesosRapidos.some((item) => item.href === seccion?.href);
  const rol = usuario?.rol === 'admin' ? 'Administración' : 'Recepción';

  useEffect(() => setMenuMovil(false), [ruta]);
  useEffect(() => { document.title = titulo + ' · Forces Gym'; }, [titulo]);
  useEffect(() => {
    if (!leerToken('staff')) { router.replace('/login'); return; }
    setUsuario(sesionActual('staff'));
    setListo(true);
  }, [router]);

  useEffect(() => {
    const elemento = encabezado.current;
    if (!elemento) return;
    const medir = () => {
      panel.current?.style.setProperty('--panel-header-height', `${elemento.getBoundingClientRect().height}px`);
      panel.current?.style.setProperty('--panel-nav-height', `${barraMovil.current?.getBoundingClientRect().height ?? 0}px`);
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    if (barraMovil.current) observador.observe(barraMovil.current);
    return () => observador.disconnect();
  }, [listo]);

  // El menú conserva el foco dentro del diálogo y lo devuelve al control de apertura.
  useEffect(() => {
    if (!menuMovil) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const desbordamiento = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escritorio = window.matchMedia('(min-width: 768px)');
    const cerrarEnEscritorio = () => { if (escritorio.matches) setMenuMovil(false); };
    escritorio.addEventListener('change', cerrarEnEscritorio);
    cerrarEnEscritorio();
    const controles = () => Array.from(dialogo.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select, [tabindex="0"]') ?? []).filter((elemento) => elemento.getClientRects().length > 0);
    controles()[0]?.focus();
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') { evento.preventDefault(); setMenuMovil(false); }
      if (evento.key !== 'Tab') return;
      const elementos = controles();
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo?.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero?.focus(); }
    };
    document.addEventListener('keydown', teclado);
    return () => { document.body.style.overflow = desbordamiento; document.removeEventListener('keydown', teclado); escritorio.removeEventListener('change', cerrarEnEscritorio); anterior?.focus(); };
  }, [menuMovil]);

  function salir() { cerrarSesion('staff'); router.replace('/login'); }

  if (!listo) return <div className={s.cargando} role="status" aria-label="Cargando el panel"><div className={s.esqueletoBarra} /><div className={s.esqueletoContenido}><div /><div /><div /></div></div>;

  return <div className={s.panel} ref={panel}>
    <a href="#contenido-panel" className={s.saltar}>Ir al contenido</a>
    <aside className={s.sidebar} aria-label="Panel de administración">
      <Link href="/panel/recepcion" className={s.marca} aria-label="Forces Gym, recepción">
        <span className={s.monograma} aria-hidden="true">F</span>
        <span className={s.marcaTexto}><strong>FORCES GYM</strong><span>Administración</span></span>
      </Link>
      <nav className={s.navegacion} aria-label="Navegación del panel">
        {gruposVisibles.map((grupo) => <div key={grupo.titulo} className={s.grupo}>
          <p className={s.grupoTitulo}>{grupo.titulo}</p>
          {grupo.items.map((item) => <Link key={item.href} href={item.href} className={s.enlace} title={item.texto} aria-label={item.texto} aria-current={seccion?.href === item.href ? 'page' : undefined}>
            {item.icono}<span>{item.texto}</span>
            {item.insignia ? <span className={s.insignia}>{item.insignia}</span> : null}
          </Link>)}
        </div>)}
      </nav>
      <div className={s.pieSidebar}>
        <Link href="/quiosco" className={s.quiosco} title="Modo quiosco" aria-label="Modo quiosco"><I d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" /><span>Modo quiosco</span></Link>
        <div className={s.usuario}>
          <span className={s.avatar} aria-hidden="true">{iniciales(usuario?.nombre)}</span>
          <div className={s.usuarioTexto}><strong>{usuario?.nombre || 'Personal'}</strong><span>{rol}</span></div>
          <button type="button" className={s.salir} onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión"><I d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></button>
        </div>
      </div>
    </aside>

    <main className={s.principal} id="contenido-panel" tabIndex={-1}>
      <header className={s.encabezado} ref={encabezado}>
        <Link href="/panel/recepcion" className={s.marcaMovil} aria-label="Forces Gym, recepción"><span className={s.monograma} aria-hidden="true">F</span></Link>
        <div className={s.titulo}><p>Panel de administración</p><h1>{titulo}</h1></div>
        <SelectorTema compacto className={s.tema} />
        <button type="button" onClick={() => setMenuMovil(true)} aria-label="Abrir menú" aria-controls="menu-panel" aria-expanded={menuMovil} className={s.abrirMenu}><I d="M4 6h16M4 12h16M4 18h16" /></button>
      </header>
      <div className={s.contenido}><RecuperacionMembresia />{children}</div>
    </main>

    <nav className={s.barraMovil} ref={barraMovil} aria-label="Accesos rápidos del panel">
      {accesosRapidos.map((item) => <Link key={item.href} href={item.href} aria-current={seccion?.href === item.href ? 'page' : undefined}><span>{item.icono}</span>{item.texto}</Link>)}
      <button type="button" onClick={() => setMenuMovil(true)} aria-controls="menu-panel" aria-expanded={menuMovil} data-activo={masActivo}><span><I d="M4 6h16M4 12h16M4 18h16" /></span>Más</button>
    </nav>

    {menuMovil && <div className={s.capaMenu}>
      <div className={s.fondoMenu} onClick={() => setMenuMovil(false)} aria-hidden="true" />
      <div ref={dialogo} id="menu-panel" className={s.menu} role="dialog" aria-modal="true" aria-labelledby="titulo-menu-panel">
        <header className={s.cabeceraMenu}><div><p>FORCES GYM</p><h2 id="titulo-menu-panel">Menú del panel</h2></div><button type="button" onClick={() => setMenuMovil(false)} aria-label="Cerrar menú"><I d="m6 6 12 12M6 18 18 6" /></button></header>
        <div className={s.cuerpoMenu}>
          <div className={s.temaMenu}><SelectorTema compacto /></div>
          {gruposVisibles.map((grupo) => <div key={grupo.titulo} className={s.grupoMenu}><p>{grupo.titulo}</p><div>{grupo.items.map((item) => <Link key={item.href} href={item.href} aria-current={seccion?.href === item.href ? 'page' : undefined}>{item.icono}<span>{item.texto}</span></Link>)}</div></div>)}
          <div className={s.accionesMenu}><Link href="/quiosco"><I d="M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4" />Modo quiosco</Link><button type="button" onClick={salir}><I d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />Cerrar sesión</button></div>
          <p className={s.sesionMenu}>{usuario?.nombre || 'Personal'} · {rol}</p>
        </div>
      </div>
    </div>}
  </div>;
}
