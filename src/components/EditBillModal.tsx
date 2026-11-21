import React, { useState } from 'react';
import { Bill, Language, OrderType, PaymentMethod, ShopConfig } from '../types';
import { saveBill } from '../utils/storage';
import { saveBillToFirestore } from '../services/firestoreService';
import {
  X,
  Save,
  Edit3,
  Calendar,
  Clock,
  Phone,
  User,
  IndianRupee,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2
} from 'lucide-react';

interface EditBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  config: ShopConfig;
  lang: Language;
  onSaved: (updatedBill: Bill) => void;
  onReopenInBilling?: (bill: Bill) => void;
  onDelete?: (id: string) => void;
}

export const EditBillModal: React.FC<EditBillModalProps> = ({
  isOpen,
  onClose,
  bill,
  config,
  lang,
  onSaved,
  onReopenInBilling,
  onDelete
}) => {
  const [customerName, setCustomerName] = useState<string>(bill.customerName || '');
  const [customerMobile, setCustomerMobile] = useState<string>(bill.customerMobile || '');
  const [orderType, setOrderType] = useState<OrderType>(bill.orderType || 'counter');
  const [deliveryDate, setDeliveryDate] = useState<string>(bill.deliveryDate || '');
  const [deliveryTime, setDeliveryTime] = useState<string>(bill.deliveryTime || '');
  const [cakeMessage, setCakeMessage] = useState<string>(bill.cakeMessage || '');
  const [notes, setNotes] = useState<string>(bill.notes || '');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(bill.paymentMethod);
  const [status, setStatus] = useState<'paid' | 'due' | 'cancelled'>(bill.status);
  const [advancePaid, setAdvancePaid] = useState<number>(bill.advancePaid || 0);
  const [dueAmount, setDueAmount] = useState<number>(bill.dueAmount || 0);
  const [selectedCounterId, setSelectedCounterId] = useState<string>(
    bill.counterId || (config.counters && config.counters[0]?.id) || 'counter-1'
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const counterObj = (config.counters || []).find((c) => c.id === selectedCounterId);

    const updatedBill: Bill = {
      ...bill,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerMobile: customerMobile.trim(),
      orderType,
      deliveryDate: deliveryDate || undefined,
      deliveryTime: deliveryTime || undefined,
      cakeMessage: cakeMessage.trim() || undefined,
      notes: notes.trim() || undefined,
      paymentMethod,
      status,
      advancePaid: Number(advancePaid) || 0,
      dueAmount: Number(dueAmount) || 0,
      counterId: counterObj?.id || bill.counterId,
      counterName: counterObj?.name || bill.counterName
    };

    saveBill(updatedBill);
    saveBillToFirestore(updatedBill).catch((err) =>
      console.warn('Firestore sync notice on bill edit:', err)
    );

    setSavedSuccess(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(false);
      onSaved(updatedBill);
      onClose();
    }, 800);
  };

  const handleAutoAdjustDue = (newAdvance: number) => {
    setAdvancePaid(newAdvance);
    const newDue = Math.max(0, bill.grandTotal - newAdvance);
    setDueAmount(newDue);
    if (newDue === 0) {
      setStatus('paid');
    } else {
      setStatus('due');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 border border-slate-200 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Edit Bill: {bill.billNo}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'বিলের তথ্য পরিবর্তন ও সংশোধন করুন' : 'Modify customer, delivery & payment details'}
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

        {/* Bill Quick Summary Banner */}
        <div className="my-3 py-2.5 px-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 block">
              Grand Total / মোট বিল
            </span>
            <span className="text-xl font-black text-[#4b1d3f] font-mono tabular-nums">
              ₹{bill.grandTotal.toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Items Count:</span>
            <span className="text-xs font-bold text-slate-800">
              {bill.items.length} item(s)
            </span>
          </div>
        </div>

        {/* Option to reopen in full billing screen */}
        {onReopenInBilling && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onReopenInBilling(bill);
            }}
            className="mb-4 py-2 px-3 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              {lang === 'bn'
                ? 'বিলিং স্ক্রিনে সম্পূর্ণ খুলুন (আইটেম ও টাকার সম্পূর্ণ এডিট)'
                : 'Reopen in Billing Screen to Edit Items & Prices'}
            </span>
          </button>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-left">
          {/* Customer Details */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-900 block pb-1 border-b border-slate-100">
              {lang === 'bn' ? 'গ্রাহকের বিবরণ (Customer Details)' : 'Customer Details'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Customer Name (গ্রাহকের নাম)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Customer Mobile (মোবাইল নম্বর)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="10-digit phone"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Counter Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Billing Counter (কাউন্টার নির্বাচন)
            </label>
            <select
              value={selectedCounterId}
              onChange={(e) => setSelectedCounterId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f] bg-white font-bold text-slate-800"
            >
              {(config.counters || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {lang === 'bn' ? (c.nameBn || c.name) : c.name} {c.cashierName ? `(${c.cashierName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Order Type & Delivery */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-900 block pb-1 border-b border-slate-100">
              {lang === 'bn' ? 'অর্ডার ধরন ও ডেলিভারি' : 'Order & Delivery'}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { key: 'counter', label: 'Counter' },
                { key: 'advance_booking', label: 'Advance' },
                { key: 'dine_in', label: 'Dine In' },
                { key: 'delivery', label: 'Delivery' }
              ].map((ot) => (
                <button
                  key={ot.key}
                  type="button"
                  onClick={() => setOrderType(ot.key as OrderType)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    orderType === ot.key
                      ? 'bg-[#4b1d3f] text-white border-[#4b1d3f]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {ot.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery Date (ডেলিভারির তারিখ)
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery Time (ডেলিভারির সময়)
                </label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                />
              </div>
            </div>
          </div>

          {/* Cake Message & Notes */}
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Message on Cake (কেকের ওপর নাম/লেখা)
              </label>
              <input
                type="text"
                value={cakeMessage}
                onChange={(e) => setCakeMessage(e.target.value)}
                placeholder="e.g. Happy Birthday Riya"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Order Notes / বিশেষ নোট
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions..."
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
              />
            </div>
          </div>

          {/* Payment Status & Due Adjustment */}
          <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-900 block pb-1 border-b border-slate-200">
              Payment & Settlement (পেমেন্ট ও বাকি সমন্বয়)
            </span>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg font-bold bg-white"
                >
                  <option value="paid">PAID (পরিশোধ)</option>
                  <option value="due">DUE (বাকি আছে)</option>
                  <option value="cancelled">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg font-bold bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Due">Due</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Advance Paid (জমা)
                </label>
                <input
                  type="number"
                  min="0"
                  max={bill.grandTotal}
                  value={advancePaid}
                  onChange={(e) => handleAutoAdjustDue(Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Remaining Balance Due (অবশিষ্ট বাকি):</span>
              <span className={`font-mono text-sm ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                ₹{dueAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>সেভ হয়েছে (Saved Successfully)!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'পরিবর্তন সেভ করুন (Save Changes)' : 'Save Changes'}</span>
                </>
              )}
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(bill.id);
                  onClose();
                }}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-rose-200 transition-colors"
                title={lang === 'bn' ? 'বিল মুছে ফেলুন' : 'Delete Invoice'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'bn' ? 'মুছুন' : 'Delete'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
