import type { ReactNode } from 'react';
export function EncabezadoPortal({ titulo, descripcion, accion }: { titulo: string; descripcion: string; accion?: ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-4 pb-1"><div><p className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-tenue"><span className="h-1.5 w-1.5 rounded-full bg-acentoTexto" aria-hidden="true" />Mi espacio Forces</p><h1 className="text-[2rem] font-extrabold leading-[1.12] tracking-[-.045em] sm:text-[2.5rem]">{titulo}</h1><p className="mt-2.5 max-w-xl text-sm leading-relaxed text-secundario">{descripcion}</p></div>{accion}</header>;
}
