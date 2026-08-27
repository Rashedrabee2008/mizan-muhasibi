// ================================================================
// users.js - إدارة المستخدمين
// ================================================================

// ================================================================
// ADD USER
// ================================================================
function addUser() {
    if (!isAdmin()) { showToast('⚠️ المدير فقط يمكنه إضافة مستخدمين', 'error'); return; }
    const username = document.getElementById('newUsername')?.value?.trim();
    const role = document.getElementById('newUserRole')?.value;
    if (!username) { showToast('⚠️ أدخل اسم المستخدم', 'error'); return; }
    if (window.users.find(u => u.username === username)) {
        showToast('⚠️ المستخدم موجود', 'warning');
        return;
    }
    window.users.push({ id: Date.now(), username, role });
    saveUsers();
    renderUsers();
    populateUsersSelect();
    document.getElementById('newUsername').value = '';
    showToast('✅ تم إضافة المستخدم', 'success');
    addAuditLog('add', 'user', `إضافة مستخدم: ${username} (${role})`);
}

// ================================================================
// RENDER USERS
// ================================================================
function renderUsers() {
    if (!isAdmin()) {
        const container = document.getElementById('userList');
        if (container) container.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>المدير فقط يمكنه إدارة المستخدمين</span></div>`;
        return;
    }
    const container = document.getElementById('userList');
    if (!container) return;
    if (window.users.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا توجد مستخدمين</span></div>`;
        return;
    }
    const roles = { admin: 'مدير', manager: 'مشرف', cashier: 'كاشير', viewer: 'مشاهد' };
    const roleColors = { admin: '#2D8F5E', manager: '#C9A94E', cashier: '#4A8AB5', viewer: '#5D5D5D' };
    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;"><span>اسم المستخدم</span><span>الدور</span><span>الحالي</span><span></span></div>`;
    window.users.forEach(u => {
        const isCurrent = u.username === window.currentUser.username;
        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 1fr 0.8fr 0.6fr;font-size:12px;">
                <span><strong>${u.username}</strong></span>
                <span style="color:${roleColors[u.role]};font-weight:700;">${roles[u.role] || u.role}</span>
                <span>${isCurrent ? '✅' : ''}</span>
                <div class="actions">
                    ${u.username !== 'مدير' ? `
                        <button class="btn btn-warning btn-sm" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                    ` : '<span style="font-size:9px;color:#5D5D5D;">رئيسي</span>'}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    populateUsersSelect();
    updateUIByPermissions();
}

// ================================================================
// EDIT USER
// ================================================================
function editUser(id) {
    if (!isAdmin()) { showToast('⚠️ المدير فقط يمكنه التعديل', 'error'); return; }
    const u = window.users.find(user => user.id === id);
    if (!u) return;
    const html = `
        <div class="form-group"><label>اسم المستخدم</label><input type="text" id="editUsername" value="${u.username}" /></div>
        <div class="form-group"><label>الدور</label>
            <select id="editUserRole">
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>مدير</option>
                <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>مشرف</option>
                <option value="cashier" ${u.role === 'cashier' ? 'selected' : ''}>كاشير</option>
                <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>مشاهد</option>
            </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveUserEdit(${u.id})"><i class="fas fa-save"></i> حفظ</button>
    `;
    openModal('✏️ تعديل المستخدم', html);
}

function saveUserEdit(id) {
    if (!isAdmin()) { showToast('⚠️ المدير فقط يمكنه التعديل', 'error'); return; }
    const u = window.users.find(user => user.id === id);
    if (!u) return;
    const username = document.getElementById('editUsername')?.value?.trim();
    const role = document.getElementById('editUserRole')?.value;
    if (!username) { showToast('⚠️ أدخل اسم المستخدم', 'error'); return; }
    if (window.users.find(user => user.username === username && user.id !== id)) {
        showToast('⚠️ الاسم مستخدم', 'warning');
        return;
    }
    u.username = username;
    u.role = role;
    saveUsers();
    renderUsers();
    populateUsersSelect();
    closeModal();
    if (window.currentUser.username === u.username) {
        window.currentUser.role = role;
        localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));
        updateUIByPermissions();
    }
    showToast('✅ تم التعديل', 'success');
    addAuditLog('edit', 'user', `تعديل مستخدم: ${username}`);
}

// ================================================================
// DELETE USER
// ================================================================
function deleteUser(id) {
    if (!isAdmin()) { showToast('⚠️ المدير فقط يمكنه الحذف', 'error'); return; }
    if (!confirm('⚠️ حذف المستخدم؟')) return;
    const u = window.users.find(user => user.id === id);
    if (!u) return;
    if (u.username === 'مدير') { showToast('⚠️ لا يمكن حذف المدير الرئيسي', 'error'); return; }
    if (u.username === window.currentUser.username) {
        showToast('⚠️ لا يمكن حذف نفسك', 'error');
        return;
    }
    window.users = window.users.filter(user => user.id !== id);
    saveUsers();
    renderUsers();
    populateUsersSelect();
    showToast('🗑️ تم الحذف', 'info');
    addAuditLog('delete', 'user', `حذف مستخدم: ${u.username}`);
}

// ================================================================
// POPULATE USERS SELECT
// ================================================================
function populateUsersSelect() {
    const select = document.getElementById('switchUserSelect');
    if (!select) return;
    select.innerHTML = '<option value="">اختر مستخدم...</option>';
    window.users.forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.username} (${u.role})</option>`;
    });
    if (window.currentUser) {
        const current = window.users.find(u => u.username === window.currentUser.username);
        if (current) select.value = current.id;
    }
}

// ================================================================
// SWITCH USER
// ================================================================
function switchUser() {
    const select = document.getElementById('switchUserSelect');
    const userId = parseInt(select.value);
    if (!userId) return;
    const user = window.users.find(u => u.id === userId);
    if (!user) return;
    window.currentUser = { username: user.username, role: user.role };
    localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));
    updateUIByPermissions();
    renderUsers();
    showToast(`👤 تم التبديل إلى ${user.username} (${user.role})`, 'success');
    addAuditLog('edit', 'user', `تبديل المستخدم إلى: ${user.username}`);
    refreshAllPages();
}