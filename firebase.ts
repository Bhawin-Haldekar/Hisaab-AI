import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Config derived from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyC9Wj9SdygzElIrJs-3l_GlxxIEO6wuFSo",
  authDomain: "radiant-shape-dd2jw.firebaseapp.com",
  projectId: "radiant-shape-dd2jw",
  storageBucket: "radiant-shape-dd2jw.firebasestorage.app",
  messagingSenderId: "135645139715",
  appId: "1:135645139715:web:4013c9ffe76bbba6c9cf36"
};

const customDatabaseId = "ai-studio-operonaicoomulti-ab1ddc1c-78e2-4c95-ae79-61cf5a87d881";

let app;
let db: any;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  // Use getFirestore with custom database ID as second parameter
  db = getFirestore(app, customDatabaseId);
  console.log("Firebase initialized successfully with custom database:", customDatabaseId);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  // Fallback to avoid breaking app if something goes wrong
  db = null;
}

export { app, db };
