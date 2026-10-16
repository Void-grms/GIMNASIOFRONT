import type { Metadata } from 'next';
import FormularioCliente from '@/components/acceso/FormularioCliente';

export const metadata: Metadata = {
  title: 'Acceso de clientes | Forces Gym',
  description: 'Entra al portal de Forces Gym con tu DNI y PIN personal.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function LoginSocio() {
  return <FormularioCliente />;
}
