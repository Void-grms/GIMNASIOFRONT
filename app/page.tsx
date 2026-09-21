import Image from 'next/image';
import Link from 'next/link';
import { Revelar } from '@/components/Revelar';
import { AforoEnVivo, MenuLanding } from '@/components/Landing';

const NOMBRE = process.env.NEXT_PUBLIC_GIMNASIO_NOMBRE || 'FORCES GYM';

/** Celular del gimnasio, tal como aparece en su ficha de Google. */
const WHATSAPP = '51978223024';
const TELEFONO_VISIBLE = '978 223 024';
const INSTAGRAM = 'https://www.instagram.com/forcesgym/';
const MAPA = 'https://www.google.com/maps?q=-7.4006163,-79.5722067&hl=es&z=17&output=embed';
const COMO_LLEGAR = 'https://www.google.com/maps/place/Forces+Gym/@-7.4006163,-79.5722067,17z';

const PLANES = [
  {
    nombre: 'Mensual',
    precio: 'S/ 100',
    periodo: '30 dias',
    detalle: ['Acceso libre en todo el horario', 'Sala de maquinas y peso libre', 'Credencial QR en tu celular'],
    destacado: true,
  },
  {
    nombre: 'Universitario',
    precio: 'S/ 80',
    periodo: '30 dias',
    detalle: ['Todo lo del plan mensual', 'Presentando carne vigente', 'Mismo acceso, menor precio'],
  },
  {
    nombre: 'Pase diario',
    precio: 'S/ 8',
    periodo: 'por dia',
    detalle: ['Sin registro previo', 'Pagas y entras', 'Ideal para probar'],
  },
];

const CLASES = [
  {
    nombre: 'Funcional',
    horario: 'Lunes a sabado · 8:00–9:00 am y 7:00–8:00 pm',
    texto: 'Circuitos de fuerza y resistencia en grupo, con sogas, cajones y peso libre.',
  },
  {
    nombre: 'Fullbody',
    horario: 'Lunes a sabado · 9:00–10:00 am',
    texto: 'Una hora de cuerpo completo, al ritmo del grupo y con profesor guiando.',
  },
  {
    nombre: 'Aerobicos',
    horario: 'Consultar horario vigente',
    texto: 'Cardio en grupo para soltar el cuerpo y quemar sin subirte a una maquina.',
  },
  {
    nombre: 'Kids',
    horario: 'Consultar horario vigente',
    texto: 'Entrenamiento para los mas chicos, con carga adecuada a su edad.',
  },
];

const HORARIOS = [
  ['Lunes a viernes', '5:30 am – 10:00 pm'],
  ['Sabado', '5:30 am – 9:30 pm'],
  ['Domingo', '8:00 am – 3:00 pm'],
];

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-borde bg-fondo/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-xl font-black tracking-tight">{NOMBRE}</span>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="#planes" className="hidden min-h-11 items-center px-3 text-zinc-400 hover:text-white sm:inline-flex">
              Planes
            </Link>
            <Link href="#clases" className="hidden min-h-11 items-center px-3 text-zinc-400 hover:text-white sm:inline-flex">
              Clases
            </Link>
            <Link href="#ubicacion" className="hidden min-h-11 items-center px-3 text-zinc-400 hover:text-white sm:inline-flex">
              Ubicacion
            </Link>
            <Link href="/portal" className="boton-suave">
              Soy socio
            </Link>
            <MenuLanding />
          </nav>
        </div>
      </header>

      {/* El precio y el horario se ven sin bajar: es lo primero que busca la gente. */}
      <section className="relative overflow-hidden border-b border-borde">
        {/* La foto de la fachada: el que llega reconoce el local antes de leer.
            Es el elemento LCP, por eso va con priority y no como fondo CSS. */}
        <Image
          src="/fachada.webp"
          alt="Fachada de Forces Gym de noche, con el rotulo iluminado, en Pacasmayo"
          fill
          priority
          sizes="100vw"
          className="pointer-events-none object-cover object-[center_38%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,#09090A_10%,rgba(9,9,10,.95)_46%,rgba(9,9,10,.62)_74%,rgba(9,9,10,.8)_100%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(58% 50% at 68% 18%, rgba(250,210,52,0.16), transparent 72%)',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-28 sm:py-36">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-acento/25 bg-acento/[0.08] px-3.5 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.16em] text-acento">
              <span className="punto-vigente" />
              Pacasmayo · La Libertad
            </p>
            <AforoEnVivo />
          </div>
          <h1 className="max-w-3xl text-[clamp(2.6rem,6.2vw+0.9rem,5.25rem)] font-black leading-[0.97] tracking-[-0.035em]">
            Todo depende
            <br />
            de ti.{' '}
            <span className="text-acento">Entrena
            <br className="hidden sm:block" /> con nosotros.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-zinc-400">
            Cambia tus habitos en el gimnasio del malecon. Abrimos desde las 5:30 de la manana, con
            sala de maquinas, peso libre y clases de funcional y fullbody.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              className="boton"
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, quiero probar un dia en el gimnasio.')}`}
              target="_blank"
              rel="noreferrer"
            >
              Prueba un dia por S/ 8
            </a>
            <Link href="#planes" className="boton-suave">
              Ver precios
            </Link>
          </div>

          {/* Prueba social honesta: hechos verificables, no testimonios inventados.
              Cuando el gimnasio tenga resenas en Google, van aqui. */}
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-300">
            {['Abierto los 7 dias', 'Desde las 5:30 am', 'Maquinas, peso libre y clases', 'A media cuadra del malecon'].map(
              (dato) => (
                <li key={dato} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-acento" />
                  {dato}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      <section id="planes" className="mx-auto max-w-6xl px-4 py-20">
        <Revelar>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Precios claros</h2>
          <p className="mt-2 text-zinc-400">Sin matricula, sin permanencia minima.</p>
        </Revelar>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {PLANES.map((plan, i) => (
            <Revelar key={plan.nombre} delay={i * 0.07}>
              <div className={plan.destacado ? 'tarjeta-acento h-full' : 'tarjeta-viva h-full'}>
                <p className="text-sm uppercase tracking-wider text-zinc-400">{plan.nombre}</p>
                <p className="mt-3 text-[2.6rem] font-black tracking-[-0.03em] cifra">{plan.precio}</p>
                <p className="text-sm text-zinc-500">{plan.periodo}</p>
                <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                  {plan.detalle.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span className="text-acento">·</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </Revelar>
          ))}
        </div>
      </section>

      <section id="clases" className="border-y border-borde bg-superficie/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Revelar>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Clases dirigidas</h2>
            <p className="mt-2 text-zinc-400">Incluidas en tu membresia, sin pagar aparte.</p>
          </Revelar>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {CLASES.map((clase, i) => (
              <Revelar key={clase.nombre} delay={i * 0.06}>
                <div className="tarjeta-viva h-full">
                  <h3 className="text-xl font-bold tracking-tight">{clase.nombre}</h3>
                  <p className="mt-1 text-sm font-medium text-acento">{clase.horario}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{clase.texto}</p>
                </div>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            ['Entras con tu celular', 'Tu credencial QR cambia sola cada 30 segundos. Nada de tarjetas que se pierden.'],
            ['Sabes cuanto te queda', 'El portal te muestra los dias que faltan y te avisa antes de que venza.'],
            ['Pagas como quieras', 'Efectivo, Yape o Plin en recepcion, con tu comprobante.'],
          ].map(([titulo, texto], i) => (
            <Revelar key={titulo} delay={i * 0.07}>
              <h3 className="text-lg font-semibold">{titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{texto}</p>
            </Revelar>
          ))}
        </div>
      </section>

      <section id="ubicacion" className="border-t border-borde">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Revelar>
            <h2 className="text-3xl font-bold tracking-tight">Horarios y ubicacion</h2>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <div className="space-y-5">
                <div className="tarjeta">
                  <h3 className="font-semibold">Horario</h3>
                  <dl className="mt-4 space-y-2 text-sm text-zinc-300">
                    {HORARIOS.map(([dia, hora], i) => (
                      <div
                        key={dia}
                        className={`flex justify-between ${
                          i < HORARIOS.length - 1 ? 'border-b border-borde pb-2' : ''
                        }`}
                      >
                        <dt className="text-zinc-400">{dia}</dt>
                        <dd className="cifra font-medium">{hora}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="tarjeta">
                  <h3 className="font-semibold">Donde estamos</h3>
                  <p className="mt-3 text-zinc-200">Huascar 22, Pacasmayo</p>
                  <p className="text-sm text-zinc-500">
                    A media cuadra del malecon, frente a la iglesia.
                  </p>
                  <p className="mt-3 text-zinc-200 cifra">{TELEFONO_VISIBLE}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <a
                      className="boton"
                      href={`https://wa.me/${WHATSAPP}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                    <a className="boton-suave" href={COMO_LLEGAR} target="_blank" rel="noreferrer">
                      Como llegar
                    </a>
                    <a className="boton-suave" href={INSTAGRAM} target="_blank" rel="noreferrer">
                      Instagram
                    </a>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-borde">
                <iframe
                  title="Ubicacion del gimnasio en el mapa"
                  src={MAPA}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full min-h-[22rem] w-full"
                />
              </div>
            </div>
          </Revelar>
        </div>
      </section>

      <section className="border-t border-borde bg-superficie/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            Conforme a la ley tienes derecho a un{' '}
            <strong className="text-zinc-200">Libro de Reclamaciones</strong>.
          </p>
          <Link href="/reclamaciones" className="boton-suave">
            Abrir el libro de reclamaciones
          </Link>
        </div>
      </section>

      {/* En el celular la accion principal no puede quedar a tres pantallas de
          distancia: esta barra la mantiene al alcance del pulgar. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-fondo/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
        <div className="flex gap-2">
          <a
            className="boton flex-1"
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, quiero probar un dia en el gimnasio.')}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <a className="boton-suave flex-1" href={COMO_LLEGAR} target="_blank" rel="noreferrer">
            Como llegar
          </a>
        </div>
      </div>

      <footer className="border-t border-borde pb-24 sm:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {NOMBRE} · Pacasmayo · {new Date().getFullYear()}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/portal" className="inline-flex min-h-11 items-center hover:text-zinc-300">
              Portal del socio
            </Link>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-zinc-300">
              Instagram
            </a>
            <Link href="/terminos" className="inline-flex min-h-11 items-center hover:text-zinc-300">
              Condiciones
            </Link>
            <Link href="/privacidad" className="inline-flex min-h-11 items-center hover:text-zinc-300">
              Privacidad
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center hover:text-zinc-300">
              Personal
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
