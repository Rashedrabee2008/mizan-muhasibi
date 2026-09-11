// ============================================================
// الميزان 13.0.0 - الجزء 1: الأساسيات
// المتغيرات + الأدوات + Firebase + المستخدمين + الحسابات
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

// ✅ المتغيرات العامة (window. عشان تبان في الملفات التانية)
window.firebaseReady = false;
window.CLOUD_PATH = 'mizan_data';

window.products = [];
window.sales = [];
window.purchases = [];
window.returns = [];
window.expenses = [];
window.customers = [];
window.suppliers = [];
window.treasury = [];
window.payments = [];
window.users = [];
window.auditLog = [];
window.accounts = [];
window.journalEntries = [];
window.inventoryMovements = [];

window.currentUser = null;
window.currentSaleItems = [];
window.currentPurItems = [];
window.currentRetItems = [];
window.currentSettleItems = [];
window.companyData = {};
window.currentReport = 'daily';
window.currentAuditFilter = 'all';
window.currentInvoiceFilter = 'all';
window.currentTreasuryFilter = 'all';
window.currentMovementFilter = 'all';
window.vatSettings = { defaultVAT: 14 };

// ============================================================
// أدوات مساعدة
// ============================================================
window.$ = function(id) { return document.getElementById(id); };

window.getData = function(key, def = []) {
    try {
        const d = localStorage.getItem(STORAGE_KEY + key);
        return d ? JSON.parse(d) : def;
    } catch (e) { return def; }
};

window.setData = function(key, data) {
    try { localStorage.setItem(STORAGE_KEY + key, JSON.stringify(data)); } catch (e) {}
};

window.showToast = function(msg, type = 'info') {
    const t = $('toast'); if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.className = 'toast'; }, 3000);
};

window.getTodayDate = function() { return new Date().toISOString().split('T')[0]; };
window.formatMoney = function(n) { return Number(n || 0).toFixed(2); };
window.getNowTime = function() { return new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }); };

window.getRadioValue = function(name, defaultValue = '') {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : defaultValue;
};

window.setRadioValue = function(name, value) {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
};

window.migrateOldProducts = function(oldProducts) {
    if (!Array.isArray(oldProducts)) return [];
    return oldProducts.map(p => {
        if (!p || typeof p !== 'object') return null;
        let qty = 0;
        if (typeof p.qty === 'number') qty = p.qty;
        else if (typeof p.quantity === 'number') qty = p.quantity;
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
};

// ============================================================
// تسجيل حركات المخزون
// ============================================================
window.logInventoryMovement = function(data) {
    const movement = {
        id: Date.now() + Math.random(),
        productId: data.productId,
        productName: data.productName,
        type: data.type,
        qty: data.qty,
        price: data.price || 0,
        reason: data.reason || 'adjustment',
        refType: data.refType || 'manual',
        refId: data.refId || null,
        refNumber: data.refNumber || null,
        balanceBefore: data.balanceBefore || 0,
        balanceAfter: data.balanceAfter || 0,
        notes: data.notes || '',
        userName: currentUser ? currentUser.name : 'نظام',
        date: getTodayDate(),
        time: getNowTime(),
        createdAt: new Date().toISOString()
    };
    inventoryMovements.unshift(movement);
    if (inventoryMovements.length > 5000) window.inventoryMovements = inventoryMovements.slice(0, 5000);
    setData('inventoryMovements', inventoryMovements);
    return movement;
};

// ============================================================
// المستخدمين والصلاحيات
// ============================================================
window.ROLES = {
    admin: { name: 'مدير', icon: '👑', color: '#E06060' },
    manager: { name: 'مشرف', icon: '📊', color: '#C9A94E' },
    cashier: { name: 'كاشير', icon: '💰', color: '#4A8AB5' },
    viewer: { name: 'مشاهد', icon: '👁️', color: '#5D5D5D' }
};

window.hasPermission = function(permission) {
    if (!currentUser) return false;
    const role = currentUser.role;
    const permissions = {
        admin: ['add', 'edit', 'delete', 'view', 'manage_users', 'view_audit', 'clear_data', 'add_sale'],
        manager: ['add', 'edit', 'view', 'add_sale'],
        cashier: ['add_sale', 'view'],
        viewer: ['view']
    };
    return (permissions[role] || []).includes(permission);
};

window.isAdmin = function() { return currentUser && currentUser.role === 'admin'; };
window.isManager = function() { return currentUser && currentUser.role === 'manager'; };
window.canAdd = function() { return hasPermission('add') || hasPermission('add_sale'); };
window.canEdit = function() { return hasPermission('edit'); };
window.canDelete = function() { return hasPermission('delete'); };
window.canView = function() { return hasPermission('view'); };
window.canManageUsers = function() { return hasPermission('manage_users'); };
window.canViewAudit = function() { return hasPermission('view_audit'); };
window.canClearData = function() { return hasPermission('clear_data'); };

// ============================================================
// سجل النشاطات
// ============================================================
window.addAuditLog = function(action, type, details, extraData = null) {
    const log = {
        id: Date.now() + Math.random(),
        action: action,
        type: type,
        details: details,
        extraData: extraData,
        userName: currentUser ? currentUser.name : 'غير معروف',
        userRole: currentUser ? currentUser.role : 'unknown',
        date: getTodayDate(),
        time: getNowTime(),
        createdAt: new Date().toISOString()
    };
    auditLog.unshift(log);
    if (auditLog.length > 2000) window.auditLog = auditLog.slice(0, 2000);
    setData('auditLog', auditLog);
};

// ============================================================
// شجرة الحسابات الافتراضية
// ============================================================
window.DEFAULT_ACCOUNTS = [
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
    { id: 12, code: '2000', name: 'الخصوم', type: 'liabilities', parentId: null, isParent: true },
    { id: 13, code: '2100', name: 'الخصوم المتداولة', type: 'liabilities', parentId: 12, isParent: true },
    { id: 14, code: '2101', name: 'الموردين (الدائنون)', type: 'liabilities', parentId: 13, isParent: false },
    { id: 15, code: '2102', name: 'ضريبة القيمة المضافة (دائن)', type: 'liabilities', parentId: 13, isParent: false },
    { id: 16, code: '2103', name: 'مصروفات مستحقة', type: 'liabilities', parentId: 13, isParent: false },
    { id: 17, code: '2200', name: 'الخصوم طويلة الأجل', type: 'liabilities', parentId: 12, isParent: true },
    { id: 18, code: '2201', name: 'قروض طويلة الأجل', type: 'liabilities', parentId: 17, isParent: false },
    { id: 19, code: '3000', name: 'حقوق الملكية', type: 'equity', parentId: null, isParent: true },
    { id: 20, code: '3001', name: 'رأس المال', type: 'equity', parentId: 19, isParent: false },
    { id: 21, code: '3002', name: 'الأرباح المحتجزة', type: 'equity', parentId: 19, isParent: false },
    { id: 22, code: '3003', name: 'المسحوبات الشخصية', type: 'equity', parentId: 19, isParent: false },
    { id: 23, code: '4000', name: 'الإيرادات', type: 'revenue', parentId: null, isParent: true },
    { id: 24, code: '4001', name: 'إيرادات المبيعات', type: 'revenue', parentId: 23, isParent: false },
    { id: 25, code: '4002', name: 'إيرادات أخرى', type: 'revenue', parentId: 23, isParent: false },
    { id: 26, code: '4003', name: 'خصم مسموح به', type: 'revenue', parentId: 23, isParent: false },
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
window.initFirebase = function() {
    try {
        if (typeof firebase === 'undefined') return false;
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        window.firebaseReady = true;
        console.log('✅ Firebase جاهز');
        return true;
    } catch (e) {
        console.error('❌ خطأ Firebase:', e);
        window.firebaseReady = false;
        return false;
    }
};

window.getFirebaseRef = function() {
    if (!firebaseReady) return null;
    try { return firebase.database().ref(CLOUD_PATH); }
    catch (e) { return null; }
};

window.updateSyncStatus = function(msg, type = 'info') {
    const el = $('syncStatus');
    if (!el) return;
    const colors = { success: '#2D8F5E', error: '#E06060', info: '#C9A94E', warning: '#E6A830' };
    el.style.color = colors[type] || '#A89070';
    el.textContent = msg;
    if (type === 'success' || type === 'error') {
        setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 5000);
    }
};

window.syncToCloud = function() {
    const ref = getFirebaseRef();
    if (!ref) { showToast('⚠️ Firebase غير متصل', 'error'); return; }
    
    function cleanForFirebase(obj) {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) return obj.map(cleanForFirebase);
        if (typeof obj === 'object') {
            const cleaned = {};
            for (const key in obj) {
                if (!obj.hasOwnProperty(key)) continue;
                const val = obj[key];
                if (val === undefined || val === null) cleaned[key] = null;
                else if (typeof val === 'number' && !isFinite(val)) cleaned[key] = 0;
                else if (typeof val === 'object') cleaned[key] = cleanForFirebase(val);
                else cleaned[key] = val;
            }
            return cleaned;
        }
        return obj;
    }
    
    const data = cleanForFirebase({
        products: products || [], sales: sales || [], purchases: purchases || [],
        returns: returns || [], expenses: expenses || [], customers: customers || [],
        suppliers: suppliers || [], treasury: treasury || [], payments: payments || [],
        companyData: companyData || {}, users: users || [], auditLog: auditLog || [],
        vatSettings: vatSettings || { defaultVAT: 14 }, accounts: accounts || [],
        journalEntries: journalEntries || [], inventoryMovements: inventoryMovements || [],
        lastSync: new Date().toISOString(), version: '13.0.0'
    });
    
    updateSyncStatus('⏳ جاري الرفع...', 'info');
    showToast('⏳ جاري الرفع...', 'info');
    ref.set(data)
        .then(() => {
            showToast('✅ تم الرفع للسحابة بنجاح', 'success');
            updateSyncStatus('✅ تم الرفع بنجاح - ' + getNowTime(), 'success');
            addAuditLog('edit', 'cloud', 'رفع البيانات للسحابة');
        })
        .catch((err) => { showToast('❌ فشل الرفع: ' + err.message, 'error'); });
};

window.syncFromCloud = function() {
    const ref = getFirebaseRef();
    if (!ref) { showToast('⚠️ Firebase غير متصل', 'error'); return; }
    if (!confirm('⚠️ سيتم استبدال البيانات الحالية. متابعة؟')) return;
    updateSyncStatus('⏳ جاري الجلب...', 'info');
    showToast('⏳ جاري الجلب...', 'info');
    ref.once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) { showToast('⚠️ لا توجد بيانات', 'warning'); return; }
            const data = snapshot.val();
            if (data.products) window.products = data.products;
            if (data.sales) window.sales = data.sales;
            if (data.purchases) window.purchases = data.purchases;
            if (data.returns) window.returns = data.returns;
            if (data.expenses) window.expenses = data.expenses;
            if (data.customers) window.customers = data.customers;
            if (data.suppliers) window.suppliers = data.suppliers;
            if (data.treasury) window.treasury = data.treasury;
            if (data.payments) window.payments = data.payments;
            if (data.companyData) window.companyData = data.companyData;
            if (data.users) window.users = data.users;
            if (data.auditLog) window.auditLog = data.auditLog;
            if (data.vatSettings) window.vatSettings = data.vatSettings;
            if (data.accounts) window.accounts = data.accounts;
            if (data.journalEntries) window.journalEntries = data.journalEntries;
            if (data.inventoryMovements) window.inventoryMovements = data.inventoryMovements;
            saveAll();
            populateAllDropdowns();
            refreshAllViews();
            showToast('✅ تم الجلب من السحابة', 'success');
        })
        .catch((err) => { showToast('❌ فشل الجلب: ' + err.message, 'error'); });
};

// ============================================================
// الساعة
// ============================================================
window.updateClock = function() {
    const el = $('liveDateTime'); if (!el) return;
    const now = new Date();
    const date = String(now.getDate()).padStart(2, '0') + '/' +
                 String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
    const time = now.toLocaleTimeString('en-GB', { hour12: false });
    el.textContent = date + ' ' + time;
};
setInterval(updateClock, 1000);

// ============================================================
// تسجيل الدخول
// ============================================================
window.populateLoginUsers = function() {
    const sel = $('loginUsername');
    if (!sel) return;
    sel.innerHTML = '';
    users.forEach(u => {
        if (u.active !== false) {
            sel.innerHTML += `<option value="${u.id}">${u.name} (${ROLES[u.role]?.name || u.role})</option>`;
        }
    });
};

window.checkLogin = function() {
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
    window.currentUser = user;
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
};

window.lockApp = function() {
    if (currentUser) {
        addAuditLog('login', 'user', `تسجيل خروج: ${currentUser.name}`, { userId: currentUser.id });
    }
    window.currentUser = null;
    localStorage.removeItem(STORAGE_KEY + 'current_user');
    const loginCont = $('loginContainer');
    const appCont = $('appContent');
    if (loginCont) loginCont.classList.remove('hidden');
    if (appCont) appCont.style.display = 'none';
    populateLoginUsers();
};

window.updateUserUI = function() {
    if (!currentUser) return;
    if ($('currentUserName')) $('currentUserName').textContent = currentUser.name;
    if ($('currentUserForPassword')) $('currentUserForPassword').textContent = currentUser.name;
};

window.applyPermissions = function() {
    const role = currentUser ? currentUser.role : 'viewer';
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = (role === 'admin') ? '' : 'none';
    });
    const dangerZone = $('dangerZone');
    if (dangerZone) dangerZone.style.display = isAdmin() ? '' : 'none';
    const userForm = $('userFormCard');
    if (userForm) userForm.style.display = isAdmin() ? '' : 'none';
};

// ============================================================
// التنقل
// ============================================================
window.navigateTo = function(page) {
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
    if (page === 'inventory-movements') renderInventoryMovements();
    if (page === 'company') renderCompanyPage();
    if (page === 'users') renderUsers();
    if (page === 'audit') renderAudit();
    if (page === 'settings') renderSettings();

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================
// Modal
// ============================================================
window.openModal = function(html) {
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
};

window.closeModal = function() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('show');
};

console.log('✅ تم تحميل app-part1.js - الأساسيات');