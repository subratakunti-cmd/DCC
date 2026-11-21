import { Bill, BakeryProduct, ShopConfig, Language, StockEntry, CustomerLoyalty, DailySalesSummary, TaxLiabilityReport, TaxSlabSummary, MonthlySalesSummary, LoyaltyTier, SystemTerminal, UserRole, AppUserSession, AutoAdCampaign, DailyFacebookSchedule, DailyFacebookPostLog } from '../types';
import { DEFAULT_SHOP_CONFIG, DEFAULT_PRODUCTS, DEFAULT_BAKERY_LOGO, DEFAULT_SYSTEM_TERMINALS, DEFAULT_LOYALTY_TIERS, DEFAULT_PRINTER_DEVICES, DEFAULT_DISTRIBUTORS } from '../data/defaultProducts';
import { getEffectiveStaffUserId, getEffectiveStaffPassword, isInstalledAppMode } from './permissionUtils';
import fbPremiumPoster from '../assets/images/fb_premium_poster_1793516474433.jpg';
import fbBirthdayPoster from '../assets/images/fb_birthday_poster_1793516490115.jpg';
import fbRedVelvetPoster from '../assets/images/fb_redvelvet_poster_1793650189312.jpg';
import fbButterscotchPoster from '../assets/images/fb_butterscotch_poster_1793650203215.jpg';

export const STORAGE_KEYS = {
  BILLS: 'dcc_bills_history_v2',
  BILL_SEQ: 'dcc_bill_seq',
  CONFIG: 'dcc_shop_config',
  PRODUCTS: 'dcc_bakery_products',
  LANG: 'dcc_selected_lang',
  STOCK_ENTRIES: 'dcc_stock_entries_v1',
  CUSTOMERS: 'dcc_crm_customers_v1',
  USER_SESSION: 'dcc_user_session_v1',
  CAMPAIGNS: 'dcc_auto_ad_campaigns_v1',
  FB_DAILY_SCHEDULE: 'dcc_fb_daily_schedule_v1',
  APP_LOGGED_OUT: 'dcc_app_logged_out_v1',
  APP_REMEMBER_LOGIN: 'dcc_app_remember_login_v1'
};

export function getShopConfig(): ShopConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return DEFAULT_SHOP_CONFIG;
    const parsed = JSON.parse(raw);
    const counters =
      parsed.counters && Array.isArray(parsed.counters) && parsed.counters.length > 0
        ? parsed.counters
        : DEFAULT_SHOP_CONFIG.counters || [];
    const activeCounterId = parsed.activeCounterId || counters[0]?.id || 'counter-1';

    const distributors =
      parsed.distributors && Array.isArray(parsed.distributors) && parsed.distributors.length > 0
        ? parsed.distributors
        : DEFAULT_DISTRIBUTORS;
    const activeDistributorId = parsed.activeDistributorId || distributors[0]?.id || 'dist-1';
    
    const terminals =
      parsed.terminals && Array.isArray(parsed.terminals) && parsed.terminals.length > 0
        ? parsed.terminals
        : DEFAULT_SYSTEM_TERMINALS;
    const activeTerminalId = parsed.activeTerminalId || terminals[0]?.id || 'system-1';

    const loyaltyTiers =
      parsed.loyaltyTiers && Array.isArray(parsed.loyaltyTiers) && parsed.loyaltyTiers.length > 0
        ? parsed.loyaltyTiers
        : DEFAULT_LOYALTY_TIERS;
    
    const printerDevices =
      parsed.printerDevices && Array.isArray(parsed.printerDevices) && parsed.printerDevices.length > 0
        ? parsed.printerDevices
        : DEFAULT_PRINTER_DEVICES;
    const activePrinterId = parsed.activePrinterId || printerDevices.find((p: any) => p.isDefault)?.id || printerDevices[0]?.id || 'printer-system';

    const logoUrl =
      !parsed.logoUrl ||
      parsed.logoUrl === '/src/assets/images/delicious_cake_corner_gold_badge.jpg' ||
      parsed.logoUrl === '/src/assets/images/bakery_logo_delight_1791629843932.jpg' ||
      parsed.logoUrl === '/src/assets/images/bakery_gold_badge_1791895503183.jpg' ||
      parsed.logoUrl === '/src/assets/images/delight_cake_logo_1791901865771.jpg' ||
      (typeof parsed.logoUrl === 'string' && parsed.logoUrl.startsWith('/src/assets/images/'))
        ? DEFAULT_BAKERY_LOGO
        : parsed.logoUrl;

    const googleMapsUrl =
      !parsed.googleMapsUrl ||
      parsed.googleMapsUrl === 'https://www.google.com/maps/place/Misty+Wala/@22.7157,87.7303251,17z/data=!3m1!4b1!4m6!3m5!1s0x39f80f0038f3225f:0xd49fd1f59dea21ff!8m2!3d22.7157!4d87.7329'
        ? DEFAULT_SHOP_CONFIG.googleMapsUrl
        : parsed.googleMapsUrl;
    const latitude = parsed.latitude || DEFAULT_SHOP_CONFIG.latitude;
    const longitude = parsed.longitude || DEFAULT_SHOP_CONFIG.longitude;

    const facebookPageUrl =
      !parsed.facebookPageUrl ||
      parsed.facebookPageUrl === 'https://www.facebook.com/deliciouscakecorner'
        ? 'https://www.facebook.com/share/1EEg9yAa9A/'
        : parsed.facebookPageUrl;

    const rawStaffAccounts =
      parsed.staffAccounts && parsed.staffAccounts.length > 0
        ? parsed.staffAccounts
        : DEFAULT_SHOP_CONFIG.staffAccounts || [];

    const staffAccounts = rawStaffAccounts.map((s: any, idx: number) => ({
      ...s,
      userId: getEffectiveStaffUserId(s, idx),
      password: getEffectiveStaffPassword(s, parsed)
    }));

    return {
      ...DEFAULT_SHOP_CONFIG,
      ...parsed,
      logoUrl,
      googleMapsUrl,
      facebookPageUrl,
      latitude,
      longitude,
      counters,
      activeCounterId,
      distributors,
      activeDistributorId,
      terminals,
      activeTerminalId,
      loyaltyTiers,
      printerDevices,
      activePrinterId,
      adminPin: parsed.adminPin || DEFAULT_SHOP_CONFIG.adminPin || '1234',
      rolePermissions: parsed.rolePermissions || DEFAULT_SHOP_CONFIG.rolePermissions,
      staffAccounts,
      requirePasswordOnInstall: parsed.requirePasswordOnInstall !== undefined ? parsed.requirePasswordOnInstall : true,
      requirePasswordEveryOpen: Boolean(parsed.requirePasswordEveryOpen),
      phone: parsed.phone || '7866971421'
    };
  } catch {
    return DEFAULT_SHOP_CONFIG;
  }
}


export function saveShopConfig(config: ShopConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save shop config:', err);
  }
}

export function getCurrentDeviceTerminalId(): string {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTerminal = params.get('terminal') || params.get('system');
      if (urlTerminal) {
        localStorage.setItem('dcc_device_terminal_id', urlTerminal);
        return urlTerminal;
      }
      const preset = (window as any).__DCC_BOOT_PRESET__;
      const saved = localStorage.getItem('dcc_device_terminal_id');
      if (saved) return saved;
      if (preset?.terminal) {
        localStorage.setItem('dcc_device_terminal_id', preset.terminal);
        return preset.terminal;
      }
    }
    const config = getShopConfig();
    return config.activeTerminalId || 'system-1';
  } catch {
    return 'system-1';
  }
}

export function setCurrentDeviceTerminalId(terminalId: string): void {
  try {
    localStorage.setItem('dcc_device_terminal_id', terminalId);
  } catch (err) {
    console.error('Failed to save device terminal id:', err);
  }
}

/**
 * Scans bills to find the highest sequence number used so far in existing bills.
 * Inspects both `b.sequence` and digits inside `b.billNo` (e.g. DCC-00005 -> 5).
 */
export function getHighestExistingBillNumber(billsList?: Bill[]): number {
  let maxNum = 0;
  try {
    const list = billsList && billsList.length > 0 ? billsList : getBills();
    for (const b of list) {
      if (typeof b.sequence === 'number' && !isNaN(b.sequence) && b.sequence > maxNum) {
        maxNum = b.sequence;
      }
      if (b.billNo) {
        // Extract sequence digits from the end of the bill number (e.g. DCC-26C1000001 -> 1, DCC-00005 -> 5)
        const trailingMatch = b.billNo.match(/(\d{4,8})$/);
        if (trailingMatch) {
          const lastNum = parseInt(trailingMatch[1], 10);
          if (!isNaN(lastNum) && lastNum > maxNum) {
            maxNum = lastNum;
          }
        } else {
          const matches = b.billNo.match(/(\d+)/g);
          if (matches && matches.length > 0) {
            const lastNum = parseInt(matches[matches.length - 1], 10);
            if (!isNaN(lastNum) && lastNum > maxNum) {
              maxNum = lastNum;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse bill sequences:', err);
  }
  return maxNum;
}

/**
 * Returns the sequence number to use for the next invoice.
 * Pure read-only function, never mutates localStorage.
 */
export function getCurrentBillSequence(billsList?: Bill[]): number {
  let stored = 1;
  try {
    const val = localStorage.getItem(STORAGE_KEYS.BILL_SEQ);
    if (val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) {
        stored = parsed;
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  const highestExisting = getHighestExistingBillNumber(billsList);
  return Math.max(stored, highestExisting + 1, 1);
}

export function getNextBillSequence(billsList?: Bill[]): number {
  return getCurrentBillSequence(billsList);
}

/**
 * Increments the stored bill sequence by 1 and returns the new value.
 * Call only when an invoice is actually saved or printed.
 */
export function incrementBillSequence(billsList?: Bill[]): number {
  const current = getCurrentBillSequence(billsList);
  const next = current + 1;
  try {
    localStorage.setItem(STORAGE_KEYS.BILL_SEQ, next.toString());
  } catch (err) {
    console.error('Failed to update bill sequence:', err);
  }
  return next;
}

/**
 * Formats bill numbers in standard: DCC-[YEAR LAST 2 DIGITS][COUNTER NAME/CODE][6-DIGIT SEQUENCE]
 * Example: DCC-26C1000001 (DCC- + 26 + C1 + 000001)
 */
export function formatBillNumber(
  seq: number,
  prefix: string = 'DCC-',
  counterIdentifier: string = 'C1',
  date?: string | number | Date
): string {
  const d = date ? new Date(date) : new Date();
  const yearLast2 = String(d.getFullYear()).slice(-2);
  const cleanPrefix = prefix ? (prefix.endsWith('-') ? prefix : `${prefix}-`) : 'DCC-';
  const rawCounter = (counterIdentifier || 'C1').trim();
  const cleanCounter = rawCounter.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'C1';
  const paddedSeq = String(seq).padStart(6, '0');
  return `${cleanPrefix}${yearLast2}${cleanCounter}${paddedSeq}`;
}

export function getBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (!raw) {
      return [];
    }
    const parsed: Bill[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch (err) {
    console.error('Failed to get bills from storage:', err);
    return [];
  }
}

export function saveBill(bill: Bill): void {
  try {
    const existing = getBills();
    const index = existing.findIndex((b) => b.id === bill.id);
    const isNewBill = index < 0;
    if (index >= 0) {
      existing[index] = bill;
    } else {
      existing.unshift(bill);
    }
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(existing));

    // Ensure bill sequence tracker is strictly ahead of this saved bill
    try {
      let billNum = typeof bill.sequence === 'number' && !isNaN(bill.sequence) ? bill.sequence : 0;
      if (bill.billNo) {
        const match = bill.billNo.match(/(\d{4,8})$/);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > billNum) {
            billNum = parsed;
          }
        }
      }
      const currentStored = parseInt(localStorage.getItem(STORAGE_KEYS.BILL_SEQ) || '0', 10);
      if (billNum >= currentStored) {
        localStorage.setItem(STORAGE_KEYS.BILL_SEQ, (billNum + 1).toString());
      }
    } catch {
      // Ignore sequence sync notice
    }

    // Deduct stock for newly placed bills
    if (isNewBill) {
      deductStockForBill(bill);
    }
  } catch (err) {
    console.error('Failed to save bill:', err);
  }
}

export function deleteBill(id: string): void {
  try {
    const existing = getBills();
    const filtered = existing.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete bill:', err);
  }
}

export function updateBillPayment(id: string, advancePaid: number, dueAmount: number, status: 'paid' | 'due'): void {
  try {
    const bills = getBills();
    const bill = bills.find((b) => b.id === id);
    if (bill) {
      bill.advancePaid = advancePaid;
      bill.dueAmount = dueAmount;
      bill.status = status;
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
    }
  } catch (err) {
    console.error('Failed to update bill payment:', err);
  }
}

export function getProducts(): BakeryProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    let list: BakeryProduct[] = DEFAULT_PRODUCTS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
    // Ensure all products have stock tracking initialized
    return list.map((p, idx) => ({
      ...p,
      stockQuantity: typeof p.stockQuantity === 'number' ? p.stockQuantity : (10 + (idx % 6) * 5),
      minStockAlert: typeof p.minStockAlert === 'number' ? p.minStockAlert : 5,
      costPrice: typeof p.costPrice === 'number' ? p.costPrice : Math.round(p.defaultRate * 0.6)
    }));
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

export function saveProducts(products: BakeryProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products:', err);
  }
}

export function getStockEntries(): StockEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCK_ENTRIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStockEntry(entry: StockEntry): void {
  try {
    const entries = getStockEntries();
    entries.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(entries.slice(0, 500))); // keep latest 500
  } catch (err) {
    console.error('Failed to save stock entry:', err);
  }
}

export function updateProductStock(
  productId: string,
  quantityChange: number,
  reason?: string,
  type: 'in' | 'out' | 'adjustment' = 'in',
  costPerUnit?: number,
  supplierOrBaker?: string
): void {
  const products = getProducts();
  const prod = products.find((p) => p.id === productId);
  if (!prod) return;

  const current = prod.stockQuantity ?? 0;
  const newStock = Math.max(0, current + quantityChange);
  prod.stockQuantity = newStock;
  if (costPerUnit && costPerUnit > 0) {
    prod.costPrice = costPerUnit;
  }
  saveProducts(products);

  const entry: StockEntry = {
    id: `stock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId: prod.id,
    productName: prod.nameEn,
    type,
    quantity: Math.abs(quantityChange),
    unit: prod.unit,
    costPerUnit,
    totalCost: costPerUnit ? Math.abs(quantityChange) * costPerUnit : undefined,
    date: new Date().toISOString(),
    createdAt: Date.now(),
    reason: reason || (quantityChange >= 0 ? 'Stock In / Fresh Batch' : 'Stock Out / Sold / Wastage'),
    supplierOrBaker,
    stockAfter: newStock
  };
  saveStockEntry(entry);
}

export function deductStockForBill(bill: Bill): void {
  const products = getProducts();
  let modified = false;

  bill.items.forEach((item) => {
    const prod = products.find(
      (p) =>
        p.id === item.id ||
        p.nameEn.toLowerCase() === item.name.toLowerCase() ||
        p.nameBn.toLowerCase() === item.name.toLowerCase()
    );
    if (prod) {
      const current = prod.stockQuantity ?? 0;
      const deduct = item.qty || 1;
      prod.stockQuantity = Math.max(0, current - deduct);
      modified = true;

      const entry: StockEntry = {
        id: `bill-deduct-${bill.id}-${item.id}-${Date.now()}`,
        productId: prod.id,
        productName: prod.nameEn,
        type: 'out',
        quantity: deduct,
        unit: prod.unit,
        date: new Date().toISOString(),
        createdAt: Date.now(),
        reason: `Sold in Bill #${bill.billNo} (${bill.customerName || 'Walk-in'})`,
        stockAfter: prod.stockQuantity
      };
      saveStockEntry(entry);
    }
  });

  if (modified) {
    saveProducts(products);
  }
}

export function exportStockReportCsv(products: BakeryProduct[]): void {
  if (!products.length) {
    alert('No products to export!');
    return;
  }
  const headers = [
    'Product ID',
    'Name (English)',
    'Name (Bengali)',
    'Category',
    'Unit',
    'Selling Rate (₹)',
    'Cost Price (₹)',
    'Current Stock',
    'Min Alert Level',
    'Stock Status'
  ];
  const rows = products.map((p) => {
    const stock = p.stockQuantity ?? 0;
    const min = p.minStockAlert ?? 5;
    const status = stock === 0 ? 'Out of Stock' : stock <= min ? 'Low Stock' : 'In Stock';
    return [
      `"${p.id}"`,
      `"${p.nameEn.replace(/"/g, '""')}"`,
      `"${p.nameBn.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.unit,
      p.defaultRate,
      p.costPrice || '',
      stock,
      min,
      status
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Delicious_Cake_Corner_Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getSavedLanguage(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LANG);
    return raw === 'en' ? 'en' : 'bn'; // Default to Bengali as in original prompt
  } catch {
    return 'bn';
  }
}

export function setSavedLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  } catch (err) {
    console.error('Failed to save language preference:', err);
  }
}

export function exportBillsToCsv(bills: Bill[]): void {
  if (!bills.length) {
    alert('No bills to export!');
    return;
  }
  const headers = [
    'Bill No',
    'Date',
    'Customer Name',
    'Mobile',
    'Items Summary',
    'Subtotal',
    'Discount',
    'Grand Total',
    'Advance Paid',
    'Due Amount',
    'Payment Method',
    'Status'
  ];

  const rows = bills.map((b) => {
    const itemsSummary = b.items.map((i) => `${i.name} (${i.weightOrSize}) x${i.qty}`).join('; ');
    return [
      `"${b.billNo}"`,
      `"${new Date(b.createdAt).toLocaleString('en-IN')}"`,
      `"${b.customerName.replace(/"/g, '""')}"`,
      `"${b.customerMobile}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      b.subtotal.toFixed(2),
      b.discountAmount.toFixed(2),
      b.grandTotal.toFixed(2),
      b.advancePaid.toFixed(2),
      b.dueAmount.toFixed(2),
      b.paymentMethod,
      b.status
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Delicious_Cake_Corner_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportAllDataBackup(): void {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    bills: getBills(),
    sequence: getCurrentBillSequence(),
    config: getShopConfig(),
    products: getProducts()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `DCC_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importDataFromJson(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.bills && Array.isArray(data.bills)) {
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(data.bills));
    }
    if (data.sequence) {
      localStorage.setItem(STORAGE_KEYS.BILL_SEQ, data.sequence.toString());
    }
    if (data.config) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.config));
    }
    if (data.products && Array.isArray(data.products)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    }
    return true;
  } catch (err) {
    console.error('Failed to import JSON backup:', err);
    return false;
  }
}

export function getLoyaltyTier(lifetimeSpent: number, tiers: LoyaltyTier[] = DEFAULT_LOYALTY_TIERS): {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  amountNeeded: number;
  progressPercent: number;
} {
  const sorted = [...tiers].sort((a, b) => a.minSpend - b.minSpend);
  let currentTier = sorted[0];
  let nextTier: LoyaltyTier | null = null;

  for (let i = 0; i < sorted.length; i++) {
    if (lifetimeSpent >= sorted[i].minSpend) {
      currentTier = sorted[i];
      nextTier = sorted[i + 1] || null;
    }
  }

  let amountNeeded = 0;
  let progressPercent = 100;
  if (nextTier) {
    amountNeeded = Math.max(0, nextTier.minSpend - lifetimeSpent);
    const range = nextTier.minSpend - currentTier.minSpend;
    const progress = lifetimeSpent - currentTier.minSpend;
    progressPercent = range > 0 ? Math.min(100, Math.max(0, Math.round((progress / range) * 100))) : 100;
  }

  return { currentTier, nextTier, amountNeeded, progressPercent };
}

export function getCustomerLoyalty(customerMobile: string, bills: Bill[], customTiers?: LoyaltyTier[]): CustomerLoyalty | null {
  if (!customerMobile || customerMobile.trim().length < 6) return null;
  const cleanMobile = customerMobile.replace(/\D/g, '');
  const customerBills = bills.filter((b) => b.customerMobile && b.customerMobile.replace(/\D/g, '') === cleanMobile);
  if (customerBills.length === 0) return null;

  const totalSpent = customerBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);
  const totalEarned = customerBills.reduce((acc, b) => acc + (b.loyaltyPointsEarned ?? Math.floor((b.grandTotal || 0) / 100)), 0);
  const totalRedeemed = customerBills.reduce((acc, b) => acc + (b.loyaltyPointsRedeemed || 0), 0);
  const pointsBalance = Math.max(0, totalEarned - totalRedeemed);

  const sortedBills = [...customerBills].sort((a, b) => b.createdAt - a.createdAt);
  const latestBill = sortedBills[0];

  const tierInfo = getLoyaltyTier(totalSpent, customTiers || DEFAULT_LOYALTY_TIERS);

  return {
    customerMobile: cleanMobile,
    customerName: latestBill.customerName || 'Loyal Customer',
    totalOrders: customerBills.length,
    totalSpent,
    pointsBalance,
    lastVisitDate: latestBill.date,
    tierId: tierInfo.currentTier.id,
    tierName: tierInfo.currentTier.name,
    tierBadge: tierInfo.currentTier.badge,
    suggestedDiscountPercent: tierInfo.currentTier.discountPercent,
    nextTierName: tierInfo.nextTier ? tierInfo.nextTier.name : undefined,
    amountNeededForNextTier: tierInfo.amountNeeded,
    progressPercent: tierInfo.progressPercent
  };
}

export function getStoredCustomers(): CustomerLoyalty[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCustomer(customer: CustomerLoyalty): void {
  try {
    const list = getStoredCustomers();
    const cleanMobile = customer.customerMobile.replace(/\D/g, '');
    const index = list.findIndex((c) => c.customerMobile.replace(/\D/g, '') === cleanMobile);
    if (index >= 0) {
      list[index] = { ...list[index], ...customer, customerMobile: cleanMobile, updatedAt: Date.now() };
    } else {
      list.push({ ...customer, customerMobile: cleanMobile, registeredAt: customer.registeredAt || Date.now(), updatedAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save customer to local storage:', err);
  }
}

export function saveAllStoredCustomers(customers: CustomerLoyalty[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.error('Failed to save all customers:', err);
  }
}


export function getDailySalesSummary(bills: Bill[], targetDateStr?: string): DailySalesSummary {
  const targetDate = targetDateStr || new Date().toISOString().slice(0, 10);

  const daysBills = bills.filter((b) => {
    const billDate = (b.date || new Date(b.createdAt).toISOString()).slice(0, 10);
    return billDate === targetDate;
  });

  const totalRevenue = daysBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const cashSales = daysBills
    .filter((b) => b.paymentMethod === 'Cash')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const upiSales = daysBills
    .filter((b) => b.paymentMethod === 'UPI')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const cardSales = daysBills
    .filter((b) => b.paymentMethod === 'Card')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const dueAmount = daysBills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);
  const totalDiscount = daysBills.reduce((sum, b) => sum + (b.discountAmount || 0), 0);
  const totalTaxCollected = daysBills.reduce((sum, b) => sum + (b.taxAmount || 0), 0);

  // Popular items
  const itemMap = new Map<string, { qty: number; revenue: number }>();
  daysBills.forEach((b) => {
    (b.items || []).forEach((item) => {
      const current = itemMap.get(item.name) || { qty: 0, revenue: 0 };
      itemMap.set(item.name, {
        qty: current.qty + item.qty,
        revenue: current.revenue + item.total
      });
    });
  });

  const popularItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({
      name,
      qty: data.qty,
      totalRevenue: data.revenue
    }))
    .sort((a, b) => b.qty - a.qty);

  // Counter-wise sales
  const counterMap = new Map<string, { count: number; revenue: number }>();
  daysBills.forEach((b) => {
    const cName = b.counterName || 'Main Counter';
    const current = counterMap.get(cName) || { count: 0, revenue: 0 };
    counterMap.set(cName, {
      count: current.count + 1,
      revenue: current.revenue + (b.grandTotal || 0)
    });
  });

  const counterWiseSales = Array.from(counterMap.entries()).map(([counterName, data]) => ({
    counterName,
    ordersCount: data.count,
    revenue: data.revenue
  }));

  // Terminal-wise sales (Multiple System Sales)
  const terminalMap = new Map<string, { terminalId: string; terminalCode: string; count: number; revenue: number }>();
  daysBills.forEach((b) => {
    const tName = b.terminalName || b.counterName || 'System 1 (Front Counter)';
    const tId = b.terminalId || 'system-1';
    const current = terminalMap.get(tName) || {
      terminalId: tId,
      terminalCode: tId.replace('system-', 'S').toUpperCase(),
      count: 0,
      revenue: 0
    };
    terminalMap.set(tName, {
      terminalId: tId,
      terminalCode: current.terminalCode,
      count: current.count + 1,
      revenue: current.revenue + (b.grandTotal || 0)
    });
  });

  const terminalWiseSales = Array.from(terminalMap.entries()).map(([terminalName, data]) => ({
    terminalId: data.terminalId,
    terminalName,
    terminalCode: data.terminalCode,
    ordersCount: data.count,
    revenue: data.revenue
  }));

  return {
    date: targetDate,
    totalRevenue,
    totalOrders: daysBills.length,
    cashSales,
    upiSales,
    cardSales,
    dueAmount,
    totalDiscount,
    totalTaxCollected,
    popularItems,
    counterWiseSales,
    terminalWiseSales,
    averageOrderValue: daysBills.length > 0 ? Math.round(totalRevenue / daysBills.length) : 0
  };
}

export function getTaxLiabilityReport(bills: Bill[], startDateStr: string, endDateStr?: string): TaxLiabilityReport {
  const startDate = startDateStr;
  const endDate = endDateStr || startDateStr;

  const inRangeBills = bills.filter((b) => {
    const billDate = (b.date || new Date(b.createdAt).toISOString()).slice(0, 10);
    return billDate >= startDate && billDate <= endDate;
  });

  const totalGrossSales = inRangeBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const totalTaxCollected = inRangeBills.reduce((sum, b) => sum + (b.taxAmount || 0), 0);

  let totalTaxableAmount = 0;
  let taxableBillsCount = 0;
  let exemptBillsCount = 0;

  // Group by tax slab (0%, 5%, 12%, 18%, etc.)
  const slabMap = new Map<number, { taxableAmount: number; totalTax: number; billsCount: number }>();

  inRangeBills.forEach((b) => {
    const rate = b.taxPercent || 0;
    const billDiscounts = (b.discountAmount || 0) + (b.loyaltyDiscountAmount || 0);
    const billTaxable = Math.max(0, b.subtotal - billDiscounts);
    const billTax = b.taxAmount || 0;

    totalTaxableAmount += billTaxable;
    if (billTax > 0) {
      taxableBillsCount++;
    } else {
      exemptBillsCount++;
    }

    const current = slabMap.get(rate) || { taxableAmount: 0, totalTax: 0, billsCount: 0 };
    slabMap.set(rate, {
      taxableAmount: current.taxableAmount + billTaxable,
      totalTax: current.totalTax + billTax,
      billsCount: current.billsCount + 1
    });
  });

  const slabs: TaxSlabSummary[] = Array.from(slabMap.entries())
    .map(([rate, data]) => ({
      rate,
      taxableAmount: data.taxableAmount,
      cgstAmount: data.totalTax / 2,
      sgstAmount: data.totalTax / 2,
      totalTax: data.totalTax,
      billsCount: data.billsCount
    }))
    .sort((a, b) => a.rate - b.rate);

  const totalCgst = totalTaxCollected / 2;
  const totalSgst = totalTaxCollected / 2;
  const effectiveTaxRate = totalTaxableAmount > 0 ? (totalTaxCollected / totalTaxableAmount) * 100 : 0;

  return {
    startDate,
    endDate,
    totalGrossSales,
    totalTaxableAmount,
    totalTaxCollected,
    totalCgst,
    totalSgst,
    effectiveTaxRate: Number(effectiveTaxRate.toFixed(2)),
    slabs,
    taxableBillsCount,
    exemptBillsCount
  };
}

export function getMonthlySalesSummary(bills: Bill[], year: number, month: number): MonthlySalesSummary {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = monthNames[month - 1] || `Month ${month}`;
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Filter bills for the target month
  const monthBills = bills.filter((b) => {
    const billDate = (b.date || new Date(b.createdAt).toISOString()).slice(0, 7);
    return billDate === monthPrefix;
  });

  const totalRevenue = monthBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const totalOrders = monthBills.length;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  
  const cashSales = monthBills
    .filter((b) => b.paymentMethod === 'Cash')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const upiSales = monthBills
    .filter((b) => b.paymentMethod === 'UPI')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const cardSales = monthBills
    .filter((b) => b.paymentMethod === 'Card')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const dueAmount = monthBills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);
  const totalDiscount = monthBills.reduce((sum, b) => sum + ((b.discountAmount || 0) + (b.loyaltyDiscountAmount || 0)), 0);
  const totalTaxCollected = monthBills.reduce((sum, b) => sum + (b.taxAmount || 0), 0);

  // Group bills by day of month
  const dailyBillsMap = new Map<number, Bill[]>();
  for (let d = 1; d <= daysInMonth; d++) {
    dailyBillsMap.set(d, []);
  }

  monthBills.forEach((b) => {
    const billDateStr = (b.date || new Date(b.createdAt).toISOString()).slice(0, 10);
    const dayNum = parseInt(billDateStr.slice(8, 10), 10);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= daysInMonth) {
      dailyBillsMap.get(dayNum)?.push(b);
    }
  });

  let peakDay: { date: string; revenue: number; ordersCount: number } | null = null;
  let maxDayRevenue = -1;

  const dailyTrends = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayDate = new Date(year, month - 1, d);
    const dayName = dayNames[dayDate.getDay()];
    const bList = dailyBillsMap.get(d) || [];
    const dayRev = bList.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const ordersCount = bList.length;

    if (dayRev > maxDayRevenue && ordersCount > 0) {
      maxDayRevenue = dayRev;
      peakDay = {
        date: dStr,
        revenue: dayRev,
        ordersCount
      };
    }

    dailyTrends.push({
      date: dStr,
      day: d,
      dayName,
      revenue: dayRev,
      ordersCount
    });
  }

  const dailyAverageRevenue = Math.round(totalRevenue / daysInMonth);

  // Best selling products for that specific duration
  const itemMap = new Map<string, { qty: number; revenue: number }>();
  monthBills.forEach((b) => {
    (b.items || []).forEach((item) => {
      const current = itemMap.get(item.name) || { qty: 0, revenue: 0 };
      itemMap.set(item.name, {
        qty: current.qty + item.qty,
        revenue: current.revenue + (item.total || 0)
      });
    });
  });

  const bestSellingProducts = Array.from(itemMap.entries())
    .map(([name, data]) => ({
      name,
      qty: data.qty,
      totalRevenue: data.revenue
    }))
    .sort((a, b) => b.qty - a.qty || b.totalRevenue - a.totalRevenue);

  return {
    year,
    month,
    monthName,
    totalRevenue,
    totalOrders,
    averageOrderValue,
    cashSales,
    upiSales,
    cardSales,
    dueAmount,
    totalDiscount,
    totalTaxCollected,
    peakDay,
    dailyAverageRevenue,
    daysInMonth,
    dailyTrends,
    bestSellingProducts
  };
}
export const DEFAULT_USER_SESSION: AppUserSession = {
  role: 'admin',
  userId: 'admin',
  userName: 'Subrata Kunti (Admin / Owner)',
  staffId: 'staff-admin-subrata',
  loginAt: Date.now()
};

export function getUserSession(): AppUserSession {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const preset = (window as any).__DCC_BOOT_PRESET__;
      const urlRole = params.get('role');
      const rawSaved = localStorage.getItem(STORAGE_KEYS.USER_SESSION);

      const effectiveRole = urlRole || (!rawSaved && preset?.role ? preset.role : null);
      if (effectiveRole && (effectiveRole === 'admin' || effectiveRole === 'counter' || effectiveRole === 'distributor')) {
        const config = getShopConfig();
        const urlCounter = params.get('counter') || preset?.counter || config.activeCounterId || 'counter-1';
        const urlDistributor = params.get('distributor') || preset?.distributor || config.activeDistributorId || 'dist-1';
        const urlName = params.get('name') || params.get('user') || preset?.userName;
        const urlStaff = params.get('staff') || params.get('staffId');

        let newSession: AppUserSession;
        if (effectiveRole === 'admin') {
          newSession = {
            role: 'admin',
            userId: 'admin',
            userName: urlName || 'Subrata Kunti (Admin / Owner)',
            staffId: urlStaff || 'staff-admin-subrata',
            loginAt: Date.now()
          };
        } else if (effectiveRole === 'counter') {
          const counter = (config.counters || []).find((c) => c.id === urlCounter) || config.counters?.[0];
          newSession = {
            role: 'counter',
            userId: counter?.id === 'counter-2' ? 'counter2' : 'counter1',
            userName: urlName || counter?.cashierName || 'Counter Cashier',
            counterId: counter?.id || 'counter-1',
            counterName: counter?.name || 'Counter 1',
            counterCode: counter?.code || 'C1',
            staffId: urlStaff || undefined,
            loginAt: Date.now()
          };
        } else {
          const dist = (config.distributors || []).find((d) => d.id === urlDistributor) || config.distributors?.[0];
          newSession = {
            role: 'distributor',
            userId: dist?.id === 'dist-2' ? 'delivery2' : 'delivery1',
            userName: urlName || dist?.driverName || 'Delivery Partner',
            distributorId: dist?.id || 'dist-1',
            distributorName: dist?.name || 'Ghatal Route',
            distributorCode: dist?.code || 'D1',
            zone: dist?.zone || 'Ghatal Town',
            staffId: urlStaff || undefined,
            loginAt: Date.now()
          };
        }
        localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(newSession));
        return newSession;
      }

      if (rawSaved) {
        const parsed = JSON.parse(rawSaved);
        if (parsed && (parsed.role === 'admin' || parsed.role === 'counter' || parsed.role === 'distributor')) {
          return {
            ...parsed,
            userId:
              parsed.userId ||
              (parsed.role === 'admin' ? 'admin' : parsed.role === 'counter' ? 'counter1' : 'delivery1')
          };
        }
      }
    }

    return DEFAULT_USER_SESSION;
  } catch {
    return DEFAULT_USER_SESSION;
  }
}

export function saveUserSession(session: AppUserSession): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Error saving user session:', err);
  }
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  } catch (err) {
    console.error('Error clearing user session:', err);
  }
}

export function shouldRequireAppLoginScreen(config: ShopConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1') return true;
    if (localStorage.getItem(STORAGE_KEYS.APP_LOGGED_OUT) === 'true') return true;

    const isRemembered = localStorage.getItem(STORAGE_KEYS.APP_REMEMBER_LOGIN) === 'true';
    if (isRemembered) return false;

    if (config.requirePasswordEveryOpen) return true;
    if (isInstalledAppMode() && config.requirePasswordOnInstall !== false) return true;
    return false;
  } catch {
    return false;
  }
}

export function markAppLoggedIn(rememberDevice: boolean): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.APP_LOGGED_OUT);
    if (rememberDevice) {
      localStorage.setItem(STORAGE_KEYS.APP_REMEMBER_LOGIN, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.APP_REMEMBER_LOGIN);
    }
  } catch (err) {
    console.error('Error marking login:', err);
  }
}

export function markAppLoggedOut(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_LOGGED_OUT, 'true');
    localStorage.removeItem(STORAGE_KEYS.APP_REMEMBER_LOGIN);
  } catch (err) {
    console.error('Error marking logout:', err);
  }
}

/**
 * Format an official VIP Membership Card Number (16-digit credit-card style)
 * e.g. "7866 9876 5432 1026"
 */
export function formatMembershipCardNumber(mobile: string, custom?: string): string {
  if (custom && custom.trim().length > 6) {
    return custom.trim();
  }
  const clean = (mobile || '').replace(/\D/g, '');
  const prefix = '7866'; // Delicious Cake Corner store prefix
  const part1 = (clean.slice(0, 4) || '1234').padEnd(4, '0');
  const part2 = (clean.slice(4, 8) || '5678').padEnd(4, '0');
  const last2 = (clean.slice(8, 10) || '90').padEnd(2, '0');
  const yearSuffix = '26'; // Year suffix 2026
  return `${prefix} ${part1} ${part2} ${last2}${yearSuffix}`;
}

/**
 * Encode membership card payload for QR Code
 */
export function encodeMembershipQrPayload(customer: CustomerLoyalty, shopName?: string): string {
  const cleanMob = customer.customerMobile.replace(/\D/g, '');
  const cleanName = (customer.customerName || 'VIP Member').replace(/[:|]/g, ' ');
  const tier = (customer.tierName || 'Member').replace(/[:|]/g, ' ');
  const pts = customer.pointsBalance || 0;
  // Compact structured format easily parsed by camera, USB handheld scanners, or URL
  return `DCC-MEMBER:${cleanMob}:${cleanName}:${tier}:${pts}`;
}

/**
 * Parse scanned QR code or barcode input for membership cards
 */
export function parseMembershipQrPayload(rawInput: string): {
  mobile?: string;
  name?: string;
  tier?: string;
  points?: number;
} | null {
  if (!rawInput) return null;
  const input = rawInput.trim();

  // 1. Check DCC-MEMBER format: DCC-MEMBER:mobile:name:tier:pts
  if (input.startsWith('DCC-MEMBER:')) {
    const parts = input.split(':');
    const mobile = (parts[1] || '').replace(/\D/g, '');
    const name = parts[2] || '';
    const tier = parts[3] || '';
    const points = parseInt(parts[4] || '0', 10);
    return { mobile, name, tier, points: isNaN(points) ? 0 : points };
  }

  // 2. Check JSON payload
  if (input.startsWith('{') && input.endsWith('}')) {
    try {
      const parsed = JSON.parse(input);
      if (parsed.mobile || parsed.customerMobile) {
        return {
          mobile: (parsed.mobile || parsed.customerMobile || '').replace(/\D/g, ''),
          name: parsed.name || parsed.customerName || '',
          tier: parsed.tier || parsed.tierName || '',
          points: parsed.points || parsed.pts || 0
        };
      }
    } catch {
      // not JSON
    }
  }

  // 3. Check plain 10-digit mobile number
  const digitsOnly = input.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return { mobile: digitsOnly };
  }

  // 4. URL query string e.g. ?mobile=9876543210
  if (input.includes('mobile=')) {
    const match = input.match(/mobile=(\d{10})/);
    if (match && match[1]) {
      return { mobile: match[1] };
    }
  }

  return null;
}

export const DEFAULT_SAMPLE_CAMPAIGNS: AutoAdCampaign[] = [
  {
    id: 'camp-1',
    name: 'Royal Truffle Luxury Cake (100% Free Organic Promo)',
    nameBn: 'রয়্যাল বেলজিয়ান ট্রাফেল কেক - সম্পূর্ণ ফ্রি অর্গানিক প্রচার',
    posterType: 'truffle',
    posterUrl: fbPremiumPoster,
    caption: '🍫 বিলাসবহুল চকলেট ট্রাফেল কেকের রাজকীয় স্বাদ — ঘাটাল ও মনসুকায় ১০০% এগলেস! অর্ডার: 7866971421',
    platform: 'both',
    dailyBudget: 0,
    durationDays: 30,
    targetLocation: 'Mansuka, Ghatal, Daspur, Chandrakona (12 km radius)',
    targetAudience: 'Age 18-45 • Celebrations, Anniversaries, Foodies',
    status: 'active',
    startDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    reachCount: 1840,
    clicksCount: 94,
    whatsappOrdersCount: 12
  },
  {
    id: 'camp-2',
    name: 'Birthday & Party Celebration (100% Free Local Groups)',
    nameBn: 'বার্থডে সেলিব্রেশন স্পেশাল কেক - ফ্রি লোকাল গ্রুপস ও মার্কেটপ্লেস প্রচার',
    posterType: 'birthday',
    posterUrl: fbBirthdayPoster,
    caption: '🎉 বার্থডে বা অ্যানিভার্সারি সেলিব্রেশন হবে জমকালো! ২-৩ ঘণ্টায় ফ্রেশ এগলেস ফটো কেক ডেলিভারি: 7866971421',
    platform: 'facebook',
    dailyBudget: 0,
    durationDays: 30,
    targetLocation: 'Ghatal Town, Kuspat, Mansuka Bazar (10 km radius)',
    targetAudience: 'Age 18-40 • Upcoming Birthdays & Family events',
    status: 'active',
    startDate: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
    reachCount: 2680,
    clicksCount: 142,
    whatsappOrdersCount: 19
  }
];

function resolveCampaignPosterUrl(posterUrl: string, posterType?: string): string {
  if (!posterUrl || posterUrl.startsWith('/src/assets/images/')) {
    if (posterType === 'birthday') return fbBirthdayPoster;
    if (posterType === 'redvelvet') return fbRedVelvetPoster;
    if (posterType === 'butterscotch') return fbButterscotchPoster;
    return fbPremiumPoster;
  }
  return posterUrl;
}

export function getStoredAdCampaigns(): AutoAdCampaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(DEFAULT_SAMPLE_CAMPAIGNS));
      return DEFAULT_SAMPLE_CAMPAIGNS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SAMPLE_CAMPAIGNS;
    return parsed.map((c: AutoAdCampaign) => ({
      ...c,
      posterUrl: resolveCampaignPosterUrl(c.posterUrl, c.posterType)
    }));
  } catch {
    return DEFAULT_SAMPLE_CAMPAIGNS;
  }
}

export function saveStoredAdCampaign(campaign: AutoAdCampaign): AutoAdCampaign[] {
  try {
    const existing = getStoredAdCampaigns();
    const index = existing.findIndex((c) => c.id === campaign.id);
    let updated: AutoAdCampaign[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = campaign;
    } else {
      updated = [campaign, ...existing];
    }
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save ad campaign:', err);
    return [];
  }
}

export function updateStoredAdCampaignStatus(id: string, status: 'active' | 'paused' | 'completed'): AutoAdCampaign[] {
  try {
    const existing = getStoredAdCampaigns();
    const updated = existing.map((c) => (c.id === id ? { ...c, status } : c));
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to update ad campaign status:', err);
    return [];
  }
}

export function deleteStoredAdCampaign(id: string): AutoAdCampaign[] {
  try {
    const existing = getStoredAdCampaigns();
    const updated = existing.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete ad campaign:', err);
    return [];
  }
}

export interface DailyFacebookDayPlan {
  dayIndex: number; // 0 = Sunday .. 6 = Saturday
  dayNameBn: string;
  dayNameEn: string;
  posterType: 'truffle' | 'birthday' | 'redvelvet' | 'butterscotch';
  posterUrl: string;
  titleBn: string;
  titleEn: string;
  offerTagBn: string;
  buildCaption: (fbUrl: string) => string;
}

export const DAILY_FB_CONTENT_PLAN: DailyFacebookDayPlan[] = [
  {
    dayIndex: 0,
    dayNameBn: 'রবিবার',
    dayNameEn: 'Sunday',
    posterType: 'butterscotch',
    posterUrl: fbButterscotchPoster,
    titleBn: 'রবিবার ফ্যামিলি ফিস্ট — ফ্রেশ ফ্রুট ও বাটারস্কচ',
    titleEn: 'Sunday Family Feast — Fresh Fruit & Butterscotch',
    offerTagBn: 'Sunday Special',
    buildCaption: (fbUrl: string) =>
      `🍍🎉 শুভ রবিবার! পরিবারের সবার সাথে মিষ্টি আড্ডায় নিয়ে আসুন ফ্রেশ এক্সোটিক ফ্রুট ও বাটারস্কচ কেক — DELICIOUS CAKE CORNER! 🍰✨\n\nপ্রতিটি কামড়ে পাবেন ক্রাঞ্চি প্র্যালিন, ফ্রেশ কিউই, স্ট্রবেরি ও সোনালী ক্যারামেল ড্রিপ!\n✅ ১০০% পিওর এগলেস (Pure Veg Bakery)\n✅ ঘাটাল, মনসুকা ও দাসপুরে দ্রুত হোম ডেলিভারি\n\n📞 আজই অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#SundaySpecial #DeliciousCakeCorner #ButterscotchCake #GhatalBakery #Mansuka #EgglessCakes`
  },
  {
    dayIndex: 1,
    dayNameBn: 'সোমবার',
    dayNameEn: 'Monday',
    posterType: 'truffle',
    posterUrl: fbPremiumPoster,
    titleBn: 'সোমবার রয়্যাল বেলজিয়ান চকলেট ট্রাফেল',
    titleEn: 'Monday Royal Belgian Chocolate Truffle',
    offerTagBn: 'Best Seller',
    buildCaption: (fbUrl: string) =>
      `🍫✨ সপ্তাহের শুরু হোক রাজকীয় স্বাদে — রয়্যাল বেলজিয়ান চকলেট ট্রাফেল কেক! ✨🍫\n\nঘাটাল ও মনসুকার কেক প্রেমীদের এক নম্বর পছন্দ, ১০০% এগলেস রিচ ডার্ক চকলেট ট্রাফেল কেক।\n✅ মাত্র ২-৩ ঘণ্টার মধ্যে ফ্রেশ বেক করে ডেলিভারি\n✅ জন্মদিন, সারপ্রাইজ ও যেকোনো সেলিব্রেশনে সেরা\n\n📞 কল বা হোয়াটসঅ্যাপ: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 পেজ ফলো করুন: ${fbUrl}\n\n#ChocolateTruffle #DeliciousCakeCorner #GhatalCakes #MansukaBakery #PureVegBakery`
  },
  {
    dayIndex: 2,
    dayNameBn: 'মঙ্গলবার',
    dayNameEn: 'Tuesday',
    posterType: 'birthday',
    posterUrl: fbBirthdayPoster,
    titleBn: 'মঙ্গলবার জন্মদিন ও কাস্টম ফটো কেক বুকিং',
    titleEn: 'Tuesday Birthday & Custom Photo Cake Special',
    offerTagBn: '2-Hr Express',
    buildCaption: (fbUrl: string) =>
      `🎂🎈 প্রিয়জনের জন্মদিন কি সামনেই? কাস্টম ফটো কেক ও ডিজাইনার থিম কেক বুকিং চলছে! 🎈🎂\n\nআপনার পছন্দের ছবি, বার্বি, কার্টুন বা সুপারহিরো থিম অনুযায়ী ১০০% এগলেস কেক তৈরি করে দেওয়া হয় DELICIOUS CAKE CORNER-এ!\n✅ ফ্রি কাস্টম নাম লেখা ও বার্থডে ক্যান্ডেল\n✅ মনসুকা, ঘাটাল, দাসপুর ও চন্দ্রকোনা ডেলিভারি\n\n📞 সরাসরি হোয়াটসঅ্যাপ করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#BirthdayCakeGhatal #PhotoCake #DeliciousCakeCorner #Mansuka #EgglessBakery`
  },
  {
    dayIndex: 3,
    dayNameBn: 'বুধবার',
    dayNameEn: 'Wednesday',
    posterType: 'redvelvet',
    posterUrl: fbRedVelvetPoster,
    titleBn: 'বুধবার অ্যানিভার্সারি ও রেড ভেলভেট হার্ট কেক',
    titleEn: 'Wednesday Romantic Red Velvet Heart Cake',
    offerTagBn: 'Couple Favorite',
    buildCaption: (fbUrl: string) =>
      `❤️✨ ভালোবাসার বিশেষ মুহূর্তে উপহার দিন রোমান্টিক 'রেড ভেলভেট হার্ট কেক'! ✨❤️\n\nনরম রুবির মতো লাল স্পঞ্জ, প্রিমিয়াম ক্রিম চিজ এবং ফ্রেশ বেরি টপিং — অ্যানিভার্সারি ও প্রপোজালের জন্য পারফেক্ট!\n✅ ১০০% পিওর এগলেস ও ফ্রেশ ইনগ্রেডিয়েন্টস\n✅ মাত্র ২-৩ ঘণ্টায় আপনার দরজায় ডেলিভারি\n\n📞 অর্ডার করতে কল বা হোয়াটসঅ্যাপ করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 আমাদের পেজ: ${fbUrl}\n\n#RedVelvetHeart #AnniversaryCake #DeliciousCakeCorner #Ghatal #MansukaCakes`
  },
  {
    dayIndex: 4,
    dayNameBn: 'বৃহস্পতিবার',
    dayNameEn: 'Thursday',
    posterType: 'truffle',
    posterUrl: fbPremiumPoster,
    titleBn: 'বৃহস্পতিবার ১০০% পিওর ভেজ এগলেস বেকারি স্পেশাল',
    titleEn: 'Thursday 100% Pure Veg Eggless Fresh Bake',
    offerTagBn: '100% Pure Veg',
    buildCaption: (fbUrl: string) =>
      `🌿🎂 বৃহস্পতিবার হোক শুদ্ধ ও মিষ্টি — ১০০% এগলেস ও পিওর ভেজ ফ্রেশ কেক ও পেস্ট্রি! 🌿🎂\n\nপুজো, উপোস বা পারিবারিক শুভ অনুষ্ঠানে নিশ্চিন্তে অর্ডার করুন DELICIOUS CAKE CORNER-এর খাঁটি এগলেস চকলেট, ভ্যানিলা, বাটারস্কচ ও পাইনঅ্যাপল কেক।\n✅ সম্পূর্ণ হাইজেনিক কিচেনে প্রতিদিন ফ্রেশ তৈরি\n✅ পাউন্ড অনুযায়ী সাশ্রয়ী দাম\n\n📞 অর্ডার নম্বর: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক: ${fbUrl}\n\n#PureVegEggless #DeliciousCakeCorner #GhatalBakery #FreshCakes #Mansuka`
  },
  {
    dayIndex: 5,
    dayNameBn: 'শুক্রবার',
    dayNameEn: 'Friday',
    posterType: 'birthday',
    posterUrl: fbBirthdayPoster,
    titleBn: 'শুক্রবার উইকেন্ড পার্টি ও অ্যাডভান্স বুকিং',
    titleEn: 'Friday Weekend Party & Advance Cake Booking',
    offerTagBn: 'Weekend Booking',
    buildCaption: (fbUrl: string) =>
      `🎉🍰 শনি ও রবিবারের পার্টি বা জন্মদিনের কেক আজই প্রি-বুক করুন! 🍰🎉\n\nভিড় এড়াতে ও আপনার পছন্দের ডিজাইনের টু-টায়ার, ফটো কেক বা ডার্ক চকলেট ট্রাফেল কেক আগে থেকেই বুক করে রাখুন।\n🎈 বার্থডে বেলুন, স্পার্কেল ক্যান্ডেল ও কাস্টম ট্যাগ একসাথেই পাওয়া যায়!\n🚚 ঘাটাল ও মনসুকার আশেপাশে হোম ডেলিভারি\n\n📞 হোয়াটসঅ্যাপে ছবি পাঠিয়ে অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#WeekendCakes #AdvanceBooking #DeliciousCakeCorner #Ghatal #MansukaBakery`
  },
  {
    dayIndex: 6,
    dayNameBn: 'শনিবার',
    dayNameEn: 'Saturday',
    posterType: 'redvelvet',
    posterUrl: fbRedVelvetPoster,
    titleBn: 'শনিবার নাইট সেলিব্রেশন ও ২-ঘণ্টা এক্সপ্রেস ডেলিভারি',
    titleEn: 'Saturday Evening Treat & 2-Hour Express Delivery',
    offerTagBn: 'Saturday Night',
    buildCaption: (fbUrl: string) =>
      `🌙🎂 আজ শনিবার সন্ধ্যায় চটজলদি কেক লাগবে? ঘাটাল ও মনসুকায় মাত্র ২ ঘণ্টায় ফ্রেশ কেক ডেলিভারি! 🎂🌙\n\nরেড ভেলভেট, চকলেট ট্রাফেল, বাটারস্কচ ও ফ্রেশ পেস্ট্রি — প্রতিটি কেক ১০০% এগলেস ও দারুণ সুস্বাদু।\n⭐ আপনার পরিচিতদের সাথে শেয়ার করুন ও ভালোবাসা জানান!\n\n📞 কল / হোয়াটসঅ্যাপ: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক: ${fbUrl}\n\n#SaturdayVibes #DeliciousCakeCorner #GhatalFoodies #Mansuka #EgglessCakeShop`
  }
];

export function getISTDateStr(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function getISTTimeHHMM(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    return date.toTimeString().slice(0, 5);
  }
}

export function getISTDayIndex(date: Date = new Date()): number {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short'
    }).format(date);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[weekday] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}

export const DEFAULT_DAILY_FB_SCHEDULE: DailyFacebookSchedule = {
  enabled: true,
  postTime: '10:00',
  rotateMode: '7day_rotation',
  autoPublishWithToken: true,
  customCaptions: {},
  logs: []
};

export function getDailyFbSchedule(): DailyFacebookSchedule {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FB_DAILY_SCHEDULE);
    if (!raw) {
      return DEFAULT_DAILY_FB_SCHEDULE;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DAILY_FB_SCHEDULE,
      ...parsed,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      customCaptions: parsed.customCaptions && typeof parsed.customCaptions === 'object' ? parsed.customCaptions : {}
    };
  } catch {
    return DEFAULT_DAILY_FB_SCHEDULE;
  }
}

export function saveDailyFbSchedule(schedule: DailyFacebookSchedule): DailyFacebookSchedule {
  try {
    const trimmed: DailyFacebookSchedule = {
      ...schedule,
      logs: (schedule.logs || []).slice(0, 40)
    };
    localStorage.setItem(STORAGE_KEYS.FB_DAILY_SCHEDULE, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return schedule;
  }
}

export function appendDailyFbPostLog(
  schedule: DailyFacebookSchedule,
  log: DailyFacebookPostLog,
  markPostedToday: boolean
): DailyFacebookSchedule {
  const today = log.date || getISTDateStr();
  const next: DailyFacebookSchedule = {
    ...schedule,
    lastPreparedDate: today,
    lastPostedDate: markPostedToday ? today : schedule.lastPostedDate,
    lastStatus: log.status,
    lastMessage: log.titleBn,
    lastPostUrl: log.postUrl || schedule.lastPostUrl,
    logs: [log, ...(schedule.logs || [])].slice(0, 40)
  };
  return saveDailyFbSchedule(next);
}

export function getTodaysFbPlan(
  schedule?: DailyFacebookSchedule,
  fbUrl: string = 'https://www.facebook.com/share/1EEg9yAa9A/',
  dayIndexOverride?: number
) {
  const dayIdx = typeof dayIndexOverride === 'number' ? ((dayIndexOverride % 7) + 7) % 7 : getISTDayIndex();
  const plan = DAILY_FB_CONTENT_PLAN.find((p) => p.dayIndex === dayIdx) || DAILY_FB_CONTENT_PLAN[0];
  const customCaption = schedule?.customCaptions?.[dayIdx];
  const caption = customCaption && customCaption.trim().length > 0 ? customCaption : plan.buildCaption(fbUrl);
  return {
    ...plan,
    caption
  };
}

export function isDailyFbPostDueNow(schedule: DailyFacebookSchedule): boolean {
  if (!schedule.enabled) return false;
  const todayIST = getISTDateStr();
  if (schedule.lastPostedDate === todayIST) return false;
  const nowHHMM = getISTTimeHHMM();
  return nowHHMM >= (schedule.postTime || '10:00');
}


