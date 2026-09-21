'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const DOCS = [
  { valor: 'dni', texto: 'DNI' },
  { valor: 'ce', texto: 'Carne de extranjeria' },
  { valor: 'pasaporte', texto: 'Pasaporte' },
  { valor: 'ruc', texto: 'RUC' },
];

/**
 * Libro de reclamaciones virtual. Los campos son los del anexo del reglamento
 * del Codigo de Proteccion y Defensa del Consumidor: si falta alguno, el
 * registro no sirve ante INDECOPI.
 */
export default function LibroDeReclamaciones() {
  const [datos, setDatos] = useState<any>({
    tipo: 'reclamo',
    nombre: '',
    tipoDoc: 'dni',
    numDoc: '',
    telefono: '',
    email: '',
    direccion: '',
    esMenorDeEdad: false,
    apoderado: '',
    bienTipo: 'servicio',
    bienDescripcion: '',
    montoReclamado: '',
    detalle: '',
    pedido: '',
  });
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const set = (k: string, v: any) => setDatos({ ...datos, [k]: v });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const cuerpo: any = { ...datos };
      cuerpo.montoReclamado = datos.montoReclamado ? Number(datos.montoReclamado) : undefined;
      for (const k of ['telefono', 'direccion', 'apoderado']) if (!cuerpo[k]) delete cuerpo[k];
      setResultado(await api('/complaints', { metodo: 'POST', cuerpo }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="tarjeta space-y-3 text-center">
          <h1 className="text-2xl font-bold">Registro recibido</h1>
          <p className="text-zinc-400">{resultado.mensaje}</p>
          <p className="rounded-xl bg-black/40 p-4 text-lg font-black tracking-wider">
            {resultado.codigo}
          </p>
          <p className="text-sm text-zinc-500">
            Guarda este codigo: con el puedes consultar el estado de tu registro.
          </p>
          <Link href="/" className="boton-suave">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-black">Libro de reclamaciones</h1>
        <p className="mt-2 text-zinc-400">
          Conforme a la ley tienes derecho a dejar tu reclamo o queja. Recibiras una respuesta en un
          plazo maximo de 15 dias habiles.
        </p>
      </header>

      <form onSubmit={enviar} className="space-y-5">
        <section className="tarjeta space-y-4">
          <h2 className="font-semibold">Tipo de registro</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['reclamo', 'Reclamo', 'Disconformidad con el producto o servicio'],
              ['queja', 'Queja', 'Malestar con la atencion recibida'],
            ].map(([valor, titulo, ayuda]) => (
              <button
                key={valor}
                type="button"
                onClick={() => set('tipo', valor)}
                className={`rounded-xl border p-3 text-left transition ${
                  datos.tipo === valor
                    ? 'border-acento bg-acento/10'
                    : 'border-borde hover:bg-white/5'
                }`}
              >
                <span className="block font-medium">{titulo}</span>
                <span className="text-sm text-zinc-500">{ayuda}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="tarjeta space-y-4">
          <h2 className="font-semibold">Tus datos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="etiqueta">Nombre completo *</label>
              <input className="campo" required value={datos.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </div>
            <div>
              <label className="etiqueta">Tipo de documento *</label>
              <select className="campo" value={datos.tipoDoc} onChange={(e) => set('tipoDoc', e.target.value)}>
                {DOCS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.texto}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">Numero *</label>
              <input className="campo" required value={datos.numDoc} onChange={(e) => set('numDoc', e.target.value)} />
            </div>
            <div>
              <label className="etiqueta">Correo *</label>
              <input type="email" className="campo" required value={datos.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className="etiqueta">Telefono</label>
              <input className="campo" value={datos.telefono} onChange={(e) => set('telefono', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="etiqueta">Direccion</label>
              <input className="campo" value={datos.direccion} onChange={(e) => set('direccion', e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={datos.esMenorDeEdad}
              onChange={(e) => set('esMenorDeEdad', e.target.checked)}
            />
            Soy menor de edad
          </label>

          {datos.esMenorDeEdad && (
            <div>
              <label className="etiqueta">Nombre del padre, madre o apoderado *</label>
              <input className="campo" required value={datos.apoderado} onChange={(e) => set('apoderado', e.target.value)} />
            </div>
          )}
        </section>

        <section className="tarjeta space-y-4">
          <h2 className="font-semibold">Sobre que reclamas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta">Tipo *</label>
              <select className="campo" value={datos.bienTipo} onChange={(e) => set('bienTipo', e.target.value)}>
                <option value="servicio">Servicio</option>
                <option value="producto">Producto</option>
              </select>
            </div>
            <div>
              <label className="etiqueta">Monto reclamado (opcional)</label>
              <input
                type="number"
                step="0.10"
                className="campo"
                value={datos.montoReclamado}
                onChange={(e) => set('montoReclamado', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="etiqueta">Descripcion del producto o servicio *</label>
              <input
                className="campo"
                required
                placeholder="Membresia mensual, pase diario, venta de mostrador..."
                value={datos.bienDescripcion}
                onChange={(e) => set('bienDescripcion', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="tarjeta space-y-4">
          <h2 className="font-semibold">Tu reclamo</h2>
          <div>
            <label className="etiqueta">Cuentanos que paso *</label>
            <textarea
              className="campo min-h-32"
              required
              value={datos.detalle}
              onChange={(e) => set('detalle', e.target.value)}
            />
          </div>
          <div>
            <label className="etiqueta">Que esperas que hagamos *</label>
            <textarea
              className="campo min-h-24"
              required
              value={datos.pedido}
              onChange={(e) => set('pedido', e.target.value)}
            />
          </div>
        </section>

        {error && <p className="aviso-mal">{error}</p>}

        <p className="text-sm text-zinc-500">
          Tus datos se usan unicamente para atender este registro, segun nuestra{' '}
          <Link href="/privacidad" className="text-acento underline">
            politica de privacidad
          </Link>
          .
        </p>

        <button className="boton w-full" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar registro'}
        </button>
      </form>
    </main>
  );
}
