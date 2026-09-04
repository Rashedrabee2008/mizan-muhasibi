// ================================================================
// app.js - التطبيق الرئيسي (الملف الكامل النهائي)
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
// HELPER FUNCTIONS
// ================================================================

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== safeSetText - معدلة لإخفاء التحذيرات اختيارياً =====
function safeSetText(id, value, warnIfMissing = false) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
        return true;
    } else {
        if (warnIfMissing) {
            console.warn('⚠️ عنصر غير موجود، تم تخطيه:', id);
        }
        return false;
    }
}

function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value;
        return true;
    } else {
        console.warn('⚠️ عنصر غير موجود، تم تخطيه:', id);
        return false;
    }
}

function openModal(title, html) {
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const overlay = document.getElementById('modalOverlay');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = html;
    if (overlay) overlay.classList.add('show');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('show');
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

function getSelectedPayment(prefix) {
    const el = document.querySelector(`input[name="${prefix}Payment"]:checked`);
    return el ? el.value : 'نقدي';
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
    updateSecurityButton();
}

// ================================================================
// UPDATE SECURITY BUTTON - إظهار زر الأمن الخاص للمدير فقط
// ================================================================

function updateSecurityButton() {
    const btn = document.getElementById('securityAuditBtn');
    if (btn) {
        if (isAdmin()) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
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
    updateSecurityButton();
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
            updateSecurityButton();
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
// WHATSAPP SEND - إرسال فاتورة عبر واتساب (معدل)
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
// WHATSAPP FROM MODAL - إرسال الفاتورة من النافذة المنبثقة
// ================================================================

function sendInvoiceWhatsAppFromModal() {
    if (!window._currentInvoice) {
        showToast('⚠️ لا توجد فاتورة', 'error');
        return;
    }
    
    const { invoice, type } = window._currentInvoice;
    const customerName = invoice.customer || invoice.supplier || 'عميل';
    const company = window.companyData || {};
    const total = invoice.totalWithTax || invoice.total || 0;
    const isTax = invoice.invoiceType === 'tax';
    const taxAmount = isTax ? (total * 14) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;
    
    let whatsappNumber = '01011993799';
    if (type === 'sale' || type === 'return') {
        const customer = window.customers?.find(c => c.name === customerName);
        if (customer?.whatsapp) whatsappNumber = customer.whatsapp;
        else if (customer?.phone) whatsappNumber = customer.phone;
    }
    
    whatsappNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (!whatsappNumber.startsWith('20')) {
        whatsappNumber = '20' + whatsappNumber;
    }
    
    const line = '═'.repeat(36);
    let message = '';
    
    message += `╔${line}╗\n`;
    message += `║     🏢 ${(company.name || 'الميزان').padEnd(24)}║\n`;
    message += `║  نظام محاسبة ونقاط بيع  ${''.padEnd(12)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ 📍 ${(company.address || 'القاهرة، مصر').padEnd(26)}║\n`;
    message += `║ 📞 ${(company.phone || '0234567890').padEnd(26)}║\n`;
    message += `║ 📱 ${(company.mobile || '01000000000').padEnd(26)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ 📅 ${invoice.date}  🕐 ${(invoice.time || '').padEnd(16)}║\n`;
    message += `╠${line}╣\n`;
    
    const typeLabel = type === 'sale' ? 'فاتورة بيع' : type === 'purchase' ? 'فاتورة شراء' : 'مرتجع';
    message += `║ 🧾 ${typeLabel} ${isTax ? 'ضريبية' : 'عادية'.padEnd(22)}║\n`;
    message += `║ 👤 ${customerName.padEnd(26)}║\n`;
    message += `║ 💳 ${(invoice.payment || 'نقدي').padEnd(26)}║\n`;
    message += `║ 📋 رقم الفاتورة: #${(invoice.invoiceNumber || invoice.id).toString().padEnd(15)}║\n`;
    message += `╠${line}╣\n`;
    
    message += `║ # │ المنتج    │ العدد │ السعر │\n`;
    message += `║───┼───────────┼───────┼───────╢\n`;
    
    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, i) => {
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
    
    showToast(`📱 تم فتح واتساب للعميل ${customerName}`, 'success');
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
// SHOW INVOICE DETAILS - عرض تفاصيل الفاتورة (معدل)
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

    // ===== تنسيق محسن للأصناف =====
    let itemsHtml = `
        <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 1fr 0.6fr;gap:4px;padding:6px 0;font-weight:800;color:#C9A94E;border-bottom:2px solid #C9A94E;font-size:11px;">
            <span style="text-align:right;">المنتج</span>
            <span style="text-align:center;">الكمية</span>
            <span style="text-align:center;">السعر</span>
            <span style="text-align:center;">الإجمالي</span>
            <span style="text-align:center;">#</span>
        </div>
    `;

    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, i) => {
            itemsHtml += `
                <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 1fr 0.6fr;gap:4px;padding:6px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;align-items:center;">
                    <span style="text-align:right;font-weight:600;">${item.productName || 'غير معروف'}</span>
                    <span style="text-align:center;">${item.qty || 0}</span>
                    <span style="text-align:center;">${(item.price || 0).toFixed(2)}</span>
                    <span style="text-align:center;font-weight:700;color:#C9A94E;">${(item.total || 0).toFixed(2)}</span>
                    <span style="text-align:center;font-size:10px;color:#A89070;">${i + 1}</span>
                </div>
            `;
        });
    } else {
        itemsHtml += `
            <div style="padding:12px;text-align:center;color:#A89070;border-bottom:1px solid #2D2D2D;">
                لا توجد أصناف
            </div>
        `;
    }

    // ===== تنسيق محسن للفاتورة =====
    const modalHtml = `
        <div style="direction:rtl;text-align:right;max-width:500px;margin:0 auto;padding:10px;background:#1C1C1C;border-radius:12px;">
            <!-- رأس الفاتورة -->
            <div style="text-align:center;border-bottom:2px solid #C9A94E;padding-bottom:12px;margin-bottom:12px;">
                <h2 style="color:#C9A94E;font-size:22px;margin:0;">${company.name || 'شركة الميزان'}</h2>
                <div style="font-size:12px;color:#A89070;">نظام محاسبة ونقاط بيع</div>
                <div style="font-size:11px;color:#A89070;">${company.address || ''} | ${company.phone || ''}</div>
            </div>
            
            <!-- معلومات الفاتورة -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;padding:6px 0;border-bottom:1px solid #3D3D3D;margin-bottom:8px;">
                <div><span style="font-weight:700;color:#C9A94E;">📅 التاريخ:</span> ${invoice.date}</div>
                <div><span style="font-weight:700;color:#C9A94E;">🕐 الوقت:</span> ${invoice.time || '--:--'}</div>
                <div><span style="font-weight:700;color:#C9A94E;">🧾 النوع:</span> ${typeLabel} ${isTax ? '(ضريبية)' : '(عادية)'}</div>
                <div><span style="font-weight:700;color:#C9A94E;">📋 رقم الفاتورة:</span> #${invoice.invoiceNumber || invoice.id}</div>
                <div><span style="font-weight:700;color:#C9A94E;">👤 العميل:</span> ${customerName}</div>
                <div><span style="font-weight:700;color:#C9A94E;">💳 الدفع:</span> ${invoice.payment || 'نقدي'}</div>
            </div>
            
            <!-- جدول الأصناف -->
            <div style="background:#0D0D0D;border-radius:8px;padding:8px;border:1px solid #2D2D2D;">
                ${itemsHtml}
            </div>
            
            <!-- الإجماليات -->
            <div style="border-top:2px solid #C9A94E;padding:10px 0;margin-top:8px;font-weight:700;font-size:14px;text-align:center;background:#0D0D0D;border-radius:6px;">
                <div>💵 الإجمالي: <span style="color:#C9A94E;font-size:20px;">${total.toFixed(2)} 🇪🇬</span></div>
                ${isTax ? `<div style="font-size:12px;color:#A89070;margin-top:2px;">📊 الضريبة (14%): ${taxAmount.toFixed(2)} 🇪🇬</div>` : ''}
                ${isTax ? `<div style="font-size:14px;margin-top:4px;">💰 الإجمالي مع الضريبة: <span style="color:#C9A94E;font-size:18px;">${totalWithTax.toFixed(2)} 🇪🇬</span></div>` : ''}
            </div>
            
            <!-- التذييل -->
            <div style="text-align:center;border-top:2px solid #C9A94E;padding-top:8px;margin-top:8px;font-size:12px;color:#A89070;">
                <div style="font-size:14px;color:#F5E6C8;font-weight:700;">خالص مع الشكر</div>
                <div style="font-size:10px;margin-top:2px;">تم إنشاؤها بواسطة الميزان - نظام محاسبة ونقاط بيع</div>
            </div>
            
            <!-- الأزرار -->
            <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
                <button class="btn btn-primary btn-block" onclick="printInvoiceModal()" style="flex:1;">
                    <i class="fas fa-print"></i> طباعة
                </button>
                <button class="btn btn-success btn-block" onclick="sendInvoiceWhatsAppFromModal()" style="flex:1;background:#25D366;color:#fff;">
                    <i class="fab fa-whatsapp"></i> واتساب
                </button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()" style="flex:1;">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        </div>
    `;

    openModal('📋 تفاصيل الفاتورة', modalHtml);
    
    window._currentInvoice = { invoice, type };
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
// UPDATE DASHBOARD STATS
// ================================================================

function updateStats() {
    let totalSales = 0;
    let salesCount = 0;
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.items) {
                s.items.forEach(item => { totalSales += (item.total || 0); });
            } else {
                totalSales += (s.total || 0);
            }
            salesCount++;
        });
    }
    safeSetText('dashTotalSales', totalSales.toFixed(2));
    safeSetText('dashSalesCount', salesCount + ' فاتورة');

    let totalPurchases = 0;
    let purchasesCount = 0;
    if (window.purchases) {
        window.purchases.forEach(p => {
            if (p.items) {
                p.items.forEach(item => { totalPurchases += (item.total || 0); });
            } else {
                totalPurchases += (p.total || 0);
            }
            purchasesCount++;
        });
    }
    safeSetText('dashTotalPurchases', totalPurchases.toFixed(2));
    safeSetText('dashPurchasesCount', purchasesCount + ' فاتورة');

    let totalReturns = 0;
    let returnsCount = 0;
    if (window.returns) {
        window.returns.forEach(r => {
            if (r.items) {
                r.items.forEach(item => { totalReturns += (item.total || 0); });
            } else {
                totalReturns += (r.total || 0);
            }
            returnsCount++;
        });
    }
    safeSetText('dashTotalReturns', totalReturns.toFixed(2));
    safeSetText('dashReturnsCount', returnsCount + ' فاتورة');

    const profit = totalSales - totalPurchases - totalReturns;
    safeSetText('dashNetProfit', profit.toFixed(2));
    
    const profitEl = document.getElementById('dashNetProfit');
    const profitStatus = document.getElementById('dashProfitStatus');
    if (profitEl) {
        profitEl.style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
    }
    if (profitStatus) {
        profitStatus.textContent = profit >= 0 ? '📈 ربح' : '📉 خسارة';
        profitStatus.style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
    }

    safeSetText('dashTotalProducts', (window.products || []).length);
    safeSetText('dashTotalCustomers', (window.customers || []).length);
    safeSetText('dashTotalSuppliers', (window.suppliers || []).length + ' مورد');

    let treasuryBalance = 0;
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') treasuryBalance += t.amount;
            else treasuryBalance -= t.amount;
        });
    }
    safeSetText('dashTreasuryBalance', treasuryBalance.toFixed(2));

    let totalQty = 0;
    let totalValue = 0;
    if (window.products && window.warehouseProducts) {
        window.products.forEach(p => {
            let qty = 0;
            window.warehouseProducts.forEach(wp => {
                if (wp.productId === p.id) qty += wp.qty;
            });
            totalQty += qty;
            totalValue += (p.sellPrice || 0) * qty;
        });
    }
    safeSetText('dashInventoryQty', totalQty);
    safeSetText('dashInventoryValue', totalValue.toFixed(2));

    let lowStock = [];
    if (window.products && window.warehouseProducts) {
        window.products.forEach(p => {
            let total = 0;
            window.warehouseProducts.forEach(wp => {
                if (wp.productId === p.id) total += wp.qty;
            });
            if (total <= (p.min || 0)) lowStock.push(p);
        });
    }
    const lowStockEl = document.getElementById('dashLowStock');
    if (lowStockEl) {
        lowStockEl.textContent = lowStock.length > 0 ? `🔴 ${lowStock.length} منتج` : '✅ جميع المنتجات متوفرة';
        lowStockEl.style.color = lowStock.length > 0 ? '#E06060' : '#2D8F5E';
    }

    const today = getTodayDate();
    let todaySales = 0;
    let todayPurchases = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.date === today) {
                const total = s.totalWithTax || s.total || 0;
                todaySales += total;
            }
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            if (p.date === today) {
                const total = p.totalWithTax || p.total || 0;
                todayPurchases += total;
            }
        });
    }
    
    safeSetText('dashTodaySales', todaySales.toFixed(2));
    safeSetText('dashTodayPurchases', todayPurchases.toFixed(2));
}

// ================================================================
// UPDATE DASHBOARD DETAILS - مع إخفاء التحذير للعناصر الجديدة
// ================================================================

function updateDashboardDetails() {
    const today = getTodayDate();
    let todaySales = 0;
    let todayPurchases = 0;
    let todayReturns = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.date === today) {
                const total = s.totalWithTax || s.total || 0;
                todaySales += total;
            }
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            if (p.date === today) {
                const total = p.totalWithTax || p.total || 0;
                todayPurchases += total;
            }
        });
    }
    
    if (window.returns) {
        window.returns.forEach(r => {
            if (r.date === today) {
                const total = r.items ? r.items.reduce((sum, item) => sum + (item.total || 0), 0) : (r.total || 0);
                todayReturns += total;
            }
        });
    }
    
    safeSetText('dashTodaySales', todaySales.toFixed(2));
    safeSetText('dashTodayPurchases', todayPurchases.toFixed(2));
    // إخفاء التحذير للعناصر الجديدة
    safeSetText('dashTodayReturns', todayReturns.toFixed(2), false);
    
    let totalQty = 0;
    let totalValue = 0;
    if (window.products && window.warehouseProducts) {
        window.products.forEach(p => {
            let qty = 0;
            window.warehouseProducts.forEach(wp => {
                if (wp.productId === p.id) qty += wp.qty;
            });
            totalQty += qty;
            totalValue += (p.sellPrice || 0) * qty;
        });
    }
    safeSetText('dashInventoryQty', totalQty);
    safeSetText('dashInventoryValue', totalValue.toFixed(2));
}

// ================================================================
// ACCOUNTING FUNCTIONS - دوال المحاسبات (المعدلة بالكامل)
// ================================================================

function updateAccounting() {
    let salesTotal = 0;
    let purchasesTotal = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            salesTotal += total;
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            purchasesTotal += total;
        });
    }
    
    const profit = salesTotal - purchasesTotal;
    
    safeSetText('accountingSales', salesTotal.toFixed(2));
    safeSetText('accountingPurchases', purchasesTotal.toFixed(2));
    safeSetText('accountingProfit', profit.toFixed(2));
}

// ===== showAuditReport - تقرير المراجعة المحاسبية =====
function showAuditReport() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let totalSales = 0;
    let totalPurchases = 0;
    let totalExpenses = 0;
    let totalTreasury = 0;
    let salesCount = 0;
    let purchasesCount = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            totalSales += total;
            salesCount++;
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            totalPurchases += total;
            purchasesCount++;
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            totalExpenses += e.amount;
        });
    }
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') totalTreasury += t.amount;
            else totalTreasury -= t.amount;
        });
    }
    
    const totalRevenue = totalSales;
    const totalCosts = totalPurchases + totalExpenses;
    const netProfit = totalRevenue - totalCosts;
    const balance = totalTreasury;
    const totalInvoices = salesCount + purchasesCount;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:16px;margin-bottom:10px;">🔍 تقرير المراجعة المحاسبية</h4>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
                <div style="background:#0D0D0D;border-radius:8px;padding:10px;border:1px solid #2D8F5E;">
                    <div style="color:#2D8F5E;font-weight:700;font-size:11px;">💰 إجمالي الإيرادات</div>
                    <div style="font-size:18px;font-weight:900;color:#2D8F5E;">${totalRevenue.toFixed(2)} 🇪🇬</div>
                    <div style="font-size:10px;color:#A89070;">من المبيعات</div>
                </div>
                <div style="background:#0D0D0D;border-radius:8px;padding:10px;border:1px solid #E06060;">
                    <div style="color:#E06060;font-weight:700;font-size:11px;">💸 إجمالي التكاليف</div>
                    <div style="font-size:18px;font-weight:900;color:#E06060;">${totalCosts.toFixed(2)} 🇪🇬</div>
                    <div style="font-size:10px;color:#A89070;">مشتريات + مصروفات</div>
                </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
                <div style="background:#0D0D0D;border-radius:8px;padding:8px;border:1px solid #C9A94E;text-align:center;">
                    <div style="color:#A89070;font-size:10px;">📊 صافي الربح</div>
                    <div style="font-size:16px;font-weight:900;color:${netProfit >= 0 ? '#2D8F5E' : '#E06060'};">${netProfit.toFixed(2)}</div>
                </div>
                <div style="background:#0D0D0D;border-radius:8px;padding:8px;border:1px solid #C9A94E;text-align:center;">
                    <div style="color:#A89070;font-size:10px;">🏦 رصيد الخزنة</div>
                    <div style="font-size:16px;font-weight:900;color:#C9A94E;">${balance.toFixed(2)}</div>
                </div>
                <div style="background:#0D0D0D;border-radius:8px;padding:8px;border:1px solid #C9A94E;text-align:center;">
                    <div style="color:#A89070;font-size:10px;">📋 عدد الفواتير</div>
                    <div style="font-size:16px;font-weight:900;color:#C9A94E;">${totalInvoices}</div>
                </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;background:#0D0D0D;border-radius:6px;padding:8px;border:1px solid #2D2D2D;">
                <div><span style="color:#A89070;">📊 المبيعات:</span> <span style="color:#2D8F5E;font-weight:700;">${salesCount} فاتورة</span></div>
                <div><span style="color:#A89070;">🛒 المشتريات:</span> <span style="color:#E06060;font-weight:700;">${purchasesCount} فاتورة</span></div>
                <div><span style="color:#A89070;">💸 المصروفات:</span> <span style="color:#E6A830;font-weight:700;">${window.expenses ? window.expenses.length : 0}</span></div>
                <div><span style="color:#A89070;">📦 المنتجات:</span> <span style="color:#C9A94E;font-weight:700;">${window.products ? window.products.length : 0}</span></div>
            </div>
            
            <div style="font-size:11px;color:#A89070;border-top:1px solid #2D2D2D;padding-top:6px;margin-top:6px;">
                📅 آخر تحديث: ${new Date().toLocaleString('ar')}
            </div>
            
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn btn-info btn-sm" onclick="showDetailedAudit()"><i class="fas fa-search"></i> تدقيق مفصل</button>
                <button class="btn btn-primary btn-sm" onclick="printAuditReport()"><i class="fas fa-print"></i> طباعة</button>
            </div>
        </div>
    `;
    
    addAuditLog('view', 'audit', 'عرض تقرير المراجعة المحاسبية');
}

// ===== showDetailedAudit - التدقيق المفصل =====
function showDetailedAudit() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:16px;margin-bottom:10px;">🔍 التدقيق المفصل</h4>
            <div style="max-height:400px;overflow-y:auto;font-size:12px;">
    `;
    
    if (window.sales && window.sales.length > 0) {
        html += `
            <div style="margin-bottom:8px;">
                <div style="color:#2D8F5E;font-weight:700;font-size:13px;border-bottom:1px solid #2D8F5E;padding-bottom:4px;">💰 المبيعات (${window.sales.length})</div>
        `;
        window.sales.slice().reverse().forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            html += `
                <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                    <span>#${s.invoiceNumber || s.id} - ${s.customer || 'عميل'}</span>
                    <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    if (window.purchases && window.purchases.length > 0) {
        html += `
            <div style="margin-bottom:8px;">
                <div style="color:#E06060;font-weight:700;font-size:13px;border-bottom:1px solid #E06060;padding-bottom:4px;">🛒 المشتريات (${window.purchases.length})</div>
        `;
        window.purchases.slice().reverse().forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            html += `
                <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                    <span>#${p.invoiceNumber || p.id} - ${p.supplier || 'مورد'}</span>
                    <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    if (window.expenses && window.expenses.length > 0) {
        html += `
            <div style="margin-bottom:8px;">
                <div style="color:#E6A830;font-weight:700;font-size:13px;border-bottom:1px solid #E6A830;padding-bottom:4px;">💸 المصروفات (${window.expenses.length})</div>
        `;
        window.expenses.slice().reverse().forEach(e => {
            html += `
                <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                    <span>${e.note}</span>
                    <span style="color:#E6A830;font-weight:700;">${e.amount.toFixed(2)}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    if (!window.sales?.length && !window.purchases?.length && !window.expenses?.length) {
        html += `<div class="empty-state" style="padding:16px 0;"><span>لا توجد حركات للتدقيق</span></div>`;
    }
    
    html += `
            </div>
            <div style="margin-top:8px;display:flex;gap:6px;">
                <button class="btn btn-secondary btn-sm" onclick="showAuditReport()"><i class="fas fa-arrow-right"></i> العودة</button>
                <button class="btn btn-primary btn-sm" onclick="printAuditReport()"><i class="fas fa-print"></i> طباعة</button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ===== printAuditReport - طباعة تقرير المراجعة =====
function printAuditReport() {
    const content = document.querySelector('.accounting-detail-content');
    if (!content) return;
    
    const win = window.open('', '_blank', 'width=600,height=500');
    if (win) {
        win.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تقرير المراجعة</title>
                <style>
                    body { font-family: 'Tajawal', sans-serif; background: #fff; color: #000; padding: 20px; direction: rtl; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
                    .detail-label { font-weight: 600; color: #555; }
                    .detail-value { font-weight: 700; color: #000; }
                    h4 { color: #C9A94E; }
                    @media print { body { padding: 10px; } }
                </style>
            </head>
            <body>
                ${content.outerHTML}
                <script>window.onload = function() { window.print(); };<\/script>
            </body>
            </html>
        `);
        win.document.close();
    }
}

// ===== showLedger - دفتر الأستاذ =====
function showLedger() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let entries = [];
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            entries.push({
                date: s.date,
                type: '💳 بيع',
                description: `فاتورة بيع - ${s.customer || 'عميل'}`,
                amount: total,
                color: '#2D8F5E'
            });
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            entries.push({
                date: p.date,
                type: '🛒 شراء',
                description: `فاتورة شراء - ${p.supplier || 'مورد'}`,
                amount: total,
                color: '#E06060'
            });
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            entries.push({
                date: e.date,
                type: '💸 مصروف',
                description: e.note,
                amount: e.amount,
                color: '#E6A830'
            });
        });
    }
    
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:16px;margin-bottom:10px;">📒 دفتر الأستاذ</h4>
            <div style="max-height:400px;overflow-y:auto;font-size:12px;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1.5fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>التاريخ</span><span>النوع</span><span>البيان</span><span>المبلغ</span>
                </div>
    `;
    
    if (entries.length === 0) {
        html += `<div class="empty-state" style="padding:16px 0;"><span>لا توجد حركات</span></div>`;
    } else {
        entries.slice(0, 50).forEach(e => {
            html += `
                <div style="display:grid;grid-template-columns:1fr 1fr 1.5fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                    <span style="font-size:10px;">${e.date}</span>
                    <span style="color:${e.color};font-weight:700;">${e.type}</span>
                    <span style="font-size:11px;">${e.description}</span>
                    <span style="color:${e.color};font-weight:700;">${e.amount.toFixed(2)}</span>
                </div>
            `;
        });
    }
    
    html += `</div></div>`;
    container.innerHTML = html;
}

// ===== showTrialBalance - ميزان المراجعة =====
function showTrialBalance() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            totalCredit += total;
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            totalDebit += total;
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            totalDebit += e.amount;
        });
    }
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') totalDebit += t.amount;
            else totalCredit += t.amount;
        });
    }
    
    const balance = totalDebit - totalCredit;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:16px;margin-bottom:10px;">⚖️ ميزان المراجعة</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
                <div style="padding:10px;background:#0D0D0D;border-radius:8px;border:1px solid #E06060;text-align:center;">
                    <div style="color:#E06060;font-weight:700;">📉 المدين</div>
                    <div style="font-size:22px;font-weight:900;color:#E06060;">${totalDebit.toFixed(2)}</div>
                </div>
                <div style="padding:10px;background:#0D0D0D;border-radius:8px;border:1px solid #2D8F5E;text-align:center;">
                    <div style="color:#2D8F5E;font-weight:700;">📈 الدائن</div>
                    <div style="font-size:22px;font-weight:900;color:#2D8F5E;">${totalCredit.toFixed(2)}</div>
                </div>
            </div>
            <div style="margin-top:8px;padding:10px;background:#0D0D0D;border-radius:8px;border:2px solid #C9A94E;text-align:center;">
                <div style="font-weight:700;color:#C9A94E;">الرصيد</div>
                <div style="font-size:20px;font-weight:900;color:${balance >= 0 ? '#E06060' : '#2D8F5E'};">${balance.toFixed(2)}</div>
                <div style="font-size:12px;color:#A89070;">${balance >= 0 ? 'مدين' : 'دائن'}</div>
            </div>
        </div>
    `;
}

// ===== showIncomeStatement - قائمة الدخل =====
function showIncomeStatement() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let revenue = 0;
    let expenses = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            revenue += total;
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            expenses += e.amount;
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            expenses += total;
        });
    }
    
    const netIncome = revenue - expenses;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:16px;margin-bottom:10px;">📄 قائمة الدخل</h4>
            <div style="font-size:14px;">
                <div style="padding:8px 0;border-bottom:1px solid #2D2D2D;">
                    <span style="font-weight:600;color:#A89070;">💰 الإيرادات</span>
                    <span style="float:left;color:#2D8F5E;font-weight:700;">${revenue.toFixed(2)} 🇪🇬</span>
                </div>
                <div style="padding:8px 0;border-bottom:1px solid #2D2D2D;">
                    <span style="font-weight:600;color:#A89070;">💸 المصروفات</span>
                    <span style="float:left;color:#E06060;font-weight:700;">${expenses.toFixed(2)} 🇪🇬</span>
                </div>
                <div style="padding:10px 0;border-top:2px solid #C9A94E;font-size:16px;">
                    <span style="font-weight:800;color:#C9A94E;">📊 صافي الدخل</span>
                    <span style="float:left;font-weight:900;color:${netIncome >= 0 ? '#2D8F5E' : '#E06060'};">${netIncome.toFixed(2)} 🇪🇬</span>
                </div>
            </div>
        </div>
    `;
}

// ===== showBalanceSheet - الميزانية العمومية =====
function showBalanceSheet() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') assets += t.amount;
        });
    }
    
    if (window.products && window.warehouseProducts) {
        window.products.forEach(p => {
            const qty = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0);
            assets += (p.sellPrice || 0) * qty;
        });
    }
    
    if (window.bonds) {
        window.bonds.forEach(b => {
            if (b.status === 'pending' || b.status === 'overdue') {
                liabilities += b.amount;
            }
        });
    }
    
    equity = assets - liabilities;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:16px;margin-bottom:10px;">📊 الميزانية العمومية</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
                <div style="padding:10px;background:#0D0D0D;border-radius:8px;border:1px solid #2D8F5E;text-align:center;">
                    <div style="color:#2D8F5E;font-weight:700;">🏦 الأصول</div>
                    <div style="font-size:22px;font-weight:900;color:#2D8F5E;">${assets.toFixed(2)}</div>
                </div>
                <div style="padding:10px;background:#0D0D0D;border-radius:8px;border:1px solid #E06060;text-align:center;">
                    <div style="color:#E06060;font-weight:700;">📋 الخصوم</div>
                    <div style="font-size:22px;font-weight:900;color:#E06060;">${liabilities.toFixed(2)}</div>
                </div>
            </div>
            <div style="margin-top:8px;padding:10px;background:#0D0D0D;border-radius:8px;border:2px solid #C9A94E;text-align:center;">
                <div style="font-weight:700;color:#C9A94E;">👑 حقوق الملكية</div>
                <div style="font-size:20px;font-weight:900;color:${equity >= 0 ? '#2D8F5E' : '#E06060'};">${equity.toFixed(2)}</div>
            </div>
            <div style="margin-top:4px;font-size:11px;color:#A89070;text-align:center;">
                الأصول = الخصوم + حقوق الملكية
            </div>
        </div>
    `;
}

// ===== showCashFlow - التدفقات النقدية =====
function showCashFlow() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let cashIn = 0;
    let cashOut = 0;
    let transactionCount = 0;
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            transactionCount++;
            if (t.type === 'deposit') cashIn += t.amount;
            else cashOut += t.amount;
        });
    }
    
    const netCash = cashIn - cashOut;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:16px;margin-bottom:10px;">💰 التدفقات النقدية</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
                <div style="padding:10px;background:#0D0D0D;border-radius:8px;border:1px solid #2D8F5E;text-align:center;">
                    <div style="color:#2D8F5E;font-weight:700;">📥 التدفقات الداخلة</div>
                    <div style="font-size:22px;font-weight:900;color:#2D8F5E;">${cashIn.toFixed(2)}</div>
                </div>
                <div style="padding:10px;background:#0D0D0D;border-radius:8px;border:1px solid #E06060;text-align:center;">
                    <div style="color:#E06060;font-weight:700;">📤 التدفقات الخارجة</div>
                    <div style="font-size:22px;font-weight:900;color:#E06060;">${cashOut.toFixed(2)}</div>
                </div>
            </div>
            <div style="margin-top:8px;padding:10px;background:#0D0D0D;border-radius:8px;border:2px solid #C9A94E;text-align:center;">
                <div style="font-weight:700;color:#C9A94E;">📊 صافي التدفق النقدي</div>
                <div style="font-size:20px;font-weight:900;color:${netCash >= 0 ? '#2D8F5E' : '#E06060'};">${netCash.toFixed(2)}</div>
            </div>
            <div style="margin-top:4px;font-size:12px;text-align:center;color:${netCash >= 0 ? '#2D8F5E' : '#E06060'};">
                ${netCash >= 0 ? '✅ التدفق النقدي موجب' : '⚠️ التدفق النقدي سالب'}
            </div>
            <div style="font-size:11px;color:#A89070;text-align:center;margin-top:2px;">
                📋 عدد الحركات: ${transactionCount}
            </div>
        </div>
    `;
}

// ===== showAudit - للتوافق مع الكود القديم =====
function showAudit() {
    showAuditReport();
}

// ================================================================
// DUMMY FUNCTIONS - دوال مؤقتة (سيتم استكمالها في ملفات منفصلة)
// ================================================================

// ===== دوال الفواتير =====
function renderSales() { 
    const container = document.getElementById('salesList');
    if (!container) return;
    
    if (!window.sales || window.sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد فواتير</span></div>`;
        return;
    }
    
    let html = `<div class="table-header" style="grid-template-columns:1fr 1.2fr 0.8fr 0.8fr 0.8fr 0.6fr;">
        <span>التاريخ</span><span>العميل</span><span>المبلغ</span><span>النوع</span><span>الدفع</span><span></span>
    </div>`;
    
    window.sales.slice().reverse().forEach(s => {
        const total = s.totalWithTax || s.total || 0;
        const type = s.invoiceType === 'tax' ? 'ضريبية' : 'عادية';
        html += `
            <div class="table-row" style="grid-template-columns:1fr 1.2fr 0.8fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span>${s.date}</span>
                <span>${s.customer || 'عميل'}</span>
                <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                <span>${type}</span>
                <span>${s.payment || 'نقدي'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="showInvoiceDetails(${s.id}, 'sale')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice(${s.id}, 'sale')"><i class="fas fa-trash"></i></button>
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
    
    let html = `<div class="table-header" style="grid-template-columns:1fr 1.2fr 0.8fr 0.8fr 0.8fr 0.6fr;">
        <span>التاريخ</span><span>المورد</span><span>المبلغ</span><span>النوع</span><span>الدفع</span><span></span>
    </div>`;
    
    window.purchases.slice().reverse().forEach(p => {
        const total = p.totalWithTax || p.total || 0;
        const type = p.invoiceType === 'tax' ? 'ضريبية' : 'عادية';
        html += `
            <div class="table-row" style="grid-template-columns:1fr 1.2fr 0.8fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span>${p.date}</span>
                <span>${p.supplier || 'مورد'}</span>
                <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                <span>${type}</span>
                <span>${p.payment || 'نقدي'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="showInvoiceDetails(${p.id}, 'purchase')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice(${p.id}, 'purchase')"><i class="fas fa-trash"></i></button>
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
    
    let html = `<div class="table-header" style="grid-template-columns:1fr 1.2fr 0.8fr 0.8fr 0.6fr;">
        <span>التاريخ</span><span>العميل</span><span>المبلغ</span><span>السبب</span><span></span>
    </div>`;
    
    window.returns.slice().reverse().forEach(r => {
        const total = r.items ? r.items.reduce((sum, item) => sum + (item.total || 0), 0) : (r.total || 0);
        html += `
            <div class="table-row" style="grid-template-columns:1fr 1.2fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span>${r.date}</span>
                <span>${r.customer || 'عميل'}</span>
                <span style="color:#E6A830;font-weight:700;">${total.toFixed(2)}</span>
                <span>${r.reason || '-'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="showInvoiceDetails(${r.id}, 'return')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice(${r.id}, 'return')"><i class="fas fa-trash"></i></button>
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
            const total = s.totalWithTax || s.total || 0;
            allInvoices.push({ ...s, type: 'sale', typeLabel: 'بيع', total: total, color: '#2D8F5E' });
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            allInvoices.push({ ...p, type: 'purchase', typeLabel: 'شراء', total: total, color: '#E06060' });
        });
    }
    
    if (window.returns) {
        window.returns.forEach(r => {
            const total = r.items ? r.items.reduce((sum, item) => sum + (item.total || 0), 0) : (r.total || 0);
            allInvoices.push({ ...r, type: 'return', typeLabel: 'مرتجع', total: total, color: '#E6A830' });
        });
    }
    
    allInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    safeSetText('allInvoicesCount', allInvoices.length);
    safeSetText('invoicesSalesCount', window.sales ? window.sales.length : 0);
    safeSetText('invoicesPurchasesCount', window.purchases ? window.purchases.length : 0);
    
    if (allInvoices.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>لا توجد فواتير</span></div>`;
        return;
    }
    
    let html = `<div class="table-header" style="grid-template-columns:1fr 0.8fr 1.2fr 0.8fr 0.8fr 0.8fr 0.6fr;">
        <span>التاريخ</span><span>النوع</span><span>العميل/المورد</span><span>المبلغ</span><span>النوع</span><span>الدفع</span><span></span>
    </div>`;
    
    allInvoices.slice(0, 50).forEach(inv => {
        const customer = inv.customer || inv.supplier || 'غير محدد';
        const invoiceType = inv.invoiceType === 'tax' ? 'ضريبية' : 'عادية';
        html += `
            <div class="table-row" style="grid-template-columns:1fr 0.8fr 1.2fr 0.8fr 0.8fr 0.8fr 0.6fr;font-size:10px;">
                <span>${inv.date}</span>
                <span style="color:${inv.color};font-weight:700;">${inv.typeLabel}</span>
                <span>${customer}</span>
                <span style="color:${inv.color};font-weight:700;">${inv.total.toFixed(2)}</span>
                <span>${invoiceType}</span>
                <span>${inv.payment || 'نقدي'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="showInvoiceDetails(${inv.id}, '${inv.type}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice(${inv.id}, '${inv.type}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteInvoice(id, type) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة نهائياً؟')) return;

    let invoice = null;
    let list = null;
    let name = '';

    if (type === 'sale') {
        invoice = window.sales?.find(s => s.id === id);
        list = window.sales;
        name = 'بيع';
    } else if (type === 'purchase') {
        invoice = window.purchases?.find(p => p.id === id);
        list = window.purchases;
        name = 'شراء';
    } else if (type === 'return') {
        invoice = window.returns?.find(r => r.id === id);
        list = window.returns;
        name = 'مرتجع';
    }

    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    const index = list.indexOf(invoice);
    if (index > -1) {
        list.splice(index, 1);
    }

    saveAll();
    addAuditLog('delete', 'invoice', `حذف فاتورة ${name} #${invoice.invoiceNumber || invoice.id}`);
    refreshAllPages();
    showToast('🗑️ تم حذف الفاتورة', 'info');
}

function updateSalesPrice() {
    const productId = parseInt(document.getElementById('salesItemProduct')?.value);
    if (!productId) return;
    const product = window.products?.find(p => p.id === productId);
    if (product) {
        document.getElementById('salesItemPrice').value = product.sellPrice || 0;
    }
}

function addSalesItem() {
    const productId = parseInt(document.getElementById('salesItemProduct')?.value);
    const qty = parseInt(document.getElementById('salesItemQty')?.value) || 1;
    const price = parseFloat(document.getElementById('salesItemPrice')?.value);

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (isNaN(price) || price <= 0) { showToast('⚠️ سعر صحيح', 'error'); return; }

    const product = window.products?.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    const totalQty = window.warehouseProducts?.filter(wp => wp.productId === productId).reduce((s, wp) => s + wp.qty, 0) || 0;
    if (totalQty < qty) {
        showToast(`⚠️ الكمية غير متوفرة (المتاح: ${totalQty})`, 'error');
        return;
    }

    const total = qty * price;

    if (!window.salesItems) window.salesItems = [];
    window.salesItems.push({
        productId: productId,
        productName: product.name,
        qty: qty,
        price: price,
        total: total
    });

    renderSalesItems();
    document.getElementById('salesItemProduct').value = '';
    document.getElementById('salesItemQty').value = '';
    document.getElementById('salesItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderSalesItems() {
    const body = document.getElementById('salesItemsBody');
    if (!body) return;

    if (!window.salesItems || window.salesItems.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        safeSetText('salesItemsCount', '0');
        safeSetText('salesTotalAmount', '0.00');
        return;
    }

    let html = '';
    let total = 0;
    window.salesItems.forEach((item, i) => {
        total += item.total;
        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeSalesItem(${i})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });

    body.innerHTML = html;
    safeSetText('salesItemsCount', window.salesItems.length);
    safeSetText('salesTotalAmount', total.toFixed(2));

    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const taxInfo = document.getElementById('salesTaxInfo');
    if (taxInfo) {
        if (invoiceType === 'tax') {
            const tax = total * 0.14;
            taxInfo.innerHTML = `📊 الضريبة (14%): ${tax.toFixed(2)} 🇪🇬 | 💰 الإجمالي مع الضريبة: ${(total + tax).toFixed(2)} 🇪🇬`;
        } else {
            taxInfo.innerHTML = '';
        }
    }
}

function removeSalesItem(index) {
    if (!window.salesItems) return;
    window.salesItems.splice(index, 1);
    renderSalesItems();
}

function saveSaleInvoice() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    if (!window.salesItems || window.salesItems.length === 0) {
        showToast('⚠️ أضف أصنافاً أولاً', 'error');
        return;
    }

    const customer = document.getElementById('salesCustomer')?.value?.trim() ||
        document.getElementById('salesCustomerSelect')?.value || 'عميل';
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const date = document.getElementById('salesDate')?.value || getTodayDate();
    const payment = getSelectedPayment('sales');

    let total = 0;
    const items = window.salesItems.map(item => {
        total += item.total;
        return { ...item };
    });

    const isTax = invoiceType === 'tax';
    const taxAmount = isTax ? (total * 14) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;

    const invoice = {
        id: Date.now(),
        invoiceNumber: getNextInvoiceNumber(),
        customer: customer,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        date: date,
        time: getCurrentTime(),
        payment: payment,
        items: items,
        total: total,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        createdAt: new Date().toISOString()
    };

    if (!window.sales) window.sales = [];
    window.sales.push(invoice);

    items.forEach(item => {
        const wp = window.warehouseProducts?.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty -= item.qty;
        }
    });

    window.treasury.push({
        id: Date.now() + 1,
        type: 'deposit',
        amount: totalWithTax,
        method: payment,
        note: `فاتورة بيع #${invoice.invoiceNumber} - ${customer}`,
        date: date,
        time: getCurrentTime(),
        invoiceId: invoice.id
    });

    window.salesItems = [];
    saveAll();
    addAuditLog('add', 'sale', `إضافة فاتورة بيع #${invoice.invoiceNumber} - ${customer} - ${totalWithTax.toFixed(2)}`);
    renderSalesItems();
    renderSales();
    populateAllSelects();
    showToast(`✅ تم حفظ فاتورة البيع #${invoice.invoiceNumber}`, 'success');
    updateDashboard();
}

function addPurchaseItem() {
    const productId = parseInt(document.getElementById('purchaseItemProduct')?.value);
    const qty = parseInt(document.getElementById('purchaseItemQty')?.value) || 1;
    const price = parseFloat(document.getElementById('purchaseItemPrice')?.value);

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (isNaN(price) || price <= 0) { showToast('⚠️ سعر صحيح', 'error'); return; }

    const product = window.products?.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    const total = qty * price;

    if (!window.purchaseItems) window.purchaseItems = [];
    window.purchaseItems.push({
        productId: productId,
        productName: product.name,
        qty: qty,
        price: price,
        total: total
    });

    renderPurchaseItems();
    document.getElementById('purchaseItemProduct').value = '';
    document.getElementById('purchaseItemQty').value = '';
    document.getElementById('purchaseItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderPurchaseItems() {
    const body = document.getElementById('purchaseItemsBody');
    if (!body) return;

    if (!window.purchaseItems || window.purchaseItems.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        safeSetText('purchaseItemsCount', '0');
        safeSetText('purchaseTotalAmount', '0.00');
        return;
    }

    let html = '';
    let total = 0;
    window.purchaseItems.forEach((item, i) => {
        total += item.total;
        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removePurchaseItem(${i})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });

    body.innerHTML = html;
    safeSetText('purchaseItemsCount', window.purchaseItems.length);
    safeSetText('purchaseTotalAmount', total.toFixed(2));

    const invoiceType = document.getElementById('purchaseInvoiceType')?.value || 'simple';
    const taxInfo = document.getElementById('purchaseTaxInfo');
    if (taxInfo) {
        if (invoiceType === 'tax') {
            const tax = total * 0.14;
            taxInfo.innerHTML = `📊 الضريبة (14%): ${tax.toFixed(2)} 🇪🇬 | 💰 الإجمالي مع الضريبة: ${(total + tax).toFixed(2)} 🇪🇬`;
        } else {
            taxInfo.innerHTML = '';
        }
    }
}

function removePurchaseItem(index) {
    if (!window.purchaseItems) return;
    window.purchaseItems.splice(index, 1);
    renderPurchaseItems();
}

function savePurchaseInvoice() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    if (!window.purchaseItems || window.purchaseItems.length === 0) {
        showToast('⚠️ أضف أصنافاً أولاً', 'error');
        return;
    }

    const supplier = document.getElementById('purchaseSupplier')?.value?.trim() ||
        document.getElementById('purchaseSupplierSelect')?.value || 'مورد';
    const warehouseId = parseInt(document.getElementById('purchaseWarehouse')?.value);
    const invoiceType = document.getElementById('purchaseInvoiceType')?.value || 'simple';
    const date = document.getElementById('purchaseDate')?.value || getTodayDate();
    const payment = getSelectedPayment('purchase');

    let total = 0;
    const items = window.purchaseItems.map(item => {
        total += item.total;
        return { ...item };
    });

    const isTax = invoiceType === 'tax';
    const taxAmount = isTax ? (total * 14) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;

    const invoice = {
        id: Date.now(),
        invoiceNumber: getNextInvoiceNumber(),
        supplier: supplier,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        date: date,
        time: getCurrentTime(),
        payment: payment,
        items: items,
        total: total,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        createdAt: new Date().toISOString()
    };

    if (!window.purchases) window.purchases = [];
    window.purchases.push(invoice);

    items.forEach(item => {
        const existing = window.warehouseProducts?.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (existing) {
            existing.qty += item.qty;
        } else {
            if (!window.warehouseProducts) window.warehouseProducts = [];
            window.warehouseProducts.push({
                warehouseId: warehouseId,
                productId: item.productId,
                qty: item.qty
            });
        }
    });

    window.treasury.push({
        id: Date.now() + 1,
        type: 'withdraw',
        amount: totalWithTax,
        method: payment,
        note: `فاتورة شراء #${invoice.invoiceNumber} - ${supplier}`,
        date: date,
        time: getCurrentTime(),
        invoiceId: invoice.id
    });

    window.purchaseItems = [];
    saveAll();
    addAuditLog('add', 'purchase', `إضافة فاتورة شراء #${invoice.invoiceNumber} - ${supplier} - ${totalWithTax.toFixed(2)}`);
    renderPurchaseItems();
    renderAllPurchases();
    populateAllSelects();
    showToast(`✅ تم حفظ فاتورة الشراء #${invoice.invoiceNumber}`, 'success');
    updateDashboard();
}

function addReturnItem() {
    const productId = parseInt(document.getElementById('returnItemProduct')?.value);
    const qty = parseInt(document.getElementById('returnItemQty')?.value) || 1;
    const price = parseFloat(document.getElementById('returnItemPrice')?.value);

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (isNaN(price) || price <= 0) { showToast('⚠️ سعر صحيح', 'error'); return; }

    const product = window.products?.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    const total = qty * price;

    if (!window.returnItems) window.returnItems = [];
    window.returnItems.push({
        productId: productId,
        productName: product.name,
        qty: qty,
        price: price,
        total: total
    });

    renderReturnItems();
    document.getElementById('returnItemProduct').value = '';
    document.getElementById('returnItemQty').value = '';
    document.getElementById('returnItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderReturnItems() {
    const body = document.getElementById('returnItemsBody');
    if (!body) return;

    if (!window.returnItems || window.returnItems.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        safeSetText('returnItemsCount', '0');
        safeSetText('returnTotalAmount', '0.00');
        return;
    }

    let html = '';
    let total = 0;
    window.returnItems.forEach((item, i) => {
        total += item.total;
        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeReturnItem(${i})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });

    body.innerHTML = html;
    safeSetText('returnItemsCount', window.returnItems.length);
    safeSetText('returnTotalAmount', total.toFixed(2));
}

function removeReturnItem(index) {
    if (!window.returnItems) return;
    window.returnItems.splice(index, 1);
    renderReturnItems();
}

function saveReturnInvoice() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    if (!window.returnItems || window.returnItems.length === 0) {
        showToast('⚠️ أضف أصنافاً أولاً', 'error');
        return;
    }

    const customer = document.getElementById('returnCustomer')?.value?.trim() ||
        document.getElementById('returnCustomerSelect')?.value || 'عميل';
    const warehouseId = parseInt(document.getElementById('returnWarehouse')?.value);
    const date = document.getElementById('returnDate')?.value || getTodayDate();
    const reason = document.getElementById('returnReason')?.value || 'أسباب أخرى';

    let total = 0;
    const items = window.returnItems.map(item => {
        total += item.total;
        return { ...item };
    });

    const invoice = {
        id: Date.now(),
        invoiceNumber: getNextInvoiceNumber(),
        customer: customer,
        warehouseId: warehouseId,
        date: date,
        time: getCurrentTime(),
        reason: reason,
        items: items,
        total: total,
        createdAt: new Date().toISOString()
    };

    if (!window.returns) window.returns = [];
    window.returns.push(invoice);

    items.forEach(item => {
        const wp = window.warehouseProducts?.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty += item.qty;
        }
    });

    window.returnItems = [];
    saveAll();
    addAuditLog('add', 'return', `إضافة مرتجع #${invoice.invoiceNumber} - ${customer} - ${total.toFixed(2)}`);
    renderReturnItems();
    renderAllReturns();
    populateAllSelects();
    showToast(`✅ تم تسجيل المرتجع #${invoice.invoiceNumber}`, 'success');
    updateDashboard();
}

// ===== دوال الإذونات =====
function renderPermissions() {
    const container = document.getElementById('permissionList');
    if (!container) return;
    
    if (!window.permissions || window.permissions.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد إذونات</span></div>`;
        return;
    }
    
    const statusMap = {
        'pending': { label: '⏳ معلق', color: '#E6A830' },
        'executed': { label: '✅ منفذ', color: '#2D8F5E' },
        'cancelled': { label: '❌ ملغي', color: '#E06060' }
    };
    
    let html = `<div class="table-header" style="grid-template-columns:0.8fr 0.8fr 1fr 1fr 0.8fr 1fr 0.6fr;">
        <span>النوع</span><span>التاريخ</span><span>من</span><span>إلى</span><span>الكمية</span><span>الحالة</span><span></span>
    </div>`;
    
    window.permissions.slice().reverse().forEach(p => {
        const from = window.warehouses?.find(w => w.id === p.fromWarehouseId);
        const to = window.warehouses?.find(w => w.id === p.toWarehouseId);
        const status = statusMap[p.status] || { label: p.status, color: '#A89070' };
        const typeMap = {
            'transfer': 'تحويل',
            'withdraw': 'صرف',
            'add': 'إضافة',
            'inventory': 'جرد',
            'adjustment': 'تسوية'
        };
        html += `
            <div class="table-row" style="grid-template-columns:0.8fr 0.8fr 1fr 1fr 0.8fr 1fr 0.6fr;font-size:10px;">
                <span>${typeMap[p.type] || p.type}</span>
                <span>${p.date}</span>
                <span>${from?.name || '-'}</span>
                <span>${to?.name || '-'}</span>
                <span>${p.qty || 0}</span>
                <span><span class="status-badge" style="background:${status.color};color:#fff;">${status.label}</span></span>
                <div class="actions">
                    ${p.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="executePermission(${p.id})"><i class="fas fa-check"></i></button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deletePermission(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function addPermission() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const type = document.getElementById('permissionType')?.value || 'transfer';
    const fromWarehouseId = parseInt(document.getElementById('permissionFrom')?.value);
    const toWarehouseId = parseInt(document.getElementById('permissionTo')?.value);
    const productId = parseInt(document.getElementById('permissionProduct')?.value);
    const qty = parseInt(document.getElementById('permissionQty')?.value) || 1;
    const date = document.getElementById('permissionDate')?.value || getTodayDate();
    const note = document.getElementById('permissionNote')?.value?.trim() || '';

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ كمية صحيحة', 'error'); return; }

    const permission = {
        id: Date.now(),
        type: type,
        fromWarehouseId: fromWarehouseId || null,
        toWarehouseId: toWarehouseId || null,
        productId: productId,
        qty: qty,
        date: date,
        note: note,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    if (!window.permissions) window.permissions = [];
    window.permissions.push(permission);

    saveAll();
    addAuditLog('add', 'permission', `إضافة إذن ${type} - الكمية: ${qty}`);
    renderPermissions();
    populateAllSelects();
    showToast('✅ تم إضافة الإذن', 'success');
}

function executeSelectedPermission() {
    showToast('⏳ اختر إذناً للتنفيذ', 'info');
}

function filterPermissions(filter) {
    renderPermissions();
    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === (filter === 'all' ? 'الكل' : 
            filter === 'pending' ? '⏳ معلق' : 
            filter === 'executed' ? '✅ منفذ' : 
            filter === 'cancelled' ? '❌ ملغي' : ''));
    });
}

function executePermission(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('✅ تنفيذ الإذن؟')) return;

    const p = window.permissions?.find(perm => perm.id === id);
    if (!p) { showToast('⚠️ الإذن غير موجود', 'error'); return; }

    if (p.type === 'transfer' || p.type === 'withdraw') {
        const fromQty = window.warehouseProducts?.find(w => w.warehouseId === p.fromWarehouseId && w.productId === p.productId)?.qty || 0;
        if (fromQty < p.qty) {
            showToast(`⚠️ الكمية غير متوفرة (المتاح: ${fromQty})`, 'error');
            return;
        }
    }

    if (p.type === 'transfer' || p.type === 'withdraw') {
        const from = window.warehouseProducts?.find(w => w.warehouseId === p.fromWarehouseId && w.productId === p.productId);
        if (from) from.qty -= p.qty;
    }

    if (p.type === 'transfer' || p.type === 'add') {
        const to = window.warehouseProducts?.find(w => w.warehouseId === p.toWarehouseId && w.productId === p.productId);
        if (to) {
            to.qty += p.qty;
        } else {
            if (!window.warehouseProducts) window.warehouseProducts = [];
            window.warehouseProducts.push({
                warehouseId: p.toWarehouseId,
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
    showToast('✅ تم تنفيذ الإذن', 'success');
}

function deletePermission(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الإذن؟')) return;

    window.permissions = window.permissions?.filter(p => p.id !== id) || [];
    saveAll();
    renderPermissions();
    showToast('🗑️ تم الحذف', 'info');
}

// ===== دوال الباركود =====
function startBarcodeScanner() {
    showToast('📷 جاري تشغيل الكاميرا...', 'info');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const video = document.createElement('video');
        video.style.width = '100%';
        video.style.maxHeight = '300px';
        video.style.borderRadius = '8px';
        video.style.background = '#000';
        
        const container = document.getElementById('barcode-scanner');
        if (container) {
            container.innerHTML = '';
            container.appendChild(video);
            
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    video.srcObject = stream;
                    video.setAttribute('playsinline', true);
                    video.play();
                    showToast('📷 الكاميرا تعمل...', 'success');
                    scanBarcode(video, stream);
                })
                .catch(err => {
                    showToast('❌ لا يمكن تشغيل الكاميرا: ' + err.message, 'error');
                });
        }
    } else {
        showToast('❌ الكاميرا غير مدعومة', 'error');
    }
}

function scanBarcode(video, stream) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    function scan() {
        if (!video || video.paused || video.ended) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            if (typeof jsQR !== 'undefined') {
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    const barcode = code.data;
                    const resultEl = document.getElementById('barcodeResult');
                    if (resultEl) {
                        resultEl.innerHTML = `<span style="color:#2D8F5E;">✅ تم المسح: ${barcode}</span>`;
                        resultEl.className = 'barcode-result success';
                    }
                    document.getElementById('barcodeSearch').value = barcode;
                    searchByBarcode();
                    stopBarcodeScanner();
                    return;
                }
            }
        } catch(e) {}
        
        requestAnimationFrame(scan);
    }
    scan();
}

function stopBarcodeScanner() {
    const container = document.getElementById('barcode-scanner');
    if (container) {
        const video = container.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        container.innerHTML = `<p style="color:#A89070;text-align:center;">📷 اضغط "بدء" لتشغيل الكاميرا</p>`;
    }
    const resultEl = document.getElementById('barcodeResult');
    if (resultEl) {
        resultEl.innerHTML = `<p style="color:#A89070;">📷 تم إيقاف الكاميرا</p>`;
        resultEl.className = 'barcode-result';
    }
    showToast('📷 تم إيقاف الكاميرا', 'info');
}

// ===== دوال الكاشف =====
function renderCashier() {
    const today = getTodayDate();
    safeSetText('cashierDate', today);
    
    let openingBalance = 0;
    let totalSales = 0;
    let totalExpenses = 0;
    let cash = 0;
    let wallet = 0;
    let bank = 0;
    let instapay = 0;
    let transactionCount = 0;
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.date === today) {
                transactionCount++;
                if (t.type === 'deposit') {
                    if (t.method === 'نقدي') cash += t.amount;
                    else if (t.method === 'محفظة') wallet += t.amount;
                    else if (t.method === 'بنك') bank += t.amount;
                    else if (t.method === 'إنستاباي') instapay += t.amount;
                } else {
                    if (t.method === 'نقدي') cash -= t.amount;
                    else if (t.method === 'محفظة') wallet -= t.amount;
                    else if (t.method === 'بنك') bank -= t.amount;
                    else if (t.method === 'إنستاباي') instapay -= t.amount;
                }
            }
        });
    }
    
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.date === today) {
                const total = s.totalWithTax || s.total || 0;
                totalSales += total;
            }
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            if (e.date === today) {
                totalExpenses += e.amount;
            }
        });
    }
    
    const closingBalance = openingBalance + totalSales - totalExpenses;
    
    safeSetText('cashierOpeningBalance', openingBalance.toFixed(2));
    safeSetText('cashierTotalSales', totalSales.toFixed(2));
    safeSetText('cashierTotalExpenses', totalExpenses.toFixed(2));
    safeSetText('cashierClosingBalance', closingBalance.toFixed(2));
    safeSetText('cashierCash', cash.toFixed(2));
    safeSetText('cashierWallet', wallet.toFixed(2));
    safeSetText('cashierBank', bank.toFixed(2));
    safeSetText('cashierInstapay', instapay.toFixed(2));
    safeSetText('cashierTransactionCount', transactionCount);
    safeSetText('cashierTodayCount', transactionCount);
    
    const container = document.getElementById('cashierTodayTransactions');
    if (container) {
        const todayTransactions = window.treasury ? window.treasury.filter(t => t.date === today) : [];
        if (todayTransactions.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-receipt" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد حركات اليوم</span></div>`;
        } else {
            let html = '';
            todayTransactions.slice().reverse().forEach(t => {
                const color = t.type === 'deposit' ? '#2D8F5E' : '#E06060';
                const sign = t.type === 'deposit' ? '+' : '-';
                html += `
                    <div style="display:grid;grid-template-columns:1fr 0.8fr 0.8fr 0.6fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;font-size:11px;color:#F5E6C8;">
                        <span>${t.note}</span>
                        <span style="color:${color};font-weight:700;">${sign}${t.amount.toFixed(2)}</span>
                        <span>${t.method || 'نقدي'}</span>
                        <span style="font-size:9px;color:#A89070;">${t.time || ''}</span>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    }
    
    const historyContainer = document.getElementById('cashierHistory');
    if (historyContainer) {
        if (!window.cashierHistory || window.cashierHistory.length === 0) {
            historyContainer.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-calendar" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد سجلات سابقة</span></div>`;
        } else {
            let html = '';
            window.cashierHistory.slice().reverse().forEach(h => {
                html += `
                    <div class="cashier-history-item">
                        <div class="header">
                            <span>📅 ${h.date}</span>
                            <span style="color:${h.status === 'open' ? '#2D8F5E' : '#E06060'};">${h.status === 'open' ? '✅ مفتوح' : '🔴 مغلق'}</span>
                        </div>
                        <div class="details">
                            <div>💰 الافتتاح: ${h.openingBalance?.toFixed(2) || '0.00'}</div>
                            <div>📊 المبيعات: ${h.totalSales?.toFixed(2) || '0.00'}</div>
                            <div>💸 المصروفات: ${h.totalExpenses?.toFixed(2) || '0.00'}</div>
                            <div>🏦 الختامي: ${h.closingBalance?.toFixed(2) || '0.00'}</div>
                            <div>📋 الحركات: ${h.transactionCount || 0}</div>
                            <div>👤 ${h.user || 'admin'}</div>
                        </div>
                    </div>
                `;
            });
            historyContainer.innerHTML = html;
        }
    }
}

function cashierOpenDay() {
    if (!confirm('✅ فتح اليوم الجديد؟')) return;
    const today = getTodayDate();
    
    let balance = 0;
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') balance += t.amount;
            else balance -= t.amount;
        });
    }
    
    if (!window.cashierHistory) window.cashierHistory = [];
    window.cashierHistory.push({
        date: today,
        status: 'open',
        openingBalance: balance,
        totalSales: 0,
        totalExpenses: 0,
        closingBalance: balance,
        transactionCount: 0,
        user: currentUser?.username || 'admin',
        openedAt: new Date().toISOString()
    });
    
    localStorage.setItem('mizan_cashier_status', JSON.stringify({ date: today, status: 'open' }));
    saveAll();
    renderCashier();
    
    const badge = document.getElementById('cashierStatusBadge');
    if (badge) {
        badge.textContent = '🟢 مفتوح';
        badge.style.background = '#2D8F5E';
        badge.style.color = '#fff';
    }
    showToast('✅ تم فتح اليوم', 'success');
}

function cashierCloseDay() {
    if (!confirm('🔴 إغلاق اليوم؟')) return;
    const today = getTodayDate();
    
    let openingBalance = 0;
    let totalSales = 0;
    let totalExpenses = 0;
    let transactionCount = 0;
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.date === today) {
                transactionCount++;
                if (t.type === 'deposit') openingBalance += t.amount;
            }
        });
    }
    
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.date === today) {
                const total = s.totalWithTax || s.total || 0;
                totalSales += total;
            }
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            if (e.date === today) {
                totalExpenses += e.amount;
            }
        });
    }
    
    const closingBalance = openingBalance + totalSales - totalExpenses;
    
    const historyIndex = window.cashierHistory?.findIndex(h => h.date === today && h.status === 'open') || -1;
    if (historyIndex > -1) {
        window.cashierHistory[historyIndex].status = 'closed';
        window.cashierHistory[historyIndex].totalSales = totalSales;
        window.cashierHistory[historyIndex].totalExpenses = totalExpenses;
        window.cashierHistory[historyIndex].closingBalance = closingBalance;
        window.cashierHistory[historyIndex].transactionCount = transactionCount;
        window.cashierHistory[historyIndex].closedAt = new Date().toISOString();
    }
    
    localStorage.removeItem('mizan_cashier_status');
    saveAll();
    renderCashier();
    
    const badge = document.getElementById('cashierStatusBadge');
    if (badge) {
        badge.textContent = '🔴 مغلق';
        badge.style.background = '#E06060';
        badge.style.color = '#fff';
    }
    showToast('🔴 تم إغلاق اليوم', 'info');
}

function cashierPrintReport() {
    const today = getTodayDate();
    const company = window.companyData || {};
    
    let openingBalance = 0;
    let totalSales = 0;
    let totalExpenses = 0;
    let transactionCount = 0;
    let transactions = [];
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.date === today) {
                transactionCount++;
                transactions.push(t);
                if (t.type === 'deposit') openingBalance += t.amount;
            }
        });
    }
    
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.date === today) {
                const total = s.totalWithTax || s.total || 0;
                totalSales += total;
            }
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            if (e.date === today) {
                totalExpenses += e.amount;
            }
        });
    }
    
    const closingBalance = openingBalance + totalSales - totalExpenses;
    
    let html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${company.name || 'الميزان'}</h2>
                <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                <div class="contact-info">📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'}</div>
            </div>
            <div style="border-bottom:2px solid #C9A94E;padding:6px 0;margin-bottom:6px;">
                <h3 style="color:#C9A94E;font-size:16px;">📋 تقرير الكاشف</h3>
                <div style="font-size:12px;">📅 ${today}</div>
            </div>
            <div style="text-align:right;font-size:12px;padding:4px 0;">
                <div>💰 الرصيد الافتتاحي: <span style="color:#C9A94E;font-weight:700;">${openingBalance.toFixed(2)}</span></div>
                <div>📊 إجمالي المبيعات: <span style="color:#2D8F5E;font-weight:700;">${totalSales.toFixed(2)}</span></div>
                <div>💸 إجمالي المصروفات: <span style="color:#E06060;font-weight:700;">${totalExpenses.toFixed(2)}</span></div>
                <div style="border-top:2px solid #C9A94E;padding-top:4px;margin-top:4px;font-size:14px;">
                    📊 الرصيد الختامي: <span style="color:#C9A94E;font-weight:900;">${closingBalance.toFixed(2)}</span>
                </div>
                <div style="font-size:11px;color:#A89070;margin-top:4px;">📋 عدد الحركات: ${transactionCount}</div>
            </div>
    `;

    if (transactions.length > 0) {
        html += `
            <div style="border-top:1px solid #3D3D3D;padding-top:6px;margin-top:6px;">
                <div style="font-weight:700;font-size:11px;color:#C9A94E;">📋 تفاصيل الحركات</div>
                ${transactions.slice().reverse().map(t => `
                    <div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;border-bottom:1px solid #2D2D2D;">
                        <span>${t.note}</span>
                        <span style="color:${t.type === 'deposit' ? '#2D8F5E' : '#E06060'};font-weight:700;">${t.type === 'deposit' ? '+' : '-'}${t.amount.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    html += `
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
                <title>تقرير الكاشف</title>
                <style>
                    body { margin: 0; padding: 10px; background: #fff; font-family: 'Tajawal', Arial, sans-serif; direction: rtl; }
                    .invoice-print-boxed { max-width: 320px; margin: 0 auto; padding: 15px; border: 1px solid #000; background: #fff; color: #000; font-size: 12px; text-align: center; }
                    .company-header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
                    .company-header h2 { font-size: 18px; margin: 0; color: #000; }
                    .company-header .sub-title { font-size: 11px; color: #555; }
                    .company-header .contact-info { font-size: 10px; color: #555; }
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
            updateSecurityButton();
            updateClock();
        }, 300);
    }

    console.log('✅ الميزان جاهز للاستخدام');
    console.log('🔒 كلمة المرور: 123456');
    console.log('🔑 اضغط 5 مرات على رقم الإصدار في الإعدادات لتفعيل زر توليد المفاتيح');
});
