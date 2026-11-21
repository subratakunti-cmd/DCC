import React, { useEffect, useState } from 'react';
import { Language, ShopConfig, AppUserSession, UserRole } from '../types';
import { getT } from '../translations';
import { getCurrentDeviceTerminalId } from '../utils/storage';
import {
  Cloud,
  Plus,
  ReceiptText,
  Clock,
  UtensilsCrossed,
  Boxes,
  Settings2,
  Globe,
  MapPin,
  FolderGit2,
  User,
  LogOut,
  Store,
  Smartphone,
  TrendingUp,
  Laptop,
  Users,
  Printer,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Truck,
  QrCode,
  Megaphone,
  Lock,
  Sliders,
  ShieldAlert,
  Play,
  Wifi,
  WifiOff
} from 'lucide-react';
import { hasPermission } from '../utils/permissionUtils';
import { OfflineStatusModal } from './OfflineStatusModal';

interface HeaderProps {
  currentTab: 'billing' | 'history' | 'catalog' | 'stock' | 'crm' | 'map' | 'distributor' | 'workspace' | 'settings';
  setCurrentTab: (tab: 'billing' | 'history' | 'catalog' | 'stock' | 'crm' | 'map' | 'distributor' | 'workspace' | 'settings') => void;
  lang: Language;
  setLang: (lang: Language) => void;
  onQuickNewBill: () => void;
  config?: ShopConfig;
  userSession: AppUserSession;
  onOpenRoleLogin: () => void;
  onSelectRole?: (role: UserRole) => void;
  onOpenPlayStore?: () => void;
  onOpenDailySummary?: () => void;
  onOpenMultiSystem?: () => void;
  onOpenPrinterManager?: () => void;
  onOpenCloudBackup?: () => void;
  onOpenQrHub?: () => void;
  onOpenAutoMarketing?: () => void;
  onOpenStaffManager?: () => void;
  onOpenRunFileManager?: () => void;
  onLogout?: () => void;
  dailyFbDue?: boolean;
  dailyFbEnabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  onQuickNewBill,
  config,
  userSession,
  onOpenRoleLogin,
  onSelectRole,
  onOpenPlayStore,
  onOpenDailySummary,
  onOpenMultiSystem,
  onOpenPrinterManager,
  onOpenCloudBackup,
  onOpenQrHub,
  onOpenAutoMarketing,
  onOpenStaffManager,
  onOpenRunFileManager,
  onLogout,
  dailyFbDue,
  dailyFbEnabled
}) => {
  const t = getT(lang);
  const [restrictedNotice, setRestrictedNotice] = useState<{ title: string; desc: string } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);

  const currentDevId = getCurrentDeviceTerminalId();
  const terminals = config?.terminals || [];
  const activeTerminal = terminals.find((t) => t.id === currentDevId) || terminals[0];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="no-print bg-[#4b1d3f] text-white border-b border-[#3b1732] shadow-md sticky top-0 z-40">
      {/* LINE 1: Top Brand, Logo & Action Hub (Row 1) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
        {/* Brand Identity: Logo + DELICIOUS CAKE CORNER + Location */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="relative group shrink-0">
            {config?.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.shopName || 'DELICIOUS CAKE CORNER'}
                referrerPolicy="no-referrer"
                onClick={() => setCurrentTab('billing')}
                title="DELICIOUS CAKE CORNER • Mansuka, Ghatal"
                className="w-13 h-13 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl object-cover border-2 border-amber-300 shadow-md ring-2 ring-amber-400/40 bg-[#2a0e23] hover:scale-105 transition-all cursor-pointer"
              />
            ) : (
              <div
                onClick={() => setCurrentTab('billing')}
                className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center text-amber-300 font-black text-xl sm:text-2xl shadow-inner cursor-pointer"
              >
                DCC
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <button
              onClick={() => setCurrentTab('billing')}
              className="text-base sm:text-2xl md:text-3xl font-black tracking-tight text-white hover:text-amber-200 transition-colors text-left leading-tight drop-shadow-sm flex items-center gap-2"
              title="DELICIOUS CAKE CORNER — Bakery POS"
            >
              <span className="bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 bg-clip-text text-transparent">
                {config?.shopName || 'DELICIOUS CAKE CORNER'}
              </span>
            </button>
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-0.5">
              <span className="text-[10px] sm:text-[11px] text-amber-200 font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                100% Eggless Pure Veg
              </span>
              <a
                href={config?.googleMapsUrl || 'https://www.google.com/maps/place/Misty+Wala/@22.7157,87.7303251,17z/data=!3m1!4b1!4m6!3m5!1s0x39f80f0038f3225f:0xd49fd1f59dea21ff!8m2!3d22.7157!4d87.7329!16s%2Fg%2F11z52vjl02?entry=ttu&g_ep=EgoyMDI2MTAwNy4wIKXMDSoASAFQAw%3D%3D'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/25 hover:bg-black/40 text-amber-300 hover:text-white text-[10px] sm:text-[11px] font-semibold transition-colors border border-amber-400/30 shadow-2xs"
                title="Verified Location: Mansuka, Ghatal"
              >
                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                <span>Mansuka • Ghatal</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-80" />
              </a>
              <a
                href={config?.facebookPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1877F2]/80 hover:bg-[#1877F2] text-white text-[10px] sm:text-[11px] font-bold transition-all border border-blue-400/50 shadow-2xs hover:scale-105"
                title="Direct to Facebook Page: https://www.facebook.com/share/1EEg9yAa9A/"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white text-[#1877F2] font-black text-[9px] flex items-center justify-center leading-none">f</span>
                <span>Facebook</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-90" />
              </a>
              {/* Multi-System Active Station Pill in Header */}
              {onOpenMultiSystem && (
                <button
                  type="button"
                  onClick={onOpenMultiSystem}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-amber-200 text-[10px] font-mono font-bold transition-colors border border-white/15"
                  title="Switch or manage multiple systems & terminals"
                >
                  <Laptop className="w-2.5 h-2.5 text-amber-300" />
                  <span>{activeTerminal?.code || 'S1'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </button>
              )}
              {/* 1-Click Run File (.bat) Button in Header */}
              {onOpenRunFileManager && (
                <button
                  type="button"
                  onClick={onOpenRunFileManager}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 text-amber-950 text-[10px] font-black transition-all shadow-2xs hover:scale-105 cursor-pointer"
                  title="উইন্ডোজ রান ফাইল (.bat) এবং অন্যান্য সিস্টেমে চালু"
                >
                  <Play className="w-2.5 h-2.5 fill-amber-950 text-amber-950" />
                  <span>{lang === 'bn' ? 'রান ফাইল (.bat)' : 'Run File'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Hub: 3-Role Login (Admin, Counter, Distuber), Google Auth, Quick New Bill */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* 3-Role Login Selector (Admin, Counter, Distuber) */}
          <div className="flex items-center bg-black/35 p-1 rounded-2xl border border-white/15 shadow-inner">
            <span className="text-[10px] font-black text-amber-200/80 px-2 hidden xl:inline uppercase tracking-wider">
              {lang === 'bn' ? 'লগইন ৩ রোল:' : 'Login Roles:'}
            </span>

            {/* Role 1: Admin */}
            <button
              type="button"
              onClick={() => (onSelectRole ? onSelectRole('admin') : onOpenRoleLogin())}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-bold rounded-xl transition-all ${
                userSession.role === 'admin'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/70 hover:text-white hover:bg-white/10'
              }`}
              title="Admin Role (অ্যাডমিন) • Full Control over all operations"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-inherit" />
              <span>Admin</span>
              {userSession.role === 'admin' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse hidden sm:inline-block"></span>
              )}
            </button>

            {/* Role 2: Counter */}
            <button
              type="button"
              onClick={() => (onSelectRole ? onSelectRole('counter') : onOpenRoleLogin())}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-bold rounded-xl transition-all ${
                userSession.role === 'counter'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/70 hover:text-white hover:bg-white/10'
              }`}
              title="Counter Role (কাউন্টার) • Assigned Station POS billing & receipts"
            >
              <CreditCard className="w-3.5 h-3.5 text-inherit" />
              <span>Counter {userSession.role === 'counter' && userSession.counterCode ? `(${userSession.counterCode})` : ''}</span>
              {userSession.role === 'counter' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse hidden sm:inline-block"></span>
              )}
            </button>

            {/* Role 3: Distuber / Distributor */}
            <button
              type="button"
              onClick={() => (onSelectRole ? onSelectRole('distributor') : onOpenRoleLogin())}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-bold rounded-xl transition-all ${
                userSession.role === 'distributor'
                  ? 'bg-emerald-500 text-white shadow-md ring-1 ring-emerald-300 font-black'
                  : 'text-emerald-300/80 hover:text-white hover:bg-white/10'
              }`}
              title="Dustbor Role (ডিস্ট্রিবিউটর) • Assigned Route deliveries & cash collection"
            >
              <Truck className="w-3.5 h-3.5 text-inherit" />
              <span>Dustbor {userSession.role === 'distributor' && userSession.distributorCode ? `(${userSession.distributorCode})` : ''}</span>
              {userSession.role === 'distributor' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse hidden sm:inline-block"></span>
              )}
            </button>
          </div>

          {/* Admin Staff Permissions Manager Quick Trigger */}
          {userSession.role === 'admin' && onOpenStaffManager && (
            <button
              type="button"
              onClick={onOpenStaffManager}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black rounded-xl bg-amber-400 hover:bg-amber-300 text-[#4b1d3f] transition-all shadow-md ring-1 ring-amber-300 whitespace-nowrap"
              title="Configure Staff Roles, PINs & Granular Permissions (স্টাফ ও পারমিশন কন্ট্রোল)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'স্টাফ পারমিশন' : 'Staff Permissions'}</span>
              <span className="text-[9px] bg-[#4b1d3f] text-amber-200 px-1 py-0.2 rounded font-black">Admin</span>
            </button>
          )}

          {/* Active User ID & Logout (No Gmail Login) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenRoleLogin}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-amber-100 transition-colors whitespace-nowrap border border-white/10 cursor-pointer"
              title={`Logged in ID: ${userSession.userId || userSession.role} • Click to Login with User ID & Password`}
            >
              <User className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-mono font-black text-amber-200">
                @{userSession.userId || userSession.role}
              </span>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-100 border border-rose-400/35 transition-colors whitespace-nowrap cursor-pointer"
                title={lang === 'bn' ? 'লগআউট / পাসওয়ার্ড স্ক্রিনে যান' : 'Logout to User ID & Password screen'}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-200" />
                <span className="hidden sm:inline">{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
              </button>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 transition-colors whitespace-nowrap"
            title="Switch Language / ভাষা পরিবর্তন"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          {/* New Bill Quick Trigger */}
          <button
            onClick={onQuickNewBill}
            className="flex items-center gap-1 px-3.5 py-1.5 text-xs sm:text-sm font-black text-[#4b1d3f] bg-amber-300 hover:bg-amber-200 rounded-xl shadow-md transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.saveAndNew}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          LINE 1 OF 2: Counter & Sales Menus (লাইন ১: সেলস ও কাউন্টার)
          ========================================================================= */}
      <nav className="bg-[#3b1732] border-t border-white/10 shadow-inner">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1 sm:py-1.5">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-black/25 text-[10px] font-black uppercase tracking-wider text-amber-300/80 border border-white/5 shrink-0">
              <ReceiptText className="w-3 h-3 text-amber-400" />
              <span>Line 1 • Sales</span>
            </div>

            {/* 1. New Bill */}
            <button
              onClick={() => {
                if (!hasPermission(userSession, 'canCreateBill', config)) {
                  setRestrictedNotice({
                    title: lang === 'bn' ? 'নতুন বিল তৈরি' : 'Create New Bill',
                    desc: lang === 'bn' ? 'বিল তৈরি করার জন্য অ্যাডমিনের অনুমতি প্রয়োজন।' : 'Admin permission is required to create new bills.'
                  });
                  return;
                }
                setCurrentTab('billing');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'billing'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>{t.navNewBill}</span>
              {!hasPermission(userSession, 'canCreateBill', config) && <Lock className="w-3 h-3 text-amber-300/80" />}
            </button>

            {/* 2. Bill History */}
            <button
              onClick={() => setCurrentTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'history'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t.navHistory}</span>
            </button>

            {/* 3. Catalog & Cakes */}
            <button
              onClick={() => {
                if (!hasPermission(userSession, 'canEditCatalog', config)) {
                  setRestrictedNotice({
                    title: lang === 'bn' ? 'কেক ক্যাটালগ ও দাম পরিবর্তন' : 'Cake Catalog & Price Management',
                    desc: lang === 'bn'
                      ? 'দোকানের কেকের তালিকা, নতুন আইটেম যুক্ত করা এবং নির্ধারিত দাম পরিবর্তনের অধিকার শুধুমাত্র অ্যাডমিনের। অ্যাডমিন থেকে পারমিশন সক্রিয় করুন।'
                      : 'Admin permission is required to add cakes or edit catalog prices.'
                  });
                  return;
                }
                setCurrentTab('catalog');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'catalog'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>{t.navCatalog}</span>
              {!hasPermission(userSession, 'canEditCatalog', config) && <Lock className="w-3 h-3 text-amber-300/70" />}
            </button>

            {/* 4. Stock & Inventory */}
            <button
              onClick={() => {
                if (!hasPermission(userSession, 'canManageStock', config)) {
                  setRestrictedNotice({
                    title: lang === 'bn' ? 'স্টক ইনভেন্টরি ও মাল এন্ট্রি' : 'Stock & Inventory Management',
                    desc: lang === 'bn'
                      ? 'বেকারির স্টক সমন্বয় বা নতুন মাল এন্ট্রি করার অধিকার সংরক্ষিত।'
                      : 'Admin permission is required to manage stock inventory.'
                  });
                  return;
                }
                setCurrentTab('stock');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'stock'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>{t.navStock}</span>
              {!hasPermission(userSession, 'canManageStock', config) && <Lock className="w-3 h-3 text-amber-300/70" />}
            </button>

            {/* 5. Customer CRM & SMS */}
            <button
              onClick={() => {
                if (!hasPermission(userSession, 'canAccessCRM', config)) {
                  setRestrictedNotice({
                    title: lang === 'bn' ? 'কাস্টমার ডিরেক্টরি ও লয়ালটি' : 'Customer Directory & Loyalty',
                    desc: lang === 'bn'
                      ? 'ক্রেতাদের ডাটাবেস ও লয়ালটি দেখার অধিকার সংরক্ষিত।'
                      : 'Admin permission required to view customer database.'
                  });
                  return;
                }
                setCurrentTab('crm');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'crm'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t.navCrm}</span>
              {!hasPermission(userSession, 'canAccessCRM', config) && <Lock className="w-3 h-3 text-amber-300/70" />}
            </button>
          </div>

          {/* Right side of Line 1: QR Hub & Play Store Mobile App APK */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenQrHub && (
              <button
                type="button"
                onClick={onOpenQrHub}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-400/20 hover:bg-amber-400/35 text-amber-200 border border-amber-300/35 transition-all whitespace-nowrap shadow-2xs"
                title="Bakery QR Studio: App Launch, UPI Standee, Maps & Custom QR"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{lang === 'bn' ? 'কিউআর কোড (QR Hub)' : 'QR Code Hub'}</span>
              </button>
            )}

            {onOpenAutoMarketing && (
              <button
                type="button"
                onClick={() => {
                  if (!hasPermission(userSession, 'canAccessAdsHub', config)) {
                    setRestrictedNotice({
                      title: lang === 'bn' ? 'ফেসবুক ও গুগল অটো প্রচার' : 'Automated Ads & Promo',
                      desc: lang === 'bn'
                        ? 'বিজ্ঞাপন ও সোশ্যাল মিডিয়া পোস্টার তৈরির জন্য অ্যাডমিনের অনুমতি প্রয়োজন।'
                        : 'Admin permission is required to access marketing hub.'
                    });
                    return;
                  }
                  onOpenAutoMarketing();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-500/25 hover:bg-blue-500/40 text-blue-100 border border-blue-400/35 transition-all whitespace-nowrap shadow-2xs"
                title="1-Click & Daily Automated Facebook Marketing Hub"
              >
                <Megaphone className="w-3.5 h-3.5 text-amber-300" />
                <span>{lang === 'bn' ? 'ডেইলি অটো প্রচার' : 'Daily FB Auto'}</span>
                {dailyFbDue ? (
                  <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black tracking-wider animate-pulse">1 DUE</span>
                ) : dailyFbEnabled ? (
                  <span className="text-[9px] bg-emerald-400 text-slate-900 px-1 py-0.2 rounded font-black tracking-wider">AUTO ON</span>
                ) : (
                  <span className="text-[9px] bg-emerald-400 text-slate-900 px-1 py-0.2 rounded font-black tracking-wider">FREE</span>
                )}
                {!hasPermission(userSession, 'canAccessAdsHub', config) && <Lock className="w-3 h-3 text-blue-200" />}
              </button>
            )}

            {/* Live Dual Engine: Online / Offline Mode Status Badge */}
            <button
              type="button"
              onClick={() => setIsOfflineModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all whitespace-nowrap shrink-0 shadow-2xs ${
                isOnline
                  ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-200 border-emerald-400/30'
                  : 'bg-amber-500/30 hover:bg-amber-500/45 text-amber-200 border-amber-400/40 animate-pulse'
              }`}
              title="অফলাইন ও অনলাইন ডুয়াল ইঞ্জিন স্ট্যাটাস দেখতে ক্লিক করুন"
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{lang === 'bn' ? 'অনলাইন' : 'Online'}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                  <span>{lang === 'bn' ? 'অফলাইন মোড' : 'Offline'}</span>
                </>
              )}
            </button>

            {onOpenPlayStore && (
              <button
                onClick={onOpenPlayStore}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all whitespace-nowrap shrink-0"
                title="Google Play Store Package & Mobile App"
              >
                <Store className="w-3.5 h-3.5 text-white" />
                <span>📱 প্লে স্টোর (.aab)</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* =========================================================================
          LINE 2 OF 2: Logistics, Operations, Fleet & Admin (লাইন ২: ডিস্ট্রিবিউটর ও পরিচালনা)
          ========================================================================= */}
      <nav className="bg-[#2a0e23] border-t border-white/10 shadow-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1 sm:py-1.5">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-black/25 text-[10px] font-black uppercase tracking-wider text-emerald-300/80 border border-white/5 shrink-0">
              <Truck className="w-3 h-3 text-emerald-400" />
              <span>Line 2 • Logistics & Ops</span>
            </div>

            {/* 6. Distuber / Delivery */}
            <button
              onClick={() => {
                if (!hasPermission(userSession, 'canAccessDistributor', config)) {
                  setRestrictedNotice({
                    title: lang === 'bn' ? 'ডিস্ট্রিবিউটর ও ডেলিভারি' : 'Distributor Dashboard',
                    desc: lang === 'bn'
                      ? 'ডিস্ট্রিবিউটর চালান ও ক্যাশ রিকনসিলিয়েশন দেখার অনুমতি শুধুমাত্র অ্যাডমিন বা ডেলিভারি পার্টনারদের জন্য।'
                      : 'Admin or Delivery Partner permission required.'
                  });
                  return;
                }
                setCurrentTab('distributor');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'distributor'
                  ? 'bg-emerald-500 text-white shadow-md ring-1 ring-emerald-300 font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-900/40'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ডিস্ট্রিবিউটর (Distuber)' : 'Distuber / Delivery'}</span>
              {!hasPermission(userSession, 'canAccessDistributor', config) && <Lock className="w-3 h-3 text-emerald-300/70" />}
            </button>

            {/* 7. Delivery & Route Map */}
            <button
              onClick={() => {
                if (!hasPermission(userSession, 'canAccessDeliveryMap', config)) {
                  setRestrictedNotice({
                    title: lang === 'bn' ? 'ডেলিভারি ও ম্যাপ' : 'Delivery & Map',
                    desc: lang === 'bn' ? 'ডেলিভারি ড্রপ ম্যাপ দেখার অধিকার সংরক্ষিত।' : 'Delivery map permission required.'
                  });
                  return;
                }
                setCurrentTab('map');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'map'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ডেলিভারি ও ম্যাপ' : 'Delivery & Map'}</span>
              {!hasPermission(userSession, 'canAccessDeliveryMap', config) && <Lock className="w-3 h-3 text-amber-300/70" />}
            </button>

            {/* 8. Daily Sales Report & Audit */}
            {onOpenDailySummary && (
              <button
                onClick={() => {
                  if (!hasPermission(userSession, 'canViewFinancials', config)) {
                    setRestrictedNotice({
                      title: lang === 'bn' ? 'দৈনিক বিক্রয় ও আয় রিপোর্ট' : 'Daily Sales & Revenue Report',
                      desc: lang === 'bn'
                        ? 'দোকানের মোট দৈনিক আয় ও ক্যাশ অডিট রিপোর্ট দেখার অধিকার শুধুমাত্র অ্যাডমিনের। অ্যাডমিন পিন দিয়ে সুইচ করুন।'
                        : 'Admin permission is required to view daily sales & revenue reports.'
                    });
                    return;
                  }
                  onOpenDailySummary();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/30 transition-all whitespace-nowrap shrink-0"
                title="Daily Sales Summary & Closing"
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                <span>{lang === 'bn' ? 'বিক্রয় রিপোর্ট' : 'Daily Sales'}</span>
                {!hasPermission(userSession, 'canViewFinancials', config) && <Lock className="w-3 h-3 text-amber-300/80" />}
              </button>
            )}

            {/* Cloud Backup & Safeguard Button */}
            {onOpenCloudBackup && (
              <button
                onClick={() => {
                  if (!hasPermission(userSession, 'canAccessSettings', config)) {
                    setRestrictedNotice({
                      title: lang === 'bn' ? 'ক্লাউড ব্যাকআপ' : 'Cloud Backup',
                      desc: lang === 'bn' ? 'ডাটাবেস ব্যাকআপ ডাউনলোড করার জন্য অ্যাডমিনের অনুমতি প্রয়োজন।' : 'Admin permission is required.'
                    });
                    return;
                  }
                  onOpenCloudBackup();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 transition-all whitespace-nowrap shrink-0"
                title={lang === 'bn' ? 'ম্যানুয়াল ক্লাউড ব্যাকআপ (JSON)' : 'Manual Cloud Backup (JSON Safeguard)'}
              >
                <Cloud className="w-3.5 h-3.5 text-blue-300" />
                <span>{lang === 'bn' ? 'ক্লাউড ব্যাকআপ' : 'Cloud Backup'}</span>
                {!hasPermission(userSession, 'canAccessSettings', config) && <Lock className="w-3 h-3 text-blue-200" />}
              </button>
            )}

            {/* 9. Multi-System Fleet */}
            {onOpenMultiSystem && (
              <button
                onClick={() => {
                  if (!hasPermission(userSession, 'canAccessSettings', config)) {
                    setRestrictedNotice({
                      title: lang === 'bn' ? 'মাল্টি-সিস্টেম নেটওয়ার্ক' : 'Multi-System Network',
                      desc: lang === 'bn' ? 'মাল্টি-সিস্টেম টার্মিনাল কনফিগার করার জন্য অ্যাডমিনের অনুমতি প্রয়োজন।' : 'Admin permission is required.'
                    });
                    return;
                  }
                  onOpenMultiSystem();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 transition-all whitespace-nowrap shrink-0"
                title="Multiple System & Device Network Setup"
              >
                <Laptop className="w-3.5 h-3.5 text-indigo-300" />
                <span>{lang === 'bn' ? 'মাল্টি-সিস্টেম' : 'Multi-System'}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-400/30 font-mono font-bold text-amber-200">
                  {activeTerminal?.code || 'S1'}
                </span>
                {!hasPermission(userSession, 'canAccessSettings', config) && <Lock className="w-3 h-3 text-indigo-200" />}
              </button>
            )}

            {/* Run File & Multi-Device Launch Button */}
            {onOpenRunFileManager && (
              <button
                type="button"
                onClick={onOpenRunFileManager}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 transition-all whitespace-nowrap shrink-0 shadow-md ring-1 ring-amber-300 cursor-pointer"
                title="উইন্ডোজ রান ফাইল (.bat) ডাউনলোড ও আলাদা সিস্টেমে চালুর সমাধান"
              >
                <Play className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />
                <span>{lang === 'bn' ? '🚀 রান ফাইল (.bat)' : '🚀 Run File (.bat)'}</span>
              </button>
            )}

            {/* 10. Printers & POS Hardware Fleet */}
            {onOpenPrinterManager && (
              <button
                onClick={() => {
                  if (!hasPermission(userSession, 'canAccessSettings', config)) {
                    setRestrictedNotice({
                      title: lang === 'bn' ? 'প্রিন্টার হার্ডওয়্যার' : 'Printers Fleet',
                      desc: lang === 'bn' ? 'প্রিন্টার ও হার্ডওয়্যার সেটিংসের জন্য অ্যাডমিনের অনুমতি প্রয়োজন।' : 'Admin permission is required.'
                    });
                    return;
                  }
                  onOpenPrinterManager();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 transition-all whitespace-nowrap shrink-0"
                title="Printers & POS Hardware Fleet"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-300" />
                <span>{lang === 'bn' ? 'প্রিন্টার্স' : 'Printers'} ({config?.printerDevices?.length || 1})</span>
                {!hasPermission(userSession, 'canAccessSettings', config) && <Lock className="w-3 h-3 text-emerald-300/70" />}
              </button>
            )}

            {/* 11. Drive & Forms */}
            <button
              onClick={() => {
                if (!hasPermission(userSession, 'canAccessSettings', config)) {
                  setRestrictedNotice({
                    title: lang === 'bn' ? 'গুগল ড্রাইভ ও ফর্মস' : 'Google Drive & Forms',
                    desc: lang === 'bn' ? 'ড্রাইভ ডাটা ব্যাকআপের জন্য অ্যাডমিন পারমিশন প্রয়োজন।' : 'Admin permission is required.'
                  });
                  return;
                }
                setCurrentTab('workspace');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'workspace'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ড্রাইভ ও ফর্মস' : 'Drive & Forms'}</span>
              {!hasPermission(userSession, 'canAccessSettings', config) && <Lock className="w-3 h-3 text-amber-300/70" />}
            </button>

            {/* 12. Settings */}
            <button
              onClick={() => {
                if (!hasPermission(userSession, 'canAccessSettings', config)) {
                  setRestrictedNotice({
                    title: lang === 'bn' ? 'শপ সেটিংস ও কনফিগারেশন' : 'Shop Settings',
                    desc: lang === 'bn'
                      ? 'দোকানের মূল সেটিংস, ট্যাক্স, স্টাফ পারমিশন ও ব্যাকআপ পরিবর্তনের অধিকার শুধুমাত্র অ্যাডমিনের। অনুগ্রহ করে অ্যাডমিন হিসেবে লগইন করুন।'
                      : 'Admin permission is required to access shop settings and staff permissions.'
                  });
                  return;
                }
                setCurrentTab('settings');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                currentTab === 'settings'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-md ring-1 ring-amber-300 font-black'
                  : 'text-amber-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>{t.navSettings}</span>
              {!hasPermission(userSession, 'canAccessSettings', config) && <Lock className="w-3 h-3 text-amber-300/70" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Permission Restriction Prompt Modal */}
      {restrictedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl border border-amber-300 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-inner">
                <Lock className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">{restrictedNotice.title}</h4>
                <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  {lang === 'bn' ? '🔒 অ্যাডমিন পারমিশন প্রয়োজন' : '🔒 Admin Permission Required'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {restrictedNotice.desc}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestrictedNotice(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestrictedNotice(null);
                  if (onSelectRole) onSelectRole('admin');
                  else onOpenRoleLogin();
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#4b1d3f] hover:bg-[#38152e] transition-colors flex items-center gap-1.5 shadow-md"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>{lang === 'bn' ? 'অ্যাডমিন হিসেবে সুইচ করুন' : 'Switch as Admin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline & Online Dual Engine Modal */}
      <OfflineStatusModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        isOnline={isOnline}
        lang={lang}
        config={config || ({} as any)}
      />
    </header>
  );
};
