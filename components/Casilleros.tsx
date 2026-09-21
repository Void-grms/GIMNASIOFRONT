'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const duracion = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`);

/**
 * Elegir el numero de casillero al cobrar el alquiler. Solo muestra los
 * libres y sugiere el primero, que es lo que recepcion haria de todos modos.
 * Botones y no un select, por el foco del campo del lector en recepcion.
 */
export function SelectorCasillero({
  valor,
  onCambiar,
}: {
  valor: number | null;
  onCambiar: (numero: number | null) => void;
}) {
  const [libres, setLibres] = useState<number[] | null>(null);

  useEffect(() => {
    api('/lockers')
      .then((lista: any) => {
        const nums = lista.filter((c: any) => c.libre).map((c: any) => c.numero);
        setLibres(nums);
        if (valor === null && nums.length) onCambiar(nums[0]);
      })
      .catch(() => setLibres([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (libres === null) return <p className="text-sm text-zinc-500">Cargando casilleros…</p>;
  if (libres.length === 0) return <p className="aviso-mal">No hay casilleros libres.</p>;

  return (
    <div>
      <p className="etiqueta">Casillero a entregar</p>
      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto" role="radiogroup" aria-label="Casillero">
        {libres.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            onClick={() => onCambiar(n)}
            className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-bold cifra transition ${
              valor === n
                ? 'border-acento bg-acento text-black'
                : 'border-borde text-zinc-300 hover:border-bordeFuerte'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Grilla de casilleros para recepcion: libre en verde, ocupado con el nombre y
 * el tiempo que lleva. Pasadas unas horas se pone ambar (alguien se fue sin
 * marcar salida y sin devolver la llave).
 */
export function GrillaCasilleros() {
  const [lista, setLista] = useState<any[]>([]);
  const [total, setTotal] = useState('');
  const [config, setConfig] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLista(await api('/lockers'));
    } catch {
      /* se reintenta en la siguiente vuelta */
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 20000);
    return () => clearInterval(t);
  }, [cargar]);

  async function liberar(c: any) {
    if (!window.confirm(`¿Liberar el casillero ${c.numero} de ${c.socio?.nombreCompleto}? Confirma que devolvio la llave.`)) return;
    try {
      await api(`/lockers/${c.numero}/release`, { metodo: 'POST' });
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function guardarTotal() {
    setError('');
    try {
      setLista(await api('/lockers/config', { metodo: 'POST', cuerpo: { total: Number(total) } }));
      setConfig(false);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const ocupados = lista.filter((c) => !c.libre).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="rotulo">
          Casilleros
          <span className="ml-2 text-zinc-400 cifra">
            {ocupados}/{lista.length} ocupados
          </span>
        </h2>
        <button
          className="text-xs text-zinc-500 underline hover:text-white"
          onClick={() => {
            setTotal(String(lista.length));
            setConfig((v) => !v);
          }}
        >
          {config ? 'Cerrar' : 'Cambiar cantidad'}
        </button>
      </div>
      {config && (
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            max={500}
            className="campo py-2"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            aria-label="Total de casilleros"
          />
          <button className="boton shrink-0 py-2" onClick={guardarTotal}>
            Guardar
          </button>
        </div>
      )}
      {error && <p className="aviso-mal">{error}</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
        {lista.map((c) =>
          c.libre ? (
            <div
              key={c.numero}
              className="flex h-[4.5rem] flex-col items-center justify-center rounded-xl border border-vigente/25 bg-vigente/[0.06]"
            >
              <span className="text-lg font-black text-vigente cifra">{c.numero}</span>
              <span className="text-[10px] text-zinc-500">libre</span>
            </div>
          ) : (
            <button
              key={c.numero}
              type="button"
              title={`${c.socio?.nombreCompleto} · toca para liberar`}
              onClick={() => liberar(c)}
              className={`flex h-[4.5rem] flex-col items-center justify-center rounded-xl border px-1 transition hover:border-bordeFuerte ${
                c.demorado ? 'border-porvencer/50 bg-porvencer/10' : 'border-borde bg-white/[0.04]'
              }`}
            >
              <span className={`text-lg font-black cifra ${c.demorado ? 'text-porvencer' : 'text-zinc-200'}`}>
                {c.numero}
              </span>
              <span className="w-full truncate text-center text-[10px] text-zinc-400">
                {c.socio?.nombreCompleto.split(' ')[0]}
              </span>
              <span className="text-[10px] text-zinc-500 cifra">{duracion(c.minutos ?? 0)}</span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}
