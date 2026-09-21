'use client';

import { useState } from 'react';
import { api, hora } from '@/lib/api';

function duracion(desde: string | Date) {
  const min = Math.max(0, Math.round((Date.now() - new Date(desde).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/**
 * Marcar salida desde el celular pasa por dos toques en lugares distintos de
 * la pantalla: el boton abre esta hoja y la confirmacion esta abajo, lejos de
 * donde estaba el dedo. Un roce en el bolsillo no alcanza para cerrar la
 * sesion, y el backend tampoco la cierra sin `confirmarSalida`.
 */
export function ConfirmarSalida({
  desde,
  onCerrar,
  onSalida,
}: {
  desde: string | Date | null;
  onCerrar: () => void;
  onSalida: (mensaje: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    setEnviando(true);
    setError('');
    try {
      const r: any = await api('/portal/presence', {
        metodo: 'POST',
        sesion: 'socio',
        cuerpo: { confirmarSalida: true },
      });
      onSalida(r.mensaje || 'Salida registrada.');
    } catch (e: any) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Confirmar salida">
      <button
        type="button"
        aria-label="Cancelar"
        className="absolute inset-0 bg-black/70"
        onClick={onCerrar}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md animate-subir rounded-t-3xl border-t border-borde bg-superficie px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />
        <h2 className="text-2xl font-black tracking-tight">¿Ya te vas?</h2>
        {desde && (
          <p className="mt-1.5 text-sm text-zinc-400">
            Entraste a las <span className="cifra">{hora(desde)}</span> · llevas{' '}
            <span className="cifra">{duracion(desde)}</span> entrenando.
          </p>
        )}
        {error && <p className="aviso-mal mt-4">{error}</p>}
        <div className="mt-6 grid gap-3">
          <button className="boton-suave w-full py-4" onClick={onCerrar} autoFocus>
            No, sigo entrenando
          </button>
          <button className="boton-riesgo w-full py-4" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Registrando…' : 'Si, marcar mi salida'}
          </button>
        </div>
      </div>
    </div>
  );
}
