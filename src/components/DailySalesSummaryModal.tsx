import React, { useState, useMemo } from 'react';
import { Bill, ShopConfig, Language } from '../types';
import { getTaxLiabilityReport, getMonthlySalesSummary } from '../utils/storage';
import { getT } from '../translations';
import {
  X,
  Calendar,
  IndianRupee,
  Receipt,
  TrendingUp,
  Award,
  Wallet,
  Smartphone,
  CreditCard,
  AlertCircle,
  Share2,
  Printer,
  Download,
  Store,
  Clock,
  Sparkles,
  Percent,
  CheckCircle2,
  Landmark,
  FileSpreadsheet,
  CalendarRange,
  Search,
  Building2,
  Info,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowUpRight,
  Copy,
  Check,
  Laptop
} from 'lucide-react';


interface DailySalesSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  config: ShopConfig;
  lang: Language;
}

export const DailySalesSummaryModal: React.FC<DailySalesSummaryModalProps> = ({
  isOpen,
  onClose,
  bills,
  config,
  lang
}) => {
  const t = getT(lang);

  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getStartOfMonthStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const todayStr = getTodayStr();
  const yesterdayStr = getPastDateStr(1);

  // Date filtering state: single date or date range
  const [isRangeMode, setIsRangeMode] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'tax' | 'items' | 'counters'>('overview');
  const [taxSearchTerm, setTaxSearchTerm] = useState<string>('');

  // Monthly Sales Report filtering state
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [monthlySearchTerm, setMonthlySearchTerm] = useState<string>('');
  const [hoveredTrendDay, setHoveredTrendDay] = useState<number | null>(null);

  const monthOptions = useMemo(() => [
    { value: 1, labelEn: 'January', labelBn: 'জানুয়ারি', shortEn: 'Jan', shortBn: 'জানু' },
    { value: 2, labelEn: 'February', labelBn: 'ফেব্রুয়ারি', shortEn: 'Feb', shortBn: 'ফেব্রু' },
    { value: 3, labelEn: 'March', labelBn: 'মার্চ', shortEn: 'Mar', shortBn: 'মার্চ' },
    { value: 4, labelEn: 'April', labelBn: 'এপ্রিল', shortEn: 'Apr', shortBn: 'এপ্রিল' },
    { value: 5, labelEn: 'May', labelBn: 'মে', shortEn: 'May', shortBn: 'মে' },
    { value: 6, labelEn: 'June', labelBn: 'জুন', shortEn: 'Jun', shortBn: 'জুন' },
    { value: 7, labelEn: 'July', labelBn: 'জুলাই', shortEn: 'Jul', shortBn: 'জুলাই' },
    { value: 8, labelEn: 'August', labelBn: 'আগস্ট', shortEn: 'Aug', shortBn: 'আগস্ট' },
    { value: 9, labelEn: 'September', labelBn: 'সেপ্টেম্বর', shortEn: 'Sep', shortBn: 'সেপ্টে' },
    { value: 10, labelEn: 'October', labelBn: 'অক্টোবর', shortEn: 'Oct', shortBn: 'অক্টো' },
    { value: 11, labelEn: 'November', labelBn: 'নভেম্বর', shortEn: 'Nov', shortBn: 'নভে' },
    { value: 12, labelEn: 'December', labelBn: 'ডিসেম্বর', shortEn: 'Dec', shortBn: 'ডিসে' },
  ], []);

  const availableYears = useMemo(() => {
    const yrSet = new Set<number>([currentYearNum - 1, currentYearNum, currentYearNum + 1]);
    bills.forEach((b) => {
      const d = b.date || (typeof b.createdAt === 'string' ? b.createdAt : new Date(b.createdAt).toISOString());
      if (d) {
        const yr = parseInt(d.slice(0, 4), 10);
        if (!isNaN(yr) && yr > 2000) yrSet.add(yr);
      }
    });
    return Array.from(yrSet).sort((a, b) => b - a);
  }, [bills, currentYearNum]);

  const monthlyReport = useMemo(() => {
    return getMonthlySalesSummary(bills, selectedYear, selectedMonth);
  }, [bills, selectedYear, selectedMonth]);

  const monthlyTaxReport = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const startDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    return getTaxLiabilityReport(bills, startDateStr, endDateStr);
  }, [bills, selectedYear, selectedMonth]);

  const [copiedMonthlyTax, setCopiedMonthlyTax] = useState<boolean>(false);

  const handleCopyMonthlyTaxTable = () => {
    const selectedMonthObj = monthOptions.find((m) => m.value === selectedMonth);
    const monthLabel = lang === 'bn' ? selectedMonthObj?.labelBn : selectedMonthObj?.labelEn;
    
    let text = `${config.shopName} — Monthly GST & Tax Breakdown (${monthLabel} ${selectedYear})\n`;
    text += `GSTIN: ${config.gstin || 'Composite Scheme / Unregistered'} | State: 19 (West Bengal)\n`;
    text += `Total Tax Collected: ₹${monthlyTaxReport.totalTaxCollected.toFixed(2)} (CGST: ₹${monthlyTaxReport.totalCgst.toFixed(2)}, SGST: ₹${monthlyTaxReport.totalSgst.toFixed(2)})\n`;
    text += `Taxable Turnover: ₹${monthlyTaxReport.totalTaxableAmount.toFixed(2)} | Effective Rate: ${monthlyTaxReport.effectiveTaxRate}%\n\n`;
    text += `Rate Slab\tInvoices\tTaxable Value (₹)\tCGST (₹)\tSGST (₹)\tTotal Tax (₹)\tTax Share\n`;
    
    monthlyTaxReport.slabs.forEach((s) => {
      const share = monthlyTaxReport.totalTaxCollected > 0 ? ((s.totalTax / monthlyTaxReport.totalTaxCollected) * 100).toFixed(1) : '0.0';
      text += `${s.rate}%\t${s.billsCount}\t${s.taxableAmount.toFixed(2)}\t${s.cgstAmount.toFixed(2)}\t${s.sgstAmount.toFixed(2)}\t${s.totalTax.toFixed(2)}\t${share}%\n`;
    });
    
    text += `TOTAL\t${monthlyReport.totalOrders}\t${monthlyTaxReport.totalTaxableAmount.toFixed(2)}\t${monthlyTaxReport.totalCgst.toFixed(2)}\t${monthlyTaxReport.totalSgst.toFixed(2)}\t${monthlyTaxReport.totalTaxCollected.toFixed(2)}\t100%\n`;
    
    navigator.clipboard.writeText(text);
    setCopiedMonthlyTax(true);
    setTimeout(() => setCopiedMonthlyTax(false), 3000);
  };

  const filteredMonthlyProducts = useMemo(() => {
    if (!monthlySearchTerm.trim()) return monthlyReport.bestSellingProducts;
    const q = monthlySearchTerm.toLowerCase();
    return monthlyReport.bestSellingProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [monthlyReport.bestSellingProducts, monthlySearchTerm]);

  // Resolve effective start and end dates
  const effectiveStartDate = isRangeMode ? startDate : selectedDate;
  const effectiveEndDate = isRangeMode ? endDate : selectedDate;

  // Filter bills in the selected date or range
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const billDate = (b.date || new Date(b.createdAt).toISOString()).slice(0, 10);
      return billDate >= effectiveStartDate && billDate <= effectiveEndDate;
    });
  }, [bills, effectiveStartDate, effectiveEndDate]);

  // Aggregate sales summary metrics for the filtered bills
  const totalRevenue = filteredBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const cashSales = filteredBills
    .filter((b) => b.paymentMethod === 'Cash')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const upiSales = filteredBills
    .filter((b) => b.paymentMethod === 'UPI')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const cardSales = filteredBills
    .filter((b) => b.paymentMethod === 'Card')
    .reduce((sum, b) => sum + (b.advancePaid > 0 ? b.advancePaid : b.grandTotal), 0);
  const dueAmount = filteredBills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);
  const totalDiscount = filteredBills.reduce((sum, b) => sum + ((b.discountAmount || 0) + (b.loyaltyDiscountAmount || 0)), 0);
  const totalOrders = filteredBills.length;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const counterOrders = filteredBills.filter((b) => b.orderType === 'counter').length;
  const advanceOrders = filteredBills.filter((b) => b.orderType === 'advance_booking').length;
  const deliveryOrders = filteredBills.filter((b) => b.orderType === 'delivery').length;

  // Popular items
  const popularItems = useMemo(() => {
    const itemMap = new Map<string, { qty: number; revenue: number }>();
    filteredBills.forEach((b) => {
      (b.items || []).forEach((item) => {
        const current = itemMap.get(item.name) || { qty: 0, revenue: 0 };
        itemMap.set(item.name, {
          qty: current.qty + item.qty,
          revenue: current.revenue + item.total
        });
      });
    });
    return Array.from(itemMap.entries())
      .map(([name, data]) => ({
        name,
        qty: data.qty,
        totalRevenue: data.revenue
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [filteredBills]);

  // Counter wise breakdown
  const counterWiseSales = useMemo(() => {
    const counterMap = new Map<string, { count: number; revenue: number }>();
    filteredBills.forEach((b) => {
      const cName = b.counterName || 'Main Counter';
      const current = counterMap.get(cName) || { count: 0, revenue: 0 };
      counterMap.set(cName, {
        count: current.count + 1,
        revenue: current.revenue + (b.grandTotal || 0)
      });
    });
    return Array.from(counterMap.entries()).map(([counterName, data]) => ({
      counterName,
      ordersCount: data.count,
      revenue: data.revenue
    }));
  }, [filteredBills]);

  // System terminal-wise breakdown (Multiple System Sales)
  const terminalWiseSales = useMemo(() => {
    const terminalMap = new Map<string, { id: string; count: number; revenue: number }>();
    filteredBills.forEach((b) => {
      const tName = b.terminalName || b.counterName || 'System 1 (Front Counter)';
      const tId = b.terminalId || 'system-1';
      const current = terminalMap.get(tName) || { id: tId, count: 0, revenue: 0 };
      terminalMap.set(tName, {
        id: tId,
        count: current.count + 1,
        revenue: current.revenue + (b.grandTotal || 0)
      });
    });
    return Array.from(terminalMap.entries()).map(([terminalName, data]) => ({
      terminalId: data.id,
      terminalName,
      ordersCount: data.count,
      revenue: data.revenue
    }));
  }, [filteredBills]);

  // Tax Liability Report calculation using helper
  const taxReport = useMemo(() => {
    return getTaxLiabilityReport(bills, effectiveStartDate, effectiveEndDate);
  }, [bills, effectiveStartDate, effectiveEndDate]);

  // Filter bills in Tax Ledger table by search query
  const searchedTaxBills = useMemo(() => {
    if (!taxSearchTerm.trim()) return filteredBills;
    const q = taxSearchTerm.toLowerCase();
    return filteredBills.filter(
      (b) =>
        b.billNo.toLowerCase().includes(q) ||
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.customerMobile && b.customerMobile.includes(q))
    );
  }, [filteredBills, taxSearchTerm]);

  // Format date display label
  const formatDateDisplay = () => {
    if (!isRangeMode || effectiveStartDate === effectiveEndDate) {
      if (effectiveStartDate === todayStr) {
        return lang === 'bn' ? `আজ (${effectiveStartDate})` : `Today (${effectiveStartDate})`;
      }
      if (effectiveStartDate === yesterdayStr) {
        return lang === 'bn' ? `গতকাল (${effectiveStartDate})` : `Yesterday (${effectiveStartDate})`;
      }
      return effectiveStartDate;
    }
    return `${effectiveStartDate} ${lang === 'bn' ? 'থেকে' : 'to'} ${effectiveEndDate}`;
  };

  // Preset handlers for date range
  const handleSetToday = () => {
    if (isRangeMode) {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else {
      setSelectedDate(todayStr);
    }
  };

  const handleSetYesterday = () => {
    if (isRangeMode) {
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else {
      setSelectedDate(yesterdayStr);
    }
  };

  const handleSetLast7Days = () => {
    setIsRangeMode(true);
    setStartDate(getPastDateStr(6));
    setEndDate(todayStr);
  };

  const handleSetThisMonth = () => {
    setIsRangeMode(true);
    setStartDate(getStartOfMonthStr());
    setEndDate(todayStr);
  };

  // WhatsApp general daily closing report
  const handleShareDailyReportWhatsApp = () => {
    const lines: string[] = [
      `📊 *${config.shopName}* — বিক্রয় ও ক্লোজিং রিপোর্ট`,
      `📅 *সময়কাল:* ${formatDateDisplay()}`,
      `🏢 *দোকান:* ${config.addressLine1}, ${config.district}`,
      `📞 *যোগাযোগ:* ${config.phone}`,
      `---------------------------------`,
      `💰 *মোট বিক্রয় (Total Sales):* ₹${totalRevenue.toFixed(2)}`,
      `🧾 *মোট বিল সংখ্যা (Orders):* ${totalOrders}`,
      `📈 *গড় বিল (AOV):* ₹${averageOrderValue}`,
      `🏛️ *মোট সংগৃহীত ট্যাক্স (GST):* ₹${taxReport.totalTaxCollected.toFixed(2)} (CGST ₹${taxReport.totalCgst.toFixed(2)} + SGST ₹${taxReport.totalSgst.toFixed(2)})`,
      `---------------------------------`,
      `💳 *পেমেন্ট বিভাজন (Payment Breakup):*`,
      `  • 💵 নগদ (Cash): ₹${cashSales.toFixed(2)}`,
      `  • 📱 অনলাইন/UPI: ₹${upiSales.toFixed(2)}`,
      `  • 💳 কার্ড (Card): ₹${cardSales.toFixed(2)}`,
      dueAmount > 0 ? `  • ⏳ বাকি পাওনা (Due): ₹${dueAmount.toFixed(2)}` : null,
      totalDiscount > 0 ? `  • 🏷️ মোট ছাড় (Discounts): ₹${totalDiscount.toFixed(2)}` : null,
      `---------------------------------`,
      `🎂 *শীর্ষ জনপ্রিয় কেক ও আইটেম (Top Items):*`
    ].filter(Boolean) as string[];

    if (popularItems.length === 0) {
      lines.push('  (কোনো বিক্রি রেকর্ড নেই)');
    } else {
      popularItems.slice(0, 5).forEach((item, idx) => {
        lines.push(`  ${idx + 1}. *${item.name}* — ${item.qty} Pcs/lbs (₹${item.totalRevenue})`);
      });
    }

    lines.push(`---------------------------------`);
    lines.push(`✨ *রিপোর্ট জেনারেট হয়েছে:* ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);

    const text = lines.join('\n');
    const rawPhone = (config.phone || '7866971421').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('91') && rawPhone.length === 12 ? rawPhone : `91${rawPhone}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // WhatsApp Tax Liability specific share
  const handleShareTaxReportWhatsApp = () => {
    const lines: string[] = [
      `🏛️ *${config.shopName}* — জিএসটি ট্যাক্স লায়াবিলিটি রিপোর্ট`,
      `📅 *সময়কাল:* ${formatDateDisplay()}`,
      `🏢 *GSTIN:* ${config.gstin || 'Composition Scheme / Not Registered'}`,
      `📍 *ঠিকানা:* ${config.addressLine1}, ${config.district}, WB`,
      `---------------------------------`,
      `💰 *মোট গ্রস সেলস (Gross Sales):* ₹${taxReport.totalGrossSales.toFixed(2)}`,
      `📑 *করযোগ্য মোট বিক্রি (Taxable Turnover):* ₹${taxReport.totalTaxableAmount.toFixed(2)}`,
      `💵 *মোট সংগৃহীত ট্যাক্স (Total GST):* ₹${taxReport.totalTaxCollected.toFixed(2)}`,
      `  • সিজিএসটি (CGST 50%): ₹${taxReport.totalCgst.toFixed(2)}`,
      `  • এসজিএসটি (SGST 50%): ₹${taxReport.totalSgst.toFixed(2)}`,
      `📊 *কার্যকরী ট্যাক্স হার (Effective Rate):* ${taxReport.effectiveTaxRate}%`,
      `---------------------------------`,
      `📊 *জিএসটি স্ল্যাব বিবরণী (GST Slabs):*`
    ];

    if (taxReport.slabs.length === 0) {
      lines.push('  (কোনো ট্যাক্স ইনভয়েস নেই)');
    } else {
      taxReport.slabs.forEach((s) => {
        lines.push(`  • *${s.rate}% Slab:* ${s.billsCount} বিল | করযোগ্য ₹${s.taxableAmount.toFixed(2)} | ট্যাক্স ₹${s.totalTax.toFixed(2)} (CGST ₹${s.cgstAmount.toFixed(2)} + SGST ₹${s.sgstAmount.toFixed(2)})`);
      });
    }

    lines.push(`---------------------------------`);
    lines.push(`🧾 *ট্যাক্স ইনভয়েস:* ${taxReport.taxableBillsCount} টি করযুক্ত | ${taxReport.exemptBillsCount} টি করমুক্ত`);
    lines.push(`✨ *রিপোর্ট সময়:* ${new Date().toLocaleTimeString('en-IN')}`);

    const text = lines.join('\n');
    const rawPhone = (config.phone || '7866971421').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('91') && rawPhone.length === 12 ? rawPhone : `91${rawPhone}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Print Daily / Period Sales Summary Slip
  const handlePrintDailySummary = () => {
    const printWindow = window.open('', '_blank', 'width=650,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Sales Summary — ${formatDateDisplay()}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; max-width: 480px; margin: 0 auto; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 2px solid #000; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th, td { padding: 4px 0; font-size: 12px; }
          th { text-align: left; border-bottom: 1px solid #000; }
          h2 { margin: 4px 0; font-size: 18px; }
          p { margin: 2px 0; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2>${config.shopName}</h2>
          <p>${config.addressLine1}, ${config.district}</p>
          <p>Phone: ${config.phone} | GSTIN: ${config.gstin || 'N/A'}</p>
          <div class="double-divider"></div>
          <h3 style="margin: 4px 0;">SALES REGISTER CLOSING</h3>
          <p class="bold">Period: ${formatDateDisplay()}</p>
        </div>
        <div class="divider"></div>

        <div class="flex"><span class="bold">TOTAL REVENUE:</span><span class="bold">Rs. ${totalRevenue.toFixed(2)}</span></div>
        <div class="flex"><span>Total Bills Count:</span><span>${totalOrders}</span></div>
        <div class="flex"><span>Average Order Value:</span><span>Rs. ${averageOrderValue}</span></div>
        <div class="divider"></div>

        <p class="bold">PAYMENT BREAKDOWN:</p>
        <div class="flex"><span>Cash Collected:</span><span>Rs. ${cashSales.toFixed(2)}</span></div>
        <div class="flex"><span>UPI / Online:</span><span>Rs. ${upiSales.toFixed(2)}</span></div>
        <div class="flex"><span>Card:</span><span>Rs. ${cardSales.toFixed(2)}</span></div>
        ${dueAmount > 0 ? `<div class="flex"><span>Pending Due Balance:</span><span>Rs. ${dueAmount.toFixed(2)}</span></div>` : ''}
        ${totalDiscount > 0 ? `<div class="flex"><span>Total Discounts:</span><span>Rs. ${totalDiscount.toFixed(2)}</span></div>` : ''}
        <div class="divider"></div>

        <p class="bold">TAX LIABILITY (GST):</p>
        <div class="flex"><span>Total Tax Collected:</span><span>Rs. ${taxReport.totalTaxCollected.toFixed(2)}</span></div>
        <div class="flex"><span>CGST (Central 50%):</span><span>Rs. ${taxReport.totalCgst.toFixed(2)}</span></div>
        <div class="flex"><span>SGST (State 50%):</span><span>Rs. ${taxReport.totalSgst.toFixed(2)}</span></div>
        <div class="flex"><span>Taxable Turnover:</span><span>Rs. ${taxReport.totalTaxableAmount.toFixed(2)}</span></div>
        <div class="divider"></div>

        <p class="bold">POPULAR ITEMS SOLD:</p>
        <table>
          <thead>
            <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Amount</th></tr>
          </thead>
          <tbody>
            ${popularItems
              .map(
                (item) => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:right;">Rs. ${item.totalRevenue}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="double-divider"></div>
        <div class="text-center" style="margin-top: 15px;">
          <p style="font-size: 11px;">Verified & Closed By</p>
          <div style="margin-top: 35px; border-top: 1px dotted #000; display: inline-block; width: 180px;"></div>
          <p class="bold" style="font-size: 11px;">${config.signatoryName || 'Sumona Mondal Kunti'}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Print dedicated Tax Liability Report Sheet
  const handlePrintTaxReport = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>GST Tax Liability Report — ${formatDateDisplay()}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 720px; margin: 0 auto; line-height: 1.4; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px solid #cbd5e1; margin: 12px 0; }
          .double-divider { border-top: 2px solid #4b1d3f; margin: 14px 0; }
          .flex { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { padding: 6px 8px; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: 700; text-align: left; }
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
          .kpi-val { font-size: 16px; font-weight: 800; color: #4b1d3f; margin-top: 4px; }
          h2 { margin: 2px 0; color: #4b1d3f; font-size: 20px; }
          p { margin: 2px 0; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2>${config.shopName}</h2>
          <p>${config.addressLine1}, ${config.district}, West Bengal • Phone: ${config.phone}</p>
          <p class="bold" style="color: #0f172a;">GSTIN: ${config.gstin || 'Composition Scheme / Not Registered'}</p>
          <div class="double-divider"></div>
          <h3 style="margin: 4px 0; color: #0f172a;">GST TAX LIABILITY & SUMMARY STATEMENT</h3>
          <p class="bold" style="color: #4b1d3f;">Period: ${formatDateDisplay()}</p>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <span style="font-size: 11px; color: #64748b;">Total Tax Collected (GST)</span>
            <div class="kpi-val">Rs. ${taxReport.totalTaxCollected.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <span style="font-size: 11px; color: #64748b;">CGST (Central 50%)</span>
            <div class="kpi-val">Rs. ${taxReport.totalCgst.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <span style="font-size: 11px; color: #64748b;">SGST (State 50%)</span>
            <div class="kpi-val">Rs. ${taxReport.totalSgst.toFixed(2)}</div>
          </div>
        </div>

        <div class="flex" style="font-size: 13px; margin: 8px 0;">
          <span><strong>Total Gross Sales:</strong> Rs. ${taxReport.totalGrossSales.toFixed(2)}</span>
          <span><strong>Taxable Turnover:</strong> Rs. ${taxReport.totalTaxableAmount.toFixed(2)}</span>
          <span><strong>Effective Rate:</strong> ${taxReport.effectiveTaxRate}%</span>
        </div>

        <div class="divider"></div>
        <h4 style="margin: 8px 0 4px 0; color: #0f172a;">GST RATE SLABS SUMMARY</h4>
        <table>
          <thead>
            <tr>
              <th>GST Slab Rate</th>
              <th class="text-right">Invoices</th>
              <th class="text-right">Taxable Turnover</th>
              <th class="text-right">CGST (Rs.)</th>
              <th class="text-right">SGST (Rs.)</th>
              <th class="text-right">Total GST (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${taxReport.slabs
              .map(
                (s) => `
              <tr>
                <td><strong>${s.rate}% Slab</strong> ${s.rate === 0 ? '(Exempt/Nil)' : s.rate === 5 ? '(Bakery Standard)' : ''}</td>
                <td class="text-right">${s.billsCount}</td>
                <td class="text-right">Rs. ${s.taxableAmount.toFixed(2)}</td>
                <td class="text-right">Rs. ${s.cgstAmount.toFixed(2)}</td>
                <td class="text-right">Rs. ${s.sgstAmount.toFixed(2)}</td>
                <td class="text-right"><strong>Rs. ${s.totalTax.toFixed(2)}</strong></td>
              </tr>
            `
              )
              .join('')}
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td>TOTAL</td>
              <td class="text-right">${taxReport.taxableBillsCount + taxReport.exemptBillsCount}</td>
              <td class="text-right">Rs. ${taxReport.totalTaxableAmount.toFixed(2)}</td>
              <td class="text-right">Rs. ${taxReport.totalCgst.toFixed(2)}</td>
              <td class="text-right">Rs. ${taxReport.totalSgst.toFixed(2)}</td>
              <td class="text-right">Rs. ${taxReport.totalTaxCollected.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="divider"></div>
        <h4 style="margin: 8px 0 4px 0; color: #0f172a;">TAX INVOICES REGISTER (${filteredBills.length} Invoices)</h4>
        <table>
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Date</th>
              <th>Customer</th>
              <th class="text-right">Taxable Val</th>
              <th class="text-right">GST %</th>
              <th class="text-right">GST (Rs.)</th>
              <th class="text-right">Total (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBills
              .map(
                (b) => `
              <tr>
                <td><strong>${b.billNo}</strong></td>
                <td>${(b.date || '').slice(0, 10)}</td>
                <td>${b.customerName || 'Walk-in'}</td>
                <td class="text-right">Rs. ${Math.max(0, b.subtotal - (b.discountAmount || 0) - (b.loyaltyDiscountAmount || 0)).toFixed(2)}</td>
                <td class="text-right">${b.taxPercent || 0}%</td>
                <td class="text-right">Rs. ${(b.taxAmount || 0).toFixed(2)}</td>
                <td class="text-right"><strong>Rs. ${b.grandTotal.toFixed(2)}</strong></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="double-divider"></div>
        <div class="flex" style="margin-top: 30px;">
          <div>
            <p style="font-size: 11px;">Report generated on: ${new Date().toLocaleString('en-IN')}</p>
            <p style="font-size: 10px;">Delicious Cake Corner POS System</p>
          </div>
          <div class="text-center">
            <div style="border-top: 1px dotted #000; width: 180px; margin-bottom: 4px;"></div>
            <p class="bold" style="font-size: 11px; color: #0f172a;">${config.signatoryName || 'Sumona Mondal Kunti'}</p>
            <p style="font-size: 10px;">Authorized Signatory</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Export Tax CSV
  const handleExportTaxCsv = () => {
    if (filteredBills.length === 0) {
      alert(lang === 'bn' ? 'কোনো বিল পাওয়া যায়নি।' : 'No bills found for the selected period.');
      return;
    }

    const headers = [
      'Bill No',
      'Date',
      'Customer Name',
      'Mobile',
      'Order Type',
      'Gross Total',
      'Discount',
      'Taxable Value',
      'GST Rate (%)',
      'CGST (Rs.)',
      'SGST (Rs.)',
      'Total Tax Collected (Rs.)',
      'Grand Total (Rs.)',
      'Payment Mode',
      'Status'
    ];

    const rows = filteredBills.map((b) => {
      const taxable = Math.max(0, b.subtotal - (b.discountAmount || 0) - (b.loyaltyDiscountAmount || 0));
      const tax = b.taxAmount || 0;
      const cgst = tax / 2;
      const sgst = tax / 2;
      return [
        `"${b.billNo}"`,
        `"${(b.date || new Date(b.createdAt).toISOString()).slice(0, 10)}"`,
        `"${(b.customerName || '').replace(/"/g, '""')}"`,
        `"${b.customerMobile || ''}"`,
        b.orderType,
        b.subtotal.toFixed(2),
        ((b.discountAmount || 0) + (b.loyaltyDiscountAmount || 0)).toFixed(2),
        taxable.toFixed(2),
        b.taxPercent || 0,
        cgst.toFixed(2),
        sgst.toFixed(2),
        tax.toFixed(2),
        b.grandTotal.toFixed(2),
        b.paymentMethod,
        b.status
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DCC_Tax_Liability_Report_${effectiveStartDate}_to_${effectiveEndDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Daily / Period Sales CSV
  const handleExportDailyCsv = () => {
    if (filteredBills.length === 0) {
      alert(lang === 'bn' ? 'এই তারিখে কোনো বিল নেই।' : 'No bills found for this date/period.');
      return;
    }

    const headers = [
      'Bill No',
      'Date & Time',
      'Customer Name',
      'Mobile',
      'Order Type',
      'Counter',
      'Subtotal',
      'Discount',
      'Taxable Value',
      'GST (%)',
      'Total GST (Rs.)',
      'Grand Total',
      'Advance Paid',
      'Due',
      'Payment Mode',
      'Items'
    ];

    const rows = filteredBills.map((b) => {
      const taxable = Math.max(0, b.subtotal - (b.discountAmount || 0) - (b.loyaltyDiscountAmount || 0));
      return [
        b.billNo,
        new Date(b.createdAt).toLocaleTimeString('en-IN'),
        `"${b.customerName || ''}"`,
        b.customerMobile || '',
        b.orderType,
        `"${b.counterName || ''}"`,
        b.subtotal,
        b.discountAmount || 0,
        taxable.toFixed(2),
        b.taxPercent || 0,
        b.taxAmount || 0,
        b.grandTotal,
        b.advancePaid,
        b.dueAmount,
        b.paymentMethod,
        `"${(b.items || []).map((i) => `${i.name} (x${i.qty})`).join('; ')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DCC_Sales_Summary_${effectiveStartDate}_to_${effectiveEndDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleSetCurrentMonth = () => {
    setSelectedMonth(currentMonthNum);
    setSelectedYear(currentYearNum);
  };

  // WhatsApp Monthly Sales Report
  const handleShareMonthlyWhatsApp = () => {
    const selectedMonthObj = monthOptions.find((m) => m.value === selectedMonth);
    const monthLabel = lang === 'bn' ? selectedMonthObj?.labelBn : selectedMonthObj?.labelEn;
    const lines: string[] = [
      `📊 *${config.shopName}* — মাসিক বিক্রয় রিপোর্ট (Monthly Report)`,
      `📅 *সময়কাল / Duration:* ${monthLabel} ${selectedYear}`,
      `🏢 *দোকান:* ${config.addressLine1}, ${config.district}`,
      `📞 *যোগাযোগ:* ${config.phone}`,
      `---------------------------------`,
      `💰 *মাসের মোট বিক্রয় (Monthly Revenue):* ₹${monthlyReport.totalRevenue.toFixed(2)}`,
      `🧾 *মোট বিল / অর্ডার (Orders):* ${monthlyReport.totalOrders}`,
      `📈 *গড় বিল (AOV):* ₹${monthlyReport.averageOrderValue}`,
      `📅 *দৈনিক গড় বিক্রয় (Daily Average):* ₹${monthlyReport.dailyAverageRevenue}`,
      monthlyReport.peakDay
        ? `🔥 *সর্বোচ্চ বিক্রির দিন (Peak Day):* ${monthlyReport.peakDay.date} (₹${monthlyReport.peakDay.revenue.toFixed(2)} - ${monthlyReport.peakDay.ordersCount} বিল)`
        : null,
      `🏛️ *মোট সংগৃহীত ট্যাক্স (GST):* ₹${monthlyReport.totalTaxCollected.toFixed(2)} (Effective Rate: ${monthlyTaxReport.effectiveTaxRate}%)`,
      ...monthlyTaxReport.slabs.map((s) => `  • ${s.rate}% GST Slab: ₹${s.totalTax.toFixed(2)} (Taxable: ₹${s.taxableAmount.toFixed(2)} - ${s.billsCount} বিল)`),
      `---------------------------------`,
      `💳 *পেমেন্ট বিভাজন (Payment Split):*`,
      `  • 💵 নগদ (Cash): ₹${monthlyReport.cashSales.toFixed(2)}`,
      `  • 📱 অনলাইন/UPI: ₹${monthlyReport.upiSales.toFixed(2)}`,
      `  • 💳 কার্ড (Card): ₹${monthlyReport.cardSales.toFixed(2)}`,
      monthlyReport.dueAmount > 0 ? `  • ⏳ বাকি পাওনা (Due): ₹${monthlyReport.dueAmount.toFixed(2)}` : null,
      monthlyReport.totalDiscount > 0 ? `  • 🏷️ মোট ছাড় (Discounts): ₹${monthlyReport.totalDiscount.toFixed(2)}` : null,
      `---------------------------------`,
      `🎂 *মাসের সেরা বিক্রীত কেক ও প্রোডাক্ট (Top Best Sellers):*`
    ].filter(Boolean) as string[];

    if (monthlyReport.bestSellingProducts.length === 0) {
      lines.push('  (কোনো বিক্রি রেকর্ড নেই)');
    } else {
      monthlyReport.bestSellingProducts.slice(0, 5).forEach((item, idx) => {
        lines.push(`  ${idx + 1}. *${item.name}* — ${item.qty} Pcs/lbs (₹${item.totalRevenue})`);
      });
    }

    lines.push(`---------------------------------`);
    lines.push(`✨ *রিপোর্ট জেনারেট:* ${new Date().toLocaleString('en-IN')}`);

    const text = lines.join('\n');
    const rawPhone = (config.phone || '7866971421').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('91') && rawPhone.length === 12 ? rawPhone : `91${rawPhone}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Print Monthly Sales Report
  const handlePrintMonthlyReport = () => {
    const printWindow = window.open('', '_blank', 'width=780,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const selectedMonthObj = monthOptions.find((m) => m.value === selectedMonth);
    const monthLabel = lang === 'bn' ? selectedMonthObj?.labelBn : selectedMonthObj?.labelEn;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Monthly Sales Report — ${monthLabel} ${selectedYear}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 740px; margin: 0 auto; line-height: 1.4; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px solid #cbd5e1; margin: 12px 0; }
          .double-divider { border-top: 2px solid #4b1d3f; margin: 14px 0; }
          .flex { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th, td { padding: 5px 6px; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: 700; text-align: left; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
          .kpi-val { font-size: 15px; font-weight: 800; color: #4b1d3f; margin-top: 4px; }
          h2 { margin: 2px 0; color: #4b1d3f; font-size: 20px; }
          p { margin: 2px 0; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2>${config.shopName}</h2>
          <p>${config.addressLine1}, ${config.district}, West Bengal • Phone: ${config.phone}</p>
          <div class="double-divider"></div>
          <h3 style="margin: 4px 0; color: #0f172a;">MONTHLY SALES & REVENUE REPORT</h3>
          <p class="bold" style="color: #4b1d3f;">Duration: ${monthLabel} ${selectedYear}</p>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <span style="font-size: 10px; color: #64748b;">Monthly Total Sales</span>
            <div class="kpi-val">Rs. ${monthlyReport.totalRevenue.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <span style="font-size: 10px; color: #64748b;">Total Orders</span>
            <div class="kpi-val">${monthlyReport.totalOrders}</div>
          </div>
          <div class="kpi-card">
            <span style="font-size: 10px; color: #64748b;">Daily Average</span>
            <div class="kpi-val">Rs. ${monthlyReport.dailyAverageRevenue}</div>
          </div>
          <div class="kpi-card">
            <span style="font-size: 10px; color: #64748b;">Average Order (AOV)</span>
            <div class="kpi-val">Rs. ${monthlyReport.averageOrderValue}</div>
          </div>
        </div>

        <div class="divider"></div>
        <p class="bold" style="font-size: 12px;">PAYMENT BREAKDOWN:</p>
        <div class="flex" style="font-size: 12px; margin: 4px 0;">
          <span>Cash: Rs. ${monthlyReport.cashSales.toFixed(2)}</span>
          <span>UPI: Rs. ${monthlyReport.upiSales.toFixed(2)}</span>
          <span>Card: Rs. ${monthlyReport.cardSales.toFixed(2)}</span>
          <span>Pending Due: Rs. ${monthlyReport.dueAmount.toFixed(2)}</span>
        </div>
        ${monthlyReport.peakDay ? `<p style="font-size: 12px; margin-top: 6px; color: #b45309;"><strong>Peak Sales Day:</strong> ${monthlyReport.peakDay.date} with Rs. ${monthlyReport.peakDay.revenue.toFixed(2)} (${monthlyReport.peakDay.ordersCount} orders)</p>` : ''}

        <div class="divider"></div>
        <h4 style="margin: 8px 0 4px 0; font-size: 13px; color: #4b1d3f;">MONTHLY TAX SUMMARY BY PERCENTAGE RATE (${monthLabel} ${selectedYear})</h4>
        <p style="font-size: 11px; margin: 2px 0; color: #475569;">GSTIN: ${config.gstin || 'Composite Scheme / Unregistered'} | Jurisdiction: State 19 (WB) | Effective Tax Rate: ${monthlyTaxReport.effectiveTaxRate}%</p>
        <table>
          <thead>
            <tr>
              <th>GST Rate Slab</th>
              <th style="text-align: center;">Invoices</th>
              <th style="text-align: right;">Taxable Base</th>
              <th style="text-align: right;">CGST</th>
              <th style="text-align: right;">SGST</th>
              <th style="text-align: right;">Total Tax</th>
              <th style="text-align: right;">Share</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyTaxReport.slabs.map((s) => `
              <tr>
                <td><strong>${s.rate}% Slab</strong> ${s.rate === 0 ? '(Nil / Exempt)' : s.rate === 5 ? '(Bakery Standard)' : s.rate === 12 ? '(Confectionery)' : s.rate === 18 ? '(Decor/Accessories)' : ''}</td>
                <td style="text-align: center;">${s.billsCount}</td>
                <td style="text-align: right;">Rs. ${s.taxableAmount.toFixed(2)}</td>
                <td style="text-align: right;">Rs. ${s.cgstAmount.toFixed(2)}</td>
                <td style="text-align: right;">Rs. ${s.sgstAmount.toFixed(2)}</td>
                <td style="text-align: right; font-weight: bold; color: #4b1d3f;">Rs. ${s.totalTax.toFixed(2)}</td>
                <td style="text-align: right;">${monthlyTaxReport.totalTaxCollected > 0 ? Math.round((s.totalTax / monthlyTaxReport.totalTaxCollected) * 100) : 0}%</td>
              </tr>
            `).join('')}
            <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
              <td>Total Monthly Tax</td>
              <td style="text-align: center;">${monthlyReport.totalOrders}</td>
              <td style="text-align: right;">Rs. ${monthlyTaxReport.totalTaxableAmount.toFixed(2)}</td>
              <td style="text-align: right;">Rs. ${monthlyTaxReport.totalCgst.toFixed(2)}</td>
              <td style="text-align: right;">Rs. ${monthlyTaxReport.totalSgst.toFixed(2)}</td>
              <td style="text-align: right; color: #4b1d3f;">Rs. ${monthlyTaxReport.totalTaxCollected.toFixed(2)}</td>
              <td style="text-align: right;">100%</td>
            </tr>
          </tbody>
        </table>

        <div class="divider"></div>
        <h4 style="margin: 8px 0 4px 0; font-size: 13px; color: #4b1d3f;">TOP BEST-SELLING PRODUCTS (${monthLabel} ${selectedYear})</h4>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Product / Cake Name</th>
              <th style="text-align: center;">Qty Sold</th>
              <th style="text-align: right;">Total Revenue</th>
              <th style="text-align: right;">Sales Share</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyReport.bestSellingProducts.slice(0, 15).map((p, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td><strong>${p.name}</strong></td>
                <td style="text-align: center;">${p.qty} pcs/lbs</td>
                <td style="text-align: right;">Rs. ${p.totalRevenue.toFixed(2)}</td>
                <td style="text-align: right;">${monthlyReport.totalRevenue > 0 ? Math.round((p.totalRevenue / monthlyReport.totalRevenue) * 100) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider"></div>
        <h4 style="margin: 8px 0 4px 0; font-size: 13px; color: #4b1d3f;">DAILY REVENUE TRENDS (${monthLabel} ${selectedYear})</h4>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 40px;">Day</th>
              <th>Date</th>
              <th style="text-align: center;">Day of Week</th>
              <th style="text-align: center;">Bills Count</th>
              <th style="text-align: right;">Daily Sales</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyReport.dailyTrends.map((d) => `
              <tr style="${d.revenue > 0 ? 'background: #fff;' : 'background: #f8fafc; color: #94a3b8;'}">
                <td style="text-align: center; font-weight: bold;">${d.day}</td>
                <td>${d.date}</td>
                <td style="text-align: center;">${d.dayName}</td>
                <td style="text-align: center;">${d.ordersCount}</td>
                <td style="text-align: right; font-weight: ${d.revenue > 0 ? 'bold' : 'normal'};">Rs. ${d.revenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="double-divider"></div>
        <div class="flex" style="margin-top: 30px;">
          <div>
            <p style="font-size: 11px;">Report generated on: ${new Date().toLocaleString('en-IN')}</p>
            <p style="font-size: 10px;">Delicious Cake Corner POS System</p>
          </div>
          <div class="text-center">
            <div style="border-top: 1px dotted #000; width: 180px; margin-bottom: 4px;"></div>
            <p class="bold" style="font-size: 11px; color: #0f172a;">${config.signatoryName || 'Sumona Mondal Kunti'}</p>
            <p style="font-size: 10px;">Authorized Signatory</p>
          </div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Export Monthly CSV
  const handleExportMonthlyCsv = () => {
    const selectedMonthObj = monthOptions.find((m) => m.value === selectedMonth);
    const monthLabel = selectedMonthObj?.labelEn || `Month_${selectedMonth}`;

    const headersTrends = ['Day', 'Date', 'Day of Week', 'Orders Count', 'Revenue (Rs.)'];
    const rowsTrends: string[][] = monthlyReport.dailyTrends.map((d) => [
      String(d.day),
      d.date,
      d.dayName,
      String(d.ordersCount),
      d.revenue.toFixed(2)
    ]);

    const headersProducts = ['Rank', 'Product Name', 'Quantity Sold', 'Revenue (Rs.)', 'Sales Share (%)'];
    const rowsProducts: string[][] = monthlyReport.bestSellingProducts.map((p, idx) => [
      String(idx + 1),
      `"${p.name.replace(/"/g, '""')}"`,
      String(p.qty),
      p.totalRevenue.toFixed(2),
      monthlyReport.totalRevenue > 0 ? ((p.totalRevenue / monthlyReport.totalRevenue) * 100).toFixed(1) : '0.0'
    ]);

    const maxLen = Math.max(rowsTrends.length, rowsProducts.length);
    const combinedRows: string[][] = [];
    for (let i = 0; i < maxLen; i++) {
      const left = rowsTrends[i] || ['', '', '', '', ''];
      const right = rowsProducts[i] || ['', '', '', '', ''];
      combinedRows.push([...left, '', ...right]);
    }

    
    const taxSummaryRows: string[][] = [
      [''],
      ['"MONTHLY TAX COLLECTION BREAKDOWN BY RATE SLAB"'],
      [`"GSTIN: ${config.gstin || 'Composite Scheme / Unregistered'}"`],
      [`"Total Tax Collected: Rs. ${monthlyTaxReport.totalTaxCollected.toFixed(2)}"`],
      [`"Total Taxable Turnover: Rs. ${monthlyTaxReport.totalTaxableAmount.toFixed(2)}"`],
      [`"Total CGST: Rs. ${monthlyTaxReport.totalCgst.toFixed(2)}"`],
      [`"Total SGST: Rs. ${monthlyTaxReport.totalSgst.toFixed(2)}"`],
      [`"Effective Tax Rate: ${monthlyTaxReport.effectiveTaxRate}%"`],
      [''],
      ['GST Rate Slab', 'Invoices Count', 'Taxable Base (Rs.)', 'CGST (Rs.)', 'SGST (Rs.)', 'Total Tax (Rs.)', 'Tax Share (%)'],
      ...monthlyTaxReport.slabs.map((s) => [
        `"${s.rate}% Slab"`,
        String(s.billsCount),
        s.taxableAmount.toFixed(2),
        s.cgstAmount.toFixed(2),
        s.sgstAmount.toFixed(2),
        s.totalTax.toFixed(2),
        monthlyTaxReport.totalTaxCollected > 0 ? ((s.totalTax / monthlyTaxReport.totalTaxCollected) * 100).toFixed(1) : '0.0'
      ]),
      ['TOTAL', String(monthlyReport.totalOrders), monthlyTaxReport.totalTaxableAmount.toFixed(2), monthlyTaxReport.totalCgst.toFixed(2), monthlyTaxReport.totalSgst.toFixed(2), monthlyTaxReport.totalTaxCollected.toFixed(2), '100%'],
      ['']
    ];
const csvContent = [
      `"MONTHLY SALES REPORT - ${monthLabel} ${selectedYear}"`,
      ...taxSummaryRows.map((r) => r.join(',')),
      `"Total Monthly Revenue: Rs. ${monthlyReport.totalRevenue.toFixed(2)}"`,
      `"Total Orders: ${monthlyReport.totalOrders}"`,
      `"Daily Average: Rs. ${monthlyReport.dailyAverageRevenue}"`,
      '',
      ['Day', 'Date', 'Day of Week', 'Orders Count', 'Daily Sales (Rs.)', '', 'Rank', 'Best Selling Product', 'Qty Sold', 'Revenue (Rs.)', 'Share (%)'].join(','),
      ...combinedRows.map((r) => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DCC_Monthly_Sales_Report_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">

      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#4b1d3f] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                {t.dailySummary}
              </h3>
              <p className="text-xs text-amber-100/80">
                {formatDateDisplay()} • {config.shopName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Selector & Mode Switcher Toolbar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Mode toggle & Date inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Single Date vs Range Toggle */}
            <div className="p-0.5 bg-slate-200 rounded-xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsRangeMode(false)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  !isRangeMode
                    ? 'bg-white text-[#4b1d3f] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.singleDate}
              </button>
              <button
                type="button"
                onClick={() => setIsRangeMode(true)}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  isRangeMode
                    ? 'bg-white text-[#4b1d3f] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3 h-3" />
                <span>{t.dateRange}</span>
              </button>
            </div>

            {/* Date Pickers */}
            {!isRangeMode ? (
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-2xs">
                <Calendar className="w-4 h-4 text-[#4b1d3f]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-1 rounded-xl text-xs font-semibold shadow-2xs">
                <Calendar className="w-4 h-4 text-[#4b1d3f]" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer w-28"
                  title="Start Date"
                />
                <span className="text-slate-400 font-bold">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer w-28"
                  title="End Date"
                />
              </div>
            )}

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {lang === 'bn' ? 'আজ' : 'Today'}
              </button>

              <button
                type="button"
                onClick={handleSetYesterday}
                className="px-2 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {lang === 'bn' ? 'গতকাল' : 'Yesterday'}
              </button>

              <button
                type="button"
                onClick={handleSetLast7Days}
                className="px-2 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {lang === 'bn' ? '৭ দিন' : '7 Days'}
              </button>

              <button
                type="button"
                onClick={handleSetThisMonth}
                className="px-2 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {lang === 'bn' ? 'এই মাস' : 'This Month'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShareDailyReportWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
              title="Share Closing Summary via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ রিপোর্ট' : 'WhatsApp Report'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintDailySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
              title="Print Daily / Period Closing Slip"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'প্রিন্ট স্লিপ' : 'Print Slip'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportDailyCsv}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-2 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#4b1d3f] text-[#4b1d3f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'বিক্রয় ওভারভিউ' : 'Sales Overview'}</span>
          </button>

          {/* Dedicated Monthly Sales Report Tab */}
          <button
            onClick={() => setActiveTab('monthly')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'border-[#4b1d3f] text-[#4b1d3f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t.monthlyReport}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold">
              {monthOptions.find((m) => m.value === selectedMonth)?.[lang === 'bn' ? 'shortBn' : 'shortEn']} {selectedYear}
            </span>
          </button>

          {/* Dedicated Tax Liability Tab */}
          <button
            onClick={() => setActiveTab('tax')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tax'
                ? 'border-[#4b1d3f] text-[#4b1d3f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-purple-600" />
            <span>{t.taxLiabilityReport}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
              ₹{taxReport.totalTaxCollected.toFixed(0)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'items'
                ? 'border-[#4b1d3f] text-[#4b1d3f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {lang === 'bn' ? 'জনপ্রিয় কেক ও আইটেম' : 'Popular Items'} ({popularItems.length})
            </span>
          </button>

          {(counterWiseSales.length > 1 || terminalWiseSales.length > 1) && (
            <button
              onClick={() => setActiveTab('counters')}
              className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'counters'
                  ? 'border-[#4b1d3f] text-[#4b1d3f]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-indigo-500" />
              <span>{lang === 'bn' ? 'কাউন্টার ও সিস্টেম' : 'Station & Counters'}</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {(activeTab === 'overview' || activeTab === 'items' || activeTab === 'counters') && totalOrders === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-extrabold text-sm">{t.noSalesOnDate}</p>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'bn'
                  ? 'অন্য কোনো তারিখ বা তারিখের রেঞ্জ নির্বাচন করুন।'
                  : 'Select another date or custom date range to see summary metrics.'}
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  {/* Primary KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Total Revenue */}
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-2xl border border-amber-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 block">
                          {lang === 'bn' ? 'মোট বিক্রয় (Revenue)' : 'Total Revenue'}
                        </span>
                        <IndianRupee className="w-4 h-4 text-amber-700" />
                      </div>
                      <div className="text-2xl font-black text-[#4b1d3f] font-mono tabular-nums mt-1.5">
                        ₹{totalRevenue.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-amber-800/80 font-semibold block mt-1">
                        {totalOrders} {lang === 'bn' ? 'টি বিল সম্পন্ন' : 'total orders'}
                      </span>
                    </div>

                    {/* Orders Count */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 block">
                          {lang === 'bn' ? 'মোট অর্ডারের সংখ্যা' : 'Total Orders'}
                        </span>
                        <Receipt className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
                        {totalOrders}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block mt-1">
                        {counterOrders} counter • {advanceOrders} booking
                      </span>
                    </div>

                    {/* Average Order Value */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 block">
                          {t.averageOrderValue}
                        </span>
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
                        ₹{averageOrderValue}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
                        {lang === 'bn' ? 'প্রতি বিলে গড় আদায়' : 'Per invoice average'}
                      </span>
                    </div>

                    {/* Due / Pending */}
                    <div className={`p-4 rounded-2xl border shadow-2xs ${
                      dueAmount > 0 ? 'bg-red-50/60 border-red-200' : 'bg-emerald-50/60 border-emerald-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold block ${dueAmount > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                          {dueAmount > 0 ? (lang === 'bn' ? 'বাকি পাওনা (Due)' : 'Due Balance') : (lang === 'bn' ? '১০০% পরিশোধিত' : 'Zero Due')}
                        </span>
                        {dueAmount > 0 ? (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div className={`text-2xl font-black font-mono tabular-nums mt-1.5 ${
                        dueAmount > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                        ₹{dueAmount.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-1">
                        {totalDiscount > 0 ? `₹${totalDiscount.toFixed(0)} discount given` : 'No discounts'}
                      </span>
                    </div>
                  </div>

                  {/* Payment Methods Breakdown */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-[#4b1d3f]" />
                      <span>{lang === 'bn' ? 'পেমেন্ট মাধ্যমভিত্তিক কালেকশন' : 'Payment Method Collection'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                            💵
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              {t.cash}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 font-mono">
                              ₹{cashSales.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {totalRevenue > 0 ? Math.round((cashSales / totalRevenue) * 100) : 0}%
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                            📱
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              {t.upi}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 font-mono">
                              ₹{upiSales.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {totalRevenue > 0 ? Math.round((upiSales / totalRevenue) * 100) : 0}%
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                            💳
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              {t.card}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 font-mono">
                              ₹{cardSales.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {totalRevenue > 0 ? Math.round((cardSales / totalRevenue) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Tax Preview Banner in Overview */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 via-purple-50/50 to-white rounded-2xl border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {t.taxLiabilityReport}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            GST Output Liability
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {lang === 'bn'
                            ? `মোট করযোগ্য বিক্রি: ₹${taxReport.totalTaxableAmount.toFixed(2)} • সংগৃহীত ট্যাক্স: ₹${taxReport.totalTaxCollected.toFixed(2)} (CGST ₹${taxReport.totalCgst.toFixed(2)} + SGST ₹${taxReport.totalSgst.toFixed(2)})`
                            : `Taxable Turnover: ₹${taxReport.totalTaxableAmount.toFixed(2)} • Total Tax: ₹${taxReport.totalTaxCollected.toFixed(2)} (CGST ₹${taxReport.totalCgst.toFixed(2)} + SGST ₹${taxReport.totalSgst.toFixed(2)})`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('tax')}
                      className="px-3.5 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs whitespace-nowrap"
                    >
                      {lang === 'bn' ? 'সম্পূর্ণ ট্যাক্স রিপোর্ট দেখুন →' : 'View Full Tax Report →'}
                    </button>
                  </div>

                  {/* Quick Monthly Sales Preview Banner in Overview */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 via-indigo-50/50 to-white rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {t.monthlyReport}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                            {monthOptions.find((m) => m.value === selectedMonth)?.[lang === 'bn' ? 'labelBn' : 'labelEn']} {selectedYear}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {lang === 'bn'
                            ? `মাসের মোট বিক্রয়: ₹${monthlyReport.totalRevenue.toFixed(2)} (${monthlyReport.totalOrders} টি বিল) • দৈনিক গড়: ₹${monthlyReport.dailyAverageRevenue}`
                            : `Month Total Revenue: ₹${monthlyReport.totalRevenue.toFixed(2)} (${monthlyReport.totalOrders} orders) • Daily Average: ₹${monthlyReport.dailyAverageRevenue}`}
                          {monthlyReport.peakDay ? (lang === 'bn' ? ` • সর্বোচ্চ দিন: ${monthlyReport.peakDay.date} (₹${monthlyReport.peakDay.revenue.toFixed(0)})` : ` • Peak Day: ${monthlyReport.peakDay.date} (₹${monthlyReport.peakDay.revenue.toFixed(0)})`) : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('monthly')}
                      className="px-3.5 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs whitespace-nowrap"
                    >
                      {lang === 'bn' ? 'মাসিক রিপোর্ট ও ট্রেন্ড দেখুন →' : 'View Monthly Trends →'}
                    </button>
                  </div>
                </>
              )}

              {/* TAB: MONTHLY SALES REPORT */}
              {activeTab === 'monthly' && (
                <div className="space-y-6">
                  {/* Monthly Header & Filter Controls Bar */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-700" />
                        <h4 className="text-base font-extrabold text-slate-900">
                          {t.monthlyReport}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold font-mono">
                          {monthOptions.find((m) => m.value === selectedMonth)?.[lang === 'bn' ? 'labelBn' : 'labelEn']} {selectedYear}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.monthlyReportDesc}
                      </p>
                    </div>

                    {/* Month & Year Selectors */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                          title="Previous Month"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Month dropdown */}
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="text-xs font-bold text-slate-800 bg-transparent px-2 py-1 focus:outline-none cursor-pointer"
                        >
                          {monthOptions.map((m) => (
                            <option key={m.value} value={m.value}>
                              {lang === 'bn' ? m.labelBn : m.labelEn}
                            </option>
                          ))}
                        </select>

                        {/* Year dropdown */}
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="text-xs font-bold text-slate-800 bg-transparent px-2 py-1 focus:outline-none cursor-pointer border-l border-slate-200"
                        >
                          {availableYears.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                          title="Next Month"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleSetCurrentMonth}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
                          selectedMonth === currentMonthNum && selectedYear === currentYearNum
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {lang === 'bn' ? 'চলতি মাস' : 'Current Month'}
                      </button>

                      {/* Export / Print Buttons for Monthly Report */}
                      <button
                        type="button"
                        onClick={handleShareMonthlyWhatsApp}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                        title="Share Monthly Report via WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintMonthlyReport}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                        title="Print Monthly Summary"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{lang === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportMonthlyCsv}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                        title="Download Monthly CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {monthlyReport.totalOrders === 0 ? (
                    <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-700 font-extrabold text-sm">
                        {lang === 'bn'
                          ? `${monthOptions.find((m) => m.value === selectedMonth)?.labelBn} ${selectedYear}-এ কোনো বিক্রয় পাওয়া যায়নি`
                          : `No sales recorded for ${monthOptions.find((m) => m.value === selectedMonth)?.labelEn} ${selectedYear}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {lang === 'bn'
                          ? 'অন্য কোনো মাস বা বছর নির্বাচন করে দেখুন।'
                          : 'Try selecting a different month or year above.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Monthly Primary KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Monthly Revenue */}
                        <div className="p-4 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white rounded-2xl border border-indigo-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-indigo-900 block">
                              {t.monthTotalRevenue}
                            </span>
                            <IndianRupee className="w-4 h-4 text-indigo-700" />
                          </div>
                          <div className="text-2xl font-black text-[#4b1d3f] font-mono tabular-nums mt-1.5">
                            ₹{monthlyReport.totalRevenue.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-indigo-800/80 font-semibold block mt-1">
                            {monthlyReport.totalOrders} {lang === 'bn' ? 'টি মোট ইনভয়েস' : 'total invoices'}
                          </span>
                        </div>

                        {/* Daily Average Revenue */}
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 block">
                              {t.dailyAverageRevenue}
                            </span>
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
                            ₹{monthlyReport.dailyAverageRevenue}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">
                            {lang === 'bn' ? `মাসের ${monthlyReport.daysInMonth} দিনের গড়` : `Avg over ${monthlyReport.daysInMonth} days`}
                          </span>
                        </div>

                        {/* Peak Sales Day */}
                        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-900 block">
                              {t.peakSalesDay}
                            </span>
                            <Flame className="w-4 h-4 text-amber-600" />
                          </div>
                          {monthlyReport.peakDay ? (
                            <>
                              <div className="text-xl font-black text-amber-950 font-mono tabular-nums mt-1.5">
                                ₹{monthlyReport.peakDay.revenue.toFixed(2)}
                              </div>
                              <span className="text-[10px] text-amber-800 font-bold block mt-1">
                                {monthlyReport.peakDay.date} ({monthlyReport.peakDay.ordersCount} {lang === 'bn' ? 'বিল' : 'bills'})
                              </span>
                            </>
                          ) : (
                            <div className="text-sm text-slate-400 mt-2">—</div>
                          )}
                        </div>

                        {/* Average Order Value (AOV) */}
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 block">
                              {t.averageOrderValue}
                            </span>
                            <Receipt className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
                            ₹{monthlyReport.averageOrderValue}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">
                            {lang === 'bn' ? 'প্রতি কাস্টমার গড় বিক্রি' : 'Per bill average'}
                          </span>
                        </div>
                      </div>

                      {/* Payment Methods & GST Breakdown in Month */}
                      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-[#4b1d3f]" />
                          <span>{lang === 'bn' ? 'মাসিক কালেকশন ও পেমেন্ট বিভাজন' : 'Monthly Payment & Collection Breakdown'}</span>
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[11px] text-slate-500 font-medium block">💵 {t.cash}</span>
                            <span className="text-base font-extrabold text-slate-900 font-mono block mt-1">
                              ₹{monthlyReport.cashSales.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {monthlyReport.totalRevenue > 0 ? Math.round((monthlyReport.cashSales / monthlyReport.totalRevenue) * 100) : 0}% of revenue
                            </span>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[11px] text-slate-500 font-medium block">📱 {t.upi}</span>
                            <span className="text-base font-extrabold text-slate-900 font-mono block mt-1">
                              ₹{monthlyReport.upiSales.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {monthlyReport.totalRevenue > 0 ? Math.round((monthlyReport.upiSales / monthlyReport.totalRevenue) * 100) : 0}% of revenue
                            </span>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[11px] text-slate-500 font-medium block">💳 {t.card}</span>
                            <span className="text-base font-extrabold text-slate-900 font-mono block mt-1">
                              ₹{monthlyReport.cardSales.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {monthlyReport.totalRevenue > 0 ? Math.round((monthlyReport.cardSales / monthlyReport.totalRevenue) * 100) : 0}% of revenue
                            </span>
                          </div>

                          <div className={`p-3 rounded-xl border shadow-2xs ${
                            monthlyReport.dueAmount > 0 ? 'bg-red-50/70 border-red-200' : 'bg-white border-slate-200'
                          }`}>
                            <span className={`text-[11px] font-medium block ${monthlyReport.dueAmount > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                              ⏳ {lang === 'bn' ? 'বাকি পাওনা' : 'Pending Due'}
                            </span>
                            <span className={`text-base font-extrabold font-mono block mt-1 ${monthlyReport.dueAmount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                              ₹{monthlyReport.dueAmount.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {monthlyReport.totalTaxCollected > 0 ? `GST: ₹${monthlyReport.totalTaxCollected.toFixed(0)}` : 'Zero Due'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION: DEDICATED MONTHLY TAX SUMMARY TABLE BREAKDOWN BY PERCENTAGE RATE */}
                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                              <Percent className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                <span>{lang === 'bn' ? 'মাসিক ট্যাক্স সারাংশ (GST হার অনুসারে)' : 'Monthly Tax Summary by Percentage Rate'}</span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  ({monthOptions.find((m) => m.value === selectedMonth)?.[lang === 'bn' ? 'labelBn' : 'labelEn']} {selectedYear})
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {lang === 'bn'
                                  ? 'মাসের মোট বিক্রয় থেকে কর হারের (০%, ৫%, ১২%, ১৮%) বিস্তারিত বিভাজন ও CGST/SGST হিসাব'
                                  : 'Breakdown of monthly taxable sales, CGST, SGST, and total tax collected by GST percentage rate'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleCopyMonthlyTaxTable}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              title="Copy tax breakdown table to clipboard"
                            >
                              {copiedMonthlyTax ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">{lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!'}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{lang === 'bn' ? 'টেবিল কপি' : 'Copy Table'}</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={handlePrintMonthlyReport}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              title="Print Monthly Tax Statement"
                            >
                              <Printer className="w-3.5 h-3.5 text-purple-700" />
                              <span>{lang === 'bn' ? 'প্রিন্ট' : 'Print Tax'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Monthly Tax Highlight Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-purple-900 block">
                              {lang === 'bn' ? 'মোট সংগৃহীত ট্যাক্স' : 'Total Monthly Tax'}
                            </span>
                            <span className="text-lg font-black text-purple-950 font-mono mt-0.5 block">
                              ₹{monthlyTaxReport.totalTaxCollected.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-purple-700 font-medium block">
                              CGST: ₹{monthlyTaxReport.totalCgst.toFixed(2)} • SGST: ₹{monthlyTaxReport.totalSgst.toFixed(2)}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              {lang === 'bn' ? 'করযোগ্য টার্নওভার' : 'Taxable Turnover'}
                            </span>
                            <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                              ₹{monthlyTaxReport.totalTaxableAmount.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium block">
                              {lang === 'bn' ? `কার্যকরী হার: ${monthlyTaxReport.effectiveTaxRate}%` : `Effective rate: ${monthlyTaxReport.effectiveTaxRate}%`}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              {lang === 'bn' ? 'করযুক্ত / করমুক্ত বিল' : 'Taxable / Exempt Orders'}
                            </span>
                            <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                              {monthlyTaxReport.taxableBillsCount} / {monthlyTaxReport.exemptBillsCount}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {monthlyReport.totalOrders} {lang === 'bn' ? 'টি মোট ইনভয়েস' : 'total monthly orders'}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              GSTIN & Jurisdiction
                            </span>
                            <span className="text-xs font-black text-slate-800 font-mono mt-0.5 truncate block">
                              {config.gstin || 'Composite / Unregistered'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              State 19 (West Bengal)
                            </span>
                          </div>
                        </div>

                        {/* Dedicated Tax Summary Table */}
                        {monthlyTaxReport.slabs.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                            {lang === 'bn' ? 'এই মাসে কোনো ট্যাক্স লেনদেন নেই' : 'No tax transactions recorded for this month'}
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                    <th className="py-2.5 px-3">{lang === 'bn' ? 'ট্যাক্স স্ল্যাব / হার' : 'GST Rate Slab'}</th>
                                    <th className="py-2.5 px-3 text-center">{lang === 'bn' ? 'বিল সংখ্যা' : 'Invoices'}</th>
                                    <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'করযোগ্য মূল্য (₹)' : 'Taxable Turnover (₹)'}</th>
                                    <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'CGST কেন্দ্রীয় (₹)' : 'CGST (₹)'}</th>
                                    <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'SGST রাজ্য (₹)' : 'SGST (₹)'}</th>
                                    <th className="py-2.5 px-3 text-right text-purple-950 font-extrabold">{lang === 'bn' ? 'মোট সংগৃহীত কর (₹)' : 'Total Tax (₹)'}</th>
                                    <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'মাসের শেয়ার' : 'Tax Share (%)'}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {monthlyTaxReport.slabs.map((slab) => {
                                    const taxShare = monthlyTaxReport.totalTaxCollected > 0
                                      ? Math.round((slab.totalTax / monthlyTaxReport.totalTaxCollected) * 100)
                                      : 0;
                                    const invoiceShare = monthlyReport.totalOrders > 0
                                      ? Math.round((slab.billsCount / monthlyReport.totalOrders) * 100)
                                      : 0;

                                    return (
                                      <tr key={slab.rate} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-2.5 px-3">
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold font-mono ${
                                              slab.rate === 0
                                                ? 'bg-slate-100 text-slate-700'
                                                : slab.rate === 5
                                                ? 'bg-emerald-100 text-emerald-900 font-black'
                                                : slab.rate === 12
                                                ? 'bg-blue-100 text-blue-900 font-black'
                                                : slab.rate === 18
                                                ? 'bg-purple-100 text-purple-900 font-black'
                                                : 'bg-amber-100 text-amber-900 font-black'
                                            }`}>
                                              {slab.rate}% GST Slab
                                            </span>
                                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                                              {slab.rate === 0
                                                ? '(Nil / Tax Exempt Bread & Buns)'
                                                : slab.rate === 5
                                                ? '(Standard Bakery: CGST 2.5% + SGST 2.5%)'
                                                : slab.rate === 12
                                                ? '(Packaged Chocolates: CGST 6% + SGST 6%)'
                                                : slab.rate === 18
                                                ? '(Party Accessories & Decor: CGST 9% + SGST 9%)'
                                                : `(CGST ${slab.rate / 2}% + SGST ${slab.rate / 2}%)`}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-mono">
                                          <span className="font-bold text-slate-800">{slab.billsCount}</span>
                                          <span className="text-[10px] text-slate-400 ml-1">({invoiceShare}%)</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                          ₹{slab.taxableAmount.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                          ₹{slab.cgstAmount.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                          ₹{slab.sgstAmount.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-black text-purple-950 bg-purple-50/30">
                                          ₹{slab.totalTax.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <span className="font-bold text-slate-700">{taxShare}%</span>
                                            <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                              <div
                                                className="bg-purple-700 h-1.5 rounded-full"
                                                style={{ width: `${Math.min(100, Math.max(slab.totalTax > 0 ? 8 : 0, taxShare))}%` }}
                                              />
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-slate-50/90 font-bold border-t-2 border-slate-200">
                                  <tr>
                                    <td className="py-2.5 px-3 text-slate-800">
                                      {lang === 'bn' ? 'মোট মাসিক কর (Total)' : 'Total Month Tax Liability'}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-slate-900">
                                      {monthlyReport.totalOrders} bills
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                                      ₹{monthlyTaxReport.totalTaxableAmount.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                                      ₹{monthlyTaxReport.totalCgst.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                                      ₹{monthlyTaxReport.totalSgst.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-black text-purple-950 text-sm">
                                      ₹{monthlyTaxReport.totalTaxCollected.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                      100%
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Compliance Filing Note */}
                        <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 flex items-start gap-2 text-[11px] text-slate-600">
                          <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-purple-950">
                              {lang === 'bn' ? 'জিএসটি ফাইলিং পরামর্শ (GSTR-1 / GSTR-3B):' : 'GST Compliance & Filing Note:'}
                            </span>{' '}
                            <span>
                              {lang === 'bn'
                                ? 'এই মাসিক কর সারসংক্ষেপটি আপনার CA বা কর উপদেষ্টার সাথে শেয়ার করুন। পশ্চিমবঙ্গ রাজ্যের অভ্যন্তরীণ বিক্রয়ে করের ৫০% কেন্দ্রীয় জিএসটি (CGST) এবং ৫০% রাজ্য জিএসটি (SGST) হিসেবে সংরক্ষিত হয়।'
                                : 'Use this table for monthly GSTR-1 outward tax supplies and GSTR-3B return computation. All intra-state West Bengal sales are equally partitioned between Central Tax (CGST) and State Tax (SGST).'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION: DAILY REVENUE TRENDS (BAR CHART & BREAKDOWN) */}
                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900">
                                {t.revenueTrends}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {lang === 'bn'
                                  ? `${monthOptions.find((m) => m.value === selectedMonth)?.labelBn} ${selectedYear}-এর প্রতিদিনের বিক্রয় গ্রাফ`
                                  : `Day-by-day revenue graph for ${monthOptions.find((m) => m.value === selectedMonth)?.labelEn} ${selectedYear}`}
                              </p>
                            </div>
                          </div>

                          {/* Quick insight badges */}
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-bold rounded-lg border border-indigo-200 text-[11px]">
                              {monthlyReport.dailyTrends.filter((d) => d.revenue > 0).length} / {monthlyReport.daysInMonth} {lang === 'bn' ? 'দিন সক্রিয় বিক্রয়' : 'active sales days'}
                            </span>
                            {monthlyReport.peakDay && (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg border border-amber-200 text-[11px]">
                                🔥 {lang === 'bn' ? 'শীর্ষ দিন:' : 'Peak:'} {monthlyReport.peakDay.date.slice(8)} ({monthlyReport.peakDay.date})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Bar Chart */}
                        {(() => {
                          const maxRev = Math.max(...monthlyReport.dailyTrends.map((d) => d.revenue), 1);
                          return (
                            <div className="pt-4 pb-2">
                              {/* Hovered Day Tooltip Bar */}
                              <div className="min-h-7 mb-2 flex items-center justify-between px-3 py-1 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                                {hoveredTrendDay !== null ? (
                                  (() => {
                                    const dData = monthlyReport.dailyTrends.find((d) => d.day === hoveredTrendDay);
                                    if (!dData) return null;
                                    const isPeak = monthlyReport.peakDay?.date === dData.date;
                                    return (
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-[#4b1d3f]">
                                            Day {dData.day} ({dData.dayName}, {dData.date})
                                          </span>
                                          {isPeak && (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                              ★ Peak Day
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold text-slate-700">
                                            {dData.ordersCount} {lang === 'bn' ? 'বিল' : 'bills'}
                                          </span>
                                          <span className="font-extrabold font-mono text-[#4b1d3f]">
                                            ₹{dData.revenue.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">
                                    {lang === 'bn'
                                      ? 'যেকোনো দিনের বারের উপর কার্সার আনুন বিস্তারিত দেখতে'
                                      : 'Hover or tap on any day bar to view detailed metrics'}
                                  </span>
                                )}
                              </div>

                              {/* Bars container with horizontal scroll for mobile */}
                              <div className="overflow-x-auto pb-2">
                                <div className="min-w-[620px] h-36 flex items-end gap-1.5 sm:gap-2 px-2 bg-slate-50/50 rounded-xl border border-slate-100 pt-6 pb-2">
                                  {monthlyReport.dailyTrends.map((d) => {
                                    const heightPercent = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
                                    const isPeak = monthlyReport.peakDay?.date === d.date && d.revenue > 0;
                                    const isHovered = hoveredTrendDay === d.day;
                                    const isWeekend = d.dayName === 'Sun';

                                    return (
                                      <div
                                        key={d.day}
                                        onMouseEnter={() => setHoveredTrendDay(d.day)}
                                        onMouseLeave={() => setHoveredTrendDay(null)}
                                        className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
                                      >
                                        {/* Peak indicator */}
                                        {isPeak && (
                                          <div className="text-[10px] text-amber-500 font-bold mb-0.5 animate-bounce">
                                            ★
                                          </div>
                                        )}

                                        {/* Bar column */}
                                        <div className="w-full flex justify-center items-end" style={{ height: '100px' }}>
                                          <div
                                            style={{
                                              height: d.revenue > 0 ? `${Math.max(12, Math.round(heightPercent))}%` : '4px',
                                              width: '100%'
                                            }}
                                            className={`rounded-t transition-all duration-300 max-w-[18px] ${
                                              isPeak
                                                ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-xs'
                                                : d.revenue > 0
                                                ? isHovered
                                                  ? 'bg-[#4b1d3f]'
                                                  : 'bg-[#4b1d3f]/75 hover:bg-[#4b1d3f]'
                                                : 'bg-slate-200'
                                            }`}
                                          />
                                        </div>

                                        {/* Day label */}
                                        <span
                                          className={`text-[9px] font-mono mt-1 font-bold ${
                                            isPeak
                                              ? 'text-amber-800 font-extrabold'
                                              : isHovered
                                              ? 'text-[#4b1d3f] font-extrabold scale-110'
                                              : isWeekend
                                              ? 'text-red-600'
                                              : 'text-slate-500'
                                          }`}
                                        >
                                          {d.day}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Daily Trends Detailed Breakdown Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="px-3 py-2 bg-slate-50 text-xs font-bold text-slate-700 flex justify-between items-center border-b border-slate-200">
                            <span>{lang === 'bn' ? 'তারিখভিত্তিক বিস্তারিত টেবিল' : 'Daily Sales Ledger Table'}</span>
                            <span className="text-[11px] text-slate-500">
                              {monthlyReport.dailyTrends.length} days
                            </span>
                          </div>

                          <div className="max-h-56 overflow-y-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="sticky top-0 bg-white border-b border-slate-200 shadow-2xs z-10">
                                <tr className="text-slate-500 font-bold">
                                  <th className="py-2 px-3 text-center">Day</th>
                                  <th className="py-2 px-3">Date</th>
                                  <th className="py-2 px-3 text-center">Day of Week</th>
                                  <th className="py-2 px-3 text-center">Bills Count</th>
                                  <th className="py-2 px-3 text-right">Daily Sales</th>
                                  <th className="py-2 px-3 text-right">Month Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {monthlyReport.dailyTrends.map((d) => {
                                  const isPeak = monthlyReport.peakDay?.date === d.date && d.revenue > 0;
                                  const share =
                                    monthlyReport.totalRevenue > 0
                                      ? Math.round((d.revenue / monthlyReport.totalRevenue) * 100)
                                      : 0;

                                  return (
                                    <tr
                                      key={d.day}
                                      className={`hover:bg-slate-50 transition-colors ${
                                        isPeak ? 'bg-amber-50/50' : d.revenue === 0 ? 'text-slate-400 bg-slate-50/20' : ''
                                      }`}
                                    >
                                      <td className="py-2 px-3 text-center font-mono font-bold">
                                        {d.day}
                                      </td>
                                      <td className="py-2 px-3 font-mono font-medium">
                                        {d.date}
                                        {isPeak && (
                                          <span className="ml-2 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                            Peak
                                          </span>
                                        )}
                                      </td>
                                      <td className={`py-2 px-3 text-center ${d.dayName === 'Sun' ? 'text-red-500 font-semibold' : ''}`}>
                                        {d.dayName}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono">
                                        {d.ordersCount}
                                      </td>
                                      <td className={`py-2 px-3 text-right font-mono font-bold ${d.revenue > 0 ? 'text-[#4b1d3f]' : 'text-slate-400'}`}>
                                        ₹{d.revenue.toFixed(2)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-400">
                                        {d.revenue > 0 ? `${share}%` : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* SECTION: BEST-SELLING PRODUCTS FOR THAT DURATION */}
                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900">
                                {t.bestSellingProducts}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {lang === 'bn'
                                  ? `${monthOptions.find((m) => m.value === selectedMonth)?.labelBn} ${selectedYear}-এর শীর্ষ বিক্রীত আইটেম`
                                  : `Top cakes & products sold during ${monthOptions.find((m) => m.value === selectedMonth)?.labelEn} ${selectedYear}`}
                              </p>
                            </div>
                          </div>

                          {/* Search input for products */}
                          <div className="relative w-full sm:w-60">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              value={monthlySearchTerm}
                              onChange={(e) => setMonthlySearchTerm(e.target.value)}
                              placeholder={lang === 'bn' ? 'প্রোডাক্ট খুঁজুন...' : 'Search best-sellers...'}
                              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                            />
                          </div>
                        </div>

                        {filteredMonthlyProducts.length === 0 ? (
                          <p className="text-xs text-slate-400 py-6 text-center">
                            {lang === 'bn' ? 'কোনো প্রোডাক্ট মেলেনি' : 'No matching products found'}
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {filteredMonthlyProducts.map((item, index) => {
                              const sharePercent =
                                monthlyReport.totalRevenue > 0
                                  ? Math.round((item.totalRevenue / monthlyReport.totalRevenue) * 100)
                                  : 0;

                              return (
                                <div
                                  key={item.name}
                                  className="p-3 bg-slate-50/70 hover:bg-amber-50/40 rounded-xl border border-slate-200/80 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                          index === 0
                                            ? 'bg-amber-400 text-amber-950 shadow-xs'
                                            : index === 1
                                            ? 'bg-slate-300 text-slate-800'
                                            : index === 2
                                            ? 'bg-amber-700/20 text-amber-900'
                                            : 'bg-white text-slate-600 border border-slate-200'
                                        }`}
                                      >
                                        {index + 1}
                                      </span>
                                      <div>
                                        <span className="font-extrabold text-xs text-slate-900 block">
                                          {item.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {sharePercent}% of total month revenue
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <span className="font-extrabold text-xs font-mono text-[#4b1d3f]">
                                        ₹{item.totalRevenue.toFixed(2)}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium ml-2 block">
                                        ({item.qty} pcs / lbs)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-[#4b1d3f] h-1.5 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(100, Math.max(6, sharePercent))}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: TAX LIABILITY REPORT (GST) */}
              {activeTab === 'tax' && (

                <div className="space-y-6">
                  {/* Tax Header Banner with Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-purple-700" />
                        <h4 className="text-base font-extrabold text-slate-900">
                          {t.taxLiabilityReport}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.taxLiabilityDesc} • {formatDateDisplay()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleShareTaxReportWhatsApp}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                        title="Share Tax Report on WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp Tax</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintTaxReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                        title="Print GST Statement"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t.printTaxReport}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportTaxCsv}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                        title="Download Tax CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t.exportTaxCsv}</span>
                      </button>
                    </div>
                  </div>

                  {/* Business & GST Compliance Information Card */}
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-amber-800 shrink-0" />
                      <div>
                        <span className="font-extrabold text-slate-900 block">
                          {config.shopName}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          {config.addressLine1}, {config.district}, WB • Phone: {config.phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div className="bg-white px-2.5 py-1 rounded-lg border border-amber-300 font-mono text-[11px]">
                        <span className="text-slate-500 font-sans mr-1">GSTIN:</span>
                        <strong className="text-slate-900">{config.gstin || 'Composite Scheme / Unregistered'}</strong>
                      </div>
                      <span className="text-[10px] text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full font-bold">
                        State: 19 (WB)
                      </span>
                    </div>
                  </div>

                  {/* Tax KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Total Tax Collected */}
                    <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-purple-900 block">
                        {t.totalTaxCollected}
                      </span>
                      <div className="text-2xl font-black text-purple-950 font-mono tabular-nums mt-1.5">
                        ₹{taxReport.totalTaxCollected.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-purple-700 font-semibold block mt-1">
                        Output GST Liability
                      </span>
                    </div>

                    {/* CGST */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600 block">
                        {t.cgstLabel}
                      </span>
                      <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
                        ₹{taxReport.totalCgst.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block mt-1">
                        50% of total GST
                      </span>
                    </div>

                    {/* SGST */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600 block">
                        {t.sgstLabel}
                      </span>
                      <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
                        ₹{taxReport.totalSgst.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block mt-1">
                        50% of total GST
                      </span>
                    </div>

                    {/* Taxable Turnover */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600 block">
                        {t.taxableTurnover}
                      </span>
                      <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
                        ₹{taxReport.totalTaxableAmount.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
                        Effective rate: {taxReport.effectiveTaxRate}%
                      </span>
                    </div>
                  </div>

                  {/* GST RATE SLABS BREAKDOWN TABLE */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-purple-700" />
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {t.taxSlabs}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">
                          {taxReport.taxableBillsCount} {lang === 'bn' ? 'টি করযুক্ত বিল' : 'taxable bills'} • {taxReport.exemptBillsCount} {lang === 'bn' ? 'টি করমুক্ত বিল' : 'exempt bills'}
                        </span>
                      </div>
                    </div>

                    {taxReport.slabs.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No tax transactions recorded</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold">
                              <th className="py-2.5 px-3">GST Rate Slab</th>
                              <th className="py-2.5 px-3 text-center">Invoices</th>
                              <th className="py-2.5 px-3 text-right">Taxable Turnover</th>
                              <th className="py-2.5 px-3 text-right">CGST (Rs.)</th>
                              <th className="py-2.5 px-3 text-right">SGST (Rs.)</th>
                              <th className="py-2.5 px-3 text-right">Total Tax (Rs.)</th>
                              <th className="py-2.5 px-3 text-right">Share (%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {taxReport.slabs.map((slab) => {
                              const share =
                                taxReport.totalTaxCollected > 0
                                  ? Math.round((slab.totalTax / taxReport.totalTaxCollected) * 100)
                                  : 0;

                              return (
                                <tr key={slab.rate} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[11px] font-extrabold font-mono ${
                                          slab.rate === 0
                                            ? 'bg-slate-100 text-slate-700'
                                            : slab.rate === 5
                                            ? 'bg-emerald-100 text-emerald-900'
                                            : slab.rate === 18
                                            ? 'bg-purple-100 text-purple-900'
                                            : 'bg-amber-100 text-amber-900'
                                        }`}
                                      >
                                        {slab.rate}% Slab
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        {slab.rate === 0
                                          ? '(Exempt / Nil Rated)'
                                          : slab.rate === 5
                                          ? '(Bakery Standard: CGST 2.5% + SGST 2.5%)'
                                          : slab.rate === 18
                                          ? '(Decor/Accessories: CGST 9% + SGST 9%)'
                                          : ''}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                                    {slab.billsCount}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                    ₹{slab.taxableAmount.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    ₹{slab.cgstAmount.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    ₹{slab.sgstAmount.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-purple-900">
                                    ₹{slab.totalTax.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-slate-400">
                                    {share}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-300 bg-purple-50/50 font-extrabold text-slate-900">
                              <td className="py-2.5 px-3">TOTAL SUMMARY</td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                {taxReport.taxableBillsCount + taxReport.exemptBillsCount}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                ₹{taxReport.totalTaxableAmount.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-purple-950">
                                ₹{taxReport.totalCgst.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-purple-950">
                                ₹{taxReport.totalSgst.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[#4b1d3f]">
                                ₹{taxReport.totalTaxCollected.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">100%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* BILL-BY-BILL TAX REGISTER / INVOICE LEDGER */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#4b1d3f]" />
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {t.taxInvoiceList}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          {searchedTaxBills.length} Invoices
                        </span>
                      </div>

                      {/* Search in tax bills */}
                      <div className="relative w-full sm:w-60">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={taxSearchTerm}
                          onChange={(e) => setTaxSearchTerm(e.target.value)}
                          placeholder="Search Bill No or Name..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#4b1d3f]"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                          <tr className="text-slate-600 font-bold">
                            <th className="py-2 px-2.5">Bill No</th>
                            <th className="py-2 px-2.5">Date</th>
                            <th className="py-2 px-2.5">Customer</th>
                            <th className="py-2 px-2.5 text-right">Taxable Val</th>
                            <th className="py-2 px-2.5 text-center">Tax %</th>
                            <th className="py-2 px-2.5 text-right">CGST</th>
                            <th className="py-2 px-2.5 text-right">SGST</th>
                            <th className="py-2 px-2.5 text-right">Total GST</th>
                            <th className="py-2 px-2.5 text-right">Grand Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {searchedTaxBills.map((b) => {
                            const taxable = Math.max(0, b.subtotal - (b.discountAmount || 0) - (b.loyaltyDiscountAmount || 0));
                            const tax = b.taxAmount || 0;
                            const cgst = tax / 2;
                            const sgst = tax / 2;

                            return (
                              <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-2 px-2.5 font-bold font-mono text-slate-900">
                                  {b.billNo}
                                </td>
                                <td className="py-2 px-2.5 text-slate-500 font-mono text-[11px]">
                                  {(b.date || new Date(b.createdAt).toISOString()).slice(0, 10)}
                                </td>
                                <td className="py-2 px-2.5 text-slate-700">
                                  <div className="font-semibold">{b.customerName || 'Walk-in'}</div>
                                  {b.customerMobile && (
                                    <div className="text-[10px] text-slate-400 font-mono">{b.customerMobile}</div>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-800">
                                  ₹{taxable.toFixed(2)}
                                </td>
                                <td className="py-2 px-2.5 text-center font-mono">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      b.taxPercent === 0
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-purple-100 text-purple-900'
                                    }`}
                                  >
                                    {b.taxPercent || 0}%
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                                  ₹{cgst.toFixed(2)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                                  ₹{sgst.toFixed(2)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-purple-900">
                                  ₹{tax.toFixed(2)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-extrabold text-slate-900">
                                  ₹{b.grandTotal.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: POPULAR ITEMS */}
              {activeTab === 'items' && (
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {t.popularItems}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'bn'
                            ? `${formatDateDisplay()}-এ সবচেয়ে বেশি বিক্রীত কেক ও পণ্য`
                            : `Top selling cakes & items for ${formatDateDisplay()}`}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200">
                      {popularItems.length} {lang === 'bn' ? 'টি আইটেম বিক্রি' : 'items sold'}
                    </span>
                  </div>

                  {popularItems.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No item data recorded</p>
                  ) : (
                    <div className="space-y-2.5">
                      {popularItems.map((item, index) => {
                        const sharePercent =
                          totalRevenue > 0
                            ? Math.round((item.totalRevenue / totalRevenue) * 100)
                            : 0;

                        return (
                          <div
                            key={item.name}
                            className="p-3 bg-slate-50/70 hover:bg-amber-50/40 rounded-xl border border-slate-200/80 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                    index === 0
                                      ? 'bg-amber-400 text-amber-950 shadow-xs'
                                      : index === 1
                                      ? 'bg-slate-300 text-slate-800'
                                      : index === 2
                                      ? 'bg-amber-700/20 text-amber-900'
                                      : 'bg-white text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <span className="font-extrabold text-xs text-slate-900">
                                  {item.name}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="font-extrabold text-xs font-mono text-[#4b1d3f]">
                                  ₹{item.totalRevenue}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium ml-2">
                                  ({item.qty} pcs / lbs)
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#4b1d3f] h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(8, sharePercent))}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: COUNTERS & ORDER TYPE BREAKDOWN */}
              {activeTab === 'counters' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Order Type Distribution */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#4b1d3f]" />
                      <span>{t.orderTypeBreakdown}</span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                        <span className="font-semibold text-slate-700">{t.counterOrder}</span>
                        <span className="font-mono font-bold text-[#4b1d3f]">{counterOrders}</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                        <span className="font-semibold text-slate-700">{t.advanceOrder}</span>
                        <span className="font-mono font-bold text-amber-800">{advanceOrders}</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                        <span className="font-semibold text-slate-700">{t.deliveryOrder}</span>
                        <span className="font-mono font-bold text-blue-700">{deliveryOrders}</span>
                      </div>
                    </div>
                  </div>

                  {/* System Terminal Wise Breakdown (Multiple System POS) */}
                  <div className="p-4 bg-white rounded-2xl border border-indigo-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Laptop className="w-4 h-4 text-indigo-600" />
                        <span>{lang === 'bn' ? 'সিস্টেম টার্মিনালভিত্তিক বিক্রয় (Multiple System Sales)' : 'System Terminal-Wise Sales Breakdown'}</span>
                      </h4>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        Multi-Device
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {terminalWiseSales.map((t) => (
                        <div
                          key={t.terminalName}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">{t.terminalName}</span>
                            <span className="text-[10px] text-slate-500">{t.ordersCount} bills recorded</span>
                          </div>
                          <span className="font-mono font-extrabold text-indigo-950">
                            ₹{t.revenue.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Counter Wise Breakdown */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-[#4b1d3f]" />
                      <span>{t.counterBreakdown}</span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      {counterWiseSales.map((c) => (
                        <div
                          key={c.counterName}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">{c.counterName}</span>
                            <span className="text-[10px] text-slate-500">{c.ordersCount} bills</span>
                          </div>
                          <span className="font-mono font-extrabold text-[#4b1d3f]">
                            ₹{c.revenue.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            {config.shopName} • 7866971421 • {formatDateDisplay()}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
