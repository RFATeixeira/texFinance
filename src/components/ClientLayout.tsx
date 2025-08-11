"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideNavbarOnPaths = ["/login"];
  const shouldHideNavbar = hideNavbarOnPaths.includes(pathname);

  return (
    <div className="md:pl-56 min-h-screen bg-white/97">
      {children}
      {!shouldHideNavbar && <Navbar />}
    </div>
  );
}
