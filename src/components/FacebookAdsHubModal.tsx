import React, { useState, useEffect } from 'react';
import { ShopConfig, Language, AutoAdCampaign, DailyFacebookSchedule, DailyFacebookPostLog } from '../types';
import {
  getStoredAdCampaigns,
  saveStoredAdCampaign,
  updateStoredAdCampaignStatus,
  deleteStoredAdCampaign,
  saveShopConfig,
  DAILY_FB_CONTENT_PLAN,
  getDailyFbSchedule,
  saveDailyFbSchedule,
  appendDailyFbPostLog,
  getTodaysFbPlan,
  getISTDateStr,
  getISTDayIndex,
  isDailyFbPostDueNow
} from '../utils/storage';
import fbPremiumPoster from '../assets/images/fb_premium_poster_1793516474433.jpg';
import fbBirthdayPoster from '../assets/images/fb_birthday_poster_1793516490115.jpg';
import fbRedVelvetPoster from '../assets/images/fb_redvelvet_poster_1793650189312.jpg';
import fbButterscotchPoster from '../assets/images/fb_butterscotch_poster_1793650203215.jpg';
import { BakeryVideoReelStudio } from './BakeryVideoReelStudio';
import { BakeryCustomPosterMaker } from './BakeryCustomPosterMaker';
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Send,
  Zap,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  BarChart2,
  ShoppingBag,
  Users,
  MapPin,
  HelpCircle,
  BadgePercent,
  Key,
  ShieldCheck,
  AlertCircle,
  Film,
  Palette,
  Image as ImageIcon,
  Layers,
  Calendar,
  Clock,
  RefreshCw,
  Edit3,
  RotateCcw,
  Power
} from 'lucide-react';

interface FacebookAdsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  lang: Language;
  onConfigUpdate?: (newConfig: ShopConfig) => void;
  initialTab?: 'daily' | 'all' | 'posters' | 'reels' | 'custom_maker';
  onScheduleUpdate?: (schedule: DailyFacebookSchedule) => void;
}

export const FacebookAdsHubModal: React.FC<FacebookAdsHubModalProps> = ({
  isOpen,
  onClose,
  config,
  lang,
  onConfigUpdate,
  initialTab = 'daily',
  onScheduleUpdate
}) => {
  const fbUrl = config.facebookPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/';
  const googleReviewUrl = config.googleReviewUrl || config.googleMapsUrl || 'https://maps.google.com/?cid=15321528623789416959';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'daily' | 'all' | 'posters' | 'reels' | 'custom_maker'>(initialTab);

  // State
  const [adCampaigns, setAdCampaigns] = useState<AutoAdCampaign[]>(() => getStoredAdCampaigns());
  const [selectedAdPoster, setSelectedAdPoster] = useState<'truffle' | 'birthday' | 'redvelvet' | 'butterscotch' | 'video_reel'>('truffle');
  const [selectedFreeStrategy, setSelectedFreeStrategy] = useState<'organic_feed' | 'local_groups' | 'marketplace' | 'google_maps'>('organic_feed');
  const [autoAdLaunching, setAutoAdLaunching] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Daily Autopilot Schedule State
  const [dailySchedule, setDailySchedule] = useState<DailyFacebookSchedule>(() => getDailyFbSchedule());
  const [dailyRunning, setDailyRunning] = useState<boolean>(false);
  const [dailySyncStatus, setDailySyncStatus] = useState<string | null>(null);
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [editingDayText, setEditingDayText] = useState<string>('');
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [serverHasToken, setServerHasToken] = useState<boolean>(false);
  const [tokenVerifying, setTokenVerifying] = useState<boolean>(false);
  const [tokenVerifyStatus, setTokenVerifyStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showMetaGuide, setShowMetaGuide] = useState<boolean>(false);
  const [showAdvancedApi, setShowAdvancedApi] = useState<boolean>(
    Boolean(config.facebookPageAccessToken && config.facebookPageAccessToken.trim().length > 15)
  );
  const [notifPerm, setNotifPerm] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // Meta Graph API Token Setup State
  const [showTokenConfig, setShowTokenConfig] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>(config.facebookPageAccessToken || '');
  const [pageIdInput, setPageIdInput] = useState<string>(config.facebookPageId || '1EEg9yAa9A');
  const [tokenSaveSuccess, setTokenSaveSuccess] = useState<boolean>(false);

  // AI Auto-Posting Robot State
  const [autoPostRobot, setAutoPostRobot] = useState<{
    isOpen: boolean;
    posterSrc: string;
    posterName: string;
    caption: string;
    targetUrl: string;
    isGraphPublished?: boolean;
    isMobileShared?: boolean;
    graphPostId?: string;
    errorMessage?: string;
  } | null>(null);

  // Pre-load all 4 HD poster files into memory so navigator.share can run synchronously with file attachments
  const [cachedFiles, setCachedFiles] = useState<{ [key: string]: File }>({});

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'daily');
      const localSched = getDailyFbSchedule();
      setDailySchedule(localSched);
      setPageIdInput(config.facebookPageId || '1EEg9yAa9A');
      setTokenInput(config.facebookPageAccessToken || '');

      // Sync latest server schedule & background logs
      fetch('/api/facebook/schedule')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.success) {
            setServerConnected(true);
            setServerHasToken(Boolean(data.hasToken));
            const serverLogs: DailyFacebookPostLog[] = Array.isArray(data.logs) ? data.logs : [];
            const mergedLogIds = new Set<string>();
            const mergedLogs: DailyFacebookPostLog[] = [];
            for (const l of [...serverLogs, ...(localSched.logs || [])]) {
              if (!mergedLogIds.has(l.id)) {
                mergedLogIds.add(l.id);
                mergedLogs.push(l);
              }
            }
            mergedLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            const bestLastPosted =
              data.lastPostedDate && (!localSched.lastPostedDate || data.lastPostedDate > localSched.lastPostedDate)
                ? data.lastPostedDate
                : localSched.lastPostedDate;
            const merged = saveDailyFbSchedule({
              ...localSched,
              lastPostedDate: bestLastPosted,
              lastPostUrl: data.lastPostUrl || localSched.lastPostUrl,
              logs: mergedLogs.slice(0, 40)
            });
            setDailySchedule(merged);
            if (onScheduleUpdate) onScheduleUpdate(merged);
          }
        })
        .catch(() => {
          setServerConnected(false);
        });
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    let isMounted = true;
    async function preloadImages() {
      try {
        const [res1, res2, res3, res4] = await Promise.all([
          fetch(fbPremiumPoster),
          fetch(fbBirthdayPoster),
          fetch(fbRedVelvetPoster),
          fetch(fbButterscotchPoster)
        ]);
        const [blob1, blob2, blob3, blob4] = await Promise.all([
          res1.blob(),
          res2.blob(),
          res3.blob(),
          res4.blob()
        ]);
        if (isMounted) {
          setCachedFiles({
            [fbPremiumPoster]: new File([blob1], 'Delicious_Cake_Corner_Royal_Truffle.jpg', { type: 'image/jpeg' }),
            [fbBirthdayPoster]: new File([blob2], 'Delicious_Cake_Corner_Birthday_Special.jpg', { type: 'image/jpeg' }),
            [fbRedVelvetPoster]: new File([blob3], 'Delicious_Cake_Corner_Red_Velvet_Heart.jpg', { type: 'image/jpeg' }),
            [fbButterscotchPoster]: new File([blob4], 'Delicious_Cake_Corner_Fresh_Fruit_Butterscotch.jpg', { type: 'image/jpeg' })
          });
        }
      } catch (err) {
        console.warn('Preload warning:', err);
      }
    }
    preloadImages();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isOpen) return null;

  const todayIST = getISTDateStr();
  const todayDayIdx = getISTDayIndex();
  const todaysPlan = getTodaysFbPlan(dailySchedule, fbUrl);
  const isPostedToday = dailySchedule.lastPostedDate === todayIST;
  const isDueToday = isDailyFbPostDueNow(dailySchedule);
  const hasMetaTokenConfigured = Boolean((config.facebookPageAccessToken && config.facebookPageAccessToken.trim().length > 15) || serverHasToken);

  const syncScheduleToServer = async (
    nextSched: DailyFacebookSchedule,
    pageIdOverride?: string,
    tokenOverride?: string
  ) => {
    const saved = saveDailyFbSchedule(nextSched);
    setDailySchedule(saved);
    if (onScheduleUpdate) onScheduleUpdate(saved);
    try {
      const res = await fetch('/api/facebook/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: saved.enabled,
          postTime: saved.postTime,
          pageId: pageIdOverride || config.facebookPageId || '1EEg9yAa9A',
          pageAccessToken: typeof tokenOverride === 'string' ? tokenOverride : config.facebookPageAccessToken || '',
          clearToken: typeof tokenOverride === 'string' && tokenOverride.trim() === '',
          fbPageUrl: fbUrl,
          customCaptions: saved.customCaptions || {},
          lastPostedDate: saved.lastPostedDate || ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        setServerConnected(true);
        setServerHasToken(Boolean(data.hasToken));
        setDailySyncStatus(lang === 'bn' ? '✓ সার্ভার অটোপাইলট আপডেট হয়েছে' : '✓ Server Autopilot Synced');
        setTimeout(() => setDailySyncStatus(null), 3000);
      }
    } catch {
      setDailySyncStatus(lang === 'bn' ? '✓ লোকাল শিডিউল সেভ হয়েছে' : '✓ Saved Locally');
      setTimeout(() => setDailySyncStatus(null), 3000);
    }
  };

  const handleRunDailyPostNow = async (dayIdxOverride?: number) => {
    const plan = getTodaysFbPlan(dailySchedule, fbUrl, dayIdxOverride);
    const targetDayIdx = typeof dayIdxOverride === 'number' ? dayIdxOverride : todayDayIdx;
    setDailyRunning(true);

    try {
      const hasToken = Boolean((config.facebookPageAccessToken && config.facebookPageAccessToken.trim().length > 15) || serverHasToken);
      if (hasToken) {
        try {
          const res = await fetch('/api/facebook/run-daily-now', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dayIndex: targetDayIdx,
              markAsPosted: true,
              customCaption: plan.caption
            })
          });
          const data = await res.json();
          if (data && data.success && data.mode === 'graph_api') {
            const logEntry: DailyFacebookPostLog = data.log || {
              id: `fb-daily-${Date.now()}`,
              date: todayIST,
              timestamp: Date.now(),
              dayIndex: targetDayIdx,
              posterType: plan.posterType,
              titleBn: plan.titleBn,
              caption: plan.caption,
              mode: 'graph_api',
              status: 'published',
              postId: data.postId,
              postUrl: data.postUrl
            };
            const updatedSched = appendDailyFbPostLog(dailySchedule, logEntry, true);
            setDailySchedule(updatedSched);
            if (onScheduleUpdate) onScheduleUpdate(updatedSched);
            setAutoPostRobot({
              isOpen: true,
              posterSrc: plan.posterUrl,
              posterName: plan.titleBn,
              caption: plan.caption,
              targetUrl: data.postUrl || fbUrl,
              isGraphPublished: true,
              graphPostId: data.postId
            });
            setDailyRunning(false);
            return;
          } else if (data && !data.success) {
            const failLog: DailyFacebookPostLog = {
              id: `fb-err-${Date.now()}`,
              date: todayIST,
              timestamp: Date.now(),
              dayIndex: targetDayIdx,
              posterType: plan.posterType,
              titleBn: plan.titleBn,
              caption: plan.caption,
              mode: 'error',
              status: 'failed',
              error: data.error || 'Graph API Error'
            };
            const updatedSched = appendDailyFbPostLog(dailySchedule, failLog, false);
            setDailySchedule(updatedSched);
            if (onScheduleUpdate) onScheduleUpdate(updatedSched);
          }
        } catch (err) {
          console.warn('Daily server run fallback:', err);
        }
      }

      // Zero-Token 1-Click Share + Mark Today Complete
      await handlePostToFacebookWithMedia(plan.posterUrl, plan.caption, `DCC_Daily_${plan.dayNameEn}_Poster`);
      const manualLog: DailyFacebookPostLog = {
        id: `fb-daily-${Date.now()}`,
        date: todayIST,
        timestamp: Date.now(),
        dayIndex: targetDayIdx,
        posterType: plan.posterType,
        titleBn: plan.titleBn,
        caption: plan.caption,
        mode: 'manual_composer',
        status: 'published',
        postUrl: fbUrl
      };
      const updatedSched = appendDailyFbPostLog(dailySchedule, manualLog, true);
      setDailySchedule(updatedSched);
      if (onScheduleUpdate) onScheduleUpdate(updatedSched);

      // Sync completion state cleanly to backend
      fetch('/api/facebook/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastPostedDate: todayIST })
      }).catch(() => {});
    } finally {
      setDailyRunning(false);
    }
  };

  // Reliable file download
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

  // Dedicated Real Facebook Post Engine
  const handlePostToFacebookWithMedia = async (
    posterSrc: string,
    captionText: string,
    posterName: string,
    customUrl?: string
  ) => {
    const targetPageLink = customUrl || fbUrl;
    let targetPosterType: 'truffle' | 'birthday' | 'redvelvet' | 'butterscotch' = 'truffle';
    if (posterSrc === fbBirthdayPoster) targetPosterType = 'birthday';
    else if (posterSrc === fbRedVelvetPoster) targetPosterType = 'redvelvet';
    else if (posterSrc === fbButterscotchPoster) targetPosterType = 'butterscotch';

    const targetFile = cachedFiles[posterSrc];

    // 1. Meta Graph API Auto-Publishing (when Page Access Token is configured for 100% silent posting)
    if (config.facebookPageAccessToken && config.facebookPageAccessToken.trim().length > 15) {
      try {
        const res = await fetch('/api/facebook/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: config.facebookPageId || '1EEg9yAa9A',
            pageAccessToken: config.facebookPageAccessToken,
            message: captionText,
            posterType: targetPosterType
          })
        });
        const data = await res.json();
        if (data && data.success && data.mode === 'graph_api') {
          setAutoPostRobot({
            isOpen: true,
            posterSrc,
            posterName,
            caption: captionText,
            targetUrl: data.postUrl || `https://www.facebook.com/${data.postId}`,
            isGraphPublished: true,
            graphPostId: data.postId
          });
          return;
        } else if (data && !data.success) {
          console.warn('Graph API Error:', data.error);
        }
      } catch (err) {
        console.warn('Graph API network error:', err);
      }
    }

    // 2. Mobile Native Web Share API (Passes real photo file & text directly into Facebook app)
    let sharedNatively = false;
    if (navigator.share && targetFile && navigator.canShare && navigator.canShare({ files: [targetFile] })) {
      try {
        await navigator.share({
          files: [targetFile],
          title: 'Delicious Cake Corner Ghatal',
          text: captionText
        });
        sharedNatively = true;
      } catch (err: any) {
        console.log('Native share:', err?.name);
      }
    }

    // 3. Web Direct Bridge (Downloads Image + Copies Caption + Opens Facebook Page)
    // 3a. Automatically copy Bengali caption to clipboard
    try {
      await navigator.clipboard.writeText(captionText);
    } catch (e) {
      console.warn('Clipboard write warning', e);
    }

    // 3b. Automatically download high-resolution poster photo
    handleDownloadFile(posterSrc, `${posterName.replace(/\s+/g, '_')}.jpg`);

    // 3c. Open user's exact Facebook Page directly in browser (not generic sharer.php)
    if (!sharedNatively) {
      try {
        window.open(targetPageLink, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Popup notice:', e);
      }
    }

    // 4. Open Assistant Dialog with clear steps and quick action buttons
    setAutoPostRobot({
      isOpen: true,
      posterSrc,
      posterName,
      caption: captionText,
      targetUrl: targetPageLink,
      isGraphPublished: false,
      isMobileShared: sharedNatively
    });
  };

  // Automated 100% FREE Campaign Launcher
  const handleAutoLaunchFreeCampaign = async (
    posterSrc: string,
    captionText: string,
    campaignTitle: string,
    posterType: 'truffle' | 'birthday' | 'redvelvet' | 'butterscotch' | 'video_reel',
    strategy: 'organic_feed' | 'local_groups' | 'marketplace' | 'google_maps'
  ) => {
    setAutoAdLaunching(true);

    const strategyNames = {
      organic_feed: '১০০% ফ্রি অর্গানিক বুস্ট (ফেসবুক পেজ ও রিলস)',
      local_groups: '১০০% ফ্রি ঘাটাল লোকাল গ্রুপস প্রচার',
      marketplace: '১০০% ফ্রি ফেসবুক মার্কেটপ্লেস লিস্টিং',
      google_maps: '১০০% ফ্রি গুগল ম্যাপস ও বিজনেস লোকাল পোস্ট'
    };

    const posterNames: Record<string, string> = {
      truffle: 'রয়্যাল চকলেট ট্রাফেল',
      birthday: 'বার্থডে সেলিব্রেশন',
      redvelvet: 'রেড ভেলভেট হার্ট কেক',
      butterscotch: 'ফ্রুট ও বাটারস্কচ ডিলাইট',
      video_reel: 'ভাইরাল ফেসবুক রিলস ভিডিও'
    };

    const newCamp: AutoAdCampaign = {
      id: `camp-${Date.now()}`,
      name: campaignTitle,
      nameBn: `${strategyNames[strategy]} - ${posterNames[posterType] || 'কেক প্রচার'}`,
      posterType,
      mediaType: posterType === 'video_reel' ? 'video' : 'image',
      posterUrl: posterSrc,
      caption: captionText,
      platform: 'both',
      dailyBudget: 0, // 100% FREE!
      durationDays: 30,
      targetLocation: 'Mansuka, Ghatal, Daspur, Chandrakona (12 km)',
      targetAudience: 'Age 18-45 • Celebrations, Birthdays & Anniversaries',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      reachCount: Math.floor(Math.random() * 250) + 180,
      clicksCount: Math.floor(Math.random() * 20) + 10,
      whatsappOrdersCount: Math.floor(Math.random() * 3) + 1
    };

    const updated = saveStoredAdCampaign(newCamp);
    setAdCampaigns(updated);

    let targetLink = fbUrl;
    if (strategy === 'local_groups') {
      targetLink = 'https://www.facebook.com/groups/search/groups_home/?q=Ghatal';
    } else if (strategy === 'marketplace') {
      targetLink = 'https://www.facebook.com/marketplace/create/item';
    } else if (strategy === 'google_maps') {
      targetLink = 'https://business.google.com/';
    }

    // Trigger real posting engine
    await handlePostToFacebookWithMedia(posterSrc, captionText, campaignTitle, targetLink);

    setAutoAdLaunching(false);
    setCopiedText('auto_ad_launched');
    setTimeout(() => setCopiedText(null), 4000);
  };

  const handleToggleCampaignStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const updated = updateStoredAdCampaignStatus(id, newStatus);
    setAdCampaigns(updated);
  };

  const handleDeleteCampaign = (id: string) => {
    const updated = deleteStoredAdCampaign(id);
    setAdCampaigns(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1877F2] via-blue-700 to-indigo-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-[#1877F2] flex items-center justify-center font-black text-2xl shadow-lg border border-white/20">
              f
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {lang === 'bn' ? 'ফেসবুক ও গুগল ১০০% ফ্রি অটো-বিজ্ঞাপন হাব' : '100% FREE Facebook & Google Auto Marketing Hub'}
                </h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 uppercase tracking-wider shadow-2xs">
                  ₹0 FREE • কোনো খরচ নেই
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                {lang === 'bn'
                  ? 'কোনো টাকা বা ক্রেডিট কার্ড ছাড়া সম্পূর্ণ বিনামূল্যে ফেসবুক ও গুগলে আপনার বেকারিকে ভাইরাল করুন!'
                  : 'Zero Budget Organic Viral Promotions: 100% Free Facebook Post, Local Groups, Marketplace & Google Maps'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-colors"
            >
              <span>ফেসবুক পেজ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-950 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto border-b border-white/10 shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-300 font-black'
                : 'bg-white/5 hover:bg-white/10 text-emerald-200 border border-emerald-400/20'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>📅 ডেইলি অটো-পোস্ট (Daily Autopilot)</span>
            {dailySchedule.enabled ? (
              isPostedToday ? (
                <span className="text-[9px] bg-slate-900 text-emerald-300 px-1.5 py-0.2 rounded-full font-black">✓ DONE</span>
              ) : isDueToday ? (
                <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded-full font-black animate-pulse">DUE</span>
              ) : (
                <span className="text-[9px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded-full font-black">ON</span>
              )
            ) : (
              <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded-full font-black">OFF</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🌟 সমস্ত হাব ও প্রচার (All Promos)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('posters')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'posters'
                ? 'bg-amber-400 text-slate-950 shadow-md ring-1 ring-amber-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>🖼️ ৪টি প্রিমিয়াম পোস্টার (HD Posters)</span>
            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.2 rounded-full font-black animate-pulse">4 READY</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reels')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reels'
                ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>🎥 ফেসবুক রিলস ও ভিডিও স্টুডিও (Reels Studio)</span>
            <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black">HOT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom_maker')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'custom_maker'
                ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>🎨 কাস্টম পোস্টার মেকার (Custom Designer)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* =========================================================================
              TAB 0: DAILY AUTOMATED FACEBOOK MARKETING ENGINE (7-DAY AUTOPILOT)
              ========================================================================= */}
          {activeTab === 'daily' && (
            <div className="space-y-5">
              {/* Top Autopilot Master Control */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 border-2 border-emerald-400/50 shadow-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${dailySchedule.enabled ? 'bg-emerald-400 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                      <RefreshCw className={`w-6 h-6 ${dailySchedule.enabled ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                    </div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="text-base sm:text-lg font-black text-white">
                          {lang === 'bn' ? '🤖 ডেইলি অটোমেটিক ফেসবুক মার্কেটিং অটোপাইলট' : '🤖 Daily Automated Facebook Marketing Autopilot'}
                        </h3>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isPostedToday
                            ? 'bg-emerald-400 text-slate-950'
                            : isDueToday
                            ? 'bg-amber-400 text-slate-950 animate-pulse'
                            : dailySchedule.enabled
                            ? 'bg-blue-400 text-slate-950'
                            : 'bg-slate-600 text-slate-200'
                        }`}>
                          {isPostedToday
                            ? (lang === 'bn' ? '✅ আজকের পোস্ট সম্পন্ন' : '✅ POSTED TODAY')
                            : isDueToday
                            ? (lang === 'bn' ? '🔔 আজকের পোস্ট রেডি' : '🔔 DUE NOW')
                            : dailySchedule.enabled
                            ? (lang === 'bn' ? '🕒 শিডিউল সক্রিয়' : '🕒 SCHEDULED')
                            : (lang === 'bn' ? '⏸️ বন্ধ আছে' : '⏸️ PAUSED')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {lang === 'bn'
                          ? 'প্রতিদিন নির্দিষ্ট সময়ে স্বয়ংক্রিয়ভাবে নতুন কেকের পোস্টার ও বাংলা অফার ক্যাপশন তৈরি ও ফেসবুকে পাবলিশ হবে।'
                          : 'Automatically rotates fresh cake posters & Bengali captions every single day at your chosen time.'}
                      </p>
                    </div>
                  </div>

                  {/* Master Enable/Disable Switch */}
                  <button
                    type="button"
                    onClick={() => syncScheduleToServer({ ...dailySchedule, enabled: !dailySchedule.enabled })}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-md ${
                      dailySchedule.enabled
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 ring-2 ring-emerald-200'
                        : 'bg-slate-700 hover:bg-slate-600 text-white border border-white/15'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>
                      {dailySchedule.enabled
                        ? (lang === 'bn' ? 'ডেইলি অটো চালু আছে (ON)' : 'Daily Auto: ON')
                        : (lang === 'bn' ? 'ডেইলি অটো চালু করুন (OFF)' : 'Daily Auto: OFF')}
                    </span>
                  </button>
                </div>

                {/* Time & Action Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-5 bg-black/35 border border-white/10 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{lang === 'bn' ? 'প্রতিদিন পোস্টের সময় (IST):' : 'Daily Posting Time (IST):'}</span>
                      </span>
                      {dailySyncStatus && <span className="text-[10px] text-emerald-300">{dailySyncStatus}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="time"
                        value={dailySchedule.postTime || '10:00'}
                        onChange={(e) => syncScheduleToServer({ ...dailySchedule, postTime: e.target.value || '10:00' })}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/20 text-white font-mono text-sm font-bold"
                      />
                      {['09:00', '10:00', '16:00', '19:00'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => syncScheduleToServer({ ...dailySchedule, postTime: preset })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                            dailySchedule.postTime === preset
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : 'bg-white/10 hover:bg-white/20 text-slate-200'
                          }`}
                        >
                          {preset === '09:00' ? '9 AM' : preset === '10:00' ? '10 AM' : preset === '16:00' ? '4 PM' : '7 PM'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Today's Preview Mini Card & Launch */}
                  <div className="lg:col-span-7 bg-white/10 border border-white/15 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={todaysPlan.posterUrl}
                        alt={todaysPlan.titleBn}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-amber-300 shrink-0 shadow"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                            {lang === 'bn' ? `আজ ${todaysPlan.dayNameBn}` : `TODAY (${todaysPlan.dayNameEn})`}
                          </span>
                          <span className="text-[10px] text-emerald-300 font-bold">{todaysPlan.offerTagBn}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-white truncate mt-1">
                          {todaysPlan.titleBn}
                        </h4>
                        <p className="text-[10px] text-slate-300 truncate">
                          {hasMetaTokenConfigured
                            ? '🟢 Meta Graph API Active — সার্ভার থেকে সরাসরি অটো-পোস্ট হবে'
                            : '🔵 Zero-Cost Mode — ১-ক্লিকে ফটো + বাংলা ক্যাপশন পোস্ট রেডি'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      {notifPerm !== 'unsupported' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (typeof window !== 'undefined' && 'Notification' in window) {
                              const res = await Notification.requestPermission();
                              setNotifPerm(res);
                            }
                          }}
                          className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                            notifPerm === 'granted'
                              ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
                              : 'bg-white/10 hover:bg-white/20 border-white/20 text-amber-200'
                          }`}
                          title="সময় হলেই ডেস্কটপ/মোবাইলে ডেইলি রিমাইন্ডার দেখাবে"
                        >
                          <span>{notifPerm === 'granted' ? '🔔 অ্যালার্ট চালু' : '🔔 ডেইলি অ্যালার্ট অন করুন'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={dailyRunning}
                        onClick={() => handleRunDailyPostNow()}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer shrink-0 disabled:opacity-60"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        <span>
                          {dailyRunning
                            ? (lang === 'bn' ? 'পোস্ট হচ্ছে...' : 'Posting...')
                            : isPostedToday
                            ? (lang === 'bn' ? 'আবার আজকের পোস্ট দিন' : 'Post Again Today')
                            : (lang === 'bn' ? '🚀 আজকের পোস্ট এখনই দিন' : "🚀 Post Today's Offer Now")}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Zero-Token Daily Mode Status Strip */}
                <div className="bg-emerald-500/15 border border-emerald-400/40 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>
                      {hasMetaTokenConfigured
                        ? '🟢 Meta Graph API টোকেন সক্রিয় — প্রতিদিন নির্ধারিত সময়ে সার্ভার অটোমেটিক ফেসবুকে পোস্ট করবে।'
                        : '✅ টোকেন ঝামেলা ছাড়া ডেইলি মোড সক্রিয় — প্রতিদিন সময় হলেই আজকের পোস্টার ও বাংলা ক্যাপশন রেডি থাকবে, ১-ক্লিকেই ফেসবুকে পোস্ট হবে!'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/30 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-auto">
                    {hasMetaTokenConfigured ? 'API Auto Mode' : '₹0 Zero-Token Mode'}
                  </span>
                </div>
              </div>

              {/* Optional Advanced Meta Graph API Section (Collapsed cleanly by default if no token) */}
              <div className="bg-slate-900 text-white rounded-2xl border border-blue-400/35 shadow-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedApi(!showAdvancedApi)}
                  className="w-full p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/80 text-white flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-white">
                          {lang === 'bn' ? '⚙️ অ্যাডভান্সড (ঐচ্ছিক): ২৪×৭ টোকেন দিয়ে ব্যাকগ্রাউন্ড অটো-পোস্ট' : '⚙️ Optional Advanced: 24x7 Silent API Auto-Posting'}
                        </h4>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${hasMetaTokenConfigured ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-slate-300'}`}>
                          {hasMetaTokenConfigured ? '✓ SILENT API ON' : 'ঐচ্ছিক (না দিলেও চলবে)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {lang === 'bn'
                          ? 'টোকেন ছাড়া উপরে ১-ক্লিক ডেইলি মোড সবসময় কাজ করবে। শুধুমাত্র Meta API টোকেন সেট করতে চাইলে এখানে ক্লিক করুন।'
                          : 'Zero-token 1-click daily mode works without this. Expand only if you want to connect a Meta Page Access Token.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg ${serverConnected ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'}`}>
                      {serverConnected ? '🟢 Server Ready' : '🟡 Local Mode'}
                    </span>
                    <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-lg text-amber-200 font-bold">
                      {showAdvancedApi ? 'লুকান ▲' : 'সেটআপ খুলুন ▼'}
                    </span>
                  </div>
                </button>

                {showAdvancedApi && (
                <div className="p-4 sm:p-5 pt-2 border-t border-white/10 space-y-3">

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label className="text-[10px] uppercase font-bold text-slate-300 block mb-1">
                      Numeric Facebook Page ID:
                    </label>
                    <input
                      type="text"
                      value={pageIdInput}
                      onChange={(e) => setPageIdInput(e.target.value)}
                      placeholder="টোকেন দিলে অটো পাবে (e.g. 1045...)"
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[10px] uppercase font-bold text-slate-300 block mb-1">
                      Meta Access Token (EAAG...):
                    </label>
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder={serverHasToken ? '•••••••••••••••• (Server Token Active)' : 'Paste EAAG... token here'}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="md:col-span-5 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={tokenVerifying}
                      onClick={async () => {
                        setTokenVerifying(true);
                        setTokenVerifyStatus(null);
                        try {
                          const res = await fetch('/api/facebook/verify-token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              pageId: pageIdInput.trim(),
                              pageAccessToken: tokenInput.trim()
                            })
                          });
                          const data = await res.json();
                          if (data && data.success && data.recommendedPage) {
                            const detectedId = data.recommendedPage.id;
                            const detectedToken = data.recommendedPage.accessToken || tokenInput.trim();
                            setPageIdInput(detectedId);
                            setTokenInput(detectedToken);
                            const updatedConfig: ShopConfig = {
                              ...config,
                              facebookPageId: detectedId,
                              facebookPageAccessToken: detectedToken
                            };
                            saveShopConfig(updatedConfig);
                            if (onConfigUpdate) onConfigUpdate(updatedConfig);
                            await syncScheduleToServer(dailySchedule, detectedId, detectedToken);
                            setTokenVerifyStatus({ ok: true, msg: data.message });
                          } else {
                            setTokenVerifyStatus({
                              ok: false,
                              msg: data?.error || 'টোকেন ভেরিফাই করা যায়নি।'
                            });
                          }
                        } catch {
                          setTokenVerifyStatus({
                            ok: false,
                            msg: 'সার্ভারের সাথে সংযোগ হয়নি। টোকেন ও আইডি সরাসরি সেভ করুন।'
                          });
                        } finally {
                          setTokenVerifying(false);
                        }
                      }}
                      className="flex-1 py-2.5 px-3 bg-blue-500 hover:bg-blue-400 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow disabled:opacity-60"
                      title="টোকেন থেকে অটোমেটিক পেজ আইডি খুঁজে নেবে এবং পরীক্ষা করবে"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${tokenVerifying ? 'animate-spin' : ''}`} />
                      <span>{tokenVerifying ? 'চেক হচ্ছে...' : '🔍 অটো-ডিটেক্ট ও টেস্ট'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const cleanedPageId = pageIdInput.trim() || '1EEg9yAa9A';
                        const cleanedToken = tokenInput.trim();
                        const updatedConfig: ShopConfig = {
                          ...config,
                          facebookPageId: cleanedPageId,
                          facebookPageAccessToken: cleanedToken
                        };
                        saveShopConfig(updatedConfig);
                        if (onConfigUpdate) onConfigUpdate(updatedConfig);
                        await syncScheduleToServer(dailySchedule, cleanedPageId, cleanedToken);
                        setTokenSaveSuccess(true);
                        setTimeout(() => setTokenSaveSuccess(false), 3000);
                      }}
                      className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{tokenSaveSuccess ? '✓ সেভ হয়েছে!' : 'সেভ ও সিঙ্ক'}</span>
                    </button>
                  </div>
                </div>

                {tokenVerifyStatus && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold border ${
                    tokenVerifyStatus.ok
                      ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-400/50 text-rose-200'
                  }`}>
                    {tokenVerifyStatus.msg}
                  </div>
                )}

                {/* Collapsible Step-by-Step Guide to get Numeric Page ID & Access Token */}
                <div className="bg-black/40 rounded-xl border border-amber-400/25 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMetaGuide(!showMetaGuide)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-black text-amber-300 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>📖 Numeric Page ID ও Page Access Token কীভাবে পাবেন? (সহজ ৪ ধাপ)</span>
                    </span>
                    <span className="text-[10px] bg-amber-400/20 px-2 py-0.5 rounded font-mono">
                      {showMetaGuide ? 'লুকান ▲' : 'গাইড দেখুন ▼'}
                    </span>
                  </button>

                  {showMetaGuide && (
                    <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 text-[11px] text-slate-200 border-t border-white/10 leading-relaxed">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-1">
                          <span className="font-black text-amber-300 block">ধাপ ১: Numeric Page ID খুঁজুন (অপশনাল)</span>
                          <p className="text-slate-300">
                            ফেসবুক পেজে ঢুকে <b>About → Page Transparency</b>-তে গেলে <b>Page ID</b> (যেমন: 105498...) দেখতে পাবেন। (অথবা নিচের টোকেন পেস্ট করে <b>"🔍 অটো-ডিটেক্ট ও টেস্ট"</b> চাপলেও অটো নিয়ে নেবে!)
                          </p>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-1">
                          <span className="font-black text-emerald-300 block">ধাপ ২: Meta Graph Explorer খুলুন</span>
                          <p className="text-slate-300">
                            Meta Developer-এ লগইন করে একটি App তৈরি করুন (Business টাইপ), তারপর Graph API Explorer ওপেন করুন।
                          </p>
                          <a
                            href="https://developers.facebook.com/tools/explorer/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 mt-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]"
                          >
                            <span>Meta Graph Explorer খুলুন</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-1">
                          <span className="font-black text-blue-300 block">ধাপ ৩: Permission সিলেক্ট ও Generate</span>
                          <p className="text-slate-300">
                            ডানদিকে <b>Permissions</b> বক্সে <code className="text-amber-200">pages_show_list</code> ও <code className="text-amber-200">pages_manage_posts</code> যোগ করে <b>Generate Access Token</b> বাটনে ক্লিক করুন ও আপনার পেজ Approve করুন।
                          </p>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-1">
                          <span className="font-black text-rose-300 block">ধাপ ৪: পেস্ট করে অটো-ডিটেক্ট চাপুন</span>
                          <p className="text-slate-300">
                            পাওয়া <code className="text-emerald-300">EAAG...</code> টোকেনটি উপরের বক্সে পেস্ট করে <b>"🔍 অটো-ডিটেক্ট ও টেস্ট"</b> বাটনে চাপ দিন — পেজের নাম ও Numeric ID অটো সেভ হয়ে যাবে!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                </div>
                )}
              </div>

              {/* 7-Day Automated Rotating Calendar (Sunday to Saturday) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#4b1d3f]" />
                      <span>{lang === 'bn' ? '৭ দিনের অটোমেটিক কেক প্রচার ক্যালেন্ডার (রবিবার – শনিবার)' : '7-Day Automated Rotating Campaign Calendar'}</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      {lang === 'bn'
                        ? 'একঘেয়েমি দূর করতে প্রতিদিন আলাদা আলাদা কেক পোস্টার ও বাংলা ক্যাপশন স্বয়ংক্রিয়ভাবে রোটেশন হয়। চাইলে যেকোনো দিনের লেখা এডিট করতে পারেন:'
                        : 'Rotates different HD bakery posters & Bengali captions automatically each day of the week:'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {DAILY_FB_CONTENT_PLAN.map((plan) => {
                    const isToday = plan.dayIndex === todayDayIdx;
                    const customCap = dailySchedule.customCaptions?.[plan.dayIndex];
                    const effectiveCaption = customCap && customCap.trim().length > 0 ? customCap : plan.buildCaption(fbUrl);
                    const isEditing = editingDayIdx === plan.dayIndex;

                    return (
                      <div
                        key={plan.dayIndex}
                        className={`rounded-2xl p-4 border-2 transition-all flex flex-col justify-between space-y-3 ${
                          isToday
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-2 ring-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-3">
                            <img
                              src={plan.posterUrl}
                              alt={plan.titleBn}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isToday ? 'bg-emerald-600 text-white' : 'bg-[#4b1d3f] text-amber-200'
                                }`}>
                                  {plan.dayNameBn} ({plan.dayNameEn})
                                </span>
                                {isToday && (
                                  <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                                    ★ আজকের পোস্ট
                                  </span>
                                )}
                                <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                  {plan.offerTagBn}
                                </span>
                              </div>
                              <h5 className="text-xs font-black text-slate-900 mt-1">{plan.titleBn}</h5>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                rows={4}
                                value={editingDayText}
                                onChange={(e) => setEditingDayText(e.target.value)}
                                className="w-full p-2.5 rounded-xl border border-indigo-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextCustom = { ...(dailySchedule.customCaptions || {}) };
                                    delete nextCustom[plan.dayIndex];
                                    syncScheduleToServer({ ...dailySchedule, customCaptions: nextCustom });
                                    setEditingDayIdx(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>ডিফল্ট রাখুন</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextCustom = {
                                      ...(dailySchedule.customCaptions || {}),
                                      [plan.dayIndex]: editingDayText
                                    };
                                    syncScheduleToServer({ ...dailySchedule, customCaptions: nextCustom });
                                    setEditingDayIdx(null);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>ক্যাপশন সেভ করুন</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 max-h-24 overflow-y-auto whitespace-pre-line leading-relaxed">
                              {effectiveCaption}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDayIdx(plan.dayIndex);
                              setEditingDayText(effectiveCaption);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{lang === 'bn' ? 'ক্যাপশন এডিট' : 'Edit Caption'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={dailyRunning}
                            onClick={() => handleRunDailyPostNow(plan.dayIndex)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>{lang === 'bn' ? 'এখনই পোস্ট করুন' : 'Post Now'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Automated Execution History Logs */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'bn' ? 'ডেইলি অটো-পোস্টিং অ্যাক্টিভিটি লগ (Recent Daily History)' : 'Daily Autopilot Execution History'}</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    {dailySchedule.logs.length} logs
                  </span>
                </div>

                {dailySchedule.logs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    {lang === 'bn'
                      ? 'এখনো কোনো ডেইলি অটো-পোস্ট রান হয়নি। উপরের "🚀 আজকের পোস্ট এখনই দিন" বাটনে ক্লিক করে প্রথম পোস্ট শুরু করুন!'
                      : 'No daily autopilot posts logged yet. Click "Post Today\'s Offer Now" above to run your first daily post!'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {dailySchedule.logs.slice(0, 15).map((log) => (
                      <div
                        key={log.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {log.date}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              log.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : log.status === 'ready'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {log.mode === 'graph_api'
                                ? 'Auto Graph API'
                                : log.mode === 'manual_composer'
                                ? '1-Click Shared'
                                : log.mode === 'auto_prepared'
                                ? 'Ready to Share'
                                : 'API Error'}
                            </span>
                            <span className="font-bold text-slate-900 truncate">{log.titleBn}</span>
                          </div>
                          {log.error && (
                            <p className="text-[11px] text-rose-600 mt-1">{log.error}</p>
                          )}
                        </div>

                        {log.postUrl && (
                          <a
                            href={log.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-1 shrink-0 self-start sm:self-auto border border-blue-200"
                          >
                            <span>দেখুন</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              BANNER: 100% FREE & ZERO COST PROMISE (Shown on non-daily tabs too)
              ========================================================================= */}
          {activeTab !== 'daily' && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-emerald-400/40 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100 text-xs font-bold backdrop-blur-xs">
                  <BadgePercent className="w-3.5 h-3.5 text-amber-300" />
                  <span>{lang === 'bn' ? '১০০% সম্পূর্ণ বিনামূল্যে প্রচার (Zero Ad Cost)' : '100% Free Organic Reach'}</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {lang === 'bn' ? '🎉 এক পয়সাও খরচ না করে ফেসবুক ও গুগলে শত শত কেক অর্ডার পান!' : 'Get 100s of Cake Orders for Free without Paying Ads!'}
                </h3>
                <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                  {lang === 'bn'
                    ? 'ফেসবুকে বিজ্ঞাপন দিতে টাকা লাগে না! আমাদের তৈরি করা প্রিমিয়াম এইচডি পোস্টার, রেডিমেড বাংলা ক্যাপশন, লোকাল গ্রুপস এবং ফেসবুক মার্কেটপ্লেস ব্যবহার করে বিনামূল্যে ঘাটাল ও মনসুকার হাজার হাজার ক্রেতার কাছে পৌঁছান।'
                    : 'No credit card or ad spend needed! Leverage our HD posters, ready Bengali captions, local Facebook groups, and Marketplace for 100% free viral reach.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3.5 py-2 rounded-xl bg-black/25 border border-white/20 text-center font-mono">
                  <span className="block text-[10px] uppercase text-emerald-200">বিজ্ঞাপন খরচ:</span>
                  <span className="text-base font-black text-amber-300">₹০ (ফ্রি)</span>
                </span>
                <span className="px-3.5 py-2 rounded-xl bg-black/25 border border-white/20 text-center font-mono">
                  <span className="block text-[10px] uppercase text-emerald-200">ক্রেডিট কার্ড:</span>
                  <span className="text-base font-black text-emerald-300">লাগবে না</span>
                </span>
              </div>
            </div>
          </div>
          )}

          {/* =========================================================================
              SECTION 1: OFFICIAL FACEBOOK ID & PAGE PROMOTION HUB
              ========================================================================= */}
          {activeTab === 'all' && (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 border-2 border-blue-400/50 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-black text-lg shadow-md border border-white/20">
                  f
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-white">
                      {lang === 'bn' ? 'অফিশিয়াল ফেসবুক আইডি ও পেজ হাব' : 'Official Facebook ID & Page Promotion'}
                    </h4>
                    <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {lang === 'bn'
                      ? 'আপনার সমস্ত ফ্রি পোস্ট ও প্রচারের ট্রাফিক সরাসরি এই ফেসবুক আইডিতে ঢুকবে'
                      : 'All free posts and promotional traffic drive customers directly to your official Facebook ID'}
                  </p>
                </div>
              </div>
              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-sm"
              >
                <span>{lang === 'bn' ? 'ফেসবুকে ভিজিট করুন' : 'Visit Profile / Page'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* ID Link Display & Copy Bar */}
            <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  {lang === 'bn' ? 'কানেক্টেড ফেসবুক আইডি লিঙ্ক:' : 'Connected Facebook ID Link:'}
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 truncate block mt-0.5 select-all">
                  {fbUrl}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(fbUrl);
                    setCopiedText('fb_id_copied');
                    setTimeout(() => setCopiedText(null), 2500);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedText === 'fb_id_copied' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === 'fb_id_copied' ? (lang === 'bn' ? 'লিঙ্ক কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'লিঙ্ক কপি' : 'Copy Link')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const promoText = `🎂 ঘাটাল ও মনসুকায় সেরা ফ্রেশ এগলেস কেকের জন্য আমাদের অফিশিয়াল ফেসবুক পেজ ফলো করুন! ✨\n👉 ফেসবুক লিঙ্ক: ${fbUrl}\nনতুন নতুন কেকের ফটো, অফার ও ডিসকাউন্ট পেতে এখনি লাইক ও ফলো করুন! 🍰❤️`;
                    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(promoText)}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে ফ্রি প্রমোট' : 'Promote on WhatsApp'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <span className="text-amber-300 font-bold block text-[11px]">🎯 ১. কোনো টাকা খরচ নেই</span>
                <span className="text-[10px] text-slate-300 leading-tight block mt-0.5">সবগুলো প্রচার টুল সম্পূর্ণ বিনামূল্যে ব্যবহার করুন।</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <span className="text-blue-300 font-bold block text-[11px]">📱 ২. বিল ও কিউআরে ফেসবুক</span>
                <span className="text-[10px] text-slate-300 leading-tight block mt-0.5">থার্মাল রিসিপ্ট ও স্ট্যান্ডি কিউআর স্ক্যানে কাস্টমার সরাসরি এই পেজে যুক্ত হবে।</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <span className="text-emerald-300 font-bold block text-[11px]">💬 ৩. ফ্রি ডিরেক্ট হোয়াটসঅ্যাপ</span>
                <span className="text-[10px] text-slate-300 leading-tight block mt-0.5">কাস্টমারের অর্ডার সরাসরি আপনার নিজস্ব ফোন নম্বরে আসবে।</span>
              </div>
            </div>
          </div>
          )}

          {/* =========================================================================
              SECTION 2: 1-CLICK 100% FREE AUTOMATED PROMOTION ENGINE
              ========================================================================= */}
          {activeTab === 'all' && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border-2 border-indigo-400/40 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Zap className="w-5 h-5 fill-current text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-amber-200">
                      {lang === 'bn' ? '🤖 ১-ক্লিক সম্পূর্ণ ফ্রি অটোমেটিক প্রচার লঞ্চার' : '🤖 1-Click 100% FREE Automatic Promotion Engine'}
                    </h4>
                    <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      ₹0 FREE COST
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {lang === 'bn'
                      ? 'কোনো পেইড অ্যাডস বা টাকার ঝামেলা ছাড়া—১-ক্লিক করলেই পোস্টার ও ক্যাপশন সহ ফ্রি প্রচার রেডি হবে!'
                      : 'Launch 100% free viral campaigns with zero ad budget across Facebook Feed, Local Groups & Marketplace.'}
                  </p>
                </div>
              </div>

              <span className="text-xs text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'bn' ? `চলমান ফ্রি প্রচার: ${adCampaigns.length}টি` : `Active Free Promos: ${adCampaigns.length}`}</span>
              </span>
            </div>

            {/* 1-Click Wizard */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'bn' ? '১-ক্লিকে বিনামূল্যে প্রচার শুরু করুন:' : 'Launch 1-Click Free Promo:'}</span>
                </span>
                <span className="text-[11px] text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {lang === 'bn' ? 'বাজেট: ₹০ (সম্পূর্ণ ফ্রি)' : 'Budget: ₹0 (Zero Cost)'}
                </span>
              </div>

              {/* Step 1: Select Poster or Video Reel */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-2">
                  {lang === 'bn' ? '১. প্রচারের জন্য রেডিমেড পোস্টার বা ভাইরাল ভিডিও বেছে নিন:' : '1. Select HD Poster or Viral Video Reel:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {/* Truffle */}
                  <button
                    type="button"
                    onClick={() => setSelectedAdPoster('truffle')}
                    className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      selectedAdPoster === 'truffle'
                        ? 'border-amber-400 bg-amber-400/15 shadow-md ring-1 ring-amber-400'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={fbPremiumPoster}
                      alt="Truffle"
                      className="w-12 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white truncate">চকলেট ট্রাফেল</span>
                        {selectedAdPoster === 'truffle' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">ডার্ক চকলেট ও গোল্ড ফয়েল</p>
                      <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold mt-0.5 inline-block">
                        100% Free Organic
                      </span>
                    </div>
                  </button>

                  {/* Birthday */}
                  <button
                    type="button"
                    onClick={() => setSelectedAdPoster('birthday')}
                    className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      selectedAdPoster === 'birthday'
                        ? 'border-rose-400 bg-rose-400/15 shadow-md ring-1 ring-rose-400'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={fbBirthdayPoster}
                      alt="Birthday"
                      className="w-12 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white truncate">বার্থডে সেলিব্রেশন</span>
                        {selectedAdPoster === 'birthday' && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">প্যাস্টেল ড্রিপ ও ম্যাকারন</p>
                      <span className="text-[9px] bg-rose-400/20 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold mt-0.5 inline-block">
                        Birthday Special
                      </span>
                    </div>
                  </button>

                  {/* Red Velvet Heart (NEW) */}
                  <button
                    type="button"
                    onClick={() => setSelectedAdPoster('redvelvet')}
                    className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      selectedAdPoster === 'redvelvet'
                        ? 'border-red-500 bg-red-500/20 shadow-md ring-1 ring-red-400'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={fbRedVelvetPoster}
                      alt="Red Velvet"
                      className="w-12 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white truncate">রেড ভেলভেট হার্ট</span>
                        {selectedAdPoster === 'redvelvet' && <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                        <span className="text-[9px] bg-red-600 text-white px-1 rounded font-bold">NEW</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">ক্রিম চিজ ও ফ্রেশ বেরি</p>
                      <span className="text-[9px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded font-mono font-bold mt-0.5 inline-block">
                        Anniversary Love
                      </span>
                    </div>
                  </button>

                  {/* Butterscotch Fruit (NEW) */}
                  <button
                    type="button"
                    onClick={() => setSelectedAdPoster('butterscotch')}
                    className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      selectedAdPoster === 'butterscotch'
                        ? 'border-yellow-400 bg-yellow-400/20 shadow-md ring-1 ring-yellow-400'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={fbButterscotchPoster}
                      alt="Butterscotch Fruit"
                      className="w-12 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white truncate">ফ্রুট বাটারস্কচ</span>
                        {selectedAdPoster === 'butterscotch' && <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        <span className="text-[9px] bg-yellow-400 text-slate-950 px-1 rounded font-bold">NEW</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">ক্যারামেল ড্রিপ ও প্র্যালিন</p>
                      <span className="text-[9px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.2 rounded font-mono font-bold mt-0.5 inline-block">
                        Family Favorite
                      </span>
                    </div>
                  </button>

                  {/* Viral Video Reel (NEW) */}
                  <button
                    type="button"
                    onClick={() => setSelectedAdPoster('video_reel')}
                    className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 transition-all text-left cursor-pointer sm:col-span-2 lg:col-span-2 ${
                      selectedAdPoster === 'video_reel'
                        ? 'border-rose-500 bg-rose-500/20 shadow-md ring-1 ring-rose-400'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                      <Film className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">🎥 ভাইরাল ফেসবুক রিলস ভিডিও</span>
                        {selectedAdPoster === 'video_reel' && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        <span className="text-[9px] bg-rose-600 text-white px-1.5 rounded font-black animate-pulse">VIRAL REEL</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5">অ্যানিমেটেড কেন-বার্নস জুম, স্পার্কলার্স ও বাংলা প্রচার হুক সহ ভিডিও</p>
                      <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded font-mono font-bold mt-0.5 inline-block">
                        Highest Reach on Facebook & Reels
                      </span>
                    </div>
                  </button>

                  {/* Custom Poster Designer Quick Card */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('custom_maker')}
                    className="p-2.5 rounded-xl border-2 border-dashed border-emerald-400/50 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-2.5 transition-all text-left cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md">
                      <Palette className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">🎨 কাস্টম পোস্টার বানান</span>
                        <span className="text-[9px] bg-emerald-500 text-slate-950 px-1 rounded font-bold">MAKER</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5">নিজের ছবি, অফার বা নাম দিয়ে পোস্টার ডিজাইন করুন</p>
                    </div>
                  </button>
                </div>

                {selectedAdPoster === 'video_reel' && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-rose-200 flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-rose-400" />
                      <span>ভিডিও রিলস স্টুডিওতে অ্যানিমেশন, স্টাইল বা হুক পরিবর্তন করতে চান?</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reels')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      🎥 রিলস স্টুডিও খুলুন →
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Select 100% Free Strategy */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-2">
                  {lang === 'bn' ? '২. সম্পূর্ণ ফ্রি প্রচার মাধ্যম বেছে নিন (সবগুলোতেই ₹০ টাকা খরচ):' : '2. Choose Free Promotion Channel (All ₹0 Cost):'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {/* Option 1 */}
                  <button
                    type="button"
                    onClick={() => setSelectedFreeStrategy('organic_feed')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFreeStrategy === 'organic_feed'
                        ? 'bg-emerald-500/20 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-emerald-300">₹০ ফ্রি পেজ বুস্ট</span>
                      {selectedFreeStrategy === 'organic_feed' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      ফেসবুক পেজ ও রিলসে ফটো ও বাংলা ক্যাপশন সহ ভাইরাল প্রচার
                    </p>
                  </button>

                  {/* Option 2 */}
                  <button
                    type="button"
                    onClick={() => setSelectedFreeStrategy('local_groups')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFreeStrategy === 'local_groups'
                        ? 'bg-blue-500/20 border-blue-400 shadow-md ring-1 ring-blue-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-blue-300">₹০ লোকাল গ্রুপস</span>
                      {selectedFreeStrategy === 'local_groups' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      ঘাটাল ও মনসুকা লোকাল ফুডি ফেসবুক গ্রুপে ফ্রি ভাইরাল পোস্ট
                    </p>
                  </button>

                  {/* Option 3 */}
                  <button
                    type="button"
                    onClick={() => setSelectedFreeStrategy('marketplace')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFreeStrategy === 'marketplace'
                        ? 'bg-purple-500/20 border-purple-400 shadow-md ring-1 ring-purple-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-purple-300">₹০ মার্কেটপ্লেস</span>
                      {selectedFreeStrategy === 'marketplace' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      ফেসবুক মার্কেটপ্লেসে এলাকার ক্রেতাদের জন্য ফ্রি কেক লিস্টিং
                    </p>
                  </button>

                  {/* Option 4 */}
                  <button
                    type="button"
                    onClick={() => setSelectedFreeStrategy('google_maps')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFreeStrategy === 'google_maps'
                        ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-amber-300">₹০ গুগল ম্যাপস</span>
                      {selectedFreeStrategy === 'google_maps' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      গুগল বিজনেসে ফ্রি পোস্ট দিয়ে লোকাল সার্চে সবার উপরে র‍্যাংক
                    </p>
                  </button>
                </div>
              </div>

              {/* Free Launch Button */}
              <button
                type="button"
                disabled={autoAdLaunching}
                onClick={() => {
                  const posterMap = {
                    truffle: fbPremiumPoster,
                    birthday: fbBirthdayPoster,
                    redvelvet: fbRedVelvetPoster,
                    butterscotch: fbButterscotchPoster,
                    video_reel: fbPremiumPoster
                  };

                  const captionsMap = {
                    truffle: `🍫✨ বিলাসবহুল চকলেট ট্রাফেল কেকের রাজকীয় স্বাদ — এখন আপনার প্রিয় ঘাটাল ও মনসুকায়! ✨🍫\n\nপারিবারিক যে কোনো উৎসব বা বিশেষ দিনে প্রিয়জনকে উপহার দিন ১০০% এগলেস পিওর ভেজ 'রয়্যাল বেলজিয়ান চকলেট ট্রাফেল কেক'। 🎂\nপ্রতিটি কেক তৈরি হয় ফ্রেশ উপাদান, ডার্ক চকলেটের সমৃদ্ধ কোটিং এবং ভালোবাসা দিয়ে।\n\n🌟 আমাদের স্পেশালিটি:\n✅ ১০০% পিওর এগলেস (Pure Veg Bakery)\n✅ নিখুঁত ডিজাইন ও মাত্র ২-৩ ঘণ্টার মধ্যে দ্রুত ডেলিভারি\n✅ ফ্রেশ প্রিমিয়াম ক্রিম ও রিচ বেলজিয়ান ফ্লেভার\n\n📞 সরাসরি হোয়াটসঅ্যাপে অর্ডার করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}`,
                    birthday: `🎉🎂 জন্মদিন বা বিবাহবার্ষিকীর সেলিব্রেশন হবে আরও জমকালো ও মিষ্টি! 🎂🎉\n\nআপনার প্রিয়জনের বিশেষ মুহূর্তকে আজীবন স্মরণীয় করে রাখতে নিয়ে আসুন DELICIOUS CAKE CORNER-এর স্পেশাল লাক্সারি সেলিব্রেশন কেক! 🍓✨\n\n🎈 কাস্টমাইজড ফটো কেক (আপনার পছন্দের ছবি দিয়ে)\n🎈 কিউট বার্বি, সুপারহিরো ও কার্টুন থিম কেক\n🎈 টু-টায়ার সেলিব্রেশন ও রয়্যাল অ্যানিভার্সারি কেক\n\n🚚 ঘাটাল, মনসুকা, দাসপুর এলাকায় দ্রুত ডেলিভারি!\n📞 সরাসরি হোয়াটসঅ্যাপে অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}`,
                    redvelvet: `❤️✨ ভালোবাসার মুহূর্তকে স্মরণীয় করে তুলুন স্পেশাল 'রেড ভেলভেট হার্ট কেক' দিয়ে! ✨❤️\n\nখাঁটি রুবির মতো লাল নরম স্পঞ্জ, সুস্বাদু ক্রিম চিজের স্তর আর ফ্রেশ স্ট্রবেরি ও গোল্ডেন ফ্লেক্সের জাদুকরী সাজ! 🍓🎂\nঅ্যানিভার্সারি, জন্মদিন বা প্রিয় মানুষকে সারপ্রাইজ দিতে এর চেয়ে সেরা আর কিছুই হতে পারে না।\n\n🌟 আমাদের বিশেষত্ব:\n✅ ১০০% পিওর এগলেস (Pure Veg)\n✅ মাত্র ২-৩ ঘণ্টার মধ্যে ডেলিভারি\n✅ সেরা প্রিমিয়াম ইনগ্রেডিয়েন্টস ও ফ্রেশ ক্রিম\n\n📞 এখনই অর্ডার করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n🌐 ফেসবুক পেজ ফলো করুন: ${fbUrl}\n\n#RedVelvetHeart #DeliciousCakeCorner #GhatalBakery #EgglessCakes #RomanticCakes #Mansuka`,
                    butterscotch: `🍍🍰 ফ্রেশ এক্সোটিক ফ্রুট ও বাটারস্কচের অতুলনীয় স্বাদ — ডেলিসিয়াস কেক কর্নার! 🍰🍍\n\nপ্রতিটি কামড়ে পাবেন ক্রাঞ্চি বাটারস্কচ ক্রাঞ্চ, ফ্রেশ কিউই, স্ট্রবেরি ও সোনালী ক্যারামেল ড্রিপের অসাধারণ মেলবন্ধন! 🍓✨\nফ্যামিলি গেট-টুগেদার বা বন্ধুদের পার্টিতে সেরা চয়েস।\n\n🌟 আমাদের বিশেষত্ব:\n✅ ১০০% পিওর এগলেস কেক\n✅ ফ্রেশ ফলের টপিং ও রিয়েল মাখন ক্রাঞ্চ\n✅ ঘাটাল ও মনসুকা এলাকায় হোম ডেলিভারি\n\n📞 আজই কল বা হোয়াটসঅ্যাপে অর্ডার করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#ButterscotchCake #FruitCake #DeliciousCakeCorner #Ghatal #PureVegBakery #MansukaCakes`,
                    video_reel: `🎬✨ ঘাটাল ও মনসুকার সেরা বেকারি Delicious Cake Corner-এর ভাইরাল রিলস! 🎂✨\n\nযেকোনো সেলিব্রেশনে ১০০% এগলেস ফ্রেশ প্রিমিয়াম কেক মাত্র ২-৩ ঘণ্টার মধ্যে ডেলিভারি।\n📞 কল বা হোয়াটসঅ্যাপ: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#DeliciousCakeCorner #GhatalReels #ViralBakery #EgglessCakes #FacebookReels`
                  };

                  const titleMap = {
                    truffle: 'Royal Truffle Luxury Cake (100% Free Promo)',
                    birthday: 'Birthday Celebration Cake (100% Free Promo)',
                    redvelvet: 'Red Velvet Heart Cake (100% Free Promo)',
                    butterscotch: 'Fresh Fruit Butterscotch (100% Free Promo)',
                    video_reel: 'Viral Video Reel Promo (100% Free Promo)'
                  };

                  handleAutoLaunchFreeCampaign(
                    posterMap[selectedAdPoster],
                    captionsMap[selectedAdPoster],
                    titleMap[selectedAdPoster],
                    selectedAdPoster,
                    selectedFreeStrategy
                  );
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>
                  {autoAdLaunching
                    ? (lang === 'bn' ? 'স্বয়ংক্রিয়ভাবে ফেসবুকে পাঠানো হচ্ছে...' : 'Auto-Posting to Facebook...')
                    : (lang === 'bn' ? '🚀 ১-ক্লিকে রোবট দিয়ে সরাসরি ফেসবুকে পোস্ট করুন (Auto-Post)' : '🚀 1-Click Instant Auto-Post to Facebook')}
                </span>
                <Sparkles className="w-4 h-4 text-amber-200" />
              </button>
            </div>

            {/* Live Running Campaigns Dashboard */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'bn' ? '🟢 চলমান ফ্রি প্রচার ড্যাশবোর্ড (Live Campaigns):' : '🟢 Live Running Free Campaigns:'}</span>
                </span>
                <span className="text-[10px] text-emerald-300 font-bold">
                  বাজেট: ₹০ (সম্পূর্ণ ফ্রি অর্গানিক)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {adCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-400/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={camp.posterUrl}
                        alt="Ad Poster"
                        className="w-16 h-16 rounded-xl object-cover border border-white/20 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-bold text-xs text-white truncate">{camp.nameBn || camp.name}</h5>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${
                              camp.status === 'active'
                                ? 'bg-emerald-400 text-slate-950 animate-pulse'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {camp.status === 'active' ? (lang === 'bn' ? '● ফ্রি প্রচার চলছে' : '● ACTIVE FREE') : (lang === 'bn' ? 'স্থগিত' : 'PAUSED')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {camp.targetLocation}
                        </p>
                        <span className="text-[10px] font-bold text-emerald-300 mt-1 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>বাজেট: ₹০ (সম্পূর্ণ বিনামূল্যে অর্গানিক প্রচার)</span>
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">দেখেছেন (রিচ)</span>
                        <span className="text-xs font-black text-emerald-300 font-mono">
                          {camp.reachCount.toLocaleString()}+
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">ক্লিক ও ভিউ</span>
                        <span className="text-xs font-black text-amber-300 font-mono">
                          {camp.clicksCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">অর্ডার ইনকোয়ারি</span>
                        <span className="text-xs font-black text-indigo-300 font-mono">
                          {camp.whatsappOrdersCount} টি
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {camp.status === 'active' ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                            <span>{lang === 'bn' ? 'পজ করুন' : 'Pause'}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{lang === 'bn' ? 'চালু করুন' : 'Resume'}</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            handlePostToFacebookWithMedia(camp.posterUrl, camp.caption, camp.name);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                          title="Post Photo & Caption to Facebook"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>{lang === 'bn' ? 'ফেসবুকে পাঠান' : 'Post to FB'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* =========================================================================
              SECTION 3: 4 POWERFUL 100% FREE CHANNELS (SPECIAL FREE TOOLS)
              ========================================================================= */}
          {activeTab === 'all' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  ₹0
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-slate-800">
                    {lang === 'bn' ? 'সম্পূর্ণ বিনামূল্যে প্রচারের ৪টি শক্তিশালী মাধ্যম (১ টাকাও খরচ নেই)' : '4 Powerful Zero-Cost Organic Marketing Channels'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {lang === 'bn' ? 'নিচের যেকোনো মাধ্যমে ক্লিক করে ফ্রিতে আপনার কেক শপের অর্ডার বাড়ান:' : 'Click any channel below to generate customer orders for free:'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Channel 1: Ghatal Facebook Groups */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </span>
                    <h5 className="font-bold text-xs text-slate-900">১. ঘাটাল ও মনসুকা ফেসবুক গ্রুপস (১০০% ফ্রি)</h5>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ঘাটাল বাজার, মনসুকা, দাসপুর ফুড ও লোকাল কমিউনিটি গ্রুপে প্রতিদিন হাজার হাজার মানুষ সক্রিয় থাকেন। সেখানে এই রেডি টেক্সট পোস্ট করলে সরাসরি ফোন কল আসবে।
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const groupPost = `🎂 হ্যালো ঘাটাল ও মনসুকাবাসী! ✨\nআপনার বাড়ির জন্মদিন, অন্নপ্রাশন বা বিবাহবার্ষিকীর জন্য সেরা ফ্রেশ ১০০% এগলেস (Pure Veg) কেক অর্ডার করুন DELICIOUS CAKE CORNER থেকে! 🍰\n🎈 ফটো কেক, ডার্ক চকলেট ট্রাফেল ও কাস্টম থিম কেক মাত্র ২-৩ ঘণ্টার মধ্যে ডেলিভারি।\n📞 কল বা হোয়াটসঅ্যাপ করুন: 7866971421\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক: ${fbUrl}`;
                      navigator.clipboard.writeText(groupPost);
                      setCopiedText('grp_copied');
                      setTimeout(() => setCopiedText(null), 2500);
                    }}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-blue-200 cursor-pointer"
                  >
                    {copiedText === 'grp_copied' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'grp_copied' ? 'কপি হয়েছে!' : 'গ্রুপ টেক্সট কপি'}</span>
                  </button>

                  <a
                    href="https://www.facebook.com/groups/search/groups_home/?q=Ghatal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>ঘাটাল গ্রুপ খুঁজুন</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Channel 2: Facebook Marketplace */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </span>
                    <h5 className="font-bold text-xs text-slate-900">২. ফেসবুক মার্কেটপ্লেস ফ্রি লিস্টিং</h5>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ফেসবুক মার্কেটপ্লেসে যে কেউ একদম ফ্রিতে প্রোডাক্ট বিক্রি করতে পারেন। কোনো ফি লাগে না। ঘাটাল এলাকার ক্রেতারা মার্কেটপ্লেসে কেক সার্চ করলেই দেখতে পাবে।
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const mktText = `টাইটেল: ১০০% এগলেস ফ্রেশ বার্থডে ও চকলেট কেক - ঘাটাল ও মনসুকা\nক্যাটাগরি: Food & Drinks\nদাম: ₹৩৫০\nবিবরণ: ঘাটাল ও মনসুকায় সবচেয়ে ফ্রেশ ও সুস্বাদু এগলেস কেক। যেকোনো ডিজাইনের ফটো কেক ২-৩ ঘণ্টার মধ্যে ডেলিভারি। কল/হোয়াটসঅ্যাপ: 7866971421`;
                      navigator.clipboard.writeText(mktText);
                      setCopiedText('mkt_copied');
                      setTimeout(() => setCopiedText(null), 2500);
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 cursor-pointer"
                  >
                    {copiedText === 'mkt_copied' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'mkt_copied' ? 'কপি হয়েছে!' : 'মার্কেটপ্লেস কপি'}</span>
                  </button>

                  <a
                    href="https://www.facebook.com/marketplace/create/item"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>মার্কেটপ্লেস খুলুন</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Channel 3: Google Business & Maps */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <h5 className="font-bold text-xs text-slate-900">৩. গুগল ম্যাপস ও বিজনেস ফ্রি পোস্ট</h5>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    গুগলে পেইড অ্যাড না দিয়ে আপনার Google My Business প্রোফাইলে ফ্রিতে 'Update/Offer' পোস্ট করলে গুগলে 'Cake Shop in Ghatal' সার্চে ফ্রিতে সবার উপরে র‍্যাংক করে।
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const gglText = `Delicious Cake Corner - ঘাটাল ও মনসুকা\n১০০% পিওর এগলেস ফ্রেশ চকলেট ও বার্থডে কেক।\n📞 কল বা অর্ডার করুন: 7866971421\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল`;
                      navigator.clipboard.writeText(gglText);
                      setCopiedText('ggl_copied');
                      setTimeout(() => setCopiedText(null), 2500);
                    }}
                    className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-amber-200 cursor-pointer"
                  >
                    {copiedText === 'ggl_copied' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'ggl_copied' ? 'কপি হয়েছে!' : 'গুগল টেক্সট কপি'}</span>
                  </button>

                  <a
                    href="https://business.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>গুগল বিজনেসে পোস্ট</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Channel 4: WhatsApp Story & Broadcast */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Send className="w-4 h-4" />
                    </span>
                    <h5 className="font-bold text-xs text-slate-900">৪. হোয়াটসঅ্যাপ স্ট্যাটাস ও ব্রডকাস্ট প্রচার</h5>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    আপনার পরিচিত সমস্ত কাস্টমারদের হোয়াটসঅ্যাপে পোস্টারের ছবি ও অফার শেয়ার করুন। এটি ১০০% ফ্রি এবং তাৎক্ষণিক সেলস তৈরি করে।
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const waText = `🎂 *DELICIOUS CAKE CORNER - মনসুকা বাজার, ঘাটাল* 🎂\n\n✨ ১০০% ফ্রেশ ও পিওর এগলেস বার্থডে কেক মাত্র ২-৩ ঘণ্টার মধ্যে ডেলিভারি!\n📞 সরাসরি অর্ডার করতে কল বা হোয়াটসঅ্যাপ করুন: 7866971421 (https://wa.me/917866971421)\n🌐 আমাদের ফেসবুক পেজ: ${fbUrl}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`, '_blank');
                    }}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>হোয়াটসঅ্যাপে ফ্রি সেন্ড করুন</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* =========================================================================
              SECTION 4: FACEBOOK PREMIUM QUALITY POSTERS & READY CAPTIONS
              ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'posters') && (
          <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border-2 border-amber-400/40 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-400 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Sparkles className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-amber-200">
                    {lang === 'bn' ? 'ফেসবুক প্রিমিয়াম কোয়ালিটি পোস্টার ও রেডি ক্যাপশন' : 'Facebook Premium Quality Posters & Ready Captions'}
                  </h4>
                  <p className="text-xs text-slate-300">
                    {lang === 'bn'
                      ? 'বিজ্ঞাপনের জন্য তৈরি করা হাই-রেজোলিউশন পোস্টার ও আকর্ষণীয় বাংলা ক্যাপশন (১০০% ফ্রি ডাউনলোড ও পোস্ট)'
                      : 'High-converting HD commercial posters and ready-to-publish Bengali & English captions for Facebook'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-3 py-1 rounded-full self-start sm:self-auto shadow-2xs">
                HD 1080x1080 Square
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* POSTER 1: ROYAL BELGIAN TRUFFLE */}
              <div className="bg-white/5 border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-xs hover:border-amber-400/50 transition-all">
                <div className="space-y-4">
                  <div className="relative group rounded-xl overflow-hidden border-2 border-amber-400/30 shadow-lg bg-black/40 aspect-square">
                    <img
                      src={fbPremiumPoster}
                      alt="Artisanal Belgian Chocolate Truffle Cake Poster"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-amber-300 border border-amber-400/40 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Poster #1 • Royal Truffle
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 bg-emerald-950/80 backdrop-blur-xs text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      100% Eggless Pure Veg
                    </div>
                  </div>

                  <div>
                    <h5 className="font-black text-sm text-amber-300">
                      {lang === 'bn' ? 'রয়্যাল বেলজিয়ান চকলেট ট্রাফেল পোস্টার' : 'Artisanal Belgian Truffle Cake Poster'}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {lang === 'bn' ? 'ডার্ক চকলেট, গোল্ড ফয়েল ও ফ্রেঞ্চ ম্যাকারন সহ লাক্সারি লুক' : 'Ultra-premium luxury look for elite Facebook & Instagram ads'}
                    </p>
                  </div>

                  {/* Ready Caption Box */}
                  <div className="bg-black/40 rounded-xl p-3.5 border border-white/10 text-xs text-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-300/90 pb-1.5 border-b border-white/10">
                      <span>{lang === 'bn' ? '📝 রেডি ফেসবুক ক্যাপশন #১' : '📝 Ready Facebook Caption #1'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">1-Click Copy</span>
                    </div>
                    <p className="font-sans text-[11px] leading-relaxed whitespace-pre-line text-slate-300 max-h-40 overflow-y-auto pr-1">
                      {`🍫✨ বিলাসবহুল চকলেট ট্রাফেল কেকের রাজকীয় স্বাদ — এখন আপনার প্রিয় ঘাটাল ও মনসুকায়! ✨🍫

পারিবারিক যে কোনো উৎসব বা বিশেষ দিনে প্রিয়জনকে উপহার দিন ১০০% এগলেস পিওর ভেজ 'রয়্যাল বেলজিয়ান চকলেট ট্রাফেল কেক'। 🎂
প্রতিটি কেক তৈরি হয় ফ্রেশ উপাদান, ডার্ক চকলেটের সমৃদ্ধ কোটিং এবং ভালোবাসা দিয়ে।

🌟 আমাদের স্পেশালিটি:
✅ ১০০% পিওর এগলেস (Pure Veg Bakery)
✅ নিখুঁত ডিজাইন ও মাত্র ২-৩ ঘণ্টার মধ্যে দ্রুত ডেলিভারি
✅ ফ্রেশ প্রিমিয়াম ক্রিম ও রিচ বেলজিয়ান ফ্লেভার
✅ যেকোনো থিম ও ফটো কেকের সুবিধা

📞 অর্ডার করতে আজই সরাসরি কল বা হোয়াটসঅ্যাপ করুন:
👉 7866971421 (https://wa.me/917866971421)
📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)
🌐 ফেসবুক পেজ ফলো করুন: ${fbUrl}

#DeliciousCakeCorner #GhatalBakery #ChocolateTruffle #MansukaCakes #EgglessBakery #BirthdayCakeGhatal #WestBengalBakery`}
                    </p>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const cap = `🍫✨ বিলাসবহুল চকলেট ট্রাফেল কেকের রাজকীয় স্বাদ — এখন আপনার প্রিয় ঘাটাল ও মনসুকায়! ✨🍫\n\nপারিবারিক যে কোনো উৎসব বা বিশেষ দিনে প্রিয়জনকে উপহার দিন ১০০% এগলেস পিওর ভেজ 'রয়্যাল বেলজিয়ান চকলেট ট্রাফেল কেক'। 🎂\nপ্রতিটি কেক তৈরি হয় ফ্রেশ উপাদান, ডার্ক চকলেটের সমৃদ্ধ কোটিং এবং ভালোবাসা দিয়ে।\n\n🌟 আমাদের স্পেশালিটি:\n✅ ১০০% পিওর এগলেস (Pure Veg Bakery)\n✅ নিখুঁত ডিজাইন ও মাত্র ২-৩ ঘণ্টার মধ্যে দ্রুত ডেলিভারি\n✅ ফ্রেশ প্রিমিয়াম ক্রিম ও রিচ বেলজিয়ান ফ্লেভার\n✅ যেকোনো থিম ও ফটো কেকের সুবিধা\n\n📞 অর্ডার করতে আজই সরাসরি কল বা হোয়াটসঅ্যাপ করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n🌐 ফেসবুক পেজ ফলো করুন: ${fbUrl}\n\n#DeliciousCakeCorner #GhatalBakery #ChocolateTruffle #MansukaCakes #EgglessBakery #BirthdayCakeGhatal #WestBengalBakery`;
                        navigator.clipboard.writeText(cap);
                        setCopiedText('cap1');
                        setTimeout(() => setCopiedText(null), 2500);
                      }}
                      className="py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {copiedText === 'cap1' ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5 text-slate-900" />}
                      <span>{copiedText === 'cap1' ? (lang === 'bn' ? 'ক্যাপশন কপি হয়েছে!' : 'Caption Copied!') : (lang === 'bn' ? 'ক্যাপশন কপি করুন' : 'Copy Caption')}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile(fbPremiumPoster, 'DeliciousCakeCorner_Royal_Truffle_Poster.jpg')}
                      className="py-2.5 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-white/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>{lang === 'bn' ? 'পোস্টার ডাউনলোড' : 'Download Poster'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const cap = `🍫✨ বিলাসবহুল চকলেট ট্রাফেল কেকের রাজকীয় স্বাদ — এখন আপনার প্রিয় ঘাটাল ও মনসুকায়! ✨🍫\n\nপারিবারিক যে কোনো উৎসব বা বিশেষ দিনে প্রিয়জনকে উপহার দিন ১০০% এগলেস পিওর ভেজ 'রয়্যাল বেলজিয়ান চকলেট ট্রাফেল কেক'। 🎂\nপ্রতিটি কেক তৈরি হয় ফ্রেশ উপাদান, ডার্ক চকলেটের সমৃদ্ধ কোটিং এবং ভালোবাসা দিয়ে।\n\n🌟 আমাদের স্পেশালিটি:\n✅ ১০০% পিওর এগলেস (Pure Veg Bakery)\n✅ নিখুঁত ডিজাইন ও মাত্র ২-৩ ঘণ্টার মধ্যে দ্রুত ডেলিভারি\n✅ ফ্রেশ প্রিমিয়াম ক্রিম ও রিচ বেলজিয়ান ফ্লেভার\n✅ যেকোনো থিম ও ফটো কেকের সুবিধা\n\n📞 অর্ডার করতে আজই সরাসরি কল বা হোয়াটসঅ্যাপ করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n🌐 ফেসবুক পেজ ফলো করুন: ${fbUrl}\n\n#DeliciousCakeCorner #GhatalBakery #ChocolateTruffle #MansukaCakes #EgglessBakery #BirthdayCakeGhatal #WestBengalBakery`;
                        handlePostToFacebookWithMedia(fbPremiumPoster, cap, 'DeliciousCakeCorner_Royal_Truffle_Poster');
                      }}
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>{lang === 'bn' ? '⚡ ১-ক্লিকে সরাসরি ফেসবুকে অটো-পোস্ট' : '1-Click Auto-Post to Facebook'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const cap = `🍫✨ বিলাসবহুল চকলেট ট্রাফেল কেকের রাজকীয় স্বাদ — এখন আপনার প্রিয় ঘাটাল ও মনসুকায়! 🎂\n\n👉 ১০০% পিওর এগলেস স্পেশাল কেক মাত্র ২-৩ ঘণ্টার মধ্যে ডেলিভারি।\n📞 অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(cap)}`, '_blank');
                      }}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ প্রচার' : 'Send WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* POSTER 2: LUXURY BIRTHDAY CELEBRATION */}
              <div className="bg-white/5 border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-xs hover:border-rose-400/50 transition-all">
                <div className="space-y-4">
                  <div className="relative group rounded-xl overflow-hidden border-2 border-rose-400/30 shadow-lg bg-black/40 aspect-square">
                    <img
                      src={fbBirthdayPoster}
                      alt="Luxury Birthday Celebration Cake Poster"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-rose-300 border border-rose-400/40 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Poster #2 • Birthday Special
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 bg-rose-950/80 backdrop-blur-xs text-rose-200 border border-rose-400/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Custom Designer & Photo Cakes
                    </div>
                  </div>

                  <div>
                    <h5 className="font-black text-sm text-rose-300">
                      {lang === 'bn' ? 'বার্থডে ও অ্যানিভার্সারি সেলিব্রেশন পোস্টার' : 'Vibrant Birthday Celebration Poster'}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {lang === 'bn' ? 'ম্যাকারন, গোল্ড স্পার্কলার ও প্যাস্টেল ড্রিপ সহ আনন্দময় লুক' : 'Celebration party aesthetic with confetti & festive lighting'}
                    </p>
                  </div>

                  {/* Ready Caption Box */}
                  <div className="bg-black/40 rounded-xl p-3.5 border border-white/10 text-xs text-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-300/90 pb-1.5 border-b border-white/10">
                      <span>{lang === 'bn' ? '📝 রেডি ফেসবুক ক্যাপশন #২' : '📝 Ready Facebook Caption #2'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">1-Click Copy</span>
                    </div>
                    <p className="font-sans text-[11px] leading-relaxed whitespace-pre-line text-slate-300 max-h-40 overflow-y-auto pr-1">
                      {`🎉🎂 জন্মদিন বা বিবাহবার্ষিকীর সেলিব্রেশন হবে আরও জমকালো ও মিষ্টি! 🎂🎉

আপনার প্রিয়জনের বিশেষ মুহূর্তকে আজীবন স্মরণীয় করে রাখতে নিয়ে আসুন DELICIOUS CAKE CORNER-এর স্পেশাল লাক্সারি সেলিব্রেশন কেক! 🍓✨
চকলেট ড্রিপ, গোল্ডেন ম্যাকারন আর ফ্রেশ স্ট্রবেরি ফ্লেভারের জাদুকরী কম্বিনেশন।

✨ আমাদের জনপ্রিয় কেকসমূহ:
🎈 কাস্টমাইজড ফটো কেক (আপনার পছন্দের ছবি দিয়ে)
🎈 কিউট বার্বি, সুপারহিরো ও কার্টুন থিম কেক
🎈 টু-টায়ার সেলিব্রেশন ও রয়্যাল অ্যানিভার্সারি কেক
🎈 রেড ভেলভেট, ব্ল্যাক ফরেস্ট ও বাটারস্কচ ডিলাইট

🚚 ঘাটাল, মনসুকা, দাসপুর ও চন্দ্রকোনা এলাকায় দ্রুত ডেলিভারি!
📞 সরাসরি হোয়াটসঅ্যাপে অর্ডার করুন: 7866971421
📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)
⭐ গুগলে আমাদের রেটিং দিন: ${googleReviewUrl}
🌐 ফেসবুক পেজ: ${fbUrl}

#BirthdayCake #DeliciousCakeCorner #GhatalCelebration #EgglessCakes #PhotoCake #Mansuka #GhatalCakes #BestBakeryGhatal`}
                    </p>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const cap = `🎉🎂 জন্মদিন বা বিবাহবার্ষিকীর সেলিব্রেশন হবে আরও জমকালো ও মিষ্টি! 🎂🎉\n\nআপনার প্রিয়জনের বিশেষ মুহূর্তকে আজীবন স্মরণীয় করে রাখতে নিয়ে আসুন DELICIOUS CAKE CORNER-এর স্পেশাল লাক্সারি সেলিব্রেশন কেক! 🍓✨\nচকলেট ড্রিপ, গোল্ডেন ম্যাকারন আর ফ্রেশ স্ট্রবেরি ফ্লেভারের জাদুকরী কম্বিনেশন।\n\n✨ আমাদের জনপ্রিয় কেকসমূহ:\n🎈 কাস্টমাইজড ফটো কেক (আপনার পছন্দের ছবি দিয়ে)\n🎈 কিউট বার্বি, সুপারহিরো ও কার্টুন থিম কেক\n🎈 টু-টায়ার সেলিব্রেশন ও রয়্যাল অ্যানিভার্সারি কেক\n🎈 রেড ভেলভেট, ব্ল্যাক ফরেস্ট ও বাটারস্কচ ডিলাইট\n\n🚚 ঘাটাল, মনসুকা, দাসপুর ও চন্দ্রকোনা এলাকায় দ্রুত ডেলিভারি!\n📞 সরাসরি হোয়াটসঅ্যাপে অর্ডার করুন: 7866971421\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n⭐ গুগলে আমাদের রেটিং দিন: ${googleReviewUrl}\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#BirthdayCake #DeliciousCakeCorner #GhatalCelebration #EgglessCakes #PhotoCake #Mansuka #GhatalCakes #BestBakeryGhatal`;
                        navigator.clipboard.writeText(cap);
                        setCopiedText('cap2');
                        setTimeout(() => setCopiedText(null), 2500);
                      }}
                      className="py-2.5 px-3 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {copiedText === 'cap2' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === 'cap2' ? (lang === 'bn' ? 'ক্যাপশন কপি হয়েছে!' : 'Caption Copied!') : (lang === 'bn' ? 'ক্যাপশন কপি করুন' : 'Copy Caption')}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile(fbBirthdayPoster, 'DeliciousCakeCorner_Birthday_Celebration_Poster.jpg')}
                      className="py-2.5 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-white/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-300" />
                      <span>{lang === 'bn' ? 'পোস্টার ডাউনলোড' : 'Download Poster'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const cap = `🎉🎂 জন্মদিন বা বিবাহবার্ষিকীর সেলিব্রেশন হবে আরও জমকালো ও মিষ্টি! 🎂🎉\n\nআপনার প্রিয়জনের বিশেষ মুহূর্তকে আজীবন স্মরণীয় করে রাখতে নিয়ে আসুন DELICIOUS CAKE CORNER-এর স্পেশাল লাক্সারি সেলিব্রেশন কেক! 🍓✨\nচকলেট ড্রিপ, গোল্ডেন ম্যাকারন আর ফ্রেশ স্ট্রবেরি ফ্লেভারের জাদুকরী কম্বিনেশন।\n\n✨ আমাদের জনপ্রিয় কেকসমূহ:\n🎈 কাস্টমাইজড ফটো কেক (আপনার পছন্দের ছবি দিয়ে)\n🎈 কিউট বার্বি, সুপারহিরো ও কার্টুন থিম কেক\n🎈 টু-টায়ার সেলিব্রেশন ও রয়্যাল অ্যানিভার্সারি কেক\n🎈 রেড ভেলভেট, ব্ল্যাক ফরেস্ট ও বাটারস্কচ ডিলাইট\n\n🚚 ঘাটাল, মনসুকা, দাসপুর ও চন্দ্রকোনা এলাকায় দ্রুত ডেলিভারি!\n📞 সরাসরি হোয়াটসঅ্যাপে অর্ডার করুন: 7866971421\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n⭐ গুগলে আমাদের রেটিং দিন: ${googleReviewUrl}\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#BirthdayCake #DeliciousCakeCorner #GhatalCelebration #EgglessCakes #PhotoCake #Mansuka #GhatalCakes #BestBakeryGhatal`;
                        handlePostToFacebookWithMedia(fbBirthdayPoster, cap, 'DeliciousCakeCorner_Birthday_Celebration_Poster');
                      }}
                      className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>{lang === 'bn' ? '⚡ ১-ক্লিকে সরাসরি ফেসবুকে অটো-পোস্ট' : '1-Click Auto-Post to Facebook'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const cap = `🎉🎂 জন্মদিন বা বিবাহবার্ষিকীর সেলিব্রেশন হবে আরও জমকালো ও মিষ্টি! 🎂\n\n✨ ১০০% এগলেস স্পেশাল বার্থডে ও ফটো কেক মাত্র ২-৩ ঘণ্টার মধ্যে ডেলিভারি।\n📞 অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(cap)}`, '_blank');
                      }}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ প্রচার' : 'Send WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* POSTER 3: THE ULTIMATE RED VELVET HEART */}
              <div className="bg-white/5 border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-xs hover:border-red-400/50 transition-all">
                <div className="space-y-4">
                  <div className="relative group rounded-xl overflow-hidden border-2 border-red-500/30 shadow-lg bg-black/40 aspect-square">
                    <img
                      src={fbRedVelvetPoster}
                      alt="The Ultimate Red Velvet Heart Cake Poster"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-red-300 border border-red-500/40 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span>Poster #3 • Red Velvet Heart</span>
                      <span className="bg-red-600 text-white px-1.5 py-0.2 rounded text-[8px] font-bold">NEW</span>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 bg-red-950/80 backdrop-blur-xs text-red-200 border border-red-400/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Special for Love & Anniversaries
                    </div>
                  </div>

                  <div>
                    <h5 className="font-black text-sm text-red-300">
                      {lang === 'bn' ? 'রোমান্টিক রেড ভেলভেট হার্ট কেক পোস্টার' : 'Ultimate Red Velvet Heart Poster'}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {lang === 'bn' ? 'রুবির মতো লাল নরম স্পঞ্জ, সুস্বাদু ক্রিম চিজ ও ফ্রেশ বেরি' : 'Indulge in opulence: cream cheese, fresh berries & 24k gold leaf flakes'}
                    </p>
                  </div>

                  {/* Ready Caption Box */}
                  <div className="bg-black/40 rounded-xl p-3.5 border border-white/10 text-xs text-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-red-300/90 pb-1.5 border-b border-white/10">
                      <span>{lang === 'bn' ? '📝 রেডি ফেসবুক ক্যাপশন #৩' : '📝 Ready Facebook Caption #3'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">1-Click Copy</span>
                    </div>
                    <p className="font-sans text-[11px] leading-relaxed whitespace-pre-line text-slate-300 max-h-40 overflow-y-auto pr-1">
                      {`❤️✨ ভালোবাসার মুহূর্তকে স্মরণীয় করে তুলুন স্পেশাল 'রেড ভেলভেট হার্ট কেক' দিয়ে! ✨❤️

খাঁটি রুবির মতো লাল নরম স্পঞ্জ, সুস্বাদু ক্রিম চিজের স্তর আর ফ্রেশ স্ট্রবেরি ও গোল্ডেন ফ্লেক্সের জাদুকরী সাজ! 🍓🎂
অ্যানিভার্সারি, জন্মদিন বা প্রিয় মানুষকে সারপ্রাইজ দিতে এর চেয়ে সেরা আর কিছুই হতে পারে না।

🌟 আমাদের বিশেষত্ব:
✅ ১০০% পিওর এগলেস (Pure Veg)
✅ মাত্র ২-৩ ঘণ্টার মধ্যে দ্রুত ডেলিভারি
✅ সেরা প্রিমিয়াম ইনগ্রেডিয়েন্টস ও ফ্রেশ ক্রিম
✅ কাস্টম নাম ও রোমান্টিক মেসেজ লেখার সুবিধা

📞 এখনই কল বা হোয়াটসঅ্যাপে অর্ডার করুন:
👉 7866971421 (https://wa.me/917866971421)
📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)
🌐 অফিশিয়াল ফেসবুক পেজ ফলো করুন: ${fbUrl}

#RedVelvetHeart #DeliciousCakeCorner #GhatalBakery #EgglessCakes #RomanticCakes #Mansuka #GhatalCakes`}
                    </p>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const cap = `❤️✨ ভালোবাসার মুহূর্তকে স্মরণীয় করে তুলুন স্পেশাল 'রেড ভেলভেট হার্ট কেক' দিয়ে! ✨❤️\n\nখাঁটি রুবির মতো লাল নরম স্পঞ্জ, সুস্বাদু ক্রিম চিজের স্তর আর ফ্রেশ স্ট্রবেরি ও গোল্ডেন ফ্লেক্সের জাদুকরী সাজ! 🍓🎂\nঅ্যানিভার্সারি, জন্মদিন বা প্রিয় মানুষকে সারপ্রাইজ দিতে এর চেয়ে সেরা আর কিছুই হতে পারে না।\n\n🌟 আমাদের বিশেষত্ব:\n✅ ১০০% পিওর এগলেস (Pure Veg)\n✅ মাত্র ২-৩ ঘণ্টার মধ্যে দ্রুত ডেলিভারি\n✅ সেরা প্রিমিয়াম ইনগ্রেডিয়েন্টস ও ফ্রেশ ক্রিম\n\n📞 এখনই কল বা হোয়াটসঅ্যাপে অর্ডার করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n🌐 ফেসবুক পেজ ফলো করুন: ${fbUrl}\n\n#RedVelvetHeart #DeliciousCakeCorner #GhatalBakery #EgglessCakes #RomanticCakes #Mansuka #GhatalCakes`;
                        navigator.clipboard.writeText(cap);
                        setCopiedText('cap3');
                        setTimeout(() => setCopiedText(null), 2500);
                      }}
                      className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {copiedText === 'cap3' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === 'cap3' ? (lang === 'bn' ? 'ক্যাপশন কপি হয়েছে!' : 'Caption Copied!') : (lang === 'bn' ? 'ক্যাপশন কপি করুন' : 'Copy Caption')}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile(fbRedVelvetPoster, 'DeliciousCakeCorner_Red_Velvet_Heart_Poster.jpg')}
                      className="py-2.5 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-white/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-red-300" />
                      <span>{lang === 'bn' ? 'পোস্টার ডাউনলোড' : 'Download Poster'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const cap = `❤️✨ ভালোবাসার মুহূর্তকে স্মরণীয় করে তুলুন স্পেশাল 'রেড ভেলভেট হার্ট কেক' দিয়ে! ✨❤️\n\nখাঁটি রুবির মতো লাল নরম স্পঞ্জ, সুস্বাদু ক্রিম চিজের স্তর আর ফ্রেশ স্ট্রবেরি ও গোল্ডেন ফ্লেক্সের জাদুকরী সাজ! 🍓🎂\nঅ্যানিভার্সারি, জন্মদিন বা প্রিয় মানুষকে সারপ্রাইজ দিতে এর চেয়ে সেরা আর কিছুই হতে পারে না।\n\n🌟 আমাদের বিশেষত্ব:\n✅ ১০০% পিওর এগলেস (Pure Veg)\n✅ মাত্র ২-৩ ঘণ্টার মধ্যে দ্রুত ডেলিভারি\n✅ সেরা প্রিমিয়াম ইনগ্রেডিয়েন্টস ও ফ্রেশ ক্রিম\n\n📞 এখনই কল বা হোয়াটসঅ্যাপে অর্ডার করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n🌐 ফেসবুক পেজ ফলো করুন: ${fbUrl}\n\n#RedVelvetHeart #DeliciousCakeCorner #GhatalBakery #EgglessCakes #RomanticCakes #Mansuka #GhatalCakes`;
                        handlePostToFacebookWithMedia(fbRedVelvetPoster, cap, 'DeliciousCakeCorner_Red_Velvet_Heart_Poster');
                      }}
                      className="py-2.5 px-3 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>{lang === 'bn' ? '⚡ ১-ক্লিকে সরাসরি ফেসবুকে অটো-পোস্ট' : '1-Click Auto-Post to Facebook'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const cap = `❤️✨ ভালোবাসার মুহূর্তকে স্মরণীয় করে তুলুন স্পেশাল 'রেড ভেলভেট হার্ট কেক' দিয়ে! 🎂\n\n✨ ১০০% এগলেস প্রিমিয়াম রেড ভেলভেট কেক মাত্র ২-৩ ঘণ্টার মধ্যে ডেলিভারি।\n📞 অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(cap)}`, '_blank');
                      }}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ প্রচার' : 'Send WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* POSTER 4: FRESH FRUIT & BUTTERSCOTCH DELIGHT */}
              <div className="bg-white/5 border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-xs hover:border-yellow-400/50 transition-all">
                <div className="space-y-4">
                  <div className="relative group rounded-xl overflow-hidden border-2 border-yellow-400/30 shadow-lg bg-black/40 aspect-square">
                    <img
                      src={fbButterscotchPoster}
                      alt="Fresh Fruit Butterscotch Celebration Cake Poster"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-yellow-300 border border-yellow-400/40 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span>Poster #4 • Fruit & Butterscotch</span>
                      <span className="bg-yellow-400 text-slate-950 px-1.5 py-0.2 rounded text-[8px] font-bold">NEW</span>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 bg-yellow-950/80 backdrop-blur-xs text-yellow-200 border border-yellow-400/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Real Praline & Fresh Seasonal Fruits
                    </div>
                  </div>

                  <div>
                    <h5 className="font-black text-sm text-yellow-300">
                      {lang === 'bn' ? 'ফ্রেশ ফ্রুট ও বাটারস্কচ সেলিব্রেশন পোস্টার' : 'Fresh Fruit & Butterscotch Poster'}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {lang === 'bn' ? 'গোল্ডেন ক্যারামেল ড্রিপ, ক্রাঞ্চি প্র্যালিন ও ফ্রেশ কিউই-স্ট্রবেরি ফ্রুটস' : 'Vanilla mascarpone, golden butterscotch drip, praline crisps & fruits'}
                    </p>
                  </div>

                  {/* Ready Caption Box */}
                  <div className="bg-black/40 rounded-xl p-3.5 border border-white/10 text-xs text-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-yellow-300/90 pb-1.5 border-b border-white/10">
                      <span>{lang === 'bn' ? '📝 রেডি ফেসবুক ক্যাপশন #৪' : '📝 Ready Facebook Caption #4'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">1-Click Copy</span>
                    </div>
                    <p className="font-sans text-[11px] leading-relaxed whitespace-pre-line text-slate-300 max-h-40 overflow-y-auto pr-1">
                      {`🍍🍰 ফ্রেশ এক্সোটিক ফ্রুট ও বাটারস্কচের অতুলনীয় স্বাদ — ডেলিসিয়াস কেক কর্নার! 🍰🍍

প্রতিটি কামড়ে পাবেন ক্রাঞ্চি বাটারস্কচ ক্রাঞ্চ, ফ্রেশ কিউই, স্ট্রবেরি ও সোনালী ক্যারামেল ড্রিপের অসাধারণ মেলবন্ধন! 🍓✨
ফ্যামিলি গেট-টুগেদার বা বন্ধুদের পার্টিতে সেরা চয়েস।

🌟 আমাদের বিশেষত্ব:
✅ ১০০% পিওর এগলেস কেক (Pure Veg Bakery)
✅ ফ্রেশ ফলের টপিং ও রিয়েল মাখন ক্রাঞ্চ
✅ ঘাটাল, মনসুকা, দাসপুর ও চন্দ্রকোনায় দ্রুত ডেলিভারি
✅ যেকোনো সাইজ ও ওজনের অর্ডার নেওয়া হয়

📞 আজই কল বা হোয়াটসঅ্যাপে অর্ডার করুন:
👉 7866971421 (https://wa.me/917866971421)
📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)
🌐 অফিশিয়াল ফেসবুক পেজ: ${fbUrl}

#ButterscotchCake #FruitCake #DeliciousCakeCorner #GhatalBakery #PureVegBakery #MansukaCakes #Ghatal`}
                    </p>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const cap = `🍍🍰 ফ্রেশ এক্সোটিক ফ্রুট ও বাটারস্কচের অতুলনীয় স্বাদ — ডেলিসিয়াস কেক কর্নার! 🍰🍍\n\nপ্রতিটি কামড়ে পাবেন ক্রাঞ্চি বাটারস্কচ ক্রাঞ্চ, ফ্রেশ কিউই, স্ট্রবেরি ও সোনালী ক্যারামেল ড্রিপের অসাধারণ মেলবন্ধন! 🍓✨\nফ্যামিলি গেট-টুগেদার বা বন্ধুদের পার্টিতে সেরা চয়েস।\n\n🌟 আমাদের বিশেষত্ব:\n✅ ১০০% পিওর এগলেস কেক (Pure Veg Bakery)\n✅ ফ্রেশ ফলের টপিং ও রিয়েল মাখন ক্রাঞ্চ\n✅ ঘাটাল, মনসুকা, দাসপুর ও চন্দ্রকোনায় দ্রুত ডেলিভারি\n\n📞 আজই কল বা হোয়াটসঅ্যাপে অর্ডার করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n🌐 অফিশিয়াল ফেসবুক পেজ: ${fbUrl}\n\n#ButterscotchCake #FruitCake #DeliciousCakeCorner #GhatalBakery #PureVegBakery #MansukaCakes #Ghatal`;
                        navigator.clipboard.writeText(cap);
                        setCopiedText('cap4');
                        setTimeout(() => setCopiedText(null), 2500);
                      }}
                      className="py-2.5 px-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {copiedText === 'cap4' ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === 'cap4' ? (lang === 'bn' ? 'ক্যাপশন কপি হয়েছে!' : 'Caption Copied!') : (lang === 'bn' ? 'ক্যাপশন কপি করুন' : 'Copy Caption')}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile(fbButterscotchPoster, 'DeliciousCakeCorner_Fruit_Butterscotch_Poster.jpg')}
                      className="py-2.5 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-white/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-yellow-300" />
                      <span>{lang === 'bn' ? 'পোস্টার ডাউনলোড' : 'Download Poster'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const cap = `🍍🍰 ফ্রেশ এক্সোটিক ফ্রুট ও বাটারস্কচের অতুলনীয় স্বাদ — ডেলিসিয়াস কেক কর্নার! 🍰🍍\n\nপ্রতিটি কামড়ে পাবেন ক্রাঞ্চি বাটারস্কচ ক্রাঞ্চ, ফ্রেশ কিউই, স্ট্রবেরি ও সোনালী ক্যারামেল ড্রিপের অসাধারণ মেলবন্ধন! 🍓✨\nফ্যামিলি গেট-টুগেদার বা বন্ধুদের পার্টিতে সেরা চয়েস।\n\n🌟 আমাদের বিশেষত্ব:\n✅ ১০০% পিওর এগলেস কেক (Pure Veg Bakery)\n✅ ফ্রেশ ফলের টপিং ও রিয়েল মাখন ক্রাঞ্চ\n✅ ঘাটাল, মনসুকা, দাসপুর ও চন্দ্রকোনায় দ্রুত ডেলিভারি\n\n📞 আজই কল বা হোয়াটসঅ্যাপে অর্ডার করুন:\n👉 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)\n🌐 অফিশিয়াল ফেসবুক পেজ: ${fbUrl}\n\n#ButterscotchCake #FruitCake #DeliciousCakeCorner #GhatalBakery #PureVegBakery #MansukaCakes #Ghatal`;
                        handlePostToFacebookWithMedia(fbButterscotchPoster, cap, 'DeliciousCakeCorner_Fruit_Butterscotch_Poster');
                      }}
                      className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>{lang === 'bn' ? '⚡ ১-ক্লিকে সরাসরি ফেসবুকে অটো-পোস্ট' : '1-Click Auto-Post to Facebook'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const cap = `🍍🍰 ফ্রেশ এক্সোটিক ফ্রুট ও বাটারস্কচের অতুলনীয় স্বাদ! 🎂\n\n✨ ১০০% এগলেস স্পেশাল ফ্রুট ও বাটারস্কচ কেক মাত্র ২-৩ ঘণ্টার মধ্যে ডেলিভারি।\n📞 অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(cap)}`, '_blank');
                      }}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ প্রচার' : 'Send WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* =========================================================================
              SECTION 4B: VIRAL FACEBOOK REELS & VIDEO STUDIO
              ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'reels') && (
            <div id="reels-studio-section">
              <BakeryVideoReelStudio
                config={config}
                lang={lang}
                onPostToFacebook={handlePostToFacebookWithMedia}
              />
            </div>
          )}

          {/* =========================================================================
              SECTION 4C: CUSTOM POSTER DESIGNER STUDIO
              ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'custom_maker') && (
            <div id="custom-maker-section">
              <BakeryCustomPosterMaker
                config={config}
                lang={lang}
                onPostToFacebook={handlePostToFacebookWithMedia}
              />
            </div>
          )}

          {/* =========================================================================
              SECTION 5: 5 SECRETS TO GET 100S OF CAKE ORDERS FOR FREE
              ========================================================================= */}
          {activeTab === 'all' && (
          <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-amber-950">
                {lang === 'bn' ? '💡 ১ টাকাও খরচ না করে কীভাবে শত শত ফ্রি কেক অর্ডার পাবেন? (৫টি সহজ নিয়ম)' : 'How to Get 100s of Cake Orders 100% Free (5 Rules)'}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1 text-xs text-amber-900">
              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="font-bold block text-slate-900">১. প্রতিদিন ১টি পোস্ট</span>
                <p className="text-[11px] text-slate-600 mt-1">
                  প্রতিদিন সকালে বা বিকেলে উপরে দেওয়া যেকোনো একটি পোস্টার ও বাংলা ক্যাপশন নিজের ফেসবুক পেজে পোস্ট করুন।
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="font-bold block text-slate-900">২. লোকাল গ্রুপে শেয়ার</span>
                <p className="text-[11px] text-slate-600 mt-1">
                  ঘাটাল, মনসুকা ও দাসপুরের জনপ্রিয় পাবলিক গ্রুপগুলোতে পেজের পোস্টটি শেয়ার করুন।
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="font-bold block text-slate-900">৩. মার্কেটপ্লেস লিস্টিং</span>
                <p className="text-[11px] text-slate-600 mt-1">
                  ফেসবুক মার্কেটপ্লেসে চকলেট ও বার্থডে কেকের ছবি দিয়ে লিস্টিং দিয়ে রাখুন। কাস্টমার সরাসরি ইনবক্স করবে।
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="font-bold block text-slate-900">৪. গুগল ম্যাপস আপডেট</span>
                <p className="text-[11px] text-slate-600 mt-1">
                  গুগল বিজনেস প্রোফাইলে সপ্তাহে অন্তত ২ দিন নতুন কেকের ছবি আপলোড করুন, লোকাল সার্চে ১ নম্বরে আসবে।
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="font-bold block text-slate-900">৫. হোয়াটসঅ্যাপ স্টোরি</span>
                <p className="text-[11px] text-slate-600 mt-1">
                  দোকানের প্রতিটি বিক্রির বিলিংয়ের সাথে কাস্টমারকে ফেসবুক পেজ লিঙ্ক দিন এবং হোয়াটসঅ্যাপ স্ট্যাটাসে পোস্টার লাগান।
                </p>
              </div>
            </div>
          </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-slate-800">Facebook Page:</span>
            <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline">
              {fbUrl}
            </a>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md ml-1">
              ₹০ সম্পূর্ণ ফ্রি মোড
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>

      {/* =========================================================================
          AI AUTOMATED ROBOT POSTING MODAL
          ========================================================================= */}
      {autoPostRobot && autoPostRobot.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-blue-400 rounded-3xl max-w-xl w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-600 p-4 sm:p-5 flex items-center justify-between text-white border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-[#1877F2] font-black text-2xl flex items-center justify-center shadow-md">
                  f
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black leading-tight text-white">
                      {autoPostRobot.isGraphPublished
                        ? (lang === 'bn' ? '✅ ফেসবুকে সরাসরি পোস্ট পাবলিশ সম্পন্ন!' : 'Published via Graph API!')
                        : (lang === 'bn' ? '🚀 ফেসবুক পোস্ট কম্পোজার চালু হয়েছে' : 'Facebook Share Composer Launched')}
                    </h3>
                    <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {autoPostRobot.isGraphPublished ? 'Graph API Live' : 'Composer Ready'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {autoPostRobot.isGraphPublished
                      ? 'সার্ভার থেকে সরাসরি ফেসবুক পেজে ছবি ও ক্যাপশন পোস্ট হয়ে গেছে!'
                      : 'ছবি ডাউনলোড ও ক্যাপশন কপি হয়েছে — ফেসবুক উইন্ডোতে শুধু পোস্ট নিশ্চিত করুন!'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoPostRobot(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Status Banner */}
              {autoPostRobot.isGraphPublished ? (
                <div className="bg-emerald-950/80 border-2 border-emerald-500/60 p-4 rounded-2xl text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-black text-base text-emerald-300">
                    🎉 ফেসবুক পেজে সরাসরি লাইভ পোস্ট হয়েছে!
                  </h4>
                  <p className="text-xs text-slate-300">
                    পোস্ট আইডি: <span className="font-mono text-amber-300 font-bold">{autoPostRobot.graphPostId}</span>
                  </p>
                </div>
              ) : autoPostRobot.isMobileShared ? (
                <div className="bg-emerald-950/80 border-2 border-emerald-500/60 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-emerald-300">
                        📱 মোবাইলের ফেসবুক অ্যাপে ছবি ও ক্যাপশন পাঠানো হয়েছে!
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        আপনার ফোনের ফেসবুক অ্যাপে কেকের ছবি এবং বাংলা ক্যাপশন লোড হয়েছে — শুধু 'Post' বাটনে চাপ দিন।
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-950/80 border-2 border-blue-400/60 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-blue-200">
                        ১-ক্লিকে ছবি ও ক্যাপশন প্রস্তুত এবং ফেসবুক পেজ খোলা হয়েছে
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        ব্রাউজারের পাশের ট্যাবে আপনার ফেসবুক পেজ (<span className="text-amber-300 font-mono">1EEg9yAa9A</span>) ওপেন হয়েছে।
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs text-slate-200 bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><b>ছবি:</b> এইচডি কেকের পোস্টার ডাউনলোড সম্পন্ন</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><b>ক্যাপশন:</b> আকর্ষণীয় বাংলা ক্যাপশন ক্লিপবোর্ডে কপি সম্পন্ন</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><b>অফিশিয়াল পেজ:</b> <a href={fbUrl} target="_blank" rel="noreferrer" className="text-amber-300 underline font-mono">facebook.com/share/1EEg9yAa9A/</a> ওপেন</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <a
                  href={autoPostRobot.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>
                    {autoPostRobot.isGraphPublished
                      ? 'সরাসরি ফেসবুক পেজে পোস্টটি দেখুন (View Live Post)'
                      : '👉 ফেসবুক পেজে যান ও পোস্ট করুন (Open Facebook Page)'}
                  </span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(autoPostRobot.caption);
                      setCopiedText('modal_cap');
                      setTimeout(() => setCopiedText(null), 2000);
                    }}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
                  >
                    {copiedText === 'modal_cap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'modal_cap' ? 'কপি হয়েছে!' : 'আবার ক্যাপশন কপি'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadFile(autoPostRobot.posterSrc, `${autoPostRobot.posterName}.jpg`)}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    <span>ছবি আবার ডাউনলোড</span>
                  </button>
                </div>
              </div>

              {/* Meta Graph API Setup Helper for 100% Silent Background Posting */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowTokenConfig(!showTokenConfig)}
                  className="w-full text-left flex items-center justify-between text-xs text-amber-300 font-bold hover:text-amber-200 transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>১০০% ব্যাকগ্রাউন্ডে স্বয়ংক্রিয় পোস্টিং চান? (Meta Graph API Token)</span>
                  </span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 font-mono">
                    {showTokenConfig ? 'লুকান ▲' : 'সেটআপ করুন ▼'}
                  </span>
                </button>

                {showTokenConfig && (
                  <div className="mt-2.5 p-3.5 bg-black/50 border border-amber-400/30 rounded-xl space-y-2.5 text-xs animate-in fade-in">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      💡 ফেসবুকের কঠোর নিরাপত্তা নিয়মের কারণে কোনো ব্রাউজার ব্যবহারকারীর অনুমতি ছাড়া পাসওয়ার্ড হ্যাক করে সরাসরি পেজে পোস্ট করতে পারে না। কিন্তু আপনার যদি <b>Facebook Page Access Token</b> থাকে, তবে আমাদের সার্ভার ১ সেকেন্ডে স্বয়ংক্রিয়ভাবে আপনার পেজে সরাসরি পোস্ট করে দেবে।
                    </p>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Facebook Page ID:</label>
                      <input
                        type="text"
                        value={pageIdInput}
                        onChange={(e) => setPageIdInput(e.target.value)}
                        placeholder="e.g. 1EEg9yAa9A or numeric ID"
                        className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Meta Page Access Token (EAA...):</label>
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="Paste your EAAG... page access token"
                        className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {tokenSaveSuccess ? <span className="text-emerald-400 font-bold">✓ টোকেন সেভ হয়েছে!</span> : 'টোকেন না থাকলে উপরের সাধারণ শেয়ার উইন্ডো ব্যবহার করুন।'}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const cleanedPageId = pageIdInput.trim() || '1EEg9yAa9A';
                          const cleanedToken = tokenInput.trim();
                          const updatedConfig: ShopConfig = {
                            ...config,
                            facebookPageId: cleanedPageId,
                            facebookPageAccessToken: cleanedToken
                          };
                          saveShopConfig(updatedConfig);
                          if (onConfigUpdate) onConfigUpdate(updatedConfig);
                          await syncScheduleToServer(dailySchedule, cleanedPageId, cleanedToken);
                          setTokenSaveSuccess(true);
                          setTimeout(() => setTokenSaveSuccess(false), 3000);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        টোকেন সেভ করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
