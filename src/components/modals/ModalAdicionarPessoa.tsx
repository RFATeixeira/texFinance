"use client";

import { useState, useRef, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import type { Ambiente } from "../../app/types/types";
import { auth, db } from "../../app/lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  ambiente: Ambiente;
};

export default function ModalAdicionarPessoa({
  isOpen,
  onClose,
  ambiente,
}: Props) {
  const [email, setEmail] = useState("");
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

  async function adicionarMembroNoAmbiente(emailConvidado: string, ambienteId: string) {
  // 1. Buscar usuário pelo email
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", emailConvidado));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    alert("Usuário com este email não encontrado.");
    return false;
  }

  const userDoc = querySnapshot.docs[0];
  const userData = userDoc.data();
  const userIdConvidado = userDoc.id; // ID do usuário encontrado

  // 2. Verifica se o ambiente existe
  const ambienteDocRef = doc(db, "ambiences", ambienteId);
  const ambienteSnap = await getDoc(ambienteDocRef);
  if (!ambienteSnap.exists()) {
    alert("Ambiente não encontrado.");
    return false;
  }

  // 3. Verifica se o usuário autenticado é um membro do ambiente
  const remetente = auth.currentUser ;
  if (!remetente) {
    alert("Usuário não autenticado.");
    return false;
  }

  const membroDocRef = doc(db, "ambiences", ambienteId, "membros", remetente.uid); // Usando o ID do usuário autenticado
  const membroSnap = await getDoc(membroDocRef);
  if (!membroSnap.exists()) {
    alert("Você não tem permissão para adicionar membros a este ambiente.");
    return false;
  }

  // 4. Cria documento na subcoleção membros com o ID do usuário encontrado
  const novoMembroDocRef = doc(db, "ambiences", ambienteId, "membros", userIdConvidado); // Usando o ID do usuário encontrado
  await setDoc(novoMembroDocRef, {
    nome: userData.nome || "", // ou qualquer outro campo do userData que queira usar como nome
    uid: userIdConvidado,
  });

  return true;
}

  const handleAdicionar = async () => {
  if (!email.trim()) {
    alert("Preencha o email.");
    return;
  }

  try {
    const remetente = auth.currentUser ;
    if (!remetente) {
      alert("Usuário não autenticado.");
      return;
    }

    // Verifica se o usuário atual é um membro do ambiente
    const membroDocRef = doc(db, "ambiences", ambiente.id, "membros", remetente.uid);
    const membroSnap = await getDoc(membroDocRef);
    if (!membroSnap.exists()) {
      alert("Você não tem permissão para adicionar membros a este ambiente.");
      return;
    }

    const sucesso = await adicionarMembroNoAmbiente(email.trim(), ambiente.id);

    if (sucesso) {
      alert("Usuário adicionado ao ambiente com sucesso!");
      onClose();
      setEmail("");
    }
  } catch (error: any) {
    console.error("Erro ao adicionar usuário ao ambiente:", error);
    alert(`Erro: ${error.message || "Erro ao adicionar usuário ao ambiente."}`);
  }
};


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="relative bg-white p-6 rounded-lg w-[90%] max-w-md space-y-4 drop-shadow-2xl"
      >
        <div className="flex justify-between items-center ">
          <h2 className="text-xl font-bold">Adicionar Pessoa</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 cursor-pointer"
            aria-label="Fechar modal"
          >
            <FaTimes />
          </button>
        </div>

        <label className="block">
          Email
          <input
            type="email"
            className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <button
          onClick={handleAdicionar}
          className="w-full bg-purple-500 text-white py-2 rounded-2xl hover:bg-purple-600"
        >
          Adicionar ao Ambiente
        </button>
      </div>
    </div>
  );
}
