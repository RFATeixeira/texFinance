export type Cartao = {
  id?: string;
  nome: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
};

export type Conta = {
  id: string;
  nome: string;
  saldo: number;
};

export type Transacao = {
  type: string;
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  data: string;
  tipo: "gasto" | "ganho" | "transferencia";
  conta?: string;
  contaOrigem?: string;
  contaDestino?: string;
};

export type Membro = {
  uid: string;
  nome: string;
  email?: string;
};

export type Ambiente = {
  id: string;
  nome: string;
  icone?: string;
  membros?: Membro[];
  criador?: string;
};
