// utils/saldoInvisivel.ts

import { db } from "@/app/lib/firebaseConfig";
import {
  collection,
  getDocs
} from "firebase/firestore";
import { Transacao } from "@/app/types/types";

export async function calcularSaldoContasInvisiveis(userId: string): Promise<number> {
  const contasRef = collection(db, "users", userId, "contas");
  const transacoesRef = collection(db, "users", userId, "transacoes");

  const contasSnapshot = await getDocs(contasRef);
  const transacoesSnapshot = await getDocs(transacoesRef);

  // Contas ocultas
  const contasInvisiveis = contasSnapshot.docs
    .filter((doc) => doc.data().visivelNoSaldo === false)
    .map((doc) => doc.id);

  const transacoes = transacoesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Transacao[];

  const soma = (lista: Transacao[]) =>
    lista.reduce((acc, t) => acc + Number(t.valor || 0), 0);

  let total = 0;

  contasInvisiveis.forEach((contaId) => {
    const receitas = transacoes.filter(t => t.type === "receita" && t.conta === contaId);
    const despesas = transacoes.filter(t => t.type === "despesa" && t.conta === contaId);
    const transferenciasEnviadas = transacoes.filter(t => t.type === "transferencia" && t.contaOrigem === contaId);
    const transferenciasRecebidas = transacoes.filter(t => t.type === "transferencia" && t.contaDestino === contaId);

    const saldoConta =
      soma(receitas) -
      soma(despesas) -
      soma(transferenciasEnviadas) +
      soma(transferenciasRecebidas);

    total += saldoConta;
  });

  return total;
}
