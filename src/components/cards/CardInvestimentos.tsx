"use client";

import { useEffect, useState, startTransition } from 'react';
import { auth, db } from '@/app/lib/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { FaChartLine } from 'react-icons/fa';
import { formatarValorVisibilidade } from '@/utils/saldoInvisivel';

interface ContaDoc { id: string; nome: string; tipoConta?: string; visivelNoSaldo?: boolean; }

export default function CardInvestimentos() {
  const [total, setTotal] = useState(0);
  const [mostrarValores, setMostrarValores] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(()=>{
    try {
      const pref = localStorage.getItem('showInvestCard');
      setEnabled(pref === 'true');
    } catch {}
  }, []);

  useEffect(()=>{
    const stored = typeof window!== 'undefined' ? localStorage.getItem('mostrarValores') : null;
    if(stored!==null) setMostrarValores(stored==='true');
    function handler(e:any){ startTransition(()=> setMostrarValores(!!e.detail?.visivel)); }
    window.addEventListener('visibilidade-valores', handler as any);
    return ()=> window.removeEventListener('visibilidade-valores', handler as any);
  }, []);

  useEffect(()=>{
    (async ()=>{
      const user = auth.currentUser; if(!user || !enabled) return;
      try {
        const contasSnap = await getDocs(collection(db,'users', user.uid,'contas'));
        const investimentoIds: string[] = [];
        contasSnap.docs.forEach(d=> { const data = d.data() as ContaDoc; if(data.tipoConta === 'investimento') investimentoIds.push(d.id); });
        if(investimentoIds.length===0){ setTotal(0); return; }
        const transSnap = await getDocs(collection(db,'users', user.uid,'transacoes'));
        let soma = 0;
        transSnap.docs.forEach(td=>{
          const t:any = td.data();
            if(investimentoIds.includes(t.conta)){
              if(t.type==='receita') soma += Number(t.valor)||0;
              else if(t.type==='despesa') soma -= Number(t.valor)||0;
            }
            if(t.type==='transferencia'){
              if(investimentoIds.includes(t.contaDestino)) soma += Number(t.valor)||0;
              if(investimentoIds.includes(t.contaOrigem)) soma -= Number(t.valor)||0;
            }
        });
        setTotal(soma);
      } catch(e){ console.error(e); }
    })();
  }, [enabled]);

  if(!enabled) return null;

  return (
    <div className="mt-2 bg-white px-3 py-3 rounded-2xl drop-shadow-lg flex justify-between items-center border border-purple-100">
      <div className="flex flex-row items-center gap-2">
        <div className="bg-purple-100 p-2 rounded-md">
          <FaChartLine className="text-purple-600" />
        </div>
        <p className="text-[0.8rem] text-purple-600 font-semibold">Investimentos</p>
      </div>
      <p className="text-purple-600 font-bold text-[0.8rem]">
        R$ <span className="text-purple-700 text-lg">{formatarValorVisibilidade(total, mostrarValores)}</span>
      </p>
    </div>
  );
}
