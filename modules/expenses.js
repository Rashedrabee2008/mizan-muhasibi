// ================================================================
// EDIT EXPENSE - تعديل المصروف (نسخة محسنة)
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
        <div class="form-group">
            <label>البيان</label>
            <input type="text" id="editExpenseNote" value="${e.note}" />
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>المبلغ</label>
                <input type="number" id="editExpenseAmount" value="${e.amount}" min="0.01" step="0.01" />
            </div>
            <div class="form-group">
                <label>التاريخ</label>
                <input type="date" id="editExpenseDate" value="${e.date}" />
            </div>
        </div>
        <div class="form-group">
            <label>طريقة الدفع</label>
            <select id="editExpenseMethod">
                <option value="نقدي" ${e.method === 'نقدي' ? 'selected' : ''}>نقدي</option>
                <option value="محفظة" ${e.method === 'محفظة' ? 'selected' : ''}>محفظة</option>
                <option value="بنك" ${e.method === 'بنك' ? 'selected' : ''}>بنك</option>
            </select>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <button class="btn btn-primary btn-block" onclick="saveExpenseEdit(${e.id})">
                <i class="fas fa-save"></i> حفظ
            </button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()">
                <i class="fas fa-times"></i> إلغاء
            </button>
        </div>
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

    // حفظ التعديلات
    e.note = note;
    e.amount = amount;
    e.date = date;
    e.method = method;

    saveAll();
    addAuditLog('edit', 'expense', `تعديل مصروف: ${note} - ${amount.toFixed(2)} 🇪🇬`);
    renderExpenses();
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof updateDashboard === 'function') updateDashboard();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}
