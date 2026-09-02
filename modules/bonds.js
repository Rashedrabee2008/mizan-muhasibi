// ================================================================
// bonds.js - إدارة السندات
// ================================================================

// ================================================================
// INIT BONDS
// ================================================================
function initBonds() {
    if (!window.bonds || !Array.isArray(window.bonds)) {
        window.bonds = [];
        setData('bonds', window.bonds);
    }
}

// ================================================================
// ADD BOND
// ================================================================
function addBond() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    initBonds();
    
    const type = document.getElementById('bondType')?.value;
    const amount = parseFloat(document.getElementById('bondAmount')?.value);
    const customerId = document.getElementById('bondCustomer')?.value;
    const date = document.getElementById('bondDate')?.value || new Date().toISOString().split('T')[0];
    const dueDate = document.getElementById('bondDueDate')?.value;
    const note = document.getElementById('bondNote')?.value?.trim() || 'سند';

    if (isNaN(amount) || amount <= 0) { 
        showToast('⚠️ أدخل مبلغ صحيح', 'error'); 
        return; 
    }

    let customerName = 'غير محدد';
    if (customerId) {
        if (customerId.startsWith('s_')) {
            const supplierId = parseInt(customerId.replace('s_', ''));
            const supplier = window.suppliers?.find(s => s.id === supplierId);
            if (supplier) customerName = supplier.name + ' (مورد)';
        } else {
            const customer = window.customers?.find(c => c.id == customerId);
            if (customer) customerName = customer.name;
        }
    }

    const existing = window.bonds.find(b => 
        b.type === type && 
        b.customerId === customerId && 
        b.amount === amount && 
        b.date === date &&
        b.status === 'pending'
    );
    
    if (existing) {
        showToast('⚠️ يوجد سند مشابه معلق', 'warning');
        return;
    }

    window.bonds.push({
        id: Date.now(),
        type: type,
        amount: amount,
        customerId: customerId || null,
        customerName: customerName,
        date: date,
        dueDate: dueDate || '',
        note: note,
        status: 'pending',
        createdAt: new Date().toISOString()
    });

    saveAll();
    addAuditLog('add', 'bond', `إضافة سند ${type} - ${amount} للعميل ${customerName}`);
    renderBonds();
    
    document.getElementById('bondAmount').value = '';
    document.getElementById('bondNote').value = '';
    document.getElementById('bondCustomer').value = '';
    
    showToast('✅ تم إضافة السند', 'success');
}

// ================================================================
// RENDER BONDS
// ================================================================
function renderBonds() {
    const container = document.getElementById('bondList');
    if (!container) return;

    initBonds();

    if (window.bonds.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-file-signature"></i><span>لا توجد سندات</span></div>`;
        return;
    }

    // تحديث حالة السندات المتأخرة
    const today = new Date();
    window.bonds.forEach(b => {
        if (b.status === 'pending' && b.dueDate) {
            const due = new Date(b.dueDate);
            if (due < today) {
                b.status = 'overdue';
            }
        }
    });

    const canEditBonds = canEdit();
    const canDeleteBonds = canDelete();

    let html = `<div class="table-header" style="grid-template-columns:0.7fr 1.2fr 1fr 1fr 0.8fr 0.6fr 0.6fr;">
        <span>النوع</span><span>العميل/المورد</span><span>المبلغ</span><span>تاريخ الاستحقاق</span><span>الحالة</span><span>البيان</span><span></span>
    </div>`;

    window.bonds.slice().reverse().forEach(b => {
        const typeColor = b.type === 'تحصيل عميل' ? '#2D8F5E' : b.type === 'سداد مورد' ? '#E06060' : '#E6A830';
        const statusColor = b.status === 'paid' ? '#2D8F5E' : b.status === 'overdue' ? '#E06060' : '#E6A830';
        const statusText = b.status === 'paid' ? '✅ مدفوع' : b.status === 'overdue' ? '⏰ متأخر' : '⏳ معلق';

        html += `
            <div class="table-row" style="grid-template-columns:0.7fr 1.2fr 1fr 1fr 0.8fr 0.6fr 0.6fr;font-size:11px;">
                <span style="color:${typeColor};font-weight:700;">${b.type}</span>
                <span>${b.customerName || 'غير محدد'}</span>
                <span style="color:${typeColor};font-weight:700;">${b.amount.toFixed(2)}</span>
                <span style="font-size:10px;">${b.dueDate || '-'}</span>
                <span><span class="status-badge" style="background:${statusColor};color:#fff;">${statusText}</span></span>
                <span style="font-size:10px;color:#A89070;">${b.note || '-'}</span>
                <div class="actions">
                    ${b.status === 'pending' && canEditBonds ? `
                        <button class="btn btn-success btn-sm" onclick="markBondPaid(${b.id})" title="تسديد"><i class="fas fa-check"></i></button>
                    ` : ''}
                    ${canEditBonds ? `
                        <button class="btn btn-warning btn-sm" onclick="editBond(${b.id})"><i class="fas fa-edit"></i></button>
                    ` : ''}
                    ${canDeleteBonds ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteBond(${b.id})"><i class="fas fa-trash"></i></button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    renderBondStats();
}

// ================================================================
// RENDER BOND STATS
// ================================================================
function renderBondStats() {
    const container = document.getElementById('bondStats');
    if (!container) return;
    
    initBonds();
    
    const totalPending = window.bonds.filter(b => b.status === 'pending').reduce((s, b) => s + b.amount, 0);
    const totalOverdue = window.bonds.filter(b => b.status === 'overdue').reduce((s, b) => s + b.amount, 0);
    const totalPaid = window.bonds.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0);
    const totalAll = window.bonds.reduce((s, b) => s + b.amount, 0);
    
    container.innerHTML = `
        <div class="stats-row">
            <div class="stat-card"><div class="number" style="color:#E6A830;">${totalPending.toFixed(2)}</div><div class="label">⏳ معلق</div></div>
            <div class="stat-card"><div class="number" style="color:#E06060;">${totalOverdue.toFixed(2)}</div><div class="label">⏰ متأخر</div></div>
            <div class="stat-card"><div class="number" style="color:#2D8F5E;">${totalPaid.toFixed(2)}</div><div class="label">✅ مدفوع</div></div>
            <div class="stat-card"><div class="number" style="color:#C9A94E;">${totalAll.toFixed(2)}</div><div class="label">📊 الإجمالي</div></div>
        </div>
    `;
}

// ================================================================
// EDIT BOND
// ================================================================
function editBond(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    initBonds();
    const b = window.bonds.find(bond => bond.id === id);
    if (!b) { showToast('⚠️ السند غير موجود', 'error'); return; }

    const html = `
        <div class="form-row">
            <div class="form-group"><label>النوع</label>
                <select id="editBondType">
                    <option value="تحصيل عميل" ${b.type === 'تحصيل عميل' ? 'selected' : ''}>تحصيل عميل</option>
                    <option value="سداد مورد" ${b.type === 'سداد مورد' ? 'selected' : ''}>سداد مورد</option>
                    <option value="تسوية ضغط" ${b.type === 'تسوية ضغط' ? 'selected' : ''}>تسوية ضغط</option>
                </select>
            </div>
            <div class="form-group"><label>المبلغ</label><input type="number" id="editBondAmount" value="${b.amount}" min="0.01" step="0.01" /></div>
        </div>
        <div class="form-group"><label>العميل / المورد</label>
            <select id="editBondCustomer">
                <option value="">اختر...</option>
                ${window.customers ? window.customers.map(c => `<option value="${c.id}" ${c.id == b.customerId ? 'selected' : ''}>${c.name}</option>`).join('') : ''}
                ${window.suppliers ? window.suppliers.map(s => `<option value="s_${s.id}" ${'s_'+s.id == b.customerId ? 'selected' : ''}>${s.name} (مورد)</option>`).join('') : ''}
            </select>
        </div>
        <div class="form-row">
            <div class="form-group"><label>التاريخ</label><input type="date" id="editBondDate" value="${b.date}" /></div>
            <div class="form-group"><label>تاريخ الاستحقاق</label><input type="date" id="editBondDueDate" value="${b.dueDate || ''}" /></div>
        </div>
        <div class="form-group"><label>البيان</label><input type="text" id="editBondNote" value="${b.note}" /></div>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <button class="btn btn-primary btn-block" onclick="saveBondEdit(${b.id})"><i class="fas fa-save"></i> حفظ</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إلغاء</button>
        </div>
    `;
    openModal('✏️ تعديل السند', html);
}

// ================================================================
// SAVE BOND EDIT
// ================================================================
function saveBondEdit(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    initBonds();
    const b = window.bonds.find(bond => bond.id === id);
    if (!b) return;

    const type = document.getElementById('editBondType')?.value;
    const amount = parseFloat(document.getElementById('editBondAmount')?.value);
    const customerId = document.getElementById('editBondCustomer')?.value;
    const date = document.getElementById('editBondDate')?.value;
    const dueDate = document.getElementById('editBondDueDate')?.value;
    const note = document.getElementById('editBondNote')?.value?.trim();

    if (isNaN(amount) || amount <= 0) { showToast('⚠️ مبلغ صحيح', 'error'); return; }

    let customerName = 'غير محدد';
    if (customerId) {
        if (customerId.startsWith('s_')) {
            const supplierId = parseInt(customerId.replace('s_', ''));
            const supplier = window.suppliers?.find(s => s.id === supplierId);
            if (supplier) customerName = supplier.name + ' (مورد)';
        } else {
            const customer = window.customers?.find(c => c.id == customerId);
            if (customer) customerName = customer.name;
        }
    }

    b.type = type;
    b.amount = amount;
    b.customerId = customerId || null;
    b.customerName = customerName;
    b.date = date || b.date;
    b.dueDate = dueDate || '';
    b.note = note || b.note;

    saveAll();
    addAuditLog('edit', 'bond', `تعديل سند - ${type} - ${amount}`);
    renderBonds();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

// ================================================================
// MARK BOND PAID
// ================================================================
function markBondPaid(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    initBonds();
    const b = window.bonds.find(bond => bond.id === id);
    if (!b) { showToast('⚠️ السند غير موجود', 'error'); return; }
    
    if (b.status === 'paid') {
        showToast('⚠️ السند مدفوع بالفعل', 'warning');
        return;
    }
    
    if (!confirm(`✅ تأكيد تسديد سند ${b.type} - ${b.amount.toFixed(2)} للعميل ${b.customerName}؟`)) return;
    
    b.status = 'paid';
    b.paidAt = new Date().toISOString();
    
    if (!window.treasury) window.treasury = [];
    window.treasury.push({
        id: Date.now(),
        type: b.type === 'تحصيل عميل' ? 'deposit' : 'withdraw',
        amount: b.amount,
        method: 'نقدي',
        note: `تسديد سند: ${b.type} - ${b.note || ''}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar'),
        bondId: b.id
    });
    
    saveAll();
    addAuditLog('edit', 'bond', `تسديد سند - ${b.type} - ${b.amount}`);
    renderBonds();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof renderCashier === 'function') renderCashier();
    showToast(`✅ تم تسديد السند - ${b.amount.toFixed(2)}`, 'success');
    
    addAlert(`💰 تم تسديد سند`, `${b.type} - ${b.amount.toFixed(2)} للعميل ${b.customerName}`, 'success');
}

// ================================================================
// DELETE BOND
// ================================================================
function deleteBond(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف السند؟')) return;

    initBonds();
    const b = window.bonds.find(bond => bond.id === id);
    if (!b) { showToast('⚠️ السند غير موجود', 'error'); return; }
    
    if (b.status === 'paid') {
        const treasuryIdx = window.treasury?.findIndex(t => t.bondId === id) || -1;
        if (treasuryIdx > -1) {
            window.treasury.splice(treasuryIdx, 1);
        }
    }

    window.bonds = window.bonds.filter(bond => bond.id !== id);
    saveAll();
    addAuditLog('delete', 'bond', `حذف سند - ${b.type} - ${b.amount}`);
    renderBonds();
    if (typeof renderTreasury === 'function') renderTreasury();
    showToast('🗑️ تم حذف السند', 'info');
    closeModal();
}
