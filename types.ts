
export type UserRole = 'ADMIN' | 'VENDEDOR' | 'RH';

export interface User {
  id?: string;
  nome: string;
  login: string;
  senha?: string;
  setor: UserRole;
  comissao: number;
  folhaLiberada?: boolean;
}

export interface Meta {
  id?: string;
  vendedor: string;
  meta_salario: number;
  meta_premio: number;
  meta_qtd: number;
}

export interface Empresa {
  id?: string;
  nome: string;
}

export interface Cancelamento {
  id?: string;
  cliente: string;
  empresa: string;
  vendedor: string;
  valor_comissao: number;
  dataCriacao: number;
}

export type VendaStatus = 'Fazer Vistoria' | 'Mandar Boletos' | 'Falta Pagamento' | 'Pagamento Efetuado';

export interface Venda {
  id?: string;
  cliente: string;
  tel: string;
  vendedor: string;
  empresa: string;
  valor: number;
  comissao_cheia: number;
  comissao_vendedor: number;
  suhai: boolean;
  status: VendaStatus;
  dataCriacao: number;
  // Campos para o Setor RH
  porcentagem_vendida?: number;
  origem?: 'RH';
}

export type IndicacaoStatus = 'NOVA INDICAÇÃO' | 'WHATSAPP' | 'COTAÇÃO REALIZADA' | 'COBRAR ATENÇÃO' | 'NUMERO INVALIDO';

export interface Indicacao {
  id?: string;
  cliente: string;
  tel: string;
  veiculo: string;
  vendedor: string;
  suhai: boolean;
  info: string;
  status: IndicacaoStatus;
  dataCriacao: number;
}

export interface AuthUser extends User {
  isAdmin: boolean;
}
