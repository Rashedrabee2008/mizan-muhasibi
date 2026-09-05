// ================================================================
// warehouses.js - إدارة المخازن
// ================================================================

// ================================================================
// ADD WAREHOUSE
// ================================================================
function addWarehouse() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const name = document.getElementById('warehouseName')?.value?.trim();
    const type = document.getElementById('warehouseType')?.value || 'رئيسي';
    const address = document.getElementById('warehouseAddress')?.value?.trim();

    if (!name) { showToast('⚠️ أدخل اسم المخزن', 'error'); return; }
    if (window.warehouses.find(w => w.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ المخزن موجود', 'warning');
        return;
    }

    window.warehouses.push({ id: Date.now(), name: name, type: type, address: address });
    saveAll();
    addAuditLog('add', 'warehouse', `إضافة مخزن: ${name}`);
    renderWarehouses();
    populateAllSelects();
    document.getElementById('warehouseName').value = '';
    document.getElementById('warehouseAddress').value = '';
    showToast('✅ تم إضافة المخزن', 'success');
}

// ================================================================
// RENDER WAREHOUSES
// ================================================================
function renderWarehouses() {
    safeSetText('warehousesCount', window.warehouses.length);
    const totalProducts = window.warehouseProducts.reduce((s, wp) => s + wp.qty, 0);
    safeSetText('warehouseProductsCount', totalProducts);

    const container = document.getElementById('warehouseList');
    if (!container) return;

    if (window.warehouses.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>`;
        return;
    }

    const canEditWarehouses = canEdit();
    const canDeleteWarehouses = canDelete();

    let html = `<div class="table-header" style="grid-template-columns:1.5fr 0.8fr 1fr 0.8fr 0.6fr;"><span>اسم المخزن</span><span>النوع</span><span>العنوان</span><span>المنتجات</span><span></span></div>`;

    window.warehouses.forEach(w => {
        const count = window.warehouseProducts.filter(wp => wp.warehouseId === w.id).reduce((s, wp) => s + wp.qty, 0);
        const typeColor = w.type === 'رئيسي' ? '#2D8F5E' : w.type === 'محل' ? '#E6A830' : '#4A8AB5';

        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 0.8fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${w.name}</strong></span>
                <span style="color:${typeColor};font-weight:700;font-size:11px;">${w.type}</span>
                <span>${w.address || '-'}</span>
                <span>${count}</span>
                <div class="actions">
                    ${canEditWarehouses ? `<button class="btn btn-warning btn-sm" onclick="editWarehouse(${w.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteWarehouses ? `<button class="btn btn-danger btn-sm" onclick="deleteWarehouse(${w.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// EDIT WAREHOUSE
// ================================================================
function editWarehouse(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const w = window.warehouses.find(wh => wh.id === id);
    if (!w) return;

    const html = `
        <div class="form-group"><label>اسم المخزن</label><input type="text" id="editWarehouseName" value="${w.name}" /></div>
        <div class="form-group"><label>النوع</label>
            <select id="editWarehouseType">
                <option value="رئيسي" ${w.type === 'رئيسي' ? 'selected' : ''}>رئيسي</option>
                <option value="فرعي" ${w.type === 'فرعي' ? 'selected' : ''}>فرعي</option>
                <option value="محل" ${w.type === 'محل' ? 'selected' : ''}>محل</option>
            </select>
        </div>
        <div class="form-group"><label>العنوان</label><input type="text" id="editWarehouseAddress" value="${w.address || ''}" /></div>
        <button class="btn btn-primary btn-block" onclick="saveWarehouseEdit(${w.id})"><i class="fas fa-save"></i> حفظ</button>
        ${canDelete() ? `<button class="btn btn-danger btn-block" onclick="deleteWarehouse(${w.id})" style="margin-top:6px;"><i class="fas fa-trash"></i> حذف</button>` : ''}
    `;
    openModal('✏️ تعديل المخزن', html);
}

function saveWarehouseEdit(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const w = window.warehouses.find(wh => wh.id === id);
    if (!w) return;

    const name = document.getElementById('editWarehouseName')?.value?.trim();
    const type = document.getElementById('editWarehouseType')?.value;
    const address = document.getElementById('editWarehouseAddress')?.value?.trim();

    if (!name) { showToast('⚠️ أدخل اسم المخزن', 'error'); return; }

    w.name = name;
    w.type = type;
    w.address = address;

    saveAll();
    addAuditLog('edit', 'warehouse', `تعديل مخزن: ${name}`);
    renderWarehouses();
    populateAllSelects();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

// ================================================================
// DELETE WAREHOUSE
// ================================================================
function deleteWarehouse(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المخزن؟ سيتم نقل منتجاته للمخزن الرئيسي')) return;

    const mainWarehouse = window.warehouses.find(w => w.type === 'رئيسي');
    if (mainWarehouse && mainWarehouse.id !== id) {
        window.warehouseProducts.filter(wp => wp.warehouseId === id).forEach(wp => {
            let target = window.warehouseProducts.find(w => w.warehouseId === mainWarehouse.id && w.productId === wp.productId);
            if (!target) {
                target = { warehouseId: mainWarehouse.id, productId: wp.productId, qty: 0 };
                window.warehouseProducts.push(target);
            }
            target.qty += wp.qty;
        });
    }

    const w = window.warehouses.find(wh => wh.id === id);
    window.warehouses = window.warehouses.filter(wh => wh.id !== id);
    window.warehouseProducts = window.warehouseProducts.filter(wp => wp.warehouseId !== id);

    saveAll();
    if (w) addAuditLog('delete', 'warehouse', `حذف مخزن: ${w.name}`);
    renderWarehouses();
    populateAllSelects();
    showToast('🗑️ تم الحذف', 'info');
    closeModal();
}