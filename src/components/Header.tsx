"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../app/lib/firebaseConfig";
import Image from "next/image";
import { AiOutlineEye } from "react-icons/ai";
import Notificacoes from "@/components/Notification"; // ou "@/components/Notificacoes" dependendo do nome do arquivo

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribeAuth();
  }, []);

  return (
    <header className="flex justify-between items-center px-2 pt-4">
      <div className="flex items-center gap-3">
        {user?.photoURL ? (
          <Image
            src={user.photoURL}
            alt="Foto de perfil"
            width={34}
            height={34}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-300 rounded-full" />
        )}
        <p className="text-lg font-semibold text-gray-800">
          Olá,{" "}
          <span className="text-gray-800">
            {user?.displayName?.split(" ")[0] ?? "..."}
          </span>
          !
        </p>
      </div>

      <div className="flex items-center gap-4 text-gray-800 text-xl relative">
        <AiOutlineEye className="cursor-pointer" />
        {/* Componente separado de notificações */}
        <Notificacoes />
      </div>
    </header>
  );
}
