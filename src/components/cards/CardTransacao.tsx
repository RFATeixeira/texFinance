"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../app/lib/firebaseConfig";
import { TransactionModal } from "@/components/transactions/TransactionModal";

export default function CardTransacao({ transacao, onAtualizar }: { transacao: any;onAtualizar: () => void }) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("❓");
  const [userId, setUserId] = useState<string | null>(null);

  const tipo = transacao.type;

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
    if (!transacao.categoria || !transacao.subcategoria || !userId) return;

    try {
      const categoriaRef = doc(db, "users", userId, "categorias", transacao.categoria);
      const categoriaSnap = await getDoc(categoriaRef);

      if (categoriaSnap.exists()) {
        const categoriaData = categoriaSnap.data();
        const subcategorias = categoriaData.subcategorias || [];
        // procura o item no array de subcategorias com o nome igual ao da transação
        const subcatData = subcategorias.find(
          (subcat: any) => subcat.nome === transacao.subcategoria
        );

        if (subcatData?.emoji) {
          setEmoji(subcatData.emoji);
        } else {
          setEmoji("❓");
        }
      } else {
        setEmoji("❓");
      }
    } catch (err) {
      console.error("Erro ao buscar emoji:", err);
      setEmoji("❓");
    }
  }

  fetchEmoji();
}, [transacao.categoria, transacao.subcategoria, userId]);


  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-white p-4 rounded-2xl shadow-xl hover:shadow-2xl cursor-pointer flex justify-between items-center"
      >
        <div>
          <p className="font-medium">{transacao.descricao}</p>
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
