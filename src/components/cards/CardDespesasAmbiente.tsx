"use client";

import { useEffect, useState } from "react";
import { db } from "../../app/lib/firebaseConfig";
import {
  collection,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import { FaDollarSign } from "react-icons/fa";

interface CardDespesasAmbienteProps {
  ambienteId: string;
  mes: number;
  ano: number;
  modo: "total" | "usuario";
  membro?: {
    uid: string;
    nome: string;
  };
}

export default function CardDespesasAmbiente({
  ambienteId,
  mes,
  ano,
  modo,
  membro,
}: CardDespesasAmbienteProps) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchDespesas = async () => {
      if (modo === "usuario" && !membro?.uid) return;
      if (!ambienteId) return;

      try {
        let soma = 0;

        if (modo === "usuario" && membro?.uid) {
          // Modo: despesas do membro específico
          const transacoesRef = collection(db, "users", membro.uid, "transacoes");
          const snapshot = await getDocs(transacoesRef);

          snapshot.forEach((doc) => {
            const data = doc.data();
            const dataTransacao = data.data?.toDate?.();

            const isDespesa = data.type === "despesa";
            const isMesEAno =
              dataTransacao &&
              dataTransacao.getMonth() === mes &&
              dataTransacao.getFullYear() === ano;

            if (isDespesa && isMesEAno) {
              const valor = Number(data.valor);
              if (!isNaN(valor)) soma += valor;
            }
          });
        }

        if (modo === "total") {
          // Modo: despesas de todos os membros do ambiente
          const membrosRef = collection(db, "ambiences", ambienteId, "membros");
          const membrosSnapshot = await getDocs(membrosRef);

          for (const membroDoc of membrosSnapshot.docs) {
            const membroData = membroDoc.data();
            const uid = membroData.uid;
            if (!uid) continue;

            const transacoesRef = collection(db, "users", uid, "transacoes");
            const transacoesSnapshot = await getDocs(transacoesRef);

            transacoesSnapshot.forEach((doc) => {
              const data = doc.data();
              const dataTransacao = data.data?.toDate?.();

              const isDespesa = data.type === "despesa";
              const isMesEAno =
                dataTransacao &&
                dataTransacao.getMonth() === mes &&
                dataTransacao.getFullYear() === ano;

              if (isDespesa && isMesEAno) {
                const valor = Number(data.valor);
                if (!isNaN(valor)) soma += valor;
              }
            });
          }
        }

        setTotal(soma);
      } catch (error) {
        console.error("Erro ao buscar despesas:", error);
      }
    };

    fetchDespesas();
  }, [ambienteId, mes, ano, modo, membro]);

  const titulo =
    modo === "total"
      ? "Despesas Totais"
      : `Despesas de ${membro?.nome ?? "Membro"}`;

  return (
    <div className="flex-1 bg-white p-3 rounded-2xl flex items-center gap-3 drop-shadow-lg">
      <div className="bg-red-100 p-2 rounded-md">
        <FaDollarSign className="text-red-600" />
      </div>
      <div>
        <p className="text-[0.7rem] text-gray-600 font-semibold">{titulo}</p>
        <p className="text-gray-800 font-bold text-sm">
          <span className="text-gray-600 text-[0.7rem]">R$ </span>
          {total.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
