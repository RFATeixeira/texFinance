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
  FaTags,
  FaChartLine,
  FaUsers,
  FaUserCog,
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
          className="fixed inset-0 z-10 md:z-30 flex md:items-center md:justify-center items-end justify-center backdrop-blur-xs"
          onClick={() => setShowBottomModal(false)}
        >
          <div
            className="bg-white w-full md:max-w-md md:rounded-2xl md:h-auto h-[40%] rounded-t-2xl p-4 mx-2 md:mx-0 md:shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg text-purple-500 font-semibold mb-2 md:mb-4 bg-purple-300/50 rounded-t-2xl -my-4 -mx-4 p-4 md:rounded-2xl md:my-0 md:mx-0">
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

  {/* Mobile Bottom Navbar */}
  <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center px-8 pb-6 z-20 shadow-md">
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

      {/* Desktop Sidebar */}
  <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-gray-200 z-40 shadow-sm">
        <div className="h-16 flex items-center px-5 border-b border-gray-100 font-semibold text-purple-600 tracking-wide">
          Tex Finance
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 text-sm">
          <SidebarLink href="/dashboard" icon={<FaHome />} active={pathname==="/dashboard"}>Dashboard</SidebarLink>
          <SidebarLink href="/transactions" icon={<FaList />} active={pathname==="/transactions"}>Transações</SidebarLink>
          <SidebarLink href="/grafics" icon={<FaChartBar />} active={pathname==="/grafics"}>Gráficos</SidebarLink>
          <SidebarLink href="/profile" icon={<FaUser />} active={pathname==="/profile"}>Perfil</SidebarLink>
          {/* Sub-links perfil (desktop only) */}
          <div className="mt-2 space-y-1">
            <SidebarLink href="/profile/categorias" icon={<FaTags />} active={pathname==="/profile/categorias"}>Categorias</SidebarLink>
            <SidebarLink href="/profile/investimentos" icon={<FaChartLine />} active={pathname==="/profile/investimentos"}>Investimentos</SidebarLink>
            <SidebarLink href="/profile/ambience" icon={<FaUsers />} active={pathname==="/profile/ambience"}>Ambientes</SidebarLink>
            <SidebarLink href="/profile/configuracoes" icon={<FaUserCog />} active={pathname==="/profile/configuracoes"}>Configurações</SidebarLink>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setShowBottomModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-2 text-sm font-medium transition"
          >
            <FaPlus className="text-base" /> Nova
          </button>
        </div>
      </aside>
    </>
  );
}

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

function SidebarLink({ href, icon, children, active }: SidebarLinkProps){
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition text-[0.85rem] font-medium ${active ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
    >
      <span className={`text-lg ${active? 'text-purple-600':'text-gray-400'}`}>{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

