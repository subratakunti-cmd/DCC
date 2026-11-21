import React, { useState, useRef, useEffect } from 'react';
import { ShopConfig, Language } from '../types';
import fbPremiumPoster from '../assets/images/fb_premium_poster_1793516474433.jpg';
import fbBirthdayPoster from '../assets/images/fb_birthday_poster_1793516490115.jpg';
import fbRedVelvetPoster from '../assets/images/fb_redvelvet_poster_1793650189312.jpg';
import fbButterscotchPoster from '../assets/images/fb_butterscotch_poster_1793650203215.jpg';
import {
  Play,
  Pause,
  Download,
  Share2,
  Copy,
  Check,
  Video,
  Sparkles,
  Zap,
  Film,
  Send,
  ExternalLink,
  Volume2
} from 'lucide-react';

interface BakeryVideoReelStudioProps {
  config: ShopConfig;
  lang: Language;
  onPostToFacebook: (posterSrc: string, captionText: string, posterName: string) => void;
}

export const BakeryVideoReelStudio: React.FC<BakeryVideoReelStudioProps> = ({
  config,
  lang,
  onPostToFacebook
}) => {
  const fbUrl = config.facebookPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reel Configuration
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('9:16');
  const [selectedScene, setSelectedScene] = useState<'truffle' | 'birthday' | 'redvelvet' | 'butterscotch'>('truffle');
  const [selectedHook, setSelectedHook] = useState<string>('hook1');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Scenes mapping
  const sceneImages: Record<string, string> = {
    truffle: fbPremiumPoster,
    birthday: fbBirthdayPoster,
    redvelvet: fbRedVelvetPoster,
    butterscotch: fbButterscotchPoster
  };

  const sceneTitles: Record<string, { bn: string; en: string }> = {
    truffle: { bn: 'রয়্যাল বেলজিয়ান চকলেট ট্রাফেল', en: 'Royal Belgian Chocolate Truffle' },
    birthday: { bn: 'লাক্সারি বার্থডে ও পার্টি স্পেশাল', en: 'Luxury Birthday Celebration' },
    redvelvet: { bn: 'রোমান্টিক রেড ভেলভেট হার্ট', en: 'Romantic Red Velvet Heart' },
    butterscotch: { bn: 'ফ্রেশ ফ্রুট ও বাটারস্কচ ডিলাইট', en: 'Fresh Fruit & Butterscotch' }
  };

  const hooks: Record<string, { titleBn: string; subtitleBn: string; badge: string }> = {
    hook1: {
      titleBn: 'ঘাটালের ১ নম্বর ফ্রেশ এগলেস বেকারি! 🎂',
      subtitleBn: 'প্রতিটি উৎসবে সেরা স্বাদ ও নিখুঁত ডিজাইন',
      badge: '১০০% পিওর এগলেস (Pure Veg)'
    },
    hook2: {
      titleBn: 'যেকোনো থিম ও ফটো কেক মাত্র ২-৩ ঘণ্টায়! ⚡',
      subtitleBn: 'মনসুকা, ঘাটাল ও দাসপুরে দ্রুততম ডেলিভারি',
      badge: 'সুপার ফাস্ট ডেলিভারি'
    },
    hook3: {
      titleBn: 'আজই প্রি-অর্ডার করুন ও পান আকর্ষণীয় ছাড়! 🎉',
      subtitleBn: 'বার্থডে, অ্যানিভার্সারি ও পারিবারিক সেলিব্রেশন',
      badge: 'স্পেশাল অফার ₹০ ডেলিভারি'
    },
    hook4: {
      titleBn: 'লাক্সারি বেলজিয়ান চকলেট ও ফ্রেশ ক্রিম ডিলাইট! 🍫',
      subtitleBn: 'মুখে দিলেই মিলিয়ে যাওয়া অতুলনীয় স্বাদ',
      badge: 'প্রিমিয়াম কোয়ালিটি নিশ্চিত'
    }
  };

  // Preload Image elements for smooth Canvas rendering
  const loadedImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    Object.entries(sceneImages).forEach(([key, src]) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        loadedImagesRef.current[key] = img;
      };
    });
  }, []);

  // Animation Loop on Canvas
  useEffect(() => {
    let animationFrameId: number;
    let startTime = Date.now();

    // Bokeh particle generation
    const particles = Array.from({ length: 24 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 4 + 1.5,
      speedY: Math.random() * 0.0008 + 0.0003,
      alpha: Math.random() * 0.7 + 0.3
    }));

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const elapsed = (Date.now() - startTime) / 1000;

      // Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw animated zooming/panning Cake Image
      const img = loadedImagesRef.current[selectedScene];
      if (img && img.complete) {
        ctx.save();
        // Ken Burns effect: subtle scale oscillation 1.0 -> 1.15 over 6 seconds
        const scale = 1.0 + Math.sin(elapsed * 0.8) * 0.08;
        const panX = Math.sin(elapsed * 0.5) * 15;
        const panY = Math.cos(elapsed * 0.6) * 15;

        ctx.translate(width / 2 + panX, height / 2 + panY);
        ctx.scale(scale, scale);

        // Aspect ratio cover
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let renderW = width;
        let renderH = height;

        if (imgRatio > canvasRatio) {
          renderH = height;
          renderW = height * imgRatio;
        } else {
          renderW = width;
          renderH = width / imgRatio;
        }

        ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
        ctx.restore();
      }

      // 2. Dark Vignette Gradients for cinematic video look
      // Top Gradient
      const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.35);
      topGrad.addColorStop(0, 'rgba(5, 10, 24, 0.92)');
      topGrad.addColorStop(0.6, 'rgba(5, 10, 24, 0.6)');
      topGrad.addColorStop(1, 'rgba(5, 10, 24, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, height * 0.35);

      // Bottom Gradient
      const botGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
      botGrad.addColorStop(0, 'rgba(5, 10, 24, 0)');
      botGrad.addColorStop(0.5, 'rgba(5, 10, 24, 0.7)');
      botGrad.addColorStop(1, 'rgba(5, 10, 24, 0.95)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);

      // 3. Floating Celebration Sparkles / Golden Bokeh Particles
      particles.forEach((p) => {
        p.y -= p.speedY;
        if (p.y < 0) p.y = 1;

        const px = p.x * width;
        const py = p.y * height;
        const pulseAlpha = Math.abs(Math.sin(elapsed * 2 + p.x * 10)) * p.alpha;

        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${pulseAlpha})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. HEADER: Bakery Branding & Pulsing Glow Badge
      const is916 = aspectRatio === '9:16';
      const headerY = is916 ? 48 : 34;

      // Top Tag
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '2px';
      ctx.fillText('★ DELICIOUS CAKE CORNER ★', width / 2, headerY);

      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.letterSpacing = '1px';
      ctx.fillText('GHATAL & MANSUKA • 100% FRESH BAKERY', width / 2, headerY + 18);

      // 5. Promotional Badge (Pulsing)
      const currentHook = hooks[selectedHook] || hooks.hook1;
      const badgeY = headerY + 44;
      const badgePulse = 1 + Math.sin(elapsed * 4) * 0.04;

      ctx.save();
      ctx.translate(width / 2, badgeY);
      ctx.scale(badgePulse, badgePulse);

      // Badge pill background
      const badgeText = `✨ ${currentHook.badge} ✨`;
      ctx.font = 'bold 12px system-ui, sans-serif';
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = textMetrics.width + 24;
      const badgeH = 26;

      ctx.fillStyle = 'rgba(234, 88, 12, 0.9)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 13);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 0, 1);
      ctx.restore();

      // 6. Audio Visualizer Simulation (Beat bars at lower third)
      const barCount = 18;
      const barW = 3.5;
      const barGap = 3;
      const visualizerY = is916 ? height * 0.76 : height * 0.72;
      const totalVisW = barCount * (barW + barGap);
      const startVisX = (width - totalVisW) / 2;

      for (let i = 0; i < barCount; i++) {
        const barH = Math.abs(Math.sin(elapsed * 6 + i * 0.4)) * 22 + 4;
        ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#f43f5e';
        ctx.fillRect(startVisX + i * (barW + barGap), visualizerY - barH / 2, barW, barH);
      }

      // 7. FOOTER: Animated Catchy Headline & Bengali Hook
      const footerY = is916 ? height * 0.84 : height * 0.81;

      // Main Headline
      ctx.font = 'bold 18px system-ui, "Hind Siliguri", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(currentHook.titleBn, width / 2, footerY);

      // Subtitle
      ctx.font = '13px system-ui, "Hind Siliguri", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(currentHook.subtitleBn, width / 2, footerY + 22);

      // Call to action bar
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText('📞 WhatsApp / Call: 7866971421', width / 2, footerY + 44);

      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`🌐 FB: facebook.com/share/1EEg9yAa9A/`, width / 2, footerY + 62);

      ctx.shadowBlur = 0;

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedScene, selectedHook, aspectRatio, isPlaying]);

  // Video Reel Recording via MediaRecorder
  const handleRecordVideoReel = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsRecording(true);
      setRecordingProgress(0);

      // Capture 30fps video stream from canvas
      const stream = canvas.captureStream(30);
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm',
        'video/mp4'
      ];
      let selectedMime = 'video/webm';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 2500000
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);

        // Auto download
        const a = document.createElement('a');
        a.href = url;
        a.download = `Delicious_Cake_Corner_${selectedScene}_Reel.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setIsRecording(false);
      };

      recorder.start();

      // Track progress for 6 seconds
      const totalSeconds = 6;
      let cur = 0;
      const interval = setInterval(() => {
        cur += 1;
        setRecordingProgress(Math.min(100, Math.round((cur / totalSeconds) * 100)));
        if (cur >= totalSeconds) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      setIsRecording(false);
    }
  };

  const reelCaption = `🎬✨ ঘাটাল ও মনসুকার এক নম্বর বেকারি Delicious Cake Corner-এর ফ্রেশ রিলস! 🎂✨

${hooks[selectedHook]?.titleBn || 'ঘাটালের ১ নম্বর ফ্রেশ এগলেস বেকারি!'}
${hooks[selectedHook]?.subtitleBn || ''}

🌟 আমাদের স্পেশালিটি:
✅ ১০০% পিওর এগলেস (Pure Veg)
✅ মাত্র ২-৩ ঘণ্টার মধ্যে দ্রুত ডেলিভারি
✅ ফ্রেশ প্রিমিয়াম ক্রিম ও রিচ বেলজিয়ান চকলেট
✅ যেকোনো থিম ও ফটো কেকের সুবিধা

📞 অর্ডার করতে এখনি সরাসরি কল বা হোয়াটসঅ্যাপ করুন:
👉 7866971421 (https://wa.me/917866971421)
📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল (পশ্চিম মেদিনীপুর)
🌐 অফিশিয়াল ফেসবুক পেজ ফলো করুন: ${fbUrl}

#DeliciousCakeCorner #GhatalBakery #FacebookReels #EgglessCakes #ViralReels #CakeReel #Mansuka #Ghatal`;

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-2 border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 text-white">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg border border-white/20">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-white">
                {lang === 'bn' ? '🎥 ফেসবুক ও ইন্সটা রিলস/ভিডিও স্টুডিও' : 'Facebook & Instagram Reels Video Studio'}
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500 text-white uppercase tracking-wider shadow-sm animate-pulse">
                VIRAL REELS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {lang === 'bn'
                ? 'ফেসবুকে ভিডিও ও রিলস দিলে সবচেয়ে বেশি কাস্টমারের কাছে ফ্রিতে পৌঁছায়! এখনি ভিডিও তৈরি ও পোস্ট করুন।'
                : 'Create animated 9:16 vertical Reels & 1:1 Feed videos with Ken-Burns animations and ready captions.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAspectRatio(aspectRatio === '9:16' ? '1:1' : '9:16')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/15 transition-colors cursor-pointer"
          >
            {aspectRatio === '9:16' ? '📱 9:16 Reels Format' : '⏹️ 1:1 Feed Format'}
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Live Canvas Preview Player */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative bg-black rounded-3xl overflow-hidden border-2 border-indigo-400/40 shadow-2xl flex items-center justify-center p-1">
            <canvas
              ref={canvasRef}
              width={aspectRatio === '9:16' ? 360 : 420}
              height={aspectRatio === '9:16' ? 640 : 420}
              className="rounded-2xl max-h-[520px] w-auto object-contain shadow-inner"
            />

            {/* Video Watermark Badge */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[10px] font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>LIVE REEL PREVIEW</span>
            </div>

            {/* Play/Pause Control Overlay */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-lg"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
            </button>
          </div>

          {/* Quick Reel Player Action Bar */}
          <div className="w-full max-w-[420px] grid grid-cols-2 gap-2.5 mt-4">
            <button
              type="button"
              disabled={isRecording}
              onClick={handleRecordVideoReel}
              className={`py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                isRecording
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{isRecording ? `রেকর্ড হচ্ছে... ${recordingProgress}%` : '🎥 ভিডিও রেকর্ড ও ডাউনলোড'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onPostToFacebook(sceneImages[selectedScene], reelCaption, `Delicious_Cake_Corner_${selectedScene}_Reel`);
              }}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>⚡ ১-ক্লিকে রিলস ফেসবুকে পোস্ট</span>
            </button>
          </div>
        </div>

        {/* Right Column: Customizer Controls & Caption */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* 1. Scene / Cake Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
              ১. কেকের দৃশ্য পছন্দ করুন (Select Cake Scene):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(sceneTitles).map(([key, item]) => {
                const isSelected = selectedScene === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedScene(key as any)}
                    className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-rose-400 bg-rose-500/20 shadow-md ring-1 ring-rose-400'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={sceneImages[key]}
                      alt={item.bn}
                      className="w-10 h-10 rounded-lg object-cover border border-white/20 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-[11px] text-white truncate block">{item.bn}</span>
                      <span className="text-[9px] text-slate-400 truncate block">{item.en}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Viral Bengali Hook Headline Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
              ২. আকর্ষণীয় বাংলা হেডলাইন বেছে নিন (Reel Headline):
            </label>
            <div className="space-y-1.5">
              {Object.entries(hooks).map(([key, hook]) => {
                const isSelected = selectedHook === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedHook(key)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/15 shadow-md ring-1 ring-amber-400'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{hook.titleBn}</span>
                      <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-amber-300 font-mono font-bold">
                        {hook.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 block mt-0.5">{hook.subtitleBn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Ready Viral Caption Box */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 pb-1 border-b border-white/10">
              <span className="font-bold text-amber-300">📝 রিলস ও ভিডিও ক্যাপশন (Ready Caption)</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(reelCaption);
                  setCopiedCaption(true);
                  setTimeout(() => setCopiedCaption(false), 2000);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCaption ? 'কপি হয়েছে!' : 'ক্যাপশন কপি'}</span>
              </button>
            </div>
            <p className="font-sans text-[11px] leading-relaxed whitespace-pre-line text-slate-300 max-h-36 overflow-y-auto pr-1">
              {reelCaption}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
