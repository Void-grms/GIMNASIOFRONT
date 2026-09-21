'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/**
 * Camara trasera del celular leyendo codigos QR.
 *
 * Usa BarcodeDetector cuando el navegador lo trae (Chrome en Android: rapido y
 * sin descargar nada) y jsQR cuando no (Safari en iPhone). La camara solo
 * funciona en HTTPS o en localhost; en Railway ya es HTTPS.
 *
 * Tras leer un codigo se pausa un momento y no vuelve a aceptar el mismo texto
 * durante unos segundos: la camara ve el QR 30 veces por segundo y cada lectura
 * seria un escaneo nuevo.
 */
export function EscanerCamara({
  onLeer,
  pausado = false,
}: {
  onLeer: (texto: string) => void;
  pausado?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const ultimo = useRef<{ texto: string; cuando: number }>({ texto: '', cuando: 0 });
  const pausa = useRef(pausado);
  const leer = useRef(onLeer);
  const [estado, setEstado] = useState<'iniciando' | 'listo' | 'sin_permiso' | 'sin_camara'>('iniciando');

  pausa.current = pausado;
  leer.current = onLeer;

  useEffect(() => {
    let flujo: MediaStream | null = null;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let vivo = true;
    const Detector = (globalThis as any).BarcodeDetector;
    let detector: any = null;

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado('sin_camara');
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e: any) {
        setEstado(e?.name === 'NotAllowedError' ? 'sin_permiso' : 'sin_camara');
        return;
      }
      if (!vivo || !video.current) {
        flujo.getTracks().forEach((t) => t.stop());
        return;
      }
      video.current.srcObject = flujo;
      await video.current.play().catch(() => {});

      if (Detector) {
        try {
          const formatos: string[] = await Detector.getSupportedFormats();
          if (formatos.includes('qr_code')) detector = new Detector({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }
      setEstado('listo');
      vuelta();
    }

    async function decodificar(): Promise<string | null> {
      const v = video.current;
      if (!v || v.readyState < 2) return null;
      if (detector) {
        const codigos = await detector.detect(v);
        return codigos[0]?.rawValue ?? null;
      }
      // jsQR trabaja sobre pixeles: se reduce el cuadro para que sea rapido.
      const escala = Math.min(1, 640 / v.videoWidth);
      const ancho = Math.round(v.videoWidth * escala);
      const alto = Math.round(v.videoHeight * escala);
      if (!ancho || !alto) return null;
      lienzo.current ??= document.createElement('canvas');
      const c = lienzo.current;
      c.width = ancho;
      c.height = alto;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, ancho, alto);
      const img = ctx.getImageData(0, 0, ancho, alto);
      return jsQR(img.data, ancho, alto, { inversionAttempts: 'dontInvert' })?.data ?? null;
    }

    async function vuelta() {
      if (!vivo) return;
      if (!pausa.current) {
        try {
          const texto = await decodificar();
          const ahora = Date.now();
          const repetido = texto === ultimo.current.texto && ahora - ultimo.current.cuando < 6000;
          if (texto && !repetido) {
            ultimo.current = { texto, cuando: ahora };
            navigator.vibrate?.(80);
            leer.current(texto);
          }
        } catch {
          /* un cuadro que no se pudo leer; se intenta con el siguiente */
        }
      }
      temporizador = setTimeout(vuelta, 180);
    }

    iniciar();
    return () => {
      vivo = false;
      clearTimeout(temporizador);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-borde bg-black">
      <video ref={video} className="h-full w-full object-cover" playsInline muted />

      {/* Marco de apuntado */}
      <div className="pointer-events-none absolute inset-[14%] rounded-3xl border-2 border-acento/80 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]" />

      {estado !== 'listo' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-zinc-300">
          {estado === 'iniciando' && 'Abriendo la camara…'}
          {estado === 'sin_permiso' &&
            'No hay permiso para usar la camara. Activalo en los ajustes del navegador para este sitio y recarga.'}
          {estado === 'sin_camara' &&
            'Este dispositivo no tiene camara disponible, o la pagina no esta en HTTPS.'}
        </div>
      )}
      {estado === 'listo' && pausado && <div className="absolute inset-0 bg-black/40" />}
    </div>
  );
}
