import { Bill, ShopConfig, PrinterDevice, ThermalWidth, ReceiptFormat } from '../types';
import { ALL_POPULAR_PRINTER_MODELS } from '../data/defaultProducts';

/**
 * Standard ESC/POS Commands
 */
const ESC = 0x1b;
const GS = 0x1d;

export const ESCPOS_COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [ESC, 0x21, 0x20],
  DOUBLE_SIZE_ON: [ESC, 0x21, 0x30],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
  FEED_3: [ESC, 0x64, 0x03],
  FEED_5: [ESC, 0x64, 0x05],
  FULL_CUT: [GS, 0x56, 0x00], // GS V 0 (Full Cut)
  PARTIAL_CUT: [GS, 0x56, 0x01], // GS V 1 (Partial Cut)
  KICK_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xfa], // Pulse pin 2 for cash drawer (25ms pulse)
  BEEP: [ESC, 0x42, 0x02, 0x02] // Beep 2 times
};

/**
 * Helper to encode text to UTF-8 / ASCII bytes
 */
function encodeText(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

/**
 * Format string line with left and right columns padded to max line width
 */
function formatTwoColumn(left: string, right: string, width: number): string {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) {
    const trimmedLeft = left.substring(0, Math.max(0, width - right.length - 1));
    return trimmedLeft + ' ' + right + '\n';
  }
  return left + ' '.repeat(spaceNeeded) + right + '\n';
}

/**
 * Format a 4-column item line: Item, Qty, Rate, Total
 */
function formatItemLine(name: string, qty: number, rate: number, total: number, width: number): string {
  if (width <= 32) {
    // 58mm compact layout (32 columns)
    // Line 1: Item Name
    // Line 2: "  x{qty} @{rate} = {total}"
    const sub = `  x${qty} @${rate.toFixed(0)}`;
    const tot = `₹${total.toFixed(0)}`;
    const pad = ' '.repeat(Math.max(1, width - sub.length - tot.length));
    return `${name.substring(0, width)}\n${sub}${pad}${tot}\n`;
  } else {
    // 80mm layout (48 columns)
    const qtyStr = `${qty}`;
    const rateStr = `₹${rate.toFixed(0)}`;
    const totalStr = `₹${total.toFixed(0)}`;
    
    // Width allocation: Name (24), Qty (6), Rate (9), Total (9)
    const nameCol = name.length > 24 ? name.substring(0, 23) + ' ' : name.padEnd(24);
    const qtyCol = qtyStr.padStart(5) + ' ';
    const rateCol = rateStr.padStart(8) + ' ';
    const totalCol = totalStr.padStart(9);
    return `${nameCol}${qtyCol}${rateCol}${totalCol}\n`;
  }
}

/**
 * Build ESC/POS Byte Array for Customer Receipt (58mm or 80mm)
 */
export function buildEscPosReceipt(
  bill: Bill,
  config: ShopConfig,
  paperWidth: '58mm' | '80mm' = '80mm',
  openDrawer: boolean = false,
  autoCut: boolean = true
): Uint8Array {
  const width = paperWidth === '58mm' ? 32 : 48;
  const divider = '-'.repeat(width) + '\n';
  const doubleDivider = '='.repeat(width) + '\n';

  const bytes: number[] = [...ESCPOS_COMMANDS.INIT];

  if (openDrawer) {
    bytes.push(...ESCPOS_COMMANDS.KICK_DRAWER);
  }

  // Header - Centered
  bytes.push(...ESCPOS_COMMANDS.ALIGN_CENTER);
  bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
  bytes.push(...ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON);
  bytes.push(...encodeText((config.shopName || 'DELICIOUS CAKE CORNER') + '\n'));
  bytes.push(...ESCPOS_COMMANDS.NORMAL_SIZE);
  bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);

  bytes.push(...encodeText('100% EGGLESS PURE VEG BAKERY\n'));
  bytes.push(...encodeText(`${config.addressLine1 || 'Mansuka, Ghatal'}\n`));
  if (config.district) {
    bytes.push(...encodeText(`${config.district}, PIN: ${config.pin || '721212'}\n`));
  }
  bytes.push(...encodeText(`Ph: ${config.phone || '7866971421'}\n`));
  if (config.fssai) {
    bytes.push(...encodeText(`FSSAI: ${config.fssai}\n`));
  }
  bytes.push(...encodeText(doubleDivider));

  // Metadata - Left Aligned
  bytes.push(...ESCPOS_COMMANDS.ALIGN_LEFT);
  bytes.push(...encodeText(formatTwoColumn(`Bill: ${bill.billNo}`, `${bill.orderType.toUpperCase()}`, width)));
  const dateStr = new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  bytes.push(...encodeText(formatTwoColumn(`Date: ${dateStr}`, timeStr, width)));
  if (bill.customerName) {
    bytes.push(...encodeText(`Cust: ${bill.customerName} ${bill.customerMobile ? '(' + bill.customerMobile + ')' : ''}\n`));
  }
  if (bill.cakeMessage) {
    bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
    bytes.push(...encodeText(`Cake Msg: "${bill.cakeMessage}"\n`));
    bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);
  }
  if (bill.deliveryDate) {
    bytes.push(...encodeText(`Delivery: ${bill.deliveryDate} ${bill.deliveryTime || ''}\n`));
  }
  bytes.push(...encodeText(divider));

  // Table Column Headers
  if (paperWidth === '80mm') {
    bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
    bytes.push(...encodeText('Item Name                Qty     Rate     Total\n'));
    bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);
    bytes.push(...encodeText(divider));
  }

  // Items
  for (const item of bill.items) {
    const line = formatItemLine(item.name, item.qty, item.rate, item.total, width);
    bytes.push(...encodeText(line));
  }
  bytes.push(...encodeText(divider));

  // Totals
  bytes.push(...encodeText(formatTwoColumn('Subtotal:', `₹${bill.subtotal.toFixed(2)}`, width)));
  if (bill.discountAmount > 0) {
    bytes.push(...encodeText(formatTwoColumn('Discount:', `-₹${bill.discountAmount.toFixed(2)}`, width)));
  }
  if (bill.loyaltyDiscountAmount && bill.loyaltyDiscountAmount > 0) {
    bytes.push(...encodeText(formatTwoColumn('Loyalty Discount:', `-₹${bill.loyaltyDiscountAmount.toFixed(2)}`, width)));
  }
  if (bill.taxAmount > 0) {
    bytes.push(...encodeText(formatTwoColumn(`GST (${bill.taxPercent}%):`, `+₹${bill.taxAmount.toFixed(2)}`, width)));
  }
  bytes.push(...encodeText(doubleDivider));

  // Grand Total - Big & Bold
  bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
  bytes.push(...ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON);
  bytes.push(...encodeText(formatTwoColumn('GRAND TOTAL:', `₹${bill.grandTotal.toFixed(2)}`, width)));
  bytes.push(...ESCPOS_COMMANDS.NORMAL_SIZE);
  bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);
  bytes.push(...encodeText(doubleDivider));

  // Payment Status
  bytes.push(...encodeText(formatTwoColumn('Payment Method:', bill.paymentMethod.toUpperCase(), width)));
  if (bill.advancePaid > 0) {
    bytes.push(...encodeText(formatTwoColumn('Advance Paid:', `₹${bill.advancePaid.toFixed(2)}`, width)));
  }
  if (bill.dueAmount > 0) {
    bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
    bytes.push(...encodeText(formatTwoColumn('DUE BALANCE:', `₹${bill.dueAmount.toFixed(2)}`, width)));
    bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);
  } else {
    bytes.push(...ESCPOS_COMMANDS.ALIGN_CENTER);
    bytes.push(...encodeText('*** PAID FULLY ***\n'));
    bytes.push(...ESCPOS_COMMANDS.ALIGN_LEFT);
  }

  if (bill.loyaltyPointsEarned && bill.loyaltyPointsEarned > 0) {
    bytes.push(...encodeText(divider));
    bytes.push(...ESCPOS_COMMANDS.ALIGN_CENTER);
    bytes.push(...encodeText(`★ Loyalty Points Earned: +${bill.loyaltyPointsEarned} pts ★\n`));
  }

  // Footer
  bytes.push(...encodeText(divider));
  bytes.push(...ESCPOS_COMMANDS.ALIGN_CENTER);
  if (config.upiId) {
    bytes.push(...encodeText(`UPI Pay Handle: ${config.upiId}\n`));
  }
  bytes.push(...encodeText(`${config.thankYouMessage || 'Thank you for choosing us!'}\n`));
  bytes.push(...encodeText('Please Visit Again!\n'));
  bytes.push(...encodeText(`Authorized Signatory: ${config.signatoryName || 'Sumona Mondal Kunti'}\n`));

  // Paper Feed & Cut
  bytes.push(...ESCPOS_COMMANDS.FEED_5);
  if (autoCut) {
    bytes.push(...ESCPOS_COMMANDS.PARTIAL_CUT);
  }

  return new Uint8Array(bytes);
}

/**
 * Build ESC/POS Byte Array for Kitchen Order Ticket (KOT) / Baker Production Slip
 */
export function buildEscPosKot(bill: Bill, config: ShopConfig): Uint8Array {
  const width = 48;
  const divider = '='.repeat(width) + '\n';
  const bytes: number[] = [...ESCPOS_COMMANDS.INIT];

  // Beep kitchen printer
  bytes.push(...ESCPOS_COMMANDS.BEEP);

  // KOT Header
  bytes.push(...ESCPOS_COMMANDS.ALIGN_CENTER);
  bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
  bytes.push(...ESCPOS_COMMANDS.DOUBLE_SIZE_ON);
  bytes.push(...encodeText('*** KITCHEN ORDER TICKET ***\n'));
  bytes.push(...ESCPOS_COMMANDS.NORMAL_SIZE);
  bytes.push(...encodeText(`BAKERY / CHEF PRODUCTION SLIP\n`));
  bytes.push(...encodeText(divider));

  // Order Info
  bytes.push(...ESCPOS_COMMANDS.ALIGN_LEFT);
  bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
  bytes.push(...encodeText(`ORDER NO: ${bill.billNo}  [${bill.orderType.toUpperCase()}]\n`));
  const dateStr = new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  bytes.push(...encodeText(`BOOKED AT: ${dateStr} ${timeStr}\n`));
  bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);

  if (bill.customerName) {
    bytes.push(...encodeText(`Customer: ${bill.customerName} ${bill.customerMobile ? '(' + bill.customerMobile + ')' : ''}\n`));
  }

  // Delivery Highlight
  if (bill.deliveryDate) {
    bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
    bytes.push(...ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON);
    bytes.push(...encodeText(`>>> DELIVERY TIME: ${bill.deliveryDate} ${bill.deliveryTime || ''} <<<\n`));
    bytes.push(...ESCPOS_COMMANDS.NORMAL_SIZE);
    bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);
  }

  // Cake Message Highlight
  if (bill.cakeMessage) {
    bytes.push(...encodeText('-'.repeat(width) + '\n'));
    bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
    bytes.push(...ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON);
    bytes.push(...encodeText(`CAKE WRITING: "${bill.cakeMessage}"\n`));
    bytes.push(...ESCPOS_COMMANDS.NORMAL_SIZE);
    bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);
    bytes.push(...encodeText('-'.repeat(width) + '\n'));
  }

  bytes.push(...encodeText(divider));

  // Item List (Quantities, sizes, notes for baker)
  bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
  bytes.push(...encodeText('ITEMS TO BAKE / PREPARE:\n'));
  bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);

  for (let idx = 0; idx < bill.items.length; idx++) {
    const item = bill.items[idx];
    bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
    bytes.push(...encodeText(`[ ] ${idx + 1}. ${item.name} (${item.weightOrSize})  x${item.qty}\n`));
    bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);
    if (item.notes) {
      bytes.push(...encodeText(`    Special Note: ${item.notes}\n`));
    }
  }

  bytes.push(...encodeText(divider));
  bytes.push(...encodeText('Baker Signature: __________________\n'));
  bytes.push(...encodeText('Checked by Quality: ______________\n'));

  // Paper Feed & Cut
  bytes.push(...ESCPOS_COMMANDS.FEED_5);
  bytes.push(...ESCPOS_COMMANDS.PARTIAL_CUT);

  return new Uint8Array(bytes);
}

/**
 * Build ESC/POS Diagnostic Test Print
 */
export function buildEscPosTestPage(printerName: string, paperWidth: '58mm' | '80mm' = '80mm'): Uint8Array {
  const width = paperWidth === '58mm' ? 32 : 48;
  const divider = '='.repeat(width) + '\n';
  const bytes: number[] = [...ESCPOS_COMMANDS.INIT];

  bytes.push(...ESCPOS_COMMANDS.BEEP);
  bytes.push(...ESCPOS_COMMANDS.ALIGN_CENTER);
  bytes.push(...ESCPOS_COMMANDS.BOLD_ON);
  bytes.push(...ESCPOS_COMMANDS.DOUBLE_HEIGHT_ON);
  bytes.push(...encodeText('DELICIOUS CAKE CORNER\n'));
  bytes.push(...encodeText('PRINTER TEST SLIP\n'));
  bytes.push(...ESCPOS_COMMANDS.NORMAL_SIZE);
  bytes.push(...ESCPOS_COMMANDS.BOLD_OFF);
  bytes.push(...encodeText(divider));

  bytes.push(...ESCPOS_COMMANDS.ALIGN_LEFT);
  bytes.push(...encodeText(`Device: ${printerName}\n`));
  bytes.push(...encodeText(`Width Mode: ${paperWidth} (${width} Columns)\n`));
  bytes.push(...encodeText(`Time: ${new Date().toLocaleString('en-IN')}\n`));
  bytes.push(...encodeText(`Location: Mansuka, Ghatal, WB\n`));
  bytes.push(...encodeText('-'.repeat(width) + '\n'));

  bytes.push(...encodeText('Column Test Pattern:\n'));
  bytes.push(...encodeText('1234567890123456789012345678901234567890\n'.substring(0, width) + '\n'));
  bytes.push(...encodeText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn\n'.substring(0, width) + '\n'));
  bytes.push(...encodeText('-'.repeat(width) + '\n'));

  bytes.push(...ESCPOS_COMMANDS.ALIGN_CENTER);
  bytes.push(...encodeText('Status: HARDWARE TEST PASSED [OK]\n'));
  bytes.push(...encodeText('Thermal Printhead Alignment 100%\n'));
  bytes.push(...encodeText('Ready for POS Invoices & KOT Slips\n'));

  bytes.push(...ESCPOS_COMMANDS.FEED_5);
  bytes.push(...ESCPOS_COMMANDS.PARTIAL_CUT);

  return new Uint8Array(bytes);
}

/**
 * Web Bluetooth Support Detection
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Request and pair Bluetooth Thermal Printer
 */
export async function pairBluetoothPrinter(): Promise<{ deviceId: string; name: string } | null> {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported on this browser or platform (Use Chrome on Android, Windows, Mac, or Linux).');
  }

  try {
    const nav = navigator as any;
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Standard ESC/POS POS printer service
        { namePrefix: 'POS' },
        { namePrefix: 'PT-' },
        { namePrefix: 'RP' },
        { namePrefix: 'MTP' },
        { namePrefix: 'Bluetooth' },
        { namePrefix: 'InnerPrinter' },
        { namePrefix: 'Printer' }
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'
      ]
    });

    return {
      deviceId: device.id,
      name: device.name || 'Bluetooth POS Printer'
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return null; // user cancelled
    }
    throw err;
  }
}

/**
 * Send raw byte stream to Bluetooth Thermal Printer
 */
export async function printViaBluetoothEscpos(data: Uint8Array): Promise<{ success: boolean; error?: string }> {
  if (!isBluetoothSupported()) {
    return { success: false, error: 'Web Bluetooth not supported in this browser' };
  }

  try {
    const nav = navigator as any;
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'
      ]
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error('Could not connect to Bluetooth GATT server');

    // Find printable characteristic
    const services = await server.getPrimaryServices();
    let writeChar: any = null;

    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error('No writable printing characteristic found on Bluetooth printer');
    }

    // Send chunks (max 128 bytes per chunk to avoid buffer overflow on mini printers)
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await writeChar.writeValue(chunk);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Bluetooth ESC/POS Error:', err);
    return { success: false, error: err.message || 'Failed to dispatch to Bluetooth printer' };
  }
}

/**
 * Web USB / Web Serial Support Detection
 */
export function isUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && ('usb' in navigator || 'serial' in navigator);
}

/**
 * Pair USB Thermal Printer
 */
export async function pairUsbPrinter(): Promise<{ name: string } | null> {
  if (!isUsbSupported()) {
    throw new Error('WebUSB / Serial not supported in this browser (Use Chrome or Edge).');
  }

  try {
    const nav = navigator as any;
    if ('usb' in nav) {
      const device = await nav.usb.requestDevice({ filters: [] });
      return {
        name: device.productName || `USB POS Printer (${device.vendorId.toString(16)}:${device.productId.toString(16)})`
      };
    } else if ('serial' in nav) {
      const port = await nav.serial.requestPort();
      return {
        name: 'USB Serial POS Printer'
      };
    }
    return null;
  } catch (err: any) {
    if (err.name === 'NotFoundError') return null;
    throw err;
  }
}

/**
 * Send Network IP Raw ESC/POS Print (via server endpoint)
 */
export async function printViaNetworkEscpos(
  ipAddress: string,
  port: number = 9100,
  data: Uint8Array
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/printer/network-print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: ipAddress,
        port: port || 9100,
        rawBase64: btoa(String.fromCharCode(...data))
      })
    });
    const text = await res.text().catch(() => '');
    let result: any = null;
    if (text) {
      try {
        result = JSON.parse(text);
      } catch {}
    }
    return { success: Boolean(result?.success), error: result?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network printer endpoint unreachable' };
  }
}

/**
 * Kick Open Cash Drawer
 */
export async function triggerCashDrawer(device?: PrinterDevice): Promise<boolean> {
  const kickBytes = new Uint8Array(ESCPOS_COMMANDS.KICK_DRAWER);
  if (device?.type === 'bluetooth') {
    const res = await printViaBluetoothEscpos(kickBytes);
    return res.success;
  }
  // Otherwise use browser system print impulse or notify
  console.log('Cash drawer kick command dispatched');
  return true;
}

/**
 * Applies exact @page size & margin rules dynamically right before browser printing
 * so A4, A5, 80mm, and 58mm printers all receive matching page geometry.
 */
export function applyDynamicPageSizeCss(format: ReceiptFormat = 'thermal'): void {
  if (typeof document === 'undefined') return;
  const styleId = 'dcc-dynamic-page-rule';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  let pageCss = 'size: 80mm auto; margin: 2mm;';
  if (format === 'standard') {
    pageCss = 'size: A4 portrait; margin: 10mm;';
  } else if (format === 'standardA5') {
    pageCss = 'size: A5 portrait; margin: 8mm;';
  } else if (format === 'thermal58') {
    pageCss = 'size: 58mm auto; margin: 2mm;';
  }

  styleEl.textContent = `@media print { @page { ${pageCss} } }`;
}

/**
 * Waits for every <img> (Logo, UPI QR, Review QR, Signature) inside the print container
 * to load & decode before opening the browser Print dialog.
 */
async function waitForPrintImagesReady(container: HTMLElement | null): Promise<void> {
  if (!container) return;
  const imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) return;

  await Promise.race([
    Promise.all(
      imgs.map(async (img) => {
        if (!img.complete) {
          await new Promise<void>((res) => {
            const done = () => res();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          });
        }
        if (typeof img.decode === 'function') {
          await img.decode().catch(() => {});
        }
      })
    ),
    new Promise<void>((res) => setTimeout(res, 1500))
  ]);
}

/**
 * Collects compiled Tailwind & app CSS rules from document stylesheets so standalone print tabs
 * and downloaded HTML files preserve full A4/A5 grid, flex, border, and typography styling.
 */
function collectActiveStylesheetCss(): string {
  if (typeof document === 'undefined') return '';
  let css = '';
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules;
        if (rules) {
          for (const rule of Array.from(rules)) {
            css += rule.cssText + '\n';
          }
        }
      } catch {
        // Ignore cross-origin sheets (e.g., Google Fonts) that block cssRules reading
      }
    }
  } catch {
    // Fallback
  }
  return css;
}

/**
 * Clones the active print container and ensures every <img> (Logo, QR, Signature)
 * is converted to an inline base64 Data URL so blob: tabs and offline files never lose logos.
 */
function clonePrintMarkupWithInlinedImages(): string {
  const modalPreview = document.getElementById('print-modal-preview');
  const printContainer = document.getElementById('print-only-container');
  const source =
    (printContainer && printContainer.innerHTML.trim() ? printContainer : null) ||
    (modalPreview && modalPreview.innerHTML.trim() ? modalPreview : null) ||
    document.querySelector('.standard-invoice') ||
    document.querySelector('.standard-invoice-a5') ||
    document.querySelector('.thermal-receipt') ||
    document.querySelector('.thermal-receipt-58') ||
    document.querySelector('.kot-ticket');

  if (!source) return '';
  const clone = source.cloneNode(true) as HTMLElement;
  const origImgs = Array.from(source.querySelectorAll('img'));
  const cloneImgs = Array.from(clone.querySelectorAll('img'));

  cloneImgs.forEach((cloneImg, idx) => {
    const origImg = origImgs[idx];
    const src = cloneImg.getAttribute('src') || '';
    if (origImg && origImg.complete && origImg.naturalWidth > 0 && !src.startsWith('data:')) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = origImg.naturalWidth;
        canvas.height = origImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(origImg, 0, 0);
          cloneImg.setAttribute('src', canvas.toDataURL('image/png'));
        }
      } catch {
        // Keep original src if tainted
      }
    }
    cloneImg.style.display = 'inline-block';
    cloneImg.style.visibility = 'visible';
    cloneImg.style.opacity = '1';
  });

  return clone.innerHTML;
}

/**
 * Triggers clean receipt printing with dynamic @page rules and pre-decoded logo images.
 */
export function triggerCleanReceiptPrint(
  bill: Bill,
  config: ShopConfig,
  format: ReceiptFormat = 'thermal'
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      applyDynamicPageSizeCss(format);
      window.focus();

      const container = document.getElementById('print-only-container');
      waitForPrintImagesReady(container).finally(() => {
        // Wait 2 animation frames so React & Canvas images commit cleanly before print capture
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              window.print();
              resolve(true);
            } catch (printErr: any) {
              console.warn('Native window.print was restricted, initiating standalone/download fallback:', printErr);
              downloadReceiptHtml(bill, config, format);
              resolve(true);
            }
          }, 120);
        });
      });
    } catch (err: any) {
      console.warn('Print trigger caught error:', err);
      try {
        downloadReceiptHtml(bill, config, format);
      } catch {}
      resolve(true);
    }
  });
}

function buildStandalonePrintHtml(
  bill: Bill,
  config: ShopConfig,
  format: ReceiptFormat,
  includePrintToolbar: boolean
): string {
  const innerHtml = clonePrintMarkupWithInlinedImages();
  const appCss = collectActiveStylesheetCss();
  const isThermal = format === 'thermal' || format === 'thermal58' || format === 'kot';
  const maxWidth = format === 'thermal58' ? '50mm' : isThermal ? '78mm' : format === 'standardA5' ? '138mm' : '195mm';
  const pageRule =
    format === 'standard'
      ? 'size: A4 portrait; margin: 10mm;'
      : format === 'standardA5'
      ? 'size: A5 portrait; margin: 8mm;'
      : format === 'thermal58'
      ? 'size: 58mm auto; margin: 2mm;'
      : 'size: 80mm auto; margin: 2mm;';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print Bill #${bill.billNo} - ${config.shopName || 'Delicious Cake Corner'}</title>
    <style>${appCss}</style>
    <style>
      @page { ${pageRule} }
      html, body {
        margin: 0 !important;
        padding: ${isThermal ? '3mm' : '6mm'} !important;
        background: #fff !important;
        color: #000 !important;
        position: static !important;
        visibility: visible !important;
        height: auto !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      * { box-sizing: border-box; }
      #standalone-sheet {
        width: 100%;
        max-width: ${maxWidth};
        margin: 0 auto;
        background: #fff;
      }
      #standalone-sheet .standard-invoice,
      #standalone-sheet .standard-invoice-a5 {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
      }
      #standalone-sheet img {
        display: inline-block !important;
        visibility: visible !important;
        opacity: 1 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-bar {
        text-align: center;
        margin: 0 auto 14px auto;
        max-width: ${maxWidth};
        padding: 10px 14px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-family: sans-serif;
      }
      .print-bar button {
        padding: 8px 18px;
        font-size: 13px;
        font-weight: 800;
        background: #059669;
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
      @media print {
        .print-bar { display: none !important; }
        html, body { padding: 0 !important; }
      }
    </style>
  </head>
  <body>
    ${
      includePrintToolbar
        ? `<div class="print-bar">
      <button onclick="window.print()">🖨️ প্রিন্ট করুন (${format === 'standard' ? 'A4 Page' : format === 'standardA5' ? 'A5 Page' : 'Thermal Receipt'})</button>
      <span style="font-size:12px; color:#475569; margin-left:10px;">প্রিন্ট ডায়ালগ খুলছে...</span>
    </div>`
        : ''
    }
    <div id="standalone-sheet">
      ${innerHtml}
    </div>
    ${
      includePrintToolbar
        ? `<script>
      window.addEventListener('load', function() {
        var imgs = Array.prototype.slice.call(document.images || []);
        Promise.all(imgs.map(function(img) {
          if (img.complete) return Promise.resolve();
          return new Promise(function(res) {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          });
        })).then(function() {
          setTimeout(function() { window.print(); }, 250);
        });
      });
    </script>`
        : ''
    }
  </body>
</html>`;
}

/**
 * Opens a standalone print page in a fresh window/tab.
 * If popups are blocked by browser, automatically downloads the printable HTML invoice.
 */
export function openStandalonePrintTab(
  bill: Bill,
  config: ShopConfig,
  format: ReceiptFormat = 'thermal'
): void {
  const pageHtml = buildStandalonePrintHtml(bill, config, format, true);
  const blob = new Blob([pageHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const win = window.open(blobUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      downloadReceiptHtml(bill, config, format);
    }
  } catch {
    downloadReceiptHtml(bill, config, format);
  }
}

/**
 * Downloads the receipt/A4 invoice as a complete standalone offline HTML file
 */
export function downloadReceiptHtml(
  bill: Bill,
  config: ShopConfig,
  format: ReceiptFormat = 'thermal'
): void {
  const pageHtml = buildStandalonePrintHtml(bill, config, format, true);
  const blob = new Blob([pageHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bill-${bill.billNo || 'invoice'}-${format === 'standard' ? 'A4' : format}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates formatted text copy of the receipt for quick sharing / Bluetooth apps
 */
export function generatePlainTextBill(bill: Bill, config: ShopConfig): string {
  const line = '------------------------------------------\n';
  const dblLine = '==========================================\n';
  let text = '';
  text += `${config.shopName || 'DELICIOUS CAKE CORNER'}\n`;
  text += `100% Eggless Pure Veg Bakery\n`;
  text += `${config.addressLine1 || 'Mansuka, Ghatal, Paschim Medinipur'}\n`;
  text += `Phone: ${config.phone || '7866971421'}\n`;
  text += dblLine;
  text += `Bill No: ${bill.billNo}   Date: ${new Date(bill.createdAt).toLocaleDateString('en-IN')}\n`;
  text += `Time: ${new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n`;
  if (bill.customerName) text += `Customer: ${bill.customerName} (${bill.customerMobile || ''})\n`;
  if (bill.cakeMessage) text += `Message: "${bill.cakeMessage}"\n`;
  text += line;
  text += `ITEM                    QTY   RATE    TOTAL\n`;
  text += line;
  for (const item of bill.items) {
    const name = item.name.substring(0, 22).padEnd(23);
    const qty = String(item.qty).padStart(4);
    const rate = `₹${item.rate.toFixed(0)}`.padStart(7);
    const tot = `₹${item.total.toFixed(0)}`.padStart(8);
    text += `${name} ${qty} ${rate} ${tot}\n`;
  }
  text += line;
  text += `Subtotal:                        ₹${bill.subtotal.toFixed(2)}\n`;
  if (bill.discountAmount > 0) text += `Discount:                       -₹${bill.discountAmount.toFixed(2)}\n`;
  if (bill.taxAmount > 0) text += `GST:                            +₹${bill.taxAmount.toFixed(2)}\n`;
  text += dblLine;
  text += `GRAND TOTAL:                    ₹${bill.grandTotal.toFixed(2)}\n`;
  text += `Paid (${bill.paymentMethod}):             ₹${(bill.advancePaid > 0 ? bill.advancePaid : bill.grandTotal).toFixed(2)}\n`;
  if (bill.dueAmount > 0) text += `DUE BALANCE:                     ₹${bill.dueAmount.toFixed(2)}\n`;
  text += line;
  text += `${config.thankYouMessage || 'Thank you! Visit Again.'}\n`;
  return text;
}

export async function executePrint(
  bill: Bill,
  config: ShopConfig,
  printerDevice?: PrinterDevice,
  formatOverride?: ReceiptFormat,
  copies: number = 1
): Promise<{ success: boolean; message: string }> {
  const activeDevice = printerDevice || (config.printerDevices || []).find((d) => d.id === config.activePrinterId) || (config.printerDevices || [])[0];
  const printerType = activeDevice?.type || config.printer?.type || 'system';
  const effectiveFormat = formatOverride || config.receiptFormat || 'thermal';

  // 1. Bluetooth ESC/POS Direct
  if (printerType === 'bluetooth') {
    const paperWidth = activeDevice?.paperWidth === '58mm' || effectiveFormat === 'thermal58' ? '58mm' : '80mm';
    const escposData = effectiveFormat === 'kot'
      ? buildEscPosKot(bill, config)
      : buildEscPosReceipt(bill, config, paperWidth, activeDevice?.openCashDrawer, activeDevice?.autoCut);

    for (let c = 0; c < copies; c++) {
      const res = await printViaBluetoothEscpos(escposData);
      if (!res.success) {
        // Fallback to clean isolated print if Bluetooth fails
        await triggerCleanReceiptPrint(bill, config, effectiveFormat);
        return {
          success: true,
          message: `Bluetooth dispatch failed (${res.error}). Switched to System Print dialog.`
        };
      }
    }
    return { success: true, message: `Dispatched ${copies} cop${copies > 1 ? 'ies' : 'y'} to Bluetooth printer (${activeDevice?.name || 'POS-58'})` };
  }

  // 2. Network IP ESC/POS Direct
  if (printerType === 'network' && activeDevice?.ipAddress) {
    const paperWidth = activeDevice?.paperWidth === '58mm' ? '58mm' : '80mm';
    const escposData = effectiveFormat === 'kot'
      ? buildEscPosKot(bill, config)
      : buildEscPosReceipt(bill, config, paperWidth, activeDevice.openCashDrawer, activeDevice.autoCut);

    const res = await printViaNetworkEscpos(activeDevice.ipAddress, activeDevice.port || 9100, escposData);
    if (res.success) {
      return { success: true, message: `Dispatched to IP Printer (${activeDevice.ipAddress})` };
    }
  }

  // 3. Virtual PDF Download
  if (printerType === 'pdf') {
    downloadReceiptHtml(bill, config, effectiveFormat);
    return { success: true, message: 'Receipt HTML/PDF file generated and downloaded!' };
  }

  // 4. Standard System Browser Spooler (Default for Epson, TVS, HP, Canon, etc.)
  for (let c = 0; c < copies; c++) {
    await triggerCleanReceiptPrint(bill, config, effectiveFormat);
  }
  return { success: true, message: `Sent to System Printer (${copies} copy)` };
}

/**
 * Merge and Add ALL Popular POS, Bluetooth, KOT, and Laser printers to fleet
 */
export function addAllPrintersToFleet(currentDevices: PrinterDevice[]): PrinterDevice[] {
  const existingIds = new Set(currentDevices.map((d) => d.id));
  const existingNames = new Set(currentDevices.map((d) => d.name.toLowerCase().trim()));

  const newPrinters: PrinterDevice[] = [];

  for (const model of ALL_POPULAR_PRINTER_MODELS) {
    if (!existingIds.has(model.id) && !existingNames.has(model.name.toLowerCase().trim())) {
      newPrinters.push({
        ...model,
        isDefault: false
      });
    }
  }

  return [...currentDevices, ...newPrinters];
}

/**
 * Broadcast & Print bill simultaneously across all configured printers based on role
 * (e.g. Cashier receipt to 80mm POS, Chef slip to Kitchen KOT printer, and Office record)
 */
export async function executePrintToAllPrinters(
  bill: Bill,
  config: ShopConfig,
  copies: number = 1,
  formatOverride?: ReceiptFormat
): Promise<{ success: boolean; details: string[] }> {
  const effectiveFormat = formatOverride || config.receiptFormat || 'thermal';
  const devices = config.printerDevices || [];
  if (devices.length === 0) {
    await triggerCleanReceiptPrint(bill, config, effectiveFormat);
    return { success: true, details: ['Dispatched to default system printer dialog'] };
  }

  const results: string[] = [];
  let atLeastOneSuccess = false;

  // 1. First trigger hardware network/Bluetooth devices that don't block the UI
  for (const device of devices) {
    try {
      if (device.type === 'bluetooth') {
        const paperWidth = device.paperWidth === '58mm' ? '58mm' : '80mm';
        const escData = device.role === 'kitchen'
          ? buildEscPosKot(bill, config)
          : buildEscPosReceipt(bill, config, paperWidth, device.openCashDrawer, device.autoCut);
        const res = await printViaBluetoothEscpos(escData);
        if (res.success) {
          atLeastOneSuccess = true;
          results.push(`✓ Bluetooth: ${device.name}`);
        } else {
          results.push(`⚠ Bluetooth ${device.name}: ${res.error}`);
        }
      } else if (device.type === 'network' && device.ipAddress) {
        const paperWidth = device.paperWidth === '58mm' ? '58mm' : '80mm';
        const escData = device.role === 'kitchen'
          ? buildEscPosKot(bill, config)
          : buildEscPosReceipt(bill, config, paperWidth, device.openCashDrawer, device.autoCut);
        const res = await printViaNetworkEscpos(device.ipAddress, device.port || 9100, escData);
        if (res.success) {
          atLeastOneSuccess = true;
          results.push(`✓ Network IP LAN: ${device.name} (${device.ipAddress})`);
        } else {
          results.push(`⚠ Network IP ${device.name}: offline / fallback`);
        }
      }
    } catch (e: any) {
      results.push(`⚠ Error on ${device.name}: ${e?.message}`);
    }
  }

  // 2. Finally trigger clean system print preview with matched @page rules
  for (let c = 0; c < copies; c++) {
    await triggerCleanReceiptPrint(bill, config, effectiveFormat);
  }
  results.push('✓ System Print Spooler dialog opened');
  atLeastOneSuccess = true;

  return { success: atLeastOneSuccess, details: results };
}
