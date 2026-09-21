'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta, whatsapp } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';

/**
 * Invitados que trajeron los socios. Lo que interesa no es la lista: es cuantos
 * de ellos volvieron pagando.
 */
export default function Invitados() {
  const [datos, setDatos] = useState<any>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setDatos(await api('/guests'));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <p className="text-vencido">{error}</p>;
  if (!datos) return <Esqueleto />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Invitados (30 dias)', datos.total],
          ['Se hicieron socios', datos.convertidos],
          ['Conversion', `${datos.tasaConversion}%`],
        ].map(([t, v]) => (
          <div key={t as string} className="tarjeta-viva">
            <p className="text-sm text-zinc-400">{t}</p>
            <p className="mt-2 text-3xl font-black tracking-tight cifra">{v as any}</p>
          </div>
        ))}
      </div>

      <div className="tarjeta p-0">
        <ul className="divide-y divide-borde">
          {datos.invitados.length === 0 && (
            <li className="p-5 text-sm text-zinc-500">
              Todavia nadie trajo a un invitado. El pase se registra desde la ficha del socio.
            </li>
          )}
          {datos.invitados.map((g: any) => (
            <li key={g.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {g.nombre}
                  {g.convertido && (
                    <span className="ml-2 rounded-lg bg-vigente/10 px-2 py-0.5 text-sm text-vigente">
                      ya es socio
                    </span>
                  )}
                </p>
                <p className="text-sm text-zinc-500">
                  DNI {g.dni} · invitado por{' '}
                  <Link href={`/panel/socios/${g.anfitrionId}`} className="hover:underline">
                    {g.anfitrion}
                  </Link>{' '}
                  · {fechaCorta(g.fecha)}
                </p>
              </div>
              {!g.convertido && g.telefono && (
                <a
                  className="boton-suave shrink-0"
                  target="_blank"
                  rel="noreferrer"
                  href={
                    whatsapp(
                      g.telefono,
                      `Hola ${g.nombre}, te escribimos del gimnasio. Nos alegro tenerte por aca. Si quieres volver, el pase diario cuesta S/ 8 y la mensualidad S/ 100.`,
                    ) || '#'
                  }
                >
                  Invitar a volver
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
