// ================================================================
// accounts.js - شجرة الحسابات
// ================================================================

// ================================================================
// ADD ACCOUNT
// ================================================================
function addAccount() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const name = document.getElementById('accountName')?.value?.trim();
    const type = document.getElementById('accountType')?.value;
    const parentId = parseInt(document.getElementById('accountParent')?.value) || null;

    if (!name) { showToast('⚠️ أدخل اسم الحساب', 'error'); return; }
    if (window.accounts.find(a => a.name === name)) {
        showToast('⚠️ الحساب موجود', 'warning');
        return;
    }

    window.accounts.push({ id: Date.now(), name: name, type: type, parentId: parentId });
    saveAll();
    addAuditLog('add', 'account', `إضافة حساب: ${name}`);
    renderAccounts();
    populateAccountParents();
    document.getElementById('accountName').value = '';
    showToast('✅ تم إضافة الحساب', 'success');
}

// ================================================================
// RENDER ACCOUNTS
// ================================================================
function renderAccounts() {
    const container = document.getElementById('accountList');
    if (!container) return;

    if (!window.accounts || window.accounts.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-sitemap"></i><span>لا توجد حسابات</span></div>`;
        return;
    }

    const typeNames = { assets: 'أصول', liabilities: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expenses: 'مصروفات' };
    const typeColors = { assets: '#2D8F5E', liabilities: '#E06060', equity: '#C9A94E', revenue: '#4A8AB5', expenses: '#E6A830' };

    function buildTree(parentId, level) {
        const children = window.accounts.filter(a => a.parentId === parentId);
        if (children.length === 0) return '';
        let html = '';
        children.forEach(c => {
            const indent = '  '.repeat(level);
            html += `
                <div class="table-row" style="font-size:12px;padding:4px 0;padding-right:${level * 16}px;grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;color:#F5E6C8;">
                    <span><strong>${indent}${c.name}</strong></span>
                    <span style="color:${typeColors[c.type]};font-weight:700;font-size:10px;">${typeNames[c.type] || c.type}</span>
                    <span style="font-size:10px;">${c.parentId ? 'فرعي' : 'رئيسي'}</span>
                    <div class="actions">
                        ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteAccount(${c.id})"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
            html += buildTree(c.id, level + 1);
        });
        return html;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;"><span>اسم الحساب</span><span>النوع</span><span>المستوى</span><span></span></div>`;
    html += buildTree(null, 0);
    container.innerHTML = html;
}

// ================================================================
// DELETE ACCOUNT
// ================================================================
function deleteAccount(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الحساب؟ سيتم حذف الحسابات الفرعية')) return;

    const toDelete = [id];
    const originalAccounts = [...window.accounts];

    function findChildren(parentId) {
        originalAccounts.filter(a => a.parentId === parentId).forEach(c => {
            toDelete.push(c.id);
            findChildren(c.id);
        });
    }
    findChildren(id);

    const names = originalAccounts.filter(a => toDelete.includes(a.id)).map(a => a.name).join(', ');
    window.accounts = window.accounts.filter(a => !toDelete.includes(a.id));

    saveAll();
    addAuditLog('delete', 'account', `حذف حسابات: ${names}`);
    renderAccounts();
    populateAccountParents();
    showToast('🗑️ تم الحذف', 'info');
}

// ================================================================
// POPULATE ACCOUNT PARENTS
// ================================================================
function populateAccountParents() {
    const select = document.getElementById('accountParent');
    if (select) {
        select.innerHTML = '<option value="">لا يوجد</option>';
        if (window.accounts) {
            window.accounts.forEach(a => {
                select.innerHTML += `<option value="${a.id}">${a.name}</option>`;
            });
        }
    }
}
