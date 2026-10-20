'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cerrarSesion } from '@/lib/api';
import { SelectorTema } from '@/components/tema/SelectorTema';
import { EncabezadoPortal } from '@/components/portal/EncabezadoPortal';

const OPCIONES = [
  { href: '/portal/perfil', titulo: 'Mi perfil y acceso', texto: 'Tu foto, datos de contacto y PIN personal.', icono: 'M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
  { href: '/portal/rutina', titulo: 'Mis rutinas', texto: 'Plantillas, zonas musculares y plan semanal.', icono: 'M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01' },
  { href: '/portal/tienda', titulo: 'Tienda', texto: 'Consulta productos y prepara tu pedido para recepción.', icono: 'M5 7h14l2 14H3ZM8 8V6a4 4 0 0 1 8 0v2' },
  { href: '/portal/ranking', titulo: 'Retos y ranking', texto: 'Participa en los retos del gimnasio.', icono: 'M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 13v5m-4 3v-3h8v3' },
  { href: '/portal/renovar', titulo: 'Renovar mi membresía', texto: 'Elige un plan y envía tu pago por Yape para revisión.', icono: 'M4 5h16v14H4ZM4 9h16M8 13h3m-3 3h7' },
];
export default function MasPortal() {
  const router = useRouter();
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9"><EncabezadoPortal titulo="Más" descripcion="Todo lo que necesitas para organizar tu experiencia en Forces Gym." /><div className="grid gap-3 sm:grid-cols-2">{OPCIONES.map((op) => <Link key={op.href} href={op.href} className="tarjeta flex min-h-32 items-start gap-4 transition-colors hover:border-bordeFuerte"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-borde text-2xl text-acentoTexto" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={op.icono} /></svg></span><div className="min-w-0 flex-1"><h2 className="font-bold">{op.titulo}</h2><p className="mt-2 text-sm leading-relaxed text-secundario">{op.texto}</p></div><span aria-hidden="true" className="text-secundario">↗</span></Link>)}</div><section className="tarjeta space-y-3"><h2 className="font-bold">Apariencia</h2><p className="text-sm text-secundario">Elige un tema o deja que se adapte al de tu dispositivo.</p><SelectorTema /></section><button className="boton-suave min-h-12 w-full sm:w-auto" onClick={() => { cerrarSesion('socio'); router.replace('/portal'); }}>Cerrar mi sesión</button></main>;
}
