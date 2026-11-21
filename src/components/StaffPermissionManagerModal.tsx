import React, { useState } from 'react';
import {
  ShopConfig,
  Language,
  RolePermissions,
  RolePermissionsConfig,
  StaffAccount,
  UserRole,
  AppUserSession
} from '../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_STAFF_ACCOUNTS,
  DEFAULT_ADMIN_PIN,
  PERMISSION_DEFINITIONS,
  PermissionDefinition,
  getEffectiveStaffUserId,
  getEffectiveStaffPassword
} from '../utils/permissionUtils';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  Users,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Eye,
  EyeOff,
  UserCheck,
  AlertTriangle,
  Receipt,
  Boxes,
  Megaphone,
  Sliders,
  Store,
  MapPin
} from 'lucide-react';

interface StaffPermissionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  onConfigUpdate: (newConfig: ShopConfig) => void;
  lang: Language;
  currentSession: AppUserSession;
  onSwitchStaff?: (session: AppUserSession) => void;
}

export const StaffPermissionManagerModal: React.FC<StaffPermissionManagerModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdate,
  lang,
  currentSession,
  onSwitchStaff
}) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'staff' | 'security'>('roles');
  const [selectedRole, setSelectedRole] = useState<'counter' | 'distributor'>('counter');

  // Role permissions state
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsConfig>(
    config.rolePermissions || DEFAULT_ROLE_PERMISSIONS
  );

  // Staff accounts state
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(
    config.staffAccounts && config.staffAccounts.length > 0
      ? config.staffAccounts
      : DEFAULT_STAFF_ACCOUNTS
  );

  // Admin PIN state
  const [adminPin, setAdminPin] = useState<string>(config.adminPin || DEFAULT_ADMIN_PIN);
  const [newAdminPin, setNewAdminPin] = useState<string>('');
  const [confirmAdminPin, setConfirmAdminPin] = useState<string>('');
  const [showAdminPin, setShowAdminPin] = useState<boolean>(false);
  const [adminPinError, setAdminPinError] = useState<string>('');
  const [adminPinSuccess, setAdminPinSuccess] = useState<string>('');

  // Add / Edit staff modal state
  const [isAddingStaff, setIsAddingStaff] = useState<boolean>(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFormUserId, setStaffFormUserId] = useState<string>('');
  const [staffFormName, setStaffFormName] = useState<string>('');
  const [staffFormRole, setStaffFormRole] = useState<UserRole>('counter');
  const [staffFormPin, setStaffFormPin] = useState<string>('0000');
  const [staffFormPhone, setStaffFormPhone] = useState<string>('');
  const [staffFormCounterId, setStaffFormCounterId] = useState<string>('counter-1');
  const [staffFormDistributorId, setStaffFormDistributorId] = useState<string>('dist-1');

  // Notification feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  if (!isOpen) return null;

  const counters = config.counters || [];
  const distributors = config.distributors || [];

  // Toggle a single permission for a role
  const handleToggleRolePermission = (role: 'counter' | 'distributor', key: keyof RolePermissions) => {
    const updated: RolePermissionsConfig = {
      ...rolePermissions,
      [role]: {
        ...rolePermissions[role],
        [key]: !rolePermissions[role][key]
      }
    };
    setRolePermissions(updated);

    const newConfig: ShopConfig = {
      ...config,
      rolePermissions: updated
    };
    onConfigUpdate(newConfig);
    showToast(
      lang === 'bn'
        ? `পারমিশন আপডেট হয়েছে: ${role === 'counter' ? 'কাউন্টার' : 'ডিস্ট্রিবিউটর'}`
        : `Permissions updated for ${role}`
    );
  };

  // Reset role to defaults
  const handleResetRoleDefaults = (role: 'counter' | 'distributor') => {
    const updated: RolePermissionsConfig = {
      ...rolePermissions,
      [role]: { ...DEFAULT_ROLE_PERMISSIONS[role] }
    };
    setRolePermissions(updated);
    const newConfig: ShopConfig = {
      ...config,
      rolePermissions: updated
    };
    onConfigUpdate(newConfig);
    showToast(
      lang === 'bn'
        ? `${role === 'counter' ? 'কাউন্টার' : 'ডিস্ট্রিবিউটর'} এর ডিফল্ট পারমিশন রিস্টোর হয়েছে!`
        : `Reset ${role} to default permissions!`
    );
  };

  // Save new Admin PIN
  const handleUpdateAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPinError('');
    setAdminPinSuccess('');

    if (newAdminPin.trim().length < 4) {
      setAdminPinError(
        lang === 'bn'
          ? 'অ্যাডমিন পিন অন্তত ৪ সংখ্যার হতে হবে!'
          : 'Admin PIN must be at least 4 digits!'
      );
      return;
    }
    if (newAdminPin !== confirmAdminPin) {
      setAdminPinError(
        lang === 'bn'
          ? 'উভয় পিন এক নয়! আবার সঠিকভাবে টাইপ করুন।'
          : 'PINs do not match! Please verify.'
      );
      return;
    }

    const clean = newAdminPin.trim();
    setAdminPin(clean);
    const updatedStaffList = staffAccounts.map((s) =>
      s.id === 'staff-admin-subrata' || (s.role === 'admin' && getEffectiveStaffUserId(s) === 'admin')
        ? { ...s, pin: clean, password: clean }
        : s
    );
    setStaffAccounts(updatedStaffList);
    const newConfig: ShopConfig = {
      ...config,
      adminPin: clean,
      staffAccounts: updatedStaffList
    };
    onConfigUpdate(newConfig);
    setNewAdminPin('');
    setConfirmAdminPin('');
    setAdminPinSuccess(
      lang === 'bn'
        ? 'মাস্টার অ্যাডমিন পাসওয়ার্ড / পিন সফলভাবে পরিবর্তন হয়েছে!'
        : 'Admin Master Password / PIN updated successfully!'
    );
    setTimeout(() => setAdminPinSuccess(''), 3000);
  };

  // Save staff member (Create or Update)
  const handleSaveStaffForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormName.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে কর্মীর নাম লিখুন।' : 'Please enter staff name.');
      return;
    }

    const pinToUse = staffFormPin.trim() || (staffFormRole === 'admin' ? '1234' : staffFormRole === 'counter' ? '0000' : '9999');
    const cleanUserId = (
      staffFormUserId.trim() ||
      staffFormName.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) ||
      `${staffFormRole}${staffAccounts.length + 1}`
    ).toLowerCase();

    const duplicate = staffAccounts.find(
      (s, idx) => s.id !== editingStaffId && getEffectiveStaffUserId(s, idx).toLowerCase() === cleanUserId
    );
    if (duplicate) {
      alert(
        lang === 'bn'
          ? `User ID "${cleanUserId}" ইতিমধ্যে ব্যবহৃত হয়েছে! অন্য একটি ইউনিক ID দিন।`
          : `User ID "${cleanUserId}" is already taken! Please choose a unique User ID.`
      );
      return;
    }

    let updatedList: StaffAccount[];

    if (editingStaffId) {
      // Edit existing
      updatedList = staffAccounts.map((s) => {
        if (s.id === editingStaffId) {
          return {
            ...s,
            userId: cleanUserId,
            password: pinToUse,
            name: staffFormName.trim(),
            role: staffFormRole,
            pin: pinToUse,
            phone: staffFormPhone.trim(),
            counterId: staffFormRole === 'counter' ? staffFormCounterId : undefined,
            distributorId: staffFormRole === 'distributor' ? staffFormDistributorId : undefined
          };
        }
        return s;
      });
      showToast(lang === 'bn' ? 'কর্মী তথ্য ও User ID আপডেট হয়েছে!' : 'Staff & User ID updated successfully!');
    } else {
      // Create new
      const newStaff: StaffAccount = {
        id: `staff-${Date.now()}`,
        userId: cleanUserId,
        password: pinToUse,
        name: staffFormName.trim(),
        role: staffFormRole,
        pin: pinToUse,
        phone: staffFormPhone.trim(),
        counterId: staffFormRole === 'counter' ? staffFormCounterId : undefined,
        distributorId: staffFormRole === 'distributor' ? staffFormDistributorId : undefined,
        isActive: true,
        createdAt: Date.now()
      };
      updatedList = [...staffAccounts, newStaff];
      showToast(lang === 'bn' ? 'নতুন কর্মী ও User ID যুক্ত করা হয়েছে!' : 'New staff member added!');
    }

    setStaffAccounts(updatedList);
    const primaryAdmin = updatedList.find((s) => s.role === 'admin');
    const newConfig: ShopConfig = {
      ...config,
      staffAccounts: updatedList,
      adminPin: primaryAdmin ? getEffectiveStaffPassword(primaryAdmin, config) : config.adminPin
    };
    onConfigUpdate(newConfig);

    // Reset form
    setIsAddingStaff(false);
    setEditingStaffId(null);
    setStaffFormUserId('');
    setStaffFormName('');
    setStaffFormPin('0000');
    setStaffFormPhone('');
  };

  // Open edit modal for a staff
  const handleOpenEditStaff = (staff: StaffAccount) => {
    setEditingStaffId(staff.id);
    setStaffFormUserId(getEffectiveStaffUserId(staff));
    setStaffFormName(staff.name);
    setStaffFormRole(staff.role);
    setStaffFormPin(getEffectiveStaffPassword(staff, config));
    setStaffFormPhone(staff.phone || '');
    setStaffFormCounterId(staff.counterId || counters[0]?.id || 'counter-1');
    setStaffFormDistributorId(staff.distributorId || distributors[0]?.id || 'dist-1');
    setIsAddingStaff(true);
  };

  // Delete staff member
  const handleDeleteStaff = (staffId: string) => {
    if (staffAccounts.length <= 1) {
      alert(lang === 'bn' ? 'কমপক্ষে একজন কর্মী থাকা আবশ্যক।' : 'At least one staff account is required.');
      return;
    }
    const filtered = staffAccounts.filter((s) => s.id !== staffId);
    setStaffAccounts(filtered);
    const newConfig: ShopConfig = {
      ...config,
      staffAccounts: filtered
    };
    onConfigUpdate(newConfig);
    showToast(lang === 'bn' ? 'কর্মী তালিকা থেকে মোছা হয়েছে।' : 'Staff deleted.');
  };

  // 1-Click switch to staff account
  const handleSwitchToStaff = (staff: StaffAccount) => {
    if (!onSwitchStaff) return;

    let session: AppUserSession;
    const uid = getEffectiveStaffUserId(staff);
    if (staff.role === 'admin') {
      session = {
        role: 'admin',
        userId: uid,
        userName: staff.name,
        userPhone: staff.phone,
        staffId: staff.id,
        loginAt: Date.now()
      };
    } else if (staff.role === 'counter') {
      const c = counters.find((item) => item.id === staff.counterId) || counters[0];
      session = {
        role: 'counter',
        userId: uid,
        userName: staff.name,
        userPhone: staff.phone,
        counterId: c?.id,
        counterName: c?.name,
        counterCode: c?.code,
        staffId: staff.id,
        customPermissions: staff.permissions,
        loginAt: Date.now()
      };
    } else {
      const d = distributors.find((item) => item.id === staff.distributorId) || distributors[0];
      session = {
        role: 'distributor',
        userId: uid,
        userName: staff.name,
        userPhone: staff.phone,
        distributorId: d?.id,
        distributorName: d?.name,
        distributorCode: d?.code,
        zone: d?.zone,
        staffId: staff.id,
        customPermissions: staff.permissions,
        loginAt: Date.now()
      };
    }

    onSwitchStaff(session);
    onClose();
  };

  const currentRolePerms = rolePermissions[selectedRole];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4b1d3f] via-[#38152e] to-[#200a19] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {lang === 'bn' ? 'স্টাফ ও পারমিশন কন্ট্রোল' : 'Staff & Permission Control'}
                </h3>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-2.5 py-0.5 rounded-full uppercase">
                  Admin Master
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-1 max-w-xl leading-relaxed">
                {lang === 'bn'
                  ? '👑 অ্যাডমিন সব কাজ করতে পারবেন। বাকি কর্মীরা অ্যাডমিনের দেওয়া পারমিশন অনুযায়ী কাজ করতে পারবেন।'
                  : '👑 Admin has 100% full master access. Staff members can only perform actions explicitly granted by the Admin.'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/15 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'roles'
                  ? 'bg-amber-400 text-[#4b1d3f] font-black shadow-md ring-1 ring-amber-300'
                  : 'text-amber-100/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ভূমিকা অনুযায়ী পারমিশন' : 'Role Permissions'}</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'staff'
                  ? 'bg-amber-400 text-[#4b1d3f] font-black shadow-md ring-1 ring-amber-300'
                  : 'text-amber-100/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? `কর্মী তালিকা (${staffAccounts.length})` : `Staff Accounts (${staffAccounts.length})`}</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-amber-400 text-[#4b1d3f] font-black shadow-md ring-1 ring-amber-300'
                  : 'text-amber-100/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'মাস্টার অ্যাডমিন পিন' : 'Admin Master PIN'}</span>
              <span className="text-[9px] bg-amber-300/30 text-amber-200 px-1.5 py-0.2 rounded font-mono font-bold">
                {adminPin}
              </span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-in fade-in flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* =========================================================================
              TAB 1: ROLE PERMISSIONS (Counter & Distributor)
              ========================================================================= */}
          {activeTab === 'roles' && (
            <div className="space-y-5">
              {/* Role Selector Header */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    {lang === 'bn' ? 'পারমিশন কনফিগার করুন:' : 'Configure Permissions For:'}
                  </span>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('counter')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedRole === 'counter'
                          ? 'bg-[#4b1d3f] text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'কাউন্টার / ক্যাশিয়ার' : 'Counter / Cashier'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('distributor')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedRole === 'distributor'
                          ? 'bg-emerald-700 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'ডিস্ট্রিবিউটর / ডেলিভারি' : 'Distributor / Delivery'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleResetRoleDefaults(selectedRole)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'প্রস্তাবিত ডিফল্ট রিস্টোর' : 'Reset Safe Defaults'}</span>
                </button>
              </div>

              {/* Master Access Note */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center shrink-0 shadow-xs">
                  👑
                </div>
                <div className="leading-relaxed">
                  <span className="font-black text-amber-900">
                    {lang === 'bn' ? 'অ্যাডমিন সবসময় সমস্ত কাজ করতে পারবেন' : 'Admin Master Override is always ON'}:
                  </span>{' '}
                  <span className="text-amber-800">
                    {lang === 'bn'
                      ? 'অ্যাডমিন অ্যাকাউন্টের জন্য কোনো পারমিশন সীমাবদ্ধতা নেই। নিচের সুইচগুলি দিয়ে কাউন্টার কর্মী বা ডেলিভারি বয়দের নির্দিষ্ট কাজের অনুমতি নিয়ন্ত্রণ করুন।'
                      : 'Admin account has permanent unrestricted access to all tabs, price changes, invoice deletes, and revenue stats.'}
                  </span>
                </div>
              </div>

              {/* Permission Switches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PERMISSION_DEFINITIONS.filter((def) => def.key !== 'canManageStaff').map((def) => {
                  const isEnabled = Boolean(currentRolePerms[def.key]);
                  const isHighRisk = def.key === 'canDeleteBill' || def.key === 'canViewFinancials' || def.key === 'canEditPrices';

                  return (
                    <div
                      key={def.key}
                      onClick={() => handleToggleRolePermission(selectedRole, def.key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                        isEnabled
                          ? 'bg-white border-amber-300 shadow-xs ring-1 ring-amber-400/20'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300 opacity-80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`}
                          ></span>
                          <h4 className="text-xs font-black text-slate-900">
                            {lang === 'bn' ? def.titleBn : def.titleEn}
                          </h4>
                          {isHighRisk && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              {lang === 'bn' ? 'গুরুত্বপূর্ণ' : 'Restricted'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {lang === 'bn' ? def.descriptionBn : def.descriptionEn}
                        </p>
                      </div>

                      {/* iOS-style toggle */}
                      <div className="shrink-0 pt-0.5">
                        <div
                          className={`w-11 h-6 flex items-center rounded-full p-1 duration-200 ease-in-out transition-colors ${
                            isEnabled ? 'bg-[#4b1d3f]' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${
                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: STAFF ACCOUNTS & PINS
              ========================================================================= */}
          {activeTab === 'staff' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    {lang === 'bn' ? 'কর্মীদের তালিকা ও সিকিউরিটি পিন' : 'Registered Staff Members'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn'
                      ? 'অ্যাডমিন প্রতিটি কর্মীর নাম, রোল, কাউন্টার এবং নিজস্ব পিন কোড সেট করতে পারবেন।'
                      : 'Manage staff names, station assignments, and 4-digit security PINs.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingStaffId(null);
                    setStaffFormUserId('');
                    setStaffFormName('');
                    setStaffFormRole('counter');
                    setStaffFormPin('0000');
                    setStaffFormPhone('');
                    setIsAddingStaff(true);
                  }}
                  className="px-3.5 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-300" />
                  <span>{lang === 'bn' ? 'নতুন কর্মী যোগ করুন' : 'Add New Staff'}</span>
                </button>
              </div>

              {/* Staff Cards List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {staffAccounts.map((staff, idx) => {
                  const isCurrent = currentSession.staffId === staff.id || (currentSession.role === staff.role && currentSession.userName === staff.name);
                  const staffUid = getEffectiveStaffUserId(staff, idx);
                  const staffPass = getEffectiveStaffPassword(staff, config);

                  return (
                    <div
                      key={staff.id}
                      className={`p-4 rounded-2xl bg-white border transition-all relative flex flex-col justify-between ${
                        isCurrent
                          ? 'border-emerald-500 shadow-md ring-2 ring-emerald-400/20'
                          : 'border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase shadow-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          <span>{lang === 'bn' ? 'চলতি সক্রিয়' : 'Active Now'}</span>
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                              staff.role === 'admin'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : staff.role === 'counter'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {staff.role === 'admin' && '👑 Admin (Owner)'}
                            {staff.role === 'counter' && '🏢 Counter Staff'}
                            {staff.role === 'distributor' && '🚚 Delivery Partner'}
                          </span>

                          <span className="text-[11px] font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Pass: {staffPass}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-[#4b1d3f] bg-amber-100/80 px-2 py-0.5 rounded mb-1 border border-amber-200">
                          <span>ID: {staffUid}</span>
                        </div>

                        <h4 className="font-black text-slate-900 text-sm">{staff.name}</h4>
                        {staff.nameBn && (
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{staff.nameBn}</p>
                        )}

                        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                          {staff.counterId && (
                            <div className="flex items-center gap-1 text-slate-700">
                              <Store className="w-3 h-3 text-amber-600" />
                              <span>Station: <b>{staff.counterId}</b></span>
                            </div>
                          )}
                          {staff.distributorId && (
                            <div className="flex items-center gap-1 text-slate-700">
                              <Truck className="w-3 h-3 text-emerald-700" />
                              <span>Route: <b>{staff.distributorId}</b></span>
                            </div>
                          )}
                          {staff.phone && (
                            <div className="text-slate-500">
                              Phone: <b>{staff.phone}</b>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => handleSwitchToStaff(staff)}
                          className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1"
                          title="Instant 1-Click Login as this user"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>{lang === 'bn' ? 'সুইচ করুন' : 'Login'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(staff)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Staff"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {staff.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add/Edit Staff Modal Drawer */}
              {isAddingStaff && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-300 shadow-sm animate-in fade-in space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-700" />
                      <span>{editingStaffId ? (lang === 'bn' ? 'কর্মী তথ্য সম্পাদনা' : 'Edit Staff Account') : (lang === 'bn' ? 'নতুন কর্মী যুক্ত করুন' : 'Add New Staff Account')}</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsAddingStaff(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                  </div>

                  <form onSubmit={handleSaveStaffForm} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {lang === 'bn' ? 'ইউজার আইডি (User ID):' : 'User ID:'}
                        </label>
                        <input
                          type="text"
                          required
                          value={staffFormUserId}
                          onChange={(e) => setStaffFormUserId(e.target.value.replace(/\s+/g, ''))}
                          placeholder="e.g. counter2"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-mono font-bold focus:ring-2 focus:ring-[#4b1d3f]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {lang === 'bn' ? 'কর্মীর নাম:' : 'Staff Name:'}
                        </label>
                        <input
                          type="text"
                          required
                          value={staffFormName}
                          onChange={(e) => setStaffFormName(e.target.value)}
                          placeholder="e.g. Sumona Mondal"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#4b1d3f]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {lang === 'bn' ? 'রোল / ভূমিকা:' : 'Role:'}
                        </label>
                        <select
                          value={staffFormRole}
                          onChange={(e) => setStaffFormRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#4b1d3f]"
                        >
                          <option value="counter">{lang === 'bn' ? 'কাউন্টার ক্যাশিয়ার' : 'Counter Cashier'}</option>
                          <option value="distributor">{lang === 'bn' ? 'ডিস্ট্রিবিউটর / ডেলিভারি' : 'Distributor / Delivery'}</option>
                          <option value="admin">{lang === 'bn' ? 'সহ-অ্যাডমিন / ম্যানেজার' : 'Co-Admin / Manager'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {lang === 'bn' ? 'পাসওয়ার্ড / পিন:' : 'Password / PIN:'}
                        </label>
                        <input
                          type="text"
                          maxLength={24}
                          value={staffFormPin}
                          onChange={(e) => setStaffFormPin(e.target.value)}
                          placeholder="0000"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-mono text-center font-bold tracking-wider focus:ring-2 focus:ring-[#4b1d3f]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {lang === 'bn' ? 'ফোন নম্বর (ঐচ্ছিক):' : 'Phone Number (Optional):'}
                        </label>
                        <input
                          type="tel"
                          value={staffFormPhone}
                          onChange={(e) => setStaffFormPhone(e.target.value)}
                          placeholder="9876543210"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#4b1d3f]"
                        />
                      </div>

                      {staffFormRole === 'counter' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {lang === 'bn' ? 'নির্ধারিত কাউন্টার:' : 'Assigned Counter:'}
                          </label>
                          <select
                            value={staffFormCounterId}
                            onChange={(e) => setStaffFormCounterId(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#4b1d3f]"
                          >
                            {counters.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code}: {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {staffFormRole === 'distributor' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {lang === 'bn' ? 'নির্ধারিত ডেলিভারি রুট:' : 'Assigned Route:'}
                          </label>
                          <select
                            value={staffFormDistributorId}
                            onChange={(e) => setStaffFormDistributorId(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#4b1d3f]"
                          >
                            {distributors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.code}: {d.name} ({d.zone || 'Ghatal'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingStaff(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors"
                      >
                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#4b1d3f] hover:bg-[#38152e] shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-amber-300" />
                        <span>{lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Staff'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 3: ADMIN MASTER PIN & SECURITY
              ========================================================================= */}
          {activeTab === 'security' && (
            <div className="max-w-xl mx-auto space-y-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center shadow-xs">
                  <KeyRound className="w-6 h-6 text-amber-700" />
                </div>
                <h4 className="text-base font-black text-slate-900">
                  {lang === 'bn' ? 'মাস্টার অ্যাডমিন পিন (Master PIN)' : 'Admin Master Security PIN'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  {lang === 'bn'
                    ? 'এই পিন দিয়ে শুধুমাত্র অ্যাডমিন যেকোনো ডিভাইস বা কাউন্টার থেকে পূর্ণ অ্যাক্সেস পাবেন।'
                    : 'This master PIN allows the Admin/Owner to unlock all restricted actions across all terminals.'}
                </p>
              </div>

              {/* Current PIN Display */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">
                    {lang === 'bn' ? 'বর্তমান সক্রিয় অ্যাডমিন পিন:' : 'Current Active Admin PIN:'}
                  </span>
                  <span className="font-mono text-xl font-black text-slate-900 tracking-widest mt-0.5 block">
                    {showAdminPin ? adminPin : '••••'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminPin(!showAdminPin)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                  title="Show/Hide PIN"
                >
                  {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Change Admin PIN Form */}
              <form onSubmit={handleUpdateAdminPin} className="space-y-3 pt-2">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {lang === 'bn' ? 'নতুন অ্যাডমিন পিন সেট করুন:' : 'Change Master Admin PIN:'}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {lang === 'bn' ? 'নতুন পিন (৪-৬ সংখ্যা):' : 'New 4-digit PIN:'}
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={newAdminPin}
                      onChange={(e) => setNewAdminPin(e.target.value)}
                      placeholder="e.g. 1234"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-center tracking-widest focus:ring-2 focus:ring-[#4b1d3f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {lang === 'bn' ? 'পিন নিশ্চিত করুন:' : 'Confirm PIN:'}
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={confirmAdminPin}
                      onChange={(e) => setConfirmAdminPin(e.target.value)}
                      placeholder="e.g. 1234"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-center tracking-widest focus:ring-2 focus:ring-[#4b1d3f]"
                    />
                  </div>
                </div>

                {adminPinError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                    {adminPinError}
                  </div>
                )}

                {adminPinSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{adminPinSuccess}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPin(DEFAULT_ADMIN_PIN);
                      const updatedList = staffAccounts.map((s) =>
                        s.id === 'staff-admin-subrata' ? { ...s, pin: DEFAULT_ADMIN_PIN, password: DEFAULT_ADMIN_PIN } : s
                      );
                      setStaffAccounts(updatedList);
                      const newConfig: ShopConfig = {
                        ...config,
                        adminPin: DEFAULT_ADMIN_PIN,
                        staffAccounts: updatedList
                      };
                      onConfigUpdate(newConfig);
                      setAdminPinSuccess(lang === 'bn' ? 'ডিফল্ট পিন (1234) রিস্টোর হয়েছে!' : 'Reset to default PIN 1234!');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
                  >
                    {lang === 'bn' ? 'ডিফল্ট পাসওয়ার্ড (1234) এ ফিরিয়ে নিন' : 'Reset to default (1234)'}
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-amber-300" />
                    <span>{lang === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password'}</span>
                  </button>
                </div>
              </form>

              {/* Installed App & Launch Login Lock Toggles */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {lang === 'bn' ? 'অ্যাপ ইনস্টল লগইন সুরক্ষা (No Gmail):' : 'App Install Login Lock (No Gmail):'}
                </h5>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.requirePasswordOnInstall !== false}
                    onChange={(e) => {
                      onConfigUpdate({
                        ...config,
                        requirePasswordOnInstall: e.target.checked
                      });
                      showToast(lang === 'bn' ? 'ইনস্টল লগইন সেটিংস সেভ হয়েছে!' : 'Install login setting saved!');
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-[#4b1d3f]"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">
                      {lang === 'bn'
                        ? 'অ্যাপ ইনস্টলের পর User ID ও Password দিয়ে লগইন চালু রাখুন'
                        : 'Require User ID & Password when opening installed app'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {lang === 'bn'
                        ? 'মোবাইল বা পিসিতে অ্যাপ ইনস্টল করলে জিমেইল ছাড়াই User ID ও Password স্ক্রিন আসবে।'
                        : 'Installed PWA / APK opens to User ID & Password login instead of Gmail.'}
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.requirePasswordEveryOpen)}
                    onChange={(e) => {
                      onConfigUpdate({
                        ...config,
                        requirePasswordEveryOpen: e.target.checked
                      });
                      showToast(lang === 'bn' ? 'লগইন লক সেটিংস সেভ হয়েছে!' : 'Login lock setting saved!');
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-[#4b1d3f]"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">
                      {lang === 'bn'
                        ? 'ব্রাউজারেও প্রথমবার খুললে User ID ও Password চাইবে'
                        : 'Also require User ID & Password on browser launch'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {lang === 'bn'
                        ? 'সর্বদা লগইন স্ক্রিন চাইলে এটি অন রাখুন (যে কোনো সময় Header থেকে Logout করা যাবে)।'
                        : 'Enable to require User ID & Password in normal browser tabs too.'}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            {lang === 'bn'
              ? 'Delicious Cake Corner • মনসুকা ও ঘাটাল রোল কন্ট্রোল'
              : 'Delicious Cake Corner • Granular Access Control'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
          >
            {lang === 'bn' ? 'সম্পন্ন / বন্ধ করুন' : 'Done & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
