import React from 'react';
import { CustomerLoyalty, Bill, Language } from '../types';
import { getT } from '../translations';
import {
  X,
  Award,
  Crown,
  Calendar,
  IndianRupee,
  Receipt,
  Phone,
  User,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface CustomerLoyaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  loyalty: CustomerLoyalty | null;
  bills: Bill[];
  lang: Language;
}

export const CustomerLoyaltyModal: React.FC<CustomerLoyaltyModalProps> = ({
  isOpen,
  onClose,
  loyalty,
  bills,
  lang
}) => {
  const t = getT(lang);

  if (!isOpen || !loyalty) return null;

  const customerBills = bills.filter(
    (b) => b.customerMobile && b.customerMobile.replace(/\D/g, '') === loyalty.customerMobile
  );

  const getTier = (totalOrders: number) => {
    if (totalOrders >= 10) return { name: 'Platinum VIP', color: 'bg-purple-100 text-purple-900 border-purple-300' };
    if (totalOrders >= 5) return { name: 'Gold Member', color: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (totalOrders >= 2) return { name: 'Silver Member', color: 'bg-slate-200 text-slate-800 border-slate-300' };
    return { name: 'Bronze Member', color: 'bg-orange-100 text-orange-900 border-orange-300' };
  };

  const tier = getTier(loyalty.totalOrders);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#4b1d3f] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 font-bold">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                <span>{loyalty.customerName}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${tier.color}`}>
                  {tier.name}
                </span>
              </h3>
              <p className="text-xs text-amber-100/80 font-mono">
                📞 {loyalty.customerMobile}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loyalty Snapshot Metrics */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-amber-900 block">
                {t.pointsBalance}
              </span>
              <span className="text-xl font-black text-[#4b1d3f] font-mono block mt-1">
                {loyalty.pointsBalance} pts
              </span>
              <span className="text-[9px] text-amber-800 font-semibold block mt-0.5">
                (Worth ₹{loyalty.pointsBalance})
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-600 block">
                {t.visitCount}
              </span>
              <span className="text-xl font-black text-slate-900 font-mono block mt-1">
                {loyalty.totalOrders}
              </span>
              <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">
                completed orders
              </span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-900 block">
                {t.lifetimeSpent}
              </span>
              <span className="text-xl font-black text-emerald-900 font-mono block mt-1">
                ₹{loyalty.totalSpent}
              </span>
              <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                lifetime value
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#4b1d3f]" />
              <span>{t.lastVisited}:</span>
            </span>
            <span className="font-bold text-slate-900 font-mono">
              {new Date(loyalty.lastVisitDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          {/* Past Orders by this customer */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#4b1d3f]" />
              <span>{lang === 'bn' ? 'অর্ডার হিস্ট্রি' : 'Order History'} ({customerBills.length})</span>
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {customerBills.map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{b.billNo}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {b.orderType}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(b.date || b.createdAt).toLocaleDateString('en-IN')} • {(b.items || []).length} items
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 font-mono block">
                      ₹{b.grandTotal.toFixed(0)}
                    </span>
                    {b.loyaltyPointsEarned ? (
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        +{b.loyaltyPointsEarned} pts
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#4b1d3f] text-white rounded-xl text-xs font-bold hover:bg-[#38152e] transition-colors"
          >
            {lang === 'bn' ? 'ঠিক আছে' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
