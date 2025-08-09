"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebaseConfig';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import dayjs from 'dayjs';
import { FaArrowLeft } from 'react-icons/fa';
import { formatarValorVisibilidade } from '@/utils/saldoInvisivel';

interface Transacao { id:string; nome?:string; valor:number; data:any; type:string; cartaoId?:string; }

export default function CartaoDetalhePage(){
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [transacoes,setTransacoes] = useState<Transacao[]>([]);
  const [mostrarValores,setMostrarValores] = useState(true);

  useEffect(()=>{ const stored = localStorage.getItem('mostrarValores'); if(stored!==null) setMostrarValores(stored==='true'); function handler(e:any){ setMostrarValores(e.detail.visivel);} window.addEventListener('visibilidade-valores', handler as any); return ()=> window.removeEventListener('visibilidade-valores', handler as any); },[]);

  useEffect(()=>{ (async ()=>{ const user = auth.currentUser; if(!user||!id) return; const ref = collection(db,'users', user.uid,'transacoes'); const snap = await getDocs(ref); const lista:Transacao[] = []; snap.forEach(d=>{ const data = d.data() as any; if(data.cartaoId === id){ lista.push({ id:d.id, ...data }); } }); lista.sort((a,b)=> (a.data?.toDate?.()||new Date()).getTime() - (b.data?.toDate?.()||new Date()).getTime()); setTransacoes(lista); })(); },[id]);

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={()=> router.back()} className="p-2" aria-label="Voltar"><FaArrowLeft className="text-purple-600" /></button>
        <h1 className="font-bold text-lg">Transações do Cartão</h1>
      </div>
      {transacoes.length===0 ? <p className="text-sm text-gray-500">Nenhuma transação vinculada.</p> : (
        <ul className="space-y-2">
          {transacoes.map(t=>{ const d = t.data?.toDate?.()||null; return (
            <li key={t.id} className="bg-white rounded-xl p-3 shadow flex justify-between items-center text-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-gray-800">{t.nome||t.type}</span>
                {d && <span className="text-[0.65rem] text-gray-500">{dayjs(d).format('DD/MM/YYYY')}</span>}
              </div>
              <span className={`font-bold ${t.type==='despesa'?'text-red-600':'text-green-600'}`}>{t.type==='despesa'?'-':'+'} R$ {formatarValorVisibilidade(Math.abs(Number(t.valor)||0), mostrarValores)}</span>
            </li>
          ); })}
        </ul>
      )}
    </div>
  );
}
