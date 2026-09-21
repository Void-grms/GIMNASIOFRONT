'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta, soles } from '@/lib/api';

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

  const [tipoComprobante, setTipoComprobante] = useState('boleta');
  const [tipoDoc, setTipoDoc] = useState('dni');
  const [numDoc, setNumDoc] = useState(socio?.dni || '');
  const [nombre, setNombre] = useState(socio?.nombreCompleto || '');
  const [direccion, setDireccion] = useState('');
  const [acepta, setAcepta] = useState(false);

  const [emitido, setEmitido] = useState<any>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [cobrando, setCobrando] = useState(false);

  useEffect(() => {
    api('/plans').then((p: any) => {
      setPlanes(p);
      if (p[0]) setPlanId((actual) => actual || p[0].id);
    });
  }, []);

  useEffect(() => {
    if (!planId || !socio?.id) return;
    api(`/memberships/preview?memberId=${socio.id}&planId=${planId}`)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [planId, socio?.id]);

  const total = preview?.precio ?? 0;
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

  const puedeCobrar = !!planId && acepta && !faltaDocumento && !facturaIncompleta && !cobrando;

  async function cobrar() {
    setError('');
    setAviso('');
    setCobrando(true);
    try {
      const r: any = await api('/memberships', {
        metodo: 'POST',
        cuerpo: {
          memberId: socio.id,
          planId,
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
      if (r.errorComprobante) {
        setError(`El pago quedo registrado, pero el comprobante no se emitio: ${r.errorComprobante}`);
      }
      setAcepta(false);
      onCobrado();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCobrando(false);
    }
  }

  return (
    <div className="tarjeta-acento h-fit space-y-4">
      <h2 className="text-lg font-semibold">Cobrar membresia</h2>

      <div>
        <label className="etiqueta">Plan</label>
        <select className="campo" value={planId} onChange={(e) => setPlanId(e.target.value)}>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} — {soles(p.precio)} / {p.duracionDias} dia(s)
            </option>
          ))}
        </select>
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
        <div className="flex gap-2">
          {['boleta', ...(ajustes?.emiteFactura ? ['factura'] : []), 'recibo'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTipoComprobante(t);
                if (t === 'factura') setTipoDoc('ruc');
                else if (tipoDoc === 'ruc') setTipoDoc('dni');
              }}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize transition ${
                tipoComprobante === t
                  ? 'border-acento bg-acento/10 text-acento'
                  : 'border-borde text-zinc-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {!ajustes?.emiteFactura && (
          <p className="mt-2 text-sm text-zinc-500">
            El regimen actual no permite emitir factura. Se cambia en Ajustes.
          </p>
        )}
        {tipoComprobante === 'recibo' && (
          <p className="mt-2 text-sm text-porvencer">
            El recibo interno no tiene valor tributario. Usalo solo si el gimnasio todavia no emite
            comprobantes.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
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

      {preview && (
        <div className="rounded-xl bg-black/40 p-4 text-sm">
          <p className="text-zinc-400">Quedaria vigente</p>
          <p className="mt-1 font-medium">
            {fechaCorta(preview.inicio)} — {fechaCorta(preview.vence)}
          </p>

          <dl className="mt-3 space-y-1 border-t border-borde pt-3">
            {aplicaIgv ? (
              <>
                <div className="flex justify-between text-zinc-400">
                  <dt>Valor de venta</dt>
                  <dd className="cifra">{soles(desglose.gravado)}</dd>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <dt>IGV ({Math.round(ajustes.igvTasa * 100)}%)</dt>
                  <dd className="cifra">{soles(desglose.igv)}</dd>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-zinc-500">
                <dt>Operacion sin IGV</dt>
                <dd>{ajustes?.regimen === 'nrus' ? 'Nuevo RUS' : '—'}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-borde pt-2 text-lg font-bold text-zinc-100">
              <dt>Total</dt>
              <dd className="cifra">{soles(total)}</dd>
            </div>
          </dl>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          className="mt-1"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
        />
        <span>
          El socio leyo y acepta las{' '}
          <Link href="/terminos" target="_blank" className="text-acento underline">
            condiciones de la membresia
          </Link>
          . Quedan registradas con el pago.
        </span>
      </label>

      {aviso && <p className="aviso-ok">{aviso}</p>}
      {error && <p className="aviso-mal">{error}</p>}

      {emitido && (
        <div className="rounded-xl border border-vigente/40 bg-vigente/10 p-3 text-sm">
          <p className="font-medium capitalize">
            {emitido.tipo} {emitido.serie}-{String(emitido.numero).padStart(6, '0')}
          </p>
          <p className="text-zinc-400">
            {emitido.estadoSunat === 'no_aplica'
              ? 'Guardado en el sistema, sin envio electronico.'
              : `SUNAT: ${emitido.estadoSunat}`}
          </p>
          <Link
            href={`/panel/comprobantes/${emitido.id}`}
            target="_blank"
            className="mt-2 inline-block text-acento underline"
          >
            Ver e imprimir
          </Link>
        </div>
      )}

      <button className="boton w-full" disabled={!puedeCobrar} onClick={cobrar}>
        {cobrando ? 'Cobrando...' : 'Registrar pago y emitir'}
      </button>
    </div>
  );
}
