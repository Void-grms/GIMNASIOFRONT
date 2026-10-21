'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, sesionActual } from '@/lib/api';

type Operacion = { version: 1; staff: string; creado: string; memberId: string; titulo: string; ruta: string; metodo: 'POST' | 'PATCH'; payload: Record<string, any> & { operationId: string } };
const EVENTO = 'gym.membership.pending';
const CONFIRMACION = 'gym.membership.confirmed.v1';
export const MEMBRESIA_ACTUALIZADA = 'gym.membership.confirmed';
const llave = (staff: string) => `gym.membership.pending.v1.${staff}`;
const seguros = new Set(['VERSION_CAMBIADA', 'VIGENCIA_CAMBIADA', 'COBERTURA_SOLAPADA', 'OFERTA_CAMBIADA', 'SALDO_CAMBIADO', 'LEGAL_CAMBIADO']);
function operador() { try { return sesionActual('staff')?.sub || null; } catch { return null; } }
function leer(staff: string): Operacion | null {
  const texto = localStorage.getItem(llave(staff));
  if (!texto) return null;
  const p = JSON.parse(texto);
  if (p?.version !== 1 || p.staff !== staff || typeof p.memberId !== 'string' || typeof p.titulo !== 'string' ||
      !/^\/memberships(?:\/[\w-]+\/(?:abonos|fechas|congelamientos))?$/.test(p.ruta) ||
      !['POST', 'PATCH'].includes(p.metodo) || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(p.payload?.operationId)) {
    throw new Error('Hay una operación que no se puede recuperar. Revisa su registro con administración antes de continuar desde este navegador.');
  }
  return p;
}
function avisar() { window.dispatchEvent(new Event(EVENTO)); }

/** Una operación guardada antes de enviar; nunca se cambia su contenido al reintentar. */
export function useOperacionMembresia() {
  const [pendiente, setPendiente] = useState<Operacion | null>(null);
  const [bloqueo, setBloqueo] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const enviando = useRef(false);
  const montado = useRef(true);
  const restaurar = useCallback(() => {
    const staff = operador();
    if (!staff) { setPendiente(null); setBloqueo('Inicia sesión con tu cuenta del personal.'); return; }
    try { setPendiente(leer(staff)); setBloqueo(''); }
    catch (e: any) { setBloqueo(e.message || 'No se pudo leer la recuperación de la operación.'); }
  }, []);
  useEffect(() => {
    montado.current = true; restaurar();
    window.addEventListener('storage', restaurar); window.addEventListener(EVENTO, restaurar);
    return () => { montado.current = false; window.removeEventListener('storage', restaurar); window.removeEventListener(EVENTO, restaurar); };
  }, [restaurar]);

  function quitar(p: Operacion) {
    const actual = leer(p.staff);
    if (actual?.payload.operationId === p.payload.operationId) localStorage.removeItem(llave(p.staff));
    avisar();
  }
  async function enviar(p: Operacion) {
    if (operador() !== p.staff) throw new Error('Vuelve a entrar con la cuenta que inició la operación para verificarla.');
    try {
      const r: any = await api(p.ruta, { metodo: p.metodo, cuerpo: p.payload });
      if (!r?.cuenta || (!r.id && !r.membershipId)) throw new Error('No se recibió una confirmación completa.');
      if (operador() !== p.staff) return null;
      try { quitar(p); } catch { throw new Error('La operación está confirmada. Verifica la misma operación para cerrar su recuperación en este navegador.'); }
      if (montado.current) setResultado(r);
      window.dispatchEvent(new CustomEvent(MEMBRESIA_ACTUALIZADA, { detail: { memberId: p.memberId, resultado: r } }));
      try {
        localStorage.setItem(CONFIRMACION, JSON.stringify({ staff: p.staff, memberId: p.memberId, membershipId: r.membershipId || r.id, nonce: crypto.randomUUID() }));
      } catch { /* La operación ya está confirmada; su versión también se comprueba al guardar. */ }
      return r;
    } catch (e: any) {
      const seguro = e instanceof ApiError && ([400, 422].includes(e.status) || (e.status === 409 && seguros.has(e.codigo || '')));
      if (seguro) { try { quitar(p); } catch { /* Se conserva la operación cuando no puede cerrarse con seguridad. */ } }
      if (montado.current) setError(seguro ? e.message : `${e.message || 'No recibimos la confirmación.'} Usa «Verificar operación» antes de registrar otra; se consultará el mismo registro sin duplicarlo.`);
      return null;
    }
  }
  async function ejecutar(datos: { memberId: string; titulo: string; ruta: string; metodo?: 'POST' | 'PATCH'; payload: Record<string, any> }) {
    if (enviando.current) return null;
    enviando.current = true; setOcupado(true); setError(''); setResultado(null);
    try {
      const staff = operador(); if (!staff) throw new Error('Tu sesión terminó. Vuelve a iniciar sesión.');
      if (!navigator.locks) throw new Error('Actualiza tu navegador para poder proteger estas operaciones entre pestañas.');
      const p = await navigator.locks.request(`forcesgym.membership.${staff}`, () => {
        if (operador() !== staff) throw new Error('Tu sesión cambió. Recarga el panel con tu cuenta.');
        const anterior = leer(staff);
        if (anterior) { avisar(); throw new Error('Hay una operación por verificar. Comprueba su resultado en el aviso superior antes de registrar otra.'); }
        const nueva: Operacion = { version: 1, staff, creado: new Date().toISOString(), memberId: datos.memberId, titulo: datos.titulo, ruta: datos.ruta, metodo: datos.metodo || 'POST', payload: { ...datos.payload, operationId: crypto.randomUUID() } };
        localStorage.setItem(llave(staff), JSON.stringify(nueva));
        if (leer(staff)?.payload.operationId !== nueva.payload.operationId) throw new Error('No pudimos guardar la recuperación. No se envió la operación.');
        avisar(); return nueva;
      });
      return await enviar(p);
    } catch (e: any) { if (montado.current) setError(e.message || 'No se envió la operación. Comprueba el almacenamiento de este navegador.'); return null; }
    finally { enviando.current = false; if (montado.current) { setOcupado(false); restaurar(); } }
  }
  async function verificar() {
    if (enviando.current) return;
    enviando.current = true; setOcupado(true); setError(''); setResultado(null);
    try {
      const staff = operador(); if (!staff) throw new Error('Inicia sesión para verificar la operación.');
      const p = leer(staff); if (!p) { restaurar(); return; }
      await enviar(p);
    } catch (e: any) { if (montado.current) setError(e.message); }
    finally { enviando.current = false; if (montado.current) { setOcupado(false); restaurar(); } }
  }
  return { pendiente, bloqueo, error, ocupado, resultado, ejecutar, verificar };
}

/** Visible en cualquier página del panel, también después de recargar. */
export function RecuperacionMembresia() {
  const op = useOperacionMembresia();
  useEffect(() => {
    const actualizarOtraPestana = (e: StorageEvent) => {
      if (e.key !== CONFIRMACION || !e.newValue) return;
      try {
        const d = JSON.parse(e.newValue);
        if (d.staff !== operador() || typeof d.memberId !== 'string' || typeof d.membershipId !== 'string') return;
        window.dispatchEvent(new CustomEvent(MEMBRESIA_ACTUALIZADA, { detail: { memberId: d.memberId, resultado: { membershipId: d.membershipId }, otraPestana: true } }));
      } catch { /* Un evento incompleto no puede reemplazar una cuenta consultada. */ }
    };
    window.addEventListener('storage', actualizarOtraPestana);
    return () => window.removeEventListener('storage', actualizarOtraPestana);
  }, []);
  const [ocultarConfirmacion, setOcultarConfirmacion] = useState(false);
  useEffect(() => { if (op.pendiente) setOcultarConfirmacion(false); }, [op.pendiente]);
  if (!op.pendiente && !op.bloqueo && (!op.resultado || ocultarConfirmacion) && !op.error) return null;
  return <section className="mb-5 min-w-0 space-y-3 rounded-2xl border border-porvencer/40 bg-superficie p-4 text-sm" aria-label="Recuperación de operación de membresía">
    {op.pendiente && <><p className="font-bold">Operación por verificar</p><p className="break-words text-secundario">{op.pendiente.titulo}. Puede que ya se haya registrado. Verifica el resultado antes de realizar otra operación.</p><div className="flex flex-wrap gap-3"><button type="button" className="boton" disabled={op.ocupado || !!op.bloqueo} onClick={op.verificar}>{op.ocupado ? 'Verificando…' : 'Verificar operación'}</button><Link className="boton-suave" href={`/panel/socios/${op.pendiente.memberId}`}>Ver ficha del cliente</Link></div></>}
    {op.bloqueo && <p role="alert" className="text-vencido">{op.bloqueo}</p>}
    {op.error && <p role="alert" className="text-vencido">{op.error}</p>}
    {op.resultado && !op.pendiente && !ocultarConfirmacion && <><p role="status" className="text-vigente">Operación verificada. El registro está confirmado y la ficha se ha actualizado.</p>{op.resultado.errorComprobante && <p role="alert" className="text-porvencer">El pago quedó registrado, pero el comprobante no pudo generarse: {op.resultado.errorComprobante}. No vuelvas a cobrarlo.</p>}{op.resultado.comprobante?.id && <Link className="inline-flex min-h-11 items-center text-acentoTexto underline" target="_blank" rel="noopener noreferrer" href={`/panel/comprobantes/${op.resultado.comprobante.id}`}>Ver comprobante recuperado</Link>}<button type="button" className="ml-3 min-h-11 text-secundario underline" onClick={() => setOcultarConfirmacion(true)}>Cerrar aviso</button></>}
  </section>;
}
