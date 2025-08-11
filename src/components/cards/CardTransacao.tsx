"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../app/lib/firebaseConfig";
import { TransactionModal } from "@/components/transactions/TransactionModal";

export default function CardTransacao({ transacao, onAtualizar }: { transacao: any;onAtualizar: () => void }) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("❓");
  const [userId, setUserId] = useState<string | null>(null);

  const tipo = transacao.customType || transacao.type;

  const cor =
    tipo === "receita"
      ? "text-green-600"
      : tipo === "despesa"
      ? "text-red-600"
      : "text-blue-600";

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserId(user.uid);
    }
  }, []);

  useEffect(() => {
    async function fetchEmoji() {
      const fallback = transacao.type === 'receita' ? '💰' : transacao.type === 'transferencia' ? '🔄' : '💸';
  if (!transacao.categoria) { setEmoji(fallback); return; }
      const ownerUid = transacao.uid || transacao.userId || transacao.ownerId || userId; // tenta diversos campos
  if (!ownerUid) { setEmoji(fallback); return; }
      try {
        let categoriaData: any | null = null;
        // 1) Tenta por ID direto
        const categoriaRef = doc(db, 'users', ownerUid, 'categorias', transacao.categoria);
        const categoriaSnap = await getDoc(categoriaRef);
        if (categoriaSnap.exists()) {
          categoriaData = categoriaSnap.data();
        } else {
          // 2) Tenta buscar por nome (case-insensitive) entre todas categorias
            const catsSnap = await getDocs(collection(db, 'users', ownerUid, 'categorias'));
            for (const c of catsSnap.docs) {
              const data = c.data();
              if (data.nome && typeof data.nome === 'string') {
                if (data.nome.toLowerCase() === String(transacao.categoria).toLowerCase()) {
                  categoriaData = data;
                  break;
                }
              }
            }
        }
        if (!categoriaData) {
          console.debug('[CardTransacao] Categoria não encontrada', { categoria: transacao.categoria, ownerUid });
          setEmoji(fallback);
          return;
        }
        const subcategorias: any[] = categoriaData.subcategorias || [];
        let chosen: string | null = null;
        if (transacao.subcategoria) {
          const subcatData = subcategorias.find(s => (s.nome||'').toLowerCase() === String(transacao.subcategoria).toLowerCase());
          if (subcatData) {
            chosen = subcatData.emoji || subcatData.icone || null;
          }
        }
        if (!chosen) chosen = categoriaData.emoji || categoriaData.icone || null;
        if (!chosen) console.debug('[CardTransacao] Sem emoji definido, usando fallback', { categoria: transacao.categoria, subcategoria: transacao.subcategoria });
        setEmoji(chosen || fallback);
      } catch (err) {
        console.error('[CardTransacao] Erro ao buscar emoji:', err);
    setEmoji(fallback);
      }
    }
    fetchEmoji();
  }, [transacao.categoria, transacao.subcategoria, transacao.uid, transacao.userId, transacao.ownerId, userId]);


  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-white p-4 rounded-2xl shadow-xl hover:shadow-2xl cursor-pointer flex justify-between items-center"
      >
        <div>
          <p className="font-medium flex items-center gap-2 flex-wrap">
            <span>{transacao.descricao}</span>
            {typeof transacao.parcelaNumero === "number" && typeof transacao.parcelas === "number" && transacao.parcelas > 1 && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1
                  ${transacao.paid ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-purple-100 border-purple-300 text-purple-700"}`}
                title={`Parcela ${transacao.parcelaNumero} de ${transacao.parcelas}`}
              >
                {transacao.parcelaNumero}/{transacao.parcelas}
                {!transacao.paid && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />}
              </span>
            )}
          </p>
          <p className={`${cor} font-semibold`}>
            R$ {transacao.valor.toFixed(2)}
          </p>
        </div>
        <div className="text-2xl">{emoji}</div>
      </div>

      <TransactionModal
        open={open}
        onClose={() => setOpen(false)}
        tipo={tipo}
        transacao={transacao}
        onSaved={() => {
          setOpen(false);
          onAtualizar();
        }}
      />
    </>
  );
}
