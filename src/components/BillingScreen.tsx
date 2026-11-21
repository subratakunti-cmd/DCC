import React, { useState, useEffect, useRef } from 'react';
import { Bill, BillItem, BakeryProduct, ShopConfig, Language, PaymentMethod, OrderType, CustomerLoyalty, ReceiptFormat, AppUserSession } from '../types';
import { getT } from '../translations';
import { STANDARD_WEIGHT_OPTIONS } from '../data/defaultProducts';
import { saveBill, incrementBillSequence, getNextBillSequence, formatBillNumber, saveShopConfig, getCustomerLoyalty, getBills, getDailySalesSummary, getCurrentDeviceTerminalId, saveStoredCustomer, parseMembershipQrPayload } from '../utils/storage';
import { saveBillToFirestore, saveCustomerToFirestore } from '../services/firestoreService';
import { appendBillToGoogleSheet, isAutoSheetsSyncEnabled } from '../services/sheetsService';
import { getAccessToken } from '../lib/firebase';
import { openWhatsAppShare, openSmsShare, generateSmsMessage, generateQrDataUrl, generateUpiString } from '../utils/upi';
import { sendBillReceiptAndLoyaltySms, sendSmsApi } from '../services/smsService';
import { UpiModal } from './UpiModal';
import { SmsModal } from './SmsModal';
import { CustomerLoyaltyModal } from './CustomerLoyaltyModal';
import { MembershipCardModal } from './MembershipCardModal';
import { MultiSystemModal } from './MultiSystemModal';
import {
  Printer,
  Share2,
  MessageSquare,
  Trash2,
  Plus,
  CreditCard,
  RefreshCw,
  Send,
  Zap,
  QrCode,
  Layers,
  Sparkles,
  Cake,
  Calendar,
  Clock,
  Phone,
  User,
  CheckCircle2,
  ChevronDown,
  Percent,
  Receipt,
  Edit3,
  Store,
  Award,
  Crown,
  Gift,
  TrendingUp,
  Laptop,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  X,
  Lock
} from 'lucide-react';
import { CounterManagerModal } from './CounterManagerModal';
import { hasPermission } from '../utils/permissionUtils';

interface BillingScreenProps {
  config: ShopConfig;
  setConfig?: (config: ShopConfig) => void;
  products: BakeryProduct[];
  bills?: Bill[];
  lang: Language;
  billSequence: number;
  setBillSequence: (seq: number) => void;
  onViewHistory: () => void;
  onPrintRequested: (bill: Bill, format: ReceiptFormat) => void;
  onOpenDailySummary?: () => void;
  initialOrderData?: {
    customerName: string;
    customerMobile: string;
    productName: string;
    weight: string;
    cakeMessage: string;
    deliveryDate: string;
  } | null;
  initialDeliveryData?: {
    address: string;
    distanceKm: number;
    deliveryFee: number;
  } | null;
  editingBill?: Bill | null;
  onCancelEditBill?: () => void;
  onOpenPrinterManager?: () => void;
  userSession?: AppUserSession;
  onOpenQrHub?: () => void;
}

export const BillingScreen: React.FC<BillingScreenProps> = ({
  config,
  setConfig,
  products,
  bills,
  lang,
  billSequence,
  setBillSequence,
  onViewHistory,
  onPrintRequested,
  onOpenDailySummary,
  initialOrderData,
  initialDeliveryData,
  editingBill,
  onCancelEditBill,
  onOpenPrinterManager,
  userSession,
  onOpenQrHub
}) => {
  const t = getT(lang);

  // Customer state
  const [customerName, setCustomerName] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [orderType, setOrderType] = useState<OrderType>('counter');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [cakeMessage, setCakeMessage] = useState<string>('');

  // Handle incoming order from Google Forms
  useEffect(() => {
    if (initialOrderData) {
      if (initialOrderData.customerName) setCustomerName(initialOrderData.customerName);
      if (initialOrderData.customerMobile) setCustomerMobile(initialOrderData.customerMobile);
      if (initialOrderData.deliveryDate) setDeliveryDate(initialOrderData.deliveryDate);
      if (initialOrderData.cakeMessage) setCakeMessage(initialOrderData.cakeMessage);
      setOrderType('advance_booking');

      if (initialOrderData.productName) {
        setProductName(initialOrderData.productName);
        setSelectedWeight(initialOrderData.weight || '1.0 lb');
        // Find matching product rate
        const matched = products.find(
          (p) =>
            p.nameEn.toLowerCase() === initialOrderData.productName.toLowerCase() ||
            p.nameBn === initialOrderData.productName
        );
        const baseRate = matched ? matched.defaultRate : 400;
        const weightOpt = STANDARD_WEIGHT_OPTIONS.find((w) => w.value === initialOrderData.weight);
        const mult = weightOpt ? weightOpt.multiplier : 1;
        setRate((baseRate * mult).toFixed(0));
      }
    }
  }, [initialOrderData, products]);

  // Handle incoming delivery data from Google Maps
  useEffect(() => {
    if (initialDeliveryData) {
      setOrderType('delivery');
      if (initialDeliveryData.deliveryFee > 0) {
        // Add delivery charge as line item if not already added
        const feeItem: BillItem = {
          id: `delivery-${Date.now()}`,
          name: `Home Delivery (${initialDeliveryData.address}, ${initialDeliveryData.distanceKm} km)`,
          weightOrSize: 'Service',
          qty: 1,
          rate: initialDeliveryData.deliveryFee,
          total: initialDeliveryData.deliveryFee
        };
        setItems((prev) => [...prev.filter((i) => !i.name.startsWith('Home Delivery')), feeItem]);
      }
    }
  }, [initialDeliveryData]);

  // Item form state
  const [productName, setProductName] = useState<string>('');
  const [selectedWeight, setSelectedWeight] = useState<string>('1.0 lb');
  const [qty, setQty] = useState<number>(1);
  const [rate, setRate] = useState<string>('');
  const [itemNotes, setItemNotes] = useState<string>('');
  const [items, setItems] = useState<BillItem[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<BakeryProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Financials state
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(config.defaultTaxPercent || 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentStatusType, setPaymentStatusType] = useState<'full' | 'partial' | 'due'>('full');
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState<boolean>(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState<boolean>(false);
  const [isCounterModalOpen, setIsCounterModalOpen] = useState<boolean>(false);
  const [isMultiSystemModalOpen, setIsMultiSystemModalOpen] = useState<boolean>(false);
  const [editingCartItem, setEditingCartItem] = useState<BillItem | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<ReceiptFormat>(config.receiptFormat);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // SMS API State
  const [autoSendSms, setAutoSendSms] = useState<boolean>(config.autoSendSmsOnBill !== false);
  const [isSmsSending, setIsSmsSending] = useState<boolean>(false);
  const [lastSmsDelivery, setLastSmsDelivery] = useState<{
    billNo: string;
    phone: string;
    provider: string;
    messageId: string;
    time: string;
  } | null>(null);

  // Inline UPI QR State based on Shop's Payment Handle
  const [inlineQrUrl, setInlineQrUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [showRealStandeeInScreen, setShowRealStandeeInScreen] = useState<boolean>(false);
  const [isEditingInlineUpi, setIsEditingInlineUpi] = useState<boolean>(false);
  const [inlineUpiInput, setInlineUpiInput] = useState<string>(config.upiId || '7866971421@okaxis');

  // Customer Loyalty & VIP Membership State
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState<boolean>(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState<boolean>(false);
  const [isScanMemberModalOpen, setIsScanMemberModalOpen] = useState<boolean>(false);
  const [scannedMemberInput, setScannedMemberInput] = useState<string>('');
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState<boolean>(false);
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState<number>(0);

  // Resolve all bills for loyalty tracking and daily summary
  const allBills = bills && bills.length > 0 ? bills : getBills();
  const loyaltyInfo = getCustomerLoyalty(customerMobile, allBills);
  const todaySummary = getDailySalesSummary(allBills);

  const currentDevTerminalId = getCurrentDeviceTerminalId();
  const terminals = config.terminals || [];
  const activeTerminal = terminals.find((t) => t.id === currentDevTerminalId) || terminals[0];
  const counters = config.counters || [];
  const effectiveCounterId = userSession?.role === 'counter' && userSession.counterId
    ? userSession.counterId
    : (config.activeCounterId || counters[0]?.id || 'counter-1');
  const activeCounter = counters.find((c) => c.id === effectiveCounterId) || counters[0];

  // Auto-fill customer name if empty and previous repeat customer found
  useEffect(() => {
    if (loyaltyInfo && !customerName.trim() && loyaltyInfo.customerName && loyaltyInfo.customerName !== 'Walk-in Customer') {
      setCustomerName(loyaltyInfo.customerName);
    }
  }, [customerMobile, loyaltyInfo]);

  // Handle incoming editingBill
  useEffect(() => {
    if (editingBill) {
      setCustomerName(editingBill.customerName || '');
      setCustomerMobile(editingBill.customerMobile || '');
      setOrderType(editingBill.orderType || 'counter');
      setDeliveryDate(editingBill.deliveryDate || '');
      setDeliveryTime(editingBill.deliveryTime || '');
      setCakeMessage(editingBill.cakeMessage || '');
      setItems(editingBill.items || []);
      setDiscountType(editingBill.discountType || 'flat');
      setDiscountValue(editingBill.discountValue || 0);
      setTaxPercent(editingBill.taxPercent || 0);
      setPaymentMethod(editingBill.paymentMethod || 'Cash');
      setPaymentStatusType(
        editingBill.status === 'paid'
          ? 'full'
          : editingBill.advancePaid > 0
          ? 'partial'
          : 'due'
      );
      setPartialAmount(editingBill.advancePaid || 0);
      setSuccessToast(
        lang === 'bn'
          ? `বিল ${editingBill.billNo} এডিট মোডে খোলা হয়েছে!`
          : `Bill ${editingBill.billNo} opened in edit mode!`
      );
    }
  }, [editingBill, lang]);

  const productInputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions
  useEffect(() => {
    if (productName.trim().length > 0) {
      const q = productName.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.nameEn.toLowerCase().includes(q) ||
          p.nameBn.includes(q) ||
          p.category.toLowerCase().includes(q)
      );
      setProductSuggestions(filtered.slice(0, 5));
    } else {
      setProductSuggestions([]);
    }
  }, [productName, products]);

  // Handle select product from preset or quick pick
  const handleSelectProduct = (product: BakeryProduct) => {
    const name = lang === 'bn' ? product.nameBn : product.nameEn;
    setProductName(name);
    setShowSuggestions(false);

    // Auto calculate rate for selected weight
    const weightOpt = STANDARD_WEIGHT_OPTIONS.find((w) => w.value === selectedWeight);
    const multiplier = weightOpt ? weightOpt.multiplier : 1;
    setRate((product.defaultRate * multiplier).toFixed(0));
  };

  // When weight changes, adjust rate if matching a product
  const handleWeightChange = (newWeight: string) => {
    setSelectedWeight(newWeight);
    const weightOpt = STANDARD_WEIGHT_OPTIONS.find((w) => w.value === newWeight);
    const multiplier = weightOpt ? weightOpt.multiplier : 1;

    // Check if current productName matches any product
    const matched = products.find(
      (p) => p.nameEn.toLowerCase() === productName.toLowerCase() || p.nameBn === productName
    );
    if (matched) {
      setRate((matched.defaultRate * multiplier).toFixed(0));
    }
  };

  // Add Item to bill
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pName = productName.trim();
    const numericRate = parseFloat(rate);
    const numericQty = Number(qty);

    if (!pName) {
      alert(lang === 'bn' ? 'দয়া করে প্রোডাক্ট বা কেকের নাম লিখুন।' : 'Please enter product name.');
      productInputRef.current?.focus();
      return;
    }
    if (isNaN(numericRate) || numericRate < 0) {
      alert(lang === 'bn' ? 'সঠিক রেট / দর দিন।' : 'Please enter a valid rate.');
      return;
    }
    if (numericQty <= 0) {
      alert(lang === 'bn' ? 'পরিমাণ কমপক্ষে ১ হতে হবে।' : 'Quantity must be at least 1.');
      return;
    }

    const newItem: BillItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: pName,
      weightOrSize: selectedWeight,
      qty: numericQty,
      rate: numericRate,
      total: numericQty * numericRate,
      notes: itemNotes.trim() || undefined
    };

    setItems([...items, newItem]);
    // Reset item inputs
    setProductName('');
    setRate('');
    setQty(1);
    setItemNotes('');
    setShowSuggestions(false);
    productInputRef.current?.focus();
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItemQty = (id: string, delta: number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.qty + delta);
          return {
            ...item,
            qty: newQty,
            total: newQty * item.rate
          };
        }
        return item;
      })
    );
  };

  const handleClearAllItems = () => {
    if (!items.length) return;
    setItems([]);
    showNotification(lang === 'bn' ? 'সব আইটেম সফলভাবে সরানো হয়েছে।' : 'All cart items cleared.');
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = (subtotal * Math.min(100, Math.max(0, discountValue))) / 100;
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const amountBeforeLoyalty = Math.max(0, taxableAmount + taxAmount);

  // Loyalty Program: Points based on total order value (default: 1 pt per ₹100)
  const pointsPerHundred = config.loyaltyPointsPerHundred || 1;
  const pointsEarned = Math.floor(amountBeforeLoyalty / 100) * pointsPerHundred;

  // Loyalty Points Redemption: 1 Point = ₹1 discount
  const maxRedeemablePoints = loyaltyInfo ? Math.min(loyaltyInfo.pointsBalance, Math.floor(amountBeforeLoyalty)) : 0;
  const effectivePointsRedeemed = redeemLoyaltyPoints ? Math.min(maxRedeemablePoints, Math.max(0, pointsToRedeemInput)) : 0;
  const loyaltyDiscountAmount = effectivePointsRedeemed;

  const grandTotal = Math.max(0, amountBeforeLoyalty - loyaltyDiscountAmount);

  // Payment & Due Calculations
  let actualPaidAmount = 0;
  let calculatedDueAmount = 0;

  if (paymentMethod === 'Due' || paymentStatusType === 'due') {
    actualPaidAmount = 0;
    calculatedDueAmount = grandTotal;
  } else if (paymentStatusType === 'partial') {
    actualPaidAmount = Math.min(grandTotal, Math.max(0, partialAmount));
    calculatedDueAmount = Math.max(0, grandTotal - actualPaidAmount);
  } else {
    // 'full' payment mode (Cash, UPI, Card) - 100% PAID
    actualPaidAmount = grandTotal;
    calculatedDueAmount = 0;
  }

  const effectiveAdvance = actualPaidAmount;
  const dueAmount = calculatedDueAmount;
  const billStatus: 'paid' | 'due' = calculatedDueAmount > 0 ? 'due' : 'paid';

  // Cash change return calculation
  const cashChangeReturn =
    paymentMethod === 'Cash' && cashTendered > actualPaidAmount
      ? cashTendered - actualPaidAmount
      : 0;

  const activeCounterTag = activeCounter?.code || activeCounter?.name?.replace(/[^a-zA-Z0-9]/g, '') || 'C1';
  const currentBillNo = formatBillNumber(billSequence, config.billPrefix, activeCounterTag);

  // Dynamic UPI payable amount based on current bill status
  const payableUpiAmount = actualPaidAmount > 0 ? actualPaidAmount : grandTotal;

  useEffect(() => {
    setInlineUpiInput(config.upiId || '7866971421@okaxis');
  }, [config.upiId]);

  // Compute live UPI QR Code whenever amount, bill number, or shop handle changes
  useEffect(() => {
    const upiStr = generateUpiString(config, payableUpiAmount, currentBillNo);
    generateQrDataUrl(upiStr).then((url) => {
      setInlineQrUrl(url);
    });
  }, [config.upiId, config.shopName, payableUpiAmount, currentBillNo]);

  const handleSaveInlineUpi = (newId: string) => {
    const trimmed = newId.trim();
    if (!trimmed || !trimmed.includes('@')) {
      alert(lang === 'bn' ? 'সঠিক UPI ID লিখুন (যেমন: 7866971421@ybl বা আপনার_নাম@okaxis)' : 'Enter valid UPI ID (e.g. 7866971421@ybl)');
      return;
    }
    const updated: ShopConfig = {
      ...config,
      upiId: trimmed
    };
    saveShopConfig(updated);
    if (setConfig) setConfig(updated);
    setIsEditingInlineUpi(false);
    showNotification(lang === 'bn' ? 'দোকানের UPI হ্যান্ডেল সংরক্ষিত হয়েছে!' : 'Shop UPI handle updated successfully!');
  };

  const handleCopyUpiHandle = () => {
    navigator.clipboard.writeText(config.upiId || '7866971421@okaxis');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Build Bill Object
  const buildCurrentBill = (): Bill => {
    const counters = config.counters || [];
    const chosenCounterId = userSession?.role === 'counter' && userSession.counterId
      ? userSession.counterId
      : (config.activeCounterId || counters[0]?.id);
    const chosenCounter = counters.find((c) => c.id === chosenCounterId) || counters[0];

    const currentDevTerminalId = getCurrentDeviceTerminalId();
    const terminals = config.terminals || [];
    const activeTerminal = terminals.find((t) => t.id === currentDevTerminalId) || terminals[0];

    return {
      id: editingBill ? editingBill.id : `bill-${Date.now()}`,
      billNo: editingBill ? editingBill.billNo : currentBillNo,
      sequence: editingBill ? editingBill.sequence : billSequence,
      date: editingBill ? editingBill.date : new Date().toISOString(),
      createdAt: editingBill ? editingBill.createdAt : Date.now(),
      customerName: customerName.trim() || 'Walk-in Customer',
      customerMobile: customerMobile.trim(),
      orderType,
      deliveryDate: deliveryDate || undefined,
      deliveryTime: deliveryTime || undefined,
      cakeMessage: cakeMessage.trim() || undefined,
      items,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxPercent,
      taxAmount,
      grandTotal,
      advancePaid: actualPaidAmount,
      dueAmount: calculatedDueAmount,
      paymentMethod,
      status: billStatus,
      counterId: editingBill?.counterId || chosenCounter?.id,
      counterName: editingBill?.counterName || (userSession?.role === 'counter' && userSession.counterName ? userSession.counterName : chosenCounter?.name),
      terminalId: editingBill?.terminalId || activeTerminal?.id,
      terminalName: editingBill?.terminalName || activeTerminal?.name,
      loyaltyPointsEarned: pointsEarned,
      loyaltyPointsRedeemed: effectivePointsRedeemed,
      loyaltyDiscountAmount: loyaltyDiscountAmount
    };
  };

  // Save current bill & start next
  const handleSaveAndNewBill = () => {
    if (!items.length) {
      alert(lang === 'bn' ? 'কমপক্ষে একটি আইটেম যোগ করুন।' : 'Add at least one item before saving.');
      return;
    }

    const isEditing = Boolean(editingBill);
    const bill = buildCurrentBill();
    saveBill(bill);
    saveBillToFirestore(bill).catch((e) => console.warn('Firestore cloud sync notice:', e));

    // Automatically update Customer CRM & Loyalty in Firestore for cross-terminal sync
    const cleanMob = (bill.customerMobile || '').replace(/\D/g, '');
    let updatedCustomer: CustomerLoyalty | null = null;
    if (cleanMob.length >= 8) {
      updatedCustomer = {
        customerMobile: cleanMob,
        customerName: bill.customerName || 'Customer',
        totalOrders: (loyaltyInfo?.totalOrders || 0) + (isEditing ? 0 : 1),
        totalSpent: (loyaltyInfo?.totalSpent || 0) + (isEditing ? 0 : bill.grandTotal),
        pointsBalance: Math.max(0, (loyaltyInfo?.pointsBalance || 0) + (bill.loyaltyPointsEarned || 0) - (bill.loyaltyPointsRedeemed || 0)),
        lastVisitDate: bill.date,
        tierId: loyaltyInfo?.tierId,
        tierName: loyaltyInfo?.tierName,
        tierBadge: loyaltyInfo?.tierBadge,
        suggestedDiscountPercent: loyaltyInfo?.suggestedDiscountPercent,
        updatedAt: Date.now()
      };
      saveStoredCustomer(updatedCustomer);
      saveCustomerToFirestore(updatedCustomer).catch((err) => console.warn('Customer CRM firestore sync notice:', err));
    }

    // Automatically dispatch Digital Receipt & Loyalty Tier Update via SMS API to customer mobile
    if (autoSendSms && cleanMob.length >= 10) {
      sendBillReceiptAndLoyaltySms(bill, config, updatedCustomer || loyaltyInfo).then((smsRes) => {
        if (smsRes.success) {
          setLastSmsDelivery({
            billNo: bill.billNo,
            phone: cleanMob,
            provider: smsRes.provider || 'SMS Gateway',
            messageId: smsRes.messageId || 'SENT',
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          });
          showNotification(
            lang === 'bn'
              ? `বিল ${bill.billNo} সংরক্ষিত! ডিজিটাল রসিদ ও লয়ালটি SMS গ্রাহকের নম্বরে (+91${cleanMob.slice(-10)}) পাঠানো হয়েছে (${smsRes.provider || 'SMS Gateway'})`
              : `Bill ${bill.billNo} saved! Receipt & loyalty SMS sent to customer (+91${cleanMob.slice(-10)}) via ${smsRes.provider || 'SMS Gateway'}`
          );
        } else {
          console.warn('SMS dispatch notice:', smsRes.error);
        }
      }).catch((e) => console.warn('SMS dispatch error:', e));
    }

    // Automatically push finalized bill summary to Google Sheets if connected
    if (isAutoSheetsSyncEnabled()) {
      getAccessToken().then((t) => {
        if (t) {
          appendBillToGoogleSheet(t, bill, config.shopName).catch((e) =>
            console.warn('Google Sheet auto-push notice:', e)
          );
        }
      });
    }

    if (isEditing) {
      if (onCancelEditBill) onCancelEditBill();
    } else {
      const nextSeq = incrementBillSequence();
      setBillSequence(nextSeq);
    }

    // Reset form
    setItems([]);
    setCustomerName('');
    setCustomerMobile('');
    setOrderType('counter');
    setDeliveryDate('');
    setDeliveryTime('');
    setCakeMessage('');
    setDiscountValue(0);
    setPaymentStatusType('full');
    setPartialAmount(0);
    setCashTendered(0);
    setPaymentMethod('Cash');
    setRedeemLoyaltyPoints(false);
    setPointsToRedeemInput(0);

    showNotification(
      isEditing
        ? (lang === 'bn' ? `বিল ${bill.billNo} সফলভাবে আপডেট হয়েছে!` : `Bill ${bill.billNo} updated successfully!`)
        : (lang === 'bn' ? `বিল ${bill.billNo} সফলভাবে সংরক্ষিত ও সিঙ্ক হয়েছে!` : `Bill ${bill.billNo} saved & recorded!`)
    );
  };

  const handlePrint = (overrideFormat?: ReceiptFormat) => {
    if (!items.length) {
      alert(lang === 'bn' ? 'প্রিন্ট করার আগে অন্তত একটি আইটেম যোগ করুন।' : 'Add at least one item to print.');
      return;
    }
    const isEditing = Boolean(editingBill);
    const bill = buildCurrentBill();
    // Auto save bill to register on print if not already saved
    saveBill(bill);
    saveBillToFirestore(bill).catch((e) => console.warn('Firestore cloud sync notice:', e));

    const cleanMob = (bill.customerMobile || '').replace(/\D/g, '');
    let updatedCustomer: CustomerLoyalty | null = null;
    if (cleanMob.length >= 8) {
      updatedCustomer = {
        customerMobile: cleanMob,
        customerName: bill.customerName || 'Customer',
        totalOrders: (loyaltyInfo?.totalOrders || 0) + 1,
        totalSpent: (loyaltyInfo?.totalSpent || 0) + bill.grandTotal,
        pointsBalance: Math.max(0, (loyaltyInfo?.pointsBalance || 0) + (bill.loyaltyPointsEarned || 0) - (bill.loyaltyPointsRedeemed || 0)),
        lastVisitDate: bill.date,
        tierId: loyaltyInfo?.tierId,
        tierName: loyaltyInfo?.tierName,
        tierBadge: loyaltyInfo?.tierBadge,
        suggestedDiscountPercent: loyaltyInfo?.suggestedDiscountPercent,
        updatedAt: Date.now()
      };
      saveStoredCustomer(updatedCustomer);
      saveCustomerToFirestore(updatedCustomer).catch((err) => console.warn('Customer CRM firestore sync notice:', err));
    }

    // Automatically dispatch Digital Receipt & Loyalty Tier Update via SMS API on print
    if (autoSendSms && cleanMob.length >= 10) {
      sendBillReceiptAndLoyaltySms(bill, config, updatedCustomer || loyaltyInfo).then((smsRes) => {
        if (smsRes.success) {
          setLastSmsDelivery({
            billNo: bill.billNo,
            phone: cleanMob,
            provider: smsRes.provider || 'SMS Gateway',
            messageId: smsRes.messageId || 'SENT',
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          });
        }
      }).catch((e) => console.warn('SMS print dispatch error:', e));
    }

    // Automatically push finalized bill summary to Google Sheets if connected
    if (isAutoSheetsSyncEnabled()) {
      getAccessToken().then((t) => {
        if (t) {
          appendBillToGoogleSheet(t, bill, config.shopName).catch((e) =>
            console.warn('Google Sheet auto-push notice:', e)
          );
        }
      });
    }

    onPrintRequested(bill, overrideFormat || receiptFormat);

    // If new bill, automatically advance sequence and reset items for next customer so bill number never repeats
    if (!isEditing) {
      const nextSeq = incrementBillSequence();
      setBillSequence(nextSeq);
      setItems([]);
      setCustomerName('');
      setCustomerMobile('');
      setOrderType('counter');
      setDeliveryDate('');
      setDeliveryTime('');
      setCakeMessage('');
      setDiscountValue(0);
      setPaymentStatusType('full');
      setPartialAmount(0);
      setCashTendered(0);
      setPaymentMethod('Cash');
      setRedeemLoyaltyPoints(false);
      setPointsToRedeemInput(0);
      showNotification(
        lang === 'bn'
          ? `বিল #${bill.billNo} প্রিন্ট ও সেভ হয়েছে! পরবর্তী নতুন বিল: #${formatBillNumber(nextSeq, config.billPrefix, activeCounterTag)}`
          : `Bill #${bill.billNo} saved & printed! Next invoice: #${formatBillNumber(nextSeq, config.billPrefix, activeCounterTag)}`
      );
    } else {
      if (onCancelEditBill) onCancelEditBill();
    }
  };

  const handleStartFreshBill = () => {
    const nextSeq = getNextBillSequence(bills);
    setBillSequence(nextSeq);
    setItems([]);
    setCustomerName('');
    setCustomerMobile('');
    setOrderType('counter');
    setDeliveryDate('');
    setDeliveryTime('');
    setCakeMessage('');
    setDiscountValue(0);
    setPaymentStatusType('full');
    setPartialAmount(0);
    setCashTendered(0);
    setPaymentMethod('Cash');
    setRedeemLoyaltyPoints(false);
    setPointsToRedeemInput(0);
    if (onCancelEditBill) onCancelEditBill();
    showNotification(
      lang === 'bn'
        ? `নতুন ইনভয়েস শুরু করা হয়েছে: #${formatBillNumber(nextSeq, config.billPrefix, activeCounterTag)}`
        : `New invoice started: #${formatBillNumber(nextSeq, config.billPrefix, activeCounterTag)}`
    );
  };

  const handleWhatsApp = () => {
    if (!items.length) {
      alert(lang === 'bn' ? 'প্রোডাক্ট যোগ করুন।' : 'Please add items first.');
      return;
    }
    const bill = buildCurrentBill();
    openWhatsAppShare(bill, config);
  };

  const handleSendSms = () => {
    if (!items.length) {
      alert(lang === 'bn' ? 'প্রোডাক্ট যোগ করুন।' : 'Please add items first.');
      return;
    }
    const bill = buildCurrentBill();
    openSmsShare(bill, config);
    setIsSmsModalOpen(true);
  };

  const handleDirectSendSmsApi = async () => {
    if (!items.length) {
      alert(lang === 'bn' ? 'প্রোডাক্ট যোগ করুন।' : 'Please add items first.');
      return;
    }
    const cleanMob = customerMobile.replace(/\D/g, '');
    if (cleanMob.length < 10) {
      alert(lang === 'bn' ? 'দয়া করে গ্রাহকের সঠিক ১০-সংখ্যার মোবাইল নম্বর দিন।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    const bill = buildCurrentBill();
    setIsSmsSending(true);
    try {
      const res = await sendBillReceiptAndLoyaltySms(bill, config, loyaltyInfo);
      if (res.success) {
        setLastSmsDelivery({
          billNo: bill.billNo,
          phone: cleanMob,
          provider: res.provider || 'SMS Gateway',
          messageId: res.messageId || 'SENT',
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        });
        showNotification(
          lang === 'bn'
            ? `ডিজিটাল রসিদ ও লয়ালটি SMS গ্রাহকের নম্বরে (+91${cleanMob}) সফলভাবে পাঠানো হয়েছে (${res.provider || 'SMS Gateway'})!`
            : `Digital receipt & loyalty SMS sent to +91${cleanMob} via ${res.provider || 'SMS Gateway'}!`
        );
      } else {
        alert(lang === 'bn' ? `SMS পাঠানো যায়নি: ${res.error}` : `Failed to send SMS: ${res.error}`);
      }
    } catch (err: any) {
      alert(`SMS Gateway Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsSmsSending(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Popular Quick Pick cakes
  const popularCakes = products.filter((p) => p.popular).slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Banner */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-100 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Editing Existing Bill Mode Banner */}
      {editingBill && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between text-sm animate-in fade-in duration-150 border border-amber-500">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm block">
                {lang === 'bn' ? `বিল এডিট মোড: ${editingBill.billNo}` : `Editing Bill: ${editingBill.billNo}`}
              </span>
              <span className="text-xs text-amber-100">
                {lang === 'bn' ? 'আইটেম বা তথ্য পরিবর্তন করে নিচে সেভ বা প্রিন্ট চাপুন' : 'Make changes and click Save or Print to update'}
              </span>
            </div>
          </div>
          {onCancelEditBill && (
            <button
              type="button"
              onClick={onCancelEditBill}
              className="px-3 py-1.5 bg-white text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-50 shadow-xs transition-colors"
            >
              {lang === 'bn' ? 'এডিট বাতিল করুন' : 'Cancel Edit'}
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Left = Input & Items, Right = Live Bill Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Customer info & Items Entry (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer & Order Metadata Card */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80">
            {/* Active Station & Counter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 mb-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Active System Terminal Button */}
                <button
                  type="button"
                  onClick={() => setIsMultiSystemModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-amber-300 hover:border-indigo-300 rounded-lg text-slate-800 transition-colors shadow-2xs"
                  title="Switch or pair multiple system terminals / একাধিক সিস্টেমে ব্যবহার"
                >
                  <Laptop className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="font-bold text-slate-700">
                    {lang === 'bn' ? 'সিস্টেম:' : 'System:'}{' '}
                    <span className="font-mono text-indigo-900 bg-indigo-50 px-1 py-0.5 rounded font-extrabold">
                      {activeTerminal?.code || 'S1'}
                    </span>
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </button>

                {/* Counter Selector / Indicator */}
                {userSession?.role === 'counter' ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/90 border border-amber-300 rounded-lg text-xs shadow-2xs">
                    <Store className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                    <span className="font-bold text-amber-950">
                      {lang === 'bn' ? 'কাউন্টার:' : 'Counter:'}
                    </span>
                    <span className="font-black text-amber-900 font-mono">
                      {activeCounter?.code || 'C1'} - {lang === 'bn' ? (activeCounter?.nameBn || activeCounter?.name) : activeCounter?.name}
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                      {userSession.userName}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-amber-800 shrink-0" />
                    <span className="font-bold text-amber-950">
                      {lang === 'bn' ? 'কাউন্টার:' : 'Counter:'}
                    </span>
                    <select
                      value={config.activeCounterId || (config.counters && config.counters[0]?.id) || 'counter-1'}
                      onChange={(e) => {
                        const newId = e.target.value;
                        const updated: ShopConfig = {
                          ...config,
                          activeCounterId: newId
                        };
                        saveShopConfig(updated);
                        if (setConfig) setConfig(updated);
                        showNotification(
                          lang === 'bn'
                            ? `কাউন্টার পরিবর্তন করা হয়েছে!`
                            : `Counter switched!`
                        );
                      }}
                      className="px-2 py-1 font-bold text-slate-900 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4b1d3f]"
                    >
                      {(config.counters || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}: {lang === 'bn' ? (c.nameBn || c.name) : c.name} {c.cashierName ? `(${c.cashierName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {onOpenDailySummary && (
                  <button
                    type="button"
                    onClick={onOpenDailySummary}
                    className="py-1 px-2.5 bg-amber-400/30 hover:bg-amber-400/50 text-amber-950 border border-amber-300 rounded-lg font-bold flex items-center gap-1 shadow-2xs transition-colors"
                    title="View Daily Sales Summary & Closing"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-amber-900" />
                    <span>
                      {lang === 'bn'
                        ? `আজকের হিসাব: ₹${todaySummary.totalRevenue.toFixed(0)} (${todaySummary.totalOrders})`
                        : `Today: ₹${todaySummary.totalRevenue.toFixed(0)} (${todaySummary.totalOrders})`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsMultiSystemModalOpen(true)}
                  className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs transition-colors"
                  title="Multi-System & Device Pairing Setup"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'মাল্টি-সিস্টেম' : 'Multi-System'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCounterModalOpen(true)}
                  className="py-1 px-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs transition-colors"
                  title="Add or Manage Counters"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'কাউন্টার' : 'Counter'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#4b1d3f]" />
                <span>{t.customerDetails}</span>
              </h2>

              {/* Order Type Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('counter');
                    setPaymentStatusType('full');
                    if (paymentMethod === 'Due') setPaymentMethod('Cash');
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    orderType === 'counter' ? 'bg-white text-[#4b1d3f] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.counterOrder}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('advance_booking');
                    setPaymentStatusType('partial');
                    if (partialAmount === 0 && grandTotal > 0) setPartialAmount(Math.round(grandTotal / 2));
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    orderType === 'advance_booking' ? 'bg-white text-[#4b1d3f] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.advanceOrder}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    orderType === 'delivery' ? 'bg-white text-[#4b1d3f] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.deliveryOrder}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.customerName}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t.customerNamePlaceholder}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4b1d3f]/20 focus:border-[#4b1d3f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>{t.mobileNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsScanMemberModalOpen(true)}
                      className="text-[10px] font-bold text-[#4b1d3f] hover:text-[#38152e] flex items-center gap-1 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors border border-amber-300 shadow-2xs"
                      title="Scan VIP Membership Card QR Code or enter Card Number"
                    >
                      <QrCode className="w-3 h-3 text-[#4b1d3f]" />
                      <span>{lang === 'bn' ? 'মেম্বার QR স্ক্যান' : 'Scan Member QR'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">WhatsApp receipt</span>
                  </div>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder={t.mobilePlaceholder}
                    maxLength={10}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4b1d3f]/20 focus:border-[#4b1d3f] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SMS Digital Receipt & Loyalty Update Auto-Send Bar */}
            <div className="mt-3 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={autoSendSms}
                  onChange={(e) => setAutoSendSms(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-blue-950 font-extrabold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    {lang === 'bn' ? 'বিল তৈরি হলে সরাসরি SMS পাঠান (SMS API)' : 'Auto-Send SMS Receipt & Loyalty Update'}
                  </span>
                  {customerMobile.trim().length >= 10 && autoSendSms && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                      Ready (+91{customerMobile.trim().slice(-10)})
                    </span>
                  )}
                </div>
              </label>

              <div className="flex items-center gap-1.5">
                {customerMobile.trim().length >= 10 && (
                  <button
                    type="button"
                    onClick={handleDirectSendSmsApi}
                    disabled={isSmsSending}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Send digital receipt and loyalty tier update right now via SMS API"
                  >
                    {isSmsSending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>{isSmsSending ? 'Sending...' : (lang === 'bn' ? 'এখনই SMS পাঠান' : 'Send SMS Now')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSendSms}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                  title="Open SMS Preview & Dispatcher"
                >
                  {lang === 'bn' ? 'প্রিভিউ' : 'Preview'}
                </button>
              </div>
            </div>

            {/* Last Dispatched SMS Delivery Confirmation Banner */}
            {lastSmsDelivery && (
              <div className="mt-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px] text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {lang === 'bn'
                      ? `SMS সফলভাবে পাঠানো হয়েছে: +91${lastSmsDelivery.phone} (বিল: ${lastSmsDelivery.billNo})`
                      : `SMS Dispatched: +91${lastSmsDelivery.phone} (Bill: ${lastSmsDelivery.billNo})`}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                  {lastSmsDelivery.provider} • {lastSmsDelivery.time}
                </span>
              </div>
            )}

            {/* Customer Loyalty Program Tracker */}
            {customerMobile.trim().length >= 6 && (
              <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-purple-500/5 border border-amber-200/80 rounded-xl space-y-2.5">
                {loyaltyInfo && loyaltyInfo.totalOrders > 0 ? (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-extrabold text-xs text-amber-950">
                          {lang === 'bn'
                            ? `নিয়মিত গ্রাহক • ভিজিট #${loyaltyInfo.totalOrders + 1}`
                            : `Repeat Customer • Visit #${loyaltyInfo.totalOrders + 1}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[10px]">
                          {loyaltyInfo.totalOrders >= 10
                            ? 'VIP Platinum'
                            : loyaltyInfo.totalOrders >= 5
                            ? 'Gold Member'
                            : loyaltyInfo.totalOrders >= 2
                            ? 'Silver Member'
                            : 'Bronze Member'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsLoyaltyModalOpen(true)}
                          className="text-[11px] font-bold text-[#4b1d3f] hover:underline flex items-center gap-1"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'লয়ালটি হিস্ট্রি' : 'History'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsMembershipModalOpen(true)}
                          className="px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#4b1d3f] text-[11px] font-black flex items-center gap-1 shadow-2xs transition-colors"
                          title="View & Print VIP Membership Card with QR code"
                        >
                          <CreditCard className="w-3 h-3 text-[#4b1d3f]" />
                          <span>{lang === 'bn' ? 'মেম্বার কার্ড (QR)' : 'VIP Card'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-white/80 rounded-lg border border-amber-200/60">
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          {t.pointsBalance}
                        </span>
                        <span className="text-sm font-extrabold text-[#4b1d3f] font-mono block">
                          {loyaltyInfo.pointsBalance} pts
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          (₹{loyaltyInfo.pointsBalance} value)
                        </span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-lg border border-amber-200/60">
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          {t.lifetimeSpent}
                        </span>
                        <span className="text-sm font-extrabold text-slate-800 font-mono block">
                          ₹{loyaltyInfo.totalSpent}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          total order value
                        </span>
                      </div>
                      <div className="p-2 bg-white/80 rounded-lg border border-amber-200/60">
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          {t.visitCount}
                        </span>
                        <span className="text-sm font-extrabold text-emerald-800 font-mono block">
                          {loyaltyInfo.totalOrders} {lang === 'bn' ? 'বার' : 'times'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          repeat visits
                        </span>
                      </div>
                    </div>

                    {/* Points Redemption Section */}
                    {loyaltyInfo.pointsBalance > 0 && (
                      <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2 bg-white/60 p-2 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={redeemLoyaltyPoints}
                            onChange={(e) => {
                              setRedeemLoyaltyPoints(e.target.checked);
                              if (e.target.checked && pointsToRedeemInput === 0) {
                                setPointsToRedeemInput(
                                  Math.min(loyaltyInfo.pointsBalance, Math.floor(amountBeforeLoyalty))
                                );
                              }
                            }}
                            className="w-4 h-4 text-[#4b1d3f] rounded focus:ring-[#4b1d3f]"
                          />
                          <span>
                            {lang === 'bn'
                              ? `পয়েন্টস রিডিম করুন (১ পয়েন্ট = ₹১ ছাড়)`
                              : `Redeem Points (1 pt = ₹1 discount)`}
                          </span>
                        </label>

                        {redeemLoyaltyPoints && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 font-semibold">
                              {lang === 'bn' ? 'ব্যবহার:' : 'Use:'}
                            </span>
                            <input
                              type="number"
                              min="1"
                              max={Math.min(loyaltyInfo.pointsBalance, Math.floor(amountBeforeLoyalty))}
                              value={pointsToRedeemInput || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setPointsToRedeemInput(
                                  Math.min(val, loyaltyInfo.pointsBalance, Math.floor(amountBeforeLoyalty))
                                );
                              }}
                              className="w-16 px-2 py-1 text-xs border border-amber-300 rounded font-mono font-bold text-center bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setPointsToRedeemInput(
                                  Math.min(loyaltyInfo.pointsBalance, Math.floor(amountBeforeLoyalty))
                                )
                              }
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-extrabold rounded"
                            >
                              Max ({Math.min(loyaltyInfo.pointsBalance, Math.floor(amountBeforeLoyalty))})
                            </button>
                            {loyaltyDiscountAmount > 0 && (
                              <span className="text-xs font-bold text-emerald-800">
                                -₹{loyaltyDiscountAmount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between text-xs text-amber-900 bg-white/70 p-2.5 rounded-lg border border-amber-200/50">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-semibold">
                        {lang === 'bn'
                          ? `নতুন গ্রাহক! এই বিলে মোট অর্ডার মূল্য থেকে +${pointsEarned} লয়ালটি পয়েন্টস পাবেন।`
                          : `First-time customer! Will earn +${pointsEarned} loyalty points on this order.`}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#4b1d3f]">
                      +{pointsEarned} pts
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Advance Booking / Delivery Specific Fields */}
            {(orderType === 'advance_booking' || orderType === 'delivery') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-dashed border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#4b1d3f]" />
                    <span>{t.deliveryDateTime}</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                    />
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-28 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Cake className="w-3.5 h-3.5 text-[#4b1d3f]" />
                    <span>{t.cakeMessage}</span>
                  </label>
                  <input
                    type="text"
                    value={cakeMessage}
                    onChange={(e) => setCakeMessage(e.target.value)}
                    placeholder={t.cakeMessagePlaceholder}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Add Item Form Card */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80">
            {/* Quick Pick Cakes Bar */}
            <div className="mb-4 pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-600 mb-2 block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.quickPick}</span>
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {popularCakes.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#4b1d3f] hover:bg-amber-50/40 text-xs font-medium text-slate-700 hover:text-[#4b1d3f] transition-all whitespace-nowrap shrink-0 group"
                  >
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.nameEn}
                        className="w-5 h-5 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span>{lang === 'bn' ? product.nameBn : product.nameEn}</span>
                    <span className="text-[11px] font-mono text-slate-400 group-hover:text-amber-700">
                      ₹{product.defaultRate}
                    </span>
                    {typeof product.stockQuantity === 'number' && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          product.stockQuantity === 0
                            ? 'bg-rose-100 text-rose-700'
                            : product.stockQuantity <= (product.minStockAlert || 5)
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                        title="Available Stock"
                      >
                        {product.stockQuantity} {product.unit}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Row */}
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Product Name with Suggestions */}
                <div className="sm:col-span-6 relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.productLabel}
                  </label>
                  <input
                    ref={productInputRef}
                    type="text"
                    value={productName}
                    onChange={(e) => {
                      setProductName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={t.productPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4b1d3f]/20 focus:border-[#4b1d3f]"
                  />

                  {/* Dropdown Suggestions */}
                  {showSuggestions && productSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-slate-100">
                      {productSuggestions.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectProduct(prod)}
                          className="w-full text-left px-3 py-2 hover:bg-amber-50 text-xs flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">
                              {lang === 'bn' ? prod.nameBn : prod.nameEn}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-2">({prod.category})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {typeof prod.stockQuantity === 'number' && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  prod.stockQuantity === 0
                                    ? 'bg-rose-100 text-rose-700'
                                    : prod.stockQuantity <= (prod.minStockAlert || 5)
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                Stock: {prod.stockQuantity}
                              </span>
                            )}
                            <span className="font-mono text-slate-700 font-bold">₹{prod.defaultRate}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weight / Size */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.weightOrSize}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedWeight}
                      onChange={(e) => handleWeightChange(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f] bg-white font-medium appearance-none pr-7"
                    >
                      {STANDARD_WEIGHT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Qty */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.qty}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f] font-mono text-center"
                  />
                </div>
              </div>

              {/* Rate & Add Button */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600">
                      {t.rate}
                    </label>
                    {!hasPermission(userSession, 'canEditPrices', config) && (
                      <span className="text-[10px] text-amber-900 font-black flex items-center gap-1 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300">
                        <Lock className="w-2.5 h-2.5 text-amber-700" />
                        <span>{lang === 'bn' ? 'দাম পরিবর্তন লক' : 'Price locked'}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="text-slate-400 text-sm absolute left-3 top-2 font-mono">₹</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={rate}
                      readOnly={!hasPermission(userSession, 'canEditPrices', config)}
                      onChange={(e) => {
                        if (hasPermission(userSession, 'canEditPrices', config)) {
                          setRate(e.target.value);
                        }
                      }}
                      placeholder="0.00"
                      className={`w-full pl-8 pr-3 py-2 text-sm border rounded-xl font-mono font-bold ${
                        !hasPermission(userSession, 'canEditPrices', config)
                          ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                          : 'border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4b1d3f]/20 focus:border-[#4b1d3f]'
                      }`}
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Notes / Customization (Optional)
                  </label>
                  <input
                    type="text"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="e.g. Less sweet, Golden candle"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-[#4b1d3f] hover:bg-[#3c1732] text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 h-[42px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.addBtn}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Added Items Table Card */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {lang === 'bn' ? 'অর্ডারের আইটেম তালিকা' : 'Bill Items List'}
                </h3>
                <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
                  {items.length}
                </span>
              </div>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearItemsBtn}</span>
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Cake className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
                <p>{t.noItemsYet}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">Weight/Size</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                          {item.notes && <span className="text-[10px] text-slate-400 italic">{item.notes}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{item.weightOrSize}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-md px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, -1)}
                              className="text-slate-600 hover:text-slate-900 font-bold w-4 h-4 flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-slate-900 w-4 text-center">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, 1)}
                              className="text-slate-600 hover:text-slate-900 font-bold w-4 h-4 flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{item.rate.toFixed(0)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{item.total.toFixed(0)}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={() => setEditingCartItem(item)}
                            className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title="Edit item (আইটেম এডিট করুন)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Bill Summary, Totals & Payment (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 sticky top-20">
            {/* Bakery Brand & Invoice Header */}
            <div className="pb-3 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {config.logoUrl && (
                    <img
                      src={config.logoUrl}
                      alt={config.shopName || 'DELICIOUS CAKE CORNER'}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-amber-300 shadow-xs shrink-0 bg-[#2a0e23]"
                    />
                  )}
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#4b1d3f] tracking-tight uppercase leading-tight">
                      {config.shopName || 'DELICIOUS CAKE CORNER'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        100% Pure Veg
                      </span>
                      <a
                        href={config.googleMapsUrl || 'https://www.google.com/maps/place/22.7157,87.7329'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-blue-600 hover:underline flex items-center gap-0.5"
                        title="Google Maps Location"
                      >
                        <span>📍 Mansuka, Ghatal</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">INVOICE</span>
                    <button
                      type="button"
                      onClick={handleStartFreshBill}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'পরবর্তী নতুন ইনভয়েস শুরু করুন' : 'Start next fresh invoice'}
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{lang === 'bn' ? 'নতুন বিল' : 'New Bill'}</span>
                    </button>
                  </div>
                  <span className="text-lg sm:text-xl font-black text-[#4b1d3f] font-mono leading-tight">{currentBillNo}</span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 font-mono text-[9px] font-bold border border-indigo-200">
                      {activeTerminal?.code || 'S1'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 font-mono text-[9px] font-bold border border-amber-200">
                      {activeCounter?.code || 'C1'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="py-3 space-y-2 text-xs border-b border-slate-100">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-slate-600">
                <span>{t.subtotal}:</span>
                <span className="font-mono font-semibold text-slate-900 text-sm tabular-nums">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              {/* Discount inputs */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600">{t.discount}:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!hasPermission(userSession, 'canGiveDiscount', config)}
                      onClick={() => setDiscountType('flat')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        discountType === 'flat' ? 'bg-[#4b1d3f] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      ₹ Flat
                    </button>
                    <button
                      type="button"
                      disabled={!hasPermission(userSession, 'canGiveDiscount', config)}
                      onClick={() => setDiscountType('percent')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        discountType === 'percent' ? 'bg-[#4b1d3f] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      %
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        disabled={!hasPermission(userSession, 'canGiveDiscount', config)}
                        value={discountValue || ''}
                        onChange={(e) => {
                          if (hasPermission(userSession, 'canGiveDiscount', config)) {
                            setDiscountValue(parseFloat(e.target.value) || 0);
                          }
                        }}
                        placeholder="0"
                        className={`w-20 px-2 py-0.5 text-xs text-right border rounded font-mono font-bold ${
                          !hasPermission(userSession, 'canGiveDiscount', config)
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'border-slate-200'
                        }`}
                      />
                      {!hasPermission(userSession, 'canGiveDiscount', config) && (
                        <Lock className="w-2.5 h-2.5 text-amber-700 absolute left-1 top-1.5 pointer-events-none" />
                      )}
                    </div>
                  </div>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 text-[11px] font-medium">
                    <span>Discount Applied:</span>
                    <span className="font-mono tabular-nums">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {loyaltyDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 text-[11px] font-medium">
                    <span>{t.redeemDiscount}:</span>
                    <span className="font-mono tabular-nums">-₹{loyaltyDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Tax GST (optional) */}
              <div className="flex justify-between items-center text-slate-600 pt-1">
                <div className="flex items-center gap-1">
                  <span>{t.taxGst}:</span>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white font-mono"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% (Composite)</option>
                    <option value="18">18%</option>
                  </select>
                </div>
                <span className="font-mono text-slate-700 tabular-nums">
                  {taxAmount > 0 ? `+₹${taxAmount.toFixed(2)}` : '₹0.00'}
                </span>
              </div>
            </div>

            {/* Grand Total Highlight */}
            <div className="py-3 px-4 my-3 bg-amber-50 rounded-xl border border-amber-200/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 block">
                  {t.grandTotal}
                </span>
                <span className="text-[10px] text-amber-700">100% Eggless Pure Veg</span>
              </div>
              <span className="text-2xl font-black text-[#4b1d3f] font-mono tabular-nums">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Loyalty Points Earned Notification Box */}
            <div className="py-2.5 px-3.5 mb-3 bg-gradient-to-r from-amber-50 to-purple-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block leading-tight">
                    {lang === 'bn' ? 'এই অর্ডারে লয়ালটি পয়েন্টস:' : 'Points Earned on this Order:'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {config.loyaltyPointsPerHundred || 1} pt per ₹100 ({amountBeforeLoyalty > 0 ? `₹${amountBeforeLoyalty.toFixed(0)} total` : '₹0'})
                  </span>
                </div>
              </div>
              <span className="font-extrabold text-[#4b1d3f] font-mono text-sm bg-white px-2 py-0.5 rounded-lg border border-amber-300 shadow-2xs">
                +{pointsEarned} pts
              </span>
            </div>

            {/* Payment Status Mode Selector */}
            <div className="mb-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {lang === 'bn' ? 'পেমেন্ট ধরন (Payment Type):' : 'Payment Type:'}
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatusType('full');
                    if (paymentMethod === 'Due') setPaymentMethod('Cash');
                  }}
                  className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    paymentStatusType === 'full' && paymentMethod !== 'Due'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'সম্পূর্ণ জমা' : 'Full Paid'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatusType('partial');
                    if (paymentMethod === 'Due') setPaymentMethod('Cash');
                    if (partialAmount === 0) setPartialAmount(Math.round(grandTotal / 2));
                  }}
                  className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    paymentStatusType === 'partial'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{lang === 'bn' ? 'অগ্রিম / আংশিক' : 'Advance'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatusType('due');
                    setPaymentMethod('Due');
                  }}
                  className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    paymentMethod === 'Due' || paymentStatusType === 'due'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{lang === 'bn' ? 'বাকি / ধার' : 'Full Due'}</span>
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-semibold text-slate-600">{t.paymentMethod}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Cash', 'UPI', 'Card', 'Due'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method === 'UPI') {
                        setPaymentStatusType('full');
                      } else if (method === 'Due') {
                        setPaymentStatusType('due');
                      } else {
                        if (paymentStatusType === 'due') {
                          setPaymentStatusType('full');
                        }
                      }
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                      paymentMethod === method
                        ? 'bg-[#4b1d3f] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>
                      {method === 'Cash' && t.cash}
                      {method === 'UPI' && t.upi}
                      {method === 'Card' && t.card}
                      {method === 'Due' && t.due}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* INLINE UPI QR PAYMENT CARD (Configured Shop Payment Handle) */}
            {paymentMethod === 'UPI' && (
              <div className="p-4 bg-gradient-to-b from-amber-50/90 via-white to-purple-50/40 rounded-2xl border-2 border-amber-300 shadow-xs mb-3 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#4b1d3f] text-white flex items-center justify-center shadow-2xs">
                      <QrCode className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block leading-tight">
                        {lang === 'bn' ? 'UPI QR কোড পেমেন্ট' : 'UPI QR Code Payment'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        {lang === 'bn' ? 'তাত্ক্ষণিক সেটেলমেন্ট' : 'Instant Settlement'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {config.qrCodeImage && (
                      <button
                        type="button"
                        onClick={() => setShowRealStandeeInScreen(!showRealStandeeInScreen)}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                        title="Toggle between dynamic amount QR and shop standee"
                      >
                        {showRealStandeeInScreen ? '⚡ Auto ₹' : '📸 Standee'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsUpiModalOpen(true)}
                      className="p-1.5 text-slate-600 hover:text-[#4b1d3f] hover:bg-amber-100 rounded-lg transition-colors"
                      title={lang === 'bn' ? 'বড় করে কিউআর দেখুন' : 'Enlarge QR code full screen'}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Amount to Pay Ribbon */}
                <div className="py-1.5 px-3 bg-amber-100/70 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900">
                    {lang === 'bn' ? 'স্ক্যান করে প্রদেয় টাকা:' : 'Amount to Pay:'}
                  </span>
                  <span className="text-base font-black text-[#4b1d3f] font-mono tabular-nums">
                    ₹{payableUpiAmount.toFixed(2)}
                  </span>
                </div>

                {/* QR Code Presentation */}
                <div
                  onClick={() => setIsUpiModalOpen(true)}
                  className="group relative flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl shadow-inner cursor-pointer hover:border-amber-400 transition-all"
                  title="Click to enlarge QR code in full screen"
                >
                  {showRealStandeeInScreen && config.qrCodeImage ? (
                    <img
                      src={config.qrCodeImage}
                      alt="Shop Standee QR"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  ) : inlineQrUrl ? (
                    <img
                      src={inlineQrUrl}
                      alt="UPI QR Code"
                      className="w-44 h-44 object-contain group-hover:scale-102 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400 font-mono">
                      Generating UPI QR...
                    </div>
                  )}

                  {/* Hover overlay hint */}
                  <div className="absolute inset-0 bg-[#4b1d3f]/10 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity backdrop-blur-2xs">
                    <span className="bg-white/95 text-[#4b1d3f] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" />
                      {lang === 'bn' ? 'বড় করে দেখুন' : 'Click to Enlarge'}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 mt-1 font-mono">
                    {showRealStandeeInScreen ? 'Shop Official Standee QR' : `Dynamic Amount QR (₹${payableUpiAmount.toFixed(0)})`}
                  </span>
                </div>

                {/* Configured Payment Handle Bar */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[11px] font-bold text-slate-500">
                      {lang === 'bn' ? 'দোকানের UPI হ্যান্ডেল:' : 'Shop Payment Handle:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingInlineUpi(!isEditingInlineUpi)}
                      className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-0.5"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingInlineUpi ? (lang === 'bn' ? 'বাতিল' : 'Cancel') : (lang === 'bn' ? 'হ্যান্ডেল বদলান' : 'Change Handle')}</span>
                    </button>
                  </div>

                  {/* Handle display + copy button */}
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 truncate">
                      {config.upiId || '7866971421@okaxis'}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpiHandle}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                      title="Copy UPI handle to clipboard"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] text-emerald-700">{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">{lang === 'bn' ? 'কপি' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Inline Handle Editor */}
                  {isEditingInlineUpi && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={inlineUpiInput}
                          onChange={(e) => setInlineUpiInput(e.target.value)}
                          placeholder="e.g. 7866971421@ybl"
                          className="flex-1 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlineUpi(inlineUpiInput)}
                          className="px-2.5 py-1 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                      </div>

                      {/* Fast Bank Suffix Suggestions */}
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {[
                          { label: 'PhonePe', vpa: `${(config.phone || '7866971421').replace(/\D/g, '')}@ybl` },
                          { label: 'GPay Axis', vpa: `${(config.phone || '7866971421').replace(/\D/g, '')}@okaxis` },
                          { label: 'GPay SBI', vpa: `${(config.phone || '7866971421').replace(/\D/g, '')}@oksbi` },
                          { label: 'Paytm', vpa: `${(config.phone || '7866971421').replace(/\D/g, '')}@paytm` }
                        ].map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => {
                              setInlineUpiInput(s.vpa);
                              handleSaveInlineUpi(s.vpa);
                            }}
                            className="px-1.5 py-0.5 bg-white hover:bg-amber-100 border border-slate-200 rounded text-[9px] font-mono text-slate-700"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apps supported */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-slate-400" />
                      PhonePe • GPay • Paytm • BHIM
                    </span>
                    <span className="font-semibold text-slate-700">
                      {config.shopName}
                    </span>
                  </div>
                </div>

                {/* 1-Click Payment Confirmation Action */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatusType('full');
                    showNotification(
                      lang === 'bn'
                        ? 'UPI পেমেন্ট সফলভাবে পাওয়া গেছে!'
                        : 'UPI payment received & recorded!'
                    );
                  }}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'পেমেন্ট পেয়েছি (টাকা জমা)' : 'Payment Received (Confirm Paid)'}</span>
                </button>

                {onOpenQrHub && (
                  <button
                    type="button"
                    onClick={onOpenQrHub}
                    className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    title="Open Bakery QR Code Studio: App Launch, Standee & Maps"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-600" />
                    <span>{lang === 'bn' ? 'দোকানের কিউআর কোড সেন্টার ও প্রিন্ট স্ট্যান্ডি' : 'Bakery QR Studio & Counter Standee'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Cash Tendered Calculator (when Cash is selected) */}
            {paymentMethod === 'Cash' && paymentStatusType !== 'due' && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 mb-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-amber-900">
                    {lang === 'bn' ? 'কাস্টমার কত টাকা দিলেন? (Cash Received):' : 'Cash Received:'}
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 absolute left-2 top-1 text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      placeholder={actualPaidAmount.toString()}
                      className="w-24 pl-5 pr-2 py-1 text-xs border border-amber-300 rounded font-mono font-bold text-right bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Tendered Multipliers */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-amber-800 font-semibold">Quick:</span>
                  <button
                    type="button"
                    onClick={() => setCashTendered(actualPaidAmount)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-[10px] font-mono font-bold text-amber-900 border border-amber-300 transition-colors"
                  >
                    Exact ₹{Math.round(actualPaidAmount)}
                  </button>
                  {[500, 1000, 2000].map((amt) => (
                    amt > actualPaidAmount && (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashTendered(amt)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-[10px] font-mono font-bold text-amber-900 border border-amber-300 transition-colors"
                      >
                        ₹{amt}
                      </button>
                    )
                  ))}
                </div>

                {/* Change to Return Notice */}
                {cashChangeReturn > 0 && (
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-800">
                      {lang === 'bn' ? 'কাস্টমারকে ফেরত দিন (Return Change):' : 'Return Change:'}
                    </span>
                    <span className="text-sm font-black font-mono text-emerald-700">
                      ₹{cashChangeReturn.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Advance Amount Input (when Partial Advance mode is selected) */}
            {paymentStatusType === 'partial' && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 mb-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-amber-900">
                    {lang === 'bn' ? 'অগ্রিম জমা টাকা (Advance Paid):' : 'Advance Paid:'}
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 absolute left-2 top-1 text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={partialAmount || ''}
                      onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-28 pl-5 pr-2 py-1 text-xs border border-amber-300 rounded font-mono font-bold text-right bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Advance Percentages */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-800 font-semibold">Quick Pick:</span>
                  <button
                    type="button"
                    onClick={() => setPartialAmount(Math.round(grandTotal * 0.5))}
                    className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-[10px] font-mono font-bold text-amber-900 border border-amber-300 transition-colors"
                  >
                    50% (₹{Math.round(grandTotal * 0.5)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartialAmount(Math.round(grandTotal * 0.7))}
                    className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-[10px] font-mono font-bold text-amber-900 border border-amber-300 transition-colors"
                  >
                    70% (₹{Math.round(grandTotal * 0.7)})
                  </button>
                </div>
              </div>
            )}

            {/* Payment Summary Box (Paid vs Due) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 mb-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  {lang === 'bn' ? 'জমা হয়েছে (Paid Amount):' : 'Paid Amount:'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-extrabold text-sm text-emerald-700 tabular-nums">
                    ₹{actualPaidAmount.toFixed(2)}
                  </span>
                  {actualPaidAmount === grandTotal && grandTotal > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      PAID
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-800">
                  {lang === 'bn' ? 'বাকি টাকা (Due Balance):' : 'Due Balance:'}
                </span>
                <span
                  className={`font-mono font-extrabold text-sm tabular-nums ${
                    calculatedDueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  ₹{calculatedDueAmount.toFixed(2)} {calculatedDueAmount === 0 && <span className="text-[10px] font-normal text-emerald-600">(পরিশোধিত)</span>}
                </span>
              </div>
            </div>

            {/* Quick UPI QR Trigger / Fullscreen button */}
            <div className="mb-4">
              {paymentMethod === 'UPI' ? (
                <button
                  type="button"
                  onClick={() => setIsUpiModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <Maximize2 className="w-4 h-4 text-purple-700" />
                  <span>{lang === 'bn' ? 'বড় স্ক্রিনে কিউআর কোড দেখুন (Full Screen QR)' : 'Open Fullscreen UPI QR Modal'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('UPI');
                    setPaymentStatusType('full');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <QrCode className="w-4 h-4 text-amber-700" />
                  <span>{lang === 'bn' ? 'UPI QR কোড স্ক্যান করুন' : 'Scan UPI QR Code'} ({config.upiId || '7866971421@okaxis'})</span>
                </button>
              )}
            </div>

            {/* Active Printer Fleet Bar */}
            <div className="mb-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <Printer className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-[11px] font-bold text-slate-500 shrink-0">Printer:</span>
                <select
                  value={config.activePrinterId || (config.printerDevices || [])[0]?.id || ''}
                  onChange={(e) => {
                    const newId = e.target.value;
                    const updated = {
                      ...config,
                      activePrinterId: newId,
                      printerDevices: (config.printerDevices || []).map((d) => ({
                        ...d,
                        isDefault: d.id === newId
                      }))
                    };
                    saveShopConfig(updated);
                    if (setConfig) {
                      setConfig(updated);
                    }
                  }}
                  className="bg-transparent font-extrabold text-slate-900 text-xs focus:outline-none cursor-pointer truncate max-w-[170px]"
                >
                  {(config.printerDevices || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.paperWidth})
                    </option>
                  ))}
                </select>
              </div>

              {onOpenPrinterManager && (
                <button
                  type="button"
                  onClick={onOpenPrinterManager}
                  className="text-[10px] font-extrabold text-[#4b1d3f] hover:text-[#38152e] hover:underline flex items-center gap-0.5 px-1 py-0.5 rounded"
                  title="Configure and Add All Printers"
                >
                  <Layers className="w-3 h-3 text-[#4b1d3f]" />
                  <span>{lang === 'bn' ? '+ সব প্রিন্টার' : '+ All Printers'}</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {/* Primary Print Button */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('thermal')}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Print Thermal 80mm Slip"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.formatThermal}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrint('standard')}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Print Standard A4/A5 Bill"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{t.formatStandard}</span>
                </button>
              </div>

              {/* Secondary Actions: WhatsApp, SMS & Save New */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Share invoice on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="truncate">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendSms}
                  className="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  title="Send digital receipt and loyalty tier update via SMS API"
                >
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate">SMS API</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndNewBill}
                  className="py-2 px-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  title="Save invoice and start fresh bill"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="truncate">{t.saveAndNew}</span>
                </button>
              </div>
            </div>

            {/* Quick footer brand note */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[#4b1d3f] text-xs sm:text-sm tracking-tight uppercase">
                  {config.shopName || 'DELICIOUS CAKE CORNER'}
                </span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                  100% Pure Veg
                </span>
              </div>
              <a
                href={config.googleMapsUrl || 'https://www.google.com/maps/place/22.7157,87.7329'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                title="Verified Location in Google Maps"
              >
                <span>📍 Mansuka, Ghatal (Maps)</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* UPI QR Modal */}
      <UpiModal
        isOpen={isUpiModalOpen}
        onClose={() => setIsUpiModalOpen(false)}
        amount={dueAmount > 0 ? dueAmount : grandTotal}
        billNo={currentBillNo}
        config={config}
        onConfigUpdate={setConfig}
        onPaymentConfirmed={() => {
          setPaymentMethod('UPI');
          setPaymentStatusType('full');
          showNotification(lang === 'bn' ? 'UPI পেমেন্ট সফলভাবে নিশ্চিত করা হয়েছে!' : 'UPI payment confirmed!');
        }}
      />

      {/* SMS & Message Dispatcher Modal */}
      <SmsModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        phone={customerMobile}
        customerName={customerName}
        messageText={generateSmsMessage(buildCurrentBill(), config)}
        config={config}
        billNo={currentBillNo}
        bill={buildCurrentBill()}
        loyalty={loyaltyInfo}
        onSmsSentSuccess={(res) => {
          const clean = customerMobile.replace(/\D/g, '');
          setLastSmsDelivery({
            billNo: currentBillNo,
            phone: clean,
            provider: res.provider,
            messageId: res.messageId || 'SENT',
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          });
        }}
      />

      {/* Edit Cart Item Modal */}
      {editingCartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>{lang === 'bn' ? 'আইটেম এডিট করুন' : 'Edit Cart Item'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCartItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                const updatedName = form.itemName.value;
                const updatedWeight = form.itemWeight.value;
                const updatedQty = Math.max(1, parseInt(form.itemQty.value, 10) || 1);
                const updatedRate = Math.max(0, parseFloat(form.itemRate.value) || 0);
                const updatedNotes = form.itemNotes.value;

                setItems((prev) =>
                  prev.map((it) =>
                    it.id === editingCartItem.id
                      ? {
                          ...it,
                          name: updatedName,
                          weightOrSize: updatedWeight,
                          qty: updatedQty,
                          rate: updatedRate,
                          total: updatedQty * updatedRate,
                          notes: updatedNotes || undefined
                        }
                      : it
                  )
                );
                setEditingCartItem(null);
                setSuccessToast(lang === 'bn' ? 'আইটেম আপডেট করা হয়েছে!' : 'Cart item updated!');
              }}
              className="space-y-3 pt-3 text-left"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Item Name (নাম)
                </label>
                <input
                  type="text"
                  name="itemName"
                  required
                  defaultValue={editingCartItem.name}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Weight / Unit
                  </label>
                  <input
                    type="text"
                    name="itemWeight"
                    defaultValue={editingCartItem.weightOrSize}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Rate (₹)
                  </label>
                  <input
                    type="number"
                    name="itemRate"
                    step="any"
                    required
                    defaultValue={editingCartItem.rate}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quantity (Qty)
                  </label>
                  <input
                    type="number"
                    name="itemQty"
                    min="1"
                    required
                    defaultValue={editingCartItem.qty}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    name="itemNotes"
                    defaultValue={editingCartItem.notes || ''}
                    placeholder="e.g. eggless"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCartItem(null)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4b1d3f] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#38152e]"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counter Manager Modal */}
      <CounterManagerModal
        isOpen={isCounterModalOpen}
        onClose={() => setIsCounterModalOpen(false)}
        config={config}
        onConfigUpdate={(newCfg) => {
          if (setConfig) setConfig(newCfg);
        }}
        lang={lang}
      />

      {/* Customer Loyalty Profile Modal */}
      {isLoyaltyModalOpen && loyaltyInfo && (
        <CustomerLoyaltyModal
          isOpen={isLoyaltyModalOpen}
          onClose={() => setIsLoyaltyModalOpen(false)}
          loyalty={loyaltyInfo}
          bills={allBills}
          lang={lang}
        />
      )}

      {/* Official VIP Membership Card Modal */}
      {isMembershipModalOpen && loyaltyInfo && (
        <MembershipCardModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          customer={loyaltyInfo}
          config={config}
          lang={lang}
        />
      )}

      {/* Scan / Input Member Card QR Modal */}
      {isScanMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-[#4b1d3f] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {lang === 'bn' ? 'মেম্বারশিপ কার্ড QR স্ক্যানার' : 'Scan Member Card QR / Barcode'}
                  </h3>
                  <p className="text-[10px] text-amber-200/80">
                    Handheld barcode scanner or paste QR data
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsScanMemberModalOpen(false);
                  setScannedMemberInput('');
                }}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'bn' ? 'স্ক্যান করা কোড বা মোবাইল নম্বর লিখুন:' : 'Scanned Code or Member Mobile:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={scannedMemberInput}
                    onChange={(e) => setScannedMemberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const parsed = parseMembershipQrPayload(scannedMemberInput);
                        if (parsed && parsed.mobile) {
                          setCustomerMobile(parsed.mobile);
                          if (parsed.name) setCustomerName(parsed.name);
                          showNotification(
                            lang === 'bn'
                              ? `ভিআইপি গ্রাহক চিহ্নিত: ${parsed.name || parsed.mobile}`
                              : `VIP Member loaded: ${parsed.name || parsed.mobile}`
                          );
                          setIsScanMemberModalOpen(false);
                          setScannedMemberInput('');
                        } else {
                          showNotification(
                            lang === 'bn' ? 'সঠিক কোড পাওয়া যায়নি' : 'Unrecognized member QR'
                          );
                        }
                      }
                    }}
                    placeholder="Scan barcode scanner or enter 9876543210..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsScanMemberModalOpen(false);
                    setScannedMemberInput('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseMembershipQrPayload(scannedMemberInput);
                    if (parsed && parsed.mobile) {
                      setCustomerMobile(parsed.mobile);
                      if (parsed.name) setCustomerName(parsed.name);
                      showNotification(
                        lang === 'bn'
                          ? `ভিআইপি গ্রাহক চিহ্নিত: ${parsed.name || parsed.mobile}`
                          : `VIP Member loaded: ${parsed.name || parsed.mobile}`
                      );
                      setIsScanMemberModalOpen(false);
                      setScannedMemberInput('');
                    } else {
                      showNotification(
                        lang === 'bn' ? 'সঠিক কোড পাওয়া যায়নি' : 'Unrecognized member QR'
                      );
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#4b1d3f] text-white font-bold"
                >
                  Apply Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multiple System POS Terminal Network Modal */}
      <MultiSystemModal
        isOpen={isMultiSystemModalOpen}
        onClose={() => setIsMultiSystemModalOpen(false)}
        config={config}
        onConfigUpdate={(newCfg) => {
          if (setConfig) setConfig(newCfg);
        }}
        lang={lang}
      />
    </div>
  );
};
