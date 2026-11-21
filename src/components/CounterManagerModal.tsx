import React, { useState, useEffect } from 'react';
import { Counter, Language, ShopConfig } from '../types';
import { saveShopConfig } from '../utils/storage';
import {
  X,
  Plus,
  Store,
  Check,
  CheckCircle2,
  Edit2,
  Trash2,
  User,
  Hash,
  Sparkles
} from 'lucide-react';

interface CounterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  onConfigUpdate: (newConfig: ShopConfig) => void;
  lang: Language;
  initialIsAdding?: boolean;
}

export const CounterManagerModal: React.FC<CounterManagerModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdate,
  lang,
  initialIsAdding = false
}) => {
  const counters: Counter[] = config.counters || [];
  const activeCounterId = config.activeCounterId || counters[0]?.id || 'counter-1';

  const [isAdding, setIsAdding] = useState<boolean>(initialIsAdding);
  const [editingCounterId, setEditingCounterId] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>(() => `Counter ${counters.length + 1}`);
  const [nameBn, setNameBn] = useState<string>(() => `কাউন্টার ${counters.length + 1}`);
  const [code, setCode] = useState<string>(() => `C${counters.length + 1}`);
  const [cashierName, setCashierName] = useState<string>('');

  // Reset initial adding state when opening
  useEffect(() => {
    if (isOpen) {
      if (initialIsAdding) {
        const nextNum = counters.length + 1;
        setName(`Counter ${nextNum}`);
        setNameBn(`কাউন্টার ${nextNum}`);
        setCode(`C${nextNum}`);
        setCashierName(config.signatoryName || '');
        setIsAdding(true);
      }
    }
  }, [isOpen, initialIsAdding, counters.length, config.signatoryName]);

  if (!isOpen) return null;

  const handleSelectActiveCounter = (counterId: string) => {
    const updated: ShopConfig = {
      ...config,
      activeCounterId: counterId
    };
    saveShopConfig(updated);
    onConfigUpdate(updated);
  };

  const handleStartAdd = () => {
    const nextNum = counters.length + 1;
    setName(`Counter ${nextNum}`);
    setNameBn(`কাউন্টার ${nextNum}`);
    setCode(`C${nextNum}`);
    setCashierName(config.signatoryName || '');
    setEditingCounterId(null);
    setIsAdding(true);
  };

  const handleStartEdit = (counter: Counter) => {
    setName(counter.name);
    setNameBn(counter.nameBn || '');
    setCode(counter.code);
    setCashierName(counter.cashierName || '');
    setEditingCounterId(counter.id);
    setIsAdding(true);
  };

  const handleSaveCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('কাউন্টারের নাম আবশ্যক।');
      return;
    }

    let updatedCounters: Counter[];

    if (editingCounterId) {
      updatedCounters = counters.map((c) =>
        c.id === editingCounterId
          ? {
              ...c,
              name: name.trim(),
              nameBn: nameBn.trim() || undefined,
              code: (code.trim() || `C${c.id}`).toUpperCase(),
              cashierName: cashierName.trim() || undefined
            }
          : c
      );
    } else {
      const newCounter: Counter = {
        id: `counter-${Date.now()}`,
        name: name.trim(),
        nameBn: nameBn.trim() || undefined,
        code: (code.trim() || `C${counters.length + 1}`).toUpperCase(),
        cashierName: cashierName.trim() || undefined,
        isDefault: counters.length === 0
      };
      updatedCounters = [...counters, newCounter];
    }

    const newCounterId = editingCounterId || updatedCounters[updatedCounters.length - 1].id;
    const updatedConfig: ShopConfig = {
      ...config,
      counters: updatedCounters,
      activeCounterId: newCounterId
    };

    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);

    setSavedToast(editingCounterId ? 'কাউন্টার আপডেট হয়েছে!' : 'নতুন কাউন্টার সফলভাবে তৈরি ও সক্রিয় হয়েছে!');
    setTimeout(() => {
      setSavedToast(null);
      setIsAdding(false);
      setEditingCounterId(null);
      onClose();
    }, 600);
  };

  const handleDeleteCounter = (id: string) => {
    if (counters.length <= 1) {
      setSavedToast(lang === 'bn' ? 'কমপক্ষে একটি কাউন্টার থাকা আবশ্যক!' : 'At least one counter must remain!');
      setTimeout(() => setSavedToast(null), 3000);
      return;
    }
    const filtered = counters.filter((c) => c.id !== id);
    const newActiveId = activeCounterId === id ? filtered[0]?.id : activeCounterId;
    const updatedConfig: ShopConfig = {
      ...config,
      counters: filtered,
      activeCounterId: newActiveId
    };
    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    setSavedToast(lang === 'bn' ? 'কাউন্টার সফলভাবে মুছে ফেলা হয়েছে!' : 'Counter deleted successfully!');
    setTimeout(() => setSavedToast(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 border border-slate-200 flex flex-col text-slate-800">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {lang === 'bn' ? 'কাউন্টার ম্যানেজমেন্ট' : 'Counter Management'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'নতুন কাউন্টার যোগ করুন ও নির্বাচন করুন' : 'Add, edit and switch billing counters'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Success Banner */}
        {savedToast && (
          <div className="my-2 p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{savedToast}</span>
          </div>
        )}

        {/* Counter List */}
        {!isAdding ? (
          <div className="space-y-4 my-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                {lang === 'bn' ? 'বর্তমান কাউন্টার তালিকা:' : 'Active Counters List:'}
              </span>
              <button
                type="button"
                onClick={handleStartAdd}
                className="py-1.5 px-3 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? '+ নতুন কাউন্টার যোগ করুন' : '+ Add New Counter'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {counters.map((c) => {
                const isActive = c.id === activeCounterId;
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleSelectActiveCounter(c.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#4b1d3f] text-white text-[10px] font-mono font-bold">
                          {c.code}
                        </span>
                        <span className="font-extrabold text-xs text-slate-900">
                          {lang === 'bn' ? (c.nameBn || c.name) : c.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Active / নির্বাচিত</span>
                          </span>
                        )}
                      </div>
                      {c.cashierName && (
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>ক্যাশিয়ার: {c.cashierName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleSelectActiveCounter(c.id)}
                          className="px-2 py-1 text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-100 rounded border border-slate-200"
                        >
                          Select
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded"
                        title="Edit Counter"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {counters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCounter(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Counter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Add / Edit Form */
          <form onSubmit={handleSaveCounter} className="space-y-3.5 my-4 text-left">
            <div className="font-bold text-xs text-[#4b1d3f] pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>{editingCounterId ? 'কাউন্টার এডিট করুন' : 'নতুন কাউন্টার যোগ করুন (Add Counter)'}</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Back to list
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Counter Name (English) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Counter 4 (Bakery & Snacks)"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                কাউন্টারের নাম (বাংলা)
              </label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমন: কাউন্টার ৪ (কেক ও মিষ্টি)"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Counter Code (কোড) *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. C1, C2, C4"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg uppercase font-mono font-bold focus:outline-none focus:border-[#4b1d3f]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cashier / Operator Name
                </label>
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="e.g. Subrata Kunti"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                {editingCounterId ? 'Update Counter' : 'Save Counter (সেভ করুন)'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            DELICIOUS CAKE CORNER • Multi-Counter POS
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs"
          >
            Done / সম্পন্ন
          </button>
        </div>
      </div>
    </div>
  );
};
