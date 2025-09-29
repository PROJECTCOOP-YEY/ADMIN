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

// Login Functions

async function login(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("login-error");

  errorEl.classList.add("hidden");

  try {
    const hashed = await sha256(password);

    // Check super admin (support hashed or plaintext storage)
    const saSnap = await get(superAdminRef);
    const saData = saSnap.val();
    const saPass = saData?.password || saData?.passwordHash;
    const isSaMatch = saData
      && saData.username === username
      && (saPass === hashed || saPass === password);
    if (isSaMatch) {
      isSuperAdmin = true;
      currentUsername = username;
      document.getElementById("login-section").classList.add("hidden");
      document.getElementById("dashboard").classList.remove("hidden");
      document.getElementById("btn-unlocks").classList.remove("hidden");
      document.getElementById("btn-sessions").classList.remove("hidden");
      document.getElementById("btn-admins").classList.remove("hidden");
      document.getElementById("btn-settings").classList.remove("hidden");
      document.getElementById("welcome-label").textContent = `Welcome, Super Admin`;
      return;
    }

    // Check regular admins (case-insensitive username, support hashed/plain fields)
    const adminSnap = await get(adminsRef);
    const admins = adminSnap.val() || {};
    const usernameKey = Object.keys(admins).find(k => k.toLowerCase() === username.toLowerCase());
    const adminRecord = usernameKey ? admins[usernameKey] : undefined;
    const adminPass = adminRecord?.passwordHash || adminRecord?.password;
    const isAdminMatch = adminRecord && (adminPass === hashed || adminPass === password);
    if (isAdminMatch) {
      currentUsername = usernameKey;
      document.getElementById("login-section").classList.add("hidden");
      document.getElementById("dashboard").classList.remove("hidden");
      document.getElementById("welcome-label").textContent = `Welcome, Admin ${usernameKey}`;
      return;
    }

    errorEl.textContent = "Invalid credentials.";
    errorEl.classList.remove("hidden");

  } catch (err) {
    console.error("Login error:", err);
    errorEl.textContent = "Login failed. Try again.";
    errorEl.classList.remove("hidden");
  }
}

// Expose to HTML
window.login = login;


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

// ============================================================
// UI Refresh (Counts + Tables)
// ============================================================
function refreshUI() {
  try {
    const students = combinedData.filter(x => x._roleNorm === "student");
    const visitors = combinedData.filter(x => x._roleNorm === "visitor");

    const studentCountEl = document.getElementById("studentCount");
    const visitorCountEl = document.getElementById("visitorCount");
    const totalCountEl = document.getElementById("totalCount");

    if (studentCountEl) studentCountEl.textContent = String(students.length);
    if (visitorCountEl) visitorCountEl.textContent = String(visitors.length);
    if (totalCountEl) totalCountEl.textContent = String(students.length + visitors.length);

    // Tables
    const studentTbody = document.getElementById("student-table-body");
    const visitorTbody = document.getElementById("visitor-table-body");

    if (studentTbody) {
      studentTbody.innerHTML = "";
      for (const item of students) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="py-3 px-6">${escapeHtml(item.nickname || item.name || item.fullname || "—")}</td>
          <td class="py-3 px-6">${escapeHtml(item.location || item.address || "—")}</td>
          <td class="py-3 px-6">${fmtTime(item.timestamp || item.time || item.dateTime)}</td>
          <td class="py-3 px-6">${fmtDate(item.timestamp || item.time || item.dateTime)}</td>
          <td class="py-3 px-6"><span class="text-slate-400 text-xs">—</span></td>`;
        studentTbody.appendChild(tr);
      }
    }

    if (visitorTbody) {
      visitorTbody.innerHTML = "";
      for (const item of visitors) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="py-3 px-6">${escapeHtml(item.nickname || item.name || item.fullname || "—")}</td>
          <td class="py-3 px-6">${escapeHtml(item.location || item.address || "—")}</td>
          <td class="py-3 px-6">${fmtTime(item.timestamp || item.time || item.dateTime)}</td>
          <td class="py-3 px-6">${fmtDate(item.timestamp || item.time || item.dateTime)}</td>
          <td class="py-3 px-6"><span class="text-slate-400 text-xs">—</span></td>`;
        visitorTbody.appendChild(tr);
      }
    }

  } catch (e) {
    console.error("refreshUI error:", e);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ====================== POPULATE ADMINS ======================
function populateAdmins(data) {
  const tbody = document.getElementById("admins-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  for (const [username, adminData] of Object.entries(data)) {
    const tr = document.createElement("tr");

    const tdUser = document.createElement("td");
    tdUser.className = "py-3 px-6";
    tdUser.textContent = username;

    const tdCreated = document.createElement("td");
    tdCreated.className = "py-3 px-6";
    tdCreated.textContent = adminData.createdAt
      ? new Date(adminData.createdAt).toLocaleString()
      : "—";

    const tdAction = document.createElement("td");
    tdAction.className = "py-3 px-6";
    tdAction.innerHTML = `<button class="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded text-xs">Delete</button>`;

    tr.append(tdUser, tdCreated, tdAction);
    tbody.appendChild(tr);
  }
}

// ====================== POPULATE UNLOCK REQUESTS ======================
function populateUnlockRequests(data) {
  const tbody = document.getElementById("unlock-req-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  for (const [reqId, reqData] of Object.entries(data)) {
    const tr = document.createElement("tr");

    const tdReqId = document.createElement("td");
    tdReqId.className = "py-3 px-6";
    tdReqId.textContent = reqId;

    const tdClient = document.createElement("td");
    tdClient.className = "py-3 px-6";
    tdClient.textContent = reqData.client || "—";

    const tdUsername = document.createElement("td");
    tdUsername.className = "py-3 px-6";
    tdUsername.textContent = reqData.username || "—";

    const tdRequested = document.createElement("td");
    tdRequested.className = "py-3 px-6";
    tdRequested.textContent = reqData.requestedAt
      ? new Date(reqData.requestedAt).toLocaleString()
      : "—";

    const tdStatus = document.createElement("td");
    tdStatus.className = "py-3 px-6";
    tdStatus.textContent = reqData.status || "Pending";

    const tdAction = document.createElement("td");
    tdAction.className = "py-3 px-6";
    tdAction.innerHTML = `<button class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs">Approve</button>`;

    tr.append(tdReqId, tdClient, tdUsername, tdRequested, tdStatus, tdAction);
    tbody.appendChild(tr);
  }
}

// ====================== POPULATE ADMIN SESSIONS ======================
function populateAdminSessions(data) {
  const tbody = document.getElementById("admin-session-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  for (const [sessionId, sessionData] of Object.entries(data)) {
    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.className = "py-3 px-6";
    tdId.textContent = sessionId;

    const tdUser = document.createElement("td");
    tdUser.className = "py-3 px-6";
    tdUser.textContent = sessionData.username || "—";

    const tdIn = document.createElement("td");
    tdIn.className = "py-3 px-6";
    tdIn.textContent = sessionData.timeIn
      ? new Date(sessionData.timeIn).toLocaleString()
      : "—";

    const tdOut = document.createElement("td");
    tdOut.className = "py-3 px-6";
    tdOut.textContent = sessionData.timeOut
      ? new Date(sessionData.timeOut).toLocaleString()
      : "—";

    tr.append(tdId, tdUser, tdIn, tdOut);
    tbody.appendChild(tr);
  }
}
