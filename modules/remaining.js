// ================================================================
// remaining.js - جزء الكاشف (الملف الكامل)
// ================================================================

// ================================================================
// CASHIER MODULE - إدارة الكاشف (الملف الكامل)
// ================================================================

if (typeof window.cashierHistory === 'undefined') {
    window.cashierHistory = [];
}
let cashierDayOpen = false;
let currentCashier = null;

// ================================================================
// GET LAST CASHIER - الحصول على آخر كاشف
// ================================================================
function getLastCashier() {
    if (!window.cashierHistory || window.cashierHistory.length === 0) return null;
    return window.cashierHistory[window.cashierHistory.length - 1];
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
    
    if (typeof setData === 'function') {
        setData('cashierHistory', window.cashierHistory);
    } else {
        localStorage.setItem('mizan_cashierHistory', JSON.stringify(window.cashierHistory));
    }
    
    saveAll();
    addAuditLog('add', 'cashier', `فتح اليوم ${today} - الساعة ${getCurrentTime()} - الرصيد الافتتاحي: ${openingBalance}`);
    renderCashier();
    showToast(`✅ تم فتح اليوم - الرصيد الافتتاحي: ${openingBalance.toFixed(2)}`, 'success');
    addAlert(`🟢 فتح اليوم`, `تم فتح اليوم ${today} - الساعة ${getCurrentTime()} - الرصيد: ${openingBalance.toFixed(2)}`, 'success');
}

// ================================================================
// ADD CASHIER TRANSACTION - إضافة حركة كاشف
// ================================================================
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
    
    if (typeof setData === 'function') {
        setData('cashierHistory', window.cashierHistory);
    } else {
        localStorage.setItem('mizan_cashierHistory', JSON.stringify(window.cashierHistory));
    }
    
    saveAll();
    renderCashier();
}

// ================================================================
// CASHIER CLOSE DAY - إغلاق اليوم
// ================================================================
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
    
    if (typeof setData === 'function') {
        setData('cashierHistory', window.cashierHistory);
    } else {
        localStorage.setItem('mizan_cashierHistory', JSON.stringify(window.cashierHistory));
    }
    
    saveAll();
    addAuditLog('add', 'cashier', `إغلاق اليوم ${today} - الساعة ${getCurrentTime()} - الرصيد الختامي: ${cashier.closingBalance}`);
    renderCashier();
    showToast(`✅ تم إغلاق اليوم - الرصيد: ${cashier.closingBalance.toFixed(2)}`, 'success');
    addAlert(`🔴 إغلاق اليوم`, `تم إغلاق اليوم ${today} - الساعة ${getCurrentTime()} - الرصيد: ${cashier.closingBalance.toFixed(2)}`, 'info');
}

// ================================================================
// RENDER CASHIER - عرض الكاشف (نسخة محسنة)
// ================================================================
function renderCashier() {
    const today = getTodayDate();
    const cashier = window.cashierHistory?.find(c => c.date === today && c.status === 'open') || null;
    const lastCashier = getLastCashier();
    const dt = getCurrentDateTime();

    // تحديث التاريخ والوقت
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
            
            const transactions = cashier.transactions || [];
            
            container.innerHTML = transactions.slice().reverse().map(t => {
                const type = t?.type || 'unknown';
                const amount = t?.amount || 0;
                const note = t?.note || '';
                const time = t?.time || '--:--';
                const typeName = typeNames[type] || type;
                const typeColor = typeColors[type] || '#A89070';
                const signChar = sign[type] || '';
                const amountColor = (type === 'sale' || type === 'deposit') ? '#2D8F5E' : '#E06060';
                
                return `
                    <div style="display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #2D2D2D;font-size:11px;color:#F5E6C8;">
                        <div><span style="color:${typeColor};font-weight:700;">${typeName}</span> <span style="color:#5D5D5D;font-size:9px;">${time}</span></div>
                        <div style="font-weight:700;color:${amountColor};">${signChar} ${amount.toFixed(2)}</div>
                        <div style="font-size:9px;color:#A89070;">${note}</div>
                    </div>
                `;
            }).join('');
        }
    } else {
        // إذا كان اليوم مغلق، نعرض آخر رصيد
        const lastBalance = lastCashier ? lastCashier.closingBalance : 0;
        safeSetText('cashierOpeningBalance', lastBalance.toFixed(2));
        safeSetText('cashierTotalSales', '0.00');
        safeSetText('cashierTotalExpenses', '0.00');
        safeSetText('cashierClosingBalance', lastBalance.toFixed(2));
        safeSetText('cashierCash', '0.00');
        safeSetText('cashierWallet', '0.00');
        safeSetText('cashierBank', '0.00');
        safeSetText('cashierInstapay', '0.00');
        safeSetText('cashierTransactionCount', '0');
        safeSetText('cashierTodayCount', '0');
        
        const container = document.getElementById('cashierTodayTransactions');
        container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-receipt" style="font-size:28px;"></i><span style="font-size:13px;">افتح اليوم لبدء تسجيل الحركات</span></div>`;
    }

    // سجل الكاشف
    const historyContainer = document.getElementById('cashierHistory');
    if (!window.cashierHistory || window.cashierHistory.length === 0) {
        historyContainer.innerHTML = `<div class="empty-state" style="padding:16px 0;"><i class="fas fa-calendar" style="font-size:28px;"></i><span style="font-size:13px;">لا توجد سجلات سابقة</span></div>`;
    } else {
        historyContainer.innerHTML = window.cashierHistory.slice().reverse().slice(0, 10).map(c => {
            const date = c?.date || '-';
            const status = c?.status || 'closed';
            const openTime = c?.openTime || '-';
            const closeTime = c?.closeTime || '-';
            const openingBalance = c?.openingBalance || 0;
            const closingBalance = c?.closingBalance || 0;
            const transactions = c?.transactions || [];
            const totalSales = c?.totalSales || 0;
            const totalExpenses = c?.totalExpenses || 0;
            const statusColor = status === 'open' ? '#2D
