import React, { useEffect, useState, useRef } from 'react';
import { generateQrDataUrl, generateUpiString } from '../utils/upi';
import { ShopConfig } from '../types';
import { saveShopConfig } from '../utils/storage';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  AlertTriangle,
  Edit2,
  Save,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface UpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  billNo: string;
  config: ShopConfig;
  onPaymentConfirmed?: () => void;
  onConfigUpdate?: (newConfig: ShopConfig) => void;
}

export const UpiModal: React.FC<UpiModalProps> = ({
  isOpen,
  onClose,
  amount,
  billNo,
  config,
  onPaymentConfirmed,
  onConfigUpdate
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingUpi, setIsEditingUpi] = useState<boolean>(false);
  const [customUpiId, setCustomUpiId] = useState<string>(config.upiId || '7866971421@okaxis');
  const [activeUpiId, setActiveUpiId] = useState<string>(config.upiId || '7866971421@okaxis');
  const [showRealQrImage, setShowRealQrImage] = useState<boolean>(Boolean(config.qrCodeImage));
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomUpiId(config.upiId || '7866971421@okaxis');
      setActiveUpiId(config.upiId || '7866971421@okaxis');
      setShowRealQrImage(Boolean(config.qrCodeImage));
      const upiStr = generateUpiString({ ...config, upiId: config.upiId || '7866971421@okaxis' }, amount, billNo);
      generateQrDataUrl(upiStr).then((url) => setQrUrl(url));
    }
  }, [isOpen, amount, billNo, config]);

  if (!isOpen) return null;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(activeUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveUpiId = (newId: string) => {
    const trimmed = newId.trim();
    if (!trimmed || !trimmed.includes('@')) {
      alert('সঠিক UPI ID লিখুন (যেমন: 7866971421@ybl বা আপনার_নাম@oksbi)');
      return;
    }
    const updated: ShopConfig = {
      ...config,
      upiId: trimmed
    };
    saveShopConfig(updated);
    setActiveUpiId(trimmed);
    if (onConfigUpdate) {
      onConfigUpdate(updated);
    }
    const upiStr = generateUpiString(updated, amount, billNo);
    generateQrDataUrl(upiStr).then((url) => setQrUrl(url));
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsEditingUpi(false);
    }, 1500);
  };

  // Upload Real Shop Standee QR Image
  const handleUploadQrImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ছবিটি ২ MB এর চেয়ে ছোট হতে হবে।');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const updated: ShopConfig = {
          ...config,
          qrCodeImage: base64
        };
        saveShopConfig(updated);
        if (onConfigUpdate) {
          onConfigUpdate(updated);
        }
        setShowRealQrImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Extract phone number for fast suffix suggestions
  const basePhone = config.phone?.replace(/\D/g, '') || '7866971421';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 text-center border border-slate-100 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="text-left">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
              <span>UPI Scan & Pay</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Instant Settlement
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-mono">Bill No: {billNo}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount to Pay Banner */}
        <div className="my-3 py-2 px-3 bg-amber-50 rounded-xl border border-amber-200/80 text-center">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Amount to Pay / প্রদেয় টাকা
          </span>
          <span className="text-3xl font-black text-[#4b1d3f] tabular-nums font-mono">
            ₹{amount.toFixed(2)}
          </span>
        </div>

        {/* Invalid UPI ID Warning & Solution Box */}
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200/90 rounded-xl text-left text-xs text-rose-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>"Invalid UPI ID" বলছে কেন? সমাধান দেখুন:</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed">
            কাস্টমারের ফোনে স্ক্যান করার পর <strong>"Invalid UPI ID"</strong> আসলে বুঝবেন আপনার দোকানে যে UPI ID দেওয়া আছে, সেটি ভুল বা ব্যাংকের সাথে লিঙ্ক করা নেই।
          </p>
          <p className="text-[11px] text-rose-900 font-semibold pt-0.5">
            👉 সমাধান: আপনার PhonePe বা GPay অ্যাপ খুলে আসল UPI ID টি নিচে বসিয়ে দিন, অথবা দোকানের আসল QR কোডের ছবি আপলোড করুন!
          </p>
        </div>

        {/* QR Code Toggle if Standee Image Uploaded */}
        {config.qrCodeImage && (
          <div className="flex items-center justify-center gap-2 mb-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setShowRealQrImage(true)}
              className={`flex-1 py-1 px-2 rounded-md transition-all ${
                showRealQrImage ? 'bg-white text-[#4b1d3f] shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              📸 দোকানের আসল QR
            </button>
            <button
              type="button"
              onClick={() => setShowRealQrImage(false)}
              className={`flex-1 py-1 px-2 rounded-md transition-all ${
                !showRealQrImage ? 'bg-white text-[#4b1d3f] shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              ⚡ অটো-টাকার QR (₹{amount})
            </button>
          </div>
        )}

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl shadow-inner my-1">
          {showRealQrImage && config.qrCodeImage ? (
            <img
              src={config.qrCodeImage}
              alt="Shop QR Standee"
              className="w-56 h-56 object-contain rounded-lg"
            />
          ) : qrUrl ? (
            <img
              src={qrUrl}
              alt="UPI QR Code"
              className="w-52 h-52 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
              Generating QR Code...
            </div>
          )}
          <span className="text-[10px] text-slate-400 mt-1 font-mono">
            {showRealQrImage ? 'Shop Official Standee QR' : `Dynamic Amount QR (₹${amount})`}
          </span>
        </div>

        {/* Current Active UPI ID with Copy & Edit Toggle */}
        <div className="text-xs text-slate-600 mt-2 mb-2 space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 font-medium text-slate-800 flex-wrap">
            <span className="text-slate-500">Active UPI ID:</span>
            <code className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
              {activeUpiId}
            </code>
            <button
              onClick={handleCopyUpiId}
              className="p-1 text-slate-500 hover:text-slate-800 rounded bg-slate-100 hover:bg-slate-200"
              title="Copy UPI ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsEditingUpi(!isEditingUpi)}
              className="px-2 py-0.5 text-[11px] font-bold text-[#4b1d3f] bg-amber-100 hover:bg-amber-200 rounded flex items-center gap-1 transition-colors"
              title="Change UPI ID"
            >
              <Edit2 className="w-3 h-3" />
              <span>{isEditingUpi ? 'Close' : 'Change UPI ID'}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <Smartphone className="w-3 h-3 text-slate-400" />
            <span>Scan with PhonePe, Google Pay, Paytm, BHIM, or any UPI App</span>
          </p>
        </div>

        {/* Inline Fast UPI ID Editor */}
        {isEditingUpi && (
          <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl my-2 text-left space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900">
                আপনার আসল UPI ID টি লিখুন (Enter Real UPI ID):
              </label>
              {savedSuccess && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customUpiId}
                onChange={(e) => setCustomUpiId(e.target.value)}
                placeholder="7866971421@ybl"
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#4b1d3f]"
              />
              <button
                type="button"
                onClick={() => handleSaveUpiId(customUpiId)}
                className="px-3 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>

            {/* Quick Suffix Suggestions */}
            <div>
              <span className="text-[10px] text-amber-800 font-semibold block mb-1">
                আপনার ব্যাংকের হ্যান্ডেল বেছে নিন (1-Click Suggestions):
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { label: 'PhonePe (@ybl)', val: `${basePhone}@ybl` },
                  { label: 'PhonePe (@ibl)', val: `${basePhone}@ibl` },
                  { label: 'PhonePe (@axl)', val: `${basePhone}@axl` },
                  { label: 'GPay SBI (@oksbi)', val: `${basePhone}@oksbi` },
                  { label: 'GPay Axis (@okaxis)', val: `${basePhone}@okaxis` },
                  { label: 'GPay ICICI (@okicici)', val: `${basePhone}@okicici` },
                  { label: 'Paytm (@paytm)', val: `${basePhone}@paytm` }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      setCustomUpiId(item.val);
                      handleSaveUpiId(item.val);
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-amber-100 text-[10px] font-mono text-slate-800 border border-amber-300 rounded transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Real Shop Standee Photo */}
            <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 font-medium">
                দোকানের আসল QR ছবির ফটো আপলোড:
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadQrImage}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#4b1d3f] border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Upload QR Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
          {onPaymentConfirmed && (
            <button
              onClick={() => {
                onPaymentConfirmed();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Payment Received (টাকা পেয়েছি - Paid)</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors"
          >
            Close QR Window / বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
