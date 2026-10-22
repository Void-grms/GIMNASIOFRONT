'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, fechaCorta, soles } from '@/lib/api';
import { CuentaMembresiaDatos } from '@/lib/cuenta-membresia';
import { MEMBRESIA_ACTUALIZADA } from './OperacionMembresia';

type Pendiente = { membershipId: string; memberId: string; estadoMembresia: string; socio: { nombreCompleto: string; dni?: string; codigoERP?: string }; plan: string; inicio: string; vence: string; cuenta: CuentaMembresiaDatos };

export function SaldosPendientes() {
  const [lista, setLista] = useState<Pendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloVencidos, setSoloVencidos] = useState(false);
  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try { setLista(await api<Pendiente[]>('/memberships/pendientes')); }
    catch (e: any) { setError(e.message || 'No se pudieron cargar los saldos.'); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); window.addEventListener(MEMBRESIA_ACTUALIZADA, cargar); return () => window.removeEventListener(MEMBRESIA_ACTUALIZADA, cargar); }, [cargar]);
  const q = busqueda.trim().toLocaleLowerCase('es');
  const filtrados = lista.filter(p => (!soloVencidos || p.cuenta.estado === 'vencida') && (!q || `${p.socio.nombreCompleto} ${p.socio.dni || ''} ${p.socio.codigoERP || ''}`.toLocaleLowerCase('es').includes(q)));
  return <section className="min-w-0 space-y-4 rounded-2xl border border-borde bg-superficie p-4 sm:p-5" aria-label="Saldos pendientes de membresías">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-bold">Saldos pendientes</h2><p className="mt-1 text-sm text-secundario">Abonos por completar, independientes del rango de caja. Solo el dinero recibido suma en caja.</p></div><button className="boton-suave" type="button" disabled={cargando} onClick={cargar}>{cargando ? 'Actualizando…' : 'Actualizar saldos'}</button></div>
    {!error && <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-borde py-3 text-sm"><p><strong className="cifra">{soles(lista.filter(p => p.estadoMembresia !== 'anulada').reduce((n, p) => n + p.cuenta.saldo, 0))}</strong> por cobrar</p><p><strong>{lista.length}</strong> membresía(s)</p><p className="text-porvencer"><strong>{lista.filter(p => p.cuenta.estado === 'vencida').length}</strong> con plazo vencido</p></div>}
    <div className="flex flex-wrap items-center gap-3"><label className="min-w-0 flex-1 basis-52"><span className="etiqueta">Buscar saldo por nombre, DNI o código</span><input className="campo" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre o código del cliente" /></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={soloVencidos} onChange={e => setSoloVencidos(e.target.checked)} />Solo plazos vencidos</label></div>
    {error ? <p role="alert" className="aviso-mal">{error}</p> : cargando && !lista.length ? <p role="status" className="text-sm text-secundario">Consultando cuentas…</p> : filtrados.length === 0 ? <p className="text-sm text-secundario">{lista.length ? 'No hay saldos con estos filtros.' : 'No hay saldos pendientes.'}</p> : <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{filtrados.map(p => <li key={p.membershipId} className="min-w-0 space-y-3 rounded-xl border border-borde p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1 basis-32"><p className="break-words font-semibold">{p.socio.nombreCompleto}</p><p className="mt-1 break-words text-xs text-secundario">{p.socio.codigoERP ? `Código ${p.socio.codigoERP} · ` : ''}{p.socio.dni ? `DNI ${p.socio.dni}` : 'Sin DNI registrado'}</p><p className="mt-1 break-words text-sm text-secundario">{p.plan}</p>{p.estadoMembresia === 'anulada' && <p className="mt-2 text-xs font-bold text-vencido">MEMBRESÍA ANULADA · Revisar cuenta</p>}</div><p className="font-bold cifra text-porvencer">{soles(p.cuenta.saldo)}<span className="mt-1 block text-xs font-normal">pendientes</span></p></div><p className={`text-sm ${p.cuenta.estado === 'vencida' ? 'text-porvencer' : 'text-secundario'}`}>{p.cuenta.estado === 'vencida' ? 'Plazo vencido' : 'Completar hasta'}: {fechaCorta(p.cuenta.fechaLimiteSaldo)}</p><p className="text-xs text-tenue">Plan {soles(p.cuenta.total)} · Pagado {soles(p.cuenta.pagado)}</p><Link className="boton-suave w-full" href={`/panel/socios/${p.memberId}#cuenta-${p.membershipId}`}>{p.estadoMembresia === 'anulada' ? 'Revisar cuenta' : 'Ver cuenta y registrar abono'}</Link></li>)}</ul>}
    <p className="text-xs leading-relaxed text-tenue">El vencimiento de un saldo muestra un aviso interno; no suspende el acceso por sí solo.</p>
  </section>;
}
