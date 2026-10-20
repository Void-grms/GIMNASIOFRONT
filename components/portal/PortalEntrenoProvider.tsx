'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { api, ApiError, sesionActual } from '@/lib/api';

export type SerieBorrador = {
  operationId: string; a: string; b: string; estado: 'pendiente' | 'guardada' | 'error' | 'editando';
  serverId?: string; error?: string; borrarPendiente?: boolean; enviado?: { a: string; b: string }; editada?: boolean;
};
export type EjercicioBorrador = { exerciseId: string; nombre: string; grupo: string; objetivo?: string; series: SerieBorrador[] };
export type SesionBorrador = {
  version: 1; socio: string; operationId: string; serverId: string; titulo: string; fecha: string;
  startedAt: string; elegido: string; ejercicios: EjercicioBorrador[]; descanso: number; finDescanso: number | null;
};
type DatosPortal = { panel: any; rutina: any; plan: any[]; ejercicios: any[]; recientes: any[]; plantillas: any[]; historial: any[] };
type Resumen = { titulo: string; series: number; ejercicios: number; duracionSegundos: number };
type Contexto = {
  datos: DatosPortal; cargando: boolean; error: string; draft: SesionBorrador | null; listo: boolean; ocupado: boolean;
  almacenamiento: boolean; resumen: Resumen | null; aviso: string; recargar: () => Promise<void>;
  iniciar: (titulo: string, items?: any[]) => Promise<boolean>; agregar: (e: any, objetivo?: any) => void;
  seleccionar: (id: string) => void; cambiarSerie: (id: string, operacion: string, campo: 'a' | 'b', valor: string) => void;
  agregarSerie: (id: string) => void; editarSerie: (id: string, operacion: string) => void;
  rellenarUltima: (id: string, series: any[]) => void;
  guardarSerie: (id: string, operacion: string) => Promise<void>; quitarSerie: (id: string, operacion: string) => Promise<void>;
  finalizar: () => Promise<boolean>; descanso: (segundos: number) => void; ajustarDescanso: (accion: 'iniciar' | 'saltar' | 'sumar') => void;
};
const VACIO: DatosPortal = { panel: null, rutina: null, plan: [], ejercicios: [], recientes: [], plantillas: [], historial: [] };
const ContextoEntreno = createContext<Contexto | null>(null);
const llave = (socio: string) => `gym.portal.entreno.v1.${socio}`;
const uuid = () => crypto.randomUUID();
const nuevaSerie = (a = '', b = ''): SerieBorrador => ({ operationId: uuid(), a, b, estado: 'pendiente' });

function leerBorrador(socio: string): SesionBorrador | null {
  const raw = localStorage.getItem(llave(socio));
  if (!raw) return null;
  const d = JSON.parse(raw);
  if (d?.version !== 1 || d.socio !== socio || typeof d.serverId !== 'string' || !Array.isArray(d.ejercicios)) return null;
  if (!d.ejercicios.every((e: any) => typeof e?.exerciseId === 'string' && typeof e.nombre === 'string' && typeof e.grupo === 'string' && Array.isArray(e.series) && e.series.every((s: any) => typeof s?.operationId === 'string' && typeof s.a === 'string' && typeof s.b === 'string' && ['pendiente', 'guardada', 'error', 'editando'].includes(s.estado)))) return null;
  return d;
}
function desdeServidor(s: any, socio: string): SesionBorrador {
  const ejercicios: EjercicioBorrador[] = [];
  for (const row of s.series ?? []) {
    let e = ejercicios.find((x) => x.exerciseId === row.exerciseId);
    if (!e) { e = { exerciseId: row.exerciseId, nombre: row.ejercicio, grupo: row.grupo, series: [] }; ejercicios.push(e); }
    e.series.push({ operationId: uuid(), serverId: row.id, estado: 'guardada', a: String(row.tipo === 'cardio' ? row.duracionMinutos ?? row.repeticiones : row.repeticiones), b: String(row.tipo === 'cardio' ? row.nivel ?? 0 : row.pesoKg) });
  }
  return { version: 1, socio, operationId: uuid(), serverId: s.id, titulo: s.titulo, fecha: s.fecha, startedAt: s.startedAt, elegido: ejercicios[0]?.exerciseId ?? '', ejercicios, descanso: 90, finDescanso: null };
}

export function PortalEntrenoProvider({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const [socio, setSocio] = useState<string | null>(null);
  const identidad = useRef<string | null>(null);
  const [datos, setDatos] = useState<DatosPortal>(VACIO);
  const [draft, setDraft] = useState<SesionBorrador | null>(null);
  const actual = useRef<SesionBorrador | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [almacenamiento, setAlmacenamiento] = useState(true);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const operaciones = useRef(new Set<string>());

  const esPropio = useCallback((owner = identidad.current) => !!owner && identidad.current === owner && sesionActual('socio')?.sub === owner, []);
  const persistir = useCallback((d: SesionBorrador | null) => {
    if (!esPropio(d?.socio ?? identidad.current)) return;
    actual.current = d;
    setDraft(d);
    try {
      if (d) localStorage.setItem(llave(identidad.current!), JSON.stringify(d));
      else localStorage.removeItem(llave(identidad.current!));
      setAlmacenamiento(true);
    } catch { setAlmacenamiento(false); }
  }, [esPropio]);
  const modificar = useCallback((fn: (d: SesionBorrador) => SesionBorrador) => {
    if (esPropio(actual.current?.socio) && actual.current) persistir(fn(actual.current));
  }, [esPropio, persistir]);

  useEffect(() => {
    const comprobar = () => {
      const id = sesionActual('socio')?.sub ?? null;
      if (identidad.current === id) return;
      identidad.current = id; actual.current = null; setDraft(null); setDatos(VACIO); setResumen(null); setError(''); setAviso(''); setOcupado(false); setListo(false); setSocio(id);
    };
    comprobar();
    window.addEventListener('focus', comprobar);
    const storage = (e: StorageEvent) => {
      comprobar();
      if (identidad.current && e.key === llave(identidad.current)) {
        try { const d = leerBorrador(identidad.current); actual.current = d; setDraft(d); } catch { setAlmacenamiento(false); }
      }
    };
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('focus', comprobar); window.removeEventListener('storage', storage); };
  }, [ruta]);

  const recargar = useCallback(async () => {
    if (!socio || !esPropio(socio) || sesionActual('socio')?.debeCambiarPin) return;
    const respuestas = await Promise.allSettled([
      api('/portal/me', { sesion: 'socio' }), api('/portal/routine', { sesion: 'socio' }),
      api('/portal/week-plan', { sesion: 'socio' }), api('/portal/exercises', { sesion: 'socio' }),
      api('/portal/my-exercises', { sesion: 'socio' }), api('/portal/templates', { sesion: 'socio' }),
      api('/portal/workouts', { sesion: 'socio' }),
    ]);
    if (!esPropio(socio)) return;
    const claves: (keyof DatosPortal)[] = ['panel', 'rutina', 'plan', 'ejercicios', 'recientes', 'plantillas', 'historial'];
    setDatos((anterior) => {
      const nuevo = { ...anterior };
      respuestas.forEach((r, i) => { if (r.status === 'fulfilled') (nuevo[claves[i]] as any) = r.value; });
      return nuevo;
    });
    const fallo = respuestas.find((r) => r.status === 'rejected');
    setError(fallo?.status === 'rejected' ? fallo.reason?.message || 'No se pudieron actualizar todos los datos. Reintenta.' : '');
    setCargando(false);
  }, [socio, esPropio]);

  useEffect(() => {
    if (!socio || !esPropio(socio) || sesionActual('socio')?.debeCambiarPin) { setCargando(false); return; }
    let cancelado = false;
    try { const d = leerBorrador(socio); actual.current = d; setDraft(d); } catch { setAlmacenamiento(false); }
    setListo(true);
    recargar().catch((e) => { if (!cancelado && esPropio(socio)) { setError(e.message); setCargando(false); } });
    api('/portal/workout-sessions/active', { sesion: 'socio' }).then(async (s) => {
      if (cancelado || !esPropio(socio)) return;
      if (s) {
        if (actual.current?.serverId !== s.id) persistir(desdeServidor(s, socio));
      } else if (actual.current) {
        // A finalized session on another tab/device is confirmed before dropping its local copy.
        const vieja: any = await api(`/portal/workout-sessions/${actual.current.serverId}`, { sesion: 'socio' });
        if (!cancelado && esPropio(socio) && vieja.endedAt) { persistir(null); setAviso('Esta sesión ya fue finalizada. Las series guardadas están en Progreso.'); }
      }
    }).catch(() => { /* El borrador local permanece disponible; cada envío vuelve a validar la sesión. */ });
    return () => { cancelado = true; };
  }, [socio, recargar, persistir, esPropio]);

  const agregar = useCallback((e: any, objetivo?: any) => {
    const id = e.exerciseId ?? e.id;
    modificar((d) => {
      if (d.ejercicios.some((x) => x.exerciseId === id)) return { ...d, elegido: id };
      const cardio = e.grupo === 'cardio';
      const cantidad = Math.max(1, Math.min(10, Number(objetivo?.series ?? 3)));
      const reps = objetivo?.repeticiones ? String(parseInt(objetivo.repeticiones, 10) || '') : '';
      return { ...d, elegido: id, ejercicios: [...d.ejercicios, { exerciseId: id, nombre: e.nombre, grupo: e.grupo, objetivo: objetivo?.repeticiones ? `${cantidad} × ${objetivo.repeticiones}${cardio ? ' min' : ' reps'}` : undefined, series: Array.from({ length: cantidad }, () => nuevaSerie(reps, cardio ? '0' : '')) }] };
    });
  }, [modificar]);

  const rellenarUltima = useCallback((id: string, anteriores: any[]) => {
    if (!anteriores.length) return;
    modificar(d => ({ ...d, ejercicios: d.ejercicios.map(e => e.exerciseId !== id ? e : {
      ...e, series: e.series.map((s, i) => {
        if (s.estado !== 'pendiente' || s.enviado || s.editada) return s;
        const previa = anteriores[i] ?? anteriores.at(-1);
        const cardio = e.grupo === 'cardio';
        return { ...s, a: s.a || String(cardio ? previa.duracionMinutos ?? previa.repeticiones : previa.repeticiones),
          b: s.b || String(cardio ? previa.nivel ?? previa.pesoKg ?? 0 : previa.pesoKg) };
      }),
    }) }));
  }, [modificar]);

  const iniciar = useCallback(async (titulo: string, items: any[] = []) => {
    const owner = identidad.current;
    if (!esPropio(owner) || ocupado) return false;
    if (actual.current) return true;
    setOcupado(true); setError('');
    try {
      // Fixed per-attempt start ID survives a lost response through server-side active-session uniqueness.
      const s: any = await api('/portal/workout-sessions', { metodo: 'POST', sesion: 'socio', cuerpo: { operationId: uuid(), titulo } });
      if (!esPropio(owner)) return false;
      persistir(desdeServidor(s, owner!)); setResumen(null);
      for (const item of items) {
        const e = datos.ejercicios.find((x) => x.id === (item.exerciseId ?? item.id));
        if (e) agregar(e, item);
      }
      return true;
    } catch (e: any) { if (esPropio(owner)) setError(e.message); return false; }
    finally { if (esPropio(owner)) setOcupado(false); }
  }, [esPropio, ocupado, persistir, datos.ejercicios, agregar]);

  function cambiarSerie(id: string, operacion: string, campo: 'a' | 'b', valor: string) {
    modificar((d) => ({ ...d, ejercicios: d.ejercicios.map((e) => e.exerciseId !== id ? e : { ...e, series: e.series.map((s) => s.operationId !== operacion || s.estado === 'guardada' || s.enviado ? s : { ...s, [campo]: valor, editada: true, error: undefined }) }) }));
  }
  function actualizarSerie(id: string, operacion: string, cambio: Partial<SerieBorrador>) {
    modificar((d) => ({ ...d, ejercicios: d.ejercicios.map((e) => e.exerciseId !== id ? e : { ...e, series: e.series.map((s) => s.operationId !== operacion ? s : { ...s, ...cambio }) }) }));
  }
  async function guardarSerie(id: string, operacion: string) {
    if (!esPropio() || operaciones.current.has(operacion)) return;
    const d = actual.current; const e = d?.ejercicios.find((x) => x.exerciseId === id); const s = e?.series.find((x) => x.operationId === operacion);
    if (!d || !e || !s || s.estado === 'guardada') return;
    const owner = d.socio;
    const enviado = s.enviado ?? { a: s.a, b: s.b };
    const a = Number(enviado.a.replace(',', '.')); const b = Number(enviado.b.replace(',', '.'));
    const cardio = e.grupo === 'cardio';
    if (!s.a.trim() || !s.b.trim() || !Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b < 0 || (cardio ? a > 360 || b > 100 : !Number.isInteger(a) || a > 200 || b > 500)) {
      actualizarSerie(id, operacion, { error: cardio ? 'Indica los minutos y un nivel válido (puede ser 0).' : 'Indica repeticiones enteras y el peso; usa 0 si es peso corporal.' }); return;
    }
    actualizarSerie(id, operacion, { enviado, estado: 'error', error: undefined });
    operaciones.current.add(operacion); setOcupado(true);
    const cuerpo = cardio ? { duracionMinutos: a, nivel: b } : { repeticiones: a, pesoKg: b };
    try {
      const r: any = await api(s.serverId ? `/portal/workouts/${s.serverId}` : '/portal/workouts', { metodo: s.serverId ? 'PATCH' : 'POST', sesion: 'socio', cuerpo: s.serverId ? cuerpo : { operationId: s.operationId, sessionId: d.serverId, exerciseId: id, series: [cuerpo] } });
      if (!esPropio(owner)) return;
      if (r.deletedAt || r.sets?.[0]?.deletedAt) {
        modificar((actual) => ({ ...actual, ejercicios: actual.ejercicios.map((x) => x.exerciseId !== id ? x : { ...x, series: x.series.filter((row) => row.operationId !== operacion) }) }));
        setAviso('Esta serie ya fue deshecha. Puedes añadir una nueva si lo necesitas.'); return;
      }
      const serverId = s.serverId ?? r.sets?.[0]?.id;
      if (!serverId) throw new Error('No se recibió la confirmación de guardado. Reintenta esta misma serie.');
      actualizarSerie(id, operacion, { estado: 'guardada', serverId, error: undefined, enviado: undefined });
      modificar((actual) => ({ ...actual, finDescanso: Date.now() + actual.descanso * 1000 }));
      setAviso('Serie guardada en tu cuenta.');
    } catch (err: any) {
      if (esPropio(owner) && err instanceof ApiError && err.status === 400) {
        actualizarSerie(id, operacion, { estado: 'pendiente', enviado: undefined, error: err.message });
        return;
      }
      if (esPropio(owner)) actualizarSerie(id, operacion, { estado: 'error', error: err instanceof ApiError && err.status === 401 ? 'Tu acceso venció. Inicia sesión con tu cuenta y reintenta; el borrador sigue en este dispositivo.' : `${err.message}. Reintenta para confirmar la serie antes de corregirla o quitarla.` });
    } finally { operaciones.current.delete(operacion); if (esPropio(owner)) setOcupado(false); }
  }
  async function quitarSerie(id: string, operacion: string) {
    if (!esPropio() || operaciones.current.has(operacion)) return;
    const owner = actual.current?.socio;
    const s = actual.current?.ejercicios.find((x) => x.exerciseId === id)?.series.find((x) => x.operationId === operacion);
    if (!s) return;
    if (s.enviado && !s.serverId) { actualizarSerie(id, operacion, { error: 'Reintenta guardar para confirmar el resultado. Después podrás deshacer esta serie.' }); return; }
    if (s.serverId) {
      operaciones.current.add(operacion); setOcupado(true);
      try { await api(`/portal/workouts/${s.serverId}`, { metodo: 'DELETE', sesion: 'socio' }); }
      catch (e: any) { if (esPropio(owner)) actualizarSerie(id, operacion, { error: `${e.message}. Reintenta deshacer.`, borrarPendiente: true }); return; }
      finally { operaciones.current.delete(operacion); if (esPropio(owner)) setOcupado(false); }
    }
    if (!esPropio(owner)) return;
    modificar((d) => ({ ...d, ejercicios: d.ejercicios.map((e) => e.exerciseId !== id ? e : { ...e, series: e.series.length === 1 ? [nuevaSerie(s.a, s.b)] : e.series.filter((x) => x.operationId !== operacion) }) }));
  }
  async function finalizar() {
    const d = actual.current;
    if (!d || !esPropio(d.socio) || ocupado) return false;
    if (d.ejercicios.some((e) => e.series.some((s) => s.estado === 'error' || s.estado === 'editando' || s.borrarPendiente))) { setError('Resuelve las series pendientes de confirmación antes de finalizar.'); return false; }
    setOcupado(true); setError('');
    try {
      const s: any = await api(`/portal/workout-sessions/${d.serverId}/finish`, { metodo: 'POST', sesion: 'socio' });
      if (!esPropio(d.socio)) return false;
      setResumen({ titulo: s.titulo, series: s.series.length, ejercicios: new Set(s.series.map((x: any) => x.exerciseId)).size, duracionSegundos: s.duracionSegundos });
      persistir(null); recargar().catch(() => {}); return true;
    } catch (e: any) { if (esPropio(d.socio)) setError(`${e.message}. Conservamos tu sesión para que puedas reintentar.`); return false; }
    finally { if (esPropio(d.socio)) setOcupado(false); }
  }
  const visible = !!socio && socio === sesionActual('socio')?.sub;
  return <ContextoEntreno.Provider value={{ datos: visible ? datos : VACIO, cargando: !visible || cargando, error: visible ? error : '', draft: visible ? draft : null, listo: visible && listo, ocupado, almacenamiento, resumen: visible ? resumen : null, aviso: visible ? aviso : '', recargar, iniciar, agregar, rellenarUltima, seleccionar: (id) => modificar((d) => ({ ...d, elegido: id })), cambiarSerie, agregarSerie: (id) => modificar((d) => ({ ...d, ejercicios: d.ejercicios.map((e) => e.exerciseId !== id || e.series.length >= 30 ? e : { ...e, series: [...e.series, nuevaSerie(e.series.at(-1)?.a, e.series.at(-1)?.b)] }) })), editarSerie: (id, operacion) => actualizarSerie(id, operacion, { estado: 'editando', error: undefined }), guardarSerie, quitarSerie, finalizar, descanso: (segundos) => modificar((d) => ({ ...d, descanso: segundos })), ajustarDescanso: (accion) => modificar((d) => ({ ...d, finDescanso: accion === 'saltar' ? null : accion === 'sumar' ? (d.finDescanso ?? Date.now()) + 15000 : Date.now() + d.descanso * 1000 })) }}>{children}</ContextoEntreno.Provider>;
}

export function usePortalEntreno() { const contexto = useContext(ContextoEntreno); if (!contexto) throw new Error('PortalEntrenoProvider requerido'); return contexto; }

