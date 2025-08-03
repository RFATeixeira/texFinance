"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../app/lib/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaPiggyBank } from "react-icons/fa";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { calcularSaldoContasInvisiveis } from "@/utils/saldoInvisivel";

export default function CardResultado({ mes, ano }: { mes: number; ano: number }) {
  const [resultado, setResultado] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [contasVisibilidadeMap, setContasVisibilidadeMap] = useState<Record<string, boolean>>({});

  // ✅ Obter ID do usuário logado
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribeAuth();
  }, []);

  // ✅ Escuta em tempo real das transações
  useEffect(() => {
    if (!userId) return;

    const transacoesRef = collection(db, "users", userId, "transacoes");

    const unsubscribe = onSnapshot(transacoesRef, async (snapshot) => {
      let receitas = 0;
      let despesas = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const dataTransacao = data.data?.toDate?.();
        const valor = Number(data.valor) || 0;
        const nomeConta = data.conta;
        const contaVisivel = nomeConta
          ? contasVisibilidadeMap[nomeConta] ?? true
          : true;

        if (
          contaVisivel &&
          dataTransacao &&
          dataTransacao.getMonth() === mes &&
          dataTransacao.getFullYear() === ano
        ) {
          if (data.type === "receita") receitas += valor;
          else if (data.type === "despesa") despesas += valor;
        }
      });

      const saldoInvisivel = await calcularSaldoContasInvisiveis(userId);
      setResultado(receitas - despesas - saldoInvisivel);
    });

    return () => unsubscribe();
  }, [userId, mes, ano, contasVisibilidadeMap]);

  return (
    <div className="mt-3 bg-white px-3 py-3 rounded-2xl drop-shadow-lg flex justify-between items-center">
      <div className="flex flex-row items-center gap-2">
        <div className="bg-gray-200 p-2 rounded-md">
          <FaPiggyBank className="text-gray-400" />
        </div>
        <p className="text-[0.8rem] text-gray-600 font-semibold">
          Resultado de{" "}
          <span className="text-gray-800 text-sm font-semibold">
            {dayjs().locale("pt-br").month(mes).format("MMMM")}
          </span>
        </p>
      </div>
      <p className="text-gray-600 font-bold text-[0.8rem]">
        R$ <span className="text-gray-800 text-lg">{resultado.toFixed(2)}</span>
      </p>
    </div>
  );
}
