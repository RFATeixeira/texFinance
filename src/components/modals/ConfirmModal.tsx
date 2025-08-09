"use client";
import Modal from "@/components/ui/Modal";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirming?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title = "Confirmar", message, confirmText = "Confirmar", cancelText = "Cancelar", onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-gray-700 mb-6 whitespace-pre-line">{message}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-2xl py-2 text-sm">{cancelText}</button>
        <button onClick={onConfirm} className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-2 text-sm">{confirmText}</button>
      </div>
    </Modal>
  );
}
