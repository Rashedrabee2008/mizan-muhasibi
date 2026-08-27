// ================================================================
// audit.js - سجل النشاطات
// ================================================================

// ================================================================
// ADD AUDIT LOG
// ================================================================
function addAuditLog(action, type, details) {
    const entry = {
        id: Date.now(),
        action: action,
        type: type,
        details: details,
        date: new Date().toISOString(),
        user: window.currentUser.username || 'admin'
    };
    window.auditLog.unshift(entry);
    if (window.auditLog.length > 500) window.auditLog = window.auditLog.slice(0, 500);
    setData('auditLog', window.auditLog);
    renderAudit();
}

// ================================================================
// RENDER AUDIT
// ================================================================
function renderAudit() { filterAudit('all'); }

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

    let filtered = window.auditLog;
    if (filter !== 'all') filtered = window.auditLog.filter(a => a.action === filter);

    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === (filter === 'all' ? 'الكل' : filter === 'add' ? '➕ إضافة' : filter === 'edit' ? '✏️ تعديل' : filter === 'delete' ? '🗑️ حذف' : '💰 بيع'));
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد نشاطات</span></div>`;
        return;
    }

    const actionNames = { add: '➕ إضافة', edit: '✏️ تعديل', delete: '🗑️ حذف', sale: '💰 بيع', purchase: '🛒 شراء', return: '🔄 مرتجع' };
    const colors = { add: '#2D8F5E', edit: '#E6A830', delete: '#E06060', sale: '#4A8AB5', purchase: '#C9A94E', return: '#E6A830' };

    let html = `<div class="table-header"><span>الوقت</span><span>الإجراء</span><span>التفاصيل</span><span>المستخدم</span></div>`;

    filtered.slice(0, 50).forEach(a => {
        html += `
            <div class="table-row" style="font-size:12px;color:#F5E6C8;">
                <span style="font-size:10px;">${new Date(a.date).toLocaleString('ar')}</span>
                <span style="color:${colors[a.action] || '#C9A94E'};font-weight:700;">${actionNames[a.action] || a.action}</span>
                <span>${a.details || ''}</span>
                <span>${a.user || 'admin'}</span>
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