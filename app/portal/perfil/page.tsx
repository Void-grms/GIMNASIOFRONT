'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, leerToken, urlArchivo } from '@/lib/api';
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
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const p: any = await api('/portal/me', { sesion: 'socio' });
      setPanel(p);
      setTelefono(p.telefono || '');
      setEmail(p.email || '');
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
    try {
      await api('/portal/me', {
        metodo: 'PATCH',
        sesion: 'socio',
        cuerpo: {
          telefono,
          email,
          ...(pinNuevo ? { pinActual, pinNuevo } : {}),
        },
      });
      setAviso(pinNuevo ? 'Datos y PIN actualizados.' : 'Datos actualizados.');
      setPinActual('');
      setPinNuevo('');
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (!panel) return <main className="p-6"><Esqueleto filas={2} /></main>;
  const foto = urlArchivo(panel.fotoUrl);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      {debeCambiar && (
        <div className="rounded-xl border border-porvencer/40 bg-porvencer/10 px-4 py-3 text-sm text-porvencer">
          Cambia tu PIN antes de seguir: el que tienes te lo entrego recepcion y podria conocerlo
          alguien mas.
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <Link href="/portal/mi" className="text-sm text-zinc-400 hover:text-white">
          Volver
        </Link>
      </header>

      <div className="tarjeta space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/40">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="Tu foto" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-zinc-600">{panel.nombres?.[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{panel.nombreCompleto}</p>
            <p className="text-sm text-zinc-500">DNI {panel.dni}</p>
            <p className="text-sm text-zinc-500">
              Para cambiar tu nombre o DNI, acercate a recepcion.
            </p>
          </div>
        </div>

        <CapturaFoto
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
        />
      </div>

      <form onSubmit={guardar} className="tarjeta space-y-4">
        <div>
          <label className="etiqueta">Telefono</label>
          <input
            className="campo"
            inputMode="numeric"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
          <p className="mt-1 text-sm text-zinc-500">
            Lo usamos para avisarte antes de que venza tu plan.
          </p>
        </div>

        <div>
          <label className="etiqueta">Correo</label>
          <input
            className="campo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="border-t border-borde pt-4">
          <p className="mb-3 text-sm font-semibold text-zinc-300">Cambiar mi PIN</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="etiqueta">PIN actual</label>
              <input
                className="campo tracking-[0.3em]"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinActual}
                onChange={(e) => setPinActual(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="etiqueta">PIN nuevo</label>
              <input
                className="campo tracking-[0.3em]"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinNuevo}
                onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
        </div>

        {aviso && <p className="aviso-ok">{aviso}</p>}
        {error && <p className="aviso-mal">{error}</p>}

        <button className="boton w-full">Guardar cambios</button>
      </form>
    </main>
  );
}
