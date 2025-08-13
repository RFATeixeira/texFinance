"use client";
import { useEffect, useState } from 'react';
import { db } from '@/app/lib/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

interface CdiHistoryDoc { date: string; annualRatePercent: number; }

export function useCdiHistory(){
  const [history, setHistory] = useState<CdiHistoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(()=>{
    (async ()=>{
      try {
        setLoading(true);
        const colRef = collection(db,'cdiHistory');
        const snap = await getDocs(colRef);
        const list = snap.docs.map(d=> ({ date: d.id, ...(d.data() as any)}))
          .filter(d=> d.annualRatePercent>0)
          .sort((a,b)=> a.date.localeCompare(b.date));
        setHistory(list);
      } catch(e:any){ setError(e?.message||'Erro ao carregar histórico CDI'); }
      finally{ setLoading(false); }
    })();
  }, []);

  return { history, loading, error };
}
