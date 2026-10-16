'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import styles from '@/app/home.module.css';

type PlanPublico = {
  id: string; nombre: string; precio: number; duracionDias: number;
  descripcion?: string | null; limiteAsistencias?: number | null;
  requiereEvidencia?: boolean; esPromocion?: boolean;
};

const precio = (valor: number) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(valor);

export default function HomePlans({ whatsappNumero }: { whatsappNumero: string }) {
  const [planes, setPlanes] = useState<PlanPublico[] | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let vigente = true;
    setError(false);
    api<PlanPublico[]>('/plans/public', { sesion: null })
      .then((datos) => { if (vigente) setPlanes(datos); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [revision]);

  if (error || planes?.length === 0) return (
    <div className={styles.planFeedback} role="status">
      <p>{error ? 'No pudimos cargar los planes en este momento.' : 'Estamos actualizando nuestras membresías.'} Consulta las opciones en recepción o por WhatsApp.</p>
      {error && <button type="button" onClick={() => setRevision((v) => v + 1)}>Volver a cargar</button>}
      <a href={`https://wa.me/${whatsappNumero}?text=${encodeURIComponent('Hola, quiero conocer las membresías vigentes de Forces Gym.')}`} target="_blank" rel="noreferrer">Consultar membresías</a>
    </div>
  );
  if (!planes) return <p className={styles.planFeedback} role="status">Cargando membresías vigentes…</p>;

  return <div className={styles.plansGrid}>
    {planes.map((plan) => (
      <article key={plan.id} className={`${styles.planCard} ${plan.esPromocion ? styles.featuredPlan : ''}`}>
        <div className={styles.planTop}><h3>{plan.nombre}</h3>{plan.esPromocion && <span>PROMOCIÓN</span>}</div>
        {plan.descripcion && <p className={styles.planDescription}>{plan.descripcion}</p>}
        <p className={styles.price}><span>S/</span> {precio(plan.precio)}<small>por {plan.duracionDias} {plan.duracionDias === 1 ? 'día' : 'días'}</small></p>
        <ul>
          <li><Check />{plan.limiteAsistencias == null ? 'Asistencias sin límite durante la vigencia' : `${plan.limiteAsistencias} asistencias en total durante ${plan.duracionDias} días`}</li>
          <li><Check />Vigencia desde el inicio de tu membresía</li>
          {plan.limiteAsistencias != null && <li><Check />Una asistencia por día. Reingresos del mismo día incluidos.</li>}
          {plan.requiereEvidencia && <li><Check />Presentando carné universitario vigente</li>}
          <li><Check />Portal de clientes y credencial QR</li>
        </ul>
        <a className={plan.esPromocion ? styles.primaryButton : styles.outlineButton} href={`https://wa.me/${whatsappNumero}?text=${encodeURIComponent(`Hola, me interesa la membresía ${plan.nombre} de Forces Gym por S/ ${precio(plan.precio)} (${plan.duracionDias} días${plan.limiteAsistencias == null ? '' : `, ${plan.limiteAsistencias} asistencias`}). ¿Cómo me inscribo?`)}`} target="_blank" rel="noreferrer">Consultar este plan<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg></a>
      </article>
    ))}
  </div>;
}

function Check() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}
