'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, hora, leerToken, urlArchivo } from '@/lib/api';

const COLOR: Record<string, { borde: string; texto: string; fondo: string }> = {
  permitido: { borde: 'border-vigente', texto: 'text-vigente', fondo: 'bg-vigente/10' },
  denegado: { borde: 'border-vencido', texto: 'text-vencido', fondo: 'bg-vencido/10' },
  repetido: { borde: 'border-porvencer', texto: 'text-porvencer', fondo: 'bg-porvencer/10' },
};

/**
 * Modo quiosco: la pantalla que queda abierta todo el dia en el mostrador.
 *
 * Sin menu ni botones que alguien pueda tocar por accidente, con tipografia
 * grande para leerse desde dos metros en un monitor viejo. El campo de escaneo
 * se mantiene enfocado pase lo que pase.
 */
export default function Quiosco() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [ultimo, setUltimo] = useState<any>(null);
  const [reloj, setReloj] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const enfocar = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (!leerToken('staff')) {
      router.replace('/login');
      return;
    }
    enfocar();
    const t = setInterval(
      () => setReloj(new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima' })),
      1000,
    );
    return () => clearInterval(t);
  }, [router, enfocar]);

  // La tarjeta se queda 10 segundos; despues la pantalla vuelve a esperar.
  useEffect(() => {
    if (!ultimo) return;
    const t = setTimeout(() => setUltimo(null), 10000);
    return () => clearTimeout(t);
  }, [ultimo]);

  async function escanear(e: React.FormEvent) {
    e.preventDefault();
    const valor = codigo.trim();
    if (!valor) return;
    setCodigo('');
    setError('');
    try {
      setUltimo(await api('/check-ins/scan', {
        metodo: 'POST',
        cuerpo: { codigo: valor, dispositivo: 'quiosco' },
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      enfocar();
    }
  }

  const estilo = ultimo ? COLOR[ultimo.resultado] ?? COLOR.denegado : null;
  const foto = urlArchivo(ultimo?.socio?.fotoUrl);

  return (
    <main
      className="flex min-h-screen flex-col bg-fondo p-6 sm:p-10"
      onClick={enfocar}
      onKeyDown={enfocar}
    >
      <header className="flex items-center justify-between text-zinc-600">
        <span className="text-lg font-black tracking-tight text-zinc-400">Acceso</span>
        <div className="flex items-center gap-4">
          <span className="text-lg tabular-nums">{reloj}</span>
          <Link href="/panel/recepcion" className="text-sm hover:text-zinc-300">
            Salir del quiosco
          </Link>
        </div>
      </header>

      {/* El input existe pero no se ve: el lector escribe aqui y manda Enter. */}
      <form onSubmit={escanear}>
        <input
          ref={inputRef}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onBlur={() => setTimeout(enfocar, 60)}
          className="sr-only"
          autoComplete="off"
          aria-label="Escanea tu codigo"
        />
      </form>

      <div className="flex flex-1 items-center justify-center">
        {!ultimo ? (
          <div className="text-center">
            <p className="text-4xl font-black text-zinc-300 sm:text-6xl">Acerca tu codigo</p>
            <p className="mt-4 text-xl text-zinc-600 sm:text-2xl">
              O dile tu DNI a recepcion
            </p>
            {error && <p className="mt-6 text-xl text-vencido">{error}</p>}
          </div>
        ) : (
          <div
            className={`flex w-full max-w-4xl items-center gap-8 rounded-3xl border-4 p-8 ${estilo!.borde} ${estilo!.fondo}`}
          >
            <div className="flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-black/40 sm:h-64 sm:w-64">
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-7xl font-black text-zinc-700">
                  {ultimo.socio?.nombres?.[0] ?? '?'}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className={`text-5xl font-black leading-none sm:text-7xl ${estilo!.texto}`}>
                {ultimo.resultado === 'denegado'
                  ? 'NO PASA'
                  : ultimo.tipo === 'entrada'
                    ? 'ADELANTE'
                    : 'HASTA LUEGO'}
              </p>
              <p className="mt-4 truncate text-3xl font-bold sm:text-4xl">
                {ultimo.socio?.nombreCompleto ?? 'Codigo no reconocido'}
              </p>
              {ultimo.socio?.diasRestantes !== null && ultimo.socio?.diasRestantes !== undefined && (
                <p className="mt-2 text-2xl text-zinc-300">
                  {ultimo.socio.diasRestantes >= 0
                    ? `Te quedan ${ultimo.socio.diasRestantes} dia(s)`
                    : `Vencio hace ${Math.abs(ultimo.socio.diasRestantes)} dia(s)`}
                </p>
              )}
              {ultimo.motivo && <p className="mt-2 text-2xl text-zinc-300">{ultimo.motivo}</p>}
              {ultimo.checkInId && (
                <p className="mt-4 text-xl text-zinc-500">{hora(new Date())}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
