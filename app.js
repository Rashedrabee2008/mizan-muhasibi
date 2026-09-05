// ================================================================
// app.js - التطبيق الرئيسي (الملف الكامل المعدل)
// ================================================================

// ================================================================
// CONFIG
// ================================================================
const DEFAULT_PASSWORD = '123456';
const SECRET_KEY = 'Mizan_License_2025_Secret';
const DEMO_LICENSE_KEY = 'UmFzaGVkfDIwMjctMDgtMjV8fDg5YWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTA=';
const LICENSE_PRICES = { 30: 1500, 90: 2000, 180: 2500, 365: 3000, 730: 6000 };

let currentPassword = localStorage.getItem('app_password') || DEFAULT_PASSWORD;
let backupInterval = null;
let versionClickCount = 0;
let currentUser = JSON.parse(localStorage.getItem('mizan_current_user')) || { username: 'مدير', role: 'admin' };

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value !== undefined && value !== null ? value : '';
}

function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value !== undefined && value !== null ? value : '';
}

function safeGetValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function safeGetNumber(id) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
}

function safeGetInt(id) {
    const el = document.getElementById(id);
    return el ? parseInt(el.value) || 0 : 0;
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) {
        // إنشاء توست إذا لم يوجد
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.className = 'toast';
        document.body.appendChild(newToast);
        setTimeout(() => showToast(msg, type), 100);
        return;
    }
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function getSelectedPayment(prefix) {
    const el = document.querySelector(`input[name="${prefix}Payment"]:checked`);
    return el ? el.value : 'نقدي';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('show');
}

function openModal(title, html) {
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const overlay = document.getElementById('modalOverlay');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = html;
    if (overlay) overlay.classList.add('show');
}

function getCurrentDateTime() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const time = hours + ':' + minutes + ':' + seconds + ' ' + ampm;
    return { date, time, full: date + ' ' + time };
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getCurrentTime() {
    return new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('📋 تم نسخ البيانات', 'success');
        }).catch(() => {
            fallbackCopy(text);
        });
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
        showToast('📋 تم نسخ البيانات', 'success');
    } catch (e) {
        showToast('❌ فشل النسخ', 'error');
    }
    document.body.removeChild(textarea);
}

// ================================================================
// PERMISSIONS
// ================================================================

function hasPermission(action) {
    const role = currentUser.role;
    if (role === 'admin') return true;
    if (role === 'manager') return ['add', 'edit', 'view'].includes(action);
    if (role === 'cashier') return ['add', 'view'].includes(action);
    if (role === 'viewer') return ['view'].includes(action);
    return false;
}

function isAdmin() {
    return currentUser.role === 'admin';
}

function canDelete() {
    return currentUser.role === 'admin';
}

function canEdit() {
    return currentUser.role === 'admin' || currentUser.role === 'manager';
}

function canAdd() {
    return currentUser.role !== 'viewer';
}

function canViewAudit() {
    return currentUser.role === 'admin';
}

// ================================================================
// UPDATE UI BY PERMISSIONS
// ================================================================

function updateUIByPermissions() {
    const clearAuditBtn = document.getElementById('clearAuditBtn');
    if (clearAuditBtn) {
        clearAuditBtn.style.display = canViewAudit() ? 'block' : 'none';
    }
    document.querySelectorAll('.btn-danger').forEach(btn => {
        if (!canDelete() && !btn.closest('.actions')?.classList?.contains('no-permission')) {
            btn.style.display = 'none';
        }
    });
    document.querySelectorAll('.btn-warning').forEach(btn => {
        if (!canEdit() && !btn.closest('.actions')?.classList?.contains('no-permission')) {
            btn.style.display = 'none';
        }
    });
    document.querySelectorAll('.btn-primary, .btn-success').forEach(btn => {
        if (btn.textContent.includes('إضافة') || btn.textContent.includes('حفظ') || btn.textContent.includes('تسجيل')) {
            if (!canAdd() && !btn.closest('.actions')?.classList?.contains('no-permission')) {
                btn.style.display = 'none';
            }
        }
    });
    const display = document.getElementById('currentUserDisplay');
    const roleDisplay = document.getElementById('currentRoleDisplay');
    if (display) display.textContent = currentUser.username;
    if (roleDisplay) {
        const roles = { admin: 'مدير', manager: 'مشرف', cashier: 'كاشير', viewer: 'مشاهد' };
        roleDisplay.textContent = roles[currentUser.role] || currentUser.role;
    }
}

// ================================================================
// CLOCK
// ================================================================

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const clock = document.getElementById('liveClock');
    if (clock) {
        clock.textContent = hours + ':' + minutes + ':' + seconds + ' ' + ampm;
    }
}
setInterval(updateClock, 1000);
updateClock();

// ================================================================
// LOGIN / LOGOUT / LOCK
// ================================================================

function checkLogin() {
    const input = document.getElementById('loginPassword');
    const error = document.getElementById('loginError');
    if (typeof activateDemoLicense === 'function') activateDemoLicense();

    if (input.value === DEFAULT_PASSWORD || input.value === currentPassword) {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';
        if (error) error.classList.remove('show');
        input.value = '';
        localStorage.setItem('app_unlocked', 'true');

        showToast('🔓 مرحباً بك في الميزان!', 'success');

        setTimeout(() => {
            // ===== الحل الرئيسي: استدعاء seedData =====
            if (typeof seedData === 'function') seedData();
            if (typeof populateAllSelects === 'function') populateAllSelects();
            if (typeof refreshAllPages === 'function') refreshAllPages();
            if (typeof startAutoBackup === 'function') startAutoBackup();
            updateUIByPermissions();
            updateClock();
            if (typeof syncFromFirebase === 'function') syncFromFirebase();
        }, 300);
    } else {
        if (error) error.classList.add('show');
        input.value = '';
        input.focus();
        setTimeout(() => {
            if (error) error.classList.remove('show');
        }, 3000);
    }
}

function lockApp() {
    if (confirm('🔒 هل تريد قفل التطبيق؟')) {
        const appContent = document.getElementById('appContent');
        const loginContainer = document.getElementById('loginContainer');
        const loginPassword = document.getElementById('loginPassword');
        if (appContent) appContent.style.display = 'none';
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (loginPassword) {
            loginPassword.value = '';
            loginPassword.focus();
        }
        localStorage.removeItem('app_unlocked');
        showToast('🔒 تم القفل', 'info');
    }
}

function logoutApp() {
    if (confirm('⚠️ هل تريد تسجيل الخروج؟')) {
        const appContent = document.getElementById('appContent');
        const loginContainer = document.getElementById('loginContainer');
        const loginPassword = document.getElementById('loginPassword');
        if (appContent) appContent.style.display = 'none';
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (loginPassword) {
            loginPassword.value = '';
            loginPassword.focus();
        }
        localStorage.removeItem('app_unlocked');
        showToast('👋 تم تسجيل الخروج', 'info');
    }
}

// ================================================================
// NAVIGATION
// ================================================================

function navigateTo(pageId) {
    document.querySelectorAll('.page-container').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) item.classList.add('active');
    });

    if (typeof closeMorePanel === 'function') closeMorePanel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof refreshPage === 'function') refreshPage(pageId);
}

function refreshPage(pageId) {
    if (pageId === 'dashboard') {
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateDashboardDetails === 'function') updateDashboardDetails();
        if (typeof refreshDashboard === 'function') refreshDashboard();
    }
    if (pageId === 'inventory' && typeof renderProducts === 'function') renderProducts();
    if (pageId === 'warehouses' && typeof renderWarehouses === 'function') renderWarehouses();
    if (pageId === 'permissions' && typeof renderPermissions === 'function') renderPermissions();
    if (pageId === 'customers' && typeof renderCustomers === 'function') renderCustomers();
    if (pageId === 'suppliers' && typeof renderSuppliers === 'function') renderSuppliers();
    if (pageId === 'expenses' && typeof renderExpenses === 'function') renderExpenses();
    if (pageId === 'treasury' && typeof renderTreasury === 'function') renderTreasury();
    if (pageId === 'bonds' && typeof renderBonds === 'function') renderBonds();
    if (pageId === 'invoices' && typeof renderAllInvoices === 'function') renderAllInvoices();
    if (pageId === 'accounting' && typeof updateAccounting === 'function') updateAccounting();
    if (pageId === 'cashier' && typeof renderCashier === 'function') renderCashier();
    if (pageId === 'settings') {
        if (typeof updateSettingsUI === 'function') updateSettingsUI();
        if (typeof updateLicenseUI === 'function') updateLicenseUI();
    }
    if (pageId === 'company' && typeof loadCompanyData === 'function') loadCompanyData();
    if (pageId === 'backup' && typeof renderBackups === 'function') renderBackups();
    if (pageId === 'accounts' && typeof renderAccounts === 'function') renderAccounts();
    if (pageId === 'audit' && typeof renderAudit === 'function') renderAudit();
    if (pageId === 'alerts' && typeof updateAlertsUI === 'function') updateAlertsUI();
    if (pageId === 'profit_analysis' && typeof generateProfitAnalysis === 'function') generateProfitAnalysis();
    if (pageId === 'license_generator') {
        if (typeof renderGeneratedKeys === 'function') renderGeneratedKeys();
        if (typeof updateLicensePrice === 'function') updateLicensePrice();
    }
    if (pageId === 'sales' || pageId === 'purchase' || pageId === 'returns') {
        if (typeof populateAllSelects === 'function') populateAllSelects();
    }
    if (pageId === 'customer_statement' && typeof populateCustomerStatement === 'function') populateCustomerStatement();
    if (pageId === 'supplier_statement' && typeof populateSupplierStatement === 'function') populateSupplierStatement();
    if (pageId === 'barcode' && typeof updateAlertsUI === 'function') updateAlertsUI();
    if (pageId === 'users') {
        if (typeof renderUsers === 'function') renderUsers();
        if (typeof populateUsersSelect === 'function') populateUsersSelect();
        updateUIByPermissions();
    }
    if (pageId === 'sales') {
        if (typeof updateCustomerWhatsApp === 'function') updateCustomerWhatsApp();
        if (typeof updateCustomerWhatsAppManual === 'function') updateCustomerWhatsAppManual();
    }
    if (pageId === 'purchase') {
        if (typeof updateSupplierWhatsApp === 'function') updateSupplierWhatsApp();
        if (typeof updateSupplierWhatsAppManual === 'function') updateSupplierWhatsAppManual();
    }
    if (pageId === 'inventory_adjustment') {
        if (typeof populateAdjustmentProducts === 'function') populateAdjustmentProducts();
        if (typeof renderAdjustmentHistory === 'function') renderAdjustmentHistory();
        if (typeof updateAdjustmentDateTime === 'function') updateAdjustmentDateTime();
    }

    updateUIByPermissions();
    updateClock();
}

function openMorePanel() {
    const overlay = document.getElementById('moreOverlay');
    const panel = document.getElementById('morePanel');
    if (overlay) overlay.classList.add('open');
    if (panel) panel.classList.add('open');
}

function closeMorePanel() {
    const overlay = document.getElementById('moreOverlay');
    const panel = document.getElementById('morePanel');
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
}

// ================================================================
// REFRESH ALL PAGES
// ================================================================

function refreshAllPages() {
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderSales === 'function') renderSales();
    if (typeof renderAllPurchases === 'function') renderAllPurchases();
    if (typeof renderAllReturns === 'function') renderAllReturns();
    if (typeof renderAllInvoices === 'function') renderAllInvoices();
    if (typeof renderWarehouses === 'function') renderWarehouses();
    if (typeof renderPermissions === 'function') renderPermissions();
    if (typeof renderCustomers === 'function') renderCustomers();
    if (typeof renderSuppliers === 'function') renderSuppliers();
    if (typeof renderExpenses === 'function') renderExpenses();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof renderBonds === 'function') renderBonds();
    if (typeof renderBackups === 'function') renderBackups();
    if (typeof renderAccounts === 'function') renderAccounts();
    if (typeof renderAudit === 'function') renderAudit();
    if (typeof renderGeneratedKeys === 'function') renderGeneratedKeys();
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof renderUsers === 'function') renderUsers();
    if (typeof renderAdjustmentHistory === 'function') renderAdjustmentHistory();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof updateAccounting === 'function') updateAccounting();
    if (typeof updateSettingsUI === 'function') updateSettingsUI();
    if (typeof updateAlertsUI === 'function') updateAlertsUI();
    if (typeof updateLicenseUI === 'function') updateLicenseUI();
    if (typeof loadCompanyData === 'function') loadCompanyData();
    if (typeof populateAllSelects === 'function') populateAllSelects();
    if (typeof updateLicensePrice === 'function') updateLicensePrice();
    if (typeof refreshDashboard === 'function') refreshDashboard();
    updateUIByPermissions();
    if (typeof populateAdjustmentProducts === 'function') populateAdjustmentProducts();
    updateClock();

    setTimeout(() => {
        if (typeof updateCustomerWhatsApp === 'function') updateCustomerWhatsApp();
        if (typeof updateSupplierWhatsApp === 'function') updateSupplierWhatsApp();
    }, 200);
}

// ================================================================
// START AUTO BACKUP
// ================================================================

function startAutoBackup() {
    if (backupInterval) clearInterval(backupInterval);
    backupInterval = setInterval(() => {
        if (typeof createAutoBackup === 'function') createAutoBackup();
    }, 6 * 60 * 60 * 1000);
}

// ================================================================
// LICENSE FUNCTIONS
// ================================================================

function decodeLicenseKey(licenseKey) {
    try {
        const decoded = atob(licenseKey);
        const parts = decoded.split('|');
        if (parts.length !== 3) return null;
        const customerName = parts[0];
        const expiryDate = parts[1];
        const signature = parts[2];
        const expectedSignature = btoa(customerName + '|' + expiryDate + SECRET_KEY);
        if (signature !== expectedSignature) return null;
        return { customerName, expiryDate, valid: true };
    } catch (err) {
        return null;
    }
}

function loadLicense() {
    try {
        const data = localStorage.getItem('mizan_license');
        return data ? JSON.parse(data) : null;
    } catch (err) {
        return null;
    }
}

function saveLicense(data) {
    localStorage.setItem('mizan_license', JSON.stringify(data));
}

function isLicenseValid() {
    const license = loadLicense();
    if (!license || !license.licenseKey) return false;
    const decoded = decodeLicenseKey(license.licenseKey);
    if (!decoded) return false;
    return new Date(decoded.expiryDate) >= new Date();
}

function activateDemoLicense() {
    if (!localStorage.getItem('mizan_demo_activated')) {
        const decoded = decodeLicenseKey(DEMO_LICENSE_KEY);
        if (decoded) {
            saveLicense({
                licenseKey: DEMO_LICENSE_KEY,
                customerName: decoded.customerName,
                expiryDate: decoded.expiryDate,
                activatedAt: new Date().toISOString()
            });
            localStorage.setItem('mizan_demo_activated', 'true');
        }
    }
}

function updateLicenseUI() {
    const valid = isLicenseValid();
    const license = loadLicense();
    const statusEl = document.getElementById('licenseStatusDisplay');
    const expiryEl = document.getElementById('licenseExpiryDisplay');
    const daysEl = document.getElementById('licenseDaysLeft');

    if (statusEl) {
        statusEl.textContent = valid ? '✅ نشط' : '⛔ منتهي';
        statusEl.style.color = valid ? '#2D8F5E' : '#E06060';
    }
    if (expiryEl && license?.expiryDate) {
        expiryEl.textContent = new Date(license.expiryDate).toLocaleDateString('ar');
    }
    if (daysEl) {
        const days = license?.expiryDate ? Math.ceil((new Date(license.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : -1;
        daysEl.textContent = days >= 0 ? days + ' يوم' : '-';
        daysEl.style.color = days >= 0 && days <= 7 ? '#E06060' : '#2D8F5E';
    }
}

function activateLicense() {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه التفعيل', 'error');
        return;
    }
    const key = document.getElementById('licenseKeyInput')?.value?.trim();
    if (!key) {
        showToast('⚠️ أدخل مفتاح الترخيص', 'error');
        return;
    }
    const decoded = decodeLicenseKey(key);
    if (!decoded) {
        showToast('❌ مفتاح غير صالح', 'error');
        return;
    }
    saveLicense({
        licenseKey: key,
        customerName: decoded.customerName,
        expiryDate: decoded.expiryDate,
        activatedAt: new Date().toISOString()
    });
    updateLicenseUI();
    showToast('✅ تم التفعيل', 'success');
}

function checkLicenseStatus() {
    updateLicenseUI();
    showToast(isLicenseValid() ? '✅ الترخيص نشط' : '⛔ الترخيص منتهي', isLicenseValid() ? 'success' : 'error');
}

function updateLicensePrice() {
    const days = parseInt(document.getElementById('licenseDays')?.value) || 365;
    const amount = LICENSE_PRICES[days] || 3000;
    const amountEl = document.getElementById('licenseAmount');
    if (amountEl) amountEl.value = amount;
}

function generateNewLicense() {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه التوليد', 'error');
        return;
    }

    const customerName = document.getElementById('licenseCustomerName')?.value?.trim();
    const days = parseInt(document.getElementById('licenseDays')?.value) || 365;
    const amount = parseInt(document.getElementById('licenseAmount')?.value) || 3000;

    if (!customerName) {
        showToast('⚠️ أدخل اسم العميل', 'error');
        return;
    }

    const random = Math.random().toString(36).substring(2, 12).toUpperCase();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    const expiryStr = expiryDate.toISOString().split('T')[0];

    const keyData = customerName + '|' + expiryStr + '|' + random;
    const licenseKey = btoa(keyData);

    const genData = {
        id: Date.now(),
        customerName: customerName,
        expiryDate: expiryStr,
        days: days,
        amount: amount,
        key: licenseKey,
        created: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem('mizan_generated_keys') || '[]');
    existing.unshift(genData);
    localStorage.setItem('mizan_generated_keys', JSON.stringify(existing));

    const resultDiv = document.getElementById('licenseResult');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        document.getElementById('genCustomer').textContent = customerName;
        document.getElementById('genDays').textContent = days + ' يوم';
        document.getElementById('genAmount').textContent = amount + ' جنيه';
        document.getElementById('genExpiry').textContent = expiryStr;
        document.getElementById('genKey').textContent = licenseKey;
    }

    renderGeneratedKeys();
    showToast('✅ تم توليد مفتاح للعميل ' + customerName + ' - ' + amount + ' جنيه', 'success');
    addAuditLog('add', 'license', 'توليد مفتاح للعميل: ' + customerName + ' - ' + amount + ' جنيه');
}

function copyLicenseKey() {
    const keyText = document.getElementById('genKey')?.textContent;
    if (!keyText) {
        showToast('⚠️ لا يوجد مفتاح للنسخ', 'error');
        return;
    }
    copyToClipboard(keyText);
}

function renderGeneratedKeys() {
    const container = document.getElementById('generatedKeysList');
    if (!container) return;

    const keys = JSON.parse(localStorage.getItem('mizan_generated_keys') || '[]');
    if (keys.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-key"></i><span>لا توجد مفاتيح</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 0.8fr 1.2fr;">
        <span>العميل</span><span>المدة</span><span>المبلغ</span><span>تاريخ الانتهاء</span>
    </div>`;

    for (let i = 0; i < keys.length && i < 20; i++) {
        const k = keys[i];
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 0.8fr 1.2fr;font-size:12px;">
                <span><strong>${k.customerName}</strong></span>
                <span>${k.days || 365} يوم</span>
                <span style="color:#2D8F5E;font-weight:700;">${k.amount || 3000}</span>
                <span>${k.expiryDate}</span>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ================================================================
// COUNT VERSION CLICKS
// ================================================================

function countVersionClicks() {
    if (!isAdmin()) {
        showToast('⚠️ فقط المدير يمكنه توليد المفاتيح', 'warning');
        return;
    }

    versionClickCount = (versionClickCount || 0) + 1;
    console.log(`🔑 عدد الضغطات: ${versionClickCount}/5`);

    if (versionClickCount >= 5) {
        const btn = document.getElementById('licenseGeneratorHiddenBtn');
        if (btn) {
            btn.style.display = 'block';
            btn.style.animation = 'pulse 1s infinite';
            showToast('🔑 تم تفعيل زر توليد المفاتيح!', 'success');

            setTimeout(() => {
                versionClickCount = 0;
                if (btn) {
                    btn.style.display = 'none';
                    btn.style.animation = 'none';
                }
            }, 30000);
        } else {
            showToast('⚠️ حدث خطأ: الزر غير موجود', 'error');
        }
    } else {
        const remaining = 5 - versionClickCount;
        showToast(`🔑 ${remaining} ضغطات متبقية لإظهار زر التوليد`, 'info');
    }
}

// ================================================================
// KEYBOARD SHORTCUTS
// ================================================================

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (typeof closeMorePanel === 'function') closeMorePanel();
    }
    if (e.key === 'Enter' && !document.getElementById('loginContainer').classList.contains('hidden')) {
        checkLogin();
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (typeof saveAll === 'function') saveAll();
        showToast('💾 تم الحفظ', 'success');
    }
});

// ================================================================
// AUTO SAVE
// ================================================================

setInterval(() => {
    if (document.getElementById('appContent').style.display !== 'none') {
        if (typeof saveAll === 'function') saveAll();
        updateClock();
    }
}, 30000);

window.addEventListener('beforeunload', function() {
    if (typeof saveAll === 'function') saveAll();
});

// ================================================================
// WHATSAPP FUNCTIONS
// ================================================================

function updateCustomerWhatsApp() {
    const select = document.getElementById('salesCustomerSelect');
    const input = document.getElementById('salesCustomer');
    const whatsappInput = document.getElementById('customerWhatsApp');
    const group = document.getElementById('customerWhatsAppGroup');
    if (!select || !input || !whatsappInput || !group) return;

    const selectedName = select.value || input.value;
    if (selectedName) {
        const customer = window.customers ? window.customers.find(c => c.name === selectedName) : null;
        if (customer?.whatsapp) {
            whatsappInput.value = customer.whatsapp;
            group.style.display = 'block';
        } else if (customer?.phone) {
            whatsappInput.value = customer.phone;
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
        }
    } else {
        group.style.display = 'none';
    }
}

function updateCustomerWhatsAppManual() {
    updateCustomerWhatsApp();
}

function updateSupplierWhatsApp() {
    const select = document.getElementById('purchaseSupplierSelect');
    const input = document.getElementById('purchaseSupplier');
    const whatsappInput = document.getElementById('supplierWhatsApp');
    const group = document.getElementById('supplierWhatsAppGroup');
    if (!select || !input || !whatsappInput || !group) return;

    const selectedName = select.value || input.value;
    if (selectedName) {
        const supplier = window.suppliers ? window.suppliers.find(s => s.name === selectedName) : null;
        if (supplier?.whatsapp) {
            whatsappInput.value = supplier.whatsapp;
            group.style.display = 'block';
        } else if (supplier?.phone) {
            whatsappInput.value = supplier.phone;
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
        }
    } else {
        group.style.display = 'none';
    }
}

function updateSupplierWhatsAppManual() {
    updateSupplierWhatsApp();
}

function sendWhatsApp() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const customer = document.getElementById('salesCustomer')?.value?.trim() ||
        document.getElementById('salesCustomerSelect')?.value;
    if (!customer) {
        showToast('⚠️ حدد عميلاً أولاً', 'error');
        return;
    }

    if (typeof window.salesItems === 'undefined' || window.salesItems.length === 0) {
        showToast('⚠️ أضف أصنافاً أولاً', 'error');
        return;
    }

    let whatsappNumber = document.getElementById('customerWhatsApp')?.value?.trim();
    if (!whatsappNumber) {
        const customerObj = window.customers ? window.customers.find(c => c.name === customer) : null;
        if (customerObj?.whatsapp) {
            whatsappNumber = customerObj.whatsapp;
        } else if (customerObj?.phone) {
            whatsappNumber = customerObj.phone;
        } else {
            whatsappNumber = '01011993799';
        }
    }

    whatsappNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (!whatsappNumber.startsWith('20')) {
        whatsappNumber = '20' + whatsappNumber;
    }

    const total = window.salesItems.reduce((s, item) => s + (item.total || 0), 0);
    const payment = getSelectedPayment('sales');
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const company = window.companyData || {};
    const isTax = invoiceType === 'tax';
    const taxRate = 14;
    const taxAmount = isTax ? (total * taxRate) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;
    const dt = getCurrentDateTime();

    let message = `╔══════════════════════════════════╗\n` +
        `║           🏢 ${company.name || 'الميزان'}        ║\n` +
        `║    نظام محاسبة ونقاط بيع         ║\n` +
        `╠══════════════════════════════════╣\n` +
        `║ 📍 ${(company.address || 'القاهرة، مصر').padEnd(28)}║\n` +
        `║ 📞 ${(company.phone || '0234567890').padEnd(28)}║\n` +
        `║ 📱 ${(company.mobile || '01000000000').padEnd(28)}║\n` +
        `╠══════════════════════════════════╣\n` +
        `║ 📅 ${dt.date}  🕐 ${dt.time}                 ║\n`;

    if (isTax) {
        message += `║ 🆔 الرقم الضريبي: ${(company.taxNumber || 'غير مسجل').padEnd(22)}║\n` +
            `║ 📋 السجل التجاري: ${(company.commercialRegister || 'غير مسجل').padEnd(20)}║\n`;
    }

    message += `╠══════════════════════════════════╣\n` +
        `║ 🧾 فاتورة ${isTax ? 'ضريبية' : 'عادية'.padEnd(24)}║\n` +
        `║ 👤 العميل: ${customer.padEnd(26)}║\n` +
        `║ 💳 الدفع: ${payment.padEnd(27)}║\n` +
        `╠══════════════════════════════════╣\n` +
        `║ # │ المنتج    │ العدد │ السعر │\n` +
        `╠══════════════════════════════════╣\n`;

    window.salesItems.forEach((item, i) => {
        const name = item.productName.length > 10 ? item.productName.substring(0, 10) + '..' : item.productName;
        message += `║ ${(i + 1).toString().padStart(1)} │ ${name.padEnd(10)} │ ${item.qty.toString().padStart(4)} │ ${item.price.toFixed(0).padStart(5)} │\n`;
        message += `║   │ الإجمالي  │      │ ${item.total.toFixed(2).padStart(5)} │\n`;
    });

    message += `╠══════════════════════════════════╣\n` +
        `║ 💰 الإجمالي: ${total.toFixed(2).padStart(20)} 🇪🇬 ║\n`;

    if (isTax) {
        message += `║ 📊 الضريبة (14%): ${taxAmount.toFixed(2).padStart(19)} ║\n` +
            `║ 💰 الإجمالي مع الضريبة: ${totalWithTax.toFixed(2).padStart(14)} ║\n`;
    }

    message += `╠══════════════════════════════════╣\n` +
        `║ خالص مع الشكر                    ║\n`;

    if (company.vodafone) message += `║ 📱 فودافون كاش: ${company.vodafone.padEnd(20)}║\n`;
    if (company.instapay) message += `║ 📲 إنستاباي: ${company.instapay.padEnd(20)}║\n`;
    if (company.bankAccount) message += `║ 🏦 بنك: ${company.bankAccount.padEnd(22)}║\n`;
    if (company.cash) message += `║ 💰 كاش: ${company.cash.padEnd(23)}║\n`;
    if (company.paymentEmail) message += `║ 📧 ${company.paymentEmail.padEnd(24)}║\n`;

    message += `╚══════════════════════════════════╝`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    window.open(url, '_blank');

    if (typeof addAuditLog === 'function') {
        addAuditLog('sale', 'whatsapp', `إرسال فاتورة واتساب للعميل: ${customer} - رقم: ${whatsappNumber}`);
    }
    showToast(`📱 تم فتح واتساب للعميل ${customer}`, 'success');
}

function printInvoice(type) {
    const company = window.companyData || {};
    const dt = getCurrentDateTime();
    let html = '';

    if (type === 'sales') {
        const customer = document.getElementById('salesCustomer')?.value?.trim() ||
            document.getElementById('salesCustomerSelect')?.value || 'عميل';
        const total = window.salesItems ? window.salesItems.reduce((s, item) => s + (item.total || 0), 0) : 0;
        const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
        const isTax = invoiceType === 'tax';
        const taxAmount = isTax ? (total * 14) / 100 : 0;
        const totalWithTax = isTax ? total + taxAmount : total;
        const items = window.salesItems || [];

        html = `
            <div class="invoice-print-boxed">
                <div class="company-header">
                    <h2>${company.name || 'الميزان'}</h2>
                    <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                    <div class="contact-info">📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'} | 📱 ${company.mobile || '01000000000'}</div>
                </div>
                <div class="invoice-info">
                    <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${dt.date}</span></div>
                    <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${dt.time}</span></div>
                </div>
                <div class="customer-info">
                    <span class="label">👤 العميل:</span> ${customer}
                </div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>المنتج</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${item.productName}</td>
                                <td>${item.qty}</td>
                                <td>${item.price.toFixed(2)}</td>
                                <td>${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total-box">
                    <div>💵 الإجمالي: <span class="total-amount">${total.toFixed(2)} 🇪🇬</span></div>
                    ${isTax ? `<div>📊 الضريبة (14%): <span class="total-amount">${taxAmount.toFixed(2)} 🇪🇬</span></div>` : ''}
                    ${isTax ? `<div>💰 الإجمالي مع الضريبة: <span class="total-amount">${totalWithTax.toFixed(2)} 🇪🇬</span></div>` : ''}
                </div>
                <div class="footer-box">
                    <div class="thanks">خالص مع الشكر</div>
                    <div style="margin-top:4px;font-size:9px;color:#5D5D5D;">تم الطباعة في ${new Date().toLocaleString('ar')}</div>
                </div>
            </div>
        `;
    }

    const win = window.open('', '_blank', 'width=400,height=650');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة', 'error');
    }
}

// ================================================================
// ADD AUDIT LOG
// ================================================================

function addAuditLog(action, type, details) {
    if (typeof window.auditLog === 'undefined') {
        window.auditLog = [];
    }
    window.auditLog.unshift({
        id: Date.now(),
        action: action,
        type: type,
        details: details,
        date: new Date().toISOString(),
        user: currentUser?.username || 'admin'
    });
    if (window.auditLog.length > 500) window.auditLog = window.auditLog.slice(0, 500);
    if (typeof setData === 'function') {
        setData('auditLog', window.auditLog);
    } else {
        localStorage.setItem('mizan_auditLog', JSON.stringify(window.auditLog));
    }
    if (typeof renderAudit === 'function') renderAudit();
}

// ================================================================
// SETTINGS FUNCTIONS
// ================================================================

function updateSettingsUI() {
    safeSetText('infoProducts', (window.products || []).length);
    safeSetText('infoCustomers', (window.customers || []).length);
    safeSetText('infoSuppliers', (window.suppliers || []).length);
    safeSetText('infoWarehouses', (window.warehouses || []).length);
    safeSetText('infoInvoices', (window.sales || []).length + (window.purchases || []).length + (window.returns || []).length);
    updateLicenseUI();
}

function changePasswordSettings() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const oldEl = document.getElementById('oldPassword');
    const newEl = document.getElementById('newPassword');
    const confirmEl = document.getElementById('confirmPassword');

    if (!oldEl || !newEl || !confirmEl) return;
    const old = oldEl.value;
    const newPwd = newEl.value;
    const confirm = confirmEl.value;

    if (old !== currentPassword && old !== DEFAULT_PASSWORD) {
        showToast('❌ كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }
    if (newPwd.length < 4) { showToast('❌ 4 أحرف على الأقل', 'error'); return; }
    if (newPwd !== confirm) { showToast('❌ غير مطابقة', 'error'); return; }

    currentPassword = newPwd;
    localStorage.setItem('app_password', newPwd);
    addAuditLog('edit', 'settings', 'تغيير كلمة المرور');

    oldEl.value = '';
    newEl.value = '';
    confirmEl.value = '';

    showToast('✅ تم التغيير', 'success');
}

function clearAllData() {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟')) return;

    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'
    ];
    for (let i = 0; i < keys.length; i++) {
        localStorage.removeItem('mizan_' + keys[i]);
        if (keys[i] === 'products') window.products = [];
        else if (keys[i] === 'customers') window.customers = [];
        else if (keys[i] === 'suppliers') window.suppliers = [];
        else if (keys[i] === 'purchases') window.purchases = [];
        else if (keys[i] === 'sales') window.sales = [];
        else if (keys[i] === 'returns') window.returns = [];
        else if (keys[i] === 'expenses') window.expenses = [];
        else if (keys[i] === 'treasury') window.treasury = [];
        else if (keys[i] === 'bonds') window.bonds = [];
        else if (keys[i] === 'warehouses') window.warehouses = [];
        else if (keys[i] === 'warehouseProducts') window.warehouseProducts = [];
        else if (keys[i] === 'permissions') window.permissions = [];
        else if (keys[i] === 'companyData') window.companyData = {};
        else if (keys[i] === 'backups') window.backups = [];
        else if (keys[i] === 'accounts') window.accounts = [];
        else if (keys[i] === 'auditLog') window.auditLog = [];
        else if (keys[i] === 'alerts') window.alerts = [];
        else if (keys[i] === 'cashierHistory') window.cashierHistory = [];
        else if (keys[i] === 'inventoryAdjustments') window.inventoryAdjustments = [];
    }

    addAuditLog('delete', 'all', 'مسح جميع البيانات');
    refreshAllPages();
    showToast('🗑️ تم مسح جميع البيانات', 'warning');
}

// ================================================================
// POPULATE ALL SELECTS
// ================================================================

function populateAllSelects() {
    populateWarehouseSelects();
    populateProductSelects();
    populateCustomerSelects();
    populateSupplierSelects();
    populatePermissionSelects();
    populateCustomerStatement();
    populateSupplierStatement();
    populateBondCustomers();
    populateAccountParents();
    populateAdjustmentProducts();
    populateUsersSelect();
}

function populateWarehouseSelects() {
    const ids = ['productWarehouse', 'salesWarehouse', 'purchaseWarehouse', 'returnWarehouse', 'treasuryWarehouse'];
    for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (el) {
            el.innerHTML = '<option value="">اختر مخزن...</option>';
            if (window.warehouses) {
                window.warehouses.forEach(w => {
                    el.innerHTML += `<option value="${w.id}">${w.name} (${w.type})</option>`;
                });
            }
        }
    }
}

function populateProductSelects() {
    const ids = ['salesItemProduct', 'purchaseItemProduct', 'returnItemProduct', 'permissionProduct'];
    for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (el) {
            el.innerHTML = '<option value="">اختر منتج...</option>';
            if (window.products) {
                window.products.forEach(p => {
                    el.innerHTML += `<option value="${p.id}">${p.name}${p.barcode ? ' 🏷️' + p.barcode : ''}</option>`;
                });
            }
        }
    }
}

function populateCustomerSelects() {
    const ids = ['salesCustomerSelect', 'returnCustomerSelect'];
    for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (el) {
            el.innerHTML = '<option value="">اختر عميل...</option>';
            if (window.customers) {
                window.customers.forEach(c => {
                    el.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                });
            }
        }
    }
}

function populateSupplierSelects() {
    const el = document.getElementById('purchaseSupplierSelect');
    if (el) {
        el.innerHTML = '<option value="">اختر مورد...</option>';
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                el.innerHTML += `<option value="${s.name}">${s.name}</option>`;
            });
        }
    }
}

function populatePermissionSelects() {
    const ids = ['permissionFrom', 'permissionTo'];
    for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (el) {
            el.innerHTML = '<option value="">اختر مخزن...</option>';
            if (window.warehouses) {
                window.warehouses.forEach(w => {
                    el.innerHTML += `<option value="${w.id}">${w.name} (${w.type})</option>`;
                });
            }
        }
    }
}

function populateCustomerStatement() {
    const el = document.getElementById('statementCustomerSelect');
    if (el) {
        el.innerHTML = '<option value="">اختر عميل...</option>';
        if (window.customers) {
            window.customers.forEach(c => {
                el.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
        const today = getTodayDate();
        const from = new Date();
        from.setMonth(from.getMonth() - 1);
        const fromInput = document.getElementById('statementFrom');
        const toInput = document.getElementById('statementTo');
        if (fromInput && !fromInput.value) fromInput.value = from.toISOString().split('T')[0];
        if (toInput && !toInput.value) toInput.value = today;
    }
}

function populateSupplierStatement() {
    const el = document.getElementById('statementSupplierSelect');
    if (el) {
        el.innerHTML = '<option value="">اختر مورد...</option>';
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                el.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
        const today = getTodayDate();
        const from = new Date();
        from.setMonth(from.getMonth() - 1);
        const fromInput = document.getElementById('statementSupplierFrom');
        const toInput = document.getElementById('statementSupplierTo');
        if (fromInput && !fromInput.value) fromInput.value = from.toISOString().split('T')[0];
        if (toInput && !toInput.value) toInput.value = today;
    }
}

function populateBondCustomers() {
    const el = document.getElementById('bondCustomer');
    if (el) {
        el.innerHTML = '<option value="">اختر...</option>';
        if (window.customers) {
            window.customers.forEach(c => {
                el.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                el.innerHTML += `<option value="s_${s.id}">${s.name} (مورد)</option>`;
            });
        }
    }
}

function populateAccountParents() {
    const el = document.getElementById('accountParent');
    if (el) {
        el.innerHTML = '<option value="">لا يوجد</option>';
        if (window.accounts) {
            window.accounts.forEach(a => {
                el.innerHTML += `<option value="${a.id}">${a.name}</option>`;
            });
        }
    }
}

function populateAdjustmentProducts() {
    const el = document.getElementById('adjustmentProduct');
    if (el) {
        el.innerHTML = '<option value="">اختر منتج...</option>';
        if (window.products && window.warehouseProducts) {
            window.products.forEach(p => {
                let total = 0;
                window.warehouseProducts.forEach(wp => {
                    if (wp.productId === p.id) total += wp.qty;
                });
                el.innerHTML += `<option value="${p.id}">${p.name} (${total})</option>`;
            });
        }
    }
}

function populateUsersSelect() {
    const el = document.getElementById('switchUserSelect');
    if (el) {
        el.innerHTML = '<option value="">اختر مستخدم...</option>';
        if (window.users) {
            const roles = { admin: 'مدير', manager: 'مشرف', cashier: 'كاشير', viewer: 'مشاهد' };
            window.users.forEach(u => {
                el.innerHTML += `<option value="${u.id}">${u.username} (${roles[u.role] || u.role})</option>`;
            });
        }
        if (currentUser) {
            const current = window.users ? window.users.find(u => u.username === currentUser.username) : null;
            if (current) el.value = current.id;
        }
    }
}

// ================================================================
// ===== دوال الفواتير والمبيعات (المضافة) =====
// ================================================================

// ================================================================
// RENDER SALES - عرض فواتير البيع
// ================================================================
function renderSales() {
    const container = document.getElementById('salesList');
    if (!container) return;

    if (!window.sales || window.sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;">
        <span>رقم</span><span>العميل</span><span>المبلغ</span><span>التاريخ</span><span>الحالة</span><span>الدفع</span><span></span>
    </div>`;

    window.sales.slice().reverse().forEach(s => {
        const total = s.totalWithTax || s.total || 0;
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span><strong>#${s.number || s.id}</strong></span>
                <span>${s.customer || 'عميل'}</span>
                <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                <span>${s.date || '-'}</span>
                <span><span class="status-badge ${s.status === 'paid' ? 'active' : 'inactive'}">${s.status === 'paid' ? 'مدفوع' : 'معلق'}</span></span>
                <span>${s.paymentMethod || 'نقدي'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewSaleInvoice(${s.id})"><i class="fas fa-eye"></i></button>
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteSaleInvoice(${s.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// RENDER ALL PURCHASES - عرض فواتير الشراء
// ================================================================
function renderAllPurchases() {
    const container = document.getElementById('purchaseList');
    if (!container) return;

    if (!window.purchases || window.purchases.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;">
        <span>رقم</span><span>المورد</span><span>المبلغ</span><span>التاريخ</span><span>الحالة</span><span>الدفع</span><span></span>
    </div>`;

    window.purchases.slice().reverse().forEach(p => {
        const total = p.totalWithTax || p.total || 0;
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span><strong>#${p.number || p.id}</strong></span>
                <span>${p.supplier || 'مورد'}</span>
                <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                <span>${p.date || '-'}</span>
                <span><span class="status-badge ${p.status === 'paid' ? 'active' : 'inactive'}">${p.status === 'paid' ? 'مدفوع' : 'معلق'}</span></span>
                <span>${p.paymentMethod || 'نقدي'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewPurchaseInvoice(${p.id})"><i class="fas fa-eye"></i></button>
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deletePurchaseInvoice(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// RENDER ALL RETURNS - عرض المرتجعات
// ================================================================
function renderAllReturns() {
    const container = document.getElementById('returnList');
    if (!container) return;

    if (!window.returns || window.returns.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.8fr 0.6fr;">
        <span>رقم</span><span>العميل</span><span>المبلغ</span><span>التاريخ</span><span>السبب</span><span></span>
    </div>`;

    window.returns.slice().reverse().forEach(r => {
        const total = r.total || 0;
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.8fr 0.6fr;font-size:11px;">
                <span><strong>#${r.number || r.id}</strong></span>
                <span>${r.customer || 'عميل'}</span>
                <span style="color:#E6A830;font-weight:700;">${total.toFixed(2)}</span>
                <span>${r.date || '-'}</span>
                <span>${r.reason || '-'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewReturnInvoice(${r.id})"><i class="fas fa-eye"></i></button>
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteReturnInvoice(${r.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// RENDER ALL INVOICES - عرض جميع الفواتير
// ================================================================
function renderAllInvoices() {
    const container = document.getElementById('allInvoicesList');
    if (!container) return;

    const allInvoices = [];
    
    if (window.sales) {
        window.sales.forEach(s => {
            allInvoices.push({ ...s, type: 'بيع', typeColor: '#2D8F5E' });
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            allInvoices.push({ ...p, type: 'شراء', typeColor: '#E06060' });
        });
    }
    
    if (window.returns) {
        window.returns.forEach(r => {
            allInvoices.push({ ...r, type: 'مرتجع', typeColor: '#E6A830' });
        });
    }

    allInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));

    safeSetText('allInvoicesCount', allInvoices.length);
    safeSetText('invoicesSalesCount', (window.sales || []).length);
    safeSetText('invoicesPurchasesCount', (window.purchases || []).length);

    if (allInvoices.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:0.6fr 1.5fr 0.8fr 1fr 0.8fr 0.6fr;">
        <span>#</span><span>العميل/المورد</span><span>المبلغ</span><span>التاريخ</span><span>النوع</span><span></span>
    </div>`;

    allInvoices.slice(0, 50).forEach(inv => {
        const total = inv.totalWithTax || inv.total || 0;
        html += `
            <div class="table-row" style="grid-template-columns:0.6fr 1.5fr 0.8fr 1fr 0.8fr 0.6fr;font-size:11px;">
                <span><strong>#${inv.number || inv.id}</strong></span>
                <span>${inv.customer || inv.supplier || 'غير محدد'}</span>
                <span style="color:${inv.typeColor};font-weight:700;">${total.toFixed(2)}</span>
                <span>${inv.date || '-'}</span>
                <span style="color:${inv.typeColor};font-weight:700;">${inv.type}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewInvoice('${inv.id}', '${inv.type}')"><i class="fas fa-eye"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// PERMISSIONS FUNCTIONS - إذونات المخازن
// ================================================================
function renderPermissions() {
    const container = document.getElementById('permissionList');
    if (!container) return;

    if (!window.permissions || window.permissions.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد إذونات</span></div>`;
        return;
    }

    const statusLabels = {
        pending: '⏳ معلق',
        executed: '✅ منفذ',
        cancelled: '❌ ملغي'
    };
    const statusColors = {
        pending: '#E6A830',
        executed: '#2D8F5E',
        cancelled: '#E06060'
    };

    let html = `<div class="table-header" style="grid-template-columns:0.8fr 1fr 0.8fr 1fr 0.8fr 0.6fr;">
        <span>النوع</span><span>المنتج</span><span>الكمية</span><span>التاريخ</span><span>الحالة</span><span></span>
    </div>`;

    window.permissions.slice().reverse().forEach(p => {
        const product = (window.products || []).find(pr => pr.id === p.productId);
        html += `
            <div class="table-row" style="grid-template-columns:0.8fr 1fr 0.8fr 1fr 0.8fr 0.6fr;font-size:11px;">
                <span>${p.type === 'transfer' ? 'تحويل' : p.type === 'withdraw' ? 'صرف' : p.type === 'add' ? 'إضافة' : p.type}</span>
                <span>${product ? product.name : 'منتج غير معروف'}</span>
                <span>${p.qty || 0}</span>
                <span>${p.date || '-'}</span>
                <span style="color:${statusColors[p.status] || '#A89070'};font-weight:700;">${statusLabels[p.status] || p.status}</span>
                <div class="actions">
                    ${p.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="executePermission(${p.id})"><i class="fas fa-check"></i></button>` : ''}
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deletePermission(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function addPermission() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    
    const type = document.getElementById('permissionType')?.value || 'transfer';
    const fromWarehouse = parseInt(document.getElementById('permissionFrom')?.value);
    const toWarehouse = parseInt(document.getElementById('permissionTo')?.value);
    const productId = parseInt(document.getElementById('permissionProduct')?.value);
    const qty = parseInt(document.getElementById('permissionQty')?.value) || 1;
    const date = document.getElementById('permissionDate')?.value || getTodayDate();
    const note = document.getElementById('permissionNote')?.value?.trim() || '';

    if (!productId) { showToast('⚠️ اختر منتجاً', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ الكمية يجب أن تكون أكبر من 0', 'error'); return; }

    if (!window.permissions) window.permissions = [];

    window.permissions.push({
        id: Date.now(),
        type: type,
        fromWarehouse: fromWarehouse,
        toWarehouse: toWarehouse,
        productId: productId,
        qty: qty,
        date: date,
        note: note,
        status: 'pending',
        createdAt: new Date().toISOString()
    });

    saveAll();
    addAuditLog('add', 'permission', `إضافة إذن ${type} - الكمية: ${qty}`);
    renderPermissions();
    showToast('✅ تم إضافة الإذن', 'success');
}

function executePermission(id) {
    const p = window.permissions.find(perm => perm.id === id);
    if (!p) { showToast('⚠️ الإذن غير موجود', 'error'); return; }
    
    if (p.status === 'executed') {
        showToast('⚠️ الإذن منفذ بالفعل', 'warning');
        return;
    }

    // تنفيذ الإذن
    if (p.type === 'transfer') {
        // تحويل من مخزن إلى آخر
        const fromWP = window.warehouseProducts.find(wp => wp.warehouseId === p.fromWarehouse && wp.productId === p.productId);
        const toWP = window.warehouseProducts.find(wp => wp.warehouseId === p.toWarehouse && wp.productId === p.productId);
        
        if (fromWP) {
            if (fromWP.qty < p.qty) {
                showToast('⚠️ الكمية غير متوفرة في المخزن المصدر', 'error');
                return;
            }
            fromWP.qty -= p.qty;
        } else {
            showToast('⚠️ المنتج غير موجود في المخزن المصدر', 'error');
            return;
        }
        
        if (toWP) {
            toWP.qty += p.qty;
        } else {
            window.warehouseProducts.push({
                warehouseId: p.toWarehouse,
                productId: p.productId,
                qty: p.qty
            });
        }
    } else if (p.type === 'withdraw') {
        // صرف من مخزن
        const wp = window.warehouseProducts.find(w => w.warehouseId === p.fromWarehouse && w.productId === p.productId);
        if (wp) {
            if (wp.qty < p.qty) {
                showToast('⚠️ الكمية غير متوفرة', 'error');
                return;
            }
            wp.qty -= p.qty;
        } else {
            showToast('⚠️ المنتج غير موجود في المخزن', 'error');
            return;
        }
    } else if (p.type === 'add') {
        // إضافة إلى مخزن
        const wp = window.warehouseProducts.find(w => w.warehouseId === p.toWarehouse && w.productId === p.productId);
        if (wp) {
            wp.qty += p.qty;
        } else {
            window.warehouseProducts.push({
                warehouseId: p.toWarehouse,
                productId: p.productId,
                qty: p.qty
            });
        }
    }

    p.status = 'executed';
    p.executedAt = new Date().toISOString();
    
    saveAll();
    addAuditLog('edit', 'permission', `تنفيذ إذن ${p.type} - الكمية: ${p.qty}`);
    renderPermissions();
    renderProducts();
    showToast('✅ تم تنفيذ الإذن بنجاح', 'success');
}

function deletePermission(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الإذن؟')) return;
    
    window.permissions = window.permissions.filter(p => p.id !== id);
    saveAll();
    renderPermissions();
    showToast('🗑️ تم الحذف', 'info');
}

function filterPermissions(filter) {
    // منطق التصفية - يمكن تنفيذها حسب الحاجة
    renderPermissions();
}

// ================================================================
// ACCOUNTING FUNCTIONS - المحاسبات
// ================================================================
function updateAccounting() {
    const totalSales = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
    const totalPurchases = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
    const profit = totalSales - totalPurchases;
    
    safeSetText('accountingSales', totalSales.toFixed(2));
    safeSetText('accountingPurchases', totalPurchases.toFixed(2));
    safeSetText('accountingProfit', profit.toFixed(2));
}

function showLedger() {
    const html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;">📒 دفتر الأستاذ</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value">${(window.sales || []).reduce((s, i) => s + (i.total || 0), 0).toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value">${(window.purchases || []).reduce((s, i) => s + (i.total || 0), 0).toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${(window.sales || []).length + (window.purchases || []).length}</span></div>
        </div>
    `;
    document.getElementById('accountingResult').innerHTML = html;
}

function showAudit() { showLedger(); }
function showTrialBalance() { showLedger(); }
function showIncomeStatement() { showLedger(); }
function showBalanceSheet() { showLedger(); }
function showCashFlow() { showLedger(); }

// ================================================================
// VIEW FUNCTIONS - عرض التفاصيل
// ================================================================
function viewSaleInvoice(id) {
    const inv = (window.sales || []).find(s => s.id === id);
    if (!inv) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }
    showToast(`📄 فاتورة بيع #${inv.number || inv.id} - ${(inv.total || 0).toFixed(2)}`, 'info');
}

function viewPurchaseInvoice(id) {
    const inv = (window.purchases || []).find(p => p.id === id);
    if (!inv) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }
    showToast(`📄 فاتورة شراء #${inv.number || inv.id} - ${(inv.total || 0).toFixed(2)}`, 'info');
}

function viewReturnInvoice(id) {
    const inv = (window.returns || []).find(r => r.id === id);
    if (!inv) { showToast('⚠️ المرتجع غير موجود', 'error'); return; }
    showToast(`📄 مرتجع #${inv.number || inv.id} - ${(inv.total || 0).toFixed(2)}`, 'info');
}

function viewInvoice(id, type) {
    if (type === 'بيع') {
        viewSaleInvoice(parseInt(id));
    } else if (type === 'شراء') {
        viewPurchaseInvoice(parseInt(id));
    } else {
        viewReturnInvoice(parseInt(id));
    }
}

function deleteSaleInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة؟')) return;
    window.sales = (window.sales || []).filter(s => s.id !== id);
    saveAll();
    renderSales();
    renderAllInvoices();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

function deletePurchaseInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة؟')) return;
    window.purchases = (window.purchases || []).filter(p => p.id !== id);
    saveAll();
    renderAllPurchases();
    renderAllInvoices();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

function deleteReturnInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المرتجع؟')) return;
    window.returns = (window.returns || []).filter(r => r.id !== id);
    saveAll();
    renderAllReturns();
    renderAllInvoices();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ================================================================
// REPORT FUNCTIONS - التقارير
// ================================================================
function generateReport(type) {
    const result = document.getElementById('reportResult');
    if (!result) return;
    
    let html = `<div class="accounting-detail-content">`;
    
    if (type === 'sales') {
        const total = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
        html += `
            <h4 style="color:#2D8F5E;">📊 تقرير المبيعات</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${(window.sales || []).length}</span></div>
        `;
    } else if (type === 'purchases') {
        const total = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
        html += `
            <h4 style="color:#E06060;">📊 تقرير المشتريات</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${(window.purchases || []).length}</span></div>
        `;
    } else if (type === 'profit') {
        const sales = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
        const purchases = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
        const profit = sales - purchases;
        html += `
            <h4 style="color:#C9A94E;">📊 تقرير الأرباح</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value">${sales.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value">${purchases.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">صافي الربح</span><span class="detail-value" style="color:${profit >= 0 ? '#2D8F5E' : '#E06060'};">${profit.toFixed(2)}</span></div>
        `;
    } else if (type === 'inventory') {
        let totalValue = 0;
        if (window.products && window.warehouseProducts) {
            window.products.forEach(p => {
                const qty = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0);
                totalValue += p.sellPrice * qty;
            });
        }
        html += `
            <h4 style="color:#4A8AB5;">📊 تقرير المخزون</h4>
            <div class="detail-row"><span class="detail-label">عدد المنتجات</span><span class="detail-value">${(window.products || []).length}</span></div>
            <div class="detail-row"><span class="detail-label">قيمة المخزون</span><span class="detail-value">${totalValue.toFixed(2)}</span></div>
        `;
    } else {
        html += `
            <h4 style="color:#C9A94E;">📊 تقرير</h4>
            <div class="detail-row"><span class="detail-label">البيانات</span><span class="detail-value">تم اختيار تقرير ${type}</span></div>
        `;
    }
    
    html += `</div>`;
    result.innerHTML = html;
}

// ================================================================
// PROFIT ANALYSIS - تحليل الأرباح
// ================================================================
function generateProfitAnalysis() {
    const container = document.getElementById('profitAnalysisResult');
    if (!container) return;
    
    if (!window.products || window.products.length === 0) {
        container.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">لا توجد منتجات</div><div class="desc">أضف منتجات أولاً لعرض تحليل الأرباح</div></div></div>`;
        return;
    }
    
    let html = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">📊 تحليل الأرباح</h4>`;
    
    let totalProfit = 0;
    let totalRevenue = 0;
    const productsWithProfit = [];
    
    window.products.forEach(p => {
        const qty = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
        const profit = (p.sellPrice - p.buyPrice) * qty;
        const revenue = p.sellPrice * qty;
        totalProfit += profit;
        totalRevenue += revenue;
        productsWithProfit.push({ ...p, qty, profit, revenue });
    });
    
    productsWithProfit.sort((a, b) => b.profit - a.profit);
    const topProduct = productsWithProfit.length > 0 ? productsWithProfit[0] : null;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    safeSetText('profitTotalProducts', window.products.length);
    safeSetText('profitAvgMargin', avgMargin.toFixed(1) + '%');
    safeSetText('profitTopProduct', topProduct ? topProduct.name + ' (' + topProduct.profit.toFixed(2) + ')' : '0');
    
    html += `
        <div class="detail-row"><span class="detail-label">إجمالي المنتجات</span><span class="detail-value">${window.products.length}</span></div>
        <div class="detail-row"><span class="detail-label">إجمالي الربح</span><span class="detail-value" style="color:#2D8F5E;">${totalProfit.toFixed(2)}</span></div>
        <div class="detail-row"><span class="detail-label">متوسط هامش الربح</span><span class="detail-value">${avgMargin.toFixed(1)}%</span></div>
        ${topProduct ? `<div class="detail-row"><span class="detail-label">🏆 أعلى ربح</span><span class="detail-value" style="color:#C9A94E;">${topProduct.name} (${topProduct.profit.toFixed(2)})</span></div>` : ''}
        <hr style="border-color:#3D3D3D;margin:8px 0;">
    `;
    
    // عرض تفاصيل كل منتج
    productsWithProfit.forEach(p => {
        const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100) : 0;
        html += `
            <div class="detail-row" style="font-size:12px;">
                <span class="detail-label">${p.name}</span>
                <span class="detail-value">ربح: ${p.profit.toFixed(2)} (${margin.toFixed(1)}%)</span>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

// ================================================================
// GENERATE STATEMENT - كشوفات العملاء والموردين
// ================================================================
function generateCustomerStatement() {
    const customerId = parseInt(document.getElementById('statementCustomerSelect')?.value);
    const from = document.getElementById('statementFrom')?.value;
    const to = document.getElementById('statementTo')?.value;
    const result = document.getElementById('customerStatementResult');
    
    if (!customerId) { showToast('⚠️ اختر عميلاً', 'error'); return; }
    
    const customer = (window.customers || []).find(c => c.id === customerId);
    if (!customer) { showToast('⚠️ العميل غير موجود', 'error'); return; }
    
    const sales = (window.sales || []).filter(s => s.customerId === customerId);
    const total = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    
    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;">📋 كشف حساب العميل: ${customer.name}</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#2D8F5E;">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${sales.length}</span></div>
            ${from && to ? `<div class="detail-row"><span class="detail-label">الفترة</span><span class="detail-value">${from} - ${to}</span></div>` : ''}
        </div>
    `;
    
    result.innerHTML = html;
}

function generateCustomerDetailedStatement() {
    generateCustomerStatement();
}

function generateSupplierStatement() {
    const supplierId = parseInt(document.getElementById('statementSupplierSelect')?.value);
    const from = document.getElementById('statementSupplierFrom')?.value;
    const to = document.getElementById('statementSupplierTo')?.value;
    const result = document.getElementById('supplierStatementResult');
    
    if (!supplierId) { showToast('⚠️ اختر مورداً', 'error'); return; }
    
    const supplier = (window.suppliers || []).find(s => s.id === supplierId);
    if (!supplier) { showToast('⚠️ المورد غير موجود', 'error'); return; }
    
    const purchases = (window.purchases || []).filter(p => p.supplierId === supplierId);
    const total = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    
    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;">📋 كشف حساب المورد: ${supplier.name}</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${purchases.length}</span></div>
            ${from && to ? `<div class="detail-row"><span class="detail-label">الفترة</span><span class="detail-value">${from} - ${to}</span></div>` : ''}
        </div>
    `;
    
    result.innerHTML = html;
}

function generateSupplierDetailedStatement() {
    generateSupplierStatement();
}

// ================================================================
// BARCODE FUNCTIONS - الباركود
// ================================================================
let barcodeScannerActive = false;
let barcodeStream = null;

function startBarcodeScanner() {
    const result = document.getElementById('barcodeResult');
    if (!result) return;
    
    if (barcodeScannerActive) {
        showToast('📷 الكاميرا تعمل بالفعل', 'info');
        return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        result.innerHTML = '<p style="color:#E06060;">❌ الكاميرا غير مدعومة</p>';
        showToast('❌ الكاميرا غير مدعومة', 'error');
        return;
    }
    
    result.innerHTML = '<p style="color:#E6A830;">⏳ جاري تشغيل الكاميرا...</p>';
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            barcodeStream = stream;
            barcodeScannerActive = true;
            
            const video = document.createElement('video');
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            video.style.width = '100%';
            video.style.height = 'auto';
            video.style.borderRadius = '8px';
            
            const container = document.getElementById('barcode-scanner');
            if (container) {
                container.innerHTML = '';
                container.appendChild(video);
                video.play();
                
                // إضافة إطار
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:relative;margin-top:-60px;border:3px solid #C9A94E;border-radius:8px;height:80px;width:80%;margin-left:auto;margin-right:auto;pointer-events:none;';
                container.appendChild(overlay);
            }
            
            result.innerHTML = '<p style="color:#2D8F5E;">📷 الكاميرا تعمل... ضع الباركود أمام الكاميرا</p>';
            showToast('📷 تم تشغيل الكاميرا', 'success');
            
            // محاكاة قراءة الباركود (سيتم استبدالها بالماسح الفعلي)
            setTimeout(() => {
                if (barcodeScannerActive) {
                    result.innerHTML = '<p style="color:#E6A830;">⏳ جاري البحث عن باركود...</p>';
                }
            }, 3000);
            
        })
        .catch(err => {
            result.innerHTML = `<p style="color:#E06060;">❌ خطأ: ${err.message}</p>`;
            showToast('❌ لا يمكن تشغيل الكاميرا', 'error');
            barcodeScannerActive = false;
        });
}

function stopBarcodeScanner() {
    if (barcodeStream) {
        barcodeStream.getTracks().forEach(track => track.stop());
        barcodeStream = null;
    }
    barcodeScannerActive = false;
    
    const container = document.getElementById('barcode-scanner');
    if (container) {
        container.innerHTML = '';
    }
    
    const result = document.getElementById('barcodeResult');
    if (result) {
        result.innerHTML = '<p style="color:#A89070;">📷 تم إيقاف الكاميرا</p>';
    }
    
    showToast('📷 تم إيقاف الكاميرا', 'info');
}

function searchByBarcode() {
    const barcode = document.getElementById('barcodeSearch')?.value?.trim();
    const result = document.getElementById('barcodeSearchResult');
    if (!barcode || !result) return;
    
    const product = (window.products || []).find(p => p.barcode === barcode);
    if (product) {
        result.innerHTML = `
            <div class="alert-item success">
                <div class="icon"><i class="fas fa-check-circle"></i></div>
                <div class="content">
                    <div class="title">✅ تم العثور على المنتج</div>
                    <div class="desc">${product.name} - سعر البيع: ${product.sellPrice} - الكمية: ${(window.warehouseProducts || []).filter(wp => wp.productId === product.id).reduce((s, wp) => s + wp.qty, 0)}</div>
                </div>
            </div>
        `;
    } else {
        result.innerHTML = `
            <div class="alert-item danger">
                <div class="icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="content">
                    <div class="title">❌ لم يتم العثور على المنتج</div>
                    <div class="desc">الباركود: ${barcode}</div>
                </div>
            </div>
        `;
    }
}

// ================================================================
// INVOICE FUNCTIONS - إدارة الفواتير (مكملة)
// ================================================================
window.salesItems = [];
window.purchaseItems = [];
window.returnItems = [];

function addSalesItem() {
    const productId = parseInt(document.getElementById('salesItemProduct')?.value);
    const qty = parseInt(document.getElementById('salesItemQty')?.value) || 1;
    let price = parseFloat(document.getElementById('salesItemPrice')?.value);
    
    if (!productId) { showToast('⚠️ اختر منتجاً', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ الكمية يجب أن تكون أكبر من 0', 'error'); return; }
    
    const product = (window.products || []).find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }
    
    if (!price || price <= 0) {
        price = product.sellPrice;
        const priceInput = document.getElementById('salesItemPrice');
        if (priceInput) priceInput.value = price;
    }
    
    const existing = window.salesItems.find(item => item.productId === productId);
    if (existing) {
        existing.qty += qty;
        existing.total = existing.qty * existing.price;
    } else {
        window.salesItems.push({
            productId: productId,
            productName: product.name,
            qty: qty,
            price: price,
            total: qty * price
        });
    }
    
    renderSalesItems();
    document.getElementById('salesItemProduct').value = '';
    document.getElementById('salesItemQty').value = '';
    document.getElementById('salesItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderSalesItems() {
    const tbody = document.getElementById('salesItemsBody');
    if (!tbody) return;
    
    if (window.salesItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        safeSetText('salesItemsCount', 0);
        safeSetText('salesTotalAmount', '0.00');
        return;
    }
    
    let html = '';
    let total = 0;
    
    window.salesItems.forEach((item, index) => {
        total += item.total;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeSalesItem(${index})"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    safeSetText('salesItemsCount', window.salesItems.length);
    safeSetText('salesTotalAmount', total.toFixed(2));
    
    // تحديث معلومات الضريبة
    const taxInfo = document.getElementById('salesTaxInfo');
    if (taxInfo) {
        const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
        if (invoiceType === 'tax') {
            const taxAmount = total * 0.14;
            taxInfo.textContent = `📊 الضريبة (14%): ${taxAmount.toFixed(2)} | الإجمالي مع الضريبة: ${(total + taxAmount).toFixed(2)}`;
        } else {
            taxInfo.textContent = '';
        }
    }
}

function removeSalesItem(index) {
    window.salesItems.splice(index, 1);
    renderSalesItems();
}

function saveSaleInvoice() {
    if (window.salesItems.length === 0) { showToast('⚠️ أضف أصنافاً أولاً', 'error'); return; }
    
    const customer = document.getElementById('salesCustomer')?.value?.trim() || 
                    document.getElementById('salesCustomerSelect')?.value || 'عميل';
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);
    const date = document.getElementById('salesDate')?.value || getTodayDate();
    const paymentMethod = getSelectedPayment('sales');
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const isTax = invoiceType === 'tax';
    
    const total = window.salesItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = isTax ? total * 0.14 : 0;
    const totalWithTax = total + taxAmount;
    
    const sale = {
        id: Date.now(),
        number: getNextInvoiceNumber(),
        customer: customer,
        customerId: null,
        items: [...window.salesItems],
        total: total,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        date: date,
        paymentMethod: paymentMethod,
        invoiceType: invoiceType,
        status: 'paid',
        warehouseId: warehouseId,
        createdAt: new Date().toISOString()
    };
    
    // البحث عن العميل
    const customerObj = (window.customers || []).find(c => c.name === customer);
    if (customerObj) sale.customerId = customerObj.id;
    
    if (!window.sales) window.sales = [];
    window.sales.push(sale);
    
    // تحديث المخزون
    window.salesItems.forEach(item => {
        const wp = (window.warehouseProducts || []).find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty -= item.qty;
        }
    });
    
    // إضافة حركة خزنة
    if (paymentMethod !== 'آجل') {
        if (!window.treasury) window.treasury = [];
        window.treasury.push({
            id: Date.now(),
            type: 'deposit',
            amount: totalWithTax,
            method: paymentMethod,
            note: `مبيعات - ${customer}`,
            date: date,
            time: getCurrentTime(),
            saleId: sale.id
        });
    }
    
    // إضافة حركة كاشف
    if (typeof addCashierTransaction === 'function') {
        addCashierTransaction('sale', totalWithTax, paymentMethod, `فاتورة بيع - ${customer}`);
    }
    
    saveAll();
    addAuditLog('add', 'sale', `فاتورة بيع - ${customer} - ${totalWithTax.toFixed(2)}`);
    
    window.salesItems = [];
    renderSalesItems();
    renderSales();
    renderAllInvoices();
    updateDashboard();
    
    document.getElementById('salesCustomer').value = '';
    document.getElementById('salesCustomerSelect').value = '';
    
    showToast(`✅ تم حفظ فاتورة البيع - ${totalWithTax.toFixed(2)}`, 'success');
}

function addPurchaseItem() {
    const productId = parseInt(document.getElementById('purchaseItemProduct')?.value);
    const qty = parseInt(document.getElementById('purchaseItemQty')?.value) || 1;
    let price = parseFloat(document.getElementById('purchaseItemPrice')?.value);
    
    if (!productId) { showToast('⚠️ اختر منتجاً', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ الكمية يجب أن تكون أكبر من 0', 'error'); return; }
    
    const product = (window.products || []).find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }
    
    if (!price || price <= 0) {
        price = product.buyPrice;
        const priceInput = document.getElementById('purchaseItemPrice');
        if (priceInput) priceInput.value = price;
    }
    
    const existing = window.purchaseItems.find(item => item.productId === productId);
    if (existing) {
        existing.qty += qty;
        existing.total = existing.qty * existing.price;
    } else {
        window.purchaseItems.push({
            productId: productId,
            productName: product.name,
            qty: qty,
            price: price,
            total: qty * price
        });
    }
    
    renderPurchaseItems();
    document.getElementById('purchaseItemProduct').value = '';
    document.getElementById('purchaseItemQty').value = '';
    document.getElementById('purchaseItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderPurchaseItems() {
    const tbody = document.getElementById('purchaseItemsBody');
    if (!tbody) return;
    
    if (window.purchaseItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        safeSetText('purchaseItemsCount', 0);
        safeSetText('purchaseTotalAmount', '0.00');
        return;
    }
    
    let html = '';
    let total = 0;
    
    window.purchaseItems.forEach((item, index) => {
        total += item.total;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removePurchaseItem(${index})"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    safeSetText('purchaseItemsCount', window.purchaseItems.length);
    safeSetText('purchaseTotalAmount', total.toFixed(2));
}

function removePurchaseItem(index) {
    window.purchaseItems.splice(index, 1);
    renderPurchaseItems();
}

function savePurchaseInvoice() {
    if (window.purchaseItems.length === 0) { showToast('⚠️ أضف أصنافاً أولاً', 'error'); return; }
    
    const supplier = document.getElementById('purchaseSupplier')?.value?.trim() || 
                    document.getElementById('purchaseSupplierSelect')?.value || 'مورد';
    const warehouseId = parseInt(document.getElementById('purchaseWarehouse')?.value);
    const date = document.getElementById('purchaseDate')?.value || getTodayDate();
    const paymentMethod = getSelectedPayment('purchase');
    const invoiceType = document.getElementById('purchaseInvoiceType')?.value || 'simple';
    const isTax = invoiceType === 'tax';
    
    const total = window.purchaseItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = isTax ? total * 0.14 : 0;
    const totalWithTax = total + taxAmount;
    
    const purchase = {
        id: Date.now(),
        number: getNextInvoiceNumber(),
        supplier: supplier,
        supplierId: null,
        items: [...window.purchaseItems],
        total: total,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        date: date,
        paymentMethod: paymentMethod,
        invoiceType: invoiceType,
        status: 'paid',
        warehouseId: warehouseId,
        createdAt: new Date().toISOString()
    };
    
    // البحث عن المورد
    const supplierObj = (window.suppliers || []).find(s => s.name === supplier);
    if (supplierObj) purchase.supplierId = supplierObj.id;
    
    if (!window.purchases) window.purchases = [];
    window.purchases.push(purchase);
    
    // تحديث المخزون
    window.purchaseItems.forEach(item => {
        const wp = (window.warehouseProducts || []).find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty += item.qty;
        } else {
            window.warehouseProducts.push({
                warehouseId: warehouseId,
                productId: item.productId,
                qty: item.qty
            });
        }
    });
    
    // إضافة حركة خزنة
    if (paymentMethod !== 'آجل') {
        if (!window.treasury) window.treasury = [];
        window.treasury.push({
            id: Date.now(),
            type: 'withdraw',
            amount: totalWithTax,
            method: paymentMethod,
            note: `مشتريات - ${supplier}`,
            date: date,
            time: getCurrentTime(),
            purchaseId: purchase.id
        });
    }
    
    saveAll();
    addAuditLog('add', 'purchase', `فاتورة شراء - ${supplier} - ${totalWithTax.toFixed(2)}`);
    
    window.purchaseItems = [];
    renderPurchaseItems();
    renderAllPurchases();
    renderAllInvoices();
    updateDashboard();
    
    document.getElementById('purchaseSupplier').value = '';
    document.getElementById('purchaseSupplierSelect').value = '';
    
    showToast(`✅ تم حفظ فاتورة الشراء - ${totalWithTax.toFixed(2)}`, 'success');
}

function addReturnItem() {
    const productId = parseInt(document.getElementById('returnItemProduct')?.value);
    const qty = parseInt(document.getElementById('returnItemQty')?.value) || 1;
    let price = parseFloat(document.getElementById('returnItemPrice')?.value);
    
    if (!productId) { showToast('⚠️ اختر منتجاً', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ الكمية يجب أن تكون أكبر من 0', 'error'); return; }
    
    const product = (window.products || []).find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }
    
    if (!price || price <= 0) {
        price = product.sellPrice;
        const priceInput = document.getElementById('returnItemPrice');
        if (priceInput) priceInput.value = price;
    }
    
    const existing = window.returnItems.find(item => item.productId === productId);
    if (existing) {
        existing.qty += qty;
        existing.total = existing.qty * existing.price;
    } else {
        window.returnItems.push({
            productId: productId,
            productName: product.name,
            qty: qty,
            price: price,
            total: qty * price
        });
    }
    
    renderReturnItems();
    document.getElementById('returnItemProduct').value = '';
    document.getElementById('returnItemQty').value = '';
    document.getElementById('returnItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderReturnItems() {
    const tbody = document.getElementById('returnItemsBody');
    if (!tbody) return;
    
    if (window.returnItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        safeSetText('returnItemsCount', 0);
        safeSetText('returnTotalAmount', '0.00');
        return;
    }
    
    let html = '';
    let total = 0;
    
    window.returnItems.forEach((item, index) => {
        total += item.total;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeReturnItem(${index})"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    safeSetText('returnItemsCount', window.returnItems.length);
    safeSetText('returnTotalAmount', total.toFixed(2));
}

function removeReturnItem(index) {
    window.returnItems.splice(index, 1);
    renderReturnItems();
}

function saveReturnInvoice() {
    if (window.returnItems.length === 0) { showToast('⚠️ أضف أصنافاً أولاً', 'error'); return; }
    
    const customer = document.getElementById('returnCustomer')?.value?.trim() || 
                    document.getElementById('returnCustomerSelect')?.value || 'عميل';
    const warehouseId = parseInt(document.getElementById('returnWarehouse')?.value);
    const date = document.getElementById('returnDate')?.value || getTodayDate();
    const reason = document.getElementById('returnReason')?.value || 'أسباب أخرى';
    
    const total = window.returnItems.reduce((sum, item) => sum + item.total, 0);
    
    const returnInvoice = {
        id: Date.now(),
        number: getNextInvoiceNumber(),
        customer: customer,
        customerId: null,
        items: [...window.returnItems],
        total: total,
        date: date,
        reason: reason,
        warehouseId: warehouseId,
        createdAt: new Date().toISOString()
    };
    
    // البحث عن العميل
    const customerObj = (window.customers || []).find(c => c.name === customer);
    if (customerObj) returnInvoice.customerId = customerObj.id;
    
    if (!window.returns) window.returns = [];
    window.returns.push(returnInvoice);
    
    // تحديث المخزون (إعادة المنتجات)
    window.returnItems.forEach(item => {
        const wp = (window.warehouseProducts || []).find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty += item.qty;
        }
    });
    
    saveAll();
    addAuditLog('add', 'return', `مرتجع - ${customer} - ${total.toFixed(2)}`);
    
    window.returnItems = [];
    renderReturnItems();
    renderAllReturns();
    renderAllInvoices();
    updateDashboard();
    
    document.getElementById('returnCustomer').value = '';
    document.getElementById('returnCustomerSelect').value = '';
    
    showToast(`✅ تم تسجيل المرتجع - ${total.toFixed(2)}`, 'success');
}

function updateSalesPrice() {
    const productId = parseInt(document.getElementById('salesItemProduct')?.value);
    if (!productId) return;
    
    const product = (window.products || []).find(p => p.id === productId);
    if (product) {
        const priceInput = document.getElementById('salesItemPrice');
        if (priceInput && !priceInput.value) {
            priceInput.value = product.sellPrice;
        }
    }
}

// ================================================================
// DOM READY
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.payment-methods').forEach(group => {
        group.querySelectorAll('label').forEach(label => {
            label.addEventListener('click', function() {
                group.querySelectorAll('label').forEach(l => l.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    });

    const today = getTodayDate();
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input && !input.value) input.value = today;
    });

    if (typeof seedData === 'function') seedData();
    if (typeof refreshAllPages === 'function') refreshAllPages();

    if (localStorage.getItem('app_unlocked') === 'true') {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';

        setTimeout(() => {
            if (typeof populateAllSelects === 'function') populateAllSelects();
            if (typeof refreshAllPages === 'function') refreshAllPages();
            if (typeof startAutoBackup === 'function') startAutoBackup();
            if (typeof syncFromFirebase === 'function') syncFromFirebase();
            updateUIByPermissions();
            updateClock();
        }, 300);
    }

    console.log('✅ الميزان v3.0.0 - نظام محاسبة متكامل');
    console.log('🔒 كلمة المرور: 123456');
    console.log('📱 تم تقسيم الكود إلى موديولات منفصلة');
    console.log('🔑 اضغط 5 مرات على رقم الإصدار في الإعدادات لتفعيل زر توليد المفاتيح');
});
