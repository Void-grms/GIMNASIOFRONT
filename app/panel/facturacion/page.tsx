'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { api, descargar, sesionActual, soles } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';

type Documento = {
  id: string;
  tipo: string;
  serie: string;
  numero: number;
  estado: string;
  total: number;
  gravado: number;
  igv: number;
  codigo?: string;
  mensaje?: string;
  ticket?: string;
  emitidoAt: string;
  tieneXml: boolean;
  tieneCdr: boolean;
  intentos: number;
};
const ESTADOS: Record<string, string> = {
  creado: 'En cola',
  enviando: 'Enviando a SUNAT BETA',
  pendiente_ticket: 'Esperando respuesta del ticket',
  aceptado_beta: 'Aceptado en pruebas',
  rechazado_beta: 'Rechazado en pruebas',
  error_transporte: 'Resultado sin confirmar',
};
const CAMPOS = [
  ['ruc', 'RUC (11 dígitos)'],
  ['razonSocial', 'Razón social según la ficha RUC'],
  ['nombreComercial', 'Nombre comercial'],
  ['direccionFiscal', 'Domicilio fiscal'],
  ['ubigeo', 'Ubigeo (6 dígitos)'],
  ['departamento', 'Departamento'],
  ['provincia', 'Provincia'],
  ['distrito', 'Distrito'],
] as const;
const pendientes = (docs: Documento[]) =>
  docs.some((d) =>
    ['creado', 'enviando', 'pendiente_ticket'].includes(d.estado),
  );

export default function Facturacion() {
  const [admin, setAdmin] = useState<boolean | null>(null),
    [config, setConfig] = useState<any>(null),
    [datos, setDatos] = useState<Record<string, string>>({}),
    [docs, setDocs] = useState<Documento[]>([]);
  const [error, setError] = useState(''),
    [aviso, setAviso] = useState(''),
    [ocupado, setOcupado] = useState(false),
    [tipo, setTipo] = useState('boleta');
  const [solUsuario, setSolUsuario] = useState(''),
    [solClave, setSolClave] = useState(''),
    [pfx, setPfx] = useState<File | null>(null),
    [password, setPassword] = useState('');
  const [intento, setIntento] = useState<{
    tipo: string;
    idempotencyKey: string;
  } | null>(null);
  const enCurso = useRef(false),
    vivo = useRef(true);
  const cargar = useCallback(async () => {
    const [c, d] = await Promise.all([
      api('/sunat/config'),
      api<Documento[]>('/sunat/pruebas'),
    ]);
    if (!vivo.current) return;
    setConfig(c);
    setDocs(d);
    setDatos(
      Object.fromEntries(
        [...CAMPOS.map(([k]) => k), 'regimen'].map((k) => [k, c[k] || '']),
      ),
    );
  }, []);
  useEffect(() => {
    vivo.current = true;
    const a = sesionActual()?.rol === 'admin';
    setAdmin(a);
    if (a) {
      cargar().catch((e) => setError(e.message));
      try {
        const i = JSON.parse(
          sessionStorage.getItem('sunat.beta.intento') || 'null',
        );
        if (i?.idempotencyKey && ['boleta', 'factura'].includes(i.tipo)) {
          setIntento(i);
          setTipo(i.tipo);
        }
      } catch {}
    }
    return () => {
      vivo.current = false;
    };
  }, [cargar]);
  useEffect(() => {
    if (!admin || !pendientes(docs)) return;
    let activo = true;
    const timer = setInterval(() => {
      if (document.hidden) return;
      api<Documento[]>('/sunat/pruebas')
        .then((d) => {
          if (activo) setDocs(d);
        })
        .catch(() => {});
    }, 5000);
    return () => {
      activo = false;
      clearInterval(timer);
    };
  }, [admin, docs]);
  async function accion(trabajo: () => Promise<void>) {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      await trabajo();
    } catch (e) {
      if (vivo.current)
        setError(
          e instanceof Error
            ? e.message
            : 'No se pudo completar. Inténtalo otra vez.',
        );
    } finally {
      enCurso.current = false;
      if (vivo.current) setOcupado(false);
    }
  }
  async function guardar(e: FormEvent) {
    e.preventDefault();
    await accion(async () => {
      const c = await api('/sunat/config', {
        metodo: 'PATCH',
        cuerpo: {
          ...datos,
          ...(solUsuario ? { solUsuario } : {}),
          ...(solClave ? { solClave } : {}),
        },
      });
      setConfig(c);
      setSolUsuario('');
      setSolClave('');
      setAviso(
        'Datos guardados para preparar las pruebas. La emisión real sigue deshabilitada.',
      );
    });
  }
  async function probar() {
    await accion(async () => {
      const i = intento || { tipo, idempotencyKey: crypto.randomUUID() };
      setIntento(i);
      sessionStorage.setItem('sunat.beta.intento', JSON.stringify(i));
      const d = await api<Documento>('/sunat/pruebas', {
        metodo: 'POST',
        cuerpo: i,
      });
      sessionStorage.removeItem('sunat.beta.intento');
      setIntento(null);
      setDocs((actual) => [d, ...actual.filter((x) => x.id !== d.id)]);
      setAviso(
        'Prueba creada. Se enviará a SUNAT BETA sin registrar pagos ni cambiar membresías.',
      );
    });
  }
  async function guardarCertificado() {
    if (!pfx) return;
    await accion(async () => {
      if (pfx.size > 1_000_000)
        throw new Error('El certificado debe pesar como máximo 1 MB.');
      const bytes = new Uint8Array(await pfx.arrayBuffer());
      let binary = '';
      for (let n = 0; n < bytes.length; n += 8192)
        binary += String.fromCharCode(...bytes.subarray(n, n + 8192));
      const c = await api('/sunat/certificado', {
        metodo: 'POST',
        cuerpo: { pfxBase64: btoa(binary), password },
      });
      setConfig(c);
      setPassword('');
      setPfx(null);
      setAviso(
        'Certificado leído y guardado cifrado. Esto no verifica su registro en SUNAT.',
      );
    });
  }
  if (admin === null) return <Esqueleto filas={3} />;
  if (!admin)
    return (
      <div className="tarjeta max-w-xl">
        <h2 className="text-xl font-bold">Facturación electrónica</h2>
        <p className="mt-3 text-zinc-400">
          Solo el administrador puede configurar y probar la conexión con SUNAT.
        </p>
      </div>
    );
  if (!config)
    return (
      <div className="space-y-4">
        {error ? (
          <div role="alert" className="aviso-mal">
            {error}
            <button className="boton-suave mt-3" onClick={() => accion(cargar)}>
              Volver a cargar
            </button>
          </div>
        ) : (
          <Esqueleto filas={3} />
        )}
      </div>
    );
  return (
    <div className="max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-bold text-acento">
          SUNAT · Entorno de pruebas
        </p>
        <h2 className="text-2xl font-black tracking-tight">
          Prepara tu emisión electrónica
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
          Configura el emisor y prueba una boleta antes de usar comprobantes
          reales. Los cobros del gimnasio se consultan en{' '}
          <Link className="text-acento underline" href="/panel/comprobantes">
            Comprobantes
          </Link>
          .
        </p>
      </header>
      <div
        className="rounded-2xl border border-porvencer/35 bg-porvencer/[0.06] p-5 text-sm leading-relaxed"
        role="note"
      >
        <strong className="block text-porvencer">
          PRUEBA — SIN VALIDEZ TRIBUTARIA
        </strong>
        <p className="mt-2 text-zinc-300">
          Este laboratorio envía datos ficticios a SUNAT BETA. No cobra, no
          cambia membresías y no consume la numeración real. Una aceptación de
          prueba no habilita la emisión fiscal del gimnasio.
        </p>
      </div>
      {error && (
        <p role="alert" className="aviso-mal">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="aviso-ok">
          {aviso}
        </p>
      )}
      <section
        className="tarjeta-acento space-y-5"
        aria-labelledby="prueba-titulo"
      >
        <div>
          <h3 id="prueba-titulo" className="text-lg font-bold">
            1. Envía un comprobante de prueba
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            {config.ruc
              ? 'Se usará el RUC guardado y un cliente ficticio.'
              : 'Puedes empezar con el emisor ficticio de demostración, sin ingresar datos del negocio.'}{' '}
            La operación de ensayo es gravada al 18%; no establece el impuesto
            aplicable a tus ventas reales.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-borde bg-black/20 p-4">
            <p className="text-sm font-semibold">Servicio ficticio · S/60</p>
            <dl className="mt-3 space-y-1 text-sm text-zinc-400">
              <div className="flex justify-between gap-3">
                <dt>Valor de venta</dt>
                <dd>{soles(50.85)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>IGV de prueba (18%)</dt>
                <dd>{soles(9.15)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-borde pt-2 font-bold text-white">
                <dt>Total ficticio</dt>
                <dd>{soles(60)}</dd>
              </div>
            </dl>
          </div>
          <div className="space-y-3">
            <label htmlFor="sunat-tipo" className="etiqueta">
              Documento a ensayar
            </label>
            <select
              id="sunat-tipo"
              className="campo"
              disabled={ocupado || !!intento}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="boleta">Boleta de prueba</option>
              <option value="factura">Factura de prueba</option>
            </select>
            <button
              className="boton w-full"
              disabled={
                ocupado || !config.cifradoDisponible || !config.motorDisponible
              }
              onClick={probar}
            >
              {ocupado
                ? 'Procesando…'
                : intento
                  ? 'Recuperar el mismo intento'
                  : 'Crear prueba y enviar a SUNAT BETA'}
            </button>
            <p className="text-xs leading-relaxed text-zinc-500">
              Si la conexión se interrumpe, recupera el mismo intento. El botón
              conserva su identificador para evitar duplicarlo.
            </p>
          </div>
        </div>
        {(!config.cifradoDisponible || !config.motorDisponible) && (
          <p className="aviso-ojo">
            El servidor aún necesita{' '}
            {!config.cifradoDisponible
              ? 'configurar el cifrado privado'
              : 'instalar el motor de firma'}
            . Los cobros existentes siguen disponibles.
          </p>
        )}
      </section>
      <section
        className="tarjeta space-y-4"
        aria-labelledby="historial-pruebas"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="historial-pruebas" className="text-lg font-bold">
              Resultados de las pruebas
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              La aceptación requiere una constancia de recepción (CDR) con
              código 0.
            </p>
          </div>
          <button
            className="boton-suave"
            disabled={ocupado}
            onClick={() =>
              accion(async () => {
                setDocs(await api('/sunat/pruebas'));
              })
            }
          >
            Actualizar resultados
          </button>
        </div>
        {!docs.length ? (
          <p className="rounded-xl border border-dashed border-borde p-5 text-sm text-zinc-400">
            Todavía no hay pruebas. Crea la primera para revisar el XML firmado
            y la respuesta de SUNAT BETA.
          </p>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <article
                key={d.id}
                className="rounded-xl border border-borde p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold">
                      {d.tipo === 'boleta' ? 'Boleta' : 'Factura'} {d.serie}-
                      {d.numero}
                    </h4>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(d.emitidoAt).toLocaleString('es-PE', {
                        timeZone: 'America/Lima',
                      })}{' '}
                      · {d.intentos} intento(s)
                    </p>
                  </div>
                  <span
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${d.estado === 'aceptado_beta' ? 'bg-vigente/10 text-vigente' : d.estado === 'rechazado_beta' ? 'bg-vencido/10 text-vencido' : 'bg-porvencer/10 text-porvencer'}`}
                  >
                    {ESTADOS[d.estado] || d.estado}
                  </span>
                </div>
                <p className="mt-3 break-words text-sm leading-relaxed text-zinc-400">
                  {d.codigo && (
                    <strong className="text-zinc-200">
                      Código {d.codigo} ·{' '}
                    </strong>
                  )}
                  {d.mensaje}
                </p>
                {d.ticket && (
                  <p className="mt-2 break-all text-xs text-zinc-500">
                    Ticket: {d.ticket}. Recibir un ticket no significa
                    aceptación.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {d.tieneXml && (
                    <button
                      className="boton-suave"
                      disabled={ocupado}
                      onClick={() =>
                        accion(() =>
                          descargar(
                            `/sunat/pruebas/${d.id}/artefactos/xml`,
                            `PRUEBA-${d.serie}-${d.numero}.xml`,
                          ),
                        )
                      }
                    >
                      Descargar XML firmado
                    </button>
                  )}
                  {d.tieneCdr && (
                    <button
                      className="boton-suave"
                      disabled={ocupado}
                      onClick={() =>
                        accion(() =>
                          descargar(
                            `/sunat/pruebas/${d.id}/artefactos/cdr`,
                            `PRUEBA-CDR-${d.serie}-${d.numero}.zip`,
                          ),
                        )
                      }
                    >
                      Descargar CDR
                    </button>
                  )}
                  {['error_transporte', 'pendiente_ticket'].includes(
                    d.estado,
                  ) && (
                    <button
                      className="boton-suave"
                      disabled={ocupado}
                      onClick={() =>
                        accion(async () => {
                          await api(
                            `/sunat/pruebas/${d.id}/${d.ticket ? 'consultar' : 'reintentar'}`,
                            { metodo: 'POST' },
                          );
                          setDocs(await api('/sunat/pruebas'));
                        })
                      }
                    >
                      {d.ticket
                        ? 'Consultar ticket'
                        : 'Reintentar el mismo documento'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <form
        className="tarjeta space-y-5"
        onSubmit={guardar}
        aria-labelledby="emisor-titulo"
      >
        <div>
          <h3 id="emisor-titulo" className="text-lg font-bold">
            2. Datos del emisor
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Copia los datos de tu ficha RUC. Validar los dígitos no consulta el
            padrón ni confirma el régimen. Si dejas el RUC vacío, los ensayos
            usan el emisor ficticio.
          </p>
        </div>
        <fieldset disabled={ocupado} className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">
            Datos fiscales para preparar la emisión
          </legend>
          {CAMPOS.map(([k, label]) => (
            <div
              key={k}
              className={
                k === 'razonSocial' || k === 'direccionFiscal'
                  ? 'sm:col-span-2'
                  : ''
              }
            >
              <label className="etiqueta" htmlFor={`sunat-${k}`}>
                {label}
              </label>
              <input
                id={`sunat-${k}`}
                className="campo"
                value={datos[k] || ''}
                maxLength={k === 'ruc' ? 11 : k === 'ubigeo' ? 6 : 200}
                inputMode={k === 'ruc' || k === 'ubigeo' ? 'numeric' : 'text'}
                pattern={
                  k === 'ruc'
                    ? '[0-9]{11}'
                    : k === 'ubigeo'
                      ? '[0-9]{6}'
                      : undefined
                }
                onChange={(e) => setDatos({ ...datos, [k]: e.target.value })}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="sunat-regimen">
              Régimen según los tributos afectos de la ficha RUC
            </label>
            <select
              id="sunat-regimen"
              className="campo"
              value={datos.regimen || 'por_confirmar'}
              onChange={(e) => setDatos({ ...datos, regimen: e.target.value })}
            >
              <option value="por_confirmar">Por confirmar</option>
              <option value="nrus">Nuevo RUS</option>
              <option value="rer">Régimen Especial (RER)</option>
              <option value="rmt">MYPE Tributario</option>
              <option value="general">Régimen General</option>
            </select>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              El RUC 10 corresponde a persona natural; no determina el régimen
              ni si la operación está gravada, exonerada o inafecta.
            </p>
          </div>
        </fieldset>
        <details className="rounded-xl border border-borde p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Preparar credenciales SOL (opcional)
          </summary>
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            Las pruebas usan las credenciales públicas del servicio BETA. Las
            siguientes claves se guardan cifradas y no se envían en los ensayos
            ni se validan todavía. No compartas tu clave por chat.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sunat-sol-usuario" className="etiqueta">
                Usuario SOL {config.solUsuarioConfigurado ? '(guardado)' : ''}
              </label>
              <input
                id="sunat-sol-usuario"
                className="campo"
                autoComplete="off"
                value={solUsuario}
                onChange={(e) => setSolUsuario(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="sunat-sol-clave" className="etiqueta">
                Clave SOL {config.solClaveConfigurada ? '(guardada)' : ''}
              </label>
              <input
                id="sunat-sol-clave"
                className="campo"
                type="password"
                autoComplete="new-password"
                value={solClave}
                onChange={(e) => setSolClave(e.target.value)}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Deja los campos vacíos para conservar las claves existentes.
          </p>
        </details>
        <button
          className="boton"
          type="submit"
          disabled={ocupado || !config.cifradoDisponible}
        >
          Guardar datos del emisor
        </button>
      </form>
      <section
        className="tarjeta space-y-4"
        aria-labelledby="certificado-titulo"
      >
        <div>
          <h3 id="certificado-titulo" className="text-lg font-bold">
            3. Certificado digital
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Para ensayar se genera un certificado autofirmado de prueba. No
            necesitas comprar uno para empezar. Puedes preparar tu archivo
            PFX/P12; leerlo no valida su registro en SUNAT ni la titularidad del
            RUC.
          </p>
        </div>
        {config.certificado?.configurado ? (
          <div className="rounded-xl border border-borde p-4 text-sm">
            <p className="break-words font-semibold">
              {config.certificado.subject}
            </p>
            <p className="mt-2 text-zinc-400">
              Vigente hasta{' '}
              {new Date(config.certificado.validTo).toLocaleDateString('es-PE')}
            </p>
            <button
              className="boton-suave mt-3"
              disabled={ocupado}
              onClick={() =>
                accion(async () => {
                  setConfig(
                    await api('/sunat/certificado', { metodo: 'DELETE' }),
                  );
                  setAviso(
                    'Se usará el certificado autofirmado de prueba en los nuevos ensayos.',
                  );
                })
              }
            >
              Volver al certificado de prueba
            </button>
          </div>
        ) : (
          <p className="aviso-ojo">
            Certificado autofirmado de prueba · Solo para SUNAT BETA
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="sunat-pfx">
              Archivo PFX o P12 (máximo 1 MB)
            </label>
            <input
              id="sunat-pfx"
              className="campo min-w-0 text-sm file:mr-2 file:rounded file:border-0 file:p-1"
              type="file"
              accept=".pfx,.p12"
              onChange={(e) => setPfx(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label htmlFor="sunat-pfx-password" className="etiqueta">
              Clave del certificado
            </label>
            <input
              id="sunat-pfx-password"
              type="password"
              className="campo"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <button
          className="boton-suave"
          disabled={
            ocupado ||
            !pfx ||
            !config.cifradoDisponible ||
            !config.motorDisponible
          }
          onClick={guardarCertificado}
        >
          Validar y guardar certificado cifrado
        </button>
      </section>
      <section className="tarjeta space-y-4">
        <h3 className="text-lg font-bold">
          Emisión real: todavía deshabilitada
        </h3>
        <p className="text-sm leading-relaxed text-zinc-400">
          La ficha aportada sirve para preparar el alta. Antes de conectar
          ventas reales hay que completar y comprobar estos puntos. Ningún botón
          de esta pantalla envía comprobantes al servicio productivo.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-400">
          {config.pendientesProduccion.map((p: string) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
