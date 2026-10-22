'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, leerToken, reducirImagen, soles } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';
import { TIPOS_FOTO } from '@/lib/imagenes';

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
  const [preparandoImagen, setPreparandoImagen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const [revisionPlanes, setRevisionPlanes] = useState(0);
  const [cargandoPlanes, setCargandoPlanes] = useState(true);
  const [ofertaCambio, setOfertaCambio] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const solicitudEnCurso = useRef(false);
  const cambioDetectado = useRef(false);
  const imagenEnCurso = useRef(false);

  useEffect(() => {
    if (!leerToken('socio')) {
      router.replace('/portal');
      return;
    }
    let vigente = true;
    setCargandoPlanes(true);
    setError('');
    setDatos(null);
    setPlanId('');
    setAcepta(false);
    api('/portal/renewals/plans', { sesion: 'socio' })
      .then((d: any) => {
        if (!vigente) return;
        if (d.planes.some((p: any) => !/^[a-f0-9]{64}$/i.test(p.versionOferta || ''))) throw new Error('No pudimos validar las condiciones de las membresías. Actualiza los planes antes de pagar.');
        setDatos(d);
        if (d.planes[0] && !cambioDetectado.current) setPlanId(d.planes[0].id);
      })
      .catch((e) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargandoPlanes(false); });
    return () => { vigente = false; };
  }, [router, revisionPlanes]);

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || imagenEnCurso.current || solicitudEnCurso.current) return;
    imagenEnCurso.current = true;
    setPreparandoImagen(true);
    setImagen('');
    setError('');
    try {
      // El comprobante conserva su resolución y calidad de lectura actuales.
      setImagen(await reducirImagen(f, 1600, 0.85, 'image/jpeg'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      imagenEnCurso.current = false;
      setPreparandoImagen(false);
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
    if (solicitudEnCurso.current || imagenEnCurso.current || enviando || ofertaCambio || cargandoPlanes || !plan?.versionOferta || !imagen || !acepta) return;
    solicitudEnCurso.current = true;
    setEnviando(true);
    setError('');
    try {
      await api('/portal/renewals', {
        metodo: 'POST',
        sesion: 'socio',
        cuerpo: {
          planId,
          versionOferta: plan.versionOferta,
          imagen,
          aceptaTerminos: acepta,
          ...(operacion.trim() ? { operacion: operacion.trim() } : {}),
        },
      });
      setListo(true);
    } catch (e: any) {
      if (e.status === 409 && /condiciones.*plan.*cambi|oferta.*cambi/i.test(e.message || '')) {
        cambioDetectado.current = true;
        setOfertaCambio(true);
        setPlanId('');
        setAcepta(false);
        setRevisionPlanes((v) => v + 1);
      } else setError(e.message);
    } finally {
      solicitudEnCurso.current = false;
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
          <p className="text-sm text-secundario">
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
        <Link href="/portal/mi" className="text-sm text-secundario hover:text-tinta">
          Volver
        </Link>
      </header>

      {ofertaCambio && <div role="alert" className="aviso-ojo space-y-2"><p className="font-bold">Las condiciones de la membresía cambiaron.</p><p>No se envió tu solicitud. Revisa los planes actualizados. Si ya hiciste el Yape, conserva la captura y acércate a recepción para revisar tu pago. No vuelvas a pagar.</p><p>Tu captura se conserva en esta pantalla. Recepción te ayudará a completar la renovación.</p></div>}
      {error && <div role="alert" className="aviso-mal"><p>{error}</p>{!datos && <button type="button" className="mt-2 underline underline-offset-4" onClick={() => setRevisionPlanes((v) => v + 1)}>Volver a cargar los planes</button>}</div>}
      {!datos ? (
        !error && <Esqueleto filas={2} />
      ) : !datos.yapeNumero ? (
        <div className="tarjeta text-sm text-secundario">
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
                onClick={() => { setPlanId(p.id); setAcepta(false); }}
                disabled={enviando || cargandoPlanes}
                aria-pressed={planId === p.id}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                  planId === p.id ? 'border-acento/60 bg-acento/[0.08]' : 'border-borde bg-superficie'
                }`}
              >
                <span className="min-w-0 pr-3">
                  <span className="block font-bold">{p.nombre}{p.esPromocion && <span className="ml-2 text-xs font-semibold text-acentoTexto">Promoción</span>}</span>
                  <span className="block text-sm text-tenue">
                    {p.duracionDias} días desde el inicio · {p.limiteAsistencias == null ? 'Asistencias sin límite' : `${p.limiteAsistencias} asistencias en total`}
                  </span>
                  {p.descripcion && <span className="mt-1 block text-xs leading-relaxed text-secundario">{p.descripcion}</span>}
                </span>
                <span className="shrink-0 text-xl font-black cifra">{soles(p.precio)}</span>
              </button>
            ))}
            {!datos.planes.length && <p className="text-sm text-secundario">Por ahora no hay planes disponibles. Consulta en recepción.</p>}
            {plan?.limiteAsistencias != null && <p className="text-xs leading-relaxed text-secundario">Tu plan incluye {plan.limiteAsistencias} asistencias durante {plan.duracionDias} días. Se cuenta una asistencia por día; salir y volver el mismo día no consume otra. No exige días alternos.</p>}
          </section>

          {!ofertaCambio && plan && <section className="tarjeta space-y-3">
            <p className="rotulo">2 · Yapea {plan ? soles(plan.precio) : ''}</p>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-fondo/70 p-3">
              <div>
                <p className="text-2xl font-black tracking-wider cifra">
                  {datos.yapeNumero.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                </p>
                {datos.yapeTitular && <p className="text-sm text-tenue">{datos.yapeTitular}</p>}
              </div>
              <button type="button" className="boton-suave shrink-0 py-2" onClick={copiar}>
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-tenue">
              Verifica que el nombre que te muestra Yape coincida antes de pagar.
            </p>
          </section>}

          <section className="tarjeta space-y-3">
            <p className="rotulo">3 · Sube la captura del pago</p>
            <input ref={archivo} type="file" accept={TIPOS_FOTO} className="hidden" onChange={elegirArchivo} disabled={preparandoImagen || enviando || ofertaCambio} />
            {preparandoImagen && <p role="status" className="text-sm text-tenue">Preparando captura…</p>}
            {imagen ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagen} alt="Captura del Yape" className="max-h-80 w-full rounded-xl object-contain" />
                <button type="button" className="boton-suave w-full" disabled={preparandoImagen || enviando || ofertaCambio} onClick={() => archivo.current?.click()}>
                  Cambiar captura
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-bordeFuerte text-sm text-secundario"
                disabled={preparandoImagen || enviando || ofertaCambio}
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

          <label className="flex items-start gap-3 text-sm text-secundario">
            <input type="checkbox" className="mt-1" checked={acepta} disabled={!plan || enviando || ofertaCambio} onChange={(e) => setAcepta(e.target.checked)} />
            <span>
              Acepto las{' '}
              <button type="button" className="underline" onClick={() => setVerTerminos((v) => !v)}>
                condiciones de la membresia
              </button>
              .
            </span>
          </label>
          {verTerminos && (
            <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-fondo/70 p-3 text-xs text-secundario">
              {datos.terminosTexto}
            </pre>
          )}

          <button className="boton-grande" disabled={!plan?.versionOferta || !imagen || !acepta || preparandoImagen || enviando || cargandoPlanes || ofertaCambio} onClick={enviar}>
            {enviando ? 'Enviando…' : 'Enviar para revision'}
          </button>
          {ofertaCambio && <Link href="/portal/mi" className="boton-suave w-full">Volver a mi credencial</Link>}
        </>
      )}
    </main>
  );
}
