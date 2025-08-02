"use client";

import { useState, useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "../../app/lib/firebaseConfig"; // ajuste o caminho se necessário

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const EMOJIS = [
  "🦷", "⚡", "💧", "📁", "💰", "🍔", "🍕", "🏠", "🚗", "🛍️", "🧾", "📦", "📚", "💵",
  "💶", "💷", "💳", "💹", "🪙", "💴", "💸", "🏦", "⛱️", "❄️", "🛋️", "🛁", "🧻", "🌹", "🍉",
  "🍇", "🍷", "🍺", "🍹", "🍫", "🥖", "📉", "📊", "💡", "🚬", "💊", "🧱", "🔊", "🎮", "🎱",
  "⚽", "🏀", "👖", "🥼", "🎁", "🎉"
];

export default function AddAmbienteModal({ isOpen, onClose }: Props) {
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("🌿");
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!nome.trim()) {
      alert("Por favor, insira o nome do ambiente.");
      return;
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("Usuário não autenticado.");
        return;
      }

      const uid = user.uid;
      const nomeUsuario = user.displayName || "Usuário";

      // Cria o ambiente
      const ambienteRef = await addDoc(collection(db, "ambiences"), {
        nome,
        icone,
        criador: uid,
        criadoEm: new Date(),
      });

      // Adiciona o membro como subdocumento
      await setDoc(doc(db, "ambiences", ambienteRef.id, "membros", uid), {
        uid,
        nome: nomeUsuario,
      });

      alert("Ambiente criado com sucesso!");
      setNome("");
      setIcone("🌿");
      onClose();
    } catch (error: any) {
      console.error("Erro ao criar ambiente:", error);
      alert(error.message || "Erro ao criar ambiente.");
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-xs text-gray-700 flex justify-center items-center z-50">
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl p-4 w-80 drop-shadow-lg"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 cursor-pointer"
          aria-label="Fechar modal"
        >
          <FaTimes />
        </button>
        <h2 className="text-lg font-semibold mb-4">Novo Ambiente</h2>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1" htmlFor="nome">
            Nome
          </label>
          <input
            id="nome"
            type="text"
            placeholder="Nome do ambiente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full p-2 border-2 border-purple-500 focus:outline-0 rounded-xl"
          />
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">Ícone (emoji)</p>
          <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto mb-4">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcone(emoji)}
                className={`text-2xl p-1 rounded-2xl transition-colors ${
                  icone === emoji ? "bg-purple-200" : "hover:bg-gray-100"
                }`}
                aria-label={`Selecionar emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-2xl w-full transition duration-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl w-full transition duration-200"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
