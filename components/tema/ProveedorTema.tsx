'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CLAVE_TEMA } from './configuracion';

export type Tema = 'claro' | 'oscuro' | 'sistema';
const MEDIA_TEMA = '(prefers-color-scheme: dark)';

function esTema(valor: string | null): valor is Tema {
  return valor === 'claro' || valor === 'oscuro' || valor === 'sistema';
}

function aplicar(tema: Tema) {
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && window.matchMedia(MEDIA_TEMA).matches);
  document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro';
  document.documentElement.dataset.preferenciaTema = tema;
  document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
}

const ContextoTema = createContext<{ tema: Tema; cambiarTema: (tema: Tema) => void }>({ tema: 'sistema', cambiarTema: () => {} });

export function ProveedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>('sistema');
  const cambiarTema = useCallback((nuevo: Tema) => {
    setTema(nuevo);
    aplicar(nuevo);
    try { localStorage.setItem(CLAVE_TEMA, nuevo); } catch { /* La preferencia sigue activa durante esta visita. */ }
  }, []);

  useEffect(() => {
    let guardado: string | null = null;
    try { guardado = localStorage.getItem(CLAVE_TEMA); } catch { /* Navegador con almacenamiento restringido. */ }
    const inicial = esTema(guardado) ? guardado : 'sistema';
    setTema(inicial);
    aplicar(inicial);
    const sincronizar = (evento: StorageEvent) => {
      if (evento.key !== CLAVE_TEMA && evento.key !== null) return;
      const siguiente = esTema(evento.newValue) ? evento.newValue : 'sistema';
      setTema(siguiente);
      aplicar(siguiente);
    };
    window.addEventListener('storage', sincronizar);
    return () => window.removeEventListener('storage', sincronizar);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(MEDIA_TEMA);
    const sincronizarSistema = () => { if (tema === 'sistema') aplicar('sistema'); };
    media.addEventListener('change', sincronizarSistema);
    return () => media.removeEventListener('change', sincronizarSistema);
  }, [tema]);

  return <ContextoTema.Provider value={{ tema, cambiarTema }}>{children}</ContextoTema.Provider>;
}

export function useTema() { return useContext(ContextoTema); }

