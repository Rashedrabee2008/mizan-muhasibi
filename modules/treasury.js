// ================================================================
// treasury.js - إدارة الخزنة
// ================================================================

// ================================================================
// ADD TREASURY TRANSACTION
// ================================================================
function addTreasuryTransaction() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    
    const type = document.getElementById('treasuryType')?.value;
    const amount = parseFloat(document.getElementById('treasuryAmount')?.value);
    const method = document.getElementById('treasuryMethod')?.value || 'نقدي';
    const date = document.getElementById('treasuryDate')?.value || getTodayDate();
    const note = document.getElementById('treasuryNote')?.value?.trim() || 'حركة خزنة';
    const warehouseId = parseInt(document.getElementById('treasuryWarehouse')?.value) || null;

    if (isNaN(amount) || amount <= 0) { 
        showToast('⚠️ مبلغ صحيح', 'error'); 
        return; 
    }

    const transaction = {
        id: Date.now(), 
        type: type, 
        amount: amount, 
        method: method, 
        date: date, 
        note: note,
        warehouseId: warehouseId, 
        time: getCurrentTime(),
        createdAt: new Date().toISOString()
    };
    
    window.treasury.push(transaction);
    saveAll();
    
    addAuditLog('add', 'treasury', `${type === 'deposit' ? 'إيداع' : 'سحب'} - ${amount.toFixed(2)} 🇪🇬 - ${note}${method ? ' (' + method + ')' : ''}`);
    
    renderTreasury();
    if (typeof renderCashier === 'function') renderCashier();
    if (typeof updateDashboard === 'function') updateDashboard();
    
    document.getElementById('treasuryAmount').value = '';
    document.getElementById('treasuryNote').value = '';
    
    showToast('✅ تم إضافة الحركة', 'success');
}

// ================================================================
// RENDER TREASURY
// ================================================================
function renderTreasury() {
    if (!window.treasury || !Array.isArray(window.treasury)) {
        window.treasury = [];
    }
    
    const balance = window.treasury.reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);
    safeSetText('treasuryBalance', balance.toFixed(2) + ' 🇪🇬');

    const deposits = window.treasury.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const withdrawals = window.treasury.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
    safeSetText('treasuryDeposits', deposits.toFixed(2));
    safeSetText('treasuryWithdrawals', withdrawals.toFixed(2));

    const cash = window.treasury.filter(t => t.method === 'نقدي').reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);
    const wallet = window.treasury.filter(t => t.method === 'محفظة').reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);
    const bank = window.treasury.filter(t => t.method === 'بنك').reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0);
    safeSetText('treasuryCash', cash.toFixed(2));
    safeSetText('treasuryWallet', wallet.toFixed(2));
    safeSetText('treasuryBank', bank.toFixed(2));

    const container = document.getElementById('treasuryList');
    if (!container) return;

    if (window.treasury.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-vault"></i><span>لا توجد حركات</span></div>`;
        return;
    }

    const canEditTreasury = canEdit();
    const canDeleteTreasury = canDelete();

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr 0.6fr;">
        <span>البيان</span><span>المبلغ</span><span>النوع</span><span>طريقة الدفع</span><span>المخزن</span><span>التاريخ</span><span></span>
    </div>`;

    window.treasury.slice().reverse().forEach(t => {
        const color = t.type === 'deposit' ? '#2D8F5E' : '#E06060';
        const sign = t.type === 'deposit' ? '+' : '-';
        const w = window.warehouses?.find(wh => wh.id === t.warehouseId);
        const wName = w ? w.name : '-';

        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr 0.6fr;font-size:11px;">
                <span>${t.note}</span>
                <span style="color:${color};font-weight:700;">${sign}${t.amount.toFixed(2)}</span>
                <span>${t.type === 'deposit' ? 'إيداع' : 'سحب'}</span>
                <span>${t.method || 'نقدي'}</span>
                <span style="font-size:9px;">${wName}</span>
                <span style="font-size:10px;">${t.date}</span>
                <div class="actions">
                    ${canEditTreasury ? `<button class="btn btn-warning btn-sm" onclick="editTreasury(${t.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteTreasury ? `<button class="btn btn-danger btn-sm" onclick="deleteTreasury(${t.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// EDIT TREASURY
// ================================================================
function editTreasury(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    
    const t = window.treasury.find(tr => tr.id === id);
    if (!t) {
        showToast('⚠️ الحركة غير موجودة', 'error');
        return;
    }

    const html = `
        <div class="form-row">
            <div class="form-group"><label>النوع</label>
                <select id="editTreasuryType">
                    <option value="deposit" ${t.type === 'deposit' ? 'selected' : ''}>إيداع</option>
                    <option value="withdraw" ${t.type === 'withdraw' ? 'selected' : ''}>سحب</option>
                </select>
            </div>
            <div class="form-group"><label>المبلغ</label><input type="number" id="editTreasuryAmount" value="${t.amount}" min="0.01" step="0.01" /></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>طريقة الدفع</label>
                <select id="editTreasuryMethod">
                    <option value="نقدي" ${t.method === 'نقدي' ? 'selected' : ''}>نقدي</option>
                    <option value="محفظة" ${t.method === 'محفظة' ? 'selected' : ''}>محفظة</option>
                    <option value="بنك" ${t.method === 'بنك' ? 'selected' : ''}>بنك</option>
                </select>
            </div>
            <div class="form-group"><label>التاريخ</label><input type="date" id="editTreasuryDate" value="${t.date}" /></div>
        </div>
        <div class="form-group"><label>البيان</label><input type="text" id="editTreasuryNote" value="${t.note}" /></div>
        <button class="btn btn-primary btn-block" onclick="saveTreasuryEdit(${t.id})"><i class="fas fa-save"></i> حفظ</button>
    `;
    openModal('✏️ تعديل الحركة', html);
}

// ================================================================
// SAVE TREASURY EDIT
// ================================================================
function saveTreasuryEdit(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    
    const t = window.treasury.find(tr => tr.id === id);
    if (!t) {
        showToast('⚠️ الحركة غير موجودة', 'error');
        return;
    }

    const type = document.getElementById('editTreasuryType')?.value;
    const amount = parseFloat(document.getElementById('editTreasuryAmount')?.value);
    const method = document.getElementById('editTreasuryMethod')?.value;
    const date = document.getElementById('editTreasuryDate')?.value;
    const note = document.getElementById('editTreasuryNote')?.value?.trim();

    if (isNaN(amount) || amount <= 0) { 
        showToast('⚠️ مبلغ صحيح', 'error'); 
        return; 
    }

    t.type = type;
    t.amount = amount;
    t.method = method;
    t.date = date;
    t.note = note;

    saveAll();
    addAuditLog('edit', 'treasury', `تعديل حركة خزنة: ${note} - ${amount.toFixed(2)} 🇪🇬`);
    renderTreasury();
    if (typeof renderCashier === 'function') renderCashier();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

// ================================================================
// DELETE TREASURY
// ================================================================
function deleteTreasury(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف الحركة نهائياً؟')) return;

    const t = window.treasury.find(tr => tr.id === id);
    if (!t) {
        showToast('⚠️ الحركة غير موجودة', 'error');
        return;
    }

    window.treasury = window.treasury.filter(tr => tr.id !== id);
    saveAll();
    
    addAuditLog('delete', 'treasury', `🗑️ حذف حركة خزنة: ${t.note} - ${t.amount.toFixed(2)} 🇪🇬`);
    renderTreasury();
    if (typeof renderCashier === 'function') renderCashier();
    showToast('🗑️ تم حذف الحركة', 'info');
    closeModal();
}
