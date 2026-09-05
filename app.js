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
// INIT USERS - تهيئة المستخدمين (معدلة)
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
// SEED DATA - تهيئة البيانات (معدلة)
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
// CHECK LOGIN - التحقق من الدخول (معدل)
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
// CHANGE PASSWORD - تغيير كلمة المرور (معدل)
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
// ADD USER - إضافة مستخدم (معدل)
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
// DELETE USER - حذف مستخدم (معدل)
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
// SWITCH USER - تبديل المستخدم (معدل)
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
// CLEAR ALL DATA - مسح البيانات (معدل - لا يمسح المستخدمين)
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
