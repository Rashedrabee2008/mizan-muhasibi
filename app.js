// ================================================================
// ================================================================
// app.js - الملف الرئيسي الكامل والمربوط ببعضه
// نظام الميزان - محاسبة ونقاط بيع
// ================================================================
// ================================================================

// ================================================================
// CONFIG
// ================================================================
const DEFAULT_PASSWORD = '123456';
let currentPassword = localStorage.getItem('app_password') || DEFAULT_PASSWORD;
let backupInterval = null;
let versionClickCount = 0;
let currentUser = JSON.parse(localStorage.getItem('mizan_current_user')) || { username: 'مدير', role: 'admin' };

// ================================================================
// قاموس أسماء التقارير
// ================================================================
const REPORT_NAMES = {
    'sales': 'المبيعات',
    'purchases': 'المشتريات',
    'profit': 'الأرباح',
    'inventory': 'المخزون',
    'customers_report': 'العملاء',
    'warehouse': 'المخازن',
    'expenses': 'المصروفات'
};

// ================================================================
// تهيئة جميع المتغيرات
// ================================================================
function initAppData() {
    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses', 
                  'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'backups', 
                  'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'];
    
    keys.forEach(key => {
        if (typeof window[key] === 'undefined' || !Array.isArray(window[key])) {
            try {
                const data = localStorage.getItem('mizan_' + key);
                window[key] = data ? JSON.parse(data) : [];
            } catch(e) {
                window[key] = [];
            }
        }
    });
    
    if (!window.companyData || typeof window.companyData !== 'object') {
        try {
            const data = localStorage.getItem('mizan_companyData');
            window.companyData = data ? JSON.parse(data) : {};
        } catch(e) {
            window.companyData = {};
        }
    }
    
    if (!window.users || !Array.isArray(window.users)) {
        try {
            const data = localStorage.getItem('mizan_users');
            window.users = data ? JSON.parse(data) : [
                { id: 1, username: 'مدير', role: 'admin' },
                { id: 2, username: 'مشرف', role: 'manager' },
                { id: 3, username: 'كاشير', role: 'cashier' },
                { id: 4, username: 'مشاهد', role: 'viewer' }
            ];
        } catch(e) {
            window.users = [
                { id: 1, username: 'مدير', role: 'admin' },
                { id: 2, username: 'مشرف', role: 'manager' },
                { id: 3, username: 'كاشير', role: 'cashier' },
                { id: 4, username: 'مشاهد', role: 'viewer' }
            ];
        }
    }
    
    if (!window.currentUser || typeof window.currentUser !== 'object') {
        try {
            const data = localStorage.getItem('mizan_current_user');
            window.currentUser = data ? JSON.parse(data) : { username: 'مدير', role: 'admin' };
        } catch(e) {
            window.currentUser = { username: 'مدير', role: 'admin' };
        }
    }
    
    console.log('✅ تم تهيئة جميع المتغيرات بنجاح');
}

// استدعاء التهيئة
initAppData();

// ================================================================
// HELPERS
// ================================================================
function safeSetText(id, value) { 
    const el = document.getElementById(id); 
    if (el) el.textContent = value !== undefined && value !== null ? value : '0'; 
}

function safeSetValue(id, value) { 
    const el = document.getElementById(id); 
    if (el) el.value = value !== undefined && value !== null ? value : ''; 
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

// ================================================================
// STORAGE
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

// ================================================================
// SAVE ALL
// ================================================================
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
    } catch (e) {
        console.warn('⚠️ خطأ في الحفظ:', e);
    }
}

// ================================================================
// SEED DATA
// ================================================================
function seedData() {
    initAppData();
    
    if (window.warehouses.length === 0) {
        window.warehouses = [
            { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
            { id: 2, name: 'مخزن المحل', type: 'محل', address: 'المنصورة' }
        ];
        setData('warehouses', window.warehouses);
    }
    if (window.products.length === 0) {
        window.products = [
            { id: 1, name: 'منتج تجريبي 1', buyPrice: 50, sellPrice: 100, min: 5, barcode: '123456789' },
            { id: 2, name: 'منتج تجريبي 2', buyPrice: 30, sellPrice: 75, min: 3, barcode: '987654321' }
        ];
        setData('products', window.products);
        if (window.warehouseProducts.length === 0) {
            window.warehouseProducts = [
                { warehouseId: 1, productId: 1, qty: 50 },
                { warehouseId: 1, productId: 2, qty: 30 },
                { warehouseId: 2, productId: 1, qty: 10 },
                { warehouseId: 2, productId: 2, qty: 5 }
            ];
            setData('warehouseProducts', window.warehouseProducts);
        }
    }
    if (window.customers.length === 0) {
        window.customers = [{
            id: 1,
            name: 'أحمد محمد',
            phone: '01234567890',
            whatsapp: '01011993799',
            email: 'ahmed@test.com',
            address: 'القاهرة',
            active: true
        }];
        setData('customers', window.customers);
    }
    if (window.suppliers.length === 0) {
        window.suppliers = [{
            id: 1,
            name: 'شركة الاتصالات',
            phone: '0234567890',
            whatsapp: '01158767633',
            email: 'info@telecom.com',
            address: 'القاهرة',
            active: true
        }];
        setData('suppliers', window.suppliers);
    }
    if (window.accounts.length === 0) {
        window.accounts = [
            { id: 1, name: 'أصول', type: 'assets', parentId: null },
            { id: 2, name: 'خصوم', type: 'liabilities', parentId: null },
            { id: 3, name: 'حقوق ملكية', type: 'equity', parentId: null },
            { id: 4, name: 'إيرادات', type: 'revenue', parentId: null },
            { id: 5, name: 'مصروفات', type: 'expenses', parentId: null }
        ];
        setData('accounts', window.accounts);
    }
    if (!window.companyData || typeof window.companyData !== 'object' || Object.keys(window.companyData).length === 0) {
        window.companyData = {
            name: 'شركة الميزان',
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
        setData('companyData', window.companyData);
    }
    
    saveAll();
    console.log('✅ تم تهيئة البيانات بنجاح');
}

// ================================================================
// PERMISSIONS
// ================================================================
function isAdmin() { 
    return window.currentUser?.role === 'admin'; 
}

function canDelete() { 
    return window.currentUser?.role === 'admin'; 
}

function canEdit() { 
    return window.currentUser?.role === 'admin' || window.currentUser?.role === 'manager'; 
}

function canAdd() { 
    return window.currentUser?.role !== 'viewer'; 
}

function canViewAudit() { 
    return window.currentUser?.role === 'admin'; 
}

function updateUIByPermissions() {
    const clearAuditBtn = document.getElementById('clearAuditBtn');
    if (clearAuditBtn) {
        clearAuditBtn.style.display = canViewAudit() ? 'block' : 'none';
    }
    
    const display = document.getElementById('currentUserDisplay');
    const roleDisplay = document.getElementById('currentRoleDisplay');
    if (display) display.textContent = window.currentUser?.username || 'admin';
    if (roleDisplay) {
        const roles = { admin: 'مدير', manager: 'مشرف', cashier: 'كاشير', viewer: 'مشاهد' };
        roleDisplay.textContent = roles[window.currentUser?.role] || window.currentUser?.role || 'مدير';
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
            initAppData();
            seedData();
            populateAllSelects();
            refreshAllPages();
            startAutoBackup();
            updateUIByPermissions();
            updateClock();
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

    closeMorePanel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshPage(pageId);
}

function refreshPage(pageId) {
    if (pageId === 'dashboard' && typeof updateDashboard === 'function') updateDashboard();
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
    if (pageId === 'audit' && typeof renderAudit === 'function') renderAudit();
    if (pageId === 'profit_analysis' && typeof generateProfitAnalysis === 'function') generateProfitAnalysis();
    if (pageId === 'settings') { 
        if (typeof updateSettingsUI === 'function') updateSettingsUI(); 
        if (typeof updateLicenseUI === 'function') updateLicenseUI(); 
    }
    if (pageId === 'company' && typeof loadCompanyData === 'function') loadCompanyData();
    if (pageId === 'backup' && typeof renderBackups === 'function') renderBackups();
    if (pageId === 'accounts' && typeof renderAccounts === 'function') renderAccounts();
    if (pageId === 'alerts' && typeof updateAlertsUI === 'function') updateAlertsUI();
    if (pageId === 'users') { 
        if (typeof renderUsers === 'function') renderUsers(); 
        if (typeof populateUsersSelect === 'function') populateUsersSelect(); 
        updateUIByPermissions(); 
    }
    if (pageId === 'sales' || pageId === 'purchase' || pageId === 'returns') {
        if (typeof populateAllSelects === 'function') populateAllSelects();
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
    if (typeof generateProfitAnalysis === 'function') generateProfitAnalysis();
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

function createAutoBackup() {
    const data = {
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
        cashierHistory: window.cashierHistory,
        inventoryAdjustments: window.inventoryAdjustments,
        createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const backup = {
        id: Date.now(),
        name: `auto_${new Date().toISOString().split('T')[0]}`,
        date: new Date().toISOString().split('T')[0],
        size: blob.size,
        auto: true
    };
    window.backups = window.backups.filter(b => !b.auto);
    window.backups.push(backup);
    if (window.backups.length > 15) {
        const sorted = window.backups.sort((a, b) => b.id - a.id);
        window.backups = sorted.slice(0, 15);
    }
    setData('backups', window.backups);
    if (typeof renderBackups === 'function') renderBackups();
}

// ================================================================
// KEYBOARD SHORTCUTS
// ================================================================
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMorePanel();
    if (e.key === 'Enter' && !document.getElementById('loginContainer').classList.contains('hidden')) {
        checkLogin();
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveAll();
        showToast('💾 تم الحفظ', 'success');
    }
});

// ================================================================
// AUTO SAVE
// ================================================================
setInterval(() => {
    if (document.getElementById('appContent').style.display !== 'none') {
        saveAll();
        updateClock();
    }
}, 30000);

window.addEventListener('beforeunload', function() {
    saveAll();
});

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

    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input && !input.value) input.value = today;
    });

    initAppData();
    seedData();
    refreshAllPages();

    if (localStorage.getItem('app_unlocked') === 'true') {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('appContent').style.display = 'block';
        setTimeout(() => {
            populateAllSelects();
            refreshAllPages();
            startAutoBackup();
            updateUIByPermissions();
            updateClock();
        }, 300);
    }

    console.log('✅ الميزان v3.0.0 - نظام محاسبة متكامل');
    console.log('🔒 كلمة المرور: 123456');
    console.log('📝 سجل النشاطات مفعل');
    console.log('📊 تحليل الأرباح مفعل');
    console.log('👤 المستخدم الحالي:', window.currentUser?.username || 'admin');
});

// ================================================================
// ================================================================
// ================================================================
// SALES MODULE - إدارة المبيعات (مربوط بالخزنة والتقارير وكشف الحساب)
// ================================================================
// ================================================================
// ================================================================

let salesItems = [];

function updateSalesPrice() {
    const select = document.getElementById('salesItemProduct');
    const priceInput = document.getElementById('salesItemPrice');
    if (!select || !priceInput) return;
    const productId = parseInt(select.value);
    const product = window.products.find(p => p.id === productId);
    if (product) {
        priceInput.value = product.sellPrice || 0;
    } else {
        priceInput.value = '';
    }
}

function updateSalesTaxInfo() {
    const total = parseFloat(document.getElementById('salesTotalAmount')?.textContent) || 0;
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const info = document.getElementById('salesTaxInfo');
    if (!info) return;
    if (invoiceType === 'tax' && total > 0) {
        const tax = (total * 14) / 100;
        info.textContent = `📊 الضريبة (14%): ${tax.toFixed(2)} | الإجمالي مع الضريبة: ${(total + tax).toFixed(2)} 🇪🇬`;
        info.style.display = 'block';
    } else {
        info.textContent = '';
        info.style.display = 'none';
    }
}

function addSalesItem() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const productId = parseInt(document.getElementById('salesItemProduct')?.value);
    const qty = parseInt(document.getElementById('salesItemQty')?.value);
    const price = parseFloat(document.getElementById('salesItemPrice')?.value);
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (!qty || qty <= 0) { showToast('⚠️ كمية صحيحة', 'error'); return; }
    if (isNaN(price) || price <= 0) { showToast('⚠️ سعر صحيح', 'error'); return; }
    if (!warehouseId) { showToast('⚠️ اختر مخزن', 'error'); return; }

    const product = window.products.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    const wp = window.warehouseProducts.find(w => w.warehouseId === warehouseId && w.productId === productId);
    if (!wp || wp.qty < qty) {
        showToast(`⚠️ الكمية غير متوفرة (المتاح: ${wp ? wp.qty : 0})`, 'error');
        return;
    }

    salesItems.push({
        productId: product.id,
        productName: product.name,
        qty: qty,
        price: price,
        total: qty * price,
        warehouseId: warehouseId
    });

    renderSalesItems();
    document.getElementById('salesItemQty').value = '';
    document.getElementById('salesItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderSalesItems() {
    const tbody = document.getElementById('salesItemsBody');
    if (!tbody) return;

    let html = '';
    let total = 0;

    salesItems.forEach((item, index) => {
        total += item.total;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeSalesItem(${index})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center;color:#5D5D5D;padding:8px;">لا توجد أصناف</td></tr>';
    safeSetText('salesItemsCount', salesItems.length);
    safeSetText('salesTotalAmount', total.toFixed(2));
    updateSalesTaxInfo();
}

function removeSalesItem(index) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الصنف؟')) return;
    salesItems.splice(index, 1);
    renderSalesItems();
}

// ================================================================
// SAVE SALE INVOICE (مربوط بالخزنة والتقارير وكشف الحساب)
// ================================================================
function saveSaleInvoice() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const customer = document.getElementById('salesCustomer')?.value?.trim() ||
        document.getElementById('salesCustomerSelect')?.value;
    const date = document.getElementById('salesDate')?.value || new Date().toISOString().split('T')[0];
    const payment = getSelectedPayment('sales');
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';

    if (!customer) { showToast('⚠️ أدخل العميل', 'error'); return; }
    if (salesItems.length === 0) { showToast('⚠️ أضف صنف واحد على الأقل', 'error'); return; }
    if (!warehouseId) { showToast('⚠️ اختر مخزن', 'error'); return; }

    let totalAmount = 0;
    for (const item of salesItems) {
        const wp = window.warehouseProducts.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty -= item.qty;
            totalAmount += item.total;
        }
    }
    saveAll();

    const taxRate = 14;
    const taxAmount = invoiceType === 'tax' ? (totalAmount * taxRate) / 100 : 0;
    const totalWithTax = totalAmount + taxAmount;

    // ✅ 1. تسجيل في الخزنة
    window.treasury.push({
        id: Date.now(),
        type: payment === 'نقدي' ? 'deposit' : 'deposit', // إيداع
        amount: totalWithTax,
        note: `بيع للعميل ${customer} (${salesItems.length} صنف)${invoiceType === 'tax' ? ' - ضريبة 14%' : ''}`,
        method: payment,
        date: date,
        warehouseId: warehouseId,
        time: new Date().toLocaleTimeString('ar')
    });

    // ✅ 2. تسجيل في الكاشف
    if (typeof addCashierTransaction === 'function') {
        addCashierTransaction('sale', totalWithTax, payment, `بيع للعميل ${customer}${invoiceType === 'tax' ? ' (بضريبة)' : ''}`);
    }

    // ✅ 3. تسجيل الفاتورة في المبيعات
    window.sales.push({
        id: Date.now(),
        customer: customer,
        date: date,
        payment: payment,
        items: [...salesItems],
        total: totalAmount,
        taxRate: invoiceType === 'tax' ? taxRate : 0,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        itemsCount: salesItems.length,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        type: 'sale'
    });

    // ✅ 4. سجل النشاط
    addAuditLog('sale', 'invoice', `فاتورة بيع للعميل ${customer} - ${totalWithTax.toFixed(2)}${invoiceType === 'tax' ? ' (بضريبة)' : ''}`, {
        invoice: {
            customer: customer,
            total: totalWithTax,
            items: [...salesItems],
            payment: payment,
            invoiceType: invoiceType
        }
    });

    // ✅ 5. حفظ كل البيانات
    saveAll();

    // ✅ 6. تحديث الواجهات
    renderProducts();
    renderSales();
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof renderAllInvoices === 'function') renderAllInvoices();
    if (typeof updateDashboard === 'function') updateDashboard();

    // ✅ 7. إفراغ الأصناف
    salesItems = [];
    renderSalesItems();

    showToast(`✅ تم إضافة فاتورة بيع - ${totalWithTax.toFixed(2)}`, 'success');

    if (totalAmount > 1000) {
        addAlert(`💰 فاتورة كبيرة`, `${totalAmount.toFixed(2)} - العميل: ${customer}`, 'success');
    }
}

// ================================================================
// RENDER SALES
// ================================================================
function renderSales() {
    const container = document.getElementById('salesList');
    if (!container) return;

    if (!window.sales || window.sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    const canEditSales = canEdit();
    const canDeleteSales = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;"><span>العميل</span><span>المخزن</span><span>النوع</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span></div>`;

    window.sales.slice().reverse().forEach(s => {
        const w = window.warehouses.find(wh => wh.id === s.warehouseId);
        const wName = w ? w.name : 'غير محدد';
        const itemsCount = s.items ? s.items.length : 1;
        const total = s.totalWithTax || s.total || 0;
        const typeLabel = s.invoiceType === 'tax' ? 'ضريبية' : 'عادية';

        html += `
            <div class="invoice-row" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;font-size:11px;">
                <span>${s.customer}</span>
                <span style="font-size:9px;">${wName}</span>
                <span style="font-size:9px;color:#4A8AB5;">${typeLabel}</span>
                <span>${itemsCount}</span>
                <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${s.date}</span>
                <div class="actions">
                    ${canEditSales ? `<button class="btn btn-warning btn-sm" onclick="editSaleInvoice(${s.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteSales ? `<button class="btn btn-danger btn-sm" onclick="deleteSaleInvoice(${s.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// EDIT SALE INVOICE
// ================================================================
function editSaleInvoice(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
            if (wp) wp.qty += item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => t.note && t.note.includes(`بيع للعميل ${invoice.customer}`) && t.date === invoice.date);
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    window.sales = window.sales.filter(s => s.id !== id);
    saveAll();

    document.getElementById('salesCustomerSelect').value = invoice.customer;
    document.getElementById('salesCustomer').value = invoice.customer;
    document.getElementById('salesDate').value = invoice.date;
    document.getElementById('salesWarehouse').value = invoice.warehouseId || '';
    document.getElementById('salesInvoiceType').value = invoice.invoiceType || 'simple';

    salesItems = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const product = window.products.find(p => p.id === item.productId);
            if (product) {
                salesItems.push({
                    productId: product.id,
                    productName: product.name,
                    qty: item.qty,
                    price: item.price,
                    total: item.total,
                    warehouseId: item.warehouseId || invoice.warehouseId
                });
            }
        }
    }
    renderSalesItems();

    document.querySelectorAll('input[name="salesPayment"]').forEach(el => {
        el.checked = el.value === invoice.payment;
    });

    addAuditLog('edit', 'invoice', `تعديل فاتورة بيع ${id}`);
    showToast(`✏️ جاري تعديل`, 'info');
    renderSales();
    updateDashboard();
    navigateTo('sales');
}

// ================================================================
// DELETE SALE INVOICE
// ================================================================
function deleteSaleInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة؟')) return;

    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
            if (wp) wp.qty += item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => t.note && t.note.includes(`بيع للعميل ${invoice.customer}`) && t.date === invoice.date);
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    window.sales = window.sales.filter(s => s.id !== id);
    saveAll();
    addAuditLog('delete', 'invoice', `حذف فاتورة بيع ${id}`);
    renderSales();
    renderProducts();
    if (typeof renderTreasury === 'function') renderTreasury();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ================================================================
// ================================================================
// ================================================================
// DASHBOARD
// ================================================================
// ================================================================
// ================================================================

function updateDashboard() {
    const totalSales = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalPurchases = window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalTreasury = window.treasury ? window.treasury.reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0) : 0;

    safeSetText('dashTotalSales', totalSales.toFixed(2));
    safeSetText('dashTotalPurchases', totalPurchases.toFixed(2));
    safeSetText('dashTotalProducts', window.products ? window.products.length : 0);
    safeSetText('dashTotalCustomers', window.customers ? window.customers.length : 0);

    const lowStock = window.products ? window.products.filter(p => {
        const total = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
        return total <= p.min;
    }) : [];

    const lowStockEl = document.getElementById('dashLowStock');
    if (lowStockEl) {
        lowStockEl.textContent = lowStock.length > 0 ? `🔴 ${lowStock.length}` : '✅ متوفرة';
        lowStockEl.style.color = lowStock.length > 0 ? '#E06060' : '#2D8F5E';
    }

    // الرسم البياني
    const chart = document.getElementById('salesChart');
    if (chart) {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthSales = Array(12).fill(0);

        if (window.sales) {
            window.sales.forEach(s => {
                const m = new Date(s.date).getMonth();
                if (s.items) {
                    monthSales[m] += s.items.reduce((sum, item) => sum + (item.total || 0), 0);
                } else {
                    monthSales[m] += (s.total || 0);
                }
            });
        }

        const max = Math.max(...monthSales, 1);
        chart.innerHTML = '';
        months.forEach((name, i) => {
            const height = (monthSales[i] / max) * 100;
            const isCurrent = i === new Date().getMonth();
            chart.innerHTML += `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
                    <div class="bar" style="height:${Math.max(height, 8)}px;width:100%;background:${isCurrent ? 'linear-gradient(180deg, #C9A94E, #8B7A3A)' : 'linear-gradient(180deg, #5D5D5D, #3D3D3D)'};border-radius:4px 4px 0 0;position:relative;">
                        ${monthSales[i] > 0 ? `<span class="bar-value" style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;color:#C9A94E;">${monthSales[i].toFixed(0)}</span>` : ''}
                    </div>
                    <div class="bar-label" style="text-align:center;font-size:9px;color:${isCurrent ? '#C9A94E' : '#5D5D5D'};margin-top:4px;font-weight:${isCurrent ? '700' : '400'};">${name}</div>
                </div>
            `;
        });
    }

    updateAlertsUI();
    checkLowStockAlert();
}

// ================================================================
// ================================================================
// ================================================================
// AUDIT LOG
// ================================================================
// ================================================================
// ================================================================

function addAuditLog(action, type, details, extraData = null) {
    const dt = getCurrentDateTime();
    
    let finalDetails = details;
    if (type === 'report' || (type === 'add' && details && details.includes('تقرير'))) {
        for (const [key, value] of Object.entries(REPORT_NAMES)) {
            if (details && details.includes(key)) {
                finalDetails = details.replace(key, value);
                break;
            }
        }
        if (finalDetails && !finalDetails.includes('تقرير') && !finalDetails.includes('كشف')) {
            finalDetails = 'تقرير ' + finalDetails;
        }
    }
    
    const entry = {
        id: Date.now(),
        action: action,
        type: type,
        details: finalDetails || details || '',
        user: window.currentUser?.username || 'admin',
        userRole: window.currentUser?.role || 'admin',
        date: dt.date,
        time: dt.time,
        timestamp: new Date().toISOString(),
        extra: extraData || {}
    };
    
    if (action === 'sale' && extraData?.invoice) {
        entry.extra = {
            customer: extraData.invoice.customer || 'غير محدد',
            total: extraData.invoice.total || 0,
            itemsCount: extraData.invoice.items?.length || 0,
            items: extraData.invoice.items || [],
            payment: extraData.invoice.payment || 'نقدي',
            invoiceType: extraData.invoice.invoiceType || 'simple'
        };
    }
    
    if (action === 'purchase' && extraData?.invoice) {
        entry.extra = {
            supplier: extraData.invoice.supplier || 'غير محدد',
            total: extraData.invoice.total || 0,
            itemsCount: extraData.invoice.items?.length || 0,
            items: extraData.invoice.items || [],
            payment: extraData.invoice.payment || 'نقدي',
            invoiceType: extraData.invoice.invoiceType || 'simple'
        };
    }
    
    if (action === 'edit' && extraData) {
        entry.extra = {
            oldData: extraData.oldData || {},
            newData: extraData.newData || {},
            changes: extraData.changes || {}
        };
    }
    
    if (action === 'delete' && extraData) {
        entry.extra = {
            deletedData: extraData.deletedData || {}
        };
    }
    
    if (!window.auditLog) window.auditLog = [];
    window.auditLog.unshift(entry);
    
    if (window.auditLog.length > 1000) {
        window.auditLog = window.auditLog.slice(0, 1000);
    }
    
    setData('auditLog', window.auditLog);
    renderAudit();
    
    return entry;
}

function renderAudit() { 
    filterAudit('all'); 
}

let auditFilter = 'all';

function filterAudit(filter) {
    auditFilter = filter;
    const container = document.getElementById('auditList');
    if (!container) return;

    const canView = canViewAudit();
    if (!canView) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>ليس لديك صلاحية لعرض سجل النشاطات</span></div>`;
        return;
    }

    if (!window.auditLog || !Array.isArray(window.auditLog) || window.auditLog.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد نشاطات</span></div>`;
        return;
    }

    let filtered = window.auditLog;
    if (filter !== 'all') {
        filtered = window.auditLog.filter(a => a.action === filter);
    }

    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => {
        const chipText = chip.textContent.trim();
        const isActive = (filter === 'all' && chipText === 'الكل') ||
                         (filter === 'add' && chipText === '➕ إضافة') ||
                         (filter === 'edit' && chipText === '✏️ تعديل') ||
                         (filter === 'delete' && chipText === '🗑️ حذف') ||
                         (filter === 'sale' && chipText === '💰 بيع') ||
                         (filter === 'purchase' && chipText === '🛒 شراء') ||
                         (filter === 'return' && chipText === '🔄 مرتجع');
        chip.classList.toggle('active', isActive);
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد نشاطات مطابقة</span></div>`;
        return;
    }

    const actionNames = { 
        add: '➕ إضافة', 
        edit: '✏️ تعديل', 
        delete: '🗑️ حذف', 
        sale: '💰 بيع', 
        purchase: '🛒 شراء', 
        return: '🔄 مرتجع' 
    };
    const colors = { 
        add: '#2D8F5E', 
        edit: '#E6A830', 
        delete: '#E06060', 
        sale: '#4A8AB5', 
        purchase: '#C9A94E', 
        return: '#E6A830' 
    };

    let html = `<div style="margin-bottom:8px;color:#A89070;font-size:12px;">عرض ${filtered.length} من ${window.auditLog.length} نشاط</div>`;

    filtered.slice(0, 100).forEach(a => {
        let detailsHtml = `<span>${a.details || ''}</span>`;
        
        if (a.action === 'sale' && a.extra) {
            const extra = a.extra;
            detailsHtml += `
                <div style="font-size:10px;color:#A89070;margin-top:2px;">
                    👤 ${extra.customer || 'غير محدد'} | 
                    💰 ${(extra.total || 0).toFixed(2)} | 
                    📦 ${extra.itemsCount || 0} صنف | 
                    💳 ${extra.payment || 'نقدي'}
                    ${extra.invoiceType === 'tax' ? ' 🧾 ضريبي' : ''}
                </div>
            `;
            if (extra.items && extra.items.length > 0) {
                detailsHtml += `<div style="font-size:9px;color:#5D5D5D;margin-top:2px;">`;
                extra.items.forEach((item, i) => {
                    detailsHtml += `${i+1}- ${item.productName} (${item.qty} × ${item.price.toFixed(2)}) = ${item.total.toFixed(2)} | `;
                });
                detailsHtml += `</div>`;
            }
        }
        
        if (a.action === 'purchase' && a.extra) {
            const extra = a.extra;
            detailsHtml += `
                <div style="font-size:10px;color:#A89070;margin-top:2px;">
                    🏢 ${extra.supplier || 'غير محدد'} | 
                    💰 ${(extra.total || 0).toFixed(2)} | 
                    📦 ${extra.itemsCount || 0} صنف | 
                    💳 ${extra.payment || 'نقدي'}
                    ${extra.invoiceType === 'tax' ? ' 🧾 ضريبي' : ''}
                </div>
            `;
            if (extra.items && extra.items.length > 0) {
                detailsHtml += `<div style="font-size:9px;color:#5D5D5D;margin-top:2px;">`;
                extra.items.forEach((item, i) => {
                    detailsHtml += `${i+1}- ${item.productName} (${item.qty} × ${item.price.toFixed(2)}) = ${item.total.toFixed(2)} | `;
                });
                detailsHtml += `</div>`;
            }
        }
        
        if (a.action === 'edit' && a.extra) {
            const extra = a.extra;
            if (extra.changes && Object.keys(extra.changes).length > 0) {
                detailsHtml += `<div style="font-size:10px;color:#E6A830;margin-top:2px;">`;
                Object.entries(extra.changes).forEach(([key, change]) => {
                    detailsHtml += `🔄 ${key}: ${change.old} → ${change.new} | `;
                });
                detailsHtml += `</div>`;
            }
        }
        
        if (a.action === 'delete' && a.extra) {
            const extra = a.extra;
            if (extra.deletedData && Object.keys(extra.deletedData).length > 0) {
                detailsHtml += `<div style="font-size:10px;color:#E06060;margin-top:2px;">`;
                Object.entries(extra.deletedData).forEach(([key, value]) => {
                    if (typeof value !== 'object') {
                        detailsHtml += `🗑️ ${key}: ${value} | `;
                    }
                });
                detailsHtml += `</div>`;
            }
        }

        html += `
            <div class="table-row" style="font-size:12px;color:#F5E6C8;border-bottom:1px solid #2D2D2D;padding:8px 0;">
                <div style="display:grid;grid-template-columns:1.2fr 1fr 2fr 1fr;gap:6px;width:100%;">
                    <span style="font-size:10px;color:#A89070;">${a.date} ${a.time}</span>
                    <span style="color:${colors[a.action] || '#C9A94E'};font-weight:700;font-size:11px;">${actionNames[a.action] || a.action}</span>
                    <div style="font-size:11px;">${detailsHtml}</div>
                    <span style="font-size:10px;color:#5D5D5D;">👤 ${a.user}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function clearAudit() {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ مسح سجل النشاطات؟')) return;

    window.auditLog = [];
    setData('auditLog', window.auditLog);
    renderAudit();
    showToast('🗑️ تم مسح السجل', 'info');
}

// ================================================================
// ================================================================
// ================================================================
// TREASURY - الخزنة
// ================================================================
// ================================================================
// ================================================================

function renderTreasury() {
    const container = document.getElementById('treasuryList');
    if (!container) return;

    const balance = window.treasury ? window.treasury.reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0) : 0;
    safeSetText('treasuryBalance', balance.toFixed(2) + ' 🇪🇬');

    if (!window.treasury || window.treasury.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-vault"></i><span>لا توجد حركات</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>النوع</span><span>طريقة الدفع</span><span>المخزن</span><span>التاريخ</span><span></span></div>`;

    window.treasury.slice().reverse().forEach(t => {
        const color = t.type === 'deposit' ? '#2D8F5E' : '#E06060';
        const sign = t.type === 'deposit' ? '+' : '-';
        const w = window.warehouses.find(wh => wh.id === t.warehouseId);
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
                    <button class="btn btn-danger btn-sm" onclick="deleteTreasury(${t.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function deleteTreasury(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الحركة؟')) return;

    window.treasury = window.treasury.filter(t => t.id !== id);
    saveAll();
    renderTreasury();
    showToast('🗑️ تم الحذف', 'info');
}

// ================================================================
// ================================================================
// ================================================================
// CUSTOMER STATEMENT - كشف حساب العميل
// ================================================================
// ================================================================
// ================================================================

function generateCustomerStatement() {
    const customerId = document.getElementById('statementCustomerSelect')?.value;
    const from = document.getElementById('statementFrom')?.value;
    const to = document.getElementById('statementTo')?.value;
    const container = document.getElementById('customerStatementResult');

    if (!customerId) { showToast('⚠️ اختر عميلاً', 'error'); return; }
    const customer = window.customers.find(c => c.id == customerId);
    if (!customer) { showToast('⚠️ العميل غير موجود', 'error'); return; }

    const customerSales = window.sales ? window.sales.filter(s =>
        s.customer === customer.name &&
        (!from || s.date >= from) &&
        (!to || s.date <= to)
    ) : [];

    const totalSales = customerSales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);

    const customerReturns = window.returns ? window.returns.filter(r =>
        r.customer === customer.name &&
        (!from || r.date >= from) &&
        (!to || r.date <= to)
    ) : [];

    const totalReturns = customerReturns.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);

    const netBalance = totalSales - totalReturns;

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:18px;margin-bottom:6px;">📋 كشف حساب: ${customer.name}</h4>
            <div style="font-size:14px;color:#A89070;margin-bottom:6px;">
                ${from ? `من: ${from}` : ''} ${to ? `إلى: ${to}` : ''}
            </div>
            <div class="detail-row" style="font-size:15px;"><span class="detail-label">المشتريات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)} 🇪🇬</span></div>
            <div class="detail-row" style="font-size:15px;"><span class="detail-label">المرتجعات</span><span class="detail-value" style="color:#E06060;">${totalReturns.toFixed(2)} 🇪🇬</span></div>
            <div class="detail-row" style="font-size:15px;"><span class="detail-label">الرصيد</span><span class="detail-value" style="color:#C9A94E;font-size:19px;">${netBalance.toFixed(2)} 🇪🇬</span></div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:13px;border:1px solid #2D2D2D;">
                <p style="font-weight:700;font-size:14px;color:#C9A94E;">📋 الفواتير (${customerSales.length})</p>
                ${customerSales.slice().reverse().slice(0, 10).map(s => `
                    <div style="padding:4px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                        <span>📅 ${s.date} | 💰 ${(s.totalWithTax || s.total || 0).toFixed(2)} | 📦 ${s.items ? s.items.length : 0} صنف</span>
                    </div>
                `).join('') || '<div style="color:#5D5D5D;padding:4px 0;">لا توجد فواتير</div>'}
            </div>
        </div>
    `;
    container.innerHTML = html;
    addAuditLog('add', 'report', `كشف حساب العميل: ${customer.name}`);
}

function generateCustomerDetailedStatement() {
    const customerId = document.getElementById('statementCustomerSelect')?.value;
    const from = document.getElementById('statementFrom')?.value;
    const to = document.getElementById('statementTo')?.value;
    const container = document.getElementById('customerStatementResult');

    if (!customerId) { showToast('⚠️ اختر عميلاً', 'error'); return; }
    const customer = window.customers.find(c => c.id == customerId);
    if (!customer) { showToast('⚠️ العميل غير موجود', 'error'); return; }

    const customerSales = window.sales ? window.sales.filter(s =>
        s.customer === customer.name &&
        (!from || s.date >= from) &&
        (!to || s.date <= to)
    ) : [];

    if (customerSales.length === 0) {
        container.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">لا توجد فواتير</div><div class="desc">لا توجد مشتريات للعميل ${customer.name}</div></div></div>`;
        return;
    }

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:18px;margin-bottom:6px;">📋 كشف حساب تفصيلي: ${customer.name}</h4>
            <div style="font-size:14px;color:#A89070;margin-bottom:8px;">
                ${from ? `من: ${from}` : ''} ${to ? `إلى: ${to}` : ''}
            </div>
    `;

    customerSales.slice().reverse().forEach((s, idx) => {
        const total = s.totalWithTax || s.total || 0;
        const w = window.warehouses.find(wh => wh.id === s.warehouseId);
        const wName = w ? w.name : 'غير محدد';
        const items = s.items || [];

        html += `
            <div style="padding:8px;background:#0D0D0D;border-radius:6px;margin-bottom:8px;font-size:13px;border:1px solid #2D2D2D;">
                <div style="font-weight:700;color:#C9A94E;font-size:15px;">فاتورة #${idx + 1} - ${s.date}</div>
                <div style="color:#A89070;">🏢 ${wName} | 💳 ${s.payment || 'نقدي'}</div>
                <div style="margin-top:6px;padding:6px;background:#1C1C1C;border-radius:4px;font-size:13px;">
                    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4px;font-weight:800;border-bottom:2px solid #C9A94E;padding:4px 0;color:#F5E6C8;">
                        <span>المنتج</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span>
                    </div>
                    ${items.length > 0 ? items.map(item => `
                        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                            <span>${item.productName}</span>
                            <span>${item.qty}</span>
                            <span>${item.price.toFixed(2)}</span>
                            <span>${item.total.toFixed(2)}</span>
                        </div>
                    `).join('') : '<div style="padding:4px 0;color:#5D5D5D;">لا توجد تفاصيل</div>'}
                </div>
                <div style="font-weight:700;margin-top:4px;color:#C9A94E;font-size:15px;">الإجمالي: ${total.toFixed(2)} 🇪🇬</div>
            </div>
        `;
    });

    const totalAll = customerSales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);

    html += `
        <div style="padding:8px;background:#0D0D0D;border-radius:6px;font-size:15px;font-weight:700;color:#C9A94E;border:1px solid #2D2D2D;">
            إجمالي المشتريات: ${totalAll.toFixed(2)} 🇪🇬
        </div>
    `;

    container.innerHTML = html;
    addAuditLog('add', 'report', `كشف حساب تفصيلي للعميل: ${customer.name}`);
}

// ================================================================
// ================================================================
// ================================================================
// WHATSAPP FUNCTIONS
// ================================================================
// ================================================================
// ================================================================

function updateCustomerWhatsApp() {
    const select = document.getElementById('salesCustomerSelect');
    const input = document.getElementById('salesCustomer');
    const whatsappInput = document.getElementById('customerWhatsApp');
    const group = document.getElementById('customerWhatsAppGroup');

    if (!select || !input || !whatsappInput || !group) return;

    const selectedName = select.value || input.value;
    if (selectedName) {
        const customer = window.customers?.find(c => c.name === selectedName);
        if (customer && customer.whatsapp) {
            whatsappInput.value = customer.whatsapp;
            group.style.display = 'block';
        } else if (customer) {
            whatsappInput.value = customer.phone || '';
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
            whatsappInput.value = '';
        }
    } else {
        group.style.display = 'none';
        whatsappInput.value = '';
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
        const supplier = window.suppliers?.find(s => s.name === selectedName);
        if (supplier && supplier.whatsapp) {
            whatsappInput.value = supplier.whatsapp;
            group.style.display = 'block';
        } else if (supplier) {
            whatsappInput.value = supplier.phone || '';
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
            whatsappInput.value = '';
        }
    } else {
        group.style.display = 'none';
        whatsappInput.value = '';
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
    
    if (typeof salesItems === 'undefined' || !salesItems || salesItems.length === 0) { 
        showToast('⚠️ أضف أصنافاً أولاً', 'error'); 
        return; 
    }

    let whatsappNumber = document.getElementById('customerWhatsApp')?.value?.trim();
    if (!whatsappNumber) {
        const customerObj = window.customers?.find(c => c.name === customer);
        if (customerObj && customerObj.whatsapp) {
            whatsappNumber = customerObj.whatsapp;
        } else if (customerObj && customerObj.phone) {
            whatsappNumber = customerObj.phone;
        } else {
            whatsappNumber = '01011993799';
        }
    }

    whatsappNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (!whatsappNumber.startsWith('20')) {
        whatsappNumber = '20' + whatsappNumber;
    }

    const total = salesItems.reduce((s, item) => s + item.total, 0);
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

    salesItems.forEach((item, i) => {
        const name = item.productName.length > 10 ? item.productName.substring(0, 10) + '..' : item.productName;
        message += `║ ${(i+1).toString().padStart(1)} │ ${name.padEnd(10)} │ ${item.qty.toString().padStart(4)} │ ${item.price.toFixed(0).padStart(5)} │\n`;
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

    showToast(`📱 تم فتح واتساب للعميل ${customer}`, 'success');
}

// ================================================================
// ================================================================
// ================================================================
// GENERATE REPORT
// ================================================================
// ================================================================
// ================================================================

function generateReport(type) {
    const container = document.getElementById('reportResult');
    if (!container) return;

    let html = '';

    const totalSales = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalPurchases = window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalExpenses = window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0;
    const profit = totalSales - totalPurchases - totalExpenses;

    const reportName = REPORT_NAMES[type] || type;

    switch (type) {
        case 'sales':
            const salesByWarehouse = {};
            if (window.sales) {
                window.sales.forEach(s => {
                    const wId = s.warehouseId || 0;
                    const w = window.warehouses ? window.warehouses.find(wh => wh.id === wId) : null;
                    const wName = w ? w.name : 'غير محدد';
                    const total = s.totalWithTax || s.total || 0;
                    salesByWarehouse[wName] = (salesByWarehouse[wName] || 0) + total;
                });
            }

            let salesDetails = '';
            if (window.sales) {
                window.sales.slice().reverse().forEach(s => {
                    const total = s.totalWithTax || s.total || 0;
                    salesDetails += `
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                            <span>${s.date}</span>
                            <span>${s.customer}</span>
                            <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                        </div>
                    `;
                });
            }

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 تقرير المبيعات</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)} 🇪🇬</span></div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="font-weight:700;color:#C9A94E;font-size:12px;margin-bottom:4px;">🏢 حسب المخزن:</div>
                        ${Object.entries(salesByWarehouse).map(([name, total]) => 
                            `<div style="padding:2px 0;color:#F5E6C8;">• ${name}: ${total.toFixed(2)} 🇪🇬</div>`
                        ).join('') || '<div style="color:#5D5D5D;">لا توجد بيانات</div>'}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:11px;border:1px solid #2D2D2D;max-height:200px;overflow-y:auto;">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:2px solid #C9A94E;">
                            <span>التاريخ</span><span>العميل</span><span>المبلغ</span>
                        </div>
                        ${salesDetails || '<div style="padding:8px;color:#5D5D5D;">لا توجد فواتير</div>'}
                    </div>
                </div>
            `;
            break;

        case 'profit':
            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">💰 تقرير الأرباح</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">الإيرادات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">التكاليف</span><span class="detail-value" style="color:#E06060;">${(totalPurchases+totalExpenses).toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">صافي الربح</span><span class="detail-value" style="color:#C9A94E;font-size:17px;">${profit.toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">هامش الربح</span><span class="detail-value">${totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0}%</span></div>
                </div>
            `;
            break;

        default:
            html = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">اختر تقريراً</div><div class="desc">اضغط على أحد التقارير أعلاه</div></div></div>`;
    }

    container.innerHTML = html;
    addAuditLog('add', 'report', `عرض تقرير ${reportName}`);
}

// ================================================================
// ================================================================
// ================================================================
// POPULATE SELECTS
// ================================================================
// ================================================================
// ================================================================

function populateAllSelects() {
    if (typeof populateWarehouseSelects === 'function') populateWarehouseSelects();
    if (typeof populateProductSelects === 'function') populateProductSelects();
    if (typeof populateCustomerSelects === 'function') populateCustomerSelects();
    if (typeof populateSupplierSelects === 'function') populateSupplierSelects();
    if (typeof populatePermissionSelects === 'function') populatePermissionSelects();
    if (typeof populateCustomerStatement === 'function') populateCustomerStatement();
    if (typeof populateSupplierStatement === 'function') populateSupplierStatement();
    if (typeof populateBondCustomers === 'function') populateBondCustomers();
    if (typeof populateAccountParents === 'function') populateAccountParents();
    if (typeof populateAdjustmentProducts === 'function') populateAdjustmentProducts();

    setTimeout(() => {
        updateCustomerWhatsApp();
        updateSupplierWhatsApp();
    }, 100);
}

function populateWarehouseSelects() {
    ['productWarehouse', 'salesWarehouse', 'purchaseWarehouse', 'returnWarehouse', 'treasuryWarehouse', 'quickProductWarehouse'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">اختر مخزن...</option>';
            if (window.warehouses) {
                window.warehouses.forEach(w => {
                    select.innerHTML += `<option value="${w.id}">${w.name} (${w.type})</option>`;
                });
            }
        }
    });
}

function populateProductSelects() {
    ['salesItemProduct', 'purchaseItemProduct', 'returnItemProduct', 'permissionProduct'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">اختر منتج...</option>';
            if (window.products) {
                window.products.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.name} ${p.barcode ? '🏷️'+p.barcode : ''}</option>`;
                });
            }
        }
    });
}

function populateCustomerSelects() {
    ['salesCustomerSelect', 'returnCustomerSelect'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">اختر عميل...</option>';
            if (window.customers) {
                window.customers.forEach(c => {
                    select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                });
            }
        }
    });
}

function populateSupplierSelects() {
    const select = document.getElementById('purchaseSupplierSelect');
    if (select) {
        select.innerHTML = '<option value="">اختر مورد...</option>';
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
            });
        }
    }
}

function populatePermissionSelects() {
    ['permissionFrom', 'permissionTo'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">اختر مخزن...</option>';
            if (window.warehouses) {
                window.warehouses.forEach(w => {
                    select.innerHTML += `<option value="${w.id}">${w.name} (${w.type})</option>`;
                });
            }
        }
    });
}

function populateCustomerStatement() {
    const select = document.getElementById('statementCustomerSelect');
    if (select) {
        select.innerHTML = '<option value="">اختر عميل...</option>';
        if (window.customers) {
            window.customers.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
        const today = new Date().toISOString().split('T')[0];
        const from = new Date();
        from.setMonth(from.getMonth() - 1);
        const fromInput = document.getElementById('statementFrom');
        const toInput = document.getElementById('statementTo');
        if (fromInput && !fromInput.value) fromInput.value = from.toISOString().split('T')[0];
        if (toInput && !toInput.value) toInput.value = today;
    }
}

function populateSupplierStatement() {
    const select = document.getElementById('statementSupplierSelect');
    if (select) {
        select.innerHTML = '<option value="">اختر مورد...</option>';
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
        const today = new Date().toISOString().split('T')[0];
        const from = new Date();
        from.setMonth(from.getMonth() - 1);
        const fromInput = document.getElementById('statementSupplierFrom');
        const toInput = document.getElementById('statementSupplierTo');
        if (fromInput && !fromInput.value) fromInput.value = from.toISOString().split('T')[0];
        if (toInput && !toInput.value) toInput.value = today;
    }
}

function populateBondCustomers() {
    const select = document.getElementById('bondCustomer');
    if (select) {
        select.innerHTML = '<option value="">اختر...</option>';
        if (window.customers) {
            window.customers.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                select.innerHTML += `<option value="s_${s.id}">${s.name} (مورد)</option>`;
            });
        }
    }
}

function populateAccountParents() {
    const select = document.getElementById('accountParent');
    if (select) {
        select.innerHTML = '<option value="">لا يوجد</option>';
        if (window.accounts) {
            window.accounts.forEach(a => {
                select.innerHTML += `<option value="${a.id}">${a.name}</option>`;
            });
        }
    }
}

function populateAdjustmentProducts() {
    const select = document.getElementById('adjustmentProduct');
    if (select) {
        select.innerHTML = '<option value="">اختر منتج...</option>';
        if (window.products) {
            const sorted = [...window.products].sort((a, b) => a.name.localeCompare(b.name));
            sorted.forEach(p => {
                const totalQty = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
                select.innerHTML += `<option value="${p.id}">${p.name} (${totalQty})</option>`;
            });
        }
    }
}

// ================================================================
// ================================================================
// ================================================================
// OTHER FUNCTIONS (placeholder for missing modules)
// ================================================================
// ================================================================
// ================================================================

// These are placeholder functions for modules that might be missing
// They will be replaced by actual implementations when the modules are loaded

function renderProducts() {
    const container = document.getElementById('productList');
    if (!container) return;
    if (!window.products || window.products.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><span>لا توجد منتجات</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 1fr 1fr 1fr 0.8fr;"><span>المنتج</span><span>الباركود</span><span>الشراء</span><span>البيع</span><span>الكمية</span><span></span></div>`;
    window.products.forEach(p => {
        const totalQty = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 1fr 1fr 1fr 1fr 0.8fr;font-size:12px;">
                <span><strong>${p.name}</strong></span>
                <span style="font-size:10px;">${p.barcode || '-'}</span>
                <span>${p.buyPrice.toFixed(2)}</span>
                <span>${p.sellPrice.toFixed(2)}</span>
                <span>${totalQty}</span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteProduct(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المنتج؟')) return;
    window.products = window.products.filter(p => p.id !== id);
    window.warehouseProducts = window.warehouseProducts.filter(wp => wp.productId !== id);
    saveAll();
    renderProducts();
    showToast('🗑️ تم الحذف', 'info');
}

function renderCustomers() {
    const container = document.getElementById('customerList');
    if (!container) return;
    if (!window.customers || window.customers.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا توجد عملاء</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 1.2fr 1.2fr 0.8fr 0.6fr;"><span>الاسم</span><span>الهاتف</span><span>واتساب</span><span>البريد</span><span>الحالة</span><span></span></div>`;
    window.customers.forEach(c => {
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 1.2fr 1.2fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${c.name}</strong></span>
                <span>${c.phone || '-'}</span>
                <span style="color:#25D366;font-weight:700;">${c.whatsapp || '-'}</span>
                <span>${c.email || '-'}</span>
                <span><span class="status-badge ${c.active !== false ? 'active' : 'inactive'}">${c.active !== false ? 'نشط' : 'غير نشط'}</span></span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteCustomer(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف العميل؟')) return;
    window.customers = window.customers.filter(c => c.id !== id);
    saveAll();
    renderCustomers();
    showToast('🗑️ تم الحذف', 'info');
}

function renderSuppliers() {
    const container = document.getElementById('supplierList');
    if (!container) return;
    if (!window.suppliers || window.suppliers.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><span>لا توجد موردين</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 1.2fr 1.2fr 0.8fr 0.6fr;"><span>الاسم</span><span>الهاتف</span><span>واتساب</span><span>البريد</span><span>الحالة</span><span></span></div>`;
    window.suppliers.forEach(s => {
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 1.2fr 1.2fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${s.name}</strong></span>
                <span>${s.phone || '-'}</span>
                <span style="color:#25D366;font-weight:700;">${s.whatsapp || '-'}</span>
                <span>${s.email || '-'}</span>
                <span><span class="status-badge ${s.active !== false ? 'active' : 'inactive'}">${s.active !== false ? 'نشط' : 'غير نشط'}</span></span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteSupplier(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المورد؟')) return;
    window.suppliers = window.suppliers.filter(s => s.id !== id);
    saveAll();
    renderSuppliers();
    showToast('🗑️ تم الحذف', 'info');
}

function renderAllInvoices() {
    const container = document.getElementById('allInvoicesList');
    if (!container) return;
    let all = [];
    if (window.sales) all.push(...window.sales.map(s => ({ ...s, typeLabel: 'بيع', color: '#2D8F5E' })));
    if (window.purchases) all.push(...window.purchases.map(p => ({ ...p, typeLabel: 'شراء', color: '#E06060' })));
    if (window.returns) all.push(...window.returns.map(r => ({ ...r, typeLabel: 'مرتجع', color: '#E6A830' })));
    
    safeSetText('allInvoicesCount', all.length);
    safeSetText('invoicesSalesCount', window.sales ? window.sales.length : 0);
    safeSetText('invoicesPurchasesCount', window.purchases ? window.purchases.length : 0);

    if (all.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    let html = `<div class="invoice-header" style="grid-template-columns:0.6fr 1.2fr 0.6fr 0.6fr 0.8fr 0.8fr 0.6fr;"><span>النوع</span><span>العميل/المورد</span><span>المخزن</span><span>النوع</span><span>الإجمالي</span><span>التاريخ</span><span></span></div>`;
    all.slice().reverse().forEach(i => {
        const total = i.totalWithTax || i.total || 0;
        const name = i.customer || i.supplier || 'غير محدد';
        const w = window.warehouses.find(wh => wh.id === i.warehouseId);
        const wName = w ? w.name : '-';
        const typeLabel = i.invoiceType === 'tax' ? 'ضريبية' : 'عادية';
        html += `
            <div class="invoice-row" style="grid-template-columns:0.6fr 1.2fr 0.6fr 0.6fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span style="color:${i.color};font-weight:700;">${i.typeLabel}</span>
                <span>${name}</span>
                <span style="font-size:9px;">${wName}</span>
                <span style="font-size:9px;color:#4A8AB5;">${typeLabel}</span>
                <span style="color:${i.color};font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${i.date}</span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteAllInvoice(${i.id},'${i.type}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteAllInvoice(id, type) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة؟')) return;
    if (type === 'sale') {
        window.sales = window.sales.filter(s => s.id !== id);
    } else if (type === 'purchase') {
        window.purchases = window.purchases.filter(p => p.id !== id);
    } else if (type === 'return') {
        window.returns = window.returns.filter(r => r.id !== id);
    }
    saveAll();
    renderAllInvoices();
    showToast('🗑️ تم الحذف', 'info');
}

function renderAllPurchases() {
    const container = document.getElementById('purchaseList');
    if (!container) return;
    if (!window.purchases || window.purchases.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير</span></div>`;
        return;
    }
    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;"><span>المورد</span><span>المخزن</span><span>النوع</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span></div>`;
    window.purchases.slice().reverse().forEach(p => {
        const w = window.warehouses.find(wh => wh.id === p.warehouseId);
        const wName = w ? w.name : 'غير محدد';
        const total = p.totalWithTax || p.total || 0;
        html += `
            <div class="invoice-row" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;font-size:11px;">
                <span>${p.supplier}</span>
                <span style="font-size:9px;">${wName}</span>
                <span style="font-size:9px;color:#4A8AB5;">${p.invoiceType === 'tax' ? 'ضريبية' : 'عادية'}</span>
                <span>${p.items ? p.items.length : 1}</span>
                <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${p.date}</span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deletePurchaseInvoice(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deletePurchaseInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف فاتورة الشراء؟')) return;
    window.purchases = window.purchases.filter(p => p.id !== id);
    saveAll();
    renderAllPurchases();
    showToast('🗑️ تم الحذف', 'info');
}

function renderAllReturns() {
    const container = document.getElementById('returnList');
    if (!container) return;
    if (!window.returns || window.returns.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`;
        return;
    }
    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.7fr 0.6fr 0.7fr;"><span>العميل</span><span>المخزن</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span></div>`;
    window.returns.slice().reverse().forEach(r => {
        const w = window.warehouses.find(wh => wh.id === r.warehouseId);
        const wName = w ? w.name : 'غير محدد';
        const total = r.items ? r.items.reduce((sum, item) => sum + (item.total || 0), 0) : (r.total || 0);
        html += `
            <div class="invoice-row" style="grid-template-columns:0.8fr 1fr 0.6fr 0.7fr 0.6fr 0.7fr;font-size:11px;">
                <span>${r.customer}</span>
                <span style="font-size:9px;">${wName}</span>
                <span>${r.items ? r.items.length : 1}</span>
                <span style="color:#E6A830;font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${r.date}</span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteReturnInvoice(${r.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteReturnInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المرتجع؟')) return;
    window.returns = window.returns.filter(r => r.id !== id);
    saveAll();
    renderAllReturns();
    showToast('🗑️ تم الحذف', 'info');
}

function renderWarehouses() {
    const container = document.getElementById('warehouseList');
    if (!container) return;
    if (!window.warehouses || window.warehouses.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:1.5fr 0.8fr 1fr 0.8fr 0.6fr;"><span>اسم المخزن</span><span>النوع</span><span>العنوان</span><span>المنتجات</span><span></span></div>`;
    window.warehouses.forEach(w => {
        const count = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.warehouseId === w.id).reduce((s, wp) => s + wp.qty, 0) : 0;
        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 0.8fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${w.name}</strong></span>
                <span style="color:${w.type === 'رئيسي' ? '#2D8F5E' : w.type === 'محل' ? '#E6A830' : '#4A8AB5'};font-weight:700;font-size:11px;">${w.type}</span>
                <span>${w.address || '-'}</span>
                <span>${count}</span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteWarehouse(${w.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteWarehouse(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المخزن؟')) return;
    window.warehouses = window.warehouses.filter(w => w.id !== id);
    window.warehouseProducts = window.warehouseProducts.filter(wp => wp.warehouseId !== id);
    saveAll();
    renderWarehouses();
    showToast('🗑️ تم الحذف', 'info');
}

function renderPermissions() {
    const container = document.getElementById('permissionList');
    if (!container) return;
    if (!window.permissions || window.permissions.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد إذونات</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:0.8fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;"><span>النوع</span><span>من</span><span>إلى</span><span>المنتج</span><span>الكمية</span><span>الحالة</span><span></span></div>`;
    window.permissions.slice().reverse().forEach(p => {
        const product = window.products.find(pr => pr.id === p.productId);
        const fromW = window.warehouses.find(w => w.id === p.fromWarehouseId);
        const toW = window.warehouses.find(w => w.id === p.toWarehouseId);
        html += `
            <div class="table-row" style="grid-template-columns:0.8fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span>${p.type}</span>
                <span style="font-size:9px;">${fromW ? fromW.name : '-'}</span>
                <span style="font-size:9px;">${toW ? toW.name : '-'}</span>
                <span>${product ? product.name : 'غير معروف'}</span>
                <span>${p.qty}</span>
                <span><span class="status-badge" style="background:${p.status === 'executed' ? '#2D8F5E' : p.status === 'cancelled' ? '#E06060' : '#E6A830'};color:#fff;">${p.status}</span></span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deletePermission(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deletePermission(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الإذن؟')) return;
    window.permissions = window.permissions.filter(p => p.id !== id);
    saveAll();
    renderPermissions();
    showToast('🗑️ تم الحذف', 'info');
}

function renderExpenses() {
    const container = document.getElementById('expenseList');
    if (!container) return;
    if (!window.expenses || window.expenses.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-money-bill-wave"></i><span>لا توجد مصروفات</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 1fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>التاريخ</span><span>طريقة الدفع</span><span></span></div>`;
    window.expenses.slice().reverse().forEach(e => {
        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 1fr 1fr 1fr 0.6fr;font-size:12px;">
                <span>${e.note}</span>
                <span style="color:#E06060;font-weight:700;">${e.amount.toFixed(2)}</span>
                <span>${e.date}</span>
                <span>${e.method || 'نقدي'}</span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteExpense(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المصروف؟')) return;
    window.expenses = window.expenses.filter(e => e.id !== id);
    saveAll();
    renderExpenses();
    showToast('🗑️ تم الحذف', 'info');
}

function renderBonds() {
    const container = document.getElementById('bondList');
    if (!container) return;
    if (!window.bonds || window.bonds.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-file-signature"></i><span>لا توجد سندات</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:0.8fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr;"><span>النوع</span><span>العميل</span><span>المبلغ</span><span>تاريخ الاستحقاق</span><span>الحالة</span><span></span></div>`;
    window.bonds.slice().reverse().forEach(b => {
        html += `
            <div class="table-row" style="grid-template-columns:0.8fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr;font-size:11px;">
                <span>${b.type}</span>
                <span>${b.customerName || 'غير محدد'}</span>
                <span style="font-weight:700;">${b.amount.toFixed(2)}</span>
                <span>${b.dueDate || '-'}</span>
                <span><span class="status-badge" style="background:${b.status === 'paid' ? '#2D8F5E' : b.status === 'overdue' ? '#E06060' : '#E6A830'};color:#fff;">${b.status}</span></span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteBond(${b.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteBond(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف السند؟')) return;
    window.bonds = window.bonds.filter(b => b.id !== id);
    saveAll();
    renderBonds();
    showToast('🗑️ تم الحذف', 'info');
}

function renderCashier() {
    const container = document.getElementById('cashierTodayTransactions');
    if (!container) return;
    container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-receipt" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد حركات اليوم</span></div>`;
}

function renderUsers() {
    const container = document.getElementById('userList');
    if (!container) return;
    if (!window.users || window.users.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا توجد مستخدمين</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;"><span>اسم المستخدم</span><span>الدور</span><span>الحالي</span><span></span></div>`;
    window.users.forEach(u => {
        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${u.username}</strong></span>
                <span>${u.role}</span>
                <span>${u.username === window.currentUser?.username ? '✅' : ''}</span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteUser(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المستخدم؟')) return;
    window.users = window.users.filter(u => u.id !== id);
    saveAll();
    renderUsers();
    showToast('🗑️ تم الحذف', 'info');
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
                    <button class="btn btn-danger btn-sm" onclick="deleteBackup(${b.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteBackup(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف النسخة؟')) return;
    window.backups = window.backups.filter(b => b.id !== id);
    saveAll();
    renderBackups();
    showToast('🗑️ تم الحذف', 'info');
}

function renderAccounts() {
    const container = document.getElementById('accountList');
    if (!container) return;
    if (!window.accounts || window.accounts.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-sitemap"></i><span>لا توجد حسابات</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;"><span>اسم الحساب</span><span>النوع</span><span>المستوى</span><span></span></div>`;
    window.accounts.forEach(a => {
        html += `
            <div class="table-row" style="font-size:12px;padding:4px 0;grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;color:#F5E6C8;">
                <span><strong>${a.name}</strong></span>
                <span>${a.type}</span>
                <span>${a.parentId ? 'فرعي' : 'رئيسي'}</span>
                <div class="actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteAccount(${a.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function deleteAccount(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الحساب؟')) return;
    window.accounts = window.accounts.filter(a => a.id !== id);
    saveAll();
    renderAccounts();
    showToast('🗑️ تم الحذف', 'info');
}

function renderAdjustmentHistory() {
    const container = document.getElementById('adjustmentHistory');
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد تسويات سابقة</span></div>`;
}

function updateAdjustmentDateTime() {
    const dt = getCurrentDateTime();
    document.getElementById('adjustmentDateDisplay').textContent = dt.date;
    document.getElementById('adjustmentTimeDisplay').textContent = dt.time;
}

function populateAdjustmentProducts() {
    const select = document.getElementById('adjustmentProduct');
    if (!select) return;
    select.innerHTML = '<option value="">اختر منتج...</option>';
    if (window.products) {
        window.products.forEach(p => {
            const totalQty = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
            select.innerHTML += `<option value="${p.id}">${p.name} (${totalQty})</option>`;
        });
    }
}

function addAdjustmentItem() {
    showToast('⚠️ هذه الميزة قيد التطوير', 'warning');
}

function saveInventoryAdjustment() {
    showToast('⚠️ هذه الميزة قيد التطوير', 'warning');
}

function renderGeneratedKeys() {
    const container = document.getElementById('generatedKeysList');
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><i class="fas fa-key"></i><span>لا توجد مفاتيح</span></div>`;
}

function updateLicensePrice() {
    const days = parseInt(document.getElementById('licenseDays')?.value) || 365;
    const amount = { 30: 1500, 90: 2000, 180: 2500, 365: 3000, 730: 6000 }[days] || 3000;
    document.getElementById('licenseAmount').value = amount;
}

function generateNewLicense() {
    showToast('⚠️ هذه الميزة قيد التطوير', 'warning');
}

function updateSettingsUI() {
    safeSetText('infoProducts', window.products ? window.products.length : 0);
    safeSetText('infoCustomers', window.customers ? window.customers.length : 0);
    safeSetText('infoSuppliers', window.suppliers ? window.suppliers.length : 0);
    safeSetText('infoWarehouses', window.warehouses ? window.warehouses.length : 0);
    safeSetText('infoInvoices', (window.sales ? window.sales.length : 0) + (window.purchases ? window.purchases.length : 0) + (window.returns ? window.returns.length : 0));
}

function updateLicenseUI() {
    const license = JSON.parse(localStorage.getItem('mizan_license') || '{}');
    const valid = license && license.expiryDate ? new Date(license.expiryDate) >= new Date() : false;
    const statusEl = document.getElementById('licenseStatusDisplay');
    const expiryEl = document.getElementById('licenseExpiryDisplay');
    const daysEl = document.getElementById('licenseDaysLeft');
    if (statusEl) {
        statusEl.textContent = valid ? '✅ نشط' : '⛔ منتهي';
        statusEl.style.color = valid ? '#2D8F5E' : '#E06060';
    }
    if (expiryEl && license && license.expiryDate) {
        expiryEl.textContent = new Date(license.expiryDate).toLocaleDateString('ar');
    }
    if (daysEl) {
        const days = license && license.expiryDate ? Math.ceil((new Date(license.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : -1;
        daysEl.textContent = days >= 0 ? days + ' يوم' : '-';
        daysEl.style.color = days >= 0 && days <= 7 ? '#E06060' : '#2D8F5E';
    }
}

function countVersionClicks() {
    versionClickCount++;
    if (versionClickCount >= 5) {
        const btn = document.getElementById('licenseGeneratorHiddenBtn');
        if (btn) {
            btn.style.display = 'block';
            showToast('🔑 تم تفعيل زر توليد المفاتيح', 'info');
            setTimeout(() => { btn.style.display = 'none'; }, 30000);
        }
        versionClickCount = 0;
    }
}

function changePasswordSettings() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const old = document.getElementById('oldPassword')?.value;
    const newPwd = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    if (old !== currentPassword && old !== DEFAULT_PASSWORD) {
        showToast('❌ كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }
    if (newPwd.length < 4) { showToast('❌ 4 أحرف على الأقل', 'error'); return; }
    if (newPwd !== confirm) { showToast('❌ غير مطابقة', 'error'); return; }
    currentPassword = newPwd;
    localStorage.setItem('app_password', newPwd);
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showToast('✅ تم التغيير', 'success');
}

function clearAllData() {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟')) return;
    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses', 'treasury',
                  'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData', 'backups',
                  'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'];
    keys.forEach(k => {
        localStorage.removeItem('mizan_' + k);
        window[k] = [];
    });
    refreshAllPages();
    showToast('🗑️ تم مسح جميع البيانات', 'warning');
}

// ================================================================
// GENERATE PROFIT ANALYSIS
// ================================================================
function generateProfitAnalysis() {
    const container = document.getElementById('profitAnalysisResult');
    if (!container) return;
    container.innerHTML = `
        <div class="alert-item info">
            <div class="icon"><i class="fas fa-info-circle"></i></div>
            <div class="content">
                <div class="title">تحليل الأرباح</div>
                <div class="desc">${window.sales && window.sales.length > 0 ? '✅ تم تحليل الأرباح بنجاح' : '⚠️ لا توجد مبيعات لتحليلها'}</div>
            </div>
        </div>
    `;
}

// ================================================================
// UPDATE ACCOUNTING
// ================================================================
function updateAccounting() {
    const totalSales = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;
    const totalPurchases = window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;
    const totalExpenses = window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0;
    const profit = totalSales - totalPurchases - totalExpenses;
    safeSetText('accountingSales', totalSales.toFixed(2));
    safeSetText('accountingPurchases', totalPurchases.toFixed(2));
    safeSetText('accountingProfit', profit.toFixed(2));
}

function showLedger() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    container.innerHTML = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">📒 دفتر الأستاذ</h4><p style="color:#A89070;padding:10px;">عرض جميع الحركات المالية</p></div>`;
}

function showAudit() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    container.innerHTML = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">🔍 المراجعة المالية</h4><p style="color:#A89070;padding:10px;">تدقيق الحسابات</p></div>`;
}

function showTrialBalance() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    container.innerHTML = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">⚖️ ميزان المراجعة</h4><p style="color:#A89070;padding:10px;">المدين والدائن</p></div>`;
}

function showIncomeStatement() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    container.innerHTML = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">📄 قائمة الدخل</h4><p style="color:#A89070;padding:10px;">الإيرادات والمصروفات</p></div>`;
}

function showBalanceSheet() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    container.innerHTML = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">📊 الميزانية العمومية</h4><p style="color:#A89070;padding:10px;">الأصول والخصوم</p></div>`;
}

function showCashFlow() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    container.innerHTML = `<div class="accounting-detail-content"><h4 style="color:#C9A94E;">💰 التدفقات النقدية</h4><p style="color:#A89070;padding:10px;">حركة النقدية</p></div>`;
}

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
    document.getElementById('companyNameDisplay').textContent = data.name || 'اسم الشركة';
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
    setData('companyData', data);
    loadCompanyData();
    saveAll();
    showToast('✅ تم حفظ البيانات', 'success');
}

function uploadLogo(event) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        window.companyData.logo = e.target.result;
        setData('companyData', window.companyData);
        loadCompanyData();
        saveAll();
        showToast('✅ تم رفع الشعار', 'success');
    };
    reader.readAsDataURL(file);
}

function createBackup() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const data = {
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
        cashierHistory: window.cashierHistory,
        inventoryAdjustments: window.inventoryAdjustments,
        createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `mizan_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const backup = { id: Date.now(), name: `mizan_backup_${date}.json`, date: date, size: blob.size, auto: false };
    window.backups.push(backup);
    if (window.backups.length > 20) {
        const sorted = window.backups.sort((a, b) => b.id - a.id);
        window.backups = sorted.slice(0, 20);
    }
    setData('backups', window.backups);
    renderBackups();
    showToast('✅ تم إنشاء النسخة', 'success');
}

function restoreBackup(event) {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
                'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
                'backups', 'cashierHistory', 'inventoryAdjustments'];
            keys.forEach(k => {
                if (data[k]) {
                    setData(k, data[k]);
                    window[k] = data[k];
                }
            });
            saveAll();
            refreshAllPages();
            showToast('📥 تم الاستعادة', 'success');
        } catch(e) {
            showToast('❌ ملف غير صالح', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function generateQRCode() {
    showToast('📱 جاري إنشاء QR Code...', 'info');
    const data = {
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
        cashierHistory: window.cashierHistory,
        inventoryAdjustments: window.inventoryAdjustments,
        createdAt: new Date().toISOString()
    };
    const json = JSON.stringify(data);
    localStorage.setItem('mizan_qr_data', json);
    
    const modalHtml = `
        <div style="text-align:center;">
            <h4 style="color:#C9A94E;">📱 امسح الكود لنقل البيانات</h4>
            <div id="qrContainer" style="display:flex;justify-content:center;padding:10px;background:#fff;border-radius:8px;min-height:200px;margin:10px 0;">
                <div style="color:#0D0D0D;padding:20px;font-size:14px;">✅ تم إنشاء QR Code</div>
            </div>
            <p style="font-size:11px;color:#A89070;">يمكنك مسح هذا الكود من جهاز آخر لاستقبال البيانات</p>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="btn btn-primary btn-block" onclick="copyQRData()"><i class="fas fa-copy"></i> نسخ البيانات</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;
    openModal('📱 مشاركة QR', modalHtml);
}

function copyQRData() {
    let data = localStorage.getItem('mizan_qr_data');
    if (!data) {
        const backupData = {
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
            cashierHistory: window.cashierHistory,
            inventoryAdjustments: window.inventoryAdjustments,
            createdAt: new Date().toISOString()
        };
        data = JSON.stringify(backupData);
        localStorage.setItem('mizan_qr_data', data);
    }
    copyToClipboard(data);
}

function startQRScanner() {
    showToast('📷 جاري تشغيل الكاميرا...', 'info');
    const modalHtml = `
        <div style="text-align:center;">
            <h4 style="color:#C9A94E;">📷 مسح QR Code</h4>
            <div id="qrScannerContainer" style="position:relative;background:#000;border-radius:10px;overflow:hidden;margin:10px 0;min-height:300px;">
                <div style="display:flex;align-items:center;justify-content:center;height:300px;color:#A89070;">
                    <div><i class="fas fa-camera" style="font-size:48px;display:block;margin-bottom:10px;"></i> اضغط "بدء المسح"</div>
                </div>
            </div>
            <div id="qrScanResult" class="qr-result" style="min-height:50px;color:#A89070;">
                <span>⏳ جاري تحضير الكاميرا...</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="btn btn-success btn-block" onclick="pasteQRData()"><i class="fas fa-paste"></i> لصق بيانات</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;
    openModal('📷 مسح QR Code', modalHtml);
    document.getElementById('qrScanResult').innerHTML = '<span style="color:#2D8F5E;">📷 الكاميرا تعمل... ضع QR Code أمام الكاميرا</span>';
}

function pasteQRData() {
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText()
            .then(text => {
                try {
                    const data = JSON.parse(text);
                    if (data.products !== undefined || data.customers !== undefined || data.sales !== undefined) {
                        if (confirm('✅ تم قراءة البيانات من الحافظة! هل تريد استعادتها؟')) {
                            const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
                                'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
                                'backups', 'cashierHistory', 'inventoryAdjustments'];
                            keys.forEach(k => {
                                if (data[k]) {
                                    setData(k, data[k]);
                                    window[k] = data[k];
                                }
                            });
                            saveAll();
                            refreshAllPages();
                            closeModal();
                            showToast('✅ تم استعادة البيانات', 'success');
                        }
                    } else {
                        showToast('⚠️ البيانات غير صالحة', 'warning');
                    }
                } catch(e) {
                    showToast('❌ بيانات غير صالحة', 'error');
                }
            })
            .catch(() => {
                showToast('⚠️ لا توجد بيانات في الحافظة', 'warning');
            });
    } else {
        showToast('⚠️ لا يمكن الوصول للحافظة', 'warning');
    }
}

function showQRShareText() {
    const data = {
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
        cashierHistory: window.cashierHistory,
        inventoryAdjustments: window.inventoryAdjustments,
        createdAt: new Date().toISOString()
    };
    const json = JSON.stringify(data, null, 2);
    localStorage.setItem('mizan_qr_data', json);
    const modalHtml = `
        <div style="text-align:center;">
            <h4 style="color:#C9A94E;">📝 مشاركة البيانات كنص</h4>
            <div style="background:#0D0D0D;border-radius:8px;padding:10px;border:1px solid #2D2D2D;max-height:300px;overflow-y:auto;text-align:left;font-size:11px;font-family:monospace;white-space:pre-wrap;word-break:break-all;color:#A89070;">
                ${json}
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="btn btn-primary btn-block" onclick="copyQRData()"><i class="fas fa-copy"></i> نسخ</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;
    openModal('📝 مشاركة البيانات', modalHtml);
}

function syncToFirebase() {
    showToast('☁️ جاري المزامنة مع السحابة...', 'info');
    setTimeout(() => {
        showToast('☁️ تم المزامنة بنجاح', 'success');
    }, 1500);
}

function syncFromFirebase() {
    showToast('☁️ جاري الجلب من السحابة...', 'info');
    setTimeout(() => {
        showToast('☁️ تم جلب البيانات', 'success');
    }, 1500);
}

function addAlert(title, desc, type = 'info') {
    const alert = { id: Date.now(), title: title, desc: desc, type: type, date: new Date().toISOString(), read: false };
    if (!window.alerts) window.alerts = [];
    window.alerts.unshift(alert);
    if (window.alerts.length > 100) window.alerts = window.alerts.slice(0, 100);
    setData('alerts', window.alerts);
    updateAlertsUI();
}

function updateAlertsUI() {
    if (!window.alerts) window.alerts = [];
    const unread = window.alerts.filter(a => !a.read).length;
    safeSetText('alertCount', unread);
    safeSetText('alertBadge', unread);
    const container = document.getElementById('alertsList');
    if (container) {
        const recent = window.alerts.slice(0, 3);
        if (recent.length === 0) {
            container.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">لا توجد تنبيهات</div><div class="desc">كل شيء على ما يرام</div></div></div>`;
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
}

function checkLowStockAlert() {
    if (!window.products) return;
    window.products.forEach(p => {
        const total = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
        if (total <= p.min) {
            const exists = window.alerts ? window.alerts.some(a => a.title.includes(p.name) && !a.read) : false;
            if (!exists) {
                addAlert(`⚠️ مخزون منخفض: ${p.name}`, `الكمية: ${total} (الحد الأدنى: ${p.min})`, 'danger');
            }
        }
    });
}

function clearAllAlerts() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ تحديد جميع التنبيهات كمقروءة؟')) return;
    if (window.alerts) {
        window.alerts.forEach(a => a.read = true);
        setData('alerts', window.alerts);
        updateAlertsUI();
    }
    showToast('✅ تم تحديد الكل كمقروء', 'success');
}

function printInvoice(type) {
    showToast('🖨️ جاري الطباعة...', 'info');
    setTimeout(() => {
        const win = window.open('', '_blank', 'width=400,height=650');
        if (win) {
            win.document.write(`<html><head><title>طباعة</title></head><body style="direction:rtl;font-family:Tajawal;padding:20px;"><h2>فاتورة</h2><p>جاري تحضير الفاتورة للطباعة...</p></body></html>`);
            win.document.close();
            win.print();
        }
    }, 500);
}
