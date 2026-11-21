import { Bill, BakeryProduct, ShopConfig, CustomerLoyalty, StockEntry } from '../types';
import {
  getBills,
  getProducts,
  getShopConfig,
  getStoredCustomers,
  getStockEntries,
  getCurrentBillSequence,
  getNextBillSequence,
  saveAllStoredCustomers,
  STORAGE_KEYS
} from '../utils/storage';
import {
  fetchBillsFromFirestore,
  fetchProductsFromFirestore,
  fetchShopConfigFromFirestore,
  fetchCustomersFromFirestore,
  saveBillToFirestore,
  saveProductsToFirestore,
  saveShopConfigToFirestore,
  saveCustomerToFirestore
} from './firestoreService';

export type CloudBackupSourceMode = 'unified' | 'firestore' | 'local';

export interface CloudBackupSafeguardPackage {
  metadata: {
    app: string;
    type: 'DCC_MANUAL_CLOUD_SAFEGUARD_BACKUP';
    version: string;
    generatedAt: string;
    generatedTimestamp: number;
    sourceMode: CloudBackupSourceMode;
    sourceDescription: string;
    cloudConnected: boolean;
    firestoreBillsCount: number;
    localBillsCount: number;
    reconciledBillsCount: number;
    productsCount: number;
    customersCount: number;
    stockEntriesCount: number;
    shopName: string;
    branch: string;
    phone: string;
    checksum: string;
    isFallback?: boolean;
  };
  summary: {
    totalBills: number;
    grossRevenue: number;
    cashSales: number;
    upiSales: number;
    cardSales: number;
    totalDue: number;
    totalTaxCollected: number;
    totalDiscount: number;
    advancePaidTotal: number;
    earliestBillDate: string;
    latestBillDate: string;
  };
  billingData: {
    bills: Bill[];
    billSequence: number;
    shopConfig: ShopConfig;
    products: BakeryProduct[];
    customers: CustomerLoyalty[];
    stockEntries: StockEntry[];
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  isLegacyFormat?: boolean;
  error?: string;
  pkg?: CloudBackupSafeguardPackage;
  summary?: {
    totalBills: number;
    grossRevenue: number;
    backupDate: string;
    source: string;
    productsCount: number;
    customersCount: number;
  };
}

/**
 * Computes a deterministic checksum hash of a string for data integrity verification
 */
function computeChecksum(dataStr: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  return `DCC-${Math.abs(hash1).toString(16).toUpperCase()}-${Math.abs(hash2).toString(16).toUpperCase()}`;
}

/**
 * Compiles a comprehensive safeguard cloud backup by merging Firestore and local storage data
 */
export async function fetchAndCompileCloudBackup(
  sourceMode: CloudBackupSourceMode = 'unified',
  options: {
    includeBills?: boolean;
    includeProducts?: boolean;
    includeCustomers?: boolean;
    includeSettings?: boolean;
    includeStock?: boolean;
  } = {}
): Promise<{ pkg: CloudBackupSafeguardPackage; cloudConnected: boolean }> {
  const {
    includeBills = true,
    includeProducts = true,
    includeCustomers = true,
    includeSettings = true,
    includeStock = true
  } = options;

  let cloudBills: Bill[] = [];
  let cloudProducts: BakeryProduct[] = [];
  let cloudCustomers: CustomerLoyalty[] = [];
  let cloudConfig: ShopConfig | null = null;
  let cloudConnected = false;

  // 1. Fetch live cloud data from Firestore
  try {
    const [cBills, cProducts, cCustomers, cConfig] = await Promise.all([
      fetchBillsFromFirestore().catch(() => []),
      fetchProductsFromFirestore().catch(() => []),
      fetchCustomersFromFirestore().catch(() => []),
      fetchShopConfigFromFirestore().catch(() => null)
    ]);

    cloudBills = cBills || [];
    cloudProducts = cProducts || [];
    cloudCustomers = cCustomers || [];
    cloudConfig = cConfig;
    cloudConnected = true;
  } catch (err) {
    console.warn('Firestore live query encountered an issue, continuing with local cache:', err);
    cloudConnected = false;
  }

  // 2. Fetch local storage data
  const localBills = getBills();
  const localProducts = getProducts();
  const localConfig = getShopConfig();
  const localCustomers = getStoredCustomers();
  const localStock = getStockEntries();
  const localSeq = getCurrentBillSequence();

  // 3. Reconcile data based on selected source mode
  let finalBills: Bill[] = [];
  let finalProducts: BakeryProduct[] = [];
  let finalCustomers: CustomerLoyalty[] = [];
  let finalConfig: ShopConfig = localConfig;
  let finalStock: StockEntry[] = localStock;
  let isFallback = false;
  let sourceDescription = '';

  if (sourceMode === 'unified') {
    sourceDescription = 'Unified Safeguard (Firestore Cloud + LocalStorage Reconciled)';

    // Merge Bills: index by id or billNo, keeping the most recently updated
    const billMap = new Map<string, Bill>();
    cloudBills.forEach((b) => {
      const key = b.id || b.billNo;
      if (key) billMap.set(key, b);
    });
    localBills.forEach((b) => {
      const key = b.id || b.billNo;
      if (!key) return;
      if (!billMap.has(key)) {
        billMap.set(key, b);
      } else {
        const existing = billMap.get(key)!;
        if ((b.createdAt || 0) > (existing.createdAt || 0)) {
          billMap.set(key, b);
        }
      }
    });
    finalBills = Array.from(billMap.values()).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );

    // Merge Products
    const prodMap = new Map<string, BakeryProduct>();
    cloudProducts.forEach((p) => prodMap.set(p.id, p));
    localProducts.forEach((p) => {
      if (!prodMap.has(p.id)) prodMap.set(p.id, p);
    });
    finalProducts = Array.from(prodMap.values());

    // Merge Customers
    const custMap = new Map<string, CustomerLoyalty>();
    cloudCustomers.forEach((c) => custMap.set(c.customerMobile, c));
    localCustomers.forEach((c) => {
      if (!custMap.has(c.customerMobile)) {
        custMap.set(c.customerMobile, c);
      } else {
        const existing = custMap.get(c.customerMobile)!;
        if ((c.pointsBalance || 0) > (existing.pointsBalance || 0)) {
          custMap.set(c.customerMobile, c);
        }
      }
    });
    finalCustomers = Array.from(custMap.values());
    finalConfig = cloudConfig || localConfig;
  } else if (sourceMode === 'firestore') {
    sourceDescription = 'Live Firestore Cloud Database Direct';
    if (cloudBills.length > 0 || cloudConnected) {
      finalBills = cloudBills.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      finalProducts = cloudProducts.length > 0 ? cloudProducts : localProducts;
      finalCustomers = cloudCustomers.length > 0 ? cloudCustomers : localCustomers;
      finalConfig = cloudConfig || localConfig;
    } else {
      isFallback = true;
      sourceDescription = 'Live Firestore (Offline - Fell back to Local Cache)';
      finalBills = localBills;
      finalProducts = localProducts;
      finalCustomers = localCustomers;
      finalConfig = localConfig;
    }
  } else {
    // Pure local mode
    sourceDescription = 'Local Terminal Storage (Offline Direct)';
    finalBills = localBills;
    finalProducts = localProducts;
    finalCustomers = localCustomers;
    finalConfig = localConfig;
  }

  // Filter based on user preferences
  if (!includeBills) finalBills = [];
  if (!includeProducts) finalProducts = [];
  if (!includeCustomers) finalCustomers = [];
  if (!includeStock) finalStock = [];

  // 4. Calculate comprehensive financial summary
  let grossRevenue = 0;
  let cashSales = 0;
  let upiSales = 0;
  let cardSales = 0;
  let totalDue = 0;
  let totalTaxCollected = 0;
  let totalDiscount = 0;
  let advancePaidTotal = 0;
  let earliestDate = '';
  let latestDate = '';

  finalBills.forEach((b) => {
    const total = b.grandTotal || 0;
    grossRevenue += total;
    totalDue += b.dueAmount || 0;
    totalTaxCollected += b.taxAmount || 0;
    totalDiscount += (b.discountAmount || 0) + (b.loyaltyDiscountAmount || 0);
    advancePaidTotal += b.advancePaid || 0;

    if (b.paymentMethod === 'Cash') {
      cashSales += b.advancePaid > 0 ? b.advancePaid : total;
    } else if (b.paymentMethod === 'UPI') {
      upiSales += b.advancePaid > 0 ? b.advancePaid : total;
    } else if (b.paymentMethod === 'Card') {
      cardSales += b.advancePaid > 0 ? b.advancePaid : total;
    } else if (b.paymentMethod === 'Split') {
      cashSales += b.splitCash || 0;
      upiSales += b.splitUpi || 0;
    }

    const bDate = (b.date || new Date(b.createdAt).toISOString()).slice(0, 10);
    if (!earliestDate || bDate < earliestDate) earliestDate = bDate;
    if (!latestDate || bDate > latestDate) latestDate = bDate;
  });

  const nextSeq = Math.max(localSeq, getNextBillSequence(finalBills));
  const now = new Date();

  // Create content payload for checksum
  const payloadFingerprint = JSON.stringify({
    billsCount: finalBills.length,
    grossRevenue,
    prodsCount: finalProducts.length,
    custCount: finalCustomers.length,
    configName: finalConfig.shopName
  });
  const checksum = computeChecksum(payloadFingerprint);

  const pkg: CloudBackupSafeguardPackage = {
    metadata: {
      app: 'DELICIOUS CAKE CORNER — Smart Billing & POS',
      type: 'DCC_MANUAL_CLOUD_SAFEGUARD_BACKUP',
      version: '2.5.0',
      generatedAt: now.toISOString(),
      generatedTimestamp: now.getTime(),
      sourceMode,
      sourceDescription,
      cloudConnected,
      firestoreBillsCount: cloudBills.length,
      localBillsCount: localBills.length,
      reconciledBillsCount: finalBills.length,
      productsCount: finalProducts.length,
      customersCount: finalCustomers.length,
      stockEntriesCount: finalStock.length,
      shopName: finalConfig.shopName || 'Delicious Cake Corner',
      branch: finalConfig.addressLine1 ? `${finalConfig.addressLine1}, ${finalConfig.district}` : 'Mansuka, Ghatal, Paschim Medinipur',
      phone: finalConfig.phone || '7866971421',
      checksum,
      isFallback
    },
    summary: {
      totalBills: finalBills.length,
      grossRevenue: Number(grossRevenue.toFixed(2)),
      cashSales: Number(cashSales.toFixed(2)),
      upiSales: Number(upiSales.toFixed(2)),
      cardSales: Number(cardSales.toFixed(2)),
      totalDue: Number(totalDue.toFixed(2)),
      totalTaxCollected: Number(totalTaxCollected.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      advancePaidTotal: Number(advancePaidTotal.toFixed(2)),
      earliestBillDate: earliestDate || now.toISOString().slice(0, 10),
      latestBillDate: latestDate || now.toISOString().slice(0, 10)
    },
    billingData: {
      bills: finalBills,
      billSequence: nextSeq,
      shopConfig: finalConfig,
      products: finalProducts,
      customers: finalCustomers,
      stockEntries: finalStock
    }
  };

  return { pkg, cloudConnected };
}

/**
 * Downloads the Cloud Backup Safeguard package as a formatted JSON file
 */
export function downloadCloudBackupJson(
  pkg: CloudBackupSafeguardPackage,
  customFilename?: string
): { filename: string; sizeKb: number } {
  const jsonString = JSON.stringify(pkg, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date(pkg.metadata.generatedTimestamp).toISOString().slice(0, 10);
  const timeStr = new Date(pkg.metadata.generatedTimestamp)
    .toTimeString()
    .slice(0, 5)
    .replace(':', '');
  const modeTag = pkg.metadata.sourceMode.toUpperCase();

  const filename =
    customFilename || `DCC_Billing_Safeguard_${modeTag}_${dateStr}_${timeStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const sizeKb = Number((blob.size / 1024).toFixed(1));
  return { filename, sizeKb };
}

/**
 * Validates and inspects an uploaded JSON backup file
 */
export function validateAndInspectBackup(jsonString: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(jsonString);

    // Format 1: New DCC Safeguard Package
    if (parsed.metadata?.type === 'DCC_MANUAL_CLOUD_SAFEGUARD_BACKUP' && parsed.billingData) {
      const bData = parsed.billingData;
      const bills = Array.isArray(bData.bills) ? bData.bills : [];
      const gross =
        parsed.summary?.grossRevenue ??
        bills.reduce((s: number, b: Bill) => s + (b.grandTotal || 0), 0);

      return {
        isValid: true,
        pkg: parsed as CloudBackupSafeguardPackage,
        summary: {
          totalBills: bills.length,
          grossRevenue: Number(gross.toFixed(2)),
          backupDate: parsed.metadata.generatedAt || new Date().toISOString(),
          source: parsed.metadata.sourceDescription || 'Cloud Safeguard Backup',
          productsCount: Array.isArray(bData.products) ? bData.products.length : 0,
          customersCount: Array.isArray(bData.customers) ? bData.customers.length : 0
        }
      };
    }

    // Format 2: Legacy v2.0 exportAllDataBackup format
    if (parsed.bills && Array.isArray(parsed.bills)) {
      const bills: Bill[] = parsed.bills;
      const gross = bills.reduce((s: number, b: Bill) => s + (b.grandTotal || 0), 0);
      const prods = Array.isArray(parsed.products) ? parsed.products : [];
      const cfg = parsed.config || getShopConfig();

      const synthesizedPkg: CloudBackupSafeguardPackage = {
        metadata: {
          app: 'DELICIOUS CAKE CORNER — Smart Billing & POS',
          type: 'DCC_MANUAL_CLOUD_SAFEGUARD_BACKUP',
          version: parsed.version || '2.0-legacy',
          generatedAt: parsed.exportDate || new Date().toISOString(),
          generatedTimestamp: parsed.exportDate ? new Date(parsed.exportDate).getTime() : Date.now(),
          sourceMode: 'local',
          sourceDescription: 'Legacy Backup File (Imported)',
          cloudConnected: false,
          firestoreBillsCount: 0,
          localBillsCount: bills.length,
          reconciledBillsCount: bills.length,
          productsCount: prods.length,
          customersCount: 0,
          stockEntriesCount: 0,
          shopName: cfg.shopName || 'Delicious Cake Corner',
          branch: cfg.addressLine1 || 'Mansuka, Ghatal',
          phone: cfg.phone || '',
          checksum: 'LEGACY-FORMAT'
        },
        summary: {
          totalBills: bills.length,
          grossRevenue: Number(gross.toFixed(2)),
          cashSales: 0,
          upiSales: 0,
          cardSales: 0,
          totalDue: bills.reduce((s: number, b: Bill) => s + (b.dueAmount || 0), 0),
          totalTaxCollected: bills.reduce((s: number, b: Bill) => s + (b.taxAmount || 0), 0),
          totalDiscount: 0,
          advancePaidTotal: 0,
          earliestBillDate: '',
          latestBillDate: ''
        },
        billingData: {
          bills,
          billSequence: parsed.sequence || getNextBillSequence(bills),
          shopConfig: cfg,
          products: prods,
          customers: [],
          stockEntries: []
        }
      };

      return {
        isValid: true,
        isLegacyFormat: true,
        pkg: synthesizedPkg,
        summary: {
          totalBills: bills.length,
          grossRevenue: Number(gross.toFixed(2)),
          backupDate: parsed.exportDate || 'Unknown Date',
          source: 'Legacy POS Backup',
          productsCount: prods.length,
          customersCount: 0
        }
      };
    }

    return {
      isValid: false,
      error: 'Unrecognized backup file structure. Please upload a valid Delicious Cake Corner backup JSON.'
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `JSON parsing error: ${err?.message || 'Invalid JSON syntax'}`
    };
  }
}

/**
 * Restores billing and store data from a validated safeguard package
 */
export async function restoreFromSafeguardPackage(
  pkg: CloudBackupSafeguardPackage,
  syncToCloud: boolean = false
): Promise<{
  success: boolean;
  billsRestored: number;
  productsRestored: number;
  customersRestored: number;
  cloudSynced: boolean;
  message: string;
}> {
  try {
    const { bills = [], products = [], customers = [], shopConfig, billSequence, stockEntries = [] } =
      pkg.billingData;

    // 1. Restore local storage
    if (bills.length > 0) {
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
      localStorage.setItem('dcc_sample_initialized_v2', 'true');
    }
    if (products.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
    if (shopConfig) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(shopConfig));
    }
    if (customers.length > 0) {
      saveAllStoredCustomers(customers);
    }
    if (stockEntries.length > 0) {
      localStorage.setItem(STORAGE_KEYS.STOCK_ENTRIES, JSON.stringify(stockEntries));
    }
    if (billSequence) {
      localStorage.setItem(STORAGE_KEYS.BILL_SEQ, billSequence.toString());
    }

    let cloudSynced = false;

    // 2. Optional: Push restored data to Firestore cloud database
    if (syncToCloud) {
      try {
        if (bills.length > 0) {
          for (const b of bills) {
            await saveBillToFirestore(b);
          }
        }
        if (products.length > 0) {
          await saveProductsToFirestore(products);
        }
        if (shopConfig) {
          await saveShopConfigToFirestore(shopConfig);
        }
        if (customers.length > 0) {
          for (const c of customers) {
            await saveCustomerToFirestore(c);
          }
        }
        cloudSynced = true;
      } catch (cloudErr) {
        console.warn('Notice: Local restore succeeded, but cloud sync encountered an issue:', cloudErr);
      }
    }

    return {
      success: true,
      billsRestored: bills.length,
      productsRestored: products.length,
      customersRestored: customers.length,
      cloudSynced,
      message: `Successfully restored ${bills.length} bills, ${products.length} products, and ${customers.length} customer records.`
    };
  } catch (err: any) {
    return {
      success: false,
      billsRestored: 0,
      productsRestored: 0,
      customersRestored: 0,
      cloudSynced: false,
      message: `Restore failed: ${err?.message || 'Unknown storage error'}`
    };
  }
}
