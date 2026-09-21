'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Captura la foto del socio con la camara del equipo.
 *
 * La foto es lo unico que de verdad frena el prestamo del codigo: recepcion
 * compara la cara con la pantalla. Se recorta cuadrada y se comprime antes de
 * subirla, porque una foto de 4 MB por socio hace inusable el respaldo.
 */
export function CapturaFoto({
  onCaptura,
  etiqueta = 'Tomar foto',
}: {
  onCaptura: (dataUrl: string) => void | Promise<void>;
  etiqueta?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [encendida, setEncendida] = useState(false);
  const [error, setError] = useState('');

  const apagar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setEncendida(false);
  }, []);

  useEffect(() => apagar, [apagar]);

  async function encender() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setEncendida(true);
      // El elemento existe recien tras el render con la camara encendida.
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      }, 0);
    } catch {
      setError(
        'No se pudo abrir la camara. Revisa el permiso del navegador o sube una foto desde el archivo.',
      );
    }
  }

  async function disparar() {
    const video = videoRef.current;
    if (!video) return;

    // Recorte cuadrado centrado: la tarjeta de recepcion es cuadrada.
    const lado = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
      video,
      (video.videoWidth - lado) / 2,
      (video.videoHeight - lado) / 2,
      lado,
      lado,
      0,
      0,
      480,
      480,
    );

    apagar();
    await onCaptura(canvas.toDataURL('image/jpeg', 0.82));
  }

  function desdeArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = async () => {
      const img = new Image();
      img.onload = async () => {
        const lado = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 480, 480);
        await onCaptura(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  }

  return (
    <div className="space-y-3">
      {encendida && (
        <div className="overflow-hidden rounded-2xl border border-borde bg-black">
          <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!encendida ? (
          <button type="button" className="boton-suave" onClick={encender}>
            {etiqueta}
          </button>
        ) : (
          <>
            <button type="button" className="boton" onClick={disparar}>
              Capturar
            </button>
            <button type="button" className="boton-suave" onClick={apagar}>
              Cancelar
            </button>
          </>
        )}

        <label className="boton-suave cursor-pointer">
          Subir archivo
          <input type="file" accept="image/*" className="hidden" onChange={desdeArchivo} />
        </label>
      </div>

      {error && <p className="text-sm text-vencido">{error}</p>}
    </div>
  );
}
