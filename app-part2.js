// ============================================================
// الميزان 14.0.0 - الجزء 2: العمليات
// app-part2.js (نسخة كاملة - تصميم جدولي احترافي)
// ============================================================

console.log('📦 تحميل app-part2.js - العمليات + البحث + التصميم الجديد');

// ═══════════════════════════════════════════════════════════
// 🔍 نظام البحث الذكي المدمج
// ═══════════════════════════════════════════════════════════
window._srchTimers = {};

window._normAr = function(t) {
    if (!t) return '';
    return String(t).toLowerCase().trim()
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/[أإآا]/g, 'ا')
        .replace(/[يى]/g, 'ي')
        .replace(/ة/g, 'ه');
};

window._makeSearchable = function(selectId, placeholder, icon) {
    icon = icon || '🔍';
    const sel = document.getElementById(selectId);
    if (!sel) return false;
    if (sel.dataset.srch === 'true') return false;
    
    const opts = [];
    Array.from(sel.options).forEach(o => {
        if (o.value !== '') opts.push({ v: o.value, t: o.textContent.trim() });
    });
    if (opts.length === 0) return false;
    
    sel.dataset.srch = 'true';
    sel.style.display = 'none';
    
    const wrap = document.createElement('div');
    wrap.className = 'srch-wrap';
    wrap.style.cssText = 'position:relative;width:100%;';
    const uid = 'srch_' + selectId + '_' + Date.now();
    
    let cur = '';
    const c = Array.from(sel.options).find(o => o.value === sel.value);
    if (c && c.value !== '') cur = c.textContent.trim();
    
    wrap.innerHTML = 
        '<input type="text" id="' + uid + '" placeholder="' + placeholder + '" value="' + cur + '" autocomplete="off" inputmode="search" style="width:100%;font-size:15px;padding:11px 12px;border-radius:8px;border:2px solid #3D3D3D;background:#0D0D0D;color:#F5E6C8;font-family:inherit;box-sizing:border-box;outline:none;">' +
        '<div id="' + uid + '_d" style="display:none;position:absolute;top:calc(100% + 4px);right:0;left:0;background:#1C1C1C;border:2px solid #C9A94E;border-radius:10px;max-height:280px;overflow-y:auto;z-index:99999;box-shadow:0 12px 32px rgba(0,0,0,0.6);"></div>';
    
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    
    const inp = document.getElementById(uid);
    const dd = document.getElementById(uid + '_d');
    
    const showList = function(q) {
        const q2 = _normAr(q);
        const list = q2 ? opts.filter(o => _normAr(o.t).includes(q2)) : opts;
        if (!list.length) {
            dd.innerHTML = '<div style="padding:16px;text-align:center;color:#5D5D5D;font-size:14px;">لا توجد نتائج</div>';
            dd.style.display = 'block';
            return;
        }
        let h = '';
        list.slice(0, 100).forEach(function(o) {
            h += '<div class="srch-item" data-v="' + o.v + '" data-t="' + o.t.replace(/"/g, '&quot;') + '" style="padding:13px;cursor:pointer;border-bottom:1px solid #2D2D2D;color:#F5E6C8;font-size:14px;display:flex;align-items:center;gap:8px;"><span style="font-size:16px;">' + icon + '</span><span>' + o.t + '</span></div>';
        });
        dd.innerHTML = h;
        dd.style.display = 'block';
        
        dd.querySelectorAll('.srch-item').forEach(function(it) {
            const pick = function(ev) {
                ev.stopPropagation();
                inp.value = it.dataset.t;
                sel.value = it.dataset.v;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                dd.style.display = 'none';
                inp.blur();
            };
            it.addEventListener('touchend', pick, { passive: true });
            it.addEventListener('click', pick);
        });
    };
    
    inp.addEventListener('input', function() {
        clearTimeout(window._srchTimers[selectId]);
        const q = this.value;
        window._srchTimers[selectId] = setTimeout(function() { showList(q); }, 100);
    });
    inp.addEventListener('focus', function() { showList(this.value); });
    inp.addEventListener('blur', function() { setTimeout(function() { dd.style.display = 'none'; }, 250); });
    
    return true;
};

window._applyAllSearch = function() {
    const list = [
        ['saleCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['saleProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['saleWarehouse', '🔍 اختر المخزن...', '🏪'],
        ['purSupplier', '🔍 اكتب اسم المورد...', '🚚'],
        ['purProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['purWarehouse', '🔍 اختر المخزن...', '🏪'],
        ['retParty', '🔍 اختر الجهة...', '👤'],
        ['retProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['retWarehouse', '🔍 اختر المخزن...', '🏪'],
        ['collectCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['paySupplier', '🔍 اكتب اسم المورد...', '🚚'],
        ['settleCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['settleProduct', '🔍 اكتب اسم المنتج...', '📦']
    ];
    let n = 0;
    list.forEach(function(cfg) {
        if (_makeSearchable(cfg[0], cfg[1], cfg[2])) n++;
    });
    return n;
};

// ═══════════════════════════════════════════════════════════
// 🛒 نظام المبيعات (Sales)
// ═══════════════════════════════════════════════════════════

window.populateSaleProducts = function() {
    const sel = $('saleProduct'); if (!sel) return;
    const cv = sel.value;
    const whId = $('saleWarehouse')?.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => {
        let qty = p.qty;
        if (whId && typeof getProductStockInWarehouse === 'function') {
            qty = getProductStockInWarehouse(p.id, whId);
        }
        sel.innerHTML += `<option value="${p.id}">${p.name} (متاح: ${qty})</option>`;
    });
    sel.value = cv;
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
};

window.populateSaleCustomers = function() {
    const sel = $('saleCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">عميل نقدي</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    sel.value = cv;
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
};

window.populateSaleWarehouse = function() {
    const sel = $('saleWarehouse'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر المخزن...</option>';
    warehouses.forEach(w => {
        sel.innerHTML += `<option value="${w.id}" ${w.isDefault ? 'selected' : ''}>${w.name}${w.isDefault ? ' ⭐' : ''}</option>`;
    });
    sel.value = cv || (getDefaultWarehouse()?.id || '');
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
};

window.onWarehouseChange = function() {
    populateSaleProducts();
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
    const whId = $('saleWarehouse')?.value;
    
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    
    const p = products.find(pr => pr.id == id); if (!p) return;
    
    let availableQty = p.qty;
    if (whId && typeof getProductStockInWarehouse === 'function') {
        availableQty = getProductStockInWarehouse(id, whId);
    }
    
    const ex = currentSaleItems.find(i => i.productId == id);
    const totalQty = qty + (ex ? ex.qty : 0);
    if (totalQty > availableQty) {
        showToast(`⚠️ الكمية المتاحة: ${availableQty}`, 'error');
        return;
    }
    
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
    
    $('saleQty').value = 1;
    $('salePrice').value = '';
    $('saleProduct').value = '';
    $('saleProduct').dispatchEvent(new Event('change', { bubbles: true }));
    
    renderCashier();
    updateSaleTotals();
    showToast('✅ تم إضافة الصنف', 'success');
};

window.removeSaleItem = function(i) {
    currentSaleItems.splice(i, 1);
    renderCashier();
    updateSaleTotals();
};

// ═══════════════════════════════════════════════════════════
// 🎨 عرض جدول الأصناف (تصميم جديد)
// ═══════════════════════════════════════════════════════════

window.renderCashier = function() {
    const c = $('saleItemsContainer'), tb = $('saleTotalBox');
    if (!c) return;
    
    const badge = $('itemsCountBadge');
    if (badge) badge.textContent = currentSaleItems.length;
    
    if (currentSaleItems.length === 0) {
        c.innerHTML = `
            <div class="empty-items">
                <i class="fas fa-shopping-cart"></i>
                <span>لا توجد أصناف</span>
                <small>أضف صنف من الأعلى</small>
            </div>`;
        if (tb) tb.style.display = 'none';
        return;
    }
    
    let html = `
        <div class="items-header-row">
            <span>ID</span>
            <span>اسم الصنف</span>
            <span>الوحدة</span>
            <span>الكمية</span>
            <span>السعر</span>
            <span>الإجمالي</span>
            <span></span>
        </div>
    `;
    
    currentSaleItems.forEach((it, i) => {
        const prod = products.find(p => p.id == it.productId);
        const unit = prod?.unit || 'قطعة';
        const itemId = String(it.productId).slice(-4);
        
        html += `
            <div class="item-row">
                <span class="item-id">#${itemId}</span>
                <span class="item-name">${it.name}</span>
                <span class="item-unit">${unit}</span>
                <span class="item-qty">${it.qty}</span>
                <span class="item-price">${formatMoney(it.price)}</span>
                <span class="item-total">${formatMoney(it.total)}</span>
                <button class="item-delete" onclick="removeSaleItem(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
};

window.updateSaleTotals = function() {
    const subtotal = currentSaleItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentSaleItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const totalQty = currentSaleItems.reduce((s, i) => s + i.qty, 0);
    const invoiceType = getRadioValue('saleInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const grandTotal = subtotal + finalVAT;
    
    if ($('statItemsCount')) $('statItemsCount').textContent = currentSaleItems.length;
    if ($('statTotalQty')) $('statTotalQty').textContent = totalQty;
    if ($('saleSubtotal')) $('saleSubtotal').textContent = formatMoney(subtotal);
    if ($('saleVAT')) {
        $('saleVAT').textContent = isTaxInvoice ? formatMoney(finalVAT) : '0.00';
    }
    if ($('saleTotal')) $('saleTotal').textContent = formatMoney(grandTotal) + ' ج.م';
};

window.updateInvoiceHeader = function() {
    const today = new Date();
    if ($('invDateDisplay')) {
        $('invDateDisplay').textContent = String(today.getDate()).padStart(2, '0') + '/' + 
            String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear();
    }
    if ($('invTimeDisplay')) {
        $('invTimeDisplay').textContent = today.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    if ($('nextInvNum')) {
        $('nextInvNum').textContent = '#' + (sales.length + 1);
    }
};

window.printCurrentInvoice = function() {
    if (currentSaleItems.length === 0) {
        showToast('⚠️ لا توجد أصناف للطباعة', 'warning');
        return;
    }
    showToast('💡 احفظ الفاتورة أولاً ثم اطبعها', 'info');
};

// ═══════════════════════════════════════════════════════════
// 💾 حفظ فاتورة البيع
// ═══════════════════════════════════════════════════════════

window.saveSale = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentSaleItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    
    const whId = $('saleWarehouse')?.value || (typeof getDefaultWarehouse === 'function' ? getDefaultWarehouse()?.id : null);
    
    for (const it of currentSaleItems) {
        const p = products.find(pr => pr.id == it.productId);
        if (!p) { showToast(`⚠️ المنتج غير موجود: ${it.name}`, 'error'); return; }
        
        let available = p.qty;
        if (whId && typeof getProductStockInWarehouse === 'function') {
            available = getProductStockInWarehouse(it.productId, whId);
        }
        if (available < it.qty) {
            showToast(`⚠️ الكمية غير كافية: ${it.name} (متاح: ${available})`, 'error');
            return;
        }
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
    const itemChanges = [];
    currentSaleItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) {
            it.costPrice = p.buy;
            cogsTotal += (p.buy * it.qty);
            const before = p.qty;
            p.qty -= it.qty;
            
            if (whId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, whId);
                setProductStockInWarehouse(it.productId, whId, Math.max(0, whBefore - it.qty));
            }
            
            itemChanges.push({ item: it, before, after: p.qty });
        }
    });
    
    const inv = {
        id: Date.now(), number: sales.length + 1, customer: customer,
        customerId: customers.find(c => c.name === customer)?.id || null,
        warehouseId: whId,
        paymentMethod: paymentMethod,
        invoiceType: isTaxInvoice ? 'tax' : 'simple',
        subtotal: subtotal, vatTotal: finalVAT, cogs: cogsTotal, total: total,
        paidAmount: paymentMethod === 'cash' ? total : 0,
        remainingAmount: paymentMethod === 'cash' ? 0 : total,
        status: paymentMethod === 'cash' ? 'paid' : 'unpaid',
        items: JSON.parse(JSON.stringify(currentSaleItems)),
        relatedPayments: [], relatedReturns: [], journalEntryId: null,
        date: today, time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    sales.push(inv);
    
    itemChanges.forEach(({ item, before, after }) => {
        if (typeof logInventoryMovement === 'function') {
            logInventoryMovement({
                productId: item.productId, productName: item.name,
                type: 'out', qty: item.qty, price: item.costPrice,
                reason: 'sale', refType: 'sale', refId: inv.id, refNumber: inv.number,
                warehouseId: whId,
                balanceBefore: before, balanceAfter: after
            });
        }
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
                `فاتورة بيع #${inv.number} - ${customer}`,
                `SALE-${inv.number}`, today, lines, 'sale', inv.id
            );
            if (journalEntry) inv.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    if (paymentMethod === 'cash') {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: `فاتورة بيع #${inv.number} - ${customer}`,
            partyName: customer, invoiceNumber: inv.number,
            refType: 'sale', refId: inv.id, journalEntryId: inv.journalEntryId,
            date: today, time: getNowTime()
        });
    }
    
    setData('products', products);
    setData('sales', sales);
    setData('treasury', treasury);
    addAuditLog('add', 'sale', `فاتورة بيع #${inv.number} - ${customer} - ${formatMoney(total)} ج.م`);
    
    currentSaleItems = [];
    const custEl = $('saleCustomer'); if (custEl) custEl.value = '';
    setRadioValue('salePaymentMethod', 'cash');
    setRadioValue('saleInvoiceType', 'simple');
    
    renderCashier();
    updateSaleTotals();
    populateSaleProducts();
    if (typeof populateSaleWarehouse === 'function') populateSaleWarehouse();
    updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    updateInvoiceHeader();
    
    showToast(`✅ فاتورة #${inv.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
};

window.clearSale = function() {
    if (currentSaleItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    currentSaleItems = [];
    const custEl = $('saleCustomer'); if (custEl) custEl.value = '';
    setRadioValue('salePaymentMethod', 'cash');
    setRadioValue('saleInvoiceType', 'simple');
    renderCashier(); updateSaleTotals();
    showToast('🗑️ تم الإلغاء', 'info');
};

// ═══════════════════════════════════════════════════════════
// 🛍️ نظام المشتريات (Purchases)
// ═══════════════════════════════════════════════════════════

window.populatePurSuppliers = function() {
    const sel = $('purSupplier'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    sel.value = cv;
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
};

window.populatePurProducts = function() {
    const sel = $('purProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    sel.value = cv;
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
};

window.populatePurWarehouse = function() {
    const sel = $('purWarehouse'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر المخزن...</option>';
    warehouses.forEach(w => {
        sel.innerHTML += `<option value="${w.id}" ${w.isDefault ? 'selected' : ''}>${w.name}${w.isDefault ? ' ⭐' : ''}</option>`;
    });
    sel.value = cv || (getDefaultWarehouse()?.id || '');
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
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
    
    $('purQty').value = 1;
    $('purPrice').value = '';
    $('purProduct').value = '';
    $('purProduct').dispatchEvent(new Event('change', { bubbles: true }));
    
    renderPurItems();
    updatePurTotals();
    showToast('✅ تم الإضافة', 'success');
};

window.removePurItem = function(i) {
    currentPurItems.splice(i, 1);
    renderPurItems();
    updatePurTotals();
};

window.renderPurItems = function() {
    const c = $('purItemsContainer'), tb = $('purTotalBox');
    if (!c) return;
    if (currentPurItems.length === 0) {
        c.innerHTML = `
            <div class="empty-items">
                <i class="fas fa-shopping-cart"></i>
                <span>لا توجد أصناف</span>
                <small>أضف صنف من الأعلى</small>
            </div>`;
        if (tb) tb.style.display = 'none';
        return;
    }
    
    const badge = $('purItemsCountBadge');
    if (badge) badge.textContent = currentPurItems.length;
    
    let html = `
        <div class="items-header-row">
            <span>ID</span>
            <span>اسم الصنف</span>
            <span>الوحدة</span>
            <span>الكمية</span>
            <span>السعر</span>
            <span>الإجمالي</span>
            <span></span>
        </div>
    `;
    currentPurItems.forEach((it, i) => {
        const prod = products.find(p => p.id == it.productId);
        const unit = prod?.unit || 'قطعة';
        const itemId = String(it.productId).slice(-4);
        html += `
            <div class="item-row">
                <span class="item-id">#${itemId}</span>
                <span class="item-name">${it.name}</span>
                <span class="item-unit">${unit}</span>
                <span class="item-qty">${it.qty}</span>
                <span class="item-price">${formatMoney(it.price)}</span>
                <span class="item-total" style="color:#E06060;">${formatMoney(it.total)}</span>
                <button class="item-delete" onclick="removePurItem(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
};

window.updatePurTotals = function() {
    const subtotal = currentPurItems.reduce((s, i) => s + (i.subtotal || i.total), 0);
    const vatTotal = currentPurItems.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const totalQty = currentPurItems.reduce((s, i) => s + i.qty, 0);
    const invoiceType = getRadioValue('purInvoiceType', 'simple');
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const grandTotal = subtotal + finalVAT;
    
    if ($('purStatItemsCount')) $('purStatItemsCount').textContent = currentPurItems.length;
    if ($('purStatTotalQty')) $('purStatTotalQty').textContent = totalQty;
    if ($('purSubtotal')) $('purSubtotal').textContent = formatMoney(subtotal);
    if ($('purVAT')) {
        $('purVAT').textContent = isTaxInvoice ? formatMoney(finalVAT) : '0.00';
    }
    if ($('purTotal')) $('purTotal').textContent = formatMoney(grandTotal) + ' ج.م';
};

window.savePurchase = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentPurItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    
    const sid = $('purSupplier').value;
    if (!sid) { showToast('⚠️ اختر مورد', 'error'); return; }
    const supplier = suppliers.find(s => s.id == sid); if (!supplier) return;
    
    const whId = $('purWarehouse')?.value || (typeof getDefaultWarehouse === 'function' ? getDefaultWarehouse()?.id : null);
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
            
            if (whId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, whId);
                setProductStockInWarehouse(it.productId, whId, whBefore + it.qty);
            }
            
            itemChanges.push({ item: it, before, after: p.qty });
        }
    });
    
    const inv = {
        id: Date.now(), number: purchases.length + 1,
        supplierId: supplier.id, supplierName: supplier.name,
        warehouseId: whId,
        invoiceType: isTaxInvoice ? 'tax' : 'simple',
        subtotal: subtotal, vatTotal: finalVAT,
        items: JSON.parse(JSON.stringify(currentPurItems)),
        total: total,
        paidAmount: payment === 'cash' ? total : 0,
        remainingAmount: payment === 'cash' ? 0 : total,
        payment: payment, status: payment === 'cash' ? 'paid' : 'unpaid',
        relatedPayments: [], relatedReturns: [], journalEntryId: null,
        date: today, time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    purchases.push(inv);
    
    itemChanges.forEach(({ item, before, after }) => {
        if (typeof logInventoryMovement === 'function') {
            logInventoryMovement({
                productId: item.productId, productName: item.name,
                type: 'in', qty: item.qty, price: item.price,
                reason: 'purchase', refType: 'purchase', refId: inv.id, refNumber: inv.number,
                warehouseId: whId,
                balanceBefore: before, balanceAfter: after
            });
        }
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
    }
    
    setData('products', products);
    setData('purchases', purchases);
    setData('treasury', treasury);
    addAuditLog('add', 'purchase', `فاتورة شراء #${inv.number} - ${supplier.name} - ${formatMoney(total)} ج.م`);
    
    currentPurItems = [];
    const supEl = $('purSupplier'); if (supEl) supEl.value = '';
    setRadioValue('purInvoiceType', 'simple');
    
    renderPurItems();
    updatePurTotals();
    renderPurchases();
    populatePurProducts();
    if (typeof populatePurWarehouse === 'function') populatePurWarehouse();
    updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    
    showToast(`✅ فاتورة شراء #${inv.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
};

window.clearPurchase = function() {
    if (currentPurItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    currentPurItems = [];
    const supEl = $('purSupplier'); if (supEl) supEl.value = '';
    setRadioValue('purInvoiceType', 'simple');
    renderPurItems(); updatePurTotals();
    showToast('🗑️ تم الإلغاء', 'info');
};

window.renderPurchases = function() {
    const tc = purchases.length;
    const ta = purchases.reduce((s, i) => s + (i.total || 0), 0);
    const pa = purchases.filter(i => i.status === 'unpaid' || i.status === 'partial')
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
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>🛒 فاتورة شراء #${inv.number}</h3>
        <div class="invoice-print ${isTax ? 'tax-invoice' : ''}">
            <div class="inv-header">${taxBadge}${logoHtml}
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>فاتورة شراء</p>
                ${companyData.phone ? `<p>📞 ${companyData.phone}</p>` : ''}
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
            
            if (inv.warehouseId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, inv.warehouseId);
                setProductStockInWarehouse(it.productId, inv.warehouseId, Math.max(0, whBefore - it.qty));
            }
            
            if (typeof logInventoryMovement === 'function') {
                logInventoryMovement({
                    productId: p.id, productName: p.name,
                    type: 'out', qty: it.qty, price: it.price,
                    reason: 'adjustment', refType: 'purchase_delete', refId: inv.id,
                    refNumber: inv.number, balanceBefore: before, balanceAfter: p.qty,
                    notes: `حذف فاتورة شراء #${inv.number}`
                });
            }
        }
    });
    
    treasury = treasury.filter(t => !((t.refType === 'purchase' || t.refType === 'purchase_credit') && t.refId === id));
    purchases = purchases.filter(p => p.id !== id);
    setData('products', products);
    setData('purchases', purchases);
    setData('treasury', treasury);
    addAuditLog('delete', 'purchase', `حذف فاتورة شراء #${inv.number}`);
    renderPurchases();
    renderProducts();
    updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    showToast(`🗑️ تم الحذف`, 'info');
};

// ═══════════════════════════════════════════════════════════
// 🔄 نظام المرتجعات (Returns)
// ═══════════════════════════════════════════════════════════

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
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
};

window.populateRetSuppliers = function() {
    const sel = $('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.name}">${s.name}</option>`);
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
};

window.populateRetProducts = function() {
    const sel = $('retProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    sel.value = cv;
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
};

window.populateRetWarehouse = function() {
    const sel = $('retWarehouse'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر المخزن...</option>';
    warehouses.forEach(w => {
        sel.innerHTML += `<option value="${w.id}" ${w.isDefault ? 'selected' : ''}>${w.name}${w.isDefault ? ' ⭐' : ''}</option>`;
    });
    sel.value = cv || (getDefaultWarehouse()?.id || '');
    delete sel.dataset.srch;
    setTimeout(_applyAllSearch, 50);
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
    
    if (type === 'purchase' && qty > p.qty) {
        showToast(`⚠️ الكمية المتاحة: ${p.qty}`, 'error');
        return;
    }
    
    const ex = currentRetItems.find(i => i.productId == id);
    if (ex) { ex.qty += qty; ex.total = ex.qty * ex.price; }
    else currentRetItems.push({
        productId: p.id, name: p.name, qty, price,
        costPrice: p.buy, total: qty * price
    });
    
    $('retQty').value = 1;
    $('retPrice').value = '';
    $('retProduct').value = '';
    $('retProduct').dispatchEvent(new Event('change', { bubbles: true }));
    
    renderRetItems();
    showToast('✅ تم الإضافة', 'success');
};

window.removeRetItem = function(i) {
    currentRetItems.splice(i, 1);
    renderRetItems();
};

window.renderRetItems = function() {
    const c = $('retItemsContainer'), tb = $('retTotalBox'), te = $('retTotal');
    if (!c) return;
    if (currentRetItems.length === 0) {
        c.innerHTML = `
            <div class="empty-items">
                <i class="fas fa-undo-alt"></i>
                <span>لا توجد أصناف</span>
                <small>أضف صنف من الأعلى</small>
            </div>`;
        if (tb) tb.style.display = 'none';
        return;
    }
    
    const badge = $('retItemsCountBadge');
    if (badge) badge.textContent = currentRetItems.length;
    
    const total = currentRetItems.reduce((s, i) => s + i.total, 0);
    let html = `
        <div class="items-header-row">
            <span>ID</span>
            <span>اسم الصنف</span>
            <span>الوحدة</span>
            <span>الكمية</span>
            <span>السعر</span>
            <span>الإجمالي</span>
            <span></span>
        </div>
    `;
    currentRetItems.forEach((it, i) => {
        const prod = products.find(p => p.id == it.productId);
        const unit = prod?.unit || 'قطعة';
        const itemId = String(it.productId).slice(-4);
        html += `
            <div class="item-row">
                <span class="item-id">#${itemId}</span>
                <span class="item-name">${it.name}</span>
                <span class="item-unit">${unit}</span>
                <span class="item-qty">${it.qty}</span>
                <span class="item-price">${formatMoney(it.price)}</span>
                <span class="item-total" style="color:#E6A830;">${formatMoney(it.total)}</span>
                <button class="item-delete" onclick="removeRetItem(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' ج.م';
};

window.saveReturn = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentRetItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    
    const typeEl = $('retType');
    const type = typeEl ? typeEl.value : 'sale';
    const party = $('retParty').value;
    if (!party) { showToast('⚠️ اختر العميل/المورد', 'error'); return; }
    
    const whId = $('retWarehouse')?.value || (typeof getDefaultWarehouse === 'function' ? getDefaultWarehouse()?.id : null);
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
            
            if (whId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, whId);
                if (type === 'sale') setProductStockInWarehouse(it.productId, whId, whBefore + it.qty);
                else setProductStockInWarehouse(it.productId, whId, Math.max(0, whBefore - it.qty));
            }
            
            itemChanges.push({ item: it, before, after: p.qty });
        }
    });
    
    const ret = {
        id: Date.now(), number: returns.length + 1, type: type, party: party,
        partyId: (type === 'sale' ? customers.find(c => c.name === party)?.id : suppliers.find(s => s.name === party)?.id) || null,
        warehouseId: whId,
        originalInvoiceId: originalInvoiceId,
        originalInvoiceNumber: originalInvoice?.number || null,
        paymentMethod: 'cash',
        items: JSON.parse(JSON.stringify(currentRetItems)),
        total: total, journalEntryId: null,
        date: today, time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    returns.push(ret);
    
    itemChanges.forEach(({ item, before, after }) => {
        if (typeof logInventoryMovement === 'function') {
            logInventoryMovement({
                productId: item.productId, productName: item.name,
                type: type === 'sale' ? 'in' : 'out', qty: item.qty, price: item.price,
                reason: type === 'sale' ? 'return_sale' : 'return_purchase',
                refType: 'return', refId: ret.id, refNumber: ret.number,
                warehouseId: whId,
                balanceBefore: before, balanceAfter: after
            });
        }
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
            note: `مرتجع بيع #${ret.number} - ${party}`,
            partyName: party, invoiceNumber: originalInvoice?.number || null,
            refType: 'return', refId: ret.id, journalEntryId: ret.journalEntryId,
            date: today, time: getNowTime()
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: `مرتجع شراء #${ret.number} - ${party}`,
            partyName: party, invoiceNumber: originalInvoice?.number || null,
            refType: 'return', refId: ret.id, journalEntryId: ret.journalEntryId,
            date: today, time: getNowTime()
        });
    }
    
    setData('products', products);
    setData('returns', returns);
    setData('treasury', treasury);
    addAuditLog('add', 'return', `مرتجع ${type === 'sale' ? 'بيع' : 'شراء'} #${ret.number} - ${party} - ${formatMoney(total)} ج.م`);
    
    currentRetItems = [];
    const partyEl = $('retParty'); if (partyEl) partyEl.value = '';
    const invEl = $('retOriginalInvoice'); if (invEl) invEl.innerHTML = '<option value="">بدون ربط بفاتورة</option>';
    
    renderRetItems();
    renderReturns();
    populateRetProducts();
    if (typeof populateRetWarehouse === 'function') populateRetWarehouse();
    updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    
    showToast(`✅ مرتجع #${ret.number} بمبلغ ${formatMoney(total)} 🇪🇬`, 'success');
};

window.clearReturn = function() {
    if (currentRetItems.length === 0) return;
    if (!confirm('⚠️ إلغاء المرتجع؟')) return;
    currentRetItems = [];
    const partyEl = $('retParty'); if (partyEl) partyEl.value = '';
    renderRetItems();
    showToast('🗑️ تم الإلغاء', 'info');
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
            
            if (r.warehouseId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, r.warehouseId);
                if (r.type === 'sale') setProductStockInWarehouse(it.productId, r.warehouseId, Math.max(0, whBefore - it.qty));
                else setProductStockInWarehouse(it.productId, r.warehouseId, whBefore + it.qty);
            }
        }
    });
    
    treasury = treasury.filter(t => !(t.refType === 'return' && t.refId === id));
    returns = returns.filter(x => x.id !== id);
    setData('products', products);
    setData('returns', returns);
    setData('treasury', treasury);
    addAuditLog('delete', 'return', `حذف مرتجع #${r.number}`);
    renderReturns();
    renderProducts();
    updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    showToast('🗑️ تم الحذف', 'info');
};

// ═══════════════════════════════════════════════════════════
// 💸 نظام المصروفات (Expenses)
// ═══════════════════════════════════════════════════════════

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
    setData('expenses', expenses);
    setData('treasury', treasury);
    addAuditLog('add', 'expense', `مصروف: ${note} - ${formatMoney(amount)} ج.م`);
    $('expNote').value = '';
    $('expAmount').value = '';
    renderExpenses();
    updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
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
    treasury = treasury.filter(t => !(t.refType === 'expense' && t.refId === id));
    expenses = expenses.filter(x => x.id !== id);
    setData('expenses', expenses);
    setData('treasury', treasury);
    addAuditLog('delete', 'expense', `حذف مصروف: ${e.note}`);
    renderExpenses();
    updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    showToast('🗑️ تم الحذف', 'info');
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة النهائية
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        const n = _applyAllSearch();
        console.log(`🔍 تم تفعيل البحث على ${n} قائمة (app-part2)`);
    }, 2000);
    
    setTimeout(function() {
        _applyAllSearch();
        if (typeof updateInvoiceHeader === 'function') updateInvoiceHeader();
    }, 4000);
});

setInterval(() => {
    if ($('invTimeDisplay') && typeof updateInvoiceHeader === 'function') {
        updateInvoiceHeader();
    }
}, 60000);

window.refreshInvoiceSearch = function() {
    const n = _applyAllSearch();
    if (typeof showToast === 'function') {
        showToast(`✅ تم تفعيل البحث على ${n} قائمة`, 'success');
    }
    return n;
};

console.log('✅ تم تحميل app-part2.js - العمليات + البحث + التصميم الجديد');
