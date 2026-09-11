// ============================================================
// الميزان 14.0.0 - نظام إدارة المخازن
// app-warehouses.js
// ============================================================
// 
// المميزات:
// - مخازن متعددة
// - تحويل بين المخازن
// - إضافة/صرف أصناف
// - جرد أول المدة
// - تسوية جرد
//
// ⚠️ معزول تماماً - لو حصل خطأ امسح السطر من index.html
// ============================================================

console.log('📦 تحميل app-warehouses.js - نظام إدارة المخازن');

// ═══════════════════════════════════════════════════════════
// 📊 المتغيرات العامة
// ═══════════════════════════════════════════════════════════

window.warehouses = [];
window.warehouseMovements = [];
window.productWarehouseStock = {}; // { productId: { warehouseId: qty } }
window.currentWarehouseTab = 'list';

// ═══════════════════════════════════════════════════════════
// 🏪 إدارة المخازن
// ═══════════════════════════════════════════════════════════

window.saveWarehouse = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('warehouseId')?.value;
    const name = $('warehouseName')?.value.trim();
    const location = $('warehouseLocation')?.value.trim() || '';
    const manager = $('warehouseManager')?.value.trim() || '';
    const phone = $('warehousePhone')?.value.trim() || '';
    const isDefault = $('warehouseIsDefault')?.checked || false;
    
    if (!name) { showToast('⚠️ أدخل اسم المخزن', 'error'); return; }
    
    if (id) {
        const idx = warehouses.findIndex(w => w.id == id);
        if (idx > -1) {
            warehouses[idx] = { ...warehouses[idx], name, location, manager, phone };
            addAuditLog('edit', 'warehouse', `تعديل مخزن: ${name}`);
            showToast('✅ تم تعديل المخزن', 'success');
        }
    } else {
        if (warehouses.find(w => w.name === name)) { showToast('⚠️ اسم المخزن موجود', 'warning'); return; }
        
        // لو أول مخزن، خليه افتراضي
        if (warehouses.length === 0 || isDefault) {
            warehouses.forEach(w => w.isDefault = false);
        }
        
        const newWarehouse = {
            id: Date.now(),
            name,
            location,
            manager,
            phone,
            isDefault: warehouses.length === 0 || isDefault,
            active: true,
            createdAt: new Date().toISOString(),
            createdBy: currentUser ? currentUser.name : 'unknown'
        };
        warehouses.push(newWarehouse);
        addAuditLog('add', 'warehouse', `إضافة مخزن: ${name}`);
        showToast('✅ تم إضافة المخزن', 'success');
    }
    
    setData('warehouses', warehouses);
    resetWarehouseForm();
    renderWarehouses();
    populateWarehouseDropdowns();
    updateDashboard();
};

window.editWarehouse = function(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const w = warehouses.find(wh => wh.id == id); if (!w) return;
    $('warehouseId').value = w.id;
    $('warehouseName').value = w.name;
    $('warehouseLocation').value = w.location || '';
    $('warehouseManager').value = w.manager || '';
    $('warehousePhone').value = w.phone || '';
    $('warehouseIsDefault').checked = w.isDefault || false;
    $('warehouseFormTitle').textContent = '✏️ تعديل المخزن';
    $('warehouseSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteWarehouse = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const w = warehouses.find(wh => wh.id == id); if (!w) return;
    
    // التحقق من وجود أرصدة
    const hasStock = Object.keys(productWarehouseStock).some(pid => 
        (productWarehouseStock[pid][id] || 0) > 0
    );
    
    if (hasStock) {
        if (!confirm(`⚠️ المخزن "${w.name}" فيه أصناف. متابعة الحذف؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف المخزن "${w.name}"؟`)) return;
    }
    
    window.warehouses = warehouses.filter(wh => wh.id != id);
    // مسح أرصدة المخزن
    Object.keys(productWarehouseStock).forEach(pid => {
        delete productWarehouseStock[pid][id];
    });
    
    // لو كان افتراضي، خلي أول واحد افتراضي
    if (w.isDefault && warehouses.length > 0) {
        warehouses[0].isDefault = true;
    }
    
    setData('warehouses', warehouses);
    setData('productWarehouseStock', productWarehouseStock);
    addAuditLog('delete', 'warehouse', `حذف مخزن: ${w.name}`);
    renderWarehouses();
    populateWarehouseDropdowns();
    showToast('🗑️ تم حذف المخزن', 'info');
};

window.setDefaultWarehouse = function(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    warehouses.forEach(w => w.isDefault = (w.id == id));
    setData('warehouses', warehouses);
    addAuditLog('edit', 'warehouse', `تعيين مخزن افتراضي`);
    renderWarehouses();
    populateWarehouseDropdowns();
    showToast('⭐ تم تعيين المخزن الافتراضي', 'success');
};

window.resetWarehouseForm = function() {
    if ($('warehouseId')) $('warehouseId').value = '';
    if ($('warehouseName')) $('warehouseName').value = '';
    if ($('warehouseLocation')) $('warehouseLocation').value = '';
    if ($('warehouseManager')) $('warehouseManager').value = '';
    if ($('warehousePhone')) $('warehousePhone').value = '';
    if ($('warehouseIsDefault')) $('warehouseIsDefault').checked = false;
    if ($('warehouseFormTitle')) $('warehouseFormTitle').textContent = '➕ إضافة مخزن جديد';
    if ($('warehouseSaveBtnText')) $('warehouseSaveBtnText').textContent = 'إضافة';
};

window.renderWarehouses = function() {
    const c = $('warehouseList'); if (!c) return;
    
    if (warehouses.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>`;
        return;
    }
    
    let html = `<div class="table-header" style="grid-template-columns: 0.4fr 1.5fr 1fr 1fr 0.6fr 1.2fr;"><span>⭐</span><span>الاسم</span><span>الموقع</span><span>المسؤول</span><span>الأصناف</span><span></span></div>`;
    warehouses.forEach(w => {
        const productCount = Object.keys(productWarehouseStock).filter(pid => 
            (productWarehouseStock[pid][w.id] || 0) > 0
        ).length;
        const totalQty = Object.keys(productWarehouseStock).reduce((sum, pid) => 
            sum + (productWarehouseStock[pid][w.id] || 0), 0
        );
        
        html += `<div class="table-row" style="grid-template-columns: 0.4fr 1.5fr 1fr 1fr 0.6fr 1.2fr;">
            <span>${w.isDefault ? '⭐' : '☆'}</span>
            <span><strong>${w.name}</strong>${w.phone ? `<br><small style="color:#A89070;font-size:10px;">📞 ${w.phone}</small>` : ''}</span>
            <span style="font-size:11px;">${w.location || '-'}</span>
            <span style="font-size:11px;">${w.manager || '-'}</span>
            <span style="color:#C9A94E;font-weight:700;font-size:11px;">${productCount} صنف<br>${totalQty} وحدة</span>
            <div style="display:flex;gap:4px;">
                ${!w.isDefault && canEdit() ? `<button class="btn btn-info btn-sm" onclick="setDefaultWarehouse(${w.id})" title="افتراضي"><i class="fas fa-star"></i></button>` : ''}
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editWarehouse(${w.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteWarehouse(${w.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>`;
    });
    c.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 📊 إدارة أرصدة الأصناف في المخازن
// ═══════════════════════════════════════════════════════════

window.getProductStockInWarehouse = function(productId, warehouseId) {
    if (!productWarehouseStock[productId]) return 0;
    return productWarehouseStock[productId][warehouseId] || 0;
};

window.setProductStockInWarehouse = function(productId, warehouseId, qty) {
    if (!productWarehouseStock[productId]) productWarehouseStock[productId] = {};
    productWarehouseStock[productId][warehouseId] = Math.max(0, qty);
    setData('productWarehouseStock', productWarehouseStock);
};

window.getTotalProductStock = function(productId) {
    if (!productWarehouseStock[productId]) return 0;
    return Object.values(productWarehouseStock[productId]).reduce((s, q) => s + q, 0);
};

// ═══════════════════════════════════════════════════════════
// 🔄 تحويل بين المخازن
// ═══════════════════════════════════════════════════════════

window.saveTransfer = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const fromId = $('transferFrom')?.value;
    const toId = $('transferTo')?.value;
    const productId = $('transferProduct')?.value;
    const qty = parseInt($('transferQty')?.value) || 0;
    const notes = $('transferNotes')?.value.trim() || '';
    const date = $('transferDate')?.value || getTodayDate();
    
    if (!fromId || !toId) { showToast('⚠️ اختر المخازن', 'error'); return; }
    if (fromId === toId) { showToast('⚠️ لا يمكن التحويل لنفس المخزن', 'error'); return; }
    if (!productId) { showToast('⚠️ اختر المنتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    
    const availableQty = getProductStockInWarehouse(productId, fromId);
    if (availableQty < qty) {
        showToast(`⚠️ الكمية المتاحة في المخزن المصدر: ${availableQty}`, 'error');
        return;
    }
    
    const fromWh = warehouses.find(w => w.id == fromId);
    const toWh = warehouses.find(w => w.id == toId);
    const product = products.find(p => p.id == productId);
    
    if (!fromWh || !toWh || !product) { showToast('⚠️ بيانات غير صحيحة', 'error'); return; }
    
    // ✅ التنفيذ
    setProductStockInWarehouse(productId, fromId, availableQty - qty);
    const toQty = getProductStockInWarehouse(productId, toId);
    setProductStockInWarehouse(productId, toId, toQty + qty);
    
    // ✅ تسجيل الحركة
    const transfer = {
        id: Date.now(),
        number: warehouseMovements.filter(m => m.type === 'transfer').length + 1,
        type: 'transfer',
        fromWarehouseId: fromId,
        fromWarehouseName: fromWh.name,
        toWarehouseId: toId,
        toWarehouseName: toWh.name,
        productId,
        productName: product.name,
        qty,
        notes,
        date,
        time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    warehouseMovements.unshift(transfer);
    
    // ✅ تسجيل حركتين مخزون
    logInventoryMovement({
        productId, productName: product.name,
        type: 'out', qty, price: product.buy,
        reason: 'transfer_out',
        refType: 'warehouse_transfer', refId: transfer.id, refNumber: transfer.number,
        balanceBefore: availableQty, balanceAfter: availableQty - qty,
        notes: `تحويل إلى ${toWh.name}`
    });
    logInventoryMovement({
        productId, productName: product.name,
        type: 'in', qty, price: product.buy,
        reason: 'transfer_in',
        refType: 'warehouse_transfer', refId: transfer.id, refNumber: transfer.number,
        balanceBefore: toQty, balanceAfter: toQty + qty,
        notes: `تحويل من ${fromWh.name}`
    });
    
    setData('warehouseMovements', warehouseMovements);
    addAuditLog('add', 'warehouse', 
        `تحويل ${qty} ${product.name} من ${fromWh.name} إلى ${toWh.name}`,
        { transferNumber: transfer.number, qty, notes }
    );
    
    // إعادة تعيين النموذج
    if ($('transferProduct')) $('transferProduct').value = '';
    if ($('transferQty')) $('transferQty').value = '1';
    if ($('transferNotes')) $('transferNotes').value = '';
    updateTransferAvailable();
    
    renderWarehouseMovements();
    renderWarehouses();
    updateDashboard();
    showToast(`✅ تم التحويل: ${qty} ${product.name}`, 'success');
};

// ═══════════════════════════════════════════════════════════
// ➕ إضافة صنف للمخزون (إدخال)
// ═══════════════════════════════════════════════════════════

window.saveStockIn = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const warehouseId = $('stockInWarehouse')?.value;
    const productId = $('stockInProduct')?.value;
    const qty = parseInt($('stockInQty')?.value) || 0;
    const price = parseFloat($('stockInPrice')?.value) || 0;
    const reason = $('stockInReason')?.value || 'purchase';
    const notes = $('stockInNotes')?.value.trim() || '';
    const date = $('stockInDate')?.value || getTodayDate();
    
    if (!warehouseId) { showToast('⚠️ اختر المخزن', 'error'); return; }
    if (!productId) { showToast('⚠️ اختر المنتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    
    const wh = warehouses.find(w => w.id == warehouseId);
    const product = products.find(p => p.id == productId);
    if (!wh || !product) { showToast('⚠️ بيانات غير صحيحة', 'error'); return; }
    
    const beforeQty = getProductStockInWarehouse(productId, warehouseId);
    setProductStockInWarehouse(productId, warehouseId, beforeQty + qty);
    
    // تحديث سعر الشراء لو اتغير
    if (price > 0 && price !== product.buy) {
        product.buy = price;
    }
    
    const movement = {
        id: Date.now(),
        number: warehouseMovements.length + 1,
        type: 'in',
        warehouseId,
        warehouseName: wh.name,
        productId,
        productName: product.name,
        qty,
        price,
        reason,
        notes,
        date,
        time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    warehouseMovements.unshift(movement);
    
    logInventoryMovement({
        productId, productName: product.name,
        type: 'in', qty, price: price || product.buy,
        reason: 'warehouse_in',
        refType: 'warehouse_stock_in', refId: movement.id, refNumber: movement.number,
        balanceBefore: beforeQty, balanceAfter: beforeQty + qty,
        notes: `إدخال إلى ${wh.name} - ${reason}`
    });
    
    setData('warehouseMovements', warehouseMovements);
    setData('products', products);
    addAuditLog('add', 'warehouse', 
        `إدخال ${qty} ${product.name} إلى ${wh.name}`,
        { qty, price, reason, notes }
    );
    
    // إعادة تعيين
    if ($('stockInProduct')) $('stockInProduct').value = '';
    if ($('stockInQty')) $('stockInQty').value = '1';
    if ($('stockInPrice')) $('stockInPrice').value = '';
    if ($('stockInNotes')) $('stockInNotes').value = '';
    
    renderWarehouseMovements();
    renderWarehouses();
    updateDashboard();
    showToast(`✅ تم إدخال ${qty} ${product.name}`, 'success');
};

// ═══════════════════════════════════════════════════════════
// ➖ صرف صنف من المخزون (إخراج)
// ═══════════════════════════════════════════════════════════

window.saveStockOut = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const warehouseId = $('stockOutWarehouse')?.value;
    const productId = $('stockOutProduct')?.value;
    const qty = parseInt($('stockOutQty')?.value) || 0;
    const reason = $('stockOutReason')?.value || 'damaged';
    const notes = $('stockOutNotes')?.value.trim() || '';
    const date = $('stockOutDate')?.value || getTodayDate();
    
    if (!warehouseId) { showToast('⚠️ اختر المخزن', 'error'); return; }
    if (!productId) { showToast('⚠️ اختر المنتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    
    const wh = warehouses.find(w => w.id == warehouseId);
    const product = products.find(p => p.id == productId);
    if (!wh || !product) { showToast('⚠️ بيانات غير صحيحة', 'error'); return; }
    
    const beforeQty = getProductStockInWarehouse(productId, warehouseId);
    if (beforeQty < qty) {
        showToast(`⚠️ الكمية المتاحة: ${beforeQty}`, 'error');
        return;
    }
    
    setProductStockInWarehouse(productId, warehouseId, beforeQty - qty);
    
    const movement = {
        id: Date.now(),
        number: warehouseMovements.length + 1,
        type: 'out',
        warehouseId,
        warehouseName: wh.name,
        productId,
        productName: product.name,
        qty,
        price: product.buy,
        reason,
        notes,
        date,
        time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    warehouseMovements.unshift(movement);
    
    logInventoryMovement({
        productId, productName: product.name,
        type: 'out', qty, price: product.buy,
        reason: 'warehouse_out',
        refType: 'warehouse_stock_out', refId: movement.id, refNumber: movement.number,
        balanceBefore: beforeQty, balanceAfter: beforeQty - qty,
        notes: `صرف من ${wh.name} - ${reason}`
    });
    
    setData('warehouseMovements', warehouseMovements);
    addAuditLog('add', 'warehouse', 
        `صرف ${qty} ${product.name} من ${wh.name}`,
        { qty, reason, notes }
    );
    
    // إعادة تعيين
    if ($('stockOutProduct')) $('stockOutProduct').value = '';
    if ($('stockOutQty')) $('stockOutQty').value = '1';
    if ($('stockOutNotes')) $('stockOutNotes').value = '';
    updateStockOutAvailable();
    
    renderWarehouseMovements();
    renderWarehouses();
    updateDashboard();
    showToast(`✅ تم صرف ${qty} ${product.name}`, 'success');
};

// ═══════════════════════════════════════════════════════════
// 📊 جرد أول المدة (رصيد افتتاحي)
// ═══════════════════════════════════════════════════════════

window.saveOpeningBalance = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const warehouseId = $('openingWarehouse')?.value;
    const productId = $('openingProduct')?.value;
    const qty = parseInt($('openingQty')?.value) || 0;
    const price = parseFloat($('openingPrice')?.value) || 0;
    const date = $('openingDate')?.value || getTodayDate();
    const notes = $('openingNotes')?.value.trim() || '';
    
    if (!warehouseId) { showToast('⚠️ اختر المخزن', 'error'); return; }
    if (!productId) { showToast('⚠️ اختر المنتج', 'error'); return; }
    if (qty < 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    
    const wh = warehouses.find(w => w.id == warehouseId);
    const product = products.find(p => p.id == productId);
    if (!wh || !product) { showToast('⚠️ بيانات غير صحيحة', 'error'); return; }
    
    const beforeQty = getProductStockInWarehouse(productId, warehouseId);
    setProductStockInWarehouse(productId, warehouseId, qty);
    
    if (price > 0) product.buy = price;
    
    const movement = {
        id: Date.now(),
        number: warehouseMovements.length + 1,
        type: 'opening',
        warehouseId,
        warehouseName: wh.name,
        productId,
        productName: product.name,
        qty,
        price: price || product.buy,
        reason: 'opening_balance',
        notes,
        date,
        time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    warehouseMovements.unshift(movement);
    
    logInventoryMovement({
        productId, productName: product.name,
        type: 'in', qty, price: price || product.buy,
        reason: 'opening_balance',
        refType: 'opening_balance', refId: movement.id, refNumber: movement.number,
        balanceBefore: beforeQty, balanceAfter: qty,
        notes: `جرد أول المدة - ${wh.name}`
    });
    
    setData('warehouseMovements', warehouseMovements);
    setData('products', products);
    addAuditLog('add', 'warehouse', 
        `جرد أول المدة: ${qty} ${product.name} في ${wh.name}`,
        { qty, price, notes }
    );
    
    // إعادة تعيين
    if ($('openingProduct')) $('openingProduct').value = '';
    if ($('openingQty')) $('openingQty').value = '0';
    if ($('openingPrice')) $('openingPrice').value = '';
    if ($('openingNotes')) $('openingNotes').value = '';
    
    renderWarehouseMovements();
    renderWarehouses();
    updateDashboard();
    showToast(`✅ تم تسجيل جرد أول المدة: ${qty} ${product.name}`, 'success');
};

// ═══════════════════════════════════════════════════════════
// ⚖️ تسوية جرد
// ═══════════════════════════════════════════════════════════

window.saveInventoryAdjustment = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const warehouseId = $('adjWarehouse')?.value;
    const productId = $('adjProduct')?.value;
    const actualQty = parseInt($('adjActualQty')?.value);
    const notes = $('adjNotes')?.value.trim() || '';
    const date = $('adjDate')?.value || getTodayDate();
    
    if (!warehouseId) { showToast('⚠️ اختر المخزن', 'error'); return; }
    if (!productId) { showToast('⚠️ اختر المنتج', 'error'); return; }
    if (isNaN(actualQty) || actualQty < 0) { showToast('⚠️ أدخل كمية فعلية صحيحة', 'error'); return; }
    
    const wh = warehouses.find(w => w.id == warehouseId);
    const product = products.find(p => p.id == productId);
    if (!wh || !product) { showToast('⚠️ بيانات غير صحيحة', 'error'); return; }
    
    const systemQty = getProductStockInWarehouse(productId, warehouseId);
    const diff = actualQty - systemQty;
    
    if (diff === 0) {
        showToast('ℹ️ لا يوجد فرق في الجرد', 'info');
        return;
    }
    
    setProductStockInWarehouse(productId, warehouseId, actualQty);
    
    const movement = {
        id: Date.now(),
        number: warehouseMovements.length + 1,
        type: 'adjustment',
        warehouseId,
        warehouseName: wh.name,
        productId,
        productName: product.name,
        qty: Math.abs(diff),
        systemQty,
        actualQty,
        diff,
        price: product.buy,
        reason: diff > 0 ? 'surplus' : 'shortage',
        notes,
        date,
        time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    warehouseMovements.unshift(movement);
    
    logInventoryMovement({
        productId, productName: product.name,
        type: diff > 0 ? 'in' : 'out',
        qty: Math.abs(diff),
        price: product.buy,
        reason: 'inventory_adjustment',
        refType: 'inventory_adjustment', refId: movement.id, refNumber: movement.number,
        balanceBefore: systemQty, balanceAfter: actualQty,
        notes: `تسوية جرد - ${wh.name} ${diff > 0 ? '(زيادة)' : '(نقص)'}`
    });
    
    setData('warehouseMovements', warehouseMovements);
    addAuditLog('add', 'warehouse', 
        `تسوية جرد: ${product.name} في ${wh.name} - ${diff > 0 ? 'زيادة' : 'نقص'} ${Math.abs(diff)}`,
        { systemQty, actualQty, diff, notes }
    );
    
    // إعادة تعيين
    if ($('adjProduct')) $('adjProduct').value = '';
    if ($('adjActualQty')) $('adjActualQty').value = '';
    if ($('adjNotes')) $('adjNotes').value = '';
    if ($('adjSystemQty')) $('adjSystemQty').textContent = '-';
    if ($('adjDiff')) $('adjDiff').textContent = '-';
    
    renderWarehouseMovements();
    renderWarehouses();
    updateDashboard();
    showToast(`✅ تم التسوية: ${diff > 0 ? '+' : ''}${diff} ${product.name}`, 'success');
};

// ═══════════════════════════════════════════════════════════
// 🔄 تحديث المعلومات الديناميكية
// ═══════════════════════════════════════════════════════════

window.updateTransferAvailable = function() {
    const fromId = $('transferFrom')?.value;
    const productId = $('transferProduct')?.value;
    const box = $('transferAvailableBox');
    
    if (!fromId || !productId) {
        if (box) box.style.display = 'none';
        return;
    }
    
    const qty = getProductStockInWarehouse(productId, fromId);
    if (box) {
        box.style.display = 'block';
        if ($('transferAvailableQty')) $('transferAvailableQty').textContent = qty;
    }
};

window.updateStockOutAvailable = function() {
    const whId = $('stockOutWarehouse')?.value;
    const productId = $('stockOutProduct')?.value;
    const box = $('stockOutAvailableBox');
    
    if (!whId || !productId) {
        if (box) box.style.display = 'none';
        return;
    }
    
    const qty = getProductStockInWarehouse(productId, whId);
    if (box) {
        box.style.display = 'block';
        if ($('stockOutAvailableQty')) $('stockOutAvailableQty').textContent = qty;
    }
};

window.updateAdjInfo = function() {
    const whId = $('adjWarehouse')?.value;
    const productId = $('adjProduct')?.value;
    
    if (!whId || !productId) {
        if ($('adjSystemQty')) $('adjSystemQty').textContent = '-';
        if ($('adjDiff')) $('adjDiff').textContent = '-';
        return;
    }
    
    const systemQty = getProductStockInWarehouse(productId, whId);
    if ($('adjSystemQty')) $('adjSystemQty').textContent = systemQty;
    
    const actualQty = parseInt($('adjActualQty')?.value);
    if (!isNaN(actualQty)) {
        const diff = actualQty - systemQty;
        if ($('adjDiff')) {
            $('adjDiff').textContent = (diff > 0 ? '+' : '') + diff;
            $('adjDiff').style.color = diff === 0 ? '#A89070' : (diff > 0 ? '#2D8F5E' : '#E06060');
        }
    }
};

window.updateOpeningInfo = function() {
    const whId = $('openingWarehouse')?.value;
    const productId = $('openingProduct')?.value;
    const box = $('openingCurrentBox');
    
    if (!whId || !productId) {
        if (box) box.style.display = 'none';
        return;
    }
    
    const qty = getProductStockInWarehouse(productId, whId);
    if (box) {
        box.style.display = 'block';
        if ($('openingCurrentQty')) $('openingCurrentQty').textContent = qty;
    }
};

// ═══════════════════════════════════════════════════════════
// 📋 عرض حركات المخازن
// ═══════════════════════════════════════════════════════════

window.renderWarehouseMovements = function() {
    const c = $('warehouseMovementsList'); if (!c) return;
    
    if (warehouseMovements.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد حركات</span></div>`;
        return;
    }
    
    const typeNames = {
        'in': { name: '➕ إدخال', color: '#2D8F5E', icon: '📥' },
        'out': { name: '➖ صرف', color: '#E06060', icon: '📤' },
        'transfer': { name: '🔄 تحويل', color: '#4A8AB5', icon: '🔄' },
        'opening': { name: '🎁 افتتاحي', color: '#C9A94E', icon: '📊' },
        'adjustment': { name: '⚖️ تسوية', color: '#E6A830', icon: '⚖️' }
    };
    
    let html = `<div class="table-header" style="grid-template-columns: 0.4fr 0.8fr 1.2fr 1fr 0.6fr 1.2fr;"><span>#</span><span>النوع</span><span>الصنف</span><span>المخزن</span><span>الكمية</span><span>التاريخ</span></div>`;
    warehouseMovements.slice(0, 100).forEach(m => {
        const tn = typeNames[m.type] || { name: m.type, color: '#5D5D5D', icon: '📋' };
        let warehouseText = m.warehouseName || '';
        if (m.type === 'transfer') warehouseText = `من ${m.fromWarehouseName} → ${m.toWarehouseName}`;
        
        let qtyText = `${tn.icon} ${m.qty}`;
        if (m.type === 'adjustment') {
            qtyText = `${m.diff > 0 ? '+' : ''}${m.diff}`;
        }
        
        html += `<div class="table-row" style="grid-template-columns: 0.4fr 0.8fr 1.2fr 1fr 0.6fr 1.2fr;font-size:11px;">
            <span>#${m.number}</span>
            <span style="color:${tn.color};font-weight:700;font-size:10px;">${tn.name}</span>
            <span>${m.productName}</span>
            <span style="font-size:10px;color:#A89070;">${warehouseText}</span>
            <span style="color:${tn.color};font-weight:700;">${qtyText}</span>
            <span style="font-size:10px;color:#A89070;">${m.date}<br>${m.time || ''}</span>
        </div>`;
    });
    c.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 📋 عرض أرصدة الأصناف في المخازن
// ═══════════════════════════════════════════════════════════

window.renderWarehouseStock = function() {
    const c = $('warehouseStockList'); if (!c) return;
    const whFilter = $('warehouseStockFilter')?.value || '';
    
    if (warehouses.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>`;
        return;
    }
    
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr ${warehouses.map(() => '0.8fr').join(' ')} 0.8fr;"><span>الصنف</span>${warehouses.map(w => `<span>${w.name}</span>`).join('')}<span>الإجمالي</span></div>`;
    
    products.forEach(p => {
        const total = getTotalProductStock(p.id);
        const hasStock = total > 0 || Object.keys(productWarehouseStock[p.id] || {}).some(wid => productWarehouseStock[p.id][wid] > 0);
        
        if (!hasStock && !whFilter) return;
        if (whFilter && !(productWarehouseStock[p.id]?.[whFilter] > 0)) return;
        
        html += `<div class="table-row" style="grid-template-columns: 1.5fr ${warehouses.map(() => '0.8fr').join(' ')} 0.8fr;font-size:11px;">
            <span>${p.name}</span>
            ${warehouses.map(w => {
                const qty = getProductStockInWarehouse(p.id, w.id);
                return `<span style="color:${qty > 0 ? '#C9A94E' : '#5D5D5D'};font-weight:${qty > 0 ? '700' : '400'};">${qty}</span>`;
            }).join('')}
            <span style="color:#2D8F5E;font-weight:900;">${total}</span>
        </div>`;
    });
    
    if (!html.includes('table-row')) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-boxes"></i><span>لا توجد أرصدة</span></div>`;
        return;
    }
    
    c.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 🔄 التبويبات
// ═══════════════════════════════════════════════════════════

window.switchWarehouseTab = function(tab, btn) {
    window.currentWarehouseTab = tab;
    document.querySelectorAll('#page-warehouses .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    const tabs = ['list', 'stock', 'transfer', 'in', 'out', 'opening', 'adjustment', 'movements'];
    tabs.forEach(t => {
        const el = $('whTab-' + t);
        if (el) el.style.display = (t === tab) ? 'block' : 'none';
    });
    
    if (tab === 'list') { renderWarehouses(); }
    if (tab === 'stock') { renderWarehouseStock(); }
    if (tab === 'transfer') { populateWarehouseDropdowns(); updateTransferAvailable(); }
    if (tab === 'in') { populateWarehouseDropdowns(); populateWarehouseProducts(); }
    if (tab === 'out') { populateWarehouseDropdowns(); populateWarehouseProducts(); updateStockOutAvailable(); }
    if (tab === 'opening') { populateWarehouseDropdowns(); populateWarehouseProducts(); }
    if (tab === 'adjustment') { populateWarehouseDropdowns(); populateWarehouseProducts(); }
    if (tab === 'movements') { renderWarehouseMovements(); }
};

// ═══════════════════════════════════════════════════════════
// 📋 تعبئة القوائم المنسدلة
// ═══════════════════════════════════════════════════════════

window.populateWarehouseDropdowns = function() {
    const ids = ['transferFrom', 'transferTo', 'stockInWarehouse', 'stockOutWarehouse', 'openingWarehouse', 'adjWarehouse'];
    ids.forEach(id => {
        const el = $(id);
        if (!el) return;
        const cv = el.value;
        el.innerHTML = '<option value="">اختر مخزن...</option>';
        warehouses.forEach(w => {
            el.innerHTML += `<option value="${w.id}">${w.name}${w.isDefault ? ' ⭐' : ''}</option>`;
        });
        el.value = cv;
    });
    
    // populate filter
    const filter = $('warehouseStockFilter');
    if (filter) {
        const cv = filter.value;
        filter.innerHTML = '<option value="">كل المخازن</option>';
        warehouses.forEach(w => {
            filter.innerHTML += `<option value="${w.id}">${w.name}</option>`;
        });
        filter.value = cv;
    }
};

window.populateWarehouseProducts = function() {
    const ids = ['transferProduct', 'stockInProduct', 'stockOutProduct', 'openingProduct', 'adjProduct'];
    ids.forEach(id => {
        const el = $(id);
        if (!el) return;
        const cv = el.value;
        el.innerHTML = '<option value="">اختر منتج...</option>';
        products.forEach(p => {
            el.innerHTML += `<option value="${p.id}">${p.name} (إجمالي: ${getTotalProductStock(p.id)})</option>`;
        });
        el.value = cv;
    });
};

window.populateWarehouseStockFilter = function() {
    const el = $('warehouseStockFilter');
    if (!el) return;
    const cv = el.value;
    el.innerHTML = '<option value="">كل المخازن</option>';
    warehouses.forEach(w => {
        el.innerHTML += `<option value="${w.id}">${w.name}</option>`;
    });
    el.value = cv;
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة
// ═══════════════════════════════════════════════════════════

window.initWarehouses = function() {
    // تحميل البيانات
    window.warehouses = getData('warehouses', []);
    window.warehouseMovements = getData('warehouseMovements', []);
    window.productWarehouseStock = getData('productWarehouseStock', {});
    
    // لو مفيش مخازن، اعمل مخزن رئيسي تلقائياً
    if (warehouses.length === 0) {
        window.warehouses = [{
            id: 1,
            name: 'المخزن الرئيسي',
            location: 'المركز الرئيسي',
            manager: 'المدير',
            phone: '',
            isDefault: true,
            active: true,
            createdAt: new Date().toISOString(),
            createdBy: 'system'
        }];
        setData('warehouses', warehouses);
        
        // نقل أرصدة المنتجات الحالية للمخزن الرئيسي
        products.forEach(p => {
            if (p.qty > 0) {
                if (!productWarehouseStock[p.id]) productWarehouseStock[p.id] = {};
                productWarehouseStock[p.id][1] = p.qty;
            }
        });
        setData('productWarehouseStock', productWarehouseStock);
        
        console.log('✅ تم إنشاء مخزن رئيسي تلقائياً');
    }
    
    populateWarehouseDropdowns();
    populateWarehouseProducts();
    populateWarehouseStockFilter();
    
    console.log('✅ تم تهيئة نظام المخازن');
    console.log('📦 عدد المخازن:', warehouses.length);
};

// استدعاء التهيئة بعد تحميل الصفحة
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof getData === 'function' && typeof products !== 'undefined') {
            initWarehouses();
            
            // إضافة المخازن للقائمة الرئيسية
            if (typeof populateAllDropdowns === 'function') {
                const originalPopulate = populateAllDropdowns;
                window.populateAllDropdowns = function() {
                    originalPopulate();
                    populateWarehouseDropdowns();
                    populateWarehouseProducts();
                };
            }
        }
    }, 1500);
});

console.log('✅ تم تحميل app-warehouses.js بنجاح');
console.log('📦 نظام إدارة المخازن جاهز');