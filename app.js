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
    let users = localStorage.getItem('mizan_users');
    
    if (users) {
        try {
            window.users = JSON.parse(users);
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
// SEED DATA - تهيئة البيانات التجريبية (معدلة)
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
    
    initUsers();
    
    // ===== بيانات تجريبية أكثر شمولاً =====
    const dataExists = localStorage.getItem('mizan_products') && JSON.parse(localStorage.getItem('mizan_products')).length > 0;
    
    if (!dataExists) {
        // منتجات متنوعة
        window.products = [
            { id: 1, name: 'هاتف ذكي X100', buyPrice: 8000, sellPrice: 10000, min: 5, barcode: '1234567890123' },
            { id: 2, name: 'سماعة لاسلكية', buyPrice: 500, sellPrice: 750, min: 10, barcode: '1234567890124' },
            { id: 3, name: 'شاحن سريع 65W', buyPrice: 300, sellPrice: 450, min: 15, barcode: '1234567890125' },
            { id: 4, name: 'حافظة هاتف', buyPrice: 50, sellPrice: 100, min: 20, barcode: '1234567890126' },
            { id: 5, name: 'كابل USB-C', buyPrice: 80, sellPrice: 150, min: 25, barcode: '1234567890127' },
            { id: 6, name: 'بطارية خارجية 10000mAh', buyPrice: 400, sellPrice: 600, min: 8, barcode: '1234567890128' }
        ];
        setData('products', window.products);
        
        // مخازن
        window.warehouses = [
            { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
            { id: 2, name: 'مخزن المحل', type: 'محل', address: 'الإسكندرية' },
            { id: 3, name: 'مخزن التوزيع', type: 'فرعي', address: 'الجيزة' }
        ];
        setData('warehouses', window.warehouses);
        
        // كميات المنتجات في المخازن
        window.warehouseProducts = [
            { warehouseId: 1, productId: 1, qty: 30 },
            { warehouseId: 1, productId: 2, qty: 50 },
            { warehouseId: 1, productId: 3, qty: 40 },
            { warehouseId: 1, productId: 4, qty: 60 },
            { warehouseId: 1, productId: 5, qty: 80 },
            { warehouseId: 1, productId: 6, qty: 25 },
            { warehouseId: 2, productId: 1, qty: 10 },
            { warehouseId: 2, productId: 2, qty: 20 },
            { warehouseId: 2, productId: 3, qty: 15 },
            { warehouseId: 3, productId: 4, qty: 30 },
            { warehouseId: 3, productId: 5, qty: 40 }
        ];
        setData('warehouseProducts', window.warehouseProducts);
        
        // عملاء
        window.customers = [
            { id: 1, name: 'أحمد محمد', phone: '01234567890', whatsapp: '01011993799', email: 'ahmed@test.com', address: 'القاهرة', active: true },
            { id: 2, name: 'سارة علي', phone: '01123456789', whatsapp: '01158767633', email: 'sara@test.com', address: 'الإسكندرية', active: true },
            { id: 3, name: 'محمد إبراهيم', phone: '01098765432', whatsapp: '01098765432', email: 'mohamed@test.com', address: 'الجيزة', active: true }
        ];
        setData('customers', window.customers);
        
        // موردين
        window.suppliers = [
            { id: 1, name: 'شركة الاتصالات المصرية', phone: '0234567890', whatsapp: '01158767633', email: 'info@telecom.com', address: 'القاهرة', active: true },
            { id: 2, name: 'مستورد الإلكترونيات', phone: '0223456789', whatsapp: '01234567890', email: 'info@electronics.com', address: 'الإسكندرية', active: true }
        ];
        setData('suppliers', window.suppliers);
        
        // حسابات محاسبية
        window.accounts = [
            { id: 1, name: 'أصول', type: 'assets', parentId: null },
            { id: 2, name: 'خصوم', type: 'liabilities', parentId: null },
            { id: 3, name: 'حقوق ملكية', type: 'equity', parentId: null },
            { id: 4, name: 'إيرادات', type: 'revenue', parentId: null },
            { id: 5, name: 'مصروفات', type: 'expenses', parentId: null }
        ];
        setData('accounts', window.accounts);
        
        // بيانات الشركة
        window.companyData = {
            name: 'شركة الميزان للتجارة',
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
        
        // فاتورة بيع تجريبية
        const saleItems = [
            { productId: 1, qty: 2, price: 10000, total: 20000 },
            { productId: 2, qty: 3, price: 750, total: 2250 }
        ];
        window.sales = [{
            id: Date.now(),
            number: getNextInvoiceNumber(),
            date: new Date().toISOString(),
            customerId: 1,
            items: saleItems,
            total: 22250,
            paid: 22250,
            status: 'paid',
            warehouseId: 1
        }];
        setData('sales', window.sales);
        
        // فاتورة شراء تجريبية
        const purchaseItems = [
            { productId: 1, qty: 10, price: 8000, total: 80000 },
            { productId: 2, qty: 20, price: 500, total: 10000 }
        ];
        window.purchases = [{
            id: Date.now() + 1,
            number: getNextInvoiceNumber(),
            date: new Date().toISOString(),
            supplierId: 1,
            items: purchaseItems,
            total: 90000,
            status: 'paid',
            warehouseId: 1
        }];
        setData('purchases', window.purchases);
        
        // مصروف تجريبي
        window.expenses = [{
            id: Date.now() + 2,
            date: new Date().toISOString(),
            amount: 500,
            category: 'كهرباء',
            notes: 'فاتورة كهرباء المحل',
            paymentMethod: 'cash'
        }];
        setData('expenses', window.expenses);
        
        saveAll();
        console.log('✅ تم تهيئة البيانات التجريبية بنجاح');
    }
}

// ================================================================
// CHECK LOGIN - التحقق من الدخول (معدل - الحل الرئيسي)
// ================================================================

function checkLogin() {
    const input = document.getElementById('loginPassword');
    const error = document.getElementById('loginError');
    
    if (!input) {
        console.error('⚠️ عنصر loginPassword غير موجود');
        return;
    }
    
    initUsers();
    
    let foundUser = window.users.find(u => u.password === input.value);
    
    if (!foundUser && input.value === DEFAULT_PASSWORD) {
        foundUser = window.users.find(u => u.username === 'مدير');
    }
    
    if (foundUser) {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        
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
            // 🔥 الحل الرئيسي: استدعاء seedData() هنا
            seedData();
            
            // استدعاء باقي الدوال
            if (typeof populateAllSelects === 'function') populateAllSelects();
            if (typeof refreshAllPages === 'function') refreshAllPages();
            if (typeof startAutoBackup === 'function') startAutoBackup();
            
            updateUIByPermissions();
            updateSecurityButton();
            updateClock();
            
            if (typeof syncFromFirebase === 'function') syncFromFirebase();
            
            console.log('✅ تم تحميل التطبيق بنجاح');
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

    user.password = newPwd;
    if (currentUser.username === user.username) {
        currentPassword = newPwd;
    }
    
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

    if (u.username === 'مدير') {
        showToast('⚠️ لا يمكن حذف المدير الرئيسي', 'error');
        return;
    }

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
    
    addAuditLog('delete', 'all', 'مسح جميع البيانات');
    refreshAllPages();
    showToast(`🗑️ تم مسح ${clearedCount} عنصر`, 'warning');
}

// ================================================================
// دوال مساعدة إضافية (للتأكد من وجودها)
// ================================================================

function setData(key, data) {
    try {
        localStorage.setItem('mizan_' + key, JSON.stringify(data));
    } catch (e) {
        console.error('خطأ في حفظ البيانات:', e);
    }
}

function saveAll() {
    // حفظ جميع البيانات في localStorage
    const dataKeys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 
        'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 
        'companyData', 'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 
        'inventoryAdjustments'];
    
    for (const key of dataKeys) {
        if (window[key] !== undefined) {
            setData(key, window[key]);
        }
    }
}

function showToast(message, type = 'info') {
    // دالة بسيطة لإظهار التنبيهات
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        border-radius: 8px;
        z-index: 99999;
        font-family: 'Cairo', sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function canEdit() {
    return currentUser?.role === 'admin' || currentUser?.role === 'manager';
}

function isAdmin() {
    return currentUser?.role === 'admin';
}

function canDelete() {
    return currentUser?.role === 'admin';
}

function populateUsersSelect() {
    // دالة لتعبئة قائمة المستخدمين
    const select = document.getElementById('switchUserSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">اختر مستخدم...</option>';
    for (const user of window.users) {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.username} (${user.role})`;
        if (currentUser?.username === user.username) {
            option.selected = true;
        }
        select.appendChild(option);
    }
}

function renderUsers() {
    // دالة لعرض المستخدمين
    const container = document.getElementById('usersList');
    if (!container) return;
    
    container.innerHTML = '';
    for (const user of window.users) {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <span>${user.username} - ${user.role}</span>
            ${user.username !== 'مدير' && user.username !== currentUser?.username ? 
                `<button onclick="deleteUser(${user.id})" class="btn-danger">🗑️</button>` : ''}
        `;
        container.appendChild(div);
    }
}

function updateUIByPermissions() {
    // تحديث الواجهة حسب صلاحيات المستخدم
    const role = currentUser?.role || 'viewer';
    const canEdit = role === 'admin' || role === 'manager';
    const canView = role !== 'cashier';
    
    // إخفاء/إظهار أزرار التعديل
    document.querySelectorAll('.edit-btn').forEach(el => {
        el.style.display = canEdit ? 'inline-block' : 'none';
    });
    
    document.querySelectorAll('.delete-btn').forEach(el => {
        el.style.display = role === 'admin' ? 'inline-block' : 'none';
    });
}

function updateSecurityButton() {
    // تحديث زر الأمان
    const btn = document.getElementById('securityBtn');
    if (btn) {
        btn.textContent = `🔐 ${currentUser?.username || 'مدير'}`;
    }
}

function updateClock() {
    // تحديث الساعة
    const clock = document.getElementById('clock');
    if (clock) {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('ar-EG');
    }
    setTimeout(updateClock, 1000);
}

function refreshAllPages() {
    // تحديث جميع الصفحات
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderCustomers === 'function') renderCustomers();
    if (typeof renderSuppliers === 'function') renderSuppliers();
    if (typeof renderSales === 'function') renderSales();
    if (typeof renderPurchases === 'function') renderPurchases();
    if (typeof renderWarehouses === 'function') renderWarehouses();
    if (typeof renderExpenses === 'function') renderExpenses();
}

function startAutoBackup() {
    // بدء النسخ الاحتياطي التلقائي كل 5 دقائق
    if (backupInterval) clearInterval(backupInterval);
    backupInterval = setInterval(() => {
        if (typeof createBackup === 'function') {
            createBackup();
            console.log('🔄 نسخ احتياطي تلقائي');
        }
    }, 300000);
}

function addAuditLog(action, target, details) {
    // إضافة سجل تدقيق
    if (!window.auditLog) window.auditLog = [];
    window.auditLog.push({
        id: Date.now(),
        action: action,
        target: target,
        details: details,
        user: currentUser?.username || 'unknown',
        timestamp: new Date().toISOString()
    });
    setData('auditLog', window.auditLog);
}

function closeModal() {
    // إغلاق النافذة المنبثقة
    const modal = document.querySelector('.modal.show');
    if (modal) modal.classList.remove('show');
}

// ================================================================
// التهيئة عند تحميل الصفحة
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تحميل تطبيق الميزان...');
    
    initUsers();
    
    // التحقق من حالة الدخول
    const isUnlocked = localStorage.getItem('app_unlocked') === 'true';
    const loginContainer = document.getElementById('loginContainer');
    const appContent = document.getElementById('appContent');
    
    if (isUnlocked && currentUser) {
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';
        
        setTimeout(() => {
            seedData();
            if (typeof populateAllSelects === 'function') populateAllSelects();
            if (typeof refreshAllPages === 'function') refreshAllPages();
            if (typeof startAutoBackup === 'function') startAutoBackup();
            updateUIByPermissions();
            updateSecurityButton();
            updateClock();
        }, 200);
    } else {
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (appContent) appContent.style.display = 'none';
        localStorage.removeItem('app_unlocked');
    }
    
    console.log('✅ تم تهيئة التطبيق');
});

// استدعاء التهيئة مباشرة أيضاً
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('🔄 تهيئة إضافية...');
    initUsers();
    populateUsersSelect();
}
