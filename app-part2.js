// ============================================================
// الميزان 13.0.0 - الجزء 2: العمليات
// المخزون + البيع + الشراء + المرتجعات + الدفعات + المقاصة
// ============================================================

// ============================================================
// المخزون
// ============================================================
window.saveProduct = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('productId').value;
    const name = $('productName').value.trim();
    const barcode = $('productBarcode').value.trim();
    const buy = parseFloat($('productBuy').value) || 0;
    const sell = parseFloat($('productSell').value) || 0;
    const qty = parseInt($('productQty').value) || 0;
    const min = parseInt($('productMin').value) || 5;
    const vat = parseFloat($('productVAT')?.value) || vatSettings.defaultVAT;
    if (!name) { showToast('⚠️ أدخل اسم المنتج', 'error'); return; }
    if (buy <= 0) { showToast('⚠️ أدخل سعر شراء صحيح', 'error'); return; }
    if (sell <= 0) { showToast('⚠️ أدخل سعر بيع صحيح', 'error'); return; }
    if (id) {
        if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
        const idx = products.findIndex(p => p.id == id);
        if (idx > -1) {
            const old = { ...products[idx] };
            products[idx] = { ...products[idx], name, barcode, buy, sell, qty, min, vat };
            if (old.qty !== qty) {
                const diff = qty - old.qty;
                logInventoryMovement({
                    productId: products[idx].id, productName: name,
                    type: diff > 0 ? 'in' : 'out', qty: Math.abs(diff), price: buy,
                    reason: 'adjustment', refType: 'product_edit', refId: products[idx].id,
                    balanceBefore: old.qty, balanceAfter: qty,
                    notes: 'تعديل يدوي للمخزون'
                });
            }
            addAuditLog('edit', 'product', `تعديل منتج: ${name}`);
            showToast('✅ تم تعديل المنتج', 'success');
        }
    } else {
        if (products.find(p => p.name === name)) { showToast('⚠️ المنتج موجود', 'warning'); return; }
        const newProduct = { id: Date.now(), name, barcode, buy, sell, qty, min, vat, createdAt: new Date().toISOString() };
        products.push(newProduct);
        if (qty > 0) {
            logInventoryMovement({
                productId: newProduct.id, productName: name,
                type: 'in', qty: qty, price: buy,
                reason: 'initial', refType: 'product_add', refId: newProduct.id,
                balanceBefore: 0, balanceAfter: qty, notes: 'رصيد افتتاحي'
            });
        }
        addAuditLog('add', 'product', `إضافة منتج: ${name}`);
        showToast('✅ تم إضافة المنتج', 'success');
    }
    setData('products', products);
    resetProductForm(); renderProducts(); populateAllDropdowns(); updateDashboard();
};

window.editProduct = function(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    $('productId').value = p.id; $('productName').value = p.name;
    $('productBarcode').value = p.barcode || ''; $('productBuy').value = p.buy;
    $('productSell').value = p.sell; $('productQty').value = p.qty;
    $('productMin').value = p.min || 5;
    if ($('productVAT')) $('productVAT').value = p.vat || vatSettings.defaultVAT;
    $('productFormTitle').textContent = '✏️ تعديل المنتج';
    $('productSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    if (!confirm(`⚠️ حذف "${p.name}"؟`)) return;
    window.products = products.filter(pr => pr.id != id);
    setData('products', products);
    addAuditLog('delete', 'product', `حذف منتج: ${p.name}`);
    renderProducts(); populateAllDropdowns(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
};

window.resetProductForm = function() {
    $('productId').value = ''; $('productName').value = '';
    $('productBarcode').value = ''; $('productBuy').value = '';
    $('productSell').value = ''; $('productQty').value = '';
    $('productMin').value = '5';
    if ($('productVAT')) $('productVAT').value = vatSettings.defaultVAT;
    $('productFormTitle').textContent = '➕ إضافة منتج جديد';
    $('productSaveBtnText').textContent = 'إضافة';
};

window.renderProducts = function() {
    const container = $('productList'); if (!container) return;
    const search = ($('inventorySearch')?.value || '').trim().toLowerCase();
    let filtered = products;
    if (search) filtered = products.filter(p => p.name.toLowerCase().includes(search) || (p.barcode && p.barcode.includes(search)));
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><span>${search ? 'لا توجد نتائج' : 'لا توجد منتجات'}</span></div>`;
        return;
    }
    const showActions = canEdit() || canDelete();
    let html = `<div class="table-header" style="grid-template-columns: 2fr 0.8fr 0.8fr 0.6fr 0.7fr ${showActions ? '1.2fr' : '0'};"><span>المنتج</span><span>الشراء</span><span>البيع</span><span>الكمية</span><span>الضريبة</span>${showActions ? '<span></span>' : ''}</div>`;
    filtered.forEach(p => {
        const low = p.qty <= (p.min || 5);
        const vat = p.vat || vatSettings.defaultVAT;
        html += `<div class="table-row" style="grid-template-columns: 2fr 0.8fr 0.8fr 0.6fr 0.7fr ${showActions ? '1.2fr' : '0'};">
            <span><strong>${p.name}</strong>${p.barcode ? `<br><small style="color:#A89070;font-size:10px;">${p.barcode}</small>` : ''}</span>
            <span>${formatMoney(p.buy)}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(p.sell)}</span>
            <span style="${low ? 'color:#E06060;font-weight:700;' : ''}">${p.qty}${low ? ' ⚠️' : ''}</span>
            <span style="color:#9B59B6;font-weight:700;font-size:11px;">${vat}%</span>
            ${showActions ? `<div style="display:flex;gap:4px;">
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
        </div>`;
    });
    container.innerHTML = html;
};

// ============================================================
// الكاشير - عرض الأصناف
// ============================================================
window.populateSaleProducts = function() {
    const sel = $('saleProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name} (متاح: ${p.qty})</option>`);
    sel.value = cv;
};

window.populateSaleCustomers = function() {
    const sel = $('saleCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">عميل نقدي</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    sel.value = cv;
};

window.updateSalePrice = function() {
    const id = $('saleProduct').value;
    if (!id) { $('salePrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('salePrice').value = p.sell;
};

window.addSaleItem = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('saleProduct').value;
    const qty = parseInt($('saleQty').value) || 0;
    const price = parseFloat($('salePrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const ex = currentSaleItems.find(i => i.productId == id);
    const totalQty = qty + (ex ? ex.qty : 0);
    if (totalQty > p.qty) { showToast(`⚠️ الكمية المتاحة: ${p.qty}`, 'error'); return; }
    const vatPercent = p.vat || vatSettings.defaultVAT;
    const subtotal = qty * price;
    const vatAmount = subtotal * (vatPercent / 100);
    const totalWithVAT = subtotal + vatAmount;
    if (ex) {
        ex.qty += qty;
        ex.subtotal = ex.qty * ex.price;
        ex.vatAmount = ex.subtotal * (ex.vatPercent / 100);
        ex.total = ex.subtotal + ex.vatAmount;
    } else {
        currentSaleItems.push({
            productId: p.id, name: p.name, qty, price,
            costPrice: p.buy, vatPercent: vatPercent,
            subtotal: subtotal, vatAmount: vatAmount, total: totalWithVAT
        });
    }
    $('saleQty').value = 1; $('salePrice').value = ''; $('saleProduct').value = '';
    renderCashier(); updateSaleTotals(); showToast('✅ تم إضافة الصنف', 'success');
};

window.removeSaleItem = function(i) { currentSaleItems.splice(i, 1); renderCashier(); updateSaleTotals(); };

window.renderCashier = function() {
    const c = $('saleItemsContainer'), tb = $('saleTotalBox');
    if (!c) return;
    if (currentSaleItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 1.8fr 0.7fr 0.8fr 0.8fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentSaleItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 1.8fr 0.7fr 0.8fr 0.8fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removeSaleItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
};

window.updateSaleTotals = function() {
    const subtotal = currentSaleItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentSaleItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const invoiceType = getRadioValue('saleInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const grandTotal = subtotal + finalVAT;
    if ($('saleSubtotal')) $('saleSubtotal').textContent = formatMoney(subtotal) + ' ج.م';
    if ($('saleVAT')) {
        $('saleVAT').textContent = isTaxInvoice ? formatMoney(finalVAT) + ' ج.م' : '0.00 ج.م (غير ضريبية)';
        $('saleVAT').style.color = isTaxInvoice ? '#9B59B6' : '#5D5D5D';
    }
    if ($('saleTotal')) $('saleTotal').textContent = formatMoney(grandTotal) + ' 🇪🇬';
};

// ============================================================
// حفظ فاتورة البيع (مهمة جداً)
// ============================================================
window.saveSale = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentSaleItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    for (const it of currentSaleItems) {
        const p = products.find(pr => pr.id == it.productId);
        if (!p || p.qty < it.qty) { showToast(`⚠️ الكمية غير كافية: ${it.name}`, 'error'); return; }
    }
    const subtotal = currentSaleItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentSaleItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const customer = $('saleCustomer').value || 'عميل نقدي';
    const paymentMethod = getRadioValue('salePaymentMethod', 'cash');
    const invoiceType = getRadioValue('saleInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const total = subtotal + finalVAT;
    const today = getTodayDate();

    if (paymentMethod === 'credit' && customer === 'عميل نقدي') {
        showToast('⚠️ اختر عميل مسجل للبيع الآجل', 'error');
        return;
    }

    let cogsTotal = 0;
    const itemCosts = [];
    currentSaleItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) {
            it.costPrice = p.buy;
            cogsTotal += (p.buy * it.qty);
            const before = p.qty;
            p.qty -= it.qty;
            itemCosts.push({ item: it, before: before, after: p.qty });
        }
    });

    const inv = {
        id: Date.now(), number: sales.length + 1, customer: customer,
        customerId: customers.find(c => c.name === customer)?.id || null,
        paymentMethod: paymentMethod, invoiceType: isTaxInvoice ? 'tax' : 'simple',
        subtotal: subtotal, vatTotal: finalVAT, cogs: cogsTotal, total: total,
        paidAmount: paymentMethod === 'cash' ? total : 0,
        remainingAmount: paymentMethod === 'cash' ? 0 : total,
        status: paymentMethod === 'cash' ? 'paid' : 'unpaid',
        items: JSON.parse(JSON.stringify(currentSaleItems)),
        relatedPayments: [], relatedReturns: [], journalEntryId: null,
        date: today, time: getNowTime(), createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    sales.push(inv);

    itemCosts.forEach(({ item, before, after }) => {
        logInventoryMovement({
            productId: item.productId, productName: item.name,
            type: 'out', qty: item.qty, price: item.costPrice,
            reason: 'sale', refType: 'sale', refId: inv.id, refNumber: inv.number,
            balanceBefore: before, balanceAfter: after
        });
    });

    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        const arAcc = getAccountByNameContains('العملاء');
        const salesAcc = getAccountByNameContains('إيرادات المبيعات');
        const vatAcc = getAccountByNameContains('ضريبة القيمة المضافة (دائن)');
        const cogsAcc = getAccountByNameContains('تكلفة البضاعة');
        const invAcc = getAccountByNameContains('المخزون');

        if (paymentMethod === 'cash' && cashAcc) {
            lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: total, credit: 0 });
        } else if (arAcc) {
            lines.push({ accountId: arAcc.id, accountName: arAcc.name, debit: total, credit: 0 });
        }
        if (salesAcc) lines.push({ accountId: salesAcc.id, accountName: salesAcc.name, debit: 0, credit: subtotal });
        if (finalVAT > 0 && vatAcc) lines.push({ accountId: vatAcc.id, accountName: vatAcc.name, debit: 0, credit: finalVAT });
        if (cogsAcc && cogsTotal > 0) lines.push({ accountId: cogsAcc.id, accountName: cogsAcc.name, debit: cogsTotal, credit: 0 });
        if (invAcc && cogsTotal > 0) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: 0, credit: cogsTotal });

        if (lines.length >= 2) {
            journalEntry = createJournalEntry(
                `فاتورة بيع ${isTaxInvoice ? 'ضريبية' : 'عادية'} #${inv.number} - ${customer}`,
                `SALE-${inv.number}`, today, lines, 'sale', inv.id
            );
            if (journalEntry) inv.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }

    if (paymentMethod === 'cash') {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: `${isTaxInvoice ? 'ضريبية' : 'عادية'} - فاتورة #${inv.number} - ${customer}`,
            partyName: customer, invoiceNumber: inv.number,
            refType: 'sale', refId: inv.id, journalEntryId: inv.journalEntryId,
            date: today, time: getNowTime()
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: 0,
            note: `بيع آجل - فاتورة #${inv.number} - ${customer} (دين)`,
            partyName: customer, invoiceNumber: inv.number,
            refType: 'sale_credit', refId: inv.id, journalEntryId: inv.journalEntryId,
            date: today, time: getNowTime()
        });
    }

    setData('products', products); setData('sales', sales); setData('treasury', treasury);
    addAuditLog('add', 'sale', `فاتورة بيع #${inv.number} - ${customer} - ${formatMoney(total)} ج.م`);

    window.currentSaleItems = [];
    const custEl = $('saleCustomer'); if (custEl) custEl.value = '';
    setRadioValue('salePaymentMethod', 'cash');
    setRadioValue('saleInvoiceType', 'simple');
    renderCashier(); updateSaleTotals(); populateSaleProducts();
    updateDashboard(); renderTreasury(); renderInventoryMovements();
    showToast(`✅ فاتورة #${inv.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
};

window.clearSale = function() {
    if (currentSaleItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    window.currentSaleItems = [];
    const custEl = $('saleCustomer'); if (custEl) custEl.value = '';
    setRadioValue('salePaymentMethod', 'cash');
    setRadioValue('saleInvoiceType', 'simple');
    renderCashier(); updateSaleTotals(); showToast('🗑️ تم الإلغاء', 'info');
};

// ============================================================
// الشراء
// ============================================================
window.populatePurSuppliers = function() {
    const sel = $('purSupplier'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    sel.value = cv;
};

window.populatePurProducts = function() {
    const sel = $('purProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    sel.value = cv;
};

window.updatePurPrice = function() {
    const id = $('purProduct').value;
    if (!id) { $('purPrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('purPrice').value = p.buy;
};

window.addPurItem = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('purProduct').value;
    const qty = parseInt($('purQty').value) || 0;
    const price = parseFloat($('purPrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const vatPercent = p.vat || vatSettings.defaultVAT;
    const subtotal = qty * price;
    const vatAmount = subtotal * (vatPercent / 100);
    const totalWithVAT = subtotal + vatAmount;
    const ex = currentPurItems.find(i => i.productId == id);
    if (ex) {
        ex.qty += qty;
        ex.subtotal = ex.qty * ex.price;
        ex.vatAmount = ex.subtotal * (ex.vatPercent / 100);
        ex.total = ex.subtotal + ex.vatAmount;
    } else {
        currentPurItems.push({
            productId: p.id, name: p.name, qty, price,
            vatPercent: vatPercent, subtotal: subtotal,
            vatAmount: vatAmount, total: totalWithVAT
        });
    }
    $('purQty').value = 1; $('purPrice').value = ''; $('purProduct').value = '';
    renderPurItems(); updatePurTotals(); showToast('✅ تم الإضافة', 'success');
};

window.removePurItem = function(i) { currentPurItems.splice(i, 1); renderPurItems(); updatePurTotals(); };

window.renderPurItems = function() {
    const c = $('purItemsContainer'), tb = $('purTotalBox');
    if (!c) return;
    if (currentPurItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 1.8fr 0.7fr 0.8fr 0.8fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentPurItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 1.8fr 0.7fr 0.8fr 0.8fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removePurItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
};

window.updatePurTotals = function() {
    const subtotal = currentPurItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentPurItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const invoiceType = getRadioValue('purInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const grandTotal = subtotal + finalVAT;
    if ($('purSubtotal')) $('purSubtotal').textContent = formatMoney(subtotal) + ' ج.م';
    if ($('purVAT')) {
        $('purVAT').textContent = isTaxInvoice ? formatMoney(finalVAT) + ' ج.م' : '0.00 ج.م (غير ضريبية)';
        $('purVAT').style.color = isTaxInvoice ? '#9B59B6' : '#5D5D5D';
    }
    if ($('purTotal')) $('purTotal').textContent = formatMoney(grandTotal) + ' 🇪🇬';
};

window.savePurchase = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentPurItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    const sid = $('purSupplier').value;
    if (!sid) { showToast('⚠️ اختر مورد', 'error'); return; }
    const supplier = suppliers.find(s => s.id == sid); if (!supplier) return;
    const paymentEl = $('purPayment');
    const payment = paymentEl ? paymentEl.value : 'cash';
    const invoiceType = getRadioValue('purInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const subtotal = currentPurItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentPurItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const total = subtotal + finalVAT;
    const today = getTodayDate();
    
    const itemChanges = [];
    currentPurItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) {
            const before = p.qty;
            p.qty += it.qty;
            p.buy = it.price;
            itemChanges.push({ item: it, before: before, after: p.qty });
        }
    });
    
    const inv = {
        id: Date.now(), number: purchases.length + 1,
        supplierId: supplier.id, supplierName: supplier.name,
        invoiceType: isTaxInvoice ? 'tax' : 'simple',
        subtotal: subtotal, vatTotal: finalVAT,
        items: JSON.parse(JSON.stringify(currentPurItems)),
        total: total, paidAmount: payment === 'cash' ? total : 0,
        remainingAmount: payment === 'cash' ? 0 : total,
        payment: payment, status: payment === 'cash' ? 'paid' : 'unpaid',
        relatedPayments: [], relatedReturns: [], journalEntryId: null,
        date: today, time: getNowTime(), createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    purchases.push(inv);
    
    itemChanges.forEach(({ item, before, after }) => {
        logInventoryMovement({
            productId: item.productId, productName: item.name,
            type: 'in', qty: item.qty, price: item.price,
            reason: 'purchase', refType: 'purchase', refId: inv.id, refNumber: inv.number,
            balanceBefore: before, balanceAfter: after
        });
    });
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        const apAcc = getAccountByNameContains('الموردين');
        const invAcc = getAccountByNameContains('المخزون');
        const vatAcc = getAccountByNameContains('ضريبة القيمة المضافة (مدين)');
        if (invAcc) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: subtotal, credit: 0 });
        if (finalVAT > 0 && vatAcc) lines.push({ accountId: vatAcc.id, accountName: vatAcc.name, debit: finalVAT, credit: 0 });
        if (payment === 'cash' && cashAcc) {
            lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: total });
        } else if (apAcc) {
            lines.push({ accountId: apAcc.id, accountName: apAcc.name, debit: 0, credit: total });
        }
        if (lines.length >= 2) {
            journalEntry = createJournalEntry(`فاتورة شراء #${inv.number} - ${supplier.name}`, `PUR-${inv.number}`, today, lines, 'purchase', inv.id);
            if (journalEntry) inv.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    if (payment === 'cash') {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: total,
            note: `فاتورة شراء #${inv.number} - ${supplier.name}`,
            partyName: supplier.name, invoiceNumber: inv.number,
            refType: 'purchase', refId: inv.id, journalEntryId: inv.journalEntryId,
            date: today, time: getNowTime()
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: 0,
            note: `شراء آجل - فاتورة #${inv.number} - ${supplier.name} (دين)`,
            partyName: supplier.name, invoiceNumber: inv.number,
            refType: 'purchase_credit', refId: inv.id, journalEntryId: inv.journalEntryId,
            date: today, time: getNowTime()
        });
    }
    
    setData('products', products); setData('purchases', purchases); setData('treasury', treasury);
    addAuditLog('add', 'purchase', `فاتورة شراء #${inv.number} - ${supplier.name} - ${formatMoney(total)} ج.م`);
    
    window.currentPurItems = [];
    const supEl = $('purSupplier'); if (supEl) supEl.value = '';
    setRadioValue('purInvoiceType', 'simple');
    renderPurItems(); updatePurTotals(); renderPurchases();
    populatePurProducts(); updateDashboard();
    renderTreasury(); renderInventoryMovements();
    showToast(`✅ فاتورة شراء #${inv.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
};

window.clearPurchase = function() {
    if (currentPurItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    window.currentPurItems = [];
    const supEl = $('purSupplier'); if (supEl) supEl.value = '';
    setRadioValue('purInvoiceType', 'simple');
    renderPurItems(); updatePurTotals(); showToast('🗑️ تم الإلغاء', 'info');
};

window.renderPurchases = function() {
    const tc = purchases.length;
    const ta = purchases.reduce((s, i) => s + (i.total || 0), 0);
    const pa = purchases.filter(i => i.status === 'pending' || i.status === 'unpaid' || i.status === 'partial')
                        .reduce((s, i) => s + (i.remainingAmount || i.total || 0), 0);
    const today = getTodayDate();
    const tda = purchases.filter(i => i.date === today).reduce((s, i) => s + (i.total || 0), 0);
    if ($('purTotalCount')) $('purTotalCount').textContent = tc;
    if ($('purTotalAmount')) $('purTotalAmount').textContent = formatMoney(ta);
    if ($('purPendingAmount')) $('purPendingAmount').textContent = formatMoney(pa);
    if ($('purTodayAmount')) $('purTodayAmount').textContent = formatMoney(tda);
    const c = $('purchasesList'); if (!c) return;
    if (purchases.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير شراء</span></div>`;
        return;
    }
    const sorted = [...purchases].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.6fr 0.8fr 1.2fr;"><span>#</span><span>المورد</span><span>المبلغ</span><span>النوع</span><span>الدفع</span><span></span></div>`;
    sorted.forEach(inv => {
        const sc = inv.status === 'paid' ? '#2D8F5E' : '#E6A830';
        const st = inv.status === 'paid' ? '✅ نقدي' : (inv.status === 'partial' ? '⚠️ جزئي' : '⏳ آجل');
        const isTax = inv.invoiceType === 'tax';
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.6fr 0.8fr 1.2fr;">
            <span>#${inv.number}</span><span>${inv.supplierName}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(inv.total)}</span>
            <span style="color:${isTax ? '#9B59B6' : '#5D5D5D'};font-size:10px;font-weight:700;">${isTax ? '🧾' : '📋'}</span>
            <span style="color:${sc};font-weight:700;font-size:10px;">${st}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="viewPurchase(${inv.id})"><i class="fas fa-eye"></i></button>
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deletePurchase(${inv.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>`;
    });
    c.innerHTML = html;
};

window.viewPurchase = function(id) {
    const inv = purchases.find(p => p.id === id); if (!inv) return;
    let itemsHtml = '';
    inv.items.forEach((it, i) => {
        itemsHtml += `<tr><td>${i + 1}</td><td>${it.name}</td><td>${it.qty}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.total)}</td></tr>`;
    });
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="inv-logo" alt="logo">` : '';
    const isTax = inv.invoiceType === 'tax';
    const taxBadge = isTax ? `<span class="tax-badge">🧾 فاتورة ضريبية</span>` : '';
    const subtotal = inv.subtotal !== undefined ? inv.subtotal : inv.total;
    const vatTotal = inv.vatTotal || 0;
    const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total;
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>🛒 فاتورة شراء #${inv.number}</h3>
        <div class="invoice-print ${isTax ? 'tax-invoice' : ''}">
            <div class="inv-header">${taxBadge}${logoHtml}
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>فاتورة شراء</p>
            </div>
            <div class="inv-info">
                <div><span class="lbl">رقم:</span> #${inv.number}</div>
                <div><span class="lbl">التاريخ:</span> ${inv.date}</div>
                <div><span class="lbl">المورد:</span> ${inv.supplierName}</div>
                <div><span class="lbl">الدفع:</span> ${inv.status === 'paid' ? '✅ نقدي' : '⏳ آجل'}</div>
            </div>
            <table><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="inv-totals">
                <div class="inv-total-row"><span>المجموع:</span><span>${formatMoney(subtotal)} ج.م</span></div>
                ${isTax ? `<div class="inv-total-row"><span>الضريبة:</span><span style="color:#9B59B6;">${formatMoney(vatTotal)} ج.م</span></div>` : ''}
                <div class="inv-total-row grand"><span>الإجمالي:</span><span>${formatMoney(inv.total)} 🇪🇬</span></div>
                ${remaining > 0 && remaining < inv.total ? `<div class="inv-total-row"><span>المتبقي:</span><span style="color:#E06060;">${formatMoney(remaining)} ج.م</span></div>` : ''}
            </div>
            <div class="inv-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

window.deletePurchase = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const inv = purchases.find(p => p.id === id); if (!inv) return;
    if (!confirm(`⚠️ حذف فاتورة الشراء #${inv.number}؟`)) return;
    inv.items.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) {
            const before = p.qty;
            p.qty -= it.qty;
            logInventoryMovement({
                productId: p.id, productName: p.name,
                type: 'out', qty: it.qty, price: it.price,
                reason: 'adjustment', refType: 'purchase_delete', refId: inv.id,
                refNumber: inv.number, balanceBefore: before, balanceAfter: p.qty,
                notes: `حذف فاتورة شراء #${inv.number}`
            });
        }
    });
    window.treasury = treasury.filter(t => !((t.refType === 'purchase' || t.refType === 'purchase_credit') && t.refId === id));
    window.purchases = purchases.filter(p => p.id !== id);
    setData('products', products); setData('purchases', purchases); setData('treasury', treasury);
    addAuditLog('delete', 'purchase', `حذف فاتورة شراء #${inv.number}`);
    renderPurchases(); renderProducts(); updateDashboard();
    renderTreasury(); renderInventoryMovements();
    showToast(`🗑️ تم الحذف`, 'info');
};

// ============================================================
// المرتجعات
// ============================================================
window.toggleReturnCustomer = function() {
    const typeEl = $('retType');
    if (!typeEl) return;
    const type = typeEl.value;
    if ($('retPartyLabel')) $('retPartyLabel').textContent = type === 'sale' ? 'العميل' : 'المورد';
    if (type === 'sale') populateRetCustomers();
    else populateRetSuppliers();
    const invSel = $('retOriginalInvoice');
    if (invSel) invSel.innerHTML = '<option value="">بدون ربط بفاتورة</option>';
};

window.populateRetCustomers = function() {
    const sel = $('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر عميل...</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
};

window.populateRetSuppliers = function() {
    const sel = $('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.name}">${s.name}</option>`);
};

window.populateRetProducts = function() {
    const sel = $('retProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    sel.value = cv;
};

window.loadReturnInvoices = function() {
    const typeEl = $('retType');
    const partyEl = $('retParty');
    const invSel = $('retOriginalInvoice');
    if (!typeEl || !partyEl || !invSel) return;
    const type = typeEl.value;
    const party = partyEl.value;
    invSel.innerHTML = '<option value="">بدون ربط بفاتورة</option>';
    if (!party) return;
    if (type === 'sale') {
        const customerInvoices = sales.filter(s => s.customer === party).sort((a, b) => b.id - a.id);
        customerInvoices.forEach(inv => {
            invSel.innerHTML += `<option value="${inv.id}">#${inv.number} - ${inv.date} - ${formatMoney(inv.total)} ج.م</option>`;
        });
    } else {
        const supplierInvoices = purchases.filter(p => p.supplierName === party).sort((a, b) => b.id - a.id);
        supplierInvoices.forEach(inv => {
            invSel.innerHTML += `<option value="${inv.id}">#${inv.number} - ${inv.date} - ${formatMoney(inv.total)} ج.م</option>`;
        });
    }
};

window.updateRetPrice = function() {
    const id = $('retProduct').value;
    const typeEl = $('retType');
    const type = typeEl ? typeEl.value : 'sale';
    if (!id) { $('retPrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('retPrice').value = type === 'sale' ? p.sell : p.buy;
};

window.addRetItem = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('retProduct').value;
    const qty = parseInt($('retQty').value) || 0;
    const price = parseFloat($('retPrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const typeEl = $('retType');
    const type = typeEl ? typeEl.value : 'sale';
    if (type === 'purchase' && qty > p.qty) { showToast(`⚠️ الكمية المتاحة: ${p.qty}`, 'error'); return; }
    const invId = $('retOriginalInvoice')?.value;
    if (invId) {
        const invoice = type === 'sale' ? sales.find(s => s.id == invId) : purchases.find(pp => pp.id == invId);
        if (invoice) {
            const soldQty = invoice.items.find(i => i.productId == id)?.qty || 0;
            if (soldQty === 0) { showToast('⚠️ المنتج غير موجود في هذه الفاتورة', 'error'); return; }
            const alreadyReturned = returns.filter(r => r.originalInvoiceId == invId && r.type === type)
                .flatMap(r => r.items || []).filter(i => i.productId == id).reduce((s, i) => s + i.qty, 0);
            const currentInCart = currentRetItems.find(i => i.productId == id)?.qty || 0;
            if (qty + alreadyReturned + currentInCart > soldQty) {
                showToast(`⚠️ الكمية المتبقية: ${soldQty - alreadyReturned - currentInCart}`, 'error');
                return;
            }
        }
    }
    const ex = currentRetItems.find(i => i.productId == id);
    if (ex) { ex.qty += qty; ex.total = ex.qty * ex.price; }
    else currentRetItems.push({ productId: p.id, name: p.name, qty, price, costPrice: p.buy, total: qty * price });
    $('retQty').value = 1; $('retPrice').value = ''; $('retProduct').value = '';
    renderRetItems(); showToast('✅ تم الإضافة', 'success');
};

window.removeRetItem = function(i) { currentRetItems.splice(i, 1); renderRetItems(); };

window.renderRetItems = function() {
    const c = $('retItemsContainer'), tb = $('retTotalBox'), te = $('retTotal');
    if (!c) return;
    if (currentRetItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    const total = currentRetItems.reduce((s, i) => s + i.total, 0);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentRetItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#E6A830;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removeRetItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' 🇪🇬';
};

window.saveReturn = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentRetItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    const typeEl = $('retType');
    const type = typeEl ? typeEl.value : 'sale';
    const party = $('retParty').value;
    if (!party) { showToast('⚠️ اختر العميل/المورد', 'error'); return; }
    const originalInvoiceId = $('retOriginalInvoice')?.value || null;
    const originalInvoice = originalInvoiceId
        ? (type === 'sale' ? sales.find(s => s.id == originalInvoiceId) : purchases.find(p => p.id == originalInvoiceId))
        : null;
    const total = currentRetItems.reduce((s, i) => s + i.total, 0);
    const today = getTodayDate();
    
    const itemChanges = [];
    currentRetItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) {
            const before = p.qty;
            if (type === 'sale') p.qty += it.qty;
            else p.qty -= it.qty;
            itemChanges.push({ item: it, before: before, after: p.qty });
        }
    });
    
    const ret = {
        id: Date.now(), number: returns.length + 1, type: type, party: party,
        partyId: (type === 'sale' ? customers.find(c => c.name === party)?.id : suppliers.find(s => s.name === party)?.id) || null,
        originalInvoiceId: originalInvoiceId,
        originalInvoiceNumber: originalInvoice?.number || null,
        paymentMethod: 'cash', items: JSON.parse(JSON.stringify(currentRetItems)),
        total: total, journalEntryId: null, date: today, time: getNowTime(),
        createdAt: new Date().toISOString(), createdBy: currentUser ? currentUser.name : 'unknown'
    };
    returns.push(ret);
    
    itemChanges.forEach(({ item, before, after }) => {
        logInventoryMovement({
            productId: item.productId, productName: item.name,
            type: type === 'sale' ? 'in' : 'out', qty: item.qty, price: item.price,
            reason: type === 'sale' ? 'return_sale' : 'return_purchase',
            refType: 'return', refId: ret.id, refNumber: ret.number,
            balanceBefore: before, balanceAfter: after
        });
    });
    
    if (originalInvoice) {
        if (!originalInvoice.relatedReturns) originalInvoice.relatedReturns = [];
        originalInvoice.relatedReturns.push(ret.id);
        setData('sales', sales);
        setData('purchases', purchases);
    }
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        const salesAcc = getAccountByNameContains('إيرادات المبيعات');
        const invAcc = getAccountByNameContains('المخزون');
        if (type === 'sale') {
            if (salesAcc) lines.push({ accountId: salesAcc.id, accountName: salesAcc.name, debit: total, credit: 0 });
            if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: total });
        } else {
            if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: total, credit: 0 });
            if (invAcc) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: 0, credit: total });
        }
        if (lines.length >= 2) {
            journalEntry = createJournalEntry(`مرتجع ${type === 'sale' ? 'بيع' : 'شراء'} #${ret.number} - ${party}`, `RET-${ret.number}`, today, lines, 'return', ret.id);
            if (journalEntry) ret.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    if (type === 'sale') {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: total,
            note: `مرتجع بيع #${ret.number} - ${party}${originalInvoice ? ` (فاتورة #${originalInvoice.number})` : ''}`,
            partyName: party, invoiceNumber: originalInvoice?.number || null,
            refType: 'return', refId: ret.id, journalEntryId: ret.journalEntryId,
            date: today, time: getNowTime()
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: `مرتجع شراء #${ret.number} - ${party}${originalInvoice ? ` (فاتورة #${originalInvoice.number})` : ''}`,
            partyName: party, invoiceNumber: originalInvoice?.number || null,
            refType: 'return', refId: ret.id, journalEntryId: ret.journalEntryId,
            date: today, time: getNowTime()
        });
    }
    
    setData('products', products); setData('returns', returns); setData('treasury', treasury);
    addAuditLog('add', 'return', `مرتجع ${type === 'sale' ? 'بيع' : 'شراء'} #${ret.number} - ${party} - ${formatMoney(total)} ج.م`);
    
    window.currentRetItems = [];
    const partyEl = $('retParty'); if (partyEl) partyEl.value = '';
    const invEl = $('retOriginalInvoice'); if (invEl) invEl.innerHTML = '<option value="">بدون ربط بفاتورة</option>';
    renderRetItems(); renderReturns(); populateRetProducts();
    updateDashboard(); renderTreasury(); renderInventoryMovements();
    showToast(`✅ مرتجع #${ret.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
};

window.clearReturn = function() {
    if (currentRetItems.length === 0) return;
    if (!confirm('⚠️ إلغاء المرتجع؟')) return;
    window.currentRetItems = [];
    const partyEl = $('retParty'); if (partyEl) partyEl.value = '';
    renderRetItems(); showToast('🗑️ تم الإلغاء', 'info');
};

window.renderReturns = function() {
    const tc = returns.length;
    const ta = returns.reduce((s, i) => s + (i.total || 0), 0);
    if ($('retTotalCount')) $('retTotalCount').textContent = tc;
    if ($('retTotalAmount')) $('retTotalAmount').textContent = formatMoney(ta);
    const c = $('returnsList'); if (!c) return;
    if (returns.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>`;
        return;
    }
    const sorted = [...returns].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1fr 1.2fr 1fr 1fr 0.8fr;"><span>#</span><span>النوع</span><span>العميل/المورد</span><span>المبلغ</span><span>الفاتورة الأصلية</span><span></span></div>`;
    sorted.forEach(r => {
        const tt = r.type === 'sale' ? '🔄 مرتجع بيع' : '🔄 مرتجع شراء';
        const tc2 = r.type === 'sale' ? '#E6A830' : '#E06060';
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1fr 1.2fr 1fr 1fr 0.8fr;">
            <span>#${r.number}</span>
            <span style="color:${tc2};font-weight:700;font-size:10px;">${tt}</span>
            <span>${r.party}</span>
            <span style="color:#E6A830;font-weight:700;">${formatMoney(r.total)}</span>
            <span style="font-size:10px;color:#A89070;">${r.originalInvoiceNumber ? `#${r.originalInvoiceNumber}` : '—'}</span>
            ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteReturn(${r.id})"><i class="fas fa-trash"></i></button>` : '<span></span>'}
        </div>`;
    });
    c.innerHTML = html;
};

window.deleteReturn = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const r = returns.find(x => x.id === id); if (!r) return;
    if (!confirm(`⚠️ حذف المرتجع #${r.number}؟`)) return;
    r.items.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) {
            const before = p.qty;
            if (r.type === 'sale') p.qty -= it.qty;
            else p.qty += it.qty;
            logInventoryMovement({
                productId: p.id, productName: p.name,
                type: r.type === 'sale' ? 'out' : 'in', qty: it.qty, price: it.price,
                reason: 'adjustment', refType: 'return_delete', refId: r.id,
                refNumber: r.number, balanceBefore: before, balanceAfter: p.qty,
                notes: `حذف مرتجع #${r.number}`
            });
        }
    });
    window.treasury = treasury.filter(t => !(t.refType === 'return' && t.refId === id));
    window.returns = returns.filter(x => x.id !== id);
    setData('products', products); setData('returns', returns); setData('treasury', treasury);
    addAuditLog('delete', 'return', `حذف مرتجع #${r.number}`);
    renderReturns(); renderProducts(); updateDashboard();
    renderTreasury(); renderInventoryMovements();
    showToast('🗑️ تم الحذف', 'info');
};

// ============================================================
// المصروفات
// ============================================================
window.saveExpense = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const note = $('expNote').value.trim();
    const amount = parseFloat($('expAmount').value) || 0;
    const category = $('expCategory').value;
    const date = $('expDate').value || getTodayDate();
    if (!note) { showToast('⚠️ أدخل البيان', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    if (getTreasuryBalance() < amount) { showToast('⚠️ رصيد الخزنة غير كافي', 'error'); return; }
    const exp = {
        id: Date.now(), note, amount, category, date,
        time: getNowTime(), journalEntryId: null,
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    expenses.push(exp);
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        let expenseAcc = null;
        if (category === 'مرتبات') expenseAcc = getAccountByNameContains('رواتب');
        else if (category === 'إيجار') expenseAcc = getAccountByNameContains('إيجار');
        else if (category === 'كهرباء' || category === 'مياه') expenseAcc = getAccountByNameContains('كهرباء');
        else if (category === 'صيانة') expenseAcc = getAccountByNameContains('صيانة');
        else expenseAcc = getAccountByNameContains('مصروفات متنوعة');
        if (expenseAcc) lines.push({ accountId: expenseAcc.id, accountName: expenseAcc.name, debit: amount, credit: 0 });
        if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: amount });
        if (lines.length >= 2) {
            journalEntry = createJournalEntry(`مصروف (${category}) - ${note}`, `EXP-${exp.id}`, date, lines, 'expense', exp.id);
            if (journalEntry) exp.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    treasury.push({
        id: Date.now() + 1, type: 'withdraw', amount,
        note: `مصروف (${category}) - ${note}`,
        partyName: null, invoiceNumber: null,
        refType: 'expense', refId: exp.id, journalEntryId: exp.journalEntryId,
        date, time: getNowTime()
    });
    setData('expenses', expenses); setData('treasury', treasury);
    addAuditLog('add', 'expense', `مصروف: ${note} - ${formatMoney(amount)} ج.م`);
    $('expNote').value = ''; $('expAmount').value = '';
    renderExpenses(); updateDashboard(); renderTreasury();
    showToast(`✅ تم الإضافة ${formatMoney(amount)} 🇪🇬`, 'success');
};

window.renderExpenses = function() {
    const tc = expenses.length;
    const ta = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const today = getTodayDate();
    const tda = expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0);
    const month = today.substring(0, 7);
    const ma = expenses.filter(e => (e.date || '').startsWith(month)).reduce((s, e) => s + (e.amount || 0), 0);
    if ($('expTotalCount')) $('expTotalCount').textContent = tc;
    if ($('expTotalAmount')) $('expTotalAmount').textContent = formatMoney(ta);
    if ($('expTodayAmount')) $('expTodayAmount').textContent = formatMoney(tda);
    if ($('expMonthAmount')) $('expMonthAmount').textContent = formatMoney(ma);
    const c = $('expensesList'); if (!c) return;
    if (expenses.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-money-bill-wave"></i><span>لا توجد مصروفات</span></div>`;
        return;
    }
    const sorted = [...expenses].sort((a, b) => b.id - a.id).slice(0, 30);
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>التصنيف</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(e => {
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.6fr;">
            <span>${e.note}</span>
            <span style="color:#E06060;font-weight:700;">${formatMoney(e.amount)}</span>
            <span style="font-size:11px;color:#A89070;">${e.category || 'عام'}</span>
            <span style="font-size:10px;color:#A89070;">${e.date}</span>
            ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button>` : '<span></span>'}
        </div>`;
    });
    c.innerHTML = html;
};

window.deleteExpense = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const e = expenses.find(x => x.id === id); if (!e) return;
    if (!confirm('⚠️ حذف هذا المصروف؟')) return;
    window.treasury = treasury.filter(t => !(t.refType === 'expense' && t.refId === id));
    window.expenses = expenses.filter(x => x.id !== id);
    setData('expenses', expenses); setData('treasury', treasury);
    addAuditLog('delete', 'expense', `حذف مصروف: ${e.note}`);
    renderExpenses(); updateDashboard(); renderTreasury();
    showToast('🗑️ تم الحذف', 'info');
};

console.log('✅ تم تحميل app-part2.js - العمليات');