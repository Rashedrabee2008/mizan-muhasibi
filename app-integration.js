// ============================================================
// الميزان 14.0.0 - ربط المخازن بالنظام
// app-integration.js (نسخة كاملة - مع إصلاح إحصائيات المخازن)
// ============================================================

console.log('🔗 تحميل app-integration.js - ربط المخازن بالنظام');

// ═══════════════════════════════════════════════════════════
// 🔧 دوال مساعدة
// ═══════════════════════════════════════════════════════════

window.getDefaultWarehouse = function() {
    if (typeof warehouses === 'undefined' || !Array.isArray(warehouses) || warehouses.length === 0) {
        return null;
    }
    return warehouses.find(w => w.isDefault) || warehouses[0];
};

window.getWarehouseName = function(id) {
    if (typeof warehouses === 'undefined' || !Array.isArray(warehouses)) return 'غير محدد';
    const w = warehouses.find(wh => wh.id == id);
    return w ? w.name : 'غير محدد';
};

// ═══════════════════════════════════════════════════════════
// ✅ 1. تعبئة المخازن في الفواتير
// ═══════════════════════════════════════════════════════════

window.populateSaleWarehouseSafe = function() {
    try {
        const sel = document.getElementById('saleWarehouse');
        if (!sel) return;
        
        const cv = sel.value;
        let whs = [];
        
        if (typeof warehouses !== 'undefined' && Array.isArray(warehouses) && warehouses.length > 0) {
            whs = warehouses;
        } else {
            try {
                whs = JSON.parse(localStorage.getItem('mizan_warehouses') || '[]');
            } catch (e) { whs = []; }
        }
        
        if (whs.length === 0) {
            whs = [{
                id: 1,
                name: 'المخزن الرئيسي',
                location: 'المركز الرئيسي',
                isDefault: true,
                active: true
            }];
            localStorage.setItem('mizan_warehouses', JSON.stringify(whs));
            if (typeof window.warehouses !== 'undefined') window.warehouses = whs;
        }
        
        let html = '<option value="">اختر المخزن...</option>';
        whs.forEach(function(w) {
            const isDef = w.isDefault ? ' ⭐' : '';
            html += '<option value="' + w.id + '">' + w.name + isDef + '</option>';
        });
        sel.innerHTML = html;
        sel.value = cv || (whs.find(function(w) { return w.isDefault; })?.id || '');
    } catch (e) {
        console.warn('⚠️ خطأ في populateSaleWarehouseSafe:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// ✅ 2. عرض إحصائيات المخازن في لوحة التحكم
// ═══════════════════════════════════════════════════════════

window.renderWarehouseStatsOnDashboard = function() {
    try {
        const grid = document.getElementById('warehouseStatsGrid');
        if (!grid) {
            console.warn('⚠️ warehouseStatsGrid غير موجودة في HTML');
            return;
        }
        
        // ✅ التأكد من وجود المتغيرات
        if (typeof warehouses === 'undefined' || !Array.isArray(warehouses) || warehouses.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>';
            return;
        }
        
        if (typeof productWarehouseStock === 'undefined' || !productWarehouseStock || typeof productWarehouseStock !== 'object') {
            window.productWarehouseStock = {};
        }
        
        let html = '';
        warehouses.slice(0, 4).forEach(function(w) {
            if (!w || !w.id) return;
            
            let productCount = 0;
            let totalQty = 0;
            
            try {
                Object.keys(productWarehouseStock).forEach(function(pid) {
                    if (pid === 'null' || pid === 'undefined' || !pid) return;
                    
                    const stock = productWarehouseStock[pid];
                    if (!stock || typeof stock !== 'object') return;
                    
                    const qty = stock[w.id];
                    if (qty && qty > 0) {
                        productCount++;
                        totalQty += qty;
                    }
                });
            } catch (e) {
                console.warn('⚠️ خطأ في حساب المخزون:', e.message);
                productCount = 0;
                totalQty = 0;
            }
            
            html += '<div class="dashboard-card" style="border-right-color:#4A8AB5;cursor:pointer;" onclick="navigateTo(\'warehouses\')">' +
                '<div class="number" style="color:#4A8AB5;font-size:16px;">' + (w.name || 'بدون اسم') + (w.isDefault ? ' ⭐' : '') + '</div>' +
                '<div class="label" style="font-size:10px;">' +
                '📦 ' + productCount + ' صنف<br>' +
                '📊 ' + totalQty + ' وحدة' +
                '</div>' +
                '</div>';
        });
        
        if (html === '') {
            html = '<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-warehouse"></i><span>لا توجد بيانات</span></div>';
        }
        
        grid.innerHTML = html;
        console.log('✅ تم عرض إحصائيات ' + warehouses.length + ' مخزن');
    } catch (e) {
        console.warn('⚠️ خطأ في renderWarehouseStatsOnDashboard:', e.message);
        const grid = document.getElementById('warehouseStatsGrid');
        if (grid) {
            grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-exclamation-triangle"></i><span>خطأ في التحميل</span></div>';
        }
    }
};

// ═══════════════════════════════════════════════════════════
// ✅ 3. تحسينات على الفواتير
// ═══════════════════════════════════════════════════════════

window.enhanceCashierWithWarehouse = function() { return true; };
window.enhancePurchaseWithWarehouse = function() { return true; };
window.enhanceReturnWithWarehouse = function() { return true; };

// ═══════════════════════════════════════════════════════════
// ✅ 4. التهيئة
// ═══════════════════════════════════════════════════════════

window.initIntegration = function() {
    try {
        console.log('🔗 بدء ربط المخازن بالنظام...');
        
        if (typeof warehouses === 'undefined' || !Array.isArray(warehouses) || warehouses.length === 0) {
            window.warehouses = [{
                id: 1,
                name: 'المخزن الرئيسي',
                location: 'المركز الرئيسي',
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
        
        if (typeof products === 'undefined' || !Array.isArray(products)) {
            window.products = [];
        }
        
        if (typeof productWarehouseStock === 'undefined' || !productWarehouseStock) {
            window.productWarehouseStock = {};
        }
        
        renderWarehouseStatsOnDashboard();
        
        console.log('✅ تم ربط المخازن بالنظام بنجاح');
    } catch (e) {
        console.warn('⚠️ خطأ في initIntegration:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة التلقائية
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        try {
            if (typeof initIntegration === 'function') {
                initIntegration();
            }
        } catch (e) {
            console.warn('⚠️ خطأ في التهيئة:', e.message);
        }
    }, 3000);
    
    // ✅ استدعاء إحصائيات المخازن عند التحميل الأولي
    setTimeout(function() {
        if (typeof renderWarehouseStatsOnDashboard === 'function') {
            try { renderWarehouseStatsOnDashboard(); } catch(e) {}
        }
    }, 4000);
});

// ═══════════════════════════════════════════════════════════
// 🚀 التنقل الآمن (مع استدعاء إحصائيات المخازن)
// ═══════════════════════════════════════════════════════════

(function() {
    let _navOriginal = window.navigateTo;
    
    window.navigateTo = function(page) {
        // 1. استدعاء الدالة الأصلية
        if (_navOriginal) {
            try {
                _navOriginal.apply(this, arguments);
            } catch (e) {
                // تجاهل الأخطاء غير الحرجة
            }
        }
        
        // 2. تنفيذ المهام الإضافية بعد التنقل
        setTimeout(function() {
            try {
                // ✅ dashboard - إحصائيات المخازن
                if (page === 'dashboard') {
                    if (typeof renderWarehouseStatsOnDashboard === 'function') {
                        try { renderWarehouseStatsOnDashboard(); } catch(e) { console.warn('⚠️ خطأ:', e.message); }
                    }
                }
                
                // ✅ cashier
                if (page === 'cashier') {
                    if (typeof populateSaleProducts === 'function') { try { populateSaleProducts(); } catch(e) {} }
                    if (typeof populateSaleCustomers === 'function') { try { populateSaleCustomers(); } catch(e) {} }
                    if (typeof populateSaleWarehouse === 'function') { try { populateSaleWarehouse(); } catch(e) {} }
                    if (typeof renderCashier === 'function') { try { renderCashier(); } catch(e) {} }
                    if (typeof populateCashBoxDropdowns === 'function') { try { populateCashBoxDropdowns(); } catch(e) {} }
                    if (typeof _applyAllSearch === 'function') { try { _applyAllSearch(); } catch(e) {} }
                }
                
                // ✅ inventory
                if (page === 'inventory') {
                    if (typeof renderProducts === 'function') { try { renderProducts(); } catch(e) {} }
                    if (typeof populateProductWarehouse === 'function') { try { populateProductWarehouse(); } catch(e) {} }
                }
                
                // ✅ purchases
                if (page === 'purchases') {
                    if (typeof populatePurWarehouse === 'function') { try { populatePurWarehouse(); } catch(e) {} }
                    if (typeof populatePurProducts === 'function') { try { populatePurProducts(); } catch(e) {} }
                    if (typeof populatePurSuppliers === 'function') { try { populatePurSuppliers(); } catch(e) {} }
                }
                
                // ✅ returns
                if (page === 'returns') {
                    if (typeof populateRetWarehouse === 'function') { try { populateRetWarehouse(); } catch(e) {} }
                    if (typeof populateRetProducts === 'function') { try { populateRetProducts(); } catch(e) {} }
                }
                
                // ✅ warehouses
                if (page === 'warehouses') {
                    if (typeof renderWarehouses === 'function') { try { renderWarehouses(); } catch(e) {} }
                }
                
                // ✅ cash-boxes
                if (page === 'cash-boxes') {
                    if (typeof renderCashBoxes === 'function') { try { renderCashBoxes(); } catch(e) {} }
                    if (typeof renderCashBoxTransfers === 'function') { try { renderCashBoxTransfers(); } catch(e) {} }
                }
            } catch (e) {
                // تجاهل
            }
        }, 600);
    };
})();

console.log('✅ تم تحميل app-integration.js بنجاح (مع إحصائيات المخازن)');
