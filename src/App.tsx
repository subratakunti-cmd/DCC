/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bill, ShopConfig, BakeryProduct, Language, ReceiptFormat, AppUserSession, UserRole, CustomerLoyalty, DailyFacebookSchedule } from './types';
import {
  getShopConfig,
  getProducts,
  getBills,
  deleteBill,
  getCurrentBillSequence,
  getNextBillSequence,
  getSavedLanguage,
  setSavedLanguage,
  saveBill,
  getUserSession,
  saveUserSession,
  getDailyFbSchedule,
  saveDailyFbSchedule,
  appendDailyFbPostLog,
  getTodaysFbPlan,
  getISTDateStr,
  isDailyFbPostDueNow,
  shouldRequireAppLoginScreen,
  markAppLoggedIn,
  markAppLoggedOut
} from './utils/storage';
import { Header } from './components/Header';
import { BillingScreen } from './components/BillingScreen';
import { BillHistory } from './components/BillHistory';
import { CatalogManager } from './components/CatalogManager';
import { StockManagement } from './components/StockManagement';
import { SettingsModal } from './components/SettingsModal';
import { CloudBackupModal } from './components/CloudBackupModal';
import { PrintModal } from './components/PrintModal';
import { PrintBillView } from './components/PrintBillView';
import { PrinterManagerModal } from './components/PrinterManagerModal';
import { BakeryMap } from './components/BakeryMap';
import { WorkspaceView } from './components/WorkspaceView';
import { PlayStoreModal } from './components/PlayStoreModal';
import { DailySalesSummaryModal } from './components/DailySalesSummaryModal';
import { MultiSystemModal } from './components/MultiSystemModal';
import { CustomerCRM } from './components/CustomerCRM';
import { RoleLoginModal } from './components/RoleLoginModal';
import { DistributorDashboard } from './components/DistributorDashboard';
import { subscribeToBills, deleteBillFromFirestore } from './services/firestoreService';
import { BakeryQrHubModal } from './components/BakeryQrHubModal';
import { FacebookAdsHubModal } from './components/FacebookAdsHubModal';
import { StaffPermissionManagerModal } from './components/StaffPermissionManagerModal';
import { RunFileManagerModal } from './components/RunFileManagerModal';
import { AppLoginScreen } from './components/AppLoginScreen';

export default function App() {
  const [lang, setLangState] = useState<Language>(getSavedLanguage());
  const [config, setConfig] = useState<ShopConfig>(getShopConfig());
  const [products, setProducts] = useState<BakeryProduct[]>(getProducts());
  const [bills, setBills] = useState<Bill[]>([]);
  const [billSequence, setBillSequence] = useState<number>(getCurrentBillSequence());
  const [currentTab, setCurrentTab] = useState<'billing' | 'history' | 'catalog' | 'stock' | 'crm' | 'map' | 'distributor' | 'workspace' | 'settings'>('billing');
  const [userSession, setUserSession] = useState<AppUserSession>(getUserSession());
  const [isAppAuthenticated, setIsAppAuthenticated] = useState<boolean>(
    () => !shouldRequireAppLoginScreen(getShopConfig())
  );
  const [isRoleLoginOpen, setIsRoleLoginOpen] = useState<boolean>(false);
  const [loginModalRole, setLoginModalRole] = useState<UserRole>('admin');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isPlayStoreModalOpen, setIsPlayStoreModalOpen] = useState<boolean>(false);
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState<boolean>(false);
  const [isMultiSystemModalOpen, setIsMultiSystemModalOpen] = useState<boolean>(false);
  const [isPrinterManagerOpen, setIsPrinterManagerOpen] = useState<boolean>(false);
  const [isCloudBackupOpen, setIsCloudBackupOpen] = useState<boolean>(false);
  const [isQrHubOpen, setIsQrHubOpen] = useState<boolean>(false);
  const [isAdsHubOpen, setIsAdsHubOpen] = useState<boolean>(false);
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState<boolean>(false);
  const [isRunFileManagerOpen, setIsRunFileManagerOpen] = useState<boolean>(false);
  const [dailyFbSchedule, setDailyFbSchedule] = useState<DailyFacebookSchedule>(() => getDailyFbSchedule());
  const [dailyFbDismissedDate, setDailyFbDismissedDate] = useState<string>('');
  const [dailyFbPublishedToast, setDailyFbPublishedToast] = useState<string | null>(null);

  // Print modal state
  const [activePrintBill, setActivePrintBill] = useState<Bill | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printFormat, setPrintFormat] = useState<ReceiptFormat>('thermal');

  // Passing data from Google Forms & Google Maps into Billing
  const [formOrderData, setFormOrderData] = useState<{
    customerName: string;
    customerMobile: string;
    productName: string;
    weight: string;
    cakeMessage: string;
    deliveryDate: string;
  } | null>(null);

  const [deliveryData, setDeliveryData] = useState<{
    address: string;
    distanceKm: number;
    deliveryFee: number;
  } | null>(null);

  // Load bills and setup Firestore real-time sync
  useEffect(() => {
    // Check URL parameters for fast run or terminal setup
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('run') === 'true' || params.get('action') === 'run') {
        setIsRunFileManagerOpen(true);
      }
      if (params.get('playstore') === 'true' || params.get('action') === 'playstore' || params.get('android') === 'true') {
        setIsPlayStoreModalOpen(true);
      }
    }

    const isSeeded = localStorage.getItem('dcc_sample_initialized_v2');
    const loadedBills = getBills();
    if (loadedBills.length === 0 && !isSeeded) {
      localStorage.setItem('dcc_sample_initialized_v2', 'true');
      const sampleBill: Bill = {
        id: 'bill-sample-1',
        billNo: 'DCC-26C1000001',
        sequence: 1,
        date: new Date().toISOString(),
        createdAt: Date.now() - 3600000 * 2,
        customerName: 'Sourav Ghosh',
        customerMobile: '9876543210',
        orderType: 'advance_booking',
        deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        deliveryTime: '17:00',
        cakeMessage: 'Happy Birthday Sourav',
        items: [
          {
            id: 'item-1',
            name: 'Chocolate Truffle Cake',
            weightOrSize: '2.0 lb',
            qty: 1,
            rate: 900,
            total: 900,
            notes: 'Eggless, Gold candles'
          },
          {
            id: 'item-2',
            name: 'Musical Birthday Candle',
            weightOrSize: '1 Pc',
            qty: 1,
            rate: 50,
            total: 50
          }
        ],
        subtotal: 950,
        discountType: 'flat',
        discountValue: 50,
        discountAmount: 50,
        taxPercent: 0,
        taxAmount: 0,
        grandTotal: 900,
        advancePaid: 500,
        dueAmount: 400,
        paymentMethod: 'UPI',
        status: 'due'
      };
      saveBill(sampleBill);
      setBills([sampleBill]);
      setBillSequence(2);
    } else {
      setBills(loadedBills);
      const nextSeq = getNextBillSequence(loadedBills);
      setBillSequence((prev) => Math.max(prev, nextSeq));
    }

    // Try listening to Firestore safely
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToBills((cloudBills) => {
        if (cloudBills && cloudBills.length > 0) {
          setBills(cloudBills);
          const nextSeq = getNextBillSequence(cloudBills);
          setBillSequence((prev) => Math.max(prev, nextSeq));
        }
      });
    } catch {
      // Local storage is primary offline store
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  // Daily Automated Facebook Marketing Ticker & Sync (IST)
  useEffect(() => {
    let isCancelled = false;

    const checkDailyFbMarketing = async () => {
      const currentSched = getDailyFbSchedule();
      const todayIST = getISTDateStr();

      // 1. Sync with Express backend scheduler first (picks up headless auto-posts)
      let latestSched = currentSched;
      let serverHasToken = false;
      try {
        const res = await fetch('/api/facebook/schedule');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            serverHasToken = Boolean(data.hasToken);
            if (data.lastPostedDate && (!currentSched.lastPostedDate || data.lastPostedDate > currentSched.lastPostedDate)) {
              latestSched = saveDailyFbSchedule({
                ...currentSched,
                lastPostedDate: data.lastPostedDate,
                lastPostUrl: data.lastPostUrl || currentSched.lastPostUrl,
                logs: Array.isArray(data.logs) && data.logs.length > 0 ? data.logs : currentSched.logs
              });
            }
          }
        }
      } catch {
        // Offline / portable mode — continue with local schedule cleanly
      }

      if (isCancelled) return;
      setDailyFbSchedule(latestSched);

      // 2. If enabled + past scheduled postTime + not yet posted today + Meta token configured -> run silently once!
      const hasClientToken = Boolean(config.facebookPageAccessToken && config.facebookPageAccessToken.trim().length > 15);
      if (isDailyFbPostDueNow(latestSched) && (hasClientToken || serverHasToken) && latestSched.lastPostedDate !== todayIST) {
        try {
          const plan = getTodaysFbPlan(latestSched, config.facebookPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/');
          const runRes = await fetch('/api/facebook/run-daily-now', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dayIndex: plan.dayIndex,
              markAsPosted: true,
              customCaption: plan.caption
            })
          });
          const runData = await runRes.json().catch(() => null);
          if (!isCancelled && runData && runData.success && runData.mode === 'graph_api') {
            const updated = appendDailyFbPostLog(
              latestSched,
              runData.log || {
                id: `fb-auto-${Date.now()}`,
                date: todayIST,
                timestamp: Date.now(),
                dayIndex: plan.dayIndex,
                posterType: plan.posterType,
                titleBn: plan.titleBn,
                caption: plan.caption,
                mode: 'graph_api',
                status: 'published',
                postId: runData.postId,
                postUrl: runData.postUrl
              },
              true
            );
            setDailyFbSchedule(updated);
            setDailyFbPublishedToast(
              lang === 'bn'
                ? `✅ আজকের ডেইলি ফেসবুক পোস্ট ("${plan.titleBn}") স্বয়ংক্রিয়ভাবে লাইভ হয়েছে!`
                : `✅ Today's scheduled Facebook post ("${plan.titleEn}") went live automatically!`
            );
            setTimeout(() => setDailyFbPublishedToast(null), 8000);
          }
        } catch {
          // Safe silent skip when offline
        }
      } else if (
        isDailyFbPostDueNow(latestSched) &&
        !hasClientToken &&
        !serverHasToken &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        localStorage.getItem('dcc_fb_notif_sent_date') !== todayIST
      ) {
        try {
          const plan = getTodaysFbPlan(latestSched, config.facebookPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/');
          localStorage.setItem('dcc_fb_notif_sent_date', todayIST);
          new Notification('DELICIOUS CAKE CORNER • Daily Facebook Post Ready', {
            body: `${plan.titleBn} — ১-ক্লিকে ফেসবুকে পোস্ট করতে ক্লিক করুন।`
          });
        } catch {
          // Safe ignore if notification blocked
        }
      }
    };

    const initTimer = setTimeout(() => {
      checkDailyFbMarketing().catch(() => {});
    }, 2500);
    const interval = setInterval(() => {
      checkDailyFbMarketing().catch(() => {});
    }, 60_000);

    return () => {
      isCancelled = true;
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [config.facebookPageAccessToken, config.facebookPageUrl, lang]);

  const handleQuickPostDailyFromBanner = async () => {
    const fbUrl = config.facebookPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/';
    const todayIST = getISTDateStr();
    const plan = getTodaysFbPlan(dailyFbSchedule, fbUrl);

    try {
      await navigator.clipboard.writeText(plan.caption);
    } catch {
      // Clipboard fallback safe
    }

    let sharedNatively = false;
    try {
      const res = await fetch(plan.posterUrl);
      const blob = await res.blob();
      const file = new File([blob], `DCC_Daily_${plan.dayNameEn}_Poster.jpg`, { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Delicious Cake Corner Ghatal',
          text: plan.caption
        });
        sharedNatively = true;
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `DCC_Daily_${plan.dayNameEn}_Poster.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }
    } catch {
      // Safe fallback
    }

    if (!sharedNatively) {
      try {
        window.open(fbUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // Safe ignore
      }
    }

    const updated = appendDailyFbPostLog(
      dailyFbSchedule,
      {
        id: `fb-daily-${Date.now()}`,
        date: todayIST,
        timestamp: Date.now(),
        dayIndex: plan.dayIndex,
        posterType: plan.posterType,
        titleBn: plan.titleBn,
        caption: plan.caption,
        mode: 'manual_composer',
        status: 'published',
        postUrl: fbUrl
      },
      true
    );
    setDailyFbSchedule(updated);
    fetch('/api/facebook/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastPostedDate: todayIST })
    }).catch(() => {});

    setDailyFbPublishedToast(
      lang === 'bn'
        ? `✅ আজকের পোস্টার ডাউনলোড ও বাংলা ক্যাপশন কপি হয়েছে! ফেসবুক পেজে শুধু Paste করে Post দিন।`
        : `✅ Poster downloaded & caption copied! Just Paste & Post on your Facebook Page.`
    );
    setTimeout(() => setDailyFbPublishedToast(null), 9000);
  };

  const handleLangChange = (newLang: Language) => {
    setLangState(newLang);
    setSavedLanguage(newLang);
  };

  const refreshBills = () => {
    setBills(getBills());
  };

  const handleDeleteBill = async (billId: string) => {
    localStorage.setItem('dcc_sample_initialized_v2', 'true');
    deleteBill(billId);
    setBills((prev) => prev.filter((b) => b.id !== billId));
    try {
      await deleteBillFromFirestore(billId);
    } catch (err) {
      console.warn('Firestore delete notice:', err);
    }
  };

  const handlePrintRequested = (bill: Bill, format: ReceiptFormat) => {
    setActivePrintBill(bill);
    setPrintFormat(format);
    setIsPrintModalOpen(true);
    refreshBills();
  };

  const handleReprintFromHistory = (bill: Bill) => {
    const activeDev = (config.printerDevices || []).find((d) => d.id === config.activePrinterId);
    let resolvedFmt: ReceiptFormat = config.receiptFormat || 'thermal';
    if (activeDev?.paperWidth === 'a4') resolvedFmt = 'standard';
    else if (activeDev?.paperWidth === 'a5') resolvedFmt = 'standardA5';
    else if (activeDev?.paperWidth === '58mm') resolvedFmt = 'thermal58';
    else if (activeDev?.paperWidth === 'kot') resolvedFmt = 'kot';
    setActivePrintBill(bill);
    setPrintFormat(resolvedFmt);
    setIsPrintModalOpen(true);
  };

  const handleQuickNewBill = () => {
    setFormOrderData(null);
    setDeliveryData(null);
    setEditingBill(null);
    const nextSeq = getNextBillSequence(bills);
    setBillSequence(nextSeq);
    setCurrentTab('billing');
  };

  // Callback from BakeryMap to apply delivery drop point to bill
  const handleApplyDeliveryToBill = (address: string, distanceKm: number, deliveryFee: number) => {
    setDeliveryData({ address, distanceKm, deliveryFee });
    setCurrentTab('billing');
  };

  // Callback from Google Forms to convert an online submission to bill
  const handleSelectFormOrderForBilling = (order: {
    customerName: string;
    customerMobile: string;
    productName: string;
    weight: string;
    cakeMessage: string;
    deliveryDate: string;
  }) => {
    setFormOrderData(order);
    setCurrentTab('billing');
  };

  const handleSelectCustomerForBilling = (customer: CustomerLoyalty) => {
    setFormOrderData({
      customerName: customer.customerName,
      customerMobile: customer.customerMobile,
      productName: '',
      weight: '1.0 lb',
      cakeMessage: '',
      deliveryDate: ''
    });
    setCurrentTab('billing');
  };

  const handleRoleLogin = (session: AppUserSession) => {
    setUserSession(session);
    saveUserSession(session);
    if (session.role === 'distributor') {
      setCurrentTab('distributor');
    } else if (session.role === 'counter') {
      if (currentTab === 'settings' || currentTab === 'stock' || currentTab === 'catalog') {
        setCurrentTab('billing');
      }
    }
  };

  const handleSelectRole = (role: UserRole) => {
    setLoginModalRole(role);
    setIsRoleLoginOpen(true);
  };

  const handleAppLoginSuccess = (session: AppUserSession, rememberDevice: boolean) => {
    markAppLoggedIn(rememberDevice);
    handleRoleLogin(session);
    setIsAppAuthenticated(true);
  };

  const handleAppLogout = () => {
    markAppLoggedOut();
    setIsRoleLoginOpen(false);
    setIsStaffManagerOpen(false);
    setIsAppAuthenticated(false);
  };

  if (!isAppAuthenticated) {
    return (
      <AppLoginScreen
        config={config}
        lang={lang}
        onLangChange={handleLangChange}
        onLoginSuccess={handleAppLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f4] text-slate-800 flex flex-col font-sans">
      <div className="no-print flex-1 flex flex-col">
        {/* Top Bar Contract Compliant Header */}
        <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
        setLang={handleLangChange}
        onQuickNewBill={handleQuickNewBill}
        config={config}
        userSession={userSession}
        onOpenRoleLogin={() => setIsRoleLoginOpen(true)}
        onSelectRole={handleSelectRole}
        onOpenPlayStore={() => setIsPlayStoreModalOpen(true)}
        onOpenDailySummary={() => setIsDailySummaryOpen(true)}
        onOpenMultiSystem={() => setIsMultiSystemModalOpen(true)}
        onOpenPrinterManager={() => setIsPrinterManagerOpen(true)}
        onOpenCloudBackup={() => setIsCloudBackupOpen(true)}
        onOpenQrHub={() => setIsQrHubOpen(true)}
        onOpenAutoMarketing={() => setIsAdsHubOpen(true)}
        onOpenStaffManager={() => setIsStaffManagerOpen(true)}
        onOpenRunFileManager={() => setIsRunFileManagerOpen(true)}
        onLogout={handleAppLogout}
        dailyFbDue={isDailyFbPostDueNow(dailyFbSchedule)}
        dailyFbEnabled={dailyFbSchedule.enabled}
      />

      {/* Non-blocking Daily Facebook Autopilot Reminder / Live Toast */}
      {dailyFbPublishedToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-3 shadow-sm">
          <span>{dailyFbPublishedToast}</span>
          <button
            type="button"
            onClick={() => setDailyFbPublishedToast(null)}
            className="px-2 py-0.5 rounded bg-black/20 hover:bg-black/30 text-[11px] font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {!dailyFbPublishedToast &&
        isDailyFbPostDueNow(dailyFbSchedule) &&
        dailyFbDismissedDate !== getISTDateStr() &&
        userSession.role === 'admin' && (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-[#4b1d3f] text-white px-4 py-2 border-b border-amber-400/30 shadow-xs">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase animate-pulse shrink-0">
                  Daily FB Post Ready
                </span>
                <span className="truncate font-semibold text-amber-100">
                  {lang === 'bn'
                    ? `আজকের ডেইলি ফেসবুক প্রচার: "${getTodaysFbPlan(dailyFbSchedule, config.facebookPageUrl).titleBn}"`
                    : `Today's scheduled Facebook promo: "${getTodaysFbPlan(dailyFbSchedule, config.facebookPageUrl).titleEn}"`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleQuickPostDailyFromBanner}
                  className="px-3 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[11px] transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? '🚀 ১-ক্লিকে এখনই পোস্ট করুন' : '🚀 1-Click Post Now'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdsHubOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold cursor-pointer"
                >
                  {lang === 'bn' ? 'শিডিউল দেখুন' : 'View Hub'}
                </button>
                <button
                  type="button"
                  onClick={() => setDailyFbDismissedDate(getISTDateStr())}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-bold cursor-pointer"
                >
                  {lang === 'bn' ? 'পরে' : 'Later'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentTab === 'billing' && (
          <BillingScreen
            config={config}
            setConfig={setConfig}
            products={products}
            bills={bills}
            lang={lang}
            billSequence={billSequence}
            setBillSequence={setBillSequence}
            onViewHistory={() => setCurrentTab('history')}
            onPrintRequested={handlePrintRequested}
            onOpenDailySummary={() => setIsDailySummaryOpen(true)}
            onOpenPrinterManager={() => setIsPrinterManagerOpen(true)}
            initialOrderData={formOrderData}
            initialDeliveryData={deliveryData}
            editingBill={editingBill}
            onCancelEditBill={() => setEditingBill(null)}
            userSession={userSession}
            onOpenQrHub={() => setIsQrHubOpen(true)}
          />
        )}

        {currentTab === 'history' && (
          <BillHistory
            bills={bills}
            config={config}
            lang={lang}
            onRefresh={refreshBills}
            onReprintBill={handleReprintFromHistory}
            onEditBill={(bill) => {
              setEditingBill(bill);
              setCurrentTab('billing');
            }}
            onOpenDailySummary={() => setIsDailySummaryOpen(true)}
            onOpenPrinterManager={() => setIsPrinterManagerOpen(true)}
            setConfig={setConfig}
            userSession={userSession}
            onDeleteBill={handleDeleteBill}
          />
        )}

        {currentTab === 'catalog' && (
          <CatalogManager
            products={products}
            setProducts={setProducts}
            lang={lang}
          />
        )}

        {currentTab === 'stock' && (
          <StockManagement
            products={products}
            setProducts={setProducts}
            config={config}
            lang={lang}
          />
        )}

        {currentTab === 'crm' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <CustomerCRM
              bills={bills}
              config={config}
              lang={lang}
              onSelectCustomerForBilling={handleSelectCustomerForBilling}
              onViewBillInHistory={(_billNo) => {
                setCurrentTab('history');
              }}
            />
          </div>
        )}

        {currentTab === 'map' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <BakeryMap
              config={config}
              onApplyDelivery={handleApplyDeliveryToBill}
            />
          </div>
        )}

        {currentTab === 'distributor' && (
          <DistributorDashboard
            bills={bills}
            config={config}
            lang={lang}
            userSession={userSession}
            onUpdateBill={(updatedBill: Bill) => {
              setBills((prev) => prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)));
            }}
            onOpenMap={() => setCurrentTab('map')}
            onPrintDeliverySlip={(bill: Bill) => {
              setActivePrintBill(bill);
              setPrintFormat('thermal');
              setIsPrintModalOpen(true);
            }}
          />
        )}

        {currentTab === 'workspace' && (
          <WorkspaceView
            bills={bills}
            config={config}
            onRestoreSuccess={refreshBills}
            onSelectFormOrderForBilling={handleSelectFormOrderForBilling}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsModal
            config={config}
            setConfig={setConfig}
            lang={lang}
            onOpenPrinterManager={() => setIsPrinterManagerOpen(true)}
            onOpenCloudBackup={() => setIsCloudBackupOpen(true)}
            onOpenQrHub={() => setIsQrHubOpen(true)}
            onOpenStaffManager={() => setIsStaffManagerOpen(true)}
            userSession={userSession}
          />
        )}
      </main>
      </div>

      {/* Print Preview & Action Modal */}
      {activePrintBill && (
        <PrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          bill={activePrintBill}
          config={config}
          lang={lang}
          initialFormat={printFormat}
          onFormatChange={(fmt) => setPrintFormat(fmt)}
          onOpenPrinterManager={() => {
            setIsPrintModalOpen(false);
            setIsPrinterManagerOpen(true);
          }}
        />
      )}

      {/* Dedicated Print Only Container for window.print() — pre-rendered off-screen so logo & QR decode cleanly */}
      {activePrintBill && (
        <div id="print-only-container" className="print-only print:block print:w-full">
          <PrintBillView
            bill={activePrintBill}
            config={config}
            lang={lang}
            formatOverride={printFormat}
          />
        </div>
      )}

      {/* Google Play Store & Android App Companion Modal */}
      <PlayStoreModal
        isOpen={isPlayStoreModalOpen}
        onClose={() => setIsPlayStoreModalOpen(false)}
      />

      {/* Daily Sales Summary Modal */}
      <DailySalesSummaryModal
        isOpen={isDailySummaryOpen}
        onClose={() => setIsDailySummaryOpen(false)}
        bills={bills}
        config={config}
        lang={lang}
      />

      {/* Multiple System POS Terminal Network Modal */}
      <MultiSystemModal
        isOpen={isMultiSystemModalOpen}
        onClose={() => setIsMultiSystemModalOpen(false)}
        config={config}
        onConfigUpdate={(newCfg) => setConfig(newCfg)}
        lang={lang}
      />

      {/* All Printers & POS Hardware Fleet Management Modal */}
      <PrinterManagerModal
        isOpen={isPrinterManagerOpen}
        onClose={() => setIsPrinterManagerOpen(false)}
        config={config}
        onConfigUpdate={(newCfg) => setConfig(newCfg)}
        lang={lang}
      />

      {/* 3-Role Login & Switcher Modal: Admin, Counter, Distributor */}
      <RoleLoginModal
        isOpen={isRoleLoginOpen}
        onClose={() => setIsRoleLoginOpen(false)}
        currentSession={userSession}
        onLogin={handleRoleLogin}
        lang={lang}
        config={config}
        initialRole={loginModalRole}
        onOpenStaffManager={() => setIsStaffManagerOpen(true)}
      />
      {/* Manual Cloud Backup Safeguard Modal */}
      <CloudBackupModal
        isOpen={isCloudBackupOpen}
        onClose={() => setIsCloudBackupOpen(false)}
        config={config}
        lang={lang}
        onRestoreSuccess={refreshBills}
      />

      {/* Bakery QR Code Studio & Standee Hub (100% Dedicated to QR Codes) */}
      <BakeryQrHubModal
        isOpen={isQrHubOpen}
        onClose={() => setIsQrHubOpen(false)}
        config={config}
        lang={lang}
        onConfigUpdate={(newCfg) => setConfig(newCfg)}
        onSelectCustomerForBilling={handleSelectCustomerForBilling}
      />

      {/* 100% Standalone Facebook & Google Automated Marketing Hub */}
      <FacebookAdsHubModal
        isOpen={isAdsHubOpen}
        onClose={() => setIsAdsHubOpen(false)}
        config={config}
        lang={lang}
        onConfigUpdate={(newCfg) => setConfig(newCfg)}
        initialTab="daily"
        onScheduleUpdate={(sched) => setDailyFbSchedule(sched)}
      />

      {/* Admin Granular Staff & Role Permission Manager */}
      <StaffPermissionManagerModal
        isOpen={isStaffManagerOpen}
        onClose={() => setIsStaffManagerOpen(false)}
        config={config}
        onConfigUpdate={(newCfg) => setConfig(newCfg)}
        lang={lang}
        currentSession={userSession}
        onSwitchStaff={(newSession) => {
          setUserSession(newSession);
          saveUserSession(newSession);
        }}
      />

      {/* Windows 1-Click Run File & Multi-Device Launch Guide Modal */}
      <RunFileManagerModal
        isOpen={isRunFileManagerOpen}
        onClose={() => setIsRunFileManagerOpen(false)}
        config={config}
        lang={lang}
        currentSession={userSession}
        onSessionChange={(newSession) => {
          setUserSession(newSession);
          saveUserSession(newSession);
        }}
        onConfigUpdate={(newCfg) => setConfig(newCfg)}
      />
    </div>
  );
}
