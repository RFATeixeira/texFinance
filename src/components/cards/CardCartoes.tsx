"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaCreditCard, FaRegCreditCard } from "react-icons/fa";
import { SiMastercard } from "react-icons/si";
import { Cartao } from "@/app/types/types";
import dayjs from "dayjs";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, auth } from "../../app/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import Modal from "@/components/ui/Modal";

type Props = {
  onAdd: () => void;
  showAll: boolean;
  setShowAll: (val: boolean) => void;
};

function getAdjustedDate(day?: number) {
  if (!day || day < 1 || day > 31) return dayjs();
  const now = dayjs();
  return now.date() > day ? now.add(1, "month").date(day) : now.date(day);
}

function getBestPurchaseDay(fechaDay?: number, vencimentoDay?: number) {
  if (!fechaDay || !vencimentoDay) return dayjs().format("DD/MM");
  const now = dayjs();
  let monthToUse = now.date() > vencimentoDay ? now.month() + 1 : now.month();
  return dayjs().month(monthToUse).date(fechaDay).format("DD/MM");
}

export default function CartoesList({ onAdd, showAll, setShowAll }: Props) {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);

  const [cartaoSelecionado, setCartaoSelecionado] = useState<Cartao | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    let unsubscribeSnapshot = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCartoes([]);
        setLoading(false);
        return;
      }

      const q = query(collection(db, "users", user.uid, "cartoesCredito")); 
      unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Cartao[];
        setCartoes(data);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  return (
    <>
      <section className="mt-4 p-3 bg-white rounded-2xl drop-shadow-lg flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <FaRegCreditCard className="text-purple-400" />
            <h2 className="text-md font-semibold text-gray-800">Meus cartões</h2>
          </div>
          <button onClick={onAdd} className="text-purple-400 text-md">
            <FaPlus />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Carregando cartões...</p>
        ) : cartoes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum cartão cadastrado.</p>
        ) : (
          <>
            {cartoes
              .slice(0, showAll ? cartoes.length : 2)
              .map((cartao) => {
                const fechamentoDate = getAdjustedDate(cartao.diaFechamento);
                const vencimentoDate = getAdjustedDate(cartao.diaVencimento);
                const melhorDiaCompra = getBestPurchaseDay(cartao.diaFechamento, cartao.diaVencimento);

                return (
                  <div
                    key={cartao.id}
                    className="bg-gray-50 p-4 rounded-xl text-gray-800 cursor-pointer hover:bg-purple-50 transition"
                    onClick={() => {
                      setCartaoSelecionado(cartao);
                      setEditModalOpen(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-start">
                        <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                          <FaCreditCard className="text-purple-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Cartão de crédito</p>
                          <p className="text-sm font-semibold">{cartao.nome}</p>
                        </div>
                      </div>
                      {cartao.bandeira.toLowerCase().includes("master") ? (
                        <SiMastercard className="text-red-500 text-xl" />
                      ) : (
                        <FaCreditCard className="text-purple-500 text-xl" />
                      )}
                    </div>

                    <div className="mt-4 flex gap-2 items-center">
                      <p className="text-xs text-gray-500">Fatura atual</p>
                      <p className="text-sm font-bold">
                        <span className="text-xs">R$</span> 0,00
                      </p>
                    </div>

                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <p>
                        Fecha{" "}
                        <span className="text-sm font-semibold">
                          {cartao.diaFechamento}/{fechamentoDate.format("MM")}
                        </span>{" "}
                        · Vence{" "}
                        <span className="text-sm font-semibold">
                          {cartao.diaVencimento}/{vencimentoDate.format("MM")}
                        </span>
                      </p>
                      <p>
                        Melhor dia para comprar{" "}
                        <span className="text-sm font-semibold">{melhorDiaCompra}</span>
                      </p>
                    </div>

                    <hr className="my-3 border-gray-200" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Limite em uso</span>
                      <span>Limite total</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400" style={{ width: "0%" }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        R$ <span className="text-sm font-semibold">0,00</span>
                      </span>
                      <span>
                        R$ <span className="text-sm font-semibold">{cartao.limite.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}

            {cartoes.length > 2 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-purple-600 font-semibold text-sm hover:underline"
              >
                {showAll ? "Ver menos cartões" : `Ver mais cartões (${cartoes.length - 2})`}
              </button>
            )}
          </>
        )}
      </section>

      {/* Modal para editar cartão */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Cartão"
      >
        {cartaoSelecionado && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              // Atualize o cartão no Firestore aqui
              setEditModalOpen(false);
            }}
            
          >
            <label className="block text-sm font-medium mb-1">Nome do cartão</label>
            <input
              type="text"
              value={cartaoSelecionado.nome}
              onChange={(e) =>
                setCartaoSelecionado({ ...cartaoSelecionado, nome: e.target.value })
              }
              className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 mb-3"
            />

            <label className="block text-sm font-medium mb-1">Limite</label>
            <input
              type="number"
              value={cartaoSelecionado.limite}
              onChange={(e) =>
                setCartaoSelecionado({
                  ...cartaoSelecionado,
                  limite: Number(e.target.value),
                })
              }
              className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 mb-3"
            />

            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Salvar
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
