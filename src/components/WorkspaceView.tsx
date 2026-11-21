import React, { useState, useEffect } from 'react';
import { Bill, ShopConfig } from '../types';
import { GoogleDriveManager } from './GoogleDriveManager';
import { GoogleFormsManager } from './GoogleFormsManager';
import { GoogleSheetsManager } from './GoogleSheetsManager';
import {
  Cloud,
  FileSpreadsheet,
  Table,
  ShieldCheck,
  Download,
  Upload,
  Layers,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  FileJson,
  Info
} from 'lucide-react';
import {
  CloudBackupSourceMode,
  CloudBackupSafeguardPackage,
  fetchAndCompileCloudBackup,
  downloadCloudBackupJson,
  validateAndInspectBackup,
  restoreFromSafeguardPackage,
  BackupValidationResult
} from '../services/cloudBackupService';

interface WorkspaceViewProps {
  bills: Bill[];
  config: ShopConfig;
  onRestoreSuccess: () => void;
  onSelectFormOrderForBilling: (order: {
    customerName: string;
    customerMobile: string;
    productName: string;
    weight: string;
    cakeMessage: string;
    deliveryDate: string;
  }) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  bills,
  config,
  onRestoreSuccess,
  onSelectFormOrderForBilling
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'drive' | 'forms' | 'backup'>('sheets');

  // Cloud Backup Safeguard State
  const [sourceMode, setSourceMode] = useState<CloudBackupSourceMode>('unified');
  const [compiledPkg, setCompiledPkg] = useState<CloudBackupSafeguardPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<{ filename: string; sizeKb: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Restore State
  const [restoreValidation, setRestoreValidation] = useState<BackupValidationResult | null>(null);
  const [syncToCloudOnRestore, setSyncToCloudOnRestore] = useState(true);
  const [restoreStatus, setRestoreStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadBackupData = async () => {
    setLoading(true);
    try {
      const { pkg, cloudConnected: isConnected } = await fetchAndCompileCloudBackup(sourceMode);
      setCompiledPkg(pkg);
      setCloudConnected(isConnected);
    } catch (err) {
      console.error('Error compiling backup in workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      loadBackupData();
    }
  }, [activeTab, sourceMode]);

  const handleDownload = () => {
    if (!compiledPkg) return;
    const res = downloadCloudBackupJson(compiledPkg);
    setDownloadSuccess(res);
  };

  const handleCopy = () => {
    if (!compiledPkg) return;
    navigator.clipboard.writeText(JSON.stringify(compiledPkg, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRestoreValidation(validateAndInspectBackup(content));
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!restoreValidation?.pkg) return;
    if (!window.confirm(`Restore ${restoreValidation.summary?.totalBills} bills from this backup file?`)) return;

    setIsRestoring(true);
    try {
      const res = await restoreFromSafeguardPackage(restoreValidation.pkg, syncToCloudOnRestore);
      setRestoreStatus({ success: res.success, message: res.message });
      if (res.success) {
        onRestoreSuccess();
        loadBackupData();
      }
    } catch (err: any) {
      setRestoreStatus({ success: false, message: err?.message || 'Restore failed' });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 4-Tab Segmented Control */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'sheets'
              ? 'bg-[#4b1d3f] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Table className="w-4 h-4 text-emerald-400" />
          <span>Google Sheets Sales Register</span>
        </button>

        <button
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'drive'
              ? 'bg-[#4b1d3f] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Cloud className="w-4 h-4 text-blue-400" />
          <span>Google Drive Cloud Backups</span>
        </button>

        <button
          onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'forms'
              ? 'bg-[#4b1d3f] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-400" />
          <span>Google Forms Cake Orders</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'backup'
              ? 'bg-[#4b1d3f] text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Manual Cloud Safeguard (JSON)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase">
            Direct
          </span>
        </button>
      </div>

      {activeTab === 'sheets' && (
        <GoogleSheetsManager
          bills={bills}
          config={config}
        />
      )}

      {activeTab === 'drive' && (
        <GoogleDriveManager
          bills={bills}
          config={config}
          onRestoreSuccess={onRestoreSuccess}
        />
      )}

      {activeTab === 'forms' && (
        <GoogleFormsManager
          config={config}
          onSelectFormOrderForBilling={onSelectFormOrderForBilling}
        />
      )}

      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                  <span>Data Safeguard</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">Firestore + LocalStorage</span>
              </div>
              <h3 className="font-black text-slate-900 text-lg sm:text-xl mt-1 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-600" />
                <span>Manual Cloud Backup & JSON Download</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Download a tamper-verifiable JSON snapshot of your current billing data from Firestore and local storage. No Google account sign-in required.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <span className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{cloudConnected ? 'Live Cloud Connected' : 'Local Cache Active'}</span>
              </span>
              <button
                onClick={loadBackupData}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh Backup Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Success Download Banner */}
          {downloadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Downloaded: <strong>{downloadSuccess.filename}</strong> ({downloadSuccess.sizeKb} KB)</span>
              </div>
              <button onClick={() => setDownloadSuccess(null)} className="text-emerald-700 font-bold">✕</button>
            </div>
          )}

          {/* Source Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Choose Data Source for JSON Export:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSourceMode('unified')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  sourceMode === 'unified'
                    ? 'border-[#4b1d3f] bg-purple-50/50 ring-2 ring-[#4b1d3f]/20'
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
                <p className="text-[11px] text-slate-500">
                  Reconciles live Firestore cloud documents with local terminal cache so newly generated bills are preserved.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSourceMode('firestore')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  sourceMode === 'firestore'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <span>Live Firestore</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Direct live extract from Firestore cloud collection.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSourceMode('local')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  sourceMode === 'local'
                    ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-amber-600" />
                    <span>Local Storage</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Direct snapshot of browser local storage on this computer.
                </p>
              </button>
            </div>
          </div>

          {/* Metrics Preview */}
          {compiledPkg && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileJson className="w-4 h-4 text-blue-600" />
                  <span>Snapshot Summary ({compiledPkg.metadata.sourceDescription})</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Checksum: <strong className="text-slate-700">{compiledPkg.metadata.checksum}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Invoices Recorded</span>
                  <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                    {compiledPkg.summary.totalBills} Bills
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Gross Sales Value</span>
                  <span className="text-lg font-black text-emerald-800 font-mono mt-0.5 block">
                    ₹{compiledPkg.summary.grossRevenue.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Outstanding Due</span>
                  <span className="text-lg font-black text-amber-800 font-mono mt-0.5 block">
                    ₹{compiledPkg.summary.totalDue.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Catalog & Customers</span>
                  <span className="text-lg font-black text-blue-800 font-mono mt-0.5 block">
                    {compiledPkg.metadata.productsCount}P • {compiledPkg.metadata.customersCount}C
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleDownload}
              disabled={loading || !compiledPkg}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#4b1d3f] hover:bg-[#38152e] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Download Safeguard JSON File</span>
            </button>

            <button
              onClick={handleCopy}
              disabled={loading || !compiledPkg}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy JSON Payload</span>
                </>
              )}
            </button>
          </div>

          {/* Safeguard Restore Section */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Restore from Previously Saved Safeguard JSON
                </h4>
                <p className="text-[11px] text-slate-500">
                  Inspect and restore complete billing databases from any downloaded JSON backup.
                </p>
              </div>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-purple-700" />
                <span>Select JSON File</span>
                <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            {restoreValidation?.isValid && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-emerald-900">
                  <span>Verified: {restoreValidation.summary?.totalBills} bills • ₹{restoreValidation.summary?.grossRevenue.toFixed(2)}</span>
                  <span>{restoreValidation.summary?.source}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={syncToCloudOnRestore}
                    onChange={(e) => setSyncToCloudOnRestore(e.target.checked)}
                    className="rounded border-slate-300 text-[#4b1d3f]"
                  />
                  <span>Push restored data to Firestore Cloud Database</span>
                </label>
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="py-2 px-4 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-2xs"
                >
                  {isRestoring ? 'Restoring...' : 'Confirm Restore to POS System'}
                </button>
              </div>
            )}

            {restoreStatus && (
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                restoreStatus.success ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {restoreStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{restoreStatus.message}</span>
              </div>
            )}
          </div>

          {/* Info footer */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-amber-50/50 border border-amber-200/50 rounded-xl p-3">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Offline Protection Tip: You can save this backup file to your local computer, a pendrive, or email it to yourself. This guarantees you never lose invoices even if the browser cache is wiped.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
