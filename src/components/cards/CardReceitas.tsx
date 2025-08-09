"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../app/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FaDollarSign } from "react-icons/fa";
import { formatarValorVisibilidade } from '@/utils/saldoInvisivel';

export default function CardReceitas({ mes, ano }: { mes: number; ano: number }) {
  const [total, setTotal] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarValores, setMostrarValores] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchReceitas = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setErro(null);
        const ref = collection(db, "users", userId, "transacoes");
        const snapshot = await getDocs(ref);

        let soma = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          const dataTransacao = data.data?.toDate?.();
          if (
            data.type === "receita" &&
            dataTransacao &&
            dataTransacao.getMonth() === mes &&
            dataTransacao.getFullYear() === ano
          ) {
            soma += Number(data.valor) || 0;
          }
        });

        setTotal(soma);
      } catch (error: any) {
        console.error("Erro ao buscar receitas:", error);
        if (error.code === "permission-denied") {
          setErro("Sem permissão para acessar receitas.");
        } else {
          setErro("Erro ao carregar receitas.");
        }
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchReceitas();
  }, [userId, mes, ano]);

  useEffect(()=>{
    const stored = localStorage.getItem('mostrarValores');
    if(stored!==null) setMostrarValores(stored==='true');
    function handler(e:any){ setMostrarValores(e.detail.visivel); }
    window.addEventListener('visibilidade-valores', handler as any);
    return ()=> window.removeEventListener('visibilidade-valores', handler as any);
  }, []);

  return (
    <div className="flex-1 bg-white p-3 rounded-2xl flex items-center gap-3 drop-shadow-lg">
      <div className="bg-green-100 p-2 rounded-md">
        <FaDollarSign className="text-green-600" />
      </div>
      <div>
        <p className="text-[0.7rem] text-gray-600 font-semibold">Receitas</p>
        
          <p className="text-gray-800 font-bold text-sm">
            <span className="text-gray-600 text-[0.7rem]">R$ </span>
            {formatarValorVisibilidade(total, mostrarValores)}
          </p>
        
      </div>
    </div>
  );
}
