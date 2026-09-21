'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { api, cerrarSesion, fechaCorta, leerToken, soles, urlArchivo } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';
import { ConfirmarSalida } from '@/components/ConfirmarSalida';

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
  const [esperando, setEsperando] = useState(false);
  const [confirmandoSalida, setConfirmandoSalida] = useState<string | null>(null);
  const [renovacion, setRenovacion] = useState<any>(null);
  const dentroAntes = useRef<boolean | null>(null);

  const cargarPanel = useCallback(async () => {
    try {
      const [p, r]: any = await Promise.all([
        api('/portal/me', { sesion: 'socio' }),
        api('/portal/renewals/mine', { sesion: 'socio' }).catch(() => null),
      ]);
      setPanel(p);
      setRenovacion(r);
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

  // Recepcion confirma en su pantalla, no aqui: el celular se entera
  // preguntando cada pocos segundos. En cuanto pasa de "fuera" a "dentro" (por
  // el aviso o porque escanearon el QR), se abre lo de entrenar.
  useEffect(() => {
    let vivo = true;
    async function mirar() {
      if (document.hidden) return;
      try {
        const p: any = await api('/portal/presence', { sesion: 'socio' });
        if (!vivo) return;
        if (dentroAntes.current === false && p.dentro) {
          router.push('/portal/progreso?hoy=1');
          return;
        }
        dentroAntes.current = p.dentro;
      } catch {
        /* sin red en el gimnasio: se reintenta en la siguiente vuelta */
      }
    }
    mirar();
    const t = setInterval(mirar, 4000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [router]);

  /** Fuera avisa la llegada. Dentro abre la confirmacion de salida. */
  async function alternarPresencia() {
    setError('');
    try {
      const r: any = await api('/portal/presence', { metodo: 'POST', sesion: 'socio' });
      if (r.accion === 'confirmar_salida') {
        setConfirmandoSalida(r.desde);
        return;
      }
      setEsperando(r.accion === 'entrada_anunciada');
      setAviso(r.mensaje);
      setTimeout(() => setAviso(''), 8000);
      cargarPanel();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function salidaRegistrada(mensaje: string) {
    setConfirmandoSalida(null);
    dentroAntes.current = false;
    setAviso(mensaje);
    setTimeout(() => setAviso(''), 8000);
    cargarPanel();
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
        {vencido && renovacion?.estado !== 'pendiente' && (
          <p className="aviso-mal mt-3">
            Tu membresia no esta vigente. Renueva aqui con Yape o en recepcion.
          </p>
        )}
        <EstadoRenovacion renovacion={renovacion} />
        {renovacion?.estado !== 'pendiente' && (
          <Link
            href="/portal/renovar"
            className={`mt-3 w-full ${vencido || panel.estado === 'por_vencer' ? 'boton' : 'boton-suave'}`}
          >
            Renovar con Yape
          </Link>
        )}
      </div>

      {panel.dentro ? (
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Link href="/portal/progreso?hoy=1" className="boton-grande">
            Entrenar hoy
          </Link>
          <button className="boton-suave rounded-2xl px-5" onClick={alternarPresencia}>
            Marcar salida
          </button>
        </div>
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
      {panel.casillero && (
        <div className="flex items-center justify-between rounded-2xl border border-acento/30 bg-acento/[0.07] px-4 py-3">
          <span className="text-sm text-zinc-300">Tu casillero</span>
          <span className="text-2xl font-black text-acento cifra">N.° {panel.casillero}</span>
        </div>
      )}
      {esperando && !panel.dentro && (
        <p className="-mt-2 flex items-center justify-center gap-2 text-center text-sm text-zinc-400">
          <span className="h-2 w-2 animate-latir rounded-full bg-acento" />
          Esperando que recepcion confirme tu ingreso…
        </p>
      )}
      {aviso && (
        <p className="aviso-ok text-center">{aviso}</p>
      )}
      {error && <p className="aviso-mal text-center">{error}</p>}
      {confirmandoSalida !== null && (
        <ConfirmarSalida
          desde={confirmandoSalida}
          onCerrar={() => setConfirmandoSalida(null)}
          onSalida={salidaRegistrada}
        />
      )}

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

/** Estado de la ultima renovacion pedida por el portal. Lo viejo no se muestra. */
function EstadoRenovacion({ renovacion }: { renovacion: any }) {
  if (!renovacion) return null;
  if (renovacion.estado === 'pendiente') {
    return (
      <p className="aviso-ojo mt-3">
        Recibimos tu pago de {soles(renovacion.monto)} ({renovacion.plan}). Recepcion lo esta
        revisando; tu membresia se actualiza al aprobarlo.
      </p>
    );
  }
  const reciente =
    renovacion.revisado && Date.now() - new Date(renovacion.revisado).getTime() < 5 * 86400000;
  if (!reciente) return null;
  if (renovacion.estado === 'aprobada') {
    return <p className="aviso-ok mt-3">Tu renovacion ({renovacion.plan}) fue aprobada.</p>;
  }
  return (
    <p className="aviso-mal mt-3">
      No pudimos aprobar tu renovacion: {renovacion.motivoRechazo}. Puedes volver a enviarla o
      acercarte a recepcion.
    </p>
  );
}
