// ================================================================
// remaining.js - جميع الموديولات المتبقية (sales, purchases, returns, cashier, reports, accounting, permissions, invoices)
// ================================================================

// ================================================================
// SALES MODULE - إدارة المبيعات
// ================================================================

let salesItems = [];

function updateSalesPrice() {
    const select = document.getElementById('salesItemProduct');
    const priceInput = document.getElementById('salesItemPrice');
    if (!select || !priceInput) return;
    const productId = parseInt(select.value);
    const product = window.products.find(p => p.id === productId);
    if (product) {
        priceInput.value = product.sellPrice || 0;
    } else {
        priceInput.value = '';
    }
}

function updateSalesTaxInfo() {
    const total = parseFloat(document.getElementById('salesTotalAmount')?.textContent) || 0;
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const info = document.getElementById('salesTaxInfo');
    if (!info) return;
    if (invoiceType === 'tax' && total > 0) {
        const tax = (total * 14) / 100;
        info.textContent = `📊 الضريبة (14%): ${tax.toFixed(2)} | الإجمالي مع الضريبة: ${(total + tax).toFixed(2)} 🇪🇬`;
        info.style.display = 'block';
    } else {
        info.textContent = '';
        info.style.display = 'none';
    }
}

function addSalesItem() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const productId = parseInt(document.getElementById('salesItemProduct')?.value);
    const qty = parseInt(document.getElementById('salesItemQty')?.value);
    const price = parseFloat(document.getElementById('salesItemPrice')?.value);
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (!qty || qty <= 0) { showToast('⚠️ كمية صحيحة', 'error'); return; }
    if (isNaN(price) || price <= 0) { showToast('⚠️ سعر صحيح', 'error'); return; }
    if (!warehouseId) { showToast('⚠️ اختر مخزن', 'error'); return; }

    const product = window.products.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    const wp = window.warehouseProducts.find(w => w.warehouseId === warehouseId && w.productId === productId);
    if (!wp || wp.qty < qty) {
        showToast(`⚠️ الكمية غير متوفرة (المتاح: ${wp ? wp.qty : 0})`, 'error');
        return;
    }

    salesItems.push({
        productId: product.id,
        productName: product.name,
        qty: qty,
        price: price,
        total: qty * price,
        warehouseId: warehouseId
    });

    renderSalesItems();
    document.getElementById('salesItemQty').value = '';
    document.getElementById('salesItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderSalesItems() {
    const tbody = document.getElementById('salesItemsBody');
    if (!tbody) return;

    let html = '';
    let total = 0;

    salesItems.forEach((item, index) => {
        total += item.total;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeSalesItem(${index})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center;color:#5D5D5D;padding:8px;">لا توجد أصناف</td></tr>';
    safeSetText('salesItemsCount', salesItems.length);
    safeSetText('salesTotalAmount', total.toFixed(2));
    updateSalesTaxInfo();
}

function removeSalesItem(index) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الصنف؟')) return;
    salesItems.splice(index, 1);
    renderSalesItems();
}

function saveSaleInvoice() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const customer = document.getElementById('salesCustomer')?.value?.trim() ||
        document.getElementById('salesCustomerSelect')?.value;
    const date = document.getElementById('salesDate')?.value || new Date().toISOString().split('T')[0];
    const payment = getSelectedPayment('sales');
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';

    if (!customer) { showToast('⚠️ أدخل العميل', 'error'); return; }
    if (salesItems.length === 0) { showToast('⚠️ أضف صنف واحد على الأقل', 'error'); return; }
    if (!warehouseId) { showToast('⚠️ اختر مخزن', 'error'); return; }

    let totalAmount = 0;
    for (const item of salesItems) {
        const wp = window.warehouseProducts.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (wp) {
            wp.qty -= item.qty;
            totalAmount += item.total;
        }
    }
    saveAll();

    const taxRate = 14;
    const taxAmount = invoiceType === 'tax' ? (totalAmount * taxRate) / 100 : 0;
    const totalWithTax = totalAmount + taxAmount;

    if (payment === 'نقدي') {
        window.treasury.push({
            id: Date.now(),
            type: 'deposit',
            amount: totalWithTax,
            note: `بيع للعميل ${customer} (${salesItems.length} صنف)${invoiceType === 'tax' ? ' - ضريبة 14%' : ''}`,
            method: 'نقدي',
            date: date,
            warehouseId: warehouseId,
            time: new Date().toLocaleTimeString('ar')
        });
        saveAll();
    }

    if (typeof addCashierTransaction === 'function') {
        addCashierTransaction('sale', totalWithTax, payment, `بيع للعميل ${customer}${invoiceType === 'tax' ? ' (بضريبة)' : ''}`);
    }

    window.sales.push({
        id: Date.now(),
        customer: customer,
        date: date,
        payment: payment,
        items: [...salesItems],
        total: totalAmount,
        taxRate: invoiceType === 'tax' ? taxRate : 0,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        itemsCount: salesItems.length,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        type: 'sale'
    });

    saveAll();
    addAuditLog('sale', 'invoice', `فاتورة بيع للعميل ${customer} - ${totalWithTax.toFixed(2)}${invoiceType === 'tax' ? ' (بضريبة)' : ''}`);

    renderProducts();
    renderSales();
    if (typeof renderCashier === 'function') renderCashier();
    salesItems = [];
    renderSalesItems();
    showToast(`✅ تم إضافة فاتورة بيع`, 'success');
    updateDashboard();

    if (totalAmount > 1000) {
        addAlert(`💰 فاتورة كبيرة`, `${totalAmount.toFixed(2)} - العميل: ${customer}`, 'success');
    }
}

function renderSales() {
    const container = document.getElementById('salesList');
    if (!container) return;

    if (window.sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    const canEditSales = canEdit();
    const canDeleteSales = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;"><span>العميل</span><span>المخزن</span><span>النوع</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span></div>`;

    window.sales.slice().reverse().forEach(s => {
        const w = window.warehouses.find(wh => wh.id === s.warehouseId);
        const wName = w ? w.name : 'غير محدد';
        const itemsCount = s.items ? s.items.length : 1;
        const total = s.totalWithTax || s.total || 0;
        const typeLabel = s.invoiceType === 'tax' ? 'ضريبية' : 'عادية';

        html += `
            <div class="invoice-row" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;font-size:11px;">
                <span>${s.customer}</span>
                <span style="font-size:9px;">${wName}</span>
                <span style="font-size:9px;color:#4A8AB5;">${typeLabel}</span>
                <span>${itemsCount}</span>
                <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${s.date}</span>
                <div class="actions">
                    ${canEditSales ? `<button class="btn btn-warning btn-sm" onclick="editSaleInvoice(${s.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteSales ? `<button class="btn btn-danger btn-sm" onclick="deleteSaleInvoice(${s.id})"><i class="fas fa-trash"></i></button>` : ''}
                    <button class="btn btn-success btn-sm whatsapp-btn" onclick="sendWhatsAppInvoice(${s.id})" style="background:#25D366;color:#fff;font-size:10px;"><i class="fab fa-whatsapp"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function sendWhatsAppInvoice(id) {
    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }

    let whatsappNumber = '01011993799';
    const customerObj = window.customers.find(c => c.name === invoice.customer);
    if (customerObj && customerObj.whatsapp) {
        whatsappNumber = customerObj.whatsapp;
    } else if (customerObj && customerObj.phone) {
        whatsappNumber = customerObj.phone;
    }
    whatsappNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (!whatsappNumber.startsWith('20')) {
        whatsappNumber = '20' + whatsappNumber;
    }

    const total = invoice.totalWithTax || invoice.total || 0;
    const company = window.companyData || {};
    const isTax = invoice.invoiceType === 'tax';
    const taxRate = 14;
    const taxAmount = isTax ? (total * taxRate) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;
    const dt = getCurrentDateTime();

    let message = `╔══════════════════════════════════╗\n` +
        `║           🏢 ${company.name || 'الميزان'}        ║\n` +
        `║    نظام محاسبة ونقاط بيع         ║\n` +
        `╠══════════════════════════════════╣\n` +
        `║ 📍 ${(company.address || 'القاهرة، مصر').padEnd(28)}║\n` +
        `║ 📞 ${(company.phone || '0234567890').padEnd(28)}║\n` +
        `║ 📱 ${(company.mobile || '01000000000').padEnd(28)}║\n` +
        `╠══════════════════════════════════╣\n` +
        `║ 📅 ${invoice.date}  🕐 ${dt.time}                 ║\n`;

    if (isTax) {
        message += `║ 🆔 الرقم الضريبي: ${(company.taxNumber || 'غير مسجل').padEnd(22)}║\n` +
            `║ 📋 السجل التجاري: ${(company.commercialRegister || 'غير مسجل').padEnd(20)}║\n`;
    }

    message += `╠══════════════════════════════════╣\n` +
        `║ 🧾 فاتورة ${isTax ? 'ضريبية' : 'عادية'.padEnd(24)}║\n` +
        `║ 👤 العميل: ${invoice.customer.padEnd(26)}║\n` +
        `║ 💳 الدفع: ${(invoice.payment || 'نقدي').padEnd(27)}║\n` +
        `╠══════════════════════════════════╣\n` +
        `║ # │ المنتج    │ العدد │ السعر │\n` +
        `╠══════════════════════════════════╣\n`;

    if (invoice.items) {
        invoice.items.forEach((item, i) => {
            const name = item.productName.length > 10 ? item.productName.substring(0, 10) + '..' : item.productName;
            message += `║ ${(i+1).toString().padStart(1)} │ ${name.padEnd(10)} │ ${item.qty.toString().padStart(4)} │ ${item.price.toFixed(0).padStart(5)} │\n`;
            message += `║   │ الإجمالي  │      │ ${item.total.toFixed(2).padStart(5)} │\n`;
        });
    }

    message += `╠══════════════════════════════════╣\n` +
        `║ 💰 الإجمالي: ${total.toFixed(2).padStart(20)} 🇪🇬 ║\n`;

    if (isTax) {
        message += `║ 📊 الضريبة (14%): ${taxAmount.toFixed(2).padStart(19)} ║\n` +
            `║ 💰 الإجمالي مع الضريبة: ${totalWithTax.toFixed(2).padStart(14)} ║\n`;
    }

    message += `╠══════════════════════════════════╣\n` +
        `║ خالص مع الشكر                    ║\n`;

    if (company.vodafone) message += `║ 📱 فودافون كاش: ${company.vodafone.padEnd(20)}║\n`;
    if (company.instapay) message += `║ 📲 إنستاباي: ${company.instapay.padEnd(20)}║\n`;
    if (company.bankAccount) message += `║ 🏦 بنك: ${company.bankAccount.padEnd(22)}║\n`;
    if (company.cash) message += `║ 💰 كاش: ${company.cash.padEnd(23)}║\n`;

    message += `╚══════════════════════════════════╝`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    window.open(url, '_blank');

    showToast(`📱 تم فتح واتساب للعميل ${invoice.customer}`, 'success');
}

function editSaleInvoice(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
            if (wp) wp.qty += item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => t.note && t.note.includes(`بيع للعميل ${invoice.customer}`) && t.date === invoice.date);
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    window.sales = window.sales.filter(s => s.id !== id);
    saveAll();

    document.getElementById('salesCustomerSelect').value = invoice.customer;
    document.getElementById('salesCustomer').value = invoice.customer;
    document.getElementById('salesDate').value = invoice.date;
    document.getElementById('salesWarehouse').value = invoice.warehouseId || '';
    document.getElementById('salesInvoiceType').value = invoice.invoiceType || 'simple';

    salesItems = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const product = window.products.find(p => p.id === item.productId);
            if (product) {
                salesItems.push({
                    productId: product.id,
                    productName: product.name,
                    qty: item.qty,
                    price: item.price,
                    total: item.total,
                    warehouseId: item.warehouseId || invoice.warehouseId
                });
            }
        }
    }
    renderSalesItems();

    document.querySelectorAll('input[name="salesPayment"]').forEach(el => {
        el.checked = el.value === invoice.payment;
    });

    addAuditLog('edit', 'invoice', `تعديل فاتورة بيع ${id}`);
    showToast(`✏️ جاري تعديل`, 'info');
    renderSales();
    updateDashboard();
    navigateTo('sales');
}

function deleteSaleInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة؟')) return;

    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
            if (wp) wp.qty += item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => t.note && t.note.includes(`بيع للعميل ${invoice.customer}`) && t.date === invoice.date);
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    window.sales = window.sales.filter(s => s.id !== id);
    saveAll();
    addAuditLog('delete', 'invoice', `حذف فاتورة بيع ${id}`);
    renderSales();
    renderProducts();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}


// ================================================================
// PURCHASES MODULE - إدارة المشتريات
// ================================================================

let purchaseItems = [];

function addPurchaseItem() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const productId = parseInt(document.getElementById('purchaseItemProduct')?.value);
    const qty = parseInt(document.getElementById('purchaseItemQty')?.value);
    const price = parseFloat(document.getElementById('purchaseItemPrice')?.value);

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (!qty || qty <= 0) { showToast('⚠️ كمية صحيحة', 'error'); return; }
    if (isNaN(price) || price <= 0) { showToast('⚠️ سعر صحيح', 'error'); return; }

    const product = window.products.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    purchaseItems.push({
        productId: product.id,
        productName: product.name,
        qty: qty,
        price: price,
        total: qty * price
    });
    renderPurchaseItems();
    document.getElementById('purchaseItemQty').value = '';
    document.getElementById('purchaseItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderPurchaseItems() {
    const tbody = document.getElementById('purchaseItemsBody');
    if (!tbody) return;

    let html = '';
    let total = 0;

    purchaseItems.forEach((item, index) => {
        total += item.total;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removePurchaseItem(${index})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center;color:#5D5D5D;padding:8px;">لا توجد أصناف</td></tr>';
    safeSetText('purchaseItemsCount', purchaseItems.length);
    safeSetText('purchaseTotalAmount', total.toFixed(2));
}

function removePurchaseItem(index) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الصنف؟')) return;
    purchaseItems.splice(index, 1);
    renderPurchaseItems();
}

function savePurchaseInvoice() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const supplier = document.getElementById('purchaseSupplier')?.value?.trim() ||
        document.getElementById('purchaseSupplierSelect')?.value;
    const date = document.getElementById('purchaseDate')?.value || new Date().toISOString().split('T')[0];
    const payment = getSelectedPayment('purchase');
    const warehouseId = parseInt(document.getElementById('purchaseWarehouse')?.value);
    const invoiceType = document.getElementById('purchaseInvoiceType')?.value || 'simple';

    if (!supplier) { showToast('⚠️ أدخل المورد', 'error'); return; }
    if (purchaseItems.length === 0) { showToast('⚠️ أضف صنف واحد على الأقل', 'error'); return; }
    if (!warehouseId) { showToast('⚠️ اختر مخزن', 'error'); return; }

    let totalAmount = 0;
    for (const item of purchaseItems) {
        let wp = window.warehouseProducts.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (!wp) {
            wp = { warehouseId: warehouseId, productId: item.productId, qty: 0 };
            window.warehouseProducts.push(wp);
        }
        wp.qty += item.qty;
        totalAmount += item.total;
    }
    saveAll();

    const taxRate = 14;
    const taxAmount = invoiceType === 'tax' ? (totalAmount * taxRate) / 100 : 0;
    const totalWithTax = totalAmount + taxAmount;

    if (payment === 'نقدي') {
        window.treasury.push({
            id: Date.now(),
            type: 'withdraw',
            amount: totalWithTax,
            note: `شراء من ${supplier} (${purchaseItems.length} صنف)${invoiceType === 'tax' ? ' - ضريبة 14%' : ''}`,
            method: 'نقدي',
            date: date,
            warehouseId: warehouseId,
            time: new Date().toLocaleTimeString('ar')
        });
        saveAll();
        if (typeof addCashierTransaction === 'function') {
            addCashierTransaction('expense', totalWithTax, payment, `شراء من ${supplier}${invoiceType === 'tax' ? ' (بضريبة)' : ''}`);
        }
    }

    window.purchases.push({
        id: Date.now(),
        supplier: supplier,
        date: date,
        payment: payment,
        items: [...purchaseItems],
        total: totalAmount,
        taxRate: invoiceType === 'tax' ? taxRate : 0,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        itemsCount: purchaseItems.length,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        type: 'purchase'
    });

    saveAll();
    addAuditLog('purchase', 'invoice', `فاتورة شراء من ${supplier} - ${totalWithTax.toFixed(2)}${invoiceType === 'tax' ? ' (بضريبة)' : ''}`);

    renderProducts();
    renderAllPurchases();
    if (typeof renderCashier === 'function') renderCashier();
    purchaseItems = [];
    renderPurchaseItems();
    showToast(`✅ تم إضافة فاتورة شراء`, 'success');
    updateDashboard();
}

function renderAllPurchases() {
    const container = document.getElementById('purchaseList');
    if (!container) return;

    if (window.purchases.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    const canEditPurchases = canEdit();
    const canDeletePurchases = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;"><span>المورد</span><span>المخزن</span><span>النوع</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span></div>`;

    window.purchases.slice().reverse().forEach(p => {
        const w = window.warehouses.find(wh => wh.id === p.warehouseId);
        const wName = w ? w.name : 'غير محدد';
        const itemsCount = p.items ? p.items.length : 1;
        const total = p.totalWithTax || p.total || 0;
        const typeLabel = p.invoiceType === 'tax' ? 'ضريبية' : 'عادية';

        html += `
            <div class="invoice-row" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;font-size:11px;">
                <span>${p.supplier}</span>
                <span style="font-size:9px;">${wName}</span>
                <span style="font-size:9px;color:#4A8AB5;">${typeLabel}</span>
                <span>${itemsCount}</span>
                <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${p.date}</span>
                <div class="actions">
                    ${canEditPurchases ? `<button class="btn btn-warning btn-sm" onclick="editPurchaseInvoice(${p.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeletePurchases ? `<button class="btn btn-danger btn-sm" onclick="deletePurchaseInvoice(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function editPurchaseInvoice(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const invoice = window.purchases.find(p => p.id === id);
    if (!invoice) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
            if (wp) wp.qty -= item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => t.note && t.note.includes(`شراء من ${invoice.supplier}`) && t.date === invoice.date);
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    window.purchases = window.purchases.filter(p => p.id !== id);
    saveAll();

    document.getElementById('purchaseSupplierSelect').value = invoice.supplier;
    document.getElementById('purchaseSupplier').value = invoice.supplier;
    document.getElementById('purchaseDate').value = invoice.date;
    document.getElementById('purchaseWarehouse').value = invoice.warehouseId || '';
    document.getElementById('purchaseInvoiceType').value = invoice.invoiceType || 'simple';

    purchaseItems = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const product = window.products.find(p => p.id === item.productId);
            if (product) {
                purchaseItems.push({
                    productId: product.id,
                    productName: product.name,
                    qty: item.qty,
                    price: item.price,
                    total: item.total
                });
            }
        }
    }
    renderPurchaseItems();

    document.querySelectorAll('input[name="purchasePayment"]').forEach(el => {
        el.checked = el.value === invoice.payment;
    });

    addAuditLog('edit', 'invoice', `تعديل فاتورة شراء ${id}`);
    showToast(`✏️ جاري تعديل`, 'info');
    renderAllPurchases();
    updateDashboard();
    navigateTo('purchase');
}

function deletePurchaseInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف فاتورة الشراء؟')) return;

    const invoice = window.purchases.find(p => p.id === id);
    if (!invoice) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
            if (wp) wp.qty -= item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => t.note && t.note.includes(`شراء من ${invoice.supplier}`) && t.date === invoice.date);
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    window.purchases = window.purchases.filter(p => p.id !== id);
    saveAll();
    addAuditLog('delete', 'invoice', `حذف فاتورة شراء ${id}`);
    renderAllPurchases();
    renderProducts();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}


// ================================================================
// RETURNS MODULE - إدارة المرتجعات
// ================================================================

let returnItems = [];

function addReturnItem() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const productId = parseInt(document.getElementById('returnItemProduct')?.value);
    const qty = parseInt(document.getElementById('returnItemQty')?.value);
    const price = parseFloat(document.getElementById('returnItemPrice')?.value);

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (!qty || qty <= 0) { showToast('⚠️ كمية صحيحة', 'error'); return; }
    if (isNaN(price) || price <= 0) { showToast('⚠️ سعر صحيح', 'error'); return; }

    const product = window.products.find(p => p.id === productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    returnItems.push({ productId: product.id, productName: product.name, qty: qty, price: price, total: qty * price });
    renderReturnItems();
    document.getElementById('returnItemQty').value = '';
    document.getElementById('returnItemPrice').value = '';
    showToast('✅ تم إضافة الصنف', 'success');
}

function renderReturnItems() {
    const tbody = document.getElementById('returnItemsBody');
    if (!tbody) return;

    let html = '';
    let total = 0;

    returnItems.forEach((item, index) => {
        total += item.total;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName}</td>
                <td>${item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeReturnItem(${index})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center;color:#5D5D5D;padding:8px;">لا توجد أصناف</td></tr>';
    safeSetText('returnItemsCount', returnItems.length);
    safeSetText('returnTotalAmount', total.toFixed(2));
}

function removeReturnItem(index) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الصنف؟')) return;
    returnItems.splice(index, 1);
    renderReturnItems();
}

function saveReturnInvoice() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const customer = document.getElementById('returnCustomer')?.value?.trim() ||
        document.getElementById('returnCustomerSelect')?.value;
    const date = document.getElementById('returnDate')?.value || new Date().toISOString().split('T')[0];
    const reason = document.getElementById('returnReason')?.value || 'أسباب أخرى';
    const warehouseId = parseInt(document.getElementById('returnWarehouse')?.value);

    if (!customer) { showToast('⚠️ أدخل العميل', 'error'); return; }
    if (returnItems.length === 0) { showToast('⚠️ أضف صنف واحد على الأقل', 'error'); return; }
    if (!warehouseId) { showToast('⚠️ اختر مخزن', 'error'); return; }

    let totalAmount = 0;
    for (const item of returnItems) {
        let wp = window.warehouseProducts.find(w => w.warehouseId === warehouseId && w.productId === item.productId);
        if (!wp) {
            wp = { warehouseId: warehouseId, productId: item.productId, qty: 0 };
            window.warehouseProducts.push(wp);
        }
        wp.qty += item.qty;
        totalAmount += item.total;
    }

    saveAll();
    window.returns.push({
        id: Date.now(),
        customer: customer,
        date: date,
        reason: reason,
        items: [...returnItems],
        total: totalAmount,
        itemsCount: returnItems.length,
        warehouseId: warehouseId,
        type: 'return'
    });

    saveAll();
    addAuditLog('return', 'invoice', `مرتجع للعميل ${customer} - ${totalAmount.toFixed(2)}`);
    renderProducts();
    renderAllReturns();
    returnItems = [];
    renderReturnItems();
    showToast(`✅ تم تسجيل المرتجع`, 'success');
    updateDashboard();
}

function renderAllReturns() {
    const container = document.getElementById('returnList');
    if (!container) return;

    if (window.returns.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`;
        return;
    }

    const canEditReturns = canEdit();
    const canDeleteReturns = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.7fr 0.6fr 0.7fr;"><span>العميل</span><span>المخزن</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span></div>`;

    window.returns.slice().reverse().forEach(r => {
        const w = window.warehouses.find(wh => wh.id === r.warehouseId);
        const wName = w ? w.name : 'غير محدد';
        const itemsCount = r.items ? r.items.length : 1;
        const total = r.items ? r.items.reduce((sum, item) => sum + (item.total || 0), 0) : (r.total || 0);

        html += `
            <div class="invoice-row" style="grid-template-columns:0.8fr 1fr 0.6fr 0.7fr 0.6fr 0.7fr;font-size:11px;">
                <span>${r.customer}</span>
                <span style="font-size:9px;">${wName}</span>
                <span>${itemsCount}</span>
                <span style="color:#E6A830;font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${r.date}</span>
                <div class="actions">
                    ${canEditReturns ? `<button class="btn btn-warning btn-sm" onclick="editReturnInvoice(${r.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteReturns ? `<button class="btn btn-danger btn-sm" onclick="deleteReturnInvoice(${r.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function editReturnInvoice(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const invoice = window.returns.find(r => r.id === id);
    if (!invoice) { showToast('⚠️ المرتجع غير موجود', 'error'); return; }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
            if (wp) wp.qty -= item.qty;
        }
    }

    window.returns = window.returns.filter(r => r.id !== id);
    saveAll();

    document.getElementById('returnCustomerSelect').value = invoice.customer;
    document.getElementById('returnCustomer').value = invoice.customer;
    document.getElementById('returnDate').value = invoice.date;
    document.getElementById('returnWarehouse').value = invoice.warehouseId || '';
    document.getElementById('returnReason').value = invoice.reason || 'أسباب أخرى';

    returnItems = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const product = window.products.find(p => p.id === item.productId);
            if (product) {
                returnItems.push({
                    productId: product.id,
                    productName: product.name,
                    qty: item.qty,
                    price: item.price,
                    total: item.total
                });
            }
        }
    }
    renderReturnItems();

    addAuditLog('edit', 'invoice', `تعديل مرتجع ${id}`);
    showToast(`✏️ جاري تعديل`, 'info');
    renderAllReturns();
    updateDashboard();
    navigateTo('returns');
}

function deleteReturnInvoice(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المرتجع؟')) return;

    const invoice = window.returns.find(r => r.id === id);
    if (!invoice) { showToast('⚠️ المرتجع غير موجود', 'error'); return; }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
            if (wp) wp.qty -= item.qty;
        }
    }

    window.returns = window.returns.filter(r => r.id !== id);
    saveAll();
    addAuditLog('delete', 'invoice', `حذف مرتجع ${id}`);
    renderAllReturns();
    renderProducts();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}


// ================================================================
// INVOICES MODULE - عرض جميع الفواتير
// ================================================================

function renderAllInvoices() {
    let all = [];
    window.sales.forEach(s => all.push({ ...s, typeLabel: 'بيع', color: '#2D8F5E' }));
    window.purchases.forEach(p => all.push({ ...p, typeLabel: 'شراء', color: '#E06060' }));
    window.returns.forEach(r => all.push({ ...r, typeLabel: 'مرتجع', color: '#E6A830' }));

    safeSetText('allInvoicesCount', all.length);
    safeSetText('invoicesSalesCount', window.sales.length);
    safeSetText('invoicesPurchasesCount', window.purchases.length);

    const container = document.getElementById('allInvoicesList');
    if (!container) return;

    if (all.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    const canDeleteAll = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.6fr 1.2fr 0.6fr 0.6fr 0.8fr 0.8fr 0.6fr;"><span>النوع</span><span>العميل/المورد</span><span>المخزن</span><span>النوع</span><span>الإجمالي</span><span>التاريخ</span><span></span></div>`;

    all.slice().reverse().forEach(i => {
        const total = i.totalWithTax || i.total || 0;
        const name = i.customer || i.supplier || 'غير محدد';
        const w = window.warehouses.find(wh => wh.id === i.warehouseId);
        const wName = w ? w.name : '-';
        const typeLabel = i.invoiceType === 'tax' ? 'ضريبية' : 'عادية';

        html += `
            <div class="invoice-row" style="grid-template-columns:0.6fr 1.2fr 0.6fr 0.6fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span style="color:${i.color};font-weight:700;">${i.typeLabel}</span>
                <span>${name}</span>
                <span style="font-size:9px;">${wName}</span>
                <span style="font-size:9px;color:#4A8AB5;">${typeLabel}</span>
                <span style="color:${i.color};font-weight:700;">${total.toFixed(2)}</span>
                <span style="font-size:10px;">${i.date}</span>
                <div class="actions">
                    ${canDeleteAll ? `<button class="btn btn-danger btn-sm" onclick="deleteAllInvoice(${i.id},'${i.type}')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function deleteAllInvoice(id, type) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الفاتورة؟')) return;

    if (type === 'sale') {
        const invoice = window.sales.find(s => s.id === id);
        if (invoice && invoice.items) {
            for (const item of invoice.items) {
                const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
                if (wp) wp.qty += item.qty;
            }
        }
        window.sales = window.sales.filter(s => s.id !== id);
    } else if (type === 'purchase') {
        const invoice = window.purchases.find(p => p.id === id);
        if (invoice && invoice.items) {
            for (const item of invoice.items) {
                const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
                if (wp) wp.qty -= item.qty;
            }
        }
        window.purchases = window.purchases.filter(p => p.id !== id);
    } else if (type === 'return') {
        const invoice = window.returns.find(r => r.id === id);
        if (invoice && invoice.items) {
            for (const item of invoice.items) {
                const wp = window.warehouseProducts.find(w => w.warehouseId === invoice.warehouseId && w.productId === item.productId);
                if (wp) wp.qty -= item.qty;
            }
        }
        window.returns = window.returns.filter(r => r.id !== id);
    }

    saveAll();
    addAuditLog('delete', 'invoice', `حذف فاتورة`);
    renderAllInvoices();
    renderProducts();
    updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
}


// ================================================================
// PERMISSIONS MODULE - إدارة الإذونات
// ================================================================

function addPermission() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const type = document.getElementById('permissionType')?.value || 'transfer';
    const fromId = parseInt(document.getElementById('permissionFrom')?.value);
    const toId = parseInt(document.getElementById('permissionTo')?.value);
    const productId = parseInt(document.getElementById('permissionProduct')?.value);
    const qty = parseInt(document.getElementById('permissionQty')?.value);
    const date = document.getElementById('permissionDate')?.value || new Date().toISOString().split('T')[0];
    const note = document.getElementById('permissionNote')?.value?.trim() || '';

    if (!productId) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (!qty || qty <= 0) { showToast('⚠️ كمية صحيحة', 'error'); return; }

    if (type === 'transfer') {
        if (!fromId || !toId) { showToast('⚠️ اختر المخازن', 'error'); return; }
        if (fromId === toId) { showToast('⚠️ لا يمكن التحويل لنفس المخزن', 'error'); return; }
        const fromProduct = window.warehouseProducts.find(wp => wp.warehouseId === fromId && wp.productId === productId);
        if (!fromProduct || fromProduct.qty < qty) {
            showToast(`⚠️ الكمية غير متوفرة في المخزن المصدر`, 'error');
            return;
        }
    } else if (type === 'withdraw') {
        if (!fromId) { showToast('⚠️ اختر المخزن المصدر', 'error'); return; }
        const fromProduct = window.warehouseProducts.find(wp => wp.warehouseId === fromId && wp.productId === productId);
        if (!fromProduct || fromProduct.qty < qty) {
            showToast(`⚠️ الكمية غير متوفرة`, 'error');
            return;
        }
    } else if (type === 'add') {
        if (!toId) { showToast('⚠️ اختر المخزن الهدف', 'error'); return; }
    } else if (type === 'inventory' || type === 'adjustment') {
        if (!toId) { showToast('⚠️ اختر المخزن', 'error'); return; }
    }

    window.permissions.push({
        id: Date.now(),
        type: type,
        fromWarehouseId: fromId || null,
        toWarehouseId: toId || null,
        productId: productId,
        qty: qty,
        date: date,
        note: note,
        status: 'pending'
    });

    saveAll();
    addAuditLog('add', 'permission', `إضافة إذن ${type} - ${qty}`);
    renderPermissions();
    document.getElementById('permissionQty').value = '';
    document.getElementById('permissionNote').value = '';
    showToast('✅ تم إضافة الإذن', 'success');
}

function renderPermissions() {
    const mainQty = window.warehouseProducts.filter(wp => {
        const w = window.warehouses.find(wh => wh.id === wp.warehouseId);
        return w && w.type === 'رئيسي';
    }).reduce((s, wp) => s + wp.qty, 0);

    const branchQty = window.warehouseProducts.filter(wp => {
        const w = window.warehouses.find(wh => wh.id === wp.warehouseId);
        return w && w.type === 'محل';
    }).reduce((s, wp) => s + wp.qty, 0);

    const subQty = window.warehouseProducts.filter(wp => {
        const w = window.warehouses.find(wh => wh.id === wp.warehouseId);
        return w && w.type === 'فرعي';
    }).reduce((s, wp) => s + wp.qty, 0);

    safeSetText('mainWarehouseQty', mainQty);
    safeSetText('branchWarehouseQty', branchQty);
    safeSetText('subWarehouseQty', subQty);

    filterPermissions('all');
}

let permissionFilter = 'all';

function filterPermissions(filter) {
    permissionFilter = filter;
    const container = document.getElementById('permissionList');
    if (!container) return;

    let filtered = window.permissions;
    if (filter !== 'all') filtered = window.permissions.filter(p => p.status === filter);

    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === (filter === 'all' ? 'الكل' : filter === 'pending' ? '⏳ معلق' : filter === 'executed' ? '✅ منفذ' : '❌ ملغي'));
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد إذونات</span></div>`;
        return;
    }

    const canEditPerms = canEdit();
    const canDeletePerms = canDelete();

    const typeNames = { transfer: 'تحويل', withdraw: 'صرف', add: 'إضافة', inventory: 'جرد أول المدة', adjustment: 'تسوية ضغط' };
    const typeColors = { transfer: '#4A8AB5', withdraw: '#E06060', add: '#2D8F5E', inventory: '#E6A830', adjustment: '#C9A94E' };
    const statusColors = { pending: '#E6A830', executed: '#2D8F5E', cancelled: '#E06060' };
    const statusNames = { pending: '⏳ معلق', executed: '✅ منفذ', cancelled: '❌ ملغي' };

    let html = `<div class="table-header" style="grid-template-columns:0.8fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;"><span>النوع</span><span>من</span><span>إلى</span><span>المنتج</span><span>الكمية</span><span>الحالة</span><span></span></div>`;

    filtered.slice().reverse().forEach(p => {
        const product = window.products.find(pr => pr.id === p.productId);
        const fromW = window.warehouses.find(w => w.id === p.fromWarehouseId);
        const toW = window.warehouses.find(w => w.id === p.toWarehouseId);
        const fromName = fromW ? fromW.name : '-';
        const toName = toW ? toW.name : '-';

        html += `
            <div class="table-row" style="grid-template-columns:0.8fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;font-size:11px;">
                <span style="color:${typeColors[p.type]};font-weight:700;">${typeNames[p.type] || p.type}</span>
                <span style="font-size:9px;">${fromName}</span>
                <span style="font-size:9px;">${toName}</span>
                <span>${product ? product.name : 'غير معروف'}</span>
                <span>${p.qty}</span>
                <span><span class="status-badge" style="background:${statusColors[p.status]};color:#fff;">${statusNames[p.status] || p.status}</span></span>
                <div class="actions">
                    ${p.status === 'pending' && canEditPerms ? `
                        <button class="btn btn-success btn-sm" onclick="executePermission(${p.id})"><i class="fas fa-check"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="cancelPermission(${p.id})"><i class="fas fa-times"></i></button>
                    ` : ''}
                    ${canDeletePerms ? `<button class="btn btn-danger btn-sm" onclick="deletePermission(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function executePermission(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const permission = window.permissions.find(p => p.id === id);
    if (!permission) { showToast('⚠️ الإذن غير موجود', 'error'); return; }
    if (permission.status !== 'pending') { showToast('⚠️ الإذن تم تنفيذه', 'warning'); return; }

    const product = window.products.find(p => p.id === permission.productId);
    if (!product) { showToast('⚠️ المنتج غير موجود', 'error'); return; }

    if (permission.type === 'transfer') {
        const fromProduct = window.warehouseProducts.find(wp =>
            wp.warehouseId === permission.fromWarehouseId &&
            wp.productId === permission.productId
        );
        if (!fromProduct || fromProduct.qty < permission.qty) {
            showToast('⚠️ الكمية غير متوفرة في المخزن المصدر', 'error');
            return;
        }
        fromProduct.qty -= permission.qty;

        let toProduct = window.warehouseProducts.find(wp =>
            wp.warehouseId === permission.toWarehouseId &&
            wp.productId === permission.productId
        );
        if (!toProduct) {
            toProduct = { warehouseId: permission.toWarehouseId, productId: permission.productId, qty: 0 };
            window.warehouseProducts.push(toProduct);
        }
        toProduct.qty += permission.qty;

    } else if (permission.type === 'withdraw') {
        const fromProduct = window.warehouseProducts.find(wp =>
            wp.warehouseId === permission.fromWarehouseId &&
            wp.productId === permission.productId
        );
        if (!fromProduct || fromProduct.qty < permission.qty) {
            showToast('⚠️ الكمية غير متوفرة', 'error');
            return;
        }
        fromProduct.qty -= permission.qty;

        window.treasury.push({
            id: Date.now(),
            type: 'deposit',
            amount: product.sellPrice * permission.qty,
            method: 'نقدي',
            note: `صرف بضاعة: ${product.name} (${permission.qty})`,
            date: new Date().toISOString().split('T')[0],
            warehouseId: permission.fromWarehouseId,
            time: new Date().toLocaleTimeString('ar')
        });
        if (typeof addCashierTransaction === 'function') {
            addCashierTransaction('sale', product.sellPrice * permission.qty, 'نقدي', `صرف بضاعة: ${product.name}`);
        }

    } else if (permission.type === 'add' || permission.type === 'inventory' || permission.type === 'adjustment') {
        let toProduct = window.warehouseProducts.find(wp =>
            wp.warehouseId === permission.toWarehouseId &&
            wp.productId === permission.productId
        );
        if (!toProduct) {
            toProduct = { warehouseId: permission.toWarehouseId, productId: permission.productId, qty: 0 };
            window.warehouseProducts.push(toProduct);
        }
        toProduct.qty += permission.qty;
    }

    permission.status = 'executed';
    saveAll();
    addAuditLog('add', 'permission', `تنفيذ إذن ${permission.type}`);
    renderPermissions();
    renderProducts();
    if (typeof renderCashier === 'function') renderCashier();
    updateDashboard();
    showToast('✅ تم تنفيذ الإذن', 'success');
}

function executeSelectedPermission() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const pending = window.permissions.filter(p => p.status === 'pending');
    if (pending.length === 0) { showToast('⚠️ لا توجد إذونات معلقة', 'warning'); return; }
    executePermission(pending[0].id);
}

function cancelPermission(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ إلغاء الإذن؟')) return;

    const permission = window.permissions.find(p => p.id === id);
    if (permission) {
        permission.status = 'cancelled';
        saveAll();
        addAuditLog('edit', 'permission', `إلغاء إذن`);
        renderPermissions();
        showToast('❌ تم إلغاء الإذن', 'info');
    }
}

function deletePermission(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الإذن؟')) return;

    window.permissions = window.permissions.filter(p => p.id !== id);
    saveAll();
    addAuditLog('delete', 'permission', `حذف إذن`);
    renderPermissions();
    showToast('🗑️ تم الحذف', 'info');
}


// ================================================================
// REPORTS MODULE - التقارير
// ================================================================

function generateReport(type) {
    const container = document.getElementById('reportResult');
    if (!container) return;

    let html = '';

    const totalSales = window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);

    const totalPurchases = window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);

    const totalExpenses = window.expenses.reduce((s, e) => s + e.amount, 0);
    const profit = totalSales - totalPurchases - totalExpenses;

    switch (type) {
        case 'sales':
            const salesByWarehouse = {};
            window.sales.forEach(s => {
                const wId = s.warehouseId || 0;
                const w = window.warehouses.find(wh => wh.id === wId);
                const wName = w ? w.name : 'غير محدد';
                const total = s.totalWithTax || s.total || 0;
                salesByWarehouse[wName] = (salesByWarehouse[wName] || 0) + total;
            });

            let salesDetails = '';
            window.sales.slice().reverse().forEach(s => {
                const total = s.totalWithTax || s.total || 0;
                salesDetails += `
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                        <span>${s.date}</span>
                        <span>${s.customer}</span>
                        <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                    </div>
                `;
            });

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 تقرير المبيعات</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">إجمالي المبيعات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)} 🇪🇬</span></div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="font-weight:700;color:#C9A94E;font-size:12px;margin-bottom:4px;">🏢 حسب المخزن:</div>
                        ${Object.entries(salesByWarehouse).map(([name, total]) => 
                            `<div style="padding:2px 0;color:#F5E6C8;">• ${name}: ${total.toFixed(2)} 🇪🇬</div>`
                        ).join('') || '<div style="color:#5D5D5D;">لا توجد بيانات</div>'}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:11px;border:1px solid #2D2D2D;max-height:200px;overflow-y:auto;">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:2px solid #C9A94E;">
                            <span>التاريخ</span><span>العميل</span><span>المبلغ</span>
                        </div>
                        ${salesDetails || '<div style="padding:8px;color:#5D5D5D;">لا توجد فواتير</div>'}
                    </div>
                </div>
            `;
            break;

        case 'purchases':
            const purchasesByWarehouse = {};
            window.purchases.forEach(p => {
                const wId = p.warehouseId || 0;
                const w = window.warehouses.find(wh => wh.id === wId);
                const wName = w ? w.name : 'غير محدد';
                const total = p.totalWithTax || p.total || 0;
                purchasesByWarehouse[wName] = (purchasesByWarehouse[wName] || 0) + total;
            });

            let purchasesDetails = '';
            window.purchases.slice().reverse().forEach(p => {
                const total = p.totalWithTax || p.total || 0;
                purchasesDetails += `
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                        <span>${p.date}</span>
                        <span>${p.supplier}</span>
                        <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                    </div>
                `;
            });

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 تقرير المشتريات</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;">${totalPurchases.toFixed(2)} 🇪🇬</span></div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="font-weight:700;color:#C9A94E;font-size:12px;margin-bottom:4px;">🏢 حسب المخزن:</div>
                        ${Object.entries(purchasesByWarehouse).map(([name, total]) => 
                            `<div style="padding:2px 0;color:#F5E6C8;">• ${name}: ${total.toFixed(2)} 🇪🇬</div>`
                        ).join('') || '<div style="color:#5D5D5D;">لا توجد بيانات</div>'}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:11px;border:1px solid #2D2D2D;max-height:200px;overflow-y:auto;">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:2px solid #C9A94E;">
                            <span>التاريخ</span><span>المورد</span><span>المبلغ</span>
                        </div>
                        ${purchasesDetails || '<div style="padding:8px;color:#5D5D5D;">لا توجد فواتير</div>'}
                    </div>
                </div>
            `;
            break;

        case 'profit':
            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">💰 تقرير الأرباح</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">الإيرادات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">التكاليف</span><span class="detail-value" style="color:#E06060;">${(totalPurchases+totalExpenses).toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">صافي الربح</span><span class="detail-value" style="color:#C9A94E;font-size:17px;">${profit.toFixed(2)} 🇪🇬</span></div>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">هامش الربح</span><span class="detail-value">${totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0}%</span></div>
                </div>
            `;
            break;

        case 'inventory':
            const inventoryData = window.products.map(p => {
                const qty = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0);
                return { name: p.name, qty: qty, buyPrice: p.buyPrice, sellPrice: p.sellPrice, value: qty * p.sellPrice };
            }).sort((a, b) => b.value - a.value);

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📦 تقرير المخزون</h4>
                    <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                        <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                            <span>المنتج</span><span>الكمية</span><span>سعر الشراء</span><span>سعر البيع</span><span>القيمة</span>
                        </div>
                        ${inventoryData.map(p => `
                            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                                <span>${p.name}</span>
                                <span>${p.qty}</span>
                                <span>${p.buyPrice.toFixed(2)}</span>
                                <span>${p.sellPrice.toFixed(2)}</span>
                                <span style="color:#C9A94E;font-weight:700;">${p.value.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div><span style="font-weight:600;color:#A89070;">إجمالي القيمة:</span> <span style="color:#C9A94E;font-weight:700;">${inventoryData.reduce((s,p) => s + p.value, 0).toFixed(2)} 🇪🇬</span></div>
                            <div><span style="font-weight:600;color:#A89070;">عدد المنتجات:</span> <span style="color:#C9A94E;font-weight:700;">${inventoryData.length}</span></div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'customers_report':
            const customerData = window.customers.map(c => {
                const total = window.sales.filter(s => s.customer === c.name).reduce((sum, s) => {
                    if (s.items) return sum + s.items.reduce((ss, item) => ss + (item.total || 0), 0);
                    return sum + (s.total || 0);
                }, 0);
                return { name: c.name, total: total };
            }).sort((a, b) => b.total - a.total);

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">👤 تقرير العملاء</h4>
                    <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                            <span>العميل</span><span>إجمالي المشتريات</span>
                        </div>
                        ${customerData.map(c => `
                            <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                                <span>${c.name}</span>
                                <span style="color:#2D8F5E;font-weight:700;">${c.total.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div><span style="font-weight:600;color:#A89070;">عدد العملاء:</span> <span style="color:#C9A94E;font-weight:700;">${window.customers.length}</span></div>
                            <div><span style="font-weight:600;color:#A89070;">إجمالي المشتريات:</span> <span style="color:#C9A94E;font-weight:700;">${customerData.reduce((s,c) => s + c.total, 0).toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'warehouse':
            const warehouseData = window.warehouses.map(w => {
                const count = window.warehouseProducts.filter(wp => wp.warehouseId === w.id).reduce((s, wp) => s + wp.qty, 0);
                const value = window.warehouseProducts.filter(wp => wp.warehouseId === w.id).reduce((s, wp) => {
                    const p = window.products.find(pr => pr.id === wp.productId);
                    return s + (p ? p.sellPrice * wp.qty : 0);
                }, 0);
                return { name: w.name, type: w.type, count: count, value: value };
            });

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">🏢 تقرير المخازن</h4>
                    <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                        <div style="display:grid;grid-template-columns:1.2fr 0.8fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                            <span>اسم المخزن</span><span>النوع</span><span>عدد المنتجات</span><span>القيمة</span>
                        </div>
                        ${warehouseData.map(w => `
                            <div style="display:grid;grid-template-columns:1.2fr 0.8fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                                <span><strong>${w.name}</strong></span>
                                <span style="color:${w.type === 'رئيسي' ? '#2D8F5E' : w.type === 'محل' ? '#E6A830' : '#4A8AB5'};font-weight:700;">${w.type}</span>
                                <span>${w.count}</span>
                                <span style="color:#C9A94E;font-weight:700;">${w.value.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div><span style="font-weight:600;color:#A89070;">عدد المخازن:</span> <span style="color:#C9A94E;font-weight:700;">${window.warehouses.length}</span></div>
                            <div><span style="font-weight:600;color:#A89070;">إجمالي القيمة:</span> <span style="color:#C9A94E;font-weight:700;">${warehouseData.reduce((s,w) => s + w.value, 0).toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'expenses':
            const expensesByMethod = {};
            window.expenses.forEach(e => {
                const method = e.method || 'نقدي';
                expensesByMethod[method] = (expensesByMethod[method] || 0) + e.amount;
            });

            let expensesDetails = '';
            window.expenses.slice().reverse().forEach(e => {
                expensesDetails += `
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;">
                        <span>${e.date}</span>
                        <span>${e.note}</span>
                        <span>${e.method || 'نقدي'}</span>
                        <span style="color:#E06060;font-weight:700;">${e.amount.toFixed(2)}</span>
                    </div>
                `;
            });

            html = `
                <div class="accounting-detail-content">
                    <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">💸 تقرير المصروفات</h4>
                    <div class="detail-row" style="font-size:13px;"><span class="detail-label">إجمالي المصروفات</span><span class="detail-value" style="color:#E06060;">${totalExpenses.toFixed(2)} 🇪🇬</span></div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                        <div style="font-weight:700;color:#C9A94E;font-size:12px;margin-bottom:4px;">💳 حسب طريقة الدفع:</div>
                        ${Object.entries(expensesByMethod).map(([method, total]) => 
                            `<div style="padding:2px 0;color:#F5E6C8;">• ${method}: ${total.toFixed(2)} 🇪🇬</div>`
                        ).join('') || '<div style="color:#5D5D5D;">لا توجد بيانات</div>'}
                    </div>
                    <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:11px;border:1px solid #2D2D2D;max-height:200px;overflow-y:auto;">
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:2px solid #C9A94E;">
                            <span>التاريخ</span><span>البيان</span><span>الطريقة</span><span>المبلغ</span>
                        </div>
                        ${expensesDetails || '<div style="padding:8px;color:#5D5D5D;">لا توجد مصروفات</div>'}
                    </div>
                </div>
            `;
            break;

        default:
            html = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">اختر تقريراً</div><div class="desc">اضغط على أحد التقارير أعلاه</div></div></div>`;
    }

    container.innerHTML = html;
    addAuditLog('add', 'report', `عرض تقرير ${type}`);
}


// ================================================================
// ACCOUNTING MODULE - المحاسبات
// ================================================================

function updateAccounting() {
    const totalSales = window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);
    const totalPurchases = window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);
    const totalExpenses = window.expenses.reduce((s, e) => s + e.amount, 0);
    const profit = totalSales - totalPurchases - totalExpenses;

    safeSetText('accountingSales', totalSales.toFixed(2));
    safeSetText('accountingPurchases', totalPurchases.toFixed(2));
    safeSetText('accountingProfit', profit.toFixed(2));
}

function showLedger() {
    const container = document.getElementById('accountingResult');
    if (!container) return;

    const allTransactions = [
        ...window.sales.map(s => ({ date: s.date, name: s.customer, amount: s.total, type: 'بيع' })),
        ...window.purchases.map(p => ({ date: p.date, name: p.supplier, amount: p.total, type: 'شراء' })),
        ...window.expenses.map(e => ({ date: e.date, name: e.note, amount: e.amount, type: 'مصروف' })),
        ...window.treasury.map(t => ({ date: t.date, name: t.note, amount: t.amount, type: t.type === 'deposit' ? 'إيداع' : 'سحب' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalDebit = allTransactions.filter(t => t.type === 'بيع' || t.type === 'إيداع').reduce((s, t) => s + t.amount, 0);
    const totalCredit = allTransactions.filter(t => t.type === 'شراء' || t.type === 'مصروف' || t.type === 'سحب').reduce((s, t) => s + t.amount, 0);
    const balance = totalDebit - totalCredit;

    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📒 دفتر الأستاذ</h4>
            <div style="max-height:250px;overflow-y:auto;font-size:12px;">
                <div style="display:grid;grid-template-columns:1fr 1.5fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>التاريخ</span><span>البيان</span><span>النوع</span><span>المبلغ</span>
                </div>
                ${allTransactions.slice(0, 50).map(t => `
                    <div style="display:grid;grid-template-columns:1fr 1.5fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                        <span style="font-size:10px;">${t.date}</span>
                        <span>${t.name}</span>
                        <span style="color:${t.type === 'بيع' || t.type === 'إيداع' ? '#2D8F5E' : '#E06060'};font-size:10px;">${t.type}</span>
                        <span style="font-weight:700;">${t.amount ? t.amount.toFixed(2) : '0.00'}</span>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;color:#F5E6C8;">
                    <div><span style="font-weight:600;color:#A89070;">المدين:</span> <span style="color:#2D8F5E;font-weight:700;">${totalDebit.toFixed(2)}</span></div>
                    <div><span style="font-weight:600;color:#A89070;">الدائن:</span> <span style="color:#E06060;font-weight:700;">${totalCredit.toFixed(2)}</span></div>
                    <div><span style="font-weight:600;color:#A89070;">الرصيد:</span> <span style="color:#C9A94E;font-weight:700;">${balance.toFixed(2)}</span></div>
                </div>
            </div>
        </div>
    `;
    addAuditLog('add', 'report', 'عرض دفتر الأستاذ');
}

function showAudit() {
    const container = document.getElementById('accountingResult');
    if (!container) return;

    const totalDebit = window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);
    const totalCredit = window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) + window.expenses.reduce((s, e) => s + e.amount, 0);
    const balance = window.treasury.reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);

    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">🔍 المراجعة المالية</h4>
            <div class="detail-row" style="font-size:13px;"><span class="detail-label">الإيرادات</span><span class="detail-value" style="color:#2D8F5E;">${totalDebit.toFixed(2)} 🇪🇬</span></div>
            <div class="detail-row" style="font-size:13px;"><span class="detail-label">المصروفات</span><span class="detail-value" style="color:#E06060;">${totalCredit.toFixed(2)} 🇪🇬</span></div>
            <div class="detail-row" style="font-size:13px;"><span class="detail-label">صافي الربح</span><span class="detail-value" style="color:#C9A94E;font-size:17px;">${(totalDebit - totalCredit).toFixed(2)} 🇪🇬</span></div>
            <div class="detail-row" style="font-size:13px;"><span class="detail-label">رصيد الخزنة</span><span class="detail-value">${balance.toFixed(2)} 🇪🇬</span></div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                ${Math.abs(totalDebit - totalCredit) < 0.01 ? '✅ الحسابات متوازنة' : '⚠️ يوجد اختلاف'}
            </div>
        </div>
    `;
    addAuditLog('add', 'report', 'عرض المراجعة المالية');
}

function showTrialBalance() {
    const container = document.getElementById('accountingResult');
    if (!container) return;

    const accountsData = {
        'المبيعات': { debit: 0, credit: 0 },
        'المشتريات': { debit: 0, credit: 0 },
        'المصروفات': { debit: 0, credit: 0 },
        'الخزنة': { debit: 0, credit: 0 },
        'العملاء': { debit: 0, credit: 0 },
        'الموردين': { debit: 0, credit: 0 }
    };

    window.sales.forEach(s => {
        const total = s.totalWithTax || s.total || 0;
        accountsData['المبيعات'].credit += total;
        accountsData['العملاء'].debit += total;
    });
    window.purchases.forEach(p => {
        const total = p.totalWithTax || p.total || 0;
        accountsData['المشتريات'].debit += total;
        accountsData['الموردين'].credit += total;
    });
    window.expenses.forEach(e => accountsData['المصروفات'].debit += e.amount);
    window.treasury.forEach(t => {
        if (t.type === 'deposit') accountsData['الخزنة'].debit += t.amount;
        else accountsData['الخزنة'].credit += t.amount;
    });

    const totalDebit = Object.values(accountsData).reduce((s, a) => s + a.debit, 0);
    const totalCredit = Object.values(accountsData).reduce((s, a) => s + a.credit, 0);

    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">⚖️ ميزان المراجعة</h4>
            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;font-size:12px;color:#F5E6C8;">
                <span>الحساب</span><span>مدين</span><span>دائن</span>
            </div>
            ${Object.entries(accountsData).map(([name, data]) => `
                <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                    <span>${name}</span>
                    <span style="color:#2D8F5E;">${data.debit.toFixed(2)}</span>
                    <span style="color:#E06060;">${data.credit.toFixed(2)}</span>
                </div>
            `).join('')}
            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:4px;padding:6px 0;font-weight:800;border-top:2px solid #C9A94E;margin-top:4px;font-size:12px;color:#F5E6C8;">
                <span style="color:#C9A94E;">الإجمالي</span>
                <span style="color:#2D8F5E;">${totalDebit.toFixed(2)}</span>
                <span style="color:#E06060;">${totalCredit.toFixed(2)}</span>
            </div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                ${Math.abs(totalDebit - totalCredit) < 0.01 ? '✅ متوازن' : '⚠️ غير متوازن'}
            </div>
        </div>
    `;
    addAuditLog('add', 'report', 'عرض ميزان المراجعة');
}

function showIncomeStatement() {
    const container = document.getElementById('accountingResult');
    if (!container) return;

    const totalSales = window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);
    const totalPurchases = window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0);
    const totalExpenses = window.expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;

    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📄 قائمة الدخل</h4>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;margin-bottom:6px;border:1px solid #2D2D2D;">
                <div style="font-weight:700;color:#2D8F5E;font-size:13px;">الإيرادات</div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">المبيعات</span><span class="detail-value" style="color:#2D8F5E;">${totalSales.toFixed(2)} 🇪🇬</span></div>
            </div>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;margin-bottom:6px;border:1px solid #2D2D2D;">
                <div style="font-weight:700;color:#E06060;font-size:13px;">التكاليف</div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">المشتريات</span><span class="detail-value" style="color:#E06060;">${totalPurchases.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">المصروفات</span><span class="detail-value" style="color:#E06060;">${totalExpenses.toFixed(2)} 🇪🇬</span></div>
            </div>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;border:1px solid #C9A94E;">
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">صافي الربح</span><span class="detail-value" style="color:#C9A94E;font-size:17px;">${netProfit.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">هامش الربح</span><span class="detail-value">${totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0}%</span></div>
            </div>
        </div>
    `;
    addAuditLog('add', 'report', 'عرض قائمة الدخل');
}

function showBalanceSheet() {
    const container = document.getElementById('accountingResult');
    if (!container) return;

    const totalAssets = window.treasury.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const totalLiabilities = window.treasury.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
    const inventoryValue = window.products.reduce((s, p) => {
        const qty = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((sum, wp) => sum + wp.qty, 0);
        return s + (p.buyPrice * qty);
    }, 0);
    const equity = totalAssets - totalLiabilities + inventoryValue;

    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 الميزانية العمومية</h4>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;margin-bottom:6px;border:1px solid #2D2D2D;">
                <div style="font-weight:700;color:#2D8F5E;font-size:13px;">الأصول</div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">الخزنة</span><span class="detail-value" style="color:#2D8F5E;">${totalAssets.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">المخزون</span><span class="detail-value" style="color:#2D8F5E;">${inventoryValue.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row" style="font-size:13px;font-weight:800;"><span class="detail-label">إجمالي الأصول</span><span class="detail-value" style="color:#2D8F5E;">${(totalAssets + inventoryValue).toFixed(2)} 🇪🇬</span></div>
            </div>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;margin-bottom:6px;border:1px solid #2D2D2D;">
                <div style="font-weight:700;color:#E06060;font-size:13px;">الخصوم</div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">إجمالي الخصوم</span><span class="detail-value" style="color:#E06060;">${totalLiabilities.toFixed(2)} 🇪🇬</span></div>
            </div>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;border:1px solid #C9A94E;">
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">حقوق الملكية</span><span class="detail-value" style="color:#C9A94E;font-size:17px;">${equity.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">التوازن</span><span class="detail-value">${Math.abs((totalAssets + inventoryValue) - (totalLiabilities + equity)) < 0.01 ? '✅ متوازنة' : '⚠️ غير متوازنة'}</span></div>
            </div>
        </div>
    `;
    addAuditLog('add', 'report', 'عرض الميزانية العمومية');
}

function showCashFlow() {
    const container = document.getElementById('accountingResult');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    const inflows = window.treasury.filter(t => t.type === 'deposit' && t.date >= lastMonthStr).reduce((s, t) => s + t.amount, 0);
    const outflows = window.treasury.filter(t => t.type === 'withdraw' && t.date >= lastMonthStr).reduce((s, t) => s + t.amount, 0);
    const netCashFlow = inflows - outflows;
    const totalBalance = window.treasury.reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);

    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">💰 التدفقات النقدية</h4>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;margin-bottom:6px;border:1px solid #2D2D2D;">
                <div style="font-weight:700;color:#2D8F5E;font-size:13px;">التدفقات الداخلة</div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">الإيداعات</span><span class="detail-value" style="color:#2D8F5E;">${inflows.toFixed(2)} 🇪🇬</span></div>
            </div>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;margin-bottom:6px;border:1px solid #2D2D2D;">
                <div style="font-weight:700;color:#E06060;font-size:13px;">التدفقات الخارجة</div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">السحوبات</span><span class="detail-value" style="color:#E06060;">${outflows.toFixed(2)} 🇪🇬</span></div>
            </div>
            <div style="padding:6px;background:#0D0D0D;border-radius:6px;border:1px solid #C9A94E;">
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">صافي التدفق</span><span class="detail-value" style="color:${netCashFlow >= 0 ? '#2D8F5E' : '#E06060'};font-size:17px;">${netCashFlow.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row" style="font-size:13px;"><span class="detail-label">الرصيد النهائي</span><span class="detail-value" style="color:#C9A94E;font-size:17px;">${totalBalance.toFixed(2)} 🇪🇬</span></div>
            </div>
        </div>
    `;
    addAuditLog('add', 'report', 'عرض التدفقات النقدية');
}


// ================================================================
// CASHIER MODULE - إدارة الكاشف
// ================================================================

let cashierDayOpen = false;
let currentCashier = null;

function getLastCashier() {
    if (window.cashierHistory.length === 0) return null;
    return window.cashierHistory[window.cashierHistory.length - 1];
}

function cashierOpenDay() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const today = getTodayDate();
    const openDay = window.cashierHistory.find(c => c.date === today && c.status === 'open');
    if (openDay) {
        showToast('⚠️ اليوم مفتوح بالفعل', 'warning');
        return;
    }
    const lastCashier = getLastCashier();
    const openingBalance = lastCashier ? lastCashier.closingBalance : 0;
    const dt = getCurrentDateTime();

    const newCashier = {
        id: Date.now(),
        date: today,
        status: 'open',
        openingBalance: openingBalance,
        closingBalance: openingBalance,
        openTime: getCurrentTime(),
        openDate: dt.date,
        closeTime: null,
        totalSales: 0,
        totalExpenses: 0,
        totalCash: 0,
        totalWallet: 0,
        totalBank: 0,
        totalInstapay: 0,
        transactions: [],
        closedAt: null,
        closedBy: 'admin'
    };

    window.cashierHistory.push(newCashier);
    currentCashier = newCashier;
    cashierDayOpen = true;
    setData('cashierHistory', window.cashierHistory);
    saveAll();
    addAuditLog('add', 'cashier', `فتح اليوم ${today} - الساعة ${getCurrentTime()} - الرصيد الافتتاحي: ${openingBalance}`);
    renderCashier();
    showToast(`✅ تم فتح اليوم - الرصيد الافتتاحي: ${openingBalance.toFixed(2)}`, 'success');
    addAlert(`🟢 فتح اليوم`, `تم فتح اليوم ${today} - الساعة ${getCurrentTime()} - الرصيد: ${openingBalance.toFixed(2)}`, 'success');
}

function addCashierTransaction(type, amount, method, note) {
    const today = getTodayDate();
    let cashier = window.cashierHistory.find(c => c.date === today && c.status === 'open');
    if (!cashier) {
        cashierOpenDay();
        cashier = window.cashierHistory.find(c => c.date === today && c.status === 'open');
        if (!cashier) {
            showToast('⚠️ لا يمكن إضافة حركة - افتح اليوم أولاً', 'error');
            return;
        }
    }

    const transaction = {
        id: Date.now(),
        type: type,
        amount: amount,
        method: method,
        note: note,
        time: getCurrentTime(),
        date: today
    };

    cashier.transactions.push(transaction);
    if (type === 'sale') {
        cashier.totalSales += amount;
        if (method === 'نقدي') cashier.totalCash += amount;
        else if (method === 'محفظة') cashier.totalWallet += amount;
        else if (method === 'بنك') cashier.totalBank += amount;
        else if (method === 'إنستاباي') cashier.totalInstapay += amount;
    } else if (type === 'expense') {
        cashier.totalExpenses += amount;
        if (method === 'نقدي') cashier.totalCash -= amount;
        else if (method === 'محفظة') cashier.totalWallet -= amount;
        else if (method === 'بنك') cashier.totalBank -= amount;
    }
    cashier.closingBalance = cashier.openingBalance + cashier.totalSales - cashier.totalExpenses;

    currentCashier = cashier;
    cashierDayOpen = true;
    const index = window.cashierHistory.findIndex(c => c.id === cashier.id);
    if (index !== -1) {
        window.cashierHistory[index] = cashier;
    }
    setData('cashierHistory', window.cashierHistory);
    saveAll();
    renderCashier();
}

function cashierCloseDay() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const today = getTodayDate();
    const cashier = window.cashierHistory.find(c => c.date === today && c.status === 'open');
    if (!cashier) {
        showToast('⚠️ لا يوجد يوم مفتوح لإغلاقه', 'warning');
        return;
    }
    if (cashier.transactions.length === 0) {
        if (!confirm('⚠️ لا توجد حركات اليوم، هل تريد إغلاق اليوم؟')) return;
    }
    cashier.status = 'closed';
    cashier.closeTime = getCurrentTime();
    cashier.closedAt = new Date().toISOString();
    cashier.closingBalance = cashier.openingBalance + cashier.totalSales - cashier.totalExpenses;

    const index = window.cashierHistory.findIndex(c => c.id === cashier.id);
    if (index !== -1) {
        window.cashierHistory[index] = cashier;
    }
    currentCashier = null;
    cashierDayOpen = false;
    setData('cashierHistory', window.cashierHistory);
    saveAll();
    addAuditLog('add', 'cashier', `إغلاق اليوم ${today} - الساعة ${getCurrentTime()} - الرصيد الختامي: ${cashier.closingBalance}`);
    renderCashier();
    showToast(`✅ تم إغلاق اليوم - الرصيد: ${cashier.closingBalance.toFixed(2)}`, 'success');
    addAlert(`🔴 إغلاق اليوم`, `تم إغلاق اليوم ${today} - الساعة ${getCurrentTime()} - الرصيد: ${cashier.closingBalance.toFixed(2)}`, 'info');
}

function renderCashier() {
    const today = getTodayDate();
    const cashier = window.cashierHistory.find(c => c.date === today && c.status === 'open');
    const lastCashier = getLastCashier();
    const dt = getCurrentDateTime();

    safeSetText('cashierDate', dt.date + ' ' + dt.time);
    const badge = document.getElementById('cashierStatusBadge');
    if (cashier) {
        badge.textContent = '🟢 مفتوح - ' + cashier.openTime;
        badge.style.background = '#2D8F5E';
        cashierDayOpen = true;
        currentCashier = cashier;
    } else {
        badge.textContent = '🔴 مغلق';
        badge.style.background = '#E06060';
        cashierDayOpen = false;
        currentCashier = null;
    }

    if (cashier) {
        safeSetText('cashierOpeningBalance', cashier.openingBalance.toFixed(2));
        safeSetText('cashierTotalSales', cashier.totalSales.toFixed(2));
        safeSetText('cashierTotalExpenses', cashier.totalExpenses.toFixed(2));
        safeSetText('cashierClosingBalance', cashier.closingBalance.toFixed(2));
        safeSetText('cashierCash', cashier.totalCash.toFixed(2));
        safeSetText('cashierWallet', cashier.totalWallet.toFixed(2));
        safeSetText('cashierBank', cashier.totalBank.toFixed(2));
        safeSetText('cashierInstapay', cashier.totalInstapay.toFixed(2));
        safeSetText('cashierTransactionCount', cashier.transactions.length);
        safeSetText('cashierTodayCount', cashier.transactions.length);

        const container = document.getElementById('cashierTodayTransactions');
        if (cashier.transactions.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-receipt" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد حركات اليوم</span></div>`;
        } else {
            const typeNames = { sale: '💰 بيع', expense: '💸 مصروف', deposit: '📥 إيداع', withdraw: '📤 سحب' };
            const typeColors = { sale: '#2D8F5E', expense: '#E06060', deposit: '#4A8AB5', withdraw: '#E6A830' };
            const sign = { sale: '+', expense: '-', deposit: '+', withdraw: '-' };
            container.innerHTML = cashier.transactions.slice().reverse().map(t => `
                <div style="display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #2D2D2D;font-size:11px;color:#F5E6C8;">
                    <div><span style="color:${typeColors[t.type]};font-weight:700;">${typeNames[t.type] || t.type}</span> <span style="color:#5D5D5D;font-size:9px;">${t.time}</span></div>
                    <div style="font-weight:700;color:${t.type === 'sale' || t.type === 'deposit' ? '#2D8F5E' : '#E06060'};">
                        ${sign[t.type] || ''} ${t.amount.toFixed(2)}
                    </div>
                    <div style="font-size:9px;color:#A89070;">${t.note || ''}</div>
                </div>
            `).join('');
        }
    } else {
        safeSetText('cashierOpeningBalance', lastCashier ? lastCashier.closingBalance.toFixed(2) : '0.00');
        safeSetText('cashierTotalSales', '0.00');
        safeSetText('cashierTotalExpenses', '0.00');
        safeSetText('cashierClosingBalance', lastCashier ? lastCashier.closingBalance.toFixed(2) : '0.00');
        safeSetText('cashierCash', '0.00');
        safeSetText('cashierWallet', '0.00');
        safeSetText('cashierBank', '0.00');
        safeSetText('cashierInstapay', '0.00');
        safeSetText('cashierTransactionCount', '0');
        safeSetText('cashierTodayCount', '0');
        const container = document.getElementById('cashierTodayTransactions');
        container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-receipt" style="font-size:28px;"></i><span style="font-size:13px;">افتح اليوم لبدء تسجيل الحركات</span></div>`;
    }

    const historyContainer = document.getElementById('cashierHistory');
    if (window.cashierHistory.length === 0) {
        historyContainer.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-calendar" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد سجلات سابقة</span></div>`;
    } else {
        historyContainer.innerHTML = window.cashierHistory.slice().reverse().slice(0, 10).map(c => `
            <div class="cashier-history-item">
                <div class="header"><span>📅 ${c.date}</span><span style="color:${c.status === 'open' ? '#2D8F5E' : '#E06060'};">
                    ${c.status === 'open' ? '🟢 مفتوح - ' + c.openTime : '🔴 مغلق - ' + c.closeTime}</span></div>
                <div class="details">
                    <span>💰 فتح: ${c.openingBalance.toFixed(2)}</span>
                    <span>💰 ختام: ${c.closingBalance.toFixed(2)}</span>
                    <span>📊 حركات: ${c.transactions.length}</span>
                </div>
                <div class="details">
                    <span>📈 مبيعات: ${c.totalSales.toFixed(2)}</span>
                    <span>📉 مصروفات: ${c.totalExpenses.toFixed(2)}</span>
                    <span style="color:${c.status === 'open' ? '#E6A830' : '#C9A94E'};">
                        ${c.status === 'open' ? '⏳ مفتوح' : `🕐 ${c.closeTime || '-'}`}
                    </span>
                </div>
            </div>
        `).join('');
    }
}

function cashierPrintReport() {
    const today = getTodayDate();
    const cashier = window.cashierHistory.find(c => c.date === today);
    if (!cashier) { showToast('⚠️ لا توجد بيانات لليوم', 'error'); return; }

    const isOpen = cashier.status === 'open';
    const company = window.companyData || {};
    const dt = getCurrentDateTime();

    let html = `
        <div class="invoice-print-boxed">
            <div class="company-header">
                <h2>${company.name || 'الميزان'}</h2>
                <div class="sub-title">نظام محاسبة ونقاط بيع</div>
                <div class="contact-info">📍 ${company.address || 'القاهرة، مصر'} | 📞 ${company.phone || '0234567890'} | 📱 ${company.mobile || '01000000000'}</div>
            </div>
            <div class="invoice-info">
                <div class="info-item"><span class="label">📅 التاريخ:</span><span class="value">${cashier.date}</span></div>
                <div class="info-item"><span class="label">🕐 الوقت:</span><span class="value">${dt.time}</span></div>
            </div>
            <div style="text-align:right;padding:6px 0;border-bottom:1px solid #3D3D3D;margin-bottom:6px;">
                <div><strong>🕐 وقت الفتح:</strong> ${cashier.openTime || '-'}</div>
                ${!isOpen ? `<div><strong>🕐 وقت الإغلاق:</strong> ${cashier.closeTime || '-'}</div>` : ''}
                <div><strong>🔴 الحالة:</strong> ${isOpen ? '🟢 مفتوح' : '🔴 مغلق'}</div>
                <div><strong>💰 الرصيد الافتتاحي:</strong> ${cashier.openingBalance.toFixed(2)} 🇪🇬</div>
                <div><strong>💰 الرصيد الختامي:</strong> ${cashier.closingBalance.toFixed(2)} 🇪🇬</div>
                <div><strong>📈 إجمالي المبيعات:</strong> ${cashier.totalSales.toFixed(2)} 🇪🇬</div>
                <div><strong>📉 إجمالي المصروفات:</strong> ${cashier.totalExpenses.toFixed(2)} 🇪🇬</div>
                <div><strong>📊 صافي اليوم:</strong> ${(cashier.totalSales - cashier.totalExpenses).toFixed(2)} 🇪🇬</div>
            </div>
            <div style="text-align:right;padding:6px 0;border-bottom:1px solid #3D3D3D;margin-bottom:6px;">
                <div><strong>💵 نقدي:</strong> ${cashier.totalCash.toFixed(2)} 🇪🇬</div>
                <div><strong>📱 محفظة:</strong> ${cashier.totalWallet.toFixed(2)} 🇪🇬</div>
                <div><strong>🏦 بنك:</strong> ${cashier.totalBank.toFixed(2)} 🇪🇬</div>
                <div><strong>📲 إنستاباي:</strong> ${cashier.totalInstapay.toFixed(2)} 🇪🇬</div>
            </div>
            <div style="text-align:right;font-size:11px;color:#A89070;padding:6px 0;">
                <div><strong>📋 عدد الحركات:</strong> ${cashier.transactions.length}</div>
                ${cashier.transactions.slice(-10).map(t => `
                    <div style="font-size:9px;padding:2px 0;">• ${t.time} ${t.note || ''}: ${t.amount.toFixed(2)}</div>
                `).join('')}
            </div>
            <div class="footer-box">
                <div class="thanks">خالص مع الشكر</div>
                <div class="payment-methods">
                    ${company.vodafone ? `<div><span class="pm-label">📱 فودافون كاش:</span> <span class="pm-value">${company.vodafone}</span></div>` : ''}
                    ${company.instapay ? `<div><span class="pm-label">📲 إنستاباي:</span> <span class="pm-value">${company.instapay}</span></div>` : ''}
                    ${company.bankAccount ? `<div><span class="pm-label">🏦 بنك:</span> <span class="pm-value">${company.bankAccount}</span></div>` : ''}
                    ${company.cash ? `<div><span class="pm-label">💰 كاش:</span> <span class="pm-value">${company.cash}</span></div>` : ''}
                </div>
                <div style="font-size:9px;color:#5D5D5D;">تم الطباعة في ${new Date().toLocaleString('ar')}</div>
            </div>
        </div>
    `;

    const win = window.open('', '_blank', 'width=400,height=650');
    if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
    } else {
        showToast('⚠️ تم حظر النافذة', 'error');
    }
    addAuditLog('add', 'cashier', 'طباعة تقرير الكاشف');
}