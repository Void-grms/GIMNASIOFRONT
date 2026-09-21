'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, fechaCorta, leerToken } from '@/lib/api';
import { GraficoLinea } from '@/components/GraficoLinea';
import { Esqueleto } from '@/components/Esqueleto';

const hoyTexto = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

export default function MiProgreso() {
  const router = useRouter();
  const [pestana, setPestana] = useState<'entreno' | 'peso'>('entreno');

  useEffect(() => {
    if (!leerToken('socio')) router.replace('/portal');
  }, [router]);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi progreso</h1>
        <Link href="/portal/mi" className="text-sm text-zinc-400 hover:text-white">
          Volver
        </Link>
      </header>

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
    </main>
  );
}

function Entrenamiento() {
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [mios, setMios] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [progreso, setProgreso] = useState<any>(null);
  const [verProgresoDe, setVerProgresoDe] = useState('');

  const [exerciseId, setExerciseId] = useState('');
  const [series, setSeries] = useState([{ repeticiones: 10, pesoKg: 20 }]);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [cat, propios, hist]: any = await Promise.all([
      api('/portal/exercises', { sesion: 'socio' }),
      api('/portal/my-exercises', { sesion: 'socio' }),
      api('/portal/workouts', { sesion: 'socio' }),
    ]);
    setEjercicios(cat);
    setMios(propios);
    setHistorial(hist);
    if (!exerciseId && cat[0]) setExerciseId(cat[0].id);
    if (!verProgresoDe && propios[0]) setVerProgresoDe(propios[0].id);
  }, [exerciseId, verProgresoDe]);

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
      <form onSubmit={guardar} className="tarjeta space-y-4">
        <h2 className="font-semibold">Anotar lo de hoy</h2>

        <div>
          <label className="etiqueta">Ejercicio</label>
          <select className="campo" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {ejercicios.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {series.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <span className="pb-3 text-sm text-zinc-500">{i + 1}</span>
              <div className="flex-1">
                <label className="etiqueta">Repeticiones</label>
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
                <label className="etiqueta">Peso (kg)</label>
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
