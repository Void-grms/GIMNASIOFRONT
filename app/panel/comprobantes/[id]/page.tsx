'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, soles } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';

/** Comprobante imprimible. Se imprime en blanco para no gastar toner. */
/** Anchos reales del papel termico que usan los mostradores. */
const FORMATOS = {
  a4: { etiqueta: 'A4', ancho: '210mm', clase: 'max-w-2xl' },
  '80': { etiqueta: 'Ticket 80 mm', ancho: '80mm', clase: 'max-w-[80mm]' },
  '58': { etiqueta: 'Ticket 58 mm', ancho: '58mm', clase: 'max-w-[58mm]' },
};

export default function VerComprobante() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null);
  const [ajustes, setAjustes] = useState<any>(null);
  const [formato, setFormato] = useState<'a4' | '80' | '58'>('80');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api(`/receipts/${id}`), api('/settings')])
      .then(([r, a]: any) => {
        setC(r);
        setAjustes(a);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <main className="p-8 text-vencido">{error}</main>;
  if (!c) return <main className="p-6"><Esqueleto filas={2} /></main>;

  const numero = `${c.serie}-${String(c.numero).padStart(6, '0')}`;

  const esTicket = formato !== 'a4';

  return (
    <main className={`mx-auto p-6 print:p-0 ${FORMATOS[formato].clase}`}>
      {/* La impresora termica no tiene margenes ni tamano de pagina: hay que
          decirselo, o saca el ticket cortado o con media hoja en blanco. */}
      <style>{`
        @page { size: ${FORMATOS[formato].ancho} auto; margin: ${esTicket ? '2mm' : '12mm'}; }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-imprimir { display: none !important; }
          .hoja { border: none !important; box-shadow: none !important; border-radius: 0 !important;
                  padding: ${esTicket ? '0' : '2rem'} !important; width: 100% !important; }
          ${esTicket ? '.hoja { font-size: 11px; line-height: 1.35; }' : ''}
          ${esTicket ? '.solo-a4 { display: none !important; }' : ''}
        }
      `}</style>

      <div className="no-imprimir mb-4 flex flex-wrap items-center justify-between gap-3">
        <a href="/panel/comprobantes" className="text-sm text-zinc-400 hover:text-white">
          Volver
        </a>
        <div className="flex items-center gap-2">
          <select
            className="campo w-auto py-2 text-sm"
            value={formato}
            onChange={(e) => setFormato(e.target.value as any)}
          >
            {Object.entries(FORMATOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.etiqueta}
              </option>
            ))}
          </select>
          <button className="boton" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
      </div>

      <article className={`hoja rounded-2xl border border-borde bg-white text-black ${esTicket ? 'p-4 text-sm' : 'p-8'}`}>
        <header
          className={`border-b border-zinc-300 pb-4 ${
            esTicket ? 'text-center' : 'flex items-start justify-between gap-6'
          }`}
        >
          <div>
            <h1 className={esTicket ? 'text-base font-black' : 'text-xl font-black'}>
              {c.emisorRazon || ajustes?.razonSocial}
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
    </main>
  );
}
