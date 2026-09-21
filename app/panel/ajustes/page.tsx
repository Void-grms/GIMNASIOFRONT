'use client';

import { useEffect, useState } from 'react';
import { api, descargar, fechaCorta } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';
import { CambiarClave } from '@/components/CambiarClave';

const REGIMENES = [
  { valor: 'nrus', texto: 'Nuevo RUS — sin IGV, solo boleta' },
  { valor: 'rer', texto: 'RER — IGV 18%, boleta y factura' },
  { valor: 'rmt', texto: 'MYPE Tributario — IGV 18%, boleta y factura' },
  { valor: 'general', texto: 'Regimen General — IGV 18%, boleta y factura' },
];

export default function Ajustes() {
  const [datos, setDatos] = useState<any>(null);
  const [respaldos, setRespaldos] = useState<any[]>([]);
  const [salud, setSalud] = useState<any>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargarSistema = async () => {
    const [b, h]: any = await Promise.all([api('/system/backups'), api('/system/health')]);
    setRespaldos(b);
    setSalud(h);
  };

  useEffect(() => {
    api('/settings')
      .then(setDatos)
      .catch((e) => setError(e.message));
    cargarSistema().catch(() => undefined);
  }, []);

  async function guardar(campos: Record<string, any>) {
    setError('');
    setAviso('');
    try {
      await api('/settings', { metodo: 'PATCH', cuerpo: campos });
      setAviso('Ajustes guardados.');
      setDatos(await api('/settings'));
    } catch (e: any) {
      setError(e.message);
    }
  }

  // Recepcion no ve los ajustes del negocio, pero si puede cambiar su clave.
  if (!datos) {
    if (!error) return <Esqueleto />;
    return (
      <div className="max-w-3xl space-y-6">
        <p className="aviso-mal">{error}</p>
        <CambiarClave />
      </div>
    );
  }

  const set = (k: string, v: any) => setDatos({ ...datos, [k]: v });

  return (
    <div className="max-w-3xl space-y-6">
      {aviso && <p className="aviso-ok">{aviso}</p>}
      {error && <p className="aviso-mal">{error}</p>}

      <CambiarClave />

      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-semibold">Datos del negocio</h2>
        <p className="text-sm text-zinc-500">
          Aparecen en cada comprobante. Sin RUC no se puede emitir boleta ni factura.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta">Razon social</label>
            <input
              className="campo"
              value={datos.razonSocial || ''}
              onChange={(e) => set('razonSocial', e.target.value)}
            />
          </div>
          <div>
            <label className="etiqueta">Nombre comercial</label>
            <input
              className="campo"
              value={datos.nombreComercial || ''}
              onChange={(e) => set('nombreComercial', e.target.value)}
            />
          </div>
          <div>
            <label className="etiqueta">RUC</label>
            <input
              className="campo"
              maxLength={11}
              value={datos.ruc || ''}
              onChange={(e) => set('ruc', e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <label className="etiqueta">Telefono</label>
            <input
              className="campo"
              value={datos.telefono || ''}
              onChange={(e) => set('telefono', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta">Direccion fiscal</label>
            <input
              className="campo"
              value={datos.direccionFiscal || ''}
              onChange={(e) => set('direccionFiscal', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta">Correo de contacto</label>
            <input
              className="campo"
              value={datos.email || ''}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
        </div>

        <button
          className="boton"
          onClick={() =>
            guardar({
              razonSocial: datos.razonSocial,
              nombreComercial: datos.nombreComercial,
              ruc: datos.ruc,
              telefono: datos.telefono,
              direccionFiscal: datos.direccionFiscal,
              email: datos.email,
            })
          }
        >
          Guardar datos
        </button>
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-semibold">Respaldo de la base</h2>
        <p className="text-sm text-zinc-500">
          Toda la operacion vive en un archivo en esta PC. Se copia sola cada madrugada y se
          conservan las ultimas 14 copias, pero llevate una a otro lado de vez en cuando.
        </p>

        {salud?.respaldo && (
          <div className="rounded-xl bg-black/40 p-3 text-sm">
            <p className={salud.respaldo.horasDesde === null || salud.respaldo.horasDesde > 48 ? 'text-porvencer' : 'text-vigente'}>
              {salud.respaldo.horasDesde === null
                ? 'Todavia no se hizo ningun respaldo'
                : `Ultimo respaldo hace ${salud.respaldo.horasDesde} hora(s)`}
            </p>
            <p className="text-zinc-500">{salud.respaldo.copias} copia(s) guardada(s)</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            className="boton"
            onClick={async () => {
              setAviso('');
              setError('');
              try {
                const r: any = await api('/system/backups', { metodo: 'POST' });
                setAviso(r.ok ? `Respaldo creado: ${r.archivo}` : r.mensaje);
                cargarSistema();
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            Respaldar ahora
          </button>
          {respaldos[0] && (
            <button
              className="boton-suave"
              onClick={() =>
                descargar(`/system/backups/${respaldos[0].archivo}`, respaldos[0].archivo).catch((e) =>
                  setError(e.message),
                )
              }
            >
              Descargar el ultimo
            </button>
          )}
        </div>

        {respaldos.length > 0 && (
          <ul className="divide-y divide-borde text-sm">
            {respaldos.slice(0, 5).map((r) => (
              <li key={r.archivo} className="flex justify-between py-2">
                <span className="text-zinc-400">{fechaCorta(r.fecha)}</span>
                <span className="text-zinc-500">{Math.round(r.tamano / 1024)} KB</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-semibold">Operacion</h2>
        <div>
          <label className="etiqueta">Invitados gratis por socio al mes</label>
          <input
            type="number"
            min={0}
            className="campo"
            value={datos.invitadosPorMes ?? 1}
            onChange={(e) => set('invitadosPorMes', Number(e.target.value))}
          />
          <p className="mt-1 text-sm text-zinc-500">
            Cada socio puede traer a alguien gratis dentro de este cupo. Un mismo invitado solo
            puede usarlo una vez.
          </p>
        </div>
        <button className="boton" onClick={() => guardar({ invitadosPorMes: datos.invitadosPorMes })}>
          Guardar
        </button>
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-semibold">Renovacion por Yape desde el portal</h2>
        <p className="text-sm text-zinc-500">
          El socio paga a este numero y sube la captura; recepcion la revisa y aprueba. Si lo dejas
          vacio, el portal no ofrece renovar.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta">Numero de Yape</label>
            <input
              className="campo"
              inputMode="numeric"
              maxLength={9}
              placeholder="9 digitos"
              value={datos.yapeNumero || ''}
              onChange={(e) => set('yapeNumero', e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <label className="etiqueta">Titular que ve el socio</label>
            <input
              className="campo"
              maxLength={80}
              value={datos.yapeTitular || ''}
              onChange={(e) => set('yapeTitular', e.target.value)}
            />
          </div>
        </div>
        <button
          className="boton"
          onClick={() => guardar({ yapeNumero: datos.yapeNumero || '', yapeTitular: datos.yapeTitular || '' })}
        >
          Guardar
        </button>
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-semibold">Aforo en la pagina web</h2>
        <p className="text-sm text-zinc-500">
          La landing muestra cuantas personas hay entrenando ahora (solo el numero, sin nombres).
          Con un aforo maximo, muestra tambien que tan lleno esta.
        </p>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={datos.mostrarAforo ?? true}
            onChange={(e) => set('mostrarAforo', e.target.checked)}
          />
          Mostrar el aforo en vivo en la pagina web
        </label>
        <div>
          <label className="etiqueta">Aforo maximo del local (0 = no mostrar porcentaje)</label>
          <input
            type="number"
            min={0}
            className="campo"
            value={datos.aforoMaximo ?? 0}
            onChange={(e) => set('aforoMaximo', Number(e.target.value))}
          />
        </div>
        <button
          className="boton"
          onClick={() => guardar({ mostrarAforo: datos.mostrarAforo ?? true, aforoMaximo: datos.aforoMaximo ?? 0 })}
        >
          Guardar
        </button>
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-semibold">Regimen tributario</h2>
        <p className="text-sm text-zinc-500">
          Decide si el comprobante desglosa IGV y si se puede emitir factura. Cambiarlo aqui alcanza,
          no hay que tocar el codigo.
        </p>

        <select
          className="campo"
          value={datos.regimen}
          onChange={(e) => set('regimen', e.target.value)}
        >
          {REGIMENES.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.texto}
            </option>
          ))}
        </select>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta">Tasa de IGV</label>
            <input
              type="number"
              step="0.01"
              className="campo"
              value={datos.igvTasa}
              onChange={(e) => set('igvTasa', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="etiqueta">Umbral para exigir documento</label>
            <input
              type="number"
              className="campo"
              value={datos.umbralDocumento}
              onChange={(e) => set('umbralDocumento', Number(e.target.value))}
            />
            <p className="mt-1 text-sm text-zinc-500">
              SUNAT lo fija hoy en S/ 700 para las boletas.
            </p>
          </div>
        </div>

        <button
          className="boton"
          onClick={() =>
            guardar({
              regimen: datos.regimen,
              igvTasa: datos.igvTasa,
              umbralDocumento: datos.umbralDocumento,
            })
          }
        >
          Guardar regimen
        </button>
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-semibold">Emision electronica</h2>
        <p className="text-sm text-zinc-500">
          El gimnasio no firma XML ni habla con SUNAT directamente: lo hace un PSE. Mientras esto
          diga &quot;ninguno&quot;, los comprobantes se guardan en el sistema sin enviarse.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta">Proveedor</label>
            <select
              className="campo"
              value={datos.pseProveedor || 'ninguno'}
              onChange={(e) => set('pseProveedor', e.target.value)}
            >
              <option value="ninguno">Ninguno</option>
              <option value="nubefact">NubeFacT</option>
            </select>
          </div>
          <div>
            <label className="etiqueta">URL del servicio</label>
            <input
              className="campo"
              value={datos.pseUrl || ''}
              onChange={(e) => set('pseUrl', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta">Token</label>
            <input
              className="campo"
              type="password"
              value={datos.pseToken || ''}
              onChange={(e) => set('pseToken', e.target.value)}
            />
          </div>
        </div>

        <button
          className="boton"
          onClick={() =>
            guardar({
              pseProveedor: datos.pseProveedor,
              pseUrl: datos.pseUrl,
              pseToken: datos.pseToken,
            })
          }
        >
          Guardar emision
        </button>
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-semibold">Textos legales</h2>
        <p className="text-sm text-zinc-500">
          Cada socio queda asociado a la version que acepto. Si cambias el texto, sube la version.
        </p>

        {[
          ['Condiciones de la membresia', 'terminosTexto', 'terminosVersion'],
          ['Politica de privacidad', 'privacidadTexto', 'privacidadVersion'],
          ['Consentimiento de datos', 'consentimientoTexto', 'consentimientoVersion'],
        ].map(([titulo, campoTexto, campoVersion]) => (
          <div key={campoTexto} className="space-y-2 border-t border-borde pt-4">
            <div className="flex items-center justify-between gap-3">
              <label className="etiqueta mb-0">{titulo}</label>
              <input
                className="campo w-24 py-1.5"
                value={datos[campoVersion] || ''}
                onChange={(e) => set(campoVersion, e.target.value)}
              />
            </div>
            <textarea
              className="campo min-h-40 font-mono text-xs"
              value={datos[campoTexto] || ''}
              onChange={(e) => set(campoTexto, e.target.value)}
            />
            <button
              className="boton-suave"
              onClick={() =>
                guardar({ [campoTexto]: datos[campoTexto], [campoVersion]: datos[campoVersion] })
              }
            >
              Guardar
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
