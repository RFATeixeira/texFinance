"use client";

import { useEffect, useState, useRef } from 'react';
import { db, auth } from '../../lib/firebaseConfig';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import Modal from '@/components/ui/Modal';
import { HiOutlinePlus, HiTrash } from 'react-icons/hi';

interface EmojiItem { id: string; valor: string; descricao?: string }

export default function EmojisPage(){
	const [emojis, setEmojis] = useState<EmojiItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editando, setEditando] = useState<EmojiItem | null>(null);
	const [novoEmoji, setNovoEmoji] = useState('');
	const [erro, setErro] = useState<string | null>(null);
	const emojiInputRef = useRef<HTMLInputElement|null>(null);

	const osShortcut = (() => {
		if (typeof navigator === 'undefined') return '';
		const ua = navigator.userAgent;
		if (/Windows/i.test(ua)) return 'Win + .';
		if (/Mac OS X|Macintosh/i.test(ua)) return 'Ctrl + Cmd + Space';
		if (/Linux/i.test(ua)) return 'Win + . (Geral)';
		return '';
	})();

	useEffect(()=>{
		const user = auth.currentUser; if(!user) return;
		(async ()=>{
			try {
				const ref = collection(db,'global','meta','emojis');
				const q = query(ref, orderBy('valor'));
				const snap = await getDocs(q);
				const lista:EmojiItem[] = [];
				snap.forEach(d=> lista.push({ id:d.id, valor:(d.data() as any).valor, descricao:(d.data() as any).descricao }));

				if (!lista.length) {
					try {
						const catsRef = collection(db,'users', user.uid,'categorias');
						const catSnap = await getDocs(catsRef);
						const usados = new Set<string>();
						catSnap.forEach(c=> {
							const data:any = c.data();
							if (data.emoji) usados.add(data.emoji);
							(data.subcategorias||[]).forEach((s:any)=> { if(s.emoji) usados.add(s.emoji); });
						});
						const prelim = Array.from(usados).sort((a,b)=> a.localeCompare(b));
						for (const em of prelim) {
							const novo = await addDoc(ref, { valor: em, descricao: null });
							lista.push({ id: novo.id, valor: em });
						}
					} catch(e){ /* ignore */ }
				}
				lista.sort((a,b)=> a.valor.localeCompare(b.valor));
				setEmojis(lista);
			} catch(e){ console.error(e); }
			finally { setLoading(false); }
		})();
	},[]);

	function abrirNovo(){ setEditando(null); setNovoEmoji(''); setErro(null); setModalOpen(true); }
	function editar(item:EmojiItem){ setEditando(item); setNovoEmoji(item.valor); setErro(null); setModalOpen(true); }

	async function salvar(){
		setErro(null);
			const raw = novoEmoji.trim();
			if(!raw) { setErro('Informe um emoji'); return; }

				// Captura clusters de emoji (inclui ZWJ, variações e flags) para múltiplos emojis.
				const clusterRegex = /(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\p{Regional_Indicator}{2})/gu;
				const encontrados = Array.from(raw.matchAll(clusterRegex)).map(m=> m[0]);
			const unicos = Array.from(new Set(encontrados));
			if(!unicos.length){ setErro('Nenhum emoji válido'); return; }

			try {
				const ref = collection(db,'global','meta','emojis');
				if(editando && unicos.length === 1){
					const unico = unicos[0];
					if (emojis.some(e=> e.valor === unico && e.id !== editando.id)) { setErro('Emoji já existe'); return; }
					await setDoc(doc(ref, editando.id), { valor: unico });
					setEmojis(prev=> prev.map(e=> e.id===editando.id ? { ...e, valor:unico }: e));
					setModalOpen(false);
					return;
				}

				// Se estiver em modo edição mas vários foram inseridos, tratamos como múltipla adição (não alteração do original)
				if(editando && unicos.length > 1){
					// Atualiza o original para o primeiro e adiciona os demais se não existirem
					const [primeiro, ...resto] = unicos;
					if (!emojis.some(e=> e.valor === primeiro && e.id !== editando.id)) {
						await setDoc(doc(ref, editando.id), { valor: primeiro });
						setEmojis(prev=> prev.map(e=> e.id===editando.id ? { ...e, valor:primeiro }: e));
					}
					for (const emoji of resto){
						if (emojis.some(e=> e.valor === emoji)) continue;
						const novo = await addDoc(ref, { valor: emoji });
						setEmojis(prev=> [...prev, { id: novo.id, valor: emoji }]);
					}
					setEmojis(prev=> [...prev].sort((a,b)=> a.valor.localeCompare(b.valor)));
					setModalOpen(false);
					return;
				}

				// Modo criação múltipla
				let adicionou = false;
				for (const emoji of unicos){
					if (emojis.some(e=> e.valor === emoji)) continue; // pula duplicados existentes
					const novo = await addDoc(ref, { valor: emoji });
					setEmojis(prev=> [...prev, { id: novo.id, valor: emoji }]);
					adicionou = true;
				}
				if(!adicionou){ setErro('Todos já existem'); return; }
				setEmojis(prev=> [...prev].sort((a,b)=> a.valor.localeCompare(b.valor)));
				setModalOpen(false);
			} catch(e:any){ console.error(e); setErro('Erro ao salvar'); }
	}

	async function deletar(){
		if(!editando) return;
		try { const ref = collection(db,'global','meta','emojis'); await deleteDoc(doc(ref, editando.id)); setEmojis(prev=> prev.filter(e=> e.id!==editando.id)); setModalOpen(false); } catch(e){ setErro('Erro ao deletar'); }
	}

	useEffect(()=>{ if(modalOpen && emojiInputRef.current){ const el = emojiInputRef.current; setTimeout(()=> el.focus(), 50); } },[modalOpen]);

	return (
		<div className="p-4 bg-white/97 min-h-screen">
			<h1 className="text-2xl font-bold text-gray-800">Emojis</h1>
			<div className="mt-6 bg-white rounded-2xl shadow-lg p-4">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-lg font-semibold text-gray-800">Biblioteca</h2>
					<button onClick={abrirNovo} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl px-4 py-2 text-sm font-medium"><HiOutlinePlus className="text-base"/> Novo</button>
				</div>
				<div className="h-px bg-gray-200 mb-4" />
				{loading ? <p className="text-sm text-gray-500">Carregando...</p> : (
					<div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2">
						{emojis.map(e=> (
							<button
								key={e.id}
								onClick={()=>editar(e)}
								className="w-10 h-10 flex items-center justify-center rounded-lg text-2xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
								title={e.descricao || e.valor}
							>
								{e.valor}
							</button>
						))}
						{!emojis.length && <p className="col-span-full text-center text-xs text-gray-500">Nenhum emoji cadastrado.</p>}
					</div>
				)}
			</div>

			<Modal open={modalOpen} onClose={()=> { setModalOpen(false); }} title={editando ? 'Editar Emoji' : 'Novo Emoji'}>
				<div className="space-y-4">
					<label className="text-sm font-semibold flex flex-col gap-1">Emoji
						<div className="flex items-center justify-center">
															<input
																ref={emojiInputRef}
																value={novoEmoji}
																onChange={e=> setNovoEmoji(e.target.value)}
																className="px-5 py-2 border-2 border-purple-500 rounded-2xl focus:outline-0 text-center text-4xl w-full max-w-xs h-16 leading-none placeholder:text-base"
																autoFocus
																inputMode="text"
																placeholder={osShortcut || '😀'}
															/>
						</div>
						{osShortcut && <span className="text-[10px] text-gray-500">Atalho do sistema: {osShortcut}</span>}
						<span className="text-[10px] text-gray-400">No mobile, use o teclado de emojis.</span>
					</label>
					{erro && <p className="text-xs text-red-500">{erro}</p>}
					<div className="flex gap-2 pt-2">
						{editando && <button onClick={deletar} type="button" className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-2 text-sm flex items-center justify-center gap-1"><HiTrash/> Deletar</button>}
						<button onClick={salvar} className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-2xl py-2 text-sm">{editando ? 'Salvar' : 'Adicionar'}</button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
