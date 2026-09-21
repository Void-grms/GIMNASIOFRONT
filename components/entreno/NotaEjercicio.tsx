'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Nota fija del socio sobre un ejercicio ("asiento en 4", "agarre cerrado").
 * Se ve cada vez que elige ese ejercicio y se edita ahi mismo.
 */
export function NotaEjercicio({
  exerciseId,
  nota,
  onGuardada,
}: {
  exerciseId: string;
  nota: string;
  onGuardada: (nota: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(nota);
  const [error, setError] = useState('');

  useEffect(() => {
    setTexto(nota);
    setEditando(false);
    setError('');
  }, [exerciseId, nota]);

  async function guardar() {
    setError('');
    try {
      const r: any = await api(`/portal/exercises/${exerciseId}/note`, {
        metodo: 'PUT',
        sesion: 'socio',
        cuerpo: { nota: texto },
      });
      onGuardada(r.nota);
      setEditando(false);
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (editando) {
    return (
      <div className="space-y-2">
        <input
          className="campo py-2 text-sm"
          maxLength={140}
          autoFocus
          placeholder="Ej.: asiento en 4, agarre cerrado, pin en el 7…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              guardar();
            }
            if (e.key === 'Escape') setEditando(false);
          }}
        />
        {error && <p className="aviso-mal">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="boton-suave flex-1 py-1.5 text-sm" onClick={() => setEditando(false)}>
            Cancelar
          </button>
          <button type="button" className="boton flex-1 py-1.5 text-sm" onClick={guardar}>
            Guardar nota
          </button>
        </div>
      </div>
    );
  }

  return nota ? (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="flex w-full items-start gap-2 rounded-xl border border-acento/25 bg-acento/[0.06] px-3 py-2 text-left text-sm"
      title="Editar nota"
    >
      <span aria-hidden="true">📝</span>
      <span className="min-w-0 flex-1 text-zinc-200">{nota}</span>
      <span className="shrink-0 text-xs text-zinc-500">editar</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="text-xs text-zinc-500 underline decoration-dotted hover:text-white"
    >
      + Agregar nota (asiento, agarre, maquina…)
    </button>
  );
}
