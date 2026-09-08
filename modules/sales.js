// ================================================================
// sales.js - إدارة فواتير البيع
// ================================================================

// ===== متغيرات مؤقتة للفاتورة =====
let salesItems = [];
let salesTotal = 0;
let salesTax = 0;
let salesTotalWithTax = 0;

// ================================================================
// INIT SALES
// ================================================================
function initSales() {
    if (!window.sales || !Array.isArray(window.sales)) {
        window.sales = [];
        setData('sales', window.sales);
    }
}

// ================================================================
// POPULATE SALES DROPDOWNS
// ================================================================
function populateSalesDropdowns() {
    // العملاء
    const customerSelect = document.getElementById('salesCustomerSelect');
    if (customerSelect) {
        customerSelect.innerHTML = '<option value="">اختر عميل...</option>';
        if (window.customers) {
            window.customers.forEach(c => {
                customerSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
    }

    // المنتجات
    const productSelect = document.getElementById('salesItemProduct');
    if (productSelect) {
        productSelect.innerHTML = '<option value="">اختر منتج...</option>';
        if (window.products) {
            window.products.forEach(p => {
                productSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });
        }
    }

    // المخازن
    const warehouseSelect = document.getElementById('salesWarehouse');
    if (warehouseSelect) {
        warehouseSelect.innerHTML = '<option value="">اختر مخزن...</option>';
        if (window.warehouses) {
            window.warehouses.forEach(w => {
                warehouseSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
            });
        }
    }

    // تعيين التاريخ الافتراضي
    const dateInput = document.getElementById('salesDate');
    if (dateInput) {
        dateInput.value = getTodayDate();
    }
}

// ================================================================
// UPDATE SALES PRICE - تحديث سعر المنتج
// ================================================================
function updateSalesPrice() {
    const productId = parseInt(document.getElementById('salesItemProduct')?.value);
    const priceInput = document.getElementById('salesItemPrice');
    if (!priceInput) return;

    if (productId) {
        const product = window.products?.find(p => p.id === productId);
        if (product) {
            priceInput.value = product.sellPrice || 0;
        }
    } else {
        priceInput.value = '';
    }
}

// ================================================================
// ADD SALES ITEM - إضافة صنف للفاتورة
// ================================================================
function addSalesItem() {
    const productId = parseInt(document.getElementById('salesItemProduct')?.value);
    const qty = parseInt(document.getElementById('salesItemQty')?.value);
    const price = parseFloat(document.getElementById('salesItemPrice')?.value);
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);

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

    // التحقق من الكمية المتاحة
    const available = window.warehouseProducts?.filter(wp => 
        wp.productId === productId && wp.warehouseId === warehouseId
    ).reduce((s, wp) => s + wp.qty, 0) || 0;

    const existingItem = salesItems.find(item => item.productId === productId);
    const requestedQty = qty + (existingItem ? existingItem.qty : 0);

    if (requestedQty > available) {
        showToast(`⚠️ الكمية المتاحة: ${available}`, 'error');
        return;
    }

    const product = window.products?.find(p => p.id === productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }

    const total = qty * price;
    const tax = total * 0.14;
    const totalWithTax = total + tax;

    const item = {
        productId: productId,
        productName: product.name,
        qty: qty,
        price: price,
        total: total,
        tax: tax,
        totalWithTax: totalWithTax
    };

    salesItems.push(item);
    updateSalesTotals();
    renderSalesItems();
    document.getElementById('salesItemQty').value = '';
    document.getElementById('salesItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

// ================================================================
// REMOVE SALES ITEM - حذف صنف
// ================================================================
function removeSalesItem(index) {
    salesItems.splice(index, 1);
    updateSalesTotals();
    renderSalesItems();
}

// ================================================================
// UPDATE SALES TOTALS - تحديث الإجماليات
// ================================================================
function updateSalesTotals() {
    salesTotal = salesItems.reduce((s, item) => s + item.total, 0);
    salesTax = salesItems.reduce((s, item) => s + (item.tax || 0), 0);
    salesTotalWithTax = salesTotal + salesTax;

    safeSetText('salesTotalAmount', salesTotal.toFixed(2));
    safeSetText('salesItemsCount', salesItems.length);

    const taxInfo = document.getElementById('salesTaxInfo');
    if (taxInfo) {
        const invoiceType = document.getElementById('salesInvoiceType')?.value;
        if (invoiceType === 'tax') {
            taxInfo.innerHTML = `🧾 ضريبة 14%: ${salesTax.toFixed(2)} 🇪🇬 | الإجمالي شامل الضريبة: ${salesTotalWithTax.toFixed(2)} 🇪🇬`;
        } else {
            taxInfo.innerHTML = `📋 فاتورة عادية (بدون ضريبة)`;
        }
    }
}

// ================================================================
// RENDER SALES ITEMS - عرض الأصناف
// ================================================================
function renderSalesItems() {
    const tbody = document.getElementById('salesItemsBody');
    if (!tbody) return;

    if (salesItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        return;
    }

    let html = '';
    salesItems.forEach((item, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removeSalesItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ================================================================
// SAVE SALE INVOICE - حفظ فاتورة البيع
// ================================================================
function saveSaleInvoice() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    if (salesItems.length === 0) {
        showToast('⚠️ أضف صنف واحد على الأقل', 'error');
        return;
    }

    const customerId = document.getElementById('salesCustomerSelect')?.value;
    const customerName = document.getElementById('salesCustomer')?.value?.trim() || 'عميل';
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const paymentMethod = document.querySelector('input[name="salesPayment"]:checked')?.value || 'نقدي';
    const date = document.getElementById('salesDate')?.value || getTodayDate();

    // التحقق من المخزن
    if (!warehouseId) {
        showToast('⚠️ اختر مخزن', 'error');
        return;
    }

    // تحديث المخزون
    let success = true;
    for (const item of salesItems) {
        const wp = window.warehouseProducts?.find(w => 
            w.warehouseId === warehouseId && w.productId === item.productId
        );
        if (wp) {
            if (wp.qty < item.qty) {
                showToast(`⚠️ الكمية غير كافية: ${item.productName} (المتاح: ${wp.qty})`, 'error');
                success = false;
                break;
            }
            wp.qty -= item.qty;
        } else {
            showToast(`⚠️ المنتج غير موجود في المخزن: ${item.productName}`, 'error');
            success = false;
            break;
        }
    }

    if (!success) return;

    // إنشاء الفاتورة
    const invoiceNumber = getNextInvoiceNumber();
    const total = salesTotal;
    const tax = salesTax;
    const totalWithTax = salesTotalWithTax;

    const invoice = {
        id: Date.now(),
        invoiceNumber: invoiceNumber,
        customerId: customerId || null,
        customer: customerName,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        paymentMethod: paymentMethod,
        items: JSON.parse(JSON.stringify(salesItems)),
        total: total,
        tax: tax,
        totalWithTax: totalWithTax,
        date: date,
        time: getCurrentTime(),
        status: paymentMethod === 'آجل' ? 'pending' : 'paid',
        createdAt: new Date().toISOString()
    };

    window.sales.push(invoice);
    setData('sales', window.sales);

    // إضافة للخزنة
    if (paymentMethod !== 'آجل') {
        if (!window.treasury) window.treasury = [];
        window.treasury.push({
            id: Date.now() + 1,
            type: 'deposit',
            amount: totalWithTax,
            method: paymentMethod,
            note: `مبيعات - فاتورة #${invoiceNumber} - ${customerName}`,
            date: date,
            time: getCurrentTime(),
            saleId: invoice.id
        });
        setData('treasury', window.treasury);
    }

    // حفظ الكل
    saveAll();
    addAuditLog('sale', 'sales', `فاتورة بيع #${invoiceNumber} - ${customerName} - ${totalWithTax.toFixed(2)} 🇪🇬`);

    // إعادة تعيين الفاتورة
    salesItems = [];
    salesTotal = 0;
    salesTax = 0;
    salesTotalWithTax = 0;
    renderSalesItems();
    updateSalesTotals();
    document.getElementById('salesCustomer').value = '';
    document.getElementById('salesCustomerSelect').value = '';
    document.getElementById('salesWarehouse').value = '';

    // تحديث الواجهات
    if (typeof renderInvoices === 'function') renderInvoices();
    if (typeof renderSalesList === 'function') renderSalesList();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();

    showToast(`✅ تم حفظ فاتورة #${invoiceNumber} - ${totalWithTax.toFixed(2)} 🇪🇬`, 'success');
}

// ================================================================
// RENDER SALES LIST - عرض فواتير البيع
// ================================================================
function renderSalesList() {
    const container = document.getElementById('salesList');
    if (!container) return;

    initSales();

    if (window.sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد فواتير بيع</span></div>`;
        return;
    }

    const sorted = [...window.sales].sort((a, b) => b.id - a.id);
    const display = sorted.slice(0, 50);

    let html = `<div class="table-header" style="grid-template-columns:0.6fr 1.2fr 1fr 1fr 0.8fr 0.6fr;">
        <span>#</span><span>العميل</span><span>المبلغ</span><span>التاريخ</span><span>الحالة</span><span></span>
    </div>`;

    display.forEach(s => {
        const total = s.totalWithTax || s.total || 0;
        const statusColor = s.status === 'paid' ? '#2D8F5E' : '#E6A830';
        const statusText = s.status === 'paid' ? '✅ مدفوع' : '⏳ معلق';

        html += `
            <div class="table-row" style="grid-template-columns:0.6fr 1.2fr 1fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span>#${s.invoiceNumber || s.id}</span>
                <span>${s.customer}</span>
                <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${s.date}</span>
                <span><span class="status-badge" style="background:${statusColor};color:#fff;">${statusText}</span></span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewInvoice(${s.id}, 'sales')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-primary btn-sm" onclick="printInvoice(${s.id}, 'sales')"><i class="fas fa-print"></i></button>
                    ${s.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="markSalesPaid(${s.id})"><i class="fas fa-check"></i></button>` : ''}
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteInvoice(${s.id}, 'sales')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// MARK SALES PAID - تسديد فاتورة آجل
// ================================================================
function markSalesPaid(id) {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    if (invoice.status === 'paid') {
        showToast('⚠️ الفاتورة مدفوعة بالفعل', 'warning');
        return;
    }

    if (!confirm(`✅ تأكيد تسديد فاتورة #${invoice.invoiceNumber} - ${invoice.customer}؟`)) return;

    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();

    // إضافة للخزنة
    if (!window.treasury) window.treasury = [];
    window.treasury.push({
        id: Date.now(),
        type: 'deposit',
        amount: invoice.totalWithTax || invoice.total || 0,
        method: 'نقدي',
        note: `تسديد فاتورة #${invoice.invoiceNumber} - ${invoice.customer}`,
        date: getTodayDate(),
        time: getCurrentTime(),
        saleId: invoice.id
    });

    setData('sales', window.sales);
    setData('treasury', window.treasury);
    saveAll();

    addAuditLog('edit', 'sales', `تسديد فاتورة #${invoice.invoiceNumber} - ${invoice.customer}`);
    renderSalesList();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof updateDashboard === 'function') updateDashboard();

    showToast(`✅ تم تسديد فاتورة #${invoice.invoiceNumber}`, 'success');
}

// ================================================================
// VIEW INVOICE - عرض الفاتورة
// ================================================================
function viewInvoice(id, type) {
    const data = type === 'sales' ? window.sales : window.purchases;
    const invoice = data?.find(d => d.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    const items = invoice.items || [];
    const total = invoice.totalWithTax || invoice.total || 0;
    const tax = invoice.tax || 0;

    let itemsHtml = `
        <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 1fr;gap:4px;font-weight:800;color:#C9A94E;padding:4px 0;border-bottom:2px solid #C9A94E;font-size:11px;">
            <span>المنتج</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span>
        </div>
    `;

    items.forEach((item, index) => {
        itemsHtml += `
            <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                <span>${item.productName || 'منتج'}</span>
                <span>${item.qty || 0}</span>
                <span>${(item.price || 0).toFixed(2)}</span>
                <span style="color:#C9A94E;font-weight:700;">${(item.total || 0).toFixed(2)}</span>
            </div>
        `;
    });

    const html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${window.companyData?.name || 'الميزان'}</h2>
                <div class="sub-title">فاتورة ${type === 'sales' ? 'بيع' : 'شراء'}</div>
            </div>
            <div class="invoice-info">
                <div><span class="label">رقم:</span> #${invoice.invoiceNumber || invoice.id}</div>
                <div><span class="label">التاريخ:</span> ${invoice.date}</div>
                <div><span class="label">العميل/المورد:</span> ${invoice.customer || invoice.supplier || 'غير محدد'}</div>
                <div><span class="label">طريقة الدفع:</span> ${invoice.paymentMethod || 'نقدي'}</div>
                ${invoice.invoiceType === 'tax' ? '<div><span class="label" style="color:#E6A830;">🧾 ضريبي 14%</span></div>' : ''}
            </div>
            ${itemsHtml}
            <div class="total-box">
                <div>المجموع: <span class="total-amount">${total.toFixed(2)} 🇪🇬</span></div>
                ${tax > 0 ? `<div>الضريبة 14%: <span class="total-amount">${tax.toFixed(2)} 🇪🇬</span></div>` : ''}
                <div style="font-size:16px;margin-top:4px;">الإجمالي: <span class="total-amount">${total.toFixed(2)} 🇪🇬</span></div>
            </div>
            <div class="footer-box">
                <div class="thanks">شكراً لتعاملكم معنا</div>
                <div>${window.companyData?.phone || ''} | ${window.companyData?.address || ''}</div>
            </div>
        </div>
    `;

    openModal(`📋 فاتورة #${invoice.invoiceNumber || invoice.id}`, html);
}

// ================================================================
// PRINT INVOICE - طباعة الفاتورة
// ================================================================
function printInvoice(id, type) {
    const data = type === 'sales' ? window.sales : window.purchases;
    const invoice = data?.find(d => d.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    const items = invoice.items || [];
    const total = invoice.totalWithTax || invoice.total || 0;
    const tax = invoice.tax || 0;

    let itemsHtml = '';
    items.forEach((item, index) => {
        itemsHtml += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName || 'منتج'}</td>
                <td>${item.qty || 0}</td>
                <td>${(item.price || 0).toFixed(2)}</td>
                <td>${(item.total || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    const html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة #${invoice.invoiceNumber || invoice.id}</title>
            <style>
                body { font-family: 'Tajawal', sans-serif; padding: 20px; max-width: 400px; margin: auto; background: #fff; color: #000; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                .header h2 { margin: 0; color: #C9A94E; }
                .header .sub { font-size: 12px; color: #555; }
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
                <div class="sub">فاتورة ${type === 'sales' ? 'بيع' : 'شراء'}</div>
                <div>${window.companyData?.address || ''} | ${window.companyData?.phone || ''}</div>
            </div>
            <div class="info">
                <div><span class="label">رقم:</span> #${invoice.invoiceNumber || invoice.id}</div>
                <div><span class="label">التاريخ:</span> ${invoice.date}</div>
                <div><span class="label">العميل/المورد:</span> ${invoice.customer || invoice.supplier || 'غير محدد'}</div>
                <div><span class="label">طريقة الدفع:</span> ${invoice.paymentMethod || 'نقدي'}</div>
                ${invoice.invoiceType === 'tax' ? `<div><span class="label">🧾 ضريبي 14%</span></div>` : ''}
            </div>
            <table>
                <thead>
                    <tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
                </thead>
                <tbody>
                    ${itemsHtml || '<tr><td colspan="5">لا توجد أصناف</td></tr>'}
                </tbody>
            </table>
            <div class="total">
                <div>المجموع: ${total.toFixed(2)} 🇪🇬</div>
                ${tax > 0 ? `<div>الضريبة 14%: ${tax.toFixed(2)} 🇪🇬</div>` : ''}
                <div style="font-size:16px;">الإجمالي: ${total.toFixed(2)} 🇪🇬</div>
            </div>
            <div class="footer">
                <div>شكراً لتعاملكم معنا</div>
                <div>تم الطباعة في ${new Date().toLocaleString('ar')}</div>
            </div>
            <script>window.onload = function() { window.print(); };</script>
        </body>
        </html>
    `;

    const win = window.open('', '_blank', 'width=450,height=700');
    if (win) {
        win.document.write(html);
        win.document.close();
    } else {
        showToast('⚠️ تم حظر النافذة المنبثقة', 'error');
    }
}

// ================================================================
// DELETE INVOICE - حذف فاتورة
// ================================================================
function deleteInvoice(id, type) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف الفاتورة نهائياً؟')) return;

    const data = type === 'sales' ? window.sales : window.purchases;
    const invoice = data?.find(d => d.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    // حذف من الخزنة
    const treasuryIdx = window.treasury?.findIndex(t => t.saleId === id || t.purchaseId === id) || -1;
    if (treasuryIdx > -1 && window.treasury) {
        window.treasury.splice(treasuryIdx, 1);
        setData('treasury', window.treasury);
    }

    // حذف الفاتورة
    if (type === 'sales') {
        window.sales = window.sales.filter(d => d.id !== id);
        setData('sales', window.sales);
    } else {
        window.purchases = window.purchases.filter(d => d.id !== id);
        setData('purchases', window.purchases);
    }

    saveAll();
    addAuditLog('delete', 'invoice', `حذف فاتورة #${invoice.invoiceNumber || invoice.id} - ${type}`);
    renderSalesList();
    if (typeof renderPurchasesList === 'function') renderPurchasesList();
    if (typeof updateDashboard === 'function') updateDashboard();
    showToast('🗑️ تم حذف الفاتورة', 'info');
}