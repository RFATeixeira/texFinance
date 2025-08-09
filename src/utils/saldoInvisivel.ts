// utils/saldoInvisivel.ts

import { db } from "@/app/lib/firebaseConfig";
import {
  collection,
  getDocs
} from "firebase/firestore";
import { Transacao } from "@/app/types/types";

// Agora aceita opcionalmente mes e ano para retornar o saldo das contas invisíveis apenas daquele período.
export async function calcularSaldoContasInvisiveis(userId: string, mes?: number, ano?: number): Promise<number> {
  const contasRef = collection(db, "users", userId, "contas");
  const transacoesRef = collection(db, "users", userId, "transacoes");

  const [contasSnapshot, transacoesSnapshot] = await Promise.all([
    getDocs(contasRef),
    getDocs(transacoesRef),
  ]);

  // Contas ocultas
  const contasInvisiveis = contasSnapshot.docs
    .filter((doc) => doc.data().visivelNoSaldo === false)
    .map((doc) => doc.id);

  const transacoes = transacoesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Transacao[];

  // Se mes e ano foram passados, filtrar as transações desse período
  const transacoesFiltradas =
    mes === undefined || ano === undefined
      ? transacoes
      : transacoes.filter((t) => {
          const rawDate: any = (t as any).data?.toDate?.() ?? (t as any).data;
          if (!(rawDate instanceof Date)) return false;
          return rawDate.getMonth() === mes && rawDate.getFullYear() === ano;
        });

  const soma = (lista: Transacao[]) =>
    lista.reduce((acc, t) => acc + Number((t as any).valor || 0), 0);

  let total = 0;

  contasInvisiveis.forEach((contaId) => {
    const receitas = transacoesFiltradas.filter(
      (t: any) => t.type === "receita" && t.conta === contaId
    );
    const despesas = transacoesFiltradas.filter(
      (t: any) => t.type === "despesa" && t.conta === contaId
    );
    const transferenciasEnviadas = transacoesFiltradas.filter(
      (t: any) => t.type === "transferencia" && t.contaOrigem === contaId
    );
    const transferenciasRecebidas = transacoesFiltradas.filter(
      (t: any) => t.type === "transferencia" && t.contaDestino === contaId
    );

    const saldoConta =
      soma(receitas) -
      soma(despesas) -
      soma(transferenciasEnviadas) +
      soma(transferenciasRecebidas);

    total += saldoConta;
  });

  return total;
}

export function formatarValorVisibilidade(valor: number, visivel: boolean): string {
  if (visivel) return valor.toFixed(2);
  // máscara fixa solicitada
  return '****';
}
