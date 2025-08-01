// DashboardPage.tsx
"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

import CardReceitas from "@/components/cards/CardReceitas";
import CardDespesas from "@/components/cards/CardDespesas";
import CardResultado from "@/components/cards/CardResultado";
import AddCartaoModal from "@/components/modals/ModalAddCartao";
import AddContaModal from "@/components/modals/ModalAddConta";
import CartoesList from "@/components/cards/CardCartoes";
import ContasList from "@/components/cards/CardContas";

import { Cartao } from "../types/types";
import { Conta } from "../types/types";
import { db, auth } from "../lib/firebaseConfig";
import { collection, query, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useMemo } from "react";

export default function DashboardPage() {

dayjs.locale("pt-br");

const months = useMemo(() => {
  const today = dayjs();
  return [
    today.subtract(2, "month"),
    today.subtract(1, "month"),
    today,
    today.add(1, "month"),
    today.add(2, "month"),
  ];
}, []);

  const [currentIndex, setCurrentIndex] = useState(2); // sempre aponta pro "hoje" no centro do array gerado

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContaModalOpen, setIsContaModalOpen] = useState(false);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < months.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleSaveCartao = (data: Cartao) => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Usuário autenticado:", user);
      if (!user) {
        setContas([]);
        setCartoes([]);
        return;
      }

      const contasSnapshot = await getDocs(query(collection(db, "users", user.uid, "contas")));
      const contasData = contasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Conta[];
      setContas(contasData);

      const cartoesSnapshot = await getDocs(query(collection(db, "users", user.uid, "cartoesCredito")));
      const cartoesData = cartoesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Cartao[];
      setCartoes(cartoesData);
    });

    return () => unsubscribe();
  }, [isModalOpen, isContaModalOpen]);

  return (
    <div className="min-h-screen bg-white/97 pb-24 px-4">
      <Header />

      {/* Seletor de Meses */}
      <section className="bg-white h-10 mt-6 px-4 rounded-2xl flex items-center justify-between drop-shadow-lg">
        <div className="flex gap-4 justify-center items-center w-full">
          {[-1, 0, 1].map((offset) => {
            const index = currentIndex + offset;
            const isSelected = offset === 0;
            if (index < 0 || index >= months.length) return null;

            const handleClick = () => {
              if (offset === -1) handlePrev();
              if (offset === 1) handleNext();
            };

            return (
              <span
                key={index}
                onClick={!isSelected ? handleClick : undefined}
                className={`h-10 px-4 flex items-center py-1 rounded-3xl cursor-pointer transition ${
                  isSelected
                    ? "text-gray-800 text-md font-semibold bg-gray-100 cursor-default"
                    : "text-gray-400 hover:text-gray-600 text-sm"
                }`}
              >
                {months[index].format("MMM/YY")}
              </span>
            );
          })}
        </div>
      </section>

      {/* Cards Fixos */}
      <div className="sticky top-0 z-10 mt-2 pt-4 -mx-4 p-4 bg-white/97">
        <div className="flex gap-2 justify-between">
          <CardReceitas mes={months[currentIndex].month()} ano={months[currentIndex].year()} />
          <CardDespesas mes={months[currentIndex].month()} ano={months[currentIndex].year()} />
        </div>
        <CardResultado mes={months[currentIndex].month()} ano={months[currentIndex].year()} />
      </div>

      <CartoesList
        onAdd={() => setIsModalOpen(true)} // ← correto, abre o modal de cartão ✅
        showAll={false}
        setShowAll={() => {}} // aqui você pode implementar corretamente depois
      />

      <ContasList
      onAdd={() => setIsContaModalOpen(true)}
      />

      <AddCartaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCartao}
      />

      <AddContaModal
        isOpen={isContaModalOpen}
        onClose={() => setIsContaModalOpen(false)}
        onSave={(novaConta) => {
          setContas((prev) => [...prev, novaConta]);
          setIsContaModalOpen(false);
        }}
      />
    </div>
  );
}