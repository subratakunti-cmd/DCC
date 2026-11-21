import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer, build as viteBuild } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import net from 'net';

dotenv.config();

const app = express();
function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const p = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(p)) return p;
  }
  if (process.env.PORT) {
    const envPort = Number(process.env.PORT);
    if (!isNaN(envPort) && envPort > 0) return envPort;
  }
  return 3000;
}
const PORT = getPort();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve public directory directly with CORS enabled (manifest.json, sw.js, icons, assetlinks)
app.use(express.static(path.resolve(process.cwd(), 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('manifest.json') || filePath.endsWith('manifest.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (filePath.endsWith('sw.js')) {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (filePath.includes('assetlinks.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }
}));

app.use(express.json({ limit: '5mb' }));

interface SmsLogEntry {
  id: string;
  timestamp: number;
  to: string;
  message: string;
  billNo?: string;
  customerName?: string;
  type: string;
  status: 'sent' | 'delivered' | 'failed';
  provider: string;
  messageId: string;
  error?: string;
}

const smsLogs: SmsLogEntry[] = [];

/**
 * Validates whether an SMS Gateway API key is genuine (not placeholder/dummy like '123' or 'MY_KEY')
 */
function isValidGatewayKey(key?: string): boolean {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 15) return false;
  if (k.startsWith('MY_') || k === '123' || k === 'demo' || k === 'test' || k === 'sample' || k.toLowerCase().includes('placeholder')) {
    return false;
  }
  return true;
}

/**
 * Safely parse JSON from a fetch response without throwing "Unexpected end of JSON input"
 */
async function safeFetchJson(response: globalThis.Response): Promise<{ data: any; raw: string }> {
  const raw = await response.text().catch(() => '');
  if (!raw || !raw.trim()) return { data: null, raw: '' };
  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: null, raw };
  }
}

/**
 * POST /api/send-sms
 * Dispatches digital receipts & loyalty updates via configured SMS API (Fast2SMS, Twilio, MSG91, or Sandbox Simulator).
 * Fully protected against empty response / JSON parsing errors and invalid credentials.
 */
app.post('/api/send-sms', async (req: Request, res: Response) => {
  try {
    const { to, message, billNo, customerName, type = 'receipt', mode, fallbackToSimulator = true } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Recipient mobile number and message content are required'
      });
    }

    const cleanPhone = String(to).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number. Please provide a 10-digit Indian phone number.'
      });
    }

    const target10 = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM_NUMBER;
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;

    const hasFast2sms = isValidGatewayKey(fast2smsKey);
    const hasTwilio = isValidGatewayKey(twilioSid) && isValidGatewayKey(twilioToken) && Boolean(twilioFrom);
    const hasMsg91 = isValidGatewayKey(msg91AuthKey);

    let provider = 'Sandbox Simulated Gateway (Instant Demo & Testing)';
    let messageId = `DCC-SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    let isRealProvider = false;
    let deliveryStatus: 'sent' | 'delivered' | 'failed' = 'delivered';
    let deliveryError: string | undefined;

    // Forced sandbox mode or no genuine gateway configured
    if (mode === 'sandbox' || (!hasFast2sms && !hasTwilio && !hasMsg91)) {
      console.log(`[SMS-SIMULATOR] Instant simulated delivery to +91${target10} (Bill: ${billNo || 'N/A'})`);
      deliveryStatus = 'delivered';
      provider = 'Sandbox Simulated Gateway';
    }
    // 1. Fast2SMS Indian SMS Gateway Integration
    else if (hasFast2sms && fast2smsKey) {
      provider = 'Fast2SMS India';
      isRealProvider = true;
      try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': fast2smsKey.trim(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'q',
            message: message,
            language: 'unicode',
            flash: 0,
            numbers: target10
          })
        });

        const { data: result, raw } = await safeFetchJson(response);

        if (response.ok && result && result.return) {
          messageId = result.request_id || messageId;
          deliveryStatus = 'sent';
        } else {
          console.warn('Fast2SMS response notice:', response.status, raw);
          const rawErrMsg = result?.message
            ? (Array.isArray(result.message) ? result.message.join(', ') : result.message)
            : (raw.slice(0, 120) || `HTTP ${response.status}`);

          if (fallbackToSimulator) {
            console.log(`[SMS] Fast2SMS key or credit issue (${rawErrMsg}), falling back to Sandbox Simulator.`);
            deliveryStatus = 'delivered';
            provider = 'Sandbox Simulator (Fast2SMS Fallback)';
            messageId = `DCC-SIM-${Date.now().toString(36).toUpperCase()}`;
          } else {
            deliveryStatus = 'failed';
            deliveryError = `Fast2SMS Gateway Error: ${rawErrMsg}`;
          }
        }
      } catch (err: any) {
        console.warn('Fast2SMS network error:', err?.message);
        if (fallbackToSimulator) {
          deliveryStatus = 'delivered';
          provider = 'Sandbox Simulator (Fast2SMS Network Fallback)';
          messageId = `DCC-SIM-${Date.now().toString(36).toUpperCase()}`;
        } else {
          deliveryStatus = 'failed';
          deliveryError = err?.message || 'Fast2SMS network connection failure';
        }
      }
    }
    // 2. Twilio Cloud SMS Gateway Integration
    else if (hasTwilio && twilioSid && twilioToken && twilioFrom) {
      provider = 'Twilio SMS';
      isRealProvider = true;
      try {
        const formattedTo = cleanPhone.startsWith('91')
          ? `+${cleanPhone}`
          : (cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`);
        const auth = Buffer.from(`${twilioSid.trim()}:${twilioToken.trim()}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', formattedTo);
        params.append('From', twilioFrom.trim());
        params.append('Body', message);

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid.trim()}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        const { data: result, raw } = await safeFetchJson(response);

        if (response.ok && result && result.sid) {
          messageId = result.sid;
          deliveryStatus = 'sent';
        } else {
          console.warn('Twilio response notice:', response.status, raw);
          const rawErrMsg = result?.message || raw.slice(0, 120) || `HTTP ${response.status}`;
          if (fallbackToSimulator) {
            deliveryStatus = 'delivered';
            provider = 'Sandbox Simulator (Twilio Fallback)';
            messageId = `DCC-SIM-${Date.now().toString(36).toUpperCase()}`;
          } else {
            deliveryStatus = 'failed';
            deliveryError = `Twilio SMS Error: ${rawErrMsg}`;
          }
        }
      } catch (err: any) {
        console.warn('Twilio dispatch error:', err?.message);
        if (fallbackToSimulator) {
          deliveryStatus = 'delivered';
          provider = 'Sandbox Simulator (Twilio Network Fallback)';
          messageId = `DCC-SIM-${Date.now().toString(36).toUpperCase()}`;
        } else {
          deliveryStatus = 'failed';
          deliveryError = err?.message || 'Twilio connection failed';
        }
      }
    }
    // 3. MSG91 Gateway Integration
    else if (hasMsg91 && msg91AuthKey) {
      provider = 'MSG91';
      isRealProvider = true;
      try {
        const senderId = process.env.MSG91_SENDER_ID || 'DCCBNG';
        const response = await fetch('https://api.msg91.com/api/v2/sendsms', {
          method: 'POST',
          headers: {
            'authkey': msg91AuthKey.trim(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: senderId,
            route: '4',
            country: '91',
            sms: [{ message, to: [target10] }]
          })
        });

        const { data: result, raw } = await safeFetchJson(response);

        if (response.ok && result && result.type === 'success') {
          messageId = result.message || messageId;
          deliveryStatus = 'sent';
        } else {
          const rawErrMsg = result?.message || raw.slice(0, 120) || `HTTP ${response.status}`;
          if (fallbackToSimulator) {
            deliveryStatus = 'delivered';
            provider = 'Sandbox Simulator (MSG91 Fallback)';
            messageId = `DCC-SIM-${Date.now().toString(36).toUpperCase()}`;
          } else {
            deliveryStatus = 'failed';
            deliveryError = `MSG91 Error: ${rawErrMsg}`;
          }
        }
      } catch (err: any) {
        console.warn('MSG91 dispatch error:', err?.message);
        if (fallbackToSimulator) {
          deliveryStatus = 'delivered';
          provider = 'Sandbox Simulator (MSG91 Network Fallback)';
          messageId = `DCC-SIM-${Date.now().toString(36).toUpperCase()}`;
        } else {
          deliveryStatus = 'failed';
          deliveryError = err?.message || 'MSG91 error';
        }
      }
    }

    const logEntry: SmsLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      to: target10,
      message,
      billNo,
      customerName,
      type,
      status: deliveryStatus,
      provider,
      messageId,
      error: deliveryError
    };

    smsLogs.unshift(logEntry);
    if (smsLogs.length > 150) smsLogs.pop();

    return res.json({
      success: deliveryStatus !== 'failed',
      messageId,
      provider,
      status: deliveryStatus,
      error: deliveryError,
      isRealProvider,
      to: target10,
      timestamp: logEntry.timestamp
    });
  } catch (error: any) {
    console.error('Error dispatching SMS:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Server error dispatching SMS'
    });
  }
});

/**
 * GET /api/sms/status
 * Returns gateway health and provider status
 */
app.get('/api/sms/status', (_req: Request, res: Response) => {
  const hasFast2Sms = isValidGatewayKey(process.env.FAST2SMS_API_KEY);
  const hasTwilio = isValidGatewayKey(process.env.TWILIO_ACCOUNT_SID) && isValidGatewayKey(process.env.TWILIO_AUTH_TOKEN) && Boolean(process.env.TWILIO_FROM_NUMBER);
  const hasMsg91 = isValidGatewayKey(process.env.MSG91_AUTH_KEY);

  let activeGateway = 'Sandbox Simulated Gateway (Instant Demo & Testing)';
  if (hasFast2Sms) activeGateway = 'Fast2SMS India';
  else if (hasTwilio) activeGateway = 'Twilio Cloud SMS';
  else if (hasMsg91) activeGateway = 'MSG91';

  return res.json({
    status: 'ready',
    activeGateway,
    isKeyConfigured: hasFast2Sms || hasTwilio || hasMsg91,
    totalDispatched: smsLogs.length,
    senderPhone: '7866971421'
  });
});

/**
 * GET /api/sms/history
 * Returns recent sent messages for review
 */
app.get('/api/sms/history', (_req: Request, res: Response) => {
  return res.json({ logs: smsLogs.slice(0, 100) });
});

/**
 * DELETE /api/sms/history
 * Clears SMS logs on server
 */
app.delete('/api/sms/history', (_req: Request, res: Response) => {
  smsLogs.length = 0;
  return res.json({ success: true, message: 'SMS logs cleared' });
});

/**
 * DELETE /api/sms/log/:id
 * Deletes single SMS log on server
 */
app.delete('/api/sms/log/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = smsLogs.findIndex((l) => l.id === id);
  if (index !== -1) {
    smsLogs.splice(index, 1);
  }
  return res.json({ success: true, message: 'SMS log deleted' });
});

/**
 * POST /api/printer/network-print
 * Sends raw ESC/POS byte stream directly to Network IP printer on port 9100
 */
app.post('/api/printer/network-print', (req: Request, res: Response) => {
  const { ip, port = 9100, rawBase64 } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'Printer IP address required' });
  }

  const portNum = Number(port) || 9100;
  const buffer = Buffer.from(rawBase64 || '', 'base64');
  const socket = new net.Socket();
  let responded = false;

  socket.setTimeout(3000);

  socket.connect(portNum, ip, () => {
    socket.write(buffer, () => {
      socket.end();
      if (!responded) {
        responded = true;
        return res.json({
          success: true,
          message: `Dispatched ${buffer.length} bytes to Network IP Printer (${ip}:${portNum})`
        });
      }
    });
  });

  socket.on('timeout', () => {
    socket.destroy();
    if (!responded) {
      responded = true;
      return res.json({
        success: false,
        error: `Printer at ${ip}:${portNum} timed out (device offline or subnet unreachable). System dialog opened as fallback.`
      });
    }
  });

  socket.on('error', (err) => {
    socket.destroy();
    if (!responded) {
      responded = true;
      return res.json({
        success: false,
        error: `Network printer connection error (${ip}:${portNum}): ${err.message}`
      });
    }
  });
});

/**
 * GET /api/printer/status
 * Returns printer fleet status information
 */
app.get('/api/printer/status', (_req: Request, res: Response) => {
  return res.json({
    status: 'ready',
    supportedProtocols: ['System Spooler', 'Web Bluetooth ESC/POS', 'WebUSB ESC/POS', 'Raw IP Port 9100', 'PDF Virtual'],
    defaultPort: 9100
  });
});

/**
 * GET /api/posters/:type
 * Returns high-resolution cake poster image (truffle, birthday, redvelvet, butterscotch)
 */
app.get('/api/posters/:type', (req: Request, res: Response) => {
  const { type } = req.params;
  let filename = 'fb_premium_poster_1793516474433.jpg';
  if (type === 'birthday') filename = 'fb_birthday_poster_1793516490115.jpg';
  else if (type === 'redvelvet') filename = 'fb_redvelvet_poster_1793650189312.jpg';
  else if (type === 'butterscotch') filename = 'fb_butterscotch_poster_1793650203215.jpg';

  const filePath = path.resolve(process.cwd(), 'src/assets/images', filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Poster image not found' });
});

const FB_SCHEDULE_FILE = path.resolve(process.cwd(), '.dcc-fb-schedule.json');

interface ServerDailyFbLog {
  id: string;
  date: string;
  timestamp: number;
  dayIndex: number;
  posterType: 'truffle' | 'birthday' | 'redvelvet' | 'butterscotch';
  titleBn: string;
  caption: string;
  mode: 'graph_api' | 'manual_composer' | 'auto_prepared' | 'error';
  status: 'published' | 'ready' | 'failed';
  postId?: string;
  postUrl?: string;
  error?: string;
}

interface ServerDailyFbScheduleState {
  enabled: boolean;
  postTime: string;
  pageId: string;
  pageAccessToken: string;
  fbPageUrl: string;
  lastPostedDate: string;
  lastPreparedDate: string;
  lastStatus: 'published' | 'ready' | 'failed';
  lastMessage: string;
  lastPostUrl: string;
  customCaptions: Record<string, string>;
  logs: ServerDailyFbLog[];
}

function getServerISTDate(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function getServerISTTimeHHMM(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    return date.toTimeString().slice(0, 5);
  }
}

function getServerISTDayIndex(date: Date = new Date()): number {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short'
    }).format(date);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[weekday] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}

const SERVER_DAILY_FB_PLAN: Array<{
  dayIndex: number;
  dayNameBn: string;
  posterType: 'truffle' | 'birthday' | 'redvelvet' | 'butterscotch';
  titleBn: string;
  buildCaption: (fbUrl: string) => string;
}> = [
  {
    dayIndex: 0,
    dayNameBn: 'রবিবার',
    posterType: 'butterscotch',
    titleBn: 'রবিবার ফ্যামিলি ফিস্ট — ফ্রেশ ফ্রুট ও বাটারস্কচ',
    buildCaption: (fbUrl: string) =>
      `🍍🎉 শুভ রবিবার! পরিবারের সবার সাথে মিষ্টি আড্ডায় নিয়ে আসুন ফ্রেশ এক্সোটিক ফ্রুট ও বাটারস্কচ কেক — DELICIOUS CAKE CORNER! 🍰✨\n\nপ্রতিটি কামড়ে পাবেন ক্রাঞ্চি প্র্যালিন, ফ্রেশ কিউই, স্ট্রবেরি ও সোনালী ক্যারামেল ড্রিপ!\n✅ ১০০% পিওর এগলেস (Pure Veg Bakery)\n✅ ঘাটাল, মনসুকা ও দাসপুরে দ্রুত হোম ডেলিভারি\n\n📞 আজই অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#SundaySpecial #DeliciousCakeCorner #ButterscotchCake #GhatalBakery #Mansuka #EgglessCakes`
  },
  {
    dayIndex: 1,
    dayNameBn: 'সোমবার',
    posterType: 'truffle',
    titleBn: 'সোমবার রয়্যাল বেলজিয়ান চকলেট ট্রাফেল',
    buildCaption: (fbUrl: string) =>
      `🍫✨ সপ্তাহের শুরু হোক রাজকীয় স্বাদে — রয়্যাল বেলজিয়ান চকলেট ট্রাফেল কেক! ✨🍫\n\nঘাটাল ও মনসুকার কেক প্রেমীদের এক নম্বর পছন্দ, ১০০% এগলেস রিচ ডার্ক চকলেট ট্রাফেল কেক।\n✅ মাত্র ২-৩ ঘণ্টার মধ্যে ফ্রেশ বেক করে ডেলিভারি\n✅ জন্মদিন, সারপ্রাইজ ও যেকোনো সেলিব্রেশনে সেরা\n\n📞 কল বা হোয়াটসঅ্যাপ: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 পেজ ফলো করুন: ${fbUrl}\n\n#ChocolateTruffle #DeliciousCakeCorner #GhatalCakes #MansukaBakery #PureVegBakery`
  },
  {
    dayIndex: 2,
    dayNameBn: 'মঙ্গলবার',
    posterType: 'birthday',
    titleBn: 'মঙ্গলবার জন্মদিন ও কাস্টম ফটো কেক বুকিং',
    buildCaption: (fbUrl: string) =>
      `🎂🎈 প্রিয়জনের জন্মদিন কি সামনেই? কাস্টম ফটো কেক ও ডিজাইনার থিম কেক বুকিং চলছে! 🎈🎂\n\nআপনার পছন্দের ছবি, বার্বি, কার্টুন বা সুপারহিরো থিম অনুযায়ী ১০০% এগলেস কেক তৈরি করে দেওয়া হয় DELICIOUS CAKE CORNER-এ!\n✅ ফ্রি কাস্টম নাম লেখা ও বার্থডে ক্যান্ডেল\n✅ মনসুকা, ঘাটাল, দাসপুর ও চন্দ্রকোনা ডেলিভারি\n\n📞 সরাসরি হোয়াটসঅ্যাপ করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#BirthdayCakeGhatal #PhotoCake #DeliciousCakeCorner #Mansuka #EgglessBakery`
  },
  {
    dayIndex: 3,
    dayNameBn: 'বুধবার',
    posterType: 'redvelvet',
    titleBn: 'বুধবার অ্যানিভার্সারি ও রেড ভেলভেট হার্ট কেক',
    buildCaption: (fbUrl: string) =>
      `❤️✨ ভালোবাসার বিশেষ মুহূর্তে উপহার দিন রোমান্টিক 'রেড ভেলভেট হার্ট কেক'! ✨❤️\n\nনরম রুবির মতো লাল স্পঞ্জ, প্রিমিয়াম ক্রিম চিজ এবং ফ্রেশ বেরি টপিং — অ্যানিভার্সারি ও প্রপোজালের জন্য পারফেক্ট!\n✅ ১০০% পিওর এগলেস ও ফ্রেশ ইনগ্রেডিয়েন্টস\n✅ মাত্র ২-৩ ঘণ্টায় আপনার দরজায় ডেলিভারি\n\n📞 অর্ডার করতে কল বা হোয়াটসঅ্যাপ করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 আমাদের পেজ: ${fbUrl}\n\n#RedVelvetHeart #AnniversaryCake #DeliciousCakeCorner #Ghatal #MansukaCakes`
  },
  {
    dayIndex: 4,
    dayNameBn: 'বৃহস্পতিবার',
    posterType: 'truffle',
    titleBn: 'বৃহস্পতিবার ১০০% পিওর ভেজ এগলেস বেকারি স্পেশাল',
    buildCaption: (fbUrl: string) =>
      `🌿🎂 বৃহস্পতিবার হোক শুদ্ধ ও মিষ্টি — ১০০% এগলেস ও পিওর ভেজ ফ্রেশ কেক ও পেস্ট্রি! 🌿🎂\n\nপুজো, উপোস বা পারিবারিক শুভ অনুষ্ঠানে নিশ্চিন্তে অর্ডার করুন DELICIOUS CAKE CORNER-এর খাঁটি এগলেস চকলেট, ভ্যানিলা, বাটারস্কচ ও পাইনঅ্যাপল কেক।\n✅ সম্পূর্ণ হাইজেনিক কিচেনে প্রতিদিন ফ্রেশ তৈরি\n✅ পাউন্ড অনুযায়ী সাশ্রয়ী দাম\n\n📞 অর্ডার নম্বর: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক: ${fbUrl}\n\n#PureVegEggless #DeliciousCakeCorner #GhatalBakery #FreshCakes #Mansuka`
  },
  {
    dayIndex: 5,
    dayNameBn: 'শুক্রবার',
    posterType: 'birthday',
    titleBn: 'শুক্রবার উইকেন্ড পার্টি ও অ্যাডভান্স বুকিং',
    buildCaption: (fbUrl: string) =>
      `🎉🍰 শনি ও রবিবারের পার্টি বা জন্মদিনের কেক আজই প্রি-বুক করুন! 🍰🎉\n\nভিড় এড়াতে ও আপনার পছন্দের ডিজাইনের টু-টায়ার, ফটো কেক বা ডার্ক চকলেট ট্রাফেল কেক আগে থেকেই বুক করে রাখুন।\n🎈 বার্থডে বেলুন, স্পার্কেল ক্যান্ডেল ও কাস্টম ট্যাগ একসাথেই পাওয়া যায়!\n🚚 ঘাটাল ও মনসুকার আশেপাশে হোম ডেলিভারি\n\n📞 হোয়াটসঅ্যাপে ছবি পাঠিয়ে অর্ডার করুন: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক পেজ: ${fbUrl}\n\n#WeekendCakes #AdvanceBooking #DeliciousCakeCorner #Ghatal #MansukaBakery`
  },
  {
    dayIndex: 6,
    dayNameBn: 'শনিবার',
    posterType: 'redvelvet',
    titleBn: 'শনিবার নাইট সেলিব্রেশন ও ২-ঘণ্টা এক্সপ্রেস ডেলিভারি',
    buildCaption: (fbUrl: string) =>
      `🌙🎂 আজ শনিবার সন্ধ্যায় চটজলদি কেক লাগবে? ঘাটাল ও মনসুকায় মাত্র ২ ঘণ্টায় ফ্রেশ কেক ডেলিভারি! 🎂🌙\n\nরেড ভেলভেট, চকলেট ট্রাফেল, বাটারস্কচ ও ফ্রেশ পেস্ট্রি — প্রতিটি কেক ১০০% এগলেস ও দারুণ সুস্বাদু।\n⭐ আপনার পরিচিতদের সাথে শেয়ার করুন ও ভালোবাসা জানান!\n\n📞 কল / হোয়াটসঅ্যাপ: 7866971421 (https://wa.me/917866971421)\n📍 মনসুকা বাজার, ঘরোইঘাট, ঘাটাল\n🌐 ফেসবুক: ${fbUrl}\n\n#SaturdayVibes #DeliciousCakeCorner #GhatalFoodies #Mansuka #EgglessCakeShop`
  }
];

function getDefaultServerFbState(): ServerDailyFbScheduleState {
  return {
    enabled: true,
    postTime: '10:00',
    pageId: process.env.FACEBOOK_PAGE_ID || '1EEg9yAa9A',
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    fbPageUrl: 'https://www.facebook.com/share/1EEg9yAa9A/',
    lastPostedDate: '',
    lastPreparedDate: '',
    lastStatus: 'ready',
    lastMessage: '',
    lastPostUrl: '',
    customCaptions: {},
    logs: []
  };
}

function loadServerFbSchedule(): ServerDailyFbScheduleState {
  const defaults = getDefaultServerFbState();
  try {
    if (fs.existsSync(FB_SCHEDULE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FB_SCHEDULE_FILE, 'utf8'));
      return {
        ...defaults,
        ...parsed,
        pageId: parsed.pageId || defaults.pageId,
        pageAccessToken: parsed.pageAccessToken || defaults.pageAccessToken,
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 50) : [],
        customCaptions: parsed.customCaptions && typeof parsed.customCaptions === 'object' ? parsed.customCaptions : {}
      };
    }
  } catch {
    // Fallback to defaults cleanly
  }
  return defaults;
}

function saveServerFbSchedule(state: ServerDailyFbScheduleState) {
  serverDailyFbState = {
    ...state,
    logs: (state.logs || []).slice(0, 50)
  };
  try {
    fs.writeFileSync(FB_SCHEDULE_FILE, JSON.stringify(serverDailyFbState, null, 2), 'utf8');
  } catch {
    // Read-only filesystem safe ignore
  }
}

let serverDailyFbState: ServerDailyFbScheduleState = loadServerFbSchedule();
let isDailyFbTickerRunning = false;

function getPosterFilename(posterType?: string): string {
  if (posterType === 'birthday') return 'fb_birthday_poster_1793516490115.jpg';
  if (posterType === 'redvelvet') return 'fb_redvelvet_poster_1793650189312.jpg';
  if (posterType === 'butterscotch') return 'fb_butterscotch_poster_1793650203215.jpg';
  return 'fb_premium_poster_1793516474433.jpg';
}

function getServerPlanForDay(dayIndex?: number) {
  const idx = typeof dayIndex === 'number' ? ((dayIndex % 7) + 7) % 7 : getServerISTDayIndex();
  const base = SERVER_DAILY_FB_PLAN.find((p) => p.dayIndex === idx) || SERVER_DAILY_FB_PLAN[0];
  const fbUrl = serverDailyFbState.fbPageUrl || 'https://www.facebook.com/share/1EEg9yAa9A/';
  const customCap = serverDailyFbState.customCaptions?.[String(idx)];
  return {
    ...base,
    caption: customCap && customCap.trim().length > 0 ? customCap : base.buildCaption(fbUrl)
  };
}

async function publishToFacebookGraphApi(params: {
  pageId: string;
  pageAccessToken?: string;
  message: string;
  posterType?: string;
  photoUrl?: string;
}) {
  const resolvedPageId = params.pageId || process.env.FACEBOOK_PAGE_ID || '1EEg9yAa9A';
  const token = params.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const posterFilename = getPosterFilename(params.posterType);
  const localImagePath = path.resolve(process.cwd(), 'src/assets/images', posterFilename);

  if (token && typeof token === 'string' && token.trim().length > 15) {
    const graphUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(resolvedPageId)}/photos`;
    const formData = new FormData();
    formData.append('access_token', token.trim());
    formData.append('caption', params.message || '');

    if (fs.existsSync(localImagePath)) {
      const fileBuffer = fs.readFileSync(localImagePath);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      formData.append('source', blob, posterFilename);
    } else if (params.photoUrl && params.photoUrl.startsWith('http')) {
      formData.append('url', params.photoUrl);
    }

    const fbResponse = await fetch(graphUrl, {
      method: 'POST',
      body: formData
    });

    const json = await fbResponse.json().catch(() => null);
    if (fbResponse.ok && json && (json.id || json.post_id)) {
      const publishedId = json.post_id || json.id;
      return {
        success: true,
        mode: 'graph_api' as const,
        postId: publishedId,
        postUrl: `https://www.facebook.com/${publishedId}`,
        message: 'ফেসবুক পেজে সফলভাবে পোস্ট সরাসরি লাইভ হয়েছে!'
      };
    } else {
      return {
        success: false,
        mode: 'graph_api_error' as const,
        error: json?.error?.message || 'Meta Graph API token error',
        targetPageUrl: `https://www.facebook.com/share/${resolvedPageId}`
      };
    }
  }

  return {
    success: true,
    mode: 'direct_page' as const,
    targetPageUrl: `https://www.facebook.com/share/${resolvedPageId}`,
    pageId: resolvedPageId,
    posterDownloadUrl: `/api/posters/${params.posterType || 'truffle'}`,
    message: 'ফেসবুক পেজ লিঙ্ক প্রস্তুত!'
  };
}

function sanitizeServerFbScheduleResponse() {
  const { pageAccessToken: _hiddenToken, ...safe } = serverDailyFbState;
  const effectiveToken = serverDailyFbState.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  return {
    ...safe,
    hasToken: Boolean(effectiveToken && effectiveToken.trim().length > 15),
    istDate: getServerISTDate(),
    istTime: getServerISTTimeHHMM(),
    todayPlan: getServerPlanForDay()
  };
}

async function executeDailyFbPost(options?: { dayIndex?: number; markAsPosted?: boolean; force?: boolean; customCaption?: string }) {
  const todayIST = getServerISTDate();
  const plan = getServerPlanForDay(options?.dayIndex);
  const captionToUse = options?.customCaption && options.customCaption.trim().length > 0 ? options.customCaption : plan.caption;
  const effectiveToken = serverDailyFbState.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  const hasToken = Boolean(effectiveToken && effectiveToken.trim().length > 15);

  const result = await publishToFacebookGraphApi({
    pageId: serverDailyFbState.pageId,
    pageAccessToken: effectiveToken,
    message: captionToUse,
    posterType: plan.posterType
  });

  if (result.mode === 'graph_api' && result.success) {
    const logEntry: ServerDailyFbLog = {
      id: `fb-daily-${Date.now()}`,
      date: todayIST,
      timestamp: Date.now(),
      dayIndex: plan.dayIndex,
      posterType: plan.posterType,
      titleBn: plan.titleBn,
      caption: captionToUse,
      mode: 'graph_api',
      status: 'published',
      postId: result.postId,
      postUrl: result.postUrl
    };
    saveServerFbSchedule({
      ...serverDailyFbState,
      lastPostedDate: todayIST,
      lastPreparedDate: todayIST,
      lastStatus: 'published',
      lastMessage: plan.titleBn,
      lastPostUrl: result.postUrl || '',
      logs: [logEntry, ...serverDailyFbState.logs]
    });
    return { ...result, log: logEntry, schedule: sanitizeServerFbScheduleResponse() };
  }

  if (result.mode === 'graph_api_error') {
    const logEntry: ServerDailyFbLog = {
      id: `fb-daily-${Date.now()}`,
      date: todayIST,
      timestamp: Date.now(),
      dayIndex: plan.dayIndex,
      posterType: plan.posterType,
      titleBn: plan.titleBn,
      caption: captionToUse,
      mode: 'error',
      status: 'failed',
      error: result.error
    };
    saveServerFbSchedule({
      ...serverDailyFbState,
      lastPreparedDate: todayIST,
      lastStatus: 'failed',
      lastMessage: result.error || 'Meta Graph API failed',
      logs: [logEntry, ...serverDailyFbState.logs]
    });
    return { ...result, log: logEntry, schedule: sanitizeServerFbScheduleResponse() };
  }

  // Zero-token mode: prepare daily asset (or mark posted when triggered explicitly by user)
  const shouldMarkPosted = Boolean(options?.markAsPosted);
  const logEntry: ServerDailyFbLog = {
    id: `fb-daily-${Date.now()}`,
    date: todayIST,
    timestamp: Date.now(),
    dayIndex: plan.dayIndex,
    posterType: plan.posterType,
    titleBn: plan.titleBn,
    caption: captionToUse,
    mode: shouldMarkPosted ? 'manual_composer' : 'auto_prepared',
    status: shouldMarkPosted ? 'published' : 'ready',
    postUrl: serverDailyFbState.fbPageUrl
  };
  saveServerFbSchedule({
    ...serverDailyFbState,
    lastPostedDate: shouldMarkPosted ? todayIST : serverDailyFbState.lastPostedDate,
    lastPreparedDate: todayIST,
    lastStatus: shouldMarkPosted ? 'published' : 'ready',
    lastMessage: plan.titleBn,
    lastPostUrl: serverDailyFbState.fbPageUrl,
    logs: [logEntry, ...serverDailyFbState.logs]
  });

  return {
    ...result,
    hasToken,
    posterType: plan.posterType,
    titleBn: plan.titleBn,
    caption: captionToUse,
    log: logEntry,
    schedule: sanitizeServerFbScheduleResponse()
  };
}

async function runDailyFbBackgroundTick() {
  if (isDailyFbTickerRunning) return;
  if (!serverDailyFbState.enabled) return;

  const todayIST = getServerISTDate();
  const nowHHMM = getServerISTTimeHHMM();
  if (nowHHMM < (serverDailyFbState.postTime || '10:00')) return;
  if (serverDailyFbState.lastPostedDate === todayIST) return;

  const effectiveToken = serverDailyFbState.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  const hasToken = Boolean(effectiveToken && effectiveToken.trim().length > 15);
  if (!hasToken && serverDailyFbState.lastPreparedDate === todayIST) return;

  isDailyFbTickerRunning = true;
  try {
    console.log(`[FB Daily Autopilot] Running daily check for ${todayIST} (${nowHHMM} IST, token=${hasToken ? 'YES' : 'NO'})`);
    await executeDailyFbPost({ markAsPosted: false });
  } catch (err) {
    console.warn('[FB Daily Autopilot] Tick error:', err);
  } finally {
    isDailyFbTickerRunning = false;
  }
}

/**
 * POST /api/facebook/publish
 * Publishes a photo & caption post to Facebook Page via Meta Graph API (when access token is provided)
 * or returns direct page link and assets for instant posting.
 */
app.post('/api/facebook/publish', async (req: Request, res: Response) => {
  try {
    const { pageId, pageAccessToken, message, photoUrl, posterType } = req.body;
    const result = await publishToFacebookGraphApi({
      pageId,
      pageAccessToken: pageAccessToken || serverDailyFbState.pageAccessToken,
      message,
      photoUrl,
      posterType
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/facebook/schedule
 * Returns current Daily Facebook Autopilot configuration, today's rotating plan, and execution logs.
 */
app.get('/api/facebook/schedule', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    ...sanitizeServerFbScheduleResponse()
  });
});

/**
 * POST /api/facebook/schedule
 * Updates Daily Facebook Autopilot configuration and optionally triggers catch-up if due today.
 */
app.post('/api/facebook/schedule', async (req: Request, res: Response) => {
  try {
    const {
      enabled,
      postTime,
      pageId,
      pageAccessToken,
      clearToken,
      fbPageUrl,
      customCaptions,
      lastPostedDate
    } = req.body || {};

    const nextState: ServerDailyFbScheduleState = {
      ...serverDailyFbState,
      enabled: typeof enabled === 'boolean' ? enabled : serverDailyFbState.enabled,
      postTime: typeof postTime === 'string' && /^\d{2}:\d{2}$/.test(postTime) ? postTime : serverDailyFbState.postTime,
      pageId: typeof pageId === 'string' && pageId.trim() ? pageId.trim() : serverDailyFbState.pageId,
      fbPageUrl: typeof fbPageUrl === 'string' && fbPageUrl.trim() ? fbPageUrl.trim() : serverDailyFbState.fbPageUrl,
      customCaptions: customCaptions && typeof customCaptions === 'object' ? customCaptions : serverDailyFbState.customCaptions,
      lastPostedDate: typeof lastPostedDate === 'string' ? lastPostedDate : serverDailyFbState.lastPostedDate,
      pageAccessToken: clearToken
        ? ''
        : (typeof pageAccessToken === 'string' && pageAccessToken.trim().length > 0
            ? pageAccessToken.trim()
            : serverDailyFbState.pageAccessToken)
    };

    saveServerFbSchedule(nextState);
    // Run async check immediately in case enabled + due today with token
    runDailyFbBackgroundTick().catch(() => {});

    return res.json({
      success: true,
      ...sanitizeServerFbScheduleResponse()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save schedule' });
  }
});

/**
 * POST /api/facebook/run-daily-now
 * Immediately executes today's (or specified dayIndex's) automated Facebook post.
 */
app.post('/api/facebook/run-daily-now', async (req: Request, res: Response) => {
  try {
    const { dayIndex, markAsPosted, customCaption } = req.body || {};
    const result = await executeDailyFbPost({
      dayIndex: typeof dayIndex === 'number' ? dayIndex : undefined,
      markAsPosted: Boolean(markAsPosted),
      customCaption: typeof customCaption === 'string' ? customCaption : undefined
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to run daily Facebook post' });
  }
});

/**
 * POST /api/facebook/verify-token
 * Verifies a Meta Access Token and auto-discovers managed Facebook Pages (Numeric Page ID & Page Access Token).
 */
app.post('/api/facebook/verify-token', async (req: Request, res: Response) => {
  try {
    const { pageId, pageAccessToken } = req.body || {};
    const token =
      (typeof pageAccessToken === 'string' && pageAccessToken.trim().length > 10
        ? pageAccessToken.trim()
        : '') ||
      serverDailyFbState.pageAccessToken ||
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
      '';

    if (!token || token.length < 15) {
      return res.json({
        success: false,
        error: 'দয়া করে আপনার Meta Access Token (EAAG...) বক্সে পেস্ট করুন।'
      });
    }

    // 1. Try /me/accounts (works when user pastes a User Token -> extracts exact Numeric Page ID + Page Token!)
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(token)}`
    );
    const accountsJson = await accountsRes.json().catch(() => null);

    if (accountsRes.ok && accountsJson && Array.isArray(accountsJson.data) && accountsJson.data.length > 0) {
      const pages = accountsJson.data.map((p: any) => ({
        id: String(p.id),
        name: String(p.name || 'Facebook Page'),
        accessToken: String(p.access_token || token)
      }));
      return res.json({
        success: true,
        type: 'user_token_pages',
        pages,
        recommendedPage: pages[0],
        message: `✅ ${pages.length}টি ফেসবুক পেজ পাওয়া গেছে: ${pages[0].name} (ID: ${pages[0].id})`
      });
    }

    // 2. Otherwise verify directly as a Page Access Token using /me or /<pageId>
    const targetNode =
      pageId && String(pageId).trim() && String(pageId).trim() !== '1EEg9yAa9A'
        ? String(pageId).trim()
        : 'me';
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(targetNode)}?fields=id,name&access_token=${encodeURIComponent(token)}`
    );
    const meJson = await meRes.json().catch(() => null);

    if (meRes.ok && meJson && meJson.id) {
      return res.json({
        success: true,
        type: 'page_token_verified',
        pages: [{ id: String(meJson.id), name: String(meJson.name || 'Verified Page'), accessToken: token }],
        recommendedPage: { id: String(meJson.id), name: String(meJson.name || 'Verified Page'), accessToken: token },
        message: `✅ কানেকশন সফল! পেজ: "${meJson.name || 'Facebook Page'}" (Numeric ID: ${meJson.id})`
      });
    }

    return res.json({
      success: false,
      error: meJson?.error?.message || accountsJson?.error?.message || 'টোকেন বা পেজ আইডি সঠিক নয়। অনুগ্রহ করে আবার চেক করুন।'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Verification request failed'
    });
  }
});

/**
 * GET /api/network-info
 * Detects local LAN / Wi-Fi IPv4 addresses so multiple computers/phones on the same shop router can connect cleanly.
 */
app.get('/api/network-info', (req: Request, res: Response) => {
  try {
    const interfaces = os.networkInterfaces();
    const lanIps: string[] = [];

    Object.values(interfaces).forEach((ifaces) => {
      if (!ifaces) return;
      for (const iface of ifaces) {
        if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
          lanIps.push(iface.address);
        }
      }
    });

    const hostHeader = req.get('host') || '';
    const isCloudHosted = hostHeader.includes('.run.app') || hostHeader.includes('aistudio') || hostHeader.includes('googleusercontent');

    return res.json({
      success: true,
      port: PORT,
      lanIps,
      lanUrls: lanIps.map((ip) => `http://${ip}:${PORT}`),
      isCloudHosted,
      hostHeader
    });
  } catch (err: any) {
    return res.json({
      success: false,
      port: PORT,
      lanIps: [],
      lanUrls: [],
      isCloudHosted: false,
      error: err?.message
    });
  }
});

/**
 * GET /api/download-portable-pos
 * Builds and serves a 100% self-contained single-file HTML POS app (Delicious_Cake_Corner_POS.html)
 * that runs directly on ANY Windows PC, Laptop, Mac, or Android phone without Node.js, internet, or 404 errors.
 */
app.get('/api/download-portable-pos', async (req: Request, res: Response) => {
  try {
    const terminal = typeof req.query.terminal === 'string' ? req.query.terminal : 'system-1';
    const role = typeof req.query.role === 'string' ? req.query.role : 'admin';
    const counter = typeof req.query.counter === 'string' ? req.query.counter : 'counter-1';
    const distributor = typeof req.query.distributor === 'string' ? req.query.distributor : 'dist-1';
    const stationLabel = typeof req.query.label === 'string' ? req.query.label.replace(/[^a-zA-Z0-9_-]/g, '_') : role.toUpperCase();

    const distDir = path.resolve(process.cwd(), 'dist');
    const distIndexPath = path.join(distDir, 'index.html');

    // Ensure production dist bundle exists
    if (!fs.existsSync(distIndexPath)) {
      await viteBuild();
    }

    const assetsDir = path.join(distDir, 'assets');
    const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
    const jsFile = assetFiles.find((f) => f.startsWith('index-') && f.endsWith('.js'));
    const cssFile = assetFiles.find((f) => f.startsWith('index-') && f.endsWith('.css'));

    if (!jsFile || !cssFile) {
      await viteBuild();
    }

    const updatedFiles = fs.readdirSync(assetsDir);
    const finalJsFile = updatedFiles.find((f) => f.startsWith('index-') && f.endsWith('.js'));
    const finalCssFile = updatedFiles.find((f) => f.startsWith('index-') && f.endsWith('.css'));

    if (!finalJsFile || !finalCssFile) {
      return res.status(500).json({ error: 'Failed to locate compiled bundle assets.' });
    }

    let jsCode = fs.readFileSync(path.join(assetsDir, finalJsFile), 'utf8');
    const cssCode = fs.readFileSync(path.join(assetsDir, finalCssFile), 'utf8');

    // Inline key JPG assets referenced via /assets/*.jpg as data URIs so logo & graphics work 100% offline on file://
    for (const file of updatedFiles) {
      if (file.endsWith('.jpg') || file.endsWith('.png')) {
        const assetRef = `/assets/${file}`;
        if (jsCode.includes(assetRef)) {
          const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
          const b64 = fs.readFileSync(path.join(assetsDir, file)).toString('base64');
          jsCode = jsCode.split(assetRef).join(`data:${mime};base64,${b64}`);
        }
      }
    }

    // Inline fallback DEFAULT_BAKERY_LOGO path if referenced as /src/assets/images/delicious_cake_corner_gold_badge.jpg
    const rawLogoPath = path.resolve(process.cwd(), 'src/assets/images/delicious_cake_corner_gold_badge.jpg');
    if (fs.existsSync(rawLogoPath) && jsCode.includes('/src/assets/images/delicious_cake_corner_gold_badge.jpg')) {
      const logoB64 = fs.readFileSync(rawLogoPath).toString('base64');
      jsCode = jsCode
        .split('/src/assets/images/delicious_cake_corner_gold_badge.jpg')
        .join(`data:image/jpeg;base64,${logoB64}`);
    }

    // Escape any closing script tags safely inside JS string literals
    const safeJsCode = jsCode.replace(/<\/script>/gi, '<\\/script>');
    const safeCssCode = cssCode.replace(/<\/style>/gi, '<\\/style>');

    const bootPreset = JSON.stringify({
      terminal,
      role,
      counter,
      distributor,
      portable: true
    });

    const portableHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DELICIOUS CAKE CORNER — Portable Billing & POS (${stationLabel})</title>
    <style>${safeCssCode}</style>
    <script>window.__DCC_BOOT_PRESET__ = ${bootPreset};</script>
  </head>
  <body class="bg-[#f8f6f4] text-slate-800 antialiased selection:bg-[#4b1d3f] selection:text-white">
    <div id="root"></div>
    <script>${safeJsCode}</script>
  </body>
</html>`;

    const downloadFilename = `DCC_POS_${stationLabel}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    return res.send(portableHtml);
  } catch (err: any) {
    console.error('Error generating portable POS file:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Could not generate portable POS bundle'
    });
  }
});

/**
 * Initialize Vite middleware in dev or static files in production
 */
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`DCC Full-Stack Server running on port ${PORT} (dev: ${!isProd})`);
  });

  // Daily Facebook Autopilot Background Scheduler (runs every 60 seconds in IST timezone)
  setTimeout(() => {
    runDailyFbBackgroundTick().catch(() => {});
  }, 5000);
  const dailyFbInterval = setInterval(() => {
    runDailyFbBackgroundTick().catch(() => {});
  }, 60_000);

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} already in use. Retrying or awaiting cleanup...`);
    } else {
      console.error('[Server error]:', err);
    }
  });

  process.on('SIGTERM', () => {
    clearInterval(dailyFbInterval);
    server.close(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    clearInterval(dailyFbInterval);
    server.close(() => process.exit(0));
  });
}

startServer();
