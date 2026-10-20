import type { ReactNode } from 'react';
export function EncabezadoPortal({ titulo, descripcion, accion }: { titulo: string; descripcion: string; accion?: ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="rotulo mb-2">Forces Gym · Mi portal</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{titulo}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-secundario">{descripcion}</p></div>{accion}</header>;
}

