"use client";

import { useState, useEffect } from "react";
import { db, auth } from "../../app/lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Cartao } from "../../app/types/types";
import { FaTimes } from "react-icons/fa";

type AddCartaoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: Cartao) => void;
};

export default function AddCartaoModal({ isOpen, onClose, onSave }: AddCartaoModalProps) {
  const [userId, setUserId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [bandeira, setBandeira] = useState("");
  const [limite, setLimite] = useState<number>(0);
  const [diaFechamento, setDiaFechamento] = useState<number>(1);
  const [diaVencimento, setDiaVencimento] = useState<number>(1);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        console.log("Usuário autenticado:", user.uid);
      } else {
        setUserId(null);
        console.warn("Nenhum usuário autenticado");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!userId) {
      alert("Você precisa estar autenticado para salvar um cartão.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "users", userId, "cartoesCredito"), {
        nome,
        bandeira,
        limite,
        diaFechamento,
        diaVencimento,
        criadoEm: new Date(),
      });

      console.log("Cartão salvo com sucesso.");

      // Notifica o componente pai que salvou um novo cartão
      if (onSave) {
        onSave({
          nome,
          bandeira,
          limite,
          diaFechamento,
          diaVencimento,
          id: docRef.id, // id do documento salvo no Firestore
        });
      }

      // Resetar campos e fechar modal
      setNome("");
      setBandeira("");
      setLimite(0);
      setDiaFechamento(1);
      setDiaVencimento(1);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar cartão:", error);
      alert("Erro ao salvar cartão. Verifique as permissões e tente novamente.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 backdrop-blur-xs flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl p-6 w-[90%] max-w-md shadow-lg text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 cursor-pointer"
          >
          <FaTimes />
        </button>
        <h2 className="text-xl font-semibold mb-4">Adicionar cartão</h2>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Nome</p>
            <input
              type="text"
              placeholder="Nome"
              className="w-full border-2 border-purple-500 px-3 py-2 rounded-2xl focus:outline-0"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div>
            <p className="text-sm font-semibold">Bandeira</p>
            <input
              type="text"
              placeholder="Bandeira (ex: Visa, Master)"
              className="w-full border-2 border-purple-500 px-3 py-2 rounded-2xl focus:outline-0"
              value={bandeira}
              onChange={(e) => setBandeira(e.target.value)}
            />
          </div>
          <div>
            <p className="text-sm font-semibold">Limite</p>
            <input
              type="number"
              placeholder="Limite"
              className="w-full border-2 border-purple-500 px-3 py-2 rounded-2xl focus:outline-0"
              value={limite}
              onChange={(e) => setLimite(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-row gap-2">
            <div className="w-1/2">
              <p className="text-sm font-semibold">Dia do fechamento</p>
              <input
                type="number"
                placeholder="1-31"
                className="w-full border-2 border-purple-500 px-3 py-2 rounded-2xl focus:outline-0"
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(Number(e.target.value))}
              />
            </div>
            <div className="w-1/2">
              <p className="text-sm font-semibold">Dia do vencimento</p>
              <input
                type="number"
                placeholder="1-31"
                className="w-full border-2 border-purple-500 px-3 py-2 rounded-2xl focus:outline-0"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-5 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 w-full rounded-2xl hover:bg-gray-400 transition duration-300 "
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-purple-500 w-full text-white rounded-2xl hover:bg-purple-600 transition duration-200"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
