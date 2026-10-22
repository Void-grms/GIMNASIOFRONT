'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useState } from 'react';
import { api, fechaCorta, soles } from '@/lib/api';
import { CuentaMembresiaDatos, diasEntre, hoyLimaTexto, sumarDias } from '@/lib/cuenta-membresia';
import { MEMBRESIA_ACTUALIZADA, useOperacionMembresia } from './OperacionMembresia';
import { comprobanteDeSocio, comprobanteValido, DatosComprobanteAbono } from './DatosComprobanteAbono';

const METODOS = [{ id: 'efectivo', texto: 'Efectivo' }, { id: 'yape', texto: 'Yape' }, { id: 'plin', texto: 'Plin' }, { id: 'tarjeta', texto: 'Tarjeta en recepción (POS)' }, { id: 'transferencia', texto: 'Transferencia' }];

export function ResumenCuenta({ cuenta }: { cuenta: CuentaMembresiaDatos }) {
  return <div className="space-y-3">
    <dl className="grid grid-cols-1 gap-3 rounded-xl bg-fondo/60 p-3 min-[420px]:grid-cols-3">
      {[["Precio del plan", cuenta.total], ["Pagado", cuenta.pagado], ["Saldo pendiente", cuenta.saldo]].map(([nombre, valor]) => <div key={String(nombre)}><dt className="text-xs text-secundario">{nombre}</dt><dd className={`mt-1 break-words text-lg font-bold cifra ${nombre === 'Saldo pendiente' && cuenta.saldo > 0 ? 'text-porvencer' : ''}`}>{soles(Number(valor))}</dd></div>)}
    </dl>
    <p className={`text-sm ${cuenta.estado === 'vencida' ? 'text-porvencer' : cuenta.saldo > 0 ? 'text-secundario' : 'text-vigente'}`}>
      {cuenta.saldo <= 0 ? 'Pago completado.' : `${cuenta.estado === 'vencida' ? 'Saldo vencido' : 'Completar el saldo'}${cuenta.fechaLimiteSaldo ? `: ${fechaCorta(cuenta.fechaLimiteSaldo)}` : ''}.`}
    </p>
  </div>;
}

export function CuentaMembresia({ membresia: m, socio, ajustes }: { membresia: any; socio: any; ajustes: any }) {
  const [cuenta, setCuenta] = useState<CuentaMembresiaDatos | null>(m.cuenta || null);
  const [abierta, setAbierta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [accion, setAccion] = useState<'abono' | 'inicio' | 'pausa' | null>(null);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [nuevoInicio, setNuevoInicio] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [motivo, setMotivo] = useState('');
  const [aprobado, setAprobado] = useState(false);
  const [comprobante, setComprobante] = useState(() => comprobanteDeSocio(socio));
  const op = useOperacionMembresia();
  const uid = useId();
  const inicio = (cuenta?.inicio || m.fechaInicio || '').slice(0, 10);
  const vence = (cuenta?.vence || m.fechaFin || '').slice(0, 10);
  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try { setCuenta(await api<CuentaMembresiaDatos>(`/memberships/${m.id}/cuenta`)); }
    catch (e: any) { setError(e.message || 'No pudimos cargar la cuenta de la membresía.'); }
    finally { setCargando(false); }
  }, [m.id]);
  useEffect(() => { if (m.cuenta) setCuenta(m.cuenta); }, [m.cuenta]);
  useEffect(() => {
    if (window.location.hash === `#cuenta-${m.id}`) {
      setAbierta(true); cargar();
      requestAnimationFrame(() => document.getElementById(`cuenta-${m.id}`)?.scrollIntoView({ block: 'start' }));
    }
  }, [m.id, cargar]);
  useEffect(() => {
    const actualizar = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.memberId !== socio.id || (d.resultado?.membershipId || d.resultado?.id) !== m.id) return;
      if (d.resultado?.cuenta) setCuenta(d.resultado.cuenta);
      setAprobado(false);
      if (d.otraPestana) {
        setAccion(null);
        setAviso('La cuenta se actualizó desde otra pestaña. Revisa el saldo y las fechas antes de realizar otra operación.');
        cargar();
      }
    };
    window.addEventListener(MEMBRESIA_ACTUALIZADA, actualizar);
    return () => window.removeEventListener(MEMBRESIA_ACTUALIZADA, actualizar);
  }, [socio.id, m.id, cargar]);

  function abrirAccion(a: typeof accion) {
    setAccion(a); setError(''); setAviso(''); setAprobado(false); setMotivo('');
    setMonto(''); setMetodo('efectivo'); setNuevoInicio(inicio); setDesde(hoyLimaTexto()); setHasta('');
    setComprobante(comprobanteDeSocio(socio));
  }
  const diasPausa = desde && hasta ? diasEntre(desde, hasta) + 1 : 0;
  const finElegido = accion === 'inicio' && nuevoInicio ? sumarDias(vence, diasEntre(inicio, nuevoInicio)) : accion === 'pausa' && diasPausa > 0 ? sumarDias(vence, diasPausa) : '';
  const montoNum = Number(monto);
  const bloqueada = op.ocupado || !!op.pendiente || !!op.bloqueo || cargando;
  const abonoValido = !!cuenta && !!monto && Number.isFinite(montoNum) && montoNum > 0 && Math.round(montoNum * 100) <= Math.round(cuenta.saldo * 100);
  const fechaValida = accion === 'inicio' ? !!nuevoInicio && nuevoInicio !== inicio : !!desde && !!hasta && diasPausa > 0;
  const puedeGuardar = !bloqueada && !!cuenta && (accion === 'abono' ? abonoValido && comprobanteValido(comprobante, montoNum, ajustes) : fechaValida && motivo.trim().length >= 5 && aprobado);

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); if (!puedeGuardar || !cuenta || !accion) return;
    setError(''); setAviso('');
    const tipo = accion;
    const r: any = await op.ejecutar({
      memberId: socio.id,
      titulo: tipo === 'abono' ? `Abono de ${socio.nombreCompleto} · ${soles(montoNum)}` : `${tipo === 'inicio' ? 'Cambio de inicio' : 'Congelamiento'} de ${socio.nombreCompleto}`,
      ruta: `/memberships/${m.id}/${tipo === 'abono' ? 'abonos' : tipo === 'inicio' ? 'fechas' : 'congelamientos'}`,
      metodo: tipo === 'inicio' ? 'PATCH' : 'POST',
      payload: tipo === 'abono' ? { monto: montoNum, metodo, comprobante: { ...comprobante, clienteNumDoc: comprobante.clienteTipoDoc === 'sin_documento' ? undefined : comprobante.clienteNumDoc, clienteDireccion: comprobante.clienteDireccion || undefined } } : { version: cuenta.version, motivo: motivo.trim(), aprobado: true, ...(tipo === 'inicio' ? { fechaInicio: nuevoInicio } : { desde, hasta }) },
    });
    if (!r) { setAprobado(false); await cargar(); return; }
    setCuenta(r.cuenta); setAccion(null);
    setAviso(tipo === 'abono' ? `${r.repetida ? 'Abono recuperado' : 'Abono registrado'}: ${soles(r.monto ?? montoNum)}. ${r.cuenta.saldo > 0 ? `Quedan ${soles(r.cuenta.saldo)} pendientes.` : 'El pago quedó completado.'} La vigencia no cambia.` : `${r.repetida ? 'Operación recuperada' : tipo === 'inicio' ? 'Inicio actualizado' : 'Congelamiento registrado'}. Vigencia del ${fechaCorta(r.inicio)} al ${fechaCorta(r.vence)}.`);
    if (r.errorComprobante) setError(`El abono quedó guardado. Su recibo no pudo generarse: ${r.errorComprobante}. No vuelvas a cobrarlo.`);
    // El panel recibe el evento de confirmación, también al recuperar una operación.
  }

  return <div id={`cuenta-${m.id}`} className="mt-3 min-w-0 scroll-mt-28 border-t border-borde pt-3">
    {cuenta && <div className="mb-3"><span className={`text-xs font-semibold ${cuenta.saldo > 0 ? 'text-porvencer' : 'text-vigente'}`}>{cuenta.saldo > 0 ? `Saldo ${soles(cuenta.saldo)}${cuenta.estado === 'vencida' ? ' · plazo vencido' : ''}` : 'Pago completado'}</span>{cuenta.saldo > 0 && cuenta.fechaLimiteSaldo && <p className="mt-1 text-xs text-secundario">Completar hasta el {fechaCorta(cuenta.fechaLimiteSaldo)}</p>}</div>}
    <button type="button" aria-expanded={abierta} aria-controls={`${uid}-cuenta`} className="min-h-11 text-sm font-semibold text-acentoTexto underline underline-offset-4" onClick={() => { setAbierta(!abierta); if (!abierta) cargar(); }}>{abierta ? 'Cerrar pagos y vigencia' : 'Ver pagos y gestionar vigencia'}</button>
    {abierta && <div id={`${uid}-cuenta`} className="mt-3 space-y-4">
      {cargando && <p role="status" className="text-sm text-secundario">Actualizando cuenta…</p>}
      {cuenta && <><ResumenCuenta cuenta={cuenta} /><p className="text-xs leading-relaxed text-secundario">El saldo es independiente del acceso. El ingreso depende de las fechas, las asistencias y los congelamientos de la membresía.</p>
        {m.estado !== 'anulada' && <div className="flex flex-wrap gap-2">{cuenta.saldo > 0 && <button type="button" className="boton" disabled={bloqueada} onClick={() => abrirAccion('abono')}>Registrar abono</button>}<button type="button" className="boton-suave" disabled={bloqueada} onClick={() => abrirAccion('inicio')}>Ajustar inicio</button><button type="button" className="boton-suave" disabled={bloqueada} onClick={() => abrirAccion('pausa')}>Congelar membresía</button></div>}
        {accion && <form onSubmit={guardar} className="space-y-4 rounded-xl border border-borde bg-fondo/40 p-3 sm:p-4">
          <h3 className="font-bold">{accion === 'abono' ? 'Registrar abono al saldo' : accion === 'inicio' ? 'Ajustar fecha de inicio' : 'Congelar por un período'}</h3>
          <fieldset disabled={bloqueada} className="min-w-0 space-y-4">
            {accion === 'abono' ? <>
              <p className="text-sm text-secundario">Se registra dinero recibido para esta membresía. No compra otro plan ni cambia su vigencia.</p>
              <label className="block"><span className="etiqueta">Monto del abono (S/)</span><input className="campo cifra" type="number" inputMode="decimal" step="0.01" min="0.01" max={cuenta.saldo} required value={monto} onChange={e => setMonto(e.target.value)} /></label>
              <button type="button" className="min-h-11 text-sm font-semibold text-acentoTexto underline" onClick={() => setMonto(cuenta.saldo.toFixed(2))}>Completar saldo de {soles(cuenta.saldo)}</button>
              <label className="block"><span className="etiqueta">Método del abono</span><select className="campo" value={metodo} onChange={e => setMetodo(e.target.value)}>{METODOS.map(m => <option key={m.id} value={m.id}>{m.texto}</option>)}</select></label>
              <dl className="space-y-2 border-y border-borde py-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>Recibido hoy</dt><dd className="font-bold cifra">{soles(Number.isFinite(montoNum) ? montoNum : 0)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt>Saldo después del abono</dt><dd className="font-bold cifra">{soles(Math.max(0, cuenta.saldo - (Number.isFinite(montoNum) ? montoNum : 0)))}</dd></div></dl>
              <p className="text-xs leading-relaxed text-secundario">La fecha de recepción del dinero es hoy, {fechaCorta(hoyLimaTexto())}.</p>
              <DatosComprobanteAbono valor={comprobante} onChange={setComprobante} ajustes={ajustes} socio={socio} monto={montoNum} />
            </> : <>
              <p className="text-sm text-secundario">Vigencia actual: {fechaCorta(inicio)} — {fechaCorta(vence)}. Los pagos y las asistencias registradas se conservan.</p>
              {accion === 'inicio' ? <label className="block"><span className="etiqueta">Nueva fecha de inicio</span><input className="campo" type="date" required value={nuevoInicio} onChange={e => { setNuevoInicio(e.target.value); setAprobado(false); }} /></label> : <><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block"><span className="etiqueta">Congelar desde</span><input className="campo" type="date" required min={inicio} max={vence} value={desde} onChange={e => { setDesde(e.target.value); setAprobado(false); }} /></label><label className="block"><span className="etiqueta">Congelar hasta</span><input className="campo" type="date" required min={desde || inicio} value={hasta} onChange={e => { setHasta(e.target.value); setAprobado(false); }} /></label></div><p className="text-xs leading-relaxed text-secundario">Ambos días están incluidos. Durante la pausa no se permite ingresar y el vencimiento se amplía por los días aprobados.</p></>}
              {fechaValida && finElegido && <div className="rounded-xl border border-acento/30 bg-acento/5 p-3 text-sm" aria-label="Vista previa de la vigencia"><p className="font-semibold">Así quedaría</p><p className="mt-1">{fechaCorta(accion === 'inicio' ? nuevoInicio : inicio)} — {fechaCorta(finElegido)}</p>{accion === 'pausa' && <p className="mt-1 text-secundario">{diasPausa} día(s) de congelamiento: {fechaCorta(desde)} — {fechaCorta(hasta)}.</p>}<p className="mt-2 text-xs text-secundario">Antes de guardar se revisarán las asistencias registradas y los demás períodos contratados.</p></div>}
              <label className="block"><span className="etiqueta">Motivo del ajuste</span><textarea className="campo min-h-24" minLength={5} maxLength={300} required value={motivo} onChange={e => { setMotivo(e.target.value); setAprobado(false); }} placeholder={accion === 'inicio' ? 'Ej. Inicio acordado para la próxima semana' : 'Ej. Pausa acordada por motivo personal'} /></label>
              <label className="flex items-start gap-3 text-sm leading-relaxed text-secundario"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={aprobado} onChange={e => setAprobado(e.target.checked)} /><span>Apruebo expresamente {accion === 'inicio' ? 'el cambio de inicio y la vigencia indicada' : 'este congelamiento y su ampliación de vigencia'}. Quedará registrado quién lo autorizó, cuándo y por qué.</span></label>
            </>}
            <div className="flex flex-wrap gap-2"><button type="submit" className="boton" disabled={!puedeGuardar}>{op.ocupado ? 'Guardando…' : accion === 'abono' ? `Registrar abono de ${soles(Number.isFinite(montoNum) ? montoNum : 0)}` : accion === 'inicio' ? 'Guardar nuevo inicio' : 'Aprobar congelamiento'}</button><button type="button" className="boton-suave" onClick={() => setAccion(null)}>Cancelar</button></div>
          </fieldset>
        </form>}
        {cuenta.congelamientos?.length > 0 && <section className="space-y-2"><h3 className="rotulo">Congelamientos</h3>{cuenta.congelamientos.map(c => <div key={c.id} className="rounded-lg border border-borde p-3 text-xs"><p className="font-semibold">{fechaCorta(c.desde)} — {fechaCorta(c.hasta)} · {c.dias} día(s)</p><p className="mt-1 break-words text-secundario">{c.motivo}</p></div>)}</section>}
        <section className="space-y-2"><h3 className="rotulo">Pagos de esta membresía</h3>{!cuenta.pagos?.length ? <p className="text-sm text-tenue">Sin pagos registrados.</p> : <ul className="divide-y divide-borde">{cuenta.pagos.map(p => <li key={p.id} className="space-y-1 py-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span>{fechaCorta(p.fecha)} · {p.metodo}</span><strong className="cifra">{soles(p.monto)}</strong></div><p className="text-xs text-secundario">Registrado por {p.cajero || 'Personal'}</p>{p.comprobante && <Link className="inline-flex min-h-11 items-center text-acentoTexto underline" target="_blank" rel="noopener noreferrer" href={`/panel/comprobantes/${p.comprobante.id}`}>Ver {p.comprobante.tipo === 'recibo' ? 'recibo interno' : 'comprobante'} {p.comprobante.serie}-{String(p.comprobante.numero).padStart(6, '0')}</Link>}</li>)}</ul>}</section>
        {cuenta.ajustes?.length > 0 && <section className="space-y-2"><h3 className="rotulo">Historial de autorizaciones</h3><ul className="space-y-2">{cuenta.ajustes.map(a => <li key={a.id} className="space-y-1 rounded-lg border border-borde p-3 text-xs leading-relaxed"><p className="font-semibold">{a.tipo === 'inicio' ? 'Ajuste de inicio' : 'Congelamiento'} · {fechaCorta(a.fecha)}</p><p className="break-words">{a.motivo}</p><p className="text-secundario">Autorizó {a.usuarioNombre || 'Personal'} ({a.rol === 'admin' ? 'Administración' : 'Recepción'}), {new Date(a.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}.</p><p className="text-tenue">Antes: {fechaCorta(a.antes?.inicio)} — {fechaCorta(a.antes?.vence)}<br />Después: {fechaCorta(a.despues?.inicio)} — {fechaCorta(a.despues?.vence)}</p></li>)}</ul></section>}
      </>}
      {aviso && <p role="status" className="aviso-ok">{aviso}</p>}
      {error && <div role="alert" className="aviso-mal"><p>{error}</p><button type="button" className="mt-2 min-h-11 underline" onClick={cargar}>Volver a cargar la cuenta</button></div>}
      {op.error && <p role="alert" className="aviso-mal">{op.error}</p>}
      {op.pendiente && <p className="aviso-ojo">Hay una operación por verificar. Usa el aviso superior antes de registrar otra.</p>}
      {op.bloqueo && <p role="alert" className="aviso-mal">{op.bloqueo}</p>}
    </div>}
  </div>;
}
