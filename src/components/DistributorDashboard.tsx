import React, { useState, useMemo } from 'react';
import { Bill, ShopConfig, Language, AppUserSession } from '../types';
import {
  Truck,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  Navigation,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  Calendar,
  PackageCheck,
  Bike,
  Sparkles,
  Printer,
  ChevronRight
} from 'lucide-react';
import { saveBill } from '../utils/storage';

interface DistributorDashboardProps {
  bills: Bill[];
  config: ShopConfig;
  lang: Language;
  onUpdateBill?: (updatedBill: Bill) => void;
  onOpenMap?: () => void;
  onPrintDeliverySlip?: (bill: Bill) => void;
  userSession?: AppUserSession;
}

export const DistributorDashboard: React.FC<DistributorDashboardProps> = ({
  bills,
  config,
  lang,
  onUpdateBill,
  onOpenMap,
  onPrintDeliverySlip,
  userSession
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'out_for_delivery' | 'delivered' | 'due'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming'>('all');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Delivery & Advance Booking Orders
  const deliveryOrders = useMemo(() => {
    return bills.filter((b) => {
      // Include delivery orders or advance booking orders with delivery dates
      const isDeliveryOrBooking = b.orderType === 'delivery' || b.orderType === 'advance_booking';
      return isDeliveryOrBooking && b.status !== 'cancelled';
    });
  }, [bills]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter((b) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        b.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.customerName && b.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.customerMobile && b.customerMobile.includes(searchQuery)) ||
        (b.cakeMessage && b.cakeMessage.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.deliveryAddress && b.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase())) ||
        b.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Distributor Route Isolation (Dustbor / Distributor specific)
      if (userSession?.role === 'distributor' && userSession.distributorId) {
        const matchesDist =
          !b.distributorId ||
          b.distributorId === userSession.distributorId ||
          (b.deliveryBoyName && b.deliveryBoyName.toLowerCase() === userSession.userName.toLowerCase());
        if (!matchesDist) return false;
      }

      // Status Filter
      const currentDeliveryStatus = b.deliveryStatus || 'pending';
      if (statusFilter === 'pending' && currentDeliveryStatus !== 'pending' && currentDeliveryStatus !== 'preparing') {
        return false;
      }
      if (statusFilter === 'out_for_delivery' && currentDeliveryStatus !== 'out_for_delivery') {
        return false;
      }
      if (statusFilter === 'delivered' && currentDeliveryStatus !== 'delivered') {
        return false;
      }
      if (statusFilter === 'due' && b.dueAmount <= 0) {
        return false;
      }

      // Date Filter
      if (dateFilter === 'today') {
        const orderDeliveryDate = b.deliveryDate || new Date(b.createdAt).toISOString().slice(0, 10);
        if (orderDeliveryDate !== todayStr) return false;
      } else if (dateFilter === 'upcoming') {
        const orderDeliveryDate = b.deliveryDate || new Date(b.createdAt).toISOString().slice(0, 10);
        if (orderDeliveryDate <= todayStr) return false;
      }

      return true;
    });
  }, [deliveryOrders, searchQuery, statusFilter, dateFilter, todayStr]);

  // Summary Metrics
  const stats = useMemo(() => {
    let pendingCount = 0;
    let outCount = 0;
    let deliveredCount = 0;
    let totalDue = 0;

    deliveryOrders.forEach((b) => {
      const s = b.deliveryStatus || 'pending';
      if (s === 'delivered') deliveredCount++;
      else if (s === 'out_for_delivery') outCount++;
      else pendingCount++;

      if (b.dueAmount > 0) totalDue += b.dueAmount;
    });

    return {
      total: deliveryOrders.length,
      pending: pendingCount,
      outForDelivery: outCount,
      delivered: deliveredCount,
      totalDue
    };
  }, [deliveryOrders]);

  const handleUpdateDeliveryStatus = (bill: Bill, newStatus: 'pending' | 'preparing' | 'out_for_delivery' | 'delivered') => {
    const updated: Bill = {
      ...bill,
      deliveryStatus: newStatus
    };
    saveBill(updated);
    if (onUpdateBill) onUpdateBill(updated);
  };

  const handleCollectPayment = (bill: Bill, method: 'Cash' | 'UPI') => {
    const updated: Bill = {
      ...bill,
      advancePaid: bill.grandTotal,
      dueAmount: 0,
      status: 'paid',
      paymentMethod: method,
      notes: `${bill.notes || ''} [Paid via ${method} on delivery]`.trim()
    };
    saveBill(updated);
    if (onUpdateBill) onUpdateBill(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-[#4b1d3f] rounded-3xl p-6 text-white shadow-xl border border-emerald-700/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center shadow-lg shrink-0">
              <Truck className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-black uppercase tracking-wider">
                  Distributor & Delivery Partner Hub
                </span>
                <span className="text-xs text-amber-300 font-bold">Shop Origin Pin (Mansuka, Ghatal)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                {lang === 'bn' ? 'ডেলিভারি ও ডিস্ট্রিবিউটর ড্যাশবোর্ড' : 'Delivery & Distributor Dashboard'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-xl">
                {lang === 'bn'
                  ? 'কেক ডেলিভারি রুট, কাস্টমার কল/হোয়াটসঅ্যাপ, ক্যাশ কালেকশন ও স্ট্যাটাস ট্র্যাকিং।'
                  : 'Track cake dispatches, navigate Ghatal drop routes, collect cash/UPI & update customer statuses.'}
              </p>
              {userSession?.role === 'distributor' && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/30 border border-emerald-400/40 rounded-xl text-xs text-white font-bold">
                  <Navigation className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {lang === 'bn'
                      ? `🚚 রুট: ${userSession.distributorCode || 'D1'} - ${userSession.distributorName || 'ডিস্ট্রিবিউটর'} • ড্রাইভার: ${userSession.userName}`
                      : `🚚 Route: ${userSession.distributorCode || 'D1'} - ${userSession.distributorName || 'Distributor'} • Driver: ${userSession.userName}`}
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase">
                    {lang === 'bn' ? 'শুধুমাত্র আপনার রুট' : 'Your Route'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Route Map Action */}
          {onOpenMap && (
            <button
              onClick={onOpenMap}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
            >
              <Navigation className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ঘাটাল রুট ম্যাপ দেখুন' : 'Open Delivery Map'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Deliveries */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase">{lang === 'bn' ? 'মোট ডেলিভারি' : 'Total Orders'}</span>
            <PackageCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{stats.total}</div>
          <span className="text-[10px] text-slate-400">{lang === 'bn' ? 'অগ্রিম ও ডেলিভারি' : 'Advance & Delivery'}</span>
        </div>

        {/* Pending / Kitchen */}
        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase">{lang === 'bn' ? 'প্রস্তুত হচ্ছে' : 'Preparing'}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 font-mono">{stats.pending}</div>
          <span className="text-[10px] text-amber-700">{lang === 'bn' ? 'কিচেনে বেকিং হচ্ছে' : 'In Bakery Kitchen'}</span>
        </div>

        {/* Out for Delivery */}
        <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase">{lang === 'bn' ? 'ডেলিভারির পথে' : 'On the Way'}</span>
            <Bike className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono">{stats.outForDelivery}</div>
          <span className="text-[10px] text-blue-700">{lang === 'bn' ? 'বাইকে ডিসপ্যাচ করা' : 'Out for delivery'}</span>
        </div>

        {/* Delivered */}
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase">{lang === 'bn' ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 font-mono">{stats.delivered}</div>
          <span className="text-[10px] text-emerald-700">{lang === 'bn' ? 'সফল ডেলিভারি' : 'Completed drops'}</span>
        </div>

        {/* Total Cash Collection Due */}
        <div className="col-span-2 sm:col-span-1 bg-rose-50/70 rounded-2xl p-4 border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase">{lang === 'bn' ? 'বাকি আদায়' : 'Collection Due'}</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900 font-mono">₹{stats.totalDue.toFixed(0)}</div>
          <span className="text-[10px] text-rose-700">{lang === 'bn' ? 'ক্যাশ/ইউপিআই কালেকশন' : 'To collect on drop'}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'গ্রাহকের নাম, ফোন, ঠিকানা (ঘাটাল, মানসুকা), বা কেকের মেসেজ খুঁজুন...'
                  : 'Search by Customer Name, Phone, Drop Location (Ghatal, Mansuka), or Cake Message...'
              }
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'সকল তারিখ' : 'All Dates'}
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dateFilter === 'today' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'আজকের ডেলিভারি' : "Today's Drops"}
            </button>
            <button
              onClick={() => setDateFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                dateFilter === 'upcoming' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'পরবর্তী দিনসমূহ' : 'Upcoming'}
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1 no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#4b1d3f] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Orders ({deliveryOrders.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            ⏳ Preparing ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('out_for_delivery')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'out_for_delivery'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            🛵 Out for Delivery ({stats.outForDelivery})
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            ✅ Delivered ({stats.delivered})
          </button>
          <button
            onClick={() => setStatusFilter('due')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'due'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            💰 Payment Due Only
          </button>
        </div>
      </div>

      {/* Orders List / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Truck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700">
            {lang === 'bn' ? 'কোন ডেলিভারি অর্ডার পাওয়া যায়নি' : 'No Delivery Orders Found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {lang === 'bn'
              ? 'কাউন্টার থেকে হোম ডেলিভারি বা অগ্রিম বুকিং অর্ডার তৈরি হলে এখানে সরাসরি দেখা যাবে।'
              : 'When home delivery or advance bookings are placed at the counter, they appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((bill) => {
            const currentStatus = bill.deliveryStatus || 'pending';
            const customerPhone = bill.customerMobile || '';
            const dropAddress = bill.deliveryAddress || config.addressLine1 || 'Mansuka, Ghatal';
            const mapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=22.7157,87.7329&destination=${encodeURIComponent(
              dropAddress + ' Ghatal'
            )}`;

            const whatsappMessage = encodeURIComponent(
              `🎂 Hello ${bill.customerName || 'Customer'}! Greetings from DELICIOUS CAKE CORNER.\nYour fresh 100% Eggless cake (Order ${bill.billNo}) is ${
                currentStatus === 'out_for_delivery' ? '🛵 OUT FOR DELIVERY' : 'being prepared fresh'
              }.\nTotal: ₹${bill.grandTotal} | Due: ₹${bill.dueAmount}.\nLocation: ${dropAddress}.\nDriver / Shop Phone: ${config.phone || '7866971421'}.`
            );

            return (
              <div
                key={bill.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Card Top */}
                <div className="p-4 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#4b1d3f]">{bill.billNo}</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            currentStatus === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : currentStatus === 'out_for_delivery'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {currentStatus === 'delivered'
                            ? '✅ Delivered'
                            : currentStatus === 'out_for_delivery'
                            ? '🛵 On The Way'
                            : '⏳ Preparing'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {bill.deliveryDate
                            ? new Date(bill.deliveryDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short'
                              })
                            : 'Today'}
                          {bill.deliveryTime ? ` • ${bill.deliveryTime}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Due */}
                    <div className="text-right">
                      <div className="font-mono font-black text-base text-slate-900">₹{bill.grandTotal}</div>
                      {bill.dueAmount > 0 ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          Due: ₹{bill.dueAmount}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Paid in Full
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs">
                        {bill.customerName || 'Walk-in Delivery Customer'}
                      </div>
                      <span className="font-mono text-slate-600 text-xs font-semibold">{customerPhone}</span>
                    </div>

                    {/* Address & Landmark */}
                    <div className="text-xs text-slate-600 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="font-medium line-clamp-2">{dropAddress}</span>
                    </div>

                    {/* Quick Call & WhatsApp Buttons */}
                    {customerPhone && (
                      <div className="pt-1 flex items-center gap-2">
                        <a
                          href={`tel:${customerPhone}`}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Phone className="w-3 h-3 text-blue-600" />
                          <span>Call</span>
                        </a>

                        <a
                          href={`https://wa.me/91${customerPhone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <MessageCircle className="w-3 h-3 text-white" />
                          <span>WhatsApp</span>
                        </a>

                        <a
                          href={mapsNavUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                          title="Navigate from Bakery on Google Maps"
                        >
                          <Navigation className="w-3 h-3 text-indigo-600" />
                          <span>Route</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Cake Items & Message */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Cake & Goodies:</div>
                    {bill.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                        <span className="font-semibold truncate">
                          {item.name} {item.weightOrSize ? `(${item.weightOrSize})` : ''}
                        </span>
                        <span className="font-mono text-slate-500 shrink-0 ml-2">x{item.qty}</span>
                      </div>
                    ))}
                    {bill.cakeMessage && (
                      <div className="mt-1.5 p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-xs font-medium text-amber-900 italic">
                        Message: "{bill.cakeMessage}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Status Switcher & Cash Collection */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                  {/* Status Toggle Row */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateDeliveryStatus(bill, 'preparing')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        currentStatus === 'preparing' || currentStatus === 'pending'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ⏳ Preparing
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateDeliveryStatus(bill, 'out_for_delivery')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        currentStatus === 'out_for_delivery'
                          ? 'bg-blue-600 text-white shadow-xs animate-pulse'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      🛵 Out
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateDeliveryStatus(bill, 'delivered')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        currentStatus === 'delivered'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ✅ Delivered
                    </button>
                  </div>

                  {/* Due Payment Collect Action */}
                  {bill.dueAmount > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                      <span className="text-[11px] font-bold text-rose-700 whitespace-nowrap">Collect:</span>
                      <button
                        type="button"
                        onClick={() => handleCollectPayment(bill, 'Cash')}
                        className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition-colors shadow-2xs"
                      >
                        Cash ₹{bill.dueAmount}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCollectPayment(bill, 'UPI')}
                        className="flex-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold transition-colors shadow-2xs"
                      >
                        UPI ₹{bill.dueAmount}
                      </button>
                    </div>
                  )}

                  {/* Print Slip Button */}
                  {onPrintDeliverySlip && (
                    <button
                      type="button"
                      onClick={() => onPrintDeliverySlip(bill)}
                      className="w-full py-1 text-[11px] text-slate-500 hover:text-slate-900 font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print Delivery Slip</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
