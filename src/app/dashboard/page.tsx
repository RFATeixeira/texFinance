// DashboardPage.tsx
"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

import CardReceitas from "@/components/cards/CardReceitas";
import CardDespesas from "@/components/cards/CardDespesas";
import CardResultado from "@/components/cards/CardResultado";
import CardInvestimentos from "@/components/cards/CardInvestimentos";
import EntityModal from "@/components/modals/EntityModal";
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
  const list: dayjs.Dayjs[] = [];
  for (let i = 4; i > 0; i--) list.push(today.subtract(i, 'month'));
  list.push(today);
  for (let i = 1; i <= 4; i++) list.push(today.add(i, 'month'));
  return list; // ordem cronológica: -4 .. hoje .. +4
}, []);

  const [currentIndex, setCurrentIndex] = useState(4); // índice do mês atual (posição central)

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContaModalOpen, setIsContaModalOpen] = useState(false);
  const [entityModal, setEntityModal] = useState<{open:boolean; type: 'conta'|'cartao'|'ambiente'|null}>({open:false,type:null});
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
  <div className="min-h-screen bg-white/97 pb-24 px-4 md:px-8">
      <Header />

      {/* Seletor de Meses (janela: anterior / atual / próximo) */}
      <section className="bg-white h-10 mt-6 px-4 rounded-2xl flex items-center justify-between drop-shadow-lg">
        <div className="flex gap-4 justify-center items-center w-full">
          {[-1,0,1].map(offset => {
            const index = currentIndex + offset;
            if(index < 0 || index >= months.length) return null;
            const isSelected = offset === 0;
            const handleClick = () => {
              if(offset === -1) handlePrev();
              if(offset === 1) handleNext();
            };
            return (
              <span
                key={index}
                onClick={!isSelected ? handleClick : undefined}
                className={`h-10 px-4 flex items-center py-1 rounded-3xl cursor-pointer transition ${isSelected ? 'text-gray-800 text-md font-semibold bg-gray-100 cursor-default' : 'text-gray-400 hover:text-gray-600 text-sm'}`}
              >
                {months[index].format('MMM/YY')}
              </span>
            );
          })}
        </div>
      </section>

  {/* Cards Fixos (sticky) - full bleed background */}
  <div className="mt-4 -mx-4 md:-mx-8 sticky top-0 z-30">
  <div className="bg-white/90 backdrop-blur-md border-b border-gray-100/70 py-3 px-4 md:px-8 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2">
      <div className="col-span-1">
        <CardReceitas mes={months[currentIndex].month()} ano={months[currentIndex].year()} />
      </div>
      <div className="col-span-1">
        <CardDespesas mes={months[currentIndex].month()} ano={months[currentIndex].year()} />
      </div>
      <div className="col-span-2 md:col-span-1 lg:col-span-1">
        <CardResultado mes={months[currentIndex].month()} ano={months[currentIndex].year()} />
      </div>
      <div className="col-span-2 md:col-span-1 lg:col-span-1">
        <CardInvestimentos />
      </div>
    </div>
  </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <CartoesList
        onAdd={() => setEntityModal({open:true,type:'cartao'})} // substituído
        showAll={false}
        setShowAll={() => {}} // aqui você pode implementar corretamente depois
        />
        <ContasList
          onAdd={() => setEntityModal({open:true,type:'conta'})}
        />
      </div>

      {/* Removidos AddCartaoModal e AddContaModal em favor do EntityModal */}
      <EntityModal
        open={entityModal.open && !!entityModal.type}
        type={entityModal.type as any}
        onClose={() => setEntityModal({open:false,type:null})}
        onSaved={() => setEntityModal({open:false,type:null})}
      />
    </div>
  );
}