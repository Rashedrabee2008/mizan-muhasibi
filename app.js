// ================================================================
// CONFIG
// ================================================================
const DEFAULT_PASSWORD = '123456';
const SECRET_KEY = 'Mizan_License_2025_Secret';
const DEMO_LICENSE_KEY = 'UmFzaGVkfDIwMjctMDgtMjV8fDg5YWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTA=';
const LICENSE_PRICES = { 30: 1500, 90: 2000, 180: 2500, 365: 3000, 730: 6000 };

let currentPassword = localStorage.getItem('app_password') || DEFAULT_PASSWORD;
let backupInterval = null;
let versionClickCount = 0;

let currentUser = JSON.parse(localStorage.getItem('mizan_current_user')) || null;

if (!currentUser) {
    currentUser = { username: 'مدير', role: 'admin' };
    localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
}

let invoiceCounter = parseInt(localStorage.getItem('mizan_invoice_counter')) || 1;

function getNextInvoiceNumber() {
    const current = invoiceCounter;
    invoiceCounter++;
    localStorage.setItem('mizan_invoice_counter', invoiceCounter);
    return current;
}

// ================================================================
// SECTION 1: دوال مساعدة عامة (Helper Functions)
// ================================================================

// 1.1 دوال النصوص الآمنة (لحل أخطاء safeSetText)
function safeSetText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = text !== undefined && text !== null ? text : '';
    } else {
        console.warn('⚠️ العنصر غير موجود:', elementId);
    }
}

function safeSetHTML(elementId, html) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = html !== undefined && html !== null ? html : '';
    } else {
        console.warn('⚠️ العنصر غير موجود:', elementId);
    }
}

function safeGetValue(elementId) {
    const el = document.getElementById(elementId);
    return el ? el.value : '';
}

function safeGetNumber(elementId) {
    const el = document.getElementById(elementId);
    return el ? parseFloat(el.value) || 0 : 0;
}

function safeGetInt(elementId) {
    const el = document.getElementById(elementId);
    return el ? parseInt(el.value) || 0 : 0;
}

// 1.2 دوال التاريخ والوقت (لحل أخطاء getCurrentDateTime)
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}:${seconds}`,
        full: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
        arabic: `${day}/${month}/${year} ${hours}:${minutes}`,
        dateInput: `${year}-${month}-${day}`,
        timeInput: `${hours}:${minutes}`,
        year: year,
        month: month,
        day: day,
        hours: hours,
        minutes: minutes,
        seconds: seconds
    };
}

function getCurrentDate() {
    return getCurrentDateTime().date;
}

function getCurrentTime() {
    return getCurrentDateTime().time;
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateString;
    }
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
        return dateString;
    }
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '0.00';
    return Number(amount).toLocaleString('ar-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// 1.3 دوال إدارة الجلسة (لحل أخطاء logoutApp, lockApp)
function logoutApp() {
    if (!confirm('⚠️ هل أنت متأكد من تسجيل الخروج؟')) return;
    
    if (typeof saveAllData === 'function') saveAllData();
    
    localStorage.removeItem('app_unlocked');
    localStorage.removeItem('mizan_current_user');
    
    const loginContainer = document.getElementById('loginContainer');
    const appContent = document.getElementById('appContent');
    
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (appContent) appContent.style.display = 'none';
    
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) passwordInput.value = '';
    
    showToast('👋 تم تسجيل الخروج بنجاح', 'info');
    addAuditLog('logout', 'session', 'تسجيل خروج المستخدم');
}

function lockApp() {
    const loginContainer = document.getElementById('loginContainer');
    const appContent = document.getElementById('appContent');
    
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (appContent) appContent.style.display = 'none';
    
    localStorage.removeItem('app_unlocked');
    
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
    
    showToast('🔒 تم قفل التطبيق', 'warning');
}

function checkSession() {
    const isUnlocked = localStorage.getItem('app_unlocked') === 'true';
    const user = JSON.parse(localStorage.getItem('mizan_current_user'));
    
    if (!isUnlocked || !user) {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (appContent) appContent.style.display = 'none';
        return false;
    }
    
    return true;
}

// 1.4 دوال الإشعارات
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        z-index: 99999;
        font-family: 'Cairo', 'Segoe UI', sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        max-width: 90%;
        direction: rtl;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 500);
    }, 3000);
}

// ================================================================
// SECTION 2: إدارة المستخدمين (User Management)
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

function populateUsersSelect() {
    const select = document.getElementById('switchUserSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">اختر مستخدم...</option>';
    for (const user of window.users || []) {
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
    const container = document.getElementById('usersList');
    if (!container) return;
    
    container.innerHTML = '';
    for (const user of window.users || []) {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
        `;
        div.innerHTML = `
            <span>${user.username} - ${user.role}</span>
            ${user.username !== 'مدير' && user.username !== currentUser?.username ? 
                `<button onclick="deleteUser(${user.id})" class="btn-danger" style="background:#f44336;color:white;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;">🗑️</button>` : ''}
        `;
        container.appendChild(div);
    }
}

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
// SECTION 3: إدارة كلمة المرور
// ================================================================

function changePasswordSettings() {
    if (!canEdit()) { 
        showToast('⚠️ ليس لديك صلاحية', 'error'); 
        return; 
    }

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
// SECTION 4: دوال تسجيل الدخول
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
            seedData();
            
            if (typeof populateAllSelects === 'function') populateAllSelects();
            if (typeof refreshAllPages === 'function') refreshAllPages();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderCustomers === 'function') renderCustomers();
            if (typeof renderSuppliers === 'function') renderSuppliers();
            if (typeof renderWarehouses === 'function') renderWarehouses();
            if (typeof renderSales === 'function') renderSales();
            if (typeof renderPurchases === 'function') renderPurchases();
            if (typeof renderExpenses === 'function') renderExpenses();
            
            if (typeof startAutoBackup === 'function') startAutoBackup();
            updateUIByPermissions();
            updateSecurityButton();
            updateClock();
            
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
// SECTION 5: البيانات التجريبية (Seed Data)
// ================================================================

function seedData() {
    console.log('🔄 بدء تهيئة البيانات التجريبية...');
    
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
    
    // التحقق من وجود بيانات مسبقاً
    const hasData = localStorage.getItem('mizan_products') && 
                   JSON.parse(localStorage.getItem('mizan_products')).length > 0;
    
    if (hasData) {
        console.log('📦 البيانات موجودة مسبقاً، جاري التحميل...');
        loadAllData();
        return;
    }
    
    // ===== منتجات متنوعة =====
    window.products = [
        { id: 1, name: 'هاتف ذكي X100', buyPrice: 8000, sellPrice: 10000, min: 5, barcode: '1234567890123' },
        { id: 2, name: 'سماعة لاسلكية', buyPrice: 500, sellPrice: 750, min: 10, barcode: '1234567890124' },
        { id: 3, name: 'شاحن سريع 65W', buyPrice: 300, sellPrice: 450, min: 15, barcode: '1234567890125' },
        { id: 4, name: 'حافظة هاتف', buyPrice: 50, sellPrice: 100, min: 20, barcode: '1234567890126' },
        { id: 5, name: 'كابل USB-C', buyPrice: 80, sellPrice: 150, min: 25, barcode: '1234567890127' },
        { id: 6, name: 'بطارية خارجية', buyPrice: 400, sellPrice: 600, min: 8, barcode: '1234567890128' }
    ];
    
    // ===== مخازن =====
    window.warehouses = [
        { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
        { id: 2, name: 'مخزن المحل', type: 'محل', address: 'الإسكندرية' },
        { id: 3, name: 'مخزن التوزيع', type: 'فرعي', address: 'الجيزة' }
    ];
    
    // ===== كميات المنتجات في المخازن =====
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
    
    // ===== عملاء =====
    window.customers = [
        { id: 1, name: 'أحمد محمد', phone: '01234567890', whatsapp: '01011993799', email: 'ahmed@test.com', address: 'القاهرة', active: true },
        { id: 2, name: 'سارة علي', phone: '01123456789', whatsapp: '01158767633', email: 'sara@test.com', address: 'الإسكندرية', active: true },
        { id: 3, name: 'محمد إبراهيم', phone: '01098765432', whatsapp: '01098765432', email: 'mohamed@test.com', address: 'الجيزة', active: true }
    ];
    
    // ===== موردين =====
    window.suppliers = [
        { id: 1, name: 'شركة الاتصالات المصرية', phone: '0234567890', whatsapp: '01158767633', email: 'info@telecom.com', address: 'القاهرة', active: true },
        { id: 2, name: 'مستورد الإلكترونيات', phone: '0223456789', whatsapp: '01234567890', email: 'info@electronics.com', address: 'الإسكندرية', active: true }
    ];
    
    // ===== حسابات محاسبية =====
    window.accounts = [
        { id: 1, name: 'أصول', type: 'assets', parentId: null },
        { id: 2, name: 'خصوم', type: 'liabilities', parentId: null },
        { id: 3, name: 'حقوق ملكية', type: 'equity', parentId: null },
        { id: 4, name: 'إيرادات', type: 'revenue', parentId: null },
        { id: 5, name: 'مصروفات', type: 'expenses', parentId: null }
    ];
    
    // ===== بيانات الشركة =====
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
    
    // ===== فاتورة بيع تجريبية =====
    window.sales = [{
        id: Date.now(),
        number: getNextInvoiceNumber(),
        date: new Date().toISOString(),
        customerId: 1,
        items: [
            { productId: 1, qty: 2, price: 10000, total: 20000 },
            { productId: 2, qty: 3, price: 750, total: 2250 }
        ],
        total: 22250,
        paid: 22250,
        status: 'paid',
        warehouseId: 1
    }];
    
    // ===== فاتورة شراء تجريبية =====
    window.purchases = [{
        id: Date.now() + 1,
        number: getNextInvoiceNumber(),
        date: new Date().toISOString(),
        supplierId: 1,
        items: [
            { productId: 1, qty: 10, price: 8000, total: 80000 },
            { productId: 2, qty: 20, price: 500, total: 10000 }
        ],
        total: 90000,
        status: 'paid',
        warehouseId: 1
    }];
    
    // ===== مصروف تجريبي =====
    window.expenses = [{
        id: Date.now() + 2,
        date: new Date().toISOString(),
        amount: 500,
        category: 'كهرباء',
        notes: 'فاتورة كهرباء المحل',
        paymentMethod: 'cash'
    }];
    
    // ===== حركة خزنة تجريبية =====
    window.treasury = [{
        id: Date.now() + 3,
        date: new Date().toISOString(),
        type: 'deposit',
        amount: 50000,
        method: 'cash',
        notes: 'رصيد افتتاحي',
        balance: 50000
    }];
    
    // حفظ جميع البيانات
    saveAllData();
    
    console.log('✅ تم تهيئة البيانات التجريبية بنجاح');
    console.log('📦 المنتجات:', window.products.length);
    console.log('🏢 المخازن:', window.warehouses.length);
    console.log('👤 العملاء:', window.customers.length);
    console.log('📄 الفواتير:', window.sales.length + window.purchases.length);
}

// ================================================================
// SECTION 6: حفظ وتحميل البيانات
// ================================================================

function saveAllData() {
    const dataKeys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 
        'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 
        'companyData', 'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 
        'inventoryAdjustments'];
    
    let savedCount = 0;
    for (const key of dataKeys) {
        if (window[key] !== undefined) {
            try {
                localStorage.setItem('mizan_' + key, JSON.stringify(window[key]));
                savedCount++;
            } catch (e) {
                console.error('خطأ في حفظ ' + key + ':', e);
            }
        }
    }
    console.log(`💾 تم حفظ ${savedCount} عنصر في localStorage`);
}

function loadAllData() {
    const dataKeys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 
        'expenses', 'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 
        'companyData', 'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 
        'inventoryAdjustments'];
    
    let loadedCount = 0;
    for (const key of dataKeys) {
        try {
            const data = localStorage.getItem('mizan_' + key);
            if (data) {
                window[key] = JSON.parse(data);
                loadedCount++;
            }
        } catch (e) {
            console.error('خطأ في تحميل ' + key + ':', e);
        }
    }
    console.log(`📂 تم تحميل ${loadedCount} عنصر من localStorage`);
}

function setData(key, data) {
    try {
        localStorage.setItem('mizan_' + key, JSON.stringify(data));
    } catch (e) {
        console.error('خطأ في حفظ البيانات:', e);
    }
}

function getData(key) {
    try {
        const data = localStorage.getItem('mizan_' + key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('خطأ في تحميل البيانات:', e);
        return null;
    }
}

// ================================================================
// SECTION 7: دوال التسوية (Inventory Adjustment)
// ================================================================

function updateAdjustmentDateTime() {
    const now = getCurrentDateTime();
    
    const dateInput = document.getElementById('adjustmentDate');
    const timeInput = document.getElementById('adjustmentTime');
    
    if (dateInput) dateInput.value = now.dateInput;
    if (timeInput) timeInput.value = now.timeInput;
}

function saveAdjustment() {
    const productId = safeGetInt('adjustmentProduct');
    const currentQty = safeGetNumber('adjustmentCurrent');
    const actualQty = safeGetNumber('adjustmentActual');
    const notes = safeGetValue('adjustmentNotes');
    
    if (!productId) {
        showToast('⚠️ اختر منتجاً', 'error');
        return;
    }
    
    if (actualQty < 0) {
        showToast('⚠️ الكمية الفعلية لا يمكن أن تكون سالبة', 'error');
        return;
    }
    
    const diff = actualQty - currentQty;
    
    if (!window.inventoryAdjustments) window.inventoryAdjustments = [];
    
    window.inventoryAdjustments.push({
        id: Date.now(),
        productId: productId,
        currentQty: currentQty,
        actualQty: actualQty,
        diff: diff,
        notes: notes || '',
        date: getCurrentDateTime().full,
        user: currentUser?.username || 'مدير'
    });
    
    // تحديث الكمية في المخزن
    const warehouseId = 1; // المخزن الرئيسي افتراضياً
    const wp = window.warehouseProducts.find(w => w.productId === productId && w.warehouseId === warehouseId);
    if (wp) {
        wp.qty = actualQty;
    }
    
    setData('inventoryAdjustments', window.inventoryAdjustments);
    setData('warehouseProducts', window.warehouseProducts);
    
    showToast('✅ تم تسوية المخزون بنجاح', 'success');
    addAuditLog('edit', 'inventory', `تسوية مخزون: المنتج ${productId}، الفرق: ${diff}`);
    
    // إعادة تحميل قائمة التسويات
    if (typeof renderAdjustments === 'function') renderAdjustments();
    if (typeof refreshAllPages === 'function') refreshAllPages();
    
    closeModal();
}

function renderAdjustments() {
    const container = document.getElementById('adjustmentsList');
    if (!container) return;
    
    const adjustments = window.inventoryAdjustments || [];
    
    if (adjustments.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">لا توجد تسويات سابقة</p>';
        return;
    }
    
    container.innerHTML = '';
    for (const adj of adjustments.slice(-20).reverse()) {
        const product = (window.products || []).find(p => p.id === adj.productId);
        const productName = product ? product.name : 'منتج غير معروف';
        
        const div = document.createElement('div');
        div.style.cssText = `
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        div.innerHTML = `
            <div>
                <strong>${productName}</strong>
                <span style="color:#666;font-size:12px;">${adj.date}</span>
            </div>
            <div>
                <span>السابق: ${adj.currentQty}</span>
                <span style="margin:0 8px;">→</span>
                <span>الجديد: ${adj.actualQty}</span>
                <span style="color:${adj.diff >= 0 ? '#4CAF50' : '#f44336'};margin:0 8px;">
                    (${adj.diff >= 0 ? '+' : ''}${adj.diff})
                </span>
            </div>
        `;
        container.appendChild(div);
    }
}

// ================================================================
// SECTION 8: دوال الواجهة والتحديث
// ================================================================

function updateUIByPermissions() {
    const role = currentUser?.role || 'viewer';
    const canEdit = role === 'admin' || role === 'manager';
    const isAdminUser = role === 'admin';
    
    document.querySelectorAll('.edit-btn, .btn-edit').forEach(el => {
        el.style.display = canEdit ? 'inline-block' : 'none';
    });
    
    document.querySelectorAll('.delete-btn, .btn-delete').forEach(el => {
        el.style.display = isAdminUser ? 'inline-block' : 'none';
    });
    
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdminUser ? 'block' : 'none';
    });
}

function updateSecurityButton() {
    const btn = document.getElementById('securityBtn');
    if (btn) {
        btn.textContent = `🔐 ${currentUser?.username || 'مدير'}`;
    }
}

function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('ar-EG');
    }
    setTimeout(updateClock, 1000);
}

function refreshAllPages() {
    console.log('🔄 تحديث جميع الصفحات...');
    
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderCustomers === 'function') renderCustomers();
    if (typeof renderSuppliers === 'function') renderSuppliers();
    if (typeof renderSales === 'function') renderSales();
    if (typeof renderPurchases === 'function') renderPurchases();
    if (typeof renderWarehouses === 'function') renderWarehouses();
    if (typeof renderExpenses === 'function') renderExpenses();
    if (typeof renderAdjustments === 'function') renderAdjustments();
    if (typeof renderTreasury === 'function') renderTreasury();
    
    console.log('✅ تم تحديث جميع الصفحات');
}

function startAutoBackup() {
    if (backupInterval) clearInterval(backupInterval);
    backupInterval = setInterval(() => {
        if (typeof createBackup === 'function') {
            createBackup();
            console.log('🔄 نسخ احتياطي تلقائي');
        } else {
            // نسخ احتياطي بسيط
            saveAllData();
            console.log('🔄 نسخ احتياطي تلقائي (بسيط)');
        }
    }, 300000); // كل 5 دقائق
}

function closeModal() {
    const modal = document.querySelector('.modal.show');
    if (modal) modal.classList.remove('show');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

// ================================================================
// SECTION 9: دوال الصلاحيات والتحقق
// ================================================================

function canEdit() {
    return currentUser?.role === 'admin' || currentUser?.role === 'manager';
}

function isAdmin() {
    return currentUser?.role === 'admin';
}

function canDelete() {
    return currentUser?.role === 'admin';
}

function canView() {
    return currentUser?.role !== 'cashier' || currentUser?.role === 'admin';
}

// ================================================================
// SECTION 10: سجل التدقيق (Audit Log)
// ================================================================

function addAuditLog(action, target, details) {
    if (!window.auditLog) window.auditLog = [];
    window.auditLog.push({
        id: Date.now(),
        action: action,
        target: target,
        details: details || '',
        user: currentUser?.username || 'unknown',
        timestamp: new Date().toISOString()
    });
    
    // حفظ آخر 1000 سجل فقط
    if (window.auditLog.length > 1000) {
        window.auditLog = window.auditLog.slice(-1000);
    }
    
    setData('auditLog', window.auditLog);
}

function renderAuditLog() {
    const container = document.getElementById('auditLogList');
    if (!container) return;
    
    const logs = window.auditLog || [];
    
    if (logs.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">لا توجد سجلات</p>';
        return;
    }
    
    container.innerHTML = '';
    for (const log of logs.slice(-50).reverse()) {
        const div = document.createElement('div');
        div.style.cssText = `
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
            display: flex;
            justify-content: space-between;
        `;
        div.innerHTML = `
            <span>${log.details || `${log.action} - ${log.target}`}</span>
            <span style="color:#999;font-size:11px;">${formatDateTime(log.timestamp)}</span>
        `;
        container.appendChild(div);
    }
}

// ================================================================
// SECTION 11: دوال التنبيهات (Alerts)
// ================================================================

function checkLowStock() {
    const alerts = [];
    const products = window.products || [];
    const wp = window.warehouseProducts || [];
    
    for (const product of products) {
        const totalQty = wp
            .filter(w => w.productId === product.id)
            .reduce((sum, w) => sum + w.qty, 0);
        
        if (totalQty <= (product.min || 0)) {
            alerts.push({
                product: product.name,
                qty: totalQty,
                min: product.min || 0
            });
        }
    }
    
    return alerts;
}

function renderAlerts() {
    const container = document.getElementById('alertsList');
    if (!container) return;
    
    const alerts = checkLowStock();
    
    if (alerts.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px;color:#4CAF50;">
                ✅ جميع المنتجات متوفرة
                <br><span style="font-size:12px;color:#999;">لا توجد منتجات منخفضة المخزون</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    for (const alert of alerts) {
        const div = document.createElement('div');
        div.style.cssText = `
            padding: 10px 14px;
            background: #fff3e0;
            border-right: 4px solid #ff9800;
            margin-bottom: 8px;
            border-radius: 4px;
        `;
        div.innerHTML = `
            <strong>⚠️ ${alert.product}</strong>
            <span style="color:#f44336;">الكمية: ${alert.qty}</span>
            <span style="color:#999;font-size:12px;">الحد الأدنى: ${alert.min}</span>
        `;
        container.appendChild(div);
    }
}

// ================================================================
// SECTION 12: التهيئة عند تحميل الصفحة
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تحميل تطبيق الميزان...');
    console.log('📅 التاريخ:', new Date().toLocaleDateString('ar-EG'));
    console.log('🕐 الوقت:', new Date().toLocaleTimeString('ar-EG'));
    
    initUsers();
    
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
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof renderAlerts === 'function') renderAlerts();
            if (typeof startAutoBackup === 'function') startAutoBackup();
            
            updateUIByPermissions();
            updateSecurityButton();
            updateClock();
            
            console.log('✅ تم تهيئة التطبيق بنجاح');
        }, 200);
    } else {
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (appContent) appContent.style.display = 'none';
        localStorage.removeItem('app_unlocked');
    }
});

// استدعاء التهيئة مباشرة
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('🔄 تهيئة إضافية...');
    initUsers();
    populateUsersSelect();
}

// ================================================================
// SECTION 13: مسح البيانات
// ================================================================

function clearAllData() {
    if (!canDelete()) { 
        showToast('⚠️ ليس لديك صلاحية', 'error'); 
        return; 
    }
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟')) return;

    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'
    ];
    
    let clearedCount = 0;
    for (const key of keys) {
        try {
            localStorage.removeItem('mizan_' + key);
            clearedCount++;
        } catch(e) {}
        
        // إعادة تعيين المتغيرات
        if (key === 'products') window.products = [];
        else if (key === 'customers') window.customers = [];
        else if (key === 'suppliers') window.suppliers = [];
        else if (key === 'purchases') window.purchases = [];
        else if (key === 'sales') window.sales = [];
        else if (key === 'returns') window.returns = [];
        else if (key === 'expenses') window.expenses = [];
        else if (key === 'treasury') window.treasury = [];
        else if (key === 'bonds') window.bonds = [];
        else if (key === 'warehouses') window.warehouses = [];
        else if (key === 'warehouseProducts') window.warehouseProducts = [];
        else if (key === 'permissions') window.permissions = [];
        else if (key === 'companyData') window.companyData = {};
        else if (key === 'backups') window.backups = [];
        else if (key === 'accounts') window.accounts = [];
        else if (key === 'auditLog') window.auditLog = [];
        else if (key === 'alerts') window.alerts = [];
        else if (key === 'cashierHistory') window.cashierHistory = [];
        else if (key === 'inventoryAdjustments') window.inventoryAdjustments = [];
    }
    
    addAuditLog('delete', 'all', 'مسح جميع البيانات');
    refreshAllPages();
    showToast(`🗑️ تم مسح ${clearedCount} عنصر`, 'warning');
}

console.log('📦 تم تحميل app.js بنجاح');
console.log('🔑 المستخدم الحالي:', currentUser?.username);
console.log('👥 عدد المستخدمين:', window.users?.length || 0);
