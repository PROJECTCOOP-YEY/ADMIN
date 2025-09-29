// ============================================================
// Firebase Imports
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, push, update, get, child, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// ============================================================
// Firebase Configuration
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyB3xZaZjQrNRODplN6mXhAzDTHqmRcxYHk",
  authDomain: "presidential-car-museum.firebaseapp.com",
  databaseURL: "https://presidential-car-museum-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "presidential-car-museum",
  storageBucket: "presidential-car-museum.appspot.com",
  messagingSenderId: "888401660663",
  appId: "1:888401660663:web:82b179145c73decfec21f2",
  measurementId: "G-7PWEKQW7ZE"
};

// ============================================================
// Initialize Firebase
// ============================================================
let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  auth = getAuth(app);
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  hideLoadingScreen();
  showError("Failed to initialize Firebase. Please check your configuration.");
}

// ============================================================
// Global State
// ============================================================
let combinedData = [];
let isAuthenticated = false;
let isAppReady = false;
let isSuperAdmin = false;
let superAdminIdle = false;
let currentUsername = null;
let currentAdminSessionKey = null;

const studentsRef = ref(db, "students");
const visitorsRef = ref(db, "visitors");
const unlockReqsRef = ref(db, "unlock_requests");
const adminSessionsRef = ref(db, "admin_sessions");
const adminsRef = ref(db, "admins");
const superAdminRef = ref(db, "super_admin");

// ============================================================
// Utility Functions
// ============================================================
function updateConnectionStatus(message, color) {
  const statusEl = document.getElementById("connection-status");
  if (statusEl) {
    statusEl.innerHTML = `<span class="text-${color}-400">${message}</span>`;
  }
}

function hideLoadingScreen() {
  document.getElementById("loading-screen")?.classList.add("hidden");
  document.getElementById("login-section")?.classList.remove("hidden");
}

function showError(msg) {
  const el = document.getElementById("login-error");
  if (el) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }
}

function fmtTime(ts) {
  try { return ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""; }
  catch { return ""; }
}

function fmtDate(ts) {
  try { return ts ? new Date(ts).toLocaleDateString() : ""; }
  catch { return ""; }
}

async function sha256(text) {
  if (window.crypto?.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  if (window.sha256) return window.sha256(text);
  throw new Error("No SHA-256 available");
}

// ============================================================
// Firebase Authentication
// ============================================================
function initializeSecureAuth() {
  updateConnectionStatus("🔄 Connecting to database...", "amber");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      isAuthenticated = true;
      updateConnectionStatus("✅ Connected to database", "green");
      if (!isAppReady) {
        initializeDatabaseListeners();
        isAppReady = true;
      }
    } else {
      updateConnectionStatus("🔄 Signing in anonymously...", "amber");
      signInAnonymously(auth).catch((error) => {
        console.error("❌ Authentication failed:", error);
        updateConnectionStatus("❌ Connection failed", "red");
        showError(`Failed to connect to database: ${error.message}.`);
      });
    }
  });
}

// ============================================================
// Database Listeners
// ============================================================
function initializeDatabaseListeners() {
  onValue(studentsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const students = Object.entries(data).map(([id, v]) => ({ id, ...v, _path: "students", _roleNorm: "student" }));
    combinedData = [...students, ...combinedData.filter(x => x._path !== "students")];
    refreshUI();
  });

  onValue(visitorsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const visitors = Object.entries(data).map(([id, v]) => ({ id, ...v, _path: "visitors", _roleNorm: "visitor" }));
    combinedData = [...combinedData.filter(x => x._path !== "visitors"), ...visitors];
    refreshUI();
  });

  onValue(unlockReqsRef, (snapshot) => {
    populateUnlockRequests(snapshot.val() || {});
  });

  onValue(adminSessionsRef, (snapshot) => {
    populateAdminSessions(snapshot.val() || {});
  });

  onValue(adminsRef, (snapshot) => {
    populateAdmins(snapshot.val() || {});
  });
}

// ============================================================
// App Initialization
// ============================================================
function initializeApplication() {
  const loadingTimeout = setTimeout(() => {
    updateConnectionStatus("⏰ Connection timeout", "red");
    showError("Connection timeout. Please refresh the page.");
  }, 15000);

  initializeSecureAuth();

  const originalUpdateStatus = updateConnectionStatus;
  updateConnectionStatus = function (message, color) {
    if (color === "green") clearTimeout(loadingTimeout);
    originalUpdateStatus(message, color);
  };
}

// ============================================================
// Start Application
// ============================================================
initializeApplication();

// Expose functions needed in HTML
window.showError = showError;
window.sha256 = sha256;
