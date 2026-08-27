// ================================================================
// ================================================================
// app.js - الملف الرئيسي (نسخة مضبوطة بالكامل)
// ================================================================
// ================================================================

// ================================================================
// CONFIG
// ================================================================
const DEFAULT_PASSWORD = '123456';
let currentPassword = localStorage.getItem('app_password') || DEFAULT_PASSWORD;
let currentUser = JSON.parse(localStorage.getItem('mizan_current_user')) || { username: 'مدير', role: 'admin' };

// ================================================================
// تهيئة جميع المتغيرات (في النطاق العام)
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
// CHECK LOGIN - في النطاق العام (Global Scope)
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

// ================================================================
// HELPERS
// ================================================================
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function safeSetText(id, value) { 
    const el = document.getElementById(id); 
    if (el) el.textContent = value !== undefined && value !== null ? value : '0'; 
}

function safeSetValue(id, value) { 
    const el = document.getElementById(id); 
    if (el) el.value = value !== undefined && value !== null ? value : ''; 
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

function getTodayDate() { return new Date().toISOString().split('T')[0]; }

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
    } catch (e) {
        console.warn('⚠️ خطأ في الحفظ:', e);
    }
}

// ================================================================
// PERMISSIONS
// ================================================================
function isAdmin() { return window.currentUser?.role === 'admin'; }
function canDelete() { return window.currentUser?.role === 'admin'; }
function canEdit() { return window.currentUser?.role === 'admin' || window.currentUser?.role === 'manager'; }
function canAdd() { return window.currentUser?.role !== 'viewer'; }
function canViewAudit() { return window.currentUser?.role === 'admin'; }

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

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openMorePanel() {
    document.getElementById('moreOverlay').classList.add('open');
    document.getElementById('morePanel').classList.add('open');
}

function closeMorePanel() {
    document.getElementById('moreOverlay').classList.remove('open');
    document.getElementById('morePanel').classList.remove('open');
}

// ================================================================
// DASHBOARD
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

    const chart = document.getElementById('salesChart');
    if (chart) {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
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
            chart.innerHTML += `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
                    <div class="bar" style="height:${Math.max(height, 8)}px;width:100%;background:linear-gradient(180deg, #C9A94E, #8B7A3A);">
                        <span class="bar-value">${monthSales[i].toFixed(0)}</span>
                    </div>
                    <div class="bar-label">${name}</div>
                </div>
            `;
        });
    }
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
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof renderUsers === 'function') renderUsers();
    if (typeof renderAdjustmentHistory === 'function') renderAdjustmentHistory();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof updateAccounting === 'function') updateAccounting();
    if (typeof updateAlertsUI === 'function') updateAlertsUI();
    if (typeof loadCompanyData === 'function') loadCompanyData();
    if (typeof populateAllSelects === 'function') populateAllSelects();
    updateClock();
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
});
