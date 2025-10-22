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
  getDoc,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCvGQKuFlX185r61_y7-kllCkce9RPoPSE",
    authDomain: "gach-men-manager.firebaseapp.com",
    projectId: "gach-men-manager",
    storageBucket: "gach-men-manager.firebasestorage.app",
    messagingSenderId: "315648440509",
    appId: "1:315648440509:web:e1ba76c953e54472e0dfd4",
    measurementId: "G-4VW4N4B5LY"
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
  serverTimestamp,
  runTransaction
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
  getDoc,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction
};

// Provide a GM_fb facade for snapshot-based realtime
window.GM_fb = window.GM_fb || {};
Object.assign(window.GM_fb, {
  app,
  db,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction
});

// Dispatch a ready event so non-module scripts can wait for Firebase
try {
  window.dispatchEvent(new CustomEvent('gm:firebase-ready', { detail: { app, db } }));
} catch (_) { /* ignore */ }
