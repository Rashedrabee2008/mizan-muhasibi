// ================================================================
// permissions.js - إذونات المخازن
// ================================================================

let permissionFilter = 'all';

// ================================================================
// INIT PERMISSIONS
// ================================================================
function initPermissions() {
    if (!window.permissions || !Array.isArray(window.permissions)) {
        window.permissions = [];
        setData('permissions', window.permissions);
    }
}

// ================================================================
// POPULATE PERMISSION DROPDOWNS
// ================================================================
function populatePermissionDropdowns() {
    // المخازن
    const fromSelect = document.getElementById('permissionFrom');
    const toSelect = document.getElementById('permissionTo');
    if (fromSelect) {
        fromSelect.innerHTML = '<option value="">اختر...</option>';
        if (window.warehouses) {
            window.warehouses.forEach(w => {
                fromSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
            });
        }
    }
    if (toSelect) {
        toSelect.innerHTML = '<option value="">اختر...</option>';
        if (window.warehouses) {
            window.warehouses.forEach(w => {
                toSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
            });
        }
    }

    // المنتجات
    const productSelect = document.getElementById('permissionProduct');
    if (productSelect) {
        productSelect.innerHTML = '<option value="">اختر...</option>';
        if (window.products) {
            window.products.forEach(p => {
                productSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });
        }
    }

    const dateInput = document.getElementById('permissionDate');
    if (dateInput) {
        dateInput.value = getTodayDate();
    }
}

// ================================================================
// ADD PERMISSION
// ================================================================
function addPermission() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const type = document.getElementById('permissionType')?.value;
    const fromId = parseInt(document.getElementById('permissionFrom')?.value);
    const toId = parseInt(document.getElementById('permissionTo')?.value);
    const productId = parseInt(document.getElementById('permissionProduct')?.value);
    const qty = parseInt(document.getElementById('permissionQty')?.value);
    const date = document.getElementById('permissionDate')?.value || getTodayDate();
    const note = document.getElementById('permissionNote')?.value?.trim() || '';

    if (!type) {
        showToast('⚠️ اختر نوع الإذن', 'error');
        return;
    }
    if (isNaN(qty) || qty <= 0) {
        showToast('⚠️ كمية صحيحة', 'error');
        return;
    }
    if (!productId) {
        showToast('⚠️ اختر منتج', 'error');
        return;
    }

    // التحقق من الكمية للمخزن المصدر
    if (type === 'transfer' || type === 'withdraw') {
        if (!fromId) {
            showToast('⚠️ اختر مخزن المصدر', 'error');
            return;
        }
        const available = window.warehouseProducts?.filter(wp => 
            wp.warehouseId === fromId && wp.productId === productId
        ).reduce((s, wp) => s + wp.qty, 0) || 0;
        if (available < qty) {
            showToast(`⚠️ الكمية غير كافية: المتاح ${available}`, 'error');
            return;
        }
    }

    if (type === 'transfer' && !toId) {
        showToast('⚠️ اختر مخزن الوجهة', 'error');
        return;
    }

    const fromName = window.warehouses?.find(w => w.id === fromId)?.name || '-';
    const toName = window.warehouses?.find(w => w.id === toId)?.name || '-';
    const productName = window.products?.find(p => p.id === productId)?.name || 'منتج';

    const permission = {
        id: Date.now(),
        type: type,
        fromId: fromId || null,
        toId: toId || null,
        productId: productId,
        productName: productName,
        qty: qty,
        date: date,
        note: note,
        status: 'pending',
        fromName: fromName,
        toName: toName,
        createdAt: new Date().toISOString()
    };

    window.permissions.push(permission);
    setData('permissions', window.permissions);
    saveAll();

    addAuditLog('add', 'permission', `إذن ${type} - ${productName} - ${qty}`);
    renderPermissions();
    document.getElementById('permissionProduct').value = '';
    document.getElementById('permissionQty').value = '';
    document.getElementById('permissionNote').value = '';
    showToast('✅ تم إضافة الإذن', 'success');
}

// ================================================================
// RENDER PERMISSIONS
// ================================================================
function renderPermissions() {
    const container = document.getElementById('permissionList');
    if (!container) return;

    initPermissions();

    if (window.permissions.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد إذونات</span></div>`;
        return;
    }

    const typeNames = {
        'transfer': '🔄 تحويل',
        'withdraw': '📤 صرف',
        'add': '📥 إضافة',
        'inventory': '📋 جرد',
        'adjustment': '⚖️ تسوية'
    };

    const sorted = [...window.permissions].sort((a, b) => b.id - a.id);

    let html = `<div class="table-header" style="grid-template-columns:0.8fr 1fr 1.2fr 1fr 0.8fr 0.8fr 0.6fr;">
        <span>النوع</span><span>المنتج</span><span>الكمية</span><span>المصدر</span><span>الوجهة</span><span>الحالة</span><span></span>
    </div>`;

    sorted.forEach(p => {
        const statusColor = p.status === 'executed' ? '#2D8F5E' : p.status === 'cancelled' ? '#E06060' : '#E6A830';
        const statusText = p.status === 'executed' ? '✅ منفذ' : p.status === 'cancelled' ? '❌ ملغي' : '⏳ معلق';

        html += `
            <div class="table-row" style="grid-template-columns:0.8fr 1fr 1.2fr 1fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span style="font-weight:700;color:#4A8AB5;">${typeNames[p.type] || p.type}</span>
                <span>${p.productName}</span>
                <span style="font-weight:700;">${p.qty}</span>
                <span style="font-size:10px;">${p.fromName || '-'}</span>
                <span style="font-size:10px;">${p.toName || '-'}</span>
                <span><span class="status-badge" style="background:${statusColor};color:#fff;">${statusText}</span></span>
                <div class="actions">
                    ${p.status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="executePermission(${p.id})"><i class="fas fa-check"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="cancelPermission(${p.id})"><i class="fas fa-times"></i></button>
                    ` : ''}
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deletePermission(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updatePermissionStats();
}

// ================================================================
// UPDATE PERMISSION STATS
// ================================================================
function updatePermissionStats() {
    const mainQty = window.warehouseProducts?.filter(wp => 
        window.warehouses?.find(w => w.id === wp.warehouseId)?.type === 'رئيسي'
    ).reduce((s, wp) => s + wp.qty, 0) || 0;

    const branchQty = window.warehouseProducts?.filter(wp => 
        window.warehouses?.find(w => w.id === wp.warehouseId)?.type === 'محل'
    ).reduce((s, wp) => s + wp.qty, 0) || 0;

    const subQty = window.warehouseProducts?.filter(wp => 
        window.warehouses?.find(w => w.id === wp.warehouseId)?.type === 'فرعي'
    ).reduce((s, wp) => s + wp.qty, 0) || 0;

    safeSetText('mainWarehouseQty', mainQty);
    safeSetText('branchWarehouseQty', branchQty);
    safeSetText('subWarehouseQty', subQty);
}

// ================================================================
// EXECUTE PERMISSION - تنفيذ الإذن
// ================================================================
function executePermission(id) {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const p = window.permissions.find(perm => perm.id === id);
    if (!p) {
        showToast('⚠️ الإذن غير موجود', 'error');
        return;
    }

    if (p.status !== 'pending') {
        showToast('⚠️ الإذن منفذ أو ملغي بالفعل', 'warning');
        return;
    }

    if (!confirm(`✅ تنفيذ إذن ${p.type} - ${p.productName} - ${p.qty}؟`)) return;

    switch (p.type) {
        case 'add':
            // إضافة للمخزن المحدد
            const targetAdd = window.warehouseProducts?.find(wp => 
                wp.warehouseId === p.toId && wp.productId === p.productId
            );
            if (targetAdd) {
                targetAdd.qty += p.qty;
            } else {
                if (!window.warehouseProducts) window.warehouseProducts = [];
                window.warehouseProducts.push({
                    warehouseId: p.toId,
                    productId: p.productId,
                    qty: p.qty
                });
            }
            break;

        case 'withdraw':
            // سحب من المخزن المصدر
            const sourceWithdraw = window.warehouseProducts?.find(wp => 
                wp.warehouseId === p.fromId && wp.productId === p.productId
            );
            if (sourceWithdraw) {
                sourceWithdraw.qty -= p.qty;
            }
            break;

        case 'transfer':
            // تحويل من مخزن لآخر
            const sourceTrans = window.warehouseProducts?.find(wp => 
                wp.warehouseId === p.fromId && wp.productId === p.productId
            );
            if (sourceTrans) {
                sourceTrans.qty -= p.qty;
            }
            const targetTrans = window.warehouseProducts?.find(wp => 
                wp.warehouseId === p.toId && wp.productId === p.productId
            );
            if (targetTrans) {
                targetTrans.qty += p.qty;
            } else {
                if (!window.warehouseProducts) window.warehouseProducts = [];
                window.warehouseProducts.push({
                    warehouseId: p.toId,
                    productId: p.productId,
                    qty: p.qty
                });
            }
            break;

        case 'inventory':
        case 'adjustment':
            // جرد أو تسوية - يتم تنفيذها من الملف الخاص
            showToast('⚠️ يتم تنفيذ الجرد من صفحة التسوية', 'warning');
            return;
    }

    p.status = 'executed';
    p.executedAt = new Date().toISOString();

    setData('permissions', window.permissions);
    setData('warehouseProducts', window.warehouseProducts);
    saveAll();

    addAuditLog('edit', 'permission', `تنفيذ إذن ${p.type} - ${p.productName} - ${p.qty}`);
    renderPermissions();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof updateDashboard === 'function') updateDashboard();

    showToast(`✅ تم تنفيذ الإذن - ${p.productName} - ${p.qty}`, 'success');
}

// ================================================================
// CANCEL PERMISSION
// ================================================================
function cancelPermission(id) {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const p = window.permissions.find(perm => perm.id === id);
    if (!p) {
        showToast('⚠️ الإذن غير موجود', 'error');
        return;
    }

    if (p.status !== 'pending') {
        showToast('⚠️ الإذن منفذ أو ملغي بالفعل', 'warning');
        return;
    }

    if (!confirm(`❌ إلغاء إذن ${p.type} - ${p.productName} - ${p.qty}؟`)) return;

    p.status = 'cancelled';
    p.cancelledAt = new Date().toISOString();

    setData('permissions', window.permissions);
    saveAll();

    addAuditLog('edit', 'permission', `إلغاء إذن ${p.type} - ${p.productName} - ${p.qty}`);
    renderPermissions();
    showToast(`❌ تم إلغاء الإذن`, 'info');
}

// ================================================================
// DELETE PERMISSION
// ================================================================
function deletePermission(id) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف الإذن نهائياً؟')) return;

    const p = window.permissions.find(perm => perm.id === id);
    if (!p) {
        showToast('⚠️ الإذن غير موجود', 'error');
        return;
    }

    window.permissions = window.permissions.filter(perm => perm.id !== id);
    setData('permissions', window.permissions);
    saveAll();

    addAuditLog('delete', 'permission', `حذف إذن ${p.type} - ${p.productName}`);
    renderPermissions();
    showToast('🗑️ تم حذف الإذن', 'info');
}

// ================================================================
// FILTER PERMISSIONS
// ================================================================
function filterPermissions(filter) {
    permissionFilter = filter;
    renderPermissions();
    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === 
            (filter === 'all' ? 'الكل' : 
             filter === 'pending' ? '⏳ معلق' : 
             filter === 'executed' ? '✅ منفذ' : 
             filter === 'cancelled' ? '❌ ملغي' : '')
        );
    });
}

// ================================================================
// EXECUTE SELECTED PERMISSION - تنفيذ الإذن المختار
// ================================================================
function executeSelectedPermission() {
    const select = document.querySelector('#permissionList .table-row .btn-success');
    if (!select) {
        showToast('⚠️ اختر إذناً معلقاً للتنفيذ', 'warning');
        return;
    }
    const id = parseInt(select.getAttribute('onclick').match(/\d+/)?.[0]);
    if (id) {
        executePermission(id);
    }
}