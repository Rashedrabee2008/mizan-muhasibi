// ================================================================
// app.js - التطبيق الرئيسي (الملف الكامل)
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

// ===== رقم الفاتورة المسلسل =====
let invoiceCounter = parseInt(localStorage.getItem('mizan_invoice_counter')) || 1;

function getNextInvoiceNumber() {
    const current = invoiceCounter;
    invoiceCounter++;
    localStorage.setItem('mizan_invoice_counter', invoiceCounter);
    return current;
}

// ================================================================
// HELPER FUNCTIONS (مع الحماية من الأخطاء)
// ================================================================

function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    } else {
        // تجاهل الخطأ بدل ما يوقف التطبيق
        console.warn('⚠️ عنصر غير موجود:', id);
    }
}

function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value;
    } else {
        console.warn('⚠️ عنصر غير موجود:', id);
    }
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
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
// DATA MANAGEMENT
// ================================================================

function getData(key, def = []) {
    try {
        const d = localStorage.getItem('mizan_' + key);
        if (d) {
            const parsed = JSON.parse(d);
            const arrayKeys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses', 
                              'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'backups', 
                              'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'];
            if (arrayKeys.includes(key) && !Array.isArray(parsed)) {
                return def;
            }
            return parsed;
        }
        return def;
    } catch (e) {
        console.warn('⚠️ خطأ في قراءة ' + key + ':', e);
        return def;
    }
}

function setData(key, data) {
    try {
        localStorage.setItem('mizan_' + key, JSON.stringify(data));
    } catch (e) {
        console.warn('⚠️ خطأ في حفظ ' + key + ':', e);
    }
}

function saveAll() {
    try {
        setData('products', window.products);
        setData('customers', window.customers);
        setData('suppliers', window.suppliers);
        setData('purchases', window.purchases);
        setData('sales', window.sales);
        setData('returns', window.returns);
        setData('expenses', window.expenses);
        setData('treasury', window.treasury);
        setData('bonds', window.bonds);
        setData('warehouses', window.warehouses);
        setData('warehouseProducts', window.warehouseProducts);
        setData('permissions', window.permissions);
        setData('companyData', window.companyData);
        setData('backups', window.backups);
        setData('accounts', window.accounts);
        setData('auditLog', window.auditLog);
        setData('alerts', window.alerts);
        setData('cashierHistory', window.cashierHistory);
        setData('inventoryAdjustments', window.inventoryAdjustments);
        setData('users', window.users);
        
        localStorage.setItem('mizan_auto_restore', JSON.stringify({
            products: window.products, 
            customers: window.customers, 
            suppliers: window.suppliers, 
            purchases: window.purchases, 
            sales: window.sales, 
            returns: window.returns,
            expenses: window.expenses, 
            treasury: window.treasury, 
            bonds: window.bonds, 
            warehouses: window.warehouses,
            warehouseProducts: window.warehouseProducts,
            permissions: window.permissions, 
            companyData: window.companyData, 
            backups: window.backups, 
            accounts: window.accounts, 
            auditLog: window.auditLog, 
            alerts: window.alerts, 
            cashierHistory: window.cashierHistory,
            inventoryAdjustments: window.inventoryAdjustments, 
            users: window.users,
            savedAt: Date.now()
        }));
        
        if (typeof checkLowStockAlert === 'function') checkLowStockAlert();
    } catch (e) {
        console.warn('⚠️ خطأ في الحفظ:', e);
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
// LICENSE FUNCTIONS
// ================================================================

function decodeLicenseKey(licenseKey) {
    try {
        if (!licenseKey) return null;
        licenseKey = licenseKey.trim();
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
        console.warn('⚠️ خطأ في فك التشفير:', err);
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
    try {
        const decoded = decodeLicenseKey(DEMO_LICENSE_KEY);
        if (decoded) {
            saveLicense({
                licenseKey: DEMO_LICENSE_KEY,
                customerName: decoded.customerName,
                expiryDate: decoded.expiryDate,
                activatedAt: new Date().toISOString()
            });
            localStorage.setItem('mizan_demo_activated', 'true');
            console.log('✅ تم تفعيل الترخيص التجريبي');
            updateLicenseUI();
            return true;
        }
    } catch (err) {
        console.warn('⚠️ خطأ في تفعيل الترخيص:', err);
    }
    return false;
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
    showToast('✅ تم تفعيل الترخيص بنجاح', 'success');
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
    showToast(`✅ تم توليد مفتاح للعميل ${customerName} - ${amount} جنيه`, 'success');
    addAuditLog('add', 'license', `توليد مفتاح للعميل: ${customerName} - ${amount} جنيه`);
}

function copyLicenseKey() {
    const keyText = document.getElementById('genKey')?.textContent;
    if (!keyText) {
        showToast('⚠️ لا يوجد مفتاح للنسخ', 'error');
        return;
    }
    copyToClipboard(keyText);
    showToast('📋 تم نسخ المفتاح', 'success');
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
            showToast('🔑 تم تفعيل زر توليد المفاتيح! اضغط عليه للذهاب لصفحة التوليد', 'success');

            setTimeout(() => {
                versionClickCount = 0;
                if (btn) {
                    btn.style.display = 'none';
                    btn.style.animation = 'none';
                }
            }, 30000);
        } else {
            showToast('⚠️ حدث خطأ: الزر غير موجود في الصفحة', 'error');
        }
    } else {
        const remaining = 5 - versionClickCount;
        showToast(`🔑 ${remaining} ضغطات متبقية لإظهار زر التوليد`, 'info');
    }
}

// ================================================================
// SYNC FUNCTIONS
// ================================================================

function syncNow() {
    if (typeof syncToFirebase === 'function') {
        syncToFirebase();
        showToast('☁️ جاري المزامنة...', 'info');
    }
}

function forceSync() {
    if (typeof syncToFirebase === 'function') {
        syncToFirebase();
    }
    setTimeout(() => {
        if (typeof syncFromFirebase === 'function') {
            syncFromFirebase();
        }
    }, 2000);
    showToast('🔄 جاري المزامنة القسرية...', 'info');
}

// ================================================================
// ADD AUDIT LOG
// ================================================================

function addAuditLog(action, type, details, data = null) {
    if (typeof window.auditLog === 'undefined') {
        window.auditLog = [];
    }
    window.auditLog.unshift({
        id: Date.now(),
        action: action,
        type: type,
        details: details,
        data: data,
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
    if (typeof renderActivityLog === 'function') renderActivityLog();
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

// ================================================================
// PRINT INVOICE
// ================================================================

function printInvoice(type) {
    const company = window.companyData || {};
    const dt = getCurrentDateTime();
    let html = '';

    if (type === 'sales') {
        const customer = document.getElementById('salesCustomer')?.value?.trim() ||
            document.getElementById('salesCustomerSelect')?.value || 'عميل';
        
        let total = 0;
        const items = window.salesItems || [];
        items.forEach(item => {
            total += (item.total || 0);
        });
        
        const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
        const isTax = invoiceType === 'tax';
        const taxRate = 14;
        const taxAmount = isTax ? (total * taxRate) / 100 : 0;
        const totalWithTax = isTax ? total + taxAmount : total;

        const dateObj = new Date();
        const dateStr = dateObj.toLocaleDateString('ar-EG');
        const timeStr = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        html = `
            <div class="invoice-print-boxed">
                <div class="company-header">
                    <h2>${company.name || 'شركة الميزان'}</h2>
                    <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                    <div class="contact-info">
                        📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'} | 📱 ${company.mobile || '01000000000'}
                    </div>
                </div>
                
                <div class="invoice-info">
                    <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${dateStr}</span></div>
                    <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${timeStr}</span></div>
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
                        ${items.length > 0 ? items.map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${item.productName || 'غير معروف'}</td>
                                <td>${item.qty || 0}</td>
                                <td>${(item.price || 0).toFixed(2)}</td>
                                <td>${(item.total || 0).toFixed(2)}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" style="text-align:center;color:#999;">لا توجد أصناف</td>
                            </tr>
                        `}
                    </tbody>
                </table>
                
                <div class="total-box">
                    <div>💵 الإجمالي: <span class="total-amount">${total.toFixed(2)} 🇪🇬</span></div>
                    ${isTax ? `<div>📊 الضريبة (14%): <span class="total-amount">${taxAmount.toFixed(2)} 🇪🇬</span></div>` : ''}
                    ${isTax ? `<div>💰 الإجمالي مع الضريبة: <span class="total-amount">${totalWithTax.toFixed(2)} 🇪🇬</span></div>` : ''}
                </div>
                
                <div class="footer-box">
                    <div class="thanks">خالص مع الشكر</div>
                    <div style="margin-top:4px;font-size:9px;color:#555;">
                        تم الطباعة في ${new Date().toLocaleString('ar-EG')}
                    </div>
                </div>
            </div>
        `;
    }

    const win = window.open('', '_blank', 'width=400,height=650,scrollbars=yes');
    if (win) {
        win.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>طباعة فاتورة</title>
                <style>
                    body { margin: 0; padding: 10px; background: #fff; font-family: 'Tajawal', Arial, sans-serif; direction: rtl; }
                    .invoice-print-boxed { max-width: 320px; margin: 0 auto; padding: 15px; border: 1px solid #000; background: #fff; color: #000; font-size: 12px; text-align: center; }
                    .company-header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
                    .company-header h2 { font-size: 18px; margin: 0; color: #000; }
                    .company-header .sub-title { font-size: 11px; color: #555; }
                    .company-header .contact-info { font-size: 10px; color: #555; }
                    .invoice-info { display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; border-bottom: 1px solid #ddd; margin-bottom: 6px; }
                    .invoice-info .label { font-weight: 700; color: #000; }
                    .customer-info { text-align: right; font-size: 11px; padding: 4px 0; border-bottom: 1px solid #ddd; margin-bottom: 6px; }
                    .customer-info .label { font-weight: 700; color: #000; }
                    .items-table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 6px 0; }
                    .items-table th { border: 1px solid #000; padding: 4px 2px; background: #eee; font-weight: 800; color: #000; }
                    .items-table td { border: 1px solid #000; padding: 4px 2px; color: #000; }
                    .total-box { border-top: 2px solid #000; padding: 6px 0; margin-top: 6px; font-weight: 700; font-size: 13px; }
                    .total-box .total-amount { color: #000; font-weight: 900; }
                    .footer-box { border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; font-size: 10px; color: #555; }
                    .footer-box .thanks { font-size: 13px; color: #000; font-weight: 700; }
                    @media print { body { padding: 0; } .invoice-print-boxed { border: 1px solid #000; } }
                </style>
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() { window.print(); };
                <\/script>
            </body>
            </html>
        `);
        win.document.close();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة، يرجى السماح بالنوافذ المنبثقة', 'error');
    }
}

// ================================================================
// WHATSAPP SEND
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

    const items = window.salesItems || [];
    const total = items.reduce((s, item) => s + (item.total || 0), 0);
    const payment = getSelectedPayment('sales');
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const company = window.companyData || {};
    const isTax = invoiceType === 'tax';
    const taxRate = 14;
    const taxAmount = isTax ? (total * taxRate) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;
    const dt = getCurrentDateTime();

    const line = '═'.repeat(36);
    let message = '';

    message += `╔${line}╗\n`;
    message += `║     🏢 ${(company.name || 'الميزان').padEnd(24)}║\n`;
    message += `║  نظام محاسبة ونقاط بيع  ${''.padEnd(12)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ 📍 ${(company.address || 'القاهرة، مصر').padEnd(26)}║\n`;
    message += `║ 📞 ${(company.phone || '0234567890').padEnd(26)}║\n`;
    message += `║ 📱 ${(company.mobile || '01000000000').padEnd(26)}║\n`;
    
    if (isTax) {
        message += `║ 🆔 الرقم الضريبي: ${(company.taxNumber || 'غير مسجل').padEnd(20)}║\n`;
        message += `║ 📋 السجل التجاري: ${(company.commercialRegister || 'غير مسجل').padEnd(18)}║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║ 📅 ${dt.date}  🕐 ${dt.time.padEnd(16)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ 🧾 فاتورة ${isTax ? 'ضريبية' : 'عادية'.padEnd(24)}║\n`;
    message += `║ 👤 العميل: ${customer.padEnd(24)}║\n`;
    message += `║ 💳 الدفع: ${payment.padEnd(26)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ # │ المنتج    │ العدد │ السعر │\n`;
    message += `║───┼───────────┼───────┼───────╢\n`;
    
    if (items.length > 0) {
        items.forEach((item, i) => {
            const name = item.productName.length > 8 ? item.productName.substring(0, 8) + '..' : item.productName.padEnd(8);
            const num = (i + 1).toString().padStart(1);
            const qty = item.qty.toString().padStart(5);
            const price = item.price.toFixed(0).padStart(5);
            message += `║ ${num} │ ${name} │ ${qty} │ ${price} │\n`;
            const totalItem = item.total.toFixed(2).padStart(7);
            message += `║   │ الإجمالي  │      │ ${totalItem} │\n`;
        });
    } else {
        message += `║   │ لا توجد أصناف               ║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║ 💰 الإجمالي: ${total.toFixed(2).padStart(20)} 🇪🇬 ║\n`;
    
    if (isTax) {
        message += `║ 📊 الضريبة (14%): ${taxAmount.toFixed(2).padStart(19)} ║\n`;
        message += `║ 💰 الإجمالي مع الضريبة: ${totalWithTax.toFixed(2).padStart(14)} ║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║        خالص مع الشكر           ║\n`;
    message += `╠${line}╣\n`;
    
    let hasPayment = false;
    if (company.vodafone) {
        message += `║ 📱 فودافون كاش: ${company.vodafone.padEnd(20)}║\n`;
        hasPayment = true;
    }
    if (company.instapay) {
        message += `║ 📲 إنستاباي: ${company.instapay.padEnd(22)}║\n`;
        hasPayment = true;
    }
    if (company.bankAccount) {
        message += `║ 🏦 بنك: ${company.bankAccount.padEnd(24)}║\n`;
        hasPayment = true;
    }
    if (company.cash) {
        message += `║ 💰 كاش: ${company.cash.padEnd(25)}║\n`;
        hasPayment = true;
    }
    
    if (hasPayment) {
        message += `╠${line}╣\n`;
    }
    
    message += `║ 📱 رابط الدفع: bit.ly/mizan-pay  ║\n`;
    message += `╚${line}╝\n`;
    message += `\n📱 تم إرسال الفاتورة عبر الميزان`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    window.open(url, '_blank');

    if (typeof addAuditLog === 'function') {
        addAuditLog('sale', 'whatsapp', `إرسال فاتورة واتساب للعميل: ${customer} - رقم: ${whatsappNumber}`);
    }
    showToast(`📱 تم فتح واتساب للعميل ${customer}`, 'success');
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
// START AUTO BACKUP
// ================================================================

function startAutoBackup() {
    if (backupInterval) clearInterval(backupInterval);
    backupInterval = setInterval(() => {
        if (typeof createAutoBackup === 'function') createAutoBackup();
    }, 6 * 60 * 60 * 1000);
}

// ================================================================
// SHOW INVOICE DETAILS
// ================================================================

function showInvoiceDetails(id, type) {
    let invoice = null;
    
    if (type === 'sale') {
        invoice = window.sales?.find(s => s.id === id);
    } else if (type === 'purchase') {
        invoice = window.purchases?.find(p => p.id === id);
    } else if (type === 'return') {
        invoice = window.returns?.find(r => r.id === id);
    }

    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    const company = window.companyData || {};
    const isTax = invoice.invoiceType === 'tax';
    const total = invoice.totalWithTax || invoice.total || 0;
    const taxAmount = isTax ? (total * 14) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;
    const typeLabel = type === 'sale' ? 'فاتورة بيع' : type === 'purchase' ? 'فاتورة شراء' : 'مرتجع';
    const customerName = invoice.customer || invoice.supplier || 'غير محدد';

    let itemsHtml = `
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
    `;

    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, i) => {
            itemsHtml += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${item.productName || 'غير معروف'}</td>
                    <td>${item.qty || 0}</td>
                    <td>${(item.price || 0).toFixed(2)}</td>
                    <td>${(item.total || 0).toFixed(2)}</td>
                </tr>
            `;
        });
    } else {
        itemsHtml += `<tr><td colspan="5" style="text-align:center;color:#999;">لا توجد أصناف</td></tr>`;
    }

    itemsHtml += `</tbody></table>`;

    const modalHtml = `
        <div style="direction:rtl;text-align:right;max-width:500px;margin:0 auto;padding:10px;">
            <div style="text-align:center;border-bottom:2px solid #C9A94E;padding-bottom:10px;margin-bottom:10px;">
                <h2 style="color:#C9A94E;font-size:20px;">${company.name || 'شركة الميزان'}</h2>
                <div style="font-size:12px;color:#A89070;">نظام محاسبة ونقاط بيع</div>
                <div style="font-size:11px;color:#A89070;">${company.address || ''} | ${company.phone || ''}</div>
            </div>
            
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid #3D3D3D;margin-bottom:6px;">
                <span><strong>📅 التاريخ:</strong> ${invoice.date}</span>
                <span><strong>🕐 الوقت:</strong> ${invoice.time || '--:--'}</span>
            </div>
            
            <div style="font-size:12px;padding:4px 0;border-bottom:1px solid #3D3D3D;margin-bottom:6px;">
                <div><strong>🧾 النوع:</strong> ${typeLabel} ${isTax ? '(ضريبية)' : '(عادية)'}</div>
                <div><strong>👤 العميل:</strong> ${customerName}</div>
                <div><strong>💳 الدفع:</strong> ${invoice.payment || 'نقدي'}</div>
                <div><strong>📋 رقم الفاتورة:</strong> #${invoice.invoiceNumber || invoice.id}</div>
            </div>
            
            ${itemsHtml}
            
            <div style="border-top:2px solid #C9A94E;padding:6px 0;margin-top:6px;font-weight:700;font-size:14px;text-align:center;">
                <div>💵 الإجمالي: <span style="color:#C9A94E;">${total.toFixed(2)} 🇪🇬</span></div>
                ${isTax ? `<div style="font-size:12px;color:#A89070;">📊 الضريبة (14%): ${taxAmount.toFixed(2)} 🇪🇬</div>` : ''}
                ${isTax ? `<div>💰 الإجمالي مع الضريبة: <span style="color:#C9A94E;">${totalWithTax.toFixed(2)} 🇪🇬</span></div>` : ''}
            </div>
            
            <div style="text-align:center;border-top:2px solid #C9A94E;padding-top:6px;margin-top:6px;font-size:11px;color:#A89070;">
                خالص مع الشكر
            </div>
            
            <div style="display:flex;gap:6px;margin-top:10px;">
                <button class="btn btn-primary btn-block" onclick="printInvoiceModal()"><i class="fas fa-print"></i> طباعة</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;

    openModal('📋 تفاصيل الفاتورة', modalHtml);
    
    window._currentInvoice = { invoice, type };
}

// ================================================================
// PRINT INVOICE MODAL
// ================================================================

function printInvoiceModal() {
    if (!window._currentInvoice) {
        showToast('⚠️ لا توجد فاتورة للطباعة', 'error');
        return;
    }
    
    const { invoice, type } = window._currentInvoice;
    const company = window.companyData || {};
    const isTax = invoice.invoiceType === 'tax';
    const total = invoice.totalWithTax || invoice.total || 0;
    const taxAmount = isTax ? (total * 14) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;
    const typeLabel = type === 'sale' ? 'فاتورة بيع' : type === 'purchase' ? 'فاتورة شراء' : 'مرتجع';
    const customerName = invoice.customer || invoice.supplier || 'غير محدد';

    let html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${company.name || 'شركة الميزان'}</h2>
                <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                <div class="contact-info">📍 ${company.address || ''} | 📞 ${company.phone || ''}</div>
            </div>
            <div class="invoice-info">
                <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${invoice.date}</span></div>
                <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${invoice.time || '--:--'}</span></div>
            </div>
            <div style="text-align:right;padding:4px 0;border-bottom:1px solid #3D3D3D;margin-bottom:6px;">
                <div><strong>🧾 النوع:</strong> ${typeLabel} ${isTax ? '(ضريبية)' : '(عادية)'}</div>
                <div><strong>👤 العميل:</strong> ${customerName}</div>
                <div><strong>💳 الدفع:</strong> ${invoice.payment || 'نقدي'}</div>
                <div><strong>📋 رقم الفاتورة:</strong> #${invoice.invoiceNumber || invoice.id}</div>
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
    `;

    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, i) => {
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${item.productName || 'غير معروف'}</td>
                    <td>${item.qty || 0}</td>
                    <td>${(item.price || 0).toFixed(2)}</td>
                    <td>${(item.total || 0).toFixed(2)}</td>
                </tr>
            `;
        });
    } else {
        html += `<tr><td colspan="5" style="text-align:center;">لا توجد أصناف</td></tr>`;
    }

    html += `
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

    const win = window.open('', '_blank', 'width=400,height=650');
    if (win) {
        win.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>طباعة فاتورة</title>
                <style>
                    body { margin: 0; padding: 10px; background: #fff; font-family: 'Tajawal', Arial, sans-serif; direction: rtl; }
                    .invoice-print-boxed { max-width: 320px; margin: 0 auto; padding: 15px; border: 1px solid #000; background: #fff; color: #000; font-size: 12px; text-align: center; }
                    .company-header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
                    .company-header h2 { font-size: 18px; margin: 0; color: #000; }
                    .company-header .sub-title { font-size: 11px; color: #555; }
                    .company-header .contact-info { font-size: 10px; color: #555; }
                    .invoice-info { display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; border-bottom: 1px solid #ddd; margin-bottom: 6px; }
                    .invoice-info .label { font-weight: 700; color: #000; }
                    .items-table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 6px 0; }
                    .items-table th { border: 1px solid #000; padding: 4px 2px; background: #eee; font-weight: 800; color: #000; }
                    .items-table td { border: 1px solid #000; padding: 4px 2px; color: #000; }
                    .total-box { border-top: 2px solid #000; padding: 6px 0; margin-top: 6px; font-weight: 700; font-size: 13px; }
                    .total-box .total-amount { color: #000; font-weight: 900; }
                    .footer-box { border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; font-size: 10px; color: #555; }
                    .footer-box .thanks { font-size: 13px; color: #000; font-weight: 700; }
                    @media print { body { padding: 0; } .invoice-print-boxed { border: 1px solid #000; } }
                </style>
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() { window.print(); };
                <\/script>
            </body>
            </html>
        `);
        win.document.close();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة', 'error');
    }
}

// ================================================================
// DOM READY
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تشغيل الميزان v3.0.0');

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

    if (typeof activateDemoLicense === 'function') {
        activateDemoLicense();
        console.log('✅ تم تفعيل الترخيص التجريبي');
    }

    if (typeof seedData === 'function') {
        seedData();
        console.log('✅ تم تهيئة البيانات');
    }

    if (typeof refreshAllPages === 'function') {
        refreshAllPages();
        console.log('✅ تم تحديث جميع الصفحات');
    }

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

    console.log('✅ الميزان جاهز للاستخدام');
    console.log('🔒 كلمة المرور: 123456');
    console.log('🔑 اضغط 5 مرات على رقم الإصدار في الإعدادات لتفعيل زر توليد المفاتيح');
});
