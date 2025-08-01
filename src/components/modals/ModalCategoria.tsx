// components/modals/ModalCategoria.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { FaTimes } from "react-icons/fa";
import { User } from "firebase/auth";

interface ModalCategoriaProps {
  user: User;
  categoriaId: string;
  categoria?: {
    nome: string;
    emoji: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoria: { nome: string; icone: string }) => void;
  onDelete?: () => void; // ✅ ADICIONADO
  initialData?: { nome: string; icone: string };
}

const ModalCategoria: React.FC<ModalCategoriaProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete, // ✅ ADICIONADO
  initialData,
}) => {
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("📁");

  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome);
      setIcone(initialData.icone);
    } else {
      setNome("");
      setIcone("📁");
    }
  }, [initialData, isOpen]);

  const handleSave = () => {
    if (nome.trim() !== "") {
      onSave({ nome, icone });
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onClose();
    }
  };

  const emojis = ["🦷","⚡","💧","📁", "💰", "🍔","🍕", "🏠", "🚗", "🛍️", "🧾", "📦", "📚", "💵","💶","💷","💳","💹","🪙","💴","💸","🏦","⛱️","❄️","🛋️","🛁","🧻","🌹","🍉","🍇","🍷","🍺","🍹","🍫","🥖","📉","📊","💡","🚬","💊","🧱","🔊","🎮","🎱","⚽","🏀","👖","🥼","🎁","🎉"];

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      <div className="fixed inset-0 backdrop-blur-xs" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4 text-gray-800">
        <Dialog.Panel className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 cursor-pointer"
          >
            <FaTimes />
          </button>
          <h2 className="text-xl font-bold mb-4">
            {initialData ? "Editar" : "Nova"} Categoria
          </h2>
          <input
            type="text"
            placeholder="Nome da categoria"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border-2 border-purple-500 p-2 rounded-2xl mb-4 focus:outline-0"
          />
          <div className="grid grid-cols-5 gap-2 mb-4 h-60 overflow-scroll">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className={`text-2xl p-2 rounded-2xl ${
                  icone === emoji ? "bg-purple-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setIcone(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex flex-row-reverse gap-2">
          <button
            onClick={handleSave}
            className="w-full bg-purple-600 text-white py-2 rounded-2xl hover:bg-purple-700"
          >
            Salvar
          </button>

          {/* ✅ BOTÃO DE EXCLUIR (aparece só no modo de edição) */}
          {initialData && onDelete && (
            <button
              onClick={handleDelete}
              className="w-full bg-red-500 text-white py-2 rounded-2xl hover:bg-red-600"
            >
              Excluir
            </button>
          )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ModalCategoria;
