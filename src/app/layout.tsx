import "./globals.css";
import { Comfortaa } from "next/font/google";
import ClientLayout from "../components/ClientLayout";
import PullToRefresh from "@/utils/PullToRefresh";
import { ToastProvider } from "@/components/ui/ToastProvider";

const comfortaa = Comfortaa({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata = {
  title: "Tex Finance",
  description: "Seu gestor financeiro mais completo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#ffffff/97" />
      <body className={`${comfortaa.className} bg-white/97 text-gray-800`}>
        <PullToRefresh>
          <ToastProvider>
            <ClientLayout>{children}</ClientLayout>
          </ToastProvider>
        </PullToRefresh>
      </body>
    </html>
  );
}
