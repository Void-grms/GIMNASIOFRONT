'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, guardarToken } from '@/lib/api';

export default function LoginSocio() {
  const router = useRouter();
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const r = await api<{ access_token: string; debeCambiarPin: boolean }>('/portal/login', {
        metodo: 'POST',
        cuerpo: { dni, pin },
      });
      guardarToken('socio', r.access_token);
      // Con el PIN que entrego recepcion la sesion dura una hora: primero se cambia.
      router.push(r.debeCambiarPin ? '/portal/perfil?cambiar=1' : '/portal/mi');
    } catch (err: any) {
      setError(err.message || 'No se pudo entrar');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={entrar} className="tarjeta w-full max-w-sm">
        <h1 className="text-2xl font-bold">Tu credencial</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Entra con tu DNI y el PIN que te dio recepcion. Si lo perdiste, te lo dan de nuevo en el
          mostrador.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="etiqueta" htmlFor="dni">
              DNI
            </label>
            <input
              id="dni"
              className="campo text-lg tracking-widest"
              inputMode="numeric"
              autoComplete="username"
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="pin">
              PIN
            </label>
            <input
              id="pin"
              className="campo text-lg tracking-[0.5em]"
              inputMode="numeric"
              type="password"
              autoComplete="current-password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
        </div>

        {error && (
          <p className="aviso-mal mt-4">{error}</p>
        )}

        <button className="boton mt-6 w-full" disabled={cargando}>
          {cargando ? 'Entrando...' : 'Ver mi credencial'}
        </button>
      </form>
    </main>
  );
}
