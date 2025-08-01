"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../app/lib/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaPiggyBank } from "react-icons/fa";
import dayjs from "dayjs";
import "dayjs/locale/pt-br"; // traduzir mês

export default function CardResultado({ mes, ano }: { mes: number; ano: number }) {
  const [resultado, setResultado] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const ref = collection(db, "users", userId, "transacoes");

    const unsubscribeSnapshot = onSnapshot(ref, (snapshot) => {
      let receitas = 0;
      let despesas = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const dataTransacao = data.data?.toDate?.();
        const valor = Number(data.valor) || 0;

        if (dataTransacao && dataTransacao.getMonth() === mes && dataTransacao.getFullYear() === ano) {
          if (data.type === "receita") receitas += valor;
          if (data.type === "despesa") despesas += valor;
        }
      });

      setResultado(receitas - despesas);
    });

    return () => unsubscribeSnapshot();
  }, [userId, mes, ano]);

  return (
    <div className="mt-3 bg-white px-3 py-3 rounded-2xl drop-shadow-lg flex justify-between items-center">
      <div className="flex flex-row items-center gap-2">
        <div className="bg-gray-200 p-2 rounded-md">
          <FaPiggyBank className="text-gray-400" />
        </div>
        <p className="text-[0.8rem] text-gray-600 font-semibold">
          Resultado de <span className="text-gray-800 text-sm font-semibold">
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
