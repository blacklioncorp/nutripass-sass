'use client';

import { Download, LayoutDashboard, ShieldCheck, Activity } from 'lucide-react';
import ConsumptionChart from './ConsumptionChart';
import TopProductsList from './TopProductsList';
import NutritionAlerts from './NutritionAlerts';
import { downloadCSV } from '@/utils/export-utils';

interface SchoolDashboardBIProps {
  chartData: any[];
  topProducts: any[];
  alerts: any[];
  kpis: any[];
  isEmpty: boolean;
}

export default function SchoolDashboardBI({ 
  chartData, 
  topProducts, 
  alerts, 
  kpis, 
  isEmpty 
}: SchoolDashboardBIProps) {
  
  const handleDownloadCSV = () => {
    // 1. Prepare Chart Data for CSV
    const chartCSV = chartData.map(d => ({
      Fecha: d.date_iso || d.date,
      Ventas_MXN: d.sales
    }));

    // 2. Prepare Top Products for CSV
    const productsCSV = topProducts.map(p => ({
      Producto: p.name,
      Cantidad: p.quantity,
      Ingreso_MXN: p.revenue
    }));

    // Trigger downloads
    downloadCSV(chartCSV, 'Reporte_Ventas_Semanal');
    setTimeout(() => {
      downloadCSV(productsCSV, 'Reporte_Top_Productos');
    }, 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header with BI Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[3rem] border border-white/60 shadow-xl shadow-blue-900/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="h-4 w-4 text-[#7CB9E8]" />
            <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest leading-none">Panel de Control BI</p>
          </div>
          <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Dashboard de Escuela</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full text-[10px] font-black text-emerald-600 uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Conectado en Vivo
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
               <ShieldCheck className="h-3.5 w-3.5 text-[#7CB9E8]" /> Encriptación de Datos Activa
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleDownloadCSV}
          className="flex items-center gap-3 bg-[#1a3a5c] text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-[#0d1f3c] transition-all shadow-lg active:scale-95 group"
        >
          <Download className="h-5 w-5 text-[#7CB9E8] group-hover:translate-y-0.5 transition-transform" />
          📥 Descargar Reporte Semanal (CSV)
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[2.5rem] p-8 border border-[#e8f0f7] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-6xl">
                {kpi.icon}
            </div>
            <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest relative z-10">{kpi.label}</p>
            <p className="text-4xl font-black text-[#1a3a5c] mt-2 tracking-tight relative z-10">{kpi.value}</p>
            <div className="flex items-center gap-1.5 mt-3 relative z-10">
                <Activity className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-widest">Actualizado</span>
            </div>
          </div>
        ))}
      </div>

      {/* BI Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Sales Chart */}
        <div className="lg:col-span-8 bg-white rounded-[3rem] border border-[#e8f0f7] shadow-sm p-10 min-h-[500px] flex flex-col">
            <ConsumptionChart data={chartData} />
        </div>

        {/* Top Sellers Panel */}
        <div className="lg:col-span-4 bg-white rounded-[3rem] border border-[#e8f0f7] shadow-sm p-10 min-h-[500px] flex flex-col relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[#1a3a5c] font-black text-2xl tracking-tight">Top 5 Productos</h2>
                <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest mt-0.5">Volumen de venta total ($)</p>
              </div>
            </div>
            <TopProductsList products={topProducts} />
            <div className="mt-8 pt-6 border-t border-slate-50">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center leading-relaxed">
                    Basado en las transacciones netas <br/> del ciclo actual de facturación.
                </p>
            </div>
        </div>
      </div>

      {/* Alerts & Safety Section */}
      <div className="bg-white rounded-[3rem] border border-[#e8f0f7] shadow-sm p-10 overflow-hidden">
         <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                🛡️
            </div>
            <div>
                <h2 className="text-[#1a3a5c] font-black text-2xl tracking-tight">Control de Seguridad & Alertas</h2>
                <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest">Detección de riesgos por alergia hoy</p>
            </div>
         </div>
         <NutritionAlerts alerts={alerts} />
      </div>
    </div>
  );
}
