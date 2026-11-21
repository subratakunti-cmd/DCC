import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  ExternalLink,
  Copy,
  Check,
  Package,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Store,
  HelpCircle,
  Share2
} from 'lucide-react';

interface PlayStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PlayStoreModal: React.FC<PlayStoreModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'assets' | 'kit' | 'install'>('guide');

  // Live app production URL
  const appUrl = typeof window !== 'undefined'
    ? (window.location.origin.includes('localhost')
        ? 'https://ais-pre-7horp6gssg2hdcmryj25ch-268324610539.asia-east1.run.app'
        : window.location.origin)
    : 'https://ais-pre-7horp6gssg2hdcmryj25ch-268324610539.asia-east1.run.app';

  const pwabuilderUrl = `https://www.pwabuilder.com?site=${encodeURIComponent(appUrl)}`;

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);

      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'মোবাইল ক্রোমে এই পেজটি খুলে উপরের ডানদিকের থ্রি-ডট (⋮) মেনুতে চাপুন এবং "Install app" বা "Add to Home screen"-এ ক্লিক করুন।'
      );
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const playStoreData = {
    appName: 'DELICIOUS CAKE CORNER — Bakery POS & Billing',
    packageName: 'com.deliciouscakecorner.pos',
    shortDesc: 'Smart Bakery Billing, Cake Orders, Thermal Receipts & Stock (100% Eggless)',
    fullDesc: `DELICIOUS CAKE CORNER — Official Point of Sale (POS) and Smart Bakery Billing Application for Delicious Cake Corner (100% Eggless Pure Vegetarian Bakery & Cake Studio, Mansuka, Ghatal).

✨ KEY FEATURES:
• Instant Thermal Receipt & Standard A4/A5 Printing
• WhatsApp & Direct SMS Bill Sharing with One Click
• UPI Dynamic QR Code Payments (PhonePe, GPay, Paytm)
• Real-time Inventory & Low-Stock Alerts
• Birthday & Custom Cake Advance Booking Tracker
• Offline Support — works even when internet is down
• Cloud Backup with Google Sheets and Firestore Sync
• Multi-language support (English & বাংলা)

📍 Store Address: Mansuka, Gharoighat, Ghatal-Panskura Road, Paschim Medinipur, WB - 721212
📞 Contact Phone: +91 7866971421
🌐 Developer Email: subratakunti@gmail.com`,
    category: 'Food & Drink / Business',
    developerEmail: 'subratakunti@gmail.com',
    privacyUrl: `${appUrl}/privacy.html`,
    assetLinksUrl: `${appUrl}/.well-known/assetlinks.json`,
    twaManifestUrl: `${appUrl}/twa-manifest.json`
  };

  const handleDownloadUploadKit = () => {
    const kitText = `=======================================================
GOOGLE PLAY STORE UPLOAD KIT — DELICIOUS CAKE CORNER
=======================================================

App Name: ${playStoreData.appName}
Package ID: ${playStoreData.packageName}
Live App URL: ${appUrl}
Privacy Policy URL (Mandatory for Play Store): ${playStoreData.privacyUrl}
Digital Asset Links URL: ${playStoreData.assetLinksUrl}
TWA Manifest URL: ${playStoreData.twaManifestUrl}
Developer Contact Email: ${playStoreData.developerEmail}

-------------------------------------------------------
1. SHORT DESCRIPTION (Under 80 Characters):
-------------------------------------------------------
${playStoreData.shortDesc}

-------------------------------------------------------
2. FULL DESCRIPTION:
-------------------------------------------------------
${playStoreData.fullDesc}

-------------------------------------------------------
3. HOW TO GENERATE .AAB (ANDROID APP BUNDLE) IN 1 MINUTE:
-------------------------------------------------------
Method A (Zero Coding via Browser):
1. Go to: https://www.pwabuilder.com?site=${encodeURIComponent(appUrl)}
2. Click "Package for Stores"
3. Select "Google Play"
4. Click "Generate Package" -> It will build and download your signed .aab and .apk!

Method B (Official Google Bubblewrap CLI):
1. In terminal run:
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest=${appUrl}/manifest.json
   bubblewrap build
2. The output "app-release-bundle.aab" is ready for Google Play Console!

-------------------------------------------------------
4. UPLOAD TO GOOGLE PLAY CONSOLE:
-------------------------------------------------------
1. Open: https://play.google.com/console
2. Click "Create app"
   - App Name: DELICIOUS CAKE CORNER
   - Default Language: Bengali (bn-IN) or English (en-IN)
   - App or Game: App
   - Free or Paid: Free
3. In "App Content" -> Fill "Privacy Policy":
   URL: ${playStoreData.privacyUrl}
4. In "Production" -> "Create new release" -> Upload your .aab file!
5. Submit for Review! Usually approved within 2-3 business days.
=======================================================
`;

    const blob = new Blob([kitText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'DELICIOUS_CAKE_CORNER_PLAY_STORE_KIT.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 border border-slate-200 flex flex-col text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                <span>Google Play Store & Android App</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  PWA & TWA Ready
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                অ্যাপটিকে গুগল প্লে স্টোরে আপলোড এবং মোবাইলে ইনস্টল করার সম্পূর্ণ কিট
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl my-3 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'guide'
                ? 'bg-white text-[#4b1d3f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>১. আপলোড গাইড</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'assets'
                ? 'bg-white text-[#4b1d3f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>২. লিস্টিং তথ্য</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kit')}
            className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'kit'
                ? 'bg-white text-[#4b1d3f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>৩. কিট ফাইল</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'install'
                ? 'bg-white text-[#4b1d3f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>৪. ইনস্টল</span>
          </button>
        </div>

        {/* TAB 1: Step-by-Step Play Store Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-4 text-xs text-left leading-relaxed">
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>আপনার অ্যাপটি এখন ১০০% গুগল প্লে স্টোর কম্প্যাটিবল!</span>
              </div>
              <p className="text-emerald-900 text-xs">
                আমরা আপনার অ্যাপে <strong>Web App Manifest (manifest.json)</strong>, <strong>Service Worker (sw.js)</strong> এবং <strong>হালনাগাদ আইকন</strong> যুক্ত করে দিয়েছি। এখন প্লে স্টোরের <strong>.aab (Android App Bundle)</strong> ফাইল তৈরি করা খুব সহজ।
              </p>
            </div>

            {/* PWABuilder Error Fix Box */}
            <div className="p-3.5 bg-rose-50/90 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-950 font-bold text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black">!</span>
                  <span>PWABuilder-এ "Create a web app manifest" এরর দেখালে সমাধান:</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify({
                    id: "com.deliciouscakecorner.pos",
                    name: "DELICIOUS CAKE CORNER — Bakery POS & Billing",
                    short_name: "DCC Billing",
                    description: "Smart billing, Point of Sale, order management and stock tracker for Delicious Cake Corner (100% Eggless Pure Veg Bakery), Mansuka, Ghatal.",
                    start_url: "/",
                    scope: "/",
                    display: "standalone",
                    orientation: "any",
                    background_color: "#f8f6f4",
                    theme_color: "#4b1d3f",
                    lang: "bn",
                    icons: [
                      {
                        src: `${appUrl}/pwa-192x192.png`,
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any"
                      },
                      {
                        src: `${appUrl}/pwa-512x512.png`,
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any"
                      },
                      {
                        src: `${appUrl}/pwa-512x512.png`,
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                      }
                    ]
                  }, null, 2), 'manifestJson')}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1 shrink-0"
                >
                  {copiedKey === 'manifestJson' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'manifestJson' ? 'কপি হয়েছে!' : 'Copy Manifest JSON'}</span>
                </button>
              </div>
              <div className="text-rose-900 text-[11px] leading-relaxed space-y-1">
                <p>
                  <strong>মোবাইলে এডিট বক্স না আসলে কী করবেন?</strong>
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><strong>উপায় ১ (ডেস্কটপ মোড অন করুন):</strong> মোবাইলের ক্রোম (Chrome) ব্রাউজারের ওপরের ডানদিকের <strong>থ্রি-ডট (⋮)</strong> মেনুতে চাপ দিন এবং <strong>"Desktop site"</strong> বক্সে টিক দিন। পুরো এডিট বক্স ও Manifest এডিটর সাথে সাথে দৃশ্যমান হবে।</li>
                  <li><strong>উপায় ২ (AI Studio Share বাটন):</strong> AI Studio পেজের ওপরে <strong>"Share"</strong> বাটনে ক্লিক করে পাবলিক লিঙ্ক তৈরি করুন। তাহলে PWABuilder কোনো এডিট বক্স ছাড়াই স্বয়ংক্রিয়ভাবে সব ফাইল পেয়ে যাবে।</li>
                  <li><strong>উপায় ৩ (সরাসরি ডাউনলোড):</strong> ওপরের <strong>"৩. কিট ফাইল"</strong> ট্যাবে যান এবং ১-ক্লিকেই আপনার প্লে স্টোর কিট ফাইলটি ডাউনলোড করে নিন।</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <span>প্লে স্টোরে আপলোড করার ৪টি সহজ ধাপ:</span>
              </h4>

              {/* Step 1 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#4b1d3f] text-white flex items-center justify-center text-[10px]">1</span>
                    আপনার অ্যাপের লাইভ লিঙ্ক কপি করুন:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(appUrl, 'appUrl')}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                  >
                    {copiedKey === 'appUrl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'appUrl' ? 'কপি হয়েছে' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-600 truncate">
                  {appUrl}
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#4b1d3f] text-white flex items-center justify-center text-[10px]">2</span>
                  PWABuilder-এ যান (গুগল ও মাইক্রোসফটের অফিশিয়াল টুল):
                </span>
                <p className="text-slate-600 text-xs">
                  নিচের বাটনে চাপ দিলে সরাসরি PWABuilder খুলে যাবে এবং আপনার অ্যাপের সমস্ত PWA ফাইল স্বয়ংক্রিয়ভাবে স্ক্যান করে নেবে।
                </p>
                <a
                  href={pwabuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>PWABuilder-এ প্লে স্টোর প্যাকেজ তৈরি করুন</span>
                </a>
              </div>

              {/* Step 3 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#4b1d3f] text-white flex items-center justify-center text-[10px]">3</span>
                  Package for Google Play ডাউনলোড করুন:
                </span>
                <p className="text-slate-600 text-xs">
                  PWABuilder পেজে <strong>"Package for Stores"</strong> বাটনে ক্লিক করে <strong>"Google Play"</strong> অপশন সিলেক্ট করুন। এরপর <strong>"Generate Package"</strong> চাপলে আপনার জন্য প্রস্তুত <strong>.aab (Android App Bundle)</strong> এবং <strong>.apk</strong> ফাইল জিপ আকারে ডাউনলোড হবে।
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#4b1d3f] text-white flex items-center justify-center text-[10px]">4</span>
                  Google Play Console-এ আপলোড করুন:
                </span>
                <p className="text-slate-600 text-xs">
                  <strong>play.google.com/console</strong>-এ লগইন করুন (গুগলের $25 ওয়ান-টাইম ডেভেলপার ফি লাগে)। সেখানে "Create app" দিয়ে আপনার প্রাপ্ত <strong>.aab</strong> ফাইলটি আপলোড করে দিন। ২-৩ দিনের মধ্যে অ্যাপটি প্লে স্টোরে লাইভ হয়ে যাবে!
                </p>
                <a
                  href="https://play.google.com/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-700 font-semibold hover:text-[#4b1d3f] underline text-xs"
                >
                  <span>Open Google Play Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Play Store Listing Information (Copy-Paste) */}
        {activeTab === 'assets' && (
          <div className="space-y-3.5 text-xs text-left">
            <p className="text-slate-600">
              প্লে স্টোর কনসোলে ফর্ম ফিলাপ করার সময় নিচের তথ্যগুলি সরাসরি কপি করে বসিয়ে দিন:
            </p>

            {/* App Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">App Name (অ্যাপের নাম):</label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(playStoreData.appName, 'name')}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                >
                  {copiedKey === 'name' ? 'কপি হয়েছে' : 'Copy'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={playStoreData.appName}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-800"
              />
            </div>

            {/* Package Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Package ID:</label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(playStoreData.packageName, 'pkg')}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                >
                  {copiedKey === 'pkg' ? 'কপি হয়েছে' : 'Copy'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={playStoreData.packageName}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono text-slate-800"
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Short Description (অনূর্ধ্ব ৮০ অক্ষর):</label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(playStoreData.shortDesc, 'shortDesc')}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                >
                  {copiedKey === 'shortDesc' ? 'কপি হয়েছে' : 'Copy'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={playStoreData.shortDesc}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
              />
            </div>

            {/* Full Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Full Description (সম্পূর্ণ বিবরণ):</label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(playStoreData.fullDesc, 'fullDesc')}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                >
                  {copiedKey === 'fullDesc' ? 'কপি হয়েছে' : 'Copy Full Description'}
                </button>
              </div>
              <textarea
                rows={6}
                readOnly
                value={playStoreData.fullDesc}
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 leading-relaxed font-sans text-xs"
              />
            </div>
            {/* Privacy Policy URL (Mandatory by Google Play) */}
            <div className="space-y-1 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="font-bold text-emerald-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Privacy Policy URL (প্লে স্টোরের জন্য বাধ্যতামূলক):</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <a
                    href={playStoreData.privacyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 hover:text-[#4b1d3f] flex items-center gap-1"
                  >
                    <span>View Page</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(playStoreData.privacyUrl, 'privacy')}
                    className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300"
                  >
                    {copiedKey === 'privacy' ? 'কপি হয়েছে' : 'Copy URL'}
                  </button>
                </div>
              </div>
              <input
                type="text"
                readOnly
                value={playStoreData.privacyUrl}
                className="w-full px-2 py-1 border border-emerald-200 rounded bg-white font-mono text-[11px] text-emerald-950 truncate"
              />
            </div>

            {/* Digital Asset Links */}
            <div className="space-y-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <span>Digital Asset Links (.well-known/assetlinks.json):</span>
                </label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(playStoreData.assetLinksUrl, 'assetlinks')}
                  className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300"
                >
                  {copiedKey === 'assetlinks' ? 'কপি হয়েছে' : 'Copy'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={playStoreData.assetLinksUrl}
                className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-mono text-[11px] text-slate-700 truncate"
              />
            </div>
          </div>
        )}

        {/* TAB 3: Download Complete Play Store Kit */}
        {activeTab === 'kit' && (
          <div className="space-y-4 text-xs text-left">
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                <Package className="w-4 h-4 text-purple-600" />
                <span>প্লে স্টোর প্যাকেজিং কিট (All-in-One Download Kit)</span>
              </div>
              <p className="text-purple-900 leading-relaxed">
                প্লে স্টোরে আপলোড করার জন্য প্রয়োজনীয় কনফিগ ফাইল, ডেসক্রিপশন এবং নির্দেশাবলী ১-ক্লিকেই ডাউনলোড করে সংরক্ষণ করুন।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Text Kit */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[#4b1d3f]" />
                    <span>প্লে স্টোর লিস্টিং কিট (.txt)</span>
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-1">
                    সম্পূর্ণ বিবরণ, প্রাইভেসি পলিসি লিঙ্ক, ট্যাগ ও গাইড সম্বলিত রেডি টেক্সট ফাইল।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadUploadKit}
                  className="w-full py-2 px-3 bg-[#4b1d3f] hover:bg-[#38152e] text-white font-bold rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ডাউনলোড কিট ফাইল (.txt)</span>
                </button>
              </div>

              {/* Card 2: Bubblewrap TWA Manifest */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>TWA Manifest (twa-manifest.json)</span>
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-1">
                    গুগল বাবলর‍্যাপ (Bubblewrap CLI) দিয়ে সরাসরি .aab বিল্ড করার কনফিগারেশন।
                  </p>
                </div>
                <a
                  href="/twa-manifest.json"
                  download="twa-manifest.json"
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ডাউনলোড twa-manifest.json</span>
                </a>
              </div>
            </div>

            {/* Bubblewrap CLI instructions */}
            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-400 font-sans text-xs">
                <span className="font-bold text-amber-400">⚡ Google CLI দিয়ে .aab তৈরির কমান্ড:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`npx @bubblewrap/cli build`, 'cliCmd')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  {copiedKey === 'cliCmd' ? 'কপি হয়েছে!' : 'Copy Command'}
                </button>
              </div>
              <div className="p-2 bg-black/50 rounded text-emerald-300">
                npx @bubblewrap/cli build
              </div>
              <p className="text-slate-400 font-sans text-[11px]">
                এই কমান্ডটি চালালে আপনার কম্পিউটারে স্বয়ংক্রিয়ভাবে <code className="text-amber-300">app-release-bundle.aab</code> তৈরি হয়ে যাবে যা সরাসরি প্লে স্টোরে আপলোডযোগ্য।
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Instant Mobile App Install (Without Waiting for Play Store) */}
        {activeTab === 'install' && (
          <div className="space-y-4 text-xs text-left">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>প্লে স্টোর ছাড়াই আপনার মোবাইলে ইনস্টল করে নিন!</span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                প্লে স্টোরে আপলোড করার জন্য অপেক্ষা করতে হবে না। আপনার অ্যান্ড্রয়েড মোবাইল বা ট্যাবলেটে এটি <strong>১-ক্লিকেই অরিজিনাল অ্যাপ হিসেবে</strong> ইনস্টল করে নেওয়া যায়।
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#4b1d3f] p-1 shadow-md">
                <img
                  src="/pwa-192x192.png"
                  alt="Delicious Cake Corner App Icon"
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as any).src = '/icon.svg';
                  }}
                />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  DELICIOUS CAKE CORNER
                </h4>
                <p className="text-slate-500 text-xs">
                  Bakery Billing & Order Management App
                </p>
              </div>

              {isInstalled ? (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>আপনার ডিভাইসে এই অ্যাপটি ইতোমধ্যে ইনস্টল করা রয়েছে!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>মোবাইলে সরাসরি ইনস্টল করুন (Install on Device)</span>
                </button>
              )}

              <div className="pt-2 text-slate-500 text-[11px] leading-relaxed max-w-sm mx-auto text-left space-y-1">
                <p className="font-semibold text-slate-700">কীভাবে ইনস্টল হবে?</p>
                <p>• <strong>Android Chrome:</strong> উপরের সবুজ বাটনে চাপুন অথবা ব্রাউজারের থ্রি-ডট (⋮) মেনু থেকে "Install app" চাপুন।</p>
                <p>• <strong>iPhone / iPad Safari:</strong> সাফারি ব্রাউজারের নিচের 'Share' আইকনে চাপ দিয়ে 'Add to Home Screen' চাপুন।</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            DELICIOUS CAKE CORNER • Play Store Companion
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
          >
            Close / বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
