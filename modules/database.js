// ================================================================
// database.js - إدارة التخزين (localStorage + Firebase)
// ================================================================

// ================================================================
// FIREBASE CONFIG
// ================================================================
const firebaseConfig = {
    apiKey: "AIzaSyCP7vpqviR6A11gPkC7cO6MQJBGKWcnVWE",
    authDomain: "accounting-balance-ab9d3.firebaseapp.com",
    databaseURL: "https://accounting-balance-ab9d3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "accounting-balance-ab9d3",
    storageBucket: "accounting-balance-ab9d3.firebasestorage.app",
    messagingSenderId: "564321427560",
    appId: "1:564321427560:web:ae44d18b626ad2e5771bdd",
    measurementId: "G-MGT87N4TG4"
};

// تهيئة Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
} else {
    console.warn('⚠️ Firebase not loaded');
}

// ================================================================
// LOCAL STORAGE
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
// INIT DATA
// ================================================================
function initData() {
    // تعريف المتغيرات العامة إذا لم تكن موجودة
    if (typeof products === 'undefined' || !Array.isArray(products)) {
        window.products = [];
        setData('products', window.products);
    }
    if (typeof customers === 'undefined' || !Array.isArray(customers)) {
        window.customers = [];
        setData('customers', window.customers);
    }
    if (typeof suppliers === 'undefined' || !Array.isArray(suppliers)) {
        window.suppliers = [];
        setData('suppliers', window.suppliers);
    }
    if (typeof purchases === 'undefined' || !Array.isArray(purchases)) {
        window.purchases = [];
        setData('purchases', window.purchases);
    }
    if (typeof sales === 'undefined' || !Array.isArray(sales)) {
        window.sales = [];
        setData('sales', window.sales);
    }
    if (typeof returns === 'undefined' || !Array.isArray(returns)) {
        window.returns = [];
        setData('returns', window.returns);
    }
    if (typeof expenses === 'undefined' || !Array.isArray(expenses)) {
        window.expenses = [];
        setData('expenses', window.expenses);
    }
    if (typeof treasury === 'undefined' || !Array.isArray(treasury)) {
        window.treasury = [];
        setData('treasury', window.treasury);
    }
    if (typeof bonds === 'undefined' || !Array.isArray(bonds)) {
        window.bonds = [];
        setData('bonds', window.bonds);
    }
    if (typeof warehouses === 'undefined' || !Array.isArray(warehouses)) {
        window.warehouses = [];
        setData('warehouses', window.warehouses);
    }
    if (typeof warehouseProducts === 'undefined' || !Array.isArray(warehouseProducts)) {
        window.warehouseProducts = [];
        setData('warehouseProducts', window.warehouseProducts);
    }
    if (typeof permissions === 'undefined' || !Array.isArray(permissions)) {
        window.permissions = [];
        setData('permissions', window.permissions);
    }
    if (typeof backups === 'undefined' || !Array.isArray(backups)) {
        window.backups = [];
        setData('backups', window.backups);
    }
    if (typeof accounts === 'undefined' || !Array.isArray(accounts)) {
        window.accounts = [];
        setData('accounts', window.accounts);
    }
    if (typeof auditLog === 'undefined' || !Array.isArray(auditLog)) {
        window.auditLog = [];
        setData('auditLog', window.auditLog);
    }
    if (typeof alerts === 'undefined' || !Array.isArray(alerts)) {
        window.alerts = [];
        setData('alerts', window.alerts);
    }
    if (typeof cashierHistory === 'undefined' || !Array.isArray(cashierHistory)) {
        window.cashierHistory = [];
        setData('cashierHistory', window.cashierHistory);
    }
    if (typeof inventoryAdjustments === 'undefined' || !Array.isArray(inventoryAdjustments)) {
        window.inventoryAdjustments = [];
        setData('inventoryAdjustments', window.inventoryAdjustments);
    }
    if (!window.companyData || typeof window.companyData !== 'object') {
        window.companyData = {};
        setData('companyData', window.companyData);
    }
    if (!window.users || !Array.isArray(window.users)) {
        window.users = [
            { id: 1, username: 'مدير', role: 'admin' },
            { id: 2, username: 'مشرف', role: 'manager' },
            { id: 3, username: 'كاشير', role: 'cashier' },
            { id: 4, username: 'مشاهد', role: 'viewer' }
        ];
        setData('users', window.users);
    }
}

// ================================================================
// SEED DATA
// ================================================================
function seedData() {
    initData();
    
    if (autoRestore()) {
        console.log('✅ استعادة البيانات التلقائية');
        window.products = getData('products', []);
        window.customers = getData('customers', []);
        window.suppliers = getData('suppliers', []);
        window.warehouses = getData('warehouses', []);
        return;
    }

    window.products = getData('products', []);
    window.customers = getData('customers', []);
    window.suppliers = getData('suppliers', []);
    window.warehouses = getData('warehouses', []);
    window.warehouseProducts = getData('warehouseProducts', []);
    window.accounts = getData('accounts', []);
    window.companyData = getData('companyData', {});
    window.cashierHistory = getData('cashierHistory', []);
    window.inventoryAdjustments = getData('inventoryAdjustments', []);

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
        if (typeof checkLowStockAlert === 'function') checkLowStockAlert();
    } catch (e) {
        console.warn('⚠️ خطأ في الحفظ:', e);
    }
}

// ================================================================
// AUTO RESTORE
// ================================================================
function autoRestore() {
    try {
        const data = localStorage.getItem('mizan_auto_restore');
        if (data) {
            const parsed = JSON.parse(data);
            if (parsed.savedAt && (Date.now() - parsed.savedAt) < 7 * 24 * 60 * 60 * 1000) {
                if (window.products.length === 0 && window.warehouses.length === 0) {
                    ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns',
                        'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts',
                        'permissions', 'companyData', 'backups', 'accounts', 'auditLog', 'alerts',
                        'cashierHistory', 'inventoryAdjustments', 'users'
                    ].forEach(k => {
                        if (parsed[k]) {
                            setData(k, parsed[k]);
                            if (k === 'products') window.products = parsed[k];
                            else if (k === 'customers') window.customers = parsed[k];
                            else if (k === 'suppliers') window.suppliers = parsed[k];
                            else if (k === 'purchases') window.purchases = parsed[k];
                            else if (k === 'sales') window.sales = parsed[k];
                            else if (k === 'returns') window.returns = parsed[k];
                            else if (k === 'expenses') window.expenses = parsed[k];
                            else if (k === 'treasury') window.treasury = parsed[k];
                            else if (k === 'bonds') window.bonds = parsed[k];
                            else if (k === 'warehouses') window.warehouses = parsed[k];
                            else if (k === 'warehouseProducts') window.warehouseProducts = parsed[k];
                            else if (k === 'permissions') window.permissions = parsed[k];
                            else if (k === 'companyData') window.companyData = parsed[k] || {};
                            else if (k === 'backups') window.backups = parsed[k];
                            else if (k === 'accounts') window.accounts = parsed[k];
                            else if (k === 'auditLog') window.auditLog = parsed[k];
                            else if (k === 'alerts') window.alerts = parsed[k];
                            else if (k === 'cashierHistory') window.cashierHistory = parsed[k] || [];
                            else if (k === 'inventoryAdjustments') window.inventoryAdjustments = parsed[k] || [];
                            else if (k === 'users') window.users = parsed[k];
                        }
                    });
                    return true;
                }
            }
        }
    } catch (e) {
        console.warn('⚠️ خطأ في الاستعادة التلقائية:', e);
    }
    return false;
}

// ================================================================
// FIREBASE SYNC
// ================================================================
const SYNC_KEY = 'mizan_app_data';

function getSyncData() {
    return {
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
        currentUser: window.currentUser || { username: 'مدير', role: 'admin' },
        updatedAt: new Date().toISOString()
    };
}

function applySyncData(data) {
    if (!data) return;
    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'
    ];
    keys.forEach(k => {
        if (data[k] !== undefined) {
            if (k === 'products') window.products = data[k];
            else if (k === 'customers') window.customers = data[k];
            else if (k === 'suppliers') window.suppliers = data[k];
            else if (k === 'purchases') window.purchases = data[k];
            else if (k === 'sales') window.sales = data[k];
            else if (k === 'returns') window.returns = data[k];
            else if (k === 'expenses') window.expenses = data[k];
            else if (k === 'treasury') window.treasury = data[k];
            else if (k === 'bonds') window.bonds = data[k];
            else if (k === 'warehouses') window.warehouses = data[k];
            else if (k === 'warehouseProducts') window.warehouseProducts = data[k];
            else if (k === 'permissions') window.permissions = data[k];
            else if (k === 'companyData') window.companyData = data[k] || {};
            else if (k === 'backups') window.backups = data[k];
            else if (k === 'accounts') window.accounts = data[k];
            else if (k === 'auditLog') window.auditLog = data[k];
            else if (k === 'alerts') window.alerts = data[k];
            else if (k === 'cashierHistory') window.cashierHistory = data[k] || [];
            else if (k === 'inventoryAdjustments') window.inventoryAdjustments = data[k] || [];
            setData(k, data[k]);
        }
    });
    if (data.users) { window.users = data.users; saveUsers(); }
    if (data.currentUser) {
        window.currentUser = data.currentUser;
        localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));
    }
    if (typeof refreshAllPages === 'function') refreshAllPages();
    showToast('✅ تم مزامنة البيانات من السحابة', 'success');
}

function syncToFirebase() {
    const badge = document.getElementById('headerBadge');
    if (!badge) return;
    badge.textContent = '⏳ جاري...';
    badge.className = 'badge syncing';

    const data = getSyncData();
    if (typeof firebase !== 'undefined' && firebase.database) {
        firebase.database().ref(SYNC_KEY).set(data)
            .then(() => {
                badge.textContent = '☁️ تم المزامنة';
                badge.className = 'badge synced';
                showToast('☁️ تم رفع البيانات للسحابة بنجاح', 'success');
                if (typeof addAuditLog === 'function') addAuditLog('add', 'sync', 'رفع البيانات للسحابة');
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
        showToast('⚠️ Firebase غير متصل', 'warning');
        badge.textContent = '⚠️ غير متصل';
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
    badge.textContent = '⏳ جلب...';
    badge.className = 'badge syncing';

    if (typeof firebase !== 'undefined' && firebase.database) {
        firebase.database().ref(SYNC_KEY).get()
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    if (data && typeof data === 'object' && data.products !== undefined) {
                        applySyncData(data);
                        badge.textContent = '☁️ تم الجلب';
                        badge.className = 'badge synced';
                        showToast('📥 تم جلب البيانات من السحابة بنجاح', 'success');
                        if (typeof addAuditLog === 'function') addAuditLog('add', 'sync', 'جلب البيانات من السحابة');
                        setTimeout(() => {
                            badge.textContent = '☁️ مزامنة';
                            badge.className = 'badge';
                        }, 3000);
                    } else {
                        showToast('⚠️ بيانات غير مكتملة في السحابة', 'warning');
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
        showToast('⚠️ Firebase غير متصل', 'warning');
        badge.textContent = '⚠️ غير متصل';
        badge.className = 'badge';
        setTimeout(() => {
            badge.textContent = '☁️ مزامنة';
            badge.className = 'badge';
        }, 3000);
    }
}

// ================================================================
// SAVE USERS
// ================================================================
function saveUsers() { 
    localStorage.setItem('mizan_users', JSON.stringify(window.users));
    localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser)); 
}

// ================================================================
// GET BACKUP DATA
// ================================================================
function getBackupData() {
    return {
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
}

// ================================================================
// RESTORE BACKUP DATA
// ================================================================
function restoreBackupData(data) {
    ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'cashierHistory', 'inventoryAdjustments'
    ].forEach(k => {
        if (data[k]) {
            setData(k, data[k]);
            if (k === 'products') window.products = data[k];
            else if (k === 'customers') window.customers = data[k];
            else if (k === 'suppliers') window.suppliers = data[k];
            else if (k === 'purchases') window.purchases = data[k];
            else if (k === 'sales') window.sales = data[k];
            else if (k === 'returns') window.returns = data[k];
            else if (k === 'expenses') window.expenses = data[k];
            else if (k === 'treasury') window.treasury = data[k];
            else if (k === 'bonds') window.bonds = data[k];
            else if (k === 'warehouses') window.warehouses = data[k];
            else if (k === 'warehouseProducts') window.warehouseProducts = data[k];
            else if (k === 'permissions') window.permissions = data[k];
            else if (k === 'companyData') window.companyData = data[k] || {};
            else if (k === 'backups') window.backups = data[k];
            else if (k === 'cashierHistory') window.cashierHistory = data[k] || [];
            else if (k === 'inventoryAdjustments') window.inventoryAdjustments = data[k] || [];
        }
    });
    if (typeof addAuditLog === 'function') addAuditLog('add', 'backup', 'استعادة نسخة من QR');
    if (typeof refreshAllPages === 'function') refreshAllPages();
    showToast('✅ تم استعادة البيانات بنجاح', 'success');
}