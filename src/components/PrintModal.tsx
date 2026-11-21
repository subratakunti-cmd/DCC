import React, { useState, useEffect } from 'react';
import { Bill, ShopConfig, Language, ReceiptFormat, PrinterDevice } from '../types';
import { PrintBillView } from './PrintBillView';
import {
  executePrint,
  executePrintToAllPrinters,
  openStandalonePrintTab,
  downloadReceiptHtml,
  generatePlainTextBill,
  applyDynamicPageSizeCss
} from '../services/printerService';
import {
  X,
  Printer,
  Receipt,
  FileText,
  ChefHat,
  Layers,
  Settings2,
  CheckCircle2,
  Bluetooth,
  Wifi,
  Usb,
  Copy,
  ExternalLink,
  Download,
  ClipboardCopy
} from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  config: ShopConfig;
  lang: Language;
  initialFormat?: ReceiptFormat;
  onFormatChange?: (format: ReceiptFormat) => void;
  onOpenPrinterManager?: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  bill,
  config,
  lang,
  initialFormat,
  onFormatChange,
  onOpenPrinterManager
}) => {
  const devices: PrinterDevice[] = config.printerDevices || [];
  const defaultDevice = devices.find((d) => d.id === config.activePrinterId) || devices[0];

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(
    defaultDevice?.id || 'printer-system'
  );

  const selectedDevice = devices.find((d) => d.id === selectedPrinterId) || defaultDevice;

  // Determine initial format from device or override
  const getFormatForDevice = (device?: PrinterDevice): ReceiptFormat => {
    if (initialFormat) return initialFormat;
    if (device?.paperWidth === '58mm') return 'thermal58';
    if (device?.paperWidth === 'kot') return 'kot';
    if (device?.paperWidth === 'a4') return 'standard';
    if (device?.paperWidth === 'a5') return 'standardA5';
    return config.receiptFormat || 'thermal';
  };

  const [format, setFormat] = useState<ReceiptFormat>(
    getFormatForDevice(selectedDevice)
  );
  const [copies, setCopies] = useState<number>(selectedDevice?.printCopies || 1);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const updateFormat = (nextFormat: ReceiptFormat) => {
    setFormat(nextFormat);
    applyDynamicPageSizeCss(nextFormat);
    if (onFormatChange) {
      onFormatChange(nextFormat);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const nextFmt = initialFormat || getFormatForDevice(selectedDevice);
      setFormat(nextFmt);
      applyDynamicPageSizeCss(nextFmt);
      if (onFormatChange && nextFmt !== initialFormat) {
        onFormatChange(nextFmt);
      }
    }
  }, [isOpen, initialFormat, bill.id]);

  if (!isOpen) return null;

  const handleDeviceChange = (deviceId: string) => {
    setSelectedPrinterId(deviceId);
    const dev = devices.find((d) => d.id === deviceId);
    if (dev) {
      let nextFmt: ReceiptFormat = 'thermal';
      if (dev.paperWidth === '58mm') nextFmt = 'thermal58';
      else if (dev.paperWidth === 'kot') nextFmt = 'kot';
      else if (dev.paperWidth === 'a4') nextFmt = 'standard';
      else if (dev.paperWidth === 'a5') nextFmt = 'standardA5';
      updateFormat(nextFmt);
      if (dev.printCopies) setCopies(dev.printCopies);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setStatusMessage(null);
    try {
      applyDynamicPageSizeCss(format);
      if (onFormatChange) {
        onFormatChange(format);
      }
      const res = await executePrint(bill, config, selectedDevice, format, copies);
      setStatusMessage(res.message);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage(`Print execution error: ${err?.message || err}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenStandaloneTab = () => {
    try {
      openStandalonePrintTab(bill, config, format);
      setStatusMessage(lang === 'bn' ? 'নতুন ট্যাবে ক্লিন প্রিন্ট উইন্ডো খোলা হয়েছে।' : 'Clean print page opened in new tab.');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: any) {
      setStatusMessage(`Print window error: ${e?.message || e}`);
    }
  };

  const handleDownloadHtml = () => {
    try {
      downloadReceiptHtml(bill, config, format);
      setStatusMessage(lang === 'bn' ? 'বিল ফাইল সফলভাবে ডাউনলোড হয়েছে।' : 'Invoice file downloaded successfully.');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: any) {
      setStatusMessage(`Download error: ${e?.message || e}`);
    }
  };

  const handleCopyTextReceipt = () => {
    try {
      const text = generatePlainTextBill(bill, config);
      navigator.clipboard.writeText(text);
      setStatusMessage(lang === 'bn' ? 'রসিদের টেক্সট কপি হয়েছে! (WhatsApp বা ব্লুটুথ প্রিন্টারে পেস্ট করতে পারেন)' : 'Receipt text copied to clipboard!');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch {
      setStatusMessage('Clipboard copy failed.');
    }
  };

  const handlePrintAllPrinters = async () => {
    setIsPrinting(true);
    setStatusMessage(null);
    try {
      const res = await executePrintToAllPrinters(bill, config, copies, format);
      setStatusMessage(
        lang === 'bn'
          ? `সকল প্রিন্টারে প্রিন্ট কমান্ড পাঠানো হয়েছে (${res.details.length} টি)।`
          : `Dispatched to all printers (${res.details.length} actions completed)!`
      );
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      setStatusMessage(`Broadcast print error: ${err?.message || err}`);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-sm sm:text-base block leading-tight">
                  {lang === 'bn' ? `প্রিন্ট প্রিভিউ - বিল #${bill.billNo}` : `Print Preview & Hardware Dispatch - #${bill.billNo}`}
                </span>
                <span className="text-[11px] text-slate-500">
                  Total: <b>₹{bill.grandTotal}</b> • Customer: <b>{bill.customerName || 'Walking Customer'}</b>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenPrinterManager && (
                <button
                  type="button"
                  onClick={onOpenPrinterManager}
                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  title="Configure & Add All Printers"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === 'bn' ? 'সব প্রিন্টার' : 'All Printers'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printer Selection & Format Controls Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 text-xs">
            {/* Target Printer Dropdown */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-500">Target Printer:</span>
                <select
                  value={selectedPrinterId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="bg-transparent font-extrabold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.paperWidth})
                    </option>
                  ))}
                </select>
                {selectedDevice?.type === 'bluetooth' ? (
                  <Bluetooth className="w-3 h-3 text-blue-600 shrink-0" />
                ) : selectedDevice?.type === 'network' ? (
                  <Wifi className="w-3 h-3 text-indigo-600 shrink-0" />
                ) : selectedDevice?.type === 'usb' ? (
                  <Usb className="w-3 h-3 text-purple-600 shrink-0" />
                ) : (
                  <Printer className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </div>

              {/* Format Switcher Pills */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => updateFormat('thermal')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    format === 'thermal'
                      ? 'bg-white text-[#4b1d3f] shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3 h-3" />
                  <span>80mm Thermal</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormat('thermal58')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    format === 'thermal58'
                      ? 'bg-white text-[#4b1d3f] shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>58mm Roll</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormat('kot')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    format === 'kot'
                      ? 'bg-white text-[#4b1d3f] shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ChefHat className="w-3 h-3" />
                  <span>KOT Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormat('standardA5')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    format === 'standardA5'
                      ? 'bg-white text-[#4b1d3f] shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>A5 Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormat('standard')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    format === 'standard'
                      ? 'bg-[#4b1d3f] text-amber-300 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>A4 Page Invoice</span>
                </button>
              </div>

              {/* Copies */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <Copy className="w-3 h-3 text-slate-400" />
                <select
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value) || 1)}
                  className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none"
                >
                  <option value={1}>1 copy</option>
                  <option value={2}>2 copies</option>
                  <option value={3}>3 copies</option>
                </select>
              </div>
            </div>

            {/* Action Buttons Hub */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Standalone Tab Print (Bypasses iframe/A4 restrictions cleanly) */}
              <button
                type="button"
                onClick={handleOpenStandaloneTab}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="নতুন ট্যাবে সম্পূর্ণ প্রিন্ট ও PDF উইন্ডো খুলুন"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'bn' ? 'নতুন ট্যাবে প্রিন্ট' : 'Open Print Tab'}</span>
              </button>

              {/* Download Invoice / Receipt file */}
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-colors"
                title="বিল অফলাইন ফাইল হিসেবে ডাউনলোড করুন (যে কোনো ব্রাউজার বা ফোনে প্রিন্ট করুন)"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>{lang === 'bn' ? 'রসিদ ফাইল' : 'Download'}</span>
              </button>

              {/* Copy Plaintext Receipt for WhatsApp / Bluetooth */}
              <button
                type="button"
                onClick={handleCopyTextReceipt}
                className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors"
                title="রসিদের টেক্সট কপি করুন"
              >
                <ClipboardCopy className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">{lang === 'bn' ? 'কপি' : 'Copy'}</span>
              </button>

              {/* Broadcast to all printers */}
              <button
                type="button"
                onClick={handlePrintAllPrinters}
                disabled={isPrinting}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
                title="Print receipt on Cashier + KOT slip on Kitchen printer simultaneously"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden lg:inline">{lang === 'bn' ? 'সব প্রিন্টারে' : 'All Printers'}</span>
              </button>

              {/* Primary Direct Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-colors shrink-0 ring-2 ring-emerald-400/40"
                title="ডাইরেক্ট প্রিন্টার কমান্ড পাঠান"
              >
                <Printer className="w-4 h-4 text-emerald-100" />
                <span>{isPrinting ? 'প্রিন্ট হচ্ছে...' : (lang === 'bn' ? '🖨️ প্রিন্ট করুন' : 'Print Now')}</span>
              </button>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Body Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div id="print-modal-preview" className="w-full">
            <PrintBillView
              bill={bill}
              config={config}
              lang={lang}
              formatOverride={format}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
