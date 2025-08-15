"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import FiltroTransacoes from "../../components/filters/FiltroTransacoes";
import ListaTransacoes from "../../components/lists/ListaTransacoes";

export default function TransacoesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [ordemReversa, setOrdemReversa] = useState(true);
  const [periodoDias, setPeriodoDias] = useState(45);
  const [mesSelecionado, setMesSelecionado] = useState<string>("");
  const [mostrarCredito, setMostrarCredito] = useState(false);

  // Atualize userId
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
    return () => unsub();
  }, []);

  // Gera lista de meses para o filtro (últimos 12 meses)
  // Crie a função carregarTransacoes para buscar e atualizar
  async function carregarTransacoes() {
    if (!userId) return;

    const transacoesRef = collection(db, "users", userId, "transacoes");

    let qRef;
    if (mesSelecionado) {
      // Filtro por mês específico (YYYY-MM)
      const start = dayjs(mesSelecionado + "-01").startOf("month").toDate();
      const end = dayjs(mesSelecionado + "-01").endOf("month").toDate();
      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);
      qRef = query(
        transacoesRef,
        where("data", ">=", startTs),
        where("data", "<=", endTs),
        orderBy("data", ordemReversa ? "desc" : "asc")
      );
    } else {
      // Filtro por período em dias retroativos
      const dataLimite = Timestamp.fromDate(
        new Date(Date.now() - periodoDias * 24 * 60 * 60 * 1000)
      );
      qRef = query(
        transacoesRef,
        where("data", ">=", dataLimite),
        orderBy("data", ordemReversa ? "desc" : "asc")
      );
    }

    try {
      const snapshot = await getDocs(qRef);
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTransacoes(lista);
    } catch (e) {
      console.error('Erro ao carregar transações', e);
    }
  }

  // Use o useEffect para carregar as transações inicialmente e sempre que filtros mudarem
  useEffect(() => {
    carregarTransacoes();
  }, [userId, ordemReversa, periodoDias, mesSelecionado]);

  const categoriasInvestimento = [
    "aporte_investimento",
    "resgate_investimento",
    "resgate",
  ];

  // Helper para forçar tipo visual de transferência
  function mapTransferencias(transacoes: any[]): any[] {
    return transacoes
      .filter(
        (t: any) =>
          t.type === "transferencia" ||
          (t.categoria && categoriasInvestimento.includes(t.categoria))
      )
      .map((t: any) => ({ ...t, customType: "transferencia" }));
  }

  const receitas = useMemo(
    () =>
      transacoes.filter(
        (t) =>
          t.type === "receita" &&
          (!t.categoria || !categoriasInvestimento.includes(t.categoria))
      ),
    [transacoes]
  );
  // Filtro para despesas no crédito
  const isDespesaCredito = useCallback((t: any) => t.type === 'despesa' && !!t.cartaoId, []);

  const despesas = useMemo(
    () =>
      transacoes.filter(
        (t) =>
          t.type === "despesa" &&
          (!t.categoria || !categoriasInvestimento.includes(t.categoria)) &&
          !(t.categoria === "aporte_investimento" || t.categoria === "resgate_investimento" || t.categoria === "resgate") &&
          (mostrarCredito || !isDespesaCredito(t))
      ),
    [transacoes, mostrarCredito, isDespesaCredito]
  );
  const transferencias = useMemo(() => {
    // Agrupa por data, valor, contas e categoria para evitar duplicidade
    const unicos = new Map();
    mapTransferencias(transacoes).forEach(t => {
      const key = [
        t.data?.seconds || t.data,
        t.valor,
        t.contaOrigem,
        t.contaDestino,
        t.categoria
      ].join('-');
      // Prioriza a saída se houver duplicidade
      if (!unicos.has(key) || t.direcao === 'saida') {
        unicos.set(key, t);
      }
    });
    return Array.from(unicos.values());
  }, [transacoes]);
  const transacoesFiltradas = useMemo(() => {
    if (filtroTipo === "todos") {
      // Aplica filtro de crédito nas despesas
      return transacoes.filter((t) =>
        t.type !== "despesa" || (mostrarCredito || !isDespesaCredito(t))
      );
    }
    if (filtroTipo === "despesa") {
      return transacoes.filter(
        (t) =>
          t.type === "despesa" &&
          (!t.categoria || !categoriasInvestimento.includes(t.categoria)) &&
          !(t.categoria === "aporte_investimento" || t.categoria === "resgate_investimento" || t.categoria === "resgate") &&
          (mostrarCredito || !isDespesaCredito(t))
      );
    }
    return transacoes.filter((t) => t.type === filtroTipo);
  }, [filtroTipo, transacoes, mostrarCredito, isDespesaCredito]);

  // Gera lista de meses para o filtro (últimos 12 meses)
  const meses = useMemo(() => {
    const arr: { value: string; label: string }[] = [];
    const hoje = dayjs();
    for (let i = 0; i < 12; i++) {
      const d = hoje.subtract(i, "month");
      arr.push({
        value: d.format("YYYY-MM"),
        label: d.format("MMM/YYYY"),
      });
    }
    return arr;
  }, []);

  return (
    <div className="p-4 bg-white/97 text-gray-800 mb-20 w-full">
      <h1 className="text-xl font-semibold mb-4">Transações</h1>
      {/* Filtros responsivos */}
      {/* Desktop: dias, ordem, meses à esquerda; crédito à direita */}
      <div className="hidden md:flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FiltroTransacoes
            filtroTipo={filtroTipo}
            setFiltroTipo={setFiltroTipo}
            ordemReversa={ordemReversa}
            setOrdemReversa={setOrdemReversa}
            periodoDias={periodoDias}
            setPeriodoDias={setPeriodoDias}
            diasDesabilitado={!!mesSelecionado}
          />
          <select
            className="border-2 border-purple-500 p-2 rounded-2xl focus:outline-0 min-w-[140px]"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {meses.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`h-10 px-4 rounded-2xl border-2 text-sm font-medium transition ${mostrarCredito ? 'bg-purple-100 border-purple-400 text-purple-700' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
          onClick={() => setMostrarCredito(v => !v)}
        >
          Despesas no Crédito
        </button>
      </div>
      {/* Mobile: tipo, dias e ordem em cima; meses e crédito abaixo */}
      <div className="flex flex-col md:hidden gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FiltroTransacoes
            filtroTipo={filtroTipo}
            setFiltroTipo={setFiltroTipo}
            ordemReversa={ordemReversa}
            setOrdemReversa={setOrdemReversa}
            periodoDias={periodoDias}
            setPeriodoDias={setPeriodoDias}
            diasDesabilitado={!!mesSelecionado}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border-2 border-purple-500 p-2 rounded-2xl focus:outline-0 min-w-[140px]"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {meses.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            className={`h-10 px-4 rounded-2xl border-2 text-sm font-medium transition ml-auto ${mostrarCredito ? 'bg-purple-100 border-purple-400 text-purple-700' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
            onClick={() => setMostrarCredito(v => !v)}
          >
            Crédito
          </button>
        </div>
      </div>
      {/* Mobile: visão única filtrável */}
      <div className="md:hidden mt-6">
        <ListaTransacoes
          transacoes={transacoesFiltradas}
          onAtualizar={carregarTransacoes}
        />
      </div>
      {/* Desktop: três colunas, cada tipo */}
      <div className="hidden md:grid md:grid-cols-3 gap-6 mt-8">
        <div>
          <h2 className="text-base font-semibold mb-4 text-gray-800 text-center">
            Receitas
          </h2>
          <div className="bg-white/50 rounded-xl p-2">
            <ListaTransacoes
              transacoes={receitas}
              onAtualizar={carregarTransacoes}
            />
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold mb-4 text-gray-800 text-center">
            Despesas
          </h2>
          <div className="bg-white/50 rounded-xl p-2">
            <ListaTransacoes
              transacoes={despesas}
              onAtualizar={carregarTransacoes}
            />
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold mb-4 text-gray-800 text-center">
            Transferências
          </h2>
          <div className="bg-white/50 rounded-xl p-2">
            <ListaTransacoes
              transacoes={transferencias}
              onAtualizar={carregarTransacoes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
