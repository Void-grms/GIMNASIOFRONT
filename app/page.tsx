import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Barlow_Condensed } from "next/font/google";
import { AforoEnVivo } from "@/components/Landing";
import HomeNavigation from "@/components/home/HomeNavigation";
import HomeMotion from "@/components/home/HomeMotion";
import styles from "./home.module.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-home-display",
  display: "swap",
});
const NOMBRE = process.env.NEXT_PUBLIC_GIMNASIO_NOMBRE || "FORCES GYM";
const WHATSAPP = "51978223024";
const INSTAGRAM = "https://www.instagram.com/forcesgym/";
const COMO_LLEGAR =
  "https://www.google.com/maps/place/Forces+Gym/@-7.4006163,-79.5722067,17z";
const MAPA =
  "https://www.google.com/maps?q=-7.4006163,-79.5722067&hl=es&z=17&output=embed";
const whatsapp = (message: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
const PRIMER_DIA = whatsapp(
  "Hola, quiero probar un día en Forces Gym por S/ 8. ¿Me dan más información?",
);

export const metadata: Metadata = {
  title: `${NOMBRE} · Tu gimnasio en Pacasmayo`,
  description:
    "Entrena a tu ritmo en Forces Gym, Pacasmayo. Máquinas, peso libre y clases dirigidas. Pase diario S/ 8 y membresías desde S/ 80. Conoce los planes y visítanos.",
  openGraph: {
    title: `${NOMBRE} · Tu fuerza. Tu ritmo. Tu lugar.`,
    description:
      "Tu próximo entrenamiento empieza en Pacasmayo. Conoce los planes, clases y horarios de Forces Gym.",
    locale: "es_PE",
    type: "website",
  },
};

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {diagonal ? (
        <path d="M6 18 18 6M6 6h12v12" />
      ) : (
        <path d="M4 12h16m-6-6 6 6-6 6" />
      )}
    </svg>
  );
}
function Check() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
function Pin() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
const PLANES = [
  {
    nombre: "Pase diario",
    precio: "8",
    periodo: "por día",
    descripcion: "Conoce el gimnasio. Empieza sin compromiso.",
    detalle: [
      "Sin registro previo",
      "Sala de máquinas y peso libre",
      "Pagas en recepción y entrenas",
    ],
    accion: "Quiero probar un día",
    mensaje: "Hola, quiero probar un día en Forces Gym por S/ 8.",
    destacado: false,
  },
  {
    nombre: "Mensual",
    precio: "100",
    periodo: "por 30 días",
    descripcion: "Haz del entrenamiento parte de tu día.",
    detalle: [
      "Acceso libre en todo el horario",
      "Clases dirigidas incluidas",
      "Portal de clientes y credencial QR",
    ],
    accion: "Quiero el plan mensual",
    mensaje:
      "Hola, me interesa el plan Mensual de Forces Gym por S/ 100. ¿Cómo me inscribo?",
    destacado: true,
  },
  {
    nombre: "Universitario",
    precio: "80",
    periodo: "por 30 días",
    descripcion: "Entre clases, también hay tiempo para ti.",
    detalle: [
      "Todos los beneficios del mensual",
      "Presentando carné vigente",
      "El mismo acceso, a un menor precio",
    ],
    accion: "Consultar plan universitario",
    mensaje:
      "Hola, me interesa el plan Universitario de Forces Gym por S/ 80. ¿Qué necesito para inscribirme?",
    destacado: false,
  },
];
const FAQS = [
  [
    "¿Puedo probar antes de inscribirme?",
    "Sí. Con el pase diario de S/ 8 puedes conocer el gimnasio y entrenar sin registro previo. Escríbenos por WhatsApp si quieres resolver alguna duda antes de venir.",
  ],
  [
    "¿Necesito experiencia para empezar?",
    "No necesitas haber entrenado antes. Acércate a recepción y cuéntanos qué buscas para conocer las opciones de entrenamiento y las clases disponibles.",
  ],
  [
    "¿Las clases tienen un costo adicional?",
    "Las clases dirigidas están incluidas en tu membresía. Consulta por WhatsApp los horarios vigentes de aeróbicos y Kids antes de venir.",
  ],
  [
    "¿Cómo puedo pagar mi membresía?",
    "Puedes pagar en recepción con efectivo, Yape o Plin y recibir tu comprobante. No hay matrícula ni permanencia mínima.",
  ],
  [
    "Ya soy cliente, ¿cómo entro a mi portal?",
    "Usa el botón «Portal de clientes» e ingresa con tu DNI y el PIN que te entregó recepción. Si olvidaste tu PIN, solicita uno nuevo en el mostrador. El acceso de Administración es exclusivo para el personal.",
  ],
];

export default function Landing() {
  return (
    <div className={`${styles.home} ${display.variable}`} data-home>
      <a href="#contenido" className={styles.skipLink}>
        Saltar al contenido
      </a>
      <HomeNavigation name={NOMBRE} />
      <main id="contenido" tabIndex={-1}>
        <section className={styles.hero} data-hero aria-labelledby="hero-title">
          <div className={styles.heroPhoto}>
            <Image
              src="/home/hero.webp"
              alt="Atleta durante una sesión de entrenamiento de fuerza"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 65vw"
              className={styles.heroImage}
              data-hero-image
            />
          </div>
          <div className={`${styles.container} ${styles.heroInner}`}>
            <div className={styles.heroContent}>
              <p className={styles.eyebrow} data-hero-copy>
                <span className={styles.dash} /> PACASMAYO, LA LIBERTAD
              </p>
              <h1 id="hero-title" className={styles.heroTitle} data-hero-copy>
                TU FUERZA.
                <br />
                TU RITMO.
                <br />
                <span>TU LUGAR.</span>
              </h1>
              <p className={styles.heroDescription} data-hero-copy>
                El primer paso es tuyo. El lugar está aquí.
                <br className={styles.desktopBreak} /> Máquinas, peso libre y
                clases para encontrar tu ritmo, a media cuadra del malecón.
              </p>
              <div className={styles.heroActions} data-hero-copy>
                <a
                  className={styles.primaryButton}
                  href={PRIMER_DIA}
                  target="_blank"
                  rel="noreferrer"
                >
                  Empieza por S/ 8 <Arrow />
                </a>
                <a className={styles.textButton} href="#planes">
                  Explorar planes <span aria-hidden="true">↓</span>
                </a>
              </div>
              <p className={styles.heroNote} data-hero-copy>
                <Check /> Un día de entrenamiento. Sin matrícula.
              </p>
            </div>
            <div className={styles.heroCaption}>
              <span className={styles.captionLine} />
              <p>
                LA CONSTANCIA
                <br />
                <strong>SE ENTRENA.</strong>
              </p>
            </div>
            <div className={styles.heroBottom}>
              <a href="#ubicacion">
                <Pin />
                <span>Huáscar 22, Pacasmayo</span>
                <Arrow diagonal />
              </a>
              <AforoEnVivo />
            </div>
          </div>
        </section>
        <div className={styles.facts}>
          <div className={styles.container}>
            <div>
              <span className={styles.factValue}>
                7 <small>DÍAS</small>
              </span>
              <span>Para encontrar tu momento</span>
            </div>
            <div>
              <span className={styles.factValue}>
                5:30 <small>AM</small>
              </span>
              <span>Desde temprano, de lunes a sábado</span>
            </div>
            <div>
              <span className={styles.factValue}>
                A TU <small>RITMO</small>
              </span>
              <span>Máquinas, peso libre y clases</span>
            </div>
          </div>
        </div>

        <section
          id="experiencia"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="experience-title"
        >
          <div className={styles.sectionHeading} data-reveal>
            <div>
              <p className={styles.eyebrow}>ENCUENTRA LO QUE TE MUEVE</p>
              <h2 id="experience-title">
                NO HAY UNA SOLA
                <br />
                FORMA DE <span>SUPERARTE.</span>
              </h2>
            </div>
            <p>
              Empieza donde estás. Combina fuerza, resistencia y la energía de
              entrenar en grupo.
            </p>
          </div>
          <div className={styles.experienceGrid}>
            <article
              className={`${styles.experienceCard} ${styles.strengthCard}`}
              data-reveal
            >
              <Image
                src="/home/training.webp"
                alt="Entrenamiento con barra y discos de peso"
                fill
                sizes="(max-width: 760px) 100vw, 45vw"
              />
              <div className={styles.cardPhotoShade} />
              <div className={styles.experienceCopy}>
                <span className={styles.cardTag}>TU OBJETIVO, TU RITMO</span>
                <h3>
                  FUERZA
                  <br />
                  QUE SE CONSTRUYE.
                </h3>
                <p>
                  Máquinas y peso libre para hacer de cada repetición un paso
                  adelante.
                </p>
                <a
                  href={whatsapp(
                    "Hola, quiero conocer la sala de máquinas y peso libre de Forces Gym.",
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Conoce tus opciones <Arrow diagonal />
                </a>
              </div>
            </article>
            <article className={styles.experienceCard} data-reveal>
              <Image
                src="/home/community.webp"
                alt="Mujer entrenando fuerza con una mancuerna"
                fill
                sizes="(max-width: 760px) 100vw, 45vw"
              />
              <div className={styles.cardPhotoShade} />
              <div className={styles.experienceCopy}>
                <span className={styles.cardTag}>
                  CLASES INCLUIDAS EN TU MEMBRESÍA
                </span>
                <h3>
                  LA ENERGÍA
                  <br />
                  SE COMPARTE.
                </h3>
                <p>
                  Funcional y fullbody. Tú pones las ganas; el grupo, el
                  impulso.
                </p>
                <a href="#clases">
                  Encuentra tu clase <Arrow diagonal />
                </a>
              </div>
            </article>
          </div>
          <div className={styles.classSchedule} id="clases" data-reveal>
            <div>
              <span className={styles.classLabel}>FUNCIONAL</span>
              <strong>Lun–sáb · 8–9 am / 7–8 pm</strong>
            </div>
            <div>
              <span className={styles.classLabel}>FULLBODY</span>
              <strong>Lun–sáb · 9–10 am</strong>
            </div>
            <a
              href={whatsapp(
                "Hola, ¿cuáles son los horarios vigentes de aeróbicos y Kids?",
              )}
              target="_blank"
              rel="noreferrer"
            >
              <span className={styles.classLabel}>AERÓBICOS + KIDS</span>
              <strong>
                Consulta los horarios <Arrow diagonal />
              </strong>
            </a>
          </div>
          <p className={styles.photoNote}>
            Imágenes de entrenamiento referenciales. Conoce nuestro local en la
            sección de ubicación.
          </p>
        </section>

        <section
          id="planes"
          className={styles.plansSection}
          aria-labelledby="plans-title"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeading} data-reveal>
              <div>
                <p className={styles.eyebrow}>INVIERTE EN TI</p>
                <h2 id="plans-title">
                  TU PRÓXIMO PASO.
                  <br />
                  UN PLAN <span>CLARO.</span>
                </h2>
              </div>
              <p>
                Sin matrícula. Sin permanencia mínima.
                <br />
                Elige cómo empezar; nosotros te esperamos.
              </p>
            </div>
            <div className={styles.plansGrid}>
              {PLANES.map((plan) => (
                <article
                  key={plan.nombre}
                  className={`${styles.planCard} ${plan.destacado ? styles.featuredPlan : ""}`}
                  data-reveal
                >
                  <div className={styles.planTop}>
                    <h3>{plan.nombre}</h3>
                    {plan.destacado && <span>DALE CONTINUIDAD</span>}
                  </div>
                  <p className={styles.planDescription}>{plan.descripcion}</p>
                  <p className={styles.price}>
                    <span>S/</span> {plan.precio}
                    <small>{plan.periodo}</small>
                  </p>
                  <ul>
                    {plan.detalle.map((item) => (
                      <li key={item}>
                        <Check />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    className={
                      plan.destacado
                        ? styles.primaryButton
                        : styles.outlineButton
                    }
                    href={whatsapp(plan.mensaje)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {plan.accion}
                    <Arrow />
                  </a>
                </article>
              ))}
            </div>
            <p className={styles.paymentNote}>
              Te atendemos por WhatsApp. Paga en recepción con{" "}
              <strong>efectivo, Yape o Plin.</strong>
            </p>
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.section} ${styles.startSection}`}
          aria-labelledby="start-title"
        >
          <div data-reveal>
            <p className={styles.eyebrow}>MENOS VUELTAS. MÁS MOVIMIENTO.</p>
            <h2 id="start-title">
              EMPEZAR ES
              <br />
              <span>ASÍ DE SIMPLE.</span>
            </h2>
          </div>
          <ol className={styles.steps}>
            {[
              [
                "Elige tu primer día",
                "Prueba por S/ 8 o consulta el plan que mejor encaja contigo.",
              ],
              [
                "Ven a conocernos",
                "Te esperamos en Huáscar 22. Resolvemos tus dudas en recepción.",
              ],
              [
                "Haz espacio para ti",
                "Activa tu membresía y encuentra una rutina que puedas mantener.",
              ],
            ].map(([title, text], i) => (
              <li key={title} data-reveal>
                <span className={styles.stepNumber}>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={styles.portalSection}
          aria-labelledby="portal-title"
        >
          <div className={`${styles.container} ${styles.portalGrid}`}>
            <div data-reveal>
              <p className={styles.eyebrow}>¿YA ERES PARTE DE FORCES?</p>
              <h2 id="portal-title">
                TU ENTRENAMIENTO.
                <br />
                <span>TAMBIÉN EN TU CELULAR.</span>
              </h2>
              <p className={styles.portalDescription}>
                Tu credencial, tu membresía y tu progreso, en un mismo lugar.
                Entra con tu DNI y el PIN que te entregó recepción.
              </p>
              <Link href="/portal" className={styles.primaryButton}>
                Entrar al portal de clientes <Arrow />
              </Link>
              <p className={styles.portalHelp}>
                ¿No recuerdas tu PIN? Te ayudamos en recepción.
              </p>
            </div>
            <div className={styles.portalPreview} data-reveal>
              <div className={styles.portalPreviewHeader}>
                <span className={styles.miniMark} aria-hidden="true">
                  F/
                </span>
                <div>
                  <strong>MI ESPACIO FORCES</strong>
                  <span>Hecho para acompañarte</span>
                </div>
                <span className={styles.memberTag}>CLIENTES</span>
              </div>
              <div className={styles.portalFeature}>
                <span aria-hidden="true">↗</span>
                <div>
                  <h3>Tu credencial QR</h3>
                  <p>Siempre a mano, desde tu celular.</p>
                </div>
              </div>
              <div className={styles.portalFeature}>
                <span aria-hidden="true">◷</span>
                <div>
                  <h3>Tu membresía al día</h3>
                  <p>Consulta cuántos días te quedan.</p>
                </div>
              </div>
              <div className={styles.portalFeature}>
                <span aria-hidden="true">↗</span>
                <div>
                  <h3>Tu progreso, contigo</h3>
                  <p>Lleva el registro de tus entrenamientos.</p>
                </div>
              </div>
              <div className={styles.portalAccess}>
                ACCESO PARA CLIENTES <span>DNI + PIN</span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="ubicacion"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="location-title"
        >
          <div className={styles.sectionHeading} data-reveal>
            <div>
              <p className={styles.eyebrow}>NOS VEMOS EN PACASMAYO</p>
              <h2 id="location-title">
                CERCA DEL MAR.
                <br />
                <span>MÁS CERCA DE TU META.</span>
              </h2>
            </div>
            <a
              href={COMO_LLEGAR}
              target="_blank"
              rel="noreferrer"
              className={styles.textButton}
            >
              Cómo llegar <Arrow diagonal />
            </a>
          </div>
          <div className={styles.locationGrid}>
            <div className={styles.facade} data-reveal>
              <Image
                src="/fachada.webp"
                alt="Fachada real de Forces Gym, con su letrero iluminado, en Huáscar 22, Pacasmayo"
                fill
                sizes="(max-width: 760px) 100vw, 55vw"
              />
              <div>
                <Pin />
                <p>
                  <strong>Huáscar 22, Pacasmayo</strong>
                  <span>A media cuadra del malecón, frente a la iglesia.</span>
                </p>
              </div>
            </div>
            <div className={styles.locationInfo} data-reveal>
              <h3>Hazle espacio en tu semana.</h3>
              <dl>
                {[
                  ["Lunes a viernes", "5:30 am – 10:00 pm"],
                  ["Sábado", "5:30 am – 9:30 pm"],
                  ["Domingo", "8:00 am – 3:00 pm"],
                ].map(([day, hour]) => (
                  <div key={day}>
                    <dt>{day}</dt>
                    <dd>{hour}</dd>
                  </div>
                ))}
              </dl>
              <p>¿Vienes por primera vez? Escríbenos.</p>
              <a
                href={whatsapp(
                  "Hola, quiero visitar Forces Gym. ¿Me pueden orientar?",
                )}
                target="_blank"
                rel="noreferrer"
                className={styles.contactNumber}
              >
                978 223 024 <Arrow diagonal />
              </a>
              <div className={styles.locationLinks}>
                <a href={COMO_LLEGAR} target="_blank" rel="noreferrer">
                  Abrir en Google Maps <Arrow diagonal />
                </a>
                <a href={INSTAGRAM} target="_blank" rel="noreferrer">
                  Instagram <Arrow diagonal />
                </a>
              </div>
            </div>
          </div>
          <details className={styles.mapDetails}>
            <summary>
              Ver ubicación en el mapa <span aria-hidden="true">+</span>
            </summary>
            <iframe
              title="Ubicación de Forces Gym en Pacasmayo"
              src={MAPA}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </details>
        </section>

        <section
          className={`${styles.container} ${styles.faqSection}`}
          aria-labelledby="faq-title"
        >
          <div data-reveal>
            <p className={styles.eyebrow}>ANTES DE TU PRIMER DÍA</p>
            <h2 id="faq-title">
              TODO
              <br />
              <span>MÁS CLARO.</span>
            </h2>
            <p>¿Te queda alguna duda?</p>
            <a
              className={styles.textButton}
              href={whatsapp("Hola, tengo una consulta sobre Forces Gym.")}
              target="_blank"
              rel="noreferrer"
            >
              Conversemos por WhatsApp <Arrow diagonal />
            </a>
          </div>
          <div className={styles.faqList} data-reveal>
            {FAQS.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <div className={styles.container} data-reveal>
            <div>
              <p className={styles.eyebrow}>EL MOMENTO LO ELIGES TÚ.</p>
              <h2>
                QUE HOY SEA
                <br />
                TU <span>PRIMER DÍA.</span>
              </h2>
            </div>
            <div>
              <a
                href={PRIMER_DIA}
                target="_blank"
                rel="noreferrer"
                className={styles.darkButton}
              >
                Quiero empezar <Arrow diagonal />
              </a>
              <p>Pase diario S/ 8 · Te esperamos en Forces.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <Link href="/" className={styles.footerBrand}>
              {NOMBRE}
              <span>Tu fuerza. Tu ritmo. Tu lugar.</span>
            </Link>
            <div className={styles.footerAccess}>
              <Link href="/portal">
                Portal de clientes <Arrow diagonal />
              </Link>
              <Link href="/login">
                Administración <span>Solo personal autorizado</span>
              </Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>
              © {new Date().getFullYear()} {NOMBRE} · Pacasmayo
            </span>
            <nav aria-label="Información legal">
              <Link href="/terminos">Condiciones</Link>
              <Link href="/privacidad">Privacidad</Link>
              <Link href="/reclamaciones">Libro de reclamaciones</Link>
            </nav>
          </div>
        </div>
      </footer>
      <div className={styles.mobileCta}>
        <a
          href={PRIMER_DIA}
          target="_blank"
          rel="noreferrer"
          className={styles.primaryButton}
        >
          Empieza por S/ 8 <Arrow />
        </a>
        <a
          href={COMO_LLEGAR}
          target="_blank"
          rel="noreferrer"
          aria-label="Cómo llegar a Forces Gym"
        >
          <Pin />
        </a>
      </div>
      <HomeMotion />
    </div>
  );
}
