// ==================== FIREBASE INIT ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, push, update, get, child, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==================== GLOBAL STATE ====================
let roleChartInstance, timeChartInstance, dateChartInstance;
let combinedData = [];
let currentUsername = null;
let isSuperAdmin = false;
let currentAdminSessionKey = null;

// ==================== REFS ====================
const studentsRef = ref(db, "students");
const visitorsRef = ref(db, "visitors");
const adminsRef = ref(db, "admins");
const superAdminRef = ref(db, "super_admin");
const adminSessionsRef = ref(db, "admin_sessions");

// ==================== HELPERS ====================
function fmtTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}
function fmtDate(ts) {
  return ts ? new Date(ts).toLocaleDateString() : "";
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

// ==================== LISTENERS ====================
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

onValue(adminSessionsRef, (snapshot) => {
  populateAdminSessions(snapshot.val() || {});
});

onValue(adminsRef, (snapshot) => {
  populateAdmins(snapshot.val() || {});
});

// ==================== UI REFRESH ====================
function refreshUI() {
  populateTables(combinedData);
  updateStatistics(combinedData);
  drawCharts(combinedData);
}

function populateTables(data) {
  const studentTable = document.getElementById("student-table-body");
  const visitorTable = document.getElementById("visitor-table-body");
  studentTable.innerHTML = "";
  visitorTable.innerHTML = "";

  const isStudent = (v) => (v._roleNorm || v.role || "").toLowerCase().startsWith("student");

  const students = data.filter(isStudent).sort((a, b) => new Date(b.visit_time || 0) - new Date(a.visit_time || 0));
  const visitors = data.filter(v => !isStudent(v)).sort((a, b) => new Date(b.visit_time || 0) - new Date(a.visit_time || 0));

  students.forEach(v => {
    studentTable.innerHTML += `
      <tr class="hover:bg-slate-800/60">
        <td class="py-3 px-6">${v.nickname || ""}</td>
        <td class="py-3 px-6">${v.location || ""}</td>
        <td class="py-3 px-6">${fmtTime(v.visit_time)}</td>
        <td class="py-3 px-6">${fmtDate(v.visit_time)}</td>
        <td class="py-3 px-6">
          <button onclick="deleteEntry('students','${v.id}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">Delete</button>
        </td>
      </tr>`;
  });

  visitors.forEach(v => {
    visitorTable.innerHTML += `
      <tr class="hover:bg-slate-800/60">
        <td class="py-3 px-6">${v.nickname || ""}</td>
        <td class="py-3 px-6">${v.location || ""}</td>
        <td class="py-3 px-6">${fmtTime(v.visit_time)}</td>
        <td class="py-3 px-6">${fmtDate(v.visit_time)}</td>
        <td class="py-3 px-6">
          <button onclick="deleteEntry('visitors','${v.id}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">Delete</button>
        </td>
      </tr>`;
  });
}

function updateStatistics(data) {
  let students = 0, visitors = 0;
  data.forEach(v => ((v._roleNorm || v.role || "").toLowerCase().startsWith("student") ? students++ : visitors++));
  document.getElementById("studentCount").textContent = students;
  document.getElementById("visitorCount").textContent = visitors;
  document.getElementById("totalCount").textContent = students + visitors;
}

window.deleteEntry = function(path, id) {
  if (confirm("Delete this entry?")) remove(ref(db, `${path}/${id}`));
};

// ==================== CHARTS ====================
function drawCharts(data) {
  const roleCounts = { students: 0, visitors: 0 };
  const timeCounts = {};
  const weekCounts = {};

  data.forEach(v => {
    const isStud = (v._roleNorm || v.role || "").toLowerCase().startsWith("student");
    roleCounts[isStud ? "students" : "visitors"]++;
    if (v.visit_time) {
      const dt = new Date(v.visit_time);
      timeCounts[dt.getHours()] = (timeCounts[dt.getHours()] || 0) + 1;

      const startOfWeek = new Date(dt);
      startOfWeek.setDate(dt.getDate() - dt.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const weekKey = `${startOfWeek.toISOString().slice(0, 10)} to ${endOfWeek.toISOString().slice(0, 10)}`;
      weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
    }
  });

  if (roleChartInstance) roleChartInstance.destroy();
  if (timeChartInstance) timeChartInstance.destroy();
  if (dateChartInstance) dateChartInstance.destroy();

  roleChartInstance = new Chart(document.getElementById("roleChart"), {
    type: "doughnut",
    data: {
      labels: ["Students", "Visitors"],
      datasets: [{ data: [roleCounts.students, roleCounts.visitors], backgroundColor: ["#6366f1", "#10b981"] }]
    }
  });

  const sortedHours = Object.keys(timeCounts).sort((a, b) => a - b);
  timeChartInstance = new Chart(document.getElementById("timeChart"), {
    type: "bar",
    data: {
      labels: sortedHours.map(h => `${h}:00`),
      datasets: [{ label: "Visits", data: sortedHours.map(h => timeCounts[h]), backgroundColor: "#8b5cf6" }]
    }
  });

  const sortedWeeks = Object.keys(weekCounts).sort((a, b) => new Date(a.split(" to ")[0]) - new Date(b.split(" to ")[0]));
  dateChartInstance = new Chart(document.getElementById("dateChart"), {
    type: "bar",
    data: {
      labels: sortedWeeks,
      datasets: [{ label: "Visits per Week", data: sortedWeeks.map(w => weekCounts[w]), backgroundColor: "#f59e0b" }]
    }
  });
}

// ==================== LOGIN / LOGOUT ====================
window.login = async function(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("login-error");

  errorEl.classList.add("hidden");
  let success = false;

  try {
    const saSnap = await get(superAdminRef);
    if (saSnap.exists()) {
      const sa = saSnap.val();
      if (username === sa.username) {
        const hash = await sha256(password);
        if (hash === sa.passwordHash) {
          isSuperAdmin = true;
          success = true;
        }
      }
    } else {
      const defaultPass = "superadmin123";
      const defaultHash = await sha256(defaultPass);
      await set(superAdminRef, { username: "superadmin", passwordHash: defaultHash, createdAt: Date.now() });
      if (username === "superadmin" && password === defaultPass) {
        isSuperAdmin = true;
        success = true;
      } else {
        errorEl.textContent = 'Default Super Admin created (superadmin / superadmin123)';
        errorEl.classList.remove("hidden");
        return;
      }
    }

    if (!success) {
      const adminSnap = await get(child(ref(db), `admins/${username}`));
      if (adminSnap.exists()) {
        const rec = adminSnap.val();
        const hash = await sha256(password);
        if (hash === rec.passwordHash) success = true;
      }
    }
  } catch (err) {
    console.error(err);
  }

  if (success) {
    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    currentUsername = username;
    if (!isSuperAdmin) startAdminSession();
    if (isSuperAdmin) updateSuperAdminDisplay();
  } else {
    errorEl.textContent = "Invalid credentials.";
    errorEl.classList.remove("hidden");
  }
};

window.logout = function() {
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("login-section").classList.remove("hidden");
  if (!isSuperAdmin) endAdminSession();
  currentUsername = null;
  isSuperAdmin = false;
};

// ==================== ADMIN SESSIONS ====================
async function startAdminSession() {
  const res = await push(adminSessionsRef, { admin: currentUsername, timeIn: Date.now(), timeOut: null });
  currentAdminSessionKey = res.key;
}
async function endAdminSession() {
  if (currentAdminSessionKey) {
    await update(ref(db, `admin_sessions/${currentAdminSessionKey}`), { timeOut: Date.now() });
    currentAdminSessionKey = null;
  }
}
function populateAdminSessions(all) {
  const body = document.getElementById("admin-session-table-body");
  body.innerHTML = "";
  Object.entries(all || {}).forEach(([id, s]) => {
    body.innerHTML += `
      <tr>
        <td>${id}</td>
        <td>${s.admin}</td>
        <td>${s.timeIn ? new Date(s.timeIn).toLocaleString() : ""}</td>
        <td>${s.timeOut ? new Date(s.timeOut).toLocaleString() : "—"}</td>
      </tr>`;
  });
}

// ==================== ADMINS ====================
function populateAdmins(all) {
  const body = document.getElementById("admins-table-body");
  body.innerHTML = "";
  Object.entries(all || {}).forEach(([username, rec]) => {
    body.innerHTML += `
      <tr>
        <td>${username}</td>
        <td>${rec.createdAt ? new Date(rec.createdAt).toLocaleString() : ""}</td>
        <td><button onclick="deleteAdmin('${username}')" class="bg-rose-600 px-3 py-1 rounded">Delete</button></td>
      </tr>`;
  });
}
window.createAdmin = async function(event) {
  event.preventDefault();
  if (!isSuperAdmin) return alert("Super Admin only.");
  const u = document.getElementById("new-admin-username").value.trim();
  const p = document.getElementById("new-admin-password").value.trim();
  if (!u || !p) return alert("Enter both username and password.");
  const hash = await sha256(p);
  await set(ref(db, `admins/${u}`), { passwordHash: hash, createdAt: Date.now() });
  alert("Admin created.");
};
window.deleteAdmin = async function(username) {
  if (!isSuperAdmin) return alert("Super Admin only.");
  if (confirm(`Delete admin "${username}"?`)) await remove(ref(db, `admins/${username}`));
};

// ==================== SUPER ADMIN SETTINGS ====================
async function updateSuperAdminDisplay() {
  const saSnap = await get(superAdminRef);
  if (saSnap.exists()) {
    const data = saSnap.val();
    document.getElementById("current-username").value = data.username;
    document.getElementById("display-username").textContent = data.username;
    document.getElementById("display-created").textContent = new Date(data.createdAt).toLocaleString();
    document.getElementById("display-updated").textContent = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "Never";
  }
}
window.changeSuperAdminUsername = async function(event) {
  event.preventDefault();
  if (!isSuperAdmin) return;
  const newUsername = document.getElementById("new-username").value.trim();
  if (!newUsername) return alert("Enter a new username.");
  await update(superAdminRef, { username: newUsername, updatedAt: Date.now() });
  alert("Username changed. Log in again.");
  logout();
};
window.changeSuperAdminPassword = async function(event) {
  event.preventDefault();
  if (!isSuperAdmin) return;
  const cur = document.getElementById("current-password").value.trim();
  const newP = document.getElementById("new-password").value.trim();
  const conf = document.getElementById("confirm-password").value.trim();
  if (newP !== conf) return alert("Passwords do not match.");
  const saSnap = await get(superAdminRef);
  const sa = saSnap.val();
  const curHash = await sha256(cur);
  if (curHash !== sa.passwordHash) return alert("Current password incorrect.");
  const newHash = await sha256(newP);
  await update(superAdminRef, { passwordHash: newHash, updatedAt: Date.now() });
  alert("Password changed. Log in again.");
  logout();
};
