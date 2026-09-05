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
    a.download = `mizan_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const backup = { id: Date.now(), name: `mizan_backup_${date}.json`, date: date, size: blob.size, auto: false };
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

    if (window.backups.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><span>لا توجد نسخ</span></div>`;
        return;
    }

    const canDeleteBackups = canDelete();

    let html = '';
    window.backups.slice().reverse().forEach(b => {
        html += `
            <div class="backup-item">
                <div class="info">
                    <div class="name">${b.name} ${b.auto ? '🤖 تلقائي' : ''}</div>
                    <div class="date">${b.date}</div>
                </div>
                <div class="size">${(b.size / 1024).toFixed(1)} KB</div>
                <div class="actions">
                    ${canDeleteBackups ? `<button class="btn btn-danger btn-sm" onclick="deleteBackup(${b.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
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
            restoreBackupData(data);
            showToast('📥 تم الاستعادة', 'success');
        } catch {
            showToast('❌ ملف غير صالح', 'error');
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
    const backup = {
        id: Date.now(),
        name: `auto_${new Date().toISOString().split('T')[0]}`,
        date: new Date().toISOString().split('T')[0],
        size: blob.size,
        auto: true
    };
    window.backups = window.backups.filter(b => !b.auto);
    window.backups.push(backup);
    if (window.backups.length > 15) {
        const sorted = window.backups.sort((a, b) => b.id - a.id);
        window.backups = sorted.slice(0, 15);
    }
    setData('backups', window.backups);
    renderBackups();
}