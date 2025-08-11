// components/ui/Modal.tsx
"use client";
import { ReactNode } from "react";
import { FaTimes } from "react-icons/fa";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xs m-4 text-gray-800 md:pl-[224px]">
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 cursor-pointer"
            aria-label="Fechar modal"
          >
            <FaTimes />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
