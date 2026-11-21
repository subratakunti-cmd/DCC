import React, { useState, useMemo, useEffect } from 'react';
import { Bill, ShopConfig, Language } from '../types';
import { saveShopConfig } from '../utils/storage';
import { triggerSms } from '../utils/upi';
import { sendSmsApi } from '../services/smsService';
import {
  Heart,
  MessageCircle,
  MessageSquare,
  Copy,
  Check,
  Send,
  Users,
  Search,
  Sparkles,
  Cake,
  Calendar,
  Phone,
  Gift,
  X,
  ExternalLink,
  Save,
  RotateCcw,
  Edit3,
  Tag,
  Zap
} from 'lucide-react';

interface CustomerThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  config: ShopConfig;
  lang: Language;
  preSelectedBill?: Bill | null;
  onConfigUpdate?: (newConfig: ShopConfig) => void;
}

interface CustomerSummary {
  name: string;
  mobile: string;
  totalBills: number;
  totalSpent: number;
  lastDate: string;
  lastBillNo: string;
  lastItems: string;
}

export const CustomerThankYouModal: React.FC<CustomerThankYouModalProps> = ({
  isOpen,
  onClose,
  bills,
  config,
  lang,
  preSelectedBill,
  onConfigUpdate
}) => {
  // Aggregate unique customers from bills
  const customers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    bills.forEach((b) => {
      const key = b.customerMobile || b.customerName || 'Walk-in';
      if (!map.has(key)) {
        map.set(key, {
          name: b.customerName || 'Valued Customer',
          mobile: b.customerMobile || '',
          totalBills: 0,
          totalSpent: 0,
          lastDate: b.date,
          lastBillNo: b.billNo,
          lastItems: b.items.map((i) => i.name).join(', ')
        });
      }
      const existing = map.get(key)!;
      existing.totalBills += 1;
      existing.totalSpent += b.grandTotal;
    });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [bills]);

  const [search, setSearch] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(() => {
    if (preSelectedBill) {
      return {
        name: preSelectedBill.customerName || 'Valued Customer',
        mobile: preSelectedBill.customerMobile || '',
        totalBills: 1,
        totalSpent: preSelectedBill.grandTotal,
        lastDate: preSelectedBill.date,
        lastBillNo: preSelectedBill.billNo,
        lastItems: preSelectedBill.items.map((i) => i.name).join(', ')
      };
    }
    return customers[0] || null;
  });

  const [activeTemplateKey, setActiveTemplateKey] = useState<string>('bengali');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedNumbers, setCopiedNumbers] = useState<boolean>(false);
  const [savedDefaultToast, setSavedDefaultToast] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Default Standard Bengali Thank You Message
  const DEFAULT_STANDARD_BN = `প্রিয় {name}, ডেলিসিয়াস কেক কর্নার-এ আসার জন্য আপনাকে আন্তরিক ধন্যবাদ ও শুভেচ্ছা! 🎂✨ আমাদের ১০০% এগলেস স্পেশাল ফ্রেশ কেক আপনার পারিবারিক অনুষ্ঠান ও উৎসবের মুহূর্তগুলিকে আরও মিষ্টি ও আনন্দময় করে তুলুক। প্রয়োজনে কল বা হোয়াটসঅ্যাপ করুন: ${config.phone}। আবার আসবেন! 🎉`;

  // Custom live editable text
  const [editedText, setEditedText] = useState<string>('');

  const TEMPLATES: Record<string, { label: string; icon: string; text: string }> = {
    bengali: {
      label: '🇮🇳 বাংলা ধন্যবাদ বার্তা (General Appreciation)',
      icon: '🇮🇳',
      text: config.thankYouMessageBn || DEFAULT_STANDARD_BN
    },
    bengali_bday: {
      label: '🎉 শুভ জন্মদিন বার্তা (Bangla Birthday)',
      icon: '🎉',
      text: `প্রিয় {name},\n\nডেলিসিয়াস কেক কর্নার-এর পক্ষ থেকে জন্মদিনের অনেক অনেক শুভেচ্ছা ও আন্তরিক ভালোবাসা! 🎂🎈✨\n\nআপনার বিশেষ দিনটি আনন্দ, হাসি ও মিষ্টি স্মৃতিতে ভরে উঠুক! আমাদের ১০০% এগলেস স্পেশাল কেক বেছে নেওয়ার জন্য ধন্যবাদ।\n\nপরবর্তী যেকোনো অর্ডারের জন্য যোগাযোগ করুন:\n📞 ${config.phone}`
    },
    bengali_anniv: {
      label: '💐 বিবাহবার্ষিকী শুভেচ্ছা (Bangla Anniversary)',
      icon: '💐',
      text: `প্রিয় {name},\n\nডেলিসিয়াস কেক কর্নার-এর পক্ষ থেকে বিবাহবার্ষিকীর আন্তরিক প্রীতি ও শুভেচ্ছা! 💐🎂\n\nআমাদের ওপর ভরসা রেখে আপনার এই বিশেষ উদযাপনে আমাদের অংশীদার করার জন্য ধন্যবাদ। আপনাদের আগামী দিনগুলি আরও মধুর হোক!\n\n📞 যোগাযোগ: ${config.phone}`
    },
    bengali_discount: {
      label: '🎁 ১০% লয়্যালটি অফার (Bangla 10% Off)',
      icon: '🎁',
      text: `প্রিয় {name},\n\nডেলিসিয়াস কেক কর্নার-এর মূল্যবান গ্রাহক হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ! 🎂🎁\n\nআপনার পরবর্তী যেকোনো সেলিব্রেশন কেক অর্ডারে পেয়ে যান ফ্ল্যাট *১০% স্পেশাল ছাড়*!\n\nঅর্ডার করতে এই মেসেজটি দেখান বা কল করুন:\n📞 ${config.phone}\n🌱 ১০০% এগলেস পিওর ভেজ গ্যারান্টি`
    },
    google_fb_review: {
      label: '⭐ গুগল ৫-স্টার রিভিউ ও ফেসবুক লাইক (Auto Review Request)',
      icon: '⭐',
      text: `প্রিয় {name},\n\nডেলিসিয়াস কেক কর্নার-এর ফ্রেশ এগলেস কেক আপনার কেমন লাগলো? 🎂✨\n\nআমাদের কেক ও সার্ভিস যদি আপনার ভালো লেগে থাকে, তবে গুগলে আমাদের একটি ৫-স্টার রিভিউ দিয়ে অনুপ্রাণিত করুন:\n⭐ ${config.googleReviewUrl || 'https://maps.google.com/?cid=15321528623789416959'}\n\nএবং আমাদের অফিসিয়াল ফেসবুক পেজে নিত্যনতুন কেকের ডিজাইন ও অফার দেখতে ফলো করুন:\n🌐 ${config.facebookPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/'}\n\nআপনার মূল্যবান মতামতের জন্য অনেক ধন্যবাদ! 🙏\n📞 ${config.phone}`
    },
    general: {
      label: '🎂 English Bakery Thank You',
      icon: '🎂',
      text: `Dear {name},\n\nThank you so much for choosing *${config.shopName}*! 🎂✨\n\nWe hope our 100% Eggless pure vegetarian cake and bakery delights made your special moments even sweeter!\n\nFor any custom designer cakes, birthday pastries, or celebration orders, please reach us anytime:\n📞 *Call / WhatsApp:* ${config.phone}\n📍 *Address:* ${config.addressLine1}, Ghatal\n\nHave a joyful and memorable celebration! 🎉`
    },
    birthday: {
      label: '🎈 English Birthday Wishes',
      icon: '🎈',
      text: `Dear {name},\n\nWarmest Birthday Wishes from everyone at *${config.shopName}*! 🎂🎈✨\n\nThank you for letting us be part of your celebration. May your day be filled with laughter, love, and sweet memories!\n\nWe look forward to baking for you again soon! 🍰\n📞 ${config.phone}`
    }
  };

  // Resolve template text with customer name
  const resolveTemplate = (raw: string, cust?: CustomerSummary | null) => {
    const target = cust !== undefined ? cust : selectedCustomer;
    const name = target ? target.name : 'গ্রাহক';
    return raw
      .replace(/{name}/g, name)
      .replace(/{phone}/g, config.phone)
      .replace(/{shop}/g, config.shopName);
  };

  // Sync edited text on template or customer change
  useEffect(() => {
    const raw = TEMPLATES[activeTemplateKey]?.text || TEMPLATES.bengali.text;
    setEditedText(resolveTemplate(raw, selectedCustomer));
  }, [activeTemplateKey, selectedCustomer, config.thankYouMessageBn]);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Direct WhatsApp Send Function
  const handleDirectSendWhatsApp = (targetCustomer?: CustomerSummary | null) => {
    const cust = targetCustomer || selectedCustomer;
    if (!cust) return;

    // If sending to currently selected customer and user modified editedText, use editedText
    const isCurrent = !targetCustomer || targetCustomer.mobile === selectedCustomer?.mobile;
    const raw = TEMPLATES[activeTemplateKey]?.text || TEMPLATES.bengali.text;
    const text = isCurrent && editedText ? editedText : resolveTemplate(raw, cust);

    const phone = cust.mobile.replace(/\D/g, '');
    const target = phone.length === 10 ? `91${phone}` : phone;

    showNotification(`Opening WhatsApp for ${cust.name}...`);

    if (target && target.length >= 10) {
      window.open(
        `https://api.whatsapp.com/send?phone=${target}&text=${encodeURIComponent(text)}`,
        '_blank'
      );
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Direct SMS Send Function
  const handleDirectSendSMS = (targetCustomer?: CustomerSummary | null) => {
    const cust = targetCustomer || selectedCustomer;
    if (!cust) return;

    const isCurrent = !targetCustomer || targetCustomer.mobile === selectedCustomer?.mobile;
    const raw = TEMPLATES[activeTemplateKey]?.text || TEMPLATES.bengali.text;
    const text = isCurrent && editedText ? editedText : resolveTemplate(raw, cust);

    const phone = cust.mobile.replace(/\D/g, '');
    showNotification(`Opening SMS for ${cust.name}... (Text copied to clipboard)`);
    triggerSms(phone, text);
  };

  const [isSendingApi, setIsSendingApi] = useState<boolean>(false);

  const handleSendViaSmsApi = async (targetCustomer?: CustomerSummary | null) => {
    const cust = targetCustomer || selectedCustomer;
    if (!cust || !cust.mobile) return;
    const phone = cust.mobile.replace(/\D/g, '');
    if (phone.length < 10) {
      alert('সঠিক ১০-সংখ্যার ফোন নম্বর প্রয়োজন।');
      return;
    }
    const isCurrent = !targetCustomer || targetCustomer.mobile === selectedCustomer?.mobile;
    const raw = TEMPLATES[activeTemplateKey]?.text || TEMPLATES.bengali.text;
    const text = isCurrent && editedText ? editedText : resolveTemplate(raw, cust);

    setIsSendingApi(true);
    try {
      const res = await sendSmsApi({
        to: phone,
        message: text,
        customerName: cust.name,
        type: 'custom'
      });
      if (res.success) {
        showNotification(`SMS Gateway: Sent to +91${phone.slice(-10)} via ${res.provider}! (ID: ${res.messageId})`);
      } else {
        alert(`SMS failed: ${res.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`SMS Error: ${err?.message || 'Network error'}`);
    } finally {
      setIsSendingApi(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAllNumbers = () => {
    const validNumbers = customers
      .map((c) => c.mobile.replace(/\D/g, ''))
      .filter((m) => m.length === 10)
      .join(', ');
    navigator.clipboard.writeText(validNumbers);
    setCopiedNumbers(true);
    setTimeout(() => setCopiedNumbers(false), 2000);
  };

  // Save current message as shop default in config
  const handleSaveAsDefault = () => {
    const name = selectedCustomer ? selectedCustomer.name : 'গ্রাহক';
    const generic = editedText.replace(new RegExp(name, 'g'), '{name}');
    const updated: ShopConfig = {
      ...config,
      thankYouMessageBn: generic
    };
    saveShopConfig(updated);
    if (onConfigUpdate) {
      onConfigUpdate(updated);
    }
    setSavedDefaultToast(true);
    setTimeout(() => setSavedDefaultToast(false), 3000);
  };

  // Reset to original standard message
  const handleResetToStandard = () => {
    const updated: ShopConfig = {
      ...config,
      thankYouMessageBn: DEFAULT_STANDARD_BN
    };
    saveShopConfig(updated);
    if (onConfigUpdate) {
      onConfigUpdate(updated);
    }
    setEditedText(resolveTemplate(DEFAULT_STANDARD_BN, selectedCustomer));
  };

  const handleInsertTag = (tag: string) => {
    setEditedText((prev) => `${prev} ${tag}`);
  };

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-[#4b1d3f] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <Heart className="w-5 h-5 fill-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                <span>Customer Appreciation & Thank You Messages</span>
                <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Direct WhatsApp & SMS</span>
                </span>
              </h3>
              <p className="text-xs text-amber-100/70 mt-0.5">
                Send personalized greeting and thank you messages to bakery customers with 1-click
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Success Toast */}
        {savedDefaultToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-200" />
              <span>দোকানের ডিফল্ট ধন্যবাদ বার্তা সফলভাবে সংরক্ষিত হয়েছে! (Saved as Default)</span>
            </div>
            <button onClick={() => setSavedDefaultToast(false)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="bg-[#25D366] text-slate-900 px-4 py-2 text-xs font-extrabold flex items-center justify-between animate-in fade-in duration-150 shadow-md">
            <div className="flex items-center gap-1.5">
              <Send className="w-4 h-4 text-slate-900" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-slate-900 hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Customer Directory with Direct 1-Click Send (5 cols) */}
          <div className="md:col-span-5 flex flex-col space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#4b1d3f]" />
                <span>Customer Directory ({customers.length})</span>
              </span>
              {customers.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyAllNumbers}
                  className="text-[11px] font-semibold text-[#4b1d3f] hover:underline flex items-center gap-1"
                  title="Copy all 10-digit mobile numbers for bulk broadcast"
                >
                  {copiedNumbers ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedNumbers ? 'Copied All!' : 'Copy Numbers'}</span>
                </button>
              )}
            </div>

            {/* Search Customers */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name or phone..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-[#4b1d3f] outline-hidden"
              />
            </div>

            {/* Customer List with Direct WhatsApp & SMS Action Buttons */}
            <div className="flex-1 max-h-84 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50">
              {filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No customers found. Bills will populate customer directory.
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected =
                    selectedCustomer?.mobile === c.mobile && selectedCustomer?.name === c.name;
                  return (
                    <div
                      key={`${c.name}-${c.mobile}`}
                      onClick={() => setSelectedCustomer(c)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border cursor-pointer group ${
                        isSelected
                          ? 'bg-[#4b1d3f]/5 border-[#4b1d3f]/30 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="min-w-0 pr-2 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.totalBills > 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-mono font-normal">
                              {c.totalBills} bills
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.mobile || 'No mobile'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-slate-700">₹{Math.round(c.totalSpent).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Direct Send Buttons right on Customer Row */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                            handleDirectSendSMS(c);
                          }}
                          disabled={!c.mobile}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 disabled:opacity-30 transition-all"
                          title={`Direct SMS to ${c.name} (${c.mobile})`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                            handleDirectSendWhatsApp(c);
                          }}
                          disabled={!c.mobile}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-[#25D366] text-emerald-700 hover:text-white border border-emerald-200 hover:border-[#25D366] disabled:opacity-30 transition-all"
                          title={`Direct WhatsApp to ${c.name} (${c.mobile})`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Template Selection, Editor, and Messaging Actions (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Selected Customer Banner with Direct 1-Click Send Pills */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block">
                    Selected Recipient:
                  </span>
                  <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{selectedCustomer ? selectedCustomer.name : 'Valued Customer'}</span>
                    <span className="font-mono text-slate-500 font-normal">
                      ({selectedCustomer?.mobile || 'No mobile'})
                    </span>
                  </div>
                </div>

                {/* Quick 1-Click Direct Action Buttons in Header */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDirectSendSMS(selectedCustomer)}
                    disabled={!selectedCustomer?.mobile}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs disabled:opacity-40 transition-colors"
                    title="Direct SMS Send"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-white" />
                    <span>Direct SMS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectSendWhatsApp(selectedCustomer)}
                    disabled={!selectedCustomer?.mobile}
                    className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa4f] text-white text-xs font-bold flex items-center gap-1 shadow-2xs disabled:opacity-40 transition-colors"
                    title="Direct WhatsApp Send"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    <span>Direct WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Template Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Greeting & Thank You Message Template:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {Object.entries(TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      onClick={() => setActiveTemplateKey(key)}
                      className={`p-2 rounded-xl text-left font-medium transition-all flex items-center gap-1.5 ${
                        activeTemplateKey === key
                          ? 'bg-[#4b1d3f] text-white font-bold shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{tpl.icon}</span>
                      <span className="truncate text-[11px]">{tpl.label.replace(/^[^a-zA-Z0-9\u0980-\u09FF]+/, '')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Box with Direct Editing */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-[#4b1d3f]" />
                    <span>Message Editor (সরাসরি পরিবর্তনযোগ্য):</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {editedText.length} chars
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  placeholder="Type your thank you message here..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#4b1d3f] outline-hidden leading-relaxed resize-none"
                />

                {/* Quick Insert Tags & Save Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-400 font-medium">Quick Tags:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('{name}')}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono"
                      title="Insert Customer Name"
                    >
                      +{'{name}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('{phone}')}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono"
                      title="Insert Shop Phone"
                    >
                      +{'{phone}'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTag('{shop}')}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono"
                      title="Insert Shop Name"
                    >
                      +{'{shop}'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleResetToStandard}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
                      title="Reset to default bakery message"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Reset</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveAsDefault}
                      className="px-2.5 py-1 text-[11px] font-bold text-[#4b1d3f] bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg flex items-center gap-1 transition-colors"
                      title="Save this message as the permanent shop default"
                    >
                      <Save className="w-3 h-3 text-[#4b1d3f]" />
                      <span>Save as Shop Default</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: WhatsApp & SMS Prominent Direct Senders */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => handleSendViaSmsApi(selectedCustomer)}
                  disabled={!selectedCustomer?.mobile || isSendingApi}
                  className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-40"
                  title="Send via SMS API Gateway directly"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>{isSendingApi ? 'Sending SMS...' : 'Send via SMS API'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectSendSMS(selectedCustomer)}
                  disabled={!selectedCustomer?.mobile}
                  className="flex-1 sm:flex-none px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
                  title="Open in native Phone SMS app"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>Phone SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectSendWhatsApp(selectedCustomer)}
                  disabled={!selectedCustomer?.mobile}
                  className="flex-1 sm:flex-none px-7 py-3 bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa4f] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-40"
                  title="Send via WhatsApp directly"
                >
                  <MessageCircle className="w-5 h-5 fill-white" />
                  <span>Direct WhatsApp Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
