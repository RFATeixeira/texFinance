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

import ModalReceita from "./modals/ModalReceita";
import ModalDespesa from "./modals/ModalDespesa";
import ModalTransferencia from "./modals/ModalTransferencia";

export default function Navbar() {
  const pathname = usePathname();

  const [showBottomModal, setShowBottomModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddTransferModal, setShowAddTransferModal] = useState(false);

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
                  setShowAddIncomeModal(true);
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
                  setShowAddExpenseModal(true);
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
                  setShowAddTransferModal(true);
                }}
                className="block w-full text-gray-800 text-xl font-semibold text-left py-2 px-4"
              >
                Transferência
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Modais */}
      {showAddIncomeModal && <ModalReceita onClose={() => setShowAddIncomeModal(false)} />}
      {showAddExpenseModal && <ModalDespesa onClose={() => setShowAddExpenseModal(false)} />}
      {showAddTransferModal && <ModalTransferencia onClose={() => setShowAddTransferModal(false)} />}

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

function Modal({
  title,
  type,
  onClose,
}: {
  title?: string;
  type: "receita" | "despesa" | "transferencia";
  onClose: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [cartoes, setCartoes] = useState<any[]>([]);

  // Inputs
  const [conta, setConta] = useState("");
  const [contaOrigem, setContaOrigem] = useState("");
  const [contaDestino, setContaDestino] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ambiente, setAmbiente] = useState("pessoal");
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("");
  const [cartao, setCartao] = useState("");
  const [ocultar, setOcultar] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        const contasRef = collection(db, "users", u.uid, "contas");
        const contasSnap = await getDocs(contasRef);
        const contasData = contasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setContas(contasData);

        const cartoesRef = collection(db, "users", u.uid, "cartoesCredito");
        const cartoesSnap = await getDocs(cartoesRef);
        const cartoesData = cartoesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCartoes(cartoesData);
      }
    });

    return () => unsubscribe();
  }, []);

  async function salvarTransacao() {
  if (!user) {
    alert("Usuário não autenticado.");
    return;
  }

  if (!data || !valor || (!conta && type !== "transferencia") || (type === "transferencia" && (!contaOrigem || !contaDestino))) {
    alert("Por favor preencha todos os campos obrigatórios.");
    return;
  }

  try {
    const dados: any = {
      categoria,
      data: Timestamp.fromDate(new Date(data)),
      valor: Number(valor),
      descricao,
      observacoes,
      recorrente,
      parcelado,
      ocultar,
      type,
      createdAt: Timestamp.now(),
    };

    if (type === "despesa") {
      dados.ambiente = ambiente;
    }

    if (parcelado) {
      dados.quantidadeParcelas = Number(quantidadeParcelas);
      dados.cartao = cartao;
    }

    if (type === "transferencia") {
      dados.contaOrigem = contaOrigem;
      dados.contaDestino = contaDestino;
    } else {
      dados.conta = conta;
    }

    const colRef = collection(db, "users", user.uid, "transacoes");
    await addDoc(colRef, dados);

    // Atualizar saldo das contas
    if (type === "receita") {
      const contaRef = doc(db, "users", user.uid, "contas", conta);
      const contaSnap = await getDoc(contaRef);
      if (contaSnap.exists()) {
        const saldoAtual = contaSnap.data().saldo || 0;
        await updateDoc(contaRef, {
          saldo: saldoAtual + Number(valor),
        });
      }
    }

    if (type === "despesa") {
      const contaRef = doc(db, "users", user.uid, "contas", conta);
      const contaSnap = await getDoc(contaRef);
      if (contaSnap.exists()) {
        const saldoAtual = contaSnap.data().saldo || 0;
        await updateDoc(contaRef, {
          saldo: saldoAtual - Number(valor),
        });
      }
    }

    if (type === "transferencia") {
      const origemRef = doc(db, "users", user.uid, "contas", contaOrigem);
      const destinoRef = doc(db, "users", user.uid, "contas", contaDestino);

      const [origemSnap, destinoSnap] = await Promise.all([
        getDoc(origemRef),
        getDoc(destinoRef),
      ]);

      if (origemSnap.exists() && destinoSnap.exists()) {
        const saldoOrigem = origemSnap.data().saldo || 0;
        const saldoDestino = destinoSnap.data().saldo || 0;

        await Promise.all([
          updateDoc(origemRef, {
            saldo: saldoOrigem - Number(valor),
          }),
          updateDoc(destinoRef, {
            saldo: saldoDestino + Number(valor),
          }),
        ]);
      }
    }

    alert("Transação salva com sucesso!");
    onClose();
  } catch (error) {
    console.error("Erro ao salvar transação:", error);
    alert("Erro ao salvar transação.");
  }
}

  return (
    <div
      className="fixed inset-0 backdrop-blur-xs bg-opacity-50 z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-[90%] max-w-md p-6 rounded-xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl text-gray-800 font-bold mb-4">{title}</h2>

        {/* Contas */}
        {type === "transferencia" ? (
          <>
            <div className="mb-2">
              <label className="block text-gray-800 text-sm font-semibold">
                Conta de origem
              </label>
              <select
                value={contaOrigem}
                onChange={(e) => setContaOrigem(e.target.value)}
                className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
              >
                <option value="">Selecione uma conta de origem</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <label className="block text-gray-800 text-sm font-semibold">
                Conta de destino
              </label>
              <select
                value={contaDestino}
                onChange={(e) => setContaDestino(e.target.value)}
                className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
              >
                <option value="">Selecione uma conta de destino</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="mb-2">
            <label className="block text-gray-800 text-sm font-semibold">Conta</label>
            <select
              value={conta}
              onChange={(e) => setConta(e.target.value)}
              className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
            >
              <option value="">Selecione uma conta</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome || c.id}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-2">
          <label className="block text-gray-800 text-sm font-semibold">Categoria</label>
          <input
            type="text"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
          />
        </div>

        <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-2">
          <input
            type="checkbox"
            id={`${title}-ocultar`}
            className="peer hidden"
            checked={ocultar}
            onChange={(e) => setOcultar(e.target.checked)}
          />
          <label
            htmlFor={`${title}-ocultar`}
            className="w-5 h-5 border-2 border-purple-500 rounded-md flex items-center justify-center peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-colors cursor-pointer"
          >
            <svg
              className="w-3 h-3 text-white hidden peer-checked:block"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </label>

          <label htmlFor={`${title}-ocultar`} className="cursor-pointer">
            Ocultar transação dos relatórios
          </label>
        </div>

        <button
          onClick={salvarTransacao}
          className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
        >
          Adicionar {title ? title.toLowerCase() : ""}
        </button>
      </div>
    </div>
  );
}