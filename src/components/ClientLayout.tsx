"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/lib/firebaseConfig";
import Navbar from "@/components/Navbar";
import EmojiBackfill from "@/components/EmojiBackfill";
import { UserProfileProvider } from '@/context/UserProfileContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userPresent, setUserPresent] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserPresent(!!u);
      setAuthChecked(true);
      if (!u && pathname !== '/login') {
        router.replace('/login');
      }
      if (u && pathname === '/login') {
        router.replace('/dashboard');
      }
    });
    return () => unsub();
  }, [pathname, router]);

  const hideNavbarOnPaths = ["/login"];
  const shouldHideNavbar = hideNavbarOnPaths.includes(pathname);
  const wrapperBase = "min-h-screen bg-white/97";
  const wrapperWithSidebar = "md:pl-56";
  const wrapperClass = shouldHideNavbar ? wrapperBase : `${wrapperBase} ${wrapperWithSidebar}`;

  if (!authChecked && pathname !== '/login') {
    return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">Carregando...</div>;
  }

  return (
    <UserProfileProvider>
      <div className={wrapperClass}>
        <EmojiBackfill />
        {children}
        {!shouldHideNavbar && userPresent && <Navbar />}
      </div>
    </UserProfileProvider>
  );
}
