'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, fechaCorta, soles } from '@/lib/api';

/**
 * Bandeja del libro de reclamaciones. El plazo de 15 dias habiles es
 * improrrogable, asi que lo primero que se ve es cuanto queda.
 */
export default function Reclamaciones() {
  const [lista, setLista] = useState<any[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLista(await api('/complaints'));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function responder(id: string) {
    try {
      await api(`/complaints/${id}/respond`, { metodo: 'POST', cuerpo: { respuesta } });
      setRespuesta('');
      setAbierto(null);
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const pendientes = lista.filter((r) => r.estado === 'pendiente');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          Libro de reclamaciones
          <span className="ml-2 text-sm font-normal text-zinc-500">
            {pendientes.length} sin responder
          </span>
        </h2>
        <p className="text-sm text-zinc-500">
          La ley da 15 dias habiles improrrogables para responder cada registro.
        </p>
      </div>

      {error && <p className="aviso-mal">{error}</p>}

      <div className="space-y-4">
        {lista.length === 0 && (
          <div className="tarjeta text-sm text-zinc-500">Todavia no hay reclamos ni quejas.</div>
        )}

        {lista.map((r) => (
          <article key={r.id} className="tarjeta space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {r.codigo}
                  <span className="ml-2 text-sm font-normal capitalize text-zinc-400">{r.tipo}</span>
                </p>
                <p className="text-sm text-zinc-500">
                  {r.nombre} · {r.tipoDoc.toUpperCase()} {r.numDoc} · {r.email}
                  {r.telefono ? ` · ${r.telefono}` : ''}
                </p>
                <p className="text-sm text-zinc-500">
                  Registrado {fechaCorta(r.createdAt)} · {r.bienTipo}: {r.bienDescripcion}
                  {r.montoReclamado ? ` · ${soles(r.montoReclamado)}` : ''}
                </p>
              </div>

              <span
                className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${
                  r.estado === 'respondido'
                    ? 'bg-vigente/10 text-vigente'
                    : r.vencido
                      ? 'bg-vencido/10 text-vencido'
                      : 'bg-porvencer/10 text-porvencer'
                }`}
              >
                {r.estado === 'respondido'
                  ? 'Respondido'
                  : r.vencido
                    ? 'Plazo vencido'
                    : `Quedan ${r.diasParaResponder} dia(s)`}
              </span>
            </div>

            <div className="rounded-xl bg-black/40 p-3 text-sm">
              <p className="text-zinc-300">{r.detalle}</p>
              <p className="mt-2 text-zinc-400">
                <span className="text-zinc-500">Pide: </span>
                {r.pedido}
              </p>
            </div>

            {r.estado === 'respondido' ? (
              <div className="rounded-xl border border-vigente/30 bg-vigente/5 p-3 text-sm">
                <p className="text-zinc-300">{r.respuesta}</p>
                <p className="mt-1 text-zinc-500">
                  {r.respondidoPor} · {fechaCorta(r.respondidoAt)}
                </p>
              </div>
            ) : abierto === r.id ? (
              <div className="space-y-2">
                <textarea
                  className="campo min-h-28"
                  placeholder="Respuesta al consumidor"
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                />
                <div className="flex gap-2">
                  <button className="boton" onClick={() => responder(r.id)}>
                    Registrar respuesta
                  </button>
                  <button className="boton-suave" onClick={() => setAbierto(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button className="boton-suave" onClick={() => setAbierto(r.id)}>
                Responder
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
