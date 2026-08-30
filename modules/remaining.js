// ================================================================
// remaining.js - جميع الموديولات المتبقية (الملف الكامل)
// ================================================================

// ================================================================
// SALES MODULE - إدارة المبيعات
// ================================================================

if (typeof window.salesItems === 'undefined') {
    window.salesItems = [];
}

// ================================================================
// ADD SALES ITEM - إضافة صنف إلى فاتورة البيع
// ================================================================
function addSalesItem() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const productSelect = document.getElementById('salesItemProduct');
    const qtyInput = document.getElementById('salesItemQty');
    const priceInput = document.getElementById('salesItemPrice');
    const warehouseSelect = document.getElementById('salesWarehouse');

    if (!productSelect || !qtyInput || !priceInput || !warehouseSelect) {
        showToast('⚠️ حقول الإضافة غير موجودة', 'error');
        return;
    }

    const productId = parseInt(productSelect.value);
    const qty = parseInt(qtyInput.value);
    const price = parseFloat(priceInput.value);
    const warehouseId = parseInt(warehouseSelect.value);

    if (!productId || productId === 0) {
        showToast('⚠️ اختر منتجاً أولاً', 'error');
        return;
    }

    if (!qty || qty <= 0) {
        showToast('⚠️ أدخل كمية صحيحة', 'error');
        return;
    }

    if (isNaN(price) || price <= 0) {
        showToast('⚠️ أدخل سعراً صحيحاً', 'error');
        return;
    }

    if (!warehouseId || warehouseId === 0) {
        showToast('⚠️ اختر مخزناً أولاً', 'error');
        return;
    }

    const product = window.products.find(p => p.id === productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }

    const warehouseProduct = window.warehouseProducts.find(wp => 
        wp.warehouseId === warehouseId && wp.productId === productId
    );

    if (!warehouseProduct || warehouseProduct.qty < qty) {
        const available = warehouseProduct ? warehouseProduct.qty : 0;
        showToast(`⚠️ الكمية غير متوفرة (المتاح: ${available})`, 'error');
        return;
    }

    if (typeof window.salesItems === 'undefined') {
        window.salesItems = [];
    }

    const existingItem = window.salesItems.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.qty += qty;
        existingItem.total = existingItem.qty * existingItem.price;
        showToast(`✅ تم تحديث كمية ${product.name}`, 'success');
    } else {
        window.salesItems.push({
            productId: product.id,
            productName: product.name,
            qty: qty,
            price: price,
            total: qty * price,
            warehouseId: warehouseId
        });
        showToast(`✅ تم إضافة ${product.name}`, 'success');
    }

    renderSalesItems();
    qtyInput.value = '';
    priceInput.value = '';
    productSelect.value = '';

    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }

    if (typeof addAuditLog === 'function') {
        addAuditLog('add', 'sales_item', `إضافة صنف ${product.name} - الكمية: ${qty} - السعر: ${price}`);
    }
}

// ================================================================
// RENDER SALES ITEMS - عرض الأصناف في فاتورة البيع
// ================================================================
function renderSalesItems() {
    const tbody = document.getElementById('salesItemsBody');
    if (!tbody) return;

    if (typeof window.salesItems === 'undefined') {
        window.salesItems = [];
    }

    let html = '';
    let total = 0;

    window.salesItems.forEach((item, index) => {
        total += item.total;
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName || 'غير معروف'}</td>
                <td>${item.qty || 0}</td>
                <td>${(item.price || 0).toFixed(2)}</td>
                <td>${(item.total || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removeSalesItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center;color:#5D5D5D;padding:8px;">لا توجد أصناف</td></tr>';
    
    safeSetText('salesItemsCount', window.salesItems.length);
    safeSetText('salesTotalAmount', total.toFixed(2));
    updateSalesTaxInfo();
}

// ================================================================
// REMOVE SALES ITEM - حذف صنف من فاتورة البيع
// ================================================================
function removeSalesItem(index) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    if (!confirm('⚠️ هل تريد حذف هذا الصنف؟')) return;

    if (typeof window.salesItems === 'undefined') {
        window.salesItems = [];
        return;
    }

    if (index < 0 || index >= window.salesItems.length) {
        showToast('⚠️ الصنف غير موجود', 'error');
        return;
    }

    const removedItem = window.salesItems[index];
    window.salesItems.splice(index, 1);
    
    renderSalesItems();
    showToast(`🗑️ تم حذف ${removedItem?.productName || 'الصنف'}`, 'info');

    if (typeof addAuditLog === 'function') {
        addAuditLog('delete', 'sales_item', `حذف صنف ${removedItem?.productName || ''} من فاتورة البيع`);
    }
}

// ================================================================
// UPDATE SALES PRICE - تحديث سعر البيع عند اختيار منتج
// ================================================================
function updateSalesPrice() {
    const select = document.getElementById('salesItemProduct');
    const priceInput = document.getElementById('salesItemPrice');
    if (!select || !priceInput) return;

    const productId = parseInt(select.value);
    if (!productId) {
        priceInput.value = '';
        return;
    }

    const product = window.products.find(p => p.id === productId);
    if (product) {
        priceInput.value = product.sellPrice || 0;
    } else {
        priceInput.value = '';
    }
}

// ================================================================
// UPDATE SALES TAX INFO - تحديث معلومات الضريبة
// ================================================================
function updateSalesTaxInfo() {
    const totalEl = document.getElementById('salesTotalAmount');
    const infoEl = document.getElementById('salesTaxInfo');
    const typeSelect = document.getElementById('salesInvoiceType');
    
    if (!totalEl || !infoEl || !typeSelect) return;

    const total = parseFloat(totalEl.textContent) || 0;
    const invoiceType = typeSelect.value || 'simple';

    if (invoiceType === 'tax' && total > 0) {
        const tax = (total * 14) / 100;
        infoEl.textContent = `📊 الضريبة (14%): ${tax.toFixed(2)} | الإجمالي مع الضريبة: ${(total + tax).toFixed(2)} 🇪🇬`;
        infoEl.style.display = 'block';
    } else {
        infoEl.textContent = '';
        infoEl.style.display = 'none';
    }
}

// ================================================================
// SAVE SALE INVOICE - حفظ فاتورة البيع
// ================================================================
function saveSaleInvoice() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const customer = document.getElementById('salesCustomer')?.value?.trim() ||
        document.getElementById('salesCustomerSelect')?.value;
    const date = document.getElementById('salesDate')?.value || getTodayDate();
    const payment = getSelectedPayment('sales');
    const warehouseId = parseInt(document.getElementById('salesWarehouse')?.value);
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';

    if (!customer) {
        showToast('⚠️ أدخل العميل', 'error');
        return;
    }
    if (!window.salesItems || window.salesItems.length === 0) {
        showToast('⚠️ أضف صنف واحد على الأقل', 'error');
        return;
    }
    if (!warehouseId) {
        showToast('⚠️ اختر مخزن', 'error');
        return;
    }

    let totalAmount = 0;
    const itemsCopy = JSON.parse(JSON.stringify(window.salesItems));
    
    for (const item of window.salesItems) {
        const wp = window.warehouseProducts.find(w => 
            w.warehouseId === warehouseId && w.productId === item.productId
        );
        if (wp) {
            wp.qty -= item.qty;
            totalAmount += item.total;
        }
    }

    const taxRate = 14;
    const taxAmount = invoiceType === 'tax' ? (totalAmount * taxRate) / 100 : 0;
    const totalWithTax = totalAmount + taxAmount;

    if (payment === 'نقدي') {
        window.treasury.push({
            id: Date.now(),
            type: 'deposit',
            amount: totalWithTax,
            note: `بيع للعميل ${customer} (${window.salesItems.length} صنف)${invoiceType === 'tax' ? ' - ضريبة 14%' : ''}`,
            method: 'نقدي',
            date: date,
            warehouseId: warehouseId,
            time: getCurrentTime()
        });
        saveAll();
    }

    const invoice = {
        id: Date.now(),
        invoiceNumber: getNextInvoiceNumber ? getNextInvoiceNumber() : Date.now(),
        customer: customer,
        date: date,
        payment: payment,
        items: itemsCopy,
        total: totalAmount,
        taxRate: invoiceType === 'tax' ? taxRate : 0,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        itemsCount: window.salesItems.length,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        type: 'sale',
        time: getCurrentTime()
    };

    window.sales.push(invoice);
    
    saveAll();
    addAuditLog('sale', 'invoice', 
        `🧾 فاتورة بيع #${invoice.invoiceNumber} - العميل: ${customer} - ${window.salesItems.length} صنف - الإجمالي: ${totalWithTax.toFixed(2)} 🇪🇬${invoiceType === 'tax' ? ' (ضريبة 14%)' : ''}`,
        invoice
    );

    renderProducts();
    renderSales();
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof addCashierTransaction === 'function') {
        addCashierTransaction('sale', totalWithTax, payment, `بيع للعميل ${customer}${invoiceType === 'tax' ? ' (بضريبة)' : ''}`);
    }

    window.salesItems = [];
    renderSalesItems();
    showToast(`✅ تم إضافة فاتورة بيع`, 'success');
    updateDashboard();

    if (totalAmount > 1000) {
        addAlert(`💰 فاتورة كبيرة`, `${totalAmount.toFixed(2)} - العميل: ${customer}`, 'success');
    }
}

// ================================================================
// RENDER SALES - عرض فواتير البيع
// ================================================================
function renderSales() {
    const container = document.getElementById('salesList');
    if (!container) return;

    if (!window.sales || window.sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    const canEditSales = canEdit();
    const canDeleteSales = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;">
        <span>العميل</span><span>المخزن</span><span>النوع</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span>
    </div>`;

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

// ================================================================
// EDIT SALE INVOICE - تعديل فاتورة بيع
// ================================================================
function editSaleInvoice(id) {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    
    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => 
                w.warehouseId === invoice.warehouseId && w.productId === item.productId
            );
            if (wp) wp.qty += item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => 
            t.note && t.note.includes(`بيع للعميل ${invoice.customer}`) && t.date === invoice.date
        );
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    const oldTotal = invoice.totalWithTax || invoice.total || 0;
    window.sales = window.sales.filter(s => s.id !== id);
    saveAll();

    document.getElementById('salesCustomerSelect').value = invoice.customer;
    document.getElementById('salesCustomer').value = invoice.customer;
    document.getElementById('salesDate').value = invoice.date;
    document.getElementById('salesWarehouse').value = invoice.warehouseId || '';
    document.getElementById('salesInvoiceType').value = invoice.invoiceType || 'simple';

    window.salesItems = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const product = window.products.find(p => p.id === item.productId);
            if (product) {
                window.salesItems.push({
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

    const newTotal = window.salesItems.reduce((sum, item) => sum + item.total, 0);
    addAuditLog('edit', 'invoice', 
        `✏️ تعديل فاتورة بيع #${invoice.invoiceNumber} - العميل: ${invoice.customer} - القديم: ${oldTotal.toFixed(2)} → الجديد: ${newTotal.toFixed(2)} 🇪🇬`,
        { id, customer: invoice.customer, oldTotal, newTotal }
    );
    
    showToast(`✏️ جاري تعديل الفاتورة`, 'info');
    renderSales();
    updateDashboard();
    navigateTo('sales');
}

// ================================================================
// DELETE SALE INVOICE - حذف فاتورة بيع
// ================================================================
function deleteSaleInvoice(id) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف الفاتورة نهائياً؟')) return;

    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => 
                w.warehouseId === invoice.warehouseId && w.productId === item.productId
            );
            if (wp) wp.qty += item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => 
            t.note && t.note.includes(`بيع للعميل ${invoice.customer}`) && t.date === invoice.date
        );
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    const total = invoice.totalWithTax || invoice.total || 0;
    window.sales = window.sales.filter(s => s.id !== id);
    saveAll();
    
    addAuditLog('delete', 'invoice', 
        `🗑️ حذف فاتورة بيع #${invoice.invoiceNumber} - العميل: ${invoice.customer} - ${invoice.items?.length || 0} صنف - الإجمالي: ${total.toFixed(2)} 🇪🇬`,
        { id, customer: invoice.customer, total, items: invoice.items }
    );
    
    renderSales();
    renderProducts();
    updateDashboard();
    showToast('🗑️ تم حذف الفاتورة', 'info');
}

// ================================================================
// SEND WHATSAPP INVOICE - إرسال فاتورة عبر واتساب
// ================================================================
function sendWhatsAppInvoice(id) {
    const invoice = window.sales.find(s => s.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    let whatsappNumber = '01011993799';
    const customerObj = window.customers.find(c => c.name === invoice.customer);
    if (customerObj?.whatsapp) {
        whatsappNumber = customerObj.whatsapp;
    } else if (customerObj?.phone) {
        whatsappNumber = customerObj.phone;
    }
    whatsappNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (!whatsappNumber.startsWith('20')) {
        whatsappNumber = '20' + whatsappNumber;
    }

    const items = invoice.items || [];
    const total = invoice.totalWithTax || invoice.total || 0;
    const company = window.companyData || {};
    const isTax = invoice.invoiceType === 'tax';
    const taxRate = 14;
    const taxAmount = isTax ? (total * taxRate) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;
    const dt = getCurrentDateTime();

    const line = '═'.repeat(36);
    let message = '';

    message += `╔${line}╗\n`;
    message += `║     🏢 ${(company.name || 'الميزان').padEnd(24)}║\n`;
    message += `║  نظام محاسبة ونقاط بيع  ${''.padEnd(12)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ 📍 ${(company.address || 'القاهرة، مصر').padEnd(26)}║\n`;
    message += `║ 📞 ${(company.phone || '0234567890').padEnd(26)}║\n`;
    message += `║ 📱 ${(company.mobile || '01000000000').padEnd(26)}║\n`;
    
    if (isTax) {
        message += `║ 🆔 الرقم الضريبي: ${(company.taxNumber || 'غير مسجل').padEnd(20)}║\n`;
        message += `║ 📋 السجل التجاري: ${(company.commercialRegister || 'غير مسجل').padEnd(18)}║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║ 📅 ${invoice.date}  🕐 ${dt.time.padEnd(16)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ 🧾 فاتورة ${isTax ? 'ضريبية' : 'عادية'.padEnd(24)}║\n`;
    message += `║ 👤 العميل: ${invoice.customer.padEnd(24)}║\n`;
    message += `║ 💳 الدفع: ${(invoice.payment || 'نقدي').padEnd(26)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ # │ المنتج    │ العدد │ السعر │\n`;
    message += `║───┼───────────┼───────┼───────╢\n`;
    
    if (items.length > 0) {
        items.forEach((item, i) => {
            const name = item.productName.length > 8 ? item.productName.substring(0, 8) + '..' : item.productName.padEnd(8);
            const num = (i + 1).toString().padStart(1);
            const qty = item.qty.toString().padStart(5);
            const price = item.price.toFixed(0).padStart(5);
            message += `║ ${num} │ ${name} │ ${qty} │ ${price} │\n`;
            const totalItem = item.total.toFixed(2).padStart(7);
            message += `║   │ الإجمالي  │      │ ${totalItem} │\n`;
        });
    } else {
        message += `║   │ لا توجد أصناف               ║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║ 💰 الإجمالي: ${total.toFixed(2).padStart(20)} 🇪🇬 ║\n`;
    
    if (isTax) {
        message += `║ 📊 الضريبة (14%): ${taxAmount.toFixed(2).padStart(19)} ║\n`;
        message += `║ 💰 الإجمالي مع الضريبة: ${totalWithTax.toFixed(2).padStart(14)} ║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║        خالص مع الشكر           ║\n`;
    message += `╠${line}╣\n`;
    
    let hasPayment = false;
    if (company.vodafone) {
        message += `║ 📱 فودافون كاش: ${company.vodafone.padEnd(20)}║\n`;
        hasPayment = true;
    }
    if (company.instapay) {
        message += `║ 📲 إنستاباي: ${company.instapay.padEnd(22)}║\n`;
        hasPayment = true;
    }
    if (company.bankAccount) {
        message += `║ 🏦 بنك: ${company.bankAccount.padEnd(24)}║\n`;
        hasPayment = true;
    }
    if (company.cash) {
        message += `║ 💰 كاش: ${company.cash.padEnd(25)}║\n`;
        hasPayment = true;
    }
    
    if (hasPayment) {
        message += `╠${line}╣\n`;
    }
    
    message += `║ 📱 رابط الدفع: bit.ly/mizan-pay  ║\n`;
    message += `╚${line}╝\n`;
    message += `\n📱 تم إرسال الفاتورة عبر الميزان`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    window.open(url, '_blank');

    if (typeof addAuditLog === 'function') {
        addAuditLog('sale', 'whatsapp', `إرسال فاتورة واتساب للعميل: ${invoice.customer} - رقم: ${whatsappNumber}`);
    }
    showToast(`📱 تم فتح واتساب للعميل ${invoice.customer}`, 'success');
}

// ================================================================
// SEND WHATSAPP - إرسال فاتورة البيع الحالية عبر واتساب
// ================================================================
function sendWhatsApp() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const customer = document.getElementById('salesCustomer')?.value?.trim() ||
        document.getElementById('salesCustomerSelect')?.value;
    if (!customer) {
        showToast('⚠️ حدد عميلاً أولاً', 'error');
        return;
    }

    if (typeof window.salesItems === 'undefined' || window.salesItems.length === 0) {
        showToast('⚠️ أضف أصنافاً أولاً', 'error');
        return;
    }

    let whatsappNumber = document.getElementById('customerWhatsApp')?.value?.trim();
    if (!whatsappNumber) {
        const customerObj = window.customers.find(c => c.name === customer);
        if (customerObj?.whatsapp) {
            whatsappNumber = customerObj.whatsapp;
        } else if (customerObj?.phone) {
            whatsappNumber = customerObj.phone;
        } else {
            whatsappNumber = '01011993799';
        }
    }

    whatsappNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (!whatsappNumber.startsWith('20')) {
        whatsappNumber = '20' + whatsappNumber;
    }

    const items = window.salesItems || [];
    const total = items.reduce((s, item) => s + (item.total || 0), 0);
    const payment = getSelectedPayment('sales');
    const invoiceType = document.getElementById('salesInvoiceType')?.value || 'simple';
    const company = window.companyData || {};
    const isTax = invoiceType === 'tax';
    const taxRate = 14;
    const taxAmount = isTax ? (total * taxRate) / 100 : 0;
    const totalWithTax = isTax ? total + taxAmount : total;
    const dt = getCurrentDateTime();

    const line = '═'.repeat(36);
    let message = '';

    message += `╔${line}╗\n`;
    message += `║     🏢 ${(company.name || 'الميزان').padEnd(24)}║\n`;
    message += `║  نظام محاسبة ونقاط بيع  ${''.padEnd(12)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ 📍 ${(company.address || 'القاهرة، مصر').padEnd(26)}║\n`;
    message += `║ 📞 ${(company.phone || '0234567890').padEnd(26)}║\n`;
    message += `║ 📱 ${(company.mobile || '01000000000').padEnd(26)}║\n`;
    
    if (isTax) {
        message += `║ 🆔 الرقم الضريبي: ${(company.taxNumber || 'غير مسجل').padEnd(20)}║\n`;
        message += `║ 📋 السجل التجاري: ${(company.commercialRegister || 'غير مسجل').padEnd(18)}║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║ 📅 ${dt.date}  🕐 ${dt.time.padEnd(16)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ 🧾 فاتورة ${isTax ? 'ضريبية' : 'عادية'.padEnd(24)}║\n`;
    message += `║ 👤 العميل: ${customer.padEnd(24)}║\n`;
    message += `║ 💳 الدفع: ${payment.padEnd(26)}║\n`;
    message += `╠${line}╣\n`;
    message += `║ # │ المنتج    │ العدد │ السعر │\n`;
    message += `║───┼───────────┼───────┼───────╢\n`;
    
    if (items.length > 0) {
        items.forEach((item, i) => {
            const name = item.productName.length > 8 ? item.productName.substring(0, 8) + '..' : item.productName.padEnd(8);
            const num = (i + 1).toString().padStart(1);
            const qty = item.qty.toString().padStart(5);
            const price = item.price.toFixed(0).padStart(5);
            message += `║ ${num} │ ${name} │ ${qty} │ ${price} │\n`;
            const totalItem = item.total.toFixed(2).padStart(7);
            message += `║   │ الإجمالي  │      │ ${totalItem} │\n`;
        });
    } else {
        message += `║   │ لا توجد أصناف               ║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║ 💰 الإجمالي: ${total.toFixed(2).padStart(20)} 🇪🇬 ║\n`;
    
    if (isTax) {
        message += `║ 📊 الضريبة (14%): ${taxAmount.toFixed(2).padStart(19)} ║\n`;
        message += `║ 💰 الإجمالي مع الضريبة: ${totalWithTax.toFixed(2).padStart(14)} ║\n`;
    }
    
    message += `╠${line}╣\n`;
    message += `║        خالص مع الشكر           ║\n`;
    message += `╠${line}╣\n`;
    
    let hasPayment = false;
    if (company.vodafone) {
        message += `║ 📱 فودافون كاش: ${company.vodafone.padEnd(20)}║\n`;
        hasPayment = true;
    }
    if (company.instapay) {
        message += `║ 📲 إنستاباي: ${company.instapay.padEnd(22)}║\n`;
        hasPayment = true;
    }
    if (company.bankAccount) {
        message += `║ 🏦 بنك: ${company.bankAccount.padEnd(24)}║\n`;
        hasPayment = true;
    }
    if (company.cash) {
        message += `║ 💰 كاش: ${company.cash.padEnd(25)}║\n`;
        hasPayment = true;
    }
    
    if (hasPayment) {
        message += `╠${line}╣\n`;
    }
    
    message += `║ 📱 رابط الدفع: bit.ly/mizan-pay  ║\n`;
    message += `╚${line}╝\n`;
    message += `\n📱 تم إرسال الفاتورة عبر الميزان`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    window.open(url, '_blank');

    if (typeof addAuditLog === 'function') {
        addAuditLog('sale', 'whatsapp', `إرسال فاتورة واتساب للعميل: ${customer} - رقم: ${whatsappNumber}`);
    }
    showToast(`📱 تم فتح واتساب للعميل ${customer}`, 'success');
}


// ================================================================
// PURCHASES MODULE - إدارة المشتريات
// ================================================================

if (typeof window.purchaseItems === 'undefined') {
    window.purchaseItems = [];
}

// ================================================================
// ADD PURCHASE ITEM - إضافة صنف إلى فاتورة الشراء
// ================================================================
function addPurchaseItem() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const productId = parseInt(document.getElementById('purchaseItemProduct')?.value);
    const qty = parseInt(document.getElementById('purchaseItemQty')?.value);
    const price = parseFloat(document.getElementById('purchaseItemPrice')?.value);

    if (!productId) {
        showToast('⚠️ اختر منتج', 'error');
        return;
    }
    if (!qty || qty <= 0) {
        showToast('⚠️ كمية صحيحة', 'error');
        return;
    }
    if (isNaN(price) || price <= 0) {
        showToast('⚠️ سعر صحيح', 'error');
        return;
    }

    const product = window.products.find(p => p.id === productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }

    if (typeof window.purchaseItems === 'undefined') {
        window.purchaseItems = [];
    }

    window.purchaseItems.push({
        productId: product.id,
        productName: product.name,
        qty: qty,
        price: price,
        total: qty * price
    });
    
    renderPurchaseItems();
    document.getElementById('purchaseItemQty').value = '';
    document.getElementById('purchaseItemPrice').value = '';
    showToast(`✅ تم إضافة ${product.name}`, 'success');
}

// ================================================================
// RENDER PURCHASE ITEMS - عرض الأصناف في فاتورة الشراء
// ================================================================
function renderPurchaseItems() {
    const tbody = document.getElementById('purchaseItemsBody');
    if (!tbody) return;

    if (typeof window.purchaseItems === 'undefined') {
        window.purchaseItems = [];
    }

    let html = '';
    let total = 0;

    window.purchaseItems.forEach((item, index) => {
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
    safeSetText('purchaseItemsCount', window.purchaseItems.length);
    safeSetText('purchaseTotalAmount', total.toFixed(2));
    updatePurchaseTaxInfo();
}

// ================================================================
// REMOVE PURCHASE ITEM - حذف صنف من فاتورة الشراء
// ================================================================
function removePurchaseItem(index) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف الصنف؟')) return;
    
    if (typeof window.purchaseItems === 'undefined') {
        window.purchaseItems = [];
        return;
    }
    
    window.purchaseItems.splice(index, 1);
    renderPurchaseItems();
}

// ================================================================
// UPDATE PURCHASE TAX INFO - تحديث معلومات الضريبة للشراء
// ================================================================
function updatePurchaseTaxInfo() {
    const totalEl = document.getElementById('purchaseTotalAmount');
    const infoEl = document.getElementById('purchaseTaxInfo');
    const typeSelect = document.getElementById('purchaseInvoiceType');
    
    if (!totalEl || !infoEl || !typeSelect) return;

    const total = parseFloat(totalEl.textContent) || 0;
    const invoiceType = typeSelect.value || 'simple';

    if (invoiceType === 'tax' && total > 0) {
        const tax = (total * 14) / 100;
        infoEl.textContent = `📊 الضريبة (14%): ${tax.toFixed(2)} | الإجمالي مع الضريبة: ${(total + tax).toFixed(2)} 🇪🇬`;
        infoEl.style.display = 'block';
    } else {
        infoEl.textContent = '';
        infoEl.style.display = 'none';
    }
}

// ================================================================
// SAVE PURCHASE INVOICE - حفظ فاتورة الشراء
// ================================================================
function savePurchaseInvoice() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const supplier = document.getElementById('purchaseSupplier')?.value?.trim() ||
        document.getElementById('purchaseSupplierSelect')?.value;
    const date = document.getElementById('purchaseDate')?.value || getTodayDate();
    const payment = getSelectedPayment('purchase');
    const warehouseId = parseInt(document.getElementById('purchaseWarehouse')?.value);
    const invoiceType = document.getElementById('purchaseInvoiceType')?.value || 'simple';

    if (!supplier) {
        showToast('⚠️ أدخل المورد', 'error');
        return;
    }
    if (!window.purchaseItems || window.purchaseItems.length === 0) {
        showToast('⚠️ أضف صنف واحد على الأقل', 'error');
        return;
    }
    if (!warehouseId) {
        showToast('⚠️ اختر مخزن', 'error');
        return;
    }

    let totalAmount = 0;
    const itemsCopy = JSON.parse(JSON.stringify(window.purchaseItems));

    for (const item of window.purchaseItems) {
        let wp = window.warehouseProducts.find(w => 
            w.warehouseId === warehouseId && w.productId === item.productId
        );
        if (!wp) {
            wp = { warehouseId: warehouseId, productId: item.productId, qty: 0 };
            window.warehouseProducts.push(wp);
        }
        wp.qty += item.qty;
        totalAmount += item.total;
    }

    const taxRate = 14;
    const taxAmount = invoiceType === 'tax' ? (totalAmount * taxRate) / 100 : 0;
    const totalWithTax = totalAmount + taxAmount;

    if (payment === 'نقدي') {
        window.treasury.push({
            id: Date.now(),
            type: 'withdraw',
            amount: totalWithTax,
            note: `شراء من ${supplier} (${window.purchaseItems.length} صنف)${invoiceType === 'tax' ? ' - ضريبة 14%' : ''}`,
            method: 'نقدي',
            date: date,
            warehouseId: warehouseId,
            time: getCurrentTime()
        });
        saveAll();
    }

    const invoice = {
        id: Date.now(),
        invoiceNumber: getNextInvoiceNumber ? getNextInvoiceNumber() : Date.now(),
        supplier: supplier,
        date: date,
        payment: payment,
        items: itemsCopy,
        total: totalAmount,
        taxRate: invoiceType === 'tax' ? taxRate : 0,
        taxAmount: taxAmount,
        totalWithTax: totalWithTax,
        itemsCount: window.purchaseItems.length,
        warehouseId: warehouseId,
        invoiceType: invoiceType,
        type: 'purchase',
        time: getCurrentTime()
    };

    window.purchases.push(invoice);
    saveAll();

    addAuditLog('purchase', 'invoice', 
        `🛒 فاتورة شراء #${invoice.invoiceNumber} - المورد: ${supplier} - ${window.purchaseItems.length} صنف - الإجمالي: ${totalWithTax.toFixed(2)} 🇪🇬${invoiceType === 'tax' ? ' (ضريبة 14%)' : ''}`,
        invoice
    );

    renderProducts();
    renderAllPurchases();
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof addCashierTransaction === 'function') {
        addCashierTransaction('expense', totalWithTax, payment, `شراء من ${supplier}${invoiceType === 'tax' ? ' (بضريبة)' : ''}`);
    }

    window.purchaseItems = [];
    renderPurchaseItems();
    showToast(`✅ تم إضافة فاتورة شراء`, 'success');
    updateDashboard();
}

// ================================================================
// RENDER ALL PURCHASES - عرض فواتير الشراء
// ================================================================
function renderAllPurchases() {
    const container = document.getElementById('purchaseList');
    if (!container) return;

    if (!window.purchases || window.purchases.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    const canEditPurchases = canEdit();
    const canDeletePurchases = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.6fr 0.7fr 0.6fr 0.7fr;">
        <span>المورد</span><span>المخزن</span><span>النوع</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span>
    </div>`;

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

// ================================================================
// EDIT PURCHASE INVOICE - تعديل فاتورة شراء
// ================================================================
function editPurchaseInvoice(id) {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    
    const invoice = window.purchases.find(p => p.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => 
                w.warehouseId === invoice.warehouseId && w.productId === item.productId
            );
            if (wp) wp.qty -= item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => 
            t.note && t.note.includes(`شراء من ${invoice.supplier}`) && t.date === invoice.date
        );
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    const oldTotal = invoice.totalWithTax || invoice.total || 0;
    window.purchases = window.purchases.filter(p => p.id !== id);
    saveAll();

    document.getElementById('purchaseSupplierSelect').value = invoice.supplier;
    document.getElementById('purchaseSupplier').value = invoice.supplier;
    document.getElementById('purchaseDate').value = invoice.date;
    document.getElementById('purchaseWarehouse').value = invoice.warehouseId || '';
    document.getElementById('purchaseInvoiceType').value = invoice.invoiceType || 'simple';

    window.purchaseItems = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const product = window.products.find(p => p.id === item.productId);
            if (product) {
                window.purchaseItems.push({
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

    const newTotal = window.purchaseItems.reduce((sum, item) => sum + item.total, 0);
    addAuditLog('edit', 'invoice', 
        `✏️ تعديل فاتورة شراء #${invoice.invoiceNumber} - المورد: ${invoice.supplier} - القديم: ${oldTotal.toFixed(2)} → الجديد: ${newTotal.toFixed(2)} 🇪🇬`,
        { id, supplier: invoice.supplier, oldTotal, newTotal }
    );

    showToast(`✏️ جاري تعديل فاتورة الشراء`, 'info');
    renderAllPurchases();
    updateDashboard();
    navigateTo('purchase');
}

// ================================================================
// DELETE PURCHASE INVOICE - حذف فاتورة شراء
// ================================================================
function deletePurchaseInvoice(id) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف فاتورة الشراء؟')) return;

    const invoice = window.purchases.find(p => p.id === id);
    if (!invoice) {
        showToast('⚠️ الفاتورة غير موجودة', 'error');
        return;
    }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => 
                w.warehouseId === invoice.warehouseId && w.productId === item.productId
            );
            if (wp) wp.qty -= item.qty;
        }
    }

    if (invoice.payment === 'نقدي') {
        const tIdx = window.treasury.findIndex(t => 
            t.note && t.note.includes(`شراء من ${invoice.supplier}`) && t.date === invoice.date
        );
        if (tIdx > -1) window.treasury.splice(tIdx, 1);
    }

    const total = invoice.totalWithTax || invoice.total || 0;
    window.purchases = window.purchases.filter(p => p.id !== id);
    saveAll();

    addAuditLog('delete', 'invoice', 
        `🗑️ حذف فاتورة شراء #${invoice.invoiceNumber} - المورد: ${invoice.supplier} - ${invoice.items?.length || 0} صنف - الإجمالي: ${total.toFixed(2)} 🇪🇬`,
        { id, supplier: invoice.supplier, total, items: invoice.items }
    );

    renderAllPurchases();
    renderProducts();
    updateDashboard();
    showToast('🗑️ تم حذف فاتورة الشراء', 'info');
}


// ================================================================
// RETURNS MODULE - إدارة المرتجعات
// ================================================================

if (typeof window.returnItems === 'undefined') {
    window.returnItems = [];
}

// ================================================================
// ADD RETURN ITEM - إضافة صنف إلى المرتجع
// ================================================================
function addReturnItem() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    
    const productId = parseInt(document.getElementById('returnItemProduct')?.value);
    const qty = parseInt(document.getElementById('returnItemQty')?.value);
    const price = parseFloat(document.getElementById('returnItemPrice')?.value);

    if (!productId) {
        showToast('⚠️ اختر منتج', 'error');
        return;
    }
    if (!qty || qty <= 0) {
        showToast('⚠️ كمية صحيحة', 'error');
        return;
    }
    if (isNaN(price) || price <= 0) {
        showToast('⚠️ سعر صحيح', 'error');
        return;
    }

    const product = window.products.find(p => p.id === productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }

    if (typeof window.returnItems === 'undefined') {
        window.returnItems = [];
    }

    window.returnItems.push({
        productId: product.id,
        productName: product.name,
        qty: qty,
        price: price,
        total: qty * price
    });
    
    renderReturnItems();
    document.getElementById('returnItemQty').value = '';
    document.getElementById('returnItemPrice').value = '';
    showToast(`✅ تم إضافة ${product.name} للمرتجع`, 'success');
}

// ================================================================
// RENDER RETURN ITEMS - عرض الأصناف المرتجعة
// ================================================================
function renderReturnItems() {
    const tbody = document.getElementById('returnItemsBody');
    if (!tbody) return;

    if (typeof window.returnItems === 'undefined') {
        window.returnItems = [];
    }

    let html = '';
    let total = 0;

    window.returnItems.forEach((item, index) => {
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
    safeSetText('returnItemsCount', window.returnItems.length);
    safeSetText('returnTotalAmount', total.toFixed(2));
}

// ================================================================
// REMOVE RETURN ITEM - حذف صنف من المرتجع
// ================================================================
function removeReturnItem(index) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف الصنف؟')) return;
    
    if (typeof window.returnItems === 'undefined') {
        window.returnItems = [];
        return;
    }
    
    window.returnItems.splice(index, 1);
    renderReturnItems();
}

// ================================================================
// SAVE RETURN INVOICE - حفظ المرتجع
// ================================================================
function saveReturnInvoice() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const customer = document.getElementById('returnCustomer')?.value?.trim() ||
        document.getElementById('returnCustomerSelect')?.value;
    const date = document.getElementById('returnDate')?.value || getTodayDate();
    const reason = document.getElementById('returnReason')?.value || 'أسباب أخرى';
    const warehouseId = parseInt(document.getElementById('returnWarehouse')?.value);

    if (!customer) {
        showToast('⚠️ أدخل العميل', 'error');
        return;
    }
    if (!window.returnItems || window.returnItems.length === 0) {
        showToast('⚠️ أضف صنف واحد على الأقل', 'error');
        return;
    }
    if (!warehouseId) {
        showToast('⚠️ اختر مخزن', 'error');
        return;
    }

    let totalAmount = 0;
    const itemsCopy = JSON.parse(JSON.stringify(window.returnItems));

    for (const item of window.returnItems) {
        let wp = window.warehouseProducts.find(w => 
            w.warehouseId === warehouseId && w.productId === item.productId
        );
        if (!wp) {
            wp = { warehouseId: warehouseId, productId: item.productId, qty: 0 };
            window.warehouseProducts.push(wp);
        }
        wp.qty += item.qty;
        totalAmount += item.total;
    }

    const invoice = {
        id: Date.now(),
        invoiceNumber: getNextInvoiceNumber ? getNextInvoiceNumber() : Date.now(),
        customer: customer,
        date: date,
        reason: reason,
        items: itemsCopy,
        total: totalAmount,
        itemsCount: window.returnItems.length,
        warehouseId: warehouseId,
        type: 'return',
        time: getCurrentTime()
    };

    window.returns.push(invoice);
    saveAll();

    addAuditLog('return', 'invoice', 
        `🔄 مرتجع #${invoice.invoiceNumber} - العميل: ${customer} - ${window.returnItems.length} صنف - الإجمالي: ${totalAmount.toFixed(2)} 🇪🇬`,
        invoice
    );

    renderProducts();
    renderAllReturns();
    window.returnItems = [];
    renderReturnItems();
    showToast(`✅ تم تسجيل المرتجع`, 'success');
    updateDashboard();
}

// ================================================================
// RENDER ALL RETURNS - عرض قائمة المرتجعات
// ================================================================
function renderAllReturns() {
    const container = document.getElementById('returnList');
    if (!container) return;

    if (!window.returns || window.returns.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`;
        return;
    }

    const canEditReturns = canEdit();
    const canDeleteReturns = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.8fr 1fr 0.6fr 0.7fr 0.6fr 0.7fr;">
        <span>العميل</span><span>المخزن</span><span>الأصناف</span><span>الإجمالي</span><span>التاريخ</span><span></span>
    </div>`;

    window.returns.slice().reverse().forEach(r => {
        const w = window.warehouses.find(wh => wh.id === r.warehouseId);
        const wName = w ? w.name : 'غير محدد';
        const itemsCount = r.items ? r.items.length : 1;
        const total = r.total || 0;

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

// ================================================================
// EDIT RETURN INVOICE - تعديل مرتجع
// ================================================================
function editReturnInvoice(id) {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    
    const invoice = window.returns.find(r => r.id === id);
    if (!invoice) {
        showToast('⚠️ المرتجع غير موجود', 'error');
        return;
    }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => 
                w.warehouseId === invoice.warehouseId && w.productId === item.productId
            );
            if (wp) wp.qty -= item.qty;
        }
    }

    const oldTotal = invoice.total || 0;
    window.returns = window.returns.filter(r => r.id !== id);
    saveAll();

    document.getElementById('returnCustomerSelect').value = invoice.customer;
    document.getElementById('returnCustomer').value = invoice.customer;
    document.getElementById('returnDate').value = invoice.date;
    document.getElementById('returnWarehouse').value = invoice.warehouseId || '';
    document.getElementById('returnReason').value = invoice.reason || 'أسباب أخرى';

    window.returnItems = [];
    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const product = window.products.find(p => p.id === item.productId);
            if (product) {
                window.returnItems.push({
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

    const newTotal = window.returnItems.reduce((sum, item) => sum + item.total, 0);
    addAuditLog('edit', 'invoice', 
        `✏️ تعديل مرتجع #${invoice.invoiceNumber} - العميل: ${invoice.customer} - القديم: ${oldTotal.toFixed(2)} → الجديد: ${newTotal.toFixed(2)} 🇪🇬`,
        { id, customer: invoice.customer, oldTotal, newTotal }
    );

    showToast(`✏️ جاري تعديل المرتجع`, 'info');
    renderAllReturns();
    updateDashboard();
    navigateTo('returns');
}

// ================================================================
// DELETE RETURN INVOICE - حذف مرتجع
// ================================================================
function deleteReturnInvoice(id) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف المرتجع؟')) return;

    const invoice = window.returns.find(r => r.id === id);
    if (!invoice) {
        showToast('⚠️ المرتجع غير موجود', 'error');
        return;
    }

    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            const wp = window.warehouseProducts.find(w => 
                w.warehouseId === invoice.warehouseId && w.productId === item.productId
            );
            if (wp) wp.qty -= item.qty;
        }
    }

    const total = invoice.total || 0;
    window.returns = window.returns.filter(r => r.id !== id);
    saveAll();

    addAuditLog('delete', 'invoice', 
        `🗑️ حذف مرتجع #${invoice.invoiceNumber} - العميل: ${invoice.customer} - ${invoice.items?.length || 0} صنف - الإجمالي: ${total.toFixed(2)} 🇪🇬`,
        { id, customer: invoice.customer, total, items: invoice.items }
    );

    renderAllReturns();
    renderProducts();
    updateDashboard();
    showToast('🗑️ تم حذف المرتجع', 'info');
}


// ================================================================
// CUSTOMER STATEMENT - كشف حساب العميل
// ================================================================

function generateCustomerStatement() {
    const container = document.getElementById('customerStatementResult');
    if (!container) return;

    const customerId = document.getElementById('statementCustomerSelect')?.value;
    const fromDate = document.getElementById('statementFrom')?.value;
    const toDate = document.getElementById('statementTo')?.value;

    if (!customerId) {
        container.innerHTML = `
            <div class="alert-item info">
                <div class="icon"><i class="fas fa-info-circle"></i></div>
                <div class="content">
                    <div class="title">اختر عميلاً</div>
                    <div class="desc">حدد عميلاً ثم اضغط على عرض</div>
                </div>
            </div>
        `;
        return;
    }

    const customer = window.customers?.find(c => c.id == customerId);
    if (!customer) {
        container.innerHTML = `<div class="alert-item danger"><div class="icon"><i class="fas fa-exclamation-triangle"></i></div><div class="content"><div class="title">العميل غير موجود</div></div></div>`;
        return;
    }

    let customerSales = window.sales?.filter(s => s.customer === customer.name) || [];
    let customerReturns = window.returns?.filter(r => r.customer === customer.name) || [];

    if (fromDate) {
        customerSales = customerSales.filter(s => s.date >= fromDate);
        customerReturns = customerReturns.filter(r => r.date >= fromDate);
    }
    if (toDate) {
        customerSales = customerSales.filter(s => s.date <= toDate);
        customerReturns = customerReturns.filter(r => r.date <= toDate);
    }

    let totalSales = 0;
    let totalReturns = 0;
    let balance = 0;

    let salesHtml = '';
    let returnsHtml = '';

    if (customerSales.length > 0) {
        salesHtml = `
            <div style="margin-top:8px;">
                <h5 style="color:#2D8F5E;font-size:13px;">💰 فواتير البيع</h5>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:1px solid #C9A94E;font-size:11px;">
                    <span>التاريخ</span><span>الفاتورة</span><span>الأصناف</span><span>المبلغ</span>
                </div>
        `;
        customerSales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            totalSales += total;
            salesHtml += `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;color:#F5E6C8;cursor:pointer;" 
                     onclick="showInvoiceDetails(${s.id}, 'sale')">
                    <span>${s.date}</span>
                    <span style="color:#C9A94E;font-weight:700;">#${s.invoiceNumber || s.id}</span>
                    <span>${s.items?.length || 0}</span>
                    <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                </div>
            `;
        });
        salesHtml += `</div>`;
    }

    if (customerReturns.length > 0) {
        returnsHtml = `
            <div style="margin-top:8px;">
                <h5 style="color:#E6A830;font-size:13px;">🔄 المرتجعات</h5>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:1px solid #C9A94E;font-size:11px;">
                    <span>التاريخ</span><span>المرتجع</span><span>الأصناف</span><span>المبلغ</span>
                </div>
        `;
        customerReturns.forEach(r => {
            const total = r.total || 0;
            totalReturns += total;
            returnsHtml += `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;color:#F5E6C8;cursor:pointer;" 
                     onclick="showInvoiceDetails(${r.id}, 'return')">
                    <span>${r.date}</span>
                    <span style="color:#E6A830;font-weight:700;">#${r.invoiceNumber || r.id}</span>
                    <span>${r.items?.length || 0}</span>
                    <span style="color:#E6A830;font-weight:700;">${total.toFixed(2)}</span>
                </div>
            `;
        });
        returnsHtml += `</div>`;
    }

    balance = totalSales - totalReturns;

    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📋 كشف حساب ${customer.name}</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
                <div class="stat-card"><div class="number" style="color:#2D8F5E;">${totalSales.toFixed(2)}</div><div class="label">إجمالي المشتريات</div></div>
                <div class="stat-card"><div class="number" style="color:#E6A830;">${totalReturns.toFixed(2)}</div><div class="label">إجمالي المرتجعات</div></div>
                <div class="stat-card"><div class="number" style="color:${balance >= 0 ? '#2D8F5E' : '#E06060'};">${balance.toFixed(2)}</div><div class="label">الرصيد</div></div>
            </div>
            ${salesHtml}
            ${returnsHtml}
            ${customerSales.length === 0 && customerReturns.length === 0 ? '<div class="empty-state" style="padding:16px 0;"><i class="fas fa-file-invoice"></i><span>لا توجد حركات للعميل</span></div>' : ''}
        </div>
    `;
}

function generateCustomerDetailedStatement() {
    generateCustomerStatement();
}

// ================================================================
// SUPPLIER STATEMENT - كشف حساب المورد
// ================================================================

function generateSupplierStatement() {
    const container = document.getElementById('supplierStatementResult');
    if (!container) return;

    const supplierId = document.getElementById('statementSupplierSelect')?.value;
    const fromDate = document.getElementById('statementSupplierFrom')?.value;
    const toDate = document.getElementById('statementSupplierTo')?.value;

    if (!supplierId) {
        container.innerHTML = `
            <div class="alert-item info">
                <div class="icon"><i class="fas fa-info-circle"></i></div>
                <div class="content">
                    <div class="title">اختر مورداً</div>
                    <div class="desc">حدد مورداً ثم اضغط على عرض</div>
                </div>
            </div>
        `;
        return;
    }

    const supplier = window.suppliers?.find(s => s.id == supplierId);
    if (!supplier) {
        container.innerHTML = `<div class="alert-item danger"><div class="icon"><i class="fas fa-exclamation-triangle"></i></div><div class="content"><div class="title">المورد غير موجود</div></div></div>`;
        return;
    }

    let supplierPurchases = window.purchases?.filter(p => p.supplier === supplier.name) || [];

    if (fromDate) {
        supplierPurchases = supplierPurchases.filter(p => p.date >= fromDate);
    }
    if (toDate) {
        supplierPurchases = supplierPurchases.filter(p => p.date <= toDate);
    }

    let totalPurchases = 0;
    let purchasesHtml = '';

    if (supplierPurchases.length > 0) {
        purchasesHtml = `
            <div style="margin-top:8px;">
                <h5 style="color:#E06060;font-size:13px;">🛒 فواتير الشراء</h5>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;color:#C9A94E;border-bottom:1px solid #C9A94E;font-size:11px;">
                    <span>التاريخ</span><span>الفاتورة</span><span>الأصناف</span><span>المبلغ</span>
                </div>
        `;
        supplierPurchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            totalPurchases += total;
            purchasesHtml += `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:11px;color:#F5E6C8;cursor:pointer;" 
                     onclick="showInvoiceDetails(${p.id}, 'purchase')">
                    <span>${p.date}</span>
                    <span style="color:#E06060;font-weight:700;">#${p.invoiceNumber || p.id}</span>
                    <span>${p.items?.length || 0}</span>
                    <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                </div>
            `;
        });
        purchasesHtml += `</div>`;
    }

    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📋 كشف حساب ${supplier.name}</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                <div class="stat-card"><div class="number" style="color:#E06060;">${totalPurchases.toFixed(2)}</div><div class="label">إجمالي المشتريات</div></div>
                <div class="stat-card"><div class="number" style="color:#2D8F5E;">0.00</div><div class="label">المدفوع</div></div>
            </div>
            ${purchasesHtml}
            ${supplierPurchases.length === 0 ? '<div class="empty-state" style="padding:16px 0;"><i class="fas fa-file-invoice"></i><span>لا توجد حركات للمورد</span></div>' : ''}
        </div>
    `;
}

function generateSupplierDetailedStatement() {
    generateSupplierStatement();
}


// ================================================================
// PROFIT ANALYSIS - تحليل الأرباح
// ================================================================

function generateProfitAnalysis() {
    const container = document.getElementById('profitAnalysisResult');
    if (!container) return;

    // تحديث الإحصائيات أولاً
    const totalProducts = window.products ? window.products.length : 0;
    safeSetText('profitTotalProducts', totalProducts);

    if (!window.sales || window.sales.length === 0) {
        safeSetText('profitAvgMargin', '0');
        safeSetText('profitTopProduct', '0');
        container.innerHTML = `
            <div class="alert-item info">
                <div class="icon"><i class="fas fa-info-circle"></i></div>
                <div class="content">
                    <div class="title">لا توجد بيانات</div>
                    <div class="desc">لا توجد مبيعات مسجلة لعرض تحليل الأرباح</div>
                </div>
            </div>
        `;
        return;
    }

    const productProfits = {};
    let totalProfit = 0;
    let maxProfit = 0;
    let topProduct = '';
    let productCount = 0;
    
    window.sales.forEach(sale => {
        if (sale.items) {
            sale.items.forEach(item => {
                const productName = item.productName || 'منتج غير معروف';
                if (!productProfits[productName]) {
                    productProfits[productName] = {
                        totalRevenue: 0,
                        totalCost: 0,
                        totalQty: 0
                    };
                    productCount++;
                }
                const revenue = item.total || 0;
                productProfits[productName].totalRevenue += revenue;
                productProfits[productName].totalQty += item.qty || 0;
                
                const product = window.products.find(p => p.name === productName);
                if (product) {
                    productProfits[productName].totalCost += (product.buyPrice || 0) * (item.qty || 0);
                }
            });
        }
    });

    // حساب الإحصائيات
    let avgMargin = 0;
    Object.keys(productProfits).forEach(name => {
        const data = productProfits[name];
        const profit = data.totalRevenue - data.totalCost;
        totalProfit += profit;
        if (profit > maxProfit) {
            maxProfit = profit;
            topProduct = name;
        }
    });
    
    avgMargin = productCount > 0 ? totalProfit / productCount : 0;

    // تحديث الإحصائيات في الأعلى
    safeSetText('profitAvgMargin', avgMargin.toFixed(2));
    safeSetText('profitTopProduct', topProduct || 'لا يوجد');

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 تحليل ربحية المنتجات</h4>
            <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>المنتج</span><span>الكمية</span><span>الإيرادات</span><span>التكلفة</span><span>الربح</span>
                </div>
    `;

    Object.keys(productProfits).forEach(name => {
        const data = productProfits[name];
        const profit = data.totalRevenue - data.totalCost;
        const color = profit >= 0 ? '#2D8F5E' : '#E06060';
        html += `
            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                <span><strong>${name}</strong></span>
                <span>${data.totalQty}</span>
                <span style="color:#2D8F5E;">${data.totalRevenue.toFixed(2)}</span>
                <span style="color:#E06060;">${data.totalCost.toFixed(2)}</span>
                <span style="color:${color};font-weight:700;">${profit.toFixed(2)}</span>
            </div>
        `;
    });

    html += `
            </div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;color:#F5E6C8;">
                    <div><span style="font-weight:600;color:#A89070;">🏆 أعلى ربح:</span> <span style="color:#C9A94E;font-weight:700;">${topProduct || 'لا يوجد'}</span></div>
                    <div><span style="font-weight:600;color:#A89070;">📊 متوسط الربح:</span> <span style="color:#C9A94E;font-weight:700;">${avgMargin.toFixed(2)}</span></div>
                    <div><span style="font-weight:600;color:#A89070;">📦 المنتجات:</span> <span style="color:#C9A94E;font-weight:700;">${productCount}</span></div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    addAuditLog('add', 'report', 'عرض تحليل الأرباح');
}


// ================================================================
// WAREHOUSE REPORT - تقرير المخازن
// ================================================================

function generateWarehouseReport() {
    const container = document.getElementById('reportResult');
    if (!container) return;

    if (!window.warehouses || window.warehouses.length === 0) {
        container.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">لا توجد مخازن</div></div></div>`;
        return;
    }

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">🏢 تقرير المخازن</h4>
            <div style="max-height:400px;overflow-y:auto;">
                <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>اسم المخزن</span><span>النوع</span><span>عدد المنتجات</span><span>القيمة</span>
                </div>
    `;

    let totalWarehouseValue = 0;

    window.warehouses.forEach(w => {
        let productCount = 0;
        let warehouseValue = 0;
        
        window.warehouseProducts.forEach(wp => {
            if (wp.warehouseId === w.id) {
                productCount += wp.qty;
                const product = window.products.find(p => p.id === wp.productId);
                if (product) {
                    warehouseValue += product.sellPrice * wp.qty;
                }
            }
        });
        
        totalWarehouseValue += warehouseValue;
        const typeColor = w.type === 'رئيسي' ? '#2D8F5E' : w.type === 'محل' ? '#E6A830' : '#4A8AB5';
        
        html += `
            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                <span><strong>${w.name}</strong></span>
                <span style="color:${typeColor};font-weight:700;">${w.type}</span>
                <span>${productCount}</span>
                <span style="color:#C9A94E;font-weight:700;">${warehouseValue.toFixed(2)}</span>
            </div>
        `;
    });

    html += `
                <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:4px;padding:6px 0;border-top:2px solid #C9A94E;font-weight:800;font-size:13px;color:#F5E6C8;">
                    <span>الإجمالي</span>
                    <span></span>
                    <span>${window.warehouseProducts.reduce((s, wp) => s + wp.qty, 0)}</span>
                    <span style="color:#C9A94E;">${totalWarehouseValue.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    addAuditLog('add', 'report', 'عرض تقرير المخازن');
}

// ================================================================
// EXPENSES REPORT - تقرير المصروفات
// ================================================================

function generateExpensesReport() {
    const container = document.getElementById('reportResult');
    if (!container) return;

    if (!window.expenses || window.expenses.length === 0) {
        container.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">لا توجد مصروفات</div></div></div>`;
        return;
    }

    const byMethod = {};
    let totalExpenses = 0;

    window.expenses.forEach(e => {
        const method = e.method || 'نقدي';
        if (!byMethod[method]) byMethod[method] = 0;
        byMethod[method] += e.amount;
        totalExpenses += e.amount;
    });

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">💸 تقرير المصروفات</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                <div class="stat-card"><div class="number" style="color:#E06060;">${totalExpenses.toFixed(2)}</div><div class="label">إجمالي المصروفات</div></div>
                <div class="stat-card"><div class="number" style="color:#4A8AB5;">${window.expenses.length}</div><div class="label">عدد المصروفات</div></div>
            </div>
            <div style="max-height:300px;overflow-y:auto;">
                <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>البيان</span><span>المبلغ</span><span>طريقة الدفع</span><span>التاريخ</span>
                </div>
    `;

    window.expenses.slice().reverse().forEach(e => {
        html += `
            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;font-size:12px;color:#F5E6C8;">
                <span>${e.note}</span>
                <span style="color:#E06060;font-weight:700;">${e.amount.toFixed(2)}</span>
                <span>${e.method || 'نقدي'}</span>
                <span style="font-size:11px;">${e.date}</span>
            </div>
        `;
    });

    html += `
            </div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                <div style="font-weight:700;color:#C9A94E;font-size:12px;margin-bottom:4px;">📊 حسب طريقة الدفع:</div>
    `;
    
    Object.keys(byMethod).forEach(method => {
        html += `<div style="padding:2px 0;color:#F5E6C8;">• ${method}: ${byMethod[method].toFixed(2)} 🇪🇬</div>`;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
    addAuditLog('add', 'report', 'عرض تقرير المصروفات');
}

// ================================================================
// GENERATE REPORT - إنشاء تقرير (الوظيفة الرئيسية)
// ================================================================

function generateReport(type) {
    if (type === 'warehouse') {
        generateWarehouseReport();
        return;
    }
    if (type === 'expenses') {
        generateExpensesReport();
        return;
    }
    if (type === 'profit') {
        generateProfitAnalysis();
        return;
    }

    const container = document.getElementById('reportResult');
    if (!container) return;

    let html = '';

    const totalSales = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalPurchases = window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalExpenses = window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0;
    const profit = totalSales - totalPurchases - totalExpenses;

    switch (type) {
        case 'sales':
            const salesByWarehouse = {};
            if (window.sales) {
                window.sales.forEach(s => {
                    const wId = s.warehouseId || 0;
                    const w = window.warehouses.find(wh => wh.id === wId);
                    const wName = w ? w.name : 'غير محدد';
                    const total = s.totalWithTax || s.total || 0;
                    salesByWarehouse[wName] = (salesByWarehouse[wName] || 0) + total;
                });
            }

            let salesDetails = '';
            if (window.sales) {
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
            }

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
            if (window.purchases) {
                window.purchases.forEach(p => {
                    const wId = p.warehouseId || 0;
                    const w = window.warehouses.find(wh => wh.id === wId);
                    const wName = w ? w.name : 'غير محدد';
                    const total = p.totalWithTax || p.total || 0;
                    purchasesByWarehouse[wName] = (purchasesByWarehouse[wName] || 0) + total;
                });
            }

            let purchasesDetails = '';
            if (window.purchases) {
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
            }

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

        case 'inventory':
            const inventoryData = window.products ? window.products.map(p => {
                const qty = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0);
                return { name: p.name, qty: qty, buyPrice: p.buyPrice, sellPrice: p.sellPrice, value: qty * p.sellPrice };
            }).sort((a, b) => b.value - a.value) : [];

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

        default:
            html = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">اختر تقريراً</div><div class="desc">اضغط على أحد التقارير أعلاه</div></div></div>`;
    }

    container.innerHTML = html;
    addAuditLog('add', 'report', `عرض تقرير ${type}`);
}


// ================================================================
// INVOICES MODULE - عرض جميع الفواتير
// ================================================================

function renderAllInvoices() {
    let all = [];
    
    if (window.sales) {
        window.sales.forEach(s => all.push({ ...s, typeLabel: 'بيع', color: '#2D8F5E' }));
    }
    if (window.purchases) {
        window.purchases.forEach(p => all.push({ ...p, typeLabel: 'شراء', color: '#E06060' }));
    }
    if (window.returns) {
        window.returns.forEach(r => all.push({ ...r, typeLabel: 'مرتجع', color: '#E6A830' }));
    }

    safeSetText('allInvoicesCount', all.length);
    safeSetText('invoicesSalesCount', window.sales ? window.sales.length : 0);
    safeSetText('invoicesPurchasesCount', window.purchases ? window.purchases.length : 0);

    const container = document.getElementById('allInvoicesList');
    if (!container) return;

    if (all.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>لا توجد فواتير</span></div>`;
        return;
    }

    const canDeleteAll = canDelete();

    let html = `<div class="invoice-header" style="grid-template-columns:0.6fr 1.2fr 0.6fr 0.6fr 0.8fr 0.8fr 0.6fr;">
        <span>النوع</span><span>العميل/المورد</span><span>المخزن</span><span>النوع</span><span>الإجمالي</span><span>التاريخ</span><span></span>
    </div>`;

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
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف الفاتورة نهائياً؟')) return;

    let invoice = null;

    if (type === 'sale') {
        invoice = window.sales.find(s => s.id === id);
        if (invoice && invoice.items) {
            for (const item of invoice.items) {
                const wp = window.warehouseProducts.find(w => 
                    w.warehouseId === invoice.warehouseId && w.productId === item.productId
                );
                if (wp) wp.qty += item.qty;
            }
        }
        window.sales = window.sales.filter(s => s.id !== id);
    } else if (type === 'purchase') {
        invoice = window.purchases.find(p => p.id === id);
        if (invoice && invoice.items) {
            for (const item of invoice.items) {
                const wp = window.warehouseProducts.find(w => 
                    w.warehouseId === invoice.warehouseId && w.productId === item.productId
                );
                if (wp) wp.qty -= item.qty;
            }
        }
        window.purchases = window.purchases.filter(p => p.id !== id);
    } else if (type === 'return') {
        invoice = window.returns.find(r => r.id === id);
        if (invoice && invoice.items) {
            for (const item of invoice.items) {
                const wp = window.warehouseProducts.find(w => 
                    w.warehouseId === invoice.warehouseId && w.productId === item.productId
                );
                if (wp) wp.qty -= item.qty;
            }
        }
        window.returns = window.returns.filter(r => r.id !== id);
    }

    saveAll();
    addAuditLog('delete', 'invoice', 
        `🗑️ حذف فاتورة #${invoice?.invoiceNumber || id} - النوع: ${type}`,
        { id, type }
    );
    
    renderAllInvoices();
    renderProducts();
    updateDashboard();
    showToast('🗑️ تم حذف الفاتورة', 'info');
}


// ================================================================
// PERMISSIONS MODULE - إدارة الإذونات
// ================================================================

if (typeof window.permissions === 'undefined') {
    window.permissions = [];
}
let permissionFilter = 'all';

function addPermission() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const type = document.getElementById('permissionType')?.value || 'transfer';
    const fromId = parseInt(document.getElementById('permissionFrom')?.value);
    const toId = parseInt(document.getElementById('permissionTo')?.value);
    const productId = parseInt(document.getElementById('permissionProduct')?.value);
    const qty = parseInt(document.getElementById('permissionQty')?.value);
    const date = document.getElementById('permissionDate')?.value || getTodayDate();
    const note = document.getElementById('permissionNote')?.value?.trim() || '';

    if (!productId) {
        showToast('⚠️ اختر منتج', 'error');
        return;
    }
    if (!qty || qty <= 0) {
        showToast('⚠️ كمية صحيحة', 'error');
        return;
    }

    if (type === 'transfer') {
        if (!fromId || !toId) {
            showToast('⚠️ اختر المخازن', 'error');
            return;
        }
        if (fromId === toId) {
            showToast('⚠️ لا يمكن التحويل لنفس المخزن', 'error');
            return;
        }
        const fromProduct = window.warehouseProducts.find(wp => 
            wp.warehouseId === fromId && wp.productId === productId
        );
        if (!fromProduct || fromProduct.qty < qty) {
            showToast(`⚠️ الكمية غير متوفرة في المخزن المصدر`, 'error');
            return;
        }
    } else if (type === 'withdraw') {
        if (!fromId) {
            showToast('⚠️ اختر المخزن المصدر', 'error');
            return;
        }
        const fromProduct = window.warehouseProducts.find(wp => 
            wp.warehouseId === fromId && wp.productId === productId
        );
        if (!fromProduct || fromProduct.qty < qty) {
            showToast(`⚠️ الكمية غير متوفرة`, 'error');
            return;
        }
    } else if (type === 'add' || type === 'inventory' || type === 'adjustment') {
        if (!toId) {
            showToast('⚠️ اختر المخزن الهدف', 'error');
            return;
        }
    }

    const permission = {
        id: Date.now(),
        type: type,
        fromWarehouseId: fromId || null,
        toWarehouseId: toId || null,
        productId: productId,
        qty: qty,
        date: date,
        note: note,
        status: 'pending',
        time: getCurrentTime()
    };

    window.permissions.push(permission);
    saveAll();
    
    addAuditLog('add', 'permission', 
        `📋 إذن ${type} - المنتج: ${window.products.find(p => p.id === productId)?.name || 'غير معروف'} - الكمية: ${qty}`,
        permission
    );
    
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

function filterPermissions(filter) {
    permissionFilter = filter;
    const container = document.getElementById('permissionList');
    if (!container) return;

    let filtered = window.permissions || [];
    if (filter !== 'all') {
        filtered = window.permissions.filter(p => p.status === filter);
    }

    document.querySelectorAll('.filter-chips .filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === (filter === 'all' ? 'الكل' : 
            filter === 'pending' ? '⏳ معلق' : 
            filter === 'executed' ? '✅ منفذ' : 
            filter === 'cancelled' ? '❌ ملغي' : ''));
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

    let html = `<div class="table-header" style="grid-template-columns:0.8fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr;">
        <span>النوع</span><span>من</span><span>إلى</span><span>المنتج</span><span>الكمية</span><span>الحالة</span><span></span>
    </div>`;

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
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const permission = window.permissions.find(p => p.id === id);
    if (!permission) {
        showToast('⚠️ الإذن غير موجود', 'error');
        return;
    }
    if (permission.status !== 'pending') {
        showToast('⚠️ الإذن تم تنفيذه مسبقاً', 'warning');
        return;
    }

    const product = window.products.find(p => p.id === permission.productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }

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
            date: getTodayDate(),
            warehouseId: permission.fromWarehouseId,
            time: getCurrentTime()
        });

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
    permission.executedAt = new Date().toISOString();
    saveAll();

    addAuditLog('add', 'permission', 
        `✅ تنفيذ إذن ${permission.type} - المنتج: ${product.name} - الكمية: ${permission.qty}`,
        permission
    );

    renderPermissions();
    renderProducts();
    if (typeof renderCashier === 'function') renderCashier();
    updateDashboard();
    showToast('✅ تم تنفيذ الإذن', 'success');
}

function executeSelectedPermission() {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    const pending = window.permissions.filter(p => p.status === 'pending');
    if (pending.length === 0) {
        showToast('⚠️ لا توجد إذونات معلقة', 'warning');
        return;
    }
    executePermission(pending[0].id);
}

function cancelPermission(id) {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ إلغاء الإذن؟')) return;

    const permission = window.permissions.find(p => p.id === id);
    if (permission) {
        permission.status = 'cancelled';
        permission.cancelledAt = new Date().toISOString();
        saveAll();
        addAuditLog('edit', 'permission', `❌ إلغاء إذن #${id}`, permission);
        renderPermissions();
        showToast('❌ تم إلغاء الإذن', 'info');
    }
}

function deletePermission(id) {
    if (!canDelete()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (!confirm('⚠️ حذف الإذن نهائياً؟')) return;

    const permission = window.permissions.find(p => p.id === id);
    window.permissions = window.permissions.filter(p => p.id !== id);
    saveAll();
    
    if (permission) {
        addAuditLog('delete', 'permission', `🗑️ حذف إذن #${id} - النوع: ${permission.type}`, permission);
    }
    
    renderPermissions();
    showToast('🗑️ تم حذف الإذن', 'info');
}


// ================================================================
// ACCOUNTING MODULE - المحاسبات
// ================================================================

function updateAccounting() {
    const totalSales = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;
    
    const totalPurchases = window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;
    
    const totalExpenses = window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0;
    const profit = totalSales - totalPurchases - totalExpenses;

    safeSetText('accountingSales', totalSales.toFixed(2));
    safeSetText('accountingPurchases', totalPurchases.toFixed(2));
    safeSetText('accountingProfit', profit.toFixed(2));
}

function showLedger() {
    const container = document.getElementById('accountingResult');
    if (!container) return;

    const allTransactions = [
        ...(window.sales ? window.sales.map(s => ({ date: s.date, name: s.customer, amount: s.total, type: 'بيع' })) : []),
        ...(window.purchases ? window.purchases.map(p => ({ date: p.date, name: p.supplier, amount: p.total, type: 'شراء' })) : []),
        ...(window.expenses ? window.expenses.map(e => ({ date: e.date, name: e.note, amount: e.amount, type: 'مصروف' })) : []),
        ...(window.treasury ? window.treasury.map(t => ({ date: t.date, name: t.note, amount: t.amount, type: t.type === 'deposit' ? 'إيداع' : 'سحب' })) : [])
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

    const totalDebit = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;
    
    const totalCredit = (window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0) + (window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0);
    
    const balance = window.treasury ? window.treasury.reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0) : 0;

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

    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            accountsData['المبيعات'].credit += total;
            accountsData['العملاء'].debit += total;
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            accountsData['المشتريات'].debit += total;
            accountsData['الموردين'].credit += total;
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => accountsData['المصروفات'].debit += e.amount);
    }
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') accountsData['الخزنة'].debit += t.amount;
            else accountsData['الخزنة'].credit += t.amount;
        });
    }

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

    const totalSales = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;
    
    const totalPurchases = window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;
    
    const totalExpenses = window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0;
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

    const totalAssets = window.treasury ? window.treasury.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0) : 0;
    const totalLiabilities = window.treasury ? window.treasury.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0) : 0;
    
    const inventoryValue = window.products ? window.products.reduce((s, p) => {
        const qty = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((sum, wp) => sum + wp.qty, 0);
        return s + (p.buyPrice * qty);
    }, 0) : 0;
    
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

    const today = getTodayDate();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    const inflows = window.treasury ? window.treasury.filter(t => t.type === 'deposit' && t.date >= lastMonthStr).reduce((s, t) => s + t.amount, 0) : 0;
    const outflows = window.treasury ? window.treasury.filter(t => t.type === 'withdraw' && t.date >= lastMonthStr).reduce((s, t) => s + t.amount, 0) : 0;
    const netCashFlow = inflows - outflows;
    const totalBalance = window.treasury ? window.treasury.reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0) : 0;

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

if (typeof window.cashierHistory === 'undefined') {
    window.cashierHistory = [];
}
let cashierDayOpen = false;
let currentCashier = null;

function getLastCashier() {
    if (!window.cashierHistory || window.cashierHistory.length === 0) return null;
    return window.cashierHistory[window.cashierHistory.length - 1];
}

function cashierOpenDay() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
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
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
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
                    <div style="font-weight:700;color:${t.type === 'sale' || t.type === 'deposit' ? '#2D8F5E' : '#E06060'};">${sign[t.type] || ''} ${t.amount.toFixed(2)}</div>
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
    if (!window.cashierHistory || window.cashierHistory.length === 0) {
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
    if (!cashier) {
        showToast('⚠️ لا توجد بيانات لليوم', 'error');
        return;
    }

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
