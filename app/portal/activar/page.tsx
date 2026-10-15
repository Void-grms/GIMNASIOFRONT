'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta, hora } from '@/lib/api';
import { GuiaActivacion } from '@/components/GuiaActivacion';

type Invitacion = { nombre: string; dniUltimos4: string; expiresAt: string };

export default function ActivarPortal() {
  const token = useRef('');
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null);
  const [ajustes, setAjustes] = useState<any>(null);
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirmacion, setPinConfirmacion] = useState('');
  const [consentimiento, setConsentimiento] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [completo, setCompleto] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    // El enlace lleva el token en el fragmento: no llega al servidor del sitio
    // ni al Referer. Se retira del historial y solo permanece en esta memoria.
    if (!token.current) {
      token.current = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(token.current)) {
      setError('Este enlace de activación no es válido. Pide uno nuevo en recepción.');
      setCargando(false);
      return;
    }
    Promise.all([
      api<Invitacion>('/portal/activacion/consultar', { metodo: 'POST', sesion: null, cuerpo: { token: token.current } }),
      api('/settings', { sesion: null }),
    ])
      .then(([datos, config]) => {
        if (!vivo) return;
        setInvitacion(datos);
        setAjustes(config);
      })
      .catch((e: any) => { if (vivo) setError(e.message || 'No pudimos comprobar el enlace. Acércate a recepción.'); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  async function activar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pin !== pinConfirmacion) {
      setError('Los PIN no coinciden. Vuelve a escribirlos.');
      return;
    }
    if (!consentimiento || !ajustes?.consentimientoTexto || !ajustes?.consentimientoVersion || !ajustes?.consentimientoHuella) return;
    setGuardando(true);
    try {
      await api('/portal/activacion', {
        metodo: 'POST', sesion: null,
        cuerpo: {
          token: token.current, dni, pin, pinConfirmacion, consentimiento: true,
          consentimientoVersion: ajustes.consentimientoVersion, consentimientoHuella: ajustes.consentimientoHuella,
        },
      });
      token.current = '';
      setDni('');
      setPin('');
      setPinConfirmacion('');
      setCompleto(true);
    } catch (e: any) {
      setError(e.message || 'No pudimos activar tu portal. Pide ayuda en recepción.');
      // Conserva el enlace solo en memoria si el texto cambió durante la lectura.
      // Permite aceptar la versión vigente sin recargar una URL ya sin fragmento.
      const config: any = await api('/settings', { sesion: null }).catch(() => null);
      if (config && (config.consentimientoVersion !== ajustes?.consentimientoVersion || config.consentimientoHuella !== ajustes?.consentimientoHuella)) {
        setAjustes(config);
        setConsentimiento(false);
        setError('El texto de consentimiento se actualizó. Lee la nueva versión y vuelve a aceptarla.');
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="tarjeta w-full max-w-md space-y-5">
        <p className="text-xs font-semibold tracking-widest text-acento">FORCES GYM · TU ESPACIO</p>
        <h1 className="text-2xl font-bold">{completo ? 'Tu portal está activo' : 'Activa tu portal'}</h1>
        {!completo && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-zinc-400">Este es el acceso a tu nuevo portal de Forces Gym. Tu código de asistencia se mantiene en recepción; aquí eliges tu PIN personal.</p>
            <details className="rounded-xl border border-borde bg-black/20 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-acento">Cómo funciona el nuevo acceso</summary>
              <div className="pt-4"><GuiaActivacion compacta /></div>
            </details>
          </div>
        )}
        {cargando ? <p role="status" className="text-sm text-zinc-400">Comprobando tu enlace...</p> : completo ? (
          <>
            <p className="text-sm text-zinc-300">Ya puedes entrar con tu DNI y el PIN que elegiste. Tu código para marcar asistencia se mantiene.</p>
            <Link href="/portal" className="boton w-full">Iniciar sesión</Link>
          </>
        ) : invitacion ? (
          <form onSubmit={activar} className="space-y-4">
            <div>
              <p className="font-semibold">Hola, {invitacion.nombre}</p>
              <p className="mt-1 text-sm text-zinc-400">Este acceso corresponde al DNI terminado en {invitacion.dniUltimos4}.</p>
              <p className="mt-1 text-xs text-zinc-500">Enlace de un solo uso, válido hasta el {fechaCorta(invitacion.expiresAt)} a las {hora(invitacion.expiresAt)}.</p>
            </div>
            <div>
              <label className="etiqueta" htmlFor="activar-dni">Confirma tu DNI completo</label>
              <input id="activar-dni" className="campo cifra" inputMode="numeric" autoComplete="username"
                maxLength={8} pattern="[0-9]{8}" required value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="etiqueta" htmlFor="activar-pin">Elige tu PIN</label>
                <input id="activar-pin" className="campo tracking-[0.3em]" type="password" inputMode="numeric"
                  autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" required value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className="etiqueta" htmlFor="activar-confirmacion">Repite tu PIN</label>
                <input id="activar-confirmacion" className="campo tracking-[0.3em]" type="password" inputMode="numeric"
                  autoComplete="new-password" maxLength={4} pattern="[0-9]{4}" required value={pinConfirmacion}
                  onChange={(e) => setPinConfirmacion(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <p className="text-sm text-zinc-400">Elige cuatro números. Evita secuencias, números repetidos, tu código de asistencia y los últimos números de tu DNI.</p>
            <div className="rounded-xl border border-borde bg-black/30 p-4">
              <p className="mb-3 max-h-40 overflow-auto whitespace-pre-wrap text-sm text-zinc-400">
                {ajustes?.consentimientoTexto || 'No se pudo cargar el texto de consentimiento. Pide ayuda en recepción.'}
              </p>
              <label className="flex items-start gap-2 text-sm text-zinc-200">
                <input className="mt-1" type="checkbox" checked={consentimiento}
                  disabled={!ajustes?.consentimientoTexto || !ajustes?.consentimientoVersion || !ajustes?.consentimientoHuella} onChange={(e) => setConsentimiento(e.target.checked)} />
                <span>Leí este texto y autorizo el tratamiento de mis datos personales
                  {ajustes?.consentimientoVersion ? ` (versión ${ajustes.consentimientoVersion})` : ''}.</span>
              </label>
              <Link href="/privacidad" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-acento underline">Leer la política de privacidad</Link>
            </div>
            {error && <p role="alert" className="aviso-mal">{error}</p>}
            <button className="boton w-full" disabled={guardando || !consentimiento || !ajustes?.consentimientoTexto || !ajustes?.consentimientoVersion || !ajustes?.consentimientoHuella || dni.length !== 8 || pin.length !== 4 || pinConfirmacion.length !== 4}>
              {guardando ? 'Activando...' : 'Activar mi portal'}
            </button>
          </form>
        ) : <p role="alert" className="aviso-mal">{error}</p>}
        {!completo && <p className="text-sm text-zinc-500">Si el enlace venció o necesitas ayuda, acércate a recepción para verificar tus datos y recibir otro acceso.</p>}
      </div>
    </main>
  );
}
