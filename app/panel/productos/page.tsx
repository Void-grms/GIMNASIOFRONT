'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, hora, reducirImagen, soles, urlArchivo } from '@/lib/api';
import { PedidosPendientes } from '@/components/PedidosPendientes';
import { GrillaCasilleros, SelectorCasillero } from '@/components/Casilleros';

const METODOS = ['efectivo', 'yape', 'plin', 'tarjeta', 'transferencia'];

export default function Productos() {
  const [productos, setProductos] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [metodo, setMetodo] = useState('efectivo');
  const [dni, setDni] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const [casillero, setCasillero] = useState<number | null>(null);
  const [fotoDe, setFotoDe] = useState('');
  const archivo = useRef<HTMLInputElement>(null);
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
  const hayCasillero = productos.some((p) => p.esCasillero && carrito[p.id] > 0);

  function sumar(id: string, delta: number) {
    const tope = productos.find((p) => p.id === id)?.esCasillero ? 1 : Infinity;
    setCarrito((c) => {
      const cantidad = Math.min(tope, Math.max(0, (c[id] || 0) + delta));
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

      if (hayCasillero && !memberId) throw new Error('El casillero se alquila a un socio: pon su DNI');
      const venta: any = await api('/sales', {
        metodo: 'POST',
        cuerpo: { items, metodo, memberId, ...(hayCasillero && casillero ? { casilleroNumero: casillero } : {}) },
      });
      setAviso(
        `Venta registrada por ${soles(venta.total)}.` +
          (venta.casillero ? ` Entrega la llave del casillero ${venta.casillero}.` : ''),
      );
      setCarrito({});
      setCasillero(null);
      setDni('');
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !fotoDe) return;
    setError('');
    try {
      const imagen = await reducirImagen(f, 900, 0.82);
      await api(`/products/${fotoDe}/foto`, { metodo: 'POST', cuerpo: { imagen } });
      setAviso('Foto actualizada. Ya se ve en la tienda del portal.');
      cargar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFotoDe('');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <input ref={archivo} type="file" accept="image/*" className="hidden" onChange={subirFoto} />
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
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2.5 p-4">
                  <button
                    type="button"
                    title={p.fotoUrl ? 'Cambiar foto' : 'Subir foto'}
                    aria-label={`Foto de ${p.nombre}`}
                    onClick={() => {
                      setFotoDe(p.id);
                      archivo.current?.click();
                    }}
                    className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-bordeFuerte bg-black/40 text-zinc-600 hover:border-acento hover:text-acento"
                  >
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urlArchivo(p.fotoUrl)!} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
                        <path d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" />
                      </svg>
                    )}
                    {fotoDe === p.id && <span className="absolute inset-0 animate-pulse bg-acento/30" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {p.nombre}
                      {!p.activo && <span className="ml-2 text-sm text-zinc-500">(inactivo)</span>}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {soles(p.precio)}
                      {p.esCasillero ? ' · casillero' : p.esServicio ? ' · servicio' : ` · stock ${p.stock}`}
                      {bajo && <span className="ml-2 text-porvencer">reponer</span>}
                    </p>
                  </div>

                  {/* En el celular los controles bajan a su propia fila: a la
                      izquierda el inventario, a la derecha lo que se vende. */}
                  <div className="flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-4">
                  {!p.esServicio ? (
                    <div className="flex items-center gap-1" role="group" aria-label="Ajustar inventario">
                      <span className="mr-1 text-xs text-zinc-500 sm:hidden">Stock</span>
                      <button
                        className="boton-suave min-h-9 px-2.5 py-1"
                        aria-label="Restar del inventario"
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
                        className="boton-suave min-h-9 px-2.5 py-1"
                        aria-label="Sumar al inventario"
                        onClick={() =>
                          api(`/products/${p.id}/stock`, { metodo: 'POST', cuerpo: { cantidad: 1 } })
                            .then(cargar)
                            .catch((e) => setError(e.message))
                        }
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2" role="group" aria-label="Agregar a la venta">
                    <button className="boton-suave min-h-9 px-3 py-1" aria-label={`Quitar ${p.nombre} de la venta`} onClick={() => sumar(p.id, -1)}>
                      −
                    </button>
                    <span className="w-6 text-center font-medium cifra">{carrito[p.id] || 0}</span>
                    <button className="boton min-h-9 px-3 py-1" aria-label={`Agregar ${p.nombre} a la venta`} onClick={() => sumar(p.id, 1)}>
                      +
                    </button>
                  </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <GrillaCasilleros />

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

      {/* En el celular la venta rapida queda al fondo: este atajo lleva ahi. */}
      {hayCarrito && (
        <a
          href="#venta-rapida"
          className="boton fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 lg:hidden"
        >
          Ir a cobrar · <span className="cifra">{soles(total)}</span>
        </a>
      )}

      <aside id="venta-rapida" className="tarjeta-acento h-fit scroll-mt-20 space-y-4">
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
          <label className="etiqueta">DNI del socio {hayCasillero ? '(obligatorio para el casillero)' : '(opcional)'}</label>
          <input
            className="campo"
            maxLength={8}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        {hayCasillero && <SelectorCasillero valor={casillero} onCambiar={setCasillero} />}

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
