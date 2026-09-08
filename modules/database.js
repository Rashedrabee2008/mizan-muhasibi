// ================================================================
// database.js - إدارة التخزين (localStorage)
// ================================================================

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

// تعريض الدوال للنطاق العام
window.getData = getData;
window.setData = setData;
window.initData = initData;
window.saveAll = saveAll;
window.autoRestore = autoRestore;
window.getBackupData = getBackupData;
window.restoreBackupData = restoreBackupData;
