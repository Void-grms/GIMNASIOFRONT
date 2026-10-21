'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, hora } from '@/lib/api';
import { TarjetaSocio } from '@/components/TarjetaSocio';
import { PedidosPendientes } from '@/components/PedidosPendientes';
import { RenovacionesPendientes } from '@/components/RenovacionesPendientes';
import { CobroPaseDiario } from '@/components/CobroPaseDiario';
import styles from './Recepcion.module.css';

export default function Recepcion() {
  const [codigo, setCodigo] = useState('');
  const [ultimo, setUltimo] = useState<any>(null);
  const [recientes, setRecientes] = useState<any[]>([]);
  const [llegadas, setLlegadas] = useState<any[]>([]);
  const [dentro, setDentro] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [errorLlegada, setErrorLlegada] = useState('');
  const [avisoLlegada, setAvisoLlegada] = useState<{ texto: string; denegado: boolean } | null>(null);
  const [procesando, setProcesando] = useState<Record<string, 'confirmar' | 'descartar'>>({});
  const accionesEnCurso = useRef(new Set<string>());
  const atendidas = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const llegadasRef = useRef<HTMLElement>(null);
  const vistos = useRef<Set<string> | null>(null);

  const enfocar = useCallback(() => {
    // El celular debe mostrar la cola, sin abrir el teclado o saltar al lector.
    if (window.matchMedia('(max-width: 767px), (pointer: coarse)').matches) return;
    const activo = document.activeElement;
    if (activo && activo !== inputRef.current && activo !== document.body && activo !== document.documentElement) return;
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const refrescar = useCallback(async () => {
    try {
      const [r, l, d] = await Promise.all([
        api('/check-ins/recent?limite=10'),
        api('/check-ins/arrivals'),
        api('/check-ins/inside'),
      ]);
      const lista = r as any[];
      if (vistos.current === null) {
        vistos.current = new Set(lista.map((x) => x.id));
      } else {
        const nuevos = lista.filter((x) => !vistos.current!.has(x.id));
        nuevos.forEach((x) => vistos.current!.add(x.id));
        const delCelular = nuevos.find((x) => x.dispositivo?.startsWith('celular') && Date.now() - new Date(x.hora).getTime() < 30000);
        if (delCelular) setUltimo({ socio: delCelular.socio, resultado: delCelular.resultado, tipo: delCelular.tipo, motivo: delCelular.motivo, desdeCelular: true });
      }
      setRecientes(lista);
      // Una lectura que comenzó antes de la confirmación no revive la tarjeta.
      setLlegadas((l as any[]).filter((aviso) => !atendidas.current.has(aviso.id)));
      setDentro(d as any[]);
    } catch {
      /* El lector sigue disponible; el siguiente sondeo vuelve a consultar. */
    }
  }, []);

  useEffect(() => {
    enfocar();
    refrescar();
    const timer = setInterval(refrescar, 2500);
    return () => clearInterval(timer);
  }, [enfocar, refrescar]);

  useEffect(() => {
    if (!ultimo) return;
    const timer = setTimeout(() => setUltimo(null), 8000);
    return () => clearTimeout(timer);
  }, [ultimo]);

  async function escanear(e: React.FormEvent) {
    e.preventDefault();
    const valor = codigo.trim();
    if (!valor) return;
    setCodigo(''); setError('');
    try {
      const r = await api('/check-ins/scan', { metodo: 'POST', cuerpo: { codigo: valor, dispositivo: 'recepcion-1' } });
      setUltimo(r);
      if (r?.checkInId) vistos.current?.add(r.checkInId);
      refrescar();
    } catch (err: any) { setError(err.message); }
    finally { enfocar(); }
  }

  async function atenderLlegada(llegada: any, accion: 'confirmar' | 'descartar') {
    if (accionesEnCurso.current.has(llegada.id)) return;
    accionesEnCurso.current.add(llegada.id);
    setProcesando((prev) => ({ ...prev, [llegada.id]: accion }));
    setErrorLlegada(''); setAvisoLlegada(null);
    try {
      const r: any = await api(`/check-ins/arrivals/${llegada.id}/${accion === 'confirmar' ? 'confirm' : 'dismiss'}`, {
        metodo: 'POST', ...(accion === 'confirmar' ? { cuerpo: { dispositivo: 'recepcion-1' } } : {}),
      });
      atendidas.current.add(llegada.id);
      setLlegadas((prev) => prev.filter((item) => item.id !== llegada.id));
      if (accion === 'confirmar') setUltimo(r);
      const denegado = accion === 'confirmar' && r.resultado === 'denegado';
      setAvisoLlegada({
        texto: accion === 'descartar' ? `Aviso descartado: ${llegada.socio.nombreCompleto}.`
          : denegado ? `Ingreso no autorizado para ${llegada.socio.nombreCompleto}: ${r.motivo || 'revisa su membresía'}.`
          : `Ingreso confirmado: ${llegada.socio.nombreCompleto}.`,
        denegado,
      });
      await refrescar();
    } catch (err: any) { setErrorLlegada(err.message); }
    finally {
      accionesEnCurso.current.delete(llegada.id);
      setProcesando((prev) => { const next = { ...prev }; delete next[llegada.id]; return next; });
    }
  }

  function verLlegadas() {
    llegadasRef.current?.focus({ preventScroll: true });
    llegadasRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  return <div className={styles.recepcion}>
    <p className="sr-only" role="status" aria-atomic="true">{llegadas.length ? `${llegadas.length} ${llegadas.length === 1 ? 'socio espera' : 'socios esperan'} confirmación de ingreso.` : 'No hay ingresos pendientes de confirmación.'}</p>
    {llegadas.length > 0 && <div className={styles.alerta}>
      <span className={styles.alertaIcono} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 6-3 8-3 8h18s-3-2-3-8M10 20h4" /></svg></span>
      <span><strong>{llegadas.length} {llegadas.length === 1 ? 'socio esperando' : 'socios esperando'}</strong><small>Confirma su ingreso en recepción</small></span>
      <button type="button" onClick={verLlegadas}>Ver ingresos <span aria-hidden="true">↑</span></button>
    </div>}

    <section ref={llegadasRef} id="ingresos-pendientes" tabIndex={-1} aria-labelledby="titulo-llegadas" className={`${styles.llegadas} ${!llegadas.length && !avisoLlegada && !errorLlegada ? styles.sinLlegadas : ''}`}>
      <div className={styles.tituloLlegadas}><h2 id="titulo-llegadas">Ingresos por confirmar</h2><span aria-label={`${llegadas.length} pendientes`}>{llegadas.length}</span></div>
      <p className="text-xs leading-relaxed text-secundario">Solicitudes de quienes tocaron «Estoy entrando». El ingreso se registra cuando lo confirmas.</p>
      {errorLlegada && <p className="aviso-mal" role="alert">{errorLlegada}</p>}
      {avisoLlegada && <p className={avisoLlegada.denegado ? 'aviso-mal' : 'aviso-ok'} role={avisoLlegada.denegado ? 'alert' : 'status'}>{avisoLlegada.texto}</p>}
      {!llegadas.length && <p className="rounded-xl border border-dashed border-borde p-4 text-sm text-tenue">No hay socios esperando confirmación.</p>}
      {llegadas.map((l) => <div key={l.id} className={styles.llegada}>
        <TarjetaSocio socio={l.socio} compacta />
        <div className={styles.accionesLlegada}>
          <button type="button" className="boton" disabled={!!procesando[l.id]} onClick={() => atenderLlegada(l, 'confirmar')}>{procesando[l.id] === 'confirmar' ? 'Confirmando…' : 'Confirmar ingreso'}</button>
          <button type="button" className="boton-suave" disabled={!!procesando[l.id]} onClick={() => atenderLlegada(l, 'descartar')}>{procesando[l.id] === 'descartar' ? 'Descartando…' : 'Descartar'}</button>
        </div>
      </div>)}
    </section>

    <div className={styles.paseDiario}><CobroPaseDiario onCobrado={(r) => {
      if (!r.repetida) {
        setUltimo(r.ingreso);
        if (r.ingreso.checkInId) vistos.current?.add(r.ingreso.checkInId);
        for (const aviso of llegadas) if (aviso.socio.id === r.memberId) atendidas.current.add(aviso.id);
        setLlegadas((prev) => prev.filter((aviso) => aviso.socio.id !== r.memberId));
      }
      refrescar();
    }} /></div>

    <section className={styles.lector} aria-label="Registrar entrada o salida" onClick={enfocar}>
      <div className={styles.quiosco}><p className="text-sm leading-relaxed text-tenue">Para dejar la pantalla puesta todo el día, usa el modo quiosco.</p><Link href="/quiosco" className="boton-suave">Modo quiosco</Link></div>
      <form onSubmit={escanear}>
        <label className="etiqueta" htmlFor="codigo">Escanea el QR o escribe el código o DNI. El sistema detecta si entra o sale.</label>
        <input id="codigo" ref={inputRef} className="campo-escaneo" value={codigo} onChange={(e) => setCodigo(e.target.value)} onBlur={() => setTimeout(enfocar, 80)} placeholder="Código, DNI o lector QR…" autoComplete="off" />
      </form>
      {error && <p className="aviso-mal" role="alert">{error}</p>}
      <div>
        {ultimo?.desdeCelular && <p className="rotulo mb-2">Leído con la cámara del celular</p>}
        {ultimo ? <TarjetaSocio socio={ultimo.socio} resultado={ultimo.resultado} tipo={ultimo.tipo} motivo={ultimo.motivo} segundos={8} />
          : <div className="tarjeta flex min-h-28 items-center justify-center border-dashed py-8 text-center text-sm text-tenue sm:min-h-40">Listo para el siguiente socio</div>}
      </div>
      {ultimo?.socio?.id && <Link href={`/panel/socios/${ultimo.socio.id}`} className="boton-suave">Abrir ficha y cobrar</Link>}
    </section>

    <section className={styles.historial} aria-labelledby="titulo-movimientos">
      <h2 id="titulo-movimientos" className="rotulo mb-3">Últimos movimientos</h2>
      <div className="tarjeta p-0"><ul className="divide-y divide-borde">
        {!recientes.length && <li className="p-4 text-sm text-tenue">Todavía no hay movimientos hoy.</li>}
        {recientes.map((r) => <li key={r.id} className={styles.movimiento}>
          <span aria-hidden="true" className={r.resultado === 'permitido' ? r.tipo === 'entrada' ? 'punto-vigente' : 'h-2.5 w-2.5 shrink-0 rounded-full bg-tenue' : 'punto-vencido'} />
          <span className={styles.movimientoDatos}><strong>{r.socio?.nombreCompleto ?? 'Desconocido'}</strong><small>{r.resultado === 'permitido' ? r.tipo : r.motivo}</small></span>
          <time className="text-xs text-tenue cifra">{hora(r.hora)}</time>
        </li>)}
      </ul></div>
    </section>

    <aside className={styles.pendientes}>
      <RenovacionesPendientes />
      <PedidosPendientes />
      <section aria-labelledby="titulo-dentro"><h2 id="titulo-dentro" className="rotulo mb-3">Dentro ahora <span className="ml-2 text-acentoTexto">{dentro.length}</span></h2>
        <div className="tarjeta p-0"><ul className="divide-y divide-borde">
          {!dentro.length && <li className="p-4 text-sm text-tenue">No hay nadie en el local.</li>}
          {dentro.map((d) => <li key={d.socio.id} className={styles.presencia}>
            <span aria-hidden="true" className="punto-vigente" /><span className={styles.presenciaNombre}>{d.socio.nombreCompleto}</span>
            {d.casillero && <span className="shrink-0 rounded-md bg-acento/15 px-1.5 py-0.5 text-xs font-bold text-acentoTexto cifra" title="Casillero">C{d.casillero}</span>}
            <time className="text-xs text-tenue cifra">desde {hora(d.desde)}</time>
          </li>)}
        </ul></div>
      </section>
    </aside>
  </div>;
}
