'use client';

import { useState } from 'react';

import { LayoutDashboard, ShieldCheck, Activity, FileSpreadsheet, FileText } from 'lucide-react';
import SalesByGradeChart from './SalesByGradeChart';
import AllergyStatsChart from './AllergyStatsChart';
import TopProductsList from './TopProductsList';
import NutritionAlerts from './NutritionAlerts';
import { downloadCSV, downloadPremiumExcel, type SaleRow, type TopProduct } from '@/utils/export-utils';
import { getDetailedSalesReport } from '@/app/(dashboard)/school/actions';

interface SchoolDashboardBIProps {
  chartData: SaleRow[];
  topProducts: TopProduct[];
  alerts: any[];
  kpis: any[];
  allergyData?: { name: string; count: number }[];
  totalWithAllergies?: number;
  isEmpty: boolean;
  schoolName?: string;
}

export default function SchoolDashboardBI({ 
  chartData, 
  topProducts, 
  alerts, 
  kpis, 
  allergyData = [],
  totalWithAllergies = 0,
  isEmpty,
  schoolName = 'Mi Escuela',
}: SchoolDashboardBIProps) {
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  
  const handleDownloadCSV = () => {
    const chartCSV = chartData.map(d => ({
      Fecha: d.date_iso || d.date,
      Ventas_MXN: d.sales
    }));
    const productsCSV = topProducts.map(p => ({
      Producto: p.name,
      Cantidad: p.quantity,
      Ingreso_MXN: p.revenue
    }));
    downloadCSV(chartCSV, 'Reporte_Ventas_Semanal');
    setTimeout(() => { downloadCSV(productsCSV, 'Reporte_Top_Productos'); }, 500);
  };

  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      // Fetch full transactional detail from server
      const { data: rows, schoolName: sName, error } = await getDetailedSalesReport(30);
      if (error) { alert(`Error al generar reporte: ${error}`); return; }
      await downloadPremiumExcel(rows, sName || schoolName, 30);
    } finally {
      setIsGeneratingExcel(false);
    }
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
        
        {/* Dual Download Button Group */}
        <div className="flex items-center gap-2">
          {/* CSV Button */}
          <button
            onClick={handleDownloadCSV}
            title="Descargar CSV (datos crudos)"
            className="flex items-center gap-2 bg-[#1a3a5c]/90 text-white px-5 py-3.5 rounded-xl font-black text-xs hover:bg-[#0d1f3c] transition-all shadow-md active:scale-95 group"
          >
            <FileText className="h-4 w-4 text-[#7CB9E8]" />
            CSV
          </button>

          {/* Excel Premium Button */}
          <button
            onClick={handleDownloadExcel}
            disabled={isGeneratingExcel}
            title="Descargar Excel Premium (.xlsx) con formato corporativo"
            className="flex items-center gap-3 bg-[#10B981] text-white px-6 py-3.5 rounded-xl font-black text-xs hover:bg-[#059669] transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-60 disabled:cursor-wait group"
          >
            {isGeneratingExcel ? (
              <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando...</>
            ) : (
              <><FileSpreadsheet className="h-4 w-4" /> Excel Premium<span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide ml-1">.xlsx</span></>
            )}
          </button>
        </div>
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

        {/* New KPI: Students with Allergies */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-[#e8f0f7] shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-red-400">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-6xl">
              🏥
          </div>
          <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest relative z-10">Alumnos con Alergias Registradas</p>
          <p className="text-4xl font-black text-red-600 mt-2 tracking-tight relative z-10">{totalWithAllergies}</p>
          <div className="flex items-center gap-1.5 mt-3 relative z-10">
              <Activity className="h-3 w-3 text-red-500" />
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Nivel de Riesgo Escolar</span>
          </div>
        </div>
      </div>

      {/* BI Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Sales Chart */}
        <div className="lg:col-span-8 bg-white rounded-[3rem] border border-[#e8f0f7] shadow-sm p-10 min-h-[500px] flex flex-col">
            <SalesByGradeChart data={chartData as any} />
        </div>

        {/* Allergy Monitor Panel */}
        <div className="lg:col-span-4 bg-white rounded-[3rem] border border-[#e8f0f7] shadow-sm p-10 min-h-[500px] flex flex-col relative overflow-hidden group">
            <AllergyStatsChart data={allergyData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Top Sellers Panel */}
        <div className="lg:col-span-12 bg-white rounded-[3rem] border border-[#e8f0f7] shadow-sm p-10 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[#1a3a5c] font-black text-2xl tracking-tight">Top 5 Productos Vendidos</h2>
                <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest mt-0.5">Volumen de venta total ($)</p>
              </div>
            </div>
            <TopProductsList products={topProducts} />
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
