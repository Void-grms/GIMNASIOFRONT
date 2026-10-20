'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fechaCorta, sesionActual } from '@/lib/api';
import { GraficoLinea } from '@/components/GraficoLinea';
import { Esqueleto } from '@/components/Esqueleto';
import { IconoCardio, MapaCuerpo, NOMBRE_GRUPO, SECCIONES, ZONA_CARDIO } from '@/components/MapaCuerpo';
const hoyTexto = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
export function PesoCorporal() {
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
        <p className="text-sm text-secundario">
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
            <div className="rounded-xl bg-fondo/70 p-3">
              <p className="text-3xl font-black tracking-tight cifra">{datos.actual} kg</p>
              <p className="text-sm text-tenue">tu ultimo registro</p>
            </div>
            <div className="rounded-xl bg-fondo/70 p-3">
              <p className="text-2xl font-black">
                {datos.variacion > 0 ? '+' : ''}
                {datos.variacion} kg
              </p>
              <p className="text-sm text-tenue">desde el primero</p>
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


