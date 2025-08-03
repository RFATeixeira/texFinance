"use client";

import { useState, useEffect } from "react";
import { Conta, Transacao } from "@/app/types/types";
import { FaPlus, FaWallet } from "react-icons/fa";

import Modal from "@/components/ui/Modal";

import { db, auth } from "../../app/lib/firebaseConfig";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Props = {
  onAdd: () => void;
};

export function calcularSaldo(transacoes: Transacao[], contaId: string): number {
  const receitas = transacoes.filter(t => t.type === "receita" && t.conta === contaId);
  const despesas = transacoes.filter(t => t.type === "despesa" && t.conta === contaId);
  const transferenciasEnviadas = transacoes.filter(t => t.type === "transferencia" && t.contaOrigem === contaId);
  const transferenciasRecebidas = transacoes.filter(t => t.type === "transferencia" && t.contaDestino === contaId);

  const soma = (lista: Transacao[]) =>
    lista.reduce((acc, t) => acc + Number(t.valor || 0), 0);

  return soma(receitas) - soma(despesas) - soma(transferenciasEnviadas) + soma(transferenciasRecebidas);
}

export default function ContasList({ onAdd }: Props) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [contaSelecionada, setContaSelecionada] = useState<Conta | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
  let unsubscribeContas = () => {};
  let unsubscribeTransacoes = () => {};

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) {
      setContas([]);
      setTransacoes([]);
      setUserUid(null);
      setLoading(false);
      return;
    }

    setUserUid(user.uid);
    setLoading(true);

    const contasRef = query(collection(db, "users", user.uid, "contas"));
    const transacoesRef = query(collection(db, "users", user.uid, "transacoes"));

    unsubscribeContas = onSnapshot(contasRef, (querySnapshot) => {
      const contasData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Conta[];
      setContas(contasData);
      setLoading(false);
    });

    unsubscribeTransacoes = onSnapshot(transacoesRef, (querySnapshot) => {
      const transacoesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transacao[];
      setTransacoes(transacoesData);
    });
  });

  return () => {
    unsubscribeAuth(); // Encerra escuta de auth
    unsubscribeContas(); // Encerra escuta de contas
    unsubscribeTransacoes(); // Encerra escuta de transações
  };
}, []);

  const calcularSaldo = (contaId: string) => {
  const receitas = transacoes.filter(t => t.type === "receita" && t.conta === contaId);
  const despesas = transacoes.filter(t => t.type === "despesa" && t.conta === contaId);
  const transferenciasEnviadas = transacoes.filter(t => t.type === "transferencia" && t.contaOrigem === contaId);
  const transferenciasRecebidas = transacoes.filter(t => t.type === "transferencia" && t.contaDestino === contaId);

  const soma = (lista: Transacao[]) =>
    lista.reduce((acc, t) => acc + Number(t.valor || 0), 0);

  const total =
    soma(receitas) -
    soma(despesas) -
    soma(transferenciasEnviadas) +
    soma(transferenciasRecebidas);

  return total;
};

  const salvarAlteracoesConta = async () => {
    if (!contaSelecionada || !userUid) return;

    const docRef = doc(db, "users", userUid, "contas", contaSelecionada.id);
    await updateDoc(docRef, {
      nome: contaSelecionada.nome,
      visivelNoSaldo: contaSelecionada.visivelNoSaldo ?? true,
    });
    setEditModalOpen(false);
  };

  const excluirConta = async () => {
    if (!contaSelecionada || !userUid) return;

    const docRef = doc(db, "users", userUid, "contas", contaSelecionada.id);
    await deleteDoc(docRef);
    setEditModalOpen(false);
  };

  return (
    <>
      <section className="mt-4 px-3 py-3 gap-3 flex flex-col bg-white rounded-2xl drop-shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-2 items-center">
            <FaWallet className="text-purple-400" />
            <h2 className="text-md font-semibold text-gray-800">Minhas contas</h2>
          </div>
          <button onClick={onAdd} className="text-purple-400 text-md">
            <FaPlus />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Carregando contas...</p>
        ) : contas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conta cadastrada.</p>
        ) : (
          contas.map((conta) => {
            const saldo = calcularSaldo(conta.id); // ✅ sempre calcula
            return (
              <div
                key={conta.id}
                className="bg-gray-50 p-4 rounded-xl text-gray-800 cursor-pointer hover:bg-purple-50 transition"
                onClick={() => {
                  setContaSelecionada(conta);
                  setEditModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 w-full justify-between">
                    <div className="flex flex-row gap-2">
                     <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                       <FaWallet className="text-purple-500" />
                     </div>
                     <div>
                        <p className="text-xs text-gray-500">Conta bancária</p>
                        <p className="text-sm font-semibold text-gray-800">Conta {conta.nome}</p>
                     </div>
                    </div>
                    {conta.visivelNoSaldo === false && (
                     <p className="text-xs text-end text-gray-400 italic">Oculta no saldo</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">Saldo atual</p>
                  <p className="text-sm font-bold text-gray-800">
                    R$ {saldo.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </section>

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Conta"
      >
        {contaSelecionada && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              salvarAlteracoesConta();
            }}
          >
            <label className="text-sm">Nome da conta</label>
            <input
              type="text"
              value={contaSelecionada.nome}
              onChange={(e) =>
                setContaSelecionada({ ...contaSelecionada, nome: e.target.value })
              }
              className="w-full border-2 border-purple-500 p-2 rounded-2xl my-2 focus:outline-0"
            />

            <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-4">
             <input
               type="checkbox"
               id="visivel-no-saldo"
               className="peer hidden"
               checked={contaSelecionada.visivelNoSaldo ?? true}
               onChange={(e) =>
                 setContaSelecionada({
                   ...contaSelecionada,
                   visivelNoSaldo: e.target.checked,
                 })
               }
             />
             <label
               htmlFor="visivel-no-saldo"
               className="w-5 h-5 border-2 border-purple-500 rounded-md flex items-center justify-center peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-colors cursor-pointer"
             >
               <svg
                 className="w-3 h-3 text-white hidden peer-checked:block"
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="3"
                 viewBox="0 0 24 24"
                >
                 <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
               </svg>
              </label>
             <label htmlFor="visivel-no-saldo" className="cursor-pointer">
               Mostrar no saldo total
              </label>
            </div>

            <div className="mt-4 gap-2 flex justify-between">
              <button
                type="button"
                className="text-white px-4 py-2 rounded-2xl w-full bg-red-500 hover:bg-red-600"
                onClick={excluirConta}
              >
                 Apagar
              </button>
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded-2xl w-full hover:bg-purple-700"
              >
                Salvar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
