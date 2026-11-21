import React, { useState, useEffect } from 'react';
import { SystemTerminal, Language, ShopConfig } from '../types';
import { saveShopConfig, getCurrentDeviceTerminalId, setCurrentDeviceTerminalId } from '../utils/storage';
import { generateQrDataUrl } from '../utils/upi';
import {
  X,
  Plus,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
  Edit2,
  Trash2,
  Sparkles,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Wifi,
  CloudCheck,
  Radio,
  Share2,
  HelpCircle,
  Laptop,
  Layers,
  ChefHat,
  CalendarCheck,
  Download,
  Play,
  FileCode2,
  Loader2,
  Globe
} from 'lucide-react';

interface MultiSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  onConfigUpdate: (newConfig: ShopConfig) => void;
  lang: Language;
  onTerminalSwitched?: (terminal: SystemTerminal) => void;
}

export const MultiSystemModal: React.FC<MultiSystemModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdate,
  lang,
  onTerminalSwitched
}) => {
  const terminals: SystemTerminal[] = config.terminals || [];
  const [currentDeviceId, setCurrentDeviceId] = useState<string>(getCurrentDeviceTerminalId());

  // Form states
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [nameBn, setNameBn] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [role, setRole] = useState<'counter' | 'kiosk' | 'kitchen' | 'manager' | 'mobile'>('counter');
  const [cashierName, setCashierName] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<string>('');

  // QR pairing & LAN URL state
  const [pairingTerminal, setPairingTerminal] = useState<SystemTerminal | null>(null);
  const [pairingQrUrl, setPairingQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [lanUrls, setLanUrls] = useState<string[]>([]);
  const [networkBaseUrl, setNetworkBaseUrl] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      return window.location.origin;
    }
    return 'https://ais-pre-7horp6gssg2hdcmryj25ch-268324610539.asia-east1.run.app';
  });
  const [downloadingTerminalId, setDownloadingTerminalId] = useState<string | null>(null);

  // Active terminal for this device
  const currentTerminal = terminals.find((t) => t.id === currentDeviceId) || terminals[0];

  useEffect(() => {
    if (isOpen) {
      const devId = getCurrentDeviceTerminalId();
      setCurrentDeviceId(devId);

      fetch('/api/network-info')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.lanUrls)) {
            setLanUrls(data.lanUrls);
            if (
              typeof window !== 'undefined' &&
              (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
              data.lanUrls.length > 0
            ) {
              setNetworkBaseUrl(data.lanUrls[0]);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const cleanBaseUrl = (networkBaseUrl || '').trim().replace(/\/+$/, '');

  useEffect(() => {
    if (pairingTerminal) {
      const roleParam = pairingTerminal.role === 'manager' || pairingTerminal.role === 'kiosk' || pairingTerminal.role === 'mobile' || pairingTerminal.role === 'kitchen'
        ? 'counter'
        : pairingTerminal.role;
      const pairingUrl = `${cleanBaseUrl}?terminal=${encodeURIComponent(pairingTerminal.id)}&role=${encodeURIComponent(roleParam)}`;
      generateQrDataUrl(pairingUrl).then((url) => setPairingQrUrl(url));
    } else {
      setPairingQrUrl('');
    }
  }, [pairingTerminal, cleanBaseUrl]);

  if (!isOpen) return null;

  const handleSelectDeviceTerminal = (terminalId: string) => {
    setCurrentDeviceTerminalId(terminalId);
    setCurrentDeviceId(terminalId);

    // Also update config active terminal if desired
    const updated: ShopConfig = {
      ...config,
      activeTerminalId: terminalId
    };
    saveShopConfig(updated);
    onConfigUpdate(updated);

    const found = terminals.find((t) => t.id === terminalId);
    if (found && onTerminalSwitched) {
      onTerminalSwitched(found);
    }

    setSavedToast(
      lang === 'bn'
        ? `এই সিস্টেমটি সফলভাবে "${found?.nameBn || found?.name}" হিসাবে সক্রিয় করা হয়েছে!`
        : `This device is now operating as "${found?.name}"!`
    );
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleStartAdd = () => {
    const nextNum = terminals.length + 1;
    setName(`System ${nextNum} (Billing Station)`);
    setNameBn(`সিস্টেম ${nextNum} (বিলিং স্টেশন)`);
    setCode(`S${nextNum}`);
    setRole('counter');
    setCashierName(config.signatoryName || '');
    setDeviceInfo('Counter PC / Tablet POS');
    setEditingTerminalId(null);
    setIsAdding(true);
  };

  const handleStartEdit = (t: SystemTerminal) => {
    setName(t.name);
    setNameBn(t.nameBn || '');
    setCode(t.code);
    setRole(t.role);
    setCashierName(t.cashierName || '');
    setDeviceInfo(t.deviceInfo || '');
    setEditingTerminalId(t.id);
    setIsAdding(true);
  };

  const handleSaveTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSavedToast(lang === 'bn' ? 'সিস্টেম টার্মিনালের নাম আবশ্যক।' : 'System terminal name is required.');
      setTimeout(() => setSavedToast(null), 3000);
      return;
    }

    let updatedTerminals: SystemTerminal[];

    if (editingTerminalId) {
      updatedTerminals = terminals.map((t) =>
        t.id === editingTerminalId
          ? {
              ...t,
              name: name.trim(),
              nameBn: nameBn.trim(),
              code: code.trim().toUpperCase() || 'S',
              role,
              cashierName: cashierName.trim(),
              deviceInfo: deviceInfo.trim()
            }
          : t
      );
    } else {
      const newTerminal: SystemTerminal = {
        id: `system-${Date.now()}`,
        name: name.trim(),
        nameBn: nameBn.trim(),
        code: code.trim().toUpperCase() || `S${terminals.length + 1}`,
        role,
        cashierName: cashierName.trim(),
        deviceInfo: deviceInfo.trim()
      };
      updatedTerminals = [...terminals, newTerminal];
    }

    const updatedConfig: ShopConfig = {
      ...config,
      terminals: updatedTerminals
    };

    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    setIsAdding(false);
    setEditingTerminalId(null);

    setSavedToast(
      lang === 'bn'
        ? 'সিস্টেম টার্মিনাল সফলভাবে সংরক্ষিত হয়েছে!'
        : 'System terminal saved successfully!'
    );
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleDeleteTerminal = (terminalId: string) => {
    if (terminals.length <= 1) {
      setSavedToast(
        lang === 'bn'
          ? 'কমপক্ষে একটি প্রধান সিস্টেম টার্মিনাল থাকা আবশ্যক।'
          : 'You must have at least one active system terminal.'
      );
      setTimeout(() => setSavedToast(null), 3000);
      return;
    }
    const remaining = terminals.filter((t) => t.id !== terminalId);
    let nextCurrentId = currentDeviceId;
    if (currentDeviceId === terminalId) {
      nextCurrentId = remaining[0].id;
      setCurrentDeviceTerminalId(nextCurrentId);
      setCurrentDeviceId(nextCurrentId);
    }

    const updatedConfig: ShopConfig = {
      ...config,
      terminals: remaining,
      activeTerminalId: nextCurrentId
    };

    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
  };

  const handleCopyPairingLink = (terminal: SystemTerminal) => {
    const link = `${cleanBaseUrl}?terminal=${encodeURIComponent(terminal.id)}&role=${encodeURIComponent(terminal.role)}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleDownloadPortableForTerminal = async (terminal: SystemTerminal) => {
    setDownloadingTerminalId(terminal.id);
    try {
      const label = (terminal.code || terminal.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const roleParam = terminal.role === 'kitchen' || terminal.role === 'kiosk' || terminal.role === 'manager' || terminal.role === 'mobile'
        ? 'counter'
        : terminal.role;
      const apiUrl = `/api/download-portable-pos?terminal=${encodeURIComponent(terminal.id)}&role=${encodeURIComponent(roleParam)}&counter=${encodeURIComponent(terminal.id)}&label=${encodeURIComponent(label)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (!html.includes('<div id="root">')) throw new Error('Invalid bundle');
      const filename = `DCC_POS_${label}.html`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSavedToast(
        lang === 'bn'
          ? `"${filename}" ডাউনলোড হয়েছে! অন্য সিস্টেমে নিয়ে ডাবল-ক্লিক করলেই চালু হবে।`
          : `Downloaded "${filename}"! Copy to the target system and double-click to launch.`
      );
      setTimeout(() => setSavedToast(null), 4000);
    } catch {
      setSavedToast(
        lang === 'bn'
          ? 'পোর্টেবল ফাইল ডাউনলোড করা যায়নি (লোকাল/অনলাইন সার্ভার চালু থাকা প্রয়োজন)।'
          : 'Failed to generate portable POS bundle. Ensure server is running.'
      );
      setTimeout(() => setSavedToast(null), 3500);
    } finally {
      setDownloadingTerminalId(null);
    }
  };

  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-emerald-600" />;
      case 'kiosk':
        return <Tablet className="w-4 h-4 text-sky-600" />;
      case 'kitchen':
        return <ChefHat className="w-4 h-4 text-amber-600" />;
      case 'manager':
        return <CalendarCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <Monitor className="w-4 h-4 text-[#4b1d3f]" />;
    }
  };

  const getRoleBadge = (roleType: string) => {
    switch (roleType) {
      case 'mobile':
        return { label: lang === 'bn' ? 'মোবাইল / ট্যাব টার্মিনাল' : 'Mobile / Phone POS', color: 'bg-emerald-100 text-emerald-800' };
      case 'kitchen':
        return { label: lang === 'bn' ? 'বেকারি কিচেন ডিসপ্লে' : 'Bakery Kitchen KDS', color: 'bg-amber-100 text-amber-800' };
      case 'kiosk':
        return { label: lang === 'bn' ? 'কাস্টমার কিয়স্ক' : 'Self Kiosk', color: 'bg-sky-100 text-sky-800' };
      case 'manager':
        return { label: lang === 'bn' ? 'ম্যানেজার ও বুকিং' : 'Manager Desk', color: 'bg-purple-100 text-purple-800' };
      default:
        return { label: lang === 'bn' ? 'কাউন্টার পিওএস' : 'Counter POS', color: 'bg-[#4b1d3f]/10 text-[#4b1d3f]' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#4b1d3f] to-[#36142c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {lang === 'bn' ? 'মাল্টিপল সিস্টেম ও টার্মিনাল নেটওয়ার্ক' : 'Multiple System & Multi-Device POS Network'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {lang === 'bn' ? 'রিয়েল-টাইম সিঙ্ক' : 'Live Sync'}
                </span>
              </div>
              <p className="text-xs text-amber-100/80">
                {lang === 'bn'
                  ? 'একই সাথে একাধিক কম্পিউটার, কাউন্টার ডেস্ক এবং স্টাফদের মোবাইলে ব্যবহার করুন'
                  : 'Run Delicious Cake Corner simultaneously across multiple PCs, tablets & mobile phones'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Toast */}
        {savedToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedToast}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Active Terminal on THIS Machine Card */}
          <div className="bg-gradient-to-br from-white to-amber-50/40 p-4 sm:p-5 rounded-2xl border-2 border-amber-300/80 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#4b1d3f] text-white flex flex-col items-center justify-center font-black shadow-xs">
                  <span className="text-[10px] text-amber-300 leading-none">SYSTEM</span>
                  <span className="text-base font-mono leading-tight">{currentTerminal?.code || 'S1'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider text-amber-800 uppercase block">
                    {lang === 'bn' ? 'এই ডিভাইসের নির্ধারিত সিস্টেম পরিচয়' : 'Current Device Terminal Station'}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {lang === 'bn' ? (currentTerminal?.nameBn || currentTerminal?.name) : currentTerminal?.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-slate-600 font-medium">
                      Cashier: <b className="text-slate-900">{currentTerminal?.cashierName || 'Primary Staff'}</b>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-medium">{currentTerminal?.deviceInfo || 'Assigned Station'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'bn' ? 'সক্রিয় (Active)' : 'Active Here'}</span>
                </span>
              </div>
            </div>

            {/* Quick Switcher Buttons */}
            <div className="pt-3">
              <span className="text-[11px] font-bold text-slate-600 block mb-2">
                {lang === 'bn' ? 'এই ডিভাইসটি অন্য সিস্টেমে পরিবর্তন করতে ক্লিক করুন:' : 'Switch this physical device to another station:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {terminals.map((t) => {
                  const isCurrent = t.id === currentDeviceId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectDeviceTerminal(t.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                        isCurrent
                          ? 'bg-[#4b1d3f] text-white shadow-sm ring-2 ring-[#4b1d3f]/30'
                          : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/15">{t.code}</span>
                      <span>{lang === 'bn' ? (t.nameBn || t.name) : t.name}</span>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-amber-300 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real-time Cloud Sync & Multi-System Architecture Banner */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {lang === 'bn' ? 'রিয়েল-টাইম ক্লাউড সিঙ্ক স্থিতি (Cloud Multi-System Sync)' : 'Real-Time Multi-System Cloud Sync'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn'
                      ? 'একটি সিস্টেমে কাটা বিল সাথে সাথে অন্য সব সিস্টেমে আপডেট হয়ে যায়'
                      : 'Bills created on any terminal automatically sync across all other stations in real time'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'bn' ? 'সিঙ্ক সক্রিয়' : 'Live Connected'}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs text-slate-600 border-t border-slate-100">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <b className="text-slate-900 block text-[11px] mb-0.5">১. কেন্দ্রীয় বিল রেজিস্টার</b>
                <span>সিস্টেম ১, ২ বা মোবাইলের সমস্ত বিল একই ডাটাবেসে একত্রিত থাকে।</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <b className="text-slate-900 block text-[11px] mb-0.5">২. স্বাধীন কাউন্টার প্রিন্ট</b>
                <span>প্রতিটি টার্মিনাল নিজ নিজ প্রিন্টারে আলাদা রসিদ প্রিন্ট করতে পারে।</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <b className="text-slate-900 block text-[11px] mb-0.5">৩. অফলাইন ব্যাকআপ</b>
                <span>ইন্টারনেট বিঘ্নিত হলেও স্থানীয় মেমোরিতে বিল জমা থাকে এবং পরে স্বয়ংক্রিয় সিঙ্ক হয়।</span>
              </div>
            </div>
          </div>

          {/* 1-Click Portable POS (.HTML) & Windows Run File (.BAT) Quick Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 p-4 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-[#4b1d3f] text-amber-300 text-[10px] font-black uppercase flex items-center gap-1">
                    <Play className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                    <span>1-Click Portable + Run Files</span>
                  </span>
                  <h4 className="font-black text-sm text-amber-950">
                    {lang === 'bn' ? 'অন্য কম্পিউটারের পোর্টেবল অ্যাপ (.HTML) ও রান ফাইল (.BAT)' : 'Separate System Portable App (.HTML) & Run Files (.BAT)'}
                  </h4>
                </div>
                <p className="text-xs text-amber-900/90 mt-1">
                  {lang === 'bn'
                    ? 'কোনো Node.js, সার্ভার বা ৪০৪ এরর ছাড়াই অন্য কম্পিউটারে চালাতে "Portable .HTML" ফাইলটি ডাউনলোড করে ডাবল-ক্লিক করুন!'
                    : 'Download "Portable .HTML" for guaranteed offline & online launch on any separate PC or mobile without 404 or Node.js.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  disabled={downloadingTerminalId !== null}
                  onClick={() => handleDownloadPortableForTerminal(currentTerminal || terminals[0])}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Download 100% Standalone Portable POS HTML (Offline + Online)"
                >
                  {downloadingTerminalId ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" /> : <FileCode2 className="w-3.5 h-3.5 text-amber-300" />}
                  <span>Portable POS (.html)</span>
                </button>

                <a
                  href="/launch_cloud_pos.bat"
                  download="Delicious_Cake_Corner_QuickLaunch.bat"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="1-Click Desktop App Mode Launcher"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>QuickLaunch.bat</span>
                </a>

                <a
                  href="/run.bat"
                  download="run.bat"
                  className="px-3 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Safe Local Server Runner (run.bat)"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>run.bat</span>
                </a>
              </div>
            </div>

            {lanUrls.length > 0 && (
              <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-bold text-amber-950 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-emerald-700" />
                  {lang === 'bn' ? 'দোকানের Wi-Fi LAN লিঙ্ক:' : 'Detected Shop LAN:'}
                </span>
                {lanUrls.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setNetworkBaseUrl(url)}
                    className={`px-2 py-0.5 rounded-lg font-mono font-bold border cursor-pointer ${
                      cleanBaseUrl === url
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {url}
                  </button>
                ))}
                {typeof window !== 'undefined' && window.location.protocol.startsWith('http') && (
                  <button
                    type="button"
                    onClick={() => setNetworkBaseUrl(window.location.origin)}
                    className={`px-2 py-0.5 rounded-lg font-mono font-bold border cursor-pointer flex items-center gap-1 ${
                      cleanBaseUrl === window.location.origin
                        ? 'bg-[#4b1d3f] text-white border-[#4b1d3f]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Origin</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Terminal List & Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#4b1d3f]" />
                <h4 className="text-sm font-extrabold text-slate-900">
                  {lang === 'bn' ? 'দোকানের সমস্ত সিস্টেম টার্মিনাল তালিকা' : 'Configured Store System Terminals'}
                </h4>
                <span className="text-xs text-slate-500 font-bold">({terminals.length} Stations)</span>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? '+ নতুন সিস্টেম যোগ করুন' : '+ Add New Station'}</span>
              </button>
            </div>

            {/* Terminal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {terminals.map((t) => {
                const isCurrent = t.id === currentDeviceId;
                const roleBadge = getRoleBadge(t.role);

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-300/40 shadow-xs'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          {getRoleIcon(t.role)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#4b1d3f] text-white text-[10px] font-mono font-bold">
                              {t.code}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleBadge.color}`}>
                              {roleBadge.label}
                            </span>
                          </div>
                          <h5 className="font-extrabold text-slate-900 text-sm mt-1">
                            {lang === 'bn' ? (t.nameBn || t.name) : t.name}
                          </h5>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black shrink-0">
                          This Device
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-semibold text-slate-700">
                          Operator: <b className="text-slate-900">{t.cashierName || 'Not Assigned'}</b>
                        </div>
                        <div className="text-[10px] text-slate-500">{t.deviceInfo || 'Standard POS'}</div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        {/* Download Portable HTML for this station */}
                        <button
                          type="button"
                          disabled={downloadingTerminalId === t.id}
                          onClick={() => handleDownloadPortableForTerminal(t)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                          title="Download Portable Offline/Online POS (.html) for this terminal"
                        >
                          {downloadingTerminalId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode2 className="w-3.5 h-3.5" />}
                        </button>

                        {/* Pairing QR button */}
                        <button
                          type="button"
                          onClick={() => setPairingTerminal(t)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition-colors"
                          title="Generate QR code to connect mobile phone or other PC to this terminal"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy Link button */}
                        <button
                          type="button"
                          onClick={() => handleCopyPairingLink(t)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition-colors"
                          title="Copy direct connection URL"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(t)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Edit terminal settings"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        {terminals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTerminal(t.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-colors"
                            title="Delete terminal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Select for this device button */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleSelectDeviceTerminal(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-800 text-xs font-bold transition-colors"
                          >
                            {lang === 'bn' ? 'ব্যবহার করুন' : 'Use Here'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add / Edit Terminal Modal Form Inline */}
          {isAdding && (
            <div className="bg-white p-5 rounded-2xl border-2 border-[#4b1d3f] shadow-lg space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-black text-sm text-[#4b1d3f]">
                  {editingTerminalId
                    ? (lang === 'bn' ? 'সিস্টেম টার্মিনাল এডিট করুন' : 'Edit System Terminal')
                    : (lang === 'bn' ? 'নতুন সিস্টেম টার্মিনাল যোগ করুন' : 'Add New System Terminal')}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTerminal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'bn' ? 'টার্মিনালের নাম (English)' : 'Terminal Name (English)'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. System 3 (Delivery & Booking Desk)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'bn' ? 'টার্মিনালের নাম (বাংলা)' : 'Terminal Name (Bengali)'}
                    </label>
                    <input
                      type="text"
                      value={nameBn}
                      onChange={(e) => setNameBn(e.target.value)}
                      placeholder="যেমন: সিস্টেম ৩ (ডেলিভারি ও বুকিং ডেস্ক)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'bn' ? 'টার্মিনাল কোড (Code)' : 'Terminal Code'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="S3"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'bn' ? 'স্টেশনের ধরন (Role)' : 'Station Role'}
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f] font-semibold"
                    >
                      <option value="counter">Counter POS (সাধারণ বিলিং)</option>
                      <option value="mobile">Mobile POS (স্টাফের ফোন / ট্যাবলেট)</option>
                      <option value="kitchen">Kitchen Display (কেক ডেকোরেটর স্ক্রিন)</option>
                      <option value="manager">Manager Desk (অ্যাডভান্স বুকিং)</option>
                      <option value="kiosk">Customer Kiosk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'bn' ? 'অপারেটর / ক্যাশিয়ার' : 'Assigned Cashier'}
                    </label>
                    <input
                      type="text"
                      value={cashierName}
                      onChange={(e) => setCashierName(e.target.value)}
                      placeholder="Sumona Mondal Kunti"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'bn' ? 'ডিভাইস বা লোকেশন বিবরণ' : 'Hardware / Device Location Note'}
                  </label>
                  <input
                    type="text"
                    value={deviceInfo}
                    onChange={(e) => setDeviceInfo(e.target.value)}
                    placeholder="e.g. Front Desktop PC, Hall Waiter Android Phone, Workshop iPad"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4b1d3f] hover:bg-[#38152e] text-white shadow-xs"
                  >
                    {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Terminal'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quick Connect & Pairing Drawer Modal */}
          {pairingTerminal && (
            <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl border-2 border-amber-300 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#4b1d3f]" />
                  <h4 className="font-black text-sm text-slate-900">
                    {lang === 'bn'
                      ? `"${pairingTerminal.nameBn || pairingTerminal.name}" - মোবাইলে বা অন্য কম্পিউটারে যুক্ত করার QR কোড`
                      : `Connect Another Device as "${pairingTerminal.name}"`}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPairingTerminal(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code image */}
                <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-xs text-center shrink-0">
                  {pairingQrUrl ? (
                    <img
                      src={pairingQrUrl}
                      alt="Pairing QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                      Generating QR...
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                    মোবাইল ক্যামেরা বা স্ক্যানার দিয়ে স্ক্যান করুন
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-700 flex-1">
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80">
                    <b className="text-slate-900 block mb-1 text-xs">📱 যেকোনো মোবাইলে দ্রুত শুরু করার নিয়ম:</b>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                      <li>স্টাফ বা কর্মচারীর স্মার্টফোনের ক্যামেরা দিয়ে বামপাশের QR কোডটি স্ক্যান করুন।</li>
                      <li>অথবা নিচের লিঙ্কটি হোয়াটসঅ্যাপ বা মেসেজে পাঠিয়ে ওপেন করুন।</li>
                      <li>ফোনটিতে স্বয়ংক্রিয়ভাবে এই সফটওয়্যারটি <b>{pairingTerminal.name}</b> হিসেবে চালু হয়ে যাবে।</li>
                      <li>কোনো অ্যাপ ইনস্টল ছাড়াই ব্রাউজারে ফুল স্পিডে বিল করা যাবে এবং মূল কম্পিউটারে সব বিল চলে আসবে!</li>
                    </ol>
                  </div>

                  {/* Direct link copy */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${cleanBaseUrl}?terminal=${pairingTerminal.id}&role=${pairingTerminal.role}`}
                      className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyPairingLink(pairingTerminal)}
                      className="px-3.5 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'লিঙ্ক কপি' : 'Copy Link')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Practical Multi-System Usage Guide */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900">
              <HelpCircle className="w-4 h-4 text-[#4b1d3f]" />
              <span>{lang === 'bn' ? 'একাধিক সিস্টেম ব্যবহারের বাস্তব উদাহরণ ও গাইডলাইন' : 'Multiple System Use Cases & Store Setups'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs text-slate-600">
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/70 space-y-1">
                <span className="font-extrabold text-[#4b1d3f] block text-xs">
                  সেটআপ ১: দুই কাউন্টার ডেস্ক
                </span>
                <p className="text-[11px] leading-relaxed">
                  দোকানের সামনে ১নং কম্পিউটারে কেক বিক্রি এবং ২নং কম্পিউটারে পেস্ট্রি ও স্ন্যাক্স বিক্রি আলাদা প্রিন্টারে দ্রুত বিলিং করুন।
                </p>
              </div>

              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/70 space-y-1">
                <span className="font-extrabold text-emerald-900 block text-xs">
                  সেটআপ ২: কম্পিউটার + স্টাফের মোবাইল
                </span>
                <p className="text-[11px] leading-relaxed">
                  দোকানে ভিড়ের সময় কর্মীরা নিজেদের ফোনে বা ট্যাবলেটে অর্ডার তুলে সেভ করবে এবং ক্যাশ ডেস্কে স্বয়ংক্রিয়ভাবে মূল বিল জমা হবে।
                </p>
              </div>

              <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-200/70 space-y-1">
                <span className="font-extrabold text-purple-900 block text-xs">
                  সেটআপ ৩: অ্যাডভান্স বুকিং ও ডেকোরেটর
                </span>
                <p className="text-[11px] leading-relaxed">
                  কাস্টম বার্থডে কেকের অগ্রিম অর্ডার আলাদা বুকিং ডেস্কে নেওয়া হবে এবং বেকারি কিচেনে সেই অর্ডারের তথ্য রিয়েল-টাইমে প্রদর্শিত হবে।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-700">Delicious Cake Corner</span>
            <span>• Mansuka, Ghatal</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
