// ============================================================
// الميزان - الإصدار 12.1.0 (الحسابات + قائمة محسّنة)
// ============================================================

const STORAGE_KEY = 'mizan_';
const DEFAULT_PASSWORD = '123456';
const DEFAULT_VAT = 14;

const firebaseConfig = {
    apiKey: "AIzaSyCP7vpqviR6A11gPkC7cO6MQJBGKWcnVWE",
    authDomain: "accounting-balance-ab9d3.firebaseapp.com",
    databaseURL: "https://accounting-balance-ab9d3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "accounting-balance-ab9d3",
    storageBucket: "accounting-balance-ab9d3.firebasestorage.app",
    messagingSenderId: "564321427560",
    appId: "1:564321427560:web:170368d708c4d9dd771bdd",
    measurementId: "G-D6K2GYLBKD"
};

let firebaseReady = false;
const CLOUD_PATH = 'mizan_data';

let products = [], sales = [], purchases = [], returns = [], expenses = [];
let customers = [], suppliers = [], treasury = [];
let payments = [], users = [], auditLog = [];
let accounts = [], journalEntries = [];
let currentUser = null;
let currentSaleItems = [], currentPurItems = [], currentRetItems = [];
let companyData = {};
let currentReport = 'daily';
let currentAuditFilter = 'all';
let vatSettings = { defaultVAT: 14 };

// ============================================================
// أدوات مساعدة
// ============================================================
function $(id) { return document.getElementById(id); }

function getData(key, def = []) {
    try {
        const d = localStorage.getItem(STORAGE_KEY + key);
        return d ? JSON.parse(d) : def;
    } catch (e) { return def; }
}

function setData(key, data) {
    try { localStorage.setItem(STORAGE_KEY + key, JSON.stringify(data)); } catch (e) {}
}

function showToast(msg, type = 'info') {
    const t = $('toast'); if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.className = 'toast'; }, 3000);
}

function getTodayDate() { return new Date().toISOString().split('T')[0]; }
function formatMoney(n) { return Number(n || 0).toFixed(2); }

function getRadioValue(name, defaultValue = '') {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : defaultValue;
}

function setRadioValue(name, value) {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
}

function migrateOldProducts(oldProducts) {
    if (!Array.isArray(oldProducts)) return [];
    return oldProducts.map(p => {
        if (!p || typeof p !== 'object') return null;
        let qty = 0;
        if (typeof p.qty === 'number') qty = p.qty;
        else if (typeof p.quantity === 'number') qty = p.quantity;
        else if (Array.isArray(p.warehouseProducts)) qty = p.warehouseProducts.reduce((s, wp) => s + (wp.qty || 0), 0);
        return {
            id: p.id || Date.now() + Math.random(),
            name: p.name || 'بدون اسم',
            barcode: p.barcode || '',
            buy: parseFloat(p.buy ?? p.buyPrice ?? 0) || 0,
            sell: parseFloat(p.sell ?? p.sellPrice ?? 0) || 0,
            qty: parseInt(qty) || 0,
            min: parseInt(p.min) || 5,
            vat: parseFloat(p.vat ?? 14) || 14
        };
    }).filter(Boolean);
}

// ============================================================
// المستخدمين والصلاحيات
// ============================================================
const ROLES = {
    admin: { name: 'مدير', icon: '👑', color: '#E06060' },
    manager: { name: 'مشرف', icon: '📊', color: '#C9A94E' },
    cashier: { name: 'كاشير', icon: '💰', color: '#4A8AB5' },
    viewer: { name: 'مشاهد', icon: '👁️', color: '#5D5D5D' }
};

function hasPermission(permission) {
    if (!currentUser) return false;
    const role = currentUser.role;
    const permissions = {
        admin: ['add', 'edit', 'delete', 'view', 'manage_users', 'view_audit', 'clear_data'],
        manager: ['add', 'edit', 'view'],
        cashier: ['add_sale', 'view'],
        viewer: ['view']
    };
    return (permissions[role] || []).includes(permission);
}

function isAdmin() { return currentUser && currentUser.role === 'admin'; }
function isManager() { return currentUser && currentUser.role === 'manager'; }
function canAdd() { return hasPermission('add') || hasPermission('add_sale'); }
function canEdit() { return hasPermission('edit'); }
function canDelete() { return hasPermission('delete'); }
function canView() { return hasPermission('view'); }
function canManageUsers() { return hasPermission('manage_users'); }
function canViewAudit() { return hasPermission('view_audit'); }
function canClearData() { return hasPermission('clear_data'); }

// ============================================================
// سجل النشاطات
// ============================================================
function addAuditLog(action, type, details, extraData = null) {
    const log = {
        id: Date.now() + Math.random(),
        action: action,
        type: type,
        details: details,
        extraData: extraData,
        userName: currentUser ? currentUser.name : 'غير معروف',
        userRole: currentUser ? currentUser.role : 'unknown',
        date: getTodayDate(),
        time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        createdAt: new Date().toISOString()
    };
    auditLog.unshift(log);
    if (auditLog.length > 2000) auditLog = auditLog.slice(0, 2000);
    setData('auditLog', auditLog);
}

// ============================================================
// شجرة الحسابات الافتراضية
// ============================================================
const DEFAULT_ACCOUNTS = [
    // ============ الأصول (1) ============
    { id: 1, code: '1000', name: 'الأصول', type: 'assets', parentId: null, isParent: true },
    { id: 2, code: '1100', name: 'الأصول المتداولة', type: 'assets', parentId: 1, isParent: true },
    { id: 3, code: '1101', name: 'النقدية بالخزنة', type: 'assets', parentId: 2, isParent: false },
    { id: 4, code: '1102', name: 'النقدية بالبنك', type: 'assets', parentId: 2, isParent: false },
    { id: 5, code: '1103', name: 'العملاء (المدينون)', type: 'assets', parentId: 2, isParent: false },
    { id: 6, code: '1104', name: 'المخزون', type: 'assets', parentId: 2, isParent: false },
    { id: 7, code: '1105', name: 'ضريبة القيمة المضافة (مدين)', type: 'assets', parentId: 2, isParent: false },
    { id: 8, code: '1200', name: 'الأصول الثابتة', type: 'assets', parentId: 1, isParent: true },
    { id: 9, code: '1201', name: 'أثاث ومفروشات', type: 'assets', parentId: 8, isParent: false },
    { id: 10, code: '1202', name: 'أجهزة وحاسبات', type: 'assets', parentId: 8, isParent: false },
    { id: 11, code: '1203', name: 'وسائل نقل', type: 'assets', parentId: 8, isParent: false },

    // ============ الخصوم (2) ============
    { id: 12, code: '2000', name: 'الخصوم', type: 'liabilities', parentId: null, isParent: true },
    { id: 13, code: '2100', name: 'الخصوم المتداولة', type: 'liabilities', parentId: 12, isParent: true },
    { id: 14, code: '2101', name: 'الموردين (الدائنون)', type: 'liabilities', parentId: 13, isParent: false },
    { id: 15, code: '2102', name: 'ضريبة القيمة المضافة (دائن)', type: 'liabilities', parentId: 13, isParent: false },
    { id: 16, code: '2103', name: 'مصروفات مستحقة', type: 'liabilities', parentId: 13, isParent: false },
    { id: 17, code: '2200', name: 'الخصوم طويلة الأجل', type: 'liabilities', parentId: 12, isParent: true },
    { id: 18, code: '2201', name: 'قروض طويلة الأجل', type: 'liabilities', parentId: 17, isParent: false },

    // ============ حقوق الملكية (3) ============
    { id: 19, code: '3000', name: 'حقوق الملكية', type: 'equity', parentId: null, isParent: true },
    { id: 20, code: '3001', name: 'رأس المال', type: 'equity', parentId: 19, isParent: false },
    { id: 21, code: '3002', name: 'الأرباح المحتجزة', type: 'equity', parentId: 19, isParent: false },
    { id: 22, code: '3003', name: 'المسحوبات الشخصية', type: 'equity', parentId: 19, isParent: false },

    // ============ الإيرادات (4) ============
    { id: 23, code: '4000', name: 'الإيرادات', type: 'revenue', parentId: null, isParent: true },
    { id: 24, code: '4001', name: 'إيرادات المبيعات', type: 'revenue', parentId: 23, isParent: false },
    { id: 25, code: '4002', name: 'إيرادات أخرى', type: 'revenue', parentId: 23, isParent: false },
    { id: 26, code: '4003', name: 'خصم مسموح به', type: 'revenue', parentId: 23, isParent: false },

    // ============ المصروفات (5) ============
    { id: 27, code: '5000', name: 'المصروفات', type: 'expenses', parentId: null, isParent: true },
    { id: 28, code: '5001', name: 'تكلفة البضاعة المباعة', type: 'expenses', parentId: 27, isParent: false },
    { id: 29, code: '5002', name: 'رواتب وأجور', type: 'expenses', parentId: 27, isParent: false },
    { id: 30, code: '5003', name: 'إيجار', type: 'expenses', parentId: 27, isParent: false },
    { id: 31, code: '5004', name: 'كهرباء ومياه', type: 'expenses', parentId: 27, isParent: false },
    { id: 32, code: '5005', name: 'مصروفات تسويق', type: 'expenses', parentId: 27, isParent: false },
    { id: 33, code: '5006', name: 'صيانة وإصلاح', type: 'expenses', parentId: 27, isParent: false },
    { id: 34, code: '5007', name: 'مصروفات متنوعة', type: 'expenses', parentId: 27, isParent: false }
];

// ============================================================
// Firebase
// ============================================================
function initFirebase() {
    try {
        if (typeof firebase === 'undefined') return false;
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseReady = true;
        console.log('✅ Firebase جاهز');
        return true;
    } catch (e) {
        console.error('❌ خطأ Firebase:', e);
        firebaseReady = false;
        return false;
    }
}

function getFirebaseRef() {
    if (!firebaseReady) return null;
    try { return firebase.database().ref(CLOUD_PATH); }
    catch (e) { return null; }
}

function updateSyncStatus(msg, type = 'info') {
    const el = $('syncStatus');
    if (!el) return;
    const colors = { success: '#2D8F5E', error: '#E06060', info: '#C9A94E', warning: '#E6A830' };
    el.style.color = colors[type] || '#A89070';
    el.textContent = msg;
    if (type === 'success' || type === 'error') {
        setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 5000);
    }
}

function syncToCloud() {
    const ref = getFirebaseRef();
    if (!ref) { showToast('⚠️ Firebase غير متصل', 'error'); return; }
    const data = {
        products, sales, purchases, returns, expenses,
        customers, suppliers, treasury, payments, companyData,
        users, auditLog, vatSettings, accounts, journalEntries,
        lastSync: new Date().toISOString(),
        version: '12.1.0'
    };
    updateSyncStatus('⏳ جاري الرفع...', 'info');
    showToast('⏳ جاري الرفع...', 'info');
    ref.set(data)
        .then(() => {
            showToast('✅ تم الرفع للسحابة بنجاح', 'success');
            updateSyncStatus('✅ تم الرفع بنجاح - ' + new Date().toLocaleTimeString('ar'), 'success');
            addAuditLog('edit', 'cloud', 'رفع البيانات للسحابة');
        })
        .catch((err) => { showToast('❌ فشل الرفع: ' + err.message, 'error'); });
}

function syncFromCloud() {
    const ref = getFirebaseRef();
    if (!ref) { showToast('⚠️ Firebase غير متصل', 'error'); return; }
    if (!confirm('⚠️ سيتم استبدال البيانات الحالية. متابعة؟')) return;
    updateSyncStatus('⏳ جاري الجلب...', 'info');
    showToast('⏳ جاري الجلب...', 'info');
    ref.once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) { showToast('⚠️ لا توجد بيانات', 'warning'); return; }
            const data = snapshot.val();
            if (data.products) products = data.products;
            if (data.sales) sales = data.sales;
            if (data.purchases) purchases = data.purchases;
            if (data.returns) returns = data.returns;
            if (data.expenses) expenses = data.expenses;
            if (data.customers) customers = data.customers;
            if (data.suppliers) suppliers = data.suppliers;
            if (data.treasury) treasury = data.treasury;
            if (data.payments) payments = data.payments;
            if (data.companyData) companyData = data.companyData;
            if (data.users) users = data.users;
            if (data.auditLog) auditLog = data.auditLog;
            if (data.vatSettings) vatSettings = data.vatSettings;
            if (data.accounts) accounts = data.accounts;
            if (data.journalEntries) journalEntries = data.journalEntries;
            saveAll();
            populateAllDropdowns();
            renderProducts(); renderCashier(); renderPurchases();
            renderReturns(); renderExpenses(); renderInvoices();
            renderTreasury(); renderCustomers(); renderSuppliers();
            renderPayments(); renderUsers(); renderAudit();
            renderAccounts(); renderJournal();
            updateDashboard();
            showToast('✅ تم الجلب من السحابة', 'success');
        })
        .catch((err) => { showToast('❌ فشل الجلب: ' + err.message, 'error'); });
}

// ============================================================
// الساعة
// ============================================================
function updateClock() {
    const el = $('liveDateTime'); if (!el) return;
    const now = new Date();
    const date = String(now.getDate()).padStart(2, '0') + '/' +
                 String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
    const time = now.toLocaleTimeString('en-GB', { hour12: false });
    el.textContent = date + ' ' + time;
}
setInterval(updateClock, 1000);

// ============================================================
// تسجيل الدخول
// ============================================================
function populateLoginUsers() {
    const sel = $('loginUsername');
    if (!sel) return;
    sel.innerHTML = '';
    users.forEach(u => {
        if (u.active !== false) {
            sel.innerHTML += `<option value="${u.id}">${u.name} (${ROLES[u.role]?.name || u.role})</option>`;
        }
    });
}

function checkLogin() {
    const userIdEl = $('loginUsername');
    const passwordEl = $('loginPassword');
    const error = $('loginError');
    if (!userIdEl || !passwordEl) return;
    const userId = userIdEl.value;
    const password = passwordEl.value;
    if (!userId) { if (error) error.classList.add('show'); return; }
    const user = users.find(u => u.id == userId);
    if (!user) { if (error) error.classList.add('show'); return; }
    if (user.password !== password) {
        if (error) error.classList.add('show');
        passwordEl.value = '';
        passwordEl.focus();
        setTimeout(() => { if (error) error.classList.remove('show'); }, 3000);
        return;
    }
    currentUser = user;
    localStorage.setItem(STORAGE_KEY + 'current_user', JSON.stringify({ id: user.id, name: user.name, role: user.role }));
    if (error) error.classList.remove('show');
    passwordEl.value = '';
    const loginCont = $('loginContainer');
    const appCont = $('appContent');
    if (loginCont) loginCont.classList.add('hidden');
    if (appCont) appCont.style.display = 'block';
    updateUserUI();
    applyPermissions();
    addAuditLog('login', 'user', `تسجيل دخول: ${user.name}`, { userId: user.id, role: user.role });
    showToast(`🔓 مرحباً ${user.name}!`, 'success');
    navigateTo('dashboard');
}

function lockApp() {
    if (currentUser) {
        addAuditLog('login', 'user', `تسجيل خروج: ${currentUser.name}`, { userId: currentUser.id });
    }
    currentUser = null;
    localStorage.removeItem(STORAGE_KEY + 'current_user');
    const loginCont = $('loginContainer');
    const appCont = $('appContent');
    if (loginCont) loginCont.classList.remove('hidden');
    if (appCont) appCont.style.display = 'none';
    populateLoginUsers();
}

function updateUserUI() {
    if (!currentUser) return;
    if ($('currentUserName')) $('currentUserName').textContent = currentUser.name;
    if ($('currentUserForPassword')) $('currentUserForPassword').textContent = currentUser.name;
}

function applyPermissions() {
    const role = currentUser ? currentUser.role : 'viewer';
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = (role === 'admin') ? '' : 'none';
    });
    const dangerZone = $('dangerZone');
    if (dangerZone) dangerZone.style.display = isAdmin() ? '' : 'none';
    const userForm = $('userFormCard');
    if (userForm) userForm.style.display = isAdmin() ? '' : 'none';
}

// ============================================================
// التنقل
// ============================================================
function navigateTo(page) {
    if (page === 'users' && !canManageUsers()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (page === 'audit' && !canViewAudit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    document.querySelectorAll('.page-container').forEach(el => el.classList.remove('active'));
    const target = $('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));

    if (page === 'dashboard') updateDashboard();
    if (page === 'inventory') renderProducts();
    if (page === 'cashier') { renderCashier(); updateSaleTotals(); }
    if (page === 'purchases') { renderPurchases(); updatePurTotals(); }
    if (page === 'returns') renderReturns();
    if (page === 'expenses') renderExpenses();
    if (page === 'invoices') renderInvoices();
    if (page === 'treasury') renderTreasury();
    if (page === 'customers') renderCustomers();
    if (page === 'suppliers') renderSuppliers();
    if (page === 'payments') renderPayments();
    if (page === 'reports') renderReport(currentReport);
    if (page === 'accounts') { renderAccounts(); renderJournal(); populateAccountDropdowns(); }
    if (page === 'company') renderCompanyPage();
    if (page === 'users') renderUsers();
    if (page === 'audit') renderAudit();
    if (page === 'settings') renderSettings();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// المخزون
// ============================================================
function saveProduct() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('productId').value;
    const name = $('productName').value.trim();
    const barcode = $('productBarcode').value.trim();
    const buy = parseFloat($('productBuy').value) || 0;
    const sell = parseFloat($('productSell').value) || 0;
    const qty = parseInt($('productQty').value) || 0;
    const min = parseInt($('productMin').value) || 5;
    const vat = parseFloat($('productVAT')?.value) || vatSettings.defaultVAT;
    if (!name) { showToast('⚠️ أدخل اسم المنتج', 'error'); return; }
    if (buy <= 0) { showToast('⚠️ أدخل سعر شراء صحيح', 'error'); return; }
    if (sell <= 0) { showToast('⚠️ أدخل سعر بيع صحيح', 'error'); return; }
    if (id) {
        if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
        const idx = products.findIndex(p => p.id == id);
        if (idx > -1) {
            const old = { ...products[idx] };
            products[idx] = { ...products[idx], name, barcode, buy, sell, qty, min, vat };
            addAuditLog('edit', 'product', `تعديل منتج: ${name}`, {
                before: { name: old.name, buy: old.buy, sell: old.sell, qty: old.qty, vat: old.vat },
                after: { name, buy, sell, qty, vat }
            });
            showToast('✅ تم تعديل المنتج', 'success');
        }
    } else {
        if (products.find(p => p.name === name)) { showToast('⚠️ المنتج موجود', 'warning'); return; }
        products.push({ id: Date.now(), name, barcode, buy, sell, qty, min, vat, createdAt: new Date().toISOString() });
        addAuditLog('add', 'product', `إضافة منتج: ${name}`, {
            product: { name, buy, sell, qty, vat, barcode }
        });
        showToast('✅ تم إضافة المنتج', 'success');
    }
    setData('products', products);
    resetProductForm(); renderProducts(); populateAllDropdowns(); updateDashboard();
}

function editProduct(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    $('productId').value = p.id; $('productName').value = p.name;
    $('productBarcode').value = p.barcode || ''; $('productBuy').value = p.buy;
    $('productSell').value = p.sell; $('productQty').value = p.qty;
    $('productMin').value = p.min || 5;
    if ($('productVAT')) $('productVAT').value = p.vat || vatSettings.defaultVAT;
    $('productFormTitle').textContent = '✏️ تعديل المنتج';
    $('productSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    if (!confirm(`⚠️ حذف "${p.name}"؟`)) return;
    products = products.filter(pr => pr.id != id);
    setData('products', products);
    addAuditLog('delete', 'product', `حذف منتج: ${p.name}`, {
        product: { name: p.name, buy: p.buy, sell: p.sell, qty: p.qty }
    });
    renderProducts(); populateAllDropdowns(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

function resetProductForm() {
    $('productId').value = ''; $('productName').value = '';
    $('productBarcode').value = ''; $('productBuy').value = '';
    $('productSell').value = ''; $('productQty').value = '';
    $('productMin').value = '5';
    if ($('productVAT')) $('productVAT').value = vatSettings.defaultVAT;
    $('productFormTitle').textContent = '➕ إضافة منتج جديد';
    $('productSaveBtnText').textContent = 'إضافة';
}

function renderProducts() {
    const container = $('productList'); if (!container) return;
    const search = ($('inventorySearch')?.value || '').trim().toLowerCase();
    let filtered = products;
    if (search) filtered = products.filter(p => p.name.toLowerCase().includes(search) || (p.barcode && p.barcode.includes(search)));
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><span>${search ? 'لا توجد نتائج' : 'لا توجد منتجات'}</span></div>`;
        return;
    }
    const showActions = canEdit() || canDelete();
    let html = `<div class="table-header" style="grid-template-columns: 2fr 0.8fr 0.8fr 0.6fr 0.7fr ${showActions ? '1.2fr' : '0'};"><span>المنتج</span><span>الشراء</span><span>البيع</span><span>الكمية</span><span>الضريبة</span>${showActions ? '<span></span>' : ''}</div>`;
    filtered.forEach(p => {
        const low = p.qty <= (p.min || 5);
        const vat = p.vat || vatSettings.defaultVAT;
        html += `<div class="table-row" style="grid-template-columns: 2fr 0.8fr 0.8fr 0.6fr 0.7fr ${showActions ? '1.2fr' : '0'};">
            <span><strong>${p.name}</strong>${p.barcode ? `<br><small style="color:#A89070;font-size:10px;">${p.barcode}</small>` : ''}</span>
            <span>${formatMoney(p.buy)}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(p.sell)}</span>
            <span style="${low ? 'color:#E06060;font-weight:700;' : ''}">${p.qty}${low ? ' ⚠️' : ''}</span>
            <span style="color:#9B59B6;font-weight:700;font-size:11px;">${vat}%</span>
            ${showActions ? `<div style="display:flex;gap:4px;">
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
        </div>`;
    });
    container.innerHTML = html;
}

// ============================================================
// شجرة الحسابات - CRUD
// ============================================================
function saveAccount() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('accId').value;
    const name = $('accName').value.trim();
    const type = $('accType').value;
    const parentId = parseInt($('accParent').value) || null;
    if (!name) { showToast('⚠️ أدخل اسم الحساب', 'error'); return; }
    if (id) {
        if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
        const idx = accounts.findIndex(a => a.id == id);
        if (idx > -1) {
            accounts[idx] = { ...accounts[idx], name, type, parentId };
            addAuditLog('edit', 'account', `تعديل حساب: ${name}`);
            showToast('✅ تم تعديل الحساب', 'success');
        }
    } else {
        const newId = Date.now();
        const parent = accounts.find(a => a.id === parentId);
        const code = generateAccountCode(type, parent);
        accounts.push({
            id: newId, code, name, type, parentId,
            isParent: false,
            createdAt: new Date().toISOString()
        });
        addAuditLog('add', 'account', `إضافة حساب: ${name}`, {
            account: { name, type, code, parentId }
        });
        showToast('✅ تم إضافة الحساب', 'success');
    }
    setData('accounts', accounts);
    resetAccountForm();
    renderAccounts();
    populateAccountDropdowns();
    renderSettings();
}

function generateAccountCode(type, parent) {
    const prefix = { assets: '1', liabilities: '2', equity: '3', revenue: '4', expenses: '5' }[type] || '9';
    if (parent && parent.code) {
        const siblings = accounts.filter(a => a.parentId === parent.id);
        const nextNum = String(siblings.length + 1).padStart(2, '0');
        return parent.code.substring(0, 2) + nextNum;
    }
    const topLevel = accounts.filter(a => a.type === type && !a.parentId);
    const nextNum = String(topLevel.length * 100 + 1000).padStart(4, '0');
    return nextNum;
}

function editAccount(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const a = accounts.find(acc => acc.id == id); if (!a) return;
    $('accId').value = a.id;
    $('accName').value = a.name;
    $('accType').value = a.type;
    $('accParent').value = a.parentId || '';
    $('accFormTitle').textContent = '✏️ تعديل الحساب';
    $('accSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteAccount(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const a = accounts.find(acc => acc.id == id); if (!a) return;

    const hasChildren = accounts.some(acc => acc.parentId === id);
    if (hasChildren) {
        if (!confirm(`⚠️ الحساب "${a.name}" له حسابات فرعية. سيتم حذف كل الفروع. متابعة؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف الحساب "${a.name}"؟`)) return;
    }

    const toDelete = [id];
    const findChildren = (parentId) => {
        accounts.filter(acc => acc.parentId === parentId).forEach(c => {
            toDelete.push(c.id);
            findChildren(c.id);
        });
    };
    findChildren(id);

    accounts = accounts.filter(acc => !toDelete.includes(acc.id));
    setData('accounts', accounts);
    addAuditLog('delete', 'account', `حذف حساب: ${a.name}`);
    renderAccounts();
    populateAccountDropdowns();
    renderSettings();
    showToast('🗑️ تم الحذف', 'info');
}

function resetAccountForm() {
    $('accId').value = '';
    $('accName').value = '';
    $('accType').value = 'assets';
    $('accParent').value = '';
    $('accFormTitle').textContent = '➕ إضافة حساب جديد';
    $('accSaveBtnText').textContent = 'إضافة';
}

function renderAccounts() {
    const container = $('accountsTree'); if (!container) return;
    const typeNames = { assets: '🏛️ الأصول', liabilities: '💳 الخصوم', equity: '👑 حقوق الملكية', revenue: '💰 الإيرادات', expenses: '💸 المصروفات' };
    const typeOrder = ['assets', 'liabilities', 'equity', 'revenue', 'expenses'];

    let html = '';

    typeOrder.forEach(type => {
        const typeAccounts = accounts.filter(a => a.type === type);
        if (typeAccounts.length === 0) return;

        html += `<div class="acc-type-header ${type}">${typeNames[type]}</div>`;

        const renderTree = (parentId, level) => {
            const children = accounts.filter(a => a.type === type && a.parentId === parentId);
            children.forEach(a => {
                const balance = calculateAccountBalance(a.id);
                const balanceClass = balance > 0 ? 'debit' : balance < 0 ? 'credit' : '';
                html += `<div class="acc-item ${level > 0 ? 'child' : ''}">
                    <span class="acc-name">${a.code ? `<small style="color:#A89070;">${a.code}</small> - ` : ''}${a.name}${a.isParent ? ' <small style="color:#C9A94E;">(رئيسي)</small>' : ''}</span>
                    <span class="acc-balance ${balanceClass}">${formatMoney(Math.abs(balance))}</span>
                    <div class="acc-actions">
                        ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editAccount(${a.id})"><i class="fas fa-edit"></i></button>` : ''}
                        ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteAccount(${a.id})"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>`;
                renderTree(a.id, level + 1);
            });
        };
        renderTree(null, 0);
    });

    if (!html) html = '<div class="empty-state"><i class="fas fa-sitemap"></i><span>لا توجد حسابات</span></div>';
    container.innerHTML = html;
}

function calculateAccountBalance(accountId) {
    let balance = 0;
    journalEntries.forEach(entry => {
        (entry.lines || []).forEach(line => {
            if (line.accountId === accountId) {
                balance += (line.debit || 0) - (line.credit || 0);
            }
        });
    });
    return balance;
}

function populateAccountParents() {
    const sel = $('accParent');
    if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">لا يوجد (حساب رئيسي)</option>';
    accounts.filter(a => !a.parentId || a.isParent).forEach(a => {
        sel.innerHTML += `<option value="${a.id}">${a.code ? a.code + ' - ' : ''}${a.name}</option>`;
    });
    sel.value = cv;
}

// ✅ النسخة المحدثة: قائمة الحسابات الفرعية فقط + مجموعات
function populateAccountDropdowns() {
    populateAccountParents();
    const jeDebitEl = $('jeDebitAccount');
    const jeCreditEl = $('jeCreditAccount');
    
    // ✅ دالة مساعدة: الحساب يكون فرعي (مش عند فرع تحته)
    function isLeafAccount(acc) {
        if (acc.isParent) return false;
        const hasChildren = accounts.some(a => a.parentId === acc.id);
        return !hasChildren;
    }
    
    // ✅ دالة لعرض الحسابات في optgroup حسب النوع
    function buildOptionsHTML() {
        const typeNames = {
            assets: '🏛️ الأصول',
            liabilities: '💳 الخصوم',
            equity: '👑 حقوق الملكية',
            revenue: '💰 الإيرادات',
            expenses: '💸 المصروفات'
        };
        const typeOrder = ['assets', 'liabilities', 'equity', 'revenue', 'expenses'];
        
        let html = '<option value="">اختر حساب...</option>';
        
        typeOrder.forEach(type => {
            const typeAccounts = accounts.filter(a => a.type === type && isLeafAccount(a));
            if (typeAccounts.length === 0) return;
            
            html += `<optgroup label="${typeNames[type]}">`;
            typeAccounts.forEach(a => {
                html += `<option value="${a.id}">${a.code ? a.code + ' - ' : ''}${a.name}</option>`;
            });
            html += `</optgroup>`;
        });
        
        return html;
    }
    
    const optionsHTML = buildOptionsHTML();
    
    if (jeDebitEl) {
        const cv = jeDebitEl.value;
        jeDebitEl.innerHTML = optionsHTML;
        jeDebitEl.value = cv;
    }
    if (jeCreditEl) {
        const cv = jeCreditEl.value;
        jeCreditEl.innerHTML = optionsHTML;
        jeCreditEl.value = cv;
    }
}

// ============================================================
// القيود المحاسبية - Journal Entries
// ============================================================

function createJournalEntry(description, reference, date, lines) {
    if (!lines || lines.length < 2) return null;
    const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        console.warn('⚠️ القيد غير متوازن:', description, totalDebit, totalCredit);
        return null;
    }
    const entry = {
        id: Date.now() + Math.random(),
        number: journalEntries.length + 1,
        date: date || getTodayDate(),
        description: description,
        reference: reference || '',
        lines: lines,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'system'
    };
    journalEntries.push(entry);
    if (journalEntries.length > 5000) journalEntries = journalEntries.slice(-5000);
    setData('journalEntries', journalEntries);
    return entry;
}

function getAccountByCode(code) {
    return accounts.find(a => a.code === code);
}

function getAccountByNameContains(name) {
    return accounts.find(a => a.name.includes(name) && !a.isParent);
}

// ============================================================
// الكاشير
// ============================================================
function populateSaleProducts() {
    const sel = $('saleProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name} (متاح: ${p.qty})</option>`);
    sel.value = cv;
}

function populateSaleCustomers() {
    const sel = $('saleCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">عميل نقدي</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    sel.value = cv;
}

function updateSalePrice() {
    const id = $('saleProduct').value;
    if (!id) { $('salePrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('salePrice').value = p.sell;
}

function addSaleItem() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('saleProduct').value;
    const qty = parseInt($('saleQty').value) || 0;
    const price = parseFloat($('salePrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const ex = currentSaleItems.find(i => i.productId == id);
    const totalQty = qty + (ex ? ex.qty : 0);
    if (totalQty > p.qty) { showToast(`⚠️ الكمية المتاحة: ${p.qty}`, 'error'); return; }
    
    const vatPercent = p.vat || vatSettings.defaultVAT;
    const subtotal = qty * price;
    const vatAmount = subtotal * (vatPercent / 100);
    const totalWithVAT = subtotal + vatAmount;
    
    if (ex) {
        ex.qty += qty;
        ex.subtotal = ex.qty * ex.price;
        ex.vatAmount = ex.subtotal * (ex.vatPercent / 100);
        ex.total = ex.subtotal + ex.vatAmount;
    } else {
        currentSaleItems.push({
            productId: p.id, name: p.name, qty, price,
            costPrice: p.buy,
            vatPercent: vatPercent,
            subtotal: subtotal,
            vatAmount: vatAmount,
            total: totalWithVAT
        });
    }
    $('saleQty').value = 1; $('salePrice').value = ''; $('saleProduct').value = '';
    renderCashier(); updateSaleTotals(); showToast('✅ تم إضافة الصنف', 'success');
}

function removeSaleItem(i) { currentSaleItems.splice(i, 1); renderCashier(); updateSaleTotals(); }

function renderCashier() {
    const c = $('saleItemsContainer'), tb = $('saleTotalBox');
    if (!c) return;
    if (currentSaleItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 1.8fr 0.7fr 0.8fr 0.8fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentSaleItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 1.8fr 0.7fr 0.8fr 0.8fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removeSaleItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
}

function updateSaleTotals() {
    const subtotal = currentSaleItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentSaleItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const invoiceType = getRadioValue('saleInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const grandTotal = subtotal + finalVAT;
    
    if ($('saleSubtotal')) $('saleSubtotal').textContent = formatMoney(subtotal) + ' ج.م';
    if ($('saleVAT')) {
        $('saleVAT').textContent = isTaxInvoice ? formatMoney(finalVAT) + ' ج.م' : '0.00 ج.م (غير ضريبية)';
        $('saleVAT').style.color = isTaxInvoice ? '#9B59B6' : '#5D5D5D';
    }
    if ($('saleTotal')) $('saleTotal').textContent = formatMoney(grandTotal) + ' 🇪🇬';
}

function saveSale() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentSaleItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    for (const it of currentSaleItems) {
        const p = products.find(pr => pr.id == it.productId);
        if (!p || p.qty < it.qty) { showToast(`⚠️ الكمية غير كافية: ${it.name}`, 'error'); return; }
    }
    const subtotal = currentSaleItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentSaleItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const customer = $('saleCustomer').value || 'عميل نقدي';
    const paymentMethod = getRadioValue('salePaymentMethod', 'cash');
    const invoiceType = getRadioValue('saleInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const total = subtotal + finalVAT;
    const today = getTodayDate(); const now = new Date();

    if (paymentMethod === 'credit' && customer === 'عميل نقدي') {
        showToast('⚠️ اختر عميل مسجل للبيع الآجل', 'error');
        return;
    }

    let cogsTotal = 0;
    currentSaleItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) { it.costPrice = p.buy; cogsTotal += (p.buy * it.qty); p.qty -= it.qty; }
    });

    const inv = {
        id: Date.now(), number: sales.length + 1, customer,
        paymentMethod,
        invoiceType: isTaxInvoice ? 'tax' : 'simple',
        subtotal: subtotal,
        vatTotal: finalVAT,
        cogs: cogsTotal,
        items: JSON.parse(JSON.stringify(currentSaleItems)),
        total, date: today,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    sales.push(inv);

    if (paymentMethod === 'cash') {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: `${isTaxInvoice ? 'ضريبية' : 'عادية'} - فاتورة #${inv.number} - ${customer}`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'sale', refId: inv.id
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: 0,
            note: `بيع آجل - فاتورة #${inv.number} - ${customer} (دين)`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'sale_credit', refId: inv.id
        });
    }

    // قيد محاسبي تلقائي
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        const arAcc = getAccountByNameContains('العملاء');
        const salesAcc = getAccountByNameContains('إيرادات المبيعات');
        const vatAcc = getAccountByNameContains('ضريبة القيمة المضافة (دائن)');
        const cogsAcc = getAccountByNameContains('تكلفة البضاعة');
        const invAcc = getAccountByNameContains('المخزون');

        if (paymentMethod === 'cash' && cashAcc) {
            lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: total, credit: 0 });
        } else if (arAcc) {
            lines.push({ accountId: arAcc.id, accountName: arAcc.name, debit: total, credit: 0 });
        }
        if (salesAcc) lines.push({ accountId: salesAcc.id, accountName: salesAcc.name, debit: 0, credit: subtotal });
        if (finalVAT > 0 && vatAcc) lines.push({ accountId: vatAcc.id, accountName: vatAcc.name, debit: 0, credit: finalVAT });
        if (cogsAcc) lines.push({ accountId: cogsAcc.id, accountName: cogsAcc.name, debit: cogsTotal, credit: 0 });
        if (invAcc) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: 0, credit: cogsTotal });

        if (lines.length >= 2) {
            createJournalEntry(
                `فاتورة بيع ${isTaxInvoice ? 'ضريبية' : 'عادية'} #${inv.number} - ${customer}`,
                `SALE-${inv.number}`,
                today,
                lines
            );
        }
    } catch (e) { console.warn('⚠️ فشل القيد التلقائي:', e); }

    setData('products', products); setData('sales', sales); setData('treasury', treasury);
    
    addAuditLog('add', 'sale', 
        `فاتورة بيع ${isTaxInvoice ? 'ضريبية' : 'عادية'} #${inv.number} - ${customer} - ${formatMoney(total)} ج.م`,
        {
            invoiceNumber: inv.number, customer: customer,
            paymentMethod: paymentMethod === 'cash' ? 'نقدي' : 'آجل',
            invoiceType: isTaxInvoice ? 'ضريبية' : 'عادية',
            subtotal: subtotal, vatTotal: finalVAT, total: total,
            date: inv.date, time: inv.time,
            items: inv.items.map(it => ({
                name: it.name, qty: it.qty, price: it.price,
                vatPercent: it.vatPercent, vatAmount: it.vatAmount, total: it.total
            }))
        }
    );
    
    currentSaleItems = [];
    const custEl = $('saleCustomer'); if (custEl) custEl.value = '';
    setRadioValue('salePaymentMethod', 'cash');
    setRadioValue('saleInvoiceType', 'simple');
    renderCashier(); updateSaleTotals(); populateSaleProducts(); updateDashboard();
    showToast(`✅ فاتورة #${inv.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
}

function clearSale() {
    if (currentSaleItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    currentSaleItems = [];
    const custEl = $('saleCustomer'); if (custEl) custEl.value = '';
    setRadioValue('salePaymentMethod', 'cash');
    setRadioValue('saleInvoiceType', 'simple');
    renderCashier(); updateSaleTotals(); showToast('🗑️ تم الإلغاء', 'info');
}

// ============================================================
// الشراء
// ============================================================
function populatePurSuppliers() {
    const sel = $('purSupplier'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    sel.value = cv;
}

function populatePurProducts() {
    const sel = $('purProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    sel.value = cv;
}

function updatePurPrice() {
    const id = $('purProduct').value;
    if (!id) { $('purPrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('purPrice').value = p.buy;
}

function addPurItem() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('purProduct').value;
    const qty = parseInt($('purQty').value) || 0;
    const price = parseFloat($('purPrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    
    const vatPercent = p.vat || vatSettings.defaultVAT;
    const subtotal = qty * price;
    const vatAmount = subtotal * (vatPercent / 100);
    const totalWithVAT = subtotal + vatAmount;
    
    const ex = currentPurItems.find(i => i.productId == id);
    if (ex) {
        ex.qty += qty;
        ex.subtotal = ex.qty * ex.price;
        ex.vatAmount = ex.subtotal * (ex.vatPercent / 100);
        ex.total = ex.subtotal + ex.vatAmount;
    } else {
        currentPurItems.push({
            productId: p.id, name: p.name, qty, price,
            vatPercent: vatPercent,
            subtotal: subtotal,
            vatAmount: vatAmount,
            total: totalWithVAT
        });
    }
    $('purQty').value = 1; $('purPrice').value = ''; $('purProduct').value = '';
    renderPurItems(); updatePurTotals(); showToast('✅ تم الإضافة', 'success');
}

function removePurItem(i) { currentPurItems.splice(i, 1); renderPurItems(); updatePurTotals(); }

function renderPurItems() {
    const c = $('purItemsContainer'), tb = $('purTotalBox');
    if (!c) return;
    if (currentPurItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 1.8fr 0.7fr 0.8fr 0.8fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentPurItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 1.8fr 0.7fr 0.8fr 0.8fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removePurItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
}

function updatePurTotals() {
    const subtotal = currentPurItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentPurItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const invoiceType = getRadioValue('purInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const grandTotal = subtotal + finalVAT;
    
    if ($('purSubtotal')) $('purSubtotal').textContent = formatMoney(subtotal) + ' ج.م';
    if ($('purVAT')) {
        $('purVAT').textContent = isTaxInvoice ? formatMoney(finalVAT) + ' ج.م' : '0.00 ج.م (غير ضريبية)';
        $('purVAT').style.color = isTaxInvoice ? '#9B59B6' : '#5D5D5D';
    }
    if ($('purTotal')) $('purTotal').textContent = formatMoney(grandTotal) + ' 🇪🇬';
}

function savePurchase() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentPurItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    const sid = $('purSupplier').value;
    if (!sid) { showToast('⚠️ اختر مورد', 'error'); return; }
    const supplier = suppliers.find(s => s.id == sid); if (!supplier) return;
    const paymentEl = $('purPayment');
    const payment = paymentEl ? paymentEl.value : 'cash';
    const invoiceType = getRadioValue('purInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const subtotal = currentPurItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentPurItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const total = subtotal + finalVAT;
    const today = getTodayDate(); const now = new Date();
    
    currentPurItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) { p.qty += it.qty; p.buy = it.price; }
    });
    
    const inv = {
        id: Date.now(), number: purchases.length + 1,
        supplierId: supplier.id, supplierName: supplier.name,
        invoiceType: isTaxInvoice ? 'tax' : 'simple',
        subtotal: subtotal,
        vatTotal: finalVAT,
        items: JSON.parse(JSON.stringify(currentPurItems)),
        total, payment,
        status: payment === 'cash' ? 'paid' : 'pending',
        date: today,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    purchases.push(inv);
    
    if (payment === 'cash') {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: total,
            note: `${isTaxInvoice ? 'ضريبية' : 'عادية'} - شراء #${inv.number} - ${supplier.name}`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'purchase', refId: inv.id
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: 0,
            note: `شراء آجل - فاتورة #${inv.number} - ${supplier.name} (دين)`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'purchase_credit', refId: inv.id
        });
    }
    
    // قيد محاسبي تلقائي
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        const apAcc = getAccountByNameContains('الموردين');
        const invAcc = getAccountByNameContains('المخزون');
        const vatAcc = getAccountByNameContains('ضريبة القيمة المضافة (مدين)');

        if (invAcc) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: subtotal, credit: 0 });
        if (finalVAT > 0 && vatAcc) lines.push({ accountId: vatAcc.id, accountName: vatAcc.name, debit: finalVAT, credit: 0 });
        if (payment === 'cash' && cashAcc) {
            lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: total });
        } else if (apAcc) {
            lines.push({ accountId: apAcc.id, accountName: apAcc.name, debit: 0, credit: total });
        }
        if (lines.length >= 2) {
            createJournalEntry(
                `فاتورة شراء ${isTaxInvoice ? 'ضريبية' : 'عادية'} #${inv.number} - ${supplier.name}`,
                `PUR-${inv.number}`,
                today,
                lines
            );
        }
    } catch (e) { console.warn('⚠️ فشل القيد التلقائي:', e); }

    setData('products', products); setData('purchases', purchases); setData('treasury', treasury);
    
    addAuditLog('add', 'purchase', 
        `فاتورة شراء ${isTaxInvoice ? 'ضريبية' : 'عادية'} #${inv.number} - ${supplier.name} - ${formatMoney(total)} ج.م`,
        {
            invoiceNumber: inv.number, supplier: supplier.name,
            payment: payment === 'cash' ? 'نقدي' : 'آجل',
            invoiceType: isTaxInvoice ? 'ضريبية' : 'عادية',
            subtotal: subtotal, vatTotal: finalVAT, total: total,
            date: inv.date, time: inv.time,
            items: inv.items.map(it => ({
                name: it.name, qty: it.qty, price: it.price,
                vatPercent: it.vatPercent, vatAmount: it.vatAmount, total: it.total
            }))
        }
    );
    
    currentPurItems = [];
    const supEl = $('purSupplier'); if (supEl) supEl.value = '';
    setRadioValue('purInvoiceType', 'simple');
    renderPurItems(); updatePurTotals(); renderPurchases(); populatePurProducts(); updateDashboard();
    showToast(`✅ فاتورة شراء #${inv.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
}

function clearPurchase() {
    if (currentPurItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    currentPurItems = [];
    const supEl = $('purSupplier'); if (supEl) supEl.value = '';
    setRadioValue('purInvoiceType', 'simple');
    renderPurItems(); updatePurTotals(); showToast('🗑️ تم الإلغاء', 'info');
}

function renderPurchases() {
    const tc = purchases.length;
    const ta = purchases.reduce((s, i) => s + (i.total || 0), 0);
    const pa = purchases.filter(i => i.status === 'pending').reduce((s, i) => s + (i.total || 0), 0);
    const today = getTodayDate();
    const tda = purchases.filter(i => i.date === today).reduce((s, i) => s + (i.total || 0), 0);
    if ($('purTotalCount')) $('purTotalCount').textContent = tc;
    if ($('purTotalAmount')) $('purTotalAmount').textContent = formatMoney(ta);
    if ($('purPendingAmount')) $('purPendingAmount').textContent = formatMoney(pa);
    if ($('purTodayAmount')) $('purTodayAmount').textContent = formatMoney(tda);
    const c = $('purchasesList'); if (!c) return;
    if (purchases.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير شراء</span></div>`; return;
    }
    const sorted = [...purchases].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.6fr 0.8fr 1.2fr;"><span>#</span><span>المورد</span><span>المبلغ</span><span>النوع</span><span>الدفع</span><span></span></div>`;
    sorted.forEach(inv => {
        const sc = inv.status === 'paid' ? '#2D8F5E' : '#E6A830';
        const st = inv.status === 'paid' ? '✅ نقدي' : '⏳ آجل';
        const isTax = inv.invoiceType === 'tax';
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.6fr 0.8fr 1.2fr;">
            <span>#${inv.number}</span><span>${inv.supplierName}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(inv.total)}</span>
            <span style="color:${isTax ? '#9B59B6' : '#5D5D5D'};font-size:10px;font-weight:700;">${isTax ? '🧾' : '📋'}</span>
            <span style="color:${sc};font-weight:700;font-size:10px;">${st}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="viewPurchase(${inv.id})"><i class="fas fa-eye"></i></button>
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deletePurchase(${inv.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function viewPurchase(id) {
    const inv = purchases.find(p => p.id === id); if (!inv) return;
    let itemsHtml = '';
    inv.items.forEach((it, i) => {
        itemsHtml += `<tr><td>${i + 1}</td><td>${it.name}</td><td>${it.qty}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.total)}</td></tr>`;
    });
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="inv-logo" alt="logo">` : '';
    const isTax = inv.invoiceType === 'tax';
    const taxBadge = isTax ? `<span class="tax-badge">🧾 فاتورة ضريبية</span>` : '';
    const subtotal = inv.subtotal !== undefined ? inv.subtotal : inv.total;
    const vatTotal = inv.vatTotal || 0;
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>🛒 فاتورة شراء #${inv.number}</h3>
        <div class="invoice-print ${isTax ? 'tax-invoice' : ''}">
            <div class="inv-header">${taxBadge}${logoHtml}
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>فاتورة شراء</p>
                ${companyData.phone ? `<p>📞 ${companyData.phone}</p>` : ''}
            </div>
            <div class="inv-info">
                <div><span class="lbl">رقم:</span> #${inv.number}</div>
                <div><span class="lbl">التاريخ:</span> ${inv.date}</div>
                <div><span class="lbl">المورد:</span> ${inv.supplierName}</div>
                <div><span class="lbl">الدفع:</span> ${inv.status === 'paid' ? '✅ نقدي' : '⏳ آجل'}</div>
            </div>
            <table><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="inv-totals">
                <div class="inv-total-row"><span>المجموع:</span><span>${formatMoney(subtotal)} ج.م</span></div>
                ${isTax ? `<div class="inv-total-row"><span>الضريبة:</span><span style="color:#9B59B6;">${formatMoney(vatTotal)} ج.م</span></div>` : ''}
                <div class="inv-total-row grand"><span>الإجمالي:</span><span>${formatMoney(inv.total)} 🇪🇬</span></div>
            </div>
            <div class="inv-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

function deletePurchase(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const inv = purchases.find(p => p.id === id); if (!inv) return;
    if (!confirm(`⚠️ حذف فاتورة الشراء #${inv.number}؟`)) return;
    inv.items.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) p.qty -= it.qty;
    });
    treasury = treasury.filter(t => !((t.refType === 'purchase' || t.refType === 'purchase_credit') && t.refId === id));
    purchases = purchases.filter(p => p.id !== id);
    setData('products', products); setData('purchases', purchases); setData('treasury', treasury);
    addAuditLog('delete', 'purchase', `حذف فاتورة شراء #${inv.number}`);
    renderPurchases(); renderProducts(); updateDashboard();
    showToast(`🗑️ تم الحذف`, 'info');
}

// ============================================================
// المرتجعات
// ============================================================
function toggleReturnCustomer() {
    const typeEl = $('retType');
    if (!typeEl) return;
    const type = typeEl.value;
    if ($('retPartyLabel')) $('retPartyLabel').textContent = type === 'sale' ? 'العميل' : 'المورد';
    if (type === 'sale') populateRetCustomers();
    else populateRetSuppliers();
}

function populateRetCustomers() {
    const sel = $('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر عميل...</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
}

function populateRetSuppliers() {
    const sel = $('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.name}">${s.name}</option>`);
}

function populateRetProducts() {
    const sel = $('retProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    sel.value = cv;
}

function updateRetPrice() {
    const id = $('retProduct').value;
    const typeEl = $('retType');
    const type = typeEl ? typeEl.value : 'sale';
    if (!id) { $('retPrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('retPrice').value = type === 'sale' ? p.sell : p.buy;
}

function addRetItem() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('retProduct').value;
    const qty = parseInt($('retQty').value) || 0;
    const price = parseFloat($('retPrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const typeEl = $('retType');
    const type = typeEl ? typeEl.value : 'sale';
    if (type === 'purchase' && qty > p.qty) { showToast(`⚠️ الكمية المتاحة: ${p.qty}`, 'error'); return; }
    const ex = currentRetItems.find(i => i.productId == id);
    if (ex) { ex.qty += qty; ex.total = ex.qty * ex.price; }
    else currentRetItems.push({ productId: p.id, name: p.name, qty, price, costPrice: p.buy, total: qty * price });
    $('retQty').value = 1; $('retPrice').value = ''; $('retProduct').value = '';
    renderRetItems(); showToast('✅ تم الإضافة', 'success');
}

function removeRetItem(i) { currentRetItems.splice(i, 1); renderRetItems(); }

function renderRetItems() {
    const c = $('retItemsContainer'), tb = $('retTotalBox'), te = $('retTotal');
    if (!c) return;
    if (currentRetItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    const total = currentRetItems.reduce((s, i) => s + i.total, 0);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentRetItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#E6A830;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removeRetItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' 🇪🇬';
}

function saveReturn() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentRetItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    const typeEl = $('retType');
    const type = typeEl ? typeEl.value : 'sale';
    const party = $('retParty').value;
    if (!party) { showToast('⚠️ اختر العميل/المورد', 'error'); return; }
    const total = currentRetItems.reduce((s, i) => s + i.total, 0);
    const today = getTodayDate(); const now = new Date();
    currentRetItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) { if (type === 'sale') p.qty += it.qty; else p.qty -= it.qty; }
    });
    const ret = {
        id: Date.now(), number: returns.length + 1, type, party,
        paymentMethod: 'cash',
        items: JSON.parse(JSON.stringify(currentRetItems)), total, date: today,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    returns.push(ret);
    if (type === 'sale') {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: total,
            note: `مرتجع بيع - #${ret.number} - ${party}`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'return', refId: ret.id
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: `مرتجع شراء - #${ret.number} - ${party}`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'return', refId: ret.id
        });
    }
    setData('products', products); setData('returns', returns); setData('treasury', treasury);
    addAuditLog('add', 'return', `مرتجع ${type === 'sale' ? 'بيع' : 'شراء'} #${ret.number} - ${party} - ${formatMoney(total)} ج.م`);
    currentRetItems = [];
    const partyEl = $('retParty'); if (partyEl) partyEl.value = '';
    renderRetItems(); renderReturns(); populateRetProducts(); updateDashboard();
    showToast(`✅ مرتجع #${ret.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
}

function clearReturn() {
    if (currentRetItems.length === 0) return;
    if (!confirm('⚠️ إلغاء المرتجع؟')) return;
    currentRetItems = [];
    const partyEl = $('retParty'); if (partyEl) partyEl.value = '';
    renderRetItems(); showToast('🗑️ تم الإلغاء', 'info');
}

function renderReturns() {
    const tc = returns.length;
    const ta = returns.reduce((s, i) => s + (i.total || 0), 0);
    if ($('retTotalCount')) $('retTotalCount').textContent = tc;
    if ($('retTotalAmount')) $('retTotalAmount').textContent = formatMoney(ta);
    const c = $('returnsList'); if (!c) return;
    if (returns.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`; return;
    }
    const sorted = [...returns].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1fr 1.2fr 1fr 1fr 0.8fr;"><span>#</span><span>النوع</span><span>العميل/المورد</span><span>المبلغ</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(r => {
        const tt = r.type === 'sale' ? '🔄 مرتجع بيع' : '🔄 مرتجع شراء';
        const tc2 = r.type === 'sale' ? '#E6A830' : '#E06060';
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1fr 1.2fr 1fr 1fr 0.8fr;">
            <span>#${r.number}</span>
            <span style="color:${tc2};font-weight:700;font-size:10px;">${tt}</span>
            <span>${r.party}</span>
            <span style="color:#E6A830;font-weight:700;">${formatMoney(r.total)}</span>
            <span style="font-size:10px;color:#A89070;">${r.date}</span>
            ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteReturn(${r.id})"><i class="fas fa-trash"></i></button>` : '<span></span>'}
        </div>`;
    });
    c.innerHTML = html;
}

function deleteReturn(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const r = returns.find(x => x.id === id); if (!r) return;
    if (!confirm(`⚠️ حذف المرتجع #${r.number}؟`)) return;
    r.items.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) { if (r.type === 'sale') p.qty -= it.qty; else p.qty += it.qty; }
    });
    treasury = treasury.filter(t => !(t.refType === 'return' && t.refId === id));
    returns = returns.filter(x => x.id !== id);
    setData('products', products); setData('returns', returns); setData('treasury', treasury);
    addAuditLog('delete', 'return', `حذف مرتجع #${r.number}`);
    renderReturns(); renderProducts(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// المصروفات
// ============================================================
function saveExpense() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const note = $('expNote').value.trim();
    const amount = parseFloat($('expAmount').value) || 0;
    const category = $('expCategory').value;
    const date = $('expDate').value || getTodayDate();
    if (!note) { showToast('⚠️ أدخل البيان', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    if (getTreasuryBalance() < amount) { showToast('⚠️ رصيد الخزنة غير كافي', 'error'); return; }
    const now = new Date();
    const exp = { id: Date.now(), note, amount, category, date,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown' };
    expenses.push(exp);
    treasury.push({
        id: Date.now() + 1, type: 'withdraw', amount,
        note: `مصروف (${category}) - ${note}`,
        date, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        refType: 'expense', refId: exp.id
    });
    setData('expenses', expenses); setData('treasury', treasury);
    addAuditLog('add', 'expense', `مصروف: ${note} - ${formatMoney(amount)} ج.م`);
    $('expNote').value = ''; $('expAmount').value = '';
    renderExpenses(); updateDashboard();
    showToast(`✅ تم الإضافة ${formatMoney(amount)} 🇪🇬`, 'success');
}

function renderExpenses() {
    const tc = expenses.length;
    const ta = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const today = getTodayDate();
    const tda = expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0);
    const month = today.substring(0, 7);
    const ma = expenses.filter(e => (e.date || '').startsWith(month)).reduce((s, e) => s + (e.amount || 0), 0);
    if ($('expTotalCount')) $('expTotalCount').textContent = tc;
    if ($('expTotalAmount')) $('expTotalAmount').textContent = formatMoney(ta);
    if ($('expTodayAmount')) $('expTodayAmount').textContent = formatMoney(tda);
    if ($('expMonthAmount')) $('expMonthAmount').textContent = formatMoney(ma);
    const c = $('expensesList'); if (!c) return;
    if (expenses.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-money-bill-wave"></i><span>لا توجد مصروفات</span></div>`; return;
    }
    const sorted = [...expenses].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>التصنيف</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(e => {
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.6fr;">
            <span>${e.note}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(e.amount)}</span>
            <span style="font-size:11px;color:#A89070;">${e.category || 'عام'}</span>
            <span style="font-size:10px;color:#A89070;">${e.date}</span>
            ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button>` : '<span></span>'}
        </div>`;
    });
    c.innerHTML = html;
}

function deleteExpense(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const e = expenses.find(x => x.id === id); if (!e) return;
    if (!confirm('⚠️ حذف هذا المصروف؟')) return;
    treasury = treasury.filter(t => !(t.refType === 'expense' && t.refId === id));
    expenses = expenses.filter(x => x.id !== id);
    setData('expenses', expenses); setData('treasury', treasury);
    addAuditLog('delete', 'expense', `حذف مصروف: ${e.note}`);
    renderExpenses(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// الفواتير
// ============================================================
function renderInvoices() {
    const c = $('invoiceList'); if (!c) return;
    const tc = sales.length;
    const ta = sales.reduce((s, i) => s + (i.total || 0), 0);
    const today = getTodayDate();
    const tda = sales.filter(i => i.date === today).reduce((s, i) => s + (i.total || 0), 0);
    if ($('invTotalCount')) $('invTotalCount').textContent = tc;
    if ($('invTotalAmount')) $('invTotalAmount').textContent = formatMoney(ta);
    if ($('invTodayAmount')) $('invTodayAmount').textContent = formatMoney(tda);
    const search = ($('invoiceSearch')?.value || '').trim().toLowerCase();
    let filtered = sales;
    if (search) filtered = sales.filter(i => String(i.number).includes(search) || (i.customer && i.customer.toLowerCase().includes(search)));
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>${search ? 'لا توجد نتائج' : 'لا توجد فواتير'}</span></div>`; return;
    }
    const sorted = [...filtered].sort((a, b) => b.id - a.id);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.7fr 1fr 1.2fr;"><span>#</span><span>العميل</span><span>المبلغ</span><span>النوع</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(inv => {
        const pm = inv.paymentMethod || 'cash';
        const badge = pm === 'cash' ? '💵' : '⏳';
        const isTax = inv.invoiceType === 'tax';
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.7fr 1fr 1.2fr;">
            <span>#${inv.number}</span>
            <span>${inv.customer} <small style="color:#A89070;">${badge}</small></span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(inv.total)}</span>
            <span style="color:${isTax ? '#9B59B6' : '#5D5D5D'};font-size:10px;font-weight:700;">${isTax ? '🧾' : '📋'}</span>
            <span style="font-size:10px;color:#A89070;">${inv.date}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="viewInvoice(${inv.id})"><i class="fas fa-eye"></i></button>
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteInvoice(${inv.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function viewInvoice(id) {
    const inv = sales.find(s => s.id === id); if (!inv) return;
    let itemsHtml = '';
    inv.items.forEach((it, i) => {
        itemsHtml += `<tr><td>${i + 1}</td><td>${it.name}</td><td>${it.qty}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.total)}</td></tr>`;
    });
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="inv-logo" alt="logo">` : '';
    const pm = inv.paymentMethod || 'cash';
    const isTax = inv.invoiceType === 'tax';
    const taxBadge = isTax ? `<span class="tax-badge">🧾 فاتورة ضريبية</span>` : '';
    const subtotal = inv.subtotal !== undefined ? inv.subtotal : inv.total;
    const vatTotal = inv.vatTotal || 0;
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📄 فاتورة #${inv.number}</h3>
        <div class="invoice-print ${isTax ? 'tax-invoice' : ''}">
            <div class="inv-header">${taxBadge}${logoHtml}
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>فاتورة بيع</p>
                ${companyData.phone ? `<p>📞 ${companyData.phone}</p>` : ''}
            </div>
            <div class="inv-info">
                <div><span class="lbl">رقم:</span> #${inv.number}</div>
                <div><span class="lbl">التاريخ:</span> ${inv.date}</div>
                <div><span class="lbl">العميل:</span> ${inv.customer}</div>
                <div><span class="lbl">الدفع:</span> ${pm === 'cash' ? '💵 نقدي' : '⏳ آجل'}</div>
            </div>
            <table><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="inv-totals">
                <div class="inv-total-row"><span>المجموع:</span><span>${formatMoney(subtotal)} ج.م</span></div>
                ${isTax ? `<div class="inv-total-row"><span>الضريبة:</span><span style="color:#9B59B6;">${formatMoney(vatTotal)} ج.م</span></div>` : ''}
                <div class="inv-total-row grand"><span>الإجمالي:</span><span>${formatMoney(inv.total)} 🇪🇬</span></div>
            </div>
            <div class="inv-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

function deleteInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const inv = sales.find(s => s.id === id); if (!inv) return;
    if (!confirm(`⚠️ حذف الفاتورة #${inv.number}؟`)) return;
    inv.items.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) p.qty += it.qty;
    });
    treasury = treasury.filter(t => !((t.refType === 'sale' || t.refType === 'sale_credit') && t.refId === id));
    sales = sales.filter(s => s.id !== id);
    setData('products', products); setData('sales', sales); setData('treasury', treasury);
    addAuditLog('delete', 'sale', `حذف فاتورة بيع #${inv.number}`);
    renderInvoices(); renderProducts(); updateDashboard();
    showToast(`🗑️ تم الحذف`, 'info');
}

// ============================================================
// الخزنة
// ============================================================
function getTreasuryBalance() {
    return treasury.reduce((sum, t) => t.type === 'deposit' ? sum + (t.amount || 0) : sum - (t.amount || 0), 0);
}

function addTreasuryTransaction() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const typeEl = $('treasuryType');
    const type = typeEl ? typeEl.value : 'deposit';
    const amount = parseFloat($('treasuryAmount').value) || 0;
    const note = $('treasuryNote').value.trim() || (type === 'deposit' ? 'إيداع' : 'سحب');
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    if (type === 'withdraw' && getTreasuryBalance() < amount) { showToast('⚠️ رصيد الخزنة غير كافي', 'error'); return; }
    const now = new Date();
    treasury.push({ id: Date.now(), type, amount, note,
        date: getTodayDate(),
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        refType: 'manual',
        createdBy: currentUser ? currentUser.name : 'unknown' });
    setData('treasury', treasury);
    addAuditLog('add', 'treasury', `${type === 'deposit' ? 'إيداع' : 'سحب'} ${formatMoney(amount)} ج.م - ${note}`);
    $('treasuryAmount').value = ''; $('treasuryNote').value = '';
    renderTreasury(); updateDashboard();
    showToast(type === 'deposit' ? `✅ إيداع ${formatMoney(amount)}` : `✅ سحب ${formatMoney(amount)}`, 'success');
}

function renderTreasury() {
    const balance = getTreasuryBalance();
    if ($('treasuryBalance')) $('treasuryBalance').textContent = formatMoney(balance) + ' 🇪🇬';
    const dep = treasury.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.amount || 0), 0);
    const wit = treasury.filter(t => t.type === 'withdraw').reduce((s, t) => s + (t.amount || 0), 0);
    if ($('treasuryDeposits')) $('treasuryDeposits').textContent = formatMoney(dep);
    if ($('treasuryWithdrawals')) $('treasuryWithdrawals').textContent = formatMoney(wit);
    const c = $('treasuryList'); if (!c) return;
    if (treasury.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-vault"></i><span>لا توجد حركات</span></div>`; return;
    }
    const visibleTreasury = treasury.filter(t => t.amount > 0);
    const sorted = [...visibleTreasury].sort((a, b) => b.id - a.id).slice(0, 50);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>البيان</span><span>المبلغ</span><span>النوع</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(t => {
        const isDep = t.type === 'deposit';
        const color = isDep ? '#2D8F5E' : '#E06060';
        const sign = isDep ? '+' : '-';
        const canDel = t.refType === 'manual' && canDelete();
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;">
            <span style="font-size:11px;">${t.note}</span>
            <span style="color:${color};font-weight:700;">${sign}${formatMoney(t.amount)}</span>
            <span style="color:${color};font-size:10px;font-weight:700;">${isDep ? '💚 إيداع' : '❤️ سحب'}</span>
            <span style="font-size:10px;color:#A89070;">${t.date}<br>${t.time || ''}</span>
            ${canDel ? `<button class="btn btn-danger btn-sm" onclick="deleteTreasury(${t.id})"><i class="fas fa-trash"></i></button>` : '<span style="font-size:10px;color:#5D5D5D;">🔗</span>'}
        </div>`;
    });
    c.innerHTML = html;
}

function deleteTreasury(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const t = treasury.find(tr => tr.id === id); if (!t) return;
    if (t.refType !== 'manual') { showToast('⚠️ مرتبطة بفاتورة', 'warning'); return; }
    if (!confirm('⚠️ حذف الحركة؟')) return;
    treasury = treasury.filter(tr => tr.id !== id);
    setData('treasury', treasury);
    addAuditLog('delete', 'treasury', `حذف حركة خزنة: ${t.note}`);
    renderTreasury(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// لوحة التحكم
// ============================================================
function updateDashboard() {
    const totalSales = sales.reduce((s, i) => s + (i.total || 0), 0);
    const totalPurchases = purchases.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpenses = expenses.reduce((s, i) => s + (i.amount || 0), 0);
    const totalReturns = returns.reduce((s, i) => s + (i.total || 0), 0);
    const cogs = getCOGS(sales);
    const returnsCOGS = getReturnsCOGS(returns);
    const returnsPurchase = returns.filter(r => r.type === 'purchase').reduce((s, r) => s + (r.total || 0), 0);
    const profit = totalSales - cogs - totalExpenses + returnsPurchase - returnsCOGS;
    
    if ($('dashSales')) $('dashSales').textContent = formatMoney(totalSales);
    if ($('dashPurchases')) $('dashPurchases').textContent = formatMoney(totalPurchases);
    if ($('dashExpenses')) $('dashExpenses').textContent = formatMoney(totalExpenses);
    if ($('dashReturns')) $('dashReturns').textContent = formatMoney(totalReturns);
    if ($('dashProfit')) {
        $('dashProfit').textContent = formatMoney(profit);
        $('dashProfit').style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
    }
    if ($('dashTreasury')) $('dashTreasury').textContent = formatMoney(getTreasuryBalance());
    if ($('dashProducts')) $('dashProducts').textContent = products.length;
    const totalQty = products.reduce((s, p) => s + (p.qty || 0), 0);
    if ($('dashInventory')) $('dashInventory').textContent = totalQty;

    let totalCustomerDebt = 0;
    customers.forEach(c => { totalCustomerDebt += getCustomerBalance(c.name); });
    if ($('dashCustomerDebt')) $('dashCustomerDebt').textContent = formatMoney(totalCustomerDebt);

    let totalSupplierDebt = 0;
    suppliers.forEach(s => { totalSupplierDebt += getSupplierBalance(s.name); });
    if ($('dashSupplierDebt')) $('dashSupplierDebt').textContent = formatMoney(totalSupplierDebt);

    const vatStats = calculateVATStats();
    if ($('dashVATSales')) $('dashVATSales').textContent = formatMoney(vatStats.salesVAT);
    if ($('dashVATDue')) $('dashVATDue').textContent = formatMoney(vatStats.vatDue);

    renderMiniChart();

    const container = $('dashLastSales');
    if (!container) return;
    if (sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد مبيعات</span></div>`;
        return;
    }
    const last5 = [...sales].sort((a, b) => b.id - a.id).slice(0, 5);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.5fr 1fr 1fr;"><span>#</span><span>العميل</span><span>المبلغ</span><span>التاريخ</span></div>`;
    last5.forEach(inv => {
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.5fr 1fr 1fr;">
            <span>#${inv.number}</span><span>${inv.customer}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(inv.total)}</span>
            <span style="font-size:11px;color:#A89070;">${inv.date}</span>
        </div>`;
    });
    container.innerHTML = html;
}

function calculateVATStats(dateFilter = null) {
    let salesVAT = 0, purchasesVAT = 0;
    const filterFn = (item) => !dateFilter || (item.date || '').startsWith(dateFilter);
    sales.forEach(s => { if (s.invoiceType === 'tax' && filterFn(s)) salesVAT += (s.vatTotal || 0); });
    purchases.forEach(p => { if (p.invoiceType === 'tax' && filterFn(p)) purchasesVAT += (p.vatTotal || 0); });
    return { salesVAT, purchasesVAT, vatDue: salesVAT - purchasesVAT };
}

function getCOGS(salesArr) {
    let totalCOGS = 0;
    (salesArr || []).forEach(inv => {
        (inv.items || []).forEach(item => {
            const p = products.find(pr => pr.id == item.productId);
            const costPrice = (item.costPrice !== undefined && item.costPrice > 0) ? item.costPrice : (p ? p.buy : 0);
            totalCOGS += costPrice * (item.qty || 0);
        });
    });
    return totalCOGS;
}

function getReturnsCOGS(returnsArr) {
    let total = 0;
    (returnsArr || []).forEach(ret => {
        if (ret.type !== 'sale') return;
        (ret.items || []).forEach(item => {
            const p = products.find(pr => pr.id == item.productId);
            const costPrice = (item.costPrice !== undefined && item.costPrice > 0) ? item.costPrice : (p ? p.buy : 0);
            total += costPrice * (item.qty || 0);
        });
    });
    return total;
}

function renderMiniChart() {
    const container = $('miniChart'); if (!container) return;
    const days = [];
    const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySales = sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.total || 0), 0);
        days.push({ date: dateStr, label: dayNames[d.getDay()], total: daySales });
    }
    const maxVal = Math.max(...days.map(d => d.total), 1);
    container.innerHTML = days.map(d => {
        const h = Math.max((d.total / maxVal) * 80, 4);
        return `<div class="bar-wrap">
            <div class="bar" style="height:${h}px;">
                ${d.total > 0 ? `<span class="bar-value">${d.total.toFixed(0)}</span>` : ''}
            </div>
            <div class="bar-label">${d.label}</div>
        </div>`;
    }).join('');
}

function getCustomerBalance(customerName) {
    if (!customerName || customerName === 'عميل نقدي') return 0;
    const creditSales = sales.filter(s => s.customer === customerName && s.paymentMethod === 'credit').reduce((sum, s) => sum + (s.total || 0), 0);
    const creditReturns = returns.filter(r => r.type === 'sale' && r.party === customerName).reduce((sum, r) => sum + (r.total || 0), 0);
    const collected = payments.filter(p => p.type === 'collect' && p.party === customerName).reduce((sum, p) => sum + (p.amount || 0), 0);
    return Math.max(0, creditSales - creditReturns - collected);
}

function getSupplierBalance(supplierName) {
    if (!supplierName) return 0;
    const creditPurchases = purchases.filter(p => p.supplierName === supplierName && p.payment === 'credit').reduce((sum, p) => sum + (p.total || 0), 0);
    const creditReturns = returns.filter(r => r.type === 'purchase' && r.party === supplierName).reduce((sum, r) => sum + (r.total || 0), 0);
    const paid = payments.filter(p => p.type === 'pay' && p.party === supplierName).reduce((sum, p) => sum + (p.amount || 0), 0);
    return Math.max(0, creditPurchases - creditReturns - paid);
}

// ============================================================
// العملاء
// ============================================================
function saveCustomer() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('customerId').value;
    const name = $('customerName').value.trim();
    const phone = $('customerPhone').value.trim();
    const whatsapp = $('customerWhatsapp').value.trim();
    const address = $('customerAddress').value.trim();
    if (!name) { showToast('⚠️ أدخل اسم العميل', 'error'); return; }
    if (id) {
        if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
        const idx = customers.findIndex(c => c.id == id);
        if (idx > -1) {
            customers[idx] = { ...customers[idx], name, phone, whatsapp, address };
            addAuditLog('edit', 'customer', `تعديل عميل: ${name}`);
            showToast('✅ تم تعديل العميل', 'success');
        }
    } else {
        if (customers.find(c => c.name === name)) { showToast('⚠️ العميل موجود', 'warning'); return; }
        customers.push({ id: Date.now(), name, phone, whatsapp, address, createdAt: new Date().toISOString() });
        addAuditLog('add', 'customer', `إضافة عميل: ${name}`);
        showToast('✅ تم إضافة العميل', 'success');
    }
    setData('customers', customers);
    resetCustomerForm(); renderCustomers();
    populateSaleCustomers(); populateRetCustomers(); populateCollectCustomers();
}

function editCustomer(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const c = customers.find(cu => cu.id == id); if (!c) return;
    $('customerId').value = c.id; $('customerName').value = c.name;
    $('customerPhone').value = c.phone || '';
    $('customerWhatsapp').value = c.whatsapp || '';
    $('customerAddress').value = c.address || '';
    $('customerFormTitle').textContent = '✏️ تعديل العميل';
    $('customerSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteCustomer(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const c = customers.find(cu => cu.id == id); if (!c) return;
    const balance = getCustomerBalance(c.name);
    if (balance > 0) {
        if (!confirm(`⚠️ العميل عليه مديونية ${formatMoney(balance)} 🇪🇬. متابعة الحذف؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف العميل "${c.name}"؟`)) return;
    }
    customers = customers.filter(cu => cu.id != id);
    setData('customers', customers);
    addAuditLog('delete', 'customer', `حذف عميل: ${c.name}`);
    renderCustomers(); populateSaleCustomers(); populateRetCustomers(); populateCollectCustomers();
    showToast('🗑️ تم حذف العميل', 'info');
}

function resetCustomerForm() {
    $('customerId').value = ''; $('customerName').value = '';
    $('customerPhone').value = ''; $('customerWhatsapp').value = '';
    $('customerAddress').value = '';
    $('customerFormTitle').textContent = '➕ إضافة عميل';
    $('customerSaveBtnText').textContent = 'إضافة';
}

function renderCustomers() {
    const c = $('customerList'); if (!c) return;
    const search = ($('customerSearch')?.value || '').trim().toLowerCase();
    let filtered = customers;
    if (search) filtered = customers.filter(cu =>
        cu.name.toLowerCase().includes(search) ||
        (cu.phone && cu.phone.includes(search)) ||
        (cu.whatsapp && cu.whatsapp.includes(search))
    );
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>${search ? 'لا توجد نتائج' : 'لا يوجد عملاء'}</span></div>`;
        return;
    }
    const showActions = canEdit() || canDelete() || canAdd();
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.5fr' : '0'};"><span>الاسم</span><span>الهاتف</span><span>المديونية</span>${showActions ? '<span></span>' : ''}</div>`;
    filtered.forEach(cu => {
        const balance = getCustomerBalance(cu.name);
        const bcolor = balance > 0 ? '#E06060' : '#2D8F5E';
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.5fr' : '0'};">
            <span><strong>${cu.name}</strong>${cu.whatsapp ? `<br><small style="color:#25D366;font-size:10px;">📱 ${cu.whatsapp}</small>` : ''}</span>
            <span style="font-size:11px;">${cu.phone || '-'}</span>
            <span style="color:${bcolor};font-weight:900;">${formatMoney(balance)}</span>
            ${showActions ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${balance > 0 && canAdd() ? `<button class="btn btn-success btn-sm" onclick="openCollectModal('${cu.name}')"><i class="fas fa-hand-holding-usd"></i></button>` : ''}
                <button class="btn btn-info btn-sm" onclick="viewCustomerStatement('${cu.name}')"><i class="fas fa-file-invoice-dollar"></i></button>
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editCustomer(${cu.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteCustomer(${cu.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
        </div>`;
    });
    c.innerHTML = html;
}

function openCollectModal(customerName) {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    navigateTo('payments');
    setTimeout(() => {
        switchPayTab('collect', document.querySelectorAll('.tab-btn')[0]);
        const sel = $('collectCustomer');
        if (sel) { sel.value = customerName; updateCollectInfo(); }
        const amtEl = $('collectAmount'); if (amtEl) amtEl.focus();
    }, 200);
}

function viewCustomerStatement(customerName) {
    const custSales = sales.filter(s => s.customer === customerName);
    const custReturns = returns.filter(r => r.type === 'sale' && r.party === customerName);
    const custPayments = payments.filter(p => p.type === 'collect' && p.party === customerName);
    const balance = getCustomerBalance(customerName);
    const allOps = [
        ...custSales.map(s => ({ date: s.date, time: s.time, type: 'sale', desc: `فاتورة #${s.number} (${s.paymentMethod === 'credit' ? 'آجل' : 'نقدي'})`, amount: s.total })),
        ...custReturns.map(r => ({ date: r.date, time: r.time, type: 'return', desc: `مرتجع #${r.number}`, amount: -r.total })),
        ...custPayments.map(p => ({ date: p.date, time: p.time, type: 'collect', desc: `تحصيل${p.note ? ' - ' + p.note : ''}`, amount: -p.amount }))
    ].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    let rowsHtml = '';
    if (allOps.length === 0) {
        rowsHtml = `<tr><td colspan="3" style="text-align:center;color:#A89070;padding:12px;">لا توجد حركات</td></tr>`;
    } else {
        allOps.forEach(op => {
            const color = op.amount > 0 ? '#E06060' : '#2D8F5E';
            const sign = op.amount > 0 ? '+' : '';
            const icon = op.type === 'sale' ? '💰' : op.type === 'return' ? '🔄' : '✅';
            rowsHtml += `<tr>
                <td style="font-size:10px;">${op.date}<br>${op.time || ''}</td>
                <td style="font-size:11px;">${icon} ${op.desc}</td>
                <td style="color:${color};font-weight:700;font-size:11px;">${sign}${formatMoney(Math.abs(op.amount))}</td>
            </tr>`;
        });
    }
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📋 كشف حساب: ${customerName}</h3>
        <div class="invoice-print">
            <div class="inv-header"><h2>${companyData.name || 'الميزان'}</h2><p>كشف حساب عميل</p></div>
            <div class="inv-info">
                <div><span class="lbl">العميل:</span> ${customerName}</div>
                <div><span class="lbl">التاريخ:</span> ${getTodayDate()}</div>
                <div style="grid-column: 1 / -1; text-align:center; margin-top:8px;">
                    <span class="lbl">الرصيد الحالي:</span>
                    <span style="color:${balance > 0 ? '#E06060' : '#2D8F5E'};font-weight:900;font-size:18px;">${formatMoney(balance)} 🇪🇬</span>
                </div>
            </div>
            <table style="margin-top:10px;"><thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

// ============================================================
// الموردين
// ============================================================
function saveSupplier() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('supplierId').value;
    const name = $('supplierName').value.trim();
    const phone = $('supplierPhone').value.trim();
    const whatsapp = $('supplierWhatsapp').value.trim();
    const address = $('supplierAddress').value.trim();
    if (!name) { showToast('⚠️ أدخل اسم المورد', 'error'); return; }
    if (id) {
        if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
        const idx = suppliers.findIndex(s => s.id == id);
        if (idx > -1) {
            suppliers[idx] = { ...suppliers[idx], name, phone, whatsapp, address };
            addAuditLog('edit', 'supplier', `تعديل مورد: ${name}`);
            showToast('✅ تم تعديل المورد', 'success');
        }
    } else {
        if (suppliers.find(s => s.name === name)) { showToast('⚠️ المورد موجود', 'warning'); return; }
        suppliers.push({ id: Date.now(), name, phone, whatsapp, address, createdAt: new Date().toISOString() });
        addAuditLog('add', 'supplier', `إضافة مورد: ${name}`);
        showToast('✅ تم إضافة المورد', 'success');
    }
    setData('suppliers', suppliers);
    resetSupplierForm(); renderSuppliers();
    populatePurSuppliers(); populateRetSuppliers(); populatePaySuppliers();
}

function editSupplier(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const s = suppliers.find(su => su.id == id); if (!s) return;
    $('supplierId').value = s.id; $('supplierName').value = s.name;
    $('supplierPhone').value = s.phone || '';
    $('supplierWhatsapp').value = s.whatsapp || '';
    $('supplierAddress').value = s.address || '';
    $('supplierFormTitle').textContent = '✏️ تعديل المورد';
    $('supplierSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteSupplier(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const s = suppliers.find(su => su.id == id); if (!s) return;
    const balance = getSupplierBalance(s.name);
    if (balance > 0) {
        if (!confirm(`⚠️ عليك للمورد ${formatMoney(balance)} 🇪🇬. متابعة الحذف؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف المورد "${s.name}"؟`)) return;
    }
    suppliers = suppliers.filter(su => su.id != id);
    setData('suppliers', suppliers);
    addAuditLog('delete', 'supplier', `حذف مورد: ${s.name}`);
    renderSuppliers(); populatePurSuppliers(); populateRetSuppliers(); populatePaySuppliers();
    showToast('🗑️ تم حذف المورد', 'info');
}

function resetSupplierForm() {
    $('supplierId').value = ''; $('supplierName').value = '';
    $('supplierPhone').value = ''; $('supplierWhatsapp').value = '';
    $('supplierAddress').value = '';
    $('supplierFormTitle').textContent = '➕ إضافة مورد';
    $('supplierSaveBtnText').textContent = 'إضافة';
}

function renderSuppliers() {
    const c = $('supplierList'); if (!c) return;
    const search = ($('supplierSearch')?.value || '').trim().toLowerCase();
    let filtered = suppliers;
    if (search) filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search) ||
        (s.phone && s.phone.includes(search))
    );
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><span>${search ? 'لا توجد نتائج' : 'لا يوجد موردين'}</span></div>`;
        return;
    }
    const showActions = canEdit() || canDelete() || canAdd();
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.5fr' : '0'};"><span>الاسم</span><span>الهاتف</span><span>المديونية</span>${showActions ? '<span></span>' : ''}</div>`;
    filtered.forEach(s => {
        const balance = getSupplierBalance(s.name);
        const bcolor = balance > 0 ? '#E6A830' : '#2D8F5E';
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.5fr' : '0'};">
            <span><strong>${s.name}</strong>${s.whatsapp ? `<br><small style="color:#25D366;font-size:10px;">📱 ${s.whatsapp}</small>` : ''}</span>
            <span style="font-size:11px;">${s.phone || '-'}</span>
            <span style="color:${bcolor};font-weight:900;">${formatMoney(balance)}</span>
            ${showActions ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${balance > 0 && canAdd() ? `<button class="btn btn-danger btn-sm" onclick="openPayModal('${s.name}')"><i class="fas fa-money-bill-wave"></i></button>` : ''}
                <button class="btn btn-info btn-sm" onclick="viewSupplierStatement('${s.name}')"><i class="fas fa-file-invoice"></i></button>
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editSupplier(${s.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
        </div>`;
    });
    c.innerHTML = html;
}

function openPayModal(supplierName) {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    navigateTo('payments');
    setTimeout(() => {
        switchPayTab('pay', document.querySelectorAll('.tab-btn')[1]);
        const sel = $('paySupplier');
        if (sel) { sel.value = supplierName; updatePayInfo(); }
        const amtEl = $('payAmount'); if (amtEl) amtEl.focus();
    }, 200);
}

function viewSupplierStatement(supplierName) {
    const supPurchases = purchases.filter(p => p.supplierName === supplierName);
    const supReturns = returns.filter(r => r.type === 'purchase' && r.party === supplierName);
    const supPayments = payments.filter(p => p.type === 'pay' && p.party === supplierName);
    const balance = getSupplierBalance(supplierName);
    const allOps = [
        ...supPurchases.map(p => ({ date: p.date, time: p.time, type: 'purchase', desc: `فاتورة شراء #${p.number} (${p.payment === 'credit' ? 'آجل' : 'نقدي'})`, amount: p.total })),
        ...supReturns.map(r => ({ date: r.date, time: r.time, type: 'return', desc: `مرتجع شراء #${r.number}`, amount: -r.total })),
        ...supPayments.map(p => ({ date: p.date, time: p.time, type: 'pay', desc: `سداد${p.note ? ' - ' + p.note : ''}`, amount: -p.amount }))
    ].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    let rowsHtml = '';
    if (allOps.length === 0) {
        rowsHtml = `<tr><td colspan="3" style="text-align:center;color:#A89070;padding:12px;">لا توجد حركات</td></tr>`;
    } else {
        allOps.forEach(op => {
            const color = op.amount > 0 ? '#E6A830' : '#2D8F5E';
            const sign = op.amount > 0 ? '+' : '';
            const icon = op.type === 'purchase' ? '🛒' : op.type === 'return' ? '🔄' : '✅';
            rowsHtml += `<tr>
                <td style="font-size:10px;">${op.date}<br>${op.time || ''}</td>
                <td style="font-size:11px;">${icon} ${op.desc}</td>
                <td style="color:${color};font-weight:700;font-size:11px;">${sign}${formatMoney(Math.abs(op.amount))}</td>
            </tr>`;
        });
    }
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📋 كشف حساب: ${supplierName}</h3>
        <div class="invoice-print">
            <div class="inv-header"><h2>${companyData.name || 'الميزان'}</h2><p>كشف حساب مورد</p></div>
            <div class="inv-info">
                <div><span class="lbl">المورد:</span> ${supplierName}</div>
                <div><span class="lbl">التاريخ:</span> ${getTodayDate()}</div>
                <div style="grid-column: 1 / -1; text-align:center; margin-top:8px;">
                    <span class="lbl">الرصيد الحالي:</span>
                    <span style="color:${balance > 0 ? '#E6A830' : '#2D8F5E'};font-weight:900;font-size:18px;">${formatMoney(balance)} 🇪🇬</span>
                </div>
            </div>
            <table style="margin-top:10px;"><thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

// ============================================================
// التحصيل والسداد
// ============================================================
function populateCollectCustomers() {
    const sel = $('collectCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر عميل...</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    sel.value = cv;
}

function populatePaySuppliers() {
    const sel = $('paySupplier'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.name}">${s.name}</option>`);
    sel.value = cv;
}

function switchPayTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const collect = $('payTabCollect');
    const pay = $('payTabPay');
    if (tab === 'collect') {
        if (collect) collect.style.display = 'block';
        if (pay) pay.style.display = 'none';
    } else {
        if (collect) collect.style.display = 'none';
        if (pay) pay.style.display = 'block';
    }
}

function updateCollectInfo() {
    const name = $('collectCustomer').value;
    const box = $('collectInfoBox');
    if (!box) return;
    if (!name) { box.style.display = 'none'; return; }
    const balance = getCustomerBalance(name);
    box.style.display = 'block';
    if ($('collectCurrentDebt')) $('collectCurrentDebt').textContent = formatMoney(balance);
    const amountInput = $('collectAmount');
    if (amountInput) {
        amountInput.max = balance;
        amountInput.value = balance > 0 ? balance.toFixed(2) : '';
    }
}

function updatePayInfo() {
    const name = $('paySupplier').value;
    const box = $('payInfoBox');
    if (!box) return;
    if (!name) { box.style.display = 'none'; return; }
    const balance = getSupplierBalance(name);
    box.style.display = 'block';
    if ($('payCurrentDebt')) $('payCurrentDebt').textContent = formatMoney(balance);
    const amountInput = $('payAmount');
    if (amountInput) {
        amountInput.max = balance;
        amountInput.value = balance > 0 ? balance.toFixed(2) : '';
    }
}

function saveCollect() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const party = $('collectCustomer').value;
    const amount = parseFloat($('collectAmount').value) || 0;
    const date = $('collectDate').value || getTodayDate();
    const note = $('collectNote').value.trim();
    if (!party) { showToast('⚠️ اختر العميل', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    const balance = getCustomerBalance(party);
    if (amount > balance) { showToast(`⚠️ المبلغ أكبر من المديونية (${formatMoney(balance)})`, 'error'); return; }
    const now = new Date();
    const pay = {
        id: Date.now(), type: 'collect', party, amount, date,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        note, createdAt: now.toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    payments.push(pay);
    treasury.push({
        id: Date.now() + 1, type: 'deposit', amount,
        note: `تحصيل من ${party}${note ? ' - ' + note : ''}`,
        date, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        refType: 'collect', refId: pay.id
    });
    setData('payments', payments); setData('treasury', treasury);
    addAuditLog('add', 'payment', `تحصيل من ${party} - ${formatMoney(amount)} ج.م`);
    $('collectAmount').value = ''; $('collectNote').value = '';
    $('collectCustomer').value = '';
    const box = $('collectInfoBox'); if (box) box.style.display = 'none';
    renderPayments(); renderTreasury(); renderCustomers(); updateDashboard();
    showToast(`✅ تم تحصيل ${formatMoney(amount)} 🇪🇬 من ${party}`, 'success');
    setTimeout(() => showReceipt(pay), 300);
}

function savePay() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const party = $('paySupplier').value;
    const amount = parseFloat($('payAmount').value) || 0;
    const date = $('payDate').value || getTodayDate();
    const note = $('payNote').value.trim();
    if (!party) { showToast('⚠️ اختر المورد', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    const balance = getSupplierBalance(party);
    if (amount > balance) { showToast(`⚠️ المبلغ أكبر من الالتزام (${formatMoney(balance)})`, 'error'); return; }
    if (getTreasuryBalance() < amount) { showToast('⚠️ رصيد الخزنة غير كافي', 'error'); return; }
    const now = new Date();
    const pay = {
        id: Date.now(), type: 'pay', party, amount, date,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        note, createdAt: now.toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    payments.push(pay);
    treasury.push({
        id: Date.now() + 1, type: 'withdraw', amount,
        note: `سداد لـ ${party}${note ? ' - ' + note : ''}`,
        date, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        refType: 'pay', refId: pay.id
    });
    setData('payments', payments); setData('treasury', treasury);
    addAuditLog('add', 'payment', `سداد لـ ${party} - ${formatMoney(amount)} ج.م`);
    $('payAmount').value = ''; $('payNote').value = '';
    $('paySupplier').value = '';
    const box = $('payInfoBox'); if (box) box.style.display = 'none';
    renderPayments(); renderTreasury(); renderSuppliers(); updateDashboard();
    showToast(`✅ تم سداد ${formatMoney(amount)} 🇪🇬 لـ ${party}`, 'success');
    setTimeout(() => showReceipt(pay), 300);
}

function renderPayments() {
    const collected = payments.filter(p => p.type === 'collect').reduce((s, p) => s + (p.amount || 0), 0);
    const paid = payments.filter(p => p.type === 'pay').reduce((s, p) => s + (p.amount || 0), 0);
    if ($('payTotalCollected')) $('payTotalCollected').textContent = formatMoney(collected);
    if ($('payTotalPaid')) $('payTotalPaid').textContent = formatMoney(paid);
    const c = $('paymentsList'); if (!c) return;
    if (payments.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><span>لا توجد عمليات</span></div>`;
        return;
    }
    const sorted = [...payments].sort((a, b) => b.id - a.id).slice(0, 50);
    let html = `<div class="table-header" style="grid-template-columns: 0.8fr 1fr 1.5fr 1fr 0.8fr;"><span>النوع</span><span>التاريخ</span><span>الجهة</span><span>المبلغ</span><span></span></div>`;
    sorted.forEach(p => {
        const isCollect = p.type === 'collect';
        const color = isCollect ? '#2D8F5E' : '#E06060';
        const icon = isCollect ? '💰' : '💸';
        const label = isCollect ? 'تحصيل' : 'سداد';
        html += `<div class="table-row" style="grid-template-columns: 0.8fr 1fr 1.5fr 1fr 0.8fr;">
            <span style="color:${color};font-weight:700;font-size:11px;">${icon} ${label}</span>
            <span style="font-size:10px;color:#A89070;">${p.date}<br>${p.time || ''}</span>
            <span style="font-size:11px;">${p.party}${p.note ? `<br><small style="color:#5D5D5D;font-size:9px;">${p.note}</small>` : ''}</span>
            <span style="color:${color};font-weight:700;">${formatMoney(p.amount)}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="showReceiptById(${p.id})"><i class="fas fa-receipt"></i></button>
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deletePayment(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function showReceiptById(id) {
    const pay = payments.find(p => p.id === id); if (!pay) return;
    showReceipt(pay);
}

function showReceipt(pay) {
    const isCollect = pay.type === 'collect';
    const color = isCollect ? '#2D8F5E' : '#E06060';
    const label = isCollect ? 'إيصال استلام نقدية' : 'إيصال دفع نقدية';
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="rec-logo" alt="logo">` : '';
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3 style="color:${color};">🧾 ${label}</h3>
        <div class="receipt-print" style="border-color:${color};">
            <div class="rec-header" style="border-color:${color};">
                ${logoHtml}
                <h2 style="color:${color};">${companyData.name || 'الميزان'}</h2>
                <p>${label}</p>
            </div>
            <div class="rec-info">
                <div><span class="lbl">رقم الإيصال:</span> #${pay.id.toString().slice(-6)}</div>
                <div><span class="lbl">التاريخ:</span> ${pay.date}</div>
                <div><span class="lbl">الوقت:</span> ${pay.time}</div>
                <div><span class="lbl">${isCollect ? 'العميل' : 'المورد'}:</span> ${pay.party}</div>
            </div>
            <div class="rec-amount" style="border-color:${color};">
                <div class="lbl">${isCollect ? 'المبلغ المستلم' : 'المبلغ المدفوع'}</div>
                <div class="value" style="color:${color};">${formatMoney(pay.amount)} 🇪🇬</div>
            </div>
            ${pay.note ? `<div style="text-align:center;font-size:11px;color:#A89070;margin-bottom:10px;">📝 ${pay.note}</div>` : ''}
            <div class="rec-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

function deletePayment(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const pay = payments.find(p => p.id === id); if (!pay) return;
    if (!confirm(`⚠️ حذف هذه العملية؟`)) return;
    treasury = treasury.filter(t => !(t.refType === (pay.type === 'collect' ? 'collect' : 'pay') && t.refId === id));
    payments = payments.filter(p => p.id !== id);
    setData('payments', payments); setData('treasury', treasury);
    addAuditLog('delete', 'payment', `حذف ${pay.type === 'collect' ? 'تحصيل' : 'سداد'} - ${pay.party}`);
    renderPayments(); renderTreasury(); renderCustomers(); renderSuppliers(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// القيود اليدوية
// ============================================================
function updateJournalCheck() {
    const debit = parseFloat($('jeDebitAmount')?.value) || 0;
    const credit = parseFloat($('jeCreditAmount')?.value) || 0;
    const checkEl = $('jeCheck');
    const statusEl = $('jeBalanceStatus');
    if (!checkEl || !statusEl) return;
    
    if (debit === 0 && credit === 0) {
        checkEl.className = 'journal-check';
        statusEl.textContent = 'أدخل المبالغ';
        statusEl.style.color = '#A89070';
    } else if (Math.abs(debit - credit) < 0.01 && debit > 0) {
        checkEl.className = 'journal-check balanced';
        statusEl.textContent = 'متوازن ✅';
        statusEl.style.color = '#2D8F5E';
    } else {
        checkEl.className = 'journal-check unbalanced';
        statusEl.textContent = `غير متوازن (فرق: ${formatMoney(Math.abs(debit - credit))})`;
        statusEl.style.color = '#E06060';
    }
}

function saveJournalEntry() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const date = $('jeDate').value || getTodayDate();
    const ref = $('jeRef').value.trim();
    const desc = $('jeDesc').value.trim();
    const debitAcc = parseInt($('jeDebitAccount').value);
    const debitAmount = parseFloat($('jeDebitAmount').value) || 0;
    const creditAcc = parseInt($('jeCreditAccount').value);
    const creditAmount = parseFloat($('jeCreditAmount').value) || 0;

    if (!desc) { showToast('⚠️ أدخل الشرح', 'error'); return; }
    if (!debitAcc || !creditAcc) { showToast('⚠️ اختر الحسابات', 'error'); return; }
    if (debitAmount <= 0 || creditAmount <= 0) { showToast('⚠️ أدخل المبالغ', 'error'); return; }
    if (Math.abs(debitAmount - creditAmount) > 0.01) {
        showToast('⚠️ المدين ≠ الدائن', 'error'); return;
    }

    const debitAccount = accounts.find(a => a.id === debitAcc);
    const creditAccount = accounts.find(a => a.id === creditAcc);

    const lines = [
        { accountId: debitAcc, accountName: debitAccount?.name || '-', debit: debitAmount, credit: 0 },
        { accountId: creditAcc, accountName: creditAccount?.name || '-', credit: creditAmount, debit: 0 }
    ];

    const entry = createJournalEntry(desc, ref, date, lines);
    if (entry) {
        addAuditLog('add', 'account', `قيد محاسبي: ${desc} - ${formatMoney(debitAmount)} ج.م`);
        $('jeRef').value = ''; $('jeDesc').value = '';
        $('jeDebitAmount').value = ''; $('jeCreditAmount').value = '';
        $('jeDebitAccount').value = ''; $('jeCreditAccount').value = '';
        updateJournalCheck();
        renderJournal();
        renderAccounts();
        renderSettings();
        showToast('✅ تم حفظ القيد', 'success');
    } else {
        showToast('❌ فشل حفظ القيد', 'error');
    }
}

function renderJournal() {
    const c = $('journalList'); if (!c) return;
    const search = ($('journalSearch')?.value || '').trim().toLowerCase();
    let filtered = journalEntries;
    if (search) {
        filtered = journalEntries.filter(e =>
            (e.description || '').toLowerCase().includes(search) ||
            (e.reference || '').toLowerCase().includes(search)
        );
    }
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><span>${search ? 'لا توجد نتائج' : 'لا توجد قيود'}</span></div>`;
        return;
    }
    const sorted = [...filtered].sort((a, b) => b.id - a.id).slice(0, 100);
    let html = '';
    sorted.forEach(e => {
        let rowsHtml = '';
        e.lines.forEach(l => {
            if (l.debit > 0) {
                rowsHtml += `<div class="je-row debit">
                    <span class="je-account">${l.accountName}</span>
                    <span class="je-amount">${formatMoney(l.debit)}</span>
                    <span></span>
                </div>`;
            }
            if (l.credit > 0) {
                rowsHtml += `<div class="je-row credit">
                    <span class="je-account je-indent">${l.accountName}</span>
                    <span></span>
                    <span class="je-amount">${formatMoney(l.credit)}</span>
                </div>`;
            }
        });
        html += `<div class="journal-item">
            <div class="je-header">
                <span class="je-num">قيد #${e.number}</span>
                <span class="je-date">${e.date}</span>
            </div>
            <div class="je-desc">${e.description}</div>
            ${e.reference ? `<div style="font-size:10px;color:#A89070;margin-bottom:6px;">📎 ${e.reference}</div>` : ''}
            <div class="je-entries">
                <div class="je-row" style="color:#C9A94E;font-weight:800;font-size:10px;">
                    <span>الحساب</span>
                    <span>مدين</span>
                    <span>دائن</span>
                </div>
                ${rowsHtml}
            </div>
            <div class="je-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteJournalEntry(${e.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function deleteJournalEntry(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const e = journalEntries.find(en => en.id === id); if (!e) return;
    if (!confirm(`⚠️ حذف القيد #${e.number}؟`)) return;
    journalEntries = journalEntries.filter(en => en.id !== id);
    setData('journalEntries', journalEntries);
    addAuditLog('delete', 'account', `حذف قيد محاسبي #${e.number}`);
    renderJournal();
    renderAccounts();
    renderSettings();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// التقارير العامة
// ============================================================
function switchReport(type, btn) {
    currentReport = type;
    document.querySelectorAll('.report-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderReport(type);
}

function renderReport(type) {
    const container = $('reportContent'); if (!container) return;
    if (type === 'vat') { renderVATReport(); return; }
    const today = new Date();
    let title = '', rows = [];
    if (type === 'daily') {
        title = 'تقرير يومي - آخر 7 أيام';
        const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const daySales = sales.filter(s => s.date === dateStr);
            const dayReturns = returns.filter(r => r.date === dateStr);
            const sT = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
            const cogs = getCOGS(daySales);
            const pT = purchases.filter(p => p.date === dateStr).reduce((sum, p) => sum + (p.total || 0), 0);
            const eT = expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + (e.amount || 0), 0);
            const rT = dayReturns.reduce((sum, r) => sum + (r.total || 0), 0);
            const rPurchase = dayReturns.filter(r => r.type === 'purchase').reduce((sum, r) => sum + (r.total || 0), 0);
            const rCOGS = getReturnsCOGS(dayReturns);
            rows.push({
                label: dayNames[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1),
                sales: sT, cogs: cogs, purchases: pT, expenses: eT, returns: rT,
                profit: sT - cogs - eT + rPurchase - rCOGS
            });
        }
    } else if (type === 'monthly') {
        title = 'تقرير شهري - آخر 6 أشهر';
        const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            const inM = (ds) => (ds || '').startsWith(monthStr);
            const mSales = sales.filter(s => inM(s.date));
            const mReturns = returns.filter(r => inM(r.date));
            const sT = mSales.reduce((sum, s) => sum + (s.total || 0), 0);
            const cogs = getCOGS(mSales);
            const pT = purchases.filter(p => inM(p.date)).reduce((sum, p) => sum + (p.total || 0), 0);
            const eT = expenses.filter(e => inM(e.date)).reduce((sum, e) => sum + (e.amount || 0), 0);
            const rT = mReturns.reduce((sum, r) => sum + (r.total || 0), 0);
            const rPurchase = mReturns.filter(r => r.type === 'purchase').reduce((sum, r) => sum + (r.total || 0), 0);
            const rCOGS = getReturnsCOGS(mReturns);
            rows.push({
                label: monthNames[d.getMonth()] + ' ' + d.getFullYear(),
                sales: sT, cogs: cogs, purchases: pT, expenses: eT, returns: rT,
                profit: sT - cogs - eT + rPurchase - rCOGS
            });
        }
    } else {
        title = 'تقرير سنوي - آخر 3 سنوات';
        for (let i = 2; i >= 0; i--) {
            const year = today.getFullYear() - i;
            const yS = String(year);
            const inY = (ds) => (ds || '').startsWith(yS);
            const ySales = sales.filter(s => inY(s.date));
            const yReturns = returns.filter(r => inY(r.date));
            const sT = ySales.reduce((sum, s) => sum + (s.total || 0), 0);
            const cogs = getCOGS(ySales);
            const pT = purchases.filter(p => inY(p.date)).reduce((sum, p) => sum + (p.total || 0), 0);
            const eT = expenses.filter(e => inY(e.date)).reduce((sum, e) => sum + (e.amount || 0), 0);
            const rT = yReturns.reduce((sum, r) => sum + (r.total || 0), 0);
            const rPurchase = yReturns.filter(r => r.type === 'purchase').reduce((sum, r) => sum + (r.total || 0), 0);
            const rCOGS = getReturnsCOGS(yReturns);
            rows.push({
                label: 'سنة ' + year,
                sales: sT, cogs: cogs, purchases: pT, expenses: eT, returns: rT,
                profit: sT - cogs - eT + rPurchase - rCOGS
            });
        }
    }
    const tS = rows.reduce((s, r) => s + r.sales, 0);
    const tCOGS = rows.reduce((s, r) => s + (r.cogs || 0), 0);
    const tE = rows.reduce((s, r) => s + r.expenses, 0);
    const tPr = rows.reduce((s, r) => s + r.profit, 0);
    const maxV = Math.max(...rows.flatMap(r => [r.sales, r.cogs, r.expenses]), 1);
    container.innerHTML = `
        <h3 style="font-size:14px;color:#C9A94E;margin-bottom:10px;">${title}</h3>
        <div class="report-summary">
            <div class="report-stat"><div class="num" style="color:#2D8F5E;">${formatMoney(tS)}</div><div class="lbl">💰 مبيعات</div></div>
            <div class="report-stat"><div class="num" style="color:#E06060;">${formatMoney(tCOGS)}</div><div class="lbl">📦 تكلفة بضاعة</div></div>
            <div class="report-stat"><div class="num" style="color:#E6A830;">${formatMoney(tE)}</div><div class="lbl">💸 مصروفات</div></div>
            <div class="report-stat"><div class="num" style="color:${tPr >= 0 ? '#2D8F5E' : '#E06060'};">${formatMoney(tPr)}</div><div class="lbl">📈 صافي الربح</div></div>
        </div>
        <div class="report-chart">
            <h4>📊 الرسم البياني</h4>
            <div class="chart-bars">
                ${rows.map(r => `
                    <div class="chart-bar-wrap">
                        <div style="display:flex;gap:2px;width:100%;align-items:flex-end;height:100%;justify-content:center;">
                            <div class="chart-bar sales" style="height:${Math.max((r.sales / maxV) * 100, 3)}%;width:33%;">
                                ${r.sales > 0 ? `<span class="chart-bar-value">${r.sales.toFixed(0)}</span>` : ''}
                            </div>
                            <div class="chart-bar purchases" style="height:${Math.max((r.cogs / maxV) * 100, 3)}%;width:33%;">
                                ${r.cogs > 0 ? `<span class="chart-bar-value">${r.cogs.toFixed(0)}</span>` : ''}
                            </div>
                            <div class="chart-bar expenses" style="height:${Math.max((r.expenses / maxV) * 100, 3)}%;width:33%;">
                                ${r.expenses > 0 ? `<span class="chart-bar-value">${r.expenses.toFixed(0)}</span>` : ''}
                            </div>
                        </div>
                        <div class="chart-bar-label">${r.label}</div>
                    </div>
                `).join('')}
            </div>
            <div class="report-legend">
                <span><span class="dot" style="background:#2D8F5E;"></span> مبيعات</span>
                <span><span class="dot" style="background:#E06060;"></span> تكلفة بضاعة</span>
                <span><span class="dot" style="background:#E6A830;"></span> مصروفات</span>
            </div>
        </div>
        <h3 style="font-size:14px;color:#C9A94E;margin:14px 0 10px;">📋 التفاصيل</h3>
        <div class="table-header" style="grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 1fr;"><span>الفترة</span><span>مبيعات</span><span>تكلفة</span><span>مصروفات</span><span>مرتجعات</span><span>ربح</span></div>
        ${rows.map(r => `
            <div class="table-row" style="grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 1fr;font-size:11px;">
                <span>${r.label}</span>
                <span style="color:#2D8F5E;">${formatMoney(r.sales)}</span>
                <span style="color:#E06060;">${formatMoney(r.cogs)}</span>
                <span style="color:#E6A830;">${formatMoney(r.expenses)}</span>
                <span style="color:#C9A94E;">${formatMoney(r.returns)}</span>
                <span style="color:${r.profit >= 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${formatMoney(r.profit)}</span>
            </div>
        `).join('')}
    `;
}

function renderVATReport() {
    const container = $('reportContent'); if (!container) return;
    const today = new Date();
    const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const rows = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        const stats = calculateVATStats(monthStr);
        rows.push({
            label: monthNames[d.getMonth()] + ' ' + d.getFullYear(),
            salesVAT: stats.salesVAT,
            purchasesVAT: stats.purchasesVAT,
            vatDue: stats.vatDue
        });
    }
    const totalSalesVAT = rows.reduce((s, r) => s + r.salesVAT, 0);
    const totalPurchasesVAT = rows.reduce((s, r) => s + r.purchasesVAT, 0);
    const totalVATDue = totalSalesVAT - totalPurchasesVAT;
    const maxV = Math.max(...rows.flatMap(r => [r.salesVAT, r.purchasesVAT]), 1);
    container.innerHTML = `
        <h3 style="font-size:14px;color:#9B59B6;margin-bottom:14px;">🧾 التقرير الضريبي</h3>
        <div class="vat-report-card">
            <div class="vat-big">${formatMoney(totalVATDue)} 🇪🇬</div>
            <div class="vat-label">${totalVATDue >= 0 ? '💰 ضريبة مستحقة للدولة' : '✅ ضريبة مستردة'}</div>
        </div>
        <div class="report-summary">
            <div class="report-stat" style="border-right-color:#9B59B6;">
                <div class="num" style="color:#9B59B6;">${formatMoney(totalSalesVAT)}</div>
                <div class="lbl">🧾 ضريبة المبيعات</div>
            </div>
            <div class="report-stat" style="border-right-color:#E06060;">
                <div class="num" style="color:#E06060;">${formatMoney(totalPurchasesVAT)}</div>
                <div class="lbl">🛒 ضريبة المشتريات</div>
            </div>
        </div>
        <div class="report-chart">
            <h4>📊 الرسم البياني الشهري</h4>
            <div class="chart-bars">
                ${rows.map(r => `
                    <div class="chart-bar-wrap">
                        <div style="display:flex;gap:2px;width:100%;align-items:flex-end;height:100%;justify-content:center;">
                            <div class="chart-bar vat" style="height:${Math.max((r.salesVAT / maxV) * 100, 3)}%;width:48%;">
                                ${r.salesVAT > 0 ? `<span class="chart-bar-value">${r.salesVAT.toFixed(0)}</span>` : ''}
                            </div>
                            <div class="chart-bar purchases" style="height:${Math.max((r.purchasesVAT / maxV) * 100, 3)}%;width:48%;">
                                ${r.purchasesVAT > 0 ? `<span class="chart-bar-value">${r.purchasesVAT.toFixed(0)}</span>` : ''}
                            </div>
                        </div>
                        <div class="chart-bar-label">${r.label}</div>
                    </div>
                `).join('')}
            </div>
            <div class="report-legend">
                <span><span class="dot" style="background:#9B59B6;"></span> ضريبة مبيعات</span>
                <span><span class="dot" style="background:#E06060;"></span> ضريبة مشتريات</span>
            </div>
        </div>
        <h3 style="font-size:14px;color:#9B59B6;margin:14px 0 10px;">📋 التفاصيل الشهرية</h3>
        <div class="table-header" style="grid-template-columns: 1.5fr 1fr 1fr 1fr;"><span>الشهر</span><span>ضريبة مبيعات</span><span>ضريبة مشتريات</span><span>المستحق</span></div>
        ${rows.map(r => `
            <div class="table-row" style="grid-template-columns: 1.5fr 1fr 1fr 1fr;font-size:11px;">
                <span>${r.label}</span>
                <span style="color:#9B59B6;">${formatMoney(r.salesVAT)}</span>
                <span style="color:#E06060;">${formatMoney(r.purchasesVAT)}</span>
                <span style="color:${r.vatDue >= 0 ? '#E6A830' : '#2D8F5E'};font-weight:700;">${formatMoney(r.vatDue)}</span>
            </div>
        `).join('')}
    `;
}

// ============================================================
// التقارير المحاسبية
// ============================================================
function switchAccountsTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const tree = $('accTabTree');
    const journal = $('accTabJournal');
    const reports = $('accTabReports');
    if (tree) tree.style.display = (tab === 'tree') ? 'block' : 'none';
    if (journal) journal.style.display = (tab === 'journal') ? 'block' : 'none';
    if (reports) reports.style.display = (tab === 'reports') ? 'block' : 'none';
    if (tab === 'tree') { renderAccounts(); populateAccountDropdowns(); }
    if (tab === 'journal') { renderJournal(); populateAccountDropdowns(); }
}

function showAccountingReport(type) {
    const c = $('accountingReportContent');
    if (!c) return;
    if (type === 'trial') c.innerHTML = renderTrialBalance();
    if (type === 'income') c.innerHTML = renderIncomeStatement();
    if (type === 'balance') c.innerHTML = renderBalanceSheet();
}

function renderTrialBalance() {
    const rows = [];
    let totalDebit = 0, totalCredit = 0;
    accounts.filter(a => !a.isParent).forEach(a => {
        const balance = calculateAccountBalance(a.id);
        if (Math.abs(balance) < 0.01) return;
        if (balance > 0) { rows.push({ name: a.name, code: a.code, debit: balance, credit: 0 }); totalDebit += balance; }
        else { rows.push({ name: a.name, code: a.code, debit: 0, credit: Math.abs(balance) }); totalCredit += Math.abs(balance); }
    });
    if (rows.length === 0) {
        return `<div class="empty-state"><i class="fas fa-balance-scale"></i><span>لا توجد أرصدة بعد</span></div>`;
    }
    let rowsHtml = '';
    rows.forEach(r => {
        rowsHtml += `<div class="acc-report-row">
            <span>${r.code ? `<small style="color:#A89070;">${r.code}</small> ` : ''}${r.name}</span>
            <span style="color:#2D8F5E;">${r.debit > 0 ? formatMoney(r.debit) : '-'}</span>
            <span style="color:#E06060;">${r.credit > 0 ? formatMoney(r.credit) : '-'}</span>
        </div>`;
    });
    const diff = totalDebit - totalCredit;
    return `
        <div class="acc-report-title">📊 ميزان المراجعة</div>
        <div class="acc-report-subtitle">${getTodayDate()}</div>
        <div class="acc-report-section">
            <div class="acc-report-row" style="color:#C9A94E;font-weight:800;">
                <span>الحساب</span><span>مدين</span><span>دائن</span>
            </div>
            ${rowsHtml}
            <div class="acc-report-row total ${Math.abs(diff) < 0.01 ? 'profit' : 'loss'}">
                <span>الإجمالي</span>
                <span>${formatMoney(totalDebit)}</span>
                <span>${formatMoney(totalCredit)}</span>
            </div>
            ${Math.abs(diff) > 0.01 ? `<div style="text-align:center;color:#E06060;font-size:12px;margin-top:8px;">⚠️ فرق: ${formatMoney(Math.abs(diff))}</div>` : `<div style="text-align:center;color:#2D8F5E;font-size:12px;margin-top:8px;">✅ متوازن</div>`}
        </div>
    `;
}

function renderIncomeStatement() {
    let revenue = 0, cogs = 0, expenses = 0;
    accounts.filter(a => a.type === 'revenue' && !a.isParent).forEach(a => {
        const b = calculateAccountBalance(a.id);
        revenue += -b;
    });
    accounts.filter(a => a.type === 'expenses' && !a.isParent).forEach(a => {
        const b = calculateAccountBalance(a.id);
        if (a.name.includes('تكلفة البضاعة')) cogs += b;
        else expenses += b;
    });
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    return `
        <div class="acc-report-title">📈 قائمة الدخل</div>
        <div class="acc-report-subtitle">${getTodayDate()}</div>
        <div class="acc-report-section">
            <h4>💰 الإيرادات</h4>
            <div class="acc-report-row"><span>إجمالي الإيرادات</span><span style="color:#2D8F5E;">${formatMoney(revenue)}</span></div>
        </div>
        <div class="acc-report-section">
            <h4>📦 تكلفة البضاعة المباعة</h4>
            <div class="acc-report-row"><span>COGS</span><span style="color:#E06060;">${formatMoney(cogs)}</span></div>
            <div class="acc-report-row subtotal"><span>الربح الإجمالي</span><span>${formatMoney(grossProfit)}</span></div>
        </div>
        <div class="acc-report-section">
            <h4>💸 المصروفات</h4>
            <div class="acc-report-row"><span>إجمالي المصروفات</span><span style="color:#E06060;">${formatMoney(expenses)}</span></div>
        </div>
        <div class="acc-report-section">
            <div class="acc-report-row total ${netProfit >= 0 ? 'profit' : 'loss'}">
                <span>📊 صافي الربح</span>
                <span>${formatMoney(netProfit)}</span>
            </div>
        </div>
    `;
}

function renderBalanceSheet() {
    let assets = 0, liabilities = 0, equity = 0;
    accounts.filter(a => a.type === 'assets' && !a.isParent).forEach(a => { assets += calculateAccountBalance(a.id); });
    accounts.filter(a => a.type === 'liabilities' && !a.isParent).forEach(a => { liabilities += -calculateAccountBalance(a.id); });
    accounts.filter(a => a.type === 'equity' && !a.isParent).forEach(a => { equity += -calculateAccountBalance(a.id); });
    const totalLiabEquity = liabilities + equity;
    const diff = assets - totalLiabEquity;
    return `
        <div class="acc-report-title">📉 الميزانية العمومية</div>
        <div class="acc-report-subtitle">${getTodayDate()}</div>
        <div class="acc-report-section">
            <h4>🏛️ الأصول</h4>
            <div class="acc-report-row total"><span>إجمالي الأصول</span><span style="color:#2D8F5E;">${formatMoney(assets)}</span></div>
        </div>
        <div class="acc-report-section">
            <h4>💳 الخصوم</h4>
            <div class="acc-report-row"><span>إجمالي الخصوم</span><span style="color:#E06060;">${formatMoney(liabilities)}</span></div>
        </div>
        <div class="acc-report-section">
            <h4>👑 حقوق الملكية</h4>
            <div class="acc-report-row"><span>إجمالي حقوق الملكية</span><span style="color:#C9A94E;">${formatMoney(equity)}</span></div>
        </div>
        <div class="acc-report-section">
            <div class="acc-report-row total ${Math.abs(diff) < 0.01 ? 'profit' : 'loss'}">
                <span>الخصوم + حقوق الملكية</span>
                <span>${formatMoney(totalLiabEquity)}</span>
            </div>
            ${Math.abs(diff) > 0.01 ? `<div style="text-align:center;color:#E06060;font-size:12px;margin-top:8px;">⚠️ فرق: ${formatMoney(Math.abs(diff))}</div>` : `<div style="text-align:center;color:#2D8F5E;font-size:12px;margin-top:8px;">✅ الميزانية متوازنة</div>`}
        </div>
    `;
}

// ============================================================
// بيانات الشركة
// ============================================================
function renderCompanyPage() {
    if ($('setCompanyName')) $('setCompanyName').value = companyData.name || '';
    if ($('setCompanyPhone')) $('setCompanyPhone').value = companyData.phone || '';
    if ($('setCompanyAddress')) $('setCompanyAddress').value = companyData.address || '';
    if ($('setCompanyTax')) $('setCompanyTax').value = companyData.tax || '';
    if ($('setCompanyCR')) $('setCompanyCR').value = companyData.cr || '';
    if ($('setCompanyFooter')) $('setCompanyFooter').value = companyData.footer || '';
    renderLogoPreview();
    const infoParts = [];
    if (companyData.phone) infoParts.push(`📞 ${companyData.phone}`);
    if (companyData.address) infoParts.push(`📍 ${companyData.address}`);
    if (companyData.tax) infoParts.push(`🆔 ${companyData.tax}`);
    if ($('companyPreviewName')) $('companyPreviewName').textContent = companyData.name || 'اسم الشركة';
    if ($('companyPreviewInfo')) $('companyPreviewInfo').textContent = infoParts.length > 0 ? infoParts.join(' • ') : 'لم يتم إدخال بيانات بعد';
    if ($('previewName')) $('previewName').textContent = companyData.name || 'الميزان';
    if ($('previewPhone')) $('previewPhone').textContent = '📞 ' + (companyData.phone || '-');
    if ($('previewAddress')) $('previewAddress').textContent = '📍 ' + (companyData.address || '-');
    if ($('previewFooter')) $('previewFooter').textContent = companyData.footer || 'شكراً لتعاملكم معنا 🌟';
    const previewLogo = $('previewLogo');
    if (previewLogo) {
        if (companyData.logo) previewLogo.innerHTML = `<img src="${companyData.logo}" alt="logo">`;
        else previewLogo.innerHTML = '';
    }
    updateHeaderCompanyName();
}

function renderLogoPreview() {
    const box = $('logoPreviewBox');
    const companyLogo = $('companyPreviewLogo');
    if (!box) return;
    if (companyData.logo) {
        box.innerHTML = `<img src="${companyData.logo}" alt="logo">`;
        if (companyLogo) companyLogo.innerHTML = `<img src="${companyData.logo}" alt="logo">`;
    } else {
        box.innerHTML = `<i class="fas fa-image"></i><span>لا يوجد شعار</span>`;
        if (companyLogo) companyLogo.innerHTML = `<i class="fas fa-store"></i>`;
    }
}

function uploadLogo(event) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { showToast('⚠️ الصورة كبيرة (الحد: 500KB)', 'warning'); event.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { showToast('⚠️ الملف ليس صورة', 'error'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        companyData.logo = e.target.result;
        setData('companyData', companyData);
        addAuditLog('edit', 'company', 'رفع شعار الشركة');
        renderCompanyPage();
        showToast('✅ تم رفع الشعار بنجاح', 'success');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function removeLogo() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!companyData.logo) { showToast('⚠️ لا يوجد شعار للحذف', 'warning'); return; }
    if (!confirm('⚠️ حذف الشعار؟')) return;
    companyData.logo = null;
    setData('companyData', companyData);
    addAuditLog('edit', 'company', 'حذف شعار الشركة');
    renderCompanyPage();
    showToast('🗑️ تم حذف الشعار', 'info');
}

function saveCompanySettings() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    companyData.name = $('setCompanyName').value.trim();
    companyData.phone = $('setCompanyPhone').value.trim();
    companyData.address = $('setCompanyAddress').value.trim();
    companyData.tax = $('setCompanyTax').value.trim();
    companyData.cr = $('setCompanyCR')?.value?.trim() || '';
    companyData.footer = $('setCompanyFooter').value.trim();
    setData('companyData', companyData);
    addAuditLog('edit', 'company', 'تعديل بيانات الشركة');
    renderCompanyPage();
    showToast('✅ تم حفظ بيانات الشركة', 'success');
}

function updateHeaderCompanyName() {
    const el = $('headerCompanyName');
    if (el) el.textContent = companyData.name || 'نظام محاسبة';
}

// ============================================================
// إعدادات الضريبة
// ============================================================
function saveVATSettings() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const vatEl = $('setDefaultVAT');
    const vat = parseFloat(vatEl?.value) || 14;
    if (vat < 0 || vat > 100) { showToast('⚠️ النسبة بين 0 و 100', 'error'); return; }
    vatSettings.defaultVAT = vat;
    setData('vatSettings', vatSettings);
    addAuditLog('edit', 'vat', `تعديل نسبة الضريبة: ${vat}%`);
    showToast(`✅ تم حفظ نسبة الضريبة: ${vat}%`, 'success');
}

// ============================================================
// إدارة المستخدمين
// ============================================================
function saveUser() {
    if (!canManageUsers()) { showToast('⚠️ المدير فقط', 'error'); return; }
    const id = $('userId').value;
    const name = $('userName').value.trim();
    const password = $('userPassword').value.trim();
    const role = $('userRole').value;
    if (!name) { showToast('⚠️ أدخل اسم المستخدم', 'error'); return; }
    if (!password || password.length < 4) { showToast('⚠️ كلمة المرور 4 أحرف على الأقل', 'error'); return; }
    if (id) {
        const idx = users.findIndex(u => u.id == id);
        if (idx > -1) {
            if (users[idx].role === 'admin' && role !== 'admin') {
                const otherAdmins = users.filter(u => u.role === 'admin' && u.id != id);
                if (otherAdmins.length === 0) { showToast('⚠️ لا يمكن تغيير دور المدير الأخير', 'error'); return; }
            }
            users[idx] = { ...users[idx], name, password, role };
            addAuditLog('edit', 'user', `تعديل مستخدم: ${name}`);
            showToast('✅ تم تعديل المستخدم', 'success');
        }
    } else {
        if (users.find(u => u.name === name)) { showToast('⚠️ اسم المستخدم موجود', 'warning'); return; }
        users.push({
            id: Date.now(), name, password, role, active: true,
            createdAt: new Date().toISOString(),
            createdBy: currentUser ? currentUser.name : 'unknown'
        });
        addAuditLog('add', 'user', `إضافة مستخدم: ${name}`);
        showToast('✅ تم إضافة المستخدم', 'success');
    }
    setData('users', users);
    resetUserForm();
    renderUsers();
    populateLoginUsers();
    renderSettings();
}

function editUser(id) {
    if (!canManageUsers()) { showToast('⚠️ المدير فقط', 'error'); return; }
    const u = users.find(us => us.id == id); if (!u) return;
    $('userId').value = u.id;
    $('userName').value = u.name;
    $('userPassword').value = u.password;
    $('userRole').value = u.role;
    $('userFormTitle').textContent = '✏️ تعديل المستخدم';
    $('userSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleUserActive(id) {
    if (!canManageUsers()) { showToast('⚠️ المدير فقط', 'error'); return; }
    const u = users.find(us => us.id == id); if (!u) return;
    if (u.id === (currentUser ? currentUser.id : null)) { showToast('⚠️ لا يمكنك تعطيل حسابك', 'error'); return; }
    u.active = !u.active;
    setData('users', users);
    addAuditLog('edit', 'user', `${u.active ? 'تفعيل' : 'تعطيل'} المستخدم: ${u.name}`);
    renderUsers();
    populateLoginUsers();
    showToast(u.active ? `✅ تم تفعيل ${u.name}` : `⏸️ تم تعطيل ${u.name}`, 'info');
}

function deleteUser(id) {
    if (!canManageUsers()) { showToast('⚠️ المدير فقط', 'error'); return; }
    const u = users.find(us => us.id == id); if (!u) return;
    if (u.id === (currentUser ? currentUser.id : null)) { showToast('⚠️ لا يمكنك حذف حسابك', 'error'); return; }
    if (u.role === 'admin') {
        const otherAdmins = users.filter(us => us.role === 'admin' && us.id != id);
        if (otherAdmins.length === 0) { showToast('⚠️ لا يمكن حذف المدير الأخير', 'error'); return; }
    }
    if (!confirm(`⚠️ حذف المستخدم "${u.name}"؟`)) return;
    users = users.filter(us => us.id !== id);
    setData('users', users);
    addAuditLog('delete', 'user', `حذف مستخدم: ${u.name}`);
    renderUsers();
    populateLoginUsers();
    renderSettings();
    showToast('🗑️ تم حذف المستخدم', 'info');
}

function resetUserForm() {
    $('userId').value = '';
    $('userName').value = '';
    $('userPassword').value = '';
    $('userRole').value = 'cashier';
    $('userFormTitle').textContent = '➕ إضافة مستخدم جديد';
    $('userSaveBtnText').textContent = 'إضافة';
}

function renderUsers() {
    const c = $('userList'); if (!c) return;
    if (!canManageUsers()) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>المدير فقط</span></div>`;
        return;
    }
    const search = ($('userSearch')?.value || '').trim().toLowerCase();
    let filtered = users;
    if (search) filtered = users.filter(u => u.name.toLowerCase().includes(search));
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-users-cog"></i><span>لا يوجد مستخدمين</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1fr 0.8fr 1.3fr;"><span>الاسم</span><span>الدور</span><span>الحالة</span><span></span></div>`;
    filtered.forEach(u => {
        const roleInfo = ROLES[u.role] || { name: u.role, icon: '❓', color: '#5D5D5D' };
        const isMe = u.id === (currentUser ? currentUser.id : null);
        const isActive = u.active !== false;
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1fr 0.8fr 1.3fr;">
            <span><strong>${u.name}</strong>${isMe ? ' <small style="color:#C9A94E;">(أنت)</small>' : ''}</span>
            <span><span class="role-badge ${u.role}">${roleInfo.icon} ${roleInfo.name}</span></span>
            <span style="color:${isActive ? '#2D8F5E' : '#E06060'};font-size:11px;font-weight:700;">
                ${isActive ? '✅ نشط' : '⏸️ موقوف'}
            </span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-warning btn-sm" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
                ${!isMe ? `
                    <button class="btn btn-info btn-sm" onclick="toggleUserActive(${u.id})">
                        <i class="fas ${isActive ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                ` : ''}
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

// ============================================================
// سجل النشاطات
// ============================================================
function renderAudit() {
    const c = $('auditList'); if (!c) return;
    if (!isAdmin()) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>المدير فقط</span></div>`;
        return;
    }
    const search = ($('auditSearch')?.value || '').trim().toLowerCase();
    let filtered = auditLog;
    if (currentAuditFilter !== 'all') {
        if (['add', 'edit', 'delete'].includes(currentAuditFilter)) filtered = filtered.filter(l => l.action === currentAuditFilter);
        else if (currentAuditFilter === 'sale') filtered = filtered.filter(l => l.type === 'sale');
        else if (currentAuditFilter === 'purchase') filtered = filtered.filter(l => l.type === 'purchase');
        else if (currentAuditFilter === 'payment') filtered = filtered.filter(l => l.type === 'payment');
    }
    if (search) {
        filtered = filtered.filter(l => (l.details || '').toLowerCase().includes(search) || (l.userName || '').toLowerCase().includes(search));
    }
    const totalCount = auditLog.length;
    const today = getTodayDate();
    const todayCount = auditLog.filter(l => l.date === today).length;
    if ($('auditTotalCount')) $('auditTotalCount').textContent = totalCount;
    if ($('auditTodayCount')) $('auditTodayCount').textContent = todayCount;
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>${search ? 'لا توجد نتائج' : 'لا توجد نشاطات'}</span></div>`;
        return;
    }
    const actionIcons = {
        'add': { icon: 'fa-plus-circle', color: '#2D8F5E', name: 'إضافة' },
        'edit': { icon: 'fa-edit', color: '#E6A830', name: 'تعديل' },
        'delete': { icon: 'fa-trash-alt', color: '#E06060', name: 'حذف' },
        'login': { icon: 'fa-sign-in-alt', color: '#4A8AB5', name: 'دخول/خروج' }
    };
    const typeIcons = {
        'sale': '💰', 'purchase': '🛒', 'product': '📦', 'customer': '👤',
        'supplier': '🚚', 'payment': '💳', 'expense': '💸', 'return': '🔄',
        'treasury': '🏦', 'user': '👥', 'company': '🏢', 'cloud': '☁️',
        'backup': '💾', 'vat': '🧾', 'account': '📊'
    };
    let html = '';
    filtered.slice(0, 200).forEach(log => {
        const info = actionIcons[log.action] || { icon: 'fa-circle', color: '#A89070', name: log.action };
        const typeIcon = typeIcons[log.type] || '📋';
        const hasDetails = log.extraData !== null && log.extraData !== undefined;
        html += `<div class="audit-item ${log.action}" id="audit-${log.id}">
            <div class="audit-header" onclick="toggleAuditItem('${log.id}')">
                <div class="audit-icon" style="background:${info.color}20; color:${info.color};">
                    <i class="fas ${info.icon}"></i>
                </div>
                <div class="audit-main">
                    <div class="audit-title" style="color:${info.color};">${typeIcon} ${info.name}</div>
                    <div style="font-size:11px;color:#A89070;">${log.details || '-'}</div>
                    <div class="audit-meta">
                        <span><i class="fas fa-user"></i> ${log.userName || '-'}</span>
                        <span><i class="fas fa-clock"></i> ${log.date} ${log.time || ''}</span>
                    </div>
                </div>
                ${hasDetails ? `<div class="audit-expand"><i class="fas fa-chevron-down"></i></div>` : ''}
            </div>
            ${hasDetails ? `<div class="audit-body">${renderAuditDetails(log)}</div>` : ''}
        </div>`;
    });
    c.innerHTML = html;
}

function renderAuditDetails(log) {
    const data = log.extraData;
    if (!data) return '';
    let html = '';
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        html += `<div class="audit-items-title">📋 الأصناف (${data.items.length}):</div>`;
        html += `<div class="audit-items-table">
            <div class="audit-items-header"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span></div>`;
        data.items.forEach(it => {
            html += `<div class="audit-item-row">
                <span>${it.name}</span><span>${it.qty}</span>
                <span>${formatMoney(it.price)}</span>
                <span style="color:#C9A94E;font-weight:700;">${formatMoney(it.total)}</span>
            </div>`;
        });
        html += `</div>`;
    }
    if (data.subtotal !== undefined && data.vatTotal !== undefined) {
        html += `<div style="background:#1C1C1C;border-radius:8px;padding:10px;margin-top:8px;">
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#F5E6C8;">
                <span style="color:#A89070;">المجموع:</span><span>${formatMoney(data.subtotal)} ج.م</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#F5E6C8;">
                <span style="color:#A89070;">الضريبة:</span><span style="color:#9B59B6;">${formatMoney(data.vatTotal)} ج.م</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;font-weight:900;color:#C9A94E;border-top:2px solid #C9A94E;margin-top:4px;">
                <span>الإجمالي:</span><span>${formatMoney(data.total)} 🇪🇬</span>
            </div>
        </div>`;
    } else if (data.total !== undefined) {
        html += `<div class="audit-total"><span>💰 الإجمالي:</span><span>${formatMoney(data.total)} 🇪🇬</span></div>`;
    }
    const extraFields = [
        { key: 'customer', label: '👤 العميل' },
        { key: 'supplier', label: '🚚 المورد' },
        { key: 'party', label: '👥 الجهة' },
        { key: 'paymentMethod', label: '💳 طريقة الدفع' },
        { key: 'payment', label: '💳 الدفع' },
        { key: 'invoiceType', label: '📄 نوع الفاتورة' },
        { key: 'amount', label: '💰 المبلغ' },
        { key: 'note', label: '📝 ملاحظات' },
        { key: 'category', label: '📂 التصنيف' },
        { key: 'role', label: '🎯 الدور' }
    ];
    let extraHtml = '';
    extraFields.forEach(f => {
        if (data[f.key] !== undefined && data[f.key] !== null && data[f.key] !== '') {
            let value = data[f.key];
            if (f.key === 'amount') value = formatMoney(value) + ' 🇪🇬';
            extraHtml += `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                <span style="color:#A89070;font-weight:700;">${f.label}:</span>
                <span style="color:#F5E6C8;">${value}</span>
            </div>`;
        }
    });
    if (extraHtml) html += `<div style="margin-top:8px;">${extraHtml}</div>`;
    return html || '<div style="padding:10px 0;color:#A89070;font-size:11px;">لا توجد تفاصيل إضافية</div>';
}

function toggleAuditItem(id) {
    const el = document.getElementById('audit-' + id);
    if (el) el.classList.toggle('expanded');
}

function filterAudit(filter, btn) {
    currentAuditFilter = filter;
    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => chip.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderAudit();
}

function exportAuditLog() {
    if (!isAdmin()) { showToast('⚠️ المدير فقط', 'error'); return; }
    if (auditLog.length === 0) { showToast('⚠️ السجل فارغ', 'warning'); return; }
    const data = { exportDate: new Date().toISOString(), totalCount: auditLog.length, logs: auditLog };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `mizan_audit_log_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ تم التصدير', 'success');
    addAuditLog('edit', 'backup', 'تصدير سجل النشاطات');
}

function exportAuditLogText() {
    if (!isAdmin()) { showToast('⚠️ المدير فقط', 'error'); return; }
    if (auditLog.length === 0) { showToast('⚠️ السجل فارغ', 'warning'); return; }
    let text = '========================================\nسجل نشاطات الميزان\n========================================\n';
    text += `تاريخ التصدير: ${new Date().toLocaleString('ar')}\nإجمالي النشاطات: ${auditLog.length}\n========================================\n\n`;
    auditLog.forEach((log, i) => {
        text += `[${i + 1}] ${log.date} ${log.time}\n`;
        text += `    المستخدم: ${log.userName}\n    النوع: ${log.type}\n    العملية: ${log.action}\n    التفاصيل: ${log.details}\n`;
        if (log.extraData && log.extraData.items) {
            text += `    الأصناف:\n`;
            log.extraData.items.forEach(it => { text += `      • ${it.name} × ${it.qty} = ${formatMoney(it.total)} ج.م\n`; });
        }
        if (log.extraData && log.extraData.total !== undefined) {
            text += `    الإجمالي: ${formatMoney(log.extraData.total)} ج.م\n`;
        }
        text += '\n----------------------------------------\n';
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `mizan_audit_log_${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ تم التصدير', 'success');
}

function clearAuditLog() {
    if (!isAdmin()) { showToast('⚠️ المدير فقط', 'error'); return; }
    if (auditLog.length === 0) { showToast('⚠️ السجل فارغ', 'warning'); return; }
    if (!confirm(`⚠️ مسح السجل؟ (${auditLog.length} عملية)`)) return;
    if (!confirm('⚠️ تأكيد نهائي؟')) return;
    auditLog = [];
    setData('auditLog', auditLog);
    addAuditLog('delete', 'audit', 'مسح سجل النشاطات');
    renderAudit();
    showToast('🗑️ تم المسح', 'info');
}

// ============================================================
// الإعدادات
// ============================================================
function renderSettings() {
    if ($('setProductsCount')) $('setProductsCount').textContent = products.length;
    if ($('setSalesCount')) $('setSalesCount').textContent = sales.length;
    if ($('setUsersCount')) $('setUsersCount').textContent = users.length;
    if ($('setAccountsCount')) $('setAccountsCount').textContent = accounts.length;
    if ($('setJournalCount')) $('setJournalCount').textContent = journalEntries.length;
    if ($('setDefaultVAT')) $('setDefaultVAT').value = vatSettings.defaultVAT || 14;
    let size = 0;
    for (let k in localStorage) {
        if (k.startsWith(STORAGE_KEY)) size += (localStorage[k] || '').length;
    }
    if ($('setDataSize')) $('setDataSize').textContent = (size / 1024).toFixed(1) + ' KB';
    if ($('currentUserForPassword')) $('currentUserForPassword').textContent = currentUser ? currentUser.name : '-';
}

function changePassword() {
    if (!currentUser) { showToast('⚠️ غير مسجل دخول', 'error'); return; }
    const oldP = $('oldPassword').value;
    const newP = $('newPassword').value;
    const conP = $('confirmPassword').value;
    if (oldP !== currentUser.password) { showToast('❌ كلمة المرور الحالية خاطئة', 'error'); return; }
    if (newP.length < 4) { showToast('❌ 4 أحرف على الأقل', 'error'); return; }
    if (newP !== conP) { showToast('❌ غير متطابقة', 'error'); return; }
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx > -1) {
        users[idx].password = newP;
        currentUser.password = newP;
        setData('users', users);
        localStorage.setItem(STORAGE_KEY + 'current_user', JSON.stringify({ id: currentUser.id, name: currentUser.name, role: currentUser.role }));
        addAuditLog('edit', 'user', `تغيير كلمة المرور: ${currentUser.name}`);
    }
    $('oldPassword').value = ''; $('newPassword').value = ''; $('confirmPassword').value = '';
    showToast('✅ تم تغيير كلمة المرور', 'success');
}

function exportData() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const data = {
        version: '12.1.0', exportDate: new Date().toISOString(),
        products, sales, purchases, returns, expenses,
        customers, suppliers, treasury, payments, users, auditLog, companyData, vatSettings,
        accounts, journalEntries
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `mizan_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addAuditLog('edit', 'backup', 'تصدير نسخة احتياطية');
    showToast('✅ تم التصدير', 'success');
}

function importData(event) {
    if (!isAdmin()) { showToast('⚠️ المدير فقط', 'error'); return; }
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('⚠️ سيتم استبدال البيانات. متابعة؟')) { event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.products) products = data.products;
            if (data.sales) sales = data.sales;
            if (data.purchases) purchases = data.purchases;
            if (data.returns) returns = data.returns;
            if (data.expenses) expenses = data.expenses;
            if (data.customers) customers = data.customers;
            if (data.suppliers) suppliers = data.suppliers;
            if (data.treasury) treasury = data.treasury;
            if (data.payments) payments = data.payments;
            if (data.companyData) companyData = data.companyData;
            if (data.users) users = data.users;
            if (data.auditLog) auditLog = data.auditLog;
            if (data.vatSettings) vatSettings = data.vatSettings;
            if (data.accounts) accounts = data.accounts;
            if (data.journalEntries) journalEntries = data.journalEntries;
            saveAll();
            populateAllDropdowns();
            populateLoginUsers();
            renderProducts(); renderCashier(); renderPurchases();
            renderReturns(); renderExpenses(); renderInvoices();
            renderTreasury(); renderCustomers(); renderSuppliers();
            renderPayments(); renderUsers(); renderAudit();
            renderAccounts(); renderJournal();
            updateDashboard(); renderSettings();
            addAuditLog('edit', 'backup', 'استيراد نسخة احتياطية');
            showToast('✅ تم الاستيراد', 'success');
        } catch (err) { showToast('❌ ملف غير صالح', 'error'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function clearAllData() {
    if (!canClearData()) { showToast('⚠️ المدير فقط', 'error'); return; }
    if (!confirm('⚠️ مسح جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟ لا يمكن التراجع!')) return;
    const keys = ['products', 'sales', 'purchases', 'returns', 'expenses',
        'customers', 'suppliers', 'treasury', 'payments', 'companyData', 'accounts', 'journalEntries'];
    keys.forEach(k => localStorage.removeItem(STORAGE_KEY + k));
    localStorage.removeItem('mizan_seeded');
    products = []; sales = []; purchases = []; returns = []; expenses = [];
    customers = []; suppliers = []; treasury = []; payments = []; companyData = {};
    accounts = []; journalEntries = [];
    if (confirm('⚠️ هل تريد أيضاً مسح المستخدمين وسجل النشاطات؟')) {
        users = []; auditLog = [];
        localStorage.removeItem(STORAGE_KEY + 'users');
        localStorage.removeItem(STORAGE_KEY + 'auditLog');
    }
    saveAll();
    showToast('🗑️ تم المسح', 'warning');
    setTimeout(() => location.reload(), 1500);
}

function saveAll() {
    setData('products', products);
    setData('sales', sales);
    setData('purchases', purchases);
    setData('returns', returns);
    setData('expenses', expenses);
    setData('customers', customers);
    setData('suppliers', suppliers);
    setData('treasury', treasury);
    setData('payments', payments);
    setData('users', users);
    setData('auditLog', auditLog);
    setData('companyData', companyData);
    setData('vatSettings', vatSettings);
    setData('accounts', accounts);
    setData('journalEntries', journalEntries);
}

// ============================================================
// Modal
// ============================================================
function openModal(html) {
    let overlay = document.getElementById('modalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modalOverlay';
        overlay.className = 'modal-overlay';
        overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };
        document.body.appendChild(overlay);
    }
    let box = overlay.querySelector('.modal-box');
    if (!box) {
        box = document.createElement('div');
        box.className = 'modal-box';
        overlay.appendChild(box);
    }
    box.innerHTML = html;
    overlay.classList.add('show');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('show');
}

// ============================================================
// Populate All Dropdowns
// ============================================================
function populateAllDropdowns() {
    populateSaleProducts(); populateSaleCustomers();
    populatePurSuppliers(); populatePurProducts();
    populateRetProducts();
    if (typeof toggleReturnCustomer === 'function') toggleReturnCustomer();
    populateCollectCustomers(); populatePaySuppliers();
    populateAccountDropdowns();
}

// ============================================================
// Init
// ============================================================
function init() {
    console.log('🚀 الميزان 12.1.0 - الحسابات + قائمة محسّنة');

    initFirebase();

    const rawProducts = getData('products', []);
    sales = getData('sales', []);
    purchases = getData('purchases', []);
    returns = getData('returns', []);
    expenses = getData('expenses', []);
    customers = getData('customers', []);
    suppliers = getData('suppliers', []);
    treasury = getData('treasury', []);
    payments = getData('payments', []);
    companyData = getData('companyData', {});
    auditLog = getData('auditLog', []);
    vatSettings = getData('vatSettings', { defaultVAT: 14 });
    accounts = getData('accounts', []);
    journalEntries = getData('journalEntries', []);

    if (accounts.length === 0) {
        accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
        setData('accounts', accounts);
        console.log('✅ تم تحميل شجرة الحسابات:', accounts.length, 'حساب');
    }

    users = getData('users', []);
    if (users.length === 0) {
        users = [
            { id: 1, name: 'المدير', password: '123456', role: 'admin', active: true, createdAt: new Date().toISOString() },
            { id: 2, name: 'مشرف', password: '123456', role: 'manager', active: true, createdAt: new Date().toISOString() },
            { id: 3, name: 'كاشير', password: '123456', role: 'cashier', active: true, createdAt: new Date().toISOString() },
            { id: 4, name: 'مشاهد', password: '123456', role: 'viewer', active: true, createdAt: new Date().toISOString() }
        ];
        setData('users', users);
    }

    products = migrateOldProducts(rawProducts);
    const allZero = products.length > 0 && products.every(p => p.qty === 0);
    if (allZero) { products = []; localStorage.removeItem(STORAGE_KEY + 'products'); }

    if (products.length === 0 && !localStorage.getItem('mizan_seeded')) {
        products = [
            { id: 1, name: 'قلم جاف', barcode: '1001', buy: 2, sell: 5, qty: 50, min: 10, vat: 14 },
            { id: 2, name: 'كشكول 60 ورقة', barcode: '1002', buy: 8, sell: 15, qty: 30, min: 5, vat: 14 },
            { id: 3, name: 'مسطرة 30 سم', barcode: '1003', buy: 3, sell: 7, qty: 40, min: 10, vat: 14 }
        ];
        setData('products', products);
        localStorage.setItem('mizan_seeded', 'true');
    } else {
        setData('products', products);
    }

    populateLoginUsers();

    if ($('expDate')) $('expDate').value = getTodayDate();
    if ($('collectDate')) $('collectDate').value = getTodayDate();
    if ($('payDate')) $('payDate').value = getTodayDate();
    if ($('jeDate')) $('jeDate').value = getTodayDate();

    setTimeout(() => {
        const debitAmt = $('jeDebitAmount');
        const creditAmt = $('jeCreditAmount');
        if (debitAmt) debitAmt.addEventListener('input', updateJournalCheck);
        if (creditAmt) creditAmt.addEventListener('input', updateJournalCheck);
    }, 500);

    updateClock();
    updateHeaderCompanyName();
    populateAllDropdowns();
    renderProducts(); renderCashier(); renderPurchases();
    renderReturns(); renderExpenses(); renderInvoices();
    renderTreasury(); renderCustomers(); renderSuppliers();
    renderPayments(); renderUsers(); renderAudit();
    renderAccounts(); renderJournal();
    updateDashboard();
    renderSettings();

    console.log('✅ الميزان جاهز');
    console.log('📊 الحسابات:', accounts.length);
    console.log('📖 القيود:', journalEntries.length);
}

document.addEventListener('DOMContentLoaded', init);

// ============================================================
// تعريض الدوال للنطاق العام
// ============================================================
window.checkLogin = checkLogin;
window.lockApp = lockApp;
window.navigateTo = navigateTo;
window.syncToCloud = syncToCloud;
window.syncFromCloud = syncFromCloud;

window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.resetProductForm = resetProductForm;

window.updateSalePrice = updateSalePrice;
window.addSaleItem = addSaleItem;
window.removeSaleItem = removeSaleItem;
window.saveSale = saveSale;
window.clearSale = clearSale;
window.updateSaleTotals = updateSaleTotals;

window.updatePurPrice = updatePurPrice;
window.addPurItem = addPurItem;
window.removePurItem = removePurItem;
window.savePurchase = savePurchase;
window.clearPurchase = clearPurchase;
window.viewPurchase = viewPurchase;
window.deletePurchase = deletePurchase;
window.updatePurTotals = updatePurTotals;

window.toggleReturnCustomer = toggleReturnCustomer;
window.updateRetPrice = updateRetPrice;
window.addRetItem = addRetItem;
window.removeRetItem = removeRetItem;
window.saveReturn = saveReturn;
window.clearReturn = clearReturn;
window.deleteReturn = deleteReturn;

window.saveExpense = saveExpense;
window.deleteExpense = deleteExpense;

window.viewInvoice = viewInvoice;
window.deleteInvoice = deleteInvoice;

window.addTreasuryTransaction = addTreasuryTransaction;
window.deleteTreasury = deleteTreasury;

window.saveCustomer = saveCustomer;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.resetCustomerForm = resetCustomerForm;
window.viewCustomerStatement = viewCustomerStatement;
window.openCollectModal = openCollectModal;

window.saveSupplier = saveSupplier;
window.editSupplier = editSupplier;
window.deleteSupplier = deleteSupplier;
window.resetSupplierForm = resetSupplierForm;
window.viewSupplierStatement = viewSupplierStatement;
window.openPayModal = openPayModal;

window.switchPayTab = switchPayTab;
window.updateCollectInfo = updateCollectInfo;
window.updatePayInfo = updatePayInfo;
window.saveCollect = saveCollect;
window.savePay = savePay;
window.showReceipt = showReceipt;
window.showReceiptById = showReceiptById;
window.deletePayment = deletePayment;

window.switchReport = switchReport;

window.saveAccount = saveAccount;
window.editAccount = editAccount;
window.deleteAccount = deleteAccount;
window.resetAccountForm = resetAccountForm;
window.populateAccountDropdowns = populateAccountDropdowns;

window.saveJournalEntry = saveJournalEntry;
window.deleteJournalEntry = deleteJournalEntry;
window.updateJournalCheck = updateJournalCheck;
window.switchAccountsTab = switchAccountsTab;
window.showAccountingReport = showAccountingReport;

window.saveCompanySettings = saveCompanySettings;
window.uploadLogo = uploadLogo;
window.removeLogo = removeLogo;
window.saveVATSettings = saveVATSettings;

window.saveUser = saveUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.toggleUserActive = toggleUserActive;
window.resetUserForm = resetUserForm;

window.toggleAuditItem = toggleAuditItem;
window.filterAudit = filterAudit;
window.exportAuditLog = exportAuditLog;
window.exportAuditLogText = exportAuditLogText;
window.clearAuditLog = clearAuditLog;

window.changePassword = changePassword;
window.exportData = exportData;
window.importData = importData;
window.clearAllData = clearAllData;

window.openModal = openModal;
window.closeModal = closeModal;

console.log('✅ تم تحميل جميع الدوال بنجاح');
console.log('📊 نظام الحسابات المحاسبية جاهز');