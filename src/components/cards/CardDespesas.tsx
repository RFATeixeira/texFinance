"use client";

import { useEffect, useState, startTransition } from "react";
import { auth, db } from "../../app/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaDollarSign } from "react-icons/fa";
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { formatarValorVisibilidade } from "@/utils/saldoInvisivel";

export default function CardDespesas({ mes, ano }: { mes: number; ano: number }) {
  const [total, setTotal] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [mostrarValores, setMostrarValores] = useState(true);

  // Escuta o usuário autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem("mostrarValores") : null;
    if (stored !== null) setMostrarValores(stored === "true");
    function handler(e: any) { startTransition(() => setMostrarValores(!!e.detail?.visivel)); }
    window.addEventListener("visibilidade-valores", handler as any);
    return () => window.removeEventListener("visibilidade-valores", handler as any);
  }, []);

  // Busca despesas após obter userId
  useEffect(() => {
    const fetchDespesas = async () => {
      if (!userId) return;

      try {
        const ref = collection(db, "users", userId, "transacoes");
        const snapshot = await getDocs(ref);

        let soma = 0;

        snapshot.forEach((doc) => {
          const data: any = doc.data();
          const dataTransacao = data.data?.toDate?.();
          const categoriasIgnoradas = [
            'aporte_investimento',
            'resgate_investimento',
            'resgate'
          ];
          if(!dataTransacao) return;
          if(dataTransacao.getMonth()!==mes || dataTransacao.getFullYear()!==ano) return;
          if(data.type !== 'despesa') return;
          // Ignora compras feitas via cartão (cartaoId presente); considera apenas o pagamento de fatura (categoria pagamento_cartao ou tipoEspecial)
          if(data.cartaoId) return;
          // Ignora transferências para investimento (aporte_investimento) e transferências de despesa com contaDestino
          if((data.categoria && categoriasIgnoradas.includes(data.categoria)) || (data.categoria === 'aporte_investimento' && data.contaDestino)) return;
          soma += Number(data.valor)||0;
        });

        setTotal(soma);
      } catch (error) {
        console.error("Erro ao buscar despesas:", error);
      }
    };

    fetchDespesas();
  }, [userId, mes, ano]);

  return (
  <div className="flex-1 bg-white p-3 rounded-2xl flex items-center gap-3 drop-shadow-lg md:h-24">
      <div className="bg-red-100 p-2 rounded-md">
        <FaDollarSign className="text-red-600" />
      </div>
      <div>
  <p className="text-[0.7rem] text-gray-600 font-semibold">Despesas de <span className="font-bold text-gray-900">{dayjs().locale('pt-br').month(mes).format('MMM')}</span></p>
        <p className="text-gray-800 font-bold text-sm">
          <span className="text-gray-600 text-[0.7rem]">R$ </span>
          {formatarValorVisibilidade(total, mostrarValores)}
        </p>
      </div>
    </div>
  );
}
