// ================================================================
// returns.js - إدارة المرتجعات
// ================================================================

let returnItems = [];
let returnTotal = 0;

// ================================================================
// INIT RETURNS
// ================================================================
function initReturns() {
    if (!window.returns || !Array.isArray(window.returns)) {
        window.returns = [];
        setData('returns', window.returns);
    }
}

// ================================================================
// POPULATE RETURNS DROPDOWNS
// ================================================================
function populateReturnsDropdowns() {
    const customerSelect = document.getElementById('returnCustomerSelect');
    if (customerSelect) {
        customerSelect.innerHTML = '<option value="">اختر عميل...</option>';
        if (window.customers) {
            window.customers.forEach(c => {
                customerSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
    }

    const productSelect = document.getElementById('returnItemProduct');
    if (productSelect) {
        productSelect.innerHTML = '<option value="">اختر منتج...</option>';
        if (window.products) {
            window.products.forEach(p => {
                productSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });
        }
    }

    const warehouseSelect = document.getElementById('returnWarehouse');
    if (warehouseSelect) {
        warehouseSelect.innerHTML = '<option value="">اختر مخزن...</option>';
        if (window.warehouses) {
            window.warehouses.forEach(w => {
                warehouseSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
            });
        }
    }

    const dateInput = document.getElementById('returnDate');
    if (dateInput) {
        dateInput.value = getTodayDate();
    }
}

// ================================================================
// ADD RETURN ITEM
// ================================================================
function addReturnItem() {
    const productId = parseInt(document.getElementById('returnItemProduct')?.value);
    const qty = parseInt(document.getElementById('returnItemQty')?.value);
    const price = parseFloat(document.getElementById('returnItemPrice')?.value);

    if (!productId) {
        showToast('⚠️ اختر منتج', 'error');
        return;
    }
    if (isNaN(qty) || qty <= 0) {
        showToast('⚠️ كمية صحيحة', 'error');
        return;
    }
    if (isNaN(price) || price <= 0) {
        showToast('⚠️ سعر صحيح', 'error');
        return;
    }

    const product = window.products?.find(p => p.id === productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }

    const total = qty * price;
    const item = {
        productId: productId,
        productName: product.name,
        qty: qty,
        price: price,
        total: total
    };

    returnItems.push(item);
    updateReturnTotals();
    renderReturnItems();
    document.getElementById('returnItemQty').value = '';
    document.getElementById('returnItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

// ================================================================
// REMOVE RETURN ITEM
// ================================================================
function removeReturnItem(index) {
    returnItems.splice(index, 1);
    updateReturnTotals();
    renderReturnItems();
}

// ================================================================
// UPDATE RETURN TOTALS
// ================================================================
function updateReturnTotals() {
    returnTotal = returnItems.reduce((s, item) => s + item.total, 0);
    safeSetText('returnTotalAmount', returnTotal.toFixed(2));
    safeSetText('returnItemsCount', returnItems.length);
}

// ================================================================
// RENDER RETURN ITEMS
// ================================================================
function renderReturnItems() {
    const tbody = document.getElementById('returnItemsBody');
    if (!tbody) return;

    if (returnItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        return;
    }

    let html = '';
    returnItems.forEach((item, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removeReturnItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ================================================================
// SAVE RETURN INVOICE
// ================================================================
function saveReturnInvoice() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    if (returnItems.length === 0) {
        showToast('⚠️ أضف صنف واحد على الأقل', 'error');
        return;
    }

    const customerId = document.getElementById('returnCustomerSelect')?.value;
    const customerName = document.getElementById('returnCustomer')?.value?.trim() || 'عميل';
    const warehouseId = parseInt(document.getElementById('returnWarehouse')?.value);
    const reason = document.getElementById('returnReason')?.value || 'أخرى';
    const date = document.getElementById('returnDate')?.value || getTodayDate();

    if (!warehouseId) {
        showToast('⚠️ اختر مخزن', 'error');
        return;
    }

    // تحديث المخزون (إضافة الكميات المرتجعة)
    for (const item of returnItems) {
        const existing = window.warehouseProducts?.find(w => 
            w.warehouseId === warehouseId && w.productId === item.productId
        );
        if (existing) {
            existing.qty += item.qty;
        } else {
            if (!window.warehouseProducts) window.warehouseProducts = [];
            window.warehouseProducts.push({
                warehouseId: warehouseId,
                productId: item.productId,
                qty: item.qty
            });
        }
    }
    setData('warehouseProducts', window.warehouseProducts);

    // إنشاء مرتجع
    const invoice = {
        id: Date.now(),
        customerId: customerId || null,
        customer: customerName,
        warehouseId: warehouseId,
        reason: reason,
        items: JSON.parse(JSON.stringify(returnItems)),
        total: returnTotal,
        date: date,
        time: getCurrentTime(),
        createdAt: new Date().toISOString()
    };

    window.returns.push(invoice);
    setData('returns', window.returns);

    // الخزنة (سحب)
    if (!window.treasury) window.treasury = [];
    window.treasury.push({
        id: Date.now() + 1,
        type: 'withdraw',
        amount: returnTotal,
        method: 'نقدي',
        note: `مرتجع - ${customerName} - ${reason}`,
        date: date,
        time: getCurrentTime(),
        returnId: invoice.id
    });
    setData('treasury', window.treasury);

    saveAll();
    addAuditLog('return', 'returns', `مرتجع - ${customerName} - ${returnTotal.toFixed(2)} 🇪🇬`);

    returnItems = [];
    returnTotal = 0;
    renderReturnItems();
    updateReturnTotals();
    document.getElementById('returnCustomer').value = '';
    document.getElementById('returnCustomerSelect').value = '';

    if (typeof renderReturnsList === 'function') renderReturnsList();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();

    showToast(`✅ تم تسجيل المرتجع - ${returnTotal.toFixed(2)} 🇪🇬`, 'success');
}

// ================================================================
// RENDER RETURNS LIST
// ================================================================
function renderReturnsList() {
    const container = document.getElementById('returnList');
    if (!container) return;

    initReturns();

    if (window.returns.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`;
        return;
    }

    const sorted = [...window.returns].sort((a, b) => b.id - a.id);
    const display = sorted.slice(0, 50);

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1.2fr 1fr 1fr 0.8fr 0.6fr;">
        <span>العميل</span><span>السبب</span><span>المبلغ</span><span>التاريخ</span><span>الوقت</span><span></span>
    </div>`;

    display.forEach(r => {
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1.2fr 1fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span>${r.customer}</span>
                <span style="font-size:10px;color:#A89070;">${r.reason || '-'}</span>
                <span style="color:#E6A830;font-weight:700;">${r.total.toFixed(2)}</span>
                <span style="font-size:10px;">${r.date}</span>
                <span style="font-size:10px;color:#A89070;">${r.time || '-'}</span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewReturn(${r.id})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-primary btn-sm" onclick="printReturn(${r.id})"><i class="fas fa-print"></i></button>
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteReturn(${r.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// VIEW RETURN
// ================================================================
function viewReturn(id) {
    const invoice = window.returns?.find(r => r.id === id);
    if (!invoice) {
        showToast('⚠️ المرتجع غير موجود', 'error');
        return;
    }

    let itemsHtml = `
        <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 1fr;gap:4px;font-weight:800;color:#C9A94E;padding:4px 0;border-bottom:2px solid #C9A94E;font-size:11px;">
            <span>المنتج</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span>
        </div>
    `;

    invoice.items.forEach(item => {
        itemsHtml += `
            <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                <span>${item.productName}</span>
                <span>${item.qty}</span>
                <span>${item.price.toFixed(2)}</span>
                <span style="color:#E6A830;font-weight:700;">${item.total.toFixed(2)}</span>
            </div>
        `;
    });

    const html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${window.companyData?.name || 'الميزان'}</h2>
                <div class="sub-title">مرتجع</div>
            </div>
            <div class="invoice-info">
                <div><span class="label">العميل:</span> ${invoice.customer}</div>
                <div><span class="label">التاريخ:</span> ${invoice.date}</div>
                <div><span class="label">السبب:</span> ${invoice.reason || 'أخرى'}</div>
            </div>
            ${itemsHtml}
            <div class="total-box">
                <div>الإجمالي: <span class="total-amount" style="color:#E6A830;">${invoice.total.toFixed(2)} 🇪🇬</span></div>
            </div>
            <div class="footer-box">
                <div class="thanks">شكراً لتعاملكم معنا</div>
            </div>
        </div>
    `;

    openModal(`📋 مرتجع #${invoice.id}`, html);
}

// ================================================================
// PRINT RETURN
// ================================================================
function printReturn(id) {
    const invoice = window.returns?.find(r => r.id === id);
    if (!invoice) {
        showToast('⚠️ المرتجع غير موجود', 'error');
        return;
    }

    let itemsHtml = '';
    invoice.items.forEach((item, index) => {
        itemsHtml += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
            </tr>
        `;
    });

    const html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>مرتجع #${invoice.id}</title>
            <style>
                body { font-family: 'Tajawal', sans-serif; padding: 20px; max-width: 400px; margin: auto; background: #fff; color: #000; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                .header h2 { margin: 0; color: #C9A94E; }
                .info { font-size: 12px; margin-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
                .info .label { font-weight: 700; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th { border-bottom: 2px solid #000; padding: 4px; text-align: center; }
                td { border-bottom: 1px solid #ddd; padding: 4px; text-align: center; }
                .total { border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; font-weight: 700; font-size: 14px; text-align: center; }
                .footer { text-align: center; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; font-size: 11px; color: #555; }
                @media print { body { padding: 10px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>${window.companyData?.name || 'الميزان'}</h2>
                <div class="sub">مرتجع</div>
            </div>
            <div class="info">
                <div><span class="label">العميل:</span> ${invoice.customer}</div>
                <div><span class="label">التاريخ:</span> ${invoice.date}</div>
                <div><span class="label">السبب:</span> ${invoice.reason || 'أخرى'}</div>
            </div>
            <table>
                <thead>
                    <tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div class="total">الإجمالي: ${invoice.total.toFixed(2)} 🇪🇬</div>
            <div class="footer">شكراً لتعاملكم معنا</div>
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank', 'width=450,height=600');
    if (win) {
        win.document.write(html);
        win.document.close();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة', 'error');
    }
}

// ================================================================
// DELETE RETURN
// ================================================================
function deleteReturn(id) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف المرتجع نهائياً؟')) return;

    const invoice = window.returns?.find(r => r.id === id);
    if (!invoice) {
        showToast('⚠️ المرتجع غير موجود', 'error');
        return;
    }

    const treasuryIdx = window.treasury?.findIndex(t => t.returnId === id) || -1;
    if (treasuryIdx > -1 && window.treasury) {
        window.treasury.splice(treasuryIdx, 1);
        setData('treasury', window.treasury);
    }

    window.returns = window.returns.filter(r => r.id !== id);
    setData('returns', window.returns);
    saveAll();

    addAuditLog('delete', 'returns', `حذف مرتجع - ${invoice.customer}`);
    renderReturnsList();
    if (typeof updateDashboard === 'function') updateDashboard();
    showToast('🗑️ تم حذف المرتجع', 'info');
}