import QRCode from 'qrcode';
import { Bill, ShopConfig } from '../types';

export function generateUpiString(config: ShopConfig, amount: number, billNo: string): string {
  const upiId = (config.upiId || '7866971421@okaxis').trim();
  const rawName = (config.shopName || 'DELICIOUS CAKE CORNER').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const name = encodeURIComponent(rawName || 'DELICIOUS CAKE CORNER');
  const note = encodeURIComponent(`CakeBill ${billNo}`);
  const amt = amount > 0 ? amount.toFixed(2) : '';
  
  return `upi://pay?pa=${upiId}&pn=${name}${amt ? `&am=${amt}` : ''}&cu=INR&tn=${note}`;
}

export async function generateQrDataUrl(upiString: string): Promise<string> {
  try {
    return await QRCode.toDataURL(upiString, {
      width: 260,
      margin: 2,
      color: {
        dark: '#1a1016',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

export async function generateCustomQrDataUrl(
  text: string,
  width: number = 320,
  darkColor: string = '#1a1016',
  lightColor: string = '#ffffff'
): Promise<string> {
  try {
    if (!text || !text.trim()) return '';
    return await QRCode.toDataURL(text.trim(), {
      width,
      margin: 2,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    console.error('Failed to generate custom QR Code:', err);
    return '';
  }
}

export function generateWhatsAppMessage(bill: Bill, config: ShopConfig): string {
  const itemsText = bill.items
    .map((item, idx) => `${idx + 1}. *${item.name}* (${item.weightOrSize}) x${item.qty} = ₹${item.total.toFixed(2)}`)
    .join('\n');

  let msg = `🎂 *${config.shopName}*\n`;
  msg += `📍 ${config.addressLine1}, ${config.district}\n`;
  msg += `📞 ${config.phone}\n`;
  msg += `🌱 *100% Eggless Pure Veg Bakery*\n`;
  msg += `------------------------------------\n`;
  msg += `🧾 *INVOICE:* ${bill.billNo}\n`;
  msg += `📅 Date: ${new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
  if (bill.customerName) {
    msg += `👤 Customer: *${bill.customerName}*\n`;
  }
  if (bill.cakeMessage) {
    msg += `✍️ Message on Cake: "${bill.cakeMessage}"\n`;
  }
  if (bill.deliveryDate) {
    msg += `🚚 Pickup/Delivery: ${bill.deliveryDate} ${bill.deliveryTime || ''}\n`;
  }
  msg += `------------------------------------\n`;
  msg += `*ITEMS:*\n${itemsText}\n`;
  msg += `------------------------------------\n`;
  msg += `Subtotal: ₹${bill.subtotal.toFixed(2)}\n`;
  if (bill.discountAmount > 0) {
    msg += `Discount: -₹${bill.discountAmount.toFixed(2)}\n`;
  }
  if (bill.loyaltyDiscountAmount && bill.loyaltyDiscountAmount > 0) {
    msg += `🎁 Loyalty Discount: -₹${bill.loyaltyDiscountAmount.toFixed(2)}\n`;
  }
  if (bill.taxAmount > 0) {
    msg += `Tax (${bill.taxPercent}%): +₹${bill.taxAmount.toFixed(2)}\n`;
  }
  msg += `*GRAND TOTAL: ₹${bill.grandTotal.toFixed(2)}*\n`;
  if (bill.advancePaid > 0) {
    msg += `Advance Paid: ₹${bill.advancePaid.toFixed(2)}\n`;
  }
  if (bill.dueAmount > 0) {
    msg += `⚠️ *Balance Due: ₹${bill.dueAmount.toFixed(2)}*\n`;
  } else {
    msg += `✅ Payment: *${bill.paymentMethod} (PAID)*\n`;
  }
  if (bill.loyaltyPointsEarned && bill.loyaltyPointsEarned > 0) {
    msg += `⭐ *Loyalty Points Earned:* +${bill.loyaltyPointsEarned} pts\n`;
  }
  msg += `------------------------------------\n`;
  msg += `✨ ${config.thankYouMessage || 'Thank you for choosing Delicious Cake Corner! Visit again for fresh & delicious moments.'}\n`;
  if (config.googleReviewUrl) {
    msg += `\n⭐ *Google 5-Star Review:* ${config.googleReviewUrl}`;
  }
  if (config.facebookPageUrl) {
    msg += `\n🌐 *Facebook Page:* ${config.facebookPageUrl}`;
  }
  msg += `\n📞 Call/WhatsApp: ${config.phone || '7866971421'} (https://wa.me/91${(config.phone || '7866971421').replace(/\D/g, '')})`;

  return msg;
}

export function openWhatsAppShare(bill: Bill, config: ShopConfig, overridePhone?: string): void {
  const text = generateWhatsAppMessage(bill, config);
  const cleanMobile = (overridePhone || bill.customerMobile || '').replace(/\D/g, '');
  const targetNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
  
  if (targetNumber && targetNumber.length >= 10) {
    window.open(`https://api.whatsapp.com/send?phone=${targetNumber}&text=${encodeURIComponent(text)}`, '_blank');
  } else {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }
}

export function generateSmsMessage(bill: Bill, config: ShopConfig): string {
  const shopPhone = config.phone || '7866971421';
  const name = bill.customerName ? bill.customerName : 'গ্রাহক';
  const customBn = config.thankYouMessageBn ||
    'ডেলিসিয়াস কেক কর্নার-এ আসার জন্য আপনাকে আন্তরিক ধন্যবাদ ও শুভেচ্ছা! 🎂✨ আমাদের ১০০% এগলেস স্পেশাল ফ্রেশ কেক আপনার পারিবারিক অনুষ্ঠান ও উৎসবের মুহূর্তগুলিকে আরও মিষ্টি ও আনন্দময় করে তুলুক।';
  
  let msg = `প্রিয় ${name}, ${customBn}\n`;
  msg += `বিল নং: ${bill.billNo} | মোট: ₹${bill.grandTotal.toFixed(0)}`;
  if (bill.dueAmount > 0) {
    msg += ` | বাকি: ₹${bill.dueAmount.toFixed(0)}`;
  }
  if (config.googleReviewUrl) {
    msg += `\n⭐ রিভিউ দিন: ${config.googleReviewUrl}`;
  }
  msg += `\nহোয়াটসঅ্যাপ বা কল করুন: ${shopPhone} (wa.me/91${shopPhone.replace(/\D/g, '')})। আবার আসবেন! 🎉`;
  return msg;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function triggerSms(phone: string, text: string): boolean {
  const cleanMobile = phone.replace(/\D/g, '');
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  // iOS uses &body= whereas Android/RFC uses ?body=
  const separator = isIOS ? '&' : '?';
  const smsUrl = cleanMobile
    ? `sms:${cleanMobile}${separator}body=${encodeURIComponent(text)}`
    : `sms:${separator}body=${encodeURIComponent(text)}`;

  // Automatically copy text to clipboard as resilient backup
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  try {
    const a = document.createElement('a');
    a.href = smsUrl;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    window.location.href = smsUrl;
    return true;
  }
}

export function openSmsShare(bill: Bill, config: ShopConfig): void {
  const text = generateSmsMessage(bill, config);
  const cleanMobile = (bill.customerMobile || '').replace(/\D/g, '');
  triggerSms(cleanMobile, text);
}

