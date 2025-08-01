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

type ModalProps = {
  onClose: () => void;
};

type Categoria = {
  id: string;
  nome: string;
  emoji?: string;      // Adicione essa linha
  subcategorias?: string[];
};

export default function ModalTransferencia({ onClose }: ModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<string[]>([]);

  // Inputs
  const [contaOrigem, setContaOrigem] = useState("");
  const [contaDestino, setContaDestino] = useState("");
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

        // Carregar contas
        const contasSnap = await getDocs(collection(db, "users", u.uid, "contas"));
        setContas(contasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        // Carregar categorias
        const categoriasSnap = await getDocs(collection(db, "users", u.uid, "categorias"));
        const cat = categoriasSnap.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome || doc.id,
          emoji: doc.data().emoji || "",      // <-- leia o emoji aqui
          subcategorias: doc.data().subcategorias || [],
        }));

        setCategorias(cat);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cat = categorias.find((c) => c.id === categoria);
    setSubcategorias(cat?.subcategorias || []);
    setSubcategoria(""); // Resetar subcategoria ao mudar categoria
  }, [categoria]);

  async function salvarTransacao() {
    if (!user) return alert("Usuário não autenticado.");
    if (!data || !valor || !contaOrigem || !contaDestino)
      return alert("Preencha todos os campos obrigatórios.");

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
        type: "transferencia",
        createdAt: Timestamp.now(),
        contaOrigem,
        contaDestino,
      };

      const colRef = collection(db, "users", user.uid, "transacoes");
      await addDoc(colRef, dados);

      // Atualizar saldo
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
          updateDoc(origemRef, { saldo: saldoOrigem - Number(valor) }),
          updateDoc(destinoRef, { saldo: saldoDestino + Number(valor) }),
        ]);
      }

      alert("Transferência salva com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar transferência:", error);
      alert("Erro ao salvar transferência.");
    }
  }

  return (
    <div
      className="fixed inset-0 text-gray-800 backdrop-blur-xs bg-opacity-50 z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-[90%] max-w-md p-6 rounded-xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
         onClick={onClose}
         className="absolute top-4 right-4 text-gray-500 cursor-pointer"
         >
         <FaTimes />
        </button>
        <h2 className="text-xl text-gray-800 font-bold mb-4">Transferência</h2>

        {/* Conta origem */}
        <div className="mb-2">
          <label className="block text-sm font-semibold text-gray-800">Conta de origem</label>
          <select
            value={contaOrigem}
            onChange={(e) => setContaOrigem(e.target.value)}
            className="w-full p-2 border-2 border-purple-500 rounded-xl focus:outline-0"
          >
            <option value="">Selecione uma conta</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome || c.id}</option>
            ))}
          </select>
        </div>

        {/* Conta destino */}
        <div className="mb-2">
          <label className="block text-sm font-semibold text-gray-800">Conta de destino</label>
          <select
            value={contaDestino}
            onChange={(e) => setContaDestino(e.target.value)}
            className="w-full p-2 border-2 border-purple-500 rounded-xl focus:outline-0"
          >
            <option value="">Selecione uma conta</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome || c.id}</option>
            ))}
          </select>
        </div>

        {/* Categoria */}
        <div className="mb-2">
         <label className="block text-sm font-semibold text-gray-800">Categoria</label>
         <select
           value={categoria}
           onChange={(e) => setCategoria(e.target.value)}
           className="w-full p-2 border-2 border-purple-500 rounded-xl focus:outline-0"
         >
           <option value="">Selecione uma categoria</option>
           {categorias.map((cat) => (
             <option key={cat.id} value={cat.nome}>
               {cat.emoji} {cat.nome}
             </option>
           ))}
         </select>
        </div>

        {/* Subcategoria */}
        {subcategorias.length > 0 && (
          <div className="mb-2">
            <label className="block text-sm font-semibold text-gray-800">Subcategoria</label>
            <select
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              className="w-full p-2 border-2 border-purple-500 rounded-xl focus:outline-0"
            >
              <option value="">Selecione uma subcategoria</option>
              {subcategorias.map((sub, i) => (
                <option key={i} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}

        {/* Data e Valor */}
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-800">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="appearance-none w-full p-2 border-2 border-purple-500 rounded-xl focus:outline-0"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-800">Valor</label>
            <input
              type="number"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full p-2 border-2 border-purple-500 rounded-xl focus:outline-0"
            />
          </div>
        </div>

        {/* Descrição */}
        <div className="mb-2">
          <label className="block text-sm font-semibold text-gray-800">Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full p-2 border-2 border-purple-500 rounded-xl focus:outline-0"
          />
        </div>

        {/* Observações */}
        <div className="mb-2">
          <label className="block text-sm font-semibold text-gray-800">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full p-2 border-2 border-purple-500 rounded-xl "
          />
        </div>

        {/* Recorrente */}
        <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-2">
          <input
            type="checkbox"
            id="transferencia-recorrente"
            className="peer hidden"
            checked={recorrente}
            onChange={(e) => setRecorrente(e.target.checked)}
          />
          <label
            htmlFor="transferencia-recorrente"
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
          <label htmlFor="transferencia-recorrente" className="cursor-pointer">
            É recorrente
          </label>
        </div>

        {/* Ocultar */}
        <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-2">
          <input
            type="checkbox"
            id="transferencia-ocultar"
            className="peer hidden"
            checked={ocultar}
            onChange={(e) => setOcultar(e.target.checked)}
          />
          <label
            htmlFor="transferencia-ocultar"
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
          <label htmlFor="transferencia-ocultar" className="cursor-pointer">
            Ocultar transação dos relatórios
          </label>
        </div>

        <button
          onClick={salvarTransacao}
          className="w-full bg-purple-500 text-white p-2 rounded-2xl hover:bg-purple-600"
        >
          Adicionar transferência
        </button>
      </div>
    </div>
  );
}
