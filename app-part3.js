// ============================================================
// الميزان 14.0.0 - الجزء 3: العرض والتهيئة (نسخة نهائية)
// app-part3.js (مع تنسيق الإيصالات الاحترافي)
// ============================================================

// ============================================================
// الخزنة
// ============================================================
// ============================================================
// ✅ دوال مساعدة (يجب إضافتها)
// ============================================================

window.updateHeaderCompanyName = function() {
    try {
        const el = document.getElementById('headerCompanyName');
        if (el) el.textContent = (typeof companyData !== 'undefined' && companyData.name) ? companyData.name : 'نظام محاسبة';
    } catch (e) {
        console.warn('⚠️ خطأ في updateHeaderCompanyName:', e.message);
    }
};

window.updateJournalCheck = function() {
    try {
        const debit = parseFloat(document.getElementById('jeDebitAmount')?.value) || 0;
        const credit = parseFloat(document.getElementById('jeCreditAmount')?.value) || 0;
        const checkEl = document.getElementById('jeCheck');
        const statusEl = document.getElementById('jeBalanceStatus');
        if (!checkEl || !statusEl) return;
        
        if (debit === 0 && credit === 0) {
            checkEl.className = 'journal-check';
            statusEl.textContent = 'أدخل المبالغ';
            statusEl.style.color = '#A89070';
        } else if (Math.abs(debit - credit) < 0.01 && debit > 0) {
            checkEl.className = 'journal-check balanced';
            statusEl.textContent = 'متوازن ✅';
            statusEl.style.color = '#2D8F5E';
        } else {
            checkEl.className = 'journal-check unbalanced';
            statusEl.textContent = `غير متوازن (فرق: ${formatMoney(Math.abs(debit - credit))})`;
            statusEl.style.color = '#E06060';
        }
    } catch (e) {
        console.warn('⚠️ خطأ في updateJournalCheck:', e.message);
    }
};

window.updateClock = function() {
    try {
        const el = document.getElementById('liveDateTime');
        if (!el) return;
        const now = new Date();
        const date = String(now.getDate()).padStart(2, '0') + '/' +
                     String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
        const time = now.toLocaleTimeString('en-GB', { hour12: false });
        el.textContent = date + ' ' + time;
    } catch (e) {
        console.warn('⚠️ خطأ في updateClock:', e.message);
    }
};

setInterval(function() {
    if (typeof updateClock === 'function') updateClock();
}, 1000);

window.getTreasuryBalance = function() {
    return treasury.reduce((sum, t) => t.type === 'deposit' ? sum + (t.amount || 0) : sum - (t.amount || 0), 0);
};

window.filterTreasury = function(filter, btn) {
    window.currentTreasuryFilter = filter;
    document.querySelectorAll('#page-treasury .filter-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTreasury();
};

window.addTreasuryTransaction = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const typeEl = $('treasuryType');
    const type = typeEl ? typeEl.value : 'deposit';
    const amount = parseFloat($('treasuryAmount').value) || 0;
    const note = $('treasuryNote').value.trim() || (type === 'deposit' ? 'إيداع' : 'سحب');
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    if (type === 'withdraw' && getTreasuryBalance() < amount) { showToast('⚠️ رصيد الخزنة غير كافي', 'error'); return; }
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        const capitalAcc = getAccountByNameContains('رأس المال');
        const drawingsAcc = getAccountByNameContains('المسحوبات');
        if (type === 'deposit' && capitalAcc && cashAcc) {
            lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: amount, credit: 0 });
            lines.push({ accountId: capitalAcc.id, accountName: capitalAcc.name, debit: 0, credit: amount });
        } else if (type === 'withdraw' && drawingsAcc && cashAcc) {
            lines.push({ accountId: drawingsAcc.id, accountName: drawingsAcc.name, debit: amount, credit: 0 });
            lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: amount });
        }
        if (lines.length >= 2) {
            journalEntry = createJournalEntry(`${type === 'deposit' ? 'إيداع' : 'سحب'} يدوي - ${note}`, `TRS-${Date.now()}`, getTodayDate(), lines, 'manual', null);
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    treasury.push({
        id: Date.now(), type, amount, note,
        partyName: null, invoiceNumber: null,
        refType: 'manual', refId: null,
        journalEntryId: journalEntry ? journalEntry.id : null,
        date: getTodayDate(), time: getNowTime(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    });
    setData('treasury', treasury);
    addAuditLog('add', 'treasury', `${type === 'deposit' ? 'إيداع' : 'سحب'} ${formatMoney(amount)} ج.م - ${note}`);
    $('treasuryAmount').value = ''; $('treasuryNote').value = '';
    renderTreasury(); updateDashboard();
    showToast(type === 'deposit' ? `✅ إيداع ${formatMoney(amount)}` : `✅ سحب ${formatMoney(amount)}`, 'success');
};

window.renderTreasury = function() {
    const balance = getTreasuryBalance();
    if ($('treasuryBalance')) $('treasuryBalance').textContent = formatMoney(balance) + ' 🇪🇬';
    const dep = treasury.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.amount || 0), 0);
    const wit = treasury.filter(t => t.type === 'withdraw').reduce((s, t) => s + (t.amount || 0), 0);
    if ($('treasuryDeposits')) $('treasuryDeposits').textContent = formatMoney(dep);
    if ($('treasuryWithdrawals')) $('treasuryWithdrawals').textContent = formatMoney(wit);
    
    const c = $('treasuryList'); if (!c) return;
    let filtered = treasury.filter(t => t.amount > 0);
    if (currentTreasuryFilter === 'sale') filtered = filtered.filter(t => t.refType === 'sale');
    else if (currentTreasuryFilter === 'purchase') filtered = filtered.filter(t => t.refType === 'purchase');
    else if (currentTreasuryFilter === 'payment') filtered = filtered.filter(t => t.refType === 'collect' || t.refType === 'pay');
    else if (currentTreasuryFilter === 'expense') filtered = filtered.filter(t => t.refType === 'expense');
    else if (currentTreasuryFilter === 'return') filtered = filtered.filter(t => t.refType === 'return');
    else if (currentTreasuryFilter === 'manual') filtered = filtered.filter(t => t.refType === 'manual');
    
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-vault"></i><span>لا توجد حركات</span></div>`;
        return;
    }
    const sorted = [...filtered].sort((a, b) => b.id - a.id).slice(0, 100);
    let html = `<div class="table-header" style="grid-template-columns: 2.2fr 1fr 1fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>النوع</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(t => {
        const isDep = t.type === 'deposit';
        const color = isDep ? '#2D8F5E' : '#E06060';
        const sign = isDep ? '+' : '-';
        const canDel = t.refType === 'manual' && canDelete();
        const refIcons = {
            'sale': '💰', 'sale_credit': '💰', 'purchase': '🛒', 'purchase_credit': '🛒',
            'return': '🔄', 'collect': '✅', 'pay': '💸', 'expense': '💸', 'manual': '✋'
        };
        const icon = refIcons[t.refType] || '📋';
        html += `<div class="table-row" style="grid-template-columns: 2.2fr 1fr 1fr 1fr 0.6fr;">
            <span style="font-size:11px;">${icon} ${t.note}${t.partyName ? `<br><small style="color:#A89070;font-size:9px;">👤 ${t.partyName}${t.invoiceNumber ? ` • فاتورة #${t.invoiceNumber}` : ''}</small>` : ''}</span>
            <span style="color:${color};font-weight:700;">${sign}${formatMoney(t.amount)}</span>
            <span style="color:${color};font-size:10px;font-weight:700;">${isDep ? '💚 إيداع' : '❤️ سحب'}</span>
            <span style="font-size:10px;color:#A89070;">${t.date}<br>${t.time || ''}</span>
            ${canDel ? `<button class="btn btn-danger btn-sm" onclick="deleteTreasury(${t.id})"><i class="fas fa-trash"></i></button>` : '<span style="font-size:10px;color:#5D5D5D;">🔗</span>'}
        </div>`;
    });
    c.innerHTML = html;
};

window.deleteTreasury = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const t = treasury.find(tr => tr.id === id); if (!t) return;
    if (t.refType !== 'manual') { showToast('⚠️ مرتبطة بفاتورة', 'warning'); return; }
    if (!confirm('⚠️ حذف الحركة؟')) return;
    window.treasury = treasury.filter(tr => tr.id !== id);
    setData('treasury', treasury);
    addAuditLog('delete', 'treasury', `حذف حركة خزنة: ${t.note}`);
    renderTreasury(); updateDashboard();
    showToast('🗑️ تم الحذف', 'info');
};

// ============================================================
// لوحة التحكم
// ============================================================
window.updateDashboard = function() {
    const totalSales = sales.reduce((s, i) => s + (i.total || 0), 0);
    const totalPurchases = purchases.reduce((s, i) => s + (i.total || 0), 0);
    const totalExpenses = expenses.reduce((s, i) => s + (i.amount || 0), 0);
    const totalReturns = returns.reduce((s, i) => s + (i.total || 0), 0);
    const cogs = getCOGS(sales);
    const returnsCOGS = getReturnsCOGS(returns);
    const returnsPurchase = returns.filter(r => r.type === 'purchase').reduce((s, r) => s + (r.total || 0), 0);
    const profit = totalSales - cogs - totalExpenses + returnsPurchase - returnsCOGS;
    
    if ($('dashSales')) $('dashSales').textContent = formatMoney(totalSales);
    if ($('dashPurchases')) $('dashPurchases').textContent = formatMoney(totalPurchases);
    if ($('dashExpenses')) $('dashExpenses').textContent = formatMoney(totalExpenses);
    if ($('dashReturns')) $('dashReturns').textContent = formatMoney(totalReturns);
    if ($('dashProfit')) {
        $('dashProfit').textContent = formatMoney(profit);
        $('dashProfit').style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
    }
    if ($('dashTreasury')) $('dashTreasury').textContent = formatMoney(getTreasuryBalance());
    if ($('dashProducts')) $('dashProducts').textContent = products.length;
    const totalQty = products.reduce((s, p) => s + (p.qty || 0), 0);
    if ($('dashInventory')) $('dashInventory').textContent = totalQty;

    let totalCustomerDebt = 0;
    customers.forEach(c => { totalCustomerDebt += getCustomerBalance(c.name); });
    if ($('dashCustomerDebt')) $('dashCustomerDebt').textContent = formatMoney(totalCustomerDebt);

    let totalSupplierDebt = 0;
    suppliers.forEach(s => { totalSupplierDebt += getSupplierBalance(s.name); });
    if ($('dashSupplierDebt')) $('dashSupplierDebt').textContent = formatMoney(totalSupplierDebt);

    const vatStats = calculateVATStats();
    if ($('dashVATSales')) $('dashVATSales').textContent = formatMoney(vatStats.salesVAT);
    if ($('dashVATDue')) $('dashVATDue').textContent = formatMoney(vatStats.vatDue);

    renderMiniChart();

    const container = $('dashLastSales');
    if (!container) return;
    if (sales.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد مبيعات</span></div>`;
        return;
    }
    const last5 = [...sales].sort((a, b) => b.id - a.id).slice(0, 5);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.5fr 1fr 1fr;"><span>#</span><span>العميل</span><span>المبلغ</span><span>التاريخ</span></div>`;
    last5.forEach(inv => {
        html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.5fr 1fr 1fr;">
            <span>#${inv.number}</span><span>${inv.customer}</span>
            <span style="color:#2D8F5E;font-weight:700;">${formatMoney(inv.total)}</span>
            <span style="font-size:11px;color:#A89070;">${inv.date}</span>
        </div>`;
    });
    container.innerHTML = html;
};

window.calculateVATStats = function(dateFilter = null) {
    let salesVAT = 0, purchasesVAT = 0;
    const filterFn = (item) => !dateFilter || (item.date || '').startsWith(dateFilter);
    sales.forEach(s => { if (s.invoiceType === 'tax' && filterFn(s)) salesVAT += (s.vatTotal || 0); });
    purchases.forEach(p => { if (p.invoiceType === 'tax' && filterFn(p)) purchasesVAT += (p.vatTotal || 0); });
    return { salesVAT, purchasesVAT, vatDue: salesVAT - purchasesVAT };
};

window.getCOGS = function(salesArr) {
    let totalCOGS = 0;
    (salesArr || []).forEach(inv => {
        (inv.items || []).forEach(item => {
            const p = products.find(pr => pr.id == item.productId);
            const costPrice = (item.costPrice !== undefined && item.costPrice > 0) ? item.costPrice : (p ? p.buy : 0);
            totalCOGS += costPrice * (item.qty || 0);
        });
    });
    return totalCOGS;
};

window.getReturnsCOGS = function(returnsArr) {
    let total = 0;
    (returnsArr || []).forEach(ret => {
        if (ret.type !== 'sale') return;
        (ret.items || []).forEach(item => {
            const p = products.find(pr => pr.id == item.productId);
            const costPrice = (item.costPrice !== undefined && item.costPrice > 0) ? item.costPrice : (p ? p.buy : 0);
            total += costPrice * (item.qty || 0);
        });
    });
    return total;
};

window.renderMiniChart = function() {
    const container = $('miniChart'); if (!container) return;
    const days = [];
    const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySales = sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.total || 0), 0);
        days.push({ date: dateStr, label: dayNames[d.getDay()], total: daySales });
    }
    const maxVal = Math.max(...days.map(d => d.total), 1);
    container.innerHTML = days.map(d => {
        const h = Math.max((d.total / maxVal) * 80, 4);
        return `<div class="bar-wrap">
            <div class="bar" style="height:${h}px;">
                ${d.total > 0 ? `<span class="bar-value">${d.total.toFixed(0)}</span>` : ''}
            </div>
            <div class="bar-label">${d.label}</div>
        </div>`;
    }).join('');
};

window.getCustomerBalance = function(customerName) {
    if (!customerName || customerName === 'عميل نقدي') return 0;
    const totalRemaining = sales
        .filter(s => s.customer === customerName && s.paymentMethod === 'credit')
        .reduce((sum, s) => sum + (s.remainingAmount !== undefined ? s.remainingAmount : s.total), 0);
    return Math.max(0, totalRemaining);
};

window.getSupplierBalance = function(supplierName) {
    if (!supplierName) return 0;
    const totalRemaining = purchases
        .filter(p => p.supplierName === supplierName && p.payment === 'credit')
        .reduce((sum, p) => sum + (p.remainingAmount !== undefined ? p.remainingAmount : p.total), 0);
    return Math.max(0, totalRemaining);
};

// ============================================================
// العملاء (مع حماية كاملة)
// ============================================================
window.saveCustomer = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('customerId').value;
    const name = $('customerName').value.trim();
    const phone = $('customerPhone').value.trim();
    const whatsapp = $('customerWhatsapp').value.trim();
    const address = $('customerAddress').value.trim();
    if (!name) { showToast('⚠️ أدخل اسم العميل', 'error'); return; }
    
    if (id) {
        if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
        const idx = customers.findIndex(c => c.id == id);
        if (idx > -1) {
            customers[idx] = { ...customers[idx], name, phone, whatsapp, address };
            addAuditLog('edit', 'customer', `تعديل عميل: ${name}`);
            showToast('✅ تم تعديل العميل', 'success');
        }
    } else {
        if (customers.find(c => c.name === name)) { showToast('⚠️ العميل موجود', 'warning'); return; }
        customers.push({ id: Date.now(), name, phone, whatsapp, address, createdAt: new Date().toISOString() });
        addAuditLog('add', 'customer', `إضافة عميل: ${name}`);
        showToast('✅ تم إضافة العميل', 'success');
    }
    
    setData('customers', customers);
    resetCustomerForm(); 
    renderCustomers();
    
    if (typeof populateSaleCustomers === 'function') { try { populateSaleCustomers(); } catch(e) {} }
    if (typeof populateRetCustomers === 'function') { try { populateRetCustomers(); } catch(e) {} }
    if (typeof populateCollectCustomers === 'function') { try { populateCollectCustomers(); } catch(e) {} }
    if (typeof populateSettleCustomers === 'function') { try { populateSettleCustomers(); } catch(e) {} }
};

window.editCustomer = function(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const c = customers.find(cu => cu.id == id); if (!c) return;
    $('customerId').value = c.id; $('customerName').value = c.name;
    $('customerPhone').value = c.phone || '';
    $('customerWhatsapp').value = c.whatsapp || '';
    $('customerAddress').value = c.address || '';
    $('customerFormTitle').textContent = '✏️ تعديل العميل';
    $('customerSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteCustomer = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const c = customers.find(cu => cu.id == id); if (!c) return;
    const balance = getCustomerBalance(c.name);
    if (balance > 0) {
        if (!confirm(`⚠️ العميل عليه مديونية ${formatMoney(balance)} 🇪🇬. متابعة الحذف؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف العميل "${c.name}"؟`)) return;
    }
    window.customers = customers.filter(cu => cu.id != id);
    setData('customers', customers);
    addAuditLog('delete', 'customer', `حذف عميل: ${c.name}`);
    renderCustomers();
    if (typeof populateSaleCustomers === 'function') { try { populateSaleCustomers(); } catch(e) {} }
    if (typeof populateRetCustomers === 'function') { try { populateRetCustomers(); } catch(e) {} }
    if (typeof populateCollectCustomers === 'function') { try { populateCollectCustomers(); } catch(e) {} }
    if (typeof populateSettleCustomers === 'function') { try { populateSettleCustomers(); } catch(e) {} }
    showToast('🗑️ تم حذف العميل', 'info');
};

window.resetCustomerForm = function() {
    $('customerId').value = ''; $('customerName').value = '';
    $('customerPhone').value = ''; $('customerWhatsapp').value = '';
    $('customerAddress').value = '';
    $('customerFormTitle').textContent = '➕ إضافة عميل';
    $('customerSaveBtnText').textContent = 'إضافة';
};

window.renderCustomers = function() {
    const c = $('customerList'); if (!c) return;
    const search = ($('customerSearch')?.value || '').trim().toLowerCase();
    let filtered = customers;
    if (search) filtered = customers.filter(cu =>
        cu.name.toLowerCase().includes(search) ||
        (cu.phone && cu.phone.includes(search)) ||
        (cu.whatsapp && cu.whatsapp.includes(search))
    );
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>${search ? 'لا توجد نتائج' : 'لا يوجد عملاء'}</span></div>`;
        return;
    }
    const showActions = canEdit() || canDelete() || canAdd();
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.8fr' : '0'};"><span>الاسم</span><span>الهاتف</span><span>المديونية</span>${showActions ? '<span></span>' : ''}</div>`;
    filtered.forEach(cu => {
        const balance = getCustomerBalance(cu.name);
        const bcolor = balance > 0 ? '#E06060' : '#2D8F5E';
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.8fr' : '0'};">
            <span><strong>${cu.name}</strong>${cu.whatsapp ? `<br><small style="color:#25D366;font-size:10px;">📱 ${cu.whatsapp}</small>` : ''}</span>
            <span style="font-size:11px;">${cu.phone || '-'}</span>
            <span style="color:${bcolor};font-weight:900;">${formatMoney(balance)}</span>
            ${showActions ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${balance > 0 && canAdd() ? `<button class="btn btn-success btn-sm" onclick="openCollectModal('${cu.name}')" title="تحصيل"><i class="fas fa-hand-holding-usd"></i></button>` : ''}
                <button class="btn btn-info btn-sm" onclick="viewCustomerStatement('${cu.name}')" title="كشف حساب"><i class="fas fa-file-invoice-dollar"></i></button>
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editCustomer(${cu.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteCustomer(${cu.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
        </div>`;
    });
    c.innerHTML = html;
};

window.openCollectModal = function(customerName) {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    navigateTo('payments');
    setTimeout(() => {
        switchPayTab('collect', document.querySelectorAll('#page-payments .tab-btn')[0]);
        const sel = $('collectCustomer');
        if (sel) { sel.value = customerName; updateCollectInfo(); }
        const amtEl = $('collectAmount'); if (amtEl) amtEl.focus();
    }, 200);
};

window.viewCustomerStatement = function(customerName) {
    const custSales = sales.filter(s => s.customer === customerName);
    const custReturns = returns.filter(r => r.type === 'sale' && r.party === customerName);
    const custPayments = payments.filter(p => p.type === 'collect' && p.party === customerName);
    const balance = getCustomerBalance(customerName);
    const allOps = [
        ...custSales.map(s => ({ date: s.date, time: s.time, type: 'sale',
            desc: `فاتورة #${s.number} (${s.paymentMethod === 'credit' ? 'آجل' : s.paymentMethod === 'settlement' ? 'مقاصة' : 'نقدي'})`,
            amount: s.total })),
        ...custReturns.map(r => ({ date: r.date, time: r.time, type: 'return',
            desc: `مرتجع #${r.number}${r.originalInvoiceNumber ? ` (فاتورة #${r.originalInvoiceNumber})` : ''}`,
            amount: -r.total })),
        ...custPayments.map(p => ({ date: p.date, time: p.time, type: 'collect',
            desc: `تحصيل${p.note ? ' - ' + p.note : ''}`,
            amount: -p.amount }))
    ].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    let rowsHtml = '';
    if (allOps.length === 0) {
        rowsHtml = `<tr><td colspan="3" style="text-align:center;color:#A89070;padding:12px;">لا توجد حركات</td></tr>`;
    } else {
        allOps.forEach(op => {
            const color = op.amount > 0 ? '#E06060' : '#2D8F5E';
            const sign = op.amount > 0 ? '+' : '';
            const icon = op.type === 'sale' ? '💰' : op.type === 'return' ? '🔄' : '✅';
            rowsHtml += `<tr>
                <td style="font-size:10px;">${op.date}<br>${op.time || ''}</td>
                <td style="font-size:11px;">${icon} ${op.desc}</td>
                <td style="color:${color};font-weight:700;font-size:11px;">${sign}${formatMoney(Math.abs(op.amount))}</td>
            </tr>`;
        });
    }
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📋 كشف حساب: ${customerName}</h3>
        <div class="invoice-print">
            <div class="inv-header"><h2>${companyData.name || 'الميزان'}</h2><p>كشف حساب عميل</p></div>
            <div class="inv-info">
                <div><span class="lbl">العميل:</span> ${customerName}</div>
                <div><span class="lbl">التاريخ:</span> ${getTodayDate()}</div>
                <div style="grid-column: 1 / -1; text-align:center; margin-top:8px;">
                    <span class="lbl">الرصيد الحالي:</span>
                    <span style="color:${balance > 0 ? '#E06060' : '#2D8F5E'};font-weight:900;font-size:18px;">${formatMoney(balance)} 🇪🇬</span>
                </div>
            </div>
            <table style="margin-top:10px;"><thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

// ============================================================
// الموردين (مع حماية كاملة)
// ============================================================
window.saveSupplier = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('supplierId').value;
    const name = $('supplierName').value.trim();
    const phone = $('supplierPhone').value.trim();
    const whatsapp = $('supplierWhatsapp').value.trim();
    const address = $('supplierAddress').value.trim();
    if (!name) { showToast('⚠️ أدخل اسم المورد', 'error'); return; }
    if (id) {
        if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
        const idx = suppliers.findIndex(s => s.id == id);
        if (idx > -1) {
            suppliers[idx] = { ...suppliers[idx], name, phone, whatsapp, address };
            addAuditLog('edit', 'supplier', `تعديل مورد: ${name}`);
            showToast('✅ تم تعديل المورد', 'success');
        }
    } else {
        if (suppliers.find(s => s.name === name)) { showToast('⚠️ المورد موجود', 'warning'); return; }
        suppliers.push({ id: Date.now(), name, phone, whatsapp, address, createdAt: new Date().toISOString() });
        addAuditLog('add', 'supplier', `إضافة مورد: ${name}`);
        showToast('✅ تم إضافة المورد', 'success');
    }
    setData('suppliers', suppliers);
    resetSupplierForm(); renderSuppliers();
    
    if (typeof populatePurSuppliers === 'function') { try { populatePurSuppliers(); } catch(e) {} }
    if (typeof populateRetSuppliers === 'function') { try { populateRetSuppliers(); } catch(e) {} }
    if (typeof populatePaySuppliers === 'function') { try { populatePaySuppliers(); } catch(e) {} }
};

window.editSupplier = function(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const s = suppliers.find(su => su.id == id); if (!s) return;
    $('supplierId').value = s.id; $('supplierName').value = s.name;
    $('supplierPhone').value = s.phone || '';
    $('supplierWhatsapp').value = s.whatsapp || '';
    $('supplierAddress').value = s.address || '';
    $('supplierFormTitle').textContent = '✏️ تعديل المورد';
    $('supplierSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteSupplier = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const s = suppliers.find(su => su.id == id); if (!s) return;
    const balance = getSupplierBalance(s.name);
    if (balance > 0) {
        if (!confirm(`⚠️ عليك للمورد ${formatMoney(balance)} 🇪🇬. متابعة الحذف؟`)) return;
    } else {
        if (!confirm(`⚠️ حذف المورد "${s.name}"؟`)) return;
    }
    window.suppliers = suppliers.filter(su => su.id != id);
    setData('suppliers', suppliers);
    addAuditLog('delete', 'supplier', `حذف مورد: ${s.name}`);
    renderSuppliers();
    if (typeof populatePurSuppliers === 'function') { try { populatePurSuppliers(); } catch(e) {} }
    if (typeof populateRetSuppliers === 'function') { try { populateRetSuppliers(); } catch(e) {} }
    if (typeof populatePaySuppliers === 'function') { try { populatePaySuppliers(); } catch(e) {} }
    showToast('🗑️ تم حذف المورد', 'info');
};

window.resetSupplierForm = function() {
    $('supplierId').value = ''; $('supplierName').value = '';
    $('supplierPhone').value = ''; $('supplierWhatsapp').value = '';
    $('supplierAddress').value = '';
    $('supplierFormTitle').textContent = '➕ إضافة مورد';
    $('supplierSaveBtnText').textContent = 'إضافة';
};

window.renderSuppliers = function() {
    const c = $('supplierList'); if (!c) return;
    const search = ($('supplierSearch')?.value || '').trim().toLowerCase();
    let filtered = suppliers;
    if (search) filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search) ||
        (s.phone && s.phone.includes(search))
    );
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><span>${search ? 'لا توجد نتائج' : 'لا يوجد موردين'}</span></div>`;
        return;
    }
    const showActions = canEdit() || canDelete() || canAdd();
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.8fr' : '0'};"><span>الاسم</span><span>الهاتف</span><span>المديونية</span>${showActions ? '<span></span>' : ''}</div>`;
    filtered.forEach(s => {
        const balance = getSupplierBalance(s.name);
        const bcolor = balance > 0 ? '#E6A830' : '#2D8F5E';
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.8fr' : '0'};">
            <span><strong>${s.name}</strong>${s.whatsapp ? `<br><small style="color:#25D366;font-size:10px;">📱 ${s.whatsapp}</small>` : ''}</span>
            <span style="font-size:11px;">${s.phone || '-'}</span>
            <span style="color:${bcolor};font-weight:900;">${formatMoney(balance)}</span>
            ${showActions ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${balance > 0 && canAdd() ? `<button class="btn btn-danger btn-sm" onclick="openPayModal('${s.name}')" title="سداد"><i class="fas fa-money-bill-wave"></i></button>` : ''}
                <button class="btn btn-info btn-sm" onclick="viewSupplierStatement('${s.name}')" title="كشف حساب"><i class="fas fa-file-invoice"></i></button>
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editSupplier(${s.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
        </div>`;
    });
    c.innerHTML = html;
};

window.openPayModal = function(supplierName) {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    navigateTo('payments');
    setTimeout(() => {
        switchPayTab('pay', document.querySelectorAll('#page-payments .tab-btn')[1]);
        const sel = $('paySupplier');
        if (sel) { sel.value = supplierName; updatePayInfo(); }
        const amtEl = $('payAmount'); if (amtEl) amtEl.focus();
    }, 200);
};

window.viewSupplierStatement = function(supplierName) {
    const supPurchases = purchases.filter(p => p.supplierName === supplierName);
    const supReturns = returns.filter(r => r.type === 'purchase' && r.party === supplierName);
    const supPayments = payments.filter(p => p.type === 'pay' && p.party === supplierName);
    const balance = getSupplierBalance(supplierName);
    const allOps = [
        ...supPurchases.map(p => ({ date: p.date, time: p.time, type: 'purchase',
            desc: `فاتورة شراء #${p.number} (${p.payment === 'credit' ? 'آجل' : 'نقدي'})`, amount: p.total })),
        ...supReturns.map(r => ({ date: r.date, time: r.time, type: 'return',
            desc: `مرتجع شراء #${r.number}`, amount: -r.total })),
        ...supPayments.map(p => ({ date: p.date, time: p.time, type: 'pay',
            desc: `سداد${p.note ? ' - ' + p.note : ''}`, amount: -p.amount }))
    ].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    let rowsHtml = '';
    if (allOps.length === 0) {
        rowsHtml = `<tr><td colspan="3" style="text-align:center;color:#A89070;padding:12px;">لا توجد حركات</td></tr>`;
    } else {
        allOps.forEach(op => {
            const color = op.amount > 0 ? '#E6A830' : '#2D8F5E';
            const sign = op.amount > 0 ? '+' : '';
            const icon = op.type === 'purchase' ? '🛒' : op.type === 'return' ? '🔄' : '✅';
            rowsHtml += `<tr>
                <td style="font-size:10px;">${op.date}<br>${op.time || ''}</td>
                <td style="font-size:11px;">${icon} ${op.desc}</td>
                <td style="color:${color};font-weight:700;font-size:11px;">${sign}${formatMoney(Math.abs(op.amount))}</td>
            </tr>`;
        });
    }
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📋 كشف حساب: ${supplierName}</h3>
        <div class="invoice-print">
            <div class="inv-header"><h2>${companyData.name || 'الميزان'}</h2><p>كشف حساب مورد</p></div>
            <div class="inv-info">
                <div><span class="lbl">المورد:</span> ${supplierName}</div>
                <div><span class="lbl">التاريخ:</span> ${getTodayDate()}</div>
                <div style="grid-column: 1 / -1; text-align:center; margin-top:8px;">
                    <span class="lbl">الرصيد الحالي:</span>
                    <span style="color:${balance > 0 ? '#E6A830' : '#2D8F5E'};font-weight:900;font-size:18px;">${formatMoney(balance)} 🇪🇬</span>
                </div>
            </div>
            <table style="margin-top:10px;"><thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

// ============================================================
// التحصيل والسداد والمقاصة
// ============================================================
window.populateCollectCustomers = function() {
    const sel = $('collectCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر عميل...</option>';
    customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    sel.value = cv;
};

window.populatePaySuppliers = function() {
    const sel = $('paySupplier'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    suppliers.forEach(s => sel.innerHTML += `<option value="${s.name}">${s.name}</option>`);
    sel.value = cv;
};

window.populateSettleCustomers = function() {
    const sel = $('settleCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر عميل...</option>';
    customers.forEach(c => {
        const bal = getCustomerBalance(c.name);
        sel.innerHTML += `<option value="${c.name}">${c.name} (مديونية: ${formatMoney(bal)})</option>`;
    });
    sel.value = cv;
};

window.populateSettleProducts = function() {
    const sel = $('settleProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name} (متاح: ${p.qty})</option>`);
    sel.value = cv;
};

window.switchPayTab = function(tab, btn) {
    document.querySelectorAll('#page-payments .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const collect = $('payTabCollect');
    const pay = $('payTabPay');
    const settle = $('payTabSettle');
    if (collect) collect.style.display = tab === 'collect' ? 'block' : 'none';
    if (pay) pay.style.display = tab === 'pay' ? 'block' : 'none';
    if (settle) settle.style.display = tab === 'settle' ? 'block' : 'none';
};

window.updateCollectInfo = function() {
    const name = $('collectCustomer').value;
    const box = $('collectInfoBox');
    const invSel = $('collectInvoice');
    if (!box) return;
    if (!name) {
        box.style.display = 'none';
        if (invSel) invSel.innerHTML = '<option value="">توزيع تلقائي (الأقدم أولاً)</option>';
        return;
    }
    const balance = getCustomerBalance(name);
    box.style.display = 'block';
    if ($('collectCurrentDebt')) $('collectCurrentDebt').textContent = formatMoney(balance);
    const amountInput = $('collectAmount');
    if (amountInput) {
        amountInput.max = balance;
        amountInput.value = balance > 0 ? balance.toFixed(2) : '';
    }
    if (invSel) {
        invSel.innerHTML = '<option value="">توزيع تلقائي (الأقدم أولاً)</option>';
        const unpaidInvoices = sales.filter(s =>
            s.customer === name && s.paymentMethod === 'credit' &&
            (s.status === 'unpaid' || s.status === 'partial')
        ).sort((a, b) => a.id - b.id);
        unpaidInvoices.forEach(inv => {
            const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total;
            invSel.innerHTML += `<option value="${inv.id}">#${inv.number} - ${inv.date} - متبقي: ${formatMoney(remaining)}</option>`;
        });
    }
};

window.updatePayInfo = function() {
    const name = $('paySupplier').value;
    const box = $('payInfoBox');
    const invSel = $('payInvoice');
    if (!box) return;
    if (!name) {
        box.style.display = 'none';
        if (invSel) invSel.innerHTML = '<option value="">توزيع تلقائي (الأقدم أولاً)</option>';
        return;
    }
    const balance = getSupplierBalance(name);
    box.style.display = 'block';
    if ($('payCurrentDebt')) $('payCurrentDebt').textContent = formatMoney(balance);
    const amountInput = $('payAmount');
    if (amountInput) {
        amountInput.max = balance;
        amountInput.value = balance > 0 ? balance.toFixed(2) : '';
    }
    if (invSel) {
        invSel.innerHTML = '<option value="">توزيع تلقائي (الأقدم أولاً)</option>';
        const unpaidInvoices = purchases.filter(p =>
            p.supplierName === name && p.payment === 'credit' &&
            (p.status === 'unpaid' || p.status === 'partial')
        ).sort((a, b) => a.id - b.id);
        unpaidInvoices.forEach(inv => {
            const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total;
            invSel.innerHTML += `<option value="${inv.id}">#${inv.number} - ${inv.date} - متبقي: ${formatMoney(remaining)}</option>`;
        });
    }
};

window.distributePayment = function(customerName, amount, specificInvoiceId = null) {
    const relatedInvoices = [];
    let remaining = amount;
    if (specificInvoiceId) {
        const inv = sales.find(s => s.id == specificInvoiceId);
        if (inv) {
            const invRemaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total;
            const pay = Math.min(remaining, invRemaining);
            inv.paidAmount = (inv.paidAmount || 0) + pay;
            inv.remainingAmount = invRemaining - pay;
            inv.status = inv.remainingAmount <= 0.01 ? 'paid' : 'partial';
            if (inv.remainingAmount <= 0.01) inv.remainingAmount = 0;
            relatedInvoices.push({ invoiceId: inv.id, invoiceNumber: inv.number, amount: pay });
            remaining -= pay;
        }
    }
    if (remaining > 0) {
        const customerInvoices = sales
            .filter(s => s.customer === customerName && s.paymentMethod === 'credit' &&
                         (s.status === 'unpaid' || s.status === 'partial'))
            .sort((a, b) => a.id - b.id);
        for (const inv of customerInvoices) {
            if (remaining <= 0.01) break;
            const invRemaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total;
            if (invRemaining <= 0.01) continue;
            const pay = Math.min(remaining, invRemaining);
            inv.paidAmount = (inv.paidAmount || 0) + pay;
            inv.remainingAmount = invRemaining - pay;
            inv.status = inv.remainingAmount <= 0.01 ? 'paid' : 'partial';
            if (inv.remainingAmount <= 0.01) inv.remainingAmount = 0;
            relatedInvoices.push({ invoiceId: inv.id, invoiceNumber: inv.number, amount: pay });
            remaining -= pay;
        }
    }
    return relatedInvoices;
};

window.distributePay = function(supplierName, amount, specificInvoiceId = null) {
    const relatedInvoices = [];
    let remaining = amount;
    if (specificInvoiceId) {
        const inv = purchases.find(p => p.id == specificInvoiceId);
        if (inv) {
            const invRemaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total;
            const pay = Math.min(remaining, invRemaining);
            inv.paidAmount = (inv.paidAmount || 0) + pay;
            inv.remainingAmount = invRemaining - pay;
            inv.status = inv.remainingAmount <= 0.01 ? 'paid' : 'partial';
            if (inv.remainingAmount <= 0.01) inv.remainingAmount = 0;
            relatedInvoices.push({ invoiceId: inv.id, invoiceNumber: inv.number, amount: pay });
            remaining -= pay;
        }
    }
    if (remaining > 0) {
        const supplierInvoices = purchases
            .filter(p => p.supplierName === supplierName && p.payment === 'credit' &&
                         (p.status === 'unpaid' || p.status === 'partial'))
            .sort((a, b) => a.id - b.id);
        for (const inv of supplierInvoices) {
            if (remaining <= 0.01) break;
            const invRemaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total;
            if (invRemaining <= 0.01) continue;
            const pay = Math.min(remaining, invRemaining);
            inv.paidAmount = (inv.paidAmount || 0) + pay;
            inv.remainingAmount = invRemaining - pay;
            inv.status = inv.remainingAmount <= 0.01 ? 'paid' : 'partial';
            if (inv.remainingAmount <= 0.01) inv.remainingAmount = 0;
            relatedInvoices.push({ invoiceId: inv.id, invoiceNumber: inv.number, amount: pay });
            remaining -= pay;
        }
    }
    return relatedInvoices;
};

window.saveCollect = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const party = $('collectCustomer').value;
    const amount = parseFloat($('collectAmount').value) || 0;
    const date = $('collectDate').value || getTodayDate();
    const note = $('collectNote').value.trim();
    const specificInvoiceId = $('collectInvoice')?.value || null;
    if (!party) { showToast('⚠️ اختر العميل', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    const balance = getCustomerBalance(party);
    if (amount > balance + 0.01) { showToast(`⚠️ المبلغ أكبر من المديونية (${formatMoney(balance)})`, 'error'); return; }
    
    const pay = {
        id: Date.now(), type: 'collect', party,
        partyId: customers.find(c => c.name === party)?.id || null,
        amount, date, time: getNowTime(), note,
        relatedInvoices: [], journalEntryId: null,
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    pay.relatedInvoices = distributePayment(party, amount, specificInvoiceId);
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        const arAcc = getAccountByNameContains('العملاء');
        if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: amount, credit: 0 });
        if (arAcc) lines.push({ accountId: arAcc.id, accountName: arAcc.name, debit: 0, credit: amount });
        if (lines.length >= 2) {
            journalEntry = createJournalEntry(`تحصيل من ${party}`, `COL-${pay.id}`, date, lines, 'payment', pay.id);
            if (journalEntry) pay.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    payments.push(pay);
    pay.relatedInvoices.forEach(ri => {
        const inv = sales.find(s => s.id === ri.invoiceId);
        if (inv) {
            if (!inv.relatedPayments) inv.relatedPayments = [];
            inv.relatedPayments.push(pay.id);
        }
    });
    setData('sales', sales);
    
    const invNumbers = pay.relatedInvoices.map(ri => `#${ri.invoiceNumber}`).join(', ');
    treasury.push({
        id: Date.now() + 1, type: 'deposit', amount,
        note: `تحصيل من ${party}${invNumbers ? ` - فواتير: ${invNumbers}` : ''}${note ? ' - ' + note : ''}`,
        partyName: party, invoiceNumber: pay.relatedInvoices[0]?.invoiceNumber || null,
        refType: 'collect', refId: pay.id, journalEntryId: pay.journalEntryId,
        date, time: getNowTime()
    });
    setData('payments', payments); setData('treasury', treasury);
    addAuditLog('add', 'payment', `تحصيل من ${party} - ${formatMoney(amount)} ج.م`);
    $('collectAmount').value = ''; $('collectNote').value = '';
    $('collectCustomer').value = '';
    const box = $('collectInfoBox'); if (box) box.style.display = 'none';
    const invSel = $('collectInvoice'); if (invSel) invSel.innerHTML = '<option value="">توزيع تلقائي (الأقدم أولاً)</option>';
    renderPayments(); renderTreasury(); renderCustomers(); updateDashboard(); renderInvoices();
    showToast(`✅ تم تحصيل ${formatMoney(amount)} 🇪🇬 من ${party}`, 'success');
    setTimeout(() => showReceipt(pay), 300);
};

window.savePay = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const party = $('paySupplier').value;
    const amount = parseFloat($('payAmount').value) || 0;
    const date = $('payDate').value || getTodayDate();
    const note = $('payNote').value.trim();
    const specificInvoiceId = $('payInvoice')?.value || null;
    if (!party) { showToast('⚠️ اختر المورد', 'error'); return; }
    if (amount <= 0) { showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    const balance = getSupplierBalance(party);
    if (amount > balance + 0.01) { showToast(`⚠️ المبلغ أكبر من الالتزام (${formatMoney(balance)})`, 'error'); return; }
    if (getTreasuryBalance() < amount) { showToast('⚠️ رصيد الخزنة غير كافي', 'error'); return; }
    
    const pay = {
        id: Date.now(), type: 'pay', party,
        partyId: suppliers.find(s => s.name === party)?.id || null,
        amount, date, time: getNowTime(), note,
        relatedInvoices: [], journalEntryId: null,
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    pay.relatedInvoices = distributePay(party, amount, specificInvoiceId);
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = getAccountByNameContains('النقدية بالخزنة');
        const apAcc = getAccountByNameContains('الموردين');
        if (apAcc) lines.push({ accountId: apAcc.id, accountName: apAcc.name, debit: amount, credit: 0 });
        if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: amount });
        if (lines.length >= 2) {
            journalEntry = createJournalEntry(`سداد لـ ${party}`, `PAY-${pay.id}`, date, lines, 'payment', pay.id);
            if (journalEntry) pay.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    payments.push(pay);
    pay.relatedInvoices.forEach(ri => {
        const inv = purchases.find(p => p.id === ri.invoiceId);
        if (inv) {
            if (!inv.relatedPayments) inv.relatedPayments = [];
            inv.relatedPayments.push(pay.id);
        }
    });
    setData('purchases', purchases);
    
    const invNumbers = pay.relatedInvoices.map(ri => `#${ri.invoiceNumber}`).join(', ');
    treasury.push({
        id: Date.now() + 1, type: 'withdraw', amount,
        note: `سداد لـ ${party}${invNumbers ? ` - فواتير: ${invNumbers}` : ''}${note ? ' - ' + note : ''}`,
        partyName: party, invoiceNumber: pay.relatedInvoices[0]?.invoiceNumber || null,
        refType: 'pay', refId: pay.id, journalEntryId: pay.journalEntryId,
        date, time: getNowTime()
    });
    setData('payments', payments); setData('treasury', treasury);
    addAuditLog('add', 'payment', `سداد لـ ${party} - ${formatMoney(amount)} ج.م`);
    $('payAmount').value = ''; $('payNote').value = '';
    $('paySupplier').value = '';
    const box = $('payInfoBox'); if (box) box.style.display = 'none';
    const invSel = $('payInvoice'); if (invSel) invSel.innerHTML = '<option value="">توزيع تلقائي (الأقدم أولاً)</option>';
    renderPayments(); renderTreasury(); renderSuppliers(); updateDashboard(); renderPurchases();
    showToast(`✅ تم سداد ${formatMoney(amount)} 🇪🇬 لـ ${party}`, 'success');
    setTimeout(() => showReceipt(pay), 300);
};

// ============================================================
// المقاصة بالبضاعة
// ============================================================
window.updateSettleInfo = function() {
    const name = $('settleCustomer').value;
    const box = $('settleInfoBox');
    if (!box) return;
    if (!name) { box.style.display = 'none'; return; }
    const balance = getCustomerBalance(name);
    box.style.display = 'block';
    if ($('settleCurrentDebt')) $('settleCurrentDebt').textContent = formatMoney(balance);
};

window.updateSettlePrice = function() {
    const id = $('settleProduct').value;
    if (!id) { $('settlePrice').value = ''; return; }
    const p = products.find(pr => pr.id == id);
    if (p) $('settlePrice').value = p.sell;
};

window.addSettleItem = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('settleProduct').value;
    const qty = parseInt($('settleQty').value) || 0;
    const price = parseFloat($('settlePrice').value) || 0;
    if (!id) { showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    if (qty > p.qty) { showToast(`⚠️ الكمية المتاحة: ${p.qty}`, 'error'); return; }
    const ex = currentSettleItems.find(i => i.productId == id);
    if (ex) { ex.qty += qty; ex.total = ex.qty * ex.price; }
    else currentSettleItems.push({ productId: p.id, name: p.name, qty, price, costPrice: p.buy, total: qty * price });
    $('settleQty').value = 1; $('settlePrice').value = ''; $('settleProduct').value = '';
    renderSettleItems(); showToast('✅ تم الإضافة', 'success');
};

window.removeSettleItem = function(i) { currentSettleItems.splice(i, 1); renderSettleItems(); };

window.renderSettleItems = function() {
    const c = $('settleItemsContainer'), tb = $('settleTotalBox'), te = $('settleTotal');
    if (!c) return;
    if (currentSettleItems.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد أصناف</span></div>`;
        if (tb) tb.style.display = 'none'; return;
    }
    const total = currentSettleItems.reduce((s, i) => s + i.total, 0);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentSettleItems.forEach((it, i) => {
        html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;">
            <span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span>
            <span style="color:#4A8AB5;font-weight:700;">${formatMoney(it.total)}</span>
            <button class="btn btn-danger btn-sm" onclick="removeSettleItem(${i})"><i class="fas fa-trash"></i></button>
        </div>`;
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' 🇪🇬';
};

window.clearSettle = function() {
    if (currentSettleItems.length === 0) return;
    if (!confirm('⚠️ إلغاء المقاصة؟')) return;
    window.currentSettleItems = [];
    const custEl = $('settleCustomer'); if (custEl) custEl.value = '';
    renderSettleItems(); showToast('🗑️ تم الإلغاء', 'info');
};

window.saveSettle = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (currentSettleItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    const customer = $('settleCustomer').value;
    if (!customer) { showToast('⚠️ اختر العميل', 'error'); return; }
    const total = currentSettleItems.reduce((s, i) => s + i.total, 0);
    const customerBalance = getCustomerBalance(customer);
    if (total > customerBalance + 0.01) { showToast(`⚠️ قيمة البضاعة أكبر من المديونية`, 'error'); return; }
    for (const it of currentSettleItems) {
        const p = products.find(pr => pr.id == it.productId);
        if (!p || p.qty < it.qty) { showToast(`⚠️ الكمية غير كافية: ${it.name}`, 'error'); return; }
    }
    const today = getTodayDate();
    let cogsTotal = 0;
    const itemChanges = [];
    currentSettleItems.forEach(it => {
        const p = products.find(pr => pr.id == it.productId);
        if (p) {
            it.costPrice = p.buy;
            cogsTotal += (p.buy * it.qty);
            const before = p.qty;
            p.qty -= it.qty;
            itemChanges.push({ item: it, before, after: p.qty });
        }
    });
    const inv = {
        id: Date.now(), number: sales.length + 1, customer: customer,
        customerId: customers.find(c => c.name === customer)?.id || null,
        paymentMethod: 'settlement', invoiceType: 'simple',
        subtotal: total, vatTotal: 0, cogs: cogsTotal, total: total,
        paidAmount: total, remainingAmount: 0, status: 'paid',
        items: JSON.parse(JSON.stringify(currentSettleItems)),
        relatedPayments: [], relatedReturns: [], journalEntryId: null,
        settlementNote: `مقاصة بضاعة مقابل دين`,
        date: today, time: getNowTime(), createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    sales.push(inv);
    itemChanges.forEach(({ item, before, after }) => {
        logInventoryMovement({
            productId: item.productId, productName: item.name,
            type: 'out', qty: item.qty, price: item.costPrice,
            reason: 'settlement', refType: 'settlement', refId: inv.id, refNumber: inv.number,
            balanceBefore: before, balanceAfter: after,
            notes: `مقاصة بضاعة - ${customer}`
        });
    });
    let journalEntry = null;
    try {
        const lines = [];
        const arAcc = getAccountByNameContains('العملاء');
        const salesAcc = getAccountByNameContains('إيرادات المبيعات');
        const cogsAcc = getAccountByNameContains('تكلفة البضاعة');
        const invAcc = getAccountByNameContains('المخزون');
        if (arAcc) lines.push({ accountId: arAcc.id, accountName: arAcc.name, debit: 0, credit: total });
        if (salesAcc) lines.push({ accountId: salesAcc.id, accountName: salesAcc.name, debit: 0, credit: total });
        if (cogsAcc && cogsTotal > 0) lines.push({ accountId: cogsAcc.id, accountName: cogsAcc.name, debit: cogsTotal, credit: 0 });
        if (invAcc && cogsTotal > 0) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: 0, credit: cogsTotal });
        if (lines.length >= 2) {
            journalEntry = createJournalEntry(`مقاصة بضاعة - ${customer}`, `SETTLE-${inv.number}`, today, lines, 'settlement', inv.id);
            if (journalEntry) inv.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    let remainingToSettle = total;
    const customerUnpaidInvoices = sales
        .filter(s => s.customer === customer && s.paymentMethod === 'credit' &&
                     (s.status === 'unpaid' || s.status === 'partial'))
        .sort((a, b) => a.id - b.id);
    for (const unpaidInv of customerUnpaidInvoices) {
        if (remainingToSettle <= 0.01) break;
        const invRemaining = unpaidInv.remainingAmount !== undefined ? unpaidInv.remainingAmount : unpaidInv.total;
        if (invRemaining <= 0.01) continue;
        const settleAmount = Math.min(remainingToSettle, invRemaining);
        unpaidInv.paidAmount = (unpaidInv.paidAmount || 0) + settleAmount;
        unpaidInv.remainingAmount = invRemaining - settleAmount;
        unpaidInv.status = unpaidInv.remainingAmount <= 0.01 ? 'paid' : 'partial';
        if (unpaidInv.remainingAmount <= 0.01) unpaidInv.remainingAmount = 0;
        if (!unpaidInv.relatedPayments) unpaidInv.relatedPayments = [];
        unpaidInv.relatedPayments.push(inv.id);
        remainingToSettle -= settleAmount;
    }
    setData('sales', sales);
    treasury.push({
        id: Date.now() + 1, type: 'deposit', amount: total,
        note: `مقاصة بضاعة - فاتورة #${inv.number} - ${customer}`,
        partyName: customer, invoiceNumber: inv.number,
        refType: 'settlement', refId: inv.id, journalEntryId: inv.journalEntryId,
        date: today, time: getNowTime()
    });
    setData('products', products); setData('treasury', treasury);
    addAuditLog('add', 'sale', `مقاصة بضاعة - ${customer} - ${formatMoney(total)} ج.م`);
    window.currentSettleItems = [];
    const custEl = $('settleCustomer'); if (custEl) custEl.value = '';
    const box = $('settleInfoBox'); if (box) box.style.display = 'none';
    renderSettleItems(); renderTreasury(); renderCustomers();
    populateSaleProducts(); populateSettleProducts();
    updateDashboard(); renderInventoryMovements(); renderInvoices();
    showToast(`✅ تم تسجيل مقاصة بـ ${formatMoney(total)} 🇪🇬`, 'success');
};

// ============================================================
// عرض الإيصالات (بتنسيق احترافي)
// ============================================================
window.renderPayments = function() {
    const collected = payments.filter(p => p.type === 'collect').reduce((s, p) => s + (p.amount || 0), 0);
    const paid = payments.filter(p => p.type === 'pay').reduce((s, p) => s + (p.amount || 0), 0);
    if ($('payTotalCollected')) $('payTotalCollected').textContent = formatMoney(collected);
    if ($('payTotalPaid')) $('payTotalPaid').textContent = formatMoney(paid);
    const c = $('paymentsList'); if (!c) return;
    if (payments.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><span>لا توجد عمليات</span></div>`;
        return;
    }
    const sorted = [...payments].sort((a, b) => b.id - a.id).slice(0, 50);
    let html = `<div class="table-header" style="grid-template-columns: 0.8fr 1fr 1.5fr 1fr 0.8fr;"><span>النوع</span><span>التاريخ</span><span>الجهة</span><span>المبلغ</span><span></span></div>`;
    sorted.forEach(p => {
        const isCollect = p.type === 'collect';
        const color = isCollect ? '#2D8F5E' : '#E06060';
        const icon = isCollect ? '💰' : '💸';
        const label = isCollect ? 'تحصيل' : 'سداد';
        const invCount = p.relatedInvoices ? p.relatedInvoices.length : 0;
        html += `<div class="table-row" style="grid-template-columns: 0.8fr 1fr 1.5fr 1fr 0.8fr;">
            <span style="color:${color};font-weight:700;font-size:11px;">${icon} ${label}</span>
            <span style="font-size:10px;color:#A89070;">${p.date}<br>${p.time || ''}</span>
            <span style="font-size:11px;">${p.party}${invCount > 0 ? `<br><small style="color:#4A8AB5;font-size:9px;">🔗 ${invCount} فاتورة</small>` : ''}</span>
            <span style="color:${color};font-weight:700;">${formatMoney(p.amount)}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="showReceiptById(${p.id})"><i class="fas fa-receipt"></i></button>
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deletePayment(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>`;
    });
    c.innerHTML = html;
};

window.showReceiptById = function(id) {
    const pay = payments.find(p => p.id === id); if (!pay) return;
    showReceipt(pay);
};

// ✅ دالة عرض الإيصال (بتنسيق احترافي)
window.showReceipt = function(pay) {
    const isCollect = pay.type === 'collect';
    const label = isCollect ? 'إيصال استلام نقدية' : 'إيصال دفع نقدية';
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="rec-logo" alt="logo">` : '';
    
    let invoicesHtml = '';
    if (pay.relatedInvoices && pay.relatedInvoices.length > 0) {
        invoicesHtml = `
            <div style="background:#f0f0f0;border-radius:8px;padding:10px;margin-bottom:10px;border:1px solid #ddd;">
                <div style="font-size:12px;color:#333;font-weight:700;margin-bottom:6px;">🔗 الفواتير المسددة:</div>
                ${pay.relatedInvoices.map(ri => `
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#000;border-bottom:1px solid #ddd;">
                        <span>فاتورة #${ri.invoiceNumber}</span>
                        <span style="font-weight:700;">${formatMoney(ri.amount)} ج.م</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>🧾 ${label}</h3>
        <div class="receipt-print">
            <div class="rec-header">
                ${logoHtml}
                <h2>${companyData.name || 'الميزان'}</h2>
                <p>${label}</p>
            </div>
            <div class="rec-info">
                <div><span class="lbl">رقم الإيصال:</span><span>#${pay.id.toString().slice(-6)}</span></div>
                <div><span class="lbl">التاريخ:</span><span>${pay.date}</span></div>
                <div><span class="lbl">الوقت:</span><span>${pay.time}</span></div>
                <div><span class="lbl">${isCollect ? 'العميل' : 'المورد'}:</span><span>${pay.party}</span></div>
            </div>
            <div class="rec-amount">
                <div class="lbl">${isCollect ? 'المبلغ المستلم' : 'المبلغ المدفوع'}</div>
                <div class="value">${formatMoney(pay.amount)} ج.م</div>
            </div>
            ${invoicesHtml}
            ${pay.note ? `<div style="text-align:center;font-size:12px;color:#666;margin-bottom:10px;">📝 ${pay.note}</div>` : ''}
            <div class="rec-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

window.deletePayment = function(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const pay = payments.find(p => p.id === id); if (!pay) return;
    if (!confirm(`⚠️ حذف هذه العملية؟`)) return;
    if (pay.relatedInvoices && pay.relatedInvoices.length > 0) {
        pay.relatedInvoices.forEach(ri => {
            if (pay.type === 'collect') {
                const inv = sales.find(s => s.id === ri.invoiceId);
                if (inv) {
                    inv.paidAmount = Math.max(0, (inv.paidAmount || 0) - ri.amount);
                    inv.remainingAmount = (inv.remainingAmount || 0) + ri.amount;
                    inv.status = inv.remainingAmount <= 0.01 ? 'paid' : (inv.paidAmount > 0 ? 'partial' : 'unpaid');
                    inv.relatedPayments = (inv.relatedPayments || []).filter(pid => pid !== id);
                }
            } else {
                const inv = purchases.find(p => p.id === ri.invoiceId);
                if (inv) {
                    inv.paidAmount = Math.max(0, (inv.paidAmount || 0) - ri.amount);
                    inv.remainingAmount = (inv.remainingAmount || 0) + ri.amount;
                    inv.status = inv.remainingAmount <= 0.01 ? 'paid' : (inv.paidAmount > 0 ? 'partial' : 'unpaid');
                    inv.relatedPayments = (inv.relatedPayments || []).filter(pid => pid !== id);
                }
            }
        });
        setData('sales', sales); setData('purchases', purchases);
    }
    window.treasury = treasury.filter(t => !(t.refType === (pay.type === 'collect' ? 'collect' : 'pay') && t.refId === id));
    window.payments = payments.filter(p => p.id !== id);
    setData('payments', payments); setData('treasury', treasury);
    addAuditLog('delete', 'payment', `حذف ${pay.type === 'collect' ? 'تحصيل' : 'سداد'} - ${pay.party}`);
    renderPayments(); renderTreasury(); renderCustomers(); renderSuppliers();
    updateDashboard(); renderInvoices(); renderPurchases();
    showToast('🗑️ تم الحذف', 'info');
};

// ============================================================
// باقي الدوال (الحسابات، التقارير، إلخ) - كما هي
// ============================================================
// ... (يتم تضمين باقي الدوال الموجودة في الملف الأصلي هنا)
// ============================================================
// التهيئة النهائية
// ============================================================
function init() {
    console.log('🚀 الميزان 14.0.0 - ملفات مقسمة');

    initFirebase();

    const rawProducts = getData('products', []);
    window.sales = getData('sales', []);
    window.purchases = getData('purchases', []);
    window.returns = getData('returns', []);
    window.expenses = getData('expenses', []);
    window.customers = getData('customers', []);
    window.suppliers = getData('suppliers', []);
    window.treasury = getData('treasury', []);
    window.payments = getData('payments', []);
    window.companyData = getData('companyData', {});
    window.auditLog = getData('auditLog', []);
    window.vatSettings = getData('vatSettings', { defaultVAT: 14 });
    window.accounts = getData('accounts', []);
    window.journalEntries = getData('journalEntries', []);
    window.inventoryMovements = getData('inventoryMovements', []);

    // ترحيل البيانات القديمة
    window.sales = sales.map(s => ({
        ...s,
        customerId: s.customerId || customers.find(c => c.name === s.customer)?.id || null,
        paidAmount: s.paidAmount !== undefined ? s.paidAmount : (s.paymentMethod === 'cash' ? s.total : 0),
        remainingAmount: s.remainingAmount !== undefined ? s.remainingAmount : (s.paymentMethod === 'cash' ? 0 : s.total),
        status: s.status || (s.paymentMethod === 'cash' ? 'paid' : 'unpaid'),
        relatedPayments: s.relatedPayments || [],
        relatedReturns: s.relatedReturns || [],
        journalEntryId: s.journalEntryId || null
    }));
    
    window.purchases = purchases.map(p => ({
        ...p,
        paidAmount: p.paidAmount !== undefined ? p.paidAmount : (p.payment === 'cash' ? p.total : 0),
        remainingAmount: p.remainingAmount !== undefined ? p.remainingAmount : (p.payment === 'cash' ? 0 : p.total),
        status: p.status || (p.payment === 'cash' ? 'paid' : 'unpaid'),
        relatedPayments: p.relatedPayments || [],
        relatedReturns: p.relatedReturns || [],
        journalEntryId: p.journalEntryId || null
    }));
    
    window.returns = returns.map(r => ({
        ...r,
        originalInvoiceId: r.originalInvoiceId || null,
        originalInvoiceNumber: r.originalInvoiceNumber || null,
        partyId: r.partyId || null,
        journalEntryId: r.journalEntryId || null
    }));
    
    window.payments = payments.map(p => ({
        ...p,
        relatedInvoices: p.relatedInvoices || [],
        journalEntryId: p.journalEntryId || null
    }));
    
    window.treasury = treasury.map(t => ({
        ...t,
        partyName: t.partyName || null,
        invoiceNumber: t.invoiceNumber || null,
        journalEntryId: t.journalEntryId || null
    }));
    
    window.journalEntries = journalEntries.map(j => ({
        ...j,
        sourceType: j.sourceType || 'manual',
        sourceId: j.sourceId || null
    }));

    if (accounts.length === 0) {
        window.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
        setData('accounts', accounts);
    }

    window.users = getData('users', []);
    if (users.length === 0) {
        window.users = [
            { id: 1, name: 'المدير', password: '123456', role: 'admin', active: true, createdAt: new Date().toISOString() },
            { id: 2, name: 'مشرف', password: '123456', role: 'manager', active: true, createdAt: new Date().toISOString() },
            { id: 3, name: 'كاشير', password: '123456', role: 'cashier', active: true, createdAt: new Date().toISOString() },
            { id: 4, name: 'مشاهد', password: '123456', role: 'viewer', active: true, createdAt: new Date().toISOString() }
        ];
        setData('users', users);
    }

    window.products = migrateOldProducts(rawProducts);
    const allZero = products.length > 0 && products.every(p => p.qty === 0);
    if (allZero) { window.products = []; localStorage.removeItem(STORAGE_KEY + 'products'); }

    if (products.length === 0 && !localStorage.getItem('mizan_seeded')) {
        window.products = [
            { id: 1, name: 'قلم جاف', barcode: '1001', buy: 2, sell: 5, qty: 50, min: 10, vat: 14 },
            { id: 2, name: 'كشكول 60 ورقة', barcode: '1002', buy: 8, sell: 15, qty: 30, min: 5, vat: 14 },
            { id: 3, name: 'مسطرة 30 سم', barcode: '1003', buy: 3, sell: 7, qty: 40, min: 10, vat: 14 }
        ];
        setData('products', products);
        localStorage.setItem('mizan_seeded', 'true');
    } else {
        setData('products', products);
    }

    populateLoginUsers();

    if ($('expDate')) $('expDate').value = getTodayDate();
    if ($('collectDate')) $('collectDate').value = getTodayDate();
    if ($('payDate')) $('payDate').value = getTodayDate();
    if ($('jeDate')) $('jeDate').value = getTodayDate();

    setTimeout(() => {
        const debitAmt = $('jeDebitAmount');
        const creditAmt = $('jeCreditAmount');
        if (debitAmt) debitAmt.addEventListener('input', updateJournalCheck);
        if (creditAmt) creditAmt.addEventListener('input', updateJournalCheck);
    }, 500);

    updateClock();
    updateHeaderCompanyName();
    
    if (typeof window.populateAllDropdowns === 'function') {
        try { window.populateAllDropdowns(); } catch(e) { console.warn('⚠️ خطأ في populateAllDropdowns:', e); }
    }
    if (typeof window.refreshAllViews === 'function') {
        try { window.refreshAllViews(); } catch(e) { console.warn('⚠️ خطأ في refreshAllViews:', e); }
    }
    if (typeof window.renderProducts === 'function') {
        try { window.renderProducts(); } catch(e) { console.warn('⚠️ خطأ في renderProducts:', e); }
    }

    console.log('✅ الميزان جاهز - 4 ملفات مترابطة');
}

document.addEventListener('DOMContentLoaded', init);
