'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta, soles } from '@/lib/api';
import { MatrizCohortes } from '@/components/MatrizCohortes';
import { Esqueleto } from '@/components/Esqueleto';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [riesgo, setRiesgo] = useState<any[]>([]);
  const [cohortes, setCohortes] = useState<any>(null);
  const [salud, setSalud] = useState<any>(null);
  const [ranking, setRanking] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api('/dashboard/stats'),
      api('/dashboard/at-risk'),
      api('/dashboard/cohorts'),
      api('/system/health'),
      api('/ranking').catch(() => null),
    ])
      .then(([s, r, c, h, k]: any) => {
        setStats(s);
        setRiesgo(r);
        setCohortes(c);
        setSalud(h);
        setRanking(k);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-vencido">{error}</p>;
  if (!stats) return <Esqueleto />;

  const tarjetas = [
    { titulo: 'Socios activos', valor: stats.sociosActivos },
    { titulo: 'Ingresos de hoy', valor: soles(stats.ingresosHoy) },
    { titulo: 'Ingresos del mes', valor: soles(stats.ingresosMes) },
    { titulo: 'Visitas de hoy', valor: stats.checkInsHoy },
    { titulo: 'Dentro ahora', valor: stats.dentroAhora },
    { titulo: 'Recurrente estimado', valor: soles(stats.mrrEstimado) },
  ];

  return (
    <div className="space-y-8">
      {/* Lo que hay que mirar antes que los numeros: si algo se rompio. */}
      {salud && salud.alertas.length > 0 && (
        <section className="tarjeta border-porvencer/40 bg-porvencer/5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-porvencer">
            Estado del sistema
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-300">
            {salud.alertas.map((a: string) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>
          <Link href="/panel/ajustes" className="boton-suave mt-3">
            Ir a Ajustes
          </Link>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="tarjeta-viva">
            <p className="text-sm text-zinc-400">{t.titulo}</p>
            <p className="mt-2 text-2xl font-black tracking-tight cifra sm:text-3xl">{t.valor}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Vencen esta semana
          <span className="ml-2 text-sm font-normal text-zinc-500">{stats.porVencer.length}</span>
        </h2>
        <div className="tarjeta p-0">
          {stats.porVencer.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">Nadie vence en los proximos 7 dias.</p>
          ) : (
            <ul className="divide-y divide-borde">
              {stats.porVencer.map((s: any) => (
                <li key={s.membresiaId} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link href={`/panel/socios/${s.memberId}`} className="font-medium hover:underline">
                      {s.nombre}
                    </Link>
                    <p className="text-sm text-zinc-500">
                      {s.plan} · vence {fechaCorta(s.vence)}
                    </p>
                  </div>
                  {s.telefono && (
                    <a
                      className="boton-suave shrink-0"
                      href={`https://wa.me/51${s.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">
          Pagaron pero no vienen
          <span className="ml-2 text-sm font-normal text-zinc-500">{riesgo.length}</span>
        </h2>
        <p className="mb-3 text-sm text-zinc-500">
          Socios con membresia vigente y mas de 10 dias sin asistir. Esta es la lista de llamadas de
          la semana.
        </p>
        <div className="tarjeta p-0">
          {riesgo.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">Nadie en riesgo. Buena senal.</p>
          ) : (
            <ul className="divide-y divide-borde">
              {riesgo.map((s) => (
                <li key={s.memberId} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link href={`/panel/socios/${s.memberId}`} className="font-medium hover:underline">
                      {s.nombre}
                    </Link>
                    <p className="text-sm text-zinc-500">
                      {s.diasSinVenir === null
                        ? 'Nunca ha venido'
                        : `${s.diasSinVenir} dias sin venir`}
                    </p>
                  </div>
                  {s.telefono && (
                    <a
                      className="boton-suave shrink-0"
                      href={`https://wa.me/51${s.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {ranking && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Ranking de {ranking.mes}</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Para felicitar en el mostrador. Los socios ven el suyo en el portal, con nombres cortos.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Mas constantes', ranking.asistencia, 'dias'],
              ['Mas records personales', ranking.records, 'records'],
            ].map(([titulo, filas, unidad]: any) => (
              <div key={titulo} className="tarjeta p-0">
                <p className="border-b border-borde px-4 py-3 text-sm font-semibold">{titulo}</p>
                <ol className="divide-y divide-borde">
                  {filas.length === 0 && <li className="p-4 text-sm text-zinc-500">Todavia nadie este mes.</li>}
                  {filas.slice(0, 5).map((f: any) => (
                    <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-5 text-center font-black text-zinc-500 cifra">{f.puesto}</span>
                      <Link href={`/panel/socios/${f.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        {f.nombre}
                      </Link>
                      <span className="shrink-0 font-bold cifra">
                        {f.valor} <span className="font-normal text-zinc-500">{unidad}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-lg font-semibold">Retencion por cohorte</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Es el unico numero que distingue un gimnasio que crece de uno que solo reemplaza a los que
          se van.
        </p>
        <div className="tarjeta">
          <MatrizCohortes datos={cohortes} />
        </div>
      </section>

      {stats.mixIngresos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">De donde viene la plata este mes</h2>
          <div className="tarjeta space-y-3">
            {stats.mixIngresos.map((m: any) => {
              const total = stats.mixIngresos.reduce((s: number, x: any) => s + x.monto, 0) || 1;
              return (
                <div key={m.plan}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{m.plan}</span>
                    <span className="text-zinc-400">{soles(m.monto)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/50">
                    <div
                      className="h-full rounded-full bg-acento"
                      style={{ width: `${(m.monto / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
