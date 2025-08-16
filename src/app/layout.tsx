import "./globals.css";
import { Comfortaa } from "next/font/google";
import ClientLayout from "../components/ClientLayout";
import PullToRefresh from "@/utils/PullToRefresh";
import { ToastProvider } from "@/components/ui/ToastProvider";
import DisableZoom from '@/components/DisableZoom';

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
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      {/* Evita zoom (iOS adicionais) */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <body className={`${comfortaa.className} bg-white/97 text-gray-800`}>
        <style>{`html,body{touch-action:manipulation;-ms-touch-action:manipulation;} input,select,textarea{font-size:16px !important;} @supports (-webkit-touch-callout:none){body{-webkit-text-size-adjust:100%;}}`}</style>
        <PullToRefresh>
          <ToastProvider>
            <DisableZoom />
            <ClientLayout>{children}</ClientLayout>
          </ToastProvider>
        </PullToRefresh>
      </body>
    </html>
  );
}
