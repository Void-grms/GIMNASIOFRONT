'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';

/**
 * Aforo en vivo: cuantas personas estan entrenando ahora. Sale del mismo conteo
 * de "dentro ahora" de recepcion y solo trae el numero. Si el administrador lo
 * apaga en Ajustes, o el API no responde, simplemente no aparece.
 */
export function AforoEnVivo() {
  const [aforo, setAforo] = useState<any>(null);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      api('/public/aforo')
        .then((a) => vivo && setAforo(a))
        .catch(() => vivo && setAforo(null));
    cargar();
    const t = setInterval(cargar, 60000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  if (!aforo?.visible || aforo.dentro === null) return null;

  const nivel =
    aforo.porcentaje === null || aforo.dentro === 0
      ? null
      : aforo.porcentaje < 40
      ? { texto: 'tranquilo', color: 'text-vigente', barra: 'bg-vigente' }
      : aforo.porcentaje < 75
      ? { texto: 'movido', color: 'text-porvencer', barra: 'bg-porvencer' }
      : { texto: 'lleno', color: 'text-vencido', barra: 'bg-vencido' };

  const texto =
    aforo.dentro === 0
      ? 'Ahora esta tranquilo'
      : aforo.dentro === 1
      ? 'Ahora hay 1 persona entrenando'
      : `Ahora hay ${aforo.dentro} personas entrenando`;

  return (
    <p
      className="inline-flex items-center gap-2 rounded-full border border-borde bg-black/50 px-3.5 py-1.5 text-[13px] font-semibold text-zinc-200 backdrop-blur"
      aria-live="polite"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vigente opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-vigente" />
      </span>
      <span className="cifra">{texto}</span>
      {nivel && (
        <>
          <span className="text-zinc-600">·</span>
          <span className={nivel.color}>{nivel.texto}</span>
          <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-white/10 sm:inline-block" aria-hidden="true">
            <span className={`block h-full ${nivel.barra}`} style={{ width: `${Math.max(6, aforo.porcentaje)}%` }} />
          </span>
        </>
      )}
    </p>
  );
}

const ENLACES = [
  { href: '#planes', texto: 'Planes' },
  { href: '#clases', texto: 'Clases' },
  { href: '#ubicacion', texto: 'Ubicacion y horarios' },
];

/** Menu de la landing en el celular: los enlaces que en pantalla ancha van en la barra. */
export function MenuLanding() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menu"
        aria-expanded={abierto}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-borde text-zinc-200 sm:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Por portal: el header tiene backdrop-blur, y eso encierra a los hijos
          "fixed" dentro de su caja en vez de la pantalla. */}
      {abierto && createPortal(
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Cerrar menu" className="absolute inset-0 bg-black/70" onClick={() => setAbierto(false)} />
          <div className="absolute inset-x-0 top-0 animate-entrar rounded-b-3xl border-b border-borde bg-[#0C0C0E] px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-black tracking-tight">Menu</span>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menu"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav className="grid gap-1">
              {ENLACES.map((e) => (
                <a
                  key={e.href}
                  href={e.href}
                  onClick={() => setAbierto(false)}
                  className="flex min-h-12 items-center rounded-xl px-3 text-lg font-bold text-zinc-200 hover:bg-white/[0.05]"
                >
                  {e.texto}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-borde pt-4">
              <Link href="/portal" className="boton">
                Soy socio
              </Link>
              <Link href="/login" className="boton-suave">
                Personal
              </Link>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
