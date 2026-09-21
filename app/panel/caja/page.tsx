'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, descargar, fechaCorta, hora, soles } from '@/lib/api';

const METODOS = ['', 'efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'];
const hoyTexto = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

export default function Caja() {
  const [desde, setDesde] = useState(hoyTexto());
  const [hasta, setHasta] = useState(hoyTexto());
  const [metodo, setMetodo] = useState('');
  const [resumen, setResumen] = useState<any>(null);
  const [pagos, setPagos] = useState<any[]>([]);
  const [contado, setContado] = useState('');
  const [nota, setNota] = useState('');
  const [cierres, setCierres] = useState<any[]>([]);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const filtro = `desde=${desde}&hasta=${hasta}${metodo ? `&metodo=${metodo}` : ''}`;

  const cargar = useCallback(async () => {
    try {
      const [r, p, c]: any = await Promise.all([
        api(`/cash/summary?${filtro}`),
        api(`/cash/payments?${filtro}`),
        api('/cash/closes'),
      ]);
      setResumen(r);
      setPagos(p);
      setCierres(c);
    } catch (e: any) {
      setError(e.message);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cerrar() {
    setError('');
    setAviso('');
    try {
      const r: any = await api('/cash/close', {
        metodo: 'POST',
        cuerpo: { desde, hasta, montoContado: Number(contado), nota },
      });
      setAviso(
        r.diferencia === 0
          ? 'Caja cuadrada.'
          : `Cerrado con una diferencia de ${soles(r.diferencia)}.`,
      );
      setContado('');
      setNota('');
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  // El arqueo cuenta el efectivo del cajon; lo digital se concilia con el banco.
  const diferencia = contado === '' || !resumen ? null : Number(contado) - resumen.efectivo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="etiqueta" htmlFor="caja-desde">Desde</label>
          <input id="caja-desde" type="date" className="campo" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="caja-hasta">Hasta</label>
          <input id="caja-hasta" type="date" className="campo" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="caja-metodo">Metodo</label>
          <select id="caja-metodo" className="campo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {m || 'Todos'}
              </option>
            ))}
          </select>
        </div>
        <button
          className="boton-suave"
          onClick={() => descargar(`/cash/export?${filtro}`, `caja-${desde}.csv`)}
        >
          Exportar a Excel
        </button>
      </div>

      {error && <p className="aviso-mal">{error}</p>}

      {resumen && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              ['Total cobrado', soles(resumen.total)],
              ['Efectivo', soles(resumen.efectivo)],
              ['Digital', soles(resumen.digital)],
              ['Operaciones', resumen.operaciones],
            ].map(([t, v]) => (
              <div key={t as string} className="tarjeta-viva">
                <p className="text-sm text-zinc-400">{t}</p>
                <p className="mt-2 text-2xl font-black tracking-tight cifra">{v as any}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {[
              ['Por metodo', resumen.porMetodo],
              ['Por concepto', resumen.porConcepto],
              ['Por cajero', resumen.porCajero],
            ].map(([titulo, filas]: any) => (
              <div key={titulo} className="tarjeta">
                <h3 className="rotulo mb-3">
                  {titulo}
                </h3>
                {filas.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin movimientos.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {filas.map((f: any) => (
                      <li key={f.nombre} className="flex justify-between">
                        <span className="text-zinc-300">
                          {f.nombre} <span className="text-zinc-600">({f.operaciones})</span>
                        </span>
                        <span className="font-semibold cifra">{soles(f.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="rotulo mb-2">
            Movimientos
          </h2>
          {/* En el celular una tabla de 5 columnas obliga a hacer scroll lateral:
              cada movimiento pasa a ser una tarjeta con sus datos rotulados. */}
          <ul className="space-y-2 sm:hidden">
            {pagos.length === 0 && (
              <li className="tarjeta text-sm text-zinc-500">Sin movimientos en el rango.</li>
            )}
            {pagos.map((p) => (
              <li key={p.id} className="tarjeta p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{p.socio}</span>
                  <span className="font-black cifra">{soles(p.monto)}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-500 cifra">
                  {hora(p.fecha)} · {p.metodo} · {p.detalle}
                </p>
              </li>
            ))}
          </ul>

          <div className="tarjeta hidden max-h-[28rem] overflow-auto p-0 sm:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-superficie text-left text-zinc-500">
                <tr>
                  <th className="p-3 font-medium">Hora</th>
                  <th className="p-3 font-medium">Socio</th>
                  <th className="p-3 font-medium">Detalle</th>
                  <th className="p-3 font-medium">Metodo</th>
                  <th className="p-3 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {pagos.length === 0 && (
                  <tr>
                    <td className="p-4 text-zinc-500" colSpan={5}>
                      Sin movimientos en el rango.
                    </td>
                  </tr>
                )}
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 text-zinc-400 cifra">{hora(p.fecha)}</td>
                    <td className="p-3">{p.socio}</td>
                    <td className="p-3 text-zinc-400">{p.detalle}</td>
                    <td className="p-3 text-zinc-400">{p.metodo}</td>
                    <td className="p-3 text-right font-semibold cifra">{soles(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="tarjeta space-y-4">
            <h2 className="text-lg font-semibold">Arqueo de caja</h2>
            <p className="text-sm text-zinc-500">
              Cuenta el efectivo del cajon y anotalo. El sistema dice{' '}
              <span className="text-zinc-300">{soles(resumen?.efectivo ?? 0)}</span>.
            </p>
            <div>
              <label className="etiqueta" htmlFor="caja-contado">Efectivo contado</label>
              <input
                id="caja-contado"
                type="number"
                inputMode="decimal"
                step="0.10"
                className="campo"
                value={contado}
                onChange={(e) => setContado(e.target.value)}
              />
            </div>
            {diferencia !== null && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  Math.abs(diferencia) < 0.01
                    ? 'bg-vigente/10 text-vigente'
                    : 'bg-porvencer/10 text-porvencer'
                }`}
              >
                {Math.abs(diferencia) < 0.01
                  ? 'Cuadra exacto.'
                  : `${diferencia > 0 ? 'Sobra' : 'Falta'} ${soles(Math.abs(diferencia))}.`}
              </p>
            )}
            <div>
              <label className="etiqueta" htmlFor="caja-nota">Nota (opcional)</label>
              <input id="caja-nota" className="campo" value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
            {aviso && <p className="text-sm text-vigente">{aviso}</p>}
            <button className="boton w-full" disabled={contado === ''} onClick={cerrar}>
              Cerrar caja
            </button>
          </div>

          <div>
            <h2 className="rotulo mb-2">
              Cierres anteriores
            </h2>
            <div className="tarjeta p-0">
              <ul className="divide-y divide-borde">
                {cierres.length === 0 && (
                  <li className="p-4 text-sm text-zinc-500">Todavia no hay cierres.</li>
                )}
                {cierres.map((c) => (
                  <li key={c.id} className="p-3 text-sm">
                    <div className="flex justify-between">
                      <span>{fechaCorta(c.createdAt)}</span>
                      <span
                        className={
                          Math.abs(c.diferencia) < 0.01 ? 'text-vigente' : 'text-porvencer'
                        }
                      >
                        {soles(c.diferencia)}
                      </span>
                    </div>
                    <p className="text-zinc-500">
                      {c.cajero?.nombre ?? '—'} · sistema {soles(c.montoSistema)} · contado{' '}
                      {soles(c.montoContado)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
