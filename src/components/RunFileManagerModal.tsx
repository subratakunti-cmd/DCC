import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Download,
  Copy,
  Check,
  Laptop,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Terminal,
  Zap,
  Wifi,
  AlertTriangle,
  Globe,
  FileCode2,
  Loader2
} from 'lucide-react';
import { ShopConfig, Language, AppUserSession, SystemTerminal } from '../types';
import { getCurrentDeviceTerminalId, setCurrentDeviceTerminalId, saveUserSession, saveShopConfig } from '../utils/storage';
import { generateQrDataUrl } from '../utils/upi';

interface RunFileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  lang: Language;
  currentSession: AppUserSession;
  onSessionChange: (session: AppUserSession) => void;
  onConfigUpdate: (newConfig: ShopConfig) => void;
}

type StationPresetKey = 'admin' | 'system-1' | 'system-2' | 'distributor';

interface StationPreset {
  key: StationPresetKey;
  terminal: string;
  role: 'admin' | 'counter' | 'distributor';
  counter: string;
  label: string;
  badge: string;
  titleBn: string;
  titleEn: string;
}

const STATION_PRESETS: StationPreset[] = [
  {
    key: 'admin',
    terminal: 'system-1',
    role: 'admin',
    counter: 'counter-1',
    label: 'ADMIN_MASTER',
    badge: 'ADMIN MASTER',
    titleBn: 'অ্যাডমিন মাস্টার (মালিক)',
    titleEn: 'Admin Master (Owner)'
  },
  {
    key: 'system-1',
    terminal: 'system-1',
    role: 'counter',
    counter: 'counter-1',
    label: 'SYSTEM_1_COUNTER',
    badge: 'SYSTEM S1',
    titleBn: 'সিস্টেম ১ (প্রধান কাউন্টার)',
    titleEn: 'System 1 (Main Counter)'
  },
  {
    key: 'system-2',
    terminal: 'system-2',
    role: 'counter',
    counter: 'counter-2',
    label: 'SYSTEM_2_PASTRY',
    badge: 'SYSTEM S2',
    titleBn: 'সিস্টেম ২ (পেস্ট্রি কাউন্টার)',
    titleEn: 'System 2 (Pastry Counter)'
  },
  {
    key: 'distributor',
    terminal: 'system-3',
    role: 'distributor',
    counter: 'counter-1',
    label: 'DISTRIBUTOR_D1',
    badge: 'DIST D1',
    titleBn: 'ডিস্ট্রিবিউটর (ঘাটাল রুট)',
    titleEn: 'Distributor Route (D1)'
  }
];

const SHARED_CLOUD_FALLBACK = 'https://ais-pre-7horp6gssg2hdcmryj25ch-268324610539.asia-east1.run.app';

export const RunFileManagerModal: React.FC<RunFileManagerModalProps> = ({
  isOpen,
  onClose,
  config,
  lang,
  currentSession,
  onSessionChange,
  onConfigUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'run_file' | 'multi_system' | 'instructions'>('run_file');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedPresetKey, setSelectedPresetKey] = useState<StationPresetKey>('system-1');
  const [switchSuccessToast, setSwitchSuccessToast] = useState<string | null>(null);

  const [lanUrls, setLanUrls] = useState<string[]>([]);
  const [isCloudHosted, setIsCloudHosted] = useState<boolean>(false);
  const [customServerUrl, setCustomServerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return window.location.origin;
    }
    return SHARED_CLOUD_FALLBACK;
  });

  const [isDownloadingPortable, setIsDownloadingPortable] = useState<boolean>(false);
  const [downloadStatusMsg, setDownloadStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedPreset = STATION_PRESETS.find((p) => p.key === selectedPresetKey) || STATION_PRESETS[1];
  const cleanBaseUrl = (customServerUrl || SHARED_CLOUD_FALLBACK).trim().replace(/\/+$/, '');
  const targetStationUrl = `${cleanBaseUrl}?terminal=${encodeURIComponent(selectedPreset.terminal)}&role=${encodeURIComponent(selectedPreset.role)}`;

  const currentTerminalId = getCurrentDeviceTerminalId();
  const terminals: SystemTerminal[] = config.terminals || [];

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/network-info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.lanUrls)) {
          setLanUrls(data.lanUrls);
          setIsCloudHosted(Boolean(data.isCloudHosted));
          // If running on a local PC (localhost), auto-suggest real LAN IP so other PCs/phones can connect immediately
          if (
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
            data.lanUrls.length > 0
          ) {
            setCustomServerUrl(data.lanUrls[0]);
          }
        }
      })
      .catch(() => {
        // Offline / static mode
      });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      generateQrDataUrl(targetStationUrl).then((url) => setQrDataUrl(url));
    }
  }, [isOpen, targetStationUrl]);

  if (!isOpen) return null;

  // 1. Download 100% Self-Contained Portable POS HTML (Works on ANY PC/Laptop/Mobile offline & online without server/404/Node.js)
  const handleDownloadPortablePosHtml = async () => {
    setIsDownloadingPortable(true);
    setDownloadStatusMsg(null);
    try {
      const apiUrl = `/api/download-portable-pos?terminal=${encodeURIComponent(selectedPreset.terminal)}&role=${encodeURIComponent(selectedPreset.role)}&counter=${encodeURIComponent(selectedPreset.counter)}&label=${encodeURIComponent(selectedPreset.label)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const htmlContent = await response.text();
      if (!htmlContent || !htmlContent.includes('<div id="root">')) {
        throw new Error('Invalid portable bundle response');
      }
      const filename = `DCC_POS_${selectedPreset.label}.html`;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadStatusMsg({
        type: 'success',
        text:
          lang === 'bn'
            ? `"${filename}" ডাউনলোড হয়েছে! এটি পেনড্রাইভ বা হোয়াটসঅ্যাপে অন্য কম্পিউটার/মোবাইলে নিয়ে ডাবল-ক্লিক করলেই সরাসরি চলবে (কোনো সার্ভার বা ৪0৪ এরর ছাড়াই)।`
            : `Downloaded "${filename}"! Copy this file to any other PC, laptop, or mobile and double-click to run offline & online.`
      });
    } catch {
      setDownloadStatusMsg({
        type: 'error',
        text:
          lang === 'bn'
            ? 'পোর্টেবল ফাইল তৈরি করতে সার্ভার সংযোগ পাওয়া যায়নি। অনলাইন সার্ভার চালু আছে কিনা দেখুন অথবা নিচের সিস্টেম লিঙ্ক ব্যবহার করুন।'
            : 'Could not reach server to build the portable HTML bundle. Make sure the app server is running.'
      });
    } finally {
      setIsDownloadingPortable(false);
    }
  };

  // Safe browser helper snippet for Windows .BAT files (avoids "Windows cannot find 'chrome'" dialog)
  const windowsBrowserHelper = `:OpenAppUrl
set "URL_TO_OPEN=%~1"
set "BROWSER_EXE="
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER_EXE=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
if not defined BROWSER_EXE if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "BROWSER_EXE=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER_EXE=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
if not defined BROWSER_EXE if exist "%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe" set "BROWSER_EXE=%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe"

if defined BROWSER_EXE (
    start "" "%BROWSER_EXE%" --app="%URL_TO_OPEN%"
) else (
    start "" "%URL_TO_OPEN%"
)
goto :eof`;

  // 2. Download Safe QuickLaunch .BAT (Detects local DCC_POS*.html first, safely finds Chrome/Edge, never pops up Chrome-not-found error)
  const handleDownloadCloudLauncherBat = () => {
    const batContent = `@echo off
setlocal enabledelayedexpansion
title DELICIOUS CAKE CORNER - ${selectedPreset.label} Launcher
cd /d "%~dp0"
echo ========================================================
echo   DELICIOUS CAKE CORNER - MANSUKA, GHATAL
echo   Station: ${selectedPreset.label}
echo ========================================================

:: 1. Prefer offline/online Portable POS HTML in same folder if present
for %%F in ("%~dp0DCC_POS*.html" "%~dp0Delicious_Cake_Corner_POS*.html") do (
    if exist "%%~fF" (
        call :OpenAppUrl "%%~fF"
        exit /b
    )
)

:: 2. Otherwise open configured station URL safely
set "TARGET_URL=${targetStationUrl}"
call :OpenAppUrl "%TARGET_URL%"
exit /b

${windowsBrowserHelper}
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DCC_QuickLaunch_${selectedPreset.label}.bat`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Download Safe Local Server run.bat (Only runs npm if package.json exists in same folder!)
  const handleDownloadLocalRunBat = () => {
    const batContent = `@echo off
setlocal enabledelayedexpansion
title DELICIOUS CAKE CORNER - Bakery POS Launcher
color 0E
cd /d "%~dp0"
echo ===================================================================
echo       DELICIOUS CAKE CORNER - SMART BAKERY POS ^& BILLING
echo       100%% Eggless Bakery - Mansuka, Ghatal, WB
echo ===================================================================
echo.

:: 1. If Portable POS HTML is in this folder, launch it directly (No Node.js needed)
for %%F in ("%~dp0DCC_POS*.html" "%~dp0Delicious_Cake_Corner_POS*.html") do (
    if exist "%%~fF" (
        echo [PORTABLE POS] Opening %%~nxF ...
        call :OpenAppUrl "%%~fF"
        exit /b
    )
)

:: 2. Run local dev server ONLY if inside the actual source code folder (package.json exists)
if exist "%~dp0package.json" (
    where node >nul 2>nul
    if !errorlevel! equ 0 (
        if not exist "%~dp0node_modules" (
            echo [Setup] Installing required packages for first-time launch...
            call npm install
        )
        echo [POS] Launching local bakery server on port 3000...
        call :OpenAppUrl "http://localhost:3000?terminal=${selectedPreset.terminal}&role=${selectedPreset.role}"
        call npm run dev
        pause
        exit /b
    )
)

:: 3. Separate system fallback: open configured LAN/Cloud URL safely
echo [Separate System Mode] Opening station URL: ${targetStationUrl}
call :OpenAppUrl "${targetStationUrl}"
timeout /t 2 >nul
exit /b

${windowsBrowserHelper}
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Delicious_Cake_Corner_RUN.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 4. Download Desktop URL Shortcut (.url)
  const handleDownloadDesktopShortcut = () => {
    const shortcutContent = `[InternetShortcut]
URL=${targetStationUrl}
IconIndex=0
IconFile=${cleanBaseUrl}/app-icon.png
HotKey=0
IDList=
`;
    const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DCC_POS_${selectedPreset.label}.url`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Switch Station on THIS device
  const handleSwitchDeviceStation = (terminalId: string, role: 'admin' | 'counter' | 'distributor') => {
    setCurrentDeviceTerminalId(terminalId);

    const term = terminals.find((t) => t.id === terminalId) || terminals[0];
    let newSession: AppUserSession;

    if (role === 'admin') {
      newSession = {
        role: 'admin',
        userId: 'admin',
        userName: 'Subrata Kunti (Admin / Owner)',
        staffId: 'staff-admin-subrata',
        loginAt: Date.now()
      };
    } else if (role === 'counter') {
      newSession = {
        role: 'counter',
        userId: 'counter1',
        userName: term?.cashierName || 'Counter Cashier',
        counterId: term?.id || 'counter-1',
        counterName: term?.name || 'Counter Station',
        counterCode: term?.code || 'C1',
        staffId: 'staff-counter-sumona',
        loginAt: Date.now()
      };
    } else {
      newSession = {
        role: 'distributor',
        userId: 'delivery1',
        userName: 'Delivery Partner',
        distributorId: 'dist-1',
        distributorName: 'Ghatal Route',
        distributorCode: 'D1',
        zone: 'Ghatal & Mansuka',
        staffId: 'staff-dist-ramesh',
        loginAt: Date.now()
      };
    }

    saveUserSession(newSession);
    onSessionChange(newSession);

    const updatedConfig: ShopConfig = {
      ...config,
      activeTerminalId: terminalId
    };
    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);

    setSwitchSuccessToast(
      lang === 'bn'
        ? `এই কম্পিউটারটি সফলভাবে "${term?.nameBn || term?.name}" হিসেবে সেট করা হয়েছে!`
        : `This device is now set to "${term?.name}"!`
    );
    setTimeout(() => setSwitchSuccessToast(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#4b1d3f] via-[#38152e] to-[#250a1d] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Play className="w-5 h-5 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-white">
                  {lang === 'bn' ? 'অন্য সিস্টেমে চালু ও পোর্টেবল অ্যাপ' : 'Run on Separate System & Portable POS'}
                </h2>
                <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-black uppercase">
                  Offline + Online Ready
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {lang === 'bn'
                  ? 'অন্য যেকোনো কম্পিউটার, ল্যাপটপ বা মোবাইলে বিনা ঝামেলায় (৪০৪ বা Node.js ছাড়াই) সফটওয়্যার চালান'
                  : 'Run effortlessly on any separate Windows PC, laptop, or phone without Node.js or 404 errors'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {switchSuccessToast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center gap-2 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-300" />
            <span>{switchSuccessToast}</span>
          </div>
        )}

        {/* Tab Navigator */}
        <div className="px-5 pt-3 bg-slate-100 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('run_file')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'run_file'
                ? 'bg-white text-[#4b1d3f] border-t-2 border-[#4b1d3f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>{lang === 'bn' ? '১. পোর্টেবল অ্যাপ ও রান ফাইল' : '1. Portable App & Run Files'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('multi_system')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'multi_system'
                ? 'bg-white text-[#4b1d3f] border-t-2 border-[#4b1d3f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lang === 'bn' ? '২. এই ডিভাইসের স্টেশন সেটিং' : '2. Switch Station Here'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'instructions'
                ? 'bg-white text-[#4b1d3f] border-t-2 border-[#4b1d3f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'bn' ? '৩. ৪0৪ / লগইন সমাধান গাইড' : '3. Fix 404 & Setup Guide'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50 text-slate-800">
          {/* TAB 1: PORTABLE POS HTML + SAFE RUN FILES + LAN URL */}
          {activeTab === 'run_file' && (
            <div className="space-y-4">
              {/* Station Role Selector */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-slate-900">
                    {lang === 'bn'
                      ? 'ধাপ ১: অন্য কম্পিউটারটি কোন কাউন্টার হিসেবে চলবে তা বেছে নিন:'
                      : 'Step 1: Select Station Role for the Other System:'}
                  </span>
                  <span className="text-[11px] font-bold text-[#4b1d3f] bg-amber-100 px-2.5 py-0.5 rounded-full">
                    {selectedPreset.badge}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATION_PRESETS.map((preset) => {
                    const active = preset.key === selectedPresetKey;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setSelectedPresetKey(preset.key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#4b1d3f] text-white border-[#4b1d3f] shadow-xs'
                            : 'bg-slate-50 hover:bg-amber-50 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className={`text-[10px] font-mono font-black ${active ? 'text-amber-300' : 'text-[#4b1d3f]'}`}>
                          {preset.badge}
                        </div>
                        <div className="text-xs font-bold mt-0.5 leading-tight">
                          {lang === 'bn' ? preset.titleBn : preset.titleEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* #1 GUARANTEED METHOD: 1-CLICK STANDALONE PORTABLE HTML FILE */}
              <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50/70 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-[230px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white">
                        100% নিশ্চিত সমাধান • Zero 404
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                        অফলাইন + অনলাইন
                      </span>
                    </div>
                    <h4 className="font-black text-base text-slate-900 pt-1 flex items-center gap-1.5">
                      <FileCode2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        {lang === 'bn'
                          ? `১-ক্লিক পোর্টেবল সম্পূর্ণ POS ফাইল (DCC_POS_${selectedPreset.label}.html)`
                          : `1-Click Standalone Portable POS App (DCC_POS_${selectedPreset.label}.html)`}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {lang === 'bn'
                        ? 'এই একটিমাত্র ফাইল ডাউনলোড করে পেনড্রাইভ বা হোয়াটসঅ্যাপে যেকোনো অন্য কম্পিউটার, ল্যাপটপ বা মোবাইলে পাঠান। ডাবল-ক্লিক করলেই ব্রাউজারে সম্পূর্ণ POS ও বিলিং সফটওয়্যার চালু হয়ে যাবে — ইন্টারনেট, Node.js বা কোনো গুগল লগইন ছাড়াই!'
                        : 'Single self-contained app file. Send via USB/WhatsApp to any Windows PC, Mac, or phone and double-click to open full POS immediately—no server, Node.js, or 404 possible.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isDownloadingPortable}
                    onClick={handleDownloadPortablePosHtml}
                    className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                  >
                    {isDownloadingPortable ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                        <span>{lang === 'bn' ? 'পোর্টেবল ফাইল তৈরি হচ্ছে...' : 'Building Portable File...'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-amber-300" />
                        <span>
                          {lang === 'bn'
                            ? `ডাউনলোড করুন (.html)`
                            : `Download Portable POS (.html)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {downloadStatusMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                      downloadStatusMsg.type === 'success'
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        : 'bg-rose-50 text-rose-900 border border-rose-300'
                    }`}
                  >
                    {downloadStatusMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{downloadStatusMsg.text}</span>
                  </div>
                )}
              </div>

              {/* #2 LAN / WI-FI URL + CLOUD LINK SECTION */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-indigo-600" />
                    <span>
                      {lang === 'bn'
                        ? 'দোকানের ওয়াই-ফাই (LAN) ও ক্লাউড ওয়েব লিঙ্ক (অন্য পিসি/মোবাইলের জন্য):'
                        : 'Shop Wi-Fi (LAN) & Direct Web URL for Other Devices:'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadDesktopShortcut}
                    className="text-xs font-bold text-[#4b1d3f] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'ডেস্কটপ শর্টকাট (.url)' : 'Desktop Shortcut (.url)'}</span>
                  </button>
                </div>

                {/* Quick Pickers for Detected LAN IPs / Origin */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {lanUrls.map((ipUrl) => (
                    <button
                      key={ipUrl}
                      type="button"
                      onClick={() => setCustomServerUrl(ipUrl)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        cleanBaseUrl === ipUrl
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      <Wifi className="w-3 h-3" />
                      <span>Shop LAN: {ipUrl}</span>
                    </button>
                  ))}

                  {typeof window !== 'undefined' && window.location.protocol.startsWith('http') && !window.location.origin.includes('localhost') && (
                    <button
                      type="button"
                      onClick={() => setCustomServerUrl(window.location.origin)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        cleanBaseUrl === window.location.origin
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>Current App URL</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setCustomServerUrl(SHARED_CLOUD_FALLBACK)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      cleanBaseUrl === SHARED_CLOUD_FALLBACK
                        ? 'bg-[#4b1d3f] text-white border-[#4b1d3f]'
                        : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Shared Public URL (ais-pre)</span>
                  </button>
                </div>

                {/* Editable Server Base URL */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600">
                    {lang === 'bn'
                      ? 'সার্ভার লিঙ্ক এডিট করুন (যেমন: http://192.168.1.50:3000 বা শেয়ার করা পাবলিক লিঙ্ক):'
                      : 'Target Server Link (Editable — e.g. Shop LAN IP or Published URL):'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customServerUrl}
                      onChange={(e) => setCustomServerUrl(e.target.value)}
                      placeholder="http://192.168.1.100:3000"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#4b1d3f]"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(targetStationUrl, 'direct_url')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedLink === 'direct_url' ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink === 'direct_url' ? 'কপি হয়েছে!' : 'স্টেশন লিঙ্ক কপি'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    Full Station Link: <span className="text-slate-800 font-bold">{targetStationUrl}</span>
                  </div>
                </div>

                {/* Cloud 404 Warning Helper */}
                {(cleanBaseUrl === SHARED_CLOUD_FALLBACK || isCloudHosted) && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-950 flex items-start gap-2 leading-relaxed">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <b>{lang === 'bn' ? 'সতর্কতা (৪0৪ ও গুগল লগইন সমস্যা):' : 'Important Note for Cloud URLs:'}</b>{' '}
                      {lang === 'bn'
                        ? 'Google AI Studio-তে "Share App" চালু না করলে ais-pre লিঙ্ক অন্য কম্পিউটারে 404 দেখায় এবং ais-dev লিঙ্ক শুধু আপনার অ্যাকাউন্টে খোলে। তাই অন্য পিসিতে বিনা ঝামেলায় চালাতে উপরের সবুজ "ডাউনলোড করুন (.html)" পোর্টেবল ফাইলটি ব্যবহার করুন!'
                        : 'External PCs get HTTP 404 on ais-pre links unless AI Studio Share/Deploy is enabled. Use the green 1-Click Portable .html download above for instant offline & online launch on any machine.'}
                    </div>
                  </div>
                )}
              </div>

              {/* #3 WINDOWS .BAT LAUNCHER OPTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Kiosk .BAT
                      </span>
                      <Zap className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h4 className="font-black text-sm text-slate-900 mt-2">
                      {lang === 'bn' ? '১-ক্লিক কিয়স্ক লঞ্চার (.BAT)' : '1-Click Kiosk Launcher (.BAT)'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {lang === 'bn'
                        ? 'Chrome/Edge না থাকলেও এরর ছাড়াই চলবে। একই ফোল্ডারে পোর্টেবল .html থাকলে আগে সেটাই ফুলস্ক্রিনে ওপেন করবে।'
                        : 'Safely finds Chrome or Edge without popup errors, prefers local DCC_POS*.html if present, or launches target station URL.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadCloudLauncherBat}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    <span>{lang === 'bn' ? `QuickLaunch_${selectedPreset.badge}.bat` : `Download QuickLaunch.bat`}</span>
                  </button>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-300">
                        Safe Source Runner
                      </span>
                      <Terminal className="w-4 h-4 text-[#4b1d3f]" />
                    </div>
                    <h4 className="font-black text-sm text-slate-900 mt-2">
                      {lang === 'bn' ? 'সার্ভার ও অটো-রান ফাইল (run.bat)' : 'Safe Local Server Runner (run.bat)'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {lang === 'bn'
                        ? 'মূল প্রজেক্ট ফোল্ডারে থাকলে Node সার্ভার চালু করে, আর অন্য কম্পিউটারে থাকলে ক্র্যাশ না করে সরাসরি পোর্টেবল/ওয়েব অ্যাপ খোলে।'
                        : 'Starts Express + Vite server when inside project folder; safely launches portable HTML or web URL on standalone PCs.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadLocalRunBat}
                    className="w-full py-2.5 px-3 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    <span>{lang === 'bn' ? 'নিরাপদ run.bat ডাউনলোড' : 'Download Safe run.bat'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-SYSTEM STATION SWITCHER ON THIS DEVICE + QR */}
          {activeTab === 'multi_system' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase">
                  <Laptop className="w-4 h-4 text-indigo-700" />
                  <span>{lang === 'bn' ? 'এই ডিভাইসকে কোন স্টেশন হিসেবে সেট করবেন?' : 'Set Terminal Role for This Device'}</span>
                </div>
                <p className="text-xs text-indigo-900 mt-1 leading-relaxed">
                  {lang === 'bn'
                    ? 'দোকানের একাধিক কম্পিউটারে যখন সফটওয়্যার চালু করবেন, প্রতিটি কম্পিউটারকে তার নিজস্ব স্টেশন হিসেবে নির্ধারণ করুন (যেমন: ১নং কম্পিউটার = কাউন্টার ১, ২নং কম্পিউটার = কাউন্টার ২)।'
                    : 'Assign each machine its designated station identity so bills carry the right terminal code (S1, S2, D1).'}
                </p>
              </div>

              {/* Station Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSwitchDeviceStation('system-1', 'admin')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    currentSession.role === 'admin'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300/40 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-[#4b1d3f] text-amber-300">
                      ADMIN MASTER
                    </span>
                    {currentSession.role === 'admin' && (
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">
                        Active Here
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    প্রধান অ্যাডমিন ও মালিকের কম্পিউটার
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    সম্পূর্ণ অ্যাক্সেস — বিলিং, দাম পরিবর্তন, স্টক অডিট, ডিলিট এবং পারমিশন।
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchDeviceStation('system-1', 'counter')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    currentSession.role === 'counter' && currentTerminalId === 'system-1'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300/40 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      SYSTEM S1 (C1)
                    </span>
                    {currentSession.role === 'counter' && currentTerminalId === 'system-1' && (
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">
                        Active Here
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    সিস্টেম ১: প্রধান কাউন্টার (Front POS)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    দোকানের সামনের প্রধান ক্যাশ কাউন্টারে দ্রুত কেক বিলিং ও থার্মাল প্রিন্ট।
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchDeviceStation('system-2', 'counter')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    currentSession.role === 'counter' && currentTerminalId === 'system-2'
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300/40 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      SYSTEM S2 (C2)
                    </span>
                    {currentSession.role === 'counter' && currentTerminalId === 'system-2' && (
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">
                        Active Here
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    সিস্টেম ২: পেস্ট্রি ও স্ন্যাক্স কাউন্টার
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    দ্বিতীয় কম্পিউটারে আলাদাভাবে পেস্ট্রি, কফি ও স্ন্যাক্স বিক্রির বিলিং।
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchDeviceStation('system-3', 'distributor')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    currentSession.role === 'distributor'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300/40 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                      DISTRIBUTOR (D1)
                    </span>
                    {currentSession.role === 'distributor' && (
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">
                        Active Here
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    ডেলিভারি ও ডিস্ট্রিবিউটর স্টেশন
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    ঘাটাল ও মনসুকা রুটের ডেলিভারি চালান ও নগদ কালেকশন রেজিস্টার।
                  </p>
                </button>
              </div>

              {/* Direct QR Link for Mobile Phones */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0 text-center">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Device Connect QR" className="w-28 h-28 object-contain mx-auto" />
                  ) : (
                    <div className="w-28 h-28 flex items-center justify-center text-xs text-slate-400">QR Loading...</div>
                  )}
                  <span className="text-[10px] text-slate-500 font-bold mt-1 block">মোবাইলে স্ক্যান করুন</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 flex-1 min-w-0">
                  <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>মোবাইল বা ট্যাবলেটে সাথে সাথে চালাতে চান?</span>
                  </h5>
                  <p className="text-[11px] leading-relaxed">
                    দোকানের একই Wi-Fi বা শেয়ার করা লিঙ্ক চালু থাকলে মোবাইলের ক্যামেরা দিয়ে QR কোড স্ক্যান করুন। আর ইন্টারনেট ছাড়া বা আলাদা নেটওয়ার্কে চালাতে ১নং ট্যাব থেকে <b>DCC_POS_*.html</b> ফাইলটি মোবাইলে পাঠিয়ে Chrome দিয়ে ওপেন করুন।
                  </p>
                  <div className="text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 truncate text-slate-700">
                    {targetStationUrl}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WHY OTHER SYSTEMS FAIL & COMPLETE FIX GUIDE */}
          {activeTab === 'instructions' && (
            <div className="space-y-3.5">
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-2">
                <h4 className="font-black text-sm text-rose-950 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>আগে কেন অন্য কম্পিউটার বা সিস্টেমে চলছিল না?</span>
                </h4>
                <ul className="pl-5 list-disc space-y-1 text-xs text-rose-900/90 leading-relaxed">
                  <li>
                    <b>৪0৪ (Not Found) / গুগল লগইন:</b> প্রিভিউ লিঙ্ক (<code>ais-dev-...</code>) শুধু আপনার ব্রাউজারে খোলে এবং শেয়ার লিঙ্ক (<code>ais-pre-...</code>) পবলিশ/শেয়ার না করলে অন্য কম্পিউটারে 404 দেখায়।
                  </li>
                  <li>
                    <b>run.bat এরর:</b> শুধু <code>run.bat</code> অন্য পিসিতে কপি করলে সেখানে প্রজেক্ট ফাইল বা Node.js না থাকায় সার্ভার চালু হতে পারত না।
                  </li>
                  <li>
                    <b>Chrome এরর:</b> যে কম্পিউটারে Chrome অন্য ফোল্ডারে বা শুধু Edge আছে, সেখানে পুরনো <code>QuickLaunch.bat</code> খুলতে গেলে <i>&quot;Windows cannot find chrome&quot;</i> পপ-আপ দেখাত।
                  </li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-300 shadow-2xs space-y-3">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">১</span>
                  <span>সবচেয়ে সহজ উপায়: পোর্টেবল .HTML ফাইল (১০০% অফলাইন + অনলাইন)</span>
                </h4>
                <div className="pl-8 space-y-1.5 text-xs text-slate-600 leading-relaxed">
                  <p>
                    • <b>১নং ট্যাব</b> থেকে আপনার কাঙ্ক্ষিত কাউন্টার (যেমন <b>System 2</b> বা <b>Admin</b>) সিলেক্ট করে সবুজ <b>&quot;ডাউনলোড করুন (.html)&quot;</b> বাটনে ক্লিক করুন।
                  </p>
                  <p>
                    • ডাউনলোড হওয়া <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-900">DCC_POS_*.html</code> ফাইলটি পেনড্রাইভ বা হোয়াটসঅ্যাপে অন্য কম্পিউটার, ল্যাপটপ বা অ্যান্ড্রয়েড ফোনে নিন।
                  </p>
                  <p>
                    • ফাইলে ডাবল-ক্লিক করলেই সরাসরি অ্যাপ খুলে যাবে — কোনো সার্ভার, কোড বা Node.js লাগবে না, আর ইন্টারনেট থাকলে ক্লাউড সিঙ্কও কাজ করবে!
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#4b1d3f] text-white flex items-center justify-center text-xs">২</span>
                  <span>দোকানের এক Wi-Fi বা পাবলিক ক্লাউড দিয়ে চালানোর নিয়ম:</span>
                </h4>
                <div className="pl-8 space-y-1.5 text-xs text-slate-600 leading-relaxed">
                  <p>
                    • <b>একই Wi-Fi নেটওয়ার্ক:</b> মূল কম্পিউটারে সার্ভার চললে উপরের <b>Shop LAN</b> লিঙ্ক (যেমন <code className="bg-slate-100 px-1 rounded font-mono">http://192.168.x.x:3000</code>) অন্য পিসি বা ফোনের Chrome-এ খুলুন।
                  </p>
                  <p>
                    • <b>পাবলিক ইন্টারনেট লিঙ্ক:</b> AI Studio-র উপরের <b>Share / Deploy</b> অপশন চালু করলে তবেই <code className="bg-slate-100 px-1 rounded font-mono">ais-pre-...</code> লিঙ্ক বাইরের যেকোনো ইন্টারনেট থেকে চলবে।
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#4b1d3f]">DELICIOUS CAKE CORNER</span>
            <span>• Mansuka, Ghatal</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-black rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            {lang === 'bn' ? 'সম্পন্ন / বন্ধ করুন' : 'Done & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
