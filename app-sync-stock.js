// ============================================================
// الميزان 14.0.0 - مزامنة المخزون مع المخازن
// app-sync-stock.js (نسخة محسّنة مع حماية كاملة)
// ============================================================

console.log('🔄 تحميل app-sync-stock.js - مزامنة المخزون مع المخازن');

// ═══════════════════════════════════════════════════════════
// 🛡️ حماية من الأخطاء: التأكد من وجود الدوال الأساسية
// ═══════════════════════════════════════════════════════════

// دالة آمنة لاستدعاء renderProducts
function safeRenderProducts() {
    if (typeof window.renderProducts === 'function') {
        try {
            window.renderProducts();
        } catch (e) {
            console.warn('⚠️ خطأ في renderProducts:', e.message);
        }
    }
}

function safeRenderWarehouses() {
    if (typeof window.renderWarehouses === 'function') {
        try {
            window.renderWarehouses();
        } catch (e) {
            console.warn('⚠️ خطأ في renderWarehouses:', e.message);
        }
    }
}

function safeRenderWarehouseStock() {
    if (typeof window.renderWarehouseStock === 'function') {
        try {
            window.renderWarehouseStock();
        } catch (e) {
            console.warn('⚠️ خطأ في renderWarehouseStock:', e.message);
        }
    }
}

function safePopulateAllDropdowns() {
    if (typeof window.populateAllDropdowns === 'function') {
        try {
            window.populateAllDropdowns();
        } catch (e) {
            console.warn('⚠️ خطأ في populateAllDropdowns:', e.message);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 🔧 دوال مساعدة
// ═══════════════════════════════════════════════════════════

window.cleanProductWarehouseStock = function() {
    try {
        if (typeof productWarehouseStock === 'undefined' || !productWarehouseStock || typeof productWarehouseStock !== 'object') {
            window.productWarehouseStock = {};
            return;
        }
        
        const cleaned = {};
        Object.keys(productWarehouseStock).forEach(function(key) {
            if (!key || key === 'null' || key === 'undefined' || key === 'NaN') return;
            
            const stock = productWarehouseStock[key];
            if (!stock || typeof stock !== 'object') return;
            
            const cleanStock = {};
            Object.keys(stock).forEach(function(whId) {
                if (!whId || whId === 'null' || whId === 'undefined') return;
                const qty = stock[whId];
                if (typeof qty === 'number' && isFinite(qty) && qty > 0) {
                    cleanStock[whId] = qty;
                }
            });
            
            if (Object.keys(cleanStock).length > 0) {
                cleaned[key] = cleanStock;
            }
        });
        
        window.productWarehouseStock = cleaned;
        console.log('✅ تم تنظيف productWarehouseStock (' + Object.keys(cleaned).length + ' منتج)');
        
        if (typeof setData === 'function') {
            setData('productWarehouseStock', cleaned);
        } else {
            localStorage.setItem('mizan_productWarehouseStock', JSON.stringify(cleaned));
        }
    } catch (e) {
        console.warn('⚠️ خطأ في تنظيف المخزون:', e.message);
        window.productWarehouseStock = {};
    }
};

// ═══════════════════════════════════════════════════════════
// 🔄 1. مزامنة شاملة (مع حماية)
// ═══════════════════════════════════════════════════════════

window.syncAllStockToWarehouses = function() {
    try {
        console.log('🔄 بدء مزامنة المخزون مع المخازن...');
        
        if (typeof products === 'undefined' || !Array.isArray(products)) {
            console.warn('⚠️ products مش موجود');
            return { movedCount: 0, totalQty: 0 };
        }
        
        if (typeof warehouses === 'undefined' || !Array.isArray(warehouses)) {
            console.warn('⚠️ warehouses مش موجود');
            return { movedCount: 0, totalQty: 0 };
        }
        
        if (warehouses.length === 0) {
            console.log('⚠️ ما فيش مخازن، إنشاء مخزن رئيسي...');
            window.warehouses = [{
                id: 1,
                name: 'المخزن الرئيسي',
                location: 'المركز الرئيسي',
                manager: 'المدير',
                isDefault: true,
                active: true,
                createdAt: new Date().toISOString()
            }];
            if (typeof setData === 'function') {
                setData('warehouses', warehouses);
            } else {
                localStorage.setItem('mizan_warehouses', JSON.stringify(warehouses));
            }
        }
        
        cleanProductWarehouseStock();
        
        const defaultWh = warehouses.find(function(w) { return w.isDefault; }) || warehouses[0];
        if (!defaultWh || !defaultWh.id) {
            console.warn('⚠️ لا يوجد مخزن افتراضي');
            return { movedCount: 0, totalQty: 0 };
        }
        const defaultWhId = defaultWh.id;
        
        let movedCount = 0;
        let totalQty = 0;
        
        products.forEach(function(p) {
            if (!p || !p.id) return;
            
            let currentInWarehouses = 0;
            try {
                if (typeof getTotalProductStock === 'function') {
                    currentInWarehouses = getTotalProductStock(p.id);
                } else if (productWarehouseStock && productWarehouseStock[p.id]) {
                    currentInWarehouses = Object.values(productWarehouseStock[p.id]).reduce(function(s, q) {
                        return s + (typeof q === 'number' ? q : 0);
                    }, 0);
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
                    console.log('✅ ' + p.name + ': نقل ' + diff + ' قطعة');
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
// 🔄 2. خصم من مخزن
// ═══════════════════════════════════════════════════════════

window.deductFromWarehouse = function(productId, warehouseId, qty, reason, refType, refId) {
    try {
        if (!warehouseId) {
            if (typeof getDefaultWarehouse === 'function') {
                const dw = getDefaultWarehouse();
                warehouseId = dw ? dw.id : null;
            }
        }
        
        if (!warehouseId) {
            console.warn('⚠️ لا يوجد مخزن');
            return false;
        }
        
        if (typeof products === 'undefined' || !Array.isArray(products)) return false;
        
        const product = products.find(function(p) { return p.id == productId; });
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
// 🔄 3. إضافة لمخزن
// ═══════════════════════════════════════════════════════════

window.addToWarehouse = function(productId, warehouseId, qty, price, reason, refType, refId) {
    try {
        if (!warehouseId) {
            if (typeof getDefaultWarehouse === 'function') {
                const dw = getDefaultWarehouse();
                warehouseId = dw ? dw.id : null;
            }
        }
        
        if (!warehouseId) {
            console.warn('⚠️ لا يوجد مخزن');
            return false;
        }
        
        if (typeof products === 'undefined' || !Array.isArray(products)) return false;
        
        const product = products.find(function(p) { return p.id == productId; });
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
// 🔄 4. زر مزامنة يدوي
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
        
        // ✅ استخدام الدوال الآمنة
        safeRenderProducts();
        safeRenderWarehouses();
        safeRenderWarehouseStock();
        safePopulateAllDropdowns();
        
    } catch (e) {
        console.warn('⚠️ خطأ في manualSyncStock:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    // ✅ تأخير أطول للتأكد من تحميل جميع الملفات
    setTimeout(function() {
        try {
            console.log('🔄 بدء المزامنة التلقائية...');
            
            // التأكد من وجود المتغيرات الأساسية
            if (typeof products === 'undefined' || !Array.isArray(products)) {
                console.warn('⚠️ products غير موجودة، تأجيل المزامنة');
                return;
            }
            
            if (typeof warehouses === 'undefined' || !Array.isArray(warehouses)) {
                console.warn('⚠️ warehouses غير موجودة، تأجيل المزامنة');
                return;
            }
            
            const result = syncAllStockToWarehouses();
            
            if (result && result.movedCount > 0) {
                console.log('✅ تمت مزامنة ' + result.movedCount + ' منتج');
                if (typeof showToast === 'function') {
                    setTimeout(function() {
                        showToast('✅ تمت مزامنة ' + result.movedCount + ' منتج', 'success');
                    }, 2000);
                }
            }
            
            // ✅ استخدام الدوال الآمنة بدلاً من الاستدعاء المباشر
            safeRenderProducts();
            safeRenderWarehouses();
            safeRenderWarehouseStock();
            
        } catch (e) {
            console.warn('⚠️ خطأ في التهيئة:', e.message);
        }
    }, 3500); // زيادة الوقت لضمان تحميل جميع الملفات
});

console.log('✅ تم تحميل app-sync-stock.js بنجاح (مع حماية كاملة)');
