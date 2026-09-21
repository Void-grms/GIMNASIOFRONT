'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, hora, soles } from '@/lib/api';
import { PedidosPendientes } from '@/components/PedidosPendientes';

const METODOS = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'];

export default function Productos() {
  const [productos, setProductos] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [metodo, setMetodo] = useState('efectivo');
  const [dni, setDni] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [p, v]: any = await Promise.all([api('/products?todos=1'), api('/sales')]);
    setProductos(p);
    setVentas(v);
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  const total = productos.reduce(
    (suma, p) => suma + (carrito[p.id] || 0) * p.precio,
    0,
  );
  const hayCarrito = Object.values(carrito).some((c) => c > 0);

  function sumar(id: string, delta: number) {
    setCarrito((c) => {
      const cantidad = Math.max(0, (c[id] || 0) + delta);
      return { ...c, [id]: cantidad };
    });
  }

  async function cobrar() {
    setError('');
    setAviso('');
    try {
      let memberId: string | undefined;
      if (dni.trim()) {
        const encontrados: any = await api(`/members?q=${dni.trim()}`);
        if (!encontrados.length) throw new Error(`Sin socio con DNI ${dni}`);
        memberId = encontrados[0].id;
      }
      const items = Object.entries(carrito)
        .filter(([, cantidad]) => cantidad > 0)
        .map(([productId, cantidad]) => ({ productId, cantidad }));

      const venta: any = await api('/sales', {
        metodo: 'POST',
        cuerpo: { items, metodo, memberId },
      });
      setAviso(`Venta registrada por ${soles(venta.total)}.`);
      setCarrito({});
      setDni('');
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        <PedidosPendientes ocultarVacio onCobrado={() => cargar().catch(() => {})} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Catalogo</h2>
          <button className="boton-suave" onClick={() => setNuevo((v) => !v)}>
            {nuevo ? 'Cerrar' : 'Nuevo producto'}
          </button>
        </div>

        {nuevo && (
          <FormularioProducto
            onListo={() => {
              setNuevo(false);
              cargar();
            }}
          />
        )}

        <div className="tarjeta p-0">
          <ul className="divide-y divide-borde">
            {productos.length === 0 && (
              <li className="p-5 text-sm text-zinc-500">Todavia no hay productos.</li>
            )}
            {productos.map((p) => {
              const bajo = !p.esServicio && p.stock <= p.stockMinimo;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {p.nombre}
                      {!p.activo && <span className="ml-2 text-sm text-zinc-500">(inactivo)</span>}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {soles(p.precio)}
                      {p.esServicio ? ' · servicio' : ` · stock ${p.stock}`}
                      {bajo && <span className="ml-2 text-porvencer">reponer</span>}
                    </p>
                  </div>

                  {!p.esServicio && (
                    <div className="flex items-center gap-1">
                      <button
                        className="boton-suave px-2 py-1"
                        title="Ajustar inventario"
                        onClick={() =>
                          api(`/products/${p.id}/stock`, { metodo: 'POST', cuerpo: { cantidad: -1 } })
                            .then(cargar)
                            .catch((e) => setError(e.message))
                        }
                      >
                        −
                      </button>
                      <button
                        className="boton-suave px-2 py-1"
                        onClick={() =>
                          api(`/products/${p.id}/stock`, { metodo: 'POST', cuerpo: { cantidad: 1 } })
                            .then(cargar)
                            .catch((e) => setError(e.message))
                        }
                      >
                        +
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button className="boton-suave px-3 py-1" onClick={() => sumar(p.id, -1)}>
                      −
                    </button>
                    <span className="w-6 text-center font-medium">{carrito[p.id] || 0}</span>
                    <button className="boton px-3 py-1" onClick={() => sumar(p.id, 1)}>
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <section>
          <h2 className="rotulo mb-2">
            Ventas de hoy
          </h2>
          <div className="tarjeta p-0">
            <ul className="divide-y divide-borde">
              {ventas.length === 0 && (
                <li className="p-4 text-sm text-zinc-500">Sin ventas todavia.</li>
              )}
              {ventas.map((v) => (
                <li key={v.id} className="p-3 text-sm">
                  <div className="flex justify-between">
                    <span>{v.socio}</span>
                    <span className="font-medium">{soles(v.total)}</span>
                  </div>
                  <p className="text-zinc-500">
                    {hora(v.fecha)} · {v.metodo} ·{' '}
                    {v.items.map((i: any) => `${i.cantidad}x ${i.producto}`).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <aside className="tarjeta-acento h-fit space-y-4">
        <h2 className="text-lg font-semibold">Venta rapida</h2>

        {!hayCarrito ? (
          <p className="text-sm text-zinc-500">
            Suma productos con el boton + y cobra aqui. Si no pones DNI, la venta queda a nombre de
            un visitante.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {productos
              .filter((p) => carrito[p.id] > 0)
              .map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {carrito[p.id]}x {p.nombre}
                  </span>
                  <span>{soles(carrito[p.id] * p.precio)}</span>
                </li>
              ))}
          </ul>
        )}

        <div className="border-t border-borde pt-3 text-2xl font-black cifra">{soles(total)}</div>

        <div>
          <label className="etiqueta">DNI del socio (opcional)</label>
          <input
            className="campo"
            maxLength={8}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
          />
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

        {aviso && <p className="aviso-ok">{aviso}</p>}
        {error && <p className="aviso-mal">{error}</p>}

        <button className="boton w-full" disabled={!hayCarrito} onClick={cobrar}>
          Cobrar venta
        </button>
      </aside>
    </div>
  );
}

function FormularioProducto({ onListo }: { onListo: () => void }) {
  const [datos, setDatos] = useState({
    nombre: '',
    precio: '',
    stock: '',
    stockMinimo: '3',
    esServicio: false,
  });
  const [error, setError] = useState('');

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/products', {
        metodo: 'POST',
        cuerpo: {
          nombre: datos.nombre,
          precio: Number(datos.precio),
          stock: Number(datos.stock || 0),
          stockMinimo: Number(datos.stockMinimo || 0),
          esServicio: datos.esServicio,
        },
      });
      onListo();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <form onSubmit={guardar} className="tarjeta space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta">Nombre</label>
          <input
            className="campo"
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="etiqueta">Precio</label>
          <input
            type="number"
            step="0.10"
            className="campo"
            value={datos.precio}
            onChange={(e) => setDatos({ ...datos, precio: e.target.value })}
            required
          />
        </div>
        {!datos.esServicio && (
          <>
            <div>
              <label className="etiqueta">Stock inicial</label>
              <input
                type="number"
                className="campo"
                value={datos.stock}
                onChange={(e) => setDatos({ ...datos, stock: e.target.value })}
              />
            </div>
            <div>
              <label className="etiqueta">Avisar cuando baje de</label>
              <input
                type="number"
                className="campo"
                value={datos.stockMinimo}
                onChange={(e) => setDatos({ ...datos, stockMinimo: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={datos.esServicio}
          onChange={(e) => setDatos({ ...datos, esServicio: e.target.checked })}
        />
        Es un servicio sin inventario (alquiler de casillero, por ejemplo)
      </label>

      {error && <p className="text-sm text-vencido">{error}</p>}
      <button className="boton">Guardar producto</button>
    </form>
  );
}
