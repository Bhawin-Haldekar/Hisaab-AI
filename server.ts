import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Helper to lazy-initialize GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        console.log("Successfully initialized Google GenAI SDK.");
      } catch (err) {
        console.error("Failed to initialize Google GenAI SDK:", err);
      }
    } else {
      console.warn("GEMINI_API_KEY is not configured or holds default placeholder. Using high-fidelity simulated agent intelligence.");
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "20mb" }));

  // API 1: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // API 2: Chat with the AI COO (Operon)
  app.post("/api/agents/chat", async (req, res) => {
    const { message, history, businessType } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are "OPERON", an elite Autonomous AI COO and Lead Orchestrator for Indian Small and Medium Enterprises (SMEs) and MSMEs. 
Your task is to coordinate and manage a collaborative workforce of specialised AI Agents within the Indian context:
1. SCRIBE (Precise Indian OCR, invoice/receipt parsing, GSTIN verification, quotation layouts)
2. ANALYTICA (Predictive cash flow modeling in Indian Rupees ₹, GSTR sales forecasting, seasonal Diwali/Holi demand trends, working capital safety in Lakhs)
3. COMMUNICATOR (WhatsApp Business API integration, vernacular local customer notifications, CRM lead updates)
4. SCHEDULER (Google Calendar sync, coordination with local courier partners like Delhivery/Shiprocket, meeting booking)

The user is running an Indian ${businessType || "Kirana & Grocery Store"} business.
Always maintain an elite, professional, strategic, and direct tone (like a YC India founder, Bengaluru Startup CTO, and deep McKinsey India partner). Use Indian corporate/business references (such as Tally ERP, Zoho Books, Razorpay, UPI, GST, e-Way bills) when appropriate. 
Acknowledge the user's questions and respond with clear execution steps. Refer to your specialised agent workforce (Scribe, Analytica, etc.) when planning actions.
If the user requests an action like "generate a quotation", "analyze sales", or "draft an email", explain that OPERON is directing the corresponding agent to complete it, and provide a structured plan.
Always denote currency in Indian Rupees (₹) and amounts in Thousands or Lakhs (e.g. ₹1.5 Lakhs).
Keep responses highly scannable, using clear headings, bold text, and brief lists. Avoid wordy introductions or generic pleasantries.`;

    if (ai) {
      try {
        // Prepare chat history in standard Gemini format
        const formattedContents = history ? history.map((h: any) => ({
          role: h.role === "assistant" ? "model" : h.role,
          parts: [{ text: h.content }]
        })) : [];

        // Add the current user message
        formattedContents.push({
          role: "user",
          parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });

        res.json({
          reply: response.text || "I processed your request, but did not receive a legible response from my core cognitive layers.",
          simulated: false
        });
      } catch (err: any) {
        console.error("Gemini API Error in /api/agents/chat:", err);
        res.json({
          reply: `[API Warning: ${err.message || "Failed to reach AI Core"}] 

I am OPERON, your AI COO. I've intercepted this communication block. Here is my strategic response for your Indian ${businessType} business:

We should direct our agents to execute this immediately:
1. **SCRIBE Agent** will extract the required metadata and verify the GSTIN.
2. **ANALYTICA Agent** will run a localized projection modeling in Indian Rupees (₹).
3. **COMMUNICATOR Agent** is drafting the automated follow-up sequence via WhatsApp Business API.

How would you like to proceed with the workflow automation?`,
          simulated: true
        });
      }
    } else {
      // Return simulated smart COO response
      const simulatedReplies: Record<string, string> = {
        default: `### [Simulated AI COO] OPERON Executive Response
Greetings. I am **OPERON**, your Virtual COO. I have analyzed your query for your Indian **${businessType || "Kirana & Grocery Store"}** business.

To streamline this operation, I will coordinate our multi-agent workforce:
1. **SCRIBE Agent** is on standby to process incoming e-way bills/invoice files, verify GSTINs, or parse raw quotation details.
2. **COMMUNICATOR Agent** will queue up a CRM follow-up trigger and draft a WhatsApp dispatch mock notification.
3. **ANALYTICA Agent** will generate a 30-day cash flow forecast in Indian Rupees (₹) to inspect working capital safety and GST liability.

Would you like me to trigger a live collaboration sequence or analyze a custom business spreadsheet?`
      };

      res.json({
        reply: simulatedReplies.default,
        simulated: true
      });
    }
  });

  // API 3: Document processing (OCR) via Gemini Multimodal
  app.post("/api/agents/ocr", async (req, res) => {
    const { imageBase64, mimeType, textData } = req.body;
    const ai = getGeminiClient();

    const prompt = `You are the SCRIBE Agent. Your role is precise document parsing, OCR, and structural extraction.
Extract the following details from the uploaded document text or image and format them strictly as a JSON object matching this schema:
{
  "invoiceNumber": "string or null",
  "clientName": "string or null",
  "issueDate": "string (YYYY-MM-DD) or null",
  "items": [
    { "description": "string", "quantity": number, "price": number, "total": number }
  ],
  "subtotal": number,
  "tax": number,
  "grandTotal": number,
  "currency": "string (e.g. USD, EUR, INR)"
}
Return ONLY valid raw JSON. No markdown backticks, no comments, no additional text.`;

    if (ai) {
      try {
        let contents: any;
        if (imageBase64 && mimeType) {
          contents = {
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType
                }
              },
              { text: prompt }
            ]
          };
        } else {
          contents = `${prompt}\n\nDocument Text Content:\n${textData || "No document data uploaded"}`;
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          }
        });

        const jsonText = response.text ? response.text.trim() : "{}";
        const parsed = JSON.parse(jsonText);
        res.json({ data: parsed, rawText: response.text, simulated: false });
      } catch (err: any) {
        console.error("Gemini OCR Error:", err);
        // Fallback to parsed dummy text if error
        res.json({
          error: err.message,
          simulated: true,
          data: simulateOCR(textData || "")
        });
      }
    } else {
      res.json({
        simulated: true,
        data: simulateOCR(textData || "")
      });
    }
  });

  // API 3.5: Voice Editing Agent
  app.post("/api/agents/voice-edit", async (req, res) => {
    const { ocrText, voiceCommand, ocrResult } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are the HISAAB AI Voice Editing Agent. 
You are given:
1. The current Raw OCR Text of an invoice.
2. A voice command from the user (which can be in English, Hindi, or Hinglish, e.g., "change madan sweets to bhawin sweets", "change date to 2026-07-15", "madan sweets ko bhawin sweet kar do", etc.).
3. The current parsed OCR JSON structure of the invoice (optional).

Your task is to act as a smart agent. 
Interpret the user's voice command and modify the Raw OCR Text AND the parsed OCR JSON structure to reflect the requested edit.
Make precise changes. Do not change other unrelated parts of the text or JSON.

Return a JSON object with this exact schema:
{
  "updatedOcrText": "string", // The modified raw OCR text
  "updatedOcrResult": object or null, // The modified parsed JSON object (if provided, match its original structure exactly, updating the relevant key/value. If not provided, return null)
  "explanation": "string" // A brief, friendly explanation of what you changed (in English and Hindi/Hinglish, e.g., "Changed supplier name to Bhawin Sweets | सप्लायर का नाम बदलकर Bhawin Sweets कर दिया गया।")
}

Here is the current Raw OCR Text:
"""
${ocrText || ""}
"""

Here is the current parsed OCR JSON structure:
${ocrResult ? JSON.stringify(ocrResult, null, 2) : "null"}

User Voice Command:
"${voiceCommand}"

Return ONLY valid raw JSON matching the schema above. Do not include markdown backticks or any other text outside the JSON block.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          }
        });

        const jsonText = response.text ? response.text.trim() : "{}";
        const parsed = JSON.parse(jsonText);
        res.json({
          updatedOcrText: parsed.updatedOcrText || ocrText,
          updatedOcrResult: parsed.updatedOcrResult || ocrResult,
          explanation: parsed.explanation || "Command processed.",
          simulated: false
        });
      } catch (err: any) {
        console.error("Gemini Voice Edit Error:", err);
        const sim = simulateVoiceEdit(ocrText || "", voiceCommand || "", ocrResult);
        res.json({
          updatedOcrText: sim.updatedOcrText,
          updatedOcrResult: sim.updatedOcrResult,
          explanation: `[Simulated fallback] ${sim.explanation}`,
          simulated: true
        });
      }
    } else {
      const sim = simulateVoiceEdit(ocrText || "", voiceCommand || "", ocrResult);
      res.json({
        updatedOcrText: sim.updatedOcrText,
        updatedOcrResult: sim.updatedOcrResult,
        explanation: sim.explanation,
        simulated: true
      });
    }
  });

  // Local helper for voice-edit simulation
  function simulateVoiceEdit(ocrText: string, voiceCommand: string, ocrResult: any) {
    let updatedOcrText = ocrText;
    let updatedOcrResult = ocrResult ? { ...ocrResult } : null;
    let explanation = "";

    const cleanCommand = voiceCommand.toLowerCase();
    
    // Specific case: change madan sweets to bhawin sweet
    if (cleanCommand.includes("madan") && (cleanCommand.includes("bhawin") || cleanCommand.includes("bhavin"))) {
      updatedOcrText = ocrText
        .replace(/MADAN SWEETS & BAKERY WHOLESALERS/gi, "BHAWIN SWEETS & BAKERY WHOLESALERS")
        .replace(/MADAN SWEETS/gi, "BHAWIN SWEETS");
      
      if (updatedOcrResult) {
        if (updatedOcrResult.clientName && updatedOcrResult.clientName.toLowerCase().includes("madan")) {
          updatedOcrResult.clientName = "BHAWIN SWEETS";
        }
        if (updatedOcrResult.supplierName && updatedOcrResult.supplierName.toLowerCase().includes("madan")) {
          updatedOcrResult.supplierName = "BHAWIN SWEETS";
        }
        if (updatedOcrResult.clientName === "Karan Bakery & Retail (Bengaluru)") {
          // If editing before ocr run, let's keep it clean
        }
      }
      explanation = "Changed 'Madan Sweets' to 'Bhawin Sweets' | 'Madan Sweets' को बदलकर 'Bhawin Sweets' कर दिया गया।";
    } else {
      // Try generic "change X to Y" parsing
      const match = voiceCommand.match(/change\s+(.+?)\s+to\s+(.+)/i) || 
                    voiceCommand.match(/replace\s+(.+?)\s+with\s+(.+)/i);
      
      if (match) {
        const fromText = match[1].trim();
        const toText = match[2].trim();
        
        // Escape regex special chars
        const escapedFrom = fromText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedFrom, "gi");
        updatedOcrText = ocrText.replace(regex, toText);
        
        if (updatedOcrResult) {
          const replaceInObj = (obj: any): any => {
            if (typeof obj === "string") {
              return obj.replace(regex, toText);
            } else if (Array.isArray(obj)) {
              return obj.map(replaceInObj);
            } else if (obj !== null && typeof obj === "object") {
              const newObj: any = {};
              for (const key in obj) {
                newObj[key] = replaceInObj(obj[key]);
              }
              return newObj;
            }
            return obj;
          };
          updatedOcrResult = replaceInObj(updatedOcrResult);
        }
        explanation = `Changed '${fromText}' to '${toText}' | '${fromText}' को बदलकर '${toText}' कर दिया गया।`;
      } else {
        explanation = `Executed agent command: "${voiceCommand}" | कमांड लागू किया गया: "${voiceCommand}"`;
      }
    }

    return {
      updatedOcrText,
      updatedOcrResult,
      explanation
    };
  }

  // Helper simulated OCR parser
  function simulateOCR(text: string) {
    // Detect some patterns or return structured mock
    const lines = text.split("\n");
    let detectedTotal = 125000.00;
    let detectedClient = "Karan Bakery & Retail (Bengaluru)";
    let detectedInvoiceNum = "GST-2026-904";

    for (const line of lines) {
      if (line.toLowerCase().includes("total") || line.toLowerCase().includes("due")) {
        const num = line.match(/\d+[\.,]\d+/);
        if (num) detectedTotal = parseFloat(num[0].replace(",", ""));
      }
      if (line.toLowerCase().includes("invoice") || line.toLowerCase().includes("inv") || line.toLowerCase().includes("gst")) {
        const m = line.match(/(GST-\d+-\d+|INV-\d+-\d+|#\d+)/i);
        if (m) detectedInvoiceNum = m[0];
      }
    }

    return {
      invoiceNumber: detectedInvoiceNum,
      clientName: detectedClient,
      issueDate: "2026-07-02",
      items: [
        { description: "Premium Wheat Flour (Maida - 25kg Bag)", quantity: 10, price: 1800.00, total: 18000.00 },
        { description: "Organic Cane Sugar (Chini - 10kg Bag)", quantity: 5, price: 950.00, total: 4750.00 },
        { description: "Pure Butter Block (Amul Makhan - 5kg)", quantity: 8, price: 4500.00, total: 36000.00 }
      ],
      subtotal: 58750.00,
      tax: 10575.00, // 18% GST typical
      grandTotal: 69325.00,
      currency: "INR"
    };
  }

  // API 4: Simulate multi-agent collaboration workflow
  app.post("/api/agents/simulate-task", (req, res) => {
    const { taskType, businessType } = req.body;

    const collaborations: Record<string, any[]> = {
      process_order: [
        {
          agent: "SCRIBE",
          message: "Incoming GST invoice received. Performing Indian-compliant OCR, verifying GSTIN 29AAAAA1111A1Z1, and running validation checks...",
          status: "completed",
          timestamp: new Date(Date.now() - 5000).toLocaleTimeString()
        },
        {
          agent: "ANALYTICA",
          message: "GST invoice metadata validated. Matching items against active tally inventory and running margin check: 24% net profit margin approved.",
          status: "completed",
          timestamp: new Date(Date.now() - 4000).toLocaleTimeString()
        },
        {
          agent: "SCHEDULER",
          message: "Checking logistics slot with Shiprocket / Delhivery courier API. Booked shipment pickup from warehouse for tomorrow morning (10:00 AM).",
          status: "completed",
          timestamp: new Date(Date.now() - 3000).toLocaleTimeString()
        },
        {
          agent: "COMMUNICATOR",
          message: "Dispatched automated GST e-way bill and order confirmation via WhatsApp Business API to client. Tracking URL generated: https://shiprocket.in/track/gst-9034",
          status: "completed",
          timestamp: new Date(Date.now() - 1000).toLocaleTimeString()
        },
        {
          agent: "OPERON (COO)",
          message: "Indian workflow executed successfully. Tally/Zoho status updated to 'FULFILLED'. Working capital database logged, shipping e-way bill closed.",
          status: "success",
          timestamp: new Date().toLocaleTimeString()
        }
      ],
      schedule_demo: [
        {
          agent: "COMMUNICATOR",
          message: "Inbound wholesale interest detected from WhatsApp lead nurture campaign. India Mobile verified, routing details logged to Central SME CRM.",
          status: "completed",
          timestamp: new Date(Date.now() - 5000).toLocaleTimeString()
        },
        {
          agent: "SCHEDULER",
          message: "Analyzing sales executive availability in IST timezone. Suggested open slots: Monday 2:00 PM or Tuesday 10:00 AM. Awaiting partner choice...",
          status: "completed",
          timestamp: new Date(Date.now() - 4000).toLocaleTimeString()
        },
        {
          agent: "SCHEDULER",
          message: "Partner selected Monday 2:00 PM IST. Booked Google Calendar event, generated Zoom link, and synchronized executive agenda.",
          status: "completed",
          timestamp: new Date(Date.now() - 2000).toLocaleTimeString()
        },
        {
          agent: "COMMUNICATOR",
          message: "Sent automated meeting alert via WhatsApp, auto-drafted pre-meeting briefing note, and scheduled reminder SMS for T-15 minutes.",
          status: "completed",
          timestamp: new Date(Date.now() - 1000).toLocaleTimeString()
        },
        {
          agent: "OPERON (COO)",
          message: "MSME Lead converted to scheduled meeting. Pipeline opportunity value updated to ₹3,50,000.00.",
          status: "success",
          timestamp: new Date().toLocaleTimeString()
        }
      ],
      annual_forecast: [
        {
          agent: "ANALYTICA",
          message: "Accessing 12-month historical GSTR sales data, seasonal Indian festive demand variations (Diwali, Holi, Dussehra), and local market inflation markers...",
          status: "completed",
          timestamp: new Date(Date.now() - 6000).toLocaleTimeString()
        },
        {
          agent: "ANALYTICA",
          message: "Applying autoregressive projecting models. Calculated +18.4% growth for next quarter, with a minor dip in late monsoon season due to historical off-season.",
          status: "completed",
          timestamp: new Date(Date.now() - 4000).toLocaleTimeString()
        },
        {
          agent: "ANALYTICA",
          message: "Detected potential raw material shipping backlog in ports. Working capital risk score: Moderate.",
          status: "completed",
          timestamp: new Date(Date.now() - 3000).toLocaleTimeString()
        },
        {
          agent: "OPERON (COO)",
          message: "Compiled SME Executive Briefing. Recommending a 15% advance purchase order on wholesale raw materials to hedge against supply chain delay.",
          status: "success",
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    };

    const selected = collaborations[taskType] || collaborations.process_order;
    res.json({ workflow: selected });
  });

  // API 5: Predictive Business Analytics
  app.get("/api/agents/predictive-analytics", (req, res) => {
    const businessType = req.query.businessType as string || "Grocery Store";

    // Generate responsive analytics depending on the industry selected
    let analyticsData: any = {};

    if (businessType === "Restaurant") {
      analyticsData = {
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
    } else if (businessType === "Medical Store") {
      analyticsData = {
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
          { month: "May", actual: 588000, predicted: 588500 },
          { month: "Jun", actual: null, predicted: 611000 },
          { month: "Jul", actual: null, predicted: 624500 },
        ],
        risks: [
          { level: "High", desc: "No-show rate in specialist health consult slots has crept up to 18.5% in urban clinics." },
          { level: "Low", desc: "Essential medicines and organic consumables inventory running low in storage." }
        ],
        actions: [
          { agent: "Communicator", desc: "Activate automated interactive WhatsApp prescription refills and confirmation alerts 24 hours prior." },
          { agent: "Scribe", desc: "Auto-scan and pre-populate Patient medicine logs from uploaded prescriptions." }
        ]
      };
    } else if (businessType === "Clothing Store") {
      analyticsData = {
        title: "Garments & Apparel Season Trends",
        metrics: {
          salesPredict: "₹9,84,000",
          salesGrowth: "+18.3%",
          riskScore: "High",
          workingCapital: "₹4,60,000",
          efficiency: "91.8%"
        },
        salesHistory: [
          { month: "Jan", actual: 740000, predicted: 745000 },
          { month: "Feb", actual: 760000, predicted: 755000 },
          { month: "Mar", actual: 885000, predicted: 880000 },
          { month: "Apr", actual: 910000, predicted: 915000 },
          { month: "May", actual: 930000, predicted: 928000 },
          { month: "Jun", actual: null, predicted: 955000 },
          { month: "Jul", actual: null, predicted: 984000 },
        ],
        risks: [
          { level: "High", desc: "Supplier fabric shipment backlog delay warning in Gujarat hub. Estimated arrival extended by 14 days." },
          { level: "Moderate", desc: "Shift in fashion trend towards linen products might render pure-polyester stock slower moving." }
        ],
        actions: [
          { agent: "Analytica", desc: "Re-route fabric procurement orders to alternative B-grade approved apparel makers in Surat/Ahmedabad." },
          { agent: "Scheduler", desc: "Set reminders for seasonal clearance sales before the festive Diwali stock arrives." }
        ]
      };
    } else { // Grocery Store / Retail & Default Kirana
      analyticsData = {
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
          { month: "Jul", actual: null, predicted: 364800 },
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

    res.json(analyticsData);
  });

  // API 6: Send automated low-stock email alert
  app.post("/api/alerts/send-email", async (req, res) => {
    const { itemName, currentStock, reorderPoint, itemUnit, businessName, recipientEmail } = req.body;

    if (!itemName) {
      return res.status(400).json({ error: "itemName is required" });
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || "587";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM_EMAIL || "alerts@hisaab.ai";
    const toEmail = recipientEmail || process.env.ALERT_TO_EMAIL || "merchant@hisaab.ai";

    const emailSubject = `⚠️ [ALERT] Low Stock: ${itemName} in ${businessName || "Store"}`;
    const emailText = `Warning: The inventory level for "${itemName}" has dropped below the reorder threshold.

Current Level: ${currentStock} ${itemUnit || "units"}
Reorder Point: ${reorderPoint} ${itemUnit || "units"}

Please restock this item as soon as possible to avoid out-of-stock disruption.

Hisaab AI Automated Inventory Assistant
`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="background-color: #ef4444; color: #ffffff; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 18px; font-weight: bold;">⚠️ Low Stock Alert | स्टॉक चेतावनी</h2>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 15px; line-height: 1.5; color: #334155;">
            Hello, the stock level for <strong>${itemName}</strong> in your <strong>${businessName || "Store"}</strong> has dropped below the critical reorder point!
          </p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Current Stock:</td>
                <td style="padding: 6px 0; font-family: monospace; font-size: 15px; font-weight: bold; color: #ef4444; text-align: right;">${currentStock} ${itemUnit || "units"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Reorder Threshold:</td>
                <td style="padding: 6px 0; font-family: monospace; font-size: 15px; font-weight: bold; color: #334155; text-align: right;">${reorderPoint} ${itemUnit || "units"}</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Kindly log in to your Hisaab AI Dashboard to create an automated reorder WhatsApp voucher or contact your wholesale supplier immediately.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            Powered by Hisaab AI • Automated SME Kirana Enterprise Suite
          </p>
        </div>
      </div>
    `;

    console.log(`[LOW STOCK EMAIL ROUTE] Item: "${itemName}" is low. Stock: ${currentStock}/${reorderPoint}`);

    if (!host || !user || !pass) {
      console.log("---------------- SMTP SIMULATOR LOG ----------------");
      console.log(`To: ${toEmail}`);
      console.log(`From: ${fromEmail}`);
      console.log(`Subject: ${emailSubject}`);
      console.log(`Text:\n${emailText}`);
      console.log("-----------------------------------------------");
      return res.json({
        success: true,
        mode: "simulation",
        message: "Email alert logged in server console. Real SMTP credentials not provided in .env.",
        alert: {
          to: toEmail,
          subject: emailSubject,
          itemName,
          currentStock,
          reorderPoint,
          itemUnit
        }
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: port === "465",
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${businessName || 'Hisaab AI'}" <${fromEmail}>`,
        to: toEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });

      console.log(`[SMTP] Email sent successfully: ${info.messageId}`);
      return res.json({
        success: true,
        mode: "live",
        message: "Real low stock email alert dispatched successfully!",
        messageId: info.messageId
      });
    } catch (error: any) {
      console.error("[SMTP Error] Failed to send email alert:", error);
      return res.status(500).json({
        error: "Failed to send email alert via SMTP",
        details: error.message
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OPERON Full-Stack App Dev Server running on http://localhost:${PORT}`);
  });
}

startServer();
