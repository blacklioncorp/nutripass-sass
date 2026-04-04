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
import { validateCartAllergens } from '@/app/actions/allergen';

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
  nutriPoints?: number;
  specialInstructions?: string;
  hasAllergyOverride?: boolean;
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
  products?: {
    id: string;
    name?: string;
    description?: string;
    base_price?: number;
    image_url?: string;
    nutri_points_reward?: number;
  };
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
  comedor: '🍲', // Technically Desayuno now
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'snack' | 'bebida' | 'comedor'>('all');
  const [snackDateTarget, setSnackDateTarget] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState('');

  // IA Allergen Validation States
  const [isValidatingAllergens, setIsValidatingAllergens] = useState(false);
  const [allergenWarnings, setAllergenWarnings] = useState<string[]>([]);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isAllergyOverrideMode, setIsAllergyOverrideMode] = useState(false);

  // Active consumer
  const activeConsumer = useMemo<Consumer | undefined>(
    () => (initialConsumers as Consumer[]).find(c => c.id === activeStudentId) ?? (initialConsumers[0] as Consumer),
    [initialConsumers, activeStudentId]
  );

  // School White-labeling Color
  const schoolPrimaryColor = (activeConsumer as any)?.schools?.primary_color || '#10b981';

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

    const filtered = (products as Product[]).filter(
      p => {
        const schoolMatch = String(p.school_id) === String(activeConsumer.school_id);
        const availableMatch = p.is_available !== false; // Handle null as true if needed, but schema says DEFAULT true
        const categoryMatch = categoryFilter === 'all' || p.category === categoryFilter;
        return schoolMatch && availableMatch && categoryMatch;
      }
    );

    // Sanity log to help debug if products are missing in production
    if (products.length > 0 && filtered.length === 0) {
      console.log('[Preorders] Products found in DB but filtered out for student:', {
        studentSchoolId: activeConsumer.school_id,
        firstProductSchoolId: products[0]?.school_id,
        categoryFilter,
      });
    }

    return filtered;
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
      name: menu.main_course_name ? `Desayuno ${dayName}` : 'Menú del Día',
      price,
      date: menu.date,
      walletType: 'comedor',
      sourceType: 'daily_menu',
      image_url: menu.products?.image_url,
      cartKey,
      nutriPoints: menu.products?.nutri_points_reward ?? 0,
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
        nutriPoints: product.nutri_points_reward ?? 0,
      }]);
    }
    setSnackDateTarget(null);
  }, [cart]);

  const removeFromCart = useCallback((cartKey: string) => {
    setCart(prev => prev.filter(i => i.cartKey !== cartKey));
  }, []);

  // ── Checkout ──

  const handleOpenCheckout = async () => {
    if (!activeConsumer) return;
    setCheckoutError('');
    setCheckoutStatus('idle');

    setIsValidatingAllergens(true);
    const aiResult = await validateCartAllergens(
      activeConsumer.id,
      cart.map(item => ({
        id: item.id,
        name: item.name,
        description: (products as Product[]).find(p => p.id === item.id)?.description,
        sourceType: item.sourceType
      }))
    );
    setIsValidatingAllergens(false);

    if (!aiResult.safe && aiResult.warnings.length > 0) {
      setAllergenWarnings(aiResult.warnings);
      setIsWarningOpen(true);
    } else {
      setIsCheckoutOpen(true);
    }
  };

  const handleConfirmCheckout = () => {
    if (!activeConsumer) return;
    startTransition(async () => {
      try {
        const result = await createPreOrderTransaction(
          activeConsumer.id,
          cart.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            date: i.date,
            walletType: i.walletType,
            sourceType: i.sourceType,
            nutriPoints: i.nutriPoints,
            specialInstructions: i.specialInstructions,
            hasAllergyOverride: i.hasAllergyOverride,
          }))
        );

        if (result && result.error) {
          throw new Error(result.error);
        }

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
                className={`px-5 py-2 rounded-full font-black text-sm transition-all duration-300 ${activeStudentId === c.id
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
            <h2 className="font-black text-[#004B87] text-xl leading-tight">Desayunos Nutricionales del Día</h2>
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
                className={`relative rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col shadow-sm hover:shadow-md ${isAlreadyPaid
                  ? 'border-emerald-200 bg-emerald-50/50 opacity-85'
                  : isInCart
                    ? 'border-[#004B87] bg-[#004B87]/5 shadow-md -translate-y-1'
                    : menu
                      ? 'border-slate-100 bg-white hover:border-slate-200'
                      : 'border-dashed border-slate-200 bg-slate-50'
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
          <div className="flex bg-white rounded-full p-1 border border-[#e8f0f7] shadow-sm gap-1 overflow-x-auto no-scrollbar max-w-full">
            {(['all', 'snack', 'bebida', 'comedor'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-black transition-all duration-200 whitespace-nowrap ${categoryFilter === cat
                  ? 'bg-amber-500 text-white shadow'
                  : 'text-[#8aa8cc] hover:text-[#004B87]'
                  }`}
              >
                {cat === 'all' ? 'Todos' : cat === 'snack' ? '🥨 Snacks' : cat === 'bebida' ? '🥤 Bebidas' : '🍲 Desayuno'}
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
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 overflow-hidden flex flex-col group"
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
                      {product.category === 'comedor' ? 'desayuno' : product.category}
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
                      {cart.some(i => i.id === product.id) ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSnackDateTarget(product)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-2 py-1.5 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                          >
                            <Check className="h-3 w-3" />
                            {cart.filter(i => i.id === product.id).length} en Carrito
                          </button>
                          <button
                            onClick={() => {
                              const itemToRemove = cart.find(i => i.id === product.id);
                              if (itemToRemove) removeFromCart(itemToRemove.cartKey);
                            }}
                            className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded-xl transition-colors"
                            title="Quitar uno"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => !isOutOfStock && setSnackDateTarget(product)}
                          disabled={isOutOfStock}
                          style={{ backgroundColor: isOutOfStock ? undefined : schoolPrimaryColor }}
                          className="disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-300 shadow hover:opacity-90 text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 transition-opacity active:scale-95"
                        >
                          <Plus className="h-3 w-3" />
                          Añadir
                        </button>
                      )}
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
          onRemove={removeFromCart}
          onClose={() => setSnackDateTarget(null)}
        />
      )}

      {/* ── Floating Cart Bar ── */}
      {cart.length > 0 && !isCheckoutOpen && !isWarningOpen && (
        <div className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-bottom-4 duration-300 w-full max-w-[95%] sm:max-w-max">
          <div className="bg-[#004B87] text-white rounded-full shadow-2xl shadow-blue-900/40 flex items-center justify-between sm:justify-center gap-3 pl-5 pr-2 py-2 border border-white/10 backdrop-blur-sm mx-auto">
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
              disabled={isValidatingAllergens}
              style={{ backgroundColor: isValidatingAllergens ? undefined : schoolPrimaryColor }}
              className="disabled:opacity-50 disabled:bg-slate-300 hover:opacity-90 shadow-lg text-white font-black text-sm px-5 py-2.5 rounded-full transition-opacity active:scale-95 ml-1 whitespace-nowrap flex items-center gap-2"
            >
              {isValidatingAllergens ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>Confirmar · ${cartTotal.toFixed(2)} →</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Allergen Warning Modal ── */}
      {isWarningOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-28 md:pb-4">
          <div className="absolute inset-0 bg-[#004B87]/50 backdrop-blur-sm" onClick={() => setIsWarningOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] animate-in zoom-in-95 duration-200 border border-red-100 flex flex-col outline-none overflow-hidden">

            {/* Encabezado Fijo (Header) */}
            <div className="flex-shrink-0 p-6 md:p-8 pb-4 text-center relative border-b border-slate-50">
              <button
                onClick={() => setIsWarningOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">¡Alerta Nutricional!</h2>
              <p className="text-slate-500 font-medium">
                La Inteligencia Artificial de NutriPass detectó que los productos en tu carrito podrían poner en riesgo a <span className="font-black text-rose-500">{activeConsumer.first_name}</span>.
              </p>
            </div>

            {/* Cuerpo Scrolleable (Content) */}
            <div className="overflow-y-auto flex-grow px-6 md:px-8 py-4 pr-3 custom-scrollbar">
              {isAllergyOverrideMode ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                  <p className="text-sm font-black uppercase tracking-widest text-[#004B87]">Términos de Excepción</p>
                  <p className="text-[#004B87] text-sm font-medium">
                    Has decidido solicitar los productos omitiendo el ingrediente o alérgeno detectado.
                  </p>
                  <div className="flex items-start gap-3 mt-4">
                    <input type="checkbox" id="liability" className="mt-1 h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500" required />
                    <label htmlFor="liability" className="text-sm font-bold text-amber-900 leading-snug">
                      "Asumo la responsabilidad de solicitar la preparación especial de este producto para {activeConsumer.first_name}."
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-rose-800">Riesgos Identificados (IA)</p>
                  <ul className="list-disc list-inside space-y-2 text-rose-700 text-sm font-bold">
                    {allergenWarnings.map((w, idx) => (
                      <li key={idx} className="leading-snug">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Pie de Página Fijo (Footer) */}
            <div className="flex-shrink-0 p-5 md:p-8 pt-4 border-t border-slate-200 shadow-inner bg-white z-10 w-full">
              {isAllergyOverrideMode ? (
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => {
                      const cb = document.getElementById('liability') as HTMLInputElement;
                      if (!cb?.checked) return alert("Debes aceptar la responsabilidad para continuar.");

                      // Modificar el carrito para inyectar las notas
                      setCart(prev => prev.map(item => ({
                        ...item,
                        hasAllergyOverride: true,
                        specialInstructions: "⚠️ PREPARAR SIN: Alérgenos marcados (Alerta Omitida por el Padre)"
                      })));

                      setIsWarningOpen(false);
                      setIsAllergyOverrideMode(false);
                      setIsCheckoutOpen(true);
                    }}
                    style={{ backgroundColor: schoolPrimaryColor }}
                    className="w-full hover:opacity-90 text-white font-black text-base py-3.5 rounded-xl shadow-md transition-all"
                  >
                    Confirmar y Continuar
                  </button>
                  <button
                    onClick={() => setIsAllergyOverrideMode(false)}
                    className="w-full text-slate-500 font-bold py-2 hover:text-slate-700 transition"
                  >
                    Volver a Alertas
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => setIsAllergyOverrideMode(true)}
                    className="w-full bg-emerald-500 text-white font-black text-base py-3.5 rounded-xl hover:bg-emerald-600 transition shadow-md flex items-center justify-center gap-2"
                  >
                    ⚠️ Solicitar sin alérgenos
                  </button>
                  <button
                    onClick={() => {
                      setIsWarningOpen(false);
                      setCart([]); // Clear cart to simulate cancelling entirely
                    }}
                    className="w-full border-2 border-slate-200 text-slate-500 hover:bg-slate-50 font-black text-base py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    ❌ Cancelar pedido
                  </button>
                </div>
              )}
            </div>

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
          schoolLogoUrl={(activeConsumer as any).schools?.logo_url}
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
  onRemove,
  onClose,
}: {
  product: Product;
  weekDays: Date[];
  existingCartKeys: string[];
  onAdd: (product: Product, date: string) => void;
  onRemove: (cartKey: string) => void;
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
                  onClick={() => {
                    if (alreadyInCart) onRemove(cartKey);
                    else if (!isPast) onAdd(product, dateStr);
                  }}
                  disabled={isPast && !alreadyInCart}
                  className={`flex flex-col items-center p-2.5 rounded-2xl border-2 transition-all duration-150 ${alreadyInCart
                    ? 'border-emerald-400 bg-emerald-50 hover:border-red-400 hover:bg-red-50 text-emerald-500 hover:text-red-500 cursor-pointer'
                    : isPast
                      ? 'border-[#e8f0f7] bg-[#f8fafd] opacity-40 cursor-not-allowed'
                      : 'border-[#e8f0f7] hover:border-amber-400 hover:bg-amber-50 active:scale-95 cursor-pointer text-[#004B87]'
                    }`}
                >
                  <span className="text-[10px] font-black uppercase">{DAY_NAMES[i]}</span>
                  <span className="font-black text-xl leading-none mt-0.5">{day.getDate()}</span>
                  {alreadyInCart ? (
                    <Check className="h-3 w-3 mt-1" />
                  ) : (
                    <Plus className="h-2 w-2 mt-1 opacity-20" />
                  )}
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
  schoolLogoUrl,
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
  schoolLogoUrl?: string;
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
            {schoolLogoUrl ? (
              <div className="h-24 flex items-center justify-center mx-auto mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={schoolLogoUrl} alt="Colegio" className="h-24 w-auto object-contain drop-shadow-sm" />
              </div>
            ) : (
              <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100 ring-offset-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
            )}
            <h2 className="text-3xl font-black text-[#004B87] mb-2">¡Recibo Digital!</h2>
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
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${item.walletType === 'comedor' ? 'bg-[#e8f0f7]' : 'bg-amber-100'
                      }`}>
                      {item.walletType === 'comedor' ? '🍽️' : CATEGORY_EMOJIS[item.category ?? 'snack'] ?? '🥨'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#004B87] leading-tight">{item.name}</p>
                      <p className="text-[11px] text-[#8aa8cc]">
                        {formatDateLong(item.date)}
                        {' · '}
                        <span className={`font-black uppercase ${item.walletType === 'comedor' ? 'text-[#7CB9E8]' : 'text-amber-500'}`}>
                          {item.sourceType === 'daily_menu' || item.category === 'comedor' ? 'DESAYUNO' : (item.category ?? 'PRODUCTO')}
                        </span>
                      </p>
                      {item.specialInstructions && (
                        <p className="text-[10px] text-rose-500 font-bold leading-tight mt-1 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                          {item.specialInstructions}
                        </p>
                      )}
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
                style={{ backgroundColor: canProceed ? (schoolLogoUrl ? '#004B87' : '#10b981') : undefined }}
                className="w-full disabled:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
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