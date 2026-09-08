// ================================================================
// cashier.js - نظام الكاشير (فتح/إغلاق اليوم)
// ================================================================

// ===== متغيرات الكاشير =====
let cashierDay = null;

// ================================================================
// INIT CASHIER
// ================================================================
function initCashier() {
    if (!window.cashierHistory || !Array.isArray(window.cashierHistory)) {
        window.cashierHistory = [];
        setData('cashierHistory', window.cashierHistory);
    }

    // تحميل حالة اليوم
    const savedDay = localStorage.getItem('mizan_cashier_day');
    if (savedDay) {
        try {
            cashierDay = JSON.parse(savedDay);
        } catch(e) {
            cashierDay = null;
        }
    }
    updateCashierUI();
}

// ================================================================
// UPDATE CASHIER UI
// ================================================================
function updateCashierUI() {
    const today = getTodayDate();
    const dateEl = document.getElementById('cashierDate');
    const statusBadge = document.getElementById('cashierStatusBadge');

    if (dateEl) {
        dateEl.textContent = today;
    }

    // حالة الكاشير
    const isOpen = cashierDay && cashierDay.date === today && cashierDay.status === 'open';
    if (statusBadge) {
        if (isOpen) {
            statusBadge.textContent = '🟢 مفتوح';
            statusBadge.style.background = '#2D8F5E';
        } else {
            statusBadge.textContent = '🔴 مغلق';
            statusBadge.style.background = '#E06060';
        }
    }

    // عرض الأرقام
    if (isOpen) {
        const sales = cashierDay.sales || 0;
        const expenses = cashierDay.expenses || 0;
        const opening = cashierDay.openingBalance || 0;
        const closing = opening + sales - expenses;

        safeSetText('cashierOpeningBalance', opening.toFixed(2));
        safeSetText('cashierTotalSales', sales.toFixed(2));
        safeSetText('cashierTotalExpenses', expenses.toFixed(2));
        safeSetText('cashierClosingBalance', closing.toFixed(2));

        // تفاصيل طرق الدفع
        const cash = cashierDay.cash || 0;
        const wallet = cashierDay.wallet || 0;
        const bank = cashierDay.bank || 0;
        const instapay = cashierDay.instapay || 0;

        safeSetText('cashierCash', cash.toFixed(2));
        safeSetText('cashierWallet', wallet.toFixed(2));
        safeSetText('cashierBank', bank.toFixed(2));
        safeSetText('cashierInstapay', instapay.toFixed(2));

        // عدد الحركات
        const transCount = (cashierDay.transactions || []).length;
        safeSetText('cashierTransactionCount', transCount);
        safeSetText('cashierTodayCount', transCount);

        // عرض الحركات
        renderCashierTodayTransactions(cashierDay.transactions || []);
    } else {
        safeSetText('cashierOpeningBalance', '0.00');
        safeSetText('cashierTotalSales', '0.00');
        safeSetText('cashierTotalExpenses', '0.00');
        safeSetText('cashierClosingBalance', '0.00');
        safeSetText('cashierCash', '0.00');
        safeSetText('cashierWallet', '0.00');
        safeSetText('cashierBank', '0.00');
        safeSetText('cashierInstapay', '0.00');
        safeSetText('cashierTransactionCount', '0');
        safeSetText('cashierTodayCount', '0');

        const container = document.getElementById('cashierTodayTransactions');
        if (container) {
            container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-receipt" style="font-size:28px;"></i><span style="font-size:13px;">الكاشير مغلق</span></div>`;
        }
    }

    // عرض تاريخ الكاشير
    renderCashierHistory();
}

// ================================================================
// CASHIER OPEN DAY - فتح اليوم
// ================================================================
function cashierOpenDay() {
    if (!canAdd()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const today = getTodayDate();

    if (cashierDay && cashierDay.date === today && cashierDay.status === 'open') {
        showToast('⚠️ اليوم مفتوح بالفعل', 'warning');
        return;
    }

    const openingBalance = parseFloat(prompt('💰 أدخل الرصيد الافتتاحي للكاشير:', '0')) || 0;

    cashierDay = {
        date: today,
        status: 'open',
        openingBalance: openingBalance,
        sales: 0,
        expenses: 0,
        cash: 0,
        wallet: 0,
        bank: 0,
        instapay: 0,
        transactions: [],
        openedAt: new Date().toISOString(),
        openedBy: window.currentUser?.username || 'admin'
    };

    localStorage.setItem('mizan_cashier_day', JSON.stringify(cashierDay));
    updateCashierUI();
    showToast(`✅ تم فتح اليوم - الرصيد الافتتاحي: ${openingBalance.toFixed(2)}`, 'success');
    addAuditLog('cashier', 'cashier', `فتح اليوم - الرصيد: ${openingBalance.toFixed(2)}`);
}

// ================================================================
// CASHIER CLOSE DAY - إغلاق اليوم
// ================================================================
function cashierCloseDay() {
    if (!canEdit()) {
        showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }

    const today = getTodayDate();

    if (!cashierDay || cashierDay.date !== today || cashierDay.status !== 'open') {
        showToast('⚠️ اليوم غير مفتوح', 'error');
        return;
    }

    const sales = cashierDay.sales || 0;
    const expenses = cashierDay.expenses || 0;
    const opening = cashierDay.openingBalance || 0;
    const closing = opening + sales - expenses;

    if (!confirm(`💰 هل أنت متأكد من إغلاق اليوم؟\nالرصيد الختامي: ${closing.toFixed(2)} 🇪🇬`)) return;

    cashierDay.status = 'closed';
    cashierDay.closingBalance = closing;
    cashierDay.closedAt = new Date().toISOString();
    cashierDay.closedBy = window.currentUser?.username || 'admin';

    // حفظ في السجل
    if (!window.cashierHistory) window.cashierHistory = [];
    window.cashierHistory.push({
        ...cashierDay,
        id: Date.now()
    });
    setData('cashierHistory', window.cashierHistory);

    localStorage.removeItem('mizan_cashier_day');
    const savedDay = { ...cashierDay };
    cashierDay = null;

    saveAll();
    updateCashierUI();
    addAuditLog('cashier', 'cashier', `إغلاق اليوم - الرصيد الختامي: ${closing.toFixed(2)}`);

    showToast(`✅ تم إغلاق اليوم - الرصيد الختامي: ${closing.toFixed(2)}`, 'success');
}

// ================================================================
// RENDER CASHIER TODAY TRANSACTIONS
// ================================================================
function renderCashierTodayTransactions(transactions) {
    const container = document.getElementById('cashierTodayTransactions');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-receipt" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد حركات اليوم</span></div>`;
        return;
    }

    let html = '';
    transactions.slice().reverse().forEach(t => {
        const color = t.type === 'sale' ? '#2D8F5E' : t.type === 'expense' ? '#E06060' : '#C9A94E';
        const icon = t.type === 'sale' ? 'fa-arrow-down' : t.type === 'expense' ? 'fa-arrow-up' : 'fa-exchange-alt';
        const sign = t.type === 'sale' ? '+' : '-';

        html += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #2D2D2D;font-size:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="fas ${icon}" style="color:${color};"></i>
                    <span>${t.note || t.type}</span>
                </div>
                <span style="color:${color};font-weight:700;">${sign}${t.amount.toFixed(2)}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// RENDER CASHIER HISTORY
// ================================================================
function renderCashierHistory() {
    const container = document.getElementById('cashierHistory');
    if (!container) return;

    initCashier();

    if (window.cashierHistory.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-calendar" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد سجلات سابقة</span></div>`;
        return;
    }

    let html = '';
    window.cashierHistory.slice().reverse().forEach(day => {
        const balance = (day.openingBalance || 0) + (day.sales || 0) - (day.expenses || 0);
        html += `
            <div class="cashier-history-item" style="border-right-color:${day.status === 'closed' ? '#2D8F5E' : '#E6A830'};">
                <div class="header">
                    <span>📅 ${day.date}</span>
                    <span style="color:${day.status === 'closed' ? '#2D8F5E' : '#E6A830'};">
                        ${day.status === 'closed' ? '✅ مغلق' : '🔴 مفتوح'}
                    </span>
                </div>
                <div class="details">
                    <div>💰 افتتاحي: ${day.openingBalance?.toFixed(2) || '0.00'}</div>
                    <div>📈 مبيعات: ${day.sales?.toFixed(2) || '0.00'}</div>
                    <div>📉 مصروفات: ${day.expenses?.toFixed(2) || '0.00'}</div>
                    <div>🏦 ختامي: ${balance.toFixed(2)}</div>
                    <div>📋 حركات: ${day.transactions?.length || 0}</div>
                    <div style="color:#A89070;font-size:10px;">👤 ${day.closedBy || day.openedBy || '-'}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// CASHIER PRINT REPORT
// ================================================================
function cashierPrintReport() {
    if (!cashierDay || cashierDay.status !== 'open') {
        showToast('⚠️ لا يوجد يوم مفتوح', 'error');
        return;
    }

    const sales = cashierDay.sales || 0;
    const expenses = cashierDay.expenses || 0;
    const opening = cashierDay.openingBalance || 0;
    const closing = opening + sales - expenses;

    const html = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الكاشير - ${cashierDay.date}</title>
            <style>
                body { font-family: 'Tajawal', sans-serif; padding: 20px; max-width: 400px; margin: auto; background: #fff; color: #000; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                .header h2 { margin: 0; color: #C9A94E; }
                .info { font-size: 13px; margin-bottom: 10px; }
                .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #ddd; }
                .total { border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; font-weight: 700; font-size: 14px; text-align: center; }
                .footer { text-align: center; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; font-size: 11px; color: #555; }
                @media print { body { padding: 10px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>${window.companyData?.name || 'الميزان'}</h2>
                <div class="sub">تقرير الكاشير اليومي</div>
            </div>
            <div class="info">
                <div class="row"><span>📅 التاريخ:</span><span>${cashierDay.date}</span></div>
                <div class="row"><span>🕐 الفتح:</span><span>${new Date(cashierDay.openedAt).toLocaleTimeString('ar')}</span></div>
                <div class="row"><span>👤 المستخدم:</span><span>${cashierDay.openedBy || 'admin'}</span></div>
            </div>
            <div class="row"><span>💰 الرصيد الافتتاحي:</span><span>${opening.toFixed(2)} 🇪🇬</span></div>
            <div class="row"><span>📈 إجمالي المبيعات:</span><span style="color:#2D8F5E;">${sales.toFixed(2)} 🇪🇬</span></div>
            <div class="row"><span>📉 إجمالي المصروفات:</span><span style="color:#E06060;">${expenses.toFixed(2)} 🇪🇬</span></div>
            <div class="row"><span>📋 عدد الحركات:</span><span>${cashierDay.transactions?.length || 0}</span></div>
            <div class="total">
                <div>الرصيد الختامي: ${closing.toFixed(2)} 🇪🇬</div>
            </div>
            <div class="footer">تم الطباعة في ${new Date().toLocaleString('ar')}</div>
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