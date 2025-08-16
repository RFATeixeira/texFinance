"use client";
import { useEffect, useRef } from 'react';
import { auth, db } from '@/app/lib/firebaseConfig';
import { collection, getDocs, doc, getDoc, writeBatch, query, limit, orderBy } from 'firebase/firestore';

/**
 * EmojiBackfill
 * Executa (silenciosamente) uma migração para adicionar categoriaEmoji e subcategoriaEmoji
 * às transações antigas do usuário autenticado que ainda não possuem esses campos.
 * Necessário para que outros membros de um ambiente vejam o emoji correto sem precisar acessar
 * as categorias privadas do outro usuário.
 */
export default function EmojiBackfill() {
  const started = useRef(false);

  useEffect(()=>{
    if (started.current) return; // evita rodar duas vezes no hot-reload
    started.current = true;

    const LS_KEY = 'emojiBackfill_v1_done';
    // Você pode comentar a linha abaixo para forçar nova execução.
    if (typeof window !== 'undefined' && localStorage.getItem(LS_KEY)==='1') return;

    (async()=>{
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        console.time('[EmojiBackfill] total');

        // Carrega todas categorias uma vez
        const categoriasSnap = await getDocs(collection(db,'users', uid,'categorias'));
        const categorias = categoriasSnap.docs.map(d=> ({ id:d.id, ...(d.data() as any) }));

        // Função para buscar mais transações sem emojis (paginação manual)
        const fetchLote = async ()=> {
          // Não há consulta direta por ausência de campo, então buscamos um lote ordenado e filtramos client-side
          const q = query(collection(db,'users', uid,'transacoes'), orderBy('data','desc'), limit(400));
          const snap = await getDocs(q);
          return snap.docs.map(d=> ({ id:d.id, ...(d.data() as any)}));
        };

        let alterouAlgo = false;
        // Faz no máximo alguns ciclos para evitar processamento infinito em bases muito grandes
        for (let ciclo=0; ciclo<8; ciclo++) {
          const docs = await fetchLote();
          const pendentes = docs.filter(t=> t.categoria && (!t.categoriaEmoji || (t.subcategoria && !t.subcategoriaEmoji)));
          if (!pendentes.length) break;

          const batch = writeBatch(db);
          let updatesCount = 0;
          for (const t of pendentes) {
            const cat = categorias.find(c=> c.id === t.categoria) || categorias.find(c=> (c.nome||'').toLowerCase() === String(t.categoria).toLowerCase());
            if (!cat) continue;
            const subs: any[] = cat.subcategorias || [];
            let catEmoji = cat.emoji || cat.icone;
            let subEmoji: string | undefined;
            if (t.subcategoria) {
              const sub = subs.find(s=> (s.nome||'').toLowerCase() === String(t.subcategoria).toLowerCase());
              if (sub) subEmoji = sub.emoji || sub.icone;
            }
            const toUpdate: any = {};
            if (catEmoji && !t.categoriaEmoji) toUpdate.categoriaEmoji = catEmoji;
            if (subEmoji && !t.subcategoriaEmoji) toUpdate.subcategoriaEmoji = subEmoji;
            if (Object.keys(toUpdate).length) {
              batch.update(doc(db,'users', uid,'transacoes', t.id), toUpdate);
              updatesCount++;
            }
            if (updatesCount >= 450) break; // deixa margem para limite de 500 do batch
          }
          if (updatesCount) {
            await batch.commit();
            alterouAlgo = true;
            console.log(`[EmojiBackfill] ciclo ${ciclo+1}: atualizadas ${updatesCount} transações`);
          } else {
            break; // nada a fazer neste ciclo
          }
        }
        if (alterouAlgo) {
          console.log('[EmojiBackfill] concluído');
        } else {
          console.log('[EmojiBackfill] nada para atualizar');
        }
        console.timeEnd('[EmojiBackfill] total');
        if (typeof window !== 'undefined') localStorage.setItem(LS_KEY,'1');
      } catch (e) {
        console.warn('EmojiBackfill falhou', e);
      }
    })();
  },[]);

  return null;
}
