import React, { useState, useEffect, useRef } from 'react';
import { CustomerLoyalty, ShopConfig, Language } from '../types';
import dccLogoBadge from '../assets/images/delicious_cake_corner_gold_badge.jpg';
import vipCakeCenterpiece from '../assets/images/vip_card_cake_centerpiece.jpg';
import { generateCustomQrDataUrl } from '../utils/upi';
import {
  formatMembershipCardNumber,
  encodeMembershipQrPayload,
  saveStoredCustomer
} from '../utils/storage';
import {
  Crown,
  CreditCard,
  QrCode,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  Phone,
  Calendar,
  Gift,
  ShieldCheck,
  RefreshCw,
  Edit2,
  Save,
  ExternalLink,
  ChevronRight,
  Eye,
  RotateCw
} from 'lucide-react';

interface MembershipCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerLoyalty | null;
  config: ShopConfig;
  lang: Language;
  onSelectCustomerForBilling?: (customer: CustomerLoyalty) => void;
  onCustomerUpdate?: (updated: CustomerLoyalty) => void;
}

type CardTheme = 'burgundy' | 'obsidian' | 'emerald' | 'sapphire';

export const MembershipCardModal: React.FC<MembershipCardModalProps> = ({
  isOpen,
  onClose,
  customer,
  config,
  lang,
  onSelectCustomerForBilling,
  onCustomerUpdate
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('both');
  const [cardTheme, setCardTheme] = useState<CardTheme>('burgundy');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedCardNo, setCopiedCardNo] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editTier, setEditTier] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customer) {
      setEditName(customer.customerName || 'Loyal Customer');
      setEditTier(customer.tierName || 'Member');
      // Generate scannable QR Code for this member
      const payload = encodeMembershipQrPayload(customer, config.shopName);
      // Dark color based on theme
      const darkColor = '#1a1016';
      generateCustomQrDataUrl(payload, 320, darkColor, '#ffffff').then((url) => {
        setQrCodeDataUrl(url);
      });
    }
  }, [customer, config]);

  if (!isOpen || !customer) return null;

  const cardNumber = formatMembershipCardNumber(
    customer.customerMobile,
    customer.membershipCardNumber
  );

  const tierName = customer.tierName || 'Member';
  const tierBadge = customer.tierBadge || '⭐';
  const discountPercent = customer.suggestedDiscountPercent || 0;
  const points = customer.pointsBalance || 0;
  const validThru = '12/29';
  const memberSince = customer.registeredAt
    ? new Date(customer.registeredAt).getFullYear()
    : '2026';

  const cardLogo = config.logoUrl || dccLogoBadge;

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardNumber.replace(/\s+/g, ''));
    setCopiedCardNo(true);
    setTimeout(() => setCopiedCardNo(false), 2000);
  };

  const handleSaveEdit = () => {
    const updated: CustomerLoyalty = {
      ...customer,
      customerName: editName.trim() || customer.customerName,
      tierName: editTier.trim() || customer.tierName,
      membershipCardNumber: cardNumber,
      updatedAt: Date.now()
    };
    saveStoredCustomer(updated);
    if (onCustomerUpdate) onCustomerUpdate(updated);
    setIsEditing(false);
  };

  const handlePrintCard = () => {
    window.print();
  };

  // WhatsApp Share Card Details
  const handleShareWhatsApp = () => {
    const cleanMob = customer.customerMobile.replace(/\D/g, '');
    const text = `🎉 *DELICIOUS CAKE CORNER - VIP MEMBERSHIP CARD* 🎉\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Member Name: *${customer.customerName}*\n` +
      `💳 Card No: *${cardNumber}*\n` +
      `👑 Membership Tier: *${tierBadge} ${tierName}*\n` +
      `⭐ Loyalty Points: *${points} pts* (Worth ₹${points})\n` +
      (discountPercent > 0 ? `🎁 VIP Discount: *${discountPercent}% OFF* on cake orders\n` : '') +
      `📅 Member Since: *${memberSince}* | Valid Thru: *${validThru}*\n` +
      `📍 Store: Mansuka, Gharoighat, Ghatal (WB)\n` +
      `📞 Helpline: ${config.phone || '7866971421'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Present this digital card or mobile number at checkout for instant discounts!`;
    const url = `https://wa.me/91${cleanMob}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Theme gradient definitions
  const themeStyles = {
    burgundy: {
      cardBg: 'bg-gradient-to-tr from-[#300f26] via-[#4b1d3f] to-[#6d2757]',
      border: 'border-amber-400/50',
      badgeBg: 'bg-amber-400/20 text-amber-200 border-amber-300/40',
      accent: 'text-amber-300',
      foil: 'from-amber-200 via-yellow-100 to-amber-300',
      glow: 'shadow-amber-500/20'
    },
    obsidian: {
      cardBg: 'bg-gradient-to-tr from-slate-950 via-slate-900 to-zinc-800',
      border: 'border-cyan-400/50',
      badgeBg: 'bg-cyan-400/20 text-cyan-200 border-cyan-300/40',
      accent: 'text-cyan-300',
      foil: 'from-cyan-100 via-white to-cyan-300',
      glow: 'shadow-cyan-500/20'
    },
    emerald: {
      cardBg: 'bg-gradient-to-tr from-emerald-950 via-teal-900 to-emerald-800',
      border: 'border-emerald-300/50',
      badgeBg: 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40',
      accent: 'text-emerald-300',
      foil: 'from-emerald-200 via-teal-100 to-emerald-300',
      glow: 'shadow-emerald-500/20'
    },
    sapphire: {
      cardBg: 'bg-gradient-to-tr from-blue-950 via-indigo-950 to-blue-900',
      border: 'border-indigo-300/50',
      badgeBg: 'bg-indigo-400/20 text-indigo-100 border-indigo-300/40',
      accent: 'text-indigo-300',
      foil: 'from-indigo-100 via-white to-indigo-300',
      glow: 'shadow-indigo-500/20'
    }
  };

  const currentTheme = themeStyles[cardTheme];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      {/* =========================================================================
          PRINT-ONLY MEMBERSHIP CARD SHEET (Wallet Size 85.6mm x 54mm Standard CR80)
          ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white p-6 z-9999 text-black">
        <div className="max-w-[190mm] mx-auto border-2 border-dashed border-slate-400 p-4 rounded-xl">
          <div className="text-center mb-4">
            <h2 className="text-base font-black tracking-tight text-[#4b1d3f] uppercase">
              {config.shopName || 'DELICIOUS CAKE CORNER'} • VIP MEMBERSHIP PASS
            </h2>
            <p className="text-[10px] text-slate-600 font-mono">
              Cut along the dashed borders for official standard wallet card (85.6mm × 54mm)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* Print Front */}
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
                  {tierBadge} {tierName}
                </div>
              </div>

              {/* Middle Chip, Cake Centerpiece & QR */}
              <div className="relative z-10 flex items-center justify-between my-auto gap-2">
                {/* Metallic Chip Visual */}
                <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-300 flex items-center justify-center p-0.5 shadow-xs shrink-0">
                  <div className="w-full h-full border border-amber-700/60 rounded grid grid-cols-2 grid-rows-2 gap-0.5">
                    <div className="border-r border-b border-amber-800/40"></div>
                    <div className="border-b border-amber-800/40"></div>
                    <div className="border-r border-amber-800/40"></div>
                    <div></div>
                  </div>
                </div>

                {/* Print Cake Centerpiece with Ornate Border */}
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

                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="p-0.5 bg-white rounded-lg border border-amber-300 shadow-sm shrink-0">
                    <img src={qrCodeDataUrl} alt="Member QR" className="w-11 h-11 object-contain" />
                  </div>
                )}
              </div>

              {/* Bottom Card Info */}
              <div className="relative z-10">
                <div className="text-[11px] font-mono font-black tracking-widest text-amber-100">
                  {cardNumber}
                </div>
                <div className="flex items-center justify-between mt-1 text-[8px] text-white/90">
                  <span className="font-black uppercase tracking-wider">{customer.customerName}</span>
                  <span className="font-mono">EXP: {validThru}</span>
                  <span className="font-bold text-amber-300">{points} PTS</span>
                </div>
              </div>
            </div>

            {/* Print Back */}
            <div className="w-[85.6mm] h-[54mm] rounded-2xl bg-slate-900 text-white p-3 relative overflow-hidden flex flex-col justify-between border border-slate-700 shadow-md">
              <div className="h-5 -mx-3 bg-black flex items-center justify-end px-3">
                <span className="text-[6px] font-mono text-zinc-500">MAGNETIC STRIPE • DCC VIP</span>
              </div>
              
              <div className="flex items-center justify-between text-[8px] px-1 gap-1.5">
                <div className="bg-white text-slate-900 px-2 py-0.5 font-mono text-[8px] rounded font-bold flex-1">
                  SIGN: {customer.customerName}
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
                <span className="text-[7px] font-mono font-bold text-slate-800">{cardNumber}</span>
              </div>

              <div className="text-[7px] text-slate-300 leading-tight space-y-0.5 px-1">
                <p>• Present this VIP card at billing counter for instant discounts and point redemption.</p>
                <p>• 100% Eggless Pure Veg Bakery • Mansuka Bazar, Ghatal (WB).</p>
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
      </div>

      {/* =========================================================================
          INTERACTIVE SCREEN MODAL
          ========================================================================= */}
      <div className="no-print bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="bg-[#4b1d3f] text-white px-5 py-3.5 sm:px-6 flex items-center justify-between border-b border-[#3b1732]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'ভিআইপি মেম্বারশিপ কার্ড' : 'VIP Membership Card & QR Studio'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-[#4b1d3f] uppercase">
                  {tierBadge} {tierName}
                </span>
              </h2>
              <p className="text-xs text-amber-200/80 font-mono">
                📞 {customer.customerMobile} • {customer.customerName}
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

        {/* Control Toolbar */}
        <div className="bg-slate-100 p-2.5 sm:px-6 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          {/* Card Side Toggle */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveSide('front')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeSide === 'front' ? 'bg-[#4b1d3f] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'কার্ড ফ্রন্ট (Front)' : 'Front Side'}
            </button>
            <button
              onClick={() => setActiveSide('back')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeSide === 'back' ? 'bg-[#4b1d3f] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'কার্ড ব্যাক (Back)' : 'Back Side'}
            </button>
            <button
              onClick={() => setActiveSide('both')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeSide === 'both' ? 'bg-[#4b1d3f] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'উভয় পাশ (Both)' : 'Both Sides'}
            </button>
          </div>

          {/* Theme Color Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline">
              {lang === 'bn' ? 'কার্ড থিম:' : 'Theme:'}
            </span>
            {[
              { id: 'burgundy', color: '#4b1d3f', label: 'Royal Burgundy' },
              { id: 'obsidian', color: '#0f172a', label: 'Titanium Obsidian' },
              { id: 'emerald', color: '#064e3b', label: 'Emerald Forest' },
              { id: 'sapphire', color: '#1e1b4b', label: 'Sapphire Navy' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setCardTheme(t.id as CardTheme)}
                style={{ backgroundColor: t.color }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  cardTheme === t.id ? 'scale-120 border-amber-400 ring-2 ring-amber-300' : 'border-white'
                }`}
                title={t.label}
              />
            ))}
          </div>
        </div>

        {/* Modal Main Display */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
          
          {/* =================================================================
              MEMBERSHIP CARD VISUAL DISPLAY (Front / Back / Both)
              ================================================================= */}
          <div className="flex flex-wrap items-center justify-center gap-6" ref={cardRef}>
            
            {/* 1. FRONT OF THE CARD */}
            {(activeSide === 'front' || activeSide === 'both') && (
              <div
                className={`w-full max-w-[390px] h-[230px] sm:h-[240px] rounded-3xl p-5 text-white relative overflow-hidden flex flex-col justify-between border-2 ${currentTheme.cardBg} ${currentTheme.border} shadow-2xl ${currentTheme.glow} transition-all duration-300 select-none`}
              >
                {/* Decorative background holographic wave overlay */}
                <div className="absolute inset-0 bg-radial-at-tr from-white/10 via-transparent to-black/30 pointer-events-none"></div>
                <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full bg-white/5 blur-xl pointer-events-none"></div>
                <div className="absolute -left-12 -top-12 w-44 h-44 rounded-full bg-amber-400/10 blur-xl pointer-events-none"></div>
                {/* Official DCC Gold Badge Watermark */}
                <img
                  src={cardLogo}
                  alt=""
                  className="absolute -right-6 -bottom-6 w-44 h-44 object-cover rounded-full opacity-15 pointer-events-none filter drop-shadow-2xl mix-blend-screen"
                />

                {/* Card Top: Brand Logo + Shop Name + NFC Icon + Tier Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={cardLogo}
                      alt="DCC Logo"
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-300 shadow-xl ring-2 ring-amber-400/40 bg-black shrink-0"
                    />
                    <div>
                      <h3 className="text-xs sm:text-sm font-black tracking-wide text-white uppercase drop-shadow-xs flex items-center gap-1.5">
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

                  <div className="flex items-center gap-2">
                    {/* Contactless symbol */}
                    <div className="rotate-90 text-white/70" title="Contactless Smart Card">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M8.5 16.5a5 5 0 0 1 0-7" />
                        <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                        <path d="M15.5 21.5a12 12 0 0 0 0-19" />
                      </svg>
                    </div>

                    {/* Tier Badge */}
                    <div className={`px-2.5 py-0.8 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-inner ${currentTheme.badgeBg}`}>
                      {tierBadge} {tierName}
                    </div>
                  </div>
                </div>

                {/* Card Middle: EMV Smart Chip, Cake Emblem with Ornate Filigree Border, & Scannable QR Code */}
                <div className="relative z-10 flex items-center justify-between my-auto gap-2">
                  {/* Left: EMV Smart Chip */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <div className="w-11 h-8 sm:w-12 sm:h-9 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/80 p-0.5 shadow-md">
                      <div className="w-full h-full rounded border border-amber-800/50 grid grid-cols-2 grid-rows-2 gap-0.5 bg-gradient-to-br from-amber-300 to-amber-500">
                        <div className="border-r border-b border-amber-800/40"></div>
                        <div className="border-b border-amber-800/40"></div>
                        <div className="border-r border-amber-800/40"></div>
                        <div></div>
                      </div>
                    </div>

                    {discountPercent > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white/15 border border-white/20 text-[9px] font-black text-amber-200 uppercase tracking-tight text-center">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {/* CENTER: DELICIOUS CAKE WITH ORNATE ROYAL GOLD FILIGREE EMBELLISHMENT */}
                  <div className="flex flex-col items-center justify-center relative group shrink-0">
                    <div className="relative w-17 h-17 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-500 shadow-2xl ring-2 ring-amber-400/50">
                      {/* Outer ornate filigree accent ring */}
                      <div className="absolute -inset-1 rounded-full border border-dashed border-amber-300/60 pointer-events-none"></div>

                      <img
                        src={vipCakeCenterpiece}
                        alt="Delicious Cake Corner Special VIP Cake"
                        className="w-full h-full object-cover rounded-full shadow-inner bg-black"
                      />

                      {/* Golden Ribbon Seal at the bottom */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-[#4b1d3f] font-black text-[7px] uppercase tracking-wider shadow-md whitespace-nowrap border border-amber-200 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-600"></span>
                        <span>PURE VEG</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Scannable QR Code */}
                  {qrCodeDataUrl ? (
                    <div className="p-1 sm:p-1.5 bg-white rounded-xl border border-amber-300 shadow-md group relative shrink-0">
                      <img
                        src={qrCodeDataUrl}
                        alt="Membership QR Code"
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[8px] text-white font-bold shadow-xs" title="Verified Member QR">
                        ✓
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-[9px] text-slate-300">
                      QR Code...
                    </div>
                  )}
                </div>

                {/* Card Bottom: Card Number, Member Name & Valid Thru */}
                <div className="relative z-10 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm sm:text-base font-black tracking-widest text-amber-100 drop-shadow-md">
                      {cardNumber}
                    </div>
                    <button
                      onClick={handleCopyCard}
                      className="p-1 text-white/70 hover:text-white transition-colors"
                      title="Copy Card Number"
                    >
                      {copiedCardNo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-1 text-[10px] sm:text-xs">
                    <div>
                      <span className="text-[8px] text-slate-300 block uppercase font-bold tracking-wider">
                        VIP Cardholder
                      </span>
                      <span className="font-black uppercase tracking-wider text-white">
                        {customer.customerName}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[8px] text-slate-300 block uppercase font-bold tracking-wider">
                        Valid Thru
                      </span>
                      <span className="font-mono font-bold text-amber-200">
                        {validThru}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] text-slate-300 block uppercase font-bold tracking-wider">
                        Points
                      </span>
                      <span className="font-mono font-black text-emerald-300">
                        ⭐ {points} PTS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BACK OF THE CARD */}
            {(activeSide === 'back' || activeSide === 'both') && (
              <div
                className="w-full max-w-[390px] h-[230px] sm:h-[240px] rounded-3xl p-5 bg-gradient-to-tr from-slate-950 via-slate-900 to-zinc-900 text-white relative overflow-hidden flex flex-col justify-between border-2 border-slate-700 shadow-2xl select-none"
              >
                {/* Cake Centerpiece Watermark on Back for Luxury Continuity */}
                <img
                  src={vipCakeCenterpiece}
                  alt=""
                  className="absolute -right-8 -bottom-8 w-44 h-44 object-cover rounded-full opacity-10 pointer-events-none filter blur-[0.3px]"
                />

                {/* Magnetic Stripe with subtle sheen effect */}
                <div className="h-9 -mx-5 -mt-5 bg-black border-b border-zinc-800 shadow-inner flex items-center justify-end px-4">
                  <div className="text-[7px] font-mono tracking-widest text-zinc-500 uppercase">
                    HIGH COERCIVITY MAGNETIC STRIPE • DCC VIP PASS
                  </div>
                </div>

                {/* Signature Panel + Security Hologram + CVV */}
                <div className="flex items-center justify-between gap-2 my-0.5">
                  <div className="flex-1 bg-white rounded-lg px-2.5 py-1 text-slate-900 flex items-center justify-between shadow-inner border border-slate-300">
                    <span className="font-serif italic text-xs font-black text-[#4b1d3f] tracking-wide">
                      {customer.customerName}
                    </span>
                    <span className="text-[7px] text-slate-500 uppercase font-mono font-bold">
                      স্বাক্ষরিত • Authorized Sign
                    </span>
                  </div>

                  {/* Shimmering Hologram Seal Badge */}
                  <div className="px-2 py-1 rounded-lg bg-gradient-to-tr from-amber-400 via-rose-300 to-cyan-300 text-slate-950 font-black text-[8px] uppercase tracking-tighter shadow-md border border-white/60 flex items-center gap-1 shrink-0" title="Authentic VIP Hologram Seal">
                    <span>👑</span>
                    <span>SECURE VIP</span>
                  </div>

                  <div className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 font-mono text-xs font-black text-amber-400 shrink-0">
                    CVV: 786
                  </div>
                </div>

                {/* Scannable Barcode Strip */}
                <div className="bg-white/95 rounded-md px-2 py-0.5 flex flex-col items-center shadow-xs">
                  <div className="w-full flex items-center justify-between h-3.5 overflow-hidden gap-[1.5px] px-1">
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
                  <span className="text-[7.5px] font-mono font-bold text-slate-700 tracking-wider">
                    {cardNumber.replace(/\s+/g, '-')}
                  </span>
                </div>

                {/* Terms and Address */}
                <div className="space-y-1 text-[8.5px] text-slate-400 leading-tight">
                  <p className="flex items-center gap-1 text-slate-300 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Scan QR code at billing counter or online to redeem points & discounts.</span>
                  </p>
                  <p>• 100% Eggless Pure Veg Bakery. Fresh bakes & custom cakes.</p>
                  <p>• Mansuka Bazar, Gharoighat, Ghatal, Paschim Medinipur.</p>
                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between font-mono text-amber-300 text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                      <img
                        src={cardLogo}
                        alt="DCC Logo"
                        className="w-5 h-5 rounded-md object-cover border border-amber-400/50 bg-black shrink-0"
                      />
                      <span className="text-white font-black tracking-wider uppercase">{config.shopName || 'DELICIOUS CAKE CORNER'}</span>
                    </div>
                    <span>📞 {config.phone || '7866971421'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =================================================================
              CARD ACTION HUB & TOOLS
              ================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Action 1: Print Card */}
            <button
              type="button"
              onClick={handlePrintCard}
              className="py-3 px-4 rounded-2xl bg-[#4b1d3f] hover:bg-[#38152e] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>{lang === 'bn' ? 'মেম্বারশিপ কার্ড প্রিন্ট করুন' : 'Print PVC / Wallet Card'}</span>
            </button>

            {/* Action 2: WhatsApp Card Pass */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে কার্ড পাঠান' : 'Send Card via WhatsApp'}</span>
            </button>
          </div>

          {/* Quick Member Billing & Editing Box */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <span>{lang === 'bn' ? 'মেম্বারশিপ বিবরণ ও সুবিধা' : 'Member Privileges & Loyalty Details'}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {customer.customerMobile}
                  </span>
                </h4>
              </div>

              {/* Start Bill for this Member */}
              {onSelectCustomerForBilling && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCustomerForBilling(customer);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#4b1d3f] text-xs font-black shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'এই কার্ড দিয়ে বিল তৈরি করুন' : 'Start Bill with Member'}</span>
                </button>
              )}
            </div>

            {/* Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-900 uppercase block">Points Balance</span>
                <span className="text-base font-black text-[#4b1d3f] font-mono block mt-0.5">
                  ⭐ {points} pts
                </span>
                <span className="text-[9px] text-amber-800 font-semibold">(Worth ₹{points})</span>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-900 uppercase block">VIP Discount</span>
                <span className="text-base font-black text-emerald-700 font-mono block mt-0.5">
                  {discountPercent}% OFF
                </span>
                <span className="text-[9px] text-emerald-700 font-semibold">Every Order</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Visits</span>
                <span className="text-base font-black text-slate-800 font-mono block mt-0.5">
                  {customer.totalOrders || 0} Orders
                </span>
                <span className="text-[9px] text-slate-500 font-semibold">Repeat Customer</span>
              </div>

              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-[10px] font-bold text-purple-900 uppercase block">Lifetime Value</span>
                <span className="text-base font-black text-[#4b1d3f] font-mono block mt-0.5">
                  ₹{(customer.totalSpent || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-purple-700 font-semibold">Total Spent</span>
              </div>
            </div>

            {/* Edit Member Details Inline */}
            {isEditing ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700">
                  {lang === 'bn' ? 'মেম্বারশিপ কার্ডের নাম ও টিয়ার এডিট করুন:' : 'Edit Card Details:'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Customer Name"
                    className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                  <input
                    type="text"
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value)}
                    placeholder="Membership Tier"
                    className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 rounded-lg bg-[#4b1d3f] text-white font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>
                  {lang === 'bn'
                    ? 'কাউন্টার কিউআর স্ক্যানার দিয়ে এই কার্ড স্ক্যান করলে সরাসরি গ্রাহকের নাম ও পয়েন্ট যুক্ত হয়ে যাবে।'
                    : 'Scanning this QR code with any scanner instantly selects the customer and applies their VIP discount.'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-amber-800 hover:text-amber-950 font-bold underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{lang === 'bn' ? 'এডিট' : 'Edit Card'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-mono">
            <QrCode className="w-4 h-4 text-[#4b1d3f]" />
            <span>Card No: {cardNumber}</span>
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
