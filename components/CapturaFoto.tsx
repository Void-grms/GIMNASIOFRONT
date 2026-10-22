'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { capturarFotoPerfil, prepararFotoPerfil, TIPOS_FOTO } from '@/lib/imagenes';

/** Foto cuadrada de 480 px, optimizada antes de enviarla al servidor. */
export function CapturaFoto({
  onCaptura,
  etiqueta = 'Tomar foto',
}: {
  onCaptura: (dataUrl: string) => void | Promise<void>;
  etiqueta?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vigente = useRef(true);
  const ocupada = useRef(false);
  const [encendida, setEncendida] = useState(false);
  const [trabajando, setTrabajando] = useState<'camara' | 'foto' | null>(null);
  const [error, setError] = useState('');

  const apagar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (vigente.current) setEncendida(false);
  }, []);

  useEffect(() => {
    vigente.current = true;
    return () => { vigente.current = false; apagar(); };
  }, [apagar]);

  useEffect(() => {
    if (!encendida || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {
      if (vigente.current) setError('No se pudo mostrar la cámara. Prueba subiendo una foto.');
      apagar();
    });
  }, [encendida, apagar]);

  async function encender() {
    if (ocupada.current) return;
    ocupada.current = true;
    setTrabajando('camara');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      if (!vigente.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setEncendida(true);
    } catch {
      if (vigente.current) setError('No se pudo abrir la cámara. Revisa el permiso del navegador o sube una foto desde el archivo.');
    } finally {
      ocupada.current = false;
      if (vigente.current) setTrabajando(null);
    }
  }

  async function procesar(obtenerFoto: () => string | Promise<string>) {
    if (ocupada.current) return;
    ocupada.current = true;
    setTrabajando('foto');
    setError('');
    try {
      const imagen = await obtenerFoto();
      apagar();
      if (vigente.current) await onCaptura(imagen);
    } catch (e) {
      if (vigente.current) setError(e instanceof Error ? e.message : 'No se pudo guardar la foto. Vuelve a intentarlo.');
    } finally {
      ocupada.current = false;
      if (vigente.current) setTrabajando(null);
    }
  }

  function disparar() {
    const video = videoRef.current;
    if (video) void procesar(() => capturarFotoPerfil(video));
  }

  function desdeArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (archivo) void procesar(() => prepararFotoPerfil(archivo));
  }

  return (
    <div className="space-y-3" aria-busy={!!trabajando}>
      {encendida && (
        <div className="overflow-hidden rounded-2xl border border-borde bg-black">
          <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!encendida ? (
          <button type="button" className="boton-suave" disabled={!!trabajando} onClick={encender}>
            {trabajando === 'camara' ? 'Abriendo cámara…' : etiqueta}
          </button>
        ) : (
          <>
            <button type="button" className="boton" disabled={!!trabajando} onClick={disparar}>
              Capturar
            </button>
            <button type="button" className="boton-suave" disabled={!!trabajando} onClick={apagar}>
              Cancelar
            </button>
          </>
        )}

        <label className={`boton-suave ${trabajando ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
          Subir archivo
          <input type="file" accept={TIPOS_FOTO} disabled={!!trabajando} className="hidden" onChange={desdeArchivo} />
        </label>
      </div>

      {trabajando === 'foto' && <p role="status" className="text-sm text-tenue">Optimizando y guardando foto…</p>}
      <p className="text-xs text-tenue">JPG, PNG o WebP. Tu foto se comprime automáticamente para consumir menos datos.</p>
      {error && <p role="alert" className="text-sm text-vencido">{error}</p>}
    </div>
  );
}
