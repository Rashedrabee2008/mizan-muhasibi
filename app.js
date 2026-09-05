// ================================================================
// app.js - التطبيق الرئيسي (النسخة النهائية المستقرة)
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
// ===== دوال مساعدة أساسية =====
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
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
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
        }).catch(() => fallbackCopy(text));
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
// ===== دوال الصلاحيات =====
// ================================================================

function isAdmin() { return currentUser.role === 'admin'; }
function canDelete() { return currentUser.role === 'admin'; }
function canEdit() { return currentUser.role === 'admin' || currentUser.role === 'manager'; }
function canAdd() { return currentUser.role !== 'viewer'; }
function canViewAudit() { return currentUser.role === 'admin'; }

// ================================================================
// ===== تحديث الواجهة حسب الصلاحيات =====
// ================================================================

function updateUIByPermissions() {
    const clearAuditBtn = document.getElementById('clearAuditBtn');
    if (clearAuditBtn) clearAuditBtn.style.display = canViewAudit() ? 'block' : 'none';
    
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
// ===== الساعة =====
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
    if (clock) clock.textContent = hours + ':' + minutes + ':' + seconds + ' ' + ampm;
}
setInterval(updateClock, 1000);
updateClock();

// ================================================================
// ===== تسجيل الدخول والخروج والقفل =====
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
            // تحميل البيانات من localStorage أولاً
            loadAllData();
            // ثم تهيئة البيانات إذا كانت فارغة
            if (typeof seedData === 'function') seedData();
            if (typeof populateAllSelects === 'function') populateAllSelects();
            if (typeof refreshAllPages === 'function') refreshAllPages();
            if (typeof startAutoBackup === 'function') startAutoBackup();
            updateUIByPermissions();
            updateClock();
            // محاولة المزامنة مع Firebase في الخلفية
            setTimeout(() => {
                if (typeof syncFromFirebase === 'function') syncFromFirebase();
            }, 1000);
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
        saveAllData();
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
        saveAllData();
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
        localStorage.removeItem('mizan_current_user');
        showToast('👋 تم تسجيل الخروج', 'info');
    }
}

// ================================================================
// ===== التنقل بين الصفحات =====
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
    // تحديث الصفحة حسب المعرف
    const refreshFunctions = {
        'dashboard': ['updateDashboard', 'updateDashboardDetails', 'refreshDashboard'],
        'inventory': ['renderProducts'],
        'warehouses': ['renderWarehouses'],
        'permissions': ['renderPermissions'],
        'customers': ['renderCustomers'],
        'suppliers': ['renderSuppliers'],
        'expenses': ['renderExpenses'],
        'treasury': ['renderTreasury'],
        'bonds': ['renderBonds'],
        'invoices': ['renderAllInvoices'],
        'accounting': ['updateAccounting'],
        'cashier': ['renderCashier'],
        'settings': ['updateSettingsUI', 'updateLicenseUI'],
        'company': ['loadCompanyData'],
        'backup': ['renderBackups'],
        'accounts': ['renderAccounts'],
        'audit': ['renderAudit'],
        'alerts': ['updateAlertsUI'],
        'profit_analysis': ['generateProfitAnalysis'],
        'license_generator': ['renderGeneratedKeys', 'updateLicensePrice'],
        'sales': ['populateAllSelects', 'updateCustomerWhatsApp'],
        'purchase': ['populateAllSelects', 'updateSupplierWhatsApp'],
        'returns': ['populateAllSelects'],
        'customer_statement': ['populateCustomerStatement'],
        'supplier_statement': ['populateSupplierStatement'],
        'users': ['renderUsers', 'populateUsersSelect'],
        'inventory_adjustment': ['populateAdjustmentProducts', 'renderAdjustmentHistory', 'updateAdjustmentDateTime']
    };

    const functions = refreshFunctions[pageId] || [];
    functions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            try {
                window[funcName]();
            } catch (e) {
                console.warn('⚠️ خطأ في استدعاء ' + funcName + ':', e);
            }
        }
    });

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
// ===== تحديث جميع الصفحات =====
// ================================================================

function refreshAllPages() {
    const allFunctions = [
        'renderProducts', 'renderSales', 'renderAllPurchases', 'renderAllReturns',
        'renderAllInvoices', 'renderWarehouses', 'renderPermissions', 'renderCustomers',
        'renderSuppliers', 'renderExpenses', 'renderTreasury', 'renderBonds',
        'renderBackups', 'renderAccounts', 'renderAudit', 'renderGeneratedKeys',
        'renderCashier', 'renderUsers', 'renderAdjustmentHistory',
        'updateDashboard', 'updateAccounting', 'updateSettingsUI', 'updateAlertsUI',
        'updateLicenseUI', 'loadCompanyData', 'populateAllSelects', 'updateLicensePrice',
        'refreshDashboard', 'populateAdjustmentProducts', 'updateCustomerWhatsApp',
        'updateSupplierWhatsApp'
    ];

    allFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            try {
                window[funcName]();
            } catch (e) {
                console.warn('⚠️ خطأ في ' + funcName + ':', e);
            }
        }
    });

    updateUIByPermissions();
    updateClock();
}

// ================================================================
// ===== النسخ الاحتياطي التلقائي =====
// ================================================================

function startAutoBackup() {
    if (backupInterval) clearInterval(backupInterval);
    backupInterval = setInterval(() => {
        saveAllData();
        if (typeof createAutoBackup === 'function') createAutoBackup();
        // محاولة المزامنة مع Firebase
        if (navigator.onLine && typeof syncToFirebase === 'function') {
            syncToFirebase();
        }
    }, 5 * 60 * 1000); // كل 5 دقائق
}

// ================================================================
// ===== دوال الترخيص =====
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

    keys.slice(0, 20).forEach(k => {
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 0.8fr 1.2fr;font-size:12px;">
                <span><strong>${k.customerName}</strong></span>
                <span>${k.days || 365} يوم</span>
                <span style="color:#2D8F5E;font-weight:700;">${k.amount || 3000}</span>
                <span>${k.expiryDate}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ================================================================
// ===== إظهار زر توليد المفاتيح بعد 5 ضغطات =====
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
// ===== اختصارات لوحة المفاتيح =====
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
        saveAllData();
        showToast('💾 تم الحفظ', 'success');
    }
});

// ================================================================
// ===== الحفظ التلقائي =====
// ================================================================

setInterval(() => {
    if (document.getElementById('appContent').style.display !== 'none') {
        saveAllData();
        updateClock();
    }
}, 30000);

window.addEventListener('beforeunload', function() {
    saveAllData();
});

// ================================================================
// ===== دوال واتساب =====
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

function updateCustomerWhatsAppManual() { updateCustomerWhatsApp(); }

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

function updateSupplierWhatsAppManual() { updateSupplierWhatsApp(); }

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

    addAuditLog('sale', 'whatsapp', `إرسال فاتورة واتساب للعميل: ${customer} - رقم: ${whatsappNumber}`);
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
// ===== دوال سجل التدقيق =====
// ================================================================

function addAuditLog(action, type, details) {
    if (typeof window.auditLog === 'undefined') window.auditLog = [];
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
// ===== دوال الإعدادات =====
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
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const oldEl = document.getElementById('oldPassword');
    const newEl = document.getElementById('newPassword');
    const confirmEl = document.getElementById('confirmPassword');

    if (!oldEl || !newEl || !confirmEl) return;
    const old = oldEl.value;
    const newPwd = newEl.value;
    const confirm = confirmEl.value;

    // التحقق من كلمة المرور الحالية من المستخدمين
    const user = (window.users || []).find(u => u.username === currentUser.username);
    if (!user) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    if (old !== user.password && old !== DEFAULT_PASSWORD) {
        showToast('❌ كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }
    if (newPwd.length < 4) {
        showToast('❌ 4 أحرف على الأقل', 'error');
        return;
    }
    if (newPwd !== confirm) {
        showToast('❌ غير مطابقة', 'error');
        return;
    }

    // تحديث كلمة المرور
    user.password = newPwd;
    if (currentUser.username === user.username) {
        currentPassword = newPwd;
    }

    localStorage.setItem('mizan_users', JSON.stringify(window.users));
    localStorage.setItem('app_password', newPwd);
    addAuditLog('edit', 'settings', 'تغيير كلمة المرور للمستخدم: ' + user.username);

    oldEl.value = '';
    newEl.value = '';
    confirmEl.value = '';

    showToast('✅ تم تغيير كلمة المرور بنجاح', 'success');
}

function clearAllData() {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟')) return;

    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'
    ];
    
    keys.forEach(key => {
        localStorage.removeItem('mizan_' + key);
        if (key === 'products') window.products = [];
        else if (key === 'customers') window.customers = [];
        else if (key === 'suppliers') window.suppliers = [];
        else if (key === 'purchases') window.purchases = [];
        else if (key === 'sales') window.sales = [];
        else if (key === 'returns') window.returns = [];
        else if (key === 'expenses') window.expenses = [];
        else if (key === 'treasury') window.treasury = [];
        else if (key === 'bonds') window.bonds = [];
        else if (key === 'warehouses') window.warehouses = [];
        else if (key === 'warehouseProducts') window.warehouseProducts = [];
        else if (key === 'permissions') window.permissions = [];
        else if (key === 'companyData') window.companyData = {};
        else if (key === 'backups') window.backups = [];
        else if (key === 'accounts') window.accounts = [];
        else if (key === 'auditLog') window.auditLog = [];
        else if (key === 'alerts') window.alerts = [];
        else if (key === 'cashierHistory') window.cashierHistory = [];
        else if (key === 'inventoryAdjustments') window.inventoryAdjustments = [];
    });

    addAuditLog('delete', 'all', 'مسح جميع البيانات');
    refreshAllPages();
    showToast('🗑️ تم مسح جميع البيانات', 'warning');
}

// ================================================================
// ===== دوال تعبئة القوائم المنسدلة =====
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
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">اختر مخزن...</option>';
            if (window.warehouses) {
                window.warehouses.forEach(w => {
                    el.innerHTML += `<option value="${w.id}">${w.name} (${w.type})</option>`;
                });
            }
        }
    });
}

function populateProductSelects() {
    const ids = ['salesItemProduct', 'purchaseItemProduct', 'returnItemProduct', 'permissionProduct'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">اختر منتج...</option>';
            if (window.products) {
                window.products.forEach(p => {
                    el.innerHTML += `<option value="${p.id}">${p.name}${p.barcode ? ' 🏷️' + p.barcode : ''}</option>`;
                });
            }
        }
    });
}

function populateCustomerSelects() {
    const ids = ['salesCustomerSelect', 'returnCustomerSelect'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">اختر عميل...</option>';
            if (window.customers) {
                window.customers.forEach(c => {
                    el.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                });
            }
        }
    });
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
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">اختر مخزن...</option>';
            if (window.warehouses) {
                window.warehouses.forEach(w => {
                    el.innerHTML += `<option value="${w.id}">${w.name} (${w.type})</option>`;
                });
            }
        }
    });
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
// ===== دوال حفظ وتحميل البيانات =====
// ================================================================

function saveAllData() {
    try {
        const dataKeys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns',
            'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions',
            'companyData', 'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory',
            'inventoryAdjustments', 'users'
        ];
        
        dataKeys.forEach(key => {
            if (window[key] !== undefined) {
                localStorage.setItem('mizan_' + key, JSON.stringify(window[key]));
            }
        });
        
        localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
        localStorage.setItem('app_password', currentPassword);
        
        // حفظ نسخة احتياطية للاستعادة التلقائية
        const backupData = {};
        dataKeys.forEach(key => {
            if (window[key] !== undefined) {
                backupData[key] = window[key];
            }
        });
        backupData.currentUser = currentUser;
        backupData.savedAt = Date.now();
        localStorage.setItem('mizan_auto_restore', JSON.stringify(backupData));
        
    } catch (e) {
        console.warn('⚠️ خطأ في حفظ البيانات:', e);
    }
}

function loadAllData() {
    try {
        const dataKeys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns',
            'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions',
            'companyData', 'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory',
            'inventoryAdjustments', 'users'
        ];
        
        dataKeys.forEach(key => {
            const data = localStorage.getItem('mizan_' + key);
            if (data) {
                try {
                    window[key] = JSON.parse(data);
                } catch (e) {
                    console.warn('⚠️ خطأ في قراءة ' + key + ':', e);
                    window[key] = [];
                }
            } else {
                // إذا لم توجد البيانات، استخدم مصفوفة فارغة
                if (Array.isArray(window[key]) || key === 'users' || key === 'companyData') {
                    window[key] = Array.isArray(window[key]) ? [] : {};
                }
            }
        });
        
        // تحميل المستخدم الحالي
        const userData = localStorage.getItem('mizan_current_user');
        if (userData) {
            try {
                currentUser = JSON.parse(userData);
            } catch (e) {
                currentUser = { username: 'مدير', role: 'admin' };
            }
        }
        
        // تحميل كلمة المرور
        const pass = localStorage.getItem('app_password');
        if (pass) {
            currentPassword = pass;
        }
        
    } catch (e) {
        console.warn('⚠️ خطأ في تحميل البيانات:', e);
    }
}

// ================================================================
// ===== دوال التهيئة =====
// ================================================================

function initUsers() {
    let users = localStorage.getItem('mizan_users');
    if (users) {
        try {
            window.users = JSON.parse(users);
        } catch (e) {
            window.users = getDefaultUsers();
        }
    } else {
        window.users = getDefaultUsers();
    }
    localStorage.setItem('mizan_users', JSON.stringify(window.users));
}

function getDefaultUsers() {
    return [
        { id: 1, username: 'مدير', role: 'admin', password: DEFAULT_PASSWORD },
        { id: 2, username: 'مشرف', role: 'manager', password: DEFAULT_PASSWORD },
        { id: 3, username: 'كاشير', role: 'cashier', password: DEFAULT_PASSWORD },
        { id: 4, username: 'مشاهد', role: 'viewer', password: DEFAULT_PASSWORD }
    ];
}

function seedData() {
    // تحميل البيانات أولاً
    loadAllData();
    
    // التحقق من وجود بيانات
    const hasData = localStorage.getItem('mizan_products') && 
                   JSON.parse(localStorage.getItem('mizan_products') || '[]').length > 0;
    
    if (hasData) {
        console.log('📦 البيانات موجودة مسبقاً');
        return;
    }

    console.log('🔄 تهيئة البيانات التجريبية...');

    // تهيئة المتغيرات إذا كانت غير معرفة
    if (typeof window.products === 'undefined') window.products = [];
    if (typeof window.customers === 'undefined') window.customers = [];
    if (typeof window.suppliers === 'undefined') window.suppliers = [];
    if (typeof window.purchases === 'undefined') window.purchases = [];
    if (typeof window.sales === 'undefined') window.sales = [];
    if (typeof window.returns === 'undefined') window.returns = [];
    if (typeof window.expenses === 'undefined') window.expenses = [];
    if (typeof window.treasury === 'undefined') window.treasury = [];
    if (typeof window.bonds === 'undefined') window.bonds = [];
    if (typeof window.warehouses === 'undefined') window.warehouses = [];
    if (typeof window.warehouseProducts === 'undefined') window.warehouseProducts = [];
    if (typeof window.permissions === 'undefined') window.permissions = [];
    if (typeof window.backups === 'undefined') window.backups = [];
    if (typeof window.accounts === 'undefined') window.accounts = [];
    if (typeof window.auditLog === 'undefined') window.auditLog = [];
    if (typeof window.alerts === 'undefined') window.alerts = [];
    if (typeof window.cashierHistory === 'undefined') window.cashierHistory = [];
    if (typeof window.inventoryAdjustments === 'undefined') window.inventoryAdjustments = [];
    if (typeof window.companyData === 'undefined') window.companyData = {};
    if (typeof window.users === 'undefined') window.users = getDefaultUsers();

    // ===== منتجات =====
    window.products = [
        { id: 1, name: 'هاتف ذكي X100', buyPrice: 8000, sellPrice: 10000, min: 5, barcode: '1234567890123' },
        { id: 2, name: 'سماعة لاسلكية', buyPrice: 500, sellPrice: 750, min: 10, barcode: '1234567890124' },
        { id: 3, name: 'شاحن سريع 65W', buyPrice: 300, sellPrice: 450, min: 15, barcode: '1234567890125' },
        { id: 4, name: 'حافظة هاتف', buyPrice: 50, sellPrice: 100, min: 20, barcode: '1234567890126' },
        { id: 5, name: 'كابل USB-C', buyPrice: 80, sellPrice: 150, min: 25, barcode: '1234567890127' },
        { id: 6, name: 'بطارية خارجية', buyPrice: 400, sellPrice: 600, min: 8, barcode: '1234567890128' }
    ];

    // ===== مخازن =====
    window.warehouses = [
        { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
        { id: 2, name: 'مخزن المحل', type: 'محل', address: 'الإسكندرية' },
        { id: 3, name: 'مخزن التوزيع', type: 'فرعي', address: 'الجيزة' }
    ];

    // ===== كميات المنتجات في المخازن =====
    window.warehouseProducts = [
        { warehouseId: 1, productId: 1, qty: 30 },
        { warehouseId: 1, productId: 2, qty: 50 },
        { warehouseId: 1, productId: 3, qty: 40 },
        { warehouseId: 1, productId: 4, qty: 60 },
        { warehouseId: 1, productId: 5, qty: 80 },
        { warehouseId: 1, productId: 6, qty: 25 },
        { warehouseId: 2, productId: 1, qty: 10 },
        { warehouseId: 2, productId: 2, qty: 20 },
        { warehouseId: 2, productId: 3, qty: 15 },
        { warehouseId: 3, productId: 4, qty: 30 },
        { warehouseId: 3, productId: 5, qty: 40 }
    ];

    // ===== عملاء =====
    window.customers = [
        { id: 1, name: 'أحمد محمد', phone: '01234567890', whatsapp: '01011993799', email: 'ahmed@test.com', address: 'القاهرة', active: true },
        { id: 2, name: 'سارة علي', phone: '01123456789', whatsapp: '01158767633', email: 'sara@test.com', address: 'الإسكندرية', active: true },
        { id: 3, name: 'محمد إبراهيم', phone: '01098765432', whatsapp: '01098765432', email: 'mohamed@test.com', address: 'الجيزة', active: true }
    ];

    // ===== موردين =====
    window.suppliers = [
        { id: 1, name: 'شركة الاتصالات المصرية', phone: '0234567890', whatsapp: '01158767633', email: 'info@telecom.com', address: 'القاهرة', active: true },
        { id: 2, name: 'مستورد الإلكترونيات', phone: '0223456789', whatsapp: '01234567890', email: 'info@electronics.com', address: 'الإسكندرية', active: true }
    ];

    // ===== حسابات محاسبية =====
    window.accounts = [
        { id: 1, name: 'أصول', type: 'assets', parentId: null },
        { id: 2, name: 'خصوم', type: 'liabilities', parentId: null },
        { id: 3, name: 'حقوق ملكية', type: 'equity', parentId: null },
        { id: 4, name: 'إيرادات', type: 'revenue', parentId: null },
        { id: 5, name: 'مصروفات', type: 'expenses', parentId: null }
    ];

    // ===== بيانات الشركة =====
    window.companyData = {
        name: 'شركة الميزان للتجارة',
        phone: '0234567890',
        mobile: '01000000000',
        address: 'القاهرة، مصر',
        taxNumber: '123-456-789',
        commercialRegister: '12345',
        email: 'info@mizan.com',
        vodafone: '01011993799',
        instapay: 'rashedrabia@instapay',
        bankAccount: '2021300000275818',
        cash: '01080591108',
        paymentEmail: 'payment@mizan.com',
        logo: null
    };

    // ===== فاتورة بيع تجريبية =====
    window.sales = [{
        id: Date.now(),
        number: 1,
        customer: 'أحمد محمد',
        customerId: 1,
        items: [
            { productId: 1, productName: 'هاتف ذكي X100', qty: 2, price: 10000, total: 20000 },
            { productId: 2, productName: 'سماعة لاسلكية', qty: 3, price: 750, total: 2250 }
        ],
        total: 22250,
        totalWithTax: 22250,
        date: getTodayDate(),
        paymentMethod: 'نقدي',
        invoiceType: 'simple',
        status: 'paid',
        warehouseId: 1
    }];

    // ===== فاتورة شراء تجريبية =====
    window.purchases = [{
        id: Date.now() + 1,
        number: 2,
        supplier: 'شركة الاتصالات المصرية',
        supplierId: 1,
        items: [
            { productId: 1, productName: 'هاتف ذكي X100', qty: 10, price: 8000, total: 80000 },
            { productId: 2, productName: 'سماعة لاسلكية', qty: 20, price: 500, total: 10000 }
        ],
        total: 90000,
        totalWithTax: 90000,
        date: getTodayDate(),
        paymentMethod: 'نقدي',
        invoiceType: 'simple',
        status: 'paid',
        warehouseId: 1
    }];

    // ===== مصروف تجريبي =====
    window.expenses = [{
        id: Date.now() + 2,
        note: 'فاتورة كهرباء المحل',
        amount: 500,
        date: getTodayDate(),
        method: 'نقدي'
    }];

    // حفظ جميع البيانات
    saveAllData();
    console.log('✅ تم تهيئة البيانات التجريبية بنجاح');
}

// ================================================================
// ===== دوال الصفحات الرئيسية (التقارير، المحاسبات، إلخ) =====
// ================================================================

// ===== التقارير =====
function generateReport(type) {
    const result = document.getElementById('reportResult');
    if (!result) return;
    
    let html = `<div class="accounting-detail-content">`;
    
    if (type === 'sales') {
        const total = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
        const count = (window.sales || []).length;
        html += `
            <h4 style="color:#2D8F5E;">📊 تقرير المبيعات</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value" style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${count}</span></div>
            <div class="detail-row"><span class="detail-label">متوسط الفاتورة</span><span class="detail-value">${count > 0 ? (total / count).toFixed(2) : '0.00'}</span></div>
        `;
    } else if (type === 'purchases') {
        const total = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
        const count = (window.purchases || []).length;
        html += `
            <h4 style="color:#E06060;">📊 تقرير المشتريات</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${count}</span></div>
            <div class="detail-row"><span class="detail-label">متوسط الفاتورة</span><span class="detail-value">${count > 0 ? (total / count).toFixed(2) : '0.00'}</span></div>
        `;
    } else if (type === 'profit') {
        const sales = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
        const purchases = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
        const profit = sales - purchases;
        html += `
            <h4 style="color:#C9A94E;">📊 تقرير الأرباح</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value" style="color:#2D8F5E;">${sales.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;">${purchases.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">صافي الربح</span><span class="detail-value" style="color:${profit >= 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${profit.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">هامش الربح</span><span class="detail-value">${sales > 0 ? ((profit / sales) * 100).toFixed(1) : '0.0'}%</span></div>
        `;
    } else if (type === 'inventory') {
        let totalValue = 0;
        let totalQty = 0;
        if (window.products && window.warehouseProducts) {
            window.products.forEach(p => {
                const qty = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0);
                totalQty += qty;
                totalValue += p.sellPrice * qty;
            });
        }
        html += `
            <h4 style="color:#4A8AB5;">📊 تقرير المخزون</h4>
            <div class="detail-row"><span class="detail-label">عدد المنتجات</span><span class="detail-value">${(window.products || []).length}</span></div>
            <div class="detail-row"><span class="detail-label">إجمالي الكمية</span><span class="detail-value">${totalQty}</span></div>
            <div class="detail-row"><span class="detail-label">قيمة المخزون</span><span class="detail-value" style="color:#C9A94E;font-weight:700;">${totalValue.toFixed(2)}</span></div>
        `;
    } else if (type === 'customers_report') {
        const customers = window.customers || [];
        const topCustomers = customers.map(c => {
            const total = (window.sales || []).filter(s => s.customerId === c.id).reduce((sum, s) => sum + (s.total || 0), 0);
            return { ...c, total };
        }).sort((a, b) => b.total - a.total);
        
        html += `<h4 style="color:#2D8F5E;">📊 تقرير العملاء</h4>`;
        html += `<div class="detail-row"><span class="detail-label">إجمالي العملاء</span><span class="detail-value">${customers.length}</span></div>`;
        if (topCustomers.length > 0) {
            const top = topCustomers[0];
            html += `<div class="detail-row"><span class="detail-label">🏆 أفضل عميل</span><span class="detail-value">${top.name} (${top.total.toFixed(2)})</span></div>`;
        }
    } else if (type === 'warehouse') {
        html += `
            <h4 style="color:#4A8AB5;">📊 تقرير المخازن</h4>
            <div class="detail-row"><span class="detail-label">عدد المخازن</span><span class="detail-value">${(window.warehouses || []).length}</span></div>
            <div class="detail-row"><span class="detail-label">إجمالي المنتجات في المخازن</span><span class="detail-value">${(window.warehouseProducts || []).reduce((s, wp) => s + wp.qty, 0)}</span></div>
        `;
        (window.warehouses || []).forEach(w => {
            const count = (window.warehouseProducts || []).filter(wp => wp.warehouseId === w.id).reduce((s, wp) => s + wp.qty, 0);
            html += `<div class="detail-row" style="font-size:12px;"><span class="detail-label">${w.name}</span><span class="detail-value">${count} منتج</span></div>`;
        });
    } else if (type === 'expenses') {
        const total = (window.expenses || []).reduce((s, e) => s + e.amount, 0);
        html += `
            <h4 style="color:#E06060;">📊 تقرير المصروفات</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المصروفات</span><span class="detail-value" style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد المصروفات</span><span class="detail-value">${(window.expenses || []).length}</span></div>
        `;
    }
    
    html += `</div>`;
    result.innerHTML = html;
}

// ===== المحاسبات =====
function updateAccounting() {
    const totalSales = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
    const totalPurchases = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
    const profit = totalSales - totalPurchases;
    
    safeSetText('accountingSales', totalSales.toFixed(2));
    safeSetText('accountingPurchases', totalPurchases.toFixed(2));
    safeSetText('accountingProfit', profit.toFixed(2));
}

function showLedger() {
    const result = document.getElementById('accountingResult');
    if (!result) return;
    
    const totalSales = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
    const totalPurchases = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
    const totalExpenses = (window.expenses || []).reduce((s, e) => s + e.amount, 0);
    const profit = totalSales - totalPurchases - totalExpenses;
    
    const html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;">📒 دفتر الأستاذ</h4>
            <div class="detail-row"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;">${totalPurchases.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">إجمالي المصروفات</span><span class="detail-value" style="color:#E06060;">${totalExpenses.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">صافي الربح</span><span class="detail-value" style="color:${profit >= 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${profit.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${(window.sales || []).length + (window.purchases || []).length}</span></div>
        </div>
    `;
    result.innerHTML = html;
}

function showAudit() { showLedger(); }
function showTrialBalance() { showLedger(); }
function showIncomeStatement() { showLedger(); }
function showBalanceSheet() { showLedger(); }
function showCashFlow() { showLedger(); }

// ===== تحليل الأرباح =====
function generateProfitAnalysis() {
    const container = document.getElementById('profitAnalysisResult');
    if (!container) return;
    
    if (!window.products || window.products.length === 0) {
        container.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">لا توجد منتجات</div><div class="desc">أضف منتجات أولاً لعرض تحليل الأرباح</div></div></div>`;
        return;
    }
    
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
    
    let html = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">📊 تحليل الأرباح</h4>`;
    html += `
        <div class="detail-row"><span class="detail-label">إجمالي المنتجات</span><span class="detail-value">${window.products.length}</span></div>
        <div class="detail-row"><span class="detail-label">إجمالي الربح</span><span class="detail-value" style="color:#2D8F5E;font-weight:700;">${totalProfit.toFixed(2)}</span></div>
        <div class="detail-row"><span class="detail-label">متوسط هامش الربح</span><span class="detail-value">${avgMargin.toFixed(1)}%</span></div>
        ${topProduct ? `<div class="detail-row"><span class="detail-label">🏆 أعلى ربح</span><span class="detail-value" style="color:#C9A94E;font-weight:700;">${topProduct.name} (${topProduct.profit.toFixed(2)})</span></div>` : ''}
        <hr style="border-color:#3D3D3D;margin:8px 0;">
    `;
    
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

// ===== كشوفات العملاء والموردين =====
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
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${sales.length}</span></div>
            ${from && to ? `<div class="detail-row"><span class="detail-label">الفترة</span><span class="detail-value">${from} - ${to}</span></div>` : ''}
            <hr style="border-color:#3D3D3D;margin:8px 0;">
    `;
    
    sales.slice(-5).reverse().forEach(s => {
        html += `
            <div class="detail-row" style="font-size:12px;">
                <span class="detail-label">#${s.number || s.id}</span>
                <span class="detail-value">${(s.total || 0).toFixed(2)} - ${s.date || '-'}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    result.innerHTML = html;
}

function generateCustomerDetailedStatement() { generateCustomerStatement(); }

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
            <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span></div>
            <div class="detail-row"><span class="detail-label">عدد الفواتير</span><span class="detail-value">${purchases.length}</span></div>
            ${from && to ? `<div class="detail-row"><span class="detail-label">الفترة</span><span class="detail-value">${from} - ${to}</span></div>` : ''}
            <hr style="border-color:#3D3D3D;margin:8px 0;">
    `;
    
    purchases.slice(-5).reverse().forEach(p => {
        html += `
            <div class="detail-row" style="font-size:12px;">
                <span class="detail-label">#${p.number || p.id}</span>
                <span class="detail-value">${(p.total || 0).toFixed(2)} - ${p.date || '-'}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    result.innerHTML = html;
}

function generateSupplierDetailedStatement() { generateSupplierStatement(); }

// ================================================================
// ===== دوال الفواتير =====
// ================================================================

window.salesItems = [];
window.purchaseItems = [];
window.returnItems = [];

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

// ===== دوال عرض الفواتير =====
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
    if (type === 'بيع') viewSaleInvoice(parseInt(id));
    else if (type === 'شراء') viewPurchaseInvoice(parseInt(id));
    else viewReturnInvoice(parseInt(id));
}

// ===== دوال حذف الفواتير =====
function deleteSaleInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة نهائياً؟')) return;
    window.sales = (window.sales || []).filter(s => s.id !== id);
    saveAllData();
    renderSales();
    renderAllInvoices();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

function deletePurchaseInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة نهائياً؟')) return;
    window.purchases = (window.purchases || []).filter(p => p.id !== id);
    saveAllData();
    renderAllPurchases();
    renderAllInvoices();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

function deleteReturnInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المرتجع نهائياً؟')) return;
    window.returns = (window.returns || []).filter(r => r.id !== id);
    saveAllData();
    renderAllReturns();
    renderAllInvoices();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ===== دوال إدارة الفواتير العملية =====
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
        number: (window.sales || []).length + 1,
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
    
    if (typeof addCashierTransaction === 'function') {
        addCashierTransaction('sale', totalWithTax, paymentMethod, `فاتورة بيع - ${customer}`);
    }
    
    saveAllData();
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

// دوال الشراء والمرتجع (مختصرة ولكنها تعمل)
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
        number: (window.purchases || []).length + 1,
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
    
    const supplierObj = (window.suppliers || []).find(s => s.name === supplier);
    if (supplierObj) purchase.supplierId = supplierObj.id;
    
    if (!window.purchases) window.purchases = [];
    window.purchases.push(purchase);
    
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
    
    saveAllData();
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
        number: (window.returns || []).length + 1,
        customer: customer,
        customerId: null,
        items: [...window.returnItems],
        total: total,
        date: date,
        reason: reason,
        warehouseId: warehouseId,
        createdAt: new Date().toISOString()
    };
    
    const customerObj = (window.customers || []).find(c => c.name === customer);
    if (customerObj) returnInvoice.customerId = customerObj.id;
    
    if (!window.returns) window.returns = [];
    window.returns.push(returnInvoice);
    
    window.returnItems.forEach(item => {
        const wp = (window.warehouseProducts || []).find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty += item.qty;
        }
    });
    
    saveAllData();
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
// ===== دوال الصفحات الإضافية =====
// ================================================================

// دوال المخازن
function renderWarehouses() {
    safeSetText('warehousesCount', (window.warehouses || []).length);
    const totalProducts = (window.warehouseProducts || []).reduce((s, wp) => s + wp.qty, 0);
    safeSetText('warehouseProductsCount', totalProducts);

    const container = document.getElementById('warehouseList');
    if (!container) return;

    if (!window.warehouses || window.warehouses.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.5fr 0.8fr 1fr 0.8fr 0.6fr;"><span>اسم المخزن</span><span>النوع</span><span>العنوان</span><span>المنتجات</span><span></span></div>`;

    window.warehouses.forEach(w => {
        const count = (window.warehouseProducts || []).filter(wp => wp.warehouseId === w.id).reduce((s, wp) => s + wp.qty, 0);
        const typeColor = w.type === 'رئيسي' ? '#2D8F5E' : w.type === 'محل' ? '#E6A830' : '#4A8AB5';
        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 0.8fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${w.name}</strong></span>
                <span style="color:${typeColor};font-weight:700;font-size:11px;">${w.type}</span>
                <span>${w.address || '-'}</span>
                <span>${count}</span>
                <div class="actions">
                    ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editWarehouse(${w.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteWarehouse(${w.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function addWarehouse() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const name = document.getElementById('warehouseName')?.value?.trim();
    const type = document.getElementById('warehouseType')?.value || 'رئيسي';
    const address = document.getElementById('warehouseAddress')?.value?.trim();

    if (!name) { showToast('⚠️ أدخل اسم المخزن', 'error'); return; }
    if ((window.warehouses || []).find(w => w.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ المخزن موجود', 'warning');
        return;
    }

    if (!window.warehouses) window.warehouses = [];
    window.warehouses.push({ id: Date.now(), name: name, type: type, address: address });
    saveAllData();
    addAuditLog('add', 'warehouse', `إضافة مخزن: ${name}`);
    renderWarehouses();
    populateAllSelects();
    document.getElementById('warehouseName').value = '';
    document.getElementById('warehouseAddress').value = '';
    showToast('✅ تم إضافة المخزن', 'success');
}

function editWarehouse(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const w = (window.warehouses || []).find(wh => wh.id === id);
    if (!w) return;

    const html = `
        <div class="form-group"><label>اسم المخزن</label><input type="text" id="editWarehouseName" value="${w.name}" /></div>
        <div class="form-group"><label>النوع</label>
            <select id="editWarehouseType">
                <option value="رئيسي" ${w.type === 'رئيسي' ? 'selected' : ''}>رئيسي</option>
                <option value="فرعي" ${w.type === 'فرعي' ? 'selected' : ''}>فرعي</option>
                <option value="محل" ${w.type === 'محل' ? 'selected' : ''}>محل</option>
            </select>
        </div>
        <div class="form-group"><label>العنوان</label><input type="text" id="editWarehouseAddress" value="${w.address || ''}" /></div>
        <button class="btn btn-primary btn-block" onclick="saveWarehouseEdit(${w.id})"><i class="fas fa-save"></i> حفظ</button>
    `;
    openModal('✏️ تعديل المخزن', html);
}

function saveWarehouseEdit(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const w = (window.warehouses || []).find(wh => wh.id === id);
    if (!w) return;

    const name = document.getElementById('editWarehouseName')?.value?.trim();
    const type = document.getElementById('editWarehouseType')?.value;
    const address = document.getElementById('editWarehouseAddress')?.value?.trim();

    if (!name) { showToast('⚠️ أدخل اسم المخزن', 'error'); return; }

    w.name = name;
    w.type = type;
    w.address = address;

    saveAllData();
    addAuditLog('edit', 'warehouse', `تعديل مخزن: ${name}`);
    renderWarehouses();
    populateAllSelects();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

function deleteWarehouse(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المخزن نهائياً؟')) return;

    const w = (window.warehouses || []).find(wh => wh.id === id);
    window.warehouses = (window.warehouses || []).filter(wh => wh.id !== id);
    window.warehouseProducts = (window.warehouseProducts || []).filter(wp => wp.warehouseId !== id);

    saveAllData();
    if (w) addAuditLog('delete', 'warehouse', `حذف مخزن: ${w.name}`);
    renderWarehouses();
    populateAllSelects();
    showToast('🗑️ تم الحذف', 'info');
    closeModal();
}

// دوال المستخدمين
function renderUsers() {
    if (!isAdmin()) {
        const container = document.getElementById('userList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>المدير فقط يمكنه إدارة المستخدمين</span></div>`;
        }
        return;
    }

    const container = document.getElementById('userList');
    if (!container) return;

    if (!window.users || !Array.isArray(window.users) || window.users.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا توجد مستخدمين</span></div>`;
        return;
    }

    const total = window.users.length;
    const admins = window.users.filter(u => u.role === 'admin').length;
    const cashiers = window.users.filter(u => u.role === 'cashier').length;

    safeSetText('usersTotalCount', total);
    safeSetText('usersAdminCount', admins);
    safeSetText('usersCashierCount', cashiers);

    const roles = { admin: '👑 مدير', manager: '📊 مشرف', cashier: '💰 كاشير', viewer: '👁️ مشاهد' };
    const roleColors = { admin: '#2D8F5E', manager: '#C9A94E', cashier: '#4A8AB5', viewer: '#5D5D5D' };

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.6fr;">
        <span>اسم المستخدم</span><span>الدور</span><span>الحالي</span><span>تاريخ الإضافة</span><span></span>
    </div>`;

    window.users.forEach(u => {
        const isCurrent = u.username === currentUser?.username;
        const isMainAdmin = u.username === 'مدير';
        const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar') : '-';

        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.6fr;font-size:12px;">
                <span><strong>${u.username}</strong></span>
                <span style="color:${roleColors[u.role] || '#5D5D5D'};font-weight:700;">${roles[u.role] || u.role}</span>
                <span>${isCurrent ? '✅' : ''}</span>
                <span style="font-size:10px;color:#A89070;">${createdAt}</span>
                <div class="actions">
                    ${!isMainAdmin || isCurrent ? `<button class="btn btn-warning btn-sm" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${!isMainAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>` : ''}
                    ${isMainAdmin ? '<span style="font-size:9px;color:#C9A94E;">👑 رئيسي</span>' : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    populateUsersSelect();
    updateUIByPermissions();
}

function addUser() {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه إضافة مستخدمين', 'error');
        return;
    }

    const username = document.getElementById('newUsername')?.value?.trim();
    const password = document.getElementById('newUserPassword')?.value?.trim();
    const role = document.getElementById('newUserRole')?.value;

    if (!username) { showToast('⚠️ أدخل اسم المستخدم', 'error'); return; }
    if (!password || password.length < 4) { showToast('⚠️ كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error'); return; }
    if ((window.users || []).find(u => u?.username === username)) {
        showToast('⚠️ المستخدم موجود', 'warning');
        return;
    }

    if (!window.users) window.users = [];
    window.users.push({
        id: Date.now(),
        username: username,
        role: role,
        password: password,
        createdAt: new Date().toISOString()
    });

    saveAllData();
    renderUsers();
    populateUsersSelect();
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    showToast('✅ تم إضافة المستخدم', 'success');
    addAuditLog('add', 'user', `إضافة مستخدم: ${username} (${role})`);
}

function editUser(id) {
    if (!isAdmin()) { showToast('⚠️ المدير فقط يمكنه التعديل', 'error'); return; }
    const u = (window.users || []).find(user => user?.id === id);
    if (!u) { showToast('⚠️ المستخدم غير موجود', 'error'); return; }

    const isMainAdmin = u.username === 'مدير';

    const html = `
        <div class="form-group"><label>👤 اسم المستخدم</label><input type="text" id="editUsername" value="${u.username}" /></div>
        <div class="form-group"><label>🔑 كلمة المرور (اترك فارغاً للحفاظ على الحالية)</label><input type="password" id="editUserPassword" placeholder="أدخل كلمة مرور جديدة" /></div>
        <div class="form-group"><label>📋 الدور</label>
            <select id="editUserRole">
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>👑 مدير</option>
                <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>📊 مشرف</option>
                <option value="cashier" ${u.role === 'cashier' ? 'selected' : ''}>💰 كاشير</option>
                <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>👁️ مشاهد</option>
            </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveUserEdit(${u.id})"><i class="fas fa-save"></i> حفظ</button>
        ${!isMainAdmin ? `<button class="btn btn-danger btn-block" onclick="deleteUser(${u.id})" style="margin-top:6px;"><i class="fas fa-trash"></i> حذف</button>` : ''}
    `;
    openModal('✏️ تعديل المستخدم', html);
}

function saveUserEdit(id) {
    if (!isAdmin()) { showToast('⚠️ المدير فقط يمكنه التعديل', 'error'); return; }
    const u = (window.users || []).find(user => user?.id === id);
    if (!u) { showToast('⚠️ المستخدم غير موجود', 'error'); return; }

    const username = document.getElementById('editUsername')?.value?.trim();
    const password = document.getElementById('editUserPassword')?.value?.trim();
    const role = document.getElementById('editUserRole')?.value;

    if (!username) { showToast('⚠️ أدخل اسم المستخدم', 'error'); return; }
    if ((window.users || []).find(user => user?.username === username && user?.id !== id)) {
        showToast('⚠️ الاسم مستخدم', 'warning');
        return;
    }

    u.username = username;
    u.role = role;
    if (password && password.length >= 4) {
        u.password = password;
        if (u.username === currentUser?.username) {
            currentPassword = password;
            localStorage.setItem('app_password', password);
        }
    }

    saveAllData();
    renderUsers();
    populateUsersSelect();
    closeModal();
    if (currentUser?.username === u.username) {
        currentUser.role = role;
        localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
        updateUIByPermissions();
    }
    showToast('✅ تم التعديل', 'success');
    addAuditLog('edit', 'user', `تعديل مستخدم: ${username}`);
}

function deleteUser(id) {
    if (!isAdmin()) { showToast('⚠️ المدير فقط يمكنه الحذف', 'error'); return; }
    if (!confirm('⚠️ حذف المستخدم نهائياً؟')) return;

    const u = (window.users || []).find(user => user?.id === id);
    if (!u) { showToast('⚠️ المستخدم غير موجود', 'error'); return; }
    if (u.username === 'مدير') { showToast('⚠️ لا يمكن حذف المدير الرئيسي', 'error'); return; }
    if (currentUser?.username === u.username) { showToast('⚠️ لا يمكن حذف نفسك', 'error'); return; }

    window.users = (window.users || []).filter(user => user?.id !== id);
    saveAllData();
    renderUsers();
    populateUsersSelect();
    showToast(`🗑️ تم حذف المستخدم: ${u.username}`, 'info');
    addAuditLog('delete', 'user', `حذف مستخدم: ${u.username}`);
    closeModal();
}

function changeUserPassword() {
    const oldPassword = document.getElementById('changeOldPassword')?.value?.trim();
    const newPassword = document.getElementById('changeNewPassword')?.value?.trim();
    const confirmPassword = document.getElementById('changeConfirmPassword')?.value?.trim();

    if (!oldPassword) { showToast('⚠️ أدخل كلمة المرور الحالية', 'error'); return; }
    if (!newPassword || newPassword.length < 4) { showToast('⚠️ كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('⚠️ كلمة المرور غير مطابقة', 'error'); return; }

    const currentUserObj = (window.users || []).find(u => u.username === currentUser?.username);
    if (!currentUserObj) { showToast('⚠️ المستخدم غير موجود', 'error'); return; }
    if (currentUserObj.password && currentUserObj.password !== oldPassword) {
        showToast('⚠️ كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }

    currentUserObj.password = newPassword;
    currentPassword = newPassword;
    localStorage.setItem('app_password', newPassword);
    saveAllData();

    document.getElementById('changeOldPassword').value = '';
    document.getElementById('changeNewPassword').value = '';
    document.getElementById('changeConfirmPassword').value = '';

    showToast('✅ تم تغيير كلمة المرور بنجاح', 'success');
    addAuditLog('edit', 'user', `تغيير كلمة المرور للمستخدم: ${currentUserObj.username}`);
}

function switchUser() {
    const select = document.getElementById('switchUserSelect');
    if (!select) return;
    const userId = parseInt(select.value);
    if (!userId) return;

    const user = (window.users || []).find(u => u?.id === userId);
    if (!user) { showToast('⚠️ المستخدم غير موجود', 'error'); return; }

    currentUser = { username: user.username, role: user.role };
    localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
    localStorage.setItem('app_password', user.password || '123456');
    currentPassword = user.password || '123456';

    updateUIByPermissions();
    renderUsers();
    showToast(`👤 تم التبديل إلى ${user.username} (${user.role})`, 'success');
    addAuditLog('edit', 'user', `تبديل المستخدم إلى: ${user.username}`);
    refreshAllPages();
}

// ================================================================
// ===== دوال السحابة (Firebase) =====
// ================================================================

// هذا الكود يتعامل مع المزامنة مع Firebase
// يعمل مع وجود نت ويخزن محلياً عند عدم وجود نت

function syncToFirebase() {
    const badge = document.getElementById('headerBadge');
    if (!badge) return;

    // التحقق من الاتصال بالإنترنت
    if (!navigator.onLine) {
        showToast('⚠️ لا يوجد اتصال بالإنترنت، سيتم المزامنة لاحقاً', 'warning');
        badge.textContent = '📴 غير متصل';
        badge.className = 'badge';
        // حفظ البيانات محلياً
        saveAllData();
        return;
    }

    badge.textContent = '⏳ جاري...';
    badge.className = 'badge syncing';

    try {
        // حفظ البيانات محلياً أولاً
        saveAllData();

        // محاولة المزامنة مع Firebase
        if (typeof firebase !== 'undefined' && firebase.database) {
            const data = getSyncData();
            firebase.database().ref('mizan_app_data').set(data)
                .then(() => {
                    badge.textContent = '☁️ تم المزامنة';
                    badge.className = 'badge synced';
                    showToast('☁️ تم رفع البيانات للسحابة', 'success');
                    localStorage.setItem('mizan_last_sync', Date.now().toString());
                    setTimeout(() => {
                        badge.textContent = '☁️ مزامنة';
                        badge.className = 'badge';
                    }, 3000);
                })
                .catch((error) => {
                    console.error('Firebase sync error:', error);
                    badge.textContent = '❌ فشل';
                    badge.className = 'badge';
                    showToast('❌ فشل رفع البيانات: ' + error.message, 'error');
                    setTimeout(() => {
                        badge.textContent = '☁️ مزامنة';
                        badge.className = 'badge';
                    }, 3000);
                });
        } else {
            // Firebase غير متاح، استخدام التخزين المحلي فقط
            badge.textContent = '💾 محلي';
            badge.className = 'badge';
            showToast('💾 تم حفظ البيانات محلياً', 'success');
            setTimeout(() => {
                badge.textContent = '☁️ مزامنة';
                badge.className = 'badge';
            }, 3000);
        }
    } catch (e) {
        console.error('Sync error:', e);
        badge.textContent = '❌ خطأ';
        badge.className = 'badge';
        setTimeout(() => {
            badge.textContent = '☁️ مزامنة';
            badge.className = 'badge';
        }, 3000);
    }
}

function syncFromFirebase() {
    const badge = document.getElementById('headerBadge');
    if (!badge) return;

    if (!navigator.onLine) {
        showToast('⚠️ لا يوجد اتصال بالإنترنت، جاري استخدام البيانات المحلية', 'warning');
        loadAllData();
        refreshAllPages();
        return;
    }

    badge.textContent = '⏳ جلب...';
    badge.className = 'badge syncing';

    try {
        if (typeof firebase !== 'undefined' && firebase.database) {
            firebase.database().ref('mizan_app_data').get()
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        if (data && typeof data === 'object') {
                            applySyncData(data);
                            badge.textContent = '☁️ تم الجلب';
                            badge.className = 'badge synced';
                            showToast('📥 تم جلب البيانات من السحابة', 'success');
                            localStorage.setItem('mizan_last_sync', Date.now().toString());
                            setTimeout(() => {
                                badge.textContent = '☁️ مزامنة';
                                badge.className = 'badge';
                            }, 3000);
                        } else {
                            showToast('⚠️ بيانات غير مكتملة', 'warning');
                            badge.textContent = '⚠️ غير مكتملة';
                            badge.className = 'badge';
                            setTimeout(() => {
                                badge.textContent = '☁️ مزامنة';
                                badge.className = 'badge';
                            }, 3000);
                        }
                    } else {
                        showToast('⚠️ لا توجد بيانات في السحابة', 'warning');
                        badge.textContent = '⚠️ لا توجد';
                        badge.className = 'badge';
                        setTimeout(() => {
                            badge.textContent = '☁️ مزامنة';
                            badge.className = 'badge';
                        }, 3000);
                    }
                })
                .catch((error) => {
                    console.error('Firebase get error:', error);
                    badge.textContent = '❌ فشل';
                    badge.className = 'badge';
                    showToast('❌ فشل جلب البيانات: ' + error.message, 'error');
                    setTimeout(() => {
                        badge.textContent = '☁️ مزامنة';
                        badge.className = 'badge';
                    }, 3000);
                });
        } else {
            // Firebase غير متاح، استخدام التخزين المحلي
            loadAllData();
            refreshAllPages();
            badge.textContent = '💾 محلي';
            badge.className = 'badge';
            showToast('💾 تم تحميل البيانات محلياً', 'success');
            setTimeout(() => {
                badge.textContent = '☁️ مزامنة';
                badge.className = 'badge';
            }, 3000);
        }
    } catch (e) {
        console.error('Sync from Firebase error:', e);
        badge.textContent = '❌ خطأ';
        badge.className = 'badge';
        setTimeout(() => {
            badge.textContent = '☁️ مزامنة';
            badge.className = 'badge';
        }, 3000);
    }
}

function getSyncData() {
    return {
        products: window.products || [],
        customers: window.customers || [],
        suppliers: window.suppliers || [],
        purchases: window.purchases || [],
        sales: window.sales || [],
        returns: window.returns || [],
        expenses: window.expenses || [],
        treasury: window.treasury || [],
        bonds: window.bonds || [],
        warehouses: window.warehouses || [],
        warehouseProducts: window.warehouseProducts || [],
        permissions: window.permissions || [],
        companyData: window.companyData || {},
        backups: window.backups || [],
        accounts: window.accounts || [],
        auditLog: window.auditLog || [],
        alerts: window.alerts || [],
        cashierHistory: window.cashierHistory || [],
        inventoryAdjustments: window.inventoryAdjustments || [],
        users: window.users || [],
        currentUser: currentUser,
        updatedAt: new Date().toISOString()
    };
}

function applySyncData(data) {
    if (!data) return;
    
    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments', 'users'
    ];
    
    keys.forEach(k => {
        if (data[k] !== undefined) {
            window[k] = data[k];
            localStorage.setItem('mizan_' + k, JSON.stringify(data[k]));
        }
    });
    
    if (data.currentUser) {
        currentUser = data.currentUser;
        localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
    }
    
    refreshAllPages();
}

// مراقبة حالة الاتصال بالإنترنت
window.addEventListener('online', function() {
    showToast('🌐 تم استعادة الاتصال بالإنترنت، جاري المزامنة...', 'success');
    setTimeout(() => {
        syncToFirebase();
    }, 1000);
});

window.addEventListener('offline', function() {
    showToast('📴 تم قطع الاتصال بالإنترنت، جاري حفظ البيانات محلياً', 'warning');
    saveAllData();
});

// محاولة المزامنة عند تحميل الصفحة
setTimeout(() => {
    if (navigator.onLine) {
        syncFromFirebase();
    } else {
        loadAllData();
        refreshAllPages();
    }
}, 500);

// ================================================================
// ===== دوال النسخ الاحتياطي =====
// ================================================================

function getBackupData() {
    return getSyncData();
}

function restoreBackupData(data) {
    applySyncData(data);
    showToast('✅ تم استعادة البيانات بنجاح', 'success');
}

function createBackup() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const data = getBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `mizan_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (!window.backups) window.backups = [];
    window.backups.push({
        id: Date.now(),
        name: `mizan_backup_${date}.json`,
        date: date,
        size: blob.size,
        auto: false
    });
    if (window.backups.length > 20) {
        window.backups.sort((a, b) => b.id - a.id);
        window.backups = window.backups.slice(0, 20);
    }
    saveAllData();
    renderBackups();
    addAuditLog('add', 'backup', 'إنشاء نسخة احتياطية');
    showToast('✅ تم إنشاء النسخة', 'success');
}

function renderBackups() {
    const container = document.getElementById('backupList');
    if (!container) return;

    if (!window.backups || window.backups.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><span>لا توجد نسخ</span></div>`;
        return;
    }

    let html = '';
    window.backups.slice().reverse().forEach(b => {
        html += `
            <div class="backup-item">
                <div class="info">
                    <div class="name">${b.name} ${b.auto ? '🤖 تلقائي' : ''}</div>
                    <div class="date">${b.date}</div>
                </div>
                <div class="size">${(b.size / 1024).toFixed(1)} KB</div>
                <div class="actions">
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteBackup(${b.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function deleteBackup(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف النسخة؟')) return;
    window.backups = (window.backups || []).filter(b => b.id !== id);
    saveAllData();
    renderBackups();
    showToast('🗑️ تم الحذف', 'info');
}

function restoreBackup(event) {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            restoreBackupData(data);
            showToast('📥 تم الاستعادة', 'success');
        } catch {
            showToast('❌ ملف غير صالح', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function createAutoBackup() {
    const data = getBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    if (!window.backups) window.backups = [];
    window.backups = window.backups.filter(b => !b.auto);
    window.backups.push({
        id: Date.now(),
        name: `auto_${new Date().toISOString().split('T')[0]}`,
        date: new Date().toISOString().split('T')[0],
        size: blob.size,
        auto: true
    });
    if (window.backups.length > 15) {
        window.backups.sort((a, b) => b.id - a.id);
        window.backups = window.backups.slice(0, 15);
    }
    saveAllData();
    renderBackups();
}

// ================================================================
// ===== دوال الصفحات الأخرى (مختصرة) =====
// ================================================================

// دوال الحسابات
function renderAccounts() {
    const container = document.getElementById('accountList');
    if (!container) return;

    if (!window.accounts || window.accounts.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-sitemap"></i><span>لا توجد حسابات</span></div>`;
        return;
    }

    const typeNames = { assets: 'أصول', liabilities: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expenses: 'مصروفات' };
    const typeColors = { assets: '#2D8F5E', liabilities: '#E06060', equity: '#C9A94E', revenue: '#4A8AB5', expenses: '#E6A830' };

    function buildTree(parentId, level) {
        const children = window.accounts.filter(a => a.parentId === parentId);
        if (children.length === 0) return '';
        let html = '';
        children.forEach(c => {
            const indent = '  '.repeat(level);
            html += `
                <div class="table-row" style="font-size:12px;padding:4px 0;padding-right:${level * 16}px;grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;color:#F5E6C8;">
                    <span><strong>${indent}${c.name}</strong></span>
                    <span style="color:${typeColors[c.type]};font-weight:700;font-size:10px;">${typeNames[c.type] || c.type}</span>
                    <span style="font-size:10px;">${c.parentId ? 'فرعي' : 'رئيسي'}</span>
                    <div class="actions">
                        ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteAccount(${c.id})"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
            html += buildTree(c.id, level + 1);
        });
        return html;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;"><span>اسم الحساب</span><span>النوع</span><span>المستوى</span><span></span></div>`;
    html += buildTree(null, 0);
    container.innerHTML = html;
}

function addAccount() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const name = document.getElementById('accountName')?.value?.trim();
    const type = document.getElementById('accountType')?.value;
    const parentId = parseInt(document.getElementById('accountParent')?.value) || null;

    if (!name) { showToast('⚠️ أدخل اسم الحساب', 'error'); return; }
    if ((window.accounts || []).find(a => a.name === name)) {
        showToast('⚠️ الحساب موجود', 'warning');
        return;
    }

    if (!window.accounts) window.accounts = [];
    window.accounts.push({ id: Date.now(), name: name, type: type, parentId: parentId });
    saveAllData();
    addAuditLog('add', 'account', `إضافة حساب: ${name}`);
    renderAccounts();
    populateAccountParents();
    document.getElementById('accountName').value = '';
    showToast('✅ تم إضافة الحساب', 'success');
}

function deleteAccount(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الحساب؟ سيتم حذف الحسابات الفرعية')) return;

    const toDelete = [id];
    const originalAccounts = [...(window.accounts || [])];

    function findChildren(parentId) {
        originalAccounts.filter(a => a.parentId === parentId).forEach(c => {
            toDelete.push(c.id);
            findChildren(c.id);
        });
    }
    findChildren(id);

    const names = originalAccounts.filter(a => toDelete.includes(a.id)).map(a => a.name).join(', ');
    window.accounts = (window.accounts || []).filter(a => !toDelete.includes(a.id));

    saveAllData();
    addAuditLog('delete', 'account', `حذف حسابات: ${names}`);
    renderAccounts();
    populateAccountParents();
    showToast('🗑️ تم الحذف', 'info');
}

// دوال الخزنة
function renderTreasury() {
    const balance = (window.treasury || []).reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);
    safeSetText('treasuryBalance', balance.toFixed(2) + ' 🇪🇬');

    const deposits = (window.treasury || []).filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const withdrawals = (window.treasury || []).filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
    safeSetText('treasuryDeposits', deposits.toFixed(2));
    safeSetText('treasuryWithdrawals', withdrawals.toFixed(2));

    const cash = (window.treasury || []).filter(t => t.method === 'نقدي').reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);
    const wallet = (window.treasury || []).filter(t => t.method === 'محفظة').reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);
    const bank = (window.treasury || []).filter(t => t.method === 'بنك').reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);
    safeSetText('treasuryCash', cash.toFixed(2));
    safeSetText('treasuryWallet', wallet.toFixed(2));
    safeSetText('treasuryBank', bank.toFixed(2));

    const container = document.getElementById('treasuryList');
    if (!container) return;

    if (!window.treasury || window.treasury.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-vault"></i><span>لا توجد حركات</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>النوع</span><span>طريقة الدفع</span><span>المخزن</span><span>التاريخ</span><span></span></div>`;

    window.treasury.slice().reverse().forEach(t => {
        const color = t.type === 'deposit' ? '#2D8F5E' : '#E06060';
        const sign = t.type === 'deposit' ? '+' : '-';
        const w = (window.warehouses || []).find(wh => wh.id === t.warehouseId);
        const wName = w ? w.name : '-';

        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr 0.6fr;font-size:11px;">
                <span>${t.note}</span>
                <span style="color:${color};font-weight:700;">${sign}${t.amount.toFixed(2)}</span>
                <span>${t.type === 'deposit' ? 'إيداع' : 'سحب'}</span>
                <span>${t.method || 'نقدي'}</span>
                <span style="font-size:9px;">${wName}</span>
                <span style="font-size:10px;">${t.date}</span>
                <div class="actions">
                    ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editTreasury(${t.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteTreasury(${t.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function addTreasuryTransaction() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const type = document.getElementById('treasuryType')?.value;
    const amount = parseFloat(document.getElementById('treasuryAmount')?.value);
    const method = document.getElementById('treasuryMethod')?.value || 'نقدي';
    const date = document.getElementById('treasuryDate')?.value || getTodayDate();
    const note = document.getElementById('treasuryNote')?.value?.trim() || 'حركة خزنة';
    const warehouseId = parseInt(document.getElementById('treasuryWarehouse')?.value) || null;

    if (isNaN(amount) || amount <= 0) { showToast('⚠️ مبلغ صحيح', 'error'); return; }

    if (!window.treasury) window.treasury = [];
    window.treasury.push({
        id: Date.now(),
        type: type,
        amount: amount,
        method: method,
        date: date,
        note: note,
        warehouseId: warehouseId,
        time: getCurrentTime()
    });
    saveAllData();
    addAuditLog('add', 'treasury', `${type === 'deposit' ? 'إيداع' : 'سحب'} ${amount} - ${note}`);
    renderTreasury();
    if (typeof renderCashier === 'function') renderCashier();
    document.getElementById('treasuryAmount').value = '';
    document.getElementById('treasuryNote').value = '';
    showToast('✅ تم إضافة الحركة', 'success');
}

function editTreasury(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const t = (window.treasury || []).find(tr => tr.id === id);
    if (!t) return;

    const html = `
        <div class="form-row">
            <div class="form-group"><label>النوع</label>
                <select id="editTreasuryType">
                    <option value="deposit" ${t.type === 'deposit' ? 'selected' : ''}>إيداع</option>
                    <option value="withdraw" ${t.type === 'withdraw' ? 'selected' : ''}>سحب</option>
                </select>
            </div>
            <div class="form-group"><label>المبلغ</label><input type="number" id="editTreasuryAmount" value="${t.amount}" min="0.01" step="0.01" /></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>طريقة الدفع</label>
                <select id="editTreasuryMethod">
                    <option value="نقدي" ${t.method === 'نقدي' ? 'selected' : ''}>نقدي</option>
                    <option value="محفظة" ${t.method === 'محفظة' ? 'selected' : ''}>محفظة</option>
                    <option value="بنك" ${t.method === 'بنك' ? 'selected' : ''}>بنك</option>
                </select>
            </div>
            <div class="form-group"><label>التاريخ</label><input type="date" id="editTreasuryDate" value="${t.date}" /></div>
        </div>
        <div class="form-group"><label>البيان</label><input type="text" id="editTreasuryNote" value="${t.note}" /></div>
        <button class="btn btn-primary btn-block" onclick="saveTreasuryEdit(${t.id})"><i class="fas fa-save"></i> حفظ</button>
    `;
    openModal('✏️ تعديل الحركة', html);
}

function saveTreasuryEdit(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const t = (window.treasury || []).find(tr => tr.id === id);
    if (!t) return;

    const type = document.getElementById('editTreasuryType')?.value;
    const amount = parseFloat(document.getElementById('editTreasuryAmount')?.value);
    const method = document.getElementById('editTreasuryMethod')?.value;
    const date = document.getElementById('editTreasuryDate')?.value;
    const note = document.getElementById('editTreasuryNote')?.value?.trim();

    if (isNaN(amount) || amount <= 0) { showToast('⚠️ مبلغ صحيح', 'error'); return; }

    t.type = type;
    t.amount = amount;
    t.method = method;
    t.date = date;
    t.note = note;

    saveAllData();
    addAuditLog('edit', 'treasury', `تعديل حركة خزنة: ${note}`);
    renderTreasury();
    if (typeof renderCashier === 'function') renderCashier();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

function deleteTreasury(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الحركة؟')) return;

    const t = (window.treasury || []).find(tr => tr.id === id);
    window.treasury = (window.treasury || []).filter(tr => tr.id !== id);

    saveAllData();
    if (t) addAuditLog('delete', 'treasury', `حذف حركة خزنة: ${t.note}`);
    renderTreasury();
    if (typeof renderCashier === 'function') renderCashier();
    showToast('🗑️ تم الحذف', 'info');
    closeModal();
}

// ================================================================
// ===== دوال الشركة =====
// ================================================================

function loadCompanyData() {
    const data = window.companyData || {};
    safeSetValue('companyName', data.name || '');
    safeSetValue('companyPhone', data.phone || '');
    safeSetValue('companyMobile', data.mobile || '');
    safeSetValue('companyAddress', data.address || '');
    safeSetValue('companyTax', data.taxNumber || '');
    safeSetValue('companyCommercial', data.commercialRegister || '');
    safeSetValue('companyEmail', data.email || '');
    safeSetValue('companyVodafone', data.vodafone || '');
    safeSetValue('companyInstapay', data.instapay || '');
    safeSetValue('companyBankAccount', data.bankAccount || '');
    safeSetValue('companyCash', data.cash || '');
    safeSetValue('companyPaymentEmail', data.paymentEmail || '');

    const nameDisplay = document.getElementById('companyNameDisplay');
    if (nameDisplay) nameDisplay.textContent = data.name || 'اسم الشركة';
    
    const detailsContainer = document.getElementById('companyDetailsDisplay');
    if (detailsContainer) {
        const details = [];
        if (data.phone) details.push(`📞 ${data.phone}`);
        if (data.mobile) details.push(`📱 ${data.mobile}`);
        if (data.address) details.push(`📍 ${data.address}`);
        if (data.taxNumber) details.push(`🆔 الرقم الضريبي: ${data.taxNumber}`);
        if (data.commercialRegister) details.push(`📋 السجل التجاري: ${data.commercialRegister}`);
        if (data.email) details.push(`📧 ${data.email}`);
        if (data.vodafone) details.push(`📱 فودافون كاش: ${data.vodafone}`);
        if (data.instapay) details.push(`📲 إنستاباي: ${data.instapay}`);
        if (data.bankAccount) details.push(`🏦 بنك: ${data.bankAccount}`);
        if (data.cash) details.push(`💰 كاش: ${data.cash}`);
        if (data.paymentEmail) details.push(`📧 بريد الدفع: ${data.paymentEmail}`);
        detailsContainer.innerHTML = details.join('<br>') ||
            '<div>📞 0234567890</div><div>📱 01000000000</div><div>📍 القاهرة، مصر</div>';
    }

    const displayVodafone = document.getElementById('displayVodafone');
    const displayInstapay = document.getElementById('displayInstapay');
    const displayBankAccount = document.getElementById('displayBankAccount');
    const displayCash = document.getElementById('displayCash');
    if (displayVodafone) displayVodafone.textContent = data.vodafone || '01011993799';
    if (displayInstapay) displayInstapay.textContent = data.instapay || 'rashedrabia@instapay';
    if (displayBankAccount) displayBankAccount.textContent = data.bankAccount || '2021300000275818';
    if (displayCash) displayCash.textContent = data.cash || '01080591108';

    const logoDisplay = document.getElementById('companyLogoDisplay');
    const logoPreview = document.getElementById('logoPreview');
    if (data.logo) {
        if (logoDisplay) logoDisplay.innerHTML = `<img src="${data.logo}" alt="Logo" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
        if (logoPreview) logoPreview.innerHTML = `<img src="${data.logo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
    } else {
        if (logoDisplay) logoDisplay.innerHTML = '<i class="fas fa-store"></i>';
        if (logoPreview) logoPreview.innerHTML = '<i class="fas fa-camera"></i>';
    }
}

function saveCompanyData() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const data = {
        name: document.getElementById('companyName')?.value?.trim() || '',
        phone: document.getElementById('companyPhone')?.value?.trim() || '',
        mobile: document.getElementById('companyMobile')?.value?.trim() || '',
        address: document.getElementById('companyAddress')?.value?.trim() || '',
        taxNumber: document.getElementById('companyTax')?.value?.trim() || '',
        commercialRegister: document.getElementById('companyCommercial')?.value?.trim() || '',
        email: document.getElementById('companyEmail')?.value?.trim() || '',
        vodafone: document.getElementById('companyVodafone')?.value?.trim() || '',
        instapay: document.getElementById('companyInstapay')?.value?.trim() || '',
        bankAccount: document.getElementById('companyBankAccount')?.value?.trim() || '',
        cash: document.getElementById('companyCash')?.value?.trim() || '',
        paymentEmail: document.getElementById('companyPaymentEmail')?.value?.trim() || '',
        logo: window.companyData.logo || null
    };
    window.companyData = data;
    saveAllData();
    loadCompanyData();
    addAuditLog('edit', 'company', 'تعديل بيانات الشركة');
    showToast('✅ تم حفظ البيانات', 'success');
}

function uploadLogo(event) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        window.companyData.logo = e.target.result;
        saveAllData();
        loadCompanyData();
        addAuditLog('edit', 'company', 'رفع شعار الشركة');
        showToast('✅ تم رفع الشعار', 'success');
    };
    reader.readAsDataURL(file);
}

// ================================================================
// ===== دوال تسوية المخزون =====
// ================================================================

let inventoryAdjustmentItems = [];

function updateAdjustmentDateTime() {
    const dt = getCurrentDateTime();
    const dateDisplay = document.getElementById('adjustmentDateDisplay');
    const timeDisplay = document.getElementById('adjustmentTimeDisplay');
    if (dateDisplay) dateDisplay.textContent = dt.date;
    if (timeDisplay) timeDisplay.textContent = dt.time;
}
setInterval(updateAdjustmentDateTime, 1000);
updateAdjustmentDateTime();

function populateAdjustmentProducts() {
    const select = document.getElementById('adjustmentProduct');
    if (!select) return;
    select.innerHTML = '<option value="">اختر منتج...</option>';
    if (window.products) {
        const sorted = [...window.products].sort((a, b) => a.name.localeCompare(b.name));
        sorted.forEach(p => {
            const totalQty = (window.warehouseProducts || []).filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0);
            select.innerHTML += `<option value="${p.id}">${p.name} (${totalQty})</option>`;
        });
    }
}

function addAdjustmentItem() {
    const productId = parseInt(document.getElementById('adjustmentProduct')?.value);
    const actualQty = parseInt(document.getElementById('adjustmentActualQty')?.value);

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (isNaN(actualQty) || actualQty < 0) { showToast('⚠️ أدخل كمية فعلية صحيحة', 'error'); return; }

    const product = (window.products || []).find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    if (inventoryAdjustmentItems.find(item => item.productId === productId)) {
        showToast('⚠️ المنتج موجود بالفعل', 'warning');
        return;
    }

    const currentQty = (window.warehouseProducts || []).filter(wp => wp.productId === productId).reduce((s, wp) => s + wp.qty, 0);
    const diff = actualQty - currentQty;

    inventoryAdjustmentItems.push({
        productId: productId,
        productName: product.name,
        currentQty: currentQty,
        actualQty: actualQty,
        diff: diff,
        status: diff === 0 ? 'متطابق' : diff > 0 ? 'زائد' : 'ناقص'
    });

    renderAdjustmentItems();
    document.getElementById('adjustmentProduct').value = '';
    document.getElementById('adjustmentActualQty').value = '';
    populateAdjustmentProducts();
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderAdjustmentItems() {
    const container = document.getElementById('adjustmentItemsList');
    if (!container) return;

    if (inventoryAdjustmentItems.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-boxes"></i><span>لا توجد أصناف</span></div>`;
        return;
    }

    let html = '';
    let totalDiff = 0;

    inventoryAdjustmentItems.forEach((item, index) => {
        totalDiff += item.diff;
        const color = item.diff === 0 ? '#A89070' : item.diff > 0 ? '#2D8F5E' : '#E06060';
        const sign = item.diff > 0 ? '+' : '';
        html += `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 0.6fr;gap:4px;padding:6px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                <span><strong>${item.productName}</strong></span>
                <span style="font-weight:700;">${item.currentQty}</span>
                <span style="color:#C9A94E;font-weight:700;">${item.actualQty}</span>
                <span style="color:${color};font-weight:700;">${sign}${item.diff}</span>
                <button class="btn btn-danger btn-sm" onclick="removeAdjustmentItem(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    });

    html += `
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 0.6fr;gap:4px;padding:8px 0;border-top:2px solid #C9A94E;font-weight:800;color:#C9A94E;font-size:13px;">
            <span>الإجمالي</span>
            <span>${inventoryAdjustmentItems.reduce((s, i) => s + i.currentQty, 0)}</span>
            <span>${inventoryAdjustmentItems.reduce((s, i) => s + i.actualQty, 0)}</span>
            <span style="color:${totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060'};">${totalDiff > 0 ? '+' : ''}${totalDiff}</span>
            <span>${inventoryAdjustmentItems.length}</span>
        </div>
    `;

    container.innerHTML = html;
}

function removeAdjustmentItem(index) {
    if (!confirm('⚠️ حذف الصنف؟')) return;
    inventoryAdjustmentItems.splice(index, 1);
    renderAdjustmentItems();
    populateAdjustmentProducts();
}

function clearAdjustmentItems() {
    if (!confirm('⚠️ مسح جميع الأصناف؟')) return;
    inventoryAdjustmentItems = [];
    renderAdjustmentItems();
    populateAdjustmentProducts();
    showToast('🗑️ تم المسح', 'info');
}

function saveInventoryAdjustment() {
    if (inventoryAdjustmentItems.length === 0) { showToast('⚠️ أضف صنف واحد على الأقل', 'error'); return; }
    if (!confirm('✅ هل أنت متأكد من حفظ التسوية؟ سيتم تعديل المخزون تلقائياً')) return;

    const dt = getCurrentDateTime();
    const adjustment = {
        id: Date.now(),
        date: dt.date,
        time: dt.time,
        items: [...inventoryAdjustmentItems],
        totalItems: inventoryAdjustmentItems.length,
        totalDiff: inventoryAdjustmentItems.reduce((s, i) => s + i.diff, 0),
        createdAt: new Date().toISOString()
    };

    for (const item of inventoryAdjustmentItems) {
        if (item.diff === 0) continue;
        const wp = (window.warehouseProducts || []).find(w => w.productId === item.productId);
        if (wp) {
            wp.qty = item.actualQty;
        } else {
            const mainWarehouse = (window.warehouses || []).find(w => w.type === 'رئيسي');
            if (mainWarehouse) {
                if (!window.warehouseProducts) window.warehouseProducts = [];
                window.warehouseProducts.push({
                    warehouseId: mainWarehouse.id,
                    productId: item.productId,
                    qty: item.actualQty
                });
            }
        }
    }

    if (!window.inventoryAdjustments) window.inventoryAdjustments = [];
    window.inventoryAdjustments.unshift(adjustment);
    saveAllData();

    inventoryAdjustmentItems = [];
    renderAdjustmentItems();
    populateAdjustmentProducts();
    renderAdjustmentHistory();
    renderProducts();
    addAuditLog('add', 'adjustment', `تسوية مخزون - ${adjustment.totalItems} صنف - الفرق: ${adjustment.totalDiff}`);
    showToast(`✅ تم حفظ التسوية - ${adjustment.totalItems} صنف`, 'success');
}

function renderAdjustmentHistory() {
    const container = document.getElementById('adjustmentHistory');
    if (!container) return;

    const adjustments = window.inventoryAdjustments || [];
    if (adjustments.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد تسويات سابقة</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 1fr 1fr 0.8fr 0.6fr;"><span>التاريخ</span><span>الوقت</span><span>الأصناف</span><span>الفرق</span><span>الحالة</span><span></span></div>`;

    adjustments.slice(0, 20).forEach(adj => {
        const totalDiff = adj.items.reduce((s, i) => s + (i.diff || 0), 0);
        const statusColor = totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060';
        const statusText = totalDiff === 0 ? 'متطابق' : totalDiff > 0 ? 'زائد' : 'ناقص';
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 1fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span>${adj.date}</span>
                <span>${adj.time || '-'}</span>
                <span>${adj.items.length}</span>
                <span style="color:${statusColor};font-weight:700;">${totalDiff > 0 ? '+' : ''}${totalDiff}</span>
                <span><span class="status-badge" style="background:${statusColor};color:#fff;">${statusText}</span></span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewAdjustmentDetails('${adj.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAdjustment('${adj.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function viewAdjustmentDetails(id) {
    const adjustments = window.inventoryAdjustments || [];
    const adj = adjustments.find(a => a.id == id);
    if (!adj) { showToast('⚠️ التسوية غير موجودة', 'error'); return; }

    let itemsHtml = `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4px;font-weight:800;color:#C9A94E;padding:4px 0;border-bottom:2px solid #C9A94E;font-size:11px;">
        <span>المنتج</span><span>الحالية</span><span>الفعلية</span><span>الفرق</span>
    </div>`;

    adj.items.forEach(item => {
        const color = item.diff === 0 ? '#A89070' : item.diff > 0 ? '#2D8F5E' : '#E06060';
        const sign = item.diff > 0 ? '+' : '';
        itemsHtml += `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                <span>${item.productName}</span>
                <span style="font-weight:700;">${item.currentQty}</span>
                <span style="color:#C9A94E;font-weight:700;">${item.actualQty}</span>
                <span style="color:${color};font-weight:700;">${sign}${item.diff}</span>
            </div>
        `;
    });

    const totalDiff = adj.items.reduce((s, i) => s + (i.diff || 0), 0);

    const html = `
        <div style="text-align:center;margin-bottom:8px;">
            <h4 style="color:#C9A94E;">📋 تفاصيل التسوية</h4>
            <div style="font-size:12px;color:#A89070;">📅 ${adj.date}  🕐 ${adj.time || '-'}</div>
            <div style="font-size:12px;color:#A89070;">📦 ${adj.items.length} صنف | الفرق: <span style="color:${totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${totalDiff > 0 ? '+' : ''}${totalDiff}</span></div>
        </div>
        ${itemsHtml}
        <div style="margin-top:8px;display:flex;gap:6px;">
            <button class="btn btn-primary btn-block" onclick="printAdjustmentDetails('${adj.id}')"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>
    `;
    openModal('📋 تفاصيل التسوية', html);
}

function deleteAdjustment(id) {
    if (!confirm('⚠️ حذف التسوية؟ سيتم إلغاء التعديلات على المخزون')) return;
    const adjustments = window.inventoryAdjustments || [];
    const adj = adjustments.find(a => a.id == id);
    if (!adj) { showToast('⚠️ التسوية غير موجودة', 'error'); return; }

    for (const item of adj.items) {
        if (item.diff === 0) continue;
        const wp = (window.warehouseProducts || []).find(w => w.productId === item.productId);
        if (wp) {
            wp.qty = item.currentQty;
        }
    }

    window.inventoryAdjustments = adjustments.filter(a => a.id != id);
    saveAllData();
    renderAdjustmentHistory();
    renderProducts();
    showToast('🗑️ تم حذف التسوية', 'info');
}

function printInventoryAdjustment() {
    if (inventoryAdjustmentItems.length === 0) { showToast('⚠️ لا توجد أصناف للطباعة', 'error'); return; }

    const dt = getCurrentDateTime();
    const company = window.companyData || {};
    const totalDiff = inventoryAdjustmentItems.reduce((s, i) => s + i.diff, 0);

    let html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${company.name || 'الميزان'}</h2>
                <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                <div class="contact-info">📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'} | 📱 ${company.mobile || '01000000000'}</div>
            </div>
            <div class="invoice-info">
                <div class="info-item"><span class="label">📋 تسوية مخزون</span></div>
                <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${dt.date}</span></div>
                <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${dt.time}</span></div>
            </div>
            <table class="items-table">
                <thead><tr><th>#</th><th>المنتج</th><th>الحالية</th><th>الفعلية</th><th>الفرق</th></tr></thead>
                <tbody>
                    ${inventoryAdjustmentItems.map((item, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${item.productName}</td>
                            <td>${item.currentQty}</td>
                            <td>${item.actualQty}</td>
                            <td style="color:${item.diff === 0 ? '#A89070' : item.diff > 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${item.diff > 0 ? '+' : ''}${item.diff}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total-box">
                <div>📦 عدد الأصناف: <span class="total-amount">${inventoryAdjustmentItems.length}</span></div>
                <div>📊 صافي الفرق: <span class="total-amount" style="color:${totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060'};">${totalDiff > 0 ? '+' : ''}${totalDiff}</span></div>
            </div>
            <div class="footer-box"><div class="thanks">خالص مع الشكر</div></div>
        </div>
    `;

    const win = window.open('', '_blank', 'width=400,height=650');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة', 'error');
    }
}

function printAdjustmentDetails(id) {
    const adjustments = window.inventoryAdjustments || [];
    const adj = adjustments.find(a => a.id == id);
    if (!adj) { showToast('⚠️ التسوية غير موجودة', 'error'); return; }

    const company = window.companyData || {};
    const totalDiff = adj.items.reduce((s, i) => s + (i.diff || 0), 0);

    let html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${company.name || 'الميزان'}</h2>
                <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                <div class="contact-info">📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'} | 📱 ${company.mobile || '01000000000'}</div>
            </div>
            <div class="invoice-info">
                <div class="info-item"><span class="label">📋 تسوية مخزون</span></div>
                <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${adj.date}</span></div>
                <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${adj.time || '-'}</span></div>
            </div>
            <table class="items-table">
                <thead><tr><th>#</th><th>المنتج</th><th>الحالية</th><th>الفعلية</th><th>الفرق</th></tr></thead>
                <tbody>
                    ${adj.items.map((item, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${item.productName}</td>
                            <td>${item.currentQty}</td>
                            <td>${item.actualQty}</td>
                            <td style="color:${item.diff === 0 ? '#A89070' : item.diff > 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${item.diff > 0 ? '+' : ''}${item.diff}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total-box">
                <div>📦 عدد الأصناف: <span class="total-amount">${adj.items.length}</span></div>
                <div>📊 صافي الفرق: <span class="total-amount" style="color:${totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060'};">${totalDiff > 0 ? '+' : ''}${totalDiff}</span></div>
            </div>
            <div class="footer-box"><div class="thanks">خالص مع الشكر</div></div>
        </div>
    `;

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
// ===== تهيئة التطبيق =====
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تشغيل الميزان v3.0.0');

    // تهيئة المستخدمين
    initUsers();

    // تفعيل الترخيص التجريبي
    if (typeof activateDemoLicense === 'function') {
        activateDemoLicense();
    }

    // تحميل البيانات
    loadAllData();

    // تهيئة البيانات إذا كانت فارغة
    if (typeof seedData === 'function') {
        seedData();
    }

    // تحديث جميع الصفحات
    if (typeof refreshAllPages === 'function') {
        refreshAllPages();
    }

    // بدء النسخ الاحتياطي التلقائي
    if (typeof startAutoBackup === 'function') {
        startAutoBackup();
    }

    // تحديث الساعة
    updateClock();

    // تحديث صلاحيات الواجهة
    updateUIByPermissions();

    // التحقق من حالة الدخول
    if (localStorage.getItem('app_unlocked') === 'true') {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';

        // محاولة المزامنة مع Firebase
        setTimeout(() => {
            if (navigator.onLine && typeof syncFromFirebase === 'function') {
                syncFromFirebase();
            }
        }, 1000);
    }

    // إعداد مستمعي أحداث طرق الدفع
    document.querySelectorAll('.payment-methods').forEach(group => {
        group.querySelectorAll('label').forEach(label => {
            label.addEventListener('click', function() {
                group.querySelectorAll('label').forEach(l => l.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    });

    // تعيين التاريخ الحالي لحقول التاريخ
    const today = getTodayDate();
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input && !input.value) input.value = today;
    });

    console.log('✅ الميزان جاهز للاستخدام');
    console.log('🔒 كلمة المرور: 123456');
    console.log('🔑 اضغط 5 مرات على رقم الإصدار في الإعدادات لتفعيل زر توليد المفاتيح');
});

// ================================================================
// ===== دوال التوست والإشعارات =====
// ================================================================

// دالة إضافة تنبيه (للموديولات الأخرى)
function addAlert(title, desc, type = 'info') {
    if (!window.alerts) window.alerts = [];
    window.alerts.unshift({
        id: Date.now(),
        title: title,
        desc: desc,
        type: type,
        date: new Date().toISOString(),
        read: false
    });
    if (window.alerts.length > 100) window.alerts = window.alerts.slice(0, 100);
    saveAllData();
    if (typeof updateAlertsUI === 'function') updateAlertsUI();
}

// دوال التنبيهات
function updateAlertsUI() {
    if (!window.alerts) window.alerts = [];
    
    const unread = window.alerts.filter(a => !a.read).length;
    safeSetText('alertCount', unread);
    safeSetText('alertBadge', unread);

    const container = document.getElementById('alertsList');
    if (!container) return;

    const recent = window.alerts.slice(0, 3);
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="alert-item info">
                <div class="icon"><i class="fas fa-info-circle"></i></div>
                <div class="content"><div class="title">لا توجد تنبيهات</div><div class="desc">كل شيء على ما يرام</div></div>
            </div>
        `;
    } else {
        container.innerHTML = recent.map(a => `
            <div class="alert-item ${a.type}">
                <div class="icon"><i class="fas ${a.type === 'danger' ? 'fa-exclamation-triangle' : a.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i></div>
                <div class="content"><div class="title">${a.title}</div><div class="desc">${a.desc}</div></div>
                <div class="time">${new Date(a.date).toLocaleDateString('ar')}</div>
            </div>
        `).join('');
    }
}

function clearAllAlerts() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ تحديد جميع التنبيهات كمقروءة؟')) return;
    (window.alerts || []).forEach(a => a.read = true);
    saveAllData();
    updateAlertsUI();
    showToast('✅ تم تحديد الكل مقروء', 'success');
}

function markAlertRead(id) {
    const alert = (window.alerts || []).find(a => a.id === id);
    if (alert) { alert.read = true; saveAllData(); updateAlertsUI(); }
}

// دوال الكاشف (من remaining.js)
function renderCashier() {
    // هذه الدالة موجودة في remaining.js
    // نتحقق من وجودها
    if (typeof window.renderCashier === 'function') {
        window.renderCashier();
    }
}

function addCashierTransaction(type, amount, method, note) {
    if (typeof window.addCashierTransaction === 'function') {
        window.addCashierTransaction(type, amount, method, note);
    }
}

// دوال السندات (من bonds.js)
function renderBonds() {
    if (typeof window.renderBonds === 'function') {
        window.renderBonds();
    }
}

// دوال المصروفات (من expenses.js)
function renderExpenses() {
    if (typeof window.renderExpenses === 'function') {
        window.renderExpenses();
    }
}

// دوال العملاء (من customers.js)
function renderCustomers() {
    if (typeof window.renderCustomers === 'function') {
        window.renderCustomers();
    }
}

// دوال الموردين (من suppliers.js)
function renderSuppliers() {
    if (typeof window.renderSuppliers === 'function') {
        window.renderSuppliers();
    }
}

// دوال المنتجات (من products.js)
function renderProducts() {
    if (typeof window.renderProducts === 'function') {
        window.renderProducts();
    }
}

// دوال التدقيق (من audit.js)
function renderAudit() {
    if (typeof window.renderAudit === 'function') {
        window.renderAudit();
    }
}

// دوال الباركود (من qr.js)
function generateQRCode() {
    if (typeof window.generateQRCode === 'function') {
        window.generateQRCode();
    }
}

function startQRScanner() {
    if (typeof window.startQRScanner === 'function') {
        window.startQRScanner();
    }
}

function showQRShareText() {
    if (typeof window.showQRShareText === 'function') {
        window.showQRShareText();
    }
}

// ================================================================
// ===== دوال تحديث لوحة التحكم =====
// ================================================================

function updateDashboard() {
    if (typeof window.updateDashboard === 'function') {
        window.updateDashboard();
    }
}

function refreshDashboard() {
    if (typeof window.refreshDashboard === 'function') {
        window.refreshDashboard();
    }
}

function updateDashboardDetails() {
    if (typeof window.updateDashboardDetails === 'function') {
        window.updateDashboardDetails();
    }
}

console.log('📦 app.js - النسخة النهائية المستقرة');
console.log('📅 التاريخ:', new Date().toLocaleDateString('ar-EG'));
