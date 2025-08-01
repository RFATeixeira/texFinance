"use client";

import { useState, useEffect } from "react";
import type { Ambiente, Membro } from "../../app/types/types";
import { FaTimes, FaTrash } from "react-icons/fa";

import { doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../app/lib/firebaseConfig";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  ambiente: Ambiente;
  onRemoverMembro: (uid: string) => Promise<void>;
  onEditarMembro: (membro: Membro) => Promise<void>;
};

export default function ModalGerenciarPessoas({
  isOpen,
  onClose,
  ambiente,
  onRemoverMembro,
  onEditarMembro,
}: Props) {
  const membros = ambiente.membros || [];
  const [user, setUser] = useState<any>(null);
  const [nomesEditados, setNomesEditados] = useState<Record<string, string>>({});
  const [uidParaExcluir, setUidParaExcluir] = useState<string | null>(null);
  const [confirmarExclusaoAberto, setConfirmarExclusaoAberto] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const nomesIniciais: Record<string, string> = {};
      membros.forEach((m) => {
        nomesIniciais[m.uid] = m.nome;
      });
      setNomesEditados(nomesIniciais);
    }
  }, [ambiente, isOpen]);

  const handleNomeChange = (uid: string, novoNome: string) => {
    setNomesEditados((prev) => ({
      ...prev,
      [uid]: novoNome,
    }));
  };

  // Atualiza o array de membros do ambiente com o membro editado
  const editarMembro = async (membroEditado: Membro) => {
    if (!user || !ambiente.id) return;

    try {
      const membrosAtualizados = membros.map((m) =>
        m.uid === membroEditado.uid ? membroEditado : m
      );

      const ambienteRef = doc(db, "ambiences", user.uid, "ambiences", ambiente.id);
      await updateDoc(ambienteRef, { membros: membrosAtualizados });
    } catch (error) {
      console.error("Erro ao atualizar membro:", error);
    }
  };

  const handleSalvar = async () => {
    for (const membro of membros) {
      const nomeAtual = nomesEditados[membro.uid];
      if (nomeAtual && nomeAtual.trim() !== membro.nome) {
        await editarMembro({ ...membro, nome: nomeAtual.trim() });
      }
    }
    onClose();
  };

  const abrirConfirmacaoExclusao = (uid: string) => {
    setUidParaExcluir(uid);
    setConfirmarExclusaoAberto(true);
  };

  const confirmarExclusao = async () => {
    if (uidParaExcluir) {
      await onRemoverMembro(uidParaExcluir);
    }
    setUidParaExcluir(null);
    setConfirmarExclusaoAberto(false);
  };

  const cancelarExclusao = () => {
    setUidParaExcluir(null);
    setConfirmarExclusaoAberto(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-[90%] max-w-md drop-shadow-2xl max-h-[80vh] overflow-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <FaTimes />
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-bold">Gerenciar Pessoas</h2>
          <h3 className="text-md font-semibold text-gray-700">{ambiente.nome}</h3>
        </div>

        {membros.length === 0 ? (
          <p className="text-gray-500 italic">Nenhuma pessoa no ambiente.</p>
        ) : (
          <ul className="space-y-2">
            {membros.map((membro) => (
              <li key={membro.uid} className="flex justify-between items-center">
                <input
                  type="text"
                  value={nomesEditados[membro.uid] || ""}
                  onChange={(e) => handleNomeChange(membro.uid, e.target.value)}
                  className="border-2 border-purple-400 rounded-2xl px-2 py-1 w-full mr-2 text-sm focus:outline-0"
                />
                <button
                  onClick={() => abrirConfirmacaoExclusao(membro.uid)}
                  className="text-red-600 hover:text-red-800"
                  aria-label={`Remover ${membro.nome}`}
                >
                  <FaTrash />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSalvar}
            className="bg-purple-500 px-4 py-2 rounded-2xl w-full text-white hover:bg-purple-600"
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmarExclusaoAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-4 rounded-lg shadow-lg w-[90%] max-w-sm">
            <h2 className="text-lg font-semibold mb-4 text-center">Remover pessoa?</h2>
            <p className="text-center text-gray-600 mb-4">
              Tem certeza que deseja remover esta pessoa do ambiente?
            </p>
            <div className="flex justify-between">
              <button
                onClick={cancelarExclusao}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-md w-[48%]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md w-[48%]"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
