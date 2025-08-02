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
  DocumentData,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Props = {
  onAdd: () => void;
};

export default function ContasList({ onAdd }: Props) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [contaSelecionada, setContaSelecionada] = useState<Conta | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setContas([]);
        setTransacoes([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const contasRef = query(collection(db, "users", user.uid, "contas"));
      const transacoesRef = query(collection(db, "users", user.uid, "transacoes"));

      const unsubscribeContas = onSnapshot(contasRef, (querySnapshot) => {
        const contasData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Conta[];
        setContas(contasData);
        setLoading(false);
      });

      const unsubscribeTransacoes = onSnapshot(transacoesRef, (querySnapshot) => {
        const transacoesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transacao[];
        setTransacoes(transacoesData);
      });

      return () => {
        unsubscribeContas();
        unsubscribeTransacoes();
      };
    });

    return () => unsubscribe();
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
            const saldo = calcularSaldo(conta.id);
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
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                      <FaWallet className="text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Conta bancária</p>
                      <p className="text-sm font-semibold text-gray-800">Conta {conta.nome}</p>
                    </div>
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

      {/* Modal dentro do JSX retornado */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Conta"
      >
        {contaSelecionada && (
          <>
            {console.log('Renderizando form', contaSelecionada)}
            <form
              style={{ backgroundColor: 'white', padding: '10px' }}
              onSubmit={(e) => {
                e.preventDefault();
                // Aqui você pode implementar a atualização no Firestore
                setEditModalOpen(false);
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
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Salvar
              </button>
            </form>
          </>
        )}
      </Modal>
    </>
  );
}
