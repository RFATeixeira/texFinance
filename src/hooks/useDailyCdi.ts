"use client";
import { useEffect, useState, useRef } from 'react';

interface CdiData { annualRatePercent: number; dailyRate: number; date: string; source?: string; }

export function useDailyCdi(){
  const [cdi, setCdi] = useState<CdiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const forcedOnce = useRef(false);

  async function load(force=false){
    try {
      setLoading(true);
      const res = await fetch('/api/cdi/update' + (force? '?force=1':''), { cache: 'no-store' });
      const json = await res.json();
      if(res.ok && json.annualRatePercent){
        setCdi({ annualRatePercent: json.annualRatePercent, dailyRate: json.dailyRate, date: json.date, source: json.source });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cdi-updated', { detail: { cdi: json }}));
        }
      } else {
        setError(json.message || 'Falha ao obter CDI');
      }
    } catch(e:any){
      setError(e?.message || 'Erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, []);

  // Se veio placeholder, tenta forçar uma vez (talvez BCB estava indisponível no primeiro fetch)
  useEffect(()=>{
    if(!cdi) return;
    if(!forcedOnce.current && cdi.source && cdi.source.startsWith('placeholder')){
      forcedOnce.current = true;
      load(true);
    }
  }, [cdi]);

  return { cdi, loading, error, reload: load };
}
