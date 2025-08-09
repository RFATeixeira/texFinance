"use client";

import { useEffect, useState, startTransition } from "react";
import { auth, db } from "../../app/lib/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaPiggyBank } from "react-icons/fa";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { calcularSaldoContasInvisiveis, formatarValorVisibilidade } from "@/utils/saldoInvisivel";

export default function CardResultado({ mes, ano }: { mes: number; ano: number }) {
  const [resultado, setResultado] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [contasVisibilidadeMap, setContasVisibilidadeMap] = useState<Record<string, boolean>>({});
  const [mostrarValores, setMostrarValores] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const transacoesRef = collection(db, "users", userId, "transacoes");

    const unsubscribe = onSnapshot(transacoesRef, async (snapshot) => {
      let receitasAtual = 0;
      let despesasAtual = 0;
      let receitasAnterior = 0;
      let despesasAnterior = 0;

      const mesAnterior = mes === 0 ? 11 : mes - 1;
      const anoAnterior = mes === 0 ? ano - 1 : ano;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const dataTransacao = data.data?.toDate?.();
        const valor = Number(data.valor) || 0;
        const nomeConta = data.conta;
        const contaVisivel = nomeConta ? contasVisibilidadeMap[nomeConta] ?? true : true;

        if (!contaVisivel || !dataTransacao) return;

        const tMes = dataTransacao.getMonth();
        const tAno = dataTransacao.getFullYear();

        if (tMes === mes && tAno === ano) {
          if (data.type === "receita") receitasAtual += valor;
          else if (data.type === "despesa") despesasAtual += valor;
        } else if (tMes === mesAnterior && tAno === anoAnterior) {
          if (data.type === "receita") receitasAnterior += valor;
          else if (data.type === "despesa") despesasAnterior += valor;
        }
      });

      // Calcular saldo invisível de cada período separadamente para não reimpactar meses anteriores
      const saldoInvisivelAtual = await calcularSaldoContasInvisiveis(userId, mes, ano);
      const saldoInvisivelAnterior = await calcularSaldoContasInvisiveis(userId, mesAnterior, anoAnterior);

      const resultadoAtual = receitasAtual - despesasAtual - saldoInvisivelAtual;
      const resultadoAnterior = receitasAnterior - despesasAnterior - saldoInvisivelAnterior;

      setResultado(resultadoAtual + resultadoAnterior);
    });

    return () => unsubscribe();
  }, [userId, mes, ano, contasVisibilidadeMap]);

  useEffect(()=>{
    const stored = typeof window!== 'undefined' ? localStorage.getItem('mostrarValores') : null;
    if(stored!==null) setMostrarValores(stored==='true');
    function handler(e: any){ startTransition(()=> setMostrarValores(!!e.detail?.visivel)); }
    window.addEventListener('visibilidade-valores', handler as any);
    return ()=> window.removeEventListener('visibilidade-valores', handler as any);
  }, []);

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
        R$ <span className="text-gray-800 text-lg">{formatarValorVisibilidade(resultado, mostrarValores)}</span>
      </p>
    </div>
  );
}
