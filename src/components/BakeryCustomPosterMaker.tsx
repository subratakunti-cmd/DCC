import React, { useState, useRef, useEffect } from 'react';
import { ShopConfig, Language } from '../types';
import fbPremiumPoster from '../assets/images/fb_premium_poster_1793516474433.jpg';
import fbBirthdayPoster from '../assets/images/fb_birthday_poster_1793516490115.jpg';
import fbRedVelvetPoster from '../assets/images/fb_redvelvet_poster_1793650189312.jpg';
import fbButterscotchPoster from '../assets/images/fb_butterscotch_poster_1793650203215.jpg';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  Zap,
  Send,
  Upload,
  Palette,
  Image as ImageIcon
} from 'lucide-react';

interface BakeryCustomPosterMakerProps {
  config: ShopConfig;
  lang: Language;
  onPostToFacebook: (posterSrc: string, captionText: string, posterName: string) => void;
}

export const BakeryCustomPosterMaker: React.FC<BakeryCustomPosterMakerProps> = ({
  config,
  lang,
  onPostToFacebook
}) => {
  const fbUrl = config.facebookPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Form inputs
  const [cakeTitle, setCakeTitle] = useState<string>('রয়্যাল স্পেশাল চকলেট কেক');
  const [cakeSubtitle, setCakeSubtitle] = useState<string>('১০০% পিওর এগলেস • মাত্র ২-৩ ঘণ্টায় হোম ডেলিভারি');
  const [offerBadge, setOfferBadge] = useState<string>('ফ্রি হোম ডেলিভারি • ঘাটাল ও মনসুকা');
  const [priceTag, setPriceTag] = useState<string>('মাত্র ₹৩৫০ থেকে শুরু');
  const [selectedBaseImage, setSelectedBaseImage] = useState<string>(fbRedVelvetPoster);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  const baseImageOptions = [
    { id: 'redvelvet', name: 'রেড ভেলভেট হার্ট', src: fbRedVelvetPoster },
    { id: 'truffle', name: 'চকলেট ট্রাফেল', src: fbPremiumPoster },
    { id: 'birthday', name: 'বার্থডে সেলিব্রেশন', src: fbBirthdayPoster },
    { id: 'butterscotch', name: 'ফ্রুট বাটারস্কচ', src: fbButterscotchPoster }
  ];

  // Handle custom image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Render on canvas whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = uploadedImageSrc || selectedBaseImage;

    img.onload = () => {
      const w = 800;
      const h = 800;
      canvas.width = w;
      canvas.height = h;

      // 1. Draw base photo
      ctx.drawImage(img, 0, 0, w, h);

      // 2. Cinematic Gradient Overlay at top and bottom
      const topGrad = ctx.createLinearGradient(0, 0, 0, 220);
      topGrad.addColorStop(0, 'rgba(10, 15, 30, 0.92)');
      topGrad.addColorStop(0.7, 'rgba(10, 15, 30, 0.6)');
      topGrad.addColorStop(1, 'rgba(10, 15, 30, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, 220);

      const botGrad = ctx.createLinearGradient(0, 520, 0, h);
      botGrad.addColorStop(0, 'rgba(10, 15, 30, 0)');
      botGrad.addColorStop(0.4, 'rgba(10, 15, 30, 0.7)');
      botGrad.addColorStop(1, 'rgba(10, 15, 30, 0.96)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 520, w, 280);

      // 3. Golden Filigree Border Frame
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 6;
      ctx.strokeRect(18, 18, w - 36, h - 36);

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 26, w - 52, h - 52);

      // 4. Header Branding
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText('★ DELICIOUS CAKE CORNER ★', w / 2, 65);

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('GHATAL & MANSUKA • 100% FRESH VEG BAKERY', w / 2, 92);

      // 5. Offer / Badge
      if (offerBadge.trim()) {
        const badgeW = 340;
        const badgeH = 36;
        ctx.fillStyle = '#b91c1c';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(w / 2 - badgeW / 2, 115, badgeW, badgeH, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px system-ui, "Hind Siliguri", sans-serif';
        ctx.fillText(`✨ ${offerBadge} ✨`, w / 2, 138);
      }

      // 6. Price Tag Badge (Top Right Corner)
      if (priceTag.trim()) {
        ctx.save();
        ctx.translate(w - 120, 140);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-80, -20, 160, 40, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText(priceTag, 0, 5);
        ctx.restore();
      }

      // 7. Bottom Main Cake Title
      ctx.font = 'bold 32px system-ui, "Hind Siliguri", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(cakeTitle, w / 2, 655);

      // Subtitle
      ctx.font = 'bold 17px system-ui, "Hind Siliguri", sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(cakeSubtitle, w / 2, 692);

      // Contact & Order Information
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText('📞 Call / WhatsApp: 7866971421', w / 2, 730);

      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল | 🌐 FB: facebook.com/share/1EEg9yAa9A/', w / 2, 755);

      ctx.shadowBlur = 0;
    };
  }, [cakeTitle, cakeSubtitle, offerBadge, priceTag, selectedBaseImage, uploadedImageSrc]);

  // Generate Caption
  const customPosterCaption = `🎂✨ ${cakeTitle} — Delicious Cake Corner Ghatal! ✨🎂

${cakeSubtitle}
🌟 অফার: ${offerBadge}
💰 রেট: ${priceTag}

🍰 আমাদের বিশেষ সুবিধা:
✅ ১০০% পিওর এগলেস (Pure Veg Bakery)
✅ ঘাটাল, মনসুকা, দাসপুর ও চন্দ্রকোনায় দ্রুত ডেলিভারি
✅ প্রিমিয়াম টেস্ট ও সেরা ফ্রেশ উপাদান

📞 এখনি সরাসরি কল বা হোয়াটসঅ্যাপে অর্ডার করুন:
👉 7866971421 (https://wa.me/917866971421)
📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল
🌐 অফিশিয়াল ফেসবুক পেজ: ${fbUrl}

#DeliciousCakeCorner #GhatalBakery #CustomCake #EgglessCakes #BirthdayCakeGhatal #Mansuka`;

  // Download Canvas as HD Image
  const handleDownloadCustomPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Delicious_Cake_${cakeTitle.replace(/\s+/g, '_')}_Poster.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1-Click Post Custom Poster to Facebook
  const handlePostCustomToFacebook = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onPostToFacebook(dataUrl, customPosterCaption, `Delicious_Cake_${cakeTitle.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 text-white">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg border border-white/20">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-white">
                {lang === 'bn' ? '🎨 নতুন কাস্টম পোস্টার মেকার স্টুডিও' : 'Custom Cake Poster Designer Studio'}
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider shadow-sm">
                UNLIMITED POSTERS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {lang === 'bn'
                ? 'যেকোনো কেকের নাম, ছবি বা অফার দিয়ে মাত্র ১০ সেকেন্ডে ফেসবুকের জন্য প্রিমিয়াম এইচডি পোস্টার তৈরি করুন!'
                : 'Create brand new HD promotional posters on the fly with custom cake titles, offers, and photos.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Live Canvas Preview */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative bg-black rounded-3xl overflow-hidden border-2 border-amber-400/40 shadow-2xl p-1">
            <canvas
              ref={canvasRef}
              className="rounded-2xl max-w-full h-auto max-h-[500px] object-contain shadow-inner"
            />
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-[420px] grid grid-cols-2 gap-2.5 mt-4">
            <button
              type="button"
              onClick={handleDownloadCustomPoster}
              className="py-3 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs flex items-center justify-center gap-2 transition-all border border-white/20 shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>এইচডি পোস্টার ডাউনলোড</span>
            </button>

            <button
              type="button"
              onClick={handlePostCustomToFacebook}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>⚡ ১-ক্লিকে ফেসবুকে পোস্ট</span>
            </button>
          </div>
        </div>

        {/* Right Column: Customizer Controls */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Base Photo Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                ১. পোস্টারের বেস ফটো বেছে নিন বা নিজস্ব ছবি আপলোড করুন:
              </label>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {baseImageOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedBaseImage(opt.src);
                    setUploadedImageSrc(null);
                  }}
                  className={`p-1.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                    !uploadedImageSrc && selectedBaseImage === opt.src
                      ? 'border-amber-400 bg-amber-400/20 shadow-md ring-1 ring-amber-400'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <img src={opt.src} alt={opt.name} className="w-14 h-14 rounded-lg object-cover mb-1" />
                  <span className="text-[10px] font-bold text-slate-200 truncate w-full">{opt.name}</span>
                </button>
              ))}
            </div>

            {/* Custom Photo Upload */}
            <div className="pt-1">
              <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 text-xs text-amber-200 font-bold transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{uploadedImageSrc ? '✓ নিজস্ব ছবি সিলেক্ট হয়েছে (পরিবর্তন করুন)' : 'নিজের বেকারি থেকে যেকোনো কেকের ছবি আপলোড করুন'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Text Customizations */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">কেকের প্রধান নাম (Title):</label>
              <input
                type="text"
                value={cakeTitle}
                onChange={(e) => setCakeTitle(e.target.value)}
                placeholder="e.g. স্পেশাল ব্ল্যাক ফরেস্ট কেক"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">অফার / ব্যাজ (Offer Badge):</label>
                <input
                  type="text"
                  value={offerBadge}
                  onChange={(e) => setOfferBadge(e.target.value)}
                  placeholder="e.g. ফ্রি হোম ডেলিভারি"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">দাম / স্পেশাল প্রাইস:</label>
                <input
                  type="text"
                  value={priceTag}
                  onChange={(e) => setPriceTag(e.target.value)}
                  placeholder="e.g. মাত্র ₹৩৫০ থেকে শুরু"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">সাবটাইটেল / বর্ণনা (Subtitle):</label>
              <input
                type="text"
                value={cakeSubtitle}
                onChange={(e) => setCakeSubtitle(e.target.value)}
                placeholder="e.g. ১০০% পিওর এগলেস • মাত্র ২ ঘণ্টায় ডেলিভারি"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          {/* Caption Box */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 pb-1 border-b border-white/10">
              <span className="font-bold text-amber-300">📝 স্বয়ংক্রিয় ফেসবুক ক্যাপশন (Auto Caption)</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(customPosterCaption);
                  setCopiedCaption(true);
                  setTimeout(() => setCopiedCaption(false), 2000);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCaption ? 'কপি হয়েছে!' : 'ক্যাপশন কপি'}</span>
              </button>
            </div>
            <p className="font-sans text-[11px] leading-relaxed whitespace-pre-line text-slate-300 max-h-32 overflow-y-auto pr-1">
              {customPosterCaption}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
