import React, { useState } from 'react';
import { BakeryProduct, Language, ShopConfig, StockEntry } from '../types';
import {
  getStockEntries,
  updateProductStock,
  saveProducts,
  exportStockReportCsv
} from '../utils/storage';
import {
  Boxes,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  AlertCircle,
  Bell,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  History,
  TrendingUp,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  X,
  RefreshCw,
  Sparkles,
  Calendar,
  Layers,
  ShoppingBag,
  Sliders,
  ChevronDown,
  ChevronUp,
  Check,
  Edit2,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface StockManagementProps {
  products: BakeryProduct[];
  setProducts: (products: BakeryProduct[]) => void;
  config: ShopConfig;
  lang: Language;
}

export const StockManagement: React.FC<StockManagementProps> = ({
  products,
  setProducts,
  config,
  lang
}) => {
  const isBn = lang === 'bn';

  // Navigation inside stock tab
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'history'>('inventory');

  // Configurable Alert Threshold
  const [globalThreshold, setGlobalThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dcc_stock_alert_threshold');
      return saved ? Math.max(1, parseInt(saved, 10) || 5) : 5;
    } catch {
      return 5;
    }
  });

  // Alert Banner visibility & expansion
  const [alertDismissed, setAlertDismissed] = useState<boolean>(false);
  const [showShortfallDetails, setShowShortfallDetails] = useState<boolean>(true);

  // Per-product threshold editing state
  const [editingThresholdProdId, setEditingThresholdProdId] = useState<string | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<number>(5);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'alert' | 'low' | 'out'>('all');

  // Stock Entry Modal
  const [isEntryModalOpen, setIsEntryModalOpen] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [entryType, setEntryType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState<number>(10);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [supplierOrBaker, setSupplierOrBaker] = useState<string>('');

  // History entries
  const [stockEntries, setStockEntries] = useState<StockEntry[]>(() => getStockEntries());

  // Helper to determine active threshold for a product
  const getProductThreshold = (p: BakeryProduct): number => {
    return typeof p.minStockAlert === 'number' && p.minStockAlert > 0
      ? p.minStockAlert
      : globalThreshold;
  };

  const handleUpdateGlobalThreshold = (newVal: number) => {
    const val = Math.max(1, newVal);
    setGlobalThreshold(val);
    try {
      localStorage.setItem('dcc_stock_alert_threshold', String(val));
    } catch (e) {
      console.error('Failed to save stock alert threshold:', e);
    }
  };

  const handleSaveProductThreshold = (productId: string, val: number) => {
    const minVal = Math.max(1, val);
    const updated = products.map((p) => (p.id === productId ? { ...p, minStockAlert: minVal } : p));
    setProducts(updated);
    saveProducts(updated);
    setEditingThresholdProdId(null);
  };

  // Metrics
  const totalItemsTracked = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);

  const outOfStockProducts = products.filter((p) => (p.stockQuantity || 0) === 0);
  const lowStockProducts = products.filter((p) => {
    const stock = p.stockQuantity || 0;
    const thresh = getProductThreshold(p);
    return stock > 0 && stock <= thresh;
  });
  const allAlertProducts = [...outOfStockProducts, ...lowStockProducts];

  const totalShortfallUnits = allAlertProducts.reduce((acc, p) => {
    const stock = p.stockQuantity || 0;
    const thresh = getProductThreshold(p);
    return acc + Math.max(0, thresh - stock);
  }, 0);

  const totalEstimatedStockValue = products.reduce(
    (acc, p) => acc + (p.stockQuantity || 0) * (p.costPrice || p.defaultRate * 0.6),
    0
  );

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchEn = p.nameEn.toLowerCase().includes(q);
      const matchBn = p.nameBn.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      if (!matchEn && !matchBn && !matchCat) return false;
    }

    // Category
    if (categoryFilter !== 'all' && p.category !== categoryFilter) {
      return false;
    }

    // Stock Status
    const stock = p.stockQuantity || 0;
    const thresh = getProductThreshold(p);
    if (stockStatusFilter === 'alert' && stock > thresh) return false;
    if (stockStatusFilter === 'low' && (stock === 0 || stock > thresh)) return false;
    if (stockStatusFilter === 'out' && stock > 0) return false;

    return true;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Handlers
  const handleOpenEntryModal = (
    prodId?: string,
    defaultType: 'in' | 'out' | 'adjustment' = 'in',
    customQty?: number
  ) => {
    const targetId = prodId || products[0]?.id || '';
    setSelectedProductId(targetId);
    setEntryType(defaultType);

    const prod = products.find((p) => p.id === targetId);
    const calculatedQty =
      customQty !== undefined && customQty > 0
        ? customQty
        : defaultType === 'out'
        ? 1
        : prod
        ? Math.max(10, getProductThreshold(prod) * 2)
        : 10;

    setQuantity(calculatedQty);
    setCostPrice(prod?.costPrice || Math.round((prod?.defaultRate || 100) * 0.6));
    setReason(
      defaultType === 'in'
        ? isBn
          ? 'সকালের ফ্রেশ কেক তৈরি / স্টক রি-ফিল'
          : 'Fresh Bake / Restock'
        : defaultType === 'out'
        ? isBn
          ? 'ড্যামেজ / নষ্ট'
          : 'Damaged / Wastage'
        : isBn
          ? 'স্টক সংশোধন'
          : 'Physical Audit Correction'
    );
    setSupplierOrBaker('DELICIOUS CAKE CORNER Bakery');
    setIsEntryModalOpen(true);
  };

  const handleSaveStockEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) {
      alert(isBn ? 'সঠিক পরিমাণ লিখুন।' : 'Please enter a valid quantity.');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    let delta = quantity;
    if (entryType === 'out') {
      delta = -quantity;
    } else if (entryType === 'adjustment') {
      const current = prod.stockQuantity || 0;
      delta = quantity - current;
    }

    updateProductStock(
      selectedProductId,
      delta,
      reason,
      entryType,
      costPrice > 0 ? costPrice : undefined,
      supplierOrBaker
    );

    // Refresh state
    const updated = products.map((p) => {
      if (p.id === selectedProductId) {
        const current = p.stockQuantity || 0;
        const newStock = entryType === 'adjustment' ? quantity : Math.max(0, current + delta);
        return {
          ...p,
          stockQuantity: newStock,
          costPrice: costPrice > 0 ? costPrice : p.costPrice
        };
      }
      return p;
    });

    setProducts(updated);
    setStockEntries(getStockEntries());
    setIsEntryModalOpen(false);
  };

  const handleQuickStockStep = (prodId: string, step: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const current = prod.stockQuantity || 0;
    if (step < 0 && current <= 0) return;

    updateProductStock(
      prodId,
      step,
      step > 0 ? (isBn ? 'দ্রুত স্টক যোগ' : 'Quick Restock') : isBn ? 'দ্রুত স্টক কমানো' : 'Quick Decrement',
      step > 0 ? 'in' : 'out'
    );

    const updated = products.map((p) =>
      p.id === prodId ? { ...p, stockQuantity: Math.max(0, current + step) } : p
    );
    setProducts(updated);
    setStockEntries(getStockEntries());
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header & Action Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#4b1d3f]" />
              <span>{isBn ? 'স্টক এন্ট্রি ও ইনভেন্টরি ম্যানেজমেন্ট' : 'Stock Entry & Inventory Management'}</span>
            </h2>
            <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
              {config.shopName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn
              ? 'বেকারির কেক, পেস্ট্রি ও সামগ্রীর দৈনন্দিন মজুদ হিসাব, রিয়েল-টাইম ঘাটতি সতর্কতা ও রি-স্টক'
              : 'Track daily baked cakes, stock in/out, reorder alerts, and real-time inventory'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Subtabs switcher */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setActiveSubTab('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                activeSubTab === 'inventory'
                  ? 'bg-white text-[#4b1d3f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 inline mr-1" />
              <span>{isBn ? 'মজুদ তালিকা' : 'Inventory'}</span>
              {allAlertProducts.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-extrabold font-mono animate-pulse">
                  {allAlertProducts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setStockEntries(getStockEntries());
                setActiveSubTab('history');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'history'
                  ? 'bg-white text-[#4b1d3f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 inline mr-1" />
              <span>{isBn ? 'এন্ট্রি হিস্ট্রি' : 'Entry Log'}</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={() => exportStockReportCsv(products)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
            title="Download CSV Inventory Report"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'রিপোর্ট ডাউনলোড' : 'Export CSV'}</span>
          </button>

          {/* New Stock Entry Button */}
          <button
            onClick={() => handleOpenEntryModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>{isBn ? '+ স্টক এন্ট্রি করুন' : '+ New Stock Entry'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {isBn ? 'মোট আইটেম' : 'Tracked Items'}
          </span>
          <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums block mt-1">
            {totalItemsTracked}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {categories.length} {isBn ? 'ক্যাটাগরি' : 'categories'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {isBn ? 'মোট মজুদ পরিমাণ' : 'Total Stock Units'}
          </span>
          <span className="text-xl font-extrabold text-[#4b1d3f] font-mono tabular-nums block mt-1">
            {totalStockUnits}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            {isBn ? 'দোকানে মজুত আছে' : 'Available on shelves'}
          </span>
        </div>

        <div
          onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            lowStockProducts.length > 0
              ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400 ring-1 ring-amber-200'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{isBn ? 'কম স্টক অ্যালার্ট' : 'Low Stock Warning'}</span>
            </span>
            {lowStockProducts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                ≤ {globalThreshold}
              </span>
            )}
          </div>
          <span className="text-xl font-extrabold text-amber-900 font-mono tabular-nums block mt-1">
            {lowStockProducts.length}
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">
            {lowStockProducts.length > 0
              ? isBn
                ? 'এখনই তৈরি বা রি-স্টক করুন'
                : 'Need immediate restock'
              : isBn
              ? 'সব পর্যাপ্ত আছে'
              : 'Sufficient stock'}
          </span>
        </div>

        <div
          onClick={() => setStockStatusFilter(stockStatusFilter === 'out' ? 'all' : 'out')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            outOfStockProducts.length > 0
              ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400 ring-1 ring-rose-200'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>{isBn ? 'স্টক শেষ (০ ইউনিট)' : 'Out of Stock'}</span>
            </span>
            {outOfStockProducts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900 animate-pulse">
                EMPTY
              </span>
            )}
          </div>
          <span className="text-xl font-extrabold text-rose-900 font-mono tabular-nums block mt-1">
            {outOfStockProducts.length}
          </span>
          <span className="text-[10px] text-rose-600 mt-0.5 block font-medium">
            {outOfStockProducts.length > 0
              ? isBn
                ? 'ক্লিক করে তালিকা দেখুন'
                : 'Click to filter items'
              : isBn
              ? 'কোনোটি শেষ নেই'
              : 'None out of stock'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {isBn ? 'আনুমানিক মজুদ মূল্য' : 'Est. Inventory Value'}
          </span>
          <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums block mt-1">
            ₹{Math.round(totalEstimatedStockValue).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {isBn ? 'উৎপাদন/ক্রয় খরচের ভিত্তিতে' : 'Based on cost price'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'inventory' ? (
        <div className="space-y-4">
          {/* ======================================================== */}
          {/* DEDICATED VISUAL STOCK ALERT NOTIFICATION BANNER */}
          {/* ======================================================== */}
          {allAlertProducts.length > 0 ? (
            alertDismissed ? (
              /* Compact Re-openable Bar when Dismissed */
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-amber-50/90 border border-amber-300 rounded-2xl shadow-xs transition-all">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-600"></span>
                  </span>
                  <span className="font-bold text-xs text-amber-950">
                    {isBn
                      ? `${allAlertProducts.length} টি পণ্যের স্টক সতর্কতাসীমার (≤${globalThreshold}) নিচে রয়েছে`
                      : `${allAlertProducts.length} products have fallen below inventory threshold (≤${globalThreshold})`}
                  </span>
                  <span className="text-[11px] text-amber-800 hidden sm:inline">
                    ({outOfStockProducts.length} {isBn ? 'স্টক শেষ' : 'out of stock'}, {lowStockProducts.length} {isBn ? 'কম স্টক' : 'low stock'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStockStatusFilter('alert')}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                  >
                    {isBn ? 'তালিকায় ফিল্টার করুন' : 'Filter Alert Items'}
                  </button>
                  <button
                    onClick={() => setAlertDismissed(false)}
                    className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-700" />
                    <span>{isBn ? 'বিস্তারিত প্যানেল খুলুন' : 'Open Alert Panel'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded High-Visibility Stock Alert Card */
              <div
                className={`rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${
                  outOfStockProducts.length > 0
                    ? 'border-l-4 border-l-rose-600 bg-linear-to-r from-rose-50/90 via-amber-50/40 to-white border-rose-200'
                    : 'border-l-4 border-l-amber-500 bg-linear-to-r from-amber-50/90 via-amber-50/30 to-white border-amber-200'
                }`}
              >
                {/* Banner Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        outOfStockProducts.length > 0
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {outOfStockProducts.length > 0 ? (
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            outOfStockProducts.length > 0
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-slate-900'
                          }`}
                        >
                          {outOfStockProducts.length > 0
                            ? isBn
                              ? 'জরুরি স্টক ঘাটতি অ্যালার্ট'
                              : 'CRITICAL INVENTORY SHORTFALL'
                            : isBn
                            ? 'মজুদ হ্রাস সতর্কতা'
                            : 'LOW INVENTORY WARNING'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600">
                          {isBn ? `সতর্কতা সীমা: ≤${globalThreshold} ইউনিট` : `Safety Target: >${globalThreshold} units`}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        {isBn
                          ? `${allAlertProducts.length} টি পণ্যের স্টক নির্ধারিত সীমার নিচে নেমে গেছে!`
                          : `${allAlertProducts.length} products have fallen below safe inventory threshold!`}
                      </h3>

                      <p className="text-xs text-slate-600 mt-0.5">
                        <span className="font-bold text-rose-700">{outOfStockProducts.length}</span>{' '}
                        {isBn ? 'টি পুরোপুরি শেষ (০ ইউনিট)' : 'completely depleted (0 units)'} •{' '}
                        <span className="font-bold text-amber-700">{lowStockProducts.length}</span>{' '}
                        {isBn ? 'টি কম স্টকে রয়েছে' : 'below threshold'} •{' '}
                        {isBn ? 'নিরাপদ সীমায় আনতে মোট ঘাটতি:' : 'Replenishment shortfall:'}{' '}
                        <span className="font-extrabold text-slate-900 font-mono">
                          +{totalShortfallUnits} {isBn ? 'ইউনিট' : 'units'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Banner Controls & Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Stepper to adjust threshold directly from the banner */}
                    <div className="flex items-center bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500 mr-2">
                        {isBn ? 'সতর্কতা সীমা:' : 'Alert Threshold:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateGlobalThreshold(globalThreshold - 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors"
                        title={isBn ? 'সীমা কমান' : 'Decrease threshold'}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-mono font-extrabold text-xs text-[#4b1d3f]">
                        {globalThreshold}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateGlobalThreshold(globalThreshold + 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-colors"
                        title={isBn ? 'সীমা বাড়ান' : 'Increase threshold'}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Filter Table Toggle */}
                    <button
                      onClick={() => setStockStatusFilter(stockStatusFilter === 'alert' ? 'all' : 'alert')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        stockStatusFilter === 'alert'
                          ? 'bg-[#4b1d3f] text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>
                        {stockStatusFilter === 'alert'
                          ? isBn
                            ? 'সব দেখান'
                            : 'Showing Alerts (Reset)'
                          : isBn
                          ? 'কেবল সতর্কতার তালিকা'
                          : 'Filter Alert Items'}
                      </span>
                    </button>

                    {/* Toggle Shortfall Tray */}
                    <button
                      onClick={() => setShowShortfallDetails(!showShortfallDetails)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1"
                      title={showShortfallDetails ? 'Collapse breakdown' : 'Expand breakdown'}
                    >
                      <span>{isBn ? 'ঘাটতি বিবরণ' : 'Shortfall List'}</span>
                      {showShortfallDetails ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Dismiss Button */}
                    <button
                      onClick={() => setAlertDismissed(true)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-colors"
                      title={isBn ? 'ব্যানার লুকান' : 'Minimize banner'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Shortfall Breakdown Tray (Itemized replenishment cards) */}
                {showShortfallDetails && (
                  <div className="mt-4 pt-4 border-t border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        {isBn ? 'সরাসরি রি-স্টক করার ঘাটতি তালিকা:' : 'Immediate Reorder & Shortfall Breakdown:'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {allAlertProducts.length} {isBn ? 'টি আইটেম ঘাটতিতে রয়েছে' : 'products affected'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                      {allAlertProducts.map((p) => {
                        const stock = p.stockQuantity || 0;
                        const thresh = getProductThreshold(p);
                        const isZero = stock === 0;
                        const deficit = Math.max(1, thresh - stock);

                        return (
                          <div
                            key={p.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                              isZero
                                ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-200'
                                : 'bg-amber-50/80 border-amber-300'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {isZero ? (
                                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                                )}
                                <span className="font-extrabold text-xs text-slate-900 truncate">
                                  {isBn ? p.nameBn : p.nameEn}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {p.category} • <span className="font-mono">{p.unit}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
                                <span
                                  className={`font-black ${
                                    isZero ? 'text-rose-700' : 'text-amber-800'
                                  }`}
                                >
                                  {stock} / {thresh} {p.unit}
                                </span>
                                <span className="text-rose-700 font-bold bg-white px-1.5 py-0.2 rounded border border-rose-200 text-[10px]">
                                  Need +{deficit}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenEntryModal(p.id, 'in', deficit)}
                              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 ${
                                isZero
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : 'bg-amber-600 hover:bg-amber-700 text-white'
                              }`}
                              title={isBn ? `এখনই +${deficit} ইউনিট রি-স্টক করুন` : `Restock +${deficit} units now`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isBn ? 'রি-স্টক' : 'Restock'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* All Healthy Quiet Banner */
            <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {isBn
                    ? `সকল প্রোডাক্টের মজুদ নিরাপদ সীমার (>${globalThreshold} ইউনিট) উপরে আছে।`
                    : `All product stock levels safely satisfy minimum threshold (>${globalThreshold} units).`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-700 font-mono">
                  Threshold: {globalThreshold}
                </span>
                <button
                  onClick={() => handleUpdateGlobalThreshold(globalThreshold + 1)}
                  className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                  title="Raise safety threshold"
                >
                  Adjust
                </button>
              </div>
            </div>
          )}

          {/* Search & Category Filter Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isBn ? 'কেক বা প্রোডাক্টের নাম দিয়ে খুঁজুন...' : 'Search by product name or category...'}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-[#4b1d3f] outline-hidden"
              />
            </div>

            {/* Category Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-[#4b1d3f] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isBn ? 'সব প্রোডাক্ট' : 'All Categories'}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#4b1d3f] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick Filter: Alert Items button */}
            {allAlertProducts.length > 0 && (
              <button
                onClick={() => setStockStatusFilter(stockStatusFilter === 'alert' ? 'all' : 'alert')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  stockStatusFilter === 'alert'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{isBn ? `সতর্কতা (${allAlertProducts.length})` : `Alerts (${allAlertProducts.length})`}</span>
              </button>
            )}

            {/* Active Status Filter Pill with Reset */}
            {stockStatusFilter !== 'all' && (
              <button
                onClick={() => setStockStatusFilter('all')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300 transition-colors shrink-0"
              >
                <span>Filter: {stockStatusFilter.toUpperCase()}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Product Inventory Table with Visual Low-Stock Highlighting */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isBn ? 'প্রোডাক্টের নাম' : 'Product Name'}</th>
                    <th className="py-3 px-4">{isBn ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'বিক্রয় দর' : 'Sell Rate'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'ক্রয়/তৈরি খরচ' : 'Cost'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'বর্তমান স্টক' : 'Current Stock'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'সতর্কতা সীমা (Threshold)' : 'Alert Threshold'}</th>
                    <th className="py-3 px-4 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'স্টক অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#4b1d3f]" />
                        <p>{isBn ? 'কোনো প্রোডাক্ট পাওয়া যায়নি।' : 'No matching products found.'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const stock = p.stockQuantity ?? 0;
                      const thresh = getProductThreshold(p);
                      const isOutOfStock = stock === 0;
                      const isLowStock = !isOutOfStock && stock <= thresh;
                      const shortfall = Math.max(0, thresh - stock);

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            isOutOfStock
                              ? 'bg-rose-50/80 border-l-4 border-l-rose-600 hover:bg-rose-100/60'
                              : isLowStock
                              ? 'bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-100/60'
                              : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>

                          {/* Product Name with Shortfall Indicator */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {isOutOfStock ? (
                                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" title="Out of Stock"></span>
                              ) : isLowStock ? (
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Low Stock"></span>
                              ) : null}
                              <span className="font-bold text-slate-900 text-sm">
                                {isBn ? p.nameBn : p.nameEn}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {isBn ? p.nameEn : p.nameBn} • <span className="font-mono">{p.unit}</span>
                            </div>
                            {/* Shortfall Tag */}
                            {shortfall > 0 && (
                              <div className="mt-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                    isOutOfStock
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                >
                                  <TrendingUp className="w-2.5 h-2.5" />
                                  <span>Need +{shortfall} {p.unit} to safety target</span>
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700">
                              {p.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{p.defaultRate} <span className="text-[10px] text-slate-400">/{p.unit}</span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                            ₹{p.costPrice || Math.round(p.defaultRate * 0.6)}
                          </td>

                          {/* Current Stock with Quick +/- Buttons */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleQuickStockStep(p.id, -1)}
                                disabled={stock <= 0}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 flex items-center justify-center font-bold disabled:opacity-30 disabled:hover:bg-slate-100 transition-colors"
                                title={isBn ? '১ টি কমান' : 'Decrease 1'}
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <span
                                className={`font-mono font-extrabold text-sm min-w-[50px] text-center px-1.5 py-0.5 rounded ${
                                  isOutOfStock
                                    ? 'bg-rose-200 text-rose-900'
                                    : isLowStock
                                    ? 'bg-amber-200 text-amber-950'
                                    : 'text-emerald-800'
                                }`}
                              >
                                {stock} {p.unit}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleQuickStockStep(p.id, 1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 flex items-center justify-center font-bold transition-colors"
                                title={isBn ? '১ টি বাড়ান' : 'Increase 1'}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Custom / Global Threshold Editor */}
                          <td className="py-3.5 px-4 text-center">
                            {editingThresholdProdId === p.id ? (
                              <div className="inline-flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-xs">
                                <input
                                  type="number"
                                  min="1"
                                  className="w-12 px-1 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded text-center outline-hidden"
                                  value={tempThresholdValue}
                                  onChange={(e) => setTempThresholdValue(parseInt(e.target.value, 10) || 1)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveProductThreshold(p.id, tempThresholdValue)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                                  title="Save Threshold"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingThresholdProdId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingThresholdProdId(p.id);
                                  setTempThresholdValue(thresh);
                                }}
                                className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-white text-slate-700 transition-colors"
                                title="Click to adjust safety threshold for this item"
                              >
                                <span className="font-mono font-bold text-xs">≤ {thresh} {p.unit}</span>
                                <Edit2 className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-700" />
                                {typeof p.minStockAlert === 'number' && (
                                  <span className="text-[9px] bg-slate-200 text-slate-700 font-semibold px-1 rounded">
                                    custom
                                  </span>
                                )}
                              </button>
                            )}
                          </td>

                          {/* Status Badge with Distinct Alert Highlighting */}
                          <td className="py-3.5 px-4 text-center">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{isBn ? 'স্টক শেষ (০)' : 'OUT OF STOCK'}</span>
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-2xs">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{isBn ? `কম স্টক (≤${thresh})` : `LOW STOCK (≤${thresh})`}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isBn ? 'পর্যাপ্ত' : 'In Stock'}</span>
                              </span>
                            )}
                          </td>

                          {/* Quick Restock Action Button */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenEntryModal(p.id, 'in', shortfall > 0 ? shortfall : undefined)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1 ${
                                isOutOfStock
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : isLowStock
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>
                                {isOutOfStock
                                  ? isBn
                                    ? 'জরুরি রি-স্টক'
                                    : 'Urgent Restock'
                                  : isLowStock
                                  ? isBn
                                    ? `রি-স্টক (+${shortfall})`
                                    : `Restock (+${shortfall})`
                                  : isBn
                                  ? 'স্টক যোগ'
                                  : 'Restock'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Stock History / Transaction Log */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-[#4b1d3f]" />
                <span>{isBn ? 'স্টক এন্ট্রি ও ব্যবহারের হিস্ট্রি লগ' : 'Stock Entry & Audit Log'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBn
                  ? 'প্রতিটি নতুন স্টক ইন, বিক্রি এবং ড্যামেজ বা পরিবর্তনের স্বয়ংক্রিয় হিসাব'
                  : 'Automated history of all restocks, sales deductions, and adjustments'}
              </p>
            </div>
            <button
              onClick={() => setStockEntries(getStockEntries())}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh Log"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">{isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                  <th className="py-3 px-4">{isBn ? 'প্রোডাক্ট' : 'Product'}</th>
                  <th className="py-3 px-4 text-center">{isBn ? 'ধরন' : 'Type'}</th>
                  <th className="py-3 px-4 text-center">{isBn ? 'পরিমাণ' : 'Qty'}</th>
                  <th className="py-3 px-4">{isBn ? 'কারণ / নোট' : 'Reason / Note'}</th>
                  <th className="py-3 px-4 text-right">{isBn ? 'পরিবর্তিত স্টক' : 'Stock After'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {stockEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p>{isBn ? 'এখনও কোনো স্টক এন্ট্রি হিস্ট্রি নেই।' : 'No stock entry history recorded yet.'}</p>
                    </td>
                  </tr>
                ) : (
                  stockEntries.slice(0, 50).map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">{entry.productName}</td>

                      <td className="py-3 px-4 text-center">
                        {entry.type === 'in' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <ArrowUpRight className="w-3 h-3 text-emerald-700" />
                            <span>Stock In</span>
                          </span>
                        ) : entry.type === 'out' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <ArrowDownRight className="w-3 h-3 text-rose-700" />
                            <span>Stock Out</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            <span>Adjust</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-extrabold text-slate-900">
                        {entry.type === 'in' ? '+' : entry.type === 'out' ? '-' : ''}
                        {entry.quantity} {entry.unit}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span>{entry.reason}</span>
                        {entry.supplierOrBaker && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            By: {entry.supplierOrBaker}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {typeof entry.stockAfter === 'number' ? `${entry.stockAfter} ${entry.unit}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Entry Modal (স্টক এন্ট্রি ফর্ম) */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#4b1d3f] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 font-bold">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isBn ? 'নতুন স্টক এন্ট্রি (Stock Entry)' : 'New Stock Entry'}
                  </h3>
                  <p className="text-[11px] text-amber-100/70">
                    {isBn ? 'বেকারির তাজা কেক বা সামগ্রী স্টকে যোগ করুন' : 'Add freshly baked items or adjust inventory'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEntryModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStockEntry} className="p-5 space-y-4">
              {/* Product Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'প্রোডাক্ট নির্বাচন করুন *' : 'Select Product *'}
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProductId(id);
                    const p = products.find((prod) => prod.id === id);
                    if (p) {
                      setCostPrice(p.costPrice || Math.round(p.defaultRate * 0.6));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4b1d3f] outline-hidden"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} ({p.nameBn}) - Stock: {p.stockQuantity ?? 0} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entry Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'এন্ট্রির ধরন (Entry Type) *' : 'Entry Type *'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('in');
                      setReason(isBn ? 'সকালের ফ্রেশ কেক তৈরি' : 'Morning Fresh Bake');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      entryType === 'in'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{isBn ? 'স্টক ইন (যোগ)' : 'Stock In (+)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('out');
                      setReason(isBn ? 'নষ্ট / ড্যামেজ' : 'Damaged / Wastage');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      entryType === 'out'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>{isBn ? 'স্টক আউট (নষ্ট)' : 'Stock Out (-)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('adjustment');
                      setReason(isBn ? 'স্টক সংশোধন' : 'Audit Correction');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      entryType === 'adjustment'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isBn ? 'সংশোধন' : 'Adjustment'}</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input with Quick Multipliers */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {entryType === 'adjustment'
                      ? isBn
                        ? 'নতুন সঠিক পরিমাণ (Set Exact Quantity)'
                        : 'Exact New Quantity'
                      : isBn
                      ? 'পরিমাণ (Quantity) *'
                      : 'Quantity *'}
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Unit: {selectedProduct?.unit || 'lb'}
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4b1d3f] outline-hidden"
                  required
                />
                {/* Quick Add Pills */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-medium">Quick Pick:</span>
                  {[5, 10, 20, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantity(n)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono font-semibold text-slate-700 transition-colors"
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Price per Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBn ? 'ক্রয় / তৈরি খরচ (₹)' : 'Making / Cost (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4b1d3f] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBn ? 'কারিগর / প্রস্তুতকারক' : 'Baker / Supplier'}
                  </label>
                  <input
                    type="text"
                    value={supplierOrBaker}
                    onChange={(e) => setSupplierOrBaker(e.target.value)}
                    placeholder="e.g. Head Baker"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4b1d3f] outline-hidden"
                  />
                </div>
              </div>

              {/* Reason / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'কারণ বা বিবরণ (Reason / Note)' : 'Reason / Note'}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isBn
                      ? 'যেমন: সকালের ফ্রেশ লট / পাইকারি খরিদ / ড্যামেজ'
                      : 'e.g. Morning fresh batch / wholesale restock'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4b1d3f] outline-hidden"
                />
              </div>

              {/* Current vs New preview */}
              {selectedProduct && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Stock</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedProduct.stockQuantity ?? 0} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Stock After Entry</span>
                    <span className="font-mono font-extrabold text-emerald-700">
                      {entryType === 'in'
                        ? (selectedProduct.stockQuantity ?? 0) + quantity
                        : entryType === 'out'
                        ? Math.max(0, (selectedProduct.stockQuantity ?? 0) - quantity)
                        : quantity}{' '}
                      {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isBn ? 'স্টক সেভ করুন' : 'Save Stock Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
