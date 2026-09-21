'use client';

// El problema del layout anterior: 10 enlaces en una sola fila que se
// desbordaba y no daba ninguna pista de jerarquia — Recepcion y Ajustes
// pesaban lo mismo. Aqui van agrupados en tres bloques que corresponden a
// como se usa el sistema (operar, cobrar, administrar), con la seccion
// activa marcada por una barra de acento a la izquierda.
//
// En pantallas angostas la barra se colapsa a un carril de solo iconos, asi
// que sigue sirviendo en la tablet del mostrador.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { cerrarSesion, iniciales, leerToken, sesionActual } from '@/lib/api';

type Item = { href: string; texto: string; icono: ReactNode; insignia?: number };

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
    className="shrink-0"
  >
    <path d={d} />
  </svg>
);

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: 'Operacion',
    items: [
      { href: '/panel/recepcion', texto: 'Recepcion', icono: <I d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v5H4zM14 15h3v3h-3zM19 19h1.5v1.5H19z" /> },
      { href: '/panel/escaner', texto: 'Escaner', icono: <I d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3M7 12h10" /> },
      { href: '/panel/socios', texto: 'Socios', icono: <I d="M9 4.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8zM2.5 20a6.5 6.5 0 0 1 13 0M16.5 5.2a3.4 3.4 0 0 1 0 5.6M18 20c0-2.1-.7-3.6-1.6-4.6" /> },
      { href: '/panel/invitados', texto: 'Invitados', icono: <I d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8zM19 8v6M22 11h-6" /> },
    ],
  },
  {
    titulo: 'Dinero',
    items: [
      { href: '/panel/caja', texto: 'Caja', icono: <I d="M4.9 6h14.2A2.4 2.4 0 0 1 21.5 8.4v8.2A2.4 2.4 0 0 1 19.1 19H4.9a2.4 2.4 0 0 1-2.4-2.4V8.4A2.4 2.4 0 0 1 4.9 6zM2.5 10.5h19M6 15h4" /> },
      { href: '/panel/productos', texto: 'Productos', icono: <I d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5zM3 8.5 12 13l9-4.5M12 13v7" /> },
      { href: '/panel/comprobantes', texto: 'Comprobantes', icono: <I d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5" /> },
    ],
  },
  {
    titulo: 'Gestion',
    items: [
      { href: '/panel/avisos', texto: 'Avisos', icono: <I d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 20a2 2 0 0 0 3.4 0" /> },
      { href: '/panel/reclamaciones', texto: 'Reclamos', icono: <I d="M21 12a8.5 8.5 0 0 1-12.2 7.6L3 21l1.4-5.8A8.5 8.5 0 1 1 21 12z" /> },
      { href: '/panel', texto: 'Dashboard', icono: <I d="M3 20h18M6 20v-7M11 20V7M16 20v-4M21 20V4" /> },
      { href: '/panel/ajustes', texto: 'Ajustes', icono: <I d="M12 8.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4zM19.4 15a1.7 1.7 0 0 0 .3 1.9 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.9 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0 .3 1.9 2 2 0 1 1 0 4z" /> },
    ],
  },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();

  // La seccion activa da el titulo de la pagina. /panel/socios/123 cae en
  // "Socios" porque gana el prefijo mas largo.
  const seccion = GRUPOS.flatMap((g) => g.items)
    .filter((i) => ruta === i.href || ruta.startsWith(i.href + '/'))
    .sort((x, y) => y.href.length - x.href.length)[0];
  const titulo = seccion?.texto ?? 'Panel';
  const [listo, setListo] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [usuario, setUsuario] = useState<{ nombre?: string; rol?: string } | null>(null);

  // Cambiar de pantalla cierra el menu movil.
  useEffect(() => setMenuMovil(false), [ruta]);

  // Cada pestana del navegador dice donde esta.
  useEffect(() => {
    document.title = `${titulo} · Forces Gym`;
  }, [titulo]);

  useEffect(() => {
    if (!leerToken('staff')) {
      router.replace('/login');
      return;
    }
    setUsuario(sesionActual('staff'));
    setListo(true);
  }, [router]);

  // Esqueleto en vez de la palabra "Cargando": el ojo ya sabe donde mirar.
  if (!listo) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-[246px] shrink-0 border-r border-borde bg-[#0C0C0E] lg:block" />
        <div className="flex-1 space-y-4 p-7">
          <div className="h-8 w-52 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-stretch">
      <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col border-r border-borde bg-[#0C0C0E] md:flex lg:w-[246px]">
        <Link href="/panel/recepcion" className="flex items-center gap-2.5 px-4 pb-4 pt-5 lg:px-[18px]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FAD234" strokeWidth={2.2} strokeLinecap="round" className="shrink-0">
            <path d="M3 9v6M21 9v6M6.5 6.5v11M17.5 6.5v11M6.5 12h11" />
          </svg>
          <span className="hidden min-w-0 lg:block">
            <span className="block text-[14.5px] font-black leading-tight tracking-tight text-zinc-100">
              <span className="text-acento">F</span>ORCES <span className="text-acento">GYM</span>
            </span>
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Panel</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-2.5 pt-1.5">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="contents">
              <p className="mx-2 mb-1.5 mt-4 hidden text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-700 lg:block">
                {grupo.titulo}
              </p>
              <div className="my-2 h-px bg-white/[0.06] lg:hidden" />
              {grupo.items.map((item) => {
                const activo = ruta === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.texto}
                    className={`relative flex items-center justify-center gap-[11px] rounded-[10px] px-[11px] py-2.5 text-sm font-semibold transition duration-150 lg:justify-start ${
                      activo
                        ? 'border border-acento/25 bg-acento/[0.11] text-acento'
                        : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {activo && (
                      <span className="absolute -left-2.5 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-[3px] bg-acento" />
                    )}
                    {item.icono}
                    <span className="hidden lg:block">{item.texto}</span>
                    {item.insignia ? (
                      <span className="ml-auto hidden h-[19px] min-w-[19px] items-center justify-center rounded-full bg-porvencer px-1.5 text-[11px] font-extrabold text-black cifra lg:flex">
                        {item.insignia}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-borde px-2.5 pb-4 pt-3">
          <Link
            href="/quiosco"
            className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-acento/25 bg-acento/[0.08] p-2.5 text-[13px] font-bold text-acento transition hover:border-acento/50 hover:bg-acento/[0.16]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
            </svg>
            <span className="hidden lg:block">Modo quiosco</span>
          </Link>

          <div className="mt-3 flex items-center gap-2.5 px-1 py-2">
            <span className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full bg-acento text-xs font-black text-black">
              {iniciales(usuario?.nombre)}
            </span>
            <span className="hidden min-w-0 flex-1 lg:block">
              <span className="block truncate text-[13px] font-semibold text-zinc-100">
                {usuario?.nombre || 'Personal'}
              </span>
              <span className="block text-[11px] capitalize text-zinc-600">
                {usuario?.rol || 'recepcion'}
              </span>
            </span>
            <button
              title="Salir"
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-vencido/15 hover:text-vencido lg:flex"
              onClick={() => {
                cerrarSesion('staff');
                router.replace('/login');
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* En el celular no hay barra lateral: esta franja dice donde estas. */}
        <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-borde bg-fondo/90 px-4 py-3 backdrop-blur md:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FAD234" strokeWidth={2.2} strokeLinecap="round" className="shrink-0" aria-hidden="true">
            <path d="M3 9v6M21 9v6M6.5 6.5v11M17.5 6.5v11M6.5 12h11" />
          </svg>
          <h1 className="min-w-0 flex-1 truncate text-base font-black tracking-tight">{titulo}</h1>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acento text-xs font-black text-black" aria-label={usuario?.nombre || 'Personal'}>
            {iniciales(usuario?.nombre)}
          </span>
        </header>
        <div className="px-4 pb-28 pt-5 sm:px-7 md:pb-8 md:pt-7">
          <h1 className="mb-6 hidden text-2xl font-black tracking-tight md:block">{titulo}</h1>
          {children}
        </div>
      </main>

      {/* Barra inferior en el celular: las pantallas que recepcion usa todo el
          dia (el escaner incluido), y el resto detras de "Mas". */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-[#0C0C0E]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {[GRUPOS[0].items[0], GRUPOS[0].items[1], GRUPOS[0].items[2], GRUPOS[1].items[0]].map((item) => {
            const activo = ruta === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  activo ? 'text-acento' : 'text-zinc-500'
                }`}
              >
                {item.icono}
                {item.texto}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuMovil(true)}
            aria-expanded={menuMovil}
            className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold text-zinc-500"
          >
            <I d="M4 6h16M4 12h16M4 18h16" />
            Mas
          </button>
        </div>
      </nav>

      {menuMovil && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Cerrar menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuMovil(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] animate-subir overflow-y-auto rounded-t-3xl border-t border-borde bg-[#0C0C0E] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            {GRUPOS.map((grupo) => (
              <div key={grupo.titulo} className="mb-4">
                <p className="rotulo mb-2 px-2">{grupo.titulo}</p>
                <div className="grid grid-cols-2 gap-2">
                  {grupo.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-semibold ${
                        ruta === item.href
                          ? 'border-acento/30 bg-acento/10 text-acento'
                          : 'border-borde bg-white/[0.03] text-zinc-300'
                      }`}
                    >
                      {item.icono}
                      {item.texto}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 border-t border-borde pt-4">
              <Link href="/quiosco" className="boton-suave">
                Modo quiosco
              </Link>
              <button
                type="button"
                className="boton-riesgo"
                onClick={() => {
                  cerrarSesion('staff');
                  router.replace('/login');
                }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
