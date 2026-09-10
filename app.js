// ============================================================
// الميزان - الإصدار 9.0.0 (حساب الربح الصحيح)
// ============================================================

const STORAGE_KEY = 'mizan_';
const DEFAULT_PASSWORD = '123456';

// ===== Firebase Config =====
const firebaseConfig = {
    apiKey: "AIzaSyCP7vpqviR6A11gPkC7cO6MQJBGKWcnVWE",
    authDomain: "accounting-balance-ab9d3.firebaseapp.com",
    databaseURL: "https://accounting-balance-ab9d3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "accounting-balance-ab9d3",
    storageBucket: "accounting-balance-ab9d3.firebasestorage.app",
    messagingSenderId: "564321427560",
    appId: "1:564321427560:web:170368d708c4d9dd771bdd",
    measurementId: "G-D6K2GYLBKD"
};

let firebaseReady = false;
const CLOUD_PATH = 'mizan_data';

// ===== الحالة =====
let products = [], sales = [], purchases = [], returns = [], expenses = [];
let customers = [], suppliers = [], treasury = [];
let payments = [];
let currentSaleItems = [], currentPurItems = [], currentRetItems = [];
let currentPassword = localStorage.getItem('app_password') || DEFAULT_PASSWORD;
let companyData = {};
let currentReport = 'daily';

// ============================================================
// أدوات مساعدة
// ============================================================
function $(id) { return document.getElementById(id); }

function getData(key, def = []) {
    try {
        const d = localStorage.getItem(STORAGE_KEY + key);
        return d ? JSON.parse(d) : def;
    } catch (e) { return def; }
}

function setData(key, data) {
    try { localStorage.setItem(STORAGE_KEY + key, JSON.stringify(data)); } catch (e) {}
}

function showToast(msg, type = 'info') {
    const t = $('toast'); if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.className = 'toast'; }, 3000);
}

function getTodayDate() { return new Date().toISOString().split('T')[0]; }
function formatMoney(n) { return Number(n || 0).toFixed(2); }

function migrateOldProducts(oldProducts) {
    if (!Array.isArray(oldProducts)) return [];
    return oldProducts.map(p => {
        if (!p || typeof p !== 'object') return null;
        let qty = 0;
        if (typeof p.qty === 'number') qty = p.qty;
        else if (typeof p.quantity === 'number') qty = p.quantity;
        else if (Array.isArray(p.warehouseProducts)) qty = p.warehouseProducts.reduce((s, wp) => s + (wp.qty || 0), 0);
        return {
            id: p.id || Date.now() + Math.random(),
            name: p.name || 'بدون اسم',
            barcode: p.barcode || '',
            buy: parseFloat(p.buy ?? p.buyPrice ?? 0) || 0,
            sell: parseFloat(p.sell ?? p.sellPrice ?? 0) || 0,
            qty: parseInt(qty) || 0,
            min: parseInt(p.min) || 5
        };
    }).filter(Boolean);
}

// ============================================================
// حساب تكلفة البضاعة المباعة (COGS)
// ============================================================
function getCOGS(salesArr) {
    let totalCOGS = 0;
    (salesArr || []).forEach(inv => {
        (inv.items || []).forEach(item => {
            const p = products.find(pr => pr.id == item.productId);
            const costPrice = (item.costPrice !== undefined && item.costPrice > 0)
                ? item.costPrice
                : (p ? p.buy : 0);
            totalCOGS += costPrice * (item.qty || 0);
        });
    });
    return totalCOGS;
}

// ============================================================
// حساب تكلفة المرتجعات (بيع)
// ============================================================
function getReturnsCOGS(returnsArr) {
    let total = 0;
    (returnsArr || []).forEach(ret => {
        if (ret.type !== 'sale') return;
        (ret.items || []).forEach(item => {
            const p = products.find(pr => pr.id == item.productId);
            const costPrice = (item.costPrice !== undefined && item.costPrice > 0)
                ? item.costPrice
                : (p ? p.buy : 0);
            total += costPrice * (item.qty || 0);
        });
    });
    return total;
}

// ============================================================
// حساب رصيد العميل (المديونية)
// ============================================================
function getCustomerBalance(customerName) {
    if (!customerName || customerName === 'عميل نقدي') return 0;
    const creditSales = sales.filter(s =>
        s.customer === customerName && s.paymentMethod === 'credit'
    ).reduce((sum, s) => sum + (s.total || 0), 0);
    const creditReturns = returns.filter(r =>
        r.type === 'sale' && r.party === customerName && r.paymentMethod === 'credit'
    ).reduce((sum, r) => sum + (r.total || 0), 0);
    const collected = payments.filter(p =>
        p.type === 'collect' && p.party === customerName
    ).reduce((sum, p) => sum + (p.amount || 0), 0);
    return Math.max(0, creditSales - creditReturns - collected);
}

// ============================================================
// حساب رصيد المورد (الالتزام)
// ============================================================
function getSupplierBalance(supplierName) {
    if (!supplierName) return 0;
    const creditPurchases = purchases.filter(p =>
        p.supplierName === supplierName && p.payment === 'credit'
    ).reduce((sum, p) => sum + (p.total || 0), 0);
    const creditReturns = returns.filter(r =>
        r.type === 'purchase' && r.party === supplierName && r.paymentMethod === 'credit'
    ).reduce((sum, r) => sum + (r.total || 0), 0);
    const paid = payments.filter(p =>
        p.type === 'pay' && p.party === supplierName
    ).reduce((sum, p) => sum + (p.amount || 0), 0);
    return Math.max(0, creditPurchases - creditReturns - paid);
}

// ============================================================
// Firebase Init
// ============================================================
function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.warn('⚠️ Firebase SDK غير محمّل');
            return false;
        }
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseReady = true;
        console.log('✅ Firebase جاهز');
        return true;
    } catch (e) {
        console.error('❌ خطأ Firebase:', e);
        firebaseReady = false;
        return false;
    }
}

function getFirebaseRef() {
    if (!firebaseReady) return null;
    try { return firebase.database().ref(CLOUD_PATH); }
    catch (e) { return null; }
}

// ============================================================
// Cloud Sync
// ============================================================
function updateSyncStatus(msg, type = 'info') {
    const el = $('syncStatus');
    if (!el) return;
    const colors = { success: '#2D8F5E', error: '#E06060', info: '#C9A94E', warning: '#E6A830' };
    el.style.color = colors[type] || '#A89070';
    el.textContent = msg;
    if (type === 'success' || type === 'error') {
        setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 5000);
    }
}

function syncToCloud() {
    const ref = getFirebaseRef();
    if (!ref) {
        showToast('⚠️ Firebase غير متصل', 'error');
        updateSyncStatus('❌ Firebase غير متصل', 'error');
        return;
    }

    const data = {
        products, sales, purchases, returns, expenses,
        customers, suppliers, treasury, payments, companyData,
        lastSync: new Date().toISOString(),
        version: '9.0.0'
    };

    updateSyncStatus('⏳ جاري الرفع...', 'info');
    showToast('⏳ جاري الرفع...', 'info');

    ref.set(data)
        .then(() => {
            showToast('✅ تم الرفع للسحابة بنجاح', 'success');
            updateSyncStatus('✅ تم الرفع بنجاح - ' + new Date().toLocaleTimeString('ar'), 'success');
        })
        .catch((err) => {
            console.error(err);
            showToast('❌ فشل الرفع: ' + err.message, 'error');
            updateSyncStatus('❌ فشل الرفع: ' + err.message, 'error');
        });
}

function syncFromCloud() {
    const ref = getFirebaseRef();
    if (!ref) {
        showToast('⚠️ Firebase غير متصل', 'error');
        updateSyncStatus('❌ Firebase غير متصل', 'error');
        return;
    }

    if (!confirm('⚠️ سيتم استبدال البيانات الحالية ببيانات السحابة. متابعة؟')) return;

    updateSyncStatus('⏳ جاري الجلب...', 'info');
    showToast('⏳ جاري الجلب من السحابة...', 'info');

    ref.once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                showToast('⚠️ لا توجد بيانات في السحابة', 'warning');
                updateSyncStatus('⚠️ لا توجد بيانات في السحابة', 'warning');
                return;
            }
            const data = snapshot.val();
            if (data.products) products = data.products;
            if (data.sales) sales = data.sales;
            if (data.purchases) purchases = data.purchases;
            if (data.returns) returns = data.returns;
            if (data.expenses) expenses = data.expenses;
            if (data.customers) customers = data.customers;
            if (data.suppliers) suppliers = data.suppliers;
            if (data.treasury) treasury = data.treasury;
            if (data.payments) payments = data.payments;
            if (data.companyData) companyData = data.companyData;

            saveAll();
            populateAllDropdowns();
            renderProducts(); renderCashier(); renderPurchases();
            renderReturns(); renderExpenses(); renderInvoices();
            renderTreasury(); renderCustomers(); renderSuppliers();
            renderPayments();
            updateDashboard();

            showToast('✅ تم الجلب من السحابة بنجاح', 'success');
            updateSyncStatus('✅ تم الجلب بنجاح - ' + new Date().toLocaleTimeString('ar'), 'success');
        })
        .catch((err) => {
            console.error(err);
            showToast('❌ فشل الجلب: ' + err.message, 'error');
            updateSyncStatus('❌ فشل الجلب: ' + err.message, 'error');
        });
}

// ============================================================
// الساعة
// ============================================================
function updateClock() {
    const el = $('liveDateTime'); if (!el) return;
    const now = new Date();
    const date = String(now.getDate()).padStart(2, '0') + '/' +
                 String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
    const time = now.toLocaleTimeString('en-GB', { hour12: false });
    el.textContent = date + ' ' + time;
}
setInterval(updateClock, 1000);

// ============================================================
// تسجيل الدخول
// ============================================================
function checkLogin() {
    const input = $('loginPassword'), error = $('loginError');
    if (!input) return;
    if (input.value === currentPassword) {
        localStorage.setItem('app_unlocked', 'true');
        $('loginContainer').classList.add('hidden');
        $('appContent').style.display = 'block';
        if (error) error.classList.remove('show');
        input.value = '';
        showToast('🔓 مرحباً بك!', 'success');
        navigateTo('dashboard');
    } else {
        if (error) error.classList.add('show');
        input.value = ''; input.focus();
        setTimeout(() => { if (error) error.classList.remove('show'); }, 3000);
    }
}

function lockApp() {
    localStorage.removeItem('app_unlocked');
    $('loginContainer').classList.remove('hidden');
    $('appContent').style.display = 'none';
    $('loginPassword')?.focus();
}

// ============================================================
// التنقل
// ============================================================
function navigateTo(page) {
    document.querySelectorAll('.page-container').forEach(el => el.classList.remove('active'));
    const target = $('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));

    if (page === 'dashboard') updateDashboard();
    if (page === 'inventory') renderProducts();
    if (page === 'cashier') renderCashier();
    if (page === 'purchases') renderPurchases();
    if (page === 'returns') renderReturns();
    if (page === 'expenses') renderExpenses();
    if (page === 'invoices') renderInvoices();
    if (page === 'treasury') renderTreasury();
    if (page === 'customers') renderCustomers();
    if (page === 'suppliers') renderSuppliers();
    if (page === 'payments') renderPayments();
    if (page === 'reports') renderReport(currentReport);
    if (page === 'company') renderCompanyPage();
    if (page === 'settings') renderSettings();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// المخزون
// ============================================================
function saveProduct() {
    const id = $('productId').value;
    const name = $('productName').value.trim();
    const barcode = $('productBarcode').value.trim();
    const buy = parseFloat($('productBuy').value) || 0;
    const sell = parseFloat($('productSell').value) || 0;
    const qty = parseInt($('productQty').value) || 0;
    const min = parseInt($('productMin').value) || 5;
    if (!name) { showToast('⚠️ أدخل اسم المنتج', 'error'); return; }
    if (buy <= 0) { showToast('⚠️ أدخل سعر شراء صحيح', 'error'); return; }
    if (sell <= 0) { showToast('⚠️ أدخل سعر بيع صحيح', 'error'); return; }
    if (id) {
        const idx = products.findIndex(p => p.id == id);
        if (idx > -1) { products[idx] = { ...products[idx], name, barcode, buy, sell, qty, min }; showToast('✅ تم تعديل المنتج', 'success'); }
    } else {
        if (products.find(p => p.name === name)) { showToast('⚠️ المنتج موجود', 'warning'); return; }
        products.push({ id: Date.now(), name, barcode, buy, sell, qty, min, createdAt: new Date().toISOString() });
        showToast('✅ تم إضافة المنتج', 'success');
    }
    setData('products', products);
    resetProductForm(); renderProducts(); populateAllDropdowns(); updateDashboard();
}

function editProduct(id) {
    const p = products.find(pr => pr.id == id); if (!p) return;
    $('productId').value = p.id; $('productName').value = p.name;
    $('productBarcode').value = p.barcode || ''; $('productBuy').value = p.buy;
    $('productSell').value = p.sell; $('productQty').value = p.qty;
    $('productMin').value = p.min || 5;
    $('productFormTitle').textContent = '✏️ تعديل المنتج';
    $('productSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(id) {
    const p = products.find(pr => pr.id == id); if (!p) return;
    if (!confirm(`⚠️ حذف "${p.name}"؟`)) return;
    products = products.filter(pr => pr.id != id);
    setData('products', products);
    renderProducts(); populateAllDropdowns(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

function resetProductForm() {
    $('productId').value = ''; $('productName').value = '';
    $('productBarcode').value = ''; $('productBuy').value = '';
    $('productSell').value = ''; $('productQty').value = '';
    $('productMin').value = '5';
    $('productFormTitle').textContent = '➕ إضافة منتج جديد';
    $('productSaveBtnText').textContent = 'إضافة';
}

function renderProducts() {
    const container = $('productList'); if (!container) return;
    const search = ($('inventorySearch')?.value || '').trim().toLowerCase();
    let filtered = products;
    if (search) filtered = products.filter(p => p.name.toLowerCase().includes(search) || (p.barcode && p.barcode.includes(search)));
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><span>${search ? 'لا توجد نتائج' : 'لا توجد منتجات'}</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr;"><span>المنتج</span><span>الشراء</span><span>البيع</span><span>الكمية</span><span></span></div>`;
    filtered.forEach(p => {
        const low = p.qty <= (p.min || 5);
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr;">
            <span><strong>${p.name}</strong>${p.barcode ? `<br><small style="color:#A89070;font-size:10px;">${p.barcode}</small>` : ''}</span>
            <span>${formatMoney(p.buy)}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(p.sell)}</span>
            <span style="${low ? 'color:#E06060;font-weight:700;' : ''}">${p.qty}${low ? ' ⚠️' : ''}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-warning btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// ============================================================
// الكاشير
// ============================================================
function populateSaleProducts() {
    const sel = $('saleProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name} (متاح: ${p.qty})</option>`);
    sel.value = cv;
}

function populateSaleCustomers() {
    const sel = $('saleCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">عميل نقدي</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    sel.value = cv;
}

function updateSalePrice() {
    const id = $('saleProduct').value;
    if (!id) { $('salePrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('salePrice').value = p.sell;
}

function addSaleItem() {
    const id = $('saleProduct').value;
    const qty = parseInt($('saleQty').value) || 0;
    const price = parseFloat($('salePrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const ex = currentSaleItems.find(i => i.productId == id);
    const totalQty = qty + (ex ? ex.qty : 0);
    if (totalQty > p.qty) { showToast(`⚠️ الكمية المتاحة: ${p.qty}`, 'error'); return; }
    if (ex) { ex.qty += qty; ex.total = ex.qty * ex.price; }
    else currentSaleItems.push({ productId: p.id, name: p.name, qty, price, costPrice: p.buy, total: qty * price });
    $('saleQty').value = 1; $('salePrice').value = ''; $('saleProduct').value = '';
    renderCashier(); showToast('✅ تم إضافة الصنف', 'success');
}

function removeSaleItem(i) { currentSaleItems.splice(i, 1); renderCashier(); }

function renderCashier() {
    const c = $('saleItemsContainer'), tb = $('saleTotalBox'), te = $('saleTotal');
    if (!c) return;
    if (currentSaleItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    const total = currentSaleItems.reduce((s, i) => s + i.total, 0);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentSaleItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removeSaleItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' 🇪🇬';
}

function saveSale() {
    if (currentSaleItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    for (const it of currentSaleItems) {
        const p = products.find(pr => pr.id == it.productId);
        if (!p || p.qty < it.qty) { showToast(`⚠️ الكمية غير كافية: ${it.name}`, 'error'); return; }
    }
    const total = currentSaleItems.reduce((s, i) => s + i.total, 0);
    const customer = $('saleCustomer').value || 'عميل نقدي';
    const paymentMethod = document.querySelector('input[name="salePaymentMethod"]:checked')?.value || 'cash';
    const today = getTodayDate(); const now = new Date();

    if (paymentMethod === 'credit' && customer === 'عميل نقدي') {
        showToast('⚠️ اختر عميل مسجل للبيع الآجل', 'error');
        return;
    }

    // حفظ costPrice مع كل صنف
    currentSaleItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) {
            it.costPrice = p.buy;
            p.qty -= it.qty;
        }
    });

    const inv = {
        id: Date.now(), number: sales.length + 1, customer,
        paymentMethod,
        items: JSON.parse(JSON.stringify(currentSaleItems)),
        total, date: today,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString()
    };
    sales.push(inv);

    if (paymentMethod === 'cash') {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: `مبيعات نقدية - فاتورة #${inv.number} - ${customer}`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'sale', refId: inv.id
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: 0,
            note: `مبيعات آجلة - فاتورة #${inv.number} - ${customer} (دين)`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'sale_credit', refId: inv.id
        });
    }

    setData('products', products); setData('sales', sales); setData('treasury', treasury);
    currentSaleItems = []; $('saleCustomer').value = '';
    document.querySelector('input[name="salePaymentMethod"][value="cash"]').checked = true;
    renderCashier(); populateSaleProducts(); updateDashboard();
    showToast(`✅ فاتورة #${inv.number} بمبلغ ${formatMoney(total)} 🇪🇬 (${paymentMethod === 'cash' ? 'نقدي' : 'آجل'})`, 'success');
}

function clearSale() {
    if (currentSaleItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    currentSaleItems = []; $('saleCustomer').value = '';
    document.querySelector('input[name="salePaymentMethod"][value="cash"]').checked = true;
    renderCashier(); showToast('🗑️ تم الإلغاء', 'info');
}

// ============================================================
// الشراء
// ============================================================
function populatePurSuppliers() {
    const sel = $('purSupplier'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    sel.value = cv;
}

function populatePurProducts() {
    const sel = $('purProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    sel.value = cv;
}

function updatePurPrice() {
    const id = $('purProduct').value;
    if (!id) { $('purPrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('purPrice').value = p.buy;
}

function addPurItem() {
    const id = $('purProduct').value;
    const qty = parseInt($('purQty').value) || 0;
    const price = parseFloat($('purPrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const ex = currentPurItems.find(i => i.productId == id);
    if (ex) { ex.qty += qty; ex.price = price; ex.total = ex.qty * ex.price; }
    else currentPurItems.push({ productId: p.id, name: p.name, qty, price, total: qty * price });
    $('purQty').value = 1; $('purPrice').value = ''; $('purProduct').value = '';
    renderPurItems(); showToast('✅ تم الإضافة', 'success');
}

function removePurItem(i) { currentPurItems.splice(i, 1); renderPurItems(); }

function renderPurItems() {
    const c = $('purItemsContainer'), tb = $('purTotalBox'), te = $('purTotal');
    if (!c) return;
    if (currentPurItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    const total = currentPurItems.reduce((s, i) => s + i.total, 0);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentPurItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removePurItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' 🇪🇬';
}

function savePurchase() {
    if (currentPurItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    const sid = $('purSupplier').value;
    if (!sid) { showToast('⚠️ اختر مورد', 'error'); return; }
    const supplier = suppliers.find(s => s.id == sid); if (!supplier) return;
    const payment = $('purPayment').value;
    const total = currentPurItems.reduce((s, i) => s + i.total, 0);
    const today = getTodayDate(); const now = new Date();
    currentPurItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) { p.qty += it.qty; p.buy = it.price; }
    });
    const inv = {
        id: Date.now(), number: purchases.length + 1,
        supplierId: supplier.id, supplierName: supplier.name,
        items: JSON.parse(JSON.stringify(currentPurItems)), total, payment,
        status: payment === 'cash' ? 'paid' : 'pending', date: today,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString()
    };
    purchases.push(inv);
    if (payment === 'cash') {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: total,
            note: `مشتريات نقدية - فاتورة #${inv.number} - ${supplier.name}`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'purchase', refId: inv.id
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: 0,
            note: `مشتريات آجلة - فاتورة #${inv.number} - ${supplier.name} (دين)`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'purchase_credit', refId: inv.id
        });
    }
    setData('products', products); setData('purchases', purchases); setData('treasury', treasury);
    currentPurItems = []; $('purSupplier').value = '';
    renderPurItems(); renderPurchases(); populatePurProducts(); updateDashboard();
    showToast(`✅ فاتورة شراء #${inv.number} بمبلغ ${formatMoney(total)} 🇪🇬 (${payment === 'cash' ? 'نقدي' : 'آجل'})`, 'success');
}

function clearPurchase() {
    if (currentPurItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    currentPurItems = []; $('purSupplier').value = '';
    renderPurItems(); showToast('🗑️ تم الإلغاء', 'info');
}

function renderPurchases() {
    const tc = purchases.length;
    const ta = purchases.reduce((s, i) => s + (i.total || 0), 0);
    const pa = purchases.filter(i => i.status === 'pending').reduce((s, i) => s + (i.total || 0), 0);
    const today = getTodayDate();
    const tda = purchases.filter(i => i.date === today).reduce((s, i) => s + (i.total || 0), 0);
    if ($('purTotalCount')) $('purTotalCount').textContent = tc;
    if ($('purTotalAmount')) $('purTotalAmount').textContent = formatMoney(ta);
    if ($('purPendingAmount')) $('purPendingAmount').textContent = formatMoney(pa);
    if ($('purTodayAmount')) $('purTodayAmount').textContent = formatMoney(tda);
    const c = $('purchasesList'); if (!c) return;
    if (purchases.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير شراء</span></div>`; return;
    }
    const sorted = [...purchases].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.5fr 1fr 0.8fr 1fr 1.2fr;"><span>#</span><span>المورد</span><span>المبلغ</span><span>الدفع</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(inv => {
        const sc = inv.status === 'paid' ? '#2D8F5E' : '#E6A830';
        const st = inv.status === 'paid' ? '✅ نقدي' : '⏳ آجل';
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.5fr 1fr 0.8fr 1fr 1.2fr;">
            <span>#${inv.number}</span><span>${inv.supplierName}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(inv.total)}</span>
            <span style="color:${sc};font-weight:700;font-size:10px;">${st}</span>
            <span style="font-size:10px;color:#A89070;">${inv.date}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="viewPurchase(${inv.id})"><i class="fas fa-eye"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deletePurchase(${inv.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function viewPurchase(id) {
    const inv = purchases.find(p => p.id === id); if (!inv) return;
    let itemsHtml = '';
    inv.items.forEach((it, i) => {
        itemsHtml += `<tr><td>${i + 1}</td><td>${it.name}</td><td>${it.qty}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.total)}</td></tr>`;
    });
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="inv-logo" alt="logo">` : '';
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>🛒 فاتورة شراء #${inv.number}</h3>
        <div class="invoice-print">
            <div class="inv-header">
                ${logoHtml}
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>فاتورة شراء</p>
                ${companyData.phone ? `<p>📞 ${companyData.phone}</p>` : ''}
                ${companyData.address ? `<p>📍 ${companyData.address}</p>` : ''}
            </div>
            <div class="inv-info">
                <div><span class="lbl">رقم:</span> #${inv.number}</div>
                <div><span class="lbl">التاريخ:</span> ${inv.date}</div>
                <div><span class="lbl">الوقت:</span> ${inv.time}</div>
                <div><span class="lbl">المورد:</span> ${inv.supplierName}</div>
                <div><span class="lbl">الدفع:</span> ${inv.status === 'paid' ? '✅ نقدي' : '⏳ آجل'}</div>
            </div>
            <table><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="inv-total"><span>الإجمالي:</span><span>${formatMoney(inv.total)} 🇪🇬</span></div>
            <div class="inv-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

function deletePurchase(id) {
    const inv = purchases.find(p => p.id === id); if (!inv) return;
    if (!confirm(`⚠️ حذف فاتورة الشراء #${inv.number}؟`)) return;
    inv.items.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) p.qty -= it.qty;
    });
    treasury = treasury.filter(t => !((t.refType === 'purchase' || t.refType === 'purchase_credit') && t.refId === id));
    purchases = purchases.filter(p => p.id !== id);
    setData('products', products); setData('purchases', purchases); setData('treasury', treasury);
    renderPurchases(); renderProducts(); updateDashboard();
    showToast(`🗑️ تم حذف فاتورة #${inv.number}`, 'info');
}

// ============================================================
// المرتجعات
// ============================================================
function toggleReturnCustomer() {
    const type = $('retType').value;
    if ($('retPartyLabel')) $('retPartyLabel').textContent = type === 'sale' ? 'العميل' : 'المورد';
    if (type === 'sale') populateRetCustomers();
    else populateRetSuppliers();
}

function populateRetCustomers() {
    const sel = $('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر عميل...</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
}

function populateRetSuppliers() {
    const sel = $('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.name}">${s.name}</option>`);
}

function populateRetProducts() {
    const sel = $('retProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    sel.value = cv;
}

function updateRetPrice() {
    const id = $('retProduct').value;
    const type = $('retType').value;
    if (!id) { $('retPrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('retPrice').value = type === 'sale' ? p.sell : p.buy;
}

function addRetItem() {
    const id = $('retProduct').value;
    const qty = parseInt($('retQty').value) || 0;
    const price = parseFloat($('retPrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const type = $('retType').value;
    if (type === 'purchase' && qty > p.qty) { showToast(`⚠️ الكمية المتاحة: ${p.qty}`, 'error'); return; }
    const ex = currentRetItems.find(i => i.productId == id);
    if (ex) { ex.qty += qty; ex.total = ex.qty * ex.price; }
    else currentRetItems.push({ productId: p.id, name: p.name, qty, price, costPrice: p.buy, total: qty * price });
    $('retQty').value = 1; $('retPrice').value = ''; $('retProduct').value = '';
    renderRetItems(); showToast('✅ تم الإضافة', 'success');
}

function removeRetItem(i) { currentRetItems.splice(i, 1); renderRetItems(); }

function renderRetItems() {
    const c = $('retItemsContainer'), tb = $('retTotalBox'), te = $('retTotal');
    if (!c) return;
    if (currentRetItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    const total = currentRetItems.reduce((s, i) => s + i.total, 0);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentRetItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#E6A830;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removeRetItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' 🇪🇬';
}

function saveReturn() {
    if (currentRetItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    const type = $('retType').value;
    const party = $('retParty').value;
    if (!party) { showToast('⚠️ اختر العميل/المورد', 'error'); return; }
    const total = currentRetItems.reduce((s, i) => s + i.total, 0);
    const today = getTodayDate(); const now = new Date();
    currentRetItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) { if (type === 'sale') p.qty += it.qty; else p.qty -= it.qty; }
    });
    const ret = {
        id: Date.now(), number: returns.length + 1, type, party,
        paymentMethod: 'cash',
        items: JSON.parse(JSON.stringify(currentRetItems)), total, date: today,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString()
    };
    returns.push(ret);
    if (type === 'sale') {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: total,
            note: `مرتجع بيع - #${ret.number} - ${party}`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'return', refId: ret.id
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: `مرتجع شراء - #${ret.number} - ${party}`,
            date: today, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
            refType: 'return', refId: ret.id
        });
    }
    setData('products', products); setData('returns', returns); setData('treasury', treasury);
    currentRetItems = []; $('retParty').value = '';
    renderRetItems(); renderReturns(); populateRetProducts(); updateDashboard();
    showToast(`✅ مرتجع #${ret.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
}

function clearReturn() {
    if (currentRetItems.length === 0) return;
    if (!confirm('⚠️ إلغاء المرتجع؟')) return;
    currentRetItems = []; $('retParty').value = '';
    renderRetItems(); showToast('🗑️ تم الإلغاء', 'info');
}

function renderReturns() {
    const tc = returns.length;
    const ta = returns.reduce((s, i) => s + (i.total || 0), 0);
    if ($('retTotalCount')) $('retTotalCount').textContent = tc;
    if ($('retTotalAmount')) $('retTotalAmount').textContent = formatMoney(ta);
    const c = $('returnsList'); if (!c) return;
    if (returns.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`; return;
    }
    const sorted = [...returns].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1fr 1.2fr 1fr 1fr 0.8fr;"><span>#</span><span>النوع</span><span>العميل/المورد</span><span>المبلغ</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(r => {
        const tt = r.type === 'sale' ? '🔄 مرتجع بيع' : '🔄 مرتجع شراء';
        const tc2 = r.type === 'sale' ? '#E6A830' : '#E06060';
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1fr 1.2fr 1fr 1fr 0.8fr;">
            <span>#${r.number}</span>
            <span style="color:${tc2};font-weight:700;font-size:10px;">${tt}</span>
            <span>${r.party}</span>
            <span style="color:#E6A830;font-weight:700;">${formatMoney(r.total)}</span>
            <span style="font-size:10px;color:#A89070;">${r.date}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteReturn(${r.id})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
}

function deleteReturn(id) {
    const r = returns.find(x => x.id === id); if (!r) return;
    if (!confirm(`⚠️ حذف المرتجع #${r.number}؟`)) return;
    r.items.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) { if (r.type === 'sale') p.qty -= it.qty; else p.qty += it.qty; }
    });
    treasury = treasury.filter(t => !(t.refType === 'return' && t.refId === id));
    returns = returns.filter(x => x.id !== id);
    setData('products', products); setData('returns', returns); setData('treasury', treasury);
    renderReturns(); renderProducts(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// المصروفات
// ============================================================
function saveExpense() {
    const note = $('expNote').value.trim();
    const amount = parseFloat($('expAmount').value) || 0;
    const category = $('expCategory').value;
    const date = $('expDate').value || getTodayDate();
    if (!note) { showToast('⚠️ أدخل البيان', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    if (getTreasuryBalance() < amount) { showToast('⚠️ رصيد الخزنة غير كافي', 'error'); return; }
    const now = new Date();
    const exp = { id: Date.now(), note, amount, category, date,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString() };
    expenses.push(exp);
    treasury.push({
        id: Date.now() + 1, type: 'withdraw', amount,
        note: `مصروف (${category}) - ${note}`,
        date, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        refType: 'expense', refId: exp.id
    });
    setData('expenses', expenses); setData('treasury', treasury);
    $('expNote').value = ''; $('expAmount').value = '';
    renderExpenses(); updateDashboard();
    showToast(`✅ تم إضافة مصروف ${formatMoney(amount)} 🇪🇬`, 'success');
}

function renderExpenses() {
    const tc = expenses.length;
    const ta = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const today = getTodayDate();
    const tda = expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0);
    const month = today.substring(0, 7);
    const ma = expenses.filter(e => (e.date || '').startsWith(month)).reduce((s, e) => s + (e.amount || 0), 0);
    if ($('expTotalCount')) $('expTotalCount').textContent = tc;
    if ($('expTotalAmount')) $('expTotalAmount').textContent = formatMoney(ta);
    if ($('expTodayAmount')) $('expTodayAmount').textContent = formatMoney(tda);
    if ($('expMonthAmount')) $('expMonthAmount').textContent = formatMoney(ma);
    const c = $('expensesList'); if (!c) return;
    if (expenses.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-money-bill-wave"></i><span>لا توجد مصروفات</span></div>`; return;
    }
    const sorted = [...expenses].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>التصنيف</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(e => {
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.6fr;">
            <span>${e.note}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(e.amount)}</span>
            <span style="font-size:11px;color:#A89070;">${e.category || 'عام'}</span>
            <span style="font-size:10px;color:#A89070;">${e.date}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
}

function deleteExpense(id) {
    const e = expenses.find(x => x.id === id); if (!e) return;
    if (!confirm('⚠️ حذف هذا المصروف؟')) return;
    treasury = treasury.filter(t => !(t.refType === 'expense' && t.refId === id));
    expenses = expenses.filter(x => x.id !== id);
    setData('expenses', expenses); setData('treasury', treasury);
    renderExpenses(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// الفواتير
// ============================================================
function renderInvoices() {
    const c = $('invoiceList'); if (!c) return;
    const tc = sales.length;
    const ta = sales.reduce((s, i) => s + (i.total || 0), 0);
    const today = getTodayDate();
    const tda = sales.filter(i => i.date === today).reduce((s, i) => s + (i.total || 0), 0);
    if ($('invTotalCount')) $('invTotalCount').textContent = tc;
    if ($('invTotalAmount')) $('invTotalAmount').textContent = formatMoney(ta);
    if ($('invTodayAmount')) $('invTodayAmount').textContent = formatMoney(tda);
    const search = ($('invoiceSearch')?.value || '').trim().toLowerCase();
    let filtered = sales;
    if (search) filtered = sales.filter(i => String(i.number).includes(search) || (i.customer && i.customer.toLowerCase().includes(search)));
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>${search ? 'لا توجد نتائج' : 'لا توجد فواتير'}</span></div>`; return;
    }
    const sorted = [...filtered].sort((a, b) => b.id - a.id);
    let html = `<div class="table-header" style="grid-template-columns: 0.6fr 1.5fr 1fr 1fr 1.5fr;"><span>#</span><span>العميل</span><span>المبلغ</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(inv => {
        const pm = inv.paymentMethod || 'cash';
        const badge = pm === 'cash' ? '💵 نقدي' : '⏳ آجل';
        const bcolor = pm === 'cash' ? '#2D8F5E' : '#E6A830';
        html += `<div class="table-row" style="grid-template-columns: 0.6fr 1.5fr 1fr 1fr 1.5fr;">
            <span>#${inv.number}</span>
            <span>${inv.customer}<br><small style="color:${bcolor};font-size:10px;font-weight:700;">${badge}</small></span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(inv.total)}</span>
            <span style="font-size:11px;color:#A89070;">${inv.date}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="viewInvoice(${inv.id})"><i class="fas fa-eye"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteInvoice(${inv.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function viewInvoice(id) {
    const inv = sales.find(s => s.id === id); if (!inv) return;
    let itemsHtml = '';
    inv.items.forEach((it, i) => {
        itemsHtml += `<tr><td>${i + 1}</td><td>${it.name}</td><td>${it.qty}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.total)}</td></tr>`;
    });
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="inv-logo" alt="logo">` : '';
    const pm = inv.paymentMethod || 'cash';
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📄 فاتورة #${inv.number}</h3>
        <div class="invoice-print">
            <div class="inv-header">
                ${logoHtml}
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>فاتورة بيع</p>
                ${companyData.phone ? `<p>📞 ${companyData.phone}</p>` : ''}
                ${companyData.address ? `<p>📍 ${companyData.address}</p>` : ''}
                ${companyData.tax ? `<p>🆔 الرقم الضريبي: ${companyData.tax}</p>` : ''}
            </div>
            <div class="inv-info">
                <div><span class="lbl">رقم:</span> #${inv.number}</div>
                <div><span class="lbl">التاريخ:</span> ${inv.date}</div>
                <div><span class="lbl">الوقت:</span> ${inv.time}</div>
                <div><span class="lbl">العميل:</span> ${inv.customer}</div>
                <div><span class="lbl">الدفع:</span> ${pm === 'cash' ? '💵 نقدي' : '⏳ آجل'}</div>
            </div>
            <table><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="inv-total"><span>الإجمالي:</span><span>${formatMoney(inv.total)} 🇪🇬</span></div>
            <div class="inv-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

function deleteInvoice(id) {
    const inv = sales.find(s => s.id === id); if (!inv) return;
    if (!confirm(`⚠️ حذف الفاتورة #${inv.number}؟`)) return;
    inv.items.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) p.qty += it.qty;
    });
    treasury = treasury.filter(t => !((t.refType === 'sale' || t.refType === 'sale_credit') && t.refId === id));
    sales = sales.filter(s => s.id !== id);
    setData('products', products); setData('sales', sales); setData('treasury', treasury);
    renderInvoices(); renderProducts(); updateDashboard();
    showToast(`🗑️ تم الحذف`, 'info');
}

// ============================================================
// الخزنة
// ============================================================
function getTreasuryBalance() {
    return treasury.reduce((sum, t) => t.type === 'deposit' ? sum + (t.amount || 0) : sum - (t.amount || 0), 0);
}

function addTreasuryTransaction() {
    const type = $('treasuryType').value;
    const amount = parseFloat($('treasuryAmount').value) || 0;
    const note = $('treasuryNote').value.trim() || (type === 'deposit' ? 'إيداع' : 'سحب');
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    if (type === 'withdraw' && getTreasuryBalance() < amount) { showToast('⚠️ رصيد الخزنة غير كافي', 'error'); return; }
    const now = new Date();
    treasury.push({ id: Date.now(), type, amount, note,
        date: getTodayDate(),
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        refType: 'manual' });
    setData('treasury', treasury);
    $('treasuryAmount').value = ''; $('treasuryNote').value = '';
    renderTreasury(); updateDashboard();
    showToast(type === 'deposit' ? `✅ إيداع ${formatMoney(amount)}` : `✅ سحب ${formatMoney(amount)}`, 'success');
}

function renderTreasury() {
    const balance = getTreasuryBalance();
    if ($('treasuryBalance')) $('treasuryBalance').textContent = formatMoney(balance) + ' 🇪🇬';
    const dep = treasury.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.amount || 0), 0);
    const wit = treasury.filter(t => t.type === 'withdraw').reduce((s, t) => s + (t.amount || 0), 0);
    if ($('treasuryDeposits')) $('treasuryDeposits').textContent = formatMoney(dep);
    if ($('treasuryWithdrawals')) $('treasuryWithdrawals').textContent = formatMoney(wit);
    const c = $('treasuryList'); if (!c) return;
    if (treasury.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-vault"></i><span>لا توجد حركات</span></div>`; return;
    }
    const visibleTreasury = treasury.filter(t => t.amount > 0);
    const sorted = [...visibleTreasury].sort((a, b) => b.id - a.id).slice(0, 50);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>البيان</span><span>المبلغ</span><span>النوع</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(t => {
        const isDep = t.type === 'deposit';
        const color = isDep ? '#2D8F5E' : '#E06060';
        const sign = isDep ? '+' : '-';
        const canDel = t.refType === 'manual';
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;">
            <span style="font-size:11px;">${t.note}</span>
            <span style="color:${color};font-weight:700;">${sign}${formatMoney(t.amount)}</span>
            <span style="color:${color};font-size:10px;font-weight:700;">${isDep ? '💚 إيداع' : '❤️ سحب'}</span>
            <span style="font-size:10px;color:#A89070;">${t.date}<br>${t.time || ''}</span>
            ${canDel ? `<button class="btn btn-danger btn-sm" onclick="deleteTreasury(${t.id})"><i class="fas fa-trash"></i></button>` : '<span style="font-size:10px;color:#5D5D5D;">🔗</span>'}
        </div>`;
    });
    c.innerHTML = html;
}

function deleteTreasury(id) {
    const t = treasury.find(tr => tr.id === id); if (!t) return;
    if (t.refType !== 'manual') { showToast('⚠️ مرتبطة بفاتورة', 'warning'); return; }
    if (!confirm('⚠️ حذف الحركة؟')) return;
    treasury = treasury.filter(tr => tr.id !== id);
    setData('treasury', treasury);
    renderTreasury(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// لوحة التحكم (مع حساب الربح الصحيح)
// ============================================================
function updateDashboard() {
    const totalSales = sales.reduce((s, i) => s + (i.total || 0), 0);
    const totalPurchases = purchases.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpenses = expenses.reduce((s, i) => s + (i.amount || 0), 0);
    const totalReturns = returns.reduce((s, i) => s + (i.total || 0), 0);
    
    // ✅ الحساب الصحيح للربح
    const cogs = getCOGS(sales);
    const returnsCOGS = getReturnsCOGS(returns);
    const returnsPurchase = returns.filter(r => r.type === 'purchase')
        .reduce((s, r) => s + (r.total || 0), 0);
    
    const profit = totalSales - cogs - totalExpenses + returnsPurchase - returnsCOGS;
    
    if ($('dashSales')) $('dashSales').textContent = formatMoney(totalSales);
    if ($('dashPurchases')) $('dashPurchases').textContent = formatMoney(totalPurchases);
    if ($('dashExpenses')) $('dashExpenses').textContent = formatMoney(totalExpenses);
    if ($('dashReturns')) $('dashReturns').textContent = formatMoney(totalReturns);
    if ($('dashProfit')) {
        $('dashProfit').textContent = formatMoney(profit);
        $('dashProfit').style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
    }
    const balance = getTreasuryBalance();
    if ($('dashTreasury')) $('dashTreasury').textContent = formatMoney(balance);
    if ($('dashProducts')) $('dashProducts').textContent = products.length;
    const totalQty = products.reduce((s, p) => s + (p.qty || 0), 0);
    if ($('dashInventory')) $('dashInventory').textContent = totalQty;

    let totalCustomerDebt = 0;
    customers.forEach(c => { totalCustomerDebt += getCustomerBalance(c.name); });
    if ($('dashCustomerDebt')) $('dashCustomerDebt').textContent = formatMoney(totalCustomerDebt);

    let totalSupplierDebt = 0;
    suppliers.forEach(s => { totalSupplierDebt += getSupplierBalance(s.name); });
    if ($('dashSupplierDebt')) $('dashSupplierDebt').textContent = formatMoney(totalSupplierDebt);

    renderMiniChart();

    const container = $('dashLastSales');
    if (!container) return;
    if (sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد مبيعات</span></div>`;
        return;
    }
    const last5 = [...sales].sort((a, b) => b.id - a.id).slice(0, 5);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.5fr 1fr 1fr;"><span>#</span><span>العميل</span><span>المبلغ</span><span>التاريخ</span></div>`;
    last5.forEach(inv => {
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.5fr 1fr 1fr;">
            <span>#${inv.number}</span><span>${inv.customer}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(inv.total)}</span>
            <span style="font-size:11px;color:#A89070;">${inv.date}</span>
        </div>`;
    });
    container.innerHTML = html;
}

function renderMiniChart() {
    const container = $('miniChart'); if (!container) return;
    const days = [];
    const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySales = sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.total || 0), 0);
        days.push({ date: dateStr, label: dayNames[d.getDay()], total: daySales });
    }
    const maxVal = Math.max(...days.map(d => d.total), 1);
    container.innerHTML = days.map(d => {
        const h = Math.max((d.total / maxVal) * 80, 4);
        return `<div class="bar-wrap">
            <div class="bar" style="height:${h}px;">
                ${d.total > 0 ? `<span class="bar-value">${d.total.toFixed(0)}</span>` : ''}
            </div>
            <div class="bar-label">${d.label}</div>
        </div>`;
    }).join('');
}

// ============================================================
// العملاء
// ============================================================
function saveCustomer() {
    const id = $('customerId').value;
    const name = $('customerName').value.trim();
    const phone = $('customerPhone').value.trim();
    const whatsapp = $('customerWhatsapp').value.trim();
    const address = $('customerAddress').value.trim();
    if (!name) { showToast('⚠️ أدخل اسم العميل', 'error'); return; }
    if (id) {
        const idx = customers.findIndex(c => c.id == id);
        if (idx > -1) {
            customers[idx] = { ...customers[idx], name, phone, whatsapp, address };
            showToast('✅ تم تعديل العميل', 'success');
        }
    } else {
        if (customers.find(c => c.name === name)) { showToast('⚠️ العميل موجود', 'warning'); return; }
        customers.push({ id: Date.now(), name, phone, whatsapp, address, createdAt: new Date().toISOString() });
        showToast('✅ تم إضافة العميل', 'success');
    }
    setData('customers', customers);
    resetCustomerForm(); renderCustomers();
    populateSaleCustomers(); populateRetCustomers(); populateCollectCustomers();
}

function editCustomer(id) {
    const c = customers.find(cu => cu.id == id); if (!c) return;
    $('customerId').value = c.id; $('customerName').value = c.name;
    $('customerPhone').value = c.phone || '';
    $('customerWhatsapp').value = c.whatsapp || '';
    $('customerAddress').value = c.address || '';
    $('customerFormTitle').textContent = '✏️ تعديل العميل';
    $('customerSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteCustomer(id) {
    const c = customers.find(cu => cu.id == id); if (!c) return;
    const balance = getCustomerBalance(c.name);
    if (balance > 0) {
        if (!confirm(`⚠️ العميل عليه مديونية ${formatMoney(balance)} 🇪🇬. متابعة الحذف؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف العميل "${c.name}"؟`)) return;
    }
    customers = customers.filter(cu => cu.id != id);
    setData('customers', customers);
    renderCustomers(); populateSaleCustomers(); populateRetCustomers(); populateCollectCustomers();
    showToast('🗑️ تم حذف العميل', 'info');
}

function resetCustomerForm() {
    $('customerId').value = ''; $('customerName').value = '';
    $('customerPhone').value = ''; $('customerWhatsapp').value = '';
    $('customerAddress').value = '';
    $('customerFormTitle').textContent = '➕ إضافة عميل';
    $('customerSaveBtnText').textContent = 'إضافة';
}

function renderCustomers() {
    const c = $('customerList'); if (!c) return;
    const search = ($('customerSearch')?.value || '').trim().toLowerCase();
    let filtered = customers;
    if (search) filtered = customers.filter(cu =>
        cu.name.toLowerCase().includes(search) ||
        (cu.phone && cu.phone.includes(search)) ||
        (cu.whatsapp && cu.whatsapp.includes(search))
    );
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>${search ? 'لا توجد نتائج' : 'لا يوجد عملاء'}</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1.2fr 1fr 1.5fr;"><span>الاسم</span><span>الهاتف</span><span>المديونية</span><span></span></div>`;
    filtered.forEach(cu => {
        const balance = getCustomerBalance(cu.name);
        const bcolor = balance > 0 ? '#E06060' : '#2D8F5E';
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1.2fr 1fr 1.5fr;">
            <span><strong>${cu.name}</strong>${cu.whatsapp ? `<br><small style="color:#25D366;font-size:10px;">📱 ${cu.whatsapp}</small>` : ''}</span>
            <span style="font-size:11px;">${cu.phone || '-'}</span>
            <span style="color:${bcolor};font-weight:900;">${formatMoney(balance)}</span>
            <div style="display:flex;gap:4px;">
                ${balance > 0 ? `<button class="btn btn-success btn-sm" onclick="openCollectModal('${cu.name}')" title="تحصيل"><i class="fas fa-hand-holding-usd"></i></button>` : ''}
                <button class="btn btn-info btn-sm" onclick="viewCustomerStatement('${cu.name}')" title="كشف حساب"><i class="fas fa-file-invoice-dollar"></i></button>
                <button class="btn btn-warning btn-sm" onclick="editCustomer(${cu.id})" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${cu.id})" title="حذف"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function openCollectModal(customerName) {
    navigateTo('payments');
    setTimeout(() => {
        switchPayTab('collect', document.querySelectorAll('.tab-btn')[0]);
        const sel = $('collectCustomer');
        if (sel) {
            sel.value = customerName;
            updateCollectInfo();
        }
        $('collectAmount').focus();
    }, 200);
}

function viewCustomerStatement(customerName) {
    const custSales = sales.filter(s => s.customer === customerName);
    const custReturns = returns.filter(r => r.type === 'sale' && r.party === customerName);
    const custPayments = payments.filter(p => p.type === 'collect' && p.party === customerName);
    const balance = getCustomerBalance(customerName);

    const allOps = [
        ...custSales.map(s => ({ date: s.date, time: s.time, type: 'sale', desc: `فاتورة #${s.number} (${s.paymentMethod === 'credit' ? 'آجل' : 'نقدي'})`, amount: s.total })),
        ...custReturns.map(r => ({ date: r.date, time: r.time, type: 'return', desc: `مرتجع #${r.number}`, amount: -r.total })),
        ...custPayments.map(p => ({ date: p.date, time: p.time, type: 'collect', desc: `تحصيل${p.note ? ' - ' + p.note : ''}`, amount: -p.amount }))
    ].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    let rowsHtml = '';
    if (allOps.length === 0) {
        rowsHtml = `<tr><td colspan="4" style="text-align:center;color:#A89070;padding:12px;">لا توجد حركات</td></tr>`;
    } else {
        allOps.forEach(op => {
            const color = op.amount > 0 ? '#E06060' : '#2D8F5E';
            const sign = op.amount > 0 ? '+' : '';
            const icon = op.type === 'sale' ? '💰' : op.type === 'return' ? '🔄' : '✅';
            rowsHtml += `<tr>
                <td style="font-size:10px;">${op.date}<br>${op.time || ''}</td>
                <td style="font-size:11px;">${icon} ${op.desc}</td>
                <td style="color:${color};font-weight:700;font-size:11px;">${sign}${formatMoney(Math.abs(op.amount))}</td>
            </tr>`;
        });
    }

    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📋 كشف حساب: ${customerName}</h3>
        <div class="invoice-print">
            <div class="inv-header">
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>كشف حساب عميل</p>
            </div>
            <div class="inv-info">
                <div><span class="lbl">العميل:</span> ${customerName}</div>
                <div><span class="lbl">التاريخ:</span> ${getTodayDate()}</div>
                <div style="grid-column: 1 / -1; text-align:center; margin-top:8px;">
                    <span class="lbl">الرصيد الحالي:</span>
                    <span style="color:${balance > 0 ? '#E06060' : '#2D8F5E'};font-weight:900;font-size:18px;">${formatMoney(balance)} 🇪🇬</span>
                </div>
            </div>
            <table style="margin-top:10px;">
                <thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

// ============================================================
// الموردين
// ============================================================
function saveSupplier() {
    const id = $('supplierId').value;
    const name = $('supplierName').value.trim();
    const phone = $('supplierPhone').value.trim();
    const whatsapp = $('supplierWhatsapp').value.trim();
    const address = $('supplierAddress').value.trim();
    if (!name) { showToast('⚠️ أدخل اسم المورد', 'error'); return; }
    if (id) {
        const idx = suppliers.findIndex(s => s.id == id);
        if (idx > -1) {
            suppliers[idx] = { ...suppliers[idx], name, phone, whatsapp, address };
            showToast('✅ تم تعديل المورد', 'success');
        }
    } else {
        if (suppliers.find(s => s.name === name)) { showToast('⚠️ المورد موجود', 'warning'); return; }
        suppliers.push({ id: Date.now(), name, phone, whatsapp, address, createdAt: new Date().toISOString() });
        showToast('✅ تم إضافة المورد', 'success');
    }
    setData('suppliers', suppliers);
    resetSupplierForm(); renderSuppliers();
    populatePurSuppliers(); populateRetSuppliers(); populatePaySuppliers();
}

function editSupplier(id) {
    const s = suppliers.find(su => su.id == id); if (!s) return;
    $('supplierId').value = s.id; $('supplierName').value = s.name;
    $('supplierPhone').value = s.phone || '';
    $('supplierWhatsapp').value = s.whatsapp || '';
    $('supplierAddress').value = s.address || '';
    $('supplierFormTitle').textContent = '✏️ تعديل المورد';
    $('supplierSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteSupplier(id) {
    const s = suppliers.find(su => su.id == id); if (!s) return;
    const balance = getSupplierBalance(s.name);
    if (balance > 0) {
        if (!confirm(`⚠️ عليك للمورد ${formatMoney(balance)} 🇪🇬. متابعة الحذف؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف المورد "${s.name}"؟`)) return;
    }
    suppliers = suppliers.filter(su => su.id != id);
    setData('suppliers', suppliers);
    renderSuppliers(); populatePurSuppliers(); populateRetSuppliers(); populatePaySuppliers();
    showToast('🗑️ تم حذف المورد', 'info');
}

function resetSupplierForm() {
    $('supplierId').value = ''; $('supplierName').value = '';
    $('supplierPhone').value = ''; $('supplierWhatsapp').value = '';
    $('supplierAddress').value = '';
    $('supplierFormTitle').textContent = '➕ إضافة مورد';
    $('supplierSaveBtnText').textContent = 'إضافة';
}

function renderSuppliers() {
    const c = $('supplierList'); if (!c) return;
    const search = ($('supplierSearch')?.value || '').trim().toLowerCase();
    let filtered = suppliers;
    if (search) filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search) ||
        (s.phone && s.phone.includes(search))
    );
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><span>${search ? 'لا توجد نتائج' : 'لا يوجد موردين'}</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1.2fr 1fr 1.5fr;"><span>الاسم</span><span>الهاتف</span><span>المديونية</span><span></span></div>`;
    filtered.forEach(s => {
        const balance = getSupplierBalance(s.name);
        const bcolor = balance > 0 ? '#E6A830' : '#2D8F5E';
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1.2fr 1fr 1.5fr;">
            <span><strong>${s.name}</strong>${s.whatsapp ? `<br><small style="color:#25D366;font-size:10px;">📱 ${s.whatsapp}</small>` : ''}</span>
            <span style="font-size:11px;">${s.phone || '-'}</span>
            <span style="color:${bcolor};font-weight:900;">${formatMoney(balance)}</span>
            <div style="display:flex;gap:4px;">
                ${balance > 0 ? `<button class="btn btn-danger btn-sm" onclick="openPayModal('${s.name}')" title="سداد"><i class="fas fa-money-bill-wave"></i></button>` : ''}
                <button class="btn btn-info btn-sm" onclick="viewSupplierStatement('${s.name}')" title="كشف حساب"><i class="fas fa-file-invoice"></i></button>
                <button class="btn btn-warning btn-sm" onclick="editSupplier(${s.id})" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})" title="حذف"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function openPayModal(supplierName) {
    navigateTo('payments');
    setTimeout(() => {
        switchPayTab('pay', document.querySelectorAll('.tab-btn')[1]);
        const sel = $('paySupplier');
        if (sel) {
            sel.value = supplierName;
            updatePayInfo();
        }
        $('payAmount').focus();
    }, 200);
}

function viewSupplierStatement(supplierName) {
    const supPurchases = purchases.filter(p => p.supplierName === supplierName);
    const supReturns = returns.filter(r => r.type === 'purchase' && r.party === supplierName);
    const supPayments = payments.filter(p => p.type === 'pay' && p.party === supplierName);
    const balance = getSupplierBalance(supplierName);

    const allOps = [
        ...supPurchases.map(p => ({ date: p.date, time: p.time, type: 'purchase', desc: `فاتورة شراء #${p.number} (${p.payment === 'credit' ? 'آجل' : 'نقدي'})`, amount: p.total })),
        ...supReturns.map(r => ({ date: r.date, time: r.time, type: 'return', desc: `مرتجع شراء #${r.number}`, amount: -r.total })),
        ...supPayments.map(p => ({ date: p.date, time: p.time, type: 'pay', desc: `سداد${p.note ? ' - ' + p.note : ''}`, amount: -p.amount }))
    ].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    let rowsHtml = '';
    if (allOps.length === 0) {
        rowsHtml = `<tr><td colspan="4" style="text-align:center;color:#A89070;padding:12px;">لا توجد حركات</td></tr>`;
    } else {
        allOps.forEach(op => {
            const color = op.amount > 0 ? '#E6A830' : '#2D8F5E';
            const sign = op.amount > 0 ? '+' : '';
            const icon = op.type === 'purchase' ? '🛒' : op.type === 'return' ? '🔄' : '✅';
            rowsHtml += `<tr>
                <td style="font-size:10px;">${op.date}<br>${op.time || ''}</td>
                <td style="font-size:11px;">${icon} ${op.desc}</td>
                <td style="color:${color};font-weight:700;font-size:11px;">${sign}${formatMoney(Math.abs(op.amount))}</td>
            </tr>`;
        });
    }

    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📋 كشف حساب: ${supplierName}</h3>
        <div class="invoice-print">
            <div class="inv-header">
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>كشف حساب مورد</p>
            </div>
            <div class="inv-info">
                <div><span class="lbl">المورد:</span> ${supplierName}</div>
                <div><span class="lbl">التاريخ:</span> ${getTodayDate()}</div>
                <div style="grid-column: 1 / -1; text-align:center; margin-top:8px;">
                    <span class="lbl">الرصيد الحالي:</span>
                    <span style="color:${balance > 0 ? '#E6A830' : '#2D8F5E'};font-weight:900;font-size:18px;">${formatMoney(balance)} 🇪🇬</span>
                </div>
            </div>
            <table style="margin-top:10px;">
                <thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

// ============================================================
// التحصيل والسداد
// ============================================================
function populateCollectCustomers() {
    const sel = $('collectCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر عميل...</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    sel.value = cv;
}

function populatePaySuppliers() {
    const sel = $('paySupplier'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.name}">${s.name}</option>`);
    sel.value = cv;
}

function switchPayTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (tab === 'collect') {
        $('payTabCollect').style.display = 'block';
        $('payTabPay').style.display = 'none';
    } else {
        $('payTabCollect').style.display = 'none';
        $('payTabPay').style.display = 'block';
    }
}

function updateCollectInfo() {
    const name = $('collectCustomer').value;
    const box = $('collectInfoBox');
    if (!name) { box.style.display = 'none'; return; }
    const balance = getCustomerBalance(name);
    box.style.display = 'block';
    $('collectCurrentDebt').textContent = formatMoney(balance);
    const amountInput = $('collectAmount');
    amountInput.max = balance;
    amountInput.value = balance > 0 ? balance.toFixed(2) : '';
}

function updatePayInfo() {
    const name = $('paySupplier').value;
    const box = $('payInfoBox');
    if (!name) { box.style.display = 'none'; return; }
    const balance = getSupplierBalance(name);
    box.style.display = 'block';
    $('payCurrentDebt').textContent = formatMoney(balance);
    const amountInput = $('payAmount');
    amountInput.max = balance;
    amountInput.value = balance > 0 ? balance.toFixed(2) : '';
}

function saveCollect() {
    const party = $('collectCustomer').value;
    const amount = parseFloat($('collectAmount').value) || 0;
    const date = $('collectDate').value || getTodayDate();
    const note = $('collectNote').value.trim();

    if (!party) { showToast('⚠️ اختر العميل', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }

    const balance = getCustomerBalance(party);
    if (amount > balance) {
        showToast(`⚠️ المبلغ أكبر من المديونية (${formatMoney(balance)})`, 'error');
        return;
    }

    const now = new Date();
    const pay = {
        id: Date.now(), type: 'collect', party, amount, date,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        note, createdAt: now.toISOString()
    };
    payments.push(pay);

    treasury.push({
        id: Date.now() + 1, type: 'deposit', amount,
        note: `تحصيل من ${party}${note ? ' - ' + note : ''}`,
        date, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        refType: 'collect', refId: pay.id
    });

    setData('payments', payments); setData('treasury', treasury);
    $('collectAmount').value = ''; $('collectNote').value = '';
    $('collectCustomer').value = ''; $('collectInfoBox').style.display = 'none';

    renderPayments(); renderTreasury(); renderCustomers(); updateDashboard();
    showToast(`✅ تم تحصيل ${formatMoney(amount)} 🇪🇬 من ${party}`, 'success');

    setTimeout(() => showReceipt(pay), 300);
}

function savePay() {
    const party = $('paySupplier').value;
    const amount = parseFloat($('payAmount').value) || 0;
    const date = $('payDate').value || getTodayDate();
    const note = $('payNote').value.trim();

    if (!party) { showToast('⚠️ اختر المورد', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }

    const balance = getSupplierBalance(party);
    if (amount > balance) {
        showToast(`⚠️ المبلغ أكبر من الالتزام (${formatMoney(balance)})`, 'error');
        return;
    }

    if (getTreasuryBalance() < amount) {
        showToast('⚠️ رصيد الخزنة غير كافي', 'error');
        return;
    }

    const now = new Date();
    const pay = {
        id: Date.now(), type: 'pay', party, amount, date,
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        note, createdAt: now.toISOString()
    };
    payments.push(pay);

    treasury.push({
        id: Date.now() + 1, type: 'withdraw', amount,
        note: `سداد لـ ${party}${note ? ' - ' + note : ''}`,
        date, time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        refType: 'pay', refId: pay.id
    });

    setData('payments', payments); setData('treasury', treasury);
    $('payAmount').value = ''; $('payNote').value = '';
    $('paySupplier').value = ''; $('payInfoBox').style.display = 'none';

    renderPayments(); renderTreasury(); renderSuppliers(); updateDashboard();
    showToast(`✅ تم سداد ${formatMoney(amount)} 🇪🇬 لـ ${party}`, 'success');

    setTimeout(() => showReceipt(pay), 300);
}

function renderPayments() {
    const collected = payments.filter(p => p.type === 'collect').reduce((s, p) => s + (p.amount || 0), 0);
    const paid = payments.filter(p => p.type === 'pay').reduce((s, p) => s + (p.amount || 0), 0);

    if ($('payTotalCollected')) $('payTotalCollected').textContent = formatMoney(collected);
    if ($('payTotalPaid')) $('payTotalPaid').textContent = formatMoney(paid);

    const c = $('paymentsList'); if (!c) return;
    if (payments.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><span>لا توجد عمليات</span></div>`;
        return;
    }
    const sorted = [...payments].sort((a, b) => b.id - a.id).slice(0, 50);
    let html = `<div class="table-header" style="grid-template-columns: 0.8fr 1fr 1.5fr 1fr 0.8fr;"><span>النوع</span><span>التاريخ</span><span>الجهة</span><span>المبلغ</span><span></span></div>`;
    sorted.forEach(p => {
        const isCollect = p.type === 'collect';
        const color = isCollect ? '#2D8F5E' : '#E06060';
        const icon = isCollect ? '💰' : '💸';
        const label = isCollect ? 'تحصيل' : 'سداد';
        html += `<div class="table-row" style="grid-template-columns: 0.8fr 1fr 1.5fr 1fr 0.8fr;">
            <span style="color:${color};font-weight:700;font-size:11px;">${icon} ${label}</span>
            <span style="font-size:10px;color:#A89070;">${p.date}<br>${p.time || ''}</span>
            <span style="font-size:11px;">${p.party}${p.note ? `<br><small style="color:#5D5D5D;font-size:9px;">${p.note}</small>` : ''}</span>
            <span style="color:${color};font-weight:700;">${formatMoney(p.amount)}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="showReceiptById(${p.id})" title="إيصال"><i class="fas fa-receipt"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deletePayment(${p.id})" title="حذف"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
    c.innerHTML = html;
}

function showReceiptById(id) {
    const pay = payments.find(p => p.id === id); if (!pay) return;
    showReceipt(pay);
}

function showReceipt(pay) {
    const isCollect = pay.type === 'collect';
    const color = isCollect ? '#2D8F5E' : '#E06060';
    const label = isCollect ? 'إيصال استلام نقدية' : 'إيصال دفع نقدية';
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="rec-logo" alt="logo">` : '';

    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3 style="color:${color};">🧾 ${label}</h3>
        <div class="receipt-print" style="border-color:${color};">
            <div class="rec-header" style="border-color:${color};">
                ${logoHtml}
                <h2 style="color:${color};">${companyData.name || 'الميزان'}</h2>
                <p>${label}</p>
                ${companyData.phone ? `<p>📞 ${companyData.phone}</p>` : ''}
                ${companyData.address ? `<p>📍 ${companyData.address}</p>` : ''}
            </div>
            <div class="rec-info">
                <div><span class="lbl">رقم الإيصال:</span> #${pay.id.toString().slice(-6)}</div>
                <div><span class="lbl">التاريخ:</span> ${pay.date}</div>
                <div><span class="lbl">الوقت:</span> ${pay.time}</div>
                <div><span class="lbl">${isCollect ? 'العميل' : 'المورد'}:</span> ${pay.party}</div>
            </div>
            <div class="rec-amount" style="border-color:${color};">
                <div class="lbl">${isCollect ? 'المبلغ المستلم' : 'المبلغ المدفوع'}</div>
                <div class="value" style="color:${color};">${formatMoney(pay.amount)} 🇪🇬</div>
            </div>
            ${pay.note ? `<div style="text-align:center;font-size:11px;color:#A89070;margin-bottom:10px;">📝 ${pay.note}</div>` : ''}
            <div class="rec-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة الإيصال</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
}

function deletePayment(id) {
    const pay = payments.find(p => p.id === id); if (!pay) return;
    if (!confirm(`⚠️ حذف هذه العملية؟ سيتم عكس تأثيرها على الخزنة.`)) return;
    treasury = treasury.filter(t => !(t.refType === (pay.type === 'collect' ? 'collect' : 'pay') && t.refId === id));
    payments = payments.filter(p => p.id !== id);
    setData('payments', payments); setData('treasury', treasury);
    renderPayments(); renderTreasury(); renderCustomers(); renderSuppliers(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}

// ============================================================
// التقارير (بحساب الربح الصحيح)
// ============================================================
function switchReport(type, btn) {
    currentReport = type;
    document.querySelectorAll('.report-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderReport(type);
}

function renderReport(type) {
    const container = $('reportContent'); if (!container) return;
    const today = new Date();
    let title = '', rows = [];

    if (type === 'daily') {
        title = 'تقرير يومي - آخر 7 أيام';
        const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const daySales = sales.filter(s => s.date === dateStr);
            const dayReturns = returns.filter(r => r.date === dateStr);
            const sT = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
            const cogs = getCOGS(daySales);
            const pT = purchases.filter(p => p.date === dateStr).reduce((sum, p) => sum + (p.total || 0), 0);
            const eT = expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + (e.amount || 0), 0);
            const rT = dayReturns.reduce((sum, r) => sum + (r.total || 0), 0);
            const rPurchase = dayReturns.filter(r => r.type === 'purchase').reduce((sum, r) => sum + (r.total || 0), 0);
            const rCOGS = getReturnsCOGS(dayReturns);
            rows.push({
                label: dayNames[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1),
                sales: sT, cogs: cogs, purchases: pT, expenses: eT, returns: rT,
                profit: sT - cogs - eT + rPurchase - rCOGS
            });
        }
    } else if (type === 'monthly') {
        title = 'تقرير شهري - آخر 6 أشهر';
        const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            const inM = (ds) => (ds || '').startsWith(monthStr);
            const mSales = sales.filter(s => inM(s.date));
            const mReturns = returns.filter(r => inM(r.date));
            const sT = mSales.reduce((sum, s) => sum + (s.total || 0), 0);
            const cogs = getCOGS(mSales);
            const pT = purchases.filter(p => inM(p.date)).reduce((sum, p) => sum + (p.total || 0), 0);
            const eT = expenses.filter(e => inM(e.date)).reduce((sum, e) => sum + (e.amount || 0), 0);
            const rT = mReturns.reduce((sum, r) => sum + (r.total || 0), 0);
            const rPurchase = mReturns.filter(r => r.type === 'purchase').reduce((sum, r) => sum + (r.total || 0), 0);
            const rCOGS = getReturnsCOGS(mReturns);
            rows.push({
                label: monthNames[d.getMonth()] + ' ' + d.getFullYear(),
                sales: sT, cogs: cogs, purchases: pT, expenses: eT, returns: rT,
                profit: sT - cogs - eT + rPurchase - rCOGS
            });
        }
    } else {
        title = 'تقرير سنوي - آخر 3 سنوات';
        for (let i = 2; i >= 0; i--) {
            const year = today.getFullYear() - i;
            const yS = String(year);
            const inY = (ds) => (ds || '').startsWith(yS);
            const ySales = sales.filter(s => inY(s.date));
            const yReturns = returns.filter(r => inY(r.date));
            const sT = ySales.reduce((sum, s) => sum + (s.total || 0), 0);
            const cogs = getCOGS(ySales);
            const pT = purchases.filter(p => inY(p.date)).reduce((sum, p) => sum + (p.total || 0), 0);
            const eT = expenses.filter(e => inY(e.date)).reduce((sum, e) => sum + (e.amount || 0), 0);
            const rT = yReturns.reduce((sum, r) => sum + (r.total || 0), 0);
            const rPurchase = yReturns.filter(r => r.type === 'purchase').reduce((sum, r) => sum + (r.total || 0), 0);
            const rCOGS = getReturnsCOGS(yReturns);
            rows.push({
                label: 'سنة ' + year,
                sales: sT, cogs: cogs, purchases: pT, expenses: eT, returns: rT,
                profit: sT - cogs - eT + rPurchase - rCOGS
            });
        }
    }

    const tS = rows.reduce((s, r) => s + r.sales, 0);
    const tCOGS = rows.reduce((s, r) => s + (r.cogs || 0), 0);
    const tP = rows.reduce((s, r) => s + r.purchases, 0);
    const tE = rows.reduce((s, r) => s + r.expenses, 0);
    const tPr = rows.reduce((s, r) => s + r.profit, 0);
    const maxV = Math.max(...rows.flatMap(r => [r.sales, r.cogs, r.expenses]), 1);

    container.innerHTML = `
        <h3 style="font-size:14px;color:#C9A94E;margin-bottom:10px;">${title}</h3>
        <div class="report-summary">
            <div class="report-stat"><div class="num" style="color:#2D8F5E;">${formatMoney(tS)}</div><div class="lbl">💰 مبيعات</div></div>
            <div class="report-stat"><div class="num" style="color:#E06060;">${formatMoney(tCOGS)}</div><div class="lbl">📦 تكلفة بضاعة</div></div>
            <div class="report-stat"><div class="num" style="color:#E6A830;">${formatMoney(tE)}</div><div class="lbl">💸 مصروفات</div></div>
            <div class="report-stat"><div class="num" style="color:${tPr >= 0 ? '#2D8F5E' : '#E06060'};">${formatMoney(tPr)}</div><div class="lbl">📈 صافي الربح</div></div>
        </div>
        <div class="report-chart">
            <h4>📊 الرسم البياني</h4>
            <div class="chart-bars">
                ${rows.map(r => `
                    <div class="chart-bar-wrap">
                        <div style="display:flex;gap:2px;width:100%;align-items:flex-end;height:100%;justify-content:center;">
                            <div class="chart-bar sales" style="height:${Math.max((r.sales / maxV) * 100, 3)}%;width:33%;">
                                ${r.sales > 0 ? `<span class="chart-bar-value">${r.sales.toFixed(0)}</span>` : ''}
                            </div>
                            <div class="chart-bar purchases" style="height:${Math.max((r.cogs / maxV) * 100, 3)}%;width:33%;">
                                ${r.cogs > 0 ? `<span class="chart-bar-value">${r.cogs.toFixed(0)}</span>` : ''}
                            </div>
                            <div class="chart-bar expenses" style="height:${Math.max((r.expenses / maxV) * 100, 3)}%;width:33%;">
                                ${r.expenses > 0 ? `<span class="chart-bar-value">${r.expenses.toFixed(0)}</span>` : ''}
                            </div>
                        </div>
                        <div class="chart-bar-label">${r.label}</div>
                    </div>
                `).join('')}
            </div>
            <div class="report-legend">
                <span><span class="dot" style="background:#2D8F5E;"></span> مبيعات</span>
                <span><span class="dot" style="background:#E06060;"></span> تكلفة بضاعة</span>
                <span><span class="dot" style="background:#E6A830;"></span> مصروفات</span>
            </div>
        </div>
        <h3 style="font-size:14px;color:#C9A94E;margin:14px 0 10px;">📋 التفاصيل</h3>
        <div class="table-header" style="grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 1fr;"><span>الفترة</span><span>مبيعات</span><span>تكلفة</span><span>مصروفات</span><span>مرتجعات</span><span>ربح</span></div>
        ${rows.map(r => `
            <div class="table-row" style="grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 1fr;font-size:11px;">
                <span>${r.label}</span>
                <span style="color:#2D8F5E;">${formatMoney(r.sales)}</span>
                <span style="color:#E06060;">${formatMoney(r.cogs)}</span>
                <span style="color:#E6A830;">${formatMoney(r.expenses)}</span>
                <span style="color:#C9A94E;">${formatMoney(r.returns)}</span>
                <span style="color:${r.profit >= 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${formatMoney(r.profit)}</span>
            </div>
        `).join('')}
    `;
}

// ============================================================
// بيانات الشركة
// ============================================================
function renderCompanyPage() {
    if ($('setCompanyName')) $('setCompanyName').value = companyData.name || '';
    if ($('setCompanyPhone')) $('setCompanyPhone').value = companyData.phone || '';
    if ($('setCompanyAddress')) $('setCompanyAddress').value = companyData.address || '';
    if ($('setCompanyTax')) $('setCompanyTax').value = companyData.tax || '';
    if ($('setCompanyFooter')) $('setCompanyFooter').value = companyData.footer || '';
    renderLogoPreview();
    const infoParts = [];
    if (companyData.phone) infoParts.push(`📞 ${companyData.phone}`);
    if (companyData.address) infoParts.push(`📍 ${companyData.address}`);
    if (companyData.tax) infoParts.push(`🆔 ${companyData.tax}`);
    if ($('companyPreviewName')) $('companyPreviewName').textContent = companyData.name || 'اسم الشركة';
    if ($('companyPreviewInfo')) $('companyPreviewInfo').textContent = infoParts.length > 0 ? infoParts.join(' • ') : 'لم يتم إدخال بيانات بعد';
    if ($('previewName')) $('previewName').textContent = companyData.name || 'الميزان';
    if ($('previewPhone')) $('previewPhone').textContent = '📞 ' + (companyData.phone || '-');
    if ($('previewAddress')) $('previewAddress').textContent = '📍 ' + (companyData.address || '-');
    if ($('previewFooter')) $('previewFooter').textContent = companyData.footer || 'شكراً لتعاملكم معنا 🌟';
    const previewLogo = $('previewLogo');
    if (previewLogo) {
        if (companyData.logo) previewLogo.innerHTML = `<img src="${companyData.logo}" alt="logo">`;
        else previewLogo.innerHTML = '';
    }
    updateHeaderCompanyName();
}

function renderLogoPreview() {
    const box = $('logoPreviewBox');
    const companyLogo = $('companyPreviewLogo');
    if (!box) return;
    if (companyData.logo) {
        box.innerHTML = `<img src="${companyData.logo}" alt="logo">`;
        if (companyLogo) companyLogo.innerHTML = `<img src="${companyData.logo}" alt="logo">`;
    } else {
        box.innerHTML = `<i class="fas fa-image"></i><span>لا يوجد شعار</span>`;
        if (companyLogo) companyLogo.innerHTML = `<i class="fas fa-store"></i>`;
    }
}

function uploadLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
        showToast('⚠️ الصورة كبيرة (الحد: 500KB)', 'warning');
        event.target.value = ''; return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('⚠️ الملف ليس صورة', 'error');
        event.target.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        companyData.logo = e.target.result;
        setData('companyData', companyData);
        renderCompanyPage();
        showToast('✅ تم رفع الشعار بنجاح', 'success');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function removeLogo() {
    if (!companyData.logo) { showToast('⚠️ لا يوجد شعار للحذف', 'warning'); return; }
    if (!confirm('⚠️ حذف الشعار؟')) return;
    companyData.logo = null;
    setData('companyData', companyData);
    renderCompanyPage();
    showToast('🗑️ تم حذف الشعار', 'info');
}

function saveCompanySettings() {
    companyData.name = $('setCompanyName').value.trim();
    companyData.phone = $('setCompanyPhone').value.trim();
    companyData.address = $('setCompanyAddress').value.trim();
    companyData.tax = $('setCompanyTax').value.trim();
    companyData.footer = $('setCompanyFooter').value.trim();
    setData('companyData', companyData);
    renderCompanyPage();
    showToast('✅ تم حفظ بيانات الشركة', 'success');
}

function updateHeaderCompanyName() {
    const el = $('headerCompanyName');
    if (el) el.textContent = companyData.name || 'نظام محاسبة';
}

// ============================================================
// الإعدادات
// ============================================================
function renderSettings() {
    if ($('setProductsCount')) $('setProductsCount').textContent = products.length;
    if ($('setSalesCount')) $('setSalesCount').textContent = sales.length;
    let size = 0;
    for (let k in localStorage) {
        if (k.startsWith(STORAGE_KEY)) size += (localStorage[k] || '').length;
    }
    if ($('setDataSize')) $('setDataSize').textContent = (size / 1024).toFixed(1) + ' KB';
}

function changePassword() {
    const oldP = $('oldPassword').value;
    const newP = $('newPassword').value;
    const conP = $('confirmPassword').value;
    if (oldP !== currentPassword) { showToast('❌ كلمة المرور الحالية خاطئة', 'error'); return; }
    if (newP.length < 4) { showToast('❌ 4 أحرف على الأقل', 'error'); return; }
    if (newP !== conP) { showToast('❌ كلمتا المرور غير متطابقتين', 'error'); return; }
    currentPassword = newP;
    localStorage.setItem('app_password', newP);
    $('oldPassword').value = ''; $('newPassword').value = ''; $('confirmPassword').value = '';
    showToast('✅ تم تغيير كلمة المرور', 'success');
}

function exportData() {
    const data = {
        version: '9.0.0', exportDate: new Date().toISOString(),
        products, sales, purchases, returns, expenses,
        customers, suppliers, treasury, payments, companyData
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `mizan_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ تم تصدير البيانات', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('⚠️ سيتم استبدال جميع البيانات الحالية. متابعة؟')) {
        event.target.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.products) products = data.products;
            if (data.sales) sales = data.sales;
            if (data.purchases) purchases = data.purchases;
            if (data.returns) returns = data.returns;
            if (data.expenses) expenses = data.expenses;
            if (data.customers) customers = data.customers;
            if (data.suppliers) suppliers = data.suppliers;
            if (data.treasury) treasury = data.treasury;
            if (data.payments) payments = data.payments;
            if (data.companyData) companyData = data.companyData;
            saveAll();
            populateAllDropdowns();
            renderProducts(); renderCashier(); renderPurchases();
            renderReturns(); renderExpenses(); renderInvoices();
            renderTreasury(); renderCustomers(); renderSuppliers();
            renderPayments();
            updateDashboard(); renderSettings();
            showToast('✅ تم استيراد البيانات بنجاح', 'success');
        } catch (err) {
            showToast('❌ ملف غير صالح', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function clearAllData() {
    if (!confirm('⚠️ هل أنت متأكد من مسح جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟ لا يمكن التراجع!')) return;
    const keys = ['products', 'sales', 'purchases', 'returns', 'expenses',
        'customers', 'suppliers', 'treasury', 'payments', 'companyData'];
    keys.forEach(k => localStorage.removeItem(STORAGE_KEY + k));
    localStorage.removeItem('mizan_seeded');
    products = []; sales = []; purchases = []; returns = []; expenses = [];
    customers = []; suppliers = []; treasury = []; payments = []; companyData = {};
    showToast('🗑️ تم مسح جميع البيانات', 'warning');
    setTimeout(() => location.reload(), 1000);
}

function saveAll() {
    setData('products', products); setData('sales', sales);
    setData('purchases', purchases); setData('returns', returns);
    setData('expenses', expenses); setData('customers', customers);
    setData('suppliers', suppliers); setData('treasury', treasury);
    setData('payments', payments); setData('companyData', companyData);
}

// ============================================================
// Modal
// ============================================================
function openModal(html) {
    let overlay = document.getElementById('modalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modalOverlay';
        overlay.className = 'modal-overlay';
        overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };
        document.body.appendChild(overlay);
    }
    let box = overlay.querySelector('.modal-box');
    if (!box) {
        box = document.createElement('div');
        box.className = 'modal-box';
        overlay.appendChild(box);
    }
    box.innerHTML = html;
    overlay.classList.add('show');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('show');
}

// ============================================================
// Populate All Dropdowns
// ============================================================
function populateAllDropdowns() {
    populateSaleProducts(); populateSaleCustomers();
    populatePurSuppliers(); populatePurProducts();
    populateRetProducts(); toggleReturnCustomer();
    populateCollectCustomers(); populatePaySuppliers();
}

// ============================================================
// Init
// ============================================================
function init() {
    console.log('🚀 الميزان 9.0.0 - حساب الربح الصحيح');

    initFirebase();

    const rawProducts = getData('products', []);
    sales = getData('sales', []);
    purchases = getData('purchases', []);
    returns = getData('returns', []);
    expenses = getData('expenses', []);
    customers = getData('customers', []);
    suppliers = getData('suppliers', []);
    treasury = getData('treasury', []);
    payments = getData('payments', []);
    companyData = getData('companyData', {});

    products = migrateOldProducts(rawProducts);
    const allZero = products.length > 0 && products.every(p => p.qty === 0);
    if (allZero) { products = []; localStorage.removeItem(STORAGE_KEY + 'products'); }

    if (products.length === 0 && !localStorage.getItem('mizan_seeded')) {
        products = [
            { id: 1, name: 'قلم جاف', barcode: '1001', buy: 2, sell: 5, qty: 50, min: 10 },
            { id: 2, name: 'كشكول 60 ورقة', barcode: '1002', buy: 8, sell: 15, qty: 30, min: 5 },
            { id: 3, name: 'مسطرة 30 سم', barcode: '1003', buy: 3, sell: 7, qty: 40, min: 10 }
        ];
        setData('products', products);
        localStorage.setItem('mizan_seeded', 'true');
    } else {
        setData('products', products);
    }

    if (localStorage.getItem('app_unlocked') === 'true') {
        $('loginContainer').classList.add('hidden');
        $('appContent').style.display = 'block';
    }

    if ($('expDate')) $('expDate').value = getTodayDate();
    if ($('collectDate')) $('collectDate').value = getTodayDate();
    if ($('payDate')) $('payDate').value = getTodayDate();

    updateClock(); updateHeaderCompanyName(); populateAllDropdowns();
    renderProducts(); renderCashier(); renderPurchases();
    renderReturns(); renderExpenses(); renderInvoices();
    renderTreasury(); renderCustomers(); renderSuppliers();
    renderPayments();
    updateDashboard();

    navigateTo('dashboard');
    console.log('✅ الميزان جاهز');
}

document.addEventListener('DOMContentLoaded', init);

// ============================================================
// تعريض الدوال للنطاق العام
// ============================================================
window.checkLogin = checkLogin;
window.lockApp = lockApp;
window.navigateTo = navigateTo;
window.syncToCloud = syncToCloud;
window.syncFromCloud = syncFromCloud;

window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.resetProductForm = resetProductForm;

window.updateSalePrice = updateSalePrice;
window.addSaleItem = addSaleItem;
window.removeSaleItem = removeSaleItem;
window.saveSale = saveSale;
window.clearSale = clearSale;

window.updatePurPrice = updatePurPrice;
window.addPurItem = addPurItem;
window.removePurItem = removePurItem;
window.savePurchase = savePurchase;
window.clearPurchase = clearPurchase;
window.viewPurchase = viewPurchase;
window.deletePurchase = deletePurchase;

window.toggleReturnCustomer = toggleReturnCustomer;
window.updateRetPrice = updateRetPrice;
window.addRetItem = addRetItem;
window.removeRetItem = removeRetItem;
window.saveReturn = saveReturn;
window.clearReturn = clearReturn;
window.deleteReturn = deleteReturn;

window.saveExpense = saveExpense;
window.deleteExpense = deleteExpense;

window.viewInvoice = viewInvoice;
window.deleteInvoice = deleteInvoice;

window.addTreasuryTransaction = addTreasuryTransaction;
window.deleteTreasury = deleteTreasury;

window.saveCustomer = saveCustomer;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.resetCustomerForm = resetCustomerForm;
window.viewCustomerStatement = viewCustomerStatement;
window.openCollectModal = openCollectModal;

window.saveSupplier = saveSupplier;
window.editSupplier = editSupplier;
window.deleteSupplier = deleteSupplier;
window.resetSupplierForm = resetSupplierForm;
window.viewSupplierStatement = viewSupplierStatement;
window.openPayModal = openPayModal;

window.switchPayTab = switchPayTab;
window.updateCollectInfo = updateCollectInfo;
window.updatePayInfo = updatePayInfo;
window.saveCollect = saveCollect;
window.savePay = savePay;
window.showReceipt = showReceipt;
window.showReceiptById = showReceiptById;
window.deletePayment = deletePayment;

window.switchReport = switchReport;

window.saveCompanySettings = saveCompanySettings;
window.uploadLogo = uploadLogo;
window.removeLogo = removeLogo;

window.changePassword = changePassword;
window.exportData = exportData;
window.importData = importData;
window.clearAllData = clearAllData;

window.openModal = openModal;
window.closeModal = closeModal;

console.log('✅ تم تحميل جميع الدوال بنجاح');