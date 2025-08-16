"use client";
import { useEffect } from 'react';

/**
 * Bloqueia ou reseta zoom (pinch / double-tap / ctrl+wheel) em mobile.
 * Estratégia: força meta viewport sempre para scale=1 e intercepta gestos.
 */
export default function DisableZoom(){
  useEffect(()=>{
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const base = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    const setBase = ()=> { if(viewport) viewport.setAttribute('content', base); };
    setBase();

    let gestureActive = false;
    const onGestureStart = (e: any)=> { gestureActive = true; if(e.preventDefault) e.preventDefault(); setBase(); };
    const onGestureChange = (e: any)=> { if(e.preventDefault) e.preventDefault(); };
    const onGestureEnd = ()=> { gestureActive = false; // pequeno delay para safari aplicar
      setTimeout(()=>{ setBase(); window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' as ScrollBehavior}); }, 30);
    };

    // Double tap prevention
    let lastTouchEnd = 0;
    const onTouchEnd = (e: TouchEvent)=> {
      const now = Date.now();
      if(now - lastTouchEnd <= 350){ e.preventDefault(); setBase(); }
      lastTouchEnd = now;
      if(!gestureActive) setTimeout(setBase, 10);
    };

    // ctrl+wheel pinch (desktop / android chrome)
    const onWheel = (e: WheelEvent)=> {
      if(e.ctrlKey){ e.preventDefault(); setBase(); }
    };

    // Multi-touch pinch fallback: if >1 touch, prevent default
    const onTouchMove = (e: TouchEvent)=> {
      if(e.touches && e.touches.length > 1){ e.preventDefault(); setBase(); }
    };

    document.addEventListener('gesturestart', onGestureStart, { passive:false });
    document.addEventListener('gesturechange', onGestureChange, { passive:false });
    document.addEventListener('gestureend', onGestureEnd, { passive:false });
    document.addEventListener('touchend', onTouchEnd, { passive:false });
    document.addEventListener('wheel', onWheel, { passive:false });
    document.addEventListener('touchmove', onTouchMove, { passive:false });

    return ()=>{
      document.removeEventListener('gesturestart', onGestureStart);
      document.removeEventListener('gesturechange', onGestureChange);
      document.removeEventListener('gestureend', onGestureEnd);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('touchmove', onTouchMove);
    };
  },[]);
  return null;
}
