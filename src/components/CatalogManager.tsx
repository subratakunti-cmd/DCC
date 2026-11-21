import React, { useState } from 'react';
import { BakeryProduct, Language } from '../types';
import { getT } from '../translations';
import { DEFAULT_PRODUCTS } from '../data/defaultProducts';
import { saveProducts } from '../utils/storage';
import { saveProductsToFirestore } from '../services/firestoreService';
import { Plus, Trash2, Edit3, Sparkles, Check, RotateCcw, X, CheckCircle2 } from 'lucide-react';

interface CatalogManagerProps {
  products: BakeryProduct[];
  setProducts: (products: BakeryProduct[]) => void;
  lang: Language;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({
  products,
  setProducts,
  lang
}) => {
  const t = getT(lang);

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // New product form
  const [nameEn, setNameEn] = useState<string>('');
  const [nameBn, setNameBn] = useState<string>('');
  const [category, setCategory] = useState<BakeryProduct['category']>('Cakes');
  const [defaultRate, setDefaultRate] = useState<number>(400);
  const [unit, setUnit] = useState<'lb' | 'pc' | 'box'>('lb');
  const [popular, setPopular] = useState<boolean>(false);

  const categories = ['All', 'Cakes', 'Premium Cakes', 'Designer Cakes', 'Pastries & Desserts', 'Celebration Accessories'];

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter((p) => p.category === activeCategory);

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      alert('Product name is required.');
      return;
    }

    if (editingId) {
      const updated = products.map((p) => {
        if (p.id === editingId) {
          return {
            ...p,
            nameEn: nameEn.trim(),
            nameBn: nameBn.trim() || nameEn.trim(),
            category,
            defaultRate: Number(defaultRate) || 0,
            unit,
            popular
          };
        }
        return p;
      });
      setProducts(updated);
      saveProducts(updated);
      setEditingId(null);
      setToast(lang === 'bn' ? 'প্রোডাক্ট সফলভাবে আপডেট হয়েছে!' : 'Product updated successfully!');
      setTimeout(() => setToast(null), 3000);
    } else {
      const newProd: BakeryProduct = {
        id: `prod-${Date.now()}`,
        nameEn: nameEn.trim(),
        nameBn: nameBn.trim() || nameEn.trim(),
        category,
        defaultRate: Number(defaultRate) || 0,
        unit,
        popular
      };
      const updated = [newProd, ...products];
      setProducts(updated);
      saveProducts(updated);
      setToast(lang === 'bn' ? 'নতুন প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!' : 'New product added successfully!');
      setTimeout(() => setToast(null), 3000);
    }

    // Reset
    setNameEn('');
    setNameBn('');
    setDefaultRate(400);
    setPopular(false);
    setIsAdding(false);
  };

  const handleEditClick = (p: BakeryProduct) => {
    setEditingId(p.id);
    setNameEn(p.nameEn);
    setNameBn(p.nameBn);
    setCategory(p.category);
    setDefaultRate(p.defaultRate);
    setUnit(p.unit);
    setPopular(!!p.popular);
    setIsAdding(true);
  };

  const [productPendingDelete, setProductPendingDelete] = useState<BakeryProduct | null>(null);

  const handleDelete = (id: string) => {
    const found = products.find((p) => p.id === id);
    if (found) {
      setProductPendingDelete(found);
    }
  };

  const handleConfirmDeleteProduct = () => {
    if (!productPendingDelete) return;
    const updated = products.filter((p) => p.id !== productPendingDelete.id);
    setProducts(updated);
    saveProducts(updated);
    saveProductsToFirestore(updated).catch((err) => console.warn('Firestore sync product notice:', err));
    setToast(
      lang === 'bn'
        ? `আইটেম '${productPendingDelete.nameBn || productPendingDelete.nameEn}' ক্যাটালগ থেকে মুছে ফেলা হয়েছে!`
        : `Product '${productPendingDelete.nameEn}' removed from catalog!`
    );
    setProductPendingDelete(null);
  };

  const handleResetDefaults = () => {
    setProducts(DEFAULT_PRODUCTS);
    saveProducts(DEFAULT_PRODUCTS);
    setToast(
      lang === 'bn'
        ? 'সকল ক্যাটালগ প্রোডাক্ট ডিফল্ট অবস্থায় রিস্টোর করা হয়েছে!'
        : 'All catalog items reset to factory defaults!'
    );
  };

  const handleTogglePopular = (id: string) => {
    const updated = products.map((p) => (p.id === id ? { ...p, popular: !p.popular } : p));
    setProducts(updated);
    saveProducts(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{t.catalogTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.catalogSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingId(null);
              setNameEn('');
              setNameBn('');
              setDefaultRate(400);
              setPopular(false);
              setIsAdding(!isAdding);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Cancel' : t.addNewProduct}</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
            title="Reset to default bakery items"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-100 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Add / Edit Form Modal Dialog */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveNew}
            className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xl max-w-lg w-full space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150"
          >
            <div className="font-extrabold text-base text-[#4b1d3f] pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <span>
                  {editingId
                    ? (lang === 'bn' ? 'প্রোডাক্ট এডিট করুন (Edit Product)' : 'Edit Product')
                    : (lang === 'bn' ? 'নতুন প্রোডাক্ট যোগ করুন' : 'Add New Cake / Product')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Belgian Dark Chocolate Cake"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Name (বাংলা / Bengali)
                </label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="যেমন: বেলজিয়ান ডার্ক চকলেট কেক"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] bg-white"
              >
                <option value="Cakes">Cakes</option>
                <option value="Premium Cakes">Premium Cakes</option>
                <option value="Designer Cakes">Designer Cakes</option>
                <option value="Pastries & Desserts">Pastries & Desserts</option>
                <option value="Celebration Accessories">Celebration Accessories</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Base Rate (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Rate Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] bg-white font-medium"
                >
                  <option value="lb">Per Pound (lb)</option>
                  <option value="pc">Per Piece (pc)</option>
                  <option value="box">Per Box (box)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 pb-1">
              <input
                type="checkbox"
                id="popCheck"
                checked={popular}
                onChange={(e) => setPopular(e.target.checked)}
                className="w-4 h-4 text-[#4b1d3f] rounded focus:ring-0"
              />
              <label htmlFor="popCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                Show in Quick-Pick Bar (জনপ্রিয় তালিকায় রাখুন)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                {editingId
                  ? (lang === 'bn' ? 'পরিবর্তন সেভ করুন (Update)' : 'Update Product')
                  : (lang === 'bn' ? 'ক্যাটালগে যুক্ত করুন' : 'Add to Catalog')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter Pills (Functional Buttons) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-[#4b1d3f] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item Name (EN / বাংলা)</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Base Rate (₹)</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-center">Quick Pick</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.nameEn}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs">
                          {prod.nameEn.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-900 block">{prod.nameEn}</span>
                        <span className="text-[11px] text-slate-500">{prod.nameBn}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                      {prod.category}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                    ₹{prod.defaultRate.toFixed(0)}
                  </td>

                  <td className="py-3 px-4 text-center font-mono text-slate-600">
                    /{prod.unit}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleTogglePopular(prod.id)}
                      className={`p-1 rounded-md transition-colors ${
                        prod.popular ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500'
                      }`}
                      title={prod.popular ? 'Active in quick pick' : 'Add to quick pick'}
                    >
                      <Sparkles className="w-4 h-4 fill-current" />
                    </button>
                  </td>

                  <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleEditClick(prod)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-[#4b1d3f] hover:bg-slate-100 transition-colors"
                      title="Edit Item"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(prod.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Product Delete Confirmation Modal */}
      {productPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-rose-200 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">
                    {lang === 'bn' ? 'প্রোডাক্ট মুছে ফেলা' : 'Delete Catalog Item'}
                  </h3>
                  <span className="text-xs text-rose-100">
                    {productPendingDelete.nameEn}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProductPendingDelete(null)}
                className="p-1 text-white/80 hover:text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {lang === 'bn'
                  ? `আপনি কি নিশ্চিত যে '${productPendingDelete.nameBn || productPendingDelete.nameEn}' ক্যাটালগ থেকে মুছে ফেলতে চান?`
                  : `Are you sure you want to remove '${productPendingDelete.nameEn}' from the catalog?`}
              </p>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setProductPendingDelete(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProduct}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
