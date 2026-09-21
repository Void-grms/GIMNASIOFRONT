'use client';

// La clave inicial del personal es temporal (sale del seed o del log del
// deploy). Esta tarjeta deja que cada quien ponga la suya sin tocar la base.

import { useState } from 'react';
import { api } from '@/lib/api';

export function CambiarClave() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'mal'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const noCoinciden = repetida !== '' && repetida !== nueva;
  const corta = nueva !== '' && nueva.length < 8;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (noCoinciden || corta) return;
    setEnviando(true);
    setEstado(null);
    try {
      await api('/auth/password', { metodo: 'POST', cuerpo: { actual, nueva } });
      setEstado({ tipo: 'ok', texto: 'Contrasena actualizada. Usala la proxima vez que entres.' });
      setActual('');
      setNueva('');
      setRepetida('');
    } catch (err: any) {
      setEstado({ tipo: 'mal', texto: err.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="tarjeta space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Tu contrasena</h2>
        <p className="text-sm text-zinc-500">
          Si todavia usas la clave inicial, cambiala hoy. Minimo 8 caracteres.
        </p>
      </div>
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor="clave-actual">Actual</label>
          <input
            id="clave-actual"
            type="password"
            className="campo"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="clave-nueva">Nueva</label>
          <input
            id="clave-nueva"
            type="password"
            className="campo"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            aria-invalid={corta}
            aria-describedby={corta ? 'clave-nueva-error' : undefined}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            required
          />
          {corta && (
            <p id="clave-nueva-error" className="mt-1 text-xs text-porvencer">
              Le faltan {8 - nueva.length} caracter(es).
            </p>
          )}
        </div>
        <div>
          <label className="etiqueta" htmlFor="clave-repetida">Repite la nueva</label>
          <input
            id="clave-repetida"
            type="password"
            className="campo"
            autoComplete="new-password"
            aria-invalid={noCoinciden}
            aria-describedby={noCoinciden ? 'clave-repetida-error' : undefined}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            required
          />
          {noCoinciden && (
            <p id="clave-repetida-error" className="mt-1 text-xs text-porvencer">
              No coincide con la nueva.
            </p>
          )}
        </div>
        <div className="sm:col-span-3">
          {estado && (
            <p className={`${estado.tipo === 'ok' ? 'aviso-ok' : 'aviso-mal'} mb-3`} role="status">
              {estado.texto}
            </p>
          )}
          <button className="boton" disabled={enviando || noCoinciden || corta}>
            {enviando ? 'Guardando...' : 'Cambiar contrasena'}
          </button>
        </div>
      </form>
    </section>
  );
}
