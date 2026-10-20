'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta, hora } from '@/lib/api';

type PinTemporal = { pinInicial: string; vence: string; dni: string; codigoERP?: string | null };
type Activacion = { enlace: string; enlaceBienvenida?: string; mensaje: string; whatsappUrl: string | null; expiresAt: string };

const ESTADOS: Record<string, string> = {
  sin_dni: 'Completar DNI para habilitar el portal',
  inactivo: 'Portal por activar',
  pendiente_activacion: 'Activación pendiente',
  pin_temporal: 'PIN temporal pendiente de cambio',
  activo: 'Portal activo',
};

/** Las credenciales y enlaces permanecen solo en memoria mientras esta ficha está abierta. */
export function AccesoSocio({ socio, ajustes, onActualizado }: {
  socio: any;
  ajustes: any;
  onActualizado: () => Promise<void>;
}) {
  const [dni, setDni] = useState(socio.dni || '');
  const [telefono, setTelefono] = useState(socio.telefono || '');
  const [identidadVerificada, setIdentidadVerificada] = useState(false);
  const [consentimiento, setConsentimiento] = useState(false);
  const [telefonoConfirmado, setTelefonoConfirmado] = useState(false);
  const [pin, setPin] = useState<PinTemporal | null>(null);
  const [activacion, setActivacion] = useState<Activacion | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDni(socio.dni || '');
    setTelefono(socio.telefono || '');
    setIdentidadVerificada(false);
    setTelefonoConfirmado(false);
  }, [socio.id, socio.dni, socio.telefono]);

  useEffect(() => {
    setPin(null);
    setActivacion(null);
    setMensaje('');
    setConsentimiento(false);
    setAviso('');
    setError('');
  }, [socio.id]);

  useEffect(() => { setConsentimiento(false); }, [ajustes?.consentimientoVersion, ajustes?.consentimientoHuella]);

  const cambiosPendientes = dni !== (socio.dni || '') || telefono !== (socio.telefono || '');
  const dniValido = /^\d{8}$/.test(socio.dni || '');
  const requiereConsentimiento = socio.consentimientoPendiente === true;
  const puedeInvitar = dniValido && !cambiosPendientes && identidadVerificada;
  const puedeEntregarPin = puedeInvitar && (!requiereConsentimiento ||
    (consentimiento && !!ajustes?.consentimientoTexto && !!ajustes?.consentimientoVersion && !!ajustes?.consentimientoHuella));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const digitos = telefono.replace(/\D/g, '');
    const celular = /^519\d{8}$/.test(digitos) ? digitos.slice(2) : digitos;
    if (telefono.trim() && !/^9\d{8}$/.test(celular)) {
      setError('El celular debe tener 9 dígitos y empezar en 9. También puedes ingresarlo con +51, o dejarlo vacío para entregar el PIN en recepción.');
      return;
    }
    setOcupado('datos');
    setError('');
    setAviso('');
    setPin(null);
    setActivacion(null);
    try {
      await api(`/members/${socio.id}`, {
        metodo: 'PATCH',
        cuerpo: { dni, telefono: celular || null, identidadVerificada: true },
      });
      await onActualizado();
      setIdentidadVerificada(false);
      setAviso('DNI y celular guardados. Confirma la identidad para entregar el acceso.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado('');
    }
  }

  async function preparar(tipo: 'pin' | 'whatsapp') {
    if (ocupado || (tipo === 'pin' ? !puedeEntregarPin : !puedeInvitar)) return;
    setOcupado(tipo);
    setError('');
    setAviso('');
    setPin(null);
    setActivacion(null);
    setTelefonoConfirmado(false);
    try {
      const cuerpo = {
        identidadVerificada: true,
        ...(consentimiento ? {
          consentimiento: true, consentimientoVersion: ajustes.consentimientoVersion,
          consentimientoHuella: ajustes.consentimientoHuella,
        } : {}),
      };
      if (tipo === 'pin') {
        setPin(await api<PinTemporal>(`/members/${socio.id}/acceso-pin`, { metodo: 'POST', cuerpo }));
      } else {
        const resultado = await api<Activacion>(`/members/${socio.id}/activacion`, { metodo: 'POST', cuerpo });
        setActivacion(resultado);
        setMensaje(resultado.mensaje);
      }
      await onActualizado();
      setIdentidadVerificada(false);
      setConsentimiento(false);
    } catch (e: any) {
      setError(e.message);
      await onActualizado().catch(() => {});
    } finally {
      setOcupado('');
    }
  }

  function abrirWhatsapp() {
    if (!activacion?.whatsappUrl || !telefonoConfirmado || !mensaje.trim()) return;
    try {
      const destino = new URL(activacion.whatsappUrl);
      if (destino.protocol !== 'https:' || destino.hostname !== 'wa.me') {
        throw new Error('No se pudo preparar WhatsApp. Vuelve a generar el enlace.');
      }
      destino.searchParams.set('text', mensaje);
      window.open(destino.toString(), '_blank', 'noopener,noreferrer');
      setAviso('Se abrió WhatsApp. Revisa el destinatario y pulsa Enviar allí para que le llegue.');
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <section className="tarjeta space-y-4">
      <div>
        <h2 className="rotulo">Acceso al portal</h2>
        <p className="mt-2 font-semibold">{ESTADOS[socio.estadoPortal] || 'Portal por activar'}</p>
        <p className="mt-1 text-sm text-secundario">
          Su código de asistencia se conserva. El portal usa su DNI y un PIN propio.
        </p>
        <Link href="/portal/bienvenida" target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-acentoTexto underline underline-offset-4 hover:text-acentoClaro">Ver la guía de bienvenida para el socio</Link>
        {socio.documentoERP && (
          <p className="mt-2 text-sm text-tenue cifra">Documento registrado anteriormente: {socio.documentoERP}</p>
        )}
        {socio.pinTemporalHasta && socio.estadoPortal === 'pin_temporal' && (
          <p className="mt-2 text-sm text-porvencer">
            PIN temporal hasta el {fechaCorta(socio.pinTemporalHasta)} a las {hora(socio.pinTemporalHasta)}.
          </p>
        )}
      </div>

      <form onSubmit={guardar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="acceso-dni">DNI verificado</label>
            <input
              id="acceso-dni" className="campo cifra" inputMode="numeric" autoComplete="off"
              maxLength={8} pattern="[0-9]{8}" required value={dni}
              onChange={(e) => {
                setDni(e.target.value.replace(/\D/g, ''));
                setIdentidadVerificada(false);
                setPin(null);
                setActivacion(null);
              }}
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="acceso-celular">Celular confirmado con el socio</label>
            <input
              id="acceso-celular" className="campo cifra" inputMode="tel" autoComplete="off"
              maxLength={15} value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value.replace(/\D/g, ''));
                setIdentidadVerificada(false);
                setTelefonoConfirmado(false);
                setPin(null);
                setActivacion(null);
              }}
            />
            <p className="mt-1 text-xs text-tenue">9 dígitos o +51. Opcional para entregar el PIN en recepción.</p>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-tinta">
          <input className="mt-1" type="checkbox" checked={identidadVerificada}
            onChange={(e) => setIdentidadVerificada(e.target.checked)} />
          <span>Verifiqué en recepción que este DNI pertenece al socio y confirmé sus datos con él.</span>
        </label>
        <button className="boton-suave" disabled={!!ocupado || !identidadVerificada || !/^\d{8}$/.test(dni)}>
          {ocupado === 'datos' ? 'Guardando...' : 'Guardar DNI y celular'}
        </button>
      </form>

      {requiereConsentimiento && (
        <div className="rounded-xl border border-borde bg-fondo/70 p-4">
          <p className="mb-3 max-h-40 overflow-auto whitespace-pre-wrap text-sm text-secundario">
            {ajustes?.consentimientoTexto || 'Cargando el texto de consentimiento...'}
          </p>
          <label className="flex items-start gap-2 text-sm text-tinta">
            <input className="mt-1" type="checkbox" checked={consentimiento}
              disabled={!ajustes?.consentimientoTexto || !ajustes?.consentimientoVersion || !ajustes?.consentimientoHuella} onChange={(e) => setConsentimiento(e.target.checked)} />
            <span>El socio leyó este texto y autorizó el tratamiento de sus datos personales
              {ajustes?.consentimientoVersion ? ` (versión ${ajustes.consentimientoVersion})` : ''}.</span>
          </label>
          <p className="mt-2 text-xs text-tenue">Para entregar un PIN, registra su autorización aquí. Con un enlace de activación puede leer y aceptar este texto desde su celular.</p>
        </div>
      )}

      {!dniValido && <p className="aviso-ojo">Completa y verifica el DNI antes de habilitar el portal. Su asistencia puede seguir registrándose con su código.</p>}
      {cambiosPendientes && <p className="text-sm text-porvencer">Guarda los datos actualizados antes de preparar el acceso.</p>}
      <p className="text-sm text-tenue">
        Un nuevo PIN temporal reemplaza el anterior y cierra sus sesiones. Un nuevo enlace reemplaza
        los enlaces anteriores; su PIN actual se mantiene hasta que active el nuevo acceso.
        Si ya usa el portal, prepara un acceso cuando solicite recuperarlo.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="boton" disabled={!!ocupado || !puedeEntregarPin} onClick={() => preparar('pin')}>
          {ocupado === 'pin' ? 'Generando...' : 'Entregar PIN temporal'}
        </button>
        <button className="boton-suave" disabled={!!ocupado || !puedeInvitar || !socio.telefono} onClick={() => preparar('whatsapp')}>
          {ocupado === 'whatsapp' ? 'Preparando...' : 'Preparar activación por WhatsApp'}
        </button>
      </div>
      {!socio.telefono && <p className="text-sm text-tenue">Para WhatsApp, guarda primero su celular. También puedes entregar el PIN en recepción.</p>}

      {pin && (
        <div className="space-y-3 rounded-xl border border-vigente/40 bg-vigente/5 p-4">
          <p className="font-semibold">PIN temporal para DNI {pin.dni}</p>
          <p className="rounded-xl bg-fondo/70 py-4 text-center text-4xl font-black tracking-[0.4em] cifra">{pin.pinInicial}</p>
          <p className="text-sm text-secundario">Entrar en el portal con su DNI y este PIN. Es obligatorio cambiarlo al primer ingreso.</p>
          <p className="text-sm text-secundario">Válido por 24 horas, hasta el {fechaCorta(pin.vence)} a las {hora(pin.vence)}. Se muestra solo aquí; entrégalo personalmente.</p>
          <button className="boton-suave" onClick={() => setPin(null)}>Ya lo entregué · ocultar PIN</button>
        </div>
      )}

      {activacion && (
        <div className="space-y-3 rounded-xl border border-borde bg-fondo/70 p-4">
          <p className="font-semibold">Revisar mensaje de activación</p>
          <p className="text-sm text-secundario cifra">Celular: {socio.telefono} · vence el {fechaCorta(activacion.expiresAt)} a las {hora(activacion.expiresAt)}</p>
          {!activacion.whatsappUrl && <p className="aviso-ojo">Este celular no tiene un formato válido para WhatsApp. Confirma el número con el socio y corrígelo antes de enviar.</p>}
          <label className="etiqueta" htmlFor="acceso-mensaje">Mensaje para el socio</label>
          <textarea id="acceso-mensaje" className="campo min-h-48 resize-y text-sm" value={mensaje}
            onChange={(e) => setMensaje(e.target.value)} />
          <label className="flex items-start gap-2 text-sm text-tinta">
            <input className="mt-1" type="checkbox" checked={telefonoConfirmado}
              onChange={(e) => setTelefonoConfirmado(e.target.checked)} />
            <span>Confirmé este número y el destinatario con el socio. Si comparte celular, comprobé que solo él recibirá su enlace.</span>
          </label>
          <p className="text-sm text-tenue">Se abrirá WhatsApp con el mensaje preparado. El envío lo realizas tú desde WhatsApp.</p>
          <div className="flex flex-wrap gap-2">
            <button className="boton" disabled={!activacion.whatsappUrl || !telefonoConfirmado || !mensaje.trim()} onClick={abrirWhatsapp}>Abrir WhatsApp</button>
            <button className="boton-suave" onClick={() => { setActivacion(null); setMensaje(''); }}>Cerrar mensaje</button>
          </div>
        </div>
      )}
      {aviso && <p role="status" className="aviso-ok">{aviso}</p>}
      {error && <p role="alert" className="aviso-mal">{error}</p>}
    </section>
  );
}
