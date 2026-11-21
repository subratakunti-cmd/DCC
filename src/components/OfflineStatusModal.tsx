import React from 'react';
import {
  X,
  Wifi,
  WifiOff,
  CheckCircle2,
  Cloud,
  Printer,
  QrCode,
  Database,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';
import { Language, ShopConfig } from '../types';
import { getBills, getProducts } from '../utils/storage';

interface OfflineStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  lang: Language;
  config: ShopConfig;
}

export const OfflineStatusModal: React.FC<OfflineStatusModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  lang,
  config
}) => {
  if (!isOpen) return null;

  const localBills = getBills();
  const localProducts = getProducts();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 border border-slate-200 flex flex-col text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                isOnline
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                  : 'bg-gradient-to-tr from-amber-600 to-orange-500'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>
                  {lang === 'bn' ? 'অফলাইন ও অনলাইন ডুয়াল ইঞ্জিন' : 'Offline & Online Dual Engine'}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isOnline
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                  }`}
                >
                  {isOnline ? (lang === 'bn' ? 'অনলাইন' : 'Online') : (lang === 'bn' ? 'অফলাইন মোড' : 'Offline Mode')}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'bn'
                  ? 'ইন্টারনেট থাকুক বা না থাকুক—দোকানের বিলিং কখনো থামবে না'
                  : 'Continuous POS operations with zero downtime, online or offline'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div
          className={`my-4 p-4 rounded-xl border flex items-start gap-3 ${
            isOnline
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="mt-0.5">
            {isOnline ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Zap className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold text-sm">
              {isOnline
                ? lang === 'bn'
                  ? 'আপনার ডিভাইস ইন্টারনেটের সাথে যুক্ত আছে (Connected)'
                  : 'Internet Connected — Live Cloud Sync Ready'
                : lang === 'bn'
                ? 'বর্তমানে অফলাইন মোড সক্রিয় রয়েছে (Offline Mode Active)'
                : 'Offline Mode Active — 100% Local POS Operating'}
            </h4>
            <p className="leading-relaxed opacity-90">
              {isOnline
                ? lang === 'bn'
                  ? 'বিল এবং কাস্টমার ডেটা লোকাল স্টোরেজে সেভ হওয়ার পাশাপাশি গুগল ক্লাউড ও গুগল শিটে ব্যাকআপ নেওয়া হচ্ছে।'
                  : 'All data is saved locally on this device and synced with cloud backups.'
                : lang === 'bn'
                ? 'ইন্টারনেট বন্ধ থাকলেও কোনো সমস্যা নেই! সব বিল, কাস্টমার হিসাব, থার্মাল প্রিন্ট এবং UPI QR কোড ১০০% স্বাভাবিকভাবে কাজ করছে। ইন্টারনেট এলে স্বয়ংক্রিয়ভাবে ক্লাউডে ব্যাকআপ হয়ে যাবে।'
                : 'No internet required. Billing, local storage, thermal printing, and UPI QR codes work without disruption.'}
            </p>
          </div>
        </div>

        {/* Feature Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
          {/* OFFLINE Features */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>{lang === 'bn' ? '⚡ অফলাইনে কী কী চলবে:' : '⚡ Works 100% Offline:'}</span>
            </div>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lang === 'bn' ? 'ইনস্ট্যান্ট বিলিং ও ক্যাশ/বাকি হিসাব' : 'Instant billing & dues'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lang === 'bn' ? 'থার্মাল প্রিন্ট (Bluetooth/USB/Spooler)' : 'Thermal printing (ESC/POS)'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lang === 'bn' ? 'UPI QR কোড (GPay/PhonePe স্ক্যান)' : 'Dynamic UPI QR Code generation'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lang === 'bn' ? 'স্টক ট্র্যাকার ও পণ্য ক্যাটালগ' : 'Catalog & live stock deduction'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lang === 'bn' ? 'ডিভাইসের মেমরিতে সুরক্ষিত ডেটা' : 'Safe on-device LocalStorage'}</span>
              </li>
            </ul>
          </div>

          {/* ONLINE Features */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>{lang === 'bn' ? '☁️ অনলাইন থাকলে অতিরিক্ত সুবিধা:' : '☁️ Extra Online Features:'}</span>
            </div>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{lang === 'bn' ? 'গুগল শিট (Google Sheets) অটো ব্যাকআপ' : 'Auto Google Sheets sync'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{lang === 'bn' ? 'গুগল ক্লাউড ফায়ারস্টোর লাইভ সিঙ্ক' : 'Firestore cloud database'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{lang === 'bn' ? 'গ্রাহককে এসএমএস ও হোয়াটসঅ্যাপ শেয়ার' : 'SMS receipts & WhatsApp share'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{lang === 'bn' ? 'গুগল ম্যাপস লাইভ রোড ডেলিভারি রুট' : 'Google Maps delivery distance'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{lang === 'bn' ? 'ফেসবুক অটোমেটিক অ্যাড ও পোস্টার' : 'Facebook ads & poster publishing'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Local Storage Stats */}
        <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-700 mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#4b1d3f]" />
            <span>
              {lang === 'bn' ? 'লোকাল স্টোরেজে সংরক্ষিত:' : 'Stored on this Device:'}
            </span>
          </div>
          <div className="flex items-center gap-3 font-bold text-slate-900">
            <span>{localBills.length} {lang === 'bn' ? 'টি বিল' : 'Bills'}</span>
            <span>•</span>
            <span>{localProducts.length} {lang === 'bn' ? 'টি পণ্য' : 'Products'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Zero Data Loss Guarantee</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
          >
            {lang === 'bn' ? 'বুঝেছি / বন্ধ করুন' : 'Got it / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
