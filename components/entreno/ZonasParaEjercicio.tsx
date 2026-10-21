'use client';

import { IconoCardio, MapaCuerpo, NOMBRE_GRUPO, SECCIONES } from '@/components/MapaCuerpo';

/** Las mismas siluetas y nombres que se usan al organizar el plan semanal. */
export function ZonasParaEjercicio({ onElegir, cantidades }: {
  onElegir: (grupo: string) => void;
  cantidades: Record<string, number>;
}) {
  return <div className="space-y-5">
    {SECCIONES.map(seccion => <section key={seccion.titulo} aria-label={seccion.titulo}>
      <h3 className="rotulo mb-2">{seccion.titulo}</h3>
      <div className={`grid gap-2 ${seccion.zonas.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {seccion.zonas.map(zona => <button key={zona.grupo} type="button" onClick={() => onElegir(zona.grupo)} aria-label={`Elegir zona ${NOMBRE_GRUPO[zona.grupo]}`} className="flex min-w-0 flex-col items-center rounded-xl border border-borde bg-fondo/50 px-2 py-3 text-center transition-colors hover:border-acentoTexto hover:bg-acento/5">
          <MapaCuerpo musculos={zona.musculos} vista={zona.vista} className="h-20 max-w-full" />
          <span className="mt-2 max-w-full break-words text-xs font-bold sm:text-sm">{NOMBRE_GRUPO[zona.grupo]}</span>
          <span className="mt-1 max-w-full break-words text-[10px] text-tenue">{cantidades[zona.grupo] || 0} ejercicios</span>
        </button>)}
      </div>
    </section>)}
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => onElegir('cardio')} aria-label="Elegir zona Cardio" className="flex min-h-20 min-w-0 items-center gap-3 rounded-xl border border-borde bg-fondo/50 px-3 py-3 text-left hover:border-acentoTexto hover:bg-acento/5">
        <span className="shrink-0"><IconoCardio /></span><span className="min-w-0"><strong className="block text-sm">Cardio</strong><span className="mt-1 block text-[10px] text-tenue">{cantidades.cardio || 0} ejercicios</span></span>
      </button>
      <button type="button" onClick={() => onElegir('otros')} aria-label="Elegir zona Otros" className="flex min-h-20 min-w-0 items-center gap-3 rounded-xl border border-borde bg-fondo/50 px-3 py-3 text-left hover:border-acentoTexto hover:bg-acento/5">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="shrink-0 text-acentoTexto" aria-hidden="true"><path d="M3 9v6M21 9v6M6.5 6.5v11M17.5 6.5v11M6.5 12h11" /></svg><span className="min-w-0"><strong className="block text-sm">Otros</strong><span className="mt-1 block text-[10px] text-tenue">{cantidades.otros || 0} ejercicios</span></span>
      </button>
    </div>
  </div>;
}
