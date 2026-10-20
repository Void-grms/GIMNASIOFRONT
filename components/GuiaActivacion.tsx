const PASOS = [
  {
    titulo: 'Recibe tu enlace personal',
    texto: 'Acércate a recepción para verificar tu DNI y celular. Allí pueden prepararte un enlace de activación personal.',
  },
  {
    titulo: 'Activa tu portal',
    texto: 'Abre tu enlace, confirma tu DNI, elige un PIN de 4 dígitos y lee y acepta el consentimiento para el tratamiento de tus datos.',
  },
  {
    titulo: 'Entra con tu DNI y PIN',
    texto: 'Después de activar tu acceso, inicia sesión con tu DNI y el PIN que elegiste. Para marcar asistencia, sigue dando tu código en recepción.',
  },
];

export function GuiaActivacion({ compacta = false }: { compacta?: boolean }) {
  return (
    <ol className={compacta ? 'space-y-4' : 'grid gap-6 md:grid-cols-3 md:gap-8'}>
      {PASOS.map((paso, indice) => (
        <li key={paso.titulo} className={compacta ? 'flex items-start gap-3' : 'border-t border-borde pt-5'}>
          <span aria-hidden="true" className={compacta
            ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-acento/10 text-xs font-bold text-acentoTexto cifra'
            : 'mb-5 flex h-9 w-9 items-center justify-center rounded-full border border-acento/40 text-sm font-bold text-acentoTexto cifra'}>
            {indice + 1}
          </span>
          <div>
            <p className={compacta ? 'text-sm font-semibold text-tinta' : 'text-lg font-bold text-tinta'}>{paso.titulo}</p>
            <p className={`mt-2 text-sm leading-relaxed text-secundario ${compacta ? '' : 'max-w-sm'}`}>{paso.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
