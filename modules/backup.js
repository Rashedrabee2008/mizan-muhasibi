// ================================================================
// backup.js - النسخ الاحتياطي
// ================================================================

// ================================================================
// CREATE BACKUP
// ================================================================
function createBackup() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const data = getBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    a.download = `mizan_backup_${date}_${time}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const backup = { id: Date.now(), name: `mizan_backup_${date}_${time}.json`, date: date, time: time, size: blob.size, auto: false };
    
    if (!window.backups || !Array.isArray(window.backups)) {
        window.backups = [];
    }
    window.backups.push(backup);
    if (window.backups.length > 20) {
        const sorted = window.backups.sort((a, b) => b.id - a.id);
        window.backups = sorted.slice(0, 20);
    }
    setData('backups', window.backups);
    renderBackups();
    addAuditLog('add', 'backup', 'إنشاء نسخة احتياطية');
    showToast('✅ تم إنشاء النسخة', 'success');
}

// ================================================================
// RENDER BACKUPS
// ================================================================
function renderBackups() {
    const container = document.getElementById('backupList');
    if (!container) return;

    if (!window.backups || window.backups.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><span>لا توجد نسخ</span></div>`;
        return;
    }

    const canDeleteBackups = canDelete();

    let html = '';
    window.backups.slice().reverse().forEach(b => {
        const sizeKB = (b.size / 1024).toFixed(1);
        html += `
            <div class="backup-item">
                <div class="info">
                    <div class="name">${b.name} ${b.auto ? '🤖 تلقائي' : ''}</div>
                    <div class="date">${b.date} ${b.time || ''}</div>
                </div>
                <div class="size">${sizeKB} KB</div>
                <div class="actions">
                    <button class="btn btn-info btn-sm" onclick="downloadBackup(${b.id})" title="تحميل"><i class="fas fa-download"></i></button>
                    ${canDeleteBackups ? `<button class="btn btn-danger btn-sm" onclick="deleteBackup(${b.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// DOWNLOAD BACKUP
// ================================================================
function downloadBackup(id) {
    const b = window.backups.find(back => back.id === id);
    if (!b) { showToast('⚠️ النسخة غير موجودة', 'error'); return; }
    
    const data = getBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = b.name;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 تم تحميل النسخة', 'success');
}

// ================================================================
// DELETE BACKUP
// ================================================================
function deleteBackup(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف النسخة؟')) return;

    window.backups = window.backups.filter(b => b.id !== id);
    setData('backups', window.backups);
    renderBackups();
    showToast('🗑️ تم الحذف', 'info');
}

// ================================================================
// RESTORE BACKUP
// ================================================================
function restoreBackup(event) {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.products && !data.customers && !data.sales) {
                showToast('❌ ملف غير صالح: لا يحتوي على بيانات', 'error');
                return;
            }
            if (confirm(`✅ استعادة البيانات من ${file.name}؟ سيتم استبدال البيانات الحالية`)) {
                restoreBackupData(data);
                showToast('📥 تم الاستعادة', 'success');
            }
        } catch (err) {
            showToast('❌ ملف غير صالح: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ================================================================
// CREATE AUTO BACKUP
// ================================================================
function createAutoBackup() {
    const data = getBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const date = new Date().toISOString().split('T')[0];
    const backup = {
        id: Date.now(),
        name: `auto_${date}`,
        date: date,
        time: new Date().toISOString().split('T')[1].split('.')[0],
        size: blob.size,
        auto: true
    };
    
    if (!window.backups || !Array.isArray(window.backups)) {
        window.backups = [];
    }
    
    // إزالة النسخ التلقائية القديمة (احتفاظ بآخر 5 فقط)
    const autoBackups = window.backups.filter(b => b.auto);
    if (autoBackups.length >= 5) {
        const sorted = autoBackups.sort((a, b) => a.id - b.id);
        const toRemove = sorted.slice(0, autoBackups.length - 4);
        window.backups = window.backups.filter(b => !toRemove.includes(b));
    }
    
    window.backups.push(backup);
    if (window.backups.length > 15) {
        const sorted = window.backups.sort((a, b) => b.id - a.id);
        window.backups = sorted.slice(0, 15);
    }
    setData('backups', window.backups);
    renderBackups();
}
