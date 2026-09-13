// ============================================================
// الميزان 14.0.0 - مزامنة المخزون مع المخازن
// app-sync-stock.js (نسخة كاملة مع الحماية من الأخطاء)
// ============================================================

console.log('🔄 تحميل app-sync-stock.js - مزامنة المخزون مع المخازن');

// ═══════════════════════════════════════════════════════════
// 🔄 1. مزامنة شاملة (مع حماية)
// ═══════════════════════════════════════════════════════════

window.syncAllStockToWarehouses = function() {
    try {
        console.log('🔄 بدء مزامنة المخزون مع المخازن...');
        
        // ✅ حماية
        if (typeof products === 'undefined' || !Array.isArray(products)) {
            console.warn('⚠️ products مش موجود');
            return { movedCount: 0, totalQty: 0 };
        }
        
        if (typeof warehouses === 'undefined' || !Array.isArray(warehouses)) {
            console.warn('⚠️ warehouses مش موجود');
            return { movedCount: 0, totalQty: 0 };
        }
        
        // نتأكد إن فيه مخزن افتراضي
        if (warehouses.length === 0) {
            console.log('⚠️ ما فيش مخازن، إنشاء مخزن رئيسي...');
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
            if (typeof setData === 'function') {
                setData('warehouses', warehouses);
            } else {
                localStorage.setItem('mizan_warehouses', JSON.stringify(warehouses));
            }
        }
        
        if (typeof productWarehouseStock === 'undefined' || !productWarehouseStock) {
            window.productWarehouseStock = {};
        }
        
        const defaultWh = warehouses.find(w => w.isDefault) || warehouses[0];
        if (!defaultWh) {
            console.warn('⚠️ لا يوجد مخزن افتراضي');
            return { movedCount: 0, totalQty: 0 };
        }
        const defaultWhId = defaultWh.id;
        
        let movedCount = 0;
        let totalQty = 0;
        
        products.forEach(p => {
            if (!p || !p.id) return;
            
            let currentInWarehouses = 0;
            try {
                if (typeof getTotalProductStock === 'function') {
                    currentInWarehouses = getTotalProductStock(p.id);
                } else if (productWarehouseStock[p.id]) {
                    currentInWarehouses = Object.values(productWarehouseStock[p.id]).reduce((s, q) => s + (q || 0), 0);
                }
            } catch (e) {
                currentInWarehouses = 0;
            }
            
            if (p.qty !== currentInWarehouses) {
                const diff = p.qty - currentInWarehouses;
                
                if (diff > 0) {
                    if (!productWarehouseStock[p.id]) productWarehouseStock[p.id] = {};
                    const currentInDefault = productWarehouseStock[p.id][defaultWhId] || 0;
                    productWarehouseStock[p.id][defaultWhId] = currentInDefault + diff;
                    movedCount++;
                    totalQty += diff;
                    console.log('✅ ' + p.name + ': نقل ' + diff + ' قطعة للمخزن الرئيسي');
                } else if (diff < 0) {
                    p.qty = currentInWarehouses;
                    console.log('⚠️ ' + p.name + ': تصحيح المخزون');
                }
            }
        });
        
        if (typeof setData === 'function') {
            setData('products', products);
            setData('productWarehouseStock', productWarehouseStock);
            setData('warehouses', warehouses);
        } else {
            localStorage.setItem('mizan_products', JSON.stringify(products));
            localStorage.setItem('mizan_productWarehouseStock', JSON.stringify(productWarehouseStock));
            localStorage.setItem('mizan_warehouses', JSON.stringify(warehouses));
        }
        
        console.log('✅ تمت المزامنة: ' + movedCount + ' منتج، ' + totalQty + ' قطعة');
        return { movedCount: movedCount, totalQty: totalQty };
        
    } catch (e) {
        console.warn('⚠️ خطأ في syncAllStockToWarehouses:', e.message);
        return { movedCount: 0, totalQty: 0 };
    }
};

// ═══════════════════════════════════════════════════════════
// 🔄 2. خصم من مخزن (مع حماية)
// ═══════════════════════════════════════════════════════════

window.deductFromWarehouse = function(productId, warehouseId, qty, reason, refType, refId) {
    try {
        if (!warehouseId) {
            if (typeof getDefaultWarehouse === 'function') {
                warehouseId = getDefaultWarehouse()?.id;
            }
        }
        
        if (!warehouseId) {
            console.warn('⚠️ لا يوجد مخزن');
            return false;
        }
        
        if (typeof products === 'undefined' || !Array.isArray(products)) return false;
        
        const product = products.find(p => p.id == productId);
        if (!product) return false;
        
        const beforeInWarehouse = typeof getProductStockInWarehouse === 'function' 
            ? getProductStockInWarehouse(productId, warehouseId) 
            : 0;
        
        if (beforeInWarehouse < qty) {
            console.warn('⚠️ الكمية غير كافية في المخزن: ' + product.name);
            return false;
        }
        
        if (typeof setProductStockInWarehouse === 'function') {
            setProductStockInWarehouse(productId, warehouseId, beforeInWarehouse - qty);
        }
        
        product.qty = Math.max(0, product.qty - qty);
        
        if (typeof setData === 'function') setData('products', products);
        
        if (typeof logInventoryMovement === 'function') {
            logInventoryMovement({
                productId: productId,
                productName: product.name,
                type: 'out',
                qty: qty,
                price: product.buy,
                reason: reason || 'sale',
                refType: refType || 'manual',
                refId: refId || null,
                warehouseId: warehouseId,
                warehouseName: typeof getWarehouseName === 'function' ? getWarehouseName(warehouseId) : '',
                balanceBefore: beforeInWarehouse,
                balanceAfter: beforeInWarehouse - qty
            });
        }
        
        return true;
    } catch (e) {
        console.warn('⚠️ خطأ في deductFromWarehouse:', e.message);
        return false;
    }
};

// ═══════════════════════════════════════════════════════════
// 🔄 3. إضافة لمخزن (مع حماية)
// ═══════════════════════════════════════════════════════════

window.addToWarehouse = function(productId, warehouseId, qty, price, reason, refType, refId) {
    try {
        if (!warehouseId) {
            if (typeof getDefaultWarehouse === 'function') {
                warehouseId = getDefaultWarehouse()?.id;
            }
        }
        
        if (!warehouseId) {
            console.warn('⚠️ لا يوجد مخزن');
            return false;
        }
        
        if (typeof products === 'undefined' || !Array.isArray(products)) return false;
        
        const product = products.find(p => p.id == productId);
        if (!product) return false;
        
        const beforeInWarehouse = typeof getProductStockInWarehouse === 'function' 
            ? getProductStockInWarehouse(productId, warehouseId) 
            : 0;
        
        if (typeof setProductStockInWarehouse === 'function') {
            setProductStockInWarehouse(productId, warehouseId, beforeInWarehouse + qty);
        }
        
        product.qty = (product.qty || 0) + qty;
        if (price > 0) product.buy = price;
        
        if (typeof setData === 'function') setData('products', products);
        
        if (typeof logInventoryMovement === 'function') {
            logInventoryMovement({
                productId: productId,
                productName: product.name,
                type: 'in',
                qty: qty,
                price: price || product.buy,
                reason: reason || 'purchase',
                refType: refType || 'manual',
                refId: refId || null,
                warehouseId: warehouseId,
                warehouseName: typeof getWarehouseName === 'function' ? getWarehouseName(warehouseId) : '',
                balanceBefore: beforeInWarehouse,
                balanceAfter: beforeInWarehouse + qty
            });
        }
        
        return true;
    } catch (e) {
        console.warn('⚠️ خطأ في addToWarehouse:', e.message);
        return false;
    }
};

// ═══════════════════════════════════════════════════════════
// 🔄 4. الحماية من الأخطاء (تستبدل الملفات القديمة)
// ═══════════════════════════════════════════════════════════

// ✅ حماية syncAllStockToWarehouses
if (typeof window.syncAllStockToWarehouses === 'function') {
    const _originalSync = window.syncAllStockToWarehouses;
    window.syncAllStockToWarehouses = function() {
        try {
            if (typeof products === 'undefined' || !Array.isArray(products)) {
                console.warn('⚠️ products مش موجود');
                return { movedCount: 0, totalQty: 0 };
            }
            if (typeof warehouses === 'undefined' || !Array.isArray(warehouses) || warehouses.length === 0) {
                console.warn('⚠️ warehouses مش موجود');
                return { movedCount: 0, totalQty: 0 };
            }
            return _originalSync.apply(this, arguments);
        } catch (e) {
            console.warn('⚠️ خطأ محمي:', e.message);
            return { movedCount: 0, totalQty: 0 };
        }
    };
}

// ═══════════════════════════════════════════════════════════
// 🔄 5. زر مزامنة يدوي
// ═══════════════════════════════════════════════════════════

window.manualSyncStock = function() {
    try {
        if (!confirm('🔄 سيتم مزامنة المخزون مع المخازن.\n\nهل تريد المتابعة؟')) return;
        
        const result = syncAllStockToWarehouses();
        
        if (result && result.movedCount > 0) {
            if (typeof showToast === 'function') {
                showToast('✅ تمت مزامنة ' + result.movedCount + ' منتج (' + result.totalQty + ' قطعة)', 'success');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('ℹ️ كل المنتجات متزامنة بالفعل', 'info');
            }
        }
        
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof renderWarehouses === 'function') renderWarehouses();
        if (typeof renderWarehouseStock === 'function') renderWarehouseStock();
        if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
    } catch (e) {
        console.warn('⚠️ خطأ في manualSyncStock:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 🔄 6. عرض حركات المخازن (مع حماية)
// ═══════════════════════════════════════════════════════════

window.renderWarehouseMovements = function() {
    try {
        const c = document.getElementById('warehouseMovementsList');
        if (!c) return;
        
        if (typeof warehouseMovements === 'undefined' || !Array.isArray(warehouseMovements) || warehouseMovements.length === 0) {
            c.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد حركات</span></div>';
            return;
        }
        
        const typeNames = {
            'in': { name: '➕ إدخال', color: '#2D8F5E', icon: '📥' },
            'out': { name: '➖ صرف', color: '#E06060', icon: '📤' },
            'transfer': { name: '🔄 تحويل', color: '#4A8AB5', icon: '🔄' },
            'opening': { name: '🎁 افتتاحي', color: '#C9A94E', icon: '📊' },
            'adjustment': { name: '⚖️ تسوية', color: '#E6A830', icon: '⚖️' }
        };
        
        let html = '<div class="table-header" style="grid-template-columns: 0.4fr 0.8fr 1.2fr 1fr 0.6fr 1.2fr;"><span>#</span><span>النوع</span><span>الصنف</span><span>المخزن</span><span>الكمية</span><span>التاريخ</span></div>';
        
        warehouseMovements.slice(0, 100).forEach(m => {
            const tn = typeNames[m.type] || { name: m.type, color: '#5D5D5D', icon: '📋' };
            let warehouseText = m.warehouseName || '';
            
            if (m.type === 'transfer') {
                warehouseText = (m.fromWarehouseName || '') + ' ← ' + (m.toWarehouseName || '');
            }
            
            let qtyText = tn.icon + ' ' + m.qty;
            if (m.type === 'adjustment') {
                qtyText = (m.diff > 0 ? '+' : '') + m.diff;
            }
            
            html += '<div class="table-row" style="grid-template-columns: 0.4fr 0.8fr 1.2fr 1fr 0.6fr 1.2fr;font-size:11px;">' +
                '<span>#' + (m.number || '-') + '</span>' +
                '<span style="color:' + tn.color + ';font-weight:700;font-size:10px;">' + tn.name + '</span>' +
                '<span>' + (m.productName || '') + '</span>' +
                '<span style="font-size:10px;color:#A89070;">' + warehouseText + '</span>' +
                '<span style="color:' + tn.color + ';font-weight:700;">' + qtyText + '</span>' +
                '<span style="font-size:10px;color:#A89070;">' + (m.date || '') + '<br>' + (m.time || '') + '</span>' +
                '</div>';
        });
        c.innerHTML = html;
    } catch (e) {
        console.warn('⚠️ خطأ في renderWarehouseMovements:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 🔄 7. عرض المنتجات (مع المخازن)
// ═══════════════════════════════════════════════════════════

window.renderProducts = function() {
    try {
        const container = document.getElementById('productList');
        if (!container) return;
        
        if (typeof products === 'undefined' || !Array.isArray(products)) return;
        if (typeof warehouses === 'undefined' || !Array.isArray(warehouses)) return;
        
        const search = (document.getElementById('inventorySearch')?.value || '').trim().toLowerCase();
        let filtered = products;
        if (search) {
            filtered = products.filter(p => 
                (p.name || '').toLowerCase().includes(search) || 
                (p.barcode && p.barcode.includes(search))
            );
        }
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><span>' + (search ? 'لا توجد نتائج' : 'لا توجد منتجات') + '</span></div>';
            return;
        }
        
        const showActions = typeof canEdit === 'function' && canEdit() || typeof canDelete === 'function' && canDelete();
        
        let headerCols = '<span>المنتج</span><span>الشراء</span><span>البيع</span>';
        warehouses.forEach(w => {
            const shortName = (w.name || '').substring(0, 8);
            headerCols += '<span style="font-size:9px;">' + shortName + (w.isDefault ? '⭐' : '') + '</span>';
        });
        headerCols += '<span>الإجمالي</span>';
        if (showActions) headerCols += '<span></span>';
        
        const cols = '2fr 0.7fr 0.7fr ' + warehouses.map(() => '0.8fr').join(' ') + ' 0.7fr ' + (showActions ? '1fr' : '0');
        
        let html = '<div class="table-header" style="grid-template-columns: ' + cols + ';">' + headerCols + '</div>';
        
        filtered.forEach(p => {
            const low = p.qty <= (p.min || 5);
            
            let cellsHtml = 
                '<span><strong>' + p.name + '</strong>' + (p.barcode ? '<br><small style="color:#A89070;font-size:9px;">' + p.barcode + '</small>' : '') + '</span>' +
                '<span>' + formatMoney(p.buy) + '</span>' +
                '<span style="color:#2D8F5E;font-weight:700;">' + formatMoney(p.sell) + '</span>';
            
            warehouses.forEach(w => {
                const qty = typeof getProductStockInWarehouse === 'function' 
                    ? getProductStockInWarehouse(p.id, w.id) 
                    : 0;
                cellsHtml += '<span style="color:' + (qty > 0 ? '#C9A94E' : '#5D5D5D') + ';font-weight:' + (qty > 0 ? '700' : '400') + ';font-size:11px;">' + qty + '</span>';
            });
            
            cellsHtml += '<span style="' + (low ? 'color:#E06060;font-weight:700;' : 'color:#4A8AB5;font-weight:700;') + '">' + p.qty + (low ? ' ⚠️' : '') + '</span>';
            
            if (showActions) {
                cellsHtml += '<div style="display:flex;gap:4px;">' +
                    (typeof canEdit === 'function' && canEdit() ? '<button class="btn btn-warning btn-sm" onclick="editProduct(' + p.id + ')"><i class="fas fa-edit"></i></button>' : '') +
                    (typeof canDelete === 'function' && canDelete() ? '<button class="btn btn-danger btn-sm" onclick="deleteProduct(' + p.id + ')"><i class="fas fa-trash"></i></button>' : '') +
                    '</div>';
            }
            
            html += '<div class="table-row" style="grid-template-columns: ' + cols + ';">' + cellsHtml + '</div>';
        });
        
        container.innerHTML = html;
    } catch (e) {
        console.warn('⚠️ خطأ في renderProducts:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        try {
            console.log('🔄 بدء المزامنة التلقائية...');
            const result = syncAllStockToWarehouses();
            
            if (result && result.movedCount > 0) {
                console.log('✅ تمت مزامنة ' + result.movedCount + ' منتج');
                if (typeof showToast === 'function') {
                    setTimeout(function() {
                        showToast('✅ تمت مزامنة ' + result.movedCount + ' منتج مع المخازن', 'success');
                    }, 2000);
                }
            }
            
            if (typeof renderProducts === 'function') renderProducts();
            if (typeof renderWarehouses === 'function') renderWarehouses();
            if (typeof renderWarehouseStock === 'function') renderWarehouseStock();
        } catch (e) {
            console.warn('⚠️ خطأ في التهيئة:', e.message);
        }
    }, 2000);
});

console.log('✅ تم تحميل app-sync-stock.js بنجاح');
console.log('🔄 مزامنة المخزون مع المخازن جاهزة (مع الحماية)');
