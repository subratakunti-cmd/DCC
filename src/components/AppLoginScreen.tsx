import React, { useState } from 'react';
import { AppUserSession, Language, ShopConfig } from '../types';
import {
  authenticateByUserIdAndPassword,
  DEFAULT_STAFF_ACCOUNTS,
  getEffectiveStaffUserId
} from '../utils/permissionUtils';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Globe,
  Wifi,
  WifiOff,
  MapPin,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';

interface AppLoginScreenProps {
  config: ShopConfig;
  lang: Language;
  onLangChange: (lang: Language) => void;
  onLoginSuccess: (session: AppUserSession, rememberDevice: boolean) => void;
}

export const AppLoginScreen: React.FC<AppLoginScreenProps> = ({
  config,
  lang,
  onLangChange,
  onLoginSuccess
}) => {
  const [userId, setUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showStaffHelp, setShowStaffHelp] = useState<boolean>(false);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const staffList =
    config.staffAccounts && config.staffAccounts.length > 0
      ? config.staffAccounts
      : DEFAULT_STAFF_ACCOUNTS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const result = authenticateByUserIdAndPassword(userId, password, config);
    if (!result.ok) {
      setErrorMsg(lang === 'bn' ? result.errorBn : result.errorEn);
      return;
    }

    onLoginSuccess(result.session, rememberDevice);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a0e23] via-[#4b1d3f] to-[#1f0919] flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle decorative radial glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-rose-400/10 blur-3xl" />

      {/* Top Status & Language Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between gap-2 relative z-10">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            isOnline
              ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
              : 'bg-amber-500/20 text-amber-200 border-amber-400/35'
          }`}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>
            {isOnline
              ? lang === 'bn'
                ? 'অনলাইন + অফলাইন রেডি'
                : 'Online & Offline Ready'
              : lang === 'bn'
              ? 'অফলাইন মোড (Gmail ছাড়াই চলবে)'
              : 'Offline Mode Ready'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onLangChange(lang === 'bn' ? 'en' : 'bn')}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold border border-white/15 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-4 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl border border-amber-300/40 overflow-hidden">
          {/* Card Brand Header */}
          <div className="bg-gradient-to-r from-[#4b1d3f] via-[#3b1531] to-[#260b1f] p-6 text-center text-white border-b border-amber-400/30">
            <div className="flex justify-center mb-3">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.shopName || 'DELICIOUS CAKE CORNER'}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-300 shadow-lg ring-4 ring-amber-400/20 bg-[#2a0e23]"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center text-amber-300 font-black text-2xl shadow-inner">
                  DCC
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 bg-clip-text text-transparent">
              {config.shopName || 'DELICIOUS CAKE CORNER'}
            </h1>
            <p className="text-[11px] text-amber-200/90 font-semibold mt-1 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" />
              <span>{config.addressLine1 || 'Mansuka, Ghatal'} • POS & Bakery Suite</span>
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/35 text-amber-200 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {lang === 'bn'
                  ? 'ইউজার আইডি ও পাসওয়ার্ড দিয়ে লগইন (Gmail ছাড়াই)'
                  : 'User ID & Password Login (No Gmail Required)'}
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#4b1d3f]" />
                <span>{lang === 'bn' ? 'ইউজার আইডি (User ID)' : 'User ID'}</span>
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setErrorMsg('');
                }}
                placeholder={lang === 'bn' ? 'যেমন: admin বা counter1' : 'e.g. admin or counter1'}
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4b1d3f] font-bold text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#4b1d3f]" />
                <span>{lang === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder={lang === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন' : 'Enter your password'}
                  className="w-full px-4 py-3 pr-11 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4b1d3f] font-bold text-slate-900 tracking-wider placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Keep logged in checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded text-[#4b1d3f] focus:ring-[#4b1d3f] cursor-pointer"
              />
              <span className="font-semibold">
                {lang === 'bn'
                  ? 'এই ডিভাইসে লগইন মনে রাখুন (Logout করলে আবার চাইবে)'
                  : 'Keep me signed in on this device'}
              </span>
            </label>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#4b1d3f] to-[#692657] hover:from-[#3c1632] hover:to-[#561f47] text-white font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span>{lang === 'bn' ? 'সিস্টেমে লগইন করুন' : 'Login to POS'}</span>
            </button>

            {/* Helpful Registered IDs Drawer */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStaffHelp(!showStaffHelp)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-[#4b1d3f] py-1 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {lang === 'bn'
                      ? 'কোন User ID দিয়ে ঢুকবেন? তালিকা দেখুন'
                      : 'View Registered Staff User IDs'}
                  </span>
                </span>
                {showStaffHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showStaffHelp && (
                <div className="mt-2 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-amber-950">
                    {lang === 'bn'
                      ? 'যেকোনো User ID-তে ক্লিক করে বসাতে পারেন (স্টাফ পারমিশন থেকে পাসওয়ার্ড বদলানো যায়):'
                      : 'Tap any User ID to fill it in (passwords can be updated inside Staff Permissions):'}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {staffList.map((staff, idx) => {
                      const uid = getEffectiveStaffUserId(staff, idx);
                      const isSelected = userId.trim().toLowerCase() === uid.toLowerCase();
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => {
                            setUserId(uid);
                            setErrorMsg('');
                          }}
                          className={`px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#4b1d3f] text-white border-[#4b1d3f]'
                              : 'bg-white hover:bg-amber-100 text-slate-800 border-amber-300'
                          }`}
                        >
                          <span className="text-[11px]">
                            {staff.role === 'admin' ? '👑' : staff.role === 'counter' ? '🏢' : '🚚'}
                          </span>
                          <div>
                            <div className="font-mono font-black text-[11px] leading-tight">{uid}</div>
                            <div className={`text-[9px] leading-tight ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                              {staff.role === 'admin' ? 'Admin' : staff.role === 'counter' ? 'Counter' : 'Delivery'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-amber-900/90 pt-1 border-t border-amber-200/80 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? 'প্রথমবার ডিফল্ট পাসওয়ার্ড: Admin = 1234 • Counter = 0000 • Delivery = 9999'
                        : 'First-time defaults: admin / 1234 • counter1 / 0000 • delivery1 / 9999'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-md w-full mx-auto text-center text-[11px] text-amber-200/70 relative z-10">
        <span>{config.shopName || 'DELICIOUS CAKE CORNER'} • {config.phone || '7866971421'}</span>
      </div>
    </div>
  );
};
