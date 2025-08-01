"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verifica se o usuário existe no Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Se não existir, cria o documento com dados básicos
          await setDoc(userRef, {
            nome: user.displayName || "",
            email: user.email || "",
            fotoURL: user.photoURL || "",
            criadoEm: serverTimestamp(),
          });
        }

        router.push("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white text-center px-6">
      <h1 className="text-3xl font-bold text-purple-600 mb-2">Bem-vindo 👋</h1>
      <p className="text-gray-600 mb-8">Gerencie suas finanças com simplicidade.</p>

      <button
        onClick={handleLogin}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition"
      >
        Entrar com Google
      </button>
    </div>
  );
}
