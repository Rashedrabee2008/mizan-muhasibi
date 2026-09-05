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
let invoiceCounter = parseInt(localStorage.getItem('mizan_invoice_counter')) || 1;

function getNextInvoiceNumber() {
    const current = invoiceCounter;
    invoiceCounter++;
    localStorage.setItem('mizan_invoice_counter', invoiceCounter);
    return current;
}

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
// PERMISSIONS
// ================================================================

function isAdmin() { return currentUser.role === 'admin'; }
function canDelete() { return currentUser.role === 'admin'; }
function canEdit() { return currentUser.role === 'admin' || currentUser.role === 'manager'; }
function canAdd() { return currentUser.role !== 'viewer'; }
function canViewAudit() { return currentUser.role === 'admin'; }

// ================================================================
// UPDATE UI BY PERMISSIONS
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
    if (clock) clock.textContent = hours + ':' + minutes + ':' + seconds + ' ' + ampm;
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
        localStorage.removeItem('mizan_current_user');
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
        'sales': ['populateAllSelects', 'updateCustomerWhatsApp', 'updateSalesPrice'],
        'purchase': ['populateAllSelects', 'updateSupplierWhatsApp'],
        'returns': ['populateAllSelects'],
        'customer_statement': ['populateCustomerStatement', 'updateCustomerBalanceDisplay'],
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
// REFRESH ALL PAGES
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
        'updateSupplierWhatsApp', 'updateSalesPrice'
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
// ===== دوال فاتورة البيع (المضافة) =====
// ================================================================

// 1. تحديث سعر المنتج تلقائياً عند الاختيار
function updateSalesPrice() {
    const productSelect = document.getElementById('salesItemProduct');
    const priceInput = document.getElementById('salesItemPrice');
    const totalEl = document.getElementById('salesItemTotal');
    
    if (!productSelect || !priceInput) return;
    
    const productId = parseInt(productSelect.value);
    if (!productId) {
        priceInput.value = '';
        if (totalEl) totalEl.textContent = '0.00';
        return;
    }
    
    const product = window.products?.find(p => p.id === productId);
    if (product) {
        priceInput.value = product.sellPrice || 0;
        const qty = parseInt(document.getElementById('salesItemQty')?.value) || 1;
        if (totalEl) {
            totalEl.textContent = (qty * (product.sellPrice || 0)).toFixed(2);
        }
    } else {
        priceInput.value = '';
        if (totalEl) totalEl.textContent = '0.00';
    }
}

// 2. حساب الإجمالي أثناء الكتابة
function updateSalesItemTotal() {
    const qty = parseInt(document.getElementById('salesItemQty')?.value) || 0;
    const price = parseFloat(document.getElementById('salesItemPrice')?.value) || 0;
    const totalEl = document.getElementById('salesItemTotal');
    if (totalEl) {
        totalEl.textContent = (qty * price).toFixed(2);
    }
}

// 3. تحديث رقم واتساب العميل
function updateCustomerWhatsApp() {
    const select = document.getElementById('salesCustomerSelect');
    const input = document.getElementById('salesCustomer');
    const whatsappInput = document.getElementById('customerWhatsApp');
    const group = document.getElementById('customerWhatsAppGroup');
    
    if (!select || !input || !whatsappInput || !group) return;

    const selectedName = select.value || input.value;
    if (selectedName) {
        const customer = window.customers?.find(c => c.name === selectedName);
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

// 4. تحديث رصيد العميل
function updateCustomerBalanceDisplay() {
    const customerId = document.getElementById('salesCustomerSelect')?.value;
    const manualName = document.getElementById('salesCustomer')?.value;
    
    if (!customerId && !manualName) return;
    
    let customer = null;
    if (customerId) {
        customer = window.customers?.find(c => c.name === customerId);
    } else if (manualName) {
        customer = window.customers?.find(c => c.name === manualName);
    }
    
    if (!customer) {
        const balanceDisplay = document.getElementById('customerBalanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.textContent = '💰 الرصيد: 0.00';
            balanceDisplay.style.color = '#A89070';
        }
        return;
    }
    
    const totalSales = window.sales?.filter(s => s.customerId === customer.id)
        .reduce((sum, s) => sum + (s.total || 0), 0) || 0;
    
    const totalPaid = window.bonds?.filter(b => b.customerId === customer.id && b.status === 'paid')
        .reduce((sum, b) => sum + b.amount, 0) || 0;
    
    const balance = totalSales - totalPaid;
    
    const balanceDisplay = document.getElementById('customerBalanceDisplay');
    if (balanceDisplay) {
        balanceDisplay.textContent = `💰 رصيد ${customer.name}: ${balance.toFixed(2)}`;
        balanceDisplay.style.color = balance > 0 ? '#E06060' : '#2D8F5E';
    }
}

// 5. تحديث واتساب المورد
function updateSupplierWhatsApp() {
    const select = document.getElementById('purchaseSupplierSelect');
    const input = document.getElementById('purchaseSupplier');
    const whatsappInput = document.getElementById('supplierWhatsApp');
    const group = document.getElementById('supplierWhatsAppGroup');
    
    if (!select || !input || !whatsappInput || !group) return;

    const selectedName = select.value || input.value;
    if (selectedName) {
        const supplier = window.suppliers?.find(s => s.name === selectedName);
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

// جعل الدوال متاحة في النطاق العام
window.updateSalesPrice = updateSalesPrice;
window.updateSalesItemTotal = updateSalesItemTotal;
window.updateCustomerWhatsApp = updateCustomerWhatsApp;
window.updateCustomerWhatsAppManual = updateCustomerWhatsApp;
window.updateCustomerBalanceDisplay = updateCustomerBalanceDisplay;
window.updateSupplierWhatsApp = updateSupplierWhatsApp;
window.updateSupplierWhatsAppManual = updateSupplierWhatsApp;

// ================================================================
// WHATSAPP FUNCTIONS (إرسال الفاتورة)
// ================================================================

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

// ================================================================
// CLEAR ALL DATA
// ================================================================

function clearAllData() {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟ سيتم حذف كل شيء')) return;

    const keys = [
        'products', 'customers', 'suppliers', 'purchases', 'sales', 'returns',
        'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts',
        'permissions', 'companyData', 'backups', 'accounts', 'auditLog',
        'alerts', 'cashierHistory', 'inventoryAdjustments', 'users',
        'generated_keys', 'license', 'auto_restore', 'qr_data'
    ];
    
    let clearedCount = 0;
    for (let i = 0; i < keys.length; i++) {
        try {
            localStorage.removeItem('mizan_' + keys[i]);
            clearedCount++;
        } catch(e) {}
        
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
        else if (keys[i] === 'users') window.users = [];
    }

    try {
        localStorage.removeItem('mizan_generated_keys');
        localStorage.removeItem('mizan_license');
        localStorage.removeItem('mizan_auto_restore');
        localStorage.removeItem('mizan_qr_data');
        localStorage.removeItem('app_unlocked');
        localStorage.removeItem('mizan_current_user');
        localStorage.removeItem('mizan_demo_activated');
        localStorage.removeItem('mizan_invoice_counter');
    } catch(e) {}

    window.users = [
        { id: 1, username: 'مدير', role: 'admin', password: DEFAULT_PASSWORD },
        { id: 2, username: 'مشرف', role: 'manager', password: DEFAULT_PASSWORD },
        { id: 3, username: 'كاشير', role: 'cashier', password: DEFAULT_PASSWORD },
        { id: 4, username: 'مشاهد', role: 'viewer', password: DEFAULT_PASSWORD }
    ];
    localStorage.setItem('mizan_users', JSON.stringify(window.users));

    currentPassword = DEFAULT_PASSWORD;
    localStorage.setItem('app_password', DEFAULT_PASSWORD);

    currentUser = { username: 'مدير', role: 'admin' };
    localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));

    invoiceCounter = 1;
    localStorage.setItem('mizan_invoice_counter', '1');

    addAuditLog('delete', 'all', 'مسح جميع البيانات');

    setTimeout(() => {
        if (typeof seedData === 'function') seedData();
        if (typeof refreshAllPages === 'function') refreshAllPages();
        if (typeof populateAllSelects === 'function') populateAllSelects();
        updateUIByPermissions();
        updateClock();
    }, 200);

    showToast(`🗑️ تم مسح ${clearedCount} عنصر وإعادة تهيئة البيانات`, 'warning');
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
// SAVE AND LOAD DATA
// ================================================================

function saveAll() {
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
                    window[key] = Array.isArray(window[key]) ? [] : {};
                }
            } else {
                if (Array.isArray(window[key]) || key === 'users' || key === 'companyData') {
                    window[key] = Array.isArray(window[key]) ? [] : {};
                }
            }
        });
        
        const userData = localStorage.getItem('mizan_current_user');
        if (userData) {
            try {
                currentUser = JSON.parse(userData);
            } catch (e) {
                currentUser = { username: 'مدير', role: 'admin' };
            }
        }
        
        const pass = localStorage.getItem('app_password');
        if (pass) {
            currentPassword = pass;
        }
        
    } catch (e) {
        console.warn('⚠️ خطأ في تحميل البيانات:', e);
    }
}

// ================================================================
// INIT USERS
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

// ================================================================
// SEED DATA
// ================================================================

function seedData() {
    loadAllData();
    
    const hasData = localStorage.getItem('mizan_products') && 
                   JSON.parse(localStorage.getItem('mizan_products') || '[]').length > 0;
    
    if (hasData) {
        console.log('📦 البيانات موجودة مسبقاً');
        return;
    }

    console.log('🔄 تهيئة البيانات التجريبية...');

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

    window.products = [
        { id: 1, name: 'هاتف ذكي X100', buyPrice: 8000, sellPrice: 10000, min: 5, barcode: '1234567890123' },
        { id: 2, name: 'سماعة لاسلكية', buyPrice: 500, sellPrice: 750, min: 10, barcode: '1234567890124' },
        { id: 3, name: 'شاحن سريع 65W', buyPrice: 300, sellPrice: 450, min: 15, barcode: '1234567890125' },
        { id: 4, name: 'حافظة هاتف', buyPrice: 50, sellPrice: 100, min: 20, barcode: '1234567890126' },
        { id: 5, name: 'كابل USB-C', buyPrice: 80, sellPrice: 150, min: 25, barcode: '1234567890127' },
        { id: 6, name: 'بطارية خارجية', buyPrice: 400, sellPrice: 600, min: 8, barcode: '1234567890128' }
    ];

    window.warehouses = [
        { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
        { id: 2, name: 'مخزن المحل', type: 'محل', address: 'الإسكندرية' },
        { id: 3, name: 'مخزن التوزيع', type: 'فرعي', address: 'الجيزة' }
    ];

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

    window.customers = [
        { id: 1, name: 'أحمد محمد', phone: '01234567890', whatsapp: '01011993799', email: 'ahmed@test.com', address: 'القاهرة', active: true },
        { id: 2, name: 'سارة علي', phone: '01123456789', whatsapp: '01158767633', email: 'sara@test.com', address: 'الإسكندرية', active: true },
        { id: 3, name: 'محمد إبراهيم', phone: '01098765432', whatsapp: '01098765432', email: 'mohamed@test.com', address: 'الجيزة', active: true }
    ];

    window.suppliers = [
        { id: 1, name: 'شركة الاتصالات المصرية', phone: '0234567890', whatsapp: '01158767633', email: 'info@telecom.com', address: 'القاهرة', active: true },
        { id: 2, name: 'مستورد الإلكترونيات', phone: '0223456789', whatsapp: '01234567890', email: 'info@electronics.com', address: 'الإسكندرية', active: true }
    ];

    window.accounts = [
        { id: 1, name: 'أصول', type: 'assets', parentId: null },
        { id: 2, name: 'خصوم', type: 'liabilities', parentId: null },
        { id: 3, name: 'حقوق ملكية', type: 'equity', parentId: null },
        { id: 4, name: 'إيرادات', type: 'revenue', parentId: null },
        { id: 5, name: 'مصروفات', type: 'expenses', parentId: null }
    ];

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

    window.sales = [{
        id: Date.now(),
        number: getNextInvoiceNumber(),
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

    window.purchases = [{
        id: Date.now() + 1,
        number: getNextInvoiceNumber(),
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

    window.expenses = [{
        id: Date.now() + 2,
        note: 'فاتورة كهرباء المحل',
        amount: 500,
        date: getTodayDate(),
        method: 'نقدي'
    }];

    saveAll();
    console.log('✅ تم تهيئة البيانات التجريبية بنجاح');
}

// ================================================================
// ===== دوال الصفحات الرئيسية =====
// ================================================================

// دوال الكاشف
function renderCashier() {
    if (typeof window.renderCashier === 'function' && window.renderCashier !== renderCashier) {
        window.renderCashier();
    } else if (typeof window.cashierRender === 'function') {
        window.cashierRender();
    } else {
        console.warn('⚠️ دالة renderCashier غير موجودة');
        const badge = document.getElementById('cashierStatusBadge');
        if (badge) {
            badge.textContent = '🔴 مغلق';
            badge.style.background = '#E06060';
        }
    }
}

function addCashierTransaction(type, amount, method, note) {
    if (typeof window.addCashierTransaction === 'function') {
        window.addCashierTransaction(type, amount, method, note);
    }
}

function cashierOpenDay() {
    if (typeof window.cashierOpenDay === 'function') {
        window.cashierOpenDay();
    } else {
        showToast('⚠️ دالة فتح اليوم غير موجودة', 'error');
    }
}

function cashierCloseDay() {
    if (typeof window.cashierCloseDay === 'function') {
        window.cashierCloseDay();
    } else {
        showToast('⚠️ دالة إغلاق اليوم غير موجودة', 'error');
    }
}

function cashierPrintReport() {
    if (typeof window.cashierPrintReport === 'function') {
        window.cashierPrintReport();
    } else {
        showToast('⚠️ دالة طباعة التقرير غير موجودة', 'error');
    }
}

// دوال المنتجات
function renderProducts() {
    if (typeof window.renderProducts === 'function' && window.renderProducts !== renderProducts) {
        window.renderProducts();
    } else {
        console.warn('⚠️ دالة renderProducts غير موجودة');
        const container = document.getElementById('productList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><span>لا توجد منتجات</span></div>`;
        }
    }
}

function addProduct() {
    if (typeof window.addProduct === 'function') {
        window.addProduct();
    } else {
        showToast('⚠️ دالة إضافة منتج غير موجودة', 'error');
    }
}

// دوال العملاء
function renderCustomers() {
    if (typeof window.renderCustomers === 'function' && window.renderCustomers !== renderCustomers) {
        window.renderCustomers();
    } else {
        console.warn('⚠️ دالة renderCustomers غير موجودة');
    }
}

function addCustomer() {
    if (typeof window.addCustomer === 'function') {
        window.addCustomer();
    } else {
        showToast('⚠️ دالة إضافة عميل غير موجودة', 'error');
    }
}

// دوال الموردين
function renderSuppliers() {
    if (typeof window.renderSuppliers === 'function' && window.renderSuppliers !== renderSuppliers) {
        window.renderSuppliers();
    } else {
        console.warn('⚠️ دالة renderSuppliers غير موجودة');
    }
}

function addSupplier() {
    if (typeof window.addSupplier === 'function') {
        window.addSupplier();
    } else {
        showToast('⚠️ دالة إضافة مورد غير موجودة', 'error');
    }
}

// دوال المصروفات
function renderExpenses() {
    if (typeof window.renderExpenses === 'function' && window.renderExpenses !== renderExpenses) {
        window.renderExpenses();
    } else {
        console.warn('⚠️ دالة renderExpenses غير موجودة');
    }
}

function addExpense() {
    if (typeof window.addExpense === 'function') {
        window.addExpense();
    } else {
        showToast('⚠️ دالة إضافة مصروف غير موجودة', 'error');
    }
}

// دوال الخزنة
function renderTreasury() {
    if (typeof window.renderTreasury === 'function' && window.renderTreasury !== renderTreasury) {
        window.renderTreasury();
    } else {
        console.warn('⚠️ دالة renderTreasury غير موجودة');
    }
}

function addTreasuryTransaction() {
    if (typeof window.addTreasuryTransaction === 'function') {
        window.addTreasuryTransaction();
    } else {
        showToast('⚠️ دالة إضافة حركة خزنة غير موجودة', 'error');
    }
}

// دوال السندات
function renderBonds() {
    if (typeof window.renderBonds === 'function' && window.renderBonds !== renderBonds) {
        window.renderBonds();
    } else {
        console.warn('⚠️ دالة renderBonds غير موجودة');
    }
}

function addBond() {
    if (typeof window.addBond === 'function') {
        window.addBond();
    } else {
        showToast('⚠️ دالة إضافة سند غير موجودة', 'error');
    }
}

// دوال المخازن
function renderWarehouses() {
    if (typeof window.renderWarehouses === 'function' && window.renderWarehouses !== renderWarehouses) {
        window.renderWarehouses();
    } else {
        console.warn('⚠️ دالة renderWarehouses غير موجودة');
        const container = document.getElementById('warehouseList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>`;
        }
    }
}

function addWarehouse() {
    if (typeof window.addWarehouse === 'function') {
        window.addWarehouse();
    } else {
        showToast('⚠️ دالة إضافة مخزن غير موجودة', 'error');
    }
}

function editWarehouse(id) {
    if (typeof window.editWarehouse === 'function') {
        window.editWarehouse(id);
    } else {
        showToast('⚠️ دالة تعديل مخزن غير موجودة', 'error');
    }
}

function deleteWarehouse(id) {
    if (typeof window.deleteWarehouse === 'function') {
        window.deleteWarehouse(id);
    } else {
        showToast('⚠️ دالة حذف مخزن غير موجودة', 'error');
    }
}

// دوال الحسابات
function renderAccounts() {
    if (typeof window.renderAccounts === 'function' && window.renderAccounts !== renderAccounts) {
        window.renderAccounts();
    } else {
        console.warn('⚠️ دالة renderAccounts غير موجودة');
        const container = document.getElementById('accountList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-sitemap"></i><span>لا توجد حسابات</span></div>`;
        }
    }
}

function addAccount() {
    if (typeof window.addAccount === 'function') {
        window.addAccount();
    } else {
        showToast('⚠️ دالة إضافة حساب غير موجودة', 'error');
    }
}

function populateAccountParents() {
    if (typeof window.populateAccountParents === 'function') {
        window.populateAccountParents();
    }
}

// دوال المستخدمين
function renderUsers() {
    if (typeof window.renderUsers === 'function' && window.renderUsers !== renderUsers) {
        window.renderUsers();
    } else {
        console.warn('⚠️ دالة renderUsers غير موجودة');
        const container = document.getElementById('userList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا توجد مستخدمين</span></div>`;
        }
    }
}

function addUser() {
    if (typeof window.addUser === 'function') {
        window.addUser();
    } else {
        showToast('⚠️ دالة إضافة مستخدم غير موجودة', 'error');
    }
}

function deleteUser(id) {
    if (typeof window.deleteUser === 'function') {
        window.deleteUser(id);
    } else {
        showToast('⚠️ دالة حذف مستخدم غير موجودة', 'error');
    }
}

function editUser(id) {
    if (typeof window.editUser === 'function') {
        window.editUser(id);
    } else {
        showToast('⚠️ دالة تعديل مستخدم غير موجودة', 'error');
    }
}

function switchUser() {
    if (typeof window.switchUser === 'function') {
        window.switchUser();
    } else {
        showToast('⚠️ دالة تبديل مستخدم غير موجودة', 'error');
    }
}

function changeUserPassword() {
    if (typeof window.changeUserPassword === 'function') {
        window.changeUserPassword();
    } else {
        showToast('⚠️ دالة تغيير كلمة المرور غير موجودة', 'error');
    }
}

// دوال الإذونات
function renderPermissions() {
    if (typeof window.renderPermissions === 'function') {
        window.renderPermissions();
    } else {
        console.warn('⚠️ دالة renderPermissions غير موجودة');
        const container = document.getElementById('permissionList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد إذونات</span></div>`;
        }
    }
}

function addPermission() {
    if (typeof window.addPermission === 'function') {
        window.addPermission();
    } else {
        showToast('⚠️ دالة إضافة إذن غير موجودة', 'error');
    }
}

function executePermission(id) {
    if (typeof window.executePermission === 'function') {
        window.executePermission(id);
    } else {
        showToast('⚠️ دالة تنفيذ إذن غير موجودة', 'error');
    }
}

function deletePermission(id) {
    if (typeof window.deletePermission === 'function') {
        window.deletePermission(id);
    } else {
        showToast('⚠️ دالة حذف إذن غير موجودة', 'error');
    }
}

function filterPermissions(filter) {
    if (typeof window.filterPermissions === 'function') {
        window.filterPermissions(filter);
    }
}

// دوال الفواتير
function renderSales() {
    if (typeof window.renderSales === 'function' && window.renderSales !== renderSales) {
        window.renderSales();
    } else {
        console.warn('⚠️ دالة renderSales غير موجودة');
        const container = document.getElementById('salesList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد فواتير</span></div>`;
        }
    }
}

function renderAllPurchases() {
    if (typeof window.renderAllPurchases === 'function' && window.renderAllPurchases !== renderAllPurchases) {
        window.renderAllPurchases();
    } else {
        console.warn('⚠️ دالة renderAllPurchases غير موجودة');
        const container = document.getElementById('purchaseList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير</span></div>`;
        }
    }
}

function renderAllReturns() {
    if (typeof window.renderAllReturns === 'function' && window.renderAllReturns !== renderAllReturns) {
        window.renderAllReturns();
    } else {
        console.warn('⚠️ دالة renderAllReturns غير موجودة');
        const container = document.getElementById('returnList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`;
        }
    }
}

function renderAllInvoices() {
    if (typeof window.renderAllInvoices === 'function' && window.renderAllInvoices !== renderAllInvoices) {
        window.renderAllInvoices();
    } else {
        console.warn('⚠️ دالة renderAllInvoices غير موجودة');
        const container = document.getElementById('allInvoicesList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>لا توجد فواتير</span></div>`;
        }
    }
}

// دوال النسخ الاحتياطي
function createBackup() {
    if (typeof window.createBackup === 'function') {
        window.createBackup();
    } else {
        showToast('⚠️ دالة إنشاء نسخة احتياطية غير موجودة', 'error');
    }
}

function renderBackups() {
    if (typeof window.renderBackups === 'function' && window.renderBackups !== renderBackups) {
        window.renderBackups();
    } else {
        console.warn('⚠️ دالة renderBackups غير موجودة');
        const container = document.getElementById('backupList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><span>لا توجد نسخ</span></div>`;
        }
    }
}

function restoreBackup(event) {
    if (typeof window.restoreBackup === 'function') {
        window.restoreBackup(event);
    } else {
        showToast('⚠️ دالة استعادة النسخة غير موجودة', 'error');
    }
}

// دوال الباركود
function generateQRCode() {
    if (typeof window.generateQRCode === 'function') {
        window.generateQRCode();
    } else {
        showToast('⚠️ دالة توليد QR غير موجودة', 'error');
    }
}

function startQRScanner() {
    if (typeof window.startQRScanner === 'function') {
        window.startQRScanner();
    } else {
        showToast('⚠️ دالة مسح QR غير موجودة', 'error');
    }
}

function showQRShareText() {
    if (typeof window.showQRShareText === 'function') {
        window.showQRShareText();
    } else {
        showToast('⚠️ دالة مشاركة النص غير موجودة', 'error');
    }
}

// دوال الشركة
function loadCompanyData() {
    if (typeof window.loadCompanyData === 'function' && window.loadCompanyData !== loadCompanyData) {
        window.loadCompanyData();
    } else {
        console.warn('⚠️ دالة loadCompanyData غير موجودة');
    }
}

function saveCompanyData() {
    if (typeof window.saveCompanyData === 'function') {
        window.saveCompanyData();
    } else {
        showToast('⚠️ دالة حفظ بيانات الشركة غير موجودة', 'error');
    }
}

function uploadLogo(event) {
    if (typeof window.uploadLogo === 'function') {
        window.uploadLogo(event);
    } else {
        showToast('⚠️ دالة رفع الشعار غير موجودة', 'error');
    }
}

// دوال التدقيق
function renderAudit() {
    if (typeof window.renderAudit === 'function' && window.renderAudit !== renderAudit) {
        window.renderAudit();
    } else {
        console.warn('⚠️ دالة renderAudit غير موجودة');
        const container = document.getElementById('auditList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد نشاطات</span></div>`;
        }
    }
}

function clearAudit() {
    if (typeof window.clearAudit === 'function') {
        window.clearAudit();
    } else {
        showToast('⚠️ دالة مسح التدقيق غير موجودة', 'error');
    }
}

// دوال التنبيهات
function addAlert(title, desc, type = 'info') {
    if (typeof window.addAlert === 'function') {
        window.addAlert(title, desc, type);
    } else {
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
        saveAll();
        updateAlertsUI();
    }
}

function updateAlertsUI() {
    if (typeof window.updateAlertsUI === 'function' && window.updateAlertsUI !== updateAlertsUI) {
        window.updateAlertsUI();
    } else {
        if (!window.alerts) window.alerts = [];
        const unread = window.alerts.filter(a => !a.read).length;
        safeSetText('alertCount', unread);
        safeSetText('alertBadge', unread);
    }
}

function clearAllAlerts() {
    if (typeof window.clearAllAlerts === 'function') {
        window.clearAllAlerts();
    } else {
        if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
        if (!confirm('⚠️ تحديد جميع التنبيهات كمقروءة؟')) return;
        (window.alerts || []).forEach(a => a.read = true);
        saveAll();
        updateAlertsUI();
        showToast('✅ تم تحديد الكل مقروء', 'success');
    }
}

function markAlertRead(id) {
    if (typeof window.markAlertRead === 'function') {
        window.markAlertRead(id);
    } else {
        const alert = (window.alerts || []).find(a => a.id === id);
        if (alert) { alert.read = true; saveAll(); updateAlertsUI(); }
    }
}

// دوال المحاسبات
function updateAccounting() {
    if (typeof window.updateAccounting === 'function' && window.updateAccounting !== updateAccounting) {
        window.updateAccounting();
    } else {
        const totalSales = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
        const totalPurchases = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
        safeSetText('accountingSales', totalSales.toFixed(2));
        safeSetText('accountingPurchases', totalPurchases.toFixed(2));
        safeSetText('accountingProfit', (totalSales - totalPurchases).toFixed(2));
    }
}

function showLedger() {
    if (typeof window.showLedger === 'function') {
        window.showLedger();
    } else {
        const result = document.getElementById('accountingResult');
        if (result) {
            const totalSales = (window.sales || []).reduce((s, i) => s + (i.total || 0), 0);
            const totalPurchases = (window.purchases || []).reduce((s, i) => s + (i.total || 0), 0);
            result.innerHTML = `<div class="accounting-detail-content">
                <h4 style="color:#C9A94E;">📒 دفتر الأستاذ</h4>
                <div class="detail-row"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value">${totalSales.toFixed(2)}</span></div>
                <div class="detail-row"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value">${totalPurchases.toFixed(2)}</span></div>
                <div class="detail-row"><span class="detail-label">صافي الربح</span><span class="detail-value">${(totalSales - totalPurchases).toFixed(2)}</span></div>
            </div>`;
        }
    }
}

function showAudit() { showLedger(); }
function showTrialBalance() { showLedger(); }
function showIncomeStatement() { showLedger(); }
function showBalanceSheet() { showLedger(); }
function showCashFlow() { showLedger(); }

// دوال التقارير
function generateReport(type) {
    if (typeof window.generateReport === 'function' && window.generateReport !== generateReport) {
        window.generateReport(type);
    } else {
        const result = document.getElementById('reportResult');
        if (!result) return;
        result.innerHTML = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">📊 تقرير ${type}</h4></div>`;
    }
}

function generateProfitAnalysis() {
    if (typeof window.generateProfitAnalysis === 'function') {
        window.generateProfitAnalysis();
    } else {
        const container = document.getElementById('profitAnalysisResult');
        if (container) {
            container.innerHTML = `<div class="accounting-detail-content">
                <h4 style="color:#C9A94E;">📊 تحليل الأرباح</h4>
                <div class="detail-row"><span class="detail-label">عدد المنتجات</span><span class="detail-value">${(window.products || []).length}</span></div>
            </div>`;
        }
    }
}

// دوال كشوفات العملاء والموردين
function generateCustomerStatement() {
    if (typeof window.generateCustomerStatement === 'function') {
        window.generateCustomerStatement();
    } else {
        showToast('⚠️ دالة كشف حساب العميل غير موجودة', 'error');
    }
}

function generateCustomerDetailedStatement() {
    if (typeof window.generateCustomerDetailedStatement === 'function') {
        window.generateCustomerDetailedStatement();
    } else {
        generateCustomerStatement();
    }
}

function generateSupplierStatement() {
    if (typeof window.generateSupplierStatement === 'function') {
        window.generateSupplierStatement();
    } else {
        showToast('⚠️ دالة كشف حساب المورد غير موجودة', 'error');
    }
}

function generateSupplierDetailedStatement() {
    if (typeof window.generateSupplierDetailedStatement === 'function') {
        window.generateSupplierDetailedStatement();
    } else {
        generateSupplierStatement();
    }
}

// دوال تحديث لوحة التحكم
function updateDashboard() {
    if (typeof window.updateDashboard === 'function' && window.updateDashboard !== updateDashboard) {
        window.updateDashboard();
    } else {
        console.warn('⚠️ دالة updateDashboard غير موجودة');
        const totalSales = (window.sales || []).reduce((s, inv) => s + (inv.total || 0), 0);
        const totalPurchases = (window.purchases || []).reduce((s, inv) => s + (inv.total || 0), 0);
        safeSetText('dashTotalSales', totalSales.toFixed(2));
        safeSetText('dashTotalPurchases', totalPurchases.toFixed(2));
        safeSetText('dashTotalProducts', (window.products || []).length);
        safeSetText('dashTotalCustomers', (window.customers || []).length);
        safeSetText('dashNetProfit', (totalSales - totalPurchases).toFixed(2));
    }
}

function refreshDashboard() {
    if (typeof window.refreshDashboard === 'function') {
        window.refreshDashboard();
    } else {
        updateDashboard();
    }
}

function updateDashboardDetails() {
    if (typeof window.updateDashboardDetails === 'function') {
        window.updateDashboardDetails();
    }
}

// دوال تسوية المخزون
function populateAdjustmentProducts() {
    if (typeof window.populateAdjustmentProducts === 'function') {
        window.populateAdjustmentProducts();
    }
}

function renderAdjustmentHistory() {
    if (typeof window.renderAdjustmentHistory === 'function') {
        window.renderAdjustmentHistory();
    }
}

function updateAdjustmentDateTime() {
    if (typeof window.updateAdjustmentDateTime === 'function') {
        window.updateAdjustmentDateTime();
    }
}

// دوال السحابة (Firebase)
function syncToFirebase() {
    const badge = document.getElementById('headerBadge');
    if (!badge) return;

    if (!navigator.onLine) {
        showToast('⚠️ لا يوجد اتصال بالإنترنت، سيتم المزامنة لاحقاً', 'warning');
        badge.textContent = '📴 غير متصل';
        badge.className = 'badge';
        saveAll();
        return;
    }

    badge.textContent = '⏳ جاري...';
    badge.className = 'badge syncing';

    try {
        saveAll();
        if (typeof firebase !== 'undefined' && firebase.database) {
            const data = getSyncData();
            firebase.database().ref('mizan_app_data').set(data)
                .then(() => {
                    badge.textContent = '☁️ تم المزامنة';
                    badge.className = 'badge synced';
                    showToast('☁️ تم رفع البيانات للسحابة', 'success');
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

function getBackupData() {
    return getSyncData();
}

function restoreBackupData(data) {
    applySyncData(data);
    showToast('✅ تم استعادة البيانات بنجاح', 'success');
}

function createAutoBackup() {
    if (typeof window.createAutoBackup === 'function') {
        window.createAutoBackup();
    } else {
        const data = getSyncData();
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
        saveAll();
        renderBackups();
    }
}

// ================================================================
// دوال فاتورة البيع - إضافة الأصناف
// ================================================================

window.salesItems = [];
window.purchaseItems = [];
window.returnItems = [];

function addSalesItem() {
    const productSelect = document.getElementById('salesItemProduct');
    const qtyInput = document.getElementById('salesItemQty');
    const priceInput = document.getElementById('salesItemPrice');
    
    if (!productSelect || !qtyInput || !priceInput) {
        showToast('⚠️ عناصر الإدخال غير موجودة', 'error');
        return;
    }
    
    const productId = parseInt(productSelect.value);
    const qty = parseInt(qtyInput.value) || 1;
    const price = parseFloat(priceInput.value) || 0;
    
    if (!productId) { 
        showToast('⚠️ اختر منتجاً', 'error'); 
        return; 
    }
    if (qty <= 0) { 
        showToast('⚠️ الكمية يجب أن تكون أكبر من 0', 'error'); 
        return; 
    }
    if (price <= 0) { 
        showToast('⚠️ أدخل سعراً صحيحاً', 'error'); 
        return; 
    }
    
    const product = window.products?.find(p => p.id === productId);
    if (!product) { 
        showToast('⚠️ المنتج غير موجود', 'error'); 
        return; 
    }
    
    const total = qty * price;
    
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
            total: total
        });
    }
    
    renderSalesItems();
    
    productSelect.value = '';
    qtyInput.value = '1';
    priceInput.value = '';
    document.getElementById('salesItemTotal').textContent = '0.00';
    
    showToast(`✅ تم إضافة ${product.name}`, 'success');
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
                <td style="text-align:right;">${item.productName}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:center;">${item.price.toFixed(2)}</td>
                <td style="text-align:center;color:#C9A94E;font-weight:700;">${item.total.toFixed(2)}</td>
                <td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="removeSalesItem(${index})" style="padding:2px 6px;font-size:10px;"><i class="fas fa-times"></i></button></td>
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
    if (window.salesItems.length === 0) { 
        showToast('⚠️ أضف أصنافاً أولاً', 'error'); 
        return; 
    }
    
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
    
    const customerObj = window.customers?.find(c => c.name === customer);
    if (customerObj) sale.customerId = customerObj.id;
    
    if (!window.sales) window.sales = [];
    window.sales.push(sale);
    
    window.salesItems.forEach(item => {
        const wp = window.warehouseProducts?.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty -= item.qty;
        }
    });
    
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

// دوال الشراء
function addPurchaseItem() {
    const productSelect = document.getElementById('purchaseItemProduct');
    const qtyInput = document.getElementById('purchaseItemQty');
    const priceInput = document.getElementById('purchaseItemPrice');
    
    if (!productSelect || !qtyInput || !priceInput) {
        showToast('⚠️ عناصر الإدخال غير موجودة', 'error');
        return;
    }
    
    const productId = parseInt(productSelect.value);
    const qty = parseInt(qtyInput.value) || 1;
    const price = parseFloat(priceInput.value) || 0;
    
    if (!productId) { showToast('⚠️ اختر منتجاً', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ الكمية يجب أن تكون أكبر من 0', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعراً صحيحاً', 'error'); return; }
    
    const product = window.products?.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }
    
    const total = qty * price;
    
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
            total: total
        });
    }
    
    renderPurchaseItems();
    productSelect.value = '';
    qtyInput.value = '1';
    priceInput.value = '';
    
    showToast(`✅ تم إضافة ${product.name}`, 'success');
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
                <td style="text-align:right;">${item.productName}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:center;">${item.price.toFixed(2)}</td>
                <td style="text-align:center;color:#E06060;font-weight:700;">${item.total.toFixed(2)}</td>
                <td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="removePurchaseItem(${index})" style="padding:2px 6px;font-size:10px;"><i class="fas fa-times"></i></button></td>
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
    if (window.purchaseItems.length === 0) { 
        showToast('⚠️ أضف أصنافاً أولاً', 'error'); 
        return; 
    }
    
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
    
    const supplierObj = window.suppliers?.find(s => s.name === supplier);
    if (supplierObj) purchase.supplierId = supplierObj.id;
    
    if (!window.purchases) window.purchases = [];
    window.purchases.push(purchase);
    
    window.purchaseItems.forEach(item => {
        const wp = window.warehouseProducts?.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty += item.qty;
        } else {
            if (!window.warehouseProducts) window.warehouseProducts = [];
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

// دوال المرتجع
function addReturnItem() {
    const productSelect = document.getElementById('returnItemProduct');
    const qtyInput = document.getElementById('returnItemQty');
    const priceInput = document.getElementById('returnItemPrice');
    
    if (!productSelect || !qtyInput || !priceInput) {
        showToast('⚠️ عناصر الإدخال غير موجودة', 'error');
        return;
    }
    
    const productId = parseInt(productSelect.value);
    const qty = parseInt(qtyInput.value) || 1;
    const price = parseFloat(priceInput.value) || 0;
    
    if (!productId) { showToast('⚠️ اختر منتجاً', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ الكمية يجب أن تكون أكبر من 0', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعراً صحيحاً', 'error'); return; }
    
    const product = window.products?.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }
    
    const total = qty * price;
    
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
            total: total
        });
    }
    
    renderReturnItems();
    productSelect.value = '';
    qtyInput.value = '1';
    priceInput.value = '';
    
    showToast(`✅ تم إضافة ${product.name} للمرتجع`, 'success');
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
                <td style="text-align:right;">${item.productName}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:center;">${item.price.toFixed(2)}</td>
                <td style="text-align:center;color:#E6A830;font-weight:700;">${item.total.toFixed(2)}</td>
                <td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="removeReturnItem(${index})" style="padding:2px 6px;font-size:10px;"><i class="fas fa-times"></i></button></td>
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
    if (window.returnItems.length === 0) { 
        showToast('⚠️ أضف أصنافاً أولاً', 'error'); 
        return; 
    }
    
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
    
    const customerObj = window.customers?.find(c => c.name === customer);
    if (customerObj) returnInvoice.customerId = customerObj.id;
    
    if (!window.returns) window.returns = [];
    window.returns.push(returnInvoice);
    
    window.returnItems.forEach(item => {
        const wp = window.warehouseProducts?.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
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

// ================================================================
// DOM READY
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تشغيل الميزان v3.0.0');

    if (typeof initUsers === 'function') initUsers();
    if (typeof activateDemoLicense === 'function') activateDemoLicense();
    
    loadAllData();
    if (typeof seedData === 'function') seedData();
    if (typeof refreshAllPages === 'function') refreshAllPages();
    if (typeof startAutoBackup === 'function') startAutoBackup();
    updateClock();
    updateUIByPermissions();

    // ربط أحداث الإدخال للإجمالي التلقائي
    const qtyInput = document.getElementById('salesItemQty');
    const priceInput = document.getElementById('salesItemPrice');
    if (qtyInput) qtyInput.addEventListener('input', updateSalesItemTotal);
    if (priceInput) priceInput.addEventListener('input', updateSalesItemTotal);

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

    if (localStorage.getItem('app_unlocked') === 'true') {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';
    }

    console.log('✅ الميزان v3.0.0 - نظام محاسبة متكامل');
    console.log('🔒 كلمة المرور: 123456');
    console.log('🔑 اضغط 5 مرات على رقم الإصدار في الإعدادات لتفعيل زر توليد المفاتيح');
    console.log('💡 لمسح جميع البيانات: اذهب إلى الإعدادات > مسح البيانات');
});

console.log('📦 app.js - النسخة النهائية المستقرة');
console.log('📅 التاريخ:', new Date().toLocaleDateString('ar-EG'));
