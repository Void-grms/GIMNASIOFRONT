'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const I = ({ d }: { d: string }) => (
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const PESTANAS = [
  { href: '/portal/mi', texto: 'Credencial', icono: <I d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM18 18h2v2h-2z" /> },
  { href: '/portal/progreso', texto: 'Entrenar', icono: <I d="M3 9v6M21 9v6M6.5 6.5v11M17.5 6.5v11M6.5 12h11" /> },
  { href: '/portal/ranking', texto: 'Retos', icono: <I d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /> },
  { href: '/portal/tienda', texto: 'Tienda', icono: <I d="M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0" /> },
  { href: '/portal/perfil', texto: 'Perfil', icono: <I d="M12 4.5a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6zM4.5 20.5a7.5 7.5 0 0 1 15 0" /> },
];

/**
 * Portal del socio: barra inferior fija, como una app. En la pantalla de
 * ingreso (/portal) no aparece, porque todavia no hay sesion.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const conBarra = ruta !== '/portal';

  if (!conBarra) return <>{children}</>;

  return (
    <div className="min-h-screen pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
      {children}
      <nav
        aria-label="Secciones del portal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-[#0C0C0E]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {PESTANAS.map((p) => {
            const activa = ruta === p.href || ruta.startsWith(p.href + '/');
            return (
              <Link
                key={p.href}
                href={p.href}
                aria-current={activa ? 'page' : undefined}
                className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                  activa ? 'text-acento' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p.icono}
                {p.texto}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
