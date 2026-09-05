// ================================================================
// suppliers.js - إدارة الموردين
// ================================================================

// ================================================================
// ADD SUPPLIER
// ================================================================
function addSupplier() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const name = document.getElementById('supplierName')?.value?.trim();
    const phone = document.getElementById('supplierPhone')?.value?.trim();
    const whatsapp = document.getElementById('supplierWhatsapp')?.value?.trim() || '';
    const email = document.getElementById('supplierEmail')?.value?.trim();
    const address = document.getElementById('supplierAddress')?.value?.trim();

    if (!name) { showToast('⚠️ أدخل اسم المورد', 'error'); return; }
    if (window.suppliers.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ المورد موجود', 'warning');
        return;
    }

    window.suppliers.push({ id: Date.now(), name: name, phone: phone, whatsapp: whatsapp, email: email, address: address, active: true });
    saveAll();
    addAuditLog('add', 'supplier', `إضافة مورد: ${name} - واتساب: ${whatsapp || 'لا يوجد'}`);
    renderSuppliers();
    populateAllSelects();
    document.getElementById('supplierName').value = '';
    document.getElementById('supplierPhone').value = '';
    document.getElementById('supplierWhatsapp').value = '';
    document.getElementById('supplierEmail').value = '';
    document.getElementById('supplierAddress').value = '';
    showToast('✅ تم إضافة المورد', 'success');
}

// ================================================================
// RENDER SUPPLIERS
// ================================================================
function renderSuppliers() {
    safeSetText('suppliersCount', window.suppliers.length);
    safeSetText('activeSuppliers', window.suppliers.filter(s => s.active !== false).length);

    const container = document.getElementById('supplierList');
    if (!container) return;

    if (window.suppliers.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><span>لا توجد موردين</span></div>`;
        return;
    }

    const canEditSuppliers = canEdit();
    const canDeleteSuppliers = canDelete();

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 1fr 1.2fr 1.2fr 0.8fr 0.6fr;"><span>الاسم</span><span>الهاتف</span><span>واتساب</span><span>البريد</span><span>الحالة</span><span></span></div>`;

    window.suppliers.forEach(s => {
        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 1fr 1.2fr 1.2fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${s.name}</strong></span>
                <span>${s.phone || '-'}</span>
                <span style="color:#25D366;font-weight:700;">${s.whatsapp || '-'}</span>
                <span>${s.email || '-'}</span>
                <span><span class="status-badge ${s.active !== false ? 'active' : 'inactive'}">${s.active !== false ? 'نشط' : 'غير نشط'}</span></span>
                <div class="actions">
                    ${canEditSuppliers ? `<button class="btn btn-warning btn-sm" onclick="editSupplier(${s.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteSuppliers ? `<button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// EDIT SUPPLIER
// ================================================================
function editSupplier(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const s = window.suppliers.find(sup => sup.id === id);
    if (!s) return;

    const html = `
        <div class="form-group"><label>الاسم</label><input type="text" id="editSupplierName" value="${s.name}" /></div>
        <div class="form-row">
            <div class="form-group"><label>الهاتف</label><input type="text" id="editSupplierPhone" value="${s.phone || ''}" /></div>
            <div class="form-group"><label>📱 واتساب</label><input type="text" id="editSupplierWhatsapp" value="${s.whatsapp || ''}" /></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>البريد</label><input type="email" id="editSupplierEmail" value="${s.email || ''}" /></div>
            <div class="form-group"><label>العنوان</label><input type="text" id="editSupplierAddress" value="${s.address || ''}" /></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveSupplierEdit(${s.id})"><i class="fas fa-save"></i> حفظ</button>
        ${canDelete() ? `<button class="btn btn-danger btn-block" onclick="deleteSupplier(${s.id})" style="margin-top:6px;"><i class="fas fa-trash"></i> حذف</button>` : ''}
    `;
    openModal('✏️ تعديل المورد', html);
}

function saveSupplierEdit(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const s = window.suppliers.find(sup => sup.id === id);
    if (!s) return;

    const name = document.getElementById('editSupplierName')?.value?.trim();
    const phone = document.getElementById('editSupplierPhone')?.value?.trim();
    const whatsapp = document.getElementById('editSupplierWhatsapp')?.value?.trim() || '';
    const email = document.getElementById('editSupplierEmail')?.value?.trim();
    const address = document.getElementById('editSupplierAddress')?.value?.trim();

    if (!name) { showToast('⚠️ أدخل الاسم', 'error'); return; }

    s.name = name;
    s.phone = phone;
    s.whatsapp = whatsapp;
    s.email = email;
    s.address = address;

    saveAll();
    addAuditLog('edit', 'supplier', `تعديل مورد: ${name} - واتساب: ${whatsapp || 'لا يوجد'}`);
    renderSuppliers();
    populateAllSelects();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

// ================================================================
// DELETE SUPPLIER
// ================================================================
function deleteSupplier(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المورد؟')) return;

    const s = window.suppliers.find(sup => sup.id === id);
    window.suppliers = window.suppliers.filter(s => s.id !== id);

    saveAll();
    if (s) addAuditLog('delete', 'supplier', `حذف مورد: ${s.name}`);
    renderSuppliers();
    populateAllSelects();
    showToast('🗑️ تم الحذف', 'info');
    closeModal();
}

// ================================================================
// QUICK ADD SUPPLIER
// ================================================================
function openAddSupplierModal() {
    const html = `
        <div style="background:#0D0D0D;border-radius:10px;padding:10px;border:1px solid #2D2D2D;">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:8px;">➕ إضافة مورد جديد</h4>
            <div class="form-group"><label>الاسم</label><input type="text" id="quickSupplierName" placeholder="مثال: شركة الاتصالات" /></div>
            <div class="form-row">
                <div class="form-group"><label>الهاتف</label><input type="text" id="quickSupplierPhone" placeholder="0234567890" /></div>
                <div class="form-group"><label>📱 واتساب</label><input type="text" id="quickSupplierWhatsapp" placeholder="رقم واتساب" /></div>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="btn btn-primary btn-block" onclick="saveQuickSupplier()"><i class="fas fa-save"></i> حفظ</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إلغاء</button>
            </div>
        </div>
    `;
    openModal('➕ إضافة مورد جديد', html);
}

function saveQuickSupplier() {
    const name = document.getElementById('quickSupplierName')?.value?.trim();
    const phone = document.getElementById('quickSupplierPhone')?.value?.trim();
    const whatsapp = document.getElementById('quickSupplierWhatsapp')?.value?.trim() || '';

    if (!name) { showToast('⚠️ أدخل اسم المورد', 'error'); return; }
    if (window.suppliers.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ المورد موجود', 'warning');
        return;
    }

    window.suppliers.push({ id: Date.now(), name: name, phone: phone, whatsapp: whatsapp, email: '', address: '', active: true });
    saveAll();
    addAuditLog('add', 'supplier', `إضافة مورد سريع: ${name}`);
    renderSuppliers();
    populateAllSelects();
    closeModal();

    const select = document.getElementById('purchaseSupplierSelect');
    if (select) {
        select.innerHTML = '<option value="">اختر مورد...</option>';
        window.suppliers.forEach(s => {
            select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
        select.value = name;
        if (typeof updateSupplierWhatsApp === 'function') updateSupplierWhatsApp();
    }
    const input = document.getElementById('purchaseSupplier');
    if (input) input.value = name;

    showToast(`✅ تم إضافة المورد ${name}`, 'success');
}