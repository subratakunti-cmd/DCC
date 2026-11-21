import React, { useState } from 'react';
import { ShopConfig, Language, AppUserSession } from '../types';
import { getT } from '../translations';
import { saveShopConfig } from '../utils/storage';
import { DEFAULT_BAKERY_LOGO } from '../data/defaultProducts';
import goldBadgeImg from '../assets/images/bakery_gold_badge_1791895503183.jpg';
import appIconImg from '../assets/images/bakery_app_icon_1791464807984.jpg';
import truffleLogoImg from '../assets/images/cake_chocolate_truffle_1790791091117.jpg';
import redVelvetLogoImg from '../assets/images/cake_red_velvet_1790791104586.jpg';
import { CounterManagerModal } from './CounterManagerModal';
import { MultiSystemModal } from './MultiSystemModal';
import {
  Cloud,
  Store,
  Phone,
  MapPin,
  QrCode,
  FileText,
  CheckCircle2,
  Upload,
  Trash2,
  PenTool,
  Plus,
  Award,
  Crown,
  Gift,
  ImageIcon,
  Laptop,
  Check,
  RotateCcw,
  Zap,
  Send,
  MessageSquare,
  AlertCircle,
  Smartphone,
  Printer,
  Layers,
  Wifi,
  Bluetooth,
  Usb,
  ExternalLink,
  Copy,
  Share2,
  Globe,
  Target,
  Megaphone,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { getSmsServerStatus, sendSmsApi } from '../services/smsService';
import { addAllPrintersToFleet } from '../services/printerService';

interface SettingsModalProps {
  config: ShopConfig;
  setConfig: (config: ShopConfig) => void;
  lang: Language;
  onOpenPrinterManager?: () => void;
  onOpenCloudBackup?: () => void;
  onOpenQrHub?: () => void;
  onOpenStaffManager?: () => void;
  userSession?: AppUserSession;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  setConfig,
  lang,
  onOpenPrinterManager,
  onOpenCloudBackup,
  onOpenQrHub,
  onOpenStaffManager,
  userSession
}) => {
  const t = getT(lang);

  const [formData, setFormData] = useState<ShopConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isCounterModalOpen, setIsCounterModalOpen] = useState<boolean>(false);
  const [isMultiSystemModalOpen, setIsMultiSystemModalOpen] = useState<boolean>(false);

  // Marketing & Google/Facebook Ad Guide State
  const [copiedAdText, setCopiedAdText] = useState<string | null>(null);
  const [activeAdGuideTab, setActiveAdGuideTab] = useState<'facebook' | 'google' | 'copy' | 'targeting'>('facebook');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAdText(label);
    setTimeout(() => setCopiedAdText(null), 2500);
  };

  // SMS Gateway Settings State
  const [testSmsPhone, setTestSmsPhone] = useState<string>(config.phone || '7866971421');
  const [isSendingTestSms, setIsSendingTestSms] = useState<boolean>(false);
  const [testSmsResult, setTestSmsResult] = useState<{
    success: boolean;
    provider?: string;
    messageId?: string;
    error?: string;
  } | null>(null);
  const [smsGatewayStatus, setSmsGatewayStatus] = useState<{
    activeGateway: string;
    isKeyConfigured: boolean;
    senderPhone: string;
    totalDispatched: number;
  }>({
    activeGateway: 'Loading...',
    isKeyConfigured: false,
    senderPhone: '7866971421',
    totalDispatched: 0
  });

  React.useEffect(() => {
    getSmsServerStatus().then((s) => {
      setSmsGatewayStatus({
        activeGateway: s.activeGateway,
        isKeyConfigured: s.isKeyConfigured,
        senderPhone: s.senderPhone || '7866971421',
        totalDispatched: s.totalDispatched || 0
      });
    });
  }, []);

  const handleSendTestSms = async (forceSimulator: boolean = false) => {
    const clean = testSmsPhone.replace(/\D/g, '');
    if (clean.length < 10) {
      alert(lang === 'bn' ? 'সঠিক ১০-সংখ্যার ফোন নম্বর দিন।' : 'Please enter a valid 10-digit phone number.');
      return;
    }
    setIsSendingTestSms(true);
    setTestSmsResult(null);
    try {
      const res = await sendSmsApi({
        to: clean,
        message: `🎂 [TEST SMS] ${formData.shopName || 'DELICIOUS CAKE CORNER'}: SMS Gateway integration test successful! Phone: ${formData.phone || '7866971421'}. 100% Eggless Pure Veg Bakery.`,
        type: 'custom',
        mode: forceSimulator ? 'sandbox' : undefined,
        fallbackToSimulator: true
      });
      setTestSmsResult(res);
      if (res.success) {
        getSmsServerStatus().then((s) => {
          setSmsGatewayStatus((prev) => ({
            ...prev,
            totalDispatched: s.totalDispatched
          }));
        });
      }
    } catch (err: any) {
      setTestSmsResult({ success: false, error: err?.message || 'Error sending test SMS' });
    } finally {
      setIsSendingTestSms(false);
    }
  };

  const handleChange = (field: keyof ShopConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleChange('signatureImage', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleChange('logoUrl', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const presetLogos = [
    {
      id: 'official',
      name: lang === 'bn' ? 'অফিসিয়াল গোল্ডেন এমব্লেম (নতুন)' : 'Official DCC Emblem (New)',
      url: DEFAULT_BAKERY_LOGO
    },
    {
      id: 'gold_badge',
      name: lang === 'bn' ? 'রয়েল গোল্ড ব্যাজ' : 'Royal Gold Badge',
      url: goldBadgeImg
    },
    {
      id: 'app_icon',
      name: lang === 'bn' ? 'মডার্ন অ্যাপ আইকন' : 'Modern App Icon',
      url: appIconImg
    },
    {
      id: 'truffle',
      name: lang === 'bn' ? 'চকলেট ট্রাফেল আর্ট' : 'Chocolate Truffle Art',
      url: truffleLogoImg
    },
    {
      id: 'redvelvet',
      name: lang === 'bn' ? 'রেড ভেলভেট ক্রাউন' : 'Red Velvet Crown',
      url: redVelvetLogoImg
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveShopConfig(formData);
    setConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{t.settingsTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure bakery branding, location, UPI QR parameters, and print receipt format
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{t.settingsSaved}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bakery Logo & Brand Emblem */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <ImageIcon className="w-4 h-4 text-[#4b1d3f]" />
              <span>{lang === 'bn' ? 'দোকানের লোগো ও ব্র্যান্ড এমব্লেম (Bakery Logo)' : 'Bakery Logo & Brand Emblem'}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {lang === 'bn' ? 'হেডার এবং প্রিন্ট রসিদে প্রদর্শিত হবে' : 'Shown in Header & Print Invoices'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Logo Preview */}
            <div className="relative group shrink-0 text-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-950 border-2 border-amber-300/80 p-1.5 shadow-md flex items-center justify-center overflow-hidden">
                <img
                  src={formData.logoUrl || DEFAULT_BAKERY_LOGO}
                  alt="Bakery Logo Preview"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 mt-1 block">Live Logo Preview</span>
            </div>

            {/* Logo Controls */}
            <div className="flex-1 space-y-3 w-full">
              <div className="flex flex-wrap items-center gap-2">
                {/* Upload Button */}
                <label className="cursor-pointer px-3.5 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'নতুন লোগো আপলোড করুন' : 'Upload Custom Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                {/* Reset to default */}
                <button
                  type="button"
                  onClick={() => handleChange('logoUrl', DEFAULT_BAKERY_LOGO)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'ডিফল্ট লোগো রিস্টোর' : 'Reset to Default'}</span>
                </button>

                {formData.logoUrl && formData.logoUrl !== DEFAULT_BAKERY_LOGO && (
                  <button
                    type="button"
                    onClick={() => handleChange('logoUrl', '')}
                    className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                    title="Remove custom logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Logo Presets Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  {lang === 'bn' ? 'অথবা রেডিমেড বেকারির লোগো প্রিসেট বেছে নিন:' : 'Or choose from signature bakery presets:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {presetLogos.map((preset) => {
                    const isSelected = (formData.logoUrl || DEFAULT_BAKERY_LOGO) === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleChange('logoUrl', preset.url)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                            : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-7 h-7 rounded-lg object-cover shrink-0"
                        />
                        <span className="text-[10px] font-bold text-slate-800 truncate leading-tight">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkbox: Show on print receipt */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.showLogoOnReceipt !== false}
                  onChange={(e) => handleChange('showLogoOnReceipt', e.target.checked)}
                  className="w-4 h-4 text-[#4b1d3f] rounded border-slate-300 focus:ring-[#4b1d3f]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {lang === 'bn'
                    ? 'প্রিন্ট রসিদ ও ইনভয়েসের শীর্ষে লোগো প্রদর্শন করুন (Recommended)'
                    : 'Display bakery logo at top of printed receipts and invoices (Recommended)'}
                </span>
              </label>
            </div>
          </div>
        </div>
        {/* Basic Shop Info */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-sm text-slate-900">
            <Store className="w-4 h-4 text-[#4b1d3f]" />
            <span>{t.shopInfo}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t.shopNameLabel} *
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => handleChange('shopName', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Shop Tagline / Speciality
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t.addressLabel1} *
              </label>
              <input
                type="text"
                required
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t.addressLabel2}
              </label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => handleChange('addressLine2', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                District / City
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleChange('district', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                PIN Code
              </label>
              <input
                type="text"
                value={formData.pin}
                onChange={(e) => handleChange('pin', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t.phoneLabel} *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono font-bold"
              />
            </div>
          </div>

          {/* Google Maps Store Pin & Navigation */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span>Google Maps Location & Navigation Pin (DELICIOUS CAKE CORNER)</span>
              </label>
              {formData.googleMapsUrl && (
                <a
                  href={formData.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div>
              <input
                type="text"
                value={formData.googleMapsUrl || ''}
                onChange={(e) => handleChange('googleMapsUrl', e.target.value)}
                placeholder="https://www.google.com/maps/place/Delicious+Cake+Corner/@22.7157,87.7329,17z..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.latitude !== undefined ? formData.latitude : 22.7157}
                  onChange={(e) => handleChange('latitude', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.longitude !== undefined ? formData.longitude : 87.7329}
                  onChange={(e) => handleChange('longitude', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            GOOGLE, FACEBOOK & SOCIAL PROFILES (সোশ্যাল ও অনলাইন প্রোফাইল লিঙ্ক)
            ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{lang === 'bn' ? 'গুগল ও ফেসবুক লিঙ্ক (Google & Facebook Links)' : 'Google & Facebook Social Profiles'}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {lang === 'bn' ? 'রসিদ, কিউআর হাব ও অনলাইন অর্ডারে ব্যবহৃত হয়' : 'Used on Bills, Receipts & Marketing'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Facebook Page URL */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-[#1877F2] text-white flex items-center justify-center font-black text-[10px]">f</span>
                  <span>Facebook Page Link</span>
                </label>
                {formData.facebookPageUrl && (
                  <a
                    href={formData.facebookPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#1877F2] hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={formData.facebookPageUrl || ''}
                onChange={(e) => handleChange('facebookPageUrl', e.target.value)}
                placeholder="https://www.facebook.com/share/1EEg9yAa9A/"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
              <span className="text-[10px] text-slate-500 block">
                আপনার ফেসবুক পেজের লিঙ্ক দিন (গ্রাহকদের ফলো ও হোয়াটসঅ্যাপ অর্ডারের জন্য)।
              </span>
            </div>

            {/* Instagram Profile URL */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-black text-[10px]">ig</span>
                  <span>Instagram Profile Link</span>
                </label>
                {formData.instagramUrl && (
                  <a
                    href={formData.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-pink-600 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={formData.instagramUrl || ''}
                onChange={(e) => handleChange('instagramUrl', e.target.value)}
                placeholder="https://instagram.com/deliciouscakecorner"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
              <span className="text-[10px] text-slate-500 block">
                আপনার ইন্সটাগ্রাম প্রোফাইলের লিঙ্ক দিন (কেক রিলস ও ফ্যান ফলোয়ার বাড়াতে)।
              </span>
            </div>

            {/* Google Review / 5-Star Rating URL */}
            <div className="sm:col-span-2 space-y-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="text-amber-500">⭐</span>
                  <span>Google 5-Star Review & Rating Link</span>
                </label>
                {formData.googleReviewUrl && (
                  <a
                    href={formData.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-600 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>Test Review Link</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={formData.googleReviewUrl || ''}
                onChange={(e) => handleChange('googleReviewUrl', e.target.value)}
                placeholder="https://g.page/r/.../review"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
              <span className="text-[10px] text-slate-500 block">
                গ্রাহকদের থেকে ৫-স্টার রিভিউ পেতে আপনার Google Business Review লিঙ্ক দিন (বিল প্রিন্ট ও এসএমএসে পাঠানো যাবে)।
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            GOOGLE & FACEBOOK ADS MARKETING HUB (বিজ্ঞাপন দেওয়ার সম্পূর্ণ সহকারী)
            ========================================================================= */}
        <div className="bg-gradient-to-br from-[#2a0e23] via-[#4b1d3f] to-[#300f26] text-white rounded-2xl p-5 shadow-lg border border-amber-400/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/15 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
                <Megaphone className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                  <span>{lang === 'bn' ? '📢 গুগল ও ফেসবুক বিজ্ঞাপন দেওয়ার গাইড ও টুলস' : 'Google & Facebook Ads Marketing Hub'}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold uppercase">
                    PRO
                  </span>
                </h3>
                <p className="text-[11px] text-amber-200/80">
                  {lang === 'bn'
                    ? 'ঘাটাল ও মনসুকা এলাকায় কেকের অর্ডার বাড়াতে বিজ্ঞাপন দেওয়ার সম্পূর্ণ সহজ নিয়মাবলী'
                    : 'Step-by-step local advertising launchpad for Google Ads & Meta Facebook/Instagram Ads'}
                </p>
              </div>
            </div>

            {/* Direct Official Ad Launch Links */}
            <div className="flex items-center gap-1.5">
              <a
                href="https://adsmanager.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-[#1877F2] hover:bg-[#1567d3] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
              >
                <span>Facebook Ads</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://ads.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
              >
                <span>Google Ads</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Marketing Sub-Tabs */}
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl text-xs overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveAdGuideTab('facebook')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeAdGuideTab === 'facebook'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-xs font-black'
                  : 'text-amber-100/70 hover:text-white'
              }`}
            >
              <span>🔵 Facebook & Instagram Ad</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAdGuideTab('google')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeAdGuideTab === 'google'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-xs font-black'
                  : 'text-amber-100/70 hover:text-white'
              }`}
            >
              <span>🟢 Google Search & Maps Ad</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAdGuideTab('copy')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeAdGuideTab === 'copy'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-xs font-black'
                  : 'text-amber-100/70 hover:text-white'
              }`}
            >
              <span>📋 তৈরি বিজ্ঞাপনের লেখা (Ready Copy)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAdGuideTab('targeting')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeAdGuideTab === 'targeting'
                  ? 'bg-amber-400 text-[#4b1d3f] shadow-xs font-black'
                  : 'text-amber-100/70 hover:text-white'
              }`}
            >
              <span>🎯 লোকাল টার্গেটিং (Ghatal Radius)</span>
            </button>
          </div>

          {/* Sub-Tab 1: Facebook / Meta Ad Guide */}
          {activeAdGuideTab === 'facebook' && (
            <div className="space-y-3 bg-black/25 p-4 rounded-xl border border-white/10 text-xs">
              <h4 className="font-extrabold text-amber-300 text-sm flex items-center gap-2">
                <span>📱 Facebook ও Instagram-এ কেকের বিজ্ঞাপন কিভাবে দেবেন (ধাপে ধাপে):</span>
              </h4>
              <ol className="space-y-2 text-slate-200 list-decimal pl-4 leading-relaxed">
                <li>
                  <b className="text-white">ধাপ ১: পোস্ট তৈরি করুন —</b> প্রথমে আপনার Facebook Page-এ দোকানের স্পেশাল চকোলেট ট্রাফল বা ডিজাইনার কেকের ১টি সুন্দর ছবি বা ভিডিও/রিল পোস্ট করুন।
                </li>
                <li>
                  <b className="text-white">ধাপ ২: Boost Post বা Ads Manager-এ যান —</b> পোস্টের নিচে থাকা <b>"Boost Post"</b> বাটনে চাপুন অথবা কম্পিউটার থেকে{' '}
                  <a href="https://adsmanager.facebook.com" target="_blank" rel="noreferrer" className="text-amber-300 underline font-bold">
                    adsmanager.facebook.com
                  </a>
                  -এ যান।
                </li>
                <li>
                  <b className="text-white">ধাপ ৩: লক্ষ্য (Goal) বাছুন —</b> গোল সিলেক্ট করুন <b>"Get More Messages (WhatsApp)"</b>। এতে বিজ্ঞাপনে ক্লিক করলে কাস্টমার সরাসরি আপনার দোকানে হোয়াটসঅ্যাপে (`7866971421`) মেসেজ দেবে।
                </li>
                <li>
                  <b className="text-white">ধাপ ৪: এলাকা ও অডিয়েন্স সিলেক্ট করুন —</b> Location-এ <b>Mansuka, Ghatal</b> দিন এবং ব্যাস দিন <b>10 km থেকে 15 km</b>। বয়স: ১৮ - ৪৫ বছর।
                </li>
                <li>
                  <b className="text-white">ধাপ ৫: ইন্টারেস্ট বা আগ্রহ —</b> "Upcoming Birthday (যাদের সামনে জন্মদিন)", "Anniversary", "Cake", "Food lovers" সিলেক্ট করুন।
                </li>
                <li>
                  <b className="text-white">ধাপ ৬: বাজেট দিন —</b> প্রতিদিন মাত্র <b>₹১০০ থেকে ₹১৫০ টাকা</b> বাজেট রেখে ৩ থেকে ৭ দিনের জন্য অ্যাড চালু করুন।
                </li>
              </ol>

              {/* Direct Click-to-WhatsApp link generator */}
              <div className="mt-3 p-3 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-bold text-amber-200 block text-[11px]">
                    বিজ্ঞাপনের অ্যাকশন বাটনে দেওয়ার জন্য সরাসরি হোয়াটসঅ্যাপ লিঙ্ক:
                  </span>
                  <span className="font-mono text-[10px] text-white/90">
                    https://wa.me/917866971421?text=Hello%20Delicious%20Cake%20Corner,%20I%20want%20to%20order%20a%20cake
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      'https://wa.me/917866971421?text=Hello%20Delicious%20Cake%20Corner,%20I%20want%20to%20order%20a%20fresh%20eggless%20cake!',
                      'wa-ad-link'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {copiedAdText === 'wa-ad-link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAdText === 'wa-ad-link' ? 'কপি হয়েছে!' : 'লিঙ্ক কপি করুন'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Google Search & Maps Ad Guide */}
          {activeAdGuideTab === 'google' && (
            <div className="space-y-3 bg-black/25 p-4 rounded-xl border border-white/10 text-xs">
              <h4 className="font-extrabold text-amber-300 text-sm flex items-center gap-2">
                <span>🔍 Google Search ও Google Maps-এ বিজ্ঞাপন কিভাবে দেবেন:</span>
              </h4>
              <ol className="space-y-2 text-slate-200 list-decimal pl-4 leading-relaxed">
                <li>
                  <b className="text-white">ধাপ ১: Google Ads-এ লগইন করুন —</b>{' '}
                  <a href="https://ads.google.com" target="_blank" rel="noreferrer" className="text-amber-300 underline font-bold">
                    ads.google.com
                  </a>
                  -এ গিয়ে আপনার জিমেইল দিয়ে লগইন করুন।
                </li>
                <li>
                  <b className="text-white">ধাপ ২: "Smart Campaign" বা "Local Campaign" বাছুন —</b> এটি স্থানীয় দোকান ও বেকারির জন্য সবচেয়ে সহজ ও সস্তা।
                </li>
                <li>
                  <b className="text-white">ধাপ ৩: গোল সিলেক্ট করুন —</b> <b>"Get more phone calls"</b> সিলেক্ট করুন যাতে কেউ গুগলে সার্চ করলেই সরাসরি কল বাটন দেখতে পায়।
                </li>
                <li>
                  <b className="text-white">ধাপ ৪: কি-ওয়ার্ড (Search Keywords) যোগ করুন —</b> নিচে দেওয়া কি-ওয়ার্ডগুলো দিন:
                  <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10px]">
                    {['cake shop near me', 'bakery in ghatal', 'birthday cake delivery mansuka', 'eggless cake ghatal', 'custom designer cake ghatal'].map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-white/10 text-amber-200 border border-white/15">
                        {k}
                      </span>
                    ))}
                  </div>
                </li>
                <li>
                  <b className="text-white">ধাপ ৫: এলাকা টার্গেট করুন —</b> মনসুকা বাজারের পিনকোড (721212) ও ঘাটাল সাব-ডিভিশন এলাকা।
                </li>
                <li>
                  <b className="text-white">ধাপ ৬: বাজেট নির্ধারণ —</b> দৈনিক মাত্র ₹১০০ বা ₹১৫০ টাকা। কেবল যখন কেউ আপনার বিজ্ঞাপনে ক্লিক করবে বা কল করবে, তখনই টাকা কাটবে (Pay Per Click)।
                </li>
              </ol>
            </div>
          )}

          {/* Sub-Tab 3: Ready-to-Use Ad Copy */}
          {activeAdGuideTab === 'copy' && (
            <div className="space-y-3 bg-black/25 p-4 rounded-xl border border-white/10 text-xs">
              <h4 className="font-extrabold text-amber-300 text-sm flex items-center justify-between">
                <span>📋 তৈরি বিজ্ঞাপনের লেখা (বিজ্ঞাপন দেওয়ার সময় হুবহু কপি করে পেস্ট করুন):</span>
              </h4>

              {/* Copy 1: Bengali Facebook/Instagram Cake Ad */}
              <div className="p-3 bg-white/10 rounded-xl border border-white/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-300">১. ফেসবুক/ইন্সটাগ্রাম পোস্ট ও অ্যাড ক্যাপশন (বাংলা):</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        '🎂 মনসুকা ও ঘাটালের ১ নম্বর ১০০% এগলেস পিওর ভেজ বেকারি — Delicious Cake Corner! ✨\n\n' +
                        'জন্মদিন, বিবাহবার্ষিকী বা বিশেষ যেকোনো উৎসবে পান মনের মতো কাস্টম ডিজাইনার ও ফটো কেক সবার আগে। প্রতিটি কেক তৈরি হয় সম্পূর্ণ ফ্রেশ ও স্বাস্থ্যকর উপায়ে।\n\n' +
                        '🍰 স্পেশাল ফ্লেভার: চকোলেট ট্রাফেল, রেড ভেলভেট, বাটারস্কচ, ব্ল্যাক ফরেস্ট ও ফ্রুট কেক।\n' +
                        '🚚 মনসুকা ও ঘাটাল এলাকায় দ্রুত হোম ডেলিভারি সুব্যবস্থা আছে।\n\n' +
                        '📞 আজই অর্ডার বা বুকিং করতে কল / হোয়াটসঅ্যাপ করুন: 7866971421\n' +
                        '📍 ঠিকানা: মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)।\n' +
                        '#DeliciousCakeCorner #GhatalBakery #Mansuka #EgglessCake',
                        'fb-copy'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-amber-400 text-[#4b1d3f] font-bold text-[11px] flex items-center gap-1 shadow-xs"
                  >
                    {copiedAdText === 'fb-copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAdText === 'fb-copy' ? 'কপি হয়েছে!' : 'লেখাটি কপি করুন'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-black/30 p-2 rounded-lg">
                  🎂 মনসুকা ও ঘাটালের ১ নম্বর ১০০% এগলেস পিওর ভেজ বেকারি — Delicious Cake Corner! ✨{'\n'}
                  জন্মদিন, বিবাহবার্ষিকী বা বিশেষ অনুষ্ঠানে পান মনের মতো ডিজাইনার কেক।{'\n'}
                  📞 সরাসরি কল / হোয়াটসঅ্যাপ: 7866971421 • 📍 মনসুকা বাজার, ঘাটাল।
                </p>
              </div>

              {/* Copy 2: Google Search Ad Headlines */}
              <div className="p-3 bg-white/10 rounded-xl border border-white/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-300">২. গুগল অ্যাড হেডলাইন ও ডেসক্রিপশন (Google Ads Headlines):</span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        'Headline 1: 100% Eggless Pure Veg Cake - Ghatal\n' +
                        'Headline 2: Delicious Cake Corner - Mansuka\n' +
                        'Headline 3: Same Day Custom Birthday Cake Delivery\n' +
                        'Description: Freshly baked custom celebration cakes, photo cakes & pastries in Mansuka & Ghatal. Call or WhatsApp 7866971421 now!',
                        'google-copy'
                      )
                    }
                    className="px-2.5 py-1 rounded bg-amber-400 text-[#4b1d3f] font-bold text-[11px] flex items-center gap-1 shadow-xs"
                  >
                    {copiedAdText === 'google-copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAdText === 'google-copy' ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-200 space-y-1 bg-black/30 p-2 rounded-lg">
                  <div><b>Headline 1:</b> 100% Eggless Pure Veg Cake - Ghatal</div>
                  <div><b>Headline 2:</b> Delicious Cake Corner - Mansuka Bazar</div>
                  <div><b>Headline 3:</b> Same Day Custom Birthday Cake Delivery</div>
                  <div><b>Description:</b> Fresh celebration cakes, photo cakes & pastries in Mansuka & Ghatal. Call 7866971421!</div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Targeting & Radius */}
          {activeAdGuideTab === 'targeting' && (
            <div className="space-y-3 bg-black/25 p-4 rounded-xl border border-white/10 text-xs">
              <h4 className="font-extrabold text-amber-300 text-sm flex items-center gap-2">
                <span>🎯 লোকাল টার্গেটিং সেটিং (সঠিক কাস্টমারদের কাছে পৌঁছানোর নিয়ম):</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-200">
                <div className="p-3 bg-white/10 rounded-xl space-y-1">
                  <span className="font-bold text-amber-300 block">📍 টার্গেট লোকেশন ও দূরত্ব:</span>
                  <p>• <b>মূল কেন্দ্র:</b> Mansuka Bazar (মনসুকা বাজার), Ghatal</p>
                  <p>• <b>রেডিয়াস (Radius):</b> ১০ কিমি থেকে ১৫ কিমি ব্যাস</p>
                  <p>• <b>কভার্ড এলাকা:</b> Ghatal Town, Mansuka, Gharoighat, Balarampur, Radhanagar, Bandar, Daspur border</p>
                </div>

                <div className="p-3 bg-white/10 rounded-xl space-y-1">
                  <span className="font-bold text-amber-300 block">👥 অডিয়েন্স ও ইন্টারেস্ট (Demographics):</span>
                  <p>• <b>বয়স:</b> ১৮ থেকে ৪৫ বছর (পুরুষ ও মহিলা উভয়েই)</p>
                  <p>• <b>ইন্টারেস্ট:</b> Friends of people with birthdays in 0-7 days (যাদের বন্ধুদের জন্মদিন আগামী ৭ দিনে), Wedding anniversary, Cake lovers</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* UPI & Invoicing Settings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-sm text-slate-900">
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>UPI Payments & Print Format</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t.upiLabel} * (আসল UPI ID)
              </label>
              <input
                type="text"
                required
                value={formData.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder="7866971421@ybl"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono font-bold text-emerald-800"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                আপনার PhonePe বা GPay-এর আসল UPI ID টি দিন।
              </span>
              {/* Quick suggestions */}
              <div className="flex items-center gap-1 flex-wrap mt-1.5">
                {[
                  { label: 'PhonePe (@ybl)', val: `${(formData.phone || '7866971421').replace(/\D/g, '')}@ybl` },
                  { label: 'GPay SBI (@oksbi)', val: `${(formData.phone || '7866971421').replace(/\D/g, '')}@oksbi` },
                  { label: 'Paytm (@paytm)', val: `${(formData.phone || '7866971421').replace(/\D/g, '')}@paytm` }
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => handleChange('upiId', s.val)}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-[9px] font-mono text-slate-700 border border-slate-200"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {onOpenQrHub && (
                <button
                  type="button"
                  onClick={onOpenQrHub}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-[#4b1d3f] border border-amber-300/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-700" />
                  <span>{lang === 'bn' ? 'কিউআর কোড সেন্টার ও স্ট্যান্ডি খুলুন' : 'Open QR Code Studio & Standee Hub'}</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t.billPrefixLabel}
              </label>
              <input
                type="text"
                value={formData.billPrefix}
                onChange={(e) => handleChange('billPrefix', e.target.value)}
                placeholder="DCC-"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'bn'
                  ? `বিল নম্বর প্রিভিউ: ${formData.billPrefix || 'DCC-'}26C1000001 (DCC-[বছর ২ ডিজিট][কাউন্টার][৬ ডিজিট ক্রম)]`
                  : `Invoice Preview: ${formData.billPrefix || 'DCC-'}26C1000001 (DCC-[Year 2-digit][Counter][000001])`}
              </p>
              <div className="mt-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  দোকানের আসল QR কোডের ছবি (Shop QR Standee):
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-[#4b1d3f] flex items-center gap-1 shadow-2xs">
                    <span>{formData.qrCodeImage ? 'QR ছবি পরিবর্তন' : 'QR ছবি আপলোড'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            handleChange('qrCodeImage', ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {formData.qrCodeImage && (
                    <button
                      type="button"
                      onClick={() => handleChange('qrCodeImage', '')}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      রিমুভ করুন
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t.receiptFormatLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('receiptFormat', 'thermal')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    formData.receiptFormat === 'thermal'
                      ? 'bg-[#4b1d3f] text-white border-[#4b1d3f]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Thermal POS (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('receiptFormat', 'standard')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    formData.receiptFormat === 'standard'
                      ? 'bg-[#4b1d3f] text-white border-[#4b1d3f]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Standard Invoice (A4/A5)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t.fssaiLabel}
              </label>
              <input
                type="text"
                value={formData.fssai || ''}
                onChange={(e) => handleChange('fssai', e.target.value)}
                placeholder="e.g. 12822000000000"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Thank You Message (English) / বিলের ধন্যবাদ বার্তা
              </label>
              <textarea
                rows={2}
                value={formData.thankYouMessage || ''}
                onChange={(e) => handleChange('thankYouMessage', e.target.value)}
                placeholder="Thank you for choosing DELICIOUS CAKE CORNER! 🎂 Visit again!"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Thank You Message (Bengali) / বাংলায় বার্তা
              </label>
              <textarea
                rows={2}
                value={formData.thankYouMessageBn || ''}
                onChange={(e) => handleChange('thankYouMessageBn', e.target.value)}
                placeholder="ডেলিসিয়াস কেক কর্নার-এ আসার জন্য আপনাকে আন্তরিক ধন্যবাদ! 🎂 আবার আসবেন!"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>
          </div>

          {/* Authorized Signatory & Signature Upload */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-[#4b1d3f]" />
                <span>Authorized Signatory & Signature (স্বাক্ষর আপলোড)</span>
              </span>
              <span className="text-[11px] text-slate-500 block">
                Prints on receipts and standard invoices above "Authorized Signatory"
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Signatory Name / স্বাক্ষরকারীর নাম
                </label>
                <input
                  type="text"
                  value={formData.signatoryName || 'Sumona Mondal Kunti'}
                  onChange={(e) => handleChange('signatoryName', e.target.value)}
                  placeholder="Sumona Mondal Kunti"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Upload Signature Photo / ডিজিটাল স্বাক্ষর
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#4b1d3f]" />
                    <span>{formData.signatureImage ? 'Change Signature Image' : 'Upload Signature Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.signatureImage && (
                    <button
                      type="button"
                      onClick={() => handleChange('signatureImage', '')}
                      className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                      title="Remove uploaded signature image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Signature Preview */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">Live Receipt Preview:</span>
              <div className="text-center px-4 py-2 bg-white border border-dashed border-slate-300 rounded-lg shadow-2xs">
                {formData.signatureImage ? (
                  <img
                    src={formData.signatureImage}
                    alt="Signature Preview"
                    className="h-9 max-w-[130px] object-contain mx-auto mix-blend-multiply"
                  />
                ) : (
                  <div className="font-serif italic text-base text-slate-800 tracking-wide select-none transform -rotate-3 scale-95 opacity-90 my-0.5">
                    {formData.signatoryName || 'Sumona Mondal Kunti'}
                  </div>
                )}
                <div className="w-28 border-b border-slate-400 my-0.5 mx-auto"></div>
                <span className="text-[10px] font-bold text-slate-900 block leading-tight">
                  {formData.signatoryName || 'Sumona Mondal Kunti'}
                </span>
                <span className="text-[9px] text-slate-500">Authorized Signatory</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {t.termsLabel}
            </label>
            <textarea
              rows={2}
              value={formData.termsNote}
              onChange={(e) => handleChange('termsNote', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
            />
          </div>
        </div>

        {/* All Printers & POS Hardware Fleet Management */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {lang === 'bn' ? 'সকল প্রিন্টার ও হার্ডওয়্যার হাব (All Printers & POS Fleet)' : 'All Printers & POS Hardware Fleet'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'bn'
                    ? 'Epson, TVS, Bluetooth 58mm/80mm, কিচেন KOT IP, এবং লেজার প্রিন্টার যুক্ত ও পরিচালনা করুন'
                    : 'Manage System, Epson, TVS, Bluetooth 58mm/80mm, Kitchen KOT Network IP & A4/A5 Laser printers'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* One-click Add All Printers */}
              <button
                type="button"
                onClick={() => {
                  const updated = addAllPrintersToFleet(formData.printerDevices || []);
                  const newConfig = {
                    ...formData,
                    printerDevices: updated
                  };
                  setFormData(newConfig);
                  saveShopConfig(newConfig);
                  setConfig(newConfig);
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 3000);
                }}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                title="Add all popular printer models to bakery fleet"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? '+ সব প্রিন্টার যোগ করুন' : '+ Add All Printers'}</span>
              </button>

              {onOpenPrinterManager && (
                <button
                  type="button"
                  onClick={onOpenPrinterManager}
                  className="py-1.5 px-3 bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'প্রিন্টার হাব পরিচালনা' : 'Manage Printer Fleet'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(formData.printerDevices || []).map((device) => {
              const isActive = device.id === formData.activePrinterId || device.isDefault;
              return (
                <div
                  key={device.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                    isActive
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-mono font-bold uppercase">
                      {device.type}
                    </span>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded font-mono uppercase">
                      {device.paperWidth}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="font-extrabold text-slate-900 text-xs truncate">
                    {device.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Role: <b className="capitalize text-slate-700">{device.role || 'Cashier'}</b></span>
                    <span>{device.brand || 'POS'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multiple System POS Terminal Management */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {lang === 'bn' ? 'মাল্টিপল সিস্টেম ও টার্মিনাল সেটআপ (Multiple System POS)' : 'Multiple System & Multi-Device Network'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'bn'
                    ? 'একাধিক কম্পিউটার, কাউন্টার ডেস্ক এবং স্টাফদের মোবাইলে একসাথে ব্যবহার করুন'
                    : 'Run POS simultaneously across multiple PCs, billing stations and staff smartphones'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMultiSystemModalOpen(true)}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'মাল্টি-সিস্টেম পরিচালনা ও QR কোড' : 'Manage Multiple Systems & QR Pairing'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(config.terminals || []).map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl border bg-slate-50 border-slate-200 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-[#4b1d3f] text-white text-[10px] font-mono font-bold">
                    {t.code}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded-full capitalize">
                    {t.role}
                  </span>
                </div>
                <div className="font-extrabold text-slate-900 text-xs">
                  {lang === 'bn' ? (t.nameBn || t.name) : t.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  Staff: <b className="text-slate-700">{t.cashierName || 'Not assigned'}</b>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Counter Management Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Store className="w-4 h-4 text-[#4b1d3f]" />
              <span>{lang === 'bn' ? 'বিলিং কাউন্টারসমূহ (Billing Counters)' : 'Billing Counters & Stations'}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCounterModalOpen(true)}
              className="py-1 px-3 bg-[#4b1d3f] hover:bg-[#38152e] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '+ কাউন্টার পরিচালনা / নতুন কাউন্টার' : 'Manage & Add Counters'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(config.counters || []).map((c) => (
              <div
                key={c.id}
                className={`p-3 rounded-xl border text-xs ${
                  c.id === config.activeCounterId
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-[#4b1d3f] text-white text-[10px] font-mono">
                    {c.code}
                  </span>
                  {c.id === config.activeCounterId && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                      Active / সক্রিয়
                    </span>
                  )}
                </div>
                <div className="font-extrabold text-slate-900 mt-1.5">
                  {lang === 'bn' ? (c.nameBn || c.name) : c.name}
                </div>
                {c.cashierName && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Operator: {c.cashierName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Customer Loyalty & Rewards Settings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Crown className="w-4 h-4 text-amber-600" />
              <span>{lang === 'bn' ? 'গ্রাহক লয়ালটি ও রিওয়ার্ড প্রোগ্রাম (Loyalty Program)' : 'Customer Loyalty & Rewards Program'}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
              Active / সক্রিয়
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {lang === 'bn' ? 'পয়েন্ট অর্জনের হার (প্রতি ₹১০০ কেনাকাটায়)' : 'Points Earn Rate (Per ₹100 Spent)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.loyaltyPointsPerHundred || 1}
                  onChange={(e) => handleChange('loyaltyPointsPerHundred', parseInt(e.target.value, 10) || 1)}
                  className="w-24 px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold focus:outline-none focus:border-[#4b1d3f]"
                />
                <span className="text-xs text-slate-500 font-semibold">
                  {lang === 'bn' ? 'পয়েন্ট (ডিফল্ট: ১ পয়েন্ট)' : 'Points (Default: 1 pt)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'bn' ? 'যেমন: ₹৫০০ টাকার অর্ডারে ৫ পয়েন্ট পাবেন।' : 'e.g. ₹500 order earns 5 points.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {lang === 'bn' ? 'পয়েন্ট রিডিম মূল্য (Redemption Value)' : 'Points Redemption Value'}
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                1 Point = ₹1 Discount (১ পয়েন্ট = ₹১ ছাড়)
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'bn' ? 'কাস্টমার বিলের সময় পয়েন্টস রিডিম করে ছাড় নিতে পারেন।' : 'Customer can redeem their points at checkout for instant discounts.'}
              </p>
            </div>
          </div>
        </div>

        {/* SMS API Gateway & Automated Digital Receipts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {lang === 'bn'
                    ? 'SMS API গেটওয়ে ও ডিজিটাল রসিদ (SMS API & Digital Receipts)'
                    : 'SMS API Gateway & Digital Receipts'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'bn'
                    ? 'বিল তৈরির সময় কাস্টমারের মোবাইল নম্বরে সরাসরি ডিজিটাল ইনভয়েস ও লয়ালটি টিয়ার SMS পাঠান'
                    : 'Dispatch digital invoices and loyalty tier updates directly to customer phones via SMS API'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-extrabold text-[10px] flex items-center gap-1.5 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>{smsGatewayStatus.activeGateway}</span>
              </span>
            </div>
          </div>

          {/* Gateway Status Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Gateway</span>
              <span className="font-extrabold text-slate-900 text-xs block">{smsGatewayStatus.activeGateway}</span>
              <span className="text-[10px] text-slate-400">Fast2SMS / Twilio / MSG91 / Sandbox</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Sender Phone / ID</span>
              <span className="font-mono font-extrabold text-blue-900 text-xs block">+91 {smsGatewayStatus.senderPhone}</span>
              <span className="text-[10px] text-slate-400">Shop Helpline Contact</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Dispatched</span>
              <span className="font-mono font-extrabold text-emerald-800 text-xs block">{smsGatewayStatus.totalDispatched} messages</span>
              <span className="text-[10px] text-slate-400">Delivered via API</span>
            </div>
          </div>

          {/* Configurable Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            {/* Auto-send on bill generation */}
            <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
              <input
                type="checkbox"
                checked={formData.autoSendSmsOnBill !== false}
                onChange={(e) => handleChange('autoSendSmsOnBill', e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#4b1d3f] rounded border-slate-300 focus:ring-[#4b1d3f] cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-900 block">
                  {lang === 'bn'
                    ? 'বিল তৈরির সময় স্বয়ংক্রিয়ভাবে কাস্টমারকে SMS পাঠান (Auto-Send SMS on Bill Generation)'
                    : 'Auto-Send SMS Receipt when Bill is Generated'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {lang === 'bn'
                    ? 'ক্যাশিয়ার যখন "Save & New" অথবা "Print" চাপবেন, কাস্টমারের নম্বরে তৎক্ষণাৎ ডিজিটাল রসিদ ও লয়ালটি SMS চলে যাবে।'
                    : 'Automatically triggers the SMS API gateway when a bill with a customer phone is saved or printed.'}
                </span>
              </div>
            </label>

            {/* Include Loyalty points and tier update */}
            <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
              <input
                type="checkbox"
                checked={formData.includeLoyaltyInSms !== false}
                onChange={(e) => handleChange('includeLoyaltyInSms', e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#4b1d3f] rounded border-slate-300 focus:ring-[#4b1d3f] cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-900 block">
                  {lang === 'bn'
                    ? 'SMS রসিদে লয়ালটি পয়েন্টস ও টিয়ার আপডেট অন্তর্ভুক্ত করুন (Include Loyalty Tier Update in SMS)'
                    : 'Include Loyalty Points & Tier Update in SMS'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {lang === 'bn'
                    ? 'মেসেজের মধ্যে অর্জিত পয়েন্ট, বর্তমান ব্যালেন্স, এবং পরবর্তী টিয়ার পেতে আর কত খরচ করতে হবে তা যুক্ত থাকবে।'
                    : 'Includes current loyalty balance, earned points, tier badge (⭐/👑), and amount needed for next tier.'}
                </span>
              </div>
            </label>

            {/* Language Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'SMS রসিদের ভাষা (SMS Language):' : 'SMS Receipt Language:'}
                </label>
                <select
                  value={formData.smsLanguage || 'bn'}
                  onChange={(e) => handleChange('smsLanguage', e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:border-[#4b1d3f] bg-white"
                >
                  <option value="bn">বাংলা (Bengali - Unicode)</option>
                  <option value="en">English (Standard English)</option>
                  <option value="bilingual">Bilingual (বাংলা + English)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'দোকানের হেল্পলাইন নম্বর (Sender Helpline):' : 'Sender Helpline Phone:'}
                </label>
                <input
                  type="text"
                  value={formData.phone || '7866971421'}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="7866971421"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-[#4b1d3f]"
                />
              </div>
            </div>
          </div>

          {/* Test SMS Dispatcher Tool */}
          <div className="pt-3 border-t border-slate-100 bg-slate-50/80 -mx-5 -mb-5 p-5 rounded-b-2xl space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'bn' ? 'SMS গেটওয়ে টেস্ট করুন (Send Live Test SMS):' : 'Live Gateway Test Sender:'}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                API Endpoint: /api/send-sms
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate-400">+91</span>
                <input
                  type="tel"
                  value={testSmsPhone}
                  onChange={(e) => setTestSmsPhone(e.target.value)}
                  placeholder="10-digit mobile number..."
                  maxLength={10}
                  className="w-full pl-11 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl font-mono font-bold bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSendTestSms(false)}
                  disabled={isSendingTestSms || testSmsPhone.replace(/\D/g, '').length < 10}
                  className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 shadow-xs"
                >
                  {isSendingTestSms ? (
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSendingTestSms ? 'Dispatching...' : (lang === 'bn' ? 'টেস্ট SMS পাঠান' : 'Send Test SMS')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendTestSms(true)}
                  disabled={isSendingTestSms || testSmsPhone.replace(/\D/g, '').length < 10}
                  title="Test delivery using instant Sandbox Simulator (no external balance required)"
                  className="py-1.5 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Zap className="w-3 h-3 text-amber-600" />
                  <span>{lang === 'bn' ? 'সিমুলেটর টেস্ট' : 'Simulator'}</span>
                </button>
              </div>
            </div>

            {testSmsResult && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                testSmsResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {testSmsResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div className="flex-1">
                  <span>
                    {testSmsResult.success
                      ? `টেস্ট SMS সফলভাবে প্রসেস হয়েছে (+91${testSmsPhone.replace(/\D/g, '').slice(-10)})!`
                      : `SMS ব্যর্থ: ${testSmsResult.error}`}
                  </span>
                  {testSmsResult.messageId && (
                    <div className="text-[10px] font-mono text-emerald-700 mt-0.5">
                      Message ID: {testSmsResult.messageId} • Gateway: {testSmsResult.provider}
                    </div>
                  )}
                  {!testSmsResult.success && (
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendTestSms(true)}
                        className="text-[11px] font-bold text-blue-700 underline hover:text-blue-900"
                      >
                        {lang === 'bn' ? '💡 Sandbox Simulator দিয়ে টেস্ট করতে এখানে ক্লিক করুন' : '💡 Click here to test via Sandbox Simulator'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual Cloud Backup Safeguard Card */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                <span>Cloud Safeguard</span>
              </span>
              <span className="text-xs font-bold text-blue-900">
                {lang === 'bn' ? 'ম্যানুয়াল ডাটাবেস ব্যাকআপ' : 'Manual Billing Database Backup'}
              </span>
            </div>
            <p className="text-xs text-blue-700/90 mt-1 max-w-lg">
              {lang === 'bn'
                ? 'ফায়ারস্টোর ক্লাউড এবং লোকাল ক্যাশ থেকে সম্পূর্ণ বিলিং ও স্টোর ডাটা JSON ফাইল হিসেবে ডাউনলোড করুন।'
                : 'Download a complete JSON snapshot of all bills, products, customers and settings from Firestore and local storage.'}
            </p>
          </div>

          {onOpenCloudBackup && (
            <button
              type="button"
              onClick={onOpenCloudBackup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-amber-300" />
              <span>{lang === 'bn' ? 'ক্লাউড ব্যাকআপ ডাউনলোড (JSON)' : 'Download Cloud Backup (JSON)'}</span>
            </button>
          )}
        </div>

        {/* Staff Accounts & Granular Permissions Card */}
        {onOpenStaffManager && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4b1d3f] text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin Access Control</span>
                </span>
                <span className="text-xs font-black text-amber-950">
                  {lang === 'bn' ? 'স্টাফ ও পারমিশন কন্ট্রোল প্যানেল' : 'Staff & Granular Role Permissions'}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 max-w-lg leading-relaxed">
                {lang === 'bn'
                  ? '👑 অ্যাডমিন সব কাজ করতে পারবেন। কাউন্টার কর্মী ও ডেলিভারি বয়দের জন্য দাম পরিবর্তন, বিল মোছা, স্টক অডিট ও বিক্রয় রিপোর্টের অনুমতি নিয়ন্ত্রণ করুন।'
                  : '👑 Admin has unrestricted master access. Customize exact permissions for Cashiers, Delivery Drivers, and manage PIN codes.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenStaffManager}
              className="px-4 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>{lang === 'bn' ? 'পারমিশন কনফিগার করুন' : 'Manage Permissions'}</span>
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="py-2.5 px-6 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.saveSettings}</span>
          </button>
        </div>
      </form>

      {/* Counter Manager Modal */}
      <CounterManagerModal
        isOpen={isCounterModalOpen}
        onClose={() => setIsCounterModalOpen(false)}
        config={config}
        onConfigUpdate={(newCfg) => {
          setConfig(newCfg);
          setFormData(newCfg);
        }}
        lang={lang}
      />

      {/* Multiple System POS Terminal Modal */}
      <MultiSystemModal
        isOpen={isMultiSystemModalOpen}
        onClose={() => setIsMultiSystemModalOpen(false)}
        config={config}
        onConfigUpdate={(newCfg) => {
          setConfig(newCfg);
          setFormData(newCfg);
        }}
        lang={lang}
      />
    </div>
  );
};
