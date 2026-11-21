import React, { useState, useEffect } from 'react';
import { Language, ShopConfig } from '../types';
import {
  CloudBackupSourceMode,
  CloudBackupSafeguardPackage,
  fetchAndCompileCloudBackup,
  downloadCloudBackupJson,
  validateAndInspectBackup,
  restoreFromSafeguardPackage,
  BackupValidationResult
} from '../services/cloudBackupService';
import {
  Cloud,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Layers,
  Copy,
  Check,
  FileJson,
  Calendar,
  ShieldCheck,
  RefreshCw,
  X,
  Info
} from 'lucide-react';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  lang: Language;
  onRestoreSuccess?: () => void;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  config,
  lang,
  onRestoreSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'restore'>('download');
  const [sourceMode, setSourceMode] = useState<CloudBackupSourceMode>('unified');
  
  // Scope toggles
  const [includeBills, setIncludeBills] = useState(true);
  const [includeProducts, setIncludeProducts] = useState(true);
  const [includeCustomers, setIncludeCustomers] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [includeStock, setIncludeStock] = useState(true);

  // Status & compiled data
  const [loading, setLoading] = useState(false);
  const [compiledPackage, setCompiledPackage] = useState<CloudBackupSafeguardPackage | null>(null);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<{ filename: string; sizeKb: number } | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Restore state
  const [, setRestoreFile] = useState<File | null>(null);
  const [restoreValidation, setRestoreValidation] = useState<BackupValidationResult | null>(null);
  const [syncRestoredToCloud, setSyncRestoredToCloud] = useState(true);
  const [restoreStatus, setRestoreStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Load preview data when modal opens or settings change
  const refreshPreview = async () => {
    setLoading(true);
    try {
      const { pkg, cloudConnected: isConnected } = await fetchAndCompileCloudBackup(sourceMode, {
        includeBills,
        includeProducts,
        includeCustomers,
        includeSettings,
        includeStock
      });
      setCompiledPackage(pkg);
      setCloudConnected(isConnected);
    } catch (err) {
      console.error('Failed to compile cloud backup preview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDownloadSuccessToast(null);
      setCopiedToClipboard(false);
      setRestoreStatus(null);
      refreshPreview();
    }
  }, [isOpen, sourceMode, includeBills, includeProducts, includeCustomers, includeSettings, includeStock]);

  if (!isOpen) return null;

  // Handle Download Action
  const handleDownloadBackup = () => {
    if (!compiledPackage) return;
    const result = downloadCloudBackupJson(compiledPackage);
    setDownloadSuccessToast(result);
  };

  // Handle Copy to Clipboard
  const handleCopyToClipboard = () => {
    if (!compiledPackage) return;
    navigator.clipboard.writeText(JSON.stringify(compiledPackage, null, 2));
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 3000);
  };

  // Handle File Selection for Restore
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const val = validateAndInspectBackup(content);
        setRestoreValidation(val);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!restoreValidation?.pkg) return;
    const confirmMsg = lang === 'bn'
      ? `আপনি কি নিশ্চিত যে এই ব্যাকআপ (${restoreValidation.summary?.totalBills} বিল) রিস্টোর করতে চান? আপনার বর্তমান ডাটাবেস আপডেট হবে।`
      : `Are you sure you want to restore this backup (${restoreValidation.summary?.totalBills} bills)? Current billing database will be updated.`;
    
    if (!window.confirm(confirmMsg)) return;

    setIsRestoring(true);
    try {
      const res = await restoreFromSafeguardPackage(restoreValidation.pkg, syncRestoredToCloud);
      setRestoreStatus({
        success: res.success,
        message: res.message
      });
      if (res.success && onRestoreSuccess) {
        onRestoreSuccess();
        setTimeout(() => refreshPreview(), 1000);
      }
    } catch (err: any) {
      setRestoreStatus({
        success: false,
        message: err?.message || 'Restore execution failed'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const isBn = lang === 'bn';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-[#4b1d3f] text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-slate-950" />
                {isBn ? 'ক্লাউড সেফগার্ড' : 'Cloud Safeguard'}
              </span>
              <span className="text-[11px] text-pink-200 font-mono">
                v2.5 • JSON Backup
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Cloud className="w-6 h-6 text-amber-300" />
              <span>{isBn ? 'ম্যানুয়াল ক্লাউড ব্যাকআপ ও সেফগার্ড' : 'Manual Cloud Backup & Safeguard'}</span>
            </h2>
            <p className="text-xs text-pink-100/90 mt-1 max-w-xl">
              {isBn
                ? 'ফায়ারস্টোর ক্লাউড এবং লোকাল ক্যাশ থেকে সম্পূর্ণ বিলিং ও স্টোর ডাটা ডাউনলোড করে অফলাইনে সুরক্ষিত রাখুন।'
                : 'Download a verifiable JSON snapshot of your current billing data from Firestore and local storage as a safeguard.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors relative z-10 shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Cloud Status Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cloudConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cloudConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-semibold text-slate-700">
              {cloudConnected
                ? (isBn ? 'লাইভ ফায়ারস্টোর ক্লাউড সংযুক্ত' : 'Live Firestore Cloud Connected')
                : (isBn ? 'অফলাইন লোকাল ক্যাশ সক্রিয়' : 'Offline Local Storage Cache Active')}
            </span>
            {compiledPackage && (
              <span className="text-[11px] text-slate-500 font-mono">
                (Cloud: {compiledPackage.metadata.firestoreBillsCount} | Local: {compiledPackage.metadata.localBillsCount} invoices)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono">
              Terminal: <strong className="text-slate-800">{config.shopName}</strong>
            </span>
            <button
              onClick={refreshPreview}
              disabled={loading}
              className="flex items-center gap-1 text-[11px] font-bold text-[#4b1d3f] hover:underline"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-white">
          <button
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'download'
                ? 'border-[#4b1d3f] text-[#4b1d3f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>{isBn ? '১. সেফগার্ড JSON ডাউনলোড' : '1. Download Safeguard (JSON)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'restore'
                ? 'border-[#4b1d3f] text-[#4b1d3f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 text-purple-600" />
            <span>{isBn ? '২. ব্যাকআপ যাচাই ও রিস্টোর' : '2. Verify & Restore Backup'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-5">
          {activeTab === 'download' ? (
            <>
              {/* Download Success Banner */}
              {downloadSuccessToast && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">
                        {isBn ? 'ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!' : 'Safeguard JSON downloaded successfully!'}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-mono">
                        {downloadSuccessToast.filename} ({downloadSuccessToast.sizeKb} KB)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDownloadSuccessToast(null)}
                    className="text-emerald-700 hover:text-emerald-900 font-bold text-sm px-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Source Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {isBn ? 'ডাটা সংগ্রহের উৎস নির্বাচন করুন:' : 'Select Data Source:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSourceMode('unified')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      sourceMode === 'unified'
                        ? 'border-[#4b1d3f] bg-purple-50/60 ring-2 ring-[#4b1d3f]/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#4b1d3f]" />
                        <span>Unified Safeguard</span>
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {isBn
                        ? 'ফায়ারস্টোর ও লোকাল ক্যাশ মিলিয়ে সম্পূর্ণ ব্যাকআপ (কোনো বিল বাদ পড়বে না)'
                        : 'Reconciles live Firestore cloud documents with local terminal cache'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceMode('firestore')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      sourceMode === 'firestore'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-blue-600" />
                        <span>Live Firestore</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {isBn
                        ? 'শুধুমাত্র ফায়ারস্টোর ক্লাউড ডাটাবেস থেকে সরাসরি সংগ্রহ'
                        : 'Pure cloud extract directly from Firestore collections'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceMode('local')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      sourceMode === 'local'
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-amber-600" />
                        <span>Local Terminal</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {isBn
                        ? 'এই মেশিনের ব্রাউজারে সংরক্ষিত অফলাইন ক্যাশ ডাটা'
                        : 'Extract stored only on this browser/terminal storage'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Data Scope Inclusion Options */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90">
                <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  {isBn ? 'ব্যাকআপে যা অন্তর্ভুক্ত থাকবে:' : 'Data Scope Included in Safeguard:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeBills}
                      onChange={(e) => setIncludeBills(e.target.checked)}
                      className="rounded border-slate-300 text-[#4b1d3f] focus:ring-[#4b1d3f]"
                    />
                    <span>{isBn ? 'বিল ও সেলস হিস্ট্রি' : 'Billing & Sales Ledger'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeProducts}
                      onChange={(e) => setIncludeProducts(e.target.checked)}
                      className="rounded border-slate-300 text-[#4b1d3f] focus:ring-[#4b1d3f]"
                    />
                    <span>{isBn ? 'কেক ও প্রোডাক্ট ক্যাটালগ' : 'Bakery Products Catalog'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeCustomers}
                      onChange={(e) => setIncludeCustomers(e.target.checked)}
                      className="rounded border-slate-300 text-[#4b1d3f] focus:ring-[#4b1d3f]"
                    />
                    <span>{isBn ? 'কাস্টমার CRM ও লয়ালটি' : 'Customer CRM & Loyalty'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeSettings}
                      onChange={(e) => setIncludeSettings(e.target.checked)}
                      className="rounded border-slate-300 text-[#4b1d3f] focus:ring-[#4b1d3f]"
                    />
                    <span>{isBn ? 'দোকান ও প্রিন্টার সেটিংস' : 'Shop & Hardware Config'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeStock}
                      onChange={(e) => setIncludeStock(e.target.checked)}
                      className="rounded border-slate-300 text-[#4b1d3f] focus:ring-[#4b1d3f]"
                    />
                    <span>{isBn ? 'স্টক ও ইনভেন্টরি খাতা' : 'Stock & Inventory Ledger'}</span>
                  </label>
                </div>
              </div>

              {/* Safeguard Metrics Summary Card */}
              {compiledPackage && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-blue-600" />
                      <span className="font-extrabold text-xs text-slate-800">
                        {isBn ? 'ব্যাকআপ ডাটা স্ন্যাপশট সারাংশ' : 'Safeguard Snapshot Summary'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Checksum: <strong className="text-slate-700">{compiledPackage.metadata.checksum}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        {isBn ? 'মোট ইনভয়েস' : 'Total Invoices'}
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                        {compiledPackage.summary.totalBills}
                      </span>
                    </div>

                    <div className="p-2.5 bg-emerald-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                        {isBn ? 'মোট বিক্রয়' : 'Gross Sales'}
                      </span>
                      <span className="text-base font-black text-emerald-900 font-mono mt-0.5 block">
                        ₹{compiledPackage.summary.grossRevenue.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">
                        {isBn ? 'মোট বাকি' : 'Outstanding Due'}
                      </span>
                      <span className="text-base font-black text-amber-900 font-mono mt-0.5 block">
                        ₹{compiledPackage.summary.totalDue.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-blue-50 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">
                        {isBn ? 'ক্যাটালগ ও CRM' : 'Catalog & CRM'}
                      </span>
                      <span className="text-base font-black text-blue-900 font-mono mt-0.5 block">
                        {compiledPackage.metadata.productsCount}P • {compiledPackage.metadata.customersCount}C
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Coverage: {compiledPackage.summary.earliestBillDate} to {compiledPackage.summary.latestBillDate}
                      </span>
                    </span>
                    <span className="font-mono text-slate-600">
                      Generated: {new Date(compiledPackage.metadata.generatedTimestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={loading || !compiledPackage}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#4b1d3f] hover:bg-[#38152e] active:scale-[0.99] text-white font-extrabold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>
                    {isBn
                      ? 'সেফগার্ড ব্যাকআপ ডাউনলোড করুন (JSON)'
                      : 'Download Safeguard Backup (JSON)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  disabled={loading || !compiledPackage}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  title="Copy formatted JSON data to clipboard"
                >
                  {copiedToClipboard ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">{isBn ? 'কপি হয়েছে!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>{isBn ? 'ক্লিপবোর্ডে কপি' : 'Copy JSON'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50/60 border border-amber-200/60 rounded-xl p-3">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  {isBn
                    ? 'পরামর্শ: এই JSON ফাইলটি আপনার কম্পিউটার, পেনড্রাইভ বা গুগল ড্রাইভে সংরক্ষণ করুন। কোনো ইন্টারনেট গোলযোগ বা ব্রাউজার ক্যাশ মুছে গেলেও আপনি এক ক্লিকে সম্পূর্ণ বিলিং ডাটা পুনরুদ্ধার করতে পারবেন।'
                    : 'Safeguard Tip: Store this JSON file on your computer, flash drive, or cloud drive. In case of browser cache clearing or network outages, this JSON file can restore your entire POS system with 100% accuracy.'}
                </p>
              </div>
            </>
          ) : (
            /* Tab 2: Inspect & Restore */
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 hover:border-purple-300 rounded-xl p-6 text-center bg-slate-50/50 transition-colors">
                <input
                  type="file"
                  id="backup-restore-input"
                  accept=".json"
                  onChange={handleSelectRestoreFile}
                  className="hidden"
                />
                <label
                  htmlFor="backup-restore-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">
                      {isBn ? 'ব্যাকআপ JSON ফাইল নির্বাচন করুন' : 'Click to select Safeguard JSON file'}
                    </span>
                    <span className="text-xs text-slate-500">
                      Supports DCC v2.5 Cloud Safeguard & v2.0 legacy backup files
                    </span>
                  </div>
                </label>
              </div>

              {/* Validation Result Inspection Card */}
              {restoreValidation && (
                <div className={`p-4 rounded-xl border ${
                  restoreValidation.isValid
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-red-50/50 border-red-200 text-red-900'
                }`}>
                  {restoreValidation.isValid ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Valid Backup Package Verified</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-800">
                          {restoreValidation.summary?.source}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-[10px] text-slate-500 uppercase block">Invoices to Restore</span>
                          <span className="text-base font-black text-slate-900 font-mono">
                            {restoreValidation.summary?.totalBills} Bills
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-[10px] text-slate-500 uppercase block">Total Sales Volume</span>
                          <span className="text-base font-black text-slate-900 font-mono">
                            ₹{restoreValidation.summary?.grossRevenue.toFixed(2)}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-[10px] text-slate-500 uppercase block">Catalog & CRM</span>
                          <span className="text-base font-black text-slate-900 font-mono">
                            {restoreValidation.summary?.productsCount}P • {restoreValidation.summary?.customersCount}C
                          </span>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={syncRestoredToCloud}
                          onChange={(e) => setSyncRestoredToCloud(e.target.checked)}
                          className="rounded border-slate-300 text-[#4b1d3f] focus:ring-[#4b1d3f]"
                        />
                        <span>
                          {isBn
                            ? 'রিস্টোর করার সাথে সাথে ফায়ারস্টোর ক্লাউড ডাটাবেসেও আপডেট করুন'
                            : 'Synchronize restored records directly to Firestore Cloud Database'}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={handleExecuteRestore}
                        disabled={isRestoring}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {isRestoring
                            ? (isBn ? 'রিস্টোর হচ্ছে...' : 'Restoring Database...')
                            : (isBn ? 'ডাটাবেস রিস্টোর নিশ্চিত করুন' : 'Confirm Restore to POS System')}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Invalid Backup File</p>
                        <p className="text-[11px] text-red-700 mt-0.5">{restoreValidation.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Restore Result Status Banner */}
              {restoreStatus && (
                <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs ${
                  restoreStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                    : 'bg-red-50 border-red-200 text-red-900 font-bold'
                }`}>
                  {restoreStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{restoreStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Delicious Cake Corner • 100% Eggless Bakery POS Safeguard</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
