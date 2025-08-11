"use client";

import { useEffect, useState, startTransition } from "react";
import { auth, db } from "../../app/lib/firebaseConfig";
import { collection, onSnapshot, query, where, getDocs, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaPiggyBank } from "react-icons/fa";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { formatarValorVisibilidade } from "@/utils/saldoInvisivel";

export default function CardResultado({ mes, ano }: { mes: number; ano: number }) {
  const [resultado, setResultado] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [contasVisibilidadeMap, setContasVisibilidadeMap] = useState<Record<string, boolean>>({});
  const [mostrarValores, setMostrarValores] = useState(true);
  const [resultadoInterno, setResultadoInterno] = useState<number | null>(null); // para trigger de saldo inicial
  const [monthKey, setMonthKey] = useState<string>('');

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

      snapshot.forEach((doc) => {
        const data: any = doc.data();
        const dataTransacao: Date | undefined = data.data?.toDate?.();
        const valor = Number(data.valor) || 0;
        const nomeConta = data.conta;
        const contaVisivel = nomeConta ? contasVisibilidadeMap[nomeConta] ?? true : true;
        // Mantém ignoradas para RECEITAS/DESPESAS históricas; transferências de investimento tratadas separadamente abaixo
        const categoriasIgnoradas = [
          'aporte_investimento',
          'resgate_investimento',
          'resgate'
        ];

        if (!dataTransacao) return;

        const tMes = dataTransacao.getMonth();
        const tAno = dataTransacao.getFullYear();
        if (tMes !== mes || tAno !== ano) return;

        // Regras:
        // 1. Compras no cartão (despesas com cartaoId) NÃO entram no resultado (somente quando a fatura é paga).
        // 2. Pagamento de fatura entra como despesa.
        const isCompraCartao = data.type === 'despesa' && !!data.cartaoId;
        const isPagamentoFatura = data.type === 'despesa' && (data.categoria === 'pagamento_cartao' || data.tipoEspecial === 'pagamentoCartao' || !!data.cartaoPagamentoId);

        // RECEITAS
        if (data.type === 'receita') {
          if (data.categoria && categoriasIgnoradas.includes(data.categoria)) return; // ignora legados de investimento que eram receita
          if (!contaVisivel) return;
          receitasAtual += valor;
          return;
        }

        // DESPESAS
        if (data.type === 'despesa') {
          if (!contaVisivel) return;
          if (isCompraCartao && !isPagamentoFatura) return; // ignora compra de cartão até pagar fatura
          if ((data.categoria && categoriasIgnoradas.includes(data.categoria)) || (data.categoria === 'aporte_investimento' && data.contaDestino)) return;
          despesasAtual += valor;
          return;
        }

        // TRANSFERÊNCIAS (novo ajuste):
        // Aporte para investimento (categoria 'aporte_investimento') impacta negativamente o resultado (como se fosse uma "despesa").
        // Resgate de investimento (categoria 'resgate_investimento') impacta positivamente (como se fosse uma "receita").
        if (data.type === 'transferencia') {
          if (data.categoria === 'aporte_investimento') {
            despesasAtual += valor; // trata como saída
          } else if (data.categoria === 'resgate_investimento') {
            receitasAtual += valor; // trata como entrada
          }
        }
      });

  const res = receitasAtual - despesasAtual;
  setResultado(res);
  setResultadoInterno(res); // separar para efeito de saldo inicial
  const key = `${ano}-${String(mes+1).padStart(2,'0')}`;
  setMonthKey(key);
    });

    return () => unsubscribe();
  }, [userId, mes, ano, contasVisibilidadeMap]);

  // Efeito para criar/atualizar Saldo inicial do mês seguinte baseado no resultado calculado
  useEffect(() => {
    if (resultadoInterno === null) return;
    if (!userId) return;
    if (!monthKey) return;

    // Baseline logic: só sincroniza se resultado mudou em relação ao baseline armazenado.
    const baselineKey = `baseline-saldo-resultado-${monthKey}`;
    let stored: string | null = null;
    if (typeof window !== 'undefined') {
      stored = localStorage.getItem(baselineKey);
    }
    const resNumber = resultadoInterno;
    // Se não havia baseline ainda, cria baseline e não sincroniza (apenas visualização / navegação inicial)
    if (stored === null) {
      if (typeof window !== 'undefined') localStorage.setItem(baselineKey, String(resNumber));
      return;
    }
    const prevNumber = Number(stored);
    if (prevNumber === resNumber) return; // sem mudança real

    // Atualiza baseline e segue para sincronizar saldo inicial do mês seguinte
    if (typeof window !== 'undefined') localStorage.setItem(baselineKey, String(resNumber));

    const origemMes = mes; // 0-based
    const origemAno = ano;
    let targetMes = origemMes + 1;
    let targetAno = origemAno;
    if (targetMes > 11) { targetMes = 0; targetAno += 1; }
    const origemKey = monthKey; // já calculado
    const targetDate = new Date(targetAno, targetMes, 1, 12, 0, 0);

    const run = async () => {
      try {
        const col = collection(db, 'users', userId, 'transacoes');
        const q = query(col, where('tipoEspecial', '==', 'saldoInicial'), where('saldoInicialDe', '==', origemKey));
        const snap = await getDocs(q);
        const existente = snap.docs[0];
        if (!resNumber || resNumber === 0) {
          if (existente) await deleteDoc(existente.ref);
          return;
        }
        const positivo = resNumber > 0;
        const valorAbs = Math.abs(resNumber);
        const baseDados: any = {
          valor: valorAbs,
            data: Timestamp.fromDate(targetDate),
            descricao: 'Saldo inicial',
            categoria: 'saldo_inicial',
            tipoEspecial: 'saldoInicial',
            saldoInicialDe: origemKey,
            updatedAt: Timestamp.now(),
        };
        if (existente) {
          const prev = existente.data();
          const precisaUpdate = prev.valor !== valorAbs || prev.type !== (positivo ? 'receita':'despesa');
          if (precisaUpdate) {
            await updateDoc(existente.ref, { ...baseDados, type: positivo ? 'receita':'despesa' });
          }
        } else {
          await addDoc(col, { ...baseDados, type: positivo ? 'receita':'despesa' });
        }
      } catch (e) {
        console.error('Erro ao sincronizar Saldo inicial', e);
      }
    };
    run();
  }, [resultadoInterno, userId, monthKey, mes, ano]);

  useEffect(()=>{
    const stored = typeof window!== 'undefined' ? localStorage.getItem('mostrarValores') : null;
    if(stored!==null) setMostrarValores(stored==='true');
    function handler(e: any){ startTransition(()=> setMostrarValores(!!e.detail?.visivel)); }
    window.addEventListener('visibilidade-valores', handler as any);
    return ()=> window.removeEventListener('visibilidade-valores', handler as any);
  }, []);

  return (
  <div className="mt-3 md:mt-0 bg-white px-3 py-3 rounded-2xl drop-shadow-lg flex justify-between items-center md:h-24">
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
