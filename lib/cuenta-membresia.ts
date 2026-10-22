export type CuentaMembresiaDatos = {
  total: number; pagado: number; saldo: number; fechaLimiteSaldo: string | null;
  estado: 'pagada' | 'pendiente' | 'vencida'; version: number;
  inicio?: string; vence?: string; plan?: string;
  pagos: { id: string; monto: number; metodo: string; fecha: string; cajero: string | null; comprobante: { id: string; tipo: string; serie: string; numero: number } | null }[];
  ajustes: { id: string; tipo: 'inicio' | 'congelamiento'; motivo: string; usuarioId: string; usuarioNombre: string; rol: string; fecha: string; antes: { inicio: string; vence: string }; despues: { inicio: string; vence: string } }[];
  congelamientos: { id: string; desde: string; hasta: string; dias: number; motivo: string; creadoAt: string }[];
};
export const hoyLimaTexto = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
export function diasEntre(desde: string, hasta: string) {
  return Math.round((Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`) - Date.parse(`${desde.slice(0, 10)}T00:00:00Z`)) / 86400000);
}
export function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || !Number.isFinite(dias)) return '';
  d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10);
}
