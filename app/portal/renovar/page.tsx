'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, leerToken, reducirImagen, soles } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';

/**
 * Renovar desde el celular: elegir plan, yapear al numero del gimnasio y subir
 * la captura. La membresia no cambia hasta que recepcion confirma que el Yape
 * llego; por eso el paso final dice "en revision" y no "renovado".
 */
export default function Renovar() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [planId, setPlanId] = useState('');
  const [imagen, setImagen] = useState('');
  const [operacion, setOperacion] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [verTerminos, setVerTerminos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!leerToken('socio')) {
      router.replace('/portal');
      return;
    }
    api('/portal/renewals/plans', { sesion: 'socio' })
      .then((d: any) => {
        setDatos(d);
        if (d.planes[0]) setPlanId(d.planes[0].id);
      })
      .catch((e) => setError(e.message));
  }, [router]);

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    try {
      setImagen(await reducirImagen(f, 1600, 0.85));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(datos.yapeNumero);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el numero sigue visible para copiarlo a mano */
    }
  }

  async function enviar() {
    setEnviando(true);
    setError('');
    try {
      await api('/portal/renewals', {
        metodo: 'POST',
        sesion: 'socio',
        cuerpo: {
          planId,
          imagen,
          aceptaTerminos: acepta,
          ...(operacion.trim() ? { operacion: operacion.trim() } : {}),
        },
      });
      setListo(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const plan = datos?.planes.find((p: any) => p.id === planId);

  if (listo) {
    return (
      <main className="mx-auto max-w-md space-y-5 px-4 py-8">
        <div className="tarjeta-acento space-y-3 text-center">
          <p className="text-4xl">✓</p>
          <h1 className="text-2xl font-black tracking-tight">Pago enviado</h1>
          <p className="text-sm text-zinc-400">
            Recepcion va a revisar tu Yape y aprobar la renovacion. Veras el cambio en tu credencial;
            no necesitas hacer nada mas.
          </p>
          <Link href="/portal/mi" className="boton w-full">
            Volver a mi credencial
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Renovar</h1>
        <Link href="/portal/mi" className="text-sm text-zinc-400 hover:text-white">
          Volver
        </Link>
      </header>

      {error && <p className="aviso-mal">{error}</p>}
      {!datos ? (
        !error && <Esqueleto filas={2} />
      ) : !datos.yapeNumero ? (
        <div className="tarjeta text-sm text-zinc-400">
          El gimnasio todavia no activo el pago por Yape desde el portal. Por ahora renueva en
          recepcion.
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <p className="rotulo">1 · Elige tu plan</p>
            {datos.planes.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                aria-pressed={planId === p.id}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                  planId === p.id ? 'border-acento/60 bg-acento/[0.08]' : 'border-borde bg-superficie'
                }`}
              >
                <span>
                  <span className="block font-bold">{p.nombre}</span>
                  <span className="block text-sm text-zinc-500">
                    {p.duracionDias} dias{p.descripcion ? ` · ${p.descripcion}` : ''}
                  </span>
                </span>
                <span className="text-xl font-black cifra">{soles(p.precio)}</span>
              </button>
            ))}
          </section>

          <section className="tarjeta space-y-3">
            <p className="rotulo">2 · Yapea {plan ? soles(plan.precio) : ''}</p>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-black/40 p-3">
              <div>
                <p className="text-2xl font-black tracking-wider cifra">
                  {datos.yapeNumero.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                </p>
                {datos.yapeTitular && <p className="text-sm text-zinc-500">{datos.yapeTitular}</p>}
              </div>
              <button type="button" className="boton-suave shrink-0 py-2" onClick={copiar}>
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Verifica que el nombre que te muestra Yape coincida antes de pagar.
            </p>
          </section>

          <section className="tarjeta space-y-3">
            <p className="rotulo">3 · Sube la captura del pago</p>
            <input ref={archivo} type="file" accept="image/*" className="hidden" onChange={elegirArchivo} />
            {imagen ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagen} alt="Captura del Yape" className="max-h-80 w-full rounded-xl object-contain" />
                <button type="button" className="boton-suave w-full" onClick={() => archivo.current?.click()}>
                  Cambiar captura
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-bordeFuerte text-sm text-zinc-400"
                onClick={() => archivo.current?.click()}
              >
                <span className="text-2xl">＋</span>
                Elegir captura de la galeria
              </button>
            )}
            <div>
              <label className="etiqueta">Numero de operacion (opcional)</label>
              <input
                className="campo"
                inputMode="numeric"
                maxLength={30}
                value={operacion}
                onChange={(e) => setOperacion(e.target.value)}
              />
            </div>
          </section>

          <label className="flex items-start gap-3 text-sm text-zinc-300">
            <input type="checkbox" className="mt-1" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
            <span>
              Acepto las{' '}
              <button type="button" className="underline" onClick={() => setVerTerminos((v) => !v)}>
                condiciones de la membresia
              </button>
              .
            </span>
          </label>
          {verTerminos && (
            <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 text-xs text-zinc-400">
              {datos.terminosTexto}
            </pre>
          )}

          <button className="boton-grande" disabled={!planId || !imagen || !acepta || enviando} onClick={enviar}>
            {enviando ? 'Enviando…' : 'Enviar para revision'}
          </button>
        </>
      )}
    </main>
  );
}
