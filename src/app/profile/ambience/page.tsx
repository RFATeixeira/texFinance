"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useUserProfile } from '@/context/UserProfileContext';
import { auth, db } from "../../lib/firebaseConfig";
import {
  collection,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FiTrash } from "react-icons/fi";

import EntityEditModal from "@/components/modals/EntityEditModal";
import ConfirmModal from "@/components/modals/ConfirmModal";
import EntityModal from "@/components/modals/EntityModal";
import MembersManageModal from "@/components/modals/MembersManageModal";

import type { Ambiente, Membro } from "../../../app/types/types";
import { collection as fsCollection, query as fsQuery, where as fsWhere, getDocs as fsGetDocs, setDoc as fsSetDoc } from "firebase/firestore";

export default function AmbientesPage() {
  const { nome: nomeAtual } = useUserProfile();
  const [user, setUser] = useState<User | null>(null);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalAddAmbienteOpen, setIsModalAddAmbienteOpen] = useState(false);
  const [modalAddPessoaOpen, setModalAddPessoaOpen] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);

  const [gerenciarPessoasOpen, setGerenciarPessoasOpen] = useState(false);

  const [editarPessoaOpen, setEditarPessoaOpen] = useState(false);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Membro | null>(null);

  const [ambienteSelecionado, setAmbienteSelecionado] = useState<Ambiente | null>(null);

  const router = useRouter();

  useEffect(() => {
  const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      router.push("/login");
      return;
    }
    setUser(firebaseUser);
    setLoading(true);

    // Buscar todos os ambientes (atenção se forem muitos)
    const ambientesSnapshot = await getDocs(collection(db, "ambiences"));
    const ambientesRaw = ambientesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Ambiente, "id" | "membros">),
    }));

    // Filtrar só os ambientes onde existe membro com uid = user.uid
    const ambientesFiltrados: Ambiente[] = [];

    for (const ambiente of ambientesRaw) {
      const membroDoc = await getDoc(doc(db, "ambiences", ambiente.id, "membros", firebaseUser.uid));
      if (!membroDoc.exists()) continue;
      // Buscar membros da subcoleção
      const membrosSnapshot = await getDocs(collection(db, "ambiences", ambiente.id, "membros"));
      const membrosRaw = membrosSnapshot.docs.map(m => ({ uid: m.id }));
      // Buscar nomes atuais em paralelo
      const membrosDetalhados = await Promise.all(membrosRaw.map(async (m)=>{
        try {
          const userDoc = await getDoc(doc(db,'users', m.uid));
          if (userDoc.exists()) {
            const dados = userDoc.data() as any;
            return { uid: m.uid, nome: dados.nome || dados.displayName || 'Sem nome' };
          }
        } catch {}
        return { uid: m.uid, nome: 'Sem nome' };
      }));
      ambientesFiltrados.push({ ...ambiente, membros: membrosDetalhados });
    }

    setAmbientes(ambientesFiltrados);
    setLoading(false);

    // Não precisa retornar unsubscribe, porque é getDocs (não onSnapshot)
  });

  return () => unsubAuth();
}, [router]);

  // Função para criar um novo ambiente no Firestore
 const criarAmbiente = async (dados: { nome: string; icone: string }) => {
  if (!user) return;

  try {
    await addDoc(collection(db, "ambiences"), {
      nome: dados.nome,
      icone: dados.icone,
      criador: user.uid,
      membros: [{ uid: user.uid, nome: nomeAtual || user.displayName || "Sem nome" }],
    });
    setIsModalAddAmbienteOpen(false);
  } catch (error) {
    console.error("Erro ao criar ambiente:", error);
  }
};

  // Função para abrir o modal de confirmação, ao invés de excluir direto
  const abrirConfirmacaoExclusao = (id: string) => {
    setIdParaExcluir(id);
    setConfirmDeleteOpen(true);
  };

  // Função que exclui o ambiente após confirmação
  const confirmarExclusao = async () => {
    if (!user || !idParaExcluir) return;
    await deleteDoc(doc(db, "ambiences", idParaExcluir));
    setIdParaExcluir(null);
    setConfirmDeleteOpen(false);
  };

  const abrirDashboard = (id: string) => {
    if (!user) return;
    router.push(`/dashboard/${id}`);
  };

  // Função para abrir modal gerenciar pessoas (plural)
  const abrirModalGerenciarPessoas = (ambiente: Ambiente) => {
    setAmbienteSelecionado(ambiente);
    setGerenciarPessoasOpen(true);
  };

  // Função para editar membro (atualizar nome no Firestore)
  const handleEditarMembro = async (membro: Membro) => {
    if (!user || !ambienteSelecionado) {
      console.error("Usuário ou ambiente não definido.");
      return;
    }

    try {
      const membroRef = doc(
        db,
        "ambiences",
        ambienteSelecionado.id,
        "membros",
        membro.uid
      );
      await updateDoc(membroRef, { nome: membro.nome });

      setAmbientes((prev) =>
        prev.map((amb) =>
          amb.id === ambienteSelecionado.id
            ? {
                ...amb,
                membros: (amb.membros || []).map((m) =>
                  m.uid === membro.uid ? { ...m, nome: membro.nome } : m
                ),
              }
            : amb
        )
      );

      setAmbienteSelecionado((prev) =>
        prev
          ? {
              ...prev,
              membros: (prev.membros || []).map((m) =>
                m.uid === membro.uid ? { ...m, nome: membro.nome } : m
              ),
            }
          : prev
      );
    } catch (error) {
      console.error("Erro ao editar membro:", error);
    }
  };

  // Função para remover membro do ambiente (usada também no modal singular e plural)
  const handleRemoverMembro = async (uid: string) => {
    if (!user || !ambienteSelecionado) return;

    const ambienteRef = doc(db, "ambiences", ambienteSelecionado.id);

    const membrosAtualizados = (ambienteSelecionado.membros || []).filter(
      (m) => m.uid !== uid
    );

    const membrosUidsAtualizados = membrosAtualizados.map((m) => m.uid);

    await updateDoc(ambienteRef, { membros: membrosAtualizados, membrosUids: membrosUidsAtualizados });

    setAmbientes((prev) =>
      prev.map((amb) =>
        amb.id === ambienteSelecionado.id
          ? { ...amb, membros: membrosAtualizados }
          : amb
      )
    );

    setAmbienteSelecionado({ ...ambienteSelecionado, membros: membrosAtualizados });

    if (pessoaSelecionada?.uid === uid) {
      setEditarPessoaOpen(false);
      setPessoaSelecionada(null);
    }
  };

  // Função para salvar a edição de pessoa no modal singular
  const handleSalvarPessoa = async (dados: Membro) => {
    if (!user || !ambienteSelecionado) return;

    const ambienteRef = doc(db, "ambiences", ambienteSelecionado.id);

    const membrosAtualizados = (ambienteSelecionado.membros || []).map((m) =>
      m.uid === dados.uid ? dados : m
    );

    const membrosUidsAtualizados = membrosAtualizados.map((m) => m.uid);

    await updateDoc(ambienteRef, { membros: membrosAtualizados, membrosUids: membrosUidsAtualizados });

    setAmbientes((prev) =>
      prev.map((amb) =>
        amb.id === ambienteSelecionado.id
          ? { ...amb, membros: membrosAtualizados }
          : amb
      )
    );

    setAmbienteSelecionado({ ...ambienteSelecionado, membros: membrosAtualizados });
    setEditarPessoaOpen(false);
    setPessoaSelecionada(null);
  };

  return (
  <div className="w-full px-4 md:px-8 py-4 text-gray-800">
      <div className="flex items-center mb-6 md:gap-3">
        <h1 className="text-2xl font-bold flex items-center">Ambientes</h1>
        <button
          onClick={() => setIsModalAddAmbienteOpen(true)}
          className="text-purple-500 text-4xl leading-none hover:text-purple-600 transition font-medium ml-auto md:ml-3"
          aria-label="Adicionar ambiente"
          type="button"
        >
          +
        </button>
      </div>

      {loading ? (
        <p className="text-center p-4">Carregando ambientes...</p>
      ) : ambientes.length === 0 ? (
        <p className="text-center text-gray-500">Nenhum ambiente criado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {ambientes.map((ambiente) => {
            const membros = ambiente.membros ?? [];

            return (
              <div
                key={ambiente.id}
                className="rounded-2xl p-4 bg-white shadow-2xl cursor-default flex flex-col"
              >
                <div className="flex justify-between items-center mb-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => abrirDashboard(ambiente.id)}
                  >
                    <span className="text-xl">{ambiente.icone}</span>
                    <span className="text-lg font-semibold">{ambiente.nome}</span>
                  </div>
                  <div className="flex flex-row gap-2">
                    <button
                      onClick={() => abrirConfirmacaoExclusao(ambiente.id)}
                      className="text-red-500 hover:text-red-700"
                      aria-label={`Remover ambiente ${ambiente.nome}`}
                      type="button"
                    >
                      <FiTrash size={20} />
                    </button>
                    <button
                      onClick={() => {
                        setAmbienteSelecionado(ambiente);
                        setModalAddPessoaOpen(true);
                      }}
                      className="text-purple-500 text-3xl cursor-pointer"
                      title="Adicionar pessoa"
                    >
                      +
                    </button>
                  </div>
                </div>

                <hr className="border-gray-300 my-4" />

                <div className="flex justify-center items-center -translate-y-11 -mb-8">
                  <p className="text-center text-sm text-gray-500 mt-4 px-2 bg-white w-fit">
                    Pessoas
                  </p>
                </div>

                <div className="mt-2 flex-1">
                  {membros.length === 0 ? (
                    <p className="text-gray-500 text-xs italic">Nenhuma pessoa autorizada</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {membros.map((membro) => (
                        <div
                          onClick={() => abrirModalGerenciarPessoas(ambiente)}
                          title="Gerenciar pessoas"
                          key={membro.uid}
                          className="bg-gray-100 rounded-xl py-2 px-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 text-xs"
                        >
                          <span className="text-gray-800 overflow-hidden truncate max-w-[70%]">{membro.nome}</span>
                          {membro.uid === ambiente.criador && (
                            <span title="Criador" className="text-base">
                              👑
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Adicionar Ambiente */}
      {user && (
        <EntityModal
          open={isModalAddAmbienteOpen}
          type="ambiente"
          onClose={() => setIsModalAddAmbienteOpen(false)}
        />
      )}

      {/* Modal Adicionar Pessoa — sem onAdicionar, pois o modal faz o convite direto */}
      {modalAddPessoaOpen && ambienteSelecionado && (
        <EntityEditModal
          open={modalAddPessoaOpen}
          kind="membroEmail"
          onClose={() => { setModalAddPessoaOpen(false); setAmbienteSelecionado(null); }}
          onSave={async ({ email }) => {
            if (!email || !ambienteSelecionado || !user) return;
            try {
              const usersRef = fsCollection(db, 'users');
              const q = fsQuery(usersRef, fsWhere('email', '==', email));
              const snap = await fsGetDocs(q);
              if (snap.empty) { alert('Usuário não encontrado'); return; }
              const userDoc = snap.docs[0];
              const convidadoId = userDoc.id;
              // verifica se já é membro
              const jaMembro = (ambienteSelecionado.membros||[]).some(m=>m.uid===convidadoId);
              if (jaMembro) { alert('Usuário já é membro'); return; }
              await fsSetDoc(doc(db,'ambiences',ambienteSelecionado.id,'membros',convidadoId),{ uid: convidadoId, nome: userDoc.data().nome || 'Usuário'});
              // atualizar estado local
              setAmbientes(prev=> prev.map(a=> a.id===ambienteSelecionado.id ? { ...a, membros:[...(a.membros||[]), { uid: convidadoId, nome: userDoc.data().nome || 'Usuário'}] } : a));
            } catch(e){ console.error(e); alert('Erro ao adicionar membro'); }
          }}
        />
      )}

      {/* Modal Confirmar Exclusão */}
      {confirmDeleteOpen && (
        <ConfirmModal
          open={confirmDeleteOpen}
          message="Tem certeza que deseja excluir este ambiente?"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={confirmarExclusao}
        />
      )}

      {/* Modal Gerenciar Pessoas (plural) */}
      {ambienteSelecionado && (
        <MembersManageModal
          open={gerenciarPessoasOpen}
          ambiente={ambienteSelecionado}
          onClose={() => setGerenciarPessoasOpen(false)}
          isOwner={user?.uid === ambienteSelecionado.criador}
          onMembersChanged={(membros)=>{
            setAmbientes(prev=> prev.map(a=> a.id===ambienteSelecionado.id ? { ...a, membros } : a));
            setAmbienteSelecionado(prev=> prev ? { ...prev, membros } : prev);
          }}
        />
      )}
    </div>
  );
}
