"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verifica se o usuário existe no Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Se não existir, cria o documento com dados básicos
          await setDoc(userRef, {
            nome: user.displayName || "",
            email: user.email || "",
            fotoURL: user.photoURL || "",
            criadoEm: serverTimestamp(),
          });
        }

        router.push("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Bloqueia rolagem em mobile se o card couber inteiro na viewport
  useEffect(() => {
    function evaluate() {
      if (typeof window === 'undefined') return;
      const mobile = window.innerWidth < 768; // md breakpoint
      if (!mobile) {
        document.body.style.overflow = '';
        return;
      }
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // margem extra pequena (24px) para respirar
      const fits = rect.height + 24 <= window.innerHeight;
      document.body.style.overflow = fits ? 'hidden' : '';
    }
    evaluate();
    // Reavaliar após pequeno delay (teclado ou fontes carregando)
    const t = setTimeout(evaluate, 200);
    window.addEventListener('resize', evaluate);
    window.addEventListener('orientationchange', evaluate);
    window.addEventListener('login-image-loaded', evaluate as EventListener);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(t);
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('orientationchange', evaluate);
      window.removeEventListener('login-image-loaded', evaluate as EventListener);
    };
  }, []);
  const handleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro no login:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="relative min-h-[100dvh] flex flex-col bg-gradient-to-br from-purple-50 via-white to-purple-100 overflow-x-hidden">
      <div className="flex flex-col md:flex-row flex-1 md:items-stretch">
      {/* Left Panel (desktop only) */}
      <div className="hidden md:flex flex-1 flex-col justify-center p-8 md:p-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30 md:opacity-50 [background:radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.35),transparent_60%),radial-gradient(circle_at_80%_40%,rgba(192,132,252,0.25),transparent_55%)]" />
        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-purple-600 border border-purple-200 shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Nova versão 2025
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-800 mb-4 leading-tight">
            Controle suas <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-fuchsia-500">finanças</span> com clareza.
          </h1>
          <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-lg mb-8">
            Centralize receitas, despesas, investimentos e cartões em um único painel inteligente.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 text-sm">
            {[
              'Dashboard consolidado',
              'Cartões de crédito inteligente',
              'Ambientes colaborativos',
              'Relatórios e gráficos',
            ].map(f => (
              <li key={f} className="flex items-start gap-2 bg-white/70 backdrop-blur rounded-lg px-3 py-2 shadow-sm border border-purple-100">
                <span className="mt-1 w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" />
                <span className="text-gray-700 font-medium">{f}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="relative group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white px-7 py-3 rounded-xl font-semibold shadow-lg shadow-purple-300/30 transition focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Conectando...</span>
              ) : (
                <>
                  <svg width="22" height="22" viewBox="0 0 48 48" className="opacity-90"><path fill="#EA4335" d="M24 9.5c3.54 0 6 1.54 7.38 2.84l5.04-4.92C33.64 4.14 29.18 2 24 2 14.82 2 7.06 7.86 4.11 16.17l5.91 4.59C11.35 14.04 17.02 9.5 24 9.5z"/><path fill="#4285F4" d="M46.145 24.545c0-1.555-.14-3.055-.4-4.5H24v8.51h12.505c-.54 2.76-2.175 5.09-4.64 6.64l6.985 5.414c4.075-3.76 6.395-9.3 6.395-16.064z"/><path fill="#FBBC05" d="M10.005 28.635A14.48 14.48 0 0 1 9.5 24c0-1.585.275-3.11.765-4.535l-5.91-4.59A23.89 23.89 0 0 0 2 24c0 3.82.915 7.42 2.555 10.59l5.45-5.955z"/><path fill="#34A853" d="M24 46c5.94 0 10.93-1.955 14.57-5.295l-6.985-5.414C29.145 36.225 26.715 37 24 37c-6.99 0-12.665-4.53-14.705-10.665l-5.45 5.955C7.06 40.14 14.82 46 24 46z"/><path fill="none" d="M2 2h44v44H2z"/></svg>
                  <span>Entrar com Google</span>
                </>
              )}
            </button>
            <div className="flex items-center text-xs text-gray-500 px-2">Sem instalação. 100% web.</div>
          </div>
        </div>
      </div>
      {/* Right / Bottom Panel */}
  {/* Login Card Panel */}
  <div ref={cardRef} className="relative z-10 w-full md:w-[680px] flex flex-col items-center justify-center px-8 py-12 md:p-14 bg-white/80 backdrop-blur-xl border-t md:border-l md:border-t-0 border-purple-100/50 shadow-2xl h-[100dvh] md:h-auto md:justify-center overflow-hidden">
        <div className="absolute top-15 -right-16 w-64 h-64 bg-gradient-to-tr from-purple-300/30 to-fuchsia-300/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-gradient-to-tr from-purple-200/40 to-fuchsia-200/40 rounded-full blur-2xl" />
        <div className="relative w-full max-w-sm bg-white/80 backdrop-blur rounded-2xl border border-purple-100/60 shadow-xl p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <Image
              src="/icons/icon-512x512.png"
              width={160}
              height={160}
              alt="Tex Finance Logo"
              priority
              quality={100}
              sizes="(max-width: 640px) 140px, (max-width: 1024px) 160px, 160px"
              onLoad={() => {
                try {
                  const event = new CustomEvent('login-image-loaded');
                  window.dispatchEvent(event);
                } catch {}
              }}
              className="w-40 h-40 object-contain mb-6 drop-shadow-[0_6px_14px_rgba(139,92,246,0.28)] [image-rendering:auto] select-none pointer-events-none"
            />
            <h2 className="text-xl font-semibold text-gray-800 -mt-10">Acesso Seguro</h2>
            <p className="text-gray-500 text-sm mt-1">Conecte-se para continuar</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-purple-100 bg-purple-50/40 px-4 py-3 text-xs text-purple-700 leading-relaxed">
              Seus dados são armazenados com segurança no Firebase e só você decide o que compartilhar nos ambientes.
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl py-3 font-semibold transition shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-purple-400/40 border-t-purple-600 rounded-full animate-spin" /> Entrando...</span>
              ) : (
                <>
                  <svg width="22" height="22" viewBox="0 0 48 48" className="opacity-80"><path fill="#EA4335" d="M24 9.5c3.54 0 6 1.54 7.38 2.84l5.04-4.92C33.64 4.14 29.18 2 24 2 14.82 2 7.06 7.86 4.11 16.17l5.91 4.59C11.35 14.04 17.02 9.5 24 9.5z"/><path fill="#4285F4" d="M46.145 24.545c0-1.555-.14-3.055-.4-4.5H24v8.51h12.505c-.54 2.76-2.175 5.09-4.64 6.64l6.985 5.414c4.075-3.76 6.395-9.3 6.395-16.064z"/><path fill="#FBBC05" d="M10.005 28.635A14.48 14.48 0 0 1 9.5 24c0-1.585.275-3.11.765-4.535l-5.91-4.59A23.89 23.89 0 0 0 2 24c0 3.82.915 7.42 2.555 10.59l5.45-5.955z"/><path fill="#34A853" d="M24 46c5.94 0 10.93-1.955 14.57-5.295l-6.985-5.414C29.145 36.225 26.715 37 24 37c-6.99 0-12.665-4.53-14.705-10.665l-5.45 5.955C7.06 40.14 14.82 46 24 46z"/><path fill="none" d="M2 2h44v44H2z"/></svg>
                  <span>Entrar com Google</span>
                </>
              )}
            </button>
          </div>
          <div className="pt-8 text-[10px] text-gray-400 text-center leading-relaxed">
            Ao continuar você concorda com os <span className="text-purple-500 hover:underline cursor-pointer">Termos</span> e <span className="text-purple-500 hover:underline cursor-pointer">Privacidade</span>.
          </div>
        </div>
      </div>
  </div>{/* /inner panels */}
  <footer className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] text-gray-600 opacity-70 select-none">
        © {new Date().getFullYear()} Tex Finance. Todos os direitos reservados.
      </footer>
    </div>
  );
}
