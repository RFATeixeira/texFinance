"use client";

import { FaTags, FaSignOutAlt, FaUsers, FaUserCog } from "react-icons/fa";
import { HiChevronRight } from "react-icons/hi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebaseConfig"
import { onAuthStateChanged, signOut, User } from "firebase/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        // Se você salvar a data de criação do usuário no Firestore,
        // pode pegar aqui para mostrar "Membro desde"
        // Ou usar u.metadata.creationTime (string)
        setCreatedAt(u.metadata.creationTime || null);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!user) {
    return <p>Carregando usuário...</p>;
  }

  return (
    <div className="max-w-md h-screen mx-auto p-4 bg-white/97 text-gray-800">
      {/* Dados do Usuário */}
      <div className="flex flex-row mb-8 justify-between items-center">
        <div className="flex flex-row gap-2">
          <img
            src={user.photoURL || "/default-avatar.png"}
            alt="Foto do usuário"
            className="w-10 h-10 rounded-full"
          />
          <div className="flex flex-col">
            <h2 className="font-semibold text-md">{user.displayName || "Usuário"}</h2>
            <p className="text-gray-600 text-xs">
              Membro desde{" "}
              {createdAt ? new Date(createdAt).toLocaleDateString() : "Data não disponível"}
            </p>
          </div>
        </div>
        <div
          onClick={() => signOut(auth)}
          className=" px-2 py-2 cursor-pointer"
        >
          <FaSignOutAlt className="text-red-500 text-xl" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Card Categorias */}
        <div
         onClick={() => router.push("/profile/categorias")}
         className="cursor-pointer bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition flex items-center justify-between"
       >
         <div className="flex flex-row items-center gap-2">
           <FaTags className="text-purple-500 text-3xl" />
           <p className="text-lg font-semibold">Categorias</p>
         </div>
         <HiChevronRight className="text-purple-500 text-2xl" />

       </div>

       {/* Card Ambientes */}
       <div
         onClick={() => router.push("/profile/ambience")}
         className="cursor-pointer bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition flex items-center justify-between"
       >
         <div className="flex flex-row items-center gap-2">
           <FaUsers className="text-purple-500 text-3xl" />
           <p className="text-lg font-semibold">Ambientes</p>
         </div>
         <HiChevronRight className="text-purple-500 text-2xl" />

        </div>

        {/* Card Configurações */}
        <div
         onClick={() => router.push("/profile/configuracoes")}
         className="cursor-pointer bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition flex items-center justify-between"
       >
         <div className="flex flex-row items-center gap-2">
           <FaUserCog className="text-purple-500 text-3xl" />
           <p className="text-lg font-semibold">Configurações</p>
         </div>
         <HiChevronRight className="text-purple-500 text-2xl" />
       </div>
      </div>
    </div>
  );
}
