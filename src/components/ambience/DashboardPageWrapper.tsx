"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "../../components/Header";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

import FiltroTransacoes from "../filters/FiltroTransacoes";
import DespesasPorUsuarioList from "@/components/lists/DespesasPorUsuarioList";

import { db, auth } from "../../app/lib/firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CardDespesasAmbiente from "../cards/CardDespesasAmbiente";

interface Transacao {
  id: string;
  type: string;
  valor: number | string;
  data?: any;
  uid?: string;
  [key: string]: any;
}

export default function DashBoardPageWrapper({ ambienteId }: { ambienteId: string }) {
  dayjs.locale("pt-br");

  const months = useMemo(() => {
    const today = dayjs();
    return [
      today.subtract(2, "month"),
      today.subtract(1, "month"),
      today,
      today.add(1, "month"),
      today.add(2, "month"),
    ];
  }, []);

  const [currentIndex, setCurrentIndex] = useState(2);
  const [membros, setMembros] = useState<{ uid: string; nome: string }[]>([]);
  const [despesasPorMembro, setDespesasPorMembro] = useState<Record<string, Transacao[]>>({});
  const [user, setUser] = useState<any>(null);

  

  // Filtros adicionais
  const [usuarioSelecionado, setUsuarioSelecionado] = useState("todos");
  const [diasFiltro, setDiasFiltro] = useState(30);
  const [ordemReversa, setOrdemReversa] = useState(false);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < months.length - 1) setCurrentIndex(currentIndex + 1);
  };

  async function buscarDespesasUsuario(uid: string, mes: number, ano: number): Promise<Transacao[]> {
    const transacoesRef = collection(db, "users", uid, "transacoes");
    const transacoesSnap = await getDocs(transacoesRef);

    const todasTransacoes: Transacao[] = transacoesSnap.docs
      .map((doc) => {
        const data = doc.data();
        if (typeof data.type === "string" && (data.valor !== undefined || data.valor !== null)) {
          return {
            id: doc.id,
            ...data,
          } as Transacao;
        }
        return null;
      })
      .filter((t): t is Transacao => t !== null);

    return todasTransacoes.filter((d) => {
      if (d.type !== "despesa") return false;

      const data = d.data?.toDate ? d.data.toDate() : d.data;
      if (!data || !(data instanceof Date)) return false;

      return data.getMonth() === mes && data.getFullYear() === ano;
    });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setMembros([]);
        setDespesasPorMembro({});
        return;
      }
      
      const membrosSnapshot = await getDocs(collection(db, "ambiences", ambienteId, "membros"));
      const membrosData = membrosSnapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

      const membrosComNome = await Promise.all(
        membrosData.map(async (membro) => {
          try {
            const userDocRef = doc(db, "users", membro.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              return { uid: membro.uid, nome: userDocSnap.data().nome || "Sem nome" };
            }
            return { uid: membro.uid, nome: "Sem nome" };
          } catch {
            return { uid: membro.uid, nome: "Erro ao carregar" };
          }
        })
      );
      setMembros(membrosComNome);

      const mes = months[currentIndex].month();
      const ano = months[currentIndex].year();

      const despesasMap: Record<string, Transacao[]> = {};

      for (const membro of membrosComNome) {
        const despesasUsuario = await buscarDespesasUsuario(membro.uid, mes, ano);
        despesasMap[membro.uid] = despesasUsuario;
      }

      setDespesasPorMembro(despesasMap);
    });

    return () => unsubscribe();
  }, [ambienteId, currentIndex]);

  // Aplicar filtros
  const agora = dayjs();
  const dataLimite = agora.subtract(diasFiltro, "day");

  const despesasFiltradas: Record<string, Transacao[]> = {};
  Object.entries(despesasPorMembro).forEach(([uid, despesas]) => {
    if (usuarioSelecionado !== "todos" && uid !== usuarioSelecionado) return;

    const despesasValidas = despesas.filter((d) => {
      const data = d.data?.toDate ? dayjs(d.data.toDate()) : dayjs(d.data);
      return data.isAfter(dataLimite);
    });

     const despesasOrdenadas = despesasValidas.sort((a, b) => {
     const dataA = dayjs(a.data?.toDate?.() ?? a.data);
     const dataB = dayjs(b.data?.toDate?.() ?? b.data);
     return ordemReversa
        ? dataA.valueOf() - dataB.valueOf()
       : dataB.valueOf() - dataA.valueOf();
    });

    despesasFiltradas[uid] = despesasOrdenadas;
  });

  return (
    <div className="min-h-screen bg-white/97 pb-24 px-4">
      <Header />

      {/* Seletor de Meses */}
      <section className="bg-white h-10 mt-6 px-4 rounded-2xl flex items-center justify-between drop-shadow-lg">
        <div className="flex gap-4 justify-center items-center w-full">
          {[-1, 0, 1].map((offset) => {
            const index = currentIndex + offset;
            const isSelected = offset === 0;
            if (index < 0 || index >= months.length) return null;

            const handleClick = () => {
              if (offset === -1) handlePrev();
              if (offset === 1) handleNext();
            };

            return (
              <span
                key={index}
                onClick={!isSelected ? handleClick : undefined}
                className={`h-10 px-4 flex items-center py-1 rounded-3xl cursor-pointer transition ${
                  isSelected
                    ? "text-gray-800 text-md font-semibold bg-gray-100 cursor-default"
                    : "text-gray-400 hover:text-gray-600 text-sm"
                }`}
              >
                {months[index].format("MMM/YY")}
              </span>
            );
          })}
        </div>
      </section>

      {/* Cards de Despesas */}
      <div className="flex flex-col gap-2 mt-6">
        <div>
          <CardDespesasAmbiente
            ambienteId={ambienteId}
            mes={months[currentIndex].month()}
            ano={months[currentIndex].year()}
            modo="total"
          />
        </div>
        <div className="flex flex-row gap-2">
          {membros.map((membro) => (
            <div key={membro.uid} className="w-full">
              <CardDespesasAmbiente
                ambienteId={ambienteId}
                mes={months[currentIndex].month()}
                ano={months[currentIndex].year()}
                modo="usuario"
                membro={{ uid: membro.uid, nome: membro.nome }}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6">
        <FiltroTransacoes
         ordemReversa={ordemReversa}
         setOrdemReversa={setOrdemReversa}
         periodoDias={diasFiltro}
         setPeriodoDias={setDiasFiltro}
         membros={membros}
         usuarioSelecionado={usuarioSelecionado}
         setUsuarioSelecionado={setUsuarioSelecionado}
       />
      </div>

      {/* Lista detalhada */}
      <div className="mt-2">
        <DespesasPorUsuarioList
          despesasPorUsuario={despesasFiltradas}
          nomesUsuarios={Object.fromEntries(membros.map((m) => [m.uid, m.nome]))}
          ordemDesc={ordemReversa}
          ambienteAtual={ambienteId}
        />
      </div>
    </div>
  );
}
