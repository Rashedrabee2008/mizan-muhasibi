// ================================================================
// expenses.js - إدارة المصروفات (الملف الكامل)
// ================================================================

// ================================================================
// ADD EXPENSE - إضافة مصروف (نسخة محسنة)
// ================================================================
function addExpense() {
    if (!canAdd()) { 
        showToast('⚠️ ليس لديك صلاحية', 'error'); 
        return; 
    }
    
    const note = document.getElementById('expenseNote')?.value?.trim();
    const amount = parseFloat(document.getElementById('expenseAmount')?.value);
    const date = document.getElementById('expenseDate')?.value || getTodayDate();
    const method = document.getElementById('expenseMethod')?.value || 'نقدي';

    if (!note) { 
        showToast('⚠️ أدخل بيان المصروف', 'error'); 
        return; 
    }
    if (isNaN(amount) || amount <= 0) { 
        showToast('⚠️ مبلغ صحيح', 'error'); 
        return; 
    }

    // إضافة المصروف
    const expense = {
        id: Date.now(),
        note: note,
        amount: amount,
        date: date,
        method: method,
        time: getCurrentTime()
    };
    
    window.expenses.push(expense);
    
    // إضافة حركة في الخزنة
    window.treasury.push({ 
        id: Date.now(), 
        type: 'withdraw', 
        amount: amount, 
        note: `مصروف: ${note}`, 
        method: method,
        date: date, 
        time: getCurrentTime(),
        expenseId: expense.id
    });

    // إضافة حركة في الكاشف
    if (typeof addCashierTransaction === 'function') {
        addCashierTransaction('expense', amount, method, `مصروف: ${note}`);
    }

    // حفظ البيانات فوراً
    saveAll();
    
    // تحديث واجهة المصروفات
    renderExpenses();
    
    // تحديث الكاشف
    if (typeof renderCashier === 'function') {
        renderCashier();
    }
    
    // تحديث الخزنة
    if (typeof renderTreasury === 'function') {
        renderTreasury();
    }
    
    // تحديث لوحة التحكم
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }

    // تسجيل النشاط
    addAuditLog('add', 'expense', `إضافة مصروف: ${note} - ${amount.toFixed(2)} 🇪🇬 - طريقة الدفع: ${method}`, expense);
    
    // تنظيف الحقول
    const noteEl = document.getElementById('expenseNote');
    const amountEl = document.getElementById('expenseAmount');
    if (noteEl) noteEl.value = '';
    if (amountEl) amountEl.value = '';
    
    showToast(`✅ تم إضافة المصروف: ${note} - ${amount.toFixed(2)} 🇪🇬`, 'success');
    
    // ✅ التأكد من تحديث الكاشف بعد 100ms
    setTimeout(() => {
        if (typeof renderCashier === 'function') {
            renderCashier();
        }
        if (typeof renderTreasury === 'function') {
            renderTreasury();
        }
    }, 100);
}

// ================================================================
// RENDER EXPENSES - عرض المصروفات (نسخة محسنة)
// ================================================================
function renderExpenses() {
    // التأكد من وجود window.expenses
    if (!window.expenses || !Array.isArray(window.expenses)) {
        window.expenses = [];
    }
    
    const total = window.expenses.reduce((s, e) => s + e.amount, 0);
    safeSetText('expensesTotal', total.toFixed(2));
    safeSetText('expensesCount', window.expenses.length);

    const container = document.getElementById('expenseList');
    if (!container) return;

    if (window.expenses.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-money-bill-wave"></i><span>لا توجد مصروفات</span></div>`;
        return;
    }

    const canEditExpenses = canEdit();
    const canDeleteExpenses = canDelete();

    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 1fr 1fr 0.6fr;">
        <span>البيان</span><span>المبلغ</span><span>التاريخ</span><span>طريقة الدفع</span><span></span>
    </div>`;

    window.expenses.slice().reverse().forEach(e => {
        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 1fr 1fr 1fr 0.6fr;font-size:12px;">
                <span>${e.note}</span>
                <span style="color:#E06060;font-weight:700;">${e.amount.toFixed(2)}</span>
                <span>${e.date}</span>
                <span>${e.method || 'نقدي'}</span>
                <div class="actions">
                    ${canEditExpenses ? `<button class="btn btn-warning btn-sm" onclick="editExpense(${e.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteExpenses ? `<button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// EDIT EXPENSE - تعديل المصروف
// ================================================================
function editExpense(id) {
    if (!canEdit()) { 
        showToast('⚠️ ليس لديك صلاحية', 'error'); 
        return; 
    }
    
    const e = window.expenses.find(exp => exp.id === id);
    if (!e) {
        showToast('⚠️ المصروف غير موجود', 'error');
        return;
    }

    const html = `
        <div class="form-group"><label>البيان</label><input type="text" id="editExpenseNote" value="${e.note}" /></div>
        <div class="form-row">
            <div class="form-group"><label>المبلغ</label><input type="number" id="editExpenseAmount" value="${e.amount}" min="0.01" step="0.01" /></div>
            <div class="form-group"><label>التاريخ</label><input type="date" id="editExpenseDate" value="${e.date}" /></div>
        </div>
        <div class="form-group"><label>طريقة الدفع</label>
            <select id="editExpenseMethod">
                <option value="نقدي" ${e.method === 'نقدي' ? 'selected' : ''}>نقدي</option>
                <option value="محفظة" ${e.method === 'محفظة' ? 'selected' : ''}>محفظة</option>
                <option value="بنك" ${e.method === 'بنك' ? 'selected' : ''}>بنك</option>
            </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveExpenseEdit(${e.id})"><i class="fas fa-save"></i> حفظ</button>
    `;
    openModal('✏️ تعديل المصروف', html);
}

// ================================================================
// SAVE EXPENSE EDIT - حفظ تعديل المصروف
// ================================================================
function saveExpenseEdit(id) {
    if (!canEdit()) { 
        showToast('⚠️ ليس لديك صلاحية', 'error'); 
        return; 
    }
    
    const e = window.expenses.find(exp => exp.id === id);
    if (!e) {
        showToast('⚠️ المصروف غير موجود', 'error');
        return;
    }

    const note = document.getElementById('editExpenseNote')?.value?.trim();
    const amount = parseFloat(document.getElementById('editExpenseAmount')?.value);
    const date = document.getElementById('editExpenseDate')?.value;
    const method = document.getElementById('editExpenseMethod')?.value;

    if (!note) { 
        showToast('⚠️ أدخل البيان', 'error'); 
        return; 
    }
    if (isNaN(amount) || amount <= 0) { 
        showToast('⚠️ مبلغ صحيح', 'error'); 
        return; 
    }

    // تحديث الخزنة
    const tIdx = window.treasury.findIndex(t => 
        t.note && t.note.includes(`مصروف: ${e.note}`) && t.date === e.date
    );
    if (tIdx > -1) {
        window.treasury[tIdx].note = `مصروف: ${note}`;
        window.treasury[tIdx].amount = amount;
        window.treasury[tIdx].date = date;
        window.treasury[tIdx].method = method;
    }

    e.note = note;
    e.amount = amount;
    e.date = date;
    e.method = method;

    saveAll();
    addAuditLog('edit', 'expense', `تعديل مصروف: ${note} - ${amount.toFixed(2)} 🇪🇬`);
    renderExpenses();
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof renderTreasury === 'function') renderTreasury();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

// ================================================================
// DELETE EXPENSE - حذف المصروف
// ================================================================
function deleteExpense(id) {
    if (!canDelete()) { 
        showToast('⚠️ ليس لديك صلاحية', 'error'); 
        return; 
    }
    if (!confirm('⚠️ حذف المصروف نهائياً؟')) return;

    const expense = window.expenses.find(e => e.id === id);
    if (!expense) {
        showToast('⚠️ المصروف غير موجود', 'error');
        return;
    }

    // حذف من الخزنة
    const tIdx = window.treasury.findIndex(t => 
        t.note && t.note.includes(`مصروف: ${expense.note}`) && t.date === expense.date
    );
    if (tIdx > -1) {
        window.treasury.splice(tIdx, 1);
    }

    window.expenses = window.expenses.filter(e => e.id !== id);
    saveAll();
    
    addAuditLog('delete', 'expense', `🗑️ حذف مصروف: ${expense.note} - ${expense.amount.toFixed(2)} 🇪🇬`);
    renderExpenses();
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof renderTreasury === 'function') renderTreasury();
    showToast('🗑️ تم حذف المصروف', 'info');
    closeModal();
}
