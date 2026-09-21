'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fechaCorta } from '@/lib/api';

const COLOR: Record<string, string> = {
  vigente: 'punto-vigente',
  por_vencer: 'punto-porvencer',
  vencido: 'punto-vencido',
  sin_membresia: 'h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-700',
};

export default function Socios() {
  const [q, setQ] = useState('');
  const [socios, setSocios] = useState<any[]>([]);
  const [nuevo, setNuevo] = useState(false);

  async function buscar(texto = q) {
    setSocios(await api(`/members?q=${encodeURIComponent(texto)}`));
  }

  useEffect(() => {
    const t = setTimeout(() => buscar(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <input
          className="campo flex-1"
          placeholder="Buscar por nombre o DNI"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="boton" onClick={() => setNuevo((v) => !v)}>
          {nuevo ? 'Cerrar' : 'Nuevo socio'}
        </button>
      </div>

      {nuevo && (
        <FormularioSocio
          onListo={() => {
            setNuevo(false);
            buscar();
          }}
        />
      )}

      <div className="tarjeta p-0">
        <ul className="divide-y divide-borde">
          {socios.length === 0 && <li className="p-5 text-sm text-zinc-500">Sin resultados.</li>}
          {socios.map((s) => (
            <li key={s.id}>
              <Link href={`/panel/socios/${s.id}`} className="flex items-center gap-3 p-4 hover:bg-white/5">
                <span className={COLOR[s.estado]} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.nombreCompleto}</p>
                  <p className="text-sm text-zinc-500 cifra">
                    DNI {s.dni}
                    {s.plan ? ` · ${s.plan}` : ' · sin membresia'}
                  </p>
                </div>
                <span className="ml-auto shrink-0 text-sm text-zinc-500">
                  {s.vence ? `vence ${fechaCorta(s.vence)}` : '—'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FormularioSocio({ onListo }: { onListo: () => void }) {
  const [datos, setDatos] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    direccion: '',
    esUniversitario: false,
  });
  const [consentimiento, setConsentimiento] = useState(false);
  const [ajustes, setAjustes] = useState<any>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState<any>(null);

  useEffect(() => {
    api('/settings')
      .then(setAjustes)
      .catch(() => setAjustes(null));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const cuerpo: any = { ...datos, consentimiento };
      for (const k of ['telefono', 'direccion']) if (!cuerpo[k]) delete cuerpo[k];
      // El PIN en claro llega una sola vez, en esta respuesta.
      setCreado(await api('/members', { metodo: 'POST', cuerpo }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (creado) {
    return (
      <div className="tarjeta space-y-3 border-vigente/40 bg-vigente/5">
        <h3 className="text-lg font-semibold">
          {creado.nombres} {creado.apellidos} quedo registrado
        </h3>
        <p className="text-sm text-zinc-400">
          Este es el PIN para entrar al portal. Anotalo y entregaselo: no se vuelve a mostrar, y el
          socio tendra que cambiarlo la primera vez que entre.
        </p>
        <p className="rounded-xl bg-black/50 py-4 text-center text-4xl font-black tracking-[0.4em]">
          {creado.pinInicial}
        </p>
        <button className="boton w-full" onClick={onListo}>
          Ya lo anote
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className="tarjeta space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta">DNI</label>
          <input
            className="campo cifra"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={datos.dni}
            onChange={(e) => setDatos({ ...datos, dni: e.target.value.replace(/\D/g, '') })}
            required
          />
        </div>
        <div>
          <label className="etiqueta">Celular <span className="text-zinc-600">(opcional)</span></label>
          <input
            className="campo cifra"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            maxLength={9}
            value={datos.telefono}
            onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
          />
        </div>
        <div>
          <label className="etiqueta">Nombres</label>
          <input
            className="campo"
            value={datos.nombres}
            onChange={(e) => setDatos({ ...datos, nombres: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="etiqueta">Apellidos</label>
          <input
            className="campo"
            value={datos.apellidos}
            onChange={(e) => setDatos({ ...datos, apellidos: e.target.value })}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="etiqueta">Direccion (opcional)</label>
          <input
            className="campo"
            value={datos.direccion}
            onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={datos.esUniversitario}
          onChange={(e) => setDatos({ ...datos, esUniversitario: e.target.checked })}
        />
        Verifique su carne universitario vigente
      </label>

      <p className="text-sm text-zinc-500">
        Su PIN del portal seran los ultimos 4 digitos del DNI.
      </p>

      {/* Consentimiento expreso, especifico e informado (Ley 29733). Sin esto
          el alta no procede: el backend tambien lo rechaza. */}
      <div className="rounded-xl border border-borde bg-black/30 p-4">
        <p className="mb-3 max-h-40 overflow-auto whitespace-pre-wrap text-sm text-zinc-400">
          {ajustes?.consentimientoTexto || 'Cargando el texto de consentimiento...'}
        </p>
        <label className="flex items-start gap-2 text-sm text-zinc-200">
          <input
            type="checkbox"
            className="mt-1"
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
          />
          <span>
            El socio leyo este texto y autoriza el tratamiento de sus datos personales
            {ajustes?.consentimientoVersion ? ` (version ${ajustes.consentimientoVersion})` : ''}.
          </span>
        </label>
      </div>

      {error && <p className="text-sm text-vencido">{error}</p>}

      <button className="boton" disabled={guardando || !consentimiento}>
        {guardando ? 'Guardando...' : 'Registrar socio'}
      </button>
    </form>
  );
}
