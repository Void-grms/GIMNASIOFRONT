'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta } from '@/lib/api';

/**
 * Avisos de vencimiento. No se envian solos: el mensaje sale del WhatsApp del
 * gimnasio con un clic. El envio automatico de verdad exige la API de WhatsApp
 * Business, que es un tramite aparte y cuesta por mensaje.
 */
export default function Avisos() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [p, h]: any = await Promise.all([
        api('/notifications/pending'),
        api('/notifications/history'),
      ]);
      setPendientes(p);
      setHistorial(h);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function avisar(a: any) {
    if (a.whatsapp) window.open(a.whatsapp, '_blank', 'noopener');
    await api(`/notifications/${a.memberId}/sent`, {
      metodo: 'POST',
      cuerpo: { tipo: a.tipo, mensaje: a.mensaje },
    });
    cargar();
  }

  const porVencer = pendientes.filter((a) => a.tipo === 'por_vencer');
  const vencidos = pendientes.filter((a) => a.tipo === 'vencido');

  return (
    <div className="space-y-8">
      {error && <p className="aviso-mal">{error}</p>}

      <Grupo
        titulo="Vencidos"
        descripcion="Se estan yendo. Este es el mensaje que mas plata recupera."
        avisos={vencidos}
        onAvisar={avisar}
      />
      <Grupo
        titulo="Por vencer"
        descripcion="Avisar antes evita que el socio pierda dias y se desanime."
        avisos={porVencer}
        onAvisar={avisar}
      />

      <section>
        <h2 className="rotulo mb-2">
          Ya enviados
        </h2>
        <div className="tarjeta p-0">
          <ul className="divide-y divide-borde">
            {historial.length === 0 && (
              <li className="p-4 text-sm text-zinc-500">Todavia no enviaste ninguno.</li>
            )}
            {historial.map((h) => (
              <li key={h.id} className="flex justify-between p-3 text-sm">
                <span>
                  {h.member.nombres} {h.member.apellidos}
                </span>
                <span className="text-zinc-500">
                  {h.tipo.replace('_', ' ')} · {fechaCorta(h.enviadoAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Grupo({
  titulo,
  descripcion,
  avisos,
  onAvisar,
}: {
  titulo: string;
  descripcion: string;
  avisos: any[];
  onAvisar: (a: any) => void;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">
        {titulo}
        <span className="ml-2 text-sm font-normal text-zinc-500">{avisos.length}</span>
      </h2>
      <p className="mb-3 text-sm text-zinc-500">{descripcion}</p>

      <div className="tarjeta p-0">
        {avisos.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">Nadie en esta lista.</p>
        ) : (
          <ul className="divide-y divide-borde">
            {avisos.map((a) => (
              <li key={a.memberId} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/panel/socios/${a.memberId}`} className="font-medium hover:underline">
                      {a.nombre}
                    </Link>
                    <p className="text-sm text-zinc-500">
                      {a.plan} · vence {fechaCorta(a.vence)}
                      {a.yaAvisado && <span className="ml-2 text-zinc-600">ya avisado</span>}
                    </p>
                  </div>
                  <button
                    className={a.yaAvisado ? 'boton-suave' : 'boton'}
                    disabled={!a.whatsapp}
                    onClick={() => onAvisar(a)}
                  >
                    {a.whatsapp ? 'Abrir WhatsApp' : 'Sin telefono'}
                  </button>
                </div>
                <p className="rounded-lg bg-black/40 p-3 text-sm text-zinc-400">{a.mensaje}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
