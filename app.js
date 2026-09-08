// ================================================================
// app.js - الملف الرئيسي للتطبيق
// ================================================================

// ================================================================
// CONFIG
// ================================================================
const DEFAULT_PASSWORD = '123456';
const SECRET_KEY = 'Mizan_License_2025_Secret';
const DEMO_LICENSE_KEY = 'UmFzaGVkfDIwMjctMDgtMjV8fDg5YWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTA=';
const LICENSE_PRICES = { 30: 1500, 90: 2000, 180: 2500, 365: 3000, 730: 6000 };

// ===== تحميل كلمة المرور من localStorage =====
let currentPassword = localStorage.getItem('app_password') || DEFAULT_PASSWORD;
let backupInterval = null;
let versionClickCount = 0;

// ===== تحميل المستخدم الحالي =====
let currentUser = JSON.parse(localStorage.getItem('mizan_current_user')) || null;

// ===== إذا لم يكن هناك مستخدم حالياً، استخدم المدير =====
if (!currentUser) {
    currentUser = { username: 'مدير', role: 'admin' };
    localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
}

// ===== رقم الفاتورة المسلسل =====
let invoiceCounter = parseInt(localStorage.getItem('mizan_invoice_counter')) || 1;

function getNextInvoiceNumber() {
    const current = invoiceCounter;
    invoiceCounter++;
    localStorage.setItem('mizan_invoice_counter', invoiceCounter);
    return current;
}

// ================================================================
// INIT USERS - تهيئة المستخدمين
// ================================================================

function initUsers() {
    // تحميل المستخدمين من localStorage
    let users = localStorage.getItem('mizan_users');
    
    if (users) {
        try {
            window.users = JSON.parse(users);
            // التأكد من وجود المستخدمين الأساسيين
            if (!window.users.find(u => u.username === 'مدير')) {
                window.users.push({ id: Date.now(), username: 'مدير', role: 'admin', password: DEFAULT_PASSWORD });
            }
            if (!window.users.find(u => u.username === 'مشرف')) {
                window.users.push({ id: Date.now() + 1, username: 'مشرف', role: 'manager', password: DEFAULT_PASSWORD });
            }
            if (!window.users.find(u => u.username === 'كاشير')) {
                window.users.push({ id: Date.now() + 2, username: 'كاشير', role: 'cashier', password: DEFAULT_PASSWORD });
            }
            if (!window.users.find(u => u.username === 'مشاهد')) {
                window.users.push({ id: Date.now() + 3, username: 'مشاهد', role: 'viewer', password: DEFAULT_PASSWORD });
            }
        } catch (e) {
            window.users = getDefaultUsers();
        }
    } else {
        window.users = getDefaultUsers();
    }
    
    localStorage.setItem('mizan_users', JSON.stringify(window.users));
    
    // التحقق من وجود المستخدم الحالي
    if (currentUser && currentUser.username) {
        const exists = window.users.find(u => u.username === currentUser.username);
        if (!exists) {
            currentUser = { username: 'مدير', role: 'admin' };
            localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
        }
    } else {
        currentUser = { username: 'مدير', role: 'admin' };
        localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
    }
    
    // تحديث كلمة المرور الحالية
    const current = window.users.find(u => u.username === currentUser.username);
    if (current?.password) {
        currentPassword = current.password;
        localStorage.setItem('app_password', currentPassword);
    }
    
    updateUIByPermissions();
}

function getDefaultUsers() {
    return [
        { id: 1, username: 'مدير', role: 'admin', password: DEFAULT_PASSWORD },
        { id: 2, username: 'مشرف', role: 'manager', password: DEFAULT_PASSWORD },
        { id: 3, username: 'كاشير', role: 'cashier', password: DEFAULT_PASSWORD },
        { id: 4, username: 'مشاهد', role: 'viewer', password: DEFAULT_PASSWORD }
    ];
}

// ================================================================
// SEED DATA - تهيئة البيانات
// ================================================================

function seedData() {
    // تهيئة المتغيرات
    if (typeof window.products === 'undefined') window.products = [];
    if (typeof window.customers === 'undefined') window.customers = [];
    if (typeof window.suppliers === 'undefined') window.suppliers = [];
    if (typeof window.purchases === 'undefined') window.purchases = [];
    if (typeof window.sales === 'undefined') window.sales = [];
    if (typeof window.returns === 'undefined') window.returns = [];
    if (typeof window.expenses === 'undefined') window.expenses = [];
    if (typeof window.treasury === 'undefined') window.treasury = [];
    if (typeof window.bonds === 'undefined') window.bonds = [];
    if (typeof window.warehouses === 'undefined') window.warehouses = [];
    if (typeof window.warehouseProducts === 'undefined') window.warehouseProducts = [];
    if (typeof window.permissions === 'undefined') window.permissions = [];
    if (typeof window.backups === 'undefined') window.backups = [];
    if (typeof window.accounts === 'undefined') window.accounts = [];
    if (typeof window.auditLog === 'undefined') window.auditLog = [];
    if (typeof window.alerts === 'undefined') window.alerts = [];
    if (typeof window.cashierHistory === 'undefined') window.cashierHistory = [];
    if (typeof window.inventoryAdjustments === 'undefined') window.inventoryAdjustments = [];
    
    if (!window.companyData || typeof window.companyData !== 'object') {
        window.companyData = {};
    }
    
    // تهيئة المستخدمين (لا تعيد إنشائهم إذا كانوا موجودين)
    initUsers();
    
    // ===== فقط إذا كانت البيانات فارغة، نضيف بيانات تجريبية =====
    if (window.warehouses.length === 0) {
        window.warehouses = [
            { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
            { id: 2, name: 'مخزن المحل', type: 'محل', address: 'المنصورة' }
        ];
        setData('warehouses', window.warehouses);
    }
    
    if (window.products.length === 0 && window.warehouseProducts.length === 0) {
        window.products = [
            { id: 1, name: 'منتج تجريبي 1', buyPrice: 50, sellPrice: 100, min: 5, barcode: '123456789' },
            { id: 2, name: 'منتج تجريبي 2', buyPrice: 30, sellPrice: 75, min: 3, barcode: '987654321' }
        ];
        setData('products', window.products);
        
        window.warehouseProducts = [
            { warehouseId: 1, productId: 1, qty: 50 },
            { warehouseId: 1, productId: 2, qty: 30 },
            { warehouseId: 2, productId: 1, qty: 10 },
            { warehouseId: 2, productId: 2, qty: 5 }
        ];
        setData('warehouseProducts', window.warehouseProducts);
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
// CHECK LOGIN - التحقق من الدخول
// ================================================================

function checkLogin() {
    const input = document.getElementById('loginPassword');
    const error = document.getElementById('loginError');
    
    // تحميل المستخدمين
    initUsers();
    
    // البحث عن المستخدم بكلمة المرور المدخلة
    let foundUser = window.users.find(u => u.password === input.value);
    
    // إذا لم يوجد، جرب كلمة المرور الافتراضية
    if (!foundUser && input.value === DEFAULT_PASSWORD) {
        foundUser = window.users.find(u => u.username === 'مدير');
    }
    
    if (foundUser) {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        
        // تحديث المستخدم الحالي
        currentUser = { username: foundUser.username, role: foundUser.role };
        currentPassword = foundUser.password;
        localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
        localStorage.setItem('app_password', currentPassword);
        localStorage.setItem('app_unlocked', 'true');
        
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';
        if (error) error.classList.remove('show');
        input.value = '';

        showToast(`🔓 مرحباً ${foundUser.username}!`, 'success');

        setTimeout(() => {
            if (typeof seedData === 'function') seedData();
            if (typeof populateAllSelects === 'function') populateAllSelects();
            if (typeof refreshAllPages === 'function') refreshAllPages();
            if (typeof startAutoBackup === 'function') startAutoBackup();
            updateUIByPermissions();
            updateSecurityButton();
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
// CHANGE PASSWORD - تغيير كلمة المرور
// ================================================================

function changePasswordSettings() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const oldEl = document.getElementById('oldPassword');
    const newEl = document.getElementById('newPassword');
    const confirmEl = document.getElementById('confirmPassword');

    if (!oldEl || !newEl || !confirmEl) return;
    const old = oldEl.value;
    const newPwd = newEl.value;
    const confirm = confirmEl.value;

    // التحقق من كلمة المرور الحالية
    const user = window.users.find(u => u.username === currentUser.username);
    if (!user) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    if (old !== user.password && old !== DEFAULT_PASSWORD) {
        showToast('❌ كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }
    
    if (newPwd.length < 4) { 
        showToast('❌ 4 أحرف على الأقل', 'error'); 
        return; 
    }
    
    if (newPwd !== confirm) { 
        showToast('❌ غير مطابقة', 'error'); 
        return; 
    }

    // تحديث كلمة المرور للمستخدم
    user.password = newPwd;
    if (currentUser.username === user.username) {
        currentPassword = newPwd;
    }
    
    // حفظ التغييرات
    localStorage.setItem('mizan_users', JSON.stringify(window.users));
    localStorage.setItem('app_password', currentPassword);
    
    addAuditLog('edit', 'settings', `تغيير كلمة المرور للمستخدم: ${user.username}`);

    oldEl.value = '';
    newEl.value = '';
    confirmEl.value = '';

    showToast(`✅ تم تغيير كلمة المرور للمستخدم ${user.username}`, 'success');
}

// ================================================================
// ADD USER - إضافة مستخدم
// ================================================================

function addUser() {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه إضافة مستخدمين', 'error');
        return;
    }

    const username = document.getElementById('newUsername')?.value?.trim();
    const password = document.getElementById('newUserPassword')?.value?.trim();
    const role = document.getElementById('newUserRole')?.value;

    if (!username) {
        showToast('⚠️ أدخل اسم المستخدم', 'error');
        return;
    }
    if (!password || password.length < 4) {
        showToast('⚠️ كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error');
        return;
    }

    if (window.users.find(u => u?.username === username)) {
        showToast('⚠️ المستخدم موجود', 'warning');
        return;
    }

    window.users.push({
        id: Date.now(),
        username: username,
        role: role,
        password: password,
        createdAt: new Date().toISOString()
    });

    localStorage.setItem('mizan_users', JSON.stringify(window.users));
    renderUsers();
    populateUsersSelect();
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    showToast('✅ تم إضافة المستخدم', 'success');
    addAuditLog('add', 'user', `إضافة مستخدم: ${username} (${role})`);
}

// ================================================================
// DELETE USER - حذف مستخدم
// ================================================================

function deleteUser(id) {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه الحذف', 'error');
        return;
    }

    if (!confirm('⚠️ حذف المستخدم نهائياً؟')) return;

    const u = window.users.find(user => user?.id === id);
    if (!u) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    // منع حذف المدير الرئيسي
    if (u.username === 'مدير') {
        showToast('⚠️ لا يمكن حذف المدير الرئيسي', 'error');
        return;
    }

    // منع حذف المستخدم الحالي
    if (currentUser?.username === u.username) {
        showToast('⚠️ لا يمكن حذف نفسك', 'error');
        return;
    }

    window.users = window.users.filter(user => user?.id !== id);
    localStorage.setItem('mizan_users', JSON.stringify(window.users));
    
    renderUsers();
    populateUsersSelect();
    showToast(`🗑️ تم حذف المستخدم: ${u.username}`, 'info');
    addAuditLog('delete', 'user', `حذف مستخدم: ${u.username}`);
    closeModal();
}

// ================================================================
// SWITCH USER - تبديل المستخدم
// ================================================================

function switchUser() {
    const select = document.getElementById('switchUserSelect');
    if (!select) return;

    const userId = parseInt(select.value);
    if (!userId) return;

    const user = window.users.find(u => u?.id === userId);
    if (!user) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    // تحديث المستخدم الحالي
    currentUser = {
        username: user.username,
        role: user.role
    };
    currentPassword = user.password;

    localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
    localStorage.setItem('app_password', currentPassword);

    updateUIByPermissions();
    updateSecurityButton();
    renderUsers();
    showToast(`👤 تم التبديل إلى ${user.username} (${user.role})`, 'success');
    addAuditLog('edit', 'user', `تبديل المستخدم إلى: ${user.username}`);
    refreshAllPages();
}

// ================================================================
// CLEAR ALL DATA - مسح البيانات (لا يمسح المستخدمين)
// ================================================================

function clearAllData() {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟')) return;

    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'
    ];
    
    let clearedCount = 0;
    for (let i = 0; i < keys.length; i++) {
        try {
            localStorage.removeItem('mizan_' + keys[i]);
            clearedCount++;
        } catch(e) {}
        
        // إعادة تعيين المتغيرات
        if (keys[i] === 'products') window.products = [];
        else if (keys[i] === 'customers') window.customers = [];
        else if (keys[i] === 'suppliers') window.suppliers = [];
        else if (keys[i] === 'purchases') window.purchases = [];
        else if (keys[i] === 'sales') window.sales = [];
        else if (keys[i] === 'returns') window.returns = [];
        else if (keys[i] === 'expenses') window.expenses = [];
        else if (keys[i] === 'treasury') window.treasury = [];
        else if (keys[i] === 'bonds') window.bonds = [];
        else if (keys[i] === 'warehouses') window.warehouses = [];
        else if (keys[i] === 'warehouseProducts') window.warehouseProducts = [];
        else if (keys[i] === 'permissions') window.permissions = [];
        else if (keys[i] === 'companyData') window.companyData = {};
        else if (keys[i] === 'backups') window.backups = [];
        else if (keys[i] === 'accounts') window.accounts = [];
        else if (keys[i] === 'auditLog') window.auditLog = [];
        else if (keys[i] === 'alerts') window.alerts = [];
        else if (keys[i] === 'cashierHistory') window.cashierHistory = [];
        else if (keys[i] === 'inventoryAdjustments') window.inventoryAdjustments = [];
    }
    
    // لا نمسح المستخدمين وكلمة المرور

    addAuditLog('delete', 'all', 'مسح جميع البيانات');
    refreshAllPages();
    showToast(`🗑️ تم مسح ${clearedCount} عنصر`, 'warning');
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
// OPEN/CLOSE MODAL - فتح وإغلاق المودال
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
// OPEN/CLOSE MORE PANEL - فتح وإغلاق قائمة المزيد
// ================================================================

function openMorePanel() {
    const panel = document.getElementById('morePanel');
    const overlay = document.getElementById('moreOverlay');
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

function closeMorePanel() {
    const panel = document.getElementById('morePanel');
    const overlay = document.getElementById('moreOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// ================================================================
// SYNC FUNCTIONS - دوال المزامنة
// ================================================================

function syncNow() {
    if (typeof syncToFirebase === 'function') {
        syncToFirebase();
    } else {
        showToast('⚠️ Firebase غير متاح', 'error');
    }
}

function forceSync() {
    if (typeof syncToFirebase === 'function') {
        showToast('⏳ جاري المزامنة...', 'info');
        syncToFirebase();
    } else {
        showToast('⚠️ Firebase غير متاح', 'error');
    }
}

// ================================================================
// COUNT VERSION CLICKS - تفعيل زر توليد المفاتيح
// ================================================================

function countVersionClicks() {
    versionClickCount++;
    if (versionClickCount >= 5) {
        const btn = document.getElementById('licenseGeneratorHiddenBtn');
        if (btn) {
            btn.style.display = 'block';
            showToast('🔑 تم تفعيل زر توليد المفاتيح', 'success');
        }
        versionClickCount = 0;
    }
}

// ================================================================
// ACTIVATE DEMO LICENSE - تفعيل الترخيص التجريبي
// ================================================================

function activateDemoLicense() {
    try {
        const data = atob(DEMO_LICENSE_KEY);
        const parts = data.split('|');
        if (parts.length >= 3) {
            const expiryDate = new Date(parts[1]);
            const today = new Date();
            if (expiryDate > today) {
                localStorage.setItem('mizan_license', JSON.stringify({
                    key: DEMO_LICENSE_KEY,
                    expiry: parts[1],
                    customer: parts[0],
                    active: true
                }));
                console.log('✅ تم تفعيل الترخيص التجريبي حتى ' + parts[1]);
                return true;
            }
        }
    } catch(e) {
        console.warn('⚠️ فشل تفعيل الترخيص التجريبي');
    }
    return false;
}

// ================================================================
// ACTIVATE LICENSE - تفعيل الترخيص
// ================================================================

function activateLicense() {
    const keyInput = document.getElementById('licenseKeyInput');
    if (!keyInput) return;
    
    const key = keyInput.value.trim();
    if (!key) {
        showToast('⚠️ أدخل مفتاح الترخيص', 'error');
        return;
    }

    try {
        const data = atob(key);
        const parts = data.split('|');
        if (parts.length < 3) {
            showToast('❌ مفتاح غير صالح', 'error');
            return;
        }

        const expiryDate = new Date(parts[1]);
        const today = new Date();
        if (expiryDate <= today) {
            showToast('❌ انتهى الترخيص', 'error');
            return;
        }

        localStorage.setItem('mizan_license', JSON.stringify({
            key: key,
            expiry: parts[1],
            customer: parts[0],
            active: true
        }));

        showToast(`✅ تم تفعيل الترخيص للعميل: ${parts[0]}`, 'success');
        addAuditLog('add', 'license', `تفعيل ترخيص للعميل: ${parts[0]}`);
        
        if (typeof checkLicenseStatus === 'function') checkLicenseStatus();
    } catch(e) {
        showToast('❌ مفتاح غير صالح', 'error');
    }
}

// ================================================================
// CHECK LICENSE STATUS - التحقق من حالة الترخيص
// ================================================================

function checkLicenseStatus() {
    const license = localStorage.getItem('mizan_license');
    if (!license) {
        safeSetText('licenseStatusDisplay', '❌ غير مفعل');
        safeSetText('licenseExpiryDisplay', '-');
        safeSetText('licenseDaysLeft', '-');
        return;
    }

    try {
        const data = JSON.parse(license);
        if (!data.active) {
            safeSetText('licenseStatusDisplay', '❌ غير مفعل');
            safeSetText('licenseExpiryDisplay', '-');
            safeSetText('licenseDaysLeft', '-');
            return;
        }

        const expiry = new Date(data.expiry);
        const today = new Date();
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        safeSetText('licenseStatusDisplay', daysLeft > 0 ? '✅ نشط' : '❌ منتهي');
        safeSetText('licenseExpiryDisplay', data.expiry);
        safeSetText('licenseDaysLeft', daysLeft > 0 ? daysLeft + ' يوم' : 'منتهي');
    } catch(e) {
        safeSetText('licenseStatusDisplay', '❌ خطأ');
        safeSetText('licenseExpiryDisplay', '-');
        safeSetText('licenseDaysLeft', '-');
    }
}

// ================================================================
// GENERATE NEW LICENSE - توليد مفتاح جديد
// ================================================================

function generateNewLicense() {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه التوليد', 'error');
        return;
    }

    const customer = document.getElementById('licenseCustomerName')?.value?.trim();
    const days = parseInt(document.getElementById('licenseDays')?.value);

    if (!customer) {
        showToast('⚠️ أدخل اسم العميل', 'error');
        return;
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    const expiryStr = expiry.toISOString().split('T')[0];

    // توليد مفتاح عشوائي
    const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const keyData = `${customer}|${expiryStr}|${randomPart}`;
    const key = btoa(keyData);

    document.getElementById('genCustomer').textContent = customer;
    document.getElementById('genDays').textContent = days + ' يوم';
    document.getElementById('genAmount').textContent = (LICENSE_PRICES[days] || 0) + ' جنيه';
    document.getElementById('genExpiry').textContent = expiryStr;
    document.getElementById('genKey').textContent = key;
    document.getElementById('licenseResult').style.display = 'block';

    // حفظ المفتاح
    const keys = JSON.parse(localStorage.getItem('mizan_generated_keys') || '[]');
    keys.push({
        customer: customer,
        days: days,
        expiry: expiryStr,
        key: key,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('mizan_generated_keys', JSON.stringify(keys));

    renderGeneratedKeys();
    showToast('✅ تم توليد المفتاح', 'success');
    addAuditLog('add', 'license', `توليد مفتاح للعميل: ${customer}`);
}

// ================================================================
// UPDATE LICENSE PRICE - تحديث سعر الترخيص
// ================================================================

function updateLicensePrice() {
    const days = parseInt(document.getElementById('licenseDays')?.value);
    const amount = document.getElementById('licenseAmount');
    if (amount) {
        amount.value = LICENSE_PRICES[days] || 3000;
    }
}

// ================================================================
// COPY LICENSE KEY - نسخ مفتاح الترخيص
// ================================================================

function copyLicenseKey() {
    const key = document.getElementById('genKey')?.textContent;
    if (key) {
        copyToClipboard(key);
    }
}

// ================================================================
// RENDER GENERATED KEYS - عرض المفاتيح المُنشأة
// ================================================================

function renderGeneratedKeys() {
    const container = document.getElementById('generatedKeysList');
    if (!container) return;

    const keys = JSON.parse(localStorage.getItem('mizan_generated_keys') || '[]');
    
    if (keys.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-key"></i><span>لا توجد مفاتيح</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 1.2fr 0.8fr;">
        <span>العميل</span><span>المدة</span><span>تاريخ الانتهاء</span><span></span>
    </div>`;

    keys.slice().reverse().forEach(k => {
        const isExpired = new Date(k.expiry) < new Date();
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 1.2fr 0.8fr;font-size:12px;">
                <span><strong>${k.customer}</strong></span>
                <span>${k.days} يوم</span>
                <span style="color:${isExpired ? '#E06060' : '#2D8F5E'};">${k.expiry} ${isExpired ? '❌' : '✅'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="copyText('${k.key}')"><i class="fas fa-copy"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteGeneratedKey('${k.key}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// DELETE GENERATED KEY - حذف مفتاح مُنشأ
// ================================================================

function deleteGeneratedKey(key) {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه الحذف', 'error');
        return;
    }
    if (!confirm('⚠️ حذف المفتاح؟')) return;

    let keys = JSON.parse(localStorage.getItem('mizan_generated_keys') || '[]');
    keys = keys.filter(k => k.key !== key);
    localStorage.setItem('mizan_generated_keys', JSON.stringify(keys));
    renderGeneratedKeys();
    showToast('🗑️ تم الحذف', 'info');
}

// ================================================================
// COPY TEXT - نسخ نص
// ================================================================

function copyText(text) {
    copyToClipboard(text);
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
// START APP - تشغيل التطبيق
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تشغيل الميزان v3.0.0');
    
    // تهيئة المستخدمين
    if (typeof initUsers === 'function') {
        initUsers();
        console.log('✅ تم تهيئة المستخدمين');
    }
    
    // تفعيل الترخيص التجريبي
    if (typeof activateDemoLicense === 'function') {
        activateDemoLicense();
        console.log('✅ تم تفعيل الترخيص التجريبي');
    }
    
    // تهيئة البيانات
    if (typeof seedData === 'function') {
        seedData();
        console.log('✅ تم تهيئة البيانات');
    }
    
    // تحديث جميع الصفحات
    if (typeof refreshAllPages === 'function') {
        refreshAllPages();
        console.log('✅ تم تحديث جميع الصفحات');
    }
    
    // تحديث الساعة
    if (typeof updateClock === 'function') {
        updateClock();
        console.log('✅ تم تحديث الساعة');
    }
    
    // تحديث لوحة التحكم
    if (typeof updateDashboard === 'function') {
        updateDashboard();
        console.log('✅ تم تحديث لوحة التحكم');
    }
    
    // تحديث زر الأمن
    if (typeof updateSecurityButton === 'function') {
        updateSecurityButton();
    }
    
    // التحقق من حالة الترخيص
    if (typeof checkLicenseStatus === 'function') {
        checkLicenseStatus();
    }
    
    // عرض المفاتيح المُنشأة
    if (typeof renderGeneratedKeys === 'function') {
        renderGeneratedKeys();
    }
    
    // التحقق من حالة الدخول
    if (localStorage.getItem('app_unlocked') === 'true') {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';
    }
    
    console.log('✅ الميزان جاهز للاستخدام');
    console.log('🔒 كلمة المرور: 123456');
    console.log('🔑 اضغط 5 مرات على رقم الإصدار في الإعدادات لتفعيل زر توليد المفاتيح');
});

// ================================================================
// EXPOSE FUNCTIONS TO GLOBAL - تعريض الدوال للنطاق العام
// ================================================================

window.initUsers = initUsers;
window.seedData = seedData;
window.checkLogin = checkLogin;
window.changePasswordSettings = changePasswordSettings;
window.addUser = addUser;
window.deleteUser = deleteUser;
window.switchUser = switchUser;
window.clearAllData = clearAllData;
window.lockApp = lockApp;
window.logoutApp = logoutApp;
window.updateClock = updateClock;
window.updateUIByPermissions = updateUIByPermissions;
window.updateSecurityButton = updateSecurityButton;
window.startAutoBackup = startAutoBackup;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.isAdmin = isAdmin;
window.isManager = isManager;
window.canAdd = canAdd;
window.canEdit = canEdit;
window.canDelete = canDelete;
window.canViewAudit = canViewAudit;
window.refreshAllPages = refreshAllPages;
window.populateAllSelects = populateAllSelects;
window.navigateTo = navigateTo;
window.openMorePanel = openMorePanel;
window.closeMorePanel = closeMorePanel;
window.syncNow = syncNow;
window.forceSync = forceSync;
window.countVersionClicks = countVersionClicks;
window.activateDemoLicense = activateDemoLicense;
window.activateLicense = activateLicense;
window.checkLicenseStatus = checkLicenseStatus;
window.generateNewLicense = generateNewLicense;
window.updateLicensePrice = updateLicensePrice;
window.copyLicenseKey = copyLicenseKey;
window.renderGeneratedKeys = renderGeneratedKeys;
window.deleteGeneratedKey = deleteGeneratedKey;
window.copyText = copyText;
window.copyToClipboard = copyToClipboard;
window.safeSetText = safeSetText;
window.safeSetValue = safeSetValue;
window.getTodayDate = getTodayDate;
window.getCurrentTime = getCurrentTime;
window.getCurrentDateTime = getCurrentDateTime;
window.getNextInvoiceNumber = getNextInvoiceNumber;
