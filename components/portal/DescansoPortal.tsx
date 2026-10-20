'use client';
import { useEffect, useState } from 'react';
import { usePortalEntreno } from './PortalEntrenoProvider';

export function DescansoPortal() {
  const { draft, ajustarDescanso } = usePortalEntreno();
  const [ahora, setAhora] = useState(Date.now());
  const fin = draft?.finDescanso;
  useEffect(() => {
    if (!fin) return;
    setAhora(Date.now());
    const timer = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(timer);
  }, [fin]);
  if (!draft || !fin) return null;
  const segundos = Math.max(0, Math.ceil((fin - ahora) / 1000));
  const tiempo = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  return <section aria-label="Descanso entre series" className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-2 right-2 z-40 mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-acento/50 bg-superficie p-3 shadow-xl lg:bottom-5 lg:left-[calc(15rem+1.5rem)] lg:right-6">
    <span className="min-w-[4.25rem] text-center text-3xl font-black tabular-nums text-acentoTexto" aria-label={segundos ? `${segundos} segundos de descanso` : 'Descanso terminado'}>{segundos ? tiempo : 'Listo'}</span>
    <div className="min-w-0 flex-1"><p className="text-xs font-bold">{segundos ? 'Descanso' : 'Siguiente serie'}</p><p className="hidden text-xs text-secundario sm:block">{segundos ? 'Continúa cuando estés listo.' : 'Tu descanso terminó.'}</p></div>
    <button className="min-h-11 rounded-lg border border-borde px-2.5 text-xs font-semibold" onClick={() => ajustarDescanso('sumar')}>+15 s</button>
    <button className="min-h-11 rounded-lg bg-neutral/5 px-2.5 text-xs font-semibold" onClick={() => ajustarDescanso('saltar')}>{segundos ? 'Saltar' : 'Cerrar'}</button>
    <span className="sr-only" role="status">{segundos === 0 ? 'Descanso terminado. Puedes continuar con tu siguiente serie.' : ''}</span>
  </section>;
}

