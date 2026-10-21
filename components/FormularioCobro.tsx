'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta, soles } from '@/lib/api';
import { EnviarWhatsapp } from './EnviarWhatsapp';

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
    api(`/memberships/preview?memberId=${encodeURIComponent(memberId)}&planId=${encodeURIComponent(planId)}`)
      .then((p) => {
        if (!vigente) return;
        if (!/^[a-f0-9]{64}$/i.test(p.versionOferta || '')) throw new Error('No se pudieron validar las condiciones del plan. Vuelve a calcular antes de cobrar.');
        setPreview({ ...p, memberId, planId });
        setPlanes((actuales) => actuales.map((actual) => actual.id === planId ? {
          ...actual, nombre: p.plan, precio: p.precio, duracionDias: p.duracionDias,
          limiteAsistencias: p.limiteAsistencias, descripcion: p.descripcion, esPromocion: p.esPromocion,
        } : actual));
      })
      .catch((e) => { if (vigente) setErrorPreview(e.message); })
      .finally(() => { if (vigente) setCargandoPreview(false); });
    return () => { vigente = false; };
  }, [planId, socio?.id, cargandoPlanes, revisionPreview]);

  const plan = planes.find((p) => p.id === planId);
  const previewVigente = !!preview && !cargandoPlanes && preview.memberId === socio?.id && preview.planId === planId;
  const oferta = previewVigente ? preview : null;
  const total = previewVigente ? preview.precio : 0;
  const aplicaIgv = !!ajustes?.aplicaIgv && tipoComprobante !== 'recibo';

  // El precio de lista ya incluye IGV, asi que se desagrega hacia atras.
  const desglose = useMemo(() => {
    if (!aplicaIgv) return { gravado: 0, igv: 0, total };
    const gravado = Math.round((total / (1 + ajustes.igvTasa)) * 100) / 100;
    return { gravado, igv: Math.round((total - gravado) * 100) / 100, total };
  }, [total, aplicaIgv, ajustes?.igvTasa]);

  const necesitaDocumento = total > (ajustes?.umbralDocumento ?? 700);
  const faltaDocumento =
    tipoComprobante === 'boleta' && necesitaDocumento && tipoDoc === 'sin_documento';
  const facturaIncompleta =
    tipoComprobante === 'factura' && (tipoDoc !== 'ruc' || !numDoc || !nombre || !direccion);

  const puedeCobrar = !!plan && previewVigente && !cargandoPlanes && !cargandoPreview && !errorPlanes && !errorPreview && acepta && !faltaDocumento && !facturaIncompleta && !cobrando;

  async function cobrar() {
    if (!puedeCobrar || cobroEnCurso.current) return;
    cobroEnCurso.current = true;
    setError('');
    setAviso('');
    setCobrando(true);
    try {
      const r: any = await api('/memberships', {
        metodo: 'POST',
        cuerpo: {
          memberId: socio.id,
          planId,
          versionOferta: preview.versionOferta,
          metodo,
          aceptaTerminos: acepta,
          comprobante: {
            tipo: tipoComprobante,
            clienteTipoDoc: tipoDoc,
            clienteNumDoc: tipoDoc === 'sin_documento' ? undefined : numDoc,
            clienteNombre: nombre,
            clienteDireccion: direccion || undefined,
          },
        },
      });
      setAviso(`Cobrado. Vigencia del ${fechaCorta(r.inicio)} al ${fechaCorta(r.vence)}.`);
      setEmitido(r.comprobante);
      setPagoId(r.paymentId ?? null);
      if (r.errorComprobante) {
        setError(`El pago quedo registrado, pero el comprobante no se emitio: ${r.errorComprobante}`);
      }
      setAcepta(false);
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
                  <dt>Valor de venta</dt>
                  <dd className="cifra">{soles(desglose.gravado)}</dd>
                </div>
                <div className="flex justify-between text-secundario">
                  <dt>IGV ({Math.round(ajustes.igvTasa * 100)}%)</dt>
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
              <dt>Total</dt>
              <dd className="cifra">{soles(total)}</dd>
            </div>
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
        {cobrando ? 'Cobrando...' : 'Registrar pago y emitir'}
      </button>
    </div>
  );
}
