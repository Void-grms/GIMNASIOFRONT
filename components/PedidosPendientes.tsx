'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, hora, soles } from '@/lib/api';

const METODOS = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'];

/**
 * Pedidos que los socios hicieron desde el portal. Cobrar aqui es una venta
 * normal: descuenta stock, entra a la caja y emite el comprobante.
 */
export function PedidosPendientes({
  ocultarVacio = false,
  onCobrado,
}: {
  ocultarVacio?: boolean;
  /** Para que la pantalla que lo contiene refresque su stock. */
  onCobrado?: () => void;
}) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [metodo, setMetodo] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setPedidos(await api('/orders'));
    } catch {
      /* la pantalla sigue usable aunque esto falle */
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
  }, [cargar]);

  async function entregar(p: any) {
    setOcupado(p.id);
    setError('');
    setAviso('');
    try {
      const r: any = await api(`/orders/${p.id}/deliver`, {
        metodo: 'POST',
        cuerpo: { metodo: metodo[p.id] || 'efectivo' },
      });
      setAviso(
        `Pedido #${p.codigo} cobrado (${soles(r.total)}) y entregado.` +
          (r.errorComprobante ? ` Ojo: ${r.errorComprobante}` : ''),
      );
      cargar();
      onCobrado?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado('');
    }
  }

  async function cancelar(p: any) {
    if (!window.confirm(`¿Cancelar el pedido #${p.codigo} de ${p.socio?.nombreCompleto}?`)) return;
    try {
      await api(`/orders/${p.id}/cancel`, { metodo: 'POST' });
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (ocultarVacio && pedidos.length === 0 && !aviso && !error) return null;

  return (
    <section className="space-y-3">
      <h2 className="rotulo">
        Pedidos del portal
        {pedidos.length > 0 && <span className="ml-2 text-acento">{pedidos.length}</span>}
      </h2>
      {aviso && <p className="aviso-ok">{aviso}</p>}
      {error && <p className="aviso-mal">{error}</p>}
      {pedidos.length === 0 && (
        <div className="tarjeta text-sm text-zinc-500">
          Cuando un socio pida algo desde su celular, aparece aqui para cobrarlo al entregarlo.
        </div>
      )}
      {pedidos.map((p) => (
        <div key={p.id} className="tarjeta-acento space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate font-bold">{p.socio?.nombreCompleto}</p>
            <p className="shrink-0 text-sm text-zinc-500 cifra">
              #{p.codigo} · {hora(p.creado)}
            </p>
          </div>
          <ul className="text-sm text-zinc-300">
            {p.items.map((i: any) => (
              <li key={i.productId} className="flex justify-between">
                <span>
                  {i.cantidad}x {i.producto}
                </span>
                <span className="cifra text-zinc-500">{soles(i.cantidad * i.precioUnitario)}</span>
              </li>
            ))}
          </ul>
          {p.nota && <p className="text-sm italic text-zinc-400">“{p.nota}”</p>}
          {/* Botones y no un select: en recepcion el foco vuelve solo al campo
              del lector, y un select abierto se cerraria al instante. */}
          <div className="flex flex-wrap gap-1.5 border-t border-borde pt-3" role="radiogroup" aria-label="Metodo de pago">
            {METODOS.map((m) => {
              const elegido = (metodo[p.id] || 'efectivo') === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={elegido}
                  onClick={() => setMetodo({ ...metodo, [p.id]: m })}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize transition ${
                    elegido
                      ? 'border-acento/50 bg-acento/15 text-acento'
                      : 'border-borde text-zinc-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto text-xl font-black cifra">{soles(p.total)}</span>
            <button className="boton py-2" disabled={ocupado === p.id} onClick={() => entregar(p)}>
              {ocupado === p.id ? 'Cobrando…' : 'Cobrar y entregar'}
            </button>
            <button className="boton-suave py-2" onClick={() => cancelar(p)}>
              Cancelar
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
