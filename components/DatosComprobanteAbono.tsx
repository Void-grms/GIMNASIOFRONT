'use client';

export type DatosComprobante = { tipo: string; clienteTipoDoc: string; clienteNumDoc: string; clienteNombre: string; clienteDireccion: string };
export function comprobanteDeSocio(socio: any): DatosComprobante {
  return { tipo: 'boleta', clienteTipoDoc: socio.dni ? 'dni' : 'sin_documento', clienteNumDoc: socio.dni || '', clienteNombre: socio.nombreCompleto || '', clienteDireccion: '' };
}
export function comprobanteValido(c: DatosComprobante, monto: number, ajustes: any) {
  if (!c.clienteNombre.trim()) return false;
  if (c.tipo === 'factura') return c.clienteTipoDoc === 'ruc' && /^\d{11}$/.test(c.clienteNumDoc) && !!c.clienteDireccion.trim();
  return !(c.tipo === 'boleta' && monto > (ajustes?.umbralDocumento ?? 700) && c.clienteTipoDoc === 'sin_documento');
}

export function DatosComprobanteAbono({ valor: c, onChange, ajustes, socio, monto }: { valor: DatosComprobante; onChange: (c: DatosComprobante) => void; ajustes: any; socio: any; monto: number }) {
  function elegir(tipo: string) {
    const base = comprobanteDeSocio(socio);
    onChange(tipo === 'factura' ? { ...c, tipo, clienteTipoDoc: 'ruc', clienteNumDoc: '', clienteDireccion: '' } : { ...c, tipo, ...(c.clienteTipoDoc === 'ruc' ? { clienteTipoDoc: base.clienteTipoDoc, clienteNumDoc: base.clienteNumDoc } : {}) });
  }
  return <fieldset className="min-w-0 space-y-3 rounded-xl border border-borde p-3">
    <legend className="px-1 text-sm font-semibold">Comprobante de este abono</legend>
    <label className="block"><span className="etiqueta">Tipo de comprobante del abono</span><select className="campo" value={c.tipo} onChange={e => elegir(e.target.value)}><option value="boleta">Boleta</option>{ajustes?.emiteFactura && <option value="factura">Factura</option>}<option value="recibo">Recibo interno</option></select></label>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block"><span className="etiqueta">Documento del comprobante</span><select className="campo" disabled={c.tipo === 'factura'} value={c.clienteTipoDoc} onChange={e => onChange({ ...c, clienteTipoDoc: e.target.value, clienteNumDoc: '' })}><option value="dni">DNI</option><option value="ruc">RUC</option><option value="ce">Carné de extranjería</option><option value="pasaporte">Pasaporte</option><option value="sin_documento">Sin documento</option></select></label><label className="block"><span className="etiqueta">Número de documento del comprobante</span><input className="campo" disabled={c.clienteTipoDoc === 'sin_documento'} inputMode={['dni', 'ruc'].includes(c.clienteTipoDoc) ? 'numeric' : 'text'} value={c.clienteNumDoc} onChange={e => onChange({ ...c, clienteNumDoc: e.target.value.trim() })} /></label></div>
    <label className="block"><span className="etiqueta">{c.tipo === 'factura' ? 'Razón social del comprobante' : 'Nombre del comprobante'}</span><input className="campo" required value={c.clienteNombre} onChange={e => onChange({ ...c, clienteNombre: e.target.value })} /></label>
    {c.tipo === 'factura' && <label className="block"><span className="etiqueta">Dirección fiscal del comprobante</span><input className="campo" required value={c.clienteDireccion} onChange={e => onChange({ ...c, clienteDireccion: e.target.value })} /></label>}
    {c.tipo === 'boleta' && monto > (ajustes?.umbralDocumento ?? 700) && c.clienteTipoDoc === 'sin_documento' && <p role="alert" className="text-sm text-porvencer">Por este importe, la boleta requiere identificar al cliente con su documento.</p>}
    {(c.tipo === 'recibo' || !ajustes?.emisionElectronica) && <p className="text-xs leading-relaxed text-porvencer">Se guardará un recibo interno sin valor tributario. El registro del abono no sustituye la emisión fiscal. El laboratorio SUNAT BETA se administra por separado.</p>}
    <p className="text-xs leading-relaxed text-secundario">Se documenta únicamente este abono. El precio del plan, el acumulado pagado y el saldo quedan indicados como referencia de la membresía.</p>
  </fieldset>;
}
