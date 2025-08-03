"use client";

import { useState, useEffect, useRef } from "react";
import { Conta } from "@/app/types/types";
import { db, auth } from "@/app/lib/firebaseConfig";
import { addDoc, collection } from "firebase/firestore";
import { FaTimes } from "react-icons/fa";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Conta) => void;
};

export default function AddContaModal({ isOpen, onClose, onSave }: Props) {
  const [nome, setNome] = useState("");
  const [visivelNoSaldo, setVisivelNoSaldo] = useState(true); // <- novo estado
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const novaConta = {
      nome,
      visivelNoSaldo, // <- salvar esse campo
    };

    const docRef = await addDoc(
      collection(db, "users", user.uid, "contas"),
      novaConta
    );

    onSave({ id: docRef.id, ...novaConta });
    onClose();
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
    <div className="fixed backdrop-blur-xs inset-0 text-gray-700 flex justify-center items-center z-50">
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl p-4 w-80 drop-shadow-lg"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 cursor-pointer"
        >
          <FaTimes />
        </button>

        <h2 className="text-lg font-semibold mb-4">Nova conta</h2>

        <div>
          <p className="text-sm font-semibold">Nome</p>
          <input
            type="text"
            placeholder="Nome da conta"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full mb-2 p-2 border-2 border-purple-500 focus:outline-0 rounded-xl"
          />
        </div>

        {/* Checkbox customizado */}
        <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-4">
          <input
            type="checkbox"
            id="mostrar-no-saldo"
            className="peer hidden"
            checked={visivelNoSaldo}
            onChange={(e) => setVisivelNoSaldo(e.target.checked)}
          />
          <label
            htmlFor="mostrar-no-saldo"
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
          <label htmlFor="mostrar-no-saldo" className="cursor-pointer">
            Mostrar no saldo total
          </label>
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
