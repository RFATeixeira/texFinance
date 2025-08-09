"use client";
import dynamic from 'next/dynamic';

// Carrega dinamicamente para evitar problemas de SSR com chart.js
const ChartsDashboard = dynamic(()=> import('@/components/grafics/ChartsDashboard'), { ssr:false });

export default function GraficsPage(){
  return (
    <div className="mt-4 mb-20">
      <h1 className="text-lg font-semibold px-4 text-gray-800">Gráficos</h1>
      <ChartsDashboard />
    </div>
  );
}
