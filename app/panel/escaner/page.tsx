'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TarjetaSocio } from '@/components/TarjetaSocio';
import { EscanerCamara } from '@/components/EscanerCamara';

/**
 * Recepcion usa su celular como lector: apunta la camara al QR del socio y el
 * ingreso se registra igual que con el lector USB. La computadora de recepcion
 * lo muestra en grande sola, porque ve el movimiento en su lista de recientes
 * (por eso el dispositivo empieza con "celular").
 */
export default function Escaner() {
  const [resultado, setResultado] = useState<any>(null);
  const [procesando, setProcesando] = useState(false);
  const [dni, setDni] = useState('');
  const [error, setError] = useState('');

  const enviar = useCallback(async (codigo: string) => {
    setProcesando(true);
    setError('');
    try {
      const r = await api('/check-ins/scan', {
        metodo: 'POST',
        cuerpo: { codigo, dispositivo: 'celular-recepcion' },
      });
      setResultado(r);
    } catch (e: any) {
      setError(e.message);
      setResultado(null);
    } finally {
      setProcesando(false);
    }
  }, []);

  // El resultado se queda unos segundos y la camara vuelve a quedar libre.
  useEffect(() => {
    if (!resultado && !error) return;
    const t = setTimeout(() => {
      setResultado(null);
      setError('');
    }, 5000);
    return () => clearTimeout(t);
  }, [resultado, error]);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <p className="text-sm text-zinc-500">
        Apunta al QR del socio. La computadora de recepcion lo muestra al instante.
      </p>

      <EscanerCamara onLeer={enviar} pausado={procesando || !!resultado} />

      <div className="min-h-[9rem]">
        {procesando && <div className="tarjeta text-center text-zinc-400">Verificando…</div>}
        {error && <p className="aviso-mal">{error}</p>}
        {resultado && (
          <div className="space-y-2">
            <TarjetaSocio
              socio={resultado.socio}
              resultado={resultado.resultado}
              tipo={resultado.tipo}
              motivo={resultado.motivo}
              compacta
              segundos={5}
            />
            <button className="boton-suave w-full" onClick={() => setResultado(null)}>
              Siguiente socio
            </button>
          </div>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (dni.length === 8) {
            enviar(dni);
            setDni('');
          }
        }}
      >
        <input
          className="campo"
          inputMode="numeric"
          maxLength={8}
          placeholder="O teclea el DNI"
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
        />
        <button className="boton shrink-0" disabled={dni.length !== 8 || procesando}>
          Marcar
        </button>
      </form>
    </div>
  );
}
