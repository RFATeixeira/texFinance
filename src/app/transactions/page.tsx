"use client";

import { useEffect, useState, useMemo } from "react";
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

  // Atualize userId
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
    return () => unsub();
  }, []);

  // Crie a função carregarTransacoes para buscar e atualizar
  async function carregarTransacoes() {
    if (!userId) return;

    const dataLimite = Timestamp.fromDate(
      new Date(Date.now() - periodoDias * 24 * 60 * 60 * 1000)
    );

    const transacoesRef = collection(db, "users", userId, "transacoes");
    const q = query(
      transacoesRef,
      where("data", ">=", dataLimite),
      orderBy("data", ordemReversa ? "desc" : "asc")
    );

    const snapshot = await getDocs(q);
    const lista = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTransacoes(lista);
  }

  // Use o useEffect para carregar as transações inicialmente e sempre que filtros mudarem
  useEffect(() => {
    carregarTransacoes();
  }, [userId, ordemReversa, periodoDias]);

  const transacoesFiltradas = useMemo(() => {
    if (filtroTipo === "todos") return transacoes;
    return transacoes.filter((t) => t.type === filtroTipo);
  }, [filtroTipo, transacoes]);

  return (
    <div className="p-4 bg-white/97 text-gray-800 mb-20 w-full">
      <h1 className="text-xl font-semibold mb-4">Transações</h1>
      <div>
      <FiltroTransacoes
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
        ordemReversa={ordemReversa}
        setOrdemReversa={setOrdemReversa}
        periodoDias={periodoDias}
        setPeriodoDias={setPeriodoDias}
      />
      <ListaTransacoes
        transacoes={transacoesFiltradas}
        onAtualizar={carregarTransacoes} // passe a função que de fato recarrega as transações
      />
      </div>
    </div>
  );
}
