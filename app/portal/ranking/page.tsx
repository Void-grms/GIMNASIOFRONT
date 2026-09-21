'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, leerToken } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';

const MEDALLA = ['', '🥇', '🥈', '🥉'];

/**
 * Retos y ranking del mes. Lo primero son los retos propios (lo que depende
 * solo de uno); el ranking va despues, con nombres cortos y la opcion de
 * ocultarse en el perfil.
 */
export default function Ranking() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [tabla, setTabla] = useState<'asistencia' | 'records'>('asistencia');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!leerToken('socio')) {
      router.replace('/portal');
      return;
    }
    api('/portal/ranking', { sesion: 'socio' })
      .then(setDatos)
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) return <main className="mx-auto max-w-md p-6 text-vencido">{error}</main>;
  if (!datos) return <main className="mx-auto max-w-md p-6"><Esqueleto filas={3} /></main>;

  const actual = datos[tabla];
  const unidad = tabla === 'asistencia' ? 'dias' : 'records';

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">Retos de {datos.mes}</h1>
        <p className="text-sm text-zinc-500">
          {datos.diasRestantes === 0 ? 'Ultimo dia del mes' : `Quedan ${datos.diasRestantes} dia(s)`}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {datos.retos.map((r: any) => {
          const avance = Math.round((r.valor / r.meta) * 100);
          return (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 ${
                r.logrado ? 'border-acento/50 bg-acento/[0.08]' : 'border-borde bg-superficie'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`font-bold ${r.logrado ? 'text-acento' : ''}`}>{r.titulo}</p>
                {r.logrado && <span aria-label="Logrado">🏆</span>}
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">{r.detalle}</p>
              <p className="mt-3 text-2xl font-black cifra">
                {r.valor}
                <span className="text-sm font-semibold text-zinc-500">/{r.meta}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/50">
                <div
                  className={`h-full rounded-full ${r.logrado ? 'bg-acento' : 'bg-zinc-400'}`}
                  style={{ width: `${avance}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {datos.misRecords.length > 0 && (
        <section className="tarjeta space-y-2">
          <h2 className="font-semibold">Tus marcas de este mes</h2>
          <ul className="space-y-1 text-sm">
            {datos.misRecords.map((r: any) => (
              <li key={r.ejercicio} className="flex justify-between gap-3">
                <span className="text-zinc-300">{r.ejercicio}</span>
                <span className="cifra text-zinc-500">
                  {r.antes} → <span className="font-bold text-vigente">{r.ahora} kg</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex gap-1 rounded-xl border border-borde p-1">
          {[
            ['asistencia', 'Asistencia'],
            ['records', 'Records'],
          ].map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => setTabla(valor as any)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tabla === valor ? 'bg-acento text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        {actual.yo ? (
          <p className="text-sm text-zinc-400">
            Vas en el puesto <span className="font-bold text-white cifra">{actual.yo.puesto}</span> de{' '}
            <span className="cifra">{actual.yo.de}</span> con{' '}
            <span className="font-bold text-white cifra">{actual.yo.valor}</span> {unidad}.
          </p>
        ) : (
          <p className="text-sm text-zinc-500">
            {tabla === 'asistencia'
              ? 'Todavia no tienes visitas este mes. La primera cuenta.'
              : 'Supera un peso que ya anotaste antes y entras aqui.'}
          </p>
        )}

        <div className="tarjeta p-0">
          <ol className="divide-y divide-borde">
            {actual.top.length === 0 && <li className="p-4 text-sm text-zinc-500">Nadie todavia. Se el primero.</li>}
            {actual.top.map((f: any, i: number) => (
              <li
                key={i}
                className={`flex items-center gap-3 px-4 py-3 text-sm ${f.yo ? 'bg-acento/[0.08]' : ''}`}
              >
                <span className="w-7 text-center font-black text-zinc-500 cifra">
                  {MEDALLA[f.puesto] || f.puesto}
                </span>
                <span className={`flex-1 truncate ${f.yo ? 'font-bold text-acento' : ''}`}>
                  {f.nombre}
                  {f.yo && ' (tu)'}
                </span>
                <span className="font-bold cifra">{f.valor}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-zinc-600">
          {datos.oculto
            ? 'Apareces como "Anonimo". '
            : 'En el ranking solo se ve tu nombre y la inicial de tu apellido. '}
          <Link href="/portal/perfil" className="underline">
            Cambiarlo en tu perfil
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
