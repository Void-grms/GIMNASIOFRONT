'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, fechaCorta, soles } from '@/lib/api';

type CuentaPortal = {
  membershipId: string;
  plan: string;
  inicio: string;
  vence: string;
  pausada: boolean;
  cuenta: {
    total: number;
    pagado: number;
    saldo: number;
    fechaLimiteSaldo: string | null;
    estado: 'pagada' | 'pendiente' | 'vencida';
  };
  congelamientos: { desde: string; hasta: string }[];
};

const hoyLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

/** Información propia del socio; los motivos y la aprobación permanecen en recepción. */
export function CuentasDelSocio() {
  const [cuentas, setCuentas] = useState<CuentaPortal[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await api<CuentaPortal[]>('/portal/cuentas', { sesion: 'socio' });
      if (!Array.isArray(datos)) throw new Error('No pudimos consultar tus saldos y fechas.');
      setCuentas(datos);
      setError('');
    } catch (e: any) {
      setError(e.message || 'No pudimos consultar tus saldos y fechas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const alVolver = () => { if (!document.hidden) cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [cargar]);

  const hoy = hoyLima();
  const visibles = cuentas?.filter(c => c.cuenta.saldo > 0 || c.pausada || c.inicio > hoy ||
    c.congelamientos.some(p => p.hasta >= hoy));

  if (cuentas && visibles?.length === 0 && !error) return null;

  return (
    <section className="min-w-0 space-y-3" aria-labelledby="cuentas-socio-titulo">
      <h2 id="cuentas-socio-titulo" className="rotulo">Tus abonos y fechas</h2>
      {!cuentas && !error && <p className="text-sm text-secundario" role="status">Revisando saldos y fechas…</p>}
      {error && <div className="aviso-ojo space-y-2" role="alert">
        <p>{error}</p>
        <button type="button" className="boton-suave" disabled={cargando} onClick={cargar}>
          {cargando ? 'Consultando…' : 'Volver a consultar'}
        </button>
      </div>}
      {visibles?.map(c => <article key={c.membershipId} className="tarjeta min-w-0 space-y-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 break-words font-semibold">{c.plan}</h3>
          <span className={`text-sm font-semibold ${c.pausada || c.cuenta.estado === 'vencida' ? 'text-porvencer' : 'text-vigente'}`}>
            {c.pausada ? 'En pausa' : c.inicio > hoy ? 'Inicio programado' : c.cuenta.saldo > 0 ? 'Con abonos' : 'Pagada'}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-secundario">
          Del {fechaCorta(c.inicio)} al {fechaCorta(c.vence)}.
          {c.inicio > hoy && <> Tu acceso con este plan comienza el {fechaCorta(c.inicio)}.</>}
        </p>
        <dl className="grid min-w-0 grid-cols-1 gap-2 border-y border-borde py-3 min-[360px]:grid-cols-3">
          {[
            ['Total del plan', c.cuenta.total],
            ['Abonado', c.cuenta.pagado],
            ['Saldo pendiente', c.cuenta.saldo],
          ].map(([titulo, monto]) => <div key={titulo} className="min-w-0">
            <dt className="text-xs leading-relaxed text-secundario">{titulo}</dt>
            <dd className={`mt-1 break-words font-bold cifra ${titulo === 'Saldo pendiente' && c.cuenta.saldo > 0 ? 'text-acentoTexto' : ''}`}>{soles(Number(monto))}</dd>
          </div>)}
        </dl>
        {c.cuenta.saldo > 0 && <div className="space-y-1 text-sm leading-relaxed">
          {c.cuenta.fechaLimiteSaldo && <p className={c.cuenta.estado === 'vencida' ? 'font-semibold text-porvencer' : 'text-tinta'}>
            {c.cuenta.estado === 'vencida' ? 'El plazo para completar venció el ' : 'Completa el saldo hasta el '}{fechaCorta(c.cuenta.fechaLimiteSaldo)}.
          </p>}
          <p className="text-secundario">Puedes completar el saldo en recepción. Cada abono se aplica a este mismo plan.</p>
        </div>}
        {c.congelamientos.filter(p => p.hasta >= hoy).map(p => <p key={`${p.desde}-${p.hasta}`} className="aviso-ojo text-sm leading-relaxed">
          {p.desde > hoy ? 'Pausa programada' : 'Pausa autorizada'} del {fechaCorta(p.desde)} al {fechaCorta(p.hasta)}. Durante esos días este plan no permite ingresar. El vencimiento de arriba incluye la ampliación aprobada.
        </p>)}
      </article>)}
    </section>
  );
}
