const MAX_ARCHIVO = 20 * 1024 * 1024;
const MAX_PIXELES = 40_000_000;
const MAX_DIMENSION = 16_384;
const LADO_PERFIL = 480;

export const TIPOS_FOTO = 'image/jpeg,image/png,image/webp';
type FormatoImagen = 'image/webp' | 'image/jpeg';
type ImagenLeida = {
  fuente: CanvasImageSource;
  ancho: number;
  alto: number;
  liberar: () => void;
};

function intercambiaLadosExif(v: DataView, inicio: number, fin: number) {
  // APP1: longitud (2), "Exif\0\0" (6), cabecera TIFF y directorio IFD0.
  const tiff = inicio + 8;
  if (tiff + 8 > fin || v.getUint32(inicio + 2) !== 0x45786966) return false;
  const orden = v.getUint16(tiff);
  if (orden !== 0x4949 && orden !== 0x4d4d) return false;
  const menor = orden === 0x4949;
  if (v.getUint16(tiff + 2, menor) !== 42) return false;
  const ifd = tiff + v.getUint32(tiff + 4, menor);
  if (ifd < tiff || ifd + 2 > fin) return false;
  const cantidad = Math.min(64, v.getUint16(ifd, menor));
  for (let n = 0; n < cantidad; n++) {
    const entrada = ifd + 2 + n * 12;
    if (entrada + 12 > fin) break;
    if (v.getUint16(entrada, menor) !== 0x0112 || v.getUint16(entrada + 2, menor) !== 3 || v.getUint32(entrada + 4, menor) !== 1) continue;
    const orientacion = v.getUint16(entrada + 8, menor);
    return orientacion >= 5 && orientacion <= 8;
  }
  return false;
}

/** Lee solo la cabecera antes de decodificar una foto grande en el celular. */
async function dimensiones(archivo: File) {
  if (!archivo.size || archivo.size > MAX_ARCHIVO) {
    throw new Error('Elige una foto de hasta 20 MB.');
  }
  const b = new Uint8Array(await archivo.slice(0, 1024 * 1024).arrayBuffer());
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let ancho = 0;
  let alto = 0;
  let intercambiar = false;

  if (b.length >= 24 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) {
    ancho = v.getUint32(16);
    alto = v.getUint32(20);
  } else if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
    let i = 2;
    while (i + 8 < b.length) {
      if (b[i++] !== 255) break;
      while (b[i] === 255) i++;
      const marca = b[i++];
      if (marca === 218 || marca === 217) break;
      if (marca === 1 || (marca >= 208 && marca <= 215)) continue;
      if (i + 2 > b.length) break;
      const largo = v.getUint16(i);
      if (largo < 2 || i + largo > b.length) break;
      if (marca === 225 && largo >= 16 && v.getUint32(i + 2) === 0x45786966) {
        intercambiar = intercambiaLadosExif(v, i, i + largo);
      }
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marca)) {
        alto = v.getUint16(i + 3);
        ancho = v.getUint16(i + 5);
        break;
      }
      i += largo;
    }
  } else if (b.length >= 30 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP') {
    const tipo = String.fromCharCode(...b.slice(12, 16));
    if (tipo === 'VP8X') {
      ancho = 1 + b[24] + (b[25] << 8) + (b[26] << 16);
      alto = 1 + b[27] + (b[28] << 8) + (b[29] << 16);
    } else if (tipo === 'VP8L' && b[20] === 47) {
      const bits = v.getUint32(21, true);
      ancho = (bits & 0x3fff) + 1;
      alto = ((bits >>> 14) & 0x3fff) + 1;
    } else if (tipo === 'VP8 ' && b[23] === 157 && b[24] === 1 && b[25] === 42) {
      ancho = v.getUint16(26, true) & 0x3fff;
      alto = v.getUint16(28, true) & 0x3fff;
    }
  }

  if (!ancho || !alto) throw new Error('No pudimos leer la imagen. Usa una foto JPG, PNG o WebP.');
  if (ancho > MAX_DIMENSION || alto > MAX_DIMENSION || ancho * alto > MAX_PIXELES) {
    throw new Error('La foto tiene demasiada resolución. Elige una versión más pequeña o toma otra foto.');
  }
  return intercambiar ? { ancho: alto, alto: ancho } : { ancho, alto };
}

async function cargarImagen(archivo: File): Promise<ImagenLeida> {
  const original = await dimensiones(archivo);
  if (typeof createImageBitmap === 'function') {
    try {
      // El decodificador aplica la orientación EXIF y reduce la imagen antes
      // de entregarnos los píxeles, sin crear un lienzo del tamaño del original.
      const escala = Math.min(1, 2048 / Math.max(original.ancho, original.alto));
      const imagen = await createImageBitmap(archivo, {
        imageOrientation: 'from-image',
        resizeWidth: Math.max(1, Math.round(original.ancho * escala)),
        resizeQuality: 'high',
      });
      return { fuente: imagen, ancho: imagen.width, alto: imagen.height, liberar: () => imagen.close() };
    } catch {
      // Algunos navegadores aceptan la imagen en <img> y no en ImageBitmap.
    }
  }

  const url = URL.createObjectURL(archivo);
  try {
    const imagen = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const img = new Image();
      const reloj = window.setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        rechazar(new Error('La imagen tardó demasiado en abrirse. Prueba con otra foto.'));
      }, 15_000);
      img.onload = () => { window.clearTimeout(reloj); resolver(img); };
      img.onerror = () => { window.clearTimeout(reloj); rechazar(new Error('No se pudo leer la imagen. Prueba con otra foto.')); };
      // <img> aplica la orientación EXIF del archivo en los navegadores actuales.
      img.src = url;
    });
    return { fuente: imagen, ancho: imagen.naturalWidth, alto: imagen.naturalHeight, liberar: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** WebP para fotos; JPEG como alternativa si el navegador no codifica WebP. */
function codificar(lienzo: HTMLCanvasElement, calidad: number, formato: FormatoImagen) {
  const q = Math.min(1, Math.max(0.6, calidad));
  if (formato === 'image/webp') {
    try {
      const webp = lienzo.toDataURL('image/webp', q);
      if (webp.startsWith('data:image/webp;base64,')) return webp;
    } catch {
      // También hay navegadores que rechazan el formato en lugar de usar PNG.
    }
  }
  // Evita que una transparencia se vuelva negra al usar la alternativa JPEG.
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  const jpeg = lienzo.toDataURL('image/jpeg', q);
  if (!jpeg.startsWith('data:image/jpeg;base64,')) throw new Error('El navegador no pudo comprimir la foto.');
  return jpeg;
}

function dibujar(
  fuente: CanvasImageSource,
  ancho: number,
  alto: number,
  maxLado: number,
  calidad: number,
  formato: FormatoImagen,
  cuadrada = false,
) {
  if (!ancho || !alto) throw new Error('Espera a que la cámara muestre la imagen y vuelve a capturar.');
  const lienzo = document.createElement('canvas');
  const limite = Math.min(2048, Math.max(1, Math.round(maxLado)));
  const lado = Math.min(ancho, alto);
  const escala = Math.min(1, limite / Math.max(ancho, alto));
  lienzo.width = cuadrada ? LADO_PERFIL : Math.max(1, Math.round(ancho * escala));
  lienzo.height = cuadrada ? LADO_PERFIL : Math.max(1, Math.round(alto * escala));
  try {
    const ctx = lienzo.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (cuadrada) {
      ctx.drawImage(fuente, (ancho - lado) / 2, (alto - lado) / 2, lado, lado, 0, 0, LADO_PERFIL, LADO_PERFIL);
    } else {
      ctx.drawImage(fuente, 0, 0, lienzo.width, lienzo.height);
    }
    return codificar(lienzo, calidad, formato);
  } finally {
    // Libera los píxeles al terminar; el resultado no contiene EXIF ni GPS.
    lienzo.width = 0;
    lienzo.height = 0;
  }
}

export async function reducirImagen(
  archivo: File,
  maxLado = 1400,
  calidad = 0.8,
  formato: FormatoImagen = 'image/webp',
): Promise<string> {
  const imagen = await cargarImagen(archivo);
  try {
    return dibujar(imagen.fuente, imagen.ancho, imagen.alto, maxLado, calidad, formato);
  } finally {
    imagen.liberar();
  }
}

export async function prepararFotoPerfil(archivo: File): Promise<string> {
  const imagen = await cargarImagen(archivo);
  try {
    return dibujar(imagen.fuente, imagen.ancho, imagen.alto, LADO_PERFIL, 0.8, 'image/webp', true);
  } finally {
    imagen.liberar();
  }
}

export function capturarFotoPerfil(video: HTMLVideoElement): string {
  return dibujar(video, video.videoWidth, video.videoHeight, LADO_PERFIL, 0.8, 'image/webp', true);
}
