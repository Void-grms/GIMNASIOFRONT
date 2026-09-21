'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, fechaCorta, soles } from '@/lib/api';
import { HojaComprobante } from '@/components/HojaComprobante';

/**
 * Lo que abre el socio desde el WhatsApp del cobro. El enlace lleva una firma
 * (?t=...) que genera el servidor: sin ella no se ve nada, asi que cambiar el
 * id en la direccion no muestra pagos de otra persona.
 *
 * Si el pago tiene comprobante, se muestra tal cual se imprime en recepcion.
 * Si no (el gimnasio aun no configuro su RUC), una constancia de pago.
 */
export default function PagoPublico() {
  const { id } = useParams<{ id: string }>();
  const [datos, setDatos] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t') || '';
    api(`/public/pago/${id}?t=${encodeURIComponent(t)}`)
      .then(setDatos)
      .catch(() => setError('Este enlace no es valido o ya no esta disponible.'));
  }, [id]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-zinc-400">{error}</p>
        <Link href="/" className="boton-suave">
          Ir a la pagina del gimnasio
        </Link>
      </main>
    );
  }
  if (!datos) return <main className="p-6 text-center text-zinc-500">Cargando…</main>;

  const c = datos.comprobante;
  const m = datos.membresia;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 print:max-w-none print:p-0">
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-imprimir { display: none !important; }
          .hoja { border: none !important; box-shadow: none !important; }
        }
      `}</style>

      {m && (
        <section className="no-imprimir tarjeta-acento space-y-1">
          <p className="rotulo">Tu membresia</p>
          <p className="text-xl font-black">{m.plan}</p>
          <p className="text-sm text-zinc-300">
            Vigente del <span className="font-semibold">{fechaCorta(m.inicio)}</span> al{' '}
            <span className="font-semibold text-acento">{fechaCorta(m.vence)}</span>
          </p>
          {m.anulada && <p className="aviso-mal mt-2">Esta membresia fue anulada.</p>}
        </section>
      )}

      {c ? (
        <HojaComprobante c={c} razonSocial={datos.gimnasio.razonSocial} esTicket />
      ) : (
        <article className="hoja rounded-2xl border border-borde bg-white p-5 text-sm text-black">
          <header className="border-b border-zinc-300 pb-3 text-center">
            <h1 className="text-base font-black">{datos.gimnasio.razonSocial || datos.gimnasio.nombre}</h1>
            {datos.gimnasio.direccion && <p className="text-xs">{datos.gimnasio.direccion}</p>}
            {datos.gimnasio.ruc && <p className="text-xs">RUC {datos.gimnasio.ruc}</p>}
            <p className="mt-2 inline-block border-2 border-black px-2 py-1 text-xs font-bold uppercase">
              Constancia de pago
            </p>
          </header>
          <dl className="mt-4 space-y-1.5">
            {datos.socio && (
              <div className="flex justify-between gap-3">
                <dt className="font-semibold">Cliente</dt>
                <dd className="text-right">{datos.socio.nombreCompleto}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Fecha</dt>
              <dd>{new Date(datos.pago.fecha).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</dd>
            </div>
            {m && (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">Concepto</dt>
                  <dd className="text-right">Membresia {m.plan}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">Vigencia</dt>
                  <dd className="text-right">
                    {fechaCorta(m.inicio)} — {fechaCorta(m.vence)}
                  </dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Metodo</dt>
              <dd className="capitalize">{datos.pago.metodo}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-400 pt-2 text-lg font-bold">
              <dt>Total pagado</dt>
              <dd>{soles(datos.pago.monto)}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-zinc-300 pt-3 text-center text-[11px] text-zinc-600">
            Constancia interna de pago, sin valor tributario. Si necesitas boleta, pidela en recepcion.
          </p>
        </article>
      )}

      <div className="no-imprimir grid grid-cols-2 gap-3">
        <button className="boton" onClick={() => window.print()}>
          Guardar / imprimir
        </button>
        <Link href="/portal" className="boton-suave">
          Mi credencial
        </Link>
      </div>
      <p className="no-imprimir text-center text-xs text-zinc-600">
        Para guardarlo como PDF, elige &quot;Guardar como PDF&quot; al imprimir.
      </p>
    </main>
  );
}
