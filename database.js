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
            // التأكد من أن القيمة المرجعة هي مصفوفة إذا كان المفتاح يتوقع مصفوفة
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
// INIT DATA - التأكد من تهيئة جميع المتغيرات
// ================================================================
function initData() {
    // التأكد من أن جميع المتغيرات مصفوفات
    if (typeof products === 'undefined' || !Array.isArray(products)) {
        products = [];
        setData('products', products);
    }
    if (typeof customers === 'undefined' || !Array.isArray(customers)) {
        customers = [];
        setData('customers', customers);
    }
    if (typeof suppliers === 'undefined' || !Array.isArray(suppliers)) {
        suppliers = [];
        setData('suppliers', suppliers);
    }
    if (typeof purchases === 'undefined' || !Array.isArray(purchases)) {
        purchases = [];
        setData('purchases', purchases);
    }
    if (typeof sales === 'undefined' || !Array.isArray(sales)) {
        sales = [];
        setData('sales', sales);
    }
    if (typeof returns === 'undefined' || !Array.isArray(returns)) {
        returns = [];
        setData('returns', returns);
    }
    if (typeof expenses === 'undefined' || !Array.isArray(expenses)) {
        expenses = [];
        setData('expenses', expenses);
    }
    if (typeof treasury === 'undefined' || !Array.isArray(treasury)) {
        treasury = [];
        setData('treasury', treasury);
    }
    if (typeof bonds === 'undefined' || !Array.isArray(bonds)) {
        bonds = [];
        setData('bonds', bonds);
    }
    if (typeof warehouses === 'undefined' || !Array.isArray(warehouses)) {
        warehouses = [];
        setData('warehouses', warehouses);
    }
    if (typeof warehouseProducts === 'undefined' || !Array.isArray(warehouseProducts)) {
        warehouseProducts = [];
        setData('warehouseProducts', warehouseProducts);
    }
    if (typeof permissions === 'undefined' || !Array.isArray(permissions)) {
        permissions = [];
        setData('permissions', permissions);
    }
    if (typeof backups === 'undefined' || !Array.isArray(backups)) {
        backups = [];
        setData('backups', backups);
    }
    if (typeof accounts === 'undefined' || !Array.isArray(accounts)) {
        accounts = [];
        setData('accounts', accounts);
    }
    if (typeof auditLog === 'undefined' || !Array.isArray(auditLog)) {
        auditLog = [];
        setData('auditLog', auditLog);
    }
    if (typeof alerts === 'undefined' || !Array.isArray(alerts)) {
        alerts = [];
        setData('alerts', alerts);
    }
    if (typeof cashierHistory === 'undefined' || !Array.isArray(cashierHistory)) {
        cashierHistory = [];
        setData('cashierHistory', cashierHistory);
    }
    if (typeof inventoryAdjustments === 'undefined' || !Array.isArray(inventoryAdjustments)) {
        inventoryAdjustments = [];
        setData('inventoryAdjustments', inventoryAdjustments);
    }
    if (!companyData || typeof companyData !== 'object') {
        companyData = {};
        setData('companyData', companyData);
    }
    if (!users || !Array.isArray(users)) {
        users = [
            { id: 1, username: 'مدير', role: 'admin' },
            { id: 2, username: 'مشرف', role: 'manager' },
            { id: 3, username: 'كاشير', role: 'cashier' },
            { id: 4, username: 'مشاهد', role: 'viewer' }
        ];
        setData('users', users);
    }
}

// ================================================================
// SEED DATA
// ================================================================
function seedData() {
    // التأكد من تهيئة البيانات أولاً
    initData();
    
    // محاولة استعادة البيانات التلقائية
    if (autoRestore()) {
        console.log('✅ استعادة البيانات التلقائية');
        products = getData('products', []);
        customers = getData('customers', []);
        suppliers = getData('suppliers', []);
        warehouses = getData('warehouses', []);
        return;
    }

    // التأكد من أن المتغيرات مصفوفات
    products = getData('products', []);
    customers = getData('customers', []);
    suppliers = getData('suppliers', []);
    warehouses = getData('warehouses', []);
    warehouseProducts = getData('warehouseProducts', []);
    accounts = getData('accounts', []);
    companyData = getData('companyData', {});
    cashierHistory = getData('cashierHistory', []);
    inventoryAdjustments = getData('inventoryAdjustments', []);

    // إضافة البيانات الافتراضية فقط إذا كانت فارغة
    if (warehouses.length === 0) {
        warehouses = [
            { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
            { id: 2, name: 'مخزن المحل', type: 'محل', address: 'المنصورة' }
        ];
        setData('warehouses', warehouses);
    }
    if (products.length === 0) {
        products = [
            { id: 1, name: 'منتج تجريبي 1', buyPrice: 50, sellPrice: 100, min: 5, barcode: '123456789' },
            { id: 2, name: 'منتج تجريبي 2', buyPrice: 30, sellPrice: 75, min: 3, barcode: '987654321' }
        ];
        setData('products', products);
        if (warehouseProducts.length === 0) {
            warehouseProducts = [
                { warehouseId: 1, productId: 1, qty: 50 },
                { warehouseId: 1, productId: 2, qty: 30 },
                { warehouseId: 2, productId: 1, qty: 10 },
                { warehouseId: 2, productId: 2, qty: 5 }
            ];
            setData('warehouseProducts', warehouseProducts);
        }
    }
    if (customers.length === 0) {
        customers = [{
            id: 1,
            name: 'أحمد محمد',
            phone: '01234567890',
            whatsapp: '01011993799',
            email: 'ahmed@test.com',
            address: 'القاهرة',
            active: true
        }];
        setData('customers', customers);
    }
    if (suppliers.length === 0) {
        suppliers = [{
            id: 1,
            name: 'شركة الاتصالات',
            phone: '0234567890',
            whatsapp: '01158767633',
            email: 'info@telecom.com',
            address: 'القاهرة',
            active: true
        }];
        setData('suppliers', suppliers);
    }
    if (accounts.length === 0) {
        accounts = [
            { id: 1, name: 'أصول', type: 'assets', parentId: null },
            { id: 2, name: 'خصوم', type: 'liabilities', parentId: null },
            { id: 3, name: 'حقوق ملكية', type: 'equity', parentId: null },
            { id: 4, name: 'إيرادات', type: 'revenue', parentId: null },
            { id: 5, name: 'مصروفات', type: 'expenses', parentId: null }
        ];
        setData('accounts', accounts);
    }
    if (!companyData || typeof companyData !== 'object' || Object.keys(companyData).length === 0) {
        companyData = {
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
        setData('companyData', companyData);
    }
    
    saveAll();
    console.log('✅ تم تهيئة البيانات بنجاح');
}

// ================================================================
// SAVE ALL
// ================================================================
function saveAll() {
    try {
        setData('products', products);
        setData('customers', customers);
        setData('suppliers', suppliers);
        setData('purchases', purchases);
        setData('sales', sales);
        setData('returns', returns);
        setData('expenses', expenses);
        setData('treasury', treasury);
        setData('bonds', bonds);
        setData('warehouses', warehouses);
        setData('warehouseProducts', warehouseProducts);
        setData('permissions', permissions);
        setData('companyData', companyData);
        setData('backups', backups);
        setData('accounts', accounts);
        setData('auditLog', auditLog);
        setData('alerts', alerts);
        setData('cashierHistory', cashierHistory);
        setData('inventoryAdjustments', inventoryAdjustments);
        setData('users', users);
        
        localStorage.setItem('mizan_auto_restore', JSON.stringify({
            products, customers, suppliers, purchases, sales, returns,
            expenses, treasury, bonds, warehouses, warehouseProducts,
            permissions, companyData, backups, accounts, auditLog, alerts, cashierHistory,
            inventoryAdjustments, users,
            savedAt: Date.now()
        }));
        checkLowStockAlert();
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
                if (products.length === 0 && warehouses.length === 0) {
                    ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns',
                        'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts',
                        'permissions', 'companyData', 'backups', 'accounts', 'auditLog', 'alerts',
                        'cashierHistory', 'inventoryAdjustments', 'users'
                    ].forEach(k => {
                        if (parsed[k]) {
                            setData(k, parsed[k]);
                            if (k === 'products') products = parsed[k];
                            else if (k === 'customers') customers = parsed[k];
                            else if (k === 'suppliers') suppliers = parsed[k];
                            else if (k === 'purchases') purchases = parsed[k];
                            else if (k === 'sales') sales = parsed[k];
                            else if (k === 'returns') returns = parsed[k];
                            else if (k === 'expenses') expenses = parsed[k];
                            else if (k === 'treasury') treasury = parsed[k];
                            else if (k === 'bonds') bonds = parsed[k];
                            else if (k === 'warehouses') warehouses = parsed[k];
                            else if (k === 'warehouseProducts') warehouseProducts = parsed[k];
                            else if (k === 'permissions') permissions = parsed[k];
                            else if (k === 'companyData') companyData = parsed[k] || {};
                            else if (k === 'backups') backups = parsed[k];
                            else if (k === 'accounts') accounts = parsed[k];
                            else if (k === 'auditLog') auditLog = parsed[k];
                            else if (k === 'alerts') alerts = parsed[k];
                            else if (k === 'cashierHistory') cashierHistory = parsed[k] || [];
                            else if (k === 'inventoryAdjustments') inventoryAdjustments = parsed[k] || [];
                            else if (k === 'users') users = parsed[k];
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