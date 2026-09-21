'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { api, cerrarSesion, fechaCorta, leerToken, soles, urlArchivo } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';

const COLOR: Record<string, string> = {
  vigente: 'text-vigente',
  por_vencer: 'text-porvencer',
  vencido: 'text-vencido',
  sin_membresia: 'text-vencido',
};

export default function MiCredencial() {
  const router = useRouter();
  const [panel, setPanel] = useState<any>(null);
  const [qr, setQr] = useState('');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargarPanel = useCallback(async () => {
    try {
      setPanel(await api('/portal/me', { sesion: 'socio' }));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  // El codigo rota cada 30 s, asi que lo pedimos de nuevo un poco antes.
  const refrescarQr = useCallback(async () => {
    try {
      const r: any = await api('/portal/qr', { sesion: 'socio' });
      setQr(await QRCode.toDataURL(r.codigo, { width: 520, margin: 1 }));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!leerToken('socio')) {
      router.replace('/portal');
      return;
    }
    cargarPanel();
    refrescarQr();
    const t = setInterval(refrescarQr, 25000);
    return () => clearInterval(t);
  }, [router, cargarPanel, refrescarQr]);

  /** Un solo boton: fuera avisa la llegada, dentro registra la salida. */
  async function alternarPresencia() {
    setError('');
    try {
      const r: any = await api('/portal/presence', { metodo: 'POST', sesion: 'socio' });
      setAviso(r.mensaje);
      setTimeout(() => setAviso(''), 8000);
      cargarPanel();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (error && !panel) return <main className="p-8 text-vencido">{error}</main>;
  if (!panel) return <main className="p-6"><Esqueleto filas={2} /></main>;

  const vencido = panel.estado === 'vencido' || panel.estado === 'sin_membresia';
  const foto = urlArchivo(panel.fotoUrl);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/perfil"
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-superficie"
          >
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="Tu foto" className="h-full w-full object-cover" />
            ) : (
              <span className="font-bold text-zinc-500">{panel.nombres?.[0]}</span>
            )}
          </Link>
          <div>
            <p className="text-sm text-zinc-400">Hola,</p>
            <h1 className="text-2xl font-bold leading-tight">{panel.nombres}</h1>
          </div>
        </div>
        <button
          className="text-sm text-zinc-500 hover:text-white"
          onClick={() => {
            cerrarSesion('socio');
            router.replace('/portal');
          }}
        >
          Salir
        </button>
      </header>

      {panel.debeCambiarPin && (
        <Link
          href="/portal/perfil"
          className="block rounded-xl border border-porvencer/40 bg-porvencer/10 px-4 py-3 text-sm text-porvencer"
        >
          Tu PIN todavia es el que te dio recepcion. Cambialo para que nadie mas entre a tu cuenta.
        </Link>
      )}

      {/* Lo primero y mas grande: el codigo. Es el 80 % de los usos. */}
      <div className="tarjeta flex flex-col items-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Tu codigo de ingreso" className="w-full max-w-[19rem] rounded-xl bg-white p-3" />
        ) : (
          <div className="flex h-72 w-full items-center justify-center text-zinc-600">
            Generando codigo...
          </div>
        )}
        <p className="mt-3 text-center text-sm text-zinc-500">
          Cambia solo cada 30 segundos. Sube el brillo de tu pantalla y acercalo al lector.
        </p>
      </div>

      <div className="tarjeta">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-400">{panel.plan ?? 'Sin membresia'}</span>
          <span className={`text-sm font-semibold ${COLOR[panel.estado]}`}>
            {panel.diasRestantes === null
              ? 'Acercate a recepcion'
              : panel.diasRestantes >= 0
              ? `Quedan ${panel.diasRestantes} dia(s)`
              : `Vencio hace ${Math.abs(panel.diasRestantes)} dia(s)`}
          </span>
        </div>
        {panel.vence && <p className="mt-1 text-sm text-zinc-500">Vence el {fechaCorta(panel.vence)}</p>}
        {vencido && (
          <p className="aviso-mal mt-3">
            Renueva en recepcion para volver a entrar.
          </p>
        )}
      </div>

      {panel.dentro ? (
        <button className="boton-grande bg-zinc-200 hover:bg-white" onClick={alternarPresencia}>
          Marcar salida
        </button>
      ) : (
        <button className="boton-grande" onClick={alternarPresencia} disabled={vencido}>
          Estoy entrando
        </button>
      )}
      {panel.dentro && (
        <p className="-mt-2 text-center text-sm text-zinc-500">
          Estas dentro del gimnasio. Marca tu salida al irte.
        </p>
      )}
      {aviso && (
        <p className="aviso-ok text-center">{aviso}</p>
      )}
      {error && <p className="aviso-mal text-center">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="tarjeta text-center">
          <p className="text-4xl font-black tracking-tight cifra">{panel.racha}</p>
          <p className="text-sm text-zinc-500">dias seguidos</p>
        </div>
        <div className="tarjeta text-center">
          <p className="text-4xl font-black tracking-tight cifra">{panel.asistenciasMes}</p>
          <p className="text-sm text-zinc-500">visitas este mes</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/portal/progreso" className="boton-suave">
          Mi progreso
        </Link>
        <Link href="/portal/perfil" className="boton-suave">
          Mi perfil
        </Link>
      </div>

      {panel.pagos.length > 0 && (
        <section>
          <h2 className="rotulo mb-2">
            Tus pagos
          </h2>
          <div className="tarjeta p-0">
            <ul className="divide-y divide-borde">
              {panel.pagos.map((p: any) => (
                <li key={p.id} className="flex justify-between p-3 text-sm">
                  <span>{fechaCorta(p.fecha)}</span>
                  <span className="text-zinc-500">{p.metodo}</span>
                  <span className="font-semibold cifra">{soles(p.monto)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
