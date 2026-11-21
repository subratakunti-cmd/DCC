import React, { useState, useEffect } from 'react';
import { ShopConfig, Bill, CustomerLoyalty } from '../types';
import { triggerSms, isMobileDevice } from '../utils/upi';
import { sendSmsApi, getSmsServerStatus, generateDigitalReceiptAndLoyaltySms } from '../services/smsService';
import {
  X,
  MessageSquare,
  MessageCircle,
  Copy,
  Check,
  Smartphone,
  Send,
  AlertCircle,
  Phone,
  ExternalLink,
  Store,
  Zap,
  CheckCircle2,
  RefreshCw,
  Award,
  Receipt
} from 'lucide-react';

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  customerName?: string;
  messageText: string;
  config: ShopConfig;
  billNo?: string;
  bill?: Bill;
  loyalty?: CustomerLoyalty | null;
  onSmsSentSuccess?: (result: { provider: string; messageId?: string }) => void;
}

export const SmsModal: React.FC<SmsModalProps> = ({
  isOpen,
  onClose,
  phone: initialPhone,
  customerName,
  messageText: initialMessageText,
  config,
  billNo,
  bill,
  loyalty,
  onSmsSentSuccess
}) => {
  const shopPhone = config.phone || '7866971421';
  const cleanShopPhone = shopPhone.replace(/\D/g, '') || '7866971421';

  const [phone, setPhone] = useState<string>(initialPhone || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [isSendingApi, setIsSendingApi] = useState<boolean>(false);
  const [apiResult, setApiResult] = useState<{
    success: boolean;
    provider?: string;
    messageId?: string;
    error?: string;
  } | null>(null);

  const [messageMode, setMessageMode] = useState<'full' | 'loyaltyOnly'>('full');
  const [activeLang, setActiveLang] = useState<'bn' | 'en'>(config.smsLanguage === 'en' ? 'en' : 'bn');

  const [serverGateway, setServerGateway] = useState<{
    activeGateway: string;
    isKeyConfigured: boolean;
    senderPhone: string;
  }>({
    activeGateway: 'Loading gateway...',
    isKeyConfigured: false,
    senderPhone: '7866971421'
  });

  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone || '');
      setApiResult(null);
      getSmsServerStatus().then((s) => {
        setServerGateway({
          activeGateway: s.activeGateway,
          isKeyConfigured: s.isKeyConfigured,
          senderPhone: s.senderPhone || '7866971421'
        });
      });
    }
  }, [isOpen, initialPhone]);

  // Compute live message text
  const currentMessageText = React.useMemo(() => {
    if (bill) {
      if (messageMode === 'loyaltyOnly' && loyalty) {
        const shopName = config.shopName || 'DELICIOUS CAKE CORNER';
        const tierName = loyalty.tierName || 'Member';
        const tierBadge = loyalty.tierBadge || '⭐';
        if (activeLang === 'bn') {
          return `🎂 ${shopName}\n` +
            `নমস্কার ${customerName || loyalty.customerName}!\n` +
            `আপনার লয়ালটি রিওয়ার্ড আপডেট:\n` +
            `পয়েন্টস ব্যালেন্স: ${loyalty.pointsBalance} pts (মূল্য ₹${loyalty.pointsBalance})\n` +
            `বর্তমান টিয়ার: ${tierBadge} ${tierName}\n` +
            `মোট ভিজিট: ${loyalty.totalOrders} বার | মোট কেনাকাটা: ₹${loyalty.totalSpent}\n` +
            `পরবর্তী কেনাকাটায় এই পয়েন্ট ব্যবহার করুন! ধন্যবাদ! 📞 ${shopPhone}`;
        }
        return `🎂 ${shopName}\n` +
          `Hello ${customerName || loyalty.customerName}!\n` +
          `Loyalty Tier Update:\n` +
          `Points Balance: ${loyalty.pointsBalance} pts (Value: ₹${loyalty.pointsBalance})\n` +
          `Current Tier: ${tierBadge} ${tierName}\n` +
          `Total Visits: ${loyalty.totalOrders} | Lifetime Spend: ₹${loyalty.totalSpent}\n` +
          `Redeem points on your next purchase! Phone: ${shopPhone}`;
      }
      return generateDigitalReceiptAndLoyaltySms(bill, config, loyalty, activeLang);
    }
    return initialMessageText;
  }, [bill, config, loyalty, messageMode, activeLang, customerName, shopPhone, initialMessageText]);

  if (!isOpen) return null;

  const cleanPhone = phone.replace(/\D/g, '');
  const isMobile = isMobileDevice();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Direct SMS API Gateway Dispatch
  const handleSendViaSmsApi = async () => {
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('দয়া করে গ্রাহকের সঠিক ১০-সংখ্যার মোবাইল নম্বর দিন।');
      return;
    }

    setIsSendingApi(true);
    setApiResult(null);

    try {
      const res = await sendSmsApi({
        to: cleanPhone,
        message: currentMessageText,
        billNo: billNo || bill?.billNo,
        customerName: customerName || bill?.customerName,
        type: messageMode === 'loyaltyOnly' ? 'loyalty' : 'receipt'
      });

      setApiResult(res);

      if (res.success) {
        setSentNotice(`SMS সফলভাবে গ্রাহকের নম্বরে (+91${cleanPhone.slice(-10)}) পাঠানো হয়েছে!`);
        if (onSmsSentSuccess) {
          onSmsSentSuccess({
            provider: res.provider || 'SMS Gateway',
            messageId: res.messageId
          });
        }
      } else {
        setSentNotice(`SMS পাঠাতে ব্যর্থ: ${res.error || 'Server error'}`);
      }
    } catch (err: any) {
      setApiResult({
        success: false,
        error: err?.message || 'Network error reaching SMS gateway'
      });
    } finally {
      setIsSendingApi(false);
    }
  };

  const handleSendSimSms = () => {
    if (!cleanPhone) {
      alert('দয়া করে গ্রাহকের সঠিক ফোন নম্বর দিন।');
      return;
    }
    triggerSms(cleanPhone, currentMessageText);
    setSentNotice('মেসেজ অ্যাপ খোলা হচ্ছে এবং টেক্সট কপি করা হয়েছে!');
    setTimeout(() => setSentNotice(null), 3500);
  };

  const handleSendWhatsAppCustomer = () => {
    const target = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    if (target && target.length >= 10) {
      window.open(
        `https://api.whatsapp.com/send?phone=${target}&text=${encodeURIComponent(currentMessageText)}`,
        '_blank'
      );
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(currentMessageText)}`, '_blank');
    }
  };

  const handleSendWhatsAppShop = () => {
    window.open(
      `https://api.whatsapp.com/send?phone=91${cleanShopPhone}&text=${encodeURIComponent(currentMessageText)}`,
      '_blank'
    );
  };

  const handleOpenWhatsAppWeb = () => {
    window.open('https://web.whatsapp.com', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 border border-slate-200 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 fill-emerald-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                SMS API & Digital Receipt Gateway
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {billNo || bill?.billNo ? `Bill No: ${billNo || bill?.billNo}` : 'Direct Customer Notification'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Server Gateway Indicator */}
        <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">
                  SMS Gateway
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              </div>
              <span className="font-bold text-slate-900 text-xs block">
                {serverGateway.activeGateway}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Sender Phone</span>
            <span className="font-mono font-bold text-blue-900 text-xs">
              +91 {serverGateway.senderPhone}
            </span>
          </div>
        </div>

        {/* Notice Toast / Result Banner */}
        {sentNotice && (
          <div className={`my-2 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            apiResult?.success !== false
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {apiResult?.success !== false ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div className="flex-1">
              <span>{sentNotice}</span>
              {apiResult?.messageId && (
                <div className="text-[10px] font-mono text-emerald-700 mt-0.5">
                  ID: {apiResult.messageId} | Gateway: {apiResult.provider}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Language & Mode Toggle */}
        <div className="my-2 flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMessageMode('full')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                messageMode === 'full' ? 'bg-[#4b1d3f] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3 h-3 inline mr-1" />
              Receipt + Loyalty
            </button>
            {loyalty && (
              <button
                type="button"
                onClick={() => setMessageMode('loyaltyOnly')}
                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                  messageMode === 'loyaltyOnly' ? 'bg-[#4b1d3f] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3 h-3 inline mr-1" />
                Loyalty Only
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveLang('bn')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeLang === 'bn' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              বাংলা (BN)
            </button>
            <button
              type="button"
              onClick={() => setActiveLang('en')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeLang === 'en' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              English (EN)
            </button>
          </div>
        </div>

        {/* Recipient Phone Input */}
        <div className="space-y-1.5 text-left mb-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              গ্রাহকের ফোন নম্বর (Customer Mobile):
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPhone(cleanShopPhone)}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
              >
                Use Shop Phone ({cleanShopPhone})
              </button>
            </div>
          </div>

          <div className="relative">
            <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number..."
              maxLength={10}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          {customerName && (
            <span className="text-[11px] text-slate-500 font-medium block">
              গ্রাহকের নাম: <strong>{customerName}</strong>
            </span>
          )}
        </div>

        {/* Message Preview Box */}
        <div className="space-y-1 text-left mb-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              মেসেজের বিবরণ (SMS Message Preview):
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {currentMessageText.length} chars (Unicode)
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
            {currentMessageText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* PRIMARY 1: Instant Server SMS API Dispatch */}
          <button
            type="button"
            onClick={handleSendViaSmsApi}
            disabled={isSendingApi || cleanPhone.length < 10}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
          >
            {isSendingApi ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {isSendingApi
                ? 'Sending via SMS API Gateway...'
                : '🚀 Send via SMS API (সরাসরি SMS API দিয়ে পাঠান)'}
            </span>
          </button>

          {/* SECONDARY: WhatsApp to Customer */}
          <button
            type="button"
            onClick={handleSendWhatsAppCustomer}
            className="w-full py-2 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Send to Customer via WhatsApp (কাস্টমার হোয়াটসঅ্যাপ)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* Native Phone SMS App */}
            <button
              type="button"
              onClick={handleSendSimSms}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span className="truncate">Open SMS App</span>
            </button>

            {/* Copy Message Text */}
            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="truncate">{copied ? 'কপি হয়েছে!' : 'Copy Text'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 px-4 text-slate-500 hover:text-slate-800 rounded-xl font-medium text-xs transition-colors"
          >
            Close / বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
