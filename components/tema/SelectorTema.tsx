'use client';

import { useId } from 'react';
import { usePathname } from 'next/navigation';
import { useTema, type Tema } from './ProveedorTema';

function IconoTema({ tema }: { tema: Tema }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tema === 'claro' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : tema === 'oscuro' ? <path d="M20.7 13.3A9 9 0 0 1 10.7 3.3a9 9 0 1 0 10 10Z" /> : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}
  </svg>;
}

export function SelectorTema({ compacto = false, className = '' }: { compacto?: boolean; className?: string }) {
  const { tema, cambiarTema } = useTema();
  const id = useId();
  if (compacto) return <div className={`selector-tema-compacto ${className}`}>
    <label htmlFor={id}><IconoTema tema={tema} /><span>Apariencia</span></label>
    <select id={id} value={tema} onChange={e => cambiarTema(e.target.value as Tema)}>
      <option value="sistema">Del sistema</option><option value="claro">Clara</option><option value="oscuro">Oscura</option>
    </select>
  </div>;

  return <fieldset className={`selector-tema ${className}`}>
    <legend>Apariencia</legend>
    <div>
      {([{ valor: 'claro', nombre: 'Claro' }, { valor: 'oscuro', nombre: 'Oscuro' }, { valor: 'sistema', nombre: 'Sistema' }] as const).map(opcion => <label key={opcion.valor} data-activo={tema === opcion.valor}>
        <input type="radio" name={id} value={opcion.valor} checked={tema === opcion.valor} onChange={() => cambiarTema(opcion.valor)} />
        <IconoTema tema={opcion.valor} /><span>{opcion.nombre}</span>
      </label>)}
    </div>
    <p>«Sistema» se adapta a la apariencia de tu dispositivo.</p>
  </fieldset>;
}

export function AparienciaGlobal() {
  const ruta = usePathname();
  // El portal incorpora el mismo selector dentro de su navegación.
  if (ruta === '/login' || (ruta?.startsWith('/portal') && ruta !== '/portal/activar' && ruta !== '/portal/bienvenida')) return null;
  return <div className="apariencia-global print:hidden"><SelectorTema compacto /></div>;
}
