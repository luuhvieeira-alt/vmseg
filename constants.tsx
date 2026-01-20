
import { VendaStatus, IndicacaoStatus } from './types';

export const VENDA_STATUS_MAP: VendaStatus[] = [
  'Fazer Vistoria',
  'Mandar Boletos',
  'Falta Pagamento',
  'Pagamento Efetuado'
];

export const INDICACAO_STATUS_MAP: IndicacaoStatus[] = [
  'NOVA INDICAÇÃO',
  'WHATSAPP',
  'COTAÇÃO REALIZADA',
  'COBRAR ATENÇÃO'
];

export const FORMAT_BRL = (v: number | string) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
