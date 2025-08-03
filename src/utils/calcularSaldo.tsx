// utils/calcularSaldo.ts
import { db } from "../app/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export async function calcularSaldo(userId: string, mes: number, ano: number): Promise<number> {
  const transacoesRef = collection(db, "users", userId, "transacoes");
  const snapshot = await getDocs(transacoesRef);

  let saldo = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    const dataTransacao = data.data?.toDate?.();
    const valor = Number(data.valor) || 0;

    if (
      dataTransacao &&
      dataTransacao.getMonth() === mes &&
      dataTransacao.getFullYear() === ano &&
      data.conta &&
      data.visivelNoSaldoFinal === false
    ) {
      if (data.type === "receita") saldo += valor;
      if (data.type === "despesa") saldo -= valor;
    }
  });

  return saldo;
}
