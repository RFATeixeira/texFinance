"use client";

import { useState } from "react";
import { IoNotificationsOutline } from "react-icons/io5";

export default function Notificacoes() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        aria-label="Notificações"
        className="relative focus:outline-none"
      >
        <IoNotificationsOutline className="cursor-pointer text-xl" />
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 backdrop-blur-xs flex justify-center items-center z-50 text-gray-800"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Notificações</h2>
            <p className="text-gray-600">Nenhuma notificação.</p>
            <button
              onClick={() => setModalOpen(false)}
              className="mt-4 bg-purple-500 text-white px-4 py-2 rounded-2xl hover:bg-purple-600"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
