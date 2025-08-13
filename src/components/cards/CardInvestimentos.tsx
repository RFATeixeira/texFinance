"use client";

import { useEffect, useState, startTransition } from 'react';
import { auth, db } from '@/app/lib/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { FaChartLine } from 'react-icons/fa';
import { formatarValorVisibilidade } from '@/utils/saldoInvisivel';
import { aggregateInvestments, computeInvestmentGrowthHistorical } from '@/utils/investmentInterest';
import { useDailyCdi } from '@/hooks/useDailyCdi';
import { useCdiHistory } from '@/hooks/useCdiHistory';

interface ContaDoc { id: string; nome: string; tipoConta?: string; visivelNoSaldo?: boolean; investmentType?: string; cdiAnnualRatePercent?: number; cdiPercent?: number; }

export default function CardInvestimentos() {
  const [total, setTotal] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const { cdi } = useDailyCdi();
  const { history } = useCdiHistory();
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
  const contasInvest: ContaDoc[] = [];
  contasSnap.docs.forEach(d=> { const data = d.data() as any; if(data.tipoConta === 'investimento') contasInvest.push({ id:d.id, ...data }); });
  if(contasInvest.length===0){ setTotal(0); setTotalInvested(0); setTotalInterest(0); return; }
  const transSnap = await getDocs(collection(db,'users', user.uid,'transacoes'));
  const trans = transSnap.docs.map(d=> ({ id:d.id, ...(d.data() as any)}));
  if(history.length){
    let totalCurrent=0,totalInvested=0,totalInterest=0;
    contasInvest.forEach(ci=>{
      const r = computeInvestmentGrowthHistorical(trans as any, ci.id, ci as any, history as any);
      totalCurrent += r.currentValue; totalInvested += r.invested; totalInterest += r.interest;
    });
    setTotal(+totalCurrent.toFixed(2)); setTotalInvested(+totalInvested.toFixed(2)); setTotalInterest(+totalInterest.toFixed(2));
  } else {
    const ag = aggregateInvestments(trans as any, contasInvest as any);
    setTotal(ag.totalCurrent); setTotalInvested(ag.totalInvested); setTotalInterest(ag.totalInterest);
  }
      } catch(e){ console.error(e); }
    })();
  }, [enabled, cdi, history]);

  if(!enabled) return null;

  return (
  <div className="mt-2 md:mt-0 bg-white px-3 py-3 rounded-2xl drop-shadow-lg flex justify-between items-center border border-purple-100 md:h-24">
      <div className="flex flex-row items-center gap-2">
        <div className="bg-purple-100 p-2 rounded-md">
          <FaChartLine className="text-purple-600" />
        </div>
        <p className="text-[0.8rem] text-purple-600 font-semibold">Investimentos</p>
      </div>
      <div className="flex flex-col items-end">
        <p className="text-purple-600 font-bold text-[0.8rem]">R$ <span className="text-purple-700 text-lg">{formatarValorVisibilidade(total, mostrarValores)}</span></p>
        <p className="text-[10px] text-gray-500">Aportado: <span className="font-semibold text-gray-600">R$ {formatarValorVisibilidade(totalInvested, mostrarValores)}</span></p>
        <p className="text-[10px] text-gray-500">Juros: <span className="font-semibold text-green-600">R$ {formatarValorVisibilidade(totalInterest, mostrarValores)}</span></p>
      </div>
    </div>
  );
}
