/**
 * Esqueleto de carga. Sustituye a la palabra "Cargando": el ojo ya sabe donde
 * va a aparecer el contenido, asi que la pantalla no salta cuando llega.
 */
export function Esqueleto({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando</span>
      <div className="h-8 w-52 animate-pulse rounded-lg bg-white/[0.05]" />
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      ))}
    </div>
  );
}
