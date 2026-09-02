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
let firebaseInitialized = false;
if (typeof firebase !== 'undefined') {
    try {
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseInitialized = true;
        console.log('✅ Firebase initialized');
    } catch (e) {
        console.warn('⚠️ Firebase init error:', e);
    }
} else {
    console.warn('⚠️ Firebase not loaded');
}

// ================================================================
// LOCAL STORAGE HELPERS
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
    const dataKeys = [
        'products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 
        'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts', 
        'permissions', 'backups', 'accounts', 'auditLog', 'alerts', 
        'cashierHistory', 'inventoryAdjustments'
    ];
    
    dataKeys.forEach(key => {
        const varName = key;
        if (typeof window[varName] === 'undefined' || !Array.isArray(window[varName])) {
            window[varName] = getData(key, []);
        }
    });
    
    if (!window.companyData || typeof window.companyData !== 'object') {
        window.companyData = getData('companyData', {});
    }
    
    if (!window.users || !Array.isArray(window.users)) {
        window.users = getData('users', [
            { id: 1, username: 'مدير', role: 'admin', password: '123456' },
            { id: 2, username: 'مشرف', role: 'manager', password: '123456' },
            { id: 3, username: 'كاشير', role: 'cashier', password: '123456' },
            { id: 4, username: 'مشاهد', role: 'viewer', password: '123456' }
        ]);
    }
}

// ================================================================
// SEED DATA
// ================================================================
function seedData() {
    initData();
    
    if (autoRestore()) {
        console.log('✅ استعادة البيانات التلقائية');
        return;
    }

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
    
    if (!window.currentUser || typeof window.currentUser !== 'object') {
        window.currentUser = { username: 'مدير', role: 'admin' };
        localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));
    }
    
    saveAll();
    console.log('✅ تم تهيئة البيانات بنجاح');
}

// ================================================================
// SAVE ALL
// ================================================================
function saveAll() {
    const dataMap = {
        'products': window.products,
        'customers': window.customers,
        'suppliers': window.suppliers,
        'purchases': window.purchases,
        'sales': window.sales,
        'returns': window.returns,
        'expenses': window.expenses,
        'treasury': window.treasury,
        'bonds': window.bonds,
        'warehouses': window.warehouses,
        'warehouseProducts': window.warehouseProducts,
        'permissions': window.permissions,
        'companyData': window.companyData,
        'backups': window.backups,
        'accounts': window.accounts,
        'auditLog': window.auditLog,
        'alerts': window.alerts,
        'cashierHistory': window.cashierHistory,
        'inventoryAdjustments': window.inventoryAdjustments,
        'users': window.users
    };
    
    let savedCount = 0;
    let errors = [];
    
    for (const [key, data] of Object.entries(dataMap)) {
        try {
            if (data !== undefined) {
                setData(key, data);
                savedCount++;
            }
        } catch (e) {
            errors.push({ key, error: e.message });
            console.warn(`⚠️ خطأ في حفظ ${key}:`, e);
        }
    }
    
    try {
        localStorage.setItem('mizan_auto_restore', JSON.stringify({
            ...dataMap,
            savedAt: Date.now()
        }));
    } catch (e) {
        errors.push({ key: 'auto_restore', error: e.message });
    }
    
    if (errors.length > 0) {
        console.warn('⚠️ بعض البيانات لم تُحفظ:', errors);
    }
    
    if (typeof checkLowStockAlert === 'function') checkLowStockAlert();
    
    return { saved: savedCount, errors: errors };
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
                const hasData = window.products && window.products.length > 0;
                const hasWarehouses = window.warehouses && window.warehouses.length > 0;
                
                if (!hasData && !hasWarehouses) {
                    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns',
                        'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts',
                        'permissions', 'companyData', 'backups', 'accounts', 'auditLog', 'alerts',
                        'cashierHistory', 'inventoryAdjustments', 'users'
                    ];
                    
                    keys.forEach(k => {
                        if (parsed[k] !== undefined) {
                            setData(k, parsed[k]);
                            const varName = k;
                            window[varName] = parsed[k];
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
            window[k] = data[k];
            setData(k, data[k]);
        }
    });
    if (data.users) { window.users = data.users; setData('users', data.users); }
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

    if (!firebaseInitialized) {
        showToast('⚠️ Firebase غير متصل', 'warning');
        badge.textContent = '⚠️ غير متصل';
        badge.className = 'badge';
        setTimeout(() => { badge.textContent = '☁️ مزامنة'; badge.className = 'badge'; }, 3000);
        return;
    }

    const data = getSyncData();
    try {
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
    } catch (e) {
        showToast('⚠️ Firebase غير متاح', 'warning');
        badge.textContent = '⚠️ غير متاح';
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

    if (!firebaseInitialized) {
        showToast('⚠️ Firebase غير متصل', 'warning');
        badge.textContent = '⚠️ غير متصل';
        badge.className = 'badge';
        setTimeout(() => { badge.textContent = '☁️ مزامنة'; badge.className = 'badge'; }, 3000);
        return;
    }

    try {
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
    } catch (e) {
        showToast('⚠️ Firebase غير متاح', 'warning');
        badge.textContent = '⚠️ غير متاح';
        badge.className = 'badge';
        setTimeout(() => {
            badge.textContent = '☁️ مزامنة';
            badge.className = 'badge';
        }, 3000);
    }
}

// ================================================================
// GET BACKUP DATA
// ================================================================
function getBackupData() {
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
        cashierHistory: window.cashierHistory || [],
        inventoryAdjustments: window.inventoryAdjustments || [],
        accounts: window.accounts || [],
        auditLog: window.auditLog || [],
        alerts: window.alerts || [],
        users: window.users || [],
        createdAt: new Date().toISOString(),
        version: '3.0.0'
    };
}

// ================================================================
// RESTORE BACKUP DATA
// ================================================================
function restoreBackupData(data) {
    if (!data) return;
    
    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'cashierHistory', 'inventoryAdjustments', 'accounts', 'auditLog', 'alerts', 'users'
    ];
    
    keys.forEach(k => {
        if (data[k] !== undefined) {
            setData(k, data[k]);
            window[k] = data[k];
        }
    });
    
    if (typeof addAuditLog === 'function') addAuditLog('add', 'backup', 'استعادة نسخة احتياطية');
    if (typeof refreshAllPages === 'function') refreshAllPages();
    showToast('✅ تم استعادة البيانات بنجاح', 'success');
}
