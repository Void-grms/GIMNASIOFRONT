import { PaginaLegal } from '@/components/PaginaLegal';

export const metadata = { title: 'Politica de privacidad' };

export default function Privacidad() {
  return (
    <PaginaLegal
      titulo="Politica de privacidad"
      campoTexto="privacidadTexto"
      campoVersion="privacidadVersion"
    />
  );
}
