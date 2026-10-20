'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, cerrarSesion, fechaCorta, guardarToken, hora, leerToken, urlArchivo } from '@/lib/api';
import { CapturaFoto } from '@/components/CapturaFoto';
import { Esqueleto } from '@/components/Esqueleto';

export default function MiPerfil() {
  const router = useRouter();
  // Se lee del navegador en vez de useSearchParams para que la pagina siga
  // siendo estatica y no haya que envolverla en un Suspense.
  const [debeCambiar, setDebeCambiar] = useState(false);
  const [panel, setPanel] = useState<any>(null);
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirmacion, setPinConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const p: any = await api('/portal/me', { sesion: 'socio' });
      setPanel(p);
      setTelefono(p.telefono || '');
      setEmail(p.email || '');
      setDebeCambiar(p.debeCambiarPin === true);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!leerToken('socio')) {
      router.replace('/portal');
      return;
    }
    setDebeCambiar(new URLSearchParams(window.location.search).get('cambiar') === '1');
    cargar();
  }, [router, cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    if ((debeCambiar && !pinNuevo) || (pinNuevo && pinNuevo !== pinConfirmacion)) {
      setError(debeCambiar && !pinNuevo ? 'Elige tu PIN personal antes de continuar.' : 'Los PIN nuevos no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      const r = await api<{ access_token?: string }>('/portal/me', {
        metodo: 'PATCH',
        sesion: 'socio',
        cuerpo: {
          telefono,
          email,
          ...(pinNuevo ? { pinActual, pinNuevo } : {}),
        },
      });
      if (pinNuevo) {
        if (!r.access_token) {
          cerrarSesion('socio');
          router.replace('/portal');
          return;
        }
        guardarToken('socio', r.access_token);
      }
      setAviso(pinNuevo ? 'Datos y PIN actualizados.' : 'Datos actualizados.');
      setPinActual('');
      setPinNuevo('');
      setPinConfirmacion('');
      if (debeCambiar && r.access_token) {
        router.replace('/portal/hoy');
      } else {
        await cargar();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  if (error && !panel) return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-10">
      <p role="alert" className="aviso-mal">{error}</p>
      <p className="text-sm text-secundario">Si tu acceso temporal venció, solicita uno nuevo en recepción.</p>
      <Link className="boton" href="/portal">Volver a iniciar sesión</Link>
    </main>
  );
  if (!panel) return <main className="p-6"><Esqueleto filas={2} /></main>;
  const foto = urlArchivo(panel.fotoUrl);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      {debeCambiar && (
        <div className="rounded-xl border border-porvencer/40 bg-porvencer/10 px-4 py-3 text-sm text-porvencer">
          Cambia tu PIN antes de seguir. El PIN que te entregó recepción dura 24 horas y tu
          acceso queda limitado a este perfil hasta que elijas uno personal.
          {panel.pinTemporalHasta && <span className="mt-1 block">Vence el {fechaCorta(panel.pinTemporalHasta)} a las {hora(panel.pinTemporalHasta)}.</span>}
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        {debeCambiar ? (
          <button className="text-sm text-secundario hover:text-tinta" onClick={() => { cerrarSesion('socio'); router.replace('/portal'); }}>Salir</button>
        ) : <Link href="/portal/mi" className="text-sm text-secundario hover:text-tinta">Volver</Link>}
      </header>

      {!debeCambiar && <label className="tarjeta flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={!!panel.ocultarEnRanking}
          onChange={async (e) => {
            const ocultar = e.target.checked;
            setPanel({ ...panel, ocultarEnRanking: ocultar });
            try {
              await api('/portal/me', { metodo: 'PATCH', sesion: 'socio', cuerpo: { ocultarEnRanking: ocultar } });
            } catch (err: any) {
              setError(err.message);
              cargar();
            }
          }}
        />
        <span>
          <span className="block font-semibold text-tinta">Aparecer como anonimo en el ranking</span>
          <span className="block text-tenue">
            Tus retos siguen contando; solo se oculta tu nombre para los demas socios.
          </span>
        </span>
      </label>}

      <div className="tarjeta space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-fondo/70">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="Tu foto" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-tenue">{panel.nombres?.[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{panel.nombreCompleto}</p>
            <p className="text-sm text-tenue">DNI {panel.dni}</p>
            <p className="text-sm text-tenue">
              Para cambiar tu nombre o DNI, acercate a recepcion.
            </p>
          </div>
        </div>

        {!debeCambiar && <CapturaFoto
          etiqueta={foto ? 'Cambiar mi foto' : 'Tomarme una foto'}
          onCaptura={async (imagen) => {
            try {
              await api('/portal/foto', { metodo: 'POST', sesion: 'socio', cuerpo: { imagen } });
              setAviso('Foto actualizada.');
              cargar();
            } catch (e: any) {
              setError(e.message);
            }
          }}
        />}
      </div>

      <form onSubmit={guardar} className="tarjeta space-y-4">
        <div>
          <label className="etiqueta" htmlFor="perfil-telefono">Telefono</label>
          <input
            id="perfil-telefono"
            className="campo"
            inputMode="numeric"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
          <p className="mt-1 text-sm text-tenue">
            Lo usamos para avisarte antes de que venza tu plan.
          </p>
        </div>

        <div>
          <label className="etiqueta" htmlFor="perfil-correo">Correo</label>
          <input
            id="perfil-correo"
            className="campo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="border-t border-borde pt-4">
          <p className="mb-3 text-sm font-semibold text-secundario">Cambiar mi PIN</p>
          <p className="mb-3 text-sm text-tenue">Elige cuatro números distintos de tu código de asistencia y de los últimos números del DNI. Evita secuencias y números repetidos.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="etiqueta" htmlFor="perfil-pin-actual">PIN actual</label>
              <input
                id="perfil-pin-actual"
                className="campo tracking-[0.3em]"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="current-password"
                pattern="[0-9]{4}"
                required={debeCambiar || !!pinNuevo}
                value={pinActual}
                onChange={(e) => setPinActual(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="perfil-pin-nuevo">PIN nuevo</label>
              <input
                id="perfil-pin-nuevo"
                className="campo tracking-[0.3em]"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="new-password"
                pattern="[0-9]{4}"
                required={debeCambiar}
                value={pinNuevo}
                onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="perfil-pin-confirmacion">Repite el PIN nuevo</label>
              <input id="perfil-pin-confirmacion" className="campo tracking-[0.3em]" type="password" inputMode="numeric"
                maxLength={4} autoComplete="new-password" pattern="[0-9]{4}"
                required={debeCambiar || !!pinNuevo} value={pinConfirmacion}
                onChange={(e) => setPinConfirmacion(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
        </div>

        {aviso && <p className="aviso-ok">{aviso}</p>}
        {error && <p className="aviso-mal">{error}</p>}

        <button className="boton w-full" disabled={guardando}>
          {guardando ? 'Guardando...' : debeCambiar ? 'Cambiar PIN y entrar al portal' : 'Guardar cambios'}
        </button>
      </form>
    </main>
  );
}
