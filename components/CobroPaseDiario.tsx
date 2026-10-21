'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { api, ApiError, fechaCorta, sesionActual, soles } from '@/lib/api';
import styles from './CobroPaseDiario.module.css';

type Metodo = 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'transferencia';
type OfertaPase = {
  disponible: boolean; motivo?: string;
  plan?: { id: string; nombre: string; precio: number; versionOferta: string; duracionDias: number; limiteAsistencias: number | null };
  inicio?: string; vence?: string;
  legal?: { terminosVersion: string; terminosTexto: string; terminosHuella: string; consentimientoVersion: string; consentimientoTexto: string; consentimientoHuella: string };
};
type Socio = { id: string; nombreCompleto: string; dni?: string | null; codigoERP?: string | null; plan?: string | null; vence?: string | null };
type SolicitudPase = {
  operationId: string; planId: string; versionOferta: string; montoEsperado: number; metodo: Metodo;
  memberId?: string; visitante?: { nombre: string; dni?: string };
  aceptaTerminos: true; terminosVersion: string; terminosHuella: string;
  consentimiento: true; consentimientoVersion: string; consentimientoHuella: string;
};
type Pendiente = { version: 1; staff: string; creado: string; persona: string; payload: SolicitudPase };
export type ResultadoPaseDiario = {
  paymentId: string; membershipId: string; memberId: string; inicio: string; vence: string; monto: number;
  comprobante: any; ingreso: { resultado: string; tipo: string; socio: any; checkInId: string }; repetida: boolean;
};
type ErrorPase = ApiError & { codigo?: string; datos?: Record<string, any> };
const METODOS: { valor: Metodo; nombre: string }[] = [
  { valor: 'efectivo', nombre: 'Efectivo' }, { valor: 'yape', nombre: 'Yape' }, { valor: 'plin', nombre: 'Plin' },
  { valor: 'tarjeta', nombre: 'Tarjeta en recepción' }, { valor: 'transferencia', nombre: 'Transferencia' },
];
const RECHAZOS_SEGUROS = new Set(['OFERTA_CAMBIADA', 'LEGAL_CAMBIADO', 'DNI_EXISTENTE', 'COBERTURA_VIGENTE', 'INGRESO_ABIERTO']);
const llave = (staff: string) => `gym.daily-pass.pending.v1.${staff}`;
function staffActual() { try { return sesionActual('staff')?.sub || null; } catch { return null; } }
function leerPendiente(staff: string): Pendiente | null {
  const raw = localStorage.getItem(llave(staff));
  if (!raw) return null;
  const p = JSON.parse(raw) as Pendiente;
  const body = p?.payload;
  if (p.version !== 1 || p.staff !== staff || !body || typeof p.persona !== 'string' ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(body.operationId) ||
      typeof body.planId !== 'string' || !Number.isFinite(body.montoEsperado) || !METODOS.some(m => m.valor === body.metodo) ||
      (!body.memberId && !body.visitante?.nombre) || body.aceptaTerminos !== true || body.consentimiento !== true ||
      typeof body.terminosVersion !== 'string' || typeof body.terminosHuella !== 'string' ||
      typeof body.consentimientoVersion !== 'string' || typeof body.consentimientoHuella !== 'string') {
    throw new Error('El cobro pendiente no se puede recuperar. Revisa el cobro con administración antes de registrar otro pase en este navegador.');
  }
  return p;
}

/** Cobro de un pase e ingreso en una sola operación recuperable por el mismo operador. */
export function CobroPaseDiario({ onCobrado }: { onCobrado: (resultado: ResultadoPaseDiario) => void }) {
  const [staff, setStaff] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [oferta, setOferta] = useState<OfertaPase | null>(null);
  const [cargandoOferta, setCargandoOferta] = useState(false);
  const [errorOferta, setErrorOferta] = useState('');
  const [modo, setModo] = useState<'socio' | 'visitante'>('socio');
  const [q, setQ] = useState('');
  const [socios, setSocios] = useState<Socio[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaHecha, setBusquedaHecha] = useState(false);
  const [socio, setSocio] = useState<Socio | null>(null);
  const [coincidencia, setCoincidencia] = useState<Socio | null>(null);
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [metodo, setMetodo] = useState<Metodo>('efectivo');
  const [terminos, setTerminos] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [bloqueo, setBloqueo] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPaseDiario | null>(null);
  const enviando = useRef(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const apertura = useRef<HTMLElement | null>(null);
  const secuenciaBusqueda = useRef(0);
  const montado = useRef(true);
  const callback = useRef(onCobrado);
  callback.current = onCobrado;

  const cargarOferta = useCallback(async () => {
    setCargandoOferta(true); setErrorOferta('');
    try { const r = await api<OfertaPase>('/memberships/daily-pass/offer'); if (montado.current) setOferta(r); }
    catch (e: any) { if (montado.current) { setOferta(null); setErrorOferta(e.message || 'No pudimos consultar el pase.'); } }
    finally { if (montado.current) setCargandoOferta(false); }
  }, []);

  useEffect(() => {
    montado.current = true;
    const restaurar = () => {
      const actual = staffActual(); setStaff(actual);
      if (!actual) { setPendiente(null); setBloqueo('Inicia sesión con tu cuenta de personal para registrar un pase.'); return; }
      try { setPendiente(leerPendiente(actual)); setBloqueo(''); }
      catch (e: any) { setBloqueo(e.message || 'No se puede recuperar el cobro pendiente en este navegador.'); }
    };
    restaurar(); cargarOferta();
    const storage = (e: StorageEvent) => { const actual = staffActual(); if (e.key === null || e.key === 'gym.token.staff' || (actual && e.key === llave(actual))) restaurar(); };
    window.addEventListener('storage', storage);
    return () => { montado.current = false; secuenciaBusqueda.current++; window.removeEventListener('storage', storage); };
  }, [cargarOferta]);

  useEffect(() => {
    if (!abierto) return;
    const modal = dialogo.current; if (modal && !modal.open) modal.showModal();
    const anterior = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { modal?.close(); document.body.style.overflow = anterior; apertura.current?.focus({ preventScroll: true }); };
  }, [abierto]);

  async function buscar(texto = q) {
    const busqueda = texto.trim();
    const turno = ++secuenciaBusqueda.current;
    if (!busqueda) { setSocios([]); setBusquedaHecha(false); return; }
    const operador = staffActual(); if (!operador || operador !== staff) return;
    setBuscando(true); setError('');
    try {
      const r = await api<Socio[]>(`/members?q=${encodeURIComponent(busqueda)}`);
      if (montado.current && turno === secuenciaBusqueda.current && staffActual() === operador) { setSocios(r); setBusquedaHecha(true); }
    } catch (e: any) { if (montado.current && turno === secuenciaBusqueda.current) { setError(e.message); setSocios([]); } }
    finally { if (montado.current && turno === secuenciaBusqueda.current) setBuscando(false); }
  }

  function abrir() {
    apertura.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAbierto(true);
    if (!pendiente && !resultado) cargarOferta();
  }
  function elegirSocio(s: Socio) { setSocio(s); setModo('socio'); setCoincidencia(null); setError(''); setSocios([]); }
  function nuevoCobro() {
    if (pendiente || enviando.current) return;
    setResultado(null); setSocio(null); setSocios([]); setNombre(''); setDni(''); setQ(''); setBusquedaHecha(false);
    setTerminos(false); setConsentimiento(false); setMetodo('efectivo'); setModo('socio'); setError(''); cargarOferta();
  }

  function quitarPendiente(p: Pendiente) {
    try {
      const actual = leerPendiente(p.staff);
      if (actual && actual.payload.operationId !== p.payload.operationId) return actual;
      if (actual?.payload.operationId === p.payload.operationId) localStorage.removeItem(llave(p.staff));
      return null;
    } catch { return p; }
  }

  async function enviar(p: Pendiente) {
    if (staffActual() !== p.staff) { setError('Vuelve a iniciar sesión con la cuenta que registró este cobro para verificarlo.'); return; }
    setError('');
    try {
      const r = await api<ResultadoPaseDiario>('/memberships/daily-pass', { metodo: 'POST', cuerpo: p.payload });
      if (!r?.paymentId || !r?.membershipId || !r?.ingreso?.checkInId || !r?.comprobante?.id) throw new Error('No se recibió la confirmación completa del cobro.');
      if (staffActual() !== p.staff) return;
      const siguiente = quitarPendiente(p);
      if (montado.current) {
        setResultado(siguiente ? null : r); setPendiente(siguiente);
        if (siguiente) setError(siguiente.payload.operationId === p.payload.operationId
          ? 'El cobro está confirmado. No pudimos cerrar su recuperación en este navegador; verifica este mismo cobro antes de registrar otro.'
          : 'El cobro quedó confirmado y hay otra operación iniciada en otra pestaña. Verifica esa operación antes de registrar un nuevo pase.');
      }
      try { callback.current(r); } catch { /* El cobro ya fue confirmado; la vista se puede actualizar por separado. */ }
    } catch (fallo: any) {
      if (!montado.current || staffActual() !== p.staff) return;
      const e = fallo as ErrorPase;
      const seguro = (e instanceof ApiError && e.status === 400) || (e instanceof ApiError && e.status === 409 && RECHAZOS_SEGUROS.has(e.codigo || ''));
      const siguiente = seguro ? quitarPendiente(p) : p;
      if (seguro && siguiente?.payload.operationId !== p.payload.operationId) {
        setPendiente(siguiente); setError(e.message);
        if (e.codigo === 'DNI_EXISTENTE') {
          const datos = e.datos || {};
          if (datos.socio?.id) setCoincidencia(datos.socio);
          else if (datos.memberId) { setModo('socio'); setQ(dni); buscar(dni); }
        }
        if (e.codigo === 'OFERTA_CAMBIADA' || e.codigo === 'LEGAL_CAMBIADO') { setTerminos(false); setConsentimiento(false); cargarOferta(); }
      } else {
        setPendiente(p); setError('No pudimos confirmar el resultado. Usa «Verificar cobro» para recuperar esta misma operación antes de registrar otro pase.');
      }
    }
  }

  async function cobrar() {
    if (enviando.current) return;
    enviando.current = true; setOcupado(true);
    try {
      const operador = staffActual();
      if (!operador || operador !== staff) { setError('Tu sesión cambió. Vuelve a abrir recepción con tu cuenta de personal.'); return; }
      const preparar = () => {
        let anterior: Pendiente | null;
        try { anterior = leerPendiente(operador); }
        catch (e: any) { setBloqueo(e.message || 'El navegador no permite recuperar el cobro.'); return null; }
        if (anterior) { setPendiente(anterior); return anterior; }
        if (pendiente) { setBloqueo('No encontramos la recuperación guardada de este cobro. Verifica su registro antes de continuar.'); return null; }
        const legal = oferta?.legal, plan = oferta?.plan;
        if (bloqueo || cargandoOferta || !oferta?.disponible || !plan || !legal || !terminos || !consentimiento) return null;
        if (modo === 'socio' && !socio) { setError('Busca y selecciona al cliente que pagará el pase.'); return null; }
        if (modo === 'visitante' && (nombre.trim().length < 2 || (dni && !/^\d{8}$/.test(dni)))) { setError('Escribe el nombre del visitante y, si indicas DNI, sus ocho dígitos.'); return null; }
        const payload: SolicitudPase = {
          operationId: crypto.randomUUID(), planId: plan.id, versionOferta: plan.versionOferta, montoEsperado: plan.precio, metodo,
          ...(modo === 'socio' ? { memberId: socio!.id } : { visitante: { nombre: nombre.trim(), ...(dni ? { dni } : {}) } }),
          aceptaTerminos: true, terminosVersion: legal.terminosVersion, terminosHuella: legal.terminosHuella,
          consentimiento: true, consentimientoVersion: legal.consentimientoVersion, consentimientoHuella: legal.consentimientoHuella,
        };
        const snapshot: Pendiente = { version: 1, staff: operador, creado: new Date().toISOString(), persona: modo === 'socio' ? socio!.nombreCompleto : nombre.trim(), payload };
        try {
          localStorage.setItem(llave(operador), JSON.stringify(snapshot));
          const guardado = leerPendiente(operador);
          if (guardado?.payload.operationId !== payload.operationId) throw new Error();
          setPendiente(guardado); return guardado;
        } catch { setBloqueo('Este navegador no permite guardar la recuperación del cobro. Habilita el almacenamiento antes de cobrar un pase desde aquí.'); return null; }
      };
      // Serializa la creación del comprobante pendiente entre pestañas del mismo operador.
      const locks = navigator.locks;
      const p = locks ? await locks.request(`forcesgym.daily-pass.${operador}`, preparar) : preparar();
      if (p) await enviar(p);
    } finally { enviando.current = false; if (montado.current) setOcupado(false); }
  }

  const monto = pendiente?.payload.montoEsperado ?? oferta?.plan?.precio;
  const puedeCobrar = !!staff && !bloqueo && !pendiente && !resultado && !cargandoOferta && !!oferta?.disponible && !!oferta.legal && !!oferta.plan && terminos && consentimiento && (modo === 'socio' ? !!socio : nombre.trim().length >= 2 && (!dni || /^\d{8}$/.test(dni)));

  return <section className={styles.card} aria-label="Cobro rápido de pase diario">
    <span className={styles.icon} aria-hidden="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 5h16v14H4zM4 9h16M8 13h3m-3 3h7" /></svg></span>
    <div className={styles.cardCopy}><h2>Pase del día{typeof monto === 'number' ? ` · ${soles(monto)}` : ''}</h2><p>{pendiente ? 'Hay un cobro por verificar.' : resultado ? 'Último pase cobrado e ingreso registrado.' : 'Cobro e ingreso desde recepción, sin abrir una ficha.'}</p></div>
    <button type="button" className="boton-suave" onClick={abrir}>{pendiente ? 'Verificar cobro' : resultado ? 'Ver pase registrado' : 'Registrar pase'}</button>
    {abierto && createPortal(<dialog ref={dialogo} className={styles.dialog} aria-labelledby="titulo-pase-diario" onCancel={e => { e.preventDefault(); setAbierto(false); }} onClick={e => { if (e.target === e.currentTarget) setAbierto(false); }}>
      <div className={styles.sheet}>
        <header className={styles.header}><div><p className="rotulo">Recepción · Pase del día</p><h2 id="titulo-pase-diario">{resultado ? 'Pase registrado' : pendiente ? 'Verificar un cobro' : typeof monto === 'number' ? `Cobrar pase de ${soles(monto)}` : 'Pase del día'}</h2></div><button type="button" className={styles.close} aria-label="Cerrar cobro de pase diario" onClick={() => setAbierto(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></header>
        <div className={styles.body}>
          {bloqueo && <p className="aviso-mal" role="alert">{bloqueo}</p>}
          {resultado ? <section className={styles.success} aria-label="Pase diario confirmado"><span className={styles.successIcon} aria-hidden="true">✓</span><h3>{soles(resultado.monto)} cobrados</h3><p className="break-words font-semibold">{resultado.ingreso.socio?.nombreCompleto || pendiente?.persona || socio?.nombreCompleto || nombre}</p><p>{resultado.repetida ? 'Se recuperó el pago y el ingreso de la fecha indicada, sin registrar otro cobro.' : 'El ingreso quedó registrado. No vuelvas a escanear al cliente para darle entrada.'}</p><dl><div><dt>Vigencia</dt><dd>{fechaCorta(resultado.inicio)}{resultado.vence !== resultado.inicio ? ` – ${fechaCorta(resultado.vence)}` : ''}</dd></div><div><dt>Recibo interno</dt><dd>{resultado.comprobante.serie}-{String(resultado.comprobante.numero).padStart(6, '0')}</dd></div></dl><Link href={`/panel/comprobantes/${resultado.comprobante.id}`} target="_blank" rel="noopener noreferrer" className="boton-suave w-full">Ver recibo interno</Link><p className="text-xs text-secundario">Recibo interno, sin valor tributario.</p></section> : pendiente ? <section className={styles.pending} aria-label="Cobro pendiente de confirmación"><h3>Comprueba el resultado antes de otro cobro</h3><p>No recibimos una confirmación completa. Verificaremos la misma operación; sus datos permanecen guardados.</p><dl><div><dt>Cliente</dt><dd>{pendiente.persona}</dd></div><div><dt>Monto</dt><dd>{soles(pendiente.payload.montoEsperado)}</dd></div><div><dt>Método</dt><dd>{METODOS.find(m => m.valor === pendiente.payload.metodo)?.nombre}</dd></div></dl><details><summary>Referencia del cobro</summary><p className={styles.reference}>{pendiente.payload.operationId}</p></details></section> : <>
            {cargandoOferta ? <p className="text-sm text-secundario" role="status">Consultando precio y disponibilidad…</p> : errorOferta ? <div className="aviso-mal"><p role="alert">{errorOferta}</p><button type="button" className="min-h-11 font-semibold underline" onClick={cargarOferta}>Volver a consultar</button></div> : !oferta?.disponible ? <p className="aviso-ojo">{oferta?.motivo || 'El pase diario no está disponible en este momento.'}</p> : <>
              <div className={styles.offer}><strong>{oferta.plan?.nombre || 'Pase del día'} · {soles(oferta.plan!.precio)}</strong><span>{oferta.inicio ? `Para hoy, ${fechaCorta(oferta.inicio)}.` : 'Desde el momento del cobro.'} El cobro registra el ingreso.</span></div>
              <fieldset className={styles.personType}><legend className="etiqueta">¿Quién pagará el pase?</legend><div>{([{ valor: 'socio', nombre: 'Cliente existente' }, { valor: 'visitante', nombre: 'Visitante nuevo' }] as const).map(op => <label key={op.valor} data-activo={modo === op.valor}><input type="radio" name="tipo-persona-pase" checked={modo === op.valor} onChange={() => { setModo(op.valor); setError(''); setCoincidencia(null); }} /><span>{op.nombre}</span></label>)}</div></fieldset>
              {modo === 'socio' ? socio ? <div className={styles.selected}><div><strong>{socio.nombreCompleto}</strong><p>{socio.codigoERP ? `Código ${socio.codigoERP} · ` : ''}{socio.dni ? `DNI ${socio.dni}` : 'Sin DNI registrado'}</p></div><button type="button" className="min-h-11 text-xs font-semibold text-acentoTexto" onClick={() => { setSocio(null); setBusquedaHecha(false); }}>Cambiar cliente</button></div> : <div><label className="etiqueta" htmlFor="busqueda-persona-pase">Código, DNI o nombre</label><div className={styles.search}><input id="busqueda-persona-pase" className="campo" autoComplete="off" placeholder="Ej. 1277 o DNI" value={q} onChange={e => { setQ(e.target.value); setBusquedaHecha(false); setSocios([]); secuenciaBusqueda.current++; }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }} /><button type="button" className="boton-suave" disabled={buscando || !q.trim()} onClick={() => buscar()}>{buscando ? 'Buscando…' : 'Buscar'}</button></div>{buscando && <p className="mt-2 text-xs text-secundario" role="status">Buscando al cliente…</p>}{busquedaHecha && socios.length === 0 && <p className="mt-3 text-sm text-secundario">No encontramos un cliente. Revisa el código o elige «Visitante nuevo».</p>}{socios.length > 0 && <ul className={styles.results} aria-label="Clientes encontrados">{socios.slice(0, 8).map(s => <li key={s.id}><button type="button" onClick={() => elegirSocio(s)}><strong>{s.nombreCompleto}</strong><span>{s.codigoERP ? `Código ${s.codigoERP} · ` : ''}{s.dni ? `DNI ${s.dni}` : 'Sin DNI registrado'}{s.plan ? ` · ${s.plan}` : ''}</span><span className="text-acentoTexto">Seleccionar cliente</span></button></li>)}</ul>}{socios.length > 8 && <p className="mt-2 text-xs text-secundario">Hay más coincidencias. Escribe más datos para encontrar al cliente.</p>}</div> : <div className={styles.visitor}><label><span className="etiqueta">Nombre completo del visitante</span><input className="campo" autoComplete="off" maxLength={60} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellidos" /></label><label><span className="etiqueta">DNI <span className="font-normal text-tenue">(opcional)</span></span><input className="campo" inputMode="numeric" autoComplete="off" maxLength={8} value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} placeholder="8 dígitos, si lo proporciona" /></label><p className="text-xs leading-relaxed text-secundario">Sólo se guardan los datos necesarios para identificar este pase. No requiere crear una cuenta del portal.</p></div>}
              <label className="block"><span className="etiqueta">Método con el que recibiste el pago</span><select className="campo" value={metodo} onChange={e => setMetodo(e.target.value as Metodo)}>{METODOS.map(m => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}</select></label>{metodo !== 'efectivo' && <p className="text-xs leading-relaxed text-secundario">Confirma que recibiste el pago en recepción antes de registrar el pase.</p>}
              {oferta.legal && <div className={styles.legal}><details><summary>Leer términos y consentimiento</summary><h3>Términos del pase</h3><p>{oferta.legal.terminosTexto}</p><h3>Consentimiento informado</h3><p>{oferta.legal.consentimientoTexto}</p></details><label className={styles.check}><input type="checkbox" checked={terminos} onChange={e => setTerminos(e.target.checked)} /><span>El cliente acepta los términos del pase diario.</span></label><label className={styles.check}><input type="checkbox" checked={consentimiento} onChange={e => setConsentimiento(e.target.checked)} /><span>El cliente autoriza el tratamiento de sus datos para registrar y gestionar su pase.</span></label></div>}
            </>}
          </>}
          {coincidencia && !pendiente && <div className="aviso-ojo space-y-2"><p>Ese DNI ya pertenece a un cliente. Revisa su identidad y selecciona su ficha para continuar.</p><p className="break-words font-semibold">{coincidencia.nombreCompleto}</p><button type="button" className="boton-suave w-full" onClick={() => elegirSocio(coincidencia)}>Usar este cliente existente</button></div>}
          {error && <p className="aviso-mal" role="alert">{error}</p>}
        </div>
        <footer className={styles.footer}>{pendiente ? <button type="button" className="boton w-full" disabled={ocupado || !!bloqueo} onClick={cobrar}>{ocupado ? 'Verificando cobro…' : 'Verificar cobro'}</button> : resultado ? <><button type="button" className="boton w-full" onClick={nuevoCobro}>Registrar otro pase</button><button type="button" className="boton-suave w-full" onClick={() => setAbierto(false)}>Volver a recepción</button></> : <><button type="button" className="boton w-full" disabled={ocupado || !puedeCobrar} onClick={cobrar}>{ocupado ? 'Registrando cobro e ingreso…' : typeof monto === 'number' ? `Cobrar ${soles(monto)} y registrar ingreso` : 'Cobrar y registrar ingreso'}</button><p>Se registra un solo pago y una sola entrada.</p></>}</footer>
      </div>
    </dialog>, document.body)}
  </section>;
}
