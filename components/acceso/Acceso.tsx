'use client';

import { useEffect, useRef, useState, type ChangeEventHandler, type ClipboardEvent, type ClipboardEventHandler, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import s from './Acceso.module.css';
import { SelectorTema } from '@/components/tema/SelectorTema';

export function IconoAcceso({ tipo, size = 20 }: { tipo: 'flecha' | 'persona' | 'personal' | 'ojo' | 'oculto' | 'aviso' | 'llave'; size?: number }) {
  const paths = {
    flecha: 'M5 12h14m-5-5 5 5-5 5',
    persona: 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20v-1a7 7 0 0 1 14 0v1',
    personal: 'M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 7h16v13H4zM4 12a20 20 0 0 0 16 0M10 12h4v3h-4z',
    ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    oculto: 'm3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-3.2 4.2M6.1 6.2A20 20 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.1-1.1M10 10a3 3 0 0 0 4 4',
    aviso: 'M12 8v5m0 3h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    llave: 'M14.5 14a5.5 5.5 0 1 0-4.5-4.5L3 16.5V21h4v-3h3l4.5-4Z',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[tipo]} /></svg>;
}

function Marca({ className = '' }: { className?: string }) {
  return <Link href="/" aria-label="Forces Gym, ir al inicio" className={`${s.brand} ${className}`}><span>FORCES</span> GYM</Link>;
}

export function AccesoLayout({ tipo, children }: { tipo: 'cliente' | 'personal'; children: ReactNode }) {
  const cliente = tipo === 'cliente';
  return (
    <div className={s.page}>
      <a href="#contenido-acceso" className={s.skip}>Ir al formulario</a>
      <aside className={s.story} aria-label="Forces Gym en Pacasmayo">
        <Image src="/fachada.webp" alt="" fill priority sizes="(min-width: 1024px) 45vw, 1px" className={s.photo} />
        <div className={s.shade} />
        <Marca className={s.storyBrand} />
        <div className={s.storyContent}>
          <p className={s.storyLabel}>{cliente ? 'Tu gimnasio, contigo' : 'Equipo Forces Gym'}</p>
          <h2 className={s.storyTitle}>{cliente ? <>Entrena.<br />Lleva tu <span>progreso.</span></> : <>El gimnasio,<br /><span>en orden.</span></>}</h2>
          <p className={s.storyText}>{cliente ? 'Tu membresía, tu credencial y tus entrenamientos en un solo lugar.' : 'Asistencias, membresías y cobros. Todo a mano para atender a tus socios.'}</p>
        </div>
        <div className={s.storyFooter}><strong>Huascar 22 · Pacasmayo</strong><span>FORCES GYM</span></div>
      </aside>
      <main id="contenido-acceso" className={s.main}>
        <header className={s.topbar}>
          <Marca className={s.mobileBrand} />
          <Link href="/" className={s.back}><span aria-hidden="true">←</span> Volver al inicio</Link>
          <div className={s.apariencia}><SelectorTema compacto /></div>
        </header>
        <div className={s.wrap}>
          <nav aria-label="Tipo de acceso" className={s.switch}>
            <Link href="/portal" className={s.switchLink} aria-current={cliente ? 'page' : undefined}><IconoAcceso tipo="persona" size={17} /> Clientes</Link>
            <Link href="/login" className={s.switchLink} aria-current={!cliente ? 'page' : undefined}><IconoAcceso tipo="personal" size={17} /> Administración</Link>
          </nav>
          {children}
        </div>
        <footer className={s.footer}><span>FORCES GYM · Pacasmayo</span><Link href="/privacidad">Privacidad</Link></footer>
      </main>
    </div>
  );
}

/** Acepta documentos/PIN copiados con espacios sin perder digitos por maxLength. */
export function pegarDigitos(e: ClipboardEvent<HTMLInputElement>, maximo: number, actualizar: (valor: string) => void) {
  const texto = e.clipboardData.getData('text');
  if (/^\d*$/.test(texto)) return;
  e.preventDefault();
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return;
  const input = e.currentTarget;
  const inicio = input.selectionStart ?? input.value.length;
  const fin = input.selectionEnd ?? inicio;
  actualizar((input.value.slice(0, inicio) + digitos + input.value.slice(fin)).slice(0, maximo));
}

export function CampoSecreto({ id, label, value, onChange, onPaste, tipo, disabled, errorId, descripcionId }: {
  id: string; label: string; value: string; onChange: ChangeEventHandler<HTMLInputElement>;
  tipo: 'pin' | 'password'; disabled: boolean; errorId?: string; descripcionId?: string; onPaste?: ClipboardEventHandler<HTMLInputElement>;
}) {
  const [visible, setVisible] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const pin = tipo === 'pin';
  const nombre = pin ? 'PIN' : 'contraseña';
  return (
    <div>
      <label htmlFor={id} className={s.label}>{label}</label>
      <div className={s.inputWrap}>
        <input id={id} name={id} className={`${s.input} ${s.secret} ${pin ? s.pin : ''}`}
          type={visible ? 'text' : 'password'} inputMode={pin ? 'numeric' : undefined}
          autoComplete="current-password" autoCapitalize="none" spellCheck={false}
          minLength={4} maxLength={pin ? 4 : 1024} pattern={pin ? '[0-9]{4}' : undefined}
          placeholder={pin ? 'Tu PIN de 4 dígitos' : 'Tu contraseña'}
          value={value} onChange={onChange} onPaste={onPaste} disabled={disabled} required
          aria-invalid={errorId ? true : undefined} aria-describedby={[descripcionId, errorId, mayusculas ? `${id}-mayusculas` : ''].filter(Boolean).join(' ') || undefined}
          onKeyDown={e => { if (!pin) setMayusculas(e.getModifierState('CapsLock')); }}
          onKeyUp={e => { if (!pin) setMayusculas(e.getModifierState('CapsLock')); }}
          onBlur={() => setMayusculas(false)} />
        <button type="button" className={s.reveal} disabled={disabled}
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${nombre}`} aria-pressed={visible}
          onClick={() => setVisible(actual => !actual)}><IconoAcceso tipo={visible ? 'oculto' : 'ojo'} /></button>
      </div>
      {mayusculas && <p id={`${id}-mayusculas`} role="status" className={s.caps}><IconoAcceso tipo="aviso" size={14} /> Bloq Mayús está activado.</p>}
    </div>
  );
}

export type ErrorAcceso = { mensaje: string; status: number };

export function errorDeAcceso(error: unknown): ErrorAcceso {
  if (error instanceof ApiError) return { status: error.status, mensaje: error.status >= 500 ? 'El servicio no está disponible por el momento. Inténtalo de nuevo en unos segundos.' : error.message };
  return { status: 0, mensaje: 'Comprueba tu conexión a internet y vuelve a intentarlo. Tus datos siguen en el formulario.' };
}

export function AvisoAcceso({ error }: { error: ErrorAcceso | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) ref.current?.focus(); }, [error]);
  if (!error) return null;
  const titulo = error.status === 429 ? 'Demasiados intentos' : error.status >= 500 ? 'Servicio no disponible' : error.status === 0 ? 'Revisa tu conexión' : 'No pudimos iniciar sesión';
  return <div ref={ref} id="acceso-error" className={s.error} role="alert" tabIndex={-1}><IconoAcceso tipo="aviso" /><div><p className={s.errorTitle}>{titulo}</p><p className={s.errorText}>{error.mensaje}</p></div></div>;
}

export function BotonAcceso({ cargando, children }: { cargando: boolean; children: ReactNode }) {
  return <button type="submit" className={s.submit} disabled={cargando}>
    {cargando ? <><svg className={s.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity=".2" /><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> Entrando...</> : <>{children}<IconoAcceso tipo="flecha" size={18} /></>}
  </button>;
}
