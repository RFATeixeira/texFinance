"use client";

import { useState, useEffect, useRef } from "react";

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const startY = useRef<number | null>(null);
  const threshold = 100; // distância para disparar refresh (px)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;

      const currentY = e.touches[0].clientY;
      if (currentY - startY.current > threshold) {
        setPulling(true);
      }
    };

    const handleTouchEnd = () => {
      if (pulling) {
        setPulling(false);
        window.location.reload(); // força o reload da página
      }
      startY.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pulling]);

  return (
    <>
      {pulling && (
        <div
          style={{
            position: "fixed",
            top: 0,
            width: "100%",
            background: "#7c3aed", // roxo
            color: "white",
            textAlign: "center",
            padding: "10px",
            zIndex: 9999,
            fontWeight: "bold",
          }}
        >
          Carregando...
        </div>
      )}
      {children}
    </>
  );
}
