import { db, auth } from '@/app/lib/firebaseConfig';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

/**
 * Sincroniza categorias do usuário atual (id + nome + emojis) para a subcoleção
 * /ambiences/{ambId}/categoryMeta permitindo que outros membros vejam os emojis
 * sem acessar /users/{uid}/categorias.
 */
export async function syncAmbienceCategoryMeta(ambId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    const catsSnap = await getDocs(collection(db,'users', uid,'categorias'));
    const batch: Promise<any>[] = [];
    for (const d of catsSnap.docs) {
      const data: any = d.data();
      const base: any = {
        uid, // dono
        nome: data.nome || '',
        categoriaId: d.id,
        emoji: data.emoji || data.icone || null,
        updatedAt: Date.now(),
      };
      const subs: any[] = data.subcategorias || [];
      if (subs.length) {
        base.subs = subs.map(s=> ({ nome: s.nome, emoji: s.emoji || s.icone || null }));
      }
      batch.push(setDoc(doc(db,'ambiences', ambId,'categoryMeta', `${uid}_${d.id}`), base, { merge: true }));
    }
    await Promise.all(batch);
  } catch (e) {
    console.warn('syncAmbienceCategoryMeta falhou', e);
  }
}
