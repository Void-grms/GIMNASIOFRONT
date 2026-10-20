'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, sesionActual, soles } from '@/lib/api';
import { Esqueleto } from '@/components/Esqueleto';

type Plan = {
  id: string;
  nombre: string;
  precio: number;
  duracionDias: number;
  descripcion?: string | null;
  limiteAsistencias?: number | null;
  esPromocion?: boolean;
  requiereEvidencia?: boolean;
  activo: boolean;
  orden: number;
  historico?: boolean;
};

type Borrador = Omit<Plan, 'id'>;
type Filtro = 'activos' | 'inactivos' | 'todos';
const POR_PAGINA = 12;
const NUEVO: Borrador = {
  nombre: '', precio: 0, duracionDias: 30, descripcion: '', limiteAsistencias: null,
  esPromocion: false, requiereEvidencia: false, activo: true, orden: 0,
};
const INTERDIARIA: Borrador = {
  ...NUEVO, nombre: 'Interdiaria', precio: 60, limiteAsistencias: 12,
  descripcion: '12 asistencias durante 30 días desde el inicio de la membresía.',
};

export default function Membresias() {
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('activos');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);
  const [formulario, setFormulario] = useState<{ plan?: Plan; inicial: Borrador } | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const cambioEnCurso = useRef(false);

  useEffect(() => setEsAdmin(sesionActual('staff')?.rol === 'admin'), []);

  useEffect(() => {
    if (!esAdmin) return;
    let vigente = true;
    setCargando(true);
    setError('');
    api<Plan[]>(`/plans/admin?estado=${filtro}`)
      .then((datos) => { if (vigente) setPlanes(datos); })
      .catch((e: Error) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [esAdmin, filtro, revision]);

  useEffect(() => setPagina(1), [filtro, busqueda]);

  const encontrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es-PE');
    return planes.filter((plan) => (
      (filtro === 'todos' || plan.activo === (filtro === 'activos'))
      && (!q || `${plan.nombre} ${plan.descripcion || ''}`.toLocaleLowerCase('es-PE').includes(q))
    ));
  }, [planes, filtro, busqueda]);
  const paginas = Math.max(1, Math.ceil(encontrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = encontrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  function abrir(inicial: Borrador, plan?: Plan) {
    setError('');
    setAviso('');
    setFormulario({ inicial, plan });
  }

  async function cambiarEstado(plan: Plan) {
    if (cambioEnCurso.current) return;
    cambioEnCurso.current = true;
    setCambiando(plan.id);
    setError('');
    setAviso('');
    try {
      await api(`/plans/${plan.id}`, { metodo: 'PATCH', cuerpo: { activo: !plan.activo } });
      setAviso(`${plan.nombre}: ${plan.activo ? 'plan desactivado. Sus membresías vendidas siguen vigentes.' : 'plan reactivado y disponible para nuevas ventas.'}`);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado. Inténtalo otra vez.');
    } finally {
      cambioEnCurso.current = false;
      setCambiando(null);
    }
  }

  if (esAdmin === null) return <Esqueleto filas={3} />;
  if (!esAdmin) return (
    <div className="tarjeta max-w-xl space-y-3">
      <h2 className="text-lg font-bold">Administración de membresías</h2>
      <p className="text-sm text-secundario">Solo el administrador puede crear o cambiar planes. Para cobrar una membresía, abre la ficha del socio.</p>
      <Link className="boton-suave" href="/panel/socios">Ir a socios</Link>
    </div>
  );

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-xl font-extrabold tracking-tight">Planes del gimnasio</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-secundario">Define cuánto cuesta cada membresía, su vigencia y cuántas asistencias incluye. Los planes activos aparecen al cobrar, en el portal y en la web.</p>
        </div>
        {!formulario && <button type="button" className="boton w-full sm:w-auto" onClick={() => abrir({ ...NUEVO })}>Añadir membresía</button>}
      </div>

      {aviso && <p role="status" className="aviso-ok">{aviso}</p>}
      {error && <div role="alert" className="aviso-mal flex flex-wrap items-center justify-between gap-3"><span>{error}</span><button type="button" className="underline underline-offset-4" onClick={() => setRevision((v) => v + 1)}>Volver a cargar</button></div>}

      {formulario ? (
        <FormularioPlan
          key={formulario.plan?.id || formulario.inicial.nombre || 'nuevo'}
          plan={formulario.plan}
          inicial={formulario.inicial}
          onCancelar={() => setFormulario(null)}
          onGuardado={(nombre) => {
            setFormulario(null);
            setAviso(`${nombre}: ${formulario.plan ? 'cambios guardados para nuevas ventas.' : 'membresía añadida.'}`);
            setRevision((v) => v + 1);
          }}
        />
      ) : (
        <>
          <section className="rounded-2xl border border-acento/20 bg-acento/[0.04] p-4 sm:p-5" aria-labelledby="interdiaria-titulo">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 id="interdiaria-titulo" className="font-bold">Interdiaria · Entrena a tu ritmo</h3>
                <p className="mt-1 text-sm text-secundario">S/ 60 · 12 asistencias durante 30 días desde el inicio. Sin días de la semana fijos.</p>
              </div>
              <button type="button" className="boton-suave w-full sm:w-auto" onClick={() => abrir({ ...INTERDIARIA })}>Usar como base</button>
            </div>
          </section>

          <section aria-label="Catálogo de membresías" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <label htmlFor="buscar-plan" className="etiqueta">Buscar membresía</label>
                <input id="buscar-plan" className="campo" type="search" placeholder="Nombre o descripción" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
              <div>
                <label htmlFor="estado-plan" className="etiqueta">Mostrar</label>
                <select id="estado-plan" className="campo" value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
                  <option value="activos">Planes activos</option><option value="inactivos">Planes inactivos</option><option value="todos">Todos los planes</option>
                </select>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-tenue">Los planes desactivados y los importados del sistema anterior se conservan en el historial. Los importados son de consulta; puedes crear una copia para ofrecerlos de nuevo.</p>
            {cargando ? <Esqueleto filas={3} /> : !error && encontrados.length === 0 ? (
              <div className="tarjeta py-10 text-center">
                <h3 className="font-bold">{busqueda ? 'No encontramos esa membresía' : `No hay planes ${filtro === 'inactivos' ? 'inactivos' : filtro === 'activos' ? 'activos' : 'registrados'}`}</h3>
                <p className="mt-2 text-sm text-secundario">{busqueda ? 'Prueba otro nombre o cambia el filtro.' : 'Añade una membresía para definir su precio y condiciones.'}</p>
              </div>
            ) : !error && (
              <>
                <p className="text-sm text-secundario" role="status">{encontrados.length} {encontrados.length === 1 ? 'membresía' : 'membresías'} · {filtro === 'activos' ? 'disponibles para vender' : filtro === 'inactivos' ? 'fuera de venta' : 'en el catálogo'}</p>
                <div className="grid gap-4 xl:grid-cols-2">
                  {visibles.map((plan) => (
                    <article key={plan.id} className={`tarjeta flex min-w-0 flex-col ${!plan.activo ? 'border-dashed' : ''}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-lg font-extrabold leading-tight">{plan.nombre}</h3>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className={`rounded-md px-2 py-1 ${plan.activo ? 'bg-vigente/10 text-vigente' : 'bg-neutral/[0.06] text-secundario'}`}>{plan.activo ? 'Activo' : 'Inactivo'}</span>
                            {plan.esPromocion && <span className="rounded-md bg-acento/10 px-2 py-1 text-acentoTexto">Promoción</span>}
                            {plan.historico && <span className="rounded-md bg-neutral/[0.06] px-2 py-1 text-secundario">Histórico importado</span>}
                            {plan.requiereEvidencia && <span className="rounded-md bg-neutral/[0.06] px-2 py-1 text-secundario">Carné universitario</span>}
                          </div>
                        </div>
                        <p className="text-2xl font-black tracking-tight cifra">{soles(plan.precio)}</p>
                      </div>
                      <dl className="mt-5 grid grid-cols-2 divide-x divide-borde border-y border-borde py-3">
                        <div className="pr-3"><dt className="text-xs text-tenue">Vigencia desde el inicio</dt><dd className="mt-1 font-bold cifra">{plan.duracionDias} {plan.duracionDias === 1 ? 'día' : 'días'}</dd></div>
                        <div className="pl-4"><dt className="text-xs text-tenue">Asistencias incluidas</dt><dd className="mt-1 font-bold cifra">{plan.limiteAsistencias == null ? 'Sin límite' : `${plan.limiteAsistencias} en toda la vigencia`}</dd></div>
                      </dl>
                      {plan.descripcion && <p className="mt-3 break-words text-sm leading-relaxed text-secundario">{plan.descripcion}</p>}
                      <div className="mt-auto flex flex-wrap gap-2 pt-5">
                        {plan.historico ? <button type="button" className="boton-suave flex-1" onClick={() => abrir({ ...plan, nombre: `${plan.nombre} (copia)`.slice(0, 100), activo: true })}>Crear copia</button> : <>
                          <button type="button" className="boton-suave flex-1" onClick={() => abrir({ ...plan }, plan)} disabled={!!cambiando} aria-label={`Editar ${plan.nombre}`}>Editar plan</button>
                          <button type="button" className="boton-suave flex-1" disabled={!!cambiando} onClick={() => cambiarEstado(plan)} aria-label={`${plan.activo ? 'Desactivar' : 'Reactivar'} ${plan.nombre}`}>{cambiando === plan.id ? 'Guardando…' : plan.activo ? 'Desactivar' : 'Reactivar'}</button>
                        </>}
                      </div>
                    </article>
                  ))}
                </div>
                {paginas > 1 && <nav aria-label="Páginas de membresías" className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-4">
                  <p className="text-sm text-secundario cifra">Página {paginaActual} de {paginas}</p>
                  <div className="flex gap-2"><button type="button" className="boton-suave" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)}>Anterior</button><button type="button" className="boton-suave" disabled={paginaActual === paginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button></div>
                </nav>}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function FormularioPlan({ plan, inicial, onCancelar, onGuardado }: {
  plan?: Plan; inicial: Borrador; onCancelar: () => void; onGuardado: (nombre: string) => void;
}) {
  const [datos, setDatos] = useState(inicial);
  const [limitado, setLimitado] = useState(inicial.limiteAsistencias != null);
  const [limite, setLimite] = useState(String(inicial.limiteAsistencias ?? 12));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); }, []);

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enCurso.current) return;
    const nombre = datos.nombre.trim();
    if (nombre.length < 2) { setError('Escribe un nombre de al menos 2 caracteres.'); return; }
    if (limitado && (!Number.isInteger(Number(limite)) || Number(limite) < 1)) { setError('Indica una cantidad de asistencias mayor que cero.'); return; }
    enCurso.current = true;
    setGuardando(true);
    setError('');
    try {
      await api(plan ? `/plans/${plan.id}` : '/plans', {
        metodo: plan ? 'PATCH' : 'POST',
        cuerpo: {
          nombre, precio: datos.precio, duracionDias: datos.duracionDias,
          descripcion: (datos.descripcion || '').trim(), activo: datos.activo,
          requiereEvidencia: !!datos.requiereEvidencia, esPromocion: !!datos.esPromocion,
          orden: datos.orden, limiteAsistencias: limitado ? Number(limite) : null,
        },
      });
      onGuardado(nombre);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la membresía. Inténtalo otra vez.');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="tarjeta max-w-3xl space-y-6" aria-labelledby="editar-plan-titulo">
      <div><h3 ref={titulo} tabIndex={-1} id="editar-plan-titulo" className="text-xl font-bold">{plan ? `Editar ${plan.nombre}` : 'Añadir membresía'}</h3><p className="mt-2 text-sm leading-relaxed text-secundario">Los cambios se aplican a nuevas ventas. Las membresías ya vendidas conservan el precio, la vigencia y las asistencias contratadas.</p></div>
      {error && <p role="alert" className="aviso-mal">{error}</p>}
      <fieldset disabled={guardando} className="space-y-5">
        <legend className="sr-only">Precio y condiciones de la membresía</legend>
        <div><label htmlFor="plan-nombre" className="etiqueta">Nombre de la membresía</label><input id="plan-nombre" className="campo" required minLength={2} maxLength={100} value={datos.nombre} autoComplete="off" placeholder="Ejemplo: Interdiaria o Promoción de verano" onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="plan-precio" className="etiqueta">Precio total (S/)</label><input id="plan-precio" className="campo cifra" type="number" inputMode="decimal" required min={0} max={100000} step="0.01" value={datos.precio} onChange={(e) => setDatos({ ...datos, precio: Number(e.target.value) })} /><p className="mt-1.5 text-xs text-tenue">Importe que pagará el socio.</p></div>
          <div><label htmlFor="plan-dias" className="etiqueta">Vigencia en días</label><input id="plan-dias" className="campo cifra" type="number" inputMode="numeric" required min={1} max={3660} step={1} value={datos.duracionDias} onChange={(e) => setDatos({ ...datos, duracionDias: Number(e.target.value) })} /><p className="mt-1.5 text-xs text-tenue">Se cuenta desde el inicio de cada membresía.</p></div>
        </div>
        <div className="rounded-xl border border-borde bg-fondo/70 p-4">
          <label htmlFor="plan-limitado" className="flex cursor-pointer items-start gap-3 text-sm font-semibold"><input id="plan-limitado" type="checkbox" className="mt-0.5 h-4 w-4 accent-[#FAD234]" checked={limitado} onChange={(e) => setLimitado(e.target.checked)} /><span>Limitar las asistencias incluidas</span></label>
          {limitado ? <div className="mt-4"><label htmlFor="plan-asistencias" className="etiqueta">Asistencias en toda la vigencia</label><input id="plan-asistencias" className="campo cifra max-w-48" type="number" inputMode="numeric" required min={1} max={3660} step={1} value={limite} onChange={(e) => setLimite(e.target.value)} /><p className="mt-2 text-sm leading-relaxed text-secundario">Incluye {limite || '—'} asistencias durante {datos.duracionDias || '—'} días. Se descuenta una por día de ingreso; salir y volver el mismo día no descuenta otra. No exige días alternos.</p></div> : <p className="mt-2 pl-7 text-sm text-secundario">El socio puede asistir sin un cupo de entradas durante la vigencia.</p>}
        </div>
        <div><label htmlFor="plan-descripcion" className="etiqueta">Descripción y condiciones <span className="text-tenue">(opcional)</span></label><textarea id="plan-descripcion" className="campo min-h-24" maxLength={1000} value={datos.descripcion || ''} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} placeholder="Describe qué incluye el plan y cualquier condición para el socio." /></div>
        <div className="space-y-4">
          <label htmlFor="plan-promo" className="flex cursor-pointer items-start gap-3"><input id="plan-promo" className="mt-0.5 h-4 w-4 accent-[#FAD234]" type="checkbox" checked={!!datos.esPromocion} onChange={(e) => setDatos({ ...datos, esPromocion: e.target.checked })} /><span><span className="block text-sm font-semibold">Marcar como promoción</span><span className="mt-1 block text-xs text-secundario">Se identifica como promoción en el catálogo. Desactívala cuando termine la oferta.</span></span></label>
          <label htmlFor="plan-evidencia" className="flex cursor-pointer items-start gap-3"><input id="plan-evidencia" className="mt-0.5 h-4 w-4 accent-[#FAD234]" type="checkbox" checked={!!datos.requiereEvidencia} onChange={(e) => setDatos({ ...datos, requiereEvidencia: e.target.checked })} /><span><span className="block text-sm font-semibold">Requiere carné universitario vigente</span><span className="mt-1 block text-xs text-secundario">Recepción debe validar el carné del socio antes de vender este plan.</span></span></label>
          <label htmlFor="plan-activo" className="flex cursor-pointer items-start gap-3"><input id="plan-activo" className="mt-0.5 h-4 w-4 accent-[#FAD234]" type="checkbox" checked={datos.activo} onChange={(e) => setDatos({ ...datos, activo: e.target.checked })} /><span><span className="block text-sm font-semibold">Disponible para vender y mostrar en la web</span><span className="mt-1 block text-xs text-secundario">Al desactivarlo, las membresías que ya compraron los socios siguen vigentes.</span></span></label>
        </div>
        <div className="max-w-56"><label htmlFor="plan-orden" className="etiqueta">Orden en el catálogo</label><input id="plan-orden" className="campo cifra" type="number" inputMode="numeric" required min={0} max={10000} step={1} value={datos.orden} onChange={(e) => setDatos({ ...datos, orden: Number(e.target.value) })} /><p className="mt-1.5 text-xs text-tenue">Los números menores aparecen primero.</p></div>
      </fieldset>
      <div className="flex flex-col gap-3 border-t border-borde pt-5 sm:flex-row"><button type="submit" className="boton" disabled={guardando}>{guardando ? 'Guardando…' : plan ? 'Guardar cambios' : 'Añadir membresía'}</button><button type="button" className="boton-suave" disabled={guardando} onClick={onCancelar}>Cancelar</button></div>
    </form>
  );
}
