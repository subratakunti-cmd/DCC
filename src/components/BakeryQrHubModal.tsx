import React, { useState, useEffect, useRef } from 'react';
import { ShopConfig, Language, CustomerLoyalty } from '../types';
import dccLogoBadge from '../assets/images/delicious_cake_corner_gold_badge.jpg';
import vipCakeCenterpiece from '../assets/images/vip_card_cake_centerpiece.jpg';
import { generateCustomQrDataUrl, generateUpiString } from '../utils/upi';
import {
  formatMembershipCardNumber,
  encodeMembershipQrPayload,
  getStoredCustomers,
  saveStoredCustomer
} from '../utils/storage';
import {
  QrCode,
  X,
  Smartphone,
  CreditCard,
  MapPin,
  MessageSquare,
  Sparkles,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Store,
  Upload,
  RefreshCw,
  Info,
  Crown,
  ShieldCheck,
  Award,
  UserPlus,
  Globe,
  Megaphone,
  Send,
  Zap,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Target,
  BarChart2
} from 'lucide-react';

interface BakeryQrHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  lang: Language;
  initialTab?: QrTab;
  onConfigUpdate?: (newConfig: ShopConfig) => void;
  onSelectCustomerForBilling?: (customer: CustomerLoyalty) => void;
}

type QrTab = 'membership' | 'app' | 'upi' | 'maps' | 'whatsapp' | 'custom';

export const BakeryQrHubModal: React.FC<BakeryQrHubModalProps> = ({
  isOpen,
  onClose,
  config,
  lang,
  initialTab,
  onConfigUpdate,
  onSelectCustomerForBilling
}) => {
  const [activeTab, setActiveTab] = useState<QrTab>(initialTab || 'membership');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);
  
  // App QR states
  const [appUrl, setAppUrl] = useState<string>('');
  const [appQrDataUrl, setAppQrDataUrl] = useState<string>('');
  const [copiedAppUrl, setCopiedAppUrl] = useState<boolean>(false);
  
  // UPI QR states
  const [upiAmount, setUpiAmount] = useState<string>('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [showRealUploadedStandee, setShowRealUploadedStandee] = useState<boolean>(Boolean(config.qrCodeImage));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Maps QR states
  const mapsUrl = config.googleMapsUrl || 'https://www.google.com/maps/place/Delicious+Cake+Corner/@22.7157,87.7329,17z';
  const [mapsQrDataUrl, setMapsQrDataUrl] = useState<string>('');

  // WhatsApp QR states
  const phoneClean = (config.phone || '7866971421').replace(/\D/g, '');
  const waTarget = `https://wa.me/91${phoneClean}?text=${encodeURIComponent('Hello Delicious Cake Corner! I would like to order a fresh eggless cake.')}`;
  const [waQrDataUrl, setWaQrDataUrl] = useState<string>('');

  // Custom QR states
  const [customText, setCustomText] = useState<string>('https://deliciouscakecorner.com');
  const [customColor, setCustomColor] = useState<string>('#4b1d3f');
  const [customQrDataUrl, setCustomQrDataUrl] = useState<string>('');

  // Membership Card states
  const [storedMembers, setStoredMembers] = useState<CustomerLoyalty[]>([]);
  const [selectedMemberMobile, setSelectedMemberMobile] = useState<string>('');
  const [activeMemberName, setActiveMemberName] = useState<string>('Sourav Ghosh');
  const [activeMemberMobile, setActiveMemberMobile] = useState<string>('9876543210');
  const [activeMemberTier, setActiveMemberTier] = useState<string>('Gold Member');
  const [activeMemberPoints, setActiveMemberPoints] = useState<number>(250);
  const [activeMemberDiscount, setActiveMemberDiscount] = useState<number>(10);
  const [memberQrDataUrl, setMemberQrDataUrl] = useState<string>('');
  const [memberCardSide, setMemberCardSide] = useState<'front' | 'back' | 'both'>('both');
  const [memberCardTheme, setMemberCardTheme] = useState<'burgundy' | 'obsidian' | 'emerald'>('burgundy');
  const [copiedMemberCardNo, setCopiedMemberCardNo] = useState<boolean>(false);
  const cardLogo = config.logoUrl || dccLogoBadge;

  // Printable standee ref
  const printStandeeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.href.split('#')[0];
      setAppUrl(cleanUrl);
    }
    // Load members
    const members = getStoredCustomers();
    if (members && members.length > 0) {
      setStoredMembers(members);
      const first = members[0];
      setSelectedMemberMobile(first.customerMobile);
      setActiveMemberName(first.customerName || 'Loyal Customer');
      setActiveMemberMobile(first.customerMobile);
      setActiveMemberTier(first.tierName || 'Member');
      setActiveMemberPoints(first.pointsBalance || 0);
      setActiveMemberDiscount(first.suggestedDiscountPercent || 0);
    }
  }, [isOpen]);

  // Generate App QR
  useEffect(() => {
    if (appUrl) {
      generateCustomQrDataUrl(appUrl, 360, '#4b1d3f').then((url) => {
        setAppQrDataUrl(url);
      });
    }
  }, [appUrl]);

  // Generate UPI QR
  useEffect(() => {
    const amtNum = parseFloat(upiAmount) || 0;
    const upiStr = generateUpiString(config, amtNum, 'DCC-STAND');
    generateCustomQrDataUrl(upiStr, 360, '#1a1016').then((url) => {
      setUpiQrDataUrl(url);
    });
  }, [upiAmount, config]);

  // Generate Maps QR
  useEffect(() => {
    generateCustomQrDataUrl(mapsUrl, 360, '#0f5132').then((url) => {
      setMapsQrDataUrl(url);
    });
  }, [mapsUrl]);

  // Generate WhatsApp QR
  useEffect(() => {
    generateCustomQrDataUrl(waTarget, 360, '#075e54').then((url) => {
      setWaQrDataUrl(url);
    });
  }, [waTarget]);

  // Generate Custom QR
  useEffect(() => {
    if (customText) {
      generateCustomQrDataUrl(customText, 360, customColor).then((url) => {
        setCustomQrDataUrl(url);
      });
    }
  }, [customText, customColor]);


  // Generate Member Card QR
  useEffect(() => {
    const memberObj: CustomerLoyalty = {
      customerMobile: activeMemberMobile,
      customerName: activeMemberName,
      totalOrders: 5,
      totalSpent: 3500,
      pointsBalance: activeMemberPoints,
      lastVisitDate: new Date().toISOString(),
      tierName: activeMemberTier,
      suggestedDiscountPercent: activeMemberDiscount
    };
    const payload = encodeMembershipQrPayload(memberObj, config.shopName);
    generateCustomQrDataUrl(payload, 320, '#1a1016').then((url) => {
      setMemberQrDataUrl(url);
    });
  }, [activeMemberMobile, activeMemberName, activeMemberTier, activeMemberPoints, activeMemberDiscount, config]);

  const handleSelectExistingMember = (mob: string) => {
    setSelectedMemberMobile(mob);
    const found = storedMembers.find((m) => m.customerMobile === mob);
    if (found) {
      setActiveMemberName(found.customerName || 'Loyal Member');
      setActiveMemberMobile(found.customerMobile);
      setActiveMemberTier(found.tierName || 'Member');
      setActiveMemberPoints(found.pointsBalance || 0);
      setActiveMemberDiscount(found.suggestedDiscountPercent || 0);
    }
  };

  if (!isOpen) return null;

  const activeCardNumber = formatMembershipCardNumber(activeMemberMobile);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2000);
  };

  const handleCopyMemberCard = () => {
    navigator.clipboard.writeText(activeCardNumber.replace(/\s+/g, ''));
    setCopiedMemberCardNo(true);
    setTimeout(() => setCopiedMemberCardNo(false), 2000);
  };

  const handleDownloadFile = async (dataOrSrcUrl: string, filename: string) => {
    if (!dataOrSrcUrl) return;
    try {
      if (dataOrSrcUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = dataOrSrcUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const res = await fetch(dataOrSrcUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }
    } catch {
      const link = document.createElement('a');
      link.href = dataOrSrcUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadQr = handleDownloadFile;

  const handlePrintStandee = () => {
    window.print();
  };

  // WhatsApp Share Member Card
  const handleShareMemberCardWhatsApp = () => {
    const cleanMob = activeMemberMobile.replace(/\D/g, '');
    const text = `🎉 *DELICIOUS CAKE CORNER - VIP MEMBERSHIP CARD* 🎉\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Member Name: *${activeMemberName}*\n` +
      `💳 Card No: *${activeCardNumber}*\n` +
      `👑 Membership Tier: *${activeMemberTier}*\n` +
      `⭐ Loyalty Points: *${activeMemberPoints} pts* (Worth ₹${activeMemberPoints})\n` +
      (activeMemberDiscount > 0 ? `🎁 VIP Discount: *${activeMemberDiscount}% OFF* on cake orders\n` : '') +
      `📍 Store: Mansuka, Gharoighat, Ghatal (WB)\n` +
      `📞 Helpline: ${config.phone || '7866971421'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Present this digital card or mobile number at checkout for instant discounts!`;
    const url = `https://wa.me/91${cleanMob}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };


  // Upload Standee Photo
  const handleUploadStandeePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(lang === 'bn' ? 'ছবি ২MB এর চেয়ে ছোট হতে হবে' : 'File must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const updated: ShopConfig = {
          ...config,
          qrCodeImage: base64
        };
        if (onConfigUpdate) onConfigUpdate(updated);
        setShowRealUploadedStandee(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      
      {/* =========================================================================
          PRINTABLE SHEET: Standee or Membership Card Wallet Pass
          ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 text-black font-sans z-9999">
        {activeTab === 'membership' ? (
          <div className="max-w-[190mm] mx-auto border-2 border-dashed border-slate-400 p-6 rounded-2xl text-center">
            <h2 className="text-base font-black tracking-tight text-[#4b1d3f] uppercase mb-1">
              {config.shopName || 'DELICIOUS CAKE CORNER'} • VIP MEMBERSHIP PASS
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mb-6">
              Standard CR80 Wallet Card Size (85.6mm × 54mm)
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6">
              {/* Front Print */}
              <div className="w-[85.6mm] h-[54mm] rounded-2xl bg-[#4b1d3f] text-white p-4 relative overflow-hidden flex flex-col justify-between border border-amber-400 shadow-md">
                {/* Subtle background DCC crest watermark */}
                <img
                  src={cardLogo}
                  alt=""
                  className="absolute -right-4 -bottom-4 w-32 h-32 object-cover rounded-full opacity-10 pointer-events-none"
                />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={cardLogo}
                      alt="DCC Logo"
                      className="w-8 h-8 rounded-lg object-cover border border-amber-300 shadow-xs bg-black shrink-0"
                    />
                    <div>
                      <div className="text-[10px] font-black tracking-wider text-amber-200 uppercase">
                        {config.shopName || 'DELICIOUS CAKE CORNER'}
                      </div>
                      <div className="text-[7px] text-white/80 font-bold uppercase">
                        100% Eggless Pure Veg Bakery
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-[#4b1d3f] uppercase">
                    {activeMemberTier}
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between my-auto gap-2">
                  <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-300 grid grid-cols-2 grid-rows-2 p-0.5 shadow-xs shrink-0">
                    <div className="border-r border-b border-amber-800/40"></div>
                    <div className="border-b border-amber-800/40"></div>
                    <div className="border-r border-amber-800/40"></div>
                    <div></div>
                  </div>

                  {/* Print Cake Centerpiece with Ornate Filigree */}
                  <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-500 border border-amber-300 shadow-sm shrink-0">
                    <img
                      src={vipCakeCenterpiece}
                      alt="Cake"
                      className="w-full h-full object-cover rounded-full bg-black"
                    />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.1 rounded-full bg-amber-400 text-black font-black text-[6px] uppercase tracking-wider">
                      VEG
                    </div>
                  </div>

                  {memberQrDataUrl && (
                    <div className="p-0.5 bg-white rounded-lg border border-amber-300 shadow-sm shrink-0">
                      <img src={memberQrDataUrl} alt="Member QR" className="w-11 h-11 object-contain" />
                    </div>
                  )}
                </div>

                <div className="relative z-10">
                  <div className="text-[11px] font-mono font-black tracking-widest text-amber-100">
                    {activeCardNumber}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[8px] text-white/90">
                    <span className="font-black uppercase tracking-wider">{activeMemberName}</span>
                    <span className="font-mono">EXP: 12/29</span>
                    <span className="font-bold text-amber-300">{activeMemberPoints} PTS</span>
                  </div>
                </div>
              </div>

              {/* Back Print */}
              <div className="w-[85.6mm] h-[54mm] rounded-2xl bg-slate-900 text-white p-3 relative overflow-hidden flex flex-col justify-between border border-slate-700 shadow-md">
                <div className="h-5 -mx-3 bg-black flex items-center justify-end px-3">
                  <span className="text-[6px] font-mono text-zinc-500">MAGNETIC STRIPE • DCC VIP</span>
                </div>
                <div className="flex items-center justify-between text-[8px] px-1 gap-1.5">
                  <div className="bg-white text-slate-900 px-2 py-0.5 font-mono text-[8px] rounded font-bold flex-1">
                    SIGN: {activeMemberName}
                  </div>
                  <div className="px-1.5 py-0.5 rounded bg-amber-300 text-slate-950 font-black text-[7px] uppercase">
                    👑 VIP SEAL
                  </div>
                  <div className="font-mono text-[8px] font-bold text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    CVV: 786
                  </div>
                </div>

                {/* Barcode in print */}
                <div className="bg-white rounded px-2 py-0.5 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between h-3 overflow-hidden gap-[1px]">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} className="h-full bg-black" style={{ width: `${(i % 3 === 0 ? 2 : 1)}px` }} />
                    ))}
                  </div>
                  <span className="text-[7px] font-mono font-bold text-slate-800">{activeCardNumber}</span>
                </div>

                <div className="text-[7px] text-slate-300 leading-tight space-y-0.5 px-1 text-left">
                  <p>• Scan QR at counter for instant loyalty discount & point redemption.</p>
                  <p>• 100% Eggless Pure Veg Bakery • Mansuka, Ghatal.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={cardLogo}
                        alt="DCC Logo"
                        className="w-4 h-4 rounded object-cover border border-amber-400/60 bg-black shrink-0"
                      />
                      <span className="font-bold text-amber-300 text-[8px] uppercase tracking-wider">
                        {config.shopName || 'DELICIOUS CAKE CORNER'}
                      </span>
                    </div>
                    <span className="font-mono text-amber-300 text-[8px]">📞 {config.phone || '7866971421'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[420px] mx-auto border-4 border-amber-600 rounded-3xl p-6 text-center shadow-lg bg-linear-to-b from-amber-50/50 to-white">
            <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-amber-500 shadow-md mb-3 bg-black">
              <img src={cardLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            
            <h1 className="text-2xl font-black tracking-tight text-[#4b1d3f] uppercase">
              {config.shopName || 'DELICIOUS CAKE CORNER'}
            </h1>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mt-0.5">
              100% Eggless Pure Veg Bakery • Mansuka, Ghatal
            </p>
            
            <div className="my-5 p-4 bg-white rounded-2xl border-2 border-slate-300 shadow-inner inline-block">
              {activeTab === 'app' && appQrDataUrl && (
                <img src={appQrDataUrl} alt="App QR" className="w-56 h-56 mx-auto object-contain" />
              )}
              {activeTab === 'upi' && upiQrDataUrl && (
                <img src={upiQrDataUrl} alt="UPI QR" className="w-56 h-56 mx-auto object-contain" />
              )}
              {activeTab === 'maps' && mapsQrDataUrl && (
                <img src={mapsQrDataUrl} alt="Maps QR" className="w-56 h-56 mx-auto object-contain" />
              )}
              {activeTab === 'whatsapp' && waQrDataUrl && (
                <img src={waQrDataUrl} alt="WhatsApp QR" className="w-56 h-56 mx-auto object-contain" />
              )}
              {activeTab === 'custom' && customQrDataUrl && (
                <img src={customQrDataUrl} alt="Custom QR" className="w-56 h-56 mx-auto object-contain" />
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900">
                {activeTab === 'app' && 'Scan to Open Bakery App & Cake Menu'}
                {activeTab === 'upi' && 'Scan with Any UPI App to Pay'}
                {activeTab === 'maps' && 'Scan for Google Maps Directions & Reviews'}
                {activeTab === 'whatsapp' && 'Scan to Order Cakes on WhatsApp'}
                {activeTab === 'custom' && 'Scan QR Code'}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                PhonePe • Google Pay • Paytm • BHIM • Camera
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-dashed border-slate-300 text-[11px] text-slate-500 font-mono flex justify-between">
              <span>📞 {config.phone || '7866971421'}</span>
              <span>📍 Mansuka, Ghatal</span>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          INTERACTIVE SCREEN MODAL
          ========================================================================= */}
      <div className="no-print bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#4b1d3f] text-white px-5 py-4 flex items-center justify-between border-b border-[#3b1732]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'কিউআর কোড ও মেম্বারশিপ কার্ড সেন্টার' : 'Bakery QR Code & VIP Membership Studio'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-[#4b1d3f] uppercase">
                  Studio
                </span>
              </h2>
              <p className="text-xs text-amber-200/80">
                {lang === 'bn'
                  ? 'মেম্বারশিপ কার্ড, অ্যাপ লঞ্চার, ইউপিআই পেমেন্ট ও কাস্টম কিউআর কোড তৈরি করুন'
                  : 'VIP Membership Cards, App Launch, UPI Standee, Maps & Custom QR Codes'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* TAB 0: VIP MEMBERSHIP CARD QR */}
          <button
            onClick={() => setActiveTab('membership')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'membership'
                ? 'bg-[#4b1d3f] text-white shadow-xs font-black ring-1 ring-amber-300'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'bn' ? '💳 মেম্বারশিপ কার্ড QR' : '💳 VIP Member Card QR'}</span>
          </button>

          <button
            onClick={() => setActiveTab('app')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'app'
                ? 'bg-[#4b1d3f] text-white shadow-xs font-black'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'bn' ? '📱 অ্যাপ কিউআর কোড' : '📱 App Launch QR'}</span>
          </button>

          <button
            onClick={() => setActiveTab('upi')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'upi'
                ? 'bg-[#4b1d3f] text-white shadow-xs font-black'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'bn' ? '💳 পেমেন্ট কিউআর স্ট্যান্ডি' : '💳 UPI Payment Standee'}</span>
          </button>

          <button
            onClick={() => setActiveTab('maps')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'maps'
                ? 'bg-[#4b1d3f] text-white shadow-xs font-black'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{lang === 'bn' ? '📍 গুগল ম্যাপ লোকেশন' : '📍 Store Location QR'}</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'whatsapp'
                ? 'bg-[#4b1d3f] text-white shadow-xs font-black'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>{lang === 'bn' ? '💬 হোয়াটসঅ্যাপ বুকিং' : '💬 WhatsApp Order QR'}</span>
          </button>


          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'custom'
                ? 'bg-[#4b1d3f] text-white shadow-xs font-black'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'bn' ? '✨ কাস্টম কিউআর মেকার' : '✨ Custom Any QR'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          
          {/* ================= TAB 0: VIP MEMBERSHIP CARD QR ================= */}
          {activeTab === 'membership' && (
            <div className="space-y-6">
              {/* Member Selector Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <label className="text-xs font-bold text-slate-700 shrink-0">
                    {lang === 'bn' ? 'মেম্বার নির্বাচন:' : 'Select Member:'}
                  </label>
                  {storedMembers.length > 0 ? (
                    <select
                      value={selectedMemberMobile}
                      onChange={(e) => handleSelectExistingMember(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 flex-1 focus:outline-none focus:border-[#4b1d3f]"
                    >
                      {storedMembers.map((m) => (
                        <option key={m.customerMobile} value={m.customerMobile}>
                          {m.customerName || 'Loyal Member'} ({m.customerMobile}) — {m.tierName || 'Member'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      Custom Member Mode (Enter details below)
                    </span>
                  )}
                </div>

                {/* Card side & theme controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setMemberCardSide('both')}
                      className={`px-2.5 py-1 rounded-lg ${memberCardSide === 'both' ? 'bg-[#4b1d3f] text-white shadow-2xs' : 'text-slate-600'}`}
                    >
                      {lang === 'bn' ? 'উভয় পাশ' : 'Both Sides'}
                    </button>
                    <button
                      onClick={() => setMemberCardSide('front')}
                      className={`px-2.5 py-1 rounded-lg ${memberCardSide === 'front' ? 'bg-[#4b1d3f] text-white shadow-2xs' : 'text-slate-600'}`}
                    >
                      {lang === 'bn' ? 'সামনে' : 'Front'}
                    </button>
                    <button
                      onClick={() => setMemberCardSide('back')}
                      className={`px-2.5 py-1 rounded-lg ${memberCardSide === 'back' ? 'bg-[#4b1d3f] text-white shadow-2xs' : 'text-slate-600'}`}
                    >
                      {lang === 'bn' ? 'পেছনে' : 'Back'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {[
                      { id: 'burgundy', color: '#4b1d3f' },
                      { id: 'obsidian', color: '#0f172a' },
                      { id: 'emerald', color: '#064e3b' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setMemberCardTheme(t.id as any)}
                        style={{ backgroundColor: t.color }}
                        className={`w-5 h-5 rounded-full border-2 ${memberCardTheme === t.id ? 'border-amber-400 ring-1 ring-amber-300' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Visual & Inputs Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Left: Card Visual */}
                <div className="lg:col-span-6 flex flex-col items-center gap-4">
                  {/* FRONT CARD */}
                  {(memberCardSide === 'front' || memberCardSide === 'both') && (
                    <div
                      className={`w-full max-w-[380px] h-[230px] rounded-3xl p-5 text-white relative overflow-hidden flex flex-col justify-between border-2 shadow-2xl transition-all ${
                        memberCardTheme === 'burgundy'
                          ? 'bg-gradient-to-tr from-[#300f26] via-[#4b1d3f] to-[#6d2757] border-amber-400/50 shadow-amber-500/10'
                          : memberCardTheme === 'obsidian'
                          ? 'bg-gradient-to-tr from-slate-950 via-slate-900 to-zinc-800 border-cyan-400/50 shadow-cyan-500/10'
                          : 'bg-gradient-to-tr from-emerald-950 via-teal-900 to-emerald-800 border-emerald-300/50 shadow-emerald-500/10'
                      }`}
                    >
                      {/* Translucent DCC Crest Watermark in Card Background */}
                      <img
                        src={cardLogo}
                        alt=""
                        className="absolute -right-4 -bottom-4 w-36 h-36 object-cover rounded-full opacity-15 pointer-events-none mix-blend-screen"
                      />

                      {/* Top Bar */}
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={cardLogo}
                            alt="DCC Logo"
                            className="w-10 h-10 rounded-xl object-cover border-2 border-amber-300 shadow-md bg-black shrink-0"
                          />
                          <div>
                            <h3 className="text-xs font-black tracking-wide text-white uppercase drop-shadow-xs flex items-center gap-1.5">
                              <span>{config.shopName || 'DELICIOUS CAKE CORNER'}</span>
                              <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-400/25 border border-amber-300/40 text-amber-200 font-extrabold uppercase">
                                VIP
                              </span>
                            </h3>
                            <p className="text-[9px] text-amber-200/90 font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                              100% Eggless Pure Veg Bakery
                            </p>
                          </div>
                        </div>

                        <div className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/40 text-[9px] font-black uppercase">
                          {activeMemberTier}
                        </div>
                      </div>

                      {/* Middle: Smart Chip, Cake Centerpiece with Ornate Border, & QR */}
                      <div className="relative z-10 flex items-center justify-between my-auto gap-2">
                        {/* EMV Chip */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/80 p-0.5 shadow-md grid grid-cols-2 grid-rows-2 gap-0.5">
                            <div className="border-r border-b border-amber-800/40"></div>
                            <div className="border-b border-amber-800/40"></div>
                            <div className="border-r border-amber-800/40"></div>
                            <div></div>
                          </div>
                          {activeMemberDiscount > 0 && (
                            <span className="px-1 py-0.2 rounded bg-white/15 border border-white/20 text-[8px] font-black text-amber-200 uppercase text-center">
                              {activeMemberDiscount}% OFF
                            </span>
                          )}
                        </div>

                        {/* CENTER: DELICIOUS CAKE WITH ORNATE ROYAL GOLD FILIGREE EMBELLISHMENT */}
                        <div className="flex flex-col items-center justify-center relative group shrink-0">
                          <div className="relative w-17 h-17 rounded-full p-1 bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-500 shadow-2xl ring-2 ring-amber-400/50">
                            <div className="absolute -inset-1 rounded-full border border-dashed border-amber-300/60 pointer-events-none"></div>
                            <img
                              src={vipCakeCenterpiece}
                              alt="Cake Centerpiece"
                              className="w-full h-full object-cover rounded-full shadow-inner bg-black"
                            />
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-[#4b1d3f] font-black text-[7px] uppercase tracking-wider shadow-md whitespace-nowrap border border-amber-200 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-600"></span>
                              <span>PURE VEG</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: QR Code */}
                        {memberQrDataUrl && (
                          <div className="p-1 bg-white rounded-xl border border-amber-300 shadow-md shrink-0">
                            <img src={memberQrDataUrl} alt="Member QR" className="w-14 h-14 object-contain rounded" />
                          </div>
                        )}
                      </div>

                      {/* Bottom Info */}
                      <div className="relative z-10">
                        <div className="font-mono text-sm font-black tracking-widest text-amber-100 flex items-center justify-between">
                          <span>{activeCardNumber}</span>
                          <button onClick={handleCopyMemberCard} className="text-white/70 hover:text-white p-0.5">
                            {copiedMemberCardNo ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="font-black uppercase tracking-wider text-white">{activeMemberName}</span>
                          <span className="font-mono text-amber-200">EXP: 12/29</span>
                          <span className="font-bold text-emerald-300">⭐ {activeMemberPoints} PTS</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BACK CARD */}
                  {(memberCardSide === 'back' || memberCardSide === 'both') && (
                    <div className="w-full max-w-[380px] h-[230px] rounded-3xl p-5 bg-gradient-to-tr from-slate-950 via-slate-900 to-zinc-900 text-white relative overflow-hidden flex flex-col justify-between border-2 border-slate-700 shadow-2xl">
                      {/* Cake Watermark on Back */}
                      <img
                        src={vipCakeCenterpiece}
                        alt=""
                        className="absolute -right-8 -bottom-8 w-44 h-44 object-cover rounded-full opacity-10 pointer-events-none filter blur-[0.3px]"
                      />

                      {/* Magnetic Stripe */}
                      <div className="h-9 -mx-5 -mt-5 bg-black border-b border-zinc-800 shadow-inner flex items-center justify-end px-4">
                        <span className="text-[7px] font-mono tracking-widest text-zinc-500 uppercase">
                          MAGNETIC STRIPE • DCC VIP PASS
                        </span>
                      </div>

                      {/* Signature Panel + Hologram + CVV */}
                      <div className="flex items-center justify-between gap-2 my-0.5">
                        <div className="flex-1 bg-white rounded-lg px-2.5 py-1 text-slate-900 flex items-center justify-between shadow-inner border border-slate-300">
                          <span className="font-serif italic text-xs font-black text-[#4b1d3f]">
                            {activeMemberName}
                          </span>
                          <span className="text-[7px] text-slate-500 uppercase font-mono font-bold">Signatory</span>
                        </div>

                        <div className="px-2 py-1 rounded-lg bg-gradient-to-tr from-amber-400 via-rose-300 to-cyan-300 text-slate-950 font-black text-[8px] uppercase tracking-tighter shadow-md border border-white/60 flex items-center gap-1 shrink-0">
                          <span>👑</span>
                          <span>SECURE VIP</span>
                        </div>

                        <div className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 font-mono text-xs font-black text-amber-400 shrink-0">
                          CVV: 786
                        </div>
                      </div>

                      {/* Barcode Strip */}
                      <div className="bg-white/95 rounded-md px-2 py-0.5 flex flex-col items-center shadow-xs">
                        <div className="w-full flex items-center justify-between h-3 overflow-hidden gap-[1.5px] px-1">
                          {Array.from({ length: 48 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-full bg-black"
                              style={{
                                width: `${(i % 3 === 0 ? 2.5 : i % 2 === 0 ? 1.5 : 1)}px`,
                                opacity: i % 7 === 0 ? 0.3 : 1
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[7px] font-mono font-bold text-slate-700 tracking-wider">
                          {activeCardNumber.replace(/\s+/g, '-')}
                        </span>
                      </div>

                      <div className="space-y-1 text-[8.5px] text-slate-400 leading-tight">
                        <p className="flex items-center gap-1 text-slate-300 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Scan QR at counter for instant loyalty discount & point redemption.</span>
                        </p>
                        <p>• 100% Eggless Pure Veg Bakery • Mansuka, Ghatal.</p>
                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between font-mono text-amber-300 text-[10px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={cardLogo}
                              alt="DCC Logo"
                              className="w-4 h-4 rounded object-cover border border-amber-400/50 bg-black shrink-0"
                            />
                            <span className="text-white font-black tracking-wider uppercase text-[9px]">{config.shopName || 'DELICIOUS CAKE CORNER'}</span>
                          </div>
                          <span>📞 {config.phone || '7866971421'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Inputs & Action Hub */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <span>{lang === 'bn' ? 'মেম্বার তথ্য ও কার্ড তৈরি' : 'VIP Member Details & Pass'}</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">
                          {lang === 'bn' ? 'গ্রাহকের নাম:' : 'Customer Name:'}
                        </label>
                        <input
                          type="text"
                          value={activeMemberName}
                          onChange={(e) => setActiveMemberName(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">
                          {lang === 'bn' ? 'মোবাইল নম্বর:' : 'Mobile Number:'}
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={activeMemberMobile}
                          onChange={(e) => setActiveMemberMobile(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">
                          {lang === 'bn' ? 'মেম্বারশিপ টিয়ার:' : 'Membership Tier:'}
                        </label>
                        <select
                          value={activeMemberTier}
                          onChange={(e) => setActiveMemberTier(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-bold"
                        >
                          <option value="Bronze Member">Bronze Member</option>
                          <option value="Silver VIP">Silver VIP (5% Off)</option>
                          <option value="Gold Member">Gold Member (10% Off)</option>
                          <option value="Platinum VIP">Platinum VIP (15% Off)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">
                          {lang === 'bn' ? 'লয়ালটি পয়েন্টস:' : 'Points Balance:'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={activeMemberPoints}
                          onChange={(e) => setActiveMemberPoints(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handlePrintStandee}
                        className="flex-1 min-w-[130px] py-2.5 px-3 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-300" />
                        <span>{lang === 'bn' ? 'কার্ড প্রিন্ট করুন' : 'Print Wallet Card'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareMemberCardWhatsApp}
                        className="flex-1 min-w-[130px] py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ পাঠান' : 'WhatsApp Card'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadQr(memberQrDataUrl, `${activeMemberMobile}_member_qr.png`)}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                        title="Download Member QR"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>QR PNG</span>
                      </button>

                      {onSelectCustomerForBilling && (
                        <button
                          type="button"
                          onClick={() => {
                            const obj: CustomerLoyalty = {
                              customerMobile: activeMemberMobile,
                              customerName: activeMemberName,
                              totalOrders: 5,
                              totalSpent: 3500,
                              pointsBalance: activeMemberPoints,
                              lastVisitDate: new Date().toISOString(),
                              tierName: activeMemberTier
                            };
                            onSelectCustomerForBilling(obj);
                            onClose();
                          }}
                          className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 text-[#4b1d3f] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors mt-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'এই মেম্বার নিয়ে বিলিং শুরু করুন' : 'Load Member into Billing'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================= TAB 1: APP LAUNCH QR ================= */}
          {activeTab === 'app' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: QR Card Standee Preview */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div
                  ref={printStandeeRef}
                  className="w-full max-w-[280px] bg-linear-to-b from-amber-50 via-white to-amber-50/40 rounded-2xl border-2 border-amber-300 p-5 text-center shadow-md relative"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover border border-amber-300" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-[#4b1d3f] text-amber-300 flex items-center justify-center font-bold text-xs">
                        DCC
                      </div>
                    )}
                    <span className="font-black text-xs text-[#4b1d3f] tracking-tight truncate">
                      {config.shopName || 'DELICIOUS CAKE CORNER'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-inner mx-auto mb-2.5">
                    {appQrDataUrl ? (
                      <img src={appQrDataUrl} alt="App QR" className="w-48 h-48 object-contain mx-auto" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                        Generating QR...
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] font-black text-slate-800 leading-tight">
                    {lang === 'bn' ? 'মোবাইলে স্ক্যান করে অ্যাপটি খুলুন' : 'Scan with Camera to Open App'}
                  </p>
                  <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                    100% Pure Veg Eggless Bakery
                  </p>
                </div>
              </div>

              {/* Right Column: Actions & Details */}
              <div className="md:col-span-7 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {lang === 'bn' ? 'অ্যাপ্লিকেশন লিংক ও কিউআর কোড' : 'App Access URL & Live QR Code'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === 'bn'
                        ? 'যেকোনো মোবাইল, ট্যাবলেট বা কম্পিউটারে ক্যামেরা দিয়ে এই কিউআরটি স্ক্যান করলে সরাসরি ডেলিভারি ও বিলিং অ্যাপটি খুলে যাবে।'
                        : 'Scan this QR code with any smartphone camera to instantly open the Bakery POS & Digital Cake Catalog without installing anything.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono text-slate-700">
                    <span className="truncate flex-1">{appUrl}</span>
                    <button
                      onClick={() => handleCopy(appUrl)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded font-bold text-slate-700 text-xs flex items-center gap-1 transition-colors shrink-0"
                    >
                      {copiedAppUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAppUrl ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'কপি' : 'Copy')}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleDownloadQr(appQrDataUrl, 'delicious_cake_corner_app_qr.png')}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'QR ছবি ডাউনলোড (PNG)' : 'Download QR Image'}</span>
                    </button>

                    <button
                      onClick={handlePrintStandee}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Printer className="w-4 h-4 text-amber-300" />
                      <span>{lang === 'bn' ? 'কাউন্টার স্ট্যান্ডি প্রিন্ট' : 'Print Counter Poster'}</span>
                    </button>
                  </div>
                </div>

                {/* Helpful tips */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{lang === 'bn' ? 'কীভাবে ব্যবহার করবেন:' : 'How to use:'}</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
                    <li>{lang === 'bn' ? 'কাউন্টার পোস্টার প্রিন্ট করে দোকানে লাগিয়ে দিন।' : 'Print and place the standee on your bakery checkout counter.'}</li>
                    <li>{lang === 'bn' ? 'গ্রাহক বা কর্মচারীরা ফোন দিয়ে স্ক্যান করে সাথে সাথে কেকের তালিকা দেখতে পাবেন।' : 'Customers and staff can scan it to browse cakes or place orders.'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: UPI PAYMENT QR ================= */}
          {activeTab === 'upi' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[280px] bg-white rounded-2xl border-2 border-emerald-500 p-5 text-center shadow-md relative">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-black text-xs text-slate-800 uppercase tracking-tight">
                      Official UPI Standee
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner mx-auto mb-2">
                    {showRealUploadedStandee && config.qrCodeImage ? (
                      <img
                        src={config.qrCodeImage}
                        alt="Shop Standee"
                        className="w-48 h-48 object-contain mx-auto rounded"
                      />
                    ) : upiQrDataUrl ? (
                      <img src={upiQrDataUrl} alt="UPI QR" className="w-48 h-48 object-contain mx-auto" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                        Generating UPI QR...
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="text-xs font-mono font-bold text-slate-900">
                      {config.upiId || '7866971421@okaxis'}
                    </div>
                    {upiAmount && parseFloat(upiAmount) > 0 ? (
                      <div className="text-sm font-black text-emerald-700 mt-0.5">
                        Amount: ₹{parseFloat(upiAmount).toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        (Any amount / কাস্টমার নিজের ইচ্ছামত টাকা দেবে)
                      </div>
                    )}
                  </div>

                  {/* Payment Icons */}
                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-center gap-2 text-[9px] font-bold text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">GPay</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">PhonePe</span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">Paytm</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">BHIM</span>
                  </div>
                </div>
              </div>

              {/* Right: UPI Configuration & Amount */}
              <div className="md:col-span-7 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {lang === 'bn' ? 'ইউপিআই পেমেন্ট স্ট্যান্ডি ও ডাইনামিক কিউআর' : 'UPI Payment Standee & Dynamic QR'}
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'bn' ? 'টাকার পরিমাণ (ঐচ্ছিক / Dynamic Amount):' : 'Set Specific Amount (Optional):'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        placeholder="ফাঁকা রাখলে যেকোনো টাকা দেওয়া যাবে (e.g. 500)"
                        className="w-full pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Toggle Uploaded Standee Photo */}
                  {config.qrCodeImage && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-700">
                        {showRealUploadedStandee ? '📸 দোকানের আসল স্ট্যান্ডি ছবি সক্রিয়' : '⚡ জেনারেটেড কিউআর কোড সক্রিয়'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRealUploadedStandee(!showRealUploadedStandee)}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"
                      >
                        {showRealUploadedStandee ? 'জেনারেটরে স্যুইচ করুন' : 'আসল ফটো দেখুন'}
                      </button>
                    </div>
                  )}

                  {/* Upload button for real photo */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleUploadStandeePhoto}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 underline underline-offset-2"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'দোকানের আসল প্রিন্ট স্ট্যান্ডির ছবি আপলোড করুন' : 'Upload photo of shop counter standee'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleDownloadQr(upiQrDataUrl, 'delicious_cake_corner_upi_qr.png')}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'পেমেন্ট QR ডাউনলোড' : 'Download UPI QR'}</span>
                    </button>

                    <button
                      onClick={handlePrintStandee}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Printer className="w-4 h-4 text-amber-300" />
                      <span>{lang === 'bn' ? 'পেমেন্ট স্ট্যান্ডি প্রিন্ট' : 'Print Standee'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: GOOGLE MAPS STORE LOCATION QR ================= */}
          {activeTab === 'maps' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[280px] bg-white rounded-2xl border-2 border-rose-400 p-5 text-center shadow-md">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span className="font-black text-xs text-slate-800">
                      Mansuka, Ghatal Location
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner mx-auto mb-2">
                    {mapsQrDataUrl ? (
                      <img src={mapsQrDataUrl} alt="Google Maps QR" className="w-48 h-48 object-contain mx-auto" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                        Generating Maps QR...
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-black text-slate-900 leading-tight">
                    DELICIOUS CAKE CORNER
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Mansuka, Ghatal (22.7157° N, 87.7329° E)
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {lang === 'bn' ? 'দোকানের গুগল ম্যাপ লোকেশন ও রিভিউ কিউআর' : 'Google Maps Location & Reviews QR'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn'
                      ? 'গ্রাহকরা এটি স্ক্যান করে সরাসরি আপনার দোকানে আসার রাস্তা দেখতে পাবেন এবং ৫-স্টার রিভিউ দিতে পারবেন।'
                      : 'Customers can scan this QR code to navigate to Delicious Cake Corner or leave 5-star Google Reviews!'}
                  </p>

                  <div className="flex items-center gap-2">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lang === 'bn' ? 'গুগল ম্যাপে দেখুন' : 'Open in Google Maps'}</span>
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleDownloadQr(mapsQrDataUrl, 'delicious_cake_corner_maps_qr.png')}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'ম্যাপস QR ডাউনলোড' : 'Download Maps QR'}</span>
                    </button>

                    <button
                      onClick={handlePrintStandee}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Printer className="w-4 h-4 text-amber-300" />
                      <span>{lang === 'bn' ? 'ম্যাপ পোস্টার প্রিন্ট' : 'Print Map Poster'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: WHATSAPP ORDER QR ================= */}
          {activeTab === 'whatsapp' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[280px] bg-white rounded-2xl border-2 border-emerald-500 p-5 text-center shadow-md">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span className="font-black text-xs text-slate-800">
                      WhatsApp Cake Booking
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner mx-auto mb-2">
                    {waQrDataUrl ? (
                      <img src={waQrDataUrl} alt="WhatsApp QR" className="w-48 h-48 object-contain mx-auto" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                        Generating WhatsApp QR...
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-black text-emerald-800 leading-tight">
                    +91 {config.phone || '7866971421'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Scan to send customized cake photos
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {lang === 'bn' ? 'হোয়াটসঅ্যাপ কেক অর্ডার ও ছবি পাঠানোর কিউআর' : 'WhatsApp Cake Booking & Custom Orders QR'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn'
                      ? 'গ্রাহকরা সরাসরি এই কিউআর স্ক্যান করে জন্মদিনের কেকের ডিজাইন ও লেখা হোয়াটসঅ্যাপে পাঠাতে পারবেন।'
                      : 'Customers can scan this QR code to directly message the bakery on WhatsApp with reference photos and custom message requests.'}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleDownloadQr(waQrDataUrl, 'delicious_cake_corner_whatsapp_qr.png')}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ QR ডাউনলোড' : 'Download WhatsApp QR'}</span>
                    </button>

                    <button
                      onClick={handlePrintStandee}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Printer className="w-4 h-4 text-amber-300" />
                      <span>{lang === 'bn' ? 'স্টিকার / পোস্টার প্রিন্ট' : 'Print Sticker Poster'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ================= TAB 6: CUSTOM ANY QR GENERATOR ================= */}
          {activeTab === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[280px] bg-white rounded-2xl border-2 border-slate-300 p-5 text-center shadow-md">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner mx-auto mb-2">
                    {customQrDataUrl ? (
                      <img src={customQrDataUrl} alt="Custom QR" className="w-48 h-48 object-contain mx-auto" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                        Enter text to generate QR...
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-mono font-bold text-slate-700 truncate max-w-[220px] mx-auto">
                    {customText || 'Custom QR'}
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {lang === 'bn' ? 'যেকোনো লেখা বা লিংকের জন্য কিউআর তৈরি করুন' : 'Generate Custom QR for Any Link or Text'}
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'bn' ? 'লেখা, ওয়েবসাইট লিংক বা ওয়াই-ফাই বিবরণ লিখুন:' : 'Enter URL, Text or Wi-Fi info:'}
                    </label>
                    <textarea
                      rows={3}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="e.g. https://instagram.com/deliciouscakecorner or WIFI:S:Bakery;T:WPA;P:secret;;"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === 'bn' ? 'রং পছন্দ করুন:' : 'QR Code Color:'}
                    </label>
                    <div className="flex items-center gap-2">
                      {[
                        { color: '#4b1d3f', label: 'Plum' },
                        { color: '#1a1016', label: 'Black' },
                        { color: '#0f5132', label: 'Emerald' },
                        { color: '#1e3a8a', label: 'Blue' },
                        { color: '#b45309', label: 'Amber' }
                      ].map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => setCustomColor(item.color)}
                          style={{ backgroundColor: item.color }}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            customColor === item.color ? 'scale-110 border-amber-400 ring-2 ring-amber-300' : 'border-transparent'
                          }`}
                          title={item.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleDownloadQr(customQrDataUrl, 'custom_qr_code.png')}
                      disabled={!customQrDataUrl}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'QR ছবি ডাউনলোড' : 'Download QR Image'}</span>
                    </button>

                    <button
                      onClick={handlePrintStandee}
                      disabled={!customQrDataUrl}
                      className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-[#4b1d3f] hover:bg-[#38152e] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Printer className="w-4 h-4 text-amber-300" />
                      <span>{lang === 'bn' ? 'প্রিন্ট করুন' : 'Print'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-700" />
            <span className="font-bold">{config.shopName || 'DELICIOUS CAKE CORNER'}</span>
            <span>• Mansuka, Ghatal</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
