"use client";
import dynamic from 'next/dynamic';

// Carrega dinamicamente para evitar problemas de SSR com chart.js
const ChartsDashboard = dynamic(()=> import('@/components/grafics/ChartsDashboard'), { ssr:false });

export default function GraficsPage(){
  return (
    <div className="mb-20">
      <ChartsDashboard />
    </div>
  );
}
