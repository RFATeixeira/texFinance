// components/ui/Modal.tsx
"use client";
import { ReactNode, useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(()=>{
    if (open) {
      setRender(true);
      setClosing(false);
    } else if (render) {
      // inicia animação de saída
      setClosing(true);
      const t = setTimeout(()=>{ setRender(false); setClosing(false); }, 260);
      return () => clearTimeout(t);
    }
  }, [open, render]);

  if (!render) return null;

  // Direção: entrada de baixo->cima, saída cima->baixo (mobile). Desktop mantém leve fade/scale.
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center md:items-center md:justify-center">
  <div
    className={`absolute inset-0 backdrop-blur-md bg-transparent transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={() => onClose()}
      />
      <div
  className={`relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 md:mx-4 text-gray-800 transform transition-all duration-300 ease-[cubic-bezier(.22,.68,0,1.01)]
    ${closing ? 'translate-y-full md:scale-95 md:opacity-0' : 'translate-y-0 md:scale-100 md:opacity-100'}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={() => onClose()}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Fechar modal"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
