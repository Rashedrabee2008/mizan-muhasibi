// ============================================================
// الميزان 14.0.0 - ربط المخازن بكل النظام
// app-integration.js
// ============================================================
// 
// يربط:
// - الكاشير بمخزن معين
// - الشراء بمخزن معين
// - المرتجعات بالمخزن الأصلي
// - التقارير بالمخازن
// - لوحة التحكم بإحصائيات المخازن
// - الحسابات بالمخازن
// ============================================================

console.log('🔗 تحميل app-integration.js - ربط المخازن بالنظام');

// ═══════════════════════════════════════════════════════════
// 🔧 دوال مساعدة
// ═══════════════════════════════════════════════════════════

// الحصول على المخزن الافتراضي
window.getDefaultWarehouse = function() {
    return warehouses.find(w => w.isDefault) || warehouses[0];
};

// الحصول على اسم المخزن
window.getWarehouseName = function(id) {
    const w = warehouses.find(wh => wh.id == id);
    return w ? w.name : 'غير محدد';
};

// ═══════════════════════════════════════════════════════════
// 1️⃣ ربط الكاشير بالمخازن
// ═══════════════════════════════════════════════════════════

// ✅ إضافة حقل اختيار المخزن في الكاشير
window.enhanceCashierWithWarehouse = function() {
    const formCard = document.querySelector('#page-cashier .form-card');
    if (!formCard) return;
    if (formCard.querySelector('#saleWarehouse')) return; // موجود بالفعل
    
    // إضافة حقل المخزن قبل "العميل"
    const customerGroup = formCard.querySelector('#saleCustomer')?.closest('.form-group');
    if (!customerGroup) return;
    
    const warehouseGroup = document.createElement('div');
    warehouseGroup.className = 'form-group';
    warehouseGroup.innerHTML = `
        <label>🏪 المخزن</label>
        <select id="saleWarehouse" style="width:100%;font-size:13px;padding:10px;border-radius:8px;border:2px solid #3D3D3D;background:#1C1C1C;color:#F5E6C8;">
            <option value="">اختر المخزن...</option>
        </select>
    `;
    customerGroup.parentNode.insertBefore(warehouseGroup, customerGroup);
    
    // تعبئة القائمة
    populateSaleWarehouse();
};

window.populateSaleWarehouse = function() {
    const sel = $('saleWarehouse');
    if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر المخزن...</option>';
    warehouses.forEach(w => {
        sel.innerHTML += `<option value="${w.id}" ${w.isDefault ? 'selected' : ''}>${w.name}${w.isDefault ? ' ⭐' : ''}</option>`;
    });
    sel.value = cv || (getDefaultWarehouse()?.id || '');
};

// ✅ تعبئة منتجات الكاشير حسب المخزن
window.populateSaleProductsByWarehouse = function() {
    const warehouseId = $('saleWarehouse')?.value;
    const sel = $('saleProduct');
    if (!sel) return;
    
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    
    if (!warehouseId) {
        sel.innerHTML = '<option value="">اختر المخزن أولاً</option>';
        return;
    }
    
    products.forEach(p => {
        const qtyInWarehouse = getProductStockInWarehouse(p.id, warehouseId);
        if (qtyInWarehouse > 0 || products.length < 50) {
            sel.innerHTML += `<option value="${p.id}">${p.name} (متاح: ${qtyInWarehouse})</option>`;
        }
    });
    sel.value = cv;
};

// ✅ التحقق من المخزون قبل البيع
window.checkSaleItemWarehouse = function() {
    const warehouseId = $('saleWarehouse')?.value;
    const productId = $('saleProduct')?.value;
    const qty = parseInt($('saleQty')?.value) || 0;
    
    if (!warehouseId) {
        showToast('⚠️ اختر المخزن أولاً', 'error');
        return false;
    }
    
    if (!productId) return false;
    
    const availableQty = getProductStockInWarehouse(productId, warehouseId);
    if (qty > availableQty) {
        showToast(`⚠️ الكمية المتاحة في المخزن: ${availableQty}`, 'error');
        return false;
    }
    
    return true;
};

// ═══════════════════════════════════════════════════════════
// 2️⃣ ربط الشراء بالمخازن
// ═══════════════════════════════════════════════════════════

window.enhancePurchaseWithWarehouse = function() {
    const formCard = document.querySelector('#page-purchases .form-card');
    if (!formCard) return;
    if (formCard.querySelector('#purWarehouse')) return;
    
    const supplierGroup = formCard.querySelector('#purSupplier')?.closest('.form-group');
    if (!supplierGroup) return;
    
    const warehouseGroup = document.createElement('div');
    warehouseGroup.className = 'form-group';
    warehouseGroup.innerHTML = `
        <label>🏪 المخزن</label>
        <select id="purWarehouse" style="width:100%;font-size:13px;padding:10px;border-radius:8px;border:2px solid #3D3D3D;background:#1C1C1C;color:#F5E6C8;">
            <option value="">اختر المخزن...</option>
        </select>
    `;
    supplierGroup.parentNode.insertBefore(warehouseGroup, supplierGroup);
    
    populatePurWarehouse();
};

window.populatePurWarehouse = function() {
    const sel = $('purWarehouse');
    if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر المخزن...</option>';
    warehouses.forEach(w => {
        sel.innerHTML += `<option value="${w.id}" ${w.isDefault ? 'selected' : ''}>${w.name}${w.isDefault ? ' ⭐' : ''}</option>`;
    });
    sel.value = cv || (getDefaultWarehouse()?.id || '');
};

// ═══════════════════════════════════════════════════════════
// 3️⃣ ربط المرتجعات بالمخازن
// ═══════════════════════════════════════════════════════════

window.enhanceReturnWithWarehouse = function() {
    const formCard = document.querySelector('#page-returns .form-card');
    if (!formCard) return;
    if (formCard.querySelector('#retWarehouse')) return;
    
    const partyGroup = formCard.querySelector('#retParty')?.closest('.form-group');
    if (!partyGroup) return;
    
    const warehouseGroup = document.createElement('div');
    warehouseGroup.className = 'form-group';
    warehouseGroup.innerHTML = `
        <label>🏪 المخزن</label>
        <select id="retWarehouse" style="width:100%;font-size:13px;padding:10px;border-radius:8px;border:2px solid #3D3D3D;background:#1C1C1C;color:#F5E6C8;">
            <option value="">اختر المخزن...</option>
        </select>
    `;
    partyGroup.parentNode.insertBefore(warehouseGroup, partyGroup);
    
    populateRetWarehouse();
};

window.populateRetWarehouse = function() {
    const sel = $('retWarehouse');
    if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر المخزن...</option>';
    warehouses.forEach(w => {
        sel.innerHTML += `<option value="${w.id}" ${w.isDefault ? 'selected' : ''}>${w.name}${w.isDefault ? ' ⭐' : ''}</option>`;
    });
    sel.value = cv || (getDefaultWarehouse()?.id || '');
};

// ═══════════════════════════════════════════════════════════
// 4️⃣ تعديل دوال الحفظ لاستخدام المخازن
// ═══════════════════════════════════════════════════════════

// ✅ تعديل saveSale لخصم من المخزن المحدد
const _originalSaveSale = window.saveSale;
window.saveSale = function() {
    // التحقق من المخزن
    const warehouseId = $('saleWarehouse')?.value;
    if (!warehouseId) {
        showToast('⚠️ اختر المخزن', 'error');
        return;
    }
    
    // التحقق من كل صنف
    for (const it of currentSaleItems) {
        const availableQty = getProductStockInWarehouse(it.productId, warehouseId);
        if (availableQty < it.qty) {
            showToast(`⚠️ الكمية غير كافية في المخزن: ${it.name} (متاح: ${availableQty})`, 'error');
            return;
        }
    }
    
    // حفظ رقم المخزن
    window._currentSaleWarehouseId = warehouseId;
    
    // استدعاء الدالة الأصلية
    if (_originalSaveSale) _originalSaveSale();
};

// ✅ تعديل savePurchase لإضافة للمخزن المحدد
const _originalSavePurchase = window.savePurchase;
window.savePurchase = function() {
    const warehouseId = $('purWarehouse')?.value;
    if (!warehouseId) {
        showToast('⚠️ اختر المخزن', 'error');
        return;
    }
    
    window._currentPurchaseWarehouseId = warehouseId;
    
    if (_originalSavePurchase) _originalSavePurchase();
};

// ✅ تعديل saveReturn لإرجاع للمخزن المحدد
const _originalSaveReturn = window.saveReturn;
window.saveReturn = function() {
    const warehouseId = $('retWarehouse')?.value;
    if (!warehouseId) {
        showToast('⚠️ اختر المخزن', 'error');
        return;
    }
    
    window._currentReturnWarehouseId = warehouseId;
    
    if (_originalSaveReturn) _originalSaveReturn();
};

// ═══════════════════════════════════════════════════════════
// 5️⃣ تحديث حفظ الفاتورة لتسجيل المخزن
// ═══════════════════════════════════════════════════════════

// اعتراض دالة logInventoryMovement لتسجيل المخزن
const _originalLogInventoryMovement = window.logInventoryMovement;
window.logInventoryMovement = function(data) {
    // إضافة warehouseId لو موجود
    if (!data.warehouseId) {
        if (data.refType === 'sale' && window._currentSaleWarehouseId) {
            data.warehouseId = window._currentSaleWarehouseId;
        } else if (data.refType === 'purchase' && window._currentPurchaseWarehouseId) {
            data.warehouseId = window._currentPurchaseWarehouseId;
        } else if (data.refType === 'return' && window._currentReturnWarehouseId) {
            data.warehouseId = window._currentReturnWarehouseId;
        } else {
            data.warehouseId = getDefaultWarehouse()?.id || null;
        }
    }
    
    // استدعاء الدالة الأصلية
    if (_originalLogInventoryMovement) return _originalLogInventoryMovement(data);
};

// ═══════════════════════════════════════════════════════════
// 6️⃣ تحديث لوحة التحكم بإحصائيات المخازن
// ═══════════════════════════════════════════════════════════

window.addWarehouseStatsToDashboard = function() {
    const dashboard = document.querySelector('#page-dashboard .page-content');
    if (!dashboard) return;
    if (dashboard.querySelector('#warehouseStatsSection')) return;
    
    // إضافة قسم إحصائيات المخازن قبل "آخر المبيعات"
    const lastSalesH2 = dashboard.querySelector('h2:last-of-type');
    
    const statsSection = document.createElement('div');
    statsSection.id = 'warehouseStatsSection';
    statsSection.innerHTML = `
        <h2 style="margin-top:20px;"><i class="fas fa-warehouse"></i> إحصائيات المخازن</h2>
        <div id="warehouseStatsGrid" class="dashboard-stats"></div>
    `;
    
    if (lastSalesH2) {
        lastSalesH2.parentNode.insertBefore(statsSection, lastSalesH2);
    } else {
        dashboard.appendChild(statsSection);
    }
    
    renderWarehouseStatsOnDashboard();
};

window.renderWarehouseStatsOnDashboard = function() {
    const grid = $('warehouseStatsGrid');
    if (!grid) return;
    
    if (warehouses.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>`;
        return;
    }
    
    let html = '';
    warehouses.slice(0, 4).forEach(w => {
        const productCount = Object.keys(productWarehouseStock).filter(pid => 
            (productWarehouseStock[pid][w.id] || 0) > 0
        ).length;
        const totalQty = Object.keys(productWarehouseStock).reduce((sum, pid) => 
            sum + (productWarehouseStock[pid][w.id] || 0), 0
        );
        
        html += `
            <div class="dashboard-card" style="border-right-color:#4A8AB5;cursor:pointer;" onclick="navigateTo('warehouses')">
                <div class="number" style="color:#4A8AB5;font-size:16px;">${w.name}${w.isDefault ? ' ⭐' : ''}</div>
                <div class="label" style="font-size:10px;">
                    ${ICONS_WH?.box || '📦'} ${productCount} صنف
                    <br>
                    ${ICONS_WH?.chart || '📊'} ${totalQty} وحدة
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
};

// أيقونات للمخازن
const ICONS_WH = { box: '📦', chart: '📊' };

// ═══════════════════════════════════════════════════════════
// 7️⃣ فلترة التقارير حسب المخزن
// ═══════════════════════════════════════════════════════════

window.addWarehouseFilterToReports = function() {
    const reportTabs = document.querySelector('#page-reports .report-tabs');
    if (!reportTabs) return;
    if (reportTabs.parentNode.querySelector('#reportWarehouseFilter')) return;
    
    const filterDiv = document.createElement('div');
    filterDiv.id = 'reportWarehouseFilter';
    filterDiv.style.cssText = 'margin-bottom:14px;';
    filterDiv.innerHTML = `
        <select id="reportWarehouse" onchange="renderReport(currentReport)" style="width:100%;font-size:13px;padding:10px;border-radius:10px;border:2px solid #3D3D3D;background:#0D0D0D;color:#F5E6C8;">
            <option value="">🏪 كل المخازن</option>
        </select>
    `;
    reportTabs.parentNode.insertBefore(filterDiv, reportTabs.nextSibling);
    
    populateReportWarehouseFilter();
};

window.populateReportWarehouseFilter = function() {
    const sel = $('reportWarehouse');
    if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">🏪 كل المخازن</option>';
    warehouses.forEach(w => {
        sel.innerHTML += `<option value="${w.id}">${w.name}</option>`;
    });
    sel.value = cv;
};

// ✅ فلترة الفواتير حسب المخزن في التقارير
window.filterSalesByWarehouse = function(salesList, warehouseId) {
    if (!warehouseId) return salesList;
    return salesList.filter(s => s.warehouseId == warehouseId);
};

// ═══════════════════════════════════════════════════════════
// 8️⃣ ربط الحسابات بالمخازن
// ═══════════════════════════════════════════════════════════

// ✅ إضافة فلتر المخزن في دفتر اليومية
window.addWarehouseFilterToJournal = function() {
    const journalTab = document.querySelector('#accTabJournal');
    if (!journalTab) return;
    if (journalTab.querySelector('#journalWarehouseFilter')) return;
    
    const searchBox = journalTab.querySelector('.search-box');
    if (!searchBox) return;
    
    const filterDiv = document.createElement('div');
    filterDiv.style.cssText = 'margin-bottom:12px;';
    filterDiv.innerHTML = `
        <select id="journalWarehouseFilter" onchange="renderJournal()" style="width:100%;font-size:13px;padding:10px;border-radius:10px;border:2px solid #3D3D3D;background:#0D0D0D;color:#F5E6C8;">
            <option value="">🏪 كل المخازن</option>
        </select>
    `;
    searchBox.parentNode.insertBefore(filterDiv, searchBox);
    
    populateJournalWarehouseFilter();
};

window.populateJournalWarehouseFilter = function() {
    const sel = $('journalWarehouseFilter');
    if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">🏪 كل المخازن</option>';
    warehouses.forEach(w => {
        sel.innerHTML += `<option value="${w.id}">${w.name}</option>`;
    });
    sel.value = cv;
};

// ═══════════════════════════════════════════════════════════
// 9️⃣ تقرير المخزون حسب المخازن
// ═══════════════════════════════════════════════════════════

window.renderWarehouseInventoryReport = function() {
    const container = $('reportContent');
    if (!container) return;
    
    if (warehouses.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-warehouse"></i><span>لا توجد مخازن</span></div>`;
        return;
    }
    
    let totalValue = 0;
    let totalQty = 0;
    let totalItems = 0;
    
    warehouses.forEach(w => {
        Object.keys(productWarehouseStock).forEach(pid => {
            const qty = productWarehouseStock[pid][w.id] || 0;
            if (qty > 0) {
                const product = products.find(p => p.id == pid);
                if (product) {
                    totalValue += qty * product.buy;
                    totalQty += qty;
                    totalItems++;
                }
            }
        });
    });
    
    let html = `
        <h3 style="font-size:14px;color:#4A8AB5;margin-bottom:10px;">📦 تقرير المخزون حسب المخازن</h3>
        <div class="report-summary">
            <div class="report-stat">
                <div class="num" style="color:#4A8AB5;">${warehouses.length}</div>
                <div class="lbl">🏪 عدد المخازن</div>
            </div>
            <div class="report-stat">
                <div class="num" style="color:#2D8F5E;">${totalItems}</div>
                <div class="lbl">📦 عدد الأصناف</div>
            </div>
            <div class="report-stat">
                <div class="num" style="color:#C9A94E;">${totalQty}</div>
                <div class="lbl">📊 إجمالي الوحدات</div>
            </div>
            <div class="report-stat">
                <div class="num" style="color:#E6A830;">${formatMoney(totalValue)}</div>
                <div class="lbl">💰 قيمة المخزون</div>
            </div>
        </div>
    `;
    
    warehouses.forEach(w => {
        const whProducts = Object.keys(productWarehouseStock).filter(pid => 
            (productWarehouseStock[pid][w.id] || 0) > 0
        );
        
        const whValue = whProducts.reduce((sum, pid) => {
            const qty = productWarehouseStock[pid][w.id] || 0;
            const product = products.find(p => p.id == pid);
            return sum + (qty * (product?.buy || 0));
        }, 0);
        
        const whQty = whProducts.reduce((sum, pid) => 
            sum + (productWarehouseStock[pid][w.id] || 0), 0
        );
        
        html += `
            <div class="acc-type-header" style="border-right-color:#4A8AB5;color:#4A8AB5;margin-top:14px;">
                🏪 ${w.name}${w.isDefault ? ' ⭐' : ''} (${whProducts.length} صنف - ${whQty} وحدة - ${formatMoney(whValue)} ج.م)
            </div>
        `;
        
        if (whProducts.length === 0) {
            html += `<div class="empty-state" style="padding:15px;"><span>لا توجد أصناف</span></div>`;
        } else {
            html += `<div class="table-header" style="grid-template-columns:2fr 0.8fr 0.8fr 1fr;"><span>الصنف</span><span>الكمية</span><span>سعر الشراء</span><span>القيمة</span></div>`;
            whProducts.forEach(pid => {
                const qty = productWarehouseStock[pid][w.id] || 0;
                const product = products.find(p => p.id == pid);
                if (product) {
                    html += `
                        <div class="table-row" style="grid-template-columns:2fr 0.8fr 0.8fr 1fr;font-size:11px;">
                            <span>${product.name}</span>
                            <span style="color:#C9A94E;font-weight:700;">${qty}</span>
                            <span>${formatMoney(product.buy)}</span>
                            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(qty * product.buy)}</span>
                        </div>
                    `;
                }
            });
        }
    });
    
    container.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 🔟 إضافة زر تقرير المخازن في التقارير
// ═══════════════════════════════════════════════════════════

window.addWarehouseReportTab = function() {
    const reportTabs = document.querySelector('#page-reports .report-tabs');
    if (!reportTabs) return;
    if (reportTabs.querySelector('[data-report="warehouse"]')) return;
    
    const btn = document.createElement('button');
    btn.className = 'report-tab';
    btn.setAttribute('data-report', 'warehouse');
    btn.innerHTML = '🏪 المخازن';
    btn.onclick = function() { switchReport('warehouse', this); };
    reportTabs.appendChild(btn);
};

// تعديل switchReport لدعم تقرير المخازن
const _originalSwitchReport = window.switchReport;
window.switchReport = function(type, btn) {
    if (type === 'warehouse') {
        window.currentReport = type;
        document.querySelectorAll('.report-tab').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        renderWarehouseInventoryReport();
        return;
    }
    if (_originalSwitchReport) _originalSwitchReport(type, btn);
};

// ═══════════════════════════════════════════════════════════
// 1️⃣1️⃣ إحصائيات المخزن في الفاتورة
// ═══════════════════════════════════════════════════════════

window.showWarehouseInInvoice = function(inv) {
    if (!inv.warehouseId) return '';
    const wh = warehouses.find(w => w.id == inv.warehouseId);
    if (!wh) return '';
    return `<div class="inv-total-row"><span>🏪 المخزن:</span><span style="color:#4A8AB5;">${wh.name}</span></div>`;
};

// ═══════════════════════════════════════════════════════════
// 1️⃣2️⃣ التهيئة
// ═══════════════════════════════════════════════════════════

window.initIntegration = function() {
    console.log('🔗 بدء ربط المخازن بالنظام...');
    
    // 1. الكاشير
    enhanceCashierWithWarehouse();
    
    // 2. الشراء
    enhancePurchaseWithWarehouse();
    
    // 3. المرتجعات
    enhanceReturnWithWarehouse();
    
    // 4. لوحة التحكم
    addWarehouseStatsToDashboard();
    
    // 5. التقارير
    addWarehouseFilterToReports();
    addWarehouseReportTab();
    
    // 6. الحسابات
    addWarehouseFilterToJournal();
    
    // 7. الأحداث
    setTimeout(() => {
        const saleWarehouse = $('saleWarehouse');
        if (saleWarehouse) {
            saleWarehouse.addEventListener('change', () => {
                populateSaleProductsByWarehouse();
            });
        }
    }, 500);
    
    console.log('✅ تم ربط المخازن بالنظام بنجاح');
};

// استدعاء التهيئة
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof warehouses !== 'undefined' && warehouses.length > 0) {
            initIntegration();
        } else {
            // انتظر تحميل المخازن
            setTimeout(() => {
                if (typeof warehouses !== 'undefined' && warehouses.length > 0) {
                    initIntegration();
                }
            }, 2000);
        }
    }, 2500);
});

console.log('✅ تم تحميل app-integration.js بنجاح');
console.log('🔗 ربط المخازن جاهز');
