import React, { useState, useMemo, useEffect } from 'react';
import { CustomerLoyalty, Bill, ShopConfig, Language } from '../types';
import { getT } from '../translations';
import {
  saveCustomerToFirestore,
  fetchCustomersFromFirestore,
  subscribeToCustomers,
  deleteCustomerFromFirestore
} from '../services/firestoreService';
import {
  getStoredCustomers,
  saveStoredCustomer,
  saveAllStoredCustomers,
  getCustomerLoyalty,
  getLoyaltyTier
} from '../utils/storage';
import { sendSmsApi } from '../services/smsService';
import { SmsActivityLogView } from './SmsActivityLogView';
import {
  Users,
  Search,
  UserPlus,
  Crown,
  Gift,
  Clock,
  IndianRupee,
  Phone,
  Calendar,
  Cloud,
  CloudCheck,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Receipt,
  FileSpreadsheet,
  MessageSquare,
  ArrowUpDown,
  Filter,
  Check,
  X,
  Plus,
  CreditCard,
  QrCode
} from 'lucide-react';
import { MembershipCardModal } from './MembershipCardModal';

interface CustomerCRMProps {
  bills: Bill[];
  config: ShopConfig;
  lang: Language;
  onSelectCustomerForBilling?: (customer: CustomerLoyalty) => void;
  onOpenCustomerHistory?: (customer: CustomerLoyalty) => void;
  onViewBillInHistory?: (billNo: string) => void;
}

export const CustomerCRM: React.FC<CustomerCRMProps> = ({
  bills,
  config,
  lang,
  onSelectCustomerForBilling,
  onOpenCustomerHistory,
  onViewBillInHistory
}) => {
  const t = getT(lang);

  // Cross-terminal synced customer state
  const [cloudCustomers, setCloudCustomers] = useState<CustomerLoyalty[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'spent' | 'points' | 'orders' | 'recent' | 'name'>('spent');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Sub-tab state: Directory vs SMS Activity Log
  const [activeCrmSubTab, setActiveCrmSubTab] = useState<'directory' | 'sms_log'>('directory');
  const [smsFilterMobile, setSmsFilterMobile] = useState<string>('');

  // Customer Edit/Create Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<CustomerLoyalty> | null>(null);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<CustomerLoyalty | null>(null);
  const [selectedCustomerForMembershipCard, setSelectedCustomerForMembershipCard] = useState<CustomerLoyalty | null>(null);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState<boolean>(false);

  // Points adjustments
  const [isAdjustPointsOpen, setIsAdjustPointsOpen] = useState<boolean>(false);
  const [pointsDelta, setPointsDelta] = useState<number>(0);
  const [pointsReason, setPointsReason] = useState<string>('');

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Initial Load and Realtime Subscription to Firestore (Sync across terminals)
  useEffect(() => {
    // Load local cache immediately
    const local = getStoredCustomers();
    if (local.length > 0) {
      setCloudCustomers(local);
    }

    setIsSyncing(true);
    setSyncStatus('syncing');

    // Subscribe to Firestore for real-time updates across multiple terminals
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeToCustomers((synced) => {
        setIsSyncing(false);
        setSyncStatus('synced');
        if (synced && synced.length > 0) {
          setCloudCustomers(synced);
          saveAllStoredCustomers(synced);
        }
      });
    } catch (err) {
      console.warn('Realtime subscription fallback to one-time fetch:', err);
      setSyncStatus('offline');
      setIsSyncing(false);
    }

    // Fallback one-time fetch
    fetchCustomersFromFirestore()
      .then((data) => {
        if (data && data.length > 0) {
          setCloudCustomers(data);
          saveAllStoredCustomers(data);
        }
        setIsSyncing(false);
        setSyncStatus('synced');
      })
      .catch((err) => {
        console.warn('Fetch from firestore notice:', err);
        setIsSyncing(false);
      });

    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  // 2. Aggregate unique customer records by merging bills history with Firestore CRM profiles
  const mergedCustomers = useMemo(() => {
    const customerMap = new Map<string, CustomerLoyalty>();

    // First, seed with all bills history
    bills.forEach((b) => {
      const cleanMob = (b.customerMobile || '').replace(/\D/g, '');
      if (!cleanMob || cleanMob.length < 8) return;

      if (!customerMap.has(cleanMob)) {
        const calculated = getCustomerLoyalty(cleanMob, bills, config.loyaltyTiers);
        if (calculated) {
          customerMap.set(cleanMob, calculated);
        }
      }
    });

    // Then merge with cloud/Firestore synced CRM customer records
    cloudCustomers.forEach((cc) => {
      const cleanMob = (cc.customerMobile || '').replace(/\D/g, '');
      if (!cleanMob) return;

      const existing = customerMap.get(cleanMob);
      if (existing) {
        // Overlay explicit notes, custom tier, pointsBalance overrides, etc.
        customerMap.set(cleanMob, {
          ...existing,
          ...cc,
          // Retain latest purchase count and total spent from authoritative bills if greater
          totalOrders: Math.max(existing.totalOrders, cc.totalOrders || 0),
          totalSpent: Math.max(existing.totalSpent, cc.totalSpent || 0),
          customerName: cc.customerName || existing.customerName,
          pointsBalance: cc.pointsBalance !== undefined ? cc.pointsBalance : existing.pointsBalance
        });
      } else {
        // Customer registered without bills or before bills sync
        const tier = getLoyaltyTier(cc.totalSpent || 0, config.loyaltyTiers);
        customerMap.set(cleanMob, {
          ...cc,
          tierId: cc.tierId || tier.currentTier.id,
          tierName: cc.tierName || tier.currentTier.name,
          tierBadge: cc.tierBadge || tier.currentTier.badge,
          suggestedDiscountPercent: cc.suggestedDiscountPercent || tier.currentTier.discountPercent,
          amountNeededForNextTier: tier.amountNeeded,
          progressPercent: tier.progressPercent
        });
      }
    });

    return Array.from(customerMap.values());
  }, [bills, cloudCustomers, config.loyaltyTiers]);

  // 3. Filter and Sort
  const filteredCustomers = useMemo(() => {
    let result = [...mergedCustomers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.customerMobile.includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    if (selectedTierFilter !== 'all') {
      result = result.filter(
        (c) => (c.tierId || '').toLowerCase() === selectedTierFilter.toLowerCase()
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'spent') {
        comparison = (b.totalSpent || 0) - (a.totalSpent || 0);
      } else if (sortBy === 'points') {
        comparison = (b.pointsBalance || 0) - (a.pointsBalance || 0);
      } else if (sortBy === 'orders') {
        comparison = (b.totalOrders || 0) - (a.totalOrders || 0);
      } else if (sortBy === 'recent') {
        const dateA = new Date(a.lastVisitDate || 0).getTime();
        const dateB = new Date(b.lastVisitDate || 0).getTime();
        comparison = dateB - dateA;
      } else if (sortBy === 'name') {
        comparison = a.customerName.localeCompare(b.customerName);
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [mergedCustomers, searchQuery, selectedTierFilter, sortBy, sortDirection]);

  // Total summary statistics
  const totalStats = useMemo(() => {
    const count = mergedCustomers.length;
    const totalRevenue = mergedCustomers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalLoyaltyPoints = mergedCustomers.reduce((sum, c) => sum + (c.pointsBalance || 0), 0);
    const repeatCustomers = mergedCustomers.filter((c) => (c.totalOrders || 0) > 1).length;
    return {
      count,
      totalRevenue,
      totalLoyaltyPoints,
      repeatRate: count > 0 ? Math.round((repeatCustomers / count) * 100) : 0
    };
  }, [mergedCustomers]);

  // Manual trigger sync from Firestore
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const data = await fetchCustomersFromFirestore();
      if (data) {
        setCloudCustomers(data);
        saveAllStoredCustomers(data);
      }
      setSyncStatus('synced');
      showToast(lang === 'bn' ? 'ক্লাউড থেকে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে!' : 'Synced successfully with Firestore across terminals!');
    } catch (err) {
      console.error('Manual sync failed:', err);
      setSyncStatus('offline');
      showToast(lang === 'bn' ? 'সিঙ্ক ব্যর্থ হয়েছে। অফলাইন ক্যাশ প্রদর্শন করা হচ্ছে।' : 'Sync failed. Showing offline local cache.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync all current bills customers to Firestore
  const handlePushAllBillsToFirestore = async () => {
    setIsSyncing(true);
    let count = 0;
    try {
      for (const cust of mergedCustomers) {
        await saveCustomerToFirestore(cust);
        saveStoredCustomer(cust);
        count++;
      }
      showToast(
        lang === 'bn'
          ? `${count} জন গ্রাহক ফায়ারস্টোরে সিঙ্ক হয়েছে!`
          : `Successfully pushed ${count} customer profiles to Firestore!`
      );
    } catch (err) {
      console.error('Push all to firestore failed:', err);
      showToast(lang === 'bn' ? 'সিঙ্কে সমস্যা হয়েছে।' : 'Error pushing to Firestore.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save/Register Customer in CRM
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.customerMobile || !editingCustomer.customerName) {
      alert(lang === 'bn' ? 'মোবাইল নম্বর ও নাম আবশ্যক।' : 'Customer mobile and name are required.');
      return;
    }

    const cleanMobile = editingCustomer.customerMobile.replace(/\D/g, '');
    if (cleanMobile.length < 8) {
      alert(lang === 'bn' ? 'সঠিক মোবাইল নম্বর দিন।' : 'Please enter a valid mobile number.');
      return;
    }

    const existing = mergedCustomers.find((c) => c.customerMobile === cleanMobile);
    const totalSpent = existing ? existing.totalSpent : editingCustomer.totalSpent || 0;
    const tier = getLoyaltyTier(totalSpent, config.loyaltyTiers);

    const updated: CustomerLoyalty = {
      customerMobile: cleanMobile,
      customerName: editingCustomer.customerName.trim(),
      totalOrders: existing ? existing.totalOrders : editingCustomer.totalOrders || 0,
      totalSpent,
      pointsBalance: editingCustomer.pointsBalance !== undefined ? Number(editingCustomer.pointsBalance) : (existing?.pointsBalance || 0),
      lastVisitDate: existing?.lastVisitDate || new Date().toISOString(),
      tierId: tier.currentTier.id,
      tierName: tier.currentTier.name,
      tierBadge: tier.currentTier.badge,
      suggestedDiscountPercent: tier.currentTier.discountPercent,
      amountNeededForNextTier: tier.amountNeeded,
      progressPercent: tier.progressPercent,
      notes: editingCustomer.notes || '',
      tags: editingCustomer.tags || ['Loyal'],
      registeredAt: existing?.registeredAt || Date.now(),
      updatedAt: Date.now()
    };

    // Save locally
    saveStoredCustomer(updated);

    // Save to Firestore for cross-terminal synchronization
    try {
      await saveCustomerToFirestore(updated);
      showToast(
        lang === 'bn'
          ? `গ্রাহক ${updated.customerName} সফলভাবে সেভ ও টার্মিনালে সিঙ্ক হয়েছে!`
          : `Customer ${updated.customerName} saved & synced across terminals!`
      );
    } catch (err) {
      console.warn('Firestore sync notice:', err);
      showToast(lang === 'bn' ? 'লোকাল সেভ হয়েছে। ক্লাউড অফলাইন।' : 'Saved locally. Cloud sync pending.');
    }

    setIsEditModalOpen(false);
    setEditingCustomer(null);
  };

  // Adjust loyalty points directly
  const handleApplyPointsAdjustment = async () => {
    if (!selectedCustomerForDetails || pointsDelta === 0) return;

    const newBalance = Math.max(0, (selectedCustomerForDetails.pointsBalance || 0) + pointsDelta);
    const updated: CustomerLoyalty = {
      ...selectedCustomerForDetails,
      pointsBalance: newBalance,
      notes: pointsReason
        ? `${selectedCustomerForDetails.notes || ''} [Adjustment: ${pointsDelta > 0 ? '+' : ''}${pointsDelta} pts - ${pointsReason}]`.trim()
        : selectedCustomerForDetails.notes,
      updatedAt: Date.now()
    };

    saveStoredCustomer(updated);
    try {
      await saveCustomerToFirestore(updated);
      setSelectedCustomerForDetails(updated);
      showToast(
        lang === 'bn'
          ? `পয়েন্ট ব্যালেন্স আপডেট হয়েছে: ${newBalance} pts`
          : `Loyalty points updated to ${newBalance} pts & synced!`
      );
    } catch (err) {
      console.warn('Firestore adjust points notice:', err);
    }

    setIsAdjustPointsOpen(false);
    setPointsDelta(0);
    setPointsReason('');
  };

  // Send Tier Update SMS to Customer
  const handleSendTierUpdateSms = async (customer: CustomerLoyalty) => {
    const shopName = config.shopName || 'Delicious Cake Corner';
    const message = `Hello ${customer.customerName}, thanks for choosing ${shopName}! You are currently a ${customer.tierBadge || '⭐'} ${customer.tierName || 'Member'} with ${customer.pointsBalance} loyalty points (Worth ₹${customer.pointsBalance}). Visit us again for delicious freshly baked treats! Phone: ${config.phone || '7866971421'}`;

    try {
      const res = await sendSmsApi({
        to: customer.customerMobile,
        message,
        customerName: customer.customerName,
        type: 'loyalty'
      });
      if (res.success) {
        showToast(
          lang === 'bn'
            ? `${customer.customerName}-কে লয়ালটি এসএমএস পাঠানো হয়েছে!`
            : `Loyalty status SMS sent to ${customer.customerMobile}!`
        );
      } else {
        showToast(`SMS Notice: ${res.error || 'Failed'}`);
      }
    } catch (err) {
      showToast('SMS sending failed');
    }
  };

  // Delete customer from CRM & Firestore
  const handleDeleteCustomer = async (mobile: string, name: string) => {
    // 1. Instantly update local stored customers & UI state
    const cleanMob = mobile.replace(/\D/g, '');
    const list = getStoredCustomers().filter((c) => c.customerMobile !== mobile && c.customerMobile !== cleanMob);
    saveAllStoredCustomers(list);
    setCloudCustomers(list);

    showToast(
      lang === 'bn'
        ? `গ্রাহক '${name}' (${mobile})-এর রেকর্ড মুছে ফেলা হয়েছে।`
        : `Customer record '${name}' (${mobile}) removed.`
    );
    if (selectedCustomerForDetails?.customerMobile === mobile || selectedCustomerForDetails?.customerMobile === cleanMob) {
      setSelectedCustomerForDetails(null);
    }

    // 2. Cloud Firestore cleanup in background
    try {
      await deleteCustomerFromFirestore(mobile);
    } catch (err) {
      console.warn('Delete customer firestore note:', err);
    }
  };

  // Export Customer CRM list as CSV
  const handleExportCrmCsv = () => {
    if (mergedCustomers.length === 0) {
      alert(lang === 'bn' ? 'কোনো গ্রাহক রেকর্ড নেই।' : 'No customer records to export.');
      return;
    }

    const headers = [
      'Customer Name',
      'Mobile Number',
      'Loyalty Tier',
      'Points Balance',
      'Points Worth (INR)',
      'Total Orders',
      'Total Lifetime Spent (INR)',
      'Last Visit Date',
      'Suggested Discount %',
      'Notes'
    ];

    const rows = mergedCustomers.map((c) => [
      `"${c.customerName.replace(/"/g, '""')}"`,
      `"${c.customerMobile}"`,
      `"${c.tierName || 'Bronze'}"`,
      c.pointsBalance,
      c.pointsBalance,
      c.totalOrders,
      (c.totalSpent || 0).toFixed(2),
      `"${c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString('en-IN') : 'N/A'}"`,
      `${c.suggestedDiscountPercent || 0}%`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.join('\n')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DCC_Customer_Loyalty_CRM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get customer specific bills
  const selectedCustomerBills = useMemo(() => {
    if (!selectedCustomerForDetails) return [];
    const cleanMob = selectedCustomerForDetails.customerMobile.replace(/\D/g, '');
    return bills.filter((b) => (b.customerMobile || '').replace(/\D/g, '') === cleanMob);
  }, [bills, selectedCustomerForDetails]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CRM Header Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#4b1d3f] text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{lang === 'bn' ? 'কাস্টমার সিআরএম ও লয়ালটি হাব' : 'Customer CRM & Loyalty Manager'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-[#4b1d3f] font-mono font-bold border border-amber-200">
                  {mergedCustomers.length} {lang === 'bn' ? 'জন গ্রাহক' : 'Customers'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'bn'
                  ? 'টার্মিনাল ও কাউন্টারে গ্রাহকদের ক্রয়ের হিস্ট্রি ও লয়ালটি পয়েন্ট লাইভ সিঙ্ক'
                  : 'Track purchase history, loyalty rewards & sync customer profiles across terminals'}
              </p>
            </div>
          </div>
        </div>

        {/* Sync & Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Firestore Cross-terminal sync indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              syncStatus === 'synced'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : syncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Cross-terminal Firestore real-time synchronization"
          >
            <Cloud className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
            <span>
              {syncStatus === 'syncing'
                ? lang === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing Firestore...'
                : syncStatus === 'synced'
                ? lang === 'bn' ? 'টার্মিনালে লাইভ সিঙ্ক' : 'Cross-Terminal Synced'
                : lang === 'bn' ? 'অফলাইন মোড' : 'Offline Cache'}
            </span>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
            title="Refresh and sync data from Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Sync'}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCrmCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            title="Download Customer CRM List as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'bn' ? 'এক্সেল / CSV' : 'Export CSV'}</span>
          </button>

          {/* Push all bills customers to Firestore button */}
          <button
            type="button"
            onClick={handlePushAllBillsToFirestore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#4b1d3f] border border-purple-200 text-xs font-bold transition-colors"
            title="Push all registered customers from bills to Firestore cloud"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ক্লাউড ব্যাকআপ' : 'Sync All to Cloud'}</span>
          </button>

          {/* SMS Activity Log Direct Header Tab Trigger */}
          <button
            type="button"
            onClick={() => {
              setActiveCrmSubTab('sms_log');
              setSmsFilterMobile('');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
              activeCrmSubTab === 'sms_log'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
            }`}
            title="View SMS notification delivery logs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'এসএমএস লগ' : 'SMS Logs'}</span>
          </button>

          {/* VIP Membership Card Hub Trigger */}
          <button
            type="button"
            onClick={() => {
              setSelectedCustomerForMembershipCard(mergedCustomers[0] || null);
              setIsMembershipModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#4b1d3f] text-xs font-black shadow-xs transition-colors"
            title="Generate, View & Print VIP Membership Cards with QR Codes"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#4b1d3f]" />
            <span>{lang === 'bn' ? 'মেম্বারশিপ কার্ড (QR)' : 'Membership Cards (QR)'}</span>
          </button>

          {/* Add New Customer Button */}
          <button
            type="button"
            onClick={() => {
              setEditingCustomer({
                customerName: '',
                customerMobile: '',
                pointsBalance: 0,
                notes: ''
              });
              setIsEditModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-300" />
            <span>{lang === 'bn' ? '+ নতুন গ্রাহক' : '+ Register Customer'}</span>
          </button>
        </div>
      </div>

      {/* Primary Sub-Tab Switcher: Customer Directory vs SMS Activity Log */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveCrmSubTab('directory');
            setSmsFilterMobile('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeCrmSubTab === 'directory'
              ? 'bg-[#4b1d3f] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-amber-300" />
          <span>{lang === 'bn' ? 'গ্রাহক ও লয়ালটি ডিরেক্টরি' : 'Customers & Loyalty Directory'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeCrmSubTab === 'directory' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {mergedCustomers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCrmSubTab('sms_log')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeCrmSubTab === 'sms_log'
              ? 'bg-[#4b1d3f] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'bn' ? 'এসএমএস অ্যাক্টিভিটি লগ' : 'SMS Activity Log'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeCrmSubTab === 'sms_log' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            Live Logs
          </span>
        </button>
      </div>

      {activeCrmSubTab === 'sms_log' ? (
        <SmsActivityLogView
          bills={bills}
          config={config}
          lang={lang}
          filterCustomerMobile={smsFilterMobile}
          onSelectCustomerForBilling={onSelectCustomerForBilling}
          onViewBillInHistory={onViewBillInHistory}
        />
      ) : (
        <>
          {/* KPI Stats Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'bn' ? 'মোট গ্রাহক' : 'Registered Customers'}
            </span>
            <Users className="w-4 h-4 text-[#4b1d3f]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalStats.count}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-700 font-bold">{totalStats.repeatRate}%</span>
            <span>{lang === 'bn' ? 'পুনরাবৃত্ত গ্রাহক' : 'repeat customer rate'}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'bn' ? 'মোট বিক্রয় (LTV)' : 'Total Lifetime Value'}
            </span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 font-mono">
            ₹{totalStats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'bn' ? 'সকল অর্ডারের সমন্বয়' : 'cumulative revenue from customers'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'bn' ? 'সক্রিয় লয়ালটি পয়েন্ট' : 'Active Loyalty Points'}
            </span>
            <Gift className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-[#4b1d3f] font-mono">
            {totalStats.totalLoyaltyPoints} <span className="text-xs font-bold text-amber-600">pts</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'bn' ? `মূল্য: ₹${totalStats.totalLoyaltyPoints}` : `Worth ₹${totalStats.totalLoyaltyPoints} in redemption`}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'bn' ? 'টার্মিনাল সিঙ্ক' : 'Cross-Terminal Sync'}
            </span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono flex items-center gap-2">
            <span>{config.terminals?.length || 3}</span>
            <span className="text-xs font-bold text-slate-500">terminals</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{lang === 'bn' ? 'ফায়ারস্টোরে লাইভ শেয়ারিং' : 'Live synced across POS stations'}</span>
          </div>
        </div>
      </div>

      {/* Search, Tier Filter & Sort Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'bn' ? 'গ্রাহকের নাম, মোবাইল নম্বর বা নোট দিয়ে খুঁজুন...' : 'Search by name, mobile number, notes...'}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#4b1d3f]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tier Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <button
              onClick={() => setSelectedTierFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                selectedTierFilter === 'all'
                  ? 'bg-[#4b1d3f] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'bn' ? 'সকল গ্রাহক' : 'All Tiers'} ({mergedCustomers.length})
            </button>
            {config.loyaltyTiers?.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTierFilter(tier.id)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                  selectedTierFilter === tier.id
                    ? 'bg-amber-400 text-amber-950 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tier.badge}</span>
                <span>{tier.name}</span>
              </button>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 font-semibold focus:outline-hidden"
            >
              <option value="spent">Highest Lifetime Spent (LTV)</option>
              <option value="points">Highest Loyalty Points</option>
              <option value="orders">Most Orders</option>
              <option value="recent">Most Recent Visit</option>
              <option value="name">Customer Name</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main CRM Grid: Customer Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">
            {lang === 'bn' ? 'কোনো গ্রাহক পাওয়া যায়নি' : 'No customers found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? lang === 'bn' ? 'অনুগ্রহ করে ভিন্ন কোনো নাম বা মোবাইল নম্বর দিয়ে খুঁজুন।' : 'Try adjusting your search query or tier filter.'
              : lang === 'bn' ? 'বিল তৈরি করার সময় গ্রাহকের মোবাইল নম্বর দিলে স্বয়ংক্রিয়ভাবে সিআরএম-এ সংরক্ষিত হবে।' : 'Customers with mobile numbers from generated bills or direct registrations will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const cleanMob = customer.customerMobile;
            const customerOrderCount = customer.totalOrders || 0;
            const customerTotalSpent = customer.totalSpent || 0;

            return (
              <div
                key={cleanMob}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-amber-400/80 shadow-2xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between group"
              >
                {/* Top: Customer identity & badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-base font-black text-[#4b1d3f]">
                        {customer.tierBadge || '⭐'}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 group-hover:text-[#4b1d3f] transition-colors leading-tight">
                          {customer.customerName}
                        </h3>
                        <a
                          href={`tel:${cleanMob}`}
                          className="text-xs text-slate-500 font-mono hover:text-[#4b1d3f] flex items-center gap-1 mt-0.5"
                          title="Call customer"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cleanMob}</span>
                        </a>
                      </div>
                    </div>

                    {/* Tier badge */}
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-mono whitespace-nowrap">
                      {customer.tierName || 'Bronze Member'}
                    </span>
                  </div>

                  {/* Loyalty Points highlight pill */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 my-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        {t.pointsBalance}
                      </span>
                      <span className="text-base font-black text-[#4b1d3f] font-mono block">
                        {customer.pointsBalance} <span className="text-[10px]">pts</span>
                      </span>
                      <span className="text-[9px] text-amber-800 font-medium">
                        (₹{customer.pointsBalance})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        {t.visitCount}
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono block">
                        {customerOrderCount}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium">
                        bills
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        {t.lifetimeSpent}
                      </span>
                      <span className="text-base font-black text-emerald-800 font-mono block">
                        ₹{customerTotalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-medium">
                        LTV
                      </span>
                    </div>
                  </div>

                  {/* Tier progress bar if next tier available */}
                  {customer.nextTierName && customer.amountNeededForNextTier !== undefined && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-semibold">
                          Next: <strong className="text-slate-700">{customer.nextTierName}</strong>
                        </span>
                        <span className="font-mono text-amber-800 font-bold">
                          ₹{customer.amountNeededForNextTier} more
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-1.5 rounded-full"
                          style={{ width: `${customer.progressPercent || 20}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Customer Notes */}
                  {customer.notes && (
                    <div className="text-[11px] text-slate-600 bg-amber-50/50 rounded-lg p-2 border border-amber-100/80 mb-3 line-clamp-2">
                      <span className="font-bold text-amber-900">Note: </span>
                      {customer.notes}
                    </div>
                  )}

                  {/* Last visit info */}
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mb-3 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Last Visit: {customer.lastVisitDate ? new Date(customer.lastVisitDate).toLocaleDateString('en-IN') : 'New'}</span>
                    </span>
                    {customer.suggestedDiscountPercent ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {customer.suggestedDiscountPercent}% VIP Discount
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {/* View Details / Purchase History */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerForDetails(customer);
                        if (onOpenCustomerHistory) onOpenCustomerHistory(customer);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                      title="View complete purchase history & adjust points"
                    >
                      <Receipt className="w-3 h-3 text-[#4b1d3f]" />
                      <span>{lang === 'bn' ? 'ইতিহাস' : 'History'}</span>
                    </button>

                    {/* VIP Membership Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerForMembershipCard(customer);
                        setIsMembershipModalOpen(true);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors flex items-center gap-1"
                      title={lang === 'bn' ? 'মেম্বারশিপ কার্ড দেখুন ও প্রিন্ট করুন' : 'View & Print VIP Membership Card with QR'}
                    >
                      <CreditCard className="w-3 h-3 text-amber-800" />
                      <span>{lang === 'bn' ? 'কার্ড' : 'Card'}</span>
                    </button>

                    {/* Edit Profile */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomer(customer);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Edit customer details & notes"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    {/* Send SMS Loyalty Update */}
                    <button
                      type="button"
                      onClick={() => handleSendTierUpdateSms(customer)}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                      title="Send SMS loyalty tier update & points balance"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>

                    {/* View Customer SMS Logs */}
                    <button
                      type="button"
                      onClick={() => {
                        setSmsFilterMobile(customer.customerMobile);
                        setActiveCrmSubTab('sms_log');
                      }}
                      className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#4b1d3f] border border-purple-200 transition-colors"
                      title={lang === 'bn' ? 'এই গ্রাহকের এসএমএস ডেলিভারি লগ দেখুন' : 'View customer SMS delivery logs'}
                    >
                      <Clock className="w-3 h-3 text-[#4b1d3f]" />
                    </button>

                    {/* Delete Customer */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(customer.customerMobile, customer.customerName)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                      title="Delete customer record"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Apply / Bill for this customer */}
                  {onSelectCustomerForBilling && (
                    <button
                      type="button"
                      onClick={() => onSelectCustomerForBilling(customer)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>{lang === 'bn' ? 'বিল করুন' : 'Bill'}</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Customer Purchase History & Details Modal */}
      {selectedCustomerForDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#4b1d3f] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 font-bold">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                    <span>{selectedCustomerForDetails.customerName}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-300 text-[#4b1d3f]">
                      {selectedCustomerForDetails.tierBadge} {selectedCustomerForDetails.tierName}
                    </span>
                  </h3>
                  <p className="text-xs text-amber-100/80 font-mono flex items-center gap-2">
                    <span>📞 {selectedCustomerForDetails.customerMobile}</span>
                    <span>•</span>
                    <span>Cross-terminal synced</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerForDetails(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Metrics cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] font-bold text-amber-900 block uppercase">
                    {t.pointsBalance}
                  </span>
                  <span className="text-xl font-black text-[#4b1d3f] font-mono block mt-1">
                    {selectedCustomerForDetails.pointsBalance} pts
                  </span>
                  <span className="text-[9px] text-amber-800 font-semibold block mt-0.5">
                    (Worth ₹{selectedCustomerForDetails.pointsBalance})
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-600 block uppercase">
                    {t.visitCount}
                  </span>
                  <span className="text-xl font-black text-slate-900 font-mono block mt-1">
                    {selectedCustomerForDetails.totalOrders}
                  </span>
                  <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">
                    completed orders
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-900 block uppercase">
                    {t.lifetimeSpent}
                  </span>
                  <span className="text-xl font-black text-emerald-900 font-mono block mt-1">
                    ₹{selectedCustomerForDetails.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                    lifetime spent (LTV)
                  </span>
                </div>
              </div>

              {/* Adjust Loyalty Points Bar */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {lang === 'bn' ? 'লয়ালটি পয়েন্ট অ্যাডজাস্ট / উপহার' : 'Manual Points Adjustment'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {lang === 'bn' ? 'বিশেষ ছাড় বা কাস্টমার কমপ্লেন নিষ্পত্তিতে পয়েন্ট যোগ/বিয়োগ করুন' : 'Add bonus points or redeem manually for this customer'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAdjustPointsOpen(!isAdjustPointsOpen)}
                  className="px-3 py-1.5 bg-[#4b1d3f] text-white rounded-lg text-xs font-bold hover:bg-[#38152e] transition-colors"
                >
                  {isAdjustPointsOpen ? 'Cancel' : lang === 'bn' ? 'পয়েন্ট পরিবর্তন' : 'Adjust Points'}
                </button>
              </div>

              {/* Adjust Points inline form */}
              {isAdjustPointsOpen && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    {lang === 'bn' ? 'পয়েন্ট সমন্বয় ফর্ম' : 'Points Modification Form'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        {lang === 'bn' ? 'পয়েন্ট যোগ/বিয়োগ (e.g. +50 or -20)' : 'Points Delta (+ to add, - to deduct)'}
                      </label>
                      <input
                        type="number"
                        value={pointsDelta || ''}
                        onChange={(e) => setPointsDelta(Number(e.target.value))}
                        placeholder="+50 or -20"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        {lang === 'bn' ? 'কারণ / নোট' : 'Reason / Note'}
                      </label>
                      <input
                        type="text"
                        value={pointsReason}
                        onChange={(e) => setPointsReason(e.target.value)}
                        placeholder="e.g. Birthday bonus, anniversary treat"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAdjustPointsOpen(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPointsAdjustment}
                      disabled={pointsDelta === 0}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                      {lang === 'bn' ? 'পয়েন্ট সংরক্ষণ করুন' : 'Confirm & Save Points'}
                    </button>
                  </div>
                </div>
              )}

              {/* Purchase History / Bills List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#4b1d3f]" />
                    <span>{lang === 'bn' ? 'সম্পূর্ণ ক্রয় ইতিহাস' : 'Complete Purchase History'} ({selectedCustomerBills.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {selectedCustomerBills.length > 0 ? 'Chronological bill ledger' : 'No recorded bills yet'}
                  </span>
                </h4>

                {selectedCustomerBills.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-slate-100">
                    {lang === 'bn' ? 'এই গ্রাহকের নামে কোনো সংরক্ষিত বিল পাওয়া যায়নি।' : 'No bill history associated with this customer mobile number.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {selectedCustomerBills.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs text-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">{b.billNo}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                              {b.orderType}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              b.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {new Date(b.date || b.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} • {(b.items || []).map((i) => `${i.name} (x${i.qty})`).join(', ')}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-slate-900 font-mono block">
                            ₹{b.grandTotal.toFixed(0)}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            +{b.loyaltyPointsEarned ?? Math.floor(b.grandTotal / 100)} pts earned
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendTierUpdateSms(selectedCustomerForDetails)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'এসএমএস পাঠান' : 'Send Loyalty SMS'}</span>
                </button>

                {/* VIP Membership Card Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerForMembershipCard(selectedCustomerForDetails);
                    setIsMembershipModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#4b1d3f] text-xs font-black transition-colors shadow-2xs"
                  title="View, Print and Share Official VIP Membership Card with QR Code"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#4b1d3f]" />
                  <span>{lang === 'bn' ? 'মেম্বারশিপ কার্ড (QR)' : 'VIP Member Card (QR)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSmsFilterMobile(selectedCustomerForDetails.customerMobile);
                    setActiveCrmSubTab('sms_log');
                    setSelectedCustomerForDetails(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#4b1d3f] border border-purple-200 text-xs font-bold transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-[#4b1d3f]" />
                  <span>{lang === 'bn' ? 'এসএমএস লগ দেখুন' : 'View SMS Log'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerForDetails(null)}
                className="px-4 py-2 bg-[#4b1d3f] text-white rounded-xl text-xs font-bold hover:bg-[#38152e] transition-colors"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Registration / Edit Profile Modal */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#4b1d3f] text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-300" />
                <span>
                  {editingCustomer.customerMobile
                    ? lang === 'bn' ? 'গ্রাহকের তথ্য সম্পাদনা' : 'Edit Customer Profile'
                    : lang === 'bn' ? 'নতুন গ্রাহক নিবন্ধন' : 'Register Customer'}
                </span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'bn' ? 'মোবাইল নম্বর (১০ ডিজিট) *' : 'Customer Mobile Number *'}
                </label>
                <input
                  type="tel"
                  required
                  value={editingCustomer.customerMobile || ''}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      customerMobile: e.target.value.replace(/\D/g, '')
                    })
                  }
                  placeholder="e.g. 7866971421"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'bn' ? 'গ্রাহকের পুরো নাম *' : 'Customer Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingCustomer.customerName || ''}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      customerName: e.target.value
                    })
                  }
                  placeholder="e.g. Subrata Kunti / Riya Das"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'bn' ? 'প্রারম্ভিক লয়ালটি পয়েন্ট' : 'Loyalty Points Balance'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingCustomer.pointsBalance !== undefined ? editingCustomer.pointsBalance : 0}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      pointsBalance: Math.max(0, parseInt(e.target.value) || 0)
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'bn' ? 'বিশেষ পছন্দ / নোট' : 'Customer Preferences & Notes'}
                </label>
                <textarea
                  rows={2}
                  value={editingCustomer.notes || ''}
                  onChange={(e) =>
                    setEditingCustomer({
                      ...editingCustomer,
                      notes: e.target.value
                    })
                  }
                  placeholder="e.g. Prefers eggless dark chocolate cake, regular customer for family events"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>{lang === 'bn' ? 'সংরক্ষণ ও সিঙ্ক করুন' : 'Save & Sync'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official VIP Membership Card Modal */}
      <MembershipCardModal
        isOpen={isMembershipModalOpen}
        onClose={() => {
          setIsMembershipModalOpen(false);
          setSelectedCustomerForMembershipCard(null);
        }}
        customer={selectedCustomerForMembershipCard}
        config={config}
        lang={lang}
        onSelectCustomerForBilling={onSelectCustomerForBilling}
        onCustomerUpdate={(updated) => {
          saveStoredCustomer(updated);
          saveCustomerToFirestore(updated).catch(console.error);
          setCloudCustomers((prev) =>
            prev.map((c) => (c.customerMobile === updated.customerMobile ? updated : c))
          );
        }}
      />
    </div>
  );
};
