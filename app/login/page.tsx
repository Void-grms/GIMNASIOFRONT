'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { api, guardarToken } from '@/lib/api';

export default function LoginPersonal() {
  const router = useRouter();
  const [email, setEmail] = useState(process.env.NODE_ENV === 'production' ? '' : 'admin@gimnasio.pe');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const r = await api<{ access_token: string }>('/auth/login', {
        metodo: 'POST',
        cuerpo: { email, password },
      });
      guardarToken('staff', r.access_token);
      router.push('/panel/recepcion');
    } catch (err: any) {
      setError(err.message || 'No se pudo entrar');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* La fachada ocupa media pantalla: el personal sabe que sistema abrio. */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/fachada.webp"
          alt=""
          fill
          sizes="50vw"
          className="object-cover object-[center_38%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(80deg,rgba(9,9,10,.86)_10%,rgba(9,9,10,.35)_70%,rgba(9,9,10,.8)_100%)]" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="text-[2.6rem] font-black leading-[0.98] tracking-[-0.035em]">
            <span className="text-acento">FORCES</span> GYM
          </p>
          <p className="mt-2 text-sm text-zinc-400">Huascar 22 · Pacasmayo</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
      <form onSubmit={entrar} className="tarjeta w-full max-w-sm">
        <Link href="/" className="mb-6 inline-block text-xl font-black tracking-tight lg:hidden">
          <span className="text-acento">FORCES</span> GYM
        </Link>
        <h1 className="text-2xl font-black tracking-tight">Personal del gimnasio</h1>
        <p className="mt-1 text-sm text-zinc-400">Recepcion y administracion</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="etiqueta" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              className="campo"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="password">
              Contrasena
            </label>
            <input
              id="password"
              className="campo"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <p className="aviso-mal mt-4">{error}</p>
        )}

        <button className="boton mt-6 w-full" disabled={cargando}>
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>

        <Link href="/portal" className="mt-4 block text-center text-sm text-zinc-400 hover:text-white">
          Soy socio, no personal
        </Link>
      </form>
      </div>
    </main>
  );
}
