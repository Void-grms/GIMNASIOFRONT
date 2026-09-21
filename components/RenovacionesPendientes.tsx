'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, fechaCorta, hora, imagenProtegida, soles } from '@/lib/api';

/**
 * Renovaciones pagadas por Yape desde el portal. Recepcion abre la captura,
 * la compara con lo que llego a su Yape y aprueba (se cobra la membresia) o
 * rechaza con un motivo que el socio ve en su credencial.
 */
export function RenovacionesPendientes() {
  const [lista, setLista] = useState<any[]>([]);
  const [viendo, setViendo] = useState<any>(null);
  const [imagen, setImagen] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLista(await api('/renewals'));
    } catch {
      /* se reintenta en la siguiente vuelta */
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 10000);
    return () => clearInterval(t);
  }, [cargar]);

  async function abrir(r: any) {
    setViendo(r);
    setImagen('');
    setError('');
    try {
      setImagen(await imagenProtegida(`/renewals/${r.id}/voucher`));
    } catch (e: any) {
      setError(e.message);
    }
  }

  function cerrar() {
    if (imagen) URL.revokeObjectURL(imagen);
    setViendo(null);
    setImagen('');
  }

  async function aprobar() {
    setOcupado(true);
    setError('');
    try {
      const r: any = await api(`/renewals/${viendo.id}/approve`, { metodo: 'POST' });
      setAviso(
        `Renovacion de ${viendo.socio.nombreCompleto} aprobada: del ${fechaCorta(r.inicio)} al ${fechaCorta(r.vence)}.` +
          (r.errorComprobante ? ` Ojo: ${r.errorComprobante}` : ''),
      );
      cerrar();
      cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  async function rechazar() {
    const motivo = window.prompt('¿Por que se rechaza? El socio lo vera en su credencial.', 'El Yape no llego');
    if (!motivo) return;
    setOcupado(true);
    setError('');
    try {
      await api(`/renewals/${viendo.id}/reject`, { metodo: 'POST', cuerpo: { motivo } });
      setAviso(`Renovacion de ${viendo.socio.nombreCompleto} rechazada.`);
      cerrar();
      cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (lista.length === 0 && !aviso) return null;

  return (
    <section className="space-y-3">
      <h2 className="rotulo">
        Renovaciones por Yape
        {lista.length > 0 && <span className="ml-2 text-acento">{lista.length}</span>}
      </h2>
      {aviso && <p className="aviso-ok">{aviso}</p>}
      {lista.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => abrir(r)}
          className="tarjeta-acento flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate font-bold">{r.socio.nombreCompleto}</span>
            <span className="block text-sm text-zinc-500">
              {r.plan} · {hora(r.creado)}
              {r.operacion ? ` · op. ${r.operacion}` : ''}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-lg font-black cifra">{soles(r.monto)}</span>
            <span className="block text-xs text-acento">Revisar</span>
          </span>
        </button>
      ))}

      {viendo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Revisar renovacion">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/75" onClick={cerrar} />
          <div className="relative max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border border-borde bg-superficie p-5 sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black">{viendo.socio.nombreCompleto}</p>
                <p className="text-sm text-zinc-500">
                  DNI {viendo.socio.dni} · {viendo.plan} · <span className="font-bold text-white">{soles(viendo.monto)}</span>
                </p>
                {viendo.operacion && <p className="text-sm text-zinc-400">Operacion {viendo.operacion}</p>}
              </div>
              <button className="text-sm text-zinc-500 hover:text-white" onClick={cerrar}>
                Cerrar
              </button>
            </div>
            <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-black/50">
              {imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagen} alt="Captura del Yape" className="max-h-[55vh] w-full object-contain" />
              ) : (
                !error && <span className="text-sm text-zinc-500">Cargando captura…</span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Confirma en tu app de Yape que el pago llego, por el monto correcto, antes de aprobar.
            </p>
            {error && <p className="aviso-mal">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button className="boton-riesgo" disabled={ocupado} onClick={rechazar}>
                Rechazar
              </button>
              <button className="boton" disabled={ocupado} onClick={aprobar}>
                {ocupado ? 'Procesando…' : 'Aprobar y renovar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
