'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, hora } from '@/lib/api';
import { TarjetaSocio } from '@/components/TarjetaSocio';
import { PedidosPendientes } from '@/components/PedidosPendientes';
import { RenovacionesPendientes } from '@/components/RenovacionesPendientes';

/**
 * Pantalla unica de recepcion. El input esta siempre enfocado: el lector QR USB
 * se comporta como teclado, asi que escanear escribe aqui y manda Enter solo.
 * El mismo campo acepta un DNI tecleado cuando el celular del socio no colabora.
 *
 * No hay que elegir entre entrada y salida: el sistema alterna solo segun donde
 * este el socio.
 *
 * Si recepcion escanea con la camara del celular (/panel/escaner), el
 * movimiento llega por la lista de recientes y se muestra aqui en grande igual
 * que si se hubiera leido con el lector USB.
 */
export default function Recepcion() {
  const [codigo, setCodigo] = useState('');
  const [ultimo, setUltimo] = useState<any>(null);
  const [recientes, setRecientes] = useState<any[]>([]);
  const [llegadas, setLlegadas] = useState<any[]>([]);
  const [dentro, setDentro] = useState<any[]>([]);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  /** Movimientos ya mostrados; null hasta la primera carga para no revivir los viejos. */
  const vistos = useRef<Set<string> | null>(null);

  // Devuelve el foco al campo del lector, salvo que alguien este escribiendo
  // en otro campo o dentro de un dialogo (el mensaje de WhatsApp, por ejemplo).
  const enfocar = useCallback(() => {
    const activo = document.activeElement as HTMLElement | null;
    if (
      activo &&
      activo !== inputRef.current &&
      (activo.closest('[role="dialog"]') || /^(INPUT|TEXTAREA|SELECT)$/.test(activo.tagName))
    ) {
      return;
    }
    inputRef.current?.focus();
  }, []);

  const refrescar = useCallback(async () => {
    try {
      const [r, l, d] = await Promise.all([
        api('/check-ins/recent?limite=10'),
        api('/check-ins/arrivals'),
        api('/check-ins/inside'),
      ]);
      const lista = r as any[];
      if (vistos.current === null) {
        vistos.current = new Set(lista.map((x) => x.id));
      } else {
        const nuevos = lista.filter((x) => !vistos.current!.has(x.id));
        nuevos.forEach((x) => vistos.current!.add(x.id));
        const delCelular = nuevos.find(
          (x) =>
            x.dispositivo?.startsWith('celular') &&
            Date.now() - new Date(x.hora).getTime() < 30000,
        );
        if (delCelular) {
          setUltimo({
            socio: delCelular.socio,
            resultado: delCelular.resultado,
            tipo: delCelular.tipo,
            motivo: delCelular.motivo,
            desdeCelular: true,
          });
        }
      }
      setRecientes(lista);
      setLlegadas(l as any[]);
      setDentro(d as any[]);
    } catch {
      /* si el API cae, la pantalla sigue usable para escanear */
    }
  }, []);

  useEffect(() => {
    enfocar();
    refrescar();
    const t = setInterval(refrescar, 2500);
    return () => clearInterval(t);
  }, [enfocar, refrescar]);

  // La tarjeta se queda 8 segundos y luego limpia, para que no se confunda
  // con el siguiente socio de la cola.
  useEffect(() => {
    if (!ultimo) return;
    const t = setTimeout(() => setUltimo(null), 8000);
    return () => clearTimeout(t);
  }, [ultimo]);

  async function escanear(e: React.FormEvent) {
    e.preventDefault();
    const valor = codigo.trim();
    if (!valor) return;
    setCodigo('');
    setError('');
    try {
      const r = await api('/check-ins/scan', {
        metodo: 'POST',
        cuerpo: { codigo: valor, dispositivo: 'recepcion-1' },
      });
      setUltimo(r);
      if (r?.checkInId) vistos.current?.add(r.checkInId);
      refrescar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      enfocar();
    }
  }

  async function confirmarLlegada(id: string) {
    try {
      const r = await api(`/check-ins/arrivals/${id}/confirm`, {
        metodo: 'POST',
        cuerpo: { dispositivo: 'recepcion-1' },
      });
      setUltimo(r);
      refrescar();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" onClick={enfocar}>
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm text-zinc-500">
            Para dejar la pantalla puesta todo el dia, usa el modo quiosco.
          </p>
          <Link href="/quiosco" className="boton-suave shrink-0">
            Modo quiosco
          </Link>
        </div>

        <form onSubmit={escanear}>
          <label className="etiqueta" htmlFor="codigo">
            Escanea el QR o teclea el DNI — el sistema sabe si entra o sale
          </label>
          <input
            id="codigo"
            ref={inputRef}
            className="campo-escaneo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onBlur={() => setTimeout(enfocar, 80)}
            placeholder="Esperando lector..."
            autoComplete="off"
          />
        </form>

        {error && <p className="aviso-mal">{error}</p>}

        <div className="min-h-[13rem]">
          {ultimo?.desdeCelular && (
            <p className="rotulo mb-2 flex items-center gap-2 text-acento">
              <span className="h-2 w-2 rounded-full bg-acento" />
              Leido con la camara del celular
            </p>
          )}
          {ultimo ? (
            <TarjetaSocio
              socio={ultimo.socio}
              resultado={ultimo.resultado}
              tipo={ultimo.tipo}
              motivo={ultimo.motivo}
              segundos={8}
            />
          ) : (
            <div className="tarjeta flex h-52 items-center justify-center border-dashed text-zinc-600">
              Listo para el siguiente socio
            </div>
          )}
        </div>

        {ultimo?.socio?.id && (
          <Link href={`/panel/socios/${ultimo.socio.id}`} className="boton-suave">
            Abrir ficha y cobrar
          </Link>
        )}

        <section>
          <h2 className="rotulo mb-2">
            Ultimos movimientos
          </h2>
          <div className="tarjeta p-0">
            <ul className="divide-y divide-borde">
              {recientes.length === 0 && (
                <li className="p-4 text-sm text-zinc-500">Todavia no hay movimientos hoy.</li>
              )}
              {recientes.map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
                  <span
                    className={
                      r.resultado === 'permitido'
                        ? r.tipo === 'entrada'
                          ? 'punto-vigente'
                          : 'h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-600'
                        : 'punto-vencido'
                    }
                  />
                  <span className="font-medium">{r.socio?.nombreCompleto ?? 'Desconocido'}</span>
                  <span className="text-zinc-500">
                    {r.resultado === 'permitido' ? r.tipo : r.motivo}
                  </span>
                  <span className="ml-auto text-zinc-500 cifra">{hora(r.hora)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        {/* Avisos "estoy entrando" del portal. Son un atajo: el ingreso se
            registra recien al confirmar aqui. */}
        <section className="space-y-3">
          <h2 className="rotulo">
            Llegando ahora
          </h2>
          {llegadas.length === 0 && (
            <div className="tarjeta text-sm text-zinc-500">
              Cuando un socio toque &quot;Estoy entrando&quot; en su celular, aparece aqui para que
              confirmes.
            </div>
          )}
          {llegadas.map((l) => (
            <div key={l.id} className="space-y-3">
              <TarjetaSocio socio={l.socio} compacta />
              <div className="flex gap-2">
                <button className="boton flex-1" onClick={() => confirmarLlegada(l.id)}>
                  Confirmar ingreso
                </button>
                <button
                  className="boton-suave"
                  onClick={() =>
                    api(`/check-ins/arrivals/${l.id}/dismiss`, { metodo: 'POST' }).then(refrescar)
                  }
                >
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </section>

        <RenovacionesPendientes />

        <PedidosPendientes />

        <section>
          <h2 className="rotulo mb-2">
            Dentro ahora
            <span className="ml-2 text-acento">{dentro.length}</span>
          </h2>
          <div className="tarjeta p-0">
            <ul className="divide-y divide-borde">
              {dentro.length === 0 && (
                <li className="p-4 text-sm text-zinc-500">No hay nadie en el local.</li>
              )}
              {dentro.map((d) => (
                <li key={d.socio.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="punto-vigente" />
                  <span className="truncate font-medium">{d.socio.nombreCompleto}</span>
                  {d.casillero && (
                    <span className="shrink-0 rounded-md bg-acento/15 px-1.5 py-0.5 text-xs font-bold text-acento cifra" title="Casillero">
                      C{d.casillero}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-zinc-500 cifra">desde {hora(d.desde)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </aside>
    </div>
  );
}
