import React, { useState, useEffect } from 'react';
import { UserRole, AppUserSession, Language, ShopConfig, Counter, DistributorProfile, StaffAccount } from '../types';
import { DEFAULT_COUNTERS, DEFAULT_DISTRIBUTORS } from '../data/defaultProducts';
import {
  DEFAULT_ADMIN_PIN,
  DEFAULT_STAFF_ACCOUNTS,
  authenticateByUserIdAndPassword,
  getEffectiveStaffUserId
} from '../utils/permissionUtils';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  Lock,
  Unlock,
  KeyRound,
  User,
  X,
  AlertCircle,
  Sparkles,
  MapPin,
  Check,
  ArrowRight,
  Store,
  Navigation,
  Eye,
  EyeOff,
  Sliders,
  Users,
  RotateCcw,
  Zap,
  Phone
} from 'lucide-react';

interface RoleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: AppUserSession;
  onLogin: (session: AppUserSession) => void;
  lang: Language;
  config: ShopConfig;
  initialRole?: UserRole;
  onOpenStaffManager?: () => void;
}

export const RoleLoginModal: React.FC<RoleLoginModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onLogin,
  lang,
  config,
  initialRole,
  onOpenStaffManager
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || currentSession.role || 'admin');

  // Counters & Distributors
  const counters: Counter[] = config.counters && config.counters.length > 0 ? config.counters : DEFAULT_COUNTERS;
  const distributors: DistributorProfile[] = config.distributors && config.distributors.length > 0 ? config.distributors : DEFAULT_DISTRIBUTORS;
  const staffList: StaffAccount[] = config.staffAccounts && config.staffAccounts.length > 0 ? config.staffAccounts : DEFAULT_STAFF_ACCOUNTS;

  const [selectedCounterId, setSelectedCounterId] = useState<string>(
    currentSession.counterId || config.activeCounterId || counters[0]?.id || 'counter-1'
  );
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>(
    currentSession.distributorId || config.activeDistributorId || distributors[0]?.id || 'dist-1'
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>(currentSession.staffId || '');

  // Form inputs
  const [loginUserId, setLoginUserId] = useState<string>(currentSession.userId || 'admin');
  const [userName, setUserName] = useState<string>(currentSession.userName || '');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const activeRole = initialRole || currentSession.role || 'admin';
      setSelectedRole(activeRole);
      setErrorMsg('');
      setSuccessMsg('');
      setPin('');

      if (activeRole === 'admin') {
        const adminStaff = staffList.find((s) => s.role === 'admin');
        setLoginUserId(adminStaff ? getEffectiveStaffUserId(adminStaff, 0) : 'admin');
        setSelectedStaffId(adminStaff?.id || '');
        setUserName(currentSession.role === 'admin' ? currentSession.userName : (adminStaff?.name || 'Subrata Kunti (Admin / Owner)'));
      } else if (activeRole === 'counter') {
        const cId = currentSession.counterId || counters[0]?.id || 'counter-1';
        setSelectedCounterId(cId);
        const c = counters.find((item) => item.id === cId) || counters[0];
        const counterIdx = staffList.findIndex((s) => s.role === 'counter' && s.counterId === cId);
        const counterStaff = counterIdx >= 0 ? staffList[counterIdx] : staffList.find((s) => s.role === 'counter');
        setLoginUserId(counterStaff ? getEffectiveStaffUserId(counterStaff, Math.max(0, counterIdx)) : 'counter1');
        setSelectedStaffId(counterStaff?.id || '');
        setUserName(currentSession.role === 'counter' && currentSession.userName ? currentSession.userName : (counterStaff?.name || c?.cashierName || 'Sumona Mondal Kunti'));
      } else if (activeRole === 'distributor') {
        const dId = currentSession.distributorId || distributors[0]?.id || 'dist-1';
        setSelectedDistributorId(dId);
        const d = distributors.find((item) => item.id === dId) || distributors[0];
        const distIdx = staffList.findIndex((s) => s.role === 'distributor' && s.distributorId === dId);
        const distStaff = distIdx >= 0 ? staffList[distIdx] : staffList.find((s) => s.role === 'distributor');
        setLoginUserId(distStaff ? getEffectiveStaffUserId(distStaff, Math.max(0, distIdx)) : 'delivery1');
        setSelectedStaffId(distStaff?.id || '');
        setUserName(currentSession.role === 'distributor' && currentSession.userName ? currentSession.userName : (distStaff?.name || d?.driverName || 'Ramesh Ghosh'));
      }
    }
  }, [isOpen, initialRole, currentSession]);

  if (!isOpen) return null;

  const currentCounter = counters.find((c) => c.id === selectedCounterId) || counters[0];
  const currentDistributor = distributors.find((d) => d.id === selectedDistributorId) || distributors[0];

  const handleRoleSelect = (roleId: UserRole) => {
    setSelectedRole(roleId);
    setErrorMsg('');
    setPin('');

    if (roleId === 'admin') {
      const adminIdx = staffList.findIndex((s) => s.role === 'admin');
      const adminStaff = adminIdx >= 0 ? staffList[adminIdx] : undefined;
      setLoginUserId(adminStaff ? getEffectiveStaffUserId(adminStaff, adminIdx) : 'admin');
      setUserName(adminStaff ? adminStaff.name : 'Subrata Kunti (Admin / Owner)');
      setSelectedStaffId(adminStaff?.id || '');
    } else if (roleId === 'counter') {
      const c = counters.find((item) => item.id === selectedCounterId) || counters[0];
      const counterIdx = staffList.findIndex((s) => s.role === 'counter' && s.counterId === selectedCounterId);
      const counterStaff = counterIdx >= 0 ? staffList[counterIdx] : staffList.find((s) => s.role === 'counter');
      setLoginUserId(counterStaff ? getEffectiveStaffUserId(counterStaff, Math.max(0, counterIdx)) : 'counter1');
      setUserName(counterStaff ? counterStaff.name : (c?.cashierName || 'Counter Cashier'));
      setSelectedStaffId(counterStaff?.id || '');
    } else if (roleId === 'distributor') {
      const d = distributors.find((item) => item.id === selectedDistributorId) || distributors[0];
      const distIdx = staffList.findIndex((s) => s.role === 'distributor' && s.distributorId === selectedDistributorId);
      const distStaff = distIdx >= 0 ? staffList[distIdx] : staffList.find((s) => s.role === 'distributor');
      setLoginUserId(distStaff ? getEffectiveStaffUserId(distStaff, Math.max(0, distIdx)) : 'delivery1');
      setUserName(distStaff ? distStaff.name : (d?.driverName || 'Delivery Partner'));
      setSelectedStaffId(distStaff?.id || '');
    }
  };

  const handleCounterSelect = (counterId: string) => {
    setSelectedCounterId(counterId);
    const c = counters.find((item) => item.id === counterId);
    const counterIdx = staffList.findIndex((s) => s.role === 'counter' && s.counterId === counterId);
    const counterStaff = counterIdx >= 0 ? staffList[counterIdx] : undefined;
    if (counterStaff) {
      setLoginUserId(getEffectiveStaffUserId(counterStaff, counterIdx));
      setUserName(counterStaff.name);
      setSelectedStaffId(counterStaff.id);
    } else if (c?.cashierName) {
      setUserName(c.cashierName);
    }
  };

  const handleDistributorSelect = (distId: string) => {
    setSelectedDistributorId(distId);
    const d = distributors.find((item) => item.id === distId);
    const distIdx = staffList.findIndex((s) => s.role === 'distributor' && s.distributorId === distId);
    const distStaff = distIdx >= 0 ? staffList[distIdx] : undefined;
    if (distStaff) {
      setLoginUserId(getEffectiveStaffUserId(distStaff, distIdx));
      setUserName(distStaff.name);
      setSelectedStaffId(distStaff.id);
    } else if (d?.driverName) {
      setUserName(d.driverName);
    }
  };

  const handleStaffSelect = (staff: StaffAccount, idx = 0) => {
    setSelectedStaffId(staff.id);
    setSelectedRole(staff.role);
    setLoginUserId(getEffectiveStaffUserId(staff, idx));
    setUserName(staff.name);
    if (staff.counterId) setSelectedCounterId(staff.counterId);
    if (staff.distributorId) setSelectedDistributorId(staff.distributorId);
    setErrorMsg('');
  };

  const getExpectedPinForRole = (role: UserRole): string => {
    // Check if a staff account is selected
    if (selectedStaffId) {
      const staff = staffList.find((s) => s.id === selectedStaffId);
      if (staff?.pin) return staff.pin;
    }

    if (role === 'admin') {
      return config.adminPin || DEFAULT_ADMIN_PIN;
    }
    if (role === 'counter') {
      const counterStaff = staffList.find((s) => s.role === 'counter' && s.counterId === selectedCounterId);
      return counterStaff?.pin || '0000';
    }
    if (role === 'distributor') {
      const distStaff = staffList.find((s) => s.role === 'distributor' && s.distributorId === selectedDistributorId);
      const d = distributors.find((item) => item.id === selectedDistributorId);
      return distStaff?.pin || d?.pin || '9999';
    }
    return '1234';
  };

  const executeLogin = (role: UserRole, customName?: string, staffId?: string, resolvedUserId?: string) => {
    let session: AppUserSession;
    const finalName = customName || userName;
    const finalUserId =
      resolvedUserId ||
      loginUserId.trim() ||
      (role === 'admin' ? 'admin' : role === 'counter' ? 'counter1' : 'delivery1');

    if (role === 'admin') {
      session = {
        role: 'admin',
        userId: finalUserId,
        userName: finalName.trim() || 'Admin / Owner',
        staffId: staffId || selectedStaffId,
        loginAt: Date.now()
      };
    } else if (role === 'counter') {
      const staff = staffList.find((s) => s.id === (staffId || selectedStaffId));
      session = {
        role: 'counter',
        userId: finalUserId,
        userName: finalName.trim() || currentCounter.cashierName || currentCounter.name,
        counterId: currentCounter.id,
        counterName: currentCounter.name,
        counterCode: currentCounter.code,
        staffId: staffId || selectedStaffId,
        customPermissions: staff?.permissions,
        loginAt: Date.now()
      };
    } else {
      const staff = staffList.find((s) => s.id === (staffId || selectedStaffId));
      session = {
        role: 'distributor',
        userId: finalUserId,
        userName: finalName.trim() || currentDistributor.driverName || currentDistributor.name,
        distributorId: currentDistributor.id,
        distributorName: currentDistributor.name,
        distributorCode: currentDistributor.code,
        zone: currentDistributor.zone,
        staffId: staffId || selectedStaffId,
        customPermissions: staff?.permissions,
        loginAt: Date.now()
      };
    }

    onLogin(session);
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const authRes = authenticateByUserIdAndPassword(loginUserId, pin, config);
    if (!authRes.ok) {
      setErrorMsg(lang === 'bn' ? authRes.errorBn : authRes.errorEn);
      return;
    }

    const session = {
      ...authRes.session,
      userName: userName.trim() || authRes.session.userName
    };
    onLogin(session);
    onClose();
  };

  const defaultPin = getExpectedPinForRole(selectedRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#4b1d3f] via-[#3a1330] to-[#250a1d] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shadow-inner">
              <KeyRound className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'লগইন ও রোল নির্বাচন' : 'User Login & Role Switch'}</span>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Secure POS
                </span>
              </h3>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {lang === 'bn'
                  ? '👑 Admin (সব কাজ করতে পারবেন) • 🏢 Counter (কাউন্টার সেলস) • 🚚 Delivery (রুট ডেলিভারি)'
                  : '👑 Admin (Full master access) • 🏢 Counter (POS billing) • 🚚 Delivery (Route dispatch)'}
              </p>
            </div>
          </div>

          {/* Current Active Status Bar */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-white/80">{lang === 'bn' ? 'বর্তমান সক্রিয় সেশন:' : 'Active Session:'}</span>
              <span className="font-bold text-amber-200 uppercase tracking-wide">
                {currentSession.role === 'admin' && '👑 Admin (Master Access)'}
                {currentSession.role === 'counter' && `🏢 Counter: ${currentSession.counterCode || 'C1'}`}
                {currentSession.role === 'distributor' && `🚚 Distributor: ${currentSession.distributorCode || 'D1'}`}
              </span>
              <span className="text-white/60 text-[11px]">({currentSession.userName})</span>
            </div>

            {currentSession.role === 'admin' && onOpenStaffManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStaffManager();
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400/35 text-amber-200 rounded-lg text-[11px] font-bold border border-amber-300/30 transition-colors"
              >
                <Sliders className="w-3 h-3 text-amber-300" />
                <span>{lang === 'bn' ? 'পারমিশন সেটিংস' : 'Permissions'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/40">
          {/* STEP 1: 3 DISTINCT MAIN ROLE CARDS */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5">
              {lang === 'bn' ? '১. লগইন ভূমিকা বেছে নিন:' : '1. Choose Login Role:'}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Admin */}
              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  selectedRole === 'admin'
                    ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-400/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {currentSession.role === 'admin' && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase shadow-xs">
                    {lang === 'bn' ? 'সক্রিয়' : 'Active'}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#4b1d3f] flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-5 h-5 text-amber-300" />
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-amber-400/25 text-amber-950 border-amber-400/40">
                      {lang === 'bn' ? 'সব কাজ করতে পারবেন' : 'Full Access'}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    {lang === 'bn' ? 'অ্যাডমিন / মালিক' : 'Admin / Owner'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {lang === 'bn'
                      ? 'সমস্ত কাজ — বিলিং, দাম পরিবর্তন, স্টক ইনভেন্টরি, ডিলিট, ও পারমিশন কন্ট্রোল।'
                      : 'All tabs, editing prices, stock audits, deleting invoices & staff permissions.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono font-bold">PIN: {config.adminPin || '1234'}</span>
                  {selectedRole === 'admin' ? (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  ) : (
                    <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'বাছাই' : 'Select'}</span>
                  )}
                </div>
              </button>

              {/* Option 2: Counter */}
              <button
                type="button"
                onClick={() => handleRoleSelect('counter')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  selectedRole === 'counter'
                    ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-400/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {currentSession.role === 'counter' && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase shadow-xs">
                    {lang === 'bn' ? 'সক্রিয়' : 'Active'}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shadow-xs">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300">
                      {lang === 'bn' ? 'কাউন্টার ক্যাশিয়ার' : 'POS Cashier'}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    {lang === 'bn' ? 'কাউন্টার লগইন' : 'Counter Login'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {lang === 'bn'
                      ? 'নির্দিষ্ট কাউন্টারে কেক বিলিং, প্রিন্টিং ও কালেকশন। দাম ও ডিলিট অ্যাডমিনের পারমিশন সাপেক্ষ।'
                      : 'Billing, thermal invoice print. Price edits and deletes restricted by Admin.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono font-bold">PIN: 0000</span>
                  {selectedRole === 'counter' ? (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  ) : (
                    <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'বাছাই' : 'Select'}</span>
                  )}
                </div>
              </button>

              {/* Option 3: Distributor */}
              <button
                type="button"
                onClick={() => handleRoleSelect('distributor')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  selectedRole === 'distributor'
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {currentSession.role === 'distributor' && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase shadow-xs">
                    {lang === 'bn' ? 'সক্রিয়' : 'Active'}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shadow-xs">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-900 border-emerald-300">
                      {lang === 'bn' ? 'ডেলিভারি পার্টনার' : 'Delivery Driver'}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    {lang === 'bn' ? 'ডিস্ট্রিবিউটর (ডেলিভারি)' : 'Distributor Login'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {lang === 'bn'
                      ? 'ঘাটাল ও মনসুকা রুটের ডেলিভারি অর্ডার তালিকা, ঠিকানা ও নগদ কালেকশন।'
                      : 'Delivery dispatch orders, customer address, route map & cash collection.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono font-bold">PIN: 9999</span>
                  {selectedRole === 'distributor' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'বাছাই' : 'Select'}</span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* STEP 2: REGISTERED STAFF QUICK SELECTION */}
          {staffList.length > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{lang === 'bn' ? 'নিবন্ধিত কর্মী থেকে সরাসরি বেছে নিন:' : 'Select Registered Staff Member:'}</span>
                </span>
                {onOpenStaffManager && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStaffManager();
                    }}
                    className="text-[11px] font-bold text-[#4b1d3f] hover:underline"
                  >
                    {lang === 'bn' ? '+ নতুন কর্মী যোগ / পারমিশন' : '+ Add Staff / Permissions'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {staffList.map((staff, idx) => {
                  const isSelected = selectedStaffId === staff.id;
                  const staffUid = getEffectiveStaffUserId(staff, idx);
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => handleStaffSelect(staff, idx)}
                      className={`px-3 py-1.5 rounded-xl border text-left shrink-0 transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#4b1d3f] text-white border-[#4b1d3f] shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="text-xs">
                        {staff.role === 'admin' ? '👑' : staff.role === 'counter' ? '🏢' : '🚚'}
                      </span>
                      <div className="leading-tight">
                        <span className="text-xs font-bold block">{staff.name}</span>
                        <span className={`text-[10px] font-mono block ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                          ID: {staffUid}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: ROLE DETAILS (Station or Route) */}
          {selectedRole === 'counter' && (
            <div className="space-y-2.5 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-600" />
                <span>{lang === 'bn' ? 'নির্দিষ্ট কাউন্টার বেছে নিন:' : 'Assigned Counter:'}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {counters.map((cnt) => {
                  const isSelected = selectedCounterId === cnt.id;
                  return (
                    <button
                      key={cnt.id}
                      type="button"
                      onClick={() => handleCounterSelect(cnt.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-2xs ring-1 ring-amber-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          {cnt.code}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="font-black text-slate-900 text-xs mt-1 truncate">
                        {lang === 'bn' ? cnt.nameBn || cnt.name : cnt.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {cnt.cashierName || 'Staff'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedRole === 'distributor' && (
            <div className="space-y-2.5 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-700" />
                <span>{lang === 'bn' ? 'ডিস্ট্রিবিউটর রুট বেছে নিন:' : 'Assigned Route:'}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {distributors.map((dist) => {
                  const isSelected = selectedDistributorId === dist.id;
                  return (
                    <button
                      key={dist.id}
                      type="button"
                      onClick={() => handleDistributorSelect(dist.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-600/10 border-emerald-600 shadow-2xs ring-1 ring-emerald-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {dist.code}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="font-black text-slate-900 text-xs mt-1 truncate">
                        {lang === 'bn' ? dist.nameBn || dist.name : dist.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {dist.driverName || 'Driver'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: USER ID & PASSWORD LOGIN FORM */}
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#4b1d3f]" />
                  <span>{lang === 'bn' ? 'ইউজার আইডি (User ID):' : 'User ID:'}</span>
                </label>
                <input
                  type="text"
                  value={loginUserId}
                  onChange={(e) => {
                    setLoginUserId(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="admin / counter1 / delivery1"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4b1d3f] font-mono font-bold bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#4b1d3f]" />
                  <span>{lang === 'bn' ? 'পাসওয়ার্ড (Password):' : 'Password:'}</span>
                </label>

                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder={lang === 'bn' ? `পাসওয়ার্ড লিখুন (ডিফল্ট: ${defaultPin})` : `Enter password (default: ${defaultPin})`}
                    maxLength={24}
                    className="w-full px-3 py-2 pr-9 text-xs border border-slate-300 rounded-xl font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#4b1d3f] bg-white text-slate-900 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Quick Auto-Fill Password button (Admin convenience) */}
                {currentSession.role === 'admin' && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{lang === 'bn' ? 'ডিফল্ট পাসওয়ার্ড:' : 'Default Password:'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPin(defaultPin);
                        setErrorMsg('');
                      }}
                      className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 font-mono font-bold transition-colors cursor-pointer"
                    >
                      {defaultPin} ({lang === 'bn' ? 'অটো পূরণ' : 'Fill'})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="submit"
                className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 text-white cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-[#4b1d3f] hover:bg-[#38152e]'
                    : selectedRole === 'counter'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>
                  {lang === 'bn'
                    ? `🔐 User ID (${loginUserId || 'user'}) ও Password দিয়ে লগইন করুন`
                    : `🔐 Login with User ID (${loginUserId || 'user'})`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {currentSession.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => executeLogin(selectedRole)}
                  className="w-full sm:w-auto py-3 px-4 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Admin instant role preview switch"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />
                  <span>{lang === 'bn' ? 'অ্যাডমিন ১-ক্লিক সুইচ' : 'Admin Quick Switch'}</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {lang === 'bn'
                ? `User ID ও Password দিয়ে সুরক্ষিত লগইন (Gmail ছাড়াই অফলাইনে চলে)`
                : `Secure User ID & Password Login (Works offline without Gmail)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStaffManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStaffManager();
                }}
                className="font-bold text-[#4b1d3f] hover:underline"
              >
                {lang === 'bn' ? '👥 স্টাফ পারমিশন ম্যানেজার' : '👥 Staff Permissions'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 font-bold px-2 py-0.5 rounded hover:bg-slate-200"
            >
              {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
