'use client';

import { useEffect, useState } from 'react';

const OPCIONES = [60, 90, 120, 180];

/**
 * Temporizador de descanso entre series. Arranca solo al guardar una serie
 * (cuando cambia `inicio`) y vibra al terminar. Recuerda la duracion elegida.
 */
export function Descanso({ inicio }: { inicio: number | null }) {
  const [duracion, setDuracion] = useState(90);
  const [fin, setFin] = useState<number | null>(null);
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    try {
      const guardada = Number(localStorage.getItem('gym.descanso'));
      if (OPCIONES.includes(guardada)) setDuracion(guardada);
    } catch {
      /* sin almacenamiento: 90 s */
    }
  }, []);

  useEffect(() => {
    if (inicio) setFin(inicio + duracion * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio]);

  useEffect(() => {
    if (!fin) return;
    const t = setInterval(() => {
      const n = Date.now();
      setAhora(n);
      if (n >= fin) {
        navigator.vibrate?.([200, 100, 200]);
        setFin(null);
      }
    }, 250);
    return () => clearInterval(t);
  }, [fin]);

  function elegir(s: number) {
    setDuracion(s);
    try {
      localStorage.setItem('gym.descanso', String(s));
    } catch {
      /* nada */
    }
    if (fin) setFin(Date.now() + s * 1000);
  }

  const restante = fin ? Math.max(0, Math.ceil((fin - ahora) / 1000)) : 0;
  const mmss = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-borde bg-black/30 px-3 py-2">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={fin ? 'text-acento' : 'text-zinc-500'} aria-hidden="true">
        <path d="M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2.5M9.5 2h5" />
      </svg>
      {fin ? (
        <>
          <span className="text-lg font-black text-acento cifra" aria-live="polite">{mmss}</span>
          <span className="text-xs text-zinc-500">descanso</span>
          <button type="button" className="ml-auto text-xs text-zinc-400 hover:text-white" onClick={() => setFin(fin + 15000)}>
            +15 s
          </button>
          <button type="button" className="text-xs text-zinc-400 hover:text-white" onClick={() => setFin(null)}>
            Saltar
          </button>
        </>
      ) : (
        <>
          <span className="text-xs text-zinc-500">Descanso</span>
          <div className="ml-auto flex gap-1">
            {OPCIONES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => elegir(s)}
                className={`rounded-md px-2 py-0.5 text-xs font-semibold cifra ${
                  duracion === s ? 'bg-acento/15 text-acento' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {s < 120 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
            <button type="button" className="ml-1 rounded-md px-2 py-0.5 text-xs font-semibold text-zinc-300 hover:text-white" onClick={() => setFin(Date.now() + duracion * 1000)}>
              ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
}
