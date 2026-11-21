import React, { useState, useEffect } from 'react';
import { Bill, ShopConfig, Language, AppUserSession } from '../types';
import { getT } from '../translations';
import { CustomerThankYouModal } from './CustomerThankYouModal';
import {
  deleteBill,
  updateBillPayment,
  exportBillsToCsv,
  exportAllDataBackup,
  importDataFromJson
} from '../utils/storage';
import { openWhatsAppShare, triggerSms } from '../utils/upi';
import { sendBillReceiptAndLoyaltySms } from '../services/smsService';
import { deleteBillFromFirestore } from '../services/firestoreService';
import { SmsModal } from './SmsModal';
import { EditBillModal } from './EditBillModal';
import {
  Search,
  Printer,
  Share2,
  Trash2,
  CheckCircle,
  Download,
  Upload,
  Calendar,
  IndianRupee,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Heart,
  MessageCircle,
  MessageSquare,
  Edit3,
  TrendingUp,
  Zap,
  CheckCircle2,
  RefreshCw,
  Store,
  X,
  Lock
} from 'lucide-react';
import { hasPermission } from '../utils/permissionUtils';

interface BillHistoryProps {
  bills: Bill[];
  config: ShopConfig;
  lang: Language;
  onRefresh: () => void;
  onReprintBill: (bill: Bill) => void;
  onEditBill?: (bill: Bill) => void;
  onOpenDailySummary?: () => void;
  onOpenPrinterManager?: () => void;
  setConfig?: (config: ShopConfig) => void;
  userSession?: AppUserSession;
  onDeleteBill?: (id: string) => Promise<void> | void;
}

export const BillHistory: React.FC<BillHistoryProps> = ({
  bills,
  config,
  lang,
  onRefresh,
  onReprintBill,
  onEditBill,
  onOpenDailySummary,
  onOpenPrinterManager,
  setConfig,
  userSession,
  onDeleteBill
}) => {
  const t = getT(lang);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [counterFilter, setCounterFilter] = useState<string>(
    userSession?.role === 'counter' && userSession.counterId ? userSession.counterId : 'all'
  );
  const [deletedBillIds, setDeletedBillIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userSession?.role === 'counter' && userSession.counterId) {
      setCounterFilter(userSession.counterId);
    }
  }, [userSession?.role, userSession?.counterId]);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [isThankYouModalOpen, setIsThankYouModalOpen] = useState<boolean>(false);
  const [selectedThankYouBill, setSelectedThankYouBill] = useState<Bill | null>(null);
  const [editingBillModal, setEditingBillModal] = useState<Bill | null>(null);
  const [selectedSmsData, setSelectedSmsData] = useState<{
    phone: string;
    name: string;
    text: string;
    billNo: string;
    bill?: Bill;
  } | null>(null);
  const [isSendingSmsId, setIsSendingSmsId] = useState<string | null>(null);
  const [smsToast, setSmsToast] = useState<string | null>(null);
  const [billPendingDelete, setBillPendingDelete] = useState<{ id: string; billNo: string; grandTotal?: number; customerName?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleSendSmsApiReceipt = async (bill: Bill) => {
    if (!bill.customerMobile) {
      alert(lang === 'bn' ? 'এই বিলে কোনো গ্রাহক ফোন নম্বর নেই।' : 'No customer mobile attached to this bill.');
      return;
    }
    const clean = bill.customerMobile.replace(/\D/g, '');
    if (clean.length < 10) {
      alert(lang === 'bn' ? 'সঠিক ১০-সংখ্যার ফোন নম্বর প্রয়োজন।' : 'Valid 10-digit mobile number required.');
      return;
    }

    setIsSendingSmsId(bill.id);
    try {
      const res = await sendBillReceiptAndLoyaltySms(bill, config);
      if (res.success) {
        setSmsToast(
          lang === 'bn'
            ? `বিল ${bill.billNo}: ডিজিটাল রসিদ ও লয়ালটি SMS গ্রাহকের নম্বরে (+91${clean.slice(-10)}) সফলভাবে পাঠানো হয়েছে (${res.provider || 'SMS Gateway'})!`
            : `Bill ${bill.billNo}: Digital receipt & loyalty SMS sent to +91${clean.slice(-10)} via ${res.provider || 'SMS Gateway'}!`
        );
        setTimeout(() => setSmsToast(null), 4000);
      } else {
        setSmsToast(lang === 'bn' ? `SMS স্ট্যাটাস: ${res.error}` : `SMS Status: ${res.error}`);
        setTimeout(() => setSmsToast(null), 5000);
      }
    } catch (err: any) {
      setSmsToast(`SMS Notice: ${err?.message || 'Network notice'}`);
      setTimeout(() => setSmsToast(null), 5000);
    } finally {
      setIsSendingSmsId(null);
    }
  };

  const handleDirectWhatsAppThankYou = (bill: Bill) => {
    const raw = config.thankYouMessageBn || `প্রিয় {name}, ডেলিসিয়াস কেক কর্নার-এ আসার জন্য আপনাকে আন্তরিক ধন্যবাদ ও শুভেচ্ছা! 🎂✨ আমাদের ১০০% এগলেস স্পেশাল ফ্রেশ কেক আপনার পারিবারিক অনুষ্ঠান ও উৎসবের মুহূর্তগুলিকে আরও মিষ্টি ও আনন্দময় করে তুলুক। প্রয়োজনে কল বা হোয়াটসঅ্যাপ করুন: ${config.phone}। আবার আসবেন! 🎉`;
    const text = raw
      .replace(/{name}/g, bill.customerName || 'গ্রাহক')
      .replace(/{phone}/g, config.phone)
      .replace(/{shop}/g, config.shopName);
    const phone = (bill.customerMobile || '').replace(/\D/g, '');
    const target = phone.length === 10 ? `91${phone}` : phone;
    if (target && target.length >= 10) {
      window.open(`https://api.whatsapp.com/send?phone=${target}&text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleDirectSmsThankYou = (bill: Bill) => {
    const raw = config.thankYouMessageBn || `প্রিয় {name}, ডেলিসিয়াস কেক কর্নার-এ আসার জন্য আপনাকে আন্তরিক ধন্যবাদ ও শুভেচ্ছা! 🎂✨ আমাদের ১০০% এগলেস স্পেশাল ফ্রেশ কেক আপনার পারিবারিক অনুষ্ঠান ও উৎসবের মুহূর্তগুলিকে আরও মিষ্টি ও আনন্দময় করে তুলুক। প্রয়োজনে কল বা হোয়াটসঅ্যাপ করুন: ${config.phone}। আবার আসবেন! 🎉`;
    const text = raw
      .replace(/{name}/g, bill.customerName || 'গ্রাহক')
      .replace(/{phone}/g, config.phone)
      .replace(/{shop}/g, config.shopName);
    const phone = (bill.customerMobile || '').replace(/\D/g, '');
    triggerSms(phone, text);
    setSelectedSmsData({
      phone,
      name: bill.customerName,
      text,
      billNo: bill.billNo,
      bill
    });
  };

  // Today timestamp bounds
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  // Metrics
  const todayBills = bills.filter((b) => b.createdAt >= startOfTodayMs);
  const todaySales = todayBills.reduce((acc, b) => acc + b.grandTotal, 0);
  const totalDue = bills.reduce((acc, b) => acc + (b.dueAmount || 0), 0);
  const todayCash = todayBills
    .filter((b) => b.paymentMethod === 'Cash')
    .reduce((acc, b) => acc + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const todayUpi = todayBills
    .filter((b) => b.paymentMethod === 'UPI')
    .reduce((acc, b) => acc + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);

  // Filter bills
  const filteredBills = bills.filter((bill) => {
    // Optimistically excluded deleted bills
    if (deletedBillIds.has(bill.id)) return false;

    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = bill.billNo.toLowerCase().includes(q);
      const matchName = bill.customerName.toLowerCase().includes(q);
      const matchMobile = bill.customerMobile.includes(q);
      if (!matchNo && !matchName && !matchMobile) return false;
    }

    // Date
    if (dateFilter === 'today' && bill.createdAt < startOfTodayMs) {
      return false;
    }

    // Status
    if (statusFilter === 'due' && (bill.dueAmount <= 0 || bill.status === 'paid')) {
      return false;
    }
    if (statusFilter === 'paid' && bill.dueAmount > 0) {
      return false;
    }

    // Counter
    if (counterFilter !== 'all') {
      if (bill.counterId !== counterFilter && bill.counterName !== counterFilter) {
        return false;
      }
    }

    return true;
  });

  const handleDelete = (id: string, billNo: string, bill?: Bill) => {
    setBillPendingDelete({
      id,
      billNo,
      grandTotal: bill?.grandTotal,
      customerName: bill?.customerName
    });
  };

  const handleConfirmDelete = async () => {
    if (!billPendingDelete) return;
    const targetId = billPendingDelete.id;
    const targetBillNo = billPendingDelete.billNo;
    setIsDeleting(true);

    // 1. Instantly hide from filtered table view
    setDeletedBillIds((prev) => new Set(prev).add(targetId));

    try {
      // 2. Remove permanently from localStorage
      deleteBill(targetId);

      // 3. Inform parent App state to remove from memory
      if (onDeleteBill) {
        await onDeleteBill(targetId);
      }

      // 4. Cleanup cloud Firestore if connected
      await deleteBillFromFirestore(targetId).catch((e) => console.warn('Firestore delete notice:', e));

      setSmsToast(
        lang === 'bn'
          ? `বিল #${targetBillNo} সফলভাবে মুছে ফেলা হয়েছে!`
          : `Bill #${targetBillNo} deleted successfully!`
      );
    } catch (err: any) {
      console.error('Delete error:', err);
      deleteBill(targetId);
    } finally {
      setIsDeleting(false);
      setBillPendingDelete(null);
      if (selectedBillForDetails && selectedBillForDetails.id === targetId) {
        setSelectedBillForDetails(null);
      }
      onRefresh();
    }
  };

  const handleMarkAsFullyPaid = (bill: Bill) => {
    updateBillPayment(bill.id, bill.grandTotal, 0, 'paid');
    setSmsToast(
      lang === 'bn'
        ? `বিল #${bill.billNo} সফলভাবে সম্পূর্ণ পরিশোধিত করা হয়েছে!`
        : `Bill #${bill.billNo} marked as fully paid!`
    );
    onRefresh();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importDataFromJson(content)) {
        alert('Database restored successfully!');
        onRefresh();
      } else {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* SMS Dispatched Toast */}
      {smsToast && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{smsToast}</span>
          </div>
          <button onClick={() => setSmsToast(null)} className="text-emerald-100 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Top Title & Export Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{t.dashboardTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {config.shopName} • {bills.length} total recorded invoices
          </p>
          {userSession?.role === 'counter' && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold shadow-2xs">
              <Store className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {lang === 'bn'
                  ? `🏢 আপনার কাউন্টার: ${userSession.counterCode || 'C1'} - ${userSession.counterName || 'কাউন্টার'} এর রসিদ প্রদর্শিত হচ্ছে`
                  : `🏢 Station: ${userSession.counterCode || 'C1'} - ${userSession.counterName || 'Counter'} (Filtered to your counter)`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenDailySummary && (
            <button
              onClick={onOpenDailySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-950 shadow-2xs transition-colors"
              title="Open Daily Sales Summary & Closing Register"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t.dailySummary}</span>
            </button>
          )}

          <button
            onClick={() => {
              setSelectedThankYouBill(null);
              setIsThankYouModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4b1d3f] hover:bg-[#38152e] text-xs font-bold text-white shadow-2xs transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Thank You Messages</span>
          </button>

          <button
            onClick={() => exportBillsToCsv(filteredBills)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.exportCsv}</span>
          </button>

          <button
            onClick={exportAllDataBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
            title="Download full database backup"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Backup</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            <span>Restore</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Metrics Row (Anti-slop clean stat surfaces) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{t.todaySales}</span>
          <span className="text-xl font-extrabold text-[#4b1d3f] font-mono tabular-nums block mt-1">
            ₹{todaySales.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{todayBills.length} bills today</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{t.cashCollected}</span>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
            ₹{todayCash.toFixed(2)}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Cash drawer</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{t.upiCollected}</span>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
            ₹{todayUpi.toFixed(2)}
          </span>
          <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">Bank deposit</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{t.duePending}</span>
          <span className="text-xl font-extrabold text-rose-600 font-mono tabular-nums block mt-1">
            ₹{totalDue.toFixed(2)}
          </span>
          <span className="text-[10px] text-rose-500 font-medium mt-0.5 block">Receivable balance</span>
        </div>

        <div className="col-span-2 md:col-span-1 p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{t.todayBills}</span>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
            {todayBills.length}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">All time: {bills.length}</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4b1d3f]"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Date tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold shrink-0">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.allDates}
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                dateFilter === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.todayOnly}
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.allStatuses}
            </button>
            <button
              onClick={() => setStatusFilter('due')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'due' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.dueOnly}
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'paid' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.paidOnly}
            </button>
          </div>

          {/* Counter filter dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={counterFilter}
              onChange={(e) => setCounterFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 text-slate-800 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-[#4b1d3f]"
            >
              <option value="all">All Counters (সকল কাউন্টার)</option>
              {(config.counters || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {lang === 'bn' ? (c.nameBn || c.name) : c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredBills.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
            <p>{t.noBillsFound}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Due (₹)</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Bill No */}
                    <td className="py-3 px-4 font-mono font-bold text-[#4b1d3f]">
                      <div>{bill.billNo}</div>
                      {bill.counterName && (
                        <span className="inline-block text-[9px] font-sans font-extrabold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded mt-0.5">
                          {bill.counterName}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-600">
                      <div>{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{bill.customerName}</div>
                      {bill.customerMobile && (
                        <div className="text-[11px] font-mono text-slate-500">{bill.customerMobile}</div>
                      )}
                      {bill.cakeMessage && (
                        <div className="text-[10px] text-amber-700 italic truncate max-w-[150px]">
                          "{bill.cakeMessage}"
                        </div>
                      )}
                    </td>

                    {/* Items Summary */}
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold block">{bill.items.length} items</span>
                      <span className="text-[11px] text-slate-500 truncate block max-w-[180px]">
                        {bill.items.map((i) => i.name).join(', ')}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ₹{bill.grandTotal.toFixed(2)}
                    </td>

                    {/* Due */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {bill.dueAmount > 0 ? (
                        <span className="text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded">
                          ₹{bill.dueAmount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">₹0.00</span>
                      )}
                    </td>

                    {/* Payment Mode */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                        {bill.paymentMethod}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {/* Mark Due Paid */}
                      {bill.dueAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsFullyPaid(bill)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Mark Due as Fully Paid"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Print / View */}
                      <button
                        type="button"
                        onClick={() => onReprintBill(bill)}
                        className="p-1.5 rounded-lg text-[#4b1d3f] hover:bg-amber-50 transition-colors"
                        title={t.viewAndPrint}
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Edit Bill */}
                      {hasPermission(userSession, 'canEditBill', config) ? (
                        <button
                          type="button"
                          onClick={() => setEditingBillModal(bill)}
                          className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition-colors"
                          title="Edit Bill (বিল এডিট / সংশোধন)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      ) : null}

                      {/* WhatsApp Share */}
                      <button
                        type="button"
                        onClick={() => openWhatsAppShare(bill, config)}
                        className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title={t.sendWhatsApp}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {/* Direct WhatsApp Thank You */}
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsAppThankYou(bill)}
                        disabled={!bill.customerMobile}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 transition-colors"
                        title="Direct WhatsApp Thank You message (সরাসরি হোয়াটসঅ্যাপ ধন্যবাদ)"
                      >
                        <MessageCircle className="w-4 h-4 fill-emerald-100" />
                      </button>

                      {/* Direct SMS API Gateway Receipt & Loyalty */}
                      <button
                        type="button"
                        onClick={() => handleSendSmsApiReceipt(bill)}
                        disabled={!bill.customerMobile || isSendingSmsId === bill.id}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors"
                        title="Send Digital Receipt & Loyalty Update via SMS API (সরাসরি SMS API দিয়ে পাঠান)"
                      >
                        {isSendingSmsId === bill.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        ) : (
                          <Zap className="w-4 h-4 fill-blue-100" />
                        )}
                      </button>

                      {/* Direct SMS Thank You */}
                      <button
                        type="button"
                        onClick={() => handleDirectSmsThankYou(bill)}
                        disabled={!bill.customerMobile}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 transition-colors"
                        title="Open SMS App / Dispatcher"
                      >
                        <MessageSquare className="w-4 h-4 fill-indigo-100" />
                      </button>

                      {/* Thank You Modal Picker */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedThankYouBill(bill);
                          setIsThankYouModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Open Thank You Message Studio"
                      >
                        <Heart className="w-4 h-4 fill-rose-100" />
                      </button>

                      {/* Delete (Protected by Admin Permission) */}
                      {hasPermission(userSession, 'canDeleteBill', config) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(bill.id, bill.billNo, bill)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={t.deleteBill}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Appreciation & Thank You Modal */}
      <CustomerThankYouModal
        isOpen={isThankYouModalOpen}
        onClose={() => {
          setIsThankYouModalOpen(false);
          setSelectedThankYouBill(null);
        }}
        bills={bills}
        config={config}
        lang={lang}
        preSelectedBill={selectedThankYouBill}
        onConfigUpdate={setConfig}
      />

      {/* SMS & Message Helper Modal */}
      {selectedSmsData && (
        <SmsModal
          isOpen={Boolean(selectedSmsData)}
          onClose={() => setSelectedSmsData(null)}
          phone={selectedSmsData.phone}
          customerName={selectedSmsData.name}
          messageText={selectedSmsData.text}
          config={config}
          billNo={selectedSmsData.billNo}
          bill={selectedSmsData.bill}
        />
      )}

      {/* Edit Bill Modal */}
      {editingBillModal && (
        <EditBillModal
          isOpen={Boolean(editingBillModal)}
          onClose={() => setEditingBillModal(null)}
          bill={editingBillModal}
          config={config}
          lang={lang}
          onSaved={() => {
            setEditingBillModal(null);
            onRefresh();
          }}
          onReopenInBilling={onEditBill}
          onDelete={(id) => handleDelete(id, editingBillModal.billNo, editingBillModal)}
        />
      )}

      {/* In-App Delete Confirmation Modal (Bypasses browser window.confirm restriction) */}
      {billPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white leading-tight">
                    {lang === 'bn' ? 'বিল মুছে ফেলা নিশ্চিতকরণ' : 'Confirm Invoice Deletion'}
                  </h3>
                  <span className="text-xs text-rose-100 font-mono">
                    #{billPendingDelete.billNo}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillPendingDelete(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {lang === 'bn'
                  ? `আপনি কি নিশ্চিত যে আপনি বিল #${billPendingDelete.billNo} স্থায়ীভাবে মুছে ফেলতে চান?`
                  : `Are you sure you want to permanently delete Bill #${billPendingDelete.billNo}?`}
              </p>

              {(billPendingDelete.customerName || billPendingDelete.grandTotal !== undefined) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                  {billPendingDelete.customerName && (
                    <div className="text-slate-600">
                      {lang === 'bn' ? 'গ্রাহক:' : 'Customer:'} <b className="text-slate-900">{billPendingDelete.customerName}</b>
                    </div>
                  )}
                  {billPendingDelete.grandTotal !== undefined && (
                    <div className="text-slate-600">
                      {lang === 'bn' ? 'মোট পরিমাণ:' : 'Grand Total:'} <b className="text-slate-900">₹{billPendingDelete.grandTotal.toFixed(2)}</b>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {lang === 'bn'
                    ? 'সতর্কতা: একবার মুছে ফেললে এই বিলটি আর পুনরুদ্ধার করা যাবে না।'
                    : 'Warning: Once deleted, this invoice cannot be recovered.'}
                </span>
              </p>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBillPendingDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? (lang === 'bn' ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...') : (lang === 'bn' ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
