'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api, fechaCorta, hora } from '@/lib/api';

/**
 * Boton "Enviar por WhatsApp" de un cobro de membresia.
 *
 * Arma el mensaje en el servidor (bienvenida si es nuevo, agradecimiento si
 * renueva, con la fecha de vencimiento y el enlace a su boleta), deja que
 * recepcion lo retoque y abre WhatsApp con el texto listo. WhatsApp Web no
 * permite enviar solo: la persona pulsa "enviar" en su WhatsApp.
 */
export function EnviarWhatsapp({
  paymentId,
  texto = 'Enviar por WhatsApp',
  compacto = false,
}: {
  paymentId: string;
  texto?: string;
  compacto?: boolean;
}) {
  const [datos, setDatos] = useState<any>(null);
  const [mensaje, setMensaje] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  async function abrir() {
    setCargando(true);
    setError('');
    try {
      const d: any = await api(
        `/payments/${paymentId}/whatsapp?origen=${encodeURIComponent(window.location.origin)}`,
      );
      setDatos(d);
      setMensaje(d.mensaje);
      setTelefono((d.telefono || '').replace(/\D/g, ''));
      setEnviado(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  async function enviar() {
    const numero = telefono.replace(/\D/g, '');
    const conPais = numero.length === 9 ? `51${numero}` : numero;
    // Sin numero, WhatsApp deja elegir el contacto a mano.
    const url = `https://wa.me/${conPais}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank', 'noopener');
    setEnviado(true);
    api(`/payments/${paymentId}/whatsapp/enviado`, { metodo: 'POST', cuerpo: { mensaje } }).catch(() => {});
  }

  const icono = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        disabled={cargando}
        className={
          compacto
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 px-2.5 py-1 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/10'
            : 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 font-bold text-black transition hover:brightness-110 disabled:opacity-60'
        }
      >
        {icono}
        {cargando ? 'Preparando…' : texto}
      </button>
      {error && <p className="aviso-mal mt-2">{error}</p>}

      {datos &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Enviar mensaje por WhatsApp"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/75" onClick={() => setDatos(null)} />
            <div className="relative max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border border-borde bg-superficie p-5 sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{datos.socio}</p>
                  <p className="text-sm text-zinc-500">
                    {datos.tipo === 'renovacion' ? 'Mensaje de renovacion' : 'Mensaje de bienvenida'}
                  </p>
                </div>
                <button className="text-sm text-zinc-500 hover:text-white" onClick={() => setDatos(null)}>
                  Cerrar
                </button>
              </div>

              {datos.enviadoAt && !enviado && (
                <p className="aviso-ojo">
                  Ya se envio el {fechaCorta(datos.enviadoAt)} a las {hora(datos.enviadoAt)} — puedes reenviarlo.
                </p>
              )}

              <div>
                <label className="etiqueta" htmlFor="wa-telefono">Celular</label>
                <input
                  id="wa-telefono"
                  className="campo"
                  inputMode="tel"
                  maxLength={12}
                  placeholder="9 digitos (vacio: eliges el contacto en WhatsApp)"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                />
                {!datos.telefono && (
                  <p className="mt-1 text-xs text-zinc-500">
                    El socio no tiene celular en su ficha. Agregalo alli para la proxima.
                  </p>
                )}
              </div>

              <div>
                <label className="etiqueta" htmlFor="wa-mensaje">Mensaje (puedes editarlo)</label>
                <textarea
                  id="wa-mensaje"
                  className="campo min-h-[13rem] resize-y text-sm leading-relaxed"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                />
                <a href={datos.enlace} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-acento underline">
                  Ver lo que abrira el socio
                </a>
              </div>

              {enviado ? (
                <div className="space-y-2">
                  <p className="aviso-ok">
                    Se abrio WhatsApp con el mensaje. Pulsa enviar alli para que le llegue.
                  </p>
                  <button className="boton-suave w-full" onClick={() => setDatos(null)}>
                    Listo
                  </button>
                </div>
              ) : (
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-black hover:brightness-110 disabled:opacity-50"
                  disabled={!mensaje.trim() || (telefono.length > 0 && telefono.length < 9)}
                  onClick={enviar}
                >
                  {icono}
                  Abrir WhatsApp
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
