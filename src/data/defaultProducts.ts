import { BakeryProduct, ShopConfig, Counter, SystemTerminal, LoyaltyTier, PrinterDevice, DistributorProfile } from '../types';
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_STAFF_ACCOUNTS, DEFAULT_ADMIN_PIN } from '../utils/permissionUtils';
import dccGoldBadgeLogo from '../assets/images/delicious_cake_corner_gold_badge.jpg';

export const DEFAULT_BAKERY_LOGO = dccGoldBadgeLogo;

export const DEFAULT_COUNTERS: Counter[] = [
  {
    id: 'counter-1',
    name: 'Counter 1 (Cakes & Pastries)',
    nameBn: 'কাউন্টার ১ (কেক ও পেস্ট্রি)',
    code: 'C1',
    cashierName: 'Sumona Mondal Kunti',
    isDefault: true
  },
  {
    id: 'counter-2',
    name: 'Counter 2 (Snacks & Cookies)',
    nameBn: 'কাউন্টার ২ (স্ন্যাক্স ও কুকিজ)',
    code: 'C2',
    cashierName: 'Subrata Kunti',
    isDefault: false
  },
  {
    id: 'counter-3',
    name: 'Counter 3 (Advance Booking)',
    nameBn: 'কাউন্টার ৩ (অ্যাডভান্স বুকিং)',
    code: 'C3',
    cashierName: 'Booking Desk',
    isDefault: false
  }
];

export const DEFAULT_DISTRIBUTORS: DistributorProfile[] = [
  {
    id: 'dist-1',
    name: 'Distributor 1 (Ghatal Central Route)',
    nameBn: 'ডিস্ট্রিবিউটর ১ (ঘাটাল সেন্ট্রাল রুট)',
    code: 'D1',
    driverName: 'Ramesh Ghosh',
    driverPhone: '9832104567',
    vehicleNumber: 'WB-34-AB-1234',
    zone: 'Ghatal Town, Kuspat & College Mor',
    pin: '9999',
    isDefault: true
  },
  {
    id: 'dist-2',
    name: 'Distributor 2 (Daspur & Mansuka Route)',
    nameBn: 'ডিস্ট্রিবিউটর ২ (দাসপুর ও মানসুকা রুট)',
    code: 'D2',
    driverName: 'Subrata Kunti',
    driverPhone: '7866971421',
    vehicleNumber: 'WB-34-CD-5678',
    zone: 'Mansuka, Balarampur & Daspur',
    pin: '9999',
    isDefault: false
  },
  {
    id: 'dist-3',
    name: 'Distributor 3 (Gharoighat & Outskirts)',
    nameBn: 'ডিস্ট্রিবিউটর ৩ (ঘাটঘাঁই ও মহকুমা এলাকা)',
    code: 'D3',
    driverName: 'Sujit Samanta',
    driverPhone: '9733456789',
    vehicleNumber: 'WB-34-EF-9012',
    zone: 'Gharoighat, Radhanagar & Bandar',
    pin: '9999',
    isDefault: false
  }
];

export const DEFAULT_SYSTEM_TERMINALS: SystemTerminal[] = [
  {
    id: 'system-1',
    name: 'System 1 (Front Counter - Cakes)',
    nameBn: 'সিস্টেম ১ (সামনের কেক কাউন্টার)',
    code: 'S1',
    role: 'counter',
    cashierName: 'Sumona Mondal Kunti',
    deviceInfo: 'Main Desktop POS / Primary Station',
    isCurrent: true
  },
  {
    id: 'system-2',
    name: 'System 2 (Pastry & Snack Station)',
    nameBn: 'সিস্টেম ২ (পেস্ট্রি ও স্ন্যাক্স কাউন্টার)',
    code: 'S2',
    role: 'counter',
    cashierName: 'Subrata Kunti',
    deviceInfo: 'Secondary Counter PC / Tablet Station'
  },
  {
    id: 'system-3',
    name: 'System 3 (Advance Booking Desk)',
    nameBn: 'সিস্টেম ৩ (অ্যাডভান্স বুকিং ডেস্ক)',
    code: 'S3',
    role: 'counter',
    cashierName: 'Booking Desk Staff',
    deviceInfo: 'Custom Celebration Orders Station'
  },
  {
    id: 'system-4',
    name: 'System 4 (Mobile Tablet / Take-Order)',
    nameBn: 'সিস্টেম ৪ (মোবাইল / হ্যান্ডহেল্ড ট্যাব)',
    code: 'S4',
    role: 'mobile',
    cashierName: 'Floor Attendant',
    deviceInfo: 'Handheld Android Tablet / Phone Terminal'
  },
  {
    id: 'system-5',
    name: 'System 5 (Kitchen Display / Workshop)',
    nameBn: 'সিস্টেম ৫ (বেকারি কিচেন ও ডেকোরেটর স্ক্রিন)',
    code: 'S5',
    role: 'kitchen',
    cashierName: 'Head Chef / Cake Decorator',
    deviceInfo: 'Bakery Workshop Order KDS Screen'
  }
];

export const DEFAULT_LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: 'bronze',
    name: 'Bronze Member',
    nameBn: 'ব্রোঞ্জ মেম্বার',
    minSpend: 0,
    discountPercent: 2,
    color: 'bg-amber-100 text-amber-900 border-amber-300',
    badge: '🥉',
    description: 'Welcome tier for registered patrons (2% Suggested Discount)',
    descriptionBn: 'নিবন্ধিত নিয়মিত গ্রাহকদের জন্য স্বাগত ২% প্রস্তাবিত ছাড়'
  },
  {
    id: 'silver',
    name: 'Silver Patron',
    nameBn: 'সিলভার পেট্রন',
    minSpend: 1500,
    discountPercent: 5,
    color: 'bg-slate-200 text-slate-800 border-slate-300',
    badge: '🥈',
    description: 'Lifetime spend ₹1,500+ (5% Suggested Discount on bills)',
    descriptionBn: 'মোট কেনাকাটা ₹১,৫০০+ (৫% আকর্ষণীয় ছাড়)'
  },
  {
    id: 'gold',
    name: 'Gold VIP',
    nameBn: 'গোল্ড ভিআইপি',
    minSpend: 5000,
    discountPercent: 10,
    color: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    badge: '🥇',
    description: 'Lifetime spend ₹5,000+ (10% Celebration Club Discount)',
    descriptionBn: 'মোট কেনাকাটা ₹৫,০০০+ (১০% বিশেষ ভিআইপি সেলিব্রেশন ছাড়)'
  },
  {
    id: 'platinum',
    name: 'Platinum Elite',
    nameBn: 'প্লাটিনাম এলিট',
    minSpend: 10000,
    discountPercent: 15,
    color: 'bg-purple-100 text-purple-900 border-purple-300',
    badge: '👑',
    description: 'Lifetime spend ₹10,000+ (15% Royal Patron Maximum Discount)',
    descriptionBn: 'মোট কেনাকাটা ₹১০,০০০+ (১৫% সর্বোচ্চ রয়্যাল এলিট ছাড়)'
  }
];

export const ALL_POPULAR_PRINTER_MODELS: PrinterDevice[] = [
  // 1. 80mm High Speed Thermal POS Printers (Standard 3-Inch Rolls)
  {
    id: 'printer-system',
    name: 'System Default Printer (Windows/Mac/Android Spooler)',
    brand: 'OS Universal Spooler',
    type: 'system',
    paperWidth: '80mm',
    isDefault: true,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: 'Universal OS driver for any connected USB/Network printer (Epson, TVS, HP, Canon, etc.)'
  },
  {
    id: 'printer-epson-80',
    name: 'Epson TM-T82 / TM-T82III POS Thermal (80mm USB/LAN)',
    brand: 'Epson POS',
    type: 'usb',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: 'High-speed 250mm/s POS thermal receipt printer with automatic paper cutter'
  },
  {
    id: 'printer-epson-m30',
    name: 'Epson TM-m30II Sleek Cube POS Thermal (80mm/58mm)',
    brand: 'Epson Cube POS',
    type: 'usb',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: 'Compact cubic design with front-exit paper feed for modern cake boutique counters'
  },
  {
    id: 'printer-tvs-3200',
    name: 'TVS RP 3200 Star / RP 3220 Star (80mm Desktop USB)',
    brand: 'TVS Electronics',
    type: 'usb',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: 'Rugged Indian confectionery retail favorite with high-torque auto-cutter & cash drawer port'
  },
  {
    id: 'printer-tvs-3160',
    name: 'TVS RP 3160 Gold Heavy-Duty Thermal (80mm)',
    brand: 'TVS Electronics',
    type: 'usb',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: 'Continuous heavy-duty duty cycle for festival rush orders and instant receipts'
  },
  {
    id: 'printer-rugtek-326',
    name: 'Rugtek RP 326 / RP 320 High-Speed POS Thermal (80mm)',
    brand: 'Rugtek',
    type: 'usb',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: '260mm/sec ultra-fast thermal receipt printing with USB, Serial & Ethernet LAN options'
  },
  {
    id: 'printer-bixolon-330',
    name: 'Bixolon SRP-330 / SRP-350 Plus (80mm POS Thermal)',
    brand: 'Bixolon',
    type: 'usb',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: 'Premium Korean thermal mechanism with sharp bakery logo and QR code printing'
  },
  {
    id: 'printer-star-143',
    name: 'Star Micronics TSP143 / TSP650 Thermal Printer',
    brand: 'Star Micronics',
    type: 'usb',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: 'Reliable thermal printing with energy-efficient auto-de-curl technology'
  },
  {
    id: 'printer-xprinter-80',
    name: 'Xprinter XP-N160M / XP-Q800 (80mm USB/LAN)',
    brand: 'Xprinter',
    type: 'usb',
    paperWidth: '80mm',
    isDefault: false,
    role: 'counter',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'pos80',
    description: 'Affordable high-performance 80mm thermal receipt printer with auto-cutter'
  },

  // 2. 58mm Mini Mobile Bluetooth & Handheld Roll Printers (2-Inch Rolls)
  {
    id: 'printer-bt-58',
    name: 'Mini Bluetooth POS-58 / PT-210 (58mm Mobile Roll)',
    brand: 'Wireless Bluetooth',
    type: 'bluetooth',
    paperWidth: '58mm',
    bluetoothDeviceName: 'POS-58-BT',
    isDefault: false,
    role: 'counter',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'bt58',
    description: 'Rechargeable wireless Bluetooth thermal printer for smartphone/tablet billing & delivery'
  },
  {
    id: 'printer-bt-80',
    name: 'Bluetooth POS-80 / RPP-02 Wireless Thermal (80mm Roll)',
    brand: 'Wireless Bluetooth 80mm',
    type: 'bluetooth',
    paperWidth: '80mm',
    bluetoothDeviceName: 'POS-80-BT',
    isDefault: false,
    role: 'counter',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'bt58',
    description: 'Full 80mm width mobile wireless printer for table service and outdoor event stalls'
  },
  {
    id: 'printer-ngx-58',
    name: 'NGX N-58 / N-80 Portable Handheld POS Printer',
    brand: 'NGX Technologies',
    type: 'bluetooth',
    paperWidth: '58mm',
    bluetoothDeviceName: 'NGX-N58',
    isDefault: false,
    role: 'counter',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'bt58',
    description: 'Handheld battery-operated mobile billing printer made for Indian retail operations'
  },
  {
    id: 'printer-goojprt-58',
    name: 'GOOJPRT PT-210 / MPT-II Pocket Thermal Printer',
    brand: 'GOOJPRT',
    type: 'bluetooth',
    paperWidth: '58mm',
    bluetoothDeviceName: 'MPT-II-58',
    isDefault: false,
    role: 'counter',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'bt58',
    description: 'Pocket-sized lightweight Bluetooth thermal receipt printer'
  },

  // 3. Smart Android POS Integrated Printers
  {
    id: 'printer-sunmi-v2',
    name: 'Sunmi V2 / V2 Pro / T2 Built-in Thermal POS Printer',
    brand: 'Sunmi POS',
    type: 'system',
    paperWidth: '58mm',
    isDefault: false,
    role: 'counter',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'smart_pos',
    description: 'Integrated Seiko high-speed thermal printer built into Sunmi Android POS handhelds'
  },
  {
    id: 'printer-imin-d4',
    name: 'iMin D4 / M2 Max Integrated Desktop POS Printer',
    brand: 'iMin Technology',
    type: 'system',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: true,
    openCashDrawer: true,
    printCopies: 1,
    status: 'ready',
    category: 'smart_pos',
    description: 'Built-in 250mm/s auto-cutter printer in iMin dual-screen touch POS terminals'
  },

  // 4. Kitchen Order Ticket (KOT) Dedicated Printers
  {
    id: 'printer-kot-lan',
    name: 'Kitchen / Bakery Order Ticket (KOT IP Network LAN 9100)',
    brand: 'Ethernet LAN 9100',
    type: 'network',
    paperWidth: 'kot',
    ipAddress: '192.168.1.200',
    port: 9100,
    isDefault: false,
    role: 'kitchen',
    autoCut: true,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'kot',
    description: 'Direct Ethernet LAN IP printing to pastry kitchen workshop with audio alert buzzer'
  },
  {
    id: 'printer-kot-chef',
    name: 'Bakery Workshop Chef Production Slip Printer (80mm)',
    brand: 'Bakery Workshop KOT',
    type: 'system',
    paperWidth: 'kot',
    isDefault: false,
    role: 'kitchen',
    autoCut: true,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'kot',
    description: 'Instant cake production order slips with cake inscription writing, flavor & delivery schedule'
  },

  // 5. Office & Full Tax Invoice Printers (A4 / A5 Sheets)
  {
    id: 'printer-hp-laser',
    name: 'HP LaserJet Pro A4 (Full Page GST Tax Invoice)',
    brand: 'HP LaserJet',
    type: 'system',
    paperWidth: 'a4',
    isDefault: false,
    role: 'office',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'laser',
    description: 'Standard laser sheet printer for large corporate catering & wholesale tax invoices'
  },
  {
    id: 'printer-canon-pixma',
    name: 'Canon PIXMA / imageCLASS (A5 Half Page Retail Slip)',
    brand: 'Canon',
    type: 'system',
    paperWidth: 'a5',
    isDefault: false,
    role: 'office',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'laser',
    description: 'Compact A5 sheet printing for bulk event party orders and delivery challans'
  },
  {
    id: 'printer-brother-hl',
    name: 'Brother HL-Series Office Laser Printer (A4)',
    brand: 'Brother',
    type: 'system',
    paperWidth: 'a4',
    isDefault: false,
    role: 'office',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'laser',
    description: 'Heavy duty office duplex printer for daily accounts closing and tax audit files'
  },

  // 6. Virtual & Digital Invoices
  {
    id: 'printer-pdf-virtual',
    name: 'Digital PDF Receipt Generator & Instant Archiver',
    brand: 'PDF Digital',
    type: 'pdf',
    paperWidth: '80mm',
    isDefault: false,
    role: 'cashier',
    autoCut: false,
    openCashDrawer: false,
    printCopies: 1,
    status: 'ready',
    category: 'virtual',
    description: 'Paperless digital invoice PDF generator for instant email/WhatsApp record keeping'
  }
];

export const DEFAULT_PRINTER_DEVICES: PrinterDevice[] = [
  ALL_POPULAR_PRINTER_MODELS[0], // System Default
  ALL_POPULAR_PRINTER_MODELS[1], // Epson TM-T82
  ALL_POPULAR_PRINTER_MODELS[3], // TVS RP 3200 Star
  ALL_POPULAR_PRINTER_MODELS[9], // Mini Bluetooth POS-58
  ALL_POPULAR_PRINTER_MODELS[15], // KOT Network LAN
  ALL_POPULAR_PRINTER_MODELS[17], // HP LaserJet A4
  ALL_POPULAR_PRINTER_MODELS[20]  // PDF Virtual
];

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopName: 'DELICIOUS CAKE CORNER',
  tagline: '100% Eggless Pure Vegetarian Bakery & Cake Studio',
  logoUrl: DEFAULT_BAKERY_LOGO,
  addressLine1: 'Mansuka, Gharoighat, Ghatal',
  addressLine2: 'Near Bus Stand, Ghatal-Panskura Road',
  district: 'Paschim Medinipur',
  pin: '721212',
  phone: '7866971421',
  altPhone: '7866971421',
  upiId: '7866971421@okaxis',
  gstin: '',
  fssai: '',
  billPrefix: 'DCC-',
  defaultTaxPercent: 0,
  receiptFormat: 'thermal',
  termsNote: 'Orders once placed cannot be cancelled on the same day. Please store fresh cream cakes below 5°C. 100% Eggless guarantee.',
  thankYouMessage: 'Thank you for choosing DELICIOUS CAKE CORNER! 🎂 We hope our 100% Eggless pure veg cake makes your celebration extra sweet! Visit again!',
  thankYouMessageBn: 'ডেলিসিয়াস কেক কর্নার-এ আসার জন্য আপনাকে আন্তরিক ধন্যবাদ ও শুভেচ্ছা! 🎂✨ আমাদের ১০০% এগলেস স্পেশাল ফ্রেশ কেক আপনার পারিবারিক অনুষ্ঠান ও উৎসবের মুহূর্তগুলিকে আরও মিষ্টি ও আনন্দময় করে তুলুক। প্রয়োজনে কল বা হোয়াটসঅ্যাপ করুন: 7866971421। আবার আসবেন! 🎉',
  signatoryName: 'Sumona Mondal Kunti',
  signatureImage: '',
  counters: DEFAULT_COUNTERS,
  activeCounterId: 'counter-1',
  distributors: DEFAULT_DISTRIBUTORS,
  activeDistributorId: 'dist-1',
  terminals: DEFAULT_SYSTEM_TERMINALS,
  activeTerminalId: 'system-1',
  printer: {
    type: 'system',
    paperWidth: '80mm',
    autoCut: true,
    openCashDrawer: false,
    printCopies: 1,
    autoPrintOnSave: false,
    printKitchenTicket: true,
    devices: DEFAULT_PRINTER_DEVICES,
    activePrinterId: 'printer-system'
  },
  printerDevices: DEFAULT_PRINTER_DEVICES,
  activePrinterId: 'printer-system',
  loyaltyProgramEnabled: true,
  loyaltyPointsPerHundred: 1,
  loyaltyTiers: DEFAULT_LOYALTY_TIERS,
  autoSendSmsOnBill: true,
  smsLanguage: 'bn',
  googleMapsUrl: 'https://www.google.com/maps/place/Misty+Wala/@22.7157,87.7303251,17z/data=!3m1!4b1!4m6!3m5!1s0x39f80f0038f3225f:0xd49fd1f59dea21ff!8m2!3d22.7157!4d87.7329!16s%2Fg%2F11z52vjl02?entry=ttu&g_ep=EgoyMDI2MTAwNy4wIKXMDSoASAFQAw%3D%3D',
  googleReviewUrl: 'https://maps.google.com/?cid=15321528623789416959',
  facebookPageUrl: 'https://www.facebook.com/share/1EEg9yAa9A/',
  instagramUrl: 'https://www.instagram.com/deliciouscakecorner',
  latitude: 22.7157,
  longitude: 87.7329,
  adminPin: DEFAULT_ADMIN_PIN,
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,
  staffAccounts: DEFAULT_STAFF_ACCOUNTS,
  requirePasswordOnInstall: true,
  requirePasswordEveryOpen: false
};


export const DEFAULT_PRODUCTS: BakeryProduct[] = [
  {
    id: 'prod-1',
    nameBn: 'চকলেট ট্রাফেল কেক',
    nameEn: 'Chocolate Truffle Cake',
    category: 'Cakes',
    defaultRate: 450,
    unit: 'lb',
    popular: true,
    image: '/src/assets/images/cake_chocolate_truffle_1790791091117.jpg'
  },
  {
    id: 'prod-2',
    nameBn: 'ব্ল্যাক ফরেস্ট কেক',
    nameEn: 'Black Forest Cake',
    category: 'Cakes',
    defaultRate: 380,
    unit: 'lb',
    popular: true
  },
  {
    id: 'prod-3',
    nameBn: 'রেড ভেলভেট কেক',
    nameEn: 'Red Velvet Cake',
    category: 'Cakes',
    defaultRate: 480,
    unit: 'lb',
    popular: true,
    image: '/src/assets/images/cake_red_velvet_1790791104586.jpg'
  },
  {
    id: 'prod-4',
    nameBn: 'বাটারস্কচ ক্রাঞ্চ কেক',
    nameEn: 'Butterscotch Crunch Cake',
    category: 'Cakes',
    defaultRate: 350,
    unit: 'lb',
    popular: true
  },
  {
    id: 'prod-5',
    nameBn: 'পাইনাপেল ফ্রুট কেক',
    nameEn: 'Pineapple Fruit Cake',
    category: 'Cakes',
    defaultRate: 320,
    unit: 'lb',
    popular: true
  },
  {
    id: 'prod-6',
    nameBn: 'হোয়াইট ফরেস্ট কেক',
    nameEn: 'White Forest Cake',
    category: 'Cakes',
    defaultRate: 380,
    unit: 'lb',
    popular: false
  },
  {
    id: 'prod-7',
    nameBn: 'রসমলাই রয়েল কেক',
    nameEn: 'Rasmalai Royal Cake',
    category: 'Premium Cakes',
    defaultRate: 550,
    unit: 'lb',
    popular: true
  },
  {
    id: 'prod-8',
    nameBn: 'ম্যাঙ্গো ডিলাইট কেক',
    nameEn: 'Mango Delight Cake',
    category: 'Premium Cakes',
    defaultRate: 400,
    unit: 'lb',
    popular: false
  },
  {
    id: 'prod-9',
    nameBn: 'ডাচ ডার্ক চকলেট কেক',
    nameEn: 'Dutch Dark Chocolate Cake',
    category: 'Premium Cakes',
    defaultRate: 500,
    unit: 'lb',
    popular: false
  },
  {
    id: 'prod-10',
    nameBn: 'কাস্টমাইজড ফটো কেক',
    nameEn: 'Custom Photo Print Cake',
    category: 'Designer Cakes',
    defaultRate: 600,
    unit: 'lb',
    popular: true
  },
  {
    id: 'prod-11',
    nameBn: '২-টিয়ার বার্থডে ডিজাইনার কেক',
    nameEn: '2-Tier Celebration Cake (2 lb+)',
    category: 'Designer Cakes',
    defaultRate: 1100,
    unit: 'lb',
    popular: false
  },
  {
    id: 'prod-12',
    nameBn: 'চকলেট পেস্ট্রি',
    nameEn: 'Chocolate Pastry',
    category: 'Pastries & Desserts',
    defaultRate: 60,
    unit: 'pc',
    popular: true
  },
  {
    id: 'prod-13',
    nameBn: 'রেড ভেলভেট পেস্ট্রি',
    nameEn: 'Red Velvet Pastry',
    category: 'Pastries & Desserts',
    defaultRate: 70,
    unit: 'pc',
    popular: false
  },
  {
    id: 'prod-14',
    nameBn: 'চকো লাভা কেক',
    nameEn: 'Choco Lava Cake',
    category: 'Pastries & Desserts',
    defaultRate: 80,
    unit: 'pc',
    popular: false
  },
  {
    id: 'prod-15',
    nameBn: 'ওয়ালনাট ব্রাউনি',
    nameEn: 'Walnut Chocolate Brownie',
    category: 'Pastries & Desserts',
    defaultRate: 70,
    unit: 'pc',
    popular: false
  },
  {
    id: 'prod-16',
    nameBn: 'মিউজিক্যাল ক্যান্ডেল',
    nameEn: 'Musical Birthday Candle',
    category: 'Celebration Accessories',
    defaultRate: 50,
    unit: 'pc',
    popular: true
  },
  {
    id: 'prod-17',
    nameBn: 'স্পার্কলার ক্যান্ডেল ফাউন্টেন',
    nameEn: 'Sparkler Candle Fountain',
    category: 'Celebration Accessories',
    defaultRate: 40,
    unit: 'pc',
    popular: true
  },
  {
    id: 'prod-18',
    nameBn: 'পার্টি পপার',
    nameEn: 'Party Popper',
    category: 'Celebration Accessories',
    defaultRate: 60,
    unit: 'pc',
    popular: true
  },
  {
    id: 'prod-19',
    nameBn: 'বার্থডে ক্যাপ ও ব্যানার সেট',
    nameEn: 'Birthday Cap & Banner Kit',
    category: 'Celebration Accessories',
    defaultRate: 60,
    unit: 'pc',
    popular: false
  }
];

export const STANDARD_WEIGHT_OPTIONS = [
  { label: '0.5 lb (250g)', value: '0.5 lb', multiplier: 0.6 },
  { label: '1.0 lb (450g)', value: '1.0 lb', multiplier: 1.0 },
  { label: '1.5 lb (700g)', value: '1.5 lb', multiplier: 1.5 },
  { label: '2.0 lb (1 kg)', value: '2.0 lb', multiplier: 2.0 },
  { label: '3.0 lb (1.4 kg)', value: '3.0 lb', multiplier: 3.0 },
  { label: '4.0 lb (1.8 kg)', value: '4.0 lb', multiplier: 4.0 },
  { label: '5.0 lb (2.3 kg)', value: '5.0 lb', multiplier: 5.0 },
  { label: '1 Piece', value: '1 Pc', multiplier: 1.0 },
  { label: '1 Box / Pack', value: '1 Box', multiplier: 1.0 }
];
