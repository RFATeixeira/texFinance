"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaList,
  FaPlus,
  FaChartBar,
  FaUser,
  FaMinus,
  FaExchangeAlt,
} from "react-icons/fa";
import { useEffect, useState } from "react";

import { auth, db } from "../app/lib/firebaseConfig"; // ajuste o caminho se necessário
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { dateStringToTimestamp } from "@/utils/date";

import { TransactionModal } from "@/components/transactions/TransactionModal";
import { TransactionType } from "@/hooks/useTransactionForm";

export default function Navbar() {
  const pathname = usePathname();

  const [showBottomModal, setShowBottomModal] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);

  function linkClass(href: string, isCenter = false) {
    const isActive = pathname === href;
    if (isCenter) {
      return "bg-purple-500/90 p-3 rounded-full cursor-pointer inline-block";
    }
    return `text-xl cursor-pointer ${
      isActive ? "text-purple-400" : "text-gray-400 hover:text-purple-400"
    }`;
  }

  return (
    <>
      {/* Bottom Modal */}
      {showBottomModal && (
        <div
          className="fixed inset-0 z-30 flex justify-center items-end backdrop-blur-xs"
          onClick={() => setShowBottomModal(false)}
        >
          <div
            className="bg-white w-full h-[40%] rounded-t-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg text-purple-500 font-semibold mb-4 bg-purple-300/50 rounded-t-2xl -my-4 -mx-4 p-4">
              Adicionar
            </h2>
            {/* Receita */}
            <div className="border-2 rounded-2xl border-green-300 flex items-center hover:bg-gray-100 px-2 bg-gray-100/30 mb-2">
              <div className="border-2 rounded-full p-1 border-green-300 bg-white">
                <FaPlus className="text-green-300 text-xl" />
              </div>
              <button
                onClick={() => {
                  setShowBottomModal(false);
                  setTransactionType('receita');
                  setTransactionModalOpen(true);
                }}
                className="block w-full text-gray-800 text-xl font-semibold text-left py-2 px-4"
              >
                Receita
              </button>
            </div>
            {/* Despesa */}
            <div className="border-2 rounded-2xl border-red-300 flex items-center hover:bg-gray-100 px-2 bg-gray-100/30 mb-2">
              <div className="border-2 rounded-full p-1 border-red-300 bg-white ">
                <FaMinus className="text-red-300 text-xl" />
              </div>
              <button
                onClick={() => {
                  setShowBottomModal(false);
                  setTransactionType('despesa');
                  setTransactionModalOpen(true);
                }}
                className="block w-full text-gray-800 text-xl font-semibold text-left py-2 px-4 "
              >
                Despesa
              </button>
            </div>
            {/* Transferência */}
            <div className="border-2 rounded-2xl border-blue-300 flex items-center hover:bg-gray-100 px-2 bg-gray-100/30">
              <div className="border-2 rounded-full p-1 border-blue-300 bg-white">
                <FaExchangeAlt className="text-blue-300 text-xl" />
              </div>
              <button
                onClick={() => {
                  setShowBottomModal(false);
                  setTransactionType('transferencia');
                  setTransactionModalOpen(true);
                }}
                className="block w-full text-gray-800 text-xl font-semibold text-left py-2 px-4"
              >
                Transferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal Unificado */}
      {transactionModalOpen && transactionType && (
        <TransactionModal
          open={transactionModalOpen}
          onClose={() => { setTransactionModalOpen(false); setTransactionType(null); }}
          tipo={transactionType}
          onSaved={() => { setTransactionModalOpen(false); setTransactionType(null); }}
        />
      )}

      {/* Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-8 pb-6 z-20 shadow-md">
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          <FaHome className="text-2xl"/>
        </Link>
        <Link href="/transactions" className={linkClass("/transactions")}>
          <FaList className="text-2xl"/>
        </Link>
        <div className="relative -top-6">
          <button onClick={() => setShowBottomModal(true)} className={linkClass("", true)}>
            <FaPlus className="text-white text-3xl" />
          </button>
        </div>
        <Link href="/grafics" className={linkClass("/grafics")}>
          <FaChartBar className="text-2xl"/>
        </Link>
        <Link href="/profile" className={linkClass("/profile")}>
          <FaUser className="text-2xl"/>
        </Link>
      </nav>
    </>
  );
}
