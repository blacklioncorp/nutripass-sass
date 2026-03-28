'use client';

import {
  useState, useMemo, useCallback, useTransition,
} from 'react';
import {
  ShoppingCart, Plus, X, Check, ChevronLeft, ChevronRight,
  Calendar, Utensils, Package, AlertCircle, CheckCircle2,
  Loader2, Wallet,
} from 'lucide-react';
import { createPreOrderTransaction } from '@/app/(portal)/parent/actions';

// ─── Types ────────────────────────────────────────────────────────────────────

type CartItem = {
  id: string;
  name: string;
  price: number;
  date: string;           // YYYY-MM-DD
  walletType: 'comedor' | 'snack';
  sourceType: 'daily_menu' | 'product';
  image_url?: string;
  category?: string;
  cartKey: string;        // unique: `combo-${menuId}` or `snack-${productId}-${date}`
};

type DailyMenu = {
  id: string;
  date: string;
  school_id: string;
  combo_price: number;
  soup_name?: string;
  main_course_name?: string;
  side_dish_name?: string;
  dessert_name?: string;
  drink_name?: string;
  products?: { id: string; name?: string; description?: string; base_price?: number; image_url?: string };
};

type Product = {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  base_price: number;
  category: 'snack' | 'comedor' | 'bebida';
  image_url?: string;
  is_available: boolean;
  stock_quantity?: number;
  nutri_points_reward?: number;
};

type ConsumerWallet = {
  id: string;
  type: 'comedor' | 'snack';
  balance: number;
  max_overdraft: number;
};

type Consumer = {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  wallets: ConsumerWallet[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'];

const CATEGORY_EMOJIS: Record<string, string> = {
  snack: '🥨',
  bebida: '🥤',
  comedor: '🍲',
};

function getWeekRange(baseDate: Date) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { monday, friday };
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateString(d: Date): string {
  // Local date string YYYY-MM-DD without timezone shift
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(monday: Date, friday: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const m = monday.toLocaleDateString('es-MX', opts);
  const f = friday.toLocaleDateString('es-MX', { ...opts, year: 'numeric' });
  return `${m} – ${f}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PreordersClient({
  initialConsumers,
  dailyMenus,
  existingPreorders,
  products,
}: {
  initialConsumers: any[];
  dailyMenus: any[];
  existingPreorders: any[];
  products: any[];
}) {
  const [activeStudentId, setActiveStudentId] = useState<string>(
    initialConsumers[0]?.id ?? ''
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'snack' | 'bebida'>('all');
  const [snackDateTarget, setSnackDateTarget] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');

  // Active consumer
  const activeConsumer = useMemo<Consumer | undefined>(
    () => (initialConsumers as Consumer[]).find(c => c.id === activeStudentId) ?? (initialConsumers[0] as Consumer),
    [initialConsumers, activeStudentId]
  );

  // Week window
  const { monday, friday } = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekRange(base);
  }, [weekOffset]);
  const weekDays = useMemo(() => getWeekDays(monday), [monday]);

  // Filtered daily menus for active consumer's school + current week
  const weekMenus = useMemo<DailyMenu[]>(() => {
    if (!activeConsumer) return [];
    const weekStart = toDateString(monday);
    const weekEnd = toDateString(friday);
    return (dailyMenus as DailyMenu[]).filter(
      m => m.school_id === activeConsumer.school_id && m.date >= weekStart && m.date <= weekEnd
    );
  }, [dailyMenus, activeConsumer, monday, friday]);

  // Filtered products for active consumer's school + category
  const filteredProducts = useMemo<Product[]>(() => {
    if (!activeConsumer) return [];
    return (products as Product[]).filter(
      p =>
        p.school_id === activeConsumer.school_id &&
        p.is_available &&
        (categoryFilter === 'all' || p.category === categoryFilter)
    );
  }, [products, activeConsumer, categoryFilter]);

  // Wallet references
  const comedorWallet = activeConsumer?.wallets?.find(w => w.type === 'comedor');
  const snackWallet = activeConsumer?.wallets?.find(w => w.type === 'snack');

  // Cart calculations
  const comedorTotal = useMemo(
    () => cart.filter(i => i.walletType === 'comedor').reduce((s, i) => s + i.price, 0),
    [cart]
  );
  const snackTotal = useMemo(
    () => cart.filter(i => i.walletType === 'snack').reduce((s, i) => s + i.price, 0),
    [cart]
  );
  const cartTotal = comedorTotal + snackTotal;

  // ── Cart actions ──

  const addComboToCart = useCallback((menu: DailyMenu) => {
    const cartKey = `combo-${menu.id}`;
    if (cart.some(i => i.cartKey === cartKey)) return;
    const price = parseFloat(String(menu.products?.base_price ?? menu.combo_price ?? 70));
    const d = new Date(`${menu.date}T12:00:00`);
    const dayName = d.toLocaleDateString('es-MX', { weekday: 'short' });
    setCart(prev => [...prev, {
      id: menu.id,
      name: menu.main_course_name ? `Combo ${dayName}` : 'Menú del Día',
      price,
      date: menu.date,
      walletType: 'comedor',
      sourceType: 'daily_menu',
      image_url: menu.products?.image_url,
      cartKey,
    }]);
  }, [cart]);

  const addSnackToCart = useCallback((product: Product, date: string) => {
    const cartKey = `snack-${product.id}-${date}`;
    if (!cart.some(i => i.cartKey === cartKey)) {
      setCart(prev => [...prev, {
        id: product.id,
        name: product.name,
        price: parseFloat(String(product.base_price)),
        date,
        walletType: 'snack',
        sourceType: 'product',
        image_url: product.image_url,
        category: product.category,
        cartKey,
      }]);
    }
    setSnackDateTarget(null);
  }, [cart]);

  const removeFromCart = useCallback((cartKey: string) => {
    setCart(prev => prev.filter(i => i.cartKey !== cartKey));
  }, []);

  // ── Checkout ──

  const handleOpenCheckout = () => {
    setCheckoutError('');
    setCheckoutStatus('idle');
    setIsCheckoutOpen(true);
  };

  const handleConfirmCheckout = () => {
    if (!activeConsumer) return;
    startTransition(async () => {
      try {
        await createPreOrderTransaction(
          activeConsumer.id,
          cart.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            date: i.date,
            walletType: i.walletType,
            sourceType: i.sourceType,
          }))
        );
        setCheckoutStatus('success');
        setCart([]);
      } catch (e: any) {
        setCheckoutStatus('error');
        setCheckoutError(e.message || 'Error desconocido al procesar la pre-venta.');
      }
    });
  };

  // ── Empty state ──

  if (!activeConsumer) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e8f0f7] shadow-sm">
        <h2 className="text-xl font-black text-[#004B87]">No tienes alumnos vinculados aún.</h2>
        <p className="text-[#7CB9E8] font-medium mt-2">Contacta a la escuela para vincular a tu hijo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-40">

      {/* ── Header: Student Selector + Week Nav ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-3xl p-5 border border-[#e8f0f7] shadow-sm">
        {initialConsumers.length > 1 && (
          <div className="flex bg-[#f0f5fb] rounded-full p-1 gap-1 flex-wrap">
            {(initialConsumers as Consumer[]).map(c => (
              <button
                key={c.id}
                onClick={() => setActiveStudentId(c.id)}
                className={`px-5 py-2 rounded-full font-black text-sm transition-all duration-300 ${
                  activeStudentId === c.id
                    ? 'bg-[#004B87] text-white shadow-md'
                    : 'text-[#8aa8cc] hover:text-[#004B87]'
                }`}
              >
                {c.first_name} {c.last_name}
              </button>
            ))}
          </div>
        )}

        {/* Week Navigator */}
        <div className="flex items-center gap-3 sm:ml-auto">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="h-9 w-9 rounded-full border border-[#e8f0f7] flex items-center justify-center text-[#7CB9E8] hover:bg-[#e8f0f7] transition active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-black text-[#004B87] min-w-[190px] text-center tabular-nums">
            {formatWeekLabel(monday, friday)}
          </span>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="h-9 w-9 rounded-full border border-[#e8f0f7] flex items-center justify-center text-[#7CB9E8] hover:bg-[#e8f0f7] transition active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Wallet quick-balances */}
        <div className="flex items-center gap-3 border-l border-[#e8f0f7] pl-4 hidden sm:flex">
          <div className="text-right">
            <p className="text-[10px] font-black text-[#7CB9E8] uppercase tracking-widest">Comedor</p>
            <p className={`text-sm font-black ${(comedorWallet?.balance ?? 0) < 0 ? 'text-red-500' : 'text-[#004B87]'}`}>
              ${parseFloat(String(comedorWallet?.balance ?? 0)).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Snack</p>
            <p className={`text-sm font-black ${(snackWallet?.balance ?? 0) < 0 ? 'text-red-500' : 'text-[#004B87]'}`}>
              ${parseFloat(String(snackWallet?.balance ?? 0)).toFixed(2)}
            </p>
          </div>
          <Wallet className="h-5 w-5 text-[#e8f0f7]" />
        </div>
      </div>

      {/* ── Section 1: Daily Menu Combos ── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-[#e8f0f7] h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Utensils className="h-5 w-5 text-[#004B87]" />
          </div>
          <div>
            <h2 className="font-black text-[#004B87] text-xl leading-tight">Combos Nutricionales del Día</h2>
            <p className="text-[#7CB9E8] text-sm font-medium">Débito de Billetera <span className="font-black">Comedor</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {weekDays.map((day, i) => {
            const dateStr = toDateString(day);
            const menu = weekMenus.find(m => m.date === dateStr);
            const cartKey = menu ? `combo-${menu.id}` : '';
            const isInCart = !!cartKey && cart.some(ci => ci.cartKey === cartKey);
            const isAlreadyPaid = menu
              ? existingPreorders.some(
                  (po: any) => po.daily_menu_id === menu.id && po.consumer_id === activeConsumer.id
                )
              : false;
            const price = menu
              ? parseFloat(String(menu.products?.base_price ?? menu.combo_price ?? 70))
              : 0;

            return (
              <div
                key={dateStr}
                className={`relative rounded-3xl border-2 overflow-hidden transition-all duration-300 flex flex-col ${
                  isAlreadyPaid
                    ? 'border-emerald-400 bg-emerald-50 opacity-85'
                    : isInCart
                    ? 'border-[#004B87] bg-[#004B87]/5 shadow-lg -translate-y-1'
                    : menu
                    ? 'border-[#e8f0f7] bg-white hover:border-[#7CB9E8] hover:shadow'
                    : 'border-dashed border-[#e8f0f7] bg-[#fafbfd]'
                }`}
              >
                {/* Day header */}
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#7CB9E8]">
                    {DAY_NAMES[i]}
                  </p>
                  <p className="text-2xl font-black text-[#004B87]">{day.getDate()}</p>
                </div>

                {!menu ? (
                  <div className="px-4 pb-4 flex-1 flex items-center justify-center">
                    <p className="text-[#c0d4e8] text-xs font-medium text-center">Sin menú planificado</p>
                  </div>
                ) : (
                  <div className="px-4 pb-4 space-y-3 flex-1 flex flex-col">
                    {/* Image */}
                    <div className="h-20 bg-[#f0f5fb] rounded-2xl overflow-hidden border border-[#e8f0f7] flex-shrink-0">
                      {menu.products?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={menu.products.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🍲</div>
                      )}
                    </div>

                    {/* Menu details */}
                    <div className="space-y-0.5 flex-1">
                      {menu.soup_name && (
                        <p className="text-[10px] text-[#8aa8cc] font-semibold leading-tight line-clamp-1">
                          🍜 {menu.soup_name}
                        </p>
                      )}
                      {menu.main_course_name && (
                        <p className="text-xs font-black text-[#004B87] leading-tight line-clamp-1">
                          {menu.main_course_name}
                        </p>
                      )}
                      {menu.side_dish_name && (
                        <p className="text-[10px] text-[#8aa8cc] font-semibold leading-tight line-clamp-1">
                          🥗 {menu.side_dish_name}
                        </p>
                      )}
                      {menu.dessert_name && (
                        <p className="text-[10px] text-[#8aa8cc] font-semibold leading-tight line-clamp-1">
                          🍮 {menu.dessert_name}
                        </p>
                      )}
                      {menu.drink_name && (
                        <p className="text-[10px] text-[#8aa8cc] font-semibold leading-tight line-clamp-1">
                          🥤 {menu.drink_name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-black text-[#004B87] text-sm">${price.toFixed(2)}</span>
                    </div>

                    {isAlreadyPaid ? (
                      <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-2 rounded-xl text-center flex items-center justify-center gap-1">
                        <Check className="h-3 w-3" /> PAGADO
                      </div>
                    ) : isInCart ? (
                      <button
                        onClick={() => removeFromCart(cartKey)}
                        className="w-full bg-[#004B87] text-white text-[10px] font-black px-3 py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-red-500 transition-colors active:scale-95"
                      >
                        <X className="h-3 w-3" /> Quitar del carrito
                      </button>
                    ) : (
                      <button
                        onClick={() => addComboToCart(menu)}
                        className="w-full bg-[#e8f0f7] text-[#004B87] text-[10px] font-black px-3 py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-[#004B87] hover:text-white transition-colors active:scale-95"
                      >
                        <Plus className="h-3 w-3" /> Añadir a Pre-venta
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Snacks & Bebidas Catalog ── */}
      <section>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-black text-[#004B87] text-xl leading-tight">Snacks y Bebidas</h2>
              <p className="text-amber-600 text-sm font-medium">Débito de Billetera <span className="font-black">Snack</span></p>
            </div>
          </div>

          {/* Category filter pills */}
          <div className="flex bg-white rounded-full p-1 border border-[#e8f0f7] shadow-sm gap-1">
            {(['all', 'snack', 'bebida'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-all duration-200 ${
                  categoryFilter === cat
                    ? 'bg-amber-500 text-white shadow'
                    : 'text-[#8aa8cc] hover:text-[#004B87]'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat === 'snack' ? '🥨 Snacks' : '🥤 Bebidas'}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-[#e8f0f7] p-12 text-center">
            <Package className="h-12 w-12 text-[#e8f0f7] mx-auto mb-3" />
            <p className="text-[#b0c8e0] font-medium">
              {products.length === 0
                ? 'La escuela aún no tiene snacks o bebidas en el catálogo.'
                : 'No hay productos en esta categoría.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => {
              const isOutOfStock = product.stock_quantity !== undefined &&
                product.stock_quantity !== null &&
                product.stock_quantity === 0;
              const isLowStock = !isOutOfStock &&
                product.stock_quantity !== undefined &&
                product.stock_quantity !== null &&
                product.stock_quantity <= 5;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl border border-[#e8f0f7] shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 overflow-hidden flex flex-col group"
                >
                  {/* Product image */}
                  <div className="h-28 bg-[#f0f5fb] relative overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {CATEGORY_EMOJIS[product.category] ?? '🍽️'}
                      </div>
                    )}

                    {/* Stock badge */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <span className="text-xs font-black text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                          Agotado
                        </span>
                      </div>
                    )}
                    {isLowStock && !isOutOfStock && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                        Quedan {product.stock_quantity}
                      </div>
                    )}

                    {/* Category badge */}
                    <div className="absolute bottom-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {product.category}
                    </div>
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-black text-[#004B87] text-sm leading-tight mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-[#8aa8cc] text-[11px] line-clamp-2 mb-2 leading-snug">
                        {product.description}
                      </p>
                    )}
                    {product.nutri_points_reward && product.nutri_points_reward > 0 && (
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit mb-2">
                        +{product.nutri_points_reward} pts
                      </span>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                      <span className="font-black text-[#004B87] text-base">
                        ${parseFloat(String(product.base_price)).toFixed(2)}
                      </span>
                      <button
                        onClick={() => !isOutOfStock && setSnackDateTarget(product)}
                        disabled={isOutOfStock}
                        className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-300 text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors active:scale-95"
                      >
                        <Plus className="h-3 w-3" />
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Snack Date Picker Modal ── */}
      {snackDateTarget && (
        <SnackDateModal
          product={snackDateTarget}
          weekDays={weekDays}
          existingCartKeys={cart.map(i => i.cartKey)}
          onAdd={addSnackToCart}
          onClose={() => setSnackDateTarget(null)}
        />
      )}

      {/* ── Floating Cart Bar ── */}
      {cart.length > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#004B87] text-white rounded-full shadow-2xl shadow-blue-900/30 flex items-center gap-3 pl-5 pr-2 py-2 border border-white/10 backdrop-blur-sm">
            <div className="relative">
              <ShoppingCart className="h-5 w-5 text-white" />
              <span className="absolute -top-2 -right-2 bg-amber-400 text-[#004B87] text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            </div>

            <div className="hidden sm:block">
              <p className="text-[9px] text-blue-300 font-bold uppercase tracking-widest leading-none">Pre-venta</p>
              <p className="font-black text-sm leading-tight">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
            </div>

            <div className="h-6 w-px bg-white/20 hidden sm:block" />

            {/* Wallet breakdown pill */}
            <div className="flex items-center gap-2 text-sm">
              {comedorTotal > 0 && (
                <span className="bg-white/10 rounded-full px-2.5 py-1 text-[11px] font-black">
                  🍽️ ${comedorTotal.toFixed(2)}
                </span>
              )}
              {snackTotal > 0 && (
                <span className="bg-amber-400/20 text-amber-300 rounded-full px-2.5 py-1 text-[11px] font-black">
                  🥨 ${snackTotal.toFixed(2)}
                </span>
              )}
            </div>

            <button
              onClick={handleOpenCheckout}
              className="bg-[#F4C430] hover:bg-amber-400 text-[#004B87] font-black text-sm px-5 py-2.5 rounded-full transition-all active:scale-95 ml-1 whitespace-nowrap"
            >
              Confirmar · ${cartTotal.toFixed(2)} →
            </button>
          </div>
        </div>
      )}

      {/* ── Checkout Modal ── */}
      {isCheckoutOpen && (
        <CheckoutModal
          cart={cart}
          comedorTotal={comedorTotal}
          snackTotal={snackTotal}
          cartTotal={cartTotal}
          comedorBalance={parseFloat(String(comedorWallet?.balance ?? 0))}
          snackBalance={parseFloat(String(snackWallet?.balance ?? 0))}
          consumerName={activeConsumer.first_name}
          isProcessing={isPending}
          status={checkoutStatus}
          errorMessage={checkoutError}
          onConfirm={handleConfirmCheckout}
          onClose={() => {
            setIsCheckoutOpen(false);
            setCheckoutStatus('idle');
            setCheckoutError('');
          }}
        />
      )}
    </div>
  );
}

// ─── Snack Date Picker Modal ──────────────────────────────────────────────────

function SnackDateModal({
  product,
  weekDays,
  existingCartKeys,
  onAdd,
  onClose,
}: {
  product: Product;
  weekDays: Date[];
  existingCartKeys: string[];
  onAdd: (product: Product, date: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#004B87]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 border border-[#e8f0f7]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#b0c8e0] hover:text-[#004B87] transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Product header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl overflow-hidden border border-amber-100 flex-shrink-0">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span>{CATEGORY_EMOJIS[product.category] ?? '🍽️'}</span>
            )}
          </div>
          <div>
            <h3 className="font-black text-[#004B87] leading-tight">{product.name}</h3>
            <p className="text-amber-600 font-black text-sm">${parseFloat(String(product.base_price)).toFixed(2)}</p>
            <p className="text-[#8aa8cc] text-xs font-medium mt-0.5">Billetera Snack</p>
          </div>
        </div>

        {/* Date selector */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-[#7CB9E8]" />
            <p className="text-sm font-black text-[#004B87]">¿Para qué día de la semana?</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {weekDays.map((day, i) => {
              const dateStr = toDateString(day);
              const isPast = day < today;
              const cartKey = `snack-${product.id}-${dateStr}`;
              const alreadyInCart = existingCartKeys.includes(cartKey);

              return (
                <button
                  key={dateStr}
                  onClick={() => !isPast && !alreadyInCart && onAdd(product, dateStr)}
                  disabled={isPast || alreadyInCart}
                  className={`flex flex-col items-center p-2.5 rounded-2xl border-2 transition-all duration-150 ${
                    alreadyInCart
                      ? 'border-emerald-400 bg-emerald-50 cursor-default'
                      : isPast
                      ? 'border-[#e8f0f7] bg-[#f8fafd] opacity-40 cursor-not-allowed'
                      : 'border-[#e8f0f7] hover:border-amber-400 hover:bg-amber-50 active:scale-95 cursor-pointer'
                  }`}
                >
                  <span className="text-[10px] font-black text-[#7CB9E8] uppercase">{DAY_NAMES[i]}</span>
                  <span className="font-black text-[#004B87] text-xl leading-none mt-0.5">{day.getDate()}</span>
                  {alreadyInCart && <Check className="h-3 w-3 text-emerald-500 mt-1" />}
                </button>
              );
            })}
          </div>
          <p className="text-[#b0c8e0] text-xs mt-3 text-center">
            Puedes añadir el mismo snack para distintos días — una selección por día.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Checkout Modal ───────────────────────────────────────────────────────────

function CheckoutModal({
  cart,
  comedorTotal,
  snackTotal,
  cartTotal,
  comedorBalance,
  snackBalance,
  consumerName,
  isProcessing,
  status,
  errorMessage,
  onConfirm,
  onClose,
}: {
  cart: CartItem[];
  comedorTotal: number;
  snackTotal: number;
  cartTotal: number;
  comedorBalance: number;
  snackBalance: number;
  consumerName: string;
  isProcessing: boolean;
  status: 'idle' | 'success' | 'error';
  errorMessage: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const insufficientComedor = comedorTotal > 0 && comedorBalance < comedorTotal;
  const insufficientSnack = snackTotal > 0 && snackBalance < snackTotal;
  const canProceed = !insufficientComedor && !insufficientSnack && !isProcessing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#004B87]/60 backdrop-blur-md"
        onClick={status === 'success' ? undefined : onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden border border-[#e8f0f7]">

        {/* ── Success State ── */}
        {status === 'success' && (
          <div className="p-10 text-center">
            <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100 ring-offset-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black text-[#004B87] mb-2">¡Pre-venta Confirmada!</h2>
            <p className="text-[#7CB9E8] font-medium mb-8">
              Los alimentos de <span className="font-black text-[#004B87]">{consumerName}</span> están reservados y los saldos fueron debitados.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-[#004B87] text-white font-black py-4 rounded-2xl hover:bg-[#003a6b] transition-colors active:scale-95"
            >
              ¡Listo! 🎉
            </button>
          </div>
        )}

        {/* ── Error State ── */}
        {status === 'error' && (
          <div className="p-10 text-center">
            <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-[#004B87] mb-3">Error al Procesar</h2>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-red-700 font-bold text-sm">{errorMessage}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-[#e8f0f7] text-[#8aa8cc] font-bold py-3.5 rounded-2xl hover:bg-[#f0f5fb] transition"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 bg-[#004B87] text-white font-black py-3.5 rounded-2xl hover:bg-[#003a6b] transition active:scale-95"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ── Idle / Confirm State ── */}
        {status === 'idle' && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-[#004B87] to-[#0063b3] p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Confirmar Pre-venta</h2>
                  <p className="text-blue-300 text-sm mt-0.5">Para: <span className="font-black text-white">{consumerName}</span></p>
                </div>
                <button onClick={onClose} className="text-blue-300 hover:text-white transition p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="max-h-[35vh] overflow-y-auto divide-y divide-[#f0f5fb]">
              {cart.map(item => (
                <div
                  key={item.cartKey}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                      item.walletType === 'comedor' ? 'bg-[#e8f0f7]' : 'bg-amber-100'
                    }`}>
                      {item.walletType === 'comedor' ? '🍽️' : CATEGORY_EMOJIS[item.category ?? 'snack'] ?? '🥨'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#004B87] leading-tight">{item.name}</p>
                      <p className="text-[11px] text-[#8aa8cc]">
                        {formatDateLong(item.date)}
                        {' · '}
                        <span className={`font-bold uppercase ${item.walletType === 'comedor' ? 'text-[#7CB9E8]' : 'text-amber-500'}`}>
                          {item.walletType}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-[#004B87] text-sm flex-shrink-0 ml-3">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Wallet breakdown */}
            <div className="px-6 pt-4 pb-2 space-y-3 border-t border-[#f0f5fb]">
              {comedorTotal > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 bg-[#e8f0f7] rounded-xl flex items-center justify-center text-base">🍽️</div>
                    <div>
                      <p className="text-[10px] font-black text-[#004B87] uppercase tracking-widest">Billetera Comedor</p>
                      <p className={`text-[10px] font-semibold ${insufficientComedor ? 'text-red-500' : 'text-[#8aa8cc]'}`}>
                        Saldo disponible: ${comedorBalance.toFixed(2)}
                        {insufficientComedor && ' — ⚠️ Insuficiente'}
                      </p>
                    </div>
                  </div>
                  <span className={`font-black text-lg ${insufficientComedor ? 'text-red-500' : 'text-[#004B87]'}`}>
                    −${comedorTotal.toFixed(2)}
                  </span>
                </div>
              )}

              {snackTotal > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 bg-amber-100 rounded-xl flex items-center justify-center text-base">🥨</div>
                    <div>
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Billetera Snack</p>
                      <p className={`text-[10px] font-semibold ${insufficientSnack ? 'text-red-500' : 'text-[#8aa8cc]'}`}>
                        Saldo disponible: ${snackBalance.toFixed(2)}
                        {insufficientSnack && ' — ⚠️ Insuficiente'}
                      </p>
                    </div>
                  </div>
                  <span className={`font-black text-lg ${insufficientSnack ? 'text-red-500' : 'text-amber-700'}`}>
                    −${snackTotal.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Total line */}
              <div className="border-t border-[#e8f0f7] pt-3 flex items-center justify-between">
                <span className="font-black text-[#004B87] uppercase tracking-wider text-xs">Total a Cobrar</span>
                <span className="font-black text-2xl text-[#004B87]">${cartTotal.toFixed(2)}</span>
              </div>

              {/* Insufficient balance warning */}
              {(insufficientComedor || insufficientSnack) && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm font-semibold leading-snug">
                    Saldo insuficiente en billetera{' '}
                    <span className="font-black">
                      {insufficientComedor && insufficientSnack
                        ? 'Comedor y Snack'
                        : insufficientComedor
                        ? 'Comedor'
                        : 'Snack'}
                    </span>. Recarga antes de continuar.
                  </p>
                </div>
              )}
            </div>

            {/* Confirm button */}
            <div className="p-6 pt-3">
              <button
                onClick={onConfirm}
                disabled={!canProceed}
                className="w-full bg-[#004B87] hover:bg-[#003a6b] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 active:scale-95"
              >
                {isProcessing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Procesando...</>
                ) : (
                  <>Confirmar Pre-venta — ${cartTotal.toFixed(2)}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
