'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Revela una seccion al entrar en pantalla.
 *
 * El contenido se renderiza VISIBLE en el servidor y solo se esconde si el
 * navegador ya ejecuto JavaScript y el bloque todavia esta fuera de la
 * pantalla. Asi, si el JS falla o tarda — o si quien mira es un buscador —
 * la landing se lee completa en vez de quedar en blanco.
 *
 * `once` es deliberado: al volver a subir nada se re-anima, que es lo que hace
 * que una landing se sienta barata.
 */
export function Revelar({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<'estatico' | 'esperando' | 'visible'>('estatico');

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    // Quien pidio menos movimiento no recibe ninguno.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    // Lo que ya se ve al cargar no se anima: animarlo seria esconder algo que
    // el usuario ya tiene delante.
    const caja = nodo.getBoundingClientRect();
    if (caja.top < window.innerHeight - 80) return;

    setEstado('esperando');
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setEstado('visible');
          observador.disconnect();
        }
      },
      { rootMargin: '-80px' },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${estado === 'esperando' ? 'opacity-0' : ''} ${
        estado === 'visible' ? 'animate-subir' : ''
      }`}
      style={estado === 'visible' && delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
