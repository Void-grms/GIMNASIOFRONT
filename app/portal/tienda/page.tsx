'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, hora, leerToken, soles, urlArchivo } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';

const ESTADO: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: 'Te espera en recepcion', clase: 'text-acento' },
  entregado: { texto: 'Entregado', clase: 'text-vigente' },
  cancelado: { texto: 'Cancelado', clase: 'text-zinc-500' },
  vencido: { texto: 'Vencio sin recoger', clase: 'text-zinc-500' },
};

/**
 * Tienda del portal. El socio arma su pedido desde el celular (mientras
 * descansa entre series, por ejemplo) y lo paga y recoge en el mostrador. No
 * hay pago en linea: el pedido solo aparta los productos para que recepcion
 * lo tenga listo.
 */
export default function Tienda() {
  const router = useRouter();
  const [productos, setProductos] = useState<any[] | null>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [p, o]: any = await Promise.all([
      api('/portal/store', { sesion: 'socio' }),
      api('/portal/orders', { sesion: 'socio' }),
    ]);
    setProductos(p);
    setPedidos(o);
  }, []);

  useEffect(() => {
    if (!leerToken('socio')) {
      router.replace('/portal');
      return;
    }
    cargar().catch((e) => setError(e.message));
    // Si recepcion lo entrega o cancela, el estado cambia solo.
    const t = setInterval(() => cargar().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [router, cargar]);

  const sumar = (p: any, delta: number) =>
    setCarrito((c) => {
      const tope = p.esCasillero ? 1 : p.esServicio ? 10 : Math.min(10, p.disponible);
      return { ...c, [p.id]: Math.max(0, Math.min(tope, (c[p.id] || 0) + delta)) };
    });

  const lineas = (productos || []).filter((p) => carrito[p.id] > 0);
  const total = lineas.reduce((t, p) => t + p.precio * carrito[p.id], 0);

  async function pedir() {
    setEnviando(true);
    setError('');
    setAviso('');
    try {
      const pedido: any = await api('/portal/orders', {
        metodo: 'POST',
        sesion: 'socio',
        cuerpo: {
          items: lineas.map((p) => ({ productId: p.id, cantidad: carrito[p.id] })),
          ...(nota.trim() ? { nota: nota.trim() } : {}),
        },
      });
      setCarrito({});
      setNota('');
      setAviso(`Pedido #${pedido.codigo} listo. Acercate a recepcion para pagar y recogerlo.`);
      cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function cancelar(id: string) {
    if (!window.confirm('¿Cancelar este pedido?')) return;
    try {
      await api(`/portal/orders/${id}/cancel`, { metodo: 'POST', sesion: 'socio' });
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const pendientes = pedidos.filter((p) => p.estado === 'pendiente');
  const anteriores = pedidos.filter((p) => p.estado !== 'pendiente').slice(0, 5);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-36 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tienda</h1>
        <Link href="/portal/mi" className="text-sm text-zinc-400 hover:text-white">
          Volver
        </Link>
      </header>

      <p className="text-sm text-zinc-500">
        Pide desde aqui y paga en recepcion al recogerlo. Lo que pidas queda apartado por 12 horas.
        {productos?.some((p) => p.esCasillero) && ' El casillero te lo asignan con numero al pagar y se libera cuando marcas tu salida.'}
      </p>

      {aviso && <p className="aviso-ok">{aviso}</p>}
      {error && <p className="aviso-mal">{error}</p>}

      {pendientes.map((p) => (
        <div key={p.id} className="tarjeta-acento space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-black tracking-tight">
              Pedido <span className="cifra text-acento">#{p.codigo}</span>
            </p>
            <p className="font-bold cifra">{soles(p.total)}</p>
          </div>
          <ul className="text-sm text-zinc-300">
            {p.items.map((i: any) => (
              <li key={i.productId}>
                {i.cantidad}x {i.producto}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-zinc-500">
              Te espera en recepcion hasta las <span className="cifra">{hora(p.venceA)}</span>
            </p>
            <button className="text-xs text-zinc-400 underline hover:text-vencido" onClick={() => cancelar(p.id)}>
              Cancelar
            </button>
          </div>
        </div>
      ))}

      {productos === null ? (
        <Esqueleto filas={3} />
      ) : (
        <div className="tarjeta p-0">
          <ul className="divide-y divide-borde">
            {productos.length === 0 && (
              <li className="p-5 text-sm text-zinc-500">Todavia no hay productos a la venta.</li>
            )}
            {productos.map((p) => {
              const agotado = !p.esServicio && p.disponible <= 0;
              const cantidad = carrito[p.id] || 0;
              return (
                <li key={p.id} className={`flex items-center gap-3 p-4 ${agotado ? 'opacity-50' : ''}`}>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-borde bg-black/40">
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urlArchivo(p.fotoUrl)!} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="text-zinc-700" aria-hidden="true">
                        <path d="M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-sm text-zinc-500">
                      <span className="cifra">{soles(p.precio)}</span>
                      {p.esServicio ? null : agotado ? (
                        <span className="ml-2 text-vencido">agotado</span>
                      ) : p.disponible <= 3 ? (
                        <span className="ml-2 text-porvencer">quedan {p.disponible}</span>
                      ) : (
                        <span className="ml-2">quedan {p.disponible}</span>
                      )}
                    </p>
                  </div>
                  {!agotado && (
                    <div className="flex items-center gap-2">
                      {cantidad > 0 && (
                        <>
                          <button
                            className="boton-suave h-10 min-h-0 w-10 px-0"
                            aria-label={`Quitar ${p.nombre}`}
                            onClick={() => sumar(p, -1)}
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold cifra">{cantidad}</span>
                        </>
                      )}
                      <button
                        className="boton h-10 min-h-0 w-10 px-0"
                        aria-label={`Agregar ${p.nombre}`}
                        onClick={() => sumar(p, 1)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {anteriores.length > 0 && (
        <section>
          <h2 className="rotulo mb-2">Pedidos anteriores</h2>
          <div className="tarjeta p-0">
            <ul className="divide-y divide-borde">
              {anteriores.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="min-w-0 truncate text-zinc-300">
                    <span className="cifra text-zinc-500">#{p.codigo}</span>{' '}
                    {p.items.map((i: any) => `${i.cantidad}x ${i.producto}`).join(', ')}
                  </span>
                  <span className={`shrink-0 ${ESTADO[p.estado]?.clase}`}>{ESTADO[p.estado]?.texto}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {lineas.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-borde bg-[#0C0C0E]/95 backdrop-blur">
          <div className="mx-auto max-w-md space-y-3 px-4 pb-3 pt-3">
            <input
              className="campo py-2.5 text-sm"
              placeholder="Nota para recepcion (opcional)"
              maxLength={140}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
            <button className="boton w-full py-4" onClick={pedir} disabled={enviando}>
              {enviando ? 'Enviando…' : `Pedir · ${soles(total)}`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
