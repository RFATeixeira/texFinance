"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '@/app/lib/firebaseConfig';
import { doc, updateDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { FaTimes, FaTrash } from 'react-icons/fa';
import { useToast } from '@/components/ui/ToastProvider';

interface Member { uid: string; nome: string; }
interface Ambiente { id: string; nome: string; membros?: Member[]; criador?: string; }

interface Props {
  open: boolean;
  ambiente: Ambiente | null;
  onClose: () => void;
  onMembersChanged: (membros: Member[]) => void; // atualiza estado no parent
  isOwner?: boolean;
}

export default function MembersManageModal({ open, ambiente, onClose, onMembersChanged, isOwner }: Props) {
  const { notify } = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [nomesEditados, setNomesEditados] = useState<Record<string,string>>({});
  const membros = ambiente?.membros || [];

  useEffect(()=>{
    if (open && membros.length) {
      const map: Record<string,string> = {};
      membros.forEach(m=> map[m.uid]=m.nome);
      setNomesEditados(map);
    }
  }, [open, ambiente?.id]);

  useEffect(()=>{
    function handleClick(e: MouseEvent){ if(ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    if(open) document.addEventListener('mousedown', handleClick);
    return ()=> document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  if(!open || !ambiente) return null;

  function handleChange(uid:string, value:string){
    if(!isOwner) return;
    setNomesEditados(prev=>({...prev, [uid]: value}));
  }

  async function salvarAlteracoes(){
    if(!ambiente || !isOwner) return;
    const atualizados: Member[] = membros.map(m=> ({ ...m, nome: (nomesEditados[m.uid] || '').trim() || m.nome }));
    const batch = writeBatch(db);
    for(const m of atualizados){
      const original = membros.find(o=>o.uid===m.uid);
      if(original && original.nome === m.nome) continue; // só atualiza se mudou
      const membroRef = doc(db, 'ambiences', ambiente.id, 'membros', m.uid);
      batch.update(membroRef, { nome: m.nome });
    }
    try {
      await batch.commit();
      onMembersChanged(atualizados);
      notify('Alterações salvas', { type: 'success' });
      onClose();
    } catch(e){
      console.error(e);
      notify('Erro ao salvar', { type: 'error' });
    }
  }

  async function remover(uid:string){
    if(!ambiente || !isOwner) return;
    if(!confirm('Remover membro?')) return;
    try {
      await deleteDoc(doc(db,'ambiences', ambiente.id, 'membros', uid));
      const novos = membros.filter(m=> m.uid!==uid);
      onMembersChanged(novos);
      notify('Membro removido',{ type:'success' });
    } catch(e){
      console.error(e);
      notify('Erro ao remover',{ type:'error' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-xs flex items-center justify-center text-gray-800">
      <div ref={ref} className="bg-white rounded-xl p-5 w-[90%] max-w-md shadow-lg max-h-[80vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><FaTimes/></button>
        <h2 className="text-lg font-semibold mb-4">Gerenciar Pessoas</h2>
        <h3 className="text-sm font-semibold text-gray-600 mb-4">{ambiente.nome}</h3>
        {membros.length===0 && <p className="text-sm text-gray-500 italic">Nenhum membro.</p>}
        <ul className="space-y-3">
          {membros.map(m=> (
            <li key={m.uid} className="flex items-center gap-2">
              <input disabled={!isOwner} value={nomesEditados[m.uid]||''} onChange={e=>handleChange(m.uid, e.target.value)} className={`flex-1 border-2 rounded-2xl px-2 py-1 text-sm focus:outline-0 ${isOwner? 'border-purple-400':'border-gray-300 bg-gray-100 cursor-not-allowed'}`} />
              {isOwner && (
                <button onClick={()=>remover(m.uid)} className="text-red-500 hover:text-red-700" title="Remover"><FaTrash/></button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="w-full bg-gray-300 hover:bg-gray-400 rounded-2xl py-2 text-sm">{isOwner? 'Cancelar':'Fechar'}</button>
          {isOwner && <button onClick={salvarAlteracoes} className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-2xl py-2 text-sm">Salvar</button>}
        </div>
      </div>
    </div>
  );
}
