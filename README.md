# Frontend - Sistema de gimnasio

Next.js 15 (App Router) + React 19 + Tailwind. GSAP se usa solo en el home.
Habla con el backend por `NEXT_PUBLIC_API_URL`.

## Arrancar

```bash
npm install
cp .env.local.example .env.local
npm run dev        # http://localhost:3000
```

El backend debe estar corriendo en `http://localhost:4000`.

Comandos de verificación disponibles:

```bash
npm run typecheck
npm run build
```

## Home de captación

- `app/page.tsx` contiene la presentación pública, los planes, las clases,
  horarios, ubicación, preguntas frecuentes y metadatos del gimnasio.
- `app/home.module.css` concentra el diseño responsive del home; los títulos
  usan Barlow Condensed y el resto conserva Archivo.
- `components/home/HomeNavigation.tsx` y su CSS organizan la navegación y el
  menú móvil. «Portal de clientes» lleva a `/portal` (DNI + PIN) y
  «Administración» a `/login` (correo + contraseña, solo personal autorizado).
- `components/home/HomeMotion.tsx` carga GSAP y ScrollTrigger dinámicamente.
  El contenido se renderiza visible en el servidor y se puede leer sin
  JavaScript. Las animaciones respetan `prefers-reduced-motion`, conservan el
  desplazamiento nativo y se limpian al salir de la página.

Las fotografías editoriales de entrenamiento se sirven como WebP locales desde
`public/home/`; autores y fuentes están en [CREDITS.md](public/home/CREDITS.md).
La imagen de `public/fachada.webp` muestra el local real en la sección de
ubicación.

Los planes del home son estáticos: pase diario S/ 8, mensual S/ 100 y
universitario S/ 80. Conservan los valores iniciales del backend; su API de
planes es privada y los cambios en administración no actualizan estos textos.
Los CTA abren WhatsApp con una consulta sobre el plan elegido; la inscripción
y el pago se coordinan con recepción. El aforo sigue consultando el endpoint
público y se oculta cuando está desactivado o no responde.

## Pantallas

| Ruta | Quien la usa | Para que |
| --- | --- | --- |
| `/` | Publico | Landing: precios, horarios, ubicacion |
| `/login` | Personal | Entrar al panel |
| `/panel/recepcion` | Recepcion | Escanear QR o DNI, ver la tarjeta del socio, confirmar llegadas |
| `/panel/socios` | Recepcion | Buscar y registrar socios |
| `/panel/socios/[id]` | Recepcion | Ficha, historial y cobro de membresia |
| `/panel/caja` | Recepcion | Movimientos, arqueo del turno y exportar a Excel |
| `/panel/productos` | Recepcion | Catalogo, stock y venta rapida de mostrador |
| `/panel/avisos` | Recepcion | Vencimientos con el mensaje listo para WhatsApp |
| `/panel/comprobantes` | Recepcion | Boletas y facturas emitidas, imprimir y anular |
| `/panel/reclamaciones` | Recepcion | Bandeja del libro de reclamaciones con su plazo |
| `/panel/ajustes` | Dueno | Datos fiscales, regimen, PSE, respaldo y textos legales |
| `/panel/invitados` | Recepcion | Invitados del mes y cuantos se hicieron socios |
| `/quiosco` | Mostrador | Pantalla completa de acceso, sin menu |
| `/panel` | Dueno | KPIs, vencimientos de la semana, socios en riesgo |
| `/portal` | Socio | Entrar con DNI + PIN |
| `/portal/mi` | Socio | Credencial QR, dias restantes, boton entrar/salir |
| `/portal/perfil` | Socio | Su foto, telefono, correo y PIN |
| `/portal/progreso` | Socio | Entrenamientos, curva de progreso y peso corporal |
| `/reclamaciones` | Publico | Libro de reclamaciones virtual |
| `/terminos` | Publico | Condiciones de la membresia vigentes |
| `/privacidad` | Publico | Politica de privacidad vigente |

## Sistema de diseno

La paleta, las clases y la tipografia compartidas viven en estos archivos:

- `tailwind.config.ts` — colores de marca (`acento` #FAD234), profundidades,
  sombras, keyframes y easings.
- `app/globals.css` — las clases compartidas: `.tarjeta`, `.tarjeta-viva`,
  `.tarjeta-acento`, `.boton`, `.boton-grande`, `.boton-riesgo`, `.campo`,
  `.campo-escaneo`, `.rotulo`, `.cifra`, `.franja-*`, `.punto-*`, `.aviso-*`.
- `app/layout.tsx` — la tipografia Archivo via `next/font`; el home añade
  Barlow Condensed desde `app/page.tsx`.

Dos reglas al escribir pantallas nuevas:

- Todo numero que se compara en columna (montos, DNI, horas, dias) lleva
  `.cifra`, o las cifras bailan al refrescar.
- Los avisos inline son `.aviso-ok`, `.aviso-ojo` y `.aviso-mal`; los rotulos
  de seccion son `.rotulo`.

> **Las fuentes se descargan al compilar.** `next/font/google` va a buscar
> Archivo y Barlow Condensed a fonts.googleapis.com al correr `npm run build` o
> `npm run dev`. Si alguna vez despliegas donde no haya salida a Google Fonts,
> baja los `.woff2` a `app/fuentes/` y cambia a `next/font/local`.

## Detalles que importan

- En recepcion el campo de escaneo **se mantiene enfocado solo**: el lector QR
  USB escribe ahi y manda Enter. El mismo campo acepta un DNI tecleado.
- La tarjeta del socio usa semaforo: verde pasa, ambar esta por vencer y cobra,
  rojo no pasa. El color se lee antes que el texto.
- El QR del socio se regenera cada 25 segundos porque el backend lo rota cada 30.
- El boton del portal cambia con el estado: fuera avisa la llegada a recepcion,
  dentro registra la salida. Entrar necesita confirmacion de recepcion; salir no
  necesita permiso de nadie.
- La captura de foto recorta cuadrado y comprime a JPEG antes de subir, con
  opcion de subir un archivo cuando no hay camara.
- `Revelar` queda disponible como componente auxiliar; el home usa
  `HomeMotion` para sus animaciones y mantiene el contenido **visible** en el
  servidor.
- La foto de la fachada esta en `public/fachada.webp` (157 KB) con
  `fachada.jpg` de respaldo. El PNG original de 2 MB no entra al repositorio.

### Movil y accesibilidad

Criterios tomados de NN/g, WCAG 2.2 y web.dev, aplicados en todo el sistema:

- **Navegacion del panel.** Desde `md` hay barra lateral; debajo, una barra
  inferior con las tres pantallas de todo el dia (Recepcion, Socios, Caja) y
  "Mas" abre una hoja con el resto. Arriba, una franja fija dice en que
  seccion estas. El titulo de cada pagina lo pone `app/panel/layout.tsx` a
  partir de la ruta (prefijo mas largo), y tambien el `document.title`.
- **Tablas a tarjetas.** Caja y Comprobantes muestran tarjetas por fila en el
  celular (`sm:hidden`) y la tabla desde `sm`. Las cifras de resumen van de a
  dos columnas en el celular.
- **Blancos tactiles.** `.boton`, `.boton-suave` y `.boton-riesgo` miden 44 px
  como minimo (`min-h-11`); los enlaces del header y footer tambien.
- **Campos.** `.campo` usa 16 px: con menos, iOS hace zoom al enfocar. Cada
  campo tiene `<label htmlFor>`, `autoComplete` y el teclado correcto
  (`inputMode="numeric"` para DNI, `type="tel"` para celular,
  `inputMode="decimal"` para montos). Lo opcional se marca en la etiqueta.
- **Foco visible.** Anillo amarillo de 2 px con `:focus-visible` (solo al usar
  teclado), sin tocar el foco propio de los campos.
- **Landing.** El hero editorial usa `next/image` con `priority`; la fachada
  real aparece en ubicación. Titular con `clamp()`, CTA de prueba por S/ 8,
  enlace para saltar al contenido y una barra fija en el celular para consultar
  por WhatsApp o abrir "Cómo llegar", respetando `env(safe-area-inset-bottom)`.
- **Tokens con alfa.** `borde` ya es `rgba(...)`: no uses `border-borde/60`,
  Tailwind reemplaza el alfa y sale una linea blanca al 60 %.
