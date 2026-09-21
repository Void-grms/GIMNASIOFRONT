'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

/**
 * Pagina legal publica. El texto vive en los ajustes, no en el codigo: el
 * gimnasio puede corregirlo sin desplegar, y queda registrado con que version
 * consintio cada socio.
 */
export function PaginaLegal({
  titulo,
  campoTexto,
  campoVersion,
}: {
  titulo: string;
  campoTexto: 'privacidadTexto' | 'terminosTexto';
  campoVersion: 'privacidadVersion' | 'terminosVersion';
}) {
  const [ajustes, setAjustes] = useState<any>(null);

  useEffect(() => {
    api('/settings')
      .then(setAjustes)
      .catch(() => setAjustes({}));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-zinc-400 hover:text-white">
        Volver al inicio
      </Link>

      <h1 className="mt-4 text-3xl font-black">{titulo}</h1>
      {ajustes?.[campoVersion] && (
        <p className="mt-1 text-sm text-zinc-500">
          Version {ajustes[campoVersion]}
          {ajustes.razonSocial ? ` · ${ajustes.razonSocial}` : ''}
        </p>
      )}

      <div className="mt-8 whitespace-pre-wrap leading-relaxed text-zinc-300">
        {ajustes?.[campoTexto] || 'Cargando...'}
      </div>

      <p className="mt-10 border-t border-borde pt-6 text-sm text-zinc-500">
        Si algo de esto no te parece, puedes dejar tu registro en el{' '}
        <Link href="/reclamaciones" className="text-acento underline">
          libro de reclamaciones
        </Link>
        .
      </p>
    </main>
  );
}
