"use client";

import { useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../app/lib/firebaseConfig";
import { FaTimes } from "react-icons/fa";

type CategoriaType = {
  id: string;
  nome: string;
  emoji: string;
  subcategorias: { nome: string; emoji: string }[];
};

type ModalProps = {
  onClose: () => void;
};

export default function ModalReceita({ onClose }: ModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<CategoriaType[]>([]);

  // Inputs
  const [conta, setConta] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [ocultar, setOcultar] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        const contasRef = collection(db, "users", u.uid, "contas");
        const contasSnap = await getDocs(contasRef);
        setContas(contasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const categoriasRef = collection(db, "users", u.uid, "categorias");
        const catSnap = await getDocs(categoriasRef);
        const catData: CategoriaType[] = catSnap.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome,
          emoji: doc.data().emoji || "📁",
          subcategorias: doc.data().subcategorias || [],
        }));
        setCategorias(catData);
      }
    });

    return () => unsubscribe();
  }, []);

  async function salvarTransacao() {
    if (!user) return alert("Usuário não autenticado.");
    if (!data || !valor || !conta || !categoria) {
      return alert("Preencha todos os campos obrigatórios.");
    }

    try {
      const dados: any = {
        categoria,
        subcategoria,
        data: Timestamp.fromDate(new Date(data)),
        valor: Number(valor),
        descricao,
        observacoes,
        recorrente,
        ocultar,
        type: "receita",
        conta,
        createdAt: Timestamp.now(),
      };

      const colRef = collection(db, "users", user.uid, "transacoes");
      await addDoc(colRef, dados);

      const contaRef = doc(db, "users", user.uid, "contas", conta);
      const contaSnap = await getDoc(contaRef);
      if (contaSnap.exists()) {
        const saldoAtual = contaSnap.data().saldo || 0;
        await updateDoc(contaRef, {
          saldo: saldoAtual + Number(valor),
        });
      }

      alert("Receita salva com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar receita:", error);
      alert("Erro ao salvar receita.");
    }
  }

  const subcategoriasDisponiveis =
    categorias.find((c) => c.id === categoria)?.subcategorias || [];

  return (
    <div
      className="fixed inset-0 backdrop-blur-xs bg-opacity-50 z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-[90%] max-w-md p-6 rounded-xl shadow-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
         onClick={onClose}
         className="absolute top-4 right-4 text-gray-500 cursor-pointer"
        >
         <FaTimes />
        </button>
        <h2 className="text-xl text-gray-800 font-bold mb-4">Receita</h2>

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

        <div className="mb-2">
          <label className="block text-gray-800 text-sm font-semibold">Categoria</label>
          <select
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setSubcategoria(""); // limpa subcategoria quando categoria muda
            }}
            className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
          >
            <option value="">Selecione uma categoria</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.nome}
              </option>
            ))}
          </select>
        </div>

        {subcategoriasDisponiveis.length > 0 && (
          <div className="mb-2">
            <label className="block text-gray-800 text-sm font-semibold">Subcategoria</label>
            <select
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
            >
              <option value="">Selecione uma subcategoria</option>
              {subcategoriasDisponiveis.map((sub, i) => (
                <option key={i} value={sub.nome}>
                  {sub.emoji} {sub.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <label className="block text-gray-800 text-sm font-semibold">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="appearance-none w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-800 text-sm font-semibold">Valor</label>
            <input
              type="number"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="block text-gray-800 text-sm font-semibold">Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
          />
        </div>

        <div className="mb-2">
          <label className="block text-sm font-semibold text-gray-800">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
          />
        </div>

        <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-2">
          <input
            type="checkbox"
            id="receita-recorrente"
            className="peer hidden"
            checked={recorrente}
            onChange={(e) => setRecorrente(e.target.checked)}
          />
          <label
            htmlFor="receita-recorrente"
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
          <label htmlFor="receita-recorrente" className="cursor-pointer">
            É recorrente
          </label>
        </div>

        <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-2">
          <input
            type="checkbox"
            id="receita-ocultar"
            className="peer hidden"
            checked={ocultar}
            onChange={(e) => setOcultar(e.target.checked)}
          />
          <label
            htmlFor="receita-ocultar"
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
          <label htmlFor="receita-ocultar" className="cursor-pointer">
            Ocultar transação dos relatórios
          </label>
        </div>

        <button
          onClick={salvarTransacao}
          className="w-full bg-purple-500 text-white p-2 rounded-2xl hover:bg-purple-600"
        >
          Adicionar receita
        </button>
      </div>
    </div>
  );
}
