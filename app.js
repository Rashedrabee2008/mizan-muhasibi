// ================================================================
// app.js - التطبيق الرئيسي (دوال التحكم والتنقل)
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
// HELPERS
// ================================================================
function safeSetText(id, value) { 
    const el = document.getElementById(id); 
    if (el) el.textContent = value; 
}

function safeSetValue(id, value) { 
    const el = document.getElementById(id); 
    if (el) el.value = value; 
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

function isAdmin() { 
    return currentUser.role === 'admin'; 
}

function canDelete() { 
    return currentUser.role === 'admin'; 
}

function canEdit() { 
    return currentUser.role === 'admin' || currentUser.role === 'manager'; 
}

function canAdd() { 
    return currentUser.role !== 'viewer'; 
}

function canViewAudit() { 
    return currentUser.role === 'admin'; 
}

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
    // استدعاء دوال التحديث من الموديولات المختلفة
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
    // استدعاء جميع دوال التحديث
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
// DOM READY
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

    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input && !input.value) input.value = today;
    });

    // تهيئة البيانات
    if (typeof seedData === 'function') seedData();
    if (typeof refreshAllPages === 'function') refreshAllPages();

    // التحقق من حالة القفل
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
            updateClock();
        }, 300);
    }

    console.log('✅ الميزان v3.0.0 - نظام محاسبة متكامل');
    console.log('🔒 كلمة المرور: 123456');
    console.log('📱 تم تقسيم الكود إلى موديولات منفصلة');
});

// ================================================================
// WHATSAPP FUNCTIONS (الخاصة بالعملاء والموردين)
// ================================================================
function updateCustomerWhatsApp() {
    const select = document.getElementById('salesCustomerSelect');
    const input = document.getElementById('salesCustomer');
    const whatsappInput = document.getElementById('customerWhatsApp');
    const group = document.getElementById('customerWhatsAppGroup');
    if (!select || !input || !whatsappInput || !group) return;
    
    const selectedName = select.value;
    if (selectedName) {
        const customer = window.customers ? window.customers.find(c => c.name === selectedName) : null;
        if (customer && customer.whatsapp) {
            whatsappInput.value = customer.whatsapp;
            group.style.display = 'block';
        } else if (customer) {
            whatsappInput.value = customer.phone || '';
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
        }
    } else if (input.value) {
        const customer = window.customers ? window.customers.find(c => c.name === input.value) : null;
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
    const input = document.getElementById('salesCustomer');
    const whatsappInput = document.getElementById('customerWhatsApp');
    const group = document.getElementById('customerWhatsAppGroup');
    if (!input || !whatsappInput || !group) return;
    
    const name = input.value.trim();
    if (name) {
        const customer = window.customers ? window.customers.find(c => c.name === name) : null;
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

function updateSupplierWhatsApp() {
    const select = document.getElementById('purchaseSupplierSelect');
    const input = document.getElementById('purchaseSupplier');
    const whatsappInput = document.getElementById('supplierWhatsApp');
    const group = document.getElementById('supplierWhatsAppGroup');
    if (!select || !input || !whatsappInput || !group) return;
    
    const selectedName = select.value;
    if (selectedName) {
        const supplier = window.suppliers ? window.suppliers.find(s => s.name === selectedName) : null;
        if (supplier && supplier.whatsapp) {
            whatsappInput.value = supplier.whatsapp;
            group.style.display = 'block';
        } else if (supplier) {
            whatsappInput.value = supplier.phone || '';
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
        }
    } else if (input.value) {
        const supplier = window.suppliers ? window.suppliers.find(s => s.name === input.value) : null;
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
    const input = document.getElementById('purchaseSupplier');
    const whatsappInput = document.getElementById('supplierWhatsApp');
    const group = document.getElementById('supplierWhatsAppGroup');
    if (!input || !whatsappInput || !group) return;
    
    const name = input.value.trim();
    if (name) {
        const supplier = window.suppliers ? window.suppliers.find(s => s.name === name) : null;
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

// ================================================================
// WHATSAPP INVOICE
// ================================================================
function sendWhatsApp() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    
    const customer = document.getElementById('salesCustomer')?.value?.trim() ||
        document.getElementById('salesCustomerSelect')?.value;
    if (!customer) { showToast('⚠️ حدد عميلاً أولاً', 'error'); return; }
    
    // التحقق من وجود salesItems
    if (typeof window.salesItems === 'undefined' || window.salesItems.length === 0) { 
        showToast('⚠️ أضف أصنافاً أولاً', 'error'); 
        return; 
    }

    let whatsappNumber = document.getElementById('customerWhatsApp')?.value?.trim();
    if (!whatsappNumber) {
        const customerObj = window.customers ? window.customers.find(c => c.name === customer) : null;
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

    const total = window.salesItems.reduce((s, item) => s + item.total, 0);
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

    window.salesItems.forEach((item, i) => {
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

    if (typeof addAuditLog === 'function') {
        addAuditLog('sale', 'whatsapp', `إرسال فاتورة واتساب للعميل: ${customer} - رقم: ${whatsappNumber}`);
    }
    showToast(`📱 تم فتح واتساب للعميل ${customer}`, 'success');
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
        const total = window.salesItems ? window.salesItems.reduce((s, item) => s + item.total, 0) : 0;
        const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
        const isTax = invoiceType === 'tax';
        const taxAmount = isTax ? (total * 14) / 100 : 0;
        const totalWithTax = isTax ? total + taxAmount : total;
        const items = window.salesItems || [];

        html = `
            <div class="invoice-print-boxed">
                <div class="company-header">
                    <h2>${company.name || 'الميزان'}</h2>
                    <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                    <div class="contact-info">📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'} | 📱 ${company.mobile || '01000000000'}</div>
                </div>
                <div class="invoice-info">
                    <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${dt.date}</span></div>
                    <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${dt.time}</span></div>
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
                        ${items.map((item, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${item.productName}</td>
                                <td>${item.qty}</td>
                                <td>${item.price.toFixed(2)}</td>
                                <td>${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
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
    }

    const win = window.open('', '_blank', 'width=400,height=650');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة', 'error');
    }
}