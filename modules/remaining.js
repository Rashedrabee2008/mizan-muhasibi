// ================================================================
// CASHIER MODULE - إدارة الكاشف (نسخة معدلة مع Optional Chaining)
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

// ================================================================
// RENDER CASHIER - نسخة معدلة مع Optional Chaining
// ================================================================
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
        safeSetText('cashierTransactionCount', cashier.transactions?.length || 0);
        safeSetText('cashierTodayCount', cashier.transactions?.length || 0);

        const container = document.getElementById('cashierTodayTransactions');
        if (!cashier.transactions || cashier.transactions.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-receipt" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد حركات اليوم</span></div>`;
        } else {
            const typeNames = { sale: '💰 بيع', expense: '💸 مصروف', deposit: '📥 إيداع', withdraw: '📤 سحب' };
            const typeColors = { sale: '#2D8F5E', expense: '#E06060', deposit: '#4A8AB5', withdraw: '#E6A830' };
            const sign = { sale: '+', expense: '-', deposit: '+', withdraw: '-' };
            
            // ✅ استخدام Optional Chaining للوصول الآمن إلى transactions
            const transactions = cashier.transactions || [];
            
            container.innerHTML = transactions.slice().reverse().map(t => {
                // ✅ استخدام Optional Chaining للوصول الآمن إلى خصائص الحركة
                const type = t?.type || 'unknown';
                const amount = t?.amount || 0;
                const method = t?.method || 'غير محدد';
                const note = t?.note || '';
                const time = t?.time || '--:--';
                const typeName = typeNames[type] || type;
                const typeColor = typeColors[type] || '#A89070';
                const signChar = sign[type] || '';
                const amountColor = (type === 'sale' || type === 'deposit') ? '#2D8F5E' : '#E06060';
                
                return `
                    <div style="display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #2D2D2D;font-size:11px;color:#F5E6C8;">
                        <div><span style="color:${typeColor};font-weight:700;">${typeName}</span> <span style="color:#5D5D5D;font-size:9px;">${time}</span></div>
                        <div style="font-weight:700;color:${amountColor};">
                            ${signChar} ${amount.toFixed(2)}
                        </div>
                        <div style="font-size:9px;color:#A89070;">${note}</div>
                    </div>
                `;
            }).join('');
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

    // ===== عرض سجل الكاشف =====
    const historyContainer = document.getElementById('cashierHistory');
    if (!window.cashierHistory || window.cashierHistory.length === 0) {
        historyContainer.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-calendar" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد سجلات سابقة</span></div>`;
    } else {
        // ✅ استخدام Optional Chaining للوصول الآمن إلى cashierHistory
        const history = window.cashierHistory || [];
        const displayHistory = history.slice().reverse().slice(0, 10);
        
        historyContainer.innerHTML = displayHistory.map(c => {
            // ✅ استخدام Optional Chaining للوصول الآمن إلى خصائص السجل
            const date = c?.date || '-';
            const status = c?.status || 'closed';
            const openTime = c?.openTime || '-';
            const closeTime = c?.closeTime || '-';
            const openingBalance = c?.openingBalance || 0;
            const closingBalance = c?.closingBalance || 0;
            const transactions = c?.transactions || [];
            const totalSales = c?.totalSales || 0;
            const totalExpenses = c?.totalExpenses || 0;
            const statusColor = status === 'open' ? '#2D8F5E' : '#E06060';
            const statusText = status === 'open' ? `🟢 مفتوح - ${openTime}` : `🔴 مغلق - ${closeTime}`;
            
            return `
                <div class="cashier-history-item">
                    <div class="header">
                        <span>📅 ${date}</span>
                        <span style="color:${statusColor};">${statusText}</span>
                    </div>
                    <div class="details">
                        <span>💰 فتح: ${openingBalance.toFixed(2)}</span>
                        <span>💰 ختام: ${closingBalance.toFixed(2)}</span>
                        <span>📊 حركات: ${transactions.length}</span>
                    </div>
                    <div class="details">
                        <span>📈 مبيعات: ${totalSales.toFixed(2)}</span>
                        <span>📉 مصروفات: ${totalExpenses.toFixed(2)}</span>
                        <span style="color:${status === 'open' ? '#E6A830' : '#C9A94E'};">
                            ${status === 'open' ? '⏳ مفتوح' : `🕐 ${closeTime || '-'}`}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
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
                <div><strong>📋 عدد الحركات:</strong> ${cashier.transactions?.length || 0}</div>
                ${(cashier.transactions || []).slice(-10).map(t => `
                    <div style="font-size:9px;padding:2px 0;">• ${t.time || '--:--'} ${t.note || ''}: ${(t.amount || 0).toFixed(2)}</div>
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