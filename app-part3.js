// ============================================================
// الميزان 14.0.0 - الجزء 3: العرض والتهيئة
// app-part3.js (النسخة الكاملة النهائية 100%)
// ============================================================

console.log('📊 تحميل app-part3.js - العرض والتهيئة');

// ============================================================
// ✅ دوال مساعدة أساسية
// ============================================================

window.updateHeaderCompanyName = function() {
    try {
        const el = document.getElementById('headerCompanyName');
        if (el) el.textContent = (typeof companyData !== 'undefined' && companyData.name) ? companyData.name : 'نظام محاسبة';
    } catch (e) {}
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
    } catch (e) {}
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
    } catch (e) {}
};

setInterval(function() { if (typeof updateClock === 'function') updateClock(); }, 1000);

// ============================================================
// الخزنة
// ============================================================
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
    treasury.push({ id: Date.now(), type, amount, note, partyName: null, invoiceNumber: null, refType: 'manual', refId: null, journalEntryId: null, date: getTodayDate(), time: getNowTime(), createdBy: currentUser ? currentUser.name : 'unknown' });
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
    if (filtered.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-vault"></i><span>لا توجد حركات</span></div>`; return; }
    const sorted = [...filtered].sort((a, b) => b.id - a.id).slice(0, 100);
    let html = `<div class="table-header" style="grid-template-columns: 2.2fr 1fr 1fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>النوع</span><span>التاريخ</span><span></span></div>`;
    sorted.forEach(t => {
        const isDep = t.type === 'deposit';
        const color = isDep ? '#2D8F5E' : '#E06060';
        const refIcons = { 'sale': '💰', 'purchase': '🛒', 'return': '🔄', 'collect': '✅', 'pay': '💸', 'expense': '💸', 'manual': '✋' };
        html += `<div class="table-row" style="grid-template-columns: 2.2fr 1fr 1fr 1fr 0.6fr;">
            <span style="font-size:11px;">${refIcons[t.refType] || '📋'} ${t.note}</span>
            <span style="color:${color};font-weight:700;">${isDep ? '+' : '-'}${formatMoney(t.amount)}</span>
            <span style="color:${color};font-size:10px;">${isDep ? '💚 إيداع' : '❤️ سحب'}</span>
            <span style="font-size:10px;color:#A89070;">${t.date}<br>${t.time || ''}</span>
            <span></span>
        </div>`;
    });
    c.innerHTML = html;
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
    const profit = totalSales - cogs - totalExpenses;
    if ($('dashSales')) $('dashSales').textContent = formatMoney(totalSales);
    if ($('dashPurchases')) $('dashPurchases').textContent = formatMoney(totalPurchases);
    if ($('dashExpenses')) $('dashExpenses').textContent = formatMoney(totalExpenses);
    if ($('dashReturns')) $('dashReturns').textContent = formatMoney(totalReturns);
    if ($('dashProfit')) { $('dashProfit').textContent = formatMoney(profit); $('dashProfit').style.color = profit >= 0 ? '#2D8F5E' : '#E06060'; }
    if ($('dashTreasury')) $('dashTreasury').textContent = formatMoney(getTreasuryBalance());
    if ($('dashProducts')) $('dashProducts').textContent = products.length;
    if ($('dashInventory')) $('dashInventory').textContent = products.reduce((s, p) => s + (p.qty || 0), 0);
    let custDebt = 0; customers.forEach(c => { custDebt += getCustomerBalance(c.name); });
    if ($('dashCustomerDebt')) $('dashCustomerDebt').textContent = formatMoney(custDebt);
    let supDebt = 0; suppliers.forEach(s => { supDebt += getSupplierBalance(s.name); });
    if ($('dashSupplierDebt')) $('dashSupplierDebt').textContent = formatMoney(supDebt);
    const vatStats = calculateVATStats();
    if ($('dashVATSales')) $('dashVATSales').textContent = formatMoney(vatStats.salesVAT);
    if ($('dashVATDue')) $('dashVATDue').textContent = formatMoney(vatStats.vatDue);
    renderMiniChart();
    const container = $('dashLastSales');
    if (!container) return;
    if (sales.length === 0) { container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><span>لا توجد مبيعات</span></div>`; return; }
    const last5 = [...sales].sort((a, b) => b.id - a.id).slice(0, 5);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.5fr 1fr 1fr;"><span>#</span><span>العميل</span><span>المبلغ</span><span>التاريخ</span></div>`;
    last5.forEach(inv => { html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.5fr 1fr 1fr;"><span>#${inv.number}</span><span>${inv.customer}</span><span style="color:#2D8F5E;font-weight:700;">${formatMoney(inv.total)}</span><span style="font-size:11px;color:#A89070;">${inv.date}</span></div>`; });
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
    let total = 0;
    (salesArr || []).forEach(inv => { (inv.items || []).forEach(item => { const p = products.find(pr => pr.id == item.productId); total += (item.costPrice || (p ? p.buy : 0)) * (item.qty || 0); }); });
    return total;
};

window.getReturnsCOGS = function(returnsArr) { return 0; };

window.renderMiniChart = function() {
    const container = $('miniChart'); if (!container) return;
    const days = []; const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toISOString().split('T')[0]; days.push({ label: dayNames[d.getDay()], total: sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.total || 0), 0) }); }
    const maxVal = Math.max(...days.map(d => d.total), 1);
    container.innerHTML = days.map(d => `<div class="bar-wrap"><div class="bar" style="height:${Math.max((d.total / maxVal) * 80, 4)}px;">${d.total > 0 ? `<span class="bar-value">${d.total.toFixed(0)}</span>` : ''}</div><div class="bar-label">${d.label}</div></div>`).join('');
};

window.getCustomerBalance = function(name) {
    if (!name || name === 'عميل نقدي') return 0;
    return Math.max(0, sales.filter(s => s.customer === name && s.paymentMethod === 'credit').reduce((sum, s) => sum + (s.remainingAmount !== undefined ? s.remainingAmount : s.total), 0));
};

window.getSupplierBalance = function(name) {
    if (!name) return 0;
    return Math.max(0, purchases.filter(p => p.supplierName === name && p.payment === 'credit').reduce((sum, p) => sum + (p.remainingAmount !== undefined ? p.remainingAmount : p.total), 0));
};

// ============================================================
// العملاء
// ============================================================
window.saveCustomer = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('customerId').value, name = $('customerName').value.trim();
    const phone = $('customerPhone').value.trim(), whatsapp = $('customerWhatsapp').value.trim(), address = $('customerAddress').value.trim();
    if (!name) { showToast('⚠️ أدخل اسم العميل', 'error'); return; }
    if (id) { const idx = customers.findIndex(c => c.id == id); if (idx > -1) { customers[idx] = { ...customers[idx], name, phone, whatsapp, address }; showToast('✅ تم تعديل العميل', 'success'); } }
    else {
        if (customers.find(c => c.name === name)) { showToast('⚠️ العميل موجود', 'warning'); return; }
        customers.push({ id: Date.now(), name, phone, whatsapp, address, createdAt: new Date().toISOString() });
        showToast('✅ تم إضافة العميل', 'success');
    }
    setData('customers', customers); resetCustomerForm(); renderCustomers();
    if (typeof populateSaleCustomers === 'function') try { populateSaleCustomers(); } catch(e) {}
    if (typeof populateRetCustomers === 'function') try { populateRetCustomers(); } catch(e) {}
    if (typeof populateCollectCustomers === 'function') try { populateCollectCustomers(); } catch(e) {}
    if (typeof populateSettleCustomers === 'function') try { populateSettleCustomers(); } catch(e) {}
};

window.editCustomer = function(id) {
    const c = customers.find(cu => cu.id == id); if (!c) return;
    $('customerId').value = c.id; $('customerName').value = c.name;
    $('customerPhone').value = c.phone || ''; $('customerWhatsapp').value = c.whatsapp || ''; $('customerAddress').value = c.address || '';
    $('customerFormTitle').textContent = '✏️ تعديل العميل'; $('customerSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteCustomer = function(id) {
    if (!canDelete()) return;
    const c = customers.find(cu => cu.id == id); if (!c) return;
    if (!confirm(`⚠️ حذف العميل "${c.name}"؟`)) return;
    window.customers = customers.filter(cu => cu.id != id);
    setData('customers', customers); renderCustomers();
    if (typeof populateSaleCustomers === 'function') try { populateSaleCustomers(); } catch(e) {}
    if (typeof populateRetCustomers === 'function') try { populateRetCustomers(); } catch(e) {}
    if (typeof populateCollectCustomers === 'function') try { populateCollectCustomers(); } catch(e) {}
    if (typeof populateSettleCustomers === 'function') try { populateSettleCustomers(); } catch(e) {}
    showToast('🗑️ تم حذف العميل', 'info');
};

window.resetCustomerForm = function() {
    $('customerId').value = ''; $('customerName').value = ''; $('customerPhone').value = '';
    $('customerWhatsapp').value = ''; $('customerAddress').value = '';
    $('customerFormTitle').textContent = '➕ إضافة عميل'; $('customerSaveBtnText').textContent = 'إضافة';
};

window.renderCustomers = function() {
    const c = $('customerList'); if (!c) return;
    const search = ($('customerSearch')?.value || '').trim().toLowerCase();
    let filtered = search ? customers.filter(cu => cu.name.toLowerCase().includes(search)) : customers;
    if (filtered.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا يوجد عملاء</span></div>`; return; }
    const showActions = canEdit() || canDelete() || canAdd();
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.8fr' : '0'};"><span>الاسم</span><span>الهاتف</span><span>المديونية</span>${showActions ? '<span></span>' : ''}</div>`;
    filtered.forEach(cu => {
        const balance = getCustomerBalance(cu.name);
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.8fr' : '0'};">
            <span><strong>${cu.name}</strong></span>
            <span style="font-size:11px;">${cu.phone || '-'}</span>
            <span style="color:${balance > 0 ? '#E06060' : '#2D8F5E'};font-weight:900;">${formatMoney(balance)}</span>
            ${showActions ? `<div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="viewCustomerStatement('${cu.name}')"><i class="fas fa-file-invoice-dollar"></i></button>
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editCustomer(${cu.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteCustomer(${cu.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
        </div>`;
    });
    c.innerHTML = html;
};

window.viewCustomerStatement = function(customerName) {
    const balance = getCustomerBalance(customerName);
    const html = `<button class="modal-close" onclick="closeModal()">&times;</button><h3>📋 كشف حساب: ${customerName}</h3>
        <div class="invoice-print"><div class="inv-header"><h2>${companyData.name || 'الميزان'}</h2><p>كشف حساب</p></div>
        <div class="inv-info"><div>الرصيد: ${formatMoney(balance)} 🇪🇬</div></div></div>
        <button class="btn btn-secondary btn-block" onclick="closeModal()">إغلاق</button>`;
    openModal(html);
};

// ============================================================
// الموردين
// ============================================================
window.saveSupplier = function() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const id = $('supplierId').value, name = $('supplierName').value.trim();
    const phone = $('supplierPhone').value.trim(), whatsapp = $('supplierWhatsapp').value.trim(), address = $('supplierAddress').value.trim();
    if (!name) { showToast('⚠️ أدخل اسم المورد', 'error'); return; }
    if (id) { const idx = suppliers.findIndex(s => s.id == id); if (idx > -1) { suppliers[idx] = { ...suppliers[idx], name, phone, whatsapp, address }; showToast('✅ تم تعديل المورد', 'success'); } }
    else {
        if (suppliers.find(s => s.name === name)) { showToast('⚠️ المورد موجود', 'warning'); return; }
        suppliers.push({ id: Date.now(), name, phone, whatsapp, address, createdAt: new Date().toISOString() });
        showToast('✅ تم إضافة المورد', 'success');
    }
    setData('suppliers', suppliers); resetSupplierForm(); renderSuppliers();
    if (typeof populatePurSuppliers === 'function') try { populatePurSuppliers(); } catch(e) {}
    if (typeof populateRetSuppliers === 'function') try { populateRetSuppliers(); } catch(e) {}
    if (typeof populatePaySuppliers === 'function') try { populatePaySuppliers(); } catch(e) {}
};

window.editSupplier = function(id) {
    const s = suppliers.find(su => su.id == id); if (!s) return;
    $('supplierId').value = s.id; $('supplierName').value = s.name;
    $('supplierPhone').value = s.phone || ''; $('supplierWhatsapp').value = s.whatsapp || ''; $('supplierAddress').value = s.address || '';
    $('supplierFormTitle').textContent = '✏️ تعديل المورد'; $('supplierSaveBtnText').textContent = 'حفظ التعديل';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteSupplier = function(id) {
    if (!canDelete()) return;
    const s = suppliers.find(su => su.id == id); if (!s) return;
    if (!confirm(`⚠️ حذف المورد "${s.name}"؟`)) return;
    window.suppliers = suppliers.filter(su => su.id != id);
    setData('suppliers', suppliers); renderSuppliers();
    if (typeof populatePurSuppliers === 'function') try { populatePurSuppliers(); } catch(e) {}
    if (typeof populateRetSuppliers === 'function') try { populateRetSuppliers(); } catch(e) {}
    if (typeof populatePaySuppliers === 'function') try { populatePaySuppliers(); } catch(e) {}
    showToast('🗑️ تم حذف المورد', 'info');
};

window.resetSupplierForm = function() {
    $('supplierId').value = ''; $('supplierName').value = ''; $('supplierPhone').value = '';
    $('supplierWhatsapp').value = ''; $('supplierAddress').value = '';
    $('supplierFormTitle').textContent = '➕ إضافة مورد'; $('supplierSaveBtnText').textContent = 'إضافة';
};

window.renderSuppliers = function() {
    const c = $('supplierList'); if (!c) return;
    const search = ($('supplierSearch')?.value || '').trim().toLowerCase();
    let filtered = search ? suppliers.filter(s => s.name.toLowerCase().includes(search)) : suppliers;
    if (filtered.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><span>لا يوجد موردين</span></div>`; return; }
    const showActions = canEdit() || canDelete() || canAdd();
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.8fr' : '0'};"><span>الاسم</span><span>الهاتف</span><span>المديونية</span>${showActions ? '<span></span>' : ''}</div>`;
    filtered.forEach(s => {
        const balance = getSupplierBalance(s.name);
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1.2fr 1fr ${showActions ? '1.8fr' : '0'};">
            <span><strong>${s.name}</strong></span>
            <span style="font-size:11px;">${s.phone || '-'}</span>
            <span style="color:${balance > 0 ? '#E6A830' : '#2D8F5E'};font-weight:900;">${formatMoney(balance)}</span>
            ${showActions ? `<div style="display:flex;gap:4px;">
                <button class="btn btn-info btn-sm" onclick="viewSupplierStatement('${s.name}')"><i class="fas fa-file-invoice"></i></button>
                ${canEdit() ? `<button class="btn btn-warning btn-sm" onclick="editSupplier(${s.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
        </div>`;
    });
    c.innerHTML = html;
};

window.viewSupplierStatement = function(supplierName) {
    const balance = getSupplierBalance(supplierName);
    const html = `<button class="modal-close" onclick="closeModal()">&times;</button><h3>📋 كشف حساب: ${supplierName}</h3>
        <div class="invoice-print"><div class="inv-header"><h2>${companyData.name || 'الميزان'}</h2><p>كشف حساب مورد</p></div>
        <div class="inv-info"><div>الرصيد: ${formatMoney(balance)} 🇪🇬</div></div></div>
        <button class="btn btn-secondary btn-block" onclick="closeModal()">إغلاق</button>`;
    openModal(html);
};

// ============================================================
// التحصيل والسداد
// ============================================================
window.populateCollectCustomers = function() { const sel = $('collectCustomer'); if (!sel) return; const cv = sel.value; sel.innerHTML = '<option value="">اختر عميل...</option>'; customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`); sel.value = cv; };
window.populatePaySuppliers = function() { const sel = $('paySupplier'); if (!sel) return; const cv = sel.value; sel.innerHTML = '<option value="">اختر مورد...</option>'; suppliers.forEach(s => sel.innerHTML += `<option value="${s.name}">${s.name}</option>`); sel.value = cv; };
window.populateSettleCustomers = function() { const sel = $('settleCustomer'); if (!sel) return; const cv = sel.value; sel.innerHTML = '<option value="">اختر عميل...</option>'; customers.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.name}</option>`); sel.value = cv; };
window.populateSettleProducts = function() { const sel = $('settleProduct'); if (!sel) return; const cv = sel.value; sel.innerHTML = '<option value="">اختر منتج...</option>'; products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`); sel.value = cv; };

window.switchPayTab = function(tab, btn) {
    document.querySelectorAll('#page-payments .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const collect = $('payTabCollect'), pay = $('payTabPay'), settle = $('payTabSettle');
    if (collect) collect.style.display = tab === 'collect' ? 'block' : 'none';
    if (pay) pay.style.display = tab === 'pay' ? 'block' : 'none';
    if (settle) settle.style.display = tab === 'settle' ? 'block' : 'none';
};

window.updateCollectInfo = function() { const name = $('collectCustomer').value; const box = $('collectInfoBox'); if (!box) return; if (!name) { box.style.display = 'none'; return; } box.style.display = 'block'; if ($('collectCurrentDebt')) $('collectCurrentDebt').textContent = formatMoney(getCustomerBalance(name)); };
window.updatePayInfo = function() { const name = $('paySupplier').value; const box = $('payInfoBox'); if (!box) return; if (!name) { box.style.display = 'none'; return; } box.style.display = 'block'; if ($('payCurrentDebt')) $('payCurrentDebt').textContent = formatMoney(getSupplierBalance(name)); };

window.distributePayment = function(customerName, amount) {
    const relatedInvoices = []; let remaining = amount;
    const customerInvoices = sales.filter(s => s.customer === customerName && s.paymentMethod === 'credit' && (s.status === 'unpaid' || s.status === 'partial')).sort((a, b) => a.id - b.id);
    for (const inv of customerInvoices) { if (remaining <= 0.01) break; const invRemaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total; if (invRemaining <= 0.01) continue; const pay = Math.min(remaining, invRemaining); inv.paidAmount = (inv.paidAmount || 0) + pay; inv.remainingAmount = invRemaining - pay; inv.status = inv.remainingAmount <= 0.01 ? 'paid' : 'partial'; if (inv.remainingAmount <= 0.01) inv.remainingAmount = 0; relatedInvoices.push({ invoiceId: inv.id, invoiceNumber: inv.number, amount: pay }); remaining -= pay; }
    return relatedInvoices;
};

window.distributePay = function(supplierName, amount) {
    const relatedInvoices = []; let remaining = amount;
    const supplierInvoices = purchases.filter(p => p.supplierName === supplierName && p.payment === 'credit' && (p.status === 'unpaid' || p.status === 'partial')).sort((a, b) => a.id - b.id);
    for (const inv of supplierInvoices) { if (remaining <= 0.01) break; const invRemaining = inv.remainingAmount !== undefined ? inv.remainingAmount : inv.total; if (invRemaining <= 0.01) continue; const pay = Math.min(remaining, invRemaining); inv.paidAmount = (inv.paidAmount || 0) + pay; inv.remainingAmount = invRemaining - pay; inv.status = inv.remainingAmount <= 0.01 ? 'paid' : 'partial'; if (inv.remainingAmount <= 0.01) inv.remainingAmount = 0; relatedInvoices.push({ invoiceId: inv.id, invoiceNumber: inv.number, amount: pay }); remaining -= pay; }
    return relatedInvoices;
};

window.saveCollect = function() {
    if (!canAdd()) return;
    const party = $('collectCustomer').value, amount = parseFloat($('collectAmount').value) || 0, date = $('collectDate').value || getTodayDate(), note = $('collectNote').value.trim();
    if (!party || amount <= 0) { showToast('⚠️ أدخل بيانات صحيحة', 'error'); return; }
    const balance = getCustomerBalance(party);
    if (amount > balance + 0.01) { showToast(`⚠️ المبلغ أكبر من المديونية`, 'error'); return; }
    const pay = { id: Date.now(), type: 'collect', party, amount, date, time: getNowTime(), note, relatedInvoices: [], createdAt: new Date().toISOString() };
    pay.relatedInvoices = distributePayment(party, amount);
    payments.push(pay);
    treasury.push({ id: Date.now() + 1, type: 'deposit', amount, note: `تحصيل من ${party}`, partyName: party, refType: 'collect', refId: pay.id, date, time: getNowTime() });
    setData('payments', payments); setData('treasury', treasury); setData('sales', sales);
    addAuditLog('add', 'payment', `تحصيل من ${party} - ${formatMoney(amount)} ج.م`);
    $('collectAmount').value = ''; $('collectNote').value = ''; $('collectCustomer').value = '';
    const box = $('collectInfoBox'); if (box) box.style.display = 'none';
    renderPayments(); renderTreasury(); renderCustomers(); updateDashboard(); renderInvoices();
    showToast(`✅ تم تحصيل ${formatMoney(amount)} 🇪🇬`, 'success');
};

window.savePay = function() {
    if (!canAdd()) return;
    const party = $('paySupplier').value, amount = parseFloat($('payAmount').value) || 0, date = $('payDate').value || getTodayDate(), note = $('payNote').value.trim();
    if (!party || amount <= 0) { showToast('⚠️ أدخل بيانات صحيحة', 'error'); return; }
    const balance = getSupplierBalance(party);
    if (amount > balance + 0.01) { showToast(`⚠️ المبلغ أكبر من الالتزام`, 'error'); return; }
    const pay = { id: Date.now(), type: 'pay', party, amount, date, time: getNowTime(), note, relatedInvoices: [], createdAt: new Date().toISOString() };
    pay.relatedInvoices = distributePay(party, amount);
    payments.push(pay);
    treasury.push({ id: Date.now() + 1, type: 'withdraw', amount, note: `سداد لـ ${party}`, partyName: party, refType: 'pay', refId: pay.id, date, time: getNowTime() });
    setData('payments', payments); setData('treasury', treasury); setData('purchases', purchases);
    addAuditLog('add', 'payment', `سداد لـ ${party} - ${formatMoney(amount)} ج.م`);
    $('payAmount').value = ''; $('payNote').value = ''; $('paySupplier').value = '';
    const box = $('payInfoBox'); if (box) box.style.display = 'none';
    renderPayments(); renderTreasury(); renderSuppliers(); updateDashboard(); renderPurchases();
    showToast(`✅ تم سداد ${formatMoney(amount)} 🇪🇬`, 'success');
};

// ============================================================
// المقاصة
// ============================================================
window.updateSettleInfo = function() { const name = $('settleCustomer').value; const box = $('settleInfoBox'); if (!box) return; if (!name) { box.style.display = 'none'; return; } box.style.display = 'block'; if ($('settleCurrentDebt')) $('settleCurrentDebt').textContent = formatMoney(getCustomerBalance(name)); };
window.updateSettlePrice = function() { const id = $('settleProduct').value; if (!id) { $('settlePrice').value = ''; return; } const p = products.find(pr => pr.id == id); if (p) $('settlePrice').value = p.sell; };

window.addSettleItem = function() {
    if (!canAdd()) return;
    const id = $('settleProduct').value, qty = parseInt($('settleQty').value) || 0, price = parseFloat($('settlePrice').value) || 0;
    if (!id || qty <= 0 || price <= 0) { showToast('⚠️ أدخل بيانات صحيحة', 'error'); return; }
    const p = products.find(pr => pr.id == id); if (!p) return;
    const ex = currentSettleItems.find(i => i.productId == id);
    if (ex) { ex.qty += qty; ex.total = ex.qty * ex.price; } else currentSettleItems.push({ productId: p.id, name: p.name, qty, price, costPrice: p.buy, total: qty * price });
    $('settleQty').value = 1; $('settlePrice').value = ''; $('settleProduct').value = '';
    renderSettleItems(); showToast('✅ تم الإضافة', 'success');
};

window.removeSettleItem = function(i) { currentSettleItems.splice(i, 1); renderSettleItems(); };

window.renderSettleItems = function() {
    const c = $('settleItemsContainer'), tb = $('settleTotalBox'), te = $('settleTotal');
    if (!c) return;
    if (currentSettleItems.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد أصناف</span></div>`; if (tb) tb.style.display = 'none'; return; }
    const total = currentSettleItems.reduce((s, i) => s + i.total, 0);
    let html = `<div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>الصنف</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>`;
    currentSettleItems.forEach((it, i) => { html += `<div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr;"><span>${it.name}</span><span>${it.qty}</span><span>${formatMoney(it.price)}</span><span style="color:#4A8AB5;font-weight:700;">${formatMoney(it.total)}</span><button class="btn btn-danger btn-sm" onclick="removeSettleItem(${i})"><i class="fas fa-trash"></i></button></div>`; });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' 🇪🇬';
};

window.clearSettle = function() { if (currentSettleItems.length === 0) return; if (!confirm('⚠️ إلغاء المقاصة؟')) return; window.currentSettleItems = []; $('settleCustomer').value = ''; renderSettleItems(); showToast('🗑️ تم الإلغاء', 'info'); };

window.saveSettle = function() {
    if (!canAdd()) return;
    if (currentSettleItems.length === 0) { showToast('⚠️ لا توجد أصناف', 'error'); return; }
    const customer = $('settleCustomer').value;
    if (!customer) { showToast('⚠️ اختر العميل', 'error'); return; }
    const total = currentSettleItems.reduce((s, i) => s + i.total, 0);
    if (total > getCustomerBalance(customer) + 0.01) { showToast(`⚠️ قيمة البضاعة أكبر من المديونية`, 'error'); return; }
    const today = getTodayDate();
    let cogsTotal = 0;
    currentSettleItems.forEach(it => { const p = products.find(pr => pr.id == it.productId); if (p) { it.costPrice = p.buy; cogsTotal += (p.buy * it.qty); p.qty -= it.qty; } });
    const inv = { id: Date.now(), number: sales.length + 1, customer, paymentMethod: 'settlement', invoiceType: 'simple', subtotal: total, vatTotal: 0, cogs: cogsTotal, total, paidAmount: total, remainingAmount: 0, status: 'paid', items: JSON.parse(JSON.stringify(currentSettleItems)), relatedPayments: [], relatedReturns: [], date: today, time: getNowTime(), createdAt: new Date().toISOString() };
    sales.push(inv);
    setData('sales', sales); setData('products', products);
    addAuditLog('add', 'sale', `مقاصة بضاعة - ${customer}`);
    window.currentSettleItems = [];
    $('settleCustomer').value = '';
    const box = $('settleInfoBox'); if (box) box.style.display = 'none';
    renderSettleItems(); renderCustomers(); updateDashboard();
    showToast(`✅ تم تسجيل مقاصة بـ ${formatMoney(total)} 🇪🇬`, 'success');
};

// ============================================================
// عرض الإيصالات
// ============================================================
window.renderPayments = function() {
    const c = $('paymentsList'); if (!c) return;
    if (payments.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><span>لا توجد عمليات</span></div>`; return; }
    const sorted = [...payments].sort((a, b) => b.id - a.id).slice(0, 50);
    let html = `<div class="table-header" style="grid-template-columns: 0.8fr 1fr 1.5fr 1fr 0.8fr;"><span>النوع</span><span>التاريخ</span><span>الجهة</span><span>المبلغ</span><span></span></div>`;
    sorted.forEach(p => {
        const isCollect = p.type === 'collect';
        html += `<div class="table-row" style="grid-template-columns: 0.8fr 1fr 1.5fr 1fr 0.8fr;">
            <span style="color:${isCollect ? '#2D8F5E' : '#E06060'};font-weight:700;font-size:11px;">${isCollect ? '💰 تحصيل' : '💸 سداد'}</span>
            <span style="font-size:10px;color:#A89070;">${p.date}</span>
            <span style="font-size:11px;">${p.party}</span>
            <span style="color:${isCollect ? '#2D8F5E' : '#E06060'};font-weight:700;">${formatMoney(p.amount)}</span>
            <div><button class="btn btn-info btn-sm" onclick="showReceiptById(${p.id})"><i class="fas fa-receipt"></i></button></div>
        </div>`;
    });
    c.innerHTML = html;
};

window.showReceiptById = function(id) { const pay = payments.find(p => p.id === id); if (pay) showReceipt(pay); };

window.showReceipt = function(pay) {
    const isCollect = pay.type === 'collect';
    const label = isCollect ? 'إيصال استلام نقدية' : 'إيصال دفع نقدية';
    const html = `<button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>🧾 ${label}</h3>
        <div class="receipt-print">
            <div class="rec-header"><h2>${companyData.name || 'الميزان'}</h2><p>${label}</p></div>
            <div class="rec-info">
                <div><span class="lbl">رقم الإيصال:</span><span>#${pay.id.toString().slice(-6)}</span></div>
                <div><span class="lbl">التاريخ:</span><span>${pay.date}</span></div>
                <div><span class="lbl">الوقت:</span><span>${pay.time}</span></div>
                <div><span class="lbl">${isCollect ? 'العميل' : 'المورد'}:</span><span>${pay.party}</span></div>
            </div>
            <div class="rec-amount"><div class="lbl">${isCollect ? 'المبلغ المستلم' : 'المبلغ المدفوع'}</div><div class="value">${formatMoney(pay.amount)} ج.م</div></div>
            <div class="rec-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

// ============================================================
// الفواتير
// ============================================================
window.filterInvoices = function(filter, btn) { window.currentInvoiceFilter = filter; document.querySelectorAll('#page-invoices .filter-chip').forEach(c => c.classList.remove('active')); if (btn) btn.classList.add('active'); renderInvoices(); };

window.renderInvoices = function() {
    const c = $('invoiceList'); if (!c) return;
    let filtered = sales;
    if (currentInvoiceFilter === 'paid') filtered = filtered.filter(i => i.status === 'paid');
    if (currentInvoiceFilter === 'unpaid') filtered = filtered.filter(i => i.status === 'unpaid');
    if (filtered.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><span>لا توجد فواتير</span></div>`; return; }
    const sorted = [...filtered].sort((a, b) => b.id - a.id);
    let html = `<div class="table-header" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.7fr 1.3fr;"><span>#</span><span>العميل</span><span>المبلغ</span><span>النوع</span><span></span></div>`;
    sorted.forEach(inv => { html += `<div class="table-row" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.7fr 1.3fr;"><span>#${inv.number}</span><span>${inv.customer}</span><span style="color:#2D8F5E;font-weight:700;">${formatMoney(inv.total)}</span><span>${inv.invoiceType === 'tax' ? '🧾' : '📋'}</span><div><button class="btn btn-danger btn-sm" onclick="deleteInvoice(${inv.id})"><i class="fas fa-trash"></i></button></div></div>`; });
    c.innerHTML = html;
};

window.deleteInvoice = function(id) {
    if (!canDelete()) return;
    const inv = sales.find(s => s.id === id); if (!inv) return;
    if (!confirm(`⚠️ حذف الفاتورة #${inv.number}؟`)) return;
    inv.items.forEach(it => { const p = products.find(pr => pr.id == it.productId); if (p) p.qty += it.qty; });
    window.sales = sales.filter(s => s.id !== id);
    setData('products', products); setData('sales', sales);
    renderInvoices(); if (typeof renderProducts === 'function') renderProducts(); updateDashboard();
    showToast(`🗑️ تم الحذف`, 'info');
};

// ============================================================
// الحسابات
// ============================================================
window.saveAccount = function() {
    if (!canAdd()) return;
    const id = $('accId').value, name = $('accName').value.trim(), type = $('accType').value, parentId = parseInt($('accParent').value) || null;
    if (!name) { showToast('⚠️ أدخل اسم الحساب', 'error'); return; }
    if (id) { const idx = accounts.findIndex(a => a.id == id); if (idx > -1) { accounts[idx] = { ...accounts[idx], name, type, parentId }; showToast('✅ تم تعديل الحساب', 'success'); } }
    else { accounts.push({ id: Date.now(), code: generateAccountCode(type), name, type, parentId, isParent: false }); showToast('✅ تم إضافة الحساب', 'success'); }
    setData('accounts', accounts); resetAccountForm(); renderAccounts(); populateAccountDropdowns();
};

window.generateAccountCode = function(type) { const topLevel = accounts.filter(a => a.type === type && !a.parentId); return String(topLevel.length * 100 + 1000).padStart(4, '0'); };
window.editAccount = function(id) { const a = accounts.find(acc => acc.id == id); if (!a) return; $('accId').value = a.id; $('accName').value = a.name; $('accType').value = a.type; $('accParent').value = a.parentId || ''; $('accFormTitle').textContent = '✏️ تعديل'; $('accSaveBtnText').textContent = 'حفظ'; };
window.deleteAccount = function(id) { if (!canDelete()) return; if (!confirm('⚠️ حذف الحساب؟')) return; window.accounts = accounts.filter(acc => acc.id !== id); setData('accounts', accounts); renderAccounts(); populateAccountDropdowns(); showToast('🗑️ تم الحذف', 'info'); };
window.resetAccountForm = function() { $('accId').value = ''; $('accName').value = ''; $('accType').value = 'assets'; $('accParent').value = ''; $('accFormTitle').textContent = '➕ إضافة حساب'; $('accSaveBtnText').textContent = 'إضافة'; };

window.renderAccounts = function() {
    const container = $('accountsTree'); if (!container) return;
    const typeNames = { assets: '🏛️ الأصول', liabilities: '💳 الخصوم', equity: '👑 حقوق الملكية', revenue: '💰 الإيرادات', expenses: '💸 المصروفات' };
    let html = '';
    ['assets', 'liabilities', 'equity', 'revenue', 'expenses'].forEach(type => {
        const typeAccounts = accounts.filter(a => a.type === type);
        if (typeAccounts.length === 0) return;
        html += `<div class="acc-type-header">${typeNames[type]}</div>`;
        typeAccounts.forEach(a => { html += `<div class="acc-item"><span>${a.code ? a.code + ' - ' : ''}${a.name}</span><div><button class="btn btn-warning btn-sm" onclick="editAccount(${a.id})"><i class="fas fa-edit"></i></button>${canDelete() ? `<button class="btn btn-danger btn-sm" onclick="deleteAccount(${a.id})"><i class="fas fa-trash"></i></button>` : ''}</div></div>`; });
    });
    if (!html) html = '<div class="empty-state"><i class="fas fa-sitemap"></i><span>لا توجد حسابات</span></div>';
    container.innerHTML = html;
};

window.calculateAccountBalance = function(accountId) { let balance = 0; journalEntries.forEach(entry => { (entry.lines || []).forEach(line => { if (line.accountId === accountId) balance += (line.debit || 0) - (line.credit || 0); }); }); return balance; };
window.populateAccountParents = function() { const sel = $('accParent'); if (!sel) return; const cv = sel.value; sel.innerHTML = '<option value="">لا يوجد</option>'; accounts.filter(a => !a.parentId || a.isParent).forEach(a => { sel.innerHTML += `<option value="${a.id}">${a.name}</option>`; }); sel.value = cv; };
window.populateAccountDropdowns = function() { populateAccountParents(); };
window.createJournalEntry = function(description, reference, date, lines, sourceType = 'manual', sourceId = null) {
    const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) return null;
    const entry = { id: Date.now() + Math.random(), number: journalEntries.length + 1, date: date || getTodayDate(), description, reference: reference || '', sourceType, sourceId, lines, totalDebit, totalCredit, createdAt: new Date().toISOString() };
    journalEntries.push(entry); setData('journalEntries', journalEntries); return entry;
};
window.getAccountByNameContains = function(name) { return accounts.find(a => a.name.includes(name) && !a.isParent); };
window.saveJournalEntry = function() { showToast('⚠️ قريباً', 'warning'); };
window.renderJournal = function() { const c = $('journalList'); if (!c) return; if (journalEntries.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><span>لا توجد قيود</span></div>`; return; } c.innerHTML = '<div class="empty-state"><span>يتم عرض القيود هنا</span></div>'; };
window.deleteJournalEntry = function(id) { if (!confirm('⚠️ حذف القيد؟')) return; window.journalEntries = journalEntries.filter(e => e.id !== id); setData('journalEntries', journalEntries); renderJournal(); showToast('🗑️ تم الحذف', 'info'); };
window.switchAccountsTab = function(tab, btn) { document.querySelectorAll('#page-accounts .tab-btn').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active'); const tree = $('accTabTree'), journal = $('accTabJournal'), reports = $('accTabReports'); if (tree) tree.style.display = (tab === 'tree') ? 'block' : 'none'; if (journal) journal.style.display = (tab === 'journal') ? 'block' : 'none'; if (reports) reports.style.display = (tab === 'reports') ? 'block' : 'none'; };
window.showAccountingReport = function(type) { const c = $('accountingReportContent'); if (!c) return; c.innerHTML = '<div class="empty-state"><span>قريباً</span></div>'; };

// ============================================================
// التقارير
// ============================================================
window.switchReport = function(type, btn) { window.currentReport = type; document.querySelectorAll('.report-tab').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active'); renderReport(type); };
window.renderReport = function(type) {
    const container = $('reportContent'); if (!container) return;
    const today = new Date();
    let title = '', rows = [];
    if (type === 'daily') {
        title = 'تقرير يومي - آخر 7 أيام';
        const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toISOString().split('T')[0]; rows.push({ label: dayNames[d.getDay()], sales: sales.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.total || 0), 0) }); }
    } else if (type === 'monthly') {
        title = 'تقرير شهري - آخر 6 أشهر';
        const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
        for (let i = 5; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); rows.push({ label: monthNames[d.getMonth()], sales: sales.filter(s => (s.date || '').startsWith(monthStr)).reduce((sum, s) => sum + (s.total || 0), 0) }); }
    } else {
        title = 'تقرير سنوي';
        for (let i = 2; i >= 0; i--) { const year = today.getFullYear() - i; rows.push({ label: 'سنة ' + year, sales: sales.filter(s => (s.date || '').startsWith(String(year))).reduce((sum, s) => sum + (s.total || 0), 0) }); }
    }
    const tS = rows.reduce((s, r) => s + r.sales, 0);
    container.innerHTML = `<h3>${title}</h3><div class="report-summary"><div class="report-stat"><div class="num" style="color:#2D8F5E;">${formatMoney(tS)}</div><div class="lbl">💰 إجمالي</div></div></div>`;
};
window.renderVATReport = function() { const container = $('reportContent'); if (!container) return; container.innerHTML = `<h3>🧾 التقرير الضريبي</h3><div class="empty-state"><span>لا توجد بيانات</span></div>`; };

// ============================================================
// حركات المخزون
// ============================================================
window.filterInventoryMovements = function(filter, btn) { window.currentMovementFilter = filter; document.querySelectorAll('#page-inventory-movements .filter-chip').forEach(c => c.classList.remove('active')); if (btn) btn.classList.add('active'); renderInventoryMovements(); };
window.renderInventoryMovements = function() {
    const c = $('inventoryMovementsList'); if (!c) return;
    if (inventoryMovements.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد حركات</span></div>`; return; }
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 0.6fr 0.6fr 1.2fr 1fr;"><span>المنتج</span><span>الكمية</span><span>النوع</span><span>السبب</span><span>التاريخ</span></div>`;
    inventoryMovements.slice(0, 100).forEach(m => { const isIn = m.type === 'in'; html += `<div class="table-row" style="grid-template-columns: 1.5fr 0.6fr 0.6fr 1.2fr 1fr;"><span style="font-size:11px;">${m.productName}</span><span style="color:${isIn ? '#2D8F5E' : '#E06060'};font-weight:700;">${isIn ? '⬇️' : '⬆️'} ${m.qty}</span><span style="color:${isIn ? '#2D8F5E' : '#E06060'};font-size:10px;">${isIn ? 'إدخال' : 'إخراج'}</span><span style="font-size:10px;color:#A89070;">${m.reason}</span><span style="font-size:10px;color:#A89070;">${m.date}</span></div>`; });
    c.innerHTML = html;
};

// ============================================================
// بيانات الشركة
// ============================================================
window.renderCompanyPage = function() {
    if ($('setCompanyName')) $('setCompanyName').value = companyData.name || '';
    if ($('setCompanyPhone')) $('setCompanyPhone').value = companyData.phone || '';
    if ($('setCompanyAddress')) $('setCompanyAddress').value = companyData.address || '';
    if ($('setCompanyTax')) $('setCompanyTax').value = companyData.tax || '';
    if ($('setCompanyCR')) $('setCompanyCR').value = companyData.cr || '';
    if ($('setCompanyFooter')) $('setCompanyFooter').value = companyData.footer || '';
    renderLogoPreview();
    if ($('companyPreviewName')) $('companyPreviewName').textContent = companyData.name || 'اسم الشركة';
    updateHeaderCompanyName();
};
window.renderLogoPreview = function() { const box = $('logoPreviewBox'); if (!box) return; if (companyData.logo) box.innerHTML = `<img src="${companyData.logo}" alt="logo">`; else box.innerHTML = `<i class="fas fa-image"></i><span>لا يوجد شعار</span>`; };
window.uploadLogo = function(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { companyData.logo = e.target.result; setData('companyData', companyData); renderCompanyPage(); showToast('✅ تم رفع الشعار', 'success'); }; reader.readAsDataURL(file); };
window.removeLogo = function() { if (!confirm('⚠️ حذف الشعار؟')) return; companyData.logo = null; setData('companyData', companyData); renderCompanyPage(); showToast('🗑️ تم الحذف', 'info'); };
window.saveCompanySettings = function() {
    companyData.name = $('setCompanyName').value.trim(); companyData.phone = $('setCompanyPhone').value.trim();
    companyData.address = $('setCompanyAddress').value.trim(); companyData.tax = $('setCompanyTax').value.trim();
    companyData.cr = $('setCompanyCR')?.value?.trim() || ''; companyData.footer = $('setCompanyFooter').value.trim();
    setData('companyData', companyData); renderCompanyPage(); showToast('✅ تم حفظ البيانات', 'success');
};

// ============================================================
// إعدادات الضريبة
// ============================================================
window.saveVATSettings = function() { const vat = parseFloat($('setDefaultVAT')?.value) || 14; if (vat < 0 || vat > 100) { showToast('⚠️ النسبة بين 0 و 100', 'error'); return; } vatSettings.defaultVAT = vat; setData('vatSettings', vatSettings); showToast(`✅ تم حفظ النسبة: ${vat}%`, 'success'); };

// ============================================================
// المستخدمين
// ============================================================
window.saveUser = function() {
    if (!canManageUsers()) return;
    const id = $('userId').value, name = $('userName').value.trim(), password = $('userPassword').value.trim(), role = $('userRole').value;
    if (!name || !password || password.length < 4) { showToast('⚠️ أدخل بيانات صحيحة', 'error'); return; }
    if (id) { const idx = users.findIndex(u => u.id == id); if (idx > -1) { users[idx] = { ...users[idx], name, password, role }; showToast('✅ تم تعديل المستخدم', 'success'); } }
    else { if (users.find(u => u.name === name)) { showToast('⚠️ الاسم موجود', 'warning'); return; } users.push({ id: Date.now(), name, password, role, active: true }); showToast('✅ تم إضافة المستخدم', 'success'); }
    setData('users', users); resetUserForm(); renderUsers(); populateLoginUsers();
};
window.editUser = function(id) { const u = users.find(us => us.id == id); if (!u) return; $('userId').value = u.id; $('userName').value = u.name; $('userPassword').value = u.password; $('userRole').value = u.role; $('userFormTitle').textContent = '✏️ تعديل'; $('userSaveBtnText').textContent = 'حفظ'; };
window.toggleUserActive = function(id) { const u = users.find(us => us.id == id); if (!u) return; if (u.id === (currentUser ? currentUser.id : null)) { showToast('⚠️ لا يمكنك تعطيل حسابك', 'error'); return; } u.active = !u.active; setData('users', users); renderUsers(); populateLoginUsers(); };
window.deleteUser = function(id) { if (!confirm('⚠️ حذف المستخدم؟')) return; window.users = users.filter(us => us.id !== id); setData('users', users); renderUsers(); populateLoginUsers(); showToast('🗑️ تم الحذف', 'info'); };
window.resetUserForm = function() { $('userId').value = ''; $('userName').value = ''; $('userPassword').value = ''; $('userRole').value = 'cashier'; $('userFormTitle').textContent = '➕ إضافة مستخدم'; $('userSaveBtnText').textContent = 'إضافة'; };
window.renderUsers = function() {
    const c = $('userList'); if (!c) return;
    if (!canManageUsers()) { c.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>المدير فقط</span></div>`; return; }
    if (users.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-users-cog"></i><span>لا يوجد مستخدمين</span></div>`; return; }
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1fr 0.8fr 1.3fr;"><span>الاسم</span><span>الدور</span><span>الحالة</span><span></span></div>`;
    users.forEach(u => { const roleInfo = ROLES[u.role] || { name: u.role, icon: '❓' }; html += `<div class="table-row" style="grid-template-columns: 1.5fr 1fr 0.8fr 1.3fr;"><span><strong>${u.name}</strong></span><span>${roleInfo.icon} ${roleInfo.name}</span><span style="color:${u.active !== false ? '#2D8F5E' : '#E06060'};">${u.active !== false ? '✅' : '⏸️'}</span><div><button class="btn btn-warning btn-sm" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button><button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button></div></div>`; });
    c.innerHTML = html;
};

// ============================================================
// سجل النشاطات
// ============================================================
window.renderAudit = function() {
    const c = $('auditList'); if (!c) return;
    if (!isAdmin()) { c.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>المدير فقط</span></div>`; return; }
    if (auditLog.length === 0) { c.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><span>لا توجد نشاطات</span></div>`; return; }
    let html = '';
    auditLog.slice(0, 200).forEach(log => { html += `<div class="audit-item"><div style="font-size:11px;color:#A89070;">${log.date} ${log.time || ''}</div><div style="font-size:12px;">${log.details}</div><div style="font-size:10px;color:#A89070;">👤 ${log.userName}</div></div>`; });
    c.innerHTML = html;
};
window.filterAudit = function(filter, btn) { window.currentAuditFilter = filter; document.querySelectorAll('#page-audit .filter-chip').forEach(chip => chip.classList.remove('active')); if (btn) btn.classList.add('active'); renderAudit(); };
window.exportAuditLog = function() { if (auditLog.length === 0) { showToast('⚠️ السجل فارغ', 'warning'); return; } const json = JSON.stringify({ exportDate: new Date().toISOString(), logs: auditLog }, null, 2); const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `audit_${new Date().toISOString().split('T')[0]}.json`; a.click(); showToast('✅ تم التصدير', 'success'); };
window.exportAuditLogText = function() { if (auditLog.length === 0) { showToast('⚠️ السجل فارغ', 'warning'); return; } let text = 'سجل النشاطات\n\n'; auditLog.forEach(log => { text += `[${log.date}] ${log.userName} - ${log.details}\n`; }); const blob = new Blob([text], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `audit_${new Date().toISOString().split('T')[0]}.txt`; a.click(); showToast('✅ تم التصدير', 'success'); };
window.clearAuditLog = function() { if (auditLog.length === 0) { showToast('⚠️ السجل فارغ', 'warning'); return; } if (!confirm('⚠️ مسح السجل؟')) return; window.auditLog = []; setData('auditLog', auditLog); renderAudit(); showToast('🗑️ تم المسح', 'info'); };

// ============================================================
// الإعدادات
// ============================================================
window.renderSettings = function() {
    if ($('setProductsCount')) $('setProductsCount').textContent = products.length;
    if ($('setSalesCount')) $('setSalesCount').textContent = sales.length;
    if ($('setUsersCount')) $('setUsersCount').textContent = users.length;
    if ($('setAccountsCount')) $('setAccountsCount').textContent = accounts.length;
    if ($('setJournalCount')) $('setJournalCount').textContent = journalEntries.length;
    if ($('setMovementsCount')) $('setMovementsCount').textContent = inventoryMovements.length;
    if ($('setDefaultVAT')) $('setDefaultVAT').value = vatSettings.defaultVAT || 14;
    let size = 0; for (let k in localStorage) { if (k.startsWith('mizan_')) size += (localStorage[k] || '').length; }
    if ($('setDataSize')) $('setDataSize').textContent = (size / 1024).toFixed(1) + ' KB';
    if ($('currentUserForPassword')) $('currentUserForPassword').textContent = currentUser ? currentUser.name : '-';
};

window.changePassword = function() {
    if (!currentUser) return;
    const oldP = $('oldPassword').value, newP = $('newPassword').value, conP = $('confirmPassword').value;
    if (oldP !== currentUser.password) { showToast('❌ كلمة المرور الحالية خاطئة', 'error'); return; }
    if (newP.length < 4 || newP !== conP) { showToast('❌ كلمة المرور غير صحيحة', 'error'); return; }
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx > -1) { users[idx].password = newP; currentUser.password = newP; setData('users', users); }
    $('oldPassword').value = ''; $('newPassword').value = ''; $('confirmPassword').value = '';
    showToast('✅ تم تغيير كلمة المرور', 'success');
};

window.exportData = function() {
    const data = { version: '14.0.0', exportDate: new Date().toISOString(), products, sales, purchases, returns, expenses, customers, suppliers, treasury, payments, users, auditLog, companyData, vatSettings, accounts, journalEntries, inventoryMovements };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mizan_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    showToast('✅ تم التصدير', 'success');
};

window.importData = function(event) {
    if (!isAdmin()) return;
    const file = event.target.files[0]; if (!file) return;
    if (!confirm('⚠️ سيتم استبدال البيانات. متابعة؟')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            ['products', 'sales', 'purchases', 'returns', 'expenses', 'customers', 'suppliers', 'treasury', 'payments', 'users', 'auditLog', 'companyData', 'vatSettings', 'accounts', 'journalEntries', 'inventoryMovements'].forEach(key => { if (data[key]) window[key] = data[key]; });
            saveAll(); populateAllDropdowns(); populateLoginUsers(); refreshAllViews();
            showToast('✅ تم الاستيراد', 'success');
        } catch (err) { showToast('❌ ملف غير صالح', 'error'); }
    };
    reader.readAsText(file); event.target.value = '';
};

window.clearAllData = function() {
    if (!confirm('⚠️ مسح جميع البيانات؟')) return;
    if (!confirm('✅ تأكيد نهائي؟')) return;
    ['products', 'sales', 'purchases', 'returns', 'expenses', 'customers', 'suppliers', 'treasury', 'payments', 'companyData', 'accounts', 'journalEntries', 'inventoryMovements', 'warehouses', 'warehouseMovements', 'productWarehouseStock'].forEach(k => localStorage.removeItem('mizan_' + k));
    localStorage.removeItem('mizan_seeded');
    location.reload();
};

window.saveAll = function() {
    setData('products', products); setData('sales', sales); setData('purchases', purchases);
    setData('returns', returns); setData('expenses', expenses); setData('customers', customers);
    setData('suppliers', suppliers); setData('treasury', treasury); setData('payments', payments);
    setData('users', users); setData('auditLog', auditLog); setData('companyData', companyData);
    setData('vatSettings', vatSettings); setData('accounts', accounts);
    setData('journalEntries', journalEntries); setData('inventoryMovements', inventoryMovements);
};

// ============================================================
// التهيئة النهائية
// ============================================================
function init() {
    console.log('🚀 الميزان 14.0.0');
    if (typeof initFirebase === 'function') initFirebase();

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

    if (accounts.length === 0 && typeof DEFAULT_ACCOUNTS !== 'undefined') { window.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)); setData('accounts', accounts); }

    window.users = getData('users', []);
    if (users.length === 0) { window.users = [{ id: 1, name: 'المدير', password: '123456', role: 'admin', active: true }, { id: 2, name: 'مشرف', password: '123456', role: 'manager', active: true }, { id: 3, name: 'كاشير', password: '123456', role: 'cashier', active: true }, { id: 4, name: 'مشاهد', password: '123456', role: 'viewer', active: true }]; setData('users', users); }

    window.products = typeof migrateOldProducts === 'function' ? migrateOldProducts(rawProducts) : rawProducts;
    const allZero = products.length > 0 && products.every(p => p.qty === 0);
    if (allZero) { window.products = []; localStorage.removeItem('mizan_products'); }

    if (products.length === 0 && !localStorage.getItem('mizan_seeded')) {
        window.products = [{ id: 1, name: 'قلم جاف', barcode: '1001', buy: 2, sell: 5, qty: 50, min: 10, vat: 14 }, { id: 2, name: 'كشكول 60 ورقة', barcode: '1002', buy: 8, sell: 15, qty: 30, min: 5, vat: 14 }, { id: 3, name: 'مسطرة 30 سم', barcode: '1003', buy: 3, sell: 7, qty: 40, min: 10, vat: 14 }];
        setData('products', products); localStorage.setItem('mizan_seeded', 'true');
    } else { setData('products', products); }

    if (typeof populateLoginUsers === 'function') populateLoginUsers();
    if ($('expDate')) $('expDate').value = getTodayDate();
    if ($('collectDate')) $('collectDate').value = getTodayDate();
    if ($('payDate')) $('payDate').value = getTodayDate();
    if ($('jeDate')) $('jeDate').value = getTodayDate();

    setTimeout(() => { const d = $('jeDebitAmount'), c = $('jeCreditAmount'); if (d) d.addEventListener('input', updateJournalCheck); if (c) c.addEventListener('input', updateJournalCheck); }, 500);

    updateClock(); updateHeaderCompanyName();
    
    if (typeof window.populateAllDropdowns === 'function') try { window.populateAllDropdowns(); } catch(e) {}
    if (typeof window.refreshAllViews === 'function') try { window.refreshAllViews(); } catch(e) {}
    if (typeof window.renderProducts === 'function') try { window.renderProducts(); } catch(e) {}

    console.log('✅ الميزان جاهز');
}

document.addEventListener('DOMContentLoaded', init);
