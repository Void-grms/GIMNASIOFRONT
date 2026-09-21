'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, descargar, fechaCorta, hora, soles } from '@/lib/api';
import { TarjetaSocio } from '@/components/TarjetaSocio';
import { CapturaFoto } from '@/components/CapturaFoto';
import { FormularioCobro } from '@/components/FormularioCobro';
import { EnviarWhatsapp } from '@/components/EnviarWhatsapp';
import { Esqueleto } from '@/components/Esqueleto';

export default function FichaSocio() {
  const { id } = useParams<{ id: string }>();
  const [ficha, setFicha] = useState<any>(null);
  const [ajustes, setAjustes] = useState<any>(null);
  const [cupo, setCupo] = useState<any>(null);
  const [invitado, setInvitado] = useState({ nombre: '', dni: '', telefono: '' });
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [f, a, c]: any = await Promise.all([
      api(`/members/${id}`),
      api('/settings'),
      api(`/guests/quota/${id}`),
    ]);
    setFicha(f);
    setAjustes(a);
    setCupo(c);
  }, [id]);

  async function registrarInvitado(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    try {
      const cuerpo: any = { memberId: id, nombre: invitado.nombre, dni: invitado.dni };
      if (invitado.telefono) cuerpo.telefono = invitado.telefono;
      await api('/guests', { metodo: 'POST', cuerpo });
      setAviso(`${invitado.nombre} puede pasar hoy como invitado.`);
      setInvitado({ nombre: '', dni: '', telefono: '' });
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function anonimizar() {
    const motivo = window.prompt(
      'El socio esta ejerciendo su derecho de supresion. Se borran nombre, DNI, contacto y foto; los comprobantes se conservan por obligacion tributaria.\n\nMotivo:',
    );
    if (motivo === null) return;
    try {
      await api(`/members/${id}/anonimizar`, { metodo: 'POST', cuerpo: { motivo } });
      setAviso('Datos personales suprimidos.');
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (error && !ficha) return <p className="text-vencido">{error}</p>;
  if (!ficha) return <Esqueleto />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <TarjetaSocio socio={ficha} />

        {aviso && <p className="aviso-ok">{aviso}</p>}
        {error && <p className="aviso-mal">{error}</p>}

        <details className="tarjeta">
          <summary className="rotulo cursor-pointer">
            {ficha.fotoUrl ? 'Cambiar foto' : 'Tomar foto del socio'}
          </summary>
          <p className="mb-3 mt-3 text-sm text-zinc-500">
            La foto permite comparar la cara con la pantalla al escanear. Sin ella, el codigo se
            puede prestar sin que nadie lo note.
          </p>
          <CapturaFoto
            onCaptura={async (imagen) => {
              try {
                await api(`/members/${id}/foto`, { metodo: 'POST', cuerpo: { imagen } });
                setAviso('Foto actualizada.');
                cargar();
              } catch (e: any) {
                setError(e.message);
              }
            }}
          />
        </details>

        <section>
          <h2 className="rotulo mb-2">
            Membresias
          </h2>
          <div className="tarjeta p-0">
            <ul className="divide-y divide-borde">
              {ficha.historial.length === 0 && (
                <li className="p-4 text-sm text-zinc-500">Todavia no compro ninguna.</li>
              )}
              {ficha.historial.map((m: any) => (
                <li key={m.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-medium">{m.plan.nombre}</p>
                    <p className="text-zinc-500">
                      {fechaCorta(m.fechaInicio)} — {fechaCorta(m.fechaFin)}
                    </p>
                  </div>
                  <span className="flex flex-col items-end gap-1.5">
                    <span className={m.estado === 'anulada' ? 'text-vencido' : 'text-zinc-300'}>
                      {soles(m.precioPagado)}
                    </span>
                    {m.estado !== 'anulada' && m.payments?.[0]?.id && (
                      <EnviarWhatsapp paymentId={m.payments[0].id} texto="WhatsApp" compacto />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="rotulo mb-2">
            Ultimos movimientos
          </h2>
          <div className="tarjeta p-0">
            <ul className="divide-y divide-borde">
              {ficha.socio.checkIns.length === 0 && (
                <li className="p-4 text-sm text-zinc-500">Sin visitas registradas.</li>
              )}
              {ficha.socio.checkIns.map((c: any) => (
                <li key={c.id} className="flex items-center gap-3 p-3 text-sm">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      c.resultado === 'permitido' ? 'bg-vigente' : 'bg-vencido'
                    }`}
                  />
                  {fechaCorta(c.timestamp)} · {hora(c.timestamp)} · {c.tipo}
                  <span className="ml-auto text-zinc-500">{c.motivo || c.metodo}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pase de invitado: el canal de captacion mas barato del gimnasio */}
        <section className="tarjeta">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="rotulo">
              Pase de invitado
            </h2>
            {cupo && (
              <span className={`text-sm ${cupo.restantes > 0 ? 'text-vigente' : 'text-zinc-500'}`}>
                {cupo.restantes} de {cupo.limite} disponible(s) este mes
              </span>
            )}
          </div>

          {cupo?.restantes > 0 ? (
            <form onSubmit={registrarInvitado} className="mt-3 space-y-3">
              {/* Etiquetas visibles: un placeholder desaparece al escribir y deja
                  al usuario sin saber que campo estaba llenando. */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="etiqueta" htmlFor="inv-nombre">Nombre del invitado</label>
                  <input
                    id="inv-nombre"
                    className="campo"
                    autoComplete="off"
                    required
                    value={invitado.nombre}
                    onChange={(e) => setInvitado({ ...invitado, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="etiqueta" htmlFor="inv-dni">DNI</label>
                  <input
                    id="inv-dni"
                    className="campo cifra"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={8}
                    required
                    value={invitado.dni}
                    onChange={(e) => setInvitado({ ...invitado, dni: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div>
                  <label className="etiqueta" htmlFor="inv-tel">
                    Celular <span className="text-zinc-600">(opcional)</span>
                  </label>
                  <input
                    id="inv-tel"
                    className="campo cifra"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={9}
                    value={invitado.telefono}
                    onChange={(e) => setInvitado({ ...invitado, telefono: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
              <button className="boton">Registrar invitado</button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              Ya uso su cupo de este mes. Su acompanante puede entrar con el pase diario.
            </p>
          )}
        </section>

        {/* Derechos del titular de los datos (Ley 29733) */}
        <section className="tarjeta">
          <h2 className="rotulo">
            Datos personales
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            El socio puede pedir una copia de sus datos o su supresion. Los comprobantes de pago se
            conservan igual, porque lo exige la norma tributaria.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="boton-suave"
              onClick={() =>
                descargar(`/members/${id}/datos`, `datos-${ficha.dni}.json`).catch((e) =>
                  setError(e.message),
                )
              }
            >
              Exportar sus datos
            </button>
            <button className="boton-suave" onClick={anonimizar}>
              Suprimir sus datos
            </button>
          </div>
        </section>
      </div>

      {ajustes && <FormularioCobro socio={ficha} ajustes={ajustes} onCobrado={cargar} />}
    </div>
  );
}
