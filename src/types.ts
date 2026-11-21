export type Language = 'bn' | 'en';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Due' | 'Split';

export type OrderType = 'counter' | 'advance_booking' | 'delivery';

export interface BillItem {
  id: string;
  name: string;
  weightOrSize: string; // e.g. "1.0 lb", "2.0 lb", "500g", "1 Pc", "Box"
  qty: number;
  rate: number;
  total: number;
  notes?: string; // e.g. "Eggless", "Dark chocolate drip", "Less sweet"
}

export interface Bill {
  id: string;
  billNo: string;
  sequence: number;
  date: string; // ISO string
  createdAt: number;
  customerName: string;
  customerMobile: string;
  orderType: OrderType;
  deliveryDate?: string;
  deliveryTime?: string;
  cakeMessage?: string; // Message to write on cake e.g. "Happy Birthday Riya"
  items: BillItem[];
  subtotal: number;
  discountType: 'flat' | 'percent';
  discountValue: number;
  discountAmount: number;
  taxPercent: number; // 0% or 5% etc
  taxAmount: number;
  grandTotal: number;
  advancePaid: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  splitCash?: number;
  splitUpi?: number;
  status: 'paid' | 'due' | 'cancelled';
  notes?: string;
  counterId?: string;
  counterName?: string;
  terminalId?: string;
  terminalName?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscountAmount?: number;
  deliveryAddress?: string;
  deliveryStatus?: 'pending' | 'preparing' | 'out_for_delivery' | 'delivered';
  deliveryDistanceKm?: number;
  deliveryBoyName?: string;
  distributorId?: string;
  distributorName?: string;
}

export type UserRole = 'admin' | 'counter' | 'distributor';

export interface RolePermissions {
  canCreateBill: boolean;         // Create and save new bills & POS checkout
  canEditPrices: boolean;         // Override or change cake base prices during billing
  canGiveDiscount: boolean;       // Apply flat/percent discount
  canDeleteBill: boolean;         // Delete bill from history
  canEditBill: boolean;           // Edit past invoices
  canManageStock: boolean;        // Add/adjust stock entries in inventory
  canEditCatalog: boolean;        // Add/edit bakery products & base rates
  canAccessCRM: boolean;          // Access customer VIP directory & loyalty cards
  canAccessDeliveryMap: boolean;  // Access delivery route map & distance calculation
  canAccessDistributor: boolean;  // Access distributor logistics dashboard
  canAccessAdsHub: boolean;       // Access automated marketing & posters/reels
  canViewFinancials: boolean;     // Access daily sales summary & revenue audits
  canAccessSettings: boolean;     // Access store configuration & hardware
  canManageStaff: boolean;        // Manage staff accounts and permissions
}

export interface RolePermissionsConfig {
  admin: RolePermissions;
  counter: RolePermissions;
  distributor: RolePermissions;
}

export interface StaffAccount {
  id: string;
  userId?: string;
  password?: string;
  name: string;
  nameBn?: string;
  role: UserRole;
  pin: string;
  phone?: string;
  counterId?: string;
  distributorId?: string;
  permissions?: Partial<RolePermissions>;
  isActive?: boolean;
  createdAt?: number;
}

export interface AppUserSession {
  role: UserRole;
  userId?: string;
  userName: string;
  userPhone?: string;
  email?: string;
  loginAt: number;
  counterId?: string;
  counterName?: string;
  counterCode?: string;
  distributorId?: string;
  distributorName?: string;
  distributorCode?: string;
  zone?: string;
  staffId?: string;
  customPermissions?: Partial<RolePermissions>;
}

export interface DistributorProfile {
  id: string; // 'dist-1', 'dist-2', etc.
  name: string; // e.g. 'Distributor 1 (Ghatal Central Route)'
  nameBn?: string; // e.g. 'ডিস্ট্রিবিউটর ১ (ঘাটাল সেন্ট্রাল রুট)'
  code: string; // e.g. 'D1'
  driverName?: string; // e.g. 'Ramesh Ghosh'
  driverPhone?: string; // e.g. '9832104567'
  vehicleNumber?: string; // e.g. 'WB-34-AB-1234'
  zone?: string; // e.g. 'Ghatal Town & Gharoighat'
  pin?: string; // default '9999'
  isDefault?: boolean;
}

export interface SystemTerminal {
  id: string; // 'system-1', 'system-2', etc.
  name: string; // 'System 1 (Front Counter)', 'System 2 (Bakery Studio)', etc.
  nameBn?: string;
  code: string; // 'S1', 'S2', etc.
  role: 'counter' | 'kiosk' | 'kitchen' | 'manager' | 'mobile';
  cashierName?: string;
  deviceInfo?: string;
  isCurrent?: boolean;
}

export interface LoyaltyTier {
  id: string; // 'bronze' | 'silver' | 'gold' | 'platinum'
  name: string;
  nameBn: string;
  minSpend: number;
  discountPercent: number;
  color: string;
  badge: string;
  description: string;
  descriptionBn: string;
}

export interface StockEntry {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment'; // 'in' = New Stock / Fresh Baked / Restock, 'out' = Damage / Wastage / Expired, 'adjustment' = Audit correction
  quantity: number;
  unit: string;
  costPerUnit?: number;
  totalCost?: number;
  date: string; // ISO string
  createdAt: number;
  reason?: string;
  supplierOrBaker?: string;
  notes?: string;
  stockAfter?: number;
}

export interface BakeryProduct {
  id: string;
  nameBn: string;
  nameEn: string;
  category: 'Cakes' | 'Premium Cakes' | 'Designer Cakes' | 'Pastries & Desserts' | 'Celebration Accessories';
  defaultRate: number; // base rate per 1 lb or per pc
  unit: 'lb' | 'pc' | 'box';
  image?: string;
  popular?: boolean;
  stockQuantity?: number;
  minStockAlert?: number;
  costPrice?: number;
}

export interface ShopConfig {
  shopName: string;
  tagline: string;
  logoUrl?: string; // Bakery emblem logo URL or data URL
  showLogoOnReceipt?: boolean; // Whether to display logo on printed bills & invoices
  addressLine1: string;
  addressLine2: string;
  district: string;
  pin: string;
  phone: string;
  altPhone?: string;
  upiId: string; // e.g. 7866971421@okaxis or 7866971421@ybl
  qrCodeImage?: string; // Optional real shop QR standee photo / image
  gstin?: string;
  fssai?: string;
  billPrefix: string;
  defaultTaxPercent: number;
  receiptFormat: 'thermal' | 'thermal58' | 'standard' | 'standardA5' | 'kot'; // 80mm, 58mm, A4, A5, or KOT Baker slip
  termsNote: string;
  thankYouMessage?: string;
  thankYouMessageBn?: string;
  signatoryName?: string;
  signatureImage?: string;
  counters?: Counter[];
  activeCounterId?: string;
  distributors?: DistributorProfile[];
  activeDistributorId?: string;
  terminals?: SystemTerminal[];
  activeTerminalId?: string;
  printer?: PrinterConfig;
  printerDevices?: PrinterDevice[];
  activePrinterId?: string;
  loyaltyProgramEnabled?: boolean;
  loyaltyPointsPerHundred?: number; // default: 1 point per ₹100
  loyaltyTiers?: LoyaltyTier[];
  cloudSyncEnabled?: boolean;
  lastCloudSyncTimestamp?: number;
  autoSendSmsOnBill?: boolean; // Whether to automatically send SMS digital receipt & loyalty update on saving bill
  smsLanguage?: 'bn' | 'en' | 'bilingual'; // Preferred language for digital receipt SMS
  includeLoyaltyInSms?: boolean; // Include loyalty points balance and tier update in SMS receipt
  googleMapsUrl?: string; // Direct Google Maps link for the bakery shop
  googleReviewUrl?: string; // Google 5-star customer review link
  facebookPageUrl?: string; // Bakery official Facebook Page URL
  facebookPageId?: string; // Facebook Page ID (e.g. 1EEg9yAa9A)
  facebookPageAccessToken?: string; // Meta Graph API Page Access Token for silent auto-posting
  instagramUrl?: string; // Bakery official Instagram profile URL
  latitude?: number; // Exact store latitude (e.g. 22.7157)
  longitude?: number; // Exact store longitude (e.g. 87.7329)
  adminPin?: string; // Master Admin PIN (default: '1234')
  rolePermissions?: RolePermissionsConfig;
  staffAccounts?: StaffAccount[];
  requirePasswordOnInstall?: boolean; // Prompt User ID & Password when launched as installed PWA/APK
  requirePasswordEveryOpen?: boolean; // Prompt User ID & Password on every launch unless remembered
  dailyFacebookSchedule?: DailyFacebookSchedule;
}

export interface SmsDeliveryLog {
  id: string;
  timestamp: number;
  recipientPhone: string;
  customerName?: string;
  billNo?: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed';
  provider: string;
  messageId?: string;
  type: 'receipt' | 'loyalty' | 'custom';
  error?: string;
}

export type PrinterType = 'system' | 'bluetooth' | 'usb' | 'network' | 'pdf';
export type ThermalWidth = '58mm' | '80mm' | 'a4' | 'a5' | 'kot';
export type ReceiptFormat = 'thermal' | 'thermal58' | 'standard' | 'standardA5' | 'kot';

export interface PrinterDevice {
  id: string;
  name: string;
  brand?: string;
  type: PrinterType;
  paperWidth: ThermalWidth;
  ipAddress?: string;
  port?: number;
  bluetoothDeviceId?: string;
  bluetoothDeviceName?: string;
  usbVendorId?: string;
  usbProductId?: string;
  isDefault?: boolean;
  role?: 'cashier' | 'kitchen' | 'counter' | 'office';
  autoCut?: boolean;
  openCashDrawer?: boolean;
  printCopies?: number;
  status?: 'ready' | 'offline' | 'paired';
  category?: 'pos80' | 'bt58' | 'kot' | 'laser' | 'smart_pos' | 'virtual';
  description?: string;
  modelCode?: string;
}

export interface PrinterConfig {
  type: PrinterType;
  paperWidth: ThermalWidth;
  deviceName?: string;
  ipAddress?: string;
  port?: number;
  autoCut?: boolean;
  openCashDrawer?: boolean;
  printCopies?: number; // 1, 2, or 3
  autoPrintOnSave?: boolean;
  printKitchenTicket?: boolean; // automatically print Kitchen Order Ticket (KOT) for baker
  devices?: PrinterDevice[];
  activePrinterId?: string;
}

export interface CustomerLoyalty {
  customerMobile: string;
  customerName: string;
  totalOrders: number;
  totalSpent: number;
  pointsBalance: number;
  lastVisitDate: string;
  tierId?: string;
  tierName?: string;
  tierBadge?: string;
  suggestedDiscountPercent?: number;
  nextTierName?: string;
  amountNeededForNextTier?: number;
  progressPercent?: number;
  membershipCardNumber?: string;
  membershipSince?: string;
  notes?: string;
  tags?: string[];
  registeredAt?: number;
  updatedAt?: number;
}


export interface DailySalesSummary {
  date: string; // YYYY-MM-DD
  totalRevenue: number;
  totalOrders: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  dueAmount: number;
  totalDiscount: number;
  totalTaxCollected?: number;
  popularItems: {
    name: string;
    qty: number;
    totalRevenue: number;
  }[];
  counterWiseSales: {
    counterName: string;
    ordersCount: number;
    revenue: number;
  }[];
  terminalWiseSales?: {
    terminalId: string;
    terminalName: string;
    terminalCode: string;
    ordersCount: number;
    revenue: number;
  }[];
  averageOrderValue: number;
}

export interface TaxSlabSummary {
  rate: number; // e.g. 0, 5, 12, 18
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  billsCount: number;
}

export interface TaxLiabilityReport {
  startDate: string;
  endDate: string;
  totalGrossSales: number;
  totalTaxableAmount: number;
  totalTaxCollected: number;
  totalCgst: number;
  totalSgst: number;
  effectiveTaxRate: number;
  slabs: TaxSlabSummary[];
  taxableBillsCount: number;
  exemptBillsCount: number;
}

export interface MonthlySalesSummary {
  year: number;
  month: number; // 1-12
  monthName: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  dueAmount: number;
  totalDiscount: number;
  totalTaxCollected: number;
  peakDay: { date: string; revenue: number; ordersCount: number } | null;
  dailyAverageRevenue: number;
  daysInMonth: number;
  dailyTrends: {
    date: string;
    day: number;
    dayName: string;
    revenue: number;
    ordersCount: number;
  }[];
  bestSellingProducts: {
    name: string;
    qty: number;
    totalRevenue: number;
  }[];
}

export interface Counter {
  id: string;
  name: string; // e.g. "Counter 1 (Cakes)", "Counter 2 (Snacks)"
  nameBn?: string; // e.g. "কাউন্টার ১ (কেক ও পেস্ট্রি)"
  code: string; // e.g. "C1", "C2"
  cashierName?: string; // e.g. "Sumona Mondal Kunti"
  isDefault?: boolean;
}

export interface AutoAdCampaign {
  id: string;
  name: string;
  nameBn: string;
  posterType: 'truffle' | 'birthday' | 'redvelvet' | 'butterscotch' | 'video_reel' | 'custom';
  mediaType?: 'image' | 'video';
  posterUrl: string;
  caption: string;
  platform: 'facebook' | 'instagram' | 'both' | 'whatsapp';
  dailyBudget: number;
  durationDays: number;
  targetLocation: string;
  targetAudience: string;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  reachCount: number;
  clicksCount: number;
  whatsappOrdersCount: number;
}

export interface DailyFacebookPostLog {
  id: string;
  date: string; // YYYY-MM-DD (IST)
  timestamp: number;
  dayIndex: number; // 0 (Sunday) - 6 (Saturday)
  posterType: 'truffle' | 'birthday' | 'redvelvet' | 'butterscotch';
  titleBn: string;
  caption: string;
  mode: 'graph_api' | 'manual_composer' | 'auto_prepared' | 'error';
  status: 'published' | 'ready' | 'failed';
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface DailyFacebookSchedule {
  enabled: boolean;
  postTime: string; // 24-hr HH:mm IST e.g. "10:00"
  rotateMode: '7day_rotation';
  autoPublishWithToken: boolean;
  lastPostedDate?: string; // YYYY-MM-DD
  lastPreparedDate?: string; // YYYY-MM-DD
  lastStatus?: 'published' | 'ready' | 'failed';
  lastMessage?: string;
  lastPostUrl?: string;
  customCaptions?: Record<number, string>;
  logs: DailyFacebookPostLog[];
}

