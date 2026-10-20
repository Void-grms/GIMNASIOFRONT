'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fechaCorta, sesionActual } from '@/lib/api';
import { GraficoLinea } from '@/components/GraficoLinea';
import { Esqueleto } from '@/components/Esqueleto';
import { IconoCardio, MapaCuerpo, NOMBRE_GRUPO, SECCIONES, ZONA_CARDIO } from '@/components/MapaCuerpo';
const hoyTexto = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
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
export function ElegirZonas({
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
        <p className="mt-1 text-sm text-tenue">Toca una o varias zonas.</p>
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
                  <p className={`mt-1.5 text-sm font-bold ${activa ? 'text-acentoTexto' : 'text-tinta'}`}>
                    {zona.nombre}
                  </p>
                  <p className="text-[11px] text-tenue">{textoHace(ultimaVez[zona.grupo])}</p>
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
              elegidas.includes(ZONA_CARDIO.grupo) ? 'text-acentoTexto' : 'text-tinta'
            }`}
          >
            Cardio
          </span>
          <span className="block text-[11px] text-tenue">{textoHace(ultimaVez.cardio)}</span>
        </span>
      </button>
    </section>
  );
}

/**
 * Rutina guiada. Casi todos entrenan a su modo, asi que esto solo aparece para
 * quien ya la tiene, o para quien recien empieza y puede pedirla.
 */
export function RutinaGuiada({
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
      setDescartada(localStorage.getItem('gym.rutina.noGracias.' + sesionActual('socio')?.sub) === '1');
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
          <p className="text-sm text-secundario">
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
                localStorage.setItem('gym.rutina.noGracias.' + sesionActual('socio')?.sub, '1');
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
          <span className="shrink-0 text-xs text-tenue">hasta {fechaCorta(rutina.hasta.slice(0, 10))}</span>
        )}
      </div>
      {rutina.nota && <p className="text-sm italic text-secundario">“{rutina.nota}”</p>}
      {rutina.hoy ? (
        <ul className="divide-y divide-borde rounded-xl border border-borde">
          {rutina.hoy.ejercicios.map((e: any) => (
            <li key={e.exerciseId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-neutral/[0.04]"
                onClick={() => onUsar(e)}
              >
                <span className="text-tinta">{e.nombre}</span>
                <span className="shrink-0 text-tenue cifra">
                  {e.series} × {e.repeticiones} <span className="text-acentoTexto">→</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-secundario">
          Tu rutina no tiene nada para hoy. Descansa o entrena lo que quieras.
        </p>
      )}
      <p className="text-xs text-tenue">
        {rutina.dias.map((d: any) => `${d.nombreDia.slice(0, 3)}: ${d.titulo}`).join(' · ')}
      </p>
      <button className="min-h-11 px-1 text-xs text-tenue underline hover:text-tinta" onClick={dejar}>
        Dejar la rutina guiada
      </button>
    </section>
  );
}
