// ================================================================
// ================================================================
// app.js - الملف الرئيسي (نسخة مضبوطة بالكامل)
// ================================================================
// ================================================================

// ================================================================
// دوال التاريخ والوقت (في النطاق العام)
// ================================================================

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
    const now = new Date();
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return hours + ':' + minutes + ' ' + ampm;
}

// ================================================================
// CONFIG
// ================================================================
const DEFAULT_PASSWORD = '123456';
let currentPassword = localStorage.getItem('app_password') || DEFAULT_PASSWORD;
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
    
    console.log('✅ تم تهيئة البيانات');
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

// ================================================================
// PERMISSIONS
// ================================================================
function hasPermission(action) {
    const role = window.currentUser?.role || 'viewer';
    if (role === 'admin') return true;
    if (role === 'manager') return ['add', 'edit', 'view'].includes(action);
    if (role === 'cashier') return ['add', 'view'].includes(action);
    if (role === 'viewer') return ['view'].includes(action);
    return false;
}

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

// ================================================================
// UPDATE UI BY PERMISSIONS
// ================================================================
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
// LOGIN
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

// ================================================================
// LOCK / LOGOUT
// ================================================================
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

    if (typeof closeMorePanel === 'function') closeMorePanel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof refreshPage === 'function') refreshPage(pageId);
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
// SEED DATA - بيانات افتراضية
// ================================================================
function seedData() {
    if (!window.products || window.products.length === 0) {
        window.products = [
            { id: 1, name: 'منتج تجريبي 1', buyPrice: 50, sellPrice: 100, min: 5, barcode: '123456789' },
            { id: 2, name: 'منتج تجريبي 2', buyPrice: 30, sellPrice: 75, min: 3, barcode: '987654321' }
        ];
        setData('products', window.products);
    }
    if (!window.warehouses || window.warehouses.length === 0) {
        window.warehouses = [
            { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
            { id: 2, name: 'مخزن المحل', type: 'محل', address: 'المنصورة' }
        ];
        setData('warehouses', window.warehouses);
    }
    if (!window.customers || window.customers.length === 0) {
        window.customers = [{ id: 1, name: 'أحمد محمد', phone: '01234567890', whatsapp: '01011993799', email: 'ahmed@test.com', address: 'القاهرة', active: true }];
        setData('customers', window.customers);
    }
    if (!window.suppliers || window.suppliers.length === 0) {
        window.suppliers = [{ id: 1, name: 'شركة الاتصالات', phone: '0234567890', whatsapp: '01158767633', email: 'info@telecom.com', address: 'القاهرة', active: true }];
        setData('suppliers', window.suppliers);
    }
    if (!window.accounts || window.accounts.length === 0) {
        window.accounts = [
            { id: 1, name: 'أصول', type: 'assets', parentId: null },
            { id: 2, name: 'خصوم', type: 'liabilities', parentId: null },
            { id: 3, name: 'حقوق ملكية', type: 'equity', parentId: null },
            { id: 4, name: 'إيرادات', type: 'revenue', parentId: null },
            { id: 5, name: 'مصروفات', type: 'expenses', parentId: null }
        ];
        setData('accounts', window.accounts);
    }
    saveAll();
}

// ================================================================
// POPULATE SELECTS
// ================================================================
function populateAllSelects() {
    // المنتجات
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

    // المخازن
    ['productWarehouse', 'salesWarehouse', 'purchaseWarehouse', 'returnWarehouse', 'treasuryWarehouse'].forEach(id => {
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

    // العملاء
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

    // الموردين
    const supplierSelect = document.getElementById('purchaseSupplierSelect');
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">اختر مورد...</option>';
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                supplierSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
            });
        }
    }

    // الإذونات
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

    // كشف حساب العملاء
    const statementSelect = document.getElementById('statementCustomerSelect');
    if (statementSelect) {
        statementSelect.innerHTML = '<option value="">اختر عميل...</option>';
        if (window.customers) {
            window.customers.forEach(c => {
                statementSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
    }

    // كشف حساب الموردين
    const supplierStatementSelect = document.getElementById('statementSupplierSelect');
    if (supplierStatementSelect) {
        supplierStatementSelect.innerHTML = '<option value="">اختر مورد...</option>';
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                supplierStatementSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
    }

    // السندات
    const bondSelect = document.getElementById('bondCustomer');
    if (bondSelect) {
        bondSelect.innerHTML = '<option value="">اختر...</option>';
        if (window.customers) {
            window.customers.forEach(c => {
                bondSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                bondSelect.innerHTML += `<option value="s_${s.id}">${s.name} (مورد)</option>`;
            });
        }
    }

    // المستخدمين
    const userSelect = document.getElementById('switchUserSelect');
    if (userSelect) {
        userSelect.innerHTML = '<option value="">اختر مستخدم...</option>';
        if (window.users) {
            window.users.forEach(u => {
                userSelect.innerHTML += `<option value="${u.id}">${u.username} (${u.role})</option>`;
            });
        }
    }

    // تحديث التواريخ
    const today = getTodayDate();
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input && !input.value) input.value = today;
    });

    updateCustomerWhatsApp();
    updateSupplierWhatsApp();
}

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
        const customer = window.customers?.find(c => c.name === selectedName);
        if (customer && customer.whatsapp) {
            whatsappInput.value = customer.whatsapp;
            group.style.display = 'block';
        } else if (customer) {
            whatsappInput.value = customer.phone || '';
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
        const supplier = window.suppliers?.find(s => s.name === selectedName);
        if (supplier && supplier.whatsapp) {
            whatsappInput.value = supplier.whatsapp;
            group.style.display = 'block';
        } else if (supplier) {
            whatsappInput.value = supplier.phone || '';
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

function sendWhatsApp() {
    showToast('📱 جاري فتح واتساب...', 'info');
}

function printInvoice(type) {
    showToast('🖨️ جاري الطباعة...', 'info');
}

// ================================================================
// UPDATE SETTINGS UI
// ================================================================
function updateSettingsUI() {
    safeSetText('infoProducts', window.products ? window.products.length : 0);
    safeSetText('infoCustomers', window.customers ? window.customers.length : 0);
    safeSetText('infoSuppliers', window.suppliers ? window.suppliers.length : 0);
    safeSetText('infoWarehouses', window.warehouses ? window.warehouses.length : 0);
    safeSetText('infoInvoices', (window.sales ? window.sales.length : 0) + (window.purchases ? window.purchases.length : 0) + (window.returns ? window.returns.length : 0));
}

// ================================================================
// UPDATE LICENSE UI (فارغة حالياً)
// ================================================================
function updateLicenseUI() {
    // يمكنك إضافة منطق الترخيص هنا
}

// ================================================================
// UPDATE ADJUSTMENT DATE TIME
// ================================================================
function updateAdjustmentDateTime() {
    const dt = getCurrentDateTime();
    const dateDisplay = document.getElementById('adjustmentDateDisplay');
    const timeDisplay = document.getElementById('adjustmentTimeDisplay');
    if (dateDisplay) dateDisplay.textContent = dt.date;
    if (timeDisplay) timeDisplay.textContent = dt.time;
}

// ================================================================
// DOM READY - بدء التطبيق
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    // إعداد طرق الدفع
    document.querySelectorAll('.payment-methods').forEach(group => {
        group.querySelectorAll('label').forEach(label => {
            label.addEventListener('click', function() {
                group.querySelectorAll('label').forEach(l => l.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    });

    // تعيين التاريخ
    const today = getTodayDate();
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input && !input.value) input.value = today;
    });

    // تحديث وقت التسوية
    updateAdjustmentDateTime();
    setInterval(updateAdjustmentDateTime, 1000);

    // تهيئة البيانات
    initAppData();
    seedData();
    populateAllSelects();
    refreshAllPages();

    // التحقق من حالة القفل
    if (localStorage.getItem('app_unlocked') === 'true') {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('appContent').style.display = 'block';
        setTimeout(() => {
            populateAllSelects();
            refreshAllPages();
            updateClock();
        }, 300);
    }

    console.log('✅ الميزان v3.0.0 - جاهز للعمل');
    console.log('🔒 كلمة المرور: 123456');
    console.log('📁 عدد الموديولات: 20');
    console.log('📅 التاريخ:', getCurrentDateTime().date);
    console.log('🕐 الوقت:', getCurrentDateTime().time);
});
