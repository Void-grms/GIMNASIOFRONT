'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, guardarToken } from '@/lib/api';
import { AccesoLayout, AvisoAcceso, BotonAcceso, CampoSecreto, IconoAcceso, errorDeAcceso, pegarDigitos, type ErrorAcceso } from '@/components/acceso/Acceso';
import s from '@/components/acceso/Acceso.module.css';

export default function FormularioCliente() {
  const router = useRouter();
  const enviando = useRef(false);
  const activo = useRef(true);
  useEffect(() => { activo.current = true; return () => { activo.current = false; }; }, []);
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<ErrorAcceso | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    enviando.current = true;
    setError(null);
    setCargando(true);
    try {
      const r = await api<{ access_token: string; debeCambiarPin: boolean }>('/portal/login', {
        metodo: 'POST', sesion: null, cuerpo: { dni, pin },
      });
      if (!activo.current) return;
      guardarToken('socio', r.access_token);
      router.replace(r.debeCambiarPin ? '/portal/perfil?cambiar=1' : '/portal/hoy');
    } catch (err: unknown) {
      if (!activo.current) return;
      setError(errorDeAcceso(err));
      enviando.current = false;
      setCargando(false);
    }
  }

  const errorId = error?.status === 401 && /incorrect[oa]s?/i.test(error.mensaje) ? 'acceso-error' : undefined;
  return (
    <AccesoLayout tipo="cliente">
      <div className={s.heading}>
        <p className={s.eyebrow}>Tu espacio en Forces Gym</p>
        <h1 className={s.title}>Portal de clientes</h1>
        <p className={s.subtitle}>Entra con tu DNI y tu PIN personal de 4 dígitos.</p>
      </div>
      <form onSubmit={entrar} className={s.form} aria-label="Iniciar sesión en el portal de clientes" aria-busy={cargando}>
        <div>
          <label className={s.label} htmlFor="dni">DNI</label>
          <input id="dni" name="dni" className={`${s.input} cifra`} inputMode="numeric" autoComplete="username"
            minLength={8} maxLength={8} pattern="[0-9]{8}" required value={dni}
            placeholder="Tu DNI de 8 dígitos" disabled={cargando}
            aria-invalid={errorId ? true : undefined} aria-describedby={errorId}
            onPaste={e => pegarDigitos(e, 8, valor => { setDni(valor); if (error?.status !== 429) setError(null); })}
            onChange={e => { setDni(e.target.value.replace(/\D/g, '')); if (error?.status !== 429) setError(null); }} />
        </div>
        <div>
          <CampoSecreto id="pin" label="PIN personal" tipo="pin" value={pin} disabled={cargando} errorId={errorId} descripcionId="pin-ayuda"
            onPaste={e => pegarDigitos(e, 4, valor => { setPin(valor); if (error?.status !== 429) setError(null); })}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); if (error?.status !== 429) setError(null); }} />
          <p id="pin-ayuda" className={s.hint}>Tu código de asistencia se sigue usando en recepción.</p>
        </div>
        <AvisoAcceso error={error} />
        <BotonAcceso cargando={cargando}>Entrar a mi portal</BotonAcceso>
      </form>
      <span role="status" className="sr-only">{cargando ? 'Comprobando tu acceso. Espera un momento.' : ''}</span>
      <details className={s.help}>
        <summary>¿Olvidaste tu PIN o tienes uno temporal?</summary>
        <div className={s.helpBody}>
          <p>Si olvidaste tu PIN, solicita un nuevo acceso en recepción. El personal verificará tu identidad antes de habilitarlo.</p>
          <p>Si aparece un bloqueo temporal, espera el tiempo indicado antes de volver a intentar.</p>
          <p><strong>El PIN temporal dura 24 horas.</strong> Entra con tu DNI y ese PIN; al primer ingreso tendrás que elegir uno personal. Si venció, pide uno nuevo.</p>
        </div>
      </details>
      <div className={s.onboarding}>
        <span className={s.onboardingIcon}><IconoAcceso tipo="llave" size={19} /></span>
        <div><p>¿Primera vez en el nuevo portal?</p><Link href="/portal/bienvenida">Cómo activar mi acceso <IconoAcceso tipo="flecha" size={16} /></Link></div>
      </div>
    </AccesoLayout>
  );
}
