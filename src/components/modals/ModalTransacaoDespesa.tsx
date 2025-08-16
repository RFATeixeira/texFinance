// DEPRECATED: substituído por TransactionModal e TransactionForm unificados.
// Arquivo mantido temporariamente para referência durante migração.

"use client";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "../../app/lib/firebaseConfig";
import {
  deleteDoc,
  doc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { FaTimes } from "react-icons/fa";
import { dateStringToTimestamp, timestampToDateInput } from "../../utils/date";

export default function ModalDespesa({
  transacao,
  onClose,
  onAtualizar,
}: {
  transacao: any;
  onClose: () => void;
  onAtualizar: () => void;
}) {
  const [valor, setValor] = useState(transacao.valor);
  const [conta, setConta] = useState(transacao.conta || "");
  const [data, setData] = useState(
    timestampToDateInput(transacao.data)
  );
  const [contas, setContas] = useState<any[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const buscarContas = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const contasRef = collection(db, "users", userId, "contas");
      const snapshot = await getDocs(contasRef);
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setContas(lista);
    };

    buscarContas();
  }, []);

  // Sincroniza estados quando abrir com outra transação
  useEffect(() => {
    setValor(transacao.valor);
    setConta(transacao.conta || "");
    setData(timestampToDateInput(transacao.data));
  }, [transacao]);

  const handleSalvar = async () => {
    try {
      const userId = auth.currentUser?.uid; // usar usuário autenticado
      if (!userId) throw new Error("Usuário não autenticado");
      if (!transacao?.id) throw new Error("Transação sem ID");

      const ref = doc(db, "users", userId, "transacoes", transacao.id);
      await updateDoc(ref, {
        valor: parseFloat(String(valor)) || 0,
        conta: conta || null,
        data: dateStringToTimestamp(data),
      });
      onAtualizar();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    }
  };

  const handleExcluir = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error("Usuário não autenticado");

      await deleteDoc(doc(db, "users", userId, "transacoes", transacao.id));
      onAtualizar();
      onClose();
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="relative bg-white p-6 rounded-lg w-[90%] max-w-md space-y-4 drop-shadow-2xl"
      >
        <div className="flex flex-row justify-between items-center">
          <h2 className="text-xl font-bold">Editar Despesa</h2>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Fechar"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <label className="block text-md">
          Valor
          <input
            type="number"
            className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0"
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
          />
        </label>

        <label className="block text-md">
          Conta
          <select
            className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0"
            value={conta}
            onChange={(e) => setConta(e.target.value)}
          >
            <option value="">Selecione uma conta</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-md">
          Data
          <input
            type="date"
            className="appearance-none w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </label>

        <div className="flex justify-between pt-4">
          <div className="space-x-2 w-full justify-between flex flex-row">
            <button
              onClick={handleExcluir}
              className="w-full bg-red-500 text-white py-2 rounded-2xl hover:bg-red-600"
            >
              Apagar
            </button>

            <button
              onClick={handleSalvar}
              className="w-full bg-purple-500 text-white py-2 rounded-2xl hover:bg-purple-600"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
