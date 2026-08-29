// ================================================================
// audit.js - سجل النشاطات (الملف الكامل)
// ================================================================

// ================================================================
// ADD AUDIT LOG - إضافة سجل نشاط مع تفاصيل كاملة
// ================================================================
function addAuditLog(action, type, details, data = null) {
    if (typeof window.auditLog === 'undefined') {
        window.auditLog = [];
    }
    
    const entry = {
        id: Date.now(),
        action: action,
        type: type,
        details: details,
        data: data,
        date: new Date().toISOString(),
        user: window.currentUser?.username || 'admin'
    };
    
    window.auditLog.unshift(entry);
    if (window.auditLog.length > 500) window.auditLog = window.auditLog.slice(0, 500);
    
    if (typeof setData === 'function') {
        setData('auditLog', window.auditLog);
    } else {
        localStorage.setItem('mizan_auditLog', JSON.stringify(window.auditLog));
    }
    
    if (typeof renderAudit === 'function') renderAudit();
    if (typeof renderActivityLog === 'function') renderActivityLog();
}

// ================================================================
// RENDER AUDIT - عرض سجل النشاطات
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

    let filtered = window.auditLog || [];
    if (filter !== 'all') {
        filtered = window.auditLog.filter(a => a.action === filter);
    }

    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === (filter === 'all' ? 'الكل' : 
            filter === 'add' ? '➕ إضافة' : 
            filter === 'edit' ? '✏️ تعديل' : 
            filter === 'delete' ? '🗑️ حذف' : 
            filter === 'sale' ? '💰 بيع' : ''));
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد نشاطات</span></div>`;
        return;
    }

    // تعريف الأيقونات والألوان
    const actionIcons = {
        'add': 'fa-plus-circle',
        'edit': 'fa-edit',
        'delete': 'fa-trash-alt',
        'sale': 'fa-receipt',
        'purchase': 'fa-shopping-cart',
        'return': 'fa-undo-alt',
        'sync': 'fa-sync',
        'backup': 'fa-cloud-upload-alt',
        'cashier': 'fa-cash-register',
        'adjustment': 'fa-balance-scale',
        'license': 'fa-key',
        'treasury': 'fa-vault',
        'permission': 'fa-exchange-alt',
        'warehouse': 'fa-warehouse',
        'product': 'fa-box',
        'customer': 'fa-user',
        'supplier': 'fa-truck',
        'expense': 'fa-money-bill-wave',
        'bond': 'fa-file-signature',
        'account': 'fa-sitemap',
        'report': 'fa-chart-pie',
        'invoice': 'fa-file-invoice',
        'user': 'fa-user-cog',
        'company': 'fa-building',
        'whatsapp': 'fa-whatsapp',
        'login': 'fa-sign-in-alt',
        'logout': 'fa-sign-out-alt'
    };

    const actionColors = {
        'add': '#2D8F5E',
        'edit': '#E6A830',
        'delete': '#E06060',
        'sale': '#2D8F5E',
        'purchase': '#E06060',
        'return': '#E6A830',
        'sync': '#4A8AB5',
        'backup': '#4A8AB5',
        'cashier': '#C9A94E',
        'adjustment': '#C9A94E',
        'license': '#C9A94E',
        'treasury': '#4A8AB5',
        'permission': '#4A8AB5',
        'warehouse': '#4A8AB5',
        'product': '#2D8F5E',
        'customer': '#2D8F5E',
        'supplier': '#E06060',
        'expense': '#E06060',
        'bond': '#C9A94E',
        'account': '#4A8AB5',
        'report': '#4A8AB5',
        'invoice': '#4A8AB5',
        'user': '#C9A94E',
        'company': '#4A8AB5',
        'whatsapp': '#25D366',
        'login': '#2D8F5E',
        'logout': '#E06060'
    };

    const typeLabels = {
        'sale': 'بيع',
        'purchase': 'شراء',
        'return': 'مرتجع',
        'invoice': 'فاتورة',
        'product': 'منتج',
        'customer': 'عميل',
        'supplier': 'مورد',
        'expense': 'مصروف',
        'treasury': 'خزنة',
        'bond': 'سند',
        'permission': 'إذن',
        'warehouse': 'مخزن',
        'adjustment': 'تسوية',
        'account': 'حساب',
        'user': 'مستخدم',
        'backup': 'نسخ احتياطي',
        'sync': 'مزامنة',
        'company': 'شركة',
        'license': 'ترخيص',
        'cashier': 'كاشف',
        'report': 'تقرير',
        'whatsapp': 'واتساب',
        'settings': 'إعدادات',
        'login': 'تسجيل دخول',
        'logout': 'تسجيل خروج'
    };

    const actionLabels = {
        'add': '➕ إضافة',
        'edit': '✏️ تعديل',
        'delete': '🗑️ حذف',
        'sale': '💰 بيع',
        'purchase': '🛒 شراء',
        'return': '🔄 مرتجع',
        'sync': '☁️ مزامنة',
        'backup': '💾 نسخ',
        'cashier': '🧾 كاشف',
        'adjustment': '⚖️ تسوية',
        'license': '🔑 ترخيص',
        'treasury': '🏦 خزنة',
        'permission': '📋 إذن',
        'warehouse': '🏢 مخزن',
        'product': '📦 منتج',
        'customer': '👤 عميل',
        'supplier': '🚚 مورد',
        'expense': '💸 مصروف',
        'bond': '📄 سند',
        'account': '📊 حساب',
        'report': '📈 تقرير',
        'invoice': '🧾 فاتورة',
        'user': '👥 مستخدم',
        'company': '🏢 شركة',
        'whatsapp': '💬 واتساب',
        'login': '🔓 دخول',
        'logout': '🔒 خروج'
    };

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
            <span style="font-size:12px;color:#A89070;">📊 إجمالي النشاطات: ${window.auditLog.length}</span>
            <span style="font-size:12px;color:#A89070;">📅 عرض ${filtered.length} نشاط</span>
        </div>
        <div class="table-header" style="grid-template-columns:1fr 0.8fr 2.5fr 0.8fr;">
            <span>الوقت</span>
            <span>الإجراء</span>
            <span>التفاصيل</span>
            <span>المستخدم</span>
        </div>
    `;

    filtered.slice(0, 100).forEach(a => {
        const icon = actionIcons[a.action] || 'fa-circle';
        const color = actionColors[a.action] || '#A89070';
        const actionLabel = actionLabels[a.action] || a.action;
        const typeLabel = typeLabels[a.type] || a.type || 'نشاط';
        
        const dateObj = new Date(a.date);
        const dateStr = dateObj.toLocaleDateString('ar');
        const timeStr = dateObj.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        html += `
            <div class="table-row" style="grid-template-columns:1fr 0.8fr 2.5fr 0.8fr;font-size:12px;color:#F5E6C8;border-bottom:1px solid #2D2D2D;padding:6px 0;">
                <span style="font-size:10px;color:#A89070;">${dateStr} ${timeStr}</span>
                <div style="display:flex;align-items:center;gap:4px;">
                    <i class="fas ${icon}" style="color:${color};font-size:12px;"></i>
                    <span style="color:${color};font-weight:700;font-size:11px;">${actionLabel}</span>
                    <span style="color:#A89070;font-size:9px;">${typeLabel}</span>
                </div>
                <span style="font-size:11px;color:#F5E6C8;">${a.details}</span>
                <span style="font-size:10px;color:#5D5D5D;text-align:center;">${a.user || 'admin'}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// CLEAR AUDIT - مسح سجل النشاطات
// ================================================================
function clearAudit() {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ مسح سجل النشاطات نهائياً؟')) return;

    window.auditLog = [];
    if (typeof setData === 'function') {
        setData('auditLog', window.auditLog);
    } else {
        localStorage.setItem('mizan_auditLog', JSON.stringify(window.auditLog));
    }
    renderAudit();
    if (typeof renderActivityLog === 'function') renderActivityLog();
    showToast('🗑️ تم مسح سجل النشاطات', 'info');
}