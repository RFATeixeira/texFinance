"use client";
import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';
import { useToast } from '@/components/ui/ToastProvider';
import { useUserProfile } from '@/context/UserProfileContext';

export default function ConfiguracoesContaPage(){
  const [user,setUser] = useState<User|null>(null);
  const [nome,setNome] = useState('');
  const [saving,setSaving] = useState(false);
  const router = useRouter();
  const { notify } = useToast();

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth,(u)=>{
      if(!u){ router.push('/login'); return; }
      setUser(u);
      setNome(u.displayName || '');
    });
    return ()=>unsub();
  },[router]);

  const { setNome: setNomeGlobal } = useUserProfile();
  const handleSalvar = async ()=>{
    if(!user) return;
    if(!nome.trim()){ notify('Nome não pode ser vazio',{ type:'error'}); return; }
    try {
      setSaving(true);
      await setNomeGlobal(nome.trim());
      notify('Nome atualizado',{ type:'success'});
    } catch(e){
      console.error(e);
      notify('Erro ao salvar',{ type:'error'});
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-md mx-auto p-4 h-screen bg-white/95 text-gray-800">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={()=> router.back()} className="p-2" aria-label="Voltar"><FaArrowLeft className="text-purple-600" /></button>
        <h1 className="text-xl font-bold">Configurações da Conta</h1>
      </div>

      {!user ? (
        <p>Carregando...</p>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={e=> setNome(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-purple-500 focus:outline-0"
              placeholder="Seu nome"
            />
          </div>
          <button
            onClick={handleSalvar}
            disabled={saving}
            className="w-full bg-purple-500 text-white py-3 rounded-2xl font-semibold hover:bg-purple-600 disabled:opacity-60"
          >{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      )}
    </div>
  );
}
