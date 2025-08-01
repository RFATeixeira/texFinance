"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { FaTimes } from "react-icons/fa";
import { User } from "firebase/auth";

interface ModalSubcategoriaProps {
  user: User;
  categoriaId: string;
  subcategoria?: {
    nome: string;
    emoji: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (sub: { nome: string; icone: string }) => void;
  onDelete?: () => void;  // <-- Nova prop para deletar
  initialData?: { nome: string; icone: string };
}

const ModalSubcategoria: React.FC<ModalSubcategoriaProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}) => {
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("🧾");

  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome);
      setIcone(initialData.icone);
    } else {
      setNome("");
      setIcone("🧾");
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

  const emojis = ["🦷","⚡","💧","📁", "💰", "🍔","🍕", "🏠", "🚗", "🛍️", "🧾", "📦", "📚", "💵","💶","💷","💳","💹","🪙","💴","💸","🏦","⛱️","❄️","🛋️","🛁","🧻","🌹","🍉","🍇","🍷","🍺","🍹","🍫","🥖","📉","📊","💡","🚬","💊","🧱","🔊","🎮","🎱","⚽","🏀","👖","🥼","🎁","🎉","🧼","🦴","🐶","😺"];

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
            {initialData ? "Editar" : "Nova"} Subcategoria
          </h2>
          <input
            type="text"
            placeholder="Nome da subcategoria"
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

          <div className="flex gap-4">
            {initialData && (
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white py-2 rounded-2xl hover:bg-red-600"
              >
                Excluir
              </button>
            )}
            <button
              onClick={handleSave}
              className={`rounded-2xl py-2 text-white ${
                initialData ? "bg-purple-500 hover:bg-purple-600 flex-1" : "w-full bg-purple-500 hover:bg-purple-600"
              }`}
            >
              Salvar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ModalSubcategoria;
