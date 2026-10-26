// Revisão espaçada: cada acerto empurra a próxima revisão para mais longe.
export const INTERVALOS_DIAS = [1, 3, 7, 15, 30, 60, 120];

export type Resposta = 'errei' | 'dificil' | 'acertei';

export interface EstadoRevisao {
  /** Índice em INTERVALOS_DIAS usado no próximo acerto. */
  etapa: number;
  /** Data (AAAA-MM-DD) em que o cartão volta para revisão. */
  vence: string;
}

export function hoje(): string {
  return paraData(new Date());
}

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number);
  return paraData(new Date(a, m - 1, d + dias));
}

function paraData(dt: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export function responder(estado: EstadoRevisao, resposta: Resposta, dia = hoje()): EstadoRevisao {
  const ultima = INTERVALOS_DIAS.length - 1;
  if (resposta === 'errei') return { etapa: 0, vence: somarDias(dia, 1) };
  if (resposta === 'dificil') {
    const dias = Math.max(1, Math.round(INTERVALOS_DIAS[estado.etapa] / 2));
    return { etapa: estado.etapa, vence: somarDias(dia, dias) };
  }
  return { etapa: Math.min(estado.etapa + 1, ultima), vence: somarDias(dia, INTERVALOS_DIAS[estado.etapa]) };
}

export function venceuHoje(estado: EstadoRevisao, dia = hoje()): boolean {
  return estado.vence <= dia;
}

export function descreverDias(data: string, dia = hoje()): string {
  const [a1, m1, d1] = dia.split('-').map(Number);
  const [a2, m2, d2] = data.split('-').map(Number);
  const dias = Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}
