"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/app/lib/firebaseConfig';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';

interface UserProfileCtx {
  uid: string | null;
  nome: string | null;
  loading: boolean;
  setNome: (novo: string) => Promise<void>;
}

const Ctx = createContext<UserProfileCtx>({ uid: null, nome: null, loading: true, setNome: async()=>{} });

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [uid,setUid] = useState<string|null>(null);
  const [nome,setNomeState] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    const unsubAuth = onAuthStateChanged(auth, async(u)=>{
      if(!u){ setUid(null); setNomeState(null); setLoading(false); return; }
      setUid(u.uid);
      // Garante que exista doc do usuário
      const ref = doc(db,'users', u.uid);
      const snap = await getDoc(ref).catch(()=>null as any);
      if (!snap || !snap.exists()) {
        await setDoc(ref,{ nome: u.displayName || 'Usuário', createdAt: Date.now() }, { merge:true });
      }
      const unsubDoc = onSnapshot(ref, (ds)=>{
        const data = ds.data() as any;
        if (data?.nome) setNomeState(data.nome);
        else if (auth.currentUser?.displayName) setNomeState(auth.currentUser.displayName);
        setLoading(false);
      });
      return ()=> unsubDoc();
    });
    return ()=> unsubAuth();
  },[]);

  async function setNome(novo: string) {
    const u = auth.currentUser; if(!u || !uid) return;
    const clean = novo.trim(); if(!clean) return;
    await updateProfile(u,{ displayName: clean }).catch(()=>{});
    await updateDoc(doc(db,'users', uid), { nome: clean, updatedAt: Date.now() });
  }

  return <Ctx.Provider value={{ uid, nome, loading, setNome }}>{children}</Ctx.Provider>;
}

export function useUserProfile(){ return useContext(Ctx); }
