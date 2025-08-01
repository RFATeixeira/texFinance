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

type AmbienteType = {
  id: string;
  nome: string;
};

type ModalProps = {
  onClose: () => void;
};

export default function ModalDespesa({ onClose }: ModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<CategoriaType[]>([]);
  const [ambientes, setAmbientes] = useState<AmbienteType[]>([]);

  // Inputs
  const [conta, setConta] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [subcategoriaSelecionada, setSubcategoriaSelecionada] = useState("");
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

        // Buscar contas do usuário
        const contasRef = collection(db, "users", u.uid, "contas");
        const contasSnap = await getDocs(contasRef);
        setContas(contasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        // Buscar cartões do usuário
        const cartoesRef = collection(db, "users", u.uid, "cartoesCredito");
        const cartoesSnap = await getDocs(cartoesRef);
        setCartoes(cartoesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        // Buscar categorias do usuário
        const categoriasRef = collection(db, "users", u.uid, "categorias");
        const categoriasSnap = await getDocs(categoriasRef);
        const cats: CategoriaType[] = categoriasSnap.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome,
          emoji: doc.data().emoji,
          subcategorias: doc.data().subcategorias || [],
        }));
        setCategorias(cats);

        // Buscar ambientes da coleção "ambiences"
        const ambientesRef = collection(db, "ambiences");
        const ambientesSnap = await getDocs(ambientesRef);
        const listaAmbientes = ambientesSnap.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome || `Ambiente ${doc.id}`,
        }));

        // Adicionar opção "pessoal" no início da lista
        setAmbientes([{ id: "pessoal", nome: "Pessoal" }, ...listaAmbientes]);
      }
    });

    return () => unsubscribe();
  }, []);

  async function salvarTransacao() {
  if (!user) {
    alert("Usuário não autenticado.");
    return;
  }

  if (!data || !valor || (!parcelado && !conta)) {
    alert("Por favor preencha todos os campos obrigatórios.");
    return;
  }

  try {
    const dados: any = {
      categoria: categoriaSelecionada,
      subcategoria: subcategoriaSelecionada || null,
      data: Timestamp.fromDate(new Date(data)),
      valor: Number(valor),
      descricao,
      observacoes,
      recorrente,
      parcelado,
      ocultar,
      ambiente, // ← indica se é "pessoal" ou id de ambiente
      type: "despesa",
      createdAt: Timestamp.now(),
    };

    if (parcelado) {
      dados.quantidadeParcelas = Number(quantidadeParcelas);
      dados.cartao = cartao;
    } else {
      dados.conta = conta;
    }

    // Salvar unicamente dentro de users/{uid}/transacoes
    const userTransacoesRef = collection(db, "users", user.uid, "transacoes");
    await addDoc(userTransacoesRef, dados);

    // Atualizar saldo da conta, se for pessoal e não for parcelado
    if (!parcelado && ambiente === "pessoal") {
      const contaRef = doc(db, "users", user.uid, "contas", conta);
      const contaSnap = await getDoc(contaRef);
      if (contaSnap.exists()) {
        const saldoAtual = contaSnap.data().saldo || 0;
        await updateDoc(contaRef, {
          saldo: saldoAtual - Number(valor),
        });
      }
    }

    alert("Despesa salva com sucesso!");
    onClose();
  } catch (error) {
    console.error("Erro ao salvar despesa:", error);
    alert("Erro ao salvar despesa.");
  }
}

  return (
    <div
      className="fixed inset-0 backdrop-blur-xs bg-opacity-50 z-40 flex justify-center items-center"
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
        <h2 className="text-xl text-gray-800 font-bold mb-4">Despesa</h2>

        {/* Se NÃO for parcelado mostra select conta */}
        {!parcelado && (
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

        {/* Categoria */}
        <div className="mb-2">
          <label className="block text-gray-800 text-sm font-semibold">Categoria</label>
          <select
            value={categoriaSelecionada}
            onChange={(e) => {
              setCategoriaSelecionada(e.target.value);
              setSubcategoriaSelecionada(""); // reset subcategoria ao trocar categoria
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

        {/* Subcategoria */}
        {categoriaSelecionada && (
          <div className="mb-2">
            <label className="block text-gray-800 text-sm font-semibold">Subcategoria</label>
            <select
              value={subcategoriaSelecionada}
              onChange={(e) => setSubcategoriaSelecionada(e.target.value)}
              className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
            >
              <option value="">Selecione uma subcategoria</option>
              {categorias
                .find((cat) => cat.id === categoriaSelecionada)
                ?.subcategorias.map((sub, idx) => (
                  <option key={idx} value={sub.nome}>
                    {sub.emoji} {sub.nome}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Ambiente */}
        <div className="mb-2">
          <label className="block text-gray-800 text-sm font-semibold">Ambiente</label>
          <select
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value)}
            className="w-full p-2 border-2 border-purple-500 rounded-xl outline-0 text-gray-600"
          >
            {ambientes.map((amb) => (
              <option key={amb.id} value={amb.id}>
                {amb.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="block text-gray-800 text-sm font-semibold">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="appearance-none w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
          />
        </div>
        <div className="mb-2">
          <label className="block text-gray-800 text-sm font-semibold">Valor</label>
          <input
            type="number"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
          />
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
            id="despesa-recorrente"
            className="peer hidden"
            checked={recorrente}
            onChange={(e) => setRecorrente(e.target.checked)}
          />
          <label
            htmlFor="despesa-recorrente"
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
          <label htmlFor="despesa-recorrente" className="cursor-pointer">
            É recorrente
          </label>
        </div>

        <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-2">
          <input
            type="checkbox"
            id="despesa-parcelado"
            className="peer hidden"
            checked={parcelado}
            onChange={(e) => setParcelado(e.target.checked)}
          />
          <label
            htmlFor="despesa-parcelado"
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
          <label htmlFor="despesa-parcelado" className="cursor-pointer">
            É parcelado
          </label>
        </div>

        {parcelado && (
          <>
            <div className="mb-2">
              <label className="block text-gray-800 text-sm font-semibold">
                Quantidade de parcelas
              </label>
              <input
                type="number"
                value={quantidadeParcelas}
                onChange={(e) => setQuantidadeParcelas(e.target.value)}
                className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-moz-appearance]:textfield"
              />
            </div>
            <div className="mb-2">
              <label className="block text-gray-800 text-sm font-semibold">Cartão</label>
              <select
                value={cartao}
                onChange={(e) => setCartao(e.target.value)}
                className="w-full p-2 text-gray-600 border-2 border-purple-500 outline-0 rounded-xl"
              >
                <option value="">Selecione um cartão</option>
                                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome || c.id}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          onClick={salvarTransacao}
          className="w-full bg-purple-500 text-white p-2 mt-4 rounded-2xl font-semibold hover:bg-purple-600 transition"
        >
          Salvar despesa
        </button>
      </div>
    </div>
  );
}

