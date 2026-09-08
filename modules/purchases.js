// ================================================================
// purchases.js - إدارة فواتير الشراء
// ================================================================

// ===== متغيرات مؤقتة =====
let purchaseItems = [];
let purchaseTotal = 0;
let purchaseTax = 0;
let purchaseTotalWithTax = 0;

// ================================================================
// INIT PURCHASES
// ================================================================
function initPurchases() {
    if (!window.purchases || !Array.isArray(window.purchases)) {
        window.purchases = [];
        setData('purchases', window.purchases);
    }
}

// ================================================================
// POPULATE PURCHASE DROPDOWNS
// ================================================================
function populatePurchaseDropdowns() {
    // الموردين
    const supplierSelect = document.getElementById('purchaseSupplierSelect');
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">اختر مورد...</option>';
        if (window.suppliers) {
            window.suppliers.forEach(s => {
                supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
    }

    // المنتجات
    const productSelect = document.getElementById('purchaseItemProduct');
    if (productSelect) {
        productSelect.innerHTML = '<option value="">اختر منتج...</option>';
        if (window.products) {
            window.products.forEach(p => {
                productSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });
        }
    }

    // المخازن
    const warehouseSelect = document.getElementById('purchaseWarehouse');
    if (warehouseSelect) {
        warehouseSelect.innerHTML = '<option value="">اختر مخزن...</option>';
        if (window.warehouses) {
            window.warehouses.forEach(w => {
                warehouseSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
            });
        }
    }

    const dateInput = document.getElementById('purchaseDate');
    if (dateInput) {
        dateInput.value = getTodayDate();
    }
}

// ================================================================
// ADD PURCHASE ITEM
// ================================================================
function addPurchaseItem() {
    const productId = parseInt(document.getElementById('purchaseItemProduct')?.value);
    const qty = parseInt(document.getElementById('purchaseItemQty')?.value);
    const price = parseFloat(document.getElementById('purchaseItemPrice')?.value);

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

    purchaseItems.push(item);
    updatePurchaseTotals();
    renderPurchaseItems();
    document.getElementById('purchaseItemQty').value = '';
    document.getElementById('purchaseItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

// ================================================================
// REMOVE PURCHASE ITEM
// ================================================================
function removePurchaseItem(index) {
    purchaseItems.splice(index, 1);
    updatePurchaseTotals();
    renderPurchaseItems();
}

// ================================================================
// UPDATE PURCHASE TOTALS
// ================================================================
function updatePurchaseTotals() {
    purchaseTotal = purchaseItems.reduce((s, item) => s + item.total, 0);
    purchaseTax = purchaseItems.reduce((s, item) => s + (item.tax || 0), 0);
    purchaseTotalWithTax = purchaseTotal + purchaseTax;

    safeSetText('purchaseTotalAmount', purchaseTotal.toFixed(2));
    safeSetText('purchaseItemsCount', purchaseItems.length);

    const taxInfo = document.getElementById('purchaseTaxInfo');
    if (taxInfo) {
        const invoiceType = document.getElementById('purchaseInvoiceType')?.value;
        if (invoiceType === 'tax') {
            taxInfo.innerHTML = `🧾 ضريبة 14%: ${purchaseTax.toFixed(2)} 🇪🇬 | الإجمالي شامل الضريبة: ${purchaseTotalWithTax.toFixed(2)} 🇪🇬`;
        } else {
            taxInfo.innerHTML = `📋 فاتورة عادية (بدون ضريبة)`;
        }
    }
}

// ================================================================
// RENDER PURCHASE ITEMS
// ================================================================
function renderPurchaseItems() {
    const tbody = document.getElementById('purchaseItemsBody');
    if (!tbody) return;

    if (purchaseItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#A89070;padding:12px;">لا توجد أصناف</td></tr>`;
        return;
    }

    let html = '';
    purchaseItems.forEach((item, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removePurchaseItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ================================================================
// SAVE PURCHASE INVOICE
// ================================================================
function savePurchaseInvoice() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    if (purchaseItems.length === 0) {
        showToast('⚠️ أضف صنف واحد على الأقل', 'error');
        return;
    }

    const supplierId = document.getElementById('purchaseSupplierSelect')?.value;
    const supplierName = document.getElementById('purchaseSupplier')?.value?.trim() || 'مورد';
    const warehouseId = parseInt(document.getElementById('purchaseWarehouse')?.value);
    const invoiceType = document.getElementById('purchaseInvoiceType')?.value || 'simple';
    const paymentMethod = document.querySelector('input[name="purchasePayment"]:checked')?.value || 'نقدي';
    const date = document.getElementById('purchaseDate')?.value || getTodayDate();

    if (!warehouseId) {
        showToast('⚠️ اختر مخزن', 'error');
        return;
    }

    // تحديث المخزون
    for (const item of purchaseItems) {
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

    const invoiceNumber = getNextInvoiceNumber();
    const invoice = {
        id: Date.now(),
        invoiceNumber: invoiceNumber,
        supplierId: supplierId || null,
        supplier: supplierName,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        paymentMethod: paymentMethod,
        items: JSON.parse(JSON.stringify(purchaseItems)),
        total: purchaseTotal,
        tax: purchaseTax,
        totalWithTax: purchaseTotalWithTax,
        date: date,
        time: getCurrentTime(),
        status: paymentMethod === 'آجل' ? 'pending' : 'paid',
        createdAt: new Date().toISOString()
    };

    window.purchases.push(invoice);
    setData('purchases', window.purchases);

    // الخزنة
    if (paymentMethod !== 'آجل') {
        if (!window.treasury) window.treasury = [];
        window.treasury.push({
            id: Date.now() + 1,
            type: 'withdraw',
            amount: purchaseTotalWithTax,
            method: paymentMethod,
            note: `مشتريات - فاتورة #${invoiceNumber} - ${supplierName}`,
            date: date,
            time: getCurrentTime(),
            purchaseId: invoice.id
        });
        setData('treasury', window.treasury);
    }

    saveAll();
    addAuditLog('purchase', 'purchases', `فاتورة شراء #${invoiceNumber} - ${supplierName} - ${purchaseTotalWithTax.toFixed(2)} 🇪🇬`);

    purchaseItems = [];
    purchaseTotal = 0;
    purchaseTax = 0;
    purchaseTotalWithTax = 0;
    renderPurchaseItems();
    updatePurchaseTotals();
    document.getElementById('purchaseSupplier').value = '';
    document.getElementById('purchaseSupplierSelect').value = '';

    if (typeof renderPurchasesList === 'function') renderPurchasesList();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();

    showToast(`✅ تم حفظ فاتورة شراء #${invoiceNumber}`, 'success');
}

// ================================================================
// RENDER PURCHASES LIST
// ================================================================
function renderPurchasesList() {
    const container = document.getElementById('purchaseList');
    if (!container) return;

    initPurchases();

    if (window.purchases.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير شراء</span></div>`;
        return;
    }

    const sorted = [...window.purchases].sort((a, b) => b.id - a.id);
    const display = sorted.slice(0, 50);

    let html = `<div class="table-header" style="grid-template-columns:0.6fr 1.2fr 1fr 1fr 0.8fr 0.6fr;">
        <span>#</span><span>المورد</span><span>المبلغ</span><span>التاريخ</span><span>الحالة</span><span></span>
    </div>`;

    display.forEach(p => {
        const total = p.totalWithTax || p.total || 0;
        const statusColor = p.status === 'paid' ? '#2D8F5E' : '#E6A830';
        const statusText = p.status === 'paid' ? '✅ مدفوع' : '⏳ معلق';

        html += `
            <div class="table-row" style="grid-template-columns:0.6fr 1.2fr 1fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span>#${p.invoiceNumber || p.id}</span>
                <span>${p.supplier}</span>
                <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${p.date}</span>
                <span><span class="status-badge" style="background:${statusColor};color:#fff;">${statusText}</span></span>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="viewInvoice(${p.id}, 'purchases')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-primary btn-sm" onclick="printInvoice(${p.id}, 'purchases')"><i class="fas fa-print"></i></button>
                    ${p.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="markPurchasePaid(${p.id})"><i class="fas fa-check"></i></button>` : ''}
                    ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteInvoice(${p.id}, 'purchases')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// MARK PURCHASE PAID
// ================================================================
function markPurchasePaid(id) {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const invoice = window.purchases.find(p => p.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    if (invoice.status === 'paid') {
        showToast('⚠️ الفاتورة مدفوعة بالفعل', 'warning');
        return;
    }

    if (!confirm(`✅ تأكيد تسديد فاتورة شراء #${invoice.invoiceNumber} - ${invoice.supplier}؟`)) return;

    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();

    if (!window.treasury) window.treasury = [];
    window.treasury.push({
        id: Date.now(),
        type: 'withdraw',
        amount: invoice.totalWithTax || invoice.total || 0,
        method: 'نقدي',
        note: `تسديد فاتورة شراء #${invoice.invoiceNumber} - ${invoice.supplier}`,
        date: getTodayDate(),
        time: getCurrentTime(),
        purchaseId: invoice.id
    });

    setData('purchases', window.purchases);
    setData('treasury', window.treasury);
    saveAll();

    addAuditLog('edit', 'purchases', `تسديد فاتورة شراء #${invoice.invoiceNumber}`);
    renderPurchasesList();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof updateDashboard === 'function') updateDashboard();

    showToast(`✅ تم تسديد فاتورة شراء #${invoice.invoiceNumber}`, 'success');
}