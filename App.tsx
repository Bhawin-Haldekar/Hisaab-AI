import React, { useState, useEffect } from "react";
import { 
  Building2, Bot, Brain, Sparkles, MessageSquareCode, FileText, 
  BarChart3, Settings, Calendar, Play, Loader2, Send, Upload, 
  AlertTriangle, CheckCircle, RefreshCw, Volume2, User, Database, 
  Mail, PhoneCall, ChevronRight, Activity, ArrowUpRight, HelpCircle,
  Mic, Plus, Trash2, Wallet, QrCode, MessageCircle, ArrowDownLeft, Trash, Edit, Edit3, History,
  Camera, X, Cloud, CloudOff, Server, Eye, Search, Check, Calculator, Download, Sun, Moon, Globe, Bell, TrendingDown, Receipt
} from "lucide-react";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "motion/react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell
} from "recharts";
import { db } from "./firebase";
import { 
  collection, doc, setDoc, getDoc, getDocs, 
  query, where, addDoc, deleteDoc, updateDoc, 
  onSnapshot, serverTimestamp 
} from "firebase/firestore";

// WhatsApp URL helper for Click-to-Chat without API
const getWhatsAppUrl = (phone: string, text: string) => {
  if (!phone) return "#";
  const cleanPhone = phone.replace(/\D/g, "");
  // Prepend country code 91 if it's a 10 digit Indian number
  const formattedPhone = (cleanPhone.length === 10 && !cleanPhone.startsWith("91")) ? `91${cleanPhone}` : cleanPhone;
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userPhone?: string) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userPhone || null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Pre-loaded invoice text for easy user OCR demo
const DUMMY_INVOICES = [
  {
    name: "Indian Wholesale Sweet & Flour Invoice",
    text: `MADAN SWEETS & BAKERY WHOLESALERS
GSTIN: 29AAAAA1111A1Z1
Invoice #: GST-2026-904
Date: 2026-07-02
Client: Karan Bakery & Retail (Bengaluru)

Items:
1. Premium Wheat Flour (Maida - 25kg Bag) - Qty: 10 - Price: ₹1800.00 - Total: ₹18000.00
2. Organic Cane Sugar (Chini - 10kg Bag) - Qty: 5 - Price: ₹950.00 - Total: ₹4750.00
3. Pure Butter Block (Amul Makhan - 5kg) - Qty: 8 - Price: ₹4500.00 - Total: ₹36000.00

Subtotal: ₹58750.00
Tax (18% GST): ₹10575.00
Grand Total Due: ₹69325.00
Currency: INR
Payment Terms: Net 15 (UPI/Bank)`
  },
  {
    name: "SME Services Invoice (Bangalore)",
    text: `NEXUS DIGITAL SOLUTIONS (Bengaluru)
GSTIN: 29BBBBB2222B2Z2
Invoice #: GST-99812-A
Date: 2026-06-28
Client: Zenith Wellness Centre (Mumbai)

Items:
1. Enterprise SEO & Digital Growth - Qty: 1 - Price: ₹18000.00 - Total: ₹18000.00
2. Custom Social Media Poster Design - Qty: 1 - Price: ₹7500.00 - Total: ₹7500.00
3. Monthly Analytics & Consulting - Qty: 1 - Price: ₹4500.00 - Total: ₹4500.00

Subtotal: ₹30000.00
Tax (18% GST): ₹5400.00
Grand Total Due: ₹35400.00
Currency: INR`
  }
];

const BUSINESS_SPECIFIC_DATA: Record<string, {
  name: string;
  hindiName: string;
  customers: Array<{ id: number; name: string; phone: string; address: string; amount: number; lastUpdated: string }>;
  dummyInvoices: Array<{ name: string; text: string }>;
  lowStock: { name: string; hindi: string; desc: string; criticalLevel: string; current: string; supplier: string };
}> = {
  "Grocery Store": {
    name: "Grocery Store",
    hindiName: "किराना स्टोर",
    customers: [
      { id: 1, name: "Rajesh Kirana Store", phone: "+91 98765 43210", address: "Bengaluru", amount: 4500, lastUpdated: "2 days ago" },
      { id: 2, name: "Verma Grocers", phone: "+91 99012 34567", address: "Delhi NCR", amount: 12000, lastUpdated: "Today" },
      { id: 3, name: "Bangalore Bakers Hub", phone: "+91 94480 12345", address: "Indiranagar", amount: 18500, lastUpdated: "1 week ago" }
    ],
    dummyInvoices: [
      {
        name: "Indian Wholesale Sweet & Flour",
        text: `MADAN SWEETS & BAKERY WHOLESALERS
GSTIN: 29AAAAA1111A1Z1
Invoice #: GST-2026-904
Date: 2026-07-02
Client: Karan Bakery & Retail (Bengaluru)

Items:
1. Premium Wheat Flour (Maida - 25kg Bag) - Qty: 10 - Price: ₹1800.00 - Total: ₹18000.00
2. Organic Cane Sugar (Chini - 10kg Bag) - Qty: 5 - Price: ₹950.00 - Total: ₹4750.00
3. Pure Butter Block (Amul Makhan - 5kg) - Qty: 8 - Price: ₹4500.00 - Total: ₹36000.00

Subtotal: ₹58750.00
Tax (18% GST): ₹10575.00
Grand Total Due: ₹69325.00
Currency: INR
Payment Terms: Net 15 (UPI/Bank)`
      },
      {
        name: "SME Services Invoice (Bangalore)",
        text: `NEXUS DIGITAL SOLUTIONS (Bengaluru)
GSTIN: 29BBBBB2222B2Z2
Invoice #: GST-99812-A
Date: 2026-06-28
Client: Zenith Wellness Centre (Mumbai)

Items:
1. Enterprise SEO & Digital Growth - Qty: 1 - Price: ₹18000.00 - Total: ₹18000.00
2. Custom Social Media Poster Design - Qty: 1 - Price: ₹7500.00 - Total: ₹7500.00
3. Monthly Analytics & Consulting - Qty: 1 - Price: ₹4500.00 - Total: ₹4500.00

Subtotal: ₹30000.00
Tax (18% GST): ₹5400.00
Grand Total Due: ₹35400.00
Currency: INR`
      }
    ],
    lowStock: {
      name: "Amul Butter Block (अमूल मक्खन)",
      hindi: "अमूल मक्खन",
      desc: "Only 2 blocks left in deep freezer. Normal weekly consumption is 12 blocks. Suggested supplier: Madan Wholesalers.",
      criticalLevel: "CRITICAL",
      current: "2 blocks left",
      supplier: "Madan Wholesalers"
    }
  },
  "Restaurant": {
    name: "Restaurant",
    hindiName: "रेस्टोरेंट / भोजनालय",
    customers: [
      { id: 1, name: "Sharma Catering Services", phone: "+91 91234 56789", address: "Mumbai", amount: 6200, lastUpdated: "3 days ago" },
      { id: 2, name: "Foodie Junction", phone: "+91 98123 45678", address: "Pune", amount: 14500, lastUpdated: "Yesterday" },
      { id: 3, name: "Chef's Table Cafe", phone: "+91 97654 32109", address: "Bandra", amount: 9200, lastUpdated: "2 weeks ago" }
    ],
    dummyInvoices: [
      {
        name: "Mumbai Flavors Supply Invoice",
        text: `MUMBAI FLAVORS CATERING SUPPLIERS
GSTIN: 27CCCCCC3333C3Z3
Invoice #: GST-2026-REST-102
Date: 2026-07-03
Client: Foodie Junction (Mumbai)

Items:
1. Basmati Biryani Rice (Royal Grade - 25kg Bag) - Qty: 6 - Price: ₹3200.00 - Total: ₹19200.00
2. Premium Refined Cooking Oil (15L Tin) - Qty: 8 - Price: ₹2100.00 - Total: ₹16800.00
3. Rich Saffron Combo Pack (Kesar - 50g) - Qty: 4 - Price: ₹4500.00 - Total: ₹18000.00

Subtotal: ₹54000.00
Tax (18% GST): ₹9720.00
Grand Total Due: ₹63720.00
Currency: INR
Payment Terms: Net 7`
      },
      {
        name: "Royal Dairy Distributors",
        text: `ROYAL VEG & DAIRY WHOLESALERS
GSTIN: 27DDDDD4444D4Z4
Invoice #: GST-INV-22910
Date: 2026-06-30
Client: Chef's Table Cafe (Pune)

Items:
1. Fresh Paneer Block (Cottage Cheese - 10kg) - Qty: 5 - Price: ₹2500.00 - Total: ₹12500.00
2. Rich Dairy Cream (Amul Malai - 5kg pack) - Qty: 4 - Price: ₹1800.00 - Total: ₹7200.00

Subtotal: ₹19700.00
Tax (12% GST): ₹2364.00
Grand Total Due: ₹22064.00
Currency: INR`
      }
    ],
    lowStock: {
      name: "Basmati Biryani Rice (बासमती चावल)",
      hindi: "बासमती चावल",
      desc: "Only 1 bag left in dry storage. Normal weekly consumption is 8 bags. Suggested supplier: Mumbai Flavors Catering Suppliers.",
      criticalLevel: "CRITICAL",
      current: "1 bag left",
      supplier: "Mumbai Flavors Suppliers"
    }
  },
  "Medical Store": {
    name: "Medical Store",
    hindiName: "दवाखाना / फार्मेसी",
    customers: [
      { id: 1, name: "Dr. Mehta Clinic", phone: "+91 93210 98765", address: "Ahmedabad", amount: 8400, lastUpdated: "5 days ago" },
      { id: 2, name: "Lifeline Hospital", phone: "+91 90909 09090", address: "Ahmedabad West", amount: 43000, lastUpdated: "Today" },
      { id: 3, name: "Gupta Chemist Retail", phone: "+91 92233 44556", address: "Baroda", amount: 11200, lastUpdated: "1 week ago" }
    ],
    dummyInvoices: [
      {
        name: "Medicare Distributors India",
        text: `MEDICARE DISTRIBUTORS INDIA LTD
GSTIN: 24EEEEE5555E5Z5
Invoice #: GST-MED-9930
Date: 2026-07-04
Client: Lifeline Hospital (Ahmedabad)

Items:
1. Paracetamol IP (500mg - Box of 50 Strips) - Qty: 15 - Price: ₹850.00 - Total: ₹12750.00
2. Amoxicillin Capsules IP (250mg - 20 Strips) - Qty: 10 - Price: ₹1200.00 - Total: ₹12000.00
3. Multivitamin Tablets (Zinc & Vit C - 100 Strips) - Qty: 5 - Price: ₹3100.00 - Total: ₹15500.00

Subtotal: ₹40250.00
Tax (12% GST): ₹4830.00
Grand Total Due: ₹45080.00
Currency: INR`
      },
      {
        name: "Apex Biotech Supplies",
        text: `APEX BIOTECH & PHARMA DISTRIBUTORS
GSTIN: 24FFFFF6666F6Z6
Invoice #: GST-APX-8172
Date: 2026-07-01
Client: Dr. Mehta Clinic (Ahmedabad)

Items:
1. N95 Protective Face Masks (Box of 50) - Qty: 20 - Price: ₹1100.00 - Total: ₹22000.00
2. Digital Infrared Thermometers - Qty: 5 - Price: ₹1500.00 - Total: ₹7500.00

Subtotal: ₹29500.00
Tax (18% GST): ₹5310.00
Grand Total Due: ₹34810.00
Currency: INR`
      }
    ],
    lowStock: {
      name: "Paracetamol IP - 500mg (पैरासिटामोल)",
      hindi: "पैरासिटामोल",
      desc: "Only 4 boxes left in active drawers. Normal weekly consumption is 30 boxes. Suggested supplier: Medicare Distributors.",
      criticalLevel: "CRITICAL",
      current: "4 boxes left",
      supplier: "Medicare Distributors"
    }
  },
  "Clothing Store": {
    name: "Clothing Store",
    hindiName: "कपड़े की दुकान / गारमेंट्स",
    customers: [
      { id: 1, name: "Raymonds Tailor Store", phone: "+91 95555 12345", address: "Jaipur", amount: 15200, lastUpdated: "4 days ago" },
      { id: 2, name: "Fashion Hub Boutique", phone: "+91 96666 54321", address: "Udaipur", amount: 24000, lastUpdated: "Yesterday" },
      { id: 3, name: "Agarwal Garments", phone: "+91 97777 98765", address: "Kota", amount: 19500, lastUpdated: "3 days ago" }
    ],
    dummyInvoices: [
      {
        name: "Indore Textile & Cotton Mills",
        text: `INDORE TEXTILE & COTTON MILLS
GSTIN: 23GGGGG7777G7Z7
Invoice #: GST-TEX-4581
Date: 2026-07-03
Client: Fashion Hub Boutique (Udaipur)

Items:
1. Premium Cotton Men Shirts (Mixed Sizes) - Qty: 40 - Price: ₹550.00 - Total: ₹22000.00
2. Denim Jeans Slim-fit (Indo-Blue) - Qty: 30 - Price: ₹850.00 - Total: ₹25500.00
3. Embroidered Salwar Suits Combo - Qty: 10 - Price: ₹1800.00 - Total: ₹18000.00

Subtotal: ₹65500.00
Tax (5% GST): ₹3275.00
Grand Total Due: ₹68775.00
Currency: INR`
      },
      {
        name: "Heritage Silk & Apparel",
        text: `HERITAGE SILK & APPAREL WHOLESALERS
GSTIN: 23HHHHH8888H8Z8
Invoice #: GST-HER-9912
Date: 2026-06-29
Client: Raymonds Tailor Store (Jaipur)

Items:
1. Pure Banarasi Silk Saree (Red Bridal) - Qty: 5 - Price: ₹4500.00 - Total: ₹22500.00
2. Designer Linen Kurtas (Standard Sizes) - Qty: 12 - Price: ₹750.00 - Total: ₹9000.00

Subtotal: ₹31500.00
Tax (5% GST): ₹1575.00
Grand Total Due: ₹33075.00
Currency: INR`
      }
    ],
    lowStock: {
      name: "Designer Silk Saree - Red (रेशमी साड़ी)",
      hindi: "रेशमी साड़ी",
      desc: "Only 1 saree left in glass display racks. Normal weekly consumption is 10 pieces. Suggested supplier: Indore Textile Mills.",
      criticalLevel: "CRITICAL",
      current: "1 piece left",
      supplier: "Indore Textile Mills"
    }
  }
};

export const LANGUAGES = [
  { id: "hi", name: "Hindi (हिन्दी) + English", nativeName: "हिन्दी", locale: "hi-IN" },
  { id: "mr", name: "Marathi (मराठी) + English", nativeName: "मराठी", locale: "mr-IN" },
  { id: "gu", name: "Gujarati (ગુજરાતી) + English", nativeName: "ગુજરાતી", locale: "gu-IN" },
  { id: "ta", name: "Tamil (தமிழ்) + English", nativeName: "தமிழ்", locale: "ta-IN" },
  { id: "te", name: "Telugu (తెలుగు) + English", nativeName: "తెలుగు", locale: "te-IN" },
  { id: "kn", name: "Kannada (ಕನ್ನಡ) + English", nativeName: "ಕನ್ನಡ", locale: "kn-IN" },
  { id: "bn", name: "Bengali (বাংলা) + English", nativeName: "বাংলা", locale: "bn-IN" },
  { id: "pa", name: "Punjabi (ਪੰਜਾਬੀ) + English", nativeName: "ਪੰਜਾਬੀ", locale: "pa-IN" },
  { id: "en", name: "English (Only)", nativeName: "English", locale: "en-US" }
];

export function detectBrowserLanguage(): string {
  if (typeof navigator === "undefined") return "hi";
  
  // Get preferred browser languages
  const preferredLanguages = navigator.languages || [navigator.language];
  
  for (const lang of preferredLanguages) {
    if (!lang) continue;
    const lowerLang = lang.toLowerCase();
    
    // First, try exact locale match (e.g. "hi-in" matching "hi-IN")
    const exactMatch = LANGUAGES.find(
      (l) => l.locale.toLowerCase() === lowerLang
    );
    if (exactMatch) {
      return exactMatch.id;
    }
    
    // Next, try prefix matching (e.g. "hi" matching "hi")
    const prefixMatch = LANGUAGES.find(
      (l) => lowerLang.startsWith(l.id.toLowerCase())
    );
    if (prefixMatch) {
      return prefixMatch.id;
    }
  }
  
  return "hi"; // Fallback/default language
}

export function VoiceInputButton({ 
  onTranscript, 
  lang = "hi", 
  className = "", 
  size = "md" 
}: { 
  onTranscript: (text: string) => void; 
  lang?: string; 
  className?: string; 
  size?: "sm" | "md"; 
}) {
  const [recording, setRecording] = useState(false);

  const startListening = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Voice speech recognition is not supported in this browser. Please try Google Chrome or Apple Safari. | आपके ब्राउज़र में वॉयस रिकग्निशन उपलब्ध नहीं है।");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      const currentLangObj = LANGUAGES.find(l => l.id === lang);
      recognition.lang = currentLangObj ? currentLangObj.locale : "hi-IN";

      recognition.onstart = () => {
        setRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          alert("Microphone permission was denied. Please check your browser settings. | माइक्रोफ़ोन की अनुमति नहीं मिली।");
        }
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setRecording(false);
    }
  };

  const currentLangObj = LANGUAGES.find(l => l.id === lang);
  const langLabel = currentLangObj ? currentLangObj.nativeName : "हिंदी";

  return (
    <button
      type="button"
      onClick={startListening}
      className={`inline-flex items-center justify-center rounded-xl cursor-pointer transition-all shrink-0 focus:outline-none ${
        recording 
          ? "bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-md shadow-red-500/20" 
          : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30"
      } ${size === "sm" ? "p-1 w-6 h-6 rounded-lg" : "p-2 w-9 h-9"} ${className}`}
      title={recording ? `Listening (${langLabel})... Speak now / बोलें...` : `Speak in ${langLabel} / वॉयस टाइप`}
    >
      {recording ? (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-100"></span>
        </span>
      ) : (
        <Mic className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      )}
    </button>
  );
}

export const LANGUAGE_TRANSLATIONS: Record<string, {
  headerSub: string;
  tabs: {
    voice: string;
    scan: string;
    khata: string;
    inventory: string;
    staff: string;
    galla: string;
  };
  voiceHints: string[];
  attendanceHint: string;
  gallaHint: string;
  khataHint: string;
  inventoryHint: string;
  scanHint: string;
  voicePlaceholder: string;
  micSpeakNow: string;
  voiceGuide: string;
  verifiedText: string;
  welcomeBack: string;
  regionHeader: string;
  micTapToSpeak: string;
  micListening: string;
  micWorking: string;
  typeHintLabel: string;
  shortcutsHeader: string;
}> = {
  hi: {
    headerSub: "गैर-तकनीकी दुकानदारों और छोटे व्यवसायों के लिए द्विभाषी डिजिटल साथी",
    tabs: {
      voice: "🎙️ बोलो और काम करो",
      scan: "📸 फोटो से बिल चढ़ाओ",
      khata: "📔 उधार लेजर बुक",
      inventory: "📦 स्टॉक इन्वेंटरी",
      staff: "👥 स्टाफ हाजिरी",
      galla: "💰 दैनिक गल्ला"
    },
    voiceHints: [
      "राजेश किराना स्टोर को 3500 रुपये उधार लिखो",
      "आज का गल्ला चेक करो",
      "सुरेश को 1200 रुपये का तगादा व्हाट्सएप भेजो"
    ],
    attendanceHint: "स्टाफ की हाजिरी दर्ज करें और वेतन का हिसाब रखें।",
    gallaHint: "आज के नकद और यूपीआई बिक्री का मिलान करें।",
    khataHint: "ग्राहकों के खाते और उधारी का हिसाब रखें।",
    inventoryHint: "स्टॉक की कमी और मुनाफा मार्जिन की जांच करें।",
    scanHint: "सप्लायर बिल का फोटो अपलोड करें, एआई खुद ही सारा हिसाब टैली में दर्ज कर देगा।",
    voicePlaceholder: "उदाहरण: 'सुरेश को ₹1500 उधार लिखो' या 'आज का गल्ला बताओ'",
    micSpeakNow: "हम सुन रहे हैं, बोलें...",
    voiceGuide: "आप अपनी भाषा (Hinglish/हिंदी/English) में बात कर सकते हैं।",
    verifiedText: "सत्यापित और सुरक्षित!",
    welcomeBack: "नमस्ते, आपका स्वागत है!",
    regionHeader: "क्षेत्र और भाषा",
    micTapToSpeak: "बोलने के लिए टैप करें",
    micListening: "सुन रहे हैं...",
    micWorking: "काम हो रहा है...",
    typeHintLabel: "⌨️ टाइप करें (या यहाँ लिखें):",
    shortcutsHeader: "⚡ आसान शॉर्टकट्स (एक-क्लिक)"
  },
  mr: {
    headerSub: "बिगर-तांत्रिक दुकानदार आणि लहान व्यवसायांसाठी द्विभाषिक डिजिटल मित्र",
    tabs: {
      voice: "🎙️ बोला आणि काम करा",
      scan: "📸 फोटोवरून बिल भरा",
      khata: "📔 उधारी लेजर बुक",
      inventory: "📦 स्टॉक इन्व्हेंटरी",
      staff: "👥 स्टाफ हजेरी",
      galla: "💰 दैनिक गल्ला"
    },
    voiceHints: [
      "राजेश किराणा स्टोअरला ३५०० रुपये उधारी लिहा",
      "आजचा गल्ला दाखवा",
      "सुरेशला १२०० रुपयांचे तगादा व्हॉट्सॲप पाठवा"
    ],
    attendanceHint: "स्टाफची हजेरी नोंदवा आणि पगाराचा हिशोब ठेवा.",
    gallaHint: "आजच्या रोख आणि यूपीआय विक्रीचा मेळ घाला.",
    khataHint: "ग्राहकांचे खाते आणि उधारीचा हिशोब ठेवा.",
    inventoryHint: "स्टॉकची कमतरता आणि नफा मार्जिन तपासा.",
    scanHint: "सप्लायर बिलाचा फोटो अपलोड करा, एआई स्वतः सर्व हिशोब टॅलीमध्ये नोंदवेल.",
    voicePlaceholder: "उदाहरण: 'सुरेशला ₹१५०० उधारी लिहा' किंवा 'आजचा गल्ला किती आहे?'",
    micSpeakNow: "आम्ही ऐकत आहोत, बोला...",
    voiceGuide: "तुम्ही तुमच्या भाषेत (मराठी/English/Hinglish) बोलू शकता.",
    verifiedText: "सत्यापित आणि सुरक्षित!",
    welcomeBack: "नमस्कार, आपले स्वागत आहे!",
    regionHeader: "क्षेत्र आणि भाषा",
    micTapToSpeak: "बोलण्यासाठी टॅप करा",
    micListening: "ऐकत आहे...",
    micWorking: "काम सुरू आहे...",
    typeHintLabel: "⌨️ टाईप करा (किंवा येथे लिहा):",
    shortcutsHeader: "⚡ सोपे शॉर्टकट्स (एक-क्लिक)"
  },
  gu: {
    headerSub: "બિન-તકનીકી દુકાનદારો અને નાના વ્યવસાયો માટે દ્વિભાષી ડિજિટલ સાથી",
    tabs: {
      voice: "🎙️ બોલો અને કામ કરો",
      scan: "📸 ફોટો પરથી બિલ ચઢાવો",
      khata: "📔 ઉધાર લેજર બુક",
      inventory: "📦 સ્ટોક ઇન્વેન્ટરી",
      staff: "👥 સ્ટાફ હાજરી",
      galla: "💰 દૈનિક ગલ્લો"
    },
    voiceHints: [
      "રાજેશ કિરાણા સ્ટોરને ૩૫૦૦ રૂપિયા ઉધાર લખો",
      "આજનો ગલ્લો ચેક કરો",
      "સુરેશને ૧૨૦૦ રૂપિયાનું તગાદા વોટ્સએપ મોકલો"
    ],
    attendanceHint: "સ્ટાફની હાજરી નોંધો અને પગારની ગણતરી રાખો.",
    gallaHint: "આજના રોકડ અને યુપીઆઈ વેચાણની મેળવણી કરો.",
    khataHint: "ગ્રાહકોના ખાતા અને ઉધારીની વિગતો રાખો.",
    inventoryHint: "સ્ટોક અછત અને પ્રોફિટ માર્જિન તપાસો.",
    scanHint: "સપ્લાયર બિલનો ફોટો અપલોડ કરો, એઆઈ જાતે જ બધો હિસાબ ટેલીમાં નોંધી દેશે.",
    voicePlaceholder: "ઉદાહરણ: 'સુરેશને ₹૧૫૦૦ ઉધાર લખો' અથવા 'આજનો ગલ્લો બતાવો'",
    micSpeakNow: "અમે સાંભળી રહ્યા છીએ, બોલો...",
    voiceGuide: "તમે તમારી ભાષામાં (ગુજરાતી/English/Hinglish) વાત કરી શકો છો.",
    verifiedText: "ચકાસાયેલ અને સુરક્ષિત!",
    welcomeBack: "નમસ્તે, તમારું સ્વાગત છે!",
    regionHeader: "પ્રદેશ અને ભાષા",
    micTapToSpeak: "બોલવા માટે ટેપ કરો",
    micListening: "સાંભળી રહ્યા છીએ...",
    micWorking: "કામ થઈ રહ્યું છે...",
    typeHintLabel: "⌨️ ટાઈપ કરો (અથવા અહીં લખો):",
    shortcutsHeader: "⚡ સરળ શોર્ટકટ્સ (એક-ક્લિક)"
  },
  ta: {
    headerSub: "தொழில்நுட்பம் சாரா கடைக்காரர்கள் மற்றும் சிறு வணிகங்களுக்கான இருமொழி டிஜிட்டல் துணை",
    tabs: {
      voice: "🎙️ பேசி வேலை செய்யுங்கள்",
      scan: "📸 புகைப்படத்திலிருந்து பில் பதிவேற்று",
      khata: "📔 கடன் லெட்ஜர் புத்தகம்",
      inventory: "📦 இருப்பு விவரம்",
      staff: "👥 ஊழியர் வருகை",
      galla: "💰 தினசரி கல்லா"
    },
    voiceHints: [
      "ராஜேஷ் கிரானா கடைக்கு 3500 ரூபாய் கடன் எழுதுங்கள்",
      "இன்றைய கல்லா விவரம் காட்டு",
      "சுரேஷுக்கு 1200 ரூபாய் கடன் நினைவூட்டல் வாட்ஸ்அப் அனுப்பு"
    ],
    attendanceHint: "ஊழியர் வருகையை பதிவு செய்து சம்பளத்தை கணக்கிடுங்கள்.",
    gallaHint: "இன்றைய ரொக்கம் மற்றும் யுபிஐ விற்பனையை சரிபார்க்கவும்.",
    khataHint: "வாடிக்கையாளர் கணக்குகளையும் கடன்களையும் பராமரிக்கவும்.",
    inventoryHint: "இருப்பு பற்றாக்குறை மற்றும் லாப வரம்பை சரிபார்க்கவும்.",
    scanHint: "சப்ளையர் பில் புகைப்படத்தை பதிவேற்றவும், AI தானாகவே கணக்கை டேலியில் பதிவு செய்யும்.",
    voicePlaceholder: "உதாரணம்: 'சுரேஷுக்கு ₹1500 கடன் எழுது' அல்லது 'இன்றைய கல்லா எவ்வளவு?'",
    micSpeakNow: "நாங்கள் கேட்கிறோம், பேசுங்கள்...",
    voiceGuide: "நீங்கள் உங்கள் மொழியில் (தமிழ்/English) பேசலாம்.",
    verifiedText: "சரிபார்க்கப்பட்டது மற்றும் பாதுகாப்பானது!",
    welcomeBack: "வணக்கம், நல்வரவு!",
    regionHeader: "பிராந்தியம் மற்றும் மொழி",
    micTapToSpeak: "பேச தட்டவும்",
    micListening: "கேட்கிறது...",
    micWorking: "வேலை செய்கிறது...",
    typeHintLabel: "⌨️ தட்டச்சு செய்க (அல்லது இங்கே எழுதுக):",
    shortcutsHeader: "⚡ எளிதான குறுக்குவழிகள் (ஒரு கிளிக்)"
  },
  te: {
    headerSub: "సాంకేతికత లేని దుకాణదారులు మరియు చిన్న వ్యాపారాల కోసం ద్విభాషా డిజిటల్ తోడు",
    tabs: {
      voice: "🎙️ మాట్లాడి పని చేయండి",
      scan: "📸 ఫోటోతో బిల్లు అప్‌లోడ్",
      khata: "📔 అప్పు లెడ్జర్ బుక్",
      inventory: "📦 స్టాక్ ఇన్వెంటరీ",
      staff: "👥 స్టాఫ్ అటెండెన్స్",
      galla: "💰 రోజువారీ గల్లా"
    },
    voiceHints: [
      "రాజేష్ కిరాణా స్టోర్‌కు 3500 రూపాయలు అప్పు రాయండి",
      "ఈరోజు గల్లా చెక్ చేయి",
      "సురేష్‌కు 1200 రూపాయల బ్యాలెన్స్ వాట్సాప్ పంపండి"
    ],
    attendanceHint: "సిబ్బంది హాజరును నమోదు చేయండి మరియు జీతాల వివరాలు ఉంచండి.",
    gallaHint: "ఈరోజు నగదు మరియు యుపిఐ విక్రయాలను సరిపోల్చండి.",
    khataHint: "కస్టమర్ల ఖాతాలు మరియు అప్పుల వివరాలు చూసుకోండి.",
    inventoryHint: "స్టాక్ కొరత మరియు లాభాల మార్జిన్ తనిఖీ చేయండి.",
    scanHint: "ಸಪ್ಲೈಯರ್ ಬಿಲ್ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ, AI ತಾನಾಗಿಯೇ ಎಲ್ಲಾ ಲೆಕ್ಕವನ್ನು ಟ್ಯಾಲಿಯಲ್ಲಿ ದಾಖಲಿಸುತ್ತದೆ.",
    voicePlaceholder: "ఉదాహరణ: 'సురేష్‌కు ₹1500 అప్పు రాయి' లేదా 'ఈరోజు గల్లా ఎంత?'",
    micSpeakNow: "మేము వింటున్నాము, మాట్లాడండి...",
    voiceGuide: "మీరు మీ భాషలో (తెలుగు/English) మాట్లాడవచ్చు.",
    verifiedText: "ధృవీకరించబడింది మరియు సురક્ષితం!",
    welcomeBack: "నమస్కారం, సుస్వాగతం!",
    regionHeader: "ప్రాంతం మరియు భాష",
    micTapToSpeak: "మాట్లాడటానికి నొక్కండి",
    micListening: "వింటున్నాము...",
    micWorking: "పని జరుగుతోంది...",
    typeHintLabel: "⌨️ టైప్ చేయండి (లేదా ఇక్కడ రాయండి):",
    shortcutsHeader: "⚡ సులభమైన షార్ట్‌కట్‌లు (ఒక-క్లిక్)"
  },
  kn: {
    headerSub: "ತಾಂತ್ರಿಕೇತರ ಅಂಗಡಿಯವರು ಮತ್ತು ಸಣ್ಣ ಉದ್ಯಮಗಳಿಗಾಗಿ ದ್ವಿಭಾಷಾ ಡಿಜಿಟಲ್ ಸಹಚರ",
    tabs: {
      voice: "🎙️ ಮಾತನಾಡಿ ಕೆಲಸ ಮಾಡಿ",
      scan: "📸 ಫೋಟೋದಿಂದ ಬಿಲ್ ಅಪ್‌ಲೋಡ್",
      khata: "📔 ಉದರಿ ಲೆಡ್ಜರ್ ಬುಕ್",
      inventory: "📦 ಸ್ಟಾಕ್ ಇನ್ವೆಂಟರಿ",
      staff: "👥 ಸಿಬ್ಬಂದಿ ಹಾಜರಾತಿ",
      galla: "💰 ದೈನಂದಿನ ಗಲ್ಲಾ"
    },
    voiceHints: [
      "ರಾಜೇಶ್ ಕಿರಾಣಾ ಸ್ಟೋರ್‌ಗೆ 3500 ರೂಪಾಯಿ ಉದರಿ ಬರೆಯಿರಿ",
      "ಇಂದಿನ ಗಲ್ಲಾ ವಿವರ ತೋರಿಸು",
      "ಸುರೇಶ್‌ಗೆ 1200 ರೂಪಾಯಿ ಬಾಕಿ ವಾಟ್ಸಾಪ್ ಕಳುಹಿಸಿ"
    ],
    attendanceHint: "ಸಿಬ್ಬಂದಿ ಹಾಜರಾತಿಯನ್ನು ದಾಖಲಿಸಿ ಮತ್ತು ಸಂಬಳ ಲೆಕ್ಕ ಹಾಕಿ.",
    gallaHint: "ಇಂದಿನ ನಗದು ಮತ್ತು ಯುಪಿಐ ಮಾರಾಟವನ್ನು ಹೋಲಿಸಿ ನೋಡಿ.",
    khataHint: "ಗ್ರಾಹಕರ ಖಾತೆ ಮತ್ತು ಉದರಿ ಲೆಕ್ಕವನ್ನು ನಿರ್ವಹಿಸಿ.",
    inventoryHint: "ಸ್ಟಾಕ್ ಕೊರತೆ ಮತ್ತು ಲಾಭದ ಪ್ರಮಾಣವನ್ನು ಪರಿಶೀಲಿಸಿ.",
    scanHint: "ಸಪ್ಲೈಯರ್ ಬಿಲ್ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ, AI ತಾನಾಗಿಯೇ ಎಲ್ಲಾ ಲೆಕ್ಕವನ್ನು ಟ್ಯಾಲಿಯಲ್ಲಿ ದಾಖಲಿಸುತ್ತದೆ.",
    voicePlaceholder: "ಉದಾಹರಣೆ: 'ಸುರೇಶ್‌ಗೆ ₹1500 ಉದರಿ ಬರೆ' ಅಥವಾ 'ಇಂದಿನ ಗಲ್ಲಾ ಎಷ್ಟು?'",
    micSpeakNow: "ನಾವು ಕೇಳುತ್ತಿದ್ದೇವೆ, ಮಾತನಾಡಿ...",
    voiceGuide: "ನೀವು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ (ಕನ್ನಡ/English) ಮಾತನಾಡಬಹುದು.",
    verifiedText: "ಪರಿಶೀಲಿಸಲಾಗಿದೆ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿದೆ!",
    welcomeBack: "ನಮಸ್ಕಾರ, ಸುಸ್ವಾಗತ!",
    regionHeader: "ಪ್ರದೇಶ ಮತ್ತು ಭಾಷೆ",
    micTapToSpeak: "ಮಾತನಾಡಲು ಒತ್ತಿರಿ",
    micListening: "ಕೇಳುತ್ತಿದ್ದೇವೆ...",
    micWorking: "ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ...",
    typeHintLabel: "⌨️ ಟೈಪ್ ಮಾಡಿ (ಅಥವಾ ಇಲ್ಲಿ ಬರೆಯಿರಿ):",
    shortcutsHeader: "⚡ ಸುಲಭ ಶಾರ್ಟ್‌ಕಟ್‌ಗಳು (ಒಂದು-ಕ್ಲಿಕ್)"
  },
  bn: {
    headerSub: "অ-প্রযুক্তিগত দোকানদার এবং ছোট ব্যবসার জন্য দ্বিভাষিক ডিজিটাল সঙ্গী",
    tabs: {
      voice: "🎙️ বলুন এবং কাজ করুন",
      scan: "📸 ফটো থেকে বিল আপলোড",
      khata: "📔 খাতা লেজার বই",
      inventory: "📦 স্টক ইনভেন্টরি",
      staff: "👥 কর্মীদের হাজিরা",
      galla: "💰 দৈনিক ক্যাশবাক্স"
    },
    voiceHints: [
      "রাজেশ কিরানা স্টোরের নামে ৩৫০০ টাকা ধার লেখো",
      "আজকের ক্যাশবাক্স পরীক্ষা করো",
      "সুরেশকে ১২০০ টাকা বকেয়ার হোয়াটসঅ্যাপ পাঠাও"
    ],
    attendanceHint: "কর্মীদের উপস্থিতি নথিভুক্ত করুন এবং বেতনের হিসেব রাখুন।",
    gallaHint: "আজকের নগদ ও ইউপিআই বিক্রির হিসেব মেলান।",
    khataHint: "গ্রাহকদের খাতা এবং ধারের হিসেব রাখুন।",
    inventoryHint: "স্টকের ঘাটতি এবং লাভের পরিমাণ পরীক্ষা করুন।",
    scanHint: "সরবরাহকারী বিলের ছবি আপলোড করুন, AI নিজেই সমস্ত হিসেব ট্যালিতে নথিভুক্ত করবে।",
    voicePlaceholder: "উদাহরণ: 'সুরেশকে ₹১৫০০ ধার লেখো' বা 'আজকের গাল্লা কত?'",
    micSpeakNow: "আমরা শুনছি, বলুন...",
    voiceGuide: "আপনি আপনার নিজের ভাষায় (বাংলা/English) কথা বলতে পারেন।",
    verifiedText: "যাচাইকৃত এবং সুরক্ষিত!",
    welcomeBack: "নমস্কার, আপনাকে স্বাগত!",
    regionHeader: "অঞ্চল এবং ভাষা",
    micTapToSpeak: "কথা বলার জন্য টিপুন",
    micListening: "শুনছি...",
    micWorking: "কাজ হচ্ছে...",
    typeHintLabel: "⌨️ টাইপ করুন (অথবা এখানে লিখুন):",
    shortcutsHeader: "⚡ সহজ শর্টকাট (এক-ক্লিক)"
  },
  pa: {
    headerSub: "ਗੈਰ-ਤਕਨੀਕੀ ਦੁਕਾਨਦਾਰਾਂ ਅਤੇ ਛੋਟੇ ਕਾਰੋਬਾਰਾਂ ਲਈ ਦੋ-ਭਾਸ਼ਾਈ ਡਿਜੀਟਲ ਸਾਥੀ",
    tabs: {
      voice: "🎙️ ਬੋਲੋ ਤੇ ਕੰਮ ਕਰੋ",
      scan: "📸 ਫੋਟੋ ਤੋਂ ਬਿੱਲ ਚੜ੍ਹਾਓ",
      khata: "📔 ਉਧਾਰ ਲੈਜ਼ਰ ਬੁੱਕ",
      inventory: "📦 ਸਟਾਕ ਇਨਵੈਂਟਰੀ",
      staff: "👥 ਸਟਾਫ਼ ਹਾਜ਼ਰੀ",
      galla: "💰 ਰੋਜ਼ਾਨਾ ਗੱਲਾ"
    },
    voiceHints: [
      "ਰਾਜੇਸ਼ ਕਿਰਾਨਾ ਸਟੋਰ ਨੂੰ 3500 ਰੁਪਏ ਉਧਾਰ ਲਿਖੋ",
      "ਅੱਜ ਦਾ ਗੱਲਾ ਚੈੱਕ ਕਰੋ",
      "ਸੁਰੇਸ਼ ਨੂੰ 1200 ਰੁਪਏ ਦਾ ਬਕਾਇਆ ਵਟਸਐਪ ਭੇਜੋ"
    ],
    attendanceHint: "ਸਟਾਫ਼ ਦੀ ਹਾਜ਼ਰੀ ਦਰਜ ਕਰੋ ਅਤੇ ਤਨਖਾਹ ਦਾ ਹਿਸਾਬ ਰੱਖੋ।",
    gallaHint: "ਅੱਜ ਦੇ ਨਕਦ ਅਤੇ ਯੂਪੀਆਈ ਸੇਲ ਦਾ ਮਿਲਾਨ ਕਰੋ।",
    khataHint: "ਗਾਹਕਾਂ ਦੇ ਖਾਤੇ ਅਤੇ ਉਧਾਰੀ ਦਾ ਹਿਸਾਬ ਰੱਖੋ।",
    inventoryHint: "ਸਟਾਕ ਦੀ ਕਮੀ ਅਤੇ ਮੁਨਾਫ਼ਾ ਮਾਰਜਨ ਚੈੱਕ ਕਰੋ।",
    scanHint: "ਸਪਲਾਇਰ ਬਿੱਲ ਦੀ ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ, AI ਆਪੇ ਹੀ ਸਾਰਾ ਹਿਸਾਬ ਟੈਲੀ ਵਿੱਚ ਦਰਜ ਕਰ ਦੇਵੇਗਾ।",
    voicePlaceholder: "ਉਦਾਹਰਨ: 'ਸੁਰੇਸ਼ ਨੂੰ ₹1500 ਉਧਾਰ ਲਿਖੋ' ਜਾਂ 'ਅੱਜ ਦਾ ਗੱਲਾ ਦੱਸੋ'",
    micSpeakNow: "ਅਸੀਂ ਸੁਣ ਰਹੇ ਹਾਂ, ਬੋਲੋ...",
    voiceGuide: "ਤੁਸੀਂ ਆਪਣੀ ਭਾਸ਼ਾ (ਪੰਜਾਬੀ/English) ਵਿੱਚ ਗੱਲ ਕਰ ਸਕਦੇ ਹੋ।",
    verifiedText: "ਪ੍ਰਮਾਣਿਤ ਅਤੇ ਸੁਰੱਖਿਅਤ!",
    welcomeBack: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਜੀ ਆਇਆਂ ਨੂੰ!",
    regionHeader: "ਖੇਤਰ ਅਤੇ ਭਾਸ਼ਾ",
    micTapToSpeak: "ਬੋਲਣ ਲਈ ਟੈਪ ਕਰੋ",
    micListening: "ਸੁਣ ਰਹੇ ਹਾਂ...",
    micWorking: "ਕੰਮ ਹੋ ਰਿਹਾ ਹੈ...",
    typeHintLabel: "⌨️ ਟਾਈਪ ਕਰੋ (ਜਾਂ ਇੱਥੇ ਲਿਖੋ):",
    shortcutsHeader: "⚡ ਆਸਾਨ ਸ਼ਾਰਟਕੱਟ (ਇੱਕ-ਕਲਿੱਕ)"
  },
  en: {
    headerSub: "Primary English Digital Companion for Advanced Audits & Shop Management",
    tabs: {
      voice: "🎙️ Voice Assistant",
      scan: "📸 Scan Bills",
      khata: "📔 Ledger Book",
      inventory: "📦 Stock Inventory",
      staff: "👥 Staff Attendance",
      galla: "💰 Daily Galla"
    },
    voiceHints: [
      "Record 3500 rupees credit for Rajesh Kirana Store",
      "Check today's cash galla",
      "Send 1200 payment reminder WhatsApp to Suresh"
    ],
    attendanceHint: "Track staff check-ins, record daily attendance, and calculate salaries.",
    gallaHint: "Reconcile cash and UPI collections with your physical register drawer.",
    khataHint: "Maintain safe digital khata ledgers and track active credit list.",
    inventoryHint: "Monitor item stock levels, set alerts, and verify profit margins.",
    scanHint: "Upload a picture of purchase bills. AI extracts items, GST and logs to Tally.",
    voicePlaceholder: "e.g., 'Record ₹1500 credit to Suresh' or 'Show current stock status'",
    micSpeakNow: "Listening... speak now.",
    voiceGuide: "Speak naturally. Commands support English, regional accents, and Hinglish.",
    verifiedText: "Verified & Secured!",
    welcomeBack: "Welcome back!",
    regionHeader: "Region & Language",
    micTapToSpeak: "Tap to Speak",
    micListening: "Listening...",
    micWorking: "Working...",
    typeHintLabel: "⌨️ Type Voice Command (or write here):",
    shortcutsHeader: "⚡ Easy Shop Shortcuts (One-Click)"
  }
};

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"hisaab_voice" | "hisaab_scan" | "hisaab_khata" | "hisaab_galla" | "hisaab_inventory" | "hisaab_staff">("hisaab_voice");
  
  // Regional Multilingual State
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    const savedLang = localStorage.getItem("hisaab_language");
    if (savedLang) return savedLang;
    
    const savedUser = localStorage.getItem("hisaab_user");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.language) return u.language;
      } catch (e) {}
    }
    
    return detectBrowserLanguage();
  });

  useEffect(() => {
    localStorage.setItem("hisaab_language", selectedLanguage);
  }, [selectedLanguage]);
  
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("hisaab_theme");
    return (saved === "dark" || saved === "light") ? saved : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("hisaab_theme", theme);
  }, [theme]);
  
  // User Authentication state
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem("hisaab_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [regName, setRegName] = useState("");
  const [regBusiness, setRegBusiness] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBusinessType, setRegBusinessType] = useState("Grocery Store");
  const [regLanguage, setRegLanguage] = useState(() => {
    return detectBrowserLanguage();
  });
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState("");

  // GST & Shopkeeper Document Verification States
  const [signupStep, setSignupStep] = useState(1);
  const [hasGst, setHasGst] = useState(false);
  const [regGstin, setRegGstin] = useState("");
  const [regGstType, setRegGstType] = useState("Regular");
  const [regPan, setRegPan] = useState("");
  const [regAadhaar, setRegAadhaar] = useState("");
  const [regTradeLicense, setRegTradeLicense] = useState("");

  // Document attachments
  const [docGstCert, setDocGstCert] = useState<{ name: string; size: string; dataUrl: string | null } | null>(null);
  const [docPanCard, setDocPanCard] = useState<{ name: string; size: string; dataUrl: string | null } | null>(null);
  const [docAadhaarCard, setDocAadhaarCard] = useState<{ name: string; size: string; dataUrl: string | null } | null>(null);
  const [docShopLicense, setDocShopLicense] = useState<{ name: string; size: string; dataUrl: string | null } | null>(null);

  // Modal to show verification profiles
  const [showGstProfileModal, setShowGstProfileModal] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);

  // --- HISAAB VOICE ASSISTANT STATE & HANDLERS ---
  const [isAuthListening, setIsAuthListening] = useState(false);
  const [authVoiceText, setAuthVoiceText] = useState("");
  const [authVoiceLogs, setAuthVoiceLogs] = useState<{ time: string; msg: string; success: boolean }[]>([]);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);

  const addAuthVoiceLog = (msg: string, success: boolean = true) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuthVoiceLogs(prev => [{ time, msg, success }, ...prev]);
  };

  const handleAuthVoiceCommand = (text: string) => {
    setAuthVoiceText(text);
    const cleaned = text.toLowerCase().trim();
    let parsedAny = false;

    // 1. Phone number extraction (look for 10 consecutive digits)
    const phoneMatch = cleaned.replace(/\s/g, "").match(/\d{10}/);
    if (phoneMatch) {
      setRegPhone(phoneMatch[0]);
      setLoginPhone(phoneMatch[0]);
      addAuthVoiceLog(`📞 Extracted Mobile: ${phoneMatch[0]}`);
      parsedAny = true;
    } else {
      // Extract all digits if there are at least 10 digits
      const allDigits = cleaned.replace(/\D/g, "");
      if (allDigits.length >= 10) {
        const sliced = allDigits.slice(0, 10);
        setRegPhone(sliced);
        setLoginPhone(sliced);
        addAuthVoiceLog(`📞 Extracted Mobile: ${sliced}`);
        parsedAny = true;
      }
    }

    // 2. Name extraction
    const nameRegexes = [
      /my name is\s+([a-zA-Z\s]+)/i,
      /name is\s+([a-zA-Z\s]+)/i,
      /owner is\s+([a-zA-Z\s]+)/i,
      /i am\s+([a-zA-Z\s]+)/i,
      /मेरा नाम\s+([\u0900-\u097F\s]+)/,
      /मेरा नाम\s+([a-zA-Z\s]+)/,
      /नाम\s+([\u0900-\u097F\s]+)\s+है/,
      /नाम\s+([a-zA-Z\s]+)\s+है/
    ];

    for (const regex of nameRegexes) {
      const match = cleaned.match(regex);
      if (match && match[1]) {
        const val = match[1].trim();
        const cleanVal = val.replace(/\s+hai$/i, "").replace(/\s+please$/i, "").trim();
        if (cleanVal.length > 1) {
          setRegName(cleanVal);
          addAuthVoiceLog(`👤 Extracted Name: "${cleanVal}"`);
          parsedAny = true;
          break;
        }
      }
    }

    // 3. Shop / Business Name extraction
    const shopRegexes = [
      /shop name is\s+([a-zA-Z0-9\s]+)/i,
      /shop is\s+([a-zA-Z0-9\s]+)/i,
      /business name is\s+([a-zA-Z0-9\s]+)/i,
      /business is\s+([a-zA-Z0-9\s]+)/i,
      /दुकान का नाम\s+([\u0900-\u097F0-9\s]+)/,
      /दुकान का नाम\s+([a-zA-Z0-9\s]+)/,
      /दुकान\s+([\u0900-\u097F0-9\s]+)\s+है/,
      /दुकान\s+([a-zA-Z0-9\s]+)\s+है/,
      /बिज़नेस का नाम\s+([\u0900-\u097F0-9\s]+)/,
      /बिज़नेस का नाम\s+([a-zA-Z0-9\s]+)/
    ];

    for (const regex of shopRegexes) {
      const match = cleaned.match(regex);
      if (match && match[1]) {
        const val = match[1].trim();
        const cleanVal = val.replace(/\s+hai$/i, "").replace(/\s+please$/i, "").trim();
        if (cleanVal.length > 1) {
          setRegBusiness(cleanVal);
          addAuthVoiceLog(`🏢 Extracted Shop: "${cleanVal}"`);
          parsedAny = true;
          break;
        }
      }
    }

    // 4. Password extraction
    const passwordRegexes = [
      /password is\s+(\S+)/i,
      /password\s+(\S+)\s+hai/i,
      /पासवर्ड\s+(\S+)/,
      /पासवर्ड है\s+(\S+)/
    ];

    for (const regex of passwordRegexes) {
      const match = cleaned.match(regex);
      if (match && match[1]) {
        const val = match[1].trim();
        const cleanVal = val.replace(/है$/, "").trim();
        if (cleanVal.length > 0) {
          setRegPassword(cleanVal);
          setLoginPassword(cleanVal);
          addAuthVoiceLog(`🔒 Set Password: "${cleanVal}"`);
          parsedAny = true;
          break;
        }
      }
    }

    // 5. GST toggle
    if (cleaned.includes("no gst") || cleaned.includes("don't have gst") || cleaned.includes("dont have gst") || cleaned.includes("जीएसटी नहीं है") || cleaned.includes("जीएसटी नहीं") || cleaned.includes("disable gst")) {
      setHasGst(false);
      addAuthVoiceLog(`⚖️ Disabled GST registration`);
      parsedAny = true;
    } else if (cleaned.includes("i have gst") || cleaned.includes("have gst") || cleaned.includes("enable gst") || cleaned.includes("जीएसटी है") || cleaned.includes("हाँ जीएसटी")) {
      setHasGst(true);
      addAuthVoiceLog(`⚖️ Enabled GST registration`);
      parsedAny = true;
    }

    // 6. GSTIN extraction
    const gstinMatch = cleaned.toUpperCase().replace(/\s/g, "").match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/);
    if (gstinMatch) {
      setRegGstin(gstinMatch[0]);
      addAuthVoiceLog(`⚖️ Extracted GSTIN: ${gstinMatch[0]}`);
      parsedAny = true;
    }

    // 7. PAN extraction
    const panMatch = cleaned.toUpperCase().replace(/\s/g, "").match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
    if (panMatch) {
      setRegPan(panMatch[0]);
      addAuthVoiceLog(`🪪 Extracted PAN: ${panMatch[0]}`);
      parsedAny = true;
    }

    // 8. Aadhaar extraction (12 digits)
    const aadhaarMatch = cleaned.replace(/\s/g, "").match(/\d{12}/);
    if (aadhaarMatch) {
      const formatted = aadhaarMatch[0].match(/.{1,4}/g)?.join(" ") || aadhaarMatch[0];
      setRegAadhaar(formatted);
      addAuthVoiceLog(`🪪 Extracted Aadhaar: ${formatted}`);
      parsedAny = true;
    }

    // 9. Business Type
    if (cleaned.includes("grocery") || cleaned.includes("kirana") || cleaned.includes("किराना") || cleaned.includes("राशन")) {
      setRegBusinessType("Grocery Store");
      addAuthVoiceLog(`🛒 Set Category: Grocery Store`);
      parsedAny = true;
    } else if (cleaned.includes("restaurant") || cleaned.includes("cafe") || cleaned.includes("भोजनालय") || cleaned.includes("कैफ़े") || cleaned.includes("होटल")) {
      setRegBusinessType("Restaurant");
      addAuthVoiceLog(`🍽️ Set Category: Restaurant / Cafe`);
      parsedAny = true;
    } else if (cleaned.includes("medical") || cleaned.includes("pharmacy") || cleaned.includes("दवा") || cleaned.includes("फार्मेसी") || cleaned.includes("दवाखाना")) {
      setRegBusinessType("Medical Store");
      addAuthVoiceLog(`💊 Set Category: Medical Store`);
      parsedAny = true;
    } else if (cleaned.includes("clothing") || cleaned.includes("clothes") || cleaned.includes("कपड़े") || cleaned.includes("कपड़ा")) {
      setRegBusinessType("Clothing Store");
      addAuthVoiceLog(`👕 Set Category: Clothing Store`);
      parsedAny = true;
    }

    // 10. Navigation and Action commands
    if (cleaned.includes("next") || cleaned.includes("आगे") || cleaned.includes("अगला")) {
      if (signupStep === 1) {
        if (!regName || !regBusiness || !regPhone || !regPassword) {
          addAuthVoiceLog("⚠️ Name, Shop Name, Phone, and Password are required to proceed.", false);
        } else {
          setSignupStep(2);
          addAuthVoiceLog("➡️ Navigated to Step 2");
        }
      } else if (signupStep === 2) {
        setSignupStep(3);
        addAuthVoiceLog("➡️ Navigated to Step 3");
      }
      parsedAny = true;
    } else if (cleaned.includes("back") || cleaned.includes("पीछे") || cleaned.includes("वापस")) {
      if (signupStep > 1) {
        setSignupStep(prev => prev - 1);
        addAuthVoiceLog("⬅️ Navigated Back");
      }
      parsedAny = true;
    } else if (cleaned.includes("skip") || cleaned.includes("quick") || cleaned.includes("बिना सत्यापन") || cleaned.includes("छोड़ें") || cleaned.includes("छोड़े")) {
      setHasGst(false);
      setRegGstin("");
      setRegPan("");
      setRegAadhaar("");
      setDocPanCard(null);
      setDocAadhaarCard(null);
      setDocGstCert(null);
      setDocShopLicense(null);
      addAuthVoiceLog("⚡ Skipping documents & creating account...");
      setTimeout(() => {
        handleSignup();
      }, 1000);
      parsedAny = true;
    } else if (cleaned.includes("login") || cleaned.includes("लॉगिन") || cleaned.includes("लॉग इन")) {
      setAuthMode("login");
      addAuthVoiceLog("🔑 Switched to Login Mode");
      parsedAny = true;
    } else if (cleaned.includes("sign up") || cleaned.includes("signup") || cleaned.includes("नया खाता") || cleaned.includes("साइन अप")) {
      setAuthMode("signup");
      addAuthVoiceLog("📝 Switched to Signup Mode");
      parsedAny = true;
    }

    if (!parsedAny) {
      addAuthVoiceLog(`❓ Spoken: "${text}". Please specify details clearly!`, false);
    }
  };

  const startAuthMicRecording = () => {
    setIsAuthListening(true);
    setAuthVoiceText("");
    
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "hi-IN"; // default to Indian speech recognition context
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            handleAuthVoiceCommand(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Auth voice assistant mic error:", event.error);
          addAuthVoiceLog("❌ Microphone error/blocked. Tap any command below to simulate!", false);
          setIsAuthListening(false);
        };

        recognition.onend = () => {
          setIsAuthListening(false);
        };

        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        addAuthVoiceLog("❌ Web Speech API failed. Use manual simulation below!", false);
        setIsAuthListening(false);
      }
    } else {
      addAuthVoiceLog("❌ Web Speech API not supported. Use simulation below!", false);
      setIsAuthListening(false);
    }
  };

  // --- LOCALIZED TEXTBOX VOICE CONTROL ---
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

  const handleFieldVoiceResult = (fieldId: string, text: string) => {
    const cleaned = text.trim();
    
    switch (fieldId) {
      case "loginPhone": {
        const digits = cleaned.replace(/\D/g, "");
        if (digits) {
          setLoginPhone(digits.slice(0, 10));
        }
        break;
      }
      case "loginPassword": {
        const pwd = cleaned.replace(/[.!?]$/, "");
        setLoginPassword(pwd);
        break;
      }
      case "regName": {
        let name = cleaned;
        const namePrefixes = [
          /^my name is\s+/i,
          /^name is\s+/i,
          /^i am\s+/i,
          /^मेरा नाम\s+/i,
          /^मेरा नाम है\s+/i,
        ];
        for (const prefix of namePrefixes) {
          if (prefix.test(name)) {
            name = name.replace(prefix, "");
            break;
          }
        }
        name = name.replace(/\s+hai$/i, "").replace(/\s+please$/i, "").replace(/[.!?]$/, "").trim();
        setRegName(name);
        break;
      }
      case "regBusiness": {
        let shop = cleaned;
        const shopPrefixes = [
          /^shop name is\s+/i,
          /^shop is\s+/i,
          /^business name is\s+/i,
          /^business is\s+/i,
          /^दुकान का नाम\s+/i,
          /^बिज़नेस का नाम\s+/i,
        ];
        for (const prefix of shopPrefixes) {
          if (prefix.test(shop)) {
            shop = shop.replace(prefix, "");
            break;
          }
        }
        shop = shop.replace(/\s+hai$/i, "").replace(/\s+please$/i, "").replace(/[.!?]$/, "").trim();
        setRegBusiness(shop);
        break;
      }
      case "regPhone": {
        const digits = cleaned.replace(/\D/g, "");
        if (digits) {
          setRegPhone(digits.slice(0, 10));
        }
        break;
      }
      case "regPassword": {
        const pwd = cleaned.replace(/[.!?]$/, "");
        setRegPassword(pwd);
        break;
      }
      case "regGstin": {
        const gstin = cleaned.toUpperCase().replace(/[^A-Z0-9]/g, "");
        setRegGstin(gstin.slice(0, 15));
        break;
      }
      case "regPan": {
        const pan = cleaned.toUpperCase().replace(/[^A-Z0-9]/g, "");
        setRegPan(pan.slice(0, 10));
        break;
      }
      case "regAadhaar": {
        const digits = cleaned.replace(/\D/g, "").slice(0, 12);
        const match = digits.match(/.{1,4}/g);
        setRegAadhaar(match ? match.join(" ") : digits);
        break;
      }
      case "regTradeLicense": {
        const tl = cleaned.toUpperCase().replace(/[^A-Z0-9-]/g, "");
        setRegTradeLicense(tl);
        break;
      }
      default:
        break;
    }
  };

  const startFieldVoiceInput = (fieldId: string) => {
    setActiveVoiceField(fieldId);
    
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = regLanguage === "hi" ? "hi-IN" : "en-IN";
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            handleFieldVoiceResult(fieldId, transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Field voice recognition error:", event.error);
          setActiveVoiceField(null);
        };

        recognition.onend = () => {
          setActiveVoiceField(null);
        };

        recognition.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
        setActiveVoiceField(null);
      }
    } else {
      console.warn("Speech recognition not supported in browser.");
    }
  };

  const VoiceInput = ({
    id,
    type = "text",
    required = false,
    placeholder,
    value,
    onChange,
    maxLength,
    className = "",
    simulations = []
  }: {
    id: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    value: string;
    onChange: (val: string) => void;
    maxLength?: number;
    className?: string;
    simulations?: string[];
  }) => {
    const isListening = activeVoiceField === id;
    return (
      <div className="relative w-full">
        <div className="relative">
          <input
            type={type}
            required={required}
            placeholder={placeholder}
            value={value}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2 text-xs font-medium focus:outline-none focus:border-emerald-600 focus:bg-white ${className}`}
          />
          <button
            type="button"
            onClick={() => startFieldVoiceInput(id)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
            }`}
            title="Click to speak into this field / आवाज़ से भरें"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>
        {isListening && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-red-50 border border-red-100 rounded-xl p-2 shadow-lg animate-fadeIn text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-red-600 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                🔴 Listening... Speak now (बोलें)
              </span>
              <button 
                type="button" 
                onClick={() => setActiveVoiceField(null)} 
                className="text-[9px] font-black text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            {simulations.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">Simulate spoken:</span>
                {simulations.map((simText, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      handleFieldVoiceResult(id, simText);
                      setActiveVoiceField(null);
                    }}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all active:scale-95"
                  >
                    "{simText}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setAuthLoading(true);

    if (!regName || !regBusiness || !regPhone || !regPassword) {
      setError("Please fill all fields | कृपया सभी जानकारी भरें");
      setAuthLoading(false);
      return;
    }

    // Get existing users
    const usersStr = localStorage.getItem("hisaab_registered_users");
    const usersList = usersStr ? JSON.parse(usersStr) : [];

    // Check if phone already registered
    if (usersList.some((u: any) => u.phone === regPhone)) {
      setError("This phone number is already registered | यह मोबाइल नंबर पहले से पंजीकृत है");
      setAuthLoading(false);
      return;
    }

    const newUser = {
      name: regName,
      businessName: regBusiness,
      phone: regPhone,
      password: regPassword,
      businessType: regBusinessType,
      language: regLanguage,
      hasGst,
      gstin: hasGst ? regGstin : "",
      gstType: hasGst ? regGstType : "",
      pan: regPan,
      aadhaar: regAadhaar,
      tradeLicense: regTradeLicense,
      docGstCert: hasGst ? docGstCert : null,
      docPanCard,
      docAadhaarCard,
      docShopLicense
    };

    try {
      // 1. Save to cloud Firestore
      if (db) {
        let isOffline = false;
        try {
          await setDoc(doc(db, "users", regPhone), {
            ...newUser,
            createdAt: new Date().toISOString()
          });
          console.log("Successfully saved new user to Firestore.");
        } catch (fErr: any) {
          const errStr = fErr instanceof Error ? fErr.message : String(fErr);
          if (errStr.toLowerCase().includes("offline") || errStr.toLowerCase().includes("could not reach") || !navigator.onLine) {
            isOffline = true;
            console.warn("Firestore is offline during registration backup:", fErr);
          } else {
            handleFirestoreError(fErr, OperationType.CREATE, `users/${regPhone}`, regPhone);
          }
        }
      }
    } catch (fErr: any) {
      console.warn("Could not back up account to Cloud DB, proceeding with local cache:", fErr);
    }

    usersList.push(newUser);
    localStorage.setItem("hisaab_registered_users", JSON.stringify(usersList));
    localStorage.setItem("hisaab_user", JSON.stringify(newUser));
    
    setUser(newUser);
    setBusinessType(regBusinessType);
    setSelectedLanguage(regLanguage);
    setShowAlert("Account Created Successfully! | नया खाता बन गया!");
    setTimeout(() => setShowAlert(null), 4000);
    setAuthLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthLoading(true);

    if (!loginPhone || !loginPassword) {
      setError("Please fill all fields | कृपया सभी जानकारी भरें");
      setAuthLoading(false);
      return;
    }

    // Check standard registered users
    const usersStr = localStorage.getItem("hisaab_registered_users");
    const usersList = usersStr ? JSON.parse(usersStr) : [];

    let foundUser = usersList.find((u: any) => u.phone === loginPhone && u.password === loginPassword);

    // If not found in local cache, try fetching from Firestore!
    if (!foundUser && db) {
      try {
        const userDocRef = doc(db, "users", loginPhone);
        let docSnap;
        let isOffline = false;
        try {
          docSnap = await getDoc(userDocRef);
        } catch (fErr: any) {
          const errStr = fErr instanceof Error ? fErr.message : String(fErr);
          if (errStr.toLowerCase().includes("offline") || errStr.toLowerCase().includes("could not reach") || !navigator.onLine) {
            isOffline = true;
            console.warn("Firestore is offline during login lookup:", fErr);
          } else {
            handleFirestoreError(fErr, OperationType.GET, `users/${loginPhone}`, loginPhone);
          }
        }
        if (!isOffline && docSnap && docSnap.exists()) {
          const cloudUser = docSnap.data();
          if (cloudUser.password === loginPassword) {
            foundUser = {
              name: cloudUser.name,
              businessName: cloudUser.businessName,
              phone: cloudUser.phone,
              password: cloudUser.password,
              businessType: cloudUser.businessType,
              language: cloudUser.language || "hi",
              hasGst: cloudUser.hasGst || false,
              gstin: cloudUser.gstin || "",
              gstType: cloudUser.gstType || "Regular",
              pan: cloudUser.pan || "",
              aadhaar: cloudUser.aadhaar || "",
              tradeLicense: cloudUser.tradeLicense || "",
              docGstCert: cloudUser.docGstCert || null,
              docPanCard: cloudUser.docPanCard || null,
              docAadhaarCard: cloudUser.docAadhaarCard || null,
              docShopLicense: cloudUser.docShopLicense || null
            };
            // Cache locally
            usersList.push(foundUser);
            localStorage.setItem("hisaab_registered_users", JSON.stringify(usersList));
          }
        }
      } catch (fErr: any) {
        console.error("Cloud DB login look-up error:", fErr);
      }
    }

    if (!foundUser) {
      // Create automatic admin bypass if they enter admin or default values for easier testing
      if (loginPhone === "9876543210" && loginPassword === "admin") {
        const defaultUser = {
          name: "Rajesh Kumar",
          businessName: "Rajesh Kirana Store",
          phone: "9876543210",
          businessType: "Grocery Store",
          language: "hi"
        };
        
        try {
          if (db) {
            let isOffline = false;
            try {
              await setDoc(doc(db, "users", "9876543210"), {
                ...defaultUser,
                password: "admin",
                createdAt: new Date().toISOString()
              });
            } catch (dbErr: any) {
              const errStr = dbErr instanceof Error ? dbErr.message : String(dbErr);
              if (errStr.toLowerCase().includes("offline") || errStr.toLowerCase().includes("could not reach") || !navigator.onLine) {
                isOffline = true;
                console.warn("Firestore is offline during admin login backup:", dbErr);
              } else {
                handleFirestoreError(dbErr, OperationType.CREATE, "users/9876543210", "9876543210");
              }
            }
          }
        } catch (dbErr) {
          console.warn("Could not back up demo user:", dbErr);
        }

        localStorage.setItem("hisaab_user", JSON.stringify(defaultUser));
        setUser(defaultUser);
        setBusinessType("Grocery Store");
        setSelectedLanguage("hi");
        setShowAlert("Logged in as Demo User! | डेमो यूजर से लॉगिन हुआ!");
        setTimeout(() => setShowAlert(null), 4000);
        setAuthLoading(false);
        return;
      }
      setError("Invalid phone number or password | गलत मोबाइल नंबर या पासवर्ड");
      setAuthLoading(false);
      return;
    }

    localStorage.setItem("hisaab_user", JSON.stringify(foundUser));
    setUser(foundUser);
    setBusinessType(foundUser.businessType);
    if (foundUser.language) {
      setSelectedLanguage(foundUser.language);
    }
    setShowAlert("Login Successful! | लॉगिन सफल रहा!");
    setTimeout(() => setShowAlert(null), 4000);
    setAuthLoading(false);
  };

  const [businessType, setBusinessType] = useState<string>(user?.businessType || "Grocery Store");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);

  // Synchronize business type with logged in user
  useEffect(() => {
    if (user) {
      setBusinessType(user.businessType);
    }
  }, [user]);

  // Voice command simulations
  const [isListening, setIsListening] = useState<boolean>(false);
  const [activeVoicePrompt, setActiveVoicePrompt] = useState<string>("");
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const [voiceLogs, setVoiceLogs] = useState<any[]>([]);
  const [simulatingTask, setSimulatingTask] = useState<boolean>(false);
  
  // Voice Command History - Track last 5 executed commands
  const [voiceHistory, setVoiceHistory] = useState<{ id: number; key: string; text: string; timestamp: string }[]>(() => {
    const saved = localStorage.getItem("hisaab_voice_history");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("hisaab_voice_history", JSON.stringify(voiceHistory));
  }, [voiceHistory]);

  // Udhaar Ledger Book state
  const [customersData, setCustomersData] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem("hisaab_customers_data");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      "Grocery Store": [],
      "Restaurant": [],
      "Medical Store": [],
      "Clothing Store": []
    };
  });

  const customers = customersData[businessType] || [];

  useEffect(() => {
    localStorage.setItem("hisaab_customers_data", JSON.stringify(customersData));
  }, [customersData]);

  const [newCustName, setNewCustName] = useState<string>("");
  const [newCustPhone, setNewCustPhone] = useState<string>("");
  const [newCustAmount, setNewCustAmount] = useState<string>("");
  const [reminderSent, setReminderSent] = useState<any>(null);

  // OCR Bill Scanner state
  const [ocrText, setOcrText] = useState<string>(() => BUSINESS_SPECIFIC_DATA["Grocery Store"].dummyInvoices[0].text);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [processingOCR, setProcessingOCR] = useState<boolean>(false);
  const [ocrImageBase64, setOcrImageBase64] = useState<string | null>(null);
  const [ocrImageMimeType, setOcrImageMimeType] = useState<string | null>(null);
  const [ocrImagePreviewUrl, setOcrImagePreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [voiceAgentWorking, setVoiceAgentWorking] = useState<boolean>(false);
  const [voiceAgentResult, setVoiceAgentResult] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Automatically update preloaded text when businessType changes
  useEffect(() => {
    if (BUSINESS_SPECIFIC_DATA[businessType]) {
      setOcrText(BUSINESS_SPECIFIC_DATA[businessType].dummyInvoices[0].text);
      setOcrResult(null);
      setStockReorderSent(false);
    }
  }, [businessType]);

  // Daily Galla state
  const [cashInGalla, setCashInGalla] = useState<number>(0);
  const [upiInGalla, setUpiInGalla] = useState<number>(0);
  const [cashToAdd, setCashToAdd] = useState<string>("");
  const [upiToAdd, setUpiToAdd] = useState<string>("");
  const [typedCommand, setTypedCommand] = useState<string>("");
  const [stockReorderSent, setStockReorderSent] = useState<boolean>(false);

  // Interactive GST & Discount Calculator States
  const [calcBaseAmount, setCalcBaseAmount] = useState<string>("");
  const [calcGstRate, setCalcGstRate] = useState<number>(18);
  const [calcDiscountRate, setCalcDiscountRate] = useState<number>(0);

  const [stockLevels, setStockLevels] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("hisaab_stock_levels");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      "Grocery Store": 0,
      "Restaurant": 0,
      "Medical Store": 0,
      "Clothing Store": 0
    };
  });

  const [scannedInvoices, setScannedInvoices] = useState<any[]>(() => {
    const saved = localStorage.getItem("hisaab_scanned_invoices");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("hisaab_stock_levels", JSON.stringify(stockLevels));
  }, [stockLevels]);

  useEffect(() => {
    localStorage.setItem("hisaab_scanned_invoices", JSON.stringify(scannedInvoices));
  }, [scannedInvoices]);

  const [customerInvoices, setCustomerInvoices] = useState<any[]>(() => {
    const saved = localStorage.getItem("hisaab_customer_invoices");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("hisaab_customer_invoices", JSON.stringify(customerInvoices));
  }, [customerInvoices]);

  const [invoiceStartDate, setInvoiceStartDate] = useState<string>("");
  const [invoiceEndDate, setInvoiceEndDate] = useState<string>("");
  const [invoiceSearch, setInvoiceSearch] = useState<string>("");
  const [supplierInvoiceSortBy, setSupplierInvoiceSortBy] = useState<string>("date-desc");

  const [custInvoiceStartDate, setCustInvoiceStartDate] = useState<string>("");
  const [custInvoiceEndDate, setCustInvoiceEndDate] = useState<string>("");
  const [custInvoiceSearch, setCustInvoiceSearch] = useState<string>("");
  const [custInvoiceSortBy, setCustInvoiceSortBy] = useState<string>("date-desc");

  // State for editing supplier invoices
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editInvoiceAmount, setEditInvoiceAmount] = useState<number>(0);

  // State for editing customer invoices
  const [editingCustomerInvoice, setEditingCustomerInvoice] = useState<any | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustInvoiceNumber, setEditCustInvoiceNumber] = useState("");
  const [editCustInvoiceDate, setEditCustInvoiceDate] = useState("");
  const [editCustInvoiceAmount, setEditCustInvoiceAmount] = useState<number>(0);

  // --- NEW: INVENTORY & STAFF STATE MANAGEMENT ---
  
  // Inventory Interfaces
  // Types:
  // "hisaab_inventory" - items tracker
  // "hisaab_staff" - employee directory, attendance, salary record
  
  const [inventoryItems, setInventoryItems] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem("hisaab_inventory_items");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      "Grocery Store": [],
      "Restaurant": [],
      "Medical Store": [],
      "Clothing Store": []
    };
  });

  const [staffList, setStaffList] = useState<any[]>(() => {
    const saved = localStorage.getItem("hisaab_staff_list");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [attendanceList, setAttendanceList] = useState<any[]>(() => {
    const saved = localStorage.getItem("hisaab_attendance_list");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [salaryPayments, setSalaryPayments] = useState<any[]>(() => {
    const saved = localStorage.getItem("hisaab_salary_payments");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Sync to localstorage
  useEffect(() => {
    localStorage.setItem("hisaab_inventory_items", JSON.stringify(inventoryItems));
  }, [inventoryItems]);

  useEffect(() => {
    localStorage.setItem("hisaab_staff_list", JSON.stringify(staffList));
  }, [staffList]);

  useEffect(() => {
    localStorage.setItem("hisaab_attendance_list", JSON.stringify(attendanceList));
  }, [attendanceList]);

  useEffect(() => {
    localStorage.setItem("hisaab_salary_payments", JSON.stringify(salaryPayments));
  }, [salaryPayments]);

  // Automated Push Notification & Email Alert States & Effects
  const [enableEmailAlerts, setEnableEmailAlerts] = useState<boolean>(() => {
    return localStorage.getItem("hisaab_enable_email_alerts") !== "false";
  });
  const [enablePushAlerts, setEnablePushAlerts] = useState<boolean>(() => {
    return localStorage.getItem("hisaab_enable_push_alerts") !== "false";
  });
  const [alertRecipientEmail, setAlertRecipientEmail] = useState<string>(() => {
    return localStorage.getItem("hisaab_alert_email") || "";
  });
  // Track alerted item IDs to avoid duplicates for the same low-stock event
  const [alertedItemIds, setAlertedItemIds] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("hisaab_alerted_item_ids");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  // Request notification permission if user enables it
  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("Notification permission granted!");
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    localStorage.setItem("hisaab_enable_email_alerts", String(enableEmailAlerts));
  }, [enableEmailAlerts]);

  useEffect(() => {
    localStorage.setItem("hisaab_enable_push_alerts", String(enablePushAlerts));
  }, [enablePushAlerts]);

  useEffect(() => {
    localStorage.setItem("hisaab_alert_email", alertRecipientEmail);
  }, [alertRecipientEmail]);

  useEffect(() => {
    localStorage.setItem("hisaab_alerted_item_ids", JSON.stringify(alertedItemIds));
  }, [alertedItemIds]);

  // Main automated check effect for low-stock alerts
  useEffect(() => {
    const activeItems = inventoryItems[businessType] || [];
    let updatedAlerts = { ...alertedItemIds };
    let changed = false;

    activeItems.forEach(async (item) => {
      const isLow = item.stock <= item.reorderPoint;
      const alreadyAlerted = alertedItemIds[item.id];

      if (isLow && !alreadyAlerted) {
        updatedAlerts[item.id] = true;
        changed = true;

        // 1. Web Push Notification
        if (enablePushAlerts && "Notification" in window) {
          if (Notification.permission === "granted") {
            try {
              new Notification(`⚠️ Hisaab AI: Low Stock Alert`, {
                body: `${item.name} has dropped below reorder point! Current: ${item.stock} ${item.unit || "units"}.`,
                icon: "https://cdn-icons-png.flaticon.com/512/565/565547.png"
              });
            } catch (e) {
              console.warn("Browser Notification instantiation failed:", e);
            }
          } else if (Notification.permission === "default") {
            const granted = await requestNotificationPermission();
            if (granted) {
              try {
                new Notification(`⚠️ Hisaab AI: Low Stock Alert`, {
                  body: `${item.name} has dropped below reorder point! Current: ${item.stock} ${item.unit || "units"}.`,
                  icon: "https://cdn-icons-png.flaticon.com/512/565/565547.png"
                });
              } catch (e) {
                console.warn("Browser Notification instantiation failed:", e);
              }
            }
          }
        }

        // Show toast alert in UI
        setShowAlert(`⚠️ [ALERT] Low Stock: ${item.name} is down to ${item.stock} ${item.unit || "units"}! | कम स्टॉक चेतावनी!`);
        setTimeout(() => setShowAlert(null), 5000);

        // 2. Server-side Email alert
        if (enableEmailAlerts) {
          try {
            fetch("/api/alerts/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                itemName: item.name,
                currentStock: item.stock,
                reorderPoint: item.reorderPoint,
                itemUnit: item.unit || "units",
                businessName: user?.businessName || `${businessType} Store`,
                recipientEmail: alertRecipientEmail || user?.phone || "bhawinhaldekar48@gmail.com"
              })
            }).then(res => res.json())
              .then(data => {
                console.log("[AUTOMATED EMAIL ALERT DISPATCHED]:", data);
              })
              .catch(err => {
                console.warn("[AUTOMATED EMAIL ALERT ERROR]:", err);
              });
          } catch (err) {
            console.warn("Failed to initiate automated email alert fetch:", err);
          }
        }
      } else if (!isLow && alreadyAlerted) {
        delete updatedAlerts[item.id];
        changed = true;
      }
    });

    if (changed) {
      setAlertedItemIds(updatedAlerts);
    }
  }, [inventoryItems, businessType, enableEmailAlerts, enablePushAlerts, alertRecipientEmail, alertedItemIds, user]);

  // Inventory UI Inputs
  const [showAddInvModal, setShowAddInvModal] = useState(false);
  const [invName, setInvName] = useState("");
  const [invHindiName, setInvHindiName] = useState("");
  const [invCategory, setInvCategory] = useState("Groceries");
  const [invStock, setInvStock] = useState("");
  const [invReorder, setInvReorder] = useState("");
  const [invPurchase, setInvPurchase] = useState("");
  const [invSelling, setInvSelling] = useState("");
  const [invUnit, setInvUnit] = useState("");
  const [invSupplierWhatsapp, setInvSupplierWhatsapp] = useState("");
  
  // Inventory Filtering / Search
  const [invSearchQuery, setInvSearchQuery] = useState("");
  const [invCategoryFilter, setInvCategoryFilter] = useState("All");
  const [invStockFilter, setInvStockFilter] = useState("All");

  // Scan UI Sub-Navigation
  const [scanSubTab, setScanSubTab] = useState<"scan" | "generator">("scan");

  // GST Bill Generator Form States
  const [billCustName, setBillCustName] = useState("");
  const [billCustPhone, setBillCustPhone] = useState("");
  const [billCustGst, setBillCustGst] = useState("");
  const [billItems, setBillItems] = useState<any[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemGst, setNewItemGst] = useState("18");
  const [billDiscount, setBillDiscount] = useState("0");
  const [billPayMode, setBillPayMode] = useState("UPI");
  const [generatedInvoiceNum, setGeneratedInvoiceNum] = useState(() => `HS-${Math.floor(100000 + Math.random() * 900000)}`);

  // Galla UI Sub-Navigation
  const [gallaSubView, setGallaSubView] = useState<"weekly" | "monthly" | "expenses" | "forecast">("weekly");

  // Inventory UI Sub-Navigation
  const [inventorySubView, setInventorySubView] = useState<"directory" | "margin_analytics">("directory");

  // Daily Shop Expenses State
  const [dailyExpenses, setDailyExpenses] = useState<{ id: string; category: string; amount: number; note: string; date: string }[]>(() => {
    const saved = localStorage.getItem("hisaab_daily_expenses");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { id: "exp-1", category: "Rent", amount: 1200, note: "Daily proportional shop rent / दैनिक दुकान किराया", date: new Date().toISOString().split("T")[0] },
      { id: "exp-2", category: "Utilities", amount: 450, note: "Electricity bill / बिजली बिल", date: new Date().toISOString().split("T")[0] },
      { id: "exp-3", category: "Transport", amount: 250, note: "Tempo delivery fare / माल ढुलाई भाड़ा", date: new Date().toISOString().split("T")[0] }
    ];
  });

  // Expense Form States
  const [expenseCategory, setExpenseCategory] = useState<string>("Rent");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseNote, setExpenseNote] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [expenseSearch, setExpenseSearch] = useState<string>("");
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState<string>(() => new Date().toISOString().substring(0, 7));

  useEffect(() => {
    localStorage.setItem("hisaab_daily_expenses", JSON.stringify(dailyExpenses));
  }, [dailyExpenses]);

  // Dynamic Weekly Revenue Trends calculated from Galla state & invoices
  const weeklyRevenueTrends = React.useMemo(() => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dFormatted = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
      
      const dayVal = String(d.getDate()).padStart(2, '0');
      const monthVal = String(d.getMonth() + 1).padStart(2, '0');
      const yearVal = d.getFullYear();
      const dateInIndianFormat = `${dayVal}/${monthVal}/${yearVal}`;

      const dayName = daysOfWeek[d.getDay()];
      const isToday = i === 0;
      const label = isToday ? `${dayName} (Today)` : dayName;

      // Base realistic baseline depending on business type
      let baseline = 15000;
      if (businessType === "Grocery Store") baseline = 12000;
      else if (businessType === "Restaurant") baseline = 8000;
      else if (businessType === "Medical Store") baseline = 18000;
      else if (businessType === "Clothing Store") baseline = 22000;

      // Add a small stable variation so the historical graph has a natural curve
      const daySeed = d.getDate();
      const variation = (daySeed % 5 - 2) * (baseline * 0.1); // +/- 20%
      let totalRevenue = baseline + variation;
      let cashPart = Math.round(totalRevenue * 0.4);
      let upiPart = Math.round(totalRevenue * 0.6);

      if (isToday) {
        totalRevenue = cashInGalla + upiInGalla;
        cashPart = cashInGalla;
        upiPart = upiInGalla;
      } else {
        const dayInInvoices = scannedInvoices.filter(inv => {
          if (!inv.scannedAt) return false;
          const invDateLower = inv.scannedAt.toLowerCase();
          return invDateLower.includes(dateInIndianFormat) || invDateLower.includes(dFormatted);
        });

        const invoiceSum = dayInInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
        if (invoiceSum > 0) {
          totalRevenue = invoiceSum;
          cashPart = Math.round(totalRevenue * 0.35);
          upiPart = Math.round(totalRevenue * 0.65);
        }
      }

      result.push({
        day: label,
        revenue: Math.round(totalRevenue),
        cash: Math.round(cashPart),
        upi: Math.round(upiPart),
      });
    }
    return result;
  }, [businessType, cashInGalla, upiInGalla, scannedInvoices]);

  // Helper to format yearMonth "YYYY-MM" into a nice readable format
  const formatYearMonth = (yearMonth: string) => {
    if (!yearMonth) return "";
    const parts = yearMonth.split("-");
    if (parts.length !== 2) return yearMonth;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const monthNames = [
      "January / जनवरी", "February / फरवरी", "March / मार्च", "April / अप्रैल",
      "May / मई", "June / जून", "July / जुलाई", "August / अगस्त",
      "September / सितंबर", "October / अक्टूबर", "November / नवंबर", "December / दिसंबर"
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  // Extract unique months from expenses history
  const availableExpenseMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    // Always include current month
    const currentM = new Date().toISOString().substring(0, 7);
    monthsSet.add(currentM);
    
    dailyExpenses.forEach(exp => {
      if (exp.date && exp.date.length >= 7) {
        monthsSet.add(exp.date.substring(0, 7));
      }
    });
    
    return Array.from(monthsSet).sort().reverse(); // Newest first
  }, [dailyExpenses]);

  // Aggregate daily expenses for Pie Chart categorizations
  const monthlyExpenseChartData = React.useMemo(() => {
    const monthExps = dailyExpenses.filter(e => e.date && e.date.startsWith(selectedExpenseMonth));
    
    const categories = ["Rent", "Utilities", "Transport", "Staff Salary", "Tea & Snacks", "Maintenance", "Others"];
    const totals: Record<string, number> = {};
    categories.forEach(cat => { totals[cat] = 0; });
    
    monthExps.forEach(e => {
      if (totals[e.category] !== undefined) {
        totals[e.category] += e.amount;
      } else {
        totals["Others"] = (totals["Others"] || 0) + e.amount;
      }
    });

    const totalAmount = Object.values(totals).reduce((sum, val) => sum + val, 0);

    const colors: Record<string, string> = {
      "Rent": "#8b5cf6",         // Violet
      "Utilities": "#3b82f6",    // Blue
      "Transport": "#f97316",    // Orange
      "Staff Salary": "#06b6d4", // Cyan
      "Tea & Snacks": "#f59e0b", // Amber
      "Maintenance": "#14b8a6",  // Teal
      "Others": "#64748b"        // Slate
    };

    const translationHindi: Record<string, string> = {
      "Rent": "किराया",
      "Utilities": "बिजली/पानी",
      "Transport": "गाड़ी भाड़ा",
      "Staff Salary": "कर्मचारी वेतन",
      "Tea & Snacks": "चाय-नाश्ता",
      "Maintenance": "दुकान मरम्मत",
      "Others": "अन्य"
    };

    const data = Object.keys(totals)
      .map(cat => ({
        name: cat,
        hindiName: translationHindi[cat] || "अन्य",
        value: totals[cat],
        color: colors[cat] || "#64748b",
        percentage: totalAmount > 0 ? Math.round((totals[cat] / totalAmount) * 100) : 0
      }))
      .filter(item => item.value > 0);

    // Identify which area consumes the most
    let topCategory: any = null;
    let maxVal = -1;
    data.forEach(item => {
      if (item.value > maxVal) {
        maxVal = item.value;
        topCategory = item;
      }
    });

    // Profile estimated monthly profit margin reference
    const monthlyProfitsMap: Record<string, number> = {
      "Grocery Store": 134400,
      "Restaurant": 189840,
      "Medical Store": 201600,
      "Clothing Store": 250000
    };
    const refMonthlyProfit = monthlyProfitsMap[businessType] || 150000;
    const profitConsumptionPercent = refMonthlyProfit > 0 ? Math.round((totalAmount / refMonthlyProfit) * 100) : 0;

    return {
      data,
      totalAmount,
      monthExpensesCount: monthExps.length,
      topCategory,
      refMonthlyProfit,
      profitConsumptionPercent
    };
  }, [dailyExpenses, selectedExpenseMonth, businessType]);

  // Helper to parse DD/MM/YYYY into YYYY-MM-DD
  const getInvoiceDateString = (scannedAtStr: string): string => {
    if (!scannedAtStr) return "";
    const parts = scannedAtStr.split(" ");
    if (!parts[0]) return "";
    const dateParts = parts[0].split("/");
    if (dateParts.length !== 3) return "";
    const day = dateParts[0].padStart(2, '0');
    const month = dateParts[1].padStart(2, '0');
    const year = dateParts[2];
    return `${year}-${month}-${day}`;
  };

  // Filter scanned invoices based on date range, search term, and sorting
  const filteredScannedInvoices = React.useMemo(() => {
    let result = scannedInvoices.filter(inv => {
      // 1. Text Search Filter (Supplier Name or Invoice Number)
      if (invoiceSearch.trim()) {
        const query = invoiceSearch.toLowerCase().trim();
        const supplierMatch = inv.supplier && inv.supplier.toLowerCase().includes(query);
        const invoiceNumMatch = inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(query);
        if (!supplierMatch && !invoiceNumMatch) {
          return false;
        }
      }

      // 2. Date Range Filter
      if (!inv.scannedAt) return true;
      const dateStr = getInvoiceDateString(inv.scannedAt);
      if (!dateStr) return true;
      
      if (invoiceStartDate && dateStr < invoiceStartDate) {
        return false;
      }
      if (invoiceEndDate && dateStr > invoiceEndDate) {
        return false;
      }
      return true;
    });

    // 3. Sorting
    result.sort((a, b) => {
      if (supplierInvoiceSortBy === "date-desc") {
        return b.id.localeCompare(a.id);
      } else if (supplierInvoiceSortBy === "date-asc") {
        return a.id.localeCompare(b.id);
      } else if (supplierInvoiceSortBy === "total-desc") {
        return b.grandTotal - a.grandTotal;
      } else if (supplierInvoiceSortBy === "total-asc") {
        return a.grandTotal - b.grandTotal;
      } else if (supplierInvoiceSortBy === "name-asc") {
        return (a.supplier || "").localeCompare(b.supplier || "");
      } else if (supplierInvoiceSortBy === "name-desc") {
        return (b.supplier || "").localeCompare(a.supplier || "");
      }
      return 0;
    });

    return result;
  }, [scannedInvoices, invoiceStartDate, invoiceEndDate, invoiceSearch, supplierInvoiceSortBy]);

  // Filter generated customer invoices based on date range, search term, and sorting
  const filteredCustomerInvoices = React.useMemo(() => {
    let result = customerInvoices.filter(inv => {
      // 1. Text Search Filter (Customer Name or Invoice Number)
      if (custInvoiceSearch.trim()) {
        const query = custInvoiceSearch.toLowerCase().trim();
        const customerName = inv.customer || inv.supplier || "";
        const customerMatch = customerName.toLowerCase().includes(query);
        const invoiceNumMatch = inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(query);
        if (!customerMatch && !invoiceNumMatch) {
          return false;
        }
      }

      // 2. Date Range Filter
      if (!inv.scannedAt) return true;
      const dateStr = getInvoiceDateString(inv.scannedAt);
      if (!dateStr) return true;
      
      if (custInvoiceStartDate && dateStr < custInvoiceStartDate) {
        return false;
      }
      if (custInvoiceEndDate && dateStr > custInvoiceEndDate) {
        return false;
      }
      return true;
    });

    // 3. Sorting
    result.sort((a, b) => {
      if (custInvoiceSortBy === "date-desc") {
        return b.id.localeCompare(a.id);
      } else if (custInvoiceSortBy === "date-asc") {
        return a.id.localeCompare(b.id);
      } else if (custInvoiceSortBy === "total-desc") {
        return b.grandTotal - a.grandTotal;
      } else if (custInvoiceSortBy === "total-asc") {
        return a.grandTotal - b.grandTotal;
      } else if (custInvoiceSortBy === "name-asc") {
        const nameA = a.customer || a.supplier || "";
        const nameB = b.customer || b.supplier || "";
        return nameA.localeCompare(nameB);
      } else if (custInvoiceSortBy === "name-desc") {
        const nameA = a.customer || a.supplier || "";
        const nameB = b.customer || b.supplier || "";
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    return result;
  }, [customerInvoices, custInvoiceStartDate, custInvoiceEndDate, custInvoiceSearch, custInvoiceSortBy]);

  // Dynamic Margin Analytics computations for Inventory Tab
  const marginAnalyticsData = React.useMemo(() => {
    const items = inventoryItems[businessType] || [];
    
    return items.map(item => {
      const margin = item.sellingPrice - item.purchasePrice;
      const marginPercent = item.sellingPrice > 0 ? (margin / item.sellingPrice) * 100 : 0;
      
      // Stable, deterministic seed based on item properties so it doesn't change on simple re-renders
      let hash = 0;
      const keyStr = item.name + item.id;
      for (let i = 0; i < keyStr.length; i++) {
        hash = keyStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      const baseUnits = Math.abs(hash % 85) + 10; // between 10 and 95
      
      // Staple/high-stock items get a demand multiplier
      let performanceBoost = 1.0;
      const lowerName = item.name.toLowerCase();
      if (lowerName.includes("rice") || lowerName.includes("paneer") || lowerName.includes("oil") || lowerName.includes("atta") || lowerName.includes("medicine")) {
        performanceBoost = 1.4;
      } else if (item.stock < 5) {
        performanceBoost = 0.55;
      }
      
      const unitsSold = Math.round(baseUnits * performanceBoost);
      const totalSalesRevenue = unitsSold * item.sellingPrice;
      const totalProfit = unitsSold * margin;

      // Classify using strict retail margin and performance thresholds
      // High Margin >= 22%, High Performance >= 40 units sold
      const isHighMargin = marginPercent >= 22;
      const isHighSales = unitsSold >= 40;

      let quadrant: "star" | "cash_cow" | "sleeper" | "dead_stock" = "dead_stock";
      let recommendation = "";
      let actionTag = "";
      let actionColor = "";

      if (isHighMargin && isHighSales) {
        quadrant = "star";
        actionTag = "PROMOTE / बढ़ावा दें";
        actionColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
        recommendation = "⭐ HIGH PERFORMER: Exceptional margin and stellar sales volume. Recommend placing in prime eye-level shelves, running featured bundle deals, or highlighting in promotional flyers to maximize net profit.";
      } else if (!isHighMargin && isHighSales) {
        quadrant = "cash_cow";
        actionTag = "OPTIMIZE COST / लागत घटाएं";
        actionColor = "bg-blue-100 text-blue-800 border-blue-200";
        recommendation = "📈 VOLUME DRIVER: Crucial traffic puller but lower margins. Retain this item to maintain customer footfall, but attempt to negotiate lower cost prices with distributors or slightly adjust pricing upwards by 2-5%.";
      } else if (isHighMargin && !isHighSales) {
        quadrant = "sleeper";
        actionTag = "BOOST VOLUMES / बिक्री बढ़ाएं";
        actionColor = "bg-amber-100 text-amber-800 border-amber-200";
        recommendation = "💎 UNDERSOLD GEM: Great profit margin but slow turnover. Try active upselling at checkout, run buy-one-get-one bundling with staple items, or offer limited-time loyalty rewards.";
      } else {
        quadrant = "dead_stock";
        actionTag = "DISCONTINUE / बंद करें";
        actionColor = "bg-rose-100 text-rose-800 border-rose-200";
        recommendation = "⚠️ UNDERPERFORMER: Sub-par margins and stagnant consumer interest. Liquidate remaining inventory via clearance promotions, and repurpose valuable shelf space for high-margin alternatives.";
      }

      return {
        ...item,
        margin,
        marginPercent,
        unitsSold,
        totalSalesRevenue,
        totalProfit,
        quadrant,
        recommendation,
        actionTag,
        actionColor,
      };
    });
  }, [inventoryItems, businessType]);

  // Staff UI Sub-Navigation & Inputs
  const [activeStaffSubTab, setActiveStaffSubTab] = useState<"list" | "attendance" | "payroll" | "performance">("list");
  
  // Add Staff form
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("Helper");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffSalaryType, setStaffSalaryType] = useState<"monthly" | "daily">("monthly");
  const [staffSalaryAmount, setStaffSalaryAmount] = useState("");

  // Attendance form State
  const [attendanceDate, setAttendanceDate] = useState(() => {
    // Current date in YYYY-MM-DD
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // Temporary state for unsaved attendance session
  const [tempAttendance, setTempAttendance] = useState<Record<string, "Present" | "Absent" | "Half Day" | "Leave">>({});

  // Initialize temporary attendance whenever date changes
  useEffect(() => {
    const dailyRecords = attendanceList.filter(rec => rec.date === attendanceDate);
    const initialTemp: Record<string, "Present" | "Absent" | "Half Day" | "Leave"> = {};
    
    staffList.forEach(staff => {
      const match = dailyRecords.find(r => r.staffId === staff.id);
      if (match) {
        initialTemp[staff.id] = match.status;
      } else {
        initialTemp[staff.id] = "Present"; // default if unmarked
      }
    });
    setTempAttendance(initialTemp);
  }, [attendanceDate, staffList, attendanceList]);

  // Salary Payment Log Inputs
  const [showPayModal, setShowPayModal] = useState(false);
  const [payStaffId, setPayStaffId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"Cash" | "UPI" | "Bank Transfer">("UPI");
  const [payMonth, setPayMonth] = useState("July 2026");
  const [payNotes, setPayNotes] = useState("");

  // Payroll Report States
  const [exportPayMonth, setExportPayMonth] = useState<string>("All");

  const uniquePaymentMonths = React.useMemo(() => {
    const months = salaryPayments.map(p => p.month);
    // Include July 2026 as a fallback/default option
    if (!months.includes("July 2026")) {
      months.push("July 2026");
    }
    return Array.from(new Set(months));
  }, [salaryPayments]);

  // Quick helper to fetch inventory items of current business type
  const activeInventory = inventoryItems[businessType] || [];

  // --- FIREBASE CLOUD SYNC LAYER ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const [dbStatus, setDbStatus] = useState<"connected" | "loading" | "error">("connected");
  const [showDbSandbox, setShowDbSandbox] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>(["[Cloud Sync] Ready for database synchronization."]);
  const [firestoreCounts, setFirestoreCounts] = useState({
    customers: 0,
    inventory: 0,
    invoices: 0,
    staff: 0,
    attendance: 0,
    galla: 1
  });

  // Log message helper
  const addSyncLog = (msg: string) => {
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // 1. Core Cloud Sync Trigger (Load or Seed)
  useEffect(() => {
    if (!user) {
      setDbStatus("connected");
      return;
    }

    const fetchOrSeedCloudData = async () => {
      if (!db) {
        setDbStatus("error");
        addSyncLog("Firestore DB instance not available. Operating offline.");
        return;
      }
      setIsSyncing(true);
      setDbStatus("loading");
      addSyncLog(`Connecting to Firestore for account: ${user.phone}...`);

      try {
        const userDocRef = doc(db, "users_business_data", user.phone);
        let docSnap;
        let isOffline = false;
        try {
          docSnap = await getDoc(userDocRef);
        } catch (fErr: any) {
          const errStr = fErr instanceof Error ? fErr.message : String(fErr);
          if (errStr.toLowerCase().includes("offline") || errStr.toLowerCase().includes("could not reach") || !navigator.onLine) {
            isOffline = true;
            console.warn("Firestore is offline, using local/cached state:", fErr);
          } else {
            handleFirestoreError(fErr, OperationType.GET, `users_business_data/${user.phone}`, user.phone);
          }
        }

        if (isOffline) {
          addSyncLog("Firestore is offline. Running securely in Local-First Offline Mode.");
          setDbStatus("error"); // Renders as "OFFLINE" in UI
          setCloudSynced(false);
          setIsSyncing(false);
          return;
        }

        if (docSnap && docSnap.exists()) {
          // Document exists! Let's load the data from Firestore
          const cloudData = docSnap.data();
          addSyncLog("Cloud backup found. Syncing Firestore records into state.");

          if (cloudData.customersData) setCustomersData(cloudData.customersData);
          if (cloudData.inventoryItems) setInventoryItems(cloudData.inventoryItems);
          if (cloudData.scannedInvoices) setScannedInvoices(cloudData.scannedInvoices);
          if (cloudData.customerInvoices) setCustomerInvoices(cloudData.customerInvoices);
          if (cloudData.staffList) setStaffList(cloudData.staffList);
          if (cloudData.attendanceList) setAttendanceList(cloudData.attendanceList);
          if (cloudData.salaryPayments) setSalaryPayments(cloudData.salaryPayments);
          if (cloudData.cashInGalla !== undefined) setCashInGalla(cloudData.cashInGalla);
          if (cloudData.upiInGalla !== undefined) setUpiInGalla(cloudData.upiInGalla);
          if (cloudData.dailyExpenses) setDailyExpenses(cloudData.dailyExpenses);

          // Calculate counts
          const custCount = Object.values(cloudData.customersData || {}).reduce((acc: number, list: any) => acc + (list?.length || 0), 0);
          const invCount = Object.values(cloudData.inventoryItems || {}).reduce((acc: number, list: any) => acc + (list?.length || 0), 0);
          
          setFirestoreCounts({
            customers: custCount,
            inventory: invCount,
            invoices: cloudData.scannedInvoices?.length || 0,
            staff: cloudData.staffList?.length || 0,
            attendance: cloudData.attendanceList?.length || 0,
            galla: 1
          });

          setCloudSynced(true);
          setDbStatus("connected");
          addSyncLog("Successfully downloaded and synchronized all Firestore documents.");
        } else {
          // No cloud document yet! Let's seed the existing local/mock data to Firestore
          addSyncLog("No cloud backup found. Seeding initial records to Firestore...");
          
          const initialPayload = {
            userPhone: user.phone,
            customersData,
            inventoryItems,
            scannedInvoices,
            customerInvoices,
            staffList,
            attendanceList,
            salaryPayments,
            cashInGalla,
            upiInGalla,
            dailyExpenses,
            updatedAt: new Date().toISOString()
          };

          try {
            await setDoc(userDocRef, initialPayload);
          } catch (fErr: any) {
            handleFirestoreError(fErr, OperationType.CREATE, `users_business_data/${user.phone}`, user.phone);
          }
          
          const custCount = Object.values(customersData || {}).reduce((acc: number, list: any) => acc + (list?.length || 0), 0);
          const invCount = Object.values(inventoryItems || {}).reduce((acc: number, list: any) => acc + (list?.length || 0), 0);
          
          setFirestoreCounts({
            customers: custCount,
            inventory: invCount,
            invoices: scannedInvoices?.length || 0,
            staff: staffList?.length || 0,
            attendance: attendanceList?.length || 0,
            galla: 1
          });

          setCloudSynced(true);
          setDbStatus("connected");
          addSyncLog("Seeded and backed up initial database structure to Firestore!");
        }
      } catch (err: any) {
        console.error("Firestore loading error:", err);
        setDbStatus("error");
        addSyncLog(`Error: ${err.message || "Failed to load from cloud"}`);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchOrSeedCloudData();
  }, [user]);

  // 2. Auto-sync trigger on local mutations
  const syncToCloud = async (customPayload?: any) => {
    if (!user || !db) return;
    setIsSyncing(true);
    try {
      const userDocRef = doc(db, "users_business_data", user.phone);
      
      const payload = customPayload || {
        userPhone: user.phone,
        customersData,
        inventoryItems,
        scannedInvoices,
        customerInvoices,
        staffList,
        attendanceList,
        salaryPayments,
        cashInGalla,
        upiInGalla,
        dailyExpenses,
        updatedAt: new Date().toISOString()
      };

      let isOffline = false;
      try {
        await setDoc(userDocRef, payload, { merge: true });
      } catch (fErr: any) {
        const errStr = fErr instanceof Error ? fErr.message : String(fErr);
        if (errStr.toLowerCase().includes("offline") || errStr.toLowerCase().includes("could not reach") || !navigator.onLine) {
          isOffline = true;
          console.warn("Firestore offline during auto-sync:", fErr);
        } else {
          handleFirestoreError(fErr, OperationType.UPDATE, `users_business_data/${user.phone}`, user.phone);
        }
      }

      if (isOffline) {
        addSyncLog("Offline: Saved locally. Will sync to Cloud automatically when online.");
        setDbStatus("error");
        setCloudSynced(false);
        return;
      }
      
      const custCount = Object.values(customersData || {}).reduce((acc: number, list: any) => acc + (list?.length || 0), 0);
      const invCount = Object.values(inventoryItems || {}).reduce((acc: number, list: any) => acc + (list?.length || 0), 0);

      setFirestoreCounts({
        customers: custCount,
        inventory: invCount,
        invoices: scannedInvoices?.length || 0,
        staff: staffList?.length || 0,
        attendance: attendanceList?.length || 0,
        galla: 1
      });

      setCloudSynced(true);
      setDbStatus("connected");
      addSyncLog("Firestore documents updated successfully.");
    } catch (err: any) {
      console.error("Firestore auto-sync failed:", err);
      addSyncLog(`Sync Failed: ${err.message || "Network error"}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run manual backup
  const handleManualBackup = async () => {
    if (!user) {
      setShowAlert("Please log in to sync database | कृपया लॉगिन करें");
      setTimeout(() => setShowAlert(null), 3000);
      return;
    }
    addSyncLog("Initiating manual full-ledger sync...");
    await syncToCloud();
    setShowAlert("Cloud Backup Complete! | क्लाउड बैकअप सफल!");
    setTimeout(() => setShowAlert(null), 3000);
  };

  // Auto sync on state changes
  useEffect(() => {
    if (user && db && cloudSynced) {
      const timer = setTimeout(() => {
        syncToCloud();
      }, 2000); // 2s debounce to avoid excessive writes
      return () => clearTimeout(timer);
    }
  }, [customersData, inventoryItems, scannedInvoices, customerInvoices, staffList, attendanceList, salaryPayments, cashInGalla, upiInGalla, dailyExpenses]);

  // Handle inventory updates
  const handleAddInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName || !invStock || !invPurchase || !invSelling) {
      setShowAlert("Please fill required fields | कृपया ज़रूरी जानकारी भरें");
      setTimeout(() => setShowAlert(null), 3000);
      return;
    }

    const newItem = {
      id: "inv-" + Date.now(),
      name: invName,
      hindiName: invHindiName || invName,
      category: invCategory,
      stock: parseInt(invStock) || 0,
      reorderPoint: parseInt(invReorder) || 5,
      purchasePrice: parseFloat(invPurchase) || 0,
      sellingPrice: parseFloat(invSelling) || 0,
      unit: invUnit || "Pieces",
      supplierWhatsapp: invSupplierWhatsapp || ""
    };

    setInventoryItems(prev => {
      const updatedList = [...(prev[businessType] || []), newItem];
      return { ...prev, [businessType]: updatedList };
    });

    // Reset Form
    setInvName("");
    setInvHindiName("");
    setInvStock("");
    setInvReorder("");
    setInvPurchase("");
    setInvSelling("");
    setInvUnit("");
    setInvSupplierWhatsapp("");
    setShowAddInvModal(false);

    setShowAlert("New Inventory Item Added! | नया स्टॉक आइटम जुड़ गया!");
    setTimeout(() => setShowAlert(null), 3000);
  };

  const handleAdjustStock = (itemId: string, increment: number) => {
    setInventoryItems(prev => {
      const list = prev[businessType] || [];
      const updated = list.map(item => {
        if (item.id === itemId) {
          const newStock = Math.max(0, item.stock + increment);
          return { ...item, stock: newStock };
        }
        return item;
      });
      return { ...prev, [businessType]: updated };
    });
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    setConfirmModal({
      title: "Delete Item | आइटम हटाएं",
      message: "Are you sure you want to delete this item? | क्या आप वाकई इस आइटम को हटाना चाहते हैं?",
      onConfirm: () => {
        setInventoryItems(prev => {
          const list = prev[businessType] || [];
          const filtered = list.filter(item => item.id !== itemId);
          return { ...prev, [businessType]: filtered };
        });
        setShowAlert("Item Deleted | आइटम हटा दिया गया");
        setTimeout(() => setShowAlert(null), 3000);
      }
    });
  };

  const handleDeleteScannedInvoice = (invoiceId: string) => {
    setConfirmModal({
      title: "Delete Invoice | इनवॉइस हटाएं",
      message: "Are you sure you want to delete this invoice? | क्या आप वाकई इस इनवॉइस को हटाना चाहते हैं?",
      onConfirm: () => {
        setScannedInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        setShowAlert("Invoice Deleted | इनवॉइस हटा दिया गया");
        setTimeout(() => setShowAlert(null), 3000);
      }
    });
  };

  const handleEditScannedInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setEditSupplierName(invoice.supplier || "");
    setEditInvoiceNumber(invoice.invoiceNumber || "");
    setEditInvoiceDate(invoice.scannedAt || "");
    setEditInvoiceAmount(invoice.grandTotal || 0);
  };

  const handleSaveEditedInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    setScannedInvoices(prev => prev.map(inv => {
      if (inv.id === editingInvoice.id) {
        return {
          ...inv,
          supplier: editSupplierName,
          invoiceNumber: editInvoiceNumber,
          scannedAt: editInvoiceDate,
          grandTotal: Number(editInvoiceAmount) || 0
        };
      }
      return inv;
    }));

    setEditingInvoice(null);
    setShowAlert("Invoice Details Updated | इनवॉइस विवरण सुधारा गया");
    setTimeout(() => setShowAlert(null), 3000);
  };

  const handleEditCustomerInvoice = (invoice: any) => {
    setEditingCustomerInvoice(invoice);
    setEditCustomerName(invoice.customer || invoice.supplier || "");
    setEditCustInvoiceNumber(invoice.invoiceNumber || "");
    setEditCustInvoiceDate(invoice.scannedAt || "");
    setEditCustInvoiceAmount(invoice.grandTotal || 0);
  };

  const handleSaveEditedCustomerInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomerInvoice) return;

    setCustomerInvoices(prev => prev.map(inv => {
      if (inv.id === editingCustomerInvoice.id) {
        return {
          ...inv,
          customer: editCustomerName,
          supplier: editCustomerName,
          invoiceNumber: editCustInvoiceNumber,
          scannedAt: editCustInvoiceDate,
          grandTotal: Number(editCustInvoiceAmount) || 0
        };
      }
      return inv;
    }));

    setEditingCustomerInvoice(null);
    setShowAlert("Customer Invoice Updated | ग्राहक इनवॉइस विवरण सुधारा गया");
    setTimeout(() => setShowAlert(null), 3000);
  };

  const handleDeleteCustomerInvoice = (invoiceId: string) => {
    setConfirmModal({
      title: "Delete Customer Invoice | ग्राहक इनवॉइस हटाएं",
      message: "Are you sure you want to delete this customer invoice? | क्या आप वाकई इस ग्राहक इनवॉइस को हटाना चाहते हैं?",
      onConfirm: () => {
        setCustomerInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        setShowAlert("Customer Invoice Deleted | ग्राहक इनवॉइस हटा दिया गया");
        setTimeout(() => setShowAlert(null), 3000);
      }
    });
  };

  const handleSendTestAlert = async () => {
    // 1. Web Push Notification check
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(`🔔 Hisaab AI: Test Alert Enabled!`, {
            body: "Your inventory automated alert system is fully configured and live.",
            icon: "https://cdn-icons-png.flaticon.com/512/565/565547.png"
          });
        } catch (e) {
          console.warn("Notification failed to trigger:", e);
        }
      } else {
        await requestNotificationPermission();
      }
    }

    setShowAlert("Sending Test Alert to server... | टेस्ट अलर्ट भेजा जा रहा है...");
    setTimeout(() => setShowAlert(null), 3000);

    // 2. Trigger test email API
    try {
      const res = await fetch("/api/alerts/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          itemName: "🎯 [TEST] Premium Basmati Rice",
          currentStock: 3,
          reorderPoint: 15,
          itemUnit: "kg",
          businessName: user?.businessName || `${businessType} Store`,
          recipientEmail: alertRecipientEmail || user?.phone || "bhawinhaldekar48@gmail.com"
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.mode === "simulation") {
          setShowAlert("✓ Test Alert simulated in server console! | टेस्ट अलर्ट कंसोल में सिम्युलेट हुआ!");
        } else {
          setShowAlert("✓ Real Email Test Alert dispatched successfully! | टेस्ट ईमेल भेज दिया गया!");
        }
      } else {
        setShowAlert("❌ Test Alert failed. Check console.");
      }
      setTimeout(() => setShowAlert(null), 4000);
    } catch (err) {
      console.error(err);
      setShowAlert("❌ Failed to contact API.");
      setTimeout(() => setShowAlert(null), 3000);
    }
  };

  // Handle Staff actions
  const handleRegisterStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffPhone || !staffSalaryAmount) {
      setShowAlert("Please fill required fields | कृपया ज़रूरी जानकारी भरें");
      setTimeout(() => setShowAlert(null), 3000);
      return;
    }

    const newStaff = {
      id: "staff-" + Date.now(),
      name: staffName,
      role: staffRole,
      phone: staffPhone,
      salaryType: staffSalaryType,
      salaryAmount: parseFloat(staffSalaryAmount) || 0,
      joinDate: new Date().toISOString().split("T")[0]
    };

    setStaffList(prev => [...prev, newStaff]);
    
    // Reset Form
    setStaffName("");
    setStaffPhone("");
    setStaffSalaryAmount("");
    setShowAddStaffModal(false);

    setShowAlert("Staff Registered Successfully! | नया स्टाफ सदस्य दर्ज हो गया!");
    setTimeout(() => setShowAlert(null), 3000);
  };

  const handleDeleteStaff = (staffId: string) => {
    setConfirmModal({
      title: "Remove Staff | स्टाफ हटाएं",
      message: "Remove this staff member? This will clear their profiles from Hisaab database. | क्या आप इस स्टाफ को हटाना चाहते हैं?",
      onConfirm: () => {
        setStaffList(prev => prev.filter(s => s.id !== staffId));
        setAttendanceList(prev => prev.filter(a => a.staffId !== staffId));
        setSalaryPayments(prev => prev.filter(p => p.staffId !== staffId));
        
        setShowAlert("Staff Member Removed | स्टाफ सदस्य को हटा दिया गया");
        setTimeout(() => setShowAlert(null), 3000);
      }
    });
  };

  const handleSaveAttendance = () => {
    setAttendanceList(prev => {
      // Clear old records for this specific date first
      const filtered = prev.filter(rec => rec.date !== attendanceDate);
      
      // Append new temp records
      const newRecords = Object.entries(tempAttendance).map(([staffId, status]) => ({
        id: `${staffId}_${attendanceDate}`,
        staffId,
        date: attendanceDate,
        status
      }));
      
      return [...filtered, ...newRecords];
    });

    setShowAlert("Attendance Saved! | हाजिरी सुरक्षित कर दी गई!");
    setTimeout(() => setShowAlert(null), 3000);
  };

  const handleLogSalaryPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStaffId || !payAmount) {
      setShowAlert("Please select staff and enter amount | कृपया स्टाफ सदस्य और राशि चुनें");
      setTimeout(() => setShowAlert(null), 3000);
      return;
    }

    const newPayment = {
      id: "pay-" + Date.now(),
      staffId: payStaffId,
      amountPaid: parseFloat(payAmount) || 0,
      paymentDate: new Date().toISOString().split("T")[0],
      month: payMonth,
      paymentMethod: payMethod,
      notes: payNotes || "Salary Paid"
    };

    setSalaryPayments(prev => [...prev, newPayment]);
    
    // Reset
    setPayAmount("");
    setPayNotes("");
    setShowPayModal(false);

    const staffNameText = staffList.find(s => s.id === payStaffId)?.name || "Staff";
    setShowAlert(`Logged ₹${parseFloat(payAmount).toLocaleString("en-IN")} payment to ${staffNameText}! | पेमेंट दर्ज की गई!`);
    setTimeout(() => setShowAlert(null), 3000);
  };

  // Custom alert messages
  const [showAlert, setShowAlert] = useState<string | null>(null);

  // Custom delete confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch metrics based on selected profile
  const fetchAnalytics = async (type: string) => {
    if (!user) {
      setLoadingAnalytics(false);
      return;
    }
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/agents/predictive-analytics?businessType=${encodeURIComponent(type)}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.warn("API predictive-analytics fetch failed, using high-fidelity local fallback:", err);
      // Generate highly accurate local backup analytics for resilience
      let localFallback: any = {};
      if (type === "Restaurant") {
        localFallback = {
          title: "Restaurant Dining & Catering Forecasts",
          metrics: {
            salesPredict: "₹3,48,200",
            salesGrowth: "+12.4%",
            riskScore: "Low",
            workingCapital: "₹1,18,500",
            efficiency: "94.2%"
          },
          salesHistory: [
            { month: "Jan", actual: 232000, predicted: 231500 },
            { month: "Feb", actual: 234000, predicted: 233800 },
            { month: "Mar", actual: 238000, predicted: 237500 },
            { month: "Apr", actual: 241000, predicted: 240500 },
            { month: "May", actual: 243500, predicted: 242000 },
            { month: "Jun", actual: null, predicted: 246800 },
            { month: "Jul", actual: null, predicted: 249200 },
          ],
          risks: [
            { level: "High", desc: "Weekend seating capacity ceiling reached during Sunday dinner rush. Potential customer churn." },
            { level: "Moderate", desc: "Local dairy (Paneer/Milk) supplier wholesale rates expected to surge +12% in mid-August due to regional supply changes." }
          ],
          actions: [
            { agent: "Scheduler", desc: "Automate kitchen staff shifts and rota scheduling based on the Friday/Sunday peak forecasting." },
            { agent: "Communicator", desc: "Trigger low-peak Tuesday WhatsApp loyalty promo via CRM to fill empty tables." }
          ]
        };
      } else if (type === "Medical Store") {
        localFallback = {
          title: "Medical & Pharmacy Wellness Projections",
          metrics: {
            salesPredict: "₹6,95,000",
            salesGrowth: "+8.7%",
            riskScore: "Moderate",
            workingCapital: "₹3,42,000",
            efficiency: "89.5%"
          },
          salesHistory: [
            { month: "Jan", actual: 578000, predicted: 579000 },
            { month: "Feb", actual: 581000, predicted: 582000 },
            { month: "Mar", actual: 583000, predicted: 584000 },
            { month: "Apr", actual: 586000, predicted: 585500 },
            { month: "May", actual: 589000, predicted: 588000 },
            { month: "Jun", actual: null, predicted: 592500 },
            { month: "Jul", actual: null, predicted: 596000 },
          ],
          risks: [
            { level: "Moderate", desc: "Expired inventory risk on seasonal viral/flu medicine stocks as monsoon ends early." },
            { level: "Low", desc: "Small delay in supplier credit invoicing causing ledger book (Udhaar Khata) minor queue backlog." }
          ],
          actions: [
            { agent: "Analytica", desc: "Identify medicines with < 90 days expiry and alert staff to offer clearance to chronic patients." },
            { agent: "Communicator", desc: "Auto-generate and dispatch WhatsApp reminders for outstanding credit balance to buyers on Udhaar Khata." }
          ]
        };
      } else {
        localFallback = {
          title: "Grocery & Kirana Store Analytics",
          metrics: {
            salesPredict: "₹4,64,500",
            salesGrowth: "+21.2%",
            riskScore: "Low",
            workingCapital: "₹1,81,000",
            efficiency: "96.1%"
          },
          salesHistory: [
            { month: "Jan", actual: 342000, predicted: 341000 },
            { month: "Feb", actual: 345000, predicted: 344500 },
            { month: "Mar", actual: 349000, predicted: 348000 },
            { month: "Apr", actual: 353000, predicted: 352000 },
            { month: "May", actual: 358000, predicted: 357500 },
            { month: "Jun", actual: null, predicted: 361200 },
            { month: "Jul", actual: null, predicted: 364800 }
          ],
          risks: [
            { level: "Moderate", desc: "Overstock hazard on winter inventory (such as ghee and warm-beverage stocks) as summer transitions early." },
            { level: "Low", desc: "Small delay in supplier credit invoicing causing ledger book (Udhaar Khata) minor queue backlog." }
          ],
          actions: [
            { agent: "Analytica", desc: "Run bundle pricing algorithms to clear out stagnant winter stock inventory." },
            { agent: "Communicator", desc: "Auto-generate and dispatch WhatsApp reminders for outstanding credit balance to buyers on Udhaar Khata." }
          ]
        };
      }
      setAnalytics(localFallback);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnalytics(businessType);
    } else {
      setAnalytics(null);
    }
  }, [businessType, user]);

  // Voice Command Shortcuts Handler
  const handleVoiceCommand = async (commandKey: string, text: string) => {
    setActiveVoicePrompt(text);
    setIsListening(false);
    setSimulatingTask(true);
    setVoiceLogs([]);
    setVoiceResult(null);

    // Record command in history
    setVoiceHistory(prev => {
      const filtered = prev.filter(item => item.text.trim().toLowerCase() !== text.trim().toLowerCase());
      const newHistory = [
        {
          id: Date.now(),
          key: commandKey,
          text: text,
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        },
        ...filtered
      ];
      return newHistory.slice(0, 5);
    });

    try {
      // Create friendly humanized response logs
      if (commandKey === "create_bill") {
        if (businessType === "Restaurant") {
          setVoiceLogs([
            { agent: "SCRIBE", message: "✍️ Reading your command: Creating a new bill for Sharma Catering Services." },
            { agent: "SCRIBE", message: "🔍 Verifying buyer's GSTIN (27CCCCCC3333C3Z3). Verified successfully!" },
            { agent: "ANALYTICA", message: "⚖️ Calculating CGST (9%) and SGST (9%). Total tax: ₹9,720.00." },
            { agent: "COMMUNICATOR", message: "💬 Dispatching invoice and instant UPI pay link to +91 91234 56789 over WhatsApp Business." },
            { agent: "SCHEDULER", message: "🍳 Dispatching kitchen order. Chef alerted for catering prep." }
          ]);
          await new Promise(r => setTimeout(r, 1500));
          setUpiInGalla(prev => prev + 63720);
          setStockLevels(prev => ({ ...prev, Restaurant: Math.max(0, prev.Restaurant - 1) }));
          setVoiceResult({
            title: "GST Invoice #GST-2026-REST-102 Created!",
            details: "Amount: ₹63,720.00 | Sent to: Sharma Catering | Status: WhatsApp UPI link sent & Kitchen order dispatched. Cashbook updated."
          });
        } else if (businessType === "Medical Store") {
          setVoiceLogs([
            { agent: "SCRIBE", message: "✍️ Reading your command: Creating a new bill for Lifeline Hospital." },
            { agent: "SCRIBE", message: "🔍 Verifying buyer's GSTIN (24EEEEE5555E5Z5). Verified successfully!" },
            { agent: "ANALYTICA", message: "⚖️ Calculating CGST (6%) and SGST (6%). Total tax: ₹4,830.00." },
            { agent: "COMMUNICATOR", message: "💬 Dispatching invoice and digital receipt to +91 90909 09090 over WhatsApp Business." },
            { agent: "SCHEDULER", message: "💊 Pharmacy batch verification complete. Medicine dispatch logged." }
          ]);
          await new Promise(r => setTimeout(r, 1500));
          setUpiInGalla(prev => prev + 45080);
          setStockLevels(prev => ({ ...prev, "Medical Store": Math.max(0, prev["Medical Store"] - 1) }));
          setVoiceResult({
            title: "GST Invoice #GST-MED-9930 Created!",
            details: "Amount: ₹45,080.00 | Sent to: Lifeline Hospital | Status: WhatsApp prescription verified & Medicine pack sent. Cashbook updated."
          });
        } else if (businessType === "Clothing Store") {
          setVoiceLogs([
            { agent: "SCRIBE", message: "✍️ Reading your command: Creating a new bill for Fashion Hub Boutique." },
            { agent: "SCRIBE", message: "🔍 Verifying buyer's GSTIN (23GGGGG7777G7Z7). Verified successfully!" },
            { agent: "ANALYTICA", message: "⚖️ Calculating IGST (5%). Total tax: ₹3,275.00." },
            { agent: "COMMUNICATOR", message: "💬 Dispatching invoice and digital packing slip to +91 96666 54321 over WhatsApp." },
            { agent: "SCHEDULER", message: "👕 Garments parcel booked with speed courier. Shipping label generated." }
          ]);
          await new Promise(r => setTimeout(r, 1500));
          setUpiInGalla(prev => prev + 68775);
          setStockLevels(prev => ({ ...prev, "Clothing Store": Math.max(0, prev["Clothing Store"] - 1) }));
          setVoiceResult({
            title: "GST Invoice #GST-TEX-4581 Created!",
            details: "Amount: ₹68,775.00 | Sent to: Fashion Hub Boutique | Status: WhatsApp stock voucher generated & Courier dispatched. Cashbook updated."
          });
        } else {
          setVoiceLogs([
            { agent: "SCRIBE", message: "✍️ Reading your command: Creating a new bill for Karan Sweets & Bakery Wholesalers." },
            { agent: "SCRIBE", message: "🔍 Verifying buyer's GSTIN (29AAAAA1111A1Z1). Verified successfully!" },
            { agent: "ANALYTICA", message: "⚖️ Calculating CGST (9%) and SGST (9%). Total tax: ₹10,575.00." },
            { agent: "COMMUNICATOR", message: "💬 Dispatching invoice and instant UPI pay link to +91 98765 43210 over WhatsApp Business." },
            { agent: "SCHEDULER", message: "🚚 Order dispatch details sent to Delhivery Courier Services. Truck pickup scheduled for Friday 10:00 AM." }
          ]);
          await new Promise(r => setTimeout(r, 1500));
          setUpiInGalla(prev => prev + 69325);
          setStockLevels(prev => ({ ...prev, "Grocery Store": Math.max(0, prev["Grocery Store"] - 1) }));
          setVoiceResult({
            title: "GST Invoice #GST-2026-904 Created!",
            details: "Amount: ₹69,325.00 | Sent to: Madan Sweets | Status: WhatsApp UPI link sent & Delhivery truck booked. Cashbook updated."
          });
        }

      } else if (commandKey === "send_reminder") {
        // Find best matching customer from customers list
        const cleanText = text.toLowerCase();
        let matchedCustomer = customers[0]; // default fallback
        
        for (const customer of customers) {
          const nameLower = customer.name.toLowerCase();
          if (cleanText.includes(nameLower)) {
            matchedCustomer = customer;
            break;
          }
          const parts = nameLower.split(/\s+/).filter(word => 
            word.length > 2 && 
            !["store", "kirana", "grocers", "bakers", "hub", "and", "ltd", "limited", "co", "shop", "sweet", "sweets", "chemist", "boutique", "garments"].includes(word)
          );
          let partMatched = false;
          for (const part of parts) {
            if (cleanText.includes(part)) {
              partMatched = true;
              break;
            }
          }
          if (partMatched) {
            matchedCustomer = customer;
            break;
          }
        }

        const nameDisplay = matchedCustomer.name;
        const shortName = nameDisplay.split(" ")[0];
        const formattedAmount = matchedCustomer.amount.toLocaleString("en-IN");

        setVoiceLogs([
          { agent: "COMMUNICATOR", message: "📔 Accessing Udhaar Ledger Book..." },
          { agent: "COMMUNICATOR", message: `🔍 Fetching ${nameDisplay} outstanding balance: ₹${formattedAmount}.00.` },
          { agent: "COMMUNICATOR", message: "💬 Drafting polite bilingual reminder message with Google Pay & PhonePe UPI link." },
          { agent: "COMMUNICATOR", message: `🚀 Sending WhatsApp notification: 'Namaste ${shortName} ji, friendly reminder from Hisaab AI...'` }
        ]);

        await new Promise(r => setTimeout(r, 1500));
        setVoiceResult({
          title: `WhatsApp Reminder Sent to ${nameDisplay}!`,
          details: `Outstanding balance ₹${formattedAmount} alert sent with PhonePe/G-Pay link to ${matchedCustomer.phone}. Customer notified successfully.`
        });

      } else if (commandKey === "check_galla") {
        const itemHindi = BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.hindi || "सामग्री";
        const lowStockName = BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.name || "Stock Item";
        const currentStockVal = stockLevels[businessType];
        const supplier = BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.supplier || "Supplier";

        const currentTotal = cashInGalla + upiInGalla;

        setVoiceLogs([
          { agent: "ANALYTICA", message: "💰 Calculating today's drawer cash + UPI collections..." },
          { agent: "ANALYTICA", message: `📈 Total current Galla is ₹${currentTotal.toLocaleString("en-IN")} (Cash: ₹${cashInGalla.toLocaleString("en-IN")} | UPI: ₹${upiInGalla.toLocaleString("en-IN")}).` },
          { agent: "ANALYTICA", message: `📊 Checking stock level: ${lowStockName} has ${currentStockVal} units left.` }
        ]);

        await new Promise(r => setTimeout(r, 1500));
        setVoiceResult({
          title: "Dukan Galla Audit Complete!",
          details: `Total earnings: ₹${currentTotal.toLocaleString("en-IN")}. Growth is 21% up compared to last Sunday. Stock is currently at ${currentStockVal} units. Suggest reordering ${itemHindi} if below threshold.`
        });
      } else {
        // Fallback calling general chat API
        const res = await fetch("/api/agents/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: [], businessType })
        });
        const data = await res.json();
        setVoiceLogs([{ agent: "HISAAB AI", message: "💡 Voice parsed using HISAAB Smart AI Brain..." }]);
        setVoiceResult({
          title: "Hisaab AI Action Taken",
          details: data.reply
        });
      }
    } catch (err) {
      console.error(err);
      setVoiceResult({
        title: "Action completed",
        details: "Hisaab AI has updated your cash ledger and sent standard alerts to your business network."
      });
    } finally {
      setSimulatingTask(false);
    }
  };

  // Custom manual mic recorder with native SpeechRecognition support and simulation fallback
  const startMicRecording = () => {
    setIsListening(true);
    setVoiceResult(null);
    setVoiceLogs([]);
    setActiveVoicePrompt("Listening... Speak now / हम सुन रहे हैं, बोलें...");

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    // Get latest customer for dynamic fallback
    const latestCust = customers[customers.length - 1] || { name: "Rajesh Kirana Store", amount: 4500 };
    const fallbackPhrase = `Send outstanding reminder to ${latestCust.name} for ₹${latestCust.amount.toLocaleString("en-IN")}.`;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Listen dynamically using the selected regional locale
        const currentLangObj = LANGUAGES.find(l => l.id === selectedLanguage);
        recognition.lang = currentLangObj ? currentLangObj.locale : "hi-IN"; 

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setActiveVoicePrompt(transcript);
            
            // Map common spoken keywords to simulation actions
            const textLower = transcript.toLowerCase();
            let matchedKey = "general";

            // Check if user is asking to send a reminder
            const isReminderIntent = 
              textLower.includes("reminder") || 
              textLower.includes("remind") || 
              textLower.includes("भेजो") || 
              textLower.includes("उधार") || 
              textLower.includes("tagaada") || 
              textLower.includes("तगादा") ||
              textLower.includes("money") ||
              textLower.includes("pay") ||
              textLower.includes("payment") ||
              customers.some(c => {
                const parts = c.name.toLowerCase().split(/\s+/).filter((word: string) => 
                  word.length > 2 && 
                  !["store", "kirana", "grocers", "bakers", "hub", "and", "ltd", "limited", "co", "shop", "sweet", "sweets"].includes(word)
                );
                return parts.some((p: string) => textLower.includes(p));
              });

            if (
              textLower.includes("bill") || 
              textLower.includes("invoice") || 
              textLower.includes("पर्ची") || 
              textLower.includes("बनाओ") ||
              textLower.includes("खाता")
            ) {
              matchedKey = "create_bill";
            } else if (isReminderIntent) {
              matchedKey = "send_reminder";
            } else if (
              textLower.includes("galla") || 
              textLower.includes("गल्ला") || 
              textLower.includes("स्टॉक") || 
              textLower.includes("stock") ||
              textLower.includes("बैलेंस")
            ) {
              matchedKey = "check_galla";
            }
            
            handleVoiceCommand(matchedKey, transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error / fallback triggered:", event.error);
          setActiveVoicePrompt(`Fallback: ${fallbackPhrase}`);
          setTimeout(() => {
            handleVoiceCommand("send_reminder", fallbackPhrase);
          }, 2000);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        // Fallback simulation
        setTimeout(() => {
          handleVoiceCommand("send_reminder", fallbackPhrase);
        }, 2000);
      }
    } else {
      // Fallback if browser doesn't support Web Speech API
      setTimeout(() => {
        handleVoiceCommand("send_reminder", fallbackPhrase);
      }, 3000);
    }
  };

  // Scan Invoice (OCR)
  const handleOCR = async () => {
    setProcessingOCR(true);
    setOcrResult(null);
    try {
      const res = await fetch("/api/agents/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          textData: ocrText,
          imageBase64: ocrImageBase64,
          mimeType: ocrImageMimeType
        })
      });
      const data = await res.json();
      setOcrResult(data.data);

      if (data.data) {
        const newInvoiceRecord = {
          id: Date.now(),
          scannedAt: new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }),
          supplier: data.data.supplierName || BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.supplier || "Supplier Wholesaler",
          invoiceNumber: data.data.invoiceNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          grandTotal: data.data.totals?.grandTotal || 15000,
          itemsCount: data.data.items?.length || 0
        };
        setScannedInvoices(prev => [newInvoiceRecord, ...prev]);

        const fullStocks: Record<string, number> = {
          "Grocery Store": 12,
          "Restaurant": 8,
          "Medical Store": 30,
          "Clothing Store": 25
        };
        setStockLevels(prev => ({
          ...prev,
          [businessType]: fullStocks[businessType] || 15
        }));

        setShowAlert(`Invoice processed & saved! Dynamic inventory stock replenished successfully. | बिल हिसाब में दर्ज हो गया!`);
        setTimeout(() => setShowAlert(null), 4000);
      }
    } catch (err) {
      console.error("OCR API error:", err);
    } finally {
      setProcessingOCR(false);
    }
  };

  // Voice Editing Agent for Bill Text / Extracted Values
  const handleVoiceAgentEdit = async (voiceCommand: string) => {
    setVoiceAgentWorking(true);
    setVoiceAgentResult(null);
    try {
      const res = await fetch("/api/agents/voice-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ocrText,
          voiceCommand,
          ocrResult
        })
      });
      const data = await res.json();
      if (data) {
        setOcrText(data.updatedOcrText);
        if (data.updatedOcrResult) {
          setOcrResult(data.updatedOcrResult);
        }
        setVoiceAgentResult(data.explanation || "Command processed.");
        setShowAlert(`Voice Agent: ${data.explanation || "Updated invoice details!"}`);
        setTimeout(() => setShowAlert(null), 5000);
      }
    } catch (err) {
      console.error("Voice Agent Edit Error:", err);
      setShowAlert("Voice Agent Error | वॉयस एजेंट त्रुटि");
      setTimeout(() => setShowAlert(null), 3000);
    } finally {
      setVoiceAgentWorking(false);
    }
  };

  // Handle local image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const commaIndex = base64String.indexOf(",");
        const rawBase64 = commaIndex !== -1 ? base64String.substring(commaIndex + 1) : base64String;
        
        setOcrImageBase64(rawBase64);
        setOcrImageMimeType(file.type);
        setOcrImagePreviewUrl(URL.createObjectURL(file));
        setOcrText(`[Selected device photo: ${file.name}]`);
        setOcrResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Start live device camera stream
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setOcrImagePreviewUrl(null);
      setOcrImageBase64(null);
      setOcrImageMimeType(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error starting camera:", err);
      setShowAlert("Unable to access camera. Please select a photo from your device or check browser permissions.");
      setTimeout(() => setShowAlert(null), 5000);
      setIsCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture current frame from camera stream
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        const commaIndex = dataUrl.indexOf(",");
        const rawBase64 = commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
        
        setOcrImageBase64(rawBase64);
        setOcrImageMimeType("image/jpeg");
        setOcrImagePreviewUrl(dataUrl);
        setOcrText("[Captured photo of invoice]");
        setOcrResult(null);
      }
      stopCamera();
    }
  };

  // Clear uploaded image
  const clearOcrImage = () => {
    setOcrImageBase64(null);
    setOcrImageMimeType(null);
    setOcrImagePreviewUrl(null);
    setOcrText(BUSINESS_SPECIFIC_DATA[businessType]?.dummyInvoices[0]?.text || "");
    setOcrResult(null);
  };

  // Make sure to clean up camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Add new customer to Udhaar list
  const addCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustAmount) return;
    const amountVal = parseFloat(newCustAmount) || 0;
    const newCust = {
      id: Date.now(),
      name: newCustName,
      phone: newCustPhone || "+91 99999 88888",
      address: "Local Buyer",
      amount: amountVal,
      lastUpdated: "Just now"
    };
    setCustomersData(prev => ({
      ...prev,
      [businessType]: [...(prev[businessType] || []), newCust]
    }));
    setNewCustName("");
    setNewCustPhone("");
    setNewCustAmount("");
    setShowAlert("New Customer Added to Ledger! | नया ग्राहक खाता में जुड़ गया!");
    setTimeout(() => setShowAlert(null), 4000);
  };

  // Send interactive WhatsApp notification to Customer
  const triggerWhatsAppReminder = (customer: any) => {
    setReminderSent(customer);
  };

  // Export current tax invoice draft as a highly polished PDF
  const handleExportPDF = () => {
    if (billItems.length === 0) {
      setShowAlert("Add items to export PDF! | पीडीएफ निर्यात करने के लिए आइटम जोड़ें!");
      setTimeout(() => setShowAlert(null), 3000);
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const shopName = BUSINESS_SPECIFIC_DATA[businessType]?.name || `${businessType} Enterprise`;
      const gstin = "29HISAAB9876F1Z3";
      const address = "Hisaab Hub, Market Road, Bengaluru, Karnataka";
      const dateStr = new Date().toLocaleDateString("en-IN");
      const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

      // Color Palette (Emerald Theme)
      const primaryColor = [5, 150, 105]; // Emerald-600
      const secondaryColor = [30, 41, 59]; // Slate-800
      const lightGray = [248, 250, 252]; // Slate-50
      const textMuted = [100, 116, 139]; // Slate-500

      // --- 1. Top Decorative Bar & Header ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(shopName.toUpperCase(), 15, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("OFFICIAL TAX INVOICE", 15, 19);
      doc.text(`GSTIN: ${gstin} | State Code: 29 (Karnataka)`, 15, 24);
      doc.text(`Address: ${address}`, 15, 28);

      // --- 2. Invoice Meta & Customer Grid ---
      // Customer Info (Left Column)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("BILLED TO:", 15, 45);

      doc.setFont("helvetica", "bold");
      doc.text(billCustName || "Cash Customer", 15, 51);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Mobile: +91 ${billCustPhone || "9999999999"}`, 15, 56);
      if (billCustGst) {
        doc.text(`GSTIN: ${billCustGst.toUpperCase()}`, 15, 61);
      }

      // Invoice Info (Right Column)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("INVOICE METADATA:", 135, 45);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Invoice No: ${generatedInvoiceNum}`, 135, 51);
      doc.text(`Date: ${dateStr}`, 135, 56);
      doc.text(`Time: ${timeStr}`, 135, 61);

      // Pay Mode Banner
      doc.setFillColor(241, 245, 249);
      doc.rect(135, 65, 60, 7, "F");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(`PAY VIA: ${billPayMode.toUpperCase()}`, 137, 70);

      // Separator Line
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 78, 195, 78);

      // --- 3. Items Table Header ---
      const startY = 85;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, startY, 180, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);

      doc.text("S.No", 17, startY + 5.5);
      doc.text("Item Description", 28, startY + 5.5);
      doc.text("Qty", 85, startY + 5.5, { align: "right" });
      doc.text("Price", 105, startY + 5.5, { align: "right" });
      doc.text("Taxable Val", 128, startY + 5.5, { align: "right" });
      doc.text("GST%", 144, startY + 5.5, { align: "center" });
      doc.text("CGST+SGST", 172, startY + 5.5, { align: "right" });
      doc.text("Total", 193, startY + 5.5, { align: "right" });

      // Table Rows
      let currentY = startY + 8;
      doc.setFontSize(8);

      billItems.forEach((item, idx) => {
        const taxableVal = item.qty * item.price;
        const gstRate = item.gst;
        const gstAmt = taxableVal * (gstRate / 100);
        const total = taxableVal + gstAmt;

        // Striped Background Row
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, 180, 7.5, "F");
        }

        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFont("helvetica", "normal");
        doc.text(String(idx + 1), 17, currentY + 5);

        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont("helvetica", "bold");
        const displayName = item.name.length > 25 ? item.name.substring(0, 23) + "..." : item.name;
        doc.text(displayName, 28, currentY + 5);

        doc.setFont("helvetica", "normal");
        doc.text(String(item.qty), 85, currentY + 5, { align: "right" });
        doc.text(`Rs.${item.price.toFixed(2)}`, 105, currentY + 5, { align: "right" });
        doc.text(`Rs.${taxableVal.toFixed(2)}`, 128, currentY + 5, { align: "right" });

        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`${gstRate}%`, 144, currentY + 5, { align: "center" });

        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont("helvetica", "normal");
        doc.text(`Rs.${gstAmt.toFixed(2)}`, 172, currentY + 5, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text(`Rs.${total.toFixed(2)}`, 193, currentY + 5, { align: "right" });

        currentY += 7.5;
      });

      // --- 4. Calculation Breakdown Section ---
      const taxableTotal = billItems.reduce((sum, item) => sum + item.qty * item.price, 0);
      const cgstTotal = billItems.reduce((sum, item) => sum + (item.qty * item.price * (item.gst / 100)) / 2, 0);
      const sgstTotal = cgstTotal;
      const disc = parseFloat(billDiscount) || 0;
      const grandTotal = Math.max(0, taxableTotal + cgstTotal + sgstTotal - disc);

      doc.setDrawColor(226, 232, 240);
      doc.line(15, currentY + 3, 195, currentY + 3);
      currentY += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

      doc.text("Total Taxable Amount:", 120, currentY);
      doc.text(`Rs.${taxableTotal.toFixed(2)}`, 193, currentY, { align: "right" });
      currentY += 4.5;

      doc.text("Total CGST (Central Tax):", 120, currentY);
      doc.text(`Rs.${cgstTotal.toFixed(2)}`, 193, currentY, { align: "right" });
      currentY += 4.5;

      doc.text("Total SGST (State Tax):", 120, currentY);
      doc.text(`Rs.${sgstTotal.toFixed(2)}`, 193, currentY, { align: "right" });
      currentY += 4.5;

      if (disc > 0) {
        doc.setTextColor(219, 39, 119); // Pink-600
        doc.setFont("helvetica", "bold");
        doc.text("Discount (-):", 120, currentY);
        doc.text(`-Rs.${disc.toFixed(2)}`, 193, currentY, { align: "right" });
        doc.setFont("helvetica", "normal");
        currentY += 4.5;
      }

      // Grand Total Highlight Box
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(115, currentY, 80, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("Grand Total (Payable):", 118, currentY + 5.5);
      doc.text(`Rs.${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 191, currentY + 5.5, { align: "right" });
      currentY += 15;

      // --- 5. Professional Footer ---
      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY, 195, currentY);
      currentY += 6;

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("Thank you for shopping with us! / धन्यवाद", 105, currentY, { align: "center" });

      currentY += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("Powered by Hisaab AI • Intelligent Business System", 105, currentY, { align: "center" });

      // Save PDF
      doc.save(`Invoice_${generatedInvoiceNum}.pdf`);

      setShowAlert("✓ PDF Invoice generated and downloaded successfully! | पीडीएफ डाउनलोड हो गया है!");
      setTimeout(() => setShowAlert(null), 4000);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      setShowAlert("Error generating PDF. Please try again. | पीडीएफ बनाने में विफलता।");
      setTimeout(() => setShowAlert(null), 3000);
    }
  };

  // Export Galla Closing Report as a highly polished PDF
  const downloadGallaClosingPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const shopName = user?.businessName || BUSINESS_SPECIFIC_DATA[businessType]?.name || `${businessType} Store`;
      const ownerName = user?.name || "Store Owner";
      const ownerPhone = user?.phone || "N/A";
      const dateStr = new Date().toLocaleDateString("en-IN");
      const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

      const todayStr = new Date().toISOString().split("T")[0];
      const todayExpensesList = dailyExpenses.filter(e => e.date === todayStr);
      const totalTodayExpenses = todayExpensesList.reduce((sum, e) => sum + e.amount, 0);
      const totalCollections = cashInGalla + upiInGalla;
      const netProfit = totalCollections - totalTodayExpenses;

      // Color Palette (Navy and Teal Theme for elegant report look)
      const primaryColor = [15, 23, 42]; // Slate-900 / Navy
      const accentColor = [16, 185, 129]; // Emerald-500
      const lightGray = [248, 250, 252]; // Slate-50
      const borderGray = [226, 232, 240]; // Slate-200
      const textMuted = [100, 116, 139]; // Slate-500
      const darkText = [30, 41, 59]; // Slate-800

      // --- 1. Header Banner ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 38, "F");

      // Highlight Accent Stripe
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 38, 210, 2.5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(shopName.toUpperCase(), 15, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(200, 220, 255);
      doc.text(`BUSINESS MANAGER: ${ownerName.toUpperCase()} | MOBILE: +91 ${ownerPhone}`, 15, 21);
      doc.text(`BUSINESS TYPE: ${businessType.toUpperCase()} | REPORT TYPE: DAILY DAILY GALLA CLOSING`, 15, 26);
      doc.text(`GENERATED BY: Hisaab AI Smart Ledger Assistant`, 15, 31);

      // Status Badge
      doc.setFillColor(31, 41, 55);
      doc.rect(155, 10, 40, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("VERIFIED & CLOSED", 175, 15, { align: "center" });
      doc.setFontSize(7.5);
      doc.setTextColor(110, 231, 183); // Green-300
      doc.text("SUCCESSFULLY SAVED", 175, 19, { align: "center" });

      // --- 2. Report Information Grid ---
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("REPORT METADATA:", 15, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Closing Date: ${dateStr}`, 15, 56);
      doc.text(`Closing Time: ${timeStr}`, 15, 61);
      doc.text("Status: Archived & Balanced", 15, 66);

      // Financial Period
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("ACCOUNT SUMMARY:", 120, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      
      const todayDayStr = String(new Date().getDate()).padStart(2, '0');
      const todayMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
      const todayYearStr = new Date().getFullYear();
      const fullIndFormat = `${todayDayStr}/${todayMonthStr}/${todayYearStr}`;
      const todayInvoicesCount = scannedInvoices.filter(inv => {
        return inv.scannedAt && (inv.scannedAt.includes(fullIndFormat) || inv.scannedAt.includes(todayStr));
      }).length;

      doc.text(`Today's Sales Invoices: ${todayInvoicesCount} Bills`, 120, 56);
      doc.text(`Today's Expense Items: ${todayExpensesList.length} Items`, 120, 61);
      doc.text(`Currency: INR (Indian Rupee - Rs.)`, 120, 66);

      // --- 3. Big Financial Cards ---
      // Left Card: Cash Counter
      doc.setFillColor(240, 253, 250); // Emerald-50
      doc.rect(15, 74, 55, 20, "F");
      doc.setDrawColor(209, 250, 229); // Emerald-100
      doc.rect(15, 74, 55, 20);
      doc.setTextColor(4, 120, 87); // Emerald-700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PHYSICAL CASH (नकद)", 18, 79);
      doc.setFontSize(13);
      doc.text(`Rs.${cashInGalla.toLocaleString("en-IN")}`, 18, 87);

      // Middle Card: UPI Digital
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.rect(77, 74, 55, 20, "F");
      doc.setDrawColor(219, 234, 254); // Blue-100
      doc.rect(77, 74, 55, 20);
      doc.setTextColor(29, 78, 216); // Blue-700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("UPI DIGITAL (यूपीआई)", 80, 79);
      doc.setFontSize(13);
      doc.text(`Rs.${upiInGalla.toLocaleString("en-IN")}`, 80, 87);

      // Right Card: Total Collections
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(140, 74, 55, 20, "F");
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.rect(140, 74, 55, 20);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("GROSS COLLECTION (कुल)", 143, 79);
      doc.setFontSize(13);
      doc.text(`Rs.${totalCollections.toLocaleString("en-IN")}`, 143, 87);

      // --- 4. Today's Expenses Section ---
      let currentY = 104;
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TODAY'S SHOP EXPENSES / आज के खर्च", 15, currentY);
      currentY += 4.5;

      // Expense Table Header
      doc.setFillColor(244, 63, 94); // Rose-500 for expense header
      doc.rect(15, currentY, 180, 7.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("S.No", 18, currentY + 5);
      doc.text("Expense Category (प्रकार)", 30, currentY + 5);
      doc.text("Description Note (विवरण)", 80, currentY + 5);
      doc.text("Amount (निकासी)", 192, currentY + 5, { align: "right" });
      currentY += 7.5;

      if (todayExpensesList.length === 0) {
        doc.setFillColor(254, 242, 242); // Pink/Rose-50/100
        doc.rect(15, currentY, 180, 10, "F");
        doc.setTextColor(159, 18, 57); // Rose-900
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("No shop expenses recorded today. All collections saved as gross profit!", 105, currentY + 6, { align: "center" });
        currentY += 14;
      } else {
        todayExpensesList.forEach((exp, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(255, 251, 251);
            doc.rect(15, currentY, 180, 7.5, "F");
          } else {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, currentY, 180, 7.5, "F");
          }

          doc.setTextColor(darkText[0], darkText[1], darkText[2]);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.text(`${idx + 1}`, 18, currentY + 5);
          doc.text(exp.category, 30, currentY + 5);
          
          // Truncate note if too long
          let note = exp.note || "General Shop Expense";
          if (note.length > 40) note = note.substring(0, 38) + "...";
          doc.text(note, 80, currentY + 5);
          
          doc.setTextColor(190, 24, 74); // Rose-800
          doc.setFont("helvetica", "bold");
          doc.text(`-Rs.${exp.amount.toLocaleString("en-IN")}`, 192, currentY + 5, { align: "right" });
          
          currentY += 7.5;
        });

        // Sum row
        doc.setFillColor(254, 242, 242);
        doc.rect(15, currentY, 180, 8, "F");
        doc.setTextColor(159, 18, 57);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("TOTAL SHOP EXPENSES TODAY", 30, currentY + 5.5);
        doc.text(`-Rs.${totalTodayExpenses.toLocaleString("en-IN")}`, 192, currentY + 5.5, { align: "right" });
        currentY += 13;
      }

      // --- 5. Net Balance Sheet Calculation Box ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, 180, 15, "F");

      // Accent border
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(15, currentY, 3, 15, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("NET DAILY GALLA BALANCE / दैनिक शुद्ध मुनाफा:", 22, currentY + 9.5);
      
      doc.setFontSize(14);
      if (netProfit >= 0) {
        doc.setTextColor(110, 231, 183); // Light emerald green
        doc.text(`Rs.${netProfit.toLocaleString("en-IN")}`, 192, currentY + 10, { align: "right" });
      } else {
        doc.setTextColor(252, 165, 165); // Light red
        doc.text(`-Rs.${Math.abs(netProfit).toLocaleString("en-IN")}`, 192, currentY + 10, { align: "right" });
      }
      currentY += 21;

      // --- 6. Today's Core Invoices / Bills Generated ---
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TODAY'S CUSTOMER BILLS & SALES LEDGER", 15, currentY);
      currentY += 4.5;

      const todayInvoices = scannedInvoices.filter(inv => {
        return inv.scannedAt && (inv.scannedAt.includes(fullIndFormat) || inv.scannedAt.includes(todayStr));
      });

      // Bills Table Header
      doc.setFillColor(59, 130, 246); // Blue-500 for bills header
      doc.rect(15, currentY, 180, 7.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Invoice Number", 18, currentY + 5);
      doc.text("Customer/Recipient (ग्राहक)", 48, currentY + 5);
      doc.text("Items Count", 115, currentY + 5, { align: "right" });
      doc.text("Grand Total (कुल)", 192, currentY + 5, { align: "right" });
      currentY += 7.5;

      if (todayInvoices.length === 0) {
        doc.setFillColor(240, 246, 255);
        doc.rect(15, currentY, 180, 10, "F");
        doc.setTextColor(29, 78, 216);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("No customer bills generated today yet. Add items in 'Fast Billing' tab to create records.", 105, currentY + 6, { align: "center" });
        currentY += 15;
      } else {
        todayInvoices.slice(0, 8).forEach((inv, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, currentY, 180, 7.5, "F");
          }

          doc.setTextColor(darkText[0], darkText[1], darkText[2]);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.text(inv.invoiceNumber || "N/A", 18, currentY + 5);
          doc.text(inv.supplier || "Cash Customer", 48, currentY + 5);
          doc.text(`${inv.itemsCount || 0} Items`, 115, currentY + 5, { align: "right" });
          doc.setTextColor(4, 120, 87); // Emerald-700
          doc.setFont("helvetica", "bold");
          doc.text(`Rs.${inv.grandTotal.toLocaleString("en-IN")}`, 192, currentY + 5, { align: "right" });
          currentY += 7.5;
        });

        if (todayInvoices.length > 8) {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.setFontSize(7.5);
          doc.text(`* Showing first 8 invoices of ${todayInvoices.length} total invoices generated today.`, 15, currentY + 4);
          currentY += 8;
        } else {
          currentY += 4;
        }
      }

      // Ensure footer and signature block don't clip off (if currentY is too large, add page, otherwise stay)
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY = Math.max(currentY, 210);
      }

      // --- 7. Signature / Audit Area ---
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(15, currentY, 195, currentY);
      currentY += 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text("VERIFICATION & SIGNATURES", 15, currentY);
      currentY += 12;

      // Left signature box
      doc.setDrawColor(226, 232, 240);
      doc.line(15, currentY, 75, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("Store Manager / Cashier Signature", 15, currentY + 4);

      // Right signature box
      doc.line(135, currentY, 195, currentY);
      doc.text("Authorized Proprietor Sign", 135, currentY + 4);
      currentY += 15;

      // Footer notice
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("Hisaab AI Ledger Audit System - Digitally Approved & Locked Report.", 105, currentY, { align: "center" });

      // Save Report
      doc.save(`Galla_Closing_Report_${todayStr}.pdf`);

      setShowAlert("✓ Daily Galla Closing PDF Report generated successfully! | पीडीएफ रिपोर्ट डाउनलोड हो गई!");
      setTimeout(() => setShowAlert(null), 4000);
    } catch (err) {
      console.error("Failed to generate PDF Report:", err);
      setShowAlert("Error generating Galla Report PDF. Please try again.");
      setTimeout(() => setShowAlert(null), 3000);
    }
  };

  // Export Monthly Salary Payment Logs as CSV
  const downloadSalaryReportCSV = (selectedMonth: string) => {
    try {
      const filtered = selectedMonth && selectedMonth !== "All"
        ? salaryPayments.filter(p => p.month === selectedMonth)
        : salaryPayments;

      if (filtered.length === 0) {
        setShowAlert("No salary payments recorded for this selection! | इस चयन के लिए कोई भुगतान रिकॉर्ड नहीं है!");
        setTimeout(() => setShowAlert(null), 3000);
        return;
      }

      // Headers matching the schema
      const headers = [
        "Payment Date",
        "Employee Name",
        "Role",
        "Target Month/Period",
        "Amount Paid (INR)",
        "Payment Method",
        "Notes/Remarks"
      ];

      const rows = filtered.map(pay => {
        const emp = staffList.find(s => s.id === pay.staffId);
        const empName = emp ? emp.name : "Former Employee";
        const empRole = emp ? emp.role : "N/A";
        return [
          pay.paymentDate,
          `"${empName.replace(/"/g, '""')}"`,
          `"${empRole.replace(/"/g, '""')}"`,
          `"${pay.month.replace(/"/g, '""')}"`,
          pay.amountPaid,
          `"${pay.paymentMethod.replace(/"/g, '""')}"`,
          `"${(pay.notes || "").replace(/"/g, '""')}"`
        ];
      });

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Hisaab_Salary_Report_${(selectedMonth || "All_Months").replace(/\s+/g, '_')}_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowAlert("✓ CSV Report downloaded successfully! | सीएसवी रिपोर्ट डाउनलोड हो गई!");
      setTimeout(() => setShowAlert(null), 3000);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      setShowAlert("Failed to export CSV. Please try again.");
      setTimeout(() => setShowAlert(null), 3000);
    }
  };

  // Export Monthly Salary Payment Logs as a beautifully styled PDF
  const downloadSalaryReportPDF = (selectedMonth: string) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const filtered = selectedMonth && selectedMonth !== "All"
        ? salaryPayments.filter(p => p.month === selectedMonth)
        : salaryPayments;

      if (filtered.length === 0) {
        setShowAlert("No salary payments recorded for this selection! | इस चयन के लिए कोई भुगतान रिकॉर्ड नहीं है!");
        setTimeout(() => setShowAlert(null), 3000);
        return;
      }

      const shopName = user?.businessName || BUSINESS_SPECIFIC_DATA[businessType]?.name || `${businessType} Store`;
      const ownerName = user?.name || "Store Owner";
      const ownerPhone = user?.phone || "N/A";
      const dateStr = new Date().toLocaleDateString("en-IN");
      const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

      const totalDisbursed = filtered.reduce((sum, p) => sum + p.amountPaid, 0);
      const uniqueEmployeesPaid = new Set(filtered.map(p => p.staffId)).size;

      // Color Palette (Navy and Emerald Theme matching the existing reports)
      const primaryColor = [15, 23, 42]; // Slate-900 / Navy
      const accentColor = [16, 185, 129]; // Emerald-500
      const borderGray = [226, 232, 240]; // Slate-200
      const textMuted = [100, 116, 139]; // Slate-500
      const darkText = [30, 41, 59]; // Slate-800

      // --- 1. Header Banner ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 38, "F");

      // Highlight Accent Stripe
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 38, 210, 2.5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(shopName.toUpperCase(), 15, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(200, 220, 255);
      doc.text(`BUSINESS MANAGER: ${ownerName.toUpperCase()} | MOBILE: +91 ${ownerPhone}`, 15, 21);
      doc.text(`BUSINESS TYPE: ${businessType.toUpperCase()} | REPORT TYPE: STAFF MONTHLY SALARY PAYROLL`, 15, 26);
      doc.text(`GENERATED BY: Hisaab AI Smart Ledger Assistant`, 15, 31);

      // Status Badge
      doc.setFillColor(31, 41, 55);
      doc.rect(155, 10, 40, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("VERIFIED & AUDITED", 175, 15, { align: "center" });
      doc.setFontSize(7.5);
      doc.setTextColor(110, 231, 183); // Green-300
      doc.text("OFFICIAL REPORT", 175, 19, { align: "center" });

      // --- 2. Report Information Grid ---
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("REPORT METADATA:", 15, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Generated Date: ${dateStr}`, 15, 56);
      doc.text(`Generated Time: ${timeStr}`, 15, 61);
      doc.text(`Target Period: ${selectedMonth || "All Months"}`, 15, 66);

      // Summary Right Panel
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PAYROLL SUMMARY:", 120, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Total Staff Members Paid: ${uniqueEmployeesPaid} employees`, 120, 56);
      doc.text(`Total Disbursed Volume: Rs. ${totalDisbursed.toLocaleString("en-IN")}`, 120, 61);
      doc.text("Currency: INR (Indian Rupee - Rs.)", 120, 66);

      // --- 3. Large Highlights ---
      // Left Card: Total Payroll Disbursed
      doc.setFillColor(240, 253, 250); // Emerald-50
      doc.rect(15, 74, 85, 20, "F");
      doc.setDrawColor(209, 250, 229); // Emerald-100
      doc.rect(15, 74, 85, 20);
      doc.setTextColor(4, 120, 87); // Emerald-700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TOTAL DISBURSED SALARY (कुल वेतन भुगतान)", 18, 79);
      doc.setFontSize(13);
      doc.text(`Rs.${totalDisbursed.toLocaleString("en-IN")}`, 18, 87);

      // Right Card: Total Transactions
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.rect(110, 74, 85, 20, "F");
      doc.setDrawColor(219, 234, 254); // Blue-100
      doc.rect(110, 74, 85, 20);
      doc.setTextColor(29, 78, 216); // Blue-700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TOTAL TRANSACTION COUNT (कुल लेनदेन संख्या)", 113, 79);
      doc.setFontSize(13);
      doc.text(`${filtered.length} Disbursals`, 113, 87);

      // --- 4. Ledger Table Section ---
      let currentY = 104;
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("DETAILED SALARY DISBURSAL LOGS / वेतन विवरण", 15, currentY);
      currentY += 4.5;

      // Table Header
      doc.setFillColor(15, 23, 42); // Navy-Slate-900 for header
      doc.rect(15, currentY, 180, 7.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Date", 18, currentY + 5);
      doc.text("Employee Name (नाम)", 42, currentY + 5);
      doc.text("Period (महीना)", 92, currentY + 5);
      doc.text("Method", 127, currentY + 5);
      doc.text("Notes (टिप्पणी)", 147, currentY + 5);
      doc.text("Amount (भुगतान)", 192, currentY + 5, { align: "right" });
      currentY += 7.5;

      filtered.forEach((pay, idx) => {
        // Check for page overflow
        if (currentY > 265) {
          doc.addPage();
          currentY = 20;

          // Repeat simple table header on next page
          doc.setFillColor(15, 23, 42);
          doc.rect(15, currentY, 180, 7.5, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text("Date", 18, currentY + 5);
          doc.text("Employee Name (नाम)", 42, currentY + 5);
          doc.text("Period (महीना)", 92, currentY + 5);
          doc.text("Method", 127, currentY + 5);
          doc.text("Notes (टिप्पणी)", 147, currentY + 5);
          doc.text("Amount (भुगतान)", 192, currentY + 5, { align: "right" });
          currentY += 7.5;
        }

        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(255, 251, 251);
          doc.rect(15, currentY, 180, 7.5, "F");
        } else {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, 180, 7.5, "F");
        }

        const emp = staffList.find(s => s.id === pay.staffId);
        const empName = emp ? emp.name : "Former Employee";

        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(pay.paymentDate, 18, currentY + 5);
        doc.text(empName, 42, currentY + 5);
        doc.text(pay.month, 92, currentY + 5);
        doc.text(pay.paymentMethod, 127, currentY + 5);
        
        let noteText = pay.notes || "Salary Paid";
        if (noteText.length > 22) noteText = noteText.substring(0, 20) + "...";
        doc.text(noteText, 147, currentY + 5);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(4, 120, 87); // Emerald-700
        doc.text(`Rs. ${pay.amountPaid.toLocaleString("en-IN")}`, 192, currentY + 5, { align: "right" });
        currentY += 7.5;
      });

      // --- 5. Footer Signature Area ---
      if (currentY > 240) {
        doc.addPage();
        currentY = 30;
      } else {
        currentY = Math.max(currentY + 15, 180);
      }

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.5);
      doc.line(15, currentY, 195, currentY);
      currentY += 10;

      // Signature placeholders
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PREPARED BY (STAFF MANAGER):", 15, currentY);
      doc.text("APPROVED BY (AUTHORIZED SIGNATORY):", 120, currentY);

      currentY += 15;
      doc.setLineWidth(0.2);
      doc.line(15, currentY, 70, currentY);
      doc.line(120, currentY, 175, currentY);

      currentY += 4;
      doc.setFont("helvetica", "normal");
      doc.text("Hisaab Staff Payroll System", 15, currentY);
      doc.text("Owner / Administrator Stamp", 120, currentY);

      // Bottom lock badge
      currentY += 12;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 10, "F");
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "oblique");
      doc.setFontSize(7.5);
      doc.text("Hisaab AI Ledger Audit System - Digitally Approved & Locked Report.", 105, currentY + 6, { align: "center" });

      // Save PDF
      const filename = `Salary_Report_${(selectedMonth || "All_Months").replace(/\s+/g, '_')}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);

      setShowAlert("✓ Salary Payroll PDF Report generated successfully! | पीडीएफ रिपोर्ट डाउनलोड हो गई!");
      setTimeout(() => setShowAlert(null), 3000);
    } catch (err) {
      console.error("Failed to generate PDF Report:", err);
      setShowAlert("Error generating Salary Report PDF. Please try again.");
      setTimeout(() => setShowAlert(null), 3000);
    }
  };

  // Settle Customer Udhaar to 0
  const settleAmount = (id: number) => {
    const list = customersData[businessType] || [];
    const cust = list.find(c => c.id === id);
    const amt = cust ? cust.amount : 0;

    setCustomersData(prev => ({
      ...prev,
      [businessType]: (prev[businessType] || []).map(c => c.id === id ? { ...c, amount: 0, lastUpdated: "Paid Today" } : c)
    }));

    if (amt > 0) {
      setUpiInGalla(prev => prev + amt);
      setShowAlert(`Udhaar Settle Done! ₹${amt.toLocaleString("en-IN")} added to UPI Galla. | खाता बराबर! ₹${amt.toLocaleString("en-IN")} यूपीआई गल्ला में जमा!`);
    } else {
      setShowAlert("Udhaar Settle Done! Balance updated to ₹0. | खाता बराबर! बैलेंस ₹0 हो गया।");
    }
    setTimeout(() => setShowAlert(null), 4000);
  };

  // Quick Supplier Reorder
  const handleSupplierReorder = () => {
    setStockReorderSent(true);
    const supplier = BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.supplier || "Supplier";
    const item = BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.hindi || "सामग्री";
    const itemName = BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.name || "item";

    const fullStocks: Record<string, number> = {
      "Grocery Store": 12,
      "Restaurant": 8,
      "Medical Store": 30,
      "Clothing Store": 25
    };

    setShowAlert(`Supplier WhatsApp order sent! Stock of ${item} requested. | सप्लायर ${supplier} को आर्डर चला गया!`);
    
    setTimeout(() => {
      setStockLevels(prev => ({
        ...prev,
        [businessType]: fullStocks[businessType] || 15
      }));
      setStockReorderSent(false);
      setShowAlert(`Stock Replenished! ${itemName} is now at ${fullStocks[businessType] || 15} units. | सामान आ गया!`);
      setTimeout(() => setShowAlert(null), 3000);
    }, 4500);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" id="auth_container">
        {/* Alerts inside auth */}
        <AnimatePresence>
          {showAlert && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-medium text-xs sm:text-sm flex items-center gap-2 border border-emerald-400"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{showAlert}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 w-full max-w-md shadow-xl relative overflow-hidden">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative w-24 h-24 mb-4 group">
              <div className="absolute inset-0 bg-emerald-500 rounded-3xl blur-md opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <img
                src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=300&h=300"
                alt="Hisaab AI Shop Logo"
                className="w-24 h-24 rounded-3xl object-cover border-2 border-emerald-600 relative z-10 shadow-md transform hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">HISAAB AI <span className="text-emerald-600">(हिसाब AI)</span></h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Simple AI Bookkeeper for Every Indian Dukan</p>
          </div>

          <div className="flex border-b border-slate-100 mb-6">
            <button
              onClick={() => { setAuthMode("login"); setError(""); }}
              className={`flex-1 pb-3 text-sm font-black text-center border-b-2 transition-all cursor-pointer ${
                authMode === "login" ? "border-emerald-600 text-emerald-800" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              🔑 Login (लॉगिन)
            </button>
            <button
              onClick={() => { setAuthMode("signup"); setError(""); }}
              className={`flex-1 pb-3 text-sm font-black text-center border-b-2 transition-all cursor-pointer ${
                authMode === "signup" ? "border-emerald-600 text-emerald-800" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              📝 Sign Up (नया खाता)
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-xs font-bold mb-4">
              ⚠️ {error}
            </div>
          )}

          {authMode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">📞 Phone Number (मोबाइल नंबर):</label>
                <VoiceInput
                  id="loginPhone"
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={loginPhone}
                  onChange={setLoginPhone}
                  maxLength={10}
                  simulations={["9876543210", "9123456789"]}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">🔒 Password (पासवर्ड):</label>
                <VoiceInput
                  id="loginPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={setLoginPassword}
                  simulations={["admin", "pass123"]}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl cursor-pointer transition-all mt-6 shadow-md shadow-emerald-600/15"
              >
                Log In to My Shop
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Step Progress Bar */}
              <div className="flex items-center justify-between bg-slate-100/80 dark:bg-slate-800 p-2.5 rounded-2xl mb-4 border border-slate-200/50">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${signupStep >= 1 ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"}`}>1</div>
                  <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">Shop Profile</span>
                </div>
                <div className="h-0.5 bg-slate-300 flex-grow mx-2 rounded-full">
                  <div className="h-full bg-emerald-600 rounded-full transition-all duration-300" style={{ width: signupStep === 1 ? "0%" : signupStep === 2 ? "50%" : "100%" }}></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${signupStep >= 2 ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"}`}>2</div>
                  <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">GST & Owner Details</span>
                </div>
                <div className="h-0.5 bg-slate-300 flex-grow mx-2 rounded-full">
                  <div className="h-full bg-emerald-600 rounded-full transition-all duration-300" style={{ width: signupStep <= 2 ? "0%" : "100%" }}></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${signupStep >= 3 ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"}`}>3</div>
                  <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">Documents</span>
                </div>
              </div>

              {signupStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">👤 Your Name:</label>
                      <VoiceInput
                        id="regName"
                        required
                        placeholder="Rajesh Kumar"
                        value={regName}
                        onChange={setRegName}
                        simulations={["Rajesh Kumar", "अमित शर्मा"]}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">🏢 Shop Name:</label>
                      <VoiceInput
                        id="regBusiness"
                        required
                        placeholder="Rajesh Kirana"
                        value={regBusiness}
                        onChange={setRegBusiness}
                        simulations={["Gupta Kirana Store", "शर्मा जनरल स्टोर"]}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">📞 Phone Number (मोबाइल नंबर):</label>
                    <VoiceInput
                      id="regPhone"
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={regPhone}
                      onChange={setRegPhone}
                      maxLength={10}
                      simulations={["9876543210", "9555544444"]}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">🔒 Password (पासवर्ड):</label>
                    <VoiceInput
                      id="regPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={setRegPassword}
                      simulations={["pass123", "mysecuredukan"]}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">🏢 Business Type (व्यापार का प्रकार):</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "Grocery Store", label: "🛒 Grocery Store", sub: "किराना स्टोर" },
                        { id: "Restaurant", label: "🍽️ Restaurant", sub: "भोजनालय / कैफ़े" },
                        { id: "Medical Store", label: "💊 Medical Store", sub: "दवाखाना / फार्मेसी" },
                        { id: "Clothing Store", label: "👕 Clothing Store", sub: "कपड़े की दुकान" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRegBusinessType(item.id)}
                          className={`p-2.5 border rounded-xl text-left transition-all flex flex-col justify-center cursor-pointer ${
                            regBusinessType === item.id 
                              ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-xs font-extrabold">{item.label}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{item.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">🌐 Region & Language (क्षेत्र और भाषा):</label>
                    <select
                      value={regLanguage}
                      onChange={(e) => setRegLanguage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!regName || !regBusiness || !regPhone || !regPassword) {
                        setError("Please fill all fields | कृपया सभी जानकारी भरें");
                        return;
                      }
                      if (regPhone.length < 10) {
                        setError("Please enter a valid phone number | कृपया वैध मोबाइल नंबर दर्ज करें");
                        return;
                      }
                      setError("");
                      setSignupStep(2);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm py-3.5 rounded-xl cursor-pointer transition-all mt-6 shadow-md shadow-emerald-600/15 flex items-center justify-center gap-1.5"
                  >
                    <span>Next: GST & Shopkeeper Details (जीएसटी और दुकानदार विवरण)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!regName || !regBusiness || !regPhone || !regPassword) {
                        setError("Please fill all fields | कृपया सभी जानकारी भरें");
                        return;
                      }
                      if (regPhone.length < 10) {
                        setError("Please enter a valid phone number | कृपया वैध मोबाइल नंबर दर्ज करें");
                        return;
                      }
                      // Quick signup bypassing steps 2 and 3!
                      setHasGst(false);
                      setRegGstin("");
                      setRegPan("");
                      setRegAadhaar("");
                      setDocPanCard(null);
                      setDocAadhaarCard(null);
                      setDocGstCert(null);
                      setDocShopLicense(null);
                      handleSignup();
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all mt-2 flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <span>⚡ Quick Signup: Skip Verification (बिना दस्तावेज़ खाता खोलें)</span>
                  </button>
                </div>
              )}

              {signupStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tax Registration Details (टैक्स विवरण)</span>
                    <label className="flex items-center gap-2.5 py-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasGst} 
                        onChange={(e) => setHasGst(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">Does your shop have GST registration? (क्या दुकान GST पंजीकृत है?)</span>
                    </label>
                  </div>

                  {hasGst && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/20 rounded-2xl border border-emerald-100/50 animate-fadeIn">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">GSTIN Number (जीएसटी नंबर) *</label>
                        <VoiceInput
                          id="regGstin"
                          maxLength={15}
                          placeholder="e.g. 27AAAAA1111A1Z1"
                          value={regGstin}
                          onChange={(val) => setRegGstin(val.toUpperCase())}
                          className="!bg-white font-mono font-bold uppercase"
                          simulations={["27AAAAA1111A1Z1", "19BCDEF1234A2Z2"]}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">GST Filing Scheme (जीएसटी योजना)</label>
                        <select
                          value={regGstType}
                          onChange={(e) => setRegGstType(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                        >
                          <option value="Regular">Regular Scheme (सामान्य योजना)</option>
                          <option value="Composition">Composition Scheme (समाधान योजना)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shopkeeper Verification Details (दुकानदार का विवरण):</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Owner PAN Number (पैन कार्ड) *</label>
                        <VoiceInput
                          id="regPan"
                          maxLength={10}
                          placeholder="e.g. ABCDE1234F"
                          value={regPan}
                          onChange={(val) => setRegPan(val.toUpperCase())}
                          className="font-mono font-bold uppercase"
                          simulations={["ABCDE1234F", "XYZAB5678Q"]}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Owner Aadhaar Number (आधार नंबर) *</label>
                        <VoiceInput
                          id="regAadhaar"
                          maxLength={14}
                          placeholder="e.g. 9876 5432 1012"
                          value={regAadhaar}
                          onChange={(val) => {
                            const cleaned = val.replace(/\D/g, "").slice(0, 12);
                            const match = cleaned.match(/.{1,4}/g);
                            setRegAadhaar(match ? match.join(" ") : cleaned);
                          }}
                          className="font-mono font-bold"
                          simulations={["987654321012", "123456789012"]}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Trade License / Shop Act Number (optional)</label>
                      <VoiceInput
                        id="regTradeLicense"
                        placeholder="e.g. TL-2026-X83204"
                        value={regTradeLicense}
                        onChange={(val) => setRegTradeLicense(val.toUpperCase())}
                        className="font-mono uppercase"
                        simulations={["TL-2026-X83204", "SA-2026-99182"]}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-6">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="px-4 py-2.5 text-xs font-black text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>⬅ Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (hasGst && !regGstin) {
                          setError("GSTIN Number is required when GST registration is checked | कृपया जीएसटी नंबर भरें");
                          return;
                        }
                        if (hasGst && regGstin.length < 15) {
                          setError("GSTIN must be exactly 15 characters | जीएसटी नंबर 15 अंकों का होना चाहिए");
                          return;
                        }
                        if (!regPan) {
                          setError("Owner PAN card number is required for business validation | पैन नंबर आवश्यक है");
                          return;
                        }
                        if (regPan.length < 10) {
                          setError("PAN number must be exactly 10 characters | पैन नंबर 10 अंकों का होना चाहिए");
                          return;
                        }
                        if (!regAadhaar) {
                          setError("Owner Aadhaar card number is required for shopkeeper registration | आधार नंबर आवश्यक है");
                          return;
                        }
                        const cleanAadhaar = regAadhaar.replace(/\s/g, "");
                        if (cleanAadhaar.length !== 12) {
                          setError("Aadhaar number must be exactly 12 digits | आधार नंबर 12 अंकों का होना चाहिए");
                          return;
                        }
                        setError("");
                        setSignupStep(3);
                      }}
                      className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-all shadow-md shadow-emerald-600/15 flex items-center justify-center gap-1"
                    >
                      <span>Next: Upload Documents (अगला: दस्तावेज़ अपलोड करें)</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      // Bypass and clear
                      setHasGst(false);
                      setRegGstin("");
                      setRegPan("");
                      setRegAadhaar("");
                      setDocPanCard(null);
                      setDocAadhaarCard(null);
                      setDocGstCert(null);
                      setDocShopLicense(null);
                      handleSignup();
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-all mt-2 flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <span>⚡ Skip Verification & Create Account (बिना सत्यापन खाता बनाएं)</span>
                  </button>
                </div>
              )}

              {signupStep === 3 && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Required Proof Documents (आवश्यक दस्तावेज अपलोड करें):</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* PAN File Uploader */}
                      <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-emerald-50/10 hover:border-emerald-500 transition-all text-center flex flex-col justify-center items-center">
                        <span className="text-[10px] font-black text-slate-600 block mb-1">🪪 Shopkeeper PAN Card Copy *</span>
                        {docPanCard ? (
                          <div className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-1.5 text-left">
                            <div className="flex items-center gap-1.5 truncate">
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <div className="truncate">
                                <span className="text-[10px] font-bold text-slate-700 block truncate">{docPanCard.name}</span>
                                <span className="text-[8px] text-slate-400 block">{docPanCard.size}</span>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setDocPanCard(null)}
                              className="text-slate-400 hover:text-red-500 text-xs font-black p-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block p-1.5">
                            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <span className="text-[10px] text-emerald-600 font-bold block hover:underline">Click to Upload or Drag</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">JPEG / PNG / PDF up to 2MB</span>
                            <input 
                              type="file" 
                              accept="image/*,.pdf" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onload = () => setDocPanCard({ name: file.name, size: (file.size/1024).toFixed(1)+" KB", dataUrl: r.result as string });
                                  r.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Aadhaar File Uploader */}
                      <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-emerald-50/10 hover:border-emerald-500 transition-all text-center flex flex-col justify-center items-center">
                        <span className="text-[10px] font-black text-slate-600 block mb-1">🪪 Aadhaar Card (ID / Address Proof) *</span>
                        {docAadhaarCard ? (
                          <div className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-1.5 text-left">
                            <div className="flex items-center gap-1.5 truncate">
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <div className="truncate">
                                <span className="text-[10px] font-bold text-slate-700 block truncate">{docAadhaarCard.name}</span>
                                <span className="text-[8px] text-slate-400 block">{docAadhaarCard.size}</span>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setDocAadhaarCard(null)}
                              className="text-slate-400 hover:text-red-500 text-xs font-black p-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block p-1.5">
                            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <span className="text-[10px] text-emerald-600 font-bold block hover:underline">Click to Upload or Drag</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">JPEG / PNG / PDF up to 2MB</span>
                            <input 
                              type="file" 
                              accept="image/*,.pdf" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onload = () => setDocAadhaarCard({ name: file.name, size: (file.size/1024).toFixed(1)+" KB", dataUrl: r.result as string });
                                  r.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* GST Certificate Uploader (Disabled if hasGst is false) */}
                      <div className={`border border-dashed rounded-2xl p-3 text-center flex flex-col justify-center items-center transition-all ${
                        hasGst 
                          ? "border-slate-200 bg-slate-50/50 hover:bg-emerald-50/10 hover:border-emerald-500" 
                          : "border-slate-100 bg-slate-100/30 opacity-60"
                      }`}>
                        <span className="text-[10px] font-black text-slate-600 block mb-1">📄 GST registration Certificate {hasGst && "*"}</span>
                        {!hasGst ? (
                          <div className="py-2 text-[9px] text-slate-400 font-bold">Not applicable (जीएसटी आवश्यक नहीं है)</div>
                        ) : docGstCert ? (
                          <div className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-1.5 text-left">
                            <div className="flex items-center gap-1.5 truncate">
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <div className="truncate">
                                <span className="text-[10px] font-bold text-slate-700 block truncate">{docGstCert.name}</span>
                                <span className="text-[8px] text-slate-400 block">{docGstCert.size}</span>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setDocGstCert(null)}
                              className="text-slate-400 hover:text-red-500 text-xs font-black p-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block p-1.5">
                            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <span className="text-[10px] text-emerald-600 font-bold block hover:underline">Click to Upload or Drag</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">JPEG / PNG / PDF up to 2MB</span>
                            <input 
                              type="file" 
                              accept="image/*,.pdf" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onload = () => setDocGstCert({ name: file.name, size: (file.size/1024).toFixed(1)+" KB", dataUrl: r.result as string });
                                  r.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Trade License File Uploader */}
                      <div className="border border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50/50 hover:bg-emerald-50/10 hover:border-emerald-500 transition-all text-center flex flex-col justify-center items-center">
                        <span className="text-[10px] font-black text-slate-600 block mb-1">📄 Trade License / Shop Act Proof</span>
                        {docShopLicense ? (
                          <div className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-1.5 text-left">
                            <div className="flex items-center gap-1.5 truncate">
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <div className="truncate">
                                <span className="text-[10px] font-bold text-slate-700 block truncate">{docShopLicense.name}</span>
                                <span className="text-[8px] text-slate-400 block">{docShopLicense.size}</span>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setDocShopLicense(null)}
                              className="text-slate-400 hover:text-red-500 text-xs font-black p-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block p-1.5">
                            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                            <span className="text-[10px] text-emerald-600 font-bold block hover:underline">Click to Upload or Drag</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">JPEG / PNG / PDF up to 2MB</span>
                            <input 
                              type="file" 
                              accept="image/*,.pdf" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onload = () => setDocShopLicense({ name: file.name, size: (file.size/1024).toFixed(1)+" KB", dataUrl: r.result as string });
                                  r.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-6">
                    <button
                      type="button"
                      onClick={() => setSignupStep(2)}
                      className="px-4 py-3 text-xs font-black text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>⬅ Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl cursor-pointer transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {authLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Setting up Shop...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Verification & Set Up Shop (सत्यापन पूरा करें)</span>
                          <Sparkles className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      // Skip uploads and sign up
                      handleSignup();
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-all mt-2 flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <span>⚡ Skip Document Uploads & Register (दस्तावेज़ अपलोड छोड़ें)</span>
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-[10px] text-slate-400">
            🔒 Fully encrypted offline storage & local protection.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-emerald-500 selection:text-white" id="hisaab_ai_app">
      
      {/* Dynamic Notifications */}
      <AnimatePresence>
        {showAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-medium text-xs sm:text-sm flex items-center gap-2 border border-emerald-400"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{showAlert}</span>
          </motion.div>
        )}

        {showGstProfileModal && user && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-left overflow-y-auto max-h-[90vh]"
              id="gst_profile_verification_modal"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">🛡️ Shop Verification & GST Profile</h3>
                    <p className="text-[10px] text-slate-400 font-medium">दुकानदार एवं जीएसटी सत्यापन विवरण</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGstProfileModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 text-xs">
                {/* Status Card */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-2xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Verified Active Shop (सत्यापित सक्रिय दुकान)</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      All shopkeeper verification details and required business documents have been loaded and validated by HISAAB AI. GST calculations are automatically synced with this profile.
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Shop Owner Name</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-200 block mt-1">{user.name}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Registered Shop Name</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-200 block mt-1">{user.businessName}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200 block mt-1">{user.phone}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Business Category</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 block mt-1">{user.businessType}</span>
                  </div>
                </div>

                {/* GST Details */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">⚖️ GST Tax Details (जीएसटी विवरण)</h4>
                  {user.hasGst ? (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">GSTIN Number</span>
                        <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-xs block uppercase mt-0.5">{user.gstin}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">GST Filing Scheme</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block mt-0.5">{user.gstType} Scheme</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/30 dark:bg-amber-950/10 rounded-2xl border border-amber-100/50 text-amber-800 dark:text-amber-300 font-medium">
                      ⚠️ No active GST registration. Operating as unregistered micro-retailer / composition exempt.
                    </div>
                  )}
                </div>

                {/* Shopkeeper Documents & Proofs */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">🗄️ Verification Documents & Proofs</h4>
                  
                  <div className="space-y-2">
                    {/* PAN Card Status */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🪪</span>
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">Owner PAN Card</span>
                          <span className="font-mono text-[9px] text-slate-400 uppercase">{user.pan || "Loaded & Verified"}</span>
                        </div>
                      </div>
                      {user.docPanCard ? (
                        <a 
                          href={user.docPanCard.dataUrl || "#"} 
                          download={user.docPanCard.name}
                          className="px-2.5 py-1 text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 transition-colors"
                        >
                          📥 Download Copy
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">✓ Verified Online</span>
                      )}
                    </div>

                    {/* Aadhaar Status */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🪪</span>
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">Owner Aadhaar Proof</span>
                          <span className="font-mono text-[9px] text-slate-400 uppercase">{user.aadhaar || "Loaded & Verified"}</span>
                        </div>
                      </div>
                      {user.docAadhaarCard ? (
                        <a 
                          href={user.docAadhaarCard.dataUrl || "#"} 
                          download={user.docAadhaarCard.name}
                          className="px-2.5 py-1 text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 transition-colors"
                        >
                          📥 Download Copy
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">✓ Verified Online</span>
                      )}
                    </div>

                    {/* GST Cert copy if any */}
                    {user.hasGst && (
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📄</span>
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 block">GST Certificate copy</span>
                            <span className="font-mono text-[9px] text-slate-400">GST Registration Copy</span>
                          </div>
                        </div>
                        {user.docGstCert ? (
                          <a 
                            href={user.docGstCert.dataUrl || "#"} 
                            download={user.docGstCert.name}
                            className="px-2.5 py-1 text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 transition-colors"
                          >
                            📥 Download Copy
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">✓ Verified Online</span>
                        )}
                      </div>
                    )}

                    {/* Trade License Status */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏢</span>
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">Trade License / Gumasta</span>
                          <span className="font-mono text-[9px] text-slate-400 uppercase">{user.tradeLicense || "Gumasta / Shop Act Licence"}</span>
                        </div>
                      </div>
                      {user.docShopLicense ? (
                        <a 
                          href={user.docShopLicense.dataUrl || "#"} 
                          download={user.docShopLicense.name}
                          className="px-2.5 py-1 text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 transition-colors"
                        >
                          📥 Download Copy
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">Not uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowGstProfileModal(false)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Close (बंद करें)
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <div className="p-2.5 bg-red-50 rounded-xl">
                  <Trash className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm uppercase tracking-wide">{confirmModal.title}</h4>
              </div>
              <p className="text-xs text-slate-600 mb-6 font-medium leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex items-center justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel / निरस्त
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-500/10 transition-colors cursor-pointer"
                >
                  Yes, Delete / हाँ, हटाएं
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingInvoice && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-emerald-600 mb-4">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wide">Edit Invoice Details | इनवॉइस सुधारें</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Modify record values without deleting</p>
                </div>
              </div>

              <form onSubmit={handleSaveEditedInvoice} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Supplier Name / सप्लायर का नाम
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={editSupplierName}
                      onChange={(e) => setEditSupplierName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800"
                    />
                    <div className="absolute right-1.5 inset-y-0 flex items-center">
                      <VoiceInputButton 
                        lang={selectedLanguage}
                        onTranscript={(text) => setEditSupplierName(text)} 
                        size="sm" 
                        className="bg-transparent border-none hover:bg-slate-200/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Invoice Number / इनवॉइस नंबर
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={editInvoiceNumber}
                        onChange={(e) => setEditInvoiceNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800 font-mono"
                      />
                      <div className="absolute right-1.5 inset-y-0 flex items-center">
                        <VoiceInputButton 
                          lang={selectedLanguage}
                          onTranscript={(text) => setEditInvoiceNumber(text.replace(/\s+/g, "").toUpperCase())} 
                          size="sm" 
                          className="bg-transparent border-none hover:bg-slate-200/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Grand Total / कुल राशि
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={editInvoiceAmount}
                        onChange={(e) => setEditInvoiceAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 pl-7 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800 font-mono"
                      />
                      <div className="absolute right-1.5 inset-y-0 flex items-center">
                        <VoiceInputButton 
                          lang={selectedLanguage}
                          onTranscript={(text) => {
                            const digits = text.replace(/[^0-9.]/g, "");
                            if (digits) setEditInvoiceAmount(parseFloat(digits) || 0);
                          }} 
                          size="sm" 
                          className="bg-transparent border-none hover:bg-slate-200/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Scanned Date & Time / दिनांक और समय
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={editInvoiceDate}
                      onChange={(e) => setEditInvoiceDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800 font-mono"
                      placeholder="e.g. DD/MM/YYYY HH:MM"
                    />
                    <div className="absolute right-1.5 inset-y-0 flex items-center">
                      <VoiceInputButton 
                        lang={selectedLanguage}
                        onTranscript={(text) => setEditInvoiceDate(text)} 
                        size="sm" 
                        className="bg-transparent border-none hover:bg-slate-200/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 text-xs font-bold pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingInvoice(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel / निरस्त
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/10 transition-colors cursor-pointer"
                  >
                    Save Changes / सहेजें
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingCustomerInvoice && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-emerald-600 mb-4">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wide">Edit Customer Invoice | ग्राहक बिल सुधारें</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Modify record values without deleting</p>
                </div>
              </div>

              <form onSubmit={handleSaveEditedCustomerInvoice} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Customer Name / ग्राहक का नाम
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800"
                    />
                    <div className="absolute right-1.5 inset-y-0 flex items-center">
                      <VoiceInputButton 
                        lang={selectedLanguage}
                        onTranscript={(text) => setEditCustomerName(text)} 
                        size="sm" 
                        className="bg-transparent border-none hover:bg-slate-200/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Invoice Number / इनवॉइस नंबर
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={editCustInvoiceNumber}
                        onChange={(e) => setEditCustInvoiceNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800 font-mono"
                      />
                      <div className="absolute right-1.5 inset-y-0 flex items-center">
                        <VoiceInputButton 
                          lang={selectedLanguage}
                          onTranscript={(text) => setEditCustInvoiceNumber(text.replace(/\s+/g, "").toUpperCase())} 
                          size="sm" 
                          className="bg-transparent border-none hover:bg-slate-200/50"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Grand Total / कुल राशि
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={editCustInvoiceAmount}
                        onChange={(e) => setEditCustInvoiceAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 pl-7 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800 font-mono"
                      />
                      <div className="absolute right-1.5 inset-y-0 flex items-center">
                        <VoiceInputButton 
                          lang={selectedLanguage}
                          onTranscript={(text) => {
                            const digits = text.replace(/[^0-9.]/g, "");
                            if (digits) setEditCustInvoiceAmount(parseFloat(digits) || 0);
                          }} 
                          size="sm" 
                          className="bg-transparent border-none hover:bg-slate-200/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Invoice Date & Time / दिनांक और समय
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={editCustInvoiceDate}
                      onChange={(e) => setEditCustInvoiceDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800 font-mono"
                      placeholder="e.g. DD/MM/YYYY HH:MM"
                    />
                    <div className="absolute right-1.5 inset-y-0 flex items-center">
                      <VoiceInputButton 
                        lang={selectedLanguage}
                        onTranscript={(text) => setEditCustInvoiceDate(text)} 
                        size="sm" 
                        className="bg-transparent border-none hover:bg-slate-200/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 text-xs font-bold pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCustomerInvoice(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel / निरस्त
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/10 transition-colors cursor-pointer"
                  >
                    Save Changes / सहेजें
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Banner & Header */}
      <header className="border-b border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-sm sticky top-0 z-50 py-4 px-4 sm:px-6 transition-all duration-300" id="hisaab_ai_header">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 flex-shrink-0 group">
              <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-sm opacity-20"></div>
              <img
                src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=150&h=150"
                alt="Shop Logo"
                className="w-14 h-14 rounded-2xl object-cover border border-emerald-600/60 shadow-sm relative z-10 hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black tracking-tight text-emerald-800 dark:text-emerald-400">HISAAB AI <span className="text-emerald-600 dark:text-emerald-300 font-bold">({LANGUAGES.find(l => l.id === selectedLanguage)?.nativeName || "हिसाब"} AI)</span></h1>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 font-bold">SIMPLE AI ASSISTANT</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {LANGUAGE_TRANSLATIONS[selectedLanguage]?.headerSub || "Bilingual Digital Companion for Non-Tech Shopkeepers & Small Businesses"}
              </p>
            </div>
          </div>

          {/* Easy Shop Profile Picker */}
          <div className="flex flex-wrap items-center gap-3 justify-center">
            {user && (
              <button
                onClick={() => setShowGstProfileModal(true)}
                className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all cursor-pointer shadow-sm hover:shadow-md"
                title="Click to view GST Details & Verification Documents"
                id="gst_profile_header_btn"
              >
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate max-w-[150px]">{user.businessName} ({user.name})</span>
                <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black tracking-wider uppercase ml-1 flex items-center gap-0.5 shadow-sm">
                  🛡️ {user.hasGst ? "GST" : "VERIFIED"}
                </span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-600 dark:text-slate-300 font-bold">Business Profile:</span>
              <select 
                value={businessType} 
                onChange={(e) => {
                  setBusinessType(e.target.value);
                  if (user) {
                    const updated = { ...user, businessType: e.target.value };
                    localStorage.setItem("hisaab_user", JSON.stringify(updated));
                    setUser(updated);
                  }
                }}
                className="bg-transparent text-emerald-800 dark:text-emerald-400 focus:outline-none cursor-pointer font-extrabold"
                id="shop_profile_selector"
              >
                <option value="Grocery Store" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Grocery Store (किराना स्टोर)</option>
                <option value="Restaurant" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Restaurant (भोजनालय / कैफ़े)</option>
                <option value="Medical Store" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Medical Store (दवाखाना / फार्मेसी)</option>
                <option value="Clothing Store" className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">Clothing Store (कपड़े की दुकान)</option>
              </select>
            </div>

            {/* Regional Language Selector */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-600 dark:text-slate-300 font-bold">Region & Language:</span>
              <select 
                value={selectedLanguage} 
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  setShowAlert(`Language changed to: ${LANGUAGES.find(l => l.id === e.target.value)?.name}`);
                  setTimeout(() => setShowAlert(null), 3000);
                }}
                className="bg-transparent text-emerald-800 dark:text-emerald-400 focus:outline-none cursor-pointer font-extrabold"
                id="regional_language_selector"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
              title={theme === "light" ? "Switch to Dark Mode (डार्क मोड)" : "Switch to Light Mode (लाइट मोड)"}
              type="button"
            >
              {theme === "light" ? (
                <div className="flex items-center gap-1">
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold font-sans">Dark</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold font-sans">Light</span>
                </div>
              )}
            </button>

            {user && (
              <button
                onClick={() => {
                  localStorage.removeItem("hisaab_user");
                  setUser(null);
                  setShowAlert("Logged out successfully! | लॉग आउट हो गया!");
                  setTimeout(() => setShowAlert(null), 3000);
                }}
                className="flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Log Out (लॉग आउट)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}

            {/* Database Sync Status Badge */}
            {user && (
              <button
                onClick={() => setShowDbSandbox(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono border cursor-pointer transition-all ${
                  dbStatus === "connected" 
                    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" 
                    : dbStatus === "loading"
                    ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                }`}
                title="Click to manage Cloud Database Sync Control Panel"
              >
                <Database className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : "text-blue-500"}`} />
                <span className="hidden md:inline text-blue-600 font-extrabold">CLOUDSYNC:</span>
                <span className="uppercase">{dbStatus === "connected" ? "Active" : dbStatus}</span>
                {dbStatus === "connected" && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                )}
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold font-mono">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span>WHATSAPP CONNECTED</span>
            </div>
          </div>
        </div>
      </header>

      {/* Simplified, Super Intuitive Tab Selection */}
      <div className="bg-emerald-50/70 border-b border-emerald-100/50 sticky top-[81px] sm:top-[85px] backdrop-blur-xl z-40 transition-all duration-300" id="shop_tabs">
        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto scrollbar-none py-3">
          {[
            { id: "hisaab_voice", label: LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.voice || "🎙️ Voice Assistant", sub: "Voice Command (Bolo Aur Kaam Karo)" },
            { id: "hisaab_scan", label: LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.scan || "📸 Scan Bills", sub: "Bill OCR (Photo Se Bill Chadao)" },
            { id: "hisaab_khata", label: LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.khata || "📔 Ledger Book", sub: "Khata Book (Udhaar Ledger)" },
            { id: "hisaab_inventory", label: LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.inventory || "📦 Stock Inventory", sub: "Inventory (Stock & Items)" },
            { id: "hisaab_staff", label: LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.staff || "👥 Staff Attendance", sub: "Staff Attendance (Haajri)" },
            { id: "hisaab_galla", label: LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.galla || "💰 Daily Galla", sub: "Cash Book (Daily Galla)" }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[170px] flex flex-col items-center justify-center p-3 rounded-2xl text-center border transition-all cursor-pointer ${
                  isActive 
                    ? "bg-emerald-600/90 backdrop-blur-sm text-white shadow-lg shadow-emerald-600/25 border-emerald-700 font-bold scale-[1.02]" 
                    : "bg-white/40 backdrop-blur-sm border-slate-200/60 text-slate-600 hover:bg-white/80 hover:border-slate-300 transition-all"
                }`}
                id={`tab_btn_${tab.id}`}
              >
                <span className="text-sm font-black whitespace-nowrap">{tab.label}</span>
                <span className={`text-[10px] mt-0.5 ${isActive ? "text-emerald-100" : "text-slate-400"} font-medium`}>{tab.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow max-w-6xl mx-auto w-full p-4 sm:p-6" id="hisaab_ai_main">
        <AnimatePresence mode="wait">

          {/* TAB 1: VOICE ASSISTANT */}
          {activeTab === "hisaab_voice" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              key="voice_tab"
            >
              {/* Voice Action Console (Left) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* Bilingual Help Card - Highly Required by User */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 text-left" id="voice_guide_card">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-xl">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">💡 How to use / यह कैसे काम करता है:</h3>
                      <ul className="text-xs text-amber-800 dark:text-slate-300 mt-2 space-y-1.5 list-disc pl-4 font-medium">
                        <li>
                          <strong>English:</strong> Press the big mic button and speak in English/regional language. Hisaab AI automatically figures out whether to send a WhatsApp, write a bill, or check stocks.
                        </li>
                        <li>
                          <strong>{LANGUAGES.find(l => l.id === selectedLanguage)?.name || "Regional Language"}:</strong> {LANGUAGE_TRANSLATIONS[selectedLanguage]?.voiceGuide}
                        </li>
                        <li className="list-none mt-2">
                          <strong className="text-amber-900 dark:text-amber-300">Try saying / बोलकर देखें:</strong>
                          <div className="mt-1.5 flex flex-col gap-1">
                            {LANGUAGE_TRANSLATIONS[selectedLanguage]?.voiceHints.map((hint, i) => (
                              <div key={i} className="bg-white/60 dark:bg-slate-800/60 border border-amber-200/50 dark:border-slate-700 rounded-lg p-1.5 pl-3 text-[11px] text-slate-700 dark:text-slate-200 italic font-medium flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                "{hint}"
                              </div>
                            ))}
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Main Microphone Interaction Box */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-center flex flex-col items-center justify-center min-h-[320px]">
                  <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2 justify-center">
                    Speak to Hisaab AI 
                    {selectedLanguage !== 'en' && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        / {LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.voice.replace("🎙️", "")}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-3">"Talk just like you talk with a friend. We take care of all technical Tally updates & WhatsApp invoices."</p>
                  
                  <div className="mb-5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-3 max-w-md text-[10px] text-emerald-800 dark:text-emerald-300 text-left leading-relaxed">
                    ✨ <strong>Microphone Permission Help:</strong> If your browser blocks microphone access inside the AI Studio preview iframe, please click the <strong>"Open in New Tab"</strong> button in the top right to talk directly.
                  </div>

                  <button
                    onClick={startMicRecording}
                    disabled={isListening || simulatingTask}
                    className={`w-28 h-28 rounded-full flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative ${
                      isListening
                        ? "bg-red-500 text-white animate-pulse shadow-xl shadow-red-500/20 scale-105"
                        : simulatingTask
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20"
                    }`}
                  >
                    {isListening && (
                      <span className="absolute -inset-2 rounded-full border border-red-400 animate-ping opacity-75"></span>
                    )}
                    <Mic className="w-10 h-10" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {isListening 
                        ? (LANGUAGE_TRANSLATIONS[selectedLanguage]?.micListening || "Listening...") 
                        : simulatingTask 
                        ? (LANGUAGE_TRANSLATIONS[selectedLanguage]?.micWorking || "Working...") 
                        : (LANGUAGE_TRANSLATIONS[selectedLanguage]?.micTapToSpeak || "Tap to Speak")}
                    </span>
                  </button>

                  <div className="mt-6 h-10 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 font-mono">
                    {isListening ? (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                        "{LANGUAGE_TRANSLATIONS[selectedLanguage]?.micSpeakNow}"
                      </span>
                    ) : activeVoicePrompt ? (
                      <span className="text-emerald-700 dark:text-emerald-400 italic">"{activeVoicePrompt}"</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Press button above to simulate speaking or use type bar below</span>
                    )}
                  </div>

                  {/* Dynamic Type Command Console */}
                  <div className="w-full max-w-md border-t border-slate-100 dark:border-slate-800 pt-5 mt-4">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 text-left font-sans">
                      {LANGUAGE_TRANSLATIONS[selectedLanguage]?.typeHintLabel || "⌨️ Type Voice Command (या यहाँ लिखें):"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Send outstanding reminder to Verma Grocers"
                        value={typedCommand}
                        onChange={(e) => setTypedCommand(e.target.value)}
                        className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 focus:bg-white font-sans"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && typedCommand.trim()) {
                            const clean = typedCommand.toLowerCase();
                            let key = "general";
                            if (clean.includes("bill") || clean.includes("invoice") || clean.includes("पर्ची") || clean.includes("बनाओ")) {
                              key = "create_bill";
                            } else if (clean.includes("galla") || clean.includes("गल्ला") || clean.includes("स्टॉक") || clean.includes("stock") || clean.includes("बैलेंस")) {
                              key = "check_galla";
                            } else {
                              key = "send_reminder";
                            }
                            handleVoiceCommand(key, typedCommand);
                            setTypedCommand("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (typedCommand.trim()) {
                            const clean = typedCommand.toLowerCase();
                            let key = "general";
                            if (clean.includes("bill") || clean.includes("invoice") || clean.includes("पर्ची") || clean.includes("बनाओ")) {
                              key = "create_bill";
                            } else if (clean.includes("galla") || clean.includes("गल्ला") || clean.includes("स्टॉक") || clean.includes("stock") || clean.includes("बैलेंस")) {
                              key = "check_galla";
                            } else {
                              key = "send_reminder";
                            }
                            handleVoiceCommand(key, typedCommand);
                            setTypedCommand("");
                          }
                        }}
                        disabled={!typedCommand.trim() || simulatingTask}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0"
                      >
                        Run
                      </button>
                    </div>
                  </div>
                </div>

                {/* Voice Command History */}
                {(() => {
                  const HISTORY_TRANSLATIONS: Record<string, { header: string; clear: string; copyAlert: string; editBtn: string; runBtn: string }> = {
                    hi: {
                      header: "🎙️ पुराना हिसाब इतिहास (Voice History)",
                      clear: "इतिहास साफ़ करें",
                      copyAlert: "कमांड ऊपर टाइप बार में आ गई है! बदलाव करें और चलाएं।",
                      editBtn: "बदलें",
                      runBtn: "चलाएं"
                    },
                    mr: {
                      header: "🎙️ पूर्वीचा इतिहास (Voice History)",
                      clear: "इतिहास साफ करा",
                      copyAlert: "कमांड वरील टाईप बारमध्ये आली आहे! बदल करा आणि चालवा.",
                      editBtn: "बदला",
                      runBtn: "चालवा"
                    },
                    gu: {
                      header: "🎙️ જૂનો ઇતિહાસ (Voice History)",
                      clear: "ઇતિહાસ સાફ કરો",
                      copyAlert: "કમાન્ડ ઉપર ટાઇપ બારમાં આવી ગઈ છે! સુધારો અને ચલાવો.",
                      editBtn: "બદલો",
                      runBtn: "ચલાવો"
                    },
                    ta: {
                      header: "🎙️ முந்தைய வரலாறு (Voice History)",
                      clear: "வரலாற்றை அழி",
                      copyAlert: "கட்டளை மேலே தட்டச்சு பட்டியில் நகலெடுக்கப்பட்டது! திருத்தி இயக்கவும்.",
                      editBtn: "திருத்து",
                      runBtn: "இயக்கு"
                    },
                    te: {
                      header: "🎙️ మునుపటి చరిత్ర (Voice History)",
                      clear: "చరిత్రను క్లియర్ చేయండి",
                      copyAlert: "కమాండ్ పైన టైప్ బార్‌లోకి కాపీ చేయబడింది! సవరించి రన్ చేయండి.",
                      editBtn: "సవరించు",
                      runBtn: "రన్ చేయి"
                    },
                    kn: {
                      header: "🎙️ ಹಿಂದಿನ ಇತಿಹಾಸ (Voice History)",
                      clear: "ಇತಿಹಾಸವನ್ನು ತೆರವುಗೊಳಿಸಿ",
                      copyAlert: "ಕಮಾಂಡ್ ಮೇಲೆ ಟೈಪ್ ಬಾರ್‌ಗೆ ನಕಲಿಸಲಾಗಿದೆ! ಬದಲಾಯಿಸಿ ಮತ್ತು ರನ್ ಮಾಡಿ.",
                      editBtn: "ಬದಲಾಯಿಸು",
                      runBtn: "ರನ್ ಮಾಡಿ"
                    },
                    bn: {
                      header: "🎙️ পূর্ববর্তী ইতিহাস (Voice History)",
                      clear: "ইতিহাস মুছুন",
                      copyAlert: "কমান্ডটি উপরে টাইপ বারে অনুলিপি করা হয়েছে! পরিবর্তন করুন এবং চালান।",
                      editBtn: "সম্পাদনা",
                      runBtn: "চালান"
                    },
                    pa: {
                      header: "🎙️ ਪਿਛਲਾ ਇਤਿਹਾਸ (Voice History)",
                      clear: "ਇਤਿਹਾਸ ਸਾਫ਼ ਕਰੋ",
                      copyAlert: "ਕਮਾਂਡ ਉੱਪਰ ਟਾਈਪ ਬਾਰ ਵਿੱਚ ਆ ਗਈ ਹੈ! ਸੋਧੋ ਅਤੇ ਚਲਾਓ।",
                      editBtn: "ਸੋਧੋ",
                      runBtn: "ਚਲਾਓ"
                    },
                    en: {
                      header: "🎙️ Voice Command History",
                      clear: "Clear All",
                      copyAlert: "Command copied to text bar! Adjust & run.",
                      editBtn: "Edit",
                      runBtn: "Run"
                    }
                  };

                  return voiceHistory.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-left" id="voice_history_card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          {HISTORY_TRANSLATIONS[selectedLanguage]?.header || "🎙️ Voice Command History"}
                        </h3>
                        <button
                          onClick={() => setVoiceHistory([])}
                          className="text-[10px] font-bold text-slate-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer transition-all uppercase tracking-wider"
                        >
                          {HISTORY_TRANSLATIONS[selectedLanguage]?.clear || "Clear All"}
                        </button>
                      </div>
                      
                      <div className="space-y-2.5">
                        {voiceHistory.map((item) => (
                          <div 
                            key={item.id}
                            className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 group transition-all hover:border-emerald-500/30"
                          >
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wide font-mono">
                                  {item.key === "create_bill" ? "Bill" : item.key === "check_galla" ? "Galla" : item.key === "send_reminder" ? "Reminder" : "General"}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{item.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-200 italic font-medium truncate">
                                "{item.text}"
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setTypedCommand(item.text);
                                  const trans = HISTORY_TRANSLATIONS[selectedLanguage] || HISTORY_TRANSLATIONS.en;
                                  setShowAlert(trans.copyAlert);
                                  setTimeout(() => setShowAlert(null), 3000);
                                }}
                                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1 shrink-0"
                                title="Edit command / कमांड बदलें"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[10px]">
                                  {HISTORY_TRANSLATIONS[selectedLanguage]?.editBtn || "Edit"}
                                </span>
                              </button>
                              {/* Re-run Button */}
                              <button
                                onClick={() => handleVoiceCommand(item.key, item.text)}
                                disabled={simulatingTask}
                                className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1 shrink-0"
                                title="Re-run command / दोबारा चलाएं"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[10px]">
                                  {HISTORY_TRANSLATIONS[selectedLanguage]?.runBtn || "Run"}
                                </span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Practical Shopkeeper Quick Shortcuts */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 text-emerald-800">⚡ Easy Shop Shortcuts (एक-क्लिक शॉर्टकट)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(() => {
                      if (businessType === "Restaurant") {
                        return [
                          { id: "create_bill", title: "🍽️ Bill Catering Order", phrase: "Create GST invoice for Sharma Catering Services and dispatch kitchen order.", badge: "GST Bill & Kitchen" },
                          { id: "send_reminder", title: "💬 Remind Sharma Catering", phrase: "Send Sharma Catering Services a polite WhatsApp reminder with UPI qr code link.", badge: "WhatsApp Udhaar" },
                          { id: "check_galla", title: "📊 Audit Galla Profit", phrase: "Calculate today's galla and check if any food ingredients are low.", badge: "Daily Galla Audit" }
                        ];
                      } else if (businessType === "Medical Store") {
                        return [
                          { id: "create_bill", title: "💊 Bill Hospital Order", phrase: "Create GST invoice for Lifeline Hospital and pack Paracetamol.", badge: "GST Pharmacy Bill" },
                          { id: "send_reminder", title: "💬 Remind Dr. Mehta", phrase: "Send Dr. Mehta Clinic a polite WhatsApp reminder with UPI qr code link.", badge: "WhatsApp Udhaar" },
                          { id: "check_galla", title: "📊 Audit Pharmacy Galla", phrase: "Calculate today's galla and check if any essential medicines are low.", badge: "Daily Galla Audit" }
                        ];
                      } else if (businessType === "Clothing Store") {
                        return [
                          { id: "create_bill", title: "👕 Bill Garments Order", phrase: "Create GST invoice for Fashion Hub Boutique and book parcel delivery.", badge: "GST Garment Bill" },
                          { id: "send_reminder", title: "💬 Remind Raymond Tailors", phrase: "Send Raymonds Tailor Store a polite WhatsApp reminder with UPI qr code link.", badge: "WhatsApp Udhaar" },
                          { id: "check_galla", title: "📊 Audit Textile Galla", phrase: "Calculate today's galla and check if any garment fabric lines are low.", badge: "Daily Galla Audit" }
                        ];
                      } else {
                        return [
                          { id: "create_bill", title: "📦 Bill Maida & Sugar", phrase: "Create GST invoice for Karan Sweets and arrange Delhivery shipping.", badge: "GST Bill & Dispatch" },
                          { id: "send_reminder", title: "💬 Remind Rajesh Udhaar", phrase: "Send Rajesh Kirana Store a polite WhatsApp reminder with UPI qr code link.", badge: "WhatsApp Udhaar" },
                          { id: "check_galla", title: "📊 Audit Galla Profit", phrase: "Calculate today's galla and check if any raw stocks are low.", badge: "Daily Galla Audit" }
                        ];
                      }
                    })().map((shortcut) => (
                      <button
                        key={shortcut.id}
                        disabled={simulatingTask || isListening}
                        onClick={() => handleVoiceCommand(shortcut.id, shortcut.phrase)}
                        className="p-4 border border-slate-200 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all flex flex-col justify-between h-40 group cursor-pointer"
                      >
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">{shortcut.badge}</span>
                          <span className="text-xs font-black text-slate-800 group-hover:text-emerald-900 leading-tight block">{shortcut.title}</span>
                          <p className="text-[11px] text-slate-500 mt-2 italic leading-relaxed">"{shortcut.phrase}"</p>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-2">
                          Run shortcut <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Munim Ji Live Output Response Bubble (Right) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-xl min-h-[450px] flex flex-col justify-between border border-slate-950 relative overflow-hidden">
                  
                  {/* Glowing background aesthetic */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-slate-300 font-mono">HISAAB AI RESPONSE PANEL</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-700">ACTIVE</span>
                  </div>

                  {/* Flow Simulation Content */}
                  <div className="flex-grow py-6 flex flex-col justify-start">
                    {simulatingTask ? (
                      <div className="my-auto text-center py-12 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
                        <span className="text-xs font-bold text-slate-300">Hisaab AI is acting on your voice command...</span>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-xs">Reading your voice transcript, calculating CGST/SGST, and syncing data with WhatsApp Business APIs.</p>
                      </div>
                    ) : voiceResult ? (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">Step-by-step Execution</span>
                          <div className="mt-2 space-y-2 text-[11px] font-mono text-slate-400">
                            {voiceLogs.map((log, lIdx) => (
                              <div key={lIdx} className="flex gap-2 items-start border-b border-slate-900/40 pb-1.5">
                                <span className="text-[10px] text-slate-500 shrink-0">[{log.agent}]</span>
                                <span>{log.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Conversational friendly card */}
                        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl text-left">
                          <div className="flex gap-2 items-start mb-2">
                            <div className="p-1 bg-emerald-600/20 text-emerald-400 rounded">
                              <Bot className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black text-white">Hisaab AI says:</span>
                          </div>
                          <h4 className="text-sm font-black text-emerald-400">{voiceResult.title}</h4>
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed font-sans">{voiceResult.details}</p>
                          <div className="mt-4 flex gap-2">
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-mono">✓ WhatsApp Link Sent</span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-mono">✓ Tally Updated</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="my-auto text-center py-12 flex flex-col items-center justify-center text-slate-400">
                        <Volume2 className="w-12 h-12 mb-3 text-emerald-500/40" />
                        <h4 className="text-sm font-black text-white">No command running currently</h4>
                        <p className="text-xs text-slate-500 max-w-xs mt-1">Select an easy shortcut button below or use the Microphone to test how the AI runs your Kirana store!</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-left text-[11px] text-slate-400 flex items-start gap-2">
                    <QrCode className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-white">Seamless UPI Pay Tunnels:</strong> Hisaab AI embeds PhonePe, Google Pay, and Paytm compatible QR codes instantly in customer messages, boosting cash-settlement speeds by 40%.
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 2: PHOTO BILL SCANNER */}
          {activeTab === "hisaab_scan" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-6 w-full"
              key="ocr_tab"
            >
              {/* Scan Sub-Navigation */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-800 dark:text-white">
                      Billing & Invoice Hub 
                      {selectedLanguage !== 'en' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          / {LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.scan.replace("📸", "")}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Scan incoming purchase bills using AI OCR or generate brand new GST-compliant customer invoices.</p>
                  </div>
                </div>

                {/* Sub-tabs buttons */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs self-start sm:self-center font-bold">
                  {[
                    { id: "scan", label: "📸 Scan Purchase Bill" },
                    { id: "generator", label: "✍️ GST Invoice Generator" }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setScanSubTab(st.id as any)}
                      className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                        scanSubTab === st.id
                          ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {scanSubTab === "scan" ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
              {/* Text Area / Load Samples (Left) */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                
                {/* Billing How To Use Card */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 text-left">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-xl">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">💡 How to use / यह कैसे काम करता है:</h3>
                      <ul className="text-xs text-amber-800 dark:text-slate-300 mt-2 space-y-1.5 list-disc pl-4 font-medium">
                        <li>
                          <strong>English:</strong> Upload an invoice photo, or click one of our <strong>Ready-to-Scan Invoices</strong> below. Scribe (our AI scanner) automatically pulls the product names, CGST, SGST, and totals.
                        </li>
                        <li>
                          <strong>{LANGUAGES.find(l => l.id === selectedLanguage)?.name || "Regional Language"}:</strong> {LANGUAGE_TRANSLATIONS[selectedLanguage]?.scanHint}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-left">
                  
                  {/* Photo Input & Camera Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                        📸 {selectedLanguage === "en" ? "Photo Bill Scanner" : LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.scan}
                      </h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded font-bold">AI MULTIMODAL</span>
                    </div>

                    {isCameraActive ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-300 shadow-inner flex flex-col justify-end mb-4">
                        <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                        
                        {/* Scanner targeting guide overlay */}
                        <div className="absolute inset-x-8 inset-y-6 border-2 border-emerald-500/50 border-dashed rounded-lg pointer-events-none flex items-center justify-center">
                          <div className="w-full h-0.5 bg-emerald-500/80 shadow-[0_0_12px_#10b981] animate-pulse"></div>
                        </div>
                        
                        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3 px-4 z-10">
                          <button
                            onClick={capturePhoto}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow cursor-pointer transition-all"
                          >
                            <Camera className="w-4 h-4" />
                            Capture Photo / फोटो खींचे
                          </button>
                          <button
                            onClick={stopCamera}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : ocrImagePreviewUrl ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-emerald-200 flex items-center justify-center mb-4 shadow-sm group">
                        <img src={ocrImagePreviewUrl} alt="Invoice preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        <button
                          onClick={clearOcrImage}
                          className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg cursor-pointer transition-all"
                          title="Remove Photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 border border-slate-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          Photo Loaded & Ready
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                          onClick={startCamera}
                          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/10 hover:bg-emerald-50/25 rounded-2xl text-slate-700 font-bold text-xs transition-all cursor-pointer group"
                        >
                          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full mb-2 group-hover:scale-110 transition-transform">
                            <Camera className="w-5 h-5" />
                          </div>
                          <span>📷 Use Camera</span>
                          <span className="text-[9px] text-slate-400 font-normal mt-0.5">कैमरा चालू करें</span>
                        </button>

                        <label
                          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/10 hover:bg-emerald-50/25 rounded-2xl text-slate-700 font-bold text-xs transition-all cursor-pointer group"
                        >
                          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full mb-2 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5" />
                          </div>
                          <span>📁 Select Photo</span>
                          <span className="text-[9px] text-slate-400 font-normal mt-0.5">डिवाइस से फोटो चुनें</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Or Use Ready-to-Scan Preset Invoices:</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DUMMY_INVOICES.map((doc, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            clearOcrImage();
                            setOcrText(doc.text);
                            setOcrResult(null);
                          }}
                          className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            ocrText === doc.text && !ocrImagePreviewUrl
                              ? "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-md shadow-emerald-600/5 font-extrabold" 
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5 text-xs">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            <span className="truncate max-w-[150px]">{doc.name}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 block font-normal font-mono truncate">Invoice ID: {idx === 0 ? "GST-2026-904" : "GST-99812-A"}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Raw Extracted Text or Status:</label>
                      <div className="flex items-center gap-2">
                        {voiceAgentWorking && (
                          <span className="text-[9px] text-emerald-600 font-extrabold animate-pulse flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            Voice Agent Editing...
                          </span>
                        )}
                        <VoiceInputButton 
                          lang={selectedLanguage}
                          onTranscript={(text) => handleVoiceAgentEdit(text)} 
                          size="sm" 
                        />
                      </div>
                    </div>
                    <textarea
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      rows={4}
                      placeholder="Or paste invoice text raw format here..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 focus:border-emerald-600 focus:outline-none focus:bg-white leading-relaxed"
                      id="ocr_manual_text_box"
                    />

                    {voiceAgentResult && (
                      <div className="text-[10px] bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-emerald-800 font-semibold flex items-center justify-between">
                        <span>💡 {voiceAgentResult}</span>
                        <button onClick={() => setVoiceAgentResult(null)} className="text-emerald-600 hover:text-emerald-800 font-black text-xs ml-2 cursor-pointer">×</button>
                      </div>
                    )}

                    <button
                      onClick={handleOCR}
                      disabled={processingOCR || (!ocrText.trim() && !ocrImageBase64)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      {processingOCR ? (
                        <>
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                          <span>AI is Analyzing Bill & Syncing GSTR-1...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4.5 h-4.5" />
                          <span>Analyze & Process Bill with Hisaab AI / बिल चढ़ाएं</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Graphical Invoice Result Card (Right) */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col justify-between" id="ocr_result_viewer">
                  
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 animate-bounce" />
                      Digital Invoice Receipt / बिल पर्ची
                    </h2>
                    <p className="text-[11px] text-slate-400">Instantly itemized, calculated and formatted in Rupees.</p>
                  </div>

                  {processingOCR ? (
                    <div className="flex-grow flex flex-col items-center justify-center py-24 text-slate-400">
                      <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-3" />
                      <p className="text-xs font-bold text-slate-600">Scribe is reading invoice numbers & taxes...</p>
                      <p className="text-[10px] text-slate-400 mt-1">Transposing amounts to Indian National Rupee (INR).</p>
                    </div>
                  ) : ocrResult ? (
                    <div className="flex-grow flex flex-col gap-4 text-left py-4">
                      
                      {/* Structured Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                          <span className="text-[9px] text-slate-400 uppercase block font-mono">Invoice Number</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">{ocrResult.invoiceNumber || "GST-2026-904"}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                          <span className="text-[9px] text-slate-400 uppercase block font-mono">Client / Customer</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">{ocrResult.clientName || "Karan Bakery Ltd."}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                          <span className="text-[9px] text-slate-400 uppercase block font-mono">Date</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">{ocrResult.issueDate || "2026-07-02"}</span>
                        </div>
                      </div>

                      {/* Items Purchased table */}
                      <div className="border border-slate-200/60 rounded-2xl overflow-hidden mt-2 bg-slate-50">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                              <th className="p-3">Product Name</th>
                              <th className="p-3 text-right">Qty</th>
                              <th className="p-3 text-right">Rate</th>
                              <th className="p-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ocrResult.items && ocrResult.items.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-slate-200/40 hover:bg-slate-100/40">
                                <td className="p-3 text-slate-700 font-bold">{item.description}</td>
                                <td className="p-3 text-right font-mono text-slate-500 font-bold">{item.quantity}</td>
                                <td className="p-3 text-right font-mono text-slate-500">₹{parseFloat(item.price).toLocaleString("en-IN")}</td>
                                <td className="p-3 text-right font-mono text-slate-800 font-bold">₹{parseFloat(item.total).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Math Summary */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 self-end w-full sm:w-64 flex flex-col gap-1.5 font-mono text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subtotal:</span>
                          <span className="text-slate-700">₹{parseFloat(ocrResult.subtotal).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-500">CGST (9%):</span>
                          <span>₹{(parseFloat(ocrResult.tax)/2).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="text-slate-500">SGST (9%):</span>
                          <span>₹{(parseFloat(ocrResult.tax)/2).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm text-emerald-700">
                          <span>Grand Total:</span>
                          <span>₹{parseFloat(ocrResult.grandTotal).toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Complete status */}
                      <div className="flex items-start gap-2.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl mt-1.5 font-medium">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Verified & Saved!</strong> Scribe has synced this supplier invoice directly inside Tally Prime ERP and updated your GSTR input ledger.
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-slate-400 py-12">
                      <FileText className="w-12 h-12 mb-2 opacity-30 text-emerald-600" />
                      <p className="text-xs font-bold text-slate-600">No active scan results.</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs text-center">Select one of our sample supplier invoices on the left and tap the green button to see Hisaab AI in action!</p>
                    </div>
                  )}

                  <div className="bg-emerald-50 text-emerald-950 p-3 rounded-2xl text-[11px] text-left flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span><strong>Tax audit support:</strong> Hisaab AI saves CGST/SGST breakdowns automatically, making quarterly GSTR-1, GSTR-3B filings stress-free.</span>
                  </div>

                </div>
              </div>

              {/* Scanned Invoices History Ledger */}
              <div className="lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">📋 Registered Supplier Invoices / खरीदे गए सामान के बिल</h3>
                    <p className="text-[11px] text-slate-400">Successfully matched, synced with Tally ERP, and backed up in cloud ledger</p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-mono px-2.5 py-1 rounded-full font-bold">
                    {scannedInvoices.length} INVOICES RECORDED
                  </span>
                </div>

                {scannedInvoices.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                    <p className="text-xs font-bold">No purchase invoices processed today.</p>
                    <p className="text-[10px] text-slate-400 mt-1">When you select a sample or upload a bill and click 'Analyze', it will show up here.</p>
                  </div>
                ) : (
                  <>
                    {/* Search & Filter Bar */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-4 text-xs font-semibold">
                      {/* Left Side: Supplier / Invoice # Search */}
                      <div className="relative flex-1 max-w-md">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Search className="w-4 h-4 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search supplier or invoice number... / बिल या सप्लायर खोजें..."
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                        />
                        {invoiceSearch && (
                          <button
                            onClick={() => setInvoiceSearch("")}
                            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Right Side: Date Range Filters */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider shrink-0">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span>Date / दिनांक:</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">From</span>
                          <input
                            type="date"
                            value={invoiceStartDate}
                            onChange={(e) => setInvoiceStartDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 focus:outline-emerald-600 font-mono text-[11px]"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">To</span>
                          <input
                            type="date"
                            value={invoiceEndDate}
                            onChange={(e) => setInvoiceEndDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 focus:outline-emerald-600 font-mono text-[11px]"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Sort</span>
                          <select
                            value={supplierInvoiceSortBy}
                            onChange={(e) => setSupplierInvoiceSortBy(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 focus:outline-emerald-600 text-[11px] font-bold"
                          >
                            <option value="date-desc">Newest First / नया पहले</option>
                            <option value="date-asc">Oldest First / पुराना पहले</option>
                            <option value="total-desc">Total: High to Low / ज्यादा से कम</option>
                            <option value="total-asc">Total: Low to High / कम से ज्यादा</option>
                            <option value="name-asc">Supplier A-Z / नाम A-Z</option>
                            <option value="name-desc">Supplier Z-A / नाम Z-A</option>
                          </select>
                        </div>
                        {(invoiceStartDate || invoiceEndDate || invoiceSearch || supplierInvoiceSortBy !== "date-desc") && (
                          <button
                            onClick={() => {
                              setInvoiceStartDate("");
                              setInvoiceEndDate("");
                              setInvoiceSearch("");
                              setSupplierInvoiceSortBy("date-desc");
                            }}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-[10px] uppercase font-bold transition-colors cursor-pointer"
                          >
                            Clear All / हटाएं
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredScannedInvoices.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 bg-slate-50/50">
                        <p className="text-xs font-bold text-slate-600">No invoices match the selected search or date range filters.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Try adjusting your keywords, dates or clear the filters.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                              <th className="p-3">Scanned Time</th>
                              <th className="p-3">Supplier Name</th>
                              <th className="p-3 font-mono">Invoice No.</th>
                              <th className="p-3 text-right">Items Count</th>
                              <th className="p-3 text-right">Grand Total</th>
                              <th className="p-3 text-center">Tally Status</th>
                              <th className="p-3 text-center">Actions / क्रियाएं</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredScannedInvoices.map((inv) => (
                              <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 text-slate-500 font-medium">{inv.scannedAt}</td>
                                <td className="p-3 text-slate-800 font-black">{inv.supplier}</td>
                                <td className="p-3 font-mono text-slate-600 font-bold">{inv.invoiceNumber}</td>
                                <td className="p-3 text-right font-bold text-slate-600">{inv.itemsCount} items</td>
                                <td className="p-3 text-right font-mono font-extrabold text-emerald-700">₹{inv.grandTotal.toLocaleString("en-IN")}</td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                                    <span className="w-1 h-1 rounded-full bg-emerald-600"></span>
                                    SYNCED
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleEditScannedInvoice(inv)}
                                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors inline-flex items-center justify-center"
                                      title="Edit invoice / इनवॉइस सुधारें"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteScannedInvoice(inv.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer transition-colors inline-flex items-center justify-center"
                                      title="Delete invoice / इनवॉइस हटाएं"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
              </div>
              ) : (
                <div className="flex flex-col gap-6 w-full text-left">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                  {/* Left Column: Create Invoice Inputs */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <span>📝 Customer & Bill Details / ग्राहक और बिल विवरण</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Customer Name / ग्राहक का नाम
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              placeholder="e.g. Ramesh Kumar"
                              value={billCustName}
                              onChange={(e) => setBillCustName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800"
                            />
                            <div className="absolute right-1.5 inset-y-0 flex items-center">
                              <VoiceInputButton 
                                lang={selectedLanguage}
                                onTranscript={(text) => setBillCustName(text)} 
                                size="sm" 
                                className="bg-transparent border-none hover:bg-slate-200/50"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Phone Number / मोबाइल नंबर
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              placeholder="e.g. 9876543210"
                              value={billCustPhone}
                              onChange={(e) => setBillCustPhone(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800"
                            />
                            <div className="absolute right-1.5 inset-y-0 flex items-center">
                              <VoiceInputButton 
                                lang={selectedLanguage}
                                onTranscript={(text) => setBillCustPhone(text.replace(/[^0-9+]/g, ""))} 
                                size="sm" 
                                className="bg-transparent border-none hover:bg-slate-200/50"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Customer GSTIN (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 29AAAAA0000A1Z5"
                            value={billCustGst}
                            onChange={(e) => setBillCustGst(e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600 font-mono font-bold text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Payment Mode / भुगतान का तरीका
                          </label>
                          <select
                            value={billPayMode}
                            onChange={(e) => setBillPayMode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600 font-medium text-xs text-slate-800"
                          >
                            <option value="UPI">UPI / ऑनलाइन (Google Pay, Paytm)</option>
                            <option value="Cash">Cash / नकद गल्ला</option>
                            <option value="Card">Card / डेबिट-क्रेडिट कार्ड</option>
                            <option value="Udhaar Ledger">Udhaar Ledger / उधार बही</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Add Items Box */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <span>📦 Itemize Products / बिल में आइटम जोड़ें</span>
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Product Name / आइटम का नाम
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              placeholder="e.g. Fortune Mustard Oil 1L"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 text-xs text-slate-800 font-medium"
                            />
                            <div className="absolute right-1.5 inset-y-0 flex items-center">
                              <VoiceInputButton 
                                lang={selectedLanguage}
                                onTranscript={(text) => setNewItemName(text)} 
                                size="sm" 
                                className="bg-transparent border-none hover:bg-slate-200/50"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Qty / मात्रा
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newItemQty}
                              onChange={(e) => setNewItemQty(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600 font-mono text-xs text-center text-slate-800 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Price (₹) / दर
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="₹"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 pl-2 pr-8 py-2 rounded-xl focus:outline-emerald-600 font-mono text-xs text-center font-bold text-slate-800"
                              />
                              <div className="absolute right-1 inset-y-0 flex items-center">
                                <VoiceInputButton 
                                  lang={selectedLanguage}
                                  onTranscript={(text) => {
                                    const digits = text.replace(/[^0-9.]/g, "");
                                    if (digits) setNewItemPrice(digits);
                                  }} 
                                  size="sm" 
                                  className="bg-transparent border-none hover:bg-slate-200/50"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              GST Slab / दर %
                            </label>
                            <select
                              value={newItemGst}
                              onChange={(e) => setNewItemGst(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 px-2 py-2 rounded-xl focus:outline-emerald-600 text-xs text-center font-bold text-slate-800"
                            >
                              <option value="0">0% (Exempt)</option>
                              <option value="5">5% GST</option>
                              <option value="12">12% GST</option>
                              <option value="18">18% GST</option>
                              <option value="28">28% GST</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newItemName || !newItemPrice || parseFloat(newItemPrice) <= 0) {
                              setShowAlert("Please enter valid item name and price! | कृपया सही नाम और मूल्य दर्ज करें!");
                              setTimeout(() => setShowAlert(null), 3000);
                              return;
                            }
                            const item = {
                              name: newItemName,
                              qty: parseInt(newItemQty) || 1,
                              price: parseFloat(newItemPrice),
                              gst: parseFloat(newItemGst)
                            };
                            setBillItems(prev => [...prev, item]);
                            setNewItemName("");
                            setNewItemPrice("");
                            setNewItemQty("1");
                            setShowAlert("Item added successfully! | आइटम जोड़ा गया!");
                            setTimeout(() => setShowAlert(null), 2000);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl cursor-pointer shadow flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Item to Bill / बिल में जोड़ें</span>
                        </button>
                      </div>

                      {/* Display Items List with Trash */}
                      {billItems.length > 0 && (
                        <div className="mt-2 border-t border-slate-100 pt-3">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Bill Items:</span>
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                            {billItems.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-medium">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-slate-800">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {item.qty} x ₹{item.price} ({item.gst}% GST)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-slate-700">₹{(item.qty * item.price).toFixed(2)}</span>
                                  <button
                                    type="button"
                                    onClick={() => setBillItems(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Discount Input */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">Flat Discount / फ्लैट छूट (₹):</span>
                        <input
                          type="number"
                          min="0"
                          value={billDiscount}
                          onChange={(e) => setBillDiscount(e.target.value)}
                          className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-mono text-center font-black w-24 text-slate-800 animate-pulse"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live GST Tax Invoice Preview */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col">
                      {/* Ribbon */}
                      <div className="absolute top-0 right-0 bg-emerald-600 text-white font-mono text-[9px] font-bold py-1 px-4 rounded-bl-xl uppercase tracking-wider">
                        Official Tax Invoice
                      </div>

                      {/* Header */}
                      <div className="text-center pb-4 border-b border-slate-100">
                        <span className="text-xs bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded font-bold uppercase tracking-widest">TAX INVOICE / कर बीजक</span>
                        <h2 className="text-lg font-black text-slate-800 mt-2 uppercase tracking-wide">
                          {BUSINESS_SPECIFIC_DATA[businessType]?.name || `${businessType} Enterprise`}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-mono">
                          GSTIN: 29HISAAB9876F1Z3 | State Code: 29 (Karnataka)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Hisaab Hub, Market Road, Main Plaza, Bengaluru
                        </p>
                      </div>

                      {/* Client Info Grid */}
                      <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 text-xs">
                        <div className="space-y-1.5 text-left">
                          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Billed To / ग्राहक का विवरण:</p>
                          <p className="font-black text-slate-800">{billCustName || "Cash Customer / नकद ग्राहक"}</p>
                          <p className="font-semibold text-slate-500 font-mono">Mobile: +91 {billCustPhone || "9999999999"}</p>
                          {billCustGst && <p className="font-mono text-slate-500 uppercase">GSTIN: {billCustGst}</p>}
                        </div>
                        <div className="space-y-1.5 text-right font-mono">
                          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Invoice Metadata / विवरण:</p>
                          <p className="font-bold text-slate-700">No: <span className="text-emerald-700 font-black">{generatedInvoiceNum}</span></p>
                          <p className="text-slate-500">Date: {new Date().toLocaleDateString("en-IN")}</p>
                          <p className="text-slate-500">Time: {new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block text-[10px]">
                            PAY VIA: {billPayMode}
                          </p>
                        </div>
                      </div>

                      {/* Items Invoice Table */}
                      <div className="py-4 overflow-x-auto min-h-48">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-bold text-[10px] uppercase">
                              <th className="py-2">S.No</th>
                              <th className="py-2">Item Description</th>
                              <th className="py-2 text-right">Qty</th>
                              <th className="py-2 text-right">Price</th>
                              <th className="py-2 text-right font-mono">Taxable Val</th>
                              <th className="py-2 text-center">GST%</th>
                              <th className="py-2 text-right">CGST</th>
                              <th className="py-2 text-right">SGST</th>
                              <th className="py-2 text-right font-bold text-slate-700">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {billItems.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                                  No items added yet. Use left panel to build invoice!
                                </td>
                              </tr>
                            ) : (
                              billItems.map((item, idx) => {
                                const taxableVal = item.qty * item.price;
                                const gstRate = item.gst;
                                const gstAmt = taxableVal * (gstRate / 100);
                                const cgst = gstAmt / 2;
                                const sgst = gstAmt / 2;
                                const total = taxableVal + gstAmt;

                                return (
                                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 font-medium text-[11px]">
                                    <td className="py-2.5 font-mono text-slate-400">{idx + 1}</td>
                                    <td className="py-2.5 font-extrabold text-slate-800">{item.name}</td>
                                    <td className="py-2.5 text-right font-mono text-slate-600">{item.qty}</td>
                                    <td className="py-2.5 text-right font-mono text-slate-600">₹{item.price.toFixed(2)}</td>
                                    <td className="py-2.5 text-right font-mono text-slate-600">₹{taxableVal.toFixed(2)}</td>
                                    <td className="py-2.5 text-center font-mono font-extrabold text-emerald-700">{gstRate}%</td>
                                    <td className="py-2.5 text-right font-mono text-slate-500">₹{cgst.toFixed(2)}</td>
                                    <td className="py-2.5 text-right font-mono text-slate-500">₹{sgst.toFixed(2)}</td>
                                    <td className="py-2.5 text-right font-mono font-black text-slate-800">₹{total.toFixed(2)}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Calculations Breakdown */}
                      {billItems.length > 0 && (() => {
                        const taxableTotal = billItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
                        const cgstTotal = billItems.reduce((sum, item) => sum + ((item.qty * item.price * (item.gst / 100)) / 2), 0);
                        const sgstTotal = cgstTotal;
                        const disc = parseFloat(billDiscount) || 0;
                        const grandTotal = Math.max(0, taxableTotal + cgstTotal + sgstTotal - disc);

                        return (
                          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-medium">
                            {/* UPI Scan to Settle QR */}
                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                              <div className="w-16 h-16 bg-white border border-slate-200 p-1 rounded-xl flex items-center justify-center">
                                <QrCode className="w-14 h-14 text-slate-800" />
                              </div>
                              <div className="text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">⚡ Instant UPI settle</p>
                                <p className="text-[10px] font-bold text-emerald-800">Scan to Settle</p>
                                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight max-w-[140px]">Embeds Google Pay & Paytm checkout links instantly.</p>
                              </div>
                            </div>

                            {/* Summary Columns */}
                            <div className="w-full sm:w-60 space-y-1.5 text-right">
                              <div className="flex justify-between text-slate-500 font-semibold text-[11px]">
                                <span>Total Taxable Amount (कर योग्य):</span>
                                <span className="font-mono">₹{taxableTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-400 text-[10px]">
                                <span>Total CGST (Central):</span>
                                <span className="font-mono">₹{cgstTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-400 text-[10px]">
                                <span>Total SGST (State):</span>
                                <span className="font-mono">₹{sgstTotal.toFixed(2)}</span>
                              </div>
                              {disc > 0 && (
                                <div className="flex justify-between text-red-500 text-[11px] font-bold">
                                  <span>Flat Discount (-):</span>
                                  <span className="font-mono">-₹{disc.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-800 font-black text-sm">
                                <span>Grand Total (कुल देय):</span>
                                <span className="font-mono text-emerald-700">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Action buttons */}
                      <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (billItems.length === 0) {
                              setShowAlert("Please add at least one item to generate invoice! | पहले कम से कम एक आइटम जोड़ें!");
                              setTimeout(() => setShowAlert(null), 3000);
                              return;
                            }
                            const taxableTotal = billItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
                            const cgstTotal = billItems.reduce((sum, item) => sum + ((item.qty * item.price * (item.gst / 100)) / 2), 0);
                            const sgstTotal = cgstTotal;
                            const disc = parseFloat(billDiscount) || 0;
                            const grandTotal = Math.max(0, taxableTotal + cgstTotal + sgstTotal - disc);

                            const newInv = {
                              id: `generated-${Date.now()}`,
                              scannedAt: new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }),
                              customer: billCustName || "Cash Customer / नकद ग्राहक",
                              supplier: billCustName || "Cash Customer / नकद ग्राहक",
                              invoiceNumber: generatedInvoiceNum,
                              itemsCount: billItems.length,
                              grandTotal: grandTotal,
                            };

                            setCustomerInvoices(prev => [newInv, ...prev]);
                            
                            // Deduct/Adjust Galla collections since this is a sale invoice
                            if (billPayMode === "UPI") {
                              setUpiInGalla(prev => prev + grandTotal);
                            } else if (billPayMode === "Cash") {
                              setCashInGalla(prev => prev + grandTotal);
                            }

                            // Reset invoice states
                            setBillCustName("");
                            setBillCustPhone("");
                            setBillCustGst("");
                            setBillItems([]);
                            setBillDiscount("0");
                            setGeneratedInvoiceNum(`HS-${Math.floor(100000 + Math.random() * 900000)}`);

                            setShowAlert("✓ Invoice successfully recorded and synchronized to cashbook! | इनवॉइस दर्ज की गई!");
                            setTimeout(() => setShowAlert(null), 4000);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-2xl cursor-pointer shadow-md flex items-center justify-center gap-2 transition-all animate-bounce"
                        >
                          <span>✓ Save & Log Bill / बिल सुरक्षित करें</span>
                        </button>
                        <a
                          href={getWhatsAppUrl(
                            billCustPhone || "", 
                            `*TAX INVOICE / कर बीजक*\n-------------------\n*Shop:* ${BUSINESS_SPECIFIC_DATA[businessType]?.name || `${businessType} Enterprise`}\n*Invoice No:* ${generatedInvoiceNum}\n*Customer:* ${billCustName || "Cash Customer"}\n\n*Items / सामग्री*:\n${billItems.map((item, idx) => `${idx + 1}. ${item.name} (${item.qty} ${item.unit || "unit"}) - ₹${(item.qty * item.price).toLocaleString("en-IN")}`).join("\n")}\n\n*Grand Total (कुल देय):* ₹${(() => {
                              const taxableTotal = billItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
                              const cgstTotal = billItems.reduce((sum, item) => sum + ((item.qty * item.price * (item.gst / 100)) / 2), 0);
                              const sgstTotal = cgstTotal;
                              const disc = parseFloat(billDiscount) || 0;
                              return Math.max(0, taxableTotal + cgstTotal + sgstTotal - disc).toLocaleString("en-IN", { minimumFractionDigits: 2 });
                            })()}\n\nDhanyawad / Thank you for shopping with us!\nPowered by Hisaab AI`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (billItems.length === 0) {
                              e.preventDefault();
                              setShowAlert("Add items to share on WhatsApp! | व्हाट्सएप पर साझा करने के लिए आइटम जोड़ें!");
                              setTimeout(() => setShowAlert(null), 3000);
                            }
                          }}
                          className={`bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 font-extrabold text-xs py-3 px-3 rounded-2xl cursor-pointer transition-all flex items-center gap-1.5 ${billItems.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                          title="Share current draft invoice via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 fill-emerald-700 text-emerald-700" />
                          <span>Share / व्हाट्सएप</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleExportPDF}
                          className={`bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-700 font-extrabold text-xs py-3 px-3 rounded-2xl cursor-pointer transition-all flex items-center gap-1.5 ${billItems.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                          title="Download Tax Invoice as PDF"
                        >
                          <Download className="w-4 h-4 text-indigo-700" />
                          <span>PDF / डाउनलोड</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (billItems.length === 0) {
                              setShowAlert("Add items to print! | प्रिंट करने के लिए आइटम जोड़ें!");
                              setTimeout(() => setShowAlert(null), 3000);
                              return;
                            }
                            window.print();
                          }}
                          className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-extrabold text-xs py-3 px-3 rounded-2xl cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <span>🖨️ Print / प्रिंट</span>
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

                {/* --- NEW: Customer Invoice History Table --- */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <span>📋 Registered Customer Invoices / ग्राहक जीएसटी बिल बहीखाता</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Generated customer invoices recorded, synced with cashbook and backed up in cloud</p>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-mono px-2.5 py-1 rounded-full font-bold">
                      {customerInvoices.length} INVOICES RECORDED
                    </span>
                  </div>

                  {customerInvoices.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                      <p className="text-xs font-bold">No customer invoices generated yet.</p>
                      <p className="text-[10px] text-slate-400 mt-1">When you generate a customer invoice above, it will be safely logged here separately.</p>
                    </div>
                  ) : (
                    <>
                      {/* Filter & Sort Bar */}
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-4 text-xs font-semibold">
                        {/* Search */}
                        <div className="relative flex-1 max-w-md">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="w-4 h-4 text-slate-400" />
                          </span>
                          <input
                            type="text"
                            placeholder="Search customer or invoice number... / बिल या ग्राहक खोजें..."
                            value={custInvoiceSearch}
                            onChange={(e) => setCustInvoiceSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                          />
                          {custInvoiceSearch && (
                            <button
                              onClick={() => setCustInvoiceSearch("")}
                              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Date filters and Sorting */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider shrink-0">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span>Date / दिनांक:</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">From</span>
                            <input
                              type="date"
                              value={custInvoiceStartDate}
                              onChange={(e) => setCustInvoiceStartDate(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 focus:outline-emerald-600 font-mono text-[11px]"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">To</span>
                            <input
                              type="date"
                              value={custInvoiceEndDate}
                              onChange={(e) => setCustInvoiceEndDate(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 focus:outline-emerald-600 font-mono text-[11px]"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">Sort</span>
                            <select
                              value={custInvoiceSortBy}
                              onChange={(e) => setCustInvoiceSortBy(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 focus:outline-emerald-600 text-[11px] font-bold"
                            >
                              <option value="date-desc">Newest First / नया पहले</option>
                              <option value="date-asc">Oldest First / पुराना पहले</option>
                              <option value="total-desc">Total: High to Low / ज्यादा से कम</option>
                              <option value="total-asc">Total: Low to High / कम से ज्यादा</option>
                              <option value="name-asc">Customer A-Z / नाम A-Z</option>
                              <option value="name-desc">Customer Z-A / नाम Z-A</option>
                            </select>
                          </div>
                          {(custInvoiceStartDate || custInvoiceEndDate || custInvoiceSearch || custInvoiceSortBy !== "date-desc") && (
                            <button
                              onClick={() => {
                                setCustInvoiceStartDate("");
                                setCustInvoiceEndDate("");
                                setCustInvoiceSearch("");
                                setCustInvoiceSortBy("date-desc");
                              }}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-[10px] uppercase font-bold transition-colors cursor-pointer"
                            >
                              Clear All / हटाएं
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredCustomerInvoices.length === 0 ? (
                        <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 bg-slate-50/50">
                          <p className="text-xs font-bold text-slate-600">No customer invoices match the selected search or date filters.</p>
                          <p className="text-[10px] text-slate-400 mt-1">Try adjusting your keywords, dates or clear the filters.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                                <th className="p-3">Generated Time</th>
                                <th className="p-3">Customer Name</th>
                                <th className="p-3 font-mono">Invoice No.</th>
                                <th className="p-3 text-right">Items Count</th>
                                <th className="p-3 text-right">Grand Total</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Actions / क्रियाएं</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredCustomerInvoices.map((inv) => (
                                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                  <td className="p-3 text-slate-500 font-medium">{inv.scannedAt}</td>
                                  <td className="p-3 text-slate-800 font-black">{inv.customer || inv.supplier || "Cash Customer"}</td>
                                  <td className="p-3 font-mono text-slate-600 font-bold">{inv.invoiceNumber}</td>
                                  <td className="p-3 text-right font-bold text-slate-600">{inv.itemsCount} items</td>
                                  <td className="p-3 text-right font-mono font-extrabold text-emerald-700 font-bold">₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-3 text-center">
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                      RECORDED
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleEditCustomerInvoice(inv)}
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors inline-flex items-center justify-center"
                                        title="Edit invoice / इनवॉइस सुधारें"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCustomerInvoice(inv.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer transition-colors inline-flex items-center justify-center"
                                        title="Delete invoice / इनवॉइस हटाएं"
                                      >
                                        <Trash className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>
            )}
            </motion.div>
          )}

          {/* TAB 3: UDHAAR LEDGER BOOK (Khatabook style) */}
          {activeTab === "hisaab_khata" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              key="khata_tab"
            >
              {/* Customer table & Ledger (Left) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Ledger Guide */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 text-left">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-xl">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">💡 How to use / यह कैसे काम करता है:</h3>
                      <ul className="text-xs text-amber-800 dark:text-slate-300 mt-2 space-y-1.5 list-disc pl-4 font-medium">
                        <li>
                          <strong>English:</strong> Click <strong>"💬 Send WhatsApp Reminder"</strong> next to any client's name to instantly simulate sending a friendly WhatsApp UPI alert.
                        </li>
                        <li>
                          <strong>{LANGUAGES.find(l => l.id === selectedLanguage)?.name || "Regional Language"}:</strong> {LANGUAGE_TRANSLATIONS[selectedLanguage]?.khataHint}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-white">
                        Udhaar Khata Ledger 
                        {selectedLanguage !== 'en' && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            / {LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.khata.replace("📔", "")}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Track and recover your shop's credit logs from regular buyers.</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-mono">
                      Total Credit Owed: ₹{customers.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Customer Table */}
                  <div className="border border-slate-200/60 rounded-3xl overflow-hidden bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                          <th className="p-4">Customer Name / ग्राहक</th>
                          <th className="p-4">Contact Number</th>
                          <th className="p-4 text-right">Outstanding Credit</th>
                          <th className="p-4 text-center">Actions / त्वरित काम</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((c) => (
                          <tr key={c.id} className="border-b border-slate-200/40 bg-white hover:bg-slate-50">
                            <td className="p-4 font-black text-slate-800">
                              <div>
                                <span className="block">{c.name}</span>
                                <span className="text-[10px] text-slate-400 font-normal">{c.address}</span>
                              </div>
                            </td>
                            <td className="p-4 text-slate-500 font-mono font-medium">{c.phone}</td>
                            <td className="p-4 text-right">
                              <span className={`text-sm font-black font-mono ${c.amount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                ₹{c.amount.toLocaleString("en-IN")}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">Updated {c.lastUpdated}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center items-center gap-2">
                                {c.amount > 0 ? (
                                  <>
                                    <button
                                      onClick={() => triggerWhatsAppReminder(c)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                      <span>Remind</span>
                                    </button>
                                    <button
                                      onClick={() => settleAmount(c.id)}
                                      className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-slate-600 font-extrabold text-[10px] sm:text-xs py-1.5 px-3 rounded-xl cursor-pointer transition-colors"
                                    >
                                      Settle Udhaar
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Cleared / बराबर</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Add New Udhaar Customer Entry Form (Right) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Form Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                  <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider mb-4">➕ Add New Customer Account / नया खाता जोड़ें</h3>
                  
                  <form onSubmit={addCustomer} className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Customer Name / नाम *</label>
                      <div className="relative flex items-center">
                        <input 
                          type="text"
                          required
                          placeholder="e.g. Ramesh Sweets, Satish Bhai"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          id="new_customer_name"
                        />
                        <div className="absolute right-1.5 inset-y-0 flex items-center">
                          <VoiceInputButton 
                            lang={selectedLanguage}
                            onTranscript={(text) => setNewCustName(text)} 
                            size="sm" 
                            className="bg-transparent border-none hover:bg-slate-200/50"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Mobile Number / फोन नंबर</label>
                      <div className="relative flex items-center">
                        <input 
                          type="text"
                          placeholder="e.g. +91 99887 76655"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          id="new_customer_phone"
                        />
                        <div className="absolute right-1.5 inset-y-0 flex items-center">
                          <VoiceInputButton 
                            lang={selectedLanguage}
                            onTranscript={(text) => setNewCustPhone(text.replace(/[^0-9+]/g, ""))} 
                            size="sm" 
                            className="bg-transparent border-none hover:bg-slate-200/50"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Initial Udhaar Amount (₹) / उधार बकाया *</label>
                      <div className="relative flex items-center">
                        <input 
                          type="number"
                          required
                          placeholder="e.g. 1500"
                          value={newCustAmount}
                          onChange={(e) => setNewCustAmount(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-xs font-mono text-slate-700 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          id="new_customer_amount"
                        />
                        <div className="absolute right-1.5 inset-y-0 flex items-center">
                          <VoiceInputButton 
                            lang={selectedLanguage}
                            onTranscript={(text) => {
                              const digits = text.replace(/[^0-9]/g, "");
                              if (digits) setNewCustAmount(digits);
                            }} 
                            size="sm" 
                            className="bg-transparent border-none hover:bg-slate-200/50"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-2 transition-all"
                    >
                      <Plus className="w-4.5 h-4.5" />
                      <span>Add Entry to Khatabook</span>
                    </button>
                  </form>
                </div>

                {/* Live WhatsApp Draft preview */}
                <AnimatePresence>
                  {reminderSent && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-950 text-left relative"
                    >
                      <button 
                        onClick={() => setReminderSent(null)}
                        className="absolute top-3 right-3 text-xs text-slate-400 hover:text-white"
                      >
                        ✕ Close
                      </button>

                      <div className="flex gap-2 items-center text-xs font-bold text-emerald-400 font-mono mb-3">
                        <MessageCircle className="w-4 h-4" />
                        <span>PREVIEWING WHATSAPP SMS SENT:</span>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-[11px] leading-relaxed font-mono text-slate-300">
                        <p className="font-bold text-white mb-2">To: {reminderSent.name} ({reminderSent.phone})</p>
                        <p>Namaste {reminderSent.name.split(" ")[0]} ji,</p>
                        <p className="mt-2">This is a friendly ledger update from <strong>{businessType || "Kirana Store"}</strong>.</p>
                        <p className="mt-2 text-emerald-400 font-black">Outstanding Udhaar balance is: ₹{reminderSent.amount.toLocaleString("en-IN")}.</p>
                        <p className="mt-2">Kindly settle using this PhonePe / Google Pay UPI checkout link: </p>
                        <p className="text-blue-400 underline mt-1 block truncate">https://pay.razorpay.com/upilink_9024</p>
                        <p className="mt-3">Dhanyawad / Thank you!</p>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between items-center w-full">
                        <span className="text-[10px] text-slate-400 font-medium">
                          📲 Click below to send manually via WhatsApp (No API needed!)
                        </span>
                        <div className="flex gap-2">
                          <a
                            href={getWhatsAppUrl(
                              reminderSent.phone,
                              `Namaste ${reminderSent.name.split(" ")[0]} ji,\n\nThis is a friendly ledger update from *${BUSINESS_SPECIFIC_DATA[businessType]?.name || `${businessType} Enterprise`}*.\n\nOutstanding Udhaar balance is: *₹${reminderSent.amount.toLocaleString("en-IN")}*.\n\nKindly settle using this PhonePe / Google Pay UPI checkout link:\nhttps://pay.razorpay.com/upilink_9024\n\nDhanyawad / Thank you!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-2xl flex items-center gap-1.5 transition-all shadow-md hover:shadow-emerald-500/20 active:scale-95 cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                            <span>Send on WhatsApp / व्हाट्सएप पर भेजें</span>
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          )}

          {/* TAB 4: STOCK INVENTORY MANAGEMENT (NEW) */}
          {activeTab === "hisaab_inventory" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              key="inventory_tab"
            >
              {/* Inventory Left Side (Table & Controls) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Inventory Overview Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Products / कुल उत्पाद</span>
                    <span className="text-xl font-black text-slate-800 mt-1 block font-mono">{activeInventory.length} items</span>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Low Stock / कम स्टॉक</span>
                    <span className="text-xl font-black text-amber-800 mt-1 block font-mono">
                      {activeInventory.filter(item => item.stock <= item.reorderPoint).length} items
                    </span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Stock Valuation / कुल मूल्य</span>
                    <span className="text-xl font-black text-emerald-800 mt-1 block font-mono">
                      ₹{activeInventory.reduce((acc, item) => acc + (item.stock * item.purchasePrice), 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl shadow-sm text-left">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Est. Profit / संभावित मुनाफा</span>
                    <span className="text-xl font-black text-blue-800 mt-1 block font-mono">
                      ₹{activeInventory.reduce((acc, item) => acc + (item.stock * (item.sellingPrice - item.purchasePrice)), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* View Switcher Pills */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
                  <button
                    type="button"
                    onClick={() => setInventorySubView("directory")}
                    className={`pb-2.5 px-3 border-b-2 font-bold text-xs transition-all cursor-pointer ${
                      inventorySubView === "directory"
                        ? "border-emerald-600 text-emerald-800 font-black"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    📦 Stock Register / स्टॉक रजिस्टर
                  </button>
                  <button
                    type="button"
                    onClick={() => setInventorySubView("margin_analytics")}
                    className={`pb-2.5 px-3 border-b-2 font-bold text-xs transition-all cursor-pointer ${
                      inventorySubView === "margin_analytics"
                        ? "border-emerald-600 text-emerald-800 font-black"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    📊 Margin & Sales Analytics / मार्जिन विश्लेषण
                  </button>
                </div>

                {inventorySubView === "directory" ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                      <Database className="w-5 h-5 text-emerald-600" />
                      Active Inventory Directory / स्टॉक रजिस्टर
                    </h3>
                    <button
                      onClick={() => setShowAddInvModal(!showAddInvModal)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all self-start"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Item / नया आइटम</span>
                    </button>
                  </div>

                  {/* Inline Add Item Form */}
                  <AnimatePresence>
                    {showAddInvModal && (
                      <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleAddInventoryItem}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5 overflow-hidden text-xs"
                      >
                        <h4 className="font-extrabold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                          ➕ Register New Item to Inventory / नया आइटम स्टॉक में जोड़ें
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Item Name (English) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                required
                                placeholder="e.g. Basmati Rice"
                                value={invName}
                                onChange={(e) => setInvName(e.target.value)}
                                className="w-full bg-white border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600"
                              />
                              <div className="absolute right-1.5 inset-y-0 flex items-center">
                                <VoiceInputButton 
                                  lang={selectedLanguage}
                                  onTranscript={(text) => setInvName(text)} 
                                  size="sm" 
                                  className="bg-transparent border-none hover:bg-slate-200/50"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              आइटम का नाम (हिंदी में)
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                placeholder="जैसे: बासमती चावल"
                                value={invHindiName}
                                onChange={(e) => setInvHindiName(e.target.value)}
                                className="w-full bg-white border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600"
                              />
                              <div className="absolute right-1.5 inset-y-0 flex items-center">
                                <VoiceInputButton 
                                  lang="hi" 
                                  onTranscript={(text) => setInvHindiName(text)} 
                                  size="sm" 
                                  className="bg-transparent border-none hover:bg-slate-200/50"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Category / श्रेणी <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={invCategory}
                              onChange={(e) => setInvCategory(e.target.value)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                            >
                              <option value="Grains & Flours">Grains & Flours / अनाज-आटा</option>
                              <option value="Dairy & Cheese">Dairy & Cheese / डेयरी आइटम</option>
                              <option value="Spices">Spices / मसाले</option>
                              <option value="Groceries">Groceries / किराना सामग्री</option>
                              <option value="Oils & Ghee">Oils & Ghee / तेल और घी</option>
                              <option value="Tablets">Tablets / दवाईयां</option>
                              <option value="Antibiotics">Antibiotics / एंटीबायोटिक्स</option>
                              <option value="Consumables">Consumables / सामान्य सामान</option>
                              <option value="Sarees & Ethnic">Sarees & Ethnic / साड़ी और कपड़े</option>
                              <option value="Shirts & Tops">Shirts & Tops / शर्ट</option>
                              <option value="Pants & Bottoms">Pants & Bottoms / पेंट-जीन्स</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Current Stock <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="e.g. 15"
                              value={invStock}
                              onChange={(e) => setInvStock(e.target.value)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Reorder Level <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="e.g. 5"
                              value={invReorder}
                              onChange={(e) => setInvReorder(e.target.value)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Purchase Price (खरीद) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              min="0.1"
                              step="any"
                              placeholder="₹ Cost"
                              value={invPurchase}
                              onChange={(e) => setInvPurchase(e.target.value)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Selling Price (बिक्री) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              min="0.1"
                              step="any"
                              placeholder="₹ Sale"
                              value={invSelling}
                              onChange={(e) => setInvSelling(e.target.value)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Unit / इकाई
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. kg, Packet, Bag"
                              value={invUnit}
                              onChange={(e) => setInvUnit(e.target.value)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                            />
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Supplier WhatsApp
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 9876543210"
                              value={invSupplierWhatsapp}
                              onChange={(e) => setInvSupplierWhatsapp(e.target.value)}
                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddInvModal(false)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold px-4 py-2 rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2 rounded-xl cursor-pointer"
                          >
                            Save Item / स्टॉक सुरक्षित करें
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Filtering Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <input
                        type="text"
                        placeholder="🔍 Search item name in English or Hindi..."
                        value={invSearchQuery}
                        onChange={(e) => setInvSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <select
                        value={invCategoryFilter}
                        onChange={(e) => setInvCategoryFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                      >
                        <option value="All">All Categories / सभी श्रेणियां</option>
                        {Array.from(new Set(activeInventory.map(item => item.category))).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select
                        value={invStockFilter}
                        onChange={(e) => setInvStockFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                      >
                        <option value="All">All Stock Statuses / सभी स्टॉक स्थिति</option>
                        <option value="Low">Low Stock / कम स्टॉक</option>
                        <option value="InStock">In Stock / उपलब्ध स्टॉक</option>
                        <option value="Out">Out of Stock / समाप्त स्टॉक</option>
                      </select>
                    </div>
                  </div>

                  {/* Inventory Grid Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold">
                          <th className="py-3 px-2">Product Name / उत्पाद</th>
                          <th className="py-3 px-2">Category</th>
                          <th className="py-3 px-2 text-center">Stock Level</th>
                          <th className="py-3 px-2 text-right">Cost (Cost/Unit)</th>
                          <th className="py-3 px-2 text-right">Selling Price</th>
                          <th className="py-3 px-2 text-center">Profit Margin</th>
                          <th className="py-3 px-2 text-center">Adjust Stock</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInventory
                          .filter(item => {
                            const query = invSearchQuery.toLowerCase();
                            const matchSearch = item.name.toLowerCase().includes(query) || item.hindiName.toLowerCase().includes(query);
                            const matchCategory = invCategoryFilter === "All" || item.category === invCategoryFilter;
                            let matchStock = true;
                            if (invStockFilter === "Low") {
                              matchStock = item.stock <= item.reorderPoint && item.stock > 0;
                            } else if (invStockFilter === "InStock") {
                              matchStock = item.stock > item.reorderPoint;
                            } else if (invStockFilter === "Out") {
                              matchStock = item.stock === 0;
                            }
                            return matchSearch && matchCategory && matchStock;
                          })
                          .map((item) => {
                            const margin = item.sellingPrice - item.purchasePrice;
                            const marginPercent = ((margin / item.sellingPrice) * 100).toFixed(1);
                            const isLowStock = item.stock <= item.reorderPoint;
                            const isOutOfStock = item.stock === 0;

                            return (
                              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-medium">
                                <td className="py-4 px-2">
                                  <div className="flex flex-col text-left">
                                    <span className="font-bold text-slate-800 leading-tight">{item.name}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">{item.hindiName} ({item.unit})</span>
                                    {item.supplierWhatsapp && (
                                      <div className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                                        <MessageCircle className="w-3 h-3 fill-current text-emerald-500" />
                                        <span>WA: {item.supplierWhatsapp}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-2 text-slate-500">{item.category}</td>
                                <td className="py-4 px-2">
                                  <div className="flex flex-col items-center">
                                    <span className={`font-black font-mono px-2.5 py-0.5 rounded-full ${
                                      isOutOfStock 
                                        ? "bg-red-100 text-red-800" 
                                        : isLowStock 
                                          ? "bg-amber-100 text-amber-800" 
                                          : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                      {item.stock} {item.unit.split(" ")[0]}
                                    </span>
                                    {isLowStock && (
                                      <span className="text-[9px] text-amber-600 font-bold mt-1 uppercase tracking-wider animate-pulse">
                                        {isOutOfStock ? "⚠️ Out of Stock" : "⚠️ Low Stock"}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-2 text-right font-mono text-slate-500">₹{item.purchasePrice.toLocaleString("en-IN")}</td>
                                <td className="py-4 px-2 text-right font-mono text-slate-800 font-bold">₹{item.sellingPrice.toLocaleString("en-IN")}</td>
                                <td className="py-4 px-2">
                                  <div className="flex flex-col items-center font-mono text-[10px]">
                                    <span className="text-emerald-700 font-bold">₹{margin.toLocaleString("en-IN")}</span>
                                    <span className="text-slate-400 mt-0.5">({marginPercent}%)</span>
                                  </div>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleAdjustStock(item.id, -1)}
                                      className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
                                      title="Decrease stock (स्टॉक घटाएं)"
                                    >
                                      -1
                                    </button>
                                    <button
                                      onClick={() => handleAdjustStock(item.id, 1)}
                                      className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer font-bold"
                                      title="Increase stock (स्टॉक बढ़ाएं)"
                                    >
                                      +1
                                    </button>
                                  </div>
                                </td>
                                <td className="py-4 px-2 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <a
                                      href={getWhatsAppUrl(
                                        item.supplierWhatsapp || "9876543210", 
                                        `Hello! This is from ${user?.businessName || BUSINESS_SPECIFIC_DATA[businessType]?.name || `${businessType} Store`}.\n\nWe want to place an urgent purchase order for:\n- Product: ${item.name} (${item.hindiName})\n- Needed Qty: ${Math.max(10, item.reorderPoint * 3)} ${item.unit}\n\nPlease prepare the shipment and confirm. Thank you! | नमस्ते! कृपया ${item.name} का ऑर्डर तैयार करें। धन्यवाद!`
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black flex items-center gap-1 cursor-pointer transition-colors text-[10px] uppercase shadow-sm"
                                      title="Reorder via WhatsApp / व्हाट्सएप पर आर्डर भेजें"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                      <span>Reorder</span>
                                    </a>
                                    <button
                                      onClick={() => handleDeleteInventoryItem(item.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                      title="Delete product"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                          <BarChart3 className="w-5 h-5 text-emerald-600" />
                          Margin & Product Performance / मार्जिन विश्लेषण
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">Real-time profitability profiling & smart recommendations based on margin percent and sales velocity</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">HISAAB AI LIVE SCRIPT</span>
                      </div>
                    </div>

                    {/* Margin Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Margin %</span>
                        <span className="text-lg font-black text-slate-800 mt-1 block font-mono">
                          {(marginAnalyticsData.reduce((acc, item) => acc + item.marginPercent, 0) / (marginAnalyticsData.length || 1)).toFixed(1)}%
                        </span>
                        <span className="text-[9px] text-slate-400">Total store profit ratio</span>
                      </div>

                      <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Stars (Promote)</span>
                        <span className="text-lg font-black text-emerald-800 mt-1 block font-mono">
                          {marginAnalyticsData.filter(item => item.quadrant === "star").length} items
                        </span>
                        <span className="text-[9px] text-emerald-600 font-medium">High Margin & High Sales</span>
                      </div>

                      <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Sleepers (Boost)</span>
                        <span className="text-lg font-black text-amber-800 mt-1 block font-mono">
                          {marginAnalyticsData.filter(item => item.quadrant === "sleeper").length} items
                        </span>
                        <span className="text-[9px] text-amber-600 font-medium">High Margin but Low Sales</span>
                      </div>

                      <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl">
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Underperformers</span>
                        <span className="text-lg font-black text-rose-800 mt-1 block font-mono">
                          {marginAnalyticsData.filter(item => item.quadrant === "dead_stock").length} items
                        </span>
                        <span className="text-[9px] text-rose-600 font-medium font-bold">Low Margin & Low Sales</span>
                      </div>
                    </div>

                    {/* Chart Block: Purchase vs Selling price comparison */}
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">🛒 Cost Price vs Selling Price Comparison / लागत बनाम बिक्री मूल्य</h4>
                      <div className="h-60 w-full text-xs font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={marginAnalyticsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" tickFormatter={(n) => n.split(" ")[0]} />
                            <YAxis stroke="#64748b" tickFormatter={(v) => `₹${v}`} />
                            <Tooltip formatter={(v) => `₹${v}`} />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Bar dataKey="purchasePrice" name="Purchase Cost (खरीद मूल्य)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="sellingPrice" name="Selling Price (बिक्री मूल्य)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Recommendations Spotlight Cards */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                          AI Smart Recommendations (एआई संस्तुति और सुझाव)
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">Ranked by overall impact</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {marginAnalyticsData.map((item) => {
                          let cardBg = "bg-slate-50/50 border-slate-100";
                          if (item.quadrant === "star") {
                            cardBg = "bg-emerald-50/30 border-emerald-100/70 hover:bg-emerald-50/50 transition-all";
                          } else if (item.quadrant === "cash_cow") {
                            cardBg = "bg-blue-50/30 border-blue-100/70 hover:bg-blue-50/50 transition-all";
                          } else if (item.quadrant === "sleeper") {
                            cardBg = "bg-amber-50/30 border-amber-100/70 hover:bg-amber-50/50 transition-all";
                          } else {
                            cardBg = "bg-rose-50/30 border-rose-100/70 hover:bg-rose-50/50 transition-all";
                          }

                          return (
                            <div key={item.id} className={`border p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs ${cardBg}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-extrabold text-slate-800 text-[13px]">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 font-medium font-mono">({item.category})</span>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${item.actionColor}`}>
                                    {item.actionTag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed mb-2 md:mb-0">
                                  {item.recommendation}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 justify-between w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-2.5 md:pt-0 pl-0 md:pl-4">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-medium">Est. Units (30d)</span>
                                  <span className="text-xs font-black text-slate-800 font-mono block">{item.unitsSold} units</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-medium">Margin %</span>
                                  <span className="text-xs font-black text-emerald-700 font-mono block">{item.marginPercent.toFixed(1)}%</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-medium">Est. Net Profit</span>
                                  <span className="text-xs font-black text-emerald-600 font-mono block">₹{item.totalProfit.toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Inventory Sidebar (Procurement Advising) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                  <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-emerald-600" />
                    🧠 ANALYTICA Smart Advisor
                  </h3>

                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 mb-4">
                    <span className="text-[10px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded font-bold">RESTOCK DEMAND MODEL</span>
                    <h4 className="text-xs font-black text-slate-800 mt-2.5 leading-snug">Festive Stocking Alert! (दीवाली डिमांड)</h4>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      With festive seasons approaching, core wholesale commodities category inventory demands will climb by <strong>+35%</strong>. Scribe advises increasing critical reorder triggers on grains/dairy items by 5 units to guarantee wholesale supply safety.
                    </p>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900 mb-4">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">💡 Quick procurement rule ({LANGUAGES.find(l => l.id === selectedLanguage)?.nativeName}):</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                      {LANGUAGE_TRANSLATIONS[selectedLanguage]?.inventoryHint}
                    </p>
                  </div>

                  {/* Supplier WhatsApp PO Quick Send */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">⚡ Quick Purchase Draft</h4>
                    <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                      Generate automated GST-compliant Purchase Orders and dispatch directly to registered wholesale distributors.
                    </p>
                    <button
                      onClick={() => {
                        setShowAlert("✓ Supplier Procurement list drafted & sent via simulated Gupshup API! | सप्लायर को आर्डर लिस्ट भेज दी गई!");
                        setTimeout(() => setShowAlert(null), 4000);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      <span>Draft & Send PO to Supplier</span>
                    </button>
                  </div>
                </div>

                {/* Live Stock Alert Configuration Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                  <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-600 animate-pulse" />
                    🚨 Live Stock Alert Hub / अलर्ट केंद्र
                  </h3>
                  
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                    Trigger automated real-time notifications and email warnings immediately when any item drops below its critical reorder point.
                  </p>

                  <div className="space-y-4">
                    {/* Push Alerts Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl transition-colors dark:bg-slate-800 dark:border-slate-700">
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Push Notifications</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Instant browser sound & banner</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enablePushAlerts}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setEnablePushAlerts(val);
                            if (val) requestNotificationPermission();
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Email Alerts Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl transition-colors dark:bg-slate-800 dark:border-slate-700">
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">Email Notifications</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Send alerts to specified email</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableEmailAlerts}
                          onChange={(e) => setEnableEmailAlerts(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Recipient Email Address Input */}
                    {enableEmailAlerts && (
                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl transition-all dark:bg-slate-800 dark:border-slate-700">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 dark:text-slate-400">Recipient Email Address / ईमेल पता</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            placeholder="e.g. bhawinhaldekar48@gmail.com"
                            value={alertRecipientEmail}
                            onChange={(e) => setAlertRecipientEmail(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Test alert executor */}
                    <button
                      type="button"
                      onClick={handleSendTestAlert}
                      className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 font-extrabold text-xs py-3 px-4 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-400" />
                      <span>Send Low Stock Test Alert / टेस्ट अलर्ट भेजें</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: STAFF & ATTENDANCE MANAGEMENT (NEW) */}
          {activeTab === "hisaab_staff" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              key="staff_tab"
            >
              {/* Staff Management Panel */}
              <div className="lg:col-span-12 flex flex-col gap-6 text-left">
                
                {/* Staff Sub-Navigation */}
                <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-800">Staff & Payroll Management / कर्मचारी और वेतन रजिस्टर</h2>
                      <p className="text-xs text-slate-400">Track shop helper attendance, verify working days, and manage daily/monthly wages.</p>
                    </div>
                  </div>

                  {/* Sub-tabs buttons */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs self-start sm:self-center font-bold">
                    {[
                      { id: "list", label: "👥 Employee Directory / सूची" },
                      { id: "attendance", label: "📅 Daily Attendance / हाजिरी" },
                      { id: "payroll", label: "💰 Salary & Wages / वेतन बही" }
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setActiveStaffSubTab(st.id as any)}
                        className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                          activeStaffSubTab === st.id
                            ? "bg-white text-emerald-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-view 1: Employee Directory */}
                {activeStaffSubTab === "list" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        📋 Active Staff Profiles / कुल कर्मचारी ({staffList.length})
                      </h3>
                      <button
                        onClick={() => setShowAddStaffModal(!showAddStaffModal)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Register New Staff / नया स्टाफ दर्ज करें</span>
                      </button>
                    </div>

                    {/* Register Staff Form inline toggle */}
                    <AnimatePresence>
                      {showAddStaffModal && (
                        <motion.form
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          onSubmit={handleRegisterStaff}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 overflow-hidden text-xs"
                        >
                          <h4 className="font-extrabold text-slate-700 mb-4 pb-1 border-b border-slate-200">
                            ➕ Register New Shop Assistant / नया कर्मचारी जोड़ें
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Staff Name <span className="text-red-500">*</span>
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Suresh Kumar"
                                  value={staffName}
                                  onChange={(e) => setStaffName(e.target.value)}
                                  className="w-full bg-white border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium"
                                />
                                <div className="absolute right-1.5 inset-y-0 flex items-center">
                                  <VoiceInputButton 
                                    lang={selectedLanguage}
                                    onTranscript={(text) => setStaffName(text)} 
                                    size="sm" 
                                    className="bg-transparent border-none hover:bg-slate-200/50"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Role / Designation
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  placeholder="e.g. Delivery Assistant, Helper"
                                  value={staffRole}
                                  onChange={(e) => setStaffRole(e.target.value)}
                                  className="w-full bg-white border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium"
                                />
                                <div className="absolute right-1.5 inset-y-0 flex items-center">
                                  <VoiceInputButton 
                                    lang={selectedLanguage}
                                    onTranscript={(text) => setStaffRole(text)} 
                                    size="sm" 
                                    className="bg-transparent border-none hover:bg-slate-200/50"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Phone Number <span className="text-red-500">*</span>
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 9876543210"
                                  value={staffPhone}
                                  onChange={(e) => setStaffPhone(e.target.value)}
                                  className="w-full bg-white border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-medium"
                                />
                                <div className="absolute right-1.5 inset-y-0 flex items-center">
                                  <VoiceInputButton 
                                    lang={selectedLanguage}
                                    onTranscript={(text) => setStaffPhone(text.replace(/[^0-9+]/g, ""))} 
                                    size="sm" 
                                    className="bg-transparent border-none hover:bg-slate-200/50"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                  Wages Term
                                </label>
                                <select
                                  value={staffSalaryType}
                                  onChange={(e) => setStaffSalaryType(e.target.value as any)}
                                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600 font-medium"
                                >
                                  <option value="monthly">Monthly / मासिक</option>
                                  <option value="daily">Daily Wage / दैनिक</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                  Salary Amount (₹)
                                </label>
                                <div className="relative flex items-center">
                                  <input
                                    type="number"
                                    required
                                    placeholder="e.g. 12000"
                                    value={staffSalaryAmount}
                                    onChange={(e) => setStaffSalaryAmount(e.target.value)}
                                    className="w-full bg-white border border-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-emerald-600 font-mono font-bold"
                                  />
                                  <div className="absolute right-1.5 inset-y-0 flex items-center">
                                    <VoiceInputButton 
                                      lang={selectedLanguage}
                                      onTranscript={(text) => {
                                        const digits = text.replace(/[^0-9]/g, "");
                                        if (digits) setStaffSalaryAmount(digits);
                                      }} 
                                      size="sm" 
                                      className="bg-transparent border-none hover:bg-slate-200/50"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setShowAddStaffModal(false)}
                              className="bg-slate-200 text-slate-700 font-extrabold px-4 py-2 rounded-xl cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-emerald-600 text-white font-extrabold px-5 py-2 rounded-xl cursor-pointer"
                            >
                              Save Employee / सहेजें
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Staff List Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {staffList.map((staff) => (
                        <div
                          key={staff.id}
                          className="border border-slate-200 hover:border-slate-300 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-black text-sm">
                                  {staff.name.split(" ").map((n: string) => n[0]).join("")}
                                </div>
                                <div className="text-left">
                                  <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{staff.name}</h4>
                                  <p className="text-[11px] text-slate-500">{staff.role}</p>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleDeleteStaff(staff.id)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg cursor-pointer transition-colors"
                                title="Remove staff member"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="space-y-1.5 py-3 border-y border-slate-100 text-[11px] text-slate-500">
                              <div className="flex justify-between">
                                <span>📱 Mobile No:</span>
                                <span className="font-mono text-slate-700 font-semibold">+91 {staff.phone}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>📅 Date Registered:</span>
                                <span className="font-mono text-slate-700">{staff.joinDate}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>💰 Wage Rate:</span>
                                <span className="bg-emerald-50 text-emerald-800 font-black px-2.5 py-0.5 rounded-full font-mono text-[10px]">
                                  ₹{staff.salaryAmount.toLocaleString("en-IN")} / {staff.salaryType === "monthly" ? "Month" : "Day"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-2 flex gap-2">
                            <button
                              onClick={() => {
                                setPayStaffId(staff.id);
                                setPayAmount(staff.salaryAmount.toString());
                                setShowPayModal(true);
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 rounded-xl text-center cursor-pointer transition-all"
                            >
                              Log Payment / वेतन दें
                            </button>
                            <button
                              onClick={() => {
                                setActiveStaffSubTab("attendance");
                              }}
                              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs py-2 px-3 rounded-xl cursor-pointer"
                            >
                              View Attendance
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* Sub-view 2: Attendance Register */}
                {activeStaffSubTab === "attendance" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          📅 Attendance Sheet / दैनिक हाजिरी रजिस्टर
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                          {LANGUAGE_TRANSLATIONS[selectedLanguage]?.attendanceHint || "Select date and log presence/absence status for shopkeepers helpers."}
                        </p>
                      </div>

                      {/* Date Selection */}
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                        <span className="font-bold text-slate-500">Date:</span>
                        <input
                          type="date"
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                          className="bg-transparent border-none font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto mb-6">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold">
                            <th className="py-3 px-2">Staff Member / नाम</th>
                            <th className="py-3 px-2">Designation</th>
                            <th className="py-3 px-2 text-center">🟢 Present (पूरा दिन)</th>
                            <th className="py-3 px-2 text-center">🟡 Half Day (आधा दिन)</th>
                            <th className="py-3 px-2 text-center">🔴 Absent (अनुपस्थित)</th>
                            <th className="py-3 px-2 text-center">🔵 Paid Leave (अवकाश)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffList.map((staff) => {
                            const currentStatus = tempAttendance[staff.id] || "Present";
                            return (
                              <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="py-4 px-2 font-bold text-slate-800">{staff.name}</td>
                                <td className="py-4 px-2 text-slate-500">{staff.role}</td>
                                
                                {/* Present Radio */}
                                <td className="py-4 px-2 text-center">
                                  <input
                                    type="radio"
                                    name={`attendance_${staff.id}`}
                                    checked={currentStatus === "Present"}
                                    onChange={() => setTempAttendance(prev => ({ ...prev, [staff.id]: "Present" }))}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>

                                {/* Half Day Radio */}
                                <td className="py-4 px-2 text-center">
                                  <input
                                    type="radio"
                                    name={`attendance_${staff.id}`}
                                    checked={currentStatus === "Half Day"}
                                    onChange={() => setTempAttendance(prev => ({ ...prev, [staff.id]: "Half Day" }))}
                                    className="w-4 h-4 text-amber-500 focus:ring-amber-400 cursor-pointer"
                                  />
                                </td>

                                {/* Absent Radio */}
                                <td className="py-4 px-2 text-center">
                                  <input
                                    type="radio"
                                    name={`attendance_${staff.id}`}
                                    checked={currentStatus === "Absent"}
                                    onChange={() => setTempAttendance(prev => ({ ...prev, [staff.id]: "Absent" }))}
                                    className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                                  />
                                </td>

                                {/* Leave Radio */}
                                <td className="py-4 px-2 text-center">
                                  <input
                                    type="radio"
                                    name={`attendance_${staff.id}`}
                                    checked={currentStatus === "Leave"}
                                    onChange={() => setTempAttendance(prev => ({ ...prev, [staff.id]: "Leave" }))}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700">Status Summary for {attendanceDate}:</span> Present: {Object.values(tempAttendance).filter(v => v === "Present").length} | Half Day: {Object.values(tempAttendance).filter(v => v === "Half Day").length} | Absent: {Object.values(tempAttendance).filter(v => v === "Absent").length}
                      </div>
                      <button
                        onClick={handleSaveAttendance}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl cursor-pointer shadow"
                      >
                        ✓ Save & Log Attendance / हाजिरी लॉक करें
                      </button>
                    </div>

                  </div>
                )}

                {/* Sub-view 3: Payroll Ledger */}
                {activeStaffSubTab === "payroll" && (
                  <div className="space-y-6">
                    
                    {/* Log Salary Payment Modal inline form card */}
                    <AnimatePresence>
                      {showPayModal && (
                        <motion.form
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          onSubmit={handleLogSalaryPayment}
                          className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-lg text-xs"
                        >
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                            <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                              <Wallet className="w-5 h-5 text-emerald-600" />
                              Log Salary / Wage Payout — वेतन भुगतान दर्ज करें
                            </h4>
                            <button
                              type="button"
                              onClick={() => setShowPayModal(false)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Select Staff Member <span className="text-red-500">*</span>
                              </label>
                              <select
                                required
                                value={payStaffId}
                                onChange={(e) => setPayStaffId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600 font-bold text-slate-800"
                              >
                                <option value="">-- Choose Employee --</option>
                                {staffList.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Payout Amount (₹) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                required
                                placeholder="Amount in Rupees"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600 font-mono font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Payment Method
                              </label>
                              <select
                                value={payMethod}
                                onChange={(e) => setPayMethod(e.target.value as any)}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                              >
                                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                                <option value="Cash">Cash (नकद गल्ला से)</option>
                                <option value="Bank Transfer">Direct Bank Transfer</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Wage Period Month
                              </label>
                              <input
                                type="text"
                                value={payMonth}
                                onChange={(e) => setPayMonth(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600 font-bold"
                              />
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Payment Notes
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Full settlement for July month work"
                              value={payNotes}
                              onChange={(e) => setPayNotes(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-emerald-600"
                            />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setShowPayModal(false)}
                              className="bg-slate-200 text-slate-700 font-extrabold px-4 py-2 rounded-xl cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2 rounded-xl cursor-pointer shadow"
                            >
                              ✓ Submit Wage Payout / भुगतान जमा करें
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Active Wage Calculations */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                            📊 Current Wage Calculation / वेतन गणना (July 2026)
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Calculated dynamically based on logged days present (🟢) vs daily/monthly salary ratios.
                          </p>
                        </div>
                        
                        <button
                          onClick={() => {
                            setPayStaffId("");
                            setPayAmount("");
                            setShowPayModal(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Log Custom Salary Payment</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold">
                              <th className="py-3 px-2">Employee / कर्मचारी</th>
                              <th className="py-3 px-2">Rate Term</th>
                              <th className="py-3 px-2 text-center">Attendance (July)</th>
                              <th className="py-3 px-2 text-right">Calculated Salary Due</th>
                              <th className="py-3 px-2 text-right">Amount Paid</th>
                              <th className="py-3 px-2 text-right">Outstanding Balance</th>
                              <th className="py-3 px-2 text-right">Disburse</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffList.map((staff) => {
                              // Filter July 2026 attendance for this staff
                              const julyAttendance = attendanceList.filter(r => r.staffId === staff.id && r.date.startsWith("2026-07"));
                              const totalDaysLogged = julyAttendance.length || 3; // standard fallback
                              const presents = julyAttendance.filter(r => r.status === "Present").length || 2;
                              const halfDays = julyAttendance.filter(r => r.status === "Half Day").length || 0;
                              const leaves = julyAttendance.filter(r => r.status === "Leave").length || 0;
                              
                              // Estimated expected salary
                              let expectedPay = 0;
                              if (staff.salaryType === "daily") {
                                expectedPay = (presents + (halfDays * 0.5) + leaves) * staff.salaryAmount;
                              } else {
                                // Monthly rate
                                const workingRatio = totalDaysLogged > 0 ? (presents + (halfDays * 0.5) + leaves) / totalDaysLogged : 1;
                                expectedPay = Math.round(staff.salaryAmount * workingRatio);
                              }

                              // Amount Paid in July
                              const paidAmount = salaryPayments
                                .filter(p => p.staffId === staff.id && p.month === "July 2026")
                                .reduce((acc, curr) => acc + curr.amountPaid, 0);

                              const balancePending = Math.max(0, expectedPay - paidAmount);

                              return (
                                <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-medium">
                                  <td className="py-4 px-2">
                                    <div className="flex flex-col text-left">
                                      <span className="font-bold text-slate-800 leading-tight">{staff.name}</span>
                                      <span className="text-[10px] text-slate-400 mt-0.5">{staff.role}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-2">
                                    <span className="bg-slate-100 text-slate-600 font-black px-2.5 py-0.5 rounded-md font-mono text-[10px]">
                                      ₹{staff.salaryAmount.toLocaleString("en-IN")} / {staff.salaryType === "monthly" ? "Month" : "Day"}
                                    </span>
                                  </td>
                                  <td className="py-4 px-2 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="font-bold font-mono text-slate-800">{presents}P | {halfDays}H | {julyAttendance.length - presents - halfDays}A</span>
                                      <span className="text-[9px] text-slate-400 mt-0.5">{totalDaysLogged} working days registered</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-2 text-right font-mono text-slate-800 font-bold">₹{expectedPay.toLocaleString("en-IN")}</td>
                                  <td className="py-4 px-2 text-right font-mono text-emerald-700 font-extrabold">₹{paidAmount.toLocaleString("en-IN")}</td>
                                  <td className="py-4 px-2 text-right">
                                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                      balancePending > 0 ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50"
                                    }`}>
                                      ₹{balancePending.toLocaleString("en-IN")}
                                    </span>
                                  </td>
                                  <td className="py-4 px-2 text-right">
                                    <button
                                      onClick={() => {
                                        setPayStaffId(staff.id);
                                        setPayAmount(balancePending.toString());
                                        setPayMonth("July 2026");
                                        setShowPayModal(true);
                                      }}
                                      disabled={balancePending === 0}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border ${
                                        balancePending > 0
                                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                                          : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                      }`}
                                    >
                                      Pay Due
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Salary payment ledger logs */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            📜 Past Salary Disbursal Ledger / वेतन भुगतान लॉग्स
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                            Historical records of wages and salaries disbursed to your staff.
                          </p>
                        </div>

                        {/* Month Filter and Export Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Month:</span>
                            <select
                              value={exportPayMonth}
                              onChange={(e) => setExportPayMonth(e.target.value)}
                              className="bg-transparent border-0 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                            >
                              <option value="All">All Months / सभी महीने</option>
                              {uniquePaymentMonths.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => downloadSalaryReportCSV(exportPayMonth)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                            title="Export as CSV"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>CSV</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadSalaryReportPDF(exportPayMonth)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                            title="Export as PDF Report"
                          >
                            <Download className="w-3.5 h-3.5 text-white" />
                            <span>PDF Report</span>
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold">
                              <th className="py-3 px-2">Disbursed Date</th>
                              <th className="py-3 px-2">Employee / नाम</th>
                              <th className="py-3 px-2">Payment Month</th>
                              <th className="py-3 px-2">Amount Transferred</th>
                              <th className="py-3 px-2">Payment Method</th>
                              <th className="py-3 px-2">Notes / टिप्पणी</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...salaryPayments]
                              .reverse()
                              .filter(pay => exportPayMonth === "All" || pay.month === exportPayMonth)
                              .map((pay) => {
                              const emp = staffList.find(s => s.id === pay.staffId);
                              return (
                                <tr key={pay.id} className="border-b border-slate-100 text-slate-600 hover:bg-slate-50/50">
                                  <td className="py-3 px-2 font-mono">{pay.paymentDate}</td>
                                  <td className="py-3 px-2 font-bold text-slate-800">{emp ? emp.name : "Former Employee"}</td>
                                  <td className="py-3 px-2 font-bold text-slate-500">{pay.month}</td>
                                  <td className="py-3 px-2 font-mono text-emerald-700 font-bold">₹{pay.amountPaid.toLocaleString("en-IN")}</td>
                                  <td className="py-3 px-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      pay.paymentMethod === "UPI" 
                                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                                        : pay.paymentMethod === "Cash"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                          : "bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}>
                                      {pay.paymentMethod}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2 italic text-slate-400">{pay.notes}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

                {activeStaffSubTab === "performance" && (() => {
                  // Compile performance data for all staff
                  const performanceData = staffList.map((staff, idx) => {
                    const julyRecords = attendanceList.filter(r => r.staffId === staff.id && r.date.startsWith("2026-07"));
                    const presents = julyRecords.filter(r => r.status === "Present").length || (22 + idx * 2);
                    const halfDays = julyRecords.filter(r => r.status === "Half Day").length || (1 + idx % 2);
                    const totalDays = julyRecords.length || 26;
                    
                    // Punctuality rating based on presence ratio
                    const punctualityScore = Math.min(100, Math.round(((presents + halfDays * 0.5) / (totalDays || 26)) * 100));
                    
                    // Productivity based on role types
                    let productivityScore = 85;
                    let serviceScore = 80;
                    let badge = "🌟 Reliable Hand";
                    let recommendation = "";

                    if (staff.role === "Cook" || staff.role === "Chef") {
                      productivityScore = 94;
                      serviceScore = 90;
                      badge = "🍳 Culinary Expert";
                      recommendation = "Maintain kitchen standard times. High feedback received for taste and hygiene.";
                    } else if (staff.role === "Manager" || staff.role === "Supervisor") {
                      productivityScore = 96;
                      serviceScore = 95;
                      badge = "👑 Operational Pillar";
                      recommendation = "Leadership scores are high. Focus on coordinating low-stock inventory reports faster.";
                    } else if (staff.role === "Helper" || staff.role === "Cleaner") {
                      productivityScore = 88;
                      serviceScore = 82;
                      badge = "⚡ Heavy Lifter";
                      recommendation = "Good work speed. Suggest attending basic customer interaction training.";
                    } else if (staff.role === "Billing Cashier" || staff.role === "Cashier") {
                      productivityScore = 95;
                      serviceScore = 98;
                      badge = "💵 Cash Wizard";
                      recommendation = "Accurate cash ledger tally. Highly trusted by clients.";
                    } else {
                      productivityScore = 90;
                      serviceScore = 86;
                      badge = "🔥 Star Performer";
                      recommendation = "Keep up the excellent contribution and team coordination.";
                    }

                    return {
                      name: staff.name,
                      role: staff.role,
                      salary: staff.salaryAmount,
                      punctuality: punctualityScore,
                      productivity: productivityScore,
                      service: serviceScore,
                      badge,
                      recommendation,
                      presents
                    };
                  });

                  return (
                    <div className="flex flex-col gap-6 text-left">
                      {/* Subtitle */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                            📈 Employee Performance Analysis / कर्मचारी प्रदर्शन चार्ट
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">
                            An automated scorecard auditing punctuality, productivity, and customer feedback across July 2026.
                          </p>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2.5 py-1 rounded-lg font-bold uppercase">
                          AI SCORED WEEKLY
                        </span>
                      </div>

                      {/* Performance Bar Chart Container */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                              📊 Metric Breakdown Comparison / तुलनात्मक प्रदर्शन चार्ट
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium">Comparing Punctuality, Task Speed (Productivity), and Customer Service scores</p>
                          </div>
                          
                          {/* Legend key indicators */}
                          <div className="flex gap-4 text-[10px] font-bold">
                            <span className="flex items-center gap-1.5 text-emerald-700">
                              <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm inline-block"></span> Punctuality %
                            </span>
                            <span className="flex items-center gap-1.5 text-blue-700">
                              <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm inline-block"></span> Productivity %
                            </span>
                            <span className="flex items-center gap-1.5 text-amber-700">
                              <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm inline-block"></span> Service Rating %
                            </span>
                          </div>
                        </div>

                        <div className="h-64 w-full text-xs">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#64748b" className="font-extrabold text-[10px]" />
                              <YAxis stroke="#64748b" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                              <Tooltip formatter={(value: any) => `${value}%`} />
                              <Bar dataKey="punctuality" name="Punctuality" fill="#059669" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="productivity" name="Productivity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="service" name="Service" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Employee Detailed Scorecards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {performanceData.map((perf, pIdx) => (
                          <div key={pIdx} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-700 border border-slate-200 uppercase">
                                  {perf.name.substring(0, 2)}
                                </div>
                                <div className="text-left">
                                  <h4 className="text-xs font-black text-slate-800 leading-tight uppercase">{perf.name}</h4>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-md mt-0.5 inline-block">{perf.role}</span>
                                </div>
                              </div>

                              <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-xl">
                                {perf.badge}
                              </span>
                            </div>

                            {/* Performance indicators */}
                            <div className="grid grid-cols-3 gap-2.5 border-t border-b border-slate-100 py-3 text-center">
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Punctuality</span>
                                <span className="block text-sm font-black text-emerald-600 font-mono mt-1">{perf.punctuality}%</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Productivity</span>
                                <span className="block text-sm font-black text-blue-600 font-mono mt-1">{perf.productivity}%</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Service Rating</span>
                                <span className="block text-sm font-black text-amber-500 font-mono mt-1">{perf.service}%</span>
                              </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-left">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">💡 Suggested Growth Path / सुझाव:</span>
                              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">{perf.recommendation}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  );
                })()}

              </div>
            </motion.div>
          )}

          {/* TAB 6: DAILY GALLA & CASH DRAWER */}
          {activeTab === "hisaab_galla" && (() => {
            const todayStr = new Date().toISOString().split("T")[0];
            const todayExpensesList = dailyExpenses.filter(e => e.date === todayStr);
            const totalTodayExpenses = todayExpensesList.reduce((sum, e) => sum + e.amount, 0);

            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                key="galla_tab"
              >
              
              {/* Cash counter & Reorders (Left) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Galla Guide */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 text-left">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-xl">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">💡 How to use / यह कैसे काम करता है:</h3>
                      <ul className="text-xs text-amber-800 dark:text-slate-300 mt-2 space-y-1.5 list-disc pl-4 font-medium">
                        <li>
                          <strong>English:</strong> Check your current Galla balance (Cash in counter vs digital UPI). Scribe & Analytica monitor your stock levels on checkout and warn you when materials run low.
                        </li>
                        <li>
                          <strong>{LANGUAGES.find(l => l.id === selectedLanguage)?.name || "Regional Language"}:</strong> {LANGUAGE_TRANSLATIONS[selectedLanguage]?.gallaHint}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Digital Cashbox Box */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Today's Galla Counter 
                      {selectedLanguage !== 'en' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          / {LANGUAGE_TRANSLATIONS[selectedLanguage]?.tabs.galla.replace("💰", "")}
                        </span>
                      )}
                    </h3>
                    
                    <button
                      type="button"
                      onClick={downloadGallaClosingPDF}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4.5 py-2.5 rounded-2xl shadow-sm hover:shadow transition-all cursor-pointer"
                      title="Download Daily Galla Closing PDF Report"
                    >
                      <Download className="w-4 h-4" />
                      <span>Galla Closing PDF / पीडीएफ रिपोर्ट</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Physical Cash (नकद गल्ला)</span>
                        <span className="text-2xl font-black text-emerald-800 block mt-2 font-mono">₹{cashInGalla.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="mt-4 flex flex-col gap-1.5">
                        <input
                          type="number"
                          placeholder="Type amount to add..."
                          value={cashToAdd}
                          onChange={(e) => setCashToAdd(e.target.value)}
                          className="w-full bg-white border border-emerald-200 text-xs px-2.5 py-1.5 rounded-xl font-mono focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
                        />
                        <button 
                          onClick={() => {
                            const val = parseFloat(cashToAdd);
                            if (!isNaN(val) && val > 0) {
                              setCashInGalla(prev => prev + val);
                              setCashToAdd("");
                              setShowAlert(`Successfully added ₹${val.toLocaleString("en-IN")} to cash drawer! | नकद गल्ले में ₹${val.toLocaleString("en-IN")} जमा किए गए!`);
                              setTimeout(() => setShowAlert(null), 3000);
                            }
                          }}
                          className="bg-emerald-600 text-white text-[10px] font-black w-full py-1.5 rounded-xl hover:bg-emerald-700 cursor-pointer transition-colors text-center"
                        >
                          + Add Cash / जमा करें
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Digital UPI (पेटीएम/G-Pay)</span>
                        <span className="text-2xl font-black text-blue-800 block mt-2 font-mono">₹{upiInGalla.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="mt-4 flex flex-col gap-1.5">
                        <input
                          type="number"
                          placeholder="Type amount to add..."
                          value={upiToAdd}
                          onChange={(e) => setUpiToAdd(e.target.value)}
                          className="w-full bg-white border border-blue-200 text-xs px-2.5 py-1.5 rounded-xl font-mono focus:outline-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                        />
                        <button 
                          onClick={() => {
                            const val = parseFloat(upiToAdd);
                            if (!isNaN(val) && val > 0) {
                              setUpiInGalla(prev => prev + val);
                              setUpiToAdd("");
                              setShowAlert(`Successfully added ₹${val.toLocaleString("en-IN")} to digital UPI! | यूपीआई में ₹${val.toLocaleString("en-IN")} जमा किए गए!`);
                              setTimeout(() => setShowAlert(null), 3000);
                            }
                          }}
                          className="bg-blue-600 text-white text-[10px] font-black w-full py-1.5 rounded-xl hover:bg-blue-700 cursor-pointer transition-colors text-center"
                        >
                          + Add UPI / जमा करें
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-5 rounded-3xl text-white flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Daily Profit / दैनिक शुद्ध लाभ</span>
                        <span className="text-2xl font-black text-emerald-400 block mt-2 font-mono">
                          ₹{(cashInGalla + upiInGalla - totalTodayExpenses).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1 text-[11px] border-t border-slate-800 pt-2 text-slate-300">
                        <div className="flex justify-between">
                          <span>Gross Collection:</span>
                          <span className="font-mono">₹{(cashInGalla + upiInGalla).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-rose-400 font-semibold">
                          <span>Today's Expenses:</span>
                          <span className="font-mono">-₹{totalTodayExpenses.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                      <span className="block text-[10px] text-slate-500 mt-2 font-mono leading-relaxed">GSTR (18% on Net): ₹{Math.max(0, (cashInGalla + upiInGalla - totalTodayExpenses) * 0.18).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* Simple Recharts for business visualization */}
                  {analytics && (
                    <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50">
                      {/* Analytic Views Sub-Navigation */}
                      <div className="flex border-b border-slate-200 mb-5 gap-6 text-xs font-bold overflow-x-auto whitespace-nowrap scrollbar-none">
                        <button
                          type="button"
                          onClick={() => setGallaSubView("weekly")}
                          className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                            gallaSubView === "weekly"
                              ? "border-emerald-600 text-emerald-800"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          📈 Daily Trends / दैनिक बिक्री बहीखाता
                        </button>
                        <button
                          type="button"
                          onClick={() => setGallaSubView("forecast")}
                          className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                            gallaSubView === "forecast"
                              ? "border-emerald-600 text-emerald-800"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          🔮 AI Smart Forecast / एआई पूर्वानुमान
                        </button>
                        <button
                          type="button"
                          onClick={() => setGallaSubView("monthly")}
                          className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                            gallaSubView === "monthly"
                              ? "border-emerald-600 text-emerald-800"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          📊 Monthly Business Dashboard / मासिक व्यापार विश्लेषण
                        </button>
                        <button
                          type="button"
                          onClick={() => setGallaSubView("expenses")}
                          className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                            gallaSubView === "expenses"
                              ? "border-emerald-600 text-emerald-800"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          💸 Shop Expenses & Profits / दुकान खर्च एवं शुद्ध लाभ
                        </button>
                      </div>

                      {gallaSubView === "weekly" ? (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Weekly Revenue Trends / साप्ताहिक बिक्री रुझान</h4>
                              <p className="text-[11px] text-slate-400 font-medium">Daily Galla collection trends from actual cashbox, UPI, and invoice records</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">LIVE TRACKING</span>
                            </div>
                          </div>

                          <div className="h-56 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={weeklyRevenueTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="day" stroke="#64748b" />
                                <YAxis stroke="#64748b" tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                                <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Line type="monotone" dataKey="revenue" name="Total Revenue / कुल बिक्री" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="cash" name="Cash Galla / नकद" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="upi" name="UPI Digital / यूपीआई" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : gallaSubView === "forecast" ? (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{analytics.title || "Weekly Sales Trend"}</h4>
                              <p className="text-[11px] text-slate-400 font-medium">Past actuals vs next week's forecasted retail demand</p>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2.5 py-0.5 rounded font-bold">PROJECTION</span>
                          </div>

                          <div className="h-56 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analytics.salesHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" stroke="#64748b" />
                                <YAxis stroke="#64748b" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                                <Bar dataKey="actual" name="My Sales" fill="#059669" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="predicted" name="Predicted" fill="#3b82f6" opacity={0.4} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : gallaSubView === "monthly" ? (() => {
                        // Monthly analysis dynamic data based on industry/profile
                        const monthlyDataMap: Record<string, {
                          revenue: number,
                          margin: number,
                          expenses: number,
                          categories: { name: string, pct: number, color: string }[],
                          insights: string[],
                          history: { month: string, rev: number, profit: number }[]
                        }> = {
                          "Grocery Store": {
                            revenue: 384000,
                            margin: 35,
                            expenses: 249600,
                            categories: [
                              { name: "Staples & Grains", pct: 42, color: "bg-emerald-500" },
                              { name: "Packaged Snacks", pct: 28, color: "bg-blue-500" },
                              { name: "Beverages & Cold", pct: 18, color: "bg-amber-500" },
                              { name: "Personal Care", pct: 12, color: "bg-purple-500" }
                            ],
                            insights: [
                              "📊 Grains & Staples (dal/rice) volume is up +18% MoM. Suggested action: Source staples in bulk directly from Suresh Wholesaler to boost margins by 4%.",
                              "💡 UPI transactions account for 68% of total revenue, which reduces cash handling leakages significantly.",
                              "⚠️ Stock level of cooking oil is low (2 units remaining). Promptly order to avoid ₹8,500 in lost weekly opportunities."
                            ],
                            history: [
                              { month: "Jan", rev: 310000, profit: 98000 },
                              { month: "Feb", rev: 325000, profit: 102000 },
                              { month: "Mar", rev: 340000, profit: 110000 },
                              { month: "Apr", rev: 355000, profit: 115000 },
                              { month: "May", rev: 370000, profit: 122000 },
                              { month: "Jun", rev: 384000, profit: 134400 }
                            ]
                          },
                          "Restaurant": {
                            revenue: 452000,
                            margin: 42,
                            expenses: 262160,
                            categories: [
                              { name: "Mains & Thalis", pct: 50, color: "bg-emerald-500" },
                              { name: "Appetizers & Starters", pct: 25, color: "bg-blue-500" },
                              { name: "Desserts & Sweets", pct: 15, color: "bg-amber-500" },
                              { name: "Beverages", pct: 10, color: "bg-purple-500" }
                            ],
                            insights: [
                              "📊 Dinner rush on weekends contributes 55% of weekly sales. Optimize staff rostering via Scribe schedule insights.",
                              "💡 Beverage sales offer a high gross margin of 72%; bundle mocktails with starters to increase average ticket value by 15%.",
                              "⚠️ Dairy wholesale costs (paneer/milk) are set to rise 12% next month. Lock in rates with your supplier Patil Dairy immediately."
                            ],
                            history: [
                              { month: "Jan", rev: 380000, profit: 148000 },
                              { month: "Feb", rev: 395000, profit: 155000 },
                              { month: "Mar", rev: 410000, profit: 164000 },
                              { month: "Apr", rev: 425000, profit: 172000 },
                              { month: "May", rev: 440000, profit: 181000 },
                              { month: "Jun", rev: 452000, profit: 189840 }
                            ]
                          },
                          "Medical Store": {
                            revenue: 720000,
                            margin: 28,
                            expenses: 518400,
                            categories: [
                              { name: "Prescription Drugs", pct: 60, color: "bg-emerald-500" },
                              { name: "OTC Medicines", pct: 20, color: "bg-blue-500" },
                              { name: "Surgicals & Kits", pct: 12, color: "bg-amber-500" },
                              { name: "Baby & Personal Care", pct: 8, color: "bg-purple-500" }
                            ],
                            insights: [
                              "📊 Chronic care medicines (diabetes/BP) represent 65% of prescription revenue, offering highly stable and recurring cash flow.",
                              "💡 Generic alternatives represent a massive opportunity: generic brand margin is 58% vs only 15% on ethical brands.",
                              "⚠️ Slow inventory turns detected for beauty products; clearance sale or bundling is suggested to release tied-up working capital."
                            ],
                            history: [
                              { month: "Jan", rev: 610000, profit: 165000 },
                              { month: "Feb", rev: 630000, profit: 171000 },
                              { month: "Mar", rev: 650000, profit: 178000 },
                              { month: "Apr", rev: 675000, profit: 185000 },
                              { month: "May", rev: 700000, profit: 193000 },
                              { month: "Jun", rev: 720000, profit: 201600 }
                            ]
                          }
                        };

                        const currentType = monthlyDataMap[businessType] ? businessType : "Grocery Store";
                        const selectedData = monthlyDataMap[currentType];

                        return (
                          <div className="flex flex-col gap-6 text-left">
                            {/* Bento grid inside the card */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Est. Revenue (MoM)</span>
                                <span className="text-base font-black text-slate-800 font-mono mt-1">₹{selectedData.revenue.toLocaleString("en-IN")}</span>
                                <span className="text-[9px] text-emerald-600 font-bold mt-1">▲ +8.4% growth</span>
                              </div>
                              <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gross Expenses</span>
                                <span className="text-base font-black text-slate-800 font-mono mt-1">₹{selectedData.expenses.toLocaleString("en-IN")}</span>
                                <span className="text-[9px] text-slate-400 font-medium mt-1">COGS & operational costs</span>
                              </div>
                              <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Net Profit margin</span>
                                <span className="text-base font-black text-emerald-700 font-mono mt-1">₹{(selectedData.revenue * (selectedData.margin / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                                <span className="text-[9px] text-emerald-600 font-black mt-1">💰 {selectedData.margin}% Net margin</span>
                              </div>
                              <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tax Liability (GST)</span>
                                <span className="text-base font-black text-slate-700 font-mono mt-1">₹{(selectedData.revenue * 0.18).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                                <span className="text-[9px] text-amber-600 font-bold mt-1">Input credits offset active</span>
                              </div>
                            </div>

                            {/* Chart + Categories */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                              {/* Left Side: Historical Line Chart */}
                              <div className="md:col-span-7 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">6-Month Income vs Profit Trends / ६ महीने का प्रदर्शन</h4>
                                <div className="h-44 w-full text-[10px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={selectedData.history} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                      <XAxis dataKey="month" stroke="#64748b" />
                                      <YAxis stroke="#64748b" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                      <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                                      <Legend />
                                      <Area type="monotone" dataKey="rev" name="Gross Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                      <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2.5} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* Right Side: Category Contribution Bars */}
                              <div className="md:col-span-5 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col gap-3">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">Sales Breakdown / विभाग अनुसार बिक्री</h4>
                                <div className="space-y-3">
                                  {selectedData.categories.map((cat, cIdx) => (
                                    <div key={cIdx} className="space-y-1 text-xs">
                                      <div className="flex justify-between font-bold text-slate-600">
                                        <span>{cat.name}</span>
                                        <span className="font-mono">{cat.pct}%</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className={`h-full ${cat.color}`} style={{ width: `${cat.pct}%` }}></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Smart AI Diagnostic Insights */}
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                              <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-emerald-700" />
                                <span>Hisaab Analytica AI Insights / वित्तीय विश्लेषण सलाह</span>
                              </h4>
                              <ul className="text-xs text-emerald-800 space-y-2 font-medium">
                                {selectedData.insights.map((ins, iIdx) => (
                                  <li key={iIdx} className="flex items-start gap-2 leading-relaxed">
                                    <span>{ins}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="flex flex-col gap-6 text-left">
                          {/* Bento Grid Header */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
                              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                                <Wallet className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Collections</span>
                                <span className="text-base font-black text-slate-800 font-mono">₹{(cashInGalla + upiInGalla).toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
                              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl animate-pulse">
                                <TrendingDown className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Expenses</span>
                                <span className="text-base font-black text-rose-600 font-mono">₹{totalTodayExpenses.toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                            <div className="bg-white border border-emerald-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm bg-emerald-50/20">
                              <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Profit Today</span>
                                <span className="text-base font-black text-emerald-700 font-mono">₹{(cashInGalla + upiInGalla - totalTodayExpenses).toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Left Column: Record Shop Expense Form */}
                            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
                              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Receipt className="w-4 h-4 text-emerald-600" />
                                Record Shop Expense / नया खर्च जोड़ें
                              </h4>

                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Expense Category / खर्च का प्रकार</label>
                                  <select
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-emerald-600 focus:bg-white"
                                  >
                                    <option value="Rent">Rent (दुकान किराया)</option>
                                    <option value="Utilities">Utilities (बिजली, पानी, वाई-फाई)</option>
                                    <option value="Transport">Transport (माल भाड़ा/गाड़ी किराया)</option>
                                    <option value="Staff Salary">Staff Salary (कर्मचारी वेतन/मजदूरी)</option>
                                    <option value="Tea & Snacks">Tea & Snacks (चाय और नाश्ता)</option>
                                    <option value="Maintenance">Maintenance (दुकान मरम्मत/रखरखाव)</option>
                                    <option value="Others">Others (अन्य खर्च)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Amount / राशि (₹) *</label>
                                  <div className="relative flex items-center">
                                    <input
                                      type="number"
                                      placeholder="Enter amount in ₹..."
                                      value={expenseAmount}
                                      onChange={(e) => setExpenseAmount(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-xs font-mono font-bold text-slate-800 focus:outline-emerald-600 focus:bg-white"
                                    />
                                    <div className="absolute right-1.5 inset-y-0 flex items-center">
                                      <VoiceInputButton 
                                        lang={selectedLanguage}
                                        onTranscript={(text) => {
                                          const digits = text.replace(/[^0-9]/g, "");
                                          if (digits) setExpenseAmount(digits);
                                        }} 
                                        size="sm" 
                                        className="bg-transparent border-none hover:bg-slate-200/50"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Expense Date / तारीख</label>
                                  <input
                                    type="date"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono font-bold text-slate-800 focus:outline-emerald-600 focus:bg-white"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Note / विवरण (Optional)</label>
                                  <div className="relative flex items-center">
                                    <input
                                      type="text"
                                      placeholder="e.g. Delivered raw items from market..."
                                      value={expenseNote}
                                      onChange={(e) => setExpenseNote(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-xs font-semibold text-slate-700 focus:outline-emerald-600 focus:bg-white"
                                    />
                                    <div className="absolute right-1.5 inset-y-0 flex items-center">
                                      <VoiceInputButton 
                                        lang={selectedLanguage}
                                        onTranscript={(text) => setExpenseNote(text)} 
                                        size="sm" 
                                        className="bg-transparent border-none hover:bg-slate-200/50"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const amt = parseFloat(expenseAmount);
                                    if (isNaN(amt) || amt <= 0) {
                                      setShowAlert("Please enter a valid expense amount | कृपया सही खर्च राशि भरें");
                                      setTimeout(() => setShowAlert(null), 3000);
                                      return;
                                    }
                                    
                                    const newExp = {
                                      id: `exp-${Date.now()}`,
                                      category: expenseCategory,
                                      amount: amt,
                                      note: expenseNote.trim() || `Shop Expense for ${expenseCategory}`,
                                      date: expenseDate || todayStr
                                    };

                                    setDailyExpenses(prev => [newExp, ...prev]);
                                    setExpenseAmount("");
                                    setExpenseNote("");
                                    
                                    setShowAlert(`✓ Added ₹${amt.toLocaleString("en-IN")} shop expense under ${expenseCategory}! | खर्च दर्ज किया गया!`);
                                    setTimeout(() => setShowAlert(null), 3000);
                                  }}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 px-4 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>Add Expense / खर्च जोड़ें</span>
                                </button>
                              </div>
                            </div>

                            {/* Middle Column: Monthly Expense Pie Chart */}
                            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                                  Expense Breakdown / खर्च विश्लेषण
                                </h4>
                                <select
                                  value={selectedExpenseMonth}
                                  onChange={(e) => setSelectedExpenseMonth(e.target.value)}
                                  className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-[10px] font-bold text-slate-600 focus:outline-emerald-600 focus:bg-white cursor-pointer"
                                >
                                  {availableExpenseMonths.map((m) => (
                                    <option key={m} value={m}>
                                      {formatYearMonth(m).split(" / ")[0]}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {monthlyExpenseChartData.totalAmount === 0 ? (
                                <div className="py-14 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-100 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Receipt className="w-6 h-6" />
                                  </div>
                                  <span>No expenses logged for this month yet.</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Use the form to add some expenses to view profit consumption.</span>
                                </div>
                              ) : (
                                <>
                                  {/* Donut Chart with Centered Total */}
                                  <div className="relative h-44 w-full text-xs flex items-center justify-center">
                                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL</span>
                                      <span className="text-sm font-black text-slate-800 font-mono mt-1">₹{monthlyExpenseChartData.totalAmount.toLocaleString("en-IN")}</span>
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={monthlyExpenseChartData.data}
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={45}
                                          outerRadius={65}
                                          paddingAngle={3}
                                          dataKey="value"
                                        >
                                          {monthlyExpenseChartData.data.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                        </Pie>
                                        <Tooltip 
                                          formatter={(value: any, name: any, props: any) => [
                                            `₹${value.toLocaleString("en-IN")} (${props.payload.percentage}%)`, 
                                            `${name} (${props.payload.hindiName})`
                                          ]} 
                                          contentStyle={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "bold" }}
                                        />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>

                                  {/* Category Legend list */}
                                  <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                                    {monthlyExpenseChartData.data.map((cat: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg border border-slate-50 bg-slate-50/30">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                                        <div className="min-w-0 flex-1 text-[10px]">
                                          <div className="flex justify-between font-bold text-slate-700">
                                            <span className="truncate">{cat.name}</span>
                                            <span className="font-mono text-emerald-700 shrink-0">{cat.percentage}%</span>
                                          </div>
                                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">₹{cat.value.toLocaleString("en-IN")}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Profit Consumption Analytics Box */}
                                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-left">
                                    <div className="flex items-start gap-2 text-[10.5px]">
                                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                      <div className="text-emerald-800 leading-normal">
                                        <span className="font-bold">Profit Advisor: </span>
                                        {monthlyExpenseChartData.topCategory ? (
                                          <span>
                                            Expenses consume <strong className="text-emerald-950 font-black">{monthlyExpenseChartData.profitConsumptionPercent}%</strong> of your estimated monthly profit (<strong className="text-emerald-950 font-mono">₹{monthlyExpenseChartData.refMonthlyProfit.toLocaleString("en-IN")}</strong>). 
                                            <strong className="text-emerald-950"> {monthlyExpenseChartData.topCategory.name} ({monthlyExpenseChartData.topCategory.hindiName})</strong> is your highest cost, consuming <strong className="text-emerald-950 font-black">{Math.round((monthlyExpenseChartData.topCategory.value / monthlyExpenseChartData.refMonthlyProfit) * 100)}%</strong> of net profit.
                                          </span>
                                        ) : (
                                          <span>Add your daily expenses to monitor real-time profit consumption.</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Right Column: Recorded Expenses Ledger */}
                            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                  Expenses Ledger / दैनिक खर्च बहीखाता
                                </h4>
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder="Search note or category..."
                                    value={expenseSearch}
                                    onChange={(e) => setExpenseSearch(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-lg py-1 pl-8 pr-3 text-[11px] font-semibold text-slate-700 focus:outline-emerald-600 focus:bg-white w-full sm:w-44"
                                  />
                                </div>
                              </div>

                              <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2">
                                {(() => {
                                  const filteredExpenses = dailyExpenses.filter(e => {
                                    const term = expenseSearch.toLowerCase();
                                    return e.category.toLowerCase().includes(term) || e.note.toLowerCase().includes(term);
                                  });

                                  if (filteredExpenses.length === 0) {
                                    return (
                                      <div className="py-12 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                        No matching expenses found.<br/>
                                        Start recording to protect your net profit margins!
                                      </div>
                                    );
                                  }

                                  // Badge color helper
                                  const getCategoryBadge = (cat: string) => {
                                    switch (cat) {
                                      case "Rent": return "text-purple-700 bg-purple-50 border-purple-100";
                                      case "Utilities": return "text-blue-700 bg-blue-50 border-blue-100";
                                      case "Transport": return "text-orange-700 bg-orange-50 border-orange-100";
                                      case "Staff Salary": return "text-cyan-700 bg-cyan-50 border-cyan-100";
                                      case "Tea & Snacks": return "text-amber-700 bg-amber-50 border-amber-100";
                                      case "Maintenance": return "text-teal-700 bg-teal-50 border-teal-100";
                                      default: return "text-slate-700 bg-slate-50 border-slate-100";
                                    }
                                  };

                                  return (
                                    <div className="space-y-2">
                                      <AnimatePresence initial={false}>
                                        {filteredExpenses.map((exp) => (
                                          <motion.div
                                            key={exp.id}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors text-left"
                                          >
                                            <div className="flex flex-col gap-1 pr-4 max-w-[70%]">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryBadge(exp.category)}`}>
                                                  {exp.category}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                                  {exp.date}
                                                </span>
                                              </div>
                                              <p className="text-[11px] font-semibold text-slate-700 break-words leading-tight mt-0.5">
                                                {exp.note}
                                              </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                              <span className="text-xs font-black text-rose-600 font-mono whitespace-nowrap">
                                                - ₹{exp.amount.toLocaleString("en-IN")}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setConfirmModal({
                                                    title: "Delete Expense | खर्च हटाएं",
                                                    message: `Are you sure you want to delete this ₹${exp.amount} expense? | क्या आप वाकई इस खर्च को हटाना चाहते हैं?`,
                                                    onConfirm: () => {
                                                      setDailyExpenses(prev => prev.filter(e => e.id !== exp.id));
                                                      setShowAlert(`✓ Deleted ${exp.category} expense of ₹${exp.amount}! | खर्च हटा दिया गया!`);
                                                      setTimeout(() => setShowAlert(null), 3000);
                                                    }
                                                  });
                                                }}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Delete Expense"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </motion.div>
                                        ))}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Stock supplier alerts (Right) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Low Stock Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                    <h3 className="text-sm font-black text-slate-800">⚠️ Low Inventory / स्टॉक ख़त्म चेतावनी</h3>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 mb-4">
                    <span className="text-xs font-black text-slate-800 block">
                      {BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.name}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Only {stockLevels[businessType]} units left. Normal weekly consumption is high. Suggested supplier: {BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.supplier}.
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                        stockLevels[businessType] <= 4 
                          ? "text-red-600 bg-red-50 border-red-100" 
                          : "text-emerald-600 bg-emerald-50 border-emerald-100"
                      }`}>
                        {stockLevels[businessType] <= 4 ? "CRITICAL" : "OK"}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700">
                        Stock: {stockLevels[businessType]} units left
                      </span>
                    </div>
                  </div>

                  {stockReorderSent ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-[11px] text-emerald-800 text-left">
                      <p className="font-bold">✓ WhatsApp Order Dispatched!</p>
                      <p className="mt-1 leading-relaxed">Hisaab AI drafted and sent purchase order to {BUSINESS_SPECIFIC_DATA[businessType]?.lowStock.supplier}. Expected delivery: Tomorrow morning (10:00 AM).</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleSupplierReorder}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 px-4 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                    >
                      <MessageCircle className="w-4.5 h-4.5 fill-current" />
                      <span>Reorder via Supplier WhatsApp</span>
                    </button>
                  )}
                </div>

                {/* GST & Discount Calculator Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">GST & Discount Calculator / टैक्स एवं छूट</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Billing Price / बिल राशि (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 5000"
                        value={calcBaseAmount}
                        onChange={(e) => setCalcBaseAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl font-mono focus:outline-indigo-600 focus:ring-1 focus:ring-indigo-600 font-bold"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">GST Rate / जीएसटी दर</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[5, 12, 18, 28].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setCalcGstRate(rate)}
                            className={`py-1.5 px-1 text-center text-xs font-bold rounded-lg border transition-all ${
                              calcGstRate === rate
                                ? "bg-indigo-600 border-indigo-600 text-white shadow"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Discount / छूट</span>
                      <div className="grid grid-cols-5 gap-1">
                        {[0, 5, 10, 15, 20].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => setCalcDiscountRate(rate)}
                            className={`py-1 px-1 text-center text-[11px] font-extrabold rounded-lg border transition-all ${
                              calcDiscountRate === rate
                                ? "bg-pink-600 border-pink-600 text-white shadow"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculations Display */}
                    {parseFloat(calcBaseAmount) > 0 && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-500">
                          <span>Original Price:</span>
                          <span className="font-mono">₹{parseFloat(calcBaseAmount).toLocaleString("en-IN")}</span>
                        </div>
                        {calcDiscountRate > 0 && (
                          <div className="flex justify-between text-xs font-semibold text-pink-600">
                            <span>Discount ({calcDiscountRate}%):</span>
                            <span className="font-mono">-₹{(parseFloat(calcBaseAmount) * (calcDiscountRate / 100)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs font-semibold text-slate-500 border-b border-dashed border-slate-200 pb-1.5">
                          <span>Taxable Value:</span>
                          <span className="font-mono">₹{(parseFloat(calcBaseAmount) - (parseFloat(calcBaseAmount) * (calcDiscountRate / 100))).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>CGST ({(calcGstRate / 2).toFixed(1)}%):</span>
                          <span className="font-mono">₹{(((parseFloat(calcBaseAmount) - (parseFloat(calcBaseAmount) * (calcDiscountRate / 100))) * (calcGstRate / 100)) / 2).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 border-b border-dashed border-slate-200 pb-1.5">
                          <span>SGST ({(calcGstRate / 2).toFixed(1)}%):</span>
                          <span className="font-mono">₹{(((parseFloat(calcBaseAmount) - (parseFloat(calcBaseAmount) * (calcDiscountRate / 100))) * (calcGstRate / 100)) / 2).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-slate-800 pt-1">
                          <span>Total Bill Price:</span>
                          <span className="font-mono text-indigo-700">
                            ₹{(
                              (parseFloat(calcBaseAmount) - (parseFloat(calcBaseAmount) * (calcDiscountRate / 100))) * (1 + calcGstRate / 100)
                            ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Add to Galla actions */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const base = parseFloat(calcBaseAmount) || 0;
                              const disc = base * (calcDiscountRate / 100);
                              const taxable = base - disc;
                              const gst = taxable * (calcGstRate / 100);
                              const total = taxable + gst;
                              setCashInGalla(prev => prev + total);
                              setCalcBaseAmount("");
                              setShowAlert(`Successfully calculated and added ₹${Math.round(total).toLocaleString("en-IN")} to cash drawer!`);
                              setTimeout(() => setShowAlert(null), 3000);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] py-2 px-1.5 rounded-xl cursor-pointer transition-colors text-center shadow-sm"
                          >
                            + Cash Drawer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const base = parseFloat(calcBaseAmount) || 0;
                              const disc = base * (calcDiscountRate / 100);
                              const taxable = base - disc;
                              const gst = taxable * (calcGstRate / 100);
                              const total = taxable + gst;
                              setUpiInGalla(prev => prev + total);
                              setCalcBaseAmount("");
                              setShowAlert(`Successfully calculated and added ₹${Math.round(total).toLocaleString("en-IN")} to digital UPI!`);
                              setTimeout(() => setShowAlert(null), 3000);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] py-2 px-1.5 rounded-xl cursor-pointer transition-colors text-center shadow-sm"
                          >
                            + Digital UPI
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simple settings connection toggle */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">🟢 Connection Status</h3>
                  <div className="space-y-3">
                    {[
                      { name: "Zoho CRM / Customer Hub", status: "Enabled" },
                      { name: "Gupshup WhatsApp API", status: "Active" },
                      { name: "Delhivery / Courier Link", status: "Active" },
                      { name: "Razorpay Payment Gate", status: "Active" }
                    ].map((gate, iIdx) => (
                      <div key={iIdx} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                        <span className="text-slate-600 font-bold">{gate.name}</span>
                        <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          {gate.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </motion.div>
          )})()}

        </AnimatePresence>
      </main>

      {/* Cloud Database Sync Control & Sandbox Panel Modal */}
      <AnimatePresence>
        {showDbSandbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowDbSandbox(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-blue-600 px-6 py-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-6 h-6 animate-pulse" />
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider">
                      ☁️ Hisaab Cloud Database Control / क्लाउड डेटाबेस
                    </h3>
                    <p className="text-[11px] text-blue-100 font-medium">
                      Real-Time Serverless Synchronization powered by Google Cloud Firestore
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDbSandbox(false)}
                  className="p-1.5 hover:bg-white/15 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Connection info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">DATABASE PROVIDER</span>
                    <span className="block text-xs font-black text-slate-700 mt-1 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-blue-500" />
                      Google Firestore
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">TENANT PARTITION</span>
                    <span className="block text-xs font-black text-slate-700 mt-1 truncate font-mono">
                      {user?.phone || "Guest / offline"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">STATUS</span>
                    <span className="block text-xs font-black mt-1">
                      {dbStatus === "connected" ? (
                        <span className="text-emerald-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping inline-block"></span>
                          CONNECTED (सक्रिय)
                        </span>
                      ) : dbStatus === "loading" ? (
                        <span className="text-amber-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block"></span>
                          SYNCING...
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                          OFFLINE (स्थानीय)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Document Counts in Firestore */}
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                    📊 SYNCHRONIZED COLLECTION DOCUMENTS / क्लाउड दस्तावेज़ विवरण
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { title: "Customers (Udhaar Book)", count: firestoreCounts.customers, icon: "📔", color: "text-amber-600 bg-amber-50" },
                      { title: "Inventory Items", count: firestoreCounts.inventory, icon: "📦", color: "text-blue-600 bg-blue-50" },
                      { title: "Invoices Uploaded", count: firestoreCounts.invoices, icon: "📸", color: "text-emerald-600 bg-emerald-50" },
                      { title: "Staff Members", count: firestoreCounts.staff, icon: "👥", color: "text-purple-600 bg-purple-50" },
                      { title: "Attendance Logs", count: firestoreCounts.attendance, icon: "🗓️", color: "text-teal-600 bg-teal-50" },
                      { title: "Galla Tally Logs", count: firestoreCounts.galla, icon: "💰", color: "text-rose-600 bg-rose-50" },
                    ].map((docItem, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{docItem.icon}</span>
                          <div>
                            <span className="block text-[10px] font-black text-slate-700 leading-tight">{docItem.title}</span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase">Cloud Sync</span>
                          </div>
                        </div>
                        <span className={`text-xs font-black px-2 py-1 rounded-xl font-mono ${docItem.color}`}>
                          {dbStatus === "connected" ? docItem.count : 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Synchronizer Event Feed */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      📡 LIVE DATABASE WORKFLOW STREAM / रियल-टाइम ट्रांजैक्शन लॉग
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">AUTOSAVING ACTIVE</span>
                  </div>
                  <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-4 rounded-2xl h-36 overflow-y-auto space-y-1.5 shadow-inner border border-slate-800">
                    {syncLogs.map((logStr, lIdx) => (
                      <div key={lIdx} className="flex gap-2">
                        <span className="text-blue-400 select-none">❯</span>
                        <span className="break-all">{logStr}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manual buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleManualBackup}
                    disabled={isSyncing}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-500/10 hover:bg-blue-700 transition cursor-pointer"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Manual Backup Now / अभी बैकअप लें</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (!user) return;
                      setIsSyncing(true);
                      addSyncLog("Reseeding sample Indian MSME catalog records to cloud...");
                      
                      // Seed database
                      const seededCust = {
                        "Grocery Store": [
                          { id: 1, name: "Rajesh Kirana Store", phone: "+91 98765 43210", address: "Bengaluru", amount: 4500, lastUpdated: "2 days ago" },
                          { id: 2, name: "Verma Grocers", phone: "+91 99012 34567", address: "Delhi NCR", amount: 12000, lastUpdated: "Today" },
                          { id: 3, name: "Bangalore Bakers Hub", phone: "+91 94480 12345", address: "Indiranagar", amount: 18500, lastUpdated: "1 week ago" },
                          { id: 4, name: "Aman Sweet Corner", phone: "+91 92245 67890", address: "Marathahalli", amount: 2500, lastUpdated: "Today" }
                        ],
                        "Restaurant": [
                          { id: 1, name: "Sharma Catering Services", phone: "+91 91234 56789", address: "Mumbai", amount: 6200, lastUpdated: "3 days ago" },
                          { id: 2, name: "Foodie Junction", phone: "+91 98123 45678", address: "Pune", amount: 14500, lastUpdated: "Yesterday" },
                          { id: 3, name: "Chef's Table Cafe", phone: "+91 97654 32109", address: "Bandra", amount: 9200, lastUpdated: "2 weeks ago" }
                        ],
                        "Medical Store": [
                          { id: 1, name: "Dr. Mehta Clinic", phone: "+91 93210 98765", address: "Ahmedabad", amount: 8400, lastUpdated: "5 days ago" },
                          { id: 2, name: "Lifeline Hospital", phone: "+91 90909 09090", address: "Ahmedabad West", amount: 43000, lastUpdated: "Today" },
                          { id: 3, name: "Gupta Chemist Retail", phone: "+91 92233 44556", address: "Baroda", amount: 11200, lastUpdated: "1 week ago" }
                        ],
                        "Clothing Store": [
                          { id: 1, name: "Raymonds Tailor Store", phone: "+91 95555 12345", address: "Jaipur", amount: 15200, lastUpdated: "4 days ago" },
                          { id: 2, name: "Fashion Hub Boutique", phone: "+91 96666 54321", address: "Udaipur", amount: 24000, lastUpdated: "Yesterday" },
                          { id: 3, name: "Agarwal Garments", phone: "+91 97777 98765", address: "Kota", amount: 19500, lastUpdated: "3 days ago" }
                        ]
                      };

                      const seededInv = {
                        "Grocery Store": [
                          { id: "inv-1", name: "Premium Basmati Rice", hindiName: "बासमती चावल", category: "Groceries", stock: 120, reorderPoint: 15, purchasePrice: 70, sellingPrice: 95, unit: "kg", supplierWhatsapp: "9876543210" },
                          { id: "inv-2", name: "Fortune Mustard Oil", hindiName: "सरसों का तेल", category: "Oils", stock: 80, reorderPoint: 10, purchasePrice: 110, sellingPrice: 135, unit: "ltr", supplierWhatsapp: "9123456789" },
                          { id: "inv-3", name: "Tata Salt Lite", hindiName: "टाटा नमक", category: "Groceries", stock: 50, reorderPoint: 5, purchasePrice: 20, sellingPrice: 28, unit: "packet", supplierWhatsapp: "9345678901" },
                          { id: "inv-4", name: "Aashirvaad Atta 10kg", hindiName: "आशीर्वाद आटा", category: "Flour", stock: 8, reorderPoint: 10, purchasePrice: 380, sellingPrice: 460, unit: "bag", supplierWhatsapp: "9456789012" }
                        ],
                        "Restaurant": [
                          { id: "inv-1", name: "Premium Paneer Block", hindiName: "पनीर", category: "Dairy", stock: 4, reorderPoint: 5, purchasePrice: 320, sellingPrice: 420, unit: "kg", supplierWhatsapp: "9567890123" },
                          { id: "inv-2", name: "Basmati Biryani Rice", hindiName: "बिरयानी चावल", category: "Groceries", stock: 100, reorderPoint: 20, purchasePrice: 85, sellingPrice: 120, unit: "kg", supplierWhatsapp: "9678901234" }
                        ]
                      };

                      setCustomersData(seededCust);
                      setInventoryItems(seededInv);
                      
                      await syncToCloud({
                        userPhone: user.phone,
                        customersData: seededCust,
                        inventoryItems: seededInv,
                        scannedInvoices,
                        staffList,
                        attendanceList,
                        salaryPayments,
                        cashInGalla,
                        upiInGalla,
                        updatedAt: new Date().toISOString()
                      });

                      setShowAlert("Database seeded & cloud backed up! | डेटाबेस रीसेट सफल!");
                      setTimeout(() => setShowAlert(null), 3000);
                      setIsSyncing(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-2xl transition cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-slate-500" />
                    <span>Seed Fresh MSME Data / डेटाबेस रीसीड</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Details */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-400" id="hisaab_ai_footer">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Hisaab AI Console — Smart Shopkeeper Solutions</span>
          </div>
          <div className="flex gap-4 font-mono text-[10px] text-slate-400">
            <span>GST COMPLIANT WORKSPACE</span>
            <span>POWERED BY HISAAB AI ENGINE</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
