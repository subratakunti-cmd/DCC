import { RolePermissions, RolePermissionsConfig, StaffAccount, AppUserSession, UserRole, ShopConfig } from '../types';

export const DEFAULT_ADMIN_PIN = '1234';

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsConfig = {
  admin: {
    canCreateBill: true,
    canEditPrices: true,
    canGiveDiscount: true,
    canDeleteBill: true,
    canEditBill: true,
    canManageStock: true,
    canEditCatalog: true,
    canAccessCRM: true,
    canAccessDeliveryMap: true,
    canAccessDistributor: true,
    canAccessAdsHub: true,
    canViewFinancials: true,
    canAccessSettings: true,
    canManageStaff: true,
  },
  counter: {
    canCreateBill: true,
    canEditPrices: false, // Protected: Admin approval needed to change price
    canGiveDiscount: true,
    canDeleteBill: false, // Protected: Cannot delete bills without Admin
    canEditBill: false,
    canManageStock: false,
    canEditCatalog: false,
    canAccessCRM: true,
    canAccessDeliveryMap: true,
    canAccessDistributor: false,
    canAccessAdsHub: false,
    canViewFinancials: false, // Protected: Only Admin views daily revenue summary
    canAccessSettings: false,
    canManageStaff: false,
  },
  distributor: {
    canCreateBill: false,
    canEditPrices: false,
    canGiveDiscount: false,
    canDeleteBill: false,
    canEditBill: false,
    canManageStock: false,
    canEditCatalog: false,
    canAccessCRM: false,
    canAccessDeliveryMap: true,
    canAccessDistributor: true,
    canAccessAdsHub: false,
    canViewFinancials: false,
    canAccessSettings: false,
    canManageStaff: false,
  }
};

export const DEFAULT_ADMIN_USER_ID = 'admin';

export const DEFAULT_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: 'staff-admin-subrata',
    userId: 'admin',
    password: '1234',
    name: 'Subrata Kunti (Admin / Owner)',
    nameBn: 'সুব্রত কুন্তী (মালিক / অ্যাডমিন)',
    role: 'admin',
    pin: '1234',
    phone: '7866971421',
    isActive: true,
    createdAt: Date.now() - 30 * 24 * 3600 * 1000
  },
  {
    id: 'staff-counter-sumona',
    userId: 'counter1',
    password: '0000',
    name: 'Sumona Mondal Kunti (Counter 1)',
    nameBn: 'সুমনা মণ্ডল কুন্তী (কাউন্টার ১ ক্যাশিয়ার)',
    role: 'counter',
    pin: '0000',
    counterId: 'counter-1',
    isActive: true,
    createdAt: Date.now() - 25 * 24 * 3600 * 1000
  },
  {
    id: 'staff-dist-ramesh',
    userId: 'delivery1',
    password: '9999',
    name: 'Ramesh Ghosh (Ghatal Route 1)',
    nameBn: 'রমেশ ঘোষ (ঘাটাল রুট ডেলিভারি)',
    role: 'distributor',
    pin: '9999',
    distributorId: 'dist-1',
    isActive: true,
    createdAt: Date.now() - 20 * 24 * 3600 * 1000
  }
];

export interface PermissionDefinition {
  key: keyof RolePermissions;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  category: 'pos' | 'inventory' | 'marketing' | 'system';
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'canCreateBill',
    titleEn: 'Create & Save Bills',
    titleBn: 'নতুন বিল তৈরি ও সংরক্ষণ',
    descriptionEn: 'Allow staff to create sales bills and take payments at POS counter.',
    descriptionBn: 'কাউন্টারে ক্রেতাদের জন্য বিল তৈরি এবং নগদ বা UPI পেমেন্ট গ্রহণ।',
    category: 'pos'
  },
  {
    key: 'canEditPrices',
    titleEn: 'Edit Item Prices at POS',
    titleBn: 'বিল করার সময় পণ্যের দাম পরিবর্তন',
    descriptionEn: 'Allow overriding or modifying default cake rate during billing.',
    descriptionBn: 'বিল করার সময় কেক বা অন্য আইটেমের নির্ধারিত দাম কমানো বা বাড়ানো।',
    category: 'pos'
  },
  {
    key: 'canGiveDiscount',
    titleEn: 'Apply Cash & % Discounts',
    titleBn: 'ডিসকাউন্ট বা ছাড় প্রদান',
    descriptionEn: 'Allow applying flat cash or percentage discounts on invoices.',
    descriptionBn: 'বিলে ক্রেতাকে নগদ বা শতাংশ হারে ডিসকাউন্ট ছাড় দেওয়ার অনুমতি।',
    category: 'pos'
  },
  {
    key: 'canDeleteBill',
    titleEn: 'Delete Saved Bills',
    titleBn: 'সংরক্ষিত বিল মুছে ফেলা',
    descriptionEn: 'High-risk: Allow permanently deleting invoices from billing history.',
    descriptionBn: 'অত্যন্ত ঝুঁকিপূর্ণ: হিস্ট্রি থেকে বিল সম্পূর্ণ মুছে ফেলার অনুমতি।',
    category: 'pos'
  },
  {
    key: 'canEditBill',
    titleEn: 'Edit Previous Invoices',
    titleBn: 'পূর্বের সংরক্ষিত বিল সংশোধন',
    descriptionEn: 'Allow editing items, payment mode, or totals of saved bills.',
    descriptionBn: 'আগে করা কোনো বিল পুনরায় খুলে আইটেম বা পেমেন্ট সংশোধন করার অনুমতি।',
    category: 'pos'
  },
  {
    key: 'canManageStock',
    titleEn: 'Stock Inventory & Inward',
    titleBn: 'স্টক ইনভেন্টরি ও মাল এন্ট্রি',
    descriptionEn: 'Allow adding bakery fresh stock and stock damage adjustments.',
    descriptionBn: 'বেকারিতে তৈরি হওয়া নতুন কেক স্টক যোগ করা বা নষ্ট মাল হিসাব সমন্বয়।',
    category: 'inventory'
  },
  {
    key: 'canEditCatalog',
    titleEn: 'Add / Edit Cake Products',
    titleBn: 'নতুন কেক যোগ ও ক্যাটালগ এডিট',
    descriptionEn: 'Allow adding new cake flavours, photos, and changing base catalog rates.',
    descriptionBn: 'দোকানের ক্যাটালগে নতুন কেক যুক্ত করা বা স্থায়ী দাম পরিবর্তন করা।',
    category: 'inventory'
  },
  {
    key: 'canAccessCRM',
    titleEn: 'Customer Directory & VIP Cards',
    titleBn: 'কাস্টমার তালিকা ও লয়ালটি কার্ড',
    descriptionEn: 'Allow searching customer phone numbers, loyalty points, and VIP cards.',
    descriptionBn: 'ক্রেতাদের ফোন নম্বর, ঠিকানা, লয়ালটি পয়েন্ট ও গোল্ড কার্ড দেখার সুযোগ।',
    category: 'pos'
  },
  {
    key: 'canAccessDeliveryMap',
    titleEn: 'Delivery Map & Route Navigation',
    titleBn: 'ডেলিভারি ম্যাপ ও দূরত্বের হিসাব',
    descriptionEn: 'Allow viewing Ghatal-Mansuka delivery route map and calculating KM fees.',
    descriptionBn: 'ঘাটাল ও মনসুকা এলাকার ডেলিভারি ড্রপ ম্যাপ দেখা এবং চার্জ হিসাব।',
    category: 'pos'
  },
  {
    key: 'canAccessDistributor',
    titleEn: 'Distributor Logistics Dashboard',
    titleBn: 'ডিস্ট্রিবিউটর ও ডেলিভারি ড্যাশবোর্ড',
    descriptionEn: 'Allow access to delivery partner vehicle tracking and cash reconciliation.',
    descriptionBn: 'ডেলিভারি বয়দের চালান, রুট ডেলিভারি ও টাকা কালেকশন হিসাব পরিচালনা।',
    category: 'pos'
  },
  {
    key: 'canAccessAdsHub',
    titleEn: 'Facebook & Google Automated Ads',
    titleBn: 'ফেসবুক ও গুগল ফ্রি অটো প্রচার হাব',
    descriptionEn: 'Allow generating custom cake posters, reels, and running 1-click ads.',
    descriptionBn: 'বিজ্ঞাপন পোস্টার, রিলস ভিডিও বানানো এবং ফেসবুকে প্রচার করা।',
    category: 'marketing'
  },
  {
    key: 'canViewFinancials',
    titleEn: 'Daily Sales & Revenue Audits',
    titleBn: 'দৈনিক বিক্রয় রিপোর্ট ও আয় অডিট',
    descriptionEn: 'High-risk: View daily cash collections, UPI totals, and monthly profit stats.',
    descriptionBn: 'দোকানের মোট দৈনিক আয়, ক্যাশ ও UPI হিসাব এবং বিক্রয় রিপোর্ট দেখা।',
    category: 'system'
  },
  {
    key: 'canAccessSettings',
    titleEn: 'System Settings & Cloud Backup',
    titleBn: 'শপ সেটিংস, প্রিন্টার ও ব্যাকআপ',
    descriptionEn: 'Allow changing shop details, UPI standee, printers, and cloud backup.',
    descriptionBn: 'দোকানের নাম, ঠিকানা, UPI QR কোড, প্রিন্টার সেটআপ ও ডাটাবেস ব্যাকআপ।',
    category: 'system'
  },
  {
    key: 'canManageStaff',
    titleEn: 'Manage Staff & Permissions',
    titleBn: 'স্টাফ অ্যাকাউন্ট ও পারমিশন কন্ট্রোল',
    descriptionEn: 'Admin only: Grant or revoke feature permissions and change PINs.',
    descriptionBn: 'শুধুমাত্র অ্যাডমিন: কোন কর্মী কী কাজ করতে পারবে তা নির্ধারণ করা।',
    category: 'system'
  }
];

/**
 * Checks whether an active user session has permission to perform a specific action.
 * - Admin role ALWAYS returns true (100% unrestricted master key).
 * - Custom permissions on the session or staff account take highest precedence.
 * - Otherwise falls back to role default or stored role config.
 */
export function hasPermission(
  session: AppUserSession | undefined,
  permissionKey: keyof RolePermissions,
  config?: ShopConfig
): boolean {
  if (!session) return false;

  // RULE 1: Admin can do EVERYTHING without restriction
  if (session.role === 'admin') {
    return true;
  }

  // RULE 2: Session-specific custom override
  if (session.customPermissions && session.customPermissions[permissionKey] !== undefined) {
    return Boolean(session.customPermissions[permissionKey]);
  }

  // RULE 3: Staff account specific override
  if (session.staffId && config?.staffAccounts) {
    const staff = config.staffAccounts.find((s) => s.id === session.staffId);
    if (staff?.permissions && staff.permissions[permissionKey] !== undefined) {
      return Boolean(staff.permissions[permissionKey]);
    }
  }

  // RULE 4: Role-level config in ShopConfig
  if (config?.rolePermissions?.[session.role]?.[permissionKey] !== undefined) {
    return Boolean(config.rolePermissions[session.role][permissionKey]);
  }

  // RULE 5: Default fallback
  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[session.role];
  if (roleDefaults && roleDefaults[permissionKey] !== undefined) {
    return Boolean(roleDefaults[permissionKey]);
  }

  return false;
}

export function getRolePermissions(role: UserRole, config?: ShopConfig): RolePermissions {
  if (role === 'admin') {
    return { ...DEFAULT_ROLE_PERMISSIONS.admin };
  }
  const configured = config?.rolePermissions?.[role];
  if (configured) {
    return { ...DEFAULT_ROLE_PERMISSIONS[role], ...configured };
  }
  return { ...DEFAULT_ROLE_PERMISSIONS[role] };
}

export function getEffectivePermissionsForSession(
  session: AppUserSession,
  config?: ShopConfig
): RolePermissions {
  if (session.role === 'admin') {
    return { ...DEFAULT_ROLE_PERMISSIONS.admin };
  }
  const base = getRolePermissions(session.role, config);
  const staff = session.staffId && config?.staffAccounts
    ? config.staffAccounts.find((s) => s.id === session.staffId)
    : null;

  return {
    ...base,
    ...(staff?.permissions || {}),
    ...(session.customPermissions || {})
  };
}

export function getEffectiveStaffUserId(staff: StaffAccount, index = 0): string {
  if (staff.userId && staff.userId.trim()) {
    return staff.userId.trim();
  }
  if (staff.role === 'admin') return index === 0 ? 'admin' : `admin${index + 1}`;
  if (staff.role === 'counter') {
    if (staff.counterId === 'counter-1') return 'counter1';
    if (staff.counterId === 'counter-2') return 'counter2';
    return `counter${index + 1}`;
  }
  if (staff.distributorId === 'dist-1') return 'delivery1';
  if (staff.distributorId === 'dist-2') return 'delivery2';
  return `delivery${index + 1}`;
}

export function getEffectiveStaffPassword(staff: StaffAccount, config?: ShopConfig): string {
  if (staff.password && staff.password.trim()) {
    return staff.password.trim();
  }
  if (staff.pin && staff.pin.trim()) {
    return staff.pin.trim();
  }
  if (staff.role === 'admin') {
    return config?.adminPin || DEFAULT_ADMIN_PIN;
  }
  return staff.role === 'counter' ? '0000' : '9999';
}

export function buildSessionFromStaff(staff: StaffAccount, config?: ShopConfig, index = 0): AppUserSession {
  const userId = getEffectiveStaffUserId(staff, index);
  const counters = config?.counters || [];
  const distributors = config?.distributors || [];

  if (staff.role === 'admin') {
    return {
      role: 'admin',
      userId,
      userName: staff.name,
      userPhone: staff.phone,
      staffId: staff.id,
      loginAt: Date.now()
    };
  }

  if (staff.role === 'counter') {
    const c = counters.find((item) => item.id === staff.counterId) || counters[0];
    return {
      role: 'counter',
      userId,
      userName: staff.name,
      userPhone: staff.phone,
      counterId: c?.id || staff.counterId || 'counter-1',
      counterName: c?.name || 'Counter 1',
      counterCode: c?.code || 'C1',
      staffId: staff.id,
      customPermissions: staff.permissions,
      loginAt: Date.now()
    };
  }

  const d = distributors.find((item) => item.id === staff.distributorId) || distributors[0];
  return {
    role: 'distributor',
    userId,
    userName: staff.name,
    userPhone: staff.phone,
    distributorId: d?.id || staff.distributorId || 'dist-1',
    distributorName: d?.name || 'Ghatal Route',
    distributorCode: d?.code || 'D1',
    zone: d?.zone || 'Ghatal Town',
    staffId: staff.id,
    customPermissions: staff.permissions,
    loginAt: Date.now()
  };
}

export function authenticateByUserIdAndPassword(
  rawUserId: string,
  rawPassword: string,
  config?: ShopConfig
):
  | { ok: true; session: AppUserSession; staff: StaffAccount }
  | { ok: false; errorEn: string; errorBn: string } {
  const cleanId = (rawUserId || '').trim().toLowerCase();
  const cleanPass = (rawPassword || '').trim();

  if (!cleanId) {
    return {
      ok: false,
      errorEn: 'Please enter your User ID.',
      errorBn: 'অনুগ্রহ করে আপনার User ID লিখুন।'
    };
  }

  if (!cleanPass) {
    return {
      ok: false,
      errorEn: 'Please enter your Password.',
      errorBn: 'অনুগ্রহ করে আপনার Password লিখুন।'
    };
  }

  const staffList =
    config?.staffAccounts && config.staffAccounts.length > 0
      ? config.staffAccounts
      : DEFAULT_STAFF_ACCOUNTS;

  const matchedIndex = staffList.findIndex(
    (s, idx) => getEffectiveStaffUserId(s, idx).toLowerCase() === cleanId
  );

  if (matchedIndex === -1) {
    return {
      ok: false,
      errorEn: `User ID "${rawUserId.trim()}" not found.`,
      errorBn: `User ID "${rawUserId.trim()}" খুঁজে পাওয়া যায়নি। সঠিক ID দিন।`
    };
  }

  const staff = staffList[matchedIndex];
  const expectedPass = getEffectiveStaffPassword(staff, config);
  const masterAdminPin = config?.adminPin || DEFAULT_ADMIN_PIN;

  const isPasswordValid =
    cleanPass === expectedPass ||
    cleanPass === staff.pin ||
    (staff.role === 'admin' && cleanPass === masterAdminPin);

  if (!isPasswordValid) {
    return {
      ok: false,
      errorEn: 'Incorrect Password. Please try again.',
      errorBn: 'পাসওয়ার্ড ভুল হয়েছে! অনুগ্রহ করে সঠিক Password দিন।'
    };
  }

  return {
    ok: true,
    staff,
    session: buildSessionFromStaff(staff, config, matchedIndex)
  };
}

export function isInstalledAppMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const displayStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
      window.matchMedia?.('(display-mode: minimal-ui)')?.matches;
    const iosStandalone = (window.navigator as any)?.standalone === true;
    const androidReferrer = typeof document !== 'undefined' && document.referrer.includes('android-app://');
    return Boolean(displayStandalone || iosStandalone || androidReferrer);
  } catch {
    return false;
  }
}
