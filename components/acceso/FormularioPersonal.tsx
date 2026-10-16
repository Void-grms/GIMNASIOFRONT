'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, guardarToken } from '@/lib/api';
import { AccesoLayout, AvisoAcceso, BotonAcceso, CampoSecreto, errorDeAcceso, type ErrorAcceso } from '@/components/acceso/Acceso';
import s from '@/components/acceso/Acceso.module.css';

export default function FormularioPersonal() {
  const router = useRouter();
  const enviando = useRef(false);
  const activo = useRef(true);
  useEffect(() => { activo.current = true; return () => { activo.current = false; }; }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ErrorAcceso | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    enviando.current = true;
    setError(null);
    setCargando(true);
    try {
      const r = await api<{ access_token: string }>('/auth/login', {
        metodo: 'POST', sesion: null, cuerpo: { email: email.trim(), password },
      });
      if (!activo.current) return;
      guardarToken('staff', r.access_token);
      router.replace('/panel/recepcion');
    } catch (err: unknown) {
      if (!activo.current) return;
      setError(errorDeAcceso(err));
      enviando.current = false;
      setCargando(false);
    }
  }

  const errorId = error?.status === 401 && /incorrect[oa]s?/i.test(error.mensaje) ? 'acceso-error' : undefined;
  return (
    <AccesoLayout tipo="personal">
      <div className={s.heading}>
        <p className={s.eyebrow}>Acceso del personal</p>
        <h1 className={s.title}>Administración</h1>
        <p className={s.subtitle}>Ingresa con tu cuenta de recepción o administración.</p>
      </div>
      <form onSubmit={entrar} className={s.form} aria-label="Iniciar sesión de administración" aria-busy={cargando}>
        <div>
          <label className={s.label} htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" className={s.input} type="email" inputMode="email"
            autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254}
            placeholder="Tu correo de acceso" disabled={cargando} value={email}
            aria-invalid={errorId ? true : undefined} aria-describedby={errorId}
            onChange={e => { setEmail(e.target.value); if (error?.status !== 429) setError(null); }} />
        </div>
        <CampoSecreto id="password" label="Contraseña" tipo="password" value={password} disabled={cargando} errorId={errorId}
          onChange={e => { setPassword(e.target.value); if (error?.status !== 429) setError(null); }} />
        <AvisoAcceso error={error} />
        <BotonAcceso cargando={cargando}>Entrar a administración</BotonAcceso>
      </form>
      <span role="status" className="sr-only">{cargando ? 'Comprobando tu cuenta. Espera un momento.' : ''}</span>
      <details className={s.help}>
        <summary>¿Necesitas ayuda con tu cuenta?</summary>
        <div className={s.helpBody}><p>Si olvidaste tu contraseña, contacta con el administrador del gimnasio para revisar tu acceso. Si aparece un bloqueo temporal, espera el tiempo indicado antes de volver a intentar.</p><p>Este acceso es exclusivo para el personal autorizado. Si eres socio, elige <strong>Clientes</strong> para entrar con tu DNI y PIN.</p></div>
      </details>
    </AccesoLayout>
  );
}
