import React, { useState } from 'react';
import { ShopConfig, PrinterDevice, PrinterType, ThermalWidth, ReceiptFormat } from '../types';
import { saveShopConfig } from '../utils/storage';
import { ALL_POPULAR_PRINTER_MODELS, DEFAULT_PRINTER_DEVICES } from '../data/defaultProducts';
import {
  pairBluetoothPrinter,
  pairUsbPrinter,
  buildEscPosTestPage,
  printViaBluetoothEscpos,
  printViaNetworkEscpos,
  triggerCashDrawer,
  isBluetoothSupported,
  isUsbSupported,
  addAllPrintersToFleet
} from '../services/printerService';
import {
  X,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  Wifi,
  Bluetooth,
  Usb,
  Laptop,
  FileText,
  RotateCcw,
  Sparkles,
  Scissors,
  DollarSign,
  Copy,
  Receipt,
  ChefHat,
  AlertCircle,
  Check,
  Star,
  Search,
  Layers,
  Smartphone,
  Info
} from 'lucide-react';

interface PrinterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShopConfig;
  onConfigUpdate: (newConfig: ShopConfig) => void;
  lang: 'bn' | 'en';
}

export const PrinterManagerModal: React.FC<PrinterManagerModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdate,
  lang
}) => {
  const devices: PrinterDevice[] = config.printerDevices || [];
  const activePrinterId = config.activePrinterId || devices.find((d) => d.isDefault)?.id || devices[0]?.id || 'printer-system';

  const [isAddingPrinter, setIsAddingPrinter] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<PrinterDevice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTestingId, setIsTestingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'configured' | 'catalog'>('configured');
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // New Printer Form State
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<PrinterType>('system');
  const [formWidth, setFormWidth] = useState<ThermalWidth>('80mm');
  const [formIp, setFormIp] = useState<string>('192.168.1.200');
  const [formPort, setFormPort] = useState<number>(9100);
  const [formRole, setFormRole] = useState<'cashier' | 'kitchen' | 'counter' | 'office'>('cashier');
  const [formAutoCut, setFormAutoCut] = useState<boolean>(true);
  const [formDrawer, setFormDrawer] = useState<boolean>(false);
  const [formCopies, setFormCopies] = useState<number>(1);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Set printer as default
  const handleSetDefault = (deviceId: string) => {
    const updatedDevices = devices.map((d) => ({
      ...d,
      isDefault: d.id === deviceId
    }));
    const updatedConfig: ShopConfig = {
      ...config,
      printerDevices: updatedDevices,
      activePrinterId: deviceId
    };
    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    showToast(lang === 'bn' ? 'ডিফল্ট প্রিন্টার সেট করা হয়েছে!' : 'Default printer updated!');
  };

  // Delete printer
  const handleDeleteDevice = (deviceId: string, deviceName: string) => {
    if (devices.length <= 1) {
      alert(lang === 'bn' ? 'কমপক্ষে একটি প্রিন্টার থাকতে হবে।' : 'At least one printer must remain.');
      return;
    }
    const updatedDevices = devices.filter((d) => d.id !== deviceId);
    const updatedConfig: ShopConfig = {
      ...config,
      printerDevices: updatedDevices,
      activePrinterId: activePrinterId === deviceId ? updatedDevices[0].id : activePrinterId
    };
    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    showToast(lang === 'bn' ? 'প্রিন্টার মুছে ফেলা হয়েছে।' : 'Printer removed.');
  };

  // 1-CLICK: Add ALL printers from standard models library
  const handleAddAllPrinters = () => {
    const beforeCount = devices.length;
    const updatedDevices = addAllPrintersToFleet(devices);
    const addedCount = updatedDevices.length - beforeCount;

    if (addedCount === 0) {
      showToast(lang === 'bn' ? 'সবগুলো স্ট্যান্ডার্ড প্রিন্টার ইতিমধ্যে যুক্ত আছে!' : 'All standard printers are already added!');
      return;
    }

    const updatedConfig: ShopConfig = {
      ...config,
      printerDevices: updatedDevices
    };
    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    showToast(
      lang === 'bn'
        ? `সফল! ${addedCount} টি নতুন প্রিন্টার যুক্ত হয়েছে (মোট ${updatedDevices.length} টি)।`
        : `Success! Added ${addedCount} new printers (Total: ${updatedDevices.length}).`
    );
  };

  // Add a specific printer from catalog
  const handleAddCatalogPrinter = (model: PrinterDevice) => {
    const exists = devices.some((d) => d.id === model.id || d.name.toLowerCase() === model.name.toLowerCase());
    if (exists) {
      showToast(lang === 'bn' ? 'এই প্রিন্টারটি ইতিমধ্যে যুক্ত আছে।' : 'This printer is already added in your list.');
      return;
    }

    const newDevice: PrinterDevice = {
      ...model,
      id: `printer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isDefault: devices.length === 0
    };

    const updatedDevices = [...devices, newDevice];
    const updatedConfig: ShopConfig = {
      ...config,
      printerDevices: updatedDevices,
      activePrinterId: devices.length === 0 ? newDevice.id : activePrinterId
    };
    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    showToast(lang === 'bn' ? `"${model.name}" যুক্ত হয়েছে!` : `"${model.name}" added to printer fleet!`);
  };

  // Add all printers in a category
  const handleAddCategoryPrinters = (categoryKey: string) => {
    const categoryModels = ALL_POPULAR_PRINTER_MODELS.filter((m) =>
      categoryKey === 'all' ? true : m.category === categoryKey
    );

    const existingNames = new Set(devices.map((d) => d.name.toLowerCase().trim()));
    const existingIds = new Set(devices.map((d) => d.id));

    const toAdd: PrinterDevice[] = [];
    for (const m of categoryModels) {
      if (!existingNames.has(m.name.toLowerCase().trim()) && !existingIds.has(m.id)) {
        toAdd.push({
          ...m,
          id: `printer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          isDefault: false
        });
      }
    }

    if (toAdd.length === 0) {
      showToast(lang === 'bn' ? 'এই ক্যাটাগরির সব প্রিন্টার ইতিমধ্যে যুক্ত আছে।' : 'All printers in this category are already added.');
      return;
    }

    const updatedDevices = [...devices, ...toAdd];
    const updatedConfig: ShopConfig = {
      ...config,
      printerDevices: updatedDevices
    };
    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    showToast(lang === 'bn' ? `${toAdd.length} টি প্রিন্টার যুক্ত হয়েছে!` : `Added ${toAdd.length} printers from this category!`);
  };

  // Reset to full default printer fleet
  const handleResetToAllDefaults = () => {
    if (!window.confirm(lang === 'bn' ? 'সবগুলো স্ট্যান্ডার্ড ডিফল্ট প্রিন্টার রিস্টোর করতে চান?' : 'Restore complete standard fleet of printers?')) {
      return;
    }
    const updatedConfig: ShopConfig = {
      ...config,
      printerDevices: DEFAULT_PRINTER_DEVICES,
      activePrinterId: DEFAULT_PRINTER_DEVICES[0].id
    };
    saveShopConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    showToast(lang === 'bn' ? 'ডিফল্ট প্রিন্টারসমূহ রিস্টোর করা হয়েছে!' : 'Standard printer fleet restored!');
  };

  // Test Print
  const handleTestPrint = async (device: PrinterDevice) => {
    setIsTestingId(device.id);
    const paperWidth = device.paperWidth === '58mm' ? '58mm' : '80mm';
    const testData = buildEscPosTestPage(device.name, paperWidth);

    try {
      if (device.type === 'bluetooth') {
        const res = await printViaBluetoothEscpos(testData);
        if (res.success) {
          showToast(`Test slip printed on Bluetooth (${device.name})!`);
        } else {
          window.print();
          showToast(`Bluetooth offline (${res.error}). Switched to system print preview.`);
        }
      } else if (device.type === 'network' && device.ipAddress) {
        const res = await printViaNetworkEscpos(device.ipAddress, device.port || 9100, testData);
        if (res.success) {
          showToast(`Test slip sent to Network IP (${device.ipAddress})!`);
        } else {
          window.print();
          showToast(`Network IP response: ${res.error}. Opening system dialog.`);
        }
      } else {
        window.print();
        showToast(`System Print preview opened for ${device.name}!`);
      }
    } catch (err: any) {
      alert(`Test Print notice: ${err?.message || 'Print error'}`);
    } finally {
      setIsTestingId(null);
    }
  };

  const handleKickDrawer = async (device: PrinterDevice) => {
    await triggerCashDrawer(device);
    showToast(lang === 'bn' ? 'ক্যাশ ড্রয়ার কিক কমান্ড পাঠানো হয়েছে!' : 'Cash drawer kick impulse sent!');
  };

  // Web Bluetooth Scan & Add
  const handleScanBluetooth = async () => {
    try {
      const paired = await pairBluetoothPrinter();
      if (!paired) return;

      const newId = `printer-bt-${Date.now()}`;
      const newDevice: PrinterDevice = {
        id: newId,
        name: paired.name || 'Bluetooth Thermal POS Printer',
        brand: 'Wireless Bluetooth',
        type: 'bluetooth',
        paperWidth: '58mm',
        bluetoothDeviceId: paired.deviceId,
        bluetoothDeviceName: paired.name,
        role: 'counter',
        isDefault: true,
        autoCut: false,
        openCashDrawer: false,
        printCopies: 1,
        status: 'paired',
        category: 'bt58'
      };

      const updatedDevices = [...devices.map((d) => ({ ...d, isDefault: false })), newDevice];
      const updatedConfig: ShopConfig = {
        ...config,
        printerDevices: updatedDevices,
        activePrinterId: newId
      };
      saveShopConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
      showToast(`Bluetooth Printer "${newDevice.name}" paired and set as default!`);
    } catch (err: any) {
      alert(`Bluetooth pairing notice: ${err?.message}`);
    }
  };

  // WebUSB Scan & Add
  const handleScanUsb = async () => {
    try {
      const paired = await pairUsbPrinter();
      if (!paired) return;

      const newId = `printer-usb-${Date.now()}`;
      const newDevice: PrinterDevice = {
        id: newId,
        name: paired.name || 'USB Thermal POS Printer',
        brand: 'USB Direct POS',
        type: 'usb',
        paperWidth: '80mm',
        role: 'cashier',
        isDefault: true,
        autoCut: true,
        openCashDrawer: true,
        printCopies: 1,
        status: 'paired',
        category: 'pos80'
      };

      const updatedDevices = [...devices.map((d) => ({ ...d, isDefault: false })), newDevice];
      const updatedConfig: ShopConfig = {
        ...config,
        printerDevices: updatedDevices,
        activePrinterId: newId
      };
      saveShopConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
      showToast(`USB Printer "${newDevice.name}" added and set as default!`);
    } catch (err: any) {
      alert(`USB pairing notice: ${err?.message}`);
    }
  };

  // Save Manual / Custom Printer Form
  const handleSavePrinterForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter a printer name');
      return;
    }

    if (editingDevice) {
      // Update existing
      const updatedDevices = devices.map((d) => {
        if (d.id === editingDevice.id) {
          return {
            ...d,
            name: formName.trim(),
            type: formType,
            paperWidth: formWidth,
            ipAddress: formType === 'network' ? formIp.trim() : undefined,
            port: formType === 'network' ? formPort : undefined,
            role: formRole,
            autoCut: formAutoCut,
            openCashDrawer: formDrawer,
            printCopies: formCopies
          };
        }
        return d;
      });

      const updatedConfig: ShopConfig = {
        ...config,
        printerDevices: updatedDevices
      };
      saveShopConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
      setEditingDevice(null);
      setIsAddingPrinter(false);
      showToast('Printer updated successfully!');
    } else {
      // Add new
      const newId = `printer-${Date.now()}`;
      const newDevice: PrinterDevice = {
        id: newId,
        name: formName.trim(),
        brand: formType === 'network' ? 'Network LAN' : formType === 'bluetooth' ? 'Bluetooth' : 'POS Spooler',
        type: formType,
        paperWidth: formWidth,
        ipAddress: formType === 'network' ? formIp.trim() : undefined,
        port: formType === 'network' ? formPort : undefined,
        role: formRole,
        isDefault: devices.length === 0,
        autoCut: formAutoCut,
        openCashDrawer: formDrawer,
        printCopies: formCopies,
        status: 'ready'
      };

      const updatedDevices = [...devices, newDevice];
      const updatedConfig: ShopConfig = {
        ...config,
        printerDevices: updatedDevices,
        activePrinterId: devices.length === 0 ? newId : activePrinterId
      };
      saveShopConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
      setIsAddingPrinter(false);
      showToast(`Added printer: ${newDevice.name}`);
    }
  };

  const startEditDevice = (device: PrinterDevice) => {
    setEditingDevice(device);
    setFormName(device.name);
    setFormType(device.type);
    setFormWidth(device.paperWidth);
    setFormIp(device.ipAddress || '192.168.1.200');
    setFormPort(device.port || 9100);
    setFormRole(device.role || 'cashier');
    setFormAutoCut(device.autoCut !== false);
    setFormDrawer(Boolean(device.openCashDrawer));
    setFormCopies(device.printCopies || 1);
    setIsAddingPrinter(true);
    setActiveTab('configured');
  };

  // Filter Catalog
  const filteredCatalog = ALL_POPULAR_PRINTER_MODELS.filter((model) => {
    const matchesCategory = catalogCategory === 'all' || model.category === catalogCategory;
    const matchesSearch =
      !catalogSearch ||
      model.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (model.brand && model.brand.toLowerCase().includes(catalogSearch.toLowerCase())) ||
      (model.description && model.description.toLowerCase().includes(catalogSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categoriesList = [
    { id: 'all', label: lang === 'bn' ? 'সকল ব্র্যান্ড ও মডেল' : 'All Models', icon: Layers },
    { id: 'pos80', label: lang === 'bn' ? '80mm থার্মাল POS' : '80mm POS Thermal', icon: Receipt },
    { id: 'bt58', label: lang === 'bn' ? '58mm মোবাইল ব্লুটুথ' : '58mm Bluetooth', icon: Bluetooth },
    { id: 'kot', label: lang === 'bn' ? 'কিচেন KOT নেটওয়ার্ক' : 'Kitchen KOT LAN', icon: ChefHat },
    { id: 'laser', label: lang === 'bn' ? 'A4/A5 লেজার প্রিন্টার' : 'A4/A5 Laser & Sheet', icon: FileText },
    { id: 'smart_pos', label: lang === 'bn' ? 'স্মার্ট অ্যান্ড্রয়েড POS' : 'Smart Android POS', icon: Smartphone }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[94vh] overflow-y-auto p-5 sm:p-6 border border-slate-200 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <span>{lang === 'bn' ? 'সকল প্রিন্টার ও হার্ডওয়্যার হাব (All Printers & POS Hub)' : 'All Printers & POS Hardware Fleet'}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                  {devices.length} Configured
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'bn'
                  ? 'Epson, TVS, Bluetooth 58mm/80mm, KOT Network IP, A4/A5 Laser এবং সব ধরণের থার্মাল প্রিন্টার যুক্ত ও পরিচালনা করুন'
                  : 'Manage Epson, TVS, Bluetooth 58mm/80mm, Kitchen KOT Network IP, A4/A5 Laser & Virtual Printers'}
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

        {/* Toast Notice */}
        {toastMessage && (
          <div className="my-3 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* TOP HERO BANNER: "+ ADD ALL PRINTERS" ONE-CLICK BUTTON */}
        <div className="my-3 p-3.5 sm:p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="font-extrabold text-sm sm:text-base text-white">
                {lang === 'bn' ? 'সকল স্ট্যান্ডার্ড প্রিন্টার একসাথে যোগ করুন (Add All Printers)' : 'Instant Fleet Setup: Add All Printers'}
              </span>
            </div>
            <p className="text-xs text-emerald-100 max-w-xl">
              {lang === 'bn'
                ? 'এক ক্লিকে Epson TM-T82, TVS Star, Mini Bluetooth, Kitchen KOT LAN, HP Laser এবং সমস্ত প্রিন্টার প্রোফাইল একসাথে যুক্ত করুন।'
                : '1-Click adds complete catalog (Epson TM-T82, TVS RP 3200, Mini Bluetooth POS-58, Kitchen KOT IP, HP Laser & PDF saver).'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddAllPrinters}
              className="py-2 px-4 bg-white hover:bg-amber-100 text-slate-900 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'bn' ? '+ সব প্রিন্টার যোগ করুন (Add All)' : '+ Add All Printers'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetToAllDefaults}
              className="py-2 px-3 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              title="Reset fleet to standard defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'রিস্টোর ডিফল্ট' : 'Reset Fleet'}</span>
            </button>
          </div>
        </div>

        {/* View Tabs: Configured Printers vs Brand Catalog */}
        <div className="flex items-center justify-between border-b border-slate-200 mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('configured')}
              className={`py-2 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'configured'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'bn' ? 'কনফিগার করা প্রিন্টারসমূহ' : 'My Configured Printers'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                {devices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`py-2 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'catalog'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{lang === 'bn' ? 'প্রিন্টার ক্যাটালগ ও ব্র্যান্ড লাইব্রেরি' : 'Printer Catalog & Brand Presets'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px]">
                {ALL_POPULAR_PRINTER_MODELS.length} Models
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 pb-2">
            {/* Scan Bluetooth */}
            <button
              type="button"
              onClick={handleScanBluetooth}
              className="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              title="Pair Web Bluetooth POS Printer"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'Bluetooth পেয়ার' : 'Pair BT'}</span>
            </button>

            {/* Scan USB */}
            <button
              type="button"
              onClick={handleScanUsb}
              className="py-1 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              title="Connect WebUSB POS Printer"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'USB কানেক্ট' : 'USB Direct'}</span>
            </button>

            {/* Custom Printer Form Toggle */}
            <button
              type="button"
              onClick={() => {
                setEditingDevice(null);
                setFormName('');
                setFormType('system');
                setFormWidth('80mm');
                setIsAddingPrinter(!isAddingPrinter);
              }}
              className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingPrinter ? 'Close Form' : (lang === 'bn' ? '+ কাস্টম ফর্ম' : '+ Custom Form')}</span>
            </button>
          </div>
        </div>

        {/* Add / Edit Printer Drawer Form */}
        {isAddingPrinter && (
          <form
            onSubmit={handleSavePrinterForm}
            className="mb-5 p-4 bg-slate-50 border border-slate-300 rounded-2xl space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#4b1d3f]" />
                <span>{editingDevice ? 'Edit Printer Device' : 'Add Custom Printer Device'}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAddingPrinter(false);
                  setEditingDevice(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Printer Name (প্রিন্টারের নাম):
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Counter 1 Epson TM-T82"
                  required
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Connection Type (কানেকশন):
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as PrinterType)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="system">System Default Spooler (Epson, TVS, HP, Canon)</option>
                  <option value="bluetooth">Bluetooth Thermal POS (POS-58, PT-210, MPT-II)</option>
                  <option value="usb">USB Direct Thermal (WebUSB ESC/POS)</option>
                  <option value="network">Network IP / Ethernet LAN (Port 9100)</option>
                  <option value="pdf">Virtual PDF Invoice Saver</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Paper Format (রোল / সাইজ):
                </label>
                <select
                  value={formWidth}
                  onChange={(e) => setFormWidth(e.target.value as ThermalWidth)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="80mm">80mm (3-inch Standard POS Thermal)</option>
                  <option value="58mm">58mm (2-inch Mini Mobile Bluetooth Roll)</option>
                  <option value="kot">KOT (Kitchen Order Ticket / Baker Slip)</option>
                  <option value="a4">A4 Full Page Detailed Tax Invoice</option>
                  <option value="a5">A5 Half Page Retail Slip</option>
                </select>
              </div>

              {formType === 'network' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Printer IP Address (ল্যান আইপি):
                    </label>
                    <input
                      type="text"
                      value={formIp}
                      onChange={(e) => setFormIp(e.target.value)}
                      placeholder="192.168.1.200"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Port (ডিফল্ট: 9100):
                    </label>
                    <input
                      type="number"
                      value={formPort}
                      onChange={(e) => setFormPort(Number(e.target.value) || 9100)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Assigned Station / Role:
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                >
                  <option value="cashier">Cashier / Billing Counter</option>
                  <option value="kitchen">Kitchen / Bakery Workshop (KOT)</option>
                  <option value="counter">Counter 2 (Takeaway / Snacks)</option>
                  <option value="office">Office / Accounts Duplicate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Print Copies:
                </label>
                <select
                  value={formCopies}
                  onChange={(e) => setFormCopies(Number(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                >
                  <option value={1}>1 Copy (Customer Receipt)</option>
                  <option value={2}>2 Copies (Customer + Shop Duplicate)</option>
                  <option value={3}>3 Copies (+ Kitchen Ticket)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={formAutoCut}
                  onChange={(e) => setFormAutoCut(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Auto-cut Paper (অটোকাপ্ট)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={formDrawer}
                  onChange={(e) => setFormDrawer(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Kick Open Cash Drawer (ক্যাশ ড্রয়ার খুলুন)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="py-1.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {editingDevice ? 'Update Printer' : 'Save Printer'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 1: CONFIGURATED PRINTERS */}
        {activeTab === 'configured' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>Configured Printers in Bakery ({devices.length}):</span>
                <span className="text-[11px] text-slate-500">
                  Active Default: <b className="text-emerald-700">{devices.find((d) => d.id === activePrinterId)?.name || 'None'}</b>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? '+ ক্যাটালগ থেকে আরও যোগ করুন' : '+ Browse More Models'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {devices.map((device) => {
                const isActive = device.id === activePrinterId || device.isDefault;
                return (
                  <div
                    key={device.id}
                    className={`p-4 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                      isActive
                        ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Top Row: Type Badge + Default Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 rounded-lg bg-slate-100 text-slate-700">
                            {device.type === 'bluetooth' ? (
                              <Bluetooth className="w-3.5 h-3.5 text-blue-600" />
                            ) : device.type === 'usb' ? (
                              <Usb className="w-3.5 h-3.5 text-purple-600" />
                            ) : device.type === 'network' ? (
                              <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                            ) : device.type === 'pdf' ? (
                              <FileText className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Laptop className="w-3.5 h-3.5 text-slate-700" />
                            )}
                          </span>
                          <span className="font-mono text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                            {device.type}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 uppercase">
                            {device.paperWidth}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {isActive ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                              <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                              <span>Default</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(device.id)}
                              className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 hover:underline px-1.5 py-0.5"
                            >
                              Set Default
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Printer Name */}
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{device.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Brand: <b className="text-slate-700">{device.brand || 'Standard POS'}</b> • Role: <b className="text-slate-700 capitalize">{device.role || 'Cashier'}</b>
                        </p>
                        {device.description && (
                          <p className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-1 italic">
                            {device.description}
                          </p>
                        )}
                        {device.ipAddress && (
                          <p className="text-[10px] font-mono text-indigo-700 mt-0.5">
                            IP: {device.ipAddress}:{device.port || 9100}
                          </p>
                        )}
                      </div>

                      {/* Hardware Capabilities Pills */}
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-600 flex-wrap">
                        {device.autoCut !== false && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100">
                            <Scissors className="w-3 h-3 text-slate-500" />
                            Auto-Cut
                          </span>
                        )}
                        {device.openCashDrawer && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100">
                            <DollarSign className="w-3 h-3 text-emerald-600" />
                            Drawer Kick
                          </span>
                        )}
                        {device.printCopies && device.printCopies > 1 && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100">
                            <Copy className="w-3 h-3 text-slate-500" />
                            {device.printCopies} Copies
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {/* Test Print */}
                        <button
                          type="button"
                          onClick={() => handleTestPrint(device)}
                          disabled={isTestingId === device.id}
                          className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                          title="Send diagnostic test slip"
                        >
                          <Printer className="w-3 h-3 text-[#4b1d3f]" />
                          <span>{isTestingId === device.id ? 'Testing...' : 'Test Print'}</span>
                        </button>

                        {/* Cash Drawer Test */}
                        {device.openCashDrawer && (
                          <button
                            type="button"
                            onClick={() => handleKickDrawer(device)}
                            className="py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Test open cash drawer"
                          >
                            <DollarSign className="w-3 h-3 text-emerald-600" />
                            <span>Kick Drawer</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditDevice(device)}
                          className="py-1 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDevice(device.id, device.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete printer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PRINTER CATALOG & BRAND PRESETS LIBRARY */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Catalog Search & Category Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search Epson, TVS, Bluetooth, KOT, Star, Rugtek..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddCategoryPrinters(catalogCategory)}
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? '+ এই ক্যাটাগরির সব যোগ করুন' : '+ Add All in Category'}</span>
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categoriesList.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = catalogCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCatalogCategory(cat.id)}
                    className={`py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'bg-indigo-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCatalog.map((model) => {
                const isAlreadyAdded = devices.some(
                  (d) => d.id === model.id || d.name.toLowerCase().trim() === model.name.toLowerCase().trim()
                );
                return (
                  <div
                    key={model.id}
                    className={`p-3.5 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                      isAlreadyAdded
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                            {model.type}
                          </span>
                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 uppercase">
                            {model.paperWidth}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            • {model.role} role
                          </span>
                        </div>

                        {isAlreadyAdded ? (
                          <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-extrabold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </span>
                        ) : null}
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">
                        {model.name}
                      </h4>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {model.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">
                        Brand: {model.brand}
                      </span>

                      {isAlreadyAdded ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('configured');
                            handleSetDefault(model.id);
                          }}
                          className="py-1 px-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          <span>Set as Default</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddCatalogPrinter(model)}
                          className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Add to Fleet</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Printing Preferences */}
        <div className="mt-5 pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-2xl space-y-3 text-xs">
          <span className="font-extrabold text-slate-900 block">
            {lang === 'bn' ? 'গ্লোবাল প্রিন্টিং অপশন ও সেটিংস (Global POS Printing Preferences):' : 'Global POS Printing Preferences:'}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Default Receipt Format:
              </label>
              <select
                value={config.receiptFormat || 'thermal'}
                onChange={(e) => {
                  const updated: ShopConfig = {
                    ...config,
                    receiptFormat: e.target.value as any
                  };
                  saveShopConfig(updated);
                  onConfigUpdate(updated);
                  showToast('Default receipt format updated!');
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
              >
                <option value="thermal">80mm (3") Standard POS Thermal</option>
                <option value="thermal58">58mm (2") Mini Bluetooth Mobile Roll</option>
                <option value="standard">Standard A4 Full Page Tax Invoice</option>
                <option value="standardA5">Standard A5 Half Page Retail Slip</option>
                <option value="kot">KOT (Kitchen Order Ticket / Baker Slip)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Auto-Print on Bill Save:
              </label>
              <select
                value={config.printer?.autoPrintOnSave ? 'yes' : 'no'}
                onChange={(e) => {
                  const isAuto = e.target.value === 'yes';
                  const updated: ShopConfig = {
                    ...config,
                    printer: {
                      ...(config.printer || { type: 'system', paperWidth: '80mm' }),
                      autoPrintOnSave: isAuto
                    }
                  };
                  saveShopConfig(updated);
                  onConfigUpdate(updated);
                  showToast(isAuto ? 'Auto-print on save ENABLED!' : 'Auto-print on save DISABLED.');
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
              >
                <option value="no">Manual Print Only (ম্যানুয়াল প্রিন্ট)</option>
                <option value="yes">Auto-Print on Save (বিল সেভ হলেই প্রিন্ট)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Kitchen Ticket (KOT) Auto-Trigger:
              </label>
              <select
                value={config.printer?.printKitchenTicket ? 'yes' : 'no'}
                onChange={(e) => {
                  const isKot = e.target.value === 'yes';
                  const updated: ShopConfig = {
                    ...config,
                    printer: {
                      ...(config.printer || { type: 'system', paperWidth: '80mm' }),
                      printKitchenTicket: isKot
                    }
                  };
                  saveShopConfig(updated);
                  onConfigUpdate(updated);
                  showToast(isKot ? 'KOT Kitchen Printing active!' : 'KOT Kitchen Printing disabled.');
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
              >
                <option value="yes">Enabled (বেকারি শেফের জন্য KOT সক্রিয়)</option>
                <option value="no">Disabled (বন্ধ)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>{devices.length} printers currently configured for Delicious Cake Corner.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-6 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
          >
            Done / সম্পন্ন
          </button>
        </div>
      </div>
    </div>
  );
};
