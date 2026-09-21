'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, fechaCorta, leerToken, sesionActual } from '@/lib/api';
import { GraficoLinea } from '@/components/GraficoLinea';
import { Esqueleto } from '@/components/Esqueleto';
import { ConfirmarSalida } from '@/components/ConfirmarSalida';
import {
  IconoCardio, MapaCuerpo, NOMBRE_GRUPO, SECCIONES, ZONA_CARDIO,
} from '@/components/MapaCuerpo';
import { SelectorEjercicio } from '@/components/entreno/SelectorEjercicio';
import { SemanaEntreno } from '@/components/entreno/SemanaEntreno';
import { Descanso } from '@/components/entreno/Descanso';

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
  const [pestana, setPestana] = useState<'entreno' | 'semana' | 'peso'>('entreno');
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
          ['entreno', 'Entrenar'],
          ['semana', 'Mi semana'],
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

      {pestana === 'entreno' ? <Entrenamiento /> : pestana === 'semana' ? <SemanaEntreno /> : <PesoCorporal />}

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
  const [ultima, setUltima] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [descansoDesde, setDescansoDesde] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const [rutina, setRutina] = useState<any>(null);
  /** Series que manda la rutina: ganan sobre "la ultima vez" al cambiar de ejercicio. */
  const seriesDeRutina = useRef<{ repeticiones: number; pesoKg: number }[] | null>(null);
  const [planHoy, setPlanHoy] = useState<any>(null);

  // Las zonas del dia se preseleccionan solas, pero solo si hoy el socio aun no
  // eligio nada: primero la rutina del entrenador (si la pidio), si no, su
  // propio plan semanal. Lo que el socio toca despues manda.
  useEffect(() => {
    const elegidas = leerZonas();
    setZonas(elegidas);
    Promise.all([
      api('/portal/routine', { sesion: 'socio' }).catch(() => null),
      api('/portal/week-plan', { sesion: 'socio' }).catch(() => null),
    ]).then(([r, plan]: any) => {
      setRutina(r);
      const dia = new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Lima' });
      const n = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(dia) + 1;
      const hoy = plan?.find((d: any) => d.diaSemana === n);
      if (hoy?.grupos?.length) setPlanHoy(hoy);
      if (elegidas.length) return;
      if (r?.estado === 'activa' && r.hoy?.grupos?.length) cambiarZonas(r.hoy.grupos);
      else if (hoy?.grupos?.length) cambiarZonas(hoy.grupos);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarZonas(nuevas: string[]) {
    setZonas(nuevas);
    try {
      localStorage.setItem(LLAVE_ZONAS(), JSON.stringify(nuevas));
    } catch {
      /* sin almacenamiento: la eleccion vale solo mientras la pantalla este abierta */
    }
  }

  const cargar = useCallback(async () => {
    const [cat, propios, hist]: any = await Promise.all([
      api('/portal/exercises', { sesion: 'socio' }),
      api('/portal/my-exercises', { sesion: 'socio' }),
      api('/portal/workouts', { sesion: 'socio' }),
    ]);
    setEjercicios(cat);
    setMios(propios);
    setHistorial(hist);
    setVerProgresoDe((v) => v || propios[0]?.id || '');
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  // Al abrir, el ejercicio sugerido es el primero de las zonas del dia.
  useEffect(() => {
    if (exerciseId || !ejercicios.length) return;
    const sugerido = ejercicios.find((e) => !zonas.length || zonas.includes(e.grupo));
    if (sugerido) setExerciseId(sugerido.id);
  }, [ejercicios, zonas, exerciseId]);

  // "La ultima vez" del ejercicio elegido, y el formulario arranca con esos valores.
  useEffect(() => {
    if (!exerciseId) return;
    setUltima(null);
    api(`/portal/exercises/${exerciseId}/last`, { sesion: 'socio' })
      .then((u: any) => {
        setUltima(u);
        if (seriesDeRutina.current) {
          // La rutina fija series y reps; el peso sale de la ultima vez si la hay.
          const peso = u.series?.[0]?.pesoKg ?? 20;
          setSeries(seriesDeRutina.current.map((x) => ({ ...x, pesoKg: peso })));
          seriesDeRutina.current = null;
        } else if (u.series?.length) {
          setSeries(u.series.map((s: any) => ({ ...s })));
        }
      })
      .catch(() => setUltima(null));
  }, [exerciseId]);

  useEffect(() => {
    if (!verProgresoDe) return;
    api(`/portal/progress/${verProgresoDe}`, { sesion: 'socio' })
      .then(setProgreso)
      .catch(() => setProgreso(null));
  }, [verProgresoDe, historial]);

  const elegido = ejercicios.find((x) => x.id === exerciseId);
  const esCardio = elegido?.grupo === 'cardio';

  /** Tocar un ejercicio de la rutina lo deja listo en el formulario. */
  function usarDeRutina(e: any) {
    const reps = parseInt(String(e.repeticiones), 10) || 10;
    const nuevas = Array.from({ length: e.series }, () => ({ repeticiones: reps, pesoKg: series[0]?.pesoKg ?? 20 }));
    if (e.exerciseId === exerciseId) setSeries(nuevas);
    else {
      seriesDeRutina.current = nuevas;
      setExerciseId(e.exerciseId);
    }
    document.getElementById('anotar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    setRecord(null);
    setGuardando(true);
    try {
      const r: any = await api('/portal/workouts', {
        metodo: 'POST',
        sesion: 'socio',
        cuerpo: { exerciseId, series },
      });
      if (r.record) setRecord(r);
      else setAviso(`${r.series} serie(s) de ${r.ejercicio} anotadas.`);
      setDescansoDesde(Date.now());
      cargar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrarSerie(id: string) {
    try {
      await api(`/portal/workouts/${id}`, { metodo: 'DELETE', sesion: 'socio' });
      cargar();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const cambiar = (i: number, campo: string, valor: number) =>
    setSeries(series.map((s, j) => (i === j ? { ...s, [campo]: valor } : s)));

  const hoy = historial.find((d) => d.dia === hoyTexto());
  const porSemana = useMemo(() => agruparPorSemana(historial.filter((d) => d.dia !== hoyTexto())), [historial]);

  return (
    <div className="space-y-5">
      {rutina && <RutinaGuiada rutina={rutina} onCambio={setRutina} onUsar={usarDeRutina} />}
      {planHoy && rutina?.estado !== 'activa' && (
        <p className="rounded-xl border border-borde bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-300">
          Tu plan de hoy: <span className="font-bold text-acento">{planHoy.titulo || planHoy.grupos.map((g: string) => NOMBRE_GRUPO[g] ?? g).join(', ')}</span>
        </p>
      )}

      <ElegirZonas elegidas={zonas} onCambiar={cambiarZonas} historial={historial} />

      <form id="anotar" onSubmit={guardar} className="tarjeta scroll-mt-4 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Anotar lo de hoy</h2>
          {zonas.length > 0 && (
            <button type="button" className="text-xs text-zinc-500 hover:text-white" onClick={() => cambiarZonas([])}>
              Ver todas las zonas
            </button>
          )}
        </div>

        <SelectorEjercicio
          ejercicios={ejercicios}
          recientes={mios.map((m) => m.id)}
          zonas={zonas}
          valor={exerciseId}
          onElegir={(e) => setExerciseId(e.id)}
          onCambioCatalogo={() => cargar()}
        />

        {ultima && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-black/30 px-3 py-2 text-sm">
            {ultima.dia ? (
              <span className="min-w-0 text-zinc-400">
                Ultima vez ({fechaCorta(ultima.dia)}):{' '}
                <span className="text-zinc-200 cifra">
                  {ultima.series.map((s: any) => `${s.repeticiones}×${s.pesoKg}`).join(' · ')}
                </span>
              </span>
            ) : (
              <span className="text-zinc-500">Primera vez con este ejercicio. ¡Anotalo!</span>
            )}
            {ultima.mejorPeso > 0 && !esCardio && (
              <span className="shrink-0 text-xs text-zinc-500">
                Mejor: <span className="font-bold text-acento cifra">{ultima.mejorPeso} kg</span>
              </span>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="grid grid-cols-[1.5rem_1fr_1fr_2.25rem] gap-2 px-0.5 text-xs text-zinc-500">
            <span>#</span>
            <span>{esCardio ? 'Minutos' : 'Reps'}</span>
            <span>{esCardio ? 'Nivel' : 'Peso (kg)'}</span>
            <span />
          </div>
          {series.map((s, i) => (
            <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_2.25rem] items-center gap-2">
              <span className="text-center text-sm font-bold text-zinc-500 cifra">{i + 1}</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label={`Serie ${i + 1}: ${esCardio ? 'minutos' : 'repeticiones'}`}
                className="campo px-3 py-2.5 text-center cifra"
                min={1}
                value={s.repeticiones}
                onChange={(e) => cambiar(i, 'repeticiones', Number(e.target.value))}
              />
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                aria-label={`Serie ${i + 1}: ${esCardio ? 'nivel' : 'peso'}`}
                className="campo px-3 py-2.5 text-center cifra"
                min={0}
                value={s.pesoKg}
                onChange={(e) => cambiar(i, 'pesoKg', Number(e.target.value))}
              />
              {series.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Quitar serie ${i + 1}`}
                  className="h-9 rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-vencido"
                  onClick={() => setSeries(series.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
          <button
            type="button"
            className="boton-suave w-full py-2"
            onClick={() => setSeries([...series, { ...series[series.length - 1] }])}
          >
            + Serie (copia la anterior)
          </button>
        </div>

        {record && (
          <div className="animate-entrar rounded-xl border border-acento/50 bg-acento/10 p-3 text-center">
            <p className="text-lg font-black text-acento">🏆 ¡Nuevo record en {record.ejercicio}!</p>
            <p className="text-sm text-zinc-300 cifra">
              {record.mejorAnterior} kg → <span className="font-bold">{record.mejorNuevo} kg</span>
            </p>
          </div>
        )}
        {aviso && <p className="aviso-ok">{aviso}</p>}
        {error && <p className="aviso-mal">{error}</p>}

        <button className="boton w-full" disabled={!exerciseId || guardando}>
          {guardando ? 'Guardando…' : 'Guardar series'}
        </button>
        <Descanso inicio={descansoDesde} />
      </form>

      {hoy && (
        <section className="tarjeta space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Hoy</h2>
            <span className="text-sm text-zinc-500 cifra">
              {hoy.ejercicios.reduce((t: number, e: any) => t + e.series.length, 0)} series · {Math.round(hoy.volumen)} kg
            </span>
          </div>
          <ul className="space-y-3">
            {hoy.ejercicios.map((e: any) => (
              <li key={e.exerciseId}>
                <button type="button" className="text-left text-sm font-semibold text-zinc-200 hover:text-acento" onClick={() => setExerciseId(e.exerciseId)}>
                  {e.ejercicio}
                </button>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {e.series.map((s: any) => (
                    <span key={s.id} className="inline-flex items-center gap-1 rounded-lg bg-black/40 py-1 pl-2 pr-1 text-xs text-zinc-300 cifra">
                      {s.repeticiones}×{s.pesoKg}
                      <button
                        type="button"
                        aria-label="Borrar esta serie"
                        className="rounded px-1 text-zinc-600 hover:text-vencido"
                        onClick={() => borrarSerie(s.id)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mios.length > 0 && (
        <section className="tarjeta space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Como vas</h2>
            <select
              className="campo w-auto max-w-[60%] py-1.5 text-sm"
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
                  <p className={`text-2xl font-black ${progreso.mejora > 0 ? 'text-vigente' : 'text-zinc-300'}`}>
                    {progreso.mejora > 0 ? '+' : ''}
                    {progreso.mejora}%
                  </p>
                  <p className="text-sm text-zinc-500">desde que empezaste</p>
                </div>
              </div>
              <GraficoLinea
                titulo={`Mejor peso por dia — ${progreso.ejercicio}`}
                puntos={progreso.puntos.map((p: any) => ({ etiqueta: fechaCorta(p.dia), valor: p.mejorPeso }))}
              />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Anota un par de sesiones y aqui veras la curva.</p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="rotulo">Historial por semana</h2>
        {porSemana.length === 0 && !hoy && (
          <div className="tarjeta text-sm text-zinc-500">Todavia no anotaste nada.</div>
        )}
        {porSemana.map((s) => (
          <details key={s.lunes} className="tarjeta group p-0" open={s === porSemana[0]}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
              <span>
                <span className="block font-semibold">Semana del {fechaCorta(s.lunes)}</span>
                <span className="block text-xs text-zinc-500 cifra">
                  {s.dias.length} dia(s) · {s.series} series · {Math.round(s.volumen)} kg
                </span>
              </span>
              <span className="text-zinc-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <ul className="divide-y divide-borde border-t border-borde">
              {s.dias.map((d: any) => (
                <li key={d.dia} className="p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium capitalize">
                      {new Date(d.dia + 'T12:00:00Z').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {Array.from(new Set(d.ejercicios.map((e: any) => NOMBRE_GRUPO[e.grupo] ?? e.grupo))).join(' · ')}
                    </p>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-sm text-zinc-400">
                    {d.ejercicios.map((e: any) => (
                      <li key={e.exerciseId}>
                        <span className="text-zinc-200">{e.ejercicio}</span>{' '}
                        <span className="cifra">{e.series.map((x: any) => `${x.repeticiones}×${x.pesoKg}`).join(' · ')}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </div>
  );
}

/** Agrupa los dias del historial en semanas de lunes a domingo. */
function agruparPorSemana(dias: any[]) {
  const semanas = new Map<string, { lunes: string; dias: any[]; series: number; volumen: number }>();
  for (const d of dias) {
    const f = new Date(d.dia + 'T00:00:00Z');
    const wd = f.getUTCDay();
    f.setUTCDate(f.getUTCDate() + (wd === 0 ? -6 : 1 - wd));
    const lunes = f.toISOString().slice(0, 10);
    const s = semanas.get(lunes) ?? { lunes, dias: [], series: 0, volumen: 0 };
    s.dias.push(d);
    s.series += d.ejercicios.reduce((t: number, e: any) => t + e.series.length, 0);
    s.volumen += d.volumen;
    semanas.set(lunes, s);
  }
  return Array.from(semanas.values()).sort((a, b) => (a.lunes < b.lunes ? 1 : -1));
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
