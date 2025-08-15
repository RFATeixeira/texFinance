"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import EntityEditModal from "@/components/modals/EntityEditModal";

type CategoriaType = {
  id: string;
  nome: string;
  emoji: string;
  subcategorias: { nome: string; emoji: string }[];
  fixed?: boolean;
};

const categoriasFixas: CategoriaType[] = [
  {
    id: "alimentacao",
    nome: "Alimentação",
    emoji: "🍔",
    subcategorias: [
      { nome: "Restaurantes", emoji: "🍽️" },
      { nome: "Lanches", emoji: "🍟" },
      { nome: "Delivery", emoji: "🚚" },
    ],
    fixed: true,
  },
  {
    id: "receitas",
    nome: "Receitas",
    emoji: "💵",
    subcategorias: [
      { nome: "Salário", emoji: "💰" },
      { nome: "Freelancer", emoji: "🧑‍💻" },
      { nome: "Dividendos", emoji: "🤑" },
      { nome: "Auxílio", emoji: "🪙" },
      { nome: "Vale", emoji: "💶" },
      { nome: "Extra", emoji: "💸" },
    ],
    fixed: true,
  },
  {
    id: "saude",
    nome: "Saúde",
    emoji: "🩺",
    subcategorias: [
      { nome: "Medicamentos", emoji: "💊" },
      { nome: "Consultas", emoji: "👨‍⚕️" },
      { nome: "Dentista", emoji: "🦷" },
      { nome: "Cirurgia", emoji: "🩸" },
      
    ],
    fixed: true,
  },
  {
    id: "pagamento-fatura",
    nome: "Pagamento Fatura",
    emoji: "💳",
    subcategorias: [
      { nome: "Cartão de crédito", emoji: "💳" },
      { nome: "Boleto", emoji: "📄" },
      { nome: "Débito automático", emoji: "🏦" },
    ],
    fixed: true,
  },
  {
    id: "moradia",
    nome: "Moradia",
    emoji: "🏠",
    subcategorias: [
      { nome: "Aluguel", emoji: "🏡" },
      { nome: "Condominio", emoji: "🧱" },
      { nome: "Água", emoji: "💧" },
      { nome: "Energia", emoji: "⚡" },
      { nome: "Gás", emoji: "💨" },
      { nome: "Internet", emoji: "🌐" },
    ],
    fixed: true,
  },
  {
    id: "transporte",
    nome: "Transporte",
    emoji: "🚗",
    subcategorias: [
      { nome: "Combustivel", emoji: "⛽" },
      { nome: "Oficina", emoji: "🧑‍🔧" },
      { nome: "Pneus", emoji: "🛞" },
    ],
    fixed: true,
  },
  // ...adicione outras categorias fixas aqui
];

export default function CategoriasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [categorias, setCategorias] = useState<CategoriaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCategoria, setModalCategoria] = useState<null | CategoriaType>(null);
  const [modalSubcategoria, setModalSubcategoria] = useState<{
    categoriaId: string;
    subcategoria?: { nome: string; emoji: string };
  } | null>(null);

  // Verifica e cria categorias fixas no Firestore caso não existam
  async function inicializarCategoriasFixas(uid: string) {
    for (const cat of categoriasFixas) {
      const docRef = doc(db, "users", uid, "categorias", cat.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, cat);
      }
    }
    // Seed emojis globais caso coleção global esteja vazia
    try {
      const globalRef = collection(db,'global','meta','emojis');
      const snap = await getDocs(globalRef);
      if (snap.empty) {
        for (const cat of categoriasFixas) {
          const base = [cat.emoji, ...cat.subcategorias.map(s=> s.emoji)];
          for (const em of base) {
            if(!em) continue;
            await addDoc(globalRef,{ valor: em });
          }
        }
      }
    } catch(e){ /* silencioso */ }
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      if (u) {
        // Inicializa categorias fixas para o usuário logado
        inicializarCategoriasFixas(u.uid).catch(console.error);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const categoriasRef = collection(db, "users", user.uid, "categorias");
    const q = query(categoriasRef, orderBy("nome"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userCategorias: CategoriaType[] = [];
      snapshot.forEach((doc) => {
        userCategorias.push({
          id: doc.id,
          nome: doc.data().nome,
          emoji: doc.data().emoji || "📁",
          subcategorias: doc.data().subcategorias || [],
          fixed: doc.data().fixed || false,
        });
      });

      setCategorias(userCategorias);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCategoriaClick = (categoria: CategoriaType) => {
    if (!categoria.fixed) setModalCategoria(categoria);
  };

  const handleSubcategoriaClick = (catId: string, sub: { nome: string; emoji: string }) => {
    setModalSubcategoria({ categoriaId: catId, subcategoria: sub });
  };

  return (
  <div className="h-full mx-auto p-4 bg-white/97 text-gray-800 mb-14 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <button
          className="text-purple-500 text-4xl cursor-pointer"
          onClick={() =>
            setModalCategoria({ id: "", nome: "", emoji: "📁", subcategorias: [] })
          }
        >
          +
        </button>
      </div>

  <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr w-full">
        {categorias.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl shadow p-4 h-full flex flex-col">
            <div className="flex flex-row justify-between">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => handleCategoriaClick(cat)}
              >
                <span className="text-xl">{cat.emoji}</span>
                <h2 className="text-lg font-semibold">{cat.nome}</h2>
              </div>
              <button
                onClick={() =>
                  setModalSubcategoria({ categoriaId: cat.id, subcategoria: undefined })
                }
                className="text-purple-500 text-3xl cursor-pointer"
              >
                +
              </button>
            </div>
            <hr className="my-4 border-t border-gray-300" />
            <div className="flex justify-center items-center -translate-y-11 -mb-8">
              <p className="text-center text-sm text-gray-500 mt-4 px-2 bg-white w-fit">
                Subcategorias
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {cat.subcategorias.map((sub, index) => (
                <div
                  key={index}
                  onClick={() => handleSubcategoriaClick(cat.id, sub)}
                  className="bg-gray-100 rounded-xl py-3 px-1 flex items-center gap-2 cursor-pointer hover:bg-gray-200"
                >
                  <span className="text-xl">{sub.emoji}</span>
                  <span className="text-gray-800 text-xs overflow-hidden">{sub.nome}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {user && modalCategoria && (
        <EntityEditModal
          open={!!modalCategoria}
          kind="categoria"
          onClose={() => setModalCategoria(null)}
          initialData={
            modalCategoria.id ? { nome: modalCategoria.nome, icone: modalCategoria.emoji } : undefined
          }
          onSave={async ({ nome, icone }) => {
            const id = modalCategoria.id || nome.toLowerCase().replace(/\s/g, "-");
            await setDoc(doc(db, "users", user!.uid, "categorias", id), {
              nome,
              emoji: icone,
              subcategorias: modalCategoria.subcategorias ?? [],
              fixed: false,
            });
            setModalCategoria(null);
          }}
          onDelete={
            modalCategoria.id
              ? async () => {
                  try {
                    await deleteDoc(doc(db, "users", user.uid, "categorias", modalCategoria.id));
                    setModalCategoria(null);
                  } catch (error) {
                    console.error("Erro ao deletar categoria:", error);
                  }
                }
              : undefined
          }
        />
      )}

      {user && modalSubcategoria && (
        <EntityEditModal
          open={!!modalSubcategoria}
          kind="subcategoria"
          onClose={() => setModalSubcategoria(null)}
          initialData={
            modalSubcategoria.subcategoria
              ? { nome: modalSubcategoria.subcategoria.nome, icone: modalSubcategoria.subcategoria.emoji }
              : undefined
          }
          onSave={async ({ nome, icone }) => {
            const catDocRef = doc(db, "users", user!.uid, "categorias", modalSubcategoria.categoriaId);
            const docSnap = await getDoc(catDocRef);
            const catData = docSnap.data();

            const subcategorias = catData?.subcategorias || [];
            const updated = modalSubcategoria.subcategoria
              ? subcategorias.map((s: any) =>
                  s.nome === modalSubcategoria.subcategoria?.nome ? { nome, emoji: icone } : s
                )
              : [...subcategorias, { nome, emoji: icone }];

            await updateDoc(catDocRef, { subcategorias: updated });
            setModalSubcategoria(null);
          }}
          onDelete={
            modalSubcategoria.subcategoria
              ? async () => {
                  const catDocRef = doc(db, "users", user!.uid, "categorias", modalSubcategoria.categoriaId);
                  const docSnap = await getDoc(catDocRef);
                  const catData = docSnap.data();

                  const subcategorias = catData?.subcategorias || [];
                  const filtered = subcategorias.filter((s: { nome: string | undefined }) => s.nome !== modalSubcategoria.subcategoria?.nome);

                  await updateDoc(catDocRef, { subcategorias: filtered });
                  setModalSubcategoria(null);
                }
              : undefined
          }
        />
      )}

    </div>
  );
}
