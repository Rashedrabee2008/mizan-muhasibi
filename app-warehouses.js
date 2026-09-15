// ============================================================
// الميزان 14.0.0 - نظام إدارة المخازن
// app-warehouses.js (نسخة كاملة - مع إصلاح القوائم)
// ============================================================

console.log('📦 تحميل app-warehouses.js - نظام إدارة المخازن');

// ═══════════════════════════════════════════════════════════
// 📊 المتغيرات العامة
// ═══════════════════════════════════════════════════════════

window.warehouses = [];
window.warehouseMovements = [];
window.productWarehouseStock = {};
window.currentWarehouseTab = 'list';

// ═══════════════════════════════════════════════════════════
// 📋 تعبئة القوائم المنسدلة (الحل الأساسي للمشكلة)
// ═══════════════════════════════════════════════════════════

window.populateWarehouseDropdowns = function() {
    try {
        // ✅ التأكد من وجود المخازن
        if (typeof warehouses === 'undefined' || !Array.isArray(warehouses) || warehouses.length === 0) {
            try {
                const stored = JSON.parse(localStorage.getItem('mizan_warehouses') || '[]');
                if (stored.length > 0) {
                    window.warehouses = stored;
                } else {
                    window.warehouses = [{
                        id: 1,
                        name: 'المخزن الرئيسي',
                        location: 'المركز الرئيسي',
                        isDefault: true,
                        active: true,
                        createdAt: new Date().toISOString()
                    }];
                    localStorage.setItem('mizan_warehouses', JSON.stringify(warehouses));
                }
            } catch (e) {
                window.warehouses = [{
                    id: 1,
                    name: 'المخزن الرئيسي',
                    isDefault: true,
                    active: true
                }];
            }
        }
        
        // ✅ قائمة المخازن المطلوب تعبئتها
        const ids = ['transferFromWarehouse', 'transferToWarehouse', 'stockInWarehouse', 'stockOutWarehouse', 'openingWarehouse', 'adjWarehouse'];
        
        ids.forEach(function(id) {
            const sel = document.getElementById(id);
            if (!sel) return;
            
            const cv = sel.value;
            let html = '<option value="">اختر مخزن...</option>';
            warehouses.forEach(function(w) {
                const isDef = w.isDefault ? ' ⭐' : '';
                html += '<option value="' + w.id + '">' + w.name + isDef + '</option>';
            });
            sel.innerHTML = html;
            sel.value = cv || (warehouses.find(function(w) { return w.isDefault; })?.id || '');
        });
        
        // ✅ قائمة المنتجات (في تبويب التحويل)
        const productIds = ['transferProduct', 'stockInProduct', 'stockOutProduct', 'openingProduct', 'adjProduct'];
        productIds.forEach(function(id) {
            const sel = document.getElementById(id);
            if (!sel) return;
            
            const cv = sel.value;
            let html = '<option value="">اختر منتج...</option>';
            if (typeof products !== 'undefined' && Array.isArray(products)) {
                products.forEach(function(p) {
                    let totalQty = p.qty || 0;
                    if (typeof productWarehouseStock !== 'undefined' && productWarehouseStock[p.id]) {
                        totalQty = Object.values(productWarehouseStock[p.id]).reduce(function(s, q) {
                            return s + (typeof q === 'number' ? q : 0);
                        }, 0);
                    }
                    html += '<option value="' + p.id + '">' + p.name + ' (إجمالي: ' + totalQty + ')</option>';
                });
            }
            sel.innerHTML = html;
            sel.value = cv;
        });
        
        // ✅ فلتر المخازن (في تبويب الأرصدة)
        const filter = document.getElementById('warehouseStockFilter');
        if (filter) {
            const cv = filter.value;
            let html = '<option value="">كل المخازن</option>';
            warehouses.forEach(function(w) {
                html += '<option value="' + w.id + '">' + w.name + '</option>';
            });
            filter.innerHTML = html;
            filter.value = cv;
        }
        
        console.log('✅ تم تعبئة ' + warehouses.length + ' مخزن في القوائم');
    } catch (e) {
        console.warn('⚠️ خطأ في populateWarehouseDropdowns:', e.message);
    }
};

window.populateWarehouseProducts = function() {
    try {
        const ids = ['transferProduct', 'stockInProduct', 'stockOutProduct', 'openingProduct', 'adjProduct'];
        ids.forEach(function(id) {
            const sel = document.getElementById(id);
            if (!sel) return;
            
            const cv = sel.value;
            let html = '<option value="">اختر منتج...</option>';
            if (typeof products !== 'undefined' && Array.isArray(products)) {
                products.forEach(function(p) {
                    let totalQty = p.qty || 0;
                    if (typeof productWarehouseStock !== 'undefined' && productWarehouseStock[p.id]) {
                        totalQty = Object.values(productWarehouseStock[p.id]).reduce(function(s, q) {
                            return s + (typeof q === 'number' ? q : 0);
                        }, 0);
                    }
                    html += '<option value="' + p.id + '">' + p.name + ' (إجمالي: ' + totalQty + ')</option>';
                });
            }
            sel.innerHTML = html;
            sel.value = cv;
        });
    } catch (e) {
        console.warn('⚠️ خطأ في populateWarehouseProducts:', e.message);
    }
};

window.populateWarehouseStockFilter = function() {
    try {
        const el = document.getElementById('warehouseStockFilter');
        if (!el) return;
        const cv = el.value;
        let html = '<option value="">كل المخازن</option>';
        if (typeof warehouses !== 'undefined' && Array.isArray(warehouses)) {
            warehouses.forEach(function(w) {
                html += '<option value="' + w.id + '">' + w.name + '</option>';
            });
        }
        el.innerHTML = html;
        el.value = cv;
    } catch (e) {
        console.warn('⚠️ خطأ في populateWarehouseStockFilter:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 🏪 إدارة المخازن (CRUD)
// ═══════════════════════════════════════════════════════════

window.saveWarehouse = function() {
    if (typeof canAdd === 'function' && !canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = document.getElementById('warehouseId')?.value;
    const name = document.getElementById('warehouseName')?.value.trim();
    const location = document.getElementById('warehouseLocation')?.value.trim() || '';
    const manager = document.getElementById('warehouseManager')?.value.trim() || '';
    const phone = document.getElementById('warehousePhone')?.value.trim() || '';
    const isDefault = document.getElementById('warehouseIsDefault')?.checked || false;
    
    if (!name) { showToast('⚠️ أدخل اسم المخزن', 'error'); return; }
    
    if (id) {
        const idx = warehouses.findIndex(w => w.id == id);
        if (idx > -1) {
            warehouses[idx] = { ...warehouses[idx], name, location, manager, phone };
            if (typeof addAuditLog === 'function') addAuditLog('edit', 'warehouse', `تعديل مخزن: ${name}`);
            showToast('✅ تم تعديل المخزن', 'success');
        }
    } else {
        if (warehouses.find(w => w.name === name)) { showToast('⚠️ اسم المخزن موجود', 'warning'); return; }
        
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
        if (typeof addAuditLog === 'function') addAuditLog('add', 'warehouse', `إضافة مخزن: ${name}`);
        showToast('✅ تم إضافة المخزن', 'success');
    }
    
    setData('warehouses', warehouses);
    resetWarehouseForm();
    renderWarehouses();
    populateWarehouseDropdowns();
    if (typeof updateDashboard === 'function') updateDashboard();
};

window.editWarehouse = function(id) {
    if (typeof canEdit === 'function' && !canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const w = warehouses.find(wh => wh.id == id); if (!w) return;
    document.getElementById('warehouseId').value = w.id;
    document.getElementById('warehouseName').value = w.name;
    document.getElementById('warehouseLocation').value = w.location || '';
    document.getElementById('warehouseManager').value = w.manager || '';
    document.getElementById('warehousePhone').value = w.phone || '';
    document.getElementById('warehouseIsDefault').checked = w.isDefault || false;
    document.getElementById('warehouseFormTitle').textContent = '✏️ تعديل المخزن';
    document.getElementById('warehouseSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteWarehouse = function(id) {
    if (typeof canDelete === 'function' && !canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const w = warehouses.find(wh => wh.id == id); if (!w) return;
    
    const hasStock = Object.keys(productWarehouseStock).some(pid => 
        (productWarehouseStock[pid][id] || 0) > 0
    );
    
    if (hasStock) {
        if (!confirm(`⚠️ المخزن "${w.name}" فيه أصناف. متابعة الحذف؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف المخزن "${w.name}"؟`)) return;
    }
    
    window.warehouses = warehouses.filter(wh => wh.id != id);
    Object.keys(productWarehouseStock).forEach(pid => {
        delete productWarehouseStock[pid][id];
    });
    
    if (w.isDefault && warehouses.length > 0) {
        warehouses[0].isDefault = true;
    }
    
    setData('warehouses', warehouses);
    setData('productWarehouseStock', productWarehouseStock);
    if (typeof addAuditLog === 'function') addAuditLog('delete', 'warehouse', `حذف مخزن: ${w.name}`);
    renderWarehouses();
    populateWarehouseDropdowns();
    showToast('🗑️ تم حذف المخزن', 'info');
};

window.setDefaultWarehouse = function(id) {
    if (typeof canEdit === 'function' && !canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    warehouses.forEach(w => w.isDefault = (w.id == id));
    setData('warehouses', warehouses);
    if (typeof addAuditLog === 'function') addAuditLog('edit', 'warehouse', `تعيين مخزن افتراضي`);
    renderWarehouses();
    populateWarehouseDropdowns();
    showToast('⭐ تم تعيين المخزن الافتراضي', 'success');
};

window.resetWarehouseForm = function() {
    if (document.getElementById('warehouseId')) document.getElementById('warehouseId').value = '';
    if (document.getElementById('warehouseName')) document.getElementById('warehouseName').value = '';
    if (document.getElementById('warehouseLocation')) document.getElementById('warehouseLocation').value = '';
    if (document.getElementById('warehouseManager')) document.getElementById('warehouseManager').value = '';
    if (document.getElementById('warehousePhone')) document.getElementById('warehousePhone').value = '';
    if (document.getElementById('warehouseIsDefault')) document.getElementById('warehouseIsDefault').checked = false;
    if (document.getElementById('warehouseFormTitle')) document.getElementById('warehouseFormTitle').textContent = '➕ إضافة مخزن جديد';
    if (document.getElementById('warehouseSaveBtnText')) document.getElementById('warehouseSaveBtnText').textContent = 'إضافة';
};

window.renderWarehouses = function() {
    const c = document.getElementById('warehouseList'); if (!c) return;
    
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
                ${!w.isDefault && typeof canEdit === 'function' && canEdit() ? `<button class="btn btn-info btn-sm" onclick="setDefaultWarehouse(${w.id})" title="افتراضي"><i class="fas fa-star"></i></button>` : ''}
                ${typeof canEdit === 'function' && canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editWarehouse(${w.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${typeof canDelete === 'function' && canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteWarehouse(${w.id})"><i class="fas fa-trash"></i></button>` : ''}
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
    if (typeof canAdd === 'function' && !canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const fromId = document.getElementById('transferFromWarehouse')?.value;
    const toId = document.getElementById('transferToWarehouse')?.value;
    const productId = document.getElementById('transferProduct')?.value;
    const qty = parseInt(document.getElementById('transferQty')?.value) || 0;
    const notes = document.getElementById('transferWhNotes')?.value.trim() || '';
    const date = document.getElementById('transferWhDate')?.value || getTodayDate();
    
    if (!fromId) { showToast('⚠️ اختر المخزن المصدر', 'error'); return; }
    if (!toId) { showToast('⚠️ اختر المخزن المستقبل', 'error'); return; }
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
    
    setProductStockInWarehouse(productId, fromId, availableQty - qty);
    const toQty = getProductStockInWarehouse(productId, toId);
    setProductStockInWarehouse(productId, toId, toQty + qty);
    
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
    
    if (typeof logInventoryMovement === 'function') {
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
    }
    
    setData('warehouseMovements', warehouseMovements);
    if (typeof addAuditLog === 'function') {
        addAuditLog('add', 'warehouse', 
            `تحويل ${qty} ${product.name} من ${fromWh.name} إلى ${toWh.name}`,
            { transferNumber: transfer.number, qty, notes }
        );
    }
    
    if (document.getElementById('transferProduct')) document.getElementById('transferProduct').value = '';
    if (document.getElementById('transferQty')) document.getElementById('transferQty').value = '1';
    if (document.getElementById('transferWhNotes')) document.getElementById('transferWhNotes').value = '';
    
    renderWarehouseMovements();
    renderWarehouses();
    if (typeof updateDashboard === 'function') updateDashboard();
    showToast(`✅ تم التحويل: ${qty} ${product.name}`, 'success');
};

// ═══════════════════════════════════════════════════════════
// ➕ إضافة صنف للمخزون (إدخال)
// ═══════════════════════════════════════════════════════════

window.saveStockIn = function() {
    if (typeof canAdd === 'function' && !canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const warehouseId = document.getElementById('stockInWarehouse')?.value;
    const productId = document.getElementById('stockInProduct')?.value;
    const qty = parseInt(document.getElementById('stockInQty')?.value) || 0;
    const price = parseFloat(document.getElementById('stockInPrice')?.value) || 0;
    const notes = document.getElementById('stockInNotes')?.value.trim() || '';
    const date = getTodayDate();
    
    if (!warehouseId) { showToast('⚠️ اختر المخزن', 'error'); return; }
    if (!productId) { showToast('⚠️ اختر المنتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    
    const wh = warehouses.find(w => w.id == warehouseId);
    const product = products.find(p => p.id == productId);
    if (!wh || !product) { showToast('⚠️ بيانات غير صحيحة', 'error'); return; }
    
    const beforeQty = getProductStockInWarehouse(productId, warehouseId);
    setProductStockInWarehouse(productId, warehouseId, beforeQty + qty);
    
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
        notes,
        date,
        time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    warehouseMovements.unshift(movement);
    
    if (typeof logInventoryMovement === 'function') {
        logInventoryMovement({
            productId, productName: product.name,
            type: 'in', qty, price: price || product.buy,
            reason: 'warehouse_in',
            refType: 'warehouse_stock_in', refId: movement.id, refNumber: movement.number,
            balanceBefore: beforeQty, balanceAfter: beforeQty + qty,
            notes: `إدخال إلى ${wh.name}`
        });
    }
    
    setData('warehouseMovements', warehouseMovements);
    setData('products', products);
    if (typeof addAuditLog === 'function') {
        addAuditLog('add', 'warehouse', `إدخال ${qty} ${product.name} إلى ${wh.name}`);
    }
    
    if (document.getElementById('stockInProduct')) document.getElementById('stockInProduct').value = '';
    if (document.getElementById('stockInQty')) document.getElementById('stockInQty').value = '1';
    if (document.getElementById('stockInPrice')) document.getElementById('stockInPrice').value = '';
    if (document.getElementById('stockInNotes')) document.getElementById('stockInNotes').value = '';
    
    renderWarehouseMovements();
    renderWarehouses();
    populateWarehouseDropdowns();
    if (typeof updateDashboard === 'function') updateDashboard();
    showToast(`✅ تم إدخال ${qty} ${product.name}`, 'success');
};

// ═══════════════════════════════════════════════════════════
// ➖ صرف صنف من المخزون (إخراج)
// ═══════════════════════════════════════════════════════════

window.saveStockOut = function() {
    if (typeof canAdd === 'function' && !canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const warehouseId = document.getElementById('stockOutWarehouse')?.value;
    const productId = document.getElementById('stockOutProduct')?.value;
    const qty = parseInt(document.getElementById('stockOutQty')?.value) || 0;
    const reason = document.getElementById('stockOutReason')?.value || 'damaged';
    const notes = document.getElementById('stockOutNotes')?.value.trim() || '';
    const date = getTodayDate();
    
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
    
    if (typeof logInventoryMovement === 'function') {
        logInventoryMovement({
            productId, productName: product.name,
            type: 'out', qty, price: product.buy,
            reason: 'warehouse_out',
            refType: 'warehouse_stock_out', refId: movement.id, refNumber: movement.number,
            balanceBefore: beforeQty, balanceAfter: beforeQty - qty,
            notes: `صرف من ${wh.name}`
        });
    }
    
    setData('warehouseMovements', warehouseMovements);
    if (typeof addAuditLog === 'function') {
        addAuditLog('add', 'warehouse', `صرف ${qty} ${product.name} من ${wh.name}`);
    }
    
    if (document.getElementById('stockOutProduct')) document.getElementById('stockOutProduct').value = '';
    if (document.getElementById('stockOutQty')) document.getElementById('stockOutQty').value = '1';
    if (document.getElementById('stockOutNotes')) document.getElementById('stockOutNotes').value = '';
    
    renderWarehouseMovements();
    renderWarehouses();
    populateWarehouseDropdowns();
    if (typeof updateDashboard === 'function') updateDashboard();
    showToast(`✅ تم صرف ${qty} ${product.name}`, 'success');
};

// ═══════════════════════════════════════════════════════════
// 📋 عرض حركات المخازن
// ═══════════════════════════════════════════════════════════

window.renderWarehouseMovements = function() {
    const c = document.getElementById('warehouseMovementsList'); if (!c) return;
    
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
        
        html += `<div class="table-row" style="grid-template-columns: 0.4fr 0.8fr 1.2fr 1fr 0.6fr 1.2fr;font-size:11px;">
            <span>#${m.number}</span>
            <span style="color:${tn.color};font-weight:700;font-size:10px;">${tn.name}</span>
            <span>${m.productName}</span>
            <span style="font-size:10px;color:#A89070;">${warehouseText}</span>
            <span style="color:${tn.color};font-weight:700;">${tn.icon} ${m.qty}</span>
            <span style="font-size:10px;color:#A89070;">${m.date}<br>${m.time || ''}</span>
        </div>`;
    });
    c.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 📋 عرض أرصدة الأصناف في المخازن
// ═══════════════════════════════════════════════════════════

window.renderWarehouseStock = function() {
    const c = document.getElementById('warehouseStockList'); if (!c) return;
    const whFilter = document.getElementById('warehouseStockFilter')?.value || '';
    
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
    
    const tabs = ['list', 'stock', 'transfer', 'in', 'out', 'movements'];
    tabs.forEach(t => {
        const el = document.getElementById('whTab-' + t);
        if (el) el.style.display = (t === tab) ? 'block' : 'none';
    });
    
    // ✅ تعبئة القوائم عند فتح التبويب
    if (tab === 'list') { 
        renderWarehouses(); 
    }
    if (tab === 'stock') { 
        populateWarehouseStockFilter();
        renderWarehouseStock(); 
    }
    if (tab === 'transfer') { 
        populateWarehouseDropdowns();
        populateWarehouseProducts();
    }
    if (tab === 'in') { 
        populateWarehouseDropdowns();
        populateWarehouseProducts();
    }
    if (tab === 'out') { 
        populateWarehouseDropdowns();
        populateWarehouseProducts();
    }
    if (tab === 'movements') { 
        renderWarehouseMovements(); 
    }
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة
// ═══════════════════════════════════════════════════════════

window.initWarehouses = function() {
    try {
        // تحميل البيانات
        if (typeof warehouses === 'undefined' || !Array.isArray(warehouses) || warehouses.length === 0) {
            window.warehouses = getData('warehouses', []);
        }
        if (typeof warehouseMovements === 'undefined' || !Array.isArray(warehouseMovements)) {
            window.warehouseMovements = getData('warehouseMovements', []);
        }
        if (typeof productWarehouseStock === 'undefined' || !productWarehouseStock) {
            window.productWarehouseStock = getData('productWarehouseStock', {});
        }
        
        // إنشاء مخزن رئيسي إذا لم يكن موجوداً
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
            if (typeof products !== 'undefined') {
                products.forEach(function(p) {
                    if (p.qty > 0) {
                        if (!productWarehouseStock[p.id]) productWarehouseStock[p.id] = {};
                        productWarehouseStock[p.id][1] = p.qty;
                    }
                });
                setData('productWarehouseStock', productWarehouseStock);
            }
            console.log('✅ تم إنشاء مخزن رئيسي تلقائياً');
        }
        
        populateWarehouseDropdowns();
        populateWarehouseProducts();
        populateWarehouseStockFilter();
        
        console.log('✅ تم تهيئة نظام المخازن - عدد المخازن: ' + warehouses.length);
    } catch (e) {
        console.warn('⚠️ خطأ في initWarehouses:', e.message);
    }
};

// استدعاء التهيئة عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof getData === 'function' && typeof products !== 'undefined') {
            initWarehouses();
        }
    }, 1500);
});

// إعادة التعبئة عند التنقل لصفحة المخازن
(function() {
    let _navOriginal = window.navigateTo;
    window.navigateTo = function(page) {
        if (_navOriginal) _navOriginal.apply(this, arguments);
        setTimeout(function() {
            if (page === 'warehouses') {
                if (typeof populateWarehouseDropdowns === 'function') {
                    try { populateWarehouseDropdowns(); } catch(e) {}
                }
                if (typeof populateWarehouseProducts === 'function') {
                    try { populateWarehouseProducts(); } catch(e) {}
                }
                if (typeof populateWarehouseStockFilter === 'function') {
                    try { populateWarehouseStockFilter(); } catch(e) {}
                }
                if (typeof renderWarehouses === 'function') {
                    try { renderWarehouses(); } catch(e) {}
                }
            }
        }, 500);
    };
})();

console.log('✅ تم تحميل app-warehouses.js بنجاح');
console.log('📦 نظام إدارة المخازن جاهز');
