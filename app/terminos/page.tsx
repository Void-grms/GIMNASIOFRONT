import { PaginaLegal } from '@/components/PaginaLegal';

export const metadata = { title: 'Condiciones de la membresia' };

export default function Terminos() {
  return (
    <PaginaLegal
      titulo="Condiciones de la membresia"
      campoTexto="terminosTexto"
      campoVersion="terminosVersion"
    />
  );
}
