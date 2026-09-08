// ================================================================
// utils.js - دوال مساعدة
// ================================================================

// ================================================================
// SAFE SET TEXT - تعيين نص بأمان
// ================================================================
function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value !== undefined && value !== null ? value : '0';
    }
}

// ================================================================
// SAFE SET VALUE - تعيين قيمة بأمان
// ================================================================
function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value !== undefined && value !== null ? value : '';
    }
}

// ================================================================
// GET TODAY DATE - الحصول على تاريخ اليوم
// ================================================================
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// ================================================================
// GET CURRENT TIME - الحصول على الوقت الحالي
// ================================================================
function getCurrentTime() {
    return new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ================================================================
// GET CURRENT DATE TIME - الحصول على التاريخ والوقت
// ================================================================
function getCurrentDateTime() {
    const now = new Date();
    return {
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        full: now.toLocaleString('ar')
    };
}

// ================================================================
// COPY TO CLIPBOARD - نسخ للنص
// ================================================================
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('✅ تم النسخ', 'success'))
            .catch(() => fallbackCopy(text));
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
        showToast('✅ تم النسخ', 'success');
    } catch(e) {
        showToast('❌ فشل النسخ', 'error');
    }
    document.body.removeChild(textarea);
}

// ================================================================
// SHOW TOAST - عرض إشعار
// ================================================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast show ' + type;

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ================================================================
// OPEN MODAL - فتح المودال
// ================================================================
function openModal(title, html) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');

    if (overlay) overlay.style.display = 'flex';
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = html;

    document.body.style.overflow = 'hidden';
}

// ================================================================
// CLOSE MODAL - إغلاق المودال
// ================================================================
function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

// ================================================================
// PERMISSIONS - الصلاحيات
// ================================================================
function isAdmin() {
    return window.currentUser?.role === 'admin';
}

function isManager() {
    return window.currentUser?.role === 'admin' || window.currentUser?.role === 'manager';
}

function canAdd() {
    return window.currentUser?.role === 'admin' || 
           window.currentUser?.role === 'manager' || 
           window.currentUser?.role === 'cashier';
}

function canEdit() {
    return window.currentUser?.role === 'admin' || window.currentUser?.role === 'manager';
}

function canDelete() {
    return window.currentUser?.role === 'admin';
}

function canViewAudit() {
    return window.currentUser?.role === 'admin' || window.currentUser?.role === 'manager';
}

// ================================================================
// REFRESH ALL PAGES - تحديث جميع الصفحات
// ================================================================
function refreshAllPages() {
    if (typeof renderCustomers === 'function') renderCustomers();
    if (typeof renderSuppliers === 'function') renderSuppliers();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderSalesList === 'function') renderSalesList();
    if (typeof renderPurchasesList === 'function') renderPurchasesList();
    if (typeof renderReturnsList === 'function') renderReturnsList();
    if (typeof renderExpenses === 'function') renderExpenses();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof renderBonds === 'function') renderBonds();
    if (typeof renderWarehouses === 'function') renderWarehouses();
    if (typeof renderPermissions === 'function') renderPermissions();
    if (typeof renderAccounts === 'function') renderAccounts();
    if (typeof renderUsers === 'function') renderUsers();
    if (typeof renderBackups === 'function') renderBackups();
    if (typeof renderAudit === 'function') renderAudit();
    if (typeof updateAlertsUI === 'function') updateAlertsUI();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof updateCashierUI === 'function') updateCashierUI();
    if (typeof populateAllSelects === 'function') populateAllSelects();
    if (typeof loadCompanyData === 'function') loadCompanyData();
}

// ================================================================
// POPULATE ALL SELECTS - ملء جميع القوائم
// ================================================================
function populateAllSelects() {
    if (typeof populateSalesDropdowns === 'function') populateSalesDropdowns();
    if (typeof populatePurchaseDropdowns === 'function') populatePurchaseDropdowns();
    if (typeof populateReturnsDropdowns === 'function') populateReturnsDropdowns();
    if (typeof populatePermissionDropdowns === 'function') populatePermissionDropdowns();
    if (typeof populateAdjustmentProducts === 'function') populateAdjustmentProducts();
    if (typeof populateAccountParents === 'function') populateAccountParents();
    if (typeof populateUsersSelect === 'function') populateUsersSelect();

    // تحديث قوائم المنتجات في البيع والشراء
    const salesProductSelect = document.getElementById('salesItemProduct');
    const purchaseProductSelect = document.getElementById('purchaseItemProduct');
    const returnProductSelect = document.getElementById('returnItemProduct');

    if (salesProductSelect && window.products) {
        const currentValue = salesProductSelect.value;
        salesProductSelect.innerHTML = '<option value="">اختر منتج...</option>';
        window.products.forEach(p => {
            salesProductSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
        salesProductSelect.value = currentValue;
    }

    if (purchaseProductSelect && window.products) {
        const currentValue = purchaseProductSelect.value;
        purchaseProductSelect.innerHTML = '<option value="">اختر منتج...</option>';
        window.products.forEach(p => {
            purchaseProductSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
        purchaseProductSelect.value = currentValue;
    }

    if (returnProductSelect && window.products) {
        const currentValue = returnProductSelect.value;
        returnProductSelect.innerHTML = '<option value="">اختر منتج...</option>';
        window.products.forEach(p => {
            returnProductSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
        returnProductSelect.value = currentValue;
    }
}

// ================================================================
// UPDATE CLOCK - تحديث الساعة
// ================================================================
function updateClock() {
    const clock = document.getElementById('liveClock');
    if (clock) {
        clock.textContent = new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    setTimeout(updateClock, 1000);
}

// ================================================================
// LOCK APP - قفل التطبيق
// ================================================================
function lockApp() {
    localStorage.removeItem('app_unlocked');
    const loginContainer = document.getElementById('loginContainer');
    const appContent = document.getElementById('appContent');
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (appContent) appContent.style.display = 'none';
    document.getElementById('loginPassword')?.focus();
    showToast('🔒 تم قفل التطبيق', 'info');
}

// ================================================================
// LOGOUT APP - تسجيل الخروج
// ================================================================
function logoutApp() {
    if (!confirm('⚠️ هل أنت متأكد من تسجيل الخروج؟')) return;
    lockApp();
    showToast('👋 تم تسجيل الخروج', 'info');
}

// ================================================================
// UPDATE UI BY PERMISSIONS - تحديث الواجهة حسب الصلاحيات
// ================================================================
function updateUIByPermissions() {
    const isAdminUser = isAdmin();
    const isManagerUser = isManager();
    const canAddUser = canAdd();

    // إخفاء/إظهار عناصر الإدارة
    const userManagementElements = document.querySelectorAll('.admin-only');
    userManagementElements.forEach(el => {
        el.style.display = isAdminUser ? '' : 'none';
    });

    // زر مسح البيانات
    const clearBtn = document.getElementById('clearAuditBtn');
    if (clearBtn) {
        clearBtn.style.display = isAdminUser ? '' : 'none';
    }

    // زر توليد المفاتيح
    const licenseGeneratorBtn = document.getElementById('licenseGeneratorHiddenBtn');
    if (licenseGeneratorBtn) {
        licenseGeneratorBtn.style.display = isAdminUser ? '' : 'none';
    }

    // تحديث عرض المستخدم الحالي
    const userDisplay = document.getElementById('currentUserDisplay');
    const roleDisplay = document.getElementById('currentRoleDisplay');
    if (userDisplay && window.currentUser) {
        userDisplay.textContent = window.currentUser.username || 'admin';
    }
    if (roleDisplay && window.currentUser) {
        const roles = { admin: '👑 مدير', manager: '📊 مشرف', cashier: '💰 كاشير', viewer: '👁️ مشاهد' };
        roleDisplay.textContent = roles[window.currentUser.role] || window.currentUser.role;
    }
}

// ================================================================
// UPDATE SECURITY BUTTON - تحديث زر الأمن
// ================================================================
function updateSecurityButton() {
    const btn = document.getElementById('securityAuditBtn');
    if (btn) {
        btn.style.display = canViewAudit() ? '' : 'none';
    }
}

// ================================================================
// START AUTO BACKUP - بدء النسخ التلقائي
// ================================================================
function startAutoBackup() {
    if (window.autoBackupInterval) {
        clearInterval(window.autoBackupInterval);
    }
    window.autoBackupInterval = setInterval(() => {
        if (typeof createAutoBackup === 'function') {
            createAutoBackup();
        }
    }, 30 * 60 * 1000); // كل 30 دقيقة
}

// ================================================================
// NAVIGATE - التنقل بين الصفحات
// ================================================================
function navigateTo(page) {
    // إخفاء جميع الصفحات
    document.querySelectorAll('.page-container').forEach(el => {
        el.classList.remove('active');
    });

    // إظهار الصفحة المطلوبة
    const target = document.getElementById('page-' + page);
    if (target) {
        target.classList.add('active');
    }

    // تحديث التنقل السفلي
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.page === page) {
            el.classList.add('active');
        }
    });

    // تحديث الصفحة إذا كانت تحتاج تحديث
    switch(page) {
        case 'dashboard':
            if (typeof updateDashboard === 'function') updateDashboard();
            break;
        case 'inventory':
            if (typeof renderProducts === 'function') renderProducts();
            break;
        case 'sales':
            if (typeof renderSalesList === 'function') renderSalesList();
            break;
        case 'purchase':
            if (typeof renderPurchasesList === 'function') renderPurchasesList();
            break;
        case 'returns':
            if (typeof renderReturnsList === 'function') renderReturnsList();
            break;
        case 'customers':
            if (typeof renderCustomers === 'function') renderCustomers();
            break;
        case 'suppliers':
            if (typeof renderSuppliers === 'function') renderSuppliers();
            break;
        case 'warehouses':
            if (typeof renderWarehouses === 'function') renderWarehouses();
            break;
        case 'permissions':
            if (typeof renderPermissions === 'function') renderPermissions();
            break;
        case 'expenses':
            if (typeof renderExpenses === 'function') renderExpenses();
            break;
        case 'treasury':
            if (typeof renderTreasury === 'function') renderTreasury();
            break;
        case 'bonds':
            if (typeof renderBonds === 'function') renderBonds();
            break;
        case 'accounts':
            if (typeof renderAccounts === 'function') renderAccounts();
            break;
        case 'users':
            if (typeof renderUsers === 'function') renderUsers();
            break;
        case 'backup':
            if (typeof renderBackups === 'function') renderBackups();
            break;
        case 'audit':
            if (typeof renderAudit === 'function') renderAudit();
            break;
        case 'alerts':
            if (typeof updateAlertsUI === 'function') updateAlertsUI();
            break;
        case 'cashier':
            if (typeof updateCashierUI === 'function') updateCashierUI();
            break;
        case 'accounting':
            if (typeof updateAccounting === 'function') updateAccounting();
            break;
        case 'company':
            if (typeof loadCompanyData === 'function') loadCompanyData();
            break;
        case 'inventory_adjustment':
            if (typeof renderAdjustmentHistory === 'function') renderAdjustmentHistory();
            if (typeof populateAdjustmentProducts === 'function') populateAdjustmentProducts();
            if (typeof renderAdjustmentItems === 'function') renderAdjustmentItems();
            break;
        case 'profit_analysis':
            if (typeof generateProfitAnalysis === 'function') generateProfitAnalysis();
            break;
        case 'reports':
            const result = document.getElementById('reportResult');
            if (result) {
                result.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">اختر تقريراً</div><div class="desc">اضغط على أحد التقارير أعلاه</div></div></div>`;
            }
            break;
        case 'customer_statement':
        case 'supplier_statement':
            // تحديث القوائم
            if (typeof populateAllSelects === 'function') populateAllSelects();
            break;
        default:
            break;
    }

    // إغلاق القائمة الجانبية
    closeMorePanel();

    // تمرير إلى أعلى الصفحة
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================================================================
// OPEN MORE PANEL - فتح قائمة المزيد
// ================================================================
function openMorePanel() {
    const panel = document.getElementById('morePanel');
    const overlay = document.getElementById('moreOverlay');
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

// ================================================================
// CLOSE MORE PANEL - إغلاق قائمة المزيد
// ================================================================
function closeMorePanel() {
    const panel = document.getElementById('morePanel');
    const overlay = document.getElementById('moreOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// ================================================================
// WHATSAPP FUNCTIONS
// ================================================================
function updateCustomerWhatsApp() {
    const select = document.getElementById('salesCustomerSelect');
    const input = document.getElementById('customerWhatsApp');
    const group = document.getElementById('customerWhatsAppGroup');
    if (!select || !input || !group) return;

    const customer = window.customers?.find(c => c.id == select.value);
    if (customer && customer.whatsapp) {
        input.value = customer.whatsapp;
        group.style.display = 'block';
    } else {
        input.value = '';
        group.style.display = 'none';
    }
}

function updateCustomerWhatsAppManual() {
    const input = document.getElementById('salesCustomer');
    const whatsappInput = document.getElementById('customerWhatsApp');
    const group = document.getElementById('customerWhatsAppGroup');
    if (!input || !whatsappInput || !group) return;

    const customer = window.customers?.find(c => c.name === input.value);
    if (customer && customer.whatsapp) {
        whatsappInput.value = customer.whatsapp;
        group.style.display = 'block';
    } else {
        whatsappInput.value = '';
        group.style.display = 'none';
    }
}

function updateCustomerBalanceDisplay() {
    const select = document.getElementById('salesCustomerSelect');
    const input = document.getElementById('salesCustomer');
    const display = document.getElementById('customerBalanceDisplay');
    if (!display) return;

    const customerName = select.value ? 
        window.customers?.find(c => c.id == select.value)?.name : 
        input?.value;

    if (customerName) {
        const customer = window.customers?.find(c => c.name === customerName);
        if (customer) {
            const sales = window.sales?.filter(s => s.customer === customer.name) || [];
            const total = sales.reduce((sum, s) => sum + (s.totalWithTax || s.total || 0), 0);
            const paid = sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.totalWithTax || s.total || 0), 0);
            const remaining = total - paid;
            display.style.display = 'block';
            display.innerHTML = `
                <div style="font-size:12px;padding:6px;background:#0D0D0D;border-radius:6px;border:1px solid #2D2D2D;">
                    <span style="color:#A89070;">💰 رصيد العميل:</span>
                    <span style="color:${remaining > 0 ? '#E06060' : '#2D8F5E'};font-weight:700;">
                        ${remaining.toFixed(2)} 🇪🇬
                    </span>
                    <span style="font-size:10px;color:#A89070;margin-right:8px;">
                        (إجمالي: ${total.toFixed(2)} | مدفوع: ${paid.toFixed(2)})
                    </span>
                </div>
            `;
            return;
        }
    }
    display.style.display = 'none';
}

function updateSupplierWhatsApp() {
    const select = document.getElementById('purchaseSupplierSelect');
    const input = document.getElementById('supplierWhatsApp');
    const group = document.getElementById('supplierWhatsAppGroup');
    if (!select || !input || !group) return;

    const supplier = window.suppliers?.find(s => s.id == select.value);
    if (supplier && supplier.whatsapp) {
        input.value = supplier.whatsapp;
        group.style.display = 'block';
    } else {
        input.value = '';
        group.style.display = 'none';
    }
}

function updateSupplierWhatsAppManual() {
    const input = document.getElementById('purchaseSupplier');
    const whatsappInput = document.getElementById('supplierWhatsApp');
    const group = document.getElementById('supplierWhatsAppGroup');
    if (!input || !whatsappInput || !group) return;

    const supplier = window.suppliers?.find(s => s.name === input.value);
    if (supplier && supplier.whatsapp) {
        whatsappInput.value = supplier.whatsapp;
        group.style.display = 'block';
    } else {
        whatsappInput.value = '';
        group.style.display = 'none';
    }
}

function updateSupplierBalanceDisplay() {
    const select = document.getElementById('purchaseSupplierSelect');
    const input = document.getElementById('purchaseSupplier');
    const display = document.getElementById('supplierBalanceDisplay');
    if (!display) return;

    const supplierName = select.value ? 
        window.suppliers?.find(s => s.id == select.value)?.name : 
        input?.value;

    if (supplierName) {
        const supplier = window.suppliers?.find(s => s.name === supplierName);
        if (supplier) {
            const purchases = window.purchases?.filter(p => p.supplier === supplier.name) || [];
            const total = purchases.reduce((sum, p) => sum + (p.totalWithTax || p.total || 0), 0);
            const paid = purchases.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.totalWithTax || p.total || 0), 0);
            const remaining = total - paid;
            display.style.display = 'block';
            display.innerHTML = `
                <div style="font-size:12px;padding:6px;background:#0D0D0D;border-radius:6px;border:1px solid #2D2D2D;">
                    <span style="color:#A89070;">💰 رصيد المورد:</span>
                    <span style="color:${remaining > 0 ? '#E06060' : '#2D8F5E'};font-weight:700;">
                        ${remaining.toFixed(2)} 🇪🇬
                    </span>
                    <span style="font-size:10px;color:#A89070;margin-right:8px;">
                        (إجمالي: ${total.toFixed(2)} | مدفوع: ${paid.toFixed(2)})
                    </span>
                </div>
            `;
            return;
        }
    }
    display.style.display = 'none';
}

function updateReturnCustomerBalance() {
    const select = document.getElementById('returnCustomerSelect');
    const input = document.getElementById('returnCustomer');
    const display = document.getElementById('returnCustomerBalanceDisplay');
    if (!display) return;

    const customerName = select.value ? 
        window.customers?.find(c => c.id == select.value)?.name : 
        input?.value;

    if (customerName) {
        const customer = window.customers?.find(c => c.name === customerName);
        if (customer) {
            const sales = window.sales?.filter(s => s.customer === customer.name) || [];
            const total = sales.reduce((sum, s) => sum + (s.totalWithTax || s.total || 0), 0);
            const paid = sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.totalWithTax || s.total || 0), 0);
            const remaining = total - paid;
            display.style.display = 'block';
            display.innerHTML = `
                <div style="font-size:12px;padding:6px;background:#0D0D0D;border-radius:6px;border:1px solid #2D2D2D;">
                    <span style="color:#A89070;">💰 رصيد العميل:</span>
                    <span style="color:${remaining > 0 ? '#E06060' : '#2D8F5E'};font-weight:700;">
                        ${remaining.toFixed(2)} 🇪🇬
                    </span>
                </div>
            `;
            return;
        }
    }
    display.style.display = 'none';
}

// ================================================================
// SEND WHATSAPP - إرسال واتساب
// ================================================================
function sendWhatsApp() {
    const customerSelect = document.getElementById('salesCustomerSelect');
    const customerInput = document.getElementById('salesCustomer');
    const whatsappInput = document.getElementById('customerWhatsApp');
    const totalAmount = document.getElementById('salesTotalAmount')?.textContent || '0.00';

    let phone = whatsappInput?.value?.trim();
    if (!phone) {
        const customerName = customerSelect?.value ? 
            window.customers?.find(c => c.id == customerSelect.value)?.name : 
            customerInput?.value;
        if (customerName) {
            const customer = window.customers?.find(c => c.name === customerName);
            if (customer) phone = customer.whatsapp;
        }
    }

    if (!phone) {
        showToast('⚠️ لا يوجد رقم واتساب للعميل', 'error');
        return;
    }

    // تنظيف الرقم
    phone = phone.replace(/[^0-9+]/g, '');
    if (!phone.startsWith('+')) {
        phone = '+2' + phone.replace(/^0+/, '');
    }

    const companyName = window.companyData?.name || 'الميزان';
    const items = salesItems.map((item, i) => 
        `${i + 1}. ${item.productName} × ${item.qty} = ${(item.total || 0).toFixed(2)}`
    ).join('\n');

    const message = `
🛒 *فاتورة جديدة من ${companyName}*

📋 الأصناف:
${items}

💰 *الإجمالي: ${totalAmount} 🇪🇬*

📅 التاريخ: ${getTodayDate()}
🕐 الوقت: ${getCurrentTime()}

شكراً لتعاملكم معنا 🙏
    `.trim();

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    addAuditLog('add', 'whatsapp', `إرسال فاتورة واتساب للرقم: ${phone}`);
}