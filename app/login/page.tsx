import type { Metadata } from 'next';
import FormularioPersonal from '@/components/acceso/FormularioPersonal';

export const metadata: Metadata = {
  title: 'Acceso de administración | Forces Gym',
  description: 'Acceso para recepción y personal autorizado de Forces Gym.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function LoginPersonal() {
  return <FormularioPersonal />;
}
