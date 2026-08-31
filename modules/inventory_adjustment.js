// ================================================================
// inventory_adjustment.js - تسوية المخزون (الملف الكامل)
// ================================================================

// ===== متغيرات =====
let inventoryAdjustmentItems = [];

// ================================================================
// UPDATE DATE & TIME - تحديث التاريخ والوقت (مع حماية)
// ================================================================
function updateAdjustmentDateTime() {
    const dt = getCurrentDateTime();
    const dateEl = document.getElementById('adjustmentDateDisplay');
    const timeEl = document.getElementById('adjustmentTimeDisplay');

    // ✅ التحقق من وجود العناصر قبل التعديل
    if (dateEl) {
        dateEl.textContent = dt.date;
    } else {
        console.warn('⚠️ عنصر adjustmentDateDisplay غير موجود');
    }

    if (timeEl) {
        timeEl.textContent = dt.time;
    } else {
        console.warn('⚠️ عنصر adjustmentTimeDisplay غير موجود');
    }
}

// تشغيل التحديث كل ثانية
setInterval(updateAdjustmentDateTime, 1000);
updateAdjustmentDateTime();

// ================================================================
// POPULATE ADJUSTMENT PRODUCTS - تعبئة قائمة المنتجات
// ================================================================
function populateAdjustmentProducts() {
    const select = document.getElementById('adjustmentProduct');
    if (!select) {
        console.warn('⚠️ عنصر adjustmentProduct غير موجود');
        return;
    }

    select.innerHTML = '<option value="">اختر منتج...</option>';
    if (!window.products || window.products.length === 0) {
        return;
    }

    const sorted = [...window.products].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(p => {
        const totalQty = window.warehouseProducts?.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) || 0;
        select.innerHTML += `<option value="${p.id}">${p.name} (${totalQty})</option>`;
    });
}

// ================================================================
// ADD ADJUSTMENT ITEM - إضافة صنف للتسوية
// ================================================================
function addAdjustmentItem() {
    const productId = parseInt(document.getElementById('adjustmentProduct')?.value);
    const actualQty = parseInt(document.getElementById('adjustmentActualQty')?.value);

    if (!productId) {
        showToast('⚠️ اختر منتج', 'error');
        return;
    }
    if (isNaN(actualQty) || actualQty < 0) {
        showToast('⚠️ أدخل كمية فعلية صحيحة', 'error');
        return;
    }

    const product = window.products?.find(p => p.id === productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }

    if (inventoryAdjustmentItems.find(item => item.productId === productId)) {
        showToast('⚠️ المنتج موجود بالفعل', 'warning');
        return;
    }

    const currentQty = window.warehouseProducts?.filter(wp => wp.productId === productId).reduce((s, wp) => s + wp.qty, 0) || 0;
    const diff = actualQty - currentQty;

    inventoryAdjustmentItems.push({
        productId: productId,
        productName: product.name,
        currentQty: currentQty,
        actualQty: actualQty,
        diff: diff,
        status: diff === 0 ? 'متطابق' : diff > 0 ? 'زائد' : 'ناقص'
    });

    renderAdjustmentItems();
    document.getElementById('adjustmentProduct').value = '';
    document.getElementById('adjustmentActualQty').value = '';
    populateAdjustmentProducts();
    showToast('✅ تم إضافة الصنف', 'success');
}

// ================================================================
// RENDER ADJUSTMENT ITEMS - عرض الأصناف
// ================================================================
function renderAdjustmentItems() {
    const container = document.getElementById('adjustmentItemsList');
    if (!container) {
        console.warn('⚠️ عنصر adjustmentItemsList غير موجود');
        return;
    }

    if (inventoryAdjustmentItems.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-boxes"></i><span>لا توجد أصناف</span></div>`;
        return;
    }

    let html = '';
    let totalDiff = 0;

    inventoryAdjustmentItems.forEach((item, index) => {
        totalDiff += item.diff;
        const color = item.diff === 0 ? '#A89070' : item.diff > 0 ? '#2D8F5E' : '#E06060';
        const sign = item.diff > 0 ? '+' : '';
        html += `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 0.6fr;gap:4px;padding:6px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                <span><strong>${item.productName}</strong></span>
                <span style="font-weight:700;">${item.currentQty}</span>
                <span style="color:#C9A94E;font-weight:700;">${item.actualQty}</span>
                <span style="color:${color};font-weight:700;">${sign}${item.diff}</span>
                <button class="btn btn-danger btn-sm" onclick="removeAdjustmentItem(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    });

    html += `
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 0.6fr;gap:4px;padding:8px 0;border-top:2px solid #C9A94E;font-weight:800;color:#C9A94E;font-size:13px;">
            <span>الإجمالي</span>
            <span>${inventoryAdjustmentItems.reduce((s, i) => s + i.currentQty, 0)}</span>
            <span>${inventoryAdjustmentItems.reduce((s, i) => s + i.actualQty, 0)}</span>
            <span style="color:${totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060'};">${totalDiff > 0 ? '+' : ''}${totalDiff}</span>
            <span>${inventoryAdjustmentItems.length}</span>
        </div>
    `;

    container.innerHTML = html;
}

// ================================================================
// REMOVE ADJUSTMENT ITEM - حذف صنف
// ================================================================
function removeAdjustmentItem(index) {
    if (!confirm('⚠️ حذف الصنف؟')) return;
    inventoryAdjustmentItems.splice(index, 1);
    renderAdjustmentItems();
    populateAdjustmentProducts();
}

// ================================================================
// CLEAR ADJUSTMENT ITEMS - مسح جميع الأصناف
// ================================================================
function clearAdjustmentItems() {
    if (!confirm('⚠️ مسح جميع الأصناف؟')) return;
    inventoryAdjustmentItems = [];
    renderAdjustmentItems();
    populateAdjustmentProducts();
    showToast('🗑️ تم المسح', 'info');
}

// ================================================================
// SAVE INVENTORY ADJUSTMENT - حفظ التسوية
// ================================================================
function saveInventoryAdjustment() {
    if (inventoryAdjustmentItems.length === 0) {
        showToast('⚠️ أضف صنف واحد على الأقل', 'error');
        return;
    }
    if (!confirm('✅ هل أنت متأكد من حفظ التسوية؟ سيتم تعديل المخزون تلقائياً')) return;

    const dt = getCurrentDateTime();
    const adjustment = {
        id: Date.now(),
        date: dt.date,
        time: dt.time,
        items: [...inventoryAdjustmentItems],
        totalItems: inventoryAdjustmentItems.length,
        totalDiff: inventoryAdjustmentItems.reduce((s, i) => s + i.diff, 0),
        createdAt: new Date().toISOString()
    };

    for (const item of inventoryAdjustmentItems) {
        if (item.diff === 0) continue;
        const wp = window.warehouseProducts?.find(w => w.productId === item.productId);
        if (wp) {
            wp.qty = item.actualQty;
        } else {
            const mainWarehouse = window.warehouses?.find(w => w.type === 'رئيسي');
            if (mainWarehouse) {
                window.warehouseProducts.push({
                    warehouseId: mainWarehouse.id,
                    productId: item.productId,
                    qty: item.actualQty
                });
            }
        }
    }

    const adjustments = JSON.parse(localStorage.getItem('mizan_inventoryAdjustments') || '[]');
    adjustments.unshift(adjustment);
    localStorage.setItem('mizan_inventoryAdjustments', JSON.stringify(adjustments));

    inventoryAdjustmentItems = [];
    renderAdjustmentItems();
    populateAdjustmentProducts();
    renderAdjustmentHistory();
    renderProducts();
    saveAll();

    addAuditLog('add', 'adjustment', `تسوية مخزون - ${adjustment.totalItems} صنف - الفرق: ${adjustment.totalDiff}`);
    showToast(`✅ تم حفظ التسوية - ${adjustment.totalItems} صنف`, 'success');
}

// ================================================================
// RENDER ADJUSTMENT HISTORY - عرض سجل التسويات
// ================================================================
function renderAdjustmentHistory() {
    const container = document.getElementById('adjustmentHistory');
    if (!container) {
        console.warn('⚠️ عنصر adjustmentHistory غير موجود');
        return;
    }

    const adjustments = JSON.parse(localStorage.getItem('mizan_inventoryAdjustments') || '[]');
    if (adjustments.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد تسويات سابقة</span></div>`;
        return;
    }

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 1fr 1fr 0.8fr 0.6fr;">
        <span>التاريخ</span><span>الوقت</span><span>الأصناف</span><span>الفرق</span><span>الحالة</span><span></span>
    </div>`;

    adjustments.slice(0, 20).forEach(adj => {
        const totalDiff = adj.items?.reduce((s, i) => s + (i.diff || 0), 0) || 0;
        const statusColor = totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060';
        const statusText = totalDiff === 0 ? 'متطابق' : totalDiff > 0 ? 'زائد' : 'ناقص';
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 1fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span>${adj.date}</span>
                <span>${adj.time || '-'}</span>
                <span>${adj.items?.length || 0}</span>
                <span style="color:${statusColor};font-weight:700;">${totalDiff > 0 ? '+' : ''}${totalDiff}</span>
                <span><span class="status-badge" style="background:${statusColor};color:#fff;">${statusText}</span></span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewAdjustmentDetails('${adj.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAdjustment('${adj.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// VIEW ADJUSTMENT DETAILS - عرض تفاصيل التسوية
// ================================================================
function viewAdjustmentDetails(id) {
    const adjustments = JSON.parse(localStorage.getItem('mizan_inventoryAdjustments') || '[]');
    const adj = adjustments.find(a => a.id == id);
    if (!adj) {
        showToast('⚠️ التسوية غير موجودة', 'error');
        return;
    }

    let itemsHtml = `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4px;font-weight:800;color:#C9A94E;padding:4px 0;border-bottom:2px solid #C9A94E;font-size:11px;">
        <span>المنتج</span><span>الحالية</span><span>الفعلية</span><span>الفرق</span>
    </div>`;

    adj.items.forEach(item => {
        const color = item.diff === 0 ? '#A89070' : item.diff > 0 ? '#2D8F5E' : '#E06060';
        const sign = item.diff > 0 ? '+' : '';
        itemsHtml += `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                <span>${item.productName}</span>
                <span style="font-weight:700;">${item.currentQty}</span>
                <span style="color:#C9A94E;font-weight:700;">${item.actualQty}</span>
                <span style="color:${color};font-weight:700;">${sign}${item.diff}</span>
            </div>
        `;
    });

    const totalDiff = adj.items?.reduce((s, i) => s + (i.diff || 0), 0) || 0;

    const html = `
        <div style="text-align:center;margin-bottom:8px;">
            <h4 style="color:#C9A94E;">📋 تفاصيل التسوية</h4>
            <div style="font-size:12px;color:#A89070;">📅 ${adj.date}  🕐 ${adj.time || '-'}</div>
            <div style="font-size:12px;color:#A89070;">📦 ${adj.items?.length || 0} صنف | الفرق: <span style="color:${totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${totalDiff > 0 ? '+' : ''}${totalDiff}</span></div>
        </div>
        ${itemsHtml}
        <div style="margin-top:8px;display:flex;gap:6px;">
            <button class="btn btn-primary btn-block" onclick="printAdjustmentDetails('${adj.id}')"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>
    `;

    openModal('📋 تفاصيل التسوية', html);
}

// ================================================================
// DELETE ADJUSTMENT - حذف التسوية
// ================================================================
function deleteAdjustment(id) {
    if (!confirm('⚠️ حذف التسوية؟ سيتم إلغاء التعديلات على المخزون')) return;
    
    const adjustments = JSON.parse(localStorage.getItem('mizan_inventoryAdjustments') || '[]');
    const adj = adjustments.find(a => a.id == id);
    if (!adj) {
        showToast('⚠️ التسوية غير موجودة', 'error');
        return;
    }

    for (const item of adj.items) {
        if (item.diff === 0) continue;
        const wp = window.warehouseProducts?.find(w => w.productId === item.productId);
        if (wp) {
            wp.qty = item.currentQty;
        }
    }

    const newAdjustments = adjustments.filter(a => a.id != id);
    localStorage.setItem('mizan_inventoryAdjustments', JSON.stringify(newAdjustments));
    renderAdjustmentHistory();
    renderProducts();
    saveAll();
    showToast('🗑️ تم حذف التسوية', 'info');
}

// ================================================================
// PRINT INVENTORY ADJUSTMENT - طباعة التسوية
// ================================================================
function printInventoryAdjustment() {
    if (inventoryAdjustmentItems.length === 0) {
        showToast('⚠️ لا توجد أصناف للطباعة', 'error');
        return;
    }

    const dt = getCurrentDateTime();
    const company = window.companyData || {};
    const totalDiff = inventoryAdjustmentItems.reduce((s, i) => s + i.diff, 0);

    let html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${company.name || 'الميزان'}</h2>
                <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                <div class="contact-info">📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'} | 📱 ${company.mobile || '01000000000'}</div>
            </div>
            <div class="invoice-info">
                <div class="info-item"><span class="label">📋 تسوية مخزون</span></div>
                <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${dt.date}</span></div>
                <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${dt.time}</span></div>
            </div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المنتج</th>
                        <th>الحالية</th>
                        <th>الفعلية</th>
                        <th>الفرق</th>
                    </tr>
                </thead>
                <tbody>
                    ${inventoryAdjustmentItems.map((item, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${item.productName}</td>
                            <td>${item.currentQty}</td>
                            <td>${item.actualQty}</td>
                            <td style="color:${item.diff === 0 ? '#A89070' : item.diff > 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${item.diff > 0 ? '+' : ''}${item.diff}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total-box">
                <div>📦 عدد الأصناف: <span class="total-amount">${inventoryAdjustmentItems.length}</span></div>
                <div>📊 صافي الفرق: <span class="total-amount" style="color:${totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060'};">${totalDiff > 0 ? '+' : ''}${totalDiff}</span></div>
            </div>
            <div class="footer-box">
                <div class="thanks">خالص مع الشكر</div>
                <div style="margin-top:4px;font-size:9px;color:#5D5D5D;">تم الطباعة في ${new Date().toLocaleString('ar')}</div>
            </div>
        </div>
    `;

    const win = window.open('', '_blank', 'width=400,height=650');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة', 'error');
    }
}

// ================================================================
// PRINT ADJUSTMENT DETAILS - طباعة تفاصيل التسوية
// ================================================================
function printAdjustmentDetails(id) {
    const adjustments = JSON.parse(localStorage.getItem('mizan_inventoryAdjustments') || '[]');
    const adj = adjustments.find(a => a.id == id);
    if (!adj) {
        showToast('⚠️ التسوية غير موجودة', 'error');
        return;
    }

    const company = window.companyData || {};
    const totalDiff = adj.items?.reduce((s, i) => s + (i.diff || 0), 0) || 0;

    let html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${company.name || 'الميزان'}</h2>
                <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                <div class="contact-info">📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'} | 📱 ${company.mobile || '01000000000'}</div>
            </div>
            <div class="invoice-info">
                <div class="info-item"><span class="label">📋 تسوية مخزون</span></div>
                <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${adj.date}</span></div>
                <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${adj.time || '-'}</span></div>
            </div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المنتج</th>
                        <th>الحالية</th>
                        <th>الفعلية</th>
                        <th>الفرق</th>
                    </tr>
                </thead>
                <tbody>
                    ${adj.items.map((item, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${item.productName}</td>
                            <td>${item.currentQty}</td>
                            <td>${item.actualQty}</td>
                            <td style="color:${item.diff === 0 ? '#A89070' : item.diff > 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${item.diff > 0 ? '+' : ''}${item.diff}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total-box">
                <div>📦 عدد الأصناف: <span class="total-amount">${adj.items.length}</span></div>
                <div>📊 صافي الفرق: <span class="total-amount" style="color:${totalDiff === 0 ? '#A89070' : totalDiff > 0 ? '#2D8F5E' : '#E06060'};">${totalDiff > 0 ? '+' : ''}${totalDiff}</span></div>
            </div>
            <div class="footer-box">
                <div class="thanks">خالص مع الشكر</div>
                <div style="margin-top:4px;font-size:9px;color:#5D5D5D;">تم الطباعة في ${new Date().toLocaleString('ar')}</div>
            </div>
        </div>
    `;

    const win = window.open('', '_blank', 'width=400,height=650');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة', 'error');
    }
}
