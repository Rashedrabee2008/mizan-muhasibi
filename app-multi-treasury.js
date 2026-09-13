// ============================================================
// الميزان 14.0.0 - نظام الخزائن المتعددة
// app-multi-treasury.js
// ============================================================
// 
// المميزات:
// - خزائن متعددة (نقدي، محافظ، بنك، بريد)
// - ربط الخزنة بكل عملية
// - التحويل بين الخزائن
// - تقارير مستقلة
// ============================================================

console.log('💰 تحميل app-multi-treasury.js - نظام الخزائن المتعددة');

// ═══════════════════════════════════════════════════════════
// 💰 1. الخزائن الافتراضية
// ═══════════════════════════════════════════════════════════

window.DEFAULT_CASH_BOXES = [
    { id: 1, name: 'نقدي', type: 'cash', icon: '💵', isDefault: true, active: true, openingBalance: 0 },
    { id: 2, name: 'فودافون كاش', type: 'wallet', icon: '📱', isDefault: false, active: true, openingBalance: 0 },
    { id: 3, name: 'اتصالات كاش', type: 'wallet', icon: '📱', isDefault: false, active: true, openingBalance: 0 },
    { id: 4, name: 'أورنج كاش', type: 'wallet', icon: '📱', isDefault: false, active: true, openingBalance: 0 },
    { id: 5, name: 'انستاباي', type: 'wallet', icon: '💳', isDefault: false, active: true, openingBalance: 0 },
    { id: 6, name: 'بنك', type: 'bank', icon: '🏦', isDefault: false, active: true, openingBalance: 0 },
    { id: 7, name: 'البريد', type: 'post', icon: '📮', isDefault: false, active: true, openingBalance: 0 }
];

// ═══════════════════════════════════════════════════════════
// 💰 2. المتغيرات
// ═══════════════════════════════════════════════════════════

window.cashBoxes = [];
window.cashBoxTransfers = [];

// ═══════════════════════════════════════════════════════════
// 💰 3. التحميل والحفظ
// ═══════════════════════════════════════════════════════════

window.loadCashBoxes = function() {
    try {
        const stored = localStorage.getItem('mizan_cashBoxes');
        if (stored) {
            cashBoxes = JSON.parse(stored);
            if (!Array.isArray(cashBoxes) || cashBoxes.length === 0) {
                cashBoxes = JSON.parse(JSON.stringify(DEFAULT_CASH_BOXES));
            }
        } else {
            cashBoxes = JSON.parse(JSON.stringify(DEFAULT_CASH_BOXES));
        }
        
        const storedTransfers = localStorage.getItem('mizan_cashBoxTransfers');
        if (storedTransfers) {
            cashBoxTransfers = JSON.parse(storedTransfers);
        }
        
        saveCashBoxes();
        console.log('✅ تم تحميل ' + cashBoxes.length + ' خزنة');
        return true;
    } catch (e) {
        console.error('❌ خطأ تحميل الخزائن:', e);
        cashBoxes = JSON.parse(JSON.stringify(DEFAULT_CASH_BOXES));
        return false;
    }
};

window.saveCashBoxes = function() {
    try {
        localStorage.setItem('mizan_cashBoxes', JSON.stringify(cashBoxes));
        localStorage.setItem('mizan_cashBoxTransfers', JSON.stringify(cashBoxTransfers));
    } catch (e) {
        console.error('❌ خطأ حفظ الخزائن:', e);
    }
};

// ═══════════════════════════════════════════════════════════
// 💰 4. الدوال المساعدة
// ═══════════════════════════════════════════════════════════

window.getCashBoxById = function(id) {
    return cashBoxes.find(b => b.id == id);
};

window.getDefaultCashBox = function() {
    return cashBoxes.find(b => b.isDefault) || cashBoxes[0];
};

window.getCashBoxBalance = function(boxId) {
    try {
        let balance = 0;
        
        // رصيد افتتاحي
        const box = getCashBoxById(boxId);
        if (box && box.openingBalance) {
            balance += parseFloat(box.openingBalance) || 0;
        }
        
        // الحركات
        if (typeof treasury !== 'undefined' && Array.isArray(treasury)) {
            treasury.forEach(function(t) {
                const tBoxId = t.cashBoxId || (getDefaultCashBox()?.id) || 1;
                if (tBoxId == boxId) {
                    if (t.type === 'deposit') {
                        balance += (parseFloat(t.amount) || 0);
                    } else if (t.type === 'withdraw') {
                        balance -= (parseFloat(t.amount) || 0);
                    }
                }
            });
        }
        
        return balance;
    } catch (e) {
        console.warn('⚠️ خطأ حساب رصيد:', e.message);
        return 0;
    }
};

window.getTotalCashBalance = function() {
    let total = 0;
    cashBoxes.forEach(function(box) {
        total += getCashBoxBalance(box.id);
    });
    return total;
};

window.getBoxTypeName = function(type) {
    const types = {
        'cash': '💵 نقدي',
        'wallet': '📱 محفظة إلكترونية',
        'bank': '🏦 حساب بنكي',
        'post': '📮 حساب بريد',
        'other': '📋 أخرى'
    };
    return types[type] || type;
};

// ═══════════════════════════════════════════════════════════
// 💰 5. إدارة الخزائن (CRUD)
// ═══════════════════════════════════════════════════════════

window.saveCashBox = function() {
    try {
        if (typeof canAdd === 'function' && !canAdd()) {
            if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
            return;
        }
        
        const id = document.getElementById('cashBoxId')?.value;
        const name = document.getElementById('cashBoxName')?.value.trim();
        const type = document.getElementById('cashBoxType')?.value || 'cash';
        const icon = document.getElementById('cashBoxIcon')?.value || '💵';
        const details = document.getElementById('cashBoxDetails')?.value.trim() || '';
        const openingBalance = parseFloat(document.getElementById('cashBoxOpeningBalance')?.value) || 0;
        const isDefault = document.getElementById('cashBoxIsDefault')?.checked || false;
        
        if (!name) {
            if (typeof showToast === 'function') showToast('⚠️ أدخل اسم الخزنة', 'error');
            return;
        }
        
        if (id) {
            const idx = cashBoxes.findIndex(b => b.id == id);
            if (idx > -1) {
                if (isDefault) {
                    cashBoxes.forEach(b => b.isDefault = false);
                }
                cashBoxes[idx] = {
                    ...cashBoxes[idx],
                    name: name,
                    type: type,
                    icon: icon,
                    details: details,
                    openingBalance: openingBalance,
                    isDefault: isDefault || cashBoxes[idx].isDefault
                };
                
                if (typeof addAuditLog === 'function') {
                    addAuditLog('edit', 'treasury', 'تعديل خزنة: ' + name);
                }
                if (typeof showToast === 'function') showToast('✅ تم تعديل الخزنة', 'success');
            }
        } else {
            if (cashBoxes.find(b => b.name === name)) {
                if (typeof showToast === 'function') showToast('⚠️ اسم الخزنة موجود', 'warning');
                return;
            }
            
            if (isDefault) {
                cashBoxes.forEach(b => b.isDefault = false);
            }
            
            cashBoxes.push({
                id: Date.now(),
                name: name,
                type: type,
                icon: icon,
                details: details,
                openingBalance: openingBalance,
                isDefault: isDefault || cashBoxes.length === 0,
                active: true,
                createdAt: new Date().toISOString()
            });
            
            if (typeof addAuditLog === 'function') {
                addAuditLog('add', 'treasury', 'إضافة خزنة: ' + name);
            }
            if (typeof showToast === 'function') showToast('✅ تم إضافة الخزنة', 'success');
        }
        
        saveCashBoxes();
        resetCashBoxForm();
        renderCashBoxes();
        populateCashBoxDropdowns();
        
    } catch (e) {
        console.error('❌ خطأ:', e);
    }
};

window.editCashBox = function(id) {
    const box = getCashBoxById(id);
    if (!box) return;
    
    if (document.getElementById('cashBoxId')) document.getElementById('cashBoxId').value = box.id;
    if (document.getElementById('cashBoxName')) document.getElementById('cashBoxName').value = box.name;
    if (document.getElementById('cashBoxType')) document.getElementById('cashBoxType').value = box.type;
    if (document.getElementById('cashBoxIcon')) document.getElementById('cashBoxIcon').value = box.icon || '💵';
    if (document.getElementById('cashBoxDetails')) document.getElementById('cashBoxDetails').value = box.details || '';
    if (document.getElementById('cashBoxOpeningBalance')) document.getElementById('cashBoxOpeningBalance').value = box.openingBalance || 0;
    if (document.getElementById('cashBoxIsDefault')) document.getElementById('cashBoxIsDefault').checked = box.isDefault || false;
    
    if (document.getElementById('cashBoxFormTitle')) {
        document.getElementById('cashBoxFormTitle').textContent = '✏️ تعديل الخزنة';
    }
    if (document.getElementById('cashBoxSaveBtnText')) {
        document.getElementById('cashBoxSaveBtnText').textContent = 'حفظ التعديل';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteCashBox = function(id) {
    if (typeof canDelete === 'function' && !canDelete()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    
    const box = getCashBoxById(id);
    if (!box) return;
    
    if (box.isDefault) {
        if (typeof showToast === 'function') showToast('⚠️ لا يمكن حذف الخزنة الافتراضية', 'error');
        return;
    }
    
    const balance = getCashBoxBalance(id);
    if (balance !== 0) {
        if (!confirm('⚠️ الخزنة "' + box.name + '" فيها رصيد ' + balance.toFixed(2) + ' ج.م\n\nمتابعة الحذف؟')) return;
    } else {
        if (!confirm('⚠️ حذف الخزنة "' + box.name + '"؟')) return;
    }
    
    cashBoxes = cashBoxes.filter(b => b.id != id);
    saveCashBoxes();
    
    if (typeof addAuditLog === 'function') {
        addAuditLog('delete', 'treasury', 'حذف خزنة: ' + box.name);
    }
    
    renderCashBoxes();
    populateCashBoxDropdowns();
    if (typeof showToast === 'function') showToast('🗑️ تم حذف الخزنة', 'info');
};

window.setDefaultCashBox = function(id) {
    cashBoxes.forEach(b => b.isDefault = false);
    const box = getCashBoxById(id);
    if (box) {
        box.isDefault = true;
        saveCashBoxes();
        renderCashBoxes();
        populateCashBoxDropdowns();
        if (typeof showToast === 'function') showToast('⭐ تم تعيين الخزنة الافتراضية', 'success');
    }
};

window.resetCashBoxForm = function() {
    if (document.getElementById('cashBoxId')) document.getElementById('cashBoxId').value = '';
    if (document.getElementById('cashBoxName')) document.getElementById('cashBoxName').value = '';
    if (document.getElementById('cashBoxType')) document.getElementById('cashBoxType').value = 'cash';
    if (document.getElementById('cashBoxIcon')) document.getElementById('cashBoxIcon').value = '💵';
    if (document.getElementById('cashBoxDetails')) document.getElementById('cashBoxDetails').value = '';
    if (document.getElementById('cashBoxOpeningBalance')) document.getElementById('cashBoxOpeningBalance').value = '0';
    if (document.getElementById('cashBoxIsDefault')) document.getElementById('cashBoxIsDefault').checked = false;
    
    if (document.getElementById('cashBoxFormTitle')) {
        document.getElementById('cashBoxFormTitle').textContent = '➕ إضافة خزنة جديدة';
    }
    if (document.getElementById('cashBoxSaveBtnText')) {
        document.getElementById('cashBoxSaveBtnText').textContent = 'إضافة';
    }
};

// ═══════════════════════════════════════════════════════════
// 💰 6. عرض الخزائن
// ═══════════════════════════════════════════════════════════

window.renderCashBoxes = function() {
    try {
        const c = document.getElementById('cashBoxList');
        if (!c) return;
        
        if (cashBoxes.length === 0) {
            c.innerHTML = '<div class="empty-state"><i class="fas fa-vault"></i><span>لا توجد خزائن</span></div>';
            return;
        }
        
        const total = getTotalCashBalance();
        
        let html = '<div class="cash-boxes-summary">' +
            '<div class="summary-item">' +
            '<div class="summary-label">عدد الخزائن</div>' +
            '<div class="summary-value">' + cashBoxes.length + '</div>' +
            '</div>' +
            '<div class="summary-item">' +
            '<div class="summary-label">إجمالي الرصيد</div>' +
            '<div class="summary-value">' + formatMoney(total) + ' ج.م</div>' +
            '</div>' +
            '</div>';
        
        html += '<div class="cash-boxes-grid">';
        cashBoxes.forEach(function(box) {
            const balance = getCashBoxBalance(box.id);
            
            html += '<div class="cash-box-card ' + (box.isDefault ? 'default' : '') + '">' +
                '<div class="cash-box-header">' +
                '<div class="cash-box-icon">' + (box.icon || '💵') + '</div>' +
                '<div class="cash-box-info">' +
                '<div class="cash-box-name">' + box.name + (box.isDefault ? ' ⭐' : '') + '</div>' +
                '<div class="cash-box-type">' + getBoxTypeName(box.type) + '</div>' +
                (box.details ? '<div class="cash-box-details">' + box.details + '</div>' : '') +
                '</div>' +
                '</div>' +
                '<div class="cash-box-balance">' +
                '<div class="balance-label">الرصيد الحالي</div>' +
                '<div class="balance-value">' + formatMoney(balance) + ' ج.م</div>' +
                '</div>' +
                '<div class="cash-box-actions">' +
                (!box.isDefault ? '<button class="btn-icon-sm" onclick="setDefaultCashBox(' + box.id + ')" title="افتراضي">⭐</button>' : '') +
                '<button class="btn-icon-sm" onclick="editCashBox(' + box.id + ')" title="تعديل">✏️</button>' +
                '<button class="btn-icon-sm danger" onclick="deleteCashBox(' + box.id + ')" title="حذف">🗑️</button>' +
                '</div>' +
                '</div>';
        });
        html += '</div>';
        
        c.innerHTML = html;
    } catch (e) {
        console.warn('⚠️ خطأ عرض الخزائن:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 💰 7. تعبئة القوائم المنسدلة
// ═══════════════════════════════════════════════════════════

window.populateCashBoxDropdowns = function() {
    try {
        const activeBoxes = cashBoxes.filter(b => b.active !== false);
        
        const ids = [
            'saleCashBox',
            'purCashBox',
            'retCashBox',
            'collectCashBox',
            'payCashBox',
            'expenseCashBox',
            'manualCashBox',
            'transferFrom',
            'transferTo'
        ];
        
        ids.forEach(function(id) {
            const sel = document.getElementById(id);
            if (!sel) return;
            
            const cv = sel.value;
            const defaultBox = getDefaultCashBox();
            
            let html = '<option value="">اختر الخزنة...</option>';
            activeBoxes.forEach(function(box) {
                const selected = (!cv && defaultBox && box.id === defaultBox.id) || (cv == box.id);
                html += '<option value="' + box.id + '"' + (selected ? ' selected' : '') + '>' +
                    (box.icon || '') + ' ' + box.name + (box.isDefault ? ' ⭐' : '') +
                    '</option>';
            });
            sel.innerHTML = html;
            if (cv) sel.value = cv;
        });
    } catch (e) {
        console.warn('⚠️ خطأ تعبئة القوائم:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 💰 8. التحويل بين الخزائن
// ═══════════════════════════════════════════════════════════

window.saveCashBoxTransfer = function() {
    try {
        if (typeof canAdd === 'function' && !canAdd()) {
            if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
            return;
        }
        
        const fromId = document.getElementById('transferFrom')?.value;
        const toId = document.getElementById('transferTo')?.value;
        const amount = parseFloat(document.getElementById('transferAmount')?.value) || 0;
        const date = document.getElementById('transferDate')?.value || new Date().toISOString().split('T')[0];
        const notes = document.getElementById('transferNotes')?.value.trim() || '';
        
        if (!fromId) {
            if (typeof showToast === 'function') showToast('⚠️ اختر الخزنة المصدر', 'error');
            return;
        }
        if (!toId) {
            if (typeof showToast === 'function') showToast('⚠️ اختر الخزنة المستقبلة', 'error');
            return;
        }
        if (fromId === toId) {
            if (typeof showToast === 'function') showToast('⚠️ لا يمكن التحويل لنفس الخزنة', 'error');
            return;
        }
        if (amount <= 0) {
            if (typeof showToast === 'function') showToast('⚠️ أدخل مبلغ صحيح', 'error');
            return;
        }
        
        const fromBox = getCashBoxById(fromId);
        const toBox = getCashBoxById(toId);
        if (!fromBox || !toBox) return;
        
        const fromBalance = getCashBoxBalance(fromId);
        if (fromBalance < amount) {
            if (typeof showToast === 'function') {
                showToast('⚠️ الرصيد غير كافي في ' + fromBox.name + ' (متاح: ' + formatMoney(fromBalance) + ')', 'error');
            }
            return;
        }
        
        const now = new Date();
        const time = now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
        const transferId = Date.now();
        
        // سحب من الخزنة المصدر
        if (typeof treasury !== 'undefined' && Array.isArray(treasury)) {
            treasury.push({
                id: Date.now(),
                type: 'withdraw',
                amount: amount,
                note: '🔄 تحويل إلى ' + toBox.name + (notes ? ' - ' + notes : ''),
                cashBoxId: fromId,
                cashBoxName: fromBox.name,
                refType: 'transfer',
                refId: transferId,
                date: date,
                time: time
            });
            
            // إيداع في الخزنة المستقبلة
            treasury.push({
                id: Date.now() + 1,
                type: 'deposit',
                amount: amount,
                note: '🔄 تحويل من ' + fromBox.name + (notes ? ' - ' + notes : ''),
                cashBoxId: toId,
                cashBoxName: toBox.name,
                refType: 'transfer',
                refId: transferId,
                date: date,
                time: time
            });
            
            if (typeof setData === 'function') {
                setData('treasury', treasury);
            }
        }
        
        cashBoxTransfers.unshift({
            id: transferId,
            number: cashBoxTransfers.length + 1,
            fromId: fromId,
            fromName: fromBox.name,
            toId: toId,
            toName: toBox.name,
            amount: amount,
            date: date,
            time: time,
            notes: notes,
            createdAt: now.toISOString(),
            createdBy: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'unknown'
        });
        saveCashBoxes();
        
        if (typeof addAuditLog === 'function') {
            addAuditLog('add', 'treasury', 'تحويل ' + formatMoney(amount) + ' ج.م من ' + fromBox.name + ' إلى ' + toBox.name);
        }
        
        if (document.getElementById('transferAmount')) document.getElementById('transferAmount').value = '';
        if (document.getElementById('transferNotes')) document.getElementById('transferNotes').value = '';
        
        renderCashBoxes();
        renderCashBoxTransfers();
        if (typeof renderTreasury === 'function') renderTreasury();
        if (typeof updateDashboard === 'function') updateDashboard();
        
        if (typeof showToast === 'function') {
            showToast('✅ تم التحويل: ' + formatMoney(amount) + ' ج.م', 'success');
        }
        
    } catch (e) {
        console.error('❌ خطأ في التحويل:', e);
        if (typeof showToast === 'function') showToast('❌ فشل التحويل', 'error');
    }
};

window.renderCashBoxTransfers = function() {
    try {
        const c = document.getElementById('cashBoxTransfersList');
        if (!c) return;
        
        if (cashBoxTransfers.length === 0) {
            c.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i><span>لا توجد تحويلات</span></div>';
            return;
        }
        
        let html = '<div class="table-header" style="grid-template-columns: 0.4fr 1fr 1.2fr 1fr 1.2fr;"><span>#</span><span>من</span><span>إلى</span><span>المبلغ</span><span>التاريخ</span></div>';
        
        cashBoxTransfers.slice(0, 30).forEach(function(t) {
            html += '<div class="table-row" style="grid-template-columns: 0.4fr 1fr 1.2fr 1fr 1.2fr;font-size:11px;">' +
                '<span>#' + t.number + '</span>' +
                '<span style="color:#E06060;">' + t.fromName + '</span>' +
                '<span style="color:#2D8F5E;">' + t.toName + '</span>' +
                '<span style="color:#C9A94E;font-weight:700;">' + formatMoney(t.amount) + '</span>' +
                '<span style="font-size:10px;color:#A89070;">' + t.date + '<br>' + (t.time || '') + '</span>' +
                '</div>';
        });
        
        c.innerHTML = html;
    } catch (e) {
        console.warn('⚠️ خطأ عرض التحويلات:', e.message);
    }
};

// ═══════════════════════════════════════════════════════════
// 💰 9. الحصول على الخزنة المختارة
// ═══════════════════════════════════════════════════════════

window.getSaleCashBox = function() {
    const el = document.getElementById('saleCashBox');
    if (el && el.value) return el.value;
    return getDefaultCashBox()?.id || 1;
};

window.getPurCashBox = function() {
    const el = document.getElementById('purCashBox');
    if (el && el.value) return el.value;
    return getDefaultCashBox()?.id || 1;
};

window.getRetCashBox = function() {
    const el = document.getElementById('retCashBox');
    if (el && el.value) return el.value;
    return getDefaultCashBox()?.id || 1;
};

window.getCollectCashBox = function() {
    const el = document.getElementById('collectCashBox');
    if (el && el.value) return el.value;
    return getDefaultCashBox()?.id || 1;
};

window.getPayCashBox = function() {
    const el = document.getElementById('payCashBox');
    if (el && el.value) return el.value;
    return getDefaultCashBox()?.id || 1;
};

window.getExpenseCashBox = function() {
    const el = document.getElementById('expenseCashBox');
    if (el && el.value) return el.value;
    return getDefaultCashBox()?.id || 1;
};

window.getManualCashBox = function() {
    const el = document.getElementById('manualCashBox');
    if (el && el.value) return el.value;
    return getDefaultCashBox()?.id || 1;
};

// ═══════════════════════════════════════════════════════════
// 💰 10. التهيئة
// ═══════════════════════════════════════════════════════════

window.initMultiTreasury = function() {
    console.log('💰 تهيئة نظام الخزائن المتعددة...');
    loadCashBoxes();
    populateCashBoxDropdowns();
    console.log('✅ تم تهيئة ' + cashBoxes.length + ' خزنة');
};

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof cashBoxes !== 'undefined') {
            initMultiTreasury();
        }
    }, 1500);
});

// إعادة التعبئة عند التنقل
(function() {
    let _navOriginal = window.navigateTo;
    window.navigateTo = function(page) {
        if (_navOriginal) _navOriginal.apply(this, arguments);
        setTimeout(function() {
            populateCashBoxDropdowns();
            if (page === 'cash-boxes') {
                renderCashBoxes();
                renderCashBoxTransfers();
            }
        }, 300);
    };
})();

console.log('✅ تم تحميل app-multi-treasury.js بنجاح');
console.log('💰 عدد الخزائن: ' + (cashBoxes ? cashBoxes.length : 0));
