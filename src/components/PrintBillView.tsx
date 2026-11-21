import React, { useEffect, useState } from 'react';
import { Bill, ShopConfig, Language, ReceiptFormat } from '../types';
import { getT } from '../translations';
import { generateQrDataUrl, generateCustomQrDataUrl, generateUpiString } from '../utils/upi';
import { DEFAULT_BAKERY_LOGO } from '../data/defaultProducts';

interface PrintBillViewProps {
  bill: Bill;
  config: ShopConfig;
  lang: Language;
  formatOverride?: ReceiptFormat;
}

export const PrintBillView: React.FC<PrintBillViewProps> = ({
  bill,
  config,
  lang,
  formatOverride
}) => {
  const t = getT(lang);
  const format = formatOverride || config.receiptFormat || 'thermal';
  const [qrUrl, setQrUrl] = useState<string>('');
  const [reviewQrUrl, setReviewQrUrl] = useState<string>('');
  const rawLogo = config.logoUrl || DEFAULT_BAKERY_LOGO;
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string>(rawLogo);

  useEffect(() => {
    let active = true;
    const targetSrc = config.logoUrl || DEFAULT_BAKERY_LOGO;
    if (!targetSrc) {
      setResolvedLogoUrl('');
      return;
    }
    if (targetSrc.startsWith('data:')) {
      setResolvedLogoUrl(targetSrc);
      return;
    }

    // Eagerly convert asset/HTTP logo to inline base64 Data URL so it ALWAYS paints on print, blob tabs, & offline HTML
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || maxDim, img.naturalHeight || maxDim));
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 160) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 160) * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setResolvedLogoUrl(canvas.toDataURL('image/png'));
          return;
        }
      } catch {
        // Fallback to raw targetSrc
      }
      setResolvedLogoUrl(targetSrc);
    };
    img.onerror = () => {
      if (!active) return;
      if (targetSrc !== DEFAULT_BAKERY_LOGO) {
        setResolvedLogoUrl(DEFAULT_BAKERY_LOGO);
      } else {
        setResolvedLogoUrl(targetSrc);
      }
    };
    img.src = targetSrc;

    return () => {
      active = false;
    };
  }, [config.logoUrl]);

  const effectiveLogo = config.showLogoOnReceipt !== false ? (resolvedLogoUrl || config.logoUrl || DEFAULT_BAKERY_LOGO) : '';

  useEffect(() => {
    // Generate UPI QR code for the bill if any balance is due or for quick shop verification
    const upiStr = generateUpiString(config, bill.dueAmount > 0 ? bill.dueAmount : bill.grandTotal, bill.billNo);
    generateQrDataUrl(upiStr).then((url) => setQrUrl(url));

    const reviewUrl = config.googleReviewUrl || config.googleMapsUrl || 'https://maps.google.com/?cid=15321528623789416959';
    generateCustomQrDataUrl(reviewUrl, 200, '#000000').then((url) => setReviewQrUrl(url));
  }, [bill, config]);

  // 1. KITCHEN ORDER TICKET (KOT) / BAKER PRODUCTION SLIP
  if (format === 'kot') {
    return (
      <div className="kot-ticket bg-white text-black p-4 text-[13px] leading-tight font-mono border-2 border-black rounded max-w-[80mm] mx-auto print:border-none print:shadow-none print:p-1">
        {/* KOT Header */}
        <div className="text-center pb-2 border-b-2 border-black">
          <div className="text-[12px] font-extrabold tracking-wider uppercase bg-black text-white py-1 mb-1">
            *** KITCHEN ORDER TICKET (KOT) ***
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight">{config.shopName}</h1>
          <p className="text-[11px] font-bold">BAKERY & CAKE STUDIO PRODUCTION SLIP</p>
        </div>

        {/* Order Info */}
        <div className="py-2 border-b border-dashed border-black space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-sm">BILL: {bill.billNo}</span>
            <span className="font-bold px-1.5 py-0.5 bg-black text-white text-[10px] rounded uppercase">
              {bill.orderType.replace('_', ' ')}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-800">
            <span>Booked: {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            <span>{new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {bill.customerName && (
            <div className="text-[11px]">
              Customer: <b>{bill.customerName}</b> {bill.customerMobile && `(${bill.customerMobile})`}
            </div>
          )}

          {/* Delivery Schedule Banner */}
          {bill.deliveryDate && (
            <div className="p-1.5 bg-yellow-100 border border-black font-extrabold text-xs text-black mt-1 text-center">
              DELIVERY SCHEDULE: {bill.deliveryDate} {bill.deliveryTime ? `@ ${bill.deliveryTime}` : ''}
            </div>
          )}

          {/* Cake Message Banner */}
          {bill.cakeMessage && (
            <div className="p-2 border-2 border-black bg-slate-50 mt-1">
              <span className="text-[10px] font-bold block uppercase tracking-wider">Cake Inscription / Writing:</span>
              <div className="font-sans font-black text-sm text-black italic mt-0.5">
                "{bill.cakeMessage}"
              </div>
            </div>
          )}
        </div>

        {/* Preparation Items List */}
        <div className="py-2">
          <div className="text-[11px] font-black uppercase mb-1.5 border-b border-black pb-0.5">
            ITEMS TO BAKE / PREPARE:
          </div>
          <div className="space-y-2">
            {bill.items.map((item, idx) => (
              <div key={idx} className="border-b border-dotted border-slate-400 pb-1.5">
                <div className="flex justify-between font-bold text-xs">
                  <span>
                    [ ] {idx + 1}. {item.name}
                  </span>
                  <span className="text-sm font-black underline">x{item.qty}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-700 pl-4 mt-0.5">
                  <span>Weight / Size: <b>{item.weightOrSize}</b></span>
                  <span>100% Eggless</span>
                </div>
                {item.notes && (
                  <div className="text-[10px] italic text-slate-800 pl-4 mt-0.5">
                    Chef Note: {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Baker Quality Sign-off */}
        <div className="pt-3 border-t-2 border-black text-[11px] space-y-2">
          <div className="flex justify-between items-end pt-3">
            <div>
              <div className="w-24 border-b border-black mb-1"></div>
              <span>Baker Prep Sign</span>
            </div>
            <div>
              <div className="w-24 border-b border-black mb-1"></div>
              <span>Packaging Check</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. 58MM COMPACT POS THERMAL RECEIPT (2-INCH ROLL / MOBILE BLUETOOTH)
  if (format === 'thermal58') {
    return (
      <div className="thermal-receipt-58 bg-white text-black p-2 text-[11px] leading-tight font-mono border border-slate-300 rounded shadow-xs max-w-[58mm] mx-auto print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="text-center pb-1.5 border-b border-dashed border-black">
          {effectiveLogo && (
            <img
              src={effectiveLogo}
              alt={config.shopName || 'Delicious Cake Corner'}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== DEFAULT_BAKERY_LOGO) target.src = DEFAULT_BAKERY_LOGO;
              }}
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              className="w-12 h-12 rounded-lg object-cover mx-auto contrast-125 mb-1 border border-slate-300"
            />
          )}
          <h1 className="text-sm font-black tracking-tight uppercase leading-snug">{config.shopName || 'DELICIOUS CAKE CORNER'}</h1>
          <div className="text-[10px] font-black">100% EGGLESS PURE VEG BAKERY</div>
          <p className="text-[9px] leading-tight text-slate-700 mt-0.5">
            {config.addressLine1 || 'Mansuka, Ghatal'} | Ph: {config.phone}
          </p>
        </div>

        {/* Bill Metadata */}
        <div className="py-1 border-b border-dashed border-black text-[10px] space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>Bill: {bill.billNo}</span>
            <span>{bill.orderType.toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-[9px] text-slate-600">
            <span>{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}</span>
            <span>{new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {bill.customerName && (
            <div className="truncate">Cust: <b>{bill.customerName}</b> {bill.customerMobile && `(${bill.customerMobile})`}</div>
          )}
          {bill.cakeMessage && (
            <div className="text-[9px] font-sans italic border-l border-black pl-1 mt-0.5">
              "{bill.cakeMessage}"
            </div>
          )}
          {bill.deliveryDate && (
            <div className="text-[9px] font-bold bg-slate-100 p-0.5">
              Del: {bill.deliveryDate} {bill.deliveryTime || ''}
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full text-left my-1 text-[10px]">
          <thead>
            <tr className="border-b border-black text-[9px] uppercase font-bold">
              <th className="py-0.5">Item</th>
              <th className="py-0.5 text-center">Qty</th>
              <th className="py-0.5 text-right">Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-slate-200">
            {bill.items.map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-1 pr-1">
                  <div className="font-semibold leading-tight">{item.name}</div>
                  <div className="text-[8px] text-slate-500">({item.weightOrSize})</div>
                </td>
                <td className="py-1 text-center font-bold">{item.qty}</td>
                <td className="py-1 text-right font-bold">₹{item.total.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-dashed border-black pt-1 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{bill.subtotal.toFixed(0)}</span>
          </div>
          {bill.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-₹{bill.discountAmount.toFixed(0)}</span>
            </div>
          )}
          {bill.taxAmount > 0 && (
            <div className="flex justify-between">
              <span>GST ({bill.taxPercent}%):</span>
              <span>+₹{bill.taxAmount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-black border-t border-b border-black py-0.5 my-0.5">
            <span>TOTAL:</span>
            <span>₹{bill.grandTotal.toFixed(0)}</span>
          </div>

          <div className="flex justify-between text-[9px]">
            <span>Paid ({bill.paymentMethod}):</span>
            <span className="font-bold">₹{(bill.advancePaid > 0 ? bill.advancePaid : bill.grandTotal).toFixed(0)}</span>
          </div>
          {bill.dueAmount > 0 ? (
            <div className="flex justify-between text-red-600 font-extrabold text-[10px] bg-red-50 p-0.5">
              <span>DUE:</span>
              <span>₹{bill.dueAmount.toFixed(0)}</span>
            </div>
          ) : (
            <div className="text-center font-bold text-emerald-800 text-[9px]">
              *** PAID FULLY ***
            </div>
          )}

          {bill.loyaltyPointsEarned && bill.loyaltyPointsEarned > 0 ? (
            <div className="text-center font-bold text-[9px] bg-amber-50 p-0.5 border border-dashed border-amber-300">
              ★ Points: +{bill.loyaltyPointsEarned} pts ★
            </div>
          ) : null}
        </div>

        {/* Mini Footer */}
        <div className="text-center mt-2 pt-1 border-t border-dashed border-black text-[9px] space-y-0.5">
          <div className="flex items-center justify-center gap-2 my-1">
            {qrUrl && (
              <div className="flex flex-col items-center">
                <img src={qrUrl} alt="UPI QR" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                <span className="text-[7px] font-mono font-bold">UPI PAY</span>
              </div>
            )}
            {reviewQrUrl && (
              <div className="flex flex-col items-center">
                <img src={reviewQrUrl} alt="Review QR" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                <span className="text-[7px] font-bold">5★ REVIEW</span>
              </div>
            )}
          </div>
          <p className="font-bold">{config.thankYouMessage || t.thankYou}</p>
          <p className="text-[8px] text-slate-600">FB: facebook.com/share/1EEg9yAa9A/</p>
          <p className="text-[8px] text-slate-500">Sign: {config.signatoryName || 'Sumona Mondal Kunti'}</p>
        </div>
      </div>
    );
  }

  // 3. 80MM STANDARD POS THERMAL RECEIPT (3-INCH ROLL)
  if (format === 'thermal') {
    return (
      <div className="thermal-receipt bg-white text-black p-4 text-[13px] leading-tight font-mono border border-slate-300 rounded shadow-xs max-w-[80mm] mx-auto print:border-none print:shadow-none print:p-1">
        {/* Header */}
        <div className="text-center pb-2 border-b border-dashed border-black">
          {effectiveLogo && (
            <div className="flex justify-center mb-1.5">
              <img
                src={effectiveLogo}
                alt={config.shopName || 'Delicious Cake Corner'}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== DEFAULT_BAKERY_LOGO) target.src = DEFAULT_BAKERY_LOGO;
                }}
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                className="w-16 h-16 rounded-xl object-cover mx-auto contrast-125 border border-slate-300"
              />
            </div>
          )}
          <h1 className="text-lg font-black tracking-wide uppercase leading-tight">{config.shopName || 'DELICIOUS CAKE CORNER'}</h1>
          <div className="flex items-center justify-center gap-1 my-1">
            <span className="inline-block w-2.5 h-2.5 border border-emerald-700 p-0.5">
              <span className="block w-full h-full bg-emerald-700 rounded-full"></span>
            </span>
            <span className="text-[10px] font-bold">100% EGGLESS PURE VEG BAKERY & STUDIO</span>
          </div>
          <p className="text-[11px] leading-snug">
            {config.addressLine1}
            <br />
            {config.district}, PIN: {config.pin}
          </p>
          <p className="text-[11px] font-bold mt-0.5">Mob: {config.phone}</p>
        </div>

        {/* Bill Metadata */}
        <div className="py-2 border-b border-dashed border-black text-[11px] space-y-0.5">
          <div className="flex justify-between">
            <span>Bill No: <b>{bill.billNo}</b></span>
            <span>{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Time: {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{bill.orderType.toUpperCase()}</span>
          </div>
          {(bill.terminalName || bill.counterName) && (
            <div className="flex justify-between text-[10px] text-slate-800">
              <span>Station: <b>{bill.terminalName || bill.counterName}</b></span>
              {bill.counterName && bill.terminalName && <span>Counter: {bill.counterName}</span>}
            </div>
          )}
          {bill.customerName && (
            <div>Cust: <b>{bill.customerName}</b> {bill.customerMobile && `(${bill.customerMobile})`}</div>
          )}
          {bill.cakeMessage && (
            <div className="text-[10px] italic border-l-2 border-black pl-1 mt-1 font-sans">
              "Msg: {bill.cakeMessage}"
            </div>
          )}
          {bill.deliveryDate && (
            <div className="text-[11px] font-bold bg-slate-100 p-0.5 mt-1">
              Delivery: {bill.deliveryDate} {bill.deliveryTime || ''}
            </div>
          )}
        </div>

        {/* Item Table */}
        <table className="w-full text-left my-2 text-[11px]">
          <thead>
            <tr className="border-b border-black text-[10px] uppercase font-bold">
              <th className="py-1">Item</th>
              <th className="py-1 text-center">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-slate-300">
            {bill.items.map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-1 pr-1 font-sans">
                  <div className="font-semibold text-[11px]">{item.name}</div>
                  <div className="text-[9px] text-slate-600 font-mono">({item.weightOrSize})</div>
                </td>
                <td className="py-1 text-center font-mono">{item.qty}</td>
                <td className="py-1 text-right font-mono">₹{item.rate.toFixed(0)}</td>
                <td className="py-1 text-right font-mono font-bold">₹{item.total.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary */}
        <div className="border-t border-dashed border-black pt-1.5 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-mono">₹{bill.subtotal.toFixed(2)}</span>
          </div>
          {bill.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span className="font-mono">-₹{bill.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {bill.loyaltyDiscountAmount && bill.loyaltyDiscountAmount > 0 ? (
            <div className="flex justify-between text-emerald-800">
              <span>Loyalty Points Discount:</span>
              <span className="font-mono">-₹{bill.loyaltyDiscountAmount.toFixed(2)}</span>
            </div>
          ) : null}
          {bill.taxAmount > 0 && (
            <div className="flex justify-between">
              <span>GST ({bill.taxPercent}%):</span>
              <span className="font-mono">+₹{bill.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[14px] font-extrabold border-t border-b border-black py-1 my-1">
            <span>GRAND TOTAL:</span>
            <span className="font-mono">₹{bill.grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Payment Mode:</span>
            <span className="font-bold uppercase">{bill.paymentMethod}</span>
          </div>

          {bill.advancePaid > 0 && (
            <div className="flex justify-between text-emerald-800">
              <span>Advance Paid:</span>
              <span className="font-mono font-bold">₹{bill.advancePaid.toFixed(2)}</span>
            </div>
          )}

          {bill.dueAmount > 0 ? (
            <div className="flex justify-between text-red-700 font-extrabold text-[12px] bg-red-50 p-1 border border-red-300">
              <span>DUE BALANCE:</span>
              <span className="font-mono">₹{bill.dueAmount.toFixed(2)}</span>
            </div>
          ) : (
            <div className="text-center font-bold text-emerald-700 py-0.5 text-[11px]">
              *** PAID FULLY ***
            </div>
          )}

          {bill.loyaltyPointsEarned && bill.loyaltyPointsEarned > 0 ? (
            <div className="text-center font-bold text-amber-950 bg-amber-50 py-0.5 my-1 text-[10px] border border-dashed border-amber-300">
              ★ Loyalty Points Earned: +{bill.loyaltyPointsEarned} pts ★
            </div>
          ) : null}
        </div>

        {/* UPI QR & Google Review QR & Footer */}
        <div className="text-center mt-3 pt-2 border-t border-dashed border-black space-y-1">
          <div className="flex items-center justify-center gap-4 my-1">
            {(config.qrCodeImage || qrUrl) && (
              <div className="flex flex-col items-center justify-center">
                <img src={config.qrCodeImage || qrUrl} alt="UPI Pay" className="w-18 h-18 object-contain" referrerPolicy="no-referrer" />
                <span className="text-[8px] text-slate-700 font-mono font-bold mt-0.5">UPI: {config.upiId}</span>
              </div>
            )}
            {reviewQrUrl && (
              <div className="flex flex-col items-center justify-center">
                <img src={reviewQrUrl} alt="Google Review" className="w-18 h-18 object-contain" referrerPolicy="no-referrer" />
                <span className="text-[8px] text-slate-700 font-bold mt-0.5">⭐ GOOGLE 5★ REVIEW</span>
              </div>
            )}
          </div>
          <p className="text-[10px] font-bold">{config.thankYouMessage || t.thankYou}</p>
          <p className="text-[9px] text-slate-600">FB: facebook.com/share/1EEg9yAa9A/ | {t.visitAgain}</p>
        </div>

        {/* Authorized Signatory */}
        <div className="text-center mt-3 pt-2 border-t border-dotted border-black/60 flex flex-col items-center">
          {config.signatureImage ? (
            <img
              src={config.signatureImage}
              alt="Signature"
              className="h-9 max-w-[120px] object-contain mx-auto mix-blend-multiply mb-0.5"
            />
          ) : (
            <div className="font-serif italic text-sm text-slate-800 tracking-wider transform -rotate-3 scale-95 opacity-90 my-0.5">
              {config.signatoryName || 'Sumona Mondal Kunti'}
            </div>
          )}
          <div className="w-24 border-b border-black mb-0.5"></div>
          <span className="text-[10px] font-bold uppercase tracking-tight block">
            {config.signatoryName || 'Sumona Mondal Kunti'}
          </span>
          <span className="text-[8px] text-slate-600 block">{t.authorizedSign}</span>
        </div>
      </div>
    );
  }

  // 4. A5 COMPACT RETAIL INVOICE FORMAT
  if (format === 'standardA5') {
    return (
      <div className="standard-invoice-a5 bg-white text-slate-900 p-4 sm:p-5 max-w-xl mx-auto border border-slate-300 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-start border-b-2 border-[#4b1d3f] pb-3">
          <div className="flex items-start gap-2.5">
            {effectiveLogo && (
              <img
                src={effectiveLogo}
                alt={config.shopName || 'Delicious Cake Corner'}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== DEFAULT_BAKERY_LOGO) target.src = DEFAULT_BAKERY_LOGO;
                }}
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                className="w-12 h-12 rounded-full object-cover border border-amber-300 shadow-xs shrink-0"
              />
            )}
            <div>
              <h1 className="text-lg font-black text-[#4b1d3f]">{config.shopName}</h1>
              <p className="text-[11px] font-bold text-emerald-800">100% EGGLESS PURE VEG</p>
              <p className="text-[10px] text-slate-500">{config.addressLine1}, Ph: {config.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-500">Retail Bill</span>
            <div className="text-base font-black font-mono text-[#4b1d3f]">{bill.billNo}</div>
            <div className="text-[10px] text-slate-600">{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 py-2 text-[11px] border-b border-slate-200">
          <div>Cust: <b>{bill.customerName || 'Walk-in'}</b> {bill.customerMobile && `(${bill.customerMobile})`}</div>
          <div className="text-right">Type: <b className="uppercase">{bill.orderType.replace('_', ' ')}</b></div>
          {bill.cakeMessage && (
            <div className="col-span-2 italic text-[10px] bg-amber-50 p-1 rounded border border-amber-200">
              Cake Message: "{bill.cakeMessage}"
            </div>
          )}
        </div>

        <table className="w-full text-left text-xs my-2">
          <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
            <tr>
              <th className="p-1.5">Item</th>
              <th className="p-1.5 text-center">Qty</th>
              <th className="p-1.5 text-right">Rate</th>
              <th className="p-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            {bill.items.map((item, idx) => (
              <tr key={idx}>
                <td className="p-1.5 font-semibold">{item.name} ({item.weightOrSize})</td>
                <td className="p-1.5 text-center font-mono">{item.qty}</td>
                <td className="p-1.5 text-right font-mono">₹{item.rate.toFixed(0)}</td>
                <td className="p-1.5 text-right font-mono font-bold">₹{item.total.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-slate-300 pt-2 flex justify-between text-xs">
          <div className="text-[10px] text-slate-500 space-y-1">
            <p>Payment: <b className="uppercase text-slate-800">{bill.paymentMethod}</b></p>
            {config.upiId && <p className="font-mono">UPI ID: {config.upiId}</p>}
            <p className="italic">{config.thankYouMessage || 'Thank you, visit again!'}</p>
          </div>
          <div className="w-48 space-y-1 text-right text-xs">
            <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">₹{bill.subtotal.toFixed(2)}</span></div>
            {bill.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount:</span><span className="font-mono">-₹{bill.discountAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-extrabold text-sm border-t border-slate-300 pt-1 text-[#4b1d3f]">
              <span>Grand Total:</span><span className="font-mono">₹{bill.grandTotal.toFixed(2)}</span>
            </div>
            {bill.dueAmount > 0 && <div className="flex justify-between text-red-600 font-bold"><span>Due:</span><span className="font-mono">₹{bill.dueAmount.toFixed(2)}</span></div>}
          </div>
        </div>
      </div>
    );
  }

  // 5. STANDARD A4 FULL PAGE DETAILED TAX INVOICE FORMAT
  return (
    <div className="standard-invoice bg-white text-slate-900 p-6 md:p-8 max-w-3xl w-full mx-auto border border-slate-200 rounded-xl shadow-sm print:max-w-[190mm] print:border-none print:shadow-none print:p-1">
      {/* Top Invoice Header */}
      <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start gap-4 pb-5 border-b-2 border-[#4b1d3f]">
        <div className="flex items-start gap-4 sm:gap-5">
          {effectiveLogo && (
            <img
              src={effectiveLogo}
              alt={config.shopName || 'Delicious Cake Corner'}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== DEFAULT_BAKERY_LOGO) target.src = DEFAULT_BAKERY_LOGO;
              }}
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-300 shadow-sm shrink-0"
            />
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-4 h-4 border-2 border-emerald-700 p-0.5" title="100% Pure Vegetarian">
                <span className="block w-full h-full bg-emerald-700 rounded-full"></span>
              </span>
              <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% Eggless Pure Veg
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl print:text-3xl font-black text-[#4b1d3f] tracking-tight leading-tight uppercase">
              {config.shopName || 'DELICIOUS CAKE CORNER'}
            </h1>
            <p className="text-sm font-bold text-amber-800">{config.tagline || '100% Eggless Pure Vegetarian Bakery & Cake Studio'}</p>
            <p className="text-xs text-slate-600 mt-1 max-w-md font-medium">
              {config.addressLine1}, {config.addressLine2}, {config.district}, PIN: {config.pin}
            </p>
            <p className="text-xs text-slate-700 font-bold mt-1">
              Phone / WhatsApp: <span className="font-mono text-slate-900">{config.phone}</span>
              {config.fssai && <span className="ml-3 font-normal text-slate-500">FSSAI: {config.fssai}</span>}
            </p>
          </div>
        </div>

        <div className="sm:text-right print:text-right bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 min-w-[195px] shrink-0">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            TAX / RETAIL INVOICE (A4)
          </span>
          <div className="text-lg font-black text-[#4b1d3f] font-mono">{bill.billNo}</div>
          <div className="text-xs text-slate-600 mt-1">
            Date: <span className="font-semibold text-slate-900">{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="text-xs text-slate-500">
            Time: {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="mt-2 flex items-center sm:justify-end print:justify-end gap-1.5 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
              {bill.orderType.replace('_', ' ')}
            </span>
            {bill.terminalName && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900">
                {bill.terminalName}
              </span>
            )}
            {bill.counterName && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#4b1d3f] text-white">
                {bill.counterName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customer & Order Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
        <div>
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-0.5">Billed To:</span>
          <div className="font-bold text-slate-900 text-sm">{bill.customerName || 'Walk-in Customer'}</div>
          {bill.customerMobile && (
            <div className="text-slate-600 font-mono mt-0.5">Contact: {bill.customerMobile}</div>
          )}
        </div>
        <div>
          {bill.cakeMessage && (
            <div className="mb-2">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-0.5">
                Message on Cake:
              </span>
              <div className="font-medium italic text-slate-800 bg-amber-50/70 p-1.5 rounded border border-amber-200/50">
                "{bill.cakeMessage}"
              </div>
            </div>
          )}
          {bill.deliveryDate && (
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-0.5">
                Delivery / Pickup Date:
              </span>
              <div className="font-bold text-[#4b1d3f]">
                {bill.deliveryDate} {bill.deliveryTime ? `at ${bill.deliveryTime}` : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3">Size / Weight</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Rate</th>
              <th className="py-2.5 px-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {bill.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                <td className="py-2.5 px-3 font-semibold text-slate-900">
                  {item.name}
                  {item.notes && <span className="block text-[10px] text-slate-500 font-normal italic">{item.notes}</span>}
                </td>
                <td className="py-2.5 px-3 text-slate-600 font-mono">{item.weightOrSize}</td>
                <td className="py-2.5 px-3 text-center font-mono font-medium">{item.qty}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">₹{item.rate.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                  ₹{item.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Calculation & Payment Breakdown */}
      <div className="mt-4 pt-2 flex flex-col sm:flex-row print:flex-row justify-between gap-6">
        {/* Left: Notes & QR Code */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            {qrUrl && (
              <img src={qrUrl} alt="UPI QR" className="w-16 h-16 shrink-0 border border-slate-200 rounded" />
            )}
            <div className="text-[11px] text-slate-600">
              <span className="font-bold text-slate-800 block mb-0.5">Scan to Pay via UPI</span>
              <span>Accepted: GPay, PhonePe, Paytm, BHIM</span>
              <span className="block font-mono text-[10px] text-slate-700 mt-0.5 font-bold">UPI ID: {config.upiId}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 leading-relaxed border-l-2 border-slate-300 pl-2">
            <span className="font-bold text-slate-700 block">Terms & Conditions:</span>
            {config.termsNote}
          </div>
        </div>

        {/* Right: Totals calculation */}
        <div className="w-full sm:w-72 print:w-72 space-y-1.5 text-xs shrink-0">
          <div className="flex justify-between text-slate-600 py-1">
            <span>Subtotal:</span>
            <span className="font-mono tabular-nums font-semibold">₹{bill.subtotal.toFixed(2)}</span>
          </div>

          {bill.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 py-1">
              <span>Discount ({bill.discountType === 'percent' ? `${bill.discountValue}%` : 'Flat'}):</span>
              <span className="font-mono tabular-nums font-semibold">-₹{bill.discountAmount.toFixed(2)}</span>
            </div>
          )}

          {bill.loyaltyDiscountAmount && bill.loyaltyDiscountAmount > 0 ? (
            <div className="flex justify-between text-emerald-700 py-1">
              <span>Loyalty Points Discount:</span>
              <span className="font-mono tabular-nums font-semibold">-₹{bill.loyaltyDiscountAmount.toFixed(2)}</span>
            </div>
          ) : null}

          {bill.taxAmount > 0 && (
            <div className="flex justify-between text-slate-600 py-1">
              <span>GST ({bill.taxPercent}%):</span>
              <span className="font-mono tabular-nums font-semibold">+₹{bill.taxAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-extrabold text-[#4b1d3f] border-t-2 border-b-2 border-[#4b1d3f] py-2 my-2">
            <span>Grand Total:</span>
            <span className="font-mono tabular-nums">₹{bill.grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-slate-700 py-0.5">
            <span>Payment Method:</span>
            <span className="font-bold uppercase">{bill.paymentMethod}</span>
          </div>

          {bill.advancePaid > 0 && (
            <div className="flex justify-between text-emerald-800 font-semibold py-0.5">
              <span>Advance Paid:</span>
              <span className="font-mono tabular-nums">₹{bill.advancePaid.toFixed(2)}</span>
            </div>
          )}

          {bill.dueAmount > 0 ? (
            <div className="flex justify-between text-red-700 font-bold bg-red-50 p-2 rounded border border-red-200 text-sm mt-1">
              <span>Balance Due:</span>
              <span className="font-mono tabular-nums font-extrabold">₹{bill.dueAmount.toFixed(2)}</span>
            </div>
          ) : (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded p-1.5 text-center font-bold text-xs mt-1">
              ✓ Fully Paid
            </div>
          )}

          {bill.loyaltyPointsEarned && bill.loyaltyPointsEarned > 0 ? (
            <div className="bg-amber-50 text-amber-950 border border-dashed border-amber-300 rounded p-1.5 text-center font-bold text-xs mt-1">
              ★ Loyalty Points Earned: +{bill.loyaltyPointsEarned} pts ★
            </div>
          ) : null}
        </div>
      </div>

      {/* Signature & Appreciation Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
        <div>
          <p className="font-bold text-slate-800 text-sm">{config.thankYouMessage || t.thankYou}</p>
          <p className="text-[11px] text-slate-500">{t.visitAgain}</p>
        </div>
        <div className="flex flex-col items-center">
          {config.signatureImage ? (
            <img
              src={config.signatureImage}
              alt="Signature"
              className="h-12 max-w-[150px] object-contain mb-1 mix-blend-multiply"
            />
          ) : (
            <div className="font-serif italic text-lg text-slate-800 tracking-wide select-none transform -rotate-2 opacity-95 my-1">
              {config.signatoryName || 'Sumona Mondal Kunti'}
            </div>
          )}
          <div className="w-36 border-b border-slate-400 mb-1"></div>
          <span className="text-xs font-bold text-slate-900 block leading-tight">
            {config.signatoryName || 'Sumona Mondal Kunti'}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">{t.authorizedSign}</span>
        </div>
      </div>
    </div>
  );
};
