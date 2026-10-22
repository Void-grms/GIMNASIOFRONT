'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta, soles } from '@/lib/api';
import { EnviarWhatsapp } from './EnviarWhatsapp';
import { MEMBRESIA_ACTUALIZADA, useOperacionMembresia } from './OperacionMembresia';
import { hoyLimaTexto } from '@/lib/cuenta-membresia';

const METODOS = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'];

const DOCUMENTOS = [
  { valor: 'dni', texto: 'DNI' },
  { valor: 'ruc', texto: 'RUC' },
  { valor: 'ce', texto: 'Carne de extranjeria' },
  { valor: 'pasaporte', texto: 'Pasaporte' },
  { valor: 'sin_documento', texto: 'Sin documento' },
];

/**
 * Cobro de una membresia con su comprobante.
 *
 * Lo que la ley obliga y aqui se respeta: el IGV se desagrega del precio de
 * lista (en Peru el precio al consumidor ya lo incluye), la boleta sobre el
 * umbral exige identificar al cliente, la factura exige RUC valido con razon
 * social y direccion, y el socio acepta las condiciones antes de que se cobre.
 */
export function FormularioCobro({
  socio,
  ajustes,
  onCobrado,
}: {
  socio: any;
  ajustes: any;
  onCobrado: () => void;
}) {
  const [planes, setPlanes] = useState<any[]>([]);
  const [planId, setPlanId] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [preview, setPreview] = useState<any>(null);
  const [cargandoPlanes, setCargandoPlanes] = useState(true);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [errorPlanes, setErrorPlanes] = useState('');
  const [errorPreview, setErrorPreview] = useState('');
  const [revisionPlanes, setRevisionPlanes] = useState(0);
  const [revisionPreview, setRevisionPreview] = useState(0);
  const cobroEnCurso = useRef(false);
  const exigirSeleccion = useRef(false);
  const op = useOperacionMembresia();
  const [parcial, setParcial] = useState(false);
  const [abono, setAbono] = useState('');
  const [fechaLimiteSaldo, setFechaLimiteSaldo] = useState('');
  const [fechaPersonalizada, setFechaPersonalizada] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [motivoFechas, setMotivoFechas] = useState('');
  const [apruebaFechas, setApruebaFechas] = useState(false);

  const [tipoComprobante, setTipoComprobante] = useState('boleta');
  const [tipoDoc, setTipoDoc] = useState(socio?.dni ? 'dni' : 'sin_documento');
  const [numDoc, setNumDoc] = useState(socio?.dni || '');
  const [nombre, setNombre] = useState(socio?.nombreCompleto || '');
  const [direccion, setDireccion] = useState('');
  const [acepta, setAcepta] = useState(false);

  const [emitido, setEmitido] = useState<any>(null);
  const [pagoId, setPagoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [cobrando, setCobrando] = useState(false);

  useEffect(() => {
    const actualizar = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.otraPestana || d.memberId !== socio?.id) return;
      setAcepta(false); setApruebaFechas(false); setPreview(null);
      setRevisionPreview(v => v + 1);
      setAviso('La cuenta se actualizó desde otra pestaña. Revisa las fechas y las condiciones antes de cobrar.');
    };
    window.addEventListener(MEMBRESIA_ACTUALIZADA, actualizar);
    return () => window.removeEventListener(MEMBRESIA_ACTUALIZADA, actualizar);
  }, [socio?.id]);

  useEffect(() => {
    if (tipoComprobante !== 'factura') {
      setTipoDoc(socio?.dni ? 'dni' : 'sin_documento');
      setNumDoc(socio?.dni || '');
    }
    // Completar el DNI en recepción actualiza la boleta sin borrar una factura en edición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socio?.id, socio?.dni]);

  useEffect(() => {
    let vigente = true;
    setCargandoPlanes(true);
    setErrorPlanes('');
    setPreview(null);
    setCargandoPreview(false);
    setErrorPreview('');
    setAcepta(false);
    api('/plans').then((p: any) => {
      if (!vigente) return;
      setPlanes(p);
      setPlanId((actual) => exigirSeleccion.current ? '' : p.find((plan: any) => plan.id === actual)?.id || p[0]?.id || '');
    }).catch((e) => {
      if (!vigente) return;
      setPlanes([]);
      setPlanId('');
      setErrorPlanes(e.message);
    }).finally(() => { if (vigente) setCargandoPlanes(false); });
    return () => { vigente = false; };
  }, [revisionPlanes]);

  useEffect(() => {
    if (!planId || !socio?.id || cargandoPlanes) return;
    let vigente = true;
    const memberId = socio.id;
    setPreview(null);
    setAcepta(false);
    setCargandoPreview(true);
    setErrorPreview('');
    if (fechaPersonalizada && !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) { setCargandoPreview(false); return; }
    const inicioElegido = fechaPersonalizada ? fechaInicio : '';
    api(`/memberships/preview?memberId=${encodeURIComponent(memberId)}&planId=${encodeURIComponent(planId)}${inicioElegido ? `&fechaInicio=${encodeURIComponent(inicioElegido)}` : ''}`)
      .then((p) => {
        if (!vigente) return;
        if (!/^[a-f0-9]{64}$/i.test(p.versionOferta || '')) throw new Error('No se pudieron validar las condiciones del plan. Vuelve a calcular antes de cobrar.');
        setPreview({ ...p, memberId, planId, inicioElegido });
        setPlanes((actuales) => actuales.map((actual) => actual.id === planId ? {
          ...actual, nombre: p.plan, precio: p.precio, duracionDias: p.duracionDias,
          limiteAsistencias: p.limiteAsistencias, descripcion: p.descripcion, esPromocion: p.esPromocion,
        } : actual));
      })
      .catch((e) => { if (vigente) setErrorPreview(e.message); })
      .finally(() => { if (vigente) setCargandoPreview(false); });
    return () => { vigente = false; };
  }, [planId, socio?.id, cargandoPlanes, revisionPreview, fechaPersonalizada, fechaInicio]);

  const plan = planes.find((p) => p.id === planId);
  const previewVigente = !!preview && !cargandoPlanes && preview.memberId === socio?.id && preview.planId === planId && preview.inicioElegido === (fechaPersonalizada ? fechaInicio : '');
  const oferta = previewVigente ? preview : null;
  const total = previewVigente ? preview.precio : 0;
  const recibido = parcial ? Number(abono) : total;
  const saldo = Math.round((total - recibido) * 100) / 100;
  const parcialValido = !parcial || (!!abono && Number.isFinite(recibido) && recibido > 0 && recibido < total && !!fechaLimiteSaldo && fechaLimiteSaldo >= hoyLimaTexto());
  const fechasValidas = !fechaPersonalizada || (!!fechaInicio && motivoFechas.trim().length >= 5 && apruebaFechas);
  const aplicaIgv = !!ajustes?.aplicaIgv && tipoComprobante !== 'recibo';

  // El precio de lista ya incluye IGV, asi que se desagrega hacia atras.
  const desglose = useMemo(() => {
    const importe = Number.isFinite(recibido) && recibido >= 0 ? recibido : 0;
    if (!aplicaIgv) return { gravado: 0, igv: 0, total: importe };
    const gravado = Math.round((importe / (1 + ajustes.igvTasa)) * 100) / 100;
    return { gravado, igv: Math.round((importe - gravado) * 100) / 100, total: importe };
  }, [recibido, aplicaIgv, ajustes?.igvTasa]);

  const necesitaDocumento = recibido > (ajustes?.umbralDocumento ?? 700);
  const faltaDocumento =
    tipoComprobante === 'boleta' && necesitaDocumento && tipoDoc === 'sin_documento';
  const facturaIncompleta =
    tipoComprobante === 'factura' && (tipoDoc !== 'ruc' || !numDoc || !nombre || !direccion);

  const puedeCobrar = !!plan && previewVigente && !cargandoPlanes && !cargandoPreview && !errorPlanes && !errorPreview && acepta && !faltaDocumento && !facturaIncompleta && parcialValido && fechasValidas && !cobrando && !op.ocupado && !op.pendiente && !op.bloqueo;

  async function cobrar() {
    if (!puedeCobrar || cobroEnCurso.current) return;
    cobroEnCurso.current = true;
    setError('');
    setAviso('');
    setCobrando(true);
    try {
      const r: any = await op.ejecutar({ memberId: socio.id, titulo: `${parcial ? 'Abono inicial' : 'Pago'} de ${socio.nombreCompleto} · ${soles(recibido)}`, ruta: '/memberships',
        payload: {
          memberId: socio.id,
          planId,
          versionOferta: preview.versionOferta,
          inicioEsperado: preview.inicio,
          metodo,
          aceptaTerminos: acepta,
          ...(parcial ? { abonoInicial: recibido, fechaLimiteSaldo } : {}),
          ...(fechaPersonalizada ? { fechaInicio, motivoFechas: motivoFechas.trim(), apruebaFechas: true } : {}),
          comprobante: {
            tipo: tipoComprobante,
            clienteTipoDoc: tipoDoc,
            clienteNumDoc: tipoDoc === 'sin_documento' ? undefined : numDoc,
            clienteNombre: nombre,
            clienteDireccion: direccion || undefined,
          },
        },
      });
      if (!r) { setAcepta(false); setApruebaFechas(false); setRevisionPreview(v => v + 1); return; }
      setAviso(`${r.repetida ? 'Pago recuperado' : 'Pago registrado'}: ${soles(recibido)}. Vigencia del ${fechaCorta(r.inicio)} al ${fechaCorta(r.vence)}.${r.cuenta?.saldo > 0 ? ` Saldo pendiente: ${soles(r.cuenta.saldo)}, completar hasta el ${fechaCorta(r.cuenta.fechaLimiteSaldo)}.` : ''}`);
      setEmitido(r.comprobante);
      setPagoId(r.paymentId ?? null);
      if (r.errorComprobante) {
        setError(`El pago quedo registrado, pero el comprobante no se emitio: ${r.errorComprobante}`);
      }
      setAcepta(false);
      setApruebaFechas(false);
      setRevisionPreview((v) => v + 1);
      onCobrado();
    } catch (e: any) {
      if (e.status === 409 && /condiciones.*plan.*cambi|oferta.*cambi/i.test(e.message || '')) {
        exigirSeleccion.current = true;
        setPlanId('');
        setPreview(null);
        setAcepta(false);
        setRevisionPlanes((v) => v + 1);
        setError('El plan cambió mientras revisabas el cobro. No se registró el pago. Selecciona el plan otra vez, revisa el precio y las condiciones actualizadas y pide al socio que las acepte antes de cobrar.');
      } else setError(e.message);
    } finally {
      cobroEnCurso.current = false;
      setCobrando(false);
    }
  }

  return (
    <div className="tarjeta-acento h-fit space-y-4">
      <h2 className="text-lg font-semibold">Cobrar membresia</h2>
      <fieldset className="min-w-0 space-y-4" disabled={cobrando || op.ocupado || !!op.pendiente || !!op.bloqueo}>

      <div>
        <label className="etiqueta" htmlFor="cobro-plan">Plan</label>
        <select id="cobro-plan" className="campo" value={planId} disabled={cargandoPlanes || cobrando} onChange={(e) => { exigirSeleccion.current = false; setPreview(null); setAcepta(false); setPlanId(e.target.value); }}>
          {!planId && <option value="">{cargandoPlanes ? 'Cargando planes…' : planes.length ? 'Selecciona y revisa un plan' : 'No hay planes activos'}</option>}
          {planes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}{p.esPromocion ? ' (promoción)' : ''} — {soles(p.precio)} / {p.duracionDias} día(s){p.limiteAsistencias != null ? ` · ${p.limiteAsistencias} asistencias` : ''}
            </option>
          ))}
        </select>
        {errorPlanes && <div className="aviso-mal mt-2" role="alert"><p>{errorPlanes}</p><button type="button" className="mt-2 underline underline-offset-4" onClick={() => setRevisionPlanes((v) => v + 1)}>Volver a cargar los planes</button></div>}
        {oferta && <div className="mt-2 space-y-1 text-sm leading-relaxed text-secundario">
          <p>{oferta.limiteAsistencias == null ? 'Asistencias sin límite' : `${oferta.limiteAsistencias} asistencias en total`} durante {oferta.duracionDias} días desde el inicio.</p>
          {oferta.limiteAsistencias != null && <p className="text-xs">Se descuenta una asistencia por día. Volver a entrar el mismo día no descuenta otra.</p>}
          {oferta.descripcion && <p className="text-xs">{oferta.descripcion}</p>}
        </div>}
      </div>

      <fieldset className="min-w-0 space-y-3 rounded-xl border border-borde p-4">
        <legend className="px-1 text-sm font-semibold">Importe recibido</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" aria-pressed={!parcial} className={!parcial ? 'boton' : 'boton-suave'} onClick={() => { setParcial(false); setAcepta(false); }}>Pago completo</button>
          <button type="button" aria-pressed={parcial} className={parcial ? 'boton' : 'boton-suave'} onClick={() => { setParcial(true); setAcepta(false); }}>Abono inicial</button>
        </div>
        {parcial && <><label className="block"><span className="etiqueta">Recibido hoy (S/)</span><input className="campo cifra" type="number" inputMode="decimal" min="0.01" step="0.01" max={total || undefined} value={abono} onChange={e => { setAbono(e.target.value); setAcepta(false); }} /></label><label className="block"><span className="etiqueta">Completar el saldo hasta</span><input className="campo" type="date" min={hoyLimaTexto()} value={fechaLimiteSaldo} onChange={e => { setFechaLimiteSaldo(e.target.value); setAcepta(false); }} /></label><p className="text-xs leading-relaxed text-secundario">La membresía conserva su precio y se habilita desde el primer abono, según las fechas elegidas. El saldo se controla por separado; no bloquea el ingreso automáticamente.</p>{abono && (recibido <= 0 || recibido >= total) && <p role="alert" className="text-sm text-vencido">El abono debe ser mayor que cero y menor al precio del plan. Para cancelar todo, elige «Pago completo».</p>}</>}
      </fieldset>

      <fieldset className="min-w-0 space-y-3 rounded-xl border border-borde p-4">
        <legend className="px-1 text-sm font-semibold">Inicio de la membresía</legend>
        <label className="block"><span className="etiqueta">Cómo calcular el inicio</span><select className="campo" value={fechaPersonalizada ? 'elegir' : 'automatico'} onChange={e => { setFechaPersonalizada(e.target.value === 'elegir'); setPreview(null); setApruebaFechas(false); setAcepta(false); }}><option value="automatico">Según la renovación habitual</option><option value="elegir">Elegir fecha anterior o posterior</option></select></label>
        {fechaPersonalizada && <><label className="block"><span className="etiqueta">Fecha de inicio acordada</span><input className="campo" type="date" value={fechaInicio} onChange={e => { setFechaInicio(e.target.value); setPreview(null); setApruebaFechas(false); setAcepta(false); }} /></label><label className="block"><span className="etiqueta">Motivo de la fecha especial</span><textarea className="campo min-h-24" minLength={5} maxLength={300} value={motivoFechas} onChange={e => { setMotivoFechas(e.target.value); setApruebaFechas(false); }} placeholder="Ej. Empezó a asistir el lunes y se registra hoy" /></label><label className="flex items-start gap-3 text-sm leading-relaxed text-secundario"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={apruebaFechas} onChange={e => setApruebaFechas(e.target.checked)} /><span>Apruebo expresamente esta fecha de inicio y he revisado la vigencia resultante. Quedará registrado con mi cuenta de personal.</span></label></>}
        <p className="text-xs leading-relaxed text-tenue">La fecha del pago es hoy, {fechaCorta(hoyLimaTexto())}. Cambiar el inicio no cambia el día en que se recibió el dinero.</p>
      </fieldset>

      <div>
        <label className="etiqueta">Metodo de pago</label>
        <select className="campo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          {METODOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-borde pt-4">
        <label className="etiqueta">Comprobante</label>
        <div className="flex flex-wrap gap-2">
          {['boleta', ...(ajustes?.emiteFactura ? ['factura'] : []), 'recibo'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTipoComprobante(t);
                if (t === 'factura') {
                  setTipoDoc('ruc');
                  setNumDoc('');
                } else if (tipoDoc === 'ruc') {
                  setTipoDoc(socio?.dni ? 'dni' : 'sin_documento');
                  setNumDoc(socio?.dni || '');
                }
              }}
              className={`min-h-11 min-w-0 flex-1 basis-24 rounded-xl border px-3 py-2 text-sm capitalize transition ${
                tipoComprobante === t
                  ? 'border-acento bg-acento/10 text-acentoTexto'
                  : 'border-borde text-secundario hover:text-tinta'
              }`}
            >
              {t === 'recibo' ? 'Recibo interno' : t}
            </button>
          ))}
        </div>
        {parcial && <p className="mt-2 text-sm leading-relaxed text-secundario">El comprobante corresponde al dinero recibido hoy e indica el plan contratado, lo abonado y el saldo. Los siguientes abonos se registran en esta misma membresía, sin volver a cobrar el plan completo.</p>}
        {!ajustes?.emiteFactura && (
          <p className="mt-2 text-sm text-tenue">
            El regimen actual no permite emitir factura. Se cambia en Ajustes.
          </p>
        )}
        {(tipoComprobante === 'recibo' || !ajustes?.emisionElectronica) && (
          <p className="mt-2 text-sm text-porvencer">
            Se guardará un recibo interno sin valor tributario. El registro del pago no sustituye la emisión fiscal. El laboratorio SUNAT BETA se administra por separado.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="etiqueta">Documento</label>
          <select
            className="campo"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value)}
            disabled={tipoComprobante === 'factura'}
          >
            {DOCUMENTOS.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.texto}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta">Numero</label>
          <input
            className="campo"
            value={numDoc}
            disabled={tipoDoc === 'sin_documento'}
            onChange={(e) => setNumDoc(e.target.value.trim())}
          />
        </div>
      </div>

      <div>
        <label className="etiqueta">
          {tipoComprobante === 'factura' ? 'Razon social' : 'Nombre del cliente'}
        </label>
        <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>

      {tipoComprobante === 'factura' && (
        <div>
          <label className="etiqueta">Direccion fiscal</label>
          <input className="campo" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </div>
      )}

      {faltaDocumento && (
        <p className="aviso-ojo">
          Por superar S/ {ajustes.umbralDocumento} la boleta necesita el documento del cliente.
        </p>
      )}

      {cargandoPreview && <p role="status" className="text-sm text-secundario">Calculando importe y fechas…</p>}
      {errorPreview && <div className="aviso-mal" role="alert"><p>{errorPreview}</p><button type="button" className="mt-2 underline underline-offset-4" onClick={() => setRevisionPreview((v) => v + 1)}>Volver a calcular</button></div>}
      {previewVigente && (
        <div className="rounded-xl bg-fondo/70 p-4 text-sm">
          <p className="text-secundario">Quedaria vigente</p>
          <p className="mt-1 font-medium">
            {fechaCorta(preview.inicio)} — {fechaCorta(preview.vence)}
          </p>
          {socio.limiteAsistencias != null && socio.asistenciasRestantes === 0 && <p className="mt-2 text-xs leading-relaxed text-porvencer">La membresía anterior ya agotó su cupo. Revisa las fechas de esta renovación; si ya hay una membresía programada, se respeta su orden.</p>}

          <dl className="mt-3 space-y-1 border-t border-borde pt-3">
            {aplicaIgv ? (
              <>
                <div className="flex justify-between text-secundario">
                  <dt>{parcial ? 'Valor de este pago' : 'Valor de venta'}</dt>
                  <dd className="cifra">{soles(desglose.gravado)}</dd>
                </div>
                <div className="flex justify-between text-secundario">
                  <dt>IGV {parcial ? 'de este pago ' : ''}({Math.round(ajustes.igvTasa * 100)}%)</dt>
                  <dd className="cifra">{soles(desglose.igv)}</dd>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-tenue">
                <dt>Operacion sin IGV</dt>
                <dd>{ajustes?.regimen === 'nrus' ? 'Nuevo RUS' : '—'}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-borde pt-2 text-lg font-bold text-tinta">
              <dt>Precio del plan</dt>
              <dd className="cifra">{soles(total)}</dd>
            </div>
            {parcial && <><div className="flex flex-wrap justify-between gap-2 pt-2"><dt>Recibido hoy</dt><dd className="cifra font-semibold">{soles(Number.isFinite(recibido) ? recibido : 0)}</dd></div><div className="flex flex-wrap justify-between gap-2 text-porvencer"><dt>Saldo pendiente</dt><dd className="cifra font-semibold">{soles(Number.isFinite(saldo) ? Math.max(0, saldo) : total)}</dd></div>{fechaLimiteSaldo && <div className="flex flex-wrap justify-between gap-2"><dt>Completar hasta</dt><dd>{fechaCorta(fechaLimiteSaldo)}</dd></div>}</>}
          </dl>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-secundario">
        <input
          type="checkbox"
          className="mt-1"
          checked={acepta}
          disabled={!previewVigente || cargandoPlanes || cargandoPreview || !!errorPreview || cobrando}
          onChange={(e) => setAcepta(e.target.checked)}
        />
        <span>
          El socio leyo y acepta las{' '}
          <Link href="/terminos" target="_blank" className="text-acentoTexto underline">
            condiciones de la membresia
          </Link>
          . Quedan registradas con el pago.
        </span>
      </label>

      {aviso && <p className="aviso-ok">{aviso}</p>}
      {error && <p role="alert" className="aviso-mal">{error}</p>}
      {op.error && <p role="alert" className="aviso-mal">{op.error}</p>}
      {op.bloqueo && <p role="alert" className="aviso-mal">{op.bloqueo}</p>}
      {op.pendiente && <p className="aviso-ojo">Hay una operación por verificar. Usa el aviso de la parte superior antes de registrar otro pago.</p>}

      {emitido && (
        <div className="rounded-xl border border-vigente/40 bg-vigente/10 p-3 text-sm">
          <p className="font-medium capitalize">
            {emitido.tipo} {emitido.serie}-{String(emitido.numero).padStart(6, '0')}
          </p>
          <p className="text-secundario">
            {emitido.estadoSunat === 'no_aplica'
              ? 'Recibo interno guardado, sin valor tributario ni envío a SUNAT.'
              : `SUNAT: ${emitido.estadoSunat}`}
          </p>
          <Link
            href={`/panel/comprobantes/${emitido.id}`}
            target="_blank"
            className="mt-2 inline-block text-acentoTexto underline"
          >
            Ver e imprimir
          </Link>
        </div>
      )}

      {pagoId && (
        <div className="space-y-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/[0.06] p-3">
          <p className="text-sm text-secundario">
            Puedes compartir su constancia de pago y la fecha de vencimiento por WhatsApp.
          </p>
          <EnviarWhatsapp paymentId={pagoId} />
        </div>
      )}

      <button className="boton w-full" disabled={!puedeCobrar} onClick={cobrar}>
        {cobrando ? 'Registrando…' : parcial ? `Registrar ${soles(Number.isFinite(recibido) ? recibido : 0)} y activar membresía` : 'Registrar pago y emitir'}
      </button>
      </fieldset>
    </div>
  );
}
