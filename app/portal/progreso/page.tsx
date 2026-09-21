'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, fechaCorta, leerToken, sesionActual } from '@/lib/api';
import { GraficoLinea } from '@/components/GraficoLinea';
import { Esqueleto } from '@/components/Esqueleto';
import { ConfirmarSalida } from '@/components/ConfirmarSalida';
import {
  IconoCardio, MapaCuerpo, NOMBRE_GRUPO, SECCIONES, ZONA_CARDIO,
} from '@/components/MapaCuerpo';

const hoyTexto = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

/** Las zonas elegidas valen por el dia: manana se vuelve a preguntar. */
const LLAVE_ZONAS = () => `gym.zonas.${hoyTexto()}`;

function leerZonas(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LLAVE_ZONAS()) || '[]');
  } catch {
    return [];
  }
}

export default function MiProgreso() {
  const router = useRouter();
  const [pestana, setPestana] = useState<'entreno' | 'peso'>('entreno');
  const [recienLlegado, setRecienLlegado] = useState(false);
  const [presencia, setPresencia] = useState<{ dentro: boolean; desde: string | null } | null>(null);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [aviso, setAviso] = useState('');
  const nombre = useMemo(() => (typeof window === 'undefined' ? '' : sesionActual('socio')?.nombre), []);

  const mirarPresencia = useCallback(async () => {
    try {
      setPresencia(await api('/portal/presence', { sesion: 'socio' }));
    } catch {
      /* el boton de salida simplemente no aparece */
    }
  }, []);

  useEffect(() => {
    if (!leerToken('socio')) {
      router.replace('/portal');
      return;
    }
    // Llega aqui solo desde "Mi credencial" cuando recepcion confirma el ingreso.
    setRecienLlegado(new URLSearchParams(window.location.search).get('hoy') === '1');
    mirarPresencia();
    const t = setInterval(mirarPresencia, 20000);
    return () => clearInterval(t);
  }, [router, mirarPresencia]);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi progreso</h1>
        <Link href="/portal/mi" className="text-sm text-zinc-400 hover:text-white">
          Volver
        </Link>
      </header>

      {recienLlegado && presencia?.dentro && (
        <div className="aviso-ok animate-entrar">
          Recepcion confirmo tu ingreso{nombre ? `, ${nombre}` : ''}. ¡A darle!
        </div>
      )}
      {aviso && <p className="aviso-ok">{aviso}</p>}

      <div className="flex gap-1 rounded-xl border border-borde p-1">
        {[
          ['entreno', 'Entrenamiento'],
          ['peso', 'Mi peso'],
        ].map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => setPestana(valor as any)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              pestana === valor ? 'bg-acento text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {pestana === 'entreno' ? <Entrenamiento /> : <PesoCorporal />}

      {presencia?.dentro && (
        <section className="tarjeta flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">¿Terminaste por hoy?</p>
          <button className="boton-suave shrink-0" onClick={() => setConfirmandoSalida(true)}>
            Marcar salida
          </button>
        </section>
      )}

      {confirmandoSalida && (
        <ConfirmarSalida
          desde={presencia?.desde ?? null}
          onCerrar={() => setConfirmandoSalida(false)}
          onSalida={(mensaje) => {
            setConfirmandoSalida(false);
            setRecienLlegado(false);
            setAviso(mensaje);
            mirarPresencia();
          }}
        />
      )}
    </main>
  );
}

/** Dias desde la ultima vez que el socio entreno cada grupo, segun su historial. */
function ultimaVezPorGrupo(historial: any[]) {
  const hoy = new Date(hoyTexto() + 'T00:00:00Z').getTime();
  const salida: Record<string, number> = {};
  for (const dia of historial) {
    const hace = Math.round((hoy - new Date(dia.dia + 'T00:00:00Z').getTime()) / 86400000);
    for (const e of dia.ejercicios) {
      if (salida[e.grupo] === undefined || hace < salida[e.grupo]) salida[e.grupo] = hace;
    }
  }
  return salida;
}

const textoHace = (dias?: number) =>
  dias === undefined ? 'Sin registros' : dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : `Hace ${dias} dias`;

/**
 * Lo primero que ve el socio al entrar: las zonas del cuerpo agrupadas, con la
 * figura pintada y cuanto hace que no las trabaja. Puede elegir varias
 * (pecho + brazos, por ejemplo); lo elegido filtra los ejercicios de abajo.
 */
function ElegirZonas({
  elegidas,
  onCambiar,
  historial,
}: {
  elegidas: string[];
  onCambiar: (zonas: string[]) => void;
  historial: any[];
}) {
  const ultimaVez = useMemo(() => ultimaVezPorGrupo(historial), [historial]);
  const alternar = (grupo: string) =>
    onCambiar(elegidas.includes(grupo) ? elegidas.filter((g) => g !== grupo) : [...elegidas, grupo]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[26px] font-black leading-tight tracking-tight">
          ¿Que vamos a entrenar hoy?
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Toca una o varias zonas.</p>
      </div>

      {SECCIONES.map((seccion) => (
        <div key={seccion.titulo}>
          <p className="rotulo mb-2">{seccion.titulo}</p>
          <div className={`grid gap-2.5 ${seccion.zonas.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {seccion.zonas.map((zona) => {
              const activa = elegidas.includes(zona.grupo);
              return (
                <button
                  key={zona.grupo}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => alternar(zona.grupo)}
                  className={`rounded-2xl border p-2.5 text-center transition duration-200 ease-suave active:scale-[.97] ${
                    activa
                      ? 'border-acento/60 bg-acento/[0.1]'
                      : 'border-borde bg-superficie hover:border-bordeFuerte'
                  }`}
                >
                  <MapaCuerpo
                    musculos={zona.musculos}
                    vista={zona.vista}
                    activo={activa}
                    className={seccion.zonas.length === 3 ? 'h-24' : 'h-28'}
                  />
                  <p className={`mt-1.5 text-sm font-bold ${activa ? 'text-acento' : 'text-zinc-100'}`}>
                    {zona.nombre}
                  </p>
                  <p className="text-[11px] text-zinc-500">{textoHace(ultimaVez[zona.grupo])}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        aria-pressed={elegidas.includes(ZONA_CARDIO.grupo)}
        onClick={() => alternar(ZONA_CARDIO.grupo)}
        className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition duration-200 ease-suave active:scale-[.99] ${
          elegidas.includes(ZONA_CARDIO.grupo)
            ? 'border-acento/60 bg-acento/[0.1]'
            : 'border-borde bg-superficie hover:border-bordeFuerte'
        }`}
      >
        <IconoCardio activo={elegidas.includes(ZONA_CARDIO.grupo)} />
        <span>
          <span
            className={`block font-bold ${
              elegidas.includes(ZONA_CARDIO.grupo) ? 'text-acento' : 'text-zinc-100'
            }`}
          >
            Cardio
          </span>
          <span className="block text-[11px] text-zinc-500">{textoHace(ultimaVez.cardio)}</span>
        </span>
      </button>
    </section>
  );
}

/**
 * Rutina guiada. Casi todos entrenan a su modo, asi que esto solo aparece para
 * quien ya la tiene, o para quien recien empieza y puede pedirla.
 */
function RutinaGuiada({
  rutina,
  onCambio,
  onUsar,
}: {
  rutina: any;
  onCambio: (r: any) => void;
  onUsar: (ejercicio: any) => void;
}) {
  const [nota, setNota] = useState('');
  const [descartada, setDescartada] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setDescartada(localStorage.getItem('gym.rutina.noGracias') === '1');
    } catch {
      /* sin almacenamiento: se vuelve a ofrecer */
    }
  }, []);

  async function pedir() {
    setError('');
    try {
      onCambio(await api('/portal/routine/request', { metodo: 'POST', sesion: 'socio', cuerpo: nota.trim() ? { nota: nota.trim() } : {} }));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function dejar() {
    if (!window.confirm('¿Dejar la rutina guiada? Puedes seguir anotando lo que entrenes a tu manera.')) return;
    await api('/portal/routine/stop', { metodo: 'POST', sesion: 'socio' });
    onCambio({ estado: 'ninguna', puedePedir: false });
  }

  if (rutina.estado === 'solicitada') {
    return (
      <div className="aviso-ojo">
        Pediste una rutina guiada. El entrenador te la arma y aparecera aqui.
      </div>
    );
  }

  if (rutina.estado === 'ninguna') {
    if (!rutina.puedePedir || descartada) return null;
    return (
      <section className="tarjeta-acento space-y-3">
        <div>
          <h2 className="font-bold">¿Recien empiezas?</h2>
          <p className="text-sm text-zinc-400">
            Pide una rutina guiada para tus primeras semanas: el entrenador te dice que hacer cada
            dia. Si ya tienes la tuya, ignora esto.
          </p>
        </div>
        <input
          className="campo py-2.5 text-sm"
          maxLength={200}
          placeholder="Algo que deba saber el entrenador (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        {error && <p className="aviso-mal">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="boton-suave"
            onClick={() => {
              setDescartada(true);
              try {
                localStorage.setItem('gym.rutina.noGracias', '1');
              } catch {
                /* nada */
              }
            }}
          >
            No, gracias
          </button>
          <button className="boton" onClick={pedir}>
            Pedir rutina
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tarjeta-acento space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="rotulo">Tu rutina · {rutina.rutina}</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">
            {rutina.hoy ? `Hoy: ${rutina.hoy.titulo}` : 'Hoy toca descanso'}
          </h2>
        </div>
        {rutina.hasta && (
          <span className="shrink-0 text-xs text-zinc-500">hasta {fechaCorta(rutina.hasta.slice(0, 10))}</span>
        )}
      </div>
      {rutina.nota && <p className="text-sm italic text-zinc-400">“{rutina.nota}”</p>}
      {rutina.hoy ? (
        <ul className="divide-y divide-borde rounded-xl border border-borde">
          {rutina.hoy.ejercicios.map((e: any) => (
            <li key={e.exerciseId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-white/[0.04]"
                onClick={() => onUsar(e)}
              >
                <span className="text-zinc-200">{e.nombre}</span>
                <span className="shrink-0 text-zinc-500 cifra">
                  {e.series} × {e.repeticiones} <span className="text-acento">→</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-400">
          Tu rutina no tiene nada para hoy. Descansa o entrena lo que quieras.
        </p>
      )}
      <p className="text-xs text-zinc-500">
        {rutina.dias.map((d: any) => `${d.nombreDia.slice(0, 3)}: ${d.titulo}`).join(' · ')}
      </p>
      <button className="text-xs text-zinc-500 underline hover:text-white" onClick={dejar}>
        Dejar la rutina guiada
      </button>
    </section>
  );
}

function Entrenamiento() {
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [mios, setMios] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any>(null);
  const [verProgresoDe, setVerProgresoDe] = useState('');
  const [zonas, setZonas] = useState<string[]>([]);

  const [exerciseId, setExerciseId] = useState('');
  const [series, setSeries] = useState([{ repeticiones: 10, pesoKg: 20 }]);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const [rutina, setRutina] = useState<any>(null);

  // La rutina guiada (si el socio la pidio) preselecciona las zonas del dia,
  // pero solo si hoy todavia no eligio nada: lo que el socio toca manda.
  useEffect(() => {
    const elegidas = leerZonas();
    setZonas(elegidas);
    api('/portal/routine', { sesion: 'socio' })
      .then((r: any) => {
        setRutina(r);
        if (r.estado === 'activa' && r.hoy?.grupos?.length && elegidas.length === 0) {
          cambiarZonas(r.hoy.grupos);
        }
      })
      .catch(() => setRutina(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Tocar un ejercicio de la rutina lo deja listo en el formulario. */
  function usarDeRutina(e: any) {
    setExerciseId(e.exerciseId);
    const reps = parseInt(String(e.repeticiones), 10) || 10;
    setSeries(Array.from({ length: e.series }, () => ({ repeticiones: reps, pesoKg: series[0]?.pesoKg ?? 20 })));
    document.getElementById('anotar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cambiarZonas(nuevas: string[]) {
    setZonas(nuevas);
    try {
      localStorage.setItem(LLAVE_ZONAS(), JSON.stringify(nuevas));
    } catch {
      /* sin almacenamiento: la eleccion vale solo mientras la pantalla este abierta */
    }
  }

  // Con zonas elegidas, el selector solo muestra sus ejercicios.
  const visibles = useMemo(
    () => (zonas.length ? ejercicios.filter((x) => zonas.includes(x.grupo)) : ejercicios),
    [ejercicios, zonas],
  );
  const porGrupo = useMemo(() => {
    const mapa = new Map<string, any[]>();
    for (const x of visibles) mapa.set(x.grupo, [...(mapa.get(x.grupo) || []), x]);
    return Array.from(mapa.entries());
  }, [visibles]);

  useEffect(() => {
    if (visibles.length && !visibles.some((x) => x.id === exerciseId)) setExerciseId(visibles[0].id);
  }, [visibles, exerciseId]);

  const esCardio = ejercicios.find((x) => x.id === exerciseId)?.grupo === 'cardio';

  const cargar = useCallback(async () => {
    const [cat, propios, hist]: any = await Promise.all([
      api('/portal/exercises', { sesion: 'socio' }),
      api('/portal/my-exercises', { sesion: 'socio' }),
      api('/portal/workouts', { sesion: 'socio' }),
    ]);
    setEjercicios(cat);
    setMios(propios);
    setHistorial(hist);
    if (!verProgresoDe && propios[0]) setVerProgresoDe(propios[0].id);
  }, [verProgresoDe]);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!verProgresoDe) return;
    api(`/portal/progress/${verProgresoDe}`, { sesion: 'socio' })
      .then(setProgreso)
      .catch(() => setProgreso(null));
  }, [verProgresoDe, historial]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    try {
      await api('/portal/workouts', {
        metodo: 'POST',
        sesion: 'socio',
        cuerpo: { exerciseId, series },
      });
      setAviso('Anotado. Sigue asi.');
      setSeries([{ repeticiones: 10, pesoKg: 20 }]);
      cargar();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const cambiar = (i: number, campo: string, valor: number) =>
    setSeries(series.map((s, j) => (i === j ? { ...s, [campo]: valor } : s)));

  return (
    <div className="space-y-5">
      {rutina && <RutinaGuiada rutina={rutina} onCambio={setRutina} onUsar={usarDeRutina} />}

      <ElegirZonas elegidas={zonas} onCambiar={cambiarZonas} historial={historial} />

      <form id="anotar" onSubmit={guardar} className="tarjeta scroll-mt-4 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Anotar lo de hoy</h2>
          {zonas.length > 0 && (
            <button type="button" className="text-xs text-zinc-500 hover:text-white" onClick={() => cambiarZonas([])}>
              Ver todos
            </button>
          )}
        </div>

        <div>
          <label className="etiqueta">Ejercicio</label>
          <select className="campo" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {porGrupo.map(([grupo, lista]) => (
              <optgroup key={grupo} label={NOMBRE_GRUPO[grupo] ?? grupo}>
                {lista.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {series.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <span className="pb-3 text-sm text-zinc-500">{i + 1}</span>
              <div className="flex-1">
                <label className="etiqueta">{esCardio ? 'Minutos' : 'Repeticiones'}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="campo"
                  min={1}
                  value={s.repeticiones}
                  onChange={(e) => cambiar(i, 'repeticiones', Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <label className="etiqueta">{esCardio ? 'Nivel / velocidad' : 'Peso (kg)'}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  className="campo"
                  min={0}
                  value={s.pesoKg}
                  onChange={(e) => cambiar(i, 'pesoKg', Number(e.target.value))}
                />
              </div>
              {series.length > 1 && (
                <button
                  type="button"
                  className="boton-suave mb-0.5 px-3"
                  onClick={() => setSeries(series.filter((_, j) => j !== i))}
                >
                  −
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="boton-suave w-full"
            onClick={() => setSeries([...series, series[series.length - 1]])}
          >
            Agregar serie
          </button>
        </div>

        {aviso && <p className="aviso-ok">{aviso}</p>}
        {error && <p className="aviso-mal">{error}</p>}

        <button className="boton w-full">Guardar</button>
      </form>

      {mios.length > 0 && (
        <section className="tarjeta space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Como vas</h2>
            <select
              className="campo w-auto py-1.5 text-sm"
              value={verProgresoDe}
              onChange={(e) => setVerProgresoDe(e.target.value)}
            >
              {mios.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </div>

          {progreso?.puntos?.length ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/40 p-3">
                  <p className="text-3xl font-black tracking-tight cifra">{progreso.mejorMarca} kg</p>
                  <p className="text-sm text-zinc-500">tu mejor marca</p>
                </div>
                <div className="rounded-xl bg-black/40 p-3">
                  <p
                    className={`text-2xl font-black ${
                      progreso.mejora > 0 ? 'text-vigente' : 'text-zinc-300'
                    }`}
                  >
                    {progreso.mejora > 0 ? '+' : ''}
                    {progreso.mejora}%
                  </p>
                  <p className="text-sm text-zinc-500">desde que empezaste</p>
                </div>
              </div>

              <GraficoLinea
                titulo={`Mejor peso por dia — ${progreso.ejercicio}`}
                puntos={progreso.puntos.map((p: any) => ({
                  etiqueta: fechaCorta(p.dia),
                  valor: p.mejorPeso,
                }))}
              />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Anota un par de sesiones y aqui veras la curva.</p>
          )}
        </section>
      )}

      <section>
        <h2 className="rotulo mb-2">
          Ultimas sesiones
        </h2>
        <div className="space-y-3">
          {historial.length === 0 && (
            <div className="tarjeta text-sm text-zinc-500">Todavia no anotaste nada.</div>
          )}
          {historial.map((d) => (
            <div key={d.dia} className="tarjeta">
              <div className="flex items-baseline justify-between">
                <p className="font-medium">{fechaCorta(d.dia)}</p>
                <p className="text-sm text-zinc-500">{Math.round(d.volumen)} kg de volumen</p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                {d.ejercicios.map((e: any) => (
                  <li key={e.exerciseId}>
                    <span className="text-zinc-200">{e.ejercicio}</span>{' '}
                    {e.series.map((s: any) => `${s.repeticiones}x${s.pesoKg}`).join(' · ')}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PesoCorporal() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [datos, setDatos] = useState<any>(null);
  const [peso, setPeso] = useState('');
  const [cintura, setCintura] = useState('');
  const [fecha, setFecha] = useState(hoyTexto());
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const estado: any = await api('/portal/health-consent', { sesion: 'socio' });
    setAutorizado(estado.aceptado);
    if (estado.aceptado) setDatos(await api('/portal/body', { sesion: 'socio' }));
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function autorizar() {
    await api('/portal/health-consent', {
      metodo: 'POST',
      sesion: 'socio',
      cuerpo: {
        texto:
          'Autorizo al gimnasio a guardar mi peso corporal y medidas para seguir mi progreso. Entiendo que es informacion de salud, que solo yo la veo y que puedo borrarla cuando quiera.',
      },
    });
    cargar();
  }

  async function revocar() {
    if (!window.confirm('Se borran todos tus registros de peso. No se puede deshacer.')) return;
    await api('/portal/health-consent', { metodo: 'DELETE', sesion: 'socio' });
    setDatos(null);
    cargar();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/portal/body', {
        metodo: 'POST',
        sesion: 'socio',
        cuerpo: {
          fecha,
          pesoKg: Number(peso),
          ...(cintura ? { cinturaCm: Number(cintura) } : {}),
        },
      });
      setPeso('');
      setCintura('');
      cargar();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (autorizado === null) return <Esqueleto />;

  // El peso corporal es informacion de salud: no se guarda sin permiso explicito.
  if (!autorizado) {
    return (
      <div className="tarjeta space-y-4">
        <h2 className="font-semibold">Antes de anotar tu peso</h2>
        <p className="text-sm text-zinc-400">
          Tu peso y tus medidas son informacion de salud, asi que no las guardamos sin que nos
          autorices. Solo las ves tu: el personal del gimnasio no tiene acceso, y puedes borrarlas
          cuando quieras.
        </p>
        <button className="boton w-full" onClick={autorizar}>
          Autorizar y empezar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={guardar} className="tarjeta space-y-4">
        <h2 className="font-semibold">Anotar mi peso</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiqueta">Peso (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="campo"
              required
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
          </div>
          <div>
            <label className="etiqueta">Cintura (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              className="campo"
              value={cintura}
              onChange={(e) => setCintura(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="etiqueta">Fecha</label>
          <input type="date" className="campo" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        {error && <p className="aviso-mal">{error}</p>}
        <button className="boton w-full">Guardar</button>
      </form>

      {datos?.puntos?.length > 0 && (
        <section className="tarjeta space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/40 p-3">
              <p className="text-3xl font-black tracking-tight cifra">{datos.actual} kg</p>
              <p className="text-sm text-zinc-500">tu ultimo registro</p>
            </div>
            <div className="rounded-xl bg-black/40 p-3">
              <p className="text-2xl font-black">
                {datos.variacion > 0 ? '+' : ''}
                {datos.variacion} kg
              </p>
              <p className="text-sm text-zinc-500">desde el primero</p>
            </div>
          </div>

          <GraficoLinea
            titulo="Tu peso en el tiempo"
            puntos={datos.puntos.map((p: any) => ({
              etiqueta: fechaCorta(p.dia),
              valor: p.pesoKg,
            }))}
          />
        </section>
      )}

      <button className="boton-suave w-full text-vencido" onClick={revocar}>
        Borrar mis registros de peso
      </button>
    </div>
  );
}
