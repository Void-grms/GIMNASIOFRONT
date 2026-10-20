// Unico cambio real: la tipografia deja de ser system-ui. Archivo es un
// grotesco industrial que aguanta el peso 900 del rotulo de la fachada y
// sigue siendo legible a 12 px en una tabla de caja.

import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';
import { ProveedorTema } from '@/components/tema/ProveedorTema';
import { SCRIPT_TEMA } from '@/components/tema/configuracion';
import { AparienciaGlobal } from '@/components/tema/SelectorTema';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--fuente-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Forces Gym · Sistema de gimnasio',
  description: 'Membresias, control de acceso por QR y panel de gestion',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={archivo.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} /></head>
      <body><ProveedorTema><AparienciaGlobal />{children}</ProveedorTema></body>
    </html>
  );
}
