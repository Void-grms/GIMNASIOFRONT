import { soles } from '@/lib/api';

/**
 * Hoja del comprobante: la misma en el panel (para imprimir) y en el enlace
 * que recibe el socio por WhatsApp. Va siempre en blanco y negro.
 */
export function HojaComprobante({
  c,
  razonSocial,
  esTicket = false,
}: {
  c: any;
  razonSocial?: string;
  esTicket?: boolean;
}) {
  const numero = `${c.serie}-${String(c.numero).padStart(6, '0')}`;
  return (
    <article className={`hoja rounded-2xl border border-borde bg-white text-black ${esTicket ? 'p-4 text-sm' : 'p-8'}`}>
      <header
        className={`border-b border-zinc-300 pb-4 ${
          esTicket ? 'text-center' : 'flex items-start justify-between gap-6'
        }`}
      >
        <div>
          <h1 className={esTicket ? 'text-base font-black' : 'text-xl font-black'}>
            {c.emisorRazon || razonSocial}
          </h1>
          <p className="text-xs">{c.emisorDireccion}</p>
          {c.emisorRuc && <p className="text-xs">RUC {c.emisorRuc}</p>}
        </div>
        <div
          className={`shrink-0 border-2 border-black text-center ${
            esTicket ? 'mt-2 px-2 py-1' : 'rounded-xl px-4 py-3'
          }`}
        >
          <p className="text-xs font-bold uppercase">
            {c.tipo === 'recibo' ? 'Recibo interno' : `${c.tipo} electronica`}
          </p>
          <p className={esTicket ? 'text-base font-black' : 'text-lg font-black'}>{numero}</p>
        </div>
      </header>

      {c.anulado && (
        <p className="mt-4 rounded border-2 border-red-600 p-2 text-center font-bold text-red-600">
          ANULADO — {c.motivoAnulacion}
        </p>
      )}

      <dl className={`mt-4 gap-x-6 gap-y-1 text-xs ${esTicket ? 'space-y-1' : 'grid grid-cols-2 text-sm'}`}>
        <div className="col-span-2 flex gap-2">
          <dt className="font-semibold">Cliente:</dt>
          <dd>{c.clienteNombre}</dd>
        </div>
        {c.clienteNumDoc && (
          <div className="flex gap-2">
            <dt className="font-semibold">{c.clienteTipoDoc.toUpperCase()}:</dt>
            <dd>{c.clienteNumDoc}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="font-semibold">Fecha:</dt>
          <dd>{new Date(c.emitidoAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</dd>
        </div>
        {c.clienteDireccion && (
          <div className="col-span-2 flex gap-2">
            <dt className="font-semibold">Direccion:</dt>
            <dd>{c.clienteDireccion}</dd>
          </div>
        )}
      </dl>

      <table className={`mt-5 w-full ${esTicket ? 'text-xs' : 'text-sm'}`}>
        <thead className="border-y border-zinc-300 text-left">
          <tr>
            <th className="py-2">Descripcion</th>
            <th className="py-2 text-right">Cant.</th>
            <th className="solo-a4 py-2 text-right">P. unit.</th>
            <th className="py-2 text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {c.items.map((i: any) => (
            <tr key={i.id} className="border-b border-zinc-200">
              <td className="py-2">{i.descripcion}</td>
              <td className="py-2 text-right">{i.cantidad}</td>
              <td className="solo-a4 py-2 text-right">{soles(i.precioUnitario)}</td>
              <td className="py-2 text-right">{soles(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={`mt-4 ml-auto space-y-1 ${esTicket ? 'w-full text-xs' : 'w-64 text-sm'}`}>
        {c.igv > 0 ? (
          <>
            <div className="flex justify-between">
              <span>Valor de venta</span>
              <span>{soles(c.gravado)}</span>
            </div>
            <div className="flex justify-between">
              <span>IGV ({Math.round(c.igvTasa * 100)}%)</span>
              <span>{soles(c.igv)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-zinc-600">
            <span>Operacion sin IGV</span>
            <span>{soles(c.inafecto)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-zinc-400 pt-1 text-lg font-bold">
          <span>Total</span>
          <span>{soles(c.total)}</span>
        </div>
      </div>

      <footer className={`mt-6 border-t border-zinc-300 pt-3 text-zinc-600 ${esTicket ? 'text-[10px] text-center' : 'text-xs'}`}>
        {c.tipo === 'recibo' ? (
          <p>Documento interno sin valor tributario.</p>
        ) : (
          <p>
            Representacion impresa del comprobante electronico.
            {c.estadoSunat === 'no_aplica'
              ? ' Pendiente de envio electronico a SUNAT.'
              : ` Estado ante SUNAT: ${c.estadoSunat}.`}
          </p>
        )}
        {c.sunatHash && <p className="mt-1">Hash: {c.sunatHash}</p>}
        <p className="mt-2">
          Conforme a la ley tienes derecho a un Libro de Reclamaciones. Disponible en recepcion y
          en la web del gimnasio.
        </p>
      </footer>
    </article>
  );
}
