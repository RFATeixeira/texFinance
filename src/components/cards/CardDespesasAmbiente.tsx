"use client";

import { useEffect, useState, startTransition } from "react";
import { db } from "../../app/lib/firebaseConfig";
import {
  collection,
  getDocs,
  DocumentData,
  query,
  where,
} from "firebase/firestore";
import { FaDollarSign } from "react-icons/fa";
import { formatarValorVisibilidade } from '@/utils/saldoInvisivel';

interface CardDespesasAmbienteProps {
  ambienteId: string;
  mes: number;
  ano: number;
  modo: "total" | "usuario";
  membro?: {
    uid: string;
    nome: string;
  };
}

export default function CardDespesasAmbiente({
  ambienteId,
  mes,
  ano,
  modo,
  membro,
}: CardDespesasAmbienteProps) {
  const [total, setTotal] = useState(0);
  const [mostrarValores, setMostrarValores] = useState(true);

  useEffect(() => {
    const fetchDespesas = async () => {
      if (modo === "usuario" && !membro?.uid) return;
      if (!ambienteId) return;
      try {
        let soma = 0;
        const prevMes = mes === 0 ? 11 : mes - 1;
        const prevAno = mes === 0 ? ano - 1 : ano;
        const processarDocs = (snap:any, isUsuario:boolean) => {
          snap.forEach((d:any)=>{
            const data = d.data();
            if (data.type !== 'despesa') return;
            if (data.categoria === 'pagamento_cartao' || data.tipoEspecial === 'pagamentoCartao' || data.tipoEspecial === 'pagamentoCartaoAggregate') return;
            if (data.ambiente !== ambienteId) return;
            const dt = data.data?.toDate?.(); if(!dt) return;
            const m = dt.getMonth(); const y = dt.getFullYear();
            const isCartao = !!data.cartaoId;
            const match = isCartao ? (m===prevMes && y===prevAno) : (m===mes && y===ano);
            if (match) {
              const valor = Number(data.valor); if(!isNaN(valor)) soma += valor;
            }
          });
        };
        if (modo === 'usuario' && membro?.uid) {
          const qUser = query(collection(db,'users', membro.uid,'transacoes'), where('type','==','despesa'), where('ambiente','==', ambienteId));
          const snap = await getDocs(qUser);
            processarDocs(snap, true);
        } else if (modo === 'total') {
          const membrosRef = collection(db,'ambiences', ambienteId, 'membros');
          const membrosSnapshot = await getDocs(membrosRef);
          for (const membroDoc of membrosSnapshot.docs) {
            const membroData = membroDoc.data();
            const uid = membroData.uid; if(!uid) continue;
            const qUser = query(collection(db,'users', uid,'transacoes'), where('type','==','despesa'), where('ambiente','==', ambienteId));
            try {
              const snap = await getDocs(qUser);
              processarDocs(snap, false);
            } catch(e){ /* ignora membros sem permissão */ }
          }
        }
        setTotal(soma);
      } catch(e){ console.error('Erro ao buscar despesas ambiente', e); }
    };
    fetchDespesas();
  }, [ambienteId, mes, ano, modo, membro]);

  useEffect(()=>{
    const stored = typeof window!== 'undefined' ? localStorage.getItem('mostrarValores') : null;
    if(stored!==null) setMostrarValores(stored==='true');
    function handler(e:any){ startTransition(()=> setMostrarValores(!!e.detail?.visivel)); }
    window.addEventListener('visibilidade-valores', handler as any);
    return ()=> window.removeEventListener('visibilidade-valores', handler as any);
  }, []);

  const titulo =
    modo === "total"
      ? "Despesas Totais"
      : `Despesas de ${membro?.nome ?? "Membro"}`;

  return (
  <div className="flex-1 bg-white p-3 rounded-2xl flex items-center gap-3 shadow-lg md:h-28 overflow-visible">
      <div className="bg-red-100 p-2 rounded-md">
        <FaDollarSign className="text-red-600" />
      </div>
      <div>
        <p className="text-[0.7rem] text-gray-600 font-semibold">{titulo}</p>
        <p className="text-gray-800 font-bold text-sm">
          <span className="text-gray-600 text-[0.7rem]">R$ </span>
          {formatarValorVisibilidade(total, mostrarValores)}
        </p>
      </div>
    </div>
  );
}
