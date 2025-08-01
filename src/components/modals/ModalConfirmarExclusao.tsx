"use client";

import { useRef, useEffect } from "react";
import { FaTimes } from "react-icons/fa";

export default function ModalConfirmarExclusao({
  mensagem,
  onConfirmar,
  onClose,
}: {
  mensagem: string;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white p-6 rounded-lg w-[90%] max-w-sm space-y-4 drop-shadow-2xl">
        <div className="relative flex justify-between items-center">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 cursor-pointer"
            >
            <FaTimes />
          </button>
          <h2 className="text-lg font-bold">Confirmar exclusão</h2>
          
        </div>

        <p>{mensagem}</p>

        <div className="flex justify-end gap-4 pt-4">
          <button onClick={onConfirmar} className="bg-purple-400 text-white py-2 px-4 w-full rounded-2xl hover:bg-purple-500">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}