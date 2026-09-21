'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, hora, soles } from '@/lib/api';

const hoyTexto = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

const ESTADO: Record<string, string> = {
  no_aplica: 'text-zinc-500',
  pendiente: 'text-porvencer',
  aceptado: 'text-vigente',
  rechazado: 'text-vencido',
  enviado: 'text-zinc-300',
};

export default function Comprobantes() {
  const [desde, setDesde] = useState(hoyTexto());
  const [hasta, setHasta] = useState(hoyTexto());
  const [tipo, setTipo] = useState('');
  const [lista, setLista] = useState<any[]>([]);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLista(
        await api(`/receipts?desde=${desde}&hasta=${hasta}${tipo ? `&tipo=${tipo}` : ''}`),
      );
    } catch (e: any) {
      setError(e.message);
    }
  }, [desde, hasta, tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function anular(id: string) {
    const motivo = window.prompt('Un comprobante emitido no se borra, se anula. Motivo:');
    if (!motivo) return;
    try {
      await api(`/receipts/${id}/anular`, { metodo: 'POST', cuerpo: { motivo } });
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="etiqueta">Desde</label>
          <input type="date" className="campo" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta">Hasta</label>
          <input type="date" className="campo" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta">Tipo</label>
          <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="boleta">Boleta</option>
            <option value="factura">Factura</option>
            <option value="recibo">Recibo interno</option>
          </select>
        </div>
      </div>

      {error && <p className="aviso-mal">{error}</p>}

      <ul className="space-y-2 sm:hidden">
        {lista.length === 0 && (
          <li className="tarjeta text-sm text-zinc-500">Sin comprobantes en el rango.</li>
        )}
        {lista.map((c) => (
          <li key={c.id} className={`tarjeta p-4 ${c.anulado ? 'opacity-50' : ''}`}>
            <div className="flex items-baseline justify-between gap-3">
              <Link
                href={`/panel/comprobantes/${c.id}`}
                target="_blank"
                className="font-semibold capitalize hover:underline"
              >
                {c.tipo} {c.serie}-{String(c.numero).padStart(6, '0')}
              </Link>
              <span className="font-black cifra">{soles(c.total)}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {c.clienteNombre} · <span className="cifra">{hora(c.emitidoAt)}</span> ·{' '}
              <span className={ESTADO[c.estadoSunat] || 'text-zinc-500'}>
                {c.anulado ? 'anulado' : c.estadoSunat.replace('_', ' ')}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <div className="tarjeta hidden p-0 sm:block">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500">
            <tr>
              <th className="p-3 font-medium">Comprobante</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Hora</th>
              <th className="p-3 font-medium">SUNAT</th>
              <th className="p-3 text-right font-medium">Total</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {lista.length === 0 && (
              <tr>
                <td className="p-4 text-zinc-500" colSpan={6}>
                  Sin comprobantes en el rango.
                </td>
              </tr>
            )}
            {lista.map((c) => (
              <tr key={c.id} className={c.anulado ? 'opacity-50' : ''}>
                <td className="p-3">
                  <Link
                    href={`/panel/comprobantes/${c.id}`}
                    target="_blank"
                    className="font-medium capitalize hover:underline"
                  >
                    {c.tipo} {c.serie}-{String(c.numero).padStart(6, '0')}
                  </Link>
                  {c.anulado && <span className="ml-2 text-vencido">anulado</span>}
                </td>
                <td className="p-3">
                  {c.clienteNombre}
                  {c.clienteNumDoc && <span className="text-zinc-500"> · {c.clienteNumDoc}</span>}
                </td>
                <td className="p-3 text-zinc-400 cifra">{hora(c.emitidoAt)}</td>
                <td className={`p-3 ${ESTADO[c.estadoSunat] || 'text-zinc-500'}`}>
                  {c.estadoSunat.replace('_', ' ')}
                </td>
                <td className="p-3 text-right font-semibold cifra">{soles(c.total)}</td>
                <td className="p-3 text-right">
                  {!c.anulado && (
                    <button className="text-sm text-zinc-500 hover:text-vencido" onClick={() => anular(c.id)}>
                      Anular
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
