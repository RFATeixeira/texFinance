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
  writeBatch,
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
  // Subcategorias removidas: estado/toggle/migração eliminados

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
  // Garantir ordenação alfabética (defensivo, já usamos orderBy no query)
  userCategorias.sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR',{ sensitivity:'base'}));
  // Ordenar subcategorias dentro de cada categoria
  userCategorias.forEach(c=> c.subcategorias.sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR',{ sensitivity:'base'})));
  setCategorias(userCategorias);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCategoriaClick = (categoria: CategoriaType) => {
    if (!categoria.fixed) setModalCategoria(categoria);
  };

  // Sem subcategorias

  return (
  <div className="h-full mx-auto p-4 bg-white/97 text-gray-800 mb-14 w-full">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex justify-between items-center">
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
      </div>
      <div className="grid gap-4 md:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {categorias.map(cat => (
          <div key={cat.id} className="bg-white shadow rounded-xl p-3 flex flex-col items-center gap-2 text-center cursor-pointer hover:shadow-md"
               onClick={()=> handleCategoriaClick(cat)}>
            <span className="text-2xl">{cat.emoji}</span>
            <span className="text-[11px] font-medium text-gray-700 break-words leading-tight">{cat.nome}</span>
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

  {/* Subcategoria modal removido */}

    </div>
  );
}
