// ================================================================
// users.js - إدارة المستخدمين
// ================================================================

// ================================================================
// INIT USERS
// ================================================================
function initUsers() {
    if (!window.users || !Array.isArray(window.users) || window.users.length === 0) {
        window.users = [
            { id: 1, username: 'مدير', role: 'admin', password: '123456' },
            { id: 2, username: 'مشرف', role: 'manager', password: '123456' },
            { id: 3, username: 'كاشير', role: 'cashier', password: '123456' },
            { id: 4, username: 'مشاهد', role: 'viewer', password: '123456' }
        ];
        localStorage.setItem('mizan_users', JSON.stringify(window.users));
    }

    window.users = window.users.filter(u => u && typeof u === 'object' && u.username);

    if (!window.currentUser || typeof window.currentUser !== 'object') {
        window.currentUser = { username: 'مدير', role: 'admin' };
        localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));
    }
}

// ================================================================
// ADD USER
// ================================================================
function addUser() {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه إضافة مستخدمين', 'error');
        return;
    }

    const username = document.getElementById('newUsername')?.value?.trim();
    const password = document.getElementById('newUserPassword')?.value?.trim();
    const role = document.getElementById('newUserRole')?.value;

    if (!username) {
        showToast('⚠️ أدخل اسم المستخدم', 'error');
        return;
    }
    if (!password || password.length < 4) {
        showToast('⚠️ كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error');
        return;
    }

    if (!window.users || !Array.isArray(window.users)) {
        window.users = [];
    }

    if (window.users.find(u => u?.username === username)) {
        showToast('⚠️ المستخدم موجود', 'warning');
        return;
    }

    window.users.push({
        id: Date.now(),
        username: username,
        role: role,
        password: password,
        createdAt: new Date().toISOString()
    });

    saveUsers();
    renderUsers();
    populateUsersSelect();
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    showToast('✅ تم إضافة المستخدم', 'success');
    addAuditLog('add', 'user', `إضافة مستخدم: ${username} (${role})`);
}

// ================================================================
// RENDER USERS
// ================================================================
function renderUsers() {
    if (!isAdmin()) {
        const container = document.getElementById('userList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><span>المدير فقط يمكنه إدارة المستخدمين</span></div>`;
        }
        return;
    }

    const container = document.getElementById('userList');
    if (!container) return;

    if (!window.users || !Array.isArray(window.users) || window.users.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا توجد مستخدمين</span></div>`;
        return;
    }

    window.users = window.users.filter(u => u && typeof u === 'object' && u.username);

    const total = window.users.length;
    const admins = window.users.filter(u => u.role === 'admin').length;
    const cashiers = window.users.filter(u => u.role === 'cashier').length;

    safeSetText('usersTotalCount', total);
    safeSetText('usersAdminCount', admins);
    safeSetText('usersCashierCount', cashiers);

    if (window.users.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><span>لا توجد مستخدمين صالحين</span></div>`;
        return;
    }

    const roles = {
        admin: '👑 مدير',
        manager: '📊 مشرف',
        cashier: '💰 كاشير',
        viewer: '👁️ مشاهد'
    };

    const roleColors = {
        admin: '#2D8F5E',
        manager: '#C9A94E',
        cashier: '#4A8AB5',
        viewer: '#5D5D5D'
    };

    let html = `<div class="table-header" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.6fr;">
        <span>اسم المستخدم</span>
        <span>الدور</span>
        <span>الحالي</span>
        <span>تاريخ الإضافة</span>
        <span></span>
    </div>`;

    for (let i = 0; i < window.users.length; i++) {
        const u = window.users[i];

        if (!u || typeof u !== 'object' || !u.username) {
            console.warn('⚠️ عنصر مستخدم غير صالح، تم تخطيه:', u);
            continue;
        }

        const isCurrent = u.username === window.currentUser?.username;
        const roleName = roles[u.role] || u.role || 'غير محدد';
        const roleColor = roleColors[u.role] || '#5D5D5D';
        const isMainAdmin = u.username === 'مدير';
        const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar') : '-';

        html += `
            <div class="table-row" style="grid-template-columns:1.2fr 0.8fr 0.8fr 1fr 0.6fr;font-size:12px;">
                <span><strong>${u.username}</strong></span>
                <span style="color:${roleColor};font-weight:700;">${roleName}</span>
                <span>${isCurrent ? '✅' : ''}</span>
                <span style="font-size:10px;color:#A89070;">${createdAt}</span>
                <div class="actions">
                    ${!isMainAdmin || isCurrent ? `
                        <button class="btn btn-warning btn-sm" onclick="editUser(${u.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    ${!isMainAdmin ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                    ${isMainAdmin ? '<span style="font-size:9px;color:#C9A94E;">👑 رئيسي</span>' : ''}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
    populateUsersSelect();
    updateUIByPermissions();
}

// ================================================================
// EDIT USER
// ================================================================
function editUser(id) {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه التعديل', 'error');
        return;
    }

    if (!window.users || !Array.isArray(window.users)) {
        window.users = [];
        return;
    }

    const u = window.users.find(user => user?.id === id);
    if (!u) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    const isCurrent = u.username === window.currentUser?.username;
    const isMainAdmin = u.username === 'مدير';

    let html = `
        <div class="form-group">
            <label>👤 اسم المستخدم</label>
            <input type="text" id="editUsername" value="${u.username}" />
        </div>
        <div class="form-group">
            <label>🔑 كلمة المرور (اترك فارغاً للحفاظ على الحالية)</label>
            <input type="password" id="editUserPassword" placeholder="أدخل كلمة مرور جديدة" />
        </div>
        <div class="form-group">
            <label>📋 الدور</label>
            <select id="editUserRole">
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>👑 مدير</option>
                <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>📊 مشرف</option>
                <option value="cashier" ${u.role === 'cashier' ? 'selected' : ''}>💰 كاشير</option>
                <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>👁️ مشاهد</option>
            </select>
        </div>
        ${isCurrent && !isMainAdmin ? `
            <div style="padding:8px;background:#E6A83020;border-radius:6px;border:1px solid #E6A830;margin-bottom:8px;">
                <span style="color:#E6A830;font-size:12px;">⚠️ أنت تعدل المستخدم الحالي، تغيير الدور قد يؤثر على صلاحياتك</span>
            </div>
        ` : ''}
        <button class="btn btn-primary btn-block" onclick="saveUserEdit(${u.id})">
            <i class="fas fa-save"></i> حفظ
        </button>
        ${!isMainAdmin ? `
            <button class="btn btn-danger btn-block" onclick="deleteUser(${u.id})" style="margin-top:6px;">
                <i class="fas fa-trash"></i> حذف المستخدم
            </button>
        ` : ''}
    `;
    openModal('✏️ تعديل المستخدم', html);
}

// ================================================================
// SAVE USER EDIT
// ================================================================
function saveUserEdit(id) {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه التعديل', 'error');
        return;
    }

    if (!window.users || !Array.isArray(window.users)) {
        window.users = [];
        return;
    }

    const u = window.users.find(user => user?.id === id);
    if (!u) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    const username = document.getElementById('editUsername')?.value?.trim();
    const password = document.getElementById('editUserPassword')?.value?.trim();
    const role = document.getElementById('editUserRole')?.value;

    if (!username) {
        showToast('⚠️ أدخل اسم المستخدم', 'error');
        return;
    }

    const duplicate = window.users.find(user =>
        user?.username === username && user?.id !== id
    );

    if (duplicate) {
        showToast('⚠️ الاسم مستخدم', 'warning');
        return;
    }

    u.username = username;
    u.role = role;

    if (password && password.length >= 4) {
        u.password = password;
        if (u.username === window.currentUser?.username) {
            currentPassword = password;
            localStorage.setItem('app_password', password);
            showToast('🔑 تم تغيير كلمة المرور', 'success');
        }
    }

    saveUsers();
    renderUsers();
    populateUsersSelect();
    closeModal();

    if (window.currentUser?.username === u.username) {
        window.currentUser.role = role;
        localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));
        updateUIByPermissions();
    }

    showToast('✅ تم التعديل', 'success');
    addAuditLog('edit', 'user', `تعديل مستخدم: ${username}`);
}

// ================================================================
// CHANGE USER PASSWORD
// ================================================================
function changeUserPassword() {
    const oldPassword = document.getElementById('changeOldPassword')?.value?.trim();
    const newPassword = document.getElementById('changeNewPassword')?.value?.trim();
    const confirmPassword = document.getElementById('changeConfirmPassword')?.value?.trim();

    if (!oldPassword) {
        showToast('⚠️ أدخل كلمة المرور الحالية', 'error');
        return;
    }

    if (!newPassword || newPassword.length < 4) {
        showToast('⚠️ كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('⚠️ كلمة المرور غير مطابقة', 'error');
        return;
    }

    const currentUser = window.users.find(u => u.username === window.currentUser?.username);
    if (!currentUser) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    if (currentUser.password && currentUser.password !== oldPassword) {
        showToast('⚠️ كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }

    currentUser.password = newPassword;
    currentPassword = newPassword;
    localStorage.setItem('app_password', newPassword);
    saveUsers();

    document.getElementById('changeOldPassword').value = '';
    document.getElementById('changeNewPassword').value = '';
    document.getElementById('changeConfirmPassword').value = '';

    showToast('✅ تم تغيير كلمة المرور بنجاح', 'success');
    addAuditLog('edit', 'user', `تغيير كلمة المرور للمستخدم: ${currentUser.username}`);
}

// ================================================================
// DELETE USER
// ================================================================
function deleteUser(id) {
    if (!isAdmin()) {
        showToast('⚠️ المدير فقط يمكنه الحذف', 'error');
        return;
    }

    if (!confirm('⚠️ حذف المستخدم نهائياً؟')) return;

    if (!window.users || !Array.isArray(window.users)) {
        window.users = [];
        return;
    }

    const u = window.users.find(user => user?.id === id);
    if (!u) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    if (u.username === 'مدير') {
        showToast('⚠️ لا يمكن حذف المدير الرئيسي', 'error');
        return;
    }

    if (window.currentUser?.username === u.username) {
        showToast('⚠️ لا يمكن حذف نفسك', 'error');
        return;
    }

    window.users = window.users.filter(user => user?.id !== id);
    saveUsers();
    renderUsers();
    populateUsersSelect();
    showToast(`🗑️ تم حذف المستخدم: ${u.username}`, 'info');
    addAuditLog('delete', 'user', `حذف مستخدم: ${u.username}`);
    closeModal();
}

// ================================================================
// POPULATE USERS SELECT
// ================================================================
function populateUsersSelect() {
    const select = document.getElementById('switchUserSelect');
    if (!select) return;

    select.innerHTML = '<option value="">اختر مستخدم...</option>';

    if (!window.users || !Array.isArray(window.users) || window.users.length === 0) {
        return;
    }

    const validUsers = window.users.filter(u => u && typeof u === 'object' && u.username);

    for (let i = 0; i < validUsers.length; i++) {
        const u = validUsers[i];
        const roleNames = { admin: 'مدير', manager: 'مشرف', cashier: 'كاشير', viewer: 'مشاهد' };
        select.innerHTML += `<option value="${u.id}">${u.username} (${roleNames[u.role] || u.role})</option>`;
    }

    if (window.currentUser?.username) {
        const current = validUsers.find(u => u.username === window.currentUser.username);
        if (current) select.value = current.id;
    }
}

// ================================================================
// SWITCH USER
// ================================================================
function switchUser() {
    const select = document.getElementById('switchUserSelect');
    if (!select) return;

    const userId = parseInt(select.value);
    if (!userId) return;

    if (!window.users || !Array.isArray(window.users)) {
        window.users = [];
        return;
    }

    const user = window.users.find(u => u?.id === userId);
    if (!user) {
        showToast('⚠️ المستخدم غير موجود', 'error');
        return;
    }

    window.currentUser = {
        username: user.username,
        role: user.role
    };

    localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));
    localStorage.setItem('app_password', user.password || '123456');
    currentPassword = user.password || '123456';

    updateUIByPermissions();
    renderUsers();
    showToast(`👤 تم التبديل إلى ${user.username} (${user.role})`, 'success');
    addAuditLog('edit', 'user', `تبديل المستخدم إلى: ${user.username}`);
    refreshAllPages();
}

// ================================================================
// SAVE USERS
// ================================================================
function saveUsers() {
    try {
        if (window.users && Array.isArray(window.users)) {
            window.users = window.users.filter(u => u && typeof u === 'object' && u.username);
        } else {
            window.users = [];
        }

        localStorage.setItem('mizan_users', JSON.stringify(window.users));
        localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));

        const currentUser = window.users.find(u => u.username === window.currentUser?.username);
        if (currentUser?.password) {
            localStorage.setItem('app_password', currentUser.password);
            currentPassword = currentUser.password;
        }
    } catch (e) {
        console.warn('⚠️ خطأ في حفظ المستخدمين:', e);
    }
}
