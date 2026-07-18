# Hisaab AI 📊🎙️
### *Bilingual Smart Ledger, Billing & Business Analytics for Retailers and MSMEs*

Hisaab AI is an easy-to-use, bilingual (Hindi/English) AI-powered ledger, billing, and smart business assistant designed specifically for Indian retail shops, Kirana stores, medical pharmacies, and restaurants. Built with a full-stack architecture powered by React, Tailwind CSS, Express, and the Gemini API, Hisaab AI simplifies complex financial tracking, automates credit collection (Udhaar Khata), and provides predictive insights.

---

## 🚀 Core Features

### 🎙️ 1. Hisaab Voice (AI Dictation)
* **Hands-Free Ledger Logging**: Talk directly to the app in English or Hindi (e.g., *"Ramesh gave ₹500"* or *"10 kg rice sold at ₹450"*).
* **Bilingual Smart Parsing**: Uses natural language processing to extract transaction amounts, names, and items automatically.

### 📷 2. Hisaab Scan (AI OCR Bill Scanner)
* **Smart Bill Reader**: Scan or upload invoices, purchase receipts, and distributor bills.
* **Auto-Inventory Matching**: Automatically extracts items, quantities, and prices using OCR to update your stock instantly.

### 📓 3. Udhaar Khata (Credit Ledger Book)
* **Account Ledger Tracking**: Maintain accurate records of credit transactions and outstanding balances for customer profiles.
* **Automated Customer Reminders**: Send automated WhatsApp and Email reminders for credit balances to customers on Udhaar Khata.

### 📦 4. Inventory & Margin Analytics
* **Directory Management**: Track your stock, alert when running low, and manage wholesale and retail pricing.
* **Interactive Margin Analysis**: Identify top-performing "Star" inventory items, calculate margins, and flag "Dead Stock" using dynamic charts.

### 👥 5. Staff Shift & Payroll Tracker
* **Attendance Ledger**: Log daily staff shifts, check-ins, and check-outs.
* **Payroll Processing**: Auto-calculate monthly salaries, overtime, and advances with a clean tracking panel.

### 💰 6. Galla (Cash Register & Drawer Ledger)
* **Cash Flow Monitoring**: Log daily cash handovers, active sales, and cash register discrepancies.
* **Predictive Capital Forecasting**: View dynamic predictive graphs showing next-month cash availability and margins depending on store category (e.g., Kirana, Medical, Restaurant).

---

## 🛠️ Tech Stack

* **Frontend**: React (v19), Tailwind CSS, Motion (Animations), Lucide React (Icons), Recharts (Charts)
* **Backend**: Express (Node.js) with tsx runtime
* **AI/LLM**: Google GenAI SDK (`@google/genai`) powered by Gemini models
* **Bundler & Build Tool**: Vite (v6) & Esbuild

---

## 📁 Project Structure

```
├── server.ts               # Custom Express server with Vite middleware integration
├── src/
│   ├── App.tsx             # Main React entry point and tab navigation layout
│   ├── index.css           # Global Tailwind and font definitions
│   ├── main.tsx            # React client bootstrap
│   └── components/         # Reusable UI components
├── assets/                 # Brand logos and custom graphics
├── metadata.json           # Application config and permission definitions
├── .env.example            # Template for server-side environment variables
├── package.json            # Node dependencies and build scripts
└── tsconfig.json           # TypeScript compilation configuration
```

---

## ⚙️ Getting Started

### Prerequisites
* **Node.js**: v18 or later
* **npm** or **bun** package manager

### 1. Installation
Clone the repository and install the required dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and define the following variables:
```env
# Google Gemini API key for smart voice understanding, OCR scanning, and cash projections
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Nodemailer SMTP credentials for email billing and credit notifications
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### 3. Start Development Server
Boot the Express dev server (Vite handles front-end hot-reloads via middleware mode on port 3000):
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 4. Build for Production
To bundle and compile the application for a container or production environment:
```bash
npm run build
```
This builds the client static assets to the `dist/` directory and packs the backend Express TypeScript file into a compiled CommonJS bundle at `dist/server.cjs`.

### 5. Start Production Server
Launch the production-ready standalone server:
```bash
npm run start
```

---

## 🔒 Security & API Integrity
Hisaab AI enforces server-side separation of credentials. All Gemini API calls, OCR extraction, and email dispatcher mechanisms run strictly server-side inside `server.ts` to keep your API keys hidden from client-side browser inspections.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
