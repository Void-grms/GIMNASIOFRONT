/**
 * Cliente del API. Guarda el token en localStorage: hay dos sesiones posibles
 * y distintas, la del personal y la del socio, y nunca deben pisarse.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type Sesion = 'staff' | 'socio';

const LLAVE: Record<Sesion, string> = {
  staff: 'gym.token.staff',
  socio: 'gym.token.socio',
};

export function guardarToken(tipo: Sesion, token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(LLAVE[tipo], token);
}

export function leerToken(tipo: Sesion): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LLAVE[tipo]);
}

export function cerrarSesion(tipo: Sesion) {
  if (typeof window !== 'undefined') localStorage.removeItem(LLAVE[tipo]);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: any; sesion?: Sesion } = {},
): Promise<T> {
  const { metodo = 'GET', cuerpo, sesion = 'staff' } = opciones;
  const token = leerToken(sesion);

  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const data = await res.json();
      mensaje = Array.isArray(data.message) ? data.message.join('. ') : data.message || mensaje;
    } catch {
      /* respuesta sin json */
    }
    throw new ApiError(res.status, mensaje);
  }
  return res.status === 204 ? (null as T) : res.json();
}

export const soles = (monto: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(monto ?? 0);

export const fechaCorta = (iso: string | Date | null) => {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')) : iso;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const hora = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

/**
 * Las fotos se sirven fuera del prefijo /api, en la misma maquina del backend.
 * Guardamos la ruta relativa en la base para no atarnos a un dominio.
 */
export const urlArchivo = (ruta?: string | null): string | null => {
  if (!ruta) return null;
  if (/^https?:/i.test(ruta)) return ruta;
  return BASE.replace(/\/api\/?$/, '') + ruta;
};

export const whatsapp = (telefono?: string | null, mensaje = '') => {
  const numero = (telefono || '').replace(/\D/g, '');
  if (!numero) return null;
  const conPais = numero.length === 9 ? `51${numero}` : numero;
  return `https://wa.me/${conPais}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
};

/**
 * Descarga un archivo de un endpoint protegido. Un enlace normal no sirve
 * porque el navegador no manda la cabecera Authorization.
 */
export async function descargar(ruta: string, nombre: string, sesion: Sesion = 'staff') {
  const token = leerToken(sesion);
  const res = await fetch(`${BASE}${ruta}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, 'No se pudo generar el archivo');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

/**
 * Datos de la sesion, leidos del propio token. No valida la firma — de eso se
 * encarga el backend en cada peticion — solo evita una llamada extra para
 * saber como se llama quien tiene la pantalla abierta.
 */
export function sesionActual(tipo: Sesion = 'staff'): {
  nombre?: string;
  rol?: string;
  sub?: string;
} | null {
  const token = leerToken(tipo);
  if (!token) return null;
  try {
    const carga = token.split('.')[1];
    return JSON.parse(atob(carga.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Achica una imagen elegida del celular antes de subirla. Una foto de camara
 * pesa 4-8 MB; reducida a 1400 px en JPEG queda en unos 200-400 KB y se sigue
 * leyendo bien (el numero de operacion de un Yape, la etiqueta de un producto).
 */
export function reducirImagen(archivo: File, maxLado = 1400, calidad = 0.82): Promise<string> {
  return new Promise((resolver, rechazar) => {
    if (!archivo.type.startsWith('image/')) {
      rechazar(new Error('El archivo no es una imagen'));
      return;
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(img.width * escala);
      lienzo.height = Math.round(img.height * escala);
      const ctx = lienzo.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        rechazar(new Error('No se pudo procesar la imagen'));
        return;
      }
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      URL.revokeObjectURL(url);
      resolver(lienzo.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

/** Imagen de un endpoint protegido como URL local (la captura del Yape). */
export async function imagenProtegida(ruta: string, sesion: Sesion = 'staff'): Promise<string> {
  const token = leerToken(sesion);
  const res = await fetch(`${BASE}${ruta}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (!res.ok) throw new ApiError(res.status, 'No se pudo cargar la imagen');
  return URL.createObjectURL(await res.blob());
}

/** Iniciales para el avatar: "Patrick Isla" -> "PI". */
export const iniciales = (nombre?: string) =>
  (nombre || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase() || '··';
