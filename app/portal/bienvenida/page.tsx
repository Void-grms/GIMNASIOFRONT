import type { Metadata } from 'next';
import Link from 'next/link';
import { GuiaActivacion } from '@/components/GuiaActivacion';

export const metadata: Metadata = {
  title: 'Bienvenido al nuevo portal | Forces Gym',
  description: 'Conoce cómo activar tu acceso al portal de Forces Gym y seguir marcando asistencia con tu código en recepción.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function BienvenidaPortal() {
  return (
    <div className="min-h-screen bg-fondo">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-acento focus:px-4 focus:py-3 focus:text-black">Ir al contenido</a>
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 border-b border-borde px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Forces Gym, ir al inicio" className="text-lg font-black tracking-tight sm:text-xl">
          <span className="text-acento">FORCES</span> GYM
        </Link>
        <Link href="/portal" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white">
          Iniciar sesión <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main id="contenido" className="mx-auto max-w-5xl px-5 pb-12 pt-10 sm:px-8 sm:pt-16">
        <section aria-labelledby="bienvenida-titulo" className="grid items-center gap-9 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-acento">Para los socios de Forces Gym</p>
            <h1 id="bienvenida-titulo" className="max-w-xl text-[clamp(2.6rem,6.5vw,4.5rem)] font-black leading-[1.02] tracking-[-0.045em]">
              Tu gimnasio.<br /><span className="text-acento">Tu nuevo portal.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-300">
              Estamos renovando el sistema del gimnasio. Aquí te explicamos cómo activar
              tu acceso y entrar desde tu celular.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
              Para marcar asistencia, sigue dando tu código de siempre al personal de recepción.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/portal" className="boton">Ya tengo mi DNI y PIN</Link>
              <a href="#activar" className="boton-suave">Cómo activar mi acceso</a>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-borde bg-superficie shadow-tarjeta">
            <div className="border-t-4 border-acento px-6 pb-6 pt-5 sm:px-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">En recepción</p>
              <p className="mt-4 text-3xl font-black leading-tight tracking-tight">Tu código<br />de siempre</p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">Se lo das al personal para que registre tu asistencia.</p>
            </div>
            <div className="border-t border-dashed border-bordeFuerte bg-acento/[0.04] px-6 py-6 sm:px-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-acento">En tu celular</p>
              <p className="mt-4 text-3xl font-black tracking-tight">DNI <span className="px-1 text-acento">+</span> PIN</p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">Para entrar al portal, usa tu DNI y el PIN personal que elijas al activar tu acceso.</p>
            </div>
          </div>
        </section>

        <section id="activar" aria-labelledby="activar-titulo" className="scroll-mt-6 pb-9 pt-14 sm:pt-20">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <h2 id="activar-titulo" className="text-2xl font-bold tracking-tight sm:text-3xl">Activa tu acceso en 3 pasos</h2>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-400">El enlace personal dura 24 horas y se usa una sola vez.</p>
          </div>
          <GuiaActivacion />
        </section>

        <section id="ayuda" aria-labelledby="ayuda-titulo" className="scroll-mt-6 rounded-2xl border border-borde bg-superficie px-5 py-6 sm:p-7">
          <h2 id="ayuda-titulo" className="text-xl font-bold tracking-tight">Recepción te ayuda a empezar</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">¿Aún no tienes enlace o falta tu DNI?</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">Acércate con tu documento. El personal verifica tus datos y te indica cómo recibir el acceso. Si falta tu DNI en el sistema, lo completan contigo antes de habilitar el portal.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">¿Te entregaron un PIN temporal?</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">Inicia sesión con tu DNI y ese PIN. Dura 24 horas y tendrás que cambiarlo por uno personal antes de usar el portal. Si venció, pide uno nuevo en recepción.</p>
              <Link href="/portal" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-acento underline underline-offset-4 hover:text-acentoClaro">Entrar con mi PIN</Link>
            </div>
          </div>
          <p className="mt-5 border-t border-borde pt-4 text-sm leading-relaxed text-zinc-400">Si tu enlace venció, ya fue usado o compartes un celular, confirma tus datos con recepción antes de solicitar un nuevo acceso.</p>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 border-t border-borde px-5 py-5 text-xs text-zinc-500 sm:px-8">
        <span>FORCES GYM · Portal de clientes</span>
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-zinc-300">Inicio</Link>
        <Link href="/privacidad" className="inline-flex min-h-11 items-center hover:text-zinc-300">Política de privacidad</Link>
      </footer>
    </div>
  );
}
