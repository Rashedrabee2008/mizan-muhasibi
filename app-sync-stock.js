// ============================================================
// الميزان 14.0.0 - مزامنة المخزون مع المخازن
// app-sync-stock.js
// ============================================================
// 
// يحل المشكلة:
// - المنتجات في المخزون مش ظاهرة في المخازن
// - كل عملية لازم تحدّث الاتنين مع بعض
// - البيانات القديمة تتنقل تلقائياً
// ============================================================

console.log('🔄 تحميل app-sync-stock.js - مزامنة المخزون مع المخازن');

// ═══════════════════════════════════════════════════════════
// 🔄 1. مزامنة شاملة (تشغيل مرة واحدة)
// ═══════════════════════════════════════════════════════════

window.syncAllStockToWarehouses = function() {
    console.log('🔄 بدء مزامنة المخزون مع المخازن...');
    
    // نتأكد إن فيه مخزن افتراضي
    if (warehouses.length === 0) {
        console.log('⚠️ ما فيش مخازن، إنشاء مخزن رئيسي...');
        warehouses = [{
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
    }
    
    const defaultWh = warehouses.find(w => w.isDefault) || warehouses[0];
    const defaultWhId = defaultWh.id;
    
    let movedCount = 0;
    let totalQty = 0;
    
    // نمر على كل منتج ونزامن الكمية
    products.forEach(p => {
        // نحسب الكمية الحالية في المخازن
        const currentInWarehouses = getTotalProductStock(p.id);
        
        // لو فيه فرق بين المخزون العام والمخازن
        if (p.qty !== currentInWarehouses) {
            const diff = p.qty - currentInWarehouses;
            
            if (diff > 0) {
                // عندنا كمية في المخزون مش موجودة في المخازن
                // نضيفها للمخزن الافتراضي
                if (!productWarehouseStock[p.id]) productWarehouseStock[p.id] = {};
                const currentInDefault = productWarehouseStock[p.id][defaultWhId] || 0;
                productWarehouseStock[p.id][defaultWhId] = currentInDefault + diff;
                movedCount++;
                totalQty += diff;
                
                console.log(`✅ ${p.name}: نقل ${diff} قطعة للمخزن الرئيسي (${currentInDefault} → ${currentInDefault + diff})`);
            } else if (diff < 0) {
                // المخازن فيها كمية أكبر من المخزون العام
                // نحدّث المخزون العام
                p.qty = currentInWarehouses;
                console.log(`⚠️ ${p.name}: تصحيح المخزون العام (${p.qty} → ${currentInWarehouses})`);
            }
        }
    });
    
    // حفظ
    setData('products', products);
    setData('productWarehouseStock', productWarehouseStock);
    setData('warehouses', warehouses);
    
    console.log(`✅ تمت المزامنة: ${movedCount} منتج، ${totalQty} قطعة`);
    
    return { movedCount, totalQty };
};

// ═══════════════════════════════════════════════════════════
// 🔄 2. دالة موحّدة: خصم من مخزن
// ═══════════════════════════════════════════════════════════

window.deductFromWarehouse = function(productId, warehouseId, qty, reason, refType, refId) {
    if (!warehouseId) {
        // لو مفيش مخزن محدد، نستخدم الافتراضي
        warehouseId = getDefaultWarehouse()?.id;
    }
    
    if (!warehouseId) {
        console.warn('⚠️ لا يوجد مخزن');
        return false;
    }
    
    const product = products.find(p => p.id == productId);
    if (!product) return false;
    
    // الرصيد في المخزن المحدد
    const beforeInWarehouse = getProductStockInWarehouse(productId, warehouseId);
    
    if (beforeInWarehouse < qty) {
        console.warn(`⚠️ الكمية غير كافية في المخزن: ${product.name} (متاح: ${beforeInWarehouse})`);
        return false;
    }
    
    // خصم من المخزن
    setProductStockInWarehouse(productId, warehouseId, beforeInWarehouse - qty);
    
    // ✅ خصم من المخزون العام أيضاً (المزامنة)
    product.qty = Math.max(0, product.qty - qty);
    
    // حفظ
    setData('products', products);
    
    // تسجيل الحركة
    logInventoryMovement({
        productId,
        productName: product.name,
        type: 'out',
        qty,
        price: product.buy,
        reason: reason || 'sale',
        refType: refType || 'manual',
        refId: refId || null,
        warehouseId,
        warehouseName: getWarehouseName(warehouseId),
        balanceBefore: beforeInWarehouse,
        balanceAfter: beforeInWarehouse - qty
    });
    
    console.log(`✅ خصم ${qty} من ${product.name} (${warehouseId})`);
    return true;
};

// ═══════════════════════════════════════════════════════════
// 🔄 3. دالة موحّدة: إضافة لمخزن
// ═══════════════════════════════════════════════════════════

window.addToWarehouse = function(productId, warehouseId, qty, price, reason, refType, refId) {
    if (!warehouseId) {
        warehouseId = getDefaultWarehouse()?.id;
    }
    
    if (!warehouseId) {
        console.warn('⚠️ لا يوجد مخزن');
        return false;
    }
    
    const product = products.find(p => p.id == productId);
    if (!product) return false;
    
    const beforeInWarehouse = getProductStockInWarehouse(productId, warehouseId);
    
    // إضافة للمخزن
    setProductStockInWarehouse(productId, warehouseId, beforeInWarehouse + qty);
    
    // ✅ إضافة للمخزون العام
    product.qty = (product.qty || 0) + qty;
    if (price > 0) product.buy = price;
    
    // حفظ
    setData('products', products);
    
    // تسجيل الحركة
    logInventoryMovement({
        productId,
        productName: product.name,
        type: 'in',
        qty,
        price: price || product.buy,
        reason: reason || 'purchase',
        refType: refType || 'manual',
        refId: refId || null,
        warehouseId,
        warehouseName: getWarehouseName(warehouseId),
        balanceBefore: beforeInWarehouse,
        balanceAfter: beforeInWarehouse + qty
    });
    
    console.log(`✅ إضافة ${qty} لـ ${product.name} (${warehouseId})`);
    return true;
};

// ═══════════════════════════════════════════════════════════
// 🔄 4. تعديل saveProduct لتحديث المخازن
// ═══════════════════════════════════════════════════════════

const _originalSaveProduct = window.saveProduct;
window.saveProduct = function() {
    const id = $('productId').value;
    const qty = parseInt($('productQty').value) || 0;
    const defaultWh = getDefaultWarehouse();
    
    if (_originalSaveProduct) _originalSaveProduct();
    
    setTimeout(() => {
        const product = id ? products.find(p => p.id == id) : products[products.length - 1];
        if (!product) return;
        
        // نحدّث المخزن الافتراضي بالكمية
        if (!productWarehouseStock[product.id]) productWarehouseStock[product.id] = {};
        
        const currentInDefault = productWarehouseStock[product.id][defaultWh.id] || 0;
        
        // نضيف الفرق للمخزن
        if (qty !== currentInDefault && !id) {
            // منتج جديد
            productWarehouseStock[product.id][defaultWh.id] = qty;
            product.qty = qty;
            setData('products', products);
            setData('productWarehouseStock', productWarehouseStock);
            console.log(`✅ تمت مزامنة المنتج الجديد مع المخزن الرئيسي: ${product.name} (${qty})`);
        }
    }, 100);
};

// ═══════════════════════════════════════════════════════════
// 🔄 5. تعديل saveSale (البيع)
// ═══════════════════════════════════════════════════════════

const _originalSaveSaleV2 = window.saveSale;
window.saveSale = function() {
    // ✅ جلب المخزن المحدد من الحقل الجديد
    const warehouseId = $('saleWarehouse')?.value || getDefaultWarehouse()?.id;
    
    if (!warehouseId) {
        showToast('⚠️ اختر المخزن أولاً', 'error');
        return;
    }
    
    if (currentSaleItems.length === 0) {
        showToast('⚠️ لا توجد أصناف', 'error');
        return;
    }
    
    // ✅ التحقق من الكميات في المخزن المحدد
    for (const it of currentSaleItems) {
        const availableQty = getProductStockInWarehouse(it.productId, warehouseId);
        if (availableQty < it.qty) {
            const product = products.find(p => p.id == it.productId);
            showToast(`⚠️ الكمية غير كافية في المخزن: ${product?.name || it.name} (متاح: ${availableQty})`, 'error');
            return;
        }
    }
    
    // حفظ المخزن للاستخدام
    window._currentSaleWarehouseId = warehouseId;
    
    if (_originalSaveSaleV2) _originalSaveSaleV2();
};

// ═══════════════════════════════════════════════════════════
// 🔄 6. تعديل savePurchase (الشراء)
// ═══════════════════════════════════════════════════════════

const _originalSavePurchaseV2 = window.savePurchase;
window.savePurchase = function() {
    const warehouseId = $('purWarehouse')?.value || getDefaultWarehouse()?.id;
    
    if (!warehouseId) {
        showToast('⚠️ اختر المخزن أولاً', 'error');
        return;
    }
    
    if (currentPurItems.length === 0) {
        showToast('⚠️ لا توجد أصناف', 'error');
        return;
    }
    
    window._currentPurchaseWarehouseId = warehouseId;
    
    if (_originalSavePurchaseV2) _originalSavePurchaseV2();
};

// ═══════════════════════════════════════════════════════════
// 🔄 7. تعديل saveReturn (المرتجع)
// ═══════════════════════════════════════════════════════════

const _originalSaveReturnV2 = window.saveReturn;
window.saveReturn = function() {
    const warehouseId = $('retWarehouse')?.value || getDefaultWarehouse()?.id;
    
    if (!warehouseId) {
        showToast('⚠️ اختر المخزن أولاً', 'error');
        return;
    }
    
    if (currentRetItems.length === 0) {
        showToast('⚠️ لا توجد أصناف', 'error');
        return;
    }
    
    window._currentReturnWarehouseId = warehouseId;
    
    if (_originalSaveReturnV2) _originalSaveReturnV2();
};

// ═══════════════════════════════════════════════════════════
// 🔄 8. اعتراض logInventoryMovement لمزامنة المخزون
// ═══════════════════════════════════════════════════════════

const _originalLogMovementV2 = window.logInventoryMovement;
window.logInventoryMovement = function(data) {
    // نحدد المخزن
    let warehouseId = data.warehouseId;
    
    if (!warehouseId) {
        if (data.refType === 'sale' && window._currentSaleWarehouseId) {
            warehouseId = window._currentSaleWarehouseId;
        } else if (data.refType === 'purchase' && window._currentPurchaseWarehouseId) {
            warehouseId = window._currentPurchaseWarehouseId;
        } else if (data.refType === 'return' && window._currentReturnWarehouseId) {
            warehouseId = window._currentReturnWarehouseId;
        } else {
            warehouseId = getDefaultWarehouse()?.id;
        }
    }
    
    data.warehouseId = warehouseId;
    data.warehouseName = getWarehouseName(warehouseId);
    
    // ✅ نزامن المخزون العام
    const product = products.find(p => p.id == data.productId);
    if (product) {
        if (data.type === 'out') {
            // نطرح من المخزون العام
            product.qty = Math.max(0, product.qty - data.qty);
            // نطرح من المخزن (لو مش مطرح بالفعل)
            const whStock = getProductStockInWarehouse(data.productId, warehouseId);
            if (whStock >= data.qty) {
                setProductStockInWarehouse(data.productId, warehouseId, whStock - data.qty);
            }
        } else if (data.type === 'in') {
            // نضيف للمخزون العام
            product.qty = (product.qty || 0) + data.qty;
            // نضيف للمخزن
            const whStock = getProductStockInWarehouse(data.productId, warehouseId);
            setProductStockInWarehouse(data.productId, warehouseId, whStock + data.qty);
        }
        setData('products', products);
    }
    
    // استدعاء الدالة الأصلية
    if (_originalLogMovementV2) return _originalLogMovementV2(data);
};

// ═══════════════════════════════════════════════════════════
// 🔄 9. اعتراض setProductStockInWarehouse للمزامنة العكسية
// ═══════════════════════════════════════════════════════════

const _originalSetProductStock = window.setProductStockInWarehouse;
window.setProductStockInWarehouse = function(productId, warehouseId, qty) {
    if (_originalSetProductStock) {
        _originalSetProductStock(productId, warehouseId, qty);
    }
    
    // ✅ نحدّث المخزون العام ليكون مجموع المخازن
    setTimeout(() => {
        const product = products.find(p => p.id == productId);
        if (product) {
            const total = getTotalProductStock(productId);
            product.qty = total;
            setData('products', products);
        }
    }, 50);
};

// ═══════════════════════════════════════════════════════════
// 🔄 10. تحديث تقارير المخزون
// ═══════════════════════════════════════════════════════════

window.getProductStockDisplay = function(product) {
    const totalInWarehouses = getTotalProductStock(product.id);
    if (totalInWarehouses === product.qty) {
        return `${totalInWarehouses}`;
    }
    return `${product.qty} (مخزون) / ${totalInWarehouses} (مخازن)`;
};

// ═══════════════════════════════════════════════════════════
// 🔄 11. تشغيل المزامنة عند التحميل
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        console.log('🔄 بدء المزامنة التلقائية...');
        const result = syncAllStockToWarehouses();
        
        if (result && result.movedCount > 0) {
            console.log(`✅ تمت مزامنة ${result.movedCount} منتج (${result.totalQty} قطعة)`);
            if (typeof showToast === 'function') {
                setTimeout(() => {
                    showToast(`✅ تمت مزامنة ${result.movedCount} منتج مع المخازن`, 'success');
                }, 2000);
            }
        }
        
        // تحديث الواجهات
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof renderWarehouses === 'function') renderWarehouses();
        if (typeof renderWarehouseStock === 'function') renderWarehouseStock();
        
    }, 2000);
});

// ═══════════════════════════════════════════════════════════
// 🔄 12. زر مزامنة يدوي
// ═══════════════════════════════════════════════════════════

window.manualSyncStock = function() {
    if (!confirm('🔄 سيتم مزامنة المخزون مع المخازن.\n\nهل تريد المتابعة؟')) return;
    
    const result = syncAllStockToWarehouses();
    
    if (result.movedCount > 0) {
        showToast(`✅ تمت مزامنة ${result.movedCount} منتج (${result.totalQty} قطعة)`, 'success');
    } else {
        showToast('ℹ️ كل المنتجات متزامنة بالفعل', 'info');
    }
    
    // تحديث الواجهات
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderWarehouses === 'function') renderWarehouses();
    if (typeof renderWarehouseStock === 'function') renderWarehouseStock();
    if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
};

// إضافة زر المزامنة في صفحة المخازن
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const whListTab = document.querySelector('#whTab-list');
        if (whListTab && !whListTab.querySelector('#syncStockBtn')) {
            const btn = document.createElement('button');
            btn.id = 'syncStockBtn';
            btn.className = 'btn btn-info btn-block';
            btn.style.marginBottom = '14px';
            btn.innerHTML = '🔄 مزامنة المخزون مع المخازن';
            btn.onclick = manualSyncStock;
            whListTab.insertBefore(btn, whListTab.firstChild);
        }
    }, 3000);
});

// ═══════════════════════════════════════════════════════════
// 🔄 13. تسجيل الحركات مع المخزن
// ═══════════════════════════════════════════════════════════

window.renderWarehouseMovements = function() {
    const c = $('warehouseMovementsList'); 
    if (!c) return;
    
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
        
        if (m.type === 'transfer') {
            warehouseText = `${m.fromWarehouseName} ← ${m.toWarehouseName}`;
        } else if (m.refType === 'sale') {
            warehouseText = `${m.warehouseName} (بيع)`;
        } else if (m.refType === 'purchase') {
            warehouseText = `${m.warehouseName} (شراء)`;
        } else if (m.refType === 'return') {
            warehouseText = `${m.warehouseName} (مرتجع)`;
        }
        
        let qtyText = `${tn.icon} ${m.qty}`;
        if (m.type === 'adjustment') {
            qtyText = `${m.diff > 0 ? '+' : ''}${m.diff}`;
        }
        
        html += `<div class="table-row" style="grid-template-columns: 0.4fr 0.8fr 1.2fr 1fr 0.6fr 1.2fr;font-size:11px;">
            <span>#${m.number || '-'}</span>
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
// 🔄 14. عرض المخزون حسب المخازن في المخزون
// ═══════════════════════════════════════════════════════════

const _originalRenderProducts = window.renderProducts;
window.renderProducts = function() {
    const container = $('productList'); 
    if (!container) return;
    
    const search = ($('inventorySearch')?.value || '').trim().toLowerCase();
    let filtered = products;
    if (search) {
        filtered = products.filter(p => 
            p.name.toLowerCase().includes(search) || 
            (p.barcode && p.barcode.includes(search))
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><span>${search ? 'لا توجد نتائج' : 'لا توجد منتجات'}</span></div>`;
        return;
    }
    
    // ✅ تحديد عدد الأعمدة حسب عدد المخازن
    const whCount = warehouses.length;
    const showActions = canEdit() || canDelete();
    
    // عرض الأصناف مع توزيع المخازن
    let headerCols = '<span>المنتج</span><span>الشراء</span><span>البيع</span>';
    warehouses.forEach(w => {
        headerCols += `<span style="font-size:9px;">${w.name.substring(0, 8)}${w.isDefault ? '⭐' : ''}</span>`;
    });
    headerCols += '<span>الإجمالي</span>';
    if (showActions) headerCols += '<span></span>';
    
    let html = `<div class="table-header" style="grid-template-columns: 2fr 0.7fr 0.7fr ${warehouses.map(() => '0.8fr').join(' ')} 0.7fr ${showActions ? '1fr' : '0'};">${headerCols}</div>`;
    
    filtered.forEach(p => {
        const low = p.qty <= (p.min || 5);
        const vat = p.vat || vatSettings.defaultVAT;
        
        let cellsHtml = `
            <span><strong>${p.name}</strong>${p.barcode ? `<br><small style="color:#A89070;font-size:9px;">${p.barcode}</small>` : ''}</span>
            <span>${formatMoney(p.buy)}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(p.sell)}</span>
        `;
        
        warehouses.forEach(w => {
            const qty = getProductStockInWarehouse(p.id, w.id);
            cellsHtml += `<span style="color:${qty > 0 ? '#C9A94E' : '#5D5D5D'};font-weight:${qty > 0 ? '700' : '400'};font-size:11px;">${qty}</span>`;
        });
        
        cellsHtml += `<span style="${low ? 'color:#E06060;font-weight:700;' : 'color:#4A8AB5;font-weight:700;'}">${p.qty}${low ? ' ⚠️' : ''}</span>`;
        
        if (showActions) {
            cellsHtml += `<div style="display:flex;gap:4px;">
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>`;
        }
        
        html += `<div class="table-row" style="grid-template-columns: 2fr 0.7fr 0.7fr ${warehouses.map(() => '0.8fr').join(' ')} 0.7fr ${showActions ? '1fr' : '0'};">
            ${cellsHtml}
        </div>`;
    });
    
    container.innerHTML = html;
};

console.log('✅ تم تحميل app-sync-stock.js بنجاح');
console.log('🔄 مزامنة المخزون مع المخازن جاهزة');
