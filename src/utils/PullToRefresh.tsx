"use client";

import { useState, useEffect, useRef } from "react";
import { FiRefreshCcw } from "react-icons/fi";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  threshold?: number; // distância mínima para acionar
  maxPull?: number;   // distância máxima considerada
}

export default function PullToRefresh({
  children,
  onRefresh,
  threshold = 120,
  maxPull = 140, // reduz ainda mais a distância máxima
}: PullToRefreshProps) {
  const startY = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullingActive = useRef(false);
  const engaged = useRef(false); // se threshold de engajamento atingido
  const engageThreshold = 40; // px mínimos antes de "assumir" o gesto
  const [engagedUI, setEngagedUI] = useState(false); // controla visibilidade

  const dispararRefresh = async () => {
    try {
      setRefreshing(true);
      if (onRefresh) await onRefresh(); else window.location.reload();
    } finally {
      setDistance(0);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      startY.current = e.touches[0].clientY;
      pullingActive.current = false; // ainda não engajado
      engaged.current = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (refreshing || startY.current === null) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY.current;

      // Se usuário desliza para cima ou não há delta positivo, não tratar
      if (delta <= 0) {
        if (pullingActive.current) setDistance(0);
        return;
      }

      // Se não está no topo e ainda não engajou, deixa rolagem normal
      if (window.scrollY > 0 && !pullingActive.current) return;

      // Atingiu limite de engajamento
      if (!engaged.current && delta >= engageThreshold && window.scrollY <= 0) {
        engaged.current = true;
        pullingActive.current = true;
        setEngagedUI(true);
      }

      // Ainda não engajou => não intercepta
      if (!pullingActive.current) return;

      // Agora sim: prevenimos comportamento padrão para controlar a "elasticidade"
      try { e.preventDefault(); } catch {}
      const clamped = Math.min(delta, maxPull);
      setDistance(clamped);
    };
    const handleTouchEnd = () => {
      if (!pullingActive.current) {
        // gesto não engajado: reset leve
        setDistance(0);
        startY.current = null;
        return;
      }
      if (distance >= threshold && !refreshing) {
        dispararRefresh();
      } else {
        setDistance(0);
      }
  pullingActive.current = false;
  engaged.current = false;
  setEngagedUI(false);
      startY.current = null;
    };
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart as any);
      window.removeEventListener("touchmove", handleTouchMove as any);
      window.removeEventListener("touchend", handleTouchEnd as any);
    };
  }, [distance, refreshing, threshold, maxPull]);

  const progress = Math.min(distance / threshold, 1);
  const visualMax = 80; // altura máxima visual (reduzida)
  const visible = engagedUI || refreshing; // só aparece após engajar
  const containerHeight = visible ? Math.min(Math.max(distance, refreshing ? threshold : 0), visualMax) : 0;
  const fullyArmed = progress >= 1;

  return (
    <div className="relative">
      <div
        className="fixed left-0 right-0 pointer-events-none"
        style={{
          top: 0,
          height: containerHeight,
          transition: refreshing || (!visible && distance === 0) ? "height .25s ease" : "none",
          zIndex: 9999,
        }}
      >
        {visible && (
          <div className="absolute inset-0 flex flex-col items-center justify-end">
            <div className="absolute inset-0 backdrop-blur-md bg-white/35 border-b border-white/40 z-0" />
            <div className="relative w-full px-8 mb-2 z-10">
              <div className="h-1 bg-purple-200/60 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-[width] duration-75" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <div
              className="relative z-10 mb-2 flex items-center gap-2 rounded-full bg-purple-600/95 text-white shadow-lg px-4 py-2 transition-all duration-150"
              style={{
                opacity: refreshing ? 1 : progress,
                transform: `scale(${refreshing ? 1 : 0.85 + progress * 0.15}) rotate(${refreshing ? 360 : 0}deg)`,
              }}
            >
              <FiRefreshCcw className={`text-sm ${refreshing ? 'animate-spin' : fullyArmed ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-semibold select-none">
                {refreshing ? 'Atualizando...' : fullyArmed ? 'Solte para atualizar' : 'Puxe para atualizar'}
              </span>
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
