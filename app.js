// ================================================================
// ================================================================
// ================================================================
// app.js - الملف الرئيسي الكامل والمتكامل
// ================================================================
// ================================================================
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
    const arrayKeys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses', 
                       'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'backups', 
                       'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'];
    
    arrayKeys.forEach(key => {
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
    
    console.log('✅ تم تهيئة جميع المتغيرات بنجاح');
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
        
        localStorage.setItem('mizan_auto_restore', JSON.stringify({
            products: window.products, 
            customers: window.customers, 
            suppliers: window.suppliers, 
            purchases: window.purchases, 
            sales: window.sales, 
            returns: window.returns,
            expenses: window.expenses, 
            treasury: window.treasury, 
            bonds: window.bonds, 
            warehouses: window.warehouses,
            warehouseProducts: window.warehouseProducts,
            permissions: window.permissions, 
            companyData: window.companyData, 
            backups: window.backups, 
            accounts: window.accounts, 
            auditLog: window.auditLog, 
            alerts: window.alerts, 
            cashierHistory: window.cashierHistory,
            inventoryAdjustments: window.inventoryAdjustments, 
            users: window.users,
            savedAt: Date.now()
        }));
    } catch (e) {
        console.warn('⚠️ خطأ في الحفظ:', e);
    }
}

// ================================================================
// AUDIT LOG - سجل النشاطات
// ================================================================
function addAuditLog(action, type, details, extraData = null) {
    const dt = getCurrentDateTime();
    
    // ترجمة التقارير
    let finalDetails = details;
    if (type === 'report' || (type === 'add' && details && details.includes('تقرير'))) {
        for (const [key, value] of Object.entries(REPORT_NAMES)) {
            if (details && details.includes(key)) {
                finalDetails = details.replace(key, value);
                break;
            }
        }
        if (finalDetails && !finalDetails.includes('تقرير') && !finalDetails.includes('كشف')) {
            finalDetails = 'تقرير ' + finalDetails;
        }
    }
    
    const entry = {
        id: Date.now(),
        action: action,
        type: type,
        details: finalDetails || details || '',
        user: window.currentUser?.username || 'admin',
        userRole: window.currentUser?.role || 'admin',
        date: dt.date,
        time: dt.time,
        timestamp: new Date().toISOString(),
        extra: extraData || {}
    };
    
    if (action === 'sale' && extraData?.invoice) {
        entry.extra = {
            customer: extraData.invoice.customer || 'غير محدد',
            total: extraData.invoice.total || 0,
            itemsCount: extraData.invoice.items?.length || 0,
            items: extraData.invoice.items || [],
            payment: extraData.invoice.payment || 'نقدي',
            invoiceType: extraData.invoice.invoiceType || 'simple'
        };
    }
    
    if (action === 'purchase' && extraData?.invoice) {
        entry.extra = {
            supplier: extraData.invoice.supplier || 'غير محدد',
            total: extraData.invoice.total || 0,
            itemsCount: extraData.invoice.items?.length || 0,
            items: extraData.invoice.items || [],
            payment: extraData.invoice.payment || 'نقدي',
            invoiceType: extraData.invoice.invoiceType || 'simple'
        };
    }
    
    if (action === 'edit' && extraData) {
        entry.extra = {
            oldData: extraData.oldData || {},
            newData: extraData.newData || {},
            changes: extraData.changes || {}
        };
    }
    
    if (action === 'delete' && extraData) {
        entry.extra = {
            deletedData: extraData.deletedData || {}
        };
    }
    
    if (!window.auditLog) window.auditLog = [];
    window.auditLog.unshift(entry);
    
    if (window.auditLog.length > 1000) {
        window.auditLog = window.auditLog.slice(0, 1000);
    }
    
    setData('auditLog', window.auditLog);
    renderAudit();
    
    return entry;
}

// ================================================================
// RENDER AUDIT
// ================================================================
function renderAudit() { 
    filterAudit('all'); 
}

let auditFilter = 'all';

function filterAudit(filter) {
    auditFilter = filter;
    const container = document.getElementById('auditList');
    if (!container) return;

    const canView = canViewAudit();
    if (!canView) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>ليس لديك صلاحية لعرض سجل النشاطات</span></div>`;
        return;
    }

    if (!window.auditLog || !Array.isArray(window.auditLog) || window.auditLog.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد نشاطات</span></div>`;
        return;
    }

    let filtered = window.auditLog;
    if (filter !== 'all') {
        filtered = window.auditLog.filter(a => a.action === filter);
    }

    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => {
        const chipText = chip.textContent.trim();
        const isActive = (filter === 'all' && chipText === 'الكل') ||
                         (filter === 'add' && chipText === '➕ إضافة') ||
                         (filter === 'edit' && chipText === '✏️ تعديل') ||
                         (filter === 'delete' && chipText === '🗑️ حذف') ||
                         (filter === 'sale' && chipText === '💰 بيع') ||
                         (filter === 'purchase' && chipText === '🛒 شراء') ||
                         (filter === 'return' && chipText === '🔄 مرتجع');
        chip.classList.toggle('active', isActive);
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد نشاطات مطابقة</span></div>`;
        return;
    }

    const actionNames = { 
        add: '➕ إضافة', 
        edit: '✏️ تعديل', 
        delete: '🗑️ حذف', 
        sale: '💰 بيع', 
        purchase: '🛒 شراء', 
        return: '🔄 مرتجع' 
    };
    const colors = { 
        add: '#2D8F5E', 
        edit: '#E6A830', 
        delete: '#E06060', 
        sale: '#4A8AB5', 
        purchase: '#C9A94E', 
        return: '#E6A830' 
    };

    let html = `<div style="margin-bottom:8px;color:#A89070;font-size:12px;">عرض ${filtered.length} من ${window.auditLog.length} نشاط</div>`;

    filtered.slice(0, 100).forEach(a => {
        let detailsHtml = `<span>${a.details || ''}</span>`;
        
        if (a.action === 'sale' && a.extra) {
            const extra = a.extra;
            detailsHtml += `
                <div style="font-size:10px;color:#A89070;margin-top:2px;">
                    👤 ${extra.customer || 'غير محدد'} | 
                    💰 ${(extra.total || 0).toFixed(2)} | 
                    📦 ${extra.itemsCount || 0} صنف | 
                    💳 ${extra.payment || 'نقدي'}
                    ${extra.invoiceType === 'tax' ? ' 🧾 ضريبي' : ''}
                </div>
            `;
            if (extra.items && extra.items.length > 0) {
                detailsHtml += `<div style="font-size:9px;color:#5D5D5D;margin-top:2px;">`;
                extra.items.forEach((item, i) => {
                    detailsHtml += `${i+1}- ${item.productName} (${item.qty} × ${item.price.toFixed(2)}) = ${item.total.toFixed(2)} | `;
                });
                detailsHtml += `</div>`;
            }
        }
        
        if (a.action === 'purchase' && a.extra) {
            const extra = a.extra;
            detailsHtml += `
                <div style="font-size:10px;color:#A89070;margin-top:2px;">
                    🏢 ${extra.supplier || 'غير محدد'} | 
                    💰 ${(extra.total || 0).toFixed(2)} | 
                    📦 ${extra.itemsCount || 0} صنف | 
                    💳 ${extra.payment || 'نقدي'}
                    ${extra.invoiceType === 'tax' ? ' 🧾 ضريبي' : ''}
                </div>
            `;
            if (extra.items && extra.items.length > 0) {
                detailsHtml += `<div style="font-size:9px;color:#5D5D5D;margin-top:2px;">`;
                extra.items.forEach((item, i) => {
                    detailsHtml += `${i+1}- ${item.productName} (${item.qty} × ${item.price.toFixed(2)}) = ${item.total.toFixed(2)} | `;
                });
                detailsHtml += `</div>`;
            }
        }
        
        if (a.action === 'edit' && a.extra) {
            const extra = a.extra;
            if (extra.changes && Object.keys(extra.changes).length > 0) {
                detailsHtml += `<div style="font-size:10px;color:#E6A830;margin-top:2px;">`;
                Object.entries(extra.changes).forEach(([key, change]) => {
                    detailsHtml += `🔄 ${key}: ${change.old} → ${change.new} | `;
                });
                detailsHtml += `</div>`;
            }
        }
        
        if (a.action === 'delete' && a.extra) {
            const extra = a.extra;
            if (extra.deletedData && Object.keys(extra.deletedData).length > 0) {
                detailsHtml += `<div style="font-size:10px;color:#E06060;margin-top:2px;">`;
                Object.entries(extra.deletedData).forEach(([key, value]) => {
                    if (typeof value !== 'object') {
                        detailsHtml += `🗑️ ${key}: ${value} | `;
                    }
                });
                detailsHtml += `</div>`;
            }
        }

        html += `
            <div class="table-row" style="font-size:12px;color:#F5E6C8;border-bottom:1px solid #2D2D2D;padding:8px 0;">
                <div style="display:grid;grid-template-columns:1.2fr 1fr 2fr 1fr;gap:6px;width:100%;">
                    <span style="font-size:10px;color:#A89070;">${a.date} ${a.time}</span>
                    <span style="color:${colors[a.action] || '#C9A94E'};font-weight:700;font-size:11px;">${actionNames[a.action] || a.action}</span>
                    <div style="font-size:11px;">${detailsHtml}</div>
                    <span style="font-size:10px;color:#5D5D5D;">👤 ${a.user}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// CLEAR AUDIT
// ================================================================
function clearAudit() {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ مسح سجل النشاطات؟')) return;

    window.auditLog = [];
    setData('auditLog', window.auditLog);
    renderAudit();
    showToast('🗑️ تم مسح السجل', 'info');
}

// ================================================================
// GENERATE REPORT (مطور)
// ================================================================
function generateReport(type) {
    const container = document.getElementById('reportResult');
    if (!container) return;

    let html = '';

    const totalSales = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalPurchases = window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalExpenses = window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0;
    const profit = totalSales - totalPurchases - totalExpenses;

    const reportName = REPORT_NAMES[type] || type;

    switch (type) {
        case 'sales':
            const salesByWarehouse = {};
            if (window.sales) {
                window.sales.forEach(s => {
                    const wId = s.warehouseId || 0;
                    const w = window.warehouses ? window.warehouses.find(wh => wh.id === wId) : null;
                    const wName = w ? w.name : 'غير محدد';
                    const total = s.totalWithTax || s.total || 0;
                    salesByWarehouse[wName] = (salesByWarehouse[wName] || 0) + total;
                });
            }

            let salesDetails = '';
            if (window.sales) {
                window.sales.slice().reverse().forEach(s => {
                    const total = s.totalWithTax || s.total || 0;
                    salesDetails += `
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                            <span>${s.date}</span>
                            <span>${s.customer}</span>
                            <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                        </div>
                    `;
                });
            }

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 تقرير المبيعات</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)} 🇪🇬</span></div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="font-weight:700;color:#C9A94E;font-size:12px;margin-bottom:4px;">🏢 حسب المخزن:</div>
                        ${Object.entries(salesByWarehouse).map(([name, total]) => 
                            `<div style="padding:2px 0;color:#F5E6C8;">• ${name}: ${total.toFixed(2)} 🇪🇬</div>`
                        ).join('') || '<div style="color:#5D5D5D;">لا توجد بيانات</div>'}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:11px;border:1px solid #2D2D2D;max-height:200px;overflow-y:auto;">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:2px solid #C9A94E;">
                            <span>التاريخ</span><span>العميل</span><span>المبلغ</span>
                        </div>
                        ${salesDetails || '<div style="padding:8px;color:#5D5D5D;">لا توجد فواتير</div>'}
                    </div>
                </div>
            `;
            break;

        case 'purchases':
            const purchasesByWarehouse = {};
            if (window.purchases) {
                window.purchases.forEach(p => {
                    const wId = p.warehouseId || 0;
                    const w = window.warehouses ? window.warehouses.find(wh => wh.id === wId) : null;
                    const wName = w ? w.name : 'غير محدد';
                    const total = p.totalWithTax || p.total || 0;
                    purchasesByWarehouse[wName] = (purchasesByWarehouse[wName] || 0) + total;
                });
            }

            let purchasesDetails = '';
            if (window.purchases) {
                window.purchases.slice().reverse().forEach(p => {
                    const total = p.totalWithTax || p.total || 0;
                    purchasesDetails += `
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                            <span>${p.date}</span>
                            <span>${p.supplier}</span>
                            <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                        </div>
                    `;
                });
            }

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 تقرير المشتريات</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;">${totalPurchases.toFixed(2)} 🇪🇬</span></div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="font-weight:700;color:#C9A94E;font-size:12px;margin-bottom:4px;">🏢 حسب المخزن:</div>
                        ${Object.entries(purchasesByWarehouse).map(([name, total]) => 
                            `<div style="padding:2px 0;color:#F5E6C8;">• ${name}: ${total.toFixed(2)} 🇪🇬</div>`
                        ).join('') || '<div style="color:#5D5D5D;">لا توجد بيانات</div>'}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:11px;border:1px solid #2D2D2D;max-height:200px;overflow-y:auto;">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:2px solid #C9A94E;">
                            <span>التاريخ</span><span>المورد</span><span>المبلغ</span>
                        </div>
                        ${purchasesDetails || '<div style="padding:8px;color:#5D5D5D;">لا توجد فواتير</div>'}
                    </div>
                </div>
            `;
            break;

        case 'profit':
            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">💰 تقرير الأرباح</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">الإيرادات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">التكاليف</span><span class="detail-value" style="color:#E06060;">${(totalPurchases+totalExpenses).toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">صافي الربح</span><span class="detail-value" style="color:#C9A94E;font-size:17px;">${profit.toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">هامش الربح</span><span class="detail-value">${totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0}%</span></div>
                </div>
            `;
            break;

        case 'inventory':
            const inventoryData = window.products ? window.products.map(p => {
                const qty = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
                return { name: p.name, qty: qty, buyPrice: p.buyPrice, sellPrice: p.sellPrice, value: qty * p.sellPrice };
            }).sort((a, b) => b.value - a.value) : [];

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📦 تقرير المخزون</h4>
                    <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                        <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                            <span>المنتج</span><span>الكمية</span><span>سعر الشراء</span><span>سعر البيع</span><span>القيمة</span>
                        </div>
                        ${inventoryData.map(p => `
                            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                                <span>${p.name}</span>
                                <span>${p.qty}</span>
                                <span>${p.buyPrice.toFixed(2)}</span>
                                <span>${p.sellPrice.toFixed(2)}</span>
                                <span style="color:#C9A94E;font-weight:700;">${p.value.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div><span style="font-weight:600;color:#A89070;">إجمالي القيمة:</span> <span style="color:#C9A94E;font-weight:700;">${inventoryData.reduce((s,p) => s + p.value, 0).toFixed(2)} 🇪🇬</span></div>
                            <div><span style="font-weight:600;color:#A89070;">عدد المنتجات:</span> <span style="color:#C9A94E;font-weight:700;">${inventoryData.length}</span></div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'customers_report':
            const customerData = window.customers ? window.customers.map(c => {
                const total = window.sales ? window.sales.filter(s => s.customer === c.name).reduce((sum, s) => {
                    if (s.items) return sum + s.items.reduce((ss, item) => ss + (item.total || 0), 0);
                    return sum + (s.total || 0);
                }, 0) : 0;
                return { name: c.name, total: total };
            }).sort((a, b) => b.total - a.total) : [];

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">👤 تقرير العملاء</h4>
                    <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                            <span>العميل</span><span>إجمالي المشتريات</span>
                        </div>
                        ${customerData.map(c => `
                            <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                                <span>${c.name}</span>
                                <span style="color:#2D8F5E;font-weight:700;">${c.total.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div><span style="font-weight:600;color:#A89070;">عدد العملاء:</span> <span style="color:#C9A94E;font-weight:700;">${window.customers ? window.customers.length : 0}</span></div>
                            <div><span style="font-weight:600;color:#A89070;">إجمالي المشتريات:</span> <span style="color:#C9A94E;font-weight:700;">${customerData.reduce((s,c) => s + c.total, 0).toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'warehouse':
            const warehouseData = window.warehouses ? window.warehouses.map(w => {
                const count = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.warehouseId === w.id).reduce((s, wp) => s + wp.qty, 0) : 0;
                const value = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.warehouseId === w.id).reduce((s, wp) => {
                    const p = window.products ? window.products.find(pr => pr.id === wp.productId) : null;
                    return s + (p ? p.sellPrice * wp.qty : 0);
                }, 0) : 0;
                return { name: w.name, type: w.type, count: count, value: value };
            }) : [];

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">🏢 تقرير المخازن</h4>
                    <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                        <div style="display:grid;grid-template-columns:1.2fr 0.8fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                            <span>اسم المخزن</span><span>النوع</span><span>عدد المنتجات</span><span>القيمة</span>
                        </div>
                        ${warehouseData.map(w => `
                            <div style="display:grid;grid-template-columns:1.2fr 0.8fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                                <span><strong>${w.name}</strong></span>
                                <span style="color:${w.type === 'رئيسي' ? '#2D8F5E' : w.type === 'محل' ? '#E6A830' : '#4A8AB5'};font-weight:700;">${w.type}</span>
                                <span>${w.count}</span>
                                <span style="color:#C9A94E;font-weight:700;">${w.value.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div><span style="font-weight:600;color:#A89070;">عدد المخازن:</span> <span style="color:#C9A94E;font-weight:700;">${window.warehouses ? window.warehouses.length : 0}</span></div>
                            <div><span style="font-weight:600;color:#A89070;">إجمالي القيمة:</span> <span style="color:#C9A94E;font-weight:700;">${warehouseData.reduce((s,w) => s + w.value, 0).toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'expenses':
            const expensesByMethod = {};
            if (window.expenses) {
                window.expenses.forEach(e => {
                    const method = e.method || 'نقدي';
                    expensesByMethod[method] = (expensesByMethod[method] || 0) + e.amount;
                });
            }

            let expensesDetails = '';
            if (window.expenses) {
                window.expenses.slice().reverse().forEach(e => {
                    expensesDetails += `
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                            <span>${e.date}</span>
                            <span>${e.note}</span>
                            <span>${e.method || 'نقدي'}</span>
                            <span style="color:#E06060;font-weight:700;">${e.amount.toFixed(2)}</span>
                        </div>
                    `;
                });
            }

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">💸 تقرير المصروفات</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">إجمالي المصروفات</span><span class="detail-value" style="color:#E06060;">${totalExpenses.toFixed(2)} 🇪🇬</span></div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="font-weight:700;color:#C9A94E;font-size:12px;margin-bottom:4px;">💳 حسب طريقة الدفع:</div>
                        ${Object.entries(expensesByMethod).map(([method, total]) => 
                            `<div style="padding:2px 0;color:#F5E6C8;">• ${method}: ${total.toFixed(2)} 🇪🇬</div>`
                        ).join('') || '<div style="color:#5D5D5D;">لا توجد بيانات</div>'}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:11px;border:1px solid #2D2D2D;max-height:200px;overflow-y:auto;">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:2px solid #C9A94E;">
                            <span>التاريخ</span><span>البيان</span><span>الطريقة</span><span>المبلغ</span>
                        </div>
                        ${expensesDetails || '<div style="padding:8px;color:#5D5D5D;">لا توجد مصروفات</div>'}
                    </div>
                </div>
            `;
            break;

        default:
            html = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">اختر تقريراً</div><div class="desc">اضغط على أحد التقارير أعلاه</div></div></div>`;
    }

    container.innerHTML = html;
    addAuditLog('add', 'report', `عرض تقرير ${reportName}`);
}

// ================================================================
// GENERATE PROFIT ANALYSIS
// ================================================================
function generateProfitAnalysis() {
    const container = document.getElementById('profitAnalysisResult');
    if (!container) return;

    if (!window.products || !window.products.length) {
        container.innerHTML = `
            <div class="alert-item info">
                <div class="icon"><i class="fas fa-info-circle"></i></div>
                <div class="content">
                    <div class="title">لا توجد منتجات</div>
                    <div class="desc">أضف منتجات أولاً لتحليل الأرباح</div>
                </div>
            </div>
        `;
        return;
    }

    const productProfits = window.products.map(p => {
        let totalSold = 0;
        let totalRevenue = 0;
        let totalCost = 0;
        let totalQuantity = 0;
        
        if (window.sales && window.sales.length > 0) {
            window.sales.forEach(sale => {
                if (sale.items && Array.isArray(sale.items)) {
                    const item = sale.items.find(i => i.productId === p.id);
                    if (item) {
                        totalSold += item.qty || 0;
                        totalRevenue += item.total || 0;
                        totalQuantity += item.qty || 0;
                    }
                }
            });
        }
        
        if (window.returns && window.returns.length > 0) {
            window.returns.forEach(ret => {
                if (ret.items && Array.isArray(ret.items)) {
                    const item = ret.items.find(i => i.productId === p.id);
                    if (item) {
                        totalSold -= item.qty || 0;
                        totalRevenue -= item.total || 0;
                        totalQuantity -= item.qty || 0;
                    }
                }
            });
        }
        
        totalCost = totalSold * (p.buyPrice || 0);
        const profit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        const avgPrice = totalSold > 0 ? totalRevenue / totalSold : 0;
        
        const currentQty = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
        const inventoryValue = currentQty * (p.buyPrice || 0);
        
        return { 
            ...p, 
            totalSold, 
            totalRevenue, 
            totalCost, 
            profit, 
            margin,
            avgPrice,
            currentQty,
            inventoryValue,
            totalQuantity
        };
    });

    const activeProducts = productProfits.filter(p => p.totalSold > 0 || p.totalRevenue > 0);
    const totalProducts = activeProducts.length;
    const avgMargin = totalProducts > 0 ? activeProducts.reduce((s, p) => s + p.margin, 0) / totalProducts : 0;
    const topProduct = activeProducts.length > 0 ? activeProducts.reduce((a, b) => a.profit > b.profit ? a : b) : null;
    const totalRevenueAll = activeProducts.reduce((s, p) => s + p.totalRevenue, 0);
    const totalCostAll = activeProducts.reduce((s, p) => s + p.totalCost, 0);
    const totalProfitAll = totalRevenueAll - totalCostAll;

    safeSetText('profitTotalProducts', totalProducts);
    safeSetText('profitAvgMargin', avgMargin.toFixed(1) + '%');
    safeSetText('profitTopProduct', topProduct ? topProduct.name + ' (' + topProduct.profit.toFixed(2) + ')' : 'لا يوجد');

    if (activeProducts.length === 0) {
        container.innerHTML = `
            <div class="alert-item info">
                <div class="icon"><i class="fas fa-info-circle"></i></div>
                <div class="content">
                    <div class="title">لا توجد مبيعات</div>
                    <div class="desc">قم بإجراء مبيعات أولاً لتحليل الأرباح</div>
                </div>
            </div>
        `;
        return;
    }

    const sortedProducts = [...activeProducts].sort((a, b) => b.profit - a.profit);

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 تحليل ربحية المنتجات</h4>
            
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px;padding:8px;background:#0D0D0D;border-radius:6px;border:1px solid #2D2D2D;">
                <div style="text-align:center;">
                    <div style="font-size:11px;color:#A89070;">إجمالي الإيرادات</div>
                    <div style="font-size:16px;font-weight:700;color:#2D8F5E;">${totalRevenueAll.toFixed(2)}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:11px;color:#A89070;">إجمالي التكاليف</div>
                    <div style="font-size:16px;font-weight:700;color:#E06060;">${totalCostAll.toFixed(2)}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:11px;color:#A89070;">صافي الربح</div>
                    <div style="font-size:16px;font-weight:700;color:${totalProfitAll >= 0 ? '#2D8F5E' : '#E06060'};">${totalProfitAll.toFixed(2)}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:11px;color:#A89070;">متوسط الهامش</div>
                    <div style="font-size:16px;font-weight:700;color:#C9A94E;">${avgMargin.toFixed(1)}%</div>
                </div>
            </div>
            
            <div style="max-height:400px;overflow-y:auto;font-size:12px;">
                <div style="display:grid;grid-template-columns:1.5fr 0.8fr 1fr 1fr 1fr 0.8fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>المنتج</span>
                    <span>الكمية</span>
                    <span>الإيرادات</span>
                    <span>التكلفة</span>
                    <span>الربح</span>
                    <span>الهامش</span>
                </div>
                ${sortedProducts.map(p => `
                    <div style="display:grid;grid-template-columns:1.5fr 0.8fr 1fr 1fr 1fr 0.8fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                        <span><strong>${p.name}</strong></span>
                        <span>${p.totalSold}</span>
                        <span style="color:#2D8F5E;">${p.totalRevenue.toFixed(2)}</span>
                        <span style="color:#E06060;">${p.totalCost.toFixed(2)}</span>
                        <span style="color:${p.profit >= 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${p.profit.toFixed(2)}</span>
                        <span style="color:${p.margin >= 20 ? '#2D8F5E' : p.margin >= 10 ? '#E6A830' : '#E06060'};font-weight:700;">${p.margin.toFixed(1)}%</span>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;color:#F5E6C8;">
                    <div><span style="font-weight:600;color:#A89070;">🏆 أعلى ربح:</span> <span style="color:#C9A94E;font-weight:700;">${topProduct ? topProduct.name + ' (' + topProduct.profit.toFixed(2) + ')' : '-'}</span></div>
                    <div><span style="font-weight:600;color:#A89070;">📊 إجمالي الربح:</span> <span style="color:#C9A94E;font-weight:700;">${totalProfitAll.toFixed(2)}</span></div>
                    <div><span style="font-weight:600;color:#A89070;">📦 المنتجات المباعة:</span> <span style="color:#C9A94E;font-weight:700;">${totalProducts}</span></div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    addAuditLog('add', 'report', 'عرض تحليل الأرباح');
    
    safeSetText('profitTotalProducts', totalProducts);
    safeSetText('profitAvgMargin', avgMargin.toFixed(1) + '%');
    safeSetText('profitTopProduct', topProduct ? topProduct.name + ' (' + topProduct.profit.toFixed(2) + ')' : 'لا يوجد');
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
// LOGIN / LOGOUT / LOCK
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
// DOM READY
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.payment-methods').forEach(group => {
        group.querySelectorAll('label').forEach(label => {
            label.addEventListener('click', function() {
                group.querySelectorAll('label').forEach(l => l.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    });

    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (input && !input.value) input.value = today;
    });

    initAppData();
    if (typeof seedData === 'function') seedData();
    if (typeof refreshAllPages === 'function') refreshAllPages();

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
    console.log('📝 سجل النشاطات مفعل مع تفاصيل كاملة');
    console.log('📊 تحليل الأرباح مفعل');
    console.log('👤 المستخدم الحالي:', window.currentUser?.username || 'admin');
});

// ================================================================
// WHATSAPP FUNCTIONS
// ================================================================
function updateCustomerWhatsApp() {
    const select = document.getElementById('salesCustomerSelect');
    const input = document.getElementById('salesCustomer');
    const whatsappInput = document.getElementById('customerWhatsApp');
    const group = document.getElementById('customerWhatsAppGroup');
    if (!select || !input || !whatsappInput || !group) return;
    
    const selectedName = select.value;
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
    } else if (input.value) {
        const customer = window.customers?.find(c => c.name === input.value);
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
        const customer = window.customers?.find(c => c.name === name);
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
    } else if (input.value) {
        const supplier = window.suppliers?.find(s => s.name === input.value);
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
        const supplier = window.suppliers?.find(s => s.name === name);
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
    
    if (typeof window.salesItems === 'undefined' || window.salesItems.length === 0) { 
        showToast('⚠️ أضف أصنافاً أولاً', 'error'); 
        return; 
    }

    let whatsappNumber = document.getElementById('customerWhatsApp')?.value?.trim();
    if (!whatsappNumber) {
        const customerObj = window.customers?.find(c => c.name === customer);
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
