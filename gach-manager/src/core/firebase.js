// Firebase browser setup (ESM with global fallback)
// Using CDN ESM imports to avoid bundlers. If you prefer npm, switch to 'firebase/app' etc. and a bundler.

// Import the functions you need from the SDKs you need (CDN ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDVSduVFkpNWcmR5Hm9iD-2W1X6GEPoewA",
  authDomain: "gach-manager-demo.firebaseapp.com",
  projectId: "gach-manager-demo",
  storageBucket: "gach-manager-demo.firebasestorage.app",
  messagingSenderId: "15007912907",
  appId: "1:15007912907:web:b68cb101b1f92ded1e5c4e",
  measurementId: "G-PDDYFH80FH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
// Initialize analytics if supported (no top-level await for compatibility)
analyticsIsSupported()
  .then((ok) => {
    if (ok) {
      try { analytics = getAnalytics(app); } catch (_) {}
    }
  })
  .catch(() => { /* ignore */ });

// Initialize Firestore (db)
const db = getFirestore(app);

// Exports for ESM users
export { app, analytics, db };
export {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
};

// Global fallback so non-module scripts can access if needed
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
window.firebaseDb = db;
// Expose Firestore helpers for classic scripts
window.FB = {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
};
