// ================================================================
// UTILS - دوال مساعدة
// ================================================================

// ===== التواريخ والوقت =====
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTime() {
  const now = new Date();
  let h = now.getHours();
  let m = String(now.getMinutes()).padStart(2, '0');
  let s = String(now.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  return h + ':' + m + ':' + s + ' ' + ampm;
}

function getCurrentDateTime() {
  return { date: getCurrentDate(), time: getCurrentTime() };
}

// ===== عناصر DOM =====
function safeSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function safeSetValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function getSelectedPayment(prefix) {
  const el = document.querySelector('input[name="' + prefix + 'Payment"]:checked');
  return el ? el.value : 'نقدي';
}

// ===== النسخ =====
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('📋 تم النسخ', 'success'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('📋 تم النسخ', 'success');
  } catch(e) {
    showToast('❌ فشل النسخ', 'error');
  }
  document.body.removeChild(textarea);
}

// ===== الساعة =====
function updateClock() {
  const now = new Date();
  let h = now.getHours();
  let m = String(now.getMinutes()).padStart(2, '0');
  let s = String(now.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  const clock = document.getElementById('liveClock');
  if (clock) clock.textContent = h + ':' + m + ':' + s + ' ' + ampm;
}
setInterval(updateClock, 1000);

// ===== الصلاحيات =====
function hasPermission(action) {
  const role = currentUser.role;
  if (role === 'admin') return true;
  if (role === 'manager') return ['add', 'edit', 'view'].indexOf(action) !== -1;
  if (role === 'cashier') return ['add', 'view'].indexOf(action) !== -1;
  if (role === 'viewer') return ['view'].indexOf(action) !== -1;
  return false;
}

function isAdmin() { return currentUser.role === 'admin'; }
function canDelete() { return currentUser.role === 'admin'; }
function canEdit() { return currentUser.role === 'admin' || currentUser.role === 'manager'; }
function canAdd() { return currentUser.role !== 'viewer'; }
function canViewAudit() { return currentUser.role === 'admin'; }

// ===== التنبيهات =====
function showToast(msg, type) {
  type = type || 'info';
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function addAuditLog(action, type, details) {
  auditLog.unshift({ 
    id: Date.now(), 
    action, 
    type, 
    details, 
    date: new Date().toISOString(), 
    user: currentUser.username 
  });
  if (auditLog.length > 500) auditLog = auditLog.slice(0, 500);
  saveAll();
  renderAudit();
}

function addAlert(title, desc, type) {
  type = type || 'info';
  alerts.unshift({ 
    id: Date.now(), 
    title, 
    desc, 
    type, 
    date: new Date().toISOString(), 
    read: false 
  });
  if (alerts.length > 100) alerts = alerts.slice(0, 100);
  saveAll();
  updateAlertsUI();
}

// ===== المودال =====
function closeModal() {
  const el = document.getElementById('modalOverlay');
  if (el) el.classList.remove('show');
}

function openModal(title, html) {
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const overlay = document.getElementById('modalOverlay');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = html;
  if (overlay) overlay.classList.add('show');
}