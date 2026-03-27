'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Copy, UtensilsCrossed, Beef, Carrot,
  IceCream, GlassWater, Plus, Pencil, Trash2, RefreshCcw
} from 'lucide-react';
import { upsertDailyMenu, clearDailyMenu } from '@/app/(dashboard)/school/menuActions';

// ─── Types ────────────────────────────────────────────────────────────────────
export type DailyMenu = {
  id?: string;
  date: string;
  soup_name?: string;
  main_course_name?: string;
  side_dish_name?: string;
  dessert_name?: string;
  drink_name?: string;
  combo_price?: number;
};

type WeeklyGridProps = {
  schoolId: string;
  initialMenus: DailyMenu[];
  currentDateStr: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekDates(reference: Date): Date[] {
  const d = new Date(reference);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - day + 1);
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(d);
    date.setDate(d.getDate() + i);
    return date;
  });
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// ─── Empty Day Card ───────────────────────────────────────────────────────────
function EmptyDayCard({ label, date, onConfigure }: { label: string; date: Date; onConfigure: () => void }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-[#c8daf0] flex flex-col min-h-[380px]">
      <div className="bg-[#f0f5fb] text-center py-5 rounded-t-2xl border-b border-[#e8f0f7]">
        <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest mb-1">{label.toUpperCase()}</p>
        <span className="text-5xl font-black text-[#2b5fa6] leading-none">{date.getDate()}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-5 gap-3">
        <div className="h-12 w-12 bg-[#f0f5fb] rounded-2xl flex items-center justify-center text-[#c8daf0]">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <p className="text-[#b0c8e0] text-xs font-semibold text-center">Sin menú configurado</p>
        <button
          onClick={onConfigure}
          className="mt-2 flex items-center gap-2 bg-[#004B87] text-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-[#003870] transition active:scale-95 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Configurar Menú
        </button>
      </div>
    </div>
  );
}

// ─── Filled Day Card ──────────────────────────────────────────────────────────
function FilledDayCard({ label, date, menu, onEdit, onClear, isClearing }: {
  label: string; date: Date; menu: DailyMenu;
  onEdit: () => void; onClear: () => void; isClearing: boolean;
}) {
  const courses = [
    { icon: <UtensilsCrossed className="h-4 w-4" />, label: 'Sopa', value: menu.soup_name, color: 'text-orange-400' },
    { icon: <Beef className="h-4 w-4" />, label: 'Plato Fuerte', value: menu.main_course_name, color: 'text-red-400' },
    { icon: <Carrot className="h-4 w-4" />, label: 'Guarnición', value: menu.side_dish_name, color: 'text-green-500' },
    { icon: <IceCream className="h-4 w-4" />, label: 'Postre', value: menu.dessert_name, color: 'text-pink-400' },
    { icon: <GlassWater className="h-4 w-4" />, label: 'Bebida', value: menu.drink_name, color: 'text-[#7CB9E8]' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm flex flex-col overflow-hidden min-h-[380px] hover:shadow-md transition-shadow">
      <div className="bg-[#f0f5fb] text-center py-5 border-b border-[#e8f0f7]">
        <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest mb-1">{label.toUpperCase()}</p>
        <span className="text-5xl font-black text-[#2b5fa6] leading-none">{date.getDate()}</span>
      </div>
      <div className="px-4 pt-4">
        <span className="inline-flex items-center gap-1.5 bg-[#F4C430] text-[#1a3a5c] font-black text-sm px-3 py-1 rounded-full shadow-sm">
          ${Number(menu.combo_price ?? 70).toFixed(2)} <span className="font-semibold text-[10px] opacity-70">combo</span>
        </span>
      </div>
      <div className="flex-1 px-4 py-3 space-y-2">
        {courses.map((c, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex-shrink-0 ${c.color}`}>{c.icon}</span>
            <div className="min-w-0">
              <p className="text-[#8aa8cc] font-black text-[9px] uppercase tracking-widest leading-none">{c.label}</p>
              <p className="text-[#004B87] font-semibold text-xs mt-0.5 truncate" title={c.value}>{c.value || '—'}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 bg-[#e8f0f7] text-[#004B87] font-black text-xs py-2 rounded-xl hover:bg-[#d0e4f5] transition">
          <Pencil className="h-3 w-3" /> Editar
        </button>
        <button
          onClick={onClear}
          disabled={isClearing}
          className="flex items-center justify-center gap-1.5 bg-red-50 text-red-400 font-black text-xs px-3 py-2 rounded-xl hover:bg-red-100 transition disabled:opacity-50"
          title="Limpiar día"
        >
          {isClearing ? <RefreshCcw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

// ─── Text Input Field ─────────────────────────────────────────────────────────
function CourseInput({ label, icon, value, onChange, placeholder }: {
  label: string; icon: React.ReactNode; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-black text-[#004B87] uppercase tracking-wider">
        <span className="text-[#7CB9E8]">{icon}</span> {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-[#e8f0f7] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#004B87] bg-white focus:border-[#7CB9E8] focus:outline-none transition placeholder:text-slate-300 placeholder:font-normal"
      />
    </div>
  );
}

// ─── Menu Builder Modal (Slide-over) ──────────────────────────────────────────
function MenuBuilderModal({ schoolId, date, dayLabel, initialData, onSaved, onClose }: {
  schoolId: string; date: string; dayLabel: string; initialData: Partial<DailyMenu>;
  onSaved: (d: DailyMenu) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    combo_price: initialData.combo_price ?? 70,
    soup_name: initialData.soup_name ?? '',
    main_course_name: initialData.main_course_name ?? '',
    side_dish_name: initialData.side_dish_name ?? '',
    dessert_name: initialData.dessert_name ?? '',
    drink_name: initialData.drink_name ?? '',
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (value: string | number) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => {
    setError('');
    startTransition(async () => {
      try {
        await upsertDailyMenu(schoolId, { ...form, date });
        onSaved({ ...form, date });
      } catch (e: any) {
        setError(e.message || 'Error al guardar');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest">Planificador Menú</p>
              <h2 className="text-xl font-black text-[#004B87] mt-0.5">Menú del {dayLabel}</h2>
              <p className="text-xs text-[#8aa8cc] mt-1">
                {new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 h-9 w-9 rounded-full flex items-center justify-center font-bold text-xl">✕</button>
          </div>
          {/* Combo Price */}
          <div className="mt-4 flex items-center gap-3 bg-[#F4C430]/10 border border-[#F4C430]/30 rounded-xl px-4 py-3">
            <span className="text-2xl">💰</span>
            <div className="flex-1">
              <p className="text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest">Precio del Combo (MXN)</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#004B87] font-black text-lg">$</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={form.combo_price}
                  onChange={(e) => set('combo_price')(Number(e.target.value))}
                  className="w-28 text-xl font-black text-[#004B87] border-none focus:outline-none bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Course Inputs — all free text, no hardcoded lists */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <CourseInput label="Sopa / Crema" icon={<UtensilsCrossed className="h-3.5 w-3.5" />} value={form.soup_name} onChange={set('soup_name') as any} placeholder="Ej: Sopa de pasta, Crema de elote..." />
          <CourseInput label="Plato Fuerte" icon={<Beef className="h-3.5 w-3.5" />} value={form.main_course_name} onChange={set('main_course_name') as any} placeholder="Ej: Tacos dorados, Pollo a la plancha..." />
          <CourseInput label="Guarnición" icon={<Carrot className="h-3.5 w-3.5" />} value={form.side_dish_name} onChange={set('side_dish_name') as any} placeholder="Ej: Ensalada César, Arroz rojo..." />
          <CourseInput label="Postre" icon={<IceCream className="h-3.5 w-3.5" />} value={form.dessert_name} onChange={set('dessert_name') as any} placeholder="Ej: Fruta de temporada, Gelatina..." />
          <CourseInput label="Agua / Bebida" icon={<GlassWater className="h-3.5 w-3.5" />} value={form.drink_name} onChange={set('drink_name') as any} placeholder="Ej: Jamaica, Horchata, Agua de limón..." />
          {error && <p className="text-red-500 text-sm font-semibold bg-red-50 p-3 rounded-xl">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 space-y-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-[#004B87] text-white font-black py-4 rounded-xl hover:bg-[#003870] transition shadow active:scale-95 disabled:opacity-60"
          >
            {isPending ? <><RefreshCcw className="h-4 w-4 animate-spin" /> Guardando...</> : '✓ Guardar Menú del Día'}
          </button>
          <button onClick={onClose} className="w-full text-[#8aa8cc] font-bold text-sm py-2 hover:text-slate-700 transition">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Weekly Grid ─────────────────────────────────────────────────────────
export default function WeeklyMenuGrid({ schoolId, initialMenus, currentDateStr }: WeeklyGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const weekRef = new Date(currentDateStr + 'T12:00:00');
  
  // Initialize from server-fetched data
  const [menus, setMenus] = useState<Record<string, DailyMenu>>(
    () => Object.fromEntries(initialMenus.map(m => [m.date, m]))
  );

  // Keep state in sync with server when navigating or after saving
  useEffect(() => {
    setMenus(Object.fromEntries(initialMenus.map(m => [m.date, m])));
  }, [initialMenus]);

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [clearingDate, setClearingDate] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const weekDates = useMemo(() => getWeekDates(weekRef), [currentDateStr]);

  const updateDateParam = (d: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', toISODate(d));
    router.push(`${pathname}?${params.toString()}`);
  };

  const prevWeek = () => { const d = new Date(weekRef); d.setDate(d.getDate() - 7); updateDateParam(d); };
  const nextWeek = () => { const d = new Date(weekRef); d.setDate(d.getDate() + 7); updateDateParam(d); };

  const weekLabel = `Semana del ${weekDates[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} al ${weekDates[4].toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const handleSaved = (data: DailyMenu) => {
    setMenus(m => ({ ...m, [data.date]: data }));
    setEditingDate(null);
  };

  const handleClear = (date: string) => {
    if (!confirm('¿Seguro que quieres limpiar el menú de este día?')) return;
    setClearingDate(date);
    startTransition(async () => {
      try {
        await clearDailyMenu(schoolId, date);
        setMenus(m => { const next = { ...m }; delete next[date]; return next; });
      } catch (e: any) {
        alert('Error: ' + e.message);
      } finally {
        setClearingDate(null);
      }
    });
  };

  const editingMenu = editingDate ? menus[editingDate] : undefined;
  const editingDayLabel = editingDate ? DAY_LABELS[weekDates.findIndex(d => toISODate(d) === editingDate)] : '';

  return (
    <div>
      {/* Week Navigator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="h-10 w-10 bg-white border border-[#e8f0f7] rounded-xl flex items-center justify-center text-[#7CB9E8] hover:bg-[#e8f0f7] hover:text-[#004B87] transition shadow-sm">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest">Período Activo</p>
            <p className="text-[#004B87] font-black text-sm">{weekLabel}</p>
          </div>
          <button onClick={nextWeek} className="h-10 w-10 bg-white border border-[#e8f0f7] rounded-xl flex items-center justify-center text-[#7CB9E8] hover:bg-[#e8f0f7] hover:text-[#004B87] transition shadow-sm">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button className="flex items-center gap-2 bg-white border border-[#e8f0f7] text-[#7CB9E8] font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#f0f5fb] transition shadow-sm">
          <Copy className="h-4 w-4" /> Copiar semana anterior
        </button>
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {weekDates.map((date, i) => {
          const iso = toISODate(date);
          const menu = menus[iso];
          return menu ? (
            <FilledDayCard
              key={iso}
              label={DAY_LABELS[i]}
              date={date}
              menu={menu}
              onEdit={() => setEditingDate(iso)}
              onClear={() => handleClear(iso)}
              isClearing={clearingDate === iso}
            />
          ) : (
            <EmptyDayCard key={iso} label={DAY_LABELS[i]} date={date} onConfigure={() => setEditingDate(iso)} />
          );
        })}
      </div>

      {/* Slide-over Modal */}
      {editingDate && (
        <MenuBuilderModal
          schoolId={schoolId}
          date={editingDate}
          dayLabel={editingDayLabel}
          initialData={editingMenu ?? {}}
          onSaved={handleSaved}
          onClose={() => setEditingDate(null)}
        />
      )}
    </div>
  );
}
