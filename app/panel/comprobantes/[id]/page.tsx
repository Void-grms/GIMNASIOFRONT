'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, soles } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';
import { HojaComprobante } from '@/components/HojaComprobante';

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

      <HojaComprobante c={c} razonSocial={ajustes?.razonSocial} esTicket={esTicket} />
    </main>
  );
}
