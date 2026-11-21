import React, { useState, useEffect, useMemo } from 'react';
import { SmsDeliveryLog, ShopConfig, Language, Bill, CustomerLoyalty } from '../types';
import {
  fetchMergedSmsLogs,
  deleteSmsLog,
  clearAllSmsLogs,
  resendSmsLog,
  sendSmsApi,
  getSmsServerStatus,
  seedInitialSmsLogsIfEmpty
} from '../services/smsService';
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  FileSpreadsheet,
  Phone,
  RotateCcw,
  Smartphone,
  ChevronDown,
  ChevronUp,
  X,
  Plus
} from 'lucide-react';

interface SmsActivityLogViewProps {
  bills: Bill[];
  config: ShopConfig;
  lang: Language;
  filterCustomerMobile?: string;
  onSelectCustomerForBilling?: (customer: CustomerLoyalty) => void;
  onViewBillInHistory?: (billNo: string) => void;
}

export const SmsActivityLogView: React.FC<SmsActivityLogViewProps> = ({
  bills,
  config,
  lang,
  filterCustomerMobile,
  onSelectCustomerForBilling,
  onViewBillInHistory
}) => {
  const [logs, setLogs] = useState<SmsDeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(filterCustomerMobile || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'sent' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'receipt' | 'loyalty' | 'custom'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Send New SMS modal
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composePhone, setComposePhone] = useState<string>(filterCustomerMobile || '');
  const [composeName, setComposeName] = useState<string>('');
  const [composeBillNo, setComposeBillNo] = useState<string>('');
  const [composeMessage, setComposeMessage] = useState<string>('');
  const [isSendingCompose, setIsSendingCompose] = useState<boolean>(false);

  // Gateway server status
  const [gatewayInfo, setGatewayInfo] = useState<{
    activeGateway: string;
    isKeyConfigured: boolean;
    totalDispatched: number;
    senderPhone: string;
  }>({
    activeGateway: 'Checking gateway...',
    isKeyConfigured: false,
    totalDispatched: 0,
    senderPhone: config.phone || '7866971421'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load and merge logs
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // Seed if completely empty
      seedInitialSmsLogsIfEmpty(bills, config);
      const merged = await fetchMergedSmsLogs();
      setLogs(merged);
      const status = await getSmsServerStatus();
      setGatewayInfo(status);
    } catch (err) {
      console.warn('Failed to load SMS activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Update searchQuery if prop filter changes
  useEffect(() => {
    if (filterCustomerMobile) {
      setSearchQuery(filterCustomerMobile);
    }
  }, [filterCustomerMobile]);

  // Copy message helper
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(lang === 'bn' ? 'মেসেজ কপি করা হয়েছে!' : 'SMS text copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Resend / Retry SMS helper
  const handleResend = async (log: SmsDeliveryLog) => {
    setResendingId(log.id);
    try {
      const res = await resendSmsLog(log);
      if (res.success) {
        showToast(
          lang === 'bn'
            ? `এসএমএস সফলভাবে পুনরায় পাঠানো হয়েছে (${res.provider || 'SMS Gateway'})!`
            : `SMS resent successfully via ${res.provider || 'SMS Gateway'}!`
        );
      } else {
        showToast(`SMS Notice: ${res.error || 'Failed to dispatch'}`);
      }
      await loadLogs();
    } catch (err: any) {
      showToast(`Error: ${err?.message || 'Failed to resend'}`);
    } finally {
      setResendingId(null);
    }
  };

  // Delete single log
  const handleDeleteLog = async (id: string) => {
    if (!window.confirm(lang === 'bn' ? 'এই এসএমএস লগ রেকর্ডটি মুছে ফেলবেন?' : 'Delete this SMS activity record?')) {
      return;
    }
    await deleteSmsLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    showToast(lang === 'bn' ? 'লগ রেকর্ড মুছে ফেলা হয়েছে।' : 'Log entry removed.');
  };

  // Clear all logs
  const handleClearAll = async () => {
    if (!window.confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত সব এসএমএস লগ মুছে ফেলতে চান?' : 'Are you sure you want to clear all SMS activity logs?')) {
      return;
    }
    await clearAllSmsLogs();
    setLogs([]);
    showToast(lang === 'bn' ? 'সকল এসএমএস লগ মুছে ফেলা হয়েছে।' : 'All SMS activity logs cleared.');
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (logs.length === 0) {
      alert(lang === 'bn' ? 'রপ্তানি করার মতো কোনো এসএমএস রেকর্ড নেই।' : 'No SMS records to export.');
      return;
    }

    const headers = [
      'Log ID',
      'Date & Time',
      'Recipient Mobile',
      'Customer Name',
      'Bill Number',
      'Notification Type',
      'Delivery Status',
      'Provider / Gateway',
      'Message ID',
      'Message Content'
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString('en-IN')}"`,
      `"${l.recipientPhone}"`,
      `"${(l.customerName || '').replace(/"/g, '""')}"`,
      `"${l.billNo || 'N/A'}"`,
      `"${l.type}"`,
      `"${l.status}"`,
      `"${(l.provider || '').replace(/"/g, '""')}"`,
      `"${l.messageId || 'N/A'}"`,
      `"${(l.message || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.join('\n')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DCC_SMS_Activity_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Send Custom / Manual SMS
  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = composePhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert(lang === 'bn' ? 'দয়া করে সঠিক ১০-সংখ্যার মোবাইল নম্বর দিন।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!composeMessage.trim()) {
      alert(lang === 'bn' ? 'দয়া করে মেসেজ লিখুন।' : 'Please enter SMS message text.');
      return;
    }

    setIsSendingCompose(true);
    try {
      const res = await sendSmsApi({
        to: cleanPhone,
        message: composeMessage.trim(),
        customerName: composeName.trim() || undefined,
        billNo: composeBillNo.trim() || undefined,
        type: 'custom'
      });

      if (res.success) {
        showToast(
          lang === 'bn'
            ? `এসএমএস সফলভাবে পাঠানো হয়েছে (${res.provider || 'Gateway'})!`
            : `SMS notification dispatched successfully via ${res.provider || 'Gateway'}!`
        );
        setIsComposeOpen(false);
        setComposeMessage('');
        setComposePhone('');
        setComposeName('');
        setComposeBillNo('');
        await loadLogs();
      } else {
        alert(lang === 'bn' ? `পাঠানো যায়নি: ${res.error}` : `Failed to dispatch SMS: ${res.error}`);
      }
    } catch (err: any) {
      alert(`SMS Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsSendingCompose(false);
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPhone = log.recipientPhone.includes(q);
        const matchName = (log.customerName || '').toLowerCase().includes(q);
        const matchBill = (log.billNo || '').toLowerCase().includes(q);
        const matchContent = log.message.toLowerCase().includes(q);
        const matchProvider = (log.provider || '').toLowerCase().includes(q);
        if (!matchPhone && !matchName && !matchBill && !matchContent && !matchProvider) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'delivered' && log.status !== 'delivered') return false;
        if (statusFilter === 'sent' && log.status !== 'sent') return false;
        if (statusFilter === 'failed' && log.status !== 'failed') return false;
      }

      // Type
      if (typeFilter !== 'all') {
        if (log.type !== typeFilter) return false;
      }

      return true;
    });
  }, [logs, searchQuery, statusFilter, typeFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = logs.length;
    const delivered = logs.filter((l) => l.status === 'delivered').length;
    const sent = logs.filter((l) => l.status === 'sent').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const receiptType = logs.filter((l) => l.type === 'receipt').length;
    return {
      total,
      delivered,
      sent,
      failed,
      receiptType,
      successRate: total > 0 ? Math.round(((delivered + sent) / total) * 100) : 100
    };
  }, [logs]);

  // Format timestamp helper
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diffMin = Math.floor((now - ts) / (60 * 1000));

    let relative = '';
    if (diffMin < 1) relative = lang === 'bn' ? 'এইমাত্র' : 'Just now';
    else if (diffMin < 60) relative = lang === 'bn' ? `${diffMin} মি. আগে` : `${diffMin}m ago`;
    else if (diffMin < 24 * 60) relative = lang === 'bn' ? `${Math.floor(diffMin / 60)} ঘণ্টা আগে` : `${Math.floor(diffMin / 60)}h ago`;
    else relative = lang === 'bn' ? `${Math.floor(diffMin / (24 * 60))} দিন আগে` : `${Math.floor(diffMin / (24 * 60))}d ago`;

    const formatted = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return { formatted, relative };
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#4b1d3f] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold border border-amber-300/40 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Gateway Health Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#4b1d3f] border border-purple-200 flex items-center justify-center font-bold shadow-xs">
              <MessageSquare className="w-5 h-5 text-[#4b1d3f]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{lang === 'bn' ? 'এসএমএস অ্যাক্টিভিটি ও ডেলিভারি লগ' : 'SMS Activity & Delivery Log'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold border border-emerald-200">
                  {logs.length} {lang === 'bn' ? 'টি বার্তা' : 'Messages'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'bn'
                  ? 'গ্রাহকদের পাঠানো সকল ডিজিটাল ইনভয়েস ও লয়ালটি নোটিফিকেশনের ডেলিভারি স্থিতি এবং কন্টেন্ট'
                  : 'Track real-time delivery status, timestamps, and full text of sent billing notifications'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Active Gateway Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              gatewayInfo.isKeyConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
            title="SMS gateway provider status"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{gatewayInfo.activeGateway}</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
            title="Refresh SMS activity records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            title="Export SMS activity log to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'bn' ? 'CSV রপ্তানি' : 'Export CSV'}</span>
          </button>

          {/* Clear Logs */}
          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors"
              title="Clear all stored logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লগ মুছুন' : 'Clear'}</span>
            </button>
          )}

          {/* Compose / Send SMS Button */}
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-amber-300" />
            <span>{lang === 'bn' ? '+ নতুন বার্তা পাঠান' : '+ Send Notification'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Dispatched */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'bn' ? 'মোট প্রেরিত এসএমএস' : 'Total Messages Sent'}
            </span>
            <MessageSquare className="w-4 h-4 text-[#4b1d3f]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-700 font-bold">{stats.receiptType}</span>
            <span>{lang === 'bn' ? 'ডিজিটাল রসিদ বার্তা' : 'billing receipt notices'}</span>
          </div>
        </div>

        {/* Successfully Delivered */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'bn' ? 'সফল ডেলিভারি' : 'Delivered / Dispatched'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {stats.delivered + stats.sent}
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-1">
            {stats.successRate}% {lang === 'bn' ? 'সাফল্যের হার' : 'delivery success rate'}
          </div>
        </div>

        {/* Failed Dispatches */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'bn' ? 'ব্যর্থ বার্তা' : 'Failed Attempts'}
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black font-mono ${stats.failed > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {stats.failed}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.failed > 0
              ? lang === 'bn' ? 'পুনরায় চেষ্টা করার সুবিধা উপলব্ধ' : 'One-click retry available below'
              : lang === 'bn' ? 'কোনো ব্যর্থতা নেই' : 'Zero transmission failures'}
          </div>
        </div>

        {/* Active Gateway */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'bn' ? 'সক্রিয় গেটওয়ে' : 'Active Gateway'}
            </span>
            <Smartphone className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-black text-slate-900 truncate">
            {gatewayInfo.activeGateway}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sender: +91 {gatewayInfo.senderPhone}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'bn' ? 'মোবাইল নম্বর, গ্রাহকের নাম, বিল নম্বর বা বার্তা দিয়ে খুঁজুন...' : 'Search by phone number, customer name, bill number, or text...'}
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

          {/* Delivery Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-[#4b1d3f] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'} ({logs.length})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ডেলিভার্ড' : 'Delivered'}</span> ({stats.delivered})
            </button>
            <button
              onClick={() => setStatusFilter('sent')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'sent'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'প্রেরিত' : 'Sent'}</span> ({stats.sent})
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'failed'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ব্যর্থ' : 'Failed'}</span> ({stats.failed})
            </button>
          </div>

          {/* Message Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 font-semibold focus:outline-hidden"
            >
              <option value="all">All Notification Types</option>
              <option value="receipt">Billing Receipts Only</option>
              <option value="loyalty">Loyalty Updates Only</option>
              <option value="custom">Custom / Direct SMS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Log Cards / Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">
            {lang === 'bn' ? 'কোনো এসএমএস অ্যাক্টিভিটি পাওয়া যায়নি' : 'No SMS activity logs found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? lang === 'bn' ? 'অনুগ্রহ করে ফিল্টার পরিবর্তন করে পুনরায় দেখুন।' : 'Try clearing your search query or adjusting filters.'
              : lang === 'bn' ? 'বিল তৈরি করার সময় বা কাস্টমার সিআরএম থেকে পাঠানো সব মেসেজ এখানে প্রদর্শিত হবে।' : 'Sent digital receipts and loyalty messages will automatically appear in this activity feed.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                seedInitialSmsLogsIfEmpty(bills, config);
                loadLogs();
              }}
              className="px-3.5 py-1.5 bg-[#4b1d3f] text-white rounded-xl text-xs font-bold hover:bg-[#38152e] transition-colors"
            >
              {lang === 'bn' ? 'বিল থেকে সাম্প্রতিক লগ লোড করুন' : 'Load Logs from Recent Bills'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const { formatted, relative } = formatTime(log.timestamp);
            const isDelivered = log.status === 'delivered';
            const isSent = log.status === 'sent';
            const isFailed = log.status === 'failed';

            return (
              <div
                key={log.id}
                className={`bg-white rounded-2xl border transition-all p-4 shadow-2xs hover:shadow-xs ${
                  isFailed
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200/90 hover:border-purple-300'
                }`}
              >
                {/* Header row: Status, Recipient, Timestamp, Bill No */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase font-mono tracking-wider ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isSent
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {isDelivered && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {isSent && <Clock className="w-3 h-3 text-blue-600" />}
                      {isFailed && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                      <span>{log.status}</span>
                    </span>

                    {/* Notification Type Pill */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-[#4b1d3f] border border-purple-200/70 uppercase">
                      {log.type === 'receipt' ? '🧾 Billing Receipt' : log.type === 'loyalty' ? '⭐ Loyalty Update' : '💬 Custom SMS'}
                    </span>

                    {/* Linked Bill Number */}
                    {log.billNo && (
                      <span
                        onClick={() => onViewBillInHistory && onViewBillInHistory(log.billNo!)}
                        className={`text-xs font-mono font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-950 border border-amber-200 ${
                          onViewBillInHistory ? 'cursor-pointer hover:bg-amber-100' : ''
                        }`}
                        title="Linked bill number"
                      >
                        Bill #{log.billNo}
                      </span>
                    )}

                    {/* Recipient Phone */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <a
                        href={`tel:${log.recipientPhone}`}
                        className="hover:text-[#4b1d3f] hover:underline"
                        title="Call recipient"
                      >
                        +91 {log.recipientPhone}
                      </a>
                    </div>

                    {/* Customer Name */}
                    {log.customerName && (
                      <span className="text-xs font-semibold text-slate-600">
                        ({log.customerName})
                      </span>
                    )}
                  </div>

                  {/* Right side: Timestamp and relative time */}
                  <div className="flex items-center gap-2 text-right shrink-0">
                    <span className="text-[11px] font-medium text-slate-400">
                      {relative}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-600 font-semibold">
                      {formatted}
                    </span>
                  </div>
                </div>

                {/* Content preview row */}
                <div className="mt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div
                        className={`text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 ${
                          !isExpanded ? 'line-clamp-3' : ''
                        }`}
                      >
                        {log.message}
                      </div>

                      {/* Character count & segment */}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                        <span>{log.message.length} chars</span>
                        <span>•</span>
                        <span>{Math.ceil(log.message.length / 160)} SMS segment(s)</span>
                        {log.provider && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 font-semibold">{log.provider}</span>
                          </>
                        )}
                        {log.messageId && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">ID: {log.messageId}</span>
                          </>
                        )}
                        {log.error && (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-bold">Error: {log.error}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer action bar */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {/* Left: Expand toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#4b1d3f] transition-colors"
                  >
                    <span>{isExpanded ? (lang === 'bn' ? 'সংক্ষিপ্ত করুন' : 'Show Less') : (lang === 'bn' ? 'পুরো বার্তা দেখুন' : 'Show Full Message')}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Right: Actions (Copy, WhatsApp, Retry, Delete) */}
                  <div className="flex items-center gap-1.5">
                    {/* Copy text */}
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(log.id, log.message)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      title="Copy SMS text"
                    >
                      {copiedId === log.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* WhatsApp share fallback */}
                    <a
                      href={`https://wa.me/91${log.recipientPhone}?text=${encodeURIComponent(log.message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
                      title="Open in WhatsApp Web"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>

                    {/* Resend / Retry Button */}
                    <button
                      type="button"
                      onClick={() => handleResend(log)}
                      disabled={resendingId === log.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                      title="Resend this message via SMS gateway"
                    >
                      <RotateCcw className={`w-3 h-3 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                      <span>{resendingId === log.id ? 'Sending...' : 'Resend'}</span>
                    </button>

                    {/* Delete log */}
                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose / Direct Send SMS Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#4b1d3f] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-base">
                  {lang === 'bn' ? 'গ্রাহককে নতুন এসএমএস পাঠান' : 'Send Customer SMS Notification'}
                </h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendCompose} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'bn' ? 'গ্রাহকের মোবাইল নম্বর (১০ ডিজিট) *' : 'Recipient Mobile Number (10 Digits) *'}
                </label>
                <input
                  type="tel"
                  required
                  value={composePhone}
                  onChange={(e) => setComposePhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 7866971421"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'bn' ? 'গ্রাহকের নাম (ঐচ্ছিক)' : 'Customer Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={composeName}
                    onChange={(e) => setComposeName(e.target.value)}
                    placeholder="e.g. Priya Roy"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'bn' ? 'বিল নম্বর (ঐচ্ছিক)' : 'Bill Number (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={composeBillNo}
                    onChange={(e) => setComposeBillNo(e.target.value)}
                    placeholder="e.g. DCC-1025"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {lang === 'bn' ? 'বার্তা লিখুন *' : 'SMS Message Content *'}
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {composeMessage.length} chars • {Math.ceil(composeMessage.length / 160)} SMS
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder="e.g. 🎂 Delicious Cake Corner: আপনার অর্ডার তৈরি হয়েছে! ধন্যবাদ!"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingCompose}
                  className="px-4 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 text-amber-300 ${isSendingCompose ? 'animate-pulse' : ''}`} />
                  <span>{isSendingCompose ? 'Sending SMS...' : lang === 'bn' ? 'এসএমএস পাঠান' : 'Dispatch SMS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
