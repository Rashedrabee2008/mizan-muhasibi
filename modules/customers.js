// ================================================================
// customers.js - إدارة العملاء
// ================================================================

// ================================================================
// ADD CUSTOMER
// ================================================================
function addCustomer() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const name = document.getElementById('customerName')?.value?.trim();
    const phone = document.getElementById('customerPhone')?.value?.trim();
    const whatsapp = document.getElementById('customerWhatsapp')?.value?.trim() || '';
    const email = document.getElementById('customerEmail')?.value?.trim();
    const address = document.getElementById('customerAddress')?.value?.trim();

    if (!name) { showToast('⚠️ أدخل اسم العميل', 'error'); return; }
    if (window.customers.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ العميل موجود', 'warning');
        return;
    }

    window.customers.push({ id: Date.now(), name: name, phone: phone, whatsapp: whatsapp, email: email, address: address, active: true });
    saveAll();
    addAuditLog('add', 'customer', `إضافة عميل: ${name} - واتساب: ${whatsapp || 'لا يوجد'}`);
    renderCustomers();
    populateAllSelects();
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerWhatsapp').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerAddress').value = '';
    showToast('✅ تم إضافة العميل', 'success');
    updateDashboard();
}

// ================================================================
// RENDER CUSTOMERS
// ================================================================
function renderCustomers() {
    safeSetText('customersCount', window.customers.length);
    safeSetText('activeCustomers', window.customers.filter(c => c.active !== false).length);

    const container = document.getElementById('customerList');
    if (!container) return;

    if (window.customers.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا توجد عملاء</span></div>`;
        return;
    }

    const canEditCustomers = canEdit();
    const canDeleteCustomers = canDelete();

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 1.2fr 1.2fr 0.8fr 0.6fr;"><span>الاسم</span><span>الهاتف</span><span>واتساب</span><span>البريد</span><span>الحالة</span><span></span></div>`;

    window.customers.forEach(c => {
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 1.2fr 1.2fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${c.name}</strong></span>
                <span>${c.phone || '-'}</span>
                <span style="color:#25D366;font-weight:700;">${c.whatsapp || '-'}</span>
                <span>${c.email || '-'}</span>
                <span><span class="status-badge ${c.active !== false ? 'active' : 'inactive'}">${c.active !== false ? 'نشط' : 'غير نشط'}</span></span>
                <div class="actions">
                    ${canEditCustomers ? `<button class="btn btn-warning btn-sm" onclick="editCustomer(${c.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteCustomers ? `<button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// EDIT CUSTOMER
// ================================================================
function editCustomer(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const c = window.customers.find(cust => cust.id === id);
    if (!c) return;

    const html = `
        <div class="form-group"><label>الاسم</label><input type="text" id="editCustomerName" value="${c.name}" /></div>
        <div class="form-row">
            <div class="form-group"><label>الهاتف</label><input type="text" id="editCustomerPhone" value="${c.phone || ''}" /></div>
            <div class="form-group"><label>📱 واتساب</label><input type="text" id="editCustomerWhatsapp" value="${c.whatsapp || ''}" /></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>البريد</label><input type="email" id="editCustomerEmail" value="${c.email || ''}" /></div>
            <div class="form-group"><label>العنوان</label><input type="text" id="editCustomerAddress" value="${c.address || ''}" /></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveCustomerEdit(${c.id})"><i class="fas fa-save"></i> حفظ</button>
        ${canDelete() ? `<button class="btn btn-danger btn-block" onclick="deleteCustomer(${c.id})" style="margin-top:6px;"><i class="fas fa-trash"></i> حذف</button>` : ''}
    `;
    openModal('✏️ تعديل العميل', html);
}

function saveCustomerEdit(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const c = window.customers.find(cust => cust.id === id);
    if (!c) return;

    const name = document.getElementById('editCustomerName')?.value?.trim();
    const phone = document.getElementById('editCustomerPhone')?.value?.trim();
    const whatsapp = document.getElementById('editCustomerWhatsapp')?.value?.trim() || '';
    const email = document.getElementById('editCustomerEmail')?.value?.trim();
    const address = document.getElementById('editCustomerAddress')?.value?.trim();

    if (!name) { showToast('⚠️ أدخل الاسم', 'error'); return; }

    c.name = name;
    c.phone = phone;
    c.whatsapp = whatsapp;
    c.email = email;
    c.address = address;

    saveAll();
    addAuditLog('edit', 'customer', `تعديل عميل: ${name} - واتساب: ${whatsapp || 'لا يوجد'}`);
    renderCustomers();
    populateAllSelects();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

// ================================================================
// DELETE CUSTOMER
// ================================================================
function deleteCustomer(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف العميل؟')) return;

    const c = window.customers.find(cust => cust.id === id);
    window.customers = window.customers.filter(c => c.id !== id);

    saveAll();
    if (c) addAuditLog('delete', 'customer', `حذف عميل: ${c.name}`);
    renderCustomers();
    populateAllSelects();
    showToast('🗑️ تم الحذف', 'info');
    updateDashboard();
    closeModal();
}

// ================================================================
// QUICK ADD CUSTOMER
// ================================================================
function openAddCustomerModal() {
    const html = `
        <div style="background:#0D0D0D;border-radius:10px;padding:10px;border:1px solid #2D2D2D;">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:8px;">➕ إضافة عميل جديد</h4>
            <div class="form-group"><label>الاسم</label><input type="text" id="quickCustomerName" placeholder="مثال: أحمد" /></div>
            <div class="form-row">
                <div class="form-group"><label>الهاتف</label><input type="text" id="quickCustomerPhone" placeholder="01234567890" /></div>
                <div class="form-group"><label>📱 واتساب</label><input type="text" id="quickCustomerWhatsapp" placeholder="رقم واتساب" /></div>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="btn btn-primary btn-block" onclick="saveQuickCustomer()"><i class="fas fa-save"></i> حفظ</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إلغاء</button>
            </div>
        </div>
    `;
    openModal('➕ إضافة عميل جديد', html);
}

function saveQuickCustomer() {
    const name = document.getElementById('quickCustomerName')?.value?.trim();
    const phone = document.getElementById('quickCustomerPhone')?.value?.trim();
    const whatsapp = document.getElementById('quickCustomerWhatsapp')?.value?.trim() || '';

    if (!name) { showToast('⚠️ أدخل اسم العميل', 'error'); return; }
    if (window.customers.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ العميل موجود', 'warning');
        return;
    }

    window.customers.push({ id: Date.now(), name: name, phone: phone, whatsapp: whatsapp, email: '', address: '', active: true });
    saveAll();
    addAuditLog('add', 'customer', `إضافة عميل سريع: ${name}`);
    renderCustomers();
    populateAllSelects();
    closeModal();

    const select = document.getElementById('salesCustomerSelect');
    if (select) {
        select.innerHTML = '<option value="">اختر عميل...</option>';
        window.customers.forEach(c => {
            select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
        select.value = name;
        if (typeof updateCustomerWhatsApp === 'function') updateCustomerWhatsApp();
    }
    const input = document.getElementById('salesCustomer');
    if (input) input.value = name;

    showToast(`✅ تم إضافة العميل ${name}`, 'success');
    updateDashboard();
}